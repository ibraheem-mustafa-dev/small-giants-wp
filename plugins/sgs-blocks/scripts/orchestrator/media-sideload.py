#!/usr/bin/env python3
"""media-sideload.py -- Spec 15 Phase 5b.5 media sideloader.

Reads `image-object` slots from extracted draft data + uploads each
referenced file to WordPress via REST `POST /wp/v2/media`. Returns the
WP attachment id + URL so a downstream stage can rewrite the block
attr to reference the live media.

Authenticates with Application Passwords. Reads from either:
  - `.claude/secrets/sandybrown.env` style: WP_USER_SANDYBROWN + WP_APP_PWD_SANDYBROWN
  - Legacy `.openclaw/.env` style:          SGS_WP_USER + SGS_WP_APP_PASSWORD

Counter-discipline: this module ONLY uploads + reports. It does NOT
mutate block.json or post_content. The orchestrator (5b.6 attribute
staged-application) decides what to write.

Idempotency: before uploading, queries GET /wp/v2/media?search=<slug>
and reuses any existing attachment whose source filename matches.
A re-run uploads 0 duplicates.

Fail-loud: auth failures (401/403) raise SideloadError and abort the
entire batch immediately. A missing local source image is flagged as a
per-slot error and the rest of the batch continues.

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
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_WP_SITE = os.environ.get("SGS_WP_SITE", "https://palestine-lives.org")

# Repo root — used to locate the sandybrown env file by default.
_REPO = Path(__file__).resolve().parents[4]
# Default env path: prefer sandybrown (canary) env if it exists, else legacy .openclaw .env.
_SANDYBROWN_ENV = _REPO / ".claude" / "secrets" / "sandybrown.env"
_LEGACY_ENV = Path.home() / ".openclaw" / ".env"
DEFAULT_ENV_PATH: Path = _SANDYBROWN_ENV if _SANDYBROWN_ENV.exists() else _LEGACY_ENV


class SideloadError(RuntimeError):
    """Raised when an upload fails for a non-network reason (auth / shape)."""


class SideloadAuthError(SideloadError):
    """Raised on 401/403 — aborts the entire batch immediately."""


def _read_env_creds(env_path: Path) -> tuple[str, str]:
    """Read user + app password from a .env-shaped file.

    Supports two naming conventions:
      sandybrown style: WP_USER_SANDYBROWN + WP_APP_PWD_SANDYBROWN
      legacy style:     SGS_WP_USER + SGS_WP_APP_PASSWORD
    The sandybrown keys take precedence when both are present.
    """
    if not env_path.exists():
        raise SideloadError(f"env file not found: {env_path}")
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        values[k.strip()] = v.strip().strip('"').strip("'")

    # Sandybrown format takes precedence.
    user = values.get("WP_USER_SANDYBROWN") or values.get("SGS_WP_USER")
    pw = values.get("WP_APP_PWD_SANDYBROWN") or values.get("SGS_WP_APP_PASSWORD")
    if not user or not pw:
        raise SideloadError(
            f"Credentials not found in {env_path}. "
            "Expected WP_USER_SANDYBROWN + WP_APP_PWD_SANDYBROWN "
            "(or SGS_WP_USER + SGS_WP_APP_PASSWORD)."
        )
    return user, pw


def _read_wp_site(env_path: Path) -> str | None:
    """Read WP_URL_SANDYBROWN from env file if present."""
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        if k.strip() == "WP_URL_SANDYBROWN":
            return v.strip().strip('"').strip("'")
    return None


def _basic_auth_header(user: str, pw: str) -> str:
    token = base64.b64encode(f"{user}:{pw}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _check_existing_attachment(
    filename: str,
    wp_site: str,
    auth_header: str,
    timeout: int = 30,
) -> dict | None:
    """Query the WP media library for an existing attachment by filename slug.

    Uses GET /wp/v2/media?search=<stem>&per_page=10 and compares the
    source_url basename against the local filename for an exact match.
    Returns the attachment record dict if found, else None.
    """
    stem = Path(filename).stem
    search_url = (
        f"{wp_site.rstrip('/')}/wp-json/wp/v2/media"
        f"?search={urllib.parse.quote(stem)}&per_page=10"
    )
    req = urllib.request.Request(
        search_url,
        headers={"Authorization": auth_header},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            items: list[dict] = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise SideloadAuthError(
                f"Media library search: HTTP {e.code} — check credentials in env file."
            )
        # Any other HTTP error: treat as "not found" rather than aborting.
        return None
    except (urllib.error.URLError, OSError):
        return None

    for item in items:
        source_url: str = item.get("source_url") or (
            (item.get("guid") or {}).get("rendered") or ""
        )
        if Path(source_url).name.lower() == filename.lower():
            return item
    return None


def _upload_one(
    file_path: Path,
    wp_site: str,
    auth_header: str,
    timeout: int = 60,
) -> dict:
    """POST a single file to /wp/v2/media. Returns parsed JSON response.

    Raises SideloadAuthError on 401/403 (aborts the batch).
    Raises SideloadError when the file is missing.
    Raises urllib.error.HTTPError for other HTTP errors (per-slot error).
    """
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
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise SideloadAuthError(
                f"Media upload: HTTP {e.code} — check credentials. "
                f"Server: {e.read().decode('utf-8', errors='ignore')[:200]}"
            )
        raise


def _upload_one_idempotent(
    file_path: Path,
    wp_site: str,
    auth_header: str,
    timeout: int = 60,
) -> tuple[dict, bool]:
    """Upload a file, reusing an existing attachment if one already exists.

    Returns (attachment_record, was_reused).
    was_reused=True means no network upload was performed (idempotent hit).
    Raises SideloadError when the local file is missing (before any network
    calls — avoid unnecessary auth checks against a file we can't upload).
    Raises SideloadAuthError immediately on 401/403 (aborts the whole batch).
    """
    # Check local file first — pointless to query the media library if we
    # cannot read the source bytes anyway.
    if not file_path.exists() or not file_path.is_file():
        raise SideloadError(f"media file not found: {file_path}")
    existing = _check_existing_attachment(
        file_path.name, wp_site, auth_header, timeout=timeout
    )
    if existing:
        return existing, True
    record = _upload_one(file_path, wp_site, auth_header, timeout=timeout)
    return record, False


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
    env_path: Path = DEFAULT_ENV_PATH,
) -> dict:
    """Find image slots + optionally upload each. Returns a structured report.

    In dry-run mode (upload=False): inventories slots, no network calls.
    In upload mode (upload=True):
      - Reads credentials from env_path.
      - For each slot: deduplicates against the WP media library (by filename),
        uploads only if not already present.
      - Fails loud (raises SideloadAuthError) on 401/403 — never silently
        falls back to dry-run.
      - Flags missing source images as per-slot errors and continues the rest.

    Each uploaded/reused entry in report["uploaded"] carries:
      attachment_id, source_url, alt, slot_path, local_path, reused (bool).
    """
    slots = collect_image_slots(extracted)
    report: dict = {
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

    # Resolve wp_site from env file when the caller hasn't overridden DEFAULT_WP_SITE.
    _resolved_wp_site = wp_site
    if _resolved_wp_site == DEFAULT_WP_SITE:
        _from_env = _read_wp_site(env_path)
        if _from_env:
            _resolved_wp_site = _from_env

    # Credentials — SideloadError / SideloadAuthError propagates to caller.
    user, pw = _read_env_creds(env_path)
    auth_header = _basic_auth_header(user, pw)

    # Deduplicate by resolved local path so we don't POST the same file twice
    # within a single batch run (12 slots → 2 unique files in the manifest).
    seen_local: dict[str, dict] = {}  # str(local_path) -> upload record

    for s in slots:
        url = s.get("url")
        if not url:
            report["skipped"].append({**s, "reason": "no url"})
            continue
        # Resolve relative -> absolute file path (mockup-relative URL, e.g.
        # `../../research/photography/img.webp` resolves from mockup_root
        # into the repo's research/ tree). Enforce that the resolved path
        # stays WITHIN either the repo root OR mockup_root itself — this
        # blocks any `../` traversal that escapes both the repository and
        # the caller-supplied root, while still permitting the `../../research/`
        # relative paths that are legitimate mockup-to-research cross-references
        # within the SGS project layout (sites/<client>/mockups/<page>/ →
        # sites/<client>/research/).
        local = (mockup_root / url).resolve()
        mockup_resolved = mockup_root.resolve()
        repo_resolved = _REPO.resolve()
        _in_mockup = local == mockup_resolved or str(local).startswith(str(mockup_resolved) + ("/" if "/" in str(mockup_resolved) else "\\"))
        try:
            local.relative_to(repo_resolved)
            _in_repo = True
        except ValueError:
            _in_repo = False
        if not _in_repo and not _in_mockup:
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "reason": f"resolved path escapes mockup_root: {local}",
            })
            continue

        local_key = str(local)

        # Intra-batch dedup: same file already processed in this run.
        if local_key in seen_local:
            prev = seen_local[local_key]
            report["uploaded"].append({
                **prev,
                "slot_path": s["path"],
                "reused": True,
                "reuse_reason": "intra-batch-dedup",
            })
            continue

        try:
            record, was_reused = _upload_one_idempotent(
                local,
                wp_site=_resolved_wp_site,
                auth_header=auth_header,
            )
            entry = {
                "slot_path": s["path"],
                "local_path": str(local),
                "attachment_id": record.get("id"),
                "source_url": record.get("source_url") or (
                    (record.get("guid") or {}).get("rendered") or ""
                ),
                "alt": s.get("alt"),
                "reused": was_reused,
            }
            report["uploaded"].append(entry)
            seen_local[local_key] = entry
        except SideloadAuthError:
            # Auth failure — raise immediately; no point continuing the batch.
            raise
        except SideloadError as e:
            # Missing file — flag and continue.
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "reason": str(e),
            })
        except urllib.error.HTTPError as e:
            report["errors"].append({
                "slot_path": s["path"], "local_path": str(local),
                "http_status": e.code,
                "reason": f"HTTP {e.code}: {e.reason}",
            })
        except (urllib.error.URLError, OSError) as e:
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
    parser.add_argument("--env-path", type=Path, default=DEFAULT_ENV_PATH)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not args.extracted.exists():
        sys.exit(f"ERROR: --extracted not found at {args.extracted}")
    payload = json.loads(args.extracted.read_text(encoding="utf-8"))
    try:
        report = sideload_batch(
            payload, mockup_root=args.mockup_root, wp_site=args.wp_site,
            upload=args.upload, env_path=args.env_path,
        )
    except SideloadAuthError as e:
        sys.exit(f"AUTH ERROR (aborting): {e}")
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
