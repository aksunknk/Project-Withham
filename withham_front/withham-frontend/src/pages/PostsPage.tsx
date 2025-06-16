// src/pages/PostsPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { Post } from '../types';
import { CreatePostForm } from '../components/CreatePostForm';
import { PostsList } from '../components/PostsList';

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthReady, logout } = useAuth();

  useEffect(() => {
    if (!isAuthReady) return;
    setLoading(true);
    api.get<Post[]>('/api/posts/')
      .then(response => setPosts(response.data))
      .catch(err => {
        setError('データの取得に失敗しました。');
        if (axios.isAxiosError(err) && err.response?.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [isAuthReady, logout]);

  const handlePostCreated = (newPost: Post) => {
    setPosts(currentPosts => [newPost, ...currentPosts]);
  };

  // ↓↓↓ 不要な flex, gap-4 を持つdivを削除
  return (
    <>
      <CreatePostForm onPostCreated={handlePostCreated} />
      {loading ? (
          <p className="text-center p-8">Loading posts...</p>
      ) : error ? (
          <p className="text-center p-8 text-red-500">{error}</p>
      ) : (
          <PostsList posts={posts} setPosts={setPosts} />
      )}
    </>
  );
}