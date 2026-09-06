#!/usr/bin/env python
"""Negative + positive control for the spec purge.

MUST_SURVIVE: guard-rail sentences that carry an anti-regression rule. A purge that reads
clean in a diff but silently ate these has done real damage - they are the whole reason the
CONDENSE rules exist rather than deleting everything. Matched by CONTENT, never by line
number, because every line number shifts during the purge.

MUST_VANISH: rot that the register says is being removed. Without this half the script has a
vacuity mode - if MUST_SURVIVE patterns were wrong or over-broad they would pass against any
file at all, including an unedited one. MUST_VANISH failing BEFORE the purge and passing
AFTER is what proves the script is actually reading the specs.

Run --baseline before editing (expect: survive PASS, vanish FAIL) and --verify after
(expect: both PASS).
"""
import re, sys, pathlib

SPECS = pathlib.Path(__file__).parent.parent.parent / "specs"

# (spec, human name, regex that must STILL match after the purge)

def phrase(text):
    """Build a regex for a literal phrase that tolerates markdown line-wrapping.

    Specs re-wrap when edited, so a phrase that sat on one line before the purge can end up
    split across two with a blockquote "> " prefix on the continuation. Matching the raw
    string then reports a LOSS when the sentence is intact - which it did here twice for the
    same sentence. Any run of whitespace in the phrase matches whitespace optionally
    interrupted by a "> " continuation marker.
    """
    return r"[\s>]*".join(re.escape(w) for w in text.split())

MUST_SURVIVE = [
    ("11-SGS-BUTTON-ARCHITECTURE.md", "inline beats :hover failure mode",
     phrase("inline beats") + r"[\s>`']*:hover"),
    ("32-COMPONENT-STYLING-TOKEN-CONTRACT.md", "'last one' is only as wide as the grep",
     phrase("scope of the sweep, not the count")),
    ("36-SGS-NAVIGATION-SYSTEM.md", "iframe/editorStyle retraction + CC-memory mirror",
     r"feedback_wp_iframe_canvas_ignores_editorstyle_use_style_css"),
    ("36-SGS-NAVIGATION-SYSTEM.md", "hard save-gate considered and REJECTED",
     r"save[- ]gate.{0,40}REJECTED|REJECTED.{0,60}blocked from saving"),
    ("36-SGS-NAVIGATION-SYSTEM.md", "grep-that-cannot-match meta-lesson",
     r"GREP.PATTERN.THAT.CANNOT.MATCH|pattern that cannot match proves nothing"),
    ("37-HEADER-FOOTER-BUILDER.md", "rejected-alternatives record",
     phrase("Rejected alternative") + r"s?:"),
    ("38-SGS-MOTION-SYSTEM.md", "why ScrollSmoother was rejected",
     r"ScrollSmoother"),
    ("27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md", "sku_matrix will not be built",
     r"_sgs_sku_matrix"),
    ("31-UNIVERSAL-CLONING-PIPELINE.md", "do-not-cite-as-active-gates guard",
     r"[Dd]o NOT cite them as active gates"),
    ("11-SGS-BUTTON-ARCHITECTURE.md", "Spec 32 is the canonical styling model",
     r"Spec 32"),
]

# (spec, human name, regex that must NO LONGER match after the purge)
MUST_VANISH = [
    ("11-SGS-BUTTON-ARCHITECTURE.md", "the deprecated.js migration procedure",
     r"Add\s+`?deprecated\.js`?\s+v1"),
    ("02-SGS-BLOCKS.md", "deprecated.js migration claims",
     r"deprecated\.js`?\s*v\d"),
    ("30-SGS-WOOCOMMERCE-PAGE-TYPES.md", "cosmetic strikethrough on shipped items",
     r"~~\*\*P\d"),
    ("35-BLOCK-INSPECTOR-UX-STANDARD.md", "kept-for-the-record annotations",
     r"kept for the record only"),
    ("38-SGS-MOTION-SYSTEM.md", "stale two-tier title",
     r"two-tier motion doctrine"),
]

def run(mode):
    fails = []
    print(f"=== MUST SURVIVE ({len(MUST_SURVIVE)}) ===")
    for spec, name, pat in MUST_SURVIVE:
        p = SPECS / spec
        text = p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""
        ok = bool(re.search(pat, text, re.I))
        print(f"  {'PASS' if ok else 'FAIL'}  {spec:<44} {name}")
        if not ok:
            fails.append(f"LOST: {spec} - {name}")

    print(f"\n=== MUST VANISH ({len(MUST_VANISH)}) ===")
    vanished = 0
    for spec, name, pat in MUST_VANISH:
        p = SPECS / spec
        text = p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""
        gone = not re.search(pat, text, re.I)
        vanished += gone
        if mode == "baseline":
            # Before the purge these SHOULD still be present. One that is already absent
            # means the pattern is wrong and would pass vacuously after the purge.
            print(f"  {'present (good)' if not gone else 'ABSENT - PATTERN SUSPECT'}  "
                  f"{spec:<40} {name}")
            if gone:
                fails.append(f"VACUOUS PATTERN: {spec} - {name} (absent before any edit)")
        else:
            print(f"  {'PASS' if gone else 'FAIL'}  {spec:<44} {name}")
            if not gone:
                fails.append(f"STILL PRESENT: {spec} - {name}")

    print()
    if mode == "baseline":
        print(f"BASELINE: {len(MUST_SURVIVE)} guard rails present, "
              f"{len(MUST_VANISH)-vanished}/{len(MUST_VANISH)} rot markers present (want all).")
    if fails:
        print("PROBLEMS:")
        for f in fails:
            print(f"  - {f}")
        return 1
    print("OK")
    return 0

sys.exit(run("baseline" if "--baseline" in sys.argv else "verify"))
