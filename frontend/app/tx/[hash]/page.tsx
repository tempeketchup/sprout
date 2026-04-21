"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTxByHash } from "@/lib/canopy";
import { useAppContext } from "@/lib/AppContext";
import { ArrowLeft, CheckCircle2, Activity, Hash, Layers, FileText, Coins, Clock } from "lucide-react";

// Format a unix timestamp (seconds or nanoseconds) to readable date/time
function formatTxTime(tx: any): string {
  const rawTime = tx?.transaction?.time || tx?.time || 0;
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

export default function TransactionPage() {
  const { hash } = useParams();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hash) {
      getTxByHash(hash as string).then(data => {
        setTx(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [hash]);

  const timeStr = tx ? formatTxTime(tx) : "";

  const { goHome } = useAppContext();

  return (
    <div className="flex-1 w-full overflow-y-auto pb-20">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up p-4 md:p-6">
        <button
          onClick={goHome}
          className="flex items-center gap-2 text-sprout-primary font-bold hover:gap-3 transition-all text-sm group w-fit"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-150" />
          Back to Feed
        </button>

        <div className="glass-card rounded-[2rem] p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-sprout-accent">Transaction Details</h1>
              <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full inline-block mt-1">
                Status: Confirmed <CheckCircle2 size={14} className="inline ml-1" />
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-500">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin mb-4" />
              <span className="font-bold">Loading transaction data...</span>
            </div>
          ) : !tx ? (
            <div className="text-center py-12">
              <p className="font-bold text-gray-500 text-lg">Transaction not found</p>
              <p className="text-sm text-gray-400 mt-2">Make sure the hash is correct and the node is running.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><Hash size={12}/> Transaction Hash</span>
                <span className="text-sm font-bold text-sprout-accent break-all font-mono">{tx.txHash || hash}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><Layers size={12}/> Block Height</span>
                  <span className="text-lg font-black text-emerald-700">{tx.height}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><FileText size={12}/> Message Type</span>
                  <span className="text-lg font-black text-sprout-accent uppercase">{tx.messageType}</span>
                </div>
              </div>

              {timeStr && (
                <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><Clock size={12}/> Date & Time</span>
                  <span className="text-lg font-black text-sprout-accent">{timeStr}</span>
                </div>
              )}

              {tx.sender && (
                <div className="flex flex-col gap-1.5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Sender Address</span>
                  <span className="text-xs font-bold text-emerald-800 break-all font-mono">{tx.sender}</span>
                </div>
              )}

              {tx.recipient && (
                <div className="flex flex-col gap-1.5 p-4 bg-blue-50/50 rounded-2xl border border-blue-50">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Recipient Address</span>
                  <span className="text-xs font-bold text-blue-800 break-all font-mono">{tx.recipient}</span>
                </div>
              )}

              {tx.amount && (
                <div className="flex flex-col gap-1.5 p-4 bg-amber-50/50 rounded-2xl border border-amber-50">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1"><Coins size={12}/> Amount</span>
                  <span className="text-lg font-black text-amber-700">{tx.amount} uCNPY</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-black text-gray-400 mb-3 uppercase tracking-wider">Raw Payload</h3>
                <pre className="bg-gray-800 text-green-400 p-4 rounded-2xl text-xs overflow-x-auto whitespace-pre-wrap font-mono shadow-inner max-h-[60vh] overflow-y-auto">
                  {JSON.stringify(tx.transaction || tx, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
