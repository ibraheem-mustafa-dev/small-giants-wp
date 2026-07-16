#!/usr/bin/env python3
"""Shared helpers for the core/heading + core/paragraph pairing modules.

Both cores store presentation in `style.typography.*` as raw CSS strings;
both SGS targets store it as TYPED attrs (number + unit companions). That
conversion is the schema transformation, and it is identical for both — so
it lives here rather than being copy-pasted (and drifting) per pairing.
"""

import re

TAG_RE = re.compile(r'^\s*<(?P<tag>[a-z0-9]+)\b[^>]*>(?P<inner>.*)</(?P=tag)>\s*$', re.S | re.I)
LENGTH_RE = re.compile(r'^(-?\d*\.?\d+)\s*([a-z%]*)$', re.I)


def inner_markup(node, text):
    """Return the inner HTML of the block's single semantic element.

    core/heading and core/paragraph both serialise as exactly one wrapping
    tag around RichText content; the SGS targets store that content as a
    string rendered through wp_kses_post, so inline markup carries verbatim.
    """
    span = node.inner_html_span()
    if not span:
        return ''
    raw = text[span[0]:span[1]]
    m = TAG_RE.match(raw)
    if not m:
        return None  # caller raises GapError — never guess at content
    return m.group('inner').strip()


def split_length(value):
    """"0.05em" -> (0.05, 'em'); "1.6" -> (1.6, ''). None when unparseable."""
    if not isinstance(value, str):
        return None
    m = LENGTH_RE.match(value.strip())
    if not m:
        return None
    num = float(m.group(1))
    if num.is_integer():
        num = int(num)
    return (num, m.group(2).lower())


def map_typography(typo, out, accounting_detail):
    """Map a core `style.typography` group onto typed SGS attrs.

    Returns a list of unmapped keys — the caller MUST refuse the instance if
    it is non-empty (never a silent drop). `out` is mutated in place.
    """
    unmapped = []
    for key, value in (typo or {}).items():
        if key == 'fontWeight':
            out['fontWeight'] = str(value)
        elif key == 'fontStyle':
            if value not in ('normal', 'italic'):
                unmapped.append(f'fontStyle:{value!r}')
                continue
            out['fontStyle'] = value
        elif key == 'textTransform':
            if value not in ('none', 'uppercase', 'lowercase', 'capitalize'):
                unmapped.append(f'textTransform:{value!r}')
                continue
            out['textTransform'] = value
        elif key == 'textDecoration':
            if value not in ('none', 'underline', 'line-through'):
                unmapped.append(f'textDecoration:{value!r}')
                continue
            out['textDecoration'] = value
        elif key == 'letterSpacing':
            parsed = split_length(value)
            if not parsed:
                unmapped.append(f'letterSpacing:{value!r}')
                continue
            out['letterSpacing'], unit = parsed[0], parsed[1]
            out['letterSpacingUnit'] = unit or 'em'
        elif key == 'lineHeight':
            parsed = split_length(value)
            if not parsed:
                unmapped.append(f'lineHeight:{value!r}')
                continue
            # Core line-height is unitless; '' is the PHP helper's unitless
            # sentinel (helpers-typography.php line-height unit_default '').
            out['lineHeight'], unit = parsed[0], parsed[1]
            out['lineHeightUnit'] = unit
        elif key == 'fontSize':
            # A CUSTOM size (raw CSS length / clamp()). The string branch of
            # sgs_font_size_value() accepts both verbatim. Core precedence:
            # style.typography.fontSize BEATS a top-level preset slug.
            out['fontSize'] = value
            accounting_detail.append('style.typography.fontSize overrides any preset slug (core precedence)')
        else:
            unmapped.append(key)
    return unmapped
