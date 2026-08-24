# Send to Cursor for GitHub

日本語 | [English](README.en.md)

GitHub の Pull Request（PR）や Issue の内容を、Cursor の新しいチャットへ送る Chrome 拡張です。

GitHub 上に追加されるボタンを押すと、リポジトリ、ブランチ、本文などを含むプロンプトが Cursor で開きます。既定では `cursor://` を直接使用し、独自の中継サーバーは使用しません。

## 主な機能

- PR 全体をレビュー
- PR コメントの内容を検証
- 失敗した CI チェックを調査
- Issue の実装方針を作成
- Issue コメントの内容を検証
- `Shift + クリック`でプロンプトをクリップボードへコピー
- 日本語・英語の表示とプロンプトに対応
- 対象ごとの表示切り替えとプロンプト編集

PR の **Conversation**、**Files changed**、**Checks** タブと、Issue ページに対応しています。

## インストール

1. このリポジトリをダウンロードまたはクローンする
2. Chrome で `chrome://extensions` を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」を選ぶ
5. このリポジトリのディレクトリを指定する

初回インストール時に設定ページが開きます。あとから開く場合は、ツールバーの拡張機能アイコンをクリックしてください。

## 使い方

GitHub の PR または Issue を開き、対象の近くに表示される **Cursor** ボタンをクリックします。

- 通常のクリック: Cursor で新しいチャットを開く
- `Shift + クリック`: プロンプトをコピーする

Chrome が `cursor://` の起動をブロックする場合は、設定の「リンクの開き方」を `https://cursor.com/link/` 経由に変更してください。

## 設定

設定ページでは、次の項目を変更できます。

- 表示言語（日本語 / English）
- Cursor を開く方法
- ボタンのラベルとアイコンのみの表示
- 5 種類の対象ごとの有効 / 無効
- 対象ごとのプロンプトテンプレート

テンプレートで使えるプレースホルダーは、各編集画面に表示されます。値を取得できなかったプレースホルダーを含む行は、生成するプロンプトから削除されます。

## 開発

### ローカルで動作確認

```bash
python3 tools/serve_test.py 8765
```

起動後、次の URL で GitHub の新旧 UI を模したフィクスチャを確認できます。

- `http://127.0.0.1:8765/octocat/hello-world/pull/42`
- `http://127.0.0.1:8765/octocat/hello-world/pull/42?ui=new`
- `http://127.0.0.1:8765/octocat/hello-world/issues/7`
- `http://127.0.0.1:8765/octocat/hello-world/issues/7?ui=new`

設定ページは Chrome 拡張として読み込んで確認してください。

### Chrome Web Store 用パッケージ

```bash
python3 tools/package.py
```

提出用 ZIP は `dist/` に作成されます。公開手順と掲載文は [docs/store-listing.md](docs/store-listing.md)、プライバシーポリシーは [docs/privacy-policy.md](docs/privacy-policy.md) にあります。

## 既知の制約

- 対応ホストは `https://github.com/*` のみです。
- Discussions、コミットコメント、コード検索、ファイル閲覧ページは対象外です。
- GitHub の DOM に依存するため、GitHub 側の UI 変更でボタンの表示や情報の取得に影響が出る可能性があります。
- 新しい Issue UI で Markdown 原文を取得できないコメントは、画面上のテキストで代用します。
- CI のログ全文はプロンプトに含まれません。
- Cursor のディープリンク上限を超える長い本文は末尾を省略します。

## ライセンス

[MIT License](LICENSE)
