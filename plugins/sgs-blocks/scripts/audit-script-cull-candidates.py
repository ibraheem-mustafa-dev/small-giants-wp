#!/usr/bin/env python3
"""audit-script-cull-candidates.py — measured signals for a script-library cull.

WHY MEASURED, NOT JUDGED
------------------------
Bean asked how many of the 500+ scripts are pointless / one-time / non-functional /
bloated / duplicated. The obvious way to answer is to read names and headers and sort
them into piles. That is precisely the method that just failed: a triage pass over 52
scripts got 13 wrong (25%) by trusting directory names and docstrings, including one
docstring whose central factual claim ("idempotent — re-running finds zero refinements")
was FALSE against the live database.

So every signal here is computed from the file itself, and each one is a CANDIDATE
SIGNAL, never a verdict. Deleting a script is irreversible; mislabelling one as dead is
how a mandatory go-live gate ends up in a discard pile.

SIGNALS
-------
  BROKEN        does not parse. A script that cannot be imported cannot be run.
                Python via ast.parse; JS via node --check.
                ⚠ node --check is VACUOUS on an ES module with a top-level import — it
                returns 0 on genuinely broken code. Those are re-checked as .mjs.
  BLOAT         size outliers, reported as a distribution, not a fixed threshold. A big
                file is not automatically bloat: a 500-line codemod with a self-test may
                be exactly right. This flags candidates for a human to look at.
  DUPLICATE     near-identical code, by Jaccard similarity over normalised token
                shingles. Comments and whitespace are stripped first, so two files
                differing only in prose do not read as distinct.
  SUBJECT-DUPE  different code, same SUBJECT — the family this repo actually suffers
                from ("census-*", "survey-*", "audit-*", "check-*", "probe-*" all
                circling one topic). Grouped by subject keyword, not by verb.
  NO-ENTRY      no CLI entry point at all (no argparse, no process.argv, no main guard).
                Usually a MODULE, not a script — which is why this is a signal and not a
                finding: a module with importers is correct as it is.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
It does not recommend deleting anything. It cannot see whether a script is cited by name
in a spec (wc-pages-responsive-audit.js is gate RA-1 in the go-live checklist and would
otherwise look perfectly cullable), or whether its --check guards a completed migration.
Cross-reference every candidate against the reachability audit and the revival register
before acting on it.

Usage:
    python plugins/sgs-blocks/scripts/audit-script-cull-candidates.py
    python plugins/sgs-blocks/scripts/audit-script-cull-candidates.py --json out.json
    python plugins/sgs-blocks/scripts/audit-script-cull-candidates.py --self-test

UK English throughout.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent
REPO = PLUGIN.parent.parent
SCRIPT_ROOTS = [PLUGIN / "scripts", REPO / "scripts", REPO / ".claude" / "scripts",
                REPO / ".claude" / "hooks",
                REPO / ".claude" / "skills" / "wp-sgs-deploy" / "scripts"]
SKIP_PARTS = {"__pycache__", "node_modules", "fixtures", ".pytest_cache", "build"}
RUNNABLE = (".py", ".js", ".mjs")

# Subjects this library circles repeatedly. Grouping is by SUBJECT because the verb is
# the unreliable half — the same idea ships as census-/survey-/audit-/check-/probe-.
SUBJECTS = ["colour", "gradient", "token", "element", "parity", "inline", "responsive",
            "attr", "role", "block-json", "render", "overflow", "shadow", "spacing",
            "typography", "variant", "coverage", "motion", "fx", "nav", "container"]


def discover() -> list[Path]:
    out = []
    for root in SCRIPT_ROOTS:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.suffix in RUNNABLE and not SKIP_PARTS & set(p.parts):
                out.append(p)
    return sorted(set(out))


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


# ---------------------------------------------------------------------------
# BROKEN
# ---------------------------------------------------------------------------
def parses(p: Path, text: str) -> tuple[bool, str]:
    if p.suffix == ".py":
        try:
            ast.parse(text)
            return True, ""
        except SyntaxError as exc:
            return False, f"SyntaxError line {exc.lineno}: {exc.msg}"
    # JS/MJS. `node --check` is VACUOUS on an ES module with a top-level import: it
    # exits 0 on broken code. Re-check as .mjs when the file looks like a module.
    try:
        r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            return False, (r.stderr or "").strip().splitlines()[0][:140] if r.stderr else "node --check failed"
        if p.suffix == ".js" and re.search(r"^\s*(import|export)\s", text, re.M):
            tmp = p.with_suffix(".__cullcheck.mjs")
            try:
                tmp.write_text(text, encoding="utf-8")
                r2 = subprocess.run(["node", "--check", str(tmp)],
                                    capture_output=True, text=True, timeout=30)
                if r2.returncode != 0:
                    return False, "ESM re-check: " + ((r2.stderr or "").strip().splitlines()[0][:120])
            finally:
                tmp.unlink(missing_ok=True)
        return True, ""
    except FileNotFoundError:
        return True, "node unavailable — UNVERIFIED"
    except subprocess.TimeoutExpired:
        return True, "node --check timed out — UNVERIFIED"


# ---------------------------------------------------------------------------
# DUPLICATE
# ---------------------------------------------------------------------------
_PY_COMMENT = re.compile(r"#.*?$", re.M)
_JS_LINE = re.compile(r"//.*?$", re.M)
_BLOCK = re.compile(r"/\*.*?\*/", re.S)
_DOCSTR = re.compile(r'("""|\'\'\')(?:.|\n)*?\1')


def normalised_tokens(p: Path, text: str) -> list[str]:
    """Code tokens with comments and docstrings removed.

    Stripping prose first is load-bearing: two files whose only real difference is
    their header would otherwise read as distinct, and two genuine copies whose
    comments were reworded would read as unrelated.
    """
    t = text
    if p.suffix == ".py":
        t = _DOCSTR.sub(" ", t)
        t = _PY_COMMENT.sub(" ", t)
    else:
        t = _BLOCK.sub(" ", t)
        t = _JS_LINE.sub(" ", t)
    return re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", t)


def shingles(toks: list[str], n: int = 5) -> set:
    return {tuple(toks[i:i + n]) for i in range(max(0, len(toks) - n + 1))}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ---------------------------------------------------------------------------
# NO-ENTRY
# ---------------------------------------------------------------------------
def has_entry(p: Path, text: str) -> bool:
    if p.suffix == ".py":
        return bool(re.search(r"__main__|argparse|sys\.argv", text))
    return bool(re.search(r"process\.argv|require\.main|yargs|commander", text))


def analyse() -> dict:
    files = discover()
    rows, tok_index = [], {}
    for p in files:
        text = read(p)
        ok, why = parses(p, text)
        toks = normalised_tokens(p, text)
        tok_index[p] = shingles(toks)
        rows.append({
            "script": p.relative_to(REPO).as_posix(),
            "lines": text.count("\n") + 1,
            "code_tokens": len(toks),
            "parses": ok,
            "parse_error": why,
            "has_entry_point": has_entry(p, text),
            "is_test": p.name.startswith("test_") or "tests" in p.parts,
        })

    # DUPLICATE pairs — only compare files with enough substance to be meaningful.
    dupes = []
    cands = [p for p in files if len(tok_index[p]) >= 40]
    for i, a in enumerate(cands):
        for b in cands[i + 1:]:
            s = jaccard(tok_index[a], tok_index[b])
            if s >= 0.45:
                dupes.append({"a": a.relative_to(REPO).as_posix(),
                              "b": b.relative_to(REPO).as_posix(),
                              "similarity": round(s, 3)})
    dupes.sort(key=lambda d: -d["similarity"])

    # SUBJECT families.
    fam = defaultdict(list)
    for p in files:
        n = p.name.lower()
        for s in SUBJECTS:
            if s in n:
                fam[s].append(p.relative_to(REPO).as_posix())
    families = {k: v for k, v in sorted(fam.items(), key=lambda kv: -len(kv[1])) if len(v) >= 3}

    ln = sorted(r["lines"] for r in rows)
    def pct(q):
        return ln[min(len(ln) - 1, int(len(ln) * q))] if ln else 0

    return {
        "_meta": {
            "generated_by": "audit-script-cull-candidates.py",
            "caveat": "CANDIDATE SIGNALS, NEVER VERDICTS. This tool cannot see that a "
                      "script is named as a mandatory gate in a spec, or that its --check "
                      "guards a completed migration. Cross-reference the reachability "
                      "audit and the revival register before acting on anything here.",
        },
        "totals": {
            "scripts": len(rows),
            "tests": sum(1 for r in rows if r["is_test"]),
            "broken": sum(1 for r in rows if not r["parses"]),
            "no_entry_point": sum(1 for r in rows if not r["has_entry_point"]),
        },
        "size_distribution": {"p50": pct(.5), "p75": pct(.75), "p90": pct(.9),
                              "p99": pct(.99), "max": ln[-1] if ln else 0},
        "broken_scripts": [r for r in rows if not r["parses"]],
        "duplicate_pairs": dupes,
        "subject_families": families,
        "largest": sorted(rows, key=lambda r: -r["lines"])[:25],
        "scripts": rows,
    }


def self_test() -> int:
    """Prove each signal can fire, including a negative control per signal."""
    import tempfile
    ok = True
    def chk(label, cond, detail=""):
        nonlocal ok
        print(f"  [{'PASS' if cond else 'FAIL'}] {label} {detail}")
        if not cond:
            ok = False

    with tempfile.TemporaryDirectory() as td:
        d = Path(td)
        good = d / "good.py"; good.write_text("import os\nprint(os.getcwd())\n", encoding="utf-8")
        bad = d / "bad.py"; bad.write_text("def broken(:\n", encoding="utf-8")
        chk("BROKEN fires on invalid syntax", parses(bad, read(bad))[0] is False)
        chk("NEGATIVE CONTROL: valid file is not BROKEN", parses(good, read(good))[0] is True)

        # DUPLICATE: identical logic, different prose, must still read as duplicate.
        body = "\n".join(f"value_{i} = compute_thing(alpha_{i}, beta_{i})" for i in range(40))
        p1 = d / "one.py"; p1.write_text('"""A."""\n' + body, encoding="utf-8")
        p2 = d / "two.py"; p2.write_text('"""Totally different prose."""\n' + body, encoding="utf-8")
        s = jaccard(shingles(normalised_tokens(p1, read(p1))), shingles(normalised_tokens(p2, read(p2))))
        chk("DUPLICATE sees through differing prose", s > 0.9, f"similarity={s:.2f}")

        p3 = d / "three.py"
        p3.write_text("\n".join(f"other_{i} = unrelated(gamma_{i})" for i in range(40)), encoding="utf-8")
        s2 = jaccard(shingles(normalised_tokens(p1, read(p1))), shingles(normalised_tokens(p3, read(p3))))
        chk("NEGATIVE CONTROL: unrelated files are not duplicates", s2 < 0.2, f"similarity={s2:.2f}")

        m = d / "mod.py"; m.write_text("def helper():\n    return 1\n", encoding="utf-8")
        chk("NO-ENTRY fires on a module", has_entry(m, read(m)) is False)
        chk("NEGATIVE CONTROL: argparse counts as an entry point",
            has_entry(good, "import argparse") is True)

    print("\nself-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", type=Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    res = analyse()
    t = res["totals"]
    print(f"scripts: {t['scripts']}  (tests {t['tests']})")
    print(f"BROKEN (do not parse): {t['broken']}")
    for b in res["broken_scripts"]:
        print(f"    {b['script']} — {b['parse_error']}")
    print(f"NO ENTRY POINT (likely modules, not scripts): {t['no_entry_point']}")
    sd = res["size_distribution"]
    print(f"\nsize: p50={sd['p50']} p75={sd['p75']} p90={sd['p90']} p99={sd['p99']} max={sd['max']} lines")
    print(f"\nNEAR-DUPLICATE PAIRS (>=0.45 token similarity): {len(res['duplicate_pairs'])}")
    for p in res["duplicate_pairs"][:20]:
        print(f"    {p['similarity']:.2f}  {p['a']}\n           {p['b']}")
    print(f"\nSUBJECT FAMILIES (>=3 scripts naming the same subject): {len(res['subject_families'])}")
    for k, v in list(res["subject_families"].items())[:12]:
        print(f"    {len(v):3}  {k}")
    print("\n⚠ CANDIDATE SIGNALS, NOT VERDICTS — see _meta.caveat.")
    if args.json:
        args.json.write_text(json.dumps(res, indent=2) + "\n", encoding="utf-8")
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
