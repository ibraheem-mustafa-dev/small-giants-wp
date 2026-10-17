#!/usr/bin/env python3
"""
build-deploy.py — One-shot SGS build + tar + scp + remote extract + cleanup.

Usage examples:
    # Default (build + deploy theme & plugin to sandybrown canary)
    python plugins/sgs-blocks/scripts/build-deploy.py

    # Skip npm build (use existing build/ dir — for re-deploys)
    python plugins/sgs-blocks/scripts/build-deploy.py --skip-build

    # Deploy theme only
    python plugins/sgs-blocks/scripts/build-deploy.py --theme-only

    # Dry run — print commands but do not execute
    python plugins/sgs-blocks/scripts/build-deploy.py --dry-run

    # Verify a specific page instead of the target's homepage
    python plugins/sgs-blocks/scripts/build-deploy.py --verify-url https://sandybrown-nightingale-600381.hostingersite.com/<page-slug>/

Guards (per spec):
    - Refuses to deploy when a file that SHIPS AND EXECUTES is uncommitted, unless
      --allow-dirty (see deployed_dirty_files() — scoped on purpose; a repo-wide
      dirty check is always true on a shared worktree, so it would be bypassed
      every run and protect nothing)
    - Post-deploy smoke test runs BY DEFAULT and ABORTS on a 5xx or a WordPress
      fatal (opt out with --skip-verify). Verify defaults on and fails closed
      because a deploy of an unfinished edit that reports [DONE] is how a PHP
      fatal reaches live sites unnoticed.
    - The default target is sandybrown; the other TARGETS entries
      (indus-test, eye-care-test, mamas-test) are flagged explicit_opt_in_required and must
      be named with --target before they will deploy
    - Refuses to deploy if plugins/sgs-blocks/build/ is missing after build step
    - Never hand-roll tar/scp: the remote step swaps directories with a .bak
      rotation so a failed extract leaves something to roll back to.

R-22-9 universal: hostnames and remote WP paths live in TARGETS dict — add a new
client by adding a single dict entry; no code changes needed elsewhere.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import deploy_cache  # a commit's build and gate:full, done once (sibling module)
import deploy_multi  # several sites from one build (sibling module)

# The deploy steps live in sibling modules; build-deploy.py is the command. Names other
# scripts load from this file by path (TARGETS, the SSH and run helpers,
# NON_BLOCK_POST_TYPES) are re-exported here.
from deploy_common import BUILD_DIR, NON_BLOCK_POST_TYPES, PLUGIN_DIR, REPO_ROOT, SSH_ALIAS, TARGETS, err, fmt_cmd, log, resolve_exe, run, scp_base_cmd, ssh_base_cmd, ssh_has_alias  # noqa: F401 (re-exported)
from deploy_guards import deploy_roots_for_scope, deployed_dirty_files, resolve_theme_json_payload, should_isolate, split_dirty_by_payload, step_deploy_ownership, step_oldshape_audit, step_theme_json_guard, write_deploy_marker
from deploy_selftest import self_test
from deploy_timing import finish as finish_timings, record as record_stage, stage, timed
from deploy_ship import run_isolated, step_build, step_local_cleanup, step_remote_extract, step_scp, step_tar
from deploy_verify import step_motion_qa, step_purge_caches, step_scoped_selector_audit, step_verify, step_verify_payload, step_verify_theme_json


def step_gate_full(dry_run: bool) -> int:
    """PRE-DEPLOY heavyweight gate tier (`npm run gate:full`).

    ⛔ WHY THIS EXISTS AND WHY IT IS NOT OPTIONAL. `prebuild` is FAIL-FAST — a
    change tripping five gates shows ONE failure per build — so the gate chain is
    split into two tiers (`scripts/gates.json`): `fast` runs on every build;
    `full` holds the slowest gates (pytest, check-dead-api-calls,
    audit-block-file-consistency, inspector-scan).

    Moving a gate to a later tier is only legitimate if something actually runs
    that tier. WITHOUT THIS STEP the split would be enforcement laundering: four
    gates would sit in a roster, run on no build, and the repo would read green
    while nothing checked them. `run-gates.py --assert-wired` proves this call is
    still here, and fails closed if it is deleted.

    It runs PRE-tar so a failure costs nothing: nothing has been uploaded yet.
    All four are static source checks, so they need no live canary — unlike
    `step_motion_qa()`, which is post-deploy precisely because it does.

    ⚠ Opting out with `--skip-gate-full` re-creates the hole. Do not make it
    reflex.
    """
    if dry_run:
        log("[gate:full] SKIPPED (--dry-run)")
        return 0
    log("[gate:full] running the pre-deploy heavyweight gate tier")
    return run([resolve_exe("npm"), "run", "gate:full"], dry_run=False, cwd=PLUGIN_DIR)


def build_and_gate(args: argparse.Namespace, deploy_blocks: bool) -> int:
    """[1/5] the build and the pre-deploy gate:full, once per commit.

    A commit that already built and passed gate:full against the same framework DB
    is restored from deploy_cache instead (isolated runs only), and a multi-site
    child skips both because its parent ran them for every site. gate:full reads
    the plugin build (check-motion-bundle-budget refuses a missing build/), so a
    --theme-only deploy builds when the gates run; once they are cached, it does not.
    """
    if args.built_by_parent:
        log("[1/5] build + gate:full: done once by the multi-site parent for every site")
        return 0
    key = deploy_cache.run_key(
        REPO_ROOT, no_cache=args.no_cache or args.dry_run,
        isolated=os.environ.get(deploy_cache.ISOLATED_ENV) == "1",
    )
    passed = None if args.skip_gate_full else deploy_cache.gate_pass(key)
    if passed:
        log(f"[gate:full] PASSED for this commit ({passed['commit'][:9]}) and framework DB "
            f"at {passed['passed_at']}; not re-run (--no-cache re-runs it)")

    if args.skip_build:
        log("[1/5] npm run build: SKIPPED (--skip-build)")
        if deploy_blocks and not args.dry_run and not BUILD_DIR.exists():
            err(f"--skip-build but build dir missing: {BUILD_DIR}")
            print("[ABORTED] reason: build-dir-missing", flush=True)
            return 1
    elif not deploy_blocks and (args.skip_gate_full or passed):
        log("[1/5] npm run build: SKIPPED (--theme-only, and gate:full needs no build)")
    elif passed and timed("build", deploy_cache.restore_build, key, REPO_ROOT, BUILD_DIR):
        log("[1/5] npm run build: RESTORED this commit's build from the deploy cache")
    else:
        rc = timed("build", step_build, args.dry_run)
        if rc != 0:
            print(f"[ABORTED] reason: build-failed (exit {rc})", flush=True)
            return 1

    # Before tar, so an abort costs nothing; see step_gate_full() for why it is not optional.
    if args.skip_gate_full:
        log("[gate:full] SKIPPED (--skip-gate-full) — four gates did NOT run")
    elif not passed:
        began = time.time()
        rc = timed("gate-full", step_gate_full, args.dry_run)
        if rc != 0:
            print(f"[ABORTED] reason: gate-full-failed (exit {rc}). Nothing was "
                  "uploaded.", flush=True)
            return 1
        deploy_cache.record_pass(key, REPO_ROOT, BUILD_DIR, time.time() - began)
    else:
        record_stage("gate-full (cached)", 0.0)
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Build, tar, scp, extract, and cleanup SGS deploy artefacts.",
    )
    p.add_argument("--target", default="sandybrown",
                   help="Deploy target, a comma list of targets, or `all` (default: "
                        f"sandybrown, the canary). Known: {', '.join(sorted(TARGETS))}. "
                        "Several targets build and gate once, then deploy to every site "
                        "at the same time (deploy_multi.py).")
    p.add_argument("--no-cache", action="store_true",
                   help="Build and run gate:full even when this exact commit and framework "
                        "DB already passed them (deploy_cache.py).")
    p.add_argument("--built-by-parent", action="store_true", help=argparse.SUPPRESS)
    p.add_argument("--skip-gate-full", action="store_true",
                   help="Skip the pre-deploy heavyweight gate tier (gate:full). "
                        "This DISABLES four real gates for this deploy.")
    p.add_argument("--skip-build", action="store_true",
                   help="Skip npm run build; reuse existing build/.")
    scope = p.add_mutually_exclusive_group()
    scope.add_argument("--theme-only", action="store_true",
                       help="Deploy only theme/sgs-theme.")
    scope.add_argument("--blocks-only", action="store_true",
                       help="Deploy only plugins/sgs-blocks.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print commands; do not execute.")
    p.add_argument("--allow-dirty", action="store_true",
                   help="Permit deploy with a dirty git working tree.")
    p.add_argument("--skip-verify", action="store_true",
                   help="Skip the post-deploy smoke test (NOT recommended — it is the "
                        "only check that catches a deploy which breaks the live site).")
    p.add_argument("--verify-url", default=None,
                   help="Optional URL to GET after deploy for a smoke check.")
    p.add_argument("--audit-scoped-page", default=None,
                   help="Post-deploy: page_id to run the live scoped-selector "
                        "match audit against (P-SCOPED-SELECTOR-MATCH gate). "
                        "e.g. 8 (the sandybrown homepage clone).")
    p.add_argument("--skip-oldshape-audit", action="store_true",
                   help="Skip the pre-deploy stored-content compatibility gate "
                        "(NOT recommended — it is the only check that catches a "
                        "deploy whose schemas strand or delete stored content).")
    p.add_argument("--skip-motion-qa", action="store_true",
                   help="skip the post-deploy live motion probes. Doing so is "
                        "the D338 mistake: it makes the probes unreachable again.")
    p.add_argument("--skip-purge", action="store_true",
                   help="Skip the post-deploy cache purge (OPcache + LiteSpeed). "
                        "NOT recommended: the deploy still lands, but warm caches "
                        "keep serving the previous version — that is D709.")
    p.add_argument("--takeover", action="store_true",
                   help="Deploy even when the live target carries a commit that is NOT "
                        "an ancestor of HEAD (i.e. deliberately overwrite another "
                        "session's newer deploy). Without this the deploy ABORTS - see "
                        "D576, where a silent clobber cost two sessions of debugging.")
    p.add_argument("--payload", action="append", default=[],
                   help="Repo-relative path prefix (e.g. "
                        "plugins/sgs-blocks/src/blocks/quote/) that is THIS wave's "
                        "deliberate uncommitted payload. Repeatable. Deploys proceed "
                        "without --allow-dirty when every deploy-relevant dirty file "
                        "falls under a declared --payload prefix; any OTHER dirty "
                        "deploy-relevant file (another track's unfinished work) still "
                        "blocks exactly as before (D336). Breaks the deploy<->commit "
                        "deadlock: canary-deploy the payload uncommitted, capture the "
                        "visual-diff report the pre-commit gate demands, THEN commit.")
    p.add_argument("--self-test", action="store_true",
                   help="Run the self-test (payload-scoped dirty gate + client theme.json "
                        "survival) against isolated temp dirs (proves each guard still "
                        "rejects its unsafe case) and exit. Touches no real git state or site.")
    p.add_argument("--no-isolate", action="store_true",
                   help="Build+deploy directly from this shared checkout instead of "
                        "an isolated git worktree. Isolation is the DEFAULT (D-incident "
                        "2026-09-07 — a concurrent session's `npm run build` wiped the "
                        "shared build/ mid-deploy and shipped a broken plugin). Only "
                        "use this if you understand the race it reopens.")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test:
        return self_test()
    t0 = time.time()

    try:
        target_keys = deploy_multi.resolve_targets(args.target, TARGETS)
    except ValueError as exc:
        err(str(exc))
        print("[ABORTED] reason: unknown-target", flush=True)
        return 1
    target_key = target_keys[0]
    target = TARGETS[target_key]

    # Explicit opt-in guard for protected targets: naming one in --target is the opt-in.
    explicit = any(a == "--target" or a.startswith("--target=") for a in sys.argv)
    for key in target_keys:
        if TARGETS[key]["explicit_opt_in_required"] and not explicit:
            err(f"target {key} requires explicit --target {key} opt-in")
            print(f"[ABORTED] reason: explicit-opt-in-required ({key})", flush=True)
            return 1

    # Resolve scope
    deploy_theme = not args.blocks_only
    deploy_blocks = not args.theme_only
    if not (deploy_theme or deploy_blocks):
        err("nothing to deploy (theme and blocks both excluded)")
        print("[ABORTED] reason: empty-scope", flush=True)
        return 1

    # The theme.json this target must end up with (client snapshot, or the framework
    # default when the target names no client). Resolved BEFORE anything runs so a
    # missing/broken client snapshot aborts with nothing uploaded — see
    # resolve_theme_json_payload(). A --blocks-only deploy never touches the theme.
    # Every named site is checked before anything is built.
    theme_json_payload: bytes | None = None
    theme_json_label = ""
    for key in (target_keys if deploy_theme else []):
        theme_json_payload, theme_json_label = resolve_theme_json_payload(TARGETS[key])
        if theme_json_payload is None:
            err(f"[theme-json] {key}: {theme_json_label}")
            err("[theme-json] refusing to deploy the theme: it would replace this target's "
                "theme.json with the framework default. Fix the snapshot or the TARGETS "
                "'client' entry. Nothing was uploaded.")
            print("[ABORTED] reason: client-theme-json-unavailable", flush=True)
            return 1
        log(f"[theme-json] {key}: this deploy ships: {theme_json_label}")
    if deploy_theme:
        theme_json_payload, theme_json_label = resolve_theme_json_payload(target)

    # Git cleanliness guard — scoped to files that ship AND execute on the site.
    # Computed once, unconditionally (also feeds the isolation decision below).
    dirty = deployed_dirty_files(
        roots=deploy_roots_for_scope(args.theme_only, args.blocks_only)
    )
    covered, uncovered = split_dirty_by_payload(dirty, args.payload) if dirty else ([], [])
    # Whether THIS invocation actually intends to ship uncommitted content —
    # either every dirty file is a declared --payload, or the operator passed
    # --allow-dirty outright. Only this case needs the shared (non-isolated)
    # checkout: a worktree built from `git worktree add <dir> HEAD` cannot
    # carry uncommitted content by construction, so it would silently DROP an
    # intended dirty payload.
    intends_dirty_ship = bool(dirty) and (args.allow_dirty or not uncovered)

    # Deploy isolation — see the module-level
    # note above run_isolated(). A worktree at HEAD is dirty-immune BY
    # CONSTRUCTION: it can only ever contain committed content, so when this
    # run does not intend to ship anything uncommitted, isolating makes the
    # git-cleanliness guard below MOOT for THIS run — other sessions' unrelated
    # dirty files in the shared checkout (a near-certainty on a 150+-session
    # tree) cannot leak into a worktree checkout regardless, so there is
    # nothing left to abort on. Without isolation, a fully-committed
    # single-block deploy is wrongly aborted by OTHER sessions' unrelated dirty
    # blocks sitting in the shared checkout — none of which a worktree at HEAD
    # would ship in the first place.
    if not intends_dirty_ship and should_isolate(args, dirty):
        log("[isolate] dirty-tree gate satisfied by construction (worktree "
            "checks out committed HEAD only) — skipping the shared-checkout "
            "dirty-file abort for this run.")
        return run_isolated(args)

    if not args.allow_dirty and not args.dry_run and dirty:
        if covered:
            log("[payload] declared --payload covers these dirty files — "
                "deploying them uncommitted:")
            for path in covered:
                log(f"    {path}")
        if uncovered:
            err("uncommitted changes in files this deploy would push live, "
                "NOT covered by --payload:")
            for path in uncovered:
                err(f"    {path}")
            err("commit them, add them to --payload if they are THIS wave's "
                "intended payload, or re-run with --allow-dirty if this is "
                "deliberate")
            print("[ABORTED] reason: deployed-files-dirty", flush=True)
            return 1

    if len(target_keys) > 1:
        log(f"[multi] {len(target_keys)} sites: {', '.join(target_keys)}; one build and "
            "gate:full, then every site at the same time")
        rc = build_and_gate(args, deploy_blocks)
        if rc != 0:
            return rc
        if args.dry_run:
            for key in target_keys:
                log(f"[multi] would deploy {key}: {fmt_cmd(deploy_multi.child_argv(sys.argv[1:], key))}")
            return 0
        rc = deploy_multi.run_children(Path(__file__).resolve(), sys.argv[1:], target_keys, log)
        if rc == 0:
            finish_timings(target=",".join(target_keys), theme_only=args.theme_only,
                           blocks_only=args.blocks_only, total_s=time.time() - t0, dry_run=False)
            print(f"[DONE] sgs-deploy completed for {len(target_keys)} sites in "
                  f"{int(time.time() - t0)}s", flush=True)
        return rc

    use_alias = ssh_has_alias(SSH_ALIAS)
    host_label = target["host"]
    log(f"[plan] target={target_key} host={host_label} theme={deploy_theme} "
        f"blocks={deploy_blocks} ssh-alias={'yes' if use_alias else 'no'} "
        f"dry-run={'yes' if args.dry_run else 'no'}")

    # Pre-deploy content-compat gate: the target's stored post_content vs the
    # schemas in THIS tree. Runs before the build — no point compiling code that
    # would strand stored content (an InnerBlocks render that no longer reads an
    # old scalar shape).
    if args.skip_oldshape_audit:
        log("[oldshape-audit] SKIPPED (--skip-oldshape-audit)")
    else:
        rc = timed("oldshape-audit", step_oldshape_audit, args.dry_run, use_alias, target_key,
                   target["wp_content"])
        if rc != 0:
            print("[ABORTED] reason: oldshape-audit-failed (stored content would "
                  "silently lose render or attrs under the schemas being deployed)",
                  flush=True)
            return 1

    rc = build_and_gate(args, deploy_blocks)
    if rc != 0:
        return rc

    # [2/5] Tar
    # Pre-deploy ownership gate: would this deploy clobber work that is live and
    # NOT in this checkout? Runs BEFORE tar/scp so an abort costs nothing.
    rc = timed("deploy-ownership", step_deploy_ownership, use_alias, target_key, args.takeover, args.dry_run)
    if rc != 0:
        print("[ABORTED] reason: deploy-ownership (the live target carries work this "
              "HEAD does not have). Nothing was uploaded.", flush=True)
        return 1

    # Would replacing the live theme.json discard a snapshot someone deliberately pushed?
    if deploy_theme and not args.dry_run:
        rc = timed("theme-json-guard", step_theme_json_guard, use_alias, target, theme_json_payload,
                   theme_json_label, args.takeover)
        if rc != 0:
            print("[ABORTED] reason: theme-json-guard (the live theme.json is an uncommitted "
                  "pushed snapshot, or could not be read). Nothing was uploaded.", flush=True)
            return 1

    try:
        with stage("package"), deploy_cache.package_lock(log):
            rc = step_tar(args.dry_run, theme=deploy_theme, blocks=deploy_blocks,
                          theme_json_payload=theme_json_payload)
    except TimeoutError as exc:
        err(f"[package-lock] {exc}")
        rc = 1
    if rc != 0:
        print(f"[ABORTED] reason: tar-failed (exit {rc})", flush=True)
        return 1

    # [3/5] SCP
    rc = timed("scp", step_scp, args.dry_run, use_alias, host_label)
    if rc != 0:
        print(f"[ABORTED] reason: scp-failed (exit {rc})", flush=True)
        return 1

    # [4/5] Remote extract
    rc = timed("remote-extract", step_remote_extract, args.dry_run, use_alias, target["wp_content"],
               theme=deploy_theme, blocks=deploy_blocks,
               theme_json_payload=theme_json_payload is not None)
    if rc != 0:
        print(f"[ABORTED] reason: remote-extract-failed (exit {rc})", flush=True)
        return 1

    # [5/5] Local cleanup
    timed("deploy-marker", write_deploy_marker, use_alias, target_key, args.dry_run)

    rc = timed("local-cleanup", step_local_cleanup, args.dry_run)
    if rc != 0:
        print(f"[ABORTED] reason: local-cleanup-failed (exit {rc})", flush=True)
        return 1

    # Cache purge — BEFORE verify, so the smoke test measures what a visitor gets
    # rather than what a cache-busting query string gets. Never aborts: see the
    # step's docstring.
    if args.skip_purge:
        log("[purge] SKIPPED (--skip-purge) — a warm cache may serve the OLD version")
    else:
        timed("purge-caches", step_purge_caches, args.dry_run, use_alias, target["wp_content"],
              target["host"])

    # Post-deploy, fail closed, NOT skippable by --skip-verify: did the client's theme.json
    # survive? A deploy that silently reverts it is exactly what this guards.
    if deploy_theme and not args.dry_run:
        rc = timed("verify-theme-json", step_verify_theme_json, use_alias, target["wp_content"],
                   theme_json_payload, theme_json_label)
        if rc != 0:
            print("[DEPLOYED-BUT-THEME-SETTINGS-LOST] the deploy completed but the live "
                  "theme.json is not this target's theme.json. Re-apply the client snapshot "
                  "with push-theme-snapshot.py.", flush=True)
            return 1

    # Post-deploy smoke test — ON by default, aborts on a broken site.
    verify_url = args.verify_url or f"https://{target['host']}/"
    if args.skip_verify:
        log("[verify] SKIPPED (--skip-verify)")
    elif args.dry_run:
        log(f"[verify] SKIPPED (--dry-run); would GET {verify_url}")
    else:
        rc = timed("verify", step_verify, verify_url)
        if rc != 0:
            # Deliberately NOT "[ABORTED]": the deploy already happened and the
            # files are live. "ABORTED" reads as "nothing shipped" and invites a
            # retry loop, which would just re-deploy the same broken build.
            print("[DEPLOYED-BUT-BROKEN] the files ARE live and the site is "
                  f"returning an error: {verify_url}", flush=True)
            print("[DEPLOYED-BUT-BROKEN] do NOT re-run this deploy - roll back "
                  "or fix forward. If the site was ALREADY broken before this "
                  "run, this check cannot tell the difference; confirm first.",
                  flush=True)
            return 1

    # Post-deploy CHANGE-SPECIFIC gate: is the live plugin what we just shipped?
    # Runs after the smoke test so a broken SITE is reported before a stale PAYLOAD.
    if deploy_blocks and not args.skip_verify and not args.dry_run:
        rc = timed("verify-payload", step_verify_payload, use_alias, target["wp_content"], deploy_blocks)
        if rc != 0:
            print("[DEPLOYED-BUT-STALE] the deploy completed and the site responds, "
                  "but the LIVE plugin does not match this run's payload. Your code "
                  "is probably NOT what is running (D576).", flush=True)
            return 1

    # Post-deploy LIVE motion gate: do the shipped scroll effects still work?
    # Runs after the payload gate so a STALE payload is reported before motion is blamed.
    # The probes measure the sandybrown canary's fixture pages, so on any other target
    # a pass would say nothing about the site just deployed.
    if deploy_blocks and not args.skip_motion_qa and not args.dry_run and target_key != "sandybrown":
        log(f"[motion-qa] SKIPPED: the probes measure the sandybrown canary, not {target_key}")
    elif deploy_blocks and not args.skip_motion_qa and not args.dry_run:
        rc = timed("motion-qa", step_motion_qa, args.dry_run)
        if rc != 0:
            print("[DEPLOYED-BUT-MOTION-REGRESSED] the deploy completed, the site "
                  "responds and the payload matches, but a live motion probe failed. "
                  "Read the probe output: it distinguishes a real regression from a "
                  "rotted canary fixture, and re-running the deploy fixes neither.",
                  flush=True)
            return 1

    # Post-deploy structural gate: live scoped-selector match audit.
    if args.audit_scoped_page:
        rc = timed("scoped-selector-audit", step_scoped_selector_audit, args.audit_scoped_page, args.dry_run)
        if rc != 0:
            print("[ABORTED] reason: scoped-selector-audit-failed "
                  "(dead per-instance selectors on the deployed page)", flush=True)
            return 1

    finish_timings(target=target_key, theme_only=args.theme_only, blocks_only=args.blocks_only,
                   total_s=time.time() - t0, dry_run=args.dry_run)
    elapsed = int(time.time() - t0)
    print(f"[DONE] sgs-deploy completed in {elapsed}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
