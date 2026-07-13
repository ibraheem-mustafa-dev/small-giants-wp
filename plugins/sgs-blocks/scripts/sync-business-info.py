#!/usr/bin/env python3
"""
sync-business-info.py — Tier-1 business-data extractor + pusher (D325).

Extracts ONLY high-confidence, machine-signal business-data fields from a draft
mockup and (optionally) writes them to the live site's Business Details store via
the capability-gated REST endpoint POST /wp-json/sgs/v1/site-info (fill-if-empty).

HIGH-CONFIDENCE signals only (Tier 1) — never a semantic guess:
  - email        ← the first `mailto:` link
  - phone        ← the first `tel:` link
  - socials.<n>  ← an <a href> whose host is a known social domain (skips '#')
  - copyright    ← the text of the line containing a © / &copy;

Deliberately NOT extracted (Tier 2 — need review, would be guesses):
  tagline, address, opening_hours, vat_number, registered_office, map.

The push is FILL-IF-EMPTY by default: an existing non-empty value is never
overwritten (the endpoint enforces this; --overwrite flips it).

Usage:
    # Extract + print only (no write)
    python plugins/sgs-blocks/scripts/sync-business-info.py \\
        --draft "sites/mamas-munches/mockups/.../mamas-munches-mockup.html"

    # Extract + push to the canary (fill-if-empty)
    python plugins/sgs-blocks/scripts/sync-business-info.py \\
        --draft "sites/mamas-munches/mockups/.../mamas-munches-mockup.html" \\
        --target-domain sandybrown-nightingale-600381.hostingersite.com --push

Credentials (for --push): resolved like push-theme-snapshot.py —
  1. Known domain → named secrets file (.claude/secrets/sandybrown.env)
  2. --app-user / --app-password flags
  3. SGS_WP_APP_USER / SGS_WP_APP_PWD env vars
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8")


# ---------------------------------------------------------------------------
# Extraction (high-confidence machine signals only)
# ---------------------------------------------------------------------------

# host substring → Site Info social key. First match wins per network.
SOCIAL_DOMAINS: dict[str, str] = {
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "instagram.com": "instagram",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "linkedin.com": "linkedin",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "tiktok.com": "tiktok",
    "wa.me": "whatsapp",
    "whatsapp.com": "whatsapp",
}

_HREF_RE = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
_MAILTO_RE = re.compile(r"""mailto:([^"'\s?>]+)""", re.IGNORECASE)
_TEL_RE = re.compile(r"""tel:([^"'\s>]+)""", re.IGNORECASE)
_EMAIL_SHAPE_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Copyright line: a © or &copy; followed by the rest of that text run. Stop only
# at an HTML tag boundary (< >), a newline, or a JS-template backtick — so real
# text with apostrophes/quotes ("Mama's Munches.") is kept intact.
_COPYRIGHT_RE = re.compile(r"""(?:©|&copy;)\s*([^<>\n`]{2,160})""", re.IGNORECASE)


def extract_business_info(html: str) -> dict[str, str]:
    """Return {site_info_key: value} for every high-confidence field found."""
    fields: dict[str, str] = {}

    # email — first mailto:
    m = _MAILTO_RE.search(html)
    if m:
        email = m.group(1).strip().rstrip(".,;")
        if _EMAIL_SHAPE_RE.match(email):
            fields["email"] = email

    # phone — first tel:
    m = _TEL_RE.search(html)
    if m:
        phone = m.group(1).strip()
        # keep digits, spaces, +, -, (, ) — reject anything else as noise
        if re.fullmatch(r"[0-9+\-\s().]{6,20}", phone):
            fields["phone"] = phone

    # socials — first real URL per known network (skip '#'/relative/empty)
    for raw_href in _HREF_RE.findall(html):
        href = raw_href.strip()
        if not href or href.startswith("#") or href.lower().startswith(("mailto:", "tel:")):
            continue
        host = (urlparse(href).netloc or "").lower()
        if not host:
            continue
        host = host[4:] if host.startswith("www.") else host
        for domain, key in SOCIAL_DOMAINS.items():
            social_key = f"socials.{key}"
            if domain in host and social_key not in fields:
                fields[social_key] = href
                break

    # copyright — text of the © line, prefixed with © for a clean stored value
    m = _COPYRIGHT_RE.search(html)
    if m:
        tail = m.group(1).strip()
        if tail:
            fields["copyright"] = f"© {tail}"

    return fields


# ---------------------------------------------------------------------------
# Credentials + push (mirrors push-theme-snapshot.py)
# ---------------------------------------------------------------------------

def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_env_file(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.is_file():
        return result
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        result[key.strip()] = value.strip()
    return result


def resolve_credentials(
    target_domain: str, cli_user: str | None, cli_pwd: str | None
) -> tuple[str, str] | None:
    secrets_dir = repo_root() / ".claude" / "secrets"
    domain_env_map = {
        "sandybrown": (secrets_dir / "sandybrown.env", "WP_USER_SANDYBROWN", "WP_APP_PWD_SANDYBROWN"),
    }
    for domain_key, (env_path, user_var, pwd_var) in domain_env_map.items():
        if domain_key in target_domain:
            env = _load_env_file(env_path)
            user = env.get(user_var, "")
            pwd = env.get(pwd_var, "").replace(" ", "")
            if user and pwd:
                return user, pwd
    if cli_user and cli_pwd:
        return cli_user, cli_pwd.replace(" ", "")
    import os

    env_user = os.environ.get("SGS_WP_APP_USER", "")
    env_pwd = os.environ.get("SGS_WP_APP_PWD", "").replace(" ", "")
    if env_user and env_pwd:
        return env_user, env_pwd
    return None


def push(target_domain: str, fields: dict[str, str], overwrite: bool,
         creds: tuple[str, str]) -> dict:
    url = f"https://{target_domain}/wp-json/sgs/v1/site-info"
    body = json.dumps({"fields": fields, "overwrite": overwrite}).encode("utf-8")
    token = base64.b64encode(f"{creds[0]}:{creds[1]}".encode()).decode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {token}",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="Tier-1 business-info extractor + pusher")
    ap.add_argument("--draft", required=True, help="Path to the draft mockup HTML file")
    ap.add_argument("--target-domain", help="Live site domain (required for --push)")
    ap.add_argument("--push", action="store_true", help="Write to the live site (else print only)")
    ap.add_argument("--overwrite", action="store_true",
                    help="Overwrite existing non-empty values (default: fill-if-empty)")
    ap.add_argument("--app-user", help="REST Basic-auth username")
    ap.add_argument("--app-password", help="REST Basic-auth application password")
    args = ap.parse_args()

    draft_path = Path(args.draft)
    if not draft_path.is_file():
        print(f"[sync-business-info] draft not found: {draft_path}", file=sys.stderr)
        return 1

    html = draft_path.read_text(encoding="utf-8", errors="replace")
    fields = extract_business_info(html)

    print("[sync-business-info] high-confidence fields extracted from the draft:")
    if not fields:
        print("  (none found)")
    for k, v in fields.items():
        print(f"  {k:24} = {v}")

    if not args.push:
        print("\n[sync-business-info] extract-only (no --push). Nothing written.")
        return 0

    if not fields:
        print("\n[sync-business-info] nothing to push.")
        return 0

    if not args.target_domain:
        print("[sync-business-info] --push requires --target-domain", file=sys.stderr)
        return 2

    creds = resolve_credentials(args.target_domain, args.app_user, args.app_password)
    if not creds:
        print("[sync-business-info] no REST credentials resolved — cannot push", file=sys.stderr)
        return 3

    try:
        resp = push(args.target_domain, fields, args.overwrite, creds)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        print(f"[sync-business-info] push HTTP {exc.code}: {detail}", file=sys.stderr)
        return 4
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"[sync-business-info] push failed: {exc}", file=sys.stderr)
        return 4

    r = resp.get("result", {})
    print(f"\n[sync-business-info] push result (overwrite={resp.get('overwrite')}):")
    for bucket in ("written", "unchanged", "skipped_existing", "skipped_invalid", "skipped_empty", "failed"):
        vals = r.get(bucket, [])
        if vals:
            print(f"  {bucket:18}: {', '.join(vals)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
