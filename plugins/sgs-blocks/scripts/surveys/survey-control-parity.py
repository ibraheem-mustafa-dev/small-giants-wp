#!/usr/bin/env python3
"""
survey-control-parity.py — do SGS inspector controls look like NATIVE WordPress?

WHY THIS EXISTS (2026-08-13)
============================
Bean reported that SGS controls do not match the native WordPress control
look — naming the unit box, its font colour and size, padding, width and
height, and specifically that "the px in the unit box has blue font" natively
but not in ours.

MEASURED LIVE, not reasoned about (canary WP 7.0.4, block editor, same page,
same moment, core/spacer vs sgs/label side by side):

    property         NATIVE (core/spacer)     SGS (sgs/label)
    input height     40px                     32px
    input padding    0 4px 0 12px             0 4px 0 8px
    unit colour      rgb(56,88,233)  <- BLUE  rgb(47,47,47)  grey
    unit font-size   13px                     8px
    unit padding     4px                      2px 1px

CAUSE — WordPress said it itself. The editor console emitted six deprecation
warnings, one per control type:

    "36px default size for wp.components.<X> is deprecated since version 6.8
     and will be removed in version 7.1. Note: Set the `__next40pxDefaultSize`
     prop to true to start opting into the new default size..."

So the blue unit text is NOT a colour we failed to set. It is a consequence of
the size mode: at the native 40px size the unit <select> renders at 13px in the
admin theme accent colour; at the legacy 36px default it renders 8px grey.
ONE prop explains every difference in the table above, across every control
type — which is why this is a survey and a codemod, not 723 hand edits.

⛔ THERE IS A DEADLINE. "removed in version 7.1" is not decoration: WP 7.1
ships 19 Aug 2026. On upgrade every one of these controls changes size whether
we act or not. Passing the prop now makes that a controlled, verified change
instead of a surprise across ~100 files on live client sites.

TWO AXES, DELIBERATELY SEPARATE (Bean-approved 2026-08-13)
==========================================================
These are different problems with different fix costs, and conflating them
would produce a codemod that silently reverses a design decision.

  AXIS A — SIZE. A control that accepts `__next40pxDefaultSize` and does not
  receive it. Mechanical: one boolean, no value semantics, no stored-attribute
  change. AUTO-FIXABLE by `--fix --apply`.

  AXIS B — COMPOSITION. A hand-rolled cluster of separate controls where
  WordPress ships ONE grouped composite. Native <BorderControl> puts swatch +
  number + unit + slider + link button on a single row backed by one
  {color,style,width} object; SGS renders 2-3 stacked controls over 2-3 FLAT
  scalar attrs (e.g. brand-strip's tileBorderWidth + tileBorderColour).
  Measured: <BorderBoxControl> and <BorderControl> are mounted ZERO times in
  this tree.

  ⛔ AXIS B IS NEVER AUTO-FIXED, and that is a hard rule, not caution:
    1. Adopting the native composite changes stored shape from flat scalars to
       one object. WordPress SILENTLY DISCARDS a value whose type does not
       match block.json (D338) — the exact failure that bit the border-radius
       migration earlier the same day.
    2. Spec-35 contract §14.1 names BorderBoxControl canonical while zero
       blocks mount it, and D549/G3 records the flat shape as a DELIBERATE
       choice to avoid this migration. Those two positions contradict each
       other. Resolving that is a design gate for Bean, so this axis emits a
       ranked CANDIDATE LIST and nothing else.

Adding the size prop does NOT make a hand-rolled cluster look grouped. It makes
each stacked control natively sized. Axis B is what closes the visual gap in
Bean's screenshot, and it is a rebuild, not a prop.

DECISION PROCEDURE (Axis A)
===========================
  for each .js under src/:
    for each JSX opening tag <Name ...> or <Name ... />:
      if Name not in SIZED_COMPONENTS:           skip
      if '__next40pxDefaultSize' in the props:    OK
      if a nested '<' survives inside the tag:    AMBIGUOUS -> report, never fix
      else:                                       MISSING   -> fixable

  Both SELF-CLOSING and CONTAINER elements are handled. That distinction is
  load-bearing, not pedantry: <ToggleGroupControl> always wraps
  <ToggleGroupControlOption/> children, so a self-closing-only matcher reports
  all 20 of its live sites as unusable (measured — that is exactly what the
  first version of this file did).

EXPECTED POPULATION, declared BEFORE trusting a live run of this script
(rules.json _meta.zeroIsAClaim discipline). Method independent of this file's
own matcher — a separate throwaway plain-text scan run 2026-08-13:

    UnitControl 17 with / 59 missing        RangeControl 7 / 117
    SelectControl 4 / 287                   TextControl 3 / 219
    BoxControl 0 / 14                       ToggleGroupControl 4 / 20
    NumberControl 1 / 7
    TOTAL 36 with / 723 missing, across 104 files

RECONCILED against this file's own scanner, same day. The two agree to within
one element (grep 759 total, scanner 760), and every difference is EXPLAINED
rather than waved through:

  * ToggleGroupControl 20: grep called these plain "missing"; the first version
    of this scanner called all 20 AMBIGUOUS. Both were wrong in different ways.
    The container-aware scanner resolves them as fixable — the single biggest
    correction, and the reason the scanner exists at all.
  * TextControl: grep counted 3 as conformant, scanner 2 + 1 AMBIGUOUS. The
    grep's over-long span had swallowed a `__next40pxDefaultSize` belonging to
    a LATER element and credited it to the wrong tag.
  * UnitControl: scanner finds 77 vs grep's 76 — one tag the non-greedy regex
    could not bound at all, so it was invisible to the grep.

Net: the scanner is the better instrument, and the grep's value was as an
INDEPENDENT cross-check, not as ground truth. If a future run diverges from
these figures, resolve which instrument moved before trusting either. A zero is
a claim, not a pass.

KNOWN LIMITATION (disclosed, not hidden — survey-length-controls.py precedent)
=============================================================================
Tag boundaries come from a hand-written brace/quote-aware scanner, NOT a real
JS parser. It tracks {} and () depth plus string state to find the '>' or '/>'
that closes the OPENING TAG, which is what makes it safe against the two
things that broke the naive versions: '=>' inside every onChange handler, and
nested children inside a container control.

It is still not a parser. It does not understand JSX comments, regex literals,
or template-literal ${} interpolation containing unbalanced braces. Any tag
whose props still contain a stray '<' after scanning is classified AMBIGUOUS
and reported for manual handling, never rewritten — the same
refuse-rather-than-guess discipline as migrate-tier-object.py.

Live run 2026-08-13: 3 AMBIGUOUS out of 760 (button/edit.js:437,
hero/edit.js:564, product-card/edit.js:1433). Each needs one hand edit.

⚠ An earlier revision of this very docstring claimed "0 AMBIGUOUS" — written
before the run that would have checked it, and false. Left recorded rather than
quietly corrected: a stated figure that was never measured is the failure this
file's own zeroIsAClaim section exists to prevent, and the author walked into it
while writing that section.

Components are matched by their JSX TAG NAME. This tree imports them through
src/components/primitives/index.js under stable aliases, so the tag name is the
identity that matters; an import renamed at its call site would be missed.

SIZED_COMPONENTS EVIDENCE
=========================
Six names are taken from live WP deprecation warnings observed in the editor
console (listed above) — that is WordPress itself naming them. NumberControl is
included on weaker evidence: it wraps InputControl and this tree already passes
the prop to it (before-after/edit.js, card-grid/edit.js). Flagged here so a
future reader can see the two tiers of evidence rather than assuming parity.

Usage:
    python scripts/surveys/survey-control-parity.py --survey [--json]
    python scripts/surveys/survey-control-parity.py --fix            # dry-run
    python scripts/surveys/survey-control-parity.py --fix --apply    # write
    python scripts/surveys/survey-control-parity.py --check          # CI gate
    python scripts/surveys/survey-control-parity.py --self-test
    ... plus --exclude <substring>  (repeatable; skip paths another session owns)
"""

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

# Anchored on THIS FILE, never on cwd. A sibling gate
# (scripts/check-markup-neutral.py) silently reported "no staged files" when
# run from the plugin dir instead of the repo root on 2026-08-13; a path that
# depends on where you stood is a bug waiting to be misread as a clean result.
PLUGIN_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = PLUGIN_ROOT / "src"

PROP = "__next40pxDefaultSize"

# Tier 1 - named by WordPress's own deprecation warnings (see docstring).
SIZED_COMPONENTS_CORE = [
    "UnitControl",
    "RangeControl",
    "SelectControl",
    "TextControl",
    "BoxControl",
    "ToggleGroupControl",
]
# Tier 2 - weaker evidence: in-tree usage, not a live warning.
SIZED_COMPONENTS_INFERRED = ["NumberControl"]
SIZED_COMPONENTS = SIZED_COMPONENTS_CORE + SIZED_COMPONENTS_INFERRED

# Axis B - attribute-name families where WordPress ships ONE grouped composite.
# Keyed by the native composite that would replace the cluster.
COMPOSITE_FAMILIES = {
    "BorderControl / BorderBoxControl": {
        "suffixes": ["BorderWidth", "BorderColour", "BorderColor", "BorderStyle"],
        "min_members": 2,
        "native_shape": "{ color, style, width } object",
    },
}

STATUS_MISSING = "MISSING"
STATUS_OK = "OK"
STATUS_AMBIGUOUS = "AMBIGUOUS"

# Self-test fixture kept at module level: it mixes quote styles and a
# line comment, which is exactly the thing that is painful to inline.
APOSTROPHE_FIXTURE = "\n".join(
    [
        "<SelectControl",
        "\t// the block's own default isn't in the shared list",
        "\tvalue={ x }",
        "/>",
    ]
)


def _base():
    """Root that reported paths are relative to.

    Derived from SRC_DIR, NOT from the module-level PLUGIN_ROOT, so --self-test
    can repoint SRC_DIR at a temp tree and still resolve. Anchoring these to two
    different roots is what broke the first run of this file's own self-test.
    """
    return SRC_DIR.parent


def _iter_js_files(exclude):
    base = _base()
    for p in sorted(SRC_DIR.rglob("*.js")):
        rel = p.relative_to(base).as_posix()
        if any(x in rel for x in exclude):
            continue
        yield p, rel


def _mask_comments(text):
    """Blank every JS comment IN PLACE, preserving length and newlines.

    Length preservation is load-bearing. `scan_axis_a` derives line numbers from
    character offsets into this text, and `cmd_fix` rewrites spans against the
    ORIGINAL file bytes. Deleting comment text would shift every span after it
    and the codemod would rewrite the wrong region.

    Ordering mirrors the in-tag walker below: a comment is recognised BEFORE a
    quote can open, because comment prose routinely contains apostrophes
    ("isn't") that would otherwise leave the scanner in a quote state that never
    closes.

    Caught 2026-08-19. `BorderStyleControl.js`'s docblock reads "the previous
    hand-rolled `<SelectControl>` this replaces", and the raw-text regex in
    `_find_opening_tags` read that prose as a live mount - a phantom gate
    failure on a file whose only real mount was already conformant. A false
    positive is a detector bug, never baseline fodder.

    Like the walker below, this is not a parser: a `/` opening a regex literal
    is not tracked. In practice a regex literal begins `/\\` or `/[^...`, never
    `//` or `/*`, so the two cannot be confused here.
    """
    out = list(text)
    i, n = 0, len(text)
    quote = None
    while i < n:
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
        elif ch == "/" and i + 1 < n and text[i + 1] == "/":
            nl = text.find("\n", i)
            nl = n if nl == -1 else nl
            for k in range(i, nl):
                out[k] = " "
            i = nl
        elif ch == "/" and i + 1 < n and text[i + 1] == "*":
            close = text.find("*/", i + 2)
            close = n if close == -1 else close + 2
            for k in range(i, close):
                if out[k] != "\n":
                    out[k] = " "
            i = close
        else:
            if ch in "\"'`":
                quote = ch
            i += 1
    return "".join(out)


def _find_opening_tags(text, name):
    """Yield (start, end, props, self_closing) for every <Name ...> in text.

    A real brace/quote-aware scanner, NOT a regex. The first version of this
    file used `<Name\\b(.*?)/>` and it was wrong in two ways that a live run
    exposed immediately:

      1. It ended at the FIRST '/>', so `<ToggleGroupControl>` - which always
         wraps <ToggleGroupControlOption/> children - matched only as far as
         the first child. ALL 20 live sites came back unusable.
      2. Matching to the first '>' instead is equally wrong, because '>' occurs
         constantly inside props: every `onChange={ () => ... }` contains one.

    So this walks the opening tag tracking {} / () depth and quote state, and
    stops at the '>' or '/>' that closes the TAG at depth zero. Container and
    self-closing elements are both handled, which is what makes the codemod
    safe to run unattended.
    """
    # Scan the MASKED copy: same length, same newlines, so every offset yielded
    # here still indexes the caller's ORIGINAL text exactly.
    text = _mask_comments(text)
    pat = re.compile(r"<" + name + r"(?![A-Za-z0-9_])")
    for m in pat.finditer(text):
        i = m.end()
        depth = 0
        quote = None
        # A '<' that appears OUTSIDE a string is a real nested element and means
        # the scan lost its bearings. A '<' INSIDE a string is ordinary text —
        # e.g. button/edit.js's help copy "Used as the SVG <title> for screen
        # readers". Flagging that as ambiguous made three perfectly fixable
        # controls unfixable, so the two cases are distinguished here rather
        # than by a blunt `'<' in props` test on the extracted slice.
        saw_bare_lt = False
        n = len(text)
        while i < n:
            ch = text[i]
            if quote:
                if ch == "\\":
                    i += 2
                    continue
                if ch == quote:
                    quote = None
            # COMMENTS ARE SKIPPED WHOLE, before quote handling. JS comments
            # routinely contain apostrophes ("isn't", "doesn't"), and treating
            # one as a string opener leaves the scanner stuck in a quote state
            # that never closes — it then swallows the rest of the tag and the
            # element reads as AMBIGUOUS. Real case: hero/edit.js's minHeight
            # SelectControl, whose rationale comment contains "isn't"
            # (caught 2026-08-13, the last false ambiguity of the pass).
            elif ch == "/" and i + 1 < n and text[i + 1] == "/":
                nl = text.find("\n", i)
                i = n if nl == -1 else nl
                continue
            elif ch == "/" and i + 1 < n and text[i + 1] == "*":
                close = text.find("*/", i + 2)
                i = n if close == -1 else close + 2
                continue
            elif ch in "\"'`":
                quote = ch
            elif ch == "<":
                saw_bare_lt = True
            elif ch in "{(":
                depth += 1
            elif ch in "})":
                depth -= 1
            elif depth == 0:
                if ch == "/" and i + 1 < n and text[i + 1] == ">":
                    yield m.start(), i + 2, text[m.end():i], True, saw_bare_lt
                    break
                if ch == ">":
                    yield m.start(), i + 1, text[m.end():i], False, saw_bare_lt
                    break
            i += 1


def scan_axis_a(exclude):
    """Axis A - size-prop conformance. Returns a list of finding dicts."""
    findings = []
    for path, rel in _iter_js_files(exclude):
        text = path.read_text(encoding="utf-8", errors="replace")
        for name in SIZED_COMPONENTS:
            for start, end, props, self_closing, saw_bare_lt in _find_opening_tags(
                text, name
            ):
                line = text[:start].count("\n") + 1
                if PROP in props:
                    status = STATUS_OK
                elif saw_bare_lt:
                    # A '<' outside any string = a real nested element, so the
                    # scan lost its bearings. Report, never rewrite.
                    status = STATUS_AMBIGUOUS
                else:
                    status = STATUS_MISSING
                findings.append(
                    {
                        "axis": "A",
                        "component": name,
                        "file": rel,
                        "line": line,
                        "status": status,
                        "evidence": "wp-deprecation"
                        if name in SIZED_COMPONENTS_CORE
                        else "in-tree-usage",
                        "self_closing": self_closing,
                        "span": (start, end),
                    }
                )
    return findings


def scan_axis_b(exclude):
    """Axis B - hand-rolled clusters where a native composite exists.

    CANDIDATES ONLY. Never auto-fixed. See the docstring's hard rule.
    """
    candidates = []
    for path, rel in _iter_js_files(exclude):
        text = path.read_text(encoding="utf-8", errors="replace")
        for composite, spec in COMPOSITE_FAMILIES.items():
            # Group by the attribute PREFIX so `tileBorderWidth` +
            # `tileBorderColour` read as one cluster on the `tile` element,
            # rather than as two unrelated hits.
            prefixes = {}
            for suffix in spec["suffixes"]:
                for m in re.finditer(r"\b([a-z][A-Za-z0-9]*)" + suffix + r"\b", text):
                    prefixes.setdefault(m.group(1), set()).add(suffix)
            for prefix, found in sorted(prefixes.items()):
                if len(found) >= spec["min_members"]:
                    candidates.append(
                        {
                            "axis": "B",
                            "file": rel,
                            "prefix": prefix,
                            "members": sorted(found),
                            "native_composite": composite,
                            "native_shape": spec["native_shape"],
                        }
                    )
    return candidates


def _summarise_a(findings):
    per = {}
    for f in findings:
        d = per.setdefault(f["component"], {STATUS_OK: 0, STATUS_MISSING: 0, STATUS_AMBIGUOUS: 0})
        d[f["status"]] += 1
    return per


def cmd_survey(exclude, as_json):
    a = scan_axis_a(exclude)
    b = scan_axis_b(exclude)
    per = _summarise_a(a)
    missing = [f for f in a if f["status"] == STATUS_MISSING]
    ambiguous = [f for f in a if f["status"] == STATUS_AMBIGUOUS]

    if as_json:
        print(
            json.dumps(
                {
                    "axis_a": {"per_component": per, "findings": a},
                    "axis_b": b,
                    "totals": {
                        "missing": len(missing),
                        "ambiguous": len(ambiguous),
                        "ok": sum(d[STATUS_OK] for d in per.values()),
                        "files_with_missing": len({f["file"] for f in missing}),
                    },
                },
                indent=2,
            )
        )
        return 0

    print("=" * 72)
    print("  CONTROL PARITY - do SGS controls match native WordPress?")
    print("=" * 72)
    print()
    print("AXIS A - size prop (__next40pxDefaultSize). AUTO-FIXABLE.")
    print(f"  {'component':22} {'OK':>5} {'MISSING':>8} {'AMBIG':>6}  evidence")
    for name in SIZED_COMPONENTS:
        d = per.get(name)
        if not d:
            continue
        ev = "wp-deprecation" if name in SIZED_COMPONENTS_CORE else "in-tree-usage"
        print(f"  {name:22} {d[STATUS_OK]:5d} {d[STATUS_MISSING]:8d} {d[STATUS_AMBIGUOUS]:6d}  {ev}")
    print(f"  {'TOTAL':22} {sum(d[STATUS_OK] for d in per.values()):5d} "
          f"{len(missing):8d} {len(ambiguous):6d}")
    print(f"\n  Files with >=1 missing: {len({f['file'] for f in missing})}")
    if ambiguous:
        print(f"\n  !! {len(ambiguous)} AMBIGUOUS span(s) - nested JSX in props, "
              f"never auto-fixed (see KNOWN LIMITATION):")
        for f in ambiguous[:10]:
            print(f"      {f['file']}:{f['line']}  <{f['component']}>")
    print()
    print("AXIS B - hand-rolled clusters where a native grouped composite exists.")
    print("  ** CANDIDATES ONLY - never auto-fixed. Adopting the composite changes")
    print("     stored attr shape (flat scalars -> object); WP silently discards a")
    print("     type mismatch (D338). This is a design gate for Bean, not a codemod.")
    if not b:
        print("\n  (none found)")
    else:
        print(f"\n  {len(b)} candidate cluster(s):")
        for c in b:
            print(f"    {c['file']}")
            print(f"      prefix '{c['prefix']}' -> {', '.join(c['members'])}")
            print(f"      native: {c['native_composite']}  storing {c['native_shape']}")
    print()
    print("!! Adding the Axis-A prop makes controls TALLER (32 -> 40px). That is the")
    print("  correct native size and WP 7.1 forces it regardless, but it is not a")
    print("  no-op: inspector density changes everywhere. Verify visually.")
    return 0


def cmd_fix(exclude, apply_changes):
    """Insert the size prop. Axis A only, MISSING only, never AMBIGUOUS."""
    findings = [f for f in scan_axis_a(exclude) if f["status"] == STATUS_MISSING]
    by_file = {}
    for f in findings:
        by_file.setdefault(f["file"], []).append(f)

    total = 0
    base = _base()
    for rel, items in sorted(by_file.items()):
        path = base / rel
        text = path.read_text(encoding="utf-8", errors="replace")
        # Right-to-left so earlier spans keep their offsets.
        for f in sorted(items, key=lambda x: x["span"][0], reverse=True):
            start, end = f["span"]
            span = text[start:end]
            if PROP in span:
                continue
            # Closing delimiter differs: '/>' for a self-closing control,
            # bare '>' for a container like <ToggleGroupControl> that wraps
            # its options. Both must be handled or 20 live sites go unfixed.
            close = "/>" if f.get("self_closing") else ">"
            m = re.search(r"(\n([\t ]*))" + re.escape(close) + r"$", span)
            if m:
                # Multi-line tag: give the prop its own line, one level in from
                # the closing delimiter, matching the surrounding style.
                indent = m.group(2)
                new_span = span[: m.start()] + f"\n{indent}\t{PROP}" + m.group(1) + close
            else:
                # Single-line tag: append inline before the delimiter.
                new_span = span[: -len(close)].rstrip() + f" {PROP} {close}"
            text = text[:start] + new_span + text[end:]
            total += 1
        if apply_changes:
            # newline='' so existing line endings survive; a wholesale CRLF->LF
            # rewrite would turn a 1-line change into a whole-file diff.
            with open(path, "w", encoding="utf-8", newline="") as fh:
                fh.write(text)
        print(f"  {'WROTE' if apply_changes else 'would fix'}: {rel}  (+{len(items)})")
    print(f"\n{'Applied' if apply_changes else 'Dry run -'} {total} insertion(s) "
          f"across {len(by_file)} file(s).")
    if not apply_changes:
        print("Re-run with --apply to write.")
    return 0


def cmd_check(exclude):
    findings = scan_axis_a(exclude)
    missing = [f for f in findings if f["status"] == STATUS_MISSING]
    if missing:
        print(f"[control-parity] FAIL - {len(missing)} control(s) missing {PROP} "
              f"across {len({f['file'] for f in missing})} file(s).")
        for f in missing[:15]:
            print(f"    {f['file']}:{f['line']}  <{f['component']}>")
        if len(missing) > 15:
            print(f"    ... +{len(missing)-15} more (run --survey for the full list)")
        print(f"  FIX: python {Path(__file__).name} --fix --apply")
        return 1
    print(f"[control-parity] PASS - every sized control passes {PROP}.")
    return 0


# ─────────────────────────── self-test ────────────────────────────────────


def self_test():
    passed = failed = 0

    def check(name, cond):
        nonlocal passed, failed
        if cond:
            passed += 1
        else:
            failed += 1
            print(f"  FAIL: {name}")

    global SRC_DIR
    real_src = SRC_DIR
    with tempfile.TemporaryDirectory() as td:
        root = Path(td) / "src" / "blocks" / "fixture"
        root.mkdir(parents=True)
        SRC_DIR = Path(td) / "src"

        # POSITIVE - one per sized component, all missing the prop.
        missing_src = "\n".join(
            f"<{n}\n\tlabel={{ 'x' }}\n/>" for n in SIZED_COMPONENTS
        )
        (root / "missing.js").write_text(missing_src, encoding="utf-8")

        # NEGATIVE - already conformant. Proves the detector can say "clean"
        # and is not hard-wired to always report a finding.
        (root / "ok.js").write_text(
            "\n".join(f"<{n}\n\tlabel={{ 'x' }}\n\t{PROP}\n/>" for n in SIZED_COMPONENTS),
            encoding="utf-8",
        )

        # NEGATIVE - an unrelated component must never be flagged.
        (root / "unrelated.js").write_text("<DesignTokenPicker value={ x } />", encoding="utf-8")

        # NEGATIVE - substring trap: 'MyUnitControl' is NOT 'UnitControl'.
        (root / "substring.js").write_text("<MyUnitControl value={ x } />", encoding="utf-8")

        # REGRESSION - a '<' inside a STRING is ordinary text, NOT nested JSX.
        # Real case: button/edit.js help copy "Used as the SVG <title> for
        # screen readers". A blunt `'<' in props` test called this ambiguous
        # and made 3 fixable controls unfixable (caught 2026-08-13).
        (root / "lt_in_string.js").write_text(
            '<TextControl\n\thelp={ __( "the SVG <title> element" ) }\n/>',
            encoding="utf-8",
        )

        # REGRESSION - a JS comment containing an APOSTROPHE must not put
        # the scanner into a stuck quote state. Real case: hero/edit.js
        # minHeight SelectControl, rationale comment says "isn't".
        (root / "apostrophe_comment.js").write_text(
            APOSTROPHE_FIXTURE, encoding="utf-8"
        )

        # REGRESSION - a control named only in PROSE is not a mount. Real case
        # (2026-08-19): BorderStyleControl.js's docblock says "the previous
        # hand-rolled <SelectControl> this replaces", and the raw-text regex
        # reported it as a live control missing the prop - a phantom gate
        # failure on an already-conformant file.
        (root / "docblock_mention.js").write_text(
            "/**\n * The old <SelectControl> this replaces offered nine options.\n */\n"
            "export default function X() { return null; }\n",
            encoding="utf-8",
        )

        # NEGATIVE-CONTROL VACUITY GUARD for the fixture above. Masking comments
        # must not blind the scanner to a REAL mount sitting beside prose that
        # names a different control. Exactly one finding, and it must be the
        # RangeControl - never the commented TextControl or SelectControl.
        (root / "mixed_comment_and_mount.js").write_text(
            "// <TextControl label={ 'nope' } />\n"
            "/**\n * Replaces the hand-rolled <SelectControl>.\n */\n"
            "<RangeControl\n\tlabel={ 'x' }\n/>\n",
            encoding="utf-8",
        )

        # REGRESSION - nested JSX in a prop must be AMBIGUOUS, never fixed.
        # A naive non-greedy match ends at the inner '/>' and would rewrite the
        # wrong span; this fixture locks that.
        (root / "nested.js").write_text(
            "<UnitControl\n\tlabel={ <Icon/> }\n/>", encoding="utf-8"
        )

        found = scan_axis_a([])
        by = {}
        for f in found:
            by.setdefault(Path(f["file"]).name, []).append(f)

        check("missing.js flags every sized component",
              len([f for f in by.get("missing.js", []) if f["status"] == STATUS_MISSING])
              == len(SIZED_COMPONENTS))
        check("ok.js flags nothing",
              all(f["status"] == STATUS_OK for f in by.get("ok.js", [])))
        check("ok.js was actually scanned (non-vacuous)", len(by.get("ok.js", [])) > 0)
        check("unrelated component not flagged", "unrelated.js" not in by)
        check("substring name not matched", "substring.js" not in by)
        check("'<' inside a STRING stays FIXABLE (not ambiguous)",
              [f["status"] for f in by.get("lt_in_string.js", [])] == [STATUS_MISSING])
        check("apostrophe in a // comment stays FIXABLE",
              [f["status"] for f in by.get("apostrophe_comment.js", [])] == [STATUS_MISSING])
        check("a control named only in a DOCBLOCK is not a mount",
              "docblock_mention.js" not in by)
        check("prose beside a real mount flags the mount only (non-vacuous)",
              [(f["component"], f["status"])
               for f in by.get("mixed_comment_and_mount.js", [])]
              == [("RangeControl", STATUS_MISSING)])
        check("nested JSX classified AMBIGUOUS",
              [f["status"] for f in by.get("nested.js", [])] == [STATUS_AMBIGUOUS])

        # GATE-LEVEL proof: --check must FAIL on the dirty tree, then PASS once
        # fixed. A gate that cannot fail reads green forever.
        check("check() fails on a dirty tree", cmd_check([]) == 1)
        cmd_fix([], apply_changes=True)
        check("check() passes after --fix --apply", cmd_check([]) == 0)

        # The fixer must not have touched the ambiguous span.
        nested_after = (root / "nested.js").read_text(encoding="utf-8")
        check("fixer left AMBIGUOUS span untouched", PROP not in nested_after)

        # Axis B: a real cluster is a candidate; a lone member is not.
        (root / "border.js").write_text(
            "const x = attributes.tileBorderWidth; const y = attributes.tileBorderColour;",
            encoding="utf-8",
        )
        (root / "lone.js").write_text(
            "const x = attributes.cardBorderWidth;", encoding="utf-8"
        )
        b = scan_axis_b([])
        names = {Path(c["file"]).name for c in b}
        check("Axis B flags a 2-member cluster", "border.js" in names)
        check("Axis B ignores a lone member", "lone.js" not in names)

        # --exclude must genuinely remove a file (used to protect a concurrent
        # session's files from a bulk edit).
        excluded = scan_axis_a(["fixture/missing.js"])
        check("--exclude removes the excluded path",
              not any("missing.js" in f["file"] for f in excluded))

    SRC_DIR = real_src
    print(f"\nself-test: {passed} passed, {failed} failed")
    return failed == 0


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--survey", action="store_true", help="Run the census.")
    ap.add_argument("--json", action="store_true", help="Machine-readable output.")
    ap.add_argument("--fix", action="store_true", help="Insert the size prop (Axis A).")
    ap.add_argument("--apply", action="store_true", help="With --fix: actually write.")
    ap.add_argument("--check", action="store_true", help="CI gate; exit 1 on findings.")
    ap.add_argument("--self-test", action="store_true", help="Prove the detector works.")
    ap.add_argument(
        "--exclude",
        action="append",
        default=[],
        metavar="SUBSTR",
        help="Skip paths containing SUBSTR (repeatable). Use to protect files "
             "a concurrent session owns.",
    )
    args = ap.parse_args()

    if args.self_test:
        sys.exit(0 if self_test() else 1)
    if args.check:
        sys.exit(cmd_check(args.exclude))
    if args.fix:
        sys.exit(cmd_fix(args.exclude, args.apply))
    if args.survey:
        sys.exit(cmd_survey(args.exclude, args.json))
    ap.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
