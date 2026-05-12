#!/usr/bin/env python3
"""modifier_extractors.py -- Spec 15 Phase 5d.5 + 5d.6 + 5d.8.

Three independent classifier functions, all triggered after slot
extraction (Stage 4) and before WP-block emission (Stage 7):

  5d.5  button_role(button_attrs)         -> "primary" | "secondary" | "ghost"
        Classifies a button visual treatment to map onto sgs/button
        preset binding (Spec 11 button architecture).

  5d.6  dynamic_link(href)                -> {verb, args, raw, parsed}
        Parses Spec 15 FR25 dynamic-link modifiers like
        `:latest-post(category=blog,limit=3)` into a structured
        query_descriptor.

  5d.8  match_block_variation(block_json, extracted_attrs)
                                          -> {variation_slug, overrides_to_emit, ...}
        When block.json declares `variations`, pick the closest match
        to minimise per-block overrides.

All three are PURE FUNCTIONS -- no DB or filesystem side-effects.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")


# ---------- 5d.5 button-role classifier ---------------------------------------

# Heuristics:
#   primary    = solid filled background colour, contrasting text colour
#   secondary  = transparent/light background, primary border colour, dark text
#   ghost      = transparent background, no border, primary text colour, underlined or arrow
#
# Inputs are "visual attributes" extracted by Stage 4:
#   {
#     "backgroundColor": "<colour or token>",
#     "textColor":       "<colour or token>",
#     "borderColor":     "<colour or token>",
#     "borderWidth":     "<px or 0>",
#     "textDecoration":  "underline" | "none" | None,
#   }


def button_role(visual_attrs: dict[str, Any]) -> dict[str, Any]:
    """Classify a button's visual treatment.

    Returns:
        {
          "modifier":   "primary" | "secondary" | "ghost",
          "confidence": 0.0 - 1.0,
          "signals":    [...]     # list of features that drove the decision
        }
    """
    bg = (visual_attrs.get("backgroundColor") or "").strip().lower()
    border_width = visual_attrs.get("borderWidth") or "0"
    border_colour = (visual_attrs.get("borderColor") or "").strip().lower()
    text_decoration = (visual_attrs.get("textDecoration") or "").strip().lower()

    transparent = bg in ("", "transparent", "none", "rgba(0,0,0,0)")
    has_border = bool(border_colour) and border_width not in ("", "0", "0px", "none")

    signals: list[str] = []
    if not transparent:
        signals.append("solid-background")
    if has_border:
        signals.append(f"border-{border_width}")
    if text_decoration in ("underline", "underline-offset"):
        signals.append("underlined")

    # Ghost: transparent + no border + (underline OR primary text)
    if transparent and not has_border:
        return {"modifier": "ghost", "confidence": 0.85, "signals": signals or ["transparent-no-border"]}
    # Secondary: transparent + has border
    if transparent and has_border:
        return {"modifier": "secondary", "confidence": 0.9, "signals": signals}
    # Primary: solid background (most decisive signal)
    return {"modifier": "primary", "confidence": 0.95, "signals": signals or ["solid-background"]}


# ---------- 5d.6 dynamic-link modifier parser (FR25) --------------------------

# Pattern: `:verb-name(arg1=value1,arg2=value2,...)`
# Verbs ship with /sgs-clone and grow over time. Spec 15 FR25 examples:
#   :latest-post(category=blog,limit=3)
#   :archive-link(post-type=event)
#   :site-url
_DYNAMIC_LINK_RE = re.compile(
    r"^:(?P<verb>[a-z][a-z0-9_-]*)(?:\((?P<args>[^)]*)\))?$"
)


def dynamic_link(href: str) -> dict[str, Any]:
    """Parse a Spec 15 FR25 dynamic-link modifier.

    Returns:
        {
          "raw":     <original input>,
          "verb":    <verb name>            # None if no match
          "args":    {key: value, ...}      # empty dict when no args
          "parsed":  bool                    # True if the pattern matched
        }
    """
    if not isinstance(href, str):
        return {"raw": href, "verb": None, "args": {}, "parsed": False}
    m = _DYNAMIC_LINK_RE.match(href.strip())
    if not m:
        return {"raw": href, "verb": None, "args": {}, "parsed": False}
    verb = m.group("verb")
    raw_args = m.group("args") or ""
    args: dict[str, str] = {}
    if raw_args:
        for pair in raw_args.split(","):
            pair = pair.strip()
            if "=" not in pair:
                continue
            k, _, v = pair.partition("=")
            args[k.strip()] = v.strip()
    return {"raw": href, "verb": verb, "args": args, "parsed": True}


# ---------- 5d.8 block-variation matcher --------------------------------------


def _flatten_variation_attrs(variation: dict) -> dict:
    """Return the variation's `attributes` dict (empty when missing)."""
    return variation.get("attributes") or {}


def match_block_variation(
    block_json: dict,
    extracted_attrs: dict,
) -> dict:
    """Pick the registered block.json `variations` entry whose `attributes`
    have the most overlap with `extracted_attrs`. Returns:

        {
          "variation_slug":     <slug>     # None when no variations declared
          "match_score":        <int>       # number of attrs that matched
          "overrides_to_emit":  {attr: value, ...}   # extracted attrs that DIFFER
                                                     # from the picked variation
          "candidates_considered": <int>
        }
    """
    variations = block_json.get("variations") or []
    if not variations:
        return {
            "variation_slug":        None,
            "match_score":           0,
            "overrides_to_emit":     dict(extracted_attrs),
            "candidates_considered": 0,
        }

    best_slug: str | None = None
    best_score: int = -1
    best_variation_attrs: dict = {}
    for variation in variations:
        slug = variation.get("name") or variation.get("slug")
        attrs = _flatten_variation_attrs(variation)
        score = sum(
            1 for k, v in attrs.items()
            if k in extracted_attrs and extracted_attrs[k] == v
        )
        if score > best_score:
            best_score = score
            best_slug = slug
            best_variation_attrs = attrs

    # Overrides: extracted attrs that differ from (or extend) the picked variation
    overrides: dict = {}
    for k, v in extracted_attrs.items():
        if best_variation_attrs.get(k) != v:
            overrides[k] = v
    return {
        "variation_slug":        best_slug,
        "match_score":           best_score,
        "overrides_to_emit":     overrides,
        "candidates_considered": len(variations),
    }


# ---------- CLI surface -------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_btn = sub.add_parser("button-role")
    p_btn.add_argument("--attrs", required=True,
                       help="JSON dict of button visual attrs")
    p_link = sub.add_parser("dynamic-link")
    p_link.add_argument("--href", required=True)
    p_var = sub.add_parser("variation")
    p_var.add_argument("--block-json", required=True)
    p_var.add_argument("--attrs", required=True)
    args = parser.parse_args(argv)

    if args.cmd == "button-role":
        print(json.dumps(button_role(json.loads(args.attrs)), indent=2))
    elif args.cmd == "dynamic-link":
        print(json.dumps(dynamic_link(args.href), indent=2))
    elif args.cmd == "variation":
        bj = json.loads(args.block_json)
        attrs = json.loads(args.attrs)
        print(json.dumps(match_block_variation(bj, attrs), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
