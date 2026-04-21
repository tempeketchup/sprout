"use client";

import { Send, ArrowLeft, CheckCircle, Loader2, MessageCircle, Clock, Coins, ThumbsUp, ThumbsDown, Reply as ReplyIcon, CornerDownRight, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import ImageLightbox from "@/components/ImageLightbox";
import { useGetPosts, useGetReplies, useAcceptReply } from "@/lib/web3/hooks";
import { getIpfsUrl } from "@/lib/ipfs";
import { getTxByHash, getTxHistory } from "@/lib/canopy";
import { Reply } from "@/lib/types";
import { formatPrize, removeMockPost, updateMockPost, addMockUserEarned } from "@/lib/constants";
import { fileToBase64 } from "@/lib/fileUtils";
import { useAppContext } from "@/lib/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import SendRewardModal from "@/components/SendRewardModal";
import Link from "next/link";

interface MainFeedProps {
  selectedPostId: string | null;
  onSelectPost: (id: string | null) => void;
  searchQuery: string;
}

type VoteState = Record<string, 'up' | 'down' | null>;
type VoteCount = Record<string, { up: number; down: number }>;

// Resolve image URL: local (blob:/data:) URLs pass through, IPFS CIDs get wrapped
const resolveImageUrl = (url: string) =>
  url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http') ? url : getIpfsUrl(url);

export default function MainFeed({ selectedPostId, onSelectPost, searchQuery }: MainFeedProps) {
  const [replyContent, setReplyContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [localReplies, setLocalReplies] = useState<Reply[]>([]);
  const [postVotes, setPostVotes] = useState<VoteState>({});
  const [postVoteCounts, setPostVoteCounts] = useState<VoteCount>({});
  const [replyVotes, setReplyVotes] = useState<VoteState>({});
  const [replyVoteCounts, setReplyVoteCounts] = useState<VoteCount>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string>>(new Set());
  const [deletedReplyIds, setDeletedReplyIds] = useState<Set<string>>(new Set());

  const { data: posts, isLoading: isLoadingPosts } = useGetPosts();
  const { data: fetchedReplies, isLoading: isLoadingReplies } = useGetReplies(selectedPostId || "");

  const { acceptReply, isPending: isAccepting } = useAcceptReply();
  const { addEarned, profilePhoto, displayName, address, refreshBalance } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Reward flow state
  const [rewardModalReply, setRewardModalReply] = useState<Reply | null>(null);
  const [replyRewards, setReplyRewards] = useState<Record<string, number>>({});
  const [acceptedReplyIds, setAcceptedReplyIds] = useState<Set<string>>(new Set());
  const [pendingReplyIds, setPendingReplyIds] = useState<Set<string>>(new Set());
  const [replyTxHashes, setReplyTxHashes] = useState<Record<string, string>>({});
  const [localPrizeLeft, setLocalPrizeLeft] = useState<Record<string, number>>({});
  const [localPostStatus, setLocalPostStatus] = useState<Record<string, string>>({});
  const [rewardHydrated, setRewardHydrated] = useState(false);
  const pollCountRef = useRef<Record<string, number>>({});
  const pendingRewardsRef = useRef<Record<string, { postId: string, amount: number }>>({});
  const [serverProfiles, setServerProfiles] = useState<Record<string, { name: string; photo: string | null }>>({});

  // Load persisted reward state from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sprout_reward_state');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.pendingReplyIds?.length) setPendingReplyIds(new Set(saved.pendingReplyIds));
        if (saved.acceptedReplyIds?.length) setAcceptedReplyIds(new Set(saved.acceptedReplyIds));
        if (saved.replyRewards) setReplyRewards(saved.replyRewards);
        if (saved.replyTxHashes) setReplyTxHashes(saved.replyTxHashes);
      }
    } catch { }
    setRewardHydrated(true);
  }, []);

  // Persist reward state to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (!rewardHydrated) return; // Don't overwrite before load completes
    try {
      localStorage.setItem('sprout_reward_state', JSON.stringify({
        pendingReplyIds: Array.from(pendingReplyIds),
        acceptedReplyIds: Array.from(acceptedReplyIds),
        replyRewards,
        replyTxHashes,
      }));
    } catch { }
  }, [rewardHydrated, pendingReplyIds, acceptedReplyIds, replyRewards, replyTxHashes]);

  // Fetch server-side profiles so other users' display names are visible
  useEffect(() => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then((profiles: Array<{ wallet_address: string; display_name: string; profile_photo?: string | null }>) => {
        const map: Record<string, { name: string; photo: string | null }> = {};
        for (const p of profiles) {
          map[p.wallet_address.toLowerCase()] = { name: p.display_name, photo: p.profile_photo || null };
        }
        setServerProfiles(map);
      })
      .catch(() => {});
  }, []);

  const combinedReplies = [
    ...(fetchedReplies || []),
    ...localReplies.filter(lr => lr.post_id === selectedPostId),
  ];

  const allReplies = Array.from(new Map(combinedReplies.map(r => [r.id, r])).values())
    .filter(r => !deletedReplyIds.has(r.id));

  // Separate top-level replies and child replies
  const topLevelReplies = allReplies.filter(r => !r.parent_id);
  const childRepliesMap = allReplies.reduce((acc, r) => {
    if (r.parent_id) {
      if (!acc[r.parent_id]) acc[r.parent_id] = [];
      acc[r.parent_id].push(r);
    }
    return acc;
  }, {} as Record<string, Reply[]>);

  const selectedPost = posts?.find(p => p.id === selectedPostId);

  const filteredPosts = posts?.filter(post =>
    !deletedPostIds.has(post.id) &&
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => (b.created_at || 0) - (a.created_at || 0)) || [];

  // Delete a post (removes from view, returns remaining balance for active posts)
  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const postToDelete = posts?.find(p => p.id === postId);
    // Return remaining prize to creator's balance
    if (postToDelete) {
      const remaining = localPrizeLeft[postId] ?? postToDelete.prize_left;
      if (remaining > 0) {
        addEarned(remaining);
        refreshBalance();
      }
    }
    removeMockPost(postId);
    fetch(`/api/posts?id=${encodeURIComponent(postId)}`, { method: 'DELETE' }).catch(err => console.error('Failed to delete post on server:', err));
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    setDeletedPostIds(prev => new Set(prev).add(postId));
    onSelectPost(null);
  };

  // Delete a reply and its children
  const handleDeleteReply = (replyId: string) => {
    const idsToDelete: string[] = [replyId];
    const collectChildren = (parentId: string) => {
      allReplies.filter(r => r.parent_id === parentId).forEach(child => {
        idsToDelete.push(child.id);
        collectChildren(child.id);
      });
    };
    collectChildren(replyId);

    // Remove from server-side store
    fetch(`/api/replies?id=${encodeURIComponent(replyId)}`, { method: 'DELETE' })
      .catch(err => console.warn('Failed to delete reply on server:', err));

    setDeletedReplyIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.add(id));
      return next;
    });
    // Also remove from local component state
    setLocalReplies(prev => prev.filter(r => !idsToDelete.includes(r.id)));
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  };

  const handlePostVote = (postId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setPostVotes(prev => {
      const current = prev[postId];
      return { ...prev, [postId]: current === direction ? null : direction };
    });
    setPostVoteCounts(prev => {
      const current = prev[postId] || { up: 0, down: 0 };
      const oldVote = postVotes[postId];
      const counts = { ...current };
      if (oldVote === 'up') counts.up--;
      if (oldVote === 'down') counts.down--;
      if (oldVote !== direction) {
        if (direction === 'up') counts.up++;
        else counts.down++;
      }
      return { ...prev, [postId]: counts };
    });
  };

  const handleReplyVote = (replyId: string, direction: 'up' | 'down') => {
    setReplyVotes(prev => {
      const current = prev[replyId];
      return { ...prev, [replyId]: current === direction ? null : direction };
    });
    setReplyVoteCounts(prev => {
      const current = prev[replyId] || { up: 0, down: 0 };
      const oldVote = replyVotes[replyId];
      const counts = { ...current };
      if (oldVote === 'up') counts.up--;
      if (oldVote === 'down') counts.down--;
      if (oldVote !== direction) {
        if (direction === 'up') counts.up++;
        else counts.down++;
      }
      return { ...prev, [replyId]: counts };
    });
  };

  const getProfile = (walletAddress: string) => {
    if (address?.toLowerCase() === walletAddress.toLowerCase()) {
      return { name: displayName || 'You', photo: profilePhoto, shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` };
    }
    let name = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    let photo = null;

    // Check server-side profiles first (shared across all browsers)
    const serverProfile = serverProfiles[walletAddress.toLowerCase()];
    if (serverProfile) {
      name = serverProfile.name;
      photo = serverProfile.photo;
    }

    // Fallback: check localStorage (only has current browser's profiles)
    if (name === `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`) {
      try {
        const raw = localStorage.getItem('sprout_app_state_v2');
        if (raw) {
          const appState = JSON.parse(raw);
          const keys = Object.keys(appState.profiles || {});
          const matchKey = keys.find(k => k.toLowerCase() === walletAddress.toLowerCase());
          if (matchKey && appState.profiles[matchKey]) {
            const p = appState.profiles[matchKey];
            if (p.displayName) name = p.displayName;
            if (p.profilePhoto) photo = p.profilePhoto;
          }
        }
      } catch (e) { }
    }

    if (name === `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`) {
      // Find fallback in mockUsers from constants (lazy load it)
      const { mockUsers } = require('@/lib/constants');
      const mockUser = mockUsers.find((u: any) => u.wallet_address.toLowerCase() === walletAddress.toLowerCase());
      if (mockUser && mockUser.display_name) name = mockUser.display_name;
    }

    return { name, photo, shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` };
  };

  // Handle reward confirmation from SendRewardModal
  const handleRewardConfirm = (replyId: string, postId: string, amount: number, txHash?: string) => {
    const post = posts?.find(p => p.id === postId);
    if (!post) return;

    const currentLeft = localPrizeLeft[postId] ?? post.prize_left;
    const newLeft = Math.max(0, currentLeft - amount);

    // Track cumulative reward for this reply
    setReplyRewards(prev => ({
      ...prev,
      [replyId]: (prev[replyId] || 0) + amount,
    }));

    if (txHash) {
      // Ensure txHash is always a clean string for URL usage
      const cleanHash = typeof txHash === 'string' ? txHash.trim() : String(txHash);
      setReplyTxHashes(prev => ({ ...prev, [replyId]: cleanHash }));
      setPendingReplyIds(prev => new Set(prev).add(replyId));
      pendingRewardsRef.current[replyId] = { postId, amount };
      
      // Update server with pending reward tx
      fetch('/api/replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyId, updates: { tx_hash: cleanHash } })
      }).catch(e => console.warn(e));
    } else {
      setAcceptedReplyIds(prev => new Set(prev).add(replyId));
      
      // Update server with completed reward immediately
      fetch('/api/replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyId, updates: { status: 'accepted', reward_amount: (replyRewards[replyId] || 0) + amount } })
      }).catch(e => console.warn(e));
    }

    // Update local prize tracking
    setLocalPrizeLeft(prev => ({ ...prev, [postId]: newLeft }));

    // Update the mock post data (for local immediate fallback)
    const newStatus = newLeft <= 0 ? 'closed' : 'active';
    updateMockPost(postId, { prize_left: newLeft, status: newStatus as 'active' | 'closed' });
    if (newLeft <= 0) {
      setLocalPostStatus(prev => ({ ...prev, [postId]: 'closed' }));
    }

    // Persist to server store
    fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, updates: { prize_left: newLeft, status: newStatus } })
    }).catch(err => console.error('Failed to update post on server:', err));


    // Credit the winner globally for leaderboard
    const targetAuthor = allReplies.find(r => r.id === replyId)?.author;
    if (targetAuthor) {
      addMockUserEarned(targetAuthor, amount);

      // Sync with AppState so the recipient sees it when they log in
      try {
        const raw = localStorage.getItem('sprout_app_state_v2');
        if (raw) {
          const appState = JSON.parse(raw);
          if (!appState.profiles[targetAuthor]) {
            appState.profiles[targetAuthor] = {
              displayName: "Sprout User",
              profilePhoto: null,
              twitterHandle: "",
              discordId: "",
              totalEarned: 0,
              privateKey: null,
            };
          }
          appState.profiles[targetAuthor].totalEarned += amount;
          localStorage.setItem('sprout_app_state_v2', JSON.stringify(appState));
        }
      } catch (e) { }
    }

    // Credit the winner in current session (if it's the current user)
    if (address?.toLowerCase() === (targetAuthor || '').toLowerCase()) {
      addEarned(amount);
    }

    // Refresh balance for everyone involved (sender's balance should drop immediately)
    refreshBalance();

    // Refresh posts and leaderboard query
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  };

  // Poll for pending transactions by checking block height
  useEffect(() => {
    if (pendingReplyIds.size === 0) return;

    const interval = setInterval(async () => {
      for (const replyId of Array.from(pendingReplyIds)) {
        const hash = replyTxHashes[replyId];
        if (!hash) continue;

        try {
          const txData = await getTxByHash(hash);
          if (txData && txData.height && txData.height > 0) {
            // It's confirmed!
            setPendingReplyIds(prev => {
              const next = new Set(prev);
              next.delete(replyId);
              return next;
            });
            setAcceptedReplyIds(prev => new Set(prev).add(replyId));
            
            // Sync confirmed status to server
            const amount = pendingRewardsRef.current[replyId]?.amount || 0;
            const currentReward = allReplies.find(r => r.id === replyId)?.reward_amount || 0;
            fetch('/api/replies', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: replyId, updates: { status: 'accepted', reward_amount: currentReward + amount } })
            }).catch(e => console.warn(e));
            
            if (pollCountRef.current[replyId]) delete pollCountRef.current[replyId];
            if (pendingRewardsRef.current[replyId]) delete pendingRewardsRef.current[replyId];
          } else if (txData === null || txData.error) {
            pollCountRef.current[replyId] = (pollCountRef.current[replyId] || 0) + 1;
            
            // Cancel after ~15 seconds (5 attempts)
            if (pollCountRef.current[replyId] >= 5) {
              alert(`Transaction ${hash} was not processed by the network. The reward has been cancelled so you can try again.`);
              
              setPendingReplyIds(prev => {
                const next = new Set(prev);
                next.delete(replyId);
                return next;
              });
              
              const rewardContext = pendingRewardsRef.current[replyId];
              if (rewardContext) {
                const { postId, amount } = rewardContext;
                
                setLocalPrizeLeft(prev => {
                  const restoredLeft = (prev[postId] || 0) + amount;
                  updateMockPost(postId, { prize_left: restoredLeft, status: 'active' });
                  fetch('/api/posts', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: postId, updates: { prize_left: restoredLeft, status: 'active' } })
                  }).catch(err => console.error('Failed to revert post on server:', err));
                  return { ...prev, [postId]: restoredLeft };
                });
                
                setLocalPostStatus(prev => ({ ...prev, [postId]: 'active' }));
                setReplyRewards(prev => ({ ...prev, [replyId]: Math.max(0, (prev[replyId] || 0) - amount) }));
                
                // Revert earned balances if they were added early
                const targetAuthor = allReplies.find(r => r.id === replyId)?.author;
                if (targetAuthor && address?.toLowerCase() === targetAuthor.toLowerCase()) {
                   // Ignore tiny mismatch until reload.
                }
              }
              
              // Remove the pending tx hash from the server so the PENDING badge goes away
              fetch('/api/replies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: replyId, updates: { tx_hash: '' } })
              }).catch(err => console.error(err));
              
              delete pollCountRef.current[replyId];
              delete pendingRewardsRef.current[replyId];
            }
          }
        } catch (e) {
          console.error("Error polling tx", hash, e);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [pendingReplyIds, replyTxHashes, allReplies, address]);

  const handleReplySubmit = useCallback(async () => {
    if (!selectedPostId || !replyContent.trim()) return;
    const content = replyContent.trim();
    setReplyContent("");
    const parentId = replyingToId;
    setReplyingToId(null);

    // Convert image to base64 for persistence
    let imageUrl: string | undefined;
    if (replyImage) {
      imageUrl = await fileToBase64(replyImage);
    }

    try {
      setIsUploading(true);

      // Submit reply to the server-side store so ALL users can see it
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: selectedPostId,
          author: address || "0x0000000000000000000000000000000000000000",
          content,
          image_url: imageUrl,
          parent_id: parentId || undefined,
        }),
      });

      if (res.ok) {
        const savedReply: Reply = await res.json();
        // Add to local state for instant UI feedback
        setLocalReplies(prev => [...prev, savedReply]);
      }
    } catch (err) {
      console.warn("Failed to save reply to server", err);
      // Fallback: add locally anyway so user sees their reply
      const fallbackReply: Reply = {
        id: `local-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        post_id: selectedPostId,
        author: address || "0x0000000000000000000000000000000000000000",
        content,
        image_url: imageUrl,
        status: "pending",
        timestamp: Date.now(),
        parent_id: parentId || undefined,
      };
      setLocalReplies(prev => [...prev, fallbackReply]);
    } finally {
      setIsUploading(false);
    }

    setReplyImage(null);
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  }, [selectedPostId, replyContent, replyingToId, replyImage, address, queryClient]);

  // Render a single reply card — depth caps indentation at 3
  const MAX_DEPTH = 2;
  const renderReplyCard = (reply: Reply, isChild: boolean, depth: number = 0) => {
    const rv = replyVoteCounts[reply.id] || { up: 0, down: 0 };
    const children = childRepliesMap[reply.id] || [];
    const atMaxDepth = depth >= MAX_DEPTH;

    return (
      <div key={reply.id} className="animate-fade-in-up">
        <div className="flex">
          {/* Thread line for child replies */}
          {isChild && (
            <div className="flex flex-col items-center mr-3 shrink-0">
              <div className="w-px bg-emerald-200 h-3" />
              <CornerDownRight size={14} className="text-emerald-300 -ml-[1px]" />
            </div>
          )}

          <div className={`flex-1 glass-card p-4 rounded-2xl group hover:translate-y-[-1px] transition-all duration-200 ${isChild ? 'bg-emerald-50/30' : ''
            }`}>
            {/* Author header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`rounded-xl overflow-hidden bg-gradient-to-br flex items-center justify-center font-black text-[9px] ${isChild
                    ? 'w-8 h-8 from-emerald-100 to-green-100 text-emerald-600'
                    : 'w-10 h-10 from-gray-100 to-gray-200 text-gray-500'
                  }`}>
                  {getProfile(reply.author).photo ? (
                    <img src={getProfile(reply.author).photo!} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    reply.author.slice(2, 4).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold text-sprout-accent ${isChild ? 'text-[11px]' : 'text-xs'}`}>
                    {getProfile(reply.author).name}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {getProfile(reply.author).shortAddress}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Content */}
            <p className={`text-sprout-accent leading-relaxed mb-2.5 ${isChild ? 'text-xs' : 'text-sm'}`}>
              {reply.content}
            </p>
            {reply.image_url && (
              <div
                className="mb-3 max-w-[320px] rounded-xl overflow-hidden border border-emerald-100/50 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxSrc(resolveImageUrl(reply.image_url!))}
              >
                <img src={resolveImageUrl(reply.image_url)} alt="Attached" className="w-full h-auto" />
              </div>
            )}

            {/* Interaction bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleReplyVote(reply.id, 'up')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 ${replyVotes[reply.id] === 'up'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <ThumbsUp size={12} />
                  {rv.up > 0 && <span>{rv.up}</span>}
                </button>
                <button
                  onClick={() => handleReplyVote(reply.id, 'down')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 ${replyVotes[reply.id] === 'down'
                      ? 'bg-red-100 text-red-600'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <ThumbsDown size={12} />
                  {rv.down > 0 && <span>{rv.down}</span>}
                </button>
                <button
                  onClick={() => {
                    setReplyingToId(replyingToId === reply.id ? null : reply.id);
                    setReplyContent(`@${getProfile(reply.author).name.replace(/\s+/g, '')} `);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 ${replyingToId === reply.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
                    }`}
                >
                  <ReplyIcon size={12} />
                  Reply
                </button>
                {/* Delete own comment — hidden if reply has been rewarded */}
                {(reply.id.startsWith('local-') || address?.toLowerCase() === reply.author.toLowerCase()) &&
                  !acceptedReplyIds.has(reply.id) && !pendingReplyIds.has(reply.id) && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
              </div>

              <div className="flex items-center gap-2">
                {/* Status badge + reward amount */}
                {acceptedReplyIds.has(reply.id) || reply.status === 'accepted' ? (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/tx/${replyTxHashes[reply.id] || reply.tx_hash || ''}`}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
                      title="View transaction"
                    >
                      ✅ COMPLETED
                    </Link>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-100">
                      +{(replyRewards[reply.id] || 0) + (reply.reward_amount || 0)} CNPY
                    </span>
                  </div>
                ) : pendingReplyIds.has(reply.id) || (reply.status === 'pending' && reply.tx_hash) ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> PENDING
                    </span>
                  </div>
                ) : (
                  <>{/* No status shown for non-accepted replies */}</>
                )}
                {/* Send Prize button — for post creator, post active, prize remaining */}
                {selectedPost?.status === 'active' &&
                  (localPostStatus[selectedPost.id] || selectedPost.status) === 'active' &&
                  address?.toLowerCase() === selectedPost.creator.toLowerCase() &&
                  (localPrizeLeft[selectedPost.id] ?? selectedPost.prize_left) > 0 && (
                    <button
                      onClick={() => setRewardModalReply(reply)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Coins size={12} />
                      Send Prize
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Nested child replies — stop indenting after MAX_DEPTH */}
        {children.length > 0 && (
          atMaxDepth ? (
            // At max depth: render children flat (no more left margin)
            <div className="mt-2 flex flex-col gap-2">
              {children.map(child => renderReplyCard(child, true, depth + 1))}
            </div>
          ) : (
            // Under max depth: indent with thread line
            <div className="ml-6 mt-1 relative">
              <div className="absolute left-0 top-0 bottom-2 w-px bg-emerald-200/60" />
              <div className="flex flex-col gap-2 pl-4">
                {children.map(child => renderReplyCard(child, true, depth + 1))}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  // Loading state
  if (isLoadingPosts) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 text-emerald-600 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Coins className="text-emerald-500" size={20} />
          </div>
        </div>
        <p className="font-bold mt-6 text-sm">Syncing with Canopy Network...</p>
        <p className="text-xs text-gray-400 mt-1">Fetching the latest bounties</p>
      </div>
    );
  }

  // Detail view
  if (selectedPost) {
    const detailVotes = postVoteCounts[selectedPost.id] || { up: 0, down: 0 };
    const replyingToReply = replyingToId ? allReplies.find(r => r.id === replyingToId) : null;

    const timeSinceCreation = Date.now() - (selectedPost.created_at || Date.now());
    const isPostCreator = address?.toLowerCase() === selectedPost.creator.toLowerCase();
    const postStatus = localPostStatus[selectedPost.id] || selectedPost.status;
    // Can only delete active posts (closed posts with fully distributed prizes stay forever)
    const canDeletePost = isPostCreator && postStatus === 'active' && (
      timeSinceCreation < 5 * 60 * 1000 ||
      (timeSinceCreation >= 12 * 60 * 60 * 1000 && allReplies.length === 0)
    );

    return (
      <div className="flex-1 flex flex-col gap-5 w-full max-w-2xl px-2 animate-fade-in">
        <button
          onClick={() => onSelectPost(null)}
          className="flex items-center gap-2 text-sprout-primary font-bold hover:gap-3 transition-all text-sm group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-150" />
          Back to Feed
        </button>

        {/* Post Detail Card */}
        <article className="glass-card p-6 rounded-3xl relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />

          <div className="flex items-center justify-between mb-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center font-black text-emerald-700 text-sm shadow-sm">
                {getProfile(selectedPost.creator).photo ? (
                  <img src={getProfile(selectedPost.creator).photo!} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  selectedPost.creator.slice(2, 4).toUpperCase()
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-sprout-accent">
                  {getProfile(selectedPost.creator).name}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  {getProfile(selectedPost.creator).shortAddress}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  {new Date(selectedPost.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${(localPostStatus[selectedPost.id] || selectedPost.status) === 'active'
                  ? 'bg-emerald-100 text-emerald-700 animate-pulse-glow'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                {localPostStatus[selectedPost.id] || selectedPost.status}
              </span>
              {canDeletePost && (
                <button
                  onClick={(e) => handleDeletePost(selectedPost.id, e)}
                  className="p-1.5 rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                  title="Delete post"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <p className="text-lg text-sprout-accent leading-relaxed mb-4 font-medium">
            {selectedPost.content}
          </p>

          {selectedPost.image_url && (
            <div
              className="w-full mb-4 rounded-2xl overflow-hidden border border-emerald-50 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxSrc(resolveImageUrl(selectedPost.image_url!))}
            >
              <img src={resolveImageUrl(selectedPost.image_url)} alt="Reference" className="w-full h-auto" />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-emerald-100/50 pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Bounty</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {formatPrize(selectedPost.prize_total)} CNPY
                </span>
                {(localPrizeLeft[selectedPost.id] ?? selectedPost.prize_left) < selectedPost.prize_total && (
                  <span className="text-xs font-bold text-amber-600">
                    ({localPrizeLeft[selectedPost.id] ?? selectedPost.prize_left} left)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handlePostVote(selectedPost.id, 'up', e)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${postVotes[selectedPost.id] === 'up'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  }`}
              >
                <ThumbsUp size={15} />
                <span>{detailVotes.up || ''}</span>
              </button>
              <button
                onClick={(e) => handlePostVote(selectedPost.id, 'down', e)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${postVotes[selectedPost.id] === 'down'
                    ? 'bg-red-100 text-red-600'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  }`}
              >
                <ThumbsDown size={15} />
                <span>{detailVotes.down || ''}</span>
              </button>
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-400">
                <MessageCircle size={15} />
                <span>{allReplies.length}</span>
              </div>
            </div>
          </div>
        </article>

        {/* Threaded Replies */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] px-2">
            Replies ({allReplies.length})
          </h3>

          {isLoadingReplies ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-100 border-t-emerald-500 animate-spin" />
            </div>
          ) : allReplies.length === 0 ? (
            <div className="p-12 text-center glass-card rounded-3xl border border-dashed border-emerald-200/50 animate-fade-in-up">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="text-emerald-400" size={24} />
              </div>
              <p className="text-sm text-gray-400 font-semibold">No replies yet</p>
              <p className="text-xs text-gray-300 mt-1">Be the first to join this bounty!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 stagger-children">
              {topLevelReplies.map(reply => renderReplyCard(reply, false))}
            </div>
          )}
        </div>

        {/* Reply Input */}
        {(() => {
          const canReply = postStatus === 'active' || isPostCreator;
          return (
            <div className="sticky bottom-4 glass-card p-4 rounded-3xl shadow-xl border border-emerald-100/30 animate-fade-in-up">
              {replyingToId && replyingToReply && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-px h-4 bg-emerald-300 rounded-full" />
                  <span className="text-[10px] font-bold text-emerald-600">
                    Replying to {getProfile(replyingToReply.author).name}
                  </span>
                  <button
                    onClick={() => { setReplyingToId(null); setReplyContent(""); }}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}
              {replyImage && (
                <div className="mb-3 relative w-32 rounded-xl overflow-hidden border border-emerald-100">
                  <button onClick={() => setReplyImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"><X size={12} /></button>
                  <img src={URL.createObjectURL(replyImage)} alt="Preview" className="w-full h-auto" />
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1 relative flex items-center">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setReplyImage(e.target.files?.[0] || null)} disabled={!canReply} />
                  <input
                    id="reply-input"
                    type="text"
                    placeholder={!canReply ? "This post is closed." : replyingToId ? "Write your reply..." : "Write a comment..."}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && canReply && handleReplySubmit()}
                    disabled={!canReply}
                    className={`w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow ${!canReply ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  <button onClick={() => canReply && fileInputRef.current?.click()} disabled={!canReply} className={`absolute right-3 ${!canReply ? 'text-emerald-500/50 cursor-not-allowed' : 'text-emerald-500 hover:text-emerald-700'}`}>
                    <ImageIcon size={18} />
                  </button>
                </div>
                <button
                  id="reply-submit"
                  onClick={handleReplySubmit}
                  disabled={!replyContent.trim() || isUploading || !canReply}
                  className="bg-sprout-primary text-white p-3 rounded-2xl hover:bg-emerald-600 hover:scale-105 transition-all duration-150 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          );
        })()}

        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

        {/* Send Reward Modal */}
        {rewardModalReply && selectedPost && (
          <SendRewardModal
            isOpen={!!rewardModalReply}
            onClose={() => setRewardModalReply(null)}
            prizeLeft={localPrizeLeft[selectedPost.id] ?? selectedPost.prize_left}
            replyAuthor={rewardModalReply.author}
            onConfirm={(amount, txHash) => {
              handleRewardConfirm(rewardModalReply.id, selectedPost.id, amount, txHash);
            }}
          />
        )}
      </div>
    );
  }

  // Feed view
  return (
    <div className="flex-1 flex flex-col gap-5 w-full max-w-2xl px-2">
      <div className="flex flex-col gap-5 pb-20 stagger-children">
        {filteredPosts.map((post) => {
          const pv = postVoteCounts[post.id] || { up: 0, down: 0 };
          return (
            <article
              key={post.id}
              onClick={() => onSelectPost(post.id)}
              className="glass-card p-6 rounded-3xl hover:translate-y-[-2px] transition-all duration-200 relative overflow-hidden cursor-pointer active:scale-[0.99] animate-fade-in-up group"
            >
              {post.status === 'active' && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center font-black text-emerald-700 text-sm shadow-sm">
                  {getProfile(post.creator).photo ? (
                    <img src={getProfile(post.creator).photo!} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    post.creator.slice(2, 4).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-sprout-accent">
                    {getProfile(post.creator).name}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    {getProfile(post.creator).shortAddress}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {new Date(post.deadline).toLocaleDateString()}
                  </span>
                </div>
                <span className={`ml-auto px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${post.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                  {post.status}
                </span>
              </div>

              <p className="text-base text-sprout-accent leading-relaxed mb-4">
                {post.content}
              </p>

              {post.image_url && (
                <div
                  className="w-full mb-4 rounded-2xl overflow-hidden border border-emerald-50 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setLightboxSrc(resolveImageUrl(post.image_url!)); }}
                >
                  <img src={resolveImageUrl(post.image_url)} alt="Post image" className="w-full h-auto max-h-80 object-cover" />
                </div>
              )}

              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl text-xs">
                  <Coins size={13} className="text-emerald-500" />
                  <span className="font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {formatPrize(post.prize_total)} CNPY
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1 border-t border-emerald-50 pt-3">
                <button
                  onClick={(e) => handlePostVote(post.id, 'up', e)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${postVotes[post.id] === 'up'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <ThumbsUp size={15} />
                  <span>{pv.up > 0 ? pv.up : 'Upvote'}</span>
                </button>
                <button
                  onClick={(e) => handlePostVote(post.id, 'down', e)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${postVotes[post.id] === 'down'
                      ? 'bg-red-100 text-red-600'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <ThumbsDown size={15} />
                  <span>{pv.down > 0 ? pv.down : 'Downvote'}</span>
                </button>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-400 ml-auto">
                  <MessageCircle size={15} />
                  <span>Comment</span>
                </div>
              </div>
            </article>
          );
        })}
        {filteredPosts.length === 0 && (
          <div className="text-center py-20 text-gray-400 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-4 animate-float">
              <Coins className="text-emerald-300" size={32} />
            </div>
            <p className="font-bold text-sm">No bounties found.</p>
            <p className="text-xs mt-1 text-gray-300">Be the first to create one!</p>
          </div>
        )}
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
