# withham/urls.py を編集

from django.urls import path
# Django標準の認証ビューを auth_views としてインポート
from django.contrib.auth import views as auth_views
# アプリケーションのビューをインポート
# ↓↓↓ PostDeleteView もインポートされているか確認 ↓↓↓
from .views import HamsterDeleteView, PostDeleteView # クラスベースビューを個別にインポート
from . import views                 # viewsモジュール全体もインポート

# アプリケーションの名前空間を設定 (テンプレートの {% url %} タグで使用)
app_name = 'withham'

# 認証関連のURLパターン
auth_patterns = [
    path('login/', auth_views.LoginView.as_view(template_name='withham/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='withham:index'), name='logout'),
    path('signup/', views.signup, name='signup'),
]

# 投稿関連のURLパターン
post_patterns = [
    # path('', views.index, name='index'), # indexは独立させるか、ここに含めるか要検討 (プロジェクトurls.pyで''をincludeしているので、ここでは不要かも)
    path('post/new/', views.post_create, name='post_create'),
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    path('post/<int:post_id>/like/', views.toggle_like, name='toggle_like'),
    # ★★★ 投稿編集・削除をここに追加 ★★★
    path('post/<int:pk>/edit/', views.post_edit, name='post_edit'),
    path('post/<int:pk>/delete/', PostDeleteView.as_view(), name='post_delete'), # ★ クラスベースビューを使うように修正
]

# プロフィール関連のURLパターン
profile_patterns = [
    path('users/<int:pk>/', views.profile_detail, name='profile_detail'),
    path('profile/edit/', views.profile_edit, name='profile_edit'),
]

# ハムスター関連のURLパターン
hamster_patterns = [
    path('hamsters/new/', views.hamster_create, name='hamster_create'),
    path('hamsters/<int:pk>/edit/', views.hamster_edit, name='hamster_edit'),
    path('hamsters/<int:pk>/delete/', HamsterDeleteView.as_view(), name='hamster_delete'),
]

# 健康記録関連のURLパターン
health_log_patterns = [
    path('hamsters/<int:hamster_pk>/log/new/', views.health_log_create, name='health_log_create'),
    path('hamsters/<int:hamster_pk>/logs/', views.health_log_list, name='health_log_list'),
]

# フォロー関連のURLパターン
follow_patterns = [
    path('users/<int:user_pk>/follow/', views.toggle_follow, name='toggle_follow'),
    path('users/<int:pk>/following/', views.following_list, name='following_list'),
    path('users/<int:pk>/followers/', views.followers_list, name='followers_list'),
]

# 検索結果ページのURLパターン
search_patterns = [
    path('search/', views.search_results, name='search_results'),
]

# 通知関連のURLパターン
notification_patterns = [
    path('notifications/', views.notification_list, name='notification_list'),
]

# ハッシュタグ関連のURLパターン
hashtag_patterns = [
    path('tags/<str:tag_name>/', views.hashtag_search, name='hashtag_search'),
]

# すべてのURLパターンを結合 (トップページ '/' は独立させる)
urlpatterns = [
    path('', views.index, name='index'), # トップページ
] + auth_patterns + post_patterns + profile_patterns + hamster_patterns + health_log_patterns + follow_patterns + search_patterns + notification_patterns + hashtag_patterns
# post_edit_patterns は post_patterns に統合済み

