// 全ハムスターの健康記録を一覧表示（API: /api/healthlogs/）

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { HealthLog } from '../types';

type HealthLogRow = HealthLog & {
  hamster: number;
  hamster_name: string;
};

export function HealthLogsPage() {
  const [logs, setLogs] = useState<HealthLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<HealthLogRow[]>('/api/healthlogs/');
        const sorted = [...data].sort((a, b) => b.log_date.localeCompare(a.log_date));
        setLogs(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-center p-8 text-text-sub">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-main">健康ログ</h1>
      <p className="text-sm text-text-sub">登録したハムスター別の記録です。詳細の追加・削除は各ハムスターページから行えます。</p>
      {logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-text-sub">
          記録がありません。{' '}
          <Link to="/my-hamsters" className="text-primary font-medium hover:underline">
            うちの子管理
          </Link>
          からハムスターを選んで記録を追加してください。
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <Link
                  to={`/hamsters/${log.hamster}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {log.hamster_name}
                </Link>
                <p className="mt-1 font-mono text-sm text-text-main">
                  {log.log_date}
                  {log.weight_g != null && log.weight_g !== '' && (
                    <span className="ml-2 font-sans font-bold">{log.weight_g}g</span>
                  )}
                </p>
                {log.notes && <p className="mt-1 text-sm text-text-sub">{log.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
