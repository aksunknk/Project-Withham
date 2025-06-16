from django.urls import path, include
from rest_framework.routers import DefaultRouter
# アプリケーションのビューから、必要なビューセットをすべてインポートします
from .views import (
    PostViewSet, 
    UserViewSet, 
    UserProfileUpdateView, 
    HamsterViewSet, 
    HealthLogViewSet,
    CommentViewSet,
    UserRegistrationView,
    QuestionViewSet,
    AnswerViewSet,
)

# DefaultRouterのインスタンスを作成します
router = DefaultRouter()

# 各モデルに対応するビューセットをルーターに登録します
# これにより、CRUD（作成、読み取り、更新、削除）のエンドポイントが自動的に生成されます
router.register(r'posts', PostViewSet, basename='post')
router.register(r'users', UserViewSet, basename='user')
router.register(r'hamsters', HamsterViewSet, basename='hamster')
router.register(r'healthlogs', HealthLogViewSet, basename='healthlog')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answers', AnswerViewSet, basename='answer')


# URLパターンのリストを定義します
urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    
    
    # /api/profile/ というパスで、プロフィール更新用のビューに接続します
    path('profile/', UserProfileUpdateView.as_view(), name='profile-detail-update'),
    
    # routerに登録されたすべてのURL（/posts, /users, /hamstersなど）をインクルードします
    path('', include(router.urls)),
]
