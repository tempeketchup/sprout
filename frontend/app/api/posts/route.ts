import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { readPosts, updatePost } from '@/lib/serverStore';
import { Post } from '@/lib/types';

const execAsync = promisify(exec);

export async function GET() {
  // 1. Try fetching on-chain posts from the Canopy state DB
  let onChainPosts: Post[] = [];
  try {
    const executablePath = path.join(process.cwd(), 'txbuilder', 'sprout-tx');
    const { stdout, stderr } = await execAsync(`${executablePath} -query-posts`);

    if (stderr) {
      console.error('txbuilder query stderr:', stderr);
    }

    const parsed = JSON.parse(stdout.trim() || '[]');
    if (Array.isArray(parsed)) {
      onChainPosts = parsed;
    }
  } catch (error: any) {
    console.error('Error querying on-chain posts:', error);
  }

  // 2. Read posts from the server-side JSON store
  const serverPosts = readPosts();

  // 3. Merge: on-chain posts form the base, server store overrides mutable state (status, prize_left) and adds off-chain posts
  const postsById = new Map<string, Post>();
  for (const p of onChainPosts) {
    postsById.set(p.id, p);
  }
  for (const p of serverPosts) {
    if (postsById.has(p.id)) {
      const existing = postsById.get(p.id)!;
      postsById.set(p.id, { ...existing, ...p });
    } else {
      postsById.set(p.id, p);
    }
  }

  const allPosts = Array.from(postsById.values());
  return NextResponse.json(allPosts);
}

export async function PATCH(request: Request) {
  try {
    const { id, updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing post id' }, { status: 400 });
    }
    updatePost(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const { removePost } = await import('@/lib/serverStore');
    removePost(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

