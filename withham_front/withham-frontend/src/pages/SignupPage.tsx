// src/pages/SignupPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

export function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      setError("パスワードが一致しません。");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/api/register/', {
        username,
        email,
        password,
        password2,
      });
      // 登録成功後、ログインページに移動
      alert("登録が完了しました。ログインしてください。");
      navigate('/login');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        // バックエンドからのバリデーションエラーを整形して表示
        const errorData = err.response.data;
        const errorMessages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
        setError(errorMessages.join('\n'));
      } else {
        setError("登録に失敗しました。時間をおいて再度お試しください。");
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">新規登録</h1>
        <form onSubmit={handleSubmit}>
          {/* 各入力フィールド */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">ユーザー名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3"/>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3"/>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">パスワード</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3"/>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">パスワード（確認用）</label>
            <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3"/>
          </div>
          
          {error && <pre className="text-red-500 text-xs italic mb-4 whitespace-pre-wrap">{error}</pre>}
          
          <div className="flex items-center justify-between mb-4">
            <button type="submit" disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
        <p className="text-center text-gray-500 text-xs">
          アカウントをお持ちですか？ <Link to="/login" className="text-blue-500 hover:text-blue-800">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
