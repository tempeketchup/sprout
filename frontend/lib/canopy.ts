const RPC_URL = process.env.NEXT_PUBLIC_CANOPY_RPC_URL || "http://localhost:50002";
const ADMIN_URL = process.env.NEXT_PUBLIC_CANOPY_ADMIN_URL || "http://localhost:50003";

export const UCNPY_PER_CNPY = 1_000_000;

export function toCNPY(ucnpy: number): number {
  return ucnpy / UCNPY_PER_CNPY;
}

export function toUCNPY(cnpy: number): number {
  return Math.round(cnpy * UCNPY_PER_CNPY);
}

// -- Admin RPC --

/** Connects to an existing keystore account */
export async function connectWallet(nicknameOrAddress: string, password?: string) {
  const isAddress = nicknameOrAddress.length === 40 || nicknameOrAddress.length === 42;
  const reqBody: any = { password: password || "" };
  if (isAddress) {
    reqBody.address = nicknameOrAddress;
  } else {
    reqBody.nickname = nicknameOrAddress;
  }

  const res = await fetch(`${ADMIN_URL}/v1/admin/keystore-get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });
  
  if (!res.ok) {
    let errStr = "Failed to connect to Canopy RPC";
    try {
      const err = await res.json();
      if (err.error) errStr = err.error;
    } catch (e) {}
    throw new Error(errStr);
  }
  return res.json(); // returns { address: "..." } and optionally privateKey if requested
}

/** Creates a new keystore account */
export async function createWallet(nickname: string, password?: string) {
  const res = await fetch(`${ADMIN_URL}/v1/admin/keystore-new-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname,
      password: password || "",
    }),
  });
  if (!res.ok) {
    let errStr = "Failed to create account";
    try {
      const err = await res.json();
      if (err.error) errStr = err.error;
    } catch (e) {}
    throw new Error(errStr);
  }
  const addressString = await res.json();
  return { address: addressString };
}

/** Sends tokens from one address to another */
export async function sendTransaction(senderAddress: string, recipientAddress: string, amountUCNPY: number, password?: string) {
  const res = await fetch(`${ADMIN_URL}/v1/admin/tx-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: senderAddress,
      password: password || "",
      output: recipientAddress,
      amount: amountUCNPY,
      submit: true, // Auto-submit to mempool
    }),
  });
  
  if (!res.ok) {
    let errStr = "Transaction failed";
    try {
      const err = await res.json();
      if (err.error) {
        errStr = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      } else {
        errStr = JSON.stringify(err);
      }
    } catch (e) {}
    throw new Error(errStr);
  }
  const result = await res.json();
  // Normalize: server may return a plain string hash, or an object
  if (typeof result === 'string') return result.trim();
  if (result?.txHash) return result.txHash;
  if (result?.hash) return result.hash;
  return String(result);
}

// -- Query RPC --

/** Gets account information including balance */
export async function getAccount(address: string) {
  const res = await fetch(`${RPC_URL}/v1/query/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: address,
      height: 0, // Latest height
    }),
  });
  
  if (!res.ok) return { amount: 0 };
  
  try {
    const data = await res.json();
    return data;
  } catch (e) {
    return { amount: 0 };
  }
}

/** Get transaction history for an address */
export async function getTxHistory(address: string, page = 1, perPage = 20) {
  const res = await fetch(`${RPC_URL}/v1/query/txs-by-sender`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: address,
      page: page,
      perPage: perPage,
    }),
  });
  
  if (!res.ok) return { results: [] };
  try {
    return await res.json();
  } catch (e) {
    return { results: [] };
  }
}

/** Get transaction by hash */
export async function getTxByHash(hash: string) {
  const res = await fetch(`${RPC_URL}/v1/query/tx-by-hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
  });
  
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

/** Get balance in uCNPY */
export async function getBalance(address: string): Promise<number> {
  const account = await getAccount(address);
  return account.amount || 0;
}

/** Get the current block height */
export async function getHeight(): Promise<number> {
  const res = await fetch(`${RPC_URL}/v1/query/height`, { method: "POST" });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.height || 0;
}
