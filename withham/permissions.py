from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    オブジェクトの所有者のみが編集・削除を許可されるカスタム権限。
    読み取りは誰でも許可される。
    """

    def has_object_permission(self, request, view, obj):
        # 読み取りリクエスト(GET, HEAD, OPTIONS)は常に許可する
        if request.method in permissions.SAFE_METHODS:
            return True

        # 書き込みリクエストは、オブジェクトのauthorがリクエストユーザーと
        # 同一の場合のみ許可する
        return obj.author == request.user
