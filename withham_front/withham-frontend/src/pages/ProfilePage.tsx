// src/pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserDetail, UserProfile, Post } from '../types';
import { EditProfileModal } from '../components/EditProfileModal';
import { ProfileIcon } from '../components/Icons';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentUser, isAuthReady } = useAuth();
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !userId) return;
    
    setIsMyProfile(currentUser?.id === Number(userId));

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<UserDetail>(`/api/users/${userId}/`);
        setUser(response.data);
      } catch (err) {
        setError("ユーザー情報の取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, currentUser, isAuthReady]);

  const handleFollowToggle = async () => {
    if (!user) return;
    const originalUser = { ...user };
    const updatedUser = {
      ...user,
      is_following: !user.is_following,
      followers_count: user.is_following ? user.followers_count - 1 : user.followers_count + 1,
    };
    setUser(updatedUser);

    try {
      await api.post(`/api/users/${user.id}/follow/`);
    } catch (error) {
      console.error("フォロー状態の更新に失敗しました", error);
      setUser(originalUser); // エラー時はUIを元に戻す
    }
  };

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    if (user) {
        setUser({ ...user, profile: updatedProfile });
    }
  };

  if (loading || !isAuthReady) return <div className="text-center p-8">読み込み中...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!user) return <div className="text-center p-8">ユーザーが見つかりません。</div>;

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {/* プロフィールヘッダー */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {user.profile.avatar ? (
                  <img src={user.profile.avatar} alt={user.username} className="w-24 h-24 rounded-full object-cover border" />
              ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <ProfileIcon className="w-12 h-12 text-gray-400" />
                  </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-text-main">{user.username}</h2>
                <div className="flex space-x-4 text-sm text-text-sub mt-1">
                  <span><strong>{user.posts.length}</strong> posts</span>
                  <Link to={`/profile/${user.id}/followers`} className="hover:underline">
                    <span><strong>{user.followers_count}</strong> followers</span>
                  </Link>
                  <Link to={`/profile/${user.id}/following`} className="hover:underline">
                    <span><strong>{user.following_count}</strong> following</span>
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              {isMyProfile ? (
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                  プロフィールを編集
                </button>
              ) : (
                <button onClick={handleFollowToggle} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${user.is_following ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-primary text-white hover:bg-primary-hover'}`}>
                  {user.is_following ? 'フォロー中' : 'フォロー'}
                </button>
              )}
            </div>
          </div>
          <p className="text-text-main mt-4 whitespace-pre-wrap">{user.profile.bio || '自己紹介がありません。'}</p>
        </div>
        
        {/* 投稿一覧 */}
        <h3 className="text-lg font-bold mb-4 text-text-main">投稿一覧</h3>
        <div className="space-y-4">
          {user.posts.length > 0 ? (
              user.posts.map(post => (
                  <div key={post.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <Link to={`/posts/${post.id}`} className="block">
                      <p className="text-text-main">{post.text}</p>
                      <div className="text-right text-xs text-text-sub mt-2">
                          {new Date(post.created_at).toLocaleString('ja-JP')}
                      </div>
                    </Link>
                  </div>
              ))
          ) : (
              <p className="text-text-sub">このユーザーの投稿はまだありません。</p>
          )}
        </div>
      </div>
      
      {/* 編集モーダル */}
      {isMyProfile && isModalOpen && user && (
        <EditProfileModal
          user={user}
          onClose={() => setIsModalOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </>
  );
}
