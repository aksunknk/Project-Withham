// src/components/RightSidebar.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from './Icons';
import { getTrendingTags } from '../services/api';

interface Tag {
  id: number;
  name: string;
  usage_count: number;
}

export function RightSidebar() {
  const [query, setQuery] = useState('');
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrendingTags = async () => {
      try {
        const data = await getTrendingTags();
        setTrendingTags(data);
      } catch (error) {
        console.error('トレンドタグの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingTags();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleTagClick = (tagName: string) => {
    navigate(`/search?q=${encodeURIComponent(tagName)}`);
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
        
        {/* トレンドタグ表示 */}
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-text-sub text-sm font-semibold mb-3">トレンドタグ</h3>
            {loading ? (
                <p className="text-text-sub text-sm">読み込み中...</p>
            ) : trendingTags.length > 0 ? (
                <div className="space-y-2">
                    {trendingTags.slice(0, 5).map((tag) => (
                        <div 
                            key={tag.id}
                            onClick={() => handleTagClick(tag.name)}
                            className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        >
                            <p className="text-text-main text-sm font-medium">#{tag.name}</p>
                            <p className="text-text-sub text-xs">{tag.usage_count}件の投稿</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-text-sub text-sm">トレンドタグがありません</p>
            )}
        </div>
    </aside>
  );
}
