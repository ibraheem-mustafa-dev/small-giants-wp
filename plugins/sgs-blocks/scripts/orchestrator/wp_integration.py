#!/usr/bin/env python3
"""wp_integration.py -- Spec 15 Phase 5d.7 + 5d.9 + 5d.10.

Three WP-side wiring entry points used by /sgs-clone Stage 7 + Stage 8:

  5d.7  validate_block_markup(markup)
        Calls the existing `/wp-blocks validate` CLI. Returns parsed
        result; raises on non-zero exit. The orchestrator FAILS the
        stage when status != "valid".

  5d.9  route_native_feature(feature, value)
        When extraction surfaces lightbox / duotone / appearanceTools,
        route through native WP channels rather than emitting custom
        CSS. Returns the canonical block-attribute or theme-setting
        rather than a raw `style` blob.

  5d.10 build_deploy_command(post_id, content_path, dry_run)
        Build (NEVER execute) the wp-eval-file + scp deploy sequence
        per CLAUDE.md "Deploy Commands". Dry-run is the default.
        Live deployment is operator-gated; this module never opens
        an SSH session.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

# Domain must be a plain DNS name so emitted deploy commands stay shell-safe
# even when the operator copy-pastes them. Sonnet QC concern landed inline.
_DOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{0,253}$")

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
WP_BLOCKS_CLI = Path.home() / ".claude" / "hooks" / "wp-blocks.py"


# ---- 5d.7 /wp-blocks CLI integration -----------------------------------------


class WpBlocksValidateError(RuntimeError):
    pass


def validate_block_markup(markup: str) -> dict:
    """Call `/wp-blocks validate <markup>`. Returns parsed JSON result.

    Raises WpBlocksValidateError when the CLI is missing OR returns
    non-zero exit. The orchestrator wraps this in stage 7 + checks
    `status == 'valid'` to decide whether to advance.
    """
    if not WP_BLOCKS_CLI.exists():
        raise WpBlocksValidateError(f"wp-blocks CLI missing at {WP_BLOCKS_CLI}")
    try:
        # Pass markup via stdin (arg sentinel '-') rather than as an argv string.
        # Windows caps a command line at 32,767 chars (CreateProcess), which large
        # aggregate markup exceeds -> WinError 206. stdin has no such limit.
        # Force UTF-8 on stdin/stdout/stderr. Aggregate clone markup can contain
        # non-cp1252 characters (e.g. '→' U+2192, '£', smart quotes). With text=True
        # Windows defaults to cp1252 and raises "'charmap' codec can't encode" while
        # writing `input` to the child's stdin — which the orchestrator caught and
        # silently marked stage-4j "skipped" on EVERY run, disabling the only
        # WP-block-markup validity check. encoding='utf-8' fixes the parent side;
        # PYTHONUTF8/PYTHONIOENCODING make the child CLI read its stdin as UTF-8 too.
        proc = subprocess.run(
            [sys.executable, str(WP_BLOCKS_CLI), "validate", "-"],
            input=markup, capture_output=True, text=True, timeout=30, check=False,
            encoding="utf-8", errors="replace",
            env={**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"},
        )
    except subprocess.SubprocessError as e:
        raise WpBlocksValidateError(f"wp-blocks validate failed: {e}") from e
    if proc.returncode != 0:
        raise WpBlocksValidateError(
            f"wp-blocks validate exited {proc.returncode}: {proc.stderr.strip()}"
        )
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise WpBlocksValidateError(
            f"wp-blocks validate produced non-JSON output: {proc.stdout[:200]}"
        ) from e


# ---- 5d.9 native-feature routing ---------------------------------------------

# Map detected native features to the canonical WP channel they belong on.
# When 5d emits a block attribute (or a theme.json setting), it uses this
# table to avoid round-tripping through custom CSS.
_NATIVE_FEATURE_ROUTES: dict[str, dict] = {
    "lightbox": {
        "channel": "block-attribute",
        # core/image declares `lightbox` as a per-instance attribute; the
        # block emits `{"lightbox": {"enabled": True}}` for images that
        # should open in the core lightbox.
        "attr": "lightbox",
        "transform": lambda value: {"enabled": bool(value)},
    },
    "duotone": {
        "channel": "block-attribute",
        # Duotone filter on cover / image blocks.
        "attr": "style.color.duotone",
        "transform": lambda value: value,    # pass-through; caller supplies preset slug
    },
    "appearance-tools": {
        "channel": "theme-json",
        # Theme-level toggle -- enables border / spacing / etc. across the site.
        "attr": "settings.appearanceTools",
        "transform": lambda value: bool(value),
    },
    "hover-zoom": {
        "channel": "block-attribute",
        # SGS-native hover-image-zoom toggle (Phase 2 framework feature).
        "attr": "hoverImageZoom",
        "transform": lambda value: bool(value),
    },
}


def route_native_feature(feature: str, value) -> dict:
    """Return the canonical WP channel + transformed value for one feature.

    Returns:
        {
          "feature":    <feature>,
          "channel":    "block-attribute" | "theme-json" | None,
          "attr":       <dotted attribute path>,
          "value":      <transformed value>,
          "route_known": True if feature is in the routing table,
        }
    """
    cfg = _NATIVE_FEATURE_ROUTES.get(feature)
    if cfg is None:
        return {
            "feature":    feature,
            "channel":    None,
            "attr":       None,
            "value":      value,
            "route_known": False,
        }
    return {
        "feature":    feature,
        "channel":    cfg["channel"],
        "attr":       cfg["attr"],
        "value":      cfg["transform"](value),
        "route_known": True,
    }


# ---- 5d.10 WP-CLI deploy helper ----------------------------------------------

# Per CLAUDE.md deploy convention: SSH alias `hd` resolves to the host;
# WP install lives under ~/domains/<domain>/public_html.
DEFAULT_DOMAIN = "palestine-lives.org"


def build_deploy_command(
    post_id: int,
    content_path: Path,
    domain: str = DEFAULT_DOMAIN,
    dry_run: bool = True,
) -> dict:
    """Build the deploy command sequence for a single post update.

    Returns:
        {
          "dry_run":     bool,
          "commands":    [str, ...]      # shell commands in execution order
          "remote_path": str,            # where the file lands on the server
          "post_id":     int,
          "verify_url":  str,
          "warning":     str | None     # surfaces operator gates
        }

    HARD GATE: when dry_run=False, this function still does NOT execute
    anything. The orchestrator (or operator) runs the emitted commands.
    """
    if post_id <= 0:
        raise ValueError(f"post_id must be positive, got {post_id}")
    if not isinstance(content_path, Path):
        content_path = Path(content_path)
    if not _DOMAIN_RE.match(domain):
        raise ValueError(
            f"invalid domain {domain!r} -- must match {_DOMAIN_RE.pattern}"
        )

    remote_apply_php = f"~/sgs-post-update-{post_id}.php"
    remote_path = f"~/domains/{domain}/public_html/wp-content"
    verify_url = f"https://{domain}/?p={post_id}"

    apply_cmd = f"cd ~/domains/{domain}/public_html && wp eval-file {remote_apply_php} --quiet"
    rm_cmd = f"rm {remote_apply_php}"
    opcache_php_payload = '<?php opcache_reset(); echo "ok";'
    opcache_path = f"~/domains/{domain}/public_html/op-reset-tmp.php"
    opcache_write = "echo " + shlex.quote(opcache_php_payload) + " > " + opcache_path
    opcache_rm = "rm " + opcache_path
    commands = [
        f"scp -P 65002 {shlex.quote(str(content_path))} hd:{remote_apply_php}",
        f"ssh hd {shlex.quote(apply_cmd)}",
        f"ssh hd {shlex.quote(rm_cmd)}",
        # OPcache reset on the web pool (CLI reset is a separate pool).
        f"ssh hd {shlex.quote(opcache_write)}",
        f"curl -s https://{domain}/op-reset-tmp.php",
        f"ssh hd {shlex.quote(opcache_rm)}",
    ]
    warning: str | None = None
    if not dry_run:
        warning = (
            "Live deploy: caller must confirm operator approval before "
            "executing the emitted commands."
        )
    return {
        "dry_run":     dry_run,
        "commands":    commands,
        "remote_path": remote_path,
        "post_id":     post_id,
        "verify_url":  verify_url,
        "warning":     warning,
    }


# ---- CLI surface -------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_v = sub.add_parser("validate")
    p_v.add_argument("--markup", required=True)
    p_n = sub.add_parser("native")
    p_n.add_argument("--feature", required=True)
    p_n.add_argument("--value", required=True)
    p_d = sub.add_parser("deploy")
    p_d.add_argument("--post-id", type=int, required=True)
    p_d.add_argument("--content", type=Path, required=True)
    p_d.add_argument("--domain", default=DEFAULT_DOMAIN)
    p_d.add_argument("--dry-run", action="store_true", default=True)
    p_d.add_argument("--no-dry-run", action="store_false", dest="dry_run")
    args = parser.parse_args(argv)

    if args.cmd == "validate":
        print(json.dumps(validate_block_markup(args.markup), indent=2, ensure_ascii=False))
    elif args.cmd == "native":
        try:
            value = json.loads(args.value)
        except json.JSONDecodeError:
            value = args.value
        print(json.dumps(route_native_feature(args.feature, value), indent=2,
                         ensure_ascii=False, default=str))
    elif args.cmd == "deploy":
        report = build_deploy_command(args.post_id, args.content,
                                      domain=args.domain, dry_run=args.dry_run)
        print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
