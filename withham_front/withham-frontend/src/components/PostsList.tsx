// src/components/PostsList.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types';
import { HeartIcon, TrashIcon, UserIcon, CommentIcon, EditIcon } from './Icons';

type PostsListProps = {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
};

export function PostsList({ posts, setPosts }: PostsListProps) {
  const { currentUser } = useAuth();
  
  const handleLikeToggle = async (postId: number) => {
    const originalPosts = [...posts];
    setPosts(currentPosts => currentPosts.map(p =>
      p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));
    try {
      type LikeResponse = { liked: boolean; likes_count: number; }
      const response = await api.post<LikeResponse>(`/api/posts/${postId}/like/`);
      setPosts(currentPosts => currentPosts.map(p =>
        p.id === postId ? { ...p, is_liked: response.data.liked, likes_count: response.data.likes_count } : p
      ));
    } catch (err) {
      console.error("いいねの更新に失敗しました", err);
      setPosts(originalPosts);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("この投稿を本当に削除しますか？")) return;
    try {
        await api.delete(`/api/posts/${postId}/`);
        setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
        console.error("投稿の削除に失敗しました:", error);
        alert("投稿の削除に失敗しました。");
    }
  };

  const handleEditPost = (postId: number) => {
    // 編集ページに遷移
    window.location.href = `/posts/${postId}/edit`;
  };

  if (posts.length === 0) {
    return <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">No posts found.</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.id} className={`rounded-xl shadow-sm border overflow-hidden ${
          post.hamster 
            ? 'bg-orange-50 border-orange-200' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4 p-4">
            {post.hamster ? (
              <Link to={`/hamsters/${post.hamster.id}`}>
                {post.hamster.profile_image ? (
                  <img src={post.hamster.profile_image} alt={post.hamster.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  </div>
                )}
              </Link>
            ) : (
              <Link to={`/profile/${post.author.id}`}>
                {post.author.profile?.avatar ? (
                  <img src={post.author.profile.avatar} alt={post.author.username} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-text-sub" />
                  </div>
                )}
              </Link>
            )}
            <div className="flex-1">
              {post.hamster ? (
                <div>
                  <Link to={`/hamsters/${post.hamster.id}`} className="text-text-main font-medium hover:underline">
                    {post.hamster.name}
                  </Link>
                  <span className="text-sm text-text-sub ml-2">
                    ({post.author.username})
                  </span>
                  <div className="mt-1">
                    <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      🐹 ハムスター投稿
                    </span>
                  </div>
                </div>
              ) : (
                <Link to={`/profile/${post.author.id}`} className="text-text-main font-medium hover:underline">
                  {post.author.username}
                </Link>
              )}
              <p className="text-text-sub text-xs">{new Date(post.created_at).toLocaleString('ja-JP')}</p>
            </div>
            {currentUser?.id === post.author.id && (
                <div className="flex items-center gap-1">
                    <button onClick={() => handleEditPost(post.id)} className="p-2 rounded-full hover:bg-surface" title="編集する">
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} className="p-2 rounded-full hover:bg-surface" title="削除する">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
          </div>

          {post.image && (
             <div className="w-full bg-surface">
                <img src={post.image} alt="投稿画像" className="w-full h-auto max-h-[70vh] object-contain"/>
             </div>
          )}

          <Link to={`/posts/${post.id}`} className="block">
            <div className="p-4">
               <p className="text-text-main whitespace-pre-wrap">{post.text}</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100">
            <Link to={`/posts/${post.id}`} className="flex items-center gap-2 text-text-sub hover:text-text-main">
                <CommentIcon className="w-5 h-5"/>
                <span className="text-sm font-semibold">{post.comments?.length || 0}</span>
            </Link>
            <button onClick={() => handleLikeToggle(post.id)} className="flex items-center gap-1.5 text-text-sub transition-colors">
                <HeartIcon filled={post.is_liked} />
                <span className={`text-sm font-semibold ${post.is_liked ? 'text-primary' : 'text-text-sub'}`}>{post.likes_count}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}