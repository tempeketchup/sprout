import { NextResponse } from 'next/server';
import { getRepliesForPost, addReply, removeReply } from '@/lib/serverStore';

/** GET /api/replies?postId=xxx — fetch all replies for a post */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  const replies = getRepliesForPost(postId);
  return NextResponse.json(replies);
}

/** POST /api/replies — create a new reply */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, post_id, author, content, image_url, parent_id } = body;

    if (!post_id || !author || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reply = {
      id: id || `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      post_id,
      author,
      content,
      image_url: image_url || undefined,
      status: 'pending' as const,
      timestamp: Date.now(),
      parent_id: parent_id || undefined,
    };

    addReply(reply);
    return NextResponse.json(reply);
  } catch (error: any) {
    console.error('Error creating reply:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/replies?id=xxx — delete a reply and its children */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  removeReply(id);
  return NextResponse.json({ success: true });
}

/** PATCH /api/replies — update a reply */
export async function PATCH(request: Request) {
  try {
    const { id, updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing reply id' }, { status: 400 });
    }
    const { updateReply } = await import('@/lib/serverStore');
    updateReply(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating reply:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
