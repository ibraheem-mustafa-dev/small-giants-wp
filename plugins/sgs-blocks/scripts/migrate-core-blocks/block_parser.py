#!/usr/bin/env python3
"""Span-preserving WordPress block-comment parser.

Port of the delimiter grammar from WP core's block parser
(`WP_Block_Parser`): openers `<!-- wp:ns/name {attrs} -->`, closers
`<!-- /wp:ns/name -->`, and void blocks `<!-- wp:ns/name {attrs} /-->`.
A namespace-less name is implicitly `core/`.

Every node records exact character offsets into the source text, so a
transformer can replace one block's span and leave every other byte of
the file untouched (pattern PHP headers, whitespace, sibling blocks).
Nothing here normalises or re-serialises untouched content.
"""

import json
import re

# Tempered-dot attrs match, as in WP core: consume up to the `}` that is
# followed by whitespace and the comment close (optionally void `/-->`).
DELIMITER_RE = re.compile(
    r'<!--\s+(?P<closer>/)?wp:(?P<namespace>[a-z][a-z0-9_-]*/)?'
    r'(?P<name>[a-z][a-z0-9_-]*)\s+'
    r'(?P<attrs>{(?:(?!}\s+/?-->).)*}\s+)?'
    r'(?P<void>/)?-->',
    re.S,
)


class BlockNode:
    """One block instance with exact source spans."""

    __slots__ = (
        'name', 'attrs', 'attrs_raw', 'start', 'end',
        'opener_end', 'closer_start', 'void', 'children', 'parent',
    )

    def __init__(self, name, attrs, attrs_raw, start, opener_end, void):
        self.name = name              # fully qualified, e.g. 'core/paragraph'
        self.attrs = attrs            # dict (possibly {}) or None on JSON error
        self.attrs_raw = attrs_raw    # raw JSON text as authored, or None
        self.start = start            # offset of '<!--' of the opener
        self.opener_end = opener_end  # offset just past opener '-->'
        self.closer_start = None      # offset of '<!--' of the closer
        self.end = opener_end         # offset just past closer '-->' (or opener if void)
        self.void = void
        self.children = []
        self.parent = None

    def inner_html_span(self):
        """(start, end) of everything between opener and closer; None if void."""
        if self.void or self.closer_start is None:
            return None
        return (self.opener_end, self.closer_start)

    def depth(self):
        d, p = 0, self.parent
        while p is not None:
            d, p = d + 1, p.parent
        return d


class BlockParseError(Exception):
    pass


def parse_blocks(text, path='<string>'):
    """Parse text into a list of top-level BlockNodes (with children).

    Raises BlockParseError on unbalanced delimiters — a malformed pattern
    must fail loudly, never be silently mis-transformed.
    """
    roots, stack = [], []
    for m in DELIMITER_RE.finditer(text):
        ns = m.group('namespace') or 'core/'
        name = ns + m.group('name')
        if m.group('closer'):
            if not stack:
                raise BlockParseError(
                    f'{path}: closer {name} at offset {m.start()} with no open block')
            node = stack.pop()
            if node.name != name:
                raise BlockParseError(
                    f'{path}: closer {name} at offset {m.start()} does not match '
                    f'open block {node.name} (opened at {node.start})')
            node.closer_start = m.start()
            node.end = m.end()
            continue

        attrs_raw = m.group('attrs')
        attrs_raw = attrs_raw.strip() if attrs_raw else None
        if attrs_raw is None:
            attrs = {}
        else:
            try:
                attrs = json.loads(attrs_raw)
            except json.JSONDecodeError:
                attrs = None  # recorded, callers must treat as un-transformable
        node = BlockNode(name, attrs, attrs_raw, m.start(), m.end(), bool(m.group('void')))
        if stack:
            node.parent = stack[-1]
            stack[-1].children.append(node)
        else:
            roots.append(node)
        if not node.void:
            stack.append(node)

    if stack:
        raise BlockParseError(
            f'{path}: unclosed block {stack[-1].name} opened at offset {stack[-1].start}')
    return roots


def walk(nodes):
    """Depth-first iterator over a node list."""
    for n in nodes:
        yield n
        yield from walk(n.children)


def inner_blocks_markup(node, text):
    """Span of ONLY the child blocks' markup, excluding whatever raw text sat
    between the opener and the first child / after the last child.

    WHY this exists: every sgs block is dynamic. A wrapper sgs block (e.g.
    sgs/container, sgs/multi-button) has a `save` that returns nothing but
    `<InnerBlocks.Content/>` -- no wrapper div of its own -- and a leaf sgs
    block's `save` is null. So the markup carried between a migrated sgs
    block's delimiters must be ONLY its child blocks, never the source core
    block's own save-wrapper `<div class="wp-block-...">...</div>` (core's
    static save() DOES render that div, and `node.inner_html_span()` -- the
    raw text between the opener and closer comments -- includes it verbatim).
    Carrying that div through fails block validation once the migrated block
    renders on a real WP page (sgs/container's InnerBlocks.Content produces
    no such div, so the stray div reads as "unexpected content").

    Returns '' if the node has no children (nothing to carry -- callers that
    need to preserve non-block content, e.g. bare text, must do so
    separately; this helper never returns raw non-block text).
    """
    if not node.children:
        return ''
    return text[node.children[0].start:node.children[-1].end]


def serialize_comment(name, attrs, void=False):
    """Build a `<!-- wp:... -->` opener (or void delimiter) the way WP does.

    Compact JSON with a single space padding, matching core serialisation:
    `<!-- wp:sgs/text {"a":1} -->`. Names in the core/ namespace drop the
    prefix, matching how core itself serialises.
    """
    short = name[5:] if name.startswith('core/') else name
    attr_part = ''
    if attrs:
        attr_part = ' ' + json.dumps(attrs, ensure_ascii=False, separators=(',', ':'))
    tail = ' /-->' if void else ' -->'
    return f'<!-- wp:{short}{attr_part}{tail}'


def serialize_closer(name):
    short = name[5:] if name.startswith('core/') else name
    return f'<!-- /wp:{short} -->'
