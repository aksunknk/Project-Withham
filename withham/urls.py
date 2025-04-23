# withham/urls.py を編集

from django.urls import path
from django.contrib.auth import views as auth_views
from . import views # views.py をインポート

app_name = 'withham'

urlpatterns = [
    # 空のパス '' に index ビューを割り当てる
    path('', views.index, name='index'), # ★ この行を追加

    # ログイン/ログアウト
    path('login/', auth_views.LoginView.as_view(template_name='withham/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='withham:index'), name='logout'), # ★ ログアウトURLを追加 (next_pageでログアウト後の移動先を指定)

    # --- 他のURLパターン (今後追加) ---
    path('post/new/', views.post_create, name='post_create'),
    path('hamsters/new/', views.hamster_create, name='hamster_create'),
   # ★ プロフィール詳細ページのURLパターンを追加 (<int:pk> で整数値をpkとして受け取る)
    path('users/<int:pk>/', views.profile_detail, name='profile_detail'), 
<<<<<<< HEAD
=======
      # ★ プロフィール編集ページのURLパターンを追加
    path('profile/edit/', views.profile_edit, name='profile_edit'),
    # withham/urls.py 内
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    # ★ いいね/いいね解除用のURLパターンを追加
    path('post/<int:post_id>/like/', views.toggle_like, name='toggle_like'),
     # ★ 健康記録登録ページのURLパターンを追加 (<int:hamster_pk> でハムスターIDを受け取る)
    path('hamsters/<int:hamster_pk>/log/new/', views.health_log_create, name='health_log_create'),
>>>>>>> b6e6bb3 (no message)
]