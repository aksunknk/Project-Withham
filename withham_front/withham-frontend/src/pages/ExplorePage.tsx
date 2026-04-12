// トレンドタグと人気投稿（いいね数順）

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getTrendingTags } from '../services/api';
import type { Post } from '../types';
import { PostsList } from '../components/PostsList';
import { useAuth } from '../contexts/AuthContext';

type TrendTag = { id: number; name: string; usage_count?: number };

export function ExplorePage() {
  const { isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [tags, setTags] = useState<TrendTag[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      setLoadingTags(true);
      try {
        const data = await getTrendingTags();
        if (!cancelled) setTags(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingTags(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    setLoadingPosts(true);
    api
      .get<Post[]>('/api/posts/', { params: { ordering: '-likes_count' } })
      .then((res) => {
        if (!cancelled) setPosts(res.data);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-xl font-bold text-text-main">探索</h1>
        <p className="mb-4 text-sm text-text-sub">直近のトレンドタグと、いいねが多い投稿です。</p>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-sub">トレンドタグ</h2>
          {loadingTags ? (
            <p className="text-sm text-text-sub">読み込み中...</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-text-sub">まだトレンドがありません。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent('#' + t.name)}`)}
                  className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-text-main hover:bg-gray-200"
                >
                  #{t.name}
                  {typeof t.usage_count === 'number' && (
                    <span className="ml-1 text-xs text-text-sub">({t.usage_count})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-text-main">人気の投稿</h2>
        {loadingPosts ? (
          <p className="text-center p-8 text-text-sub">読み込み中...</p>
        ) : (
          <PostsList posts={posts} setPosts={setPosts} />
        )}
      </section>
    </div>
  );
}
