#!/usr/bin/env python3
"""core/paragraph → sgs/text transformer (Track C pairing module).

Ground truth (text/block.json + render.php read 2026-07-15):
  text       string  — echoed via wp_kses_post (inline markup survives)
  textAlign  string  enum '',left,center,right,justify   <-- core says `align`
  textColour string  — British spelling (core says textColor)
  fontSize   ["number","string"] — preset slug renders since the preset-gap fix
  dropCap    boolean
  supports   spacing + border.radius, both __experimentalSkipSerialization
             (color is FALSE — colour is the typed textColour attr instead),
             so style.spacing / style.border carry 1:1 but style.color must
             map to the typed attrs. typography is NOT a declared support —
             style.typography maps to the block's typed attrs.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402
from pairings.typography_common import inner_markup, map_typography  # noqa: E402

# style groups sgs/text declares as skip-serialised native supports.
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'border')


def transform(node, text):
    attrs_in = node.attrs or {}
    out = {}
    accounting = {}
    notes = []

    if 'metadata' in attrs_in and (attrs_in['metadata'] or {}).get('bindings'):
        raise GapError(
            'metadata.bindings present — WP block bindings only resolve for the core-block '
            'allowlist in get_block_bindings_supported_attributes() (verified on live WP 7.0.1); '
            'sgs/text is not registered via the block_bindings_supported_attributes filter, so '
            'the bound sgs/site-info value would render INERT. Capability gap — do not migrate '
            'silently.')

    content = inner_markup(node, text)
    if content is None:
        raise GapError('inner HTML is not a single wrapping tag — cannot extract text safely')
    out['text'] = content

    for key, value in attrs_in.items():
        if key == 'align':
            if value not in ('left', 'center', 'right', 'justify'):
                raise GapError(f'align {value!r} outside the sgs/text textAlign enum')
            out['textAlign'] = value
            accounting[key] = ('mapped', 'textAlign (core paragraph `align` IS text alignment)')
        elif key == 'textColor':
            out['textColour'] = value
            accounting[key] = ('mapped', 'textColour (British spelling — the D338 naming class)')
        elif key == 'backgroundColor':
            out['backgroundColour'] = value
            accounting[key] = ('mapped', 'backgroundColour')
        elif key == 'fontSize':
            out['fontSize'] = value
            accounting[key] = ('mapped', 'fontSize (preset slug — renders since the preset-gap fix)')
        elif key == 'dropCap':
            out['dropCap'] = bool(value)
            accounting[key] = ('mapped', 'dropCap')
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
                        raise GapError(f'style.typography keys {unmapped} have no sgs/text mapping')
                    detail.append('style.typography -> typed attrs')
                elif group == 'color':
                    # supports.color is FALSE on sgs/text — a raw style.color
                    # would never render. Map to the typed colour attrs.
                    for ck, cv in (group_value or {}).items():
                        if ck == 'text':
                            out['textColour'] = cv
                        elif ck == 'background':
                            out['backgroundColour'] = cv
                        else:
                            raise GapError(f'style.color.{ck} has no sgs/text mapping')
                    detail.append('style.color -> typed textColour/backgroundColour (supports.color is false)')
                else:
                    raise GapError(f'style.{group} has no sgs/text mapping — extend before swapping')
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

    replacement = serialize_comment('sgs/text', out, void=True)
    return TransformResult(replacement, out, 'sgs/text', accounting, notes)
