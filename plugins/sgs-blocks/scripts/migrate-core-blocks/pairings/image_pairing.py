#!/usr/bin/env python3
"""core/image → sgs/media transformer (Track C pairing module).

Schema transformation, not a rename: core/image is STATIC (content lives in
the inner `<figure>` HTML; presentation as preset classes + a `style` object),
sgs/media is DYNAMIC (`save: null` — everything must land in typed attrs in
the JSON delimiter, rendered by render.php).

Mapping (ground truth: media/block.json + render.php read 2026-07-15):
  <img src>                → imageUrl (string)
  <img alt>                → imageAlt (string)
  <figcaption>…            → caption (string)
  align "center|left|right"→ alignment (enum left|center|right; default left)
  width  ("120px" | {"all":"120px"}) → maxWidth  (unit-embedded string —
                             sgs_media_css_length accepts "120px" verbatim)
  height ("120px" | {"all":"120px"}) → height    (fixed CSS height + the
                             block's objectFit:"cover" default = same crop
                             behaviour as core's inline width/height styles)
  style.border.radius      → style.border.radius (sgs/media declares WP-native
                             __experimentalBorder with skipSerialization and
                             reads style.border.* in render.php — 1:1 carry)
  className (custom extras)→ className (core-generated wp-block-image /
                             size-* / align* classes are NOT carried — they
                             are core's rendering, not content)
  sizeSlug                 → DROPPED with reason: rendition selection is an
                             authoring-time concern; sgs/media bakes the
                             chosen rendition into imageUrl, so for an
                             explicit URL the rendered <img src> is identical.
                             Logged as a register gap-note either way.
"""

import json
import re
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

IMG_RE = re.compile(r'<img\b[^>]*>', re.S)
ATTR_RE = re.compile(r'([a-zA-Z-]+)\s*=\s*"([^"]*)"')
FIGCAPTION_RE = re.compile(r'<figcaption\b[^>]*>(.*?)</figcaption>', re.S)


def _length(value):
    """Normalise a core width/height value ("120px" or {"all":"120px"}) to a
    unit-embedded CSS length string."""
    if isinstance(value, dict):
        value = value.get('all', '')
    if not isinstance(value, str) or not value.strip():
        return ''
    return value.strip()


def transform(node, text):
    attrs_in = node.attrs or {}
    span = node.inner_html_span()
    inner = text[span[0]:span[1]] if span else ''

    img = IMG_RE.search(inner)
    if not img:
        raise GapError('no <img> in inner HTML — cannot extract imageUrl (manual review)')
    img_attrs = dict(ATTR_RE.findall(img.group(0)))
    src = img_attrs.get('src', '').strip()
    if not src:
        raise GapError('<img> has no src — cannot extract imageUrl (manual review)')

    out = {'imageUrl': src}
    accounting = {}
    notes = []

    alt = img_attrs.get('alt', '').strip()
    if alt:
        out['imageAlt'] = alt

    cap = FIGCAPTION_RE.search(inner)
    if cap:
        out['caption'] = re.sub(r'<[^>]+>', '', cap.group(1)).strip()

    if 'align' in attrs_in:
        align = attrs_in['align']
        if align not in ('left', 'center', 'right'):
            raise GapError(f'align "{align}" (wide/full?) has no sgs/media alignment mapping — design call')
        out['alignment'] = align
        accounting['align'] = ('mapped', 'alignment')

    if 'width' in attrs_in:
        w = _length(attrs_in['width'])
        if not w:
            raise GapError(f'width value {attrs_in["width"]!r} unparseable')
        out['maxWidth'] = w
        accounting['width'] = ('mapped', 'maxWidth (unit-embedded)')

    if 'height' in attrs_in:
        h = _length(attrs_in['height'])
        if not h:
            raise GapError(f'height value {attrs_in["height"]!r} unparseable')
        out['height'] = h
        accounting['height'] = ('mapped', 'height (fixed CSS height; objectFit cover default matches core crop)')

    if 'style' in attrs_in:
        style = attrs_in['style']
        known = {}
        radius = (style.get('border') or {}).get('radius') if isinstance(style, dict) else None
        if radius is not None:
            known['border'] = {'radius': radius}
        leftovers = {k: v for k, v in (style or {}).items() if k != 'border'} if isinstance(style, dict) else style
        extra_border = {k: v for k, v in (style.get('border') or {}).items() if k != 'radius'} if isinstance(style, dict) else {}
        if leftovers or extra_border:
            raise GapError(
                f'style carries unmapped groups {list(leftovers) + list(extra_border)} — extend the '
                f'mapping before swapping this instance (never a silent drop)')
        if known:
            out['style'] = known
        accounting['style'] = ('mapped', 'style.border.radius 1:1 (native skip-serialised border support)')

    if 'sizeSlug' in attrs_in:
        accounting['sizeSlug'] = (
            'dropped',
            'rendition selection is authoring-time; explicit imageUrl renders the identical <img src>')
        notes.append('gap-note: sizeSlug has no sgs/media equivalent — register entry, rendered output unchanged')

    if 'className' in attrs_in:
        out['className'] = attrs_in['className']
        accounting['className'] = ('mapped', 'className passthrough')

    for key in attrs_in:
        if key not in accounting:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = serialize_comment('sgs/media', out, void=True)
    return TransformResult(replacement, out, 'sgs/media', accounting, notes)
