#!/usr/bin/env python3
"""audit-script-reachability.py — which scripts in this library actually RUN, and how.

WHY THIS EXISTS
---------------
Bean, 2026-08-24: "the whole point of this is auditing all scripts so that we preserve
and catalogue all useful scripts, especially scripts that are dead because a lot of the
time they had a great use but we forgot to wire them in and now they look dead but they
may not be vestigial so it'd be worth reviving them."

So this tool does NOT hunt for things to delete. "No caller" is the signal for a
QUESTION, never a verdict:

    SUPERSEDED  — unwired AND something else now does the job   -> retire, name the replacement
    ORPHANED    — unwired AND nothing else does this            -> REVIVE, this is the point

Only reading the code separates those two, so this tool emits a CANDIDATE LIST and
stops. A detector that emitted "delete these 94" would destroy working tools with a
confident, precise, wrong number. Precedent from the same day: `borderRow.js` had zero
adopters and was explicitly not rot.

REACHABILITY CHANNELS (a script is WIRED if ANY hits)
-----------------------------------------------------
  npm          package.json scripts (prebuild and every other entry)
  commit-gate  .githooks/*
  hook         .claude/hooks/*
  skill        ~/.claude/skills/**  (operator-invoked slash commands)
  manifest     any *.json that registers it (inspector-scan/rules.json does exactly this)
  script-call  another script imports, requires, or subprocess-invokes it
  doc-only     named ONLY in prose -> candidate

FALSE-POSITIVE CLASSES ALREADY FOUND AND FIXED — each cost a wrong number first:
  1. TESTS. pytest discovers `test_*.py` by convention, so nothing ever names them.
     A filename-reference detector reports every test as unreferenced. First run:
     29 "unreferenced", ALL of them tests. Excluded here, with this reason recorded.
  2. MODULE-STYLE REFERENCES. Python drops the extension — `_load_sibling("check_bound_emit")`
     and `from converter.context import ...` contain no ".py". Matching filenames alone
     reported all 8 cheat-gate checks as unwired while run.py loads every one.
     131 -> 94 once import-aware patterns were added.
  3. MANIFEST REGISTRATION. `inspector-scan/rules.json` registers 16 rule modules that
     nothing imports by name. They are wired through data, not code.

⚠ A bare module stem is a common English word (`models`, `context`, `adopt`), so stems
are matched ONLY inside import/require/dynamic-load syntax, never as free text. Matching
them loosely would flip the error from under- to over-detection.

Usage:
    python plugins/sgs-blocks/scripts/audit-script-reachability.py
    python plugins/sgs-blocks/scripts/audit-script-reachability.py --json out.json
    python plugins/sgs-blocks/scripts/audit-script-reachability.py --self-test

UK English throughout.
"""
from __future__ import annotations

import argparse
import sys as _sys
# Windows consoles default to cp1252 and raise UnicodeEncodeError on the
# warning glyphs this tool prints. Reconfigure before any output.
try:
    _sys.stdout.reconfigure(encoding='utf-8')
    _sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent
REPO = PLUGIN.parent.parent
# ⚠ THIS SET MUST MATCH generate-tooling-catalogue.py's SCRIPT_DIR_GLOBS and
# _RUNNABLE. The catalogue renders a "Wired" column from this audit; when the
# audit covered a NARROWER set (2 roots, .py/.js only) the catalogue showed a
# dash for 64 files the audit had never evaluated — conflating "no execution
# path found" with "never looked at", which is precisely the misleading signal
# this whole exercise exists to remove.
SCRIPT_ROOTS = [PLUGIN / "scripts", REPO / "scripts", REPO / ".claude" / "scripts",
                REPO / ".claude" / "hooks",
                REPO / ".claude" / "skills" / "wp-sgs-deploy" / "scripts"]
RUNNABLE_SUFFIXES = (".py", ".js", ".mjs", ".php", ".sh")
SKIP_PARTS = {"__pycache__", "node_modules", "fixtures", ".pytest_cache", "build"}


def is_test(p: Path) -> bool:
    """pytest finds these by NAME CONVENTION — nothing references them. Not dead."""
    return p.name.startswith("test_") or p.name == "conftest.py" or "tests" in p.parts


def discover() -> list[Path]:
    out: list[Path] = []
    for root in SCRIPT_ROOTS:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.suffix not in RUNNABLE_SUFFIXES:
                continue
            if SKIP_PARTS & set(p.parts):
                continue
            out.append(p)
    return sorted(set(out))


# ---------------------------------------------------------------------------
# PERFORMANCE — why this extracts rather than matches per-script.
# ---------------------------------------------------------------------------
# The first design compiled one pattern PER SCRIPT and ran every pattern against
# every file: ~3,700 files x ~430 scripts = ~1.6M regex searches per pass, and the
# self-test needs three passes. It produced no output in ten minutes. A tool nobody
# will wait for is a tool nobody runs, which is the failure this audit exists to fix.
#
# Inverted: read each file ONCE, extract the set of things it REFERENCES, then
# intersect with the script inventory. O(files) instead of O(files x scripts).

# A path-ish token: filenames with extensions, e.g. `run.js`, `check_bound_emit.py`.
# ⛔ NO BACKSLASHES IN THIS PATTERN, deliberately. It was first written with a
# trailing word-boundary escape, and an intermediate edit turned those two
# characters into a single 0x08 BACKSPACE byte. The pattern then demanded a
# literal backspace after ".js" and matched nothing — while printing IDENTICALLY
# to a correct one, because a backspace is invisible. Only od -c showed it.
# "-" last in the class needs no escape; "[.]" replaces an escaped dot.
# ⛔ THE SUFFIX LIST HERE MUST MATCH RUNNABLE_SUFFIXES. When discovery was widened
# to .mjs/.php but this was not, those files could be FOUND yet never CREDITED —
# `node scripts/motion-qa/run-live-probes.mjs` sits in package.json and the probe
# still read as UNREFERENCED, because ".mjs" contains no ".js" the pattern can see.
# A file the extractor cannot name is invisible no matter how many callers it has.
_FILE_TOKEN = re.compile(r"[A-Za-z0-9_.-]+[.](?:py|mjs|js|php|sh)")

# Module references, where the extension is ABSENT — the class that made the first
# run report all 8 cheat-gate checks as unwired while run.py loads every one.
# ⛔ WORD BOUNDARIES ARE BUILT VIA _B, NEVER WRITTEN AS A LITERAL ESCAPE.
# "\b" is a VALID Python string escape (backspace, 0x08) — unlike "\s"/"\w",
# which are not. So when one of these lines passed through a non-raw context
# during an edit, every boundary silently became a 0x08 byte and the patterns
# matched NOTHING. The tool then reported 318 scripts as unreferenced. The
# printed pattern looked correct throughout, because a backspace is invisible.
_B = chr(92) + "b"

_MODULE_REFS = [
    re.compile(_B + r"import\s+([\w.]+)"),
    re.compile(_B + r"from\s+([\w.]+)\s+import" + _B),
    re.compile(r"""require\(\s*["']([^"']+)["']"""),
    re.compile(_B + r"""from\s+["']([^"']+)["']"""),
    # Bare quoted string — importlib / _load_sibling("stem") / a JSON manifest.
    # MUST allow a leading digit: inspector-scan rules are "27-superseded-link-control".
    # Safe to over-match: results are intersected against the real script inventory.
    re.compile(r"""["']([\w][\w-]{2,})["']"""),
]


# ---------------------------------------------------------------------------
# DYNAMIC DISPATCH BY CONSTRUCTED MODULE PATH — false-positive class #6.
# ---------------------------------------------------------------------------
# migrate-core-blocks/driver.py:303 does:
#     module_name = 'pairings.' + slug.replace('-', '_') + '_pairing'
#     importlib.import_module(module_name)
# The module name NEVER EXISTS AS A LITERAL anywhere, so no amount of string
# matching can find it — this class is invisible to the extraction above by
# construction, not by oversight. A triage agent reported all of these as
# unwired; they are fully reachable, both by hand and automatically.
#
# Detected structurally instead: find a literal package prefix handed to
# import_module() via concatenation, then credit EVERY module in that package
# directory. Coarse on purpose — it credits a whole directory, which risks
# hiding an unused sibling, but the alternative is presenting live, working
# tools as deletion candidates.
_DYNAMIC_PKG = re.compile(r"""import_module\(\s*['"]([\w]+)[.]""")
_DYNAMIC_PKG_VAR = re.compile(r"""['"]([\w]+)[.]['"]\s*\+""")


def dynamic_packages(text: str) -> set:
    """Package prefixes whose modules are loaded by a constructed name."""
    out = set(_DYNAMIC_PKG.findall(text))
    if "import_module(" in text:
        out |= set(_DYNAMIC_PKG_VAR.findall(text))
    return out


def references(text: str) -> set:
    """Everything this file could be naming: filenames, and module stems."""
    out = set(_FILE_TOKEN.findall(text))
    for rx in _MODULE_REFS:
        for m in rx.findall(text):
            tail = m.replace("/", ".").split(".")[-1]
            if tail:
                out.add(tail)
    return out



def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def channel_files() -> list[tuple[str, list[Path]]]:
    home = Path.home()
    return [
        ("npm", [REPO / "package.json", PLUGIN / "package.json"]),
        # ⚠ Claude Code hooks are REGISTERED IN SETTINGS, not called by name from
        # code. Without this channel, git-path-scope-guard.py and
        # memory-cap-guard.py read as UNREFERENCED while firing on every
        # matching tool call. Eighth false-positive class.
        ("settings", [REPO / ".claude" / "settings.json",
                      REPO / ".claude" / "settings.local.json"]),
        ("commit-gate", sorted((REPO / ".githooks").glob("*")) if (REPO / ".githooks").exists() else []),
        ("hook", sorted((REPO / ".claude" / "hooks").glob("*")) if (REPO / ".claude" / "hooks").exists() else []),
        ("skill", sorted(p for p in (home / ".claude" / "skills").rglob("*")
                         if p.is_file() and p.suffix in (".md", ".py", ".js", ".json"))
         if (home / ".claude" / "skills").exists() else []),
        # Registration-by-data. inspector-scan/rules.json is the proven instance.
        ("manifest", sorted(p for root in SCRIPT_ROOTS if root.exists()
                            for p in root.rglob("*.json") if not SKIP_PARTS & set(p.parts))),
    ]


def executed_tests(tests: list) -> list:
    """Only the test files pytest is ACTUALLY told to run.

    ⚠ Scanning every test file over-credits. `coverage-matrix/tests/` and
    several others exist but are NOT in package.json's pytest invocation, so a
    module imported only from there runs on NO build. Crediting it would mark a
    genuine revival candidate as WIRED — hiding exactly what this audit exists
    to surface. Over-crediting is the expensive error here, not under-crediting.

    Parsed from the prebuild chain rather than hardcoded, so adding a test
    directory to package.json automatically widens this.
    """
    import json as _json
    pkg = PLUGIN / "package.json"
    if not pkg.exists():
        return []
    try:
        blob = _json.loads(pkg.read_text(encoding="utf-8"))
    except Exception:
        return []
    chain = " ".join(str(v) for v in blob.get("scripts", {}).values())
    roots = [m for m in re.findall(r"(scripts/[\w/-]*tests/)", chain)]
    if not roots:
        return []
    keep = []
    for t in tests:
        rel = t.as_posix()
        if any(("plugins/sgs-blocks/" + r) in rel or rel.endswith(r.rstrip("/")) or r in rel
               for r in roots):
            keep.append(t)
    return keep


def audit() -> dict:
    scripts = discover()
    prod = [p for p in scripts if not is_test(p)]
    tests = [p for p in scripts if is_test(p)]

    # Inventory: filename -> script, and module stem -> script. A stem can be
    # ambiguous (two `models.py` in different packages), so it maps to a LIST and
    # a hit credits every candidate. That over-credits rather than under-credits:
    # wrongly calling something WIRED hides a revival candidate, but wrongly calling
    # a live tool unwired invites deleting it. Bias to the safer error.
    by_name: dict[str, list[Path]] = {}
    by_stem: dict[str, list[Path]] = {}
    for p in prod:
        by_name.setdefault(p.name, []).append(p)
        by_stem.setdefault(p.stem, []).append(p)

    exec_ch: dict[Path, set] = {p: set() for p in prod}
    doc_ch: dict[Path, set] = {p: set() for p in prod}

    def scan(files, bucket, label):
        for f in files:
            if not f.is_file():
                continue
            txt = read(f)
            if not txt:
                continue
            # Credit whole packages loaded by a CONSTRUCTED module name.
            for pkg in dynamic_packages(txt):
                pkg_dir = f.parent / pkg
                if pkg_dir.is_dir():
                    for mod in pkg_dir.glob("*.py"):
                        if mod.name != "__init__.py" and mod in bucket:
                            bucket[mod].add(label + "(dynamic)")
            refs = references(txt)
            for r in refs:
                for target in by_name.get(r, []) + by_stem.get(r, []):
                    if target == f:
                        continue      # a file never references itself
                    bucket[target].add(label)

    for label, files in channel_files():
        scan(files, exec_ch, label)
    scan(prod, exec_ch, "script-call")
    # ⚠ TESTS ARE A REAL EXECUTION PATH — false-positive class #7.
    # package.json prebuild runs `python -m pytest scripts/oracle/tests/
    # scripts/converter/tests/`, so a module imported ONLY by a test file runs on
    # every build. Tests are excluded from the CANDIDATE list (nothing names them,
    # so their own absence of callers is meaningless) but they must still be
    # SCANNED as a channel. Without this, coverage_report.py, draft_oracle.py,
    # metamorphic.py and run_canary_proof.py all read as unwired while running on
    # every single build.
    scan(executed_tests(tests), exec_ch, "test-import")
    # ⚠ Scan EVERY markdown file in the repo, not just the ones beside the
    # scripts. Limiting this to SCRIPT_ROOTS + .claude missed
    # plugins/sgs-blocks/CLAUDE.md — which documents dozens of scripts — and
    # reported 317 as unreferenced when the true figure was 0.
    scan([p for p in REPO.rglob("*.md") if not SKIP_PARTS & set(p.parts)],
         doc_ch, "doc")

    rows = []
    for p in prod:
        via = sorted(exec_ch[p])
        rows.append({
            "script": p.relative_to(REPO).as_posix(),
            "verdict": "WIRED" if via else ("DOC-ONLY" if doc_ch[p] else "UNREFERENCED"),
            "wired_via": via,
        })
    rows.sort(key=lambda r: (r["verdict"] != "UNREFERENCED", r["verdict"] != "DOC-ONLY", r["script"]))
    return {
        "_meta": {
            "generated_by": "audit-script-reachability.py",
            "tests_excluded": len(tests),
            "tests_excluded_reason": "pytest discovers test_*.py by name convention; "
                                     "nothing references them, so absence of a caller "
                                     "carries no information about them",
            "candidate_note": "DOC-ONLY and UNREFERENCED are CANDIDATES FOR TRIAGE, not "
                              "deletions. Unwired means SUPERSEDED (retire) or ORPHANED "
                              "(revive) and only reading the code tells you which.",
            "ambiguity_note": "A module stem shared by two files credits both. Deliberate: "
                              "over-crediting hides a revival candidate, under-crediting "
                              "invites deleting a live tool.",
        },
        "counts": dict(Counter(r["verdict"] for r in rows)),
        "scripts": rows,
    }



def self_test() -> int:
    """Prove the detector can distinguish the three classes it claims to."""
    ok = True
    checks = []
    res = audit()
    by = {r["script"]: r for r in res["scripts"]}

    def check(label, cond, detail):
        nonlocal ok
        checks.append((label, cond, detail))
        if not cond:
            ok = False

    # A: a manifest-registered rule must read WIRED (regression guard for the
    #    false-positive class that reported 16 live rules as unwired).
    rule = "plugins/sgs-blocks/scripts/inspector-scan/rules/27-superseded-link-control.js"
    check("manifest-registered rule is WIRED",
          rule in by and by[rule]["verdict"] == "WIRED",
          by.get(rule, {}).get("wired_via"))

    # B: a dynamically loaded cheat-gate check must read WIRED (module-stem class).
    cg = "plugins/sgs-blocks/scripts/cheat-gate/check_bound_emit.py"
    check("dynamically loaded check is WIRED",
          cg in by and by[cg]["verdict"] == "WIRED",
          by.get(cg, {}).get("wired_via"))

    # C: no test file may appear at all.
    check("tests excluded entirely",
          not any("/tests/" in r["script"] or Path(r["script"]).name.startswith("test_")
                  for r in res["scripts"]),
          f"{res['_meta']['tests_excluded']} excluded")

    # D: NEGATIVE CONTROL — a script nothing could reach must NOT read WIRED, or the
    #    detector is credulous and every verdict above is meaningless.
    # ⛔ The probe filename is ASSEMBLED, never written as a literal. Spelling it
    # out here puts the name in THIS file, the detector correctly finds that
    # reference, and the control reports WIRED — a control that defeats itself.
    # It first "passed" only because _FILE_TOKEN was broken by a stray backspace
    # and matched nothing at all: green for the wrong reason, on a dead detector.
    probe = HERE / ("__" + "probe" + "_negctl_" + "tmp" + "." + "py")
    probe.write_text("# transient negative control\n", encoding="utf-8")
    try:
        res2 = audit()
        by2 = {r["script"]: r for r in res2["scripts"]}
        key = probe.relative_to(REPO).as_posix()
        check("NEGATIVE CONTROL: unreachable probe is not WIRED",
              key in by2 and by2[key]["verdict"] != "WIRED",
              by2.get(key, {}).get("verdict", "probe not discovered!"))
    finally:
        probe.unlink(missing_ok=True)

    for label, cond, detail in checks:
        print(f"  [{'PASS' if cond else 'FAIL'}] {label} — {detail}")
    print("\nself-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", type=Path, help="write the full result to this path")
    ap.add_argument("--self-test", action="store_true",
                    help="prove the detector can fail and can see each wiring class")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    res = audit()
    print(f"scripts audited: {len(res['scripts'])}  "
          f"(tests excluded: {res['_meta']['tests_excluded']})")
    print("counts:", res["counts"])
    print("\n⚠ DOC-ONLY / UNREFERENCED are CANDIDATES, not deletions. Unwired means")
    print("  SUPERSEDED (retire) or ORPHANED (revive) — only reading the code decides.\n")
    for r in res["scripts"]:
        if r["verdict"] != "WIRED":
            print(f"  {r['verdict']:13} {r['script']}")
    if args.json:
        args.json.write_text(json.dumps(res, indent=2) + "\n", encoding="utf-8")
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
