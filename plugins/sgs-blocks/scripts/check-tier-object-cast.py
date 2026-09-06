#!/usr/bin/env python3
"""Tier-object-cast gate — never coerce a whole object-typed attribute to a string.

WHY THIS EXISTS
---------------
`gap`, `columns`, `flexDirection` and dozens of other block attributes are declared
`"type": "object"` in block.json — the `{desktop, tablet, mobile}` tier shape (Spec 35).
PHP has no notion of "this array came from a typed attribute": casting the WHOLE object
to a string (`(string) $attributes['gap']`) does not throw, it silently emits PHP's
"Array to string conversion" notice and produces the literal string `"Array"`, which then
prints as literal `gap:Array` in generated CSS — invalid, and the browser drops the whole
declaration with zero visible error anywhere in the pipeline. This is the recurrent
D569/D570/D574 bug class: `multi-button` and `card-grid` both carry inline comments
recording it (`multi-button/render.php:36-38`, `card-grid/render.php:55-56`) — this gate
is what makes those comments enforceable rather than just remembered
(`.claude/reports/2026-08-21-unenforced-prohibition-register.md`).

SCOPE — schema-derived, not a hardcoded attribute list (R-31-1)
------------------------------------------------------------------
The set of "tier object" attribute names is NEVER hand-maintained here. For every
`src/blocks/*/block.json`, every attribute declared `"type": "object"` is read from the
schema itself. A hardcoded list would drift the moment a new tier attribute is added to
a block.json (this project has hit that exact drift class before — see
`feedback_a_column_with_no_writer_and_no_reader_still_looks_like_data`).

WHAT IT CHECKS
--------------
Per block, for every object-typed attribute name `X`:

  1. DIRECT — a string-coercing call applied straight to `$attributes['X']` with no
     further `[...]` indexing: `(string) $attributes['X']`, `(string) ( $attributes['X']
     ?? ... )`, or `trim/esc_attr/esc_html/sanitize_text_field/strtolower/strtoupper(
     $attributes['X'] )`. Indexing further into the object first (`$attributes['X']['desktop']`)
     is the CORRECT pattern and is never flagged.

  2. TWO-HOP — the object attribute is assigned wholesale to a bare local variable
     (`$v = $attributes['X'];`, no `??`, no indexing), and that SAME variable is later
     cast/coerced directly (`(string) $v`). The correct pattern normalises through a
     helper first (`sgs_responsive_normalise_object()`) or indexes a tier immediately —
     both are unaffected.

GATE SHAPE
----------
- Default (no flag): observational report, exit 0.
- --check:     exit 1 on any violation.
- --self-test: proves the gate can fail — reintroduces the exact D569-class defect
   `(string) $attributes['gap']` into a temp copy of `multi-button/render.php`, asserts
   RED, restores, asserts GREEN.

Run: python plugins/sgs-blocks/scripts/check-tier-object-cast.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"

COERCE_FUNCS = (
    "trim",
    "esc_attr",
    "esc_html",
    "sanitize_text_field",
    "strtolower",
    "strtoupper",
)


def _object_attrs(block_json_path: Path) -> list[str]:
    """Read attribute names declared `"type": "object"` straight from block.json."""
    try:
        data = json.loads(block_json_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        print(f"[tier-object-cast] WARNING — could not parse {block_json_path}: {exc}")
        return []
    attrs = data.get("attributes", {})
    if not isinstance(attrs, dict):
        return []
    return [
        name
        for name, spec in attrs.items()
        if isinstance(spec, dict) and spec.get("type") == "object"
    ]


def _strip_inline_comment(line: str) -> str:
    """Cut a trailing `// ...` comment, tracking quotes so a `//` inside a string
    literal is not mistaken for a comment marker. Does not handle escaped quotes —
    a documented limit shared with this project's other pattern-matching gates."""
    in_single = in_double = False
    i, n = 0, len(line)
    while i < n - 1:
        c = line[i]
        if not in_double and c == "'":
            in_single = not in_single
        elif not in_single and c == '"':
            in_double = not in_double
        elif not in_single and not in_double and c == "/" and line[i + 1] == "/":
            return line[:i]
        i += 1
    return line


def _strip_comments(lines: list[str]) -> list[str]:
    """Blank out PHP comment content (line-length preserved) so quoted code inside a
    comment — e.g. the historical-defect note in heading/render.php:477 that literally
    reads `(string) $attributes['fontSize']` as PROSE, not executable code — is never
    mistaken for a live violation. Full-line `//`/`*`-continuation/`/* */` comments are
    blanked entirely; trailing inline `//` comments are cut at the marker."""
    cleaned: list[str] = []
    in_block = False
    for line in lines:
        if in_block:
            end = line.find("*/")
            if end == -1:
                cleaned.append("")
                continue
            line = line[end + 2 :]
            in_block = False
        stripped = line.lstrip()
        if stripped.startswith("/*"):
            start = line.find("/*")
            end = line.find("*/", start + 2)
            if end == -1:
                in_block = True
                cleaned.append(line[:start])
                continue
            line = line[:start] + line[end + 2 :]
            stripped = line.lstrip()
        if stripped.startswith("//") or (stripped.startswith("*") and not stripped.startswith("*/")):
            cleaned.append("")
            continue
        cleaned.append(_strip_inline_comment(line))
    return cleaned


def _direct_cast_re(attr: str) -> re.Pattern:
    funcs = "|".join(COERCE_FUNCS)
    esc = re.escape(attr)
    # `(string) $attributes['attr']` / `(string) ( $attributes['attr'] ?? ... )`
    # `trim( $attributes['attr'] )` etc. — NOT followed by further `[` indexing.
    return re.compile(
        rf"(?:\(string\)\s*\(?\s*|(?:{funcs})\(\s*)"
        rf"\$attributes\[\s*['\"]{esc}['\"]\s*\](?!\s*\[)"
    )


def _wholesale_assign_re(attr: str) -> re.Pattern:
    esc = re.escape(attr)
    # `$var = $attributes['attr'];` — bare, no `??`, no `[` indexing on the RHS.
    return re.compile(
        rf"\$(\w+)\s*=\s*\$attributes\[\s*['\"]{esc}['\"]\s*\]\s*;"
    )


def _var_cast_re(var_name: str) -> re.Pattern:
    funcs = "|".join(COERCE_FUNCS)
    return re.compile(
        rf"(?:\(string\)\s*\(?\s*|(?:{funcs})\(\s*)\${re.escape(var_name)}\b"
    )


def _scan_render_php(block_slug: str, render_path: Path, object_attrs: list[str], text: str | None = None) -> list[str]:
    raw_lines = (text if text is not None else render_path.read_text(encoding="utf-8")).splitlines()
    lines = _strip_comments(raw_lines)
    violations: list[str] = []

    for attr in object_attrs:
        direct_re = _direct_cast_re(attr)
        assign_re = _wholesale_assign_re(attr)
        wholesale_vars: list[tuple[int, str]] = []

        for i, line in enumerate(lines):
            if direct_re.search(line):
                violations.append(
                    f"{render_path}:{i + 1} — {block_slug}: object attribute "
                    f"'{attr}' coerced to string DIRECTLY (emits 'gap:Array'-class CSS)"
                )
            m = assign_re.search(line)
            if m:
                wholesale_vars.append((i, m.group(1)))

        for assign_idx, var_name in wholesale_vars:
            cast_re = _var_cast_re(var_name)
            for j in range(assign_idx + 1, len(lines)):
                if cast_re.search(lines[j]):
                    violations.append(
                        f"{render_path}:{j + 1} — {block_slug}: '${var_name}' holds the "
                        f"whole object attribute '{attr}' (assigned at line "
                        f"{assign_idx + 1}) and is cast to string here (two-hop D569 class)"
                    )

    return violations


def run_scan() -> list[str]:
    violations: list[str] = []
    for block_json_path in sorted(BLOCKS_DIR.glob("*/block.json")):
        render_path = block_json_path.parent / "render.php"
        if not render_path.exists():
            continue
        object_attrs = _object_attrs(block_json_path)
        if not object_attrs:
            continue
        violations.extend(
            _scan_render_php(block_json_path.parent.name, render_path, object_attrs)
        )
    return violations


def self_test() -> bool:
    fixture = BLOCKS_DIR / "multi-button" / "render.php"
    block_json = BLOCKS_DIR / "multi-button" / "block.json"
    if not fixture.exists() or not block_json.exists():
        print("[tier-object-cast --self-test] FAIL — fixture files missing.")
        return False

    object_attrs = _object_attrs(block_json)
    if "gap" not in object_attrs:
        print(
            "[tier-object-cast --self-test] FAIL — multi-button/block.json no longer "
            "declares 'gap' as type:object; update the fixture."
        )
        return False

    original = fixture.read_text(encoding="utf-8")
    clean_violations = _scan_render_php("multi-button", fixture, object_attrs, original)
    if clean_violations:
        print(
            "[tier-object-cast --self-test] FAIL — the unmodified multi-button "
            "render.php already reports a violation; no clean baseline:\n  "
            + "\n  ".join(clean_violations)
        )
        return False
    print("[tier-object-cast --self-test] negative control: clean multi-button is silent — OK")

    anchor = "$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );"
    if anchor not in original:
        print(
            "[tier-object-cast --self-test] FAIL — the expected anchor line was not "
            "found in multi-button/render.php (file shape changed; update the fixture)."
        )
        return False

    # Reintroduce the real D569-class defect: cast the WHOLE object attribute to string.
    corrupted = original.replace(
        anchor,
        anchor + "\n$gap_debug = (string) $attributes['gap'];",
        1,
    )
    corrupted_violations = _scan_render_php("multi-button", fixture, object_attrs, corrupted)
    if not corrupted_violations:
        print(
            "[tier-object-cast --self-test] FAIL — injecting "
            "`(string) $attributes['gap']` was NOT reported. The gate cannot fail."
        )
        return False
    print(
        "[tier-object-cast --self-test] positive control: injected direct cast reported — "
        + corrupted_violations[0]
    )

    # Two-hop variant: wholesale-assign then cast the variable, not the attribute.
    corrupted_two_hop = original.replace(
        anchor,
        anchor + "\n$gap_wholesale = $attributes['gap'];\n$gap_debug2 = (string) $gap_wholesale;",
        1,
    )
    two_hop_violations = _scan_render_php("multi-button", fixture, object_attrs, corrupted_two_hop)
    if not two_hop_violations:
        print(
            "[tier-object-cast --self-test] FAIL — the two-hop assign-then-cast variant "
            "was NOT reported. The gate cannot fail on this arm."
        )
        return False
    print(
        "[tier-object-cast --self-test] positive control (two-hop): reported — "
        + two_hop_violations[0]
    )

    with tempfile.TemporaryDirectory() as tmp:
        tmp_render = Path(tmp) / "render.php"
        tmp_render.write_text(corrupted, encoding="utf-8")
        disk_violations = _scan_render_php("multi-button", tmp_render, object_attrs)
        if not disk_violations:
            print(
                "[tier-object-cast --self-test] FAIL — on-disk temp-file scan did not "
                "reproduce the in-memory finding."
            )
            return False
        tmp_render.write_text(original, encoding="utf-8")
        restored_violations = _scan_render_php("multi-button", tmp_render, object_attrs)
        if restored_violations:
            print(
                "[tier-object-cast --self-test] FAIL — restoring the original content "
                "still reports a violation:\n  " + "\n  ".join(restored_violations)
            )
            return False
    print("[tier-object-cast --self-test] post-restore: clean again — OK")
    print("[tier-object-cast --self-test] PASS — the gate goes red for both defect shapes.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Tier-object-cast gate.")
    parser.add_argument("--check", action="store_true", help="exit 1 on any violation")
    parser.add_argument("--self-test", action="store_true", help="prove the gate can fail")
    args = parser.parse_args()

    if args.self_test:
        return 0 if self_test() else 1

    violations = run_scan()
    if violations:
        print(f"[tier-object-cast] {len(violations)} violation(s):")
        for v in violations:
            print("  " + v)
    else:
        print("[tier-object-cast] 0 violations across all schema-derived object attributes.")

    if args.check:
        return 1 if violations else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
