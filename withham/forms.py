# withham/forms.py

from django import forms
# UserCreationForm をインポート
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User # Userモデルもインポート
# ↓↓↓ 他のモデルもインポート ↓↓↓
from .models import Post, Hamster, UserProfile, Comment, HealthLog, Tag # Tagもインポート
# ↓↓↓ forms.ValidationError をインポート ↓↓↓
from django.core.exceptions import ValidationError
from .models import Post, Hamster, UserProfile, Comment, HealthLog, Tag, Notification, Question, Answer
from django.core.exceptions import ValidationError


# ★★★ PostForm を修正 ★★★
class PostForm(forms.ModelForm):
    """投稿フォーム"""

    class Meta:
        model = Post
        # ↓↓↓ 'post_as_hamster' をフィールドに追加 ↓↓↓
        fields = ['text', 'image', 'hamster', 'post_as_hamster']
        labels = {
            'text': '投稿内容',
            'image': '画像',
            'hamster': '関連するハムスター',
            'post_as_hamster': 'このハムスターとして投稿する', # ラベルを設定
        }
        widgets = {
            'text': forms.Textarea(attrs={'rows': 4}),
            # チェックボックスのスタイルはテンプレート側で調整する方が簡単
            # 'post_as_hamster': forms.CheckboxInput(attrs={'class': '...'}),
        }

    # フォーム初期化時にユーザー情報を受け取り、ハムスター選択肢を絞り込む
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None) # ビューから渡されたuserを取得、なければNone
        super().__init__(*args, **kwargs)

        # ユーザーが渡されていれば、hamsterフィールドの選択肢をそのユーザーのハムスターのみに絞る
        if user:
            self.fields['hamster'].queryset = Hamster.objects.filter(owner=user)
            # ユーザーがハムスターを登録していない場合は、ハムスター選択とチェックボックスを無効化（任意）
            if not self.fields['hamster'].queryset.exists():
                self.fields['hamster'].disabled = True
                self.fields['post_as_hamster'].disabled = True
                self.fields['hamster'].help_text = '投稿に関連付けるハムスターを先に登録してください。'
                self.fields['post_as_hamster'].help_text = 'ハムスターが登録されていないため、選択できません。'
        else:
             # user が渡されない場合（管理サイトなど）は全ハムスターを表示（またはエラー処理）
             pass

        # 「関連するハムスター」を任意選択にする (required=False)
        # ただし、チェックボックスがONの場合は必須にする (cleanメソッドで実装)
        self.fields['hamster'].required = False
        self.fields['hamster'].empty_label = "------ (なし) ------" # 未選択時の表示

    # バリデーションを追加
    def clean(self):
        cleaned_data = super().clean()
        post_as_hamster = cleaned_data.get("post_as_hamster")
        hamster = cleaned_data.get("hamster")

        # 「ハムスターとして投稿」にチェックが入っているのに、ハムスターが選択されていない場合
        if post_as_hamster and not hamster:
            # エラーメッセージを追加
            self.add_error('hamster', "ハムスターとして投稿するには、関連するハムスターを選択してください。")
            # または ValidationError を発生させる
            # raise ValidationError(
            #     "ハムスターとして投稿するには、関連するハムスターを選択してください。",
            #     code='hamster_required_for_post_as_hamster'
            # )

        return cleaned_data

# --- HamsterForm, UserProfileForm, CommentForm, HealthLogForm, SignUpForm は省略 ---
# (前のコードをここに含める)
class HamsterForm(forms.ModelForm):
    """ハムスター登録・編集フォーム"""
    birthday = forms.DateField(
        label="誕生日",
        required=False, # 任意入力に
        widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-control'})
    )
    class Meta:
        model = Hamster
        fields = ['name', 'breed', 'birthday', 'gender', 'profile_text', 'profile_image']
        # 必要に応じてウィジェットやラベルをカスタマイズ

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['bio', 'avatar']
        labels = { 'bio': '自己紹介', 'avatar': 'プロフィール画像', }
        widgets = { 'bio': forms.Textarea(attrs={'rows': 5}), }

class CommentForm(forms.ModelForm):
    """コメント投稿フォーム"""
    class Meta:
        model = Comment
        fields = ['text']
        widgets = {
            'text': forms.TextInput(attrs={
                'placeholder': 'コメントを追加...',
                'class': 'flex-grow border-none bg-[#f4ede7] rounded-full py-2 px-4 text-sm focus:ring-0 focus:outline-none placeholder-[#9c7349]'
            }),
        }
        labels = { 'text': '', }

class HealthLogForm(forms.ModelForm):
    """健康記録フォーム"""
    log_date = forms.DateField(
        label="記録日",
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50'
        })
    )
    weight_g = forms.DecimalField(
        label="体重(g)", required=False, max_digits=4, decimal_places=1,
        widget=forms.NumberInput(attrs={
            'type': 'number', 'step': '0.1', 'min': '0', 'placeholder': '例: 120.5',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50'
        })
    )
    notes = forms.CharField(
        label="様子・メモ", required=False,
        widget=forms.Textarea(attrs={
            'rows': 4, 'placeholder': 'ごはんの量、運動の様子、気づいたことなどを記録しましょう。',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50'
        })
    )
    class Meta:
        model = HealthLog
        fields = ['log_date', 'weight_g', 'notes']

class SignUpForm(UserCreationForm):
    """ユーザー登録用フォーム"""
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

# ★★★ QuestionForm を追加 ★★★
class QuestionForm(forms.ModelForm):
    """質問投稿フォーム"""
    class Meta:
        model = Question
        # ユーザーが入力するフィールドを指定 (authorはビューで設定)
        fields = ['title', 'text'] # 必要なら 'hamster' や 'tags' も追加
        labels = {
            'title': '質問のタイトル',
            'text': '質問の内容（困っていること、知りたいことなど）',
        }
        widgets = {
            'title': forms.TextInput(attrs={
                'placeholder': '例: ケージの掃除頻度は？',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
            }),
            'text': forms.Textarea(attrs={
                'rows': 6,
                'placeholder': '具体的な状況や、試したことなども書くと回答が集まりやすいです。',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
            }),
        }


# ★★★ AnswerForm を追加 ★★★
class AnswerForm(forms.ModelForm):
    """回答投稿フォーム"""
    class Meta:
        model = Answer
        # ユーザーが入力するのは回答内容のみ (question, authorはビューで設定)
        fields = ['text']
        labels = {
            'text': '', # ラベルは非表示にする想定
        }
        widgets = {
            'text': forms.Textarea(attrs={
                'rows': 3, # 少し小さめのテキストエリア
                'placeholder': '回答を入力...',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
            })
        }
