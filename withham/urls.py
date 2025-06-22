# withham/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PostViewSet, 
    UserViewSet, 
    UserProfileUpdateView, 
    HamsterViewSet, 
    HealthLogViewSet,
    CommentViewSet,
    QuestionViewSet,
    AnswerViewSet,
    NotificationViewSet,
    UnreadNotificationCountView,
    BookmarkedPostsViewSet,
    TagViewSet,
    ScheduleViewSet,
    TrendingTagsView,
    UserRegistrationView,
    AccountActivationView,
)

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'users', UserViewSet, basename='user')
router.register(r'hamsters', HamsterViewSet, basename='hamster')
router.register(r'healthlogs', HealthLogViewSet, basename='healthlog')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answers', AnswerViewSet, basename='answer')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'bookmarks', BookmarkedPostsViewSet, basename='bookmark')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'schedules', ScheduleViewSet, basename='schedule')


urlpatterns = [
    # カスタム、非ルーターパス
    path('tags/trending/', TrendingTagsView.as_view(), name='trending-tags'),
    path('profile/', UserProfileUpdateView.as_view(), name='profile-detail-update'),
    path('notifications/unread_count/', UnreadNotificationCountView.as_view(), name='unread-notification-count'),
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('activate/<uidb64>/<token>/', AccountActivationView.as_view(), name='account_activation'),
    
    # ルーターが生成するパス
    path('', include(router.urls)),
]
