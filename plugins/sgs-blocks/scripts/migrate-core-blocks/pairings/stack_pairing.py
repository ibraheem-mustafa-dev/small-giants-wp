#!/usr/bin/env python3
"""core/stack -> sgs/container (Track C pairing module).

`core/stack` is WP's vertical FLEX variation of `core/group`
(`layout:{type:'flex', orientation:'vertical'}`). Like Row, its serialised
markup is otherwise attr-for-attr identical to core/group's, so this module
DELEGATES to `group_pairing.transform()` after normalising the node's
`layout` object to a proper flex/vertical shape (DRY — one flex-layout
decomposition shared by group/row/stack, not three copies).

Normalisation:
  - no `layout` at all, or `layout` missing `type`  -> synthesise
    {type:'flex', orientation:'vertical'} (Stack's implicit default).
  - `layout.type` already 'flex'                     -> respected as-authored;
    if orientation is absent, default to 'vertical' (Stack's own default),
    but an explicit `orientation:'horizontal'` on the node (unusual, but not
    impossible after manual editing) is passed through as-authored rather
    than silently overwritten.
  - anything else (`type` present and not 'flex')     -> GapError.

`_map_layout` emits `flexDirection:'column'` for `orientation:'vertical'`,
so a plain Stack maps to `layout:'flex'` + `flexDirection:'column'`. An
explicit `justifyContent` on the node is respected via the shared
JUSTIFY_MAP/GapError behaviour in group_pairing — unchanged here.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError  # noqa: E402
from pairings import group_pairing  # noqa: E402


class _ShimNode:
    """Read-only clone of a BlockNode with a normalised `attrs.layout`.

    See row_pairing._ShimNode for the identical rationale: group_pairing
    only reads `node.attrs` directly; everything else (span/children/void,
    used by `inner_blocks_markup`) is forwarded to the original node.
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
        layout = {**layout, 'type': 'flex', 'orientation': 'vertical'}
    elif lt == 'flex':
        layout.setdefault('orientation', 'vertical')
    else:
        raise GapError(f'core/stack with layout.type={lt!r} is non-standard '
                       f'(Stack is always a flex layout) — extend before swapping')

    had_layout = 'layout' in (node.attrs or {})
    attrs_in['layout'] = layout
    shim = _ShimNode(node, attrs_in)
    result = group_pairing.transform(shim, text)
    detail = 'core/stack -> flex-vertical; ' + result.accounting['layout'][1]
    if had_layout:
        result.accounting['layout'] = (result.accounting['layout'][0], detail)
    else:
        del result.accounting['layout']
    result.notes.append(f'core/stack -> flex-vertical ({detail})')
    return result
