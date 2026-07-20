# おうち掃除ログ — インタラクティブ・プロトタイプ

企画書（hifi）をそのままブラウザで触れるスタンドアロン実装です。ビルド不要・フレームワーク不要。

## 開き方

### いちばん簡単
Finder で `index.html` をダブルクリックするか、ブラウザにドラッグ＆ドロップ。

```bash
open prototype/index.html
```

### ローカルサーバー（推奨・date input 等で安定）
```bash
# ワークスペース root から
npx --yes serve prototype

# または Python
python3 -m http.server 5173 --directory prototype
```

ブラウザで表示された URL（例: `http://localhost:3000`）を開く。

## できること
- ホーム：ratio ソートのタスク一覧 / 「今日やった」1 タップ記録
- 長押し（480ms）→ 日付選択ボトムシート（今日 / 昨日 / おととい / date）
- 記録トースト（3.8 秒）＋「元に戻す」
- タスク追加・編集・履歴ごと削除（二段確認）
- 履歴画面（サマリー + 実施日リスト）
- localStorage 永続化（キー: `ouchi-souji-log-v1`）
- ダークモード切替（右上の太陽アイコン）/ 初回は `prefers-color-scheme`

## データリセット
ブラウザの DevTools → Application → Local Storage から `ouchi-souji-log-v1` を削除してリロード。

## 正本
- `docs/_spec/PRODUCT_BRIEF.md`
- `docs/00. 企画書/README.md`
