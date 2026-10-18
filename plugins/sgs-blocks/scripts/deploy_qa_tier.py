#!/usr/bin/env python3
"""deploy_qa_tier.py - build-deploy.py's choice of live motion-QA tier: smoke, or the full set.

One job: decide which tier the post-deploy motion probes run, and remember when a full pass last succeeded.
The two slowest probes (marquee, looping-media) are 494s of a 735s serial run and only concern marquee, Ken Burns,
SVG loop, Lottie and logo-draw code, so a deploy runs the smoke set by default and the full set when that code
changed since the last full pass or when that pass is older than `max_age_hours`.

Pure decision: `choose_tier`. Thin I/O: `load_config`, `read_last_full`, `record_full_pass`, `changed_since`, `head_commit`.

Glob syntax (the same in code and in `motion-qa/full-tier-paths.json`), matched against repo-relative paths with `/`:
`*` matches any characters within one path segment, `?` one character within a segment, `**` any characters including `/`
(so `a/**` matches everything under `a/`, and `a/**/b` matches `a/b` and `a/x/y/b`). Everything else is literal.

The record lives at `~/.sgs-motion-qa-full.json` as `{"commit": <full hash>, "passed_at": <ISO-8601 UTC>}`; the environment
variable `SGS_MOTION_QA_FULL_FILE` overrides the path so tests never touch the real file.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from deploy_common import REPO_ROOT, log

CONFIG_PATH = Path(__file__).resolve().parent / "motion-qa" / "full-tier-paths.json"
RECORD_ENV = "SGS_MOTION_QA_FULL_FILE"
REQUESTED = ("smoke", "full", "auto")


def glob_to_regex(glob: str) -> re.Pattern[str]:
    """Compile a glob (see the module docstring) to an anchored regular expression."""
    out: list[str] = []
    i = 0
    while i < len(glob):
        if glob.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif glob.startswith("**", i):
            out.append(".*")
            i += 2
        elif glob[i] == "*":
            out.append("[^/]*")
            i += 1
        elif glob[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(glob[i]))
            i += 1
    return re.compile("".join(out) + r"\Z")


def first_match(files: list[str], globs: list[str]) -> tuple[str, str] | None:
    """The first (file, glob) pair where a changed file matches a glob, else None. Backslashes are read as `/`."""
    compiled = [(g, glob_to_regex(g)) for g in globs]
    for f in files:
        norm = f.replace("\\", "/")
        for g, rx in compiled:
            if rx.match(norm):
                return f, g
    return None


def _parse_when(text: Any) -> datetime | None:
    """An ISO-8601 timestamp as an aware UTC datetime, or None when it is not one."""
    if not isinstance(text, str):
        return None
    try:
        when = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=timezone.utc)


def choose_tier(requested: str, last_full: dict | None, changed_files: list[str] | None,
                now: datetime, cfg: dict | None) -> tuple[str, str]:
    """Pick the motion-QA tier. Returns ('smoke' | 'full', reason); the reason names the rule that fired.

    `requested` is smoke, full or auto. For auto: full when there is no `last_full` record, when it is older than
    `cfg['max_age_hours']`, when its commit is not reachable (the caller passes `changed_files=None`), or when any
    changed file matches a glob in `cfg['paths']`; otherwise smoke. An unreadable config (None) also gives full.
    """
    if requested in ("smoke", "full"):
        return requested, "requested"
    if requested != "auto":
        raise ValueError(f"unknown motion-QA tier request {requested!r}; expected one of {REQUESTED}")
    if not last_full:
        return "full", "auto: no full pass on record"
    when = _parse_when(last_full.get("passed_at"))
    short = str(last_full.get("commit", ""))[:8]
    if when is None:
        return "full", "auto: the full-pass record has no readable time"
    if cfg is None:
        return "full", "auto: full-tier-paths.json is unreadable, so relevance cannot be judged"
    age = now - when
    if age > timedelta(hours=float(cfg["max_age_hours"])):
        return "full", f"auto: last full pass {when.isoformat(timespec='minutes')} is {age.total_seconds() / 3600:.0f}h old, over {cfg['max_age_hours']}h"
    if changed_files is None:
        return "full", f"auto: last full pass commit {short} is not reachable from this checkout"
    hit = first_match(changed_files, list(cfg["paths"]))
    if hit:
        return "full", f"auto: {hit[0]} changed since {short} and matches {hit[1]}"
    return "smoke", f"auto: no motion-QA-relevant file changed since {short}, last full pass {when.isoformat(timespec='minutes')}"


def load_config(path: Path = CONFIG_PATH) -> dict | None:
    """`{"max_age_hours": number, "paths": [globs]}` from the data file, or None when it is missing or malformed."""
    try:
        cfg = json.loads(Path(path).read_text(encoding="utf-8"))
        float(cfg["max_age_hours"])
        if not (isinstance(cfg["paths"], list) and all(isinstance(p, str) for p in cfg["paths"])):
            return None
        return cfg
    except (OSError, ValueError, KeyError, TypeError):
        return None


def record_path() -> Path:
    """Where the full-pass record lives: `$SGS_MOTION_QA_FULL_FILE`, else `~/.sgs-motion-qa-full.json`."""
    override = os.environ.get(RECORD_ENV)
    return Path(override) if override else Path.home() / ".sgs-motion-qa-full.json"


def read_last_full(path: Path | None = None) -> dict | None:
    """The last full-pass record `{"commit", "passed_at"}`, or None when missing, corrupt or incomplete. Never raises."""
    try:
        data = json.loads((path or record_path()).read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("commit"), str) and data["commit"] and _parse_when(data.get("passed_at")):
            return {"commit": data["commit"], "passed_at": data["passed_at"]}
    except (OSError, ValueError):
        pass
    return None


def record_full_pass(path: Path | None, commit: str, when: datetime) -> bool:
    """Write the record after a passing full run. A write failure logs one line and returns False; it never raises."""
    target = path or record_path()
    stamp = when.astimezone(timezone.utc).isoformat(timespec="seconds")
    try:
        target.write_text(json.dumps({"commit": commit, "passed_at": stamp}) + "\n", encoding="utf-8")
        return True
    except OSError as exc:
        log(f"[motion-qa] could not record the full pass at {target} ({exc}); the next auto run will choose full")
        return False


def _git(args: list[str], repo_root: Path) -> str | None:
    """stdout of a git command in `repo_root`, or None when git fails or is missing."""
    try:
        res = subprocess.run(["git", *args], cwd=repo_root, capture_output=True, text=True, check=False)
    except OSError:
        return None
    return res.stdout if res.returncode == 0 else None


def changed_since(commit: str, repo_root: Path = REPO_ROOT) -> list[str] | None:
    """Files changed between `commit` and HEAD (`git diff --name-only <commit> HEAD`), or None when git cannot resolve it."""
    out = _git(["diff", "--name-only", commit, "HEAD"], repo_root)
    return None if out is None else [line for line in out.splitlines() if line]


def head_commit(repo_root: Path = REPO_ROOT) -> str | None:
    """The full hash of HEAD, or None when git cannot say."""
    out = _git(["rev-parse", "HEAD"], repo_root)
    return out.strip() if out and out.strip() else None


def shipped_uncommitted(dirty: list[str], payload: list[str], repo_root: Path = REPO_ROOT) -> list[str]:
    """Repo-relative files a run ships that are not in HEAD: the dirty deploy files plus every `--payload` file.

    A `--payload` entry may be a file (even a new untracked one) or a folder, which is expanded to the files in it.
    """
    out = [d.replace("\\", "/") for d in dirty]
    for entry in payload:
        rel = entry.replace("\\", "/").rstrip("/")
        target = repo_root / rel
        if target.is_dir():
            out.extend(f.relative_to(repo_root).as_posix() for f in target.rglob("*") if f.is_file())
        else:
            out.append(rel)
    return sorted(set(out))


def motion_qa_action(deploy_blocks: bool, skip_motion_qa: bool, target_key: str, tier: str = "auto") -> str:
    """What a run does about motion QA: 'none' (not asked for), 'skip-target' (the probes measure only the canary) or 'run'.

    `tier` 'none' (the deploy default) asks for no probes. A dry run decides exactly as a real run does, so it never
    reports a command a real run would skip.
    """
    if not deploy_blocks or skip_motion_qa or tier == "none":
        return "none"
    return "run" if target_key == "sandybrown" else "skip-target"


def resolve_tier(requested: str, repo_root: Path = REPO_ROOT, now: datetime | None = None,
                 uncommitted: list[str] | None = None) -> tuple[str, str]:
    """`choose_tier` with the real record, config and git history. Read-only, so a dry run may call it.

    `uncommitted` (see `shipped_uncommitted`) joins the commit diff before the globs are matched, because
    `git diff <commit> HEAD` compares two commits and cannot see files the deploy ships from the working tree.
    """
    now = now or datetime.now(timezone.utc)
    last = read_last_full()
    changed = changed_since(last["commit"], repo_root) if requested == "auto" and last else None
    if changed is not None:
        changed = changed + list(uncommitted or [])
    return choose_tier(requested, last, changed, now, load_config())


def note_full_pass(repo_root: Path = REPO_ROOT, now: datetime | None = None) -> bool:
    """Record HEAD as the last full pass. Logs one line either way; never raises."""
    commit = head_commit(repo_root)
    if not commit:
        log("[motion-qa] could not read HEAD, so the full pass was not recorded; the next auto run will choose full")
        return False
    ok = record_full_pass(None, commit, now or datetime.now(timezone.utc))
    if ok:
        log(f"[motion-qa] recorded the full pass at {commit[:8]}")
    return ok


def make_temp_repo(base: Path, files: dict[str, str]) -> Path:
    """A throwaway git repo under `base` with one commit holding `files` (for self-tests; never the real checkout)."""
    base.mkdir(parents=True, exist_ok=True)
    for rel, text in files.items():
        (base / rel).parent.mkdir(parents=True, exist_ok=True)
        (base / rel).write_text(text, encoding="utf-8")
    ident = ["-c", "user.name=selftest", "-c", "user.email=selftest@example.invalid", "-c", "commit.gpgsign=false"]
    for args in (["init", "-q"], ["add", "."], [*ident, "commit", "-q", "-m", "fixture"]):
        subprocess.run(["git", *args], cwd=base, check=True, capture_output=True)
    return base


def self_test() -> list[str]:
    """Self-test case 21: the tier choice and the full-pass record (no deploy, no network, no real record file).

    Every check runs against the real code and against a planted faulty variant, which must come out red.
    """
    import contextlib
    import fnmatch
    import io
    import tempfile
    import deploy_verify

    failures: list[str] = []
    now = datetime(2026, 10, 17, 12, 0, tzinfo=timezone.utc)
    cfg = {"max_age_hours": 24, "paths": ["plugins/x/marquee/**", "plugins/x/fx-*.js", "plugins/x/exact.json"]}
    fresh = {"commit": "a" * 40, "passed_at": (now - timedelta(hours=2)).isoformat()}
    stale = {"commit": "a" * 40, "passed_at": (now - timedelta(hours=30)).isoformat()}
    rel_hit, rel_miss = "plugins/x/marquee/deep/view.js", "plugins/x/other/view.js"
    real_cfg = load_config()

    def tier_of(choose, requested, last, changed, config=cfg) -> tuple[str, str]:
        return choose(requested, last, changed, now, config)

    def expect(got: tuple[str, str], want_tier: str, must_say: str = "") -> list[str]:
        problems = [] if got[0] == want_tier else [f"chose {got[0]} ({got[1]}), expected {want_tier}"]
        return problems + ([] if must_say in got[1] else [f"reason {got[1]!r} lacks {must_say!r}"])

    # Planted faults: each wraps the real function with one rule switched off.
    faults = {
        "no_record": lambda r, l, c, n, g: choose_tier(r, l or fresh, [], n, g),
        "no_age": lambda r, l, c, n, g: choose_tier(r, dict(l, passed_at=n.isoformat()) if l else l, c, n, g),
        "no_paths": lambda r, l, c, n, g: choose_tier(r, l, [] if c is not None else c, n, g),
        "no_file_named": lambda r, l, c, n, g: (lambda t: (t[0], "auto: a path matched"))(choose_tier(r, l, c, n, g)),
        "unreachable_ok": lambda r, l, c, n, g: choose_tier(r, l, [] if c is None else c, n, g),
        "ignores_request": lambda r, l, c, n, g: choose_tier("auto", l, c, n, g),
    }

    def check_explicit(choose) -> list[str]:
        return (expect(tier_of(choose, "smoke", None, [rel_hit]), "smoke", "requested")
                + expect(tier_of(choose, "full", fresh, []), "full", "requested"))

    # The record: missing and corrupt files read as no record, and a write failure never raises.
    def check_reader(read) -> list[str]:
        problems: list[str] = []
        with tempfile.TemporaryDirectory(prefix="sgs-qa-tier-") as td:
            base = Path(td)
            bad = {"missing": None, "garbage": "{not json", "wrong type": "[1, 2]", "no time": '{"commit": "abc"}',
                   "bad time": '{"commit": "abc", "passed_at": "yesterday"}'}
            for label, text in bad.items():
                path = base / f"{label.replace(' ', '-')}.json"
                if text is not None:
                    path.write_text(text, encoding="utf-8")
                try:
                    if read(path) is not None:
                        problems.append(f"a {label} record was read as a record")
                except Exception as exc:  # noqa: BLE001
                    problems.append(f"a {label} record raised {type(exc).__name__}")
            good = base / "good.json"
            good.write_text(json.dumps(fresh), encoding="utf-8")
            if read(good) != fresh:
                problems.append("a valid record was not read back")
        return problems

    def faulty_reader(path: Path) -> dict | None:
        return json.loads(path.read_text(encoding="utf-8"))

    def check_write_failure(write) -> list[str]:
        with tempfile.TemporaryDirectory(prefix="sgs-qa-tier-") as td:
            buf = io.StringIO()
            try:
                with contextlib.redirect_stdout(buf):
                    ok = write(Path(td), "abc", now)  # a directory cannot be opened for writing
            except Exception as exc:  # noqa: BLE001
                return [f"an unwritable record path raised {type(exc).__name__}"]
        return [] if ok is False and buf.getvalue().count("\n") == 1 else [f"expected False and one log line, got {ok!r} {buf.getvalue()!r}"]

    def faulty_write(path: Path, commit: str, when: datetime) -> bool:
        raise OSError("not handled")

    # Wiring: the record follows a passing full run only, through the real step_motion_qa with npm stubbed out.
    def run_step(step, requested: str, rc: int, dry_run: bool, **extra) -> bool:
        """True when the step left a record file behind."""
        with tempfile.TemporaryDirectory(prefix="sgs-qa-tier-") as td:
            target = Path(td) / "record.json"
            saved_env, saved_run = os.environ.get(RECORD_ENV), deploy_verify.run
            os.environ[RECORD_ENV] = str(target)
            deploy_verify.run = lambda cmd, **kw: rc
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    step(dry_run, requested, 1, **extra)
            finally:
                deploy_verify.run = saved_run
                if saved_env is None:
                    os.environ.pop(RECORD_ENV, None)
                else:
                    os.environ[RECORD_ENV] = saved_env
            return target.exists()

    def check_record(step) -> list[str]:
        want = {("full", 0, False): True, ("full", 1, False): False, ("smoke", 0, False): False, ("full", 0, True): False}
        return [f"{requested} rc={rc} dry={dry}: record written is not {expected}"
                for (requested, rc, dry), expected in want.items() if run_step(step, requested, rc, dry) is not expected]

    def check_record_flags(step) -> list[str]:
        want = [({"uncommitted": ["plugins/x/marquee/a.js"]}, False, "a run that shipped uncommitted files"),
                ({"skip_verify": True}, False, "a --skip-verify run"), ({}, True, "a clean verified run")]
        return [f"{label}: record written is not {expected}" for extra, expected, label in want
                if run_step(step, "full", 0, False, **extra) is not expected]

    def faulty_step_ignores_flags(dry_run: bool, requested: str = "full", parallel: int = 1, **_ignored) -> int:
        """Drops the dirty and skip-verify guards: records every passing full run."""
        return deploy_verify.step_motion_qa(dry_run, requested, parallel)

    def faulty_step(dry_run: bool, requested: str = "full", parallel: int = 1) -> int:
        """Records after every run, whatever the tier or exit code."""
        rc = deploy_verify.step_motion_qa(dry_run, requested, parallel)
        if not dry_run:
            note_full_pass()
        return rc

    # The real data file and the matcher.
    def check_real_config(config) -> list[str]:
        if config is None:
            return ["full-tier-paths.json is unreadable"]
        paths = config["paths"]
        want_in = ["plugins/sgs-blocks/scripts/motion-qa/probe-marquee.mjs", "plugins/sgs-blocks/src/blocks/brand-strip/render.php"]
        want_in += ["plugins/sgs-blocks/src/blocks/container/block.json", "plugins/sgs-blocks/includes/class-sgs-container-wrapper.php",
                    "plugins/sgs-blocks/includes/generated-fx-effects.php", "plugins/sgs-blocks/includes/class-sgs-motion-registry.php",
                    "plugins/sgs-blocks/src/shared/effects/off-switch.js", "plugins/sgs-blocks/src/shared/effects/motion-utils.js",
                    "plugins/sgs-blocks/src/shared/motion-pause/index.js", "plugins/sgs-blocks/src/shared/effects/gsap/bezier-ease.js",
                    "plugins/sgs-blocks/webpack.config.js", "plugins/sgs-blocks/package.json", "plugins/sgs-blocks/package-lock.json",
                    "plugins/sgs-blocks/src/components/motion/generated-motion-defs.json"]
        want_out = ["plugins/sgs-blocks/src/blocks/accordion/render.php", "plugins/sgs-blocks/src/blocks/testimonial/render.php"]
        problems = [f"{f} does not make the full tier mandatory" for f in want_in if not first_match([f], paths)]
        problems += [f"{f} wrongly makes the full tier mandatory" for f in want_out if first_match([f], paths)]
        return problems + [f"fixture file {f} no longer exists" for f in want_in + want_out if not (REPO_ROOT / f).exists()]

    def check_glob(match) -> list[str]:
        cases = [("a/**", "a/b/c.js", True), ("a/*.js", "a/b/c.js", False), ("a/*.js", "a/c.js", True),
                 ("**/x.js", "x.js", True), ("**/x.js", "d/e/x.js", True), ("a/**/b", "a/b", True), ("a/**/b", "a/x/y/b", True),
                 ("a/fx-?.js", "a/fx-1.js", True), ("a/fx-?.js", "a/fx-12.js", False), ("a/b.js", "a/bxjs", False)]
        return [f"{g} vs {f}: got {match(g, f)}, expected {want}" for g, f, want in cases if match(g, f) is not want]

    # F1: files shipped from the working tree count as changed, against a throwaway repo whose HEAD is the recorded commit.
    marquee_file = "plugins/sgs-blocks/scripts/motion-qa/probe-marquee.mjs"

    def check_uncommitted(resolve) -> list[str]:
        problems: list[str] = []
        with tempfile.TemporaryDirectory(prefix="sgs-qa-tier-") as td:
            repo = make_temp_repo(Path(td) / "repo", {"README.md": "x\n"})
            head = head_commit(repo) or ""
            record = Path(td) / "record.json"
            record_full_pass(record, head, datetime.now(timezone.utc))
            saved = os.environ.get(RECORD_ENV)
            os.environ[RECORD_ENV] = str(record)
            try:
                for dirty, want in (([marquee_file], "full"), (["plugins/sgs-blocks/src/blocks/accordion/render.php"], "smoke"), ([], "smoke")):
                    got = resolve("auto", repo, datetime.now(timezone.utc), dirty)
                    if got[0] != want:
                        problems.append(f"uncommitted {dirty} chose {got[0]} ({got[1]}), expected {want}")
            finally:
                if saved is None:
                    os.environ.pop(RECORD_ENV, None)
                else:
                    os.environ[RECORD_ENV] = saved
        return problems

    def faulty_resolve(requested, repo_root, now, uncommitted):
        return resolve_tier(requested, repo_root, now)  # the commit diff only

    def check_shipped(fn) -> list[str]:
        with tempfile.TemporaryDirectory(prefix="sgs-qa-tier-") as td:
            repo = make_temp_repo(Path(td) / "repo", {"plugins/p/blocks/m/a.js": "1\n", "plugins/p/blocks/m/sub/b.js": "2\n"})
            (repo / "plugins/p/new.php").write_text("3\n", encoding="utf-8")
            got = fn(["plugins\\p\\x.php"], ["plugins/p/blocks/m", "plugins/p/new.php"], repo)
        want = ["plugins/p/blocks/m/a.js", "plugins/p/blocks/m/sub/b.js", "plugins/p/new.php", "plugins/p/x.php"]
        return [] if got == want else [f"expected {want}, got {got}"]

    def faulty_shipped(dirty: list[str], payload: list[str], repo_root: Path) -> list[str]:
        return sorted(set(dirty + payload))  # a payload folder stays a bare folder name

    # F4: a dry run decides motion QA exactly as a real run does.
    def check_action(fn) -> list[str]:
        want = [((True, False, "indus-test", True), "skip-target"), ((True, False, "indus-test", False), "skip-target"),
                ((True, False, "sandybrown", True), "run"), ((True, True, "sandybrown", False), "none"), ((False, False, "sandybrown", False), "none"),
                ((True, False, "sandybrown", False, "none"), "none"), ((True, False, "sandybrown", True, "none"), "none"),
                ((True, False, "sandybrown", False, "full"), "run")]
        return [f"{args}: {fn(*args)} not {exp}" for args, exp in want if fn(*args) != exp]

    def real_action(blocks: bool, skip: bool, target: str, dry: bool, tier: str = "auto") -> str:
        return motion_qa_action(blocks, skip, target, tier)

    def faulty_action(blocks: bool, skip: bool, target: str, dry: bool, tier: str = "auto") -> str:
        return "run" if dry and blocks and not skip else motion_qa_action(blocks, skip, target, tier)

    def faulty_match(glob: str, path: str) -> bool:
        return fnmatch.fnmatchcase(path, glob)  # `*` crosses `/`, and `**` means nothing special

    def real_match(glob: str, path: str) -> bool:
        return bool(glob_to_regex(glob).match(path))

    cases = [
        ("auto picks full with no record", expect(tier_of(choose_tier, "auto", None, []), "full", "no full pass"),
         expect(tier_of(faults["no_record"], "auto", None, []), "full", "no full pass")),
        ("auto picks full when the record is older than max_age", expect(tier_of(choose_tier, "auto", stale, []), "full", "old"),
         expect(tier_of(faults["no_age"], "auto", stale, []), "full", "old")),
        ("auto picks full when a changed file matches a glob, and names it",
         expect(tier_of(choose_tier, "auto", fresh, [rel_miss, rel_hit]), "full", rel_hit),
         expect(tier_of(faults["no_paths"], "auto", fresh, [rel_hit]), "full", rel_hit)
         + expect(tier_of(faults["no_file_named"], "auto", fresh, [rel_hit]), "full", rel_hit)),
        ("auto picks smoke when the record is fresh and nothing relevant changed",
         expect(tier_of(choose_tier, "auto", fresh, [rel_miss]), "smoke", "no motion-QA-relevant"),
         expect(tier_of(lambda r, l, c, n, g: choose_tier(r, l, [rel_hit], n, g), "auto", fresh, [rel_miss]), "smoke", "no motion-QA-relevant")),
        ("auto picks full when the recorded commit is unreachable", expect(tier_of(choose_tier, "auto", fresh, None), "full", "not reachable"),
         expect(tier_of(faults["unreachable_ok"], "auto", fresh, None), "full", "not reachable")),
        ("explicit smoke and full are honoured", check_explicit(choose_tier), check_explicit(faults["ignores_request"])),
        ("a missing or corrupt record reads as none and never raises", check_reader(read_last_full), check_reader(faulty_reader)),
        ("an unwritable record path logs one line and never raises", check_write_failure(record_full_pass), check_write_failure(faulty_write)),
        ("the record is written after a passing full run only", check_record(deploy_verify.step_motion_qa), check_record(faulty_step)),
        ("the real full-tier-paths.json matches the marquee probe and brand-strip, not accordion or testimonial", check_real_config(real_cfg),
         check_real_config({"paths": []}) + check_real_config({"paths": ["plugins/**"]})),
        ("files shipped uncommitted count as changed, so a dirty marquee-related file forces full over an empty commit diff",
         check_uncommitted(resolve_tier), check_uncommitted(faulty_resolve)),
        ("shipped_uncommitted expands a --payload folder and lists new files and dirty files",
         check_shipped(shipped_uncommitted), check_shipped(faulty_shipped)),
        ("no full pass is recorded after a run that shipped uncommitted files or ran under --skip-verify",
         check_record_flags(deploy_verify.step_motion_qa), check_record_flags(faulty_step_ignores_flags)),
        ("a dry run for a non-canary target reports SKIPPED exactly as a real run does", check_action(real_action), check_action(faulty_action)),
        ("globs: `*` stays in a segment, `**` crosses them, `?` is one character", check_glob(real_match), check_glob(faulty_match)),
    ]
    for label, real_problems, planted in cases:
        print(f"  [qa-tier case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
              f"planted fault={'RED' if planted else 'GREEN (check is vacuous)'}" + (f" ({planted[0]})" if planted else ""))
        failures.extend(f"qa-tier: {label}: {p}" for p in real_problems)
        if not planted:
            failures.append(f"qa-tier NEGATIVE CONTROL: {label}: the planted fault was not detected, so the check cannot fail")
    return failures
