# GitHub Cursor Link

GitHub のプルリクエストのコメントに、そのコメントを検証するプロンプト付きで Cursor の新しいチャットを開くボタンを追加する Chrome 拡張です。

中継サーバーを経由せず、`cursor://anysphere.cursor-deeplink/prompt?text=...` を直接開きます。

## できること

- PR コメントの絵文字リアクションボタンの右隣に `Cursor` ボタンを追加する
- クリックすると、以下を含むプロンプトが入った状態で Cursor の新規チャットが開く
  - リポジトリ / PR 番号 / PR URL / head ブランチ / base ブランチ（別ブランチで作業してしまわないよう、着手前の確認を明示的に指示する）
  - コメント URL / 投稿者 / 対象ファイル / 対象行
  - コメント本文（Markdown 原文）
  - 指摘の妥当性を検証し、修正箇所と方針を提示するまでを依頼する定型文（回答は日本語に固定）
- Shift + クリックで、開く代わりにプロンプトをクリップボードへコピーする

対応ページは PR の **Conversation** タブと **Files changed** タブです。PR の説明文（1 件目の本文）にはボタンを出しません。

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選ぶ

アイコンの PNG は `icons/icon.svg` から生成してコミット済みなので、通常は生成不要です。デザインを変えたときだけ以下を実行します（`brew install librsvg` が必要）。

```bash
for s in 16 32 48 128; do rsvg-convert -w $s -h $s icons/icon.svg -o icons/icon$s.png; done
```

## 設定

ツールバーの拡張機能アイコン（ピン留めしていない場合はパズルピースのメニュー内にある拡張機能名）をクリックすると設定ページが開き、以下を変更できます。`chrome://extensions` の拡張機能詳細にある「拡張機能のオプション」からも開けます。

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| リンクの開き方 | `cursor://` 直接 | Chrome に直接起動をブロックされる場合は `https://cursor.com/link/` 経由に切り替えます |
| ボタンのラベル | `Cursor` | 「ラベルを表示する」をオフにすると、アイコンのみの丸いボタンになります（ラベルの文字列はツールチップと読み上げ用の名前として残ります） |
| プロンプトのテンプレート | `src/config.js` の既定値 | 下記プレースホルダーが使えます |

### テンプレートのプレースホルダー

`{{repository}}` `{{prNumber}}` `{{prTitle}}` `{{prUrl}}` `{{headBranch}}` `{{headLabel}}` `{{baseBranch}}` `{{commentUrl}}` `{{author}}` `{{filePath}}` `{{lines}}` `{{commentBody}}`

値が取得できなかったプレースホルダーを含む行は、まるごと出力から削除されます。「対象ファイル:」のような見出しだけが残ることはありません。

`{{headLabel}}` は fork からの PR のときだけ `owner:branch` 形式で入り、同一リポジトリ内の PR では空になります。

## 実装メモ

### コメント本文の取り出し方

コメントの「...」メニューにある **Copy Markdown**（`clipboard-copy[value]`）が本文の Markdown 原文を持っているので、これを第一候補として使います。取れない場合は `.js-comment-body` の `innerText` にフォールバックします。

原文のうち画像（`<img>` / `<picture>` と、それらを包むリンク）は `src/prompt.js` で除去しています。画像はプロンプトに入れても情報にならないうえ、バッジ画像のリンクは `href` にプロンプトを URL エンコードして持つことがあり、それを本文として再エンコードすると数千文字に膨らんで後述の 8,000 文字制限を圧迫するためです。410 文字のプロンプトを埋め込んだバッジ 1 個で、ディープリンク上は 2,705 文字を占めました。

### ボタンの挿入位置

GitHub の DOM は現行の Rails 製と新しい React 製が混在しているため、以下の順で挿入先を探します（1 コメントにつき 1 個だけ挿入）。

1. `reactions-menu`（絵文字リアクションボタン）の直後
2. 表示されている `.comment-reactions` の末尾
3. コメントヘッダーの `.timeline-comment-actions` の先頭

### 縦位置の揃え方

リアクション行は `align-items: stretch` ですが、高さが確定している要素は `flex-start` 扱いになります。絵文字リアクションボタンとリアクションピルはどちらも 26px なので、ボタンも `height: 26px` にするだけで揃います。`align-self` は指定しません。リアクションが折り返して行が高くなったときに `center` を指定していると、上端揃えのままの絵文字ボタンとズレるためです。

### アイコン

`icons/icon.svg` がソースで、PNG はここからラスタライズしたものです。Chrome の拡張機能アイコンは SVG を受け付けず、Blink が扱えるラスタ形式に限られるため（[Manifest - Icons | Chrome Extensions](https://developer.chrome.com/docs/extensions/reference/manifest/icons): "They can, however, be in any raster format supported by Blink, including BMP, GIF, ICO, and JPEG." = 「ただし、BMP、GIF、ICO、JPEG を含む、Blink がサポートする任意のラスタ形式にすることもできます」）、生成した PNG をコミットしています。

図形はボタンのアイコン（`src/content.js` の `ICON_PATH`）と同じターミナルのプロンプト記号ですが、シェブロンの太さだけが違います。SVG 側は 2.5、`content.js` 側は 2.1 です。16px の PNG では 45 度の対角線がアンチエイリアスで 2px に散ってコントラストを失うため、ラスタ側だけ太らせています。ボタンは 12px 表示の SVG なので、同じ調整をしても 0.26px 相当の差にしかならず、そのままにしています。

### URL 長

Cursor のディープリンクは URL 全体で 8,000 文字が上限です（[Deeplinks | Cursor Docs](https://cursor.com/docs/reference/deeplinks) の FAQ: "Deeplink URLs have a maximum length of 8,000 characters." = 「ディープリンクの URL は最大 8,000 文字です」）。超える場合はコメント本文だけを二分探索で切り詰め、ブランチ名や依頼内容は必ず残します。

## 動作確認

`test/fixtures/review-thread.html`（GitHub のレビュースレッドの DOM を再現した架空のフィクスチャ）を使って、ブラウザ上でロジックを確認できます。

```bash
python3 tools/serve_test.py 8765
# ブラウザで開く
open http://127.0.0.1:8765/octocat/hello-world/pull/42
```

`location.pathname` から owner/repo/PR 番号を取り出す実装のため、サーバーは `/owner/repo/pull/123` 形式のパスでハーネスを返します。ページ下部に、抽出した PR 情報と生成されたプロンプトが表示されます。

## 既知の制約

- 対象は `https://github.com/*` のみです。GitHub Enterprise で使う場合は `manifest.json` の `content_scripts[].matches` にホストを追加してください。
- GitHub は PR ページを React 製の新 UI へ順次移行しています。ブランチ名やコメント本文の取得は新旧どちらの DOM でも動くよう複数の選択子を試しますが、今後の DOM 変更で取得できなくなる可能性があります。取得できなかった項目はプロンプトから該当行が落ちるだけで、ボタン自体は動作します。
- `cursor://` の起動は Chrome の外部プロトコル確認ダイアログを経由します。ブロックされる場合はオプションで `https://cursor.com/link/` 経由に切り替えてください。

## ファイル構成

```
manifest.json          拡張機能の定義 (Manifest V3)
src/config.js          既定設定とプロンプトテンプレート
src/prompt.js          本文の整形、テンプレート展開、ディープリンク組み立て
src/extract.js         GitHub の DOM から PR / コメント情報を抽出
src/content.js         ボタンの生成と挿入、DOM 監視
src/content.css        ボタンのスタイル
src/options.*          設定ページ
src/background.js      拡張機能アイコンのクリックで設定ページを開くサービスワーカー
icons/icon.svg         アイコンのソース（PNG はここから生成）
tools/serve_test.py    動作確認用のローカルサーバー
test/harness.html      フィクスチャを使ったロジック確認ページ
test/fixtures/         GitHub の DOM を再現したフィクスチャ
```

## ライセンス

[MIT License](LICENSE)
