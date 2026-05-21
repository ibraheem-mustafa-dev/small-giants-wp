#!/usr/bin/env python3
"""
push-theme-snapshot.py — Deploy a per-client theme.json snapshot to a WP site.

Phase 5a (2026-05-22) replacement for the deleted WP style-variation overlay
system. Each client now lives at `sites/<client>/theme-snapshot.json` (a full
theme.json). This CLI uploads that snapshot to a specific target site's
`wp-content/themes/sgs-theme/theme.json` over SSH+SCP and flushes WP cache.

Safety defaults:
  - `--no-push` / `--dry-run` only print the diff and exit
  - On sandybrown / palestine-lives.org targets, `--no-push` is forced unless
    `--yes` is supplied explicitly (prevents accidental overwrites on the
    shared dev/staging sites)
  - Operator overrides (keys present in `wp_global_styles` but absent from the
    local snapshot) are surfaced in the diff output — these will SURVIVE the
    push and are non-destructive

Examples:
    # Diff Mama's Munches snapshot against sandybrown (safe — never pushes)
    python push-theme-snapshot.py \\
        --client mamas-munches \\
        --target u945238940@141.136.39.73 \\
        --target-domain sandybrown-nightingale-600381.hostingersite.com \\
        --no-push

    # Push Indus Foods snapshot to live indusfoods.co.uk (explicit confirmation)
    python push-theme-snapshot.py \\
        --client indus-foods \\
        --target u945238940@141.136.39.73 \\
        --target-domain indusfoods.co.uk \\
        --yes
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Targets that always default to --no-push unless --yes is supplied.
# Shared dev/staging surfaces — accidental overwrites here are expensive.
SAFE_TARGETS = (
    "sandybrown-nightingale-600381.hostingersite.com",
    "palestine-lives.org",
)

DEFAULT_SSH_PORT = 65002
DEFAULT_TARGET_DOMAIN = "sandybrown-nightingale-600381.hostingersite.com"


def repo_root() -> Path:
    """Resolve the small-giants-wp repo root from this script's location."""
    return Path(__file__).resolve().parents[3]


def load_local_snapshot(client: str) -> dict:
    path = repo_root() / "sites" / client / "theme-snapshot.json"
    if not path.is_file():
        sys.exit(f"[push-theme-snapshot] local snapshot not found: {path}")
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def fetch_server_theme_json(target: str, port: int, server_path: str) -> dict | None:
    """SSH-cat the server's current theme.json. Returns None on failure."""
    cmd = ["ssh", "-p", str(port), target, f"cat {server_path}"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        print(f"[push-theme-snapshot] SSH timeout fetching {server_path}", file=sys.stderr)
        return None
    if result.returncode != 0:
        print(
            f"[push-theme-snapshot] SSH cat failed ({result.returncode}): "
            f"{result.stderr.strip()}",
            file=sys.stderr,
        )
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        print(f"[push-theme-snapshot] server theme.json not valid JSON: {exc}", file=sys.stderr)
        return None


def fetch_global_styles(target_domain: str) -> dict | None:
    """GET /wp-json/wp/v2/global-styles/themes/sgs-theme. None on failure."""
    url = f"https://{target_domain}/wp-json/wp/v2/global-styles/themes/sgs-theme"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            print(
                "[push-theme-snapshot] wp_global_styles REST returned 401 — "
                "operator overrides via Site Editor not checked (auth required). "
                "File-level diff still applies.",
                file=sys.stderr,
            )
        else:
            print(f"[push-theme-snapshot] wp_global_styles REST HTTP {exc.code}", file=sys.stderr)
        return None
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as exc:
        print(f"[push-theme-snapshot] wp_global_styles REST error: {exc}", file=sys.stderr)
        return None


def collect_keys(obj, prefix: str = "") -> set[str]:
    """Flatten dict into dotted-path keys. Lists collapse to '[]'."""
    keys: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            keys.add(path)
            keys.update(collect_keys(v, path))
    elif isinstance(obj, list):
        path = f"{prefix}[]"
        keys.add(path)
        for item in obj:
            keys.update(collect_keys(item, path))
    return keys


def diff_summary(local: dict, server: dict | None, global_styles: dict | None) -> str:
    lines: list[str] = []
    lines.append("== Theme.json diff (file level) ==")
    if server is None:
        lines.append("  server theme.json: unavailable — skipping file diff")
    else:
        local_keys = collect_keys(local)
        server_keys = collect_keys(server)
        added = sorted(local_keys - server_keys)
        removed = sorted(server_keys - local_keys)
        lines.append(f"  keys to add (in snapshot, not in server): {len(added)}")
        for k in added[:15]:
            lines.append(f"    + {k}")
        if len(added) > 15:
            lines.append(f"    ... and {len(added) - 15} more")
        lines.append(f"  keys to remove (in server, not in snapshot): {len(removed)}")
        for k in removed[:15]:
            lines.append(f"    - {k}")
        if len(removed) > 15:
            lines.append(f"    ... and {len(removed) - 15} more")

    lines.append("")
    lines.append("== Operator overrides (wp_global_styles via REST) ==")
    if global_styles is None:
        lines.append("  REST unavailable — operator overrides not checked")
    else:
        styles = global_styles.get("styles") or {}
        settings = global_styles.get("settings") or {}
        override_keys = collect_keys({"styles": styles, "settings": settings})
        local_keys = collect_keys({"styles": local.get("styles") or {}, "settings": local.get("settings") or {}})
        survivors = sorted(override_keys - local_keys)
        lines.append(f"  operator override keys that SURVIVE the push: {len(survivors)}")
        for k in survivors[:20]:
            lines.append(f"    ~ {k}")
        if len(survivors) > 20:
            lines.append(f"    ... and {len(survivors) - 20} more")
    return "\n".join(lines)


def push_snapshot(target: str, port: int, server_path: str, local_path: Path) -> bool:
    scp_target = f"{target}:{server_path}"
    cmd_scp = ["scp", "-P", str(port), str(local_path), scp_target]
    print(f"[push-theme-snapshot] scp → {scp_target}")
    result = subprocess.run(cmd_scp, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[push-theme-snapshot] scp failed: {result.stderr.strip()}", file=sys.stderr)
        return False

    wp_root = server_path.rsplit("/wp-content/", 1)[0]
    cmd_flush = ["ssh", "-p", str(port), target, f"cd {wp_root} && wp cache flush"]
    print(f"[push-theme-snapshot] wp cache flush @ {wp_root}")
    result = subprocess.run(cmd_flush, capture_output=True, text=True)
    if result.returncode != 0:
        print(
            f"[push-theme-snapshot] wp cache flush returned {result.returncode}: "
            f"{result.stderr.strip()} — push completed but cache may be stale",
            file=sys.stderr,
        )
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--client", required=True, help="Client slug (matches sites/<slug>/)")
    parser.add_argument("--target", required=True, help="SSH host (e.g. u945238940@141.136.39.73)")
    parser.add_argument("--target-domain", default=DEFAULT_TARGET_DOMAIN, help="Target site domain")
    parser.add_argument("--port", type=int, default=DEFAULT_SSH_PORT, help="SSH port (Hostinger uses 65002)")
    parser.add_argument("--yes", action="store_true", help="Skip interactive confirmation")
    parser.add_argument("--no-push", "--dry-run", dest="no_push", action="store_true", help="Print diff and exit (no upload)")
    args = parser.parse_args()

    local = load_local_snapshot(args.client)
    local_path = repo_root() / "sites" / args.client / "theme-snapshot.json"
    server_path = f"domains/{args.target_domain}/public_html/wp-content/themes/sgs-theme/theme.json"

    safe_target = any(safe in args.target_domain for safe in SAFE_TARGETS)
    if safe_target and not args.yes:
        if not args.no_push:
            print(f"[push-theme-snapshot] {args.target_domain} is a safe target — forcing --no-push (override with --yes)")
        args.no_push = True

    server = fetch_server_theme_json(args.target, args.port, server_path)
    global_styles = fetch_global_styles(args.target_domain)

    print(diff_summary(local, server, global_styles))
    print()

    if args.no_push:
        print("[push-theme-snapshot] --no-push set — exiting without upload")
        return 0

    if not args.yes:
        answer = input(f"Push {args.client} snapshot to {args.target_domain}? [y/N] ").strip().lower()
        if answer != "y":
            print("[push-theme-snapshot] aborted by operator")
            return 0

    if not push_snapshot(args.target, args.port, server_path, local_path):
        return 1

    print(f"[push-theme-snapshot] success — verify at https://{args.target_domain}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
