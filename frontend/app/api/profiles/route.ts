import { NextResponse } from 'next/server';
import { readProfiles, upsertProfile } from '@/lib/serverStore';

/** GET /api/profiles — fetch all profiles (wallet → display_name mapping) */
export async function GET() {
  const profiles = readProfiles();
  return NextResponse.json(profiles);
}

/** POST /api/profiles — upsert a profile */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet_address, display_name, profile_photo } = body;

    if (!wallet_address || !display_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    upsertProfile({
      wallet_address,
      display_name,
      profile_photo: profile_photo || null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error upserting profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
