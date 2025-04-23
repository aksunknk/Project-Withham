<<<<<<< HEAD
# withham/views.py を編集または追記

from django.shortcuts import render, redirect # 他にも必要なものをインポート
from django.contrib.auth.decorators import login_required # ← ★この行を追加または確認★
from .forms import PostForm, HamsterForm # HamsterForm をインポート
from .models import Post, Hamster # Hamster モデルをインポート
from django.contrib.auth.models import User # ★ Userモデルをインポート
from django.shortcuts import render, redirect, get_object_or_404

# from django.contrib.auth.decorators import login_required # 必要ならログイン必須にする

# Create your views here.

# トップページ用のビュー関数
def index(request):
    # ここでトップページに表示したいデータを準備できます
    posts = Post.objects.order_by('-created_at')
    # 例: posts = Post.objects.order_by('-created_at')[:10]
    context = {
        'message': 'みんなの投稿', # メッセージを変更しても良い
        'posts': posts, # ★ 取得した投稿リストをコンテキストに追加
    }
    # 'withham/index.html' というテンプレートを使って表示
    return render(request, 'withham/index.html', context)

# --- ログイン画面用のビューは LoginView を使っているのでここでは不要 ---

@login_required # ログインしていない場合はログインページにリダイレクト
def post_create(request):
        if request.method == 'POST':
            # POSTリクエストの場合（フォームが送信された場合）
            # ファイルを含むデータと、通常のPOSTデータをフォームに渡す
            form = PostForm(request.POST, request.FILES) # ★ request.FILES を追加
            if form.is_valid():
                # バリデーションが通った場合
                post = form.save(commit=False) # まだDBには保存しない
                post.author = request.user # 投稿者を現在のログインユーザーに設定
                post.save() # データベースに保存
                # 投稿後はトップページなどにリダイレクト
                return redirect('withham:index') # 'withham:index' はトップページのURL名に合わせて変更
        else:
            # GETリクエストの場合（ページを初めて表示する場合）
            form = PostForm() # 空のフォームを作成
            # # ハムスター選択肢をユーザーに紐付ける場合（forms.pyの__init__を使う場合）
            # form = PostForm(user=request.user)

    # フォームをテンプレートに渡して表示
        context = {'form': form}
        return render(request, 'withham/post_form.html', context)

@login_required
def hamster_create(request):
    if request.method == 'POST':
        # ユーザー情報を含めずにフォームを初期化（ownerは後で設定）
        form = HamsterForm(request.POST, request.FILES)
        if form.is_valid():
            hamster = form.save(commit=False)
            hamster.owner = request.user # 飼い主をログインユーザーに設定
            hamster.save()
            # 登録後はハムスター一覧ページなどにリダイレクト（一覧ページは後で作成）
            # とりあえずトップページにリダイレクトする場合:
            return redirect('withham:index')
            # ハムスター一覧ページのURL名が決まったらそちらに修正 (例: 'withham:hamster_list')
    else:
        form = HamsterForm() # GETリクエストの場合は空のフォーム

    context = {'form': form}
    # 登録・編集で同じテンプレートを使う想定
    return render(request, 'withham/hamster_form.html', context)

def profile_detail(request, pk):
    # URLから渡されたpkを使って、表示対象のユーザーを取得
    # 存在しないユーザーIDの場合は 404 Not Found を返す
    profile_user = get_object_or_404(User, pk=pk)

    # そのユーザーの投稿を新しい順で取得
    posts = Post.objects.filter(author=profile_user).order_by('-created_at')

    # (今後追加) そのユーザーのハムスターを取得
=======
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
>>>>>>> b6e6bb3 (no message)
    hamsters = Hamster.objects.filter(owner=profile_user)

    context = {
        'profile_user': profile_user,
        'posts': posts,
<<<<<<< HEAD
        'hamsters': hamsters, # ★★★ 取得したハムスターリストをコンテキストに追加 ★★★
    }
    return render(request, 'withham/profile_detail.html', context)

=======
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
        return JsonResponse({'liked': liked, 'likes_count': post.likes.count()})
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
            return redirect('withham:profile_detail', pk=request.user.pk) # マイページへリダイレクトする例
    else:
        # GETリクエスト: フォームを初期化（記録日のデフォルトを今日に）
        form = HealthLogForm(initial={'log_date': timezone.now().date()}) # ← ここで timezone を使う

    context = {
        'form': form,
        'hamster': hamster,
    }
    return render(request, 'withham/health_log_form.html', context)

# --- 今後、ハムスター詳細・編集・削除などのビューもここに追加 ---
# def hamster_detail(request, pk): ...
# def hamster_edit(request, pk): ...
# def hamster_delete(request, pk): ...

>>>>>>> b6e6bb3 (no message)
