// src/components/RightSidebar.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from './Icons';

export function RightSidebar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <aside className="hidden md:block w-80 space-y-4">
        {/* 検索フォーム */}
        <div className="px-4 py-3">
            <form onSubmit={handleSearch}>
                <label className="flex flex-col min-w-40 h-12 w-full">
                    <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                        <div className="text-text-sub flex bg-surface items-center justify-center pl-4 rounded-l-xl">
                            <MagnifyingGlassIcon />
                        </div>
                        <input
                            placeholder="Search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-text-main focus:outline-0 focus:ring-0 border-none bg-surface h-full placeholder:text-text-sub px-2 text-base"
                        />
                    </div>
                </label>
            </form>
        </div>
        {/* トレンド表示（現在はプレースホルダー） */}
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-text-sub text-sm">Trending</p>
            <p className="text-text-main text-base font-bold">Cute Hamster</p>
            <p className="text-text-sub text-sm">@cutehamster</p>
        </div>
    </aside>
  );
}
