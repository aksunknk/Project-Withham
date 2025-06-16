// src/pages/QuestionDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { QuestionDetail, Answer } from '../types';
import { UserIcon } from '../components/Icons';

export function QuestionDetailPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthReady } = useAuth();
  
  const [newAnswer, setNewAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !questionId) return;
    
    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const response = await api.get<QuestionDetail>(`/api/questions/${questionId}/`);
        setQuestion(response.data);
      } catch (err) {
        console.error("Failed to fetch question", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [isAuthReady, questionId]);
  
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim() || !question) return;

    setIsSubmitting(true);
    try {
        const response = await api.post<Answer>('/api/answers/', { question: question.id, text: newAnswer });
        setQuestion(prev => prev ? ({ ...prev, answers: [...prev.answers, response.data] }) : null);
        setNewAnswer('');
    } catch (err) {
        alert("回答の投稿に失敗しました。");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <p className="text-center p-8">読み込み中...</p>;
  if (!question) return <p className="text-center p-8">質問が見つかりません。</p>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {/* 質問セクション */}
        <div className="border-b pb-4">
            <h1 className="text-xl font-bold text-text-main">{question.title}</h1>
            <div className="flex items-center gap-2 text-sm text-text-sub mt-2">
                <Link to={`/profile/${question.user.id}`} className="font-semibold hover:underline">@{question.user.username}</Link>
                <span>- {new Date(question.created_at).toLocaleString('ja-JP')}</span>
            </div>
            <p className="mt-4 text-text-main whitespace-pre-wrap">{question.text}</p>
        </div>

        {/* 回答セクション */}
        <div className="mt-6">
            <h2 className="font-bold mb-4">{question.answers.length}件の回答</h2>
            {/* 回答一覧 */}
            <div className="space-y-4">
                {question.answers.map(answer => (
                    <div key={answer.id} className="flex items-start gap-3">
                        <Link to={`/profile/${answer.user.id}`}><UserIcon className="w-8 h-8 text-gray-400"/></Link>
                        <div className="bg-surface p-3 rounded-lg flex-1">
                            <p className="text-sm"><Link to={`/profile/${answer.user.id}`} className="font-semibold hover:underline">@{answer.user.username}</Link></p>
                            <p className="text-sm mt-1">{answer.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            {/* 回答フォーム */}
            <form onSubmit={handleAnswerSubmit} className="mt-6">
                <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={4}
                    placeholder="回答を投稿する..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                />
                <div className="text-right mt-2">
                    <button type="submit" disabled={isSubmitting} className="bg-primary text-white font-bold py-2 px-4 rounded-full">
                        {isSubmitting ? "投稿中..." : "回答する"}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}