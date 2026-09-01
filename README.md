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
| `booths` | ブース。種別（展示 / カジノ / 景品交換）と展示ブースの付与ポイント数 |
| `users` | クライアント / スタッフ / 管理者。スタッフは担当ブースに紐づく |
| `point_transactions` | ポイントの変動履歴。正の値が付与、負の値が消費 |

ポイント残高は `point_transactions.amount` の合計から算出する（残高カラムは持たない）。

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
│   ├── drizzle/        マイグレーションSQL
│   └── src/
│       └── db/         スキーマ定義とDBクライアント
├── frontend/           React + Vite
│   └── src/
├── docs/               仕様書
└── docker-compose.yml
```

## コントリビューション

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。
