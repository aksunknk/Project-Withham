// src/components/QuestionForm.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Question } from '../types';

type Props = {
  onSuccess: (newQuestion: Question) => void;
  onCancel: () => void;
};

export function QuestionForm({ onSuccess, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setError('タイトルと本文の両方を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post<Question>('/api/questions/', { title, text });
      // 成功を親コンポーネントに通知
      onSuccess(response.data);
    } catch (err) {
      setError('質問の投稿に失敗しました。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-xl font-bold text-text-main mb-6">新しい質問を投稿する</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">タイトル</label>
                <input 
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
            </div>
            <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-700">質問の内容</label>
                <textarea
                    id="text"
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    placeholder="質問の背景や、具体的に困っていることを詳しく書きましょう。"
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-x-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                    キャンセル
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:bg-gray-400">
                    {isSubmitting ? '投稿中...' : '質問する'}
                </button>
            </div>
        </form>
    </div>
  );
}