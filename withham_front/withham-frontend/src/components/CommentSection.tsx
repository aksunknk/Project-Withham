// src/components/CommentSection.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Comment } from '../types';
import { UserIcon, TrashIcon } from './Icons';

type Props = {
  postId: number;
  initialComments?: Comment[]; // オプショナルにする
};

export function CommentSection({ postId, initialComments = [] }: Props) { // ★ デフォルト値を設定
  const [comments, setComments] = useState<Comment[]>(initialComments.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post<Comment>('/api/comments/', { post: postId, text: newComment });
      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
    } catch (error) {
      alert("コメントの投稿に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (window.confirm("このコメントを削除しますか？")) {
        try {
            await api.delete(`/api/comments/${commentId}/`);
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            alert("コメントの削除に失敗しました。");
        }
    }
  };

  return (
    <div className="p-4 border-t border-gray-100">
      <h3 className="text-base font-semibold text-text-main mb-4">コメント ({comments.length})</h3>
      
      {/* コメント投稿フォーム */}
      <div id="comment-form" className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-surface flex-shrink-0">
          {/* ログインユーザーのアバター */}
        </div>
        <form onSubmit={handleSubmit} className="flex-grow flex items-center">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="コメントを追加..."
              rows={1}
              className="form-textarea w-full text-sm rounded-lg border-gray-200 focus:ring-primary focus:border-primary"
              required
            />
            <button type="submit" disabled={isSubmitting} className="ml-2 text-sm font-semibold text-primary hover:text-text-main flex-shrink-0">
              投稿
            </button>
        </form>
      </div>

      {/* コメント一覧 */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="flex items-start gap-3">
            <Link to={`/profile/${comment.author.id}`} className="flex-shrink-0">
              {comment.author.profile?.avatar ? (
                <img src={comment.author.profile.avatar} alt={comment.author.username} className="h-8 w-8 rounded-full object-cover"/>
              ) : (
                <div className="h-8 w-8 rounded-full bg-surface flex items-center justify-center"><UserIcon className="w-4 h-4 text-text-sub"/></div>
              )}
            </Link>
            <div className="flex-grow">
              <div className="flex items-baseline justify-between">
                <p className="text-sm">
                  <Link to={`/profile/${comment.author.id}`} className="font-medium text-text-main hover:underline">@{comment.author.username}</Link>
                  <span className="text-text-sub ml-2 text-xs">{new Date(comment.created_at).toLocaleString('ja-JP')}</span>
                </p>
                {currentUser?.id === comment.author.id && (
                    <button onClick={() => handleDeleteComment(comment.id)} title="削除"><TrashIcon className="w-4 h-4"/></button>
                )}
              </div>
              <p className="text-sm text-text-main mt-1">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}