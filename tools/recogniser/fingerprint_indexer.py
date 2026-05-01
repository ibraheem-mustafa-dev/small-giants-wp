"""Module 2 — Fingerprint Indexer.

Builds tools/recogniser/data/fingerprints.json from three sources, in
priority order: the SGS DB, core WordPress blocks, and WooCommerce
blocks. Each fingerprint records the HTML signature, attribute
extractors, and required/optional features for one block.

Spec: .claude/plans/recogniser-v1.md  Module 2.

Stdlib only. Re-runnable; overwrites output. UK English throughout.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from typing import Any, Dict, List, Optional, Tuple

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #

SGS_DB_PATH = os.path.expanduser(
    "~/.claude/skills/sgs-wp-engine/sgs-framework.db"
)

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT_PATH = os.path.join(THIS_DIR, "data", "fingerprints.json")


# --------------------------------------------------------------------------- #
# SGS source
# --------------------------------------------------------------------------- #

# Heuristic feature mapping for SGS blocks based on attribute names. Order
# matters: the first matching pattern wins for "required" classification.
# Anything else flagged becomes "optional". Conservative — these are hints
# the recogniser uses to break ties, not authoritative requirements.
_REQUIRED_FEATURE_PATTERNS: List[Tuple[str, "re.Pattern[str]"]] = [
    ("headline", re.compile(r"^headline$")),
    ("sub-headline", re.compile(r"^subHeadline$")),
    ("primary-cta", re.compile(r"^ctaPrimary(Text|Url)$")),
    ("secondary-cta", re.compile(r"^ctaSecondary(Text|Url)$")),
    ("title", re.compile(r"^title$")),
    ("content", re.compile(r"^content$")),
    ("text", re.compile(r"^text$")),
]

_OPTIONAL_FEATURE_PATTERNS: List[Tuple[str, "re.Pattern[str]"]] = [
    ("background-image", re.compile(r"^backgroundImage$")),
    ("background-video", re.compile(r"^(backgroundVideo|bgVideo)")),
    ("background-colour", re.compile(r"^backgroundColor$")),
    ("overlay", re.compile(r"^overlay")),
    ("badges", re.compile(r"^badges$")),
    ("ken-burns", re.compile(r"^bgKenBurns$")),
    ("parallax", re.compile(r"^bgParallax$")),
    ("split-image", re.compile(r"^splitImage")),
    ("svg", re.compile(r"^svgContent$")),
    ("hover", re.compile(r"hover|Hover")),
    ("transition", re.compile(r"^transition")),
    ("alignment", re.compile(r"^(alignment|textAlign)")),
    ("min-height", re.compile(r"^minHeight")),
    ("typography", re.compile(r"(letterSpacing|textTransform|FontSize)")),
    ("colour", re.compile(r"(Colour|Color)$")),
]

# Top-level text attributes that always get an extractor entry when present.
_TEXT_EXTRACTOR_ATTRS = {
    "headline",
    "subHeadline",
    "title",
    "subtitle",
    "content",
    "text",
    "description",
    "label",
    "heading",
    "subheading",
    "quote",
    "author",
    "name",
    "role",
}

# CTA attribute groupings — emit one extractor per CTA slot.
_CTA_GROUPS: List[Tuple[str, str, str]] = [
    ("ctaPrimaryText", "ctaPrimaryUrl", "primary"),
    ("ctaSecondaryText", "ctaSecondaryUrl", "secondary"),
    ("buttonText", "buttonUrl", "primary"),
    ("ctaText", "ctaUrl", "primary"),
]


def _slug_from_block_name(block_name: str) -> str:
    """Return the slug component of a block name (e.g. ``sgs/hero`` -> ``hero``)."""
    return block_name.split("/", 1)[-1]


def _block_class_names(block_name: str) -> List[str]:
    """Return the class names WordPress would render for a block.

    WordPress emits ``wp-block-<namespace>-<slug>`` automatically. SGS blocks
    additionally use a BEM-style ``sgs-<slug>`` root class by convention.
    """
    namespace, slug = block_name.split("/", 1)
    if namespace == "sgs":
        return [f"sgs-{slug}", f"wp-block-sgs-{slug}"]
    if namespace == "core":
        return [f"wp-block-{slug}"]
    return [f"wp-block-{namespace}-{slug}"]


def _classify_features(attr_names: List[str]) -> Tuple[List[str], List[str]]:
    """Classify attributes into required / optional feature tags.

    Returns a tuple ``(required, optional)`` of de-duplicated, ordered tags.
    """
    required: List[str] = []
    optional: List[str] = []

    for attr in attr_names:
        matched_required = False
        for tag, pattern in _REQUIRED_FEATURE_PATTERNS:
            if pattern.search(attr):
                if tag not in required:
                    required.append(tag)
                matched_required = True
                break
        if matched_required:
            continue
        for tag, pattern in _OPTIONAL_FEATURE_PATTERNS:
            if pattern.search(attr):
                if tag not in optional:
                    optional.append(tag)
                break

    return required, optional


def _attr_extractors_for_sgs(
    block_name: str, attr_names: List[str]
) -> List[Dict[str, str]]:
    """Build placeholder attr_extractors using the ``sgs-<slug>__<element>``
    BEM convention. The recogniser may refine these at match time.
    """
    slug = _slug_from_block_name(block_name)
    root = f"sgs-{slug}"
    extractors: List[Dict[str, str]] = []
    seen: set = set()

    # Top-level text attributes.
    for attr in attr_names:
        if attr in _TEXT_EXTRACTOR_ATTRS and attr not in seen:
            # Map camelCase -> kebab-case for the BEM element.
            element = re.sub(r"([A-Z])", r"-\1", attr).lower().lstrip("-")
            selectors: List[str] = [f".{root}__{element}"]
            if attr == "headline":
                selectors.extend(["h1", "h2"])
            elif attr in ("subHeadline", "subheading", "subtitle"):
                selectors.append("p")
            extractors.append(
                {
                    "attr": attr,
                    "selector": ", ".join(selectors),
                    "extract": "text",
                }
            )
            seen.add(attr)

    # CTA groups — emit text + href when both halves are present.
    for text_attr, url_attr, slot in _CTA_GROUPS:
        if text_attr in attr_names and text_attr not in seen:
            selector = f".{root}__cta--{slot}"
            extractors.append(
                {"attr": text_attr, "selector": selector, "extract": "text"}
            )
            seen.add(text_attr)
            if url_attr in attr_names and url_attr not in seen:
                extractors.append(
                    {"attr": url_attr, "selector": selector, "extract": "href"}
                )
                seen.add(url_attr)

    return extractors


def _load_sgs_blocks() -> List[Dict[str, Any]]:
    """Read every SGS block and its attributes from the framework DB."""
    if not os.path.isfile(SGS_DB_PATH):
        raise FileNotFoundError(
            f"SGS framework DB not found at {SGS_DB_PATH}. "
            "Run /sgs-update or check the skill installation."
        )

    conn = sqlite3.connect(SGS_DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute("SELECT slug, category, type FROM blocks ORDER BY slug")
        block_rows = cur.fetchall()

        fingerprints: List[Dict[str, Any]] = []
        for slug, category, block_type in block_rows:
            cur.execute(
                "SELECT attr_name FROM block_attributes WHERE block_slug = ? "
                "ORDER BY id",
                (slug,),
            )
            attr_names = [r[0] for r in cur.fetchall()]
            required, optional = _classify_features(attr_names)
            class_names = _block_class_names(slug)

            fingerprints.append(
                {
                    "block_name": slug,
                    "source": "sgs",
                    "category": category or "sgs-uncategorised",
                    "block_type": block_type or "dynamic",
                    "required_html_pattern": {
                        "tag": "section",
                        "class_includes_any": class_names,
                    },
                    "attr_extractors": _attr_extractors_for_sgs(slug, attr_names),
                    "required_features": required,
                    "optional_features": optional,
                }
            )
        return fingerprints
    finally:
        conn.close()


# --------------------------------------------------------------------------- #
# Core WordPress source
# --------------------------------------------------------------------------- #

_CORE_BLOCKS: List[Dict[str, Any]] = [
    {
        "block_name": "core/group",
        "tag": "div",
        "extractors": [],
        "required": [],
        "optional": ["layout", "background"],
    },
    {
        "block_name": "core/columns",
        "tag": "div",
        "extractors": [],
        "required": ["columns"],
        "optional": ["stack-on-mobile"],
    },
    {
        "block_name": "core/column",
        "tag": "div",
        "extractors": [],
        "required": [],
        "optional": ["width"],
    },
    {
        "block_name": "core/heading",
        "tag": "h2",
        "extractors": [
            {"attr": "content", "selector": "h1, h2, h3, h4, h5, h6", "extract": "text"}
        ],
        "required": ["heading-text"],
        "optional": ["level", "alignment"],
    },
    {
        "block_name": "core/paragraph",
        "tag": "p",
        "extractors": [{"attr": "content", "selector": "p", "extract": "text"}],
        "required": ["text"],
        "optional": ["alignment", "drop-cap"],
    },
    {
        "block_name": "core/image",
        "tag": "figure",
        "extractors": [
            {"attr": "url", "selector": "img", "extract": "src"},
            {"attr": "alt", "selector": "img", "extract": "alt"},
            {"attr": "caption", "selector": "figcaption", "extract": "text"},
        ],
        "required": ["image-src"],
        "optional": ["caption", "link"],
    },
    {
        "block_name": "core/button",
        "tag": "div",
        "extractors": [
            {"attr": "text", "selector": "a, .wp-block-button__link", "extract": "text"},
            {"attr": "url", "selector": "a, .wp-block-button__link", "extract": "href"},
        ],
        "required": ["button-text"],
        "optional": ["style", "url"],
    },
    {
        "block_name": "core/buttons",
        "tag": "div",
        "extractors": [],
        "required": [],
        "optional": ["alignment"],
    },
    {
        "block_name": "core/quote",
        "tag": "blockquote",
        "extractors": [
            {"attr": "value", "selector": "p", "extract": "text"},
            {"attr": "citation", "selector": "cite", "extract": "text"},
        ],
        "required": ["quote-text"],
        "optional": ["citation"],
    },
    {
        "block_name": "core/list",
        "tag": "ul",
        "extractors": [],
        "required": [],
        "optional": ["ordered", "reversed"],
    },
    {
        "block_name": "core/list-item",
        "tag": "li",
        "extractors": [{"attr": "content", "selector": "li", "extract": "text"}],
        "required": ["text"],
        "optional": [],
    },
    {
        "block_name": "core/navigation",
        "tag": "nav",
        "extractors": [],
        "required": ["nav-items"],
        "optional": ["overlay-menu", "submenus"],
    },
    {
        "block_name": "core/separator",
        "tag": "hr",
        "extractors": [],
        "required": [],
        "optional": ["style"],
    },
    {
        "block_name": "core/spacer",
        "tag": "div",
        "extractors": [],
        "required": [],
        "optional": ["height"],
    },
]


def _build_core_fingerprints() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for entry in _CORE_BLOCKS:
        out.append(
            {
                "block_name": entry["block_name"],
                "source": "core",
                "category": "core",
                "block_type": "static",
                "required_html_pattern": {
                    "tag": entry["tag"],
                    "class_includes_any": _block_class_names(entry["block_name"]),
                },
                "attr_extractors": entry["extractors"],
                "required_features": entry["required"],
                "optional_features": entry["optional"],
            }
        )
    return out


# --------------------------------------------------------------------------- #
# WooCommerce source
# --------------------------------------------------------------------------- #

_WC_BLOCKS: List[Dict[str, Any]] = [
    {
        "block_name": "woocommerce/product-collection",
        "tag": "div",
        "extractors": [],
        "required": ["product-grid"],
        "optional": ["pagination", "filters", "sort"],
    },
    {
        "block_name": "woocommerce/single-product",
        "tag": "div",
        "extractors": [
            {"attr": "title", "selector": ".product_title", "extract": "text"},
            {"attr": "price", "selector": ".price", "extract": "text"},
        ],
        "required": ["product-title", "product-price"],
        "optional": ["gallery", "tabs", "related-products"],
    },
    {
        "block_name": "woocommerce/cart",
        "tag": "div",
        "extractors": [],
        "required": ["cart-items"],
        "optional": ["coupon", "shipping-calculator", "cross-sells"],
    },
    {
        "block_name": "woocommerce/checkout",
        "tag": "div",
        "extractors": [],
        "required": ["checkout-form"],
        "optional": ["coupon", "order-notes", "express-payments"],
    },
    {
        "block_name": "woocommerce/add-to-cart-form",
        "tag": "form",
        "extractors": [
            {"attr": "buttonText", "selector": "button[type=submit]", "extract": "text"}
        ],
        "required": ["add-to-cart-button"],
        "optional": ["quantity-selector", "variations"],
    },
]


def _build_wc_fingerprints() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for entry in _WC_BLOCKS:
        out.append(
            {
                "block_name": entry["block_name"],
                "source": "wc",
                "category": "woocommerce",
                "block_type": "dynamic",
                "required_html_pattern": {
                    "tag": entry["tag"],
                    "class_includes_any": _block_class_names(entry["block_name"]),
                },
                "attr_extractors": entry["extractors"],
                "required_features": entry["required"],
                "optional_features": entry["optional"],
            }
        )
    return out


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #


def build_index(out_path: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """Build the fingerprint catalogue and write it to disk.

    Args:
        out_path: Where to write ``fingerprints.json``. Defaults to
            ``tools/recogniser/data/fingerprints.json`` next to this file.

    Returns:
        The catalogue dict, keyed by block name.
    """
    if out_path is None:
        out_path = DEFAULT_OUT_PATH

    catalogue: Dict[str, Dict[str, Any]] = {}

    for fp in _load_sgs_blocks():
        catalogue[fp["block_name"]] = fp
    for fp in _build_core_fingerprints():
        catalogue[fp["block_name"]] = fp
    for fp in _build_wc_fingerprints():
        catalogue[fp["block_name"]] = fp

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(catalogue, fh, indent=2, ensure_ascii=False, sort_keys=True)

    return catalogue


def _summarise(catalogue: Dict[str, Dict[str, Any]]) -> str:
    counts: Dict[str, int] = {"sgs": 0, "core": 0, "wc": 0}
    for fp in catalogue.values():
        counts[fp["source"]] = counts.get(fp["source"], 0) + 1
    total = len(catalogue)
    return (
        f"fingerprints written: total={total} "
        f"sgs={counts['sgs']} core={counts['core']} wc={counts['wc']}"
    )


def main(argv: Optional[List[str]] = None) -> int:
    out_path = DEFAULT_OUT_PATH
    if argv and len(argv) > 1:
        out_path = argv[1]
    catalogue = build_index(out_path)
    print(_summarise(catalogue))
    print(f"-> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
