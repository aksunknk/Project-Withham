// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AccountActivationPage } from './pages/AccountActivationPage';
import { PostsPage } from './pages/PostsPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyHamstersPage } from './pages/MyHamstersPage';
import { HamsterDetailPage } from './pages/HamsterDetailPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { Layout } from './components/Layout'; // Layoutをインポート
import { ProtectedRoute } from './components/ProtectedRoute';
import { FollowListPage } from './pages/FollowListPage';
import { SearchPage } from './pages/SearchPage';
import { QuestionListPage } from './pages/QuestionListPage';
import { QuestionDetailPage } from './pages/QuestionDetailPage';
import { QuestionFormPage } from './pages/QuestionFormPage';

function App() {
  console.log('=== App component rendering ===');
  
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 公開ルート */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/activate/:uidb64/:token" element={<AccountActivationPage />} />

          {/* 保護されたルート */}
          <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
              <Route path="/" element={<PostsPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/my-hamsters" element={<MyHamstersPage />} />
              <Route path="/hamsters/:hamsterId" element={<HamsterDetailPage />} />
              <Route path="/posts/:postId" element={<PostDetailPage />} />
              {/* 今後、ExploreやNotificationsなどのページをここに追加します */}
              <Route path="/explore" element={<div>Explore Page</div>} />
              <Route path="/notifications" element={<div>Notifications Page</div>} />
              <Route path="/create" element={<div>Create Page</div>} />
              <Route path="/profile/:userId/followers" element={<FollowListPage />} />
              <Route path="/profile/:userId/following" element={<FollowListPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/qa" element={<QuestionListPage />} />
              <Route path="/questions/:questionId" element={<QuestionDetailPage />} />
              <Route path="/questions/new" element={<QuestionFormPage />} />
            </Route>
          </Route>
          {/* 未定義のURLはルートにリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// GuestRouteコンポーネントを追加
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  console.log('=== GuestRoute rendering ===');
  console.log('token:', token ? 'exists' : 'null');
  
  if (token) {
    console.log('User is authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  console.log('User is not authenticated, showing login page');
  return <>{children}</>;
}

export default App;