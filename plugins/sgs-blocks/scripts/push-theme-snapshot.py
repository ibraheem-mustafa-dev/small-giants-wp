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

2026-08-07: that user-layer write EXCLUDES the preset arrays the disk push already
delivers (`spacing.spacingSizes`, `shadow.presets` — see `strip_user_layer_presets`).
WP files a posted preset under the `custom` origin and keeps it ALONGSIDE the theme
origin, so posting an identical ladder into both layers produced a genuine duplicate
in the editor's spacing/shadow pickers. The two layers are NOT interchangeable:
  - theme layer  = the snapshot itself, SCP'd over wp-content/themes/sgs-theme/
                   theme.json WHOLESALE. A preset missing from a snapshot is DELETED
                   for that client — it does NOT fall back to the framework file.
                   This is why every snapshot carries its own `defaultSpacingSizes`/
                   `defaultFontSizes: false`; the framework theme.json's copies never
                   reach a client site. A later THEME deploy (build-deploy.py) re-ships
                   these same bytes (`deploy_theme_json_bytes`) on any target whose
                   TARGETS entry names this client, so a deploy no longer reverts the
                   site to the framework theme.json (2026-09-23).
  - user layer   = operator overrides only.
Stripping the ladder from the theme layer instead of the user layer is the failure
this note exists to prevent: it removed `--wp--preset--spacing--*` outright and the
canary silently fell back to WordPress's default ladder (40: 1.5rem → 1rem).

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

sys.path.insert(0, str(Path(__file__).resolve().parent))

# The generic host-matched secrets lookup lives with the Site Info push; one copy, not two.
from business_info.credentials import credentials_from_secrets  # noqa: E402

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
        value = value.strip()
        # Strip a MATCHED surrounding quote pair. Bash's `source` strips these as part of
        # its own parsing, so a hand-rolled reader that does not diverges SILENTLY - here it
        # built Basic auth from a quoted user/password and 401'd every authenticated REST
        # call, which reads as a credentials fault rather than a parsing one (2026-08-18).
        # Matched-pair ONLY: a blind .strip() of quote chars corrupts a value that
        # legitimately ends in one.
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        result[key.strip()] = value
    return result


def resolve_app_credentials(
    target_domain: str,
    cli_user: str | None,
    cli_password: str | None,
) -> tuple[str, str] | None:
    """
    Return (username, app_password) for REST Basic auth, or None if unavailable.

    Lookup order:
      1. Any .claude/secrets/*.env whose WP_URL_<KEY> host equals the target domain
         (the generic, host-matched lookup shared with sync-business-info)
      2. The two known domains' named secrets files (fallback when no WP_URL_* matches)
      3. CLI flags --app-user / --app-password
      4. Environment variables SGS_WP_APP_USER / SGS_WP_APP_PWD
    """
    found = credentials_from_secrets(target_domain)
    if found:
        return found

    secrets_dir = repo_root() / ".claude" / "secrets"

    # Hard-coded fallbacks for the two known domains, used only when no WP_URL_* file matched.
    domain_env_map: dict[str, tuple[Path, str, str]] = {
        "sandybrown": (
            secrets_dir / "sandybrown.env",
            "WP_USER_SANDYBROWN",
            "WP_APP_PWD_SANDYBROWN",
        ),
        # palestine-lives.org is Indus Foods Ltd's staging site (see the header of
        # palestine-lives.env). Without this entry the wp_global_styles read 401s and
        # the drift check silently degrades to "proceeding blind" — which is exactly
        # the state a push must never be run in, since that layer overrides theme.json
        # and is the only thing a rollback could restore from.
        "palestine-lives": (
            secrets_dir / "palestine-lives.env",
            "WP_USER_PALESTINE-LIVES",
            "WP_APP_PWD_PALESTINE-LIVES",
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


def fetch_server_theme_json(target: str, port: int, server_path: str) -> tuple[dict | None, str]:
    """SSH-cat the server's current theme.json. Returns (theme, status).

    status is ``found`` (theme set), ``absent`` (the connection worked and `cat` reported the file
    does not exist: a genuinely fresh site) or ``error`` (timeout, SSH failure, any other `cat`
    failure, or invalid JSON). The two None cases must never be conflated: an unreadable live
    layer is not an empty one, and the backup gate treats them differently.

    ssh exits 255 for its own connection failures and otherwise returns the remote command's
    status, so a `cat` that ran and found no file is exit 1 with "No such file or directory".
    """
    cmd = ["ssh", "-p", str(port), target, f"cat {server_path}"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        print(f"[push-theme-snapshot] SSH timeout fetching {server_path}", file=sys.stderr)
        return None, "error"
    if result.returncode != 0:
        if result.returncode == 1 and "no such file or directory" in result.stderr.lower():
            print(f"[push-theme-snapshot] no theme.json on the server yet: {server_path}", file=sys.stderr)
            return None, "absent"
        print(
            f"[push-theme-snapshot] SSH cat failed ({result.returncode}): "
            f"{result.stderr.strip()}",
            file=sys.stderr,
        )
        return None, "error"
    try:
        return json.loads(result.stdout), "found"
    except json.JSONDecodeError as exc:
        print(f"[push-theme-snapshot] server theme.json not valid JSON: {exc}", file=sys.stderr)
        return None, "error"


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
    """Return the `wp_global_styles` user-layer post ID, or None (absent OR failed). Callers that
    must tell those two apart use `discover_global_styles_state`."""
    return discover_global_styles_state(target, port, wp_root)[0]


def discover_global_styles_state(target: str, port: int, wp_root: str) -> tuple[int | None, str]:
    """
    Return (post_id, status) for the `wp_global_styles` user-layer post via `wp post list` over SSH.

    status is ``found`` (post_id set), ``absent`` (the lookup SUCCEEDED and no wp_global_styles
    post exists — a brand-new site where nobody has opened the Site Editor yet), or ``error``
    (SSH/parse failure, or several posts and none the active theme's — post_id None).

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
        return None, "error"  # SSH/parse failure already reported.
    match = next((r for r in rows if r.get("post_name") == expected_name), None)
    if match is not None:
        post_id = int(match["ID"])
        print(f"[push-theme-snapshot] discovered wp_global_styles post ID: {post_id} ({expected_name})")
        return post_id, "found"

    # Fallback: no name match — take the single unfiltered post if exactly one exists.
    all_rows = _wp_post_list(target, port, wp_root, "")
    if all_rows is None:
        return None, "error"
    if not all_rows:
        print("[push-theme-snapshot] no wp_global_styles post found on server", file=sys.stderr)
        return None, "absent"
    if len(all_rows) > 1:
        print(
            f"[push-theme-snapshot] ERROR: {len(all_rows)} wp_global_styles posts found and none "
            f"named {expected_name} — refusing to guess which is the active theme's. Aborting.",
            file=sys.stderr,
        )
        return None, "error"
    post_id = int(all_rows[0]["ID"])
    print(
        f"[push-theme-snapshot] WARNING: no post named {expected_name}; "
        f"falling back to the only wp_global_styles post (ID {post_id})"
    )
    return post_id, "found"


# Preset arrays the DISK push already delivers at the `theme` origin, so writing them
# again into the user layer only ever produces a duplicate (2026-08-07).
#
# WordPress files anything posted here under the `custom` origin and keeps it ALONGSIDE
# the theme origin rather than replacing it -- so an identical ladder in both layers is
# a real second ladder, not a no-op. Proven on the sandybrown canary: the live
# wp_global_styles held `spacing.spacingSizes.custom` byte-identical to the deployed
# theme.json's 8 sizes, and `shadow.presets` likewise duplicated the framework's 4.
#
# Deliberately NOT stripped -- these are genuinely per-client and the user layer is the
# only place a Site-Editor edit to them can live:
#   color.palette / color.gradients   -- per-client brand colours (Spec 33 Pass A/B)
#   typography.fontSizes              -- per-client scales really do differ (eye-care and
#                                        the sgs-* templates use a 6-slug clamp() scale
#                                        with an `xxx-large` the framework has no slug for)
#   typography.fontFamilies           -- Font Library installs land here
# `color.duotone` is absent from the framework theme.json AND every snapshot, so it is
# omitted rather than listed inert -- add it here only once something actually emits one.
_USER_LAYER_PRESET_STRIP = (
    ("spacing", "spacingSizes"),
    ("shadow", "presets"),
    # typography.fontSizes joins them 2026-09-08 (D1007), same mechanism, measured live:
    # posting the ladder here files it under the `custom` origin ALONGSIDE the theme origin,
    # and the merged result re-admitted WordPress's core-default `medium` (20px, fluid) even
    # though `defaultFontSizes: false` is set in every layer. It rendered 14.0015px at 375px
    # on the canary — a phantom entry in the client's picker, fluid, for a slug D1007 retired.
    # Every other core slug was masked because our ladder happens to define one of the same
    # name; `medium` was the only one left uncovered, which is what made it visible.
    ("typography", "fontSizes"),
)


def strip_user_layer_presets(settings: dict) -> tuple[dict, list[str]]:
    """Return (settings-copy-without-duplicated-presets, list-of-stripped-paths).

    Applied ONLY to the wp_global_styles POST body -- never to the snapshot written to
    disk. The snapshot IS the client's deployed `theme.json` (push_snapshot SCPs it over
    the framework file wholesale), so the ladders MUST stay there; that is the layer they
    belong to.

    Safe because the REST controller REPLACES rather than merges: WP core's
    class-wp-rest-global-styles-controller.php does `$config['settings'] =
    $request['settings'];`, so omitting a key here also CLEARS any stale copy an earlier
    push left in the user layer. No explicit null is needed.
    """
    import copy as _copy

    out = _copy.deepcopy(settings)
    stripped: list[str] = []
    for group, key in _USER_LAYER_PRESET_STRIP:
        node = out.get(group)
        if isinstance(node, dict) and key in node:
            del node[key]
            stripped.append(f"settings.{group}.{key}")
            if not node:
                del out[group]
    return out, stripped


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
    settings, stripped = strip_user_layer_presets(snapshot.get("settings") or {})
    if stripped:
        print(
            "[push-theme-snapshot] user-layer preset strip: "
            + ", ".join(stripped)
            + " (already delivered by the disk theme.json at the `theme` origin — "
            "posting them here would duplicate the ladder)"
        )
    body: dict = {
        "styles": snapshot.get("styles") or {},
        "settings": settings,
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


def _palette_of(snapshot: dict) -> list | None:
    pal = ((snapshot.get("settings") or {}).get("color") or {}).get("palette")
    return pal if isinstance(pal, list) else None


def base_palette_colours() -> dict[str, str]:
    """{slug: hex} of the framework base palette (theme/sgs-theme/theme.json)."""
    path = repo_root() / "theme" / "sgs-theme" / "theme.json"
    with path.open("r", encoding="utf-8") as fh:
        palette = ((json.load(fh).get("settings") or {}).get("color") or {}).get("palette") or []
    return {e["slug"]: e["color"] for e in palette
            if isinstance(e, dict) and e.get("slug") and e.get("color")}


def apply_advisory_policy(snapshot: dict) -> tuple[dict, int, int]:
    """Return (deep-copy-with-advisory-resolved, restored, removed). FR-33-5: a DERIVED (Pass B)
    token is provisional/advisory and MUST NOT be pushed to the live theme without explicit human
    confirmation. Derived tokens are marked ``advisory: true`` on the palette entry.

    The push REPLACES the theme palette, so deleting an advisory entry that overlaid a base slug
    would leave that slug missing from the live site (an all-advisory palette pushed an EMPTY one).
    The extractor therefore records the base theme's hex as ``_baseline_color`` on an overlaid
    entry; here such an entry is RESTORED in place to ``{slug, color: <baseline>, name}`` (list
    position kept). An advisory entry with no ``_baseline_color`` comes from an older extractor that
    did not record one, so its slug is looked up in the framework base palette: a base slug is
    RESTORED to the base colour (deleting it would remove a base slug from the live site), and only
    a slug the base palette does not have is removed. Non-advisory entries and every other key are
    untouched.
    """
    import copy as _copy
    out = _copy.deepcopy(snapshot)
    restored = removed = 0
    pal = _palette_of(out)
    if pal is not None:
        base = base_palette_colours() if any(
            isinstance(e, dict) and e.get("advisory") and not e.get("_baseline_color") for e in pal
        ) else {}
        kept: list = []
        for entry in pal:
            if not (isinstance(entry, dict) and entry.get("advisory")):
                kept.append(entry)
                continue
            colour = entry.get("_baseline_color") or base.get(entry.get("slug"))
            if colour:
                kept.append({"slug": entry.get("slug"), "color": colour, "name": entry.get("name")})
                restored += 1
            else:
                removed += 1
        out["settings"]["color"]["palette"] = kept
    return out, restored, removed


def strip_advisory(snapshot: dict) -> tuple[dict, int]:
    """Return (copy-with-advisory-resolved, total advisory entries handled). Thin wrapper over
    ``apply_advisory_policy`` for callers that only need the combined count (restored + removed)."""
    out, restored, removed = apply_advisory_policy(snapshot)
    return out, restored + removed


def drop_internal_palette_keys(snapshot: dict) -> tuple[dict, int]:
    """Return (deep-copy-without-``_baseline_color``, entries changed). ``_baseline_color`` is an
    extractor-internal bookkeeping key, not a theme.json field, so it never goes to the server —
    including on the ``--include-advisory`` path where advisory entries otherwise pass through."""
    import copy as _copy
    out = _copy.deepcopy(snapshot)
    changed = 0
    for entry in _palette_of(out) or []:
        if isinstance(entry, dict) and "_baseline_color" in entry:
            del entry["_baseline_color"]
            changed += 1
    return out, changed


def prepare_deploy_snapshot(local: dict, include_advisory: bool) -> tuple[dict, str | None]:
    """Return (payload-to-push, one-line note or None). Pure: no I/O. Without
    ``--include-advisory`` advisory entries are restored/removed (see ``apply_advisory_policy``);
    with it they pass through, minus the internal ``_baseline_color`` key."""
    if include_advisory:
        deploy, n = drop_internal_palette_keys(local)
        note = (f"dropped the internal _baseline_color key from {n} palette entr"
                f"{'y' if n == 1 else 'ies'} (not a theme.json field)") if n else None
        return deploy, note
    deploy, restored, removed = apply_advisory_policy(local)
    if not (restored or removed):
        return deploy, None
    return deploy, (f"FR-33-5: {restored} advisory (derived) palette token(s) restored to the base "
                    f"theme value, {removed} removed (no base value) — pass --include-advisory to "
                    f"deploy them as derived.")


def deploy_theme_json_bytes(snapshot_path: Path, include_advisory: bool = False) -> tuple[bytes, str | None]:
    """The EXACT bytes that land at ``wp-content/themes/sgs-theme/theme.json`` for this client.

    ONE function, two callers: this script's disk push, and ``build-deploy.py``, whose theme
    upload ships these bytes as the theme's ``theme.json`` on any target that names a client
    (2026-09-23). Before that, a theme deploy uploaded the FRAMEWORK ``theme.json`` and silently
    replaced whatever this script had written: the disk layer is a file inside the theme
    directory, and a theme deploy swaps the whole directory. Keeping the bytes in one function
    means the two paths cannot drift into shipping different files for the same client.

    Unchanged snapshot -> the file's raw bytes (byte-identical to the committed file). Changed by
    the advisory policy -> LF-terminated UTF-8 JSON (bytes, so Windows never turns it into CRLF).
    Raises ``OSError`` / ``ValueError`` on a missing or unparseable snapshot: callers fail closed.
    """
    raw = snapshot_path.read_bytes()
    local = json.loads(raw.decode("utf-8"))
    if not isinstance(local, dict):
        raise ValueError(f"{snapshot_path} is not a theme.json object")
    deploy, note = prepare_deploy_snapshot(local, include_advisory)
    if deploy == local:
        return raw, note
    return serialise_theme_json(deploy), note


def serialise_theme_json(theme: dict) -> bytes:
    """LF-terminated UTF-8 JSON as BYTES (a text-mode write on Windows would emit CRLF)."""
    return (json.dumps(theme, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def backup_gate(server: dict | None, server_status: str, global_styles: dict | None,
                gs_status: str, force_no_backup: bool) -> str:
    """Decide the FR-33-11 backup-or-abort outcome. Pure.

    ``server_status`` is the theme.json read result: ``found``, ``absent`` (the file is genuinely not
    there) or ``error`` (the read failed). ``gs_status`` is the wp_global_styles discovery result:
    ``found`` (a post exists), ``absent`` (the lookup succeeded and NO post exists yet) or ``error``
    (the lookup itself failed). A failed read is never treated as an empty layer. Returns one of:
      ``fresh``          both layers are genuinely absent - nothing to protect, proceed
      ``no-user-layer``  the theme.json was fetched and no user-layer post exists - that layer has
                         nothing to back up, the disk theme.json is backed up, proceed
      ``ok``             the user layer was fetched (a missing disk theme.json alone never blocked)
      ``forced``         a live layer could not be read, and --force-no-backup was given
      ``abort``          a live layer exists or its read failed, and it could not be read
    """
    unreadable = "forced" if force_no_backup else "abort"
    if server_status == "error":
        return unreadable
    if server is None and global_styles is None:
        return "fresh" if gs_status == "absent" else unreadable
    if global_styles is None and gs_status == "absent":
        return "no-user-layer"
    if global_styles is None:
        return unreadable
    return "ok"


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

    server, server_status = fetch_server_theme_json(args.target, args.port, server_path)
    # Discover the user-layer post ID up front and read THAT layer — the same post the
    # write targets — so diff / drift / rollback-backup all reflect exactly what the push
    # will overwrite. Credentials are resolved before the read because the route needs
    # `edit_theme_options` (anonymous 403s); a missing credential here is not fatal (the
    # authoritative check is below), it just leaves `global_styles` None, which the
    # backup-or-abort gate then handles.
    gs_post_id, gs_status = discover_global_styles_state(args.target, args.port, wp_root)
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
    # Same rule as deploy_theme_json_bytes() (which build-deploy.py uses for a theme deploy's
    # theme.json): unchanged -> the file itself; changed -> serialise_theme_json(). So a later
    # theme deploy re-ships exactly the bytes this push wrote.
    deploy, deploy_note = prepare_deploy_snapshot(local, args.include_advisory)
    push_path = local_path
    if deploy != local:
        push_path = repo_root() / "sites" / args.client / "theme-snapshot.deploy.tmp.json"
        push_path.write_bytes(serialise_theme_json(deploy))
    if deploy_note:
        print(f"[push-theme-snapshot] {deploy_note}")

    # FR-33-11: back up the CURRENT live payload BEFORE overwriting (rollback source of truth).
    # The backup is load-bearing: if it could not be made (fetch failure, or the live
    # wp_global_styles layer is unavailable so a rollback couldn't restore it), ABORT rather
    # than push unattended with no way back. --no-backup (an existing deliberate operator
    # opt-out) still skips this section entirely, unchanged.
    if not args.no_backup:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        persist_backup(args.client, args.target_domain, server, global_styles, stamp)
        # The decision is a pure function (`backup_gate`, unit-tested). Situations:
        #   fresh          neither layer is available -> nothing live to clobber. The normal
        #                  first-deploy path for a NEW CLIENT (orchestrator/upload_and_patch.py
        #                  does not pass --force-no-backup), so it must not abort.
        #   no-user-layer  theme.json fetched and the post lookup SUCCEEDED but no wp_global_styles
        #                  post exists (new site, Site Editor never opened): that layer holds
        #                  nothing to back up; the disk theme.json was backed up above.
        #   abort          a live layer exists, or a read of either layer FAILED (SSH error, REST
        #                  error), so nothing is known about it -> a rollback is impossible. A
        #                  failed read is never mistaken for a fresh site.
        gate = backup_gate(server, server_status, global_styles, gs_status, args.force_no_backup)
        if gate == "fresh":
            print(
                "[push-theme-snapshot] Fresh target — nothing live to back up (no existing "
                "theme.json and no existing wp_global_styles). Proceeding; there is nothing "
                "to overwrite.",
                file=sys.stderr,
            )
        elif gate == "no-user-layer":
            print(
                "[push-theme-snapshot] No wp_global_styles post exists yet (new site) — nothing in "
                "that layer to back up; the server theme.json is backed up. Proceeding.",
                file=sys.stderr,
            )
        elif gate == "forced":
            print(
                "[push-theme-snapshot] WARNING: proceeding with --force-no-backup — there is no "
                "rollback safety net for this push. If anything goes wrong there is no automatic "
                "way back.",
                file=sys.stderr,
            )
        elif gate == "abort":
            print(
                "[push-theme-snapshot] ABORTED: a reliable backup of the live site could not be "
                "made (a live layer could not be read: the theme.json fetch or the wp_global_styles "
                "read failed), so this push could not be safely rolled back if something goes "
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
        post_id, post_status = gs_post_id, gs_status
        if post_id is None and post_status != "absent":
            post_id, post_status = discover_global_styles_state(args.target, args.port, wp_root)
        if post_id is None and post_status == "absent":
            # A lookup that SUCCEEDED and found no post is not a failure: on a new site there is no
            # user layer to update (nothing overrides the disk theme.json), so the disk push above
            # is the whole deployment. Treating it as an error made a successful push exit 1.
            print(
                "[push-theme-snapshot] No wp_global_styles post exists yet — skipping the "
                "user-layer write; the disk theme.json is the whole deployment."
            )
        elif post_id is None:
            print(
                "[push-theme-snapshot] ERROR: could not determine wp_global_styles post ID — "
                "disk push completed but live user-layer was NOT updated.",
                file=sys.stderr,
            )
            return 1
        elif not post_global_styles(args.target_domain, post_id, deploy, auth_header):
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
