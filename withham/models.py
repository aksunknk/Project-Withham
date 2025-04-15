# withham/models.py を編集します

from django.db import models
from django.contrib.auth.models import User # Django標準のユーザーモデル
from django.utils import timezone # タイムゾーン対応の日時

class Hamster(models.Model):
    """ハムスターのモデル"""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hamsters', verbose_name='飼い主')
    name = models.CharField('名前', max_length=100)
    breed = models.CharField('種類', max_length=50, blank=True, null=True)
    birthday = models.DateField('誕生日', blank=True, null=True)
    GENDER_CHOICES = [
        ('M', '男の子'),
        ('F', '女の子'),
        ('U', '不明'),
    ]
    gender = models.CharField('性別', max_length=1, choices=GENDER_CHOICES, default='U')
    profile_text = models.TextField('プロフィール', blank=True, null=True)
    profile_image = models.ImageField('プロフィール画像', upload_to='hamster_images/', blank=True, null=True)
    created_at = models.DateTimeField('登録日時', default=timezone.now)

    def __str__(self):
        return f'{self.name} ({self.owner.username})'

    class Meta:
        verbose_name = 'ハムスター'
        verbose_name_plural = 'ハムスター'


class Post(models.Model):
    """投稿のモデル"""
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts', verbose_name='投稿者')
    hamster = models.ForeignKey(Hamster, on_delete=models.SET_NULL, blank=True, null=True, related_name='posts', verbose_name='関連ハムスター')
    text = models.TextField('本文')
    image = models.ImageField('画像', upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField('投稿日時', default=timezone.now)

    def __str__(self):
        return f'Post by {self.author.username} at {self.created_at.strftime("%Y-%m-%d %H:%M")}'

    class Meta:
        verbose_name = '投稿'
        verbose_name_plural = '投稿'
        ordering = ['-created_at'] # 新しい投稿が上にくるように

# --- 今後、Comment, Like, Follow モデルなどもここに追加していきます ---