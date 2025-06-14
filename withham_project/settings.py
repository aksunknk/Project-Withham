# withham_project/settings.py

"""
Django settings for withham_project project.

Generated by 'django-admin startproject' using Django X.Y.Z.
For more information on this file, see
https://docs.djangoproject.com/en/stable/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/stable/ref/settings/
"""

from pathlib import Path
import os # MEDIA_ROOT などで os.path.join を使う場合など
import dotenv # 追加
import dj_database_url # 追加 (ステップ3でインストール済みのはず)
# Build paths inside the project like this: BASE_DIR / 'subdir'.
# プロジェクトのルートディレクトリを取得
BASE_DIR = Path(__file__).resolve().parent.parent

# .env ファイルを読み込む (開発環境用)
dotenv_path = BASE_DIR / '.env'
if dotenv_path.exists():
    dotenv.load_dotenv(dotenv_path=dotenv_path)
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/stable/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
# ここにはDjangoが自動生成した実際のシークレットキーが入ります。
# 絶対に公開しないでください。
# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
SECRET_KEY = os.environ.get('SECRET_KEY')

if not SECRET_KEY:
    # raise ValueError("SECRET_KEY environment variable not set.") # エラーにする場合
    print("Warning: SECRET_KEY environment variable not set, using default (unsafe).")
# SECURITY WARNING: don't run with debug turned on in production!
# 開発中はTrue、本番環境ではFalseにします
DEBUG = True

# 開発中は空でOK、本番環境では許可するホスト名（ドメイン名）を設定します
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
# 開発用にローカルホストも追加しておく (任意)
if DEBUG:
    ALLOWED_HOSTS.append('127.0.0.1')
    ALLOWED_HOSTS.append('localhost')

# Application definition
# アプリケーション定義：作成したアプリや利用するDjango標準アプリを登録します
INSTALLED_APPS = [
    'django.contrib.admin',       # 管理サイト
    'django.contrib.auth',        # 認証システム
    'django.contrib.contenttypes',# コンテンツタイプフレームワーク
    'django.contrib.sessions',    # セッションフレームワーク
    'django.contrib.messages',    # メッセージングフレームワーク
    'django.contrib.staticfiles', # 静的ファイル管理
    'django.contrib.humanize',    # 人間が読みやすい形式への変換
    'withham',                    # ★作成した withham アプリを追加
    'storages',                   # S3用のストレージ
]

# ミドルウェア：リクエスト/レスポンス処理の間に挟まる処理を定義します
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]

# ルートURL設定ファイル
ROOT_URLCONF = 'withham_project.urls'

# テンプレート設定
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [], # プロジェクト直下にtemplatesディレクトリを作る場合はここに追加
        'APP_DIRS': True, # アプリ内のtemplatesディレクトリを読み込む設定
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGIアプリケーション
WSGI_APPLICATION = 'withham_project.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/stable/ref/settings/#auth-password-validators
# パスワード強度検証の設定
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/stable/topics/i18n/
# 国際化対応設定
LANGUAGE_CODE = 'ja' # ★言語を日本語に設定

TIME_ZONE = 'Asia/Tokyo' # ★タイムゾーンを東京に設定

USE_I18N = True # 国際化対応を有効にするか

USE_TZ = True # タイムゾーンを有効にするか




# Default primary key field type
# https://docs.djangoproject.com/en/stable/ref/settings/#default-auto-field
# モデルの主キーのデフォルト型
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media files (User uploaded files)
# ユーザーがアップロードしたファイル（画像など）の設定（任意）
# MEDIA_URL = '/media/' # アップロードファイルへのURLプレフィックス
# MEDIA_ROOT = BASE_DIR / 'media' # アップロードファイルを保存するディレクトリ
# または MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# withham_project/settings.py の末尾に追加

# ログイン成功後のリダイレクト先URL
LOGIN_REDIRECT_URL = '/' # トップページにリダイレクトする場合

# ログアウト成功後のリダイレクト先URL (任意)
# LOGOUT_REDIRECT_URL = '/login/' # ログアウト後にログインページに戻る場合

# --- メディアファイル設定 ---
# アップロードされたファイルを提供するURL (末尾のスラッシュが重要)
# アップロードされたファイルを実際に保存するサーバー上のディレクトリパス
# BASE_DIR は settings.py の上部で定義されているはず
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
# アップロードされたファイルを実際に保存するサーバー上のディレクトリパス
# BASE_DIR は settings.py の上部で定義されているはず


STATIC_URL = 'static/'

# または import os して os.path.join(BASE_DIR, 'media') でも可
STATIC_ROOT = BASE_DIR / 'staticfiles'

# 開発環境用の設定
if DEBUG:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    # 本番環境用のS3設定
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

CSRF_TRUSTED_ORIGINS = []
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')
