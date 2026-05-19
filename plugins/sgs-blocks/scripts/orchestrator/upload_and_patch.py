#!/usr/bin/env python3
"""One-shot: upload all mockup images to sandybrown WP Media Library +
patch the converter's block_markup to use the new attachment URLs +
update the target WP page (or post).

Usage:
    upload_and_patch.py <pipeline-state/run-dir> [--target page|post] [--target-id N]

Defaults: --target page --target-id 131 (cv2-output-mamas-munches).

Why pages, not posts: SGS clones websites; websites are PAGES rendered via
`page.html` (no .entry-content max-width constraint). Posts render via
`single.html` which constrains content-width to 800px and is wrong for
landing-page clones. See .claude/parking.md → P-USE-PAGES-NOT-POSTS.

Reads sandybrown credentials from .claude/secrets/sandybrown.env.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Moved 2026-05-19 from reports/brand-walkdown-2026-05-19/ to canonical
# location at plugins/sgs-blocks/scripts/orchestrator/. parents math shifts
# to [4] (orchestrator → scripts → sgs-blocks → plugins → repo).
REPO = Path(__file__).resolve().parents[4]
MOCKUP_ROOT = REPO / "sites/mamas-munches/mockups/homepage"
ENV = REPO / ".claude/secrets/sandybrown.env"

# Parse env
env: dict[str, str] = {}
for line in ENV.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, _, v = line.partition("=")
    env[k.strip()] = v.strip().strip('"').strip("'")

WP_URL = env["WP_URL_SANDYBROWN"]
USER = env["WP_USER_SANDYBROWN"]
PW = env["WP_APP_PWD_SANDYBROWN"]
AUTH = "Basic " + base64.b64encode(f"{USER}:{PW}".encode()).decode()


def upload_one(file_path: Path) -> dict:
    mime, _ = mimetypes.guess_type(str(file_path))
    mime = mime or "application/octet-stream"
    data = file_path.read_bytes()
    req = urllib.request.Request(
        f"{WP_URL}/wp-json/wp/v2/media",
        data=data, method="POST",
        headers={
            "Authorization": AUTH,
            "Content-Type": mime,
            "Content-Disposition": f'attachment; filename="{file_path.name}"',
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
        idx = raw.find("{")
        return json.loads(raw[idx:]) if idx >= 0 else {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dir", type=Path, help="pipeline-state/<run-id> directory")
    parser.add_argument(
        "--target",
        choices=("page", "post"),
        default="page",
        help="WP object type to update (default: page — see P-USE-PAGES-NOT-POSTS)",
    )
    parser.add_argument(
        "--target-id",
        type=int,
        default=131,
        help="WP object ID (default: 131 = cv2-output-mamas-munches page)",
    )
    parser.add_argument(
        "--client",
        type=str,
        default="",
        help=(
            "Client slug to activate as the site-wide style variation after "
            "patching. When set, POSTs to /wp-json/sgs/v1/active-variation. "
            "Required for the variation CSS file (theme/sgs-theme/styles/"
            "<client>.css) to actually load on the live page. Shipped "
            "2026-05-20 per Pipeline Root-Gap Council R1."
        ),
    )
    args = parser.parse_args()

    run_dir: Path = args.run_dir
    if not run_dir.exists():
        print(f"run dir not found: {run_dir}", file=sys.stderr)
        sys.exit(2)

    endpoint = f"{WP_URL}/wp-json/wp/v2/{'pages' if args.target == 'page' else 'posts'}/{args.target_id}"
    print(f"Target: {args.target} id={args.target_id} -> {endpoint}\n")

    extract_path = run_dir / "extract.json"
    d = json.loads(extract_path.read_text(encoding="utf-8"))
    bm = d.get("block_markup", "")

    # Find every mockup-relative image URL in block_markup
    urls = sorted(set(re.findall(
        r'\.\./\.\./research/photography/wp-media-library/[\w\-.]+\.(?:jpe?g|png|webp|gif|svg)',
        bm, re.IGNORECASE,
    )))
    print(f"Found {len(urls)} unique relative image URL(s)")
    for u in urls:
        print(f"  {u}")
    print()

    url_map: dict[str, str] = {}
    for u in urls:
        local = (MOCKUP_ROOT / u).resolve()
        # Permit any path inside the repo (mockup `../../research/...` is legit).
        try:
            local.relative_to(REPO.resolve())
        except ValueError:
            print(f"  SKIP (escapes repo root): {local}")
            continue
        if not local.exists():
            print(f"  MISSING: {local}")
            continue
        try:
            resp = upload_one(local)
            new_url = resp.get("source_url") or resp.get("guid", {}).get("rendered", "")
            if new_url:
                url_map[u] = new_url
                print(f"  uploaded {local.name} -> id={resp.get('id')} url={new_url}")
            else:
                print(f"  no source_url in response for {local.name}: {resp}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")[:200]
            print(f"  HTTP {e.code} on {local.name}: {err_body}")
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR on {local.name}: {e}")

    if not url_map:
        print("\nNo uploads succeeded; aborting patch + post update.")
        sys.exit(1)

    # Patch block_markup
    new_bm = bm
    for old, new in url_map.items():
        new_bm = new_bm.replace(old, new)
    print(f"\nPatched block_markup: {len(bm)} -> {len(new_bm)} chars")

    # Save patched markup
    out = run_dir / "extract.patched.json"
    d["block_markup"] = new_bm
    out.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved patched extract to {out}")

    # Update target WP object
    print(f"\nUpdating sandybrown {args.target} {args.target_id}...")
    req = urllib.request.Request(
        endpoint,
        data=json.dumps({"content": new_bm}).encode(),
        method="POST",
        headers={"Authorization": AUTH, "Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=120).read().decode("utf-8", errors="ignore")
        idx = resp.find('{"id"')
        if idx >= 0:
            r = json.loads(resp[idx:])
            print(f"  {args.target} {args.target_id} modified {r.get('modified')} link={r.get('link')}")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")

    # Activate the matching style variation site-wide.
    # Without this, the variation CSS file written by Stage 0.7 never
    # enqueues (theme/sgs-theme/functions.php gates on active_theme_style
    # theme_mod). Pipeline Root-Gap Council R1.
    #
    # Variation activation failures get a distinct exit code (3) so the
    # orchestrator's Stage 10 dispatch surfaces them as a named warning
    # instead of burying them in stderr. The page-PATCH already succeeded
    # at this point; we don't want to claim Stage 10 "deployed" when the
    # variation didn't actually activate.
    variation_failed = False
    if args.client:
        print(f"\nActivating style variation '{args.client}' site-wide...")
        var_req = urllib.request.Request(
            f"{WP_URL}/wp-json/sgs/v1/active-variation",
            data=json.dumps({"slug": args.client}).encode(),
            method="POST",
            headers={"Authorization": AUTH, "Content-Type": "application/json"},
        )
        try:
            var_resp = urllib.request.urlopen(var_req, timeout=30).read().decode("utf-8", errors="ignore")
            var_body = json.loads(var_resp) if var_resp.strip().startswith("{") else {}
            prev = var_body.get("previous_slug", "")
            activated = bool(var_body.get("activated"))
            print(f"  variation: {prev or '(none)'} -> {var_body.get('slug', args.client)} (activated={activated})")
            if not activated:
                print(f"  variation FAIL: REST endpoint reported activated=false. body={var_body}")
                variation_failed = True
        except urllib.error.HTTPError as e:
            print(f"  variation HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:300]}")
            variation_failed = True
        except Exception as e:  # noqa: BLE001
            print(f"  variation ERROR: {e}")
            variation_failed = True
    else:
        print("\nNo --client passed; skipping variation activation (variation CSS will not load).")

    if variation_failed:
        sys.exit(3)


if __name__ == "__main__":
    main()
