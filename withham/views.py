# withham/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Q
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
# モデルをインポート
from .models import Post, Hamster, UserProfile, Comment, HealthLog, Notification, Tag, Question, Answer
# フォームをインポート
from .forms import PostForm, HamsterForm, UserProfileForm, CommentForm, HealthLogForm, SignUpForm, QuestionForm, AnswerForm
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.http import require_POST
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.generic.edit import DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
import re # ハッシュタグ用

# Create your views here.

# --- トップページ (タイムライン) ---
def index(request):
    """トップページ・投稿一覧と最新の質問を表示"""
    # 投稿を取得（ユーザーが存在する投稿のみ）
    posts = Post.objects.select_related('author').filter(author__isnull=False).order_by('-created_at')
    # 最新の質問を取得 (例: 10件)
    latest_questions = Question.objects.order_by('-created_at')[:10]

    # デバッグ情報
    print(f"投稿数: {posts.count()}")
    for post in posts:
        print(f"投稿ID: {post.id}, ユーザー: {post.author.username if post.author else 'None'}, 本文: {post.text[:50]}...")

    context = {
        'posts': posts,
        'latest_questions': latest_questions, # テンプレートに渡す
    }
    return render(request, 'withham/index.html', context)

# --- 新規投稿 ---
@login_required
def post_create(request):
    """新規投稿ページ・処理"""
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, user=request.user) # userを渡す
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save() # モデルのsaveメソッドでタグも更新される
            return redirect('withham:index')
    else:
        form = PostForm(user=request.user) # userを渡す
    context = {'form': form}
    return render(request, 'withham/post_form.html', context)

# --- ハムスター登録 ---
@login_required
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
    target_user = get_object_or_404(User, pk=pk) # 変数名を target_user に変更
    posts = Post.objects.filter(author=target_user).order_by('-created_at')
    hamsters = Hamster.objects.filter(owner=target_user)

    is_following = False
    following_count = 0
    followers_count = 0

    try:
        profile = target_user.profile # target_user を使用
        following_count = profile.following.count()
        followers_count = target_user.followers.count() # target_user を使用

        if request.user.is_authenticated:
            is_following = request.user.profile.following.filter(pk=target_user.pk).exists() # target_user を使用

    except UserProfile.DoesNotExist:
        pass

    context = {
        'target_user': target_user, # 変数名を変更
        'posts': posts,
        'hamsters': hamsters,
        'is_following': is_following,
        'following_count': following_count,
        'followers_count': followers_count,
    }
    return render(request, 'withham/profile_detail.html', context)

# --- プロフィール編集 ---
@login_required
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
        if not request.user.is_authenticated: return HttpResponseForbidden("コメントするにはログインが必要です。")
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            new_comment = comment_form.save(commit=False)
            new_comment.post = post
            new_comment.author = request.user
            new_comment.save()
            # コメント投稿時に通知を作成
            if post.author != request.user:
                Notification.objects.create(recipient=post.author, actor=request.user, verb=Notification.COMMENT, target=post)
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
            # いいね時に通知を作成
            if post.author != user:
                Notification.objects.create(
                    recipient=post.author,
                    actor=user,
                    verb=Notification.LIKE,
                    target=post
                )

        likes_count = post.likes.count()
        return JsonResponse({'liked': liked, 'likes_count': likes_count})
    except Exception as e:
        print(f"Error in toggle_like: {e}") # エラーログ
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
    context = { 'form': form, 'hamster': hamster, }
    return render(request, 'withham/health_log_form.html', context)

# --- 健康記録一覧 ---
def health_log_list(request, hamster_pk):
    """特定のハムスターの健康記録一覧を表示する"""
    hamster = get_object_or_404(Hamster, pk=hamster_pk)
    health_logs = hamster.health_logs.all().order_by('-log_date', '-created_at')
    context = { 'hamster': hamster, 'health_logs': health_logs, }
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
            return redirect('withham:profile_detail', pk=request.user.pk)
    else:
        form = HamsterForm(instance=hamster)
    context = { 'form': form, 'hamster': hamster, }
    return render(request, 'withham/hamster_form.html', context)

# --- ハムスター情報削除 ---
class HamsterDeleteView(LoginRequiredMixin, DeleteView):
    """ハムスター情報削除ビュー (確認画面付き)"""
    model = Hamster
    template_name = 'withham/hamster_confirm_delete.html'
    def dispatch(self, request, *args, **kwargs):
        hamster = self.get_object()
        if request.user != hamster.owner: return redirect('withham:index')
        return super().dispatch(request, *args, **kwargs)
    def get_success_url(self):
        return reverse_lazy('withham:profile_detail', kwargs={'pk': self.request.user.pk})

# --- サインアップ ---
def signup(request):
    """ユーザー登録ページ・処理"""
    if request.user.is_authenticated: return redirect('withham:index')
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
    if request.user == user_to_follow: return redirect('withham:profile_detail', pk=user_pk)
    is_following_before = profile.following.filter(pk=user_pk).exists()
    if is_following_before:
        profile.following.remove(user_to_follow)
    else:
        profile.following.add(user_to_follow)
        Notification.objects.create( recipient=user_to_follow, actor=request.user, verb=Notification.FOLLOW )
    return redirect('withham:profile_detail', pk=user_pk)

# --- フォロー中リスト ---
def following_list(request, pk):
    """指定されたユーザーがフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    try: following_users = profile_user.profile.following.all()
    except UserProfile.DoesNotExist: following_users = User.objects.none()
    context = { 'profile_user': profile_user, 'user_list': following_users, 'list_type': 'フォロー中' }
    return render(request, 'withham/follow_list.html', context)

# --- フォロワーリスト ---
def followers_list(request, pk):
    """指定されたユーザーをフォローしているユーザーの一覧を表示"""
    profile_user = get_object_or_404(User, pk=pk)
    follower_profiles = profile_user.followers.all()
    followers = User.objects.filter(profile__in=follower_profiles)
    context = { 'profile_user': profile_user, 'user_list': followers, 'list_type': 'フォロワー' }
    return render(request, 'withham/follow_list.html', context)

# --- 検索結果 ---
def search_results(request):
    """検索クエリに基づいてユーザーと投稿を検索し、結果を表示する"""
    query = request.GET.get('q', '')
    found_users = User.objects.none(); found_posts = Post.objects.none()
    if query:
        found_users = User.objects.filter(username__icontains=query)
        found_posts = Post.objects.filter(text__icontains=query).order_by('-created_at')
    context = { 'query': query, 'found_users': found_users, 'found_posts': found_posts, }
    return render(request, 'withham/search_results.html', context)

# --- 通知一覧 ---
@login_required
def notification_list(request):
    """ログインユーザーの通知一覧を表示し、既読にする"""
    notifications = request.user.notifications.all().order_by('-timestamp')
    unread_notifications = notifications.filter(is_read=False)
    unread_notifications.update(is_read=True)
    context = { 'notifications': notifications, }
    return render(request, 'withham/notification_list.html', context)

# --- ハッシュタグ検索 ---
def hashtag_search(request, tag_name):
    """指定されたハッシュタグが付いた投稿の一覧を表示する"""
    tag = get_object_or_404(Tag, name=tag_name.lower())
    posts = tag.posts.all().order_by('-created_at')
    context = { 'tag': tag, 'posts': posts, }
    return render(request, 'withham/hashtag_search_results.html', context)

# --- 投稿編集 ---
@login_required
def post_edit(request, pk):
    """投稿編集ページ・処理"""
    post = get_object_or_404(Post, pk=pk)
    if post.author != request.user: return HttpResponseForbidden("この投稿を編集する権限がありません。")
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post, user=request.user) # userを渡す
        if form.is_valid():
            form.save()
            return redirect('withham:post_detail', pk=post.pk)
    else:
        form = PostForm(instance=post, user=request.user) # userを渡す
    context = { 'form': form, 'post': post, }
    return render(request, 'withham/post_form.html', context)

# --- 投稿削除 ---
class PostDeleteView(LoginRequiredMixin, DeleteView):
    """投稿削除ビュー (確認画面付き)"""
    model = Post
    template_name = 'withham/post_confirm_delete.html'
    def dispatch(self, request, *args, **kwargs):
        post = self.get_object()
        if request.user != post.author: return HttpResponseForbidden("この投稿を削除する権限がありません。")
        return super().dispatch(request, *args, **kwargs)
    def get_success_url(self):
        return reverse_lazy('withham:profile_detail', kwargs={'pk': self.object.author.pk})

# --- コメント削除 ---
@login_required
@require_POST
def comment_delete(request, pk):
    """コメントを削除する"""
    comment = get_object_or_404(Comment, pk=pk)
    post_pk = comment.post.pk
    if comment.author != request.user: return HttpResponseForbidden("このコメントを削除する権限がありません。")
    comment.delete()
    return redirect('withham:post_detail', pk=post_pk)

# --- 質問一覧 ---
def question_list(request):
    """質問一覧ページ"""
    questions = Question.objects.all().order_by('-created_at')
    context = {'questions': questions}
    return render(request, 'withham/question_list.html', context)

# --- 質問詳細 (回答フォーム処理含む) ---
def question_detail(request, pk):
    """質問詳細ページ表示・回答投稿処理"""
    question = get_object_or_404(Question, pk=pk)
    answers = question.answers.all().order_by('created_at')
    answer_form = AnswerForm()

    if request.method == 'POST': # 回答投稿処理
        if not request.user.is_authenticated: return HttpResponseForbidden("回答するにはログインが必要です。")
        answer_form = AnswerForm(request.POST)
        if answer_form.is_valid():
            new_answer = answer_form.save(commit=False)
            new_answer.question = question
            new_answer.user = request.user
            new_answer.save()
            # 回答投稿時に通知を作成
            if question.user != request.user:
                Notification.objects.create(recipient=question.user, actor=request.user, verb=Notification.ANSWER, target=question)
            return redirect('withham:question_detail', pk=question.pk)

    context = {
        'question': question,
        'answers': answers,
        'answer_form': answer_form,
    }
    return render(request, 'withham/question_detail.html', context)

# --- 新規質問作成 ---
@login_required
def question_create(request):
    """新規質問作成ページ・処理"""
    if request.method == 'POST':
        form = QuestionForm(request.POST)
        if form.is_valid():
            question = form.save(commit=False)
            question.author = request.user
            question.save()
            return redirect('withham:question_detail', pk=question.pk)
    else:
        form = QuestionForm()
    context = {'form': form}
    return render(request, 'withham/question_form.html', context)

# --- 質問編集 ---
@login_required
def question_edit(request, pk):
    """質問編集ページ・処理"""
    question = get_object_or_404(Question, pk=pk)
    if question.user != request.user:
        return HttpResponseForbidden("この質問を編集する権限がありません。")
    
    if request.method == 'POST':
        form = QuestionForm(request.POST, instance=question)
        if form.is_valid():
            form.save()
            return redirect('withham:question_detail', pk=question.pk)
    else:
        form = QuestionForm(instance=question)
    
    context = {'form': form, 'question': question}
    return render(request, 'withham/question_form.html', context)

# --- 質問削除 ---
@login_required
def question_delete(request, pk):
    """質問削除処理"""
    question = get_object_or_404(Question, pk=pk)
    if question.user != request.user:
        return HttpResponseForbidden("この質問を削除する権限がありません。")
    
    if request.method == 'POST':
        question.delete()
        return redirect('withham:question_list')
    
    return render(request, 'withham/question_confirm_delete.html', {'question': question})

