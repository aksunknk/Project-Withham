# withham/exceptions.py

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # DRFのデフォルトの例外ハンドラをまず呼び出す
    response = exception_handler(exc, context)

    # デフォルトで処理された例外の場合
    if response is not None:
        # エラーデータの形式を統一する
        # デフォルトは {'field_name': ['error message']} のような形式
        # これを {'detail': 'field_name: error message'} のような形式に統一
        if isinstance(response.data, dict):
            error_messages = []
            for key, value in response.data.items():
                if isinstance(value, list):
                    error_messages.append(f"{key}: {value[0]}")
                else:
                    error_messages.append(f"{key}: {value}")
            response.data = {'detail': ' '.join(error_messages)}
        else:
            response.data = {'detail': str(response.data)}

    # デフォルトで処理されなかった未知の例外の場合
    else:
        response = Response(
            {'detail': 'An unexpected error occurred.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response