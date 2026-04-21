"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import PostStack from '@/components/PostStack';
import MainFeed from '@/components/MainFeed';
import Leaderboard from '@/components/Leaderboard';
import SearchBar from '@/components/SearchBar';
import { useAppContext } from '@/lib/AppContext';

const throttle = (func: (e: MouseEvent) => void, limit: number) => {
  let inThrottle = false;
  return (e: MouseEvent) => {
    if (!inThrottle) {
      func(e);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export default function Home() {
  const { selectedPostId, setSelectedPostId, searchQuery, setSearchQuery } = useAppContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<'left' | 'middle' | 'right' | null>(null);

  const handleMouseMove = useMemo(
    () => throttle((e: MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const leftWidth = 288; // w-72
    const rightWidth = 320; // w-80
    const totalWidth = rect.width;

    let newSection: 'left' | 'middle' | 'right' | null = null;
    if (x < leftWidth) newSection = 'left';
    else if (x < totalWidth - rightWidth) newSection = 'middle';
    else newSection = 'right';

    setActiveSection(newSection);
  }, 16), []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!activeSection || !containerRef.current) return;

    const delta = e.deltaY * 0.8;

    if (activeSection === 'left' && leftRef.current) {
      leftRef.current.scrollTop += delta;
    } else if (activeSection === 'middle' && middleRef.current) {
      middleRef.current.scrollTop += delta;
    }
  }, [activeSection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove, handleWheel]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="shrink-0">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div
        ref={containerRef}
        className="section-container flex justify-center gap-6 xl:gap-8 items-start flex-1 min-h-0 lg:h-[calc(100vh-14rem)] overflow-hidden"
      >
        <div ref={leftRef} className="left-section w-72 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-14rem)] hidden lg:block">
          <PostStack onSelectPost={setSelectedPostId} selectedPostId={selectedPostId} />
        </div>

        <div ref={middleRef} className="middle-section flex-1 max-w-2xl max-h-[calc(100vh-14rem)] overflow-y-auto">
          <MainFeed
            selectedPostId={selectedPostId}
            onSelectPost={setSelectedPostId}
            searchQuery={searchQuery}
          />
        </div>

        <div ref={rightRef} className="right-section w-64 flex-shrink-0 overflow-hidden max-h-[calc(100vh-14rem)] hidden xl:block">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

