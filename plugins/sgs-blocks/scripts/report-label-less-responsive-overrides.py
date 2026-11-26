#!/usr/bin/env python3
"""report-label-less-responsive-overrides.py - lists every <ResponsiveOverride> mount that passes no `label`.

`ResponsiveOverride` draws the Tablet and Mobile markers on its label's row. A mount that passes no `label` leaves the
markers alone on a line above the inner control's own label, so Stage E2 gives each such mount a label. This is a
REPORT, not a gate: it exits 0 whatever it finds, until Stage E2 turns the count into a failure.

A mount counts as label-less when its opening tag has no `label=` prop and no `{...spread}`. A mount with a spread is
listed apart as "unknown" because the spread may carry the label.

Stage E2 turned the report into a gate: `--check` exits 1 while any mount is label-less. `--survey` adds, per mount, the
label its inner control already draws (the text the codemod passes, which `hideDuplicateLabels` then hides on the inner
control), or "none" when the inner control has no label of its own.

Run from plugins/sgs-blocks:
    python scripts/report-label-less-responsive-overrides.py            # summary, then one line per mount (exit 0)
    python scripts/report-label-less-responsive-overrides.py --survey   # the same, with each mount's suggested label
    python scripts/report-label-less-responsive-overrides.py --check    # gate: exit 1 on a label-less mount
    python scripts/report-label-less-responsive-overrides.py --json out.json
    python scripts/report-label-less-responsive-overrides.py --self-test
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
SRC = PLUGIN / "src"
TAG = re.compile(r"<ResponsiveOverride\b")
SYMBOL = re.compile(r"(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\(|async|function|[A-Za-z_$][\w$]*\s*=>))")


def tag_end(text: str, start: int) -> int:
    """Index just past the `>` that closes the opening tag that starts at `start` (braces and quotes skipped)."""
    depth = 0
    quote = ""
    i = start
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = ""
        elif depth:
            if c in "'\"`":
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
        elif c in "'\"":
            quote = c
        elif c == "{":
            depth = 1
        elif c == ">":
            return i + 1
        i += 1
    return len(text)


def top_level_props(tag: str) -> tuple[bool, bool]:
    """(has_label, has_spread) for the text of one opening tag."""
    has_label = False
    has_spread = False
    depth = 0
    quote = ""
    i = len("<ResponsiveOverride")
    while i < len(tag):
        c = tag[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = ""
        elif depth:
            if c in "'\"`":
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
        elif c in "'\"":
            quote = c
        elif c == "{":
            if re.match(r"\s*\.\.\.", tag[i + 1 :]):
                has_spread = True
            depth = 1
        elif re.match(r"label\s*=", tag[i:]) and not re.match(r"[\w$-]", tag[i - 1]):
            has_label = True
        i += 1
    return has_label, has_spread


INNER_LABEL = re.compile(r"""\blabel\s*=\s*(?:\{\s*(?:__\(\s*)?)?(['"])(.+?)\1""")


INNER_LABEL_EXPR = re.compile(r"""\blabel\s*=\s*\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\}""")


def inner_label(text: str, start: int) -> str:
    """The first `label=` the mount's children carry (up to its closing tag): the literal text, or `{ name }` for a plain variable; '' when none."""
    end = text.find("</ResponsiveOverride>", start)
    body = text[start : end if end != -1 else start + 1500]
    text_hit = INNER_LABEL.search(body)
    expr_hit = INNER_LABEL_EXPR.search(body)
    if text_hit and (not expr_hit or text_hit.start() < expr_hit.start()):
        return text_hit.group(2)
    return "{ " + expr_hit.group(1) + " }" if expr_hit else ""


def scan_text(text: str) -> list[dict]:
    """One record per mount: line, enclosing symbol, `labelled` ('yes', 'no' or 'unknown'), `inner` label text."""
    records = []
    for m in TAG.finditer(text):
        line_start = text.rfind("\n", 0, m.start()) + 1
        before = text[line_start : m.start()]
        if re.match(r"\s*(//|/\*|\*|\{\s*/\*)", before) or "//" in before:
            continue  # the tag is only named in a comment
        tag = text[m.start() : tag_end(text, m.start())]
        has_label, has_spread = top_level_props(tag)
        symbols = [s for s in SYMBOL.finditer(text, 0, m.start())]
        symbol = ""
        if symbols:
            last = symbols[-1]
            symbol = last.group(1) or last.group(2) or ""
        records.append(
            {
                "line": text.count("\n", 0, m.start()) + 1,
                "offset": m.start(),
                "tag_len": len(tag),
                "symbol": symbol,
                "labelled": "yes" if has_label else ("unknown" if has_spread else "no"),
                "inner": inner_label(text, m.start() + len(tag)),
            }
        )
    return records


def label_attr(inner: str, has_i18n: bool) -> str:
    """The `label` prop text for an inner label: `{ name }` stays an expression, literal text is translated."""
    if inner.startswith("{ "):
        return "label=" + inner
    quoted = inner.replace("\\", "\\\\").replace("'", "\\'")
    return f"label={{ __( '{quoted}', 'sgs-blocks' ) }}" if has_i18n else f'label="{inner}"'


def fix_text(text: str) -> tuple[str, int, int]:
    """Give each label-less mount the label its inner control already draws. Returns (new text, fixed, left for hand)."""
    has_i18n = bool(re.search(r"import\s*\{[^}]*\b__\b[^}]*\}\s*from\s*'@wordpress/i18n'", text))
    fixed = 0
    left = 0
    for rec in sorted(scan_text(text), key=lambda r: -r["offset"]):
        if "no" != rec["labelled"]:
            continue
        if not rec["inner"]:
            left += 1
            continue
        start = rec["offset"] + len("<ResponsiveOverride")
        tag = text[rec["offset"] : rec["offset"] + rec["tag_len"]]
        attr = label_attr(rec["inner"], has_i18n)
        m = re.match(r"<ResponsiveOverride[ \t]*\r?\n([ \t]*)\S", tag)
        insertion = f"\n{m.group(1)}{attr}" if m else f" {attr}"
        text = text[:start] + insertion + text[start:]
        fixed += 1
    return text, fixed, left


def scan() -> list[dict]:
    out = []
    for f in sorted(SRC.rglob("*.js")):
        if f.name.endswith(".test.js"):
            continue
        for rec in scan_text(f.read_text(encoding="utf-8", errors="replace")):
            out.append({"file": f.relative_to(PLUGIN).as_posix(), **rec})
    return out


def self_test() -> int:
    sample = """
export function Panel() {
	return (
		<ResponsiveOverride label={ __( 'Gap', 'x' ) } value={ a } onChange={ b }>{ () => null }</ResponsiveOverride>
	);
}
const Row = ( { x } ) => (
	<ResponsiveOverride value={ x } onChange={ ( v ) => v >= 1 }>{ () => <A label="inner" /> }</ResponsiveOverride>
);
function Spread( props ) {
	return <ResponsiveOverride { ...props }>{ () => null }</ResponsiveOverride>;
}
function Sublabel() {
	return <ResponsiveOverride value={ { label: 1 } } sublabel="x" />;
}
"""
    got = [(r["symbol"], r["labelled"]) for r in scan_text(sample)]
    want = [("Panel", "yes"), ("Row", "no"), ("Spread", "unknown"), ("Sublabel", "no")]
    ok = got == want
    print("[report-label-less-responsive-overrides] self-test", "PASS" if ok else f"FAIL got {got}")
    inner = [r["inner"] for r in scan_text(sample)]
    ok_inner = inner == ["", "inner", "", ""]
    print("[report-label-less-responsive-overrides] self-test inner label", "PASS" if ok_inner else f"FAIL got {inner}")
    gated = [r for r in scan_text("const A = () => <ResponsiveOverride value={ x } />;") if r["labelled"] != "yes"]
    ok_gate = 1 == len(gated) and 0 == len([r for r in scan_text("const A = () => <ResponsiveOverride label=\"L\" value={ x } />;") if r["labelled"] != "yes"])
    print("[report-label-less-responsive-overrides] self-test gate", "PASS" if ok_gate else "FAIL")
    fixed, n, left = fix_text(sample)
    ok_fix = 1 == n and 1 == left and '<ResponsiveOverride label="inner" value={ x }' in fixed.replace("label={ __( 'inner', 'sgs-blocks' ) }", 'label="inner"')
    nl = chr(10)
    mount = nl.join(["import { __ } from '@wordpress/i18n';", "const A = ( { label } ) => (", "\t<ResponsiveOverride", "\t\tvalue={ v }", "\t>{ () => <Box label={ label } /> }</ResponsiveOverride>", ");"])
    expr, n2, _ = fix_text(mount)
    ok_expr = 1 == n2 and ("\t\tlabel={ label }" + nl + "\t\tvalue={ v }") in expr
    print("[report-label-less-responsive-overrides] self-test fix", "PASS" if ok_fix and ok_expr else f"FAIL {fixed!r} {expr!r}")
    ok_idem = fix_text(expr)[1] == 0
    print("[report-label-less-responsive-overrides] self-test fix is idempotent", "PASS" if ok_idem else "FAIL")
    return 0 if ok and ok_inner and ok_gate and ok_fix and ok_expr and ok_idem else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", metavar="FILE")
    ap.add_argument("--survey", action="store_true", help="list each mount with the label its inner control draws")
    ap.add_argument("--check", action="store_true", help="gate: exit 1 while a mount has no label")
    ap.add_argument("--fix", action="store_true", help="dry run: count the mounts the codemod would label")
    ap.add_argument("--apply", action="store_true", help="with --fix: write the labels")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.fix:
        total_fixed = total_left = 0
        for f in sorted(SRC.rglob("*.js")):
            if f.name.endswith(".test.js"):
                continue
            old = f.read_text(encoding="utf-8")
            new, fixed, left = fix_text(old)
            total_fixed += fixed
            total_left += left
            if fixed and a.apply:
                f.write_text(new, encoding="utf-8", newline="")
            if fixed or left:
                print(f"{f.relative_to(PLUGIN).as_posix()}: {fixed} labelled{', ' + str(left) + ' left for hand' if left else ''}")
        print(f"[report-label-less-responsive-overrides --fix] {total_fixed} mounts {'labelled' if a.apply else 'would be labelled'}; {total_left} left for hand")
        return 0
    records = scan()
    counts = Counter(r["labelled"] for r in records)
    less = [r for r in records if "yes" != r["labelled"]]
    files = Counter(r["file"] for r in less)
    print(
        f"[report-label-less-responsive-overrides] {len(records)} mounts: {counts['yes']} labelled, "
        f"{counts['no']} label-less, {counts['unknown']} unknown (spread props); label-less or unknown in {len(files)} files"
    )
    for r in less:
        suffix = f" -> label {r['inner']!r}" if a.survey and r["inner"] else (" -> inner control has no label: write one" if a.survey else "")
        print(f"{r['labelled']:8} {r['file']}::{r['symbol'] or '(module)'} (line {r['line']}){suffix}")
    if a.json:
        Path(a.json).write_text(
            json.dumps({"total": len(records), "counts": counts, "mounts": less}, indent=1), encoding="utf-8"
        )
    return 1 if a.check and less else 0


if __name__ == "__main__":
    sys.exit(main())
