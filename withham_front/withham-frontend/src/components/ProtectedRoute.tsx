import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { token } = useAuth();

  // トークン（ログイン状態）がない場合は、ログインページにリダイレクト
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ログインしている場合は、子コンポーネント（Outlet）を表示
  return <Outlet />;
}