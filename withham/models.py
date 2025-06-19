# withham/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
import re # 正規表現モジュール

# --- UserProfile モデル定義 ---
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField("自己紹介", blank=True, null=True)
    avatar = models.ImageField("プロフィール画像", upload_to='avatars/', null=True, blank=True)
    following = models.ManyToManyField(User, related_name='followers', symmetrical=False, blank=True)
    # ↓↓↓ ブックマーク用のフィールドを追加 ↓↓↓
    bookmarked_posts = models.ManyToManyField('Post', related_name='bookmarked_by', blank=True)

    def __str__(self):
        return self.user.username

# --- UserProfile シグナル ---
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        if hasattr(instance, 'profile'):
             instance.profile.save()
        else:
             UserProfile.objects.create(user=instance)
    except UserProfile.DoesNotExist:
         UserProfile.objects.create(user=instance)


# --- Hamster モデル定義 ---
class Hamster(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hamsters', verbose_name='飼い主')
    name = models.CharField('名前', max_length=100)
    breed = models.CharField('種類', max_length=50, blank=True, null=True)
    birthday = models.DateField('誕生日', blank=True, null=True)
    GENDER_CHOICES = [('M', '男の子'), ('F', '女の子'), ('U', '不明')]
    gender = models.CharField('性別', max_length=1, choices=GENDER_CHOICES, default='U')
    profile_text = models.TextField('プロフィール', blank=True, null=True)
    profile_image = models.ImageField('プロフィール画像', upload_to='hamster_images/', blank=True, null=True)
    created_at = models.DateTimeField('登録日時', default=timezone.now)

    def __str__(self):
        return f'{self.name} ({self.owner.username})'

    class Meta:
        verbose_name = 'ハムスター'
        verbose_name_plural = 'ハムスター'

# --- Tag モデル定義 ---
class Tag(models.Model):
    name = models.CharField("タグ名", max_length=50, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'タグ'
        verbose_name_plural = 'タグ'

# --- Post モデル定義 ---
class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts', verbose_name='投稿者')
    hamster = models.ForeignKey(Hamster, on_delete=models.SET_NULL, blank=True, null=True, related_name='posts', verbose_name='関連ハムスター')
    text = models.TextField('本文')
    image = models.ImageField('画像', upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField('投稿日時', default=timezone.now)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True, verbose_name='いいねしたユーザー')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts', verbose_name='タグ')
    post_as_hamster = models.BooleanField("ハムスターとして投稿", default=False)
    
    def __str__(self):
        return f'Post by {self.author.username} at {self.created_at.strftime("%Y-%m-%d %H:%M")}'

    def save(self, *args, **kwargs):
        is_new = self._state.adding # 新規作成かどうかを判定
        super().save(*args, **kwargs) # まず親クラスのsaveを呼び出してPostを保存
        # 新規作成時、または本文が変更された場合にタグを更新 (効率化のため)
        # if is_new or 'text' in kwargs.get('update_fields', []): # update_fieldsを使う場合
        self.update_tags() # 常に更新する場合 (シンプル)

    def update_tags(self):
        """投稿本文からハッシュタグを抽出し、関連付ける"""
        # ↓↓↓ 正規表現を修正 (より多くの文字種に対応) ↓↓↓
        # \w は英数字アンダースコア、\u3040-\u30ff はひらがな・カタカナ、\u4e00-\u9fff は漢字など
        hashtags = re.findall(r'#([\w\u3040-\u30ff\u4e00-\u9fff]+)', self.text)
        # ↑↑↑ 修正ここまで ↑↑↑

        new_tags = []
        for tag_name in hashtags:
            # タグ名が長すぎる場合はスキップ (任意)
            if len(tag_name) > 50: # Tagモデルのmax_lengthに合わせる
                continue
            tag, created = Tag.objects.get_or_create(name=tag_name.lower()) # 小文字で統一
            new_tags.append(tag)

        # set() を使って差分のみを更新
        current_tags = set(self.tags.all())
        tags_to_add = set(new_tags) - current_tags
        tags_to_remove = current_tags - set(new_tags)

        if tags_to_add:
            self.tags.add(*tags_to_add)
        if tags_to_remove:
            self.tags.remove(*tags_to_remove)

    class Meta:
        verbose_name = '投稿'
        verbose_name_plural = '投稿'
        ordering = ['-created_at']

# --- Comment モデル定義 ---
class Comment(models.Model):
    post = models.ForeignKey('Post', on_delete=models.CASCADE, related_name='comments', verbose_name='対象投稿')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name='投稿者')
    text = models.TextField("本文")
    created_at = models.DateTimeField("投稿日時", default=timezone.now)

    class Meta:
        verbose_name = 'コメント'
        verbose_name_plural = 'コメント'
        ordering = ['created_at']

    def __str__(self):
        text_summary = self.text[:20] + '...' if len(self.text) > 20 else self.text
        post_id_str = f'Post {self.post.id}' if self.post else 'Deleted Post'
        return f'{self.author.username}: "{text_summary}" on {post_id_str}'

# --- HealthLog モデル定義 ---
class HealthLog(models.Model):
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='health_logs', verbose_name='対象ハムスター')
    log_date = models.DateField("記録日", default=timezone.now)
    weight_g = models.DecimalField("体重(g)", max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField("様子・メモ", blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_health_logs', verbose_name='記録者')
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    class Meta:
        verbose_name = '健康記録'
        verbose_name_plural = '健康記録'
        ordering = ['-log_date', '-created_at']

    def __str__(self):
        return f"{self.hamster.name} - {self.log_date.strftime('%Y-%m-%d')}"

# --- Notification モデル定義 ---
class Notification(models.Model):
    LIKE = 'L'; COMMENT = 'C'; FOLLOW = 'F'
    NOTIFICATION_TYPES = [(LIKE, 'いいね'), (COMMENT, 'コメント'), (FOLLOW, 'フォロー')]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name='受信者')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions', verbose_name='実行者')
    verb = models.CharField("アクション", max_length=1, choices=NOTIFICATION_TYPES)
    target = models.ForeignKey('Post', on_delete=models.CASCADE, blank=True, null=True, related_name='notification_target', verbose_name='対象投稿')
    is_read = models.BooleanField("既読", default=False)
    timestamp = models.DateTimeField("日時", default=timezone.now)

    class Meta:
        verbose_name = '通知'
        verbose_name_plural = '通知'
        ordering = ['-timestamp']

    def __str__(self):
        if self.target:
            return f'{self.actor.username} {self.get_verb_display()} あなたの投稿 ({self.target.pk})'
        elif self.verb == self.FOLLOW:
             return f'{self.actor.username} があなたをフォローしました'
        else:
            return f'{self.actor.username} {self.get_verb_display()}'


# ★★★ Question モデルを追加 ★★★
class Question(models.Model):
    """飼育に関する質問モデル"""
    title = models.CharField("質問タイトル", max_length=200)
    text = models.TextField("質問内容")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questions', verbose_name='質問者')
    created_at = models.DateTimeField("質問日時", default=timezone.now)
    is_resolved = models.BooleanField("解決済み", default=False)

    class Meta:
        verbose_name = '質問'
        verbose_name_plural = '質問'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ★★★ Answer モデルを追加 ★★★
class Answer(models.Model):
    """質問への回答モデル"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers', verbose_name='対象質問')
    text = models.TextField("回答内容")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='answers', verbose_name='回答者')
    created_at = models.DateTimeField("回答日時", default=timezone.now)
    is_best_answer = models.BooleanField("ベストアンサー", default=False)

    class Meta:
        verbose_name = '回答'
        verbose_name_plural = '回答'
        ordering = ['created_at']

    def __str__(self):
        return f"Answer to {self.question.title} by {self.user.username}"

class Schedule(models.Model):
    """ハムスターの今後の予定を管理するモデル"""
    hamster = models.ForeignKey(Hamster, on_delete=models.CASCADE, related_name='schedules', verbose_name='対象ハムスター')
    title = models.CharField("タイトル", max_length=200)
    schedule_date = models.DateField("予定日")
    
    EVENT_CHOICES = [
        ('HOSPITAL', '病院'),
        ('CLEANING', '掃除'),
        ('BIRTHDAY', '誕生日'),
        ('OTHER', 'その他'),
    ]
    category = models.CharField("カテゴリ", max_length=10, choices=EVENT_CHOICES, default='OTHER')
    notes = models.TextField("メモ", blank=True, null=True)
    created_at = models.DateTimeField("作成日時", auto_now_add=True)

    class Meta:
        ordering = ['schedule_date'] # 予定日で並べ替え
        verbose_name = '予定'
        verbose_name_plural = '予定'

    def __str__(self):
        return f"{self.hamster.name} - {self.schedule_date}: {self.title}"
