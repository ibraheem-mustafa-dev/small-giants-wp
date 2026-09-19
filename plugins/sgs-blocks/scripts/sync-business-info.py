#!/usr/bin/env python3
"""
sync-business-info.py — Tier-1 business-data extractor + pusher (D325, Spec 33 FR-33-14).

Extracts ONLY high-confidence, machine-signal business-data fields from a draft
mockup and (optionally) writes them to the live site's Business Details store via
the capability-gated REST endpoint POST /wp-json/sgs/v1/site-info (fill-if-empty).

HIGH-CONFIDENCE signals only (Tier 1) — never a semantic guess:
  - email        <- a declared data-object key, an explicit "Email" label, or the first `mailto:` link
  - phone        <- a declared data-object key, an explicit "Phone" label, or the first `tel:` link
  - socials.<n>  <- a declared data-object key, or an <a href> on a known social host (skips '#')
  - address      <- a declared data-object `address` key or an explicit Address/Clinic label ONLY
  - opening_hours.<day> <- a declared `hours` key or an explicit Hours label, `Mon-Sat 9.30-17.30` ranges
  - copyright    <- the text of the line containing a (c) / &copy;

Three sources, in this precedence when the same key turns up more than once
(never two different values for one key):
  1. the draft's script data object (`key: 'value'` pairs whose key is in VOCABULARY)
  2. labelled page text (an element whose own text is exactly a LABELS entry, then its sibling value)
  3. literal `mailto:` / `tel:` / `href=` / (c) text

Address and hours are Tier 1 ONLY when they come from a declared data object or an explicit
label, never from free-floating guessing. Every value is validated by SHAPE (email regex, UK
postcode or 3+ words, https URL on a known host of the right network) and a value that fails is
dropped, not written. Tagline and other free text remain Tier 2 and are not written.

Phone storage: the value is stored as the human-readable form the draft shows ("0121 729 8233").
`sgs/business-info` renders the stored text as the visible label and builds the tel: link by
stripping every non-digit/+ character, so the spaced form is correct for BOTH the text and the link.

`--map-out PATH` writes the placeholder map: which `{{ binding }}` in the draft template resolves
to which Site Info key (and as what: text / tel-href / url), so a cloner can bind blocks to
Site Info instead of copying the literal. Keys with no Site Info equivalent (a map link) are
listed with `"key": null` and are never invented.

The push is FILL-IF-EMPTY by default: an existing non-empty value is never
overwritten (the endpoint enforces this; --overwrite flips it).

Usage:
    # Extract + print only (no write)
    python plugins/sgs-blocks/scripts/sync-business-info.py \
        --draft "sites/<client>/.../draft.html" [--map-out placeholder-map.json]

    # Extract + push (fill-if-empty)
    python plugins/sgs-blocks/scripts/sync-business-info.py \
        --draft "sites/<client>/.../draft.html" --target-domain <host> --push

Credentials (for --push):
  1. The .claude/secrets/*.env file whose WP_URL_<KEY> host equals --target-domain
     (uses that file's WP_USER_<KEY> and WP_APP_PWD_<KEY>)
  2. --app-user / --app-password flags
  3. SGS_WP_APP_USER / SGS_WP_APP_PWD env vars

Layout: this file is only the command line. The logic lives in the `business_info` package beside
it (vocabulary tables, shape validation, the three sources, the placeholder map, credentials and
the REST push); a hyphenated filename cannot be imported, which is why the split exists.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from business_info.credentials import repo_root, resolve_credentials, secrets_dir  # noqa: E402
from business_info.extract import extract_business_info  # noqa: E402
from business_info.placeholder_map import build_placeholder_map  # noqa: E402
from business_info.push import push  # noqa: E402
from business_info.script_source import find_unmapped  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

# Re-exported so existing importers of this script keep working.
__all__ = [
    "build_placeholder_map", "extract_business_info", "find_unmapped", "main", "push",
    "repo_root", "resolve_credentials", "secrets_dir",
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Tier-1 business-info extractor + pusher")
    ap.add_argument("--draft", required=True, help="Path to the draft mockup HTML file")
    ap.add_argument("--target-domain", help="Live site domain (required for --push)")
    ap.add_argument("--push", action="store_true", help="Write to the live site (else print only)")
    ap.add_argument("--overwrite", action="store_true",
                    help="Overwrite existing non-empty values (default: fill-if-empty)")
    ap.add_argument("--app-user", help="REST Basic-auth username")
    ap.add_argument("--app-password", help="REST Basic-auth application password")
    ap.add_argument("--map-out", type=Path,
                    help="Write the {{ binding }} -> Site Info placeholder map here (JSON)")
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

    unmapped = find_unmapped(html)
    for k, v in unmapped.items():
        print(f"  (unmapped: no Site Info key) {k} = {v}")

    if args.map_out:
        args.map_out.parent.mkdir(parents=True, exist_ok=True)
        args.map_out.write_text(
            json.dumps(build_placeholder_map(html), indent=2, sort_keys=True, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"[sync-business-info] placeholder map written: {args.map_out}")

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
