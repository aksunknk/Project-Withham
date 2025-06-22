# withham/views.py

from datetime import timedelta
from django.db.models import Count
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from rest_framework import viewsets, permissions, generics, serializers, filters, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response

# アプリケーションのモデルをすべてインポート
from .models import (
    Post, User, UserProfile, Hamster, HealthLog, Comment, Question, Answer,
    Notification, Tag, Schedule
)

# アプリケーションのシリアライザをすべてインポート
from .serializers import (
    PostSerializer, 
    PostDetailSerializer,
    PostCreateUpdateSerializer,
    UserDetailSerializer, 
    UserProfileUpdateSerializer,
    HamsterSerializer,
    HealthLogSerializer,
    HamsterDetailSerializer,
    CommentSerializer,
    UserRegistrationSerializer,
    UserListSerializer,
    QuestionSerializer,
    QuestionDetailSerializer,
    AnswerSerializer,
    NotificationSerializer,
    TagSerializer,
    TagDetailSerializer,
    ScheduleSerializer
)
# カスタム権限をインポート
from .permissions import IsOwnerOrReadOnly, IsOwnerOfHamsterObject

class PostViewSet(viewsets.ModelViewSet):
    """投稿の表示、作成、更新、削除、いいね、ブックマークを行うためのAPIビュー"""
    queryset = Post.objects.annotate(
        likes_count=Count('likes')
    ).select_related('author', 'hamster').prefetch_related('likes', 'comments__author')
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'author__username']
    ordering_fields = ['created_at', 'likes_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        elif self.action == 'retrieve':
            return PostDetailSerializer
        return PostSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hamster = serializer.validated_data.get('hamster')
        if hamster and hamster.owner != request.user:
             raise serializers.ValidationError("You can only post for your own hamsters.")
        post = serializer.save(author=request.user)
        read_serializer = PostDetailSerializer(post, context={'request': request})
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
            if post.author != user:
                Notification.objects.create(recipient=post.author, actor=user, verb=Notification.LIKE, target=post)
        return Response({'liked': liked, 'likes_count': post.likes.count()})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bookmark(self, request, pk=None):
        post = self.get_object()
        user_profile = request.user.profile
        if post in user_profile.bookmarked_posts.all():
            user_profile.bookmarked_posts.remove(post)
            bookmarked = False
        else:
            user_profile.bookmarked_posts.add(post)
            bookmarked = True
        return Response({'bookmarked': bookmarked})

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().prefetch_related('profile', 'posts', 'hamsters')
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_serializer_context(self):
        return {'request': self.request}

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        target_user = self.get_object()
        current_user_profile = request.user.profile
        if target_user == request.user:
            return Response({'detail': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        if target_user in current_user_profile.following.all():
            current_user_profile.following.remove(target_user)
            following = False
        else:
            current_user_profile.following.add(target_user)
            following = True
            Notification.objects.create(recipient=target_user, actor=request.user, verb=Notification.FOLLOW)
        return Response({'following': following, 'followers_count': target_user.followers.count()})

    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        user = self.get_object()
        follower_profiles = user.followers.all()
        followers = [profile.user for profile in follower_profiles]
        serializer = UserListSerializer(followers, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        user = self.get_object()
        following_users = user.profile.following.all()
        serializer = UserListSerializer(following_users, many=True, context={'request': request})
        return Response(serializer.data)

class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user.profile

class HamsterViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Hamster.objects.filter(owner=self.request.user).prefetch_related('health_logs', 'schedules')
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return HamsterDetailSerializer
        return HamsterSerializer

class HealthLogViewSet(viewsets.ModelViewSet):
    serializer_class = HealthLogSerializer
    permission_classes = [IsOwnerOfHamsterObject]
    def get_queryset(self):
        return HealthLog.objects.filter(hamster__owner=self.request.user)
    def perform_create(self, serializer):
        hamster = serializer.validated_data['hamster']
        if hamster.owner != self.request.user:
            raise serializers.ValidationError("You can only add logs to your own hamsters.")
        serializer.save()

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsOwnerOrReadOnly]
    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        if comment.post.author != self.request.user:
            Notification.objects.create(recipient=comment.post.author, actor=self.request.user, verb=Notification.COMMENT, target=comment.post)

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class AccountActivationView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if user is not None and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({'detail': 'アカウントの有効化が完了しました。ログインしてください。'}, status=status.HTTP_200_OK)
        else:
            return Response({'detail': 'アクティベーションリンクが無効です。'}, status=status.HTTP_400_BAD_REQUEST)

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all().select_related('user').prefetch_related('answers')
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'text', 'user__username']
    ordering = ['-created_at']
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuestionDetailSerializer
        return QuestionSerializer
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsOwnerOrReadOnly]
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return self.request.user.notifications.all().order_by('-timestamp')
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        updated_count = request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response(
            {'message': f'{updated_count} notifications marked as read.'}, 
            status=status.HTTP_200_OK
        )

class UnreadNotificationCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        unread_count = request.user.notifications.filter(is_read=False).count()
        return Response({'unread_count': unread_count})

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all().prefetch_related('posts__author__profile')
    serializer_class = TagDetailSerializer
    lookup_field = 'name'

class TrendingTagsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, format=None):
        last_week = timezone.now() - timedelta(days=7)
        trending_tags = Tag.objects.filter(posts__created_at__gte=last_week).annotate(post_count=Count('posts')).order_by('-post_count')[:5]
        serializer = TagSerializer(trending_tags, many=True)
        return Response(serializer.data)

class BookmarkedPostsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return self.request.user.profile.bookmarked_posts.all().order_by('-created_at')

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsOwnerOfHamsterObject]
    def get_queryset(self):
        return Schedule.objects.filter(hamster__owner=self.request.user)
    def perform_create(self, serializer):
        hamster = serializer.validated_data['hamster']
        if hamster.owner != self.request.user:
            raise serializers.ValidationError("You can only add schedules to your own hamsters.")
        serializer.save()
