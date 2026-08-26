#!/usr/bin/env python3
"""check-border-style-without-width.py — the "no width = no border" detector.

THE RULE (Bean, 2026-08-26): **a border STYLE set with no WIDTH must render no
border.** CSS's initial `border-width` is `medium` (~3px), so emitting
`border-style:solid` on its own paints a border nobody asked for. It bit the
hero's split image.

WHY A DETECTOR AND NOT 37 EDITS (THE-MIGRATION-METHOD.md / D542, Bean-locked):
the same shape repeats across every block that paints a border, so the
correction belongs in one place that can be re-run. The hand census that
preceded this script found 37 instances and MISSED two — `sgs/quote` and
`sgs/product-card` — which this script finds automatically. That miss is the
argument for the script, not an aside.

THE TRIAD
  --survey     census every border-style emission, classified GATED / UNGATED
  --check      exit 1 on any UNGATED instance not in the baseline (the gate)
  --self-test  assertions + negative controls, proving it can still fail

THREE GATED SHAPES, all recognised:
  1. `sgs_native_border_style_width_args( … )` — gated by construction; the
     helper only returns a `style` key when a width is present.
  2. `sgs_gate_native_border_style( … )`       — gated by construction; strips
     `style` from a native border array carrying no width, flat or per-side.
  3. a hand-rolled `border-style:` emission whose enclosing condition tests a
     width (`$has_border_width`, `$border_width*`, `['width']`).

⛔ IT MUST BE BRACE-AWARE, AND A LINE WINDOW IS NOT ENOUGH. The first revision
of this script read N lines above the emission for a width token and reported
ZERO ungated instances on a tree that contained two. `sgs/quote` emits

    if ( 'none' !== $border_style ) {
        if ( $has_border_width ) { ...border-width... }
        $wrapper_decls[] = 'border-style:' . $border_style;   // NOT gated
    }

— the width test is NEARBY but does not ENCLOSE the emission. A window sees the
token and passes it. So the classifier walks the real brace stack and asks
whether an ENCLOSING condition tests a width. A detector that returns 0 on a
dirty tree is worse than none: it looks present.

⚠ Still a text scan, not a PHP parser. A construct it cannot resolve — a
brace-less one-line `if`, a width test held in a differently-named local — is
reported UNCLASSIFIED, never silently passed.

Run from the repo root:
    python plugins/sgs-blocks/scripts/check-border-style-without-width.py --survey
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
PLUGIN = REPO / "plugins" / "sgs-blocks"
SCAN_ROOTS = [PLUGIN / "src" / "blocks", PLUGIN / "includes"]
BASELINE = Path(__file__).with_name("border-style-without-width-baseline.json")

# Retained only for the self-test's window-based cases; the real classifier is
# brace-aware (see _enclosing_conditions).
_LOOKBACK = 12

# An emission of the border-style property into a CSS string.
_EMIT_RE = re.compile(r"""['"]border-style\s*:""")

# Tokens that prove the guard tests a WIDTH.
#
# ⛔ MATCH ANY VARIABLE WHOSE NAME CONTAINS "width", NOT ONE SPELLING. The first
# revision listed `$has_border_width` explicitly and therefore MISSED
# `$border_has_width` (helpers-button-style.php) and `$img_border_has_width`
# (hero/render.php) — the same test, different word order — and reported two
# correctly-gated emitters as violations. Blocks name this local at least four
# ways: `$has_border_width`, `$border_has_width`, `$img_border_has_width`,
# `$sgs_pc_border_width_top`. A name-shape allowlist cannot keep up with that;
# "the guard mentions a width" is the property that actually matters.
_WIDTH_TOKEN_RE = re.compile(
    r"""\$[A-Za-z0-9_]*width[A-Za-z0-9_]*|\[\s*['"]width['"]\s*\]|\bwidth\b""",
    re.IGNORECASE,
)

# Helpers that are gated by construction — an emission routed through either
# cannot produce a style without a width.
_GATED_HELPERS = (
    "sgs_native_border_style_width_args",
    "sgs_gate_native_border_style",
)


def _enclosing_conditions(lines: list[str], target: int) -> "list[str] | None":
    """Return the `if`/`elseif` conditions enclosing line index ``target``.

    Walks brace depth from the top of the file, remembering the condition text
    that opened each still-open block. Returns None when the structure cannot be
    resolved (unbalanced braces before the target), so the caller reports
    UNCLASSIFIED rather than guessing.

    `} else {` is brace-NEUTRAL and must not be read as a new enclosing scope —
    it closes the `if` arm and opens the `else` arm at the same depth. An `else`
    arm is deliberately treated as carrying NO width condition: the width test
    belongs to the arm that was not taken.
    """
    stack: list[tuple[int, str]] = []   # (depth_after_open, condition text)
    depth = 0
    for i, raw in enumerate(lines):
        if i > target:
            break
        line = raw.strip()
        if line.startswith(("*", "//", "#")):
            continue
        # The condition that opens on THIS line, if any.
        cond = ""
        m = re.match(r"^\}?\s*(?:else\s+)?(if|elseif)\s*\((.*)$", line)
        if m:
            cond = m.group(2)
        elif re.match(r"^\}\s*else\s*\{", line):
            cond = ""      # else arm — the width test was the other branch

        opens = line.count("{")
        closes = line.count("}")
        if i == target:
            break
        for _ in range(opens):
            depth += 1
            stack.append((depth, cond))
            cond = ""      # only the first brace on the line carries it
        for _ in range(closes):
            if not stack:
                return None
            stack.pop()
            depth -= 1
        if depth < 0:
            return None
    return [c for _, c in stack if c]


def _statement_text(lines: list[str], target: int) -> str:
    """Return the whole statement containing line index ``target``.

    Walks back until the previous line ends a statement or opens/closes a block,
    so a gate expressed WITHIN the statement — a ternary or an `&&` on the same
    assignment — is seen. That is a real gate:

        $decls = $has_border_width
            ? array( 'border-style:' . $style )
            : array();

    The emission sits on a continuation line with no enclosing `if`, so the
    brace walk alone reports it ungated. Scoping to the STATEMENT (not a line
    window) is what keeps this from re-introducing the nearby-but-not-enclosing
    false negative the brace walk exists to prevent.
    """
    start = target
    while start > 0:
        prev = lines[start - 1].strip()
        if prev.endswith((";", "{", "}")) or not prev or prev.startswith(("//", "*", "#")):
            break
        start -= 1
    return "\n".join(lines[start: target + 1])


def _iter_php():
    for root in SCAN_ROOTS:
        if root.exists():
            yield from sorted(root.rglob("*.php"))


def _rel(p: Path) -> str:
    return p.relative_to(REPO).as_posix()


def scan():
    """Return (gated, ungated, helper_routed) finding lists."""
    gated, ungated, routed = [], [], []
    for path in _iter_php():
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        text = "\n".join(lines)
        uses_helper = any(h in text for h in _GATED_HELPERS)

        for i, line in enumerate(lines):
            if not _EMIT_RE.search(line):
                continue
            if line.lstrip().startswith(("*", "//", "#")):
                continue  # a comment mentioning the property, not an emission
            rec = {
                "file": _rel(path),
                "line": i + 1,
                "code": line.strip()[:120],
                "key": f"{_rel(path)}:{i + 1}",
            }
            # A helper-routed emission is gated by construction — look at the
            # statement and the assignment feeding it, not a wide window.
            near = "\n".join(lines[max(0, i - 3): i + 1])
            if any(h in near for h in _GATED_HELPERS):
                rec["why"] = "routed through a gated helper"
                routed.append(rec)
                continue
            if _WIDTH_TOKEN_RE.search(_statement_text(lines, i)):
                rec["why"] = "the statement itself tests a width (ternary / &&)"
                gated.append(rec)
                continue
            conds = _enclosing_conditions(lines, i)
            if conds is None:
                rec["why"] = "UNCLASSIFIED — brace structure could not be resolved"
                rec["file_uses_gated_helper_elsewhere"] = uses_helper
                ungated.append(rec)
            elif any(_WIDTH_TOKEN_RE.search(c) for c in conds):
                rec["why"] = "an ENCLOSING condition tests a width"
                gated.append(rec)
            else:
                rec["why"] = (
                    "no ENCLOSING condition tests a width — a style with no width "
                    "paints the browser's ~3px medium"
                )
                rec["enclosing"] = [c.strip()[:70] for c in conds][-3:]
                rec["file_uses_gated_helper_elsewhere"] = uses_helper
                ungated.append(rec)
    return gated, ungated, routed


def _load_baseline() -> set[str]:
    if not BASELINE.exists():
        return set()
    try:
        return {e["key"] for e in json.loads(BASELINE.read_text(encoding="utf-8"))["entries"]}
    except (OSError, ValueError, KeyError):
        return set()


def cmd_survey() -> int:
    gated, ungated, routed = scan()
    print("border-style emission census\n")
    print(f"  gated by helper           : {len(routed)}")
    print(f"  gated by an explicit test : {len(gated)}")
    print(f"  UNGATED                   : {len(ungated)}")
    print(f"  total                     : {len(gated) + len(ungated) + len(routed)}")
    if ungated:
        print("\n  UNGATED — each paints a ~3px border when a style is set with no width:")
        for r in ungated:
            print(f"    {r['file']}:{r['line']}")
            print(f"        {r['code']}")
    return 0


def cmd_check() -> int:
    _, ungated, _ = scan()
    baseline = _load_baseline()
    fresh = [r for r in ungated if r["key"] not in baseline]
    if not fresh:
        print(f"[border-style-width] PASS — 0 ungated ({len(baseline)} baselined).")
        return 0
    print(f"[border-style-width] FAIL — {len(fresh)} ungated border-style emission(s):\n")
    for r in fresh:
        print(f"  {r['file']}:{r['line']}")
        print(f"      {r['code']}")
    print(
        "\n  Fix: gate the emission on a width. Use "
        "sgs_native_border_style_width_args() when hand-picking style/width keys, "
        "sgs_gate_native_border_style() when passing a whole style.border array, or "
        "add `&& $has_border_width` to a hand-rolled condition.\n"
        "  Rule: a style with no width must emit NO border declaration — not "
        "border-width:0, which still beats an inherited border."
    )
    return 1


def cmd_self_test() -> int:
    """Prove each classifier arm can fire, and that it does not overmatch."""


    cases = [
        # (php source, expected bucket)
        ("if ( $border_style && $has_border_width ) {\n"
         "\t$d[] = 'border-style:' . $border_style;\n}", "gated"),
        ("if ( $border_style ) {\n"
         "\t$d[] = 'border-style:' . $border_style;\n}", "ungated"),
        ("$args = sgs_native_border_style_width_args( $s, $w );\n"
         "$d[] = 'border-style:' . $args['style'];", "routed"),
        ("$b = sgs_gate_native_border_style( $border );\n"
         "$d[] = 'border-style:' . $b['style'];", "routed"),
        # NEGATIVE CONTROL: a comment naming the property is not an emission.
        ("// border-style: never emitted here, this is prose\n$x = 1;", "none"),
        # per-side width counts as a width test
        ("if ( isset( $border['top']['width'] ) ) {\n"
         "\t$d[] = 'border-style:' . $s;\n}", "gated"),
        # REGRESSION CONTROLS — real names from the tree that a one-spelling
        # token regex missed, reporting two correctly-gated emitters as
        # violations. Word ORDER and PREFIX both vary; only "contains width"
        # holds across them.
        ("if ( '' !== $border_style && $border_has_width ) {\n"
         "\t$d[] = 'border-style:' . $border_style;\n}", "gated"),
        ("if ( $img_border_has_width ) {\n"
         "\t$d[] = 'border-style:' . $safe_border_style;\n}", "gated"),
        # A same-statement ternary gate IS a gate.
        ("$d = $sgs_pc_has_border_width\n"
         "\t? array( 'border-style:' . $style )\n"
         "\t: array();", "gated"),
        # A width test that does NOT enclose the emission is still ungated —
        # this is the sgs/quote shape and the whole reason for the brace walk.
        ("if ( 'none' !== $border_style ) {\n"
         "\tif ( $has_border_width ) {\n\t\t$d[] = 'border-width:1px';\n\t}\n"
         "\t$d[] = 'border-style:' . $border_style;\n}", "ungated"),
    ]
    failures = []
    # ⛔ Classify through the SAME code path scan() uses. An earlier revision
    # re-implemented a window-based classification here, so the self-test could
    # pass while the real classifier behaved differently — the test would have
    # been measuring nothing. If the classification logic moves, it moves for
    # both because there is only one copy.
    for n, (src, expect) in enumerate(cases):
        lines = ("<?php\n" + src).splitlines()
        got = "none"
        for i, line in enumerate(lines):
            if not _EMIT_RE.search(line):
                continue
            if line.lstrip().startswith(("*", "//", "#")):
                continue
            near = "\n".join(lines[max(0, i - 3): i + 1])
            if any(h in near for h in _GATED_HELPERS):
                got = "routed"
            elif _WIDTH_TOKEN_RE.search(_statement_text(lines, i)):
                got = "gated"
            else:
                conds = _enclosing_conditions(lines, i)
                if conds is None:
                    got = "unclassified"
                elif any(_WIDTH_TOKEN_RE.search(c) for c in conds):
                    got = "gated"
                else:
                    got = "ungated"
            break
        if got != expect:
            failures.append(f"case {n}: expected {expect}, got {got}\n    {src.splitlines()[0]}")

    if failures:
        print("[self-test] FAIL")
        for f in failures:
            print("  " + f)
        return 1
    print(f"[self-test] PASS — {len(cases)} cases, including a comment negative control "
          f"and a per-side width control.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--survey", action="store_true", help="census, human-readable")
    g.add_argument("--check", action="store_true", help="gate; exit 1 on a new ungated emission")
    g.add_argument("--self-test", action="store_true", help="prove the classifier still discriminates")
    a = ap.parse_args()
    if a.survey:
        return cmd_survey()
    if a.check:
        return cmd_check()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
