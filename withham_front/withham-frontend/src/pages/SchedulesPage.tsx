// 全ハムスターの予定一覧（API: /api/schedules/）

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const CATEGORY_LABEL: Record<string, string> = {
  HOSPITAL: '病院',
  CLEANING: '掃除',
  BIRTHDAY: '誕生日',
  OTHER: 'その他',
};

type ScheduleRow = {
  id: number;
  hamster: number;
  hamster_name: string;
  title: string;
  schedule_date: string;
  category: string;
  notes: string | null;
  created_at: string;
};

export function SchedulesPage() {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<ScheduleRow[]>('/api/schedules/');
        const sorted = [...data].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
        setItems(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, ScheduleRow[]>();
    for (const s of items) {
      const k = s.schedule_date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [items]);

  if (loading) {
    return <div className="text-center p-8 text-text-sub">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-main">スケジュール</h1>
      <p className="text-sm text-text-sub">登録した予定を日付順に表示します。追加は各ハムスター詳細のデータを拡張するか、今後のフォーム追加で対応予定です。</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-text-sub">
          予定がありません。
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([date, rows]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-semibold text-text-sub">{date}</h2>
              <ul className="space-y-2">
                {rows.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-text-main">{s.title}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-sub">
                        {CATEGORY_LABEL[s.category] ?? s.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      <Link
                        to={`/hamsters/${s.hamster}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {s.hamster_name}
                      </Link>
                    </p>
                    {s.notes && <p className="mt-2 text-sm text-text-sub">{s.notes}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
