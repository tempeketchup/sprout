"use client";

import { X, Send, Coins, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/lib/AppContext";
import { sendTransaction, toUCNPY } from "@/lib/canopy";

interface SendRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeLeft: number;
  replyAuthor: string;
  onConfirm: (amount: number, txHash?: string) => void;
}

export default function SendRewardModal({ isOpen, onClose, prizeLeft, replyAuthor, onConfirm }: SendRewardModalProps) {
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);
  const { address, sessionPassword, setSessionPassword, rememberPassword, setRememberPassword } = useAppContext();
  const [password, setPassword] = useState(sessionPassword || "");

  if (!isOpen) return null;

  const numericAmount = Number(amount) || 0;
  const isValid = numericAmount > 0 && numericAmount <= prizeLeft;

  const handleSendAll = () => {
    setAmount(prizeLeft.toString());
  };

  const handleConfirm = async () => {
    if (!isValid || !address) return;
    setIsSending(true);
    try {
      const txResult = await sendTransaction(address, replyAuthor, toUCNPY(numericAmount), password);
      
      if (rememberPassword && password) {
        setSessionPassword(password);
      } else if (!rememberPassword) {
        setSessionPassword("");
      }

      setSentAmount(numericAmount);
      setIsSuccess(true);
      onConfirm(numericAmount, txResult); // txResult is the txHash string because Canopy's submitTxs returns just the string hash.
    } catch (e: any) {
      console.error("Failed to send reward:", e);
      alert(`Transaction failed: ${e.message || "Make sure your local node is running and has funds."}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setIsSending(false);
    setIsSuccess(false);
    setSentAmount(0);
    setPassword("");
    onClose();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white p-8 rounded-[2rem] text-center max-w-sm shadow-2xl animate-modal-content">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black text-sprout-accent mb-2">Reward Sent! 🎉</h2>
          <p className="text-gray-400 text-sm mb-2 leading-relaxed">
            Successfully sent <span className="font-black text-emerald-600">{sentAmount} CNPY</span> to
          </p>
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block mb-6">
            {replyAuthor.slice(0, 8)}...{replyAuthor.slice(-6)}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-100 animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-200 rounded-xl">
              <Coins className="text-emerald-600" size={18} />
            </div>
            <h2 className="text-lg font-black text-sprout-accent">Send Reward</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-gray-400 hover:text-emerald-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Recipient */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Recipient</label>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-sprout-accent break-all">
              {replyAuthor}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Amount (CNPY)</label>
              <button
                onClick={handleSendAll}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md transition-colors"
              >
                Send All ({prizeLeft})
              </button>
            </div>
            <div className="relative">
              <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="number"
                placeholder="0"
                min="1"
                max={prizeLeft}
                step="1"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 0 && Number(val) <= prizeLeft)) {
                    setAmount(val);
                  }
                }}
                className={`w-full pl-10 pr-4 py-3 bg-emerald-50/50 border ${
                  amount && !isValid ? 'border-red-300 focus:ring-red-500/20' : 'border-emerald-100 focus:ring-emerald-500/20'
                } rounded-2xl focus:outline-none focus:ring-2 font-bold text-sm transition-shadow`}
              />
            </div>
            {amount && !isValid && numericAmount > prizeLeft && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5">Cannot exceed remaining prize ({prizeLeft} CNPY)</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Wallet Password (if any)</label>
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(e) => setRememberPassword(e.target.checked)}
                    className="peer appearance-none w-3.5 h-3.5 border border-emerald-200 rounded-[4px] bg-white checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                  />
                  <CheckCircle2 size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 transition-colors select-none">Remember</span>
              </label>
            </div>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm transition-shadow"
            />
          </div>

          {/* Remaining info */}
          <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Remaining after</span>
            <span className="text-sm font-black text-amber-700">
              {isValid ? prizeLeft - numericAmount : prizeLeft} CNPY
            </span>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!isValid || isSending}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isSending ? 'Processing Transaction...' : `Send ${numericAmount || 0} CNPY`}
          </button>
        </div>
      </div>
    </div>
  );
}
