#!/usr/bin/env python3
"""Patch the recogniser decisions JSON to replace the deferred featured-product
placeholder with two sgs/product-card blocks (Zookies + Trial Pack).

Pricing + variants from sites/mamas-munches/research/lead-research-2026-04-30.md
section 1.2. Mockup HTML: sites/mamas-munches/mockups/homepage/index.html
lines 858-914.

Usage:
    python tools/recogniser/patch-featured-product.py \\
        reports/recogniser-decisions-2026-05-01.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]


def build_featured_product_section() -> dict:
    """Build the replacement section structure.

    Wraps the heading, intro, and two product cards (Zookies + Trial Pack)
    in a core/group with the .featured-product class so the mockup CSS
    selector still applies.
    """

    zookies_card = {
        "block_name": "sgs/product-card",
        "extracted_attrs": {
            "image": "/wp-content/uploads/cookies-stacked.jpeg",
            "imageAlt": "Stack of Mama's Munches Zookies lactation cookies",
            "productName": "Mama's Munches Zookies",
            "description": (
                "Baked fresh every week and posted the same day. Oats, brewer's "
                "yeast, flaxseed, fenugreek — no shortcuts, no preservatives."
            ),
            "variantStyle": "standard",
            "packSizes": [
                {"label": "8-pack", "selected": True},
                {"label": "12-pack", "selected": False},
                {"label": "20-pack", "selected": False},
                {"label": "40-pack", "selected": False},
            ],
            "priceLarge": "£10.00",
            "priceNote": "8-pack · Free delivery over £35",
            "ctaText": "Add to Cart — £10",
            "ctaUrl": "/product/zookies/",
        },
        "inner_blocks": [],
    }

    trial_card = {
        "block_name": "sgs/product-card",
        "extracted_attrs": {
            "image": "/wp-content/uploads/cookies-on-bun-case.jpeg",
            "imageAlt": "Mama's Munches cookies in a bakery display",
            "productName": "The Trial Pack",
            "description": (
                "Not sure yet? Try 3 Classic Zookies and see what all the mums "
                "are talking about. Postage included."
            ),
            "variantStyle": "trial",
            "trialTag": "New? Start here",
            "packSizes": [],
            "priceLarge": "£5.00",
            "priceNote": "3 Classic Zookies · postage included",
            "ctaText": "Try 3 for £5",
            "ctaUrl": "/product/trial-pack/",
        },
        "inner_blocks": [],
    }

    columns = {
        "block_name": "core/columns",
        "extracted_attrs": {"className": "product-cards"},
        "inner_blocks": [
            {
                "block_name": "core/column",
                "extracted_attrs": {},
                "inner_blocks": [zookies_card],
            },
            {
                "block_name": "core/column",
                "extracted_attrs": {},
                "inner_blocks": [trial_card],
            },
        ],
    }

    section_label = {
        "block_name": "core/paragraph",
        "extracted_attrs": {
            "className": "section-label",
            "content": "Our signature",
        },
        "inner_blocks": [],
    }

    heading = {
        "block_name": "core/heading",
        "extracted_attrs": {
            "level": 2,
            "content": "Zookies — Our Signature Giant Cookie",
        },
        "inner_blocks": [],
    }

    intro = {
        "block_name": "core/paragraph",
        "extracted_attrs": {
            "className": "section-intro",
            "content": (
                "One Zookie is a proper sized treat. Every one baked to order, "
                "same week."
            ),
        },
        "inner_blocks": [],
    }

    return {
        "section_id": "zookies-our-signature-giant-cookie",
        "semantic_role": "main",
        "match": {
            "block_name": "core/group",
            "confidence": 1.0,
            "tier": "full",
            "extracted_attrs": {"className": "featured-product"},
            "inner_blocks": [section_label, heading, intro, columns],
            "patch_note": (
                "Manually patched 2026-05-01: replaced deferred placeholder "
                "with sgs/product-card x2 (Zookies standard + Trial Pack). "
                "Pricing from lead-research-2026-04-30.md section 1.2. "
                "Static visual clone — cart wiring deferred to ecom plugin."
            ),
        },
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: patch-featured-product.py <decisions.json>", file=sys.stderr)
        return 2

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"Not found: {json_path}", file=sys.stderr)
        return 1

    with json_path.open(encoding="utf-8") as fh:
        decisions = json.load(fh)

    if not isinstance(decisions, list):
        print("Expected JSON top-level array", file=sys.stderr)
        return 1

    target_idx = None
    for idx, sec in enumerate(decisions):
        if sec.get("section_id") == "zookies-our-signature-giant-cookie":
            target_idx = idx
            break

    if target_idx is None:
        print("Could not find featured-product section", file=sys.stderr)
        return 1

    decisions[target_idx] = build_featured_product_section()

    with json_path.open("w", encoding="utf-8") as fh:
        json.dump(decisions, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print(f"Patched section {target_idx} in {json_path}")
    print("New block_name: core/group with 4 inner_blocks "
          "(label, heading, intro, columns[2 product-cards])")
    return 0


if __name__ == "__main__":
    sys.exit(main())
