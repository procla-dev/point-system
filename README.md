# point-system

キャンパスフェスティバル向けのポイントシステム。

仕様は [docs/SPECIFICATION.md](./docs/SPECIFICATION.md) を参照。

## 技術スタック

| 領域 | 技術 |
|---|---|
| バックエンド | Hono + Node.js |
| フロントエンド | React + Vite |
| スタイリング | Tailwind CSS |
| データベース | PostgreSQL |
| 実行環境 | Docker Compose |

## 開発環境のセットアップ

必要なもの: Docker / Docker Compose

```sh
cp .env.example .env
docker compose up -d --build
```

起動後のアクセス先:

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:5173 |
| バックエンド | http://localhost:8787 |
| PostgreSQL | localhost:5432 |

疎通確認:

```sh
curl http://localhost:8787/api/health
curl http://localhost:8787/api/health/db
```

フロントエンドの `/api/*` へのリクエストは Vite の proxy 経由でバックエンドに転送される。

`src/` はバインドマウントされているため、ソースを編集すると自動でリロードされる（フロントエンドは HMR、バックエンドは `tsx watch` による再起動）。

### よく使うコマンド

```sh
docker compose logs -f            # ログを追う
docker compose logs -f backend    # 特定サービスのログ
docker compose down               # 停止
docker compose down -v            # 停止してDBのデータも削除
docker compose up -d --build      # 依存を追加したあとの再ビルド
```

依存パッケージを追加したときは、ホスト側で `npm install` を実行して `package-lock.json` を更新したうえで `docker compose up -d --build` する。

### コンテナを使わない場合

```sh
# backend
cd backend && npm install
DATABASE_URL=postgres://point:point@localhost:5432/point_system npm run dev

# frontend
cd frontend && npm install && npm run dev
```

## ディレクトリ構成

```
.
├── backend/            Hono APIサーバー
│   └── src/
├── frontend/           React + Vite
│   └── src/
├── docs/               仕様書
└── docker-compose.yml
```

## コントリビューション

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。
