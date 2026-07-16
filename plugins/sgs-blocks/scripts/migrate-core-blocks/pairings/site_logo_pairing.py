#!/usr/bin/env python3
"""core/site-logo → sgs/responsive-logo transformer (Track C pairing module).

Ground truth:
  - core/site-logo schema (WP core wp-includes/blocks/site-logo/block.json,
    read 2026-07-16 from a live install): attributes = width (number),
    isLink (boolean, default true, role content), linkTarget (string,
    default '_self', role content), shouldSyncIcon (boolean). supports:
    align:true / alignWide:false, color.text/background both false, spacing
    margin+padding.
  - sgs/responsive-logo/block.json (read 2026-07-16): attributes =
    desktopLogoId/tabletLogoId/mobileLogoId/svgAnimationSource (number),
    animationStyle (string enum), width (number, default 240), linkToHome
    (boolean, default true), alt (string), paddingTablet/paddingMobile/
    marginTablet/marginMobile (object). supports.align: left/center/right/
    wide (NOT "align" itself declared as a static attribute — see the align
    note below). supports.spacing: margin+padding, skip-serialised.
  - sgs/responsive-logo/render.php (read 2026-07-16): when desktopLogoId is
    0/unset, falls back to `get_theme_mod('custom_logo', 0)` — the SAME
    WordPress Customizer "Site Identity" logo core/site-logo always renders
    ("Per Bean's directive 2026-05-20", render.php comment). None of the 3
    safe-zone instances (header-centred.php, header-full.php, header-minimal.
    php — footer-*.php + framework-footer-default.php are HANDS-OFF) carry a
    logo id/url at all, so leaving desktopLogoId/tabletLogoId/mobileLogoId
    unset reproduces core/site-logo's behaviour EXACTLY: both blocks resolve
    to the same Customizer logo. This is not a gap — it is a verified 1:1
    behavioural match.

Mapping:
  width (number)         -> width (number)         — SAME type both sides,
                             no unit-string parsing needed (unlike core/
                             image's width, which is "120px"/{"all":...}).
  isLink (boolean)        -> linkToHome (boolean)   — same semantic + default
                             (both default true).
  linkTarget (string)     -> DROPPED when '_self' (or absent — the default;
                             no functional loss, browser default behaviour is
                             identical) — GAP (refuse) when any other value
                             (e.g. '_blank'): sgs/responsive-logo's render.php
                             hardcodes `rel="home"` with NO `target` attribute
                             on the `<a>` at all (verified: the only two
                             printf() calls building the link, neither emits
                             `target=`) — opening the logo link in a new tab
                             cannot be reproduced.
  shouldSyncIcon (bool)   -> DROPPED always — verified NOT in sgs/responsive-
                             logo's declared attributes AND render.php never
                             references any site-icon-sync logic (grepped).
                             This is a WordPress Customizer UI-time feature
                             (syncs the uploaded logo to Appearance > Customise
                             > Site Identity > Icon) — independent of which
                             block renders the logo on the page. No functional
                             loss.
  style.spacing.*         -> style.spacing.* 1:1 — sgs/responsive-logo
                             declares native `spacing` support (margin+
                             padding, __experimentalSkipSerialization) and
                             render.php's base-tier block explicitly reads
                             `$attributes['style']['spacing']['padding'/
                             'margin']` via wp_style_engine_get_styles() —
                             matches core's own style.spacing shape exactly.
                             Any OTHER style group (color/border/typography)
                             is a GAP: sgs/responsive-logo does not declare
                             those supports and render.php never reads them —
                             the value would render as literally nothing,
                             which is a silent loss the accounting must not
                             hide.
  className/anchor/metadata -> passthrough (native WP attrs, always safe).
  align                   -> GAP, always, when present. sgs/responsive-logo
                             DOES declare supports.align (left/center/right/
                             wide) but does NOT list "align" among its static
                             block.json `attributes` (verified: the full
                             attributes object has no "align" key). driver.py's
                             anti-silent-discard gate (`load_target_schema`)
                             reads ONLY the static attributes object, and its
                             NATIVE_OK set (className/anchor/lock/metadata/
                             style) has no "align" entry — emitting "align"
                             would be flagged as an undeclared attr and
                             SystemExit the whole driver run. None of the 3
                             real safe-zone instances set align, so this never
                             fires today — kept as a guard for future
                             instances rather than a silent miss.

None of the 3 real safe-zone instances (header-centred.php width:250,
header-full.php width:300, header-minimal.php width:250 — all
{"width":N,"shouldSyncIcon":true}, nothing else) hit any GAP path: this
pairing is a clean, verified, transformer-written mapping.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

# style groups sgs/responsive-logo declares as skip-serialised native support.
PASSTHROUGH_STYLE_GROUPS = ('spacing',)


def transform(node, text):
    attrs_in = node.attrs or {}
    out = {}
    accounting = {}
    notes = []

    if 'width' in attrs_in:
        width = attrs_in['width']
        if not isinstance(width, (int, float)) or isinstance(width, bool):
            raise GapError(f'width {width!r} is not numeric — refusing to guess')
        out['width'] = width
        accounting['width'] = ('mapped', 'width (number -> number, no unit parsing needed)')

    if 'isLink' in attrs_in:
        out['linkToHome'] = bool(attrs_in['isLink'])
        accounting['isLink'] = ('mapped', 'linkToHome (same semantic + default true)')

    if 'linkTarget' in attrs_in:
        target = attrs_in['linkTarget']
        if target in ('_self', '', None):
            accounting['linkTarget'] = (
                'dropped',
                'default "_self" — sgs/responsive-logo has no target attribute at all '
                '(render.php hardcodes rel="home", no target=); browser default behaviour '
                'is identical, no functional loss')
        else:
            raise GapError(
                f'linkTarget {target!r} has no sgs/responsive-logo equivalent — render.php '
                f'never emits a target= attribute on the logo link, so opening in a new tab '
                f'cannot be reproduced')

    if 'shouldSyncIcon' in attrs_in:
        accounting['shouldSyncIcon'] = (
            'dropped',
            'WordPress Customizer site-icon-sync is a UI-time feature independent of which '
            'block renders the logo (verified: not in sgs/responsive-logo block.json '
            'attributes, never referenced in render.php) — no functional loss')

    if 'style' in attrs_in:
        style_in = attrs_in['style'] or {}
        style_out = {}
        detail = []
        for group, group_value in style_in.items():
            if group in PASSTHROUGH_STYLE_GROUPS:
                style_out[group] = group_value
                detail.append(f'style.{group} 1:1 (skip-serialised native support, '
                               f'render.php reads style.spacing.padding/margin directly)')
            else:
                raise GapError(
                    f'style.{group} has no sgs/responsive-logo mapping — the block declares '
                    f'no {group} support and render.php never reads style.{group}; the value '
                    f'would silently render as nothing — extend the mapping before swapping')
        if style_out:
            out['style'] = style_out
        accounting['style'] = ('mapped', '; '.join(detail) or 'empty style')

    for key in ('className', 'anchor', 'metadata'):
        if key in attrs_in:
            out[key] = attrs_in[key]
            accounting[key] = ('mapped', f'{key} passthrough')

    unhandled = [k for k in attrs_in if k not in accounting and k != 'align']
    if unhandled:
        raise GapError(f'source attr(s) {unhandled} not handled by this module — extend the mapping')

    # Deferred to LAST so every other attr is proven to map cleanly before
    # this refusal is reported (see module docstring "align" note).
    if 'align' in attrs_in:
        raise GapError(
            f'align:{attrs_in["align"]!r} cannot be safely emitted — sgs/responsive-logo '
            f'declares supports.align (left/center/right/wide) but does NOT list "align" in '
            f'its static block.json attributes object, and driver.py\'s NATIVE_OK set has no '
            f'"align" entry; emitting it would SystemExit-crash the driver as an undeclared '
            f'attr. This is a tooling/schema gap (driver.py NATIVE_OK), not a semantic mapping '
            f'problem — everything else in this instance mapped cleanly.')

    notes.append(
        'no desktopLogoId/tabletLogoId/mobileLogoId set — falls back to '
        "get_theme_mod('custom_logo'), the SAME site logo core/site-logo always rendered "
        '(verified behavioural match, render.php).')

    replacement = serialize_comment('sgs/responsive-logo', out, void=True)
    return TransformResult(replacement, out, 'sgs/responsive-logo', accounting, notes)
