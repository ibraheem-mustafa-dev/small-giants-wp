#!/usr/bin/env python3
"""core/column -> sgs/container (a grid cell). Track C pairing module.

Runs AFTER core/columns (which already synthesised the parent's
gridTemplateColumns from these columns' widths). So each column's `width` is now
owned by the parent grid track and is DROPPED here with reason — re-emitting it
as a per-child size would fight the parent grid. `verticalAlignment` (a per-child
override, WP's align-self) → `sgsCustomCss` (`&selector{align-self:…}`), the
universal per-instance CSS escape hatch (Bean-directed 2026-07-16), since
sgs/container has no align-self attr. PAIRED emit (a column holds child blocks).
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment, serialize_closer, inner_blocks_markup  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

PASSTHROUGH_STYLE_GROUPS = ('spacing', 'border', 'color', 'typography')

ALIGN_SELF = {'top': 'start', 'center': 'center', 'bottom': 'end', 'stretch': 'stretch'}


def transform(node, text):
    attrs_in = node.attrs or {}
    # sgs/container's save is <InnerBlocks.Content/> only -- no wrapper div of
    # its own -- so carry ONLY the child blocks, never core/column's own
    # save-wrapper <div class="wp-block-column">. See
    # block_parser.inner_blocks_markup().
    inner = inner_blocks_markup(node, text)

    out = {}
    accounting = {}
    notes = []

    for key, value in attrs_in.items():
        if key == 'width':
            accounting[key] = (
                'dropped',
                'the parent columns→container owns column sizing via the synthesised '
                'gridTemplateColumns track; a per-child width would fight the grid')
        elif key == 'verticalAlignment':
            if value not in ALIGN_SELF:
                raise GapError(f'verticalAlignment {value!r} unmapped')
            # Per-child align-self via the universal sgsCustomCss escape hatch
            # (&selector → .uid.uid). sgs/container has no align-self attr.
            out['sgsCustomCss'] = f'&selector{{align-self:{ALIGN_SELF[value]};}}'
            accounting[key] = ('mapped', f'verticalAlignment → sgsCustomCss align-self:{ALIGN_SELF[value]}')
        elif key == 'style':
            style_out = {}
            detail = []
            for group, gv in (value or {}).items():
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = gv
                    detail.append(f'style.{group} 1:1')
                elif group == 'dimensions':
                    for dk, dv in (gv or {}).items():
                        if dk == 'minHeight':
                            out['minHeight'] = dv
                        elif dk == 'maxWidth':
                            out['maxWidth'] = dv
                        else:
                            raise GapError(f'style.dimensions.{dk} has no mapping')
                    detail.append('style.dimensions → attrs')
                else:
                    raise GapError(f'style.{group} has no sgs/container mapping')
            if style_out:
                out['style'] = style_out
            accounting['style'] = ('mapped', '; '.join(detail) or 'empty style')
        elif key in ('backgroundColor', 'textColor', 'gradient', 'className',
                     'anchor', 'metadata', 'fontSize', 'layout'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} (native / passthrough)')
        else:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = (serialize_comment('sgs/container', out, void=False)
                   + inner
                   + serialize_closer('sgs/container'))
    return TransformResult(replacement, out, 'sgs/container', accounting, notes)
