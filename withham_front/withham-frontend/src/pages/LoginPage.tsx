import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const promise = login(username, password);
      await toast.promise(promise, {
        loading: 'ログインしています...',
        success: 'ログインしました！',
        error: (err) => {
            if (axios.isAxiosError(err) && err.response) {
                return err.response.data.detail || 'ログインに失敗しました。';
            }
            return '予期せぬエラーが発生しました。';
        }
      });
      navigate('/', { replace: true });
    } catch (err) {
      // toast.promiseがエラーをハンドルするため、ここでは主にコンソール出力を維持
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        
        {/* ロゴセクション */}
        <div className="text-center mb-8">
            <Link to="/" className="inline-block">
                <h1 className="text-4xl font-bold text-text-main">withham</h1>
            </Link>
            <p className="text-text-sub mt-2">Welcome back!</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-main">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 bg-surface border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-main">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 bg-surface border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSubmitting ? '処理中...' : 'ログイン'}
            </button>
          </div>
        </form>

        {/* 新規登録へのリンク */}
        <p className="text-center text-text-sub text-sm mt-6">
            アカウントをお持ちでないですか？{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
                新規登録
            </Link>
        </p>
      </div>
    </div>
  );
}
