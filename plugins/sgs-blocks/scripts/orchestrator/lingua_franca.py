#!/usr/bin/env python3
"""lingua_franca.py -- Spec 31 Phase 5c (FR9) convention-to-SGS-BEM converter.

When `/sgs-clone` ingests external sources (AI-builder output, scraped
competitor sites), this module converts the source's class-naming
convention to SGS-BEM at scrape time, per Spec 31 Â§8.1:

  - SGS-BEM is written as the PRIMARY class identity.
  - The source's original class names are preserved alongside as an
    `equivalent_implementations` map (Rosetta-stone discipline).

The 16 known conventions live in uimax.naming_conventions. This
module embeds STRUCTURED conversion rules (regex + slot-map) for the
highest-priority non-canonical conventions identified in the
Phase 5c plan, plus two scraped-site conventions added 2026-09-14
(BEM-recognition brainstorm doc Q1 Tier 1):

  - BEM (bare, no namespace)
  - Tailwind utility
  - Bootstrap 5 component
  - shadcn / Radix (Tailwind-shaped with data-slot attrs)
  - kebab-semantic (lowercase-hyphen semantic block names)
  - Webflow (`w-`-prefixed classes)
  - Elementor / Divi (`elementor-widget-*` / `et_pb_*` prefixes)

For un-recognised classes, the converter falls through to the
layout-signature path with `is_gap_candidate=true` flagged on the
output -- this triggers the bucket-c classifier (5a.2) downstream.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")


# ---- Conversion rule data (Phase 5c.2) ---------------------------------------
#
# Each rule maps a SOURCE class signature to an SGS-BEM target shape
# `sgs-<block>__<element>--<modifier>`. The rule definitions are static
# data (no DB round-trip needed at runtime) so the converter has zero
# external dependencies in the hot path.
#
# Rule shape:
#   {
#     "convention": "<uimax convention_name>",
#     "pattern":    <compiled regex with named groups: block / element / modifier>,
#     "slot_map":   { source_token: sgs_block_slug, ... }     # known source tokens
#     "default_block": <fallback when slot_map miss>,
#     "is_canonical_for_drafts": False,                       # SGS-BEM = True
#   }

# Common SGS block names that legitimately overlap with source-convention names.
_SGS_BLOCKS = {
    "hero", "cta", "info-box", "card-grid", "container", "button",
    "header", "footer", "testimonial", "accordion", "trust-bar",
    "team-member", "gallery", "tabs", "form", "post-grid",
}


def _re(p: str) -> re.Pattern:
    return re.compile(p)


_BEM_BARE = {
    "convention": "BEM",
    # block__element--modifier (no `sgs-` prefix).
    # Block / element / modifier each use kebab-style without consecutive
    # dashes so the separators `__` and `--` are unambiguous.
    "pattern": _re(
        r"^(?!sgs-)"
        r"(?P<block>[a-z][a-z0-9]*(?:-[a-z0-9]+)*)"
        r"(?:__(?P<element>[a-z][a-z0-9]*(?:-[a-z0-9]+)*))?"
        r"(?:--(?P<modifier>[a-z][a-z0-9]*(?:-[a-z0-9]+)*))?$"
    ),
    "slot_map": {                                  # bare-BEM block -> SGS block slug
        "card":          "card-grid",
        "media":         "container",
        "btn":           "button",
        "headline":      "hero",
        "copy":          "container",
        "section":       "container",
    },
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

# Tier 1 (2026-09-14, BEM-recognition brainstorm doc Q1): Tailwind component
# libraries and shadcn primitives DO carry recognisable component-name tokens
# even inside utility soup -- they were just never captured. Shared between
# both rules below (identical vocabulary, same reasoning) rather than two
# copies that could drift out of sync.
_UTILITY_COMPONENT_SLOT_MAP = {
    "card":         "card-grid",
    "dialog":       "modal",
    "modal":        "modal",
    "badge":        "info-box",
    "alert":        "info-box",
    "nav":          "header",
    "footer":       "footer",
    "hero":         "hero",
    "accordion":    "accordion",
    "tabs":         "tabs",
}

_TAILWIND_UTILITY = {
    "convention": "Tailwind utility",
    # property-scale or single-word utility
    "pattern": _re(r"^(?:(?P<variant>[a-z]+):)?(?P<property>[a-z][a-z0-9]*)(?:-(?P<scale>[a-z0-9.]+))?$"),
    # Tailwind has no block semantics for most utilities -- they land in a
    # generic container unless the property token itself names a component
    # (Tier 1: `card`, `badge`, `hero`, etc. -- see _UTILITY_COMPONENT_SLOT_MAP).
    "slot_map": _UTILITY_COMPONENT_SLOT_MAP,
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

_WEBFLOW = {
    "convention": "Webflow",
    # Every Webflow-generated class carries a `w-`-prefixed utility class
    # (Tier 1). The accompanying `w-node-...` element ID is not a class and
    # is irrelevant to this class-only rule.
    "pattern": _re(r"^w-(?P<block>[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$"),
    "slot_map": {
        "nav":          "header",
        "slider":       "hero",
        # Webflow's CMS collection-list pattern -- the most common
        # repeating-card shape a scraped Webflow site will carry.
        "dyn-list":     "card-grid",
        "dyn-item":     "card-grid",
    },
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

_ELEMENTOR_DIVI = {
    "convention": "Elementor / Divi",
    # WordPress page-builder scrape targets. Elementor prefixes
    # `elementor-widget-*`, Divi prefixes `et_pb_*` -- both predictable
    # (Tier 1). One shared "block" group covers both prefixes.
    "pattern": _re(r"^(?:elementor-widget-|et_pb_)(?P<block>[a-z][a-z0-9_-]*)$"),
    "slot_map": {
        "button":            "button",
        "image-box":         "info-box",
        "blurb":             "info-box",
        "fullwidth_header":  "hero",
        "menu":              "header",
        "footer":            "footer",
    },
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

_BOOTSTRAP = {
    "convention": "Bootstrap 5",
    # component-variant (e.g. btn-primary, card-body)
    "pattern": _re(r"^(?P<block>[a-z][a-z0-9]*)(?:-(?P<modifier>[a-z][a-z0-9-]*))?$"),
    "slot_map": {
        "btn":           "button",
        "card":          "card-grid",
        "container":     "container",
        "navbar":        "header",
        "footer":        "footer",
        "alert":         "info-box",
        "hero":          "hero",
        "row":           "container",
        "col":           "container",
        "modal":         "modal",
        "tabs":          "tabs",
    },
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

_SHADCN = {
    "convention": "shadcn / Radix",
    # shadcn ships Tailwind utilities + data-* primitives. Tier 1: the same
    # component vocabulary as Tailwind (shadcn primitives use the same
    # recognisable names) -- also reused by _try_data_slot() below for the
    # actual data-slot-attribute signal, since that IS this convention's
    # real identity per its own documented routing.
    "pattern": _re(r"^(?P<property>[a-z][a-z0-9-]+)$"),
    "slot_map": _UTILITY_COMPONENT_SLOT_MAP,
    "default_block": "container",
    "is_canonical_for_drafts": False,
    "data_slot_attrs": True,        # routing relies on data-* attrs, not class names
}

_KEBAB_SEMANTIC = {
    "convention": "kebab-semantic",
    # lowercase-hyphen semantic block names (e.g. team-grid, hero-copy)
    "pattern": _re(r"^(?P<block>[a-z][a-z0-9]+(?:-[a-z][a-z0-9]+)*)$"),
    "slot_map": {
        "team-grid":     "team-member",
        "card-grid":     "card-grid",
        "hero-copy":     "hero",
        # 2026-05-25 D72: "trust-bar": "trust-bar" mapping removed — block retired.
        # Sections with "trust-bar" class now fall to normal route (sgs/container).
        "site-header":   "header",
        "site-footer":   "footer",
        "info-box":      "info-box",
    },
    "default_block": "container",
    "is_canonical_for_drafts": False,
}

_SGS_BEM_CANONICAL = {
    "convention": "SGS WordPress",
    "pattern": _re(r"^sgs-(?P<block>[a-z][a-z0-9-]*?)(?:__(?P<element>[a-z][a-z0-9-]*))?(?:--(?P<modifier>[a-z][a-z0-9-]*))?$"),
    "slot_map": {},        # identity -- block stem already matches an SGS slug
    "default_block": None, # not needed
    "is_canonical_for_drafts": True,
}

# Ordered: most specific first so SGS-BEM passes through unmodified before
# bare-BEM tries to consume the same string.
RULES: list[dict] = [
    _SGS_BEM_CANONICAL,
    _BEM_BARE,
    # Webflow/Elementor/Divi have narrow, unambiguous prefixes (`w-`,
    # `elementor-widget-`/`et_pb_`) -- tried before the broader
    # Bootstrap/kebab-semantic/Tailwind/shadcn rules so a genuine slot_map
    # hit here is never shadowed by an earlier rule's syntactic (but
    # non-hit) match on the same lowercase-hyphenated token. Matters mainly
    # for the no-hint default path; when `heuristic_classify` (or the
    # production classifier) names the convention, convert_class already
    # reorders RULES to try the hinted rule first regardless of this order.
    _WEBFLOW,
    _ELEMENTOR_DIVI,
    _BOOTSTRAP,
    _KEBAB_SEMANTIC,
    _TAILWIND_UTILITY,
    _SHADCN,
]


@dataclass
class ConversionResult:
    sgs_bem_class: str                  # canonical SGS-BEM class string written to draft
    block: str                           # SGS block slug (sgs/<block>)
    element: str | None = None
    modifier: str | None = None
    source_class: str = ""
    source_convention: str | None = None
    is_canonical_for_drafts: bool = False
    is_gap_candidate: bool = False       # set when no rule matches
    # Tier 0 C1 fix (2026-09-11): True ONLY when this result came from a
    # GENUINE recognition -- either the class was already SGS-BEM canonical
    # (identity match) or the source block token was an explicit hit in the
    # matching rule's `slot_map`. False when the rule's regex matched
    # syntactically but the block token fell through to `default_block`
    # (e.g. kebab-semantic's near-universal lowercase-hyphen pattern
    # matching almost any class, then landing on "container" because the
    # 6-entry slot_map didn't recognise it). This is the discriminator that
    # distinguishes a real semantic hit from the "everything becomes an
    # undifferentiated container" hazard the Tier 0 convention-scoping
    # guard was built to exclude -- see sgs-clone-orchestrator.py's
    # stage_4_lingua_franca_gate / D1034.
    is_slot_map_hit: bool = False
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "sgs_bem_class":           self.sgs_bem_class,
            "block":                   self.block,
            "element":                 self.element,
            "modifier":                self.modifier,
            "source_class":            self.source_class,
            "source_convention":       self.source_convention,
            "is_canonical_for_drafts": self.is_canonical_for_drafts,
            "is_gap_candidate":        self.is_gap_candidate,
            "is_slot_map_hit":         self.is_slot_map_hit,
            "notes":                   self.notes,
        }


def _hashed_class(token: str) -> bool:
    """Hashed / minified class fingerprint -- e.g. `.css-x4j8`, `.uagb-block-a1b2c3d4`.
    Returns True if the class looks generated rather than authored."""
    if re.match(r"^css-[a-z0-9]{4,}$", token):
        return True
    if re.match(r"^uagb-block-[a-z0-9]{6,}$", token):
        return True
    if re.match(r"^[a-z]+-[a-z0-9]{8,}$", token) and any(c.isdigit() for c in token):
        # generic "long-hash" tail
        return True
    return False


def _build_sgs_bem(block: str, element: str | None, modifier: str | None) -> str:
    parts = [f"sgs-{block}"]
    if element:
        parts.append(f"__{element}")
    if modifier:
        parts.append(f"--{modifier}")
    return "".join(parts)


def _try_rule(token: str, rule: dict) -> ConversionResult | None:
    m = rule["pattern"].match(token)
    if not m:
        return None
    groups = m.groupdict()
    if rule["is_canonical_for_drafts"]:
        # SGS-BEM identity -- preserved as-is.
        block = groups.get("block") or ""
        return ConversionResult(
            sgs_bem_class=token, block=block,
            element=groups.get("element"), modifier=groups.get("modifier"),
            source_class=token, source_convention=rule["convention"],
            is_canonical_for_drafts=True,
            is_slot_map_hit=True,          # identity match is a genuine hit
            notes="canonical SGS-BEM, no conversion",
        )
    src_block_token = groups.get("block") or groups.get("property") or ""
    mapped_block = rule["slot_map"].get(src_block_token) or rule["default_block"]
    if mapped_block is None:
        return None
    element = groups.get("element")
    modifier = groups.get("modifier") or groups.get("variant") or groups.get("scale")
    _is_slot_map_hit = src_block_token in rule["slot_map"]
    return ConversionResult(
        sgs_bem_class=_build_sgs_bem(mapped_block, element, modifier),
        block=mapped_block, element=element, modifier=modifier,
        source_class=token, source_convention=rule["convention"],
        is_canonical_for_drafts=False,
        is_slot_map_hit=_is_slot_map_hit,
        notes=f"mapped via {rule['convention']} slot_map" if _is_slot_map_hit
              else f"mapped to default_block via {rule['convention']}",
    )


def convert_class(
    token: str,
    source_convention_hint: str | None = None,
) -> ConversionResult:
    """Convert ONE class name into a ConversionResult.

    `source_convention_hint` (when provided) re-orders the rule list so
    that convention is tried first. When None, rules are tried in
    declaration order (SGS-BEM first to fast-path canonical drafts).
    """
    if _hashed_class(token):
        return ConversionResult(
            sgs_bem_class=token, block="container",
            source_class=token, source_convention=source_convention_hint,
            is_gap_candidate=True,
            notes="hashed/minified class -- routed to layout-signature path",
        )
    rules = list(RULES)
    if source_convention_hint:
        rules.sort(key=lambda r: 0 if r["convention"] == source_convention_hint else 1)
    for rule in rules:
        result = _try_rule(token, rule)
        if result is not None:
            return result
    # No match -- gap candidate.
    return ConversionResult(
        sgs_bem_class="sgs-container", block="container",
        source_class=token, source_convention=source_convention_hint,
        is_gap_candidate=True,
        notes="no convention rule matched -- layout-signature fall-through",
    )


def _try_data_slot(data_slot: str | None) -> ConversionResult | None:
    """shadcn/Radix's real identity signal is a `data-slot` HTML attribute,
    not a class name -- `_SHADCN`'s `data_slot_attrs` flag has said so since
    this file's first version; Tier 1 (2026-09-14) is what actually reads it.

    Looks the attribute VALUE up directly against the shared component
    vocabulary (`_UTILITY_COMPONENT_SLOT_MAP`), since shadcn's own
    `data-slot` values use the same component names (`data-slot="card"`,
    `data-slot="dialog"`, ...). Returns None when there's no attribute or no
    vocabulary hit -- callers must not treat that as a failure.
    """
    if not data_slot:
        return None
    mapped_block = _UTILITY_COMPONENT_SLOT_MAP.get(data_slot)
    if mapped_block is None:
        return None
    return ConversionResult(
        sgs_bem_class=_build_sgs_bem(mapped_block, None, None),
        block=mapped_block,
        source_class=f"[data-slot={data_slot}]",
        source_convention="shadcn / Radix",
        is_canonical_for_drafts=False,
        is_slot_map_hit=True,
        notes="mapped via data-slot attribute (shadcn's real identity signal)",
    )


def convert_class_signature(
    classes: list[str],
    source_convention_hint: str | None = None,
    data_slot: str | None = None,
) -> dict:
    """Convert an entire class signature (e.g. a DOM element's classList).

    `data_slot` (Tier 1, 2026-09-14): the element's `data-slot` HTML
    attribute value, when present. Consulted once at the signature level
    (not threaded into `_try_rule`/`convert_class`, which are per-class-token
    functions) because it is an ELEMENT-level attribute, not a class. A
    genuine data-slot hit is promoted to `primary` when the class-token pass
    alone didn't produce a genuine slot-map hit -- this is exactly the case a
    hashed/generated shadcn class (`sc-bdVaJa`) needs, since the class
    string itself carries zero signal.

    Returns a dict carrying:
      - primary_sgs_bem:  the highest-confidence SGS-BEM class (the most
        specific / first-matching rule wins).
      - equivalent_implementations:  dict[source_class -> sgs_bem_class]
        per Spec 31 Â§8.1.
      - per_class:  the full ConversionResult list (for debugging).
      - gap_candidate_classes: source classes that fell through.
    """
    per_class = [convert_class(c, source_convention_hint) for c in classes]
    equiv = {r.source_class: r.sgs_bem_class for r in per_class}
    gaps = [r.source_class for r in per_class if r.is_gap_candidate]
    # Primary: prefer SGS-BEM canonical match; otherwise first non-gap.
    primary: ConversionResult | None = next(
        (r for r in per_class if r.is_canonical_for_drafts), None
    )
    if primary is None:
        primary = next((r for r in per_class if not r.is_gap_candidate), None)
    if primary is None and per_class:
        primary = per_class[0]
    data_slot_result = _try_data_slot(data_slot)
    if data_slot_result is not None:
        per_class.append(data_slot_result)
        equiv[data_slot_result.source_class] = data_slot_result.sgs_bem_class
        if primary is None or not primary.is_slot_map_hit:
            primary = data_slot_result
    return {
        "primary_sgs_bem":           primary.sgs_bem_class if primary else None,
        "primary_block":             primary.block if primary else None,
        # Tier 0 C1 fix (2026-09-11) -- the discriminator the orchestrator's
        # stage_4_lingua_franca_gate must key on instead of source_convention
        # name. True only when `primary` came from a genuine slot-map hit
        # (or canonical identity match), never from a rule regex matching
        # syntactically and falling through to `default_block`.
        "primary_is_slot_map_hit":   bool(primary.is_slot_map_hit) if primary else False,
        "equivalent_implementations":equiv,
        "per_class":                 [r.to_dict() for r in per_class],
        "gap_candidate_classes":     gaps,
        "source_convention_hint":    source_convention_hint,
    }


def round_trip_check(token: str, source_convention_hint: str | None = None) -> bool:
    """For a token assumed to be already-SGS-BEM, return True if conversion
    yields the same class. Used by the orchestrator to skip the converter
    when a Bean-controlled draft is already in canonical form."""
    result = convert_class(token, source_convention_hint=source_convention_hint)
    return result.is_canonical_for_drafts and result.sgs_bem_class == token


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--classes", required=True,
                        help="Comma-separated source class names")
    parser.add_argument("--convention", default=None,
                        help="Source convention name (uimax convention_name)")
    args = parser.parse_args(argv)
    classes = [c.strip() for c in args.classes.split(",") if c.strip()]
    result = convert_class_signature(classes, source_convention_hint=args.convention)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
