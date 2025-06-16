# withham_project/urls.py

from django.contrib import admin
from django.urls import path, include
# ↓↓↓ メディアファイル配信のためのインポート ↓↓↓
from django.conf import settings
from django.conf.urls.static import static
# ↓↓↓ JWT認証のためのインポート ↓↓↓
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# ！！このファイルでは、個別のルーター定義は不要です！！

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # /api/ で始まるリクエストは、すべて withham/urls.py に転送する
    path('api/', include('withham.urls')),
    
    # 認証トークンを取得・リフレッシュするためのURL
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# 開発環境でメディアファイルを配信するための設定
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)