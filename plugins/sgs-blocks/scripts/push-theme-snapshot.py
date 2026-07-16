#!/usr/bin/env python3
"""
push-theme-snapshot.py — Deploy a per-client theme.json snapshot to a WP site.

Phase 5a (2026-05-22) replacement for the deleted WP style-variation overlay
system. Each client now lives at `sites/<client>/theme-snapshot.json` (a full
theme.json). This CLI uploads that snapshot to a specific target site's
`wp-content/themes/sgs-theme/theme.json` over SSH+SCP and flushes WP cache.

FR-26-D2 (2026-06-03): on a real push, ALSO writes the snapshot's `styles` +
`settings` to the live `wp_global_styles` database post via the WP REST API.
Without this, the Site-Editor user layer silently overrides the on-disk
theme.json for every property it already defines.  Post ID is discovered at
push-time via `wp post list --post_type=wp_global_styles` over the existing SSH
connection — deterministic and requires no hardcoded constant.

Credential lookup order (for the REST write):
  1. Known target domain → named secrets file in `.claude/secrets/`
     (currently: sandybrown-* → sandybrown.env vars WP_USER_SANDYBROWN /
      WP_APP_PWD_SANDYBROWN)
  2. CLI flags `--app-user` / `--app-password`
  3. Environment variables SGS_WP_APP_USER / SGS_WP_APP_PWD

Safety defaults:
  - `--no-push` / `--dry-run` only print the diff and exit; no REST write
  - On sandybrown / palestine-lives.org targets, `--no-push` is forced unless
    `--yes` is supplied explicitly (prevents accidental overwrites on the
    shared dev/staging sites)
  - Operator overrides (keys present in `wp_global_styles` but absent from the
    local snapshot) are surfaced in the diff output

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
import base64
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Windows consoles default to cp1252, which cannot encode the '->' arrow glyph
# used in diff output -> UnicodeEncodeError. Force UTF-8 on the standard streams.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Targets that always default to --no-push unless --yes is supplied.
# Shared dev/staging surfaces — accidental overwrites here are expensive.
SAFE_TARGETS = (
    "sandybrown-nightingale-600381.hostingersite.com",
    "palestine-lives.org",
)

DEFAULT_SSH_PORT = 65002
DEFAULT_TARGET_DOMAIN = "sandybrown-nightingale-600381.hostingersite.com"

# The framework theme this script deploys. WordPress names the user-layer
# global-styles post `wp-global-styles-<stylesheet>`, so this drives a
# deterministic post-ID lookup (see discover_global_styles_post_id).
THEME_STYLESHEET = "sgs-theme"

# ---------------------------------------------------------------------------
# Credential helpers (FR-26-D2)
# ---------------------------------------------------------------------------

def _load_env_file(path: Path) -> dict[str, str]:
    """Parse a simple KEY=VALUE env file. Lines starting with # are ignored."""
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


def resolve_app_credentials(
    target_domain: str,
    cli_user: str | None,
    cli_password: str | None,
) -> tuple[str, str] | None:
    """
    Return (username, app_password) for REST Basic auth, or None if unavailable.

    Lookup order:
      1. Known domain → named secrets file (sandybrown.env etc.)
      2. CLI flags --app-user / --app-password
      3. Environment variables SGS_WP_APP_USER / SGS_WP_APP_PWD
    """
    secrets_dir = repo_root() / ".claude" / "secrets"

    # Domain-keyed lookup — extend this dict for each new client target.
    domain_env_map: dict[str, tuple[Path, str, str]] = {
        "sandybrown": (
            secrets_dir / "sandybrown.env",
            "WP_USER_SANDYBROWN",
            "WP_APP_PWD_SANDYBROWN",
        ),
    }

    for domain_key, (env_path, user_var, pwd_var) in domain_env_map.items():
        if domain_key in target_domain:
            env = _load_env_file(env_path)
            user = env.get(user_var, "")
            pwd = env.get(pwd_var, "").replace(" ", "")  # strip WP app-pwd spaces
            if user and pwd:
                return user, pwd
            print(
                f"[push-theme-snapshot] WARNING: matched secrets file {env_path} "
                f"but {user_var}/{pwd_var} are missing or empty",
                file=sys.stderr,
            )
            break

    # CLI flags
    if cli_user and cli_password:
        return cli_user, cli_password.replace(" ", "")

    # Environment variables
    env_user = os.environ.get("SGS_WP_APP_USER", "")
    env_pwd = os.environ.get("SGS_WP_APP_PWD", "").replace(" ", "")
    if env_user and env_pwd:
        return env_user, env_pwd

    return None


def _basic_auth_header(username: str, app_password: str) -> str:
    """Return a Base64-encoded Basic auth header value. Never logs the secret."""
    token = base64.b64encode(f"{username}:{app_password}".encode()).decode()
    return f"Basic {token}"


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


# Hostinger's WAF returns 403 to the DEFAULT `Python-urllib/x.y` User-Agent, before the
# request ever reaches WordPress. PROVEN 2026-07-16 on palestine-lives: identical URL +
# identical app-password credentials → curl default UA 200, `-A "Python-urllib/3.13"` 403,
# `-A "Mozilla/5.0"` 200. Every urllib call in this file MUST therefore send an explicit
# UA, or the whole REST layer (read AND write) silently fails closed on every Hostinger
# site — which is all of them.
_REST_UA = "sgs-push-theme-snapshot/1.0 (+https://smallgiants.studio)"


def fetch_global_styles(target_domain: str, post_id: int, auth_header: str | None = None) -> dict | None:
    """GET /wp-json/wp/v2/global-styles/{post_id} — the USER-LAYER post. None on failure.

    Targets the SAME post the WRITE (`post_global_styles`) modifies (2026-07-16). It
    previously read `/global-styles/themes/{stylesheet}`, which is the theme's RESOLVED
    styles (a different, read-only layer) — so the backup captured a layer the write
    never touched (rollback could not undo the write) and the drift check compared the
    wrong thing. Both now key on the user-layer post id. Proven on palestine-lives: post
    7 (`isGlobalStylesUserThemeJSON:true`) is the layer holding the live `Source Sans 3`
    override that paints over theme.json.

    AUTHENTICATES: the route needs `edit_theme_options`, so an anonymous GET 403s — which
    used to make `global_styles` None on every run and abort the backup-or-push gate. The
    writer sent Basic auth; this reader now does too.
    """
    url = f"https://{target_domain}/wp-json/wp/v2/global-styles/{post_id}"
    req = urllib.request.Request(url, headers={"User-Agent": _REST_UA})
    if auth_header:
        req.add_header("Authorization", auth_header)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            print(
                f"[push-theme-snapshot] wp_global_styles REST returned {exc.code} — "
                "the Site-Editor layer could not be read"
                + ("" if auth_header else " (NO credentials were supplied for this read)")
                + ". This layer OVERRIDES theme.json, so a push cannot be verified or "
                "rolled back without it.",
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


def collect_leaves(obj, prefix: str = "") -> dict[str, object]:
    """Flatten dict/list into dotted-path -> LEAF VALUE pairs (mirrors collect_keys' traversal
    shape, but captures the terminal scalar value at each path instead of just the path itself).

    Used by drift_warning for value-level drift detection (FR-33-11) — collect_keys alone can
    only say a key exists on both sides, not whether the two sides AGREE on its value.
    """
    leaves: dict[str, object] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            leaves.update(collect_leaves(v, path))
    elif isinstance(obj, list):
        path = f"{prefix}[]"
        for item in obj:
            leaves.update(collect_leaves(item, path))
    else:
        leaves[prefix] = obj
    return leaves


def _truncate_for_log(value: object, limit: int = 80) -> str:
    """Render a value for a log line, truncating long strings so the console stays readable."""
    text = repr(value)
    if len(text) > limit:
        text = text[: limit - 3] + "..."
    return text


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


def _wp_post_list(target: str, port: int, wp_root: str, extra: str) -> list | None:
    """Run `wp post list ... --format=json` over SSH and parse the rows."""
    cmd = [
        "ssh", "-p", str(port), target,
        f"cd {wp_root} && wp post list --post_type=wp_global_styles "
        f"{extra} --fields=ID,post_name --format=json",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        print("[push-theme-snapshot] SSH timeout discovering global-styles post ID", file=sys.stderr)
        return None
    if result.returncode != 0:
        print(
            f"[push-theme-snapshot] wp post list failed ({result.returncode}): "
            f"{result.stderr.strip()}",
            file=sys.stderr,
        )
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        print(f"[push-theme-snapshot] wp post list output not valid JSON: {exc}", file=sys.stderr)
        return None


def discover_global_styles_post_id(target: str, port: int, wp_root: str) -> int | None:
    """
    Return the `wp_global_styles` user-layer post ID via `wp post list` over SSH.

    Uses the same SSH connection already established for SCP/cache-flush.
    `wp post list --post_type=wp_global_styles` is a read-only WP-CLI command
    and is not gated by the wp-content-guard hook.  Returns None on failure.

    Discovery is deterministic: WordPress names the active theme's user-layer
    post `wp-global-styles-<stylesheet>`, so we filter by that name first
    (correct even if older themes left orphan global-styles posts behind).
    If the name filter yields nothing (an unexpected WP version), we fall back
    to the single unfiltered post with a warning. On the sandybrown canary the
    value is 7 — verified live, not a hardcoded constant.
    """
    expected_name = f"wp-global-styles-{THEME_STYLESHEET}"

    # Primary: filter by the deterministic post_name for this theme.
    rows = _wp_post_list(target, port, wp_root, f"--name={expected_name}")
    if rows is None:
        return None  # SSH/parse failure already reported.
    match = next((r for r in rows if r.get("post_name") == expected_name), None)
    if match is not None:
        post_id = int(match["ID"])
        print(f"[push-theme-snapshot] discovered wp_global_styles post ID: {post_id} ({expected_name})")
        return post_id

    # Fallback: no name match — take the single unfiltered post if exactly one exists.
    all_rows = _wp_post_list(target, port, wp_root, "")
    if all_rows is None:
        return None
    if not all_rows:
        print("[push-theme-snapshot] no wp_global_styles post found on server", file=sys.stderr)
        return None
    if len(all_rows) > 1:
        print(
            f"[push-theme-snapshot] ERROR: {len(all_rows)} wp_global_styles posts found and none "
            f"named {expected_name} — refusing to guess which is the active theme's. Aborting.",
            file=sys.stderr,
        )
        return None
    post_id = int(all_rows[0]["ID"])
    print(
        f"[push-theme-snapshot] WARNING: no post named {expected_name}; "
        f"falling back to the only wp_global_styles post (ID {post_id})"
    )
    return post_id


def post_global_styles(
    target_domain: str,
    post_id: int,
    snapshot: dict,
    auth_header: str,
) -> bool:
    """
    POST the snapshot's `styles` + `settings` to /wp/v2/global-styles/{post_id}.

    Fires AFTER the disk push (SCP + cache flush) so both the file layer and
    the database user layer are updated in one operation.

    Body: { "styles": <snapshot styles or {}>, "settings": <snapshot settings or {}> }
    Content-Type: application/json
    Authorization: Basic <base64(user:app_pwd)>

    Returns True on success, False on failure.  A failed write on a real push
    is always loud — never swallowed silently.
    """
    url = f"https://{target_domain}/wp-json/wp/v2/global-styles/{post_id}"
    body: dict = {
        "styles": snapshot.get("styles") or {},
        "settings": snapshot.get("settings") or {},
    }
    body_bytes = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body_bytes,
        method="POST",
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": _REST_UA,
        },
    )
    print(f"[push-theme-snapshot] POST /wp/v2/global-styles/{post_id} → {url}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            returned_id = resp_data.get("id")
            print(
                f"[push-theme-snapshot] global-styles POST success "
                f"(response id: {returned_id})"
            )
            return True
    except urllib.error.HTTPError as exc:
        body_text = ""
        try:
            body_text = exc.read().decode("utf-8", errors="replace")[:400]
        except Exception:  # noqa: BLE001
            pass
        print(
            f"[push-theme-snapshot] ERROR: global-styles POST failed HTTP {exc.code} — "
            f"the disk push completed but the live user-layer was NOT updated. "
            f"Response: {body_text}",
            file=sys.stderr,
        )
        return False
    except (urllib.error.URLError, TimeoutError) as exc:
        print(
            f"[push-theme-snapshot] ERROR: global-styles POST network error — "
            f"the disk push completed but the live user-layer was NOT updated. "
            f"Detail: {exc}",
            file=sys.stderr,
        )
        return False


def flush_cache(target: str, port: int, wp_root: str) -> None:
    """`wp cache flush` over SSH. Non-fatal — a stale cache is recoverable."""
    cmd_flush = ["ssh", "-p", str(port), target, f"cd {wp_root} && wp cache flush"]
    print(f"[push-theme-snapshot] wp cache flush @ {wp_root}")
    result = subprocess.run(cmd_flush, capture_output=True, text=True)
    if result.returncode != 0:
        print(
            f"[push-theme-snapshot] wp cache flush returned {result.returncode}: "
            f"{result.stderr.strip()} — operation completed but cache may be stale",
            file=sys.stderr,
        )


def push_snapshot(target: str, port: int, server_path: str, local_path: Path) -> bool:
    scp_target = f"{target}:{server_path}"
    cmd_scp = ["scp", "-P", str(port), str(local_path), scp_target]
    print(f"[push-theme-snapshot] scp → {scp_target}")
    result = subprocess.run(cmd_scp, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[push-theme-snapshot] scp failed: {result.stderr.strip()}", file=sys.stderr)
        return False

    wp_root = server_path.rsplit("/wp-content/", 1)[0]
    flush_cache(target, port, wp_root)
    return True


# ---------------------------------------------------------------------------
# FR-33-11 deploy safety: backup-before-overwrite + one-command rollback + drift-warn.
# ---------------------------------------------------------------------------
def _backup_dir(client: str) -> Path:
    d = repo_root() / "sites" / client / "theme-snapshot-backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def persist_backup(client: str, target_domain: str, server_theme: dict | None,
                   global_styles: dict | None, stamp: str) -> Path | None:
    """Persist the CURRENT live layers (disk theme.json + wp_global_styles) to a timestamped file.

    Returns the backup path, or None if there was nothing to back up (fresh target). This is the
    rollback source of truth (FR-33-11) — never overwrite live without one.
    """
    if server_theme is None and global_styles is None:
        print("[push-theme-snapshot] WARN: live payload unavailable — no backup written "
              "(cannot rollback this push).", file=sys.stderr)
        return None
    payload = {"_backup_meta": {"client": client, "target_domain": target_domain, "stamp": stamp},
               "server_theme_json": server_theme,
               "wp_global_styles": global_styles}
    path = _backup_dir(client) / f"{target_domain}-{stamp}.backup.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[push-theme-snapshot] backed up live payload → {path.relative_to(repo_root())}")
    return path


def strip_advisory(snapshot: dict) -> tuple[dict, int]:
    """Return (copy-with-advisory-removed, count). FR-33-5: a DERIVED (Pass B) token is provisional/
    advisory and MUST NOT be pushed to the live theme without explicit human confirmation. Derived
    tokens are marked ``advisory: true`` on the palette entry; here they are dropped from the deployed
    payload unless the operator passes ``--include-advisory``.
    """
    import copy as _copy
    out = _copy.deepcopy(snapshot)
    removed = 0
    pal = ((out.get("settings") or {}).get("color") or {}).get("palette")
    if isinstance(pal, list):
        kept = [e for e in pal if not (isinstance(e, dict) and e.get("advisory"))]
        removed = len(pal) - len(kept)
        out["settings"]["color"]["palette"] = kept
    return out, removed


def drift_warning(local: dict, global_styles: dict | None) -> int:
    """WARN if the live wp_global_styles layer was hand-edited in the Site Editor since the last
    deploy, so an operator's tweak is never silently clobbered by this push (FR-33-11).

    A KEY-SET diff alone misses the most common real hand-edit: changing the VALUE of a key
    that exists on BOTH sides (e.g. an operator nudging `styles.color.background` from cream to
    pink). That produces an empty `live - ours` key-set diff and would sail through with no
    warning at all. So this reports TWO distinct classes:
      - ORPHANED — keys in the live layer absent from our snapshot (the original check; a
        push would leave these operator-only keys with nothing to merge against).
      - CLOBBERED — keys present on BOTH sides where the live value differs from the value we
        are about to push. THIS is the case a pure key-set diff missed.

    Not fatal — surfaced for a go/no-go decision, per FR-33-11. Returns the CLOBBERED count so a
    caller can act on it in future (this task only warns; it does not change the push flow).
    """
    if not global_styles:
        print(
            "[push-theme-snapshot] ⚠ DRIFT WARNING: could not fetch the live wp_global_styles "
            "layer, so drift could NOT be assessed. Proceeding blind — any Site Editor hand-edit "
            "made since the last deploy may be silently overwritten by this push.",
            file=sys.stderr,
        )
        return 0

    live_scope = {"styles": global_styles.get("styles") or {}, "settings": global_styles.get("settings") or {}}
    ours_scope = {"styles": local.get("styles") or {}, "settings": local.get("settings") or {}}

    live_keys = collect_keys(live_scope)
    ours_keys = collect_keys(ours_scope)
    orphaned = sorted(live_keys - ours_keys)
    if orphaned:
        print(f"[push-theme-snapshot] ⚠ DRIFT WARNING (ORPHANED): {len(orphaned)} operator override "
              f"key(s) in the live layer are NOT in this snapshot — pushing will leave them orphaned. "
              f"First: {orphaned[:5]}", file=sys.stderr)

    live_leaves = collect_leaves(live_scope)
    ours_leaves = collect_leaves(ours_scope)
    clobbered = sorted(k for k in (set(live_leaves) & set(ours_leaves)) if live_leaves[k] != ours_leaves[k])
    if clobbered:
        print(
            f"[push-theme-snapshot] ⚠ DRIFT WARNING (CLOBBERED): {len(clobbered)} key(s) were changed "
            "live (in the Site Editor) since the last deploy — this push will OVERWRITE them:",
            file=sys.stderr,
        )
        for k in clobbered[:10]:
            print(
                f"    ~ {k}: live={_truncate_for_log(live_leaves[k])} "
                f"-> incoming={_truncate_for_log(ours_leaves[k])}",
                file=sys.stderr,
            )
        if len(clobbered) > 10:
            print(f"    ... and {len(clobbered) - 10} more", file=sys.stderr)

    return len(clobbered)


def do_rollback(args) -> int:
    """Restore a backup file to the live target (disk theme.json + wp_global_styles)."""
    path = Path(args.rollback)
    if not path.is_absolute():
        path = _backup_dir(args.client) / path.name if not path.exists() else path
    if not path.is_file():
        print(f"[push-theme-snapshot] rollback file not found: {path}", file=sys.stderr)
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    theme = data.get("server_theme_json")
    gstyles = data.get("wp_global_styles")
    if theme is None:
        print("[push-theme-snapshot] backup has no server_theme_json — cannot restore disk layer.",
              file=sys.stderr)
        return 1
    server_path = f"domains/{args.target_domain}/public_html/wp-content/themes/sgs-theme/theme.json"
    wp_root = f"domains/{args.target_domain}/public_html"
    tmp = _backup_dir(args.client) / "_rollback-restore.json"
    tmp.write_text(json.dumps(theme, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[push-theme-snapshot] ROLLBACK: restoring {path.name} → {args.target_domain}")
    if not push_snapshot(args.target, args.port, server_path, tmp):
        return 1
    creds = resolve_app_credentials(args.target_domain, args.app_user, args.app_password)
    if creds and gstyles:
        post_id = discover_global_styles_post_id(args.target, args.port, wp_root)
        if post_id is not None:
            post_global_styles(args.target_domain, post_id, gstyles, _basic_auth_header(*creds))
    flush_cache(args.target, args.port, wp_root)
    print("[push-theme-snapshot] rollback complete.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--client", required=True, help="Client slug (matches sites/<slug>/)")
    parser.add_argument("--target", required=True, help="SSH host (e.g. u945238940@141.136.39.73)")
    parser.add_argument("--target-domain", default=DEFAULT_TARGET_DOMAIN, help="Target site domain")
    parser.add_argument("--port", type=int, default=DEFAULT_SSH_PORT, help="SSH port (Hostinger uses 65002)")
    parser.add_argument("--yes", action="store_true", help="Skip interactive confirmation")
    parser.add_argument("--no-push", "--dry-run", dest="no_push", action="store_true", help="Print diff and exit (no upload)")
    # FR-26-D2: REST credentials for writing the live wp_global_styles post.
    # Only required for an actual push; dry-run works without them.
    parser.add_argument(
        "--app-user",
        default=None,
        help="WP application-password username (fallback if no domain-matched secrets file)",
    )
    parser.add_argument(
        "--app-password",
        default=None,
        help="WP application password (spaces stripped automatically)",
    )
    parser.add_argument("--no-backup", action="store_true",
                        help="Skip the pre-overwrite live-payload backup (FR-33-11 — not advised)")
    parser.add_argument("--force-no-backup", action="store_true",
                        help="Proceed even though no reliable rollback backup could be made (e.g. the "
                             "live payload could not be fetched, or the live wp_global_styles layer is "
                             "unavailable). This disables the FR-33-11 rollback safety net — only pass "
                             "it if you are certain there is nothing to protect (a genuinely fresh "
                             "target) or you accept the risk of an unrecoverable push.")
    parser.add_argument("--include-advisory", action="store_true",
                        help="Deploy DERIVED (advisory) Pass-B tokens too (FR-33-5). By default any "
                             "palette entry marked advisory:true is stripped from the pushed payload "
                             "(disk theme.json + wp_global_styles) — derived tokens are provisional and "
                             "need explicit human confirmation. Pass this flag to include them.")
    parser.add_argument("--rollback", default=None, metavar="BACKUP_FILE",
                        help="Restore a backup (filename under sites/<client>/theme-snapshot-backups/ "
                             "or an absolute path) to the live target and exit")
    args = parser.parse_args()

    if args.rollback:
        return do_rollback(args)

    local = load_local_snapshot(args.client)
    local_path = repo_root() / "sites" / args.client / "theme-snapshot.json"
    server_path = f"domains/{args.target_domain}/public_html/wp-content/themes/sgs-theme/theme.json"
    wp_root = f"domains/{args.target_domain}/public_html"

    safe_target = any(safe in args.target_domain for safe in SAFE_TARGETS)
    if safe_target and not args.yes:
        if not args.no_push:
            print(f"[push-theme-snapshot] {args.target_domain} is a safe target — forcing --no-push (override with --yes)")
        args.no_push = True

    server = fetch_server_theme_json(args.target, args.port, server_path)
    # Discover the user-layer post ID up front and read THAT layer — the same post the
    # write targets — so diff / drift / rollback-backup all reflect exactly what the push
    # will overwrite. Credentials are resolved before the read because the route needs
    # `edit_theme_options` (anonymous 403s); a missing credential here is not fatal (the
    # authoritative check is below), it just leaves `global_styles` None, which the
    # backup-or-abort gate then handles.
    gs_post_id = discover_global_styles_post_id(args.target, args.port, wp_root)
    _read_creds = resolve_app_credentials(args.target_domain, args.app_user, args.app_password)
    global_styles = None
    if gs_post_id is not None:
        global_styles = fetch_global_styles(
            args.target_domain, gs_post_id,
            _basic_auth_header(*_read_creds) if _read_creds else None,
        )

    print(diff_summary(local, server, global_styles))
    print()
    drift_warning(local, global_styles)

    if args.no_push:
        print("[push-theme-snapshot] --no-push set — exiting without upload")
        return 0

    # Resolve REST credentials before confirming — fail fast if unavailable.
    creds = resolve_app_credentials(args.target_domain, args.app_user, args.app_password)
    if creds is None:
        print(
            "[push-theme-snapshot] ERROR: no REST credentials available for "
            f"{args.target_domain}. Supply --app-user/--app-password or set "
            "SGS_WP_APP_USER/SGS_WP_APP_PWD, or add a domain-matched secrets file. "
            "Aborting — no changes made.",
            file=sys.stderr,
        )
        return 1
    auth_header = _basic_auth_header(*creds)

    if not args.yes:
        answer = input(f"Push {args.client} snapshot to {args.target_domain}? [y/N] ").strip().lower()
        if answer != "y":
            print("[push-theme-snapshot] aborted by operator")
            return 0

    # FR-33-5: strip DERIVED (advisory) tokens from BOTH deployed layers unless --include-advisory.
    deploy = local
    push_path = local_path
    if not args.include_advisory:
        stripped, n_adv = strip_advisory(local)
        if n_adv:
            deploy = stripped
            push_path = repo_root() / "sites" / args.client / "theme-snapshot.deploy.tmp.json"
            push_path.write_text(json.dumps(deploy, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"[push-theme-snapshot] FR-33-5: stripped {n_adv} advisory (derived) palette token(s) "
                  f"from the push — pass --include-advisory to deploy them.")

    # FR-33-11: back up the CURRENT live payload BEFORE overwriting (rollback source of truth).
    # The backup is load-bearing: if it could not be made (fetch failure, or the live
    # wp_global_styles layer is unavailable so a rollback couldn't restore it), ABORT rather
    # than push unattended with no way back. --no-backup (an existing deliberate operator
    # opt-out) still skips this section entirely, unchanged.
    if not args.no_backup:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = persist_backup(args.client, args.target_domain, server, global_styles, stamp)
        # `persist_backup` returns None for TWO different reasons — do NOT conflate them:
        #   (a) FRESH TARGET: server_theme is None AND global_styles is None -> there is
        #       nothing live to clobber, so there is nothing to protect. Proceeding is SAFE
        #       and is the normal first-deploy path for a NEW CLIENT. Aborting here would
        #       break onboarding, because the pipeline (orchestrator/upload_and_patch.py)
        #       does not pass --force-no-backup.
        #   (b) BACKUP FAILED: something WAS live but we could not capture it -> a rollback
        #       is impossible, so abort.
        is_fresh_target = server is None and global_styles is None
        if is_fresh_target:
            print(
                "[push-theme-snapshot] Fresh target — nothing live to back up (no existing "
                "theme.json and no existing wp_global_styles). Proceeding; there is nothing "
                "to overwrite.",
                file=sys.stderr,
            )
        elif backup_path is None or global_styles is None:
            if args.force_no_backup:
                print(
                    "[push-theme-snapshot] WARNING: proceeding with --force-no-backup — there is no "
                    "rollback safety net for this push. If anything goes wrong there is no automatic "
                    "way back.",
                    file=sys.stderr,
                )
            else:
                print(
                    "[push-theme-snapshot] ABORTED: a reliable backup of the live site could not be "
                    "made (the live payload could not be fetched, or the live wp_global_styles layer "
                    "is unavailable), so this push could not be safely rolled back if something goes "
                    "wrong. Nothing has been changed. If you are certain this is a fresh target with "
                    "nothing to protect, re-run with --force-no-backup.",
                    file=sys.stderr,
                )
                return 1

    try:
        # Step 1: SCP theme.json to disk + cache flush (existing behaviour).
        if not push_snapshot(args.target, args.port, server_path, push_path):
            return 1

        # Step 2 (FR-26-D2): write snapshot styles+settings to the live
        # wp_global_styles database post so the user layer matches the disk snapshot.
        # Reuse the id discovered up front (same layer read for diff/backup); only
        # re-discover if the early lookup failed but SSH is working now.
        post_id = gs_post_id if gs_post_id is not None else discover_global_styles_post_id(
            args.target, args.port, wp_root)
        if post_id is None:
            print(
                "[push-theme-snapshot] ERROR: could not determine wp_global_styles post ID — "
                "disk push completed but live user-layer was NOT updated.",
                file=sys.stderr,
            )
            return 1

        if not post_global_styles(args.target_domain, post_id, deploy, auth_header):
            # post_global_styles already printed a loud error.
            return 1
    finally:
        if push_path != local_path:
            push_path.unlink(missing_ok=True)

    # Flush AFTER the REST write so the rendered global-styles inline CSS picks
    # up the new user-layer data immediately (the POST self-invalidates the
    # theme.json cache, but a trailing flush also clears object/page caches).
    flush_cache(args.target, args.port, wp_root)

    print(f"[push-theme-snapshot] success — verify at https://{args.target_domain}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
