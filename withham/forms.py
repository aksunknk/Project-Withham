# withham/forms.py を新規作成

from django import forms
from .models import Post, Hamster

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
        }