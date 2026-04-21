# 🌱 Sprout

Sprout is a decentralized social application built on top of the Canopy Network. It allows users to post, reply, and send real on-chain rewards to each other.

This repository is a monorepo containing both the blockchain node software and the social frontend.

## 📁 Project Structure

- **/canopy**: The official Canopy Network blockchain node software. This runs the local network and processes all transactions and blocks.
- **/frontend**: The Next.js web application for the Sprout social feed.
  - **/frontend/txbuilder**: A custom Go CLI plugin we built that safely signs and broadcasts your social transactions (posts, replies, and rewards) directly to your local Canopy node.

## 🚀 Installation & Setup

To run Sprout locally, you need to run both the Canopy blockchain and the Frontend app.

### 1. Start the Blockchain (Canopy)
First, you need to start your local Canopy node. If this is your first time, it will automatically create a validator account for you!

```bash
cd canopy
make build/canopy-full
canopy start
```
*(On first run, it will ask you to create a password and nickname for your validator account. Remember these!)*

### 2. Start the Social App (Frontend)
Open a **new** terminal window (keep `canopy start` running in the background), and start the Next.js app:

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App
Go to [http://localhost:3000](http://localhost:3000) in your browser. 

You can now connect your wallet using the same password you set up during the Canopy setup, create posts, and send rewards!

## 🧩 About the Canopy Plugin & Transactions
We integrated a custom transaction builder (`txbuilder`) inside the frontend. Rather than relying on a third-party wallet, this mini Go plugin uses Canopy's native cryptographic libraries to securely sign and dispatch transactions (like sending a "sprout reward" bounty) directly to your local node. All rewards are settled instantly on the blockchain!
