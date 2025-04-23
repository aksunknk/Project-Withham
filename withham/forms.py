# withham/forms.py を新規作成

from django import forms
<<<<<<< HEAD
from .models import Post, Hamster
=======
from .models import Post, Hamster, UserProfile, Comment, HealthLog
>>>>>>> b6e6bb3 (no message)

class PostForm(forms.ModelForm):
    # ハムスター選択フィールドをカスタマイズ（任意）
    # このユーザーが登録したハムスターのみを選択肢にする
    # (ビュー側でユーザー情報を渡す必要があるので、ひとまずコメントアウトし、
    #  後述のビューで全ハムスターから選ぶか、フィールド自体を除外します)
    # hamster = forms.ModelChoiceField(
    #     queryset=Hamster.objects.none(), # 初期状態は空
    #     required=False, # 必須でない場合
    #     label='関連するハムスター'
    # )

    class Meta:
        model = Post
        # フォームに表示するフィールドを指定
        fields = ['text', 'image', 'hamster'] # 'author' はビューで設定
        # labels = { # 日本語ラベルを指定したい場合（任意）
        #     'text': '投稿内容',
        #     'image': '画像',
        #     'hamster': '関連するハムスター',
        # }
        widgets = { # 見た目を調整したい場合（任意）
            'text': forms.Textarea(attrs={'rows': 4}),
        }
class HamsterForm(forms.ModelForm):
    # 誕生日の入力ウィジェットをカレンダー選択にする（任意）
    birthday = forms.DateField(
        required=False, # 必須でない場合
        widget=forms.DateInput(attrs={'type': 'date'})
    )

    class Meta:
        model = Hamster
        # フォームに含めるフィールドを指定 (ownerはビューで設定)
        fields = ['name', 'breed', 'birthday', 'gender', 'profile_text', 'profile_image']
        labels = { # 日本語ラベル（任意）
            'name': '名前',
            'breed': '種類',
            'birthday': '誕生日',
            'gender': '性別',
            'profile_text': 'プロフィール',
            'profile_image': 'プロフィール画像',
        }
        widgets = { # 見た目の調整（任意）
            'profile_text': forms.Textarea(attrs={'rows': 4}),
<<<<<<< HEAD
        }
=======
        }

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        # 編集対象とするフィールド
        fields = ['bio', 'avatar']
        labels = { # 日本語ラベル（任意）
            'bio': '自己紹介',
            'avatar': 'プロフィール画像',
        }
        widgets = { # 見た目の調整（任意）
            'bio': forms.Textarea(attrs={'rows': 5}),
        }

class CommentForm(forms.ModelForm):
    """コメント投稿フォーム"""
    class Meta:
        model = Comment
        # フォームには本文フィールドのみ含める
        fields = ['text']
        # 入力欄の見た目を調整（placeholder追加、高さを1行に）
        widgets = {
            'text': forms.TextInput(attrs={
                'placeholder': 'コメントを追加...',
                'class': 'flex-grow border-none bg-[#f4ede7] rounded-full py-2 px-4 text-sm focus:ring-0 focus:outline-none placeholder-[#9c7349]' # Tailwindクラス適用
            }),
        }
        # ラベルは表示しないので空にする（テンプレート側で非表示にもできる）
        labels = {
            'text': '',
        }

class HealthLogForm(forms.ModelForm):
    """健康記録フォーム"""
    # 記録日の入力ウィジェットをカレンダー選択にする
    log_date = forms.DateField(
        label="記録日",
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
        })
    )
    # 体重の入力ウィジェット (数値入力、stepで0.1刻み)
    weight_g = forms.DecimalField(
        label="体重(g)",
        required=False, # 任意入力
        max_digits=4,
        decimal_places=1,
        widget=forms.NumberInput(attrs={
            'type': 'number',
            'step': '0.1', # 0.1刻みで入力できるように
            'min': '0',   # マイナス値は入力不可
            'placeholder': '例: 120.5',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
        })
    )
    # 様子・メモの入力ウィジェット (Textarea)
    notes = forms.CharField(
        label="様子・メモ",
        required=False, # 任意入力
        widget=forms.Textarea(attrs={
            'rows': 4,
            'placeholder': 'ごはんの量、運動の様子、気づいたことなどを記録しましょう。',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#f2800d] focus:ring focus:ring-[#f2800d] focus:ring-opacity-50' # Tailwindクラス
        })
    )

    class Meta:
        model = HealthLog
        # フォームに含めるフィールド (hamster, recorded_by はビューで設定)
        fields = ['log_date', 'weight_g', 'notes']

    # (任意) ログインユーザーが飼っているハムスターのみを選択肢にする場合
    # def __init__(self, *args, **kwargs):
    #     user = kwargs.pop('user', None)
    #     super().__init__(*args, **kwargs)
    #     # このフォームではhamsterフィールドは直接使わないが、
    #     # もしビューでハムスターを選択させる場合はここでquerysetを絞り込む
    #     # self.fields['hamster'].queryset = Hamster.objects.filter(owner=user)
>>>>>>> b6e6bb3 (no message)
