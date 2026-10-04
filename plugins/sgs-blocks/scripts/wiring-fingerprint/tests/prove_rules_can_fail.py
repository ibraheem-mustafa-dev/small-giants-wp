"""Prove every link and bug-class rule can fail: disable one rule at a time in a
throwaway copy of the package and confirm the fixture tests turn red.

    python scripts/wiring-fingerprint/tests/prove_rules_can_fail.py

Exits 1 if any mutant survives (a rule whose removal no test notices)."""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent

MUTANTS = {
    "L2": ("wf_links.py", 'missing.append("L2")', "pass"),
    "L3": ("wf_links.py", 'missing.append("L3-state" if state else "L3")', 'missing.append("L3-state") if state else None'),
    "L3-state": ("wf_links.py", 'missing.append("L3-state" if state else "L3")', 'missing.append("L3") if not state else None'),
    "L3-tier": ("wf_links.py", 'missing.append("L3-tier")', "pass"),
    "L4": ("wf_links.py", 'missing.append("L4")', "pass"),
    "L5": ("wf_links.py", 'missing.append("L5")', "pass"),
    "L6": ("wf_links.py", 'missing.append("L6")', "pass"),
    "L7": ("wf_links.py", 'missing.append("L7")', "pass"),
    "C1": ("wf_links.py", 'missing.append("C1")', "pass"),
    "B3": ("wf_links.py", 'missing.append("B3")', "pass"),
    "S1": ("wf_links.py", 'missing.append("S1")', "pass"),
    "B2": ("wf_links.py", 'missing.append("B2")', "pass"),
    "B1": ("wf_scan.py", "        if scoped_ctx:", "        if False:"),
    "unit-companion": ("wf_paint.py", 'return "not", "unit-companion"', "pass"),
    "suffix": ("wf_paint.py", 'return "css", "suffix:" + hit', "pass"),
    "class-rule": ("wf_paint.py", 'return "css", "class-modifier-rule"', "pass"),
    "baseline-new": ("wf_cli.py", "return 1 if args.check else 0", "return 0"),
    "advisory": ("wf_links.py", 'ADVISORY = frozenset({"L3-state"})', "ADVISORY = frozenset()"),
}


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="wf-mutants-"))
    work = tmp / "pkg"
    survivors = []
    try:
        for name, (fname, old, new) in MUTANTS.items():
            if work.exists():
                shutil.rmtree(work)
            shutil.copytree(SRC, work, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
            p = work / fname
            s = p.read_text(encoding="utf-8")
            if old not in s:
                print(f"{name:16} MUTATION TARGET MISSING: {old}")
                survivors.append(name)
                continue
            p.write_text(s.replace(old, new, 1), encoding="utf-8")
            r = subprocess.run([sys.executable, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider", "-x",
                                "--ignore=tests/test_acceptance.py"], cwd=work, capture_output=True, text=True)
            killed = r.returncode != 0
            print(f"{name:16} {'RED (killed)' if killed else 'GREEN (survived)'}", flush=True)
            if not killed:
                survivors.append(name)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("survivors:", survivors)
    return 1 if survivors else 0


if __name__ == "__main__":
    sys.exit(main())
