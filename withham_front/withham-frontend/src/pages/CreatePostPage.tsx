// 投稿専用ページ（ホームと同じフォームを利用）

import { useNavigate } from 'react-router-dom';
import { CreatePostForm } from '../components/CreatePostForm';
import type { Post } from '../types';

export function CreatePostPage() {
  const navigate = useNavigate();

  const handleCreated = (_newPost: Post) => {
    navigate('/');
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-text-main">新規投稿</h1>
      <CreatePostForm onPostCreated={handleCreated} />
    </div>
  );
}
