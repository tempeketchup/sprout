"use client";

import { useGetPosts } from "@/lib/web3/hooks";
import { formatPrize } from "@/lib/constants";
import { Layers, Circle } from "lucide-react";

interface PostStackProps {
  onSelectPost: (id: string) => void;
  selectedPostId: string | null;
}

export default function PostStack({ onSelectPost, selectedPostId }: PostStackProps) {
  const { data: posts, isLoading } = useGetPosts();
  const sortedPosts = posts?.slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  return (
    <div className="flex flex-col gap-4 w-full h-full pr-2 animate-slide-left">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Layers className="text-emerald-600" size={18} />
        </div>
        <div>
          <h2 className="text-sm font-black text-sprout-accent">Post Stack</h2>
          <p className="text-[10px] text-gray-400 font-medium">{posts?.length || 0} bounties</p>
        </div>
      </div>

      {/* Post List */}
      <div className="flex flex-col gap-2 stagger-children">
        {isLoading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/50 animate-pulse" />
            ))}
          </>
        ) : sortedPosts?.map((post) => (
          <div
            key={post.id}
            onClick={() => onSelectPost(post.id)}
            className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer animate-fade-in-up group hover:translate-x-1 ${
              selectedPostId === post.id
                ? "glass-card border-sprout-primary/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-200/50"
                : post.status === "active"
                ? "bg-white/60 border-emerald-100/40 hover:bg-white/80 hover:border-emerald-200/60 hover:shadow-sm"
                : "bg-gray-50/60 border-gray-200/40 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <Circle
                  size={7}
                  fill={post.status === "active" ? "#10b981" : "#9ca3af"}
                  className={post.status === "active" ? "text-emerald-500" : "text-gray-400"}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    post.status === "active"
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  {post.status}
                </span>
              </div>
              <span className="text-[11px] font-black text-sprout-primary">
                {formatPrize(post.prize_total)} CNPY
              </span>
            </div>
            <p className="text-xs font-medium line-clamp-2 leading-relaxed text-sprout-accent/80">
              {post.content}
            </p>
          </div>
        ))}
        {!isLoading && (!sortedPosts || sortedPosts.length === 0) && (
          <div className="p-6 text-center animate-fade-in">
            <p className="text-xs text-gray-400 font-semibold">No active bounties</p>
            <p className="text-[10px] text-gray-300 mt-1">Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
