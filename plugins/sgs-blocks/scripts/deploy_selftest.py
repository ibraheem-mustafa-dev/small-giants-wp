#!/usr/bin/env python3
"""deploy_selftest.py - build-deploy.py --self-test: each case proves a deploy guard rejects its unsafe case,
against temp repos and a temp server folder, never the real tree or a site.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
import deploy_cache
import deploy_multi

from deploy_common import DEPLOY_ROOTS, FRAMEWORK_THEME_JSON_REL, SNAPSHOT_REL, TARBALL_NAME, TARGETS, THEME_JSON_PAYLOAD_NAME
from deploy_guards import deploy_roots_for_scope, deployed_dirty_files, resolve_theme_json_payload, split_dirty_by_payload, theme_json_guard_decision, uncommitted_snapshot_md5
from deploy_ship import build_remote_extract_cmd, build_tar_cmd
from deploy_verify import theme_json_verify_result


def self_test_theme_json() -> list[str]:
    """Self-test cases 8-15: the client theme.json survives a theme deploy (no network).

    Runs the REAL tar command and the REAL remote extract command against a temp "repo" and a
    temp "server" directory, so it proves the packaged bytes, not a model of them.
    """
    import hashlib
    failures: list[str] = []
    bash = shutil.which("bash")
    if not bash:
        return ["theme.json self-test needs bash on PATH (Git Bash on Windows)"]
    FRAMEWORK = b'{"version": 3, "settings": {"typography": {"fontFamilies": [{"slug": "heading", "fontFamily": "Inter"}]}}}\n'
    SNAPSHOT = b'{"version": 3, "settings": {"typography": {"fontFamilies": [{"slug": "heading", "fontFamily": "\\"Playfair Display\\", serif"}]}}}\n'

    def md5(b: bytes | None) -> str | None:
        return hashlib.md5(b).hexdigest() if b is not None else None

    with tempfile.TemporaryDirectory(prefix="sgs-deploy-themejson-") as td:
        base = Path(td)
        repo = base / "repo"
        (repo / "theme" / "sgs-theme").mkdir(parents=True)
        (repo / FRAMEWORK_THEME_JSON_REL).write_bytes(FRAMEWORK)
        (repo / "theme" / "sgs-theme" / "style.css").write_text("/* Theme Name: SGS */\n", encoding="utf-8")
        (repo / "sites" / "acme").mkdir(parents=True)
        (repo / SNAPSHOT_REL.format(client="acme")).write_bytes(SNAPSHOT)

        def simulate(target: dict, use_payload: bool = True, drop_payload: bool = False) -> tuple[int, bytes | None]:
            """Package + extract exactly as a real theme deploy does; return (rc, live theme.json)."""
            server = base / f"server-{os.urandom(4).hex()}"
            live = server / "wp-content" / "themes" / "sgs-theme"
            live.mkdir(parents=True)
            live.joinpath("theme.json").write_bytes(SNAPSHOT if target.get("client") else FRAMEWORK)
            payload, _label = resolve_theme_json_payload(target, root=repo)
            if payload is None:
                return 99, live.joinpath("theme.json").read_bytes()
            stage = repo / THEME_JSON_PAYLOAD_NAME
            if use_payload:
                stage.write_bytes(payload)
            tar = subprocess.run(build_tar_cmd(True, False, use_payload and not drop_payload),
                                 cwd=repo, capture_output=True, text=True)
            stage.unlink(missing_ok=True)
            if tar.returncode != 0:
                return 98, None
            shutil.move(str(repo / TARBALL_NAME), str(server / TARBALL_NAME))
            cmd = build_remote_extract_cmd("wp-content", True, False, use_payload)
            rc = subprocess.run([bash, "-c", cmd], cwd=server, capture_output=True, text=True).returncode
            f = live.joinpath("theme.json")
            return rc, (f.read_bytes() if f.exists() else None)

        client_target = {"client": "acme"}
        plain_target = {"client": None}

        # 8. NEGATIVE CONTROL — the pre-fix deploy (no payload) DOES lose the snapshot. Without
        #    this, case 9 could pass on a simulation that never overwrote anything.
        rc, live = simulate(client_target, use_payload=False)
        if rc != 0 or live != FRAMEWORK:
            failures.append(f"NEGATIVE CONTROL: the pre-fix deploy did not reproduce the loss "
                            f"(rc={rc}, live={live!r}) - the simulation cannot detect the bug")
        # 9. A theme deploy on a target WITH a client ends with the client snapshot live.
        rc, live = simulate(client_target)
        if rc != 0 or live != SNAPSHOT:
            failures.append(f"client target: live theme.json is not the snapshot after deploy "
                            f"(rc={rc}, live={live!r})")
        # 10. A target with NO client keeps the framework default.
        rc, live = simulate(plain_target)
        if rc != 0 or live != FRAMEWORK:
            failures.append(f"no-client target: live theme.json is not the framework default "
                            f"(rc={rc}, live={live!r})")
        # 11. A payload missing from the tarball FAILS the extract, and the live theme (the
        #     client's snapshot) is left untouched — never swapped for the default.
        rc, live = simulate(client_target, drop_payload=True)
        if rc == 0:
            failures.append("missing payload: the remote extract exited 0 - a failed re-apply passed green")
        if live != SNAPSHOT:
            failures.append(f"missing payload: the live theme was swapped anyway (live={live!r})")
        # 12. A named client with no snapshot file fails closed (no framework fallback).
        payload, why = resolve_theme_json_payload({"client": "ghost"}, root=repo)
        if payload is not None:
            failures.append("missing snapshot: resolve fell back to a payload instead of failing closed")
        # 13. An unparseable snapshot fails closed.
        (repo / "sites" / "broken").mkdir()
        (repo / SNAPSHOT_REL.format(client="broken")).write_bytes(b"{not json")
        payload, why = resolve_theme_json_payload({"client": "broken"}, root=repo)
        if payload is not None:
            failures.append("broken snapshot: resolve returned a payload instead of failing closed")
        # 14. Guard decisions, including the one abort case.
        fw, sn, wc = md5(FRAMEWORK), md5(SNAPSHOT), md5(b"working-copy")
        cases = [
            ((sn, sn, sn), "unchanged"),
            ((fw, sn, sn), "replace"),            # live is the default a past deploy left
            ((None, sn, None), "replace"),        # no theme.json yet
            ((wc, sn, wc), "abort-uncommitted"),  # an uncommitted pushed snapshot is live
            ((fw, sn, wc), "replace"),            # WIP snapshot never pushed: not a reason to block
        ]
        for args_, want in cases:
            got = theme_json_guard_decision(*args_)
            if got != want:
                failures.append(f"guard{args_} -> {got}, expected {want}")
        # 14b. A working copy differing only in line endings holds no uncommitted snapshot; a real edit does.
        if uncommitted_snapshot_md5(SNAPSHOT.replace(b"\n", b"\r\n"), SNAPSHOT) is not None:
            failures.append("guard: a CRLF-only working copy was treated as an uncommitted snapshot")
        if uncommitted_snapshot_md5(SNAPSHOT + b" ", SNAPSHOT) is None:
            failures.append("guard: an edited working copy was not treated as an uncommitted snapshot")
        # 15. Post-deploy verify: mismatch and unreadable both FAIL.
        if theme_json_verify_result(sn, fw) or theme_json_verify_result(sn, None):
            failures.append("verify: a live theme.json that is not the payload passed")
        if not theme_json_verify_result(sn, sn):
            failures.append("verify: a matching live theme.json failed (positive control)")
    # 16. DATA: every real target that names a client has a real, preparable snapshot.
    for key, tgt in TARGETS.items():
        if "client" not in tgt:
            failures.append(f"TARGETS['{key}'] has no 'client' key (use None for the framework default)")
            continue
        payload, why = resolve_theme_json_payload(tgt)
        if payload is None:
            failures.append(f"TARGETS['{key}']: {why}")
    return failures


def self_test() -> int:
    """Prove the payload-scoped dirty gate REJECTS the unsafe case, not just the happy path.

    A gate that cannot fail reads green forever. This builds an ISOLATED temp git repo — never the real
    working tree — with two dirty files under a deploy root: one declared as the
    wave's own ``--payload``, one left undeclared (standing in for "another
    track's unrelated modified files").

    Asserts, in order:
      0. The negative control actually LANDED (``git diff --stat`` shows both
         files changed) before trusting any gate output — a write that silently
         no-ops must not read as a pass.
      1. ``deployed_dirty_files()`` detects both dirty files.
      2. POSITIVE CONTROL — declaring the payload file via ``--payload`` removes
         it from ``uncovered`` (this is the deadlock-breaker actually working).
      3. NEGATIVE CONTROL / KNOWN FAILURE — the undeclared file STAYS in
         ``uncovered`` even though a payload was declared (declaring a payload
         does not weaken the guard).
      4. NO PAYLOAD — with NO ``--payload`` at all, both files are uncovered.
    """
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sgs-deploy-selftest-") as td:
        repo = Path(td)

        def git(*a: str) -> None:
            subprocess.run(["git", *a], cwd=repo, check=True, capture_output=True, text=True)

        git("init", "-q")
        git("config", "user.email", "selftest@example.invalid")
        git("config", "user.name", "sgs-deploy-selftest")

        payload_dir = repo / "plugins" / "sgs-blocks" / "includes"
        payload_dir.mkdir(parents=True)
        payload_file = payload_dir / "payload-target.php"
        unrelated_file = payload_dir / "unrelated-inflight.php"
        payload_file.write_text("<?php // v1\n", encoding="utf-8")
        unrelated_file.write_text("<?php // v1\n", encoding="utf-8")
        # A THEME file, for the scope cases (5-7): another track's template.
        theme_dir = repo / "theme" / "sgs-theme" / "templates"
        theme_dir.mkdir(parents=True)
        theme_file = theme_dir / "archive.html"
        theme_file.write_text("<!-- v1 -->", encoding="utf-8")
        git("add", "-A")
        git("commit", "-q", "-m", "initial")

        # Modify BOTH — this wave's own payload AND another track's unfinished edit.
        payload_file.write_text("<?php // v2 -- this wave's declared payload\n", encoding="utf-8")
        unrelated_file.write_text("<?php // v2 -- someone else's unfinished edit\n", encoding="utf-8")

        theme_file.write_text("<!-- v2 another track -->", encoding="utf-8")

        # 0. Confirm the plant actually landed. `sed`/write-with-no-effect exits 0
        # on a no-op; check the diff itself, not the write command's return code.
        diffstat = subprocess.run(
            ["git", "diff", "--stat"], cwd=repo, check=False, capture_output=True, text=True,
        ).stdout
        if (
            "payload-target.php" not in diffstat
            or "unrelated-inflight.php" not in diffstat
            or "archive.html" not in diffstat
        ):
            print("[SELF-TEST FAIL] negative control did not land — git diff --stat:")
            print(diffstat)
            return 1

        dirty = deployed_dirty_files(repo_root=repo)
        rel_payload = "plugins/sgs-blocks/includes/payload-target.php"
        rel_unrelated = "plugins/sgs-blocks/includes/unrelated-inflight.php"

        # 1. Both dirty files detected.
        if rel_payload not in dirty or rel_unrelated not in dirty:
            failures.append(f"deployed_dirty_files() did not detect both dirty files: {dirty}")

        # 2. POSITIVE CONTROL: declared payload is covered -> not blocking.
        covered, uncovered = split_dirty_by_payload(
            dirty, ["plugins/sgs-blocks/includes/payload-target.php"]
        )
        if rel_payload not in covered:
            failures.append(
                f"POSITIVE CONTROL FAILED: declared --payload file was not covered "
                f"(deadlock-breaker inert): covered={covered}"
            )

        # 3. NEGATIVE CONTROL / KNOWN FAILURE PROBE: undeclared file must still block.
        if rel_unrelated not in uncovered:
            failures.append(
                f"NEGATIVE CONTROL FAILED: an undeclared dirty file was NOT blocked "
                f"-- this would weaken D336's protection: uncovered={uncovered}"
            )

        # 4. NO PAYLOAD: no --payload at all -> everything blocks.
        covered_none, uncovered_none = split_dirty_by_payload(dirty, [])
        if covered_none:
            failures.append(
                f"BACKWARD-COMPAT FAILED: with no --payload, files were covered anyway: {covered_none}"
            )
        if set(uncovered_none) != set(dirty):
            failures.append(
                f"BACKWARD-COMPAT FAILED: with no --payload, not everything blocked: "
                f"uncovered={uncovered_none} dirty={dirty}"
            )

        # 5. SCOPE: a --blocks-only run must NOT be blocked by a dirty THEME
        #    file — that run cannot write one, so it is not a risk it creates.
        blocks_scope = deploy_roots_for_scope(theme_only=False, blocks_only=True)
        dirty_blocks_only = deployed_dirty_files(repo_root=repo, roots=blocks_scope)
        rel_theme = "theme/sgs-theme/templates/archive.html"
        if rel_theme in dirty_blocks_only:
            failures.append(
                "SCOPE FAILED: a dirty THEME file still blocked a --blocks-only "
                f"deploy, which cannot ship it: {dirty_blocks_only}"
            )

        # 6. NEGATIVE CONTROL for case 5 — scoping must NARROW, not DISABLE. An
        #    in-scope dirty file MUST still block, or the guard has been switched
        #    off and would read green forever.
        if rel_unrelated not in dirty_blocks_only:
            failures.append(
                "SCOPE NEGATIVE CONTROL FAILED: an in-scope dirty file was NOT "
                "detected under --blocks-only -- the scoping disabled the guard "
                f"rather than narrowing it: {dirty_blocks_only}"
            )

        # 7. The narrowing is CONDITIONAL: a FULL deploy still sees the theme
        #    file. Without this, case 5 would also pass if the theme root had
        #    simply been dropped from DEPLOY_ROOTS outright.
        dirty_full = deployed_dirty_files(repo_root=repo, roots=DEPLOY_ROOTS)
        if rel_theme not in dirty_full:
            failures.append(
                "SCOPE FAILED: a FULL deploy did not see the dirty theme file -- "
                f"the theme root is being dropped unconditionally: {dirty_full}"
            )

    failures.extend(self_test_theme_json())
    failures.extend(deploy_cache.self_test())
    failures.extend(deploy_multi.self_test())

    if failures:
        print("[SELF-TEST FAIL]")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("[SELF-TEST PASS]")
    print("  0. negative control confirmed landed via git diff --stat before trusting the gate")
    print("  1. deployed_dirty_files() detects dirty files in an isolated repo")
    print("  2. POSITIVE CONTROL: declared --payload file is covered (deadlock-breaker works)")
    print("  3. NEGATIVE CONTROL (known failure probe): undeclared dirty file stays blocked (D336 intact)")
    print("  4. BACKWARD COMPAT: no --payload => identical to pre-existing all-blocking behaviour")
    print("  5. SCOPE: a dirty THEME file does not block --blocks-only (it cannot ship it)")
    print("  6. SCOPE NEGATIVE CONTROL: an in-scope dirty file STILL blocks --blocks-only")
    print("  7. SCOPE is CONDITIONAL: a full deploy still sees the dirty theme file")
    print("  8. NEGATIVE CONTROL: the pre-fix theme deploy DOES replace a client snapshot with the default")
    print("  9. a theme deploy on a target WITH a client ends with the client snapshot live")
    print(" 10. a target with NO client keeps the framework default theme.json")
    print(" 11. a payload missing from the tarball FAILS the extract and leaves the live theme untouched")
    print(" 12. a named client with no snapshot fails closed (no framework fallback)")
    print(" 13. an unparseable snapshot fails closed")
    print(" 14. pre-upload guard: aborts only when an UNCOMMITTED pushed snapshot is live")
    print(" 15. post-deploy verify: a live theme.json that is not the payload FAILS")
    print(" 16. every real TARGETS entry names a client whose snapshot prepares")
    print(" 17. deploy_cache: the key follows the tree and the DB, non-isolated runs get none, "
          "a pass restores build/ and its generated files, the packaging lock has one holder")
    print(" 18. deploy_multi: `all` and comma lists resolve canary-first, unknown names are "
          "refused, each child gets only its own --target")
    return 0
