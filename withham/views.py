from rest_framework import viewsets, permissions, generics, serializers, filters
from rest_framework.decorators import action
from rest_framework.response import Response

# アプリケーションのモデルをすべてインポート
from .models import Post, User, UserProfile, Hamster, HealthLog, Comment, Question, Answer

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
    AnswerSerializer,
    QuestionSerializer,
    QuestionDetailSerializer,
)
# カスタム権限をインポート
from .permissions import IsOwnerOrReadOnly

class PostViewSet(viewsets.ModelViewSet):
    """
    投稿の表示、作成、更新、削除、いいねを行うためのAPIビュー
    """
    queryset = Post.objects.all().select_related('author', 'hamster').prefetch_related('likes', 'comments__author')
    permission_classes = [IsOwnerOrReadOnly]
    serializer_class = PostSerializer # 常にPostSerializerを使用するように戻す
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'author__username'] # '本文'と'投稿者のユーザー名'を検索対象に
    ordering_fields = ['created_at', 'likes_count'] # 作成日といいね数でソート可能に
    ordering = ['-created_at'] # デフォルトは新しい順

    def get_serializer_class(self):
        if self.action == 'retrieve': # retrieveアクション（詳細表示）の場合
            return PostDetailSerializer
        return PostSerializer # それ以外（一覧表示など）は通常のPostSerializer

    def get_serializer_context(self):
        # シリアライザにリクエストオブジェクトを渡す
        return {'request': self.request}

    def perform_create(self, serializer):
        # 投稿作成時に、リクエストユーザーを投稿者として自動設定する
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
        # 投稿にいいねを追加、または削除する
        post = self.get_object()
        user = request.user
        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
        return Response({'liked': liked, 'likes_count': post.likes.count()})

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ユーザー情報を表示するためのAPIビュー
    """
    queryset = User.objects.all().prefetch_related('profile', 'posts')
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request}
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        """ユーザーをフォローまたはアンフォローする"""
        target_user = self.get_object()
        current_user_profile = request.user.profile

        if target_user == request.user:
            return Response({'detail': 'You cannot follow yourself.'}, status=400)

        if target_user in current_user_profile.following.all():
            # 既にフォローしていたら、フォローを解除
            current_user_profile.following.remove(target_user)
            following = False
        else:
            # まだフォローしていなければ、フォローする
            current_user_profile.following.add(target_user)
            following = True
        
        return Response({'following': following, 'followers_count': target_user.followers.count()})
    # ↓↓↓ 'followers' アクションを新規追加 ↓↓↓
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """特定のユーザーのフォロワー一覧を返す"""
        user = self.get_object()
        # user.followers は UserProfileモデルのrelated_name
        # user.followers.all() で UserProfileのクエリセットが返る
        # .values_list('user', flat=True) でフォローしているユーザーのIDリストを取得
        follower_profiles = user.followers.all()
        followers = [profile.user for profile in follower_profiles]
        serializer = UserListSerializer(followers, many=True, context={'request': request})
        return Response(serializer.data)

    # ↓↓↓ 'following' アクションを新規追加 ↓↓↓
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """特定のユーザーがフォローしている一覧を返す"""
        user = self.get_object()
        following_users = user.profile.following.all()
        serializer = UserListSerializer(following_users, many=True, context={'request': request})
        return Response(serializer.data)
class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    """
    ログイン中のユーザーのプロフィールを取得・更新するためのビュー
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user.profile

class HamsterViewSet(viewsets.ModelViewSet):
    """
    ユーザーのハムスター情報を管理するためのAPIビュー
    """
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Hamster.objects.filter(owner=self.request.user)
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
        serializer.save()

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    # ↓↓↓ permission_classesを更新 ↓↓↓
    permission_classes = [IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class QuestionViewSet(viewsets.ModelViewSet):
    """質問の表示、作成、更新、削除を行うAPIビュー"""
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
    """回答の作成、更新、削除を行うAPIビュー"""
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        # 回答の作成者をリクエストユーザーに設定
        serializer.save(user=self.request.user)


class UserRegistrationView(generics.CreateAPIView):
    """
    新しいユーザーを作成するための公開APIビュー
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny] # ★ 誰でもアクセスできるように設定