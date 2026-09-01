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
| リバースプロキシ / TLS | Caddy（本番のみ） |
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

## 本番デプロイ

`docker-compose.prod.yml` を使う。開発環境とは別の構成で、フロントエンドは Vite の開発サーバーではなくビルド済みの静的ファイルを Caddy が配信する。

```
ブラウザ ──HTTPS──> Caddy ┬─ /api/*  → backend (Hono)
                          └─ それ以外 → dist/ の静的ファイル
```

Caddy が指定したドメインで Let's Encrypt から証明書を自動取得し、HTTPSへリダイレクトする。フロントエンドとAPIが同一オリジンになるためCORSは不要。

### 前提

- サーバーに向いた**独自ドメイン**（証明書の取得に必要）
- **外部から 80 / 443 への着信が通ること**（Let's Encrypt の HTTP-01 チャレンジに必要）

HTTPSは必須。スタッフ端末でQRコードを読み取るには `getUserMedia` でカメラにアクセスする必要があり、これは secure context でないと利用できない。

### 手順

```sh
cp .env.production.example .env.production
# SITE_ADDRESS にドメイン、POSTGRES_PASSWORD にランダムな文字列を設定する
vi .env.production

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:migrate:dist
```

### 開発環境との違い

| | 開発 | 本番 |
|---|---|---|
| フロントエンド | Vite 開発サーバー (5173) | ビルド済み静的ファイルを Caddy が配信 (80/443) |
| バックエンド | `tsx watch`、8787を公開 | ビルド済みJSを `node` で実行、ポート非公開 |
| PostgreSQL | 5432を公開 | ポート非公開 |
| APIドキュメント | 公開 | 非公開（`ENABLE_API_DOCS=true` で有効化） |
| TLS | なし | Caddy が自動取得 |

証明書は `caddy-data` ボリュームに永続化される。このボリュームを消すと再起動ごとに証明書を再取得してレート制限に当たるため、削除しないこと。



## APIドキュメント

OpenAPI 3.1 の定義を Swagger UI で閲覧できる。

| 内容 | URL |
|---|---|
| Swagger UI | http://localhost:8787/api/docs |
| OpenAPI JSON | http://localhost:8787/api/openapi.json |

Vite の proxy 経由（http://localhost:5173/api/docs ）でも同じものが見える。本番では既定で無効。

定義はコードから生成される。ルートを追加するときは `@hono/zod-openapi` の `createRoute` でスキーマを書き、`backend/src/routes/` 以下に置いて `backend/src/app.ts` で `app.route()` に登録する。リクエスト/レスポンスの型は zod スキーマから導出されるため、実装とドキュメントがずれない。

## データベース

スキーマ定義は Drizzle ORM で `backend/src/db/schema.ts` に記述する。生成されたマイグレーションSQLは `backend/drizzle/` に置かれ、Gitで管理する。

初回起動後、マイグレーションを適用する:

```sh
docker compose exec backend npm run db:migrate
```

スキーマを変更したときは、マイグレーションを生成してから適用する:

```sh
docker compose exec backend npm run db:generate   # drizzle/ にSQLを生成
docker compose exec backend npm run db:migrate    # DBに適用
```

生成されたSQLは必ず内容を確認してからコミットする。

Drizzle Studio でデータを確認する:

```sh
docker compose exec backend npm run db:studio
```

### テーブル

| テーブル | 内容 |
|---|---|
| `users` | クライアント / スタッフ / 管理者。役割と表示名を持つ |

ブースやポイント履歴のテーブルは、仕様の詳細が固まってから追加する。

### よく使うコマンド

```sh
docker compose logs -f            # ログを追う
docker compose logs -f backend    # 特定サービスのログ
docker compose down               # 停止
docker compose down -v            # 停止してDBのデータも削除
docker compose up -d --build      # 依存を追加したあとの再ビルド
```

依存パッケージを追加したときは、ホスト側で `npm install` を実行して `package-lock.json` を更新したうえで、コンテナを再ビルドする。

```sh
docker compose up -d --build --renew-anon-volumes
```

`node_modules` はコンテナ内のものを使うため（ホストとプラットフォームが異なるとネイティブバイナリが動かない）、`--renew-anon-volumes` を付けて再生成する必要がある。

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
│   ├── drizzle/        マイグレーションSQL
│   └── src/
│       ├── db/         スキーマ定義とDBクライアント
│       └── routes/     ルート定義（OpenAPIスキーマ付き）
├── frontend/           React + Vite
│   └── src/
├── docs/               仕様書
├── docker-compose.yml       開発用
└── docker-compose.prod.yml  本番用
```

## コントリビューション

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。
