import re
from datetime import date
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

# -------------------------------------------------
# User Profile and Signals
# -------------------------------------------------

class UserProfile(models.Model):
    """ユーザーの追加情報を管理するモデル"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField("自己紹介", blank=True, null=True)
    avatar = models.ImageField("プロフィール画像", upload_to='avatars/', null=True, blank=True)
    following = models.ManyToManyField(User, related_name='followers', symmetrical=False, blank=True)
    bookmarked_posts = models.ManyToManyField('Post', related_name='bookmarked_by', blank=True)

    def __str__(self):
        return self.user.username

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """ユーザー作成時に、自動的にUserProfileを作成する"""
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """ユーザー保存時に、関連するUserProfileも保存する"""
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        # プロファイルが存在しない場合は作成する（念のため）
        UserProfile.objects.create(user=instance)

# -------------------------------------------------
# Hamster and Pet-related Models
# -------------------------------------------------

class Hamster(models.Model):
    """ハムスターのプロフィール情報を管理するモデル"""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hamsters', verbose_name='飼い主')
    name = models.CharField('名前', max_length=100)
    breed = models.CharField('種類', max_length=50, blank=True, null=True)
    birthday = models.DateField('誕生日', blank=True, null=True)
    GENDER_CHOICES = [('M', '男の子'), ('F', '女の子'), ('U', '不明')]
    gender = models.CharField('性別', max_length=1, choices=GENDER_CHOICES, default='U')
    profile_text = models.TextField('プロフィール', blank=True, null=True)
    profile_image = models.ImageField('プロフィール画像', upload_to='hamster_images/', blank=True, null=True)
    created_at = models.DateTimeField('登録日時', default=timezone.now)

    @property
    def age(self):
        """誕生日から現在の年齢を計算するプロパティ"""
        if not self.birthday:
            return None
        
        today = date.today()
        total_months = (today.year - self.birthday.year) * 12 + (today.month - self.birthday.month)
        
        if today.day < self.birthday.day:
            total_months -= 1
            
        if total_months < 0:
            return "これから生まれるよ！"

        years = total_months // 12
        months = total_months % 12

        age_str = ""
        if years > 0:
            age_str += f"{years}歳"
        if months > 0 or years == 0:
            age_str += f"{months}ヶ月"
        
        return age_str if age_str else "0ヶ月"

    def __str__(self):
        return f'{self.name} ({self.owner.username})'
    
    class Meta:
        verbose_name = 'ハムスター'
        verbose_name_plural = 'ハムスター'

class HealthLog(models.Model):
    """日々の健康記録を管理するモデル"""
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='health_logs', verbose_name='対象ハムスター')
    log_date = models.DateField("記録日", default=timezone.now)
    weight_g = models.DecimalField("体重(g)", max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField("様子・メモ", blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_health_logs', verbose_name='記録者')
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    class Meta:
        ordering = ['-log_date', '-created_at']
        verbose_name = '健康記録'
        verbose_name_plural = '健康記録'

class Schedule(models.Model):
    """ハムスターの今後の予定を管理するモデル"""
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='schedules', verbose_name='対象ハムスター')
    title = models.CharField("タイトル", max_length=200)
    schedule_date = models.DateField("予定日")
    EVENT_CHOICES = [
        ('HOSPITAL', '病院'), ('CLEANING', '掃除'), ('BIRTHDAY', '誕生日'), ('OTHER', 'その他'),
    ]
    category = models.CharField("カテゴリ", max_length=10, choices=EVENT_CHOICES, default='OTHER')
    notes = models.TextField("メモ", blank=True, null=True)
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    class Meta:
        ordering = ['schedule_date']
        verbose_name = '予定'
        verbose_name_plural = '予定'

# -------------------------------------------------
# SNS Core Models
# -------------------------------------------------

class Tag(models.Model):
    """投稿のハッシュタグ"""
    name = models.CharField("タグ名", max_length=50, unique=True)

    def __str__(self):
        return self.name

class Post(models.Model):
    """投稿モデル"""
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts', verbose_name='投稿者')
    hamster = models.ForeignKey(Hamster, on_delete=models.SET_NULL, blank=True, null=True, related_name='posts', verbose_name='関連ハムスター')
    text = models.TextField('本文')
    image = models.ImageField('画像', upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField('投稿日時', default=timezone.now)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True, verbose_name='いいねしたユーザー')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts', verbose_name='タグ')
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.update_tags()

    def update_tags(self):
        """投稿本文からハッシュタグを抽出し、関連付ける"""
        try:
            hashtags = re.findall(r'#([\w\u3040-\u30ff\u4e00-\u9fff]+)', self.text)
            current_tags = set(self.tags.all())
            new_tags_set = set()

            for tag_name in hashtags:
                tag, created = Tag.objects.get_or_create(name=tag_name.lower())
                new_tags_set.add(tag)

            # 差分を計算して更新
            self.tags.add(*new_tags_set.difference(current_tags))
            self.tags.remove(*current_tags.difference(new_tags_set))
        except Exception as e:
            # タグの更新に失敗しても投稿自体は成功させる
            print(f"Error updating tags for post {self.id}: {e}")
            # エラーをログに記録するだけで、例外は発生させない

    class Meta:
        ordering = ['-created_at']

class Comment(models.Model):
    """投稿へのコメントモデル"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments', verbose_name='対象投稿')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name='投稿者')
    text = models.TextField("本文")
    created_at = models.DateTimeField("投稿日時", default=timezone.now)

    class Meta:
        ordering = ['created_at']

# -------------------------------------------------
# Q&A Models
# -------------------------------------------------

class Question(models.Model):
    """Q&Aの質問モデル"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questions', verbose_name='質問者')
    title = models.CharField("質問タイトル", max_length=200)
    text = models.TextField("質問内容")
    created_at = models.DateTimeField("質問日時", default=timezone.now)
    is_resolved = models.BooleanField("解決済み", default=False)

    class Meta:
        ordering = ['-created_at']

class Answer(models.Model):
    """質問への回答モデル"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers', verbose_name='対象質問')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='answers', verbose_name='回答者')
    text = models.TextField("回答内容")
    created_at = models.DateTimeField("回答日時", default=timezone.now)
    is_best_answer = models.BooleanField("ベストアンサー", default=False)

    class Meta:
        ordering = ['-created_at']

# -------------------------------------------------
# Notification Model
# -------------------------------------------------

class Notification(models.Model):
    """ユーザーへの通知を管理するモデル"""
    LIKE = 'L'
    COMMENT = 'C'
    FOLLOW = 'F'
    NOTIFICATION_TYPES = [(LIKE, 'いいね'), (COMMENT, 'コメント'), (FOLLOW, 'フォロー')]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name='受信者')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions', verbose_name='実行者')
    verb = models.CharField("アクション", max_length=1, choices=NOTIFICATION_TYPES)
    target = models.ForeignKey(Post, on_delete=models.CASCADE, blank=True, null=True, related_name='notification_target', verbose_name='対象投稿')
    is_read = models.BooleanField("既読", default=False)
    timestamp = models.DateTimeField("日時", default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
