#!/usr/bin/env python3
"""bucket-c-classifier.py -- Spec 31 Phase 5a.2 (FR10).

Classifies a DOM element that the orchestrator could NOT route through
Layers 1-2 (slot / attribute matching) by voting it into the most
closely-satisfied Layer 2 ROLE from the `property_suffixes` taxonomy
in sgs-framework.db.

The classifier is the secondary surface behind the FR8 attribute-gap
table -- when an unmatched element votes strongly into a role (e.g.
`color`), the gap candidate gets the role tag attached so a future
canonical-slot proposal has a starting point.

Input shape (single element):
    {
      "selector": ".some-orphan",                   # for traceability
      "computed_styles": {                          # name -> resolved value
        "color": "#1e1e1e",
        "background-color": "#fff7ed",
        "padding": "16px 24px"
      },
      # Optional hints -- raise confidence when present
      "html_tag": "div",
      "text_content": "Made for the mum...",
      "class_signature": ["sgs-hero__copy"]
    }

Output:
    {
      "selector": ".some-orphan",
      "winning_role": "color",
      "confidence": 0.83,
      "vote_breakdown": {"color": 5, "layout": 1, ...},
      "matched_css_properties": ["color", "background-color"],
      "evidence_count": 6                 # total CSS-property votes cast
    }

Confidence formula:
    confidence = winning_votes / max(evidence_count, 1)

Threshold contract per Phase 5a.2 plan: confidence >= 0.7 on the three
canonical mismatch types (colour, spacing, text). The self-test at the
foot of `test_bucket_c_classifier.py` exercises that contract.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)

# CSS property short-hands that expand to a longhand family. When a DOM
# computed-style snapshot uses a shorthand, vote the property family.
# Keeps the classifier from missing layout-family votes when the source
# style sheet uses `padding` instead of `padding-top/right/bottom/left`.
_SHORTHAND_EXPANSIONS: dict[str, tuple[str, ...]] = {
    "margin":  ("margin-top", "margin-right", "margin-bottom", "margin-left"),
    "padding": ("padding-top", "padding-right", "padding-bottom", "padding-left"),
    "border":  ("border-width", "border-style", "border-color"),
    "background": ("background-color", "background-image"),
}

# Some property_suffixes rows carry a `css_property` like
# "background-color" or "padding/margin (preset)" -- normalise to the
# canonical property names the classifier matches against.
def _normalise_css_property(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ()
    raw = raw.strip().lower()
    # "padding/margin (preset)" -> padding + margin
    if "/" in raw and "(" in raw:
        head = raw.split("(", 1)[0].strip()
        return tuple(p.strip() for p in head.split("/") if p.strip())
    if raw.startswith("color (on"):
        return ("color",)
    if raw.startswith("filter:"):
        return ("filter",)
    return (raw,)


def load_role_index(conn: sqlite3.Connection) -> dict[str, str]:
    """Map css-property -> the DOMINANT role that targets it.

    A CSS property may be claimed by >1 role in the DB (e.g. `padding`
    is claimed by both `layout` via Padding suffix AND `spacing-token`
    via Spacing suffix's "padding/margin (preset)" css_property). To
    avoid unresolved voting ties, resolve to the role with the most
    suffixes in the DB -- the more-central claim on the property.

    Dominance metric: count of suffixes per role across the whole
    property_suffixes table. The dominant role wins multi-claim
    properties. Ties broken alphabetically (deterministic).
    """
    raw: dict[str, set[str]] = {}
    role_size: Counter[str] = Counter()
    for suffix, role, css_property in conn.execute(
        "SELECT suffix, role, css_property FROM property_suffixes"
    ):
        role_size[role] += 1
        for prop in _normalise_css_property(css_property):
            if not prop or prop == "none":
                continue
            raw.setdefault(prop, set()).add(role)

    dominant: dict[str, str] = {}
    for prop, roles in raw.items():
        # Largest role wins; alphabetical break on equal size.
        dominant[prop] = min(roles, key=lambda r: (-role_size[r], r))
    return dominant


# Reverse map: longhand -> shorthand parent. Allows the classifier to
# also vote for the shorthand when a stylesheet uses longhands (the DB
# `css_property` column carries shorthand names like `padding`, not the
# four longhand siblings).
_LONGHAND_TO_SHORTHAND: dict[str, str] = {}
for shorthand, longhands in _SHORTHAND_EXPANSIONS.items():
    for lh in longhands:
        _LONGHAND_TO_SHORTHAND[lh] = shorthand


def _expand_observed_props(observed: dict[str, object]) -> list[str]:
    """Return the bidirectionally-expanded list of CSS property names.

    Both directions: shorthand `padding` expands to its four longhands,
    AND any observed longhand also adds its shorthand parent (so the
    DB's shorthand css_property entries match).
    """
    out: list[str] = []
    for prop in observed.keys():
        prop_lc = prop.strip().lower()
        out.append(prop_lc)
        if prop_lc in _SHORTHAND_EXPANSIONS:
            out.extend(_SHORTHAND_EXPANSIONS[prop_lc])
        if prop_lc in _LONGHAND_TO_SHORTHAND:
            out.append(_LONGHAND_TO_SHORTHAND[prop_lc])
    return out


def classify(element: dict, role_index: dict[str, str]) -> dict:
    """Vote a single unmatched element into the best-fit role.

    Returns the structured output shape documented at the top of this
    file. Empty `computed_styles` -> winning_role=None, confidence=0.0.
    De-duplicates property votes (observed `padding` + expanded longhand
    `padding-top` should not double-count for the same role) so the
    confidence ratio reflects role specificity, not expansion arithmetic.
    """
    observed = element.get("computed_styles") or {}
    expanded_props = set(_expand_observed_props(observed))

    votes: Counter[str] = Counter()
    matched: set[str] = set()
    for prop in expanded_props:
        role = role_index.get(prop)
        if role is None:
            continue
        matched.add(prop)
        votes[role] += 1

    evidence_count = sum(votes.values())
    winning_role: str | None
    confidence: float
    if not votes:
        winning_role = None
        confidence = 0.0
    else:
        winning_role, winning_votes = votes.most_common(1)[0]
        confidence = winning_votes / max(evidence_count, 1)

    return {
        "selector": element.get("selector"),
        "winning_role": winning_role,
        "confidence": round(confidence, 4),
        "vote_breakdown": dict(votes.most_common()),
        "matched_css_properties": sorted(matched),
        "evidence_count": evidence_count,
    }


def classify_batch(elements: list[dict], db_path: Path = DB_PATH) -> list[dict]:
    """Run classify() across a batch of unmatched elements.

    Uses a 5-second sqlite connect timeout so a concurrent /sgs-update
    write does not hang the classifier indefinitely.
    """
    conn = sqlite3.connect(str(db_path), timeout=5.0)
    try:
        role_index = load_role_index(conn)
    finally:
        conn.close()
    return [classify(e, role_index) for e in elements]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument(
        "--input", type=Path, required=True,
        help="JSON file containing a list of unmatched element descriptors",
    )
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not DB_PATH.exists():
        sys.exit(f"ERROR: DB not found at {DB_PATH}")
    if not args.input.exists():
        sys.exit(f"ERROR: input not found at {args.input}")

    elements = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(elements, list):
        sys.exit("ERROR: --input must contain a JSON list of element dicts")

    results = classify_batch(elements)
    payload = json.dumps(results, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[classifier] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
