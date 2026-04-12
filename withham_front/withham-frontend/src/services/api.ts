// src/services/api.ts

import axios from 'axios';

/** Vite: .env に VITE_API_BASE_URL を定義（末尾スラッシュ不要） */
const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
export const API_BASE_URL = rawBase.replace(/\/$/, '') || 'http://127.0.0.1:8000';

/** メディアパスが絶対URLのときはそのまま、相対のときは API オリジンを付与 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (path == null || path === '') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

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
