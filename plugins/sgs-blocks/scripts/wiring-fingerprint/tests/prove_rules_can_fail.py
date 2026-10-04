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
    # Task 2 review fixes (tests/test_review_fixes.py, tests/test_editor_facts.py).
    "loop-prefix": ("wf_frontend.py", "(loop_literals(t.src, t.mask, m.start(), vm.group(1)) if vm else [])", "[]"),
    "tuple-table": ("editor_facts.js", "tupleTablePrefixes( p );", "void 0;"),
    "array-arg-key": ("wf_channel.py", "pair = self._pair_key(stmt, s, [off]) if keyed_read else None", "pair = None"),
    "new-pair-key": ("wf_channel.py", "key = self._enclosing_pair_key(stmt, offs)", "key = None"),
    "ternary-group": ("wf_tokens.py", "continue  # `( $other ? ' x--y' : '' )`", "pass  # `( $other ? ' x--y' : '' )`"),
    "ctx-tokens": ("wf_links.py", "unconsumed = [u for u in unconsumed if u not in ch.ctx_tokens]", "pass"),
    "php-concat-selector": ("wf_css.py", "PHP_SELECTOR_CLASS_RE.finditer(t.src)", "PHP_SELECTOR_CLASS_RE.finditer('')"),
    "dynamic-var-read": ("wf_css.py", 'out.add("--" + lm.group(1) + tail)', "pass"),
    "js-cp-read": ("wf_css.py", "return {m.group(2) for m in JS_CP_ARG_RE.finditer(js) if m.group(1) not in JS_CP_WRITERS}", "return set()"),
    "class-prefix": ("wf_tokens.py", 'PREFIX_TAIL_RE.match(stmt, m.end()) and not m.group(1).endswith(("-", "_"))', "False"),
    "selector-var": ("wf_channel.py", "self._selector_vars(t, span[0], stmt, taint, ch)", "pass"),
    "c1-allowed": ("wf_bugs.py", 'return bool(allowed) and {a.split("/", 1)[-1] for a in allowed} <= set(subjects)', "return False"),
    "b1-value": ("wf_bugs.py", "if ch.value_decl or ch.cps:", "if ch.decl or ch.gate_decl or ch.cps:"),
    "derived-attrs": ("editor_facts.js", "const passes = args.some( ( a ) => derivesAttrs( a, p.scope, 0 ) );",
                      "const passes = args.some( ( a ) => a.type === 'Identifier' && ATTR_OBJ_RE.test( a.name ) );"),
    "ext-population": ("wf_scan.py", "    records += ext_records", "    pass"),
    "switch-role": ("wf_paint.py", 'return "not", "role:" + role\n        if signals.get("decl_channel"):', 'pass\n        if signals.get("decl_channel"):'),
    "effect-toggle": ("wf_paint.py", 'return "css", "effect-toggle-decl"', "pass"),
    "value-list": ("wf_tokens.py", "cm.group(1) in VALUE_LIST_FUNCS for ob in brackets", "False for ob in brackets"),
    "raw-style": ("wf_tokens.py", "m.start(1) <= r < m.end(1) for m in RAW_STYLE_RE.finditer(stmt) for r in refs", "False"),
    "flag-only": ("wf_links.py", 'and not (layout and be.canvas[attr].get("flag"))', ""),
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
