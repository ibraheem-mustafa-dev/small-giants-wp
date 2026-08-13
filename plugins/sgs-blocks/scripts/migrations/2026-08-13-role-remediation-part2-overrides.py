"""One-shot script: apply this session's confirmed one-off role classifications.

Investigated by 5 parallel agents (Batches A/B/C/E1/E2, DB role-remediation part 2,
2026-08-13). E1's 117 rows + the Batch A boolean remainder are closed structurally by
TIER 3.19 (generic boolean backstop) and do NOT go through this script. Everything
here is a genuine one-off / small-family judgement call the agents confirmed has no
existing structural DB signal, per attr-classification-overrides.json's own docstring
boundary.

Writes to BOTH layers, matching D604's mechanism:
  1. attr-classification-overrides.json (reseed-durable)
  2. the live DB directly (immediate effect, no full reseed)
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OVERRIDES_PATH = Path(__file__).resolve().parents[1] / "attr-classification-overrides.json"

# (block_slug, attr_name, role, css_property_or_None)
ENTRIES = [
    # --- Batch A: bgKenBurns -> css-gate (gates container's own Ken-Burns animation
    # class; container/style.css:190-198 `animation: sgs-container-ken-burns`) ---
    ("sgs/container", "bgKenBurns", "css-gate", "animation"),
    ("sgs/cta-section", "bgKenBurns", "css-gate", "animation"),
    ("sgs/hero", "bgKenBurns", "css-gate", "animation"),
    ("sgs/site-footer", "bgKenBurns", "css-gate", "animation"),
    ("sgs/site-header", "bgKenBurns", "css-gate", "animation"),
    ("sgs/trust-bar", "bgKenBurns", "css-gate", "animation"),

    # --- Batch A: dragToScroll -> behaviour (Spec 38 fx grammar, same class as
    # dragMomentum/loopCarousel; css_property='fx:draggable' matches the registry
    # extension added to seed-motion-fx-registry.py in this session) ---
    ("sgs/buybox", "dragToScroll", "behaviour", "fx:draggable"),
    ("sgs/gallery", "dragToScroll", "behaviour", "fx:draggable"),
    ("sgs/google-reviews", "dragToScroll", "behaviour", "fx:draggable"),
    ("sgs/post-grid", "dragToScroll", "behaviour", "fx:draggable"),
    ("sgs/testimonial-slider", "dragToScroll", "behaviour", "fx:draggable"),
    ("sgs/trustpilot-reviews", "dragToScroll", "behaviour", "fx:draggable"),

    # --- Batch A: autoplay -> behaviour (pure JS setInterval carousel advance, NOT
    # part of the Spec 38 fx grammar; no CSS painting) ---
    ("sgs/google-reviews", "autoplay", "behaviour", None),
    ("sgs/testimonial-slider", "autoplay", "behaviour", None),
    ("sgs/trustpilot-reviews", "autoplay", "behaviour", None),

    # --- Batch B: shapeDivider{Top,Bottom}{Flip,Invert} -> styling. Confirmed real
    # CSS transform paint site (shape-dividers.php:100-129, scaleX/scaleY(-1)) on the
    # same wrapper-only-read consumer as the sibling shapeDividerTop/Bottom strings
    # (already role='styling'). Root cause: fingerprint_content_roles.eligible_pool()
    # hard-filters attr_type='string', excluding ALL booleans from the D1-D7/TIER 2.4
    # pipeline -- a cross-cutting fix (widening that filter) needs a design-gate before
    # a session touches it (CLAUDE.md Rule 7); flagged, not built this session. ---
    ("sgs/container", "shapeDividerTopFlip", "styling", None),
    ("sgs/container", "shapeDividerTopInvert", "styling", None),
    ("sgs/container", "shapeDividerBottomFlip", "styling", None),
    ("sgs/container", "shapeDividerBottomInvert", "styling", None),
    ("sgs/cta-section", "shapeDividerTopFlip", "styling", None),
    ("sgs/cta-section", "shapeDividerTopInvert", "styling", None),
    ("sgs/cta-section", "shapeDividerBottomFlip", "styling", None),
    ("sgs/cta-section", "shapeDividerBottomInvert", "styling", None),
    ("sgs/hero", "shapeDividerTopFlip", "styling", None),
    ("sgs/hero", "shapeDividerTopInvert", "styling", None),
    ("sgs/hero", "shapeDividerBottomFlip", "styling", None),
    ("sgs/hero", "shapeDividerBottomInvert", "styling", None),
    ("sgs/trust-bar", "shapeDividerTopFlip", "styling", None),
    ("sgs/trust-bar", "shapeDividerTopInvert", "styling", None),
    ("sgs/trust-bar", "shapeDividerBottomFlip", "styling", None),
    ("sgs/trust-bar", "shapeDividerBottomInvert", "styling", None),
    ("sgs/site-footer", "shapeDividerTopFlip", "styling", None),
    ("sgs/site-footer", "shapeDividerTopInvert", "styling", None),
    ("sgs/site-footer", "shapeDividerBottomFlip", "styling", None),
    ("sgs/site-footer", "shapeDividerBottomInvert", "styling", None),
    ("sgs/site-header", "shapeDividerTopFlip", "styling", None),
    ("sgs/site-header", "shapeDividerTopInvert", "styling", None),
    ("sgs/site-header", "shapeDividerBottomFlip", "styling", None),
    ("sgs/site-header", "shapeDividerBottomInvert", "styling", None),

    # --- Batch C: JSON-LD/schema toggles -> technical (matches faqSchema precedent,
    # D604/D607; confirmed by direct render.php read, gates ONLY a wp_json_encode()
    # <script type="application/ld+json"> sink) ---
    ("sgs/star-rating", "schemaEnabled", "technical", None),
    ("sgs/star-rating", "schemaReviewCount", "technical", None),
    ("sgs/testimonial", "schemaEnabled", "technical", None),

    # --- E2 Shape 2: overlayGradientAngle -> styling (same TIER 2.4 wrapper-only-read
    # class as shapeDivider; class-sgs-container-wrapper.php:293) ---
    ("sgs/container", "overlayGradientAngle", "styling", None),
    ("sgs/cta-section", "overlayGradientAngle", "styling", None),
    ("sgs/site-footer", "overlayGradientAngle", "styling", None),
    ("sgs/site-header", "overlayGradientAngle", "styling", None),
    ("sgs/trust-bar", "overlayGradientAngle", "styling", None),

    # --- E2 Shape 3: responsive tri-state behaviour objects -> behaviour (pure JS/CSS
    # scroll-behaviour config, no text content, no paint-only CSS value) ---
    ("sgs/site-header", "headerHideOnScroll", "behaviour", None),
    ("sgs/site-header", "headerShrink", "behaviour", None),
    ("sgs/site-header", "headerSticky", "behaviour", None),
    ("sgs/site-header", "headerTransparent", "behaviour", None),
    ("sgs/site-header-row", "rowHideOnScroll", "behaviour", None),
    ("sgs/site-header-row", "rowShrink", "behaviour", None),
    ("sgs/site-header-row", "rowTransparent", "behaviour", None),
    ("sgs/site-footer-row", "rowHideOnScroll", "behaviour", None),
    ("sgs/site-footer-row", "rowShrink", "behaviour", None),
    ("sgs/site-footer-row", "rowTransparent", "behaviour", None),

    # --- E2 Shape 4: query/filter arrays -> technical (WP_Query args, not content) ---
    ("sgs/card-grid", "categoryTerm", "technical", None),
    ("sgs/card-grid", "count", "technical", None),
    ("sgs/card-grid", "handpickedIds", "technical", None),
    ("sgs/card-grid", "productCategories", "technical", None),
    ("sgs/card-grid", "productIds", "technical", None),
    ("sgs/card-grid", "productLimit", "technical", None),
    ("sgs/card-grid", "productTags", "technical", None),
    ("sgs/card-grid", "queryCategory", "technical", None),
    ("sgs/card-grid", "queryPostsPerPage", "technical", None),
    ("sgs/post-grid", "categories", "technical", None),
    ("sgs/post-grid", "excerptLength", "technical", None),
    ("sgs/post-grid", "offset", "technical", None),
    ("sgs/post-grid", "postsPerPage", "technical", None),
    ("sgs/post-grid", "tags", "technical", None),
    ("sgs/product-card", "overrideElements", "technical", None),
    ("sgs/product-card", "visibleAxes", "technical", None),
    ("sgs/product-search", "maxResults", "technical", None),
    ("sgs/filter-search", "threshold", "technical", None),

    # --- E2 Shape 4: repeater/option arrays -> content (client-authored data, not
    # config) ---
    ("sgs/cta-section", "buttons", "content", None),
    ("sgs/cta-section", "stats", "content", None),
    ("sgs/form-field-address", "fields", "content", None),
    ("sgs/form-field-checkbox", "options", "content", None),
    ("sgs/form-field-file", "allowedTypes", "content", None),
    ("sgs/form-field-radio", "options", "content", None),
    ("sgs/form-field-select", "options", "content", None),
    ("sgs/form-field-tiles", "tiles", "content", None),
    ("sgs/option-picker", "optionItems", "content", None),
    ("sgs/gallery", "mediaItems", "content", None),
    ("sgs/social-icons", "icons", "content", None),
    ("sgs/team-member", "socialLinks", "content", None),
    ("sgs/table-of-contents", "headingLevels", "content", None),

    # --- E2 Shape 4: motion/physics numerics -> behaviour (config, no CSS paint) ---
    ("sgs/physics-canvas", "physicsBounce", "behaviour", None),
    ("sgs/physics-canvas", "physicsEdgeResistance", "behaviour", None),
    ("sgs/physics-canvas", "physicsGravity", "behaviour", None),
    ("sgs/timeline", "revealStagger", "behaviour", None),
    ("sgs/decorative-image", "pathDrawTriggerOffset", "behaviour", None),
    ("sgs/nav-menu", "submenuCloseGrace", "behaviour", None),
    ("sgs/form", "rateLimit", "behaviour", None),

    # --- E2 Shape 4: frame-count/pad numerics -> technical (canvas-engine config, not
    # a styling fact) ---
    ("sgs/image-sequence", "desktopFrameCount", "technical", None),
    ("sgs/image-sequence", "desktopFramePad", "technical", None),
    ("sgs/image-sequence", "mobileFrameCount", "technical", None),
    ("sgs/image-sequence", "mobileFramePad", "technical", None),
    ("sgs/image-sequence", "tabletFrameCount", "technical", None),
    ("sgs/image-sequence", "tabletFramePad", "technical", None),

    # --- E2 Shape 4: remaining mixed numerics/objects ---
    ("sgs/counter", "number", "content", None),
    ("sgs/countdown-timer", "evergreenHours", "behaviour", None),
    ("sgs/countdown-timer", "evergreenMinutes", "behaviour", None),
    ("sgs/google-reviews", "maxReviews", "behaviour", None),
    ("sgs/icon-list", "menuRef", "technical", None),
    ("sgs/nav-menu", "ref", "technical", None),
    ("sgs/responsive-logo", "logoSwitchCustomPx", "styling", None),
    ("sgs/responsive-logo", "svgAnimationSource", "technical", None),
    ("sgs/separator", "gradientAngle", "styling", None),
    ("sgs/table-of-contents", "scrollOffset", "styling", None),
    # ratingStars: the EXISTING 'rating' role's own roles.json exemplar names this
    # exact attr -- a pre-existing structural home, not a new judgement call.
    ("sgs/testimonial", "ratingStars", "rating", None),
    ("sgs/trustpilot-reviews", "reviewsAverage", "content", None),
    ("sgs/trustpilot-reviews", "totalReviews", "content", None),
    ("sgs/trustpilot-reviews", "trustScore", "content", None),
    ("sgs/decorative-image", "decorMedia", "styling", None),
    ("sgs/decorative-image", "rotation", "styling", None),
    ("sgs/mega-panel", "asideSeparator", "styling", None),

    # --- E2 Shape 1: splitSvg base classification (svg content, matching svgContent's
    # own role) -- unblocks TIER 3.41 to inherit splitSvgMobile/splitSvgTablet on the
    # next reseed pass without a further override ---
    ("sgs/hero", "splitSvg", "svg", None),
]


def main() -> int:
    # --- 1. Write to attr-classification-overrides.json (reseed-durable) ---
    with open(OVERRIDES_PATH, "r", encoding="utf-8") as fh:
        overrides = json.load(fh)

    existing_keys = {(e["slug"], e["attr"]) for e in overrides["entries"]}
    added = 0
    for slug, attr, role, css_property in ENTRIES:
        if (slug, attr) in existing_keys:
            continue
        fields = {"role": role}
        if css_property is not None:
            fields["css_property"] = css_property
        overrides["entries"].append({"slug": slug, "attr": attr, "fields": fields})
        added += 1

    with open(OVERRIDES_PATH, "w", encoding="utf-8") as fh:
        json.dump(overrides, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print(f"  overrides.json: {added} new entries added ({len(ENTRIES) - added} already present)")

    # --- 2. Apply identical UPDATEs to the live DB ---
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    updated = 0
    for slug, attr, role, css_property in ENTRIES:
        if css_property is not None:
            cur.execute(
                "UPDATE block_attributes SET role = ?, css_property = ? "
                "WHERE block_slug = ? AND attr_name = ?",
                (role, css_property, slug, attr),
            )
        else:
            cur.execute(
                "UPDATE block_attributes SET role = ? "
                "WHERE block_slug = ? AND attr_name = ?",
                (role, slug, attr),
            )
        updated += cur.rowcount
    conn.commit()
    conn.close()

    print(f"  live DB: {updated}/{len(ENTRIES)} rows updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
