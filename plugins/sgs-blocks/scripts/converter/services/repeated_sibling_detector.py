#!/usr/bin/env python3
"""repeated_sibling_detector.py -- Q2 Tier 1 structural repeated-sibling detector.

Design doc: `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
"Question 2 -- detecting template-shaped pages", Tier 1 (Bean-approved 2026-09-11).
Research addendum (same doc): `html-similarity`/`niteru`-style blended structural+style
SCORE rather than a hand-picked sibling-count cutoff.

THE PROBLEM (plain English): the cloning pipeline hand-converts every repeating
section individually -- 40 product cards get converted 40 times, with no reuse
of the fact they're the same shape. This module answers ONE question -- "does
this boundary's list of direct children look like N-or-more near-identical
repeated siblings" -- as a continuous similarity SCORE against a named, tunable
threshold, never a hardcoded sibling-count integer buried in logic.

Builds ON TOP of `sibling_shape_prefilter.py` (imported, not re-derived) --
that module was built standalone specifically so this consumer could import it
unmodified (see its own docstring). `shape_signature()`/`class_signature()`
give the tag + non-utility-class identity; this module extends the BOOLEAN
`are_shape_alike()` into a CONTINUOUS blended score so the firing threshold is
a single named constant instead of a hand-picked rule.

⛔ DISCLOSED LIMITATION (do not silently "fix" this by hardening the numbers):
`REPEATER_SIMILARITY_THRESHOLD` and `REPEATER_MIN_GROUP_SIZE` below are STARTING
VALUES, not measured ones. No real repeating draft page has been run through
this detector and compared against Bean's own eye call yet. Tune them from that
measurement, not from more reasoning about what "feels right".

UK English in comments + output.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from converter.services import sibling_shape_prefilter as ssp

# ---------------------------------------------------------------------------
# Tunable constants -- named, documented, disclosed as UNMEASURED (2026-09-11)
# ---------------------------------------------------------------------------
#
# REPEATER_SIMILARITY_THRESHOLD: the minimum blended similarity score (see
# `similarity_score()` below) two siblings must reach to be counted as the
# SAME repeated shape. 0.82 was picked as a starting point that tolerates the
# "near-identical" cases sibling_shape_prefilter already documents (one card
# missing an optional badge modifier) while still rejecting a genuinely
# different sibling that merely happens to share a tag. NOT empirically
# measured against a real drafted page -- tune this once one is run through
# `--survey` and compared against Bean's own eye call on what should fire.
REPEATER_SIMILARITY_THRESHOLD = 0.82

# REPEATER_MIN_GROUP_SIZE: the minimum number of shape-alike siblings before a
# group is even considered a "repeated structure" worth routing to a native
# loop -- below this, hand-converting each one individually is cheaper than
# building loop machinery for it. 3 was picked as a starting point (2 similar
# elements is at least as likely to be "a pair", e.g. a two-column feature
# split, as a genuine repeater) -- ALSO unmeasured. See the design doc's own
# open question 2, left unresolved on purpose rather than guessed at.
REPEATER_MIN_GROUP_SIZE = 3


def _get_children(element: Any) -> list[Any]:
    """Return `element`'s direct children in the same duck-typed shape
    `sibling_shape_prefilter` already accepts (a BeautifulSoup Tag, or a plain
    dict carrying a "children" list)."""
    if hasattr(element, "find_all"):
        # BeautifulSoup Tag -- direct-child elements only (recursive=False),
        # tags only (NavigableString text nodes carry no shape to compare).
        return [c for c in element.find_all(True, recursive=False)]
    if isinstance(element, dict):
        return list(element.get("children") or [])
    return list(getattr(element, "children", None) or [])


def _jaccard(a: tuple[str, ...], b: tuple[str, ...]) -> float:
    """Jaccard similarity of two class-name tuples. 1.0 when both are empty
    (two classless elements are identical on this axis, not undefined)."""
    set_a, set_b = set(a), set(b)
    if not set_a and not set_b:
        return 1.0
    union = set_a | set_b
    if not union:
        return 1.0
    return len(set_a & set_b) / len(union)


def similarity_score(a: Any, b: Any) -> float:
    """Blended structural+style similarity of two sibling elements, in [0, 1].

    Mirrors the `html-similarity`/`niteru` idea the design doc's addendum
    names (a blended SCORE rather than a fixed sibling-count cutoff) without
    adding a new dependency -- built from primitives this pipeline already
    has: `sibling_shape_prefilter`'s shape signature plus a child-count
    proximity term.

    Components (weights sum to 1.0):
      - tag match            (0.40) -- hard veto: different tags score 0.0
                                        outright, matching `are_shape_alike`'s
                                        own tag-must-match rule.
      - structural class Jaccard (0.35) -- `base_classes` (BEM `--modifier`
                                        suffixes stripped): the "same shape
                                        ignoring cosmetic variants" axis.
      - style class Jaccard      (0.15) -- raw `classes` (modifiers intact):
                                        rewards siblings that are ALSO
                                        cosmetically identical, without
                                        requiring it.
      - child-count proximity    (0.10) -- 1 - normalised absolute difference
                                        in direct-child count; a rough proxy
                                        for "similar amount of inner content"
                                        (a card with a badge vs. one without
                                        still scores highly here).
    """
    sig_a = a if isinstance(a, ssp.ShapeSignature) else ssp.shape_signature(a)
    sig_b = b if isinstance(b, ssp.ShapeSignature) else ssp.shape_signature(b)

    if sig_a.tag != sig_b.tag:
        return 0.0

    structural = _jaccard(sig_a.base_classes, sig_b.base_classes)
    style = _jaccard(sig_a.classes, sig_b.classes)

    if isinstance(a, ssp.ShapeSignature) or isinstance(b, ssp.ShapeSignature):
        # A `ShapeSignature` carries no real child data (it's a tag+class
        # identity only) -- forcing that side's count to 0 would silently
        # dock this term for a REPRESENTATION-TYPE difference (Tag vs.
        # ShapeSignature), not a genuine structural one. Treat it as
        # unmeasurable and neutral rather than fabricating a 0-count.
        child_proximity = 1.0
    else:
        child_a = len(_get_children(a))
        child_b = len(_get_children(b))
        denom = max(child_a, child_b, 1)
        child_proximity = 1.0 - (abs(child_a - child_b) / denom)

    return (
        0.40 * 1.0          # tag match already verified above
        + 0.35 * structural
        + 0.15 * style
        + 0.10 * child_proximity
    )


@dataclass
class RepeaterGroup:
    """One detected group of near-identical repeated siblings within a boundary."""

    members: list[Any] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)  # each member's score vs the anchor

    @property
    def representative(self) -> Any:
        """The ONE sibling chosen for full conversion + sign-off.

        Deterministic: the FIRST member in document order (the anchor the
        group was built against) -- never re-selected per run, so a repeated
        `--survey` on unchanged input always proposes the same representative
        for review.
        """
        return self.members[0]

    @property
    def size(self) -> int:
        return len(self.members)

    @property
    def average_score(self) -> float:
        """Mean similarity of every OTHER member against the anchor (the
        anchor's own implicit self-score of 1.0 is excluded so this reflects
        how tightly the real variation clusters, not a constant)."""
        if not self.scores:
            return 1.0
        return sum(self.scores) / len(self.scores)


def detect_repeater_groups(
    siblings: list[Any],
    threshold: float = REPEATER_SIMILARITY_THRESHOLD,
    min_group_size: int = REPEATER_MIN_GROUP_SIZE,
) -> list[RepeaterGroup]:
    """Partition `siblings` into qualifying RepeaterGroups.

    Transitive grouping against each group's FIRST (anchor) member, matching
    `sibling_shape_prefilter.group_shape_alike`'s own transitive-vs-anchor
    approach -- a chain of near-identical variants collapses into one group
    provided each still scores >= `threshold` against the anchor. Groups
    below `min_group_size` are dropped entirely (never returned as
    singletons) -- a group of 2 is not "repeated structure" by this
    detector's own disclosed starting threshold.

    Returns groups in FIRST-SEEN order (stable, so `--survey` output is
    deterministic across runs on unchanged input).
    """
    groups: list[RepeaterGroup] = []

    for element in siblings:
        placed = False
        for group in groups:
            score = similarity_score(group.representative, element)
            if score >= threshold:
                group.members.append(element)
                group.scores.append(score)
                placed = True
                break
        if not placed:
            groups.append(RepeaterGroup(members=[element], scores=[]))

    return [g for g in groups if g.size >= min_group_size]


# ---------------------------------------------------------------------------
# Representative conversion -- delegates to the REAL, EXISTING converter
# (Stage 2 recognition + Stage 7 serialisation), never a reinvented mini
# converter. Import is lazy so `detect_repeater_groups`/`similarity_score`
# stay usable with zero DB/bs4 dependency for pure-grouping callers/tests.
# ---------------------------------------------------------------------------

def convert_representative(html: str, css_rules: dict | None = None) -> dict[str, Any]:
    """Run ONE representative sibling's outer HTML through the real converter's
    Stage 2 recognition + Stage 7 serialisation.

    Per the design doc's hard requirement ("convert ONE representative sibling
    fully through the existing converter, verify its fidelity, and STOP") --
    this is genuine delegation to the pipeline's own recognition + block-markup
    serialisation, not a parallel/reinvented mini-converter. Deep slot/content
    extraction (Stage 4/5, full CSS-fidelity conversion of the representative's
    inner content) is the EXISTING per-boundary converter's job and is invoked
    downstream of recognition here -- see the `--fix` docstring in
    `detect-repeated-siblings.py` for the exact division of responsibility.

    Returns:
      {
        "kind":  "named" | "atomic" | "scalar" | "unrecognised",
        "slug":  str | None,       # recognised block slug, None if unrecognised
        "markup": str | None,      # WP block-comment markup (opening/closing),
                                    # present only when kind != "unrecognised"
        "gap_candidate": bool,     # True when recognition failed -- never
                                    # silently bulk-applied (R-31-13)
      }
    """
    from bs4 import BeautifulSoup  # lazy: keeps grouping-only callers bs4-free

    from converter.recognition import recognise, recognise_section

    node = BeautifulSoup(html, "html.parser").find(True)
    if node is None:
        return {"kind": "unrecognised", "slug": None, "markup": None, "gap_candidate": True}

    rec = recognise_section(node)
    if rec.kind == "unrecognised":
        rec = recognise(node, css_rules)

    if rec.kind == "unrecognised" or not rec.slug:
        return {"kind": "unrecognised", "slug": None, "markup": None, "gap_candidate": True}

    markup = _serialise_representative(rec.slug)
    return {"kind": rec.kind, "slug": rec.slug, "markup": markup, "gap_candidate": False}


def _serialise_representative(slug: str) -> str:
    """Build a minimal, valid WP block-comment for `slug` via the real Stage 7
    serialisation escaping (`block_serialization.serialize_block_attributes`).

    Deliberately empty attrs `{}` -- this module's job is structural
    recognition (WHICH block, and that N siblings are the SAME block), not
    full attribute/content extraction, which is Stage 4/5's existing job on
    the representative once conversion proceeds past this sign-off gate.
    """
    from converter.block_serialization import serialize_block_attributes

    attrs_json = serialize_block_attributes({})
    return f"<!-- wp:{slug} {attrs_json} --><!-- /wp:{slug} -->"


def emit_repeated_block(
    representative_markup: str,
    member_count: int,
    *,
    cpt_archive: bool = False,
    post_type: str = "post",
    per_page: int = 12,
) -> str:
    """Emit the native repeating-block output for a signed-off repeater group.

    Two shapes, matching Spec 30 FR-30-3's shipped WooCommerce-archive
    precedent generalised to ANY repeating content (never keyed on WC/URL --
    the caller decides `cpt_archive` from what the STRUCTURAL detector already
    found plus, optionally, an output-routing hint, per the design doc's own
    "Not recommended" section on URL-pattern-as-TRIGGER):

      - `cpt_archive=True`  -> a `core/query` Query-Loop-equivalent wrapping a
        `core/post-template` that repeats the representative's markup as its
        template (the real WP mechanism WooCommerce's own Product Collection
        is built on) -- avoids N flat sibling conversions for a genuine
        archive/loop.
      - `cpt_archive=False` -> a repeated InnerBlocks template: the
        representative's OWN converted markup repeated `member_count` times
        as literal sibling blocks -- for a plain hand-authored card grid that
        is not backed by a query (its content did not come from a loop, so
        there is nothing to query against).
    """
    if member_count < 1:
        raise ValueError("emit_repeated_block requires member_count >= 1")

    if cpt_archive:
        query_attrs = json.dumps(
            {"queryId": 0, "query": {"postType": post_type, "perPage": per_page}},
            separators=(",", ":"),
        )
        return (
            f"<!-- wp:query {query_attrs} -->"
            f"<!-- wp:post-template -->"
            f"{representative_markup}"
            f"<!-- /wp:post-template -->"
            f"<!-- /wp:query -->"
        )

    return representative_markup * member_count
