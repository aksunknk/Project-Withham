import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export function AccountActivationPage() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const activateAccount = async () => {
      try {
        await api.get(`/api/activate/${uidb64}/${token}/`);
        setStatus('success');
        setMessage('アカウントの有効化が完了しました。ログインしてください。');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch {
        setStatus('error');
        setMessage('アクティベーションリンクが無効です。');
      }
    };

    if (uidb64 && token) {
      activateAccount();
    }
  }, [uidb64, token, navigate]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">アカウント有効化</h1>
        
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">アカウントを有効化しています...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-green-600 mb-4">{message}</p>
            <p className="text-gray-500 text-sm">3秒後にログインページに移動します...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <p className="text-red-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              新規登録に戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 