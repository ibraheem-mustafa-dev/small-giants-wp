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
- 'svg'      <- the block declares a `bgSvgContent` ATTRIBUTE in its own
                block.json (it renders operator-supplied inline `<svg>` markup
                through `SGS_Container_Wrapper`'s `.sgs-container__svg-bg`
                layer — verified at includes/class-sgs-container-wrapper.php,
                which emits `<div class="sgs-container__svg-bg" aria-hidden>
                {svg}</div>`), OR block_slug is one of the 4 blocks §2's
                DrawSVG row NAMES explicitly: sgs/responsive-logo, sgs/icon,
                sgs/separator, sgs/decorative-image.

                The `bgSvgContent` half is DERIVED (2026-07-31) and is the
                primary route. The 4-name half is a RETAINED, documented
                exception to "derive, don't hardcode": those blocks render
                their SVG from their own render.php rather than through the
                wrapper's bgSvg layer, no structural block.json flag or DB
                role unifies them (verified — a `<svg` literal-markup scan
                over-matches wildly, hitting a dozen unrelated blocks that
                only ship chevron/star glyphs), and the spec itself gives a
                closed, named list rather than a detectable rule. Citing the
                spec's own literal roster is not the same failure mode as
                inventing one. The two halves are a UNION: a block qualifies
                on either.
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

OUTPUT (two files, ONE computation, deterministic, no timestamps)
----------------------------------------------------------------------------
1. src/blocks/extensions/generated-fx-qualifying-blocks.json — plain JSON,
   `{ "sgs/heading": ["scrub", "split-reveal"], ... }`, imported directly by
   fx.js (webpack bundles .json imports natively — no codegen step needed).
2. includes/generated-fx-qualifying-blocks.php — the identical map as a PHP
   array behind `sgs_get_fx_qualifying_blocks()`, mirroring
   generate-fx-effects-php.py's shape exactly (same no-timestamp rationale —
   see that file's own comment on why: a dirty-always file makes the
   deploy-gate's dirty check meaningless).

Run: python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py
"""
from __future__ import annotations

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
PHP_OUTPUT = PLUGIN_ROOT / "includes" / "generated-fx-qualifying-blocks.php"

# The retained, documented exception — see module docstring's 'svg' section.
# Spec 38 §2 DrawSVG row, Exposure-surface column, cited verbatim. These four
# render their SVG from their OWN render.php, not through the container
# wrapper's `bgSvgContent` layer, so the derived test below cannot see them.
# Every OTHER svg-provider is derived from `bgSvgContent`.
SPEC_NAMED_SVG_BLOCKS = frozenset({
    "sgs/responsive-logo",
    "sgs/icon",
    "sgs/separator",
    "sgs/decorative-image",
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
    # sgs/image-sequence does not exist yet (verified: no such directory
    # under src/blocks) — so this effect's roster is honestly EMPTY today,
    # by construction, rather than accidentally universal.
    "image-sequence": frozenset(),
}


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
) -> set[str]:
    """The set of requirement tokens this block satisfies."""
    provisions: set[str] = set()

    sgs_supports = (block_json.get("supports") or {}).get("sgs") or {}
    container_kind = sgs_supports.get("containerKind")
    if container_kind == "section" or block_slug == CONTAINER_BLOCK:
        provisions.add("section")

    if block_slug in richtext_blocks:
        provisions.add("text")

    # DERIVED (bgSvgContent attribute) UNION the spec's own named roster.
    if (
        SVG_CONTENT_ATTRIBUTE in (block_json.get("attributes") or {})
        or block_slug in SPEC_NAMED_SVG_BLOCKS
    ):
        provisions.add("svg")

    fx_supports = sgs_supports.get("fx") or {}
    # DERIVED (stylesheet declares a desktop-reachable `overflow-x: auto|scroll`)
    # OR the explicit block.json opt-in override. Additive only — see the module
    # docstring's PRECEDENCE note.
    if block_slug in x_scroll_blocks or fx_supports.get("draggable") is True:
        provisions.add("track")
    if fx_supports.get("pairedFilter") is True:
        provisions.add("item-set")

    return provisions


def _load_qualifying_effects() -> list[tuple[str, str]]:
    """(effect, requires) pairs for every fx_effects row with a block-panel
    scope. Reads the DB — legitimate here because this is a BUILD-time
    generator (same shape as generate-fx-effects-php.py), and the DB is the
    only home for scope/requires (no block.json equivalent — those columns
    describe the EFFECT, not any one block)."""
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
        rows = con.execute(
            "SELECT effect, requires FROM fx_effects WHERE scope IN ('block', 'element') "
            "ORDER BY effect"
        ).fetchall()
    finally:
        con.close()
    return list(rows)


def compute_map() -> dict[str, list[str]]:
    """Compute the full block -> sorted qualifying-effects map. Pure function
    (no I/O side effects besides the DB read) so the gate can call it and
    diff against the shipped artefacts without re-running the generator's
    file-write path."""
    block_jsons = _load_block_jsons()
    richtext_blocks = _richtext_blocks()
    x_scroll_blocks = _x_scroll_track_blocks()
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
            block_slug, block_json, richtext_blocks, x_scroll_blocks
        )

        # PASS 1 — effects with a SPECIFIC target requirement. These are what
        # decide whether a block gets the fx panel at all.
        specific = []
        # PASS 2 candidates — effects that require nothing in particular.
        permissive = []

        for effect, requires in qualifying_effects:
            if effect in EXACT_MATCH_BLOCKS:
                if block_slug in EXACT_MATCH_BLOCKS[effect]:
                    specific.append(effect)
                continue
            if requires == "none":
                permissive.append(effect)
            elif requires in provisions:
                specific.append(effect)

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
        if specific:
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


def _write_json(fx_map: dict[str, list[str]]) -> None:
    JSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # Sorted keys + 1-space item separator for deterministic byte-identical
    # output across runs (matches generate-fx-effects-php.py's determinism
    # rule — a dirty-always file defeats the deploy dirty-gate, D336's own
    # class of bug).
    JSON_OUTPUT.write_text(
        json.dumps(fx_map, indent="\t", sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _write_php(fx_map: dict[str, list[str]]) -> None:
    total_blocks = len(fx_map)
    lines = [
        "<?php",
        "/**",
        " * Auto-generated Spec 38 motion-fx block -> qualifying-effects map — DO NOT EDIT.",
        " *",
        " * Generated from block.json (containerKind / bgSvgContent / fx.draggable /",
        " * fx.pairedFilter / fx.providesNatively), each block's edit.js (RichText",
        " * usage), each block's style.css|style.scss (desktop-reachable",
        " * `overflow-x: auto|scroll`), and the `fx_effects` DB table's scope/requires",
        " * columns by scripts/generate-fx-qualifying-blocks.py. To change these",
        " * values, edit the relevant block.json / stylesheet / seed-motion-fx-",
        " * registry.py, then re-run this generator.",
        " *",
        f" * Blocks with at least one qualifying effect: {total_blocks}",
        " *",
        " * Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2 + §7.",
        " *",
        " * Auto-generated — exempt from the 300-line limit.",
        " *",
        " * @package SGS\\Blocks",
        " */",
        "",
        "defined( 'ABSPATH' ) || exit;",
        "",
        "/**",
        " * Return the Spec 38 fx block -> qualifying-effects map.",
        " *",
        " * Keyed by block name (e.g. `sgs/heading`). Each value is the list of",
        " * `data-sgs-fx` grammar values (Spec 38 §11.2) that block structurally",
        " * qualifies for — an effect whose `fx_effects.scope` is 'site', 'paired',",
        " * or 'flavour' NEVER appears here, by construction (see the generator's",
        " * module docstring \"STRUCTURAL SCOPE GATE\").",
        " *",
        " * Uses a static variable so the array is only built once per request.",
        " *",
        " * @return array<string,string[]>",
        " */",
        "function sgs_get_fx_qualifying_blocks() {",
        "\tstatic $map = null;",
        "\tif ( null === $map ) {",
        "\t\t$map = array(",
    ]
    for block_slug in sorted(fx_map):
        effects = fx_map[block_slug]
        effects_php = ", ".join(_php_string_literal(e) for e in effects)
        lines.append(f"\t\t\t{_php_string_literal(block_slug)} => array( {effects_php} ),")
    lines.extend([
        "\t\t);",
        "\t}",
        "\treturn $map;",
        "}",
        "",
    ])
    PHP_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PHP_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    fx_map = compute_map()
    _write_json(fx_map)
    _write_php(fx_map)
    print(
        f"[generate-fx-qualifying-blocks] Generated {JSON_OUTPUT} and {PHP_OUTPUT} "
        f"with {len(fx_map)} qualifying block(s)."
    )
    for block_slug in sorted(fx_map):
        print(f"  {block_slug}: {', '.join(fx_map[block_slug])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
