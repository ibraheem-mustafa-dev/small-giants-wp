"""Gate: a `*Hover` attribute that carries a real CSS property MUST be classified
as a hover STATE in the derived layer.

WHAT THIS CATCHES (and why it is worth a gate)
----------------------------------------------
Two live client-visible bugs on 2026-08-29 shared one root cause, found by this
exact predicate:

    sgs/testimonial.quoteColourHover      css_property=color            css_state=NULL
    sgs/process-steps.numberBackgroundHover  css_property=background-color  css_state=NULL

Both had a correctly-classified RESTING sibling (`quoteColour` -> element
`quote-text`; `numberBackground` -> element `number`), but the hover twin was
recorded with no state and no element. With no declared element, the render code
fell back to painting at the block ROOT — so hovering a testimonial recoloured
nothing at all (the quote carries its own explicit colour, which beats an
inherited one), and hovering a process step repainted the whole card instead of
the little number badge.

THE PREDICATE IS DELIBERATELY NARROW
------------------------------------
    name LIKE '%Hover%'  AND  css_property IS NOT NULL  AND  css_state IS NULL

Each conjunct earns its place; measured against the live DB on 2026-08-29:

  * WITHOUT `css_property IS NOT NULL` the predicate returns 95 rows, but most
    are attributes that are not CSS at all (`pauseOnHover`, `hoverStyle`,
    `effectHover` — behaviour flags and variant selectors). NULL is CORRECT for
    those, and flagging them would train everyone to ignore this gate.

  * We do NOT also require `css_element IS NULL`. That would over-flag: the nine
    `scaleHover` rows legitimately carry `css_state='hover'` with a NULL element,
    because a transform on the block root genuinely has no sub-element. State is
    the discriminating column here; element is not.

HOVER-ONLY ATTRIBUTES ARE EXEMPT, AND THAT EXEMPTION IS LOAD-BEARING
---------------------------------------------------------------------
The three conjuncts alone return FOUR rows, not two. The other two are
`sgs/gallery.overlayColourHover` and `sgs/business-info.linkHoverBackgroundImage`,
and both are DELIBERATELY undeclared — each block.json `_note` records that
declaring them under `states.hover` was tried and rejected. The reason is real:
FR-35-5's STATE_WITHOUT_BASE check runs independently of clusters, so a
hover-only attribute with NO resting counterpart always trips it, and that
baseline may only ever ratchet DOWN.

So the fourth conjunct is: **a resting twin must exist**. `quoteColourHover` has
`quoteColour`; `numberBackgroundHover` has `numberBackground`; the two exempt
rows have no resting twin at all. That is the honest discriminator between "this
should have been declared and wasn't" and "this cannot be declared". Verified
against the real conformance gate: after the two declarable rows were declared,
`check-element-manifest-conformance.js` reports both as STATE_OK and holds
state-without-base at its 2/2 baseline.

⚠ An exemption heuristic that is never proven to discriminate is just a way of
passing. `--self-test` therefore asserts BOTH directions: a hover-only row is
skipped, AND an otherwise-identical row that DOES have a resting twin is still
caught.

⛔ DO NOT "fix" a future finding by deleting the row or by hand-setting
`css_state` in the derived layer. The derived layer is regenerated. The real fix
is to declare the attribute on its element in the block's own `block.json`
(`supports.sgs.elements.<element>.states.hover.attrMap`) and reseed — that is
what makes the classification true rather than merely present.

Usage:
    python check-hover-state-classification.py            # report
    python check-hover-state-classification.py --check    # gate: exit 1 on any finding
    python check-hover-state-classification.py --self-test
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Iterable, NamedTuple

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


class Row(NamedTuple):
    """One `block_attributes` row, narrowed to the columns this gate reads."""

    block_slug: str
    attr_name: str
    css_property: str | None
    css_element: str | None
    css_state: str | None


def resting_sibling_name(attr_name: str) -> str:
    """The name this hover attribute's RESTING twin would have.

    Removes the first `Hover` token wherever it sits — the codebase uses both
    orders (`quoteColourHover`, `linkHoverTextColour`).
    """
    return attr_name.replace("Hover", "", 1)


def find_unclassified_hover_states(rows: Iterable[Row]) -> list[Row]:
    """THE detector. Pure — takes rows, returns findings, touches no database.

    Kept injectable on purpose. A self-test that reaches into the real DB stops
    testing the moment the real data changes, while still printing PASS (the
    exact failure recorded for `check-wrapper-capability-preconditions.js`, see
    plugins/sgs-blocks/CLAUDE.md). Every assertion below feeds its own fixtures.
    """
    # A hover attribute is only DECLARABLE when a resting twin exists to be its
    # base. See the HOVER-ONLY EXEMPTION note in the module docstring.
    classified_bases = {
        (row.block_slug, row.attr_name) for row in rows if row.css_property is not None
    }

    findings = []
    for row in rows:
        if "Hover" not in row.attr_name:
            continue
        if row.css_property is None:
            # Not a CSS attribute at all (behaviour flag / variant selector).
            continue
        if row.css_state is not None:
            continue
        if (row.block_slug, resting_sibling_name(row.attr_name)) not in classified_bases:
            # HOVER-ONLY: no resting twin, so it cannot be declared under
            # states.hover without manufacturing a STATE_WITHOUT_BASE finding
            # against a down-only baseline. Correctly left unclassified.
            continue
        findings.append(row)
    return findings


def load_rows() -> list[Row]:
    """Read the shared framework DB READ-ONLY.

    Deliberately a plain `sqlite3` connect rather than importing
    `converter/db/db_lookup.py`: that module runs six schema-migration functions
    against this same shared DB as an import side effect, which a read-only
    reporter must never trigger.
    """
    if not SGS_DB.exists():
        print(f"FAIL: framework DB not found at {SGS_DB}", file=sys.stderr)
        raise SystemExit(2)

    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    try:
        cur = con.execute(
            "SELECT block_slug, attr_name, css_property, css_element, css_state "
            "FROM block_attributes WHERE block_slug LIKE 'sgs/%'"
        )
        return [Row(*r) for r in cur.fetchall()]
    finally:
        con.close()


def report(findings: list[Row]) -> None:
    if not findings:
        print("PASS: every *Hover attribute with a CSS property is classified as a hover state.")
        return

    print(f"FAIL: {len(findings)} *Hover attribute(s) carry a CSS property but no hover state.\n")
    for row in sorted(findings):
        print(f"  {row.block_slug}.{row.attr_name}")
        print(f"      css_property = {row.css_property}")
        print(f"      css_element  = {row.css_element}   css_state = {row.css_state}")
        print(
            "      FIX: declare it on its element in block.json under\n"
            "           supports.sgs.elements.<element>.states.hover.attrMap,\n"
            "           then reseed. Do NOT hand-set the derived column.\n"
        )


def self_test() -> int:
    """Prove the detector can FAIL, can PASS, and discriminates between them.

    A gate that only ever returns 0 is indistinguishable from a gate that has
    silently stopped detecting, so the negative control here is load-bearing.
    """
    checks: list[tuple[str, bool]] = []

    # A hover row is only a finding when a RESTING twin exists, so every fixture
    # below that should be caught must be paired with its base.
    base = Row("sgs/fixture", "widgetColour", "color", "widget", None)

    # NEGATIVE CONTROL — a deliberately broken row MUST be flagged.
    broken = Row("sgs/fixture", "widgetColourHover", "color", None, None)
    caught = find_unclassified_hover_states([base, broken])
    checks.append(("negative control: broken row is flagged", caught == [broken]))

    # POSITIVE CONTROL — a correctly classified hover row must NOT be flagged.
    good = Row("sgs/fixture", "textColourHover", "color", "item", "hover")
    checks.append(
        ("positive control: classified hover row passes", find_unclassified_hover_states([good]) == [])
    )

    # A non-CSS *Hover flag (pauseOnHover / hoverStyle / effectHover) is NOT a
    # finding — NULL is the correct classification for a behaviour attribute.
    behaviour = Row("sgs/fixture", "pauseOnHover", None, None, None)
    checks.append(
        ("non-CSS hover flag is not flagged", find_unclassified_hover_states([behaviour]) == [])
    )

    # A root-level transform (scaleHover) legitimately has a NULL element while
    # carrying a hover state. It must NOT be flagged — this is the over-match
    # the predicate was narrowed to avoid.
    root_transform = Row("sgs/fixture", "scaleHover", "transform", None, "hover")
    checks.append(
        ("NULL element with a real state is not flagged", find_unclassified_hover_states([root_transform]) == [])
    )

    # A non-hover attribute is out of scope entirely.
    resting = Row("sgs/fixture", "quoteColour", "color", "quote-text", None)
    checks.append(
        ("resting attribute is out of scope", find_unclassified_hover_states([resting]) == [])
    )

    # HOVER-ONLY EXEMPTION — no resting twin exists, so it cannot be declared
    # without manufacturing a STATE_WITHOUT_BASE finding. Must NOT be flagged.
    # Real instances: sgs/gallery.overlayColourHover,
    # sgs/business-info.linkHoverBackgroundImage.
    hover_only = Row("sgs/fixture", "overlayColourHover", "background-color", "img-wrap", None)
    checks.append(
        ("hover-only row (no resting twin) is exempt", find_unclassified_hover_states([hover_only]) == [])
    )

    # ⭐ THE EXEMPTION'S OWN NEGATIVE CONTROL — the row above, UNCHANGED, but with
    # a resting twin added. It must now be caught. Without this, the exemption
    # could be silently swallowing everything and the suite would still be green.
    overlay_base = Row("sgs/fixture", "overlayColour", "background-color", "img-wrap", None)
    checks.append(
        (
            "exemption discriminates: same row WITH a resting twin is caught",
            find_unclassified_hover_states([overlay_base, hover_only]) == [hover_only],
        )
    )

    # The `linkHoverTextColour` word order must strip too, or that shape would be
    # flagged for the wrong reason.
    checks.append(
        ("Hover token strips in either word order", resting_sibling_name("linkHoverTextColour") == "linkTextColour")
    )

    # Discrimination across a MIXED set — the shape the real DB has. Only the
    # broken row comes back, proving the detector does not flag wholesale.
    mixed = [base, broken, good, behaviour, root_transform, resting, hover_only]
    checks.append(("mixed set returns only the broken row", find_unclassified_hover_states(mixed) == [broken]))

    failed = 0
    for name, ok in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            failed += 1

    print(f"\n{len(checks) - failed}/{len(checks)} self-test assertions passed.")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="exit 1 on any finding (gate mode)")
    parser.add_argument("--self-test", action="store_true", help="run the detector's own assertions")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    findings = find_unclassified_hover_states(load_rows())
    report(findings)
    return 1 if (args.check and findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
