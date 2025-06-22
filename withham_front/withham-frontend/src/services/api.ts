// src/services/api.ts

import axios from 'axios';

// APIのベースURLをエクスポート
export const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: API_BASE_URL });

// リクエストインターセプター: 認証トークンを自動的に追加
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター: トークン期限切れの処理
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // トークンが期限切れの場合、ローカルストレージをクリア
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // ログインページにリダイレクト（必要に応じて）
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// トレンドタグを取得する関数
export const getTrendingTags = async () => {
  const response = await api.get('/api/tags/trending/');
  return response.data;
};

export default api;
