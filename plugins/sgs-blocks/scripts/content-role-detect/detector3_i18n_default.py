#!/usr/bin/env python3
"""
Detector 3 — i18n-wrapped default walk (structural, statement-scoped).

Independent from Detector 1 (escaping) and Detector 2 (edit.js controls):
this one never inspects an escaping function or a React control tag. It
looks for the shape:

    $x = $attributes['key'] ?? __( 'Default copy', 'sgs-blocks' );
    $x = isset($attributes['key']) ? $attributes['key'] : __( '...', 'sgs-blocks' );
    $attributes['key'] ?? __( '...', 'sgs-blocks' )   (inline, no assignment)

Hypothesis under test (declared, per the task brief): a STYLING attribute's
fallback default is never wrapped in `__()`/`_x()`/`esc_html__()`, because
translators only see visible copy — so i18n-wrapping is a signal specific to
content-bearing attributes.

This detector actively looks for counter-examples to that hypothesis (see
`--audit-counterexamples`), rather than assuming near-zero false positives.

Method: split each render.php into semicolon-delimited logical statements
(same lightweight statement splitter idea as Detector 1, reimplemented in
Python here to keep this detector's tooling independent of PHP/token_get_all
— if the PHP binary were ever unavailable this detector still runs), then
regex the statement for `$attributes['key']` co-occurring with an i18n call
supplying the fallback.

Output: NDJSON on stdout.

Usage:
    python detector3_i18n_default.py --glob > d3_raw.ndjson
    python detector3_i18n_default.py --glob --audit-counterexamples
"""
import glob
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path("c:/Users/Bean/Projects/small-giants-wp")

I18N_FUNCS = r"(?:__|_x|esc_html__|esc_html_x)"

# $attributes['key'] ... (?? | : ) ... __( 'text', 'sgs-blocks' )
PATTERN_NULL_COALESCE = re.compile(
    r"\$attributes\s*\[\s*(['\"])([A-Za-z0-9_]+)\1\s*\]\s*\?\?\s*" + I18N_FUNCS + r"\s*\(\s*(['\"])((?:[^'\"\\]|\\.)*)\3",
    re.DOTALL,
)
PATTERN_TERNARY = re.compile(
    r"isset\s*\(\s*\$attributes\s*\[\s*(['\"])([A-Za-z0-9_]+)\1\s*\]\s*\)\s*\?\s*"
    r"(?:sanitize_text_field\s*\(\s*)?\$attributes\s*\[\s*\1\2\1\s*\]\s*\)?\s*:\s*"
    + I18N_FUNCS + r"\s*\(\s*(['\"])((?:[^'\"\\]|\\.)*)\3",
    re.DOTALL,
)
# Var-mediated ternary where the CONDITION checks a var already sourced from
# the same attr key a few lines earlier is out of scope for a single-pass
# regex; captured instances are what we can prove structurally.


def strip_comments(code: str) -> str:
    # Remove /* */ and // comments (naive but adequate for this static scan;
    # doesn't touch string contents since PHP block comments can't legally
    # appear inside a string literal's raw source without an escape).
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
    code = re.sub(r"(?m)//[^\n]*$", "", code)
    return code


def collect_default_files() -> list:
    files = []
    files += glob.glob(str(REPO_ROOT / "plugins/sgs-blocks/src/blocks/**/*.php"), recursive=True)
    files += glob.glob(str(REPO_ROOT / "plugins/sgs-blocks/includes/**/*.php"), recursive=True)
    return sorted(set(files))


def infer_block_slug(path: str) -> str | None:
    p = path.replace("\\", "/")
    m = re.search(r"/src/blocks/([a-z0-9-]+)/", p)
    return f"sgs/{m.group(1)}" if m else None


def scan_file(path: str) -> list:
    rows = []
    try:
        code = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return rows
    code = strip_comments(code)
    block_slug = infer_block_slug(path)

    for pat, shape in ((PATTERN_NULL_COALESCE, "null-coalesce"), (PATTERN_TERNARY, "isset-ternary")):
        for m in pat.finditer(code):
            key = m.group(2)
            default_text = m.group(4)
            line_no = code.count("\n", 0, m.start()) + 1
            rows.append({
                "file": path,
                "block_slug": block_slug,
                "line": line_no,
                "attr_key": key,
                "shape": shape,
                "default_text": default_text[:120],
                "category": "i18n-wrapped-default",
            })
    return rows


def audit_counterexamples(all_hits: list, eligible_by_slug_attr: dict) -> list:
    """
    Challenge the hypothesis: find eligible STYLING-looking attribute names
    (per DB role hints, not used here directly — caller passes the eligible
    set) that were ALSO caught by this i18n-default pattern, which would be
    a false positive for the "i18n implies content" hypothesis. Since this
    script doesn't have DB role access, it flags candidates whose key name
    itself strongly suggests non-content (Colour/Position/Direction/Unit/
    Align) for manual counter-example review.
    """
    suspects = []
    styling_hint = re.compile(
        r"(Colour|Color|Position|Direction|Unit$|Align|Opacity|Duration|Easing|Scale$|Speed$)"
    )
    for row in all_hits:
        if styling_hint.search(row["attr_key"]):
            suspects.append(row)
    return suspects


def main() -> None:
    args = sys.argv[1:]
    do_audit = "--audit-counterexamples" in args
    args = [a for a in args if not a.startswith("--")]
    files = collect_default_files() if not args else args

    all_hits = []
    for f in files:
        all_hits.extend(scan_file(f))

    if do_audit:
        suspects = audit_counterexamples(all_hits, {})
        print(f"# Counter-example audit: {len(suspects)} i18n-wrapped defaults with STYLING-shaped names", file=sys.stderr)
        for s in suspects:
            print(f"#   {s['block_slug']} {s['attr_key']} = \"{s['default_text']}\"", file=sys.stderr)

    for row in all_hits:
        print(json.dumps(row))


if __name__ == "__main__":
    main()
