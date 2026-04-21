import { Post, User, Reply } from "./types";

// Format prize for display — handles both wei (on-chain) and plain numbers (mock)
// Returns a clean string with max 3 decimal places
export function formatPrize(value: number): string {
  // If value looks like wei (very large), convert from wei
  if (value > 1e15) {
    const eth = value / 1e18;
    return eth % 1 === 0 ? eth.toString() : eth.toFixed(Math.min(3, (eth.toString().split('.')[1] || '').length));
  }
  // Otherwise treat as plain number (mock data)
  return value % 1 === 0 ? value.toString() : value.toFixed(Math.min(3, (value.toString().split('.')[1] || '').length));
}

// Format relative time (e.g., "2h ago", "3d ago")
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Truncate wallet address for display
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const DEFAULT_USERS: User[] = [];

// ── Default seed data ──

const DEFAULT_POSTS: Post[] = [];

const DEFAULT_REPLIES: Reply[] = [];

// ── localStorage helpers ──

const STORAGE_KEYS = {
  posts: 'sprout_mock_posts',
  replies: 'sprout_mock_replies',
  users: 'sprout_mock_users',
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ── Hydrate from localStorage (or use defaults on first visit) ──

export let mockPosts: Post[] = loadFromStorage(STORAGE_KEYS.posts, DEFAULT_POSTS);
export let mockReplies: Reply[] = loadFromStorage(STORAGE_KEYS.replies, DEFAULT_REPLIES);
export let mockUsers: User[] = loadFromStorage(STORAGE_KEYS.users, DEFAULT_USERS);

// ── Mutation functions (auto-persist) ──

export function addMockPost(post: Post) {
  mockPosts = [post, ...mockPosts];
  saveToStorage(STORAGE_KEYS.posts, mockPosts);
}

export function removeMockPost(id: string) {
  mockPosts = mockPosts.filter((post) => post.id !== id);
  saveToStorage(STORAGE_KEYS.posts, mockPosts);
}

export function updateMockPost(id: string, updates: Partial<Post>) {
  mockPosts = mockPosts.map((post) =>
    post.id === id ? { ...post, ...updates } : post
  );
  saveToStorage(STORAGE_KEYS.posts, mockPosts);
}

export function addMockReply(reply: Reply) {
  mockReplies = [...mockReplies, reply];
  saveToStorage(STORAGE_KEYS.replies, mockReplies);
}

export function removeMockReply(id: string) {
  mockReplies = mockReplies.filter((r) => r.id !== id);
  saveToStorage(STORAGE_KEYS.replies, mockReplies);
}

export function addMockUserEarned(address: string, amount: number) {
  const index = mockUsers.findIndex(u => u.wallet_address.toLowerCase() === address.toLowerCase());
  if (index !== -1) {
    mockUsers[index].total_earned += amount;
  } else {
    mockUsers.push({
      wallet_address: address,
      display_name: 'SproutUser',
      total_earned: amount,
    });
  }
  saveToStorage(STORAGE_KEYS.users, mockUsers);
}
