// src/pages/QuestionListPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Question } from '../types';

export function QuestionListPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) return;
    api.get<Question[]>('/api/questions/')
      .then(res => setQuestions(res.data))
      .catch(err => console.error("Failed to fetch questions", err))
      .finally(() => setLoading(false));
  }, [isAuthReady]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main">Q&A</h1>
        {/* ↓↓↓ Linkコンポーネントに変更 ↓↓↓ */}
        <Link 
          to="/questions/new"
          className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full"
        >
          質問する
        </Link>
      </div>

      {loading ? (
        <p className="text-center p-8">読み込み中...</p>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <Link to={`/questions/${q.id}`} key={q.id} className="block bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-primary">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-text-main">{q.title}</h2>
                {q.is_resolved && <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-1 rounded-full">解決済み</span>}
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-text-sub">
                <span>by @{q.user.username}</span>
                <span>{q.answers_count}件の回答</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}