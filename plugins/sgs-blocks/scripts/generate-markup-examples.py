#!/usr/bin/env python3
"""
Generate markup examples for all 69 SGS blocks with block.json files.

Phase 6 — Decision 9 implementation.
Creates (or extends) the markup_examples table in sgs-framework.db,
then seeds one row per block minimum:
  - Track A (~54 simple/dynamic blocks): auto-generated from block.json defaults
  - Track B (15 complex composites): hand-authored WP block markup strings

Schema matches core blocks.db markup_examples (minus block_id FK — we use block_slug):
  id, block_slug, title, description, markup_html, attributes_json,
  is_hand_authored, generated_from, source, validation_status

Run:
    python plugins/sgs-blocks/scripts/generate-markup-examples.py
    python plugins/sgs-blocks/scripts/generate-markup-examples.py --dry-run
    python plugins/sgs-blocks/scripts/generate-markup-examples.py --reset-sgs

"""
import sys
import os
import json
import glob
import sqlite3
import argparse
from datetime import datetime

# Paths
SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'blocks')
DB_PATH = r'C:\Users\Bean\.agents\skills\sgs-wp-engine\sgs-framework.db'

# ---------------------------------------------------------------------------
# Helper: content-bearing attribute detection
# Attributes whose value is rendered as user-visible text or media content.
# Excludes spacing, colour, visibility, layout, behaviour.
# ---------------------------------------------------------------------------
CONTENT_ATTR_NAMES = {
    'headline', 'subheadline', 'heading', 'subheading', 'title', 'subtitle',
    'label', 'body', 'text', 'content', 'description', 'caption', 'name',
    'imageurl', 'imagesrc', 'imagealt', 'alt', 'alttext',
    'buttontext', 'buttonlabel', 'buttonurl', 'buttonlink',
    'ctaprimarytext', 'ctasecondarytext', 'ctaprimaryurl', 'ctasecondaryurl',
    'linktext', 'linkurl', 'href', 'url', 'src',
    'quotetext', 'quote', 'author', 'role', 'bio',
    'prefix', 'suffix', 'number',
    'videourl', 'videosrc', 'embedurl',
}

# ---------------------------------------------------------------------------
# Hand-authored markup examples for 15 complex composite blocks
# (sgs/hero and friends — innerBlocks, conditional attrs, etc.)
# ---------------------------------------------------------------------------
HAND_AUTHORED = {
    'hero': (
        'Hero — standard left-aligned with two CTAs',
        'A full-width hero section with headline, sub-headline, and primary+secondary CTAs.',
        '<!-- wp:sgs/hero {"variant":"standard","headline":"Premium Food Wholesale, Delivered Next Day","subHeadline":"Supplying restaurants, retailers and caterers across the UK since 1962.","alignment":"left","ctaPrimaryText":"Request a Quote","ctaPrimaryUrl":"/contact","ctaSecondaryText":"Browse Products","ctaSecondaryUrl":"/products"} /-->',
    ),
    'card-grid': (
        'Card Grid — 3-column feature cards',
        '3-column card grid with icon, heading, and body text on each card.',
        '<!-- wp:sgs/card-grid {"columns":3,"layout":"grid"} -->\n<!-- wp:sgs/card-grid -->\n<!-- /wp:sgs/card-grid -->',
    ),
    'tabs': (
        'Tabs — two-tab horizontal layout',
        'Horizontal tab container with two tabs using InnerBlocks.',
        '<!-- wp:sgs/tabs {"tabStyle":"horizontal"} -->\n<!-- wp:sgs/tab {"label":"Overview"} -->\n<p>Tab one content.</p>\n<!-- /wp:sgs/tab -->\n<!-- wp:sgs/tab {"label":"Details"} -->\n<p>Tab two content.</p>\n<!-- /wp:sgs/tab -->\n<!-- /wp:sgs/tabs -->',
    ),
    'testimonial': (
        'Testimonial — single quote with author',
        'Single testimonial with quote text, author name, role and star rating.',
        '<!-- wp:sgs/testimonial {"quote":"An exceptional supplier — reliable, quick, and always quality produce.","author":"Sarah Patel","role":"Head Chef, The Grand Hotel","rating":5} /-->',
    ),
    'accordion': (
        'Accordion — two expandable items',
        'Accordion container with two collapsible items.',
        '<!-- wp:sgs/accordion {"iconPosition":"right"} -->\n<!-- wp:sgs/accordion-item {"title":"What is the minimum order?"} -->\n<p>Our minimum order is £75 for next-day delivery.</p>\n<!-- /wp:sgs/accordion-item -->\n<!-- wp:sgs/accordion-item {"title":"Which areas do you deliver to?"} -->\n<p>We deliver across the UK mainland, typically next working day.</p>\n<!-- /wp:sgs/accordion-item -->\n<!-- /wp:sgs/accordion -->',
    ),
    'gallery': (
        'Gallery — 3-image grid with lightbox',
        '3-column image gallery with Interactivity API lightbox.',
        '<!-- wp:sgs/gallery {"layout":"grid","columns":3,"lightbox":true,"images":[{"id":1,"url":"https://example.com/img1.jpg","alt":"Image 1"},{"id":2,"url":"https://example.com/img2.jpg","alt":"Image 2"},{"id":3,"url":"https://example.com/img3.jpg","alt":"Image 3"}]} /-->',
    ),
    'post-grid': (
        'Post Grid — latest 6 posts, 3-column grid',
        'Post grid showing 6 most recent posts in a 3-column responsive grid layout.',
        '<!-- wp:sgs/post-grid {"postsPerPage":6,"columns":3,"layout":"grid","showExcerpt":true,"showDate":true,"showAuthor":false} /-->',
    ),
    'form': (
        'Form — simple contact form',
        'Contact form with name, email, and message fields.',
        '<!-- wp:sgs/form {"formId":"contact","submitText":"Send Message","successMessage":"Thank you, we will be in touch shortly."} -->\n<!-- wp:sgs/form-field-text {"label":"Your Name","required":true,"fieldName":"name"} /-->\n<!-- wp:sgs/form-field-email {"label":"Email Address","required":true,"fieldName":"email"} /-->\n<!-- wp:sgs/form-field-textarea {"label":"Message","required":true,"fieldName":"message"} /-->\n<!-- /wp:sgs/form -->',
    ),
    'form-step': (
        'Form Step — single step in a multi-step form',
        'One step within a multi-step form with a title and a text field.',
        '<!-- wp:sgs/form-step {"stepTitle":"Your Details","stepIndex":0} -->\n<!-- wp:sgs/form-field-text {"label":"Full Name","required":true,"fieldName":"full_name"} /-->\n<!-- /wp:sgs/form-step -->',
    ),
    'pricing-table': (
        'Pricing Table — three-tier layout with toggle',
        '3-tier pricing table with monthly/yearly toggle.',
        '<!-- wp:sgs/pricing-table {"tiers":3,"billingToggle":true,"highlightedTier":1} /-->',
    ),
    'countdown-timer': (
        'Countdown Timer — date-based flip variant',
        'Countdown timer counting down to a specific date, using flip-card animation.',
        '<!-- wp:sgs/countdown-timer {"mode":"date","targetDate":"2026-12-31T23:59:59","variant":"flip","showDays":true,"showHours":true,"showMinutes":true,"showSeconds":true} /-->',
    ),
    'team-member': (
        'Team Member — photo, name, role and LinkedIn link',
        'Individual team member card with photo, name, role, bio and a social link.',
        '<!-- wp:sgs/team-member {"name":"Amir Hussain","role":"Managing Director","bio":"Third-generation family leader with 25 years in wholesale food distribution.","imageUrl":"https://example.com/amir.jpg","socialLinks":[{"platform":"linkedin","url":"https://linkedin.com/in/example"}]} /-->',
    ),
    'stats-bar': (
        'Stats Bar — four key metrics',
        '4-column stats bar displaying business metrics with animated counters.',
        '<!-- wp:sgs/stats-bar {"columns":4,"stats":[{"number":"60+","label":"Years in Business"},{"number":"5000+","label":"Products"},{"number":"£75","label":"Minimum Order"},{"number":"Next Day","label":"Delivery"}]} /-->',
    ),
    'icon-grid': (
        'Icon Grid — six feature icons',
        '6-item icon grid with Lucide icons and descriptive labels.',
        '<!-- wp:sgs/icon-grid {"columns":3,"items":[{"icon":"truck","label":"Fast Delivery"},{"icon":"shield-check","label":"Quality Assured"},{"icon":"package","label":"Wide Range"},{"icon":"clock","label":"Next Day"},{"icon":"thumbs-up","label":"Trade Credit"},{"icon":"phone","label":"Dedicated Support"}]} /-->',
    ),
    'multi-button': (
        'Multi Button — two-button group',
        'Two-button group with primary and secondary styles.',
        '<!-- wp:sgs/multi-button {"alignment":"left","gap":12} -->\n<!-- wp:sgs/button {"text":"Get Started","url":"/contact","style":"primary"} /-->\n<!-- wp:sgs/button {"text":"Learn More","url":"/about","style":"outline"} /-->\n<!-- /wp:sgs/multi-button -->',
    ),
}

# ---------------------------------------------------------------------------
# Detect if an attribute is content-bearing (used for role:content audit too)
# ---------------------------------------------------------------------------
def is_content_attr(attr_name: str) -> bool:
    """Return True if the attribute represents user-visible text or media."""
    key = attr_name.lower().replace('_', '').replace('-', '')
    return key in CONTENT_ATTR_NAMES


# ---------------------------------------------------------------------------
# Build auto-generated markup from block.json
# ---------------------------------------------------------------------------
def generate_markup(block_name: str, attrs: dict, inner_blocks_capable: bool) -> str:
    """Produce a minimal WP block comment string."""
    slug = block_name  # e.g. 'sgs/hero'
    if not attrs:
        if inner_blocks_capable:
            return f'<!-- wp:{slug} -->\n<!-- /wp:{slug} -->'
        return f'<!-- wp:{slug} /-->'

    try:
        attrs_str = json.dumps(attrs, ensure_ascii=False, separators=(',', ':'))
    except (TypeError, ValueError):
        attrs_str = '{}'

    if inner_blocks_capable:
        return f'<!-- wp:{slug} {attrs_str} -->\n<!-- /wp:{slug} -->'
    return f'<!-- wp:{slug} {attrs_str} /-->'


def load_block_json(block_dir: str) -> dict | None:
    path = os.path.join(block_dir, 'block.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def get_mtime_str(block_dir: str) -> str:
    path = os.path.join(block_dir, 'block.json')
    mtime = os.path.getmtime(path)
    return datetime.utcfromtimestamp(mtime).isoformat() + 'Z'


def extract_example_attrs(bj: dict) -> dict:
    """
    Extract a representative attribute set for the markup example.
    Priority: block.json 'example.attributes' > attribute defaults.
    Omit null/empty/false/0 defaults to keep the markup clean.
    Omit internal attributes (starting with _comment).
    """
    # Use explicit example block if available
    if 'example' in bj and 'attributes' in bj.get('example', {}):
        return bj['example']['attributes']

    attrs_def = bj.get('attributes', {})
    result = {}
    for name, defn in attrs_def.items():
        if name.startswith('_comment'):
            continue
        default = defn.get('default')
        if default is None:
            continue
        if default == '' or default == [] or default == {} or default is False or default == 0:
            continue
        result[name] = default
    return result


def has_inner_blocks(bj: dict) -> bool:
    """Return True if this block can/does have InnerBlocks."""
    # Heuristics: editorScript present + no 'save' is dynamic (may have innerBlocks)
    # or template/allowedBlocks/innerBlocksTemplate hints
    name = bj.get('name', '')
    slug = name.replace('sgs/', '')
    # Known composite blocks
    composites = {
        'accordion', 'tabs', 'form', 'form-step', 'multi-button',
        'card-grid', 'mega-menu', 'mobile-nav', 'container', 'pricing-table',
        'gallery', 'feature-grid', 'icon-grid', 'stats-bar', 'timeline',
        'process-steps', 'trust-bar', 'cta-section',
    }
    return slug in composites


# ---------------------------------------------------------------------------
# Create the markup_examples table if it doesn't exist
# ---------------------------------------------------------------------------
DDL = """
CREATE TABLE IF NOT EXISTS markup_examples (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug       TEXT    NOT NULL,
    title            TEXT    NOT NULL,
    description      TEXT,
    markup_html      TEXT    NOT NULL,
    attributes_json  TEXT,
    is_hand_authored INTEGER NOT NULL DEFAULT 0,
    generated_from   TEXT,
    source           TEXT    NOT NULL DEFAULT 'sgs',
    validation_status TEXT   NOT NULL DEFAULT 'unverified',
    created_at       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

# Also ensure generated_from column exists for rows added by this script
ALTER_DDL = "ALTER TABLE markup_examples ADD COLUMN generated_from TEXT;"


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(DDL)
    # Check if generated_from column exists (may have been created without it)
    cursor = conn.execute("PRAGMA table_info(markup_examples)")
    cols = [row[1] for row in cursor.fetchall()]
    if 'generated_from' not in cols:
        conn.execute(ALTER_DDL)
    conn.commit()


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------
def seed_markup_examples(dry_run: bool = False, reset_sgs: bool = False) -> None:
    conn = sqlite3.connect(DB_PATH)
    ensure_schema(conn)

    if reset_sgs:
        print("[RESET] Deleting all markup_examples WHERE source='sgs'...")
        if not dry_run:
            conn.execute("DELETE FROM markup_examples WHERE source='sgs'")
            conn.commit()

    # Get existing slugs so we don't double-insert
    existing = set(
        r[0] for r in conn.execute(
            "SELECT block_slug FROM markup_examples WHERE source='sgs'"
        ).fetchall()
    )
    print(f"Existing SGS markup_examples: {len(existing)}")

    inserted = 0
    skipped = 0

    block_dirs = sorted(glob.glob(os.path.join(SRC_DIR, '*')))

    for block_dir in block_dirs:
        slug_short = os.path.basename(block_dir)
        block_slug = f'sgs/{slug_short}'

        bj = load_block_json(block_dir)
        if bj is None:
            continue

        if block_slug in existing:
            skipped += 1
            continue

        mtime = get_mtime_str(block_dir)
        block_name = bj.get('name', block_slug)
        block_title = bj.get('title', slug_short)

        # --------------- Track B: hand-authored composites ---------------
        if slug_short in HAND_AUTHORED:
            ha_title, ha_desc, ha_markup = HAND_AUTHORED[slug_short]
            attrs_json = json.dumps(
                bj.get('example', {}).get('attributes', {}),
                ensure_ascii=False
            )
            print(f"  [HAND] {block_slug}: {ha_title}")
            if not dry_run:
                conn.execute(
                    """INSERT INTO markup_examples
                       (block_slug, title, description, markup_html, attributes_json,
                        is_hand_authored, generated_from, source, validation_status)
                       VALUES (?, ?, ?, ?, ?, 1, ?, 'sgs', 'unverified')""",
                    (block_slug, ha_title, ha_desc, ha_markup, attrs_json, mtime)
                )
            inserted += 1
            continue

        # --------------- Track A: auto-generated -------------------------
        example_attrs = extract_example_attrs(bj)
        uses_inner_blocks = has_inner_blocks(bj)
        markup = generate_markup(block_name, example_attrs, uses_inner_blocks)
        attrs_json = json.dumps(example_attrs, ensure_ascii=False)
        title = f'{block_title} — default'
        desc = bj.get('description', '')[:200] if bj.get('description') else ''

        print(f"  [AUTO] {block_slug}: {title}")
        if not dry_run:
            conn.execute(
                """INSERT INTO markup_examples
                   (block_slug, title, description, markup_html, attributes_json,
                    is_hand_authored, generated_from, source, validation_status)
                   VALUES (?, ?, ?, ?, ?, 0, ?, 'sgs', 'unverified')""",
                (block_slug, title, desc, markup, attrs_json, mtime)
            )
        inserted += 1

    if not dry_run:
        conn.commit()

    conn.close()

    print(f"\nDone: inserted={inserted} skipped={skipped}")

    # Final count verification
    if not dry_run:
        conn2 = sqlite3.connect(DB_PATH)
        count = conn2.execute(
            "SELECT COUNT(*) FROM markup_examples WHERE source='sgs'"
        ).fetchone()[0]
        hand_count = conn2.execute(
            "SELECT COUNT(*) FROM markup_examples WHERE source='sgs' AND is_hand_authored=1"
        ).fetchone()[0]
        conn2.close()
        print(f"Final: markup_examples WHERE source='sgs' = {count}")
        print(f"  hand_authored = {hand_count}")
        print(f"  auto_generated = {count - hand_count}")
        if count < 69:
            print(f"WARNING: Expected >= 69 rows, got {count}")
        else:
            print("PASS: markup_examples count >= 69")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Seed SGS markup_examples in sgs-framework.db')
    parser.add_argument('--dry-run', action='store_true', help='Print actions without writing')
    parser.add_argument('--reset-sgs', action='store_true', help='Delete existing sgs rows first')
    args = parser.parse_args()

    seed_markup_examples(dry_run=args.dry_run, reset_sgs=args.reset_sgs)
