// Withham 2 向け UI アーカイブ用の最小シェル（本番アプリでは差し替え）
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';

function UiArchivePlaceholder() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-text-main">
      <p className="font-semibold">withham v1 UI アーカイブ</p>
      <p className="mt-2 text-sm text-text-sub">
        左ナビ・右サイドバー・テーマ（Tailwind）は <code className="text-primary">src/components</code> および{' '}
        <code className="text-primary">tailwind.config.js</code> を参照してください。
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<UiArchivePlaceholder />} />
            <Route path="*" element={<UiArchivePlaceholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
