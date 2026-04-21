"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getBalance, toCNPY } from "./canopy";

interface AppContextType {
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  goHome: () => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  profilePhoto: string | null;
  setProfilePhoto: (photo: string | null) => void;
  twitterHandle: string;
  setTwitterHandle: (handle: string) => void;
  discordId: string;
  setDiscordId: (id: string) => void;
  balance: number;
  balanceLoading: boolean;
  refreshBalance: () => Promise<void>;
  totalEarned: number;
  addEarned: (amount: number) => void;
  // Wallet State
  address: string | null;
  setAddress: (addr: string | null) => void;
  privateKey: string | null;
  setPrivateKey: (pk: string | null) => void;
  isConnected: boolean;
  // Session State
  sessionPassword: string;
  setSessionPassword: (pw: string) => void;
  rememberPassword: boolean;
  setRememberPassword: (rem: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

// ── localStorage helpers ──

const STORAGE_KEY = 'sprout_app_state_v2';

interface UserProfile {
  displayName: string;
  profilePhoto: string | null;
  twitterHandle: string;
  discordId: string;
  totalEarned: number;
  privateKey: string | null;
}

interface AppState {
  address: string | null;
  profiles: Record<string, UserProfile>;
}

const DEFAULTS: UserProfile = {
  displayName: "Sprout User",
  profilePhoto: null,
  twitterHandle: "",
  discordId: "",
  totalEarned: 0,
  privateKey: null,
};

function loadPersistedState(): AppState {
  if (typeof window === 'undefined') return { address: null, profiles: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { address: null, profiles: {} };
  } catch {
    return { address: null, profiles: {} };
  }
}

function savePersistedState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedPostId, setSelectedPostIdRaw] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Hydrate persisted state
  const [hydrated, setHydrated] = useState(false);
  const [displayName, setDisplayName] = useState(DEFAULTS.displayName);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(DEFAULTS.profilePhoto);
  const [twitterHandle, setTwitterHandle] = useState(DEFAULTS.twitterHandle);
  const [discordId, setDiscordId] = useState(DEFAULTS.discordId);
  const [totalEarned, setTotalEarned] = useState(DEFAULTS.totalEarned);
  const [addressRaw, setAddressRaw] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(DEFAULTS.privateKey);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  
  const [sessionPassword, setSessionPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);

  const isConnected = !!addressRaw;
  const router = useRouter();

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = loadPersistedState();
    if (saved.address) {
      setAddressRaw(saved.address);
      const profile = saved.profiles[saved.address] || DEFAULTS;
      setDisplayName(profile.displayName);
      setProfilePhoto(profile.profilePhoto);
      setTwitterHandle(profile.twitterHandle);
      setDiscordId(profile.discordId);
      setTotalEarned(profile.totalEarned);
      setPrivateKey(profile.privateKey);
    }
    setHydrated(true);
  }, []);

  // Set address and sync profile state
  const setAddress = useCallback((newAddress: string | null) => {
    setAddressRaw(newAddress);
    if (newAddress) {
      const saved = loadPersistedState();
      const profile = saved.profiles[newAddress] || DEFAULTS;
      setDisplayName(profile.displayName);
      setProfilePhoto(profile.profilePhoto);
      setTwitterHandle(profile.twitterHandle);
      setDiscordId(profile.discordId);
      setTotalEarned(profile.totalEarned);
      setPrivateKey(profile.privateKey);
    } else {
      setDisplayName(DEFAULTS.displayName);
      setProfilePhoto(DEFAULTS.profilePhoto);
      setTwitterHandle(DEFAULTS.twitterHandle);
      setDiscordId(DEFAULTS.discordId);
      setTotalEarned(DEFAULTS.totalEarned);
      setPrivateKey(DEFAULTS.privateKey);
    }
  }, []);

  // Persist to localStorage whenever state changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const saved = loadPersistedState();
    const newProfiles = { ...saved.profiles };
    
    if (addressRaw) {
      newProfiles[addressRaw] = {
        displayName,
        profilePhoto,
        twitterHandle,
        discordId,
        totalEarned,
        privateKey,
      };
    }
    
    savePersistedState({
      address: addressRaw,
      profiles: newProfiles,
    });
  }, [hydrated, displayName, profilePhoto, twitterHandle, discordId, totalEarned, addressRaw, privateKey]);

  const refreshBalance = useCallback(async () => {
    if (!addressRaw) return;
    try {
      setBalanceLoading(true);
      const ucnpy = await getBalance(addressRaw);
      setBalance(toCNPY(ucnpy));
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    } finally {
      setBalanceLoading(false);
    }
  }, [addressRaw]);

  // Poll balance
  useEffect(() => {
    if (!isConnected) return;
    refreshBalance();
    const interval = setInterval(refreshBalance, 10000); // 10s
    return () => clearInterval(interval);
  }, [isConnected, refreshBalance]);

  const addEarned = useCallback((amount: number) => {
    setTotalEarned(prev => prev + amount);
  }, []);

  const setSelectedPostId = useCallback((id: string | null) => {
    setSelectedPostIdRaw(id);

    if (id) {
      window.history.pushState({ postId: id }, "", `?post=${id}`);
    } else {
      window.history.pushState({ postId: null }, "", "/");
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const postId = event.state?.postId ?? null;
      setSelectedPostIdRaw(postId);
      if (!postId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goHome = useCallback(() => {
    setSelectedPostIdRaw(null);
    setSearchQuery("");
    router.push("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  return (
    <AppContext.Provider value={{
      selectedPostId, setSelectedPostId, searchQuery, setSearchQuery, goHome,
      displayName, setDisplayName, profilePhoto, setProfilePhoto,
      twitterHandle, setTwitterHandle, discordId, setDiscordId,
      balance, balanceLoading, refreshBalance,
      totalEarned, addEarned,
      address: addressRaw, setAddress, privateKey, setPrivateKey, isConnected,
      sessionPassword, setSessionPassword, rememberPassword, setRememberPassword,
    }}>
      {children}
    </AppContext.Provider>
  );
}

