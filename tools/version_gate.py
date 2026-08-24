#!/usr/bin/env python3
"""このプッシュで manifest.json の version が上がったかを判定する。

GitHub Actions から呼ぶ。判定結果は GITHUB_OUTPUT に release と version を書く。
BEFORE_SHA にはプッシュ前の SHA（github.event.before）を渡す。

同じ版を二度提出しないように、v<version> のタグがすでにあるときは何もしない。
リリースが済んだあとにタグを打つ運用なので、タグの有無が「提出済みか」になる。

    BEFORE_SHA=$(git rev-parse HEAD^) python3 tools/version_gate.py
"""

from __future__ import annotations

import json
import os
import pathlib
import subprocess


def read_version(text: str) -> str:
    return json.loads(text)["version"]


def parts(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], capture_output=True, text=True)


def previous_version() -> str | None:
    """1 つ前の manifest.json の version。読めなければ None。"""
    for ref in (os.environ.get("BEFORE_SHA", ""), "HEAD^"):
        # ブランチを新しく作った直後のプッシュでは before が 0 で埋まってくる
        if not ref or set(ref) <= {"0"}:
            continue
        result = git("show", f"{ref}:manifest.json")
        if result.returncode == 0:
            return read_version(result.stdout)
    return None


def emit(release: bool, version: str, reason: str) -> None:
    print(reason)
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"release={'true' if release else 'false'}\n")
            handle.write(f"version={version}\n")


def main() -> None:
    version = read_version(
        pathlib.Path("manifest.json").read_text(encoding="utf-8")
    )
    tagged = git("rev-parse", "-q", "--verify", f"refs/tags/v{version}").returncode == 0
    previous = previous_version()

    if tagged:
        emit(False, version, f"v{version} のタグがすでにあるので何もしない")
    elif previous is None:
        emit(False, version, "1 つ前の manifest.json が読めないので何もしない")
    elif parts(version) < parts(previous):
        emit(False, version, f"バージョンが {previous} から {version} に下がっている")
        raise SystemExit(1)
    elif version == previous:
        emit(False, version, f"バージョンは {version} のままなので何もしない")
    else:
        emit(True, version, f"バージョンが {previous} から {version} に上がった")


if __name__ == "__main__":
    main()
