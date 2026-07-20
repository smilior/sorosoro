# Handoff: おうち掃除ログ（家庭の掃除タスク管理アプリ）

## Overview
家の掃除タスク（シーツ洗い、風呂の排水口など）の実施履歴と「次の目安」を管理するスマホ向けWebアプリ。カレンダー型ではなくリスト型で、「前回から何日経過したか」だけを見せる。サボりを責めないUIが最重要コンセプト。記録は1タップで完結する。

## About the Design Files
同梱の `ouchi-souji-log-prototype.dc.html` は **HTMLで作られたデザインリファレンス（動作プロトタイプ）** であり、そのまま本番コードとして流用するものではない。実装先のコードベースの環境（React / Vue / SwiftUI 等）と既存パターン・ライブラリを使って**このデザインを再現**すること。環境が未定の場合は、プロジェクトに最適なフレームワークを選定して実装する（モバイルファーストのWebアプリ想定）。

## Fidelity
**High-fidelity (hifi)**。色・タイポグラフィ・余白・角丸・インタラクションはすべて意図した最終見た目。既存ライブラリで再現すること。ただしiPhoneベゼル（デバイスフレーム）はプレゼン用であり実装対象外。

## Core Logic（最重要仕様）
```
Task
├ name        : タスク名
├ cycle_days  : 目安周期（日数）
└ logs[]      : 実施日の配列（"YYYY-MM-DD"、重複なし、ソート済み）

派生値（保存せず毎回計算）
├ last_done    = logs の最新日
├ elapsed_days = today - last_done（日付単位）
├ ratio        = elapsed_days / cycle_days（logs空 = 1.0 扱い）
└ next_due     = last_done + cycle_days
```
- **並び順**: ratio 降順（超過が大きい順）。同率は elapsed 降順。記録すると ratio が 0 になり自然に下へ移動する。
- **状態**: ratio >= 1.5 → `late`（赤系淡背景）/ ratio > 1 → `warn`（黄系淡背景）/ それ以外 → 通常カード。**警告アイコンや強い赤は使わない**（色はあくまで補助）。
- **記録**: 「今日やった」タップで logs に今日を追記。同日重複はブロックし「その日はすでに記録済みです」トースト。
- **固定スケジュールなし**: 予定日を過ぎても「未消化が溜まる」表現はしない。

## Screens / Views

### 1. ホーム（メイン）
- **Purpose**: 状況把握と1タップ記録。
- **Layout**: ヘッダー（アプリ名12px/700 sub色 + 今日の日付「7月20日（月）」22px/700、右に＋ボタン44×44px 角丸16px accent-soft背景）。下にカードリスト（縦スクロール、gap 10px、左右padding 16px）。
- **タスクカード**: 角丸20px、padding 15px 14px 15px 18px、背景は状態色（下記トークン）、shadow `0 1px 3px rgba(80,70,55,.06)`。左：タスク名16px/700（1行省略）＋メタ行12.5px「前回から**12日**・目安7日」（経過日数のみ強調 700: late→late-ink、warn→warn-ink、通常→ink。未記録は「まだ記録なし・目安7日」）。右：「今日やった」ボタン。
- **「今日やった」ボタン**: 高さ44px以上、角丸14px、チェックSVG＋テキスト13.5px/700。通常= accent-soft背景 + accent-ink文字。当日記録済み= accent背景 + 白文字「記録済み」。
- **リスト末尾ヒント**: 「「今日やった」を長押しすると、過去の日付でも記録できます」11.5px、sub色、中央。
- **空状態**: 「まだタスクがありません」＋「右上の＋から、気になる掃除を登録してみましょう」。

### 2. タスク登録・編集
- ヘッダー: 戻るボタン（38×38px card色、シェブロン）＋タイトル「タスクを追加 / タスクを編集」18px/700。
- タスク名入力: 角丸16px、border 1.5px line色（focus: accent）、font-size 16px（iOSズーム防止）、placeholder「例：シーツ洗い」。
- 周期プリセット3ボタン（毎週7日/隔週14日/毎月30日、等幅flex gap 8px）: 選択中= accent-soft背景+accentボーダー+accent-ink文字。非選択= card背景+lineボーダー+sub文字。＋数値入力「◯日ごと」（1〜365、幅86px、中央揃え）。
- 補足文: 「きっちり守れなくても大丈夫。あくまで「目安」です。あとからいつでも変えられます。」12px sub。
- 保存: 画面下部の全幅ボタン（padding 16px、角丸18px、accent背景+白文字。名前空/周期不正でdisabled = line背景+sub文字）。
- 削除（編集時のみ）: 上ボーダー区切りの下にテキストボタン「このタスクを削除」（del色）→ インライン二段確認「履歴ごと削除します。よい？［削除する（del背景・白文字）］［やめる］」。confirm()ダイアログは使わない。

### 3. 履歴
- ヘッダー: 戻る＋タスク名（1行省略）＋「編集」ボタン（accent-soft/accent-ink）。
- サマリーカード: 3カラムgrid（1fr 1fr 1.25fr）「目安の周期 7日ごと / 前回 3日前 / 次の目安 7月22日ごろ」（ラベル10.5px/700 sub、値14.5px/700）。「ごろ」表記で柔らかく。
- 「＋ 日付を選んで記録」全幅ボタン（accent-soft、角丸16px）→ 記録シートを開く。
- 履歴リスト: 1枚のカード（角丸20px）内に行区切り（1px line、最終行なし）。「7月18日（土）」14px/600 ＋ 右に「2日前 / 昨日 / 今日」12.5px sub。年が違う場合のみ「2025年」を前置。空なら「まだ記録がありません」。

### 記録シート（ボトムシート・オーバーレイ）
- 背景: rgba(42,36,28,.34)、タップで閉じる。シート: 左右下8px浮き、角丸28px、上部グラバー（36×4px）。表示は下から28pxスライドイン 0.28s。
- タイトル「日付を選んで記録」＋対象タスク名。クイックボタン3つ［今日/昨日/おととい］（タップで即記録）。date input（max=今日）＋「この日で記録」（accent・白文字）。「キャンセル」テキストボタン。

### トースト
- 画面下部中央（bottom 44px）、角丸16px、toast-bg背景、13px/600。「「シーツ洗い」を記録しました（今日）」＋「元に戻す」リンク（accent-bright色、**アンドゥで直前の記録1件を削除**）。3.8秒で自動消滅。

## Interactions & Behavior
- **1タップ記録**: カード上のボタンのみで完結（詳細画面を開かせない）。イベントはカードタップ（→履歴画面）に伝播させない。
- **長押し（480ms）**: 「今日やった」ボタン長押しで記録シートを開く。長押し発火後のclickは無視。`contextmenu` はpreventDefault、ボタンに `touch-action:manipulation` / `user-select:none` / `-webkit-touch-callout:none`。
- **記録時のフィードバック（達成感）**: (1) ボタンがpopアニメ（scale 1→1.1→1、0.5s）。(2) カード背景が accent-soft に一瞬変わり、1.1秒後に通常色へ（background-color transition .5s）。(3) リスト再ソートは **FLIPアニメーション**（transform translateY、480ms、cubic-bezier(.22,.9,.32,1)）でカードが滑って移動。(4) アンドゥ付きトースト。
- **画面遷移**: フェード＋上方向8pxスライドイン（0.22s ease）。戻る導線: 編集←→履歴は開いた元の画面へ戻る。削除後はホームへ。
- **バリデーション**: タスク名 trim後空 → 保存disabled。周期は1〜365にclamp。未来日の記録は不可（date inputのmax + ガード）。
- タップ要素は `:active` で scale(0.92〜0.985) の押下フィードバック。

## State Management
- `tasks[]`（永続化。プロトタイプはlocalStorage `ouchi-souji-log-v1`。本実装ではDB等）
- `screen: 'home' | 'edit' | 'history'`、`viewId`（履歴対象）、`editId`（null=新規）、`editFrom`（戻り先）
- フォーム: `fName`, `fCycle`, `confirmDel`
- `sheetTask`（記録シート対象taskId | null）、`sheetDate`
- `toast: { msg, undo: {id, date} | null } | null`、`doneFlash`（記録直後フラッシュ中のtaskId集合）
- 派生値（elapsed/ratio/next_due/並び順）は保存せずレンダー時に計算。
- 認証・通知・複数ユーザーは**スコープ外**（MVP）。

## Design Tokens
フォント: **Zen Maru Gothic**（Google Fonts、400/500/700）、fallback 'Hiragino Maru Gothic ProN', sans-serif。

ライトモード:
- `--bg` #F6F2EA — 画面背景（温かみのある紙色）
- `--card` #FFFFFF — カード・入力欄
- `--ink` #453F35 — 本文
- `--sub` #8C8370 — 補助テキスト・ラベル
- `--line` #EAE3D4 — ボーダー・区切り線
- `--accent` #6FA378 — アクセント（抹茶グリーン。テーマとして差替可: #7292C4 / #CE9A6B / #B08BB5）
- `--accent-ink` = color-mix(in oklab, accent 62%, #233326) — tinted上の文字
- `--accent-soft` = color-mix(in oklab, accent 14%, #FFFFFF) — ボタン淡背景
- `--accent-bright` = color-mix(in oklab, accent 55%, #FFFFFF) — トースト内リンク
- `--warn-bg` #F8EFD3 / `--warn-ink` #95762A — 少し超過（ratio>1）
- `--late-bg` #F8E5DA / `--late-ink` #B0654A — 大きく超過（ratio>=1.5）
- `--toast-bg` #39342B / `--toast-c` #FBF8F2
- `--del` #BC6248 — 削除（強い赤は使わない）

ダークモード（body.dark、対応推奨）:
`--bg` #201E19 / `--card` #2B2822 / `--ink` #EAE4D6 / `--sub` #A29882 / `--line` #3A362D / `--warn-bg` #37301C / `--warn-ink` #CDA94E / `--late-bg` #3C2A20 / `--late-ink` #D88F70 / `--toast-bg` #EDE7D9 / `--toast-c` #2B2822 / `--del` #D88F70 / accent-soft = color-mix(accent 20%, #2B2822) / accent-ink = color-mix(accent 60%, #EAF2EA)。`color-scheme` も切替（date input のネイティブUI対応）。

スケール: 角丸 12–20px（カード20 / ボタン13–18 / シート28）。タップ領域は最小44px。フォントサイズ 10.5 / 12 / 12.5 / 13.5 / 14 / 16 / 18 / 22px。シャドウは `0 1px 3px rgba(80,70,55,.06)` のみ（フラット基調）。

## Assets
外部アセットなし。アイコンはインラインSVG3種のみ（チェック✓、プラス＋、戻りシェブロン‹。stroke=currentColor、線幅2.2〜3、round cap/join）。絵文字は不使用。

## Files
- `ouchi-souji-log-prototype.dc.html` — 全3画面＋記録シート＋トーストを含む動作プロトタイプ（単一ファイル）。`<x-dc>` 内テンプレートにマークアップとインラインスタイル、`class Component` に全ロジック（ソート・派生値計算・FLIP・長押し・localStorage永続化）。ブラウザで直接開いて動作確認できる。iPhoneフレーム部分（IOSDevice / ios-frame.jsx参照）は実装対象外。

## デザイン原則（迷ったらこれ）
1. **サボりを責めない** — 期限切れ・警告・赤バッジを出さない。経過日数を淡々と見せるだけ。
2. **記録は1タップ** — 記録フローに画面遷移や確認を挟まない。取り消しはアンドゥで担保。
3. **メモ帳のトーン** — 丸ゴシック、たっぷりの余白、淡い色、フラット。毎日開いても疲れない。
