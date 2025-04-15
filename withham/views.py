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
    hamsters = Hamster.objects.filter(owner=profile_user)

    context = {
        'profile_user': profile_user,
        'posts': posts,
        'hamsters': hamsters, # ★★★ 取得したハムスターリストをコンテキストに追加 ★★★
    }
    return render(request, 'withham/profile_detail.html', context)

