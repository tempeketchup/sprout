"use client";

import { X, Image as ImageIcon, Send, DollarSign, Calendar, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/lib/AppContext";
import { fileToBase64 } from "@/lib/fileUtils";
import { useQueryClient } from "@tanstack/react-query";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [prize, setPrize] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { balance, address, privateKey, refreshBalance } = useAppContext();
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const numericPrize = Number(prize) || 0;
  const hasEnoughFunds = balance >= numericPrize;
  
  const handleSubmit = async () => {
    if (numericPrize > 0 && !hasEnoughFunds) return;
    
    try {
      setIsUploading(true);
      
      // Attempt to check balance
      if (numericPrize > 0 && balance < numericPrize) {
        throw new Error("Insufficient balance");
      }



      const newId = Date.now().toString();

      // Convert image to base64 so it persists in localStorage
      let imageUrl: string | undefined;
      if (image) {
        imageUrl = await fileToBase64(image);
      }
      
      // Call the Next.js API route that runs the txbuilder
      const res = await fetch("/api/tx/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: address,
          privateKeyHex: privateKey,
          content: content,
          imageUrl: imageUrl,
          prizeTotal: numericPrize,
          deadline: new Date(deadline).getTime() || Date.now() + 86400000,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit transaction");
      }

      const { txHash } = await res.json();
      console.log("Transaction Hash:", txHash);

      // IMPORTANT: Tell React Query to refetch so it pulls the updated local array into MainFeed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      refreshBalance();

      setIsSuccess(true);
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalClose = () => {
    setIsSuccess(false);
    setContent("");
    setPrize("");
    onClose();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-modal-overlay">
        <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm" />
        <div className="relative bg-white p-8 rounded-[2rem] text-center max-w-sm animate-modal-content shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-float">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-black text-sprout-accent mb-2">Bounty Posted! 🌱</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">Your challenge is now live on the Canopy Network. Participants can start replying!</p>
          <button onClick={handleModalClose} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95">
            Awesome!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-modal-overlay">
      <div 
        className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm" 
        onClick={handleModalClose} 
      />
      
      <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-100 animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-200 rounded-xl">
              <Sparkles className="text-emerald-600" size={18} />
            </div>
            <h2 className="text-lg font-black text-sprout-accent">Create Bounty</h2>
          </div>
          <button 
            onClick={handleModalClose}
            className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-gray-400 hover:text-emerald-600"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <div className="p-8 flex flex-col gap-6">
          <textarea
            id="create-post-content"
            placeholder="What's the challenge? Be specific..."
            className="w-full min-h-[140px] text-base bg-transparent focus:outline-none resize-none text-sprout-accent placeholder:text-gray-300 leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Prize Pool (CNPY)</label>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Bal: {balance.toLocaleString()}
                </div>
              </div>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  id="create-post-prize"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="any"
                  className={`w-full pl-10 pr-4 py-3 bg-emerald-50/50 border ${!hasEnoughFunds && numericPrize > 0 ? 'border-red-300 focus:ring-red-500/20' : 'border-emerald-100 focus:ring-emerald-500/20'} rounded-2xl focus:outline-none focus:ring-2 font-bold text-sm transition-shadow`}
                  value={prize}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setPrize(val);
                    }
                  }}
                />
              </div>
              {!hasEnoughFunds && numericPrize > 0 && (
                <p className="text-[10px] text-red-500 font-bold mt-2">Insufficient balance (Requires {numericPrize} CNPY)</p>
              )}
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] uppercase font-bold text-gray-400 mb-2 block tracking-wider">Deadline</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  id="create-post-deadline"
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm transition-shadow"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>

          <label className="border-2 border-dashed border-emerald-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all cursor-pointer group">
            <input type="file" className="hidden" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            <div className="p-3 bg-emerald-50 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-100 transition-all">
              <ImageIcon className="text-emerald-500" size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-800">{image ? image.name : "Add reference image"}</span>
            <span className="text-[10px] text-gray-400">JPG, PNG, or GIF — Max 5MB</span>
          </label>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] text-gray-400 font-medium max-w-[200px] leading-relaxed">
              Post is free, prize will be sent later directly to the winner.
            </p>
            
            <button 
              id="create-post-submit"
              onClick={handleSubmit}
              disabled={!content || (numericPrize > 0 && !hasEnoughFunds) || isUploading}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-7 py-3.5 rounded-full font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {isUploading ? 'Deploying...' : 'Deploy Post'}
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
