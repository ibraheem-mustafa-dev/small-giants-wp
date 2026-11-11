"""Image sizes for the §13 migration (FR-49-16: an image Source needs an attachment id, or its own width and height).

A saved image can be a bare URL. `resolve(url)` finds, for the active site:
  1. its attachment, when the URL is one of the site's own uploads (the export's attachment map: upload-relative path,
     sized copies included, to id, width, height, mime): `("id", id, (w, h))`;
  2. else the file's own size: read from the local uploads folder of a mirror, or over HTTP (first bytes only), or from a
     `data:` URI: `("size", None, (w, h))`;
  3. else `None`: the caller refuses the block with a note.

Sites are named by the caller (`activate("mirror:NAME")`, `activate("repo")`); the map of a site is registered when its
export is read (`register`). Results are cached per site and URL. `READER` is the one place that touches a file or the
network, so the self-test replaces it.
"""
from __future__ import annotations

import base64
import re
import struct
import time
import urllib.error
import urllib.request
from typing import Callable

UPLOADS = re.compile(r"/wp-content/uploads/([^?#]+)")
SAFE_REL = re.compile(r"^[A-Za-z0-9_./-]+$")
HEAD_LIMIT = 1_048_576
ATTACHMENTS_STORE = "attachments"

_SITES: dict[str, dict] = {}
_CACHE: dict[tuple[str, str], tuple | None] = {}
_ACTIVE = ["repo"]
Size = tuple[int, int]
Resolved = tuple[str, "int | None", Size]


def activate(key: str) -> None:
    _ACTIVE[0] = key


def active() -> str:
    return _ACTIVE[0]


def register(key: str, files: dict, mirror: str | None = None) -> None:
    """Install a site's attachment map ({upload-relative path: [id, width, height, mime]}); `mirror` names the WSL mirror whose uploads folder can be read."""
    _SITES[key] = {"files": {k: tuple(v) for k, v in (files or {}).items()}, "mirror": mirror}
    for cached in [k for k in _CACHE if k[0] == key]:
        del _CACHE[cached]


def reset() -> None:
    _SITES.clear()
    _CACHE.clear()
    _ACTIVE[0] = "repo"


def split_export(records: list[dict]) -> tuple[list[dict], dict]:
    """(the saved-content records, the attachment map) of an export list."""
    posts = [r for r in records if r.get("store") != ATTACHMENTS_STORE]
    files: dict = {}
    for record in records:
        if record.get("store") == ATTACHMENTS_STORE:
            files.update(record.get("files") or {})
    return posts, files


# ---------------------------------------------------------------- reading a file's size

def _png(data: bytes) -> Size | None:
    if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    return None


def _gif(data: bytes) -> Size | None:
    if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
        return struct.unpack("<HH", data[6:10])
    return None


def _jpeg(data: bytes) -> Size | None:
    if data[:2] != b"\xff\xd8":
        return None
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7 or marker == 0xFF:
            i += 1 if marker == 0xFF else 2
            continue
        length = struct.unpack(">H", data[i + 2:i + 4])[0]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            height, width = struct.unpack(">HH", data[i + 5:i + 9])
            return width, height
        i += 2 + length
    return None


def _webp(data: bytes) -> Size | None:
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP" or len(data) < 30:
        return None
    kind = data[12:16]
    if kind == b"VP8 ":
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF
    if kind == b"VP8L":
        bits = struct.unpack("<I", data[21:25])[0]
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    return None


def _number(text: str | None) -> float | None:
    match = re.match(r"\s*([0-9.]+)\s*(px)?\s*$", text or "")
    return float(match.group(1)) if match else None


def _svg(data: bytes) -> Size | None:
    text = data[:65536].decode("utf-8", "replace")
    tag = re.search(r"<svg\b[^>]*>", text, re.I | re.S)
    if not tag:
        return None
    head = tag.group(0)

    def attr(name: str) -> str | None:
        found = re.search(r"\s" + name + r"\s*=\s*[\"']([^\"']*)[\"']", head, re.I)
        return found.group(1) if found else None

    width, height = _number(attr("width")), _number(attr("height"))
    if width and height:
        return round(width), round(height)
    box = (attr("viewBox") or "").replace(",", " ").split()
    if len(box) == 4 and _number(box[2]) and _number(box[3]):
        return round(float(box[2])), round(float(box[3]))
    return None


def dimensions(data: bytes) -> Size | None:
    """Width and height from a file's first bytes (PNG, GIF, JPEG, WebP, SVG); None when they are not there or not readable."""
    for reader in (_png, _gif, _jpeg, _webp, _svg):
        try:
            found = reader(data)
        except (struct.error, IndexError, ValueError):
            found = None
        if found and found[0] > 0 and found[1] > 0:
            return int(found[0]), int(found[1])
    return None


HTTP_ATTEMPTS = 3


def _http(url: str) -> Size | None:
    """The file's size from its first bytes over HTTP. A network failure (a dropped or slow connection) is retried
    up to HTTP_ATTEMPTS times with a short pause, so one pass reads what a second pass would; bytes that arrive but
    hold no readable size are not retried."""
    if not url.startswith(("http://", "https://")):
        return None
    request = urllib.request.Request(url, headers={"User-Agent": "sgs-media-migrate/1", "Range": f"bytes=0-{HEAD_LIMIT - 1}"})
    for attempt in range(HTTP_ATTEMPTS):
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                data = b""
                while len(data) < HEAD_LIMIT:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    data += chunk
                    found = dimensions(data)
                    if found:
                        return found
                return dimensions(data)
        except urllib.error.HTTPError as exc:
            if exc.code < 500:
                return None  # 4xx: the file is not there; a retry cannot help
        except Exception:  # noqa: BLE001 (any other network failure is retried, then means "could not be read")
            pass
        if attempt + 1 < HTTP_ATTEMPTS:
            time.sleep(1 + attempt)
    return None


def _local(mirror: str, rel: str) -> Size | None:
    if not SAFE_REL.match(rel) or ".." in rel:
        return None
    import corpus as C
    result = C.wsl(f"head -c {HEAD_LIMIT} /var/www/local-{C.check_mirror_name(mirror)}/wp-content/uploads/{rel}")
    return dimensions(result.stdout) if result.returncode == 0 and result.stdout else None


def _read(url: str, site: dict) -> Size | None:
    if url.startswith("data:"):
        head, _, body = url.partition(",")
        try:
            return dimensions(base64.b64decode(body) if ";base64" in head else body.encode("utf-8"))
        except ValueError:
            return None
    found = UPLOADS.search(url)
    if found and site.get("mirror"):
        local = _local(site["mirror"], found.group(1))
        if local:
            return local
    return _http("https:" + url if url.startswith("//") else url)


READER: Callable[[str, dict], "Size | None"] = _read


def resolve(url: str) -> Resolved | None:
    key = _ACTIVE[0]
    if (key, url) in _CACHE:
        return _CACHE[(key, url)]
    site = _SITES.get(key, {"files": {}, "mirror": None})
    out: Resolved | None = None
    found = UPLOADS.search(url)
    row = site["files"].get(found.group(1)) if found else None
    if row and row[0]:
        out = ("id", int(row[0]), (int(row[1] or 0), int(row[2] or 0)))
    else:
        size = READER(url, site)
        if size:
            out = ("size", None, size)
    _CACHE[(key, url)] = out
    return out


# ---------------------------------------------------------------- the pass over a block's new attributes

def needs_size(entry: dict) -> bool:
    """An image Source entry FR-49-16 would refuse: a URL, and neither an id nor both sides of a size."""
    return (entry.get("kind") == "image" and isinstance(entry.get("url"), str) and bool(entry["url"])
            and not entry.get("id") and not (entry.get("width") and entry.get("height")))


def _entries(node, path: str, found: list):
    if isinstance(node, dict):
        if "kind" in node and "url" in node:
            found.append((path, node))
        else:
            for key, value in node.items():
                _entries(value, path or str(key), found)
    elif isinstance(node, list):
        for value in node:
            _entries(value, path, found)


def fill(attrs: dict) -> list[tuple[str, str]]:
    """Give every image Source entry in `attrs` an id or a size, in place. Returns (attribute, note) for each entry that cannot get one."""
    entries: list = []
    for name, value in attrs.items():
        _entries(value, name, entries)
    failed: list[tuple[str, str]] = []
    for name, entry in entries:
        if not needs_size(entry):
            continue
        got = resolve(entry["url"])
        if got is None:
            failed.append((name, f"image {entry['url'][:120]!r} has no attachment id and its size could not be read (FR-49-16 refuses it): "
                                 "fix the URL or give the image a size by hand"))
        elif got[0] == "id":
            entry["id"] = got[1]
        else:
            entry["width"], entry["height"] = got[2]
    return failed


def intrinsic_width(entry: dict) -> int | None:
    """The file's own width for an image entry: its stored width, else the active site's record of its URL."""
    if entry.get("width"):
        return int(entry["width"])
    got = resolve(entry["url"]) if isinstance(entry.get("url"), str) and entry["url"] else None
    return got[2][0] if got and got[2][0] else None


LARGE_BOUND = 1024


def printed_width(entry: dict) -> int | None:
    """The width the old front end printed on an image: an upload printed WordPress's `large` size (WordPress's default 1024 by 1024
    bound, kept within the file's own ratio, never above the file), any other image printed at the file's own width."""
    got = resolve(entry["url"]) if isinstance(entry.get("url"), str) and entry["url"] else None
    if got and got[0] == "id" and got[2][0] and got[2][1]:
        width, height = got[2]
        scale = min(1.0, LARGE_BOUND / width, LARGE_BOUND / height)
        return max(1, round(width * scale))
    return intrinsic_width(entry)
