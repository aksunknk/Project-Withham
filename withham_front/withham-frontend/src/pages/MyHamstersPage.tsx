import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Hamster } from '../types';
import { HamsterFormModal } from '../components/HamsterFormModal';

export function MyHamstersPage() {
  const [hamsters, setHamsters] = useState<Hamster[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthReady } = useAuth();
  
  // モーダルの状態管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHamster, setEditingHamster] = useState<Hamster | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;
    
    const fetchHamsters = async () => {
      try {
        const response = await api.get<Hamster[]>('/api/hamsters/');
        setHamsters(response.data);
      } catch (error) { 
        console.error("ハムスター情報の取得に失敗しました", error);
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchHamsters();
  }, [isAuthReady]);

  const handleOpenModal = (hamster: Hamster | null) => {
    setEditingHamster(hamster);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingHamster(null);
    setIsModalOpen(false);
  };
  
  const handleSaveHamster = (savedHamster: Hamster) => {
    if (editingHamster) {
      // 編集の場合、リスト内の該当ハムスターを置き換える
      setHamsters(hamsters.map(h => h.id === savedHamster.id ? savedHamster : h));
    } else {
      // 新規作成の場合、リストの先頭に追加する
      setHamsters([savedHamster, ...hamsters]);
    }
  };

  const handleDeleteHamster = async (hamsterId: number) => {
    if (window.confirm("この子の情報を本当に削除しますか？")) {
        try {
            await api.delete(`/api/hamsters/${hamsterId}/`);
            setHamsters(hamsters.filter(h => h.id !== hamsterId));
        } catch (error) {
            alert("削除に失敗しました。");
        }
    }
  };

  if (loading) return <div className="text-center p-8">読み込み中...</div>;

  return (
    <>
      <div className="bg-gray-100 min-h-screen">
        <header className="bg-white shadow-md">
          <nav className="max-w-4xl mx-auto p-4 flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-gray-800 hover:text-blue-600">Withham SNS</Link>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">うちの子管理</h1>
            <button onClick={() => handleOpenModal(null)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              新しい子を登録
            </button>
          </div>
          
          {hamsters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hamsters.map(hamster => (
                <div key={hamster.id} className="bg-white p-4 rounded-lg shadow flex flex-col">
                  {/* ハムスター名などをクリックすると詳細ページに移動するリンク */}
                  <Link to={`/hamsters/${hamster.id}`} className="block flex-grow">
                    <h2 className="text-lg font-bold hover:text-blue-600">{hamster.name}</h2>
                    <p className="text-gray-600 text-sm">{hamster.breed || '種類未設定'}</p>
                    <p className="text-gray-600 text-sm">{hamster.birthday ? `${hamster.birthday}生まれ` : ''}</p>
                  </Link>
                  {/* 編集・削除ボタン */}
                  <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                    <button onClick={() => handleOpenModal(hamster)} className="text-sm text-blue-500 hover:underline">編集</button>
                    <button onClick={() => handleDeleteHamster(hamster.id)} className="text-sm text-red-500 hover:underline">削除</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center bg-white p-8 rounded-lg shadow">
              <p>まだハムスターが登録されていません。</p>
            </div>
          )}
        </main>
      </div>

      {/* モーダル表示のロジック */}
      {isModalOpen && (
        <HamsterFormModal 
          hamster={editingHamster} 
          onClose={handleCloseModal}
          onSave={handleSaveHamster}
        />
      )}
    </>
  );
}
