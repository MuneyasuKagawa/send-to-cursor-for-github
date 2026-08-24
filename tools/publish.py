#!/usr/bin/env python3
"""作った ZIP をストアに上げて審査に出す。

Chrome ウェブストア API v2 をサービスアカウントで叩く。必要な環境変数は次の 3 つ。

    CWS_SERVICE_ACCOUNT_KEY  サービスアカウントの JSON キーの中身
                             （手元では代わりに CWS_SERVICE_ACCOUNT_FILE にパスを渡せる）
    CWS_PUBLISHER_ID         ダッシュボードの Publisher > Settings
    CWS_ITEM_ID              ストアのアイテム ID

利用者の同意で得るリフレッシュトークンは、同意画面がテスト中だと 7 日で切れ、使われな
いまま 6 か月経つと無効になる。CI から動かすものなので期限のないサービスアカウントを使う。

publish は審査への提出までで、公開されるのは審査を通ったあと。掲載情報（説明文・
スクリーンショット・プロモタイル）を触る API は無いので、そこはダッシュボードで直す。

    python3 tools/publish.py dist/send-to-cursor-for-github-1.0.1.zip
    python3 tools/publish.py --upload-only dist/send-to-cursor-for-github-1.0.1.zip
"""

from __future__ import annotations

import base64
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
JWT_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer"
SCOPE = "https://www.googleapis.com/auth/chromewebstore"
API = "https://chromewebstore.googleapis.com"

# アップロードは非同期に処理されることがあるので、終わるまで見に行く
POLL_INTERVAL = 10
POLL_LIMIT = 60

# 列挙の定義は IN_PROGRESS / SUCCEEDED だが、ガイドの本文と旧 API では
# UPLOAD_IN_PROGRESS / SUCCESS と書かれている。どちらが返っても同じ扱いにする。
IN_PROGRESS = {"IN_PROGRESS", "UPLOAD_IN_PROGRESS"}
SUCCEEDED = {"SUCCEEDED", "SUCCESS"}


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"error: 環境変数 {name} がない")
    return value


def call(
    url: str,
    *,
    method: str = "GET",
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
) -> dict:
    request = urllib.request.Request(
        url, data=data, method=method, headers=headers or {}
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise SystemExit(
            f"error: {method} {url}\n  {error.code} {error.reason}\n  {detail}"
        )
    except urllib.error.URLError as error:
        raise SystemExit(f"error: {method} {url} に届かない: {error.reason}")
    return json.loads(body) if body.strip() else {}


def service_account_key() -> dict:
    raw = os.environ.get("CWS_SERVICE_ACCOUNT_KEY")
    if not raw:
        path = os.environ.get("CWS_SERVICE_ACCOUNT_FILE")
        if not path:
            raise SystemExit(
                "error: CWS_SERVICE_ACCOUNT_KEY も CWS_SERVICE_ACCOUNT_FILE もない"
            )
        raw = pathlib.Path(path).read_text(encoding="utf-8")
    try:
        key = json.loads(raw)
    except json.JSONDecodeError as error:
        raise SystemExit(f"error: サービスアカウントの JSON キーが読めない: {error}")
    for name in ("client_email", "private_key"):
        if not key.get(name):
            raise SystemExit(f"error: JSON キーに {name} がない")
    return key


def base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def sign(message: bytes, private_key: str) -> bytes:
    """RS256 で署名する。openssl は鍵をパスで受け取るので一時ファイルに出す。"""
    with tempfile.NamedTemporaryFile("w", suffix=".pem") as key_file:
        key_file.write(private_key)
        key_file.flush()
        result = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_file.name],
            input=message,
            capture_output=True,
        )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", "replace").strip()
        raise SystemExit(f"error: JWT に署名できない: {detail}")
    return result.stdout


def access_token() -> str:
    key = service_account_key()
    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    if key.get("private_key_id"):
        header["kid"] = key["private_key_id"]
    claims = {
        "iss": key["client_email"],
        "scope": SCOPE,
        "aud": TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    signed = ".".join(
        base64url(json.dumps(part, separators=(",", ":")).encode())
        for part in (header, claims)
    )
    assertion = f"{signed}.{base64url(sign(signed.encode(), key['private_key']))}"

    result = call(
        TOKEN_URL,
        method="POST",
        data=urllib.parse.urlencode(
            {"grant_type": JWT_GRANT, "assertion": assertion}
        ).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = result.get("access_token")
    if not token:
        raise SystemExit(f"error: アクセストークンが返らない: {result}")
    return token


def upload(token: str, name: str, archive: pathlib.Path) -> dict:
    return call(
        f"{API}/upload/v2/{name}:upload",
        method="POST",
        data=archive.read_bytes(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/zip",
        },
    )


def wait_for_upload(token: str, name: str) -> str:
    for _ in range(POLL_LIMIT):
        time.sleep(POLL_INTERVAL)
        status = call(
            f"{API}/v2/{name}:fetchStatus",
            headers={"Authorization": f"Bearer {token}"},
        )
        state = status.get("lastAsyncUploadState", "")
        if state not in IN_PROGRESS:
            return state
    raise SystemExit("error: アップロードの処理が終わらない。ダッシュボードで状態を見る")


def publish(token: str, name: str) -> str:
    result = call(
        f"{API}/v2/{name}:publish",
        method="POST",
        data=b"{}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    for warning in result.get("warningInfo", {}).get("warnings", []):
        print(f"warning: {warning.get('reason')}: {warning.get('description')}")
    return result.get("state", "?")


def main() -> None:
    args = sys.argv[1:]
    upload_only = "--upload-only" in args
    paths = [arg for arg in args if not arg.startswith("--")]
    if len(paths) != 1:
        raise SystemExit(__doc__)

    archive = pathlib.Path(paths[0])
    if not archive.is_file():
        raise SystemExit(f"error: {archive} がない")

    name = f"publishers/{env('CWS_PUBLISHER_ID')}/items/{env('CWS_ITEM_ID')}"
    token = access_token()

    print(f"{archive} を上げる")
    result = upload(token, name, archive)
    state = result.get("uploadState", "")
    if state in IN_PROGRESS:
        state = wait_for_upload(token, name)
    if state not in SUCCEEDED:
        raise SystemExit(f"error: アップロードが {state} で終わった: {result}")
    print(f"上げられた（version {result.get('crxVersion') or '?'}）")

    if upload_only:
        print("--upload-only なので審査には出さない")
        return

    print(f"審査に出した（state: {publish(token, name)}）")


if __name__ == "__main__":
    main()
