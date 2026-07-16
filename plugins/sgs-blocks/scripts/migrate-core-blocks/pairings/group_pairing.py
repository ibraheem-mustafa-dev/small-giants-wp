#!/usr/bin/env python3
"""core/group -> sgs/container (Track C pairing module).

PAIRED emit: container/save.js returns <InnerBlocks.Content/>, so the group's
inner blocks are carried verbatim between the sgs/container delimiters (a void
emit would silently drop every child — the load-bearing finding from qc-council
Rater A). The driver's leaf-first re-parse handles the 53 same-type-nested
groups.

THE LAYOUT DECOMPOSITION (qc-council Rater B): sgs/container's `layout` is a
STRING (''/grid/flex), NOT core's OBJECT — passing the object through does not
crash, it just never matches 'flex'/'grid' and silently degrades to unstyled
block flow. So core's layout object is decomposed into the container's typed
attrs, verified against the wrapper (class-sgs-container-wrapper.php):
  {type:"default"}                        -> (nothing; full-width block flow)
  {type:"constrained"}                    -> contentWidth:"normal"  (~1200px cap)
  {type:"constrained", contentSize:"800px"} -> contentWidth:"800px" (literal)
  {type:"flex", justifyContent, orientation} -> layout:"flex" + justifyContent
                                             (+ flexDirection:"column" if vertical)
sgs/container is kind='section' (render.php:118), so contentWidth applies.

TAG FIDELITY: a core/group with NO tagName renders <div>; with tagName=X renders
<X>. sgs/container defaults to <section>, so a no-tagName group maps to
tagName:"div" to preserve the exact rendered tag (never silently div->section).
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment, serialize_closer  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

PASSTHROUGH_STYLE_GROUPS = ('spacing', 'border', 'color', 'typography')

# core justifyContent vocabulary -> sgs/container justifyContent enum.
JUSTIFY_MAP = {
    'left': 'flex-start',
    'right': 'flex-end',
    'center': 'center',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
}


def _map_layout(layout, out, accounting):
    lt = (layout or {}).get('type', 'default')
    detail = [f'layout.type={lt}']
    if lt == 'default':
        pass  # full-width block flow; contentWidth default 'full' = no cap
    elif lt == 'constrained':
        cs = layout.get('contentSize')
        out['contentWidth'] = cs if cs else 'normal'
        detail.append(f'contentWidth={out["contentWidth"]!r}')
    elif lt == 'flex':
        out['layout'] = 'flex'
        jc = layout.get('justifyContent')
        if jc is not None:
            if jc not in JUSTIFY_MAP:
                raise GapError(f'layout.justifyContent {jc!r} not in the sgs/container enum '
                               f'(would coerce to default and silently lose alignment)')
            out['justifyContent'] = JUSTIFY_MAP[jc]
            detail.append(f'justifyContent={out["justifyContent"]}')
        if layout.get('orientation') == 'vertical':
            out['flexDirection'] = 'column'
            detail.append('flexDirection=column')
        if layout.get('flexWrap'):
            out['flexWrap'] = layout['flexWrap']
    else:
        raise GapError(f'layout.type {lt!r} has no sgs/container mapping (only '
                       f'default/constrained/flex) — extend before swapping')
    accounting['layout'] = ('mapped', '; '.join(detail))


def transform(node, text):
    attrs_in = node.attrs or {}
    span = node.inner_html_span()
    inner = text[span[0]:span[1]] if span is not None else ''

    out = {}
    accounting = {}
    notes = []

    # tagName fidelity: preserve the exact rendered tag (no-tagName group = <div>).
    tag = attrs_in.get('tagName', 'div')
    if tag not in ('div', 'section', 'article', 'aside', 'main', 'nav', 'header', 'footer', 'figure'):
        raise GapError(f'tagName {tag!r} not in the sgs/container enum')
    out['tagName'] = tag
    if 'tagName' in attrs_in:
        accounting['tagName'] = ('mapped', f'tagName:{tag!r} (semantic tag preserved)')

    for key, value in attrs_in.items():
        if key == 'tagName':
            continue
        elif key == 'layout':
            _map_layout(value, out, accounting)
        elif key == 'style':
            style_out = {}
            detail = []
            for group, gv in (value or {}).items():
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = gv
                    detail.append(f'style.{group} 1:1 (native skip-serialised support)')
                elif group == 'dimensions':
                    # dimensions.minHeight → the container's OWN minHeight attr;
                    # dimensions.maxWidth → the container's maxWidth (the OUTER cap
                    # — Bean's rule: maxWidth governs the outer, NOT contentWidth).
                    for dk, dv in (gv or {}).items():
                        if dk == 'minHeight':
                            out['minHeight'] = dv
                        elif dk == 'maxWidth':
                            out['maxWidth'] = dv
                        else:
                            raise GapError(f'style.dimensions.{dk} has no sgs/container mapping')
                    detail.append('style.dimensions → minHeight/maxWidth attrs')
                else:
                    raise GapError(f'style.{group} has no sgs/container mapping — extend before swapping')
            if style_out:
                out['style'] = style_out
            accounting['style'] = ('mapped', '; '.join(detail) or 'empty style')
        elif key in ('backgroundColor', 'textColor', 'gradient', 'fontSize', 'align',
                     'className', 'anchor', 'metadata', 'layout'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} (native support / passthrough)')
        else:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = (serialize_comment('sgs/container', out, void=False)
                   + inner
                   + serialize_closer('sgs/container'))
    return TransformResult(replacement, out, 'sgs/container', accounting, notes)
