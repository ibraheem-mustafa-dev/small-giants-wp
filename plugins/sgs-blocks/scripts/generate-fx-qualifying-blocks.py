#!/usr/bin/env python3
"""generate-fx-qualifying-blocks.py: derives the block -> offered-effects map for the Effects panel.

Spec: .claude/specs/38-SGS-MOTION-SYSTEM.md section 2 (placement taxonomy) and section 7 (inspector panel).

Reads
- The effect side, from `sgs-framework.db` (`$SGS_FRAMEWORK_DB` overrides the path) via `_load_qualifying_effects`: `fx_effects.effect` and `fx_effects.requires` for rows whose `scope` is `block` or `element`. Rows of any other scope (site, paired, flavour) never reach a block panel.
- The block side, from the shipped files only (never the DB): each block's `block.json`, its `edit.js`, its `style.css` / `style.scss` and its `*.php`.

Requirement tokens (`_block_provisions` derives the set a block provides; an effect is offered when its `requires` is in that set)
- `none`: always met. Never makes a block a host by itself.
- `section`: `supports.sgs.containerKind` is `section`, or the block is `CONTAINER_BLOCK`.
- `text`: `_richtext_blocks`, the block's edit.js uses RichText.
- `svg`: the block's own root renders shape geometry. This is the retained named-list exception, `SPEC_NAMED_SVG_BLOCKS`: those blocks render SVG through helper calls or sanitised inlining in their own render.php, no block.json flag or DB role marks them, and a `<svg` text scan both over- and under-matches.
- `svg-subtree`: `svg`, or the block declares the `SVG_CONTENT_ATTRIBUTE` attribute (an inline SVG layer from `SGS_Container_Wrapper`).
- `track`: `_x_scroll_track_blocks`, the block's stylesheet declares `overflow-x: auto|scroll` reachable at desktop widths (a rule bounded to narrow viewports only does not count), or `supports.sgs.fx.draggable` is true. The declaration only adds; `supports.sgs.fx.providesNatively` is the one subtraction.
- `marquee-track`: `_marquee_track_blocks`, a `*.php` of the block prints `MARQUEE_SET_HOOK`.
- `item-set`: `supports.sgs.fx.pairedFilter` is true.
- `surface`: `supports.sgs.containerKind` is set to any value, or a `backgroundImage*` attribute exists.
- `image`: `supports.sgs.imageControls` is true, or `_raster_image_blocks` finds a rendered raster image.
- `panel` is not a `requires` value. `supports.sgs.fx.motionSurface` true provides it, which makes the block a host without any specific requirement.

Offer rules (`compute_map`)
- A block with `supports.sgs.hideExtensions` containing `fx` gets nothing.
- An effect named in `EXACT_MATCH_BLOCKS` is offered only on the listed blocks and counts as a specific match there.
- A block is a host when it meets a specific requirement or provides `panel`. A host is offered every `none` effect and every effect whose requirement is in `EXTENDS_ONLY_REQUIREMENTS` (`surface`, `image`) that it meets. Those requirements are met by nearly every block, so they extend a host and never create one.
- Then `supports.sgs.fx.providesNatively` effects are removed, and `ROOT_SCROLL_EFFECTS` are removed unless the root scrolls (`_root_scroll_blocks`) or `supports.sgs.fx.draggable` is true. A block left with no effects is omitted.

Output
- `src/blocks/extensions/generated-fx-qualifying-blocks.json`: `{ "sgs/heading": ["scrub", ...], ... }`, sorted, tab-indented, no timestamp (`_render_json`).
- Consumers: the editor (`src/blocks/extensions/motion/effect-options.js`) for which effects the panel lists, and `scripts/db-consistency/check_fx_qualifying_blocks_stale.py` for staleness. The JSON is the only artefact.

Modes
- No flag: write the JSON.
- `--check`: compute in memory, exit 1 naming the file when the committed JSON differs.
- `--self-test`: `self_test` asserts every marquee-hook block is offered `marquee` and no other block is; that blocks with only paint provisions are not hosts; and, by mutating `EXTENDS_ONLY_REQUIREMENTS` to empty, that the paint-only control can go red.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# $SGS_FRAMEWORK_DB points a run at a copy of the framework DB.
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
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

# Effects that attach to the block ROOT element and boot only when that element is itself the native horizontal
# scroller (fx-draggable.js::initDraggable asks `isNativeHorizontalScroller( el )` of the marked root and never looks
# for a scroller inside it). Offering one on a block whose scrolling sits on a child (`.sgs-timeline__list`) would put a
# control in the panel that boots nowhere, so these need the block's ROOT rule to scroll (`_root_scroll_blocks`), or the
# block's own `supports.sgs.fx.draggable: true` opt-in, on top of the 'track' provision.
ROOT_SCROLL_EFFECTS: frozenset[str] = frozenset({"draggable"})

# Requirements any block with a paintable box or an <img> meets. An effect that needs one of these is offered on a block
# that already has the Effects panel for another reason (a structural requirement it meets, or `motionSurface`); it never
# makes a block a host by itself. Measured: letting `surface` do so put cursor-field, grid-dots and the other
# background fields on site-header-row, site-footer-row, nav-bar-menu, nav-drawer and form.
EXTENDS_ONLY_REQUIREMENTS: frozenset[str] = frozenset({"surface", "image"})

# NOTE on a mechanism that was tried here and REJECTED (2026-07-31, same
# day): a `FORCED_PANEL_HOSTS: dict[str, frozenset[str]]` hardcoded
# effect->block map briefly lived at this exact spot as a follow-up fix for
# the bug described at `_block_provisions()`'s `motionSurface` read (below)
# and at `compute_map()`'s panel gate. It was correctly rejected: it was a
# second hardcoded lookup a block author would never find (FP-1), and it
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
    """Blocks whose editor code imports/uses RichText — the 'text' provision test.

    Reads every editor module in the block folder, not only edit.js: a block that
    moves its RichText fields into a sibling component (to keep edit.js under the
    file-length budget) still edits text. Checking edit.js alone once silently
    dropped every effect from sgs/whatsapp-cta. Front-end and serialisation
    modules (view.js, save.js, deprecated.js) are not editor code and are skipped.
    """
    found: set[str] = set()
    skip = {"view.js", "save.js", "deprecated.js"}
    for edit_js in sorted(BLOCKS_DIR.glob("*/edit.js")):
        content = ""
        for module in sorted(edit_js.parent.glob("*.js")):
            if module.name in skip:
                continue
            try:
                content += module.read_text(encoding="utf-8") + "\n"
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
        # Every PHP file in the block folder (render.php requires its partials from
        # there, e.g. buybox/gallery-col.php) plus edit.js. Inspector components are
        # not read: an <img> there is a settings thumbnail, not the block's output.
        sources = sorted(block_dir.rglob("*.php")) + [block_dir / "edit.js"]
        for source in sources:
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


def _root_scroll_selector_hit( css: str, root_classes: tuple[str, ...] ) -> bool:
    """Does a desktop-reachable `overflow-x: auto|scroll` sit on a rule whose selector is the block's ROOT class?

    Walks the stylesheet once with a stack of the selectors (and `@media` conditions) currently open. A declaration
    counts when its innermost rule's selector list names a root class on its own (`.sgs-timeline`,
    `.wp-block-sgs-timeline`, optionally with modifier classes or `&`) and not a descendant (`.sgs-timeline__list`,
    `.sgs-timeline .x`, `&__list`).

    :param css:          Stylesheet source with comments already stripped.
    :param root_classes: The block's root class names, without the dot.
    :return: True when the root element itself scrolls sideways on a desktop-width viewport.
    """
    root_re = re.compile(
        r"^(?:\.(?:" + "|".join(re.escape(c) for c in root_classes) + r"))(?:\.[\w-]+)*$|^&(?:\.[\w-]+)*$"
    )
    stack: list[tuple[str, bool]] = []
    start = 0
    for index, char in enumerate(css):
        if char == "{":
            head = css[start:index].strip()
            is_media = head.startswith("@")
            stack.append((head, is_media))
            start = index + 1
        elif char == "}":
            if stack:
                stack.pop()
            start = index + 1
        elif char == ";":
            decl = css[start:index + 1]
            start = index + 1
            if not _OVERFLOW_X_SCROLLABLE.search(decl) or not stack:
                continue
            rules = [(h, m) for h, m in stack if not m]
            medias = [h[len("@media"):] for h, m in stack if m and h.startswith("@media")]
            if not rules or any(_is_narrow_viewport_only(c) for c in medias):
                continue
            innermost = rules[-1][0]
            selectors = [s.strip() for s in innermost.split(",") if s.strip()]
            top_level = len(rules) == 1 or innermost.startswith("&")
            if top_level and any(root_re.match(s) for s in selectors):
                return True
    return False


def _root_scroll_blocks() -> set[str]:
    """Blocks whose own stylesheet makes the block ROOT a desktop-reachable native horizontal scroller.

    The stricter sibling of `_x_scroll_track_blocks()` (which also counts a scrolling child): the question
    fx-draggable.js asks of the element carrying the marker, which is always the block root.

    :return: Set of block names.
    """
    found: set[str] = set()
    for block_dir in sorted(BLOCKS_DIR.glob("*/")):
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        try:
            name = json.loads(block_json_path.read_text(encoding="utf-8")).get("name")
        except (OSError, json.JSONDecodeError):
            continue
        if not name or "/" not in name:
            continue
        slug = name.split("/", 1)[1]
        classes = (f"sgs-{slug}", f"wp-block-sgs-{slug}")
        for stylesheet_name in BLOCK_STYLESHEETS:
            stylesheet = block_dir / stylesheet_name
            if not stylesheet.exists():
                continue
            try:
                css = stylesheet.read_text(encoding="utf-8")
            except OSError:
                continue
            css = _strip_css_comments(css, stylesheet_name.endswith(".scss"))
            if _root_scroll_selector_hit(css, classes):
                found.add(name)
                break
    return found


MARQUEE_SET_HOOK = "data-sgs-marquee-set"


def _marquee_track_blocks() -> set[str]:
    """Blocks whose own *.php prints the marquee set hook (`data-sgs-marquee-set`), the markup
    src/shared/effects/fx-marquee.js clones and animates (Spec 38A FR-38A-44, M5.15): the derived 'marquee-track'
    provision. Read from the markup that ships, never a hand-kept list. Its own token rather than 'track', so the
    marquee blocks do not also qualify for draggable and carousel-loop.

    :return: Set of block names.
    """
    found: set[str] = set()
    for block_dir in sorted(BLOCKS_DIR.glob("*/")):
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        if not any(MARQUEE_SET_HOOK in p.read_text(encoding="utf-8") for p in sorted(block_dir.glob("*.php"))):
            continue
        try:
            name = json.loads(block_json_path.read_text(encoding="utf-8")).get("name")
        except (OSError, json.JSONDecodeError):
            continue
        if name:
            found.add(name)
    return found


def _block_provisions(
    block_slug: str,
    block_json: dict,
    richtext_blocks: set[str],
    x_scroll_blocks: set[str],
    raster_image_blocks: set[str],
    marquee_blocks: frozenset[str] | set[str] = frozenset(),
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
    if block_slug in marquee_blocks:
        provisions.add("marquee-track")

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
    # never a slug carve-out in this script (FP-1/FP-9). A rejected
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
    # that renders an `<img>` (.claude/rules/block-authoring.md's image-controls rule),
    # so that flag is the ground-truth signal for "this block has a real image
    # to shade" — the SAME idiom as 'section' above (read a supports.sgs.*
    # flag the block already carries), never a hardcoded block-name roster
    # (FP-1). Verified live before writing this: 15 of 83 blocks declare
    # `imageControls`, 7 with it set `true` (consistency/golden-controls.json
    # note above) — before-after, card-grid, and others.
    # UNION, not the declaration alone — see `_raster_image_blocks()` for why
    # the declared flag is necessary but NOT sufficient here (sgs/media and
    # sgs/decorative-image render an `<img>` and declare nothing).
    if sgs_supports.get("imageControls") is True or block_slug in raster_image_blocks:
        provisions.add("image")

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
            "SELECT effect, requires FROM fx_effects "
            "WHERE scope IN ('block', 'element') ORDER BY effect"
        ).fetchall()
    finally:
        con.close()
    return [(effect, requires) for effect, requires in rows]


def compute_map() -> dict[str, list[str]]:
    """Compute the full block -> sorted qualifying-effects map. Pure function
    (no I/O side effects besides the DB read) so the gate can call it and
    diff against the shipped artefacts without re-running the generator's
    file-write path."""
    block_jsons = _load_block_jsons()
    richtext_blocks = _richtext_blocks()
    x_scroll_blocks = _x_scroll_track_blocks()
    root_scroll_blocks = _root_scroll_blocks()
    raster_image_blocks = _raster_image_blocks()
    marquee_blocks = _marquee_track_blocks()
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
        # rather than appearing in a dict here (FP-1), exactly as the
        # universal extensions do.
        hidden = (
            block_json.get("supports", {}).get("sgs", {}).get("hideExtensions") or []
        )
        if "fx" in hidden:
            continue

        provisions = _block_provisions(
            block_slug, block_json, richtext_blocks, x_scroll_blocks, raster_image_blocks, marquee_blocks
        )

        # PASS 1 — effects with a SPECIFIC structural requirement the block meets. These decide whether a block is a
        # host of the Effects panel's block-level effects.
        specific = []
        # PASS 2 candidates — effects that require nothing in particular.
        permissive = []
        # Effects that need a paintable box or an <img>: offered where the block is already a host.
        extends_only = []

        for effect, requires in qualifying_effects:
            if effect in EXACT_MATCH_BLOCKS:
                if block_slug in EXACT_MATCH_BLOCKS[effect]:
                    specific.append(effect)
                continue
            if requires == "none":
                permissive.append(effect)
            elif requires in provisions:
                (extends_only if requires in EXTENDS_ONLY_REQUIREMENTS else specific).append(effect)

        # 'panel' — a block-owned opt-in (supports.sgs.fx.motionSurface, read in `_block_provisions()`), not an effect
        # name. It makes the block a host without adding a fake entry to `specific`.
        panel_forced = "panel" in provisions

        # A block is a HOST of the Effects panel's block-level effects when it meets a specific structural requirement
        # (`specific`) or declares `motionSurface`. A host is offered every `requires='none'` effect (`permissive`) and
        # every paint-requirement effect it meets (`extends_only`). A `requires='none'` effect never makes a block a
        # host by itself: that put the effects on all 81 sgs/* blocks, nav menus, form fields and separators included.
        # A paint requirement (`surface`, `image`) is met by nearly every block, so it never makes a block a host
        # either (EXTENDS_ONLY_REQUIREMENTS). Every other requirement is a structural fact (a marquee track, a
        # scroller, inline SVG, text, a section), and a block that has it gets the effect that needs it.
        if specific or panel_forced:
            offered = sorted(specific + permissive + extends_only)

            # NATIVE-CAPABILITY EXCLUSION (added 2026-07-31, Wave C).
            #
            # A block may ALREADY expose an fx capability through its own
            # dedicated control, in which case offering the same capability
            # again in the generic "Scroll & effects" picker would put TWO
            # controls for ONE capability on that block — which this codebase
            # bans (HC2 / the duplicate-control gate).
            #
            # The live case: `sgs/responsive-logo` owns stroke-draw through its
            # stroke-draw style enum (draw-on-load | hover-redraw |
            # scroll-trigger), which FR-38-15 keeps byte-identical across the
            # Vivus -> DrawSVG runtime swap. The other three SVG-bearing blocks
            # (icon / separator / decorative-image) genuinely DO want `draw`
            # from the picker, so a blanket "drop draw" would be wrong too.
            #
            # This is expressed as a DECLARATION THE BLOCK OWNS
            # (`supports.sgs.fx.providesNatively`), not a slug carve-out here —
            # FP-1 forbids a hardcoded per-block dict in a pipeline
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

            # ROOT-SCROLL EXCLUSION. An effect in ROOT_SCROLL_EFFECTS boots only on a block whose ROOT is the scroller.
            # It is removed from the OFFERED list here, after the panel gate above, so a block keeps the panel and
            # every other effect it already has; only the effect that cannot boot on it is withdrawn.
            fx_declared = block_json.get("supports", {}).get("sgs", {}).get("fx") or {}
            if block_slug not in root_scroll_blocks and fx_declared.get("draggable") is not True:
                offered = [e for e in offered if e not in ROOT_SCROLL_EFFECTS]

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


def self_test() -> int:
    """Assert the derived map against facts the tree itself states. Needs the DB.

    Positive: every block whose render prints the marquee hook is offered `marquee`. Negative controls: a block that
    prints no marquee hook is not offered it, and a paint-only block (a `surface` provision and nothing structural)
    is not made a host by a `surface` effect."""
    fx_map = compute_map()
    failures = []
    marquee_blocks = _marquee_track_blocks()
    for name in sorted(marquee_blocks):
        hidden = _load_block_jsons()[name].get("supports", {}).get("sgs", {}).get("hideExtensions") or []
        if "fx" not in hidden and "marquee" not in fx_map.get(name, []):
            failures.append(f"{name} prints the marquee hook but is not offered marquee")
    if "sgs/brand-strip" not in marquee_blocks or "marquee" not in fx_map.get("sgs/brand-strip", []):
        failures.append("sgs/brand-strip must be offered marquee")
    for name, effects in fx_map.items():
        if name not in marquee_blocks and "marquee" in effects:
            failures.append(f"{name} has no marquee hook yet is offered marquee")
    # Paint-only negative control: blocks whose provisions are only surface/image, with no motionSurface (so no `panel`),
    # no fx opt-out and no exact-match listing, must not be hosts. The set is derived from the blocks' own provisions, not
    # from the map under test.
    exact_hosts = {b for blocks in EXACT_MATCH_BLOCKS.values() for b in blocks}
    paint_only = sorted(
        n for n, j in _load_block_jsons().items()
        if "fx" not in (j.get("supports", {}).get("sgs", {}).get("hideExtensions") or [])
        and n not in exact_hosts
        and (provisions := _block_provisions(
            n, j, _richtext_blocks(), _x_scroll_track_blocks(), _raster_image_blocks(), marquee_blocks
        ))
        and provisions <= EXTENDS_ONLY_REQUIREMENTS
    )
    if not paint_only:
        failures.append("negative control vacuous: no block has only surface/image provisions")
    for name in paint_only:
        if name in fx_map:
            failures.append(f"{name} has only paint provisions and no motionSurface but became a host")
    # Mutant: let paint requirements create hosts. The control must go red, proving it can fail.
    real = EXTENDS_ONLY_REQUIREMENTS
    globals()['EXTENDS_ONLY_REQUIREMENTS'] = frozenset()
    try:
        mutant_map = compute_map()
    finally:
        globals()['EXTENDS_ONLY_REQUIREMENTS'] = real
    if not any(n in mutant_map for n in paint_only):
        failures.append("mutant survived: letting paint requirements create hosts did not make any paint-only block a host")
    for failure in failures:
        print(f"[generate-fx-qualifying-blocks] SELF-TEST FAIL: {failure}", file=sys.stderr)
    if not failures:
        print(f"[generate-fx-qualifying-blocks] self-test OK ({len(marquee_blocks)} marquee block(s), {len(paint_only)} paint-only block(s) left out)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true", help="Assert the derived map (marquee positive and negative controls).")
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
    if args.self_test:
        return self_test()

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
    JSON_OUTPUT.write_text(json_source, encoding="utf-8", newline="\n")
    print(
        f"[generate-fx-qualifying-blocks] Generated {JSON_OUTPUT} "
        f"with {len(fx_map)} qualifying block(s)."
    )
    for block_slug in sorted(fx_map):
        print(f"  {block_slug}: {', '.join(fx_map[block_slug])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
