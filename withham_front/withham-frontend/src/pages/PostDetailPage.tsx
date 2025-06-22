// src/pages/PostDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types';
import { CommentSection } from '../components/CommentSection';
import { UserIcon, HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, TrashIcon } from '../components/Icons';

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isAuthReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthReady || !postId) return;
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<Post>(`/api/posts/${postId}/`);
        setPost(response.data);
      } catch {
        setError("投稿の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [isAuthReady, postId]);

  const handleLikeToggle = async () => {
    if (!post) return;
    const originalPost = { ...post };
    const updatedPost = {...post, is_liked: !post.is_liked, likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1};
    setPost(updatedPost);
    try {
      await api.post(`/api/posts/${post.id}/like/`);
    } catch (err) {
      console.error("いいねの更新に失敗しました", err);
      setPost(originalPost);
    }
  };
  
  const handleDeletePost = async () => {
    if (post && window.confirm("この投稿を本当に削除しますか？")) {
        try {
            await api.delete(`/api/posts/${post.id}/`);
            navigate('/');
        } catch {
            alert("投稿の削除に失敗しました。");
        }
    }
  };

  if (loading) return <div className="text-center p-8">読み込み中...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!post) return <div className="text-center p-8">投稿が見つかりません。</div>;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`rounded-xl shadow-sm overflow-hidden border ${
        post.hamster 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          {post.hamster ? (
            <Link to={`/hamsters/${post.hamster.id}`}>
              {post.hamster.profile_image ? (
                <img src={post.hamster.profile_image} alt={post.hamster.name} className="h-10 w-10 rounded-full object-cover"/>
              ) : (
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  {/* ここは空、またはテキストやデフォルト画像など */}
                </div>
              )}
            </Link>
          ) : (
            <Link to={`/profile/${post.author.id}`}>
              {post.author.profile?.avatar ? (
                <img src={post.author.profile.avatar} alt={post.author.username} className="h-10 w-10 rounded-full object-cover"/>
              ) : (
                <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-text-sub"/>
                </div>
              )}
            </Link>
          )}
          <div>
            {post.hamster ? (
              <div>
                <Link to={`/hamsters/${post.hamster.id}`} className="text-text-main text-sm font-semibold hover:underline">
                  {post.hamster.name}
                </Link>
                <span className="text-text-sub text-xs ml-2">
                  ({post.author.username})
                </span>
                <div className="mt-1">
                  <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    🐹 ハムスター投稿
                  </span>
                </div>
              </div>
            ) : (
              <Link to={`/profile/${post.author.id}`} className="text-text-main text-sm font-semibold hover:underline">@{post.author.username}</Link>
            )}
            <p className="text-text-sub text-xs">{new Date(post.created_at).toLocaleString('ja-JP')}</p>
          </div>
          {currentUser?.id === post.author.id && (
            <div className="ml-auto relative">
                <button onClick={handleDeletePost} className="p-2 rounded-full hover:bg-surface" title="削除">
                    <TrashIcon />
                </button>
            </div>
          )}
        </div>
        
        {post.text && <div className="p-4"><p className="text-text-main text-base leading-relaxed">{post.text}</p></div>}
        
        {post.image && <div><img src={post.image} className="w-full h-auto object-cover" alt="投稿画像" /></div>}
        
        <div className="p-4 flex items-center gap-x-6 gap-y-2 text-text-sub border-t border-gray-100 flex-wrap">
          <a href="#comment-form" className="flex items-center gap-1.5 hover:text-text-main">
            <CommentIcon /><span className="text-xs font-medium">{post.comments?.length || 0}</span><span className="hidden sm:inline text-xs font-medium ml-1">コメント</span>
          </a>
          <button onClick={handleLikeToggle} className={`flex items-center gap-1.5 ${post.is_liked ? 'text-primary' : 'hover:text-primary'}`}>
            <HeartIcon filled={post.is_liked} /><span className="text-xs font-medium">{post.likes_count}</span><span className="hidden sm:inline text-xs font-medium ml-1">いいね</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-text-main"><ShareIcon /><span className="text-xs font-medium">シェア</span></button>
          <button className="ml-auto hover:text-text-main"><BookmarkIcon /></button>
        </div>

        <CommentSection postId={post.id} initialComments={post.comments || []} />
      </div>
    </div>
  );
}