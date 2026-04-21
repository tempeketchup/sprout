import { useQuery } from '@tanstack/react-query';
import { Post, Reply, User } from '../types';
import { mockReplies, mockUsers } from '../constants';

export function useGetPosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      // The server API merges on-chain posts + server-side stored posts
      try {
        const res = await fetch('/api/posts');
        if (res.ok) {
          const posts: Post[] = await res.json();
          return posts;
        }
      } catch (e) {
        console.warn('Failed to fetch posts:', e);
      }
      return [];
    },
  });
}

export function useGetReplies(postId: string) {
  return useQuery({
    queryKey: ['replies', postId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/replies?postId=${encodeURIComponent(postId)}`);
        if (res.ok) {
          const replies: Reply[] = await res.json();
          return replies;
        }
      } catch (e) {
        console.warn('Failed to fetch replies:', e);
      }
      return [];
    },
    enabled: !!postId,
  });
}

export function useGetLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      return [...mockUsers].sort((a, b) => b.total_earned - a.total_earned);
    },
  });
}

export function useCreatePost() {
  return { createPost: (...args: any[]) => {}, isPending: false, isSuccess: false, error: null };
}

export function useCreateReply() {
  return { createReply: (...args: any[]) => {}, isPending: false, isSuccess: false, error: null };
}

export function useAcceptReply() {
  return { acceptReply: (...args: any[]) => {}, isPending: false, isSuccess: false, error: null };
}

export function useUpdateProfile() {
  return { updateProfile: (...args: any[]) => {}, isPending: false, isSuccess: false, error: null };
}

export function useGetProfile(address?: string) {
  return useQuery({
    queryKey: ['profile', address],
    queryFn: async () => {
      return mockUsers.find(u => u.wallet_address === address) || null;
    },
    enabled: !!address,
  });
}
