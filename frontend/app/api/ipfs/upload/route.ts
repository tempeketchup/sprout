import { NextRequest, NextResponse } from 'next/server';
import { PinataSDK } from 'pinata-web3';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || '',
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY || '',
});

// Helper to extract CID from Pinata upload response
function extractCid(response: Record<string, unknown>): string {
  return (response as { cid?: string; IpfsHash?: string }).cid
    || (response as { cid?: string; IpfsHash?: string }).IpfsHash
    || '';
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;
    const metadataStr = data.get('metadata') as string;

    if (!file && !metadataStr) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    let finalCid = '';

    // 1. If there's a file, upload it first to get its CID
    let fileCid = '';
    if (file) {
      const upload = await pinata.upload.file(file);
      fileCid = extractCid(upload as unknown as Record<string, unknown>);
    }

    // 2. If there's metadata, parse it, potentially add the fileCid, and upload
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      
      // Attach the file CID to metadata if it exists
      if (fileCid) {
        metadata.image_url = fileCid;
      }
      
      const upload = await pinata.upload.json(metadata);
      finalCid = extractCid(upload as unknown as Record<string, unknown>);
    } else {
      // If only a file was uploaded, return its CID
      finalCid = fileCid;
    }

    return NextResponse.json({ cid: finalCid });
  } catch (error) {
    console.error('IPFS Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload to IPFS' }, { status: 500 });
  }
}
