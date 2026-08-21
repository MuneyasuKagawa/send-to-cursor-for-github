#!/usr/bin/env python3
"""Chrome ウェブストアに提出する ZIP を作る。

拡張が読み込むファイルだけを入れる。フィクスチャやこのスクリプト自身を含めても動作は
変わらず、審査で読まれるコードが増えるだけなので、test/ と tools/ は入れない。

参照の抜けはインストール時ではなく実行時に初めて分かるので、詰める前に manifest と
options.html が参照しているファイルが揃っているかを確認する。

    python3 tools/package.py
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# 拡張として動くのに必要なものだけ。icons/icon.svg は PNG の元データなので入れない。
INCLUDE = [
    "manifest.json",
    "_locales/**/messages.json",
    "icons/*.png",
    "src/**/*.js",
    "src/**/*.css",
    "src/**/*.html",
]

# options.html から読む相対パス（src/ 基準）。manifest には出てこないので別に見る。
SCRIPT_SRC_RE = re.compile(r"""<(?:script|link)[^>]*?(?:src|href)=["']([^"']+)["']""")

MSG_RE = re.compile(r"__MSG_(\w+)__")


def collect() -> list[pathlib.Path]:
    paths: set[pathlib.Path] = set()
    for pattern in INCLUDE:
        paths.update(p for p in ROOT.glob(pattern) if p.is_file())
    return sorted(paths)


def manifest_references(manifest: dict) -> set[str]:
    """manifest が名前で指している拡張内のファイル。"""
    refs: set[str] = set()

    service_worker = manifest.get("background", {}).get("service_worker")
    if service_worker:
        refs.add(service_worker)

    page = manifest.get("options_ui", {}).get("page")
    if page:
        refs.add(page)

    for entry in manifest.get("content_scripts", []):
        refs.update(entry.get("js", []))
        refs.update(entry.get("css", []))

    refs.update(manifest.get("icons", {}).values())
    refs.update(manifest.get("action", {}).get("default_icon", {}).values())

    return refs


def page_references(page: pathlib.Path) -> set[str]:
    """HTML が読む同梱ファイル。http(s) や data: は外部なので除く。"""
    refs: set[str] = set()
    for src in SCRIPT_SRC_RE.findall(page.read_text(encoding="utf-8")):
        if "://" in src or src.startswith("data:"):
            continue
        refs.add(str((page.parent / src).resolve().relative_to(ROOT)))
    return refs


def missing_messages(manifest: dict, manifest_text: str, packed: set[str]) -> list[str]:
    """manifest の __MSG_x__ が _locales の全言語にあるか。既定言語だけだと審査で落ちる。

    既定言語のファイル自体の有無も見る。glob で回すだけだと、default_locale の
    messages.json が消えていても「残っている言語は揃っている」で通ってしまう。
    """
    keys = set(MSG_RE.findall(manifest_text))
    problems = []

    default_locale = manifest.get("default_locale")
    if keys and not default_locale:
        problems.append("__MSG_*__ を使っているのに manifest に default_locale がない")
    if default_locale:
        default_messages = f"_locales/{default_locale}/messages.json"
        if default_messages not in packed:
            problems.append(f"{default_messages} が入っていない（default_locale）")

    for messages_path in sorted(ROOT.glob("_locales/*/messages.json")):
        messages = json.loads(messages_path.read_text(encoding="utf-8"))
        for key in sorted(keys - messages.keys()):
            problems.append(f"{messages_path.relative_to(ROOT)} に {key} がない")
    return problems


def main() -> None:
    manifest_text = (ROOT / "manifest.json").read_text(encoding="utf-8")
    manifest = json.loads(manifest_text)

    files = collect()
    packed = {str(path.relative_to(ROOT)) for path in files}

    problems = [
        f"{ref} が入っていない"
        for ref in sorted(manifest_references(manifest) - packed)
    ]
    options_page = manifest.get("options_ui", {}).get("page")
    if options_page:
        problems += [
            f"{ref} が入っていない（{options_page} から参照）"
            for ref in sorted(page_references(ROOT / options_page) - packed)
        ]
    problems += missing_messages(manifest, manifest_text, packed)

    if problems:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        raise SystemExit(1)

    DIST.mkdir(exist_ok=True)
    out = DIST / f"send-to-cursor-for-github-{manifest['version']}.zip"
    # 同じ入力から同じ ZIP になるように、並び順を固定して更新時刻は入れない
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(
                str(path.relative_to(ROOT)), date_time=(1980, 1, 1, 0, 0, 0)
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())

    for name in sorted(packed):
        print(name)
    print(f"\n{out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
