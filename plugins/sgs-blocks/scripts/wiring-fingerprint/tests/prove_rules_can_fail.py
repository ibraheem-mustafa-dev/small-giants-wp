"""Prove every link and bug-class rule can fail: disable one rule at a time in a
throwaway copy of the package and confirm the fixture tests turn red.

    python scripts/wiring-fingerprint/tests/prove_rules_can_fail.py

Exits 1 if any mutant survives (a rule whose removal no test notices)."""
import os
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent

MUTANTS = {
    "L2": ("wf_links.py", 'missing.append("L2")', "pass"),
    "L3": ("wf_links.py", 'link = "L3-state" if state else "L3"', 'link = "L3-state"'),
    "L3-state": ("wf_links.py", 'link = "L3-state" if state else "L3"', 'link = "L3"'),
    "L3-tier": ("wf_links.py", 'missing.append("L3-tier")', "pass"),
    "L4": ("wf_links.py", 'missing.append("L4")', "pass"),
    "L5": ("wf_links.py", 'missing.append("L5")', "pass"),
    "L6": ("wf_links.py", 'link = "L6-token" if live else "L6"', 'link = "L6-token"'),
    "L7": ("wf_links.py", 'missing.append("L7")', "pass"),
    "C1": ("wf_links.py", 'missing.append("C1")', "pass"),
    "B3": ("wf_links.py", 'missing.append("B3")', "pass"),
    "S1": ("wf_links.py", 'missing.append("S1")', "pass"),
    "B2": ("wf_links.py", 'missing.append("B2")', "pass"),
    "B1": ("wf_scan.py", "        if res.scoped_ctx:", "        if False:"),
    "unit-companion": ("wf_paint.py", 'return "not", "unit-companion"', "pass"),
    "suffix": ("wf_paint.py", 'return "css", "suffix:" + hit', "pass"),
    "class-rule": ("wf_paint.py", 'return "css", "class-modifier-rule"', "pass"),
    "baseline-new": ("wf_cli.py", "return 1 if args.check else 0", "return 0"),
    "advisory": ("wf_links.py", 'ADVISORY = frozenset({"L3-state", "L6-token"})', "ADVISORY = frozenset()"),
    # Task 2 review fixes (tests/test_review_fixes.py, tests/test_editor_facts.py).
    "loop-prefix": ("wf_frontend.py", "(loop_literals(t.src, t.mask, m.start(), vm.group(1)) if vm else [])", "[]"),
    "tuple-table": ("editor_facts.js", "tupleTablePrefixes( p );", "void 0;"),
    "array-arg-key": ("wf_channel.py", "pair = self._pair_key(stmt, s, [off]) if keyed_read else None", "pair = None"),
    "new-pair-key": ("wf_channel.py", "key = self._enclosing_pair_key(head, hoffs)", "key = None"),
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
    # Fix 2 (tests/test_fix2.py, tests/test_baseline.py).
    "L6-split": ("wf_links.py", 'link = "L6-token" if live else "L6"', 'link = "L6"'),
    "live-fx-named": ("wf_links.py", "{d for d in ch.fx_data if FX_RUNTIME_RE.search(d)}", "ch.fx_data"),
    "forward-detect": ("wf_channel.py", "ch.forwards |= self._forwards(stmt, refs)", "pass"),
    "forward-merge": ("wf_resolve.py", 'if sub.category == "not" or not sub.ch.kinds():', "if True:"),
    "forward-content": ("wf_resolve.py", 'if sub.category == "not" or not sub.ch.kinds():', "if not sub.ch.kinds():"),
    "gate-paint": ("wf_channel.py", "ch.gate_paint |= constant_paint_props(body)", "pass"),
    "const-value": ("wf_tokens.py", "(?=[^'\"\\s;}])", ""),
    "non-paint-props": ("wf_tokens.py", "return prop not in NON_PAINT_PROPS and not prop.startswith(NON_PAINT_PREFIXES)", "return True"),
    "control-paint": ("wf_channel.py", "if (ctl.value_decl and any(paint_prop(x) for x in ctl.decl_props)) or ctl.cps:", "if False:"),
    "reassign-only": ("wf_channel.py", "if not self._assigned_before(t, m.group(1), scope[0], s):", "if False:"),
    "toggle-classify": ("wf_paint.py", 'return "css", "toggle-paint-decl"', "pass"),
    "logical-span": ("wf_channel.py", "if ls < span[0]:", "if False:"),
    "logical-at": ("wf_channel.py", "[o + span[0] - ls for o in offs], ls", "[o + span[0] - ls for o in offs], span[0]"),
    "query-boundary": ("wf_channel.py", " and not QUERY_CALL_RE.match(head, m.end())", ""),
    "keyed-return": ("wf_channel.py", "keys = self._returned_keys(head, m.end(), hoffs) if key is None else None", "keys = None"),
    "keyed-whole-rhs": ("wf_channel.py", "or not all(any(s <= o < e for s, e in spans) for o in offs):", "or False:"),
    "keyed-gate-deps": ("wf_returns.py", "if self.an.is_gate(stmt):", "if False:"),
    "dyn-index-loop": ("wf_channel.py", "return set(loop_literals(t.src, t.mask, at, m.group(1))) & keys", "return set()"),
    "dyn-index-suffix": ("wf_channel.py", "return {k for k in keys if k.endswith(m.group(2)) and len(k) > len(m.group(2))}", "return set(keys)"),
    "concat-selector": ("wf_css.py", "idx.class_tokens |= concat_selector_classes(php_texts)", "pass"),
    "concat-callers": ("wf_css.py", "out |= self.at(tt, cstart, vm.group(1), depth + 1)", "pass"),
    "postbuild-steps": ("wf_css.py", 'if "--build" not in flags and "transform" not in Path(script).name:', "if False:"),
    "build-relative": ("wf_css.py", "set(f.relative_to(root).parts)", "set(f.parts)"),
    "blockjson-error": ("wf_inputs.py", 'raise ValueError(f"invalid block.json {p.as_posix()}: {e}") from e', "continue"),
    "baseline-advisory": ("wf_baseline.py", 'save(path, {gap_id(f) for f in findings if f["link"] not in advisory})',
                          "save(path, {gap_id(f) for f in findings})"),
    "accept-refuse": ("wf_baseline.py", "    if refused:\n        return [], refused", "    if False:\n        return [], refused"),
    # Task 2 third review (tests/test_fix3.py).
    "query-flag": ("wf_channel.py", "                ch.query = True", "                pass"),
    "query-callee": ("wf_channel.py", "if QUERY_CALLEE_RE.search(stmt, 0, ob):", "if False:"),
    "query-key": ("wf_channel.py", "if s <= off < e and QUERY_KEY_RE.match(", "if False and QUERY_KEY_RE.match("),
    "query-static-method": ("wf_channel.py", "\w*Query::\w+\s*\(", "\w*QueryX::\w+\s*\("),
    "query-only": ("wf_paint.py", 'return "not", "query-only"', "pass"),
    "query-only-signal": ("wf_resolve.py", '"query_only": ch.query and not ch.kinds() and not ch.forwards,', '"query_only": False,'),
    "data-source-enum": ("wf_paint.py", 'return "not", "data-source-enum"', "pass"),
    "enum-signal": ("wf_resolve.py", '"enum": enum or [],', '"enum": [],'),
    "playback-carve-out": ("wf_paint.py", 'return "not", "media-playback-behaviour"', "pass"),
    "effect-name-guard": ("wf_paint.py", " and not EFFECT_NAME_RE.search(attr)", ""),
    "cli-detail": ("wf_cli.py", "print_gap(g, by_id[g])", 'print("    " + g)'),
}


def run_mutant(tmp: Path, name: str, fname: str, old: str, new: str) -> tuple[str, str]:
    """Apply one mutant to its own copy of the package and run the tests there."""
    work = tmp / name
    shutil.copytree(SRC, work, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
    p = work / fname
    s = p.read_text(encoding="utf-8")
    if old not in s:
        return name, "MUTATION TARGET MISSING: " + old
    p.write_text(s.replace(old, new, 1), encoding="utf-8")
    r = subprocess.run([sys.executable, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider", "-x"],
                       cwd=work, capture_output=True, text=True)
    return name, "RED (killed)" if r.returncode != 0 else "GREEN (survived)"


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="wf-mutants-"))
    # Each mutant has its own copy, so they run side by side; results print in MUTANTS order.
    workers = max(1, min(8, (os.cpu_count() or 2) // 2))
    try:
        with ThreadPoolExecutor(max_workers=workers) as ex:
            results = list(ex.map(lambda kv: run_mutant(tmp, kv[0], *kv[1]), MUTANTS.items()))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for name, verdict in results:
        print(f"{name:16} {verdict}")
    survivors = [name for name, verdict in results if not verdict.startswith("RED")]
    print(f"{len(results)} mutants, survivors: {survivors}")
    return 1 if survivors else 0


if __name__ == "__main__":
    sys.exit(main())
