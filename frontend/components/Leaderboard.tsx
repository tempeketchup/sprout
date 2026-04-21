"use client";

import { Trophy, Medal, TrendingUp, Coins, Crown, Star } from "lucide-react";
import { useGetLeaderboard } from "@/lib/web3/hooks";

const RANK_STYLES = [
  { bg: "bg-gradient-to-r from-amber-50 to-yellow-50", border: "border-amber-200/50", text: "text-amber-700", icon: "🥇", glow: "shadow-amber-100" },
  { bg: "bg-gradient-to-r from-gray-50 to-slate-50", border: "border-gray-200/50", text: "text-gray-600", icon: "🥈", glow: "shadow-gray-100" },
  { bg: "bg-gradient-to-r from-orange-50 to-amber-50", border: "border-orange-200/50", text: "text-orange-700", icon: "🥉", glow: "shadow-orange-100" },
];

export default function Leaderboard() {
  const { data: users, isLoading } = useGetLeaderboard();

  return (
    <div className="flex flex-col gap-5 w-full h-full pl-2 animate-slide-right">

      {/* Leaderboard Card */}
      <div className="glass-card rounded-3xl p-5 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-2xl shadow-sm">
            <Trophy className="text-amber-600" size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-sprout-accent">Top Earners</h2>
            <p className="text-[10px] text-gray-400 font-medium">By total CNPY earned</p>
          </div>
        </div>

        {/* Rankings */}
        {isLoading ? (
          <div className="flex flex-col gap-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 stagger-children">
            {users?.slice(0, 5).map((user, index) => {
              const style = RANK_STYLES[index] || { bg: "bg-gray-50/50", border: "border-gray-100", text: "text-gray-600", icon: `${index + 1}`, glow: "" };
              return (
                <div
                  key={user.wallet_address}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${style.bg} ${style.border} ${style.glow} hover:shadow-md transition-all duration-300 animate-fade-in-up group cursor-pointer hover:-translate-y-1`}
                >
                  {/* Rank badge */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0">
                    {index < 3 ? (
                      <span className="text-lg">{style.icon}</span>
                    ) : (
                      <span className={`${style.text} text-xs`}>#{index + 1}</span>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-sprout-accent truncate">
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </span>
                      {user.twitter_handle && (
                        <span className="text-[9px] text-blue-400 font-semibold truncate">
                          {user.twitter_handle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Coins size={10} className="text-emerald-500" />
                      <span className="text-[11px] font-black text-emerald-600">
                        {user.total_earned.toLocaleString()} CNPY
                      </span>
                    </div>
                  </div>

                  {/* Rank indicator */}
                  {index === 0 && (
                    <Crown size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
            </div>
              );
            })}
          </div>
        )}

        {/* View all button */}
        <button className="w-full mt-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-xs hover:bg-emerald-100 transition-all border border-emerald-100/50 flex items-center justify-center gap-2">
          <TrendingUp size={14} />
          View Global Rankings
        </button>
      </div>

      {/* CTA Card */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 rounded-3xl p-5 text-white overflow-hidden relative group">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-emerald-400/20 transition-all duration-700" />
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-green-400/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <Star className="text-emerald-300" size={16} />
            </div>
            <h3 className="text-sm font-black">Start Earning</h3>
          </div>
          <p className="text-[11px] text-emerald-200/70 mb-5 leading-relaxed">
            Complete bounties, answer questions, and help others to earn CNPY tokens on the Canopy Network.
          </p>
          <a 
            href="https://www.canopynetwork.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-300 hover:text-white transition-colors flex items-center gap-1 inline-flex group/btn w-fit"
          >
            Learn more
            <TrendingUp size={12} className="group-hover/btn:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
