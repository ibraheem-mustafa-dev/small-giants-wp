#!/usr/bin/env python3
"""core/heading → sgs/heading transformer (Track C pairing module).

Ground truth (heading/block.json + render.php read 2026-07-15):
  content   string  — echoed via wp_kses_post (inline markup survives)
  level     string  ENUM h1..h6, default 'h2'   <-- core stores an INT
  textAlign string  enum '',left,center,right,justify,start,end
  textColour string — the British spelling (core says textColor)
  fontSize  ["number","string"] — a preset slug now renders (this session)
  supports  color + spacing + border, all __experimentalSkipSerialization,
            so `style.color` / `style.spacing` / `style.border` carry 1:1.
            typography is NOT a declared support — a style.typography group
            must map to the block's typed attrs, never pass through.

THE LEVEL TRAP: core serialises `"level":3` (int); sgs/heading declares a
STRING enum. Emitting the int would fail rest_validate_value_from_schema and
WP would silently fall back to the default 'h2' — every h3 would render as an
h2 (the D328/D291 coercion class). Converted explicitly here.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402
from pairings.typography_common import inner_markup, map_typography  # noqa: E402

# style groups sgs/heading declares as skip-serialised native supports.
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'color', 'border')


def transform(node, text):
    attrs_in = node.attrs or {}
    out = {}
    accounting = {}
    notes = []

    if 'metadata' in attrs_in and (attrs_in['metadata'] or {}).get('bindings'):
        raise GapError(
            'metadata.bindings present — WP block bindings only resolve for the core-block '
            'allowlist in get_block_bindings_supported_attributes() (verified on live WP 7.0.1); '
            'sgs/heading is not registered via the block_bindings_supported_attributes filter, '
            'so the binding would render INERT. Capability gap — do not migrate silently.')

    content = inner_markup(node, text)
    if content is None:
        raise GapError('inner HTML is not a single wrapping tag — cannot extract content safely')
    out['content'] = content

    for key, value in attrs_in.items():
        if key == 'level':
            if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 6:
                raise GapError(f'level {value!r} is not an int 1-6 — refusing to guess')
            out['level'] = f'h{value}'
            accounting[key] = ('mapped', f'level {value} (int) -> "h{value}" (string enum)')
        elif key == 'textAlign':
            if value not in ('left', 'center', 'right', 'justify', 'start', 'end'):
                raise GapError(f'textAlign {value!r} outside the sgs/heading enum')
            out['textAlign'] = value
            accounting[key] = ('mapped', 'textAlign')
        elif key == 'textColor':
            out['textColour'] = value
            accounting[key] = ('mapped', 'textColour (British spelling — the D338 naming class)')
        elif key == 'backgroundColor':
            out['backgroundColour'] = value
            accounting[key] = ('mapped', 'backgroundColour')
        elif key == 'fontSize':
            out['fontSize'] = value
            accounting[key] = ('mapped', 'fontSize (preset slug — renders since the preset-gap fix)')
        elif key == 'style':
            detail = []
            style_out = {}
            for group, group_value in (value or {}).items():
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = group_value
                    detail.append(f'style.{group} 1:1 (skip-serialised native support)')
                elif group == 'typography':
                    unmapped = map_typography(group_value, out, detail)
                    if unmapped:
                        raise GapError(f'style.typography keys {unmapped} have no sgs/heading mapping')
                    detail.append('style.typography -> typed attrs')
                else:
                    raise GapError(f'style.{group} has no sgs/heading mapping — extend before swapping')
            if style_out:
                out['style'] = style_out
            accounting[key] = ('mapped', '; '.join(detail) or 'empty style')
        elif key in ('className', 'anchor'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} passthrough')
        elif key == 'metadata':
            out['metadata'] = value
            accounting[key] = ('mapped', 'metadata passthrough (no bindings — name/pattern data only)')
        else:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = serialize_comment('sgs/heading', out, void=True)
    return TransformResult(replacement, out, 'sgs/heading', accounting, notes)
