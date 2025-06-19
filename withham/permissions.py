# withham/permissions.py

from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    オブジェクトの所有者のみが編集・削除を許可されるカスタム権限。
    読み取りは誰でも許可される。
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

# ↓↓↓ 健康記録用の権限クラスを新しく追加 ↓↓↓
class IsOwnerOfHamsterObject(permissions.BasePermission):
    """
    関連するハムスターの所有者のみがオブジェクトを編集できるようにするカスタム権限。
    """
    def has_object_permission(self, request, view, obj):
        # HealthLogオブジェクトの場合、そのログが紐づくハムスターの所有者か確認
        if hasattr(obj, 'hamster'):
            return obj.hamster.owner == request.user
        return False
