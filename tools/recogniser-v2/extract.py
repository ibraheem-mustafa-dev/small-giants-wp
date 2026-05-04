"""
Recogniser v2 — Approach B: per-section attribute extractor.

Takes:
  - mockup HTML (with embedded <style>)
  - section selector (e.g. 'section.hero')
  - target block name (e.g. 'sgs/hero')

Returns:
  - extracted attributes dict
  - WP block-comment markup string (nested InnerBlocks when present)
  - coverage report (extracted / defaulted / flagged)

Usage:
  python tools/recogniser-v2/extract.py \
    --mockup sites/mamas-munches/mockups/homepage/index.html \
    --section "section.hero" \
    --block sgs/hero
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup


REPO = Path(__file__).resolve().parents[2]

# ---------------------------------------------------------------------------
# CSS selectors that are universally handled by the SGS framework or are
# pure resets / normalisation. Declarations matched against these selectors
# are consumed (marked) but NOT emitted as scoped custom CSS.
# ---------------------------------------------------------------------------
UNIVERSAL_HANDLED_SELECTORS = frozenset({
    # Global resets
    '*, *::before, *::after',
    '*',
    'img',
    'a',
    # Typography reset
    'h1, h2, h3',
    'h1, h2, h3, h4, h5, h6',
    # Reduced-motion (framework owns this)
    # (matched by prefix in is_universal_handled — see below)

    # Mockup-structural classes that map entirely to block attributes.
    # These selectors carry design data that is consumed by attribute
    # extraction; their declarations must NEVER be emitted as scoped CSS
    # because the SGS block renders entirely different class names.
    '.hero',
    '.hero-desktop',
    '.hero-mobile',
    '.hero-mobile-img',
    '.hero-content',
    '.hero-content h1',
    '.hero-content .hero-sub',
    '.hero-copy',
    '.hero-copy h1',
    '.hero-copy .hero-sub',
    '.hero-copy .hero-ctas',
    '.hero-ctas',
    '.hero-photo',
    '.hero-photo img',
    '.btn-primary',
    '.btn-primary:hover',
    '.btn-secondary',
    '.btn-secondary:hover',
    '.btn',
    '.btn-ghost',
    '.btn-ghost:hover',
    '.section-label',
})

# Mockup-class selectors that appear inside @media blocks — matched by
# the bare selector after stripping the @media prefix.
UNIVERSAL_HANDLED_BARE = frozenset({
    '.hero-mobile',
    '.hero-desktop',
    '.hero-copy',
    '.hero-copy h1',
    '.hero-copy .hero-sub',
    '.hero-copy .hero-ctas',
    '.hero-photo',
    '.hero-photo img',
})


def is_universal_handled(selector_key: str) -> bool:
    """Return True if this CSS rule is a framework default, reset, or
    mockup-structural class whose declarations are consumed by attribute
    extraction and must never be emitted as scoped custom CSS.
    """
    # Strip @media prefix to get the bare selector
    bare = _strip_media_prefix(selector_key).strip()

    # Exact matches (with or without @media prefix)
    if bare in UNIVERSAL_HANDLED_SELECTORS:
        return True
    if bare in UNIVERSAL_HANDLED_BARE:
        return True

    # Reduced-motion media query — framework CSS owns this
    if 'prefers-reduced-motion' in selector_key:
        return True

    # focus-visible reset
    if 'focus-visible' in bare:
        return True

    return False


def load_block_schema(block_name: str) -> dict:
    """Load a block's attributes from its block.json file."""
    namespace, name = block_name.split('/', 1)
    path = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks' / name / 'block.json'
    return json.loads(path.read_text(encoding='utf-8'))


def _parse_rules_in_block(css: str, media_prefix: str = '') -> dict[str, dict[str, str]]:
    """Parse CSS declarations from a chunk. Returns {selector_key: {prop: val}}.

    Handles nested @media blocks by recursing with the media prefix.
    """
    out: dict[str, dict[str, str]] = {}
    i = 0
    chunk_start = 0
    while i < len(css):
        ch = css[i]
        if ch == '{':
            selector_or_at = css[chunk_start:i].strip()
            # Find matching close brace
            end = i + 1
            depth = 1
            while end < len(css) and depth > 0:
                if css[end] == '{':
                    depth += 1
                elif css[end] == '}':
                    depth -= 1
                end += 1
            body = css[i + 1:end - 1]

            if selector_or_at.startswith('@media') or selector_or_at.startswith('@supports'):
                # Recurse into the at-block with combined prefix
                combined = (media_prefix + ' ' + selector_or_at).strip() if media_prefix else selector_or_at
                nested = _parse_rules_in_block(body, combined)
                out.update(nested)
            elif selector_or_at.startswith('@'):
                # @keyframes, @font-face etc — skip
                pass
            else:
                # Plain rule
                decls: dict[str, str] = {}
                for decl in body.split(';'):
                    decl = decl.strip()
                    if ':' in decl:
                        k, v = decl.split(':', 1)
                        decls[k.strip()] = v.strip()
                if decls:
                    key = (media_prefix + ' ' + selector_or_at).strip() if media_prefix else selector_or_at
                    out[key] = decls

            i = end
            chunk_start = i
            continue
        i += 1
    return out


def parse_mockup_styles(html: str) -> dict[str, dict[str, str]]:
    """Extract CSS rules from <style> blocks. Returns {selector: {prop: value}}.

    Selector keys for @media-nested rules include the @media prefix:
      "@media (min-width: 768px) .hero-copy h1"
    """
    rules: dict[str, dict[str, str]] = {}
    for css in re.findall(r'<style[^>]*>(.+?)</style>', html, flags=re.DOTALL):
        css = re.sub(r'/\*.+?\*/', '', css, flags=re.DOTALL)
        rules.update(_parse_rules_in_block(css))
    return rules


# ---- Heuristic extractors ----

def text(el, *selectors):
    for sel in selectors:
        m = el.select_one(sel)
        if m:
            return m.get_text(strip=True)
    return None


def attr(el, sel, attribute):
    m = el.select_one(sel)
    return m.get(attribute) if m else None


def img_object(el, *selectors, media_map=None):
    """Return a WP-shaped image object {id, url, alt}.
    If media_map is provided, resolve mockup-relative src to {id, url} via filename match.
    """
    media_map = media_map or {}
    for sel in selectors:
        m = el.select_one(sel)
        if m and m.name == 'img' and m.get('src'):
            src = m.get('src')
            filename = src.rsplit('/', 1)[-1]
            mapped = media_map.get(filename)
            if mapped:
                return {
                    'id': mapped['id'],
                    'url': mapped['url'],
                    'alt': m.get('alt', ''),
                }
            return {
                'id': None,
                'url': src,
                'alt': m.get('alt', ''),
            }
    return None


# ---- Per-block extractors ----
# Each block has an `extractors` map: attr_name -> callable(section_el, ctx) -> value | None
# Returning None means "leave as default / not in mockup".

def _strip_media_prefix(selector_key: str) -> str:
    """Given '@media (min-width: 768px) .hero-copy h1' return '.hero-copy h1'.

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
    has_desktop = section.select_one('.hero-desktop')
    has_photo = section.select_one('.hero-photo')
    if has_desktop and has_photo:
        out['variant'] = 'split'
    else:
        out['variant'] = 'standard'

    # -----------------------------------------------------------------------
    # TEXT CONTENT
    # -----------------------------------------------------------------------
    # Headline — prefer desktop layout's h1 since it has the canonical line-break
    h_desktop = section.select_one('.hero-desktop h1') or section.select_one('h1')
    if h_desktop:
        out['headline'] = h_desktop.get_text(' ', strip=True)

    # Sub-headline
    sub = section.select_one('.hero-desktop .hero-sub') or section.select_one('.hero-sub')
    if sub:
        out['subHeadline'] = sub.get_text(strip=True)

    # Label / eyebrow
    label_el = (
        section.select_one('.hero-desktop .section-label')
        or section.select_one('.section-label')
    )
    if label_el:
        out['label'] = label_el.get_text(strip=True)

    # -----------------------------------------------------------------------
    # SPLIT IMAGE
    # -----------------------------------------------------------------------
    if out['variant'] == 'split':
        img = (
            img_object(section, '.hero-photo img', media_map=media_map)
            or img_object(section, '.hero-desktop img', media_map=media_map)
        )
        if img:
            out['splitImage'] = img

        # Mobile image (stacked above content on mobile)
        mobile_img = img_object(section, '.hero-mobile img', '.hero-mobile-img', media_map=media_map)
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
    if '.hero' in section_rules:
        bg = section_rules['.hero'].get('background', '').strip()
        if bg:
            slug = ctx['css_var_to_slug'].get(_normalise_var(bg))
            if slug:
                out['backgroundColor'] = slug
                mark('.hero', 'background')
        # overflow: hidden is a layout side-effect — skip as block attr; mark consumed
        mark('.hero', 'overflow')

    # -----------------------------------------------------------------------
    # TEXT / HEADLINE COLOUR
    # -----------------------------------------------------------------------
    for selector in ['.hero-copy h1', '.hero-content h1']:
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
    for selector in ['.hero-copy .hero-sub', '.hero-content .hero-sub']:
        if selector in section_rules:
            col = section_rules[selector].get('color', '').strip()
            if col:
                slug = ctx['css_var_to_slug'].get(_normalise_var(col))
                if slug:
                    out['subHeadlineColour'] = slug
                    mark(selector, 'color')
                break

    # Sub-headline font size (mobile = .hero-content .hero-sub)
    if '.hero-content .hero-sub' in section_rules:
        decls = section_rules['.hero-content .hero-sub']
        fs = decls.get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSizeMobile'] = fs
            mark('.hero-content .hero-sub', 'font-size')
        lh = decls.get('line-height', '').strip()
        if lh:
            try:
                out['subHeadlineLineHeight'] = float(lh)
                out['subHeadlineLineHeightUnit'] = 'em'
                mark('.hero-content .hero-sub', 'line-height')
            except ValueError:
                pass
        # margin-bottom: handled by SGS hero spacing; mark consumed
        mark('.hero-content .hero-sub', 'margin-bottom')

    # Sub-headline font size + line-height (tablet+ = .hero-copy .hero-sub)
    media_key_sub_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-copy .hero-sub' in k),
        None
    )
    sub_decls_desktop = section_rules.get(media_key_sub_768 or '', {})
    # Fall back to non-media rule if no @media rule exists
    if not sub_decls_desktop:
        sub_decls_desktop = section_rules.get('.hero-copy .hero-sub', {})
    if sub_decls_desktop:
        fs = sub_decls_desktop.get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSize'] = fs
            if media_key_sub_768:
                mark(media_key_sub_768, 'font-size')
            else:
                mark('.hero-copy .hero-sub', 'font-size')
        mw = sub_decls_desktop.get('max-width', '').strip()
        if mw and mw.endswith('px'):
            try:
                out['subHeadlineMaxWidth'] = int(float(mw[:-2]))
                if media_key_sub_768:
                    mark(media_key_sub_768, 'max-width')
                else:
                    mark('.hero-copy .hero-sub', 'max-width')
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
                    mark('.hero-copy .hero-sub', 'line-height')
            except ValueError:
                pass
        # margin-bottom: no block attr; mark consumed
        if media_key_sub_768:
            mark(media_key_sub_768, 'margin-bottom')
        else:
            mark('.hero-copy .hero-sub', 'margin-bottom')

    # -----------------------------------------------------------------------
    # HEADLINE FONT SIZES PER BREAKPOINT
    # -----------------------------------------------------------------------
    # Mobile: .hero-content h1
    if '.hero-content h1' in section_rules:
        decls = section_rules['.hero-content h1']
        fs = decls.get('font-size', '').strip()
        if fs and fs.endswith('px'):
            try:
                out['headlineFontSizeMobile'] = int(float(fs[:-2]))
                mark('.hero-content h1', 'font-size')
            except ValueError:
                pass
        # font-weight, letter-spacing, margin-bottom — variation's h1 rule handles these
        mark('.hero-content h1', 'font-weight', 'margin-bottom', 'letter-spacing')

    # Desktop: .hero-copy h1 inside @media (min-width: 768px)
    media_key_h1_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-copy h1' in k),
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
         if '@media' in k and '1280px' in k and '.hero-copy h1' in k),
        None
    )
    if media_key_h1_1280:
        mark(media_key_h1_1280, 'font-size')

    # -----------------------------------------------------------------------
    # MIN-HEIGHT
    # -----------------------------------------------------------------------
    media_key_768 = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-desktop' in k
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
    # .hero-desktop inside @media (min-width: 768px): grid-template-columns
    media_key_grid = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-desktop' in k
         and 'grid-template-columns' in section_rules.get(k, {})),
        None
    )
    if media_key_grid:
        cols = section_rules[media_key_grid].get('grid-template-columns', '').strip()
        if cols:
            out['splitColumnRatio'] = cols
            mark(media_key_grid, 'grid-template-columns', 'display')
    else:
        # Check non-media .hero-desktop rule
        if '.hero-desktop' in section_rules:
            cols = section_rules['.hero-desktop'].get('grid-template-columns', '').strip()
            if cols:
                out['splitColumnRatio'] = cols
            mark('.hero-desktop', 'display', 'grid-template-columns')

    # Mark .hero-desktop non-media rule as consumed (display:none is mobile-only and
    # handled by the split variant's responsive layout)
    if '.hero-desktop' in section_rules:
        mark('.hero-desktop', 'display')

    # -----------------------------------------------------------------------
    # VERTICAL ALIGNMENT
    # -----------------------------------------------------------------------
    # .hero-copy inside @media (min-width: 768px): justify-content: center
    media_key_copy = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and k.endswith('.hero-copy')),
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
    # Desktop: .hero-copy padding inside @media (min-width: 768px)
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

    # 1280px: .hero-copy padding
    media_key_copy_1280 = next(
        (k for k in section_rules
         if '@media' in k and '1280px' in k and '.hero-copy' in k
         and 'padding' in section_rules.get(k, {})),
        None
    )
    if media_key_copy_1280:
        # No "large desktop" attribute tier; mark consumed to avoid scoped CSS emission
        mark(media_key_copy_1280, 'padding')

    # Mobile: .hero-content padding
    if '.hero-content' in section_rules:
        decls = section_rules['.hero-content']
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
            mark('.hero-content', 'padding')
        # background on .hero-content is same as .hero bg; mark consumed
        mark('.hero-content', 'background')

    # -----------------------------------------------------------------------
    # IMAGE CONTROLS
    # -----------------------------------------------------------------------
    # .hero-photo img — object-fit, object-position
    media_key_photo_img = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-photo img' in k),
        None
    )
    photo_img_decls = (
        section_rules.get(media_key_photo_img, {})
        or section_rules.get('.hero-photo img', {})
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
        if '.hero-photo img' in section_rules:
            mark('.hero-photo img', 'width', 'height', 'object-fit', 'object-position')

    # .hero-photo container — overflow: hidden is framework default; mark consumed
    media_key_photo = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and k.endswith('.hero-photo')),
        None
    )
    if media_key_photo:
        mark(media_key_photo, 'overflow')
    if '.hero-photo' in section_rules:
        mark('.hero-photo', 'overflow')

    # Mobile image: .hero-mobile-img
    if '.hero-mobile-img' in section_rules:
        decls = section_rules['.hero-mobile-img']
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
        mark('.hero-mobile-img', 'width', 'height', 'object-fit', 'object-position', 'display')

    # -----------------------------------------------------------------------
    # LABEL (EYEBROW) TYPOGRAPHY
    # -----------------------------------------------------------------------
    label_sel = '.section-label'
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
    # .hero-content h1 — font-family handled by variation; mark remaining props consumed
    # -----------------------------------------------------------------------
    if '.hero-content h1' in section_rules:
        # Only font-size was captured above; remaining props are variation-handled
        mark('.hero-content h1', 'font-family', 'line-height', 'color')

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
        section.select_one('.hero-desktop .btn-primary')
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
        section.select_one('.hero-desktop .btn-secondary')
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
    # .hero-ctas layout now handled by sgs/multi-button attributes
    if '.hero-ctas' in section_rules:
        consumed_rules.add('.hero-ctas')
    media_key_ctas = next(
        (k for k in section_rules
         if '@media' in k and '768px' in k and '.hero-copy .hero-ctas' in k),
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


# ---- Block markup serialiser ----

def serialize_block(block_name: str, attributes: dict,
                    inner_blocks: list | None = None) -> str:
    """Serialise a block into WP block-comment markup.

    When inner_blocks is None or empty: emit a self-closing comment
      (correct for dynamic blocks with no InnerBlocks slot).

    When inner_blocks has entries: emit an opening comment, a div wrapper,
      recursively serialised inner blocks, then a closing comment.
      This is required for blocks whose save() returns <InnerBlocks.Content />
      (e.g. sgs/hero, sgs/multi-button) so the WP serialiser can round-trip
      the InnerBlocks tree through post_content.
    """
    # Build the slug used in HTML class names: sgs/hero -> sgs-hero
    name_slug = block_name.replace('/', '-').replace('_', '-')

    attrs_json = json.dumps(attributes, separators=(',', ':'), ensure_ascii=False)

    if not inner_blocks:
        return f'<!-- wp:{block_name} {attrs_json} /-->'

    # Opening comment
    lines = [f'<!-- wp:{block_name} {attrs_json} -->']
    # Wrapper div (required for InnerBlocks serialisation round-trip)
    lines.append(f'<div class="wp-block-{name_slug}">')
    # Recurse
    for ib in inner_blocks:
        child = serialize_block(
            ib['name'],
            ib.get('attributes', {}),
            ib.get('inner_blocks') or None,
        )
        # Indent each line of the child block by 2 spaces
        for line in child.splitlines():
            lines.append(f'  {line}')
    lines.append(f'</div>')
    # Closing comment
    lines.append(f'<!-- /wp:{block_name} -->')

    return '\n'.join(lines)


# ---- Coverage report ----

def coverage_report(schema: dict, extracted: dict) -> dict:
    declared = schema['attributes']
    extracted_keys = set(extracted.keys())
    declared_keys = set(declared.keys())

    return {
        'declared': len(declared_keys),
        'extracted': len(extracted_keys),
        'extracted_attrs': sorted(extracted_keys),
        'not_extracted': sorted(declared_keys - extracted_keys),
        'coverage_pct': round(len(extracted_keys) / len(declared_keys) * 100, 1),
    }


# ---- Main ----

EXTRACTORS = {
    'sgs/hero': extract_hero,
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--mockup', required=True)
    p.add_argument('--section', required=True, help='CSS selector for the section in mockup')
    p.add_argument('--block', required=True, help='Target block name e.g. sgs/hero')
    p.add_argument('--out', help='Optional: write resulting block markup to this file')
    p.add_argument('--media-map', help='Optional JSON file mapping mockup filenames to {id, url}')
    args = p.parse_args()

    html = Path(args.mockup).read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    section = soup.select_one(args.section)
    if not section:
        print(f'ERROR: section not found: {args.section}', file=sys.stderr)
        sys.exit(1)

    css_rules = parse_mockup_styles(html)
    css_var_map = build_css_var_to_slug(html)

    schema = load_block_schema(args.block)

    extractor = EXTRACTORS.get(args.block)
    if not extractor:
        print(f'ERROR: no extractor registered for {args.block}', file=sys.stderr)
        sys.exit(2)

    media_map = {}
    if args.media_map:
        media_map = json.loads(Path(args.media_map).read_text(encoding='utf-8'))

    ctx = {
        'css_rules': css_rules,
        'css_var_to_slug': css_var_map,
        'mockup_path': args.mockup,
        'media_map': media_map,
    }

    # Pull ALL CSS rules that target this section (per Bean's directive: "all CSS every time")
    section_css = collect_section_css(section, css_rules)
    ctx['section_css'] = section_css

    # Run the extractor — returns (attrs, inner_blocks) tuple
    result = extractor(section, ctx)
    if isinstance(result, tuple):
        extracted, inner_blocks = result
    else:
        # Future-proof: single-value return from non-hero extractors
        extracted, inner_blocks = result, []

    # Compute remainder: rules / declarations not consumed by attribute mapping
    consumed_rules = set(extracted.pop('_consumed_rules', set()))
    consumed_decls = extracted.pop('_consumed_decls', {})
    anchor = extracted.get('anchor') or 'sgs-hero-1'
    extracted.setdefault('anchor', anchor)
    custom_css = emit_scoped_custom_css(anchor, section_css, consumed_rules, consumed_decls)
    if custom_css:
        extracted['_pending_custom_css'] = custom_css

    # Build clean attributes (no internal keys)
    clean_attrs = {k: v for k, v in extracted.items() if not k.startswith('_')}

    # Serialise: hero is a dynamic block with InnerBlocks, so use nested serialisation
    markup = serialize_block(args.block, clean_attrs, inner_blocks or None)

    if extracted.get('_pending_custom_css'):
        css = extracted['_pending_custom_css']
        markup += '\n\n<!-- wp:html -->\n<style>\n' + css + '\n</style>\n<!-- /wp:html -->'

    coverage = coverage_report(schema, clean_attrs)
    coverage['css_rules_total'] = len(section_css)
    coverage['css_rules_absorbed'] = len(consumed_rules)
    coverage['css_rules_universal_handled'] = sum(
        1 for k in section_css
        if k not in consumed_rules and is_universal_handled(k)
    )
    remainder_keys = [
        k for k in section_css
        if k not in consumed_rules and not is_universal_handled(k)
    ]
    coverage['css_rules_scoped_custom'] = len(remainder_keys)

    print('=== EXTRACTED ATTRIBUTES ===')
    for k, v in sorted(clean_attrs.items()):
        v_s = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
        if len(v_s) > 80:
            v_s = v_s[:77] + '...'
        print(f'  {k:35}  {v_s}')

    print()
    print('=== INNER BLOCKS ===')
    if inner_blocks:
        def _describe(blocks, indent=0):
            for b in blocks:
                prefix = '  ' * indent
                attrs_short = {k: v for k, v in b.get('attributes', {}).items()}
                print(f'{prefix}  {b["name"]} {attrs_short}')
                _describe(b.get('inner_blocks', []), indent + 1)
        _describe(inner_blocks)
    else:
        print('  (none)')

    print()
    print('=== COVERAGE ===')
    print(f"  Block attributes declared:    {coverage['declared']}")
    print(f"  Block attributes extracted:   {coverage['extracted']} ({coverage['coverage_pct']}%)")
    print(f"  CSS rules harvested:          {coverage['css_rules_total']}")
    print(f"  CSS rules absorbed via attrs: {coverage['css_rules_absorbed']}")
    print(f"  CSS rules universal-handled:  {coverage['css_rules_universal_handled']}")
    print(f"  CSS rules scoped-custom:      {coverage['css_rules_scoped_custom']}")
    print(f"  Not extracted ({len(coverage['not_extracted'])}):")
    for a in coverage['not_extracted']:
        print(f'    - {a}')

    print()
    print('=== BLOCK MARKUP ===')
    print(markup)

    if args.out:
        Path(args.out).write_text(markup, encoding='utf-8')
        print(f'\nWrote: {args.out}')


if __name__ == '__main__':
    main()
