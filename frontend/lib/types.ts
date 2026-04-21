export interface Post {
  id: string;
  creator: string; // wallet address
  content: string;
  image_url?: string;
  prize_total: number;
  prize_left: number;
  deadline: number; // timestamp
  created_at: number; // creation timestamp
  status: "active" | "closed";
}

export interface Reply {
  id: string;
  post_id: string;
  author: string; // wallet address
  content: string;
  image_url?: string;
  status: "pending" | "accepted" | "rejected";
  reward_amount?: number; // cumulative CNPY rewarded to this reply
  tx_hash?: string; // transaction hash of the reward
  timestamp: number;
  parent_id?: string; // ID of the reply this is responding to (for threading)
}

export interface User {
  wallet_address: string;
  display_name?: string;
  twitter_handle?: string;
  discord_id?: string;
  total_earned: number;
}
