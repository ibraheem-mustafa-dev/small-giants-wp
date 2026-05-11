"""
Recogniser v2 — Spec 14 P4 catalogue-driven dispatcher.

After P4 the extractor is no longer hero-hardcoded. The dispatcher:

  1. Reads the Layer 3 entry for the target block from the spec 14 catalogue
     (`plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json`).
  2. Resolves a per-block override (currently only `sgs/hero`) — if registered,
     the override owns extraction for the attributes it lists.
  3. For each remaining slot, looks up the slot's Layer 2 role and dispatches
     to the matching generic strategy in `extract_strategies.py`.

Output shape is unchanged for backwards compatibility with downstream
serialisation; extracted attribute values are still raw scalars / dicts.
A debug-only `--emit-strategy-trace` flag adds per-attribute strategy +
confidence metadata to the JSON output.

Usage:
  python tools/recogniser-v2/extract.py \\
    --mockup sites/mamas-munches/mockups/homepage/index.html \\
    --section "section.sgs-hero" \\
    --block sgs/hero \\
    --media-map sites/mamas-munches/research/sandybrown-media-map.json \\
    --out tests/golden/hero-extraction-baseline.json

Regression-test mode:
  python tools/recogniser-v2/extract.py ... --verify-against tests/golden/hero-extraction-baseline.json

Install:
  pip install playwright beautifulsoup4
  playwright install chromium
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

from utils import (
    _px_to_int, _px_to_float, _line_height_to_em,
    text, attr, img_object,
    is_universal_handled, _strip_media_prefix,
    _normalise_var, build_css_var_to_slug,
    _get,
)
from overrides import OVERRIDES, get_override
import extract_strategies


REPO = Path(__file__).resolve().parents[2]
CATALOGUE = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'fingerprint-builder' / 'output'

# Properties we always read for any fingerprinted element. Any property the
# browser computes can be added here without touching the JS (it's enumerated).
WATCHED_CSS_PROPS = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'lineHeight', 'letterSpacing', 'textTransform', 'textDecoration', 'textAlign',
    'color', 'backgroundColor', 'backgroundImage',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'width', 'height', 'minHeight', 'maxWidth',
    'display', 'flexDirection', 'justifyContent', 'alignItems',
    'gridTemplateColumns', 'gap',
    'objectFit', 'objectPosition',
    'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
    'borderBottomRightRadius', 'borderBottomLeftRadius',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'boxShadow', 'transition',
    'overflow',
]

VIEWPORTS = {
    'desktop': (1440, 900),
    'tablet':  (768, 1024),
    'mobile':  (375, 812),
}


# ---------------------------------------------------------------------------
# Playwright wrapper — load mockup in Chromium and capture computed styles
# at all three viewports for the supplied fingerprint selectors.
# ---------------------------------------------------------------------------
def extract_computed_styles(mockup_path: Path, selectors: list,
                            check_fonts: bool = True) -> tuple[dict, list]:
    """Returns ({viewport: {selector: {prop: value}}}, font_report)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('WARNING: playwright not installed — skipping computed-style extraction.', file=sys.stderr)
        print('         pip install playwright && playwright install chromium', file=sys.stderr)
        return {}, []

    file_url = 'file:///' + str(mockup_path.resolve()).replace('\\', '/')
    computed: dict = {vp: {} for vp in VIEWPORTS}
    font_report: list = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for vp_name, (w, h) in VIEWPORTS.items():
                context = browser.new_context(viewport={'width': w, 'height': h})
                page = context.new_page()
                page.goto(file_url, wait_until='networkidle')
                try:
                    page.evaluate('document.fonts && document.fonts.ready')
                    page.wait_for_function('document.fonts.status === "loaded"', timeout=3000)
                except Exception:
                    pass

                for sel in selectors:
                    js = """
                        (args) => {
                            const [sel, props] = args;
                            const el = document.querySelector(sel);
                            if (!el) return null;
                            const cs = window.getComputedStyle(el);
                            const out = {};
                            for (const p of props) out[p] = cs[p];
                            out._inlineStyle = el.getAttribute('style') || '';
                            return out;
                        }
                    """
                    try:
                        result = page.evaluate(js, [sel, WATCHED_CSS_PROPS])
                    except Exception as e:
                        result = None
                        print(f'  [warn] computed-style query failed for {sel}: {e}', file=sys.stderr)
                    if result:
                        computed[vp_name][sel] = result

                if check_fonts and vp_name == 'desktop':
                    try:
                        font_report = page.evaluate("""
                            () => {
                                if (!document.fonts) return [];
                                const seen = new Map();
                                const rank = { loaded: 4, loading: 3, unloaded: 2, error: 1 };
                                for (const f of document.fonts) {
                                    const key = `${f.family}|${f.weight}|${f.style}`;
                                    const prev = seen.get(key);
                                    const cur = { family: f.family, weight: f.weight, style: f.style, status: f.status };
                                    if (!prev || rank[cur.status] > rank[prev.status]) {
                                        seen.set(key, cur);
                                    }
                                }
                                return [...seen.values()];
                            }
                        """)
                    except Exception:
                        font_report = []

                context.close()
        finally:
            browser.close()

    return computed, font_report


# ---------------------------------------------------------------------------
# Catalogue loaders
# ---------------------------------------------------------------------------
_LAYER3_CACHE: dict | None = None
_ROLE_TEMPLATES_CACHE: dict | None = None


def load_layer3() -> dict:
    global _LAYER3_CACHE
    if _LAYER3_CACHE is None:
        path = CATALOGUE / 'layer-3-internal-elements.json'
        _LAYER3_CACHE = json.loads(path.read_text(encoding='utf-8'))
    return _LAYER3_CACHE


def load_role_templates() -> dict:
    global _ROLE_TEMPLATES_CACHE
    if _ROLE_TEMPLATES_CACHE is None:
        path = CATALOGUE / 'role-templates.json'
        _ROLE_TEMPLATES_CACHE = json.loads(path.read_text(encoding='utf-8'))
    return _ROLE_TEMPLATES_CACHE


# ---------------------------------------------------------------------------
# Block schema (from block.json) + CSS rule parser
# ---------------------------------------------------------------------------
def auto_derive_responsive_attrs(schema: dict) -> dict:
    """Inspect block.json attributes for Mobile/Tablet/Desktop suffixes."""
    attrs = schema.get('attributes', {}) or {}
    bases: dict = {}
    for name in attrs:
        for suffix in ('Mobile', 'Tablet', 'Desktop'):
            if name.endswith(suffix):
                base = name[:-len(suffix)]
                bases.setdefault(base, []).append(suffix)
                break
    return bases


def load_block_schema(block_name: str) -> dict:
    """Load a block's attributes from its block.json file. Returns {} if missing."""
    _, name = block_name.split('/', 1)
    path = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks' / name / 'block.json'
    if not path.exists():
        return {'attributes': {}}
    return json.loads(path.read_text(encoding='utf-8'))


def _parse_rules_in_block(css: str, media_prefix: str = '') -> dict[str, dict[str, str]]:
    """Parse CSS declarations from a chunk. Returns {selector_key: {prop: val}}."""
    out: dict[str, dict[str, str]] = {}
    i = 0
    chunk_start = 0
    while i < len(css):
        ch = css[i]
        if ch == '{':
            selector_or_at = css[chunk_start:i].strip()
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
                combined = (media_prefix + ' ' + selector_or_at).strip() if media_prefix else selector_or_at
                nested = _parse_rules_in_block(body, combined)
                out.update(nested)
            elif selector_or_at.startswith('@'):
                pass
            else:
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
    """Extract CSS rules from <style> blocks. Returns {selector: {prop: value}}."""
    rules: dict[str, dict[str, str]] = {}
    for css in re.findall(r'<style[^>]*>(.+?)</style>', html, flags=re.DOTALL):
        css = re.sub(r'/\*.+?\*/', '', css, flags=re.DOTALL)
        rules.update(_parse_rules_in_block(css))
    return rules


# ---------------------------------------------------------------------------
# Generic dispatcher (NEW — replaces FINGERPRINTS + EXTRACTORS hard-coded path)
# ---------------------------------------------------------------------------
def extract_block(block_name: str, section, ctx: dict,
                  emit_strategy_trace: bool = False) -> tuple[dict, list, dict]:
    """Catalogue-driven dispatcher.

    For each Layer 3 slot of *block_name*:
      - If override registered AND override handles the attribute -> override extracts
      - Else dispatch by role to extract_strategies

    Returns (attrs, inner_blocks, strategy_trace) where strategy_trace maps
    attribute_name -> {confidence, strategy, source}. Caller decides whether
    to keep the trace in the final output JSON.
    """
    layer3 = load_layer3()
    block_entry = layer3.get('blocks', {}).get(block_name)
    if block_entry is None:
        print(f'  [warn] no Layer 3 entry for {block_name}; falling through to override-only path', file=sys.stderr)
        block_entry = {'slots': []}

    override = get_override(block_name)
    attrs: dict = {}
    inner_blocks: list = []
    trace: dict = {}

    # Override path FIRST — for hero this populates ~50 attrs.
    if override is not None:
        result = override['extract'](section, ctx)
        if isinstance(result, tuple):
            attrs, inner_blocks = result
        else:
            attrs = result
        # Track override-handled keys for trace
        for k in attrs:
            if not k.startswith('_'):
                trace[k] = {'strategy': 'override', 'confidence': 1.0, 'source': override['block_name']}

    # Convention path — for slots NOT yet populated by the override.
    # Walk Layer 3 slots; for each unmapped attribute, dispatch by role.
    handled = set(attrs.keys())
    computed = ctx.get('computed') or {}
    viewport = ctx.get('viewport') or 'desktop'
    media_map = ctx.get('media_map') or {}

    for slot in block_entry.get('slots', []):
        attr_name = slot.get('attribute')
        if not attr_name or attr_name in handled:
            continue
        role = slot.get('role')
        if not role:
            continue
        value, confidence, strategy_label = extract_strategies.dispatch(
            role, slot, section, computed, viewport, media_map,
        )
        if value is not None:
            attrs[attr_name] = value
            trace[attr_name] = {'strategy': strategy_label, 'confidence': confidence, 'source': 'convention'}

    if not emit_strategy_trace:
        # Trace is internal only — caller adds to JSON if --emit-strategy-trace
        pass
    return attrs, inner_blocks, trace


# ---------------------------------------------------------------------------
# Block markup serialiser
# ---------------------------------------------------------------------------
def serialize_block(block_name: str, attributes: dict,
                    inner_blocks: list | None = None) -> str:
    """Serialise a block into WP block-comment markup."""
    name_slug = block_name.replace('/', '-').replace('_', '-')
    attrs_json = json.dumps(attributes, separators=(',', ':'), ensure_ascii=False)
    if not inner_blocks:
        return f'<!-- wp:{block_name} {attrs_json} /-->'
    lines = [f'<!-- wp:{block_name} {attrs_json} -->']
    lines.append(f'<div class="wp-block-{name_slug}">')
    for ib in inner_blocks:
        child = serialize_block(
            ib['name'],
            ib.get('attributes', {}),
            ib.get('inner_blocks') or None,
        )
        for line in child.splitlines():
            lines.append(f'  {line}')
    lines.append(f'</div>')
    lines.append(f'<!-- /wp:{block_name} -->')
    return '\n'.join(lines)


def coverage_report(schema: dict, extracted: dict) -> dict:
    declared = schema.get('attributes', {}) or {}
    extracted_keys = set(extracted.keys())
    declared_keys = set(declared.keys())
    return {
        'declared': len(declared_keys),
        'extracted': len(extracted_keys),
        'extracted_attrs': sorted(extracted_keys),
        'not_extracted': sorted(declared_keys - extracted_keys),
        'coverage_pct': round(len(extracted_keys) / max(len(declared_keys), 1) * 100, 1),
    }


# ---------------------------------------------------------------------------
# Main + CLI
# ---------------------------------------------------------------------------
def _fingerprint_for_block(block_name: str) -> list[str]:
    """Return the list of CSS selectors to probe via Playwright for *block_name*.

    Hero uses HERO_FINGERPRINT_SELECTORS verbatim (regression contract).
    Other blocks: probe every selector listed in their Layer 3 slot list.
    """
    override = get_override(block_name)
    if override and 'fingerprint_selectors' in override:
        return override['fingerprint_selectors']
    layer3 = load_layer3()
    block_entry = layer3.get('blocks', {}).get(block_name, {})
    selectors: list[str] = []
    seen: set = set()
    for slot in block_entry.get('slots', []):
        sel = slot.get('selector')
        if sel and sel not in seen:
            selectors.append(sel)
            seen.add(sel)
    return selectors


def _verify_against(baseline_path: Path, attrs: dict, strict: bool = False) -> int:
    """Diff *attrs* against a baseline JSON's attributes block.

    Default: "no-regression" mode — fails if any baseline attribute is missing
    or has a different value. Additional attributes added by the dispatcher
    are allowed (additive enhancement from the spec 14 catalogue).

    `strict=True`: fail on any delta including additions (bit-exact contract).

    Returns 0 on PASS, 1 on regression.
    """
    baseline = json.loads(baseline_path.read_text(encoding='utf-8'))
    baseline_attrs = baseline.get('attributes', {})
    a_keys = set(baseline_attrs.keys())
    b_keys = set(attrs.keys())
    only_in_a = a_keys - b_keys
    only_in_b = b_keys - a_keys
    diff_values = [k for k in a_keys & b_keys if baseline_attrs[k] != attrs[k]]
    if strict and (only_in_a or only_in_b or diff_values):
        print(f'VERIFY [strict]: drift vs {baseline_path}', file=sys.stderr)
    elif only_in_a or diff_values:
        print(f'VERIFY: REGRESSION vs {baseline_path}', file=sys.stderr)
    else:
        added_note = f' (+{len(only_in_b)} additive)' if only_in_b else ''
        print(f'VERIFY: PASS — no regression vs {baseline_path}{added_note}', file=sys.stderr)
        return 0
    print(f'  missing in current ({len(only_in_a)}): {sorted(only_in_a)}', file=sys.stderr)
    print(f'  added in current   ({len(only_in_b)}): {sorted(only_in_b)}', file=sys.stderr)
    print(f'  value differs      ({len(diff_values)}): {sorted(diff_values)}', file=sys.stderr)
    return 1


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--mockup', required=True)
    p.add_argument('--section', required=True, help='CSS selector for the section in mockup')
    p.add_argument('--block', required=True, help='Target block name e.g. sgs/hero')
    p.add_argument('--out', help='Optional: write markup OR JSON to this file (.json -> structured output)')
    p.add_argument('--media-map', help='Optional JSON file mapping mockup filenames to {id, url}')
    p.add_argument('--viewport', type=int, default=1440, help='Desktop viewport width (default 1440)')
    p.add_argument('--check-fonts', dest='check_fonts', action='store_true', default=True)
    p.add_argument('--no-check-fonts', dest='check_fonts', action='store_false')
    p.add_argument('--no-playwright', action='store_true',
                   help='Skip computed-style extraction (BS4-only legacy mode)')
    p.add_argument('--verify-against', help='Diff result vs a baseline JSON file (no-regression mode by default)')
    p.add_argument('--verify-strict', action='store_true',
                   help='With --verify-against, require bit-exact match (fail on additive deltas)')
    p.add_argument('--emit-strategy-trace', action='store_true',
                   help='Embed per-attribute strategy + confidence in JSON output')
    args = p.parse_args()

    if args.viewport and args.viewport != 1440:
        VIEWPORTS['desktop'] = (args.viewport, 900)

    html = Path(args.mockup).read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    section = soup.select_one(args.section)
    if not section:
        print(f'ERROR: section not found: {args.section}', file=sys.stderr)
        sys.exit(1)

    css_rules = parse_mockup_styles(html)
    css_var_map = build_css_var_to_slug(html)
    schema = load_block_schema(args.block)

    media_map: dict = {}
    if args.media_map:
        media_map = json.loads(Path(args.media_map).read_text(encoding='utf-8'))

    # Playwright computed-style pass (drives override + role-based dispatch)
    computed: dict = {}
    font_report: list = []
    if not args.no_playwright:
        selectors = _fingerprint_for_block(args.block)
        if selectors:
            print(f'Loading mockup in Chromium across {len(VIEWPORTS)} viewports...', file=sys.stderr)
            computed, font_report = extract_computed_styles(
                Path(args.mockup), selectors, check_fonts=args.check_fonts,
            )

    ctx = {
        'css_rules': css_rules,
        'css_var_to_slug': css_var_map,
        'mockup_path': args.mockup,
        'media_map': media_map,
        'computed': computed,
        'viewport': 'desktop',
    }

    # Hero override needs section_css populated up front (it pre-existed this refactor)
    from overrides.hero import collect_section_css, emit_scoped_custom_css
    section_css = collect_section_css(section, css_rules)
    ctx['section_css'] = section_css

    # Dispatch
    extracted, inner_blocks, strategy_trace = extract_block(args.block, section, ctx)

    # Hero-specific computed-style overrides (the existing apply_computed_overrides_hero pass)
    if args.block == 'sgs/hero' and computed:
        from overrides.hero import apply_computed_overrides_hero
        apply_computed_overrides_hero(extracted, computed, css_var_map)

    # Compute custom-CSS remainder (hero-specific, but harmless for other blocks)
    consumed_rules = set(extracted.pop('_consumed_rules', set()))
    consumed_decls = extracted.pop('_consumed_decls', {})
    anchor = extracted.get('anchor') or f'{args.block.replace("/", "-")}-1'
    extracted.setdefault('anchor', anchor)
    custom_css = emit_scoped_custom_css(anchor, section_css, consumed_rules, consumed_decls)
    if custom_css:
        extracted['_pending_custom_css'] = custom_css

    clean_attrs = {k: v for k, v in extracted.items() if not k.startswith('_')}

    # Serialise to WP markup
    markup = serialize_block(args.block, clean_attrs, inner_blocks or None)
    if extracted.get('_pending_custom_css'):
        css = extracted['_pending_custom_css']
        markup += '\n\n<!-- wp:html -->\n<style>\n' + css + '\n</style>\n<!-- /wp:html -->'

    coverage = coverage_report(schema, clean_attrs)
    coverage['css_rules_total'] = len(section_css)
    coverage['css_rules_absorbed'] = len(consumed_rules)
    coverage['css_rules_universal_handled'] = sum(
        1 for k in section_css if k not in consumed_rules and is_universal_handled(k)
    )
    remainder_keys = [k for k in section_css if k not in consumed_rules and not is_universal_handled(k)]
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
                print(f'{prefix}  {b["name"]} {b.get("attributes", {})}')
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
    print('=== FONT LOAD REPORT ===')
    if font_report:
        loaded = [f for f in font_report if f.get('status') == 'loaded']
        failed = [f for f in font_report if f.get('status') in ('error', 'unloaded')]
        for f in font_report:
            marker = 'OK' if f.get('status') == 'loaded' else 'WARN'
            print(f"  [{marker}] {f.get('family'):20} weight={f.get('weight'):8} style={f.get('style'):8} status={f.get('status')}")
        if failed:
            print(f'  WARNING: {len(failed)} font face(s) failed to load.')
        else:
            print(f'  All {len(loaded)} font face(s) loaded successfully.')
    elif args.no_playwright:
        print('  (skipped — --no-playwright)')
    else:
        print('  (no fonts enumerated)')

    # Auto-derived responsive coverage
    responsive_bases = auto_derive_responsive_attrs(schema)
    extracted_keys = set(clean_attrs.keys())
    auto_total = 0
    auto_covered = 0
    for base, suffixes in sorted(responsive_bases.items()):
        for suffix in suffixes:
            auto_total += 1
            if (base + suffix) in extracted_keys:
                auto_covered += 1
    print()
    print('=== RESPONSIVE ATTRIBUTE COVERAGE (auto-derived from block.json) ===')
    print(f'  Responsive variants declared: {auto_total}')
    pct = round(auto_covered / auto_total * 100, 1) if auto_total else 0
    print(f'  Responsive variants extracted: {auto_covered} ({pct}%)')

    fonts_total = len(font_report)
    fonts_loaded = sum(1 for f in font_report if f.get('status') == 'loaded')
    print()
    print(f'SUMMARY: Extracted {coverage["extracted"]} of {coverage["declared"]} declared attributes '
          f'({coverage["declared"]} from block.json), {fonts_total} fonts checked '
          f'({fonts_loaded} loaded successfully)')

    print()
    print('=== BLOCK MARKUP ===')
    print(markup)

    if args.out:
        out_path = Path(args.out)
        if out_path.suffix.lower() == '.json':
            payload = {
                'block_name': args.block,
                'attributes': clean_attrs,
                'inner_blocks': inner_blocks,
                'markup': markup,
                'coverage': {
                    'declared': coverage['declared'],
                    'extracted': coverage['extracted'],
                    'coverage_pct': coverage['coverage_pct'],
                    'not_extracted': coverage['not_extracted'],
                    'css_rules_total': coverage['css_rules_total'],
                    'css_rules_absorbed': coverage['css_rules_absorbed'],
                    'css_rules_universal_handled': coverage['css_rules_universal_handled'],
                    'css_rules_scoped_custom': coverage['css_rules_scoped_custom'],
                    'responsive_variants_declared': auto_total,
                    'responsive_variants_extracted': auto_covered,
                },
                'fonts': font_report,
                'computed_styles': computed,
            }
            if args.emit_strategy_trace:
                payload['strategy_trace'] = strategy_trace
            out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')
            print(f'\nWrote JSON: {args.out}')
        else:
            out_path.write_text(markup, encoding='utf-8')
            print(f'\nWrote markup: {args.out}')

    if args.verify_against:
        rc = _verify_against(Path(args.verify_against), clean_attrs, strict=args.verify_strict)
        sys.exit(rc)


if __name__ == '__main__':
    main()
