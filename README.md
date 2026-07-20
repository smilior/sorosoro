# おうち掃除ログ（sorosoro）

家の掃除タスクの実施履歴と「次の目安」を管理するスマホ向け Web アプリ。  
スタックは **menva-ai と同型**: **Next.js + Vercel + Turso + Better Auth + GCP (Google OAuth)**。

企画書: `docs/00. 企画書/`  
静的プロトタイプ（認証なし）: `prototype/index.html`

---

## 本番 CD（GitHub → Vercel / Turso）

| 経路 | トリガー | 内容 |
|------|----------|------|
| **アプリ** | `main` への push | Vercel が自動ビルド・本番デプロイ（手動 `vercel --prod` 不要） |
| **DB マイグレーション** | `main` push（`drizzle/**` 等変更時）または workflow_dispatch | GitHub Actions → 本番 Turso に `drizzle-kit migrate` |

リポジトリ: https://github.com/smilior/sorosoro

### 本番に必要な環境変数（Vercel Production）

| 変数 | 備考 |
|------|------|
| `TURSO_DATABASE_URL` | 本番 Turso `libsql://...` |
| `TURSO_AUTH_TOKEN` | 本番 DB トークン |
| `BETTER_AUTH_SECRET` | 本番用に生成（ローカルと別推奨） |
| `BETTER_AUTH_URL` | 本番 URL（例: `https://sorosoro.vercel.app`） |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 上と同じ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GCP。リダイレクトに本番 callback を追加 |

GitHub Actions の **production** environment secrets にも `TURSO_*` を設定する（migrate 用）。

---

## ローカル起動（最短）

### 前提

| ツール | 確認 |
|--------|------|
| Node.js 20+ | `node -v` |
| npm | `npm -v` |
| Turso CLI（任意・`turso dev` 利用時） | `turso --version` |

### 1. 依存関係

```bash
npm install
```

### 2. ローカル Turso を起動（必須）

```bash
# ターミナル 1 — データを local.db に永続化
npm run db:dev
# → http://127.0.0.1:8080
```

### 3. 環境変数

```bash
cp .env.example .env.local
# または（Turso 起動後）secret 生成 + スキーマ適用:
npm run setup:local
```

`.env.local` で最低限埋めるもの:

| 変数 | 説明 |
|------|------|
| `TURSO_DATABASE_URL` | ローカル既定 `http://127.0.0.1:8080` |
| `TURSO_AUTH_TOKEN` | ローカルは `local-dev`（drizzle-kit 用ダミー。sqld は検証しない） |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | GCP OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | GCP OAuth シークレット |

#### Google OAuth（GCP）設定

1. [Google Cloud Console](https://console.cloud.google.com/) → プロジェクト作成
2. **OAuth 同意画面**（外部）: スコープ `email`, `profile`, `openid`
3. **認証情報** → OAuth クライアント ID（ウェブ）
4. 承認済みリダイレクト URI:
   - `http://localhost:3000/api/auth/callback/google`
5. 発行された ID / シークレットを `.env.local` に貼る

### 4. DB スキーマ適用

```bash
npm run db:push
# または setup:local 内で実行済み
```

### 5. 開発サーバー

```bash
# ターミナル 2
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) → Google ログイン → ホーム。

初回ログイン時、サンプルタスクが自動投入されます。

---

## スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run dev` | Next.js 開発サーバー |
| `npm run build` / `start` | 本番ビルド |
| `npm run db:push` | スキーマを DB に反映 |
| `npm run db:generate` | マイグレーション SQL 生成 |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:dev` | ローカル Turso サーバー (`local.db`) |
| `npm run setup:local` | `.env.local` 生成 + `db:push` |

---

## アーキテクチャ（要約）

```
Browser
  └─ Next.js (App Router)
       ├─ Better Auth ── Google OAuth (GCP)
       ├─ Server Actions (tasks CRUD / 記録)
       └─ Drizzle ── Turso / libSQL
            ├ users / sessions / accounts
            ├ tasks (user_id, name, cycle_days)
            └ task_logs (task_id, done_date)
```

本番想定: **Vercel** ホスティング + リモート **Turso** + 同じ Better Auth / GCP OAuth。

---

## ディレクトリ

```
src/
  app/           # ルーティング (login, home, api/auth)
  actions/       # Server Actions
  components/    # UI
  lib/
    auth*.ts     # Better Auth
    db/          # Drizzle + schema
    domain/      # ratio / sort など
docs/            # 企画・要件・設計
prototype/       # 静的 hifi プロトタイプ
```

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| Google ログイン失敗 | リダイレクト URI が `.../api/auth/callback/google` か確認。CLIENT_ID/SECRET の再確認 |
| `TURSO_DATABASE_URL が未設定` | `.env.local` を作成し Next を再起動 |
| DB 接続失敗 | `npm run db:dev` が起動中か確認 |
| `drizzle-kit` が auth token を要求 | `TURSO_AUTH_TOKEN=local-dev` を設定 |
| DB テーブルなし | `npm run db:push` |
| Cookie が効かない | `BETTER_AUTH_URL` と実際のオリジンを一致させる |
