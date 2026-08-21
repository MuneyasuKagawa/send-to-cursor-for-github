#!/usr/bin/env python3
"""設定ページのスクリーンショットを 1280x800 で撮る（ストア掲載用）。

Chrome ウェブストアのスクリーンショットは 1280x800 か 640x400 に限られる。
https://developer.chrome.com/docs/webstore/images

設定ページは chrome.storage.sync を読むので、そのままブラウザで開くと落ちる。
test/harness.html と同じ考え方で、保存先をメモリ上のオブジェクトに差し替えた
一時ページを作り、ヘッドレスの Chrome に開かせる。

    python3 tools/shoot_options.py
"""

from __future__ import annotations

import functools
import http.server
import json
import os
import pathlib
import shutil
import socketserver
import subprocess
import tempfile
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "store-assets" / "screenshots"
TEMP_PAGE = ROOT / "_shot.html"

CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)

WIDTH, HEIGHT = 1280, 800

# (出力名, 表示言語, 開くタブ)。GitHub 上のボタンを写した github-*.png は手で撮る。
SHOTS = [
    ("options-general-ja.png", "ja", "general"),
    ("options-prompt-ja.png", "ja", "prReview"),
    ("options-general-en.png", "en", "general"),
    ("options-prompt-en.png", "en", "prReview"),
]

STUB = """
<script>
  window.__store = %s;
  window.chrome = {
    storage: {
      sync: {
        async get(keys) {
          const store = window.__store;
          if (keys === null || keys === undefined) return { ...store };
          if (typeof keys === "string")
            return keys in store ? { [keys]: store[keys] } : {};
          const out = Array.isArray(keys) ? {} : { ...keys };
          for (const key of Array.isArray(keys) ? keys : Object.keys(keys))
            if (key in store) out[key] = store[key];
          return out;
        },
        async set(items) {
          Object.assign(window.__store, items);
        },
        async remove(keys) {
          for (const key of [].concat(keys)) delete window.__store[key];
        },
      },
      onChanged: { addListener() {} },
    },
    runtime: { lastError: null },
  };
</script>
"""


def write_temp_page(language: str) -> None:
    """options.html の <head> 直後に stub を挿し込んだ一時ページ。

    ページを ROOT 直下に置くので、src/ 相対の参照が解けるように <base> も足す。
    """
    html = (ROOT / "src" / "options.html").read_text(encoding="utf-8")
    stub = STUB % json.dumps({"language": language})
    head = '<base href="/src/" />' + stub
    TEMP_PAGE.write_text(html.replace("<head>", "<head>" + head, 1), encoding="utf-8")


def serve() -> tuple[socketserver.BaseServer, int]:
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=os.fspath(ROOT)
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


def shoot(url: str, out: pathlib.Path, timeout: float = 30) -> None:
    """--screenshot は書き出しても終了しないことがあるので、書けたら自分で止める。"""
    out.unlink(missing_ok=True)
    # 起動中の Chrome とプロファイルを共有しないよう、毎回捨てる user-data-dir を渡す
    with tempfile.TemporaryDirectory() as profile:
        process = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                f"--user-data-dir={profile}",
                "--no-first-run",
                "--no-default-browser-check",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                f"--window-size={WIDTH},{HEIGHT}",
                "--virtual-time-budget=3000",
                f"--screenshot={out}",
                url,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                # 書き込み途中を読まないよう、サイズが落ち着いてから抜ける
                if out.exists():
                    size = out.stat().st_size
                    time.sleep(0.3)
                    if size and out.stat().st_size == size:
                        return
                if process.poll() is not None:
                    break
                time.sleep(0.2)
            raise SystemExit(f"スクリーンショットを撮れなかった: {url}")
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


def main() -> None:
    if not pathlib.Path(CHROME).exists():
        raise SystemExit(f"Chrome が見つからない: {CHROME}（CHROME= で指定できる）")

    OUT.mkdir(parents=True, exist_ok=True)
    server, port = serve()
    try:
        for name, language, tab in SHOTS:
            write_temp_page(language)
            out = OUT / name
            shoot(f"http://127.0.0.1:{port}/_shot.html#{tab}", out)
            print(f"{out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)")
    finally:
        server.shutdown()
        TEMP_PAGE.unlink(missing_ok=True)
        shutil.rmtree(ROOT / "__pycache__", ignore_errors=True)


if __name__ == "__main__":
    main()
