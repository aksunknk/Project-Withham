# withham/models.py を編集します

from django.db import models
from django.contrib.auth.models import User # Django標準のユーザーモデル
from django.utils import timezone # タイムゾーン対応の日時
<<<<<<< HEAD
# ★ シグナルを使うためにインポート
from django.db.models.signals import post_save
from django.dispatch import receiver

=======
# ★ シグナルを使うためにインポート (ステップ2で説明)
from django.db.models.signals import post_save
from django.dispatch import receiver


>>>>>>> ddb4b7b7eafd9da8db9f8206bcdeba3747b626b2
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
    # ↓↓↓ この ManyToManyField を追加 ↓↓↓
    # blank=True で「いいね」が0件でもOKなようにする
    # related_name='liked_posts' で user.liked_posts.all() のように逆参照できる
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True, verbose_name='いいねしたユーザー')

<<<<<<< HEAD
=======

>>>>>>> ddb4b7b7eafd9da8db9f8206bcdeba3747b626b2
    def __str__(self):
        return f'Post by {self.author.username} at {self.created_at.strftime("%Y-%m-%d %H:%M")}'

    class Meta:
        verbose_name = '投稿'
        verbose_name_plural = '投稿'
        ordering = ['-created_at'] # 新しい投稿が上にくるように


# ★ UserProfile モデルを追加
class UserProfile(models.Model):
    # 標準のUserモデルと1対1で紐付ける (Userが削除されたらProfileも削除)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # 自己紹介文 (空でもOK)
    bio = models.TextField("自己紹介", blank=True, null=True)
    # プロフィール画像 (任意アップロード)
    avatar = models.ImageField("プロフィール画像", upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return self.user.username

# ★ Comment モデルを追加
class Comment(models.Model):
    """投稿へのコメントモデル"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments', verbose_name='対象投稿')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name='投稿者')
    text = models.TextField("本文")
    created_at = models.DateTimeField("投稿日時", default=timezone.now)

    class Meta:
        verbose_name = 'コメント'
        verbose_name_plural = 'コメント'
        ordering = ['created_at'] # 古い順に並べる（表示順）

    def __str__(self):
        # 管理画面などで分かりやすいように表示
        text_summary = self.text[:20] + '...' if len(self.text) > 20 else self.text
        return f'{self.author.username}: "{text_summary}" on {self.post.id}'


# ★ シグナルレシーバー関数 (ユーザー作成時に自動でUserProfileを作成)
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Userが保存されたら、関連するUserProfileも保存する
    # (OneToOneFieldの場合、必ずしも必要ではない場合もあるが念のため)
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        # まだUserProfileが存在しない場合は作成する (create_user_profileがあるなら通常不要)
        UserProfile.objects.create(user=instance)

# ★★★ HealthLog モデルを追加 ★★★
class HealthLog(models.Model):
    """ハムスターの健康記録モデル"""
    # どのハムスターの記録か (Hamsterが削除されたら記録も削除)
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='health_logs', verbose_name='対象ハムスター')
    # 記録日 (日付のみ)
    log_date = models.DateField("記録日", default=timezone.now) # デフォルトを今日の日付に
    # 体重 (小数点以下1桁まで、任意入力)
    weight_g = models.DecimalField("体重(g)", max_digits=4, decimal_places=1, null=True, blank=True)
    # その日の様子・メモ (任意入力)
    notes = models.TextField("様子・メモ", blank=True, null=True)
    # 記録を作成したユーザー (記録者、通常は飼い主だが念のため)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_health_logs', verbose_name='記録者')
    # データ作成日時 (自動記録)
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    class Meta:
        verbose_name = '健康記録'
        verbose_name_plural = '健康記録'
        # 記録日とハムスターの組み合わせで最新のものが上にくるように並び替え
        ordering = ['-log_date', '-created_at']
        # 同じハムスターの同じ日付の記録は1つだけにする制約 (任意)
        # unique_together = ('hamster', 'log_date')

    def __str__(self):
        return f"{self.hamster.name} - {self.log_date.strftime('%Y-%m-%d')}"
<<<<<<< HEAD
=======

>>>>>>> ddb4b7b7eafd9da8db9f8206bcdeba3747b626b2
