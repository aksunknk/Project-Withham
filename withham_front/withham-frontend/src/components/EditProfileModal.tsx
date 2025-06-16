// src/components/EditProfileModal.tsx

import React, { useState } from 'react';
import api from '../services/api';
import type { UserDetail, UserProfile } from '../types';

type Props = {
  user: UserDetail;
  onClose: () => void;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
};

export function EditProfileModal({ user, onClose, onProfileUpdated }: Props) {
  const [bio, setBio] = useState(user.profile.bio || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('bio', bio);
    if (avatar) {
      formData.append('avatar', avatar);
    }

    try {
      const response = await api.patch<UserProfile>(`/api/profile/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onProfileUpdated(response.data);
      onClose();
    } catch (err) {
      setError('プロフィールの更新に失敗しました。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">プロフィールを編集</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">自己紹介</label>
            <textarea
              id="bio"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">プロフィール画像</label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setAvatar(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isSubmitting ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
