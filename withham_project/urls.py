# withham_project/urls.py の修正後の例
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('withham.urls')), # ← これで withham アプリに処理を委譲
    # path('post/new/', name='post_create'), # ← この行は削除する
]