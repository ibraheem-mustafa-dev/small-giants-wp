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
        default=144,
        help="WP object ID (default: 144 = rc-fix-verification-mamas-munches page; "
             "page 131 was deleted between 2026-05-20 and 2026-05-23, see "
             ".claude/parking.md → P-CANARY-PAGE-131-DELETED)",
    )
    parser.add_argument(
        "--client",
        type=str,
        default="",
        help=(
            "Client slug for theme.json snapshot deployment after patching. "
            "When set, invokes push-theme-snapshot.py to diff (or push, with "
            "--push-theme-snapshot) the local sites/<client>/theme-snapshot.json "
            "against the target site. Phase 5a (2026-05-22) replacement for the "
            "deleted /wp-json/sgs/v1/active-variation REST endpoint."
        ),
    )
    parser.add_argument(
        "--push-theme-snapshot",
        action="store_true",
        help=(
            "Actually push the client's theme.json snapshot to the target "
            "site (default: dry-run / --no-push, which only diffs). Safety "
            "net: even with this flag, push-theme-snapshot.py enforces "
            "--no-push on shared dev surfaces (sandybrown / palestine-lives) "
            "unless --yes is also threaded through. Off by default — "
            "orchestrator users must opt in explicitly."
        ),
    )
    parser.add_argument(
        "--snapshot-ssh-host",
        type=str,
        default="u945238940@141.136.39.73",
        help="SSH host for push-theme-snapshot.py (default: Hostinger sandybrown SSH).",
    )
    parser.add_argument(
        "--snapshot-target-domain",
        type=str,
        default="sandybrown-nightingale-600381.hostingersite.com",
        help="Target site domain for push-theme-snapshot.py REST + path derivation.",
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

    # Find every mockup-relative image URL in block_markup. Matches any image
    # path under `../../research/<subfolder>/` (photography, brand, etc.) per
    # the repo's mockup-asset layout (sites/<client>/mockups/ -> ../../research/).
    urls = sorted(set(re.findall(
        r'\.\./\.\./research/[\w\-./]+?\.(?:jpe?g|png|webp|gif|svg)',
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

    # Abort path: only fire when we found relative URLs to upload AND every
    # upload failed. When the mockup has 0 relative URLs (all images are
    # absolute / already in WP media library / atomic blocks with no images),
    # there's nothing to upload — proceed with the patch unchanged. The
    # previous abort-on-empty-url_map was a logic bug that blocked Stage 11
    # measurement whenever the markup had zero matches for the relative-URL
    # regex. (Fix per Phase 1.5 deploy-machinery audit 2026-05-27.)
    if urls and not url_map:
        print("\nNo uploads succeeded; aborting patch + post update.")
        sys.exit(1)
    if not urls:
        print("(no relative image URLs to upload — proceeding to patch)")

    # Patch block_markup
    new_bm = bm
    for old, new in url_map.items():
        new_bm = new_bm.replace(old, new)
    print(f"\nPatched block_markup: {len(bm)} -> {len(new_bm)} chars")

    # Prepend variation-d0-d2.css as an inline <style> block so the page
    # carries its own scoped CSS (Spec 16 §FR6 D2). Rules in the file are
    # already scoped via `.page-id-N`, so no per-page leak risk. Wrapped in
    # a `wp:html` block so Gutenberg preserves the raw <style> tag verbatim
    # across edits without converting it to a paragraph or stripping it.
    css_path = run_dir / "variation-d0-d2.css"
    if css_path.exists():
        css_text = css_path.read_text(encoding="utf-8")
        if css_text.strip():
            style_block = (
                "<!-- wp:html -->\n"
                f'<style id="sgs-cv2-page-css" data-page-id="{args.target_id}" '
                f'data-run-id="{run_dir.name}">\n{css_text}\n</style>\n'
                "<!-- /wp:html -->\n\n"
            )
            new_bm = style_block + new_bm
            print(f"Prepended variation-d0-d2.css ({len(css_text)} chars) as inline <style> block")
    else:
        print(f"  (no variation-d0-d2.css found at {css_path} -- skipping inline CSS injection)")

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
            # Defensive: confirm the response ID matches the requested target ID.
            # WP's REST PATCH against an existing page returns its id; if WP
            # somehow returned a different id (race, redirect, upsert behaviour)
            # we should halt rather than silently report success.
            resp_id = r.get("id")
            if resp_id is not None and str(resp_id) != str(args.target_id):
                print(
                    f"  HALTED: WP REST returned id={resp_id} but requested "
                    f"target was {args.target_id}",
                    file=sys.stderr,
                )
                sys.exit(5)
            print(f"  {args.target} {args.target_id} modified {r.get('modified')} link={r.get('link')}")
        else:
            # 200 OK but response body doesn't look like a WP REST page record.
            # Surface the raw response so the operator can diagnose.
            # (Exit 6 — exit 3 is already used by the variation-activation-failed
            # path further down the script.)
            print(
                f"  HALTED: WP REST returned 200 but no recognisable "
                f"id-bearing JSON record. Body head: {resp[:300]!r}",
                file=sys.stderr,
            )
            sys.exit(6)
    except urllib.error.HTTPError as e:
        # Patch defect 2026-05-23 (P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE):
        # Earlier this except printed to stdout and continued. The wrapper
        # orchestrator interpreted exit-0 as success and fell back to a
        # literal "OK" string, masking 404s against deleted pages (verified
        # against sandybrown page 131 which was deleted between 2026-05-20
        # and 2026-05-23). Now we exit non-zero so the orchestrator can
        # halt with a clear error message.
        err_body = e.read().decode("utf-8", "ignore")[:300]
        print(f"  HTTP {e.code}: {err_body}", file=sys.stderr)
        sys.exit(4 if e.code == 404 else 1)

    # Phase 5a (2026-05-22 Decision 16') — Theme.json snapshot push.
    #
    # Replaces the deleted /wp-json/sgs/v1/active-variation REST endpoint.
    # The WP style-variation overlay system is retired; per-client snapshots
    # now live at sites/<client>/theme-snapshot.json and are deployed via
    # push-theme-snapshot.py over SSH+SCP. Default is --no-push (diff only).
    # The orchestrator must opt in to live push via --push-theme-snapshot.
    #
    # Snapshot push failures get exit code 3 — matches the previous variation-
    # activation contract so the orchestrator Stage 10 dispatch surfaces them
    # as a named warning instead of generic deploy-failed.
    import subprocess

    snapshot_failed = False
    if args.client:
        push_cli = (Path(__file__).resolve().parent.parent / "push-theme-snapshot.py")
        cmd = [
            sys.executable, str(push_cli),
            "--client", args.client,
            "--target", args.snapshot_ssh_host,
            "--target-domain", args.snapshot_target_domain,
        ]
        if not args.push_theme_snapshot:
            cmd.append("--no-push")
        else:
            cmd.append("--yes")  # orchestrator-driven, non-interactive
        print(f"\nPhase 5a snapshot {'PUSH' if args.push_theme_snapshot else 'DIFF'} for client '{args.client}'...")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            # Echo a trimmed view of the diff for operator visibility.
            for ln in result.stdout.splitlines():
                if ln.strip():
                    print(f"  {ln}")
            if result.returncode != 0:
                print(f"  snapshot push FAILED (exit {result.returncode}): {result.stderr[:300]}")
                snapshot_failed = True
        except subprocess.TimeoutExpired:
            print("  snapshot push TIMEOUT")
            snapshot_failed = True
        except Exception as e:  # noqa: BLE001
            print(f"  snapshot push ERROR: {e}")
            snapshot_failed = True
    else:
        print("\nNo --client passed; skipping theme.json snapshot push.")

    if snapshot_failed and args.push_theme_snapshot:
        # Only treat as a hard failure when the operator explicitly requested
        # a live push. A failed dry-run (--no-push) is still informative.
        sys.exit(3)


if __name__ == "__main__":
    main()
