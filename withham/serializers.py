# withham/serializers.py

from rest_framework import serializers
from .models import Post, User, UserProfile, Hamster, HealthLog, Comment
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

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

class HamsterSerializer(serializers.ModelSerializer):
    """ハムスターの情報を扱うシリアライザ"""
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    class Meta:
        model = Hamster
        fields = ['id', 'owner', 'name', 'breed', 'birthday', 'gender', 'profile_text', 'profile_image']

class HamsterDetailSerializer(serializers.ModelSerializer):
    """ハムスター詳細ページ用のシリアライザ"""
    health_logs = HealthLogSerializer(many=True, read_only=True)
    class Meta:
        model = Hamster
        fields = ['id', 'owner', 'name', 'breed', 'birthday', 'gender', 'profile_text', 'profile_image', 'health_logs']

class CommentSerializer(serializers.ModelSerializer):
    """コメントを扱うシリアライザ"""
    author = PostAuthorSerializer(read_only=True)
    class Meta:
        model = Comment
        fields = ['id', 'author', 'post', 'text', 'created_at']
        extra_kwargs = { 'post': {'write_only': True} }

class BasePostSerializer(serializers.ModelSerializer):
    """投稿の共通ロジックを持つベースシリアライザ"""
    author = PostAuthorSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    hamster = HamsterSerializer(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author', 'text', 'image', 'created_at', 'likes_count', 'is_liked', 'hamster']
        read_only_fields = ['author']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request', None)
        if request is None or not request.user.is_authenticated: return False
        return obj.likes.filter(id=request.user.id).exists()
    
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            return request.build_absolute_uri(obj.image.url)
        return None

# --- 各ページで利用するメインシリアライザ ---

class PostSerializer(BasePostSerializer): pass

class PostDetailSerializer(BasePostSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    class Meta(BasePostSerializer.Meta):
        fields = BasePostSerializer.Meta.fields + ['comments']

class PostForProfileSerializer(BasePostSerializer): pass

class UserProfileSerializer(serializers.ModelSerializer):
    """プロフィール詳細や更新で使うシリアライザ"""
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
    """ユーザー詳細ページで使うシリアライザ"""
    profile = UserProfileSerializer(read_only=True)
    posts = PostForProfileSerializer(many=True, read_only=True)
    
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        # ↓↓↓ fieldsリストを更新 ↓↓↓
        fields = [
            'id', 'username', 'profile', 'posts',
            'followers_count', 'following_count', 'is_following'
        ]
    def get_followers_count(self, obj):
        # プロフィールに紐づくフォロワーの数を返す
        return obj.followers.count()

    def get_following_count(self, obj):
        # プロフィールのfollowingフィールドの数を返す
        return obj.profile.following.count()

    def get_is_following(self, obj):
        # リクエストしてきたユーザーが、このプロフィール（obj）のフォロワーに含まれるか
        request = self.context.get('request', None)
        if request is None or not request.user.is_authenticated:
            return False
        # obj.followers は UserProfileモデルのrelated_name
        return obj.followers.filter(user=request.user).exists()
    
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """プロフィール更新APIで使うシリアライザ"""
    class Meta:
        model = UserProfile
        fields = ['bio', 'avatar']

class UserRegistrationSerializer(serializers.ModelSerializer):
    """ユーザー登録用のシリアライザ"""
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
        extra_kwargs = { 'password': {'write_only': True} }

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
        user = User.objects.create_user(**validated_data)
        return user
    
class UserListSerializer(serializers.ModelSerializer):
    """フォロー・フォロワーリストで使うシンプルなユーザー情報"""
    profile = UserProfileForAuthorSerializer(read_only=True)
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'profile', 'is_following']

    def get_is_following(self, obj):
        request = self.context.get('request', None)
        if request is None or not request.user.is_authenticated:
            return False
        # リクエストユーザーが、リスト内のユーザー(obj)をフォローしているか
        return request.user.profile.following.filter(id=obj.id).exists()    