#!/usr/bin/env python3
"""core/columns -> sgs/container (a grid row). Track C pairing module.

RUN ORDER (critical): this pairing MUST run BEFORE core/column. core/columns is
the PARENT; it reads its core/column CHILDREN's `width` attrs (still core at that
point, leaf-first not yet applied across types) to SYNTHESISE the parent's
`gridTemplateColumns`. If core/column ran first, the children would already be
sgs/container with their width dropped, and the parent couldn't build the grid.

MAPPING (verified vs container/block.json + class-sgs-container-wrapper.php):
core/columns is a flex row of core/column children each sized by `width` (a
flex-basis %). The faithful sgs/container is a GRID: `layout:"grid"` +
`gridTemplateColumns` synthesised from the children's widths (explicit % kept;
a widthless column → "1fr", matching core's flex:1 fill) + `columnsMobile:1`
(WP columns stack to one column below ~782px — the wrapper's columnsMobile
drives the mobile 1-col override). `style.spacing.blockGap` → `gap`.
PAIRED emit: children carried verbatim (core/column, migrated by the separate
core/column run).
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment, serialize_closer, inner_blocks_markup  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

PASSTHROUGH_STYLE_GROUPS = ('spacing', 'border', 'color', 'typography')


def _synthesise_grid(node):
    """Build gridTemplateColumns from the core/column children's widths."""
    cols = [c for c in node.children if c.name == 'core/column']
    if not cols:
        raise GapError('core/columns has no core/column children — cannot build the grid')
    tracks = []
    for c in cols:
        w = (c.attrs or {}).get('width')
        # Explicit width (e.g. "45%") kept verbatim; a widthless column fills the
        # remainder like core's flex:1 → "1fr".
        tracks.append(w if isinstance(w, str) and w.strip() else '1fr')
    return ' '.join(tracks), len(cols)


def _map_blockgap(style):
    bg = ((style or {}).get('spacing') or {}).get('blockGap')
    if bg is None:
        return None
    # blockGap is either a string or {top,left}. core columns use the horizontal
    # gap; take left/right, else the scalar.
    if isinstance(bg, dict):
        return bg.get('left') or bg.get('right') or bg.get('top')
    return bg


def transform(node, text):
    attrs_in = node.attrs or {}
    # sgs/container's save is <InnerBlocks.Content/> only -- no wrapper div of
    # its own -- so carry ONLY the child blocks, never core/columns' own
    # save-wrapper <div class="wp-block-columns">. See
    # block_parser.inner_blocks_markup().
    inner = inner_blocks_markup(node, text)

    gtc, ncols = _synthesise_grid(node)
    out = {
        'layout': 'grid',
        'gridTemplateColumns': gtc,
        # EXPLICIT mobile stack (gridTemplateColumnsMobile:"1fr"), not the numeric
        # columnsMobile — the numeric shorthand class is beaten by the explicit
        # base gridTemplateColumns rule, so mobile stayed 2-col (live-proven). WP
        # columns stack to one column below ~782px; the wrapper's mobile tier
        # (<768px) applies this @media override that BEATS the base grid ratio.
        'gridTemplateColumnsMobile': '1fr',
    }
    accounting = {}
    notes = [f'grid synthesised from {ncols} core/column widths → gridTemplateColumns:{gtc!r}; '
             f'gridTemplateColumnsMobile:1fr (WP columns stack on mobile)']

    for key, value in attrs_in.items():
        if key == 'style':
            style_out = {}
            detail = []
            gap = _map_blockgap(value)
            if gap is not None:
                out['gap'] = gap
                detail.append(f'style.spacing.blockGap → gap:{gap!r}')
            for group, gv in (value or {}).items():
                if group == 'spacing':
                    # keep padding/margin; blockGap already extracted to `gap`.
                    rest = {k: v for k, v in (gv or {}).items() if k != 'blockGap'}
                    if rest:
                        style_out['spacing'] = rest
                        detail.append('style.spacing (padding/margin) 1:1')
                elif group in PASSTHROUGH_STYLE_GROUPS:
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
            accounting['style'] = ('mapped', '; '.join(detail) or 'blockGap only')
        elif key == 'verticalAlignment':
            # Row-level vertical alignment of all columns → the grid's align-items.
            # The container's attr is `verticalAlign` (block.json-declared; the
            # wrapper reads verticalAlign ?? alignItems at :238) — NOT `alignItems`
            # (undeclared → WP would discard it; the gate caught this).
            mapping = {'top': 'start', 'center': 'center', 'bottom': 'end', 'stretch': 'stretch'}
            if value not in mapping:
                raise GapError(f'verticalAlignment {value!r} unmapped')
            out['verticalAlign'] = mapping[value]
            accounting[key] = ('mapped', f'row verticalAlignment → verticalAlign:{mapping[value]}')
        elif key in ('align', 'backgroundColor', 'textColor', 'gradient', 'className',
                     'anchor', 'metadata', 'fontSize'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} (native / passthrough)')
        elif key == 'isStackedOnMobile':
            # Default true = stack (gridTemplateColumnsMobile:1fr, already set).
            # false = keep the desktop columns on mobile → drop the mobile override.
            if value is False:
                out.pop('gridTemplateColumnsMobile', None)
            accounting[key] = ('mapped', f'isStackedOnMobile:{value} → mobile stack {value}')
        else:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = (serialize_comment('sgs/container', out, void=False)
                   + inner
                   + serialize_closer('sgs/container'))
    return TransformResult(replacement, out, 'sgs/container', accounting, notes)
