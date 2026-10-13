#!/usr/bin/env python3
"""core/list (with its core/list-item children) -> sgs/icon-list (Track C pairing module).

PARENT CONSUMES CHILD: core/list is one block whose content is a run of
core/list-item inner blocks. sgs/icon-list is a single dynamic block whose
content is its `items` array attribute, so this module reads every
core/list-item child and emits ONE void `<!-- wp:sgs/icon-list {...} /-->`
that replaces the whole core/list span (children included). An orphan
core/list-item (no core/list parent) is refused by list_item_pairing.py.

Ground truth (icon-list/block.json + render.php + includes/helpers-list-markers.php):
  items[]      {text, url, newTab, description, iconSource, iconName, ...}.
               `text` renders through wp_kses_post (inline HTML survives); when
               the item has a `url` the text renders inside the item's own
               <a class="sgs-icon-list__item-link"> through wp_kses with `a`
               removed, so a nested anchor is impossible.
  markerType   icon | emoji | bullet | numbered | none (render.php allow-lists
               it via sgs_list_marker_sanitise_type, default 'icon').
               `numbered` renders a real <ol>; `bullet` a native disc marker.
  gap          spacing preset slug ("20") or a CSS length; default "20".
  padding / margin  per-device box objects {desktop:{top,right,bottom,left}}.
  textColour / backgroundColour  typed colour attrs (supports.color sub-flags
               are all false, so core's textColor/backgroundColor and
               style.color never render on this block and must be mapped).
  item*        the `item` typography family (sgs_typography_css_rule on the
               <li>): itemFontSize (per-device object; a string tier is a
               preset slug or CSS length), itemFontFamily, itemFontWeight,
               itemFontStyle, itemLineHeight (number) + itemLineHeightUnit,
               itemLetterSpacing (per-device object) + unit,
               itemTextTransform, itemTextDecoration.

Mapping rules:
  * unordered list -> markerType "bullet" (core paints a native disc bullet,
    so this is the faithful look); `is-style-no-bullets` in className ->
    markerType "none" (the token is stripped from the passthrough className).
  * ordered list -> markerType "numbered"; `start`, `reversed` and `type`
    have no sgs/icon-list equivalent, so a non-default value is refused.
  * a list item whose whole content is ONE <a> carrying only href (and
    target="_blank" / a rel) becomes {text, url[, newTab]} so the link is an
    editable item link; any other inline HTML stays verbatim in `text`.
  * core lists put no gap between items, so `gap` is emitted as "0" unless
    the source set style.spacing.blockGap (author intent, mapped to `gap`).

Refused (GapError, the instance stays core and is reported): nested lists
(sgs/icon-list items are flat, so a nested list cannot be represented without
dropping content), list items with their own attrs, content outside the
list items, ordered-list numbering options, block bindings, preset
gradients, style.border, style.elements and any attr or style group this
module does not know.
"""

import json
import re
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError, TransformResult  # noqa: E402
from pairings.typography_common import split_length  # noqa: E402

TARGET = 'sgs/icon-list'

# The <ul>/<ol> save wrapper core/list emits around its list-item children.
LIST_WRAPPER_RE = re.compile(r'^\s*<(ul|ol)\b[^>]*>\s*</\1>\s*$', re.I | re.S)
# A whole legacy list (pre-WP 6.1 markup: plain <li>s, no list-item blocks).
LEGACY_LIST_RE = re.compile(r'^\s*<(ul|ol)\b[^>]*>(?P<inner>.*)</\1>\s*$', re.I | re.S)
LI_RE = re.compile(r'<li\b[^>]*>(.*?)</li>', re.I | re.S)
LI_TAG_RE = re.compile(r'^\s*<li\b[^>]*>(?P<inner>.*)</li>\s*$', re.I | re.S)
NESTED_LIST_RE = re.compile(r'<(ul|ol)\b', re.I)
SINGLE_ANCHOR_RE = re.compile(r'^<a\b(?P<attrs>[^>]*)>(?P<inner>.*)</a>$', re.I | re.S)
HTML_ATTR_RE = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|\'([^\']*)\')')
SPACING_PRESET_RE = re.compile(r'^var:preset\|spacing\|([a-z0-9-]+)$')
NO_BULLETS_RE = re.compile(r'\bis-style-no-bullets\b')
DEFAULT_STYLE_RE = re.compile(r'\bis-style-default\b')


def _split_class(class_name):
    """Return (no_bullets, remaining_className_or_None)."""
    if not class_name:
        return False, None
    no_bullets = bool(NO_BULLETS_RE.search(class_name))
    remaining = DEFAULT_STYLE_RE.sub('', NO_BULLETS_RE.sub('', class_name))
    remaining = re.sub(r'\s+', ' ', remaining).strip() or None
    return no_bullets, remaining


def _item_from_html(inner_html):
    """Build one sgs/icon-list item from a list item's inner HTML."""
    html = inner_html.strip()
    if not html:
        raise GapError('a list item is empty; an empty sgs/icon-list item would render a blank row')
    if NESTED_LIST_RE.search(html):
        raise GapError('a list item holds a nested list; sgs/icon-list items are flat, so the nested '
                       'list cannot be represented without dropping content')
    m = SINGLE_ANCHOR_RE.match(html)
    if m and '<a' not in m.group('inner').lower():
        attrs = {}
        for am in HTML_ATTR_RE.finditer(m.group('attrs')):
            attrs[am.group(1).lower()] = am.group(2) if am.group(2) is not None else am.group(3)
        leftover = HTML_ATTR_RE.sub('', m.group('attrs')).strip()
        if not leftover and 'href' in attrs and set(attrs) <= {'href', 'target', 'rel'}:
            target = attrs.get('target')
            if target in (None, '_blank'):
                item = {'text': m.group('inner').strip(), 'url': attrs['href']}
                if target == '_blank':
                    item['newTab'] = True
                return item
    # Anything else (several links, an anchor with a class, inline formatting)
    # stays verbatim: render.php echoes `text` through wp_kses_post.
    return {'text': html}


def _items_from_children(node, text):
    items = []
    covered = []
    for child in node.children:
        if child.name != 'core/list-item':
            raise GapError(f'core/list holds a {child.name} child; only core/list-item children map to '
                           f'sgs/icon-list items')
        if child.attrs is None:
            raise GapError('a core/list-item has unparseable attrs JSON')
        if child.attrs:
            raise GapError(f'a core/list-item carries its own attrs {sorted(child.attrs)}; sgs/icon-list '
                           f'items have no per-item class, anchor or style')
        if child.children:
            raise GapError('a list item holds a nested list; sgs/icon-list items are flat, so the nested '
                           'list cannot be represented without dropping content')
        span = child.inner_html_span()
        raw = text[span[0]:span[1]] if span else ''
        m = LI_TAG_RE.match(raw)
        if not m:
            raise GapError('a core/list-item is not a single <li> element; cannot extract its text safely')
        items.append(_item_from_html(m.group('inner')))
        covered.append((child.start, child.end))

    # Everything inside the list that is NOT a list-item block must be only
    # the <ul>/<ol> save wrapper; anything else would be silently lost.
    span = node.inner_html_span()
    remainder, pos = [], span[0]
    for start, end in covered:
        remainder.append(text[pos:start])
        pos = end
    remainder.append(text[pos:span[1]])
    if not LIST_WRAPPER_RE.match(''.join(remainder)):
        raise GapError('core/list holds content outside its list items (beyond the <ul>/<ol> wrapper); '
                       'refusing rather than dropping it')
    return items


def _items_from_legacy(node, text):
    span = node.inner_html_span()
    raw = text[span[0]:span[1]] if span else ''
    m = LEGACY_LIST_RE.match(raw)
    if not m:
        raise GapError('core/list has no list-item blocks and its markup is not a single <ul>/<ol>')
    inner = m.group('inner')
    if NESTED_LIST_RE.search(inner):
        raise GapError('a list item holds a nested list; sgs/icon-list items are flat, so the nested '
                       'list cannot be represented without dropping content')
    if LI_RE.sub('', inner).strip():
        raise GapError('the legacy list holds content outside its <li> elements; refusing rather than '
                       'dropping it')
    items = [_item_from_html(li) for li in LI_RE.findall(inner)]
    if not items:
        raise GapError('core/list has no items')
    return items


def _box(value, label):
    if not isinstance(value, dict):
        raise GapError(f'style.spacing.{label} {value!r} is not a per-side object')
    unknown = set(value) - {'top', 'right', 'bottom', 'left'}
    if unknown:
        raise GapError(f'style.spacing.{label} has unknown sides {sorted(unknown)}')
    return {'desktop': dict(value)}


def _gap(value):
    if not isinstance(value, str):
        raise GapError(f'style.spacing.blockGap {value!r} is not a single value (per-axis gaps have no '
                       f'sgs/icon-list mapping)')
    m = SPACING_PRESET_RE.match(value.strip())
    if m:
        return m.group(1)
    if split_length(value) is None:
        raise GapError(f'style.spacing.blockGap {value!r} is neither a spacing preset nor a CSS length')
    return value.strip()


def _map_typography(typo, out, detail):
    for key, value in (typo or {}).items():
        if key == 'fontSize':
            out['itemFontSize'] = {'desktop': value}
            detail.append('style.typography.fontSize -> itemFontSize.desktop (beats a preset slug, as in core)')
        elif key == 'lineHeight':
            parsed = split_length(str(value))
            if not parsed:
                raise GapError(f'style.typography.lineHeight {value!r} is not a number or length')
            out['itemLineHeight'], out['itemLineHeightUnit'] = parsed
            detail.append('style.typography.lineHeight -> itemLineHeight + unit')
        elif key == 'letterSpacing':
            parsed = split_length(str(value))
            if not parsed:
                raise GapError(f'style.typography.letterSpacing {value!r} is not a CSS length')
            out['itemLetterSpacing'] = {'desktop': parsed[0]}
            out['itemLetterSpacingUnit'] = parsed[1] or 'em'
            detail.append('style.typography.letterSpacing -> itemLetterSpacing + unit')
        elif key == 'fontWeight':
            out['itemFontWeight'] = str(value)
            detail.append('style.typography.fontWeight -> itemFontWeight')
        elif key == 'fontStyle':
            if value not in ('normal', 'italic'):
                raise GapError(f'style.typography.fontStyle {value!r} outside the itemFontStyle values')
            out['itemFontStyle'] = value
            detail.append('style.typography.fontStyle -> itemFontStyle')
        elif key == 'textTransform':
            if value not in ('none', 'uppercase', 'lowercase', 'capitalize'):
                raise GapError(f'style.typography.textTransform {value!r} outside the itemTextTransform enum')
            out['itemTextTransform'] = value
            detail.append('style.typography.textTransform -> itemTextTransform')
        elif key == 'textDecoration':
            if value not in ('none', 'underline', 'line-through'):
                raise GapError(f'style.typography.textDecoration {value!r} outside the itemTextDecoration enum')
            out['itemTextDecoration'] = value
            detail.append('style.typography.textDecoration -> itemTextDecoration')
        else:
            raise GapError(f'style.typography.{key} has no sgs/icon-list mapping')


def serialize_void(name, attrs):
    """`<!-- wp:name {attrs} /-->` with `--` escaped the way WP's serialiser
    does, so item HTML can never close the block comment early."""
    body = json.dumps(attrs, ensure_ascii=False, separators=(',', ':')).replace('--', '\\u002d\\u002d')
    return f'<!-- wp:{name} {body} /-->'


def transform(node, text):
    attrs_in = node.attrs
    if attrs_in is None:
        raise GapError('core/list attrs JSON is unparseable')
    # The engine converts leaves first, so a nested list would otherwise be
    # swapped inside its parent's core/list-item (which accepts only a list)
    # before the parent refuses. Refuse it here so the whole tree stays core.
    if node.parent is not None and node.parent.name == 'core/list-item':
        raise GapError('this list is nested inside a list item; sgs/icon-list items are flat, so the '
                       'nested list cannot be represented without dropping content')
    out = {}
    accounting = {}
    notes = []

    items = _items_from_children(node, text) if node.children else _items_from_legacy(node, text)

    ordered = bool(attrs_in.get('ordered'))
    no_bullets, remaining_class = _split_class(attrs_in.get('className'))
    if ordered:
        marker = 'numbered'
    elif no_bullets:
        marker = 'none'
    else:
        marker = 'bullet'
    out['markerType'] = marker
    out['items'] = items
    out['gap'] = '0'
    notes.append(f'{len(items)} item(s); markerType "{marker}"')

    typography_detail = []
    for key, value in attrs_in.items():
        if key == 'ordered':
            accounting[key] = ('mapped', f'ordered={bool(value)} -> markerType "{marker}"')
        elif key == 'start':
            if value in (None, 1):
                accounting[key] = ('dropped', 'start=1 is the default numbering, so nothing changes')
            else:
                raise GapError(f'start {value!r}: sgs/icon-list numbering always starts at 1')
        elif key == 'reversed':
            if value:
                raise GapError('reversed numbering has no sgs/icon-list equivalent')
            accounting[key] = ('dropped', 'reversed=false is the default numbering order')
        elif key == 'type':
            if value in (None, '', '1', 'decimal'):
                accounting[key] = ('dropped', 'decimal numbering is sgs/icon-list numberFormat\'s default')
            else:
                raise GapError(f'list type {value!r} (letters or roman numerals) has no sgs/icon-list '
                               f'numberFormat equivalent')
        elif key == 'values':
            accounting[key] = ('dropped', 'legacy serialised HTML copy of the items; the items are read '
                                          'from the list markup itself')
        elif key == 'placeholder':
            accounting[key] = ('dropped', 'editor-only placeholder text, never rendered')
        elif key == 'className':
            if remaining_class:
                out['className'] = remaining_class
            accounting[key] = ('mapped', 'className passthrough; is-style-no-bullets -> markerType "none", '
                                         'is-style-default stripped')
        elif key == 'anchor':
            out[key] = value
            accounting[key] = ('mapped', 'anchor passthrough')
        elif key == 'metadata':
            if (value or {}).get('bindings'):
                raise GapError('metadata.bindings present; sgs/icon-list registers no bindable attribute')
            out[key] = value
            accounting[key] = ('mapped', 'metadata passthrough (no bindings)')
        elif key == 'textColor':
            out['textColour'] = value
            accounting[key] = ('mapped', 'textColour (preset slug; British spelling)')
        elif key == 'backgroundColor':
            out['backgroundColour'] = value
            accounting[key] = ('mapped', 'backgroundColour (preset slug)')
        elif key == 'gradient':
            raise GapError(f'gradient {value!r} is a preset gradient slug; sgs/icon-list takes a CSS '
                           f'gradient string and this module has no theme.json preset lookup')
        elif key == 'fontSize':
            if 'itemFontSize' not in out:
                out['itemFontSize'] = {'desktop': value}
            accounting[key] = ('mapped', 'fontSize preset slug -> itemFontSize.desktop (a string tier '
                                         'resolves through sgs_font_size_value)')
        elif key == 'fontFamily':
            out['itemFontFamily'] = value
            accounting[key] = ('mapped', 'fontFamily preset slug -> itemFontFamily')
        elif key == 'style':
            detail = []
            for group, gv in (value or {}).items():
                if group == 'spacing':
                    for sk, sv in (gv or {}).items():
                        if sk == 'padding':
                            out['padding'] = _box(sv, 'padding')
                            detail.append('style.spacing.padding -> padding.desktop')
                        elif sk == 'margin':
                            out['margin'] = _box(sv, 'margin')
                            detail.append('style.spacing.margin -> margin.desktop')
                        elif sk == 'blockGap':
                            out['gap'] = _gap(sv)
                            detail.append('style.spacing.blockGap -> gap (author intent; core/list '
                                          'itself paints no gap between items)')
                        else:
                            raise GapError(f'style.spacing.{sk} has no sgs/icon-list mapping')
                elif group == 'typography':
                    _map_typography(gv, out, typography_detail)
                    detail.extend(typography_detail)
                elif group == 'color':
                    for ck, cv in (gv or {}).items():
                        if ck == 'text':
                            out['textColour'] = cv
                            detail.append('style.color.text -> textColour')
                        elif ck == 'background':
                            out['backgroundColour'] = cv
                            detail.append('style.color.background -> backgroundColour')
                        elif ck == 'gradient':
                            out['backgroundColourGradient'] = cv
                            detail.append('style.color.gradient -> backgroundColourGradient')
                        else:
                            raise GapError(f'style.color.{ck} has no sgs/icon-list mapping')
                else:
                    raise GapError(f'style.{group} has no sgs/icon-list mapping; extend before swapping')
            accounting[key] = ('mapped', '; '.join(detail) or 'empty style')
        else:
            raise GapError(f'source attr "{key}" not handled by this module; extend the mapping')

    return TransformResult(serialize_void(TARGET, out), out, TARGET, accounting, notes)
