"use client";

import { Home, PlusSquare, Wallet, Coins, Droplets } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreatePostModal from './CreatePostModal';
import ProfileModal from './ProfileModal';
import ConnectWalletModal from './ConnectWalletModal';
import TxHistoryModal from './TxHistoryModal';
import { useAppContext } from '@/lib/AppContext';
import { toUCNPY } from '@/lib/canopy';

export default function Navbar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const { goHome, displayName, profilePhoto, discordId, balance, address, isConnected } = useAppContext();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-emerald-100/50 px-3 py-2 rounded-full shadow-lg shadow-emerald-900/5">
          {/* Logo / Brand */}
          <button onClick={goHome} className="flex items-center gap-2 pl-2 pr-4 border-r border-emerald-100/50 hover:opacity-80 transition-opacity">
            <img src="/sprout-logo.svg" alt="Sprout" className="w-8 h-8 rounded-xl shadow-md shadow-emerald-500/20" />
            <span className="text-sm font-black text-sprout-accent tracking-tight hidden sm:inline">Sprout</span>
          </button>

          {/* Feed Button */}
          <button
            id="nav-feed"
            onClick={goHome}
            className="flex flex-col items-center px-4 py-1.5 rounded-xl text-sprout-accent hover:bg-emerald-50 hover:text-sprout-primary transition-all duration-150 group"
          >
            <Home size={19} className="group-hover:scale-110 transition-transform duration-150" />
            <span className="text-[9px] font-bold mt-0.5">Feed</span>
          </button>

          {/* Tx History Button */}
          {isConnected && (
            <button
              id="nav-history"
              onClick={() => setIsHistoryOpen(true)}
              className="flex flex-col items-center px-4 py-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform duration-150"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              <span className="text-[9px] font-bold mt-0.5">History</span>
            </button>
          )}
          
          {/* Create Post Button */}
          <button
            id="nav-create"
            onClick={() => isConnected ? setIsCreateOpen(true) : setIsConnectOpen(true)}
            className="relative text-white p-3 rounded-2xl hover:scale-110 hover:shadow-lg hover:shadow-[#2dd4a0]/25 transition-all duration-150 active:scale-95"
            style={{ backgroundColor: '#2dd4a0' }}
          >
            <PlusSquare size={22} />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
          </button>

          {/* Profile / Connect */}
          {!mounted ? (
            <div className="w-24 h-9 bg-emerald-50 rounded-xl animate-pulse" />
          ) : isConnected ? (
            <button
              id="nav-profile"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sprout-accent hover:bg-emerald-50 hover:text-sprout-primary transition-all duration-150 group"
            >
              {/* Profile avatar — shows photo or initials */}
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-150 shadow-sm">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-black text-emerald-800">
                    {address?.slice(2, 4).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-start hidden sm:flex border-r border-emerald-100/50 pr-4">
                <span className="text-[10px] font-bold max-w-[80px] truncate leading-tight">
                  {displayName}
                </span>
                {discordId && (
                  <span className="text-[8px] text-emerald-800/60 font-semibold max-w-[80px] truncate leading-tight">
                    {discordId}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 bg-emerald-100/50 px-2 py-1 rounded-lg">
                <Coins size={12} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-800">{balance.toLocaleString()} CNPY</span>
              </div>
            </button>
          ) : (
            <button
              id="nav-connect"
              onClick={() => setIsConnectOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all duration-150 group"
            >
              <Wallet size={16} className="group-hover:scale-110 transition-transform duration-150" />
              <span className="text-xs font-bold">Connect</span>
            </button>
          )}
        </div>
      </nav>

      <CreatePostModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ConnectWalletModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
      <TxHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </>
  );
}
