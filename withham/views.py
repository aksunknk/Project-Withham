from rest_framework import viewsets, permissions, generics, serializers, filters, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count

# アプリケーションのモデルをすべてインポート
from .models import (
    Post, User, UserProfile, Hamster, HealthLog, Comment, Question, Answer,
    Notification, Tag, Schedule
)

# アプリケーションのシリアライザをすべてインポート
from .serializers import (
    PostSerializer, 
    UserDetailSerializer, 
    UserProfileUpdateSerializer,
    HamsterSerializer,
    HealthLogSerializer,
    HamsterDetailSerializer,
    PostDetailSerializer,
    CommentSerializer,
    UserRegistrationSerializer,
    UserListSerializer,
    QuestionSerializer,
    QuestionDetailSerializer,
    AnswerSerializer,
    NotificationSerializer,
    TagDetailSerializer,
    ScheduleSerializer
)
# カスタム権限をインポート
from .permissions import IsOwnerOrReadOnly, IsOwnerOfHamsterObject
class PostViewSet(viewsets.ModelViewSet):
    """
    投稿の表示、作成、更新、削除、いいねを行うためのAPIビュー
    """
    queryset = Post.objects.annotate(
        likes_count=Count('likes')
    ).select_related('author', 'hamster').prefetch_related('likes', 'comments__author')
    
    permission_classes = [IsOwnerOrReadOnly]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'author__username']
    ordering_fields = ['created_at', 'likes_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        hamster_id = self.request.data.get('hamster')
        hamster_instance = None
        if hamster_id:
            try:
                hamster_instance = Hamster.objects.get(id=hamster_id, owner=self.request.user)
            except Hamster.DoesNotExist:
                raise serializers.ValidationError("Invalid hamster selected.")
        serializer.save(author=self.request.user, hamster=hamster_instance)

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
                Notification.objects.create(
                    recipient=post.author,
                    actor=user,
                    verb=Notification.LIKE,
                    target=post
                )
        return Response({'liked': liked, 'likes_count': post.likes.count()})
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bookmark(self, request, pk=None):
        """投稿をブックマークまたはブックマーク解除する"""
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
    """
    ユーザー情報を表示・フォローするためのAPIビュー
    """
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
            return Response({'detail': 'You cannot follow yourself.'}, status=400)
        if target_user in current_user_profile.following.all():
            current_user_profile.following.remove(target_user)
            following = False
        else:
            current_user_profile.following.add(target_user)
            following = True
            Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                verb=Notification.FOLLOW
            )
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
    """
    健康記録を管理するためのAPIビュー
    """
    serializer_class = HealthLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HealthLog.objects.filter(hamster__owner=self.request.user)

    def perform_create(self, serializer):
        hamster = serializer.validated_data['hamster']
        if hamster.owner != self.request.user:
            raise serializers.ValidationError("You can only add logs to your own hamsters.")
        serializer.save(recorded_by=self.request.user)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsOwnerOrReadOnly]
    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        if comment.post.author != self.request.user:
            Notification.objects.create(
                recipient=comment.post.author,
                actor=self.request.user,
                verb=Notification.COMMENT,
                target=comment.post
            )

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

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

class BookmarkedPostsViewSet(viewsets.ReadOnlyModelViewSet):
    """ログインユーザーがブックマークした投稿の一覧を返す"""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ★★★ order_by句を修正 ★★★
        # ログインユーザーのプロフィールがブックマークした投稿を、投稿の作成日が新しい順で返す
        # (ブックマークした日時順でソートするには、より複雑なモデルの変更が必要です)
        return self.request.user.profile.bookmarked_posts.all().order_by('-created_at')
    
class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """
    タグ名でタグ情報を取得し、関連する投稿を返すビュー
    """
    queryset = Tag.objects.all().prefetch_related('posts__author__profile')
    serializer_class = TagDetailSerializer
    lookup_field = 'name' # IDの代わりにタグ名(`name`)で検索できるようにする

class ScheduleViewSet(viewsets.ModelViewSet):
    """今後の予定を管理するためのAPIビュー"""
    serializer_class = ScheduleSerializer
    permission_classes = [IsOwnerOfHamsterObject]

    def get_queryset(self):
        return Schedule.objects.filter(hamster__owner=self.request.user)
    
    def perform_create(self, serializer):
        hamster = serializer.validated_data['hamster']
        if hamster.owner != self.request.user:
            raise serializers.ValidationError("You can only add schedules to your own hamsters.")
        serializer.save()
