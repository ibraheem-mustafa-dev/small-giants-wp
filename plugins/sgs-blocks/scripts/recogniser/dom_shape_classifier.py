#!/usr/bin/env python3
"""dom_shape_classifier.py -- Q1 Tier 2 DOM-shape heuristic classifier.

Design doc: `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
"Question 1 -- recognising genuinely non-BEM drafts", Tier 2 (Bean-directed 2026-09-14).

THE PROBLEM (plain English): Tier 0/1 (`orchestrator/lingua_franca.py`) recognise a
source's naming convention from the CLASS NAME string. Two real, common sources
carry ZERO usable signal there at all -- CSS Modules (`Button_primary__x7f2a`) and
styled-components/Emotion (`sc-bdVaJa`) compile to hashed/opaque class strings with
no stable token, ever. This module infers a LOW-CONFIDENCE block identity from
structural DOM shape instead: heading position, button-shaped elements, landmark
tags, and repeated siblings.

HARD CONSTRAINTS (design doc, non-negotiable):
  1. NEVER fires on an element carrying ANY already-canonical SGS-BEM class, even
     partially -- a Bean draft mixing one authored BEM class with one incidental
     utility class must never have its identity overridden by a shape guess. This
     is the OPPOSITE direction from `stage1_boundary_hook.py`'s
     `_is_sgs_bem_canonical()` (which requires ALL classes canonical for its own
     fast-path skip) -- see `_any_class_already_canonical()` below.
  2. NEVER asserts identity as ground truth -- every `Hint` below carries a
     confidence capped at `TIER2_MAX_CONFIDENCE`, always below a genuine Tier 0/1
     slot-map hit, and callers must route it through the existing gap-candidate/
     operator-review flow (`leftover-buckets.json`), never adopt it as the chosen
     block.
  3. No 4th walker conditional -- this module runs entirely OUTSIDE
     `converter/walk.py`'s three permitted exceptions (R-31-3), at boundary-build
     time and at leftover-routing time. Landmark-tag detection only ever fires on
     a NON-top-level `<header>`/`<footer>` (`<nav>` deliberately excluded, Spec 45
     §10.1 -- no signal here to choose between its 3 real nav-block candidates) --
     a top-level one is already chrome-skipped by the walker's own existing
     exception (`SKIP_TOP_LEVEL_TAGS`), so there is no overlap and no new branch
     anywhere in the walker.

Element inputs are duck-typed, matching `converter/services/sibling_shape_prefilter.py`'s
own convention: a plain dict with `"tag"`/`"classes"`/`"attrs"` keys, or any object
exposing the same via attribute access.

UK English in comments + output.
"""
from __future__ import annotations

import importlib.util as _ilu
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Tier 2's guessed confidence is always below a genuine Tier 0/1 slot-map hit
# (is_slot_map_hit=True implies a real name match) -- named so it is a single
# point of adjustment, never re-guessed per classifier function below.
TIER2_MAX_CONFIDENCE = 0.5

_HERE = Path(__file__).resolve().parent
_SCRIPTS_ROOT = _HERE.parent
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

# Q2 Tier 1's own docstring: "built standalone precisely so this consumer
# [Q1 Tier 2] could import it unmodified" -- confirmed reusable by design,
# imported directly rather than re-deriving similarity scoring.
from converter.services import repeated_sibling_detector as rsd  # noqa: E402

# lingua_franca.py lives in orchestrator/, which is deliberately NOT a
# package (flat CLI scripts, dynamically loaded elsewhere in this pipeline
# too -- see stage1_boundary_hook.py's own lazy-load block). Mirrored here
# rather than adding an __init__.py to a directory that has none on purpose.
_LF_PATH = _SCRIPTS_ROOT / "orchestrator" / "lingua_franca.py"
_lf_spec = _ilu.spec_from_file_location("lingua_franca", _LF_PATH)
_lf = _ilu.module_from_spec(_lf_spec)
sys.modules.setdefault("lingua_franca", _lf)
_lf_spec.loader.exec_module(_lf)


@dataclass
class Hint:
    """A LOW-confidence DOM-shape guess -- never ground truth. Constraint 2
    above: `confidence` is always <= `TIER2_MAX_CONFIDENCE`.

    `child_count`/`has_heading_or_paragraph_sibling` (Spec 45 §10.1) are the
    two structural signals `classify_button_shaped` reads off a live element
    -- carried on the Hint rather than folded into `block` so the bare guess
    stays "cta" (Tier 4's own downstream disambiguation between
    `sgs/cta-section`/`sgs/whatsapp-cta` reads these two fields; a classifier
    that doesn't populate them, e.g. every non-CTA classifier below, leaves
    both `None`).
    """

    block: str
    confidence: float
    evidence: str
    source: str = "dom_shape"
    child_count: int | None = None
    has_heading_or_paragraph_sibling: bool | None = None

    def to_dict(self) -> dict:
        return {
            "block": self.block,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "source": self.source,
            "child_count": self.child_count,
            "has_heading_or_paragraph_sibling": self.has_heading_or_paragraph_sibling,
        }


def _get_tag(element: Any) -> str:
    if isinstance(element, dict):
        return str(element.get("tag") or "").strip().lower()
    return str(getattr(element, "tag", "") or "").strip().lower()


def _get_attr(element: Any, name: str) -> str | None:
    if isinstance(element, dict):
        attrs = element.get("attrs") or {}
    else:
        attrs = getattr(element, "attrs", None) or {}
    return attrs.get(name)


def _any_class_already_canonical(class_signature: list[str] | None) -> bool:
    """Constraint 1's gate -- ANY canonical class blocks Tier 2 entirely.

    Opposite direction from `stage1_boundary_hook._is_sgs_bem_canonical()`
    (which requires ALL classes canonical for its own fast-path skip) -- a
    single authored BEM class alongside an incidental utility class must
    never have its identity overridden by a shape guess.
    """
    return any(_lf.round_trip_check(c) for c in (class_signature or []))


_HEADING_TAGS = {"h1", "h2"}
_BUTTON_TAGS = {"button"}

# `nav` is deliberately ABSENT (Spec 45 §10.1) -- three real nav-block
# candidates exist (sgs/nav-bar-menu / sgs/nav-drawer / sgs/nav-drawer-menu)
# with no signal in this function to choose between them, so a bare <nav>
# must fall through unresolved rather than guess. The two remaining keys map
# DIRECTLY to their real, DB-verified, unambiguous row-level slugs -- the
# constant itself IS the Tier 4 resolution now, no separate lookup needed.
_LANDMARK_TAG_BLOCK = {
    "header": "sgs/site-header-row",
    "footer": "sgs/site-footer-row",
}


def classify_heading(element: Any, is_first_child: bool) -> Hint | None:
    """A level-1/2 heading as the first child of an unrecognised section is a
    hero/section-header candidate."""
    tag = _get_tag(element)
    if tag not in _HEADING_TAGS or not is_first_child:
        return None
    return Hint(
        block="hero",
        confidence=0.4,
        evidence=f"<{tag}> heading as the section's first child",
    )


def _get_signal(element: Any, name: str, default: Any) -> Any:
    """`.get()`-safe read of a precomputed structural signal (Spec 45 §10.1).
    Never direct key/attribute access -- the module's own shipped self-test
    builds bare `{"tag": "button", "classes": []}` dicts by hand with neither
    signal present, and a direct read would `KeyError`/raise on those."""
    if isinstance(element, dict):
        return element.get(name, default)
    return getattr(element, name, default)


def classify_button_shaped(element: Any) -> Hint | None:
    """A `<button>`, or an element carrying `role=\"button\"`, is a CTA
    candidate.

    The bare guess stays "cta" -- disambiguating it into
    `sgs/cta-section`/`sgs/whatsapp-cta` is Tier 4's own job downstream
    (`classless_field_resolver.py`, Spec 45 §10.1/§10.2), not this
    classifier's. What changes here is that the two structural signals that
    disambiguation needs -- `_child_count`/`_has_heading_or_paragraph_sibling`,
    precomputed by the caller at the one point the real DOM element still
    exists (`_bs4_to_dom_dict`) -- are now read and carried on the returned
    `Hint`, rather than being unavailable at this call as they were before.
    """
    tag = _get_tag(element)
    role = (_get_attr(element, "role") or "").strip().lower()
    if tag not in _BUTTON_TAGS and role != "button":
        return None
    evidence = f"<{tag}> element"
    if role == "button":
        evidence += ' role="button"'
    return Hint(
        block="cta",
        confidence=0.45,
        evidence=evidence,
        child_count=_get_signal(element, "_child_count", 0),
        has_heading_or_paragraph_sibling=_get_signal(
            element, "_has_heading_or_paragraph_sibling", False
        ),
    )


def classify_landmark_tag(element: Any, is_top_level: bool) -> Hint | None:
    """A bare landmark tag (`<header>`/`<footer>` -- `<nav>` deliberately
    excluded, Spec 45 §10.1) with no BEM class, at NON-top-level, is a
    header/footer candidate.

    `is_top_level` is required, not inferred -- a top-level landmark is
    already chrome-skipped by `converter/services/section_passes.py`'s
    `SKIP_TOP_LEVEL_TAGS` (R-31-3's permitted walker exception #2); this
    classifier must never overlap that path or duplicate its decision.
    """
    if is_top_level:
        return None
    mapped = _LANDMARK_TAG_BLOCK.get(_get_tag(element))
    if mapped is None:
        return None
    return Hint(
        block=mapped,
        confidence=0.35,
        evidence=f"bare <{_get_tag(element)}> landmark tag, non-top-level",
    )


def classify_repeated_siblings(siblings: list[Any]) -> Hint | None:
    """N-or-more near-identical siblings -> card-grid candidate.

    Delegates directly to `converter/services/repeated_sibling_detector.py`
    (Q2 Tier 1, already shipped) rather than re-deriving similarity scoring.
    """
    groups = rsd.detect_repeater_groups(siblings)
    if not groups:
        return None
    largest = max(groups, key=lambda g: g.size)
    return Hint(
        block="card-grid",
        confidence=min(TIER2_MAX_CONFIDENCE, 0.3 + 0.05 * largest.size),
        evidence=(
            f"{largest.size} near-identical siblings "
            f"(avg similarity {largest.average_score:.2f})"
        ),
    )


def classify_element(
    element: Any,
    class_signature: list[str] | None,
    *,
    is_first_child: bool = False,
    is_top_level: bool = False,
    siblings: list[Any] | None = None,
) -> Hint | None:
    """Orchestrator: gate on constraint 1, then try each classifier in a
    fixed priority order, returning the first (highest-priority) hit.

    Repeated-siblings is tried FIRST -- a card-grid signal from N siblings
    is stronger evidence than a single element's own tag shape. Heading and
    button-shaped are mutually exclusive by tag in practice; landmark tag is
    tried last since it is scoped to a narrower non-top-level case only.
    """
    if _any_class_already_canonical(class_signature):
        return None
    if siblings:
        hint = classify_repeated_siblings(siblings)
        if hint is not None:
            return hint
    for fn, args in (
        (classify_heading, (element, is_first_child)),
        (classify_button_shaped, (element,)),
        (classify_landmark_tag, (element, is_top_level)),
    ):
        hint = fn(*args)
        if hint is not None:
            return hint
    return None
