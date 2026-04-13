# withham/tests.py

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


class UserAuthAPITestCase(APITestCase):
    """ユーザー登録とログインAPI"""

    def setUp(self):
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

    def test_register_user_success(self):
        response = self.client.post(self.register_url, self.register_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')

    def test_register_user_password_mismatch(self):
        payload = self.register_payload.copy()
        payload['password2'] = 'WrongPassword'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data['detail'])

    def test_register_user_duplicate_username(self):
        self.client.post(self.register_url, self.register_payload, format='json')
        response = self.client.post(self.register_url, self.register_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data['detail'])

    def test_login_user_success(self):
        self.client.post(self.register_url, self.register_payload, format='json')
        User.objects.filter(username=self.user_data['username']).update(is_active=True)
        login_payload = {
            'username': self.user_data['username'],
            'password': self.user_data['password'],
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_user_wrong_password(self):
        self.client.post(self.register_url, self.register_payload, format='json')
        User.objects.filter(username=self.user_data['username']).update(is_active=True)
        login_payload = {
            'username': self.user_data['username'],
            'password': 'WrongPassword',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PostAPITestCase(APITestCase):
    """投稿一覧・作成（JWT）"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='poster', email='p@example.com', password='StrongPassword123'
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_posts_list_authenticated_returns_200(self):
        response = self.client.get('/api/posts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_create_post_json(self):
        response = self.client.post(
            '/api/posts/',
            {'text': 'hello #test'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author']['username'], 'poster')


class TrendingTagsAPITestCase(APITestCase):
    """トレンドタグ（要認証）"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='taguser', email='t@example.com', password='StrongPassword123'
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_trending_tags_returns_200(self):
        response = self.client.get('/api/tags/trending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
