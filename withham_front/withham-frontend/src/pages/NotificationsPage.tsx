// 通知一覧（既読は PATCH、一括既読は mark_all_as_read）

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { SimpleUser } from '../types';

type NotificationRow = {
  id: number;
  actor: SimpleUser;
  verb: 'L' | 'C' | 'F';
  target: number | null;
  target_post_text: string;
  is_read: boolean;
  timestamp: string;
};

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NotificationRow[]>('/api/notifications/');
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/`, { is_read: true });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/mark_all_as_read/');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-text-sub">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-text-main">通知</h1>
        {items.some((n) => !n.is_read) && (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-text-main hover:bg-gray-200"
          >
            すべて既読
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-text-sub">通知はありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
                !n.is_read ? 'border-primary/40 bg-amber-50/50' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm text-text-main">
                  <Link to={`/profile/${n.actor.id}`} className="font-semibold hover:underline">
                    {n.actor.username}
                  </Link>
                  {n.verb === 'F' && 'さんがあなたをフォローしました'}
                  {n.verb === 'L' && n.target != null && 'さんがあなたの投稿にいいねしました'}
                  {n.verb === 'C' && n.target != null && 'さんがあなたの投稿にコメントしました'}
                </p>
                {n.target != null && (
                  <Link
                    to={`/posts/${n.target}`}
                    className="mt-1 inline-block text-sm text-primary hover:underline"
                  >
                    投稿を見る
                  </Link>
                )}
                {n.target_post_text && n.verb !== 'F' && (
                  <span className="mt-1 block text-text-sub line-clamp-2 text-xs">
                    「{n.target_post_text.slice(0, 120)}
                    {n.target_post_text.length > 120 ? '…' : ''}」
                  </span>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    既読
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-text-sub">{new Date(n.timestamp).toLocaleString('ja-JP')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
