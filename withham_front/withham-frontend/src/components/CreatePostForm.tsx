// src/components/CreatePostForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { Post, Hamster } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostFormProps {
  onPostCreated: (newPost: Post) => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const [text, setText] = useState('');
  const [myHamsters, setMyHamsters] = useState<Hamster[]>([]);
  const [selectedHamster, setSelectedHamster] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isAuthReady } = useAuth();

  useEffect(() => {
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
  }, [isAuthReady]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('画像サイズは5MB以下にしてください。');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください。');
        return;
      }
      
      setSelectedImage(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError('投稿内容を入力してください。'); return; }
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setIsSuccess(false);

    const formData = new FormData();
    formData.append('text', text);
    if (selectedHamster) {
      formData.append('hamster', selectedHamster);
    }
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      const response = await api.post<Post>('/api/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      onPostCreated(response.data);
      
      setText('');
      setSelectedHamster('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsSuccess(true);
      setSuccessMessage('投稿が完了しました！');
      
      setTimeout(() => {
        setSuccessMessage(null);
        setIsSuccess(false);
      }, 3000);
    } catch (err: unknown) {
      console.error('投稿エラー:', err);
      let errorMessage = '投稿に失敗しました。';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string | string[] }, status?: number } };
        
        if (axiosError.response?.data?.error) {
          if (Array.isArray(axiosError.response.data.error)) {
            errorMessage = axiosError.response.data.error.join(', ');
          } else {
            errorMessage = axiosError.response.data.error;
          }
        } else if (axiosError.response?.status === 500) {
          errorMessage = 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
        } else if (axiosError.response?.status === 400) {
          errorMessage = '入力内容に問題があります。';
        }
      }
      
      setError(errorMessage);
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
            
            {imagePreview && (
              <div className="mt-2 relative">
                <img 
                  src={imagePreview} 
                  alt="プレビュー" 
                  className="max-w-full h-32 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
            
            <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-primary transition-colors"
                        disabled={isSubmitting}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={isSubmitting}
                    />
                    
                    <select
                        value={selectedHamster}
                        onChange={(e) => setSelectedHamster(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md text-sm text-text-main bg-gray-50 focus:ring-primary focus:border-primary"
                        disabled={isSubmitting || myHamsters.length === 0}
                    >
                        <option value="">（個人として投稿）</option>
                        {myHamsters.map(h => (
                            <option key={h.id} value={h.id}>{h.name}として投稿</option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !text.trim()}
                    className={`font-bold py-2 px-6 rounded-full transition-all duration-200 ${
                      isSuccess 
                        ? 'bg-green-500 text-white' 
                        : isSubmitting 
                        ? 'bg-gray-400 text-white' 
                        : 'bg-primary text-white hover:bg-primary-hover'
                    } disabled:bg-gray-400`}
                >
                    {isSuccess ? '✓ 投稿完了' : isSubmitting ? '投稿中...' : '投稿'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {successMessage && (
              <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm animate-pulse">
                {successMessage}
              </div>
            )}
        </form>
    </div>
  );
}
