# withham/serializers.py

from rest_framework import serializers
from .models import (
    Post, User, UserProfile, Hamster, HealthLog, Comment, Question, Answer, 
    Notification, Tag, Schedule
)
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail


# --- ベースとなるヘルパーシリアライザ ---

class UserProfileForAuthorSerializer(serializers.ModelSerializer):
    """投稿者のプロフィール情報（アバターのみ）を返すためのシリアライザ"""
    avatar = serializers.SerializerMethodField()
    class Meta:
        model = UserProfile
        fields = ['avatar']

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and hasattr(obj.avatar, 'url'):
            return request.build_absolute_uri(obj.avatar.url)
        return None

class PostAuthorSerializer(serializers.ModelSerializer):
    """投稿者の情報（プロフィール付き）を返す"""
    profile = UserProfileForAuthorSerializer(read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'profile']

class HealthLogSerializer(serializers.ModelSerializer):
    """健康記録を扱うシリアライザ"""
    recorded_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    hamster = serializers.PrimaryKeyRelatedField(queryset=Hamster.objects.all(), write_only=True)
    class Meta:
        model = HealthLog
        fields = ['id', 'hamster', 'log_date', 'weight_g', 'notes', 'recorded_by', 'created_at']

class ScheduleSerializer(serializers.ModelSerializer):
    """今後の予定を扱うシリアライザ"""
    hamster = serializers.PrimaryKeyRelatedField(queryset=Hamster.objects.all(), write_only=True)
    class Meta:
        model = Schedule
        fields = ['id', 'hamster', 'title', 'schedule_date', 'category', 'notes', 'created_at']

class HamsterSerializer(serializers.ModelSerializer):
    """ハムスターの情報を扱うシリアライザ"""
    owner = serializers.PrimaryKeyRelatedField(read_only=True, default=serializers.CurrentUserDefault())
    profile_image = serializers.SerializerMethodField()
    class Meta:
        model = Hamster
        fields = ['id', 'owner', 'name', 'breed', 'birthday', 'gender', 'profile_text', 'profile_image']
    def get_profile_image(self, obj):
        request = self.context.get('request')
        if obj.profile_image and hasattr(obj.profile_image, 'url'):
            return request.build_absolute_uri(obj.profile_image.url)
        return None
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

class HamsterDetailSerializer(HamsterSerializer):
    """ハムスター詳細ページ用のシリアライザ"""
    health_logs = HealthLogSerializer(many=True, read_only=True)
    schedules = ScheduleSerializer(many=True, read_only=True)
    age = serializers.CharField(read_only=True)
    class Meta(HamsterSerializer.Meta):
        fields = HamsterSerializer.Meta.fields + ['health_logs', 'schedules', 'age']

class CommentSerializer(serializers.ModelSerializer):
    """コメントを扱うシリアライザ"""
    author = PostAuthorSerializer(read_only=True)
    class Meta:
        model = Comment
        fields = ['id', 'author', 'post', 'text', 'created_at']
        extra_kwargs = { 'post': {'write_only': True} }

class TagSerializer(serializers.ModelSerializer):
    """シンプルなタグ情報"""
    class Meta:
        model = Tag
        fields = ['id', 'name']
        
class BasePostSerializer(serializers.ModelSerializer):
    """投稿の「読み取り」時に使用する共通ロジック"""
    author = PostAuthorSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    hamster = HamsterSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    is_bookmarked = serializers.SerializerMethodField()
    class Meta:
        model = Post
        fields = ['id', 'author', 'text', 'image', 'created_at', 'likes_count', 'is_liked', 'hamster', 'comments', 'tags', 'is_bookmarked']
    def get_is_liked(self, obj):
        request = self.context.get('request', None)
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            return request.build_absolute_uri(obj.image.url)
        return None
    def get_is_bookmarked(self, obj):
        request = self.context.get('request', None)
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return request.user.profile.bookmarked_posts.filter(pk=obj.pk).exists()
        return False

# --- 投稿作成・更新用のシリアライザ ---
class PostCreateUpdateSerializer(serializers.ModelSerializer):
    """投稿の作成・更新時に使用するシリアライザ"""
    hamster = serializers.PrimaryKeyRelatedField(
        queryset=Hamster.objects.all(), required=False, allow_null=True
    )
    image = serializers.ImageField(required=False, allow_null=True)
    class Meta:
        model = Post
        fields = ['text', 'image', 'hamster']

# --- 各ページで利用するメインシリアライザ ---
class PostSerializer(BasePostSerializer):
    class Meta(BasePostSerializer.Meta):
        fields = [f for f in BasePostSerializer.Meta.fields if f != 'comments']

class PostDetailSerializer(BasePostSerializer):
    pass

class PostForProfileSerializer(BasePostSerializer):
    class Meta(BasePostSerializer.Meta):
        fields = [f for f in BasePostSerializer.Meta.fields if f != 'comments']

class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    class Meta:
        model = UserProfile
        fields = ['bio', 'avatar']
    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and hasattr(obj.avatar, 'url'):
            return request.build_absolute_uri(obj.avatar.url)
        return None

class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    posts = PostForProfileSerializer(many=True, read_only=True)
    hamsters = HamsterSerializer(many=True, read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'profile', 'posts', 'hamsters', 'followers_count', 'following_count', 'is_following']
    def get_followers_count(self, obj):
        return obj.followers.count()
    def get_following_count(self, obj):
        return obj.profile.following.count()
    def get_is_following(self, obj):
        request = self.context.get('request', None)
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.followers.filter(user=request.user).exists()
        return False

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'avatar']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
        extra_kwargs = { 'password': {'write_only': True}, 'email': {'required': True} }
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("このメールアドレスは既に使用されています。")
        return value
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data, is_active=False)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        activation_url = f"http://localhost:5173/activate/{uid}/{token}"
        subject = 'アカウントの有効化をお願いします - withham'
        message = f"withhamへのご登録ありがとうございます！\n\n以下のリンクをクリックして、アカウントの有効化を完了してください。\n\n{activation_url}\n\nもしこのメールに心当たりがない場合は、お手数ですが無視してください。"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return user

class UserListSerializer(serializers.ModelSerializer):
    profile = UserProfileForAuthorSerializer(read_only=True)
    is_following = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'profile', 'is_following']
    def get_is_following(self, obj):
        request = self.context.get('request', None)
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return request.user.profile.following.filter(id=obj.id).exists()
        return False

class AnswerSerializer(serializers.ModelSerializer):
    user = PostAuthorSerializer(read_only=True)
    class Meta:
        model = Answer
        fields = ['id', 'user', 'question', 'text', 'created_at', 'is_best_answer']
        read_only_fields = ['user', 'is_best_answer']
        extra_kwargs = { 'question': {'write_only': True} }

class QuestionSerializer(serializers.ModelSerializer):
    user = PostAuthorSerializer(read_only=True)
    answers_count = serializers.SerializerMethodField()
    class Meta:
        model = Question
        fields = ['id', 'title', 'user', 'created_at', 'is_resolved', 'answers_count']
    def get_answers_count(self, obj):
        return obj.answers.count()

class QuestionDetailSerializer(QuestionSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    class Meta(QuestionSerializer.Meta):
        fields = QuestionSerializer.Meta.fields + ['text', 'answers']

class NotificationSerializer(serializers.ModelSerializer):
    actor = PostAuthorSerializer(read_only=True)
    target_post_text = serializers.CharField(source='target.text', read_only=True, default='')
    class Meta:
        model = Notification
        fields = ['id', 'actor', 'verb', 'target', 'target_post_text', 'is_read', 'timestamp']

class TagDetailSerializer(serializers.ModelSerializer):
    posts = PostSerializer(many=True, read_only=True)
    class Meta:
        model = Tag
        fields = ['id', 'name', 'posts']