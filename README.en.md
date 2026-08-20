# Send to Cursor for GitHub

[日本語](README.md) | English

A Chrome extension that adds a button to GitHub pull requests and issues which opens a new Cursor chat with a prompt carrying their content.

It opens `cursor://anysphere.cursor-deeplink/prompt?text=...` directly, without going through a relay server.

The display is available in Japanese and English, and Japanese is the default. Switching the language in the options page changes not only the wording of the button but also the default prompts.

## What it does

There are five targets the button can be added to, and each one has its own on/off switch and prompt template.

| Target                | Where the button goes                                                                  | What the prompt asks for                       |
| --------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Whole pull request    | The button row in the PR header, and the end of the reaction row of the PR description | Review the diff between base and head          |
| Pull request comments | End of the reaction row                                                                | Check the comment and propose how to act on it |
| Failed CI checks      | Right end of the row in the check list                                                 | Investigate the cause of the failure           |
| Issue body            | End of the reaction row                                                                | Plan how to implement it                       |
| Issue comments        | End of the reaction row                                                                | Check the comment and propose how to act on it |

Every prompt carries the repository and, for a PR, the head and base branches, and asks the agent to confirm they match before starting work. This is to keep it from working on the wrong branch. The answer is pinned to the display language (Japanese or English).

Comment and description bodies are passed as the original Markdown. Shift-clicking copies the prompt to the clipboard instead of opening it.

The supported pages are the **Conversation**, **Files changed**, and **Checks** tabs of a PR, and issue pages. The PR description gets the "Whole pull request" button rather than the "Pull request comments" one. The description is already used as the body of the "Whole pull request" prompt, so putting that button right below it is the natural choice, and it matches the shape of the issue body getting a button too.

## Installing

1. Open `chrome://extensions`
2. Turn on "Developer mode" in the top right
3. Choose this directory with "Load unpacked"

The icon PNGs are generated from `icons/icon.svg` and committed, so you normally do not need to generate them. Run the following only when you change the design (it needs `brew install librsvg`).

```bash
for s in 16 32 48 128; do rsvg-convert -w $s -h $s icons/icon.svg -o icons/icon$s.png; done
```

## Settings

The options page opens automatically right after you install the extension. To open it later, click the extension icon in the toolbar (if you have not pinned it, the extension name inside the puzzle-piece menu). It can also be opened from "Extension options" on the extension's detail page in `chrome://extensions`.

The options page is split into "General" plus one tab per target. A target tab gets an "Off" badge only while that target is off. The tab you were on is kept in the URL hash (`#prComment` and so on), so a reload brings you back to the same tab.

Turning a target off collapses the prompt editor for it. Leaving a setting editable while it has no effect makes it easy to miss that the target was never turned on. The collapse is a grid animation that changes the row from `1fr` to `0fr`, so it closes without measuring the height of the content. `visibility` is switched along with it so that the Tab key does not move into a collapsed editor.

For the same reason, turning off "Show the label" makes the label input uneditable. Setting `color` and `background` on the input overrides the browser's own disabled look and leaves it indistinguishable from an editable field, so the border becomes dashed and the fill is darkened to show that it cannot be typed into.

Buttons set an explicit `line-height`. Unlike body text, a button defaults to `line-height: normal`, which lets the font actually used decide the height of the line, so at the same 13px it comes out as 20px for Japanese and 16px for English and the tabs change height when the language is switched.

The on/off controls are toggle switches, but they are really `input[type="checkbox"]` elements restyled with CSS, so that clicking the label and toggling with the Space key keep working. `role="switch"` is set as well, so a screen reader says "switch" instead of "checkbox". Both animations stop under `prefers-reduced-motion: reduce`.

| Tab        | Setting                   | Default                                                | Description                                                                                                                          |
| ---------- | ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| General    | Language                  | Japanese                                               | Japanese or English. Used for the options page, the wording of the button, and the default prompts                                   |
| General    | How to open the link      | `cursor://` directly                                   | Switch to going through `https://cursor.com/link/` if Chrome blocks the direct launch                                                |
| General    | Button label              | `Cursor`                                               | Turning off "Show the label" makes it a round icon-only button (the label text stays as the tooltip and the name for screen readers) |
| Per target | Whether to add the button | All five enabled                                       | Turns the button on or off for that target                                                                                           |
| Per target | Prompt template           | `targets.<id>.template` in `src/locales/<language>.js` | Editable per target and per language                                                                                                 |

### Template placeholders

The placeholders available differ per target. They are also listed on the target's tab in the options page, where clicking one inserts it at the caret.

| Target                | Placeholders                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole pull request    | The shared PR items + `{{author}}` `{{prBody}}`                                                                                                                                        |
| Pull request comments | `{{repository}}` `{{prNumber}}` `{{prTitle}}` `{{prUrl}}` `{{headBranch}}` `{{headLabel}}` `{{baseBranch}}` `{{commentUrl}}` `{{author}}` `{{filePath}}` `{{lines}}` `{{commentBody}}` |
| Failed CI checks      | The shared PR items + `{{checkName}}` `{{checkUrl}}` `{{failureOutput}}`                                                                                                               |
| Issue body            | `{{repository}}` `{{issueNumber}}` `{{issueTitle}}` `{{issueUrl}}` `{{issueLabels}}` `{{author}}` `{{issueBody}}`                                                                      |
| Issue comments        | `{{repository}}` `{{issueNumber}}` `{{issueTitle}}` `{{issueUrl}}` `{{commentUrl}}` `{{author}}` `{{commentBody}}`                                                                     |

A line that contains a placeholder with no value is dropped from the output as a whole, so a heading such as "Target file:" is never left on its own.

`{{headLabel}}` is filled in the `owner:branch` form only for a PR from a fork, and is empty for a PR within the same repository.

## Implementation notes

### How targets are defined

Each target the button is added to is defined as one entry in `TARGETS` in `src/config.js`. The default on/off state and the tabs and panels of the options page are all derived from it, so adding a target only takes an entry in `TARGETS`, the wording (name, description, tooltip, prompt) in `src/locales/*.js`, and the extraction code in `src/extract.js` / `src/content.js`. `TARGETS` only holds the parts that do not depend on the language: the id, the name of the placeholder that carries the body, and the placeholders that can be used.

### Switching the display language

`chrome.i18n` (`_locales`) is decided by the browser UI language and cannot be switched from the extension's own settings ([chrome.i18n | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/i18n): "Search the messages file (if any) for the user's preferred locale."). Since the language has to be selectable in the options page, the runtime wording comes from the extension's own catalogs in `src/locales/ja.js` / `src/locales/en.js`, and the selected language is kept in `chrome.storage.sync`.

`_locales` is used only for the `description` in `manifest.json`, which the browser itself displays. That one cannot read the extension's settings, so it follows the browser language, with `default_locale` set to `ja`.

Prompts are stored per target **and per language**, under the key `template_<language>_<target id>`. Switching the language switches the defaults, so sharing a key would carry an edit made in one language over to the other, or leave text from the previous language behind after a reset. Keeping them apart means an edit made in Japanese survives a switch to English and comes back unchanged.

The language is chosen with two radio buttons rather than a pull-down, the options read "日本語" and "English" in their own language, and a globe icon sits next to the heading. Japanese is the default, so somebody who cannot read Japanese has no way to tell from the heading that this is the language switch ([Using &lt;select&gt; to Link to Localized Content | W3C](https://www.w3.org/International/questions/qa-navigation-select): "You cannot expect Web users who are not fluent in English to understand "Select language". Universally recognized icons communicate to people regardless of what language they speak."). The same article recommends dropping the pull-down altogether when only a few languages are supported ("If your site supports only a handful of localized versions, it is probably better to avoid using a pull-down menu altogether and simply include links directly on the page."). A closed pull-down shows only the current value, so with two languages it is easier to find if both are laid out and "English" is there to be read.

When the language changes, the current input is saved under the key **of the previous language** first, and only then is the language rewritten and the settings read again (doing it the other way around writes the Japanese prompt into the English key). The pre-split `template_<target id>`, and the even older `templates` / `promptTemplate`, all hold Japanese, so they are read only while Japanese is being displayed, moved to `template_ja_<target id>`, and the old keys are removed only after the move is confirmed.

### Opening the options page right after installing

The options page is opened on the first install only. Reloading an unpacked extension counts as `"update"`, so it does not open on every reload during development ([chrome.runtime | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/runtime): "When an unpacked extension is reloaded, this is treated as an update. This means that the `chrome.runtime.onInstalled` event will fire with the `"update"` reason.").

### Reading the branch names

In the old UI, `.head-ref` / `.base-ref` are used, and when they are missing, `.commit-ref` elements are sorted into head and base by whether they carry `.base-ref`.

The new PR UI has neither class, and a branch is a `[data-component="BranchName"]` link instead. The description part of the header (`[data-component="PageHeader.Description"]`) reads "… wants to merge N commits into `<base>` from `<head>`", so the search is narrowed to that area and the first link in DOM order is treated as base, the second as head.

The branch name is taken from `/owner/repo/tree/<branch name>` in the `href`, not from the link text. The text becomes `owner:branch` for a fork, and the `href` also gives an exact name for a branch that contains a slash, such as `feature/foo`.

### Reading the comment body

**Copy Markdown** (`clipboard-copy[value]`) in the "…" menu of a comment holds the original Markdown of the body, so that is the first choice. When it cannot be read, the `innerText` of `.js-comment-body` is the fallback.

In the new PR UI the contents of that menu are lazily loaded with `include-fragment`, and the original is not in the DOM until you hover. So the prompt is built with the substitute text when the button is inserted, and once the mouse enters the button (or it takes focus), `mouseover` / `focusin` are dispatched to make `details-menu[preload]` react and let GitHub itself load the content; when the original arrives, the link and the prompt used for copying are swapped in. The menu does not actually open, so nothing changes visually. Even if the load fails, the button keeps working with the substitute prompt.

In the new issue UI, "Copy Markdown" became a React menu item, and there is no way to read the original from the DOM the way `clipboard-copy[value]` allows (the hover trick above does not work either). Instead the original is taken from the preloaded GraphQL result embedded in the page.

```
script[type="application/json"][data-target="react-app.embeddedData"]
  └ payload.preloadedQueries[].result.data.repository.issue
      ├ body / author / url                     the issue body
      └ frontTimelineItems.edges[].node         comments (with body / author / url in the same shape)
```

A comment in the DOM carries `data-testid="comment-viewer-outer-box-<GraphQL node ID>"`, and that suffix matches `node.id` in the embedded data, which pairs a comment with its original reliably. The code does not depend on the order of the queries; it looks for the one that has `issue`.

This is a snapshot from the initial load, though. Comments loaded later through pagination, or one you just posted, are not in it, and those fall back to the substitute text.

Because the substitute text comes from the rendered HTML, `Fixes facebook/react#37323` becomes `Fixes #37323`, and `### headings` and code fences are lost. That is why the original is preferred.

Images in the original (`<img>` / `<picture>` and the links wrapping them) are stripped in `src/prompt.js`. An image carries no information into the prompt, and a badge image link can hold a URL-encoded prompt in its `href`, which re-encoded as body text swells to thousands of characters and eats into the 8,000-character limit described below. A single badge embedding a 410-character prompt took up 2,705 characters of the deeplink.

### Where the button is inserted

GitHub's DOM mixes the current Rails implementation with the newer React one, so for comments (both PR and issue) the insertion point is looked for in this order, inserting only one button per comment.

1. The end of the `.comment-reactions` that contains `reactions-menu` (the button that adds an emoji reaction)
2. The end of the row wrapping the button that adds an emoji reaction in the new issue UI (`ReactionViewerAnchor`)
3. The end of a visible `.comment-reactions`
4. The start of `.timeline-comment-actions` in the comment header

Cases 1 to 3 are all the reaction row, and the button always goes at its end, that is, directly to the right of the emoji reactions that are already there. Inserting it in the middle would break up the group of emoji.

Emoji reactions are not in the HTML the server returns, though; React appends them to the end of the row later (the HTML of a real issue page has only `ReactionViewerAnchorButton`, and not a single `reactionToggleButton`). What was the end at insertion time stops being the end once reactions are added, leaving the button in front of the emoji. So a button inserted into a reaction row is marked, and moved back to the end on every DOM change.

"Whole pull request" is inserted in two places, the header and the PR description. On the header side the search goes `.gh-header-actions` (the Rails version) → `[data-component="PH_Actions"]` (the row where View status / Code sit in the new UI) → `[data-testid="pr-header-actions"]` → `.gh-header-meta`, and the button goes at the end of the first **visible** one. In the new UI a button row gets `d-none` when it is empty, so hidden elements are skipped. The sticky header has the same containers, so the header side is limited to one button per page. The description side uses the same search as a comment.

On the Conversation tab the same button appears both in the header and in the description. The duplication is allowed because a position that does not move between tabs is easier to remember. On the Files changed / Checks tabs, which have no description, the header is the only entry point.

"Failed CI checks" goes at the end of the check row. That is next to the "Details" link in the old UI, and next to the "…" menu in the new one.

The PR and issue descriptions are the only items in the timeline whose id is `issue-<number>`. That is how a comment is told apart from the description, and why the PR description gets the "Whole pull request" button instead of the "Pull request comments" one. In the new PR UI the description is rendered as `#pullrequest-<number>` nested inside `#issue-<number>`, and `closest()` finds the inner one first, so the id of the ancestor is checked as well. In the new issue UI the check is `[data-testid="issue-body"]` rather than an id.

### The new issue UI

Issue pages are further along in the move to React than PRs, and not one of the Rails classes such as `.js-comment`, `reactions-menu`, or `.js-comment-body` is left. So the root of a comment, the body text, the author, and the permalink all come from `data-testid`.

| Item                            | Where it comes from                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Root of the body                | `[data-testid="issue-body"]`                                                          |
| Root of a comment               | `[data-testid^="comment-viewer-outer-box-"]`                                          |
| Body text                       | `[data-testid="markdown-body"]`                                                       |
| Author / permalink of the body  | `[data-testid="issue-body-header-author"]` / `[data-testid="issue-body-header-link"]` |
| Author / permalink of a comment | `[data-testid="avatar-link"]` / `a[href*="#issuecomment-"]` (same as the old UI)      |

Labels can be read from `[data-testid="issue-labels"]`, but each link wraps its description in `.sr-only`, so reading `textContent` as is appends the description to the label name. Screen-reader-only elements are removed before reading.

### Telling which CI checks failed

The class names of a check row change between the old and new UI, but the shape of the `href` to the detail page, containing `check_run_id=` or `/actions/runs/`, is stable, so the row is reached from the link with `closest()`. A row that contains several check links is taken to be the list itself and skipped.

A failure is decided first by the red × icon (`.octicon-x` and friends), and otherwise by the status text (`Failing after 2m` and the like). The status text is read only from `.status-meta` in the old UI and `[class*="StatusCheckRow-module__titleDescription"]` in the new one, falling back to the whole row only when neither is found. Reading the whole row from the start would react to a check named something like `test-failure-handling`. The check name is in a `strong` in the old UI, but in an `h4` in the new one.

The class names in the new UI are generated by CSS modules and carry a hash at the end, so they are matched by prefix. A rename of the component breaks the match.

The full log is neither in the DOM nor able to fit in 8,000 characters, so the prompt carries only the check name, the URL, and the status text, and asks for the cause to be investigated. The annotations on screen are added to the body only while a single check is open on the Checks tab. From rows in a list there is no way to tell which check an annotation belongs to, so they are not used.

### Dropping headings left empty

After a line with a placeholder that had no value is dropped, a heading left with nothing under it is dropped too. This keeps "## PR description" from being stranded on a PR that has no description.

### Vertical alignment

The reaction row is `align-items: stretch`, but an element with a fixed height is treated as `flex-start`. The emoji reaction button and the reaction pills are both 26px, so giving the button `height: 26px` is all it takes to line up. `align-self` is not set: with `center`, the button would drift out of line with the top-aligned emoji button once the reactions wrap and the row grows taller.

### Icons

`icons/icon.svg` is the source, and the PNGs are rasterized from it. Chrome does not accept SVG for extension icons, only raster formats Blink can handle ([Manifest - Icons | Chrome Extensions](https://developer.chrome.com/docs/extensions/reference/manifest/icons): "They can, however, be in any raster format supported by Blink, including BMP, GIF, ICO, and JPEG."), so the generated PNGs are committed.

The shape is the same terminal prompt sign as the button icon (`ICON_PATH` in `src/content.js`), differing only in the thickness of the chevron: 2.5 in the SVG and 2.1 in `content.js`. In a 16px PNG the 45-degree diagonals spread over 2px through antialiasing and lose contrast, so only the raster side is thickened. The button is a 12px SVG, where the same adjustment would amount to a difference of 0.26px, so it is left alone.

### URL length

A Cursor deeplink has a maximum of 8,000 characters for the whole URL (the FAQ of [Deeplinks | Cursor Docs](https://cursor.com/docs/reference/deeplinks): "Deeplink URLs have a maximum length of 8,000 characters."). When it goes over, only the body is trimmed by binary search, so the branch names and the request always survive.

## Checking behavior locally

The logic can be checked in a browser using the invented fixtures in `test/fixtures/`, which reproduce GitHub's DOM and are not saved copies of real pages.

```bash
python3 tools/serve_test.py 8765
# Stands in for a PR page (description + review thread + check list, Rails DOM)
open http://127.0.0.1:8765/octocat/hello-world/pull/42
# Stands in for a PR page (the Primer React DOM of the new UI)
open 'http://127.0.0.1:8765/octocat/hello-world/pull/42?ui=new'
# Stands in for an issue page (body + comments)
open http://127.0.0.1:8765/octocat/hello-world/issues/7
# Stands in for an issue page (the React DOM of the new UI)
open 'http://127.0.0.1:8765/octocat/hello-world/issues/7?ui=new'
```

Because owner/repo and the number are taken from `location.pathname`, the server serves the harness for paths in the `/owner/repo/pull/123` and `/owner/repo/issues/7` shapes. The harness switches the fixtures and the header it loads by `pull` / `issues` in the URL and by `?ui=new`. At the bottom of the page it shows the extracted page information and the generated prompts, labeled with the target name.

For a PR with `?ui=new`, the lazily loaded "…" menu is reproduced with a stub too. The harness dispatches `mouseenter` to every button before showing the results, so a button where the swap to the original Markdown worked says so. For an issue with `?ui=new`, the embedded data deliberately leaves out the second comment, so both the case where the original is available and the case where it falls back to the substitute text can be checked. The lazy rendering of emoji reactions is reproduced as well (reactions are added later to a row carrying `data-deferred-reactions`), which shows whether the button is left in front of the emoji.

Each button shows the row it was inserted into and the elements sitting in that row, so the order relative to the emoji reactions can be checked there.

A query such as `?off=prComment,ciFailure` reproduces the state with those targets disabled. Adding `?lang=en` switches to the English display (and the English prompts).

The options page itself needs `chrome.storage`, so it is checked by loading the extension from `chrome://extensions`.

## Known limitations

- Only `https://github.com/*` is matched. To use it with GitHub Enterprise, add the host to `content_scripts[].matches` in `manifest.json`.
- GitHub is moving PR and issue pages to the new React UI step by step. How far along it is differs per page: on a PR the header and the check list are the new UI while the comments are still Rails, and an issue is entirely the new UI. The selectors for the new UI were decided by inspecting the DOM of real PR and issue pages (`react/react`), and reading the branch names, deciding the nesting of the description, the insertion point in the header, reading the name and status text of a check row, fetching the lazily loaded original, fetching the original from the embedded data of an issue, and the fact that emoji reactions are rendered later (that they are not in the HTML the server returns) have all been confirmed against the real thing. Still, some places match class names from CSS modules by prefix and some depend on GitHub's internal embedded data, so a future change can break them. An item that cannot be read only drops its line from the prompt; the button itself keeps working.
- The embedded data used as the source of the original Markdown in the new issue UI is a snapshot from the initial load. For comments loaded later through pagination, or one just posted, the original cannot be read and the text of the rendered HTML is used instead.
- Of "Failed CI checks", the appearance of **a failing row itself** has only been checked against the fixtures. Only Skipped and Successful rows could be confirmed on the real thing, so the icon of a failing row and the actual wording of its status text (assumed to be `Failing after 2m`) are unverified. If they differ from the assumption the button does not appear, but the other targets are unaffected.
- Discussions, commit comments, and the code search and file browsing pages are out of scope.
- The display languages are Japanese and English only. There is no detection from the browser language, and the default is Japanese, so using it in English means switching in the options page. Only the extension description shown in `chrome://extensions` follows the browser language (because it cannot read the extension's settings).
- Launching `cursor://` goes through Chrome's external protocol confirmation dialog. If it is blocked, switch to going through `https://cursor.com/link/` in the options.

## Files

```
manifest.json          the extension definition (Manifest V3)
_locales/{ja,en}/      the manifest description (the part the browser picks by its language)
src/i18n.js            holds the display language and looks up messages
src/locales/{ja,en}.js the wording and the default prompts
src/config.js          the target definitions (language-independent) and loading the settings
src/prompt.js          shaping the body, expanding the template, building the deeplink
src/extract.js         extracts PR / issue / comment / CI information from GitHub's DOM
src/content.js         builds and inserts the button, watches the DOM
src/content.css        the style of the button
src/options.*          the options page (tabs and target panels are generated from TARGETS)
src/background.js      the service worker that opens the options page on an icon click and on first install
icons/icon.svg         the source of the icon (the PNGs are generated from it)
tools/serve_test.py    the local server used for checking behavior
test/harness.html      the page that checks the logic against the fixtures
test/fixtures/         fixtures reproducing GitHub's DOM
  pr-body.html           the PR description
  review-thread.html     a PR review thread
  pr-checks.html         the PR check list (one failing + one successful)
  pr-new-ui.html         a PR page in the Primer React UI (description + comments + check list)
  issue.html             an issue body and its comments
  issue-new-ui.html      an issue page in the React UI (body + comments + embedded data)
```

## License

[MIT License](LICENSE)
