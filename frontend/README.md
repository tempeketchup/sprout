# 🌱 Sprout

**Micro-tasking on-chain social app.**

Sprout is a fun, simple, and minimalist social platform where anyone can post and complete tasks. Whether it's answering questions, participating in a design challenge, or just fulfilling a bounty, Sprout creates a vibrant ecosystem for creators and solvers.

## Features

- **3-Column Efficient UI**: Inspired by modern social platforms and fast navigation.
  - **Left (Post Stack)**: An inbox-style view of active and closed challenges.
  - **Middle (Main Feed)**: The timeline where all tasks, replies, and submissions live.
  - **Right (Leaderboard)**: Top earners ranked by the token rewards they've securely collected.
- **Web3 Identity**: Connect with MetaMask to build your on-chain reputation as a trusted solver or generous creator. Links directly to your Twitter and Discord for added social proof.
- **Embedded IPFS Support**: Need to show visual proof for a challenge? Upload high-quality images directly into the decentralized web.

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Smart Contracts / Blockchain**: Canopy Network (Go Template) integration for token escrow
- **Storage**: IPFS (Pinata)

## Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/tempeketchup/sprout.git
   cd sprout
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License
MIT
