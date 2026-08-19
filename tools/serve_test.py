#!/usr/bin/env python3
"""test/harness.html を GitHub の PR と同じ URL 形式で配信する開発用サーバー。

content script は location.pathname から owner/repo/PR 番号を取り出すため、
/owner/repo/pull/123 のようなパスでハーネスを返す必要がある。

    python3 tools/serve_test.py 8765
    open http://localhost:8765/octocat/hello-world/pull/42
"""

from __future__ import annotations

import functools
import http.server
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PR_PATH = re.compile(r"^/[^/]+/[^/]+/pull/\d+(?:/files)?/?$")


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        if PR_PATH.match(path.split("?")[0].split("#")[0]):
            return os.fspath(ROOT / "test" / "harness.html")
        return super().translate_path(path)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(Handler, directory=os.fspath(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"serving {ROOT} on http://127.0.0.1:{port}")
        server.serve_forever()


if __name__ == "__main__":
    main()
