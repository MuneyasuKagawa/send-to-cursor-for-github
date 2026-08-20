# Send to Cursor for GitHub

日本語 | [English](README.en.md)

GitHub の PR と Issue に、その内容を渡すプロンプト付きで Cursor の新しいチャットを開くボタンを追加する Chrome 拡張です。

中継サーバーを経由せず、`cursor://anysphere.cursor-deeplink/prompt?text=...` を直接開きます。

表示は日本語と英語に対応していて、既定は日本語です。設定ページで切り替えると、ボタンの文言だけでなくプロンプトの既定値も切り替わります。

## できること

ボタンを付ける対象は 5 種類あり、対象ごとに有効/無効とプロンプトのテンプレートを設定できます（対象名は日本語表示のもの）。

| 対象                 | ボタンの位置                                             | プロンプトの内容                             |
| -------------------- | -------------------------------------------------------- | -------------------------------------------- |
| PR 全体              | PR ヘッダーのボタン列と、PR 説明文のリアクション行の末尾 | base と head の差分をレビューさせる          |
| PR のコメント        | リアクション行の末尾                                     | コメントの内容を検証し、対応方針を提示させる |
| 失敗した CI チェック | チェック一覧の行の右端                                   | 失敗の原因を調査させる                       |
| Issue の本文         | リアクション行の末尾                                     | 実装方針を立てさせる                         |
| Issue のコメント     | リアクション行の末尾                                     | コメントの内容を検証し、対応方針を提示させる |

どのプロンプトにも、リポジトリと（PR なら）head / base ブランチを載せ、着手前に一致を確認するよう指示しています。別ブランチで作業してしまうのを防ぐためです。回答は表示言語（日本語か英語）に固定しています。

コメントや説明文の本文は Markdown 原文をそのまま渡します。Shift + クリックすると、開く代わりにプロンプトをクリップボードへコピーします。

対応ページは PR の **Conversation** / **Files changed** / **Checks** タブと、Issue のページです。PR の説明文には「PR のコメント」ではなく「PR 全体」のボタンが付きます。説明文はもともと「PR 全体」のプロンプトの本文として使われているので、その真下にボタンを置くのが素直で、Issue の本文にボタンが付くのと形も揃います。

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選ぶ

アイコンの PNG は `icons/icon.svg` から生成してコミット済みなので、通常は生成不要です。デザインを変えたときだけ以下を実行します（`brew install librsvg` が必要）。

```bash
for s in 16 32 48 128; do rsvg-convert -w $s -h $s icons/icon.svg -o icons/icon$s.png; done
```

## 設定

インストールした直後に設定ページが自動で開きます。あとから開くときは、ツールバーの拡張機能アイコン（ピン留めしていない場合はパズルピースのメニュー内にある拡張機能名）をクリックします。`chrome://extensions` の拡張機能詳細にある「拡張機能のオプション」からも開けます。

設定ページは「一般」＋対象ごとの 5 枚のタブに分かれています。対象のタブには、オフにしている対象だけ「オフ」のバッジが付きます。開いていたタブは URL のハッシュ（`#prComment` など）に残るので、再読み込みしても同じタブに戻ります。

対象をオフにすると、その対象のプロンプト欄はたたまれます。効かない設定を触れるままにしておくと、オンにし忘れたことに気づけないためです。たたむときは行を `1fr` から `0fr` へ変える grid のアニメーションを使い、中身の高さを数えずに閉じています。あわせて `visibility` も切り替えて、たたんだ欄に Tab キーで入らないようにしています。

同じ理由で、「ラベルを表示する」をオフにするとラベルの入力欄は編集できなくなります。入力欄に `color` と `background` を指定しているとブラウザ既定の無効表示が上書きされて有効な欄と見分けが付かないので、枠線を破線にして地色を沈め、書けないことが分かるようにしています。

ボタンには `line-height` を明示しています。ボタンは本文と違って既定が `line-height: normal` で、行の高さが実際に使われるフォントの縦幅で決まるため、同じ 13px でも日本語は 20px、英語は 16px になり、言語を切り替えるとタブの高さが変わってしまいます。

オン/オフはトグルスイッチですが、実体は `input[type="checkbox"]` を CSS で見た目だけ変えたものです（ラベルのクリックや Space キーでの切り替えをそのまま使うため）。あわせて `role="switch"` を付け、読み上げも「チェックボックス」ではなく「スイッチ」に揃えています。どちらのアニメーションも `prefers-reduced-motion: reduce` のときは止めます。

| タブ     | 項目                     | 既定値                                             | 説明                                                                                                                                   |
| -------- | ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 一般     | 表示言語                 | 日本語                                             | 日本語か英語。設定ページとボタンの文言、プロンプトの既定値に使います                                                                   |
| 一般     | リンクの開き方           | `cursor://` 直接                                   | Chrome に直接起動をブロックされる場合は `https://cursor.com/link/` 経由に切り替えます                                                  |
| 一般     | ボタンのラベル           | `Cursor`                                           | 「ラベルを表示する」をオフにすると、アイコンのみの丸いボタンになります（ラベルの文字列はツールチップと読み上げ用の名前として残ります） |
| 対象ごと | ボタンを付けるかどうか   | 5 種類すべて有効                                   | 対象ごとにボタンを出すかどうかを切り替えます                                                                                           |
| 対象ごと | プロンプトのテンプレート | `src/locales/<言語>.js` の `targets.<id>.template` | 対象ごと・言語ごとに編集できます                                                                                                       |

### テンプレートのプレースホルダー

使えるプレースホルダーは対象ごとに違います（設定ページの対象ごとのタブにも表示され、クリックでカーソル位置に挿入できます）。

| 対象                 | プレースホルダー                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR 全体              | PR の共通項目 + `{{author}}` `{{prBody}}`                                                                                                                                              |
| PR のコメント        | `{{repository}}` `{{prNumber}}` `{{prTitle}}` `{{prUrl}}` `{{headBranch}}` `{{headLabel}}` `{{baseBranch}}` `{{commentUrl}}` `{{author}}` `{{filePath}}` `{{lines}}` `{{commentBody}}` |
| 失敗した CI チェック | PR の共通項目 + `{{checkName}}` `{{checkUrl}}` `{{failureOutput}}`                                                                                                                     |
| Issue の本文         | `{{repository}}` `{{issueNumber}}` `{{issueTitle}}` `{{issueUrl}}` `{{issueLabels}}` `{{author}}` `{{issueBody}}`                                                                      |
| Issue のコメント     | `{{repository}}` `{{issueNumber}}` `{{issueTitle}}` `{{issueUrl}}` `{{commentUrl}}` `{{author}}` `{{commentBody}}`                                                                     |

値が取得できなかったプレースホルダーを含む行は、まるごと出力から削除されます。「対象ファイル:」のような見出しだけが残ることはありません。

`{{headLabel}}` は fork からの PR のときだけ `owner:branch` 形式で入り、同一リポジトリ内の PR では空になります。

## 実装メモ

### 対象の定義

ボタンを付ける対象は `src/config.js` の `TARGETS` に 1 件ずつ定義しています。既定の有効/無効、設定ページのタブとパネルはすべてここから導出されるので、対象を増やすときは `TARGETS` への追記、`src/locales/*.js` への文言（名前・説明・ツールチップ・プロンプト）の追加、`src/extract.js` / `src/content.js` への抽出処理の追加で済みます。`TARGETS` には言語に依らない構造（id、本文のプレースホルダー名、使えるプレースホルダー）だけを置いています。

### 表示言語の切り替え

`chrome.i18n`（`_locales`）はブラウザの UI 言語で決まり、拡張の設定から切り替えられません（[chrome.i18n | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/i18n): "Search the messages file (if any) for the user's preferred locale." = 「ユーザーの優先ロケールのメッセージファイル（あれば）を検索します」）。設定ページで言語を選べるようにしたいので、実行時の文言は `src/locales/ja.js` / `src/locales/en.js` の自前カタログから引き、選んだ言語を `chrome.storage.sync` に持ちます。

`_locales` を使うのは、ブラウザ側が表示する `manifest.json` の `description` だけです。こちらは拡張の設定を読めないのでブラウザの言語に従い、`default_locale` を `ja` にしています。

プロンプトは対象ごと・**言語ごと**に `template_<言語>_<対象 id>` のキーで保存します。言語を切り替えると既定値が切り替わるので、キーを共有すると片方の言語で編集した内容が意図せず引き継がれたり、既定値に戻したときに前の言語の文が残ったりします。分けておけば、日本語で編集した内容は英語に切り替えても失われず、戻せば元のまま出てきます。

言語の選び方はプルダウンではなくラジオ 2 つにし、選択肢は「日本語」「English」と各言語での表記のままにして、見出しには地球アイコンを添えています。既定が日本語なので、日本語が読めない人は見出しの文字から言語切り替えだと判断できません（[Using &lt;select&gt; to Link to Localized Content | W3C](https://www.w3.org/International/questions/qa-navigation-select): "You cannot expect Web users who are not fluent in English to understand "Select language". Universally recognized icons communicate to people regardless of what language they speak." = 「英語に不慣れなウェブ利用者が『Select language』を理解できるとは期待できません。世界的に認識されているアイコンは、話す言語に関係なく人々に伝わります」）。同じ記事は、対応する言語が少ないならプルダウン自体をやめることを勧めています（"If your site supports only a handful of localized versions, it is probably better to avoid using a pull-down menu altogether and simply include links directly on the page." = 「対応するローカライズ版がごく少数なら、プルダウンメニューはいっさい使わず、ページに直接リンクを置く方がおそらく良いでしょう」）。閉じたプルダウンには現在値しか出ないので、2 言語なら両方を並べて "English" を読める状態にしておく方が見つけやすくなります。

言語を切り替えるときは、まず**切り替え前の言語のキー**で今の入力内容を保存し、そのあとに言語を書き換えて読み直します（順序を逆にすると、日本語のプロンプトが英語のキーに書き込まれます）。言語を分ける前の `template_<対象 id>` や、さらに前の `templates` / `promptTemplate` はどれも日本語なので、日本語を表示しているときだけ読んで `template_ja_<対象 id>` に移し、移せたことを確認してから古いキーを消します。

### インストール直後に設定ページを開く

初回インストールだけ設定ページを開きます。パッケージ化されていない拡張機能の再読み込みは `"update"` 扱いなので、開発中に毎回開くことはありません（[chrome.runtime | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/runtime): "When an unpacked extension is reloaded, this is treated as an update. This means that the `chrome.runtime.onInstalled` event will fire with the `"update"` reason." = 「パッケージ化されていない拡張機能を再読み込みすると、これは更新として扱われます。つまり `chrome.runtime.onInstalled` イベントは `"update"` の理由で発火します」）。

### ブランチ名の取り出し方

旧 UI では `.head-ref` / `.base-ref`、それが無ければ `.base-ref` を含むかどうかで `.commit-ref` を head と base に振り分けます。

新しい PR UI にはこれらのクラスが無く、ブランチは `[data-component="BranchName"]` のリンクになります。ヘッダーの説明部（`[data-component="PageHeader.Description"]`）は「〜 wants to merge N commits into `<base>` from `<head>`」の順に並ぶので、この範囲に絞って DOM 順の 1 件目を base、2 件目を head として扱います。

ブランチ名はリンクのテキストではなく `href` の `/owner/repo/tree/<ブランチ名>` から取ります。テキストは fork のとき `owner:branch` 形式になるうえ、`feature/foo` のようにスラッシュを含む名前でも `href` なら正確に取れるためです。

### コメント本文の取り出し方

コメントの「...」メニューにある **Copy Markdown**（`clipboard-copy[value]`）が本文の Markdown 原文を持っているので、これを第一候補として使います。取れない場合は `.js-comment-body` の `innerText` にフォールバックします。

新しい PR UI ではこのメニューの中身が `include-fragment` の遅延読み込みになり、ホバーするまで原文が DOM に存在しません。そのためボタンを差し込む時点では代用テキストでプロンプトを組み立て、ボタンにマウスが乗った（またはフォーカスが当たった）時点で `details-menu[preload]` が反応する `mouseover` / `focusin` を送って GitHub 自身に読み込ませ、原文が届いたらリンクとコピー用のプロンプトを差し替えます。メニューが開くわけではないので見た目には影響しません。読み込みに失敗しても、代用テキストのプロンプトでそのまま動きます。

新しい Issue UI では「Copy Markdown」が React のメニュー項目になり、`clipboard-copy[value]` のように DOM から原文を読む方法がありません（上記のホバー方式も効きません）。代わりに、ページに埋め込まれた GraphQL のプリロード結果から原文を取ります。

```
script[type="application/json"][data-target="react-app.embeddedData"]
  └ payload.preloadedQueries[].result.data.repository.issue
      ├ body / author / url                     Issue 本文
      └ frontTimelineItems.edges[].node         コメント（body / author / url を同じ形で持つ）
```

DOM 側のコメントは `data-testid="comment-viewer-outer-box-<GraphQL のノード ID>"` になっていて、この接尾辞が埋め込みデータ側の `node.id` と一致するので、コメントと原文を確実に対応付けられます。クエリの並び順には依存せず、`issue` を持つものを探します。

ただしこれは初回読み込み時のスナップショットです。ページネーションで後から読み込まれたコメントや投稿直後のコメントは含まれないので、その場合は代用テキストになります。

代用テキストは描画済み HTML から取るため、`Fixes facebook/react#37323` が `Fixes #37323` になったり、`### 見出し` やコードフェンスが失われたりします。原文を優先しているのはこのためです。

原文のうち画像（`<img>` / `<picture>` と、それらを包むリンク）は `src/prompt.js` で除去しています。画像はプロンプトに入れても情報にならないうえ、バッジ画像のリンクは `href` にプロンプトを URL エンコードして持つことがあり、それを本文として再エンコードすると数千文字に膨らんで後述の 8,000 文字制限を圧迫するためです。410 文字のプロンプトを埋め込んだバッジ 1 個で、ディープリンク上は 2,705 文字を占めました。

### ボタンの挿入位置

GitHub の DOM は現行の Rails 製と新しい React 製が混在しているため、コメント（PR / Issue 共通）では以下の順で挿入先を探します（1 コメントにつき 1 個だけ挿入）。

1. `reactions-menu`（絵文字リアクションを追加するボタン）を含む `.comment-reactions` の末尾
2. 新しい Issue UI の絵文字リアクションを追加するボタン（`ReactionViewerAnchor`）を包む行の末尾
3. 表示されている `.comment-reactions` の末尾
4. コメントヘッダーの `.timeline-comment-actions` の先頭

1〜3 はどれもリアクションの行で、常にその末尾、つまり付いている絵文字リアクションの右隣に入れます。行の途中に入れると絵文字のまとまりが分断されるためです。

ただし絵文字リアクションはサーバーが返す HTML に含まれず、後から React が行の末尾へ足します（実機の Issue ページの HTML には `ReactionViewerAnchorButton` だけがあり、`reactionToggleButton` は 1 個もありません）。挿入した時点では末尾でも、あとからリアクションが増えるとボタンが絵文字の手前に取り残されます。そのためリアクション行に入れたボタンには印を付け、DOM の変化を見るたびに末尾へ戻しています。

「PR 全体」はヘッダーと PR 説明文の 2 か所に入れます。ヘッダー側は `.gh-header-actions`（Rails 版）→ `[data-component="PH_Actions"]`（新 UI で View status / Code が並ぶ列）→ `[data-testid="pr-header-actions"]` → `.gh-header-meta` の順で探し、**表示されている**最初の要素の末尾に入れます。新 UI ではボタン列の中身が空のとき `d-none` が付くため、隠れている要素は飛ばします。スクロール追従用のヘッダーにも同じ枠があるので、ヘッダー側はページ全体で 1 個だけに絞っています。説明文側はコメントと同じ挿入先の探し方をします。

Conversation タブでは同じボタンがヘッダーと説明文の両方に出ます。位置がタブによって変わらない方が覚えやすいので重複を許しています。説明文が無い Files changed / Checks タブではヘッダー側だけが入口になります。

「失敗した CI チェック」はチェック行の末尾に入れます。旧 UI では「Details」リンク、新 UI では「…」メニューの右隣になります。

PR と Issue の説明文は、タイムラインの中で唯一 id が `issue-<番号>` になっています。これでコメントと説明文を見分け、PR の説明文には「PR のコメント」ではなく「PR 全体」のボタンを付けます。新しい PR UI では説明文が `#issue-<番号>` の中に `#pullrequest-<番号>` として入れ子で描画され、`closest()` では内側が先に見つかるため、祖先の id も確認します。新しい Issue UI では id ではなく `[data-testid="issue-body"]` で見分けます。

### 新しい Issue UI

Issue ページは PR より先に React 化が進んでいて、`.js-comment` や `reactions-menu`、`.js-comment-body` といった Rails 版のクラスがひとつも残っていません。そのためコメントの起点、本文のテキスト、投稿者、permalink をすべて `data-testid` から取ります。

| 項目                         | 取得先                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 本文の起点                   | `[data-testid="issue-body"]`                                                          |
| コメントの起点               | `[data-testid^="comment-viewer-outer-box-"]`                                          |
| 本文のテキスト               | `[data-testid="markdown-body"]`                                                       |
| 本文の投稿者 / permalink     | `[data-testid="issue-body-header-author"]` / `[data-testid="issue-body-header-link"]` |
| コメントの投稿者 / permalink | `[data-testid="avatar-link"]` / `a[href*="#issuecomment-"]`（旧 UI と同じ）           |

ラベルは `[data-testid="issue-labels"]` から取れますが、各リンクが説明文を `.sr-only` で内包しているため、そのまま `textContent` を読むとラベル名に説明文が続いてしまいます。読み上げ専用の要素を除いてから読んでいます。

### 失敗した CI チェックの見分け方

チェック行のクラス名は新旧 UI で変わりますが、詳細ページへのリンクの href が `check_run_id=` や `/actions/runs/` を含む形は安定しているので、リンクを起点に `closest()` で行を辿ります。1 行に複数のチェックリンクが含まれる場合は一覧そのものを掴んでいるとみなして対象外にします。

失敗の判定は赤い × アイコン（`.octicon-x` など）を第一の材料にし、無ければ状態テキスト（`Failing after 2m` など）を見ます。状態テキストは旧 UI の `.status-meta` と新 UI の `[class*="StatusCheckRow-module__titleDescription"]` に絞って読み、どちらも見つからないときだけ行全体にフォールバックします。最初から行全体を見ると、`test-failure-handling` のようなチェック名に反応してしまうためです。チェック名は旧 UI では `strong` などですが、新 UI では `h4` に入ります。

新 UI のクラス名は CSS モジュールの生成物で末尾にハッシュが付くため、前方一致で拾っています。コンポーネント名が変わると外れます。

ログ全文は DOM に無いうえ 8,000 文字にも収まらないため、プロンプトにはチェック名・URL・状態テキストだけを載せ、原因の調査から依頼する形にしています。Checks タブで単一のチェックを開いているときだけ、表示されている annotation を本文に足します。一覧に並んだ行からは、その annotation がどのチェックのものか特定できないので使いません。

### 空になった見出しの削除

値が取れなかったプレースホルダーの行を落とした結果、中身が空になった見出しも一緒に削除します。説明文の無い PR で「## PR の説明」だけが取り残されるのを防ぐためです。

### 縦位置の揃え方

リアクション行は `align-items: stretch` ですが、高さが確定している要素は `flex-start` 扱いになります。絵文字リアクションボタンとリアクションピルはどちらも 26px なので、ボタンも `height: 26px` にするだけで揃います。`align-self` は指定しません。リアクションが折り返して行が高くなったときに `center` を指定していると、上端揃えのままの絵文字ボタンとズレるためです。

### アイコン

`icons/icon.svg` がソースで、PNG はここからラスタライズしたものです。Chrome の拡張機能アイコンは SVG を受け付けず、Blink が扱えるラスタ形式に限られるため（[Manifest - Icons | Chrome Extensions](https://developer.chrome.com/docs/extensions/reference/manifest/icons): "They can, however, be in any raster format supported by Blink, including BMP, GIF, ICO, and JPEG." = 「ただし、BMP、GIF、ICO、JPEG を含む、Blink がサポートする任意のラスタ形式にすることもできます」）、生成した PNG をコミットしています。

図形はボタンのアイコン（`src/content.js` の `ICON_PATH`）と同じターミナルのプロンプト記号ですが、シェブロンの太さだけが違います。SVG 側は 2.5、`content.js` 側は 2.1 です。16px の PNG では 45 度の対角線がアンチエイリアスで 2px に散ってコントラストを失うため、ラスタ側だけ太らせています。ボタンは 12px 表示の SVG なので、同じ調整をしても 0.26px 相当の差にしかならず、そのままにしています。

### URL 長

Cursor のディープリンクは URL 全体で 8,000 文字が上限です（[Deeplinks | Cursor Docs](https://cursor.com/docs/reference/deeplinks) の FAQ: "Deeplink URLs have a maximum length of 8,000 characters." = 「ディープリンクの URL は最大 8,000 文字です」）。超える場合は本文だけを二分探索で切り詰め、ブランチ名や依頼内容は必ず残します。

## 動作確認

`test/fixtures/` の架空のフィクスチャ（GitHub の DOM を再現したもので、実際のページを保存したものではありません）を使って、ブラウザ上でロジックを確認できます。

```bash
python3 tools/serve_test.py 8765
# PR ページ相当（説明文 + レビュースレッド + チェック一覧 / Rails 版の DOM）
open http://127.0.0.1:8765/octocat/hello-world/pull/42
# PR ページ相当（Primer React 製の新 UI の DOM）
open 'http://127.0.0.1:8765/octocat/hello-world/pull/42?ui=new'
# Issue ページ相当（本文 + コメント）
open http://127.0.0.1:8765/octocat/hello-world/issues/7
# Issue ページ相当（React 製の新 UI の DOM）
open 'http://127.0.0.1:8765/octocat/hello-world/issues/7?ui=new'
```

`location.pathname` から owner/repo と番号を取り出す実装のため、サーバーは `/owner/repo/pull/123` や `/owner/repo/issues/7` 形式のパスでハーネスを返します。ハーネスは URL の `pull` / `issues` と `?ui=new` で読み込むフィクスチャとヘッダーを切り替えます。ページ下部に、抽出したページ情報と生成されたプロンプトが対象名付きで表示されます。

PR の `?ui=new` では、遅延読み込みの「...」メニューもスタブで再現します。ハーネスは全ボタンに `mouseenter` を送ってから結果を出すので、Markdown 原文への差し替えが働いたボタンにはその旨が表示されます。Issue の `?ui=new` では、埋め込みデータに 2 件目のコメントを意図的に含めておらず、原文が取れる場合と代用テキストになる場合の両方を確認できます。あわせて絵文字リアクションの遅延描画も再現し（`data-deferred-reactions` を持つ行に後からリアクションを足す）、ボタンが絵文字の手前に取り残されないかを確認できます。

各ボタンには挿入先の行と、その行に並んでいる要素が表示されるので、絵文字リアクションとの前後関係もそこで確認できます。

`?off=prComment,ciFailure` のようにクエリを付けると、その対象を無効にした状態を再現できます。`?lang=en` を付けると英語表示（英語のプロンプト）になります。

設定ページ自体は `chrome.storage` が必要なので、`chrome://extensions` から読み込んで確認します。

## 既知の制約

- 対象は `https://github.com/*` のみです。GitHub Enterprise で使う場合は `manifest.json` の `content_scripts[].matches` にホストを追加してください。
- GitHub は PR / Issue ページを React 製の新 UI へ順次移行しています。移行の度合いはページごとに違い、PR はヘッダーとチェック一覧が新 UI でコメント部分はまだ Rails 製、Issue は全体が新 UI です。新 UI 側の選択子は実際の PR / Issue ページ（`react/react`）の DOM を調べて決め、ブランチ名の取得、説明文の入れ子判定、ヘッダーへの挿入位置、チェック行の名前と状態テキストの取得、遅延読み込みの原文取得、Issue の埋め込みデータからの原文取得、絵文字リアクションが後から描画されること（サーバーが返す HTML に含まれないこと）までを実機で確認済みです。ただし CSS モジュール由来のクラス名を前方一致で使っている箇所と、GitHub 内部の埋め込みデータに依存している箇所があるため、今後の変更で外れる可能性があります。取得できなかった項目はプロンプトから該当行が落ちるだけで、ボタン自体は動作します。
- 新しい Issue UI で Markdown 原文の取得元にしている埋め込みデータは初回読み込み時のスナップショットです。ページネーションで後から読み込まれたコメントや、投稿直後のコメントでは原文が取れず、描画済み HTML のテキストで代用します。
- 「失敗した CI チェック」のうち、**失敗した行そのもの**の見た目はフィクスチャ上でしか確認できていません。実機で確認できたのは Skipped / Successful の行だけで、失敗行のアイコンや状態テキストの実際の文言（`Failing after 2m` としています）は未確認です。想定と違う場合はボタンが出ませんが、他の対象には影響しません。
- Discussions、コミットのコメント、コード検索やファイル閲覧ページは対象外です。
- 表示言語は日本語と英語だけです。ブラウザの言語からの自動判定はしておらず、既定は日本語なので、英語で使うときは設定ページで切り替えます。`chrome://extensions` に出る拡張機能の説明文だけはブラウザの言語に従います（拡張の設定を読めないため）。
- `cursor://` の起動は Chrome の外部プロトコル確認ダイアログを経由します。ブロックされる場合はオプションで `https://cursor.com/link/` 経由に切り替えてください。

## ファイル構成

```
manifest.json          拡張機能の定義 (Manifest V3)
_locales/{ja,en}/      manifest の description（ブラウザの言語で選ばれる分）
src/i18n.js            表示言語の保持とメッセージの取り出し
src/locales/{ja,en}.js 文言とプロンプトの既定値
src/config.js          対象の定義（言語に依らない構造）と設定の読み込み
src/prompt.js          本文の整形、テンプレート展開、ディープリンク組み立て
src/extract.js         GitHub の DOM から PR / Issue / コメント / CI の情報を抽出
src/content.js         ボタンの生成と挿入、DOM 監視
src/content.css        ボタンのスタイル
src/options.*          設定ページ（タブと対象のパネルは TARGETS から生成）
src/background.js      拡張機能アイコンのクリックと初回インストールで設定ページを開くサービスワーカー
icons/icon.svg         アイコンのソース（PNG はここから生成）
tools/serve_test.py    動作確認用のローカルサーバー
test/harness.html      フィクスチャを使ったロジック確認ページ
test/fixtures/         GitHub の DOM を再現したフィクスチャ
  pr-body.html           PR の説明文
  review-thread.html     PR のレビュースレッド
  pr-checks.html         PR のチェック一覧（失敗 1 件 + 成功 1 件）
  pr-new-ui.html         Primer React 製の新 UI の PR ページ（説明文 + コメント + チェック一覧）
  issue.html             Issue の本文とコメント
  issue-new-ui.html      React 製の新 UI の Issue ページ（本文 + コメント + 埋め込みデータ）
```

## ライセンス

[MIT License](LICENSE)
