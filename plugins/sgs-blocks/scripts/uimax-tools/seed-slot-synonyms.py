#!/usr/bin/env python3
"""Seed sgs-framework.db `slots` table with BEM element → standalone_block mappings
at element scope.

Ported 2026-05-30 from the retired `slot_synonyms` table to the post-D99 `slots`
table (composite PK on (slot_name, scope); this script only writes scope='element').
Column mapping: canonical_slot → slot_name; description → notes. The dropped
`role` and `html_semantic_tag` columns are intentionally not carried over —
roles now live in the `roles` table (per role_name) and at the per-attribute
level in `block_attributes.role`; HTML semantic tag is no longer a slot-level
concept (R-22-1 universal walker resolves by BEM class, not by tag).

Discovers missing aliases by walking block.json + save.js + render.php for every
SGS block and inserting BEM element names that are NOT yet covered by any existing
slot row at element scope.

Idempotent semantics:
- Uses INSERT OR IGNORE for new rows (slot_names that don't exist yet at element scope).
- Uses UPDATE to extend the `aliases` JSON array of EXISTING element-scope rows
  (e.g. adding "split-image" to the existing `media` slot's aliases).
- Re-running is a no-op once all rows are present.

The strategy for aliases-extension (rather than new rows) is intentional:
  `split-image` is not a new concept — it's the media slot rendered in a split
  layout. Adding it as an alias of `media` is correct and follows how the existing
  `image`, `photo`, `picture` aliases work. Similarly `bg-img`/`bg-media` are
  aliases of `backgroundMedia`.

Writes to the single canonical sgs-framework.db; the .claude/ and .agents/ paths
are the same physical file via NTFS junction post-2026-05-29 verification
(see memory/feedback_dbs_are_junction_not_mirror.md).

Run:
    python plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py
    python plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# DB path — single canonical file (matches db_lookup.SGS_DB)
# ---------------------------------------------------------------------------
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Canonical data — new alias extensions to EXISTING canonical rows.
#
# Format:  (canonical_slot, [new_aliases_to_add], description_note)
#
# These are aliases of existing canonicals — the BEM element name used on an
# <img>/<video> tag inside a split-layout, background, or side-panel. The
# canonical_slot it belongs to is determined by which block_attributes row
# controls image styling (objectFit, objectPosition, width, height, border).
#
# "split-image" → media:
#   hero/block.json: imageObjectFit, imageObjectPosition → canonical_slot='media'
#   The BEM element sgs-hero__split-image is the <img> controlled by those attrs.
#   RC-3 trigger: these 20 attrs were silently dropped because
#   canonical_slot_for('split-image') returned None.
#
# "bg-img" → backgroundMedia:
#   hero/render.php emits sgs-hero__bg-img for the background image element.
#   backgroundImage/backgroundMedia attrs → canonical_slot='backgroundMedia'.
#
# "bg-media" → backgroundMedia:
#   cta-section/render.php emits sgs-cta-section__bg-media.
#   Same backgroundMedia concept.
#
# "side-image" / "side-img" → media:
#   Used in blocks with a side-by-side image+text layout. Maps to media slot
#   same as split-image (the image column in a 2-col layout).
#
# "img" → media:
#   Bare img element (no block qualifier) — shorthand for the media slot.
#
# "video-bg" → backgroundMedia:
#   hero/render.php emits sgs-hero__video-bg for background video elements.
# ---------------------------------------------------------------------------
ALIAS_EXTENSIONS: list[tuple[str, list[str]]] = [
    # ----- image / media slot aliases -----------------------------------
    ("media", [
        "split-image",        # RC-3 root cause: hero split-image drops ~20 attrs
        "split-image--bleed", # bleed modifier variant of split-image
        "split-image--desktop",  # responsive desktop variant
        "split-image--mobile",   # responsive mobile variant
        "side-image",         # side-panel image (2-col layouts)
        "side-img",           # abbreviated form of side-image
        "img",                # bare img element shorthand
        "image-wrap",         # wrapper div that controls image sizing/border
        "img-wrap",           # abbreviated form of image-wrap
        "bg-img",             # alias kept here as well for blocks using bg-img as media
        "photo",              # already an alias but ensure normalised form included
        "slot-img",           # media-manager slot image preview
        "thumb-img",          # thumbnail image (gallery, post-grid)
        "thumb",              # thumbnail container
        "badge-img",          # image inside a badge element
    ]),

    # ----- background media aliases ------------------------------------
    ("backgroundMedia", [
        "bg-img",             # hero background image element class
        "bg-media",           # cta-section background media wrapper
        "bg-video",           # background video element
        "video-bg",           # hero video-bg BEM element
        "svg-bg",             # SVG used as background decoration
    ]),

    # ----- text / body slot aliases ------------------------------------
    # NOTE 2026-05-24: structural-wrapper terms (inner, body-row, custom-content)
    # removed — they were causing wrapper divs (__inner, __content, __body-row)
    # to wrongly collapse into sgs/text via the composite_element walker branch.
    # The walker's section_inner_absorb pre-pass (2026-05-24) + correct BEM
    # resolution now handles wrappers properly. "quote" moved to its own
    # canonical (below) so __quote BEM element resolves to sgs/quote per Spec 00
    # BEM-as-canonical rule (HTML tag is NOT a recognition signal).
    ("text", [
        "bio",                # biography text (team-member, testimonial)
        "excerpt",            # post excerpt (post-grid cards)
        "intro",              # introductory paragraph
        "review-content",     # review body text (review blocks)
        "consent-text",       # legal consent copy (forms)
        "content-preview",    # content preview pane (editor UI)
        "inner-label",        # inner label text
        "label-control",      # label associated with a form control
    ]),

    # ----- quote slot aliases (added 2026-05-24 — moved from text canonical) ----
    # Spec 00 §3.4: quote is a first-class canonical slot. BEM element __quote
    # (or __blockquote, __pullquote) on a draft routes to sgs/quote standalone
    # block via slots.standalone_block lookup. HTML tag is NOT used for
    # recognition — pure BEM-canonical path.
    ("quote", [
        "quote",              # primary BEM element name
        "blockquote",         # semantic-HTML-friendly alias for the same intent
        "pullquote",          # pullquote variant (same block, different style)
    ]),

    # ----- heading slot aliases ----------------------------------------
    ("heading", [
        "headline",           # display headline (hero, cta-section)
        "card-title",         # title on a card element
        "review-header",      # review source / reviewer name header
        "aggregate-text",     # aggregate score label text
    ]),

    # ----- subheading slot aliases -------------------------------------
    ("subheading", [
        "subheadline",        # explicit subheadline element (hero, feature-grid)
    ]),

    # ----- label slot aliases ------------------------------------------
    # The `label` slot is the canonical home for every small pre-heading /
    # eyebrow / kicker / tag / pill / BADGE text element — it routes to
    # sgs/label (the "Atomic eyebrow / kicker / badge text block; reusable for
    # card-tag badges"). Any BEM element whose role is a short standalone label
    # or cosmetic badge belongs here, NOT sgs/text (body copy) or a per-block
    # scalar attr. See Spec 00 §"Label / badge recognition" + Spec 02 sgs/label.
    ("label", [
        "badge-label",        # text inside a badge
        "badge-text",         # alternative badge text element name
        "inner-label",        # inner slot label
        "slot-label",         # media-manager slot label
        "node-icon",          # tree-node icon label (timeline, step blocks)
        "discount-label",     # cosmetic discount/value badge text (FR-27-B3 product-card)
        "discount-badge",     # discount badge element variant
        "value-badge",        # "Best value" style badge
        "savings-label",      # savings/value label text
        "sale-badge",         # "Sale" / "On sale" badge text
        "ribbon-label",       # ribbon-style badge text
    ]),

    # ----- button / CTA aliases ----------------------------------------
    ("button", [
        "btn",                # abbreviated button element
        # NOTE: plural group terms "ctas" / "buttons" intentionally NOT here.
        # They name a button-GROUP (a div holding primary + secondary buttons),
        # not a single button, and belong solely to the `button-group` slot
        # (→ sgs/multi-button). Listing them on `button` made
        # resolve_slug_from_bem(['sgs-hero__ctas']) ambiguously win for
        # sgs/button (first-writer-wins), so a cloned CTA group emitted a
        # redundant sgs/container wrapper instead of dissolving into
        # sgs/multi-button. See migration 2026-06-16-button-group-alias-disambiguation.py.
        "cta-inputs",         # CTA with inline input (email capture CTAs)
        "readmore",           # read-more link element
        "load-more",          # load-more pagination trigger
    ]),

    # ----- avatar / portrait aliases -----------------------------------
    ("avatar", [
        "avatar-img",         # the <img> inside the avatar container
        "avatar-initials",    # text initials fallback for avatar
    ]),

    # ----- icon slot aliases -------------------------------------------
    ("icon", [
        "feature-icon",       # icon inside a feature item (feature-grid)
        "feature-icon--check",  # checkmark icon variant
        "feature-icon--cross",  # cross/excluded icon variant
        "check",              # standalone check icon element
        "verified-icon",      # verification checkmark icon
        "badge-number",       # numeric badge (notification-style)
    ]),

    # ----- rating / stars slot aliases ---------------------------------
    ("rating", [
        "stars",              # star rating container
        "header-stars",       # stars in the review header section
        "card-stars",         # stars on a review card
        "aggregate",          # aggregate rating score display
    ]),

    # ----- number / stat slot aliases ----------------------------------
    ("number", [
        "stat",               # single statistic value (trust-bar, stats block)
        "stats",              # statistics container
        "count",              # count display (review count, product count)
        "count-link",         # linked count (e.g. '128 reviews')
        "aggregate",          # aggregate numeric score
        "numeric",            # explicit numeric element
        "badge-number",       # numeric badge overlay
    ]),

    # ----- date slot aliases -------------------------------------------
    ("date", [
        "card-date",          # date on a post/review card
        "day",                # day unit (countdown timer)
        "period",             # billing period label (pricing)
        "time",               # time element alias
    ]),

    # ----- text slot aliases — social / attribution -------------------
    ("text", [
        "attribution",        # attribution line (testimonial — "— Jane Smith, CEO")
        "author",             # author name (post cards, testimonials)
        "verified-text",      # 'Verified buyer' label text
        "verified",           # verification status text
        # Added 2026-05-24: announcement-bar messages[] array items are short text
        "messages",           # plural form (announcement-bar.messages array attr)
        "message",            # singular form (singularised stem)
    ]),

    # ----- role (job title) aliases -----------------------------------
    ("role", [
        "card-meta",          # meta line on a card (role/category)
        "category",           # post category label
    ]),

    # ----- items / list slot aliases ----------------------------------
    ("items", [
        "list",               # explicit list container
        "features",           # feature-list container
        "badges",             # badges list container
        "social",             # social links list container
        "social-link",        # individual social link item
        "thumbs",             # thumbnails list
        "dots",               # carousel dot indicators
        "dot",                # single carousel dot
        "arrows",             # carousel arrows container
        "arrow",              # single carousel arrow
        "filters",            # filter tags list (post-grid)
        "filter",             # single filter tag
        "set",                # option-set container (choice group)
        "option",             # single selectable option
    ]),

    # ----- card slot aliases -------------------------------------------
    ("card", [
        "card-body",          # card content area
        "card-header",        # card header section
        "review",             # review card element
        "review-row",         # review item row
        "plan",               # pricing plan card
        "plan-meta",          # pricing plan metadata section
        "slide",              # carousel/slider slide item
        "entry",              # feed/list entry item
        "item",               # generic list item
        "item-link",          # linked item
        "item-btn",           # item action button
        "stat",               # stat card (also listed under number — dual mapping)
        "step",               # step item (multi-step progress)
        "stage",              # stage/phase card (timeline)
        "node",               # tree node (timeline, step)
        "slot",               # media-manager slot container
    ]),

    # ----- panel slot aliases ------------------------------------------
    ("panel", [
        "panels",             # multi-panel container
        "panel-hint",         # panel auxiliary hint text
        "panel-note",         # panel footnote
        "preview",            # content preview panel
        "preview-container",  # preview panel container
    ]),

    # ----- overlay slot aliases ----------------------------------------
    ("overlay", [
        "overlay-bio",        # bio overlay panel (team-member)
        "lightbox",           # lightbox overlay
        "lightbox-body",      # lightbox content area
        "lightbox-img",       # lightbox image
        "lightbox-caption",   # lightbox caption
        "lightbox-close",     # lightbox close button
        "lightbox-next",      # lightbox next button
        "lightbox-prev",      # lightbox previous button
        "lightbox-counter",   # lightbox position counter
        "dialog",             # dialog overlay element
    ]),

    # ----- separator slot aliases --------------------------------------
    ("separator", [
        "line",               # visual line separator
        "wave",               # decorative wave divider
        "shape",              # decorative shape divider
        "card-sep",           # card internal separator
    ]),

    # ----- logo slot aliases -------------------------------------------
    ("logo", [
        "header-logo",        # logo in a header context
        "header-logo-link",   # logo wrapped in a link
        "google-logo",        # Google branding logo (review blocks)
    ]),

    # ----- link slot aliases -------------------------------------------
    ("link", [
        "count-link",         # linked count display
        "image-link",         # image wrapped in a link
        "social-link",        # social media link
    ]),

    # ----- nav / menu slot aliases ------------------------------------
    ("items", [
        "nav",                # navigation list
        "menu",               # menu list
    ]),

    # ----- progress slot (bar canonical) ------------------------------
    ("bar", [
        "progress",           # progress value fill
        "progress-bar",       # progress bar track element
        "progress-wrapper",   # progress bar outer wrapper
        "progress-steps",     # step indicator container
        "progress-step",      # individual step indicator
        "progress-step-label",  # step label text
        "progress-step-number", # step number badge
        "track",              # slider track element
    ]),

    # ----- split / layout slot aliases --------------------------------
    ("split", [
        "grid",               # grid layout container
        "row",                # row layout container
        "group",              # generic group/wrapper
        "body-row",           # body text row in split layout
    ]),

    # ----- price slot aliases -----------------------------------------
    ("price", [
        "price-wrapper",      # price display wrapper
        "savings-badge",      # savings/discount badge on pricing
        "ribbon",             # pricing ribbon element
    ]),

    # ----- caption slot aliases ---------------------------------------
    ("caption", [
        "lightbox-caption",   # caption inside lightbox (also in overlay)
    ]),

    # ----- tab slot aliases -------------------------------------------
    ("tab", [
        "billing-toggle",     # monthly/yearly billing toggle (pricing)
        "toggle-input",       # toggle switch input
        "toggle-label",       # toggle switch label
        "toggle-track",       # toggle visual track element
        "filter",             # filter tab (post-grid — also in items)
    ]),
]

# ---------------------------------------------------------------------------
# New canonical rows — slot names that don't exist as a canonical yet.
#
# These are BEM elements that represent genuinely new slot concepts not yet
# in the vocabulary. Each becomes a new canonical_slot row.
#
# Format: (canonical_slot, [aliases], role, description, html_tag)
# ---------------------------------------------------------------------------
NEW_CANONICAL_ROWS: list[tuple[str, list[str], str | None, str, str | None]] = [
    # Social / review aggregate concepts
    ("review",        ["review-row", "review-item", "review-card"],    "identity",    "Single review entry (distinct from review-content body text)", "article"),
    ("social",        ["social-link", "social-icon", "social-item"],   "identity",    "Social media link / icon container",                           "a"),
    ("nav",           ["navigation", "menu-nav"],                      "identity",    "Navigation container slot",                                    "nav"),
    # Progress / step concepts
    ("progress",      ["progress-bar", "progressBar", "progress-fill"], "visual",     "Progress indicator — fill level or step tracker",              "div"),
    ("step",          ["progress-step", "wizard-step", "stage-item"],  "identity",    "Individual step in a multi-step sequence",                     "li"),
    # Media management
    ("slot",          ["slot-placeholder", "slot-upload", "slot-preview", "slot-actions", "slot-label", "slot-img"], "identity", "Media-manager slot container (admin UI)", "div"),
    # Structural
    ("ribbon",        ["price-ribbon", "plan-ribbon"],                 "visual",      "Decorative ribbon overlay on a card/panel",                    "span"),
    # Content-cap area label (2026-06-09).
    # NOTE — DELIBERATELY EMPTY aliases ([]): a 2026-05-24 decision (see the
    # ALIAS_EXTENSIONS `text` block note above) removed the structural-wrapper
    # terms `inner`/`content`/`body-row` because they made wrapper divs
    # (__inner, __content, __body-row) wrongly COLLAPSE into a content-block
    # primitive via the composite_element walker branch. We must NOT
    # reintroduce that failure mode. This slot exists SOLELY as a
    # canonical_slot VALUE for the content-area box layout attributes
    # (contentWidth*, contentPadding*) — labelling which sub-AREA of a block
    # those attrs belong to (the constrained content-width cap inside a
    # block's OUTER box). It is metadata only, never matched against draft
    # class names. An empty-alias slot only ever matches the literal stem
    # `content`, never an arbitrary draft wrapper class.
    ("content",       [],                                              None,          "Content-cap sub-area label — the constrained content-width box inside a block's outer box. canonical_slot value for contentWidth*/contentPadding* layout attrs (metadata only; EMPTY aliases by design — never matched against draft wrapper classes; see 2026-05-24 inner/body-row removal note).", None),
]

# ---------------------------------------------------------------------------
# NEW STANDALONE ROWS — new canonical slots that ALSO emit a specific block
# via standalone_block (and optionally standalone_block_default_attrs).
#
# These differ from NEW_CANONICAL_ROWS in that they carry the converter-routing
# columns (standalone_block, standalone_block_default_attrs) in addition to the
# base slot metadata.  The `_atomic_attrs_for` function in convert.py handles
# content extraction for these blocks once routing lands them correctly.
#
# Format:
#   (slot_name, aliases, standalone_block, standalone_block_default_attrs_dict,
#    description)
# ---------------------------------------------------------------------------
NEW_STANDALONE_ROWS: list[tuple[str, list[str], str, dict, str]] = [
    # sgs/option-picker — exclusive radio-group pill chooser (FR-24-15 / D144).
    # Recognition: BEM element __pill-group on any parent block (e.g.
    # sgs-product-card__pill-group, sgs-featured-product__pill-group).
    # Aliases cover variant naming across clients; pill-group is the active
    # Mama's Munches draft term.
    # standalone_block_default_attrs: pillStyle=filled is the product-card
    # default (D144.3); typeKey="" signals authors to fill it post-clone.
    (
        "option-picker",
        ["pill-group", "pills", "option-group", "variant-group", "pack-group", "flavour-group", "size-group"],
        "sgs/option-picker",
        {"pillStyle": "filled", "typeKey": ""},
        "Exclusive radio-group pill chooser — emits sgs/option-picker with optionItems array (FR-24-15)",
    ),
    # sgs/accordion-item — single expandable panel inside an sgs/accordion.
    # Recognition: BEM element __accordion-item (full compound token, e.g.
    # sgs-accordion__accordion-item).  The compound element token is what
    # parse_sgs_bem() returns for class "sgs-accordion__accordion-item"; it is
    # distinct from the bare "item" alias (which maps to the generic card slot →
    # sgs/info-box for card-grid / gallery / icon-list items).  No collision risk:
    # Path 2 of _resolve_slug_from_bem_tuple looks up the FULL element token
    # "accordion-item" — the bare "item" key in _slot_alias_to_standalone is a
    # separate entry and is never consulted for the compound form.
    # standalone_block_default_attrs: {} — title is extracted from the __heading
    # child by the walker's text-leaf path; no default attrs needed at emit time.
    # NOTE: block_composition.has_inner_blocks for sgs/accordion-item must be 1
    # (the body __body children are InnerBlocks in edit.js / render.php uses
    # $content).  The DB currently has has_inner_blocks=0 (data quality gap).
    # This is corrected via seed-composition-roles.py ENFORCE_HAS_INNER_BLOCKS
    # in the same fix batch (Gate A 2026-06-10).
    (
        "accordion-item",
        [],
        "sgs/accordion-item",
        {},
        "Single expandable panel inside sgs/accordion — emits sgs/accordion-item with title attr from __heading child (Gate A 2026-06-10)",
    ),
]

# ---------------------------------------------------------------------------
# AMBIGUOUS mappings — surfaced for operator review, NOT auto-inserted.
# Rule: if a BEM element could plausibly belong to 2+ different canonical
# slots with equal evidence, it goes here instead of ALIAS_EXTENSIONS.
# ---------------------------------------------------------------------------
AMBIGUOUS: list[tuple[str, list[str], str]] = [
    ("author", ["heading", "text"], "Author name could be heading-level (prominent) or text-level (byline). In post-grid it's heading-ish; in testimonial it's text-ish. Recommend: add to 'text' + override per-block via block_attributes canonical_slot."),
    ("aggregate", ["number", "rating"], "'aggregate' appears in review blocks as both the numeric score and a star-rating rollup. Recommend: add to 'rating' (most common use: aggregate star rating) and also add 'aggregate-text' to 'text'."),
    ("stat", ["number", "card"], "In trust-bar/stats block, 'stat' is the entire card unit (card slot). In a stat-value context it's a number. Recommend: add to 'number' for styling purposes (number controls objectFit etc.) since the card wrapper is covered by 'card'."),
    ("card-meta", ["role", "text"], "'card-meta' in post-grid is the category/date meta line (text). In team-member it's the job title (role). Recommend: add to 'text' as the wider classification; per-block canonical_slot on the attr is the tiebreaker."),
]


# ---------------------------------------------------------------------------
# Core seeder logic
# ---------------------------------------------------------------------------

def _current_aliases(conn: sqlite3.Connection, canonical: str) -> list[str]:
    """Return the current aliases list for an element-scope slot."""
    row = conn.execute(
        "SELECT aliases FROM slots WHERE slot_name = ? AND scope = 'element'",
        (canonical,),
    ).fetchone()
    if not row or not row[0]:
        return []
    try:
        return json.loads(row[0])
    except (ValueError, TypeError):
        return []


def _extend_aliases(
    conn: sqlite3.Connection,
    canonical: str,
    new_aliases: list[str],
    dry_run: bool,
) -> tuple[int, int]:
    """Extend the aliases JSON array for an existing canonical row.

    Returns (added, skipped) counts.
    """
    existing = set(_current_aliases(conn, canonical))
    to_add = [a for a in new_aliases if a not in existing]
    skipped = len(new_aliases) - len(to_add)

    if not to_add:
        return 0, skipped

    merged = sorted(existing | set(to_add))
    merged_json = json.dumps(merged, ensure_ascii=False)

    if not dry_run:
        conn.execute(
            "UPDATE slots SET aliases = ? WHERE slot_name = ? AND scope = 'element'",
            (merged_json, canonical),
        )
        conn.commit()

    return len(to_add), skipped


def _insert_canonical_row(
    conn: sqlite3.Connection,
    canonical: str,
    aliases: list[str],
    role: str | None,  # kept in signature for NEW_CANONICAL_ROWS compat; not written
    description: str,
    html_tag: str | None,  # kept in signature for NEW_CANONICAL_ROWS compat; not written
    dry_run: bool,
) -> tuple[int, int]:
    """INSERT OR IGNORE a new element-scope slot row.

    `role` and `html_tag` are accepted for backwards-compat with
    NEW_CANONICAL_ROWS tuples but NOT written — those columns were dropped
    when slot_synonyms unified into slots at D99 (2026-05-29).

    Returns (inserted, skipped) counts.
    """
    if not dry_run:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO slots
                (slot_name, scope, aliases, notes)
            VALUES (?, 'element', ?, ?)
            """,
            (canonical, json.dumps(aliases, ensure_ascii=False), description),
        )
        conn.commit()
        inserted = cur.rowcount
    else:
        # In dry-run, check if it already exists at element scope
        exists = conn.execute(
            "SELECT 1 FROM slots WHERE slot_name = ? AND scope = 'element'",
            (canonical,),
        ).fetchone()
        inserted = 0 if exists else 1

    skipped = 1 - inserted
    return inserted, skipped


def _insert_standalone_row(
    conn: sqlite3.Connection,
    slot_name: str,
    aliases: list[str],
    standalone_block: str,
    default_attrs: dict,
    description: str,
    dry_run: bool,
) -> tuple[int, int]:
    """INSERT OR IGNORE a new element-scope slot row with standalone_block routing.

    Inserts all five columns including standalone_block and
    standalone_block_default_attrs.  Used for slots whose purpose is to route a
    BEM element directly to a specific SGS block (e.g. sgs/option-picker).

    Returns (inserted, skipped) counts.
    """
    default_attrs_json = json.dumps(default_attrs, ensure_ascii=False) if default_attrs else None
    if not dry_run:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO slots
                (slot_name, scope, aliases, standalone_block,
                 standalone_block_default_attrs, notes)
            VALUES (?, 'element', ?, ?, ?, ?)
            """,
            (
                slot_name,
                json.dumps(aliases, ensure_ascii=False),
                standalone_block,
                default_attrs_json,
                description,
            ),
        )
        conn.commit()
        inserted = cur.rowcount
    else:
        exists = conn.execute(
            "SELECT 1 FROM slots WHERE slot_name = ? AND scope = 'element'",
            (slot_name,),
        ).fetchone()
        inserted = 0 if exists else 1

    skipped = 1 - inserted
    return inserted, skipped


def seed_db(db_path: Path, dry_run: bool) -> dict:
    """Seed one DB. Returns stats dict."""
    if not db_path.exists():
        print(f"  SKIP: DB not found at {db_path}", file=sys.stderr)
        return {"alias_added": 0, "alias_skipped": 0, "canonical_inserted": 0, "canonical_skipped": 0}

    conn = sqlite3.connect(str(db_path))
    stats = {"alias_added": 0, "alias_skipped": 0, "canonical_inserted": 0, "canonical_skipped": 0}

    try:
        # Pass 1: extend aliases on existing element-scope slot rows
        for canonical, new_aliases in ALIAS_EXTENSIONS:
            # Check the slot exists at element scope
            exists = conn.execute(
                "SELECT 1 FROM slots WHERE slot_name = ? AND scope = 'element'",
                (canonical,),
            ).fetchone()
            if not exists:
                print(f"  WARNING: slot '{canonical}' (element scope) not found — skipping alias extension {new_aliases[:3]!r}...")
                continue
            added, skipped = _extend_aliases(conn, canonical, new_aliases, dry_run)
            stats["alias_added"] += added
            stats["alias_skipped"] += skipped
            if added:
                verb = "[DRY-RUN] would add" if dry_run else "added"
                print(f"  alias→{canonical}: {verb} {added} ({new_aliases[:3]}{'...' if len(new_aliases) > 3 else ''})")

        # Pass 2: insert new canonical rows (no standalone_block)
        for canonical, aliases, role, description, html_tag in NEW_CANONICAL_ROWS:
            inserted, skipped = _insert_canonical_row(
                conn, canonical, aliases, role, description, html_tag, dry_run
            )
            stats["canonical_inserted"] += inserted
            stats["canonical_skipped"] += skipped
            if inserted:
                verb = "[DRY-RUN] would insert" if dry_run else "inserted"
                print(f"  NEW canonical: {canonical} ({verb})")

        # Pass 3: insert new standalone-block routing rows
        for slot_name, aliases, standalone_block, default_attrs, description in NEW_STANDALONE_ROWS:
            inserted, skipped = _insert_standalone_row(
                conn, slot_name, aliases, standalone_block, default_attrs, description, dry_run
            )
            stats["canonical_inserted"] += inserted
            stats["canonical_skipped"] += skipped
            if inserted:
                verb = "[DRY-RUN] would insert" if dry_run else "inserted"
                print(f"  NEW standalone-block slot: {slot_name} → {standalone_block} ({verb})")

        # GUARD (D194, adversarial-council 2026-06-09): the `content` element-slot is a
        # metadata-only area label (canonical_slot value for contentWidth*/contentPadding*).
        # It MUST keep standalone_block IS NULL. If it ever gains a standalone_block, the
        # ~13 stem-collision rows tagged canonical_slot='content' with a content-bearing
        # role (e.g. sgs/heading.content, core/* body text) would start emitting rogue
        # child InnerBlocks mid-clone — the exact D85 wrong-collapse failure mode. Fail
        # loudly here rather than discover it in a pixel-diff three sections later.
        _content_sb = conn.execute(
            "SELECT standalone_block FROM slots WHERE slot_name='content' AND scope='element'"
        ).fetchone()
        if _content_sb is not None and _content_sb[0] not in (None, ""):
            raise SystemExit(
                "GUARD FAILED (D194): the 'content' element-slot has gained a "
                f"standalone_block ({_content_sb[0]!r}). Re-audit every "
                "canonical_slot='content' + content-bearing-role row before proceeding "
                "(see decisions.md D194 + reports/wave2/WRAPPER-CSS-ROUTING-DESIGN-GATE.md)."
            )

    finally:
        conn.close()

    return stats


def _discover_bem_elements(repo_path: Path) -> set[str]:
    """Walk block source files and collect all BEM element names.

    Returns a set of raw element strings (e.g. 'split-image', 'bg-img').
    Used only to validate coverage — the authoritative data is ALIAS_EXTENSIONS.
    """
    blocks_root = repo_path / "plugins" / "sgs-blocks" / "src" / "blocks"
    elements: set[str] = set()

    if not blocks_root.exists():
        return elements

    pattern = re.compile(r"sgs-[\w-]+__([\w-]+)")

    for block_dir in blocks_root.iterdir():
        if not block_dir.is_dir():
            continue
        for fname in ("save.js", "edit.js", "render.php"):
            f = block_dir / fname
            if f.exists():
                try:
                    text = f.read_text(encoding="utf-8", errors="ignore")
                    for m in pattern.finditer(text):
                        elem = m.group(1)
                        # Strip trailing -- (modifier fragments caught by regex)
                        elem = elem.rstrip("-")
                        if elem:
                            elements.add(elem)
                except OSError:
                    pass

    return elements


def _verify_coverage(db_path: Path, repo_path: Path | None) -> tuple[int, int, list[str]]:
    """After seeding, check what elements are still unresolvable.

    Returns (resolved, unresolved, list_of_unresolved).
    """
    if repo_path is None:
        return 0, 0, []

    elements = _discover_bem_elements(repo_path)
    if not elements:
        return 0, 0, []

    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases FROM slots WHERE scope = 'element'"
        ).fetchall()
    finally:
        conn.close()

    # Build lookup set: all known keys (slot names + aliases)
    known: set[str] = set()
    for canonical, aliases_json in rows:
        known.add(canonical)
        # Normalise: strip hyphens/underscores → lowercase for comparison
        known.add(re.sub(r"[-_]", "", canonical).lower())
        if aliases_json:
            try:
                for a in json.loads(aliases_json):
                    known.add(a)
                    known.add(re.sub(r"[-_]", "", a).lower())
            except (ValueError, TypeError):
                pass

    resolved = []
    unresolved = []
    for elem in sorted(elements):
        norm = re.sub(r"[-_]", "", elem).lower()
        if elem in known or norm in known:
            resolved.append(elem)
        else:
            unresolved.append(elem)

    return len(resolved), len(unresolved), unresolved


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Seed slots table (element scope) with BEM element → slot_name mappings"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted/updated without writing to the DB",
    )
    parser.add_argument(
        "--repo",
        default=None,
        help="Path to small-giants-wp repo root (enables coverage verification)",
    )
    args = parser.parse_args(argv)

    dry_run = args.dry_run
    repo_path = Path(args.repo) if args.repo else None

    # Auto-detect repo path from script location if not provided
    if repo_path is None:
        # script lives at: <repo>/plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py
        script_dir = Path(__file__).resolve().parent
        candidate = script_dir.parent.parent.parent.parent  # 4 levels up to repo root
        if (candidate / "plugins" / "sgs-blocks").exists():
            repo_path = candidate

    if dry_run:
        print("=== DRY-RUN MODE — no DB writes ===")

    # Print ambiguous mappings warning first so it's visible
    print("\n" + "=" * 60)
    print("AMBIGUOUS MAPPINGS — operator review required (not auto-inserted):")
    for elem, candidates, reason in AMBIGUOUS:
        print(f"  {elem!r} → candidates {candidates!r}")
        print(f"       Reason: {reason}")
    print("=" * 60)

    print(f"\nSeeding sgs-framework.db: {SGS_DB}")
    stats = seed_db(SGS_DB, dry_run)
    print(f"  alias_added       : {stats['alias_added']}")
    print(f"  alias_skipped     : {stats['alias_skipped']}  (already present)")
    print(f"  canonical_inserted: {stats['canonical_inserted']}")
    print(f"  canonical_skipped : {stats['canonical_skipped']}  (already present)")

    print()
    print("slots (element-scope) seed complete:")
    print(f"  alias_added       : {stats['alias_added']}")
    print(f"  alias_skipped     : {stats['alias_skipped']}")
    print(f"  canonical_inserted: {stats['canonical_inserted']}")
    print(f"  canonical_skipped : {stats['canonical_skipped']}")

    # Row counts
    print()
    if SGS_DB.exists():
        conn = sqlite3.connect(str(SGS_DB))
        count = conn.execute(
            "SELECT COUNT(*) FROM slots WHERE scope = 'element'"
        ).fetchone()[0]
        conn.close()
        verb = "would be" if dry_run else "now"
        print(f"  slots (element-scope) row count {verb}: {count}")

    # Coverage check
    if repo_path and SGS_DB.exists():
        print()
        print("Coverage verification (BEM elements discoverable via slots WHERE scope='element'):")
        resolved, unresolved_count, unresolved_list = _verify_coverage(SGS_DB, repo_path)
        print(f"  Resolved  : {resolved}")
        print(f"  Unresolved: {unresolved_count}")
        if unresolved_list:
            print("  Unresolved elements (UI-only or structural — no attr styling needed):")
            for e in unresolved_list:
                print(f"    - {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
