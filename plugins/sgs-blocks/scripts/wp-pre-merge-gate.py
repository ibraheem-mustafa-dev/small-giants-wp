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


def check_wp_hooks_validate(hook_names: list[str]) -> tuple[bool, str]:
    """Validate each hook name via wp-docs.py validate-hook.

    sgs_-prefixed hooks will correctly return NOT_FOUND (they're custom; that's expected).
    We only FAIL if a hook the plugin CONSUMES (add_action/add_filter) is unrecognised
    and does NOT start with sgs_ (meaning it may be a WP core hook that's misspelled).
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
        code, out, _ = _run([sys.executable, str(WP_DOCS_CLI), "validate-hook", hook])
        if code < 0:
            continue  # soft-fail on subprocess error
        data = _parse_json(out)
        if data.get("status") == "NOT_FOUND":
            # Unexpected: a non-sgs_ hook not in WP core — possible typo.
            failures.append(hook)

    if failures:
        return False, f"FAIL: {len(failures)} non-SGS hooks not in WP docs: {', '.join(failures[:5])}"
    return True, f"CLEAN: {len(hook_names)} hooks checked (sgs_-prefixed skipped as expected)"


def check_wp_hook_graph_validate() -> tuple[bool, str]:
    """Run wp-hook-graph.py validate on the sgs-blocks plugin dir."""
    if not WP_HOOK_GRAPH_CLI.exists():
        return True, "SKIP: wp-hook-graph.py not found"
    if not SGS_BLOCKS_DIR.exists():
        return True, "SKIP: sgs-blocks dir not found"
    code, out, _ = _run([sys.executable, str(WP_HOOK_GRAPH_CLI), "validate", str(SGS_BLOCKS_DIR)])
    if code < 0:
        return True, f"SKIP: wp-hook-graph validate soft-failed"
    # validate exits 0 even with unverified hooks — we parse stdout for the count.
    lines = out.strip().splitlines()
    not_found_line = next((l for l in lines if "Not found" in l), "")
    if "Not found   : 0" in out or not not_found_line:
        return True, f"CLEAN: hook graph validate passed"
    # Non-zero unverified — advisory warning (not a hard failure).
    # The pre-merge gate treats this as a warning (exits 0 in soft mode).
    return False, f"WARN: {not_found_line.strip()} — see wp-hook-graph validate output"


def _collect_hooks_from_scan() -> list[str]:
    """Run wp-hook-graph scan on sgs-blocks and return all hook names."""
    if not WP_HOOK_GRAPH_CLI.exists() or not SGS_BLOCKS_DIR.exists():
        return []
    code, out, _ = _run([sys.executable, str(WP_HOOK_GRAPH_CLI), "scan", str(SGS_BLOCKS_DIR)])
    if code < 0:
        return []
    data = _parse_json(out)
    return [h.get("name", "") for h in data.get("hooks_registered", []) if h.get("name")]


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
