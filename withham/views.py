# withham/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Q
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from .models import Post, Hamster, UserProfile, Comment, HealthLog
from .forms import PostForm, HamsterForm, UserProfileForm, CommentForm, HealthLogForm, SignUpForm
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.http import require_POST
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.generic.edit import DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin

# Create your views here.

# --- index, post_create, hamster_create, profile_detail, profile_edit, post_detail, toggle_like, health_log_create, health_log_list, hamster_edit, HamsterDeleteView, signup, toggle_follow ビューは省略 ---
# (前のコードをここに含める)
# --- トップページ (タイムライン) ---
def index(request):
    """トップページ・投稿一覧を表示"""
    posts = Post.objects.order_by('-created_at') # 新しい順に全投稿を取得
    context = {
        # 'message': 'みんなの投稿', # 見出し削除に伴いコメントアウト
        'posts': posts,
    }
    return render(request, 'withham/index.html', context)

# --- 新規投稿 ---
@login_required # ログイン必須
def post_create(request):
    """新規投稿ページ・処理"""
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            return redirect('withham:index')
    else:
        form = PostForm()
    context = {'form': form}
    return render(request, 'withham/post_form.html', context)

# --- ハムスター登録 ---
@login_required # ログイン必須
def hamster_create(request):
    """ハムスター登録ページ・処理"""
    if request.method == 'POST':
        form = HamsterForm(request.POST, request.FILES)
        if form.is_valid():
            hamster = form.save(commit=False)
            hamster.owner = request.user
            hamster.save()
            return redirect('withham:profile_detail', pk=request.user.pk) # マイページへ
    else:
        form = HamsterForm()
    context = {'form': form}
    return render(request, 'withham/hamster_form.html', context)

# --- プロフィール詳細 ---
def profile_detail(request, pk):
    """ユーザープロフィール詳細ページ"""
    profile_user = get_object_or_404(User, pk=pk)
    posts = Post.objects.filter(author=profile_user).order_by('-created_at')
    hamsters = Hamster.objects.filter(owner=profile_user)

    is_following = False
    following_count = 0
    followers_count = 0

    try:
        profile = profile_user.profile
        following_count = profile.following.count()
        followers_count = profile_user.followers.count() # Userモデルのrelated_nameを使用

        if request.user.is_authenticated:
            is_following = request.user.profile.following.filter(pk=profile_user.pk).exists()

    except UserProfile.DoesNotExist:
        pass

    context = {
        'profile_user': profile_user,
        'posts': posts,
        'hamsters': hamsters,
        'is_following': is_following,
        'following_count': following_count,
        'followers_count': followers_count,
    }
    return render(request, 'withham/profile_detail.html', context)

# --- プロフィール編集 ---
@login_required # ログイン必須
def profile_edit(request):
    """プロフィール編集ページ・処理"""
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = UserProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect('withham:profile_detail', pk=request.user.pk)
    else:
        form = UserProfileForm(instance=profile)
    context = {'form': form}
    return render(request, 'withham/profile_edit.html', context)

# --- 投稿詳細・コメント処理 ---
def post_detail(request, pk):
    """投稿詳細ページ表示・コメント投稿処理"""
    post = get_object_or_404(Post, pk=pk)
    comments = post.comments.all().order_by('created_at')
    comment_form = CommentForm()

    if request.method == 'POST':
        if not request.user.is_authenticated:
             return HttpResponseForbidden("コメントするにはログインが必要です。")
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            new_comment = comment_form.save(commit=False)
            new_comment.post = post
            new_comment.author = request.user
            new_comment.save()
            return redirect('withham:post_detail', pk=post.pk)

    context = {
        'post': post,
        'comments': comments,
        'comment_form': comment_form,
    }
    return render(request, 'withham/post_detail.html', context)

# --- いいね/いいね解除 処理 ---
@login_required
@require_POST
def toggle_like(request, post_id):
    """いいねの追加/削除を行い、JSONレスポンスを返す"""
    try:
        post = get_object_or_404(Post, id=post_id)
        user = request.user
        liked = False

        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
        likes_count = post.likes.count()
        return JsonResponse({'liked': liked, 'likes_count': likes_count})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# --- 健康記録登録 ---
@login_required
def health_log_create(request, hamster_pk):
    """特定のハムスターの健康記録を登録する"""
    hamster = get_object_or_404(Hamster, pk=hamster_pk, owner=request.user)

    if request.method == 'POST':
        form = HealthLogForm(request.POST)
        if form.is_valid():
            health_log = form.save(commit=False)
            health_log.hamster = hamster
            health_log.recorded_by = request.user
            health_log.save()
            return redirect('withham:health_log_list', hamster_pk=hamster.pk)
    else:
        form = HealthLogForm(initial={'log_date': timezone.now().date()})

    context = {
        'form': form,
        'hamster': hamster,
    }
    return render(request, 'withham/health_log_form.html', context)

# --- 健康記録一覧 ---
def health_log_list(request, hamster_pk):
    """特定のハムスターの健康記録一覧を表示する"""
    hamster = get_object_or_404(Hamster, pk=hamster_pk)
    health_logs = hamster.health_logs.all().order_by('-log_date', '-created_at')

    context = {
        'hamster': hamster,
        'health_logs': health_logs,
    }
    return render(request, 'withham/health_log_list.html', context)

# --- ハムスター情報編集 ---
@login_required
def hamster_edit(request, pk):
    """ハムスター情報編集ページ・処理"""
    hamster = get_object_or_404(Hamster, pk=pk, owner=request.user)

    if request.method == 'POST':
        form = HamsterForm(request.POST, request.FILES, instance=hamster)
        if form.is_valid():
            form.save()
            return redirect('withham:profile_detail', pk=request.user.pk) # マイページへ
    else:
        form = HamsterForm(instance=hamster)

    context = {
        'form': form,
        'hamster': hamster,
    }
    return render(request, 'withham/hamster_form.html', context)

# --- ハムスター情報削除 ---
class HamsterDeleteView(LoginRequiredMixin, DeleteView):
    """ハムスター情報削除ビュー (確認画面付き)"""
    model = Hamster
    template_name = 'withham/hamster_confirm_delete.html'

    def dispatch(self, request, *args, **kwargs):
        hamster = self.get_object()
        if request.user != hamster.owner:
            return redirect('withham:index')
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return reverse_lazy('withham:profile_detail', kwargs={'pk': self.request.user.pk})

# --- サインアップ ---
def signup(request):
    """ユーザー登録ページ・処理"""
    if request.user.is_authenticated:
        return redirect('withham:index')

    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('withham:index')
    else:
        form = SignUpForm()

    context = {'form': form}
    return render(request, 'withham/signup.html', context)

# --- フォロー/アンフォロー処理 ---
@login_required
@require_POST
def toggle_follow(request, user_pk):
    """指定されたユーザーをフォロー/アンフォローする"""
    user_to_follow = get_object_or_404(User, pk=user_pk)
    profile = request.user.profile

    if request.user == user_to_follow:
        return redirect('withham:profile_detail', pk=user_pk)

    if profile.following.filter(pk=user_pk).exists():
        profile.following.remove(user_to_follow)
    else:
        profile.following.add(user_to_follow)

    return redirect('withham:profile_detail', pk=user_pk)

# ★★★ フォロー中リスト表示ビューを追加 ★★★
def following_list(request, pk):
    """指定されたユーザーがフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    # UserProfileのfollowingフィールドからフォローしているUserを取得
    try:
        following_users = profile_user.profile.following.all()
    except UserProfile.DoesNotExist:
        following_users = User.objects.none() # プロフィールがない場合は空

    context = {
        'profile_user': profile_user, # 誰のリストかを表示するため
        'user_list': following_users, # テンプレートに渡すユーザーリスト
        'list_type': 'フォロー中'       # テンプレートでタイトル表示などに使う
    }
    # フォロワーリストと共通のテンプレートを使う
    return render(request, 'withham/follow_list.html', context)

# ★★★ フォロワーリスト表示ビューを追加 ★★★
def followers_list(request, pk):
    """指定されたユーザーをフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    # Userモデルのrelated_name='followers'を使ってフォロワーを取得
    follower_users = profile_user.followers.all() # これはUserProfileのリストになるので注意

    # UserProfileのリストからUserのリストを取得する (少し冗長だが確実)
    followers = User.objects.filter(profile__in=follower_users)

    context = {
        'profile_user': profile_user,
        'user_list': followers, # テンプレートに渡すユーザーリスト
        'list_type': 'フォロワー' # テンプレートでタイトル表示などに使う
    }
    # フォロー中リストと共通のテンプレートを使う
    return render(request, 'withham/follow_list.html', context)

