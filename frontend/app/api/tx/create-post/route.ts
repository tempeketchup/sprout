import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { addPost } from '@/lib/serverStore';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorAddress, privateKeyHex, content, imageUrl, prizeTotal, deadline } = body;

    if (!creatorAddress || !privateKeyHex || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Path to the txbuilder executable
    const executablePath = path.join(process.cwd(), 'txbuilder', 'sprout-tx');

    // Build the command
    const prizeUCNPY = Math.round((prizeTotal || 0) * 1_000_000);
    const cmd = `${executablePath} -creator=${creatorAddress} -privkey=${privateKeyHex} -content="${content.replace(/"/g, '\\\\"')}" -image="${imageUrl || ''}" -prize=${prizeUCNPY} -deadline=${deadline || 0}`;

    // Execute the command
    const { stdout, stderr } = await execAsync(cmd);

    if (stderr) {
      console.error('txbuilder stderr:', stderr);
    }

    const txHash = stdout.trim();
    if (!txHash) {
      return NextResponse.json({ error: 'Failed to generate transaction hash' }, { status: 500 });
    }

    // Save the post to the server-side store so ALL users can see it
    const postId = txHash; // Use the tx hash as the post ID for traceability
    addPost({
      id: postId,
      creator: creatorAddress,
      content: content,
      image_url: imageUrl || undefined,
      prize_total: prizeTotal || 0,
      prize_left: prizeTotal || 0,
      deadline: deadline || Date.now() + 86400000,
      created_at: Date.now(),
      status: 'active',
    });

    return NextResponse.json({ txHash });
  } catch (error: any) {
    console.error('Error submitting create-post tx:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
