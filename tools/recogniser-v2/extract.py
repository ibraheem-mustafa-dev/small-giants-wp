"""
Recogniser v2 — Approach B: per-section attribute extractor.

Takes:
  - mockup HTML (with embedded <style>)
  - section selector (e.g. 'section.hero')
  - target block name (e.g. 'sgs/hero')

Returns:
  - extracted attributes dict
  - WP block-comment markup string
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
# Each block has an `extractors` map: attr_name → callable(section_el, ctx) → value | None
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

    `consumed_rules`: full rule keys that were entirely absorbed by attribute mapping.
    `consumed_decls`: per-rule-key set of declaration property names that were absorbed.
    """
    chunks = []
    for key, decls in rules.items():
        if key in consumed_rules:
            continue
        used = consumed_decls.get(key, set())
        remaining = {p: v for p, v in decls.items() if p not in used}
        if not remaining:
            continue

        body = '; '.join(f'{p}: {v}' for p, v in remaining.items())
        chunks.append(emit_scoped_custom_css_format_key(key, section_anchor, body))
    return '\n'.join(chunks)


def extract_hero(section, ctx):
    """sgs/hero — Approach B implementation for the hero block."""
    out = {}
    consumed_rules: set = set()
    consumed_decls: dict[str, set] = {}

    def mark(rule_key: str, *props):
        if not props:
            consumed_rules.add(rule_key)
        else:
            consumed_decls.setdefault(rule_key, set()).update(props)

    media_map = ctx.get('media_map', {})

    # Variant: split if mockup has both .hero-desktop AND .hero-photo, else standard
    has_desktop = section.select_one('.hero-desktop')
    has_photo = section.select_one('.hero-photo')
    if has_desktop and has_photo:
        out['variant'] = 'split'
    else:
        out['variant'] = 'standard'

    # Headline — prefer desktop layout's h1 since it has the canonical line-break
    h_desktop = section.select_one('.hero-desktop h1') or section.select_one('h1')
    if h_desktop:
        # Preserve <br> as newline-collapsed whitespace; for block attribute we just need text
        out['headline'] = h_desktop.get_text(' ', strip=True)

    # Sub-headline
    sub = section.select_one('.hero-desktop .hero-sub') or section.select_one('.hero-sub')
    if sub:
        out['subHeadline'] = sub.get_text(strip=True)

    # CTAs
    primary = section.select_one('.hero-desktop .btn-primary') or section.select_one('.btn-primary')
    if primary:
        out['ctaPrimaryText'] = primary.get_text(strip=True)
        href = primary.get('href')
        if href:
            out['ctaPrimaryUrl'] = href

    secondary = section.select_one('.hero-desktop .btn-secondary') or section.select_one('.btn-secondary')
    if secondary:
        out['ctaSecondaryText'] = secondary.get_text(strip=True)
        href = secondary.get('href')
        if href:
            out['ctaSecondaryUrl'] = href

    # Split image — resolve via media_map to sandybrown URL + media ID
    if out['variant'] == 'split':
        img = (
            img_object(section, '.hero-photo img', media_map=media_map)
            or img_object(section, '.hero-desktop img', media_map=media_map)
        )
        if img:
            out['splitImage'] = img

    # Background colour from CSS rule on .hero
    rules = ctx.get('css_rules', {})
    section_rules = ctx.get('section_css', rules)

    if '.hero' in section_rules:
        bg = section_rules['.hero'].get('background', '').strip()
        if bg:
            slug = ctx['css_var_to_slug'].get(_normalise_var(bg))
            if slug:
                out['backgroundColor'] = slug
                mark('.hero', 'background')
        # 'overflow: hidden' is a layout side-effect — not block-attribute material; leave to custom CSS

    # Text colour — desktop h1 wins
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

    # Sub-headline colour + font sizes per breakpoint
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
        fs = section_rules['.hero-content .hero-sub'].get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSizeMobile'] = fs
            mark('.hero-content .hero-sub', 'font-size')

    # Sub-headline font size (tablet+ = .hero-copy .hero-sub) — base + tablet
    if '.hero-copy .hero-sub' in section_rules:
        fs = section_rules['.hero-copy .hero-sub'].get('font-size', '').strip()
        if fs:
            out['subHeadlineFontSize'] = fs
            mark('.hero-copy .hero-sub', 'font-size')

    # Min-height from .hero-desktop in @media (min-width: 768px)
    media_key_768 = next((k for k in section_rules if '@media' in k and '768px' in k and '.hero-desktop' in k and 'min-height' in section_rules[k]), None)
    if media_key_768:
        mh = section_rules[media_key_768].get('min-height', '').strip()
        if mh:
            out['minHeight'] = mh
            mark(media_key_768, 'min-height')

    # CTA styles — block uses ctaPrimaryStyle enum: accent | primary | outline | custom
    btn_primary = section_rules.get('.btn-primary', {})
    if 'background' in btn_primary:
        slug = ctx['css_var_to_slug'].get(_normalise_var(btn_primary['background']))
        if slug == 'accent':
            out['ctaPrimaryStyle'] = 'accent'
        elif slug == 'primary':
            out['ctaPrimaryStyle'] = 'primary'
        # Mark the whole .btn-primary rule as consumed (block applies its own CTA styling per ctaPrimaryStyle)
        consumed_rules.add('.btn-primary')

    btn_secondary = section_rules.get('.btn-secondary', {})
    if btn_secondary:
        # outline style fits btn-secondary semantics
        out['ctaSecondaryStyle'] = 'outline'
        consumed_rules.add('.btn-secondary')

    # Anchor for scoping any unmapped CSS
    out['anchor'] = 'sgs-hero-1'

    out['_consumed_rules'] = consumed_rules
    out['_consumed_decls'] = consumed_decls
    return out


def _normalise_var(v: str) -> str:
    """Normalise 'var(--surface-pink)' or 'var(--text)' → '--surface-pink' / '--text'."""
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


# ---- Block markup serialiser (forward-only; canonical via WP later if needed) ----

def serialize_block(block_name: str, attributes: dict) -> str:
    """Emit a self-closing block-comment for a dynamic block: <!-- wp:NAME {ATTRS} /-->.
    For dynamic blocks (sgs/hero is dynamic) this is canonical because save() returns null.
    """
    attrs_json = json.dumps(attributes, separators=(',', ':'), ensure_ascii=False)
    return f'<!-- wp:{block_name} {attrs_json} /-->'


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

    extracted = extractor(section, ctx)

    # Compute remainder: rules / declarations not consumed by attribute mapping
    consumed_rules = set(extracted.pop('_consumed_rules', set()))
    consumed_decls = extracted.pop('_consumed_decls', {})
    anchor = extracted.get('anchor') or 'sgs-hero-1'
    extracted.setdefault('anchor', anchor)
    custom_css = emit_scoped_custom_css(anchor, section_css, consumed_rules, consumed_decls)
    if custom_css:
        # SGS hero block doesn't have a customCSS attribute. We attach via wp:html block
        # as a scoped <style> sibling. For the markup output we emit as a separate block.
        extracted['_pending_custom_css'] = custom_css

    markup = serialize_block(args.block, {k: v for k, v in extracted.items() if not k.startswith('_')})

    if extracted.get('_pending_custom_css'):
        css = extracted['_pending_custom_css']
        # Emit a wp:html block carrying the scoped style after the hero block
        markup += '\n\n<!-- wp:html -->\n<style>\n' + css + '\n</style>\n<!-- /wp:html -->'

    coverage = coverage_report(schema, {k: v for k, v in extracted.items() if not k.startswith('_')})
    coverage['css_rules_total'] = len(section_css)
    coverage['css_rules_via_attrs'] = len(consumed_rules)
    coverage['css_rules_remainder'] = len(section_css) - len(consumed_rules)

    print('=== EXTRACTED ATTRIBUTES ===')
    for k, v in sorted(extracted.items()):
        v_s = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
        if len(v_s) > 80:
            v_s = v_s[:77] + '...'
        print(f'  {k:25}  {v_s}')

    print()
    print('=== COVERAGE ===')
    print(f"  Block attributes declared:  {coverage['declared']}")
    print(f"  Block attributes extracted: {coverage['extracted']} ({coverage['coverage_pct']}%)")
    print(f"  CSS rules harvested:        {coverage['css_rules_total']}")
    print(f"  CSS rules absorbed via attrs: {coverage['css_rules_via_attrs']}")
    print(f"  CSS rules emitted as custom: {coverage['css_rules_remainder']}")
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
