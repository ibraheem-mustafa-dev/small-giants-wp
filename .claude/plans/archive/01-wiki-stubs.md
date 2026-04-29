# Spec 01: Generate 57 Block Wiki Stubs
**Target model:** Cerebras (Qwen 3 235B)
**Estimated time:** 10-15 min

## What you are building
Markdown wiki pages for every block in the SGS WordPress Framework. One file per block.

## Before you start
Run these commands to get the data you need:

Get the full block list:
    python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT slug, title, category, block_type, grade FROM blocks ORDER BY category, slug"

For each block, get its attributes:
    python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero
(Replace sgs/hero with each block slug)

Check patterns and gotchas:
    python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py patterns
    python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py gotchas

## Output directory
Write each file to: C:/Users/Bean/.agents/skills/sgs-wp-engine/wiki/blocks/<slug>.md
The slug is the block name without the sgs/ prefix. Example: sgs/hero becomes hero.md.

## Wiki page template
Every file must follow this structure exactly:

    ---
    slug: sgs/hero
    title: SGS Hero
    category: sgs-layout
    type: dynamic
    grade: ungraded
    attributes: 39
    ---

    # SGS Hero

    ## When to Use
    Full-width hero section for page openers. Supports background images, video,
    parallax scroll, gradient overlays, badges, and dual CTA buttons.

    ## Key Attributes
    - alignment (string): left/centre/right text alignment
    - backgroundImage (object): media library image for hero background
    - ctaPrimaryText (string): primary call-to-action button label
    - ctaPrimaryUrl (string): primary CTA link destination
    - overlayOpacity (number): darkness of the background overlay (0-100)

    ## Common Patterns
    Used in: homepage-hero, landing-page, about-page patterns.

    ## Connects To
    Often followed by sgs/stats-counter, sgs/feature-grid, or sgs/testimonial.

    ## Gotchas
    Background images must be optimised for web (WebP, max 200KB).
    Video backgrounds need a static fallback for mobile.

    ## Example Usage
    Restaurant homepage with parallax food photography, "Order Now" primary CTA,
    and "View Menu" secondary CTA.

## Quality rules
- Every frontmatter field must come from DB data (never guess)
- "When to Use" must be specific to THIS block (not generic)
- Write "TODO: needs manual input" for anything you cannot determine from the DB
- Do NOT invent attributes that are not in the DB query output
- Maximum 40 lines per file
- UK English throughout (colour not color, organisation not organization)
- The example above (sgs/hero) is a REAL example from the DB — use it as your quality benchmark

## Verification
After generating all files, count them:
    ls C:/Users/Bean/.agents/skills/sgs-wp-engine/wiki/blocks/ | wc -l
Expected: 57 files (one per block in the DB).