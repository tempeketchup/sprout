"use client";

import { X, ExternalLink, ArrowUpRight, Activity, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppContext } from "@/lib/AppContext";
import { getTxHistory } from "@/lib/canopy";

interface TxHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format a unix timestamp (seconds or nanoseconds) to readable date/time
function formatTxTime(tx: any): string {
  // Try transaction.time first (unix timestamp from Canopy)
  const rawTime = tx.transaction?.time || tx.time || 0;
  if (!rawTime) return "";
  // Canopy timestamps are usually in microseconds (UnixMicro).
  // We need milliseconds for JS Date.
  // If > 1e15, it's micro. If > 1e18, it's nano.
  const ts = rawTime > 1e18 ? Math.floor(rawTime / 1e6) : rawTime > 1e14 ? Math.floor(rawTime / 1e3) : rawTime;
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function TxHistoryModal({ isOpen, onClose }: TxHistoryModalProps) {
  const { address } = useAppContext();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !address) return;
    
    setIsLoading(true);
    getTxHistory(address)
      .then(data => {
        const results = data.results || [];
        // Sort descending: newest first (by height, falling back to index)
        results.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        setHistory(results);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen, address]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-100 animate-modal-content">
        <div className="flex items-center justify-between p-6 border-b border-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-200 rounded-xl">
              <Activity className="text-emerald-600" size={18} />
            </div>
            <h2 className="text-lg font-black text-sprout-accent">Transaction History</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-gray-400 hover:text-emerald-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50/30">
          {isLoading ? (
            <div className="text-center py-8 text-emerald-500 font-bold">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-bold">No transactions found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((tx, idx) => {
                const timeStr = formatTxTime(tx);
                return (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-emerald-50 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">
                          {tx.messageType}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Block {tx.height}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-sprout-accent truncate pr-4 font-mono">
                        {tx.txHash}
                      </div>
                      {timeStr && (
                        <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {timeStr}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/tx/${tx.txHash}`}
                      onClick={onClose}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shrink-0"
                      title="View transaction details"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
