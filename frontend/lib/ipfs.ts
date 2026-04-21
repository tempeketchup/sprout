const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export function getIpfsUrl(cid: string) {
  if (cid.startsWith('http')) return cid;
  return `${PINATA_GATEWAY}${cid}`;
}

export async function fetchIpfsMetadata<T>(cid: string): Promise<T> {
  const url = getIpfsUrl(cid);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch IPFS metadata');
  return response.json();
}
