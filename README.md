# 🌱 Sprout

Sprout is a decentralized social application built on top of the Canopy Network. It allows users to post, reply, and send real on-chain rewards to each other.

This repository is a monorepo containing both the blockchain node software and the social frontend.

## 📁 Project Structure

- **/canopy**: The official Canopy Network blockchain node software. This runs the local network and processes all transactions and blocks.
- **/frontend**: The Next.js web application for the Sprout social feed.
  - **/frontend/txbuilder**: A custom Go CLI plugin we built that safely signs and broadcasts your social transactions (posts, replies, and rewards) directly to your local node.

## 🚀 Installation & Setup

To run Sprout locally, you need to run both the Canopy blockchain and the Frontend app.

### Prerequisites
- Go 1.24.0+ installed (`go version`)
- Node.js 20+ installed (`node --version`)
- `~/go/bin` on your PATH: add `export PATH="$PATH:$HOME/go/bin"` to your shell profile

### 1. Build Canopy & Plugin
From the repo root, build the canopy binary and the Go plugin:

```bash
cd canopy
make build/canopy-full
cd plugin/go
make build
cd ../../..
```

> **Note:** You must use `build/canopy-full` (not `build/canopy`). The full build compiles the
> wallet and explorer web apps first, then builds the Go binary with those assets embedded.
> Using `build/canopy` alone will fail with `no matching files found`.

### 2. First Run — Generate Config
Run `canopy start` once to generate the config files:

```bash
canopy start
```

When prompted:
1. **Password**: Enter a secure password (do NOT leave blank). You will need this password to manually fund new accounts, or to log in as the validator.
2. **Nickname**: Press **Enter** to accept the default `validator`

Then press **Ctrl+C** to stop the node.

### 3. Configure the Plugin
Set the plugin to `"go"` in the config:

```bash
sed -i 's/"plugin": ""/"plugin": "go"/' ~/.canopy/config.json
```

### 4. Start the Node
```bash
canopy start
```

Wait for: `plugin connected: go_plugin_contract (id=1, version=1)`

The validator account is automatically funded with tokens from genesis.

### 5. Start the Social App (Frontend)
Open a **new** terminal (keep `canopy start` running):

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the App & Create Your Account
Go to [http://localhost:3000](http://localhost:3000) in your browser.

1. Click **Connect Wallet**
2. Click **"Need a new key? Create Account"**
3. Enter a **nickname** and **password** (password is required!)
4. Click **Create Account**

Because the validator account is secured with a password, the frontend cannot automatically fund your new account. You have two options:

**Option A: Log in with your validator account**
You can simply log in using the `validator` nickname and the password you set during setup.

**Option B: Manually fund your new account**
If you created a new account, you must manually send funds to it from the validator. Open a new terminal and run:

```bash
canopy admin tx-send validator <YOUR_NEW_NICKNAME> 10000000
```

*(You will be prompted for your validator password. This sends 10 CNPY to your new account).*

You're now ready to post, reply, and send rewards!

## 🔌 Ports

| Port  | Service              | Notes |
|-------|----------------------|-------|
| 3000  | Sprout frontend      | **Your app** — open this in browser |
| 50002 | Canopy public RPC    | Transaction submission & queries |
| 50003 | Canopy admin RPC     | Keystore & account management (localhost only) |
| 50001 | Canopy explorer      | ⚠️ Betanet — may return 404, not required |
| 50000 | Canopy wallet        | ⚠️ Betanet — may not be functional, not required |

## 🧩 About the Canopy Plugin & Transactions
We integrated a custom transaction builder (`txbuilder`) inside the frontend. Rather than relying on a third-party wallet, this mini Go plugin uses Canopy's native cryptographic libraries to securely sign and dispatch transactions (like sending a "sprout reward" bounty) directly to your local node. All rewards are settled instantly on the blockchain!
