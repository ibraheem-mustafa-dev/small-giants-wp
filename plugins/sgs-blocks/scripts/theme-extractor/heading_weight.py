"""Heading font weight from measurement (Spec 33, declared-design path only).

The framework baseline sets ``styles.elements.heading.typography.fontWeight`` (and on some levels its own
weight). A draft that renders its headings lighter would otherwise inherit that baseline weight on the live
site. ``measure.js`` already records each heading level's computed weight in ``facts["headings"][tag]``;
this module turns those measurements into snapshot values.

Rules
  * A level is measured when it has a fact entry that is not ``inChrome`` and carries a usable weight.
  * ``heading`` gets the most common measured weight (ties: the lower number).
  * A measured level also gets its own weight when it differs from that value, or when the framework
    baseline carries a weight for that level (so a baseline value is never left standing where the draft
    measured otherwise).
  * A level with no measurement is a blind spot, not a measurement of absence: it keeps the baseline.
  * Only the numeric CSS weights 100-900 (steps of 100) are ever written.
"""
from __future__ import annotations

from collections import Counter

LEVELS = ("h1", "h2", "h3", "h4", "h5", "h6")
_KEYWORD_WEIGHTS = {"normal": 400, "bold": 700}  # the two keywords a computed style may still report


def normalise_weight(raw) -> str | None:
    """A CSS font-weight as one of "100".."900", or None when it is not one of those."""
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        value = int(raw) if float(raw).is_integer() else None
    elif isinstance(raw, str):
        text = raw.strip().lower()
        value = _KEYWORD_WEIGHTS.get(text)
        if value is None and text.isdigit():
            value = int(text)
    else:
        value = None
    if value is None or not 100 <= value <= 900 or value % 100:
        return None
    return str(value)


def measured_weights(facts: dict) -> dict[str, str]:
    """Level tag -> normalised computed weight, for every measured, non-chrome heading level."""
    out: dict[str, str] = {}
    for tag in LEVELS:
        entry = (facts.get("headings") or {}).get(tag)
        if not entry or entry.get("inChrome"):
            continue
        weight = normalise_weight(entry.get("fontWeight"))
        if weight is not None:
            out[tag] = weight
    return out


def dominant_weight(weights: dict[str, str]) -> str:
    """The most common weight; ties go to the lower number."""
    counts = Counter(weights.values())
    return min(counts, key=lambda w: (-counts[w], int(w)))


def _baseline_weight(baseline: dict, tag: str) -> str | None:
    typ = (((baseline.get("styles") or {}).get("elements") or {}).get(tag) or {}).get("typography") or {}
    return typ.get("fontWeight")


def apply_heading_weights(elements: dict, facts: dict, baseline: dict, trace: list) -> None:
    """Write the measured heading weights onto ``styles.elements`` (mutates ``elements`` and ``trace``)."""
    weights = measured_weights(facts)
    if not weights:
        return
    base = dominant_weight(weights)
    elements.setdefault("heading", {}).setdefault("typography", {})["fontWeight"] = base
    own = [tag for tag, weight in weights.items()
           if weight != base or _baseline_weight(baseline, tag) is not None]
    for tag in own:
        elements.setdefault(tag, {}).setdefault("typography", {})["fontWeight"] = weights[tag]
    trace.append({"kind": "declared", "what": "styles.elements.heading.typography.fontWeight",
                  "reason": "most common computed weight of the measured, non-chrome heading levels; "
                            "levels that differ, or that the framework baseline weights itself, carry "
                            "their own measured weight; unmeasured levels keep the baseline",
                  "value": base,
                  "measured": ",".join(f"{tag}={weights[tag]}" for tag in weights),
                  "own_weight_levels": ",".join(own) or "(none)"})
