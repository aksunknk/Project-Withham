# withham/models.py

from django.db import models
from django.contrib.auth.models import User # Django標準のユーザーモデル
from django.utils import timezone # タイムゾーン対応の日時
# シグナルを使うためにインポート
from django.db.models.signals import post_save
from django.dispatch import receiver

# =============================================
# ユーザープロフィール関連
# =============================================

class UserProfile(models.Model):
    """ユーザープロフィールモデル"""
    # 標準のUserモデルと1対1で紐付ける (Userが削除されたらProfileも削除)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # 自己紹介文 (空でもOK)
    bio = models.TextField("自己紹介", blank=True, null=True)
    # プロフィール画像 (任意アップロード)
    avatar = models.ImageField("プロフィール画像", upload_to='avatars/', null=True, blank=True)
    # 'self' を使うと UserProfile同士でフォロー関係を持つことになるが、
    # Userモデルを直接参照する方がシンプルかもしれない。ここではUserを参照する。
    # symmetrical=False で、AがBをフォローしてもBがAをフォローするとは限らない非対称な関係を示す。
    # related_name='followers' で user.profile.followers.all() のようにフォロワーを取得できる。
    following = models.ManyToManyField(User, related_name='followers', symmetrical=False, blank=True)

    def __str__(self):
        # 管理画面などでユーザー名を表示
        return self.user.username

    class Meta:
        verbose_name = 'ユーザープロフィール'
        verbose_name_plural = 'ユーザープロフィール'

# シグナルレシーバー関数 (UserProfile自動作成用)
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    # 新規ユーザーが作成された(created=True)場合のみ実行
    if created:
        UserProfile.objects.create(user=instance) # 対応するUserProfileを作成

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        # OneToOneFieldの場合、User保存時に自動で関連profileも保存されることが多いが、
        # 明示的に呼ぶことで確実性を高める（特にprofileに他のロジックがある場合）
        # ただし、無限ループにならないよう注意が必要。ここでは単純なsaveのみ。
        # 存在しない場合のエラーハンドリングも含む。
        if hasattr(instance, 'profile'):
             instance.profile.save()
        else:
             # シグナルが呼ばれる前にprofileがない場合（通常はありえないが念のため）
             UserProfile.objects.create(user=instance)
    except UserProfile.DoesNotExist:
         UserProfile.objects.create(user=instance)



# =============================================
# ハムスター関連
# =============================================

class Hamster(models.Model):
    """ハムスターのモデル"""
    # 飼い主 (Userモデルと多対1の関係)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hamsters', verbose_name='飼い主')
    # 名前 (必須)
    name = models.CharField('名前', max_length=100)
    # 種類 (任意)
    breed = models.CharField('種類', max_length=50, blank=True, null=True)
    # 誕生日 (任意)
    birthday = models.DateField('誕生日', blank=True, null=True)
    # 性別の選択肢
    GENDER_CHOICES = [
        ('M', '男の子'),
        ('F', '女の子'),
        ('U', '不明'),
    ]
    # 性別 (デフォルトは'不明')
    gender = models.CharField('性別', max_length=1, choices=GENDER_CHOICES, default='U')
    # プロフィール文 (任意)
    profile_text = models.TextField('プロフィール', blank=True, null=True)
    # プロフィール画像 (任意)
    profile_image = models.ImageField('プロフィール画像', upload_to='hamster_images/', blank=True, null=True)
    # 登録日時 (自動記録)
    created_at = models.DateTimeField('登録日時', default=timezone.now)

    def __str__(self):
        # 管理画面などで「ハムスター名 (飼い主名)」を表示
        return f'{self.name} ({self.owner.username})'

    class Meta:
        # 管理画面での表示名
        verbose_name = 'ハムスター'
        verbose_name_plural = 'ハムスター'


# =============================================
# 投稿・コメント関連
# =============================================

class Post(models.Model):
    """投稿のモデル"""
    # 投稿者 (Userモデルと多対1の関係)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts', verbose_name='投稿者')
    # 関連するハムスター (Hamsterモデルと多対1の関係, 任意)
    hamster = models.ForeignKey(Hamster, on_delete=models.SET_NULL, blank=True, null=True, related_name='posts', verbose_name='関連ハムスター')
    # 投稿本文 (必須)
    text = models.TextField('本文')
    # 投稿画像 (任意)
    image = models.ImageField('画像', upload_to='post_images/', blank=True, null=True)
    # 投稿日時 (自動記録)
    created_at = models.DateTimeField('投稿日時', default=timezone.now)
    # いいねしたユーザー (Userモデルと多対多の関係)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True, verbose_name='いいねしたユーザー')

    def __str__(self):
        # 管理画面などで「Post by ユーザー名 at 日時」を表示
        return f'Post by {self.author.username} at {self.created_at.strftime("%Y-%m-%d %H:%M")}'

    class Meta:
        # 管理画面での表示名
        verbose_name = '投稿'
        verbose_name_plural = '投稿'
        # デフォルトの並び順 (新しい投稿が上に)
        ordering = ['-created_at']


class Comment(models.Model):
    """投稿へのコメントモデル"""
    # 対象となる投稿 (Postモデルと多対1の関係)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments', verbose_name='対象投稿')
    # コメント投稿者 (Userモデルと多対1の関係)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name='投稿者')
    # コメント本文 (必須)
    text = models.TextField("本文")
    # コメント投稿日時 (自動記録)
    created_at = models.DateTimeField("投稿日時", default=timezone.now)

    def __str__(self):
        # 管理画面などで「ユーザー名: "コメント冒頭..." on 投稿ID」を表示
        text_summary = self.text[:20] + '...' if len(self.text) > 20 else self.text
        return f'{self.author.username}: "{text_summary}" on Post {self.post.id}'

    class Meta:
        # 管理画面での表示名
        verbose_name = 'コメント'
        verbose_name_plural = 'コメント'
        # デフォルトの並び順 (古いコメントが上に)
        ordering = ['created_at']


# =============================================
# 健康記録関連
# =============================================

class HealthLog(models.Model):
    """ハムスターの健康記録モデル"""
    # 対象ハムスター (Hamsterモデルと多対1の関係)
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='health_logs', verbose_name='対象ハムスター')
    # 記録日 (必須, デフォルトは今日)
    log_date = models.DateField("記録日", default=timezone.now)
    # 体重(g) (任意, 小数点以下1桁まで)
    weight_g = models.DecimalField("体重(g)", max_digits=4, decimal_places=1, null=True, blank=True)
    # 様子・メモ (任意)
    notes = models.TextField("様子・メモ", blank=True, null=True)
    # 記録者 (Userモデルと多対1の関係, 任意)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_health_logs', verbose_name='記録者')
    # データ作成日時 (自動記録)
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    def __str__(self):
        # 管理画面などで「ハムスター名 - 日付」を表示
        return f"{self.hamster.name} - {self.log_date.strftime('%Y-%m-%d')}"

    class Meta:
        # 管理画面での表示名
        verbose_name = '健康記録'
        verbose_name_plural = '健康記録'
        # デフォルトの並び順 (記録日の新しい順)
        ordering = ['-log_date', '-created_at']
        # (任意) 同じハムスターの同じ日付の記録は1つだけにする制約
        # unique_together = ('hamster', 'log_date')

