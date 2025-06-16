// src/pages/FollowListPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserListItem } from '../types';
import { ProfileIcon } from '../components/Icons';

export function FollowListPage() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const pageType = location.pathname.includes('/followers') ? 'followers' : 'following';
  
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageOwner, setPageOwner] = useState<string>('');
  const { isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady || !userId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // ユーザー名を取得するためにまずユーザー詳細を取得
        const userDetailRes = await api.get(`/api/users/${userId}/`);
        setPageOwner(userDetailRes.data.username);

        // フォロー/フォロワーリストを取得
        const listRes = await api.get<UserListItem[]>(`/api/users/${userId}/${pageType}/`);
        setUsers(listRes.data);
      } catch (err) {
        setError("リストの取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [userId, pageType, isAuthReady]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h1 className="text-lg font-bold mb-4">
          <Link to={`/profile/${userId}`} className="hover:underline">{pageOwner}</Link>
          's {pageType === 'followers' ? 'Followers' : 'Following'}
        </h1>

        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-500">{error}</div>}

        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between">
              <Link to={`/profile/${user.id}`} className="flex items-center gap-3">
                {user.profile.avatar ? (
                  <img src={user.profile.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <ProfileIcon className="w-5 h-5 text-gray-400"/>
                  </div>
                )}
                <span className="font-semibold hover:underline">{user.username}</span>
              </Link>
              {/* ここに将来的にフォロー/アンフォローボタンを設置可能 */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}