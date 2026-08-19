#!/usr/bin/env python3
"""拡張機能用のアイコン PNG を生成する。

外部ライブラリを使わずに済ませるため、4x のスーパーサンプリングで
角丸の背景とスパークル形を描き、zlib で PNG を書き出す。

    python3 tools/make_icons.py
"""

from __future__ import annotations

import pathlib
import struct
import zlib

SIZES = (16, 32, 48, 128)
OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "icons"

SUPERSAMPLE = 4
BACKGROUND = (17, 17, 21)
FOREGROUND = (255, 255, 255)
CORNER_RADIUS = 3.5 / 16  # 16 単位系での角丸半径の比率

# 4 方向のスパークル（16 単位系）。小サイズで「＋」に見えないよう内側の頂点を太めにしている。
SPARKLE = [
    (8.0, 1.25),
    (10.2, 5.8),
    (14.75, 8.0),
    (10.2, 10.2),
    (8.0, 14.75),
    (5.8, 10.2),
    (1.25, 8.0),
    (5.8, 5.8),
]


def inside_rounded_rect(x: float, y: float, size: float, radius: float) -> bool:
    if radius <= 0:
        return 0 <= x <= size and 0 <= y <= size
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    if x >= radius and x <= size - radius:
        return 0 <= y <= size
    if y >= radius and y <= size - radius:
        return 0 <= x <= size
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius**2


def inside_polygon(x: float, y: float, polygon: list[tuple[float, float]]) -> bool:
    hit = False
    count = len(polygon)
    for i in range(count):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % count]
        if (y1 > y) != (y2 > y):
            t = (y - y1) / (y2 - y1)
            if x < x1 + t * (x2 - x1):
                hit = not hit
    return hit


def render(size: int) -> bytes:
    """RGBA の生ピクセル列を返す。"""
    scale = size * SUPERSAMPLE
    radius = size * CORNER_RADIUS
    # スパークルは 16 単位系なので描画サイズに合わせる
    unit = size / 16.0
    sparkle = [(px * unit, py * unit) for px, py in SPARKLE]

    rows = bytearray()
    samples = SUPERSAMPLE * SUPERSAMPLE
    for py in range(size):
        rows.append(0)  # PNG のフィルタタイプ (None)
        for px in range(size):
            covered = 0
            marked = 0
            for sy in range(SUPERSAMPLE):
                for sx in range(SUPERSAMPLE):
                    x = px + (sx + 0.5) / SUPERSAMPLE
                    y = py + (sy + 0.5) / SUPERSAMPLE
                    if not inside_rounded_rect(x, y, size, radius):
                        continue
                    covered += 1
                    if inside_polygon(x, y, sparkle):
                        marked += 1
            if covered == 0:
                rows.extend((0, 0, 0, 0))
                continue
            alpha = round(255 * covered / samples)
            ratio = marked / covered
            color = tuple(
                round(BACKGROUND[i] + (FOREGROUND[i] - BACKGROUND[i]) * ratio)
                for i in range(3)
            )
            rows.extend((color[0], color[1], color[2], alpha))
    return bytes(rows)


def chunk(kind: bytes, data: bytes) -> bytes:
    body = kind + data
    return (
        struct.pack(">I", len(data))
        + body
        + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
    )


def write_png(path: pathlib.Path, size: int, raw: bytes) -> None:
    header = struct.pack(">2I5B", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUTPUT_DIR / f"icon{size}.png"
        write_png(path, size, render(size))
        print(
            f"wrote {path.relative_to(OUTPUT_DIR.parent)} ({path.stat().st_size} bytes)"
        )


if __name__ == "__main__":
    main()
