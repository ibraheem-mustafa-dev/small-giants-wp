"""Phase 3 Step 6 — generate Layer 3 internal-elements catalogue.

Deterministic generator (replaces the planned 8-way Sonnet fanout — rules in
plan §Step 6 are fully deterministic, so a script produces byte-identical output
without LLM cost or non-determinism).

For each registered SGS block:
  1. Locate block.json (`plugins/sgs-blocks/src/blocks/<slug>/block.json`).
  2. For each attribute in block.json, derive a DOM slot via 4 rules:
       (a) `selectors.<attr>` field in block.json (explicit override)
       (b) render.php contains `.sgs-<slug>__<elem>` echo paired with attribute
       (c) attribute name → BEM element convention
       (d) fallback: log as `selector-derivation-failed`
  3. Tag each slot with its Layer 2 role (lookup via role-templates.json
     `applies_to_attribute_names`).
  4. Cross-reference v1 `fingerprints.json` for `required_features` and
     `optional_features` (FR26 augmentation; ignores stale `block_type`).
  5. Hero (`sgs/hero`) entry is hand-authored to mirror HERO_FINGERPRINT_SELECTORS
     bit-for-bit (Step 7 regression contract).
"""
from __future__ import annotations
import json, os, re, sqlite3, sys
from collections import defaultdict

PROJECT = os.path.expanduser('~/Projects/small-giants-wp')
DB_PATH = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
BLOCKS_ROOT = os.path.join(PROJECT, 'plugins/sgs-blocks/src/blocks')
OUT_DIR = os.path.join(PROJECT, 'plugins/sgs-blocks/scripts/fingerprint-builder/output')
V1_FINGERPRINTS = os.path.join(PROJECT, 'tools/recogniser/data/fingerprints.json')
ROLE_TEMPLATES = os.path.join(OUT_DIR, 'role-templates.json')

GENERATED_AT = 'phase-3-initial-build'

# Hero regression baseline — must match tools/recogniser-v2/extract.py exactly
HERO_FINGERPRINT_SELECTORS = [
    '.hero',
    '.hero-copy',
    '.hero-copy h1',
    '.hero-copy .hero-sub',
    '.hero-content',
    '.hero-content h1',
    '.hero-content .hero-sub',
    '.hero-photo',
    '.hero-photo img',
    '.hero-mobile-img',
    '.section-label',
]


def load_role_lookup() -> dict[str, str]:
    """Build attribute_name -> role_slug map from role-templates.json."""
    data = json.load(open(ROLE_TEMPLATES, encoding='utf-8'))
    lookup: dict[str, str] = {}
    for role_slug, role_def in data['roles'].items():
        for attr in role_def.get('applies_to_attribute_names', []):
            lookup.setdefault(attr, role_slug)
    return lookup


# Suffix-pattern classifier — applied when no direct match is found in the
# role lookup. Probes the attribute name's tail for known CSS-property tokens.
# Order matters: longest / most-specific first.
SUFFIX_ROLE_RULES: list[tuple[str, str]] = [
    # Colour family (specific before generic)
    ('BackgroundColour', 'colour-bg'),
    ('BackgroundColor',  'colour-bg'),
    ('BorderColour',     'colour-border'),
    ('BorderColor',      'colour-border'),
    ('HoverBackground',  'colour-bg'),
    ('HoverColour',      'colour-text'),
    ('HoverColor',       'colour-text'),
    ('HoverBorder',      'colour-border'),
    ('TextColour',       'colour-text'),
    ('TextColor',        'colour-text'),
    ('Background',       'colour-bg'),
    ('Colour',           'colour-text'),
    ('Color',            'colour-text'),
    # Typography
    ('FontFamily',       'font-family-preset'),
    ('FontSize',         'font-size-preset'),
    ('FontWeight',       'enum-class-probe'),
    ('LineHeight',       'number-css-px'),
    ('LetterSpacing',    'number-css-px'),
    ('TextTransform',    'enum-class-probe'),
    ('TextDecoration',   'enum-class-probe'),
    ('TextAlign',        'enum-class-probe'),
    # Border / shadow
    ('BorderRadius',     'border-radius-token'),
    ('BorderWidth',      'number-css-px'),
    ('BorderStyle',      'enum-class-probe'),
    ('BoxShadow',        'shadow-preset'),
    ('Shadow',           'shadow-preset'),
    # Spacing
    ('PaddingTop',       'spacing-token'),
    ('PaddingRight',     'spacing-token'),
    ('PaddingBottom',    'spacing-token'),
    ('PaddingLeft',      'spacing-token'),
    ('MarginTop',        'spacing-token'),
    ('MarginRight',      'spacing-token'),
    ('MarginBottom',     'spacing-token'),
    ('MarginLeft',       'spacing-token'),
    ('Padding',          'spacing-token'),
    ('Margin',           'spacing-token'),
    ('Gap',              'spacing-token'),
    # Sizing
    ('MinHeight',        'number-css-px'),
    ('MaxWidth',         'number-css-px'),
    ('MaxHeight',        'number-css-px'),
    ('MinWidth',         'number-css-px'),
    ('Width',            'number-css-px'),
    ('Height',           'number-css-px'),
    # Links / media
    ('Url',              'link-href'),
    ('Href',             'link-href'),
    ('Link',             'link-href'),
    ('Image',            'image-object'),
    ('ImageId',          'image-object'),
    # Text content
    ('ButtonText',       'text-content'),
    ('CtaText',          'text-content'),
    ('Label',            'text-content'),
    # Booleans
    ('Show',             'boolean-visibility'),
    ('Hide',             'boolean-visibility'),
    ('Enable',           'boolean-visibility'),
    ('Disable',          'boolean-visibility'),
    # Enums + selectors
    ('Unit',             'enum-class-probe'),
    ('Style',            'enum-class-probe'),
    ('Variant',          'enum-class-probe'),
    ('Layout',           'enum-class-probe'),
    ('Alignment',        'enum-class-probe'),
    ('ObjectFit',        'enum-class-probe'),
    ('ObjectPosition',   'enum-class-probe'),
    ('TransitionDuration', 'transition-preset'),
    ('TransitionEasing',   'transition-preset'),
    ('Transition',         'transition-preset'),
]


EXTRA_SUFFIX_RULES: list[tuple[str, str]] = [
    # Animation / transition family
    ('Duration',         'transition-preset'),
    ('Easing',           'transition-preset'),
    ('Delay',            'transition-preset'),
    ('Speed',            'transition-preset'),
    ('AnimationPreset',  'select-from-enum'),
    ('AnimationType',    'select-from-enum'),
    ('Animation',        'select-from-enum'),
    ('Animated',         'boolean-visibility'),
    ('Autoplay',         'boolean-visibility'),
    # Border-radius corner variants
    ('BorderRadiusTL',   'border-radius-token'),
    ('BorderRadiusTR',   'border-radius-token'),
    ('BorderRadiusBL',   'border-radius-token'),
    ('BorderRadiusBR',   'border-radius-token'),
    # Form-field configuration
    ('FieldName',        'text-content'),
    ('Placeholder',      'text-content'),
    ('HelpText',         'text-content'),
    ('ErrorMessage',     'text-content'),
    ('Required',         'boolean-visibility'),
    ('Operator',         'enum-class-probe'),
    ('Value',            'text-content'),
    ('Options',          'query-descriptor'),
    ('AllowedTypes',     'enum-class-probe'),
    # Media + visuals
    ('Image',            'image-object'),
    ('Media',            'image-object'),
    ('Video',            'image-object'),
    ('Opacity',          'number-css-percent'),
    ('Aspect',           'enum-class-probe'),
    ('AspectRatio',      'enum-class-probe'),
    ('ObjectFit',        'enum-class-probe'),
    ('ObjectPosition',   'enum-class-probe'),
    ('Position',         'enum-class-probe'),
    ('Stroke',           'colour-text'),
    ('Blur',             'number-css-px'),
    ('Effect',           'select-from-enum'),
    # Icon family
    ('IconSize',         'number-css-px'),
    ('IconName',         'text-content'),
    ('Icon',             'text-content'),
    # Misc
    ('Scale',            'number-css-percent'),
    ('Anchor',           'text-content'),
    ('Tag',              'enum-class-probe'),
    ('Level',            'enum-class-probe'),
    ('Order',            'enum-class-probe'),
    ('Direction',        'enum-class-probe'),
    ('Justify',          'enum-class-probe'),
    ('Align',            'enum-class-probe'),
    ('Columns',          'number-css-px'),
    ('Count',            'number-css-px'),
    ('Rows',             'number-css-px'),
    ('Number',           'number-css-px'),
    ('Date',             'text-content'),
    ('Time',             'text-content'),
    ('Year',             'text-content'),
    ('Author',           'text-content'),
    ('Bio',              'text-content'),
    ('Body',             'richtext-content'),
    ('Description',      'richtext-content'),
    ('Title',            'text-content'),
    ('Subtitle',         'text-content'),
    ('Heading',          'text-content'),
    ('Name',             'text-content'),
    ('Role',             'text-content'),
]
SUFFIX_ROLE_RULES.extend(EXTRA_SUFFIX_RULES)


_BREAKPOINT_RE = re.compile(r'(Mobile|Tablet|Desktop)$')

# Exact-name matches for standalone attributes (no camelCase prefix).
# Captures the top frequency unmapped patterns from real block.json data.
EXACT_NAME_ROLES: dict[str, str] = {
    # Form-field configuration
    'placeholder':       'text-content',
    'helpText':          'text-content',
    'required':          'boolean-visibility',
    'conditionalField':  'enum-class-probe',
    'conditionalOperator': 'enum-class-probe',
    'conditionalValue':  'text-content',
    'fieldName':         'text-content',
    'errorMessage':      'text-content',
    'options':           'query-descriptor',
    'allowedTypes':      'enum-class-probe',
    # Layout / structure
    'columns':           'number-css-px',
    'rows':              'number-css-px',
    'items':             'query-descriptor',
    'count':             'number-css-px',
    'gap':               'spacing-token',
    'separator':         'boolean-visibility',
    'shape':             'enum-class-probe',
    'size':              'enum-class-probe',
    'aspectRatio':       'enum-class-probe',
    'position':          'enum-class-probe',
    'alignItems':        'enum-class-probe',
    'justifyContent':    'enum-class-probe',
    'flexDirection':     'enum-class-probe',
    'gridTemplateColumns': 'enum-class-probe',
    'verticalAlignment': 'enum-class-probe',
    # Visual / media
    'icon':              'text-content',
    'iconSize':          'number-css-px',
    'iconName':          'text-content',
    'opacity':           'number-css-percent',
    'avatar':            'image-object',
    'image':             'image-object',
    'video':             'image-object',
    'svg':               'text-content',
    'svgContent':        'richtext-content',
    'backdropBlur':      'boolean-visibility',
    'backdropBlurAmount': 'number-css-px',
    'backdropOpacity':   'number-css-percent',
    'badges':            'query-descriptor',
    'badge':             'text-content',
    'backgroundImage':   'image-object',
    'backgroundMedia':   'image-object',
    'backgroundVideo':   'image-object',
    'backgroundShape':   'enum-class-probe',
    'backgroundOverlayOpacity': 'number-css-percent',
    'backgroundImageOpacity': 'number-css-percent',
    'overlayColour':     'colour-bg',
    'overlayOpacity':    'number-css-percent',
    # Hover effects
    'hoverImageZoom':    'boolean-visibility',
    'hoverGrayscale':    'boolean-visibility',
    'hoverScale':        'number-css-percent',
    # Animation
    'animation':         'select-from-enum',
    'animationType':     'select-from-enum',
    'animationPreset':   'select-from-enum',
    'animationDuration': 'transition-preset',
    'animationEasing':   'transition-preset',
    'animationSpeed':    'transition-preset',
    'staggerDelay':      'transition-preset',
    'scrollEffect':      'select-from-enum',
    # Content + links
    'link':              'link-href',
    'url':               'link-href',
    'linkOpensNewTab':   'boolean-visibility',
    'blockLinkTarget':   'enum-class-probe',
    'body':              'richtext-content',
    'heading':           'text-content',
    'subheading':        'text-content',
    'description':       'richtext-content',
    'caption':           'text-content',
    'content':           'richtext-content',
    'text':              'text-content',
    'title':             'text-content',
    'subtitle':          'text-content',
    'label':             'text-content',
    'name':              'text-content',
    'role':              'text-content',
    'bio':               'richtext-content',
    'author':            'text-content',
    'date':              'text-content',
    # Carousel / behaviour toggles
    'autoplay':          'boolean-visibility',
    'autoplaySpeed':     'transition-preset',
    'dismissible':       'boolean-visibility',
    'carouselShowArrows': 'boolean-visibility',
    'carouselShowDots':   'boolean-visibility',
    'showLightbox':      'boolean-visibility',
    # Pricing / variants
    'billingToggle':     'boolean-visibility',
    'tier':              'enum-class-probe',
    'price':             'text-content',
    # Misc
    'anchor':            'text-content',
    'tag':               'enum-class-probe',
    'tagName':           'enum-class-probe',
    'level':             'enum-class-probe',
    'order':             'enum-class-probe',
    'direction':         'enum-class-probe',
    'variant':           'enum-class-probe',
    'style':             'enum-class-probe',
    'layout':            'enum-class-probe',
    'alignment':         'enum-class-probe',
    'accentStroke':      'colour-text',
}


# Type-based fallback — every attribute should have at least a type-derived role
# so P4 extract.py has a dispatch instruction. Block-specific custom attributes
# get one of these defaults; P4 may override per-block where the default is wrong.
TYPE_FALLBACK_ROLES: dict[str, str] = {
    'string':  'text-content',
    'number':  'number-css-px',
    'integer': 'number-css-px',
    'boolean': 'boolean-visibility',
    'array':   'query-descriptor',
    'object':  'query-descriptor',
}


def classify_role_by_suffix(attr_name: str) -> str | None:
    """Match a known suffix. Strip Mobile/Tablet/Desktop first so the base
    suffix (FontSize, Padding, etc.) is reachable for the rule table.
    """
    # 1. Exact-name match (handles helpText, placeholder, columns, icon, etc.)
    base_breakpointless = _BREAKPOINT_RE.sub('', attr_name) or attr_name
    if attr_name in EXACT_NAME_ROLES:
        return EXACT_NAME_ROLES[attr_name]
    if base_breakpointless in EXACT_NAME_ROLES:
        return EXACT_NAME_ROLES[base_breakpointless]
    # 2. Camel-case suffix match
    for suffix, role in SUFFIX_ROLE_RULES:
        if base_breakpointless.endswith(suffix):
            return role
    # 3. Boolean prefix fallback
    BOOL_PREFIXES = ('is', 'has', 'show', 'hide', 'enable', 'disable', 'allow', 'auto')
    for pref in BOOL_PREFIXES:
        if attr_name.startswith(pref) and len(attr_name) > len(pref):
            nxt = attr_name[len(pref)]
            if nxt.isupper():
                return 'boolean-visibility'
    return None


def load_v1_fingerprints() -> dict[str, dict]:
    if not os.path.exists(V1_FINGERPRINTS):
        return {}
    return json.load(open(V1_FINGERPRINTS, encoding='utf-8'))


def camel_to_bem(name: str) -> str:
    """`subHeadlineFontSizeMobile` -> `sub-headline-font-size-mobile`."""
    s = re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()
    return s


# Heuristic: strip common modifier suffixes to collapse breakpoint variants
# (subHeadlineColour → subHeadline ; subHeadlineFontSizeMobile → subHeadlineFontSize)
BREAKPOINT_SUFFIXES = ('Mobile', 'Tablet', 'Desktop')
PROPERTY_SUFFIXES_TO_STRIP_FOR_BASE = (
    'Colour', 'Color', 'Background', 'TextColour', 'BgColour',
    'FontSize', 'FontFamily', 'FontWeight', 'LineHeight', 'LetterSpacing',
    'TextTransform', 'TextDecoration', 'TextAlign',
    'MarginBottom', 'MarginTop', 'PaddingTop', 'PaddingBottom',
    'PaddingLeft', 'PaddingRight', 'BorderRadius', 'BorderWidth',
    'MaxWidth', 'MinHeight', 'Width', 'Height', 'Unit',
    'Url', 'Text', 'Style', 'Variant',
)


def derive_element_from_attr(attr: str, slug: str) -> tuple[str, str]:
    """Return (selector, derivation_method).

    Rule (c): if attribute name suggests a slot prefix, emit
    `.sgs-<slug>__<bem>` for the slot. Otherwise emit the block root.
    """
    base = attr
    # Strip breakpoint suffix
    for bp in BREAKPOINT_SUFFIXES:
        if base.endswith(bp):
            base = base[:-len(bp)]
            break
    # Try stripping property suffix to find the element prefix
    element = base
    for prop in sorted(PROPERTY_SUFFIXES_TO_STRIP_FOR_BASE, key=len, reverse=True):
        if base.endswith(prop) and base != prop:
            element = base[:-len(prop)]
            break
    if not element or element == base:
        # No prefix detected → treat as wrapper-level attribute
        return (f'.wp-block-sgs-{slug}', 'wrapper-default')
    bem = camel_to_bem(element)
    return (f'.sgs-{slug}__{bem}', 'convention')


def render_php_anchors(render_php_path: str, slug: str) -> set[str]:
    """Probe render.php for explicit `.sgs-<slug>__<elem>` class anchors."""
    if not os.path.exists(render_php_path):
        return set()
    body = open(render_php_path, encoding='utf-8').read()
    pat = re.compile(rf'\bsgs-{re.escape(slug)}__([a-z0-9][a-z0-9-]*)')
    return {m for m in pat.findall(body)}


def build_block_entry(
    slug: str,
    role_lookup: dict[str, str],
    v1_fp: dict[str, dict],
) -> dict:
    short_slug = slug.replace('sgs/', '')
    block_dir = os.path.join(BLOCKS_ROOT, short_slug)
    bj_path = os.path.join(block_dir, 'block.json')
    rp_path = os.path.join(block_dir, 'render.php')
    sj_path = os.path.join(block_dir, 'save.js')

    entry: dict = {
        'block_slug': slug,
        'wrapper_class': f'.wp-block-sgs-{short_slug}',
        'block_json_path': os.path.relpath(bj_path, PROJECT) if os.path.exists(bj_path) else None,
        'render_php_present': os.path.exists(rp_path),
        'save_js_present': os.path.exists(sj_path),
        'slots': [],
        'required_features': [],
        'optional_features': [],
        'gaps': [],
        'derivation_notes': {},
    }

    if not os.path.exists(bj_path):
        entry['gaps'].append({'kind': 'block-json-missing', 'expected_at': bj_path})
        return entry

    try:
        block_meta = json.load(open(bj_path, encoding='utf-8'))
    except Exception as e:
        entry['gaps'].append({'kind': 'block-json-parse-error', 'error': str(e)})
        return entry

    # Wrapper class override from block.json `selectors.root`
    if isinstance(block_meta.get('selectors'), dict):
        root = block_meta['selectors'].get('root')
        if isinstance(root, str):
            entry['wrapper_class'] = root

    explicit_selectors_map = (
        block_meta.get('selectors', {}) if isinstance(block_meta.get('selectors'), dict) else {}
    )
    rp_anchors = render_php_anchors(rp_path, short_slug)
    entry['_render_php_anchors'] = sorted(rp_anchors)

    attrs = block_meta.get('attributes', {}) or {}
    for attr_name in sorted(attrs.keys()):
        if attr_name.startswith('_'):
            continue  # `_comment_*` placeholders in block.json
        attr_meta = attrs[attr_name] or {}
        role = role_lookup.get(attr_name)
        role_source = 'role-templates-exact' if role else None
        if role is None:
            # Exact-name + suffix-pattern + boolean-prefix classifier
            role = classify_role_by_suffix(attr_name)
            if role:
                role_source = 'suffix-classifier'
        # Type-based fallback so every slot has a dispatch role for P4 extract.py
        type_fallback_role = None
        if role is None:
            attr_type = attr_meta.get('type')
            if isinstance(attr_type, str):
                type_fallback_role = TYPE_FALLBACK_ROLES.get(attr_type)
            elif isinstance(attr_type, list) and attr_type:
                # `type: ["string", "number"]` etc — take first
                type_fallback_role = TYPE_FALLBACK_ROLES.get(attr_type[0])
            role = type_fallback_role
            if role:
                role_source = 'type-fallback'

        # Rule (a) — explicit selectors map in block.json
        if attr_name in explicit_selectors_map and isinstance(explicit_selectors_map[attr_name], str):
            selector = explicit_selectors_map[attr_name]
            derivation = 'block-json-selectors'
        else:
            selector, derivation = derive_element_from_attr(attr_name, short_slug)
            # Rule (b) — if derivation gave a __element but render.php has matching anchor, confirm
            m = re.match(r'\.sgs-[\w-]+__([\w-]+)$', selector)
            if m and m.group(1) in rp_anchors:
                derivation = 'render-php-confirmed'

        slot = {
            'attribute': attr_name,
            'selector': selector,
            'derivation': derivation,
            'role': role,
            'role_source': role_source,
            'attribute_type': attr_meta.get('type'),
            'attribute_default': attr_meta.get('default'),
        }
        if role is None:
            slot['gap'] = 'role-not-mapped'
            entry['gaps'].append({'kind': 'role-not-mapped', 'attribute': attr_name})
        entry['slots'].append(slot)

    # FR26 — semantic features from v1 fingerprints (ignore stale block_type)
    fp = v1_fp.get(slug) or v1_fp.get(short_slug)
    if isinstance(fp, dict):
        entry['required_features'] = fp.get('required_features') or []
        entry['optional_features'] = fp.get('optional_features') or []

    entry['slot_count'] = len(entry['slots'])
    entry['unmapped_slot_count'] = sum(1 for s in entry['slots'] if s['role'] is None)
    return entry


def hero_entry_override(role_lookup: dict[str, str], v1_fp: dict[str, dict]) -> dict:
    """Hand-author hero entry per HERO_FINGERPRINT_SELECTORS regression baseline.

    These selectors mirror the SOURCE-side recogniser anchors (vanilla HTML draft
    classes like `.hero-copy h1`), which is what extract.py probes when reading
    a third-party mockup. The Layer 3 slot list for sgs/hero must be a SUPERSET
    of this constant.
    """
    base = build_block_entry('sgs/hero', role_lookup, v1_fp)

    # Source-side fingerprint anchors (regression baseline).
    # Role mapping inferred from spec 14 + HERO_FINGERPRINT_SELECTORS semantics.
    source_slots = [
        {'selector': '.hero',                       'role': 'colour-bg',        'maps_to_attribute': 'backgroundColor',  'kind': 'source-anchor'},
        {'selector': '.hero-copy',                  'role': 'spacing-token',    'maps_to_attribute': 'contentPaddingTop','kind': 'source-anchor'},
        {'selector': '.hero-copy h1',               'role': 'richtext-content', 'maps_to_attribute': 'headline',         'kind': 'source-anchor'},
        {'selector': '.hero-copy .hero-sub',        'role': 'richtext-content', 'maps_to_attribute': 'subHeadline',      'kind': 'source-anchor'},
        {'selector': '.hero-content',               'role': 'spacing-token',    'maps_to_attribute': 'contentPaddingTop','kind': 'source-anchor'},
        {'selector': '.hero-content h1',            'role': 'richtext-content', 'maps_to_attribute': 'headline',         'kind': 'source-anchor'},
        {'selector': '.hero-content .hero-sub',    'role': 'richtext-content', 'maps_to_attribute': 'subHeadline',      'kind': 'source-anchor'},
        {'selector': '.hero-photo',                 'role': 'image-object',     'maps_to_attribute': 'backgroundImage',  'kind': 'source-anchor'},
        {'selector': '.hero-photo img',             'role': 'image-object',     'maps_to_attribute': 'backgroundImage',  'kind': 'source-anchor'},
        {'selector': '.hero-mobile-img',            'role': 'image-object',     'maps_to_attribute': 'splitImageMobile', 'kind': 'source-anchor'},
        {'selector': '.section-label',              'role': 'text-content',     'maps_to_attribute': 'label',            'kind': 'source-anchor'},
    ]

    # Sanity: every selector in HERO_FINGERPRINT_SELECTORS appears in source_slots
    src_set = {s['selector'] for s in source_slots}
    for sel in HERO_FINGERPRINT_SELECTORS:
        assert sel in src_set, f'Hero override missing baseline selector: {sel}'

    base['source_anchor_slots'] = source_slots
    base['regression_baseline'] = {
        'name': 'HERO_FINGERPRINT_SELECTORS',
        'source': 'tools/recogniser-v2/extract.py:111',
        'selectors': HERO_FINGERPRINT_SELECTORS,
    }
    return base


def main() -> int:
    role_lookup = load_role_lookup()
    v1_fp = load_v1_fingerprints()

    db = sqlite3.connect(DB_PATH)
    block_slugs = [r[0] for r in db.execute('SELECT slug FROM blocks ORDER BY slug')]
    db.close()

    blocks: dict[str, dict] = {}
    role_coverage: dict[str | None, int] = defaultdict(int)
    for slug in block_slugs:
        if slug == 'sgs/hero':
            entry = hero_entry_override(role_lookup, v1_fp)
        else:
            entry = build_block_entry(slug, role_lookup, v1_fp)
        blocks[slug] = entry
        for s in entry.get('slots', []):
            role_coverage[s.get('role')] += 1

    out = {
        'generated_at': GENERATED_AT,
        'source': 'sgs-db blocks + block.json + render.php + tools/recogniser/data/fingerprints.json',
        'schema_version': 1,
        'block_count': len(blocks),
        'role_coverage': {(k if k is not None else '__unmapped__'): v for k, v in role_coverage.items()},
        'blocks': blocks,
    }
    path = os.path.join(OUT_DIR, 'layer-3-internal-elements.json')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write('\n')

    # Summary
    total_slots = sum(b.get('slot_count', 0) for b in blocks.values())
    total_unmapped = sum(b.get('unmapped_slot_count', 0) for b in blocks.values())
    missing_bj = [s for s, b in blocks.items() if b.get('block_json_path') is None]
    print(f'Wrote {path}')
    print(f'  blocks:           {len(blocks)}')
    print(f'  total slots:      {total_slots}')
    print(f'  unmapped slots:   {total_unmapped}')
    print(f'  blocks missing block.json: {len(missing_bj)} {missing_bj}')
    role_summary = {(k or '__unmapped__'): v for k, v in role_coverage.items()}
    print(f'  role coverage:    {role_summary}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
