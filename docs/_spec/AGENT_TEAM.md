# おうち掃除ログ — エージェントチーム構成

**更新日**: 2026-07-20  
**方式**: Architect-as-Orchestrator  

## 現行スタック（設計の正）

**Next.js + Vercel + Turso + Better Auth + Google OAuth (GCP)** — ADR-0003  
共有ブリーフ: `docs/_spec/PRODUCT_BRIEF.md`

## チーム編成（初期成果物）

| 役割 | 担当 | 成果物 |
|------|------|--------|
| Architect | 本セッション | PRODUCT_BRIEF、ADR 方針、検証・統合 |
| Requirements | subagent | `docs/01_要件定義/*.html` |
| Basic Design | subagent | `docs/02_基本設計/*.html` + ADR-0003 |
| Implement | session / lanes | `src/` Next.js 実装 |

## 次レーン

| フェーズ | 推奨 |
|----------|------|
| 詳細設計・受け入れテストの現行スタック追従 | Design / QA |
| 機能追加 | grok-implementer |
| アーキ変更前 | fable-advisor |
