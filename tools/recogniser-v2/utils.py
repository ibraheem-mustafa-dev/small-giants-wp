"""Shared utilities used by extract.py + overrides/hero.py + extract_strategies.py.

Pure helpers — no DOM / Playwright dependencies. Keeps the three modules
free of cyclic imports.
"""
from __future__ import annotations
import re


# ---------------------------------------------------------------------------
# Numeric parsing
# ---------------------------------------------------------------------------

def _px_to_int(v):
    """Parse '52px' or '52' -> 52 (int). Returns None if non-numeric."""
    if v is None:
        return None
    s = str(v).strip()
    if s.endswith('px'):
        s = s[:-2]
    try:
        return int(round(float(s)))
    except (ValueError, TypeError):
        return None


def _px_to_float(v):
    if v is None:
        return None
    s = str(v).strip()
    if s.endswith('px'):
        s = s[:-2]
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _line_height_to_em(value, font_size_px):
    """Convert a computed line-height to em (unitless ratio)."""
    if value is None or value == 'normal' or font_size_px in (None, 0):
        return None
    px = _px_to_float(value)
    if px is None:
        return None
    return round(px / font_size_px, 3)


# ---------------------------------------------------------------------------
# BS4 heuristic extractors (BS4 import is light + safe)
# ---------------------------------------------------------------------------

def text(el, *selectors):
    """Return textContent of the first matching selector, or None."""
    for sel in selectors:
        m = el.select_one(sel)
        if m:
            return m.get_text(strip=True)
    return None


def attr(el, sel, attribute):
    """Return attribute value of the first matching selector, or None."""
    m = el.select_one(sel)
    return m.get(attribute) if m else None


def img_object(el, *selectors, media_map=None):
    """Return a WP-shaped image object {id, url, alt}.

    media_map (optional): {mockup_filename: {id, url}} resolves a mockup-relative
    src to a real WP attachment.
    """
    media_map = media_map or {}
    for sel in selectors:
        m = el.select_one(sel)
        if m and m.name == 'img' and m.get('src'):
            src = m.get('src')
            filename = src.rsplit('/', 1)[-1]
            mapped = media_map.get(filename)
            if mapped:
                return {'id': mapped['id'], 'url': mapped['url'], 'alt': m.get('alt', '')}
            return {'id': None, 'url': src, 'alt': m.get('alt', '')}
    return None


# ---------------------------------------------------------------------------
# CSS rule classification
# ---------------------------------------------------------------------------

UNIVERSAL_HANDLED_SELECTORS = frozenset({
    '*, *::before, *::after',
    '*',
    'img',
    'a',
    'h1, h2, h3',
    'h1, h2, h3, h4, h5, h6',
    # Mockup-structural classes consumed by attribute extraction
    '.sgs-hero',
    '.sgs-hero--desktop',
    '.sgs-hero--mobile',
    '.sgs-hero__image--mobile',
    '.sgs-hero__content',
    '.sgs-hero__content h1',
    '.sgs-hero__content .sgs-hero__sub',
    '.sgs-hero__copy',
    '.sgs-hero__copy h1',
    '.sgs-hero__copy .sgs-hero__sub',
    '.sgs-hero__copy .sgs-hero__ctas',
    '.sgs-hero__ctas',
    '.sgs-hero__image',
    '.sgs-hero__image img',
    '.btn-primary',
    '.btn-primary:hover',
    '.btn-secondary',
    '.btn-secondary:hover',
    '.btn',
    '.btn-ghost',
    '.btn-ghost:hover',
    '.sgs-section-heading__label',
})

UNIVERSAL_HANDLED_BARE = frozenset({
    '.sgs-hero--mobile',
    '.sgs-hero--desktop',
    '.sgs-hero__copy',
    '.sgs-hero__copy h1',
    '.sgs-hero__copy .sgs-hero__sub',
    '.sgs-hero__copy .sgs-hero__ctas',
    '.sgs-hero__image',
    '.sgs-hero__image img',
})


def _strip_media_prefix(selector_key):
    """Given '@media (min-width: 768px) .sgs-hero__copy h1' return '.sgs-hero__copy h1'."""
    if '@media' in selector_key:
        # Find the closing paren of the media query
        depth = 0
        for i, ch in enumerate(selector_key):
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    return selector_key[i + 1:].strip()
    return selector_key


def is_universal_handled(selector_key):
    """True if the CSS rule is consumed by attribute extraction (skip scoped emit)."""
    bare = _strip_media_prefix(selector_key).strip()
    if bare in UNIVERSAL_HANDLED_SELECTORS:
        return True
    if bare in UNIVERSAL_HANDLED_BARE:
        return True
    if 'prefers-reduced-motion' in selector_key:
        return True
    if 'focus-visible' in bare:
        return True
    return False


# ---------------------------------------------------------------------------
# CSS-var alias resolution
# ---------------------------------------------------------------------------

def _normalise_var(v):
    """Strip 'var(--foo)' wrapping -> '--foo'. Returns string unchanged otherwise."""
    s = (v or '').strip()
    m = re.match(r'^var\(\s*(--[\w-]+)\s*\)$', s)
    return m.group(1) if m else s


def build_css_var_to_slug(html):
    """Build a map of CSS custom property name -> theme token slug.

    Reads the mockup's :root block to populate `{--primary: 'primary', ...}`
    so extracted computed values can be reverse-mapped to theme.json tokens.
    """
    m = re.search(r':root\s*\{([^}]*)\}', html, flags=re.DOTALL)
    if not m:
        return {}
    out = {}
    for decl in m.group(1).split(';'):
        if ':' not in decl:
            continue
        name, _, value = decl.partition(':')
        name = name.strip()
        if not name.startswith('--'):
            continue
        # Slug is the name without leading --, used as the theme.json colour slug
        slug = name[2:].strip()
        out[name] = slug
    return out


# ---------------------------------------------------------------------------
# Computed-style dict accessor
# ---------------------------------------------------------------------------

def _get(computed, viewport, sel, prop):
    """Safe getter for the Playwright computed dict: computed[vp][sel][prop]."""
    return (
        computed.get(viewport, {})
        .get(sel, {})
        .get(prop)
    )
