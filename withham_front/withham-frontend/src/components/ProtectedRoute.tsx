import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { token } = useAuth();
  
  console.log('=== ProtectedRoute rendering ===');
  console.log('token:', token ? 'exists' : 'null');

  // トークン（ログイン状態）がない場合は、ログインページにリダイレクト
  if (!token) {
    console.log('No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // ログインしている場合は、子コンポーネント（Outlet）を表示
  console.log('Token found, rendering protected content');
  return <Outlet />;
}