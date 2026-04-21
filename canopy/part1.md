00 — Key Concepts
This section gives you the mental model you need before writing any code. It won't make you an expert in blockchain theory, but it will make the rest of these docs make sense.

What Is an Appchain, and Why Build One?
Most blockchains are shared environments. When you deploy a smart contract on Ethereum or Solana, you share block space, fee markets, and execution throughput with every other application on that network. Traffic spikes from other apps become your problem. You can't customize economic rules, consensus timing, or governance without waiting for a network-wide vote.
An appchain (application-specific blockchain) is a blockchain you own entirely. Your application is the only thing running on it. You control the native token, fee structure, block time, validator requirements, and upgrade path. Nobody else's transactions compete with yours.
This is a good fit when:
You need predictable transaction fees or high throughput for a specific workload
You want to issue and control your own native token
Your application logic requires custom transaction types that don't fit a general smart contract model
You want sovereignty over upgrades and governance
The tradeoff historically has been complexity: bootstrapping your own validator set, securing a new chain from scratch, and writing all the infrastructure yourself. Canopy solves this.

What Canopy Does
Canopy is an appchain infrastructure platform written in Go. It gives you:
A complete blockchain runtime (consensus, P2P networking, state storage, RPC)
A Security Root chain whose validators can opt in to secure your chain from day zero — no bootstrapping required
A plugin system that lets you define your chain's application logic in any language, without touching the core blockchain code
The phrase you'll see in the docs is "progressive sovereignty." Your chain starts under the umbrella of the Security Root. As it matures and grows its own validator community, it can declare independence and operate fully on its own — or rejoin the root at any time.
You don't need to understand all of this to start building. What matters for day one: Canopy handles the hard blockchain infrastructure, and you write a plugin that defines what your chain actually does.
Network status: Canopy is currently in Betanet. The core protocol and plugin interface are stable enough to build on, but APIs and configuration options may change before mainnet. Check the GitHub repo for the latest.

How Canopy Templates Abstract Blockchain Complexity
Each Canopy plugin template (found under plugin/ in the repo, with one subdirectory per supported language) implements a small, well-defined interface. You don't write consensus code, networking code, or storage code. You implement a handful of functions that Canopy calls at specific points in the block lifecycle:
Function
When it runs
What you do
Genesis()
Chain launch
Import initial state from a JSON file
BeginBlock()
Start of every block
Optional per-block setup logic
CheckTx()
When a tx enters the mempool
Validate the transaction stateless-ly
DeliverTx()
When a tx is included in a block
Apply the transaction to state
EndBlock()
End of every block
Optional per-block finalization logic

Your plugin runs as a separate process and communicates with the Canopy node over a Unix socket using Protocol Buffers. You can think of the Canopy node as the blockchain engine and your plugin as the application logic layer sitting on top of it.
The repo ships with official plugin templates for Go, TypeScript, Python, Kotlin, and C#, each in its own subdirectory under plugin/. These docs use the Go template throughout, but the concepts and lifecycle interface are identical across all of them — if you prefer TypeScript or Python, you can follow the same steps and substitute the language-specific template. Beyond the bundled templates, any language that can speak Protocol Buffers over a Unix socket can be used to build a plugin; Go, TypeScript, Python, Kotlin, and C# are simply the officially maintained starting points.

The Plugin System
The plugin is not a smart contract. It's a standalone program that implements your chain's application logic. Here's what that means in practice:
You write a normal program in Go, TypeScript, Python, Kotlin, C#, or any other protobuf-compatible language
You call contract.StartPlugin() and implement the lifecycle functions
Each validator running your chain runs the plugin alongside the Canopy node process — the two communicate over a local Unix socket using Protocol Buffers
Your plugin reads and writes state through the socket interface that Canopy provides; you don't talk to a database directly
The plugin runs on every validator node, not on any central server. When your chain has five validators, each of those five nodes runs its own copy of your plugin binary. The Canopy FSM on each node routes transactions to the local plugin, gets back validation results and state changes, and applies them to the local chain state. Consensus among validators happens at the Canopy layer, not inside your plugin — your plugin just needs to be deterministic (same input always produces same output).
This design means you get:
Full control over your transaction types and state model
No blockchain-specific language to learn (no Solidity, no Rust)
Easy local iteration: build, run, and test like any backend service
AI-friendliness: the plugin is just a regular service with clear, well-defined interfaces
The tradeoff is that your plugin runs in a trusted context — it doesn't have the permissionless deployment model of a smart contract. This is appropriate for appchains, where you control the validator set and the application logic is part of the chain's specification.

Key Terms
Appchain / Nested Chain: An application-specific blockchain built with Canopy. Called "Nested Chain" in the docs because it lives under the Security Root in the trust hierarchy.
Security Root: The Canopy root chain. Its validators provide BFT consensus to Nested Chains without needing additional stake. Think of it as the security layer your chain rents until it's self-sufficient.
Committee: A subset of Security Root validators assigned to run consensus for a specific Nested Chain. Your chain gets its own committee; their job is to agree on blocks.
Plugin: The process you write that implements your chain's business logic. It handles transaction validation and state transitions, and communicates with the Canopy node over a socket.
FSM (Finite State Machine): The component inside Canopy that tracks chain state and calls into your plugin at each stage of block processing. When you implement CheckTx and DeliverTx, you're implementing the state machine for your application.
Transaction: A signed message submitted by a user that causes a state change. Your plugin defines what transaction types exist and what they do.
CheckTx: Stateless transaction validation — run before a transaction enters the mempool. Does not read or write state. Use it to reject obviously malformed or unauthorized transactions fast.
DeliverTx: Stateful transaction execution — run when a transaction is included in a block. Can read and write state. This is where actual state changes happen.
State: Your chain's persistent data store. It's a key-value store accessible through the plugin interface via batched read and write operations.
RPC: The HTTP interface Canopy exposes for submitting transactions and querying chain state. Your frontend or CLI tools talk to this.
NestBFT: Canopy's consensus algorithm. It combines Proof-of-Stake with a Proof-of-Age mechanism (Verifiable Delay Functions) to prevent long-range attacks. You don't need to implement or configure it — it runs automatically.
Protocol Buffers (protobuf): The message format used between your plugin and the Canopy node. You define your transaction message types in .proto files, generate Go code from them, and use those types in your plugin.
BLS12-381: The signature scheme Canopy uses. When building transaction submission tools, you sign over the protobuf-encoded transaction bytes using BLS12-381, not Ed25519 or secp256k1.

Architecture Overview
Here is how the major components relate at runtime:
┌─────────────────────────────────────────────────────────┐
│                   CANOPY NODE PROCESS                    │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐   │
│  │   P2P    │   │Consensus │   │   Persistence     │   │
│  │Networking│   │(NestBFT) │   │  (State + Index)  │   │
│  └──────────┘   └──────────┘   └──────────────────┘   │
│                       │                                 │
│              ┌────────────────┐                         │
│              │  FSM / Controller │                      │
│              │  (block lifecycle)│                      │
│              └────────┬───────┘                         │
│                       │  Unix socket (protobuf)         │
└───────────────────────┼─────────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │       YOUR PLUGIN          │
          │                            │
          │  Genesis()                 │
          │  BeginBlock()              │
          │  CheckTx()   ← validate    │
          │  DeliverTx() ← execute     │
          │  EndBlock()                │
          │                            │
          │  (state reads/writes       │
          │   flow back through        │
          │   the socket)              │
          └────────────────────────────┘

                        ▲
                        │  HTTP RPC (port 50002/50003)
                        │
          ┌─────────────┴──────────────┐
          │  Clients: CLI / Frontend   │
          │  - Submit transactions     │
          │  - Query state             │
          │  - Check node status       │
          └────────────────────────────┘
And zooming out to the multi-chain picture:
┌─────────────────────────────────────────────┐
│            SECURITY ROOT CHAIN              │
│  (validators, staking, governance)          │
│                                             │
│   Committee A ──► Nested Chain 1 (yours)   │
│   Committee B ──► Nested Chain 2            │
│   Committee C ──► Nested Chain 3            │
└─────────────────────────────────────────────┘

Each Nested Chain:
  - Has its own block history and state
  - Has its own native token and economics
  - Runs your plugin for application logic
  - Can declare independence when ready

What You're Actually Building
When you follow these docs, you will:
Run a local single-node Canopy chain (your development environment)
Write a plugin that defines custom transaction types (these docs use Go; the same steps apply if you use TypeScript, Python, Kotlin, or C#)
Submit transactions via RPC and watch them change state
Optionally build a frontend that talks to your chain
The chain you build is a complete, production-ready appchain. The local setup is the same codebase you would deploy to a live network — you're just running it on one machine with one validator.

A Note on AI-Assisted Development
The plugin template includes an AGENTS.md file specifically written as context for AI coding assistants. The plugin interface is intentionally designed to be small and well-structured, which makes AI co-development effective.
Throughout these docs, you'll find suggestions for concrete prompts you can use with Claude or another coding assistant to generate transaction types, validation logic, and frontend integrations. The vibe coding walkthrough at ezeike.github.io/canopy-app-guide/walkthrough.html shows a full example of building a guestbook app this way, from spec generation to working frontend.

Next: 01 — Prerequisites


