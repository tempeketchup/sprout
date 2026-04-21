"use client";

import { X, Wallet, Award, LogOut, AtSign, MessageSquare, Link2, CheckCircle, Edit3, Coins, Camera, User, Loader2, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/lib/AppContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { address, isConnected, setAddress, setPrivateKey } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("Sprout User");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [discordId, setDiscordId] = useState("");
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  const { setDisplayName: setGlobalDisplayName, setProfilePhoto: setGlobalProfilePhoto, setTwitterHandle: setGlobalTwitter, setDiscordId: setGlobalDiscord, balance, totalEarned, displayName: globalDisplayName, twitterHandle: globalTwitter, discordId: globalDiscord, profilePhoto: globalProfilePhoto } = useAppContext();

  useEffect(() => {
    setDisplayName(globalDisplayName || "Sprout User");
    setTwitterHandle(globalTwitter || "");
    setDiscordId(globalDiscord || "");
    if (globalProfilePhoto) setProfilePhoto(globalProfilePhoto);
  }, [globalDisplayName, globalTwitter, globalDiscord, globalProfilePhoto]);

  useEffect(() => {
    if (isUpdateSuccess) {
      onClose();
    }
  }, [isUpdateSuccess]);

  if (!isOpen || !isConnected) return null;

  const handleSaveProfile = async () => {
    try {
      setIsUploading(true);
      const metadata = {
        wallet_address: address,
        display_name: displayName,
        twitter_handle: twitterHandle,
        discord_id: discordId,
        total_earned: totalEarned,
      };

      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));

      const res = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.cid) {
        // Mock update success since we removed smart contract
        setIsUpdateSuccess(true);
      }
    } catch (err) {
      console.warn("Profile IPFS update failed/mocked, applying locally", err);
    } finally {
      // Force update UI locally for immediate feedback in dev mode regardless of IPFS success
      setGlobalDisplayName(displayName);
      setGlobalTwitter(twitterHandle);
      setGlobalDiscord(discordId);
      if (profilePhoto) setGlobalProfilePhoto(profilePhoto);
      onClose();
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProfilePhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-emerald-100 max-h-[90vh] overflow-y-auto">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-white backdrop-blur-sm"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 -mt-14 relative">
          {/* Avatar */}
          <div className="relative w-24 h-24 mb-4 group">
            <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-3xl font-black bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-600">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-emerald-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-4 border-transparent"
            >
              <Camera size={16} className="text-white" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Name & Address */}
          <div className="mb-1 flex items-center gap-2">
            {isEditingName ? (
              <input 
                type="text"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="text-2xl font-black text-sprout-accent bg-transparent border-b-2 border-emerald-500 focus:outline-none w-48 transition-all"
              />
            ) : (
              <h2 className="text-2xl font-black text-sprout-accent flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditingName(true)} title="Click to edit name">
                {displayName}
                <Edit3 className="text-emerald-300 group-hover/name:text-emerald-500 transition-colors" size={16} />
                <Award className="text-emerald-500" size={20} />
              </h2>
            )}
          </div>
          <p className="text-[10px] font-bold text-gray-400 mb-6 break-all flex items-center gap-1.5">
            <Wallet size={11} />
            {address}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
              <span className="text-[9px] uppercase font-bold text-emerald-600/50 mb-1 block tracking-wider">Balance</span>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black text-emerald-700">
                  {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
                <span className="text-[9px] font-bold text-emerald-500 mb-0.5">CNPY</span>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/50">
              <span className="text-[9px] uppercase font-bold text-amber-600/50 mb-1 block tracking-wider">Total Earned</span>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black text-amber-700">{totalEarned.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                <span className="text-[9px] font-bold text-amber-500 mb-0.5">CNPY</span>
              </div>
            </div>
          </div>

          {/* Social Bindings */}
          <div className="mb-6 space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Link2 size={12} />
              Social Bindings
            </h3>

            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Twitter handle"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold"
              />
            </div>

            <div className="relative">
              <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Discord ID"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold"
              />
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={isUploading}
              className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-bold text-sm hover:bg-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin" size={16} /> : isUpdateSuccess ? <Check size={16} /> : null}
              {isUploading ? "Uploading..." : "Update Profile"}
            </button>
          </div>

          <button 
            onClick={() => { setAddress(null); setPrivateKey(null); onClose(); }}
            className="w-full py-3.5 bg-gray-50 text-gray-500 rounded-2xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 group"
          >
            <LogOut size={16} />
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
