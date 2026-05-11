"""Spec 14 Phase 4 — generic role-based extraction strategies.

Each strategy reads a single slot from the live DOM (BeautifulSoup `section`) or
from the Playwright-captured `computed` styles dict, and returns a
`(value, confidence)` tuple. The dispatcher in `extract.py` picks the strategy
to call based on the slot's `role` field from the Layer 3 catalogue.

Confidence scale:
  1.0  - exact textContent / href / class match
  0.9  - computed-style match (from Playwright cascade)
  0.7  - fuzzy class probe / partial pattern match
  0.5  - type-fallback default
  0.3  - block.json declared default applied
  0.0  - no DOM element found; returns None for value

Public functions:
  text_content(section, selector)                -> (str | None, float)
  richtext_html(section, selector)               -> (str | None, float)
  attr_href(section, selector)                   -> (str | None, float)
  attr_src_image(section, selector, media_map)   -> (dict | None, float)
  computed_color(computed, viewport, selector)   -> (str | None, float)
  computed_px_int(computed, viewport, selector,
                  css_property)                   -> (int | None, float)
  computed_background_image(computed, viewport,
                            selector)             -> (str | None, float)
  enum_class_probe(section, selector,
                   enum_values)                   -> (str | None, float)
  boolean_visibility(section, selector)          -> (bool, float)
  attr_data(section, selector, data_attr)        -> (str | None, float)
  query_descriptor(section)                      -> (dict | None, float)

Dispatch table at module bottom (`ROLE_TO_STRATEGY`) maps Layer 2 role slugs
to the strategy function expected by the dispatcher.
"""
from __future__ import annotations
import re
from typing import Any


def _select(section, selector: str):
    """BS4 `select_one` with safe handling of complex selectors."""
    try:
        return section.select_one(selector)
    except Exception:
        return None


def text_content(section, selector: str) -> tuple[str | None, float]:
    """Read .textContent of the first matching element."""
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    txt = el.get_text(strip=True)
    return (txt, 1.0) if txt else (None, 0.0)


def richtext_html(section, selector: str) -> tuple[str | None, float]:
    """Read inner HTML preserving <strong>, <em>, <a>, <br>."""
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    inner = el.decode_contents().strip() if hasattr(el, 'decode_contents') else str(el)
    return (inner, 1.0) if inner else (None, 0.0)


def attr_href(section, selector: str) -> tuple[str | None, float]:
    """Read href attribute. Selector should target an <a> directly."""
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    href = el.get('href')
    return (href, 1.0) if href else (None, 0.0)


def attr_src_image(section, selector: str, media_map: dict | None = None) -> tuple[dict | None, float]:
    """Read <img src + alt + width + height + srcset>. Resolves through media_map.

    media_map: optional `{mockup_filename_or_relative_url: {id: int, url: str}}`
    map. When present, the resolved WP attachment id + canonical URL are
    written into the output so the SGS block can reference it server-side.
    """
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    src = el.get('src')
    if not src:
        return None, 0.0
    out: dict[str, Any] = {
        'url': src,
        'alt': el.get('alt') or '',
    }
    if el.get('width'):
        try:
            out['width'] = int(el['width'])
        except (TypeError, ValueError):
            pass
    if el.get('height'):
        try:
            out['height'] = int(el['height'])
        except (TypeError, ValueError):
            pass
    if el.get('srcset'):
        out['srcset'] = el['srcset']
    # media_map resolution: try basename + leading-slash + as-is variants
    if media_map:
        from pathlib import PurePosixPath
        key_candidates = [src, PurePosixPath(src).name, src.lstrip('./'), src.lstrip('/')]
        for key in key_candidates:
            if key in media_map:
                out['id'] = media_map[key].get('id')
                out['canonical_url'] = media_map[key].get('url')
                return out, 1.0
        return out, 0.7  # img found but media_map lookup missed
    return out, 0.9


def _get_computed(computed: dict, viewport: str, selector: str, prop: str) -> str | None:
    """Safe getter for the Playwright computed dict."""
    return (
        computed.get(viewport, {})
        .get(selector, {})
        .get(prop)
    )


def computed_color(computed: dict, viewport: str, selector: str,
                   prop: str = 'color') -> tuple[str | None, float]:
    """Read a computed colour value (rgb / rgba)."""
    v = _get_computed(computed, viewport, selector, prop)
    if v is None or v == '' or v == 'rgba(0, 0, 0, 0)':
        return None, 0.0
    return v, 0.9


def computed_px_int(computed: dict, viewport: str, selector: str, prop: str) -> tuple[int | None, float]:
    """Read a computed CSS prop and parse to int pixels."""
    v = _get_computed(computed, viewport, selector, prop)
    if v is None:
        return None, 0.0
    try:
        # 'Npx' or 'N.Mpx' or '0' or 'auto'/'normal'
        s = v.strip()
        if s in ('auto', 'normal', 'none', '0', '0px'):
            return 0, 0.9
        if s.endswith('px'):
            return int(float(s[:-2])), 0.9
        return int(float(s)), 0.7
    except (ValueError, TypeError):
        return None, 0.0


def computed_background_image(computed: dict, viewport: str,
                              selector: str) -> tuple[str | None, float]:
    """Read background-image (typically gradient or url(...))."""
    v = _get_computed(computed, viewport, selector, 'backgroundImage')
    if v is None or v == 'none' or v == '':
        return None, 0.0
    return v, 0.9


def enum_class_probe(section, selector: str,
                     enum_values: list[str]) -> tuple[str | None, float]:
    """Probe element's classList for any class matching `is-<value>` or
    `<base>--<value>`. Returns the first matching enum value, or None.
    """
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    classes = el.get('class', []) or []
    for v in enum_values:
        slug = v.lower().replace(' ', '-')
        if f'is-{slug}' in classes:
            return v, 1.0
        for c in classes:
            if c.endswith(f'--{slug}'):
                return v, 1.0
    return None, 0.3  # element exists but no matching modifier — likely default


def boolean_visibility(section, selector: str) -> tuple[bool, float]:
    """True if element is present in the section's DOM, else False.

    Distinct from CSS display:none — we only care about DOM presence here.
    """
    el = _select(section, selector)
    return (el is not None), 1.0


def attr_data(section, selector: str, data_attr: str) -> tuple[str | None, float]:
    """Read a data-* attribute (e.g. data-animation, data-variant)."""
    el = _select(section, selector)
    if el is None:
        return None, 0.0
    full = f'data-{data_attr.lstrip("data-")}'
    v = el.get(full)
    return (v, 1.0) if v is not None else (None, 0.0)


def query_descriptor(section, modifier_value: str | None = None) -> tuple[dict | None, float]:
    """For FR25 dynamic-link modifiers. Returns a descriptor object the
    sgs block can pass to WP_Query at render time.

    Caller-supplied `modifier_value` (e.g. ":latest-post(category=blog,limit=3)")
    is parsed into a structured dict. With no value, returns None — caller
    falls back to block.json `default`.
    """
    if not modifier_value:
        return None, 0.0
    # Lightweight parser: `:<key>(<arg=val,arg=val>)`
    m = re.match(r':(?P<verb>[\w-]+)(?:\((?P<args>[^)]*)\))?$', modifier_value)
    if not m:
        return {'raw': modifier_value, 'parsed': False}, 0.5
    args: dict[str, str] = {}
    if m.group('args'):
        for piece in m.group('args').split(','):
            piece = piece.strip()
            if '=' in piece:
                k, _, v = piece.partition('=')
                args[k.strip()] = v.strip()
    return {'verb': m.group('verb'), 'args': args, 'raw': modifier_value, 'parsed': True}, 1.0


# Dispatch table: Layer 2 role slug -> strategy callable + required argument shape.
# The dispatcher reads this; strategies are called with their declared arg names
# populated from (section, slot_selector, computed, viewport, media_map).
ROLE_TO_STRATEGY: dict[str, dict[str, Any]] = {
    'colour-text':         {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'color'},
    'colour-bg':           {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'backgroundColor'},
    'colour-border':       {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'borderTopColor'},
    'colour-gradient':     {'fn': computed_background_image, 'requires': ('computed', 'viewport', 'selector')},
    'number-css-px':       {'fn': computed_px_int,           'requires': ('computed', 'viewport', 'selector', 'prop'), 'prop': 'width'},
    'number-css-percent':  {'fn': computed_px_int,           'requires': ('computed', 'viewport', 'selector', 'prop'), 'prop': 'opacity'},
    'spacing-token':       {'fn': computed_px_int,           'requires': ('computed', 'viewport', 'selector', 'prop'), 'prop': 'paddingTop'},
    'shadow-preset':       {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'boxShadow'},
    'font-family-preset':  {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'fontFamily'},
    'font-size-preset':    {'fn': computed_px_int,           'requires': ('computed', 'viewport', 'selector', 'prop'), 'prop': 'fontSize'},
    'border-radius-token': {'fn': computed_px_int,           'requires': ('computed', 'viewport', 'selector', 'prop'), 'prop': 'borderTopLeftRadius'},
    'transition-preset':   {'fn': computed_color,            'requires': ('computed', 'viewport', 'selector'), 'prop': 'transition'},
    'image-object':        {'fn': attr_src_image,            'requires': ('section', 'selector', 'media_map')},
    'link-href':           {'fn': attr_href,                 'requires': ('section', 'selector')},
    'text-content':        {'fn': text_content,              'requires': ('section', 'selector')},
    'richtext-content':    {'fn': richtext_html,             'requires': ('section', 'selector')},
    'enum-class-probe':    {'fn': enum_class_probe,          'requires': ('section', 'selector', 'enum_values'), 'enum_values': []},
    'boolean-visibility':  {'fn': boolean_visibility,        'requires': ('section', 'selector')},
    'select-from-enum':    {'fn': attr_data,                 'requires': ('section', 'selector', 'data_attr'), 'data_attr': 'variant'},
    'query-descriptor':    {'fn': query_descriptor,          'requires': ('section', 'modifier_value'), 'modifier_value': None},
}


def dispatch(role: str, slot: dict, section, computed: dict | None,
             viewport: str, media_map: dict | None) -> tuple[Any, float, str]:
    """Resolve a single slot's value via the role-keyed dispatch table.

    Returns (value, confidence, strategy_label) where strategy_label is the
    function name used (for downstream observability + debugging).
    """
    entry = ROLE_TO_STRATEGY.get(role)
    if entry is None:
        return None, 0.0, f'no-strategy-for-role:{role}'
    fn = entry['fn']
    selector = slot.get('selector')
    requires = entry['requires']
    kwargs: dict[str, Any] = {}
    for arg in requires:
        if arg == 'section':
            kwargs['section'] = section
        elif arg == 'selector':
            kwargs['selector'] = selector
        elif arg == 'computed':
            kwargs['computed'] = computed or {}
        elif arg == 'viewport':
            kwargs['viewport'] = viewport
        elif arg == 'media_map':
            kwargs['media_map'] = media_map
        elif arg == 'prop':
            kwargs['prop'] = entry.get('prop')
        elif arg == 'enum_values':
            kwargs['enum_values'] = entry.get('enum_values', [])
        elif arg == 'data_attr':
            kwargs['data_attr'] = entry.get('data_attr', '')
        elif arg == 'modifier_value':
            kwargs['modifier_value'] = entry.get('modifier_value')
    try:
        value, confidence = fn(**kwargs)
    except Exception as e:
        return None, 0.0, f'{fn.__name__}:error:{type(e).__name__}'
    return value, confidence, fn.__name__


if __name__ == '__main__':
    # Smoke test
    from bs4 import BeautifulSoup
    html = '<section class="x"><h1>Hello</h1><a class="btn" href="/about">About</a><img src="/foo.png" alt="foo" width="100" height="50"></section>'
    s = BeautifulSoup(html, 'html.parser')
    sec = s.select_one('section.x')
    assert text_content(sec, 'h1') == ('Hello', 1.0)
    assert attr_href(sec, 'a.btn') == ('/about', 1.0)
    img, conf = attr_src_image(sec, 'img', None)
    assert img['url'] == '/foo.png' and img['alt'] == 'foo' and img['width'] == 100, img
    assert conf == 0.9
    assert boolean_visibility(sec, 'h1') == (True, 1.0)
    assert boolean_visibility(sec, 'h2') == (False, 1.0)
    print('extract_strategies.py self-test: 5/5 PASS')
