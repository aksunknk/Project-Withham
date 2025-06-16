// src/components/CreatePostForm.tsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Post, Hamster } from '../types';
import { useAuth } from '../contexts/AuthContext'; // ★ useAuthをインポート

interface CreatePostFormProps {
  onPostCreated: (newPost: Post) => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const [text, setText] = useState('');
  const [myHamsters, setMyHamsters] = useState<Hamster[]>([]);
  const [selectedHamster, setSelectedHamster] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isAuthReady } = useAuth(); // ★ 認証準備完了フラグを取得

  useEffect(() => {
    // ★ 認証の準備ができていなければ処理を中断
    if (!isAuthReady) return;

    const fetchMyHamsters = async () => {
      try {
        const response = await api.get<Hamster[]>('/api/hamsters/');
        setMyHamsters(response.data);
      } catch (err) {
        console.error("Failed to fetch hamsters", err);
      }
    };
    fetchMyHamsters();
  }, [isAuthReady]); // ★ isAuthReadyに依存させる

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError('投稿内容を入力してください。'); return; }
    
    setIsSubmitting(true);
    setError(null);

    const postData: { text: string; hamster?: string } = { text };
    if (selectedHamster) {
        postData.hamster = selectedHamster;
    }

    try {
      const response = await api.post<Post>('/api/posts/', postData);
      onPostCreated(response.data);
      setText('');
      setSelectedHamster('');
    } catch (err) {
      setError('投稿に失敗しました。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 mb-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit}>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="いまどうしてる？"
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                disabled={isSubmitting}
            />
            <div className="mt-2 flex justify-between items-center">
                <select
                    value={selectedHamster}
                    onChange={(e) => setSelectedHamster(e.target.value)}
                    className="w-1/2 p-2 border border-gray-300 rounded-md text-sm text-text-main bg-gray-50 focus:ring-primary focus:border-primary"
                    disabled={isSubmitting || myHamsters.length === 0}
                >
                    <option value="">（個人として投稿）</option>
                    {myHamsters.map(h => (
                        <option key={h.id} value={h.id}>{h.name}として投稿</option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={isSubmitting || !text.trim()}
                    className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:bg-gray-400"
                >
                    {isSubmitting ? '投稿中...' : '投稿'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
    </div>
  );
}
