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
  const { isAuthReady, logout, token, currentUser } = useAuth();

  console.log('=== PostsPage rendering ===');
  console.log('isAuthReady:', isAuthReady);
  console.log('token:', token ? 'exists' : 'null');
  console.log('currentUser:', currentUser);

  useEffect(() => {
    console.log('=== PostsPage useEffect ===');
    console.log('isAuthReady:', isAuthReady);
    if (!isAuthReady) {
      console.log('Auth not ready, returning');
      return;
    }
    console.log('Fetching posts...');
    setLoading(true);
    api.get<Post[]>('/api/posts/')
      .then(response => {
        console.log('Posts fetched successfully:', response.data.length);
        setPosts(response.data);
      })
      .catch(err => {
        console.error('Failed to fetch posts:', err);
        setError('データの取得に失敗しました。');
        if (axios.isAxiosError(err) && err.response?.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [isAuthReady, logout]);

  const handlePostCreated = (newPost: Post) => {
    console.log('PostsPage: handlePostCreated called with:', newPost);
    setPosts(currentPosts => {
      const updatedPosts = [newPost, ...currentPosts];
      console.log('PostsPage: Updated posts array length:', updatedPosts.length);
      return updatedPosts;
    });
  };

  // ↓↓↓ 不要な flex, gap-4 を持つdivを削除
  return (
    <>
      <div className="mb-4 p-2 bg-blue-100 border border-blue-400 rounded">
        <p className="text-xs text-blue-800">
          Debug: PostsPage rendered, isAuthReady={isAuthReady.toString()}, 
          token={token ? 'exists' : 'null'}, 
          currentUser={currentUser?.username || 'null'}
        </p>
      </div>
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