#!/usr/bin/env python3
"""deploy_selftest.py - build-deploy.py --self-test: each case proves a deploy guard rejects its unsafe case,
against temp repos and a temp server folder, never the real tree or a site.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
import deploy_cache
import deploy_delta
import deploy_media_guard
import deploy_multi
import deploy_qa_tier
import deploy_timing
import deploy_verify

from deploy_common import DEPLOY_ROOTS, FRAMEWORK_THEME_JSON_REL, FULL_PACKAGE_NAME, REPO_ROOT, SNAPSHOT_REL, TARBALL_NAME, TARGETS
from deploy_guards import deploy_roots_for_scope, deployed_dirty_files, resolve_theme_json_payload, split_dirty_by_payload, theme_json_guard_decision, uncommitted_snapshot_md5
from deploy_ship import SHIP_APPLY_FAILED, SHIP_UPLOAD_FAILED, step_ship, upload_resumable, vendor_shell
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

        roots = deploy_delta.roots_for(theme=True, blocks=False)

        def simulate(target: dict, use_payload: bool = True, ship_framework: bool = False) -> tuple[int, bytes | None]:
            """Collect, package and apply exactly as a real full theme deploy does; return (rc, live theme.json).

            ship_framework swaps the framework theme.json into the package after it was written, standing in for
            any way the client's file could fail to reach the staged tree."""
            server = base / f"server-{os.urandom(4).hex()}"
            live = server / "wp-content" / "themes" / "sgs-theme"
            live.mkdir(parents=True)
            live.joinpath("theme.json").write_bytes(SNAPSHOT if target.get("client") else FRAMEWORK)
            payload, _label = resolve_theme_json_payload(target, root=repo)
            if payload is None:
                return 99, live.joinpath("theme.json").read_bytes()
            entries = deploy_delta.collect_payload(repo, theme=True, blocks=False,
                                                   theme_json_payload=payload if use_payload else None)
            plan = deploy_delta.Plan("full", list(entries), [], "self-test", 0, 0)
            pkg = server / "pkg.tgz"
            deploy_delta.write_package(pkg, entries, plan, roots)
            if ship_framework:
                import tarfile
                with tarfile.open(pkg, "r:gz") as t:
                    members = [(m, t.extractfile(m).read()) for m in t.getmembers()]
                with tarfile.open(pkg, "w:gz") as t:
                    for m, data in members:
                        info = tarfile.TarInfo(m.name)
                        data = FRAMEWORK if m.name == deploy_delta.THEME_JSON else data
                        info.size = len(data)
                        t.addfile(info, io.BytesIO(data))
            cmd = deploy_delta.build_remote_apply_cmd("wp-content", roots, "full", "pkg.tgz", "stage")
            rc = subprocess.run([bash, "-c", cmd], cwd=server, capture_output=True, text=True).returncode
            f = live.joinpath("theme.json")
            return rc, (f.read_bytes() if f.exists() else None)

        client_target = {"client": "acme"}
        plain_target = {"client": None}

        # 8. The pre-fix deploy (a theme package without the target's theme.json) can no longer be built: the
        #    collector refuses it. Case 11 is the negative control that the simulation can see a lost snapshot.
        try:
            simulate(client_target, use_payload=False)
            failures.append("a theme package without the target's theme.json was built (the framework one would ship)")
        except deploy_delta.PayloadError:
            pass
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
        # 11. A staged theme.json that is not the client's FAILS the apply's check, and the live theme (the
        #     client's snapshot) is left untouched — never swapped for the default.
        rc, live = simulate(client_target, ship_framework=True)
        if rc == 0:
            failures.append("framework theme.json staged: the remote apply exited 0 - a lost client theme.json passed green")
        if live != SNAPSHOT:
            failures.append(f"framework theme.json staged: the live theme was swapped anyway (live={live!r})")
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
        # 13b. A target's own "snapshot" wins over its client's: two sites of one client ship
        # different theme.json files (eye-care-test against the re-extracted clone snapshot).
        own = SNAPSHOT.replace(b'"version"', b'"_own":1,"version"', 1)
        (repo / "sites" / "acme" / "theme-snapshot-site-b.json").write_bytes(own)
        payload, why = resolve_theme_json_payload(
            {"client": "acme", "snapshot": "sites/acme/theme-snapshot-site-b.json"}, root=repo)
        if payload is None or b'"_own"' not in payload:
            failures.append(f"own snapshot: the target's own snapshot was not shipped ({why})")
        payload, why = resolve_theme_json_payload({"client": "acme"}, root=repo)
        if payload is None or b'"_own"' in payload:
            failures.append("own snapshot: a target without one shipped another target's snapshot")
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


def self_test_timing() -> list[str]:
    """Self-test case 19: stage timings, the summary table and the history file (no deploy, no network).

    Every check takes the implementation as an argument and runs twice: against the real
    deploy_timing function (must find nothing wrong) and against a planted faulty copy (must
    find something), so a check that cannot fail is reported as a failure.
    """
    failures: list[str] = []
    sample = {"build": 30.0, "scp": 5.0, "gate-full": 60.0, "verify": 4.0}

    def check_summary(fmt) -> list[str]:
        rows = [(m.group(1).strip(), float(m.group(2)), float(m.group(3)))
                for m in (re.match(r"\[time\] (.+?)\s+(\d+\.\d)\s+(\d+\.\d)%$", ln)
                          for ln in fmt(sample, 99.0).splitlines()) if m and m.group(1).strip() != "TOTAL"]
        problems = []
        if [r[0] for r in rows] != ["gate-full", "build", "scp", "verify"][:len(rows)] or len(rows) < 4:
            problems.append(f"order is not slowest first: {[r[0] for r in rows]}")
        if not 99.0 <= sum(r[2] for r in rows) <= 101.0:
            problems.append(f"percentages sum to {sum(r[2] for r in rows)}, not about 100")
        return problems

    def faulty_fmt(stages, total=None):
        """Same table, but the stage rows come out fastest first."""
        lines = deploy_timing.format_summary(stages, total).splitlines()
        return "\n".join(lines[:2] + lines[2:-1][::-1] + lines[-1:])

    def check_raise(stage_cm) -> list[str]:
        rec: dict[str, float] = {}
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                with stage_cm("boom", recorder=rec):
                    raise ValueError("planted")
        except ValueError:
            return [] if "boom" in rec else ["a stage that raised recorded no time"]
        return ["a stage that raised did not re-raise"]

    @contextlib.contextmanager
    def faulty_stage(name, *, recorder=None):
        yield  # records nothing when the block raises
        deploy_timing.record(name, 0.0, recorder=recorder)

    def entry_of(build) -> dict:
        return build(commit="abc1234", target="t", scope="both", total_s=12.34, stages={"build": 1.26}, dry_run=False)

    def check_entry(build) -> list[str]:
        try:
            data = json.loads(json.dumps(entry_of(build)))
        except (TypeError, ValueError) as exc:
            return [f"history entry is not valid JSON: {exc}"]
        want = {"when", "commit", "target", "scope", "total_s", "stages", "dry_run"}
        return [] if set(data) == want and isinstance(data["stages"], dict) else [f"keys are {sorted(data)}"]

    def faulty_entry(**kw):
        out = deploy_timing.build_entry(**kw)
        out.pop("scope")
        return out

    def run_append(append, entry: dict, path: Path) -> tuple[bool, str]:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            try:
                append(entry, path)
            except Exception as exc:  # noqa: BLE001
                return False, f"raised {type(exc).__name__}"
        return True, buf.getvalue()

    def check_unwritable(append, tmp: Path) -> list[str]:
        ok, out = run_append(append, entry_of(deploy_timing.build_entry), tmp)  # a directory cannot be opened for append
        if not ok:
            return [f"an unwritable history path {out}"]
        return [] if out.count("\n") == 1 and "could not write" in out else [f"expected one log line, got {out!r}"]

    def faulty_append_raises(entry, path=None):
        with open(path, "a", encoding="utf-8") as fh:  # no try/except
            fh.write(json.dumps(entry) + "\n")

    def check_dry(append, tmp: Path) -> list[str]:
        dry = dict(entry_of(deploy_timing.build_entry), dry_run=True)
        run_append(append, dry, tmp)
        wrote_dry = tmp.exists() and tmp.read_text(encoding="utf-8") != ""
        run_append(append, entry_of(deploy_timing.build_entry), tmp)
        lines = tmp.read_text(encoding="utf-8").splitlines() if tmp.exists() else []
        problems = ["a dry run wrote a history line"] if wrote_dry else []
        if len(lines) != 1:
            problems.append(f"a real run should leave exactly one line, found {len(lines)}")
        return problems

    def faulty_append_always(entry, path=None):
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")

    def check_short_commit(fn) -> list[str]:
        """fn(repo) must read that repo's HEAD even when the process sits in another repo."""
        with tempfile.TemporaryDirectory(prefix="sgs-deploy-timing-repo-") as td:
            repo = deploy_qa_tier.make_temp_repo(Path(td) / "repo", {"a.txt": "1\n"})
            want = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=repo, capture_output=True, text=True, check=True).stdout.strip()
            here = os.getcwd()
            os.chdir(REPO_ROOT)
            try:
                got = fn(repo)
            finally:
                os.chdir(here)
        return [] if got == want else [f"read {got!r}, the given directory's HEAD is {want!r}"]

    def faulty_short_commit(repo: Path) -> str:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=False)
        return out.stdout.strip() or "unknown"  # the process cwd, not the given directory

    with tempfile.TemporaryDirectory(prefix="sgs-deploy-timing-") as td:
        base = Path(td)
        cases = [
            ("short_commit reads the given directory's HEAD, not the process cwd", check_short_commit(deploy_timing.short_commit),
             check_short_commit(faulty_short_commit)),
            ("summary slowest first, percentages about 100", check_summary(deploy_timing.format_summary), check_summary(faulty_fmt)),
            ("a raising stage records its time and re-raises", check_raise(deploy_timing.stage), check_raise(faulty_stage)),
            ("history line is valid JSON with the documented keys", check_entry(deploy_timing.build_entry), check_entry(faulty_entry)),
            ("an unwritable history path logs once and never raises", check_unwritable(deploy_timing.append_history, base),
             check_unwritable(faulty_append_raises, base)),
            ("a dry run writes nothing", check_dry(deploy_timing.append_history, base / "dry-real.jsonl"),
             check_dry(faulty_append_always, base / "dry-fault.jsonl")),
        ]
    for label, real_problems, planted_problems in cases:
        print(f"  [timing case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
              f"planted fault={'RED' if planted_problems else 'GREEN (check is vacuous)'}"
              + (f" ({planted_problems[0]})" if planted_problems else ""))
        failures.extend(f"timing: {label}: {p}" for p in real_problems)
        if not planted_problems:
            failures.append(f"timing NEGATIVE CONTROL: {label}: the planted fault was not detected, so the check cannot fail")
    return failures


def self_test_litespeed_probe() -> list[str]:
    """The LiteSpeed probe warns for each option that is on and stays silent when both are off or missing."""
    from deploy_litespeed_probe import litespeed_warnings

    failures: list[str] = []
    both = litespeed_warnings({"litespeed.conf.media-lazy": "1", "litespeed.conf.img_optm-webp": "1"})
    if len(both) != 2:
        failures.append(f"litespeed probe: expected 2 warnings with both on, got {both}")
    one = litespeed_warnings({"litespeed.conf.media-lazy": "1", "litespeed.conf.img_optm-webp": "0"})
    if len(one) != 1 or "media-lazy" not in one[0]:
        failures.append(f"litespeed probe: expected the media-lazy warning only, got {one}")
    if litespeed_warnings({"litespeed.conf.media-lazy": "0", "litespeed.conf.img_optm-webp": ""}) or litespeed_warnings({}):
        failures.append("litespeed probe: warned with both options off or missing")
    return failures


def self_test_motion_qa_args() -> list[str]:
    """Self-test case 20: the motion-QA tier and parallel flags reach `npm run qa:motion` only when set (no deploy, no network).

    Each check runs against the real `step_motion_qa` and against a planted faulty one (must find something).
    """
    failures: list[str] = []
    base = ["npm", "run", "qa:motion"]

    def captured(step, *args) -> list[list[str]]:
        """Run `step` with deploy_verify.run replaced by a recorder, so no npm process ever starts."""
        seen: list[list[str]] = []
        original, saved_env = deploy_verify.run, os.environ.get("SGS_MOTION_QA_FULL_FILE")
        deploy_deadend = tempfile.mkdtemp(prefix="sgs-qa-record-")  # a full run records its pass: keep that off the real file
        os.environ["SGS_MOTION_QA_FULL_FILE"] = str(Path(deploy_deadend) / "record.json")
        deploy_verify.run = lambda cmd, **kw: seen.append(list(cmd)) or 0
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                step(False, *args)
        finally:
            deploy_verify.run = original
            shutil.rmtree(deploy_deadend, ignore_errors=True)
            if saved_env is None:
                os.environ.pop("SGS_MOTION_QA_FULL_FILE", None)
            else:
                os.environ["SGS_MOTION_QA_FULL_FILE"] = saved_env
        return [[("npm" if c in ("npm", "npm.cmd") else c) for c in cmd] for cmd in seen]

    def check_default(step) -> list[str]:
        got = captured(step)
        return [] if got == [base] else [f"default command is {got}, not {[base]}"]

    def check_flags(step) -> list[str]:
        got = captured(step, "smoke", 3)
        want = [base + ["--", "--tier", "smoke", "--parallel", "3"]]
        return [] if got == want else [f"flagged command is {got}, not {want}"]

    def check_one_flag(step) -> list[str]:
        got = captured(step, "full", 4)
        want = [base + ["--", "--parallel", "4"]]
        return [] if got == want else [f"a parallel-only command is {got}, not {want}"]

    def check_dry(step) -> list[str]:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            step(True, "smoke", 3)
        text = buf.getvalue()
        return [] if "qa:motion -- --tier smoke --parallel 3" in text else [f"dry run did not log the command: {text!r}"]

    def faulty_step(dry_run, tier="full", parallel=1):
        """Always appends both arguments, even at the defaults."""
        return deploy_verify.run(base + ["--", "--tier", tier, "--parallel", str(parallel)], dry_run=False) if not dry_run else 0

    def faulty_dry(dry_run, tier="full", parallel=1):
        """Dry run logs nothing about the command."""
        if dry_run:
            return 0
        return deploy_verify.step_motion_qa(False, tier, parallel)

    real = deploy_verify.step_motion_qa
    cases = [
        ("defaults leave the npm command line unchanged", check_default(real), check_default(faulty_step)),
        ("--tier smoke --parallel 3 adds exactly those arguments after --", check_flags(real), check_flags(lambda d, t="full", p=1: deploy_verify.step_motion_qa(d, "full", p))),
        ("a parallel-only change adds only --parallel", check_one_flag(real), check_one_flag(faulty_step)),
        ("a dry run logs the command it would run", check_dry(real), check_dry(faulty_dry)),
    ]
    for label, real_problems, planted_problems in cases:
        print(f"  [motion-qa args case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
              f"planted fault={'RED' if planted_problems else 'GREEN (check is vacuous)'}"
              + (f" ({planted_problems[0]})" if planted_problems else ""))
        failures.extend(f"motion-qa args: {label}: {p}" for p in real_problems)
        if not planted_problems:
            failures.append(f"motion-qa args NEGATIVE CONTROL: {label}: the planted fault was not detected, so the check cannot fail")
    return failures


def self_test_page_weight() -> list[str]:
    """Self-test case 24: the live page-weight gate runs when asked or on a release run, builds its command, skips an
    unknown target and only logs on a dry run (no deploy, no network). Each check is proven red on a planted fault."""
    failures: list[str] = []

    def captured(step, *args) -> tuple[list[list[str]], str]:
        seen: list[list[str]] = []
        original = deploy_verify.run
        deploy_verify.run = lambda cmd, **kw: seen.append([Path(c).name if i < 2 else c for i, c in enumerate(cmd)]) or 0
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                step(*args)
        finally:
            deploy_verify.run = original
        return seen, buf.getvalue()

    node = "node.exe" if os.name == "nt" else "node"
    want = [[node, "check-page-weight.mjs", "--site", "sandybrown", "--check"]]

    def check_wanted(fn) -> list[str]:
        got = [fn(False, "none"), fn(True, "none"), fn(False, "full"), fn(False, "smoke")]
        return [] if got == [False, True, True, False] else [f"wanted() gave {got}, not [False, True, True, False]"]

    def check_cmd(step) -> list[str]:
        got, _ = captured(step, False, "sandybrown")
        return [] if got == want else [f"command is {got}, not {want}"]

    def check_unknown(step) -> list[str]:
        got, text = captured(step, False, "no-such-target")
        return [] if not got and "SKIPPED" in text else [f"an unknown target ran {got} / logged {text!r}"]

    def check_dry(step) -> list[str]:
        got, text = captured(step, True, "sandybrown")
        return [] if not got and "check-page-weight.mjs --site sandybrown --check" in text else [f"dry run ran {got} / logged {text!r}"]

    real_step, real_wanted = deploy_verify.step_page_weight, deploy_verify.page_weight_wanted
    cases = [
        ("runs on --page-weight or --motion-qa-tier full only", check_wanted(real_wanted), check_wanted(lambda f, t: bool(f))),
        ("the command names the target and --check", check_cmd(real_step),
         check_cmd(lambda d, t: deploy_verify.run(["node", "check-page-weight.mjs", "--site", t], dry_run=False))),
        ("a target with no data entry is skipped", check_unknown(real_step),
         check_unknown(lambda d, t: deploy_verify.run(["node", "check-page-weight.mjs", "--site", t, "--check"], dry_run=False))),
        ("a dry run logs the command and runs nothing", check_dry(real_step), check_dry(lambda d, t: deploy_verify.step_page_weight(False, t))),
    ]
    for label, real_problems, planted_problems in cases:
        print(f"  [page-weight case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
              f"planted fault={'RED' if planted_problems else 'GREEN (check is vacuous)'}")
        failures.extend(f"page-weight: {label}: {p}" for p in real_problems)
        if not planted_problems:
            failures.append(f"page-weight NEGATIVE CONTROL: {label}: the planted fault was not detected, so the check cannot fail")
    return failures


def self_test_upload_resume() -> list[str]:
    """Self-test case 21: the tarball upload resumes after a dropped connection (no network).

    A fake server tracks how many bytes of the upload it holds. Each check runs against the real `upload_resumable`
    and against a planted faulty one (must find something).
    """
    failures: list[str] = []
    total = 1000

    def attempt(impl, script, sizes=None, attempts=4, dry_run=False):
        """Run `impl` against a scripted server. `script` is one (exit code, bytes held after) per transfer;
        `sizes` is what the remote reports before each retry (default: the bytes held after the last transfer)."""
        with tempfile.TemporaryDirectory(prefix="sgs-upload-selftest-") as td:
            local = Path(td) / "pack.tar"
            local.write_bytes(b"x" * total)
            state = {"held": None, "verbs": [], "sleeps": 0, "size_calls": 0}
            steps = list(script)

            def runner(cmd, *, dry_run, cwd=None):
                batch = Path(cmd[cmd.index("-b") + 1])
                state["verbs"].append(batch.read_text(encoding="utf-8").split()[0])
                if dry_run or not steps:
                    return 0
                rc, held = steps.pop(0)
                state["held"] = held
                return rc

            def remote_size(use_alias, remote):
                state["size_calls"] += 1
                return state["held"]

            def sleep(_seconds):
                state["sleeps"] += 1

            with contextlib.redirect_stdout(io.StringIO()):
                rc = impl(True, str(local), "pack.tar", dry_run, runner=runner, remote_size=remote_size,
                          attempts=attempts, pause=0, sleep=sleep)
            state["rc"] = rc
            return state

    def faulty_always_put(use_alias, local, remote, dry_run, *, runner, remote_size, attempts, pause, sleep):
        """Restarts from byte zero on every retry."""
        rc = 1
        for _ in range(attempts):
            batch = Path(tempfile.mkdtemp(prefix="sgs-upload-fault-")) / "b"
            batch.write_text(f'put "{local}" "{remote}"\n', encoding="utf-8")
            rc = runner(["sftp", "-b", str(batch), "hd"], dry_run=dry_run)
            if rc == 0:
                return 0
        return rc

    def faulty_trust_exit_code(use_alias, local, remote, dry_run, *, runner, remote_size, attempts, pause, sleep):
        """Believes a zero exit code without checking the remote size."""
        batch = Path(tempfile.mkdtemp(prefix="sgs-upload-fault-")) / "b"
        batch.write_text(f'put "{local}" "{remote}"\n', encoding="utf-8")
        return runner(["sftp", "-b", str(batch), "hd"], dry_run=dry_run)

    def faulty_no_limit(use_alias, local, remote, dry_run, *, runner, remote_size, attempts, pause, sleep):
        """Reports success after the attempts run out."""
        upload_resumable(use_alias, local, remote, dry_run, runner=runner, remote_size=remote_size,
                         attempts=attempts, pause=pause, sleep=sleep)
        return 0

    def faulty_reput_any(use_alias, local, remote, dry_run, *, runner, remote_size, attempts, pause, sleep):
        """Resumes with reput whenever the host holds any bytes, even more than the local file has."""
        rc = 1
        for n in range(attempts):
            verb = "put" if n == 0 else ("reput" if remote_size(use_alias, remote) else "put")
            batch = Path(tempfile.mkdtemp(prefix="sgs-upload-fault-")) / "b"
            batch.write_text(f'{verb} "{local}" "{remote}"\n', encoding="utf-8")
            rc = runner(["sftp", "-b", str(batch), "hd"], dry_run=dry_run)
            if rc == 0:
                return 0
        return rc

    def check_stale_larger_file(impl) -> list[str]:
        got = attempt(impl, [(1, total + 500), (0, total)])
        return [] if got["rc"] == 0 and got["verbs"] == ["put", "put"] else [f"a remote file larger than the local one gave verbs={got['verbs']}, not put then put (reput would append past the end)"]

    def check_first_try(impl) -> list[str]:
        got = attempt(impl, [(0, total)])
        return [] if got["rc"] == 0 and got["verbs"] == ["put"] else [f"first try gave rc={got['rc']} verbs={got['verbs']}"]

    def check_resume(impl) -> list[str]:
        got = attempt(impl, [(1, 300), (0, total)])
        return [] if got["rc"] == 0 and got["verbs"] == ["put", "reput"] else [f"a drop with 300 bytes held gave rc={got['rc']} verbs={got['verbs']}, not put then reput"]

    def check_drop_before_file(impl) -> list[str]:
        got = attempt(impl, [(1, None), (0, total)])
        return [] if got["rc"] == 0 and got["verbs"] == ["put", "put"] else [f"a drop before any file existed gave verbs={got['verbs']}, not put then put"]

    def check_short_file(impl) -> list[str]:
        got = attempt(impl, [(0, 400), (0, total)])
        return [] if got["rc"] == 0 and len(got["verbs"]) == 2 else [f"a zero exit with 400 of {total} bytes held was accepted (verbs={got['verbs']})"]

    def check_gives_up(impl) -> list[str]:
        got = attempt(impl, [(1, 100)] * 3, attempts=3)
        return [] if got["rc"] != 0 and len(got["verbs"]) == 3 else [f"three failed attempts gave rc={got['rc']} after {len(got['verbs'])} transfers"]

    def check_dry(impl) -> list[str]:
        got = attempt(impl, [], dry_run=True)
        return [] if got["rc"] == 0 and got["verbs"] == ["put"] and got["size_calls"] == 0 else [f"dry run gave rc={got['rc']} verbs={got['verbs']} size_calls={got['size_calls']}"]

    real = upload_resumable
    cases = [
        ("a clean upload is one put", check_first_try(real), check_first_try(lambda *a, **k: 0)),
        ("a drop with a partial file resumes with reput", check_resume(real), check_resume(faulty_always_put)),
        ("a leftover remote file larger than the local one is overwritten with put, never resumed", check_stale_larger_file(real), check_stale_larger_file(faulty_reput_any)),
        ("a drop before any file exists starts again with put",check_drop_before_file(real), check_drop_before_file(lambda *a, **k: 1)),
        ("a zero exit with a short remote file is not accepted", check_short_file(real), check_short_file(faulty_trust_exit_code)),
        ("the attempts run out with a failing exit code", check_gives_up(real), check_gives_up(faulty_no_limit)),
        ("a dry run makes one call and no remote check", check_dry(real), check_dry(lambda *a, **k: 1)),
    ]
    for label, real_problems, planted_problems in cases:
        print(f"  [upload resume case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
              f"planted fault={'RED' if planted_problems else 'GREEN (check is vacuous)'}"
              + (f" ({planted_problems[0]})" if planted_problems else ""))
        failures.extend(f"upload resume: {label}: {p}" for p in real_problems)
        if not planted_problems:
            failures.append(f"upload resume NEGATIVE CONTROL: {label}: the planted fault was not detected, so the check cannot fail")
    return failures


def self_test_ship() -> list[str]:
    """Self-test case 26: the real step_ship end to end against a temp server (no network).

    The SSH listing and the remote apply run in bash in the temp server folder; the upload goes through the real
    upload_resumable with a fake sftp that copies the package into that folder. Checks: a dropped connection
    mid-transfer resumes and the deploy completes (planted fault: a one-shot upload, as scp was); a delta whose staged
    tree fails its check swaps nothing and the full package then lands (the first apply must really have failed); a
    changed and a deleted file land in one delta apply.
    """
    import tarfile
    failures: list[str] = []
    bash = shutil.which("bash")
    if not bash:
        return ["ship self-test needs bash on PATH (Git Bash on Windows)"]
    roots = deploy_delta.roots_for(theme=True, blocks=False)
    with tempfile.TemporaryDirectory(prefix="sgs-ship-selftest-") as td:
        base = Path(td)
        repo = base / "repo"
        (repo / "theme" / "sgs-theme" / "parts").mkdir(parents=True)
        for rel, data in {"theme.json": b'{"v":1}\n', "style.css": b"/* SGS */\n", "parts/header.html": b"<h/>\n",
                          "big.bin": os.urandom(4000)}.items():
            (repo / "theme" / "sgs-theme" / rel).write_bytes(data)
        payload = deploy_delta.collect_payload(repo, theme=True, blocks=False, theme_json_payload=b"{\"client\":1}\n")

        def server_with(tree: dict[str, bytes]) -> Path:
            srv = base / f"srv-{os.urandom(3).hex()}"
            (srv / "wp-content").mkdir(parents=True)
            for rel, data in tree.items():
                f = srv / "wp-content" / rel
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(data)
            return srv

        def live_tree(srv: Path) -> dict[str, bytes]:
            w = srv / "wp-content"
            # The live folder only: the rotation rightly leaves the previous copy in themes/.sgs-theme.bak.
            return {q.relative_to(w).as_posix(): q.read_bytes() for q in sorted((w / "themes" / "sgs-theme").rglob("*"))
                    if q.is_file()} if (w / "themes" / "sgs-theme").is_dir() else {}

        def batch_file(local: str, remote: str) -> str:
            f = Path(tempfile.mkdtemp(prefix="sgs-ship-batch-")) / "b"
            f.write_text(f'put "{local}" "{remote}"\n', encoding="utf-8")
            return str(f)

        def ship(srv: Path, *, drop_first: bool, resumable: bool, tamper_first_apply: bool = False,
                 first_apply_rc: int | None = None) -> tuple[int, dict]:
            state: dict = {"uploads": 0, "apply_rcs": []}

            def lister():
                done = subprocess.run([bash, "-c", deploy_delta.live_listing_cmd("wp-content", roots)], cwd=srv,
                                      capture_output=True)
                return deploy_delta.parse_live_listing(done.stdout, roots)

            def fake_sftp(cmd, *, dry_run, cwd=None):
                words = Path(cmd[cmd.index("-b") + 1]).read_text(encoding="utf-8").split()
                verb, local, remote = words[0], words[1].strip('"'), words[2].strip('"')
                data = (REPO_ROOT / local).read_bytes()
                dest = srv / remote
                state["uploads"] += 1
                if drop_first and state["uploads"] == 1:
                    dest.write_bytes(data[: len(data) // 2])
                    return 255
                if verb == "reput" and dest.exists():
                    dest.write_bytes(dest.read_bytes() + data[dest.stat().st_size:])
                else:
                    dest.write_bytes(data)
                return 0

            def remote_size(use_alias, remote):
                f = srv / remote
                return f.stat().st_size if f.exists() else None

            def uploader(use_alias, local, remote, dry_run):
                if resumable:
                    return upload_resumable(use_alias, local, remote, dry_run, runner=fake_sftp, remote_size=remote_size,
                                            attempts=4, pause=0, sleep=lambda _s: None)
                return fake_sftp(["sftp", "-b", batch_file(local, remote)], dry_run=dry_run)

            def runner(cmd, *, dry_run, cwd=None):
                if first_apply_rc is not None and not state["apply_rcs"]:
                    state["apply_rcs"].append(first_apply_rc)
                    return first_apply_rc
                if tamper_first_apply and not state["apply_rcs"]:
                    pkg = srv / TARBALL_NAME
                    with tarfile.open(pkg, "r:gz") as t:
                        members = [(m, t.extractfile(m).read()) for m in t.getmembers()]
                    with tarfile.open(pkg, "w:gz") as t:
                        for m, data in members:
                            info = tarfile.TarInfo(m.name)
                            data = b"/* tampered */\n" if m.name.endswith("style.css") else data
                            info.size = len(data)
                            t.addfile(info, io.BytesIO(data))
                rc = subprocess.run([bash, "-c", cmd[-1]], cwd=srv, capture_output=True).returncode
                state["apply_rcs"].append(rc)
                return rc

            try:
                with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    rc = step_ship(False, True, "wp-content", True, False, payload, lister=lister, uploader=uploader,
                                   runner=runner)
            finally:
                for name in (TARBALL_NAME, FULL_PACKAGE_NAME):
                    (REPO_ROOT / name).unlink(missing_ok=True)
            return rc, state

        want = {p: e.data for p, e in payload.items()}
        old = dict(want)
        old["themes/sgs-theme/style.css"] = b"/* old */\n"
        old["themes/sgs-theme/gone.html"] = b"<old/>\n"

        def drop_case(resumable: bool) -> list[str]:
            srv = server_with({})
            rc, st = ship(srv, drop_first=True, resumable=resumable)
            ok = rc == 0 and live_tree(srv) == want and st["uploads"] >= 2
            return [] if ok else [f"a drop mid-transfer gave rc={rc} after {st['uploads']} transfer(s)"]

        real, planted = drop_case(True), drop_case(False)
        print(f"  [ship case] a dropped connection mid-transfer resumes: real={'GREEN' if not real else 'RED'}; "
              f"planted fault={'RED' if planted else 'GREEN (check is vacuous)'}")
        failures.extend(f"ship: drop resumes: {p}" for p in real)
        if not planted:
            failures.append("ship NEGATIVE CONTROL: a one-shot upload survived a drop, so the check cannot fail")

        srv = server_with(old)
        rc, st = ship(srv, drop_first=False, resumable=True, tamper_first_apply=True)
        fb_ok = rc == 0 and live_tree(srv) == want and len(st["apply_rcs"]) == 2 and st["apply_rcs"][0] != 0
        print(f"  [ship case] a delta failing its check falls back to one full upload: {'GREEN' if fb_ok else 'RED'} "
              f"(apply exits {st['apply_rcs']})")
        if not fb_ok:
            failures.append(f"ship: fallback: rc={rc} applies={st['apply_rcs']} tree_ok={live_tree(srv) == want}")

        # Only a failed staged check may lead to the full upload: after a swap failure (20) or a dropped connection
        # (255) a second apply would replace the .bak, the only rollback copy.
        for code in (deploy_delta.APPLY_SWAP_FAILED, 255):
            srv = server_with(old)
            rc, st = ship(srv, drop_first=False, resumable=True, first_apply_rc=code)
            ok = rc == SHIP_APPLY_FAILED and st["apply_rcs"] == [code]
            print(f"  [ship case] an apply ending {code} stops without a second apply: {'GREEN' if ok else 'RED'}")
            if not ok:
                failures.append(f"ship: exit {code}: rc={rc} applies={st['apply_rcs']}")

        srv = server_with(old)
        rc, st = ship(srv, drop_first=False, resumable=True)
        d_ok = rc == 0 and live_tree(srv) == want and st["apply_rcs"] == [0]
        print(f"  [ship case] a changed and a deleted file land in one delta apply: {'GREEN' if d_ok else 'RED'}")
        if not d_ok:
            failures.append(f"ship: delta: rc={rc} applies={st['apply_rcs']}")
    return failures


def self_test_vendor_shell() -> list[str]:
    """Self-test case 27: the isolated worktree's vendor/ is a real folder whose composer files are its own, so a
    composer write there never reaches the shared checkout, while the packages are still read from it.
    Planted fault: vendor/ linked whole, as before 2026-11-11."""
    failures: list[str] = []

    def problems_with(build) -> list[str]:
        found = []
        with tempfile.TemporaryDirectory(prefix="sgs-vendor-shell-") as td:
            shared = Path(td) / "shared" / "vendor"
            (shared / "composer").mkdir(parents=True)
            (shared / "spatie" / "color").mkdir(parents=True)
            (shared / "composer" / "autoload_psr4.php").write_text("shared", encoding="utf-8")
            (shared / "autoload.php").write_text("shared", encoding="utf-8")
            (shared / "spatie" / "color" / "Hex.php").write_text("<?php // Hex", encoding="utf-8")
            wt = Path(td) / "wt" / "vendor"
            wt.parent.mkdir()
            build(shared, wt)
            (wt / "composer" / "autoload_psr4.php").write_text("worktree", encoding="utf-8")
            (wt / "autoload.php").write_text("worktree", encoding="utf-8")
            if (shared / "composer" / "autoload_psr4.php").read_text(encoding="utf-8") != "shared" or \
                    (shared / "autoload.php").read_text(encoding="utf-8") != "shared":
                found.append("a composer write in the worktree changed the shared checkout's vendor/")
            if not (wt / "spatie" / "color" / "Hex.php").is_file():
                found.append("the worktree cannot read the shared packages")
        return found

    def link_whole(src, dst):
        os.symlink(src, dst, target_is_directory=True)

    try:
        real, planted = problems_with(vendor_shell), problems_with(link_whole)
    except OSError as exc:
        return [f"vendor shell: could not create links here ({exc})"]
    print(f"  [vendor case] the worktree's composer writes stay in the worktree: real={'GREEN' if not real else 'RED'}; "
          f"planted fault={'RED' if planted else 'GREEN (check is vacuous)'}")
    failures.extend(f"vendor shell: {p_}" for p_ in real)
    if not planted:
        failures.append("vendor shell NEGATIVE CONTROL: a whole-folder link passed, so the check cannot fail")
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
    failures.extend(self_test_timing())
    failures.extend(self_test_motion_qa_args())
    failures.extend(self_test_page_weight())
    failures.extend(self_test_litespeed_probe())
    failures.extend(self_test_upload_resume())
    failures.extend(deploy_delta.self_test())
    failures.extend(self_test_ship())
    failures.extend(self_test_vendor_shell())
    failures.extend(deploy_qa_tier.self_test())
    failures.extend(deploy_media_guard.self_test())

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
    print("  8. a theme package without the target's theme.json is refused before anything is packaged")
    print("  9. a theme deploy on a target WITH a client ends with the client snapshot live")
    print(" 10. a target with NO client keeps the framework default theme.json")
    print(" 11. a staged theme.json that is not the client's FAILS the apply's check and leaves the live theme untouched")
    print(" 12. a named client with no snapshot fails closed (no framework fallback)")
    print(" 13. an unparseable snapshot fails closed; a target's own snapshot wins over its client's")
    print(" 14. pre-upload guard: aborts only when an UNCOMMITTED pushed snapshot is live")
    print(" 15. post-deploy verify: a live theme.json that is not the payload FAILS")
    print(" 16. every real TARGETS entry names a client whose snapshot prepares")
    print(" 17. deploy_cache: the key follows the tree and the DB, non-isolated runs get none, "
          "a pass restores build/ and its generated files, the packaging lock has one holder")
    print(" 18. deploy_multi: `all` and comma lists resolve canary-first, unknown names are "
          "refused, each child gets only its own --target")
    print(" 19. deploy_timing: the summary is slowest first and sums to about 100%, a raising stage still records its time "
          "and re-raises, the history line is valid JSON with the documented keys, an unwritable history path logs one "
          "line and never raises, a dry run writes nothing; each check is proven red on a planted fault")
    print(" 20. motion QA flags: defaults leave the npm command line unchanged, --motion-qa-tier and --motion-qa-parallel add "
          "exactly their arguments after --, a dry run logs the command; each check is proven red on a planted fault")
    print(" 21. motion QA tier: auto picks full with no record, a stale record, an unreachable commit or a changed marquee-related "
          "file (named in the reason) and smoke otherwise; explicit tiers are honoured; a corrupt record reads as none; the record is "
          "written after a passing full run only; the real full-tier-paths.json matches the marquee code and not unrelated blocks; "
          "files shipped uncommitted (dirty or --payload) count as changed, and such a run or a --skip-verify run never records a full pass; "
          "a dry run for a non-canary target reports SKIPPED as a real run does; deploy_timing.short_commit reads the given checkout; "
          "each check is proven red on a planted fault")
    print(" 22. LiteSpeed probe: a warning for each of media-lazy and img_optm-webp that is on, none when both are off or missing")
    print(" 23. media guard: a pre-cutover build skips, a clean export passes, an export with one old attribute is refused "
          "(negative control), an unreadable export fails closed")
    print(" 24. page-weight gate: runs on --page-weight or --motion-qa-tier full only, its command names the target and --check, "
          "a target with no data entry is skipped, a dry run only logs; each check is proven red on a planted fault")
    print(" 25. partial upload (deploy_delta.py): the collector applies TAR_EXCLUDES as tar does, follows a linked vendor/ "
          "(a loop or a link out of the checkout is refused), refuses a theme payload without the target's theme.json, and "
          "finds a dev-included Composer autoloader; an unchanged payload uploads nothing; one changed file of the same size sends "
          "only that file; a deleted file is deleted on the server; a missing, garbled, cut-off or symlink-holding live "
          "listing gives a full upload; a tampered delta or a wrong staged theme.json fails before the swap and leaves the "
          "site untouched; a full upload builds the whole tree; --full-upload forces full; a file-folder type change applies as one "
          "delta; a failed second swap puts both folders back; sent files carry the deploy time; each check red on a planted fault")
    print(" 26. step_ship end to end: a dropped connection mid-transfer resumes (red on a one-shot upload), a delta failing "
          "its check falls back to one full upload, an apply ending in a swap failure or a dropped connection stops with no "
          "second apply, a changed and a deleted file land in one delta apply")
    print(" 27. the isolated worktree's vendor/ is a real folder: composer's writes stay in the worktree (no temp-worktree "
          "base path in the shared or shipped autoloader), packages are read from the shared checkout; red on a whole-folder link")
    return 0
