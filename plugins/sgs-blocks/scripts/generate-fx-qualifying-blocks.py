#!/usr/bin/env python3
"""generate-fx-qualifying-blocks.py — derives the block -> qualifying-fx-effects
map, replacing the hand-curated `FX_BLOCKS` array that used to live in
src/blocks/extensions/fx.js.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2 (placement taxonomy) + §7
(inspector panel). Task: "Replace a hardcoded block roster with a DERIVED one"
(2026-07-29) — the owner's own framing: "an easy way to judge which effects
qualify for which blocks" is exactly Spec 38 §2's Level/Exposure-surface/
Conditions columns, already captured as `fx_effects.scope`/`requires` by
seed-motion-fx-registry.py (extended by this same task). This script is the
SECOND half: turn "what an effect requires" + "what a block provides" into a
concrete per-block roster, DERIVED, never hand-typed.

WHY A SEPARATE ARTEFACT FROM generated-fx-effects.php
----------------------------------------------------------------------------
generated-fx-effects.php answers "what GSAP plugins does effect X need" —
keyed by EFFECT, consumed by the server-side plugin-loading registry.
This script answers "which effects can block Y even offer" — keyed by BLOCK,
consumed by BOTH the editor (does this block get the fx panel + which options
does its SelectControl list) and the render layer (is a `data-sgs-fx` value
on this block's markup even legitimate, or has it drifted from a block whose
capabilities changed since the client set it). Two different keys, two
different consumers — a single merged structure would force one side to
filter the other's shape.

WHAT COUNTS AS "PROVIDING" A REQUIREMENT (ground truth, not invented)
----------------------------------------------------------------------------
- 'section'  <- block.json `supports.sgs.containerKind === "section"`
                (mirrors block_composition.container_kind, populated by
                sync-container-wrapping-blocks.py from the SAME flag — see
                the DB-vs-block.json gap note below) OR the block IS
                `sgs/container` itself (the container never declares its own
                containerKind — nothing wraps it, it wraps others — but
                pin-scrub's own §2 row names it explicitly: "Inspector panel
                on `sgs/container` + section-KIND composites").
- 'text'     <- the block's edit.js imports/uses `RichText` (WordPress's own
                rich-text-editing component) — "the block owns and renders
                its own text" ground-tested as "does it render an editable
                RichText field", not a name-matching heuristic over
                attribute names (which over-matches: `role: "content"` scalar
                string attrs also cover url/label/id-shaped values on ~40
                unrelated blocks — verified via a throwaway scan before
                settling on this test).
- 'svg' / 'svg-subtree' — SPLIT 2026-07-31 (Motion Wave D register Step 4).
                Before the split both DrawSVG and MorphSVG shared a single
                'svg' requirement, computed as one union below. That
                conflated two different facts about a block and had a real
                consequence: `sgs/container`/`sgs/hero`/`sgs/cta-section`/
                `sgs/trust-bar` (the `bgSvgContent` providers — a `<div>`
                wrapper with an operator-supplied decorative background SVG
                blob, no shape geometry at its OWN root) satisfied the
                single 'svg' token and so were wrongly offered `morph`,
                which warns and skips at runtime because there is no `d` on
                the block's own root to rewrite (D430 finding). The two
                tokens now mean, and are computed, separately:

                'svg' <- block_slug is one of the 3 blocks confirmed to
                genuinely render inline SVG shape geometry at their own root:
                sgs/responsive-logo, sgs/icon, sgs/separator
                (SPEC_NAMED_SVG_BLOCKS). Means "this block's OWN rendered
                output CAN contain shape geometry with a `d`/path to act on"
                — verified live for all 3, corrected 2026-07-31 after a QC
                pass caught a grep blind spot (a literal `<svg` text search
                missed helper-function indirection):
                  - sgs/icon's render.php emits `sgs_get_lucide_icon()` /
                    `sgs_get_wp_icon()` output straight into an inline `<span
                    class="sgs-icon__svg">…svg…</span>` (real path glyphs).
                  - sgs/responsive-logo's render.php inlines a
                    wp_kses-sanitised media-library SVG when
                    `animationStyle !== 'none'`, and its own comment names
                    `data-sgs-fx="draw"` as already wired to that span
                    (FR-38-15).
                  - sgs/separator's render.php calls the SAME two helpers as
                    sgs/icon — `sgs_get_wp_icon( $icon_wp_name )` (line 310)
                    and `sgs_get_lucide_icon( $icon_name )` (line 315) —
                    conditionally, when `contentMode === 'icon'`. A first
                    pass on this block missed it: grepping the file for the
                    literal string `<svg` finds nothing, because the SVG
                    markup is produced by a helper function call, not typed
                    inline in this file — the same shape geometry sgs/icon
                    itself renders, one indirection layer deeper.
                sgs/decorative-image was ALSO in this roster before
                2026-07-31 (the spec's own §2 DrawSVG row names it) but is
                REMOVED as of this split: its render.php has been searched
                for every SVG-related surface — `svg`, `SVG`, `get_wp_icon`,
                `get_lucide_icon`, `wp_kses` — case-insensitively, and none
                appear. It renders an absolute-positioned `<img>` (raster) or
                a video via `sgs_render_media()`; even when an operator picks
                an `.svg` file as the image source, `<img src="…svg">`
                references the file as an opaque image resource — the
                browser has no DOM access to the paths inside it, so there is
                no `d` attribute reachable for MorphSVG to rewrite and
                nothing DrawSVG's `collectDrawTargets()` descendant search
                would ever find. Unlike sgs/responsive-logo (which inlines
                its SVG via `wp_kses` specifically so the paths become real
                DOM nodes — see that block's own comment), decorative-image
                has no inlining path today. The spec's own citation is
                therefore stale against the live code for this one block;
                see the amendment text below this docstring's dated note for
                the exact wording returned to the spec owner (§38, not
                edited here — that file is owned and serialised elsewhere).
                This is the correct requirement for `morph` (MorphSVG
                rewrites the element's OWN `d` attribute).

                'svg-subtree' <- the 'svg' set (above) UNION any block that
                declares a `bgSvgContent` ATTRIBUTE in its own block.json
                (it renders operator-supplied inline `<svg>` markup through
                `SGS_Container_Wrapper`'s `.sgs-container__svg-bg` layer —
                verified at includes/class-sgs-container-wrapper.php, which
                emits `<div class="sgs-container__svg-bg" aria-hidden>
                {svg}</div>` only when `$is_section` is true). Means "this
                block's rendered SUBTREE contains inline SVG somewhere,
                whether or not the block's own root is a shape" — a
                strictly WIDER set than 'svg', since a shape trivially is
                also a subtree containing itself. This is the correct
                requirement for `draw` (DrawSVG strokes whatever
                path/line/polyline/polygon/rect/ellipse/circle it finds
                inside the fx element's descendants — verified:
                responsive-logo's render.php comment names
                `collectDrawTargets()` as a descendant search, not a
                root-only check — so a block whose only SVG is a nested
                `bgSvgContent` decoration still has real drawable geometry).

                The `bgSvgContent` half is DERIVED (2026-07-31, unchanged by
                this split) and is 'svg-subtree''s primary route beyond the
                'svg' set. The 3-name half of 'svg' (corrected 2026-07-31 —
                see the 'svg' section above for the separator/decorative-image
                QC correction) is a RETAINED, documented exception to
                "derive, don't hardcode": those blocks render their SVG from
                their own render.php rather than through the wrapper's bgSvg
                layer, no structural block.json flag or DB role unifies them
                (verified — a `<svg` literal-markup scan over-matches wildly,
                hitting a dozen unrelated blocks that only ship chevron/star
                glyphs, AND under-matches sgs/separator, whose SVG comes from
                a helper-function call rather than literal markup — grep's
                blind spot is the shape of the grep, not just its over-reach),
                and the spec itself gives a closed, named list rather than a
                detectable rule. Citing the spec's own literal roster is not
                the same failure mode as inventing one.

                EDGE CASE — a block with BOTH `bgSvgContent` AND its own SVG
                render path (asked for explicitly by the Step 4 register; no
                such block exists today — verified, none of the 3
                SPEC_NAMED_SVG_BLOCKS members declares `bgSvgContent` and
                none of the 4 bgSvgContent providers is in
                SPEC_NAMED_SVG_BLOCKS). DECISION: no special-case code is
                needed. The union computation below naturally grants such a
                block BOTH provisions — 'svg' (it has its own shape) AND
                'svg-subtree' (a shape is trivially also a subtree) — so it
                would correctly qualify for both `draw` (stroke either/both
                SVGs) and `morph` (rewrite its own shape's `d`). This is the
                intended behaviour, not an accident of the union: a block
                that is genuinely both a shape AND a subtree container has
                no less claim to either effect than a block that is only
                one of the two.
- 'track'    <- DERIVED (2026-07-31) from the block's OWN stylesheet
                (style.css / style.scss): it declares `overflow-x: auto` or
                `overflow-x: scroll` in a rule that is reachable at desktop
                widths. This is the EXACT structural question the runtime
                asks — `fx-draggable.js`'s `isNativeHorizontalScroller()`
                tests `getComputedStyle(el).overflowX` for auto|scroll plus a
                real `scrollWidth > clientWidth` overflow — so deriving the
                roster from the same signal makes adoption automatic for
                every block of that shape, instead of manual.

                Why this replaced the old hand-declared route as the PRIMARY
                one: the mechanism is purely structural and needs no per-block
                code, yet a block only RECEIVED the capability if its
                block.json hand-declared it. Three blocks did. Manual adoption
                of a universal mechanism is precisely what R-31-9 ("universal
                mechanisms, no per-block hyperfocus") forbids by construction.

                PRECEDENCE — additive, declaration cannot subtract:
                  derived-from-CSS  OR  `supports.sgs.fx.draggable === true`
                The declaration is retained as an explicit OPT-IN OVERRIDE for
                a block whose scroller this generator cannot see: built by JS
                at runtime, inherited from a shared/parent stylesheet, or
                composed from a block the file scan does not reach. It can
                only ADD a block to the roster, never remove one — removal is
                what `supports.sgs.fx.providesNatively` is for, and keeping
                exactly one subtraction mechanism means a block's roster is
                never the result of two flags cancelling out.

                DESKTOP-REACHABILITY, and why it is not a tabs carve-out: a
                declaration that lives ONLY inside a narrow-viewport-only
                media query (a `max-width` bound below the 1024px desktop
                breakpoint, with no `min-width` to re-open it) describes a
                scroller that exists at phone widths and nowhere else.
                `fx-draggable.js` is gated behind `(pointer: fine)` and binds
                nothing on a coarse pointer — by design, so touch keeps the
                browser's own momentum scrolling. So a mobile-only scroller
                and a mouse-only effect have an intersection of very nearly
                nothing, and offering the control would put a toggle in the
                inspector that does nothing on the devices that see the
                scroller. This test is a property of the DECLARATION's
                context, applied identically to every block; today it happens
                to exclude `sgs/tabs` (whose `.sgs-tabs__nav` scrolls only
                under `@media (max-width: 599px)`, and only in the vertical
                variant), and it would exclude any future block that grows the
                same shape, with no change here.
- 'item-set' <- block.json `supports.sgs.fx.pairedFilter === true`. Zero
                blocks declare this today either — Flip's roster is honestly
                EMPTY (and Flip's scope='paired' excludes it from this
                generic map anyway — see below).
- 'none'     <- always satisfied (scrub, image-sequence).

A SEPARATE, NON-`requires` TOKEN: 'panel' (follow-up fix, 2026-07-31)
----------------------------------------------------------------------------
'panel' is NOT a `requires` value any `fx_effects` row can hold — it never
appears in the `requires` column and is never matched against an effect's
`requires`. It exists purely to satisfy `compute_map()`'s panel-existence
gate (`if specific or panel_forced:`) on behalf of a block that has NO
`requires`-derivable provision at all but is still a legitimate fx-panel
host by its own declared fact: `supports.sgs.fx.motionSurface === true`
(read in `_block_provisions()` alongside `draggable`/`pairedFilter`).

THE PROBLEM IT SOLVES: `motion-path` and `scrub` both have `requires='none'`
— broadly available WHEREVER a panel already exists, but (deliberately)
unable to CREATE a panel by themselves, because that is exactly what stops
scrub alone putting a panel on all ~80 sgs/* blocks (see the "WHY" comment
on the gate). A block whose ONLY qualifying effects are 'none'-requires ones
therefore gets NO panel under the normal rule — `sgs/decorative-image` is
the block that surfaced this (Spec 38 §2's MotionPath row names it
explicitly as that effect's Inspector target, and §10 cites it as the
reduced-motion reference implementation, yet it has zero text/section/svg/
svg-subtree/track/item-set signal of its own). 'panel' is the block-owned
escape hatch: declare `motionSurface: true`, and the gate treats that
exactly like a real specific-requires match, without adding a fake "panel"
entry to the generated effects list (`panel_forced` is a bare bool, kept
separate from `specific`).

HOW MANY OTHER BLOCKS ARE IN THE SAME LATENT STATE (computed 2026-07-31, via
`_block_provisions()` over every `_load_block_jsons()` entry — recomputable
any time, not a cached figure): of the 83 block.json files under src/blocks,
49 currently resolve ZERO `requires`-derivable provisions — form fields,
nav-menu, tabs, button, etc. All 49 correctly get no panel today, and
continue to unless they come to declare `motionSurface`. Of the blocks that
DO currently have ≥1 provision (and so DO get a panel), **19** have EXACTLY
ONE provision category feeding their `specific` list (13 from 'text':
sgs/counter, sgs/collapsible-text, sgs/heading, sgs/info-box, sgs/label,
sgs/pricing-table, sgs/product-card, sgs/product-faq, sgs/quote,
sgs/team-member, sgs/testimonial, sgs/text, sgs/whatsapp-cta; 6 from 'track':
sgs/before-after, sgs/buybox, sgs/gallery, sgs/google-reviews, sgs/post-grid,
sgs/trustpilot-reviews) — meaning removing that one category (the same shape
of edit that caused this bug) would zero their panel entirely, same as
`sgs/decorative-image` before this fix, UNLESS they also come to declare
`motionSurface` or gain a second provision first. This is NOT a defect to
pre-emptively patch for all 19 — most of them (all 13 'text' blocks) have a
provision that is extremely unlikely to be removed the way `svg` was here
(RichText is core to what those blocks ARE), so treating this as 19 open
bugs would be over-fixing an unproven risk. Read it as "which blocks are
currently a single provision-removal away from this same class of
regression" — a fact worth knowing, not a queue of 19 follow-up tickets.

STRUCTURAL SCOPE GATE (the task's Hard Constraint)
----------------------------------------------------------------------------
Only `fx_effects` rows with scope IN ('block', 'element') are even considered
for this map — 'site' (ScrollSmoother, page-transitions), 'paired' (Flip),
and 'flavour' rows are excluded at the SQL/filter level, before any
block-provision check runs. This is what makes "ScrollSmoother can never
reach a block inspector" a property of the generator's control flow, not a
comment someone could forget to keep true.

A KNOWN DB-VS-BLOCK.JSON GAP (flagged, not silently patched over)
----------------------------------------------------------------------------
`block_composition.container_kind` (DB) has MORE 'section'/'layout' rows than
block.json's `containerKind` support declares (verified: sgs/cta-section had
container_kind='section' in the DB, `is_section_root: true` in block.json,
but NO `containerKind` key at all — the same gap hero/trust-bar do NOT have.
FIXED for cta-section as part of this task, since it is directly the
task's own acceptance check. NOT fixed for the ~12 other DB-only 'layout'
blocks (card-grid, gallery, accordion, tabs, pricing-table, google-reviews,
post-grid, multi-button, form-field-tiles, trustpilot-reviews,
content-collection, adaptive-nav) — none of the current 'block'/'element'-
scope effects require 'item-set' (only Flip does, and Flip is scope='paired',
excluded above), so this gap has ZERO effect on the current output. Flagged
here so it is not silently rediscovered as a "mystery gap" later: if a future
wave adds a 'block'-scope effect with requires='item-set', these block.json
files need their containerKind declared first, or they will wrongly appear
absent from that effect's roster despite being DB-registered layout
composites.

This script reads block.json + edit.js FILES directly (never the SQLite DB)
for block-provision facts — those files are what ships (block.json IS
deployed and readable at runtime; the DB is not, verified: no PHP in this
project opens SQLite). It reads the DB ONLY for `fx_effects.scope`/`requires`
(the effect side), since that table has no block.json equivalent.

OUTPUT (ONE file, deterministic, no timestamps)
----------------------------------------------------------------------------
src/blocks/extensions/generated-fx-qualifying-blocks.json — plain JSON,
`{ "sgs/heading": ["scrub", "split-reveal"], ... }`, imported directly by
fx.js (webpack bundles .json imports natively — no codegen step needed).
No timestamp is emitted: a dirty-always file makes the deploy-gate's dirty
check meaningless.

⛔ Do NOT reinstate a PHP mirror of this map. A previous
includes/generated-fx-qualifying-blocks.php emitted the same data behind
`sgs_get_fx_qualifying_blocks()`; nothing ever required the file and the
function had zero callers, so it regenerated on every run purely to be dead.
Spec 38 recommends deletion. The JSON is the single consumer-facing artefact.

Run: python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"
JSON_OUTPUT = BLOCKS_DIR / "extensions" / "generated-fx-qualifying-blocks.json"

# The retained, documented exception — see module docstring's 'svg' section.
# Spec 38 §2 DrawSVG row, Exposure-surface column, ORIGINALLY cited this
# constant's name verbatim with 4 members. CORRECTED 2026-07-31 (QC pass,
# Motion Wave D register Step 4): `sgs/decorative-image` was REMOVED — its
# render.php was searched (case-insensitively) for every SVG-related surface
# — `svg`, `SVG`, `get_wp_icon`, `get_lucide_icon`, `wp_kses` — and none
# appear; it renders a raster `<img>`/video, never an inline `<svg>`, so it
# has no `d`/path geometry for either DrawSVG or MorphSVG to act on. An
# `<img src="*.svg">` does not count: the browser treats a referenced SVG
# file as an opaque image resource with no DOM access to its internal paths
# (contrast `sgs/responsive-logo`, which deliberately INLINES its SVG via
# `wp_kses` specifically so the paths become real, drawable DOM nodes — see
# that block's own render.php comment). The amendment this implies for Spec
# 38 §2's DrawSVG row is NOT applied here (that file is owned and serialised
# by the register coordinator) — see the amendment text handed back
# alongside this change.
#
# The remaining 3 render their SVG from their OWN render.php, not through
# the container wrapper's `bgSvgContent` layer, so the derived test below
# cannot see them — all 3 verified live: sgs/icon and sgs/responsive-logo
# inline real `<svg>` markup directly; sgs/separator calls the SAME
# `sgs_get_wp_icon()` / `sgs_get_lucide_icon()` helpers sgs/icon uses
# (render.php lines 310/315), conditionally when `contentMode === 'icon'` —
# missed on the first pass because a literal `<svg` text grep does not see
# through a helper-function call. Every OTHER svg-provider is derived from
# `bgSvgContent`.
SPEC_NAMED_SVG_BLOCKS = frozenset({
    "sgs/responsive-logo",
    "sgs/icon",
    "sgs/separator",
})

# The block.json attribute that means "this block renders operator-supplied
# inline <svg> through SGS_Container_Wrapper's `.sgs-container__svg-bg` layer".
SVG_CONTENT_ATTRIBUTE = "bgSvgContent"

# Stylesheet filenames a block may own. Both are read; a block having one, the
# other, or neither is all normal.
BLOCK_STYLESHEETS = ("style.css", "style.scss")

# `overflow-x: auto|scroll` — the exact declaration whose computed value makes
# `scrollLeft` a real, paintable property, which is what
# fx-draggable.js's `isNativeHorizontalScroller()` tests at runtime.
_OVERFLOW_X_SCROLLABLE = re.compile(
    r"overflow-x\s*:\s*(auto|scroll)\b", re.IGNORECASE
)

# The device-tier desktop breakpoint (visual-standards: 1024px). A media query
# capped BELOW this with no `min-width` floor can only ever match a narrow
# viewport. See the module docstring's DESKTOP-REACHABILITY note for why that
# makes a drag-to-scroll control pointless rather than merely rare.
_DESKTOP_BREAKPOINT_PX = 1024

_MEDIA_MAX_WIDTH = re.compile(r"max-width\s*:\s*(\d+(?:\.\d+)?)\s*px", re.IGNORECASE)
_MEDIA_MIN_WIDTH = re.compile(r"min-width\s*:\s*(\d+(?:\.\d+)?)\s*px", re.IGNORECASE)

# sgs/container never declares its own containerKind (nothing wraps it) but
# is the explicit target of pin-scrub's §2 row. See module docstring.
CONTAINER_BLOCK = "sgs/container"

# A second honest hardcoded exception: image-sequence's §2 row target IS the
# new dedicated block itself ("New block `sgs/image-sequence` inspector"),
# NOT "any block" the way requires='none' means for scrub. Modelling this as
# a plain 'none' requirement (as the DB row's `requires` column literally
# says — there is genuinely nothing on the TARGET side to qualify, the
# qualifier is "is this block sgs/image-sequence") would make it appear
# against all ~80 blocks, which contradicts the spec's own framing. This
# exact-match table overrides the requires-based check for named effects
# only; every other effect still resolves purely from block provisions.
EXACT_MATCH_BLOCKS: dict[str, frozenset[str]] = {
    # sgs/image-sequence now EXISTS (src/blocks/image-sequence/block.json,
    # shipped as an AGENCY-ONLY block hidden from the inserter — comment
    # corrected 2026-08-02, register item 4; it previously claimed the
    # directory did not exist, which stopped being true once the block
    # shipped and was never updated).
    "image-sequence": frozenset({"sgs/image-sequence"}),
}

# NOTE on a mechanism that was tried here and REJECTED (2026-07-31, same
# day): a `FORCED_PANEL_HOSTS: dict[str, frozenset[str]]` hardcoded
# effect->block map briefly lived at this exact spot as a follow-up fix for
# the bug described at `_block_provisions()`'s `motionSurface` read (below)
# and at `compute_map()`'s panel gate. It was correctly rejected: it was a
# second hardcoded lookup a block author would never find (R-31-1), and it
# directly contradicted the `providesNatively` precedent two paragraphs
# below it in this same file — "a declaration the block OWNS", not a
# per-block carve-out in the generator. The actual fix lives where every
# other block-owned fx fact lives: `supports.sgs.fx.*` in the block's OWN
# block.json, read by `_block_provisions()` alongside `draggable` and
# `pairedFilter` (see `motionSurface` there), exactly like
# `sgs/decorative-image`'s own declaration now does. Do not reintroduce a
# script-side per-block map for this class of problem — extend the
# `fx_supports` read instead.


def _load_block_jsons() -> dict[str, dict]:
    """block_slug -> parsed block.json contents, for every src/blocks/* block."""
    out: dict[str, dict] = {}
    for path in sorted(BLOCKS_DIR.glob("*/block.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[generate-fx-qualifying-blocks] WARN: could not parse {path}: {exc}", file=sys.stderr)
            continue
        name = data.get("name")
        if name:
            out[name] = data
    return out


def _richtext_blocks() -> set[str]:
    """Blocks whose edit.js imports/uses RichText — the 'text' provision test."""
    found: set[str] = set()
    for edit_js in sorted(BLOCKS_DIR.glob("*/edit.js")):
        try:
            content = edit_js.read_text(encoding="utf-8")
        except OSError:
            continue
        if re.search(r"\bRichText\b", content):
            block_dir = edit_js.parent
            block_json_path = block_dir / "block.json"
            if block_json_path.exists():
                try:
                    name = json.loads(block_json_path.read_text(encoding="utf-8")).get("name")
                except (OSError, json.JSONDecodeError):
                    continue
                if name:
                    found.add(name)
    return found


def _raster_image_blocks() -> set[str]:
    """Blocks that actually RENDER a raster `<img>` — the structural half of
    the 'image' provision test.

    Mirrors `_richtext_blocks()`: a structural fact read straight out of the
    block's own source rather than inferred from a declared capability.

    WHY THIS EXISTS AT ALL, rather than trusting `supports.sgs.imageControls`.
    Project CLAUDE.md mandates that flag on every block rendering an `<img>`,
    so the declaration OUGHT to be sufficient. Measured 2026-08-21, it is not:
    `sgs/media` and `sgs/decorative-image` both render an `<img>` in their
    render.php and edit.js, and NEITHER declares `imageControls`. Deriving
    eligibility from the declaration alone therefore excluded the framework's
    two most obvious image blocks — a scope predicate computed from a field
    that is itself inconsistently applied is self-fulfilling, and it excludes
    exactly the blocks the capability is missing from.

    This is the same correction the 'svg' -> 'svg-subtree' split made (see the
    module docstring): the token widens to the STRUCTURAL fact, and the
    declared flag stays in the union so a block that declares the capability
    without a literal `<img>` (an attachment helper, a background layer) is
    not dropped either.
    """
    found: set[str] = set()
    for block_json_path in sorted(BLOCKS_DIR.glob("*/block.json")):
        block_dir = block_json_path.parent
        renders_image = False
        for source_name in ("render.php", "edit.js"):
            source = block_dir / source_name
            if not source.exists():
                continue
            try:
                content = source.read_text(encoding="utf-8")
            except OSError:
                continue
            # `<img` covers hand-written markup; `wp_get_attachment_image`
            # covers the WordPress helper that emits one on the block's behalf.
            if re.search(r"<img\b", content) or "wp_get_attachment_image" in content:
                renders_image = True
                break
        if not renders_image:
            continue
        try:
            name = json.loads(block_json_path.read_text(encoding="utf-8")).get("name")
        except (OSError, json.JSONDecodeError):
            continue
        if name:
            found.add(name)
    return found


def _is_narrow_viewport_only(condition: str) -> bool:
    """Can this `@media` condition ONLY match a viewport narrower than desktop?

    True when the condition caps width below the 1024px desktop breakpoint and
    sets no `min-width` floor that would re-open it at a wider viewport. A
    condition with both bounds (e.g. `(min-width: 768px) and (max-width:
    1023px)`) is a tablet WINDOW, not a narrow-only ceiling, and still counts
    as reachable — a fine pointer at that width is an ordinary resized desktop
    browser.

    :param condition: The raw text between `@media` and its opening brace.
    :return: True when no desktop-width viewport can match.
    """
    if _MEDIA_MIN_WIDTH.search(condition):
        return False
    return any(
        float(m) < _DESKTOP_BREAKPOINT_PX
        for m in _MEDIA_MAX_WIDTH.findall(condition)
    )


def _has_desktop_reachable_x_scroll(css: str) -> bool:
    """Does this stylesheet declare `overflow-x: auto|scroll` somewhere a
    desktop-width viewport can reach?

    Walks the source once, maintaining a stack of the `@media` conditions
    currently open, so a declaration is judged in the context that actually
    governs it. Plain brace-nesting (including SCSS nesting) pushes a `None`
    frame, which carries no condition and therefore never gates anything.

    Comments are stripped first so a commented-out rule — or a docblock that
    merely MENTIONS the property, which several of these stylesheets do at
    length — can never qualify a block. `//` line comments are stripped only
    for `.scss`; in plain CSS `//` is not a comment and a `url(//host/x)` must
    survive intact.

    :param css: Full stylesheet source, comments included.
    :return: True when at least one qualifying declaration is desktop-reachable.
    """
    media_stack: list[str | None] = []
    index = 0
    length = len(css)

    while index < length:
        char = css[index]

        if char == "@" and css.startswith("@media", index):
            brace = css.find("{", index)
            if brace == -1:
                break
            media_stack.append(css[index + len("@media") : brace])
            index = brace + 1
            continue

        if char == "{":
            media_stack.append(None)
            index += 1
            continue

        if char == "}":
            if media_stack:
                media_stack.pop()
            index += 1
            continue

        if char in "oO" and _OVERFLOW_X_SCROLLABLE.match(css, index):
            reachable = not any(
                _is_narrow_viewport_only(cond)
                for cond in media_stack
                if cond is not None
            )
            if reachable:
                return True
            index += 1
            continue

        index += 1

    return False


def _strip_css_comments(css: str, is_scss: bool) -> str:
    """Remove `/* … */` (and, for SCSS only, `// …`) comments.

    Replaces each comment with a single space rather than deleting it, so two
    tokens separated only by a comment never fuse into one.

    :param css:     Stylesheet source.
    :param is_scss: True to also strip `//` line comments (invalid in plain CSS,
                    where `//` legitimately appears inside `url()`).
    :return: Source with comment bodies removed.
    """
    css = re.sub(r"/\*.*?\*/", " ", css, flags=re.DOTALL)
    if is_scss:
        css = re.sub(r"(?m)//.*$", " ", css)
    return css


def _x_scroll_track_blocks() -> set[str]:
    """Blocks whose OWN stylesheet gives them a desktop-reachable native
    horizontal scroller — the derived 'track' provision.

    Mirrors `_richtext_blocks()`: a structural fact read straight out of the
    files that ship, not a name-matching heuristic and not a hand-kept list.

    :return: Set of block names (e.g. `sgs/gallery`).
    """
    found: set[str] = set()
    for block_dir in sorted(BLOCKS_DIR.glob("*/")):
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        for stylesheet_name in BLOCK_STYLESHEETS:
            stylesheet = block_dir / stylesheet_name
            if not stylesheet.exists():
                continue
            try:
                css = stylesheet.read_text(encoding="utf-8")
            except OSError:
                continue
            css = _strip_css_comments(css, stylesheet_name.endswith(".scss"))
            if not _has_desktop_reachable_x_scroll(css):
                continue
            try:
                name = json.loads(
                    block_json_path.read_text(encoding="utf-8")
                ).get("name")
            except (OSError, json.JSONDecodeError):
                break
            if name:
                found.add(name)
            break
    return found


def _block_provisions(
    block_slug: str,
    block_json: dict,
    richtext_blocks: set[str],
    x_scroll_blocks: set[str],
    raster_image_blocks: set[str],
) -> set[str]:
    """The set of requirement tokens this block satisfies."""
    provisions: set[str] = set()

    sgs_supports = (block_json.get("supports") or {}).get("sgs") or {}
    container_kind = sgs_supports.get("containerKind")
    if container_kind == "section" or block_slug == CONTAINER_BLOCK:
        provisions.add("section")

    if block_slug in richtext_blocks:
        provisions.add("text")

    # 'svg' vs 'svg-subtree' — SPLIT 2026-07-31 (Motion Wave D register
    # Step 4). See the module docstring's "'svg' / 'svg-subtree'" section for
    # the full rationale + the Edge Case decision (a block satisfying both is
    # handled by this union alone, no special-case branch needed).
    #
    # 'svg' — this block's OWN root is shape geometry (the closed, spec-cited
    # 4-name roster only; NOT derivable from bgSvgContent, which is a nested
    # decoration, never the block's own shape).
    is_svg_shape = block_slug in SPEC_NAMED_SVG_BLOCKS
    if is_svg_shape:
        provisions.add("svg")

    # 'svg-subtree' — this block's rendered SUBTREE contains inline SVG
    # somewhere: the 'svg' set above (a shape trivially contains itself) UNION
    # any block that declares the bgSvgContent attribute (a nested decorative
    # SVG layer rendered by SGS_Container_Wrapper).
    if is_svg_shape or SVG_CONTENT_ATTRIBUTE in (block_json.get("attributes") or {}):
        provisions.add("svg-subtree")

    fx_supports = sgs_supports.get("fx") or {}
    # DERIVED (stylesheet declares a desktop-reachable `overflow-x: auto|scroll`)
    # OR the explicit block.json opt-in override. Additive only — see the module
    # docstring's PRECEDENCE note.
    if block_slug in x_scroll_blocks or fx_supports.get("draggable") is True:
        provisions.add("track")
    if fx_supports.get("pairedFilter") is True:
        provisions.add("item-set")

    # 'panel' — supports.sgs.fx.motionSurface (2026-07-31, follow-up fix,
    # same idiom as `draggable`/`pairedFilter` immediately above). MEANS: this
    # block's own root is a legitimate target for broadly-available
    # (`requires='none'`) element/block-scope fx effects, even though it has
    # no text/section/svg/svg-subtree/track/item-set signal of its own —
    # e.g. a purely positioned/decorative surface with no content shape.
    #
    # WHY THIS EXISTS (not a bespoke fix — read `compute_map()`'s `if
    # specific or panel_forced:` gate for the mechanism this feeds): a block
    # whose ONLY qualifying effects are `requires='none'` ones (motion-path,
    # scrub) gets NO panel at all under the normal rule, because a 'none'
    # effect is deliberately never allowed to CREATE a panel by itself (see
    # that gate's own "WHY" comment — this is what stops all ~80 sgs/* blocks
    # acquiring a panel from `scrub` alone). A block with a genuinely
    # spec-cited reason to be a motion target regardless declares
    # `motionSurface: true` itself, exactly the way `sgs/responsive-logo`
    # declares `providesNatively` for the OPPOSITE direction (excluding an
    # effect it already owns natively) — a fact the BLOCK owns, read here,
    # never a slug carve-out in this script (R-31-1/R-31-9). A rejected
    # earlier attempt at this fix (`FORCED_PANEL_HOSTS`, a hardcoded
    # effect->block dict living in this script) is documented and removed at
    # the `EXACT_MATCH_BLOCKS` constant above — read that note before
    # reaching for a script-side map again.
    if fx_supports.get("motionSurface") is True:
        provisions.add("panel")

    # 'surface' — a paintable background a cursor-reactive field can be laid
    # onto (FR-38-25, 2026-08-01). Derived exactly as that FR defines an
    # EMITTER: a block with `containerKind` set (ANY value — layout and content
    # containers paint backgrounds just as section ones do), or a block
    # declaring a background-image attribute.
    #
    # Deliberately NOT reusing 'section': that token is `containerKind ==
    # 'section'` only, which would miss sgs/info-box, sgs/testimonial and
    # friends — blocks with a perfectly good background to paint on. Two
    # different questions, so two tokens.
    #
    # The PARTICIPANT half of FR-38-25 needs nothing here: participants carry no
    # control and are detected at RUNTIME by computed background (the fact that
    # actually decides occlusion), never from a declared capability.
    if container_kind or any(
        attr_name.startswith("backgroundImage")
        for attr_name in (block_json.get("attributes") or {})
    ):
        provisions.add("surface")

    # 'image' — the surface-treatment effect's target (Tier W, D479/D555 build).
    # This project MANDATES `supports.sgs.imageControls: true` on every block
    # that renders an `<img>` (project CLAUDE.md "Image controls discipline"),
    # so that flag is the ground-truth signal for "this block has a real image
    # to shade" — the SAME idiom as 'section' above (read a supports.sgs.*
    # flag the block already carries), never a hardcoded block-name roster
    # (R-31-1). Verified live before writing this: 15 of 83 blocks declare
    # `imageControls`, 7 with it set `true` (consistency/golden-controls.json
    # note above) — before-after, card-grid, and others.
    # UNION, not the declaration alone — see `_raster_image_blocks()` for why
    # the declared flag is necessary but NOT sufficient here (sgs/media and
    # sgs/decorative-image render an `<img>` and declare nothing).
    if sgs_supports.get("imageControls") is True or block_slug in raster_image_blocks:
        provisions.add("image")

    return provisions


def _load_qualifying_effects() -> list[tuple[str, str, int]]:
    """(effect, requires, creates_panel) triples for every fx_effects row with
    a block-panel scope. Reads the DB — legitimate here because this is a
    BUILD-time generator (same shape as generate-fx-effects-php.py), and the DB
    is the only home for scope/requires/creates_panel (no block.json
    equivalent — those columns describe the EFFECT, not any one block)."""
    if not DB_PATH.exists():
        print(f"[generate-fx-qualifying-blocks] DB not found: {DB_PATH}", file=sys.stderr)
        raise SystemExit(1)
    con = sqlite3.connect(str(DB_PATH))
    try:
        if not con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fx_effects'"
        ).fetchone():
            print(
                "[generate-fx-qualifying-blocks] fx_effects table not found — run "
                "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first.",
                file=sys.stderr,
            )
            raise SystemExit(1)
        # `creates_panel` was added by the FR-38-25 change. A DB that has not
        # yet been reseeded has the table without the column, and SELECTing it
        # would be a hard error at BUILD time — so read it only when present
        # and default to 1, which is exactly the pre-FR-38-25 behaviour.
        has_creates_panel = any(
            row[1] == "creates_panel"
            for row in con.execute("PRAGMA table_info(fx_effects)").fetchall()
        )
        column = "creates_panel" if has_creates_panel else "1"
        rows = con.execute(
            f"SELECT effect, requires, {column} FROM fx_effects "
            "WHERE scope IN ('block', 'element') ORDER BY effect"
        ).fetchall()
    finally:
        con.close()
    return [(effect, requires, int(creates)) for effect, requires, creates in rows]


def compute_map() -> dict[str, list[str]]:
    """Compute the full block -> sorted qualifying-effects map. Pure function
    (no I/O side effects besides the DB read) so the gate can call it and
    diff against the shipped artefacts without re-running the generator's
    file-write path."""
    block_jsons = _load_block_jsons()
    richtext_blocks = _richtext_blocks()
    x_scroll_blocks = _x_scroll_track_blocks()
    raster_image_blocks = _raster_image_blocks()
    qualifying_effects = _load_qualifying_effects()

    result: dict[str, list[str]] = {}
    for block_slug, block_json in block_jsons.items():
        # Declarative per-block opt-out (supports.sgs.hideExtensions: ["fx"]).
        #
        # The editor already honours this at runtime via isExtensionHidden(), so
        # omitting it here would not put a panel on an opted-out block — but it
        # WOULD leave the generated map claiming blocks that never get one, and
        # a map that disagrees with the runtime is a map nobody can trust (the
        # PHP consumer reads the same file). Filtering here keeps the artefact
        # truthful for every consumer.
        #
        # This is the sanctioned exception route: `container_kind='section'` is
        # necessary but NOT sufficient — site chrome (site-header/footer,
        # mega-panel), overlays (modal), form fields and inner child blocks are
        # all structurally section- or text-shaped while being meaningless
        # scroll-effect targets. Each declares the opt-out in its OWN block.json
        # rather than appearing in a dict here (R-31-1), exactly as animation.js
        # does since its hardcoded denylist was retired.
        hidden = (
            block_json.get("supports", {}).get("sgs", {}).get("hideExtensions") or []
        )
        if "fx" in hidden:
            continue

        provisions = _block_provisions(
            block_slug, block_json, richtext_blocks, x_scroll_blocks, raster_image_blocks
        )

        # PASS 1 — effects with a SPECIFIC target requirement. These are what
        # decide whether a block gets the fx panel at all.
        specific = []
        # PASS 2 candidates — effects that require nothing in particular.
        permissive = []

        for effect, requires, creates_panel in qualifying_effects:
            if effect in EXACT_MATCH_BLOCKS:
                if block_slug in EXACT_MATCH_BLOCKS[effect]:
                    specific.append(effect)
                continue
            if requires == "none":
                permissive.append(effect)
            elif requires in provisions:
                # THE THIRD CLASS (FR-38-25). An effect with a genuinely
                # specific requirement that must still never CREATE a panel.
                #
                # `cursor-field` is the case: it is inert on a block with no
                # paintable background (so it cannot be requires='none', which
                # QA Gate A would fail as an inert control), but letting it
                # create panels was MEASURED to add a brand-new fx panel to 11
                # blocks — sgs/nav-menu, sgs/site-header, sgs/site-footer,
                # sgs/form among them — each of which would then also inherit
                # motion-path and scrub through `permissive`. That is the "13
                # panels where none makes sense" failure, arriving by a new route.
                #
                # Landing it in `permissive` gets both halves right: it is
                # offered wherever the panel already exists AND on nothing else.
                if creates_panel:
                    specific.append(effect)
                else:
                    permissive.append(effect)

        # 'panel' — a BLOCK-OWNED opt-in (supports.sgs.fx.motionSurface, read
        # in `_block_provisions()` alongside `draggable`/`pairedFilter`), NOT
        # an effect name. It is deliberately kept OUT of `specific` (which is
        # spread into `offered` below and would otherwise leak a fake "panel"
        # entry into the generated roster as if it were a real effect) —
        # instead it satisfies the panel-existence GATE on its own line,
        # exactly like a real specific-requires match would, for a block that
        # has no derivable structural provision at all but is still a
        # legitimate host per its own declared fact.
        panel_forced = "panel" in provisions

        # A `requires='none'` effect adds NO BLOCK OF ITS OWN — it is offered
        # wherever the panel already exists, and never creates the panel.
        #
        # WHY (this was got wrong once, so the reasoning is recorded):
        # Spec 38 §2's last column is headed "Recommended → permitted" — a
        # TRAJECTORY, not a requirement. `scrub`'s entry reads "Any block → any
        # element WITH THE FX PANEL EXPOSED", and its authoritative Level column
        # says `block/element`. Treating "any block" as a present-tense
        # requirement put the panel on all 81 sgs/* blocks — nav menus, form
        # fields, separators, icons — which is both the permitted CEILING read as
        # the day-one default, and the "13 panels where none makes sense"
        # containment failure this project treats as a defect in its own right.
        #
        # The qualifier "with the fx panel exposed" is the operative clause: the
        # effect's availability is CONDITIONAL on the panel existing, so it
        # cannot be the thing that justifies the panel.
        #
        # `panel_forced` (see above) is the ONE other thing allowed to satisfy
        # this gate: a block-owned declaration (`supports.sgs.fx.
        # motionSurface`), not a 'none'-requires effect and not a script-side
        # per-block list. It still only WIDENS which blocks get a panel; it
        # never widens which EFFECTS a block with no specific match receives
        # (`offered` below is still `specific + permissive`, and `specific`
        # contains real effect names only — `panel_forced` is a bool, not an
        # entry in that list).
        if specific or panel_forced:
            offered = sorted(specific + permissive)

            # NATIVE-CAPABILITY EXCLUSION (added 2026-07-31, Wave C).
            #
            # A block may ALREADY expose an fx capability through its own
            # dedicated control, in which case offering the same capability
            # again in the generic "Scroll & effects" picker would put TWO
            # controls for ONE capability on that block — which this codebase
            # bans (HC2 / the duplicate-control gate).
            #
            # The live case: `sgs/responsive-logo` owns stroke-draw through its
            # `animationStyle` enum (draw-on-load | hover-redraw |
            # scroll-trigger), which FR-38-15 keeps byte-identical across the
            # Vivus -> DrawSVG runtime swap. The other three SVG-bearing blocks
            # (icon / separator / decorative-image) genuinely DO want `draw`
            # from the picker, so a blanket "drop draw" would be wrong too.
            #
            # This is expressed as a DECLARATION THE BLOCK OWNS
            # (`supports.sgs.fx.providesNatively`), not a slug carve-out here —
            # `fx.js`'s own comment named that as the required shape of the fix,
            # and R-31-1 forbids a hardcoded per-block dict in a pipeline
            # script. Any future block that natively owns an fx capability
            # declares it the same way and needs no change to this generator.
            natively_provided = set(
                block_json.get("supports", {})
                .get("sgs", {})
                .get("fx", {})
                .get("providesNatively", [])
            )
            if natively_provided:
                offered = [e for e in offered if e not in natively_provided]

            # Guard: if the exclusion emptied the roster, the block should not
            # get an fx panel at all rather than an empty picker.
            if offered:
                result[block_slug] = offered

    return result


def _php_string_literal(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def _render_json(fx_map: dict[str, list[str]]) -> str:
    """Pure function mirroring `_write_json`'s bytes, without touching disk —
    lets `--check` diff in memory (same shape as generate-fx-effects-php.py)."""
    return json.dumps(fx_map, indent="\t", sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Compute the map in memory and diff against the committed "
            "generated-fx-qualifying-blocks.json instead of writing. "
            "Exits 0 if they match, 1 (naming the file) if the committed "
            "artefact is stale. Never writes to disk."
        ),
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        # Deliberately unversioned — see .claude/dev-setup.md "sgs-framework.db".
        # Both the plain run and --check skip cleanly: with no DB there is
        # nothing to regenerate FROM, so the committed artefacts (already in
        # the repo) are simply left as the build input, exactly as intended.
        # (Mirrors generate-fx-effects-php.py's --check contract — see its
        # own main() for the same pattern.)
        print(
            f"[generate-fx-qualifying-blocks] DB not found: {DB_PATH} — skipping "
            "(building off committed generated artefacts; see .claude/dev-setup.md)."
        )
        return 0

    fx_map = compute_map()
    json_source = _render_json(fx_map)

    if args.check:
        stale = []
        if not JSON_OUTPUT.exists() or JSON_OUTPUT.read_text(encoding="utf-8") != json_source:
            stale.append(str(JSON_OUTPUT))
        if stale:
            print(
                "[generate-fx-qualifying-blocks] STALE — the committed generated "
                f"artefact(s) below no longer match `fx_effects`/block.json/style.css "
                f"inputs:\n  " + "\n  ".join(stale) +
                "\nRe-run without --check to regenerate, then commit the result: "
                "python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py",
                file=sys.stderr,
            )
            return 1
        print(
            f"[generate-fx-qualifying-blocks] OK — committed artefacts match current "
            f"inputs ({len(fx_map)} qualifying block(s))."
        )
        return 0

    JSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUTPUT.write_text(json_source, encoding="utf-8")
    print(
        f"[generate-fx-qualifying-blocks] Generated {JSON_OUTPUT} "
        f"with {len(fx_map)} qualifying block(s)."
    )
    for block_slug in sorted(fx_map):
        print(f"  {block_slug}: {', '.join(fx_map[block_slug])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
