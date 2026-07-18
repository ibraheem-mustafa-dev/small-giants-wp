#!/usr/bin/env python3
"""core/row -> sgs/container (Track C pairing module).

`core/row` is WP's horizontal FLEX variation of `core/group`
(`layout:{type:'flex', orientation:'horizontal', justifyContent, flexWrap}`).
Its serialised markup is otherwise attr-for-attr identical to core/group's —
same style groups, same tagName/backgroundColor/etc — so this module is a
thin DELEGATION to `group_pairing.transform()` (DRY: one flex-layout
decomposition, not two copies) rather than a re-implementation.

The only work here is NORMALISING the node's `layout` object before handing
it to group_pairing, so `_map_layout` sees a proper flex/horizontal shape:
  - no `layout` at all, or `layout` missing `type`  -> synthesise
    {type:'flex', orientation:'horizontal'} (Row's implicit default).
  - `layout.type` already 'flex'                     -> respected as-authored
    (an explicit orientation/justifyContent/flexWrap on the node wins).
  - anything else (`type` present and not 'flex')     -> GapError; a Row node
    with a non-flex layout type would be malformed core markup, not a real
    case to silently coerce.

horizontal is sgs/container's flex default (no `flexDirection` emitted —
`_map_layout` only sets `flexDirection:'column'` for `orientation:'vertical'`),
so a plain Row with no justifyContent/flexWrap maps to bare `layout:'flex'`.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError  # noqa: E402
from pairings import group_pairing  # noqa: E402


class _ShimNode:
    """Read-only clone of a BlockNode with a normalised `attrs.layout`.

    group_pairing.transform() only reads `node.attrs` and passes `node`
    through to `inner_blocks_markup(node, text)`, which uses the node's
    span/children/void — all identity, not attrs — so forwarding the
    ORIGINAL node for everything except `.attrs` is safe and avoids
    re-implementing BlockNode's parsing internals.
    """

    __slots__ = ('_orig', 'attrs')

    def __init__(self, orig, attrs):
        self._orig = orig
        self.attrs = attrs

    def __getattr__(self, item):
        return getattr(self._orig, item)


def transform(node, text):
    attrs_in = dict(node.attrs or {})
    layout = dict(attrs_in.get('layout') or {})
    lt = layout.get('type')

    if lt is None:
        layout = {**layout, 'type': 'flex', 'orientation': 'horizontal'}
    elif lt == 'flex':
        layout.setdefault('orientation', 'horizontal')
    else:
        raise GapError(f'core/row with layout.type={lt!r} is non-standard '
                       f'(Row is always a flex layout) — extend before swapping')

    had_layout = 'layout' in (node.attrs or {})
    attrs_in['layout'] = layout
    shim = _ShimNode(node, attrs_in)
    result = group_pairing.transform(shim, text)
    detail = 'core/row -> flex-horizontal; ' + result.accounting['layout'][1]
    if had_layout:
        # source node DID carry an explicit layout attr — keep the accounting
        # entry so the driver's gate matches it against the source key.
        result.accounting['layout'] = (result.accounting['layout'][0], detail)
    else:
        # layout was SYNTHESISED (the node had none) — it is not a source
        # attr, so the accounting entry must not claim to explain one (the
        # driver's gate flags any accounting key absent from source attrs).
        del result.accounting['layout']
    result.notes.append(f'core/row -> flex-horizontal ({detail})')
    return result
