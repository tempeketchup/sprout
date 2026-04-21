03 — Build a Basic App
This section walks through extending the default plugin template to support a custom transaction type. By the end you will have a working on-chain guestbook: users post messages that are permanently stored with their author address and the block they were included in.
This example is deliberately simple — one transaction type, one state object, no frontend. The goal is to understand the plugin interface clearly so you can build anything on top of it.
AI-assisted development: The plugin template is designed to work well with coding assistants. The repo includes AGENTS.md specifically written as context for AI tools. Before starting, try feeding it to your assistant of choice. The vibe coding walkthrough shows a complete AI-assisted build of this same guestbook pattern, including spec generation and a React frontend. If you want to move faster, start there and come back here for the conceptual explanation.

What You're Building
You're adding a new transaction type to your chain: post_message. Any address can submit a message of up to 280 characters, and your plugin will validate it, store it, and make it queryable from state. This is the same fundamental pattern you'll use for any custom on-chain action, whether that's posting a message, casting a vote, minting a token, or anything else your application needs. Master this and you can build virtually anything.
Each posted message is stored permanently on-chain with:
The author's address
The message content
The block height it was included in
An auto-incrementing ID
This requires exactly four things in your plugin:
A protobuf message type defining the transaction payload
Registration of the new type with the plugin config
A CheckTx handler that validates the message
A DeliverTx handler that writes the message to state

Plugin Directory Structure
All your work happens inside plugin/go/. Here's what's there and what each file does:
plugin/go/
├── main.go                  # Entry point — calls contract.StartPlugin(), don't modify
├── chain.json               # Chain metadata (name, symbol, economics)
├── Makefile                 # Build targets
├── pluginctl.sh             # Plugin lifecycle script (called by canopy start)
│
├── contract/
│   ├── plugin.go            # Socket protocol, StartPlugin(), StateRead/StateWrite — don't modify
│   ├── contract.go          # Your application logic lives here
│   └── error.go             # Plugin error codes and types
│
└── proto/
    ├── tx.proto             # Define your transaction message types here
    ├── account.proto        # Account and Pool message definitions
    ├── plugin.proto         # FSM communication protocol — don't modify
    └── _generate.sh         # Regenerates Go structs from .proto files
The files you'll modify are contract/contract.go and proto/tx.proto. Everything else is infrastructure you use but don't touch.

Step 1: Define the Message Type
Open proto/tx.proto and add your new message type alongside the existing MessageSend:
message MessagePost {
  bytes author_address = 1;  // must be exactly 20 bytes
  string content       = 2;  // max 280 characters
}
You'll also want a state object to represent a stored post:
message Post {
  uint64 id             = 1;
  bytes  author_address = 2;
  string content        = 3;
  uint64 block_height   = 4;
}

message PostCounter {
  uint64 count = 1;
}
Post holds the actual message data. PostCounter is a single record that tracks the next ID — a common pattern for auto-incrementing keys in a key-value store.
After editing the proto file, regenerate the Go code:
cd plugin/go/proto
./_generate.sh
This produces updated Go structs in contract/tx.pb.go. You'll import these types in contract.go.
AI prompt: "I added MessagePost, Post, and PostCounter to tx.proto in a Canopy Go plugin. Generate the full contract.go additions needed to register this transaction type, validate it in CheckTx, and write it to state in DeliverTx. Author address must be 20 bytes. Content must be non-empty and at most 280 characters. Posts should be keyed by auto-incrementing ID using a PostCounter state object."

Step 2: Register the Transaction Type
Open contract/contract.go. Find the ContractConfig variable at the top and add your new transaction type to both arrays:
var ContractConfig = &PluginConfig{
    Name:    "go_plugin_contract",
    Id:      1,
    Version: 1,
    SupportedTransactions: []string{
        "send",
        "post_message",   // add this
    },
    TransactionTypeUrls: []string{
        "type.googleapis.com/types.MessageSend",
        "type.googleapis.com/types.MessagePost",  // add this
    },
}
The order of SupportedTransactions must exactly match the order of TransactionTypeUrls. If they don't align, transactions will be misrouted.

Step 3: Implement CheckTx
CheckTx is stateless validation. It runs when a transaction enters the mempool, before any state is read or written. Its job is to reject bad transactions fast.
Find the CheckTx method in contract.go. It has a switch statement that dispatches by message type. Add a case for your new type:
func (c *Contract) CheckTx(request *PluginCheckRequest) *PluginCheckResponse {
    // ... existing fee validation ...

    msg, err := FromAny(request.Tx.Msg)
    if err != nil {
        return &PluginCheckResponse{Error: err}
    }

    switch x := msg.(type) {
    case *MessageSend:
        return c.CheckMessageSend(x)
    case *MessagePost:               // add this case
        return c.CheckMessagePost(x)
    default:
        return &PluginCheckResponse{Error: ErrInvalidMessageCast()}
    }
}
Then implement the handler function:
func (c *Contract) CheckMessagePost(msg *MessagePost) *PluginCheckResponse {
    // Validate author address
    if len(msg.AuthorAddress) != 20 {
        return &PluginCheckResponse{Error: ErrInvalidAddress()}
    }
    // Validate content
    if len(msg.Content) == 0 || len(msg.Content) > 280 {
        return &PluginCheckResponse{Error: ErrInvalidAmount()}
    }
    // Return the address that must sign this transaction
    return &PluginCheckResponse{
        AuthorizedSigners: [][]byte{msg.AuthorAddress},
    }
}
Two things to note here:
AuthorizedSigners tells Canopy whose signature to verify on this transaction. Return the address(es) that must have signed it.
CheckTx cannot read or write state. If you need something from state to validate (like checking a balance), that happens in DeliverTx.

Step 4: Define State Keys
Before writing the DeliverTx handler you need key functions for the two state objects your handler will read and write.
Add these alongside the existing key functions in contract.go:
// KeyForPost returns the state key for a specific post by ID.
func KeyForPost(id uint64) []byte {
    idBytes := make([]byte, 8)
    binary.BigEndian.PutUint64(idBytes, id)
    return JoinLenPrefix([]byte{0x03}, idBytes)
}

// KeyForPostCounter returns the state key for the post counter singleton.
func KeyForPostCounter() []byte {
    return JoinLenPrefix([]byte{0x04}, []byte("/pc/"))
}
Each state type gets a unique byte prefix (0x03, 0x04) to avoid key collisions with the existing account (0x01), fee pool (0x02), and fee params (0x07) keys. Pick any unused byte value — the only rule is that no two types share a prefix.

Step 5: Capture Block Height in BeginBlock
PluginDeliverRequest does not carry a block height field. If your DeliverTx needs the current height (in this example, to timestamp a post), capture it in BeginBlock and store it on the Contract struct.
First, add a currentHeight field to the Contract struct in contract.go:
type Contract struct {
    Config        Config
    FSMConfig     *PluginFSMConfig
    plugin        *Plugin
    fsmId         uint64
    currentHeight uint64  // add this
}
Then populate it in BeginBlock:
func (c *Contract) BeginBlock(request *PluginBeginRequest) *PluginBeginResponse {
    c.currentHeight = request.Height
    return &PluginBeginResponse{}
}

Step 6: Implement DeliverTx
DeliverTx runs when a transaction is included in a block. It can read and write state. This is where the actual work happens.
Add a case to the DeliverTx switch:
func (c *Contract) DeliverTx(request *PluginDeliverRequest) *PluginDeliverResponse {
    msg, err := FromAny(request.Tx.Msg)
    if err != nil {
        return &PluginDeliverResponse{Error: err}
    }

    switch x := msg.(type) {
    case *MessageSend:
        return c.DeliverMessageSend(x, request.Tx.Fee)
    case *MessagePost:                             // add this case
        return c.DeliverMessagePost(x, request.Tx.Fee)
    default:
        return &PluginDeliverResponse{Error: ErrInvalidMessageCast()}
    }
}
Then implement the handler. The pattern is: generate query IDs, batch-read current state, apply logic, batch-write new state.
func (c *Contract) DeliverMessagePost(msg *MessagePost, fee uint64) *PluginDeliverResponse {
    counterQId := rand.Uint64()

    // 1. Read the current post counter from state
    readResp, pluginErr := StateRead(c, &PluginStateReadRequest{
        Keys: []*PluginKeyRead{
            {QueryId: counterQId, Key: KeyForPostCounter()},
        },
    })
    if pluginErr != nil {
        return &PluginDeliverResponse{Error: pluginErr}
    }
    if readResp.Error != nil {
        return &PluginDeliverResponse{Error: readResp.Error}
    }

    // 2. Unmarshal the counter (defaults to zero if no entry exists yet)
    counter := &PostCounter{}
    for _, result := range readResp.Results {
        if result.QueryId == counterQId && len(result.Entries) > 0 {
            if err := proto.Unmarshal(result.Entries[0].Value, counter); err != nil {
                return &PluginDeliverResponse{Error: ErrUnmarshal(err)}
            }
        }
    }

    // 3. Create the new post, using the height captured in BeginBlock
    newPost := &Post{
        Id:            counter.Count + 1,
        AuthorAddress: msg.AuthorAddress,
        Content:       msg.Content,
        BlockHeight:   c.currentHeight,
    }

    // 4. Marshal the post and updated counter
    postBytes, err := proto.Marshal(newPost)
    if err != nil {
        return &PluginDeliverResponse{Error: ErrMarshal(err)}
    }
    counter.Count++
    counterBytes, err := proto.Marshal(counter)
    if err != nil {
        return &PluginDeliverResponse{Error: ErrMarshal(err)}
    }

    // 5. Write both back to state atomically
    writeResp, pluginErr := StateWrite(c, &PluginStateWriteRequest{
        Sets: []*PluginSetOp{
            {Key: KeyForPost(newPost.Id), Value: postBytes},
            {Key: KeyForPostCounter(), Value: counterBytes},
        },
    })
    if pluginErr != nil {
        return &PluginDeliverResponse{Error: pluginErr}
    }
    if writeResp.Error != nil {
        return &PluginDeliverResponse{Error: writeResp.Error}
    }
    return &PluginDeliverResponse{}
}
This is the complete pattern for any state-mutating transaction: read, compute, write. All reads and writes go through StateRead and StateWrite — you never talk to a database directly.

Step 7: Build and Run
cd plugin/go
make build
Then restart the node from the repo root:
canopy start

Step 8: Test Your Transaction
Submit a post_message transaction via the admin RPC. Since this is a custom transaction type, you'll need to build and sign it yourself rather than using a built-in CLI command. The tutorial test suite in plugin/go/tutorial/ shows the full signing flow — see Run, Test, and Configure for how to run those tests.
To verify your post was stored, query state by key directly through the RPC. After submitting a post_message transaction and waiting for block inclusion, use the state query endpoint with the key your plugin wrote:
# Query by the encoded key for post ID 1
curl http://localhost:50002/v1/query/state-key?key=<hex-encoded-key>
The returned bytes will be the protobuf-encoded Post message you can unmarshal and inspect. The tutorial test in plugin/go/tutorial/ demonstrates this pattern end-to-end: submit the transaction, wait for inclusion, then query the expected state key and assert the decoded fields match what was submitted.

What Each Component Does and Why
This is worth pausing on before moving forward.
ContractConfig is the handshake between your plugin and the Canopy FSM. When the plugin starts, it sends this config over the socket. Canopy uses SupportedTransactions to know which transaction types to route to you, and TransactionTypeUrls to deserialize the protobuf Any payload into the right concrete type. If either is wrong or misaligned, transactions silently fail to route.
CheckTx is your first line of defense against bad transactions. It runs every time a transaction hits the mempool, on every node. Keep it fast and stateless — its job is to reject obviously invalid transactions before they waste block space. Return AuthorizedSigners to tell Canopy which addresses must have signed the transaction; Canopy verifies the signature independently.
DeliverTx is the actual state machine. It runs exactly once per transaction, in order, when the block is applied. This is where real state changes happen. If DeliverTx returns an error, the transaction is marked failed but still included in the block (and the fee is still charged). Design your validation to catch everything recoverable in CheckTx.
State keys are how you namespace your data in the key-value store. The JoinLenPrefix pattern with a unique byte prefix is a simple way to ensure your post keys never collide with account keys or keys from future transaction types you add.
StateRead / StateWrite are the only way to interact with persistent storage. The batch pattern (sending multiple read or write operations in one call) is more efficient than one call per key, especially in DeliverTx where you often need to read and update several related records.

Key Interfaces Reference
The five methods you implement on Contract. Each returns a single response struct with the error embedded inside it:
// Called at genesis — import initial state from a JSON snapshot
func (c *Contract) Genesis(request *PluginGenesisRequest) *PluginGenesisResponse

// Called at the start of every block — store height, optional per-block setup
func (c *Contract) BeginBlock(request *PluginBeginRequest) *PluginBeginResponse

// Called when a tx enters the mempool — stateless validation only
// Set AuthorizedSigners to the addresses whose signatures Canopy must verify
func (c *Contract) CheckTx(request *PluginCheckRequest) *PluginCheckResponse

// Called when a tx is included in a block — read and write state here
func (c *Contract) DeliverTx(request *PluginDeliverRequest) *PluginDeliverResponse

// Called at the end of every block — emit events, run cleanup
func (c *Contract) EndBlock(request *PluginEndRequest) *PluginEndResponse
State helpers. These return two values — the response and a transport-level error:
// Batch read from the key-value store
StateRead(c *Contract, req *PluginStateReadRequest) (*PluginStateReadResponse, *PluginError)

// Batch write (set or delete) to the key-value store
StateWrite(c *Contract, req *PluginStateWriteRequest) (*PluginStateWriteResponse, *PluginError)
Note the distinction: lifecycle methods embed their error in the response (resp.Error). StateRead and StateWrite return the error as a second value AND may also have an error in resp.Error — check both, as the default template demonstrates.

Going Further with AI Assistance
Once you have the basic pattern down, coding assistants can significantly accelerate the iteration loop. Some prompts that work well:
Adding a new transaction type:
"Using the Canopy Go plugin pattern, add a tip_author transaction type to contract.go. It should transfer tokens from a tipper to a post author, looking up the author's address from state by post ID. Validate in CheckTx that the post exists... actually, we can't read state in CheckTx, so just validate the tipper address and amount. In DeliverTx, read the post by ID, read the tipper's account, transfer the amount, and write both back."
State schema design:
"I'm building a voting system on a Canopy plugin. I need to store: Proposals (id, title, yes_votes, no_votes, status), and Votes (voter_address, proposal_id, vote). Design the state keys using the JoinLenPrefix pattern, making sure keys for different types don't collide with the existing 0x01 (account), 0x02 (fee pool), and 0x07 (fee params) prefixes."
EndBlock events:
"In a Canopy Go plugin's EndBlock function, emit a WebSocket event containing the last 10 posts ordered by descending ID. Read them from state using a range read over the post key prefix."
The vibe coding walkthrough at ezeike.github.io/canopy-app-guide/walkthrough.html shows this workflow end-to-end, including generating an app spec with Claude before writing any code and building a React frontend that connects to the chain over WebSocket.

Other Language Templates
If you're building with TypeScript, Python, Kotlin, or C#, the concepts in this section are identical — same lifecycle, same state read/write pattern, same protobuf message definitions. The differences are purely in how each language's template wires up the socket communication. See the plugin/<language>/ directory for each template's equivalent of contract.go, and follow the same four-step pattern: define proto, register, implement CheckTx, implement DeliverTx.

Next: 04 — Run, Test, and Configure

