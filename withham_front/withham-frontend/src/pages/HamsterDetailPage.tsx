// src/pages/HamsterDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { HamsterDetail, HealthLog } from '../types';
import { AddHealthLogForm } from '../components/AddHealthLogForm'; // フォームをインポート

// ゴミ箱アイコン
const TrashIcon = () => (
    <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

export function HamsterDetailPage() {
  const { hamsterId } = useParams<{ hamsterId: string }>();
  const [hamster, setHamster] = useState<HamsterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady || !hamsterId) return;
    
    const fetchHamsterDetail = async () => {
      setLoading(true);
      try {
        const response = await api.get<HamsterDetail>(`/api/hamsters/${hamsterId}/`);
        // 日付で降順にソートしてからStateにセット
        const sortedLogs = response.data.health_logs.sort((a, b) => b.log_date.localeCompare(a.log_date));
        setHamster({ ...response.data, health_logs: sortedLogs });
      } catch (error) { 
        console.error("ハムスター詳細の取得に失敗しました", error);
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchHamsterDetail();
  }, [isAuthReady, hamsterId]);

  // 新しい記録が追加されたときのハンドラ
  const handleLogAdded = (newLog: HealthLog) => {
    if (hamster) {
        // 新しい記録を既存のリストに追加し、日付で再度ソート
        const updatedLogs = [...hamster.health_logs, newLog].sort((a, b) => b.log_date.localeCompare(a.log_date));
        setHamster({ ...hamster, health_logs: updatedLogs });
    }
  };

  // 記録を削除するハンドラ
  const handleDeleteLog = async (logId: number) => {
    if (window.confirm("この記録を本当に削除しますか？") && hamster) {
        try {
            await api.delete(`/api/healthlogs/${logId}/`);
            const updatedLogs = hamster.health_logs.filter(log => log.id !== logId);
            setHamster({ ...hamster, health_logs: updatedLogs });
        } catch (error) {
            alert('記録の削除に失敗しました。');
        }
    }
  };

  if (loading) return <div className="text-center p-8">読み込み中...</div>;
  if (!hamster) return <div className="text-center p-8">ハムスターが見つかりません。</div>;

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-md">
        <nav className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <Link to="/my-hamsters" className="text-sm text-blue-500 hover:underline">← うちの子管理へ</Link>
          <h1 className="text-xl font-bold">{hamster.name}のページ</h1>
          <div></div>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* プロフィールセクション */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-2">プロフィール</h2>
            {hamster.profile_image && (
                <img src={`${API_BASE_URL}${hamster.profile_image}`} alt={hamster.name} className="w-full h-auto rounded-lg mb-4 object-cover" />
            )}
            <p><strong>種類:</strong> {hamster.breed || '未設定'}</p>
            <p><strong>誕生日:</strong> {hamster.birthday || '未設定'}</p>
            <p className="mt-2 text-sm text-gray-600">{hamster.profile_text || 'プロフィール未設定'}</p>
        </div>

        {/* 健康記録セクション */}
        <div className="md:col-span-2 space-y-6">
            <AddHealthLogForm hamsterId={hamster.id} onLogAdded={handleLogAdded} />
            
            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-2">健康記録の一覧</h2>
                {hamster.health_logs.length > 0 ? (
                    <ul className="space-y-2">
                        {hamster.health_logs.map(log => (
                            <li key={log.id} className="border-b py-2 flex justify-between items-center">
                                <div>
                                    <span className="font-mono">{log.log_date}: </span>
                                    {log.weight_g && <strong className="ml-2">{log.weight_g}g</strong>}
                                    <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                                </div>
                                <button onClick={() => handleDeleteLog(log.id)} title="記録を削除">
                                    <TrashIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">まだ記録がありません。</p>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}
