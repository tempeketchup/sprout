import fs from 'fs';
import path from 'path';
import { Post, Reply } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const REPLIES_FILE = path.join(DATA_DIR, 'replies.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── Posts ──

/** Read all posts from the server-side JSON file */
export function readPosts(): Post[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(POSTS_FILE)) return [];
    const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Write all posts to the server-side JSON file */
export function writePosts(posts: Post[]): void {
  ensureDataDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

/** Add a single post (prepends to the list) */
export function addPost(post: Post): void {
  const posts = readPosts();
  // Avoid duplicates by id
  const filtered = posts.filter(p => p.id !== post.id);
  writePosts([post, ...filtered]);
}

/** Remove a post by ID */
export function removePost(id: string): void {
  const posts = readPosts();
  writePosts(posts.filter(p => p.id !== id));
}

/** Update a post by ID */
export function updatePost(id: string, updates: Partial<Post>): void {
  const posts = readPosts();
  writePosts(posts.map(p => p.id === id ? { ...p, ...updates } : p));
}

// ── Replies ──

/** Read all replies from the server-side JSON file */
export function readReplies(): Reply[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(REPLIES_FILE)) return [];
    const raw = fs.readFileSync(REPLIES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Write all replies to the server-side JSON file */
function writeReplies(replies: Reply[]): void {
  ensureDataDir();
  fs.writeFileSync(REPLIES_FILE, JSON.stringify(replies, null, 2), 'utf-8');
}

/** Get replies for a specific post */
export function getRepliesForPost(postId: string): Reply[] {
  return readReplies().filter(r => r.post_id === postId);
}

/** Add a reply */
export function addReply(reply: Reply): void {
  const replies = readReplies();
  const filtered = replies.filter(r => r.id !== reply.id);
  writeReplies([...filtered, reply]);
}

/** Remove a reply and its children */
export function removeReply(id: string): void {
  const replies = readReplies();
  // Collect all descendant IDs
  const idsToRemove = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of replies) {
      if (r.parent_id && idsToRemove.has(r.parent_id) && !idsToRemove.has(r.id)) {
        idsToRemove.add(r.id);
        changed = true;
      }
    }
  }
  writeReplies(replies.filter(r => !idsToRemove.has(r.id)));
}

/** Update a reply by ID */
export function updateReply(id: string, updates: Partial<Reply>): void {
  const replies = readReplies();
  writeReplies(replies.map(r => r.id === id ? { ...r, ...updates } : r));
}

// ── Profiles ──

export interface ServerProfile {
  wallet_address: string;
  display_name: string;
  profile_photo?: string | null;
}

/** Read all profiles from the server-side JSON file */
export function readProfiles(): ServerProfile[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(PROFILES_FILE)) return [];
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Write all profiles to the server-side JSON file */
function writeProfiles(profiles: ServerProfile[]): void {
  ensureDataDir();
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
}

/** Upsert a profile by wallet address */
export function upsertProfile(profile: ServerProfile): void {
  const profiles = readProfiles();
  const idx = profiles.findIndex(p => p.wallet_address.toLowerCase() === profile.wallet_address.toLowerCase());
  if (idx >= 0) {
    profiles[idx] = { ...profiles[idx], ...profile };
  } else {
    profiles.push(profile);
  }
  writeProfiles(profiles);
}

/** Get a profile by wallet address */
export function getProfile(walletAddress: string): ServerProfile | null {
  const profiles = readProfiles();
  return profiles.find(p => p.wallet_address.toLowerCase() === walletAddress.toLowerCase()) || null;
}
