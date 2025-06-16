// src/components/AddHealthLogForm.tsx

import React, { useState } from 'react';
import api from '../services/api';
import type { HealthLog } from '../types';

type Props = {
  hamsterId: number;
  onLogAdded: (newLog: HealthLog) => void;
};

export function AddHealthLogForm({ hamsterId, onLogAdded }: Props) {
  // 今日の日付をYYYY-MM-DD形式で取得
  const today = new Date().toISOString().split('T')[0];

  const [log_date, setLogDate] = useState(today);
  const [weight_g, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!log_date) {
      setError('日付は必須です。');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const logData = {
      hamster: hamsterId,
      log_date,
      weight_g: weight_g || null, // 空の場合はnullを送る
      notes,
    };

    try {
      const response = await api.post<HealthLog>('/api/healthlogs/', logData);
      onLogAdded(response.data); // 親コンポーネントに新しいログを通知
      // フォームをリセット
      setWeight('');
      setNotes('');
    } catch (err) {
      setError('記録の追加に失敗しました。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-bold mb-3">新しい記録を追加</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="log_date" className="block text-sm font-medium text-gray-700">日付</label>
                <input id="log_date" type="date" value={log_date} onChange={(e) => setLogDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
            </div>
            <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">体重 (g)</label>
                <input id="weight" type="number" step="0.1" value={weight_g} onChange={(e) => setWeight(e.target.value)} placeholder="例: 95.5" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">メモ</label>
                <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="今日の様子など" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="text-right">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                    {isSubmitting ? '登録中...' : '記録する'}
                </button>
            </div>
        </form>
    </div>
  );
}
