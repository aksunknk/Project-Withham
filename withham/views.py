# withham/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Q
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
# ↓↓↓ Notification, Tag, Comment モデルもインポート ↓↓↓
from .models import Post, Hamster, UserProfile, Comment, HealthLog, Notification, Tag
# ↓↓↓ SignUpForm もインポート ↓↓↓
from .forms import PostForm, HamsterForm, UserProfileForm, CommentForm, HealthLogForm, SignUpForm
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
# ↓↓↓ require_POST をインポート ↓↓↓
from django.views.decorators.http import require_POST
from django.urls import reverse, reverse_lazy
from django.utils import timezone
# ↓↓↓ DeleteView, LoginRequiredMixin をインポート ↓↓↓
from django.views.generic.edit import DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
import re # ハッシュタグ用

# Create your views here.

# --- index, post_create, hamster_create, profile_detail, profile_edit, post_detail, toggle_like, health_log_create, health_log_list, hamster_edit, HamsterDeleteView, signup, toggle_follow, following_list, followers_list, search_results, notification_list, hashtag_search, post_edit, PostDeleteView ビューは省略 ---
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
            # ★ save() が呼ばれるとモデルのsaveメソッドが実行され、タグが更新される
            post.save()
            # ★ 通知を作成 (投稿完了後)
            # ここではフォロワーへの通知などは実装しない (MVP外)
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
    # ↓↓↓ 変数名を profile_user から target_user に変更 ↓↓↓
    target_user = get_object_or_404(User, pk=pk)
    posts = Post.objects.filter(author=target_user).order_by('-created_at')
    hamsters = Hamster.objects.filter(owner=target_user)

    is_following = False
    following_count = 0
    followers_count = 0

    try:
        # ↓↓↓ target_user を使用 ↓↓↓
        profile = target_user.profile
        following_count = profile.following.count()
        # ↓↓↓ target_user を使用 ↓↓↓
        followers_count = target_user.followers.count()

        if request.user.is_authenticated:
            # ↓↓↓ target_user を使用 ↓↓↓
            is_following = request.user.profile.following.filter(pk=target_user.pk).exists()

    except UserProfile.DoesNotExist:
        pass

    context = {
        # ↓↓↓ 変数名を変更して渡す ↓↓↓
        'target_user': target_user,
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

    if request.method == 'POST': # コメント投稿処理
        if not request.user.is_authenticated:
             return HttpResponseForbidden("コメントするにはログインが必要です。")
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            new_comment = comment_form.save(commit=False)
            new_comment.post = post
            new_comment.author = request.user
            new_comment.save()
            # コメント投稿時に通知を作成
            if post.author != request.user:
                Notification.objects.create(
                    recipient=post.author,
                    actor=request.user,
                    verb=Notification.COMMENT,
                    target=post
                )
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
        is_liked = False

        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            is_liked = False
        else:
            post.likes.add(user)
            is_liked = True
            if post.author != user:
                Notification.objects.create(
                    recipient=post.author,
                    actor=user,
                    verb=Notification.LIKE,
                    target=post
                )
        likes_count = post.likes.count()
        return JsonResponse({'is_liked': is_liked, 'likes_count': likes_count})
    except Exception as e:
        print(f"Error in toggle_like: {e}")
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

    is_following_before = profile.following.filter(pk=user_pk).exists()

    if is_following_before:
        profile.following.remove(user_to_follow)
    else:
        profile.following.add(user_to_follow)
        Notification.objects.create(
            recipient=user_to_follow,
            actor=request.user,
            verb=Notification.FOLLOW
        )

    return redirect('withham:profile_detail', pk=user_pk)

# --- フォロー中リスト ---
def following_list(request, pk):
    """指定されたユーザーがフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    try:
        following_users = profile_user.profile.following.all()
    except UserProfile.DoesNotExist:
        following_users = User.objects.none()

    context = {
        'profile_user': profile_user,
        'user_list': following_users,
        'list_type': 'フォロー中'
    }
    return render(request, 'withham/follow_list.html', context)

# --- フォロワーリスト ---
def followers_list(request, pk):
    """指定されたユーザーをフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    follower_profiles = profile_user.followers.all() # UserProfileのリスト
    followers = User.objects.filter(profile__in=follower_profiles) # Userのリストに変換

    context = {
        'profile_user': profile_user,
        'user_list': followers,
        'list_type': 'フォロワー'
    }
    return render(request, 'withham/follow_list.html', context)

# --- 検索結果 ---
def search_results(request):
    """検索クエリに基づいてユーザーと投稿を検索し、結果を表示する"""
    query = request.GET.get('q', '')
    found_users = User.objects.none()
    found_posts = Post.objects.none()

    if query:
        found_users = User.objects.filter(username__icontains=query)
        found_posts = Post.objects.filter(text__icontains=query).order_by('-created_at')

    context = {
        'query': query,
        'found_users': found_users,
        'found_posts': found_posts,
    }
    return render(request, 'withham/search_results.html', context)

# --- 通知一覧 ---
@login_required
def notification_list(request):
    """ログインユーザーの通知一覧を表示し、既読にする"""
    notifications = request.user.notifications.all().order_by('-timestamp')
    unread_notifications = notifications.filter(is_read=False)
    unread_notifications.update(is_read=True)

    context = {
        'notifications': notifications,
    }
    return render(request, 'withham/notification_list.html', context)

# --- ハッシュタグ検索 ---
def hashtag_search(request, tag_name):
    """指定されたハッシュタグが付いた投稿の一覧を表示する"""
    tag = get_object_or_404(Tag, name=tag_name.lower())
    posts = tag.posts.all().order_by('-created_at')

    context = {
        'tag': tag,
        'posts': posts,
    }
    return render(request, 'withham/hashtag_search_results.html', context)

# --- 投稿編集 ---
@login_required
def post_edit(request, pk):
    """投稿編集ページ・処理"""
    post = get_object_or_404(Post, pk=pk)
    if post.author != request.user:
        return HttpResponseForbidden("この投稿を編集する権限がありません。")

    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save() # saveメソッド内でタグ更新も行われる
            return redirect('withham:post_detail', pk=post.pk)
    else:
        form = PostForm(instance=post)

    context = {
        'form': form,
        'post': post,
    }
    return render(request, 'withham/post_form.html', context)

# --- 投稿削除 ---
class PostDeleteView(LoginRequiredMixin, DeleteView):
    """投稿削除ビュー (確認画面付き)"""
    model = Post
    template_name = 'withham/post_confirm_delete.html'

    def dispatch(self, request, *args, **kwargs):
        post = self.get_object()
        if request.user != post.author:
            return HttpResponseForbidden("この投稿を削除する権限がありません。")
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return reverse_lazy('withham:profile_detail', kwargs={'pk': self.object.author.pk})


# ★★★ コメント削除ビューを追加 ★★★
@login_required
@require_POST # 安全のためPOSTリクエストのみ受け付ける
def comment_delete(request, pk):
    """コメントを削除する"""
    comment = get_object_or_404(Comment, pk=pk)
    post_pk = comment.post.pk # リダイレクト用に投稿IDを保持

    # コメント投稿者本人か、または投稿の作者であれば削除可能にする (任意)
    # ここではコメント投稿者本人のみ削除可能とする
    if comment.author != request.user:
        return HttpResponseForbidden("このコメントを削除する権限がありません。")

    comment.delete()
    # 削除後は元の投稿詳細ページにリダイレクト
    return redirect('withham:post_detail', pk=post_pk)

