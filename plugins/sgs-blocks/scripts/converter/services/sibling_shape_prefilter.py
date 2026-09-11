#!/usr/bin/env python3
"""sibling_shape_prefilter.py -- standalone sibling shape-alike pre-filter.

Phase plan: `.claude/plans/phase-r8-motion-recognition.md` Step 7. Per Bean's
explicit day-1 decision (`.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md`
Tier 3 "Build decision"), the "are these N sibling elements structurally
shape-alike" comparison is built here as its own standalone, dependency-free
module -- NOT embedded in Tier 3's own code (`motion_stagger.py`) -- so the
BEM-recognition doc's future Q2 sibling-repeater work
(`.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
Sec"Question 2", Tier 1) can import it later, unmodified.

Scope (deliberately narrow -- see the phase plan's Step 7 On-Fail clause):
  - Structural / class-signature shape-alike comparison ONLY.
  - NO timing-offset, `animation-delay`, or stagger/repetition-pattern logic
    of any kind. That logic is Tier-3-private (lives in `motion_stagger.py`,
    built in the phase plan's next step) and must never be added here.

"Class-signature" -- pinned by the Hidden Decisions pass, phase plan Step 7.
Do not re-derive; read the phase plan first if this looks wrong:

  An element's class-signature is its SORTED tuple of non-utility CSS
  classes. A class matching a known utility-framework pattern already
  handled elsewhere in this pipeline (Tailwind-shaped single-purpose
  classes, per `orchestrator/lingua_franca.py`'s `_TAILWIND_UTILITY` /
  `_SHADCN` conventions) is excluded. SGS-BEM element/modifier classes are
  KEPT because they carry real identity.

Shape-alike rule -- pinned by the same pass:

  Two siblings are shape-alike when their tag name AND class-signature are
  identical, OR differ only by a class this project's BEM convention
  (Spec 00 Sec3.1, `.sgs-<block>__<element>--<modifier>`) treats as a
  MODIFIER (`--modifier` suffix). Tolerant of "near-identical" (e.g. one
  card missing an optional badge element still counts as shape-alike with
  its siblings) -- not strict byte-equality.

This module deliberately has ZERO import dependency on any other converter/
orchestrator module, so a future consumer can import it standalone without
pulling in the whole pipeline. `element` inputs are plain dicts with a
`"tag"` key (str) and a `"classes"` key (list[str] or a single
space-separated str) -- the shape the pipeline's DOM-scrape JSON already
uses. Objects exposing the same two keys via `.get()` also work.

UK English in comments + output.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Iterable

# ---- Utility-class detection --------------------------------------------------
#
# Mirrors `orchestrator/lingua_franca.py`'s `_TAILWIND_UTILITY` / `_SHADCN`
# shape (property-scale, or bare `variant:property`) WITHOUT importing that
# module, per this module's zero-coupling requirement. Kept as a narrow,
# well-known pattern rather than a hardcoded class-name dict -- classifies by
# SHAPE, not by an enumerated list, matching R-31-1's "no hardcoded dicts"
# spirit for pattern-based recognition.
#
# Deliberately requires at least one dash-separated scale/value segment
# (`p-4`, `md:flex-row`, `text-sm`) -- a BARE short word with no dash
# (`card`, `hero`, `menu`) is NOT matched by this branch, because plenty of
# genuine BEM block names are also short (this is exactly the ambiguity a
# blanket "1-4 letters = utility" rule would get wrong). Bare Tailwind
# display/position keywords with no dash at all are handled by the separate,
# explicit `_UTILITY_BARE_KEYWORDS` set below.
_UTILITY_CLASS_RE = re.compile(
    r"^(?:[a-z]+:)*"                       # optional responsive/state variants, e.g. "md:", "hover:"
    r"-?"                                   # optional negative-value prefix, e.g. "-mt-4"
    r"[a-z]{1,4}"                           # short property stem: p, m, w, h, mt, px, bg, text, etc.
    r"-[a-z0-9.\[\]%/]+(?:-[a-z0-9.\[\]%/]+)*$"   # REQUIRED scale/value segment(s)
)

# A bare utility word with no dash at all (e.g. "flex", "hidden", "block")
# that is a known Tailwind display/position keyword rather than a genuine
# BEM block name. Kept as an explicit, closed set (not the general regex
# above) precisely because a bare short word is exactly where a shape-based
# rule would over-match real semantic names like "card" or "hero".
_UTILITY_BARE_KEYWORDS = {
    "flex", "grid", "block", "inline", "hidden", "absolute", "relative",
    "fixed", "sticky", "static", "container", "truncate", "invisible",
}

# BEM modifier suffix per Spec 00 Sec3.1: `--modifier` on an
# `.sgs-<block>__<element>--<modifier>` or `.sgs-<block>--<modifier>` class.
_BEM_MODIFIER_RE = re.compile(r"--[a-z0-9]+(?:-[a-z0-9]+)*$")


def is_utility_class(class_name: str) -> bool:
    """Return True if `class_name` matches a known utility-framework shape.

    Deliberately shape-based (not a hardcoded enumerated dict): a single
    short property stem optionally followed by dash-separated scale/value
    segments, with optional Tailwind-style `variant:` prefixes. SGS-BEM
    classes (`sgs-*`, containing `__` or `--`) never match -- they are
    excluded up front so a BEM modifier is never misclassified as utility.
    """
    if not class_name:
        return False
    name = class_name.strip()
    if not name:
        return False
    if name.startswith("sgs-") or "__" in name:
        return False
    if name in _UTILITY_BARE_KEYWORDS:
        return True
    return bool(_UTILITY_CLASS_RE.match(name))


def is_bem_modifier_class(class_name: str) -> bool:
    """Return True if `class_name` carries a BEM `--modifier` suffix."""
    return bool(class_name) and bool(_BEM_MODIFIER_RE.search(class_name.strip()))


def _strip_bem_modifier(class_name: str) -> str:
    """Return `class_name` with any trailing `--modifier` suffix removed."""
    return _BEM_MODIFIER_RE.sub("", class_name.strip())


# ---- Element access (duck-typed dict/object input) -----------------------------

def _get_tag(element: Any) -> str:
    if isinstance(element, dict):
        return str(element.get("tag") or "").strip().lower()
    return str(getattr(element, "tag", "") or "").strip().lower()


def _get_raw_classes(element: Any) -> Iterable[str]:
    if isinstance(element, dict):
        raw = element.get("classes") or element.get("class") or []
    else:
        raw = getattr(element, "classes", None) or getattr(element, "class", None) or []
    if isinstance(raw, str):
        return raw.split()
    return list(raw)


# ---- Class-signature + shape-signature -----------------------------------------

def class_signature(classes: Iterable[str]) -> tuple[str, ...]:
    """Return the pinned class-signature: sorted, non-utility class names.

    Utility-framework classes are dropped entirely. BEM element/modifier
    classes are kept verbatim (including their `--modifier` suffix) --
    modifier-only differences are handled at the shape-alike comparison
    step, not by stripping them here, so the signature stays a faithful
    record of what classes an element actually carries.
    """
    kept = [c.strip() for c in classes if c and c.strip() and not is_utility_class(c)]
    return tuple(sorted(kept))


@dataclass(frozen=True)
class ShapeSignature:
    """An element's shape identity for sibling comparison."""

    tag: str
    classes: tuple[str, ...] = field(default_factory=tuple)

    @property
    def base_classes(self) -> tuple[str, ...]:
        """Class-signature with any BEM `--modifier` suffixes stripped.

        Used only for the tolerant "differ by a modifier only" comparison --
        the raw `classes` tuple (with modifiers intact) remains the
        authoritative signature for exact-match comparison and for any
        future consumer that wants the untouched signature.
        """
        return tuple(sorted({_strip_bem_modifier(c) for c in self.classes}))


def shape_signature(element: Any) -> ShapeSignature:
    """Compute the shape signature (tag + class-signature) for one element."""
    return ShapeSignature(
        tag=_get_tag(element),
        classes=class_signature(_get_raw_classes(element)),
    )


# ---- Shape-alike comparison -----------------------------------------------------

def are_shape_alike(a: Any, b: Any) -> bool:
    """Return True if two sibling elements are structurally shape-alike.

    Per the pinned rule: same tag AND identical class-signature, OR the
    class-signatures differ only by BEM modifier classes (near-identical
    tolerance -- an optional element missing on one sibling, e.g. a badge,
    does not break the match as long as the remaining base classes agree).
    """
    sig_a = a if isinstance(a, ShapeSignature) else shape_signature(a)
    sig_b = b if isinstance(b, ShapeSignature) else shape_signature(b)

    if sig_a.tag != sig_b.tag:
        return False
    if sig_a.classes == sig_b.classes:
        return True
    return sig_a.base_classes == sig_b.base_classes


def group_shape_alike(elements: list[Any]) -> list[list[Any]]:
    """Partition `elements` into groups of mutually shape-alike siblings.

    Uses `are_shape_alike` transitively against each group's first (anchor)
    member -- consistent with the "near-identical, not byte-identical"
    tolerance, where a chain of near-identical variants (e.g. base card,
    base card + badge, base card + badge + ribbon) should still collapse
    into one group provided each still matches the anchor's base classes.
    Elements that match no existing group start a new group of their own
    (singleton groups are included, not dropped).
    """
    groups: list[list[Any]] = []
    signatures: list[ShapeSignature] = []

    for element in elements:
        sig = shape_signature(element)
        placed = False
        for idx, anchor_sig in enumerate(signatures):
            if are_shape_alike(anchor_sig, sig):
                groups[idx].append(element)
                placed = True
                break
        if not placed:
            groups.append([element])
            signatures.append(sig)

    return groups


def filter_shape_alike_group(elements: list[Any], min_group_size: int = 2) -> list[Any]:
    """Return the largest shape-alike group in `elements` meeting the size floor.

    Returns an empty list when no group reaches `min_group_size` -- callers
    (e.g. Tier 3's stagger detector, or Q2's future repeater detector) decide
    for themselves what to do with "no qualifying group" rather than this
    module guessing on their behalf.
    """
    groups = group_shape_alike(elements)
    qualifying = [g for g in groups if len(g) >= min_group_size]
    if not qualifying:
        return []
    return max(qualifying, key=len)


# ---- Self-test / fixture demonstration ------------------------------------------

def _demo() -> None:
    """Run the three phase-plan Step 7 fixtures and print their results."""

    def card(extra_classes: str = "") -> dict:
        classes = ["card"]
        if extra_classes:
            classes.extend(extra_classes.split())
        return {"tag": "div", "classes": classes}

    print("Fixture 1 -- 5 identical <div class=\"card\"> siblings:")
    fixture_1 = [card() for _ in range(5)]
    result_1 = filter_shape_alike_group(fixture_1)
    print(f"  shape-alike group size: {len(result_1)} (expect 5)")
    print(f"  shape-alike: {len(result_1) == 5}")

    print()
    print("Fixture 2 -- 5 siblings, one missing an optional badge element:")
    # The badge is expressed as a BEM modifier on the card itself
    # (`card--has-badge`), matching the pinned "differ only by a modifier"
    # tolerance -- the badge's *presence* is what varies, not the base card
    # shape.
    fixture_2 = [card("card--has-badge") for _ in range(4)] + [card()]
    result_2 = filter_shape_alike_group(fixture_2)
    print(f"  shape-alike group size: {len(result_2)} (expect 5)")
    print(f"  shape-alike: {len(result_2) == 5}")

    print()
    print("Fixture 3 -- 5 genuinely different sibling elements (different tags):")
    fixture_3 = [
        {"tag": "div", "classes": ["card"]},
        {"tag": "section", "classes": ["hero"]},
        {"tag": "aside", "classes": ["sidebar"]},
        {"tag": "figure", "classes": ["media"]},
        {"tag": "blockquote", "classes": ["testimonial"]},
    ]
    result_3 = filter_shape_alike_group(fixture_3, min_group_size=2)
    print(f"  shape-alike group size: {len(result_3)} (expect 0 -- no qualifying group)")
    print(f"  shape-alike: {len(result_3) == 0}")


if __name__ == "__main__":
    _demo()
