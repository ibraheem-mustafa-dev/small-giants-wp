"""Spec 14 P4 — sgs/hero override module.

Hosts the hero-specific extraction logic relocated from `tools/recogniser-v2/extract.py`
during the P4 catalogue-driven refactor. Preserves the 50-attribute extraction
behaviour against Mama's mockup (post-SGS-BEM-migration) bit-exactly.

The dispatcher in `extract.py` checks `OVERRIDES['sgs/hero']` before falling
through to the generic role-dispatch path; this module's `extract` callable
receives the BS4 section + ctx dict and returns `(attrs, inner_blocks)`.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup

# Shared helpers from sibling module (no cycle — utils.py has no DOM deps).
from utils import (
    _px_to_int, _px_to_float, _line_height_to_em,
    text, attr, img_object,
    is_universal_handled,
)



# ---------------------------------------------------------------------------
# HERO_FINGERPRINT_SELECTORS constant  (relocated from extract.py L111-123)
# ---------------------------------------------------------------------------

HERO_FINGERPRINT_SELECTORS = [
    '.sgs-hero',
    '.sgs-hero__copy',
    '.sgs-hero__copy h1',
    '.sgs-hero__copy .sgs-hero__sub',
    '.sgs-hero__content',
    '.sgs-hero__content h1',
    '.sgs-hero__content .sgs-hero__sub',
    '.sgs-hero__image',
    '.sgs-hero__image img',
    '.sgs-hero__image--mobile',
    '.sgs-section-heading__label',
]

# ---------------------------------------------------------------------------
# apply_computed_overrides_hero  (relocated from extract.py L245-395)
# ---------------------------------------------------------------------------

def _get(computed: dict, viewport: str, sel: str, prop: str):
    """Safe getter into the computed-styles dict."""
    return ((computed.get(viewport) or {}).get(sel) or {}).get(prop)


def apply_computed_overrides_hero(out: dict, computed: dict, css_var_to_slug: dict):
    """Use Playwright computed styles to override / fill CSS-rule-derived values.

    Solves the four 2026-05-04 QC defects:
      C3 headlineFontSize — picks up @1280+ tier + inline 52px
      C4 contentPaddingTop / Right — picks up @1280+ 72/64
      I3 subHeadlineFontWeight — was missing; now read from computed
      I5 labelLineHeight — picks up inherited 1.6 from body

    Computed values are authoritative because the browser has resolved the
    full cascade (inline styles, @media tiers, var() refs, inheritance).
    """
    if not computed:
        return

    # ---- HEADLINE (h1) ----
    # Mockup has TWO h1s: .sgs-hero__content h1 (mobile-only layout) and
    # .sgs-hero__copy h1 (desktop-only layout). Both are present in DOM at every
    # viewport — only `display: none` differs. So we always read from the
    # "right" element per viewport.
    desktop_h1_sel = '.sgs-hero__copy h1'
    mobile_h1_sel = '.sgs-hero__content h1'

    fs = _px_to_int(_get(computed, 'desktop', desktop_h1_sel, 'fontSize'))
    if fs:
        out['headlineFontSizeDesktop'] = fs
    fs = _px_to_int(_get(computed, 'tablet', desktop_h1_sel, 'fontSize'))
    if fs:
        out['headlineFontSizeTablet'] = fs
    fs = _px_to_int(_get(computed, 'mobile', mobile_h1_sel, 'fontSize'))
    if fs:
        out['headlineFontSizeMobile'] = fs

    # ---- HERO-COPY PADDING (desktop) ----
    pad_top = _px_to_int(_get(computed, 'desktop', '.sgs-hero__copy', 'paddingTop'))
    pad_right = _px_to_int(_get(computed, 'desktop', '.sgs-hero__copy', 'paddingRight'))
    pad_bottom = _px_to_int(_get(computed, 'desktop', '.sgs-hero__copy', 'paddingBottom'))
    pad_left = _px_to_int(_get(computed, 'desktop', '.sgs-hero__copy', 'paddingLeft'))
    if pad_top is not None: out['contentPaddingTop'] = pad_top
    if pad_right is not None: out['contentPaddingRight'] = pad_right
    if pad_bottom is not None: out['contentPaddingBottom'] = pad_bottom
    if pad_left is not None: out['contentPaddingLeft'] = pad_left

    # Tablet padding (.sgs-hero__copy at 768)
    tpad = _get(computed, 'tablet', '.sgs-hero__copy', 'paddingTop')
    if tpad:
        out['contentPaddingTopTablet'] = _px_to_int(tpad)
        out['contentPaddingRightTablet'] = _px_to_int(_get(computed, 'tablet', '.sgs-hero__copy', 'paddingRight'))
        out['contentPaddingBottomTablet'] = _px_to_int(_get(computed, 'tablet', '.sgs-hero__copy', 'paddingBottom'))
        out['contentPaddingLeftTablet'] = _px_to_int(_get(computed, 'tablet', '.sgs-hero__copy', 'paddingLeft'))

    # Mobile padding from .sgs-hero__content
    mpad = _get(computed, 'mobile', '.sgs-hero__content', 'paddingTop')
    if mpad:
        out['contentPaddingTopMobile'] = _px_to_int(mpad)
        out['contentPaddingRightMobile'] = _px_to_int(_get(computed, 'mobile', '.sgs-hero__content', 'paddingRight'))
        out['contentPaddingBottomMobile'] = _px_to_int(_get(computed, 'mobile', '.sgs-hero__content', 'paddingBottom'))
        out['contentPaddingLeftMobile'] = _px_to_int(_get(computed, 'mobile', '.sgs-hero__content', 'paddingLeft'))

    # ---- SUB-HEADLINE ----
    sub_desktop = '.sgs-hero__copy .sgs-hero__sub'
    sub_mobile = '.sgs-hero__content .sgs-hero__sub'

    sub_fs_d = _get(computed, 'desktop', sub_desktop, 'fontSize')
    if sub_fs_d:
        out['subHeadlineFontSize'] = sub_fs_d  # keep px string per existing schema

    sub_fs_t = _get(computed, 'tablet', sub_desktop, 'fontSize')
    if sub_fs_t and sub_fs_t != sub_fs_d:
        out['subHeadlineFontSizeTablet'] = sub_fs_t

    sub_fs_m = _get(computed, 'mobile', sub_mobile, 'fontSize')
    if sub_fs_m:
        out['subHeadlineFontSizeMobile'] = sub_fs_m

    # font-weight (computed is always a number string e.g. '400')
    fw = _get(computed, 'desktop', sub_desktop, 'fontWeight')
    if fw:
        out['subHeadlineFontWeight'] = str(fw)

    # line-height — convert px back to em via divide-by-fontSize
    lh_px = _get(computed, 'desktop', sub_desktop, 'lineHeight')
    fs_px = _px_to_float(_get(computed, 'desktop', sub_desktop, 'fontSize'))
    em = _line_height_to_em(lh_px, fs_px)
    if em is not None:
        out['subHeadlineLineHeight'] = em
        out['subHeadlineLineHeightUnit'] = 'em'

    # max-width
    mw_d = _get(computed, 'desktop', sub_desktop, 'maxWidth')
    if mw_d and mw_d != 'none':
        mw = _px_to_int(mw_d)
        if mw:
            out['subHeadlineMaxWidth'] = mw

    # ---- LABEL ----
    label_sel = '.sgs-section-heading__label'
    fs = _px_to_int(_get(computed, 'desktop', label_sel, 'fontSize'))
    if fs:
        out['labelFontSize'] = fs
        out['labelFontSizeUnit'] = 'px'

    fw = _get(computed, 'desktop', label_sel, 'fontWeight')
    if fw:
        out['labelFontWeight'] = str(fw)

    # Letter-spacing
    ls = _get(computed, 'desktop', label_sel, 'letterSpacing')
    if ls and ls != 'normal':
        ls_px = _px_to_float(ls)
        if ls_px is not None:
            out['labelLetterSpacing'] = round(ls_px, 2)
            out['labelLetterSpacingUnit'] = 'px'

    tt = _get(computed, 'desktop', label_sel, 'textTransform')
    if tt and tt != 'none':
        out['labelTextTransform'] = tt

    # line-height — solves I5 (inherited 1.6 from body)
    lh_px = _get(computed, 'desktop', label_sel, 'lineHeight')
    fs_px = _px_to_float(_get(computed, 'desktop', label_sel, 'fontSize'))
    em = _line_height_to_em(lh_px, fs_px)
    if em is not None:
        out['labelLineHeight'] = em
        out['labelLineHeightUnit'] = 'em'

    # margin-bottom
    mb = _px_to_int(_get(computed, 'desktop', label_sel, 'marginBottom'))
    if mb is not None and mb > 0:
        out['labelMarginBottom'] = mb
        out['labelMarginBottomUnit'] = 'px'

    # ---- HERO-PHOTO IMG ----
    fit = _get(computed, 'desktop', '.sgs-hero__image img', 'objectFit')
    if fit and fit != 'fill':
        out['imageObjectFit'] = fit
    pos = _get(computed, 'desktop', '.sgs-hero__image img', 'objectPosition')
    if pos:
        out['imageObjectPosition'] = pos

    # ---- BACKGROUND COLOUR (resolve var() to slug if mappable) ----
    # Computed color comes back as 'rgb(...)'. We can only map it back to a
    # palette slug if the CSS rule-parsed slug already resolved it. Skip
    # override for backgroundColor — leave the rule-parser's slug in place.



# ---------------------------------------------------------------------------
# helpers used by extract_hero: _strip_media_prefix, emit_scoped_custom_css_format_key, collect_section_css, emit_scoped_custom_css, _parse_padding_shorthand  (relocated from extract.py L605-735)
# ---------------------------------------------------------------------------


# ---- Per-block extractors ----
# Each block has an `extractors` map: attr_name -> callable(section_el, ctx) -> value | None
# Returning None means "leave as default / not in mockup".

def _strip_media_prefix(selector_key: str) -> str:
    """Given '@media (min-width: 768px) .sgs-hero__copy h1' return '.sgs-hero__copy h1'.

    Walks the string finding the LAST balanced paren that's part of the @media query,
    then returns everything after the next whitespace.
    """
    if not selector_key.startswith('@'):
        return selector_key
    depth = 0
    last_paren_close = -1
    for i, ch in enumerate(selector_key):
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                last_paren_close = i
    # Selectors after @media without parens (rare): fall back to first space after @media
    if last_paren_close == -1:
        rest = selector_key.split(' ', 1)
        return rest[1] if len(rest) > 1 else ''
    after = selector_key[last_paren_close + 1:].lstrip()
    return after


def emit_scoped_custom_css_format_key(key: str, anchor: str, body: str) -> str:
    """Format a single rule with media prefix preserved if present."""
    sel = _strip_media_prefix(key)
    if sel != key:
        # Has @media prefix
        prefix = key[: len(key) - len(sel)].rstrip()
        return f'{prefix} {{ #{anchor} {sel} {{ {body}; }} }}'
    return f'#{anchor} {key} {{ {body}; }}'


def collect_section_css(section, all_rules: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    """Return every CSS rule whose selector matches an element inside this section.

    Uses BeautifulSoup's CSS selector engine for full-fidelity matching of
    descendant chains, classes, and combinators. Pseudo-classes are stripped.
    """
    matched: dict[str, dict[str, str]] = {}

    for selector_key, decls in all_rules.items():
        sel_part = _strip_media_prefix(selector_key)

        for sel in sel_part.split(','):
            sel = sel.strip()
            if not sel:
                continue
            # Strip pseudo-classes and pseudo-elements (BS4 doesn't grok :hover/:focus etc.)
            sel_clean = re.sub(r':{1,2}[a-z-]+(\([^)]*\))?', '', sel).strip()
            if not sel_clean:
                continue
            try:
                # Check both descendants AND the section itself (parent.select doesn't include self)
                # Wrap in a temporary parent so BS4 can match the section element
                from bs4 import BeautifulSoup as _BS
                temp = _BS(f'<div>{section}</div>', 'html.parser')
                if temp.select(sel_clean):
                    matched[selector_key] = decls
                    break
            except Exception:
                continue

    return matched


def emit_scoped_custom_css(section_anchor: str, rules: dict[str, dict[str, str]],
                            consumed_rules: set, consumed_decls: dict[str, set]) -> str:
    """Emit CSS rules that weren't mapped to block attributes, scoped to the block's anchor.

    Skips:
      - fully consumed rules
      - universally-handled selectors (framework resets, mockup-structural classes)

    `consumed_rules`: full rule keys that were entirely absorbed by attribute mapping.
    `consumed_decls`: per-rule-key set of declaration property names that were absorbed.
    """
    chunks = []
    for key, decls in rules.items():
        # Skip fully consumed rules
        if key in consumed_rules:
            continue

        # Skip universally-handled selectors (resets + mockup-structural classes)
        if is_universal_handled(key):
            continue

        used = consumed_decls.get(key, set())
        remaining = {p: v for p, v in decls.items() if p not in used}
        if not remaining:
            continue

        body = '; '.join(f'{p}: {v}' for p, v in remaining.items())
        chunks.append(emit_scoped_custom_css_format_key(key, section_anchor, body))
    return '\n'.join(chunks)


def _parse_padding_shorthand(value: str) -> tuple[int | None, int | None, int | None, int | None]:
    """Parse a CSS padding shorthand (e.g. '28px 20px 40px') into (top, right, bottom, left).
    Returns None for components that could not be parsed as px integers.
    """
    parts = value.strip().split()
    def _px(v: str) -> int | None:
        v = v.strip()
        if v.endswith('px'):
            try:
                return int(float(v[:-2]))
            except ValueError:
                return None
        return None

    if len(parts) == 1:
        v = _px(parts[0])
        return v, v, v, v
    elif len(parts) == 2:
        tb, lr = _px(parts[0]), _px(parts[1])
        return tb, lr, tb, lr
    elif len(parts) == 3:
        t, lr, b = _px(parts[0]), _px(parts[1]), _px(parts[2])
        return t, lr, b, lr
    elif len(parts) == 4:
        return _px(parts[0]), _px(parts[1]), _px(parts[2]), _px(parts[3])
    return None, None, None, None


# ---------------------------------------------------------------------------
# extract_hero (the big one)  (relocated from extract.py L737-1262)
# ---------------------------------------------------------------------------

def extract_hero(section, ctx) -> tuple[dict, list]:
    """sgs/hero — Approach B implementation for the hero block.

    Returns (attributes_dict, inner_blocks_list).
    inner_blocks contains the sgs/multi-button + sgs/button structure
    replacing the deprecated flat ctaPrimary*/ctaSecondary* attributes.
    """
    out = {}
    consumed_rules: set = set()
    consumed_decls: dict[str, set] = {}

    def mark(rule_key: str, *props):
        if not props:
            consumed_rules.add(rule_key)
        else:
            consumed_decls.setdefault(rule_key, set()).update(props)

    media_map = ctx.get('media_map', {})

    # -----------------------------------------------------------------------
    # VARIANT
    # -----------------------------------------------------------------------
    has_desktop = section.select_one('.sgs-hero--desktop')
    has_photo = section.select_one('.sgs-hero__image')
    if has_desktop and has_photo:
        out['variant'] = 'split'
    else:
        out['variant'] = 'standard'

    # -----------------------------------------------------------------------
    # TEXT CONTENT
    # -----------------------------------------------------------------------
    # Headline — prefer desktop layout's h1 since it has the canonical line-break
    h_desktop = section.select_one('.sgs-hero--desktop h1') or section.select_one('h1')
    if h_desktop:
        out['headline'] = h_desktop.get_text(' ', strip=True)

    # Sub-headline
    sub = section.select_one('.sgs-hero--desktop .sgs-hero__sub') or section.select_one('.sgs-hero__sub')
    if sub:
        out['subHeadline'] = sub.get_text(strip=True)

    # Label / eyebrow
    label_el = (
        section.select_one('.sgs-hero--desktop .sgs-section-heading__label')
        or section.select_one('.sgs-section-heading__label')
    )
    if label_el:
        out['label'] = label_el.get_text(strip=True)

    # -----------------------------------------------------------------------
    # SPLIT IMAGE
    # -----------------------------------------------------------------------
    if out['variant'] == 'split':
        img = (
            img_object(section, '.sgs-hero__image img', media_map=media_map)
            or img_object(section, '.sgs-hero--desktop img', media_map=media_map)
        )
        if img:
            out['splitImage'] = img

        # Mobile image (stacked above content on mobile)
        mobile_img = img_object(section, '.sgs-hero--mobile img', '.sgs-hero__image--mobile', media_map=media_map)
        if mobile_img:
            out['splitImageMobile'] = mobile_img

    # -----------------------------------------------------------------------
    # CSS RULES
    # -----------------------------------------------------------------------
    rules = ctx.get('css_rules', {})
    section_rules = ctx.get('section_css', rules)

    # -----------------------------------------------------------------------
    # BACKGROUND COLOUR
    # -----------------------------------------------------------------------
    if '.sgs-hero' in section_rules:
        bg = section_rules['.sgs-hero'].get('background', '').strip()
        if bg:
            slug = ctx['css_var_to_slug'].get(_normalise_var(bg))
            if slug:
                out['backgroundColor'] = slug
                mark('.sgs-hero', 'background')
        # overflow: hidden is a layout side-effect — skip as block attr; mark consumed
        mark('.sgs-hero', 'overflow')

    # -----------------------------------------------------------------------
    # TEXT / HEADLINE COLOUR
    # -----------------------------------------------------------------------
    for selector in ['.sgs-hero__copy h1', '.sgs-hero__content h1']:
        if selector in section_rules:
            col = section_rules[selector].get('color', '').strip()
            if col:
                slug = ctx['css_var_to_slug'].get(_normalise_var(col))
                if slug:
                    out['headlineColour'] = slug
                    out['textColor'] = slug
                    mark(selector, 'color')
                break

    # -----------------------------------------------------------------------
    # SUB-HEADLINE COLOUR + TYPOGRAPHY
    # -----------------------------------------------------------------------
    for selector in ['.sgs-hero__copy .sgs-hero__sub', '.sgs-hero__content .sgs-hero__sub']:
        if selector in section_rules:
            col = section_rules[selector].get('color', '').strip()
            if col:
                slug = ctx['css_var_to_slug'].get(_normalise_var(col))
                if slug:
                    out['subHeadlineColour'] = slug
                    mark(selector, 'color')
                break

    # Sub-headline font size (mobile = .sgs-hero__content .sgs-hero__sub)
    if '.sgs-hero__content .sgs-hero__sub' in section_rules:
        decls = section_rules['.sgs-hero__content .sgs-hero__sub']
        fs = decls.get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSizeMobile'] = fs
            mark('.sgs-hero__content .sgs-hero__sub', 'font-size')
        lh = decls.get('line-height', '').strip()
        if lh:
            try:
                out['subHeadlineLineHeight'] = float(lh)
                out['subHeadlineLineHeightUnit'] = 'em'
                mark('.sgs-hero__content .sgs-hero__sub', 'line-height')
            except ValueError:
                pass
        # margin-bottom: handled by SGS hero spacing; mark consumed
        mark('.sgs-hero__content .sgs-hero__sub', 'margin-bottom')

    # Sub-headline font size + line-height (tablet+ = .sgs-hero__copy .sgs-hero__sub)
    media_key_sub_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero__copy .sgs-hero__sub' in k),
        None
    )
    sub_decls_desktop = section_rules.get(media_key_sub_768 or '', {})
    # Fall back to non-media rule if no @media rule exists
    if not sub_decls_desktop:
        sub_decls_desktop = section_rules.get('.sgs-hero__copy .sgs-hero__sub', {})
    if sub_decls_desktop:
        fs = sub_decls_desktop.get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSize'] = fs
            if media_key_sub_768:
                mark(media_key_sub_768, 'font-size')
            else:
                mark('.sgs-hero__copy .sgs-hero__sub', 'font-size')
        mw = sub_decls_desktop.get('max-width', '').strip()
        if mw and mw.endswith('px'):
            try:
                out['subHeadlineMaxWidth'] = int(float(mw[:-2]))
                if media_key_sub_768:
                    mark(media_key_sub_768, 'max-width')
                else:
                    mark('.sgs-hero__copy .sgs-hero__sub', 'max-width')
            except ValueError:
                pass
        lh = sub_decls_desktop.get('line-height', '').strip()
        if lh and 'subHeadlineLineHeight' not in out:
            try:
                out['subHeadlineLineHeight'] = float(lh)
                out['subHeadlineLineHeightUnit'] = 'em'
                if media_key_sub_768:
                    mark(media_key_sub_768, 'line-height')
                else:
                    mark('.sgs-hero__copy .sgs-hero__sub', 'line-height')
            except ValueError:
                pass
        # margin-bottom: no block attr; mark consumed
        if media_key_sub_768:
            mark(media_key_sub_768, 'margin-bottom')
        else:
            mark('.sgs-hero__copy .sgs-hero__sub', 'margin-bottom')

    # -----------------------------------------------------------------------
    # HEADLINE FONT SIZES PER BREAKPOINT
    # -----------------------------------------------------------------------
    # Mobile: .sgs-hero__content h1
    if '.sgs-hero__content h1' in section_rules:
        decls = section_rules['.sgs-hero__content h1']
        fs = decls.get('font-size', '').strip()
        if fs and fs.endswith('px'):
            try:
                out['headlineFontSizeMobile'] = int(float(fs[:-2]))
                mark('.sgs-hero__content h1', 'font-size')
            except ValueError:
                pass
        # font-weight, letter-spacing, margin-bottom — variation's h1 rule handles these
        mark('.sgs-hero__content h1', 'font-weight', 'margin-bottom', 'letter-spacing')

    # Desktop: .sgs-hero__copy h1 inside @media (min-width: 768px)
    media_key_h1_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero__copy h1' in k),
        None
    )
    if media_key_h1_768:
        decls = section_rules[media_key_h1_768]
        fs = decls.get('font-size', '').strip()
        if fs and fs.endswith('px'):
            try:
                out['headlineFontSizeDesktop'] = int(float(fs[:-2]))
                mark(media_key_h1_768, 'font-size')
            except ValueError:
                pass
        # font-weight, margin-bottom, letter-spacing — variation handles; mark consumed
        mark(media_key_h1_768, 'font-weight', 'margin-bottom', 'letter-spacing', 'color')

    # 1280px breakpoint h1 — no block attribute tier for "large desktop"; mark consumed
    media_key_h1_1280 = next(
        (k for k in section_rules
         if '@media' in k and '1280px' in k and '.sgs-hero__copy h1' in k),
        None
    )
    if media_key_h1_1280:
        mark(media_key_h1_1280, 'font-size')

    # -----------------------------------------------------------------------
    # MIN-HEIGHT
    # -----------------------------------------------------------------------
    media_key_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero--desktop' in k
         and 'min-height' in section_rules[k]),
        None
    )
    if media_key_768:
        mh = section_rules[media_key_768].get('min-height', '').strip()
        if mh:
            out['minHeight'] = mh
            mark(media_key_768, 'min-height')

    # -----------------------------------------------------------------------
    # LAYOUT GRID — splitColumnRatio
    # -----------------------------------------------------------------------
    # .sgs-hero--desktop inside @media (min-width: 768px): grid-template-columns
    media_key_grid = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero--desktop' in k
         and 'grid-template-columns' in section_rules.get(k, {})),
        None
    )
    if media_key_grid:
        cols = section_rules[media_key_grid].get('grid-template-columns', '').strip()
        if cols:
            out['splitColumnRatio'] = cols
            mark(media_key_grid, 'grid-template-columns', 'display')
    else:
        # Check non-media .sgs-hero--desktop rule
        if '.sgs-hero--desktop' in section_rules:
            cols = section_rules['.sgs-hero--desktop'].get('grid-template-columns', '').strip()
            if cols:
                out['splitColumnRatio'] = cols
            mark('.sgs-hero--desktop', 'display', 'grid-template-columns')

    # Mark .sgs-hero--desktop non-media rule as consumed (display:none is mobile-only and
    # handled by the split variant's responsive layout)
    if '.sgs-hero--desktop' in section_rules:
        mark('.sgs-hero--desktop', 'display')

    # -----------------------------------------------------------------------
    # VERTICAL ALIGNMENT
    # -----------------------------------------------------------------------
    # .sgs-hero__copy inside @media (min-width: 768px): justify-content: center
    media_key_copy = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and k.endswith('.sgs-hero__copy')),
        None
    )
    if media_key_copy:
        decls = section_rules[media_key_copy]
        jc = decls.get('justify-content', '').strip()
        if jc == 'center':
            out['verticalAlignment'] = 'center'
        elif jc in ('flex-start', 'start'):
            out['verticalAlignment'] = 'top'
        elif jc in ('flex-end', 'end'):
            out['verticalAlignment'] = 'bottom'
        # display, flex-direction, background are structural — mark consumed
        mark(media_key_copy, 'display', 'flex-direction', 'justify-content', 'background')

    # -----------------------------------------------------------------------
    # CONTENT PADDING
    # -----------------------------------------------------------------------
    # Desktop: .sgs-hero__copy padding inside @media (min-width: 768px)
    if media_key_copy:
        decls = section_rules[media_key_copy]
        pad = decls.get('padding', '').strip()
        if pad:
            t, r, b, l = _parse_padding_shorthand(pad)
            if t is not None:
                out['contentPaddingTop'] = t
            if r is not None:
                out['contentPaddingRight'] = r
            if b is not None:
                out['contentPaddingBottom'] = b
            if l is not None:
                out['contentPaddingLeft'] = l
            mark(media_key_copy, 'padding')

    # 1280px: .sgs-hero__copy padding
    media_key_copy_1280 = next(
        (k for k in section_rules
         if '@media' in k and '1280px' in k and '.sgs-hero__copy' in k
         and 'padding' in section_rules.get(k, {})),
        None
    )
    if media_key_copy_1280:
        # No "large desktop" attribute tier; mark consumed to avoid scoped CSS emission
        mark(media_key_copy_1280, 'padding')

    # Mobile: .sgs-hero__content padding
    if '.sgs-hero__content' in section_rules:
        decls = section_rules['.sgs-hero__content']
        pad = decls.get('padding', '').strip()
        if pad:
            t, r, b, l = _parse_padding_shorthand(pad)
            if t is not None:
                out['contentPaddingTopMobile'] = t
            if r is not None:
                out['contentPaddingRightMobile'] = r
            if b is not None:
                out['contentPaddingBottomMobile'] = b
            if l is not None:
                out['contentPaddingLeftMobile'] = l
            mark('.sgs-hero__content', 'padding')
        # background on .sgs-hero__content is same as .sgs-hero bg; mark consumed
        mark('.sgs-hero__content', 'background')

    # -----------------------------------------------------------------------
    # IMAGE CONTROLS
    # -----------------------------------------------------------------------
    # .sgs-hero__image img — object-fit, object-position
    media_key_photo_img = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero__image img' in k),
        None
    )
    photo_img_decls = (
        section_rules.get(media_key_photo_img, {})
        or section_rules.get('.sgs-hero__image img', {})
    )
    if photo_img_decls:
        fit = photo_img_decls.get('object-fit', '').strip()
        if fit:
            out['imageObjectFit'] = fit
        pos = photo_img_decls.get('object-position', '').strip()
        if pos:
            out['imageObjectPosition'] = pos
        if media_key_photo_img:
            mark(media_key_photo_img, 'width', 'height', 'object-fit', 'object-position')
        if '.sgs-hero__image img' in section_rules:
            mark('.sgs-hero__image img', 'width', 'height', 'object-fit', 'object-position')

    # .sgs-hero__image container — overflow: hidden is framework default; mark consumed
    media_key_photo = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and k.endswith('.sgs-hero__image')),
        None
    )
    if media_key_photo:
        mark(media_key_photo, 'overflow')
    if '.sgs-hero__image' in section_rules:
        mark('.sgs-hero__image', 'overflow')

    # Mobile image: .sgs-hero__image--mobile
    if '.sgs-hero__image--mobile' in section_rules:
        decls = section_rules['.sgs-hero__image--mobile']
        h = decls.get('height', '').strip()
        if h and h.endswith('px'):
            try:
                out['splitImageMobileHeight'] = int(float(h[:-2]))
            except ValueError:
                pass
        op = decls.get('object-position', '').strip()
        if op:
            out['splitImageMobileObjectPosition'] = op
        # object-fit already captured from desktop rule; mark all consumed
        mark('.sgs-hero__image--mobile', 'width', 'height', 'object-fit', 'object-position', 'display')

    # -----------------------------------------------------------------------
    # LABEL (EYEBROW) TYPOGRAPHY
    # -----------------------------------------------------------------------
    label_sel = '.sgs-section-heading__label'
    if label_sel in section_rules:
        decls = section_rules[label_sel]

        fs = decls.get('font-size', '').strip()
        if fs and fs.endswith('px'):
            try:
                out['labelFontSize'] = int(float(fs[:-2]))
                out['labelFontSizeUnit'] = 'px'
            except ValueError:
                pass

        fw = decls.get('font-weight', '').strip()
        if fw:
            out['labelFontWeight'] = fw

        ls = decls.get('letter-spacing', '').strip()
        if ls and ls.endswith('px'):
            try:
                out['labelLetterSpacing'] = float(ls[:-2])
                out['labelLetterSpacingUnit'] = 'px'
            except ValueError:
                pass

        tt = decls.get('text-transform', '').strip()
        if tt:
            out['labelTextTransform'] = tt

        col = decls.get('color', '').strip()
        if col:
            slug = ctx['css_var_to_slug'].get(_normalise_var(col))
            if slug:
                out['labelColour'] = slug

        mb = decls.get('margin-bottom', '').strip()
        if mb and mb.endswith('px'):
            try:
                out['labelMarginBottom'] = int(float(mb[:-2]))
                out['labelMarginBottomUnit'] = 'px'
            except ValueError:
                pass

        # display: block is framework default for the label element; mark consumed
        mark(label_sel, 'font-size', 'font-weight', 'letter-spacing', 'text-transform',
             'color', 'margin-bottom', 'display')

    # -----------------------------------------------------------------------
    # .sgs-hero__content h1 — font-family handled by variation; mark remaining props consumed
    # -----------------------------------------------------------------------
    if '.sgs-hero__content h1' in section_rules:
        # Only font-size was captured above; remaining props are variation-handled
        mark('.sgs-hero__content h1', 'font-family', 'line-height', 'color')

    # -----------------------------------------------------------------------
    # ANCHOR
    # -----------------------------------------------------------------------
    out['anchor'] = 'sgs-hero-1'

    # -----------------------------------------------------------------------
    # INNER BLOCKS — sgs/multi-button + sgs/button
    # (Replaces deprecated ctaPrimary*/ctaSecondary* flat attributes)
    # -----------------------------------------------------------------------
    button_blocks = []

    primary = (
        section.select_one('.sgs-hero--desktop .btn-primary')
        or section.select_one('.btn-primary')
    )
    if primary:
        btn_attrs: dict = {
            'label': primary.get_text(strip=True),
            'inheritStyle': 'primary',
            'linkTarget': '_self',
        }
        href = primary.get('href')
        if href:
            btn_attrs['url'] = href
        button_blocks.append({
            'name': 'sgs/button',
            'attributes': btn_attrs,
            'inner_blocks': [],
        })

    secondary = (
        section.select_one('.sgs-hero--desktop .btn-secondary')
        or section.select_one('.btn-secondary')
    )
    if secondary:
        btn_attrs = {
            'label': secondary.get_text(strip=True),
            'inheritStyle': 'secondary',
            'linkTarget': '_self',
        }
        href = secondary.get('href')
        if href:
            btn_attrs['url'] = href
        button_blocks.append({
            'name': 'sgs/button',
            'attributes': btn_attrs,
            'inner_blocks': [],
        })

    inner_blocks = []
    if button_blocks:
        inner_blocks = [
            {
                'name': 'sgs/multi-button',
                'attributes': {
                    'direction': 'row',
                    'directionMobile': 'column',
                    'gap': 12,
                    'gapMobile': 10,
                },
                'inner_blocks': button_blocks,
            }
        ]

    # Mark .btn-primary and .btn-secondary as fully consumed
    # (the block applies its own button styling via the InnerBlocks architecture)
    consumed_rules.add('.btn-primary')
    consumed_rules.add('.btn-secondary')
    consumed_rules.add('.btn')
    # .sgs-hero__ctas layout now handled by sgs/multi-button attributes
    if '.sgs-hero__ctas' in section_rules:
        consumed_rules.add('.sgs-hero__ctas')
    media_key_ctas = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.sgs-hero__copy .sgs-hero__ctas' in k),
        None
    )
    if media_key_ctas:
        consumed_rules.add(media_key_ctas)

    # -----------------------------------------------------------------------
    # INTERNAL BOOKKEEPING (stripped before serialisation)
    # -----------------------------------------------------------------------
    out['_consumed_rules'] = consumed_rules
    out['_consumed_decls'] = consumed_decls

    return out, inner_blocks



# ---------------------------------------------------------------------------
# _normalise_var + build_css_var_to_slug (used by hero override + apply_computed)  (relocated from extract.py L1263-1287)
# ---------------------------------------------------------------------------

def _normalise_var(v: str) -> str:
    """Normalise 'var(--surface-pink)' or 'var(--text)' -> '--surface-pink' / '--text'."""
    m = re.search(r'var\((--[a-z-]+)\)', v)
    return m.group(1) if m else v.strip().lstrip('#').lower()


def build_css_var_to_slug(html: str) -> dict[str, str]:
    """Read :root { --surface-pink: #...; ... } and map each --slug to its WP token slug.

    For mockup CSS variables that match WP palette slugs by name, use the slug directly.
    """
    out = {}
    m = re.search(r':root\s*\{([^}]+)\}', html, flags=re.DOTALL)
    if not m:
        return out
    body = m.group(1)
    for line in body.split(';'):
        line = line.strip()
        if line.startswith('--') and ':' in line:
            name, val = line.split(':', 1)
            slug = name.strip().lstrip('-')  # surface-pink, text, etc.
            out[name.strip()] = slug
    return out




# Override callable signature: (section, ctx) -> (attrs, inner_blocks).
# The dispatcher calls this; we keep extract_hero's signature unchanged so
# the move is verbatim.
HERO_OVERRIDE = {
    'block_name': 'sgs/hero',
    'extract': extract_hero,
    'apply_computed': apply_computed_overrides_hero,
    'fingerprint_selectors': HERO_FINGERPRINT_SELECTORS,
}
