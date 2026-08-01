"""l2_qualify.py — the L2 (CONTENT-layer) relational qualifier. ONE function, unwired.

Answers exactly one question:

    Is this direct child a DISSOLVABLE STRUCTURAL WRAPPER (an L2), or is it real?

THE TRIGGER IS THE PARENT, NEVER THE NODE ITSELF (Bean-locked 2026-08-01).
An L2 is BY DEFINITION a wrapper that dissolves on clone — so it can never be a
block. Any design that requires a node to be recognised as a block before its layer
is classified makes the precondition the NEGATION of what L2 is, and L2 can then
never be detected. That is not a sequencing bug, it is a contradiction, and it is why
`layer_detect` (whose only caller runs after a node is already committed to being a
block) ran exactly TWICE on a tabs draft — the section root and one band — while the
two structural wrappers it existed to classify were destroyed by the content pass
first. The correct trigger is the DIRECT PARENT being a recognised container-kind
block; the child's own identity is an OUTPUT of the question, never an input to it.

Measured basis (2026-08-01, `sites/mamas-munches/mockups/homepage/index.html` +
`.../product/index.html` + the tabs fixture; 377 parent-child pairs):
  * 11 of 11 `inner`/`content`/`body`-named wrappers are the DIRECT CHILD of a node
    with a non-null `container_kind` (section / layout / content / the default
    container all appear — the rule is not tied to one KIND).
  * The qualifier below reproduces Spec 31 §2.7's hand-authored acceptance table
    EXACTLY — 5 folds, 5 non-folds, zero false positives.

DELIBERATELY NOT A REQUIREMENT: "the child carries the layout CSS the parent is
missing (display, gap, tracks)". Measured: SIX of the eight genuine content bands
carry NO arrangement CSS at all — they are `max-width` + `margin:auto` + a
`--content-width` custom property, which is precisely how Spec 31 §2.3 DEFINES the
L2 CONTENT band ("NO grid/flex"). Requiring arrangement excluded 75% of the real
L2s, including the one in the tabs proof case. Do not re-introduce it.

This module is PURE. It reads the DOM and the DB, and returns a verdict. It mutates
nothing, emits no blocks, and is not wired into the pipeline — wiring is a separate,
separately-gated step. No raw sqlite3 (FR-31-8 / the `test_raw_sqlite_gate` contract):
every DB fact comes through `db_lookup`. No block or slot string literals (scanned by
gates/no_slug_literal).

Self-test:  python -m converter.services.l2_qualify --self-test
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from bs4 import NavigableString, Tag

from converter.db import db_lookup
from converter.services import arrangement
from converter.services.styling_helpers import (
    collect_css_decls_for_element,
    strip_important,
)


# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Verdict:
    """The qualifier's answer plus WHY — the reason is the debug channel.

    `failed` names the first requirement that rejected the node; `value` is the
    concrete thing that caused it (the offending CSS property and its value, the
    resolved slug, the text found). A verdict is never a bare boolean: an
    unexplained rejection is unmeasurable, and this qualifier's whole basis is
    measurement.
    """

    dissolvable: bool
    failed: str = ""
    value: Any = None
    homeless_css: dict = field(default_factory=dict)

    def __bool__(self) -> bool:  # so callers can `if verdict:`
        return self.dissolvable


_PASS = Verdict(dissolvable=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_container_kind(slug: str | None) -> bool:
    """True when `slug` is a recognised CONTAINER-EQUIVALENT block.

    The trigger for the whole qualifier. `container_kind` (section / layout /
    content) is the DB's own roster axis for "this block wraps other things"
    (Spec 31 §2.1). CALLER RESPONSIBILITY: a slug-None node is rejected here, NOT
    silently promoted — only the caller knows whether a slug-None node is a SECTION
    ROOT (which becomes the default container per FR-31-4) or merely an unrecognised
    nested node, and promoting the latter would make every wrapper an L1. Callers must
    substitute `container_default_slug()` themselves for a genuine section root.
    DB-driven, no slug literal (R-31-1).
    """
    if not slug:
        return False
    if db_lookup.get_container_kind(slug) is not None:
        return True
    return slug == db_lookup.container_default_slug()


def _effective_decls(node: Tag, css_rules: dict) -> dict[str, str]:
    """The node's own declarations, base tier plus every @media tier folded in.

    Tier-union (not base-only) for the same reason `carries_arrangement` uses it:
    a band that only caps its width at one breakpoint is still a band.
    """
    base, bp = collect_css_decls_for_element(node, css_rules or {})
    out = dict(base)
    for tier in (bp or {}).values():
        if isinstance(tier, dict):
            for prop, val in tier.items():
                out.setdefault(prop, val)
    return {k: strip_important(v).strip() for k, v in out.items()}


_BOX_SIDES = ("-top", "-right", "-bottom", "-left")


def _property_family(prop: str) -> str:
    """Reduce a CSS longhand to the family a block declares a destination for.

    Two reductions, both fixed CSS-spec vocabulary (the same permitted-constant
    class as `dispatch_table._GRID_LAYOUT_PROPS`), never a per-block lookup:

      * per-side box longhands  `padding-top`  -> `padding`
      * gap longhands           `row-gap`      -> `gap`

    The gap case was found by measurement: `gap` lands on every container-kind
    block, `row-gap`/`column-gap` land on NONE of them, yet they are the same
    family. Without this a band declaring `row-gap:16px` instead of the shorthand
    would fail requirement F and refuse to dissolve — the draft's choice of
    longhand vs shorthand would silently decide whether a wrapper folds.
    """
    if prop in ("row-gap", "column-gap"):
        return "gap"
    for side in _BOX_SIDES:
        if prop.endswith(side):
            return prop[: -len(side)]
    return prop


def _lands_on_parent(parent_slug: str, prop: str) -> bool:
    """Does `prop` have ANY attribute destination on the parent block?

    This is the CSS half of Bean's rule: a node whose every declaration routes to
    the OWNING block is "nothing but a way to segregate CSS in the draft". It is
    resolved per-block from the DB — which is why there is no hand-authored
    allowlist here and why `background`/`border` are neither globally admitted nor
    globally banned. `sgs/container` alone declares THREE different background
    destinations (root, content-band, grid-item); the answer is per block and per
    layer, and only the DB knows it.

    A custom property (`--content-width`) is a draft SIGNAL, not a paint
    declaration (Spec 00 §3.3), so it always lands.

    PRIMARY SOURCE is each block's OWN declarative `css:<property>` map
    (`supports.sgs.elements.<element>.attrMap` in its block.json — 20 entries on
    the default container, e.g. `css:margin -> native:spacing.margin`,
    `css:text-align -> native:typography.textAlign`). This is the R-31-1-correct
    channel: the block declares where each CSS property lands, and a custom attr
    is only ONE of the possible destinations — a WP-NATIVE support is equally a
    destination (Spec 31 §3.A step 7 validates against `block_supports`).

    Missing this channel produced two WRONG conclusions before the corpus run
    caught them: `margin` looked homeless on the default container (it is not —
    `css:margin` is declared and `spacing.margin` is supported), which led to an
    invented "the centring margin is consumed by the fold" rule that was never
    needed; and `text-align` looked homeless, which rejected
    `ingredients-section__inner` — a band Spec 31 §2.7 lists as folding — on the
    one property FR-31-5.1a already knows how to carry.
    """
    if prop.startswith("--"):
        return True

    # 1. The block's own declarative css:<property> map, across every element it
    #    declares. DB-driven, per-block, no hand-authored mapping (R-31-1).
    try:
        elements = (db_lookup.block_supports_for(parent_slug) or {}).get("sgs", {}).get("elements", {})
    except Exception:  # noqa: BLE001
        elements = {}
    for element in (elements or {}).values():
        attr_map = (element or {}).get("attrMap") or {}
        for candidate in (prop, _property_family(prop)):
            if f"css:{candidate}" in attr_map:
                return True

    # 2. Custom-attr destinations (the css_property columns + per-layer name-build).
    for candidate in (prop, _property_family(prop)):
        try:
            if db_lookup.attr_for_property(parent_slug, candidate) is not None:
                return True
        except Exception:  # noqa: BLE001 — a resolver miss is a miss, never a crash
            pass
        for layer in ("OUTER", "CONTENT", "GRID"):
            try:
                if db_lookup.attr_for_layer_property(parent_slug, layer, candidate) is not None:
                    return True
            except Exception:  # noqa: BLE001
                pass

    return False


# ---------------------------------------------------------------------------
# The qualifier
# ---------------------------------------------------------------------------

def qualify(parent: Any, child: Any, css_rules: dict, parent_slug: str | None) -> Verdict:
    """Is `child` a dissolvable L2 wrapper of `parent`?

    Requirements, in the order they are cheapest to reject on. Every one was
    forced by a measurement — see the module docstring for what each replaced.

      T   TRIGGER   the parent is a recognised container-kind block
      A   the parent does not itself ARRANGE — if it does, this child is a GRID
          ITEM, not a wrapper (Spec 31 §2.4 grid-item-test-first)
      B   the child has NO block identity of its own
      C   the child's TAG is not content-shaped (R-31-2: tag is shape)
      D   the child is never a LEAF — a wrapper always wraps something
      E   the child holds no text of its own
      F   every CSS property the child declares lands on the parent
    """
    if not isinstance(child, Tag) or not isinstance(parent, Tag):
        return Verdict(False, "not-a-tag", getattr(child, "name", type(child).__name__))

    # T — the trigger. The PARENT's identity, never the child's.
    if not _is_container_kind(parent_slug):
        return Verdict(False, "T-parent-is-not-a-container-kind-block", parent_slug)

    # A — grid-item test first (§2.4). A parent that arranges has ITEMS, not wrappers.
    if arrangement.carries_arrangement(parent, css_rules or {}):
        return Verdict(False, "A-parent-arranges-so-child-is-a-grid-item", "display:grid|flex")

    # B — no block identity. An L2 is by definition not a block.
    own_classes = [
        c for c in (child.get("class", []) or [])
        if isinstance(c, str) and c.startswith("sgs-")
    ]
    child_slug = db_lookup.resolve_slug_from_bem(own_classes) if own_classes else None
    if child_slug is not None:
        return Verdict(False, "B-child-has-block-identity", child_slug)

    # C — content-shaped by TAG. A <ul>/<p>/<h3> is content however many children it has.
    atomic = db_lookup.atomic_tag_map()
    if child.name in atomic:
        return Verdict(False, "C-child-tag-is-content-shaped", f"<{child.name}> -> {atomic[child.name]}")

    # D — never a leaf. A structural wrapper exists to wrap.
    if child.find(True) is None:
        return Verdict(False, "D-child-is-a-leaf", "no element children")

    # E — no content of its own.
    own_text = " ".join(
        s.strip() for s in child.children
        if isinstance(s, NavigableString) and s.strip()
    )
    if own_text:
        return Verdict(False, "E-child-holds-its-own-text", own_text[:80])

    # F — the CSS half of the rule, split by WHAT is homeless.
    #
    # A homeless STRUCTURAL property is a transfer gap, not evidence the node is a
    # component. Proven by the canonical case: `margin` has NO destination on the
    # default container (measured), yet `max-width` + `margin:auto` is exactly how
    # Spec 31 §2.3 DEFINES the L2 content band. The centring margin is CONSUMED by
    # the fold — once the band folds to `contentWidth` the container centres its
    # content by construction — so rejecting on it would reject every real L2.
    # These are reported on the verdict (never silently ignored) so the transfer
    # gap stays visible, but they do not disqualify.
    #
    # A homeless CONTENT-BEARING property is different: a node that styles TEXT is
    # styling content, which is what a component does. The set is DB-sourced
    # (`_TYPOGRAPHY_CSS_SCOPE`, the same frozenset `dispatch_table` uses as its
    # pre-layer typography sink) — never a hand-authored list (R-31-1).
    homeless = {
        prop: val
        for prop, val in sorted(_effective_decls(child, css_rules).items())
        if not _lands_on_parent(parent_slug, prop)
    }
    content_bearing = {
        prop: val for prop, val in homeless.items()
        if prop in db_lookup._TYPOGRAPHY_CSS_SCOPE
    }
    if content_bearing:
        return Verdict(
            False, "F-child-styles-content-the-parent-cannot-own",
            next(iter(content_bearing)), homeless,
        )

    return Verdict(dissolvable=True, homeless_css=homeless)


# ---------------------------------------------------------------------------
# Self-test — a gate that cannot fail reads green forever.
# ---------------------------------------------------------------------------

def _self_test() -> int:
    """Prove the qualifier rejects in BOTH directions.

    Every requirement gets a planted violation that MUST be rejected, plus a
    known-good case that MUST pass. A check that has never been shown to fail is
    a decoration (STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER); a check that
    has never been shown to PASS is equally useless, so both legs run.
    """
    from bs4 import BeautifulSoup

    container = db_lookup.container_default_slug()
    if container is None:
        print("SELF-TEST SKIPPED: DB unavailable (container_default_slug() is None)")
        return 0

    css = {
        ".sgs-x__inner": {"max-width": "960px", "margin": "0 auto"},
        ".sgs-x__grid": {"display": "grid", "gap": "24px"},
        ".sgs-x__typo": {"text-decoration": "underline"},
    }
    dom = (
        '<section class="sgs-x">'
        '  <div class="sgs-x__inner"><p>real content</p></div>'
        '  <div class="sgs-x__typo"><p>styled</p></div>'
        '  <div class="sgs-x__hasid sgs-quote"><p>x</p></div>'
        '  <div class="sgs-x__leaf"></div>'
        # NOTE: a NON-alias-hijacked token. `__list` resolves to sgs/info-box via
        # the `items` slot's alias list, so it would reject on B (block identity)
        # before ever reaching C — B would mask C and the C leg would prove
        # nothing. That hijack is a separate, deferred defect; the C leg must use
        # a token with no donor so it tests the TAG rule it claims to test.
        '  <ul class="sgs-x__wrapper"><li>a</li></ul>'
        '  <div class="sgs-x__loose">stray text<p>and a child</p></div>'
        '</section>'
    )
    soup = BeautifulSoup(dom, "html.parser")
    root = soup.find(class_="sgs-x")
    kid = lambda c: soup.find(class_=c)  # noqa: E731

    failures: list[str] = []

    def expect(label: str, verdict: Verdict, want_pass: bool, want_req: str = "") -> None:
        if verdict.dissolvable != want_pass:
            failures.append(
                f"{label}: expected {'PASS' if want_pass else 'REJECT'}, "
                f"got {'PASS' if verdict.dissolvable else 'REJECT(' + verdict.failed + ')'}"
            )
        elif want_req and verdict.failed != want_req:
            failures.append(f"{label}: rejected for {verdict.failed!r}, expected {want_req!r}")

    # POSITIVE leg — a genuine content band must PASS.
    expect("band passes", qualify(root, kid("sgs-x__inner"), css, container), True)

    # NEGATIVE legs — one planted violation per requirement.
    expect("T parent not a container", qualify(root, kid("sgs-x__inner"), css, "sgs/not-a-real-block"),
           False, "T-parent-is-not-a-container-kind-block")
    expect("A parent arranges",
           qualify(root, kid("sgs-x__inner"), {**css, ".sgs-x": {"display": "grid"}}, container),
           False, "A-parent-arranges-so-child-is-a-grid-item")
    # B was the ONLY requirement with no planted violation until 2026-08-01 — the
    # first in execution order, and the one most exposed to the alias-hijack defect.
    # The self-test printed "6 planted violations" while never exercising it.
    expect("B child has block identity", qualify(root, kid("sgs-x__hasid"), css, container),
           False, "B-child-has-block-identity")
    expect("C content-shaped tag", qualify(root, kid("sgs-x__wrapper"), css, container),
           False, "C-child-tag-is-content-shaped")
    expect("D leaf", qualify(root, kid("sgs-x__leaf"), css, container),
           False, "D-child-is-a-leaf")
    expect("E own text", qualify(root, kid("sgs-x__loose"), css, container),
           False, "E-child-holds-its-own-text")
    expect("F css does not land", qualify(root, kid("sgs-x__typo"), css, container),
           False, "F-child-styles-content-the-parent-cannot-own")

    if failures:
        print("SELF-TEST FAILED:")
        for f in failures:
            print("  -", f)
        return 1
    print("SELF-TEST PASSED: 1 positive + 7 planted violations (one per requirement "
          "T/A/B/C/D/E/F), each rejected for the requirement it names.")
    return 0


if __name__ == "__main__":
    import sys

    if "--self-test" in sys.argv:
        raise SystemExit(_self_test())
    print(__doc__)
