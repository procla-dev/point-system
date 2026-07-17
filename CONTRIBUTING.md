# コントリビューション ガイド

## プルリクエスト

- `main` ブランチからブランチを切る
- ブランチ名: `feat/説明`, `fix/説明`, `docs/説明` など
- PRは1つの機能または修正に集中させる
- 提出前に `pnpm build` が通ることを確認する
- `main` への直接プッシュは禁止。すべての変更はPRを通す

## コミットメッセージ

```
prefix: 内容
```

### プレフィックス

- `feat` — 新機能
- `fix` — バグ修正
- `refactor` — 振る舞いを変えないコードの再構成
- `docs` — ドキュメント
- `chore` — ビルド、設定、その他のメンテナンス

### 例

```
feat: add border and shadow support to box node
fix: correct canvas scaling on HiDPI displays
refactor: split node rendering into separate modules for extensibility
docs: add CONTRIBUTING.md
```
