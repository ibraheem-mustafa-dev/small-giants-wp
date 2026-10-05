#!/usr/bin/env python3
"""
check-no-client-names.py: keep client names and reference-site names out of the framework.

THE RULE (Bean, 2026-10-01)
---------------------------
The framework (theme, plugins, scripts, specs, plans, rules, docs) works for ANY client. Client
material lives in `sites/<client>/` and inspiration or reference-site material lives in
`reference/`. Neither a client's name nor a reference site's name may appear in framework code,
docs, specs or file names outside those two folders. Write what a thing DOES ("a wholesale food
client's mega menu", "the reference header"), never whose it was.

HOW TO READ THE RULES BELOW
---------------------------
  NAMES      what counts as a client or reference-site name (regex, case-insensitive).
  SCOPE      what is scanned: tracked and untracked-but-not-ignored files, content AND file names.
             Gitignored folders (.playwright-mcp/, node_modules/, build output) are never scanned
             because the file list comes from `git ls-files`.
  EXEMPT_PREFIXES  folders that may carry the names: client and reference material, plus dated
             historical records and generated output (their content records what happened to a
             specific client on a specific date; it is not framework code, docs or specs).
  ALLOWLIST  operational identifiers that must keep a name until the thing they identify is
             renamed (a deploy-target key, an env-file name). Each entry carries a reason. An
             allowlisted hit is reported by --survey, never by --check.

MODES
-----
  --survey       Count hits by area and list every offending file (content hits and file names).
  --check        Exit 1 when any hit is outside the exempt folders and the allowlist.
  --self-test    Prove the detector catches a planted name and ignores an exempt folder.

Usage:
  python scripts/check-no-client-names.py --survey [--files]
  python scripts/check-no-client-names.py --check
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Tuple

REPO = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------------------------
# RULES
# ---------------------------------------------------------------------------------------------

# Client names and reference-site names. One entry per name, each a case-insensitive regex.
# Add a name here the moment a new client or reference site appears in the project.
NAMES: Dict[str, str] = {
    "indus-foods": r"indus[\s_-]*foods?|\bindus\b",
    "eye-care": r"eye[\s_-]*care|eyecare",
    "ward-end": r"ward[\s_-]*end",
    "helping-doctors": r"helping[\s_-]*doctors",
    "mamas-munches": r"mama[’']?s[\s_-]*munches|mamasmunches",
    "snooza": r"snooza",
    "palestine-lives": r"palestine[\s_-]*lives",
    "feldeluxe": r"feldeluxe",
    "workwear-now": r"workwear[\s_-]*now",
    "lamalama": r"lama[\s_-]?lama",
    "athleanx": r"athlean[\s_-]*x",
    "invisalign": r"invisalign",
}

# Folders that may carry the names (path prefixes, forward slashes, relative to the repo root).
EXEMPT_PREFIXES: Tuple[str, ...] = (
    "scripts/check-no-client-names.py",  # the rules below name the names
    "sites/",
    "reference/",
    # Dated historical records and generated output: they record what happened to a specific
    # client on a specific date, so they are not framework code, docs or specs.
    "reports/",
    ".claude/",  # docs, specs and plans keep their client names (Bean, 2026-10-02: the names add specificity)
    ".claude/reports/",
    ".claude/backups/",
    ".claude/verify/",
    ".claude/gap-analysis/",
    ".claude/drafts/",
    ".claude/archive/",
    ".claude/scratch/",
    ".claude/secrets/",
    "pipeline-state/",
    "site-reviews/",
    # Test, fixture and QA-capture code (Bean, 2026-10-01: block, theme and helper code must be
    # clean; tests and fixtures may carry real client data and slugs).
    "tests/",
    "plugins/sgs-blocks/tests/",
    "plugins/sgs-blocks/scripts/tests/",
    "plugins/sgs-blocks/scripts/converter/tests/",
    "plugins/sgs-blocks/scripts/theme-extractor/tests/",
    "plugins/sgs-blocks/scripts/theme-extractor/expected/",
    "plugins/sgs-blocks/scripts/nav-qa/",
    "plugins/sgs-blocks/scripts/parity/",
    "scripts/tests/",
    "scripts/qc-correctness-regression-fixtures.json",
    ".gitignore",  # repo config: names the client folders it ignores
    "tools/qc-prevention/",
    ".claude/test/",
    # Generated output.
    "lighthouse-report.",
    "plugins/sgs-blocks/.phpunit.cache/",
    "plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl",
    ".claude/memory/",
    "memory/",
    "tests/golden/",
    "vendor/",
    "node_modules/",
)

# Operational identifiers that keep a name until the thing they identify is renamed.
# (path glob, reason). A glob is matched with Path.match against the repo-relative path.
ALLOWLIST: Tuple[Tuple[str, str], ...] = (
    (
        "plugins/sgs-blocks/scripts/push-theme-snapshot.py",
        "SAFE_TARGETS and the target-to-secrets map name the production site as a deploy target",
    ),
    (
        "scripts/qc_anti_cheat_checks.py",
        "CLIENT_SLUGS is the list of names this QC check forbids in framework code",
    ),
    (
        "plugins/sgs-blocks/scripts/build-deploy.py",
        "TARGETS keys name each client's own test site; a deploy target is an operational "
        "identifier until the target registry moves into sites/<client>/",
    ),
)

# A pointer INTO a client or reference folder is how framework docs legitimately reach that
# material ("see sites/<client>/CLAUDE.md"), so a path that starts with one of these roots is
# blanked before the names are matched. The names inside the path stay in the exempt folder.
POINTER_RE = re.compile(r"[\w./\-]*(?:nav-qa|gate3c)/[\w./\-]*|[\w-]*(?:tree\.json|parity-[\w-]+\.mjs)|(?:\.\./|\./)*(?:sites|reference|reports|pipeline-state|\.claude/(?:secrets|reports|archive))/[\w.\-/\ ]*", re.IGNORECASE)

# Operational identifiers that name a client's own test site (deploy target keys and the env files
# and keys that go with them, and the local WSL mirror keys). They stay until the target registry moves into sites/<client>/;
# listed here so the survey counts them instead of hiding them, and so a rename is one decision.
OPERATIONAL_TOKENS = re.compile(
    r"(?:local-eye-care|eye-care-test|indus-test|eye-care-ward-end|EYECARETEST|INDUSTEST|EYECARE)", re.IGNORECASE
)

# Content is scanned only in text files; these suffixes are skipped outright.
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".svgz", ".woff", ".woff2",
    ".ttf", ".otf", ".eot", ".pdf", ".zip", ".gz", ".phar", ".db", ".sqlite", ".mp4", ".webm",
    ".mp3", ".wav", ".lock",
}
MAX_BYTES = 2_000_000


# ---------------------------------------------------------------------------------------------
# DETECTOR
# ---------------------------------------------------------------------------------------------

COMPILED = {key: re.compile(rx, re.IGNORECASE) for key, rx in NAMES.items()}


def tracked_files(root: Path) -> List[str]:
    """Tracked plus untracked-but-not-ignored files (so a new file is checked before it is committed)."""
    out = subprocess.run(
        ["git", "ls-files", "-co", "--exclude-standard", "-z"],
        cwd=root, capture_output=True, check=True,
    ).stdout.decode("utf-8", "replace")
    return [p for p in out.split("\0") if p]


def is_exempt(rel: str) -> bool:
    name = rel.rsplit("/", 1)[-1]
    if name.endswith(".md"):
        return True  # prose docs may name clients; the rule covers code and file names
    if name.startswith("test_") or name.endswith(("_test.py", ".test.mjs", ".test.js", "Test.php")):
        return True  # test code (see EXEMPT_PREFIXES)
    return any(rel.startswith(prefix) for prefix in EXEMPT_PREFIXES)


def allow_reason(rel: str) -> Optional[str]:
    for glob, reason in ALLOWLIST:
        if Path(rel).match(glob):
            return reason
    return None


def blank_allowed(text: str) -> str:
    """Remove pointers into sites/ and reference/ and the operational test-site tokens."""
    return OPERATIONAL_TOKENS.sub(" ", POINTER_RE.sub(" ", text))


def names_in(text: str) -> List[str]:
    cleaned = blank_allowed(text) if any(rx.search(text) for rx in COMPILED.values()) else text
    return [key for key, rx in COMPILED.items() if rx.search(cleaned)]


def scan(root: Path) -> Iterator[Tuple[str, str, str, int]]:
    """Yield (kind, path, name_key, count) for every hit: kind is 'content' or 'filename'."""
    for rel in tracked_files(root):
        if is_exempt(rel):
            continue
        for key in names_in(rel):
            yield ("filename", rel, key, 1)
        path = root / rel
        if path.suffix.lower() in BINARY_SUFFIXES or not path.is_file():
            continue
        try:
            if path.stat().st_size > MAX_BYTES:
                continue
            raw = path.read_bytes()
        except OSError:
            continue
        if b"\0" in raw[:4096]:
            continue
        text = raw.decode("utf-8", "replace")
        if not any(rx.search(text) for rx in COMPILED.values()):
            continue  # the common case: no name at all, so skip the pointer blanking
        cleaned = blank_allowed(text)
        for key, rx in COMPILED.items():
            n = len(rx.findall(cleaned))
            if n:
                yield ("content", rel, key, n)


def area_of(rel: str) -> str:
    parts = rel.split("/")
    if parts[0] in (".claude", "plugins", "theme") and len(parts) > 1:
        return "/".join(parts[:2])
    return parts[0] if len(parts) > 1 else "(repo root)"


def collect(root: Path) -> Tuple[List[Tuple[str, str, str, int]], List[Tuple[str, str, str, int, str]]]:
    live: List[Tuple[str, str, str, int]] = []
    allowed: List[Tuple[str, str, str, int, str]] = []
    for kind, rel, key, n in scan(root):
        reason = allow_reason(rel)
        if reason and kind == "content":
            allowed.append((kind, rel, key, n, reason))
        else:
            live.append((kind, rel, key, n))
    return live, allowed


def survey(root: Path, list_files: bool) -> int:
    live, allowed = collect(root)
    files = {rel for _, rel, _, _ in live}
    name_files = sorted({rel for k, rel, _, _ in live if k == "filename"})
    print(f"Client and reference-site names outside the exempt folders: {len(files)} file(s) with a hit "
          f"({sum(1 for k, *_ in live if k == 'content')} content hit group(s), {len(name_files)} file name(s)).")
    print(f"Allowlisted operational identifiers: {len(allowed)} hit group(s).\n")
    by_area: Counter = Counter()
    by_name: Counter = Counter()
    for _, rel, key, n in live:
        by_area[area_of(rel)] += 1
        by_name[key] += 1
    print("By area (file+name pairs):")
    for area, n in by_area.most_common():
        print(f"  {n:5d}  {area}")
    print("\nBy name (file+name pairs):")
    for key, n in by_name.most_common():
        print(f"  {n:5d}  {key}")
    if list_files:
        print("\nFile names to rename:")
        for rel in name_files:
            print(f"  {rel}")
        print("\nFiles with content hits (path: names):")
        grouped: Dict[str, List[str]] = {}
        for kind, rel, key, n in live:
            if kind == "content":
                grouped.setdefault(rel, []).append(f"{key}x{n}")
        for rel in sorted(grouped):
            print(f"  {rel}: {', '.join(sorted(grouped[rel]))}")
    for _, rel, key, n, reason in allowed:
        print(f"\n[allowlisted] {rel}: {key}x{n}\n    {reason}")
    return 0


def check(root: Path) -> int:
    live, _ = collect(root)
    if not live:
        print("[no-client-names] PASS: no client or reference-site name outside sites/, reference/ and the exempt records.")
        return 0
    files = sorted({rel for _, rel, _, _ in live})
    print(f"[no-client-names] FAIL: {len(files)} file(s) name a client or reference site. First 40:")
    for rel in files[:40]:
        names = sorted({f"{k[0]}:{key}" for k, r, key, _ in live if r == rel})
        print(f"  {rel}  [{', '.join(names)}]")
    print("Run `python scripts/check-no-client-names.py --survey --files` for the full list.")
    return 1


def self_test() -> int:
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        (root / "plugins").mkdir()
        (root / "sites" / "x").mkdir(parents=True)
        (root / "plugins" / "a.php").write_text("// the Indus Foods header", encoding="utf-8")
        (root / "plugins" / "clean.php").write_text("// a wholesale client's header", encoding="utf-8")
        (root / "plugins" / "eye-care-note.php").write_text("generic", encoding="utf-8")
        (root / "sites" / "x" / "b.md").write_text("Indus Foods and lamalama", encoding="utf-8")
        live, _ = collect(root)
        got = {(k, rel) for k, rel, _, _ in live}
        expected = {("content", "plugins/a.php"), ("filename", "plugins/eye-care-note.php")}
        if got != expected:
            print(f"[self-test] FAIL: expected {sorted(expected)}, got {sorted(got)}")
            return 1
    print("[self-test] PASS: the planted names are caught, a clean file and the exempt folder are ignored.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--survey", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--self-test", action="store_true")
    parser.add_argument("--files", action="store_true", help="With --survey, list every offending file.")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.survey:
        return survey(REPO, args.files)
    return check(REPO)


if __name__ == "__main__":
    sys.exit(main())
