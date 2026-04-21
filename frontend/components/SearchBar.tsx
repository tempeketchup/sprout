"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="relative group">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-sprout-primary transition-colors duration-300"
          size={20}
        />
        <input
          id="search-bar"
          type="text"
          placeholder="Search bounties, topics, or challenges..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-13 pr-12 py-3.5 glass-card rounded-2xl text-sm font-medium text-sprout-accent placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sprout-primary/30 focus:border-sprout-primary/30 transition-all duration-300"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
