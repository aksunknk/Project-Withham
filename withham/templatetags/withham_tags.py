# withham/templatetags/withham_tags.py

from django import template
from django.utils.safestring import mark_safe
from django.urls import reverse
import re

register = template.Library()

@register.filter(name='linkify_hashtags')
def linkify_hashtags(value):
    """
    テキスト内の #ハッシュタグ を検索し、対応する検索ページへのリンクに変換するフィルター。
    例: #ごはん -> <a href="/tags/ごはん/">#ごはん</a>
    """
    # ハッシュタグを検出する正規表現 (英数字、アンダースコア、日本語などに対応する例)
    # 必要に応じて正規表現は調整してください
    hashtag_pattern = r'#([\w\u3040-\u30ff\u31f0-\u31ff\u3200-\u32ff\u3300-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+)'

    def replace_hashtag(match):
        tag_name = match.group(1)
        # ★★★ ハッシュタグ検索ページのURL名を 'hashtag_search' と仮定 ★★★
        #    (このURLパターンは後で urls.py に追加します)
        try:
            # URLを逆引きして生成
            url = reverse('withham:hashtag_search', kwargs={'tag_name': tag_name})
            # Tailwind CSSのクラスを適用したリンクを生成
            return f'<a href="{url}" class="text-blue-600 hover:underline">#{tag_name}</a>'
        except Exception:
            # URLの逆引きに失敗した場合などは、単にタグを表示（エラー回避）
            return f'#{tag_name}'

    # 正規表現にマッチした部分を replace_hashtag 関数で置換
    linked_text = re.sub(hashtag_pattern, replace_hashtag, value)

    # HTMLタグを安全なものとしてマークして返す
    return mark_safe(linked_text)

@register.filter
def hashtag_links(text):
    # ハッシュタグのパターン（日本語も含む）
    pattern = r'#([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)'
    
    # ハッシュタグをリンクに変換
    def replace_hashtag(match):
        hashtag = match.group(1)
        return f'<a href="/search/?q=%23{hashtag}" class="text-[#f2800d] hover:underline">#{hashtag}</a>'
    
    # テキスト内のハッシュタグを置換
    result = re.sub(pattern, replace_hashtag, text)
    return mark_safe(result)

