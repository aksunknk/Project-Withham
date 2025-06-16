// src/components/HamsterFormModal.tsx

import React, { useState } from 'react';
import api from '../services/api';
import type { Hamster } from '../types';

type Props = {
  hamster: Hamster | null; // nullの場合は新規作成モード
  onClose: () => void;
  onSave: (savedHamster: Hamster) => void;
};

export function HamsterFormModal({ hamster, onClose, onSave }: Props) {
  const [name, setName] = useState(hamster?.name || '');
  const [breed, setBreed] = useState(hamster?.breed || '');
  const [birthday, setBirthday] = useState(hamster?.birthday || '');
  const [gender, setGender] = useState(hamster?.gender || 'U');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const hamsterData = { name, breed, birthday, gender };
    
    try {
      let response;
      if (hamster) {
        // 編集モード (PUTリクエスト)
        response = await api.put<Hamster>(`/api/hamsters/${hamster.id}/`, hamsterData);
      } else {
        // 新規作成モード (POSTリクエスト)
        response = await api.post<Hamster>('/api/hamsters/', hamsterData);
      }
      onSave(response.data); // 親コンポーネントに保存結果を通知
      onClose();
    } catch (err) {
      setError('保存に失敗しました。入力内容を確認してください。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{hamster ? 'うちの子を編集' : '新しい子を登録'}</h2>
        <form onSubmit={handleSubmit}>
          {/* 名前入力フィールド */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">名前</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          {/* 種類入力フィールド */}
          <div className="mb-4">
            <label htmlFor="breed" className="block text-sm font-medium text-gray-700">種類</label>
            <input id="breed" type="text" value={breed} onChange={(e) => setBreed(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          {/* 誕生日入力フィールド */}
          <div className="mb-4">
            <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">誕生日</label>
            <input id="birthday" type="date" value={birthday || ''} onChange={(e) => setBirthday(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          {/* 性別選択フィールド */}
           <div className="mb-4">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">性別</label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'U')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="U">不明</option>
                <option value="M">男の子</option>
                <option value="F">女の子</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end space-x-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
