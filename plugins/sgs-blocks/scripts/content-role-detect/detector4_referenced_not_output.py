#!/usr/bin/env python3
"""
Detector 4 — "referenced in code, but never escaped to output and never CSS".

WHAT THIS CLOSES
----------------
D1/D2/D3 all look for evidence that a value IS content. Nothing looked for the
opposite positive evidence: a value that the block demonstrably USES, but never
sends to an output-escaping call and never paints a CSS property. That shape is
a machine-facing value -- a form-processing key, a conditional-logic operand, a
query argument.

Before this detector those rows sat at ``role = NULL``, which reads identically
to "nobody has examined this yet". The dominant real case is the form
conditional-visibility trio -- ``conditionalField`` / ``conditionalOperator`` /
``conditionalValue`` across the form-field blocks -- consumed by
``includes/forms/`` and ``form/view.js`` to decide whether a field is shown.
They are configuration, not copy, and no draft mockup carries a signal they
could be lifted from.

WHY REFERENCE-WITHOUT-OUTPUT IS EVIDENCE, NOT ABSENCE
-----------------------------------------------------
The claim is NOT "no detector reached it, so it must be technical" -- that would
be inference from ignorance and would relabel every genuinely-unexamined row.
The claim is narrower and positive: **this attribute is read by the block's own
code** (we found the read), **and** it never reaches an escaping call (D1 walked
every escaping call and produced nothing for it) **and** it has no css_property
(the emission parser found no declaration it paints). Three facts, all measured.

An attribute nothing reads at all is NOT claimed here -- that is a DEAD
attribute, a different finding with a different fix (delete it), and
``check-dead-controls.js`` CHECK 4 owns it.

BLIND SPOTS (enumerated, per the Task F "ENFORCED" bar point 7)
---------------------------------------------------------------
1. A dynamic/computed read (``$attributes[$key]``, ``attributes[`${x}Suffix`]``)
   is invisible to the literal-name search, so such an attr stays unclaimed.
   Bounded to FALSE NEGATIVES -- it can never cause a false positive.
2. The reference search cannot tell a real read from the attribute NAME
   appearing in an unrelated string. Mitigated by requiring one of the
   structured access shapes below, never a bare word match.
3. Consumption from a sibling block's code (a parent reading a child's attr) is
   not searched -- only the block's own directory plus the shared trees.
4. An attribute read ONLY in a theme pattern or template is not covered here.

READ-ONLY. Proposes; never writes to sgs-framework.db.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent.parent          # plugins/sgs-blocks
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"
SHARED_DIRS = [PLUGIN_ROOT / "includes", PLUGIN_ROOT / "src" / "components"]
SOURCE_SUFFIXES = (".php", ".js")


# Signals that the surrounding expression is BUILDING CSS: a custom property, a
# declaration, an inline style string, or a call into the style helpers. Matched
# against the referencing line, never against the attribute name.
_CSS_EMISSION_CONTEXT = re.compile(
    r"--sgs-|\bstyle\s*=|\bstyles\s*\[\]|_decls\b|\bcss\b\s*\.?=|"
    r"sgs_css_length|wp_style_engine|sgs_typography_css_rule|"
    r"[a-z-]+\s*:\s*['\"]?\s*\.?\s*\$|'\s*[a-z-]+\s*:\s*'",
    re.IGNORECASE,
)


def _access_patterns(attr: str) -> list[re.Pattern]:
    """Structured access shapes only -- never a bare word match.

    A bare `attr in text` would match the name inside a comment, a translated
    label, or an unrelated identifier. Every pattern here requires the attribute
    to appear in a position where it is genuinely being READ off the attributes
    bag (or destructured from it).
    """
    a = re.escape(attr)
    return [
        re.compile(rf"attributes\s*\[\s*['\"]{a}['\"]\s*\]"),   # PHP + JS bracket
        re.compile(rf"attributes\s*\.\s*{a}\b"),                 # JS dot access
        re.compile(rf"['\"]{a}['\"]\s*=>"),                      # PHP array key
        re.compile(rf"\bsetAttributes\s*\(\s*\{{\s*{a}\b"),      # JS write
    ]
    # REMOVED 2026-08-05, the same day it was written: a bare
    # `\b{attr}\s*[,}]` "JS destructure member" pattern. It was a bare-word match
    # wearing a structured-looking costume — it matched the attribute name
    # followed by a comma or brace ANYWHERE: any object literal, any argument
    # list, any unrelated identifier. Measured damage before removal:
    # sgs/button.anchor "resolved" to includes/lucide-icons.php:77, a file with
    # no connection to that attribute, and the claimed population was inflated
    # roughly fourfold.
    #
    # A real destructure read (`const { x } = attributes;`) only means anything
    # if the attributes bag is in scope, and proving that needs scope analysis,
    # not a regex. Losing the shape costs FALSE NEGATIVES (bounded, and they
    # simply stay unclaimed); keeping it generated false positives (unbounded,
    # and silently).


def _iter_sources(block_slug: str):
    """The block's own files plus the shared trees.

    The shared trees are NOT optional. Scoping a consumption search to a block's
    own directory is exactly how a wrapper-consumed attribute gets misread as
    unconsumed -- that error was made on sgs/google-reviews.gap earlier in this
    programme and cost a wrong 'dead attribute' finding.
    """
    slug = block_slug.split("/", 1)[-1]
    roots = [BLOCKS_DIR / slug, *SHARED_DIRS]
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix in SOURCE_SUFFIXES:
                yield path


_source_cache: dict[Path, str] = {}


def _read(path: Path) -> str:
    if path not in _source_cache:
        try:
            _source_cache[path] = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            _source_cache[path] = ""
    return _source_cache[path]


def find_reference(block_slug: str, attr: str) -> tuple[str, int] | None:
    """Return (file, line) of the first structured read, or None."""
    pats = _access_patterns(attr)
    for path in _iter_sources(block_slug):
        text = _read(path)
        if attr not in text:          # cheap pre-filter before the regexes
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            if attr not in line:
                continue
            stripped = line.strip()
            # Skip obvious comment lines -- a mention is not a read.
            if stripped.startswith(("//", "*", "/*", "#")):
                continue
            # A read that happens INSIDE a CSS-emitting expression is a styling
            # read, not a technical one. Structural signal, not a name guess:
            # the same line builds a custom property, a declaration, or a style
            # string. Added 2026-08-05 after 8 rows (shapeDividerTop,
            # gradientColourStart, customWidthUnit …) survived the wrapper-only
            # exclusion because their consumer is the block's OWN render.php
            # rather than the shared wrapper — same conclusion, different file.
            #
            # Deliberately checks the emission CONTEXT, never the attribute's
            # spelling. Name-matching is precisely the mechanism this whole
            # detector programme exists to delete (FR-31-2.1a), and reaching for
            # it here to patch a leak would reintroduce it through the back door.
            if _CSS_EMISSION_CONTEXT.search(line):
                continue
            for pat in pats:
                if pat.search(line):
                    try:
                        rel = path.relative_to(PLUGIN_ROOT.parent.parent)
                    except ValueError:
                        rel = path
                    return (str(rel).replace("\\", "/"), lineno)
    return None


def _styling_from_derived_layer() -> set[tuple[str, str]]:
    """Rows the emission/derived layer already classifies as CSS-painting.

    MUST come from the derived truth FILE, not the DB's css_property column.
    Measured 2026-08-05: reading the DB alone let 30+ unmistakable styling rows
    (gapMobile, gridTemplateColumnsTablet, backgroundOverlayColour,
    shapeDividerTop) be claimed "technical" — because the tier-inheritance and
    grid-element work of that same day writes css_property into THIS file, and it
    does not reach the DB until the next /sgs-update. A detector reading a stale
    DB was measuring yesterday's world and confidently mislabelling today's.

    Note the shared wrapper genuinely DOES read every one of those attributes, so
    the "referenced in code" leg is satisfied for them too. Reference alone was
    never sufficient — this exclusion is the leg that makes the rule honest.
    """
    path = PLUGIN_ROOT / "scripts" / "behavioural-analyser" / "css-property-classifications.json"
    if not path.is_file():
        raise FileNotFoundError(
            f"derived css-property layer missing at {path}. Refusing to run: without it "
            "every styling row looks technical, which is the exact failure this guard "
            "exists to prevent. A missing input must never look like an empty result."
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        (e["slug"], e["attr"])
        for e in data.get("entries", [])
        if (e.get("fields") or {}).get("css_property")
    }


def detect(candidates: list[tuple[str, str]]) -> list[dict]:
    """candidates: [(block_slug, attr_name)] already filtered to role IS NULL
    AND css_property IS NULL AND not content-claimed by D1/D2/D3."""
    out = []
    styling = _styling_from_derived_layer()
    for slug, attr in candidates:
        if (slug, attr) in styling:
            continue
        hit = find_reference(slug, attr)
        # WRAPPER-ONLY READS ARE STYLING, NOT TECHNICAL (2026-08-05).
        #
        # SGS_Container_Wrapper is a CSS-rendering engine: everything it reads off
        # the attributes bag, it reads in order to paint a declaration. So an
        # attribute whose ONLY consumer is that file is styling by construction,
        # whatever the derived layer currently knows about it.
        #
        # It usually knows nothing, and that is the point. The emission scanner
        # only reads each block's own render.php/style.css, never the shared
        # wrapper, so wrapper-painted attrs carry no css_property and slip past
        # the derived-layer exclusion above. Measured: 30 rows —
        # backgroundOverlayColour, overlayGradientFrom/To,
        # shapeDividerTop/Bottom(+Colour) — were being claimed "technical" on
        # exactly this hole. They are the same class as sgs/google-reviews.gap,
        # whose real fix was an explicit `attrMap` declaration on the owning
        # block, not a role.
        #
        # Reported as a distinct finding rather than silently dropped: each one is
        # a block owing an attrMap declaration, which is actionable work, not an
        # unknown.
        if hit and hit[0].endswith("includes/class-sgs-container-wrapper.php"):
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "category": "wrapper-rendered-styling",
                "evidence_file": hit[0],
                "evidence_line": hit[1],
                "action": "declare an explicit attrMap entry on this block "
                          "(see sgs/container's `grid` element) so the emission "
                          "layer can resolve its css_property",
            })
            continue
        if not hit:
            continue
        # PROVEN vs PLAUSIBLE. Only a reference inside a subsystem that emits no
        # CSS AT ALL earns the technical role automatically. Everything else is
        # reported for a human, because "read by the block and not escaped" does
        # not by itself separate a form-processing key from a styling value that
        # is assigned to a variable on one line and painted several lines later.
        #
        # Following that assignment to its paint site is variable-flow analysis —
        # exactly what Detector 1 does for output escaping. Reimplementing it
        # here, badly, under time pressure, is how a confident wrong classifier
        # gets shipped. Two narrower attempts (wrapper-only exclusion, CSS-context
        # on the referencing line) each removed real false positives but left 8
        # rows whose read site is a bare `$x = $attributes['x'] ?? '';`,
        # indistinguishable at this resolution from a technical read.
        #
        # includes/forms/ qualifies because the forms engine is submission and
        # conditional-visibility logic end to end — it paints nothing. That is a
        # property of the SUBSYSTEM, established by reading it, not a guess from
        # any attribute's spelling.
        proven_non_css = "/includes/forms/" in hit[0]
        out.append({
            "block_slug": slug,
            "attr_name": attr,
            "category": "referenced-not-output" if proven_non_css else "d4-needs-review",
            "evidence_file": hit[0],
            "evidence_line": hit[1],
            **({} if proven_non_css else {
                "why_review": "read by the block but not escaped and not obviously "
                              "CSS-emitting at the read site. Could be a technical key "
                              "OR a styling value painted later via a variable. Needs "
                              "a read of the consumer, or D1-style flow analysis."
            }),
        })
    return out


def self_test() -> int:
    """Prove the detector can FAIL, and that each guard is load-bearing."""
    failures = []

    # 1. A real, known consumption must be found. conditionalField is read by the
    #    form field render helpers -- if this stops resolving, the detector has
    #    silently narrowed and the dominant real case is lost.
    hit = find_reference("sgs/form-field-text", "conditionalField")
    if not hit:
        failures.append(
            "conditionalField on sgs/form-field-text produced NO reference. That is "
            "the dominant real case this detector exists for; a zero here means the "
            "search is broken, not that the world is empty."
        )

    # 2. An attribute that genuinely does not exist must NOT resolve. Without this
    #    the detector could be matching anything and every check above would still
    #    pass.
    bogus = find_reference("sgs/form-field-text", "zzzNotARealAttributeName")
    if bogus:
        failures.append(f"a fabricated attribute name resolved to {bogus} — the "
                        "patterns are matching something they should not.")

    # 3. A bare mention in a comment must not count as a read.
    if any(p.search("// conditionalField is explained here") for p in _access_patterns("conditionalField")):
        failures.append("a prose mention matched an access pattern — bare-word "
                        "matching would claim attributes nothing reads.")

    if failures:
        print(f"DETECTOR-4 SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("DETECTOR-4 SELF-TEST PASSED — 3 checks green "
          f"(conditionalField found at {hit[0]}:{hit[1]}).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--candidates", help="JSON file: [[block_slug, attr_name], ...]")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.candidates:
        print("nothing to do: pass --candidates <file.json> or --self-test", file=sys.stderr)
        return 2
    cands = [tuple(x) for x in json.loads(Path(args.candidates).read_text(encoding="utf-8"))]
    for row in detect(cands):
        print(json.dumps(row))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
