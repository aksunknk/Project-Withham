# withham/admin.py を編集します

from django.contrib import admin
from .models import Hamster, Post # 作成したモデルをインポート

# Register your models here.
admin.site.register(Hamster)
admin.site.register(Post)