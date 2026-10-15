#!/usr/bin/env python3
"""deploy_guards.py - build-deploy.py's checks before anything ships: the scoped dirty-file gate, the
client theme.json payload and its guard, the ownership marker, the stored-content
audit and the isolation decision.
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from deploy_common import DEPLOY_ROOTS, DEPLOY_SKIP_BASENAMES, DEPLOY_SKIP_PREFIXES, FRAMEWORK_THEME_JSON_REL, NON_BLOCK_POST_TYPES, REPO_ROOT, RUNTIME_SUFFIXES, SNAPSHOT_REL, err, log, ssh_base_cmd


def deploy_roots_for_scope(theme_only: bool, blocks_only: bool) -> tuple[str, ...]:
    """The deploy roots THIS INVOCATION will actually ship.

    ``DEPLOY_ROOTS`` names everything the script CAN deploy; a given run may
    deploy less. ``--blocks-only`` never writes a theme file, so a dirty theme
    template is not "about to execute on a live site" for that run — and that is
    precisely the contract ``deployed_dirty_files()`` promises when it fires.

    WHY THIS IS A NARROWING, NOT A WEAKENING. A guard that fires on files a run
    cannot touch (another track's uncommitted theme templates, on a
    ``--blocks-only`` deploy) trains the operator to reach for
    ``--allow-dirty``, and that reflex removes the guard's protection for the
    files that do ship.

    Returns a strictly SMALLER set than ``DEPLOY_ROOTS``, never a larger one, and
    returns ``DEPLOY_ROOTS`` unchanged for a full deploy. ``self_test()`` cases 5-7 prove
    both directions, including that an in-scope dirty file STILL blocks.
    """
    if blocks_only:
        return ("plugins/sgs-blocks/",)
    if theme_only:
        return ("theme/sgs-theme/",)
    return DEPLOY_ROOTS


def deployed_dirty_files(
    repo_root: Path = REPO_ROOT,
    roots: tuple[str, ...] = DEPLOY_ROOTS,
) -> list[str]:
    """Tracked, uncommitted files that BOTH ship in the tarball AND run at runtime.

    Deliberately narrower than a repo-wide ``git status``. A repo-wide check is
    always true here (``.claude/`` reports, ``package-lock.json``, ``reports/*.txt``
    churn constantly), so it would be bypassed with ``--allow-dirty`` on every
    run and therefore protect nothing — and an unfinished edit would reach live
    client sites. Scoped this way the guard stays quiet during normal work, so
    when it fires it means a file that is about to execute on a live site
    differs from HEAD.

    ``repo_root`` is overridable (default: the real repo) so this can be exercised
    against an isolated temp repo in ``self_test()`` without touching real git state.

    ``roots`` is the set of deploy roots THIS RUN will ship — see
    ``deploy_roots_for_scope()``. It defaults to every root.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=no"],
        cwd=repo_root, check=False, capture_output=True, text=True,
    )
    hits: list[str] = []
    for line in result.stdout.splitlines():
        path = line[3:].strip()
        if "->" in path:  # rename entries read "old -> new"
            path = path.split("->")[-1].strip()
        path = path.strip('"')
        if not path.startswith(roots):
            continue
        if path.startswith(DEPLOY_SKIP_PREFIXES):
            continue
        if Path(path).name in DEPLOY_SKIP_BASENAMES:
            continue
        if not path.endswith(RUNTIME_SUFFIXES):
            continue
        hits.append(path)
    return hits


def split_dirty_by_payload(dirty: list[str], payload_prefixes: list[str]) -> tuple[list[str], list[str]]:
    """Split deploy-relevant dirty files into (covered, uncovered) by declared payload.

    Breaks the deploy<->commit deadlock: ``build-deploy.py`` refuses to run dirty,
    while the pre-commit visual-diff gate refuses a commit without a report that
    requires a live deploy to produce. Neither could go first, so the deploy gate
    distinguishes "dirty with the payload being deployed" from "dirty with
    unrelated unfinished work" rather than the visual-diff gate's ordering being
    relaxed. The tree is SHARED across concurrent tracks, so at any moment there
    is very likely dirty work that has NOTHING to do with the wave being deployed.
    A caller who names their own payload
    (``--payload plugins/sgs-blocks/src/blocks/quote/``) is asserting "this, and only
    this, is what I intend to ship uncommitted"; anything else dirty in deploy scope
    is presumptively someone else's unfinished work and must still block. The
    visual-diff gate is the one that enforces "no unverified visual change
    ships", so its produce-report-before-commit ordering is left alone.

    A file is "covered" only when it falls under one of the declared prefixes. An
    EMPTY prefix list covers nothing, so calling this with ``payload_prefixes=[]``
    gives the all-or-nothing behaviour: every dirty file blocks.
    """
    norm_prefixes = [p.replace("\\", "/").rstrip("/") + "/" for p in payload_prefixes if p]
    covered: list[str] = []
    uncovered: list[str] = []
    for f in dirty:
        f_norm = f.replace("\\", "/")
        if any(f_norm == p.rstrip("/") or f_norm.startswith(p) for p in norm_prefixes):
            covered.append(f)
        else:
            uncovered.append(f)
    return covered, uncovered


def _load_push_module():
    """Import push-theme-snapshot.py (hyphenated filename) from this scripts directory."""
    import importlib.util
    path = Path(__file__).resolve().parent / "push-theme-snapshot.py"
    spec = importlib.util.spec_from_file_location("sgs_push_theme_snapshot", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def resolve_theme_json_payload(target: dict, root: Path = REPO_ROOT) -> tuple[bytes | None, str]:
    """Return (the theme.json bytes this target must end up with, a label or error message).

    ``target["client"]`` None -> the framework ``theme/sgs-theme/theme.json``. A named client ->
    that client's ``theme-snapshot.json``, prepared exactly as push-theme-snapshot.py prepares
    it. FAILS CLOSED: a named client whose snapshot is missing, unparseable or not a theme.json
    returns (None, reason), and the deploy aborts before anything is uploaded — it never falls
    back to the framework file, because that fallback IS the bug.
    """
    client = target.get("client")
    if not client:
        path = root / FRAMEWORK_THEME_JSON_REL
        try:
            return path.read_bytes(), f"framework default ({FRAMEWORK_THEME_JSON_REL})"
        except OSError as exc:
            return None, f"framework theme.json unreadable: {exc}"
    path = root / SNAPSHOT_REL.format(client=client)
    if not path.is_file():
        return None, (f"target names client '{client}' but {path.relative_to(root).as_posix()} "
                      "does not exist")
    try:
        data, note = _load_push_module().deploy_theme_json_bytes(path)
        parsed = json.loads(data.decode("utf-8"))
    except (OSError, ValueError) as exc:
        return None, f"client '{client}' snapshot could not be prepared: {exc}"
    if not (isinstance(parsed, dict) and parsed.get("version") and isinstance(parsed.get("settings"), dict)):
        return None, f"client '{client}' snapshot is not a theme.json (no version/settings)"
    label = f"client snapshot {SNAPSHOT_REL.format(client=client)}"
    return data, label + (f" ({note})" if note else "")


def theme_json_guard_decision(live_md5: str | None, payload_md5: str,
                              checkout_snapshot_md5: str | None) -> str:
    """PRE-UPLOAD: may this deploy replace the live theme.json with the payload? Pure.

      ``unchanged``          live already equals the payload
      ``replace``            live differs (e.g. the framework default a past deploy left, or no
                             file yet) — the payload restores the client's committed snapshot
      ``abort-uncommitted``  live equals the SHARED CHECKOUT's working copy of the client
                             snapshot, which differs from the committed one being shipped: an
                             uncommitted snapshot was pushed, and this deploy would silently
                             discard it. Commit the snapshot, or pass --takeover to replace it.
    """
    if live_md5 == payload_md5:
        return "unchanged"
    if checkout_snapshot_md5 and checkout_snapshot_md5 != payload_md5 and live_md5 == checkout_snapshot_md5:
        return "abort-uncommitted"
    return "replace"


def uncommitted_snapshot_md5(wc_bytes: bytes, payload: bytes) -> str | None:
    """The md5 of the working copy's theme.json when it holds an uncommitted snapshot, else None. Pure.

    A working copy that differs from the payload only in line endings (a Windows checkout writes CRLF,
    git stores LF) holds no uncommitted change, so it never blocks a deploy."""
    import hashlib
    if wc_bytes.replace(b"\r\n", b"\n") == payload.replace(b"\r\n", b"\n"):
        return None
    return hashlib.md5(wc_bytes).hexdigest()


def _remote_md5(use_alias: bool, path: str) -> tuple[str | None, str]:
    """(md5 or None, status) of a remote file. status: found | absent | error."""
    remote_cmd = (f"if [ -f {shlex.quote(path)} ]; then md5sum {shlex.quote(path)}; "
                  "else echo __ABSENT__; fi")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote_cmd], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
    except (subprocess.SubprocessError, OSError) as exc:
        err(f"[theme-json] SSH failed: {exc}")
        return None, "error"
    text = (out.stdout or "").strip()
    if out.returncode != 0:
        err(f"[theme-json] SSH exit {out.returncode}: {(out.stderr or '').strip()[:200]}")
        return None, "error"
    if text == "__ABSENT__":
        return None, "absent"
    md5 = text.split()[0] if text else ""
    return (md5, "found") if len(md5) == 32 else (None, "error")


def step_theme_json_guard(use_alias: bool, target: dict, payload: bytes, label: str,
                          takeover: bool) -> int:
    """Pre-upload: log what the deploy will do to the live theme.json; abort on the one case
    where replacing it would silently discard a snapshot someone deliberately pushed."""
    import hashlib
    payload_md5 = hashlib.md5(payload).hexdigest()
    live_path = f"{target['wp_content']}/themes/sgs-theme/theme.json"
    live_md5, status = _remote_md5(use_alias, live_path)
    if status == "error":
        err("[theme-json] could not read the live theme.json, so this deploy cannot tell what "
            "it would replace. Nothing was uploaded.")
        return 1
    checkout_md5 = None
    client = target.get("client")
    if client:
        # A worktree-isolated run is re-exec'd from a checkout of HEAD; the operator's working
        # copy (where an uncommitted push came from) is the shared checkout run_isolated names.
        shared_root = Path(os.environ.get("SGS_DEPLOY_SHARED_ROOT") or REPO_ROOT)
        snap = shared_root / SNAPSHOT_REL.format(client=client)
        if snap.is_file():
            try:
                wc_bytes, _ = _load_push_module().deploy_theme_json_bytes(snap)
                checkout_md5 = uncommitted_snapshot_md5(wc_bytes, payload)
            except (OSError, ValueError):
                checkout_md5 = None
    decision = theme_json_guard_decision(live_md5, payload_md5, checkout_md5)
    log(f"[theme-json] payload: {label} md5={payload_md5[:8]}; live md5="
        f"{(live_md5 or status)[:8]} -> {decision}")
    if decision == "abort-uncommitted" and not takeover:
        err(f"[theme-json] the LIVE theme.json is the UNCOMMITTED working copy of "
            f"{SNAPSHOT_REL.format(client=client)} (pushed by push-theme-snapshot.py), and this "
            "deploy ships the COMMITTED version. Deploying would silently discard the pushed "
            "snapshot. Commit the snapshot and re-run, or pass --takeover to replace it on "
            "purpose. Nothing was uploaded.")
        return 1
    if decision == "abort-uncommitted":
        log("[theme-json] --takeover: replacing the pushed uncommitted snapshot on purpose")
    return 0


def should_isolate(args: "argparse.Namespace", dirty_files: list[str]) -> bool:
    """Whether THIS run should build+deploy from an isolated worktree.

    ONLY the flag-based eligibility checks live here: --no-isolate (explicit
    opt-out), --skip-build (no build race to protect against — reusing an
    existing build/ touches nothing that a concurrent `rm -rf build` could
    clobber during THIS run), --dry-run (nothing is built), --self-test
    (never reaches main()'s deploy path).

    Whether this run INTENDS to ship uncommitted content (and must therefore
    skip isolation regardless of these flags, since a worktree at HEAD cannot
    carry it) is decided by the CALLER before this function is even invoked
    — see `intends_dirty_ship` in main(). `dirty_files` is accepted only for
    an informational log line; it is not itself a disqualifying condition
    here, because the caller already screened for the disqualifying case.
    """
    if args.no_isolate:
        return False
    if args.skip_build:
        return False
    if args.dry_run:
        return False
    if dirty_files:
        log(f"[isolate] {len(dirty_files)} dirty deploy-relevant file(s) exist in "
            "the shared checkout, none declared for THIS run to ship — isolating "
            "anyway (a worktree at HEAD cannot carry them regardless).")
    return True


def step_oldshape_audit(dry_run: bool, use_alias: bool, target_key: str,
                        wp_content: str) -> int:
    """Pre-deploy content-compat gate. Scans the TARGET site's stored post_content against
    the LOCAL block.json schemas (i.e. the code about to be deployed) for:
      * stranded content — old scalar shapes an InnerBlocks render no longer reads
        (a client homepage that rendered empty), and
      * undeclared attrs — dropped from the EDITOR schema (not from render.php's
        `$attributes`; PHP keeps an unrecognised key), DELETED on next editor save.

    Read-only on the site (`wp post get` — the guard-sanctioned route). Findings
    already dispositioned in the casualty register live in
    oldshape-audit-baseline.json; only NEW findings fail the deploy. ON by
    default; --skip-oldshape-audit opts out (then compatibility is YOUR problem).
    """
    if dry_run:
        log("[oldshape-audit] SKIPPED (--dry-run); would scan target post_content "
            "against the schemas being deployed")
        return 0
    wp_root = wp_content.rsplit("/wp-content", 1)[0]
    # Post types are ENUMERATED from the live site, never hardcoded — a client CPT
    # (sgs_header/sgs_footer/sgs_product_template) or a reusable block holds block
    # markup exactly like a page does, and a page,post-only scan was blind to all
    # of them. Only WP-internal types that structurally
    # cannot carry block markup in post_content are excluded.
    #
    # TWO WP bootstraps total (enumerate types, then one bulk JSON fetch). The
    # obvious per-post `wp post get` loop costs one bootstrap PER POST and timed
    # out at 180s on the canary — a gate that aborts a healthy deploy on its own
    # slowness is worse than no gate. JSON also escapes content correctly, where a
    # text delimiter can be forged by post content containing the delimiter.
    skip_types = "|".join(NON_BLOCK_POST_TYPES)
    remote = (
        f"cd {shlex.quote(wp_root)} && "
        f"types=$(wp post-type list --field=name | grep -Ev '^({skip_types})$' | paste -sd,) && "
        "wp post list --post_type=\"$types\" --post_status=any --fields=ID,post_content "
        "--format=json"
    )
    log("[oldshape-audit] fetching stored post_content from target (read-only)")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=180)
    except (subprocess.SubprocessError, OSError) as e:
        err(f"[oldshape-audit] SSH fetch failed: {e}")
        err("fix connectivity first; use --skip-oldshape-audit ONLY if stored-content "
            "compatibility has been verified another way")
        return 1
    if out.returncode != 0:
        err(f"[oldshape-audit] SSH fetch failed (exit {out.returncode}): "
            f"{(out.stderr or '').strip()[:300]}")
        err("fix connectivity first; use --skip-oldshape-audit ONLY if stored-content "
            "compatibility has been verified another way")
        return 1
    try:
        posts = json.loads(out.stdout[out.stdout.index("["):])
    except (ValueError, json.JSONDecodeError) as e:
        err(f"[oldshape-audit] could not read the post list from the target: {e}")
        err("this is fail-closed on purpose — an unreadable content list cannot be "
            "audited, and an unaudited deploy is how content gets stranded silently")
        return 1
    audit = Path(__file__).resolve().parent / "audit-post-content-blocks.py"
    baseline = Path(__file__).resolve().parent / "oldshape-audit-baseline.json"
    with tempfile.TemporaryDirectory() as td:
        # Subdir named after the target so finding keys match the register/baseline
        # convention ("<target>/<post id>|sgs/hero|…").
        site_dir = Path(td) / target_key
        site_dir.mkdir()
        for post in posts:
            with open(site_dir / f"{post['ID']}.txt", "w", encoding="utf-8", newline="") as fh:
                fh.write(post.get("post_content") or "")
        count = len(posts)
        log(f"[oldshape-audit] scanning {count} post(s) against local block.json schemas")
        cmd = [sys.executable, str(audit), str(site_dir), "--check"]
        if baseline.exists():
            cmd += ["--baseline", str(baseline)]
        rc = subprocess.call(cmd)
    if rc != 0:
        log("[oldshape-audit] FAIL: deploying these schemas would strand or delete "
            "stored content — migrate it first (scripts/wp-migrate-oldshape-blocks.js)")
    else:
        log("[oldshape-audit] PASS: stored content is compatible with the schemas "
            "being deployed")
    return rc


# Deploy-ownership marker. Deliberately OUTSIDE the webroot (the SSH home dir):
# it names a username, a branch and a commit SHA, and anything under wp-content
# is publicly fetchable. Per-target because several sites share this account.
def marker_path(target_key: str) -> str:
    return f".sgs-deploy-marker-{target_key}.json"


def read_deploy_marker(use_alias: bool, target_key: str) -> dict | None:
    """The marker left by whoever deployed this target last, or None.

    Returns None for BOTH "no marker yet" and "could not read it" — the caller
    treats an absent marker as permission to proceed, because a first-ever
    deploy must not be blocked by its own bookkeeping.
    """
    remote = f"cat {shlex.quote(marker_path(target_key))} 2>/dev/null || echo __NO_MARKER__"
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
    except (subprocess.SubprocessError, OSError):
        return None
    body = (out.stdout or "").strip()
    if out.returncode != 0 or not body or "__NO_MARKER__" in body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def step_deploy_ownership(use_alias: bool, target_key: str, takeover: bool,
                          dry_run: bool) -> int:
    """PRE-deploy gate: refuse to clobber a deploy carrying work this HEAD lacks.

    ⛔ WHY. This canary is shared, and a co-active session deploys from its OWN
    git worktree — so it ships ITS build/, not yours. Deploying an older build
    over a newer one silently reverts every migrated block.json to the
    pre-migration schema; WordPress then discards every object-valued attribute
    before render, and the deploy reports success.

    The test is ANCESTRY, not equality: if the recorded commit is an ancestor of
    HEAD, this deploy carries everything the last one did and overwriting is
    safe. If it is NOT, the live site holds work this checkout does not have, and
    deploying would destroy it — abort and make the operator choose.

    Fail-OPEN on the unknowns (no marker / unreadable / no SHA recorded): a
    first-ever deploy, or a marker written by an older version of this script,
    must not be blocked by its own bookkeeping. Fail-CLOSED only on the one case
    that is genuinely provable: a recorded commit that is real and is not an
    ancestor.
    """
    if dry_run:
        log("[ownership] SKIPPED (--dry-run)")
        return 0

    marker = read_deploy_marker(use_alias, target_key)
    if not marker:
        log("[ownership] no previous marker on this target - proceeding (first deploy "
            "by this mechanism)")
        return 0

    sha = str(marker.get("commit") or "").strip()
    who = marker.get("deployer") or "unknown"
    when = marker.get("at") or "unknown time"
    branch = marker.get("branch") or "unknown branch"
    if not sha:
        log(f"[ownership] marker has no commit recorded (written by {who} at {when}) "
            "- proceeding")
        return 0

    # Is the recorded commit even in this clone? If not, we cannot reason about
    # ancestry, and the safe reading is "someone deployed something we have never
    # fetched" - which is exactly the case worth stopping for.
    known = subprocess.run(["git", "cat-file", "-e", f"{sha}^{{commit}}"],
                           cwd=REPO_ROOT, capture_output=True)
    if known.returncode != 0:
        if takeover:
            log(f"[ownership] --takeover: overwriting a deploy at unknown commit {sha[:8]} "
                f"({who}, {when})")
            return 0
        err(f"[ownership] ABORT: the live target was deployed at commit {sha[:8]} "
            f"({branch}, by {who} at {when}), which does not exist in this clone.")
        err("[ownership] run `git fetch --all` first. If that commit is genuinely gone "
            "or irrelevant, re-run with --takeover.")
        return 1

    anc = subprocess.run(["git", "merge-base", "--is-ancestor", sha, "HEAD"],
                         cwd=REPO_ROOT, capture_output=True)
    if anc.returncode == 0:
        log(f"[ownership] OK: live is at {sha[:8]} ({who}), an ancestor of HEAD - "
            "this deploy is a fast-forward")
        return 0

    if takeover:
        log(f"[ownership] --takeover: deliberately overwriting {sha[:8]} ({branch}, "
            f"{who}, {when}), which is NOT an ancestor of HEAD")
        return 0

    err(f"[ownership] ABORT: the live target carries commit {sha[:8]} on {branch} "
        f"(deployed by {who} at {when}), which is NOT an ancestor of your HEAD.")
    err("[ownership] Deploying would DESTROY work that is live and not in this checkout. "
        "This is the D576 failure, made visible instead of silent.")
    err("[ownership] Choose: `git pull --rebase` (or merge that work) and re-run, or "
        "re-run with --takeover if you genuinely intend to replace it.")
    return 1


def write_deploy_marker(use_alias: bool, target_key: str, dry_run: bool) -> int:
    """Record who deployed what, AFTER a successful extract.

    Best-effort: a failure here is logged, never fatal. The files are already
    live at this point, and refusing to finish over bookkeeping would be worse
    than a missing marker.
    """
    if dry_run:
        return 0
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT,
                          capture_output=True, text=True)
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=REPO_ROOT,
                            capture_output=True, text=True)
    payload = {
        "commit": (head.stdout or "").strip(),
        "branch": (branch.stdout or "").strip() or "(detached)",
        "deployer": os.environ.get("USERNAME") or os.environ.get("USER") or "unknown",
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "target": target_key,
    }
    blob = json.dumps(payload, separators=(",", ":"))
    remote = f"cat > {shlex.quote(marker_path(target_key))} <<'SGSEOF'\n{blob}\nSGSEOF"
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
        if out.returncode != 0:
            log(f"[ownership] WARN: could not write the marker (exit {out.returncode}) "
                "- deploy stands, but the next session will not see this one")
            return 0
    except (subprocess.SubprocessError, OSError) as e:
        log(f"[ownership] WARN: could not write the marker ({e}) - deploy stands")
        return 0
    log(f"[ownership] marker written: {payload['commit'][:8]} on {payload['branch']} "
        f"by {payload['deployer']}")
    return 0
