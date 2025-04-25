# withham_project/urls.py の修正後の例
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('withham.urls')), # ← これで withham アプリに処理を委譲
    # path('post/new/', name='post_create'), # ← この行は削除する
]

# ↓↓↓ 以下のブロックを追加 ↓↓↓
# 開発環境設定 (DEBUG=True) の場合のみ、MEDIA_URL と MEDIA_ROOT を使って
# アップロードされたファイルへのURLパターンを追加する
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
