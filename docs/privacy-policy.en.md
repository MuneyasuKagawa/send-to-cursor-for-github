# Privacy Policy — Send to Cursor for GitHub

[日本語](privacy-policy.md) | English

Last updated: 2026-08-20

Send to Cursor for GitHub ("the extension") is a Chrome extension that adds a button to GitHub pull requests and issues which opens a new Cursor chat with a prompt describing what you were looking at. The developer of the extension runs no server and receives none of your data.

## What the extension stores

The only data the extension stores is the settings you choose on its options page.

- Display language
- How to open the link (`cursor://` directly, or through `https://cursor.com/link/`)
- The button label, and whether the label is shown
- Whether the button appears for each target
- Prompt templates per target and per language (only if you edit them away from the defaults)

These are stored in Chrome's `chrome.storage.sync`. If you are signed in to Chrome with sync enabled, the settings are synced to your own other devices through your Google account. That syncing is a Chrome feature and is governed by Google's privacy policy. The developer cannot see any of it.

The extension does not collect browsing history, cookies, credentials, or personally identifying information. It contains no analytics and no ads.

## What the extension reads from the page

The extension only runs on `https://github.com/*`. To build the prompt the button will carry, it reads the following from the pull request or issue you have open. The reading happens when the extension inserts its buttons as the page loads, not at the moment you press one (building the prompt on press would add a delay between the click and Cursor opening).

- Repository name, and the number, title, and URL of the pull request or issue
- Head and base branch names, and issue labels
- Body and comment text (the Markdown source), author names, comment URLs, and the file path and line numbers of review comments
- The name, URL, and state of failing CI checks, along with any annotations shown on the page

All of this is information already displayed to you on the page you have open; the extension simply reads it from the DOM. The extension never calls the GitHub API (to obtain the Markdown source of a body it only nudges GitHub's own menu to load, which GitHub does itself).

What it reads is used solely to build the prompt. The extension does not store it, and does not send it to the developer.

## What leaves your device

What happens to the prompt depends on the "How to open the link" setting you choose.

- Opening `cursor://` directly (the default): the prompt is handed to the Cursor app on your device as a URL. Nothing is sent over the network.
- Going through `https://cursor.com/link/`: the prompt is sent as part of the URL to cursor.com (Anysphere Inc.), which then hands it to the Cursor app. In this case the pull request or issue content contained in the prompt is sent along with it. Because that content can come from a private repository, whether to use this setting is your decision. Handling on cursor.com is governed by Cursor's privacy policy.

In neither case does anything pass through a server belonging to the developer (the developer has no server).

Shift-clicking the button to copy the prompt to the clipboard sends nothing either.

## Third parties

The extension does not sell or rent the data it handles. The only case where it reaches a third party is the one described above: if you choose `https://cursor.com/link/` as the way to open the link, that prompt is sent to cursor.com (Anysphere Inc.). There is no other sharing.

## Limited Use

The extension complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Any data the extension handles is limited to what its single purpose requires — opening a Cursor chat carrying the content of a GitHub pull request or issue — and is not used for anything else. It is not read by humans and it is not sold.

## Deleting your settings

To erase every stored setting, remove the extension from `chrome://extensions`. With sync enabled, the settings on your other devices are removed as sync catches up.

"Reset all prompts to defaults" on the options page restores the prompts of the language currently shown. The prompts of the other language, along with the display language, how to open the link, the button label, and which targets are enabled, are left as they were, so it is not a way to erase what is stored.

## Changes

If this policy changes, this file is updated and the date above is changed. If a change affects how data is handled, it will also be stated in the store listing alongside the extension update.

## Contact

Questions and reports are welcome as GitHub issues.

- Repository: https://github.com/MuneyasuKagawa/send-to-cursor-for-github
- Issues: https://github.com/MuneyasuKagawa/send-to-cursor-for-github/issues
