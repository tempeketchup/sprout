02 — Chain Quickstart
This tutorial gets a local single-node Canopy chain running, connects the default Go plugin, and walks you through your first transaction. Plan for about 15 minutes.
At the end you will have:
A running chain on your local machine
A funded account in the keystore
A confirmed send transaction on-chain

Step 1: Clone and Build
Clone the Canopy repository, check out the latest stable tag, and build the node binary.
git clone https://github.com/canopy-network/canopy.git
cd canopy
git checkout $(git describe --tags --abbrev=0)
make build/canopy
This compiles the canopy binary and installs it to ~/go/bin/canopy. Depending on your machine it takes 30–90 seconds. You should see output ending with something like:
go build -o ~/go/bin/canopy ./cmd/main/...
Verify the binary is reachable:
canopy version
Expected output:
v0.1.18+beta
If you get command not found, make sure ~/go/bin is on your PATH (see Prerequisites).

Step 2: Build the Go Plugin
The Go plugin template lives inside the same repo. Build it from the plugin/go directory.
cd plugin/go
make build
This produces a go-plugin binary in plugin/go/. Once canopy start is configured to use the Go plugin, it handles launching this binary automatically via pluginctl.sh.

Step 3: Generate the Default Config
Run the node once to generate the default configuration files, then stop it immediately.
canopy start
# Wait a few seconds for config to be written, then press Ctrl+C
On first run, the node will prompt you for two things before starting:
Enter password for your new private key (leave blank for no password):
Enter a nickname for this key (leave blank for "validator"):
For local development, press Enter twice to use no password and accept the default nickname "validator". This creates an encrypted keystore entry for your validator's signing key. If you set a password, you'll need it whenever you restart the node.
This creates ~/.canopy/ with the following files:
~/.canopy/
├── config.json       # Node configuration
├── genesis.json      # Initial chain state
├── private_key.json  # Validator signing key (auto-generated)
└── keystore/         # Encrypted key storage

Step 4: Configure the Plugin
Open ~/.canopy/config.json in your editor. Find the "plugin" field (it will be an empty string by default) and set it to "go":
{
  "plugin": "go",
  ...
}
Now start the node:
canopy start
When "plugin": "go" is set, canopy start automatically calls pluginctl.sh to launch and manage the plugin process — you don't need to start it separately. You can also invoke pluginctl.sh directly (it supports start, stop, restart, and status), but letting canopy start handle the lifecycle is the standard approach and avoids timing issues.
Watch the output for a line like this confirming the plugin connected:
plugin connected: go_plugin_contract (id=1, version=1)
If you see connection errors on startup, don't worry — this is normal. The plugin and node race to start, and they will connect within a few seconds.
To monitor plugin logs separately:
tail -f /tmp/plugin/go-plugin.log
Leave the node running and open a new terminal for the remaining steps.

Step 5: Check Your Validator Account
When the node first started, it generated a validator key and funded it in genesis. Query the keystore to find your address:
canopy admin ks
Expected output (addresses will differ):
{
  "keys": [
    {
      "address": "dfd3c8dff19da7682f7fe5fde062c813b55c9eee",
      "nickname": "validator",
      "isValidator": true
    }
  ]
}
Copy your validator address. Now check its balance:
canopy query account <your-address>
Expected output:
