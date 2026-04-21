"use client";

import { X, Wallet, ShieldCheck, Zap, UserPlus } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/lib/AppContext";
import { connectWallet, createWallet } from "@/lib/canopy";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { setAddress, setPrivateKey } = useAppContext();
  const [nickname, setNickname] = useState("validator");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  const handleAction = async () => {
    setIsPending(true);
    setError("");
    try {
      let data;
      if (isCreating) {
        data = await createWallet(nickname, password);
      } else {
        data = await connectWallet(nickname, password);
      }
      
      // Update app context with wallet info (set real address, not nickname)
      setAddress(data.address || nickname); 
      if (data.privateKey) {
        setPrivateKey(data.privateKey);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-modal-overlay">
      <div 
        className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-100 animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-200 rounded-xl">
              <Wallet className="text-emerald-600" size={18} />
            </div>
            <h2 className="text-lg font-black text-sprout-accent">
              {isCreating ? "Create Account" : "Connect to Canopy"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-gray-400 hover:text-emerald-600"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium mb-2 leading-relaxed text-center px-4">
            Connect to your local Canopy node via Admin RPC.
          </p>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Address or Nickname (e.g. validator)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              disabled={isPending || !nickname || !password}
              onClick={handleAction}
              className="w-full flex items-center justify-center p-4 rounded-xl border border-transparent bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isPending ? (isCreating ? "Creating..." : "Connecting...") : (isCreating ? "Create Account" : "Connect Key")}
            </button>
          </div>

          <div className="text-center mt-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {isCreating ? "Already have an account? Connect" : "Need a new key? Create Account"}
            </button>
          </div>

          {error && (
            <div className="mt-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-center animate-fade-in">
              <p className="text-xs text-red-600 font-bold">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
