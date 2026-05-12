#!/usr/bin/env python3
"""media-sideload.py -- Spec 15 Phase 5b.5 media sideloader.

Reads `image-object` slots from extracted draft data + uploads each
referenced file to WordPress via REST `POST /wp/v2/media`. Returns the
WP attachment id + URL so a downstream stage can rewrite the block
attr to reference the live media.

Authenticates with Application Passwords (per Spec 15 §4.4 + the
project convention in ~/.openclaw/.env: SGS_WP_USER + SGS_WP_APP_PASSWORD).

Counter-discipline: this module ONLY uploads + reports. It does NOT
mutate block.json or post_content. The orchestrator (5b.6 attribute
staged-application) decides what to write.

Dry-run by default. Use `--upload` (or `upload=True`) to actually POST.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_WP_SITE = os.environ.get("SGS_WP_SITE", "https://palestine-lives.org")


class SideloadError(RuntimeError):
    """Raised when an upload fails for a non-network reason (auth / shape)."""


def _read_env_creds(env_path: Path) -> tuple[str, str]:
    """Read SGS_WP_USER + SGS_WP_APP_PASSWORD from a .env-shaped file."""
    if not env_path.exists():
        raise SideloadError(f"env file not found: {env_path}")
    user: str | None = None
    pw: str | None = None
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k == "SGS_WP_USER":
            user = v
        elif k == "SGS_WP_APP_PASSWORD":
            pw = v
    if not user or not pw:
        raise SideloadError(
            f"SGS_WP_USER + SGS_WP_APP_PASSWORD must be set in {env_path}"
        )
    return user, pw


def _basic_auth_header(user: str, pw: str) -> str:
    token = base64.b64encode(f"{user}:{pw}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _upload_one(
    file_path: Path,
    wp_site: str,
    auth_header: str,
    timeout: int = 30,
) -> dict:
    """POST a single file to /wp/v2/media. Returns parsed JSON response."""
    if not file_path.exists() or not file_path.is_file():
        raise SideloadError(f"media file not found: {file_path}")
    mime, _ = mimetypes.guess_type(str(file_path))
    if not mime:
        mime = "application/octet-stream"
    data = file_path.read_bytes()
    req = urllib.request.Request(
        f"{wp_site.rstrip('/')}/wp-json/wp/v2/media",
        data=data, method="POST",
        headers={
            "Authorization": auth_header,
            "Content-Type": mime,
            "Content-Disposition": f'attachment; filename="{file_path.name}"',
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def collect_image_slots(extracted: dict) -> list[dict]:
    """Walk the extracted-attributes payload + return media descriptors.

    Looks for slot values shaped `{"id": ..., "url": ..., "alt": ...}`
    (the `image-object` role) anywhere in the dict tree. Returns a flat
    list of `{path, url, alt}` records the caller can iterate to upload.
    """
    found: list[dict] = []

    def _walk(obj: object, path: list[str]) -> None:
        if isinstance(obj, dict):
            if "url" in obj and ("id" in obj or "alt" in obj):
                found.append({
                    "path": ".".join(path) or "(root)",
                    "url": obj.get("url"),
                    "alt": obj.get("alt", ""),
                })
                return
            for k, v in obj.items():
                _walk(v, path + [k])
        elif isinstance(obj, list):
            for idx, item in enumerate(obj):
                _walk(item, path + [f"[{idx}]"])

    _walk(extracted, [])
    return found


def sideload_batch(
    extracted: dict,
    mockup_root: Path,
    wp_site: str = DEFAULT_WP_SITE,
    upload: bool = False,
    env_path: Path = Path.home() / ".openclaw" / ".env",
) -> dict:
    """Find image slots + optionally upload each. Returns a structured report."""
    slots = collect_image_slots(extracted)
    report = {
        "slots_found": len(slots),
        "uploaded": [],
        "skipped": [],
        "errors": [],
        "mode": "upload" if upload else "dry-run",
    }
    if not upload:
        for s in slots:
            report["skipped"].append({**s, "reason": "dry-run"})
        return report

    user, pw = _read_env_creds(env_path)
    auth_header = _basic_auth_header(user, pw)
    for s in slots:
        url = s.get("url")
        if not url:
            report["skipped"].append({**s, "reason": "no url"})
            continue
        # Resolve relative -> absolute file path under mockup_root, then
        # enforce the resolved path stays WITHIN mockup_root (defence
        # against `../` traversal in extracted media URLs).
        local = (mockup_root / url).resolve()
        mockup_resolved = mockup_root.resolve()
        try:
            local.relative_to(mockup_resolved)
        except ValueError:
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "reason": f"resolved path escapes mockup_root: {local}",
            })
            continue
        try:
            resp = _upload_one(local, wp_site=wp_site, auth_header=auth_header)
            report["uploaded"].append({
                "slot_path": s["path"],
                "local_path": str(local),
                "attachment_id": resp.get("id"),
                "source_url": resp.get("source_url"),
                "alt": s.get("alt"),
            })
        except urllib.error.HTTPError as e:
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "http_status": e.code, "reason": e.reason,
            })
        except (urllib.error.URLError, SideloadError, OSError) as e:
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "reason": str(e),
            })
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--extracted", type=Path, required=True,
                        help="Path to extracted-attributes JSON")
    parser.add_argument("--mockup-root", type=Path, required=True,
                        help="Directory the mockup paths are relative to")
    parser.add_argument("--wp-site", default=DEFAULT_WP_SITE)
    parser.add_argument("--upload", action="store_true",
                        help="Actually POST to WP (default: dry-run inventory)")
    parser.add_argument("--env-path", type=Path,
                        default=Path.home() / ".openclaw" / ".env")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not args.extracted.exists():
        sys.exit(f"ERROR: --extracted not found at {args.extracted}")
    payload = json.loads(args.extracted.read_text(encoding="utf-8"))
    report = sideload_batch(
        payload, mockup_root=args.mockup_root, wp_site=args.wp_site,
        upload=args.upload, env_path=args.env_path,
    )
    out = json.dumps(report, indent=2, ensure_ascii=False, default=str)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(out, encoding="utf-8")
        print(f"[sideload] wrote {args.out}")
    else:
        print(out)
    return 0 if not report.get("errors") else 1


if __name__ == "__main__":
    sys.exit(main())
