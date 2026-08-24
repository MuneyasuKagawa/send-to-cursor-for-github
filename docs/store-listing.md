# Chrome ウェブストア提出メモ

デベロッパーダッシュボードの各タブに入れる内容と、提出前に確かめることをまとめたもの。掲載文はここからコピーして貼る。

出典は [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish) と [Supplying Images](https://developer.chrome.com/docs/webstore/images)、[Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)、[Updated Privacy Policy & Secure Handling Requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)。

## 提出物

| 項目               | 場所                                                  | 必須                     |
| ------------------ | ----------------------------------------------------- | ------------------------ |
| ZIP                | `python3 tools/package.py` → `dist/`                   | 必須                     |
| ストアアイコン     | `store-assets/store-icon-128.png`                     | 必須（128x128）          |
| 小プロモタイル     | `store-assets/promo-small-440x280.png`                | 必須（440x280）          |
| マーキータイル     | `store-assets/promo-marquee-1400x560.png`             | 任意（1400x560）         |
| スクリーンショット | `store-assets/screenshots/`（設定ページは `tools/shoot_options.py`） | 1 枚以上・最大 5 枚      |
| プライバシーポリシー | `docs/privacy-policy.md`                              | 必須（後述のとおり該当） |

スクリーンショットは 1280x800 か 640x400 のみ。余白やダミーの枠を足さず、そのままの大きさで出す。

`store-assets/screenshots/` には次の画像がある。

| ファイル | 中身 |
| -------- | ---- |
| `github-1-pr-header.png` | PR ヘッダーに出るボタン |
| `github-2-pr-comment.png` | レビューコメントに出るボタン |
| `cursor-new-chat-ja.png` / `cursor-new-chat-en.png` | ボタンを押して Cursor に渡ったプロンプト |
| `options-prompt-ja.png` / `options-prompt-en.png` | プロンプトを編集する画面 |
| `options-general-ja.png` / `options-general-en.png` | 一般設定の画面（差し替え用の予備） |

GitHub の 2 枚はボタンのラベルが `Cursor` で日英とも同じなので、ロケールごとに分ける必要がない。Cursor のダイアログと設定ページの画像はロケールごとに入れ替える。先頭がいちばん見られるので、GitHub 上のボタンを前に置く。

### ローカライズ版アセットと全言語向けアセット

掲載欄は「ローカライズ版アセット」と「全言語向けアセット」に分かれている。スクリーンショットはどちらの欄も 1 枚以上・最大 5 枚が必須（ダッシュボードの両方に `*` が付く）。ローカライズできるのは詳細な説明・スクリーンショット・プロモーション動画だけで、ストアアイコンと 2 種のプロモタイルは全言語向けにしか置けない（[Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing): "The small tile and Marquee promo tile cannot be localized."）。

| 欄 | 入れる 4 枚 |
| -- | ----------- |
| ローカライズ版（日本語。上部のプルダウンで選ぶ） | `github-1-pr-header.png` → `github-2-pr-comment.png` → `cursor-new-chat-ja.png` → `options-prompt-ja.png` |
| ローカライズ版（English） | `github-1-pr-header.png` → `github-2-pr-comment.png` → `cursor-new-chat-en.png` → `options-prompt-en.png` |
| 全言語向け | 上の English と同じ 4 枚 |

全言語向けを英語にするのは、デフォルトロケールが日本語でも、日英以外の言語で見る人には英語のほうが読めるため。表示は「ローカライズ版 → 全言語向け」の順に並ぶので（同ページの表示順）、各欄を 4 枚に抑えて、同じ絵が続いて見えるのを短くしておく。

`cursor-new-chat-*.png` は Cursor 側のダイアログなので手で撮る。ウィンドウを撮って（Cmd+Shift+4 → Space → Option を押しながらウィンドウをクリックすると影が付かない）、`magick <元画像> -crop 1280x800+320+123 +repage -strip <出力>` で中央から等倍で切り出す。縮小せず切り出すのは、全体を 1280 幅に縮めるとプロンプトの文字が読めなくなるため。オフセットは元画像が 1919x1047 のときの値なので、寸法が違うときは `(幅-1280)/2` と `(高さ-800)/2` で計算し直す。

## Store listing タブ

- 名前: `Send to Cursor for GitHub`（manifest の `name`。75 文字以内）
- 概要: manifest の `description` が使われる（132 文字以内。日英とも収まっている）
- カテゴリ: Developer Tools（開発者向けツール）
- 言語: 日本語 / English
- Homepage URL: `https://github.com/MuneyasuKagawa/send-to-cursor-for-github`
- Support URL: `https://github.com/MuneyasuKagawa/send-to-cursor-for-github/issues`
- 成人向けコンテンツ: いいえ

詳細な説明は言語ごとに入れられる（`_locales` にあるロケールが選べる）。掲載する機能の説明が言語間でずれると警告が出るので、下の 2 つは同じ内容にしてある。

### 詳細な説明（日本語）

```
GitHub の PR と Issue に、その内容を渡すプロンプト付きで Cursor の新しいチャットを開くボタンを追加します。

コピーして貼り直す手間なく、見ていた PR やコメント、失敗した CI チェックの内容をそのまま Cursor に渡せます。

■ ボタンを付けられる場所（対象ごとにオン/オフできます）
・PR 全体 — PR ヘッダーと説明文。base と head の差分をレビューさせます
・PR のコメント — レビューコメントの内容を検証し、対応方針を出させます
・失敗した CI チェック — Checks タブの失敗した行から、原因を調査させます
・Issue の本文 — 実装方針を立てさせます
・Issue のコメント — コメントの内容を検証し、対応方針を出させます

■ 特徴
・中継サーバーを経由せず、cursor:// のディープリンクで直接 Cursor を開きます
・プロンプトは対象ごとに編集できます。{{prTitle}} や {{commentBody}} などのプレースホルダーが使えます
・値が取れなかったプレースホルダーの行は自動で削除されるので、空の見出しが残りません
・コメントや説明文は Markdown 原文のまま渡します
・Shift + クリックで、開く代わりにプロンプトをクリップボードへコピーします
・表示言語は日本語と英語。プロンプトの既定値も言語ごとに用意していて、編集内容は言語ごとに保存されます
・ボタンはラベル付きとアイコンのみを選べます

■ 使うには
・Cursor アプリがインストールされている必要があります
・cursor:// の起動が Chrome にブロックされる場合は、設定ページで https://cursor.com/link/ 経由に切り替えられます

■ プライバシー
・PR や Issue の内容を読むのは、ボタンに持たせるプロンプトを組み立てるためだけです
・読み取った内容を保存したり、開発者に送ったりすることはありません（開発者のサーバーはありません）
・保存するのは設定だけです
・ソースコードはすべて公開しています: https://github.com/MuneyasuKagawa/send-to-cursor-for-github

GitHub は GitHub, Inc. の商標です。Cursor は Anysphere Inc. の商標です。本拡張は個人が作ったもので、どちらの提供元でもなく、提供元による承認も受けていません。
```

### 詳細な説明（English）

```
Adds a button to GitHub pull requests and issues that opens a new Cursor chat with a prompt carrying their content.

No copying and pasting: hand the pull request, the review comment, or the failing CI check you were looking at straight to Cursor.

■ Where the button appears (each can be turned off)
・Pull request — the PR header and description; asks Cursor to review the diff between base and head
・Pull request comment — asks Cursor to check the comment and propose how to address it
・Failing CI check — from a failing row in the Checks tab, asks Cursor to investigate the cause
・Issue body — asks Cursor to plan the implementation
・Issue comment — asks Cursor to check the comment and propose how to address it

■ Details
・Opens Cursor directly through a cursor:// deeplink, with no relay server in between
・Prompts are editable per target, with placeholders such as {{prTitle}} and {{commentBody}}
・Lines holding a placeholder that had no value are dropped, so no empty headings are left behind
・Comment and description text is passed as its original Markdown
・Shift-click copies the prompt to the clipboard instead of opening Cursor
・Japanese and English, with default prompts and edits kept per language
・The button can show a label or just the icon

■ Requirements
・The Cursor app must be installed
・If Chrome blocks the cursor:// launch, the options page can switch to going through https://cursor.com/link/

■ Privacy
・The extension reads pull request and issue content only to build the prompt its button will carry
・It never stores that content and never sends it to the developer (there is no developer server)
・The only thing it stores is your settings
・The source is public: https://github.com/MuneyasuKagawa/send-to-cursor-for-github

GitHub is a trademark of GitHub, Inc. Cursor is a trademark of Anysphere Inc. This extension is an independent project, is not affiliated with either, and is not endorsed by either.
```

## Privacy タブ

### 単一目的の説明

日本語:

```
GitHub の PR / Issue ページに、開いている内容を渡すプロンプト付きで Cursor の新しいチャットを開くボタンを追加することが唯一の目的です。他の機能はありません。
```

English:

```
The single purpose is to add a button to GitHub pull request and issue pages that opens a new Cursor chat with a prompt carrying the content the user is viewing. The extension does nothing else.
```

### 権限の理由

| 権限                         | 書く内容                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                    | 利用者が設定ページで選んだ設定（表示言語、リンクの開き方、ボタンのラベル、対象ごとの有効/無効、編集したプロンプト）を保存するためだけに使います。ページから読み取った内容は保存しません。               |
| ホスト権限 `https://github.com/*` | この拡張のボタンは GitHub の PR / Issue ページにだけ入ります。ボタンを差し込み、プロンプトに載せる内容（タイトル、ブランチ名、本文、失敗したチェック）をそのページから読むために必要です。他のサイトでは動きません。 |

英語で書く場合:

```
storage: Used only to persist the settings the user chooses on the options page (display language, how to open the link, the button label, which targets are enabled, and edited prompt templates). No page content is stored.

Host permission for https://github.com/*: The button is injected only into GitHub pull request and issue pages. The access is needed to insert the button and to read what goes into the prompt (title, branch names, body text, failing checks) from the page the user has open. The extension does not run on any other site.
```

リモートコードは使わない（すべて ZIP に同梱、外部スクリプトの読み込みなし）ので、該当の質問には「いいえ」を選ぶ。

### データ利用の申告

ページの内容を読むこと自体が「user data の handling」に当たる。読み取った内容を端末の外に出さない場合でも申告とプライバシーポリシーが必要（[User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) Q3: "Yes. Extensions are required to disclose how they handle user data, even when data is processed or stored locally on a user's device and is not transmitted to external servers or third parties." = 「はい。拡張機能は、データが利用者の端末の中だけで処理・保存され、外部のサーバーや第三者に送信されない場合でも、user data の取り扱いを開示する必要があります」）。

- チェックする項目: **Website content**（PR / Issue のタイトル・本文・コメント・チェックの出力）
- チェックしない項目: 個人を識別する情報 / 健康 / 金融 / 認証情報 / 個人的な通信 / 位置情報 / 閲覧履歴 / ユーザー行動 — いずれも取得していない
- 3 つの証明にはすべて同意できる（第三者への売却なし、単一目的と無関係な用途への利用なし、信用調査目的の利用なし）

`https://cursor.com/link/` 経由を選んだときはプロンプトが cursor.com に渡るが、これは単一目的そのものの実現に必要な受け渡しで、Limited Use の「allowed transfer」に当たる（同 FAQ: "Developers are only allowed to transfer user data to others if that transfer is (a) necessary to provide or improve the single purpose of the extension" = 「開発者が user data を他者に渡せるのは、その受け渡しが (a) 拡張機能の単一目的の提供または改善に必要な場合」）。既定は `cursor://` の直接起動でネットワークに出ないこと、web 経由は利用者が選んだときだけであることを、プライバシーポリシーに書いてある。

### プライバシーポリシーの URL

```
https://github.com/MuneyasuKagawa/send-to-cursor-for-github/blob/main/docs/privacy-policy.md
```

Limited Use の開示はホームページか、そこから 1 クリックで届くページに置く必要がある。README からリンクしてあり、ポリシー内に「Chrome Web Store の Limited Use について」の節を置いている。

## Test instructions タブ

ログインは不要だが、ログアウトのままだとヘッダーにはボタンが出ない（GitHub がヘッダーのアクション列を隠すため。ログアウトの Chrome で確認済み）。出る場所を先に伝えておく。

```
No account is needed for this extension itself.

1. Open any GitHub pull request, for example
   https://github.com/facebook/react/pull/37143
2. A "Cursor" button is added at the end of the reaction row under the description,
   and next to the actions of each comment.
   While signed out of GitHub the pull request header has no visible action row, so the
   header button is skipped; signing in to GitHub adds one more button up in the header.
3. Shift-click the button to copy the generated prompt to the clipboard instead of
   launching the app. This shows exactly what the extension would send, without
   installing Cursor.
4. A plain click opens cursor://anysphere.cursor-deeplink/prompt?text=... , which needs
   the Cursor app. The options page can switch this to
   https://cursor.com/link/prompt?text=... instead.
```

## GitHub 上のスクリーンショットの撮り方

ヘッダーに出るボタンは GitHub にログインしているときだけなので、ここは手で撮る（コマンドラインの `--load-extension` は Chrome 137 以降のブランド版では無視されるため、ヘッドレスでまとめて撮ることもできない。自動化するなら `--remote-debugging-port` と `--enable-unsafe-extension-debugging` を付けて起動し、CDP の `Extensions.loadUnpacked` で読み込む）。

1. `chrome://extensions` でデベロッパーモードをオンにし、このディレクトリを「パッケージ化されていない拡張機能を読み込む」で読み込む
2. GitHub にログインし、見せたい PR を開く（自分のリポジトリの PR が無難。他人の PR を載せると、その内容ごと掲載することになる）
3. DevTools を開き、デバイスツールバー（Cmd+Shift+M）で寸法を 1280x800、倍率を 100% にする
4. コマンドメニュー（Cmd+Shift+P）で `Capture screenshot` を実行する。ちょうど 1280x800 の PNG が保存される
5. `store-assets/screenshots/` に置く（`ja-0-button.png` のように、並べたい順で名前を付ける）

掲載順は先頭がいちばん見られるので、GitHub 上のボタンを 1 枚目、設定ページを後ろに置く。

## 2 回目以降のリリース

`manifest.json` の `version` を上げて `main` にプッシュすると、[リリースの workflow](../.github/workflows/release.yml) が ZIP を作ってストアの審査に出し、`v<version>` のタグを打つ。バージョンが据え置きのプッシュでは何もしない。ローカルから出すこともできる。

```
python3 tools/package.py
CWS_SERVICE_ACCOUNT_FILE=~/.config/cws-key.json \
CWS_PUBLISHER_ID=... CWS_ITEM_ID=... \
python3 tools/publish.py --upload-only dist/send-to-cursor-for-github-1.0.1.zip
```

自動化できるのはここまでで、次の 4 つは手作業のまま残る（[Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)）。

- 掲載情報とプライバシーの入力。API v2 のメソッドは `media.upload` / `publish` / `fetchStatus` / `cancelSubmission` / `setPublishedDeployPercentage` だけで、説明文・スクリーンショット・プロモタイルを触るものは無い（"Before you can publish a new item, you have to fill out the Store listing and Privacy tabs in the Developer Dashboard." = 「新しいアイテムを公開する前に、ダッシュボードのストアの掲載情報タブとプライバシータブを埋めておく必要があります」）
- ストアにアイテムを作る最初の 1 回。v2 に新規作成のメソッドは無い
- 審査。`publish` は提出までで、公開は審査を通ったあと
- ダッシュボードで公開範囲を手で変えたとき。その設定で一度手動公開するまで API から公開できない

### 必要なシークレット

認証はサービスアカウントで行う。利用者の同意で得るリフレッシュトークンは、同意画面がテスト中だと 7 日で切れ（[Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)）、使われないまま 6 か月経つと無効になるため、CI には向かない。サービスアカウントはこの期限が無く、ドキュメントでも CI/CD 向けとされている（[Use a service account with the Chrome Web Store API](https://developer.chrome.com/docs/webstore/service-accounts): "making them ideal for automating your extension publishing workflows, such as in CI/CD pipelines" = 「CI/CD パイプラインのように拡張機能の公開作業を自動化する用途に最適」）。

準備は次の 4 つ。

1. Google Cloud で Chrome Web Store API を有効にする
2. サービスアカウントを作る（ロールの付与は不要）
3. そのメールアドレスをダッシュボードの Account セクションに追加する。これでパブリッシャーのアイテムを触れるようになる
4. サービスアカウントの JSON キーを作る

リポジトリの Settings > Secrets and variables > Actions に 3 つ入れる。

| 名前 | 中身 |
| ---- | ---- |
| `CWS_SERVICE_ACCOUNT_KEY` | 4 で作った JSON キーの中身をそのまま貼る |
| `CWS_PUBLISHER_ID` | ダッシュボードの Publisher > Settings |
| `CWS_ITEM_ID` | ストアのアイテム ID（拡張の ID） |

手元から動かすときは、JSON キーをリポジトリの外（`~/.config/` など）に置いて `CWS_SERVICE_ACCOUNT_FILE` にそのパスを渡す。

デベロッパーアカウント側では 2 段階認証が必須（[Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api): "Developers are required to enable 2-step verification for their Google Account to publish or update an existing extension." = 「既存の拡張機能を公開・更新するには、Google アカウントで 2 段階認証を有効にする必要があります」）。

## 提出前に確かめること

- [ ] `python3 tools/package.py` が通り、`dist/` の ZIP ができている
- [ ] その ZIP を展開したディレクトリを読み込み直して、PR / Issue でボタンが出る（ログイン状態で確認する）
- [ ] Shift + クリックでプロンプトがコピーされ、内容に余計な情報が入っていない
- [ ] 設定ページの各タブが日本語と英語の両方で崩れていない
- [ ] `manifest.json` の `version` を上げた（更新のとき。同じ版は再提出できない）
- [ ] スクリーンショットが 1280x800 で、UI を変えたあとに撮り直してある
- [ ] プライバシーポリシーの URL が公開されていて開ける
- [ ] デベロッパーアカウントの[登録料](https://developer.chrome.com/docs/webstore/register)（一度だけ 5 USD）を払ってある
