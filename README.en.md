# Send to Cursor for GitHub

[日本語](README.md) | English

A Chrome extension that sends content from GitHub pull requests and issues to a new Cursor chat.

Clicking the button added to GitHub opens Cursor with a prompt containing the repository, branches, body, and other relevant context. By default, it opens `cursor://` directly and does not use a custom relay server.

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/send-to-cursor-for-github/pjagjodoppglflmcpmdhcaifkjnegdpf)

## Features

- Review an entire pull request
- Check the validity of a pull request comment
- Investigate a failed CI check
- Plan the implementation of an issue
- Check the validity of an issue comment
- Copy the prompt with `Shift + click`
- Japanese and English interfaces and prompts
- Per-target visibility and prompt customization

The extension supports the **Conversation**, **Files changed**, and **Checks** tabs of pull requests, as well as issue pages.

## Installation

Click "Add to Chrome" on the [Chrome Web Store](https://chromewebstore.google.com/detail/send-to-cursor-for-github/pjagjodoppglflmcpmdhcaifkjnegdpf).

The options page opens after the first installation. To open it later, click the extension icon in the toolbar.

## Usage

Open a pull request or issue on GitHub, then click the **Cursor** button shown near the relevant content.

- Click: open a new chat in Cursor
- `Shift + click`: copy the prompt

If Chrome blocks the `cursor://` link, change "How to open the link" in the options to use `https://cursor.com/link/`.

## Options

The options page lets you change:

- Display language (日本語 / English)
- How Cursor is opened
- Button label or icon-only display
- Whether each of the five targets is enabled
- Prompt templates for each target

Available placeholders are shown next to each template editor. A line containing a placeholder whose value could not be read is omitted from the generated prompt.

## Development

### Load the development version manually

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode"
4. Select "Load unpacked"
5. Choose this repository's directory

### Test locally

```bash
python3 tools/serve_test.py 8765
```

After starting the server, use these URLs to check fixtures modeled on GitHub's old and new interfaces:

- `http://127.0.0.1:8765/octocat/hello-world/pull/42`
- `http://127.0.0.1:8765/octocat/hello-world/pull/42?ui=new`
- `http://127.0.0.1:8765/octocat/hello-world/issues/7`
- `http://127.0.0.1:8765/octocat/hello-world/issues/7?ui=new`

Load the extension in Chrome to check the options page.

## Known limitations

- Only `https://github.com/*` is supported.
- Discussions, commit comments, code search, and file browsing pages are out of scope.
- The extension depends on GitHub's DOM, so future GitHub interface changes may affect button placement or data extraction.
- When raw Markdown is unavailable in the new issue interface, rendered text is used instead.
- Full CI logs are not included in prompts.
- When a body exceeds Cursor's deeplink limit, its middle is omitted and its beginning and end are kept.

## License

[MIT License](LICENSE)
