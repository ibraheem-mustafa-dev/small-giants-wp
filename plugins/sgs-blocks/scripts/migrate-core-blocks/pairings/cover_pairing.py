#!/usr/bin/env python3
"""core/cover → sgs/hero transformer (Track C pairing module).

GROUND-TRUTH (read 2026-07-16, live source + the one real safe-zone instance
theme/sgs-theme/patterns/hero-video-background.php):

  - core/cover schema (WP core wp-includes/blocks/cover/block.json, read from
    a live install): url/id/alt (media), useFeaturedImage, hasParallax,
    isRepeated, dimRatio (number, default 100), overlayColor/customOverlayColor/
    isUserOverlayColor, backgroundType (default 'image'), focalPoint, minHeight
    (number) + minHeightUnit, gradient/customGradient, contentPosition, isDark
    (default true), templateLock, tagName (default 'div'), sizeSlug, poster.
    supports: align:true, spacing.padding + spacing.margin:[top,bottom] +
    blockGap, color.text/heading (not background), typography (fontSize/
    lineHeight/fontFamily/fontWeight/fontStyle/textTransform/textDecoration/
    letterSpacing), border.

  - sgs/hero/block.json (read 2026-07-16): headline/subHeadline/label/
    ctaPrimary*/ctaSecondary* are STILL declared as scalar attrs but render.php
    says (its own header comment, FR-22-6/R-22-14) they are "NO LONGER read
    here" / "deliberately NOT read" / "no fallback" — kept only for
    deprecated.js back-compat (which this framework has since deleted, D271
    no-deprecations policy). The REAL content mechanism is InnerBlocks:
    save.js is `<InnerBlocks.Content />`, and render.php builds
    `'<div class="sgs-hero__content">' . $content . '</div>'` with ZERO
    filtering of $content. edit.js's HERO_CONTENT_TEMPLATE (the canonical
    child-block shape) is: sgs/label[className sgs-hero__label] ->
    sgs/heading[level h1, className sgs-hero__headline] ->
    sgs/text[className sgs-hero__subheadline] -> sgs/multi-button[sgs/button,
    sgs/button]. Those classNames matter beyond cosmetics: block.json
    selectors.typography.root = ".sgs-hero__headline" — hero's own
    typography style support targets that class specifically.
    Wrapper-level scalar attrs (variant, backgroundImage, backgroundOverlayColour/
    Opacity — renamed from overlayColour/overlayOpacity, legacy names still
    read as a fallback per WS-4 comment — minHeight, style.spacing/color/
    border/typography via skip-serialised native supports, bgParallax,
    imageObjectFit/Position, align via supports.align:["wide","full"]) ARE
    still read by render.php and drive the section shell.

  - The one real safe-zone instance (hero-video-background.php) parses to:
    core/cover{url:"", dimRatio:70, overlayColor:"primary-dark", minHeight:600,
    align:"full", style.spacing.padding:{...}} wrapping
    core/group{layout constrained/700px} > [sgs/heading, sgs/text,
    core/buttons > core/button]. url is EMPTY — the pattern's own body text
    literally says "Replace the cover block's background with a video URL..."
    — it is a documentation placeholder with no media attached.

MAPPING (cover attr -> hero attr, verb, evidence):
  url + id + alt      -> backgroundImage {url,id,alt} (variant stays
                         "standard" — block.json supports.sgs.variants.standard
                         = ["backgroundImage"]) when url is non-empty AND a
                         media-library `id` is present (verified object shape:
                         render.php $bg_image['url'], matching the sibling
                         splitImage/splitMedia {url,id,alt,...} convention,
                         render.php lines ~122-138). GAP if url is set without
                         an id (external/non-library url — no reliable id to
                         populate; guessing the shape risks the D328/D291
                         object-attr-coercion class already logged in project
                         memory). DROPPED (no loss) when url is empty, as in
                         the one real instance — sgs/hero also renders with no
                         background image set.
  useFeaturedImage    -> GAP if true (no attribute reads the post's featured
                         image as a hero background); dropped (no-op) if false.
  overlayColor /
  customOverlayColor  -> backgroundOverlayColour (both preset-slug AND raw hex
                         are accepted — render.php line 857 resolves it through
                         the shared sgs_colour_value() helper, verified used
                         for both preset and raw colour forms elsewhere in the
                         framework, D302). customOverlayColor wins when present
                         (core's own "user picked a custom colour" precedence).
  isUserOverlayColor  -> dropped — editor-UI selector flag only (which of the
                         two colour attrs is "active"); resolved above at
                         conversion time, no runtime effect.
  dimRatio            -> backgroundOverlayOpacity (both are a plain 0-100
                         number — render.php lines 119 + 857).
  minHeight (+Unit)   -> minHeight, folded into ONE unit-embedded CSS-length
                         string (render.php line 151 sgs_css_length(), same
                         shape as hero's own minHeightTablet/minHeightMobile).
                         Unit defaults to 'px' when minHeightUnit is absent
                         (matches WP core cover's own render behaviour).
  focalPoint {x,y}    -> imageObjectPosition, converted from 0-1 normalised
                         x/y to a "N% N%" string — plain arithmetic, no shape
                         guessing.
  hasParallax         -> bgParallax — direct boolean equivalent, same default
                         (false) on both sides.
  isRepeated          -> GAP if true (CSS background-repeat tiling has no
                         sgs/hero equivalent); dropped (no-op) if false.
  backgroundType       -> dropped when 'image'/absent (default; backgroundImage
                         carries the media, no separate attr needed). GAP for
                         any other value (e.g. 'video') — hero's bgVideo/
                         backgroundVideo object shape (poster, mime, etc.) is
                         not verified against a real instance; inventing it
                         would be exactly the "guess a shape to look
                         productive" trap this task explicitly warns against.
  gradient /
  customGradient      -> GAP (not present in the real instance, but if seen):
                         core's gradient is a single preset-slug reference to a
                         resolved multi-stop CSS gradient; hero wants discrete
                         overlayGradientFrom/To/Angle values. Resolving the
                         preset would require parsing theme.json's gradient
                         definition — unverified, not attempted here.
  contentPosition      -> GAP: core's 9-point grid has no verified 1:1 mapping
                         onto hero's separate alignment/verticalAlignment/
                         justifyContent controls.
  isDark / templateLock -> dropped always — editor-only hints (default text-
                         colour suggestion / block-locking), no rendering
                         effect on the frontend output.
  style.spacing/color/
  border               -> style.{group} 1:1 (both sides declare these as
                         native skip-serialised supports — same pattern as
                         heading_pairing's PASSTHROUGH_STYLE_GROUPS).
  style.typography      -> mapped via the SHARED typography_common.map_typography
                         helper (already used by heading_pairing/
                         paragraph_pairing) — GAP on any key it can't place.
  style.blockGap (or
  any other group)     -> GAP — hero declares no such native support.
  className/anchor/
  metadata             -> passthrough (native WP attrs).
  align                -> GAP, always, when present (see the dedicated note
                         below) — this is the one that blocks the real instance.
  tagName / sizeSlug /
  poster / anything
  else unlisted        -> falls through to the generic catch-all GAP.

CONTENT COLUMN (structural, not attr-level — exempt from the D338 gate's
per-attr accounting, which is keyed to `core/cover`'s OWN top-level attrs,
never a nested child block's attrs):
  The cover's inner HTML is re-parsed as WP blocks. A single wrapping
  core/group (the common draft shape — used purely for a content-width
  constraint) is UNWRAPPED: its own layout/contentSize attrs are dropped —
  hero has its own layout system (contentPadding/maxWidth/contentWidth/etc.)
  and Rule 1 (CONVERT, don't mirror) forbids carrying the draft's own
  wrapping-div structure forward. The remaining children must be entirely
  within a small verified-safe set: sgs/heading (exactly one -> headline,
  gets className "sgs-hero__headline" added), sgs/text (at most one ->
  sub-headline, className "sgs-hero__subheadline"), sgs/label (at most one,
  className "sgs-hero__label"), and core/buttons / sgs/multi-button /
  sgs/button (verbatim carry — button-family conversion is a SEPARATE
  pairing's job, not this one's). Any other child block type is a GAP —
  the exact set was verified against edit.js's HERO_CONTENT_TEMPLATE, not
  guessed.

THE "align" BLOCKER (why the one real instance is REFUSED, not migrated):
  sgs/hero declares supports.align:["wide","full"] but does NOT list "align"
  in its static block.json `attributes` object (verified: the full 141-853
  attributes block has no "align" key — align is a WP-runtime supports-
  injected concept, not a declared schema attribute). driver.py's
  anti-silent-discard gate (`load_target_schema`) reads ONLY the static
  attributes object, and its NATIVE_OK set (className/anchor/lock/metadata/
  style) has no "align" entry. Emitting "align" would be flagged as an
  undeclared attr and SystemExit-crash the entire driver run — worse than a
  clean per-instance refusal. Dropping align:"full" silently instead would
  collapse a full-bleed hero section to constrained width — a real visual
  regression, not a safe drop. This is a TOOLING/SCHEMA gap (driver.py's
  NATIVE_OK, or adding "align" to hero's block.json), not a semantic mapping
  problem: every other attr in the real instance (overlay colour/opacity,
  minHeight, style.spacing, the whole content-column reshape) maps cleanly —
  proven by running this module's full logic before the align check, which
  is deliberately placed LAST.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import parse_blocks, serialize_comment, serialize_closer, BlockParseError  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402
from pairings.typography_common import map_typography  # noqa: E402

# style groups sgs/hero declares as skip-serialised native supports.
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'color', 'border')

# Child block types this module has a verified, non-lossy content mapping for
# (edit.js HERO_CONTENT_TEMPLATE). Anything else in the cover's content is a GAP.
ALLOWED_CONTENT_TYPES = {'sgs/heading', 'sgs/text', 'sgs/label',
                          'core/buttons', 'sgs/multi-button', 'sgs/button'}

CONTENT_CLASS = {
    'sgs/heading': 'sgs-hero__headline',
    'sgs/text': 'sgs-hero__subheadline',
    'sgs/label': 'sgs-hero__label',
}


def _extract_hero_content(node, text):
    """Reshape the cover's inner block content into sgs/hero's InnerBlocks
    content column. Raises GapError for any shape not confidently reshapeable
    (see module docstring "CONTENT COLUMN")."""
    span = node.inner_html_span()
    if not span:
        raise GapError(
            'cover has no inner content (void/self-closed) — sgs/hero needs '
            'InnerBlocks content; nothing to migrate')
    inner = text[span[0]:span[1]]
    try:
        inner_roots = parse_blocks(inner, '<cover inner>')
    except BlockParseError as e:
        raise GapError(f'inner content failed to re-parse as WP blocks: {e}')

    if not inner_roots:
        raise GapError(
            'cover inner content has no recognised WP block markup (plain HTML '
            '/ raw text only) — sgs/hero has no way to receive unstructured '
            'text as InnerBlocks content; manual review')

    if len(inner_roots) == 1 and inner_roots[0].name == 'core/group':
        content_children = inner_roots[0].children
        notes_group = True
    else:
        content_children = inner_roots
        notes_group = False

    if not content_children:
        raise GapError('cover content unwraps to an empty child list — nothing to migrate')

    for child in content_children:
        if child.name not in ALLOWED_CONTENT_TYPES:
            raise GapError(
                f'unrecognised child block "{child.name}" in cover content — only '
                f'{sorted(ALLOWED_CONTENT_TYPES)} are confidently reshapeable to '
                f'sgs/hero\'s InnerBlocks content column (verified against edit.js\'s '
                f'HERO_CONTENT_TEMPLATE); extend the mapping before swapping this instance')

    heading_count = sum(1 for c in content_children if c.name == 'sgs/heading')
    if heading_count != 1:
        raise GapError(
            f'expected exactly one sgs/heading in cover content for the headline, '
            f'found {heading_count}')
    text_count = sum(1 for c in content_children if c.name == 'sgs/text')
    if text_count > 1:
        raise GapError(
            f'expected at most one sgs/text in cover content for the sub-headline, '
            f'found {text_count}')
    label_count = sum(1 for c in content_children if c.name == 'sgs/label')
    if label_count > 1:
        raise GapError(f'expected at most one sgs/label in cover content, found {label_count}')

    parts = []
    for child in content_children:
        if child.name in CONTENT_CLASS:
            wanted_class = CONTENT_CLASS[child.name]
            child_attrs = dict(child.attrs or {})
            existing = child_attrs.get('className', '')
            classes = [c for c in existing.split() if c] if existing else []
            if wanted_class not in classes:
                classes.append(wanted_class)
            child_attrs['className'] = ' '.join(classes)
            parts.append(serialize_comment(child.name, child_attrs, void=child.void))
        else:
            # core/buttons / sgs/multi-button / sgs/button — verbatim carry.
            # Button-family conversion is a SEPARATE pairing's job.
            parts.append(inner[child.start:child.end])
    return '\n'.join(parts), notes_group


def transform(node, text):
    attrs_in = node.attrs or {}
    out = {}
    accounting = {}
    notes = []

    content_markup, unwrapped_group = _extract_hero_content(node, text)
    if unwrapped_group:
        notes.append('unwrapped a single core/group content wrapper (contentSize dropped — '
                      'hero has its own layout system; Rule 1 CONVERT not MIRROR)')

    # ── background media ───────────────────────────────────────────────
    url = attrs_in.get('url', '')
    if url:
        img_id = attrs_in.get('id')
        if not isinstance(img_id, int) or isinstance(img_id, bool):
            raise GapError(
                f'url {url!r} present without a media-library "id" — cannot safely build '
                f'sgs/hero\'s backgroundImage {{url,id,alt}} object (verified shape: '
                f'render.php $bg_image[\'url\'], matches the splitImage/splitMedia '
                f'convention); an external/non-library url has no reliable id — manual review')
        out['backgroundImage'] = {'url': url, 'id': img_id, 'alt': attrs_in.get('alt', '')}
        accounting['url'] = ('mapped', 'backgroundImage.url (variant "standard" uses '
                              'backgroundImage per block.json supports.sgs.variants)')
        accounting['id'] = ('mapped', 'backgroundImage.id')
        if 'alt' in attrs_in:
            accounting['alt'] = ('mapped', 'backgroundImage.alt')
    else:
        accounting['url'] = ('dropped', 'empty url — no background media in this instance; '
                              "sgs/hero has no background set either (matches core's "
                              'empty-background render)')
        if 'id' in attrs_in:
            accounting['id'] = ('dropped', 'url empty — id is meaningless without it')
        if 'alt' in attrs_in:
            accounting['alt'] = ('dropped', 'url empty — no media to attach alt text to')

    if 'useFeaturedImage' in attrs_in:
        if attrs_in['useFeaturedImage']:
            raise GapError(
                'useFeaturedImage:true has no sgs/hero equivalent — no attribute reads the '
                'post\'s featured image as a background; manual review')
        accounting['useFeaturedImage'] = ('dropped', 'false = default no-op, nothing to carry')

    # ── overlay colour ─────────────────────────────────────────────────
    custom_overlay = attrs_in.get('customOverlayColor')
    preset_overlay = attrs_in.get('overlayColor')
    if custom_overlay:
        out['backgroundOverlayColour'] = custom_overlay
        accounting['customOverlayColor'] = (
            'mapped', 'backgroundOverlayColour (raw value — sgs_colour_value() resolves '
            'both preset slugs and raw hex/rgba, render.php line 857)')
        if preset_overlay:
            accounting['overlayColor'] = (
                'dropped', 'customOverlayColor is authoritative when the user picked a '
                'custom colour (core precedence) — the preset slug is the stale alternative')
    elif preset_overlay:
        out['backgroundOverlayColour'] = preset_overlay
        accounting['overlayColor'] = (
            'mapped', 'backgroundOverlayColour (preset slug — sgs_colour_value() resolves '
            'it, render.php line 857)')
    if 'isUserOverlayColor' in attrs_in:
        accounting['isUserOverlayColor'] = (
            'dropped', 'editor-UI selector flag (which of overlayColor/customOverlayColor '
            'is "active") — resolved above at conversion time, no runtime effect')

    # ── dimRatio -> backgroundOverlayOpacity ──────────────────────────
    if 'dimRatio' in attrs_in:
        dim = attrs_in['dimRatio']
        if not isinstance(dim, (int, float)) or isinstance(dim, bool):
            raise GapError(f'dimRatio {dim!r} is not numeric — refusing to guess')
        out['backgroundOverlayOpacity'] = dim
        accounting['dimRatio'] = ('mapped', 'backgroundOverlayOpacity (both a plain 0-100 '
                                   'number, render.php lines 119+857)')

    # ── minHeight (+unit) -> unit-embedded string ──────────────────────
    if 'minHeight' in attrs_in:
        mh = attrs_in['minHeight']
        if not isinstance(mh, (int, float)) or isinstance(mh, bool):
            raise GapError(f'minHeight {mh!r} is not numeric — refusing to guess')
        unit = attrs_in.get('minHeightUnit') or 'px'
        mh_str = f'{int(mh)}{unit}' if float(mh).is_integer() else f'{mh}{unit}'
        out['minHeight'] = mh_str
        accounting['minHeight'] = ('mapped', f'minHeight (number+unit) -> "{mh_str}" '
                                    '(hero minHeight is a unit-embedded string, render.php '
                                    'line 151 sgs_css_length())')
        if 'minHeightUnit' in attrs_in:
            accounting['minHeightUnit'] = ('mapped', 'folded into minHeight string above')

    # ── focalPoint -> imageObjectPosition ──────────────────────────────
    if 'focalPoint' in attrs_in:
        fp = attrs_in['focalPoint']
        if not isinstance(fp, dict) or 'x' not in fp or 'y' not in fp:
            raise GapError(f'focalPoint {fp!r} missing x/y — refusing to guess')
        out['imageObjectPosition'] = f'{round(float(fp["x"]) * 100)}% {round(float(fp["y"]) * 100)}%'
        accounting['focalPoint'] = ('mapped', 'imageObjectPosition (0-1 normalised x/y '
                                     '-> percentage string, plain arithmetic)')

    # ── hasParallax -> bgParallax ───────────────────────────────────────
    if 'hasParallax' in attrs_in:
        out['bgParallax'] = bool(attrs_in['hasParallax'])
        accounting['hasParallax'] = ('mapped', 'bgParallax (direct boolean equivalent, '
                                      'same default false on both sides)')

    if 'isRepeated' in attrs_in:
        if attrs_in['isRepeated']:
            raise GapError(
                'isRepeated:true (CSS background-repeat tiling) has no sgs/hero '
                'equivalent — manual review')
        accounting['isRepeated'] = ('dropped', 'false = default no-op, nothing to carry')

    if 'backgroundType' in attrs_in:
        bt = attrs_in['backgroundType']
        if bt not in ('image', ''):
            raise GapError(
                f'backgroundType {bt!r} (e.g. video) has no verified sgs/hero mapping — '
                f'bgVideo/backgroundVideo object shape not confirmed against a real '
                f'instance; manual review')
        accounting['backgroundType'] = (
            'dropped', 'default "image" — no attribute needed, backgroundImage carries '
            'the media')

    # ── style: spacing/color/border 1:1; typography via shared helper ──
    if 'style' in attrs_in:
        style_in = attrs_in['style'] or {}
        style_out = {}
        detail = []
        for group, group_value in style_in.items():
            if group in PASSTHROUGH_STYLE_GROUPS:
                style_out[group] = group_value
                detail.append(f'style.{group} 1:1 (skip-serialised native support)')
            elif group == 'typography':
                unmapped = map_typography(group_value, out, detail)
                if unmapped:
                    raise GapError(f'style.typography keys {unmapped} have no sgs/hero mapping')
                detail.append('style.typography -> typed attrs')
            else:
                raise GapError(
                    f'style.{group} has no sgs/hero mapping — extend before swapping '
                    f'(e.g. blockGap has no hero equivalent)')
        if style_out:
            out['style'] = style_out
        accounting['style'] = ('mapped', '; '.join(detail) or 'empty style')

    # ── passthrough ─────────────────────────────────────────────────────
    for key in ('className', 'anchor', 'metadata'):
        if key in attrs_in:
            out[key] = attrs_in[key]
            accounting[key] = ('mapped', f'{key} passthrough')

    # ── align ──────────────────────────────────────────────────────────
    # `align` is NOT in sgs/hero's static block.json `attributes` — WP INJECTS it
    # at registration from `supports.align`, exactly as it injects backgroundColor
    # from supports.color. The driver's gate now derives those support-injected
    # attrs (load_target_schema), so emitting it is correct and gate-clean.
    # Dropping it instead would collapse a full-bleed hero to constrained width —
    # a real visual regression, never a safe drop.
    if 'align' in attrs_in:
        value = attrs_in['align']
        if value not in ('wide', 'full'):
            raise GapError(f'align:{value!r} outside sgs/hero supports.align ["wide","full"]')
        out['align'] = value
        accounting['align'] = ('mapped', 'align (WP-injected from supports.align)')

    # ── generic catch-all for anything not verified above ──────────────
    unhandled = [k for k in attrs_in if k not in accounting]
    if unhandled:
        raise GapError(f'source attr(s) {unhandled} not handled by this module — extend the mapping')

    replacement = (serialize_comment('sgs/hero', out, void=False) + '\n'
                   + content_markup + '\n' + serialize_closer('sgs/hero'))
    return TransformResult(replacement, out, 'sgs/hero', accounting, notes)
