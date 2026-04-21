"use client";

import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const MIN_SCALE = 0.1;  // 10%
const MAX_SCALE = 5;     // 500%
const ZOOM_STEP = 0.1;   // 10% per click
const WHEEL_STEP = 0.08; // smooth wheel zoom

export default function ImageLightbox({ src, alt = "Image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const clampScale = (val: number) => Math.round(Math.max(MIN_SCALE, Math.min(MAX_SCALE, val)) * 100) / 100;

  const handleZoomIn = () => setScale(prev => clampScale(prev + ZOOM_STEP));
  const handleZoomOut = () => {
    setScale(prev => {
      const ns = clampScale(prev - ZOOM_STEP);
      if (ns <= 1) setPosition({ x: 0, y: 0 });
      return ns;
    });
  };
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Scroll wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -WHEEL_STEP : WHEEL_STEP;
    setScale(prev => {
      const ns = clampScale(prev + delta);
      if (ns <= 1) setPosition({ x: 0, y: 0 });
      return ns;
    });
  }, []);

  useEffect(() => {
    const el = document.getElementById("lightbox-img-wrap");
    if (el) el.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", handleWheel); };
  }, [handleWheel]);

  // Drag to pan (only when zoomed above 100%)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Fixed X button — always top-right, never moves */}
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-[210] p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={22} />
      </button>

      {/* Fixed zoom controls — bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
        <button onClick={handleZoomOut} className="text-white/80 hover:text-white transition-colors" title="Zoom out 10%"><ZoomOut size={18} /></button>
        <span className="text-white/60 text-xs font-bold min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="text-white/80 hover:text-white transition-colors" title="Zoom in 10%"><ZoomIn size={18} /></button>
        {scale !== 1 && (
          <button onClick={handleReset} className="text-white/60 hover:text-white transition-colors ml-1" title="Reset zoom">
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {/* Image container — draggable when zoomed above 100% */}
      <div
        id="lightbox-img-wrap"
        className="relative flex items-center justify-center select-none overflow-visible"
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (isDragging) return;
          e.stopPropagation();
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="rounded-lg shadow-2xl transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            maxWidth: "85vw",
            maxHeight: "85vh",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
