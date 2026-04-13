# Withham SNS

Withham は、ユーザー同士がつながり、アイデアを共有できるソーシャルネットワーキングサービスです。**画面は React（Vite）SPA**、API は **Django REST Framework** で提供します。

## 機能

- ユーザー登録・ログイン（JWT）
- プロフィール・ハムスター・健康ログ・スケジュール
- 投稿・いいね・コメント・ハッシュタグ・Q&A・通知
- レスポンシブ UI（Tailwind CSS）

## 技術スタック

| 区分 | 内容 |
|------|------|
| バックエンド | Django 5.2、djangorestframework、JWT、django-cors-headers |
| データベース | 開発: SQLite / 本番: PostgreSQL（`DATABASE_URL` または `DB_*` 環境変数） |
| 本番サーバ | Gunicorn、Whitenoise（静的ファイル） |
| フロントエンド | React 19、TypeScript、Vite 6、Tailwind CSS 3（`withham_front/withham-frontend`） |
| 管理画面 | Django Admin（`/admin/`） |

## セットアップ（開発）

### 前提

- Python 3.10 以上
- Node.js 18 以上（推奨 LTS）

### 1. クローンと仮想環境

```bash
git clone https://github.com/aksunknk/Project-Withham.git
cd Project-Withham
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 環境変数（バックエンド）

プロジェクトルートに `.env` を置くか、シェルでエクスポートします。例は `.env.example` を参照。

- `DJANGO_SECRET_KEY`（本番では必ず強い値）
- `DJANGO_DEBUG`（開発は `True`、本番は `False`）
- `DJANGO_ALLOWED_HOSTS`（カンマ区切り）
- `DATABASE_URL` または `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT`
- `DJANGO_CORS_ORIGINS`（本番フロントのオリジンをカンマ区切りで追加可）
- `DJANGO_ACTIVATION_FRONTEND_URL`（サインアップメール内の有効化リンク先。既定は `http://localhost:5173`）

### 3. マイグレーションと（任意）静的収集

```bash
python manage.py migrate
python manage.py collectstatic --noinput   # 本番相当の確認時
```

### 4. フロントエンド（Vite）

```bash
cd withham_front/withham-frontend
npm install
cp .env.example .env.local
# .env.local で VITE_API_BASE_URL=http://127.0.0.1:8000 などを設定
npm run dev
```

### 5. API サーバ起動

別ターミナルでプロジェクトルートから:

```bash
python manage.py runserver
```

- API: `http://127.0.0.1:8000/api/`
- フロント（既定）: `http://127.0.0.1:5173`

### 6. レガシー Django テンプレート

サーバー側の HTML テンプレートは **廃止し、UI は React に統一**しています。Django は API と Admin のみです。

## テスト

```bash
python manage.py test
```

## デプロイ（Render 例）

1. **GitHub リポジトリを接続**し、Web サービスを作成する。
2. **ビルドコマンド**の例（`render.yaml` も参照）:
   - `npm install && npm run build:css && pip install -r requirements.txt && python manage.py migrate --noinput && python manage.py collectstatic --noinput`
3. **スタートコマンド**の例:
   - `gunicorn withham_project.wsgi:application --bind 0.0.0.0:$PORT`
4. **環境変数**は Render ダッシュボードの **Environment** にのみ設定する（**リポジトリにパスワードを書かない**）。
   - `DJANGO_SECRET_KEY`、`DJANGO_DEBUG=False`、`DJANGO_ALLOWED_HOSTS`
   - DB: `DATABASE_URL` または分割の `DB_*`
   - `DJANGO_CORS_ORIGINS`（デプロイしたフロントの URL）
   - フロントのビルド物を別サービスで出す場合は、その URL を `VITE_API_BASE_URL` 相当でビルド時に指定

詳細は [Render のドキュメント](https://render.com/docs) を参照してください。

## ライセンス

MIT License

## 貢献

1. フォークする  
2. ブランチを作成する（例: `git checkout -b feature/amazing-feature`）  
3. 変更をコミット・プッシュし、Pull Request を送る

## サポート

Issue にてお知らせください。
