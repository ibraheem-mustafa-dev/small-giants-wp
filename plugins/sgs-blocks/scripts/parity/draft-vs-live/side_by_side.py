"""Put draft and live captures next to each other so they can be LOOKED at (method step 6, README.md).

Usage:
    python side_by_side.py <out.png> <label:path> <label:path> [...] [--stack] [--crop y0:y1]

Default lays the images left to right (phone and tablet widths); --stack puts them top to bottom (desktop widths).
--crop keeps rows y0..y1 of every image (zoom on a header, a button row). Labels are printed in red above each image.
Open the result with the Read tool and look at it before reporting anything as matching.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    out, rest = argv[0], argv[1:]
    stack = "--stack" in rest
    crop = None
    if "--crop" in rest:
        i = rest.index("--crop")
        y0, y1 = (int(v) for v in rest[i + 1].split(":"))
        crop = (y0, y1)
        rest = rest[:i] + rest[i + 2:]
    rest = [r for r in rest if r != "--stack"]
    images = []
    for item in rest:
        label, path = item.split(":", 1)
        img = Image.open(path).convert("RGB")
        if crop:
            img = img.crop((0, crop[0], img.width, min(img.height, crop[1])))
        images.append((label, img))
    gap, head = 20, 18
    if stack:
        width = max(img.width for _, img in images)
        height = sum(img.height + head + gap for _, img in images)
    else:
        width = sum(img.width + gap for _, img in images)
        height = max(img.height for _, img in images) + head
    canvas = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(canvas)
    x = y = 0
    for label, img in images:
        draw.text((x + 4, y + 2), label, fill="red")
        canvas.paste(img, (x, y + head))
        if stack:
            y += img.height + head + gap
        else:
            x += img.width + gap
    canvas.save(out)
    print(out, canvas.size)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
