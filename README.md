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

## APIドキュメント

OpenAPI 3.1 の定義を Swagger UI で閲覧できる。

| 内容 | URL |
|---|---|
| Swagger UI | http://localhost:8787/api/docs |
| OpenAPI JSON | http://localhost:8787/api/openapi.json |

Vite の proxy 経由（http://localhost:5173/api/docs ）でも同じものが見える。

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
| `users` | ユーザー / スタッフ / 管理者。役割と表示名を持つ |
| `booths` | ブース |
| `point_balances` | ユーザーごとの現在のポイント残高 |
| `point_transactions` | ポイントの付与・消費履歴 |

ポイントを付与するAPIは `POST /api/users/points`。スタッフがユーザーの動的QRコードに含まれる `code` と、付与する正の整数 `points` を送信する。QRコードはサーバー側で検証されるため、ユーザーIDを外部から指定する必要はない。

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
└── docker-compose.yml
```

## コントリビューション

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。
