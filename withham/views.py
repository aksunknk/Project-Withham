# withham/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
# ↓ アプリケーションのモデルを全てインポート
from .models import Post, Hamster, UserProfile, Comment, HealthLog # HealthLogもインポート
# ↓ アプリケーションのフォームを全てインポート
from .forms import PostForm, HamsterForm, UserProfileForm, CommentForm, HealthLogForm # HealthLogFormもインポート
# ↓ JsonResponse と require_POST をインポート
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden # HttpResponseForbiddenもインポート
from django.views.decorators.http import require_POST
from django.urls import reverse
# ↓↓↓ timezone モジュールをインポート ↓↓↓
from django.utils import timezone

# Create your views here.

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

    context = {
        'profile_user': profile_user,
        'posts': posts,
        'hamsters': hamsters,
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

# --- いいね処理 ---
@login_required
@require_POST
def toggle_like(request, post_id):
    """投稿へのいいね・いいね解除を処理"""
    post = get_object_or_404(Post, pk=post_id)
    user = request.user
    is_liked = False

    if post.likes.filter(id=user.id).exists():
        post.likes.remove(user)
        is_liked = False
    else:
        post.likes.add(user)
        is_liked = True

    return JsonResponse({
        'is_liked': is_liked,
        'likes_count': post.likes.count(),
    })

# --- 健康記録登録 ---
@login_required
def health_log_create(request, hamster_pk):
    """健康記録登録ページ・処理"""
    hamster = get_object_or_404(Hamster, pk=hamster_pk)
    # ハムスターの飼い主でない場合はアクセス拒否
    if hamster.owner != request.user:
        return HttpResponseForbidden("このハムスターの健康記録は登録できません。")

    if request.method == 'POST':
        form = HealthLogForm(request.POST)
        if form.is_valid():
            health_log = form.save(commit=False)
            health_log.hamster = hamster
            health_log.recorded_by = request.user
            health_log.save()
            return redirect('withham:profile_detail', pk=request.user.pk)
    else:
        form = HealthLogForm()

    context = {
        'form': form,
        'hamster': hamster,
    }
    return render(request, 'withham/health_log_form.html', context)
