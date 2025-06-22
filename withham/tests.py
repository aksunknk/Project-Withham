# withham/tests.py

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

class UserAuthAPITestCase(APITestCase):
    """ユーザー登録とログインAPIのテストケース"""

    def setUp(self):
        """テストの前に実行される共通の準備"""
        self.register_url = '/api/register/'
        self.login_url = '/api/token/'
        
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'StrongPassword123',
        }
        self.register_payload = {
            **self.user_data,
            'password2': 'StrongPassword123',
        }

    # --- ユーザー登録のテスト ---
    def test_register_user_success(self):
        """ユーザーが正常に登録できることをテストする"""
        response = self.client.post(self.register_url, self.register_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')
        print("✅ test_register_user_success: Passed")

    def test_register_user_password_mismatch(self):
        """パスワードが一致しない場合にエラーになることをテストする"""
        payload = self.register_payload.copy()
        payload['password2'] = 'WrongPassword'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # ★★★ 検証方法を修正 ★★★
        # レスポンスの 'detail' キーの値に 'password' という文字列が含まれているか確認
        self.assertIn('password', response.data['detail'])
        print("✅ test_register_user_password_mismatch: Passed")

    def test_register_user_duplicate_username(self):
        """同じユーザー名で登録しようとするとエラーになることをテストする"""
        self.client.post(self.register_url, self.register_payload, format='json') # 最初の登録
        response = self.client.post(self.register_url, self.register_payload, format='json') # 2回目の登録
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # ★★★ 検証方法を修正 ★★★
        # レスポンスの 'detail' キーの値に 'username' という文字列が含まれているか確認
        self.assertIn('username', response.data['detail'])
        print("✅ test_register_user_duplicate_username: Passed")
        
    # --- ログインのテスト ---
    def test_login_user_success(self):
        """登録済みのユーザーが正常にログインできることをテストする"""
        self.client.post(self.register_url, self.register_payload, format='json')
        login_payload = {
            'username': self.user_data['username'],
            'password': self.user_data['password'],
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        print("✅ test_login_user_success: Passed")

    def test_login_user_wrong_password(self):
        """間違ったパスワードでログインしようとするとエラーになることをテストする"""
        self.client.post(self.register_url, self.register_payload, format='json')
        login_payload = {
            'username': self.user_data['username'],
            'password': 'WrongPassword',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        print("✅ test_login_user_wrong_password: Passed")

