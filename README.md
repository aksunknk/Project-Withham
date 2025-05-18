# Withham SNS

Withhamは、ユーザー同士がつながり、アイデアを共有できるソーシャルネットワーキングサービスです。

## 機能

- ユーザー登録・ログイン
- プロフィール管理
- 投稿の作成・編集・削除
- ユーザー間のフォロー機能
- レスポンシブデザイン

## 技術スタック

### バックエンド
- Django 5.0
- PostgreSQL
- Gunicorn
- Whitenoise

### フロントエンド
- Tailwind CSS 3.4
- HTML5
- CSS3

## セットアップ手順

### 前提条件
- Python 3.8以上
- Node.js 14以上
- PostgreSQL

### 1. リポジトリのクローン
```bash
git clone [リポジトリURL]
cd withham_sns
```

### 2. 仮想環境の作成と有効化
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Python依存関係のインストール
```bash
pip install -r requirements.txt
```

### 4. Node.js依存関係のインストール
```bash
npm install
```

### 5. 環境変数の設定
`.env`ファイルを作成し、以下の変数を設定します：
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:password@localhost:5432/withham
```

### 6. データベースのセットアップ
```bash
python manage.py migrate
```

### 7. 静的ファイルの収集
```bash
python manage.py collectstatic
npm run build:css
```

### 8. 開発サーバーの起動
```bash
python manage.py runserver
```
### デプロイメント
 テストデプロイはrenderを使用

 ブランチ切り分け後にデプロイ方法を追記予定(5/1現在未実装)

<!-- 


 Herokuへのデプロイ\
 1. Heroku CLIをインストール\
 2. Herokuにログイン\
 3. アプリケーションを作成\
 4. 環境変数を設定\
 5. デプロイ\

```bash\
heroku create\
git push heroku main\
heroku run python manage.py migrate\
```\
-->

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。

## 貢献
1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 作者
[あなたの名前]

## サポート
問題や質問がある場合は、Issueを作成してください。 
