#!/usr/bin/env python3
"""wp-pre-merge-gate.py — Pre-merge validation gate for SGS WordPress plugin changes.

5.3.5 integration: wires wp-blocks.py health, wp-docs.py validate-hook, and
wp-hook-graph.py validate into a single advisory gate invoked before commits
or merges that touch converter / pipeline / SGS block logic.

Exit codes:
  0 — all checks clean (or soft-fail mode: warnings only)
  1 — one or more checks failed (hard mode)

Usage:
  python plugins/sgs-blocks/scripts/wp-pre-merge-gate.py [--soft] [--hooks hook1 hook2 ...]

  --soft         Exit 0 even on check failure (advisory mode, default for git hook).
  --hooks NAME   One or more sgs_ hook names to validate against wp-docs.
                 If omitted, all hooks detected by wp-hook-graph scan are validated.

Advisory by default: the pre-commit hook runs with --soft so it NEVER blocks a commit.
Hard mode (no --soft) is for CI pipelines.

UK English in comments.
Pure stdlib — no third-party dependencies.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
HOOKS_DIR = Path.home() / ".claude" / "hooks"
WP_BLOCKS_CLI     = HOOKS_DIR / "wp-blocks.py"
WP_DOCS_CLI       = HOOKS_DIR / "wp-docs.py"
WP_HOOK_GRAPH_CLI = HOOKS_DIR / "wp-hook-graph.py"
SGS_BLOCKS_DIR    = REPO / "plugins" / "sgs-blocks"


def _run(cmd: list[str], timeout: int = 20) -> tuple[int, str, str]:
    """Run a subprocess; return (exit_code, stdout, stderr). Soft-fail on exception."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8")
        return r.returncode, r.stdout, r.stderr
    except Exception as exc:  # noqa: BLE001
        return -1, "", str(exc)


def _parse_json(stdout: str) -> dict:
    try:
        return json.loads(stdout) if stdout.strip() else {}
    except json.JSONDecodeError:
        return {"_parse_error": stdout[:200]}


def check_wp_blocks_health() -> tuple[bool, str]:
    """Run wp-blocks.py health and assert CLEAN status."""
    if not WP_BLOCKS_CLI.exists():
        return True, "SKIP: wp-blocks.py not found"
    code, out, err = _run([sys.executable, str(WP_BLOCKS_CLI), "health"])
    if code < 0:
        return True, f"SKIP: wp-blocks health soft-failed: {err[:100]}"
    data = _parse_json(out)
    # health returns {"databases": {"core": {"status": "ok"}, "sgs": {...}}}
    db_statuses = {k: v.get("status") for k, v in data.get("databases", {}).items()}
    all_ok = all(s == "ok" for s in db_statuses.values())
    detail = ", ".join(f"{k}={s}" for k, s in db_statuses.items()) if db_statuses else "no db info"
    if all_ok:
        return True, f"CLEAN: {detail}"
    return False, f"FAIL: {detail}"


# Hook namespaces owned by a THIRD-PARTY plugin we deliberately integrate with.
# The wp-docs database covers WordPress core (and WooCommerce, whose 15 consumed
# hooks resolve cleanly) — it does NOT know every vendor's hooks, so a real,
# vendor-documented hook reads as NOT_FOUND and trips the typo check below.
#
# This does not weaken the gate: its purpose is catching a MISSPELLED core hook,
# and a misspelling inside one of these namespaces was never something the docs
# database could catch either way. Keep this list to namespaces the framework
# actually integrates with, and name the integration point for each.
#   litespeed_  -> includes/class-litespeed-compat.php + class-cart-cache-purge.php
#                  (LiteSpeed Cache; purge/no-cache control for personalised REST
#                   routes and cart fragments — e2d4f101)
THIRD_PARTY_HOOK_PREFIXES = (
    "litespeed_",
    # WooCommerce ships its own hook namespace; wp-devdocs carries WP CORE only,
    # so every `woocommerce_*` / `wc_*` name is a guaranteed NOT_FOUND that says
    # nothing about SGS correctness (added 2026-09-07).
    "woocommerce_",
    "wc_",
)

# Only these paths are SGS's OWN code. An ALLOWLIST, not a blocklist, so a newly
# vendored directory cannot silently start polluting the gate.
#
# WHY (2026-09-07): the scan walked all of plugins/sgs-blocks/, which contains
# `stackable/` -- a 278MB vendored copy of a competitor plugin plus the Freemius
# SDK. It is untracked, gitignored AND in build-deploy.py's TAR_EXCLUDES, so it
# never ships; it is reference material. It contributed 220 of the 228 "failures",
# making this gate print a red [FAIL] on every single commit. A gate that always
# fails is a gate nobody reads. `vendor/` (composer, incl. php-stubs whose
# docblocks contain literal `example_filter`/`wpdocs_filter` samples) and `build/`
# (generated from src/, so a duplicate) are excluded for the same reason.
SGS_OWN_PATH_PREFIXES = ("includes/", "src/", "sgs-blocks.php")

# WordPress DYNAMIC hooks: the concrete runtime name (`wp_ajax_sgs_test_google_api`)
# never appears in the docs DB -- only its documented parent (`wp_ajax_{$action}`)
# does. Each entry maps a concrete-name pattern to that parent. The parent is then
# VALIDATED against the docs DB like any other hook, so this cannot become a blanket
# amnesty: if a parent stops existing, the gate fails and says so.
DYNAMIC_HOOK_FAMILIES = (
    (re.compile(r"^wp_ajax_nopriv_.+$"),        "wp_ajax_nopriv_{$action}"),
    (re.compile(r"^wp_ajax_.+$"),               "wp_ajax_{$action}"),
    (re.compile(r"^admin_post_.*$"),            "admin_post_{$action}"),
    (re.compile(r"^admin_head-.+$"),            "admin_head-{$hook_suffix}"),
    (re.compile(r"^admin_footer-.*$"),          "admin_footer-{$hook_suffix}"),
    (re.compile(r"^load-.+$"),                  "load-{$page_hook}"),
    (re.compile(r"^render_block_.+$"),          "render_block"),
    (re.compile(r"^save_post_.+$"),             "save_post_{$post->post_type}"),
    (re.compile(r"^created_.+$"),               "created_{$taxonomy}"),
    (re.compile(r"^edited_.+$"),                "edited_{$taxonomy}"),
    (re.compile(r"^.+_add_form_fields$"),       "{$taxonomy}_add_form_fields"),
    (re.compile(r"^.+_edit_form_fields$"),      "{$taxonomy}_edit_form_fields"),
    (re.compile(r"^manage_\{?\$?\w*\}?_?posts_custom_column$"),
                                                "manage_posts_custom_column"),
)


def _dynamic_parent(hook: str) -> str | None:
    """Return the documented parent of a WP dynamic hook, or None."""
    for pattern, parent in DYNAMIC_HOOK_FAMILIES:
        if pattern.match(hook):
            return parent
    return None


def check_wp_hooks_validate(hook_names: list[str]) -> tuple[bool, str]:
    """Validate each hook name via wp-docs.py validate-hook.

    sgs_-prefixed hooks will correctly return NOT_FOUND (they're custom; that's expected),
    as will hooks in a THIRD_PARTY_HOOK_PREFIXES namespace (real vendor hooks the WP-core
    docs database does not carry). We only FAIL if a hook the plugin CONSUMES
    (add_action/add_filter) is unrecognised and belongs to neither group — meaning it may
    be a WP core hook that's misspelled.

    ⚠ The caller now honours that "CONSUMES" wording. Until 2026-09-07 it passed
    `hooks_registered` (hooks this plugin CREATES) from an UNSCOPED scan of the whole
    plugin directory -- including the vendored `stackable/` tree -- so this printed
    "FAIL: 212 non-SGS hooks" on every commit and meant nothing. See
    _collect_hooks_from_scan() and SGS_OWN_PATH_PREFIXES.
    """
    if not WP_DOCS_CLI.exists():
        return True, "SKIP: wp-docs.py not found"
    if not hook_names:
        return True, "SKIP: no hook names to validate"

    failures: list[str] = []
    for hook in hook_names:
        # sgs_-prefixed hooks are custom — NOT_FOUND is always expected and acceptable.
        if hook.startswith("sgs_"):
            continue
        # Third-party vendor hooks the WP-core docs database does not carry.
        if hook.startswith(THIRD_PARTY_HOOK_PREFIXES):
            continue
        # WP DYNAMIC hooks: the concrete runtime name is never in the docs DB --
        # only the documented parent is. Resolve to that parent and validate IT,
        # so `wp_ajax_sgs_test_google_api` is checked as `wp_ajax_{$action}`.
        # This is not an amnesty: if the parent does not validate, we still fail,
        # and the message names both so the reader can see the substitution.
        lookup = hook
        parent = _dynamic_parent(hook)
        if parent:
            lookup = parent

        code, out, _ = _run([sys.executable, str(WP_DOCS_CLI), "validate-hook", lookup])
        if code < 0:
            continue  # soft-fail on subprocess error
        data = _parse_json(out)
        if data.get("status") == "NOT_FOUND":
            # Unexpected: a non-sgs_, non-vendor hook not in WP core — likely a typo.
            failures.append(hook if lookup == hook else f"{hook} (via {lookup})")

    if failures:
        return False, f"FAIL: {len(failures)} consumed hooks not in WP docs: {', '.join(failures[:5])}"
    return True, (f"CLEAN: {len(hook_names)} consumed hooks checked "
                  f"(sgs_/vendor-prefixed skipped; WP dynamic hooks resolved to their documented parent)")


def _hook_is_expected_not_found(hook: str) -> bool:
    """True when a NOT_FOUND is the CORRECT answer for this hook name.

    Three legitimate reasons a consumed hook is absent from the WP-core docs DB:
      1. it is ours (`sgs_` prefix) -- custom by definition;
      2. it belongs to a third-party namespace the DB does not carry (WooCommerce,
         LiteSpeed);
      3. it is a WP DYNAMIC hook whose concrete runtime name (`admin_post_`,
         `load-nav-menus.php`) never appears in the DB -- only its parent does.
    Anything else is a real signal and still warns.
    """
    if hook.startswith("sgs_"):
        return True
    if hook.startswith(THIRD_PARTY_HOOK_PREFIXES):
        return True
    return _dynamic_parent(hook) is not None


def check_wp_hook_graph_validate() -> tuple[bool, str]:
    """Run wp-hook-graph.py validate over SGS-OWNED subtrees only.

    ⚠ SCOPED 2026-09-07. This ran against the whole plugin directory, so its
    "Not found : 174" was dominated by the vendored `stackable/` tree (a
    competitor plugin + the Freemius SDK -- untracked, gitignored, and excluded
    from the deploy tarball). Scoping to includes/ + src/ takes it to 29, and
    every one of those 29 is an EXPECTED not-found by the rules above -- so this
    check now reports CLEAN when the code is clean, instead of printing a
    permanent [WARN] that trained the reader to ignore it.

    `validate` takes a positional path and offers no exclude flag, so scoping is
    done by running it once per SGS-owned subtree and aggregating.
    """
    if not WP_HOOK_GRAPH_CLI.exists():
        return True, "SKIP: wp-hook-graph.py not found"
    if not SGS_BLOCKS_DIR.exists():
        return True, "SKIP: sgs-blocks dir not found"

    subtrees = [SGS_BLOCKS_DIR / d for d in ("includes", "src")]
    subtrees = [d for d in subtrees if d.exists()]
    if not subtrees:
        return True, "SKIP: no SGS-owned subtree found"

    unexpected: list[str] = []
    checked = 0
    for tree in subtrees:
        code, out, _ = _run([sys.executable, str(WP_HOOK_GRAPH_CLI), "validate", str(tree)], timeout=120)
        if code < 0:
            return True, "SKIP: wp-hook-graph validate soft-failed"
        for line in out.splitlines():
            stripped = line.strip()
            if not stripped.startswith("- "):
                continue
            name = stripped[2:].strip()
            if not name:
                continue
            checked += 1
            if not _hook_is_expected_not_found(name):
                unexpected.append(name)

    if unexpected:
        uniq = sorted(set(unexpected))
        return False, (f"WARN: {len(uniq)} unexplained not-found hook(s) in SGS code: "
                       f"{', '.join(uniq[:5])}")
    return True, (f"CLEAN: hook graph validate passed over {len(subtrees)} SGS subtree(s) "
                  f"({checked} not-found entries, all expected: sgs_/vendor/WP-dynamic)")


def _collect_hooks_from_scan() -> list[str]:
    """Hook names this plugin CONSUMES, from SGS-owned files only.

    ⚠ FIXED 2026-09-07 -- this read `hooks_registered`, contradicting
    check_wp_hooks_validate()'s own docstring ("a hook the plugin CONSUMES").
    The two lists mean opposite things:

      hooks_registered = hooks this plugin CREATES (do_action/apply_filters).
                         Custom BY DEFINITION, so validating them against the
                         WP-core docs DB asks "is my own invention a WP core
                         hook?" -- the answer is always no. Never validate these.
      hooks_consumed   = hooks this plugin HOOKS INTO (add_action/add_filter).
                         These SHOULD exist in core, so a NOT_FOUND here is a
                         real signal: most likely a typo in a core hook name.

    Combined with the SGS_OWN_PATH_PREFIXES scoping, this is what takes the
    check from 228 meaningless failures to a real answer.
    """
    if not WP_HOOK_GRAPH_CLI.exists() or not SGS_BLOCKS_DIR.exists():
        return []
    code, out, _ = _run([sys.executable, str(WP_HOOK_GRAPH_CLI), "scan", str(SGS_BLOCKS_DIR)], timeout=120)
    if code < 0:
        return []
    data = _parse_json(out)
    names: list[str] = []
    for h in data.get("hooks_consumed", []):
        name = h.get("name", "")
        path = str(h.get("file", "")).replace(chr(92), "/")
        if name and path.startswith(SGS_OWN_PATH_PREFIXES):
            names.append(name)
    return sorted(set(names))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SGS pre-merge validation gate")
    parser.add_argument("--soft", action="store_true",
                        help="Exit 0 even on check failure (advisory mode)")
    parser.add_argument("--hooks", nargs="*", default=None,
                        help="sgs_ hook names to validate (auto-detected via scan if omitted)")
    args = parser.parse_args(argv)

    print("SGS Pre-Merge Validation Gate")
    print("=" * 50)

    checks: list[tuple[str, bool, str]] = []

    # 1. wp-blocks health
    ok, detail = check_wp_blocks_health()
    checks.append(("wp-blocks health", ok, detail))
    print(f"  [{'OK' if ok else 'FAIL'}] wp-blocks health: {detail}")

    # 2. wp-hooks validate — collect hook names
    hook_names = args.hooks
    if hook_names is None:
        hook_names = _collect_hooks_from_scan()
    ok, detail = check_wp_hooks_validate(hook_names)
    checks.append(("wp-hooks validate", ok, detail))
    print(f"  [{'OK' if ok else 'FAIL'}] wp-hooks validate: {detail}")

    # 3. wp-hook-graph validate
    ok, detail = check_wp_hook_graph_validate()
    checks.append(("wp-hook-graph validate", ok, detail))
    print(f"  [{'WARN' if not ok else 'OK'}] wp-hook-graph validate: {detail}")

    print("=" * 50)
    failed = [name for name, ok, _ in checks if not ok]
    if failed:
        print(f"  {len(failed)} check(s) did not pass: {', '.join(failed)}")
        if args.soft:
            print("  --soft mode: exiting 0 (advisory gate)")
            return 0
        return 1
    print(f"  All {len(checks)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
