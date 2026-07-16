#!/usr/bin/env python3
"""core/buttons -> sgs/multi-button transformer (Track C pairing module).

Ground truth (multi-button/block.json + render.php read 2026-07-16):
  attributes: direction/directionTablet/directionMobile, gap/gapTablet/
              gapMobile, justifyContent/*Tablet/*Mobile, wrap/*Tablet/*Mobile,
              alignItems/*Tablet/*Mobile, contentWidth, maxWidth.
  supports:   anchor, customClassName, html:false,
              color {background, gradients, text, skipSerialization},
              __experimentalBorder {radius, width, color, style, skipSerialization}.
  allowedBlocks: ["sgs/button"] only.

STRUCTURE: core/buttons WRAPS core/button children inside a
`<div class="wp-block-buttons" ...>` static wrapper div. sgs/multi-button is
a DYNAMIC block (render.php reads `$content` = the rendered inner blocks) that
builds its OWN wrapper via SGS_Container_Wrapper -- the core `wp-block-buttons`
div is dead weight core's static-block save() emitted and has no sgs meaning.
This module therefore does NOT copy `inner_html_span()` verbatim: it strips
that ONE known, exact wrapper div (regex-matched, never guessed) and keeps
only what is inside it -- the untouched `<!-- wp:button -->...<!-- /wp:button
--> ` child markup, which a SEPARATE `--pairing core/button` driver run
(migrate-core-blocks/driver.py runs one core_type per invocation, so
core/button nodes nested under a core/buttons parent are simply not visited
during a core/buttons run) finds and swaps afterwards. If the wrapper doesn't
match the expected single-div shape, this refuses (GapError) rather than
guess at what to strip.

WP-NATIVE COLOUR/GRADIENT SUPPORT ATTR GAP (verified 2026-07-16): render.php
reads `$attributes['backgroundColor']` / `['textColor']` / `['gradient']`
directly (lines ~151-153) -- these ARE real, WP-auto-registered attrs from
`supports.color`, but they are NOT listed in block.json's static
"attributes" object (only the custom multi-button attrs are). The driver's
`load_target_schema()` reads ONLY block.json's "attributes" keys, so
emitting these top-level preset-slug attrs would be rejected by the
anti-silent-discard gate -- SystemExit, aborting the WHOLE run, not just this
instance. That's a real driver/block.json schema-declaration gap (fixing it
means editing block.json's attributes list or driver.py's NATIVE_OK, both
out of scope for a pairings/ module). Refuse loudly per instance instead.
`style.color`/`style.border` (raw hex/px values, not preset slugs) ARE safe
to pass through -- they land in NATIVE_OK's `style` key, not a new top-level
attr, and multi-button's own render.php explicitly forwards
`$attributes['style']['color']`/`['border']` to wp_style_engine_get_styles.
"""

import re
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment, serialize_closer  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

# style groups sgs/multi-button consumes 1:1 (verified: color + border are
# declared skip-serialised supports; spacing is UNDECLARED in block.json but
# render.php's underlying SGS_Container_Wrapper reads style.spacing.* directly
# -- live-proven per the Track C dispatch brief, 2026-07-15).
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'color', 'border')

# core `layout.justifyContent` (flex) -> raw CSS `justify-content` keyword,
# which is exactly what sgs/multi-button's `justifyContent` attr stores
# (render.php line 93: `'justify-content:' . $justify_content`, no enum
# validation -- it is concatenated as a raw CSS keyword, so it must already
# BE a valid one here, not a core UI label).
_JUSTIFY_MAP = {
    'left': 'flex-start',
    'center': 'center',
    'right': 'flex-end',
    'space-between': 'space-between',
}

WRAPPER_RE = re.compile(
    r'^\s*<div\s+class="wp-block-buttons(?:\s[^"]*)?"[^>]*>(.*)</div>\s*$', re.S)


def _map_layout(layout, out, detail):
    """Map core `layout` (type:"flex" only -- the only type core/buttons uses)
    onto sgs/multi-button's typed attrs. Returns unmapped keys/values; caller
    MUST refuse if non-empty."""
    unmapped = []
    for key, value in (layout or {}).items():
        if key == 'type':
            if value != 'flex':
                unmapped.append(f'type:{value!r}')
            # else: silently consumed -- 'flex' is the only type this block emits,
            # nothing on the sgs side records the layout "type" itself.
        elif key == 'justifyContent':
            if value not in _JUSTIFY_MAP:
                unmapped.append(f'justifyContent:{value!r}')
                continue
            out['justifyContent'] = _JUSTIFY_MAP[value]
            detail.append(f'layout.justifyContent:{value!r} -> justifyContent:{_JUSTIFY_MAP[value]!r}')
        elif key == 'orientation':
            if value == 'vertical':
                out['direction'] = 'column'
                detail.append('layout.orientation:"vertical" -> direction:"column"')
            elif value == 'horizontal':
                detail.append('layout.orientation:"horizontal" is the sgs default '
                               '(direction:"row") -- no attr needed')
            else:
                unmapped.append(f'orientation:{value!r}')
        elif key == 'flexWrap':
            if value not in ('wrap', 'nowrap'):
                unmapped.append(f'flexWrap:{value!r}')
                continue
            out['wrap'] = value
            detail.append(f'layout.flexWrap -> wrap:{value!r}')
        else:
            unmapped.append(key)
    return unmapped


def transform(node, text):
    attrs_in = node.attrs or {}
    span = node.inner_html_span()
    raw_inner = text[span[0]:span[1]] if span else ''

    m = WRAPPER_RE.match(raw_inner)
    if not m:
        raise GapError(
            'inner HTML is not a single <div class="wp-block-buttons">...</div> wrapper '
            '-- cannot safely strip the core wrapper without guessing (manual review)')
    inner = m.group(1)  # the untouched core/button child markup, verbatim.

    out = {}
    accounting = {}
    notes = []

    if 'metadata' in attrs_in and (attrs_in['metadata'] or {}).get('bindings'):
        raise GapError(
            'metadata.bindings present -- WP block bindings only resolve for the core-block '
            'allowlist in get_block_bindings_supported_attributes() (verified on live WP 7.0.1); '
            'sgs/multi-button is not registered via the block_bindings_supported_attributes '
            'filter, so the binding would render INERT. Capability gap -- do not migrate silently.')

    for key, value in attrs_in.items():
        if key == 'layout':
            detail = []
            unmapped = _map_layout(value, out, detail)
            if unmapped:
                raise GapError(f'layout keys/values {unmapped} have no sgs/multi-button mapping')
            accounting[key] = ('mapped', '; '.join(detail) or 'layout consumed (type:"flex" only)')
        elif key in ('backgroundColor', 'textColor', 'gradient'):
            raise GapError(
                f'{key} (WP-native colour-support preset slug) is read directly by '
                f'render.php but is NOT declared in block.json\'s "attributes" object -- '
                f'the anti-silent-discard gate would reject this emission (block.json/'
                f'driver.py schema-declaration gap, out of scope for a pairings/ module). '
                f'Manual review / block.json fix required before this instance can migrate.')
        elif key == 'style':
            detail = []
            style_out = {}
            for group, group_value in (value or {}).items():
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = group_value
                    if group == 'spacing':
                        detail.append('style.spacing 1:1 (SGS_Container_Wrapper reads '
                                       'style.spacing.* directly -- live-proven, block.json '
                                       'does not formally declare the support)')
                    else:
                        detail.append(f'style.{group} 1:1 (skip-serialised native support)')
                else:
                    raise GapError(f'style.{group} has no sgs/multi-button mapping -- '
                                    f'extend before swapping')
            if style_out:
                out['style'] = style_out
            accounting[key] = ('mapped', '; '.join(detail) or 'empty style')
        elif key == 'className':
            tokens = value.split()
            if any(t.startswith('is-style-') for t in tokens):
                raise GapError(f'className {value!r} carries an is-style-* token -- core/buttons '
                                f'has no documented block styles; refusing rather than guessing '
                                f'a mapping')
            out['className'] = value
            accounting[key] = ('mapped', 'className passthrough (no is-style-* tokens found)')
        elif key in ('anchor', 'lock'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} passthrough (native)')
        elif key == 'metadata':
            out['metadata'] = value
            accounting[key] = ('mapped', 'metadata passthrough (no bindings -- name/pattern data only)')
        else:
            raise GapError(f'source attr "{key}" not handled by this module -- extend the mapping')

    opener = serialize_comment('sgs/multi-button', out, void=False)
    closer = serialize_closer('sgs/multi-button')
    replacement = opener + inner + closer
    notes.append('inner core/button children preserved verbatim (minus the stripped '
                 'wp-block-buttons wrapper div) for a separate --pairing core/button run')
    return TransformResult(replacement, out, 'sgs/multi-button', accounting, notes)
