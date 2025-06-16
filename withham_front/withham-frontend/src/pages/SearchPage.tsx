// src/pages/SearchPage.tsx

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { Post } from '../types';
import { PostsList } from '../components/PostsList';
import { useAuth } from '../contexts/AuthContext';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (query) {
      setLoading(true);
      api.get<Post[]>(`/api/posts/?search=${query}`)
        .then(response => {
          setPosts(response.data);
        })
        .catch(error => console.error("Search failed", error))
        .finally(() => setLoading(false));
    } else {
      setPosts([]);
      setLoading(false);
    }
  }, [query, isAuthReady]);

  return (
    <div className="w-full max-w-xl mx-auto">
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
            <h1 className="text-xl font-bold">Search Results</h1>
            {query && <p className="text-text-sub">for: "{query}"</p>}
        </div>
        
        {loading ? (
            <p className="text-center p-8">Searching...</p>
        ) : (
            <PostsList posts={posts} setPosts={setPosts} />
        )}
    </div>
  );
}
