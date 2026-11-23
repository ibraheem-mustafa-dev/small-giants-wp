"""The renders an offline block check needs to see what every setting of one block changes.

Reads the block's block.json and its own source only: no framework database, no calibration planner, no browser.
For each setting it writes one or more instances (the block's attributes with the setting given a test value), each read
against a baseline that carries the same partner attributes (the toggle that shows the setting's part, a border's width
and style, a layout mode), so the diff of the two renders is the setting's own effect. A test value only has to be valid
(survive the block's sanitisers) and differ from the baseline; it does not have to be recognisable in the output.

Where a setting's CSS property, state and part come from, in order:
  1. block.json supports.sgs.elements[*].attrMap (`css:<property>` -> attribute) and states[<state>].attrMap;
  2. an element's `prefix` + `clusters`, expanded through the framework's cluster member sets
     (scripts/consistency/cluster-member-sets.json: each member's CSS key and the attribute-name suffixes it takes);
  3. the block source scanner's code reading (scripts/block-source-scan/scan.py::Scan, its `settings` output).
A setting none of them places is still valued from its type and name; its instances carry `prop: null`.

Output (the shape the renderer consumes, the same as the trial's calibration plans):
  {block, fixture, instances: [{key, attrs, variant, isDefault, isBase, baseKey, attr, state, prop, element, trigger,
   discover, paintState, marker: {label}}], noMarker, rows, unvalued: [{setting, why}]}

Usage: python instances.py <short> [--plugin P] [--fixtures F] [--no-scan] [--out file.json]
"""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
import leaf_values as LV  # noqa: E402

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
PLUGIN = HERE.parents[1]
FIXTURES_FILE = HERE / 'fixtures.json'
SCANNER_DIR = SCRIPTS / 'block-source-scan'
SHAPE_LIB = SCRIPTS / 'lib'

# ---------------------------------------------------------------- value table (ported from calibrate-markers.mjs)
MARKER_HEX = '#13579b'
MARKER_ALT_HEX = '#9b1357'
MARKER_GRADIENT = 'linear-gradient(90deg, #13579b 0%, #9b1357 100%)'
MARKER_REST_GRADIENT = 'linear-gradient(90deg, #9b1357 0%, #13579b 100%)'
# A whole number of milliseconds: helpers-tokens.php::sgs_transition_vars refuses anything else.
DURATION_MS = 437
# From sgs_transition_vars' whitelist, never its ease-in-out fallback; ease-out stands in when the default is linear.
EASING = 'linear'
EASING_ALT = 'ease-out'
# A Custom easing field holds a cubic-bezier() only (Sgs_Motion_Field_Types::is_valid_cubic_bezier).
EASING_CUSTOM = 'cubic-bezier(0.1, 0.7, 0.3, 0.9)'
TIERS = ('desktop', 'tablet', 'mobile')
SIDES = ('top', 'right', 'bottom', 'left')
CORNERS = ('topLeft', 'topRight', 'bottomRight', 'bottomLeft')
TIER_PX = {'desktop': 37, 'tablet': 23, 'mobile': 7}
# A box holding a glyph: every tier above the resting glyph and the boxed shape.
SIZE_BOX_PX = {'desktop': 96, 'tablet': 80, 'mobile': 64}
BOX = {'desktop': (11, 13, 17, 19), 'tablet': (21, 23, 25, 27), 'mobile': (3, 5, 7, 9)}
# Minimum sizes a render floors at the 44px touch target, so their values sit above it.
FLOORED = re.compile(r'^min-(height|width)$')
FLOORED_ATTR = re.compile(r'^triggerDetachSize$')
TEXT_SHADOW_SHAPE = '2px 3px 4px'
SHADOW_SHAPE = '0px 4px 12px 0px'
SHADOW_SHAPES = {'box-shadow-color': SHADOW_SHAPE, 'text-shadow-color': TEXT_SHADOW_SHAPE}
# Free-text settings that take a CSS keyword (no enum in block.json): the first value that differs is used.
KEYWORDS = {
    'text-transform': ['uppercase', 'lowercase', 'capitalize'],
    'mask-image': ['star'],
    'text-wrap': ['balance', 'pretty', 'nowrap'],
    'font-family': ['Georgia, serif'],
    'font-style': ['italic'],
    'text-decoration': ['underline', 'line-through'],
    'box-shadow': ['0 0 0 3px #13579b'],
    'text-shadow': [f'{TEXT_SHADOW_SHAPE} #13579b'],
    'overflow': ['hidden', 'clip'],
    'grid-auto-rows': ['37px'],
    'align-content': ['center', 'space-between'],
    'scrollbar-color': ['#13579b #9b1357'],
    'text-align': ['center', 'right', 'left'],
    'aspect-ratio': ['7 / 3'],
    'align-items': ['center', 'flex-end', 'flex-start'],
    'justify-content': ['center', 'space-between', 'flex-end'],
    'flex-wrap': ['wrap', 'nowrap'],
    'flex-direction': ['column', 'row-reverse', 'row'],
    'object-fit': ['contain', 'cover'],
    'border-style': ['dashed', 'solid', 'dotted'],
    'writing-mode': ['vertical-rl'],
    'background-attachment': ['fixed'],
    'mix-blend-mode': ['multiply'],
}
LENGTH = re.compile(r'width|height|thickness|gap|size|radius|indent|margin|padding|spacing|offset|inset|^top$|^left$|^right$|^bottom$|basis')
COUNT = re.compile(r'^(column-count|grid-template-columns|grid-auto-columns|flex)$')
TRANSFORM = re.compile(r'^(transform|rotate|scale|translate)$')
BORDER_TRIO = ('border-color', 'border-style', 'border-width')
DURATION_NAME = re.compile(r'Duration$')
EASING_NAME = re.compile(r'Easing(Custom)?$')
ANGLE_NAME = re.compile(r'Angle$')
# The settings that name a post, menu item or other record: a made-up value points at nothing.
RECORD_NAME = re.compile(r'(^ref$|Ref$|^id$|Id$)')
COLOUR_NAME = re.compile(r'Colou?r(Hover|Active|Focus|Current|Open)?$')
LIFT_NAME = re.compile(r'(Lift|Rotate|Rotation|Scale|Translate)(Hover)?$')
ICON_NAME = re.compile(r'(^icon$|Icon$)')
URL_NAME = re.compile(r'(^url$|Url$|^href$|Href$)')
SAMPLE_TEXT = 'Sample text'
SAMPLE_URL = '/sample-page/'
SAMPLE_ICON = 'star'
OVERLAY_REST_HEX = '#2b2b2b'
IMAGE_SHAPING = re.compile(r'^background(Fit|Focal|Pinned|Repeat|TileSize|Opacity|Blend|Origin|Clip)')
IMAGE_SHAPING_PROPS = re.compile(r'^background-(size|position|attachment|repeat|origin|clip|blend-mode)$')
LAYOUT_PROPS = re.compile(r'^(flex-direction|flex-wrap|justify-content|align-items|align-content|grid-template-columns|grid-template-rows|gap|row-gap|column-gap)$')
LAYOUT_VALUES = ('flex', 'grid', 'row', 'stack', 'columns', 'inline', 'horizontal', 'carousel')
# How each setting state is reached in a browser (calibrate-instances.mjs::STATE_TRIGGERS); the offline renderer
# diffs printed CSS, so this is carried for a reader, never needed to see the change.
MAX_PARTNERS = 3  # a token whose condition reads more settings than this is a composite, not a conjunction to try together
STATE_TRIGGERS = {'hover': 'hover', 'focus': 'focus', 'focus-visible': 'focus', 'scrolled': 'scroll', 'shrunk': 'class', 'open': 'open', 'current': 'fixture'}
EXTENSION_WHY = 'an extension setting the extension roster gives no definition for'
# The placeholders the renderer fills (probe.py::PLACEHOLDERS).
IMAGE = {'id': '{{image}}', 'url': '{{image.url}}'}


def types(d) -> list:
    t = (d or {}).get('type')
    return list(t) if isinstance(t, list) else ([t] if t else [])


def every_tier(v) -> dict:
    return {t: v for t in TIERS}


def lcfirst(s: str) -> str:
    return s[:1].lower() + s[1:]


def is_empty(v) -> bool:
    return v is None or v == '' or (isinstance(v, (dict, list)) and not v)


# ---------------------------------------------------------------- inputs
def load_shared(path=None) -> dict:
    """fixtures.json's `_shared` entry: partners and reasons for the settings every block receives from a shared
    extension (each cites the code that needs it)."""
    data = json.loads(Path(path or FIXTURES_FILE).read_text(encoding='utf-8'))
    return data.get('_shared') or {}


def with_shared(fixture: dict, shared: dict) -> dict:
    """The block's fixture with the shared partners under its own (its own win) and the shared reasons a setting is
    not valued."""
    if not shared:
        return fixture
    pre = {**(shared.get('preconditions') or {}), **(fixture.get('preconditions') or {})}
    return {**fixture, 'preconditions': pre, '_unvalued': {**(shared.get('unvalued') or {}), **(fixture.get('_unvalued') or {})}}


def check_fixture(fixture: dict) -> dict:
    """The fixture as the record check renders it: its `checkAttributes` (what the check adds to test a part's settings,
    such as a label shown or a background image set) laid over its `attributes` (the plain block, as a new node renders
    it, with the stand-ins it needs to render offline at all). The site look draws `attributes` alone."""
    extra = fixture.get('checkAttributes')
    if not extra:
        return fixture
    out = {k: v for k, v in fixture.items() if k != 'checkAttributes'}
    out['attributes'] = {**(fixture.get('attributes') or {}), **extra}
    return out


def load_fixtures(path=None) -> dict:
    """The fixtures file (keyed by block name, `_meta` dropped)."""
    data = json.loads(Path(path or FIXTURES_FILE).read_text(encoding='utf-8'))
    return {k: v for k, v in data.items() if not k.startswith('_')}


def block_json(plugin: Path, short: str) -> dict:
    return json.loads((Path(plugin) / 'src' / 'blocks' / short / 'block.json').read_text(encoding='utf-8'))


@lru_cache(maxsize=None)
def cluster_members(plugin: str) -> dict:
    """cluster -> [(css key, suffixes, appliesToLayers)] from the framework's cluster member sets."""
    f = Path(plugin) / 'scripts' / 'consistency' / 'cluster-member-sets.json'
    if not f.is_file():
        f = SCRIPTS / 'consistency' / 'cluster-member-sets.json'
    data = json.loads(f.read_text(encoding='utf-8'))
    return {c: [(m['key'], tuple(m.get('suffixes') or ()), tuple(m.get('appliesToLayers') or ())) for m in v.get('members', [])]
            for c, v in data.get('clusters', {}).items()}


@lru_cache(maxsize=None)
def extension_roster(plugin: str) -> list:
    f = Path(plugin) / 'src' / 'blocks' / 'extensions' / 'extension-roster.json'
    return json.loads(f.read_text(encoding='utf-8')).get('extensions', []) if f.is_file() else []


def extension_attrs(bj: dict, roster: list) -> dict:
    """The sgs* extension attributes a block receives (extension-roster.json's rule modes), name -> extension id."""
    supports = bj.get('supports') or {}
    sgs = supports.get('sgs') or {}
    no_class = supports.get('className') is False
    hidden = set(sgs.get('hideExtensions') or [])
    enabled = set(sgs.get('enabledExtensions') or [])
    out = {}
    for ext in roster:
        rule = ext.get('rule') or {}
        mode = rule.get('mode')
        if rule.get('requiresClassName') and no_class:
            continue
        if mode == 'allowlist':
            on = rule.get('enabledSlug') in enabled
        elif mode in ('universal', 'denylist'):
            on = not (rule.get('hideSlug') and rule['hideSlug'] in hidden)
        elif mode == 'flag':
            on = bool(sgs.get(rule.get('flag')))
        elif mode == 'named':
            on = bj.get('name') in (rule.get('blocks') or [])
        else:
            on = False
        if on:
            for a in ext.get('attributes') or {}:
                out[a] = ext.get('id')
    return out


def unit_companions(attrs: dict) -> set:
    """`fooUnit` beside `foo`: a unit, set with its value, never a setting of its own."""
    return {a for a in attrs if a.endswith('Unit') and a[:-4] in attrs}


def box_families(bj: dict) -> dict:
    fams = ((bj.get('supports') or {}).get('sgs') or {}).get('boxFamilies') or {}
    return {a: fam for fam, names in fams.items() for a in (names or [])}


def variant_slots(bj: dict):
    """(variant attribute, [(variant value, slot)]): each variant's slots no sibling variant names
    (sgs-update-v2.py's name-only variant_slots, read from block.json supports.sgs.variantAttr/variants)."""
    sgs = (bj.get('supports') or {}).get('sgs') or {}
    attr, vmap = sgs.get('variantAttr'), sgs.get('variants')
    if not attr or not isinstance(vmap, dict):
        return None, []
    out = []
    for value, names in vmap.items():
        others = {n for v, ns in vmap.items() if v != value for n in (ns or [])}
        out += [(value, n) for n in (names or []) if n not in others and n != attr]
    return attr, out


def _import_shape_lib():
    if str(SHAPE_LIB) not in sys.path:
        sys.path.insert(0, str(SHAPE_LIB))
    import object_attr_shape  # noqa: E402
    return object_attr_shape


def tier_shapes(attrs: dict, block_dir: Path | None, plugin: Path | None) -> dict:
    """attr -> 'tier_object' | 'box_only' | 'flat_sibling' | None, by scripts/lib/object_attr_shape.py (the seeder's own
    classifier), with the render evidence read from the block's PHP files and the shared container wrapper."""
    oas = _import_shape_lib()
    render = set()
    if block_dir is not None and Path(block_dir).is_dir():
        for p in sorted(Path(block_dir).glob('*.php')):
            render |= oas.tier_object_attrs_from_php(p)
        # The shared helpers that write this block's CSS (helpers-cart-panel-css.php writes the cart's per-device
        # paddings): every includes/ PHP file that names the block's class.
        if plugin:
            token = f'sgs-{Path(block_dir).name}'
            for p in sorted((Path(plugin) / 'includes').rglob('*.php')):
                if token in p.read_text(encoding='utf-8', errors='ignore'):
                    render |= oas.tier_object_attrs_from_php(p)
    wrapper = oas.tier_object_attrs_from_php(Path(plugin) / 'includes' / 'class-sgs-container-wrapper.php') if plugin else set()
    out = {}
    with contextlib.redirect_stdout(io.StringIO()):  # the classifier prints a note for each elimination verdict
        for a, d in attrs.items():
            t = types(d)
            out[a] = oas.classify_object_attr_shape(a, 'object' if 'object' in t else (t[0] if t else ''), d, attrs, render, set() if 'object' not in t else wrapper)
    return out


# ---------------------------------------------------------------- where each setting paints
def _norm_prop(key: str) -> str | None:
    if not key.startswith('css:'):
        return None
    p = key[4:]
    return p[:-5] if p.endswith('-link') else p


def _norm_state(s):
    if not s:
        return None
    s = str(s)
    m = re.match(r'^:+(focus-visible|focus-within|focus|hover|active|checked|disabled|open|popover-open)$', s)
    if m:
        return 'focus' if m.group(1).startswith('focus') else m.group(1)
    m = re.match(r'^\[aria-([a-z]+)', s)
    if m:
        return {'current': 'current', 'expanded': 'open', 'selected': 'selected', 'disabled': 'disabled'}.get(m.group(1), m.group(1))
    if s == '[open]':
        return 'open'
    m = re.match(r'^\.is-([a-z0-9-]+)', s)
    if m:
        return m.group(1)
    return s.strip(':.[]') or None


def declared_props(bj: dict, attrs: dict, plugin: Path) -> dict:
    """attr -> {props, state, element, source} from the element manifest: attrMap, states, then prefix + clusters."""
    els = ((bj.get('supports') or {}).get('sgs') or {}).get('elements') or {}
    out = {}

    def put(a, prop, state, el, source):
        if a not in attrs or not prop:
            return
        r = out.setdefault(a, {'props': [], 'state': state, 'element': el, 'source': source})
        if r['source'] != source:
            return
        if prop not in r['props']:
            r['props'].append(prop)

    for el, d in els.items():
        if not isinstance(d, dict):
            continue
        for k, a in (d.get('attrMap') or {}).items():
            put(a, _norm_prop(k), None, el, 'attrMap')
        for st, sd in (d.get('states') or {}).items():
            for k, a in ((sd or {}).get('attrMap') or {}).items():
                put(a, _norm_prop(k), st, el, 'attrMap')
    members = cluster_members(str(plugin))
    for el, d in els.items():
        if not isinstance(d, dict):
            continue
        prefix = d.get('prefix')
        if prefix is None and d.get('isWrapper'):
            prefix = ''
        if prefix is None:
            continue
        layer = d.get('layer')
        for c in d.get('clusters') or []:
            for key, suffixes, layers in members.get(c, []):
                if layers and layer not in layers:
                    continue
                for s in suffixes:
                    a = prefix + s if prefix else lcfirst(s)
                    if a not in out:
                        put(a, _norm_prop(key), None, el, 'cluster')
    return out


_SCANS: dict = {}


def scan_json(blocks_dir: Path, folder: str) -> dict:
    """The block source scanner's whole reading of one block (scan.py::Scan.to_json): its parts and where they are printed,
    its dynamic-class families, the modifier classes and data attributes each setting switches. Read once per block."""
    key = (str(blocks_dir), folder)
    if key not in _SCANS:
        if str(SCANNER_DIR) not in sys.path:
            sys.path.insert(0, str(SCANNER_DIR))
        from scan import Scan  # noqa: E402
        with contextlib.redirect_stdout(io.StringIO()):
            _SCANS[key] = Scan(folder, Path(blocks_dir)).run().to_json()
    return _SCANS[key]


def scanned_props(blocks_dir: Path, folder: str) -> dict:
    """attr -> {props, state, element, source} from the block source scanner's code reading."""
    settings = scan_json(blocks_dir, folder).get('settings', {})
    out = {}
    for a, pls in settings.items():
        props = []
        for p in pls:
            props += [x for x in p.get('props') or [] if x not in props]
        if not props:
            continue
        lead = next((p for p in pls if p.get('props')), pls[0])
        out[a] = {'props': props, 'state': _norm_state(lead.get('state')), 'element': lead.get('part'), 'source': 'scanner'}
    return out


def name_prop(attr: str, plugin: Path) -> str | None:
    """The CSS property an attribute's name suffix stands for in the cluster member sets (longest suffix wins):
    used only to choose a valid test value for a setting no source places."""
    best = None
    for members in cluster_members(str(plugin)).values():
        for key, suffixes, _ in members:
            p = _norm_prop(key)
            for s in suffixes:
                if p and (attr == lcfirst(s) or attr.endswith(s)) and (not best or len(s) > len(best[0])):
                    best = (s, p)
    if best is None:
        m = re.search(r'(Hover|Active|Focus|Current|Open|Disabled)$', attr)
        if m and attr != m.group(1):
            return name_prop(attr[: -len(m.group(1))], plugin)
    return best[1] if best else None


# ---------------------------------------------------------------- partners (ported from calibrate-instances/markers.mjs)
def companion_width(style_attr: str, schema: dict) -> dict | None:
    """The width a border style needs before it paints: Style -> Width, in that attribute's own shape."""
    attr = re.sub(r'Style$', 'Width', style_attr)
    d = schema.get(attr) if attr != style_attr else None
    if not d:
        return None
    unit = f'{attr}Unit' if f'{attr}Unit' in schema else None
    t = types(d)
    if 'object' in t:
        value = {s: '3px' for s in SIDES}
    elif 'number' in t or 'integer' in t:
        value = 3
    elif 'string' in t:
        value = '3' if unit else '3px'
    else:
        return None
    return {attr: value, **({unit: 'px'} if unit and not isinstance(value, dict) else {})}


def border_partners(attr: str, prop: str, schema: dict) -> dict:
    """A border colour needs a width and a solid style, a border width a solid style; a hover border gradient also needs
    the resting gradient (helpers-tokens.php::sgs_border_gradient_css prints nothing without one)."""
    m = re.match(r'^(.*[bB]order)(Colou?r|Width)(Hover)?(Gradient)?$', attr)
    if not m or not (prop.startswith('border') and ('color' in prop or 'width' in prop)):
        return {}
    out = {}
    style = f'{m.group(1)}Style'
    if style in schema and 'object' not in types(schema[style]):
        out[style] = 'solid'
    if m.group(2) != 'Width':
        out.update(companion_width(style, schema) or {})
    resting = f'{m.group(1)}{m.group(2)}Gradient'
    if m.group(3) and m.group(4) and resting in schema:
        out[resting] = MARKER_REST_GRADIENT
    return out


def shadow_partners(attr: str, prop: str, schema: dict) -> dict:
    """A shadow colour composes no shadow without the shape it colours (helpers-colour-variants.php::sgs_shadow_decls)."""
    shape_value = SHADOW_SHAPES.get(prop)
    if not shape_value:
        return {}
    shape = re.sub(r'Colou?r(Hover)?$', '', attr)
    return {shape: shape_value} if shape != attr and shape in schema and 'string' in types(schema[shape]) else {}


def gating_toggle(attr: str, schema: dict, current: dict) -> dict:
    """The off-by-default show/enable/has/use toggle with the longest stem the setting's name starts with
    (showBadge gates badgeColour)."""
    best = None
    for name, d in schema.items():
        m = re.match(r'^(show|enable|has|use)([A-Z]\w*)$', name)
        if not m or 'boolean' not in types(d) or current.get(name, d.get('default')) is True:
            continue
        stem = lcfirst(m.group(2))
        if attr.startswith(stem) and attr != stem and (not best or len(stem) > len(best[1])):
            best = (name, stem)
    return {best[0]: True} if best else {}


def shadow_lift_partner(attr: str, schema: dict, current: dict) -> dict:
    """A shadow-lift switch (shadowLiftOnHover, submitShadowLiftOnHover) acts on the shadow its block draws
    (helpers-shadow-hover.php::sgs_shadow_hover_rules): the block's own box shadow for that prefix is given a shape
    when it has none, so switching the lift off changes the hover. The shadow is the prefix's `Shadow`, `BoxShadow`,
    else the block's only box shadow (a text or SVG shadow never)."""
    m = re.match(r'^(.*?)(?:S|s)hadowLiftOnHover$', attr)
    if not m:
        return {}
    p = m.group(1)
    names = [f'{p}Shadow', f'{p}BoxShadow'] if p else ['boxShadow', 'shadow']
    if not p:
        names += [n for n in schema if re.fullmatch(r'[a-z]+Shadow', n) and not re.search(r'(text|svg|Text|Svg)', n)]
    for n in names:
        d = schema.get(n)
        if d and 'string' in types(d) and current.get(n, d.get('default', '')) in ('', None, 'none'):
            return {n: SHADOW_SHAPE}
    return {}


# The values of a mode setting that switch its look off: the theme's own, none, off, hidden.
OFF_MODES = ('', 'none', 'off', 'hidden', 'default', 'inherit', 'false', '0')


# What a setting's name may add to a mode setting's name for the mode to gate it: a property of the mode's look (its
# colour, size, offset...), never a state (Hover), a device (Tablet) or a mode of its own (layoutMode after layout).
MODE_PART = re.compile(r'^(?:(?:Circle|Icon|Shape|Line|Text|Link)?(?:Colour|Color|Size|Width|Height|Thickness|Offset|Gap|Radius'
                       r'|Opacity|Reveal|Custom|Duration|Delay|Weight|Linked)(?:Gradient|Hover|Linked)?)+$')


def gating_mode(attr: str, schema: dict, current: dict) -> dict:
    """The mode setting the setting's name extends at a word boundary with a property of its look (linkUnderline for
    linkUnderlineColour), when that mode is an enum now at a value that switches its look off: it is moved to a value
    that switches it on (the one the rest of the name names, as `custom` for fooEasingCustom, else its first), so the
    setting's paint is drawn (the helper that reads both emits nothing while the mode is off). The longest stem wins."""
    best = None
    for name, d in schema.items():
        rest = attr[len(name):] if attr.startswith(name) else ''
        if name == attr or not rest[:1].isupper() or not MODE_PART.match(rest):
            continue
        en = d.get('enum') if isinstance(d, dict) else None
        if not en or str(current.get(name, d.get('default', ''))) not in OFF_MODES:
            continue
        on = [v for v in en if isinstance(v, str) and v not in OFF_MODES]
        named = [v for v in on if v.lower() in rest.lower()]
        if on and (not best or len(name) > len(best[0])):
            best = (name, (named or on)[0])
    return {best[0]: best[1]} if best else {}


@lru_cache(maxsize=None)
def code_corpus(plugin: str) -> str:
    """Every front-end PHP file of the plugin (includes/ and the blocks' own), joined: what the code reads is searched here."""
    root = Path(plugin)
    parts = []
    for base in (root / 'includes', root / 'src' / 'blocks'):
        for p in sorted(base.rglob('*.php')) if base.is_dir() else []:
            try:
                parts.append(p.read_text(encoding='utf-8', errors='ignore'))
            except OSError:
                pass
    return '\n'.join(parts)


def code_reads(plugin, attr: str) -> bool:
    """True when some PHP of the plugin reads `$x['attr']` (so a precondition on it reaches a render)."""
    if plugin is None:
        return False
    return re.search(r"\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\]", code_corpus(str(plugin))) is not None


def preconditions(row: dict, schema: dict, current: dict, ctx: dict) -> dict:
    """The attributes a setting's part needs before the setting can paint (calibrate-instances.mjs::preconditionsFor)."""
    out = {}
    name = row['attr']
    props = row['props']
    first = row['vprop'] or ''
    slots = ctx.get('variantSlots') or []
    vattr = ctx.get('variantAttr')
    slot = next((s for s in slots if s[1] == name), None)
    if slot and vattr and current.get(vattr) != slot[0]:
        out[vattr] = every_tier(slot[0]) if 'object' in types(schema.get(vattr)) else slot[0]
    if slot:
        for value, s in slots:
            if value == slot[0] and 'object' in types(schema.get(s)) and re.search(r'Source$|^source$', s) and is_empty(current.get(s)):
                out[s] = {'desktop': {'kind': 'image', **IMAGE}}
    # An attribute counts when block.json or the extension roster defines it, or when the plugin's PHP reads it
    # (`sgsMotion`, which every block carries from the motion model and no block.json lists).
    known = lambda a: a in schema or a in (ctx.get('extensionAttrs') or ()) or code_reads(ctx.get('plugin'), a)  # noqa: E731
    for a, v in (ctx.get('settingPreconditions', {}).get(name) or {}).items():
        if known(a) and current.get(a) != v:
            out[a] = v
    for stem, attrs in (ctx.get('familyPreconditions') or {}).items():
        if not name.startswith(stem):
            continue
        for a, v in attrs.items():
            if a != name and known(a) and json.dumps(current.get(a), sort_keys=True) != json.dumps(v, sort_keys=True):
                out[a] = v
    partner = re.sub(r'Opacity$', 'Colour', name)
    if partner != name and partner in schema and current.get(partner, schema[partner].get('default', '')) in ('', None):
        out[partner] = MARKER_HEX
    if re.search(r'overlay', name, re.I) and name.endswith('Hover') and 'backgroundOverlayColour' in schema \
            and current.get('backgroundOverlayColour', schema['backgroundOverlayColour'].get('default', '')) in ('', None):
        out['backgroundOverlayColour'] = OVERLAY_REST_HEX
    out.update(gating_toggle(name, schema, current))
    out.update({k: v for k, v in shadow_lift_partner(name, schema, current).items() if k not in out})
    out.update({k: v for k, v in gating_mode(name, schema, current).items() if k not in out})
    out.update(border_partners(name, first, schema))
    out.update(shadow_partners(name, first, schema))
    if (re.search(r'overlay|scrim', name, re.I) or IMAGE_SHAPING.search(name) or any(IMAGE_SHAPING_PROPS.search(p) for p in props)) \
            and 'object' in types(schema.get('backgroundSource')) and is_empty(current.get('backgroundSource')):
        out['backgroundSource'] = {'desktop': {'kind': 'image', **IMAGE}}
    return out


def layout_modes(schema: dict, current: dict) -> list:
    """Enums offering a flex or grid layout: a layout property paints only under its mode, so it is also tried under
    each other value of each mode setting."""
    out = []
    for name, d in schema.items():
        en = d.get('enum') if isinstance(d, dict) else None
        if isinstance(en, list) and any(v in LAYOUT_VALUES for v in en):
            vals = [v for v in en if v != '' and v != current.get(name, d.get('default'))]
            if vals:
                out.append((name, vals))
    return out


def variant_attributes(base: dict, variant: dict) -> dict:
    """The fixture's base attributes with a variant's laid over them; a variant value of null removes the attribute."""
    out = {**(base or {}), **(variant or {})}
    for k, v in (variant or {}).items():
        if v is None:
            out.pop(k, None)
    return out


# ---------------------------------------------------------------- test values
def _tier_leaves(d, held=None) -> list:
    out = []
    for dv in (d.get('default') if isinstance(d, dict) else None, held):
        out += [dv[t] for t in TIERS if isinstance(dv, dict) and t in dv]
    return out


def described_choices(desc: str) -> list:
    """The choices a setting's block.json description lists: `(a|b|c)` or `a / b / c`."""
    m = re.search(r'\(([a-z][a-z0-9-]*(?:\s*\|\s*[a-z][a-z0-9-]*)+)\)', desc)
    if m:
        return [w.strip() for w in m.group(1).split('|')]
    m = re.search(r'\b([a-z][a-z0-9-]*(?:\s+/\s+[a-z][a-z0-9-]*)+)\b', desc)
    return [w.strip() for w in m.group(1).split('/')] if m else []


def effective_tiers(held) -> dict:
    """What each device shows for a per-device value: an unset tier carries the larger one down."""
    if not isinstance(held, dict):
        return {}
    out, last = {}, None
    for t in TIERS:
        if t in held and held[t] not in (None, ''):
            last = held[t]
        out[t] = last
    return out


def differ_per_tier(v: dict, held, pool) -> dict:
    """A per-device test value whose every device differs from what that device already shows, and from the device
    above it (an equal smaller tier is not printed), choosing from the value's own entries and `pool`."""
    eff = effective_tiers(held)
    out, prev = {}, object()
    for t in TIERS:
        if t not in v:
            continue
        cands = [v[t]] + [c for c in list(v.values()) + list(pool) if c != v[t]]
        pick = next((c for c in cands if c != eff.get(t) and c != prev and not isinstance(c, (dict, list))), v[t])
        out[t] = prev = pick
    return out


def values_for(row: dict, d: dict, schema: dict, current: dict):
    """The test values for one setting (see _values_for), each per-device scalar value made to differ from the
    baseline at every device."""
    got = _values_for(row, d, schema, current)
    if not isinstance(got, list):
        return got
    held = current.get(row['attr'], d.get('default'))
    pool = list(KEYWORDS.get(row['vprop'] or '', [])) + [x for x in (d.get('enum') or []) if x != '']
    extra = []
    for m in got:
        v = m['attrs'].get(row['attr'])
        if isinstance(v, dict) and set(v) <= set(TIERS) and v and all(not isinstance(x, (dict, list)) for x in v.values()):
            v = m['attrs'][row['attr']] = differ_per_tier(v, held, pool)
        # A per-device value set on desktop only (the common way to author one) prints its rule with no media query,
        # unlike the same value set on every device: try that shape too.
        if isinstance(v, dict) and set(v) <= set(TIERS) and len(v) > 1 and 'desktop' in v:
            extra.append({**m, 'label': m['label'] + '-desktop-only', 'attrs': {**m['attrs'], row['attr']: {'desktop': v['desktop']}}})
    return got + extra


def _values_for(row: dict, d: dict, schema: dict, current: dict):
    """The test values for one setting: a list of {label, attrs, base?}, or (None, why) when no generic value exists."""
    name = row['attr']
    t = types(d)
    prop = row['vprop'] or ''
    props = row['props']
    shape = row['shape']
    tiered = shape == 'tier_object'
    held = current.get(name, d.get('default'))
    unit = f'{name}Unit' if f'{name}Unit' in schema else None
    numeric = 'number' in t or 'integer' in t

    def set_(v):
        return {name: v}

    def with_unit(a):
        if not unit:
            return a
        ut = types(schema[unit])
        return {**a, unit: every_tier('px') if 'object' in ut else 'px'}

    def length_in(n):
        if numeric or FLOORED_ATTR.search(name) or (unit and 'string' not in t):
            return n
        return str(n) if unit else f'{n}px'

    def one(label, v, **extra):
        return [{'label': label, 'attrs': set_(v), **extra}]

    is_gradient = name.endswith('Gradient') or prop.endswith('-gradient')
    is_colour = prop in ('color', 'background-color', 'fill', 'stroke', 'border-color', 'outline-color') or prop.endswith('-color') \
        or bool(COLOUR_NAME.search(name))
    enum = d.get('enum') if isinstance(d.get('enum'), list) else None

    if 'array' in t:
        if not is_empty(held):
            return one('emptied', [])
        item = LV.list_item_sample(row.get('plugin'), name)
        if item is not None:
            return one('list-item', item)
        return None, 'a list no source of the plugin reads item by item (no `array_map( ..., (array) $x['' + name + ''] )`): no generic item'
    if not is_gradient and 'string' in t and not enum and is_colour:
        return one('hex', MARKER_ALT_HEX if held == MARKER_HEX else MARKER_HEX)
    if is_gradient and 'string' in t:
        return one('gradient', MARKER_REST_GRADIENT if held == MARKER_GRADIENT else MARKER_GRADIENT)
    if not enum and prop in KEYWORDS and 'string' in t:
        pair = companion_width(name, schema) if prop == 'border-style' else None
        v = next((k for k in KEYWORDS[prop] if k != held and k != d.get('default')), None)
        if v is None:
            return None, f'every {prop} keyword equals the baseline'
        return [{'label': 'kw-' + re.sub(r'[^a-z0-9]+', '-', v, flags=re.I).strip('-'), 'attrs': {**set_(v), **(pair or {})}, **({'base': pair} if pair else {})}]
    if enum:
        pair = companion_width(name, schema) if prop == 'border-style' else None
        per_device = tiered and 'object' in t and 'string' not in t
        vals = [v for v in enum if v != '' and v != held]
        if not vals:
            return None, 'every choice equals the baseline'
        return [{'label': f'enum-{v}', 'attrs': {**set_(every_tier(v) if per_device else v), **(pair or {})}, **({'base': pair} if pair else {})} for v in vals]
    choices = described_choices(d.get('description') or '') if 'string' in t and 'object' not in t else []
    if len(choices) >= 2:
        return [{'label': f'choice-{v}', 'attrs': set_(v)} for v in choices if v != held]
    timing = _timing(name, d, t, props, prop, held)
    if timing is not None:
        return timing
    if 'boolean' in t:
        return one('bool', not bool(held))
    if 'object' in t:
        return _object_values(row, d, schema, held, set_, with_unit, length_in)
    if 'font-weight' == prop:
        w = '300' if str(held) == '700' else '700'
        return one(f'weight-{w}', int(w) if numeric else w)
    if 'opacity' == prop:
        v = 0.37 if not (numeric and isinstance(d.get('default'), (int, float)) and d['default'] > 1) else 37
        return one('number', str(v) if 'string' in t and not numeric else v)
    if TRANSFORM.search(prop) and (numeric or 'string' in t):
        n = 1.1 if re.search('scale', name, re.I) or prop == 'scale' else 37 if re.search('rotat', name, re.I) or prop == 'rotate' else 7
        return one('transform', n if numeric else str(n))
    if prop == 'letter-spacing' and (numeric or 'string' in t):
        return [{'label': 'spacing', 'attrs': with_unit(set_(3 if numeric else ('3' if unit else '3px')))}]
    if (numeric or 'string' in t) and LENGTH.search(prop):
        px = 137 if FLOORED.search(prop) else 37
        return [{'label': 'length', 'attrs': with_unit(set_(length_in(px)))}]
    if numeric and COUNT.search(prop):
        return one('count', 2 if held == 3 else 3)
    if numeric and ANGLE_NAME.search(name):
        return one('angle', ((held or 0) + 90) % 360)
    if RECORD_NAME.search(name):
        got = LV.standin_value(name, d, held, row.get('literals'))
        if isinstance(got, tuple):
            return got
        return one('standin', got)
    # No source names a property the value table knows: the name's own words choose the value.
    kebab = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name).lower()
    if (numeric or 'string' in t) and kebab.endswith('opacity'):
        return one('number', 0.37 if numeric else '0.37')
    if (numeric or 'string' in t) and LIFT_NAME.search(name):
        return one('transform', 7 if numeric else '7')
    if (numeric or 'string' in t) and LENGTH.search(kebab):
        return [{'label': 'length', 'attrs': with_unit(set_(length_in(37)))}]
    if numeric:
        if isinstance(held, (int, float)) and not isinstance(held, bool) and not float(held).is_integer():
            return one('number', round(held / 2, 3))
        return one('number', 2 if held == 3 else 3)
    if 'string' in t:
        if ICON_NAME.search(name):
            return one('icon', 'heart' if held == SAMPLE_ICON else SAMPLE_ICON)
        if URL_NAME.search(name):
            return one('url', '/other-page/' if held == SAMPLE_URL else SAMPLE_URL)
        return one('text', 'Other sample' if held == SAMPLE_TEXT else SAMPLE_TEXT)
    return None, f'type {t or "unset"}: no generic value'


def _timing(name, d, t, props, prop, held):
    """A transition duration or easing (both a timing name and, when the property is known, a timing property)."""
    known = bool(props)
    if DURATION_NAME.search(name) and (not known or 'transition-duration' in props or prop == 'transition'):
        if 'number' in t or 'integer' in t:
            dv = d.get('default')
            seconds = isinstance(dv, float) and not dv.is_integer()
            v = DURATION_MS / 1000 if seconds else DURATION_MS
            return [{'label': 'duration-s' if seconds else 'duration-ms', 'attrs': {name: v if v != held else v + (0.1 if seconds else 100)}}]
        if 'string' in t:
            return [{'label': 'duration-ms', 'attrs': {name: str(DURATION_MS)}}]
    if EASING_NAME.search(name) and (not known or 'transition-timing-function' in props or prop == 'transition') and 'string' in t and not d.get('enum'):
        v = EASING_CUSTOM if name.endswith('EasingCustom') else EASING_ALT if held == EASING or d.get('default') == EASING else EASING
        return [{'label': 'easing', 'attrs': {name: v}}]
    return None


def _object_values(row, d, schema, held, set_, with_unit, length_in):
    name = row['attr']
    prop = row['vprop'] or ''
    props = row['props']
    shape = row['shape']
    tiered = shape == 'tier_object'
    # A padding or margin setting is a four-sided box unless its name names one side (actionsTopPadding holds one
    # length per device; its render prints nothing for a box).
    one_side = re.search(r'(Top|Right|Bottom|Left|Block|Inline)(Padding|Margin)|(Padding|Margin)(Top|Right|Bottom|Left|Block|Inline)', row['attr'])
    box = bool(row['box_family']) or shape == 'box_only' or (prop in ('padding', 'margin') and not one_side)
    desc = d.get('description') or ''
    leaves = _tier_leaves(d, held)
    if re.search(r'Source$|^source$', name):
        return [{'label': 'image', 'attrs': set_({'desktop': {'kind': 'image', **IMAGE}})}]

    def box_of(tier):
        return {s: f'{BOX[tier][i]}px' for i, s in enumerate(SIDES)}

    def corners_of(tier):
        return {c: f'{BOX[tier][i]}px' for i, c in enumerate(CORNERS)}

    if prop == 'border-radius':
        tier_default = isinstance(d.get('default'), dict) and 'desktop' in d['default']
        if tiered or tier_default:
            out = [{'label': 'corners-tiers', 'attrs': set_({t: corners_of(t) for t in TIERS})}]
            if not row['box_family']:
                out.append({'label': 'tiers-radius', 'attrs': set_({t: f'{n}px' for t, n in TIER_PX.items()})})
            return out
        return [{'label': 'corners', 'attrs': set_(corners_of('desktop'))}]
    if tiered and re.search(r'\{x, y\}', desc):
        return [{'label': 'tiers-xy', 'attrs': set_({'desktop': {'x': 37, 'y': 41}, 'tablet': {'x': 23, 'y': 29}, 'mobile': {'x': 7, 'y': 11}})}]
    if tiered and re.search(r'\{desktop:\{width,\s*height\}', desc):
        return [{'label': 'tiers-size', 'attrs': set_({t: {'width': f'{n}px', 'height': f'{n}px'} for t, n in SIZE_BOX_PX.items()})}]
    if tiered and box:
        return [{'label': 'box-tiers', 'attrs': set_({t: box_of(t) for t in TIERS})}]
    if box:
        return [{'label': 'box', 'attrs': set_(box_of('desktop'))}]
    if tiered:
        if prop.startswith('grid-template-'):
            # never one column: a phone shows one already
            return [{'label': 'tiers-template', 'attrs': set_({'desktop': 'repeat(4, 1fr)', 'tablet': 'repeat(3, 1fr)', 'mobile': 'repeat(2, 1fr)'})}]
        if COUNT.search(prop):
            dv = d.get('default') if isinstance(d.get('default'), dict) else {}
            return [{'label': 'tiers-value', 'attrs': set_({t: (6, 4, 1)[i] if (5, 3, 2)[i] == _num(dv.get(t)) else (5, 3, 2)[i] for i, t in enumerate(TIERS)})}]
        if prop in KEYWORDS:
            words = [w for w in KEYWORDS[prop]]
            return [{'label': 'tiers-value', 'attrs': set_({t: words[i % len(words)] for i, t in enumerate(TIERS)})}]
        if prop == 'opacity':
            pct = any(isinstance(v, (int, float)) and v > 1 for v in leaves)
            return [{'label': 'tiers-opacity', 'attrs': set_({'desktop': 37, 'tablet': 23, 'mobile': 7} if pct else {'desktop': 0.37, 'tablet': 0.23, 'mobile': 0.07})}]
        if prop == 'order':
            return [{'label': 'tiers-order', 'attrs': set_({'desktop': 3, 'tablet': 2, 'mobile': 1})}]
        if prop == 'backdrop-filter':
            return [{'label': 'tiers-blur', 'attrs': set_({t: f'{n}px' for t, n in TIER_PX.items()})}]
        if TRANSFORM.search(prop) and leaves and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in leaves):
            ns = (1.1, 1.2, 1.3) if re.search('scale', name, re.I) or prop == 'scale' else (37, 23, 7) if re.search('rotat', name, re.I) or prop == 'rotate' else (7, 11, 13)
            return [{'label': 'tiers-transform', 'attrs': set_(dict(zip(TIERS, ns)))}]
        if all(p in props for p in BORDER_TRIO):
            return [{'label': 'tiers-border', 'attrs': set_({t: {'width': f'{(3, 5, 7)[i]}px', 'style': 'dashed', 'colour': MARKER_HEX} for i, t in enumerate(TIERS)})}]
        if (leaves and all(v in ('on', 'off', 'inherit') for v in leaves)) or re.search(r'\bon\s*/\s*off\b', desc):
            first = 'off' if (held or {}).get('desktop') == 'on' else 'on'
            other = 'on' if first == 'off' else 'off'
            return [{'label': 'tiers-switch', 'attrs': set_({'desktop': first, 'tablet': other, 'mobile': first})}]
        if (leaves and all(isinstance(v, bool) for v in leaves)) or (not leaves and re.search(r'\btrue\b.*\bfalse\b|\bbooleans?\b', desc)):
            b = bool((held or {}).get('desktop', leaves[0] if leaves else False))
            return [{'label': 'tiers-bool', 'attrs': set_({'desktop': not b, 'tablet': b, 'mobile': not b})}]
        choices = described_choices(desc)
        if len(choices) >= 2:
            now = (held or {}).get('desktop')
            free = [c for c in choices if c != now] + [c for c in choices if c == now]
            return [{'label': 'tiers-value', 'attrs': set_({t: free[i % len(free)] for i, t in enumerate(TIERS)})}]
        if not prop and re.search(r'\bpx\b', desc) and not re.search(r'CSS length', desc):
            return [{'label': 'tiers-px', 'attrs': set_(dict(TIER_PX))}]
        if not prop and LENGTH.search(re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name).lower()):
            prop = 'length-by-name'
        if LENGTH.search(prop) or prop == 'line-height':
            lift = 100 if FLOORED.search(prop) or FLOORED_ATTR.search(name) else 0
            return [{'label': 'tiers', 'attrs': with_unit(set_({t: length_in(n + lift) for t, n in TIER_PX.items()}))}]
        if prop in ('color', 'background-color') or prop.endswith('-color'):
            return [{'label': 'tiers-colour', 'attrs': set_({'desktop': MARKER_HEX, 'tablet': MARKER_ALT_HEX, 'mobile': OVERLAY_REST_HEX})}]
        distinct = []
        for v in leaves:
            if isinstance(v, str) and v and v not in distinct:
                distinct.append(v)
        if len(distinct) >= 2:
            rot = distinct[1:] + distinct[:1]
            return [{'label': 'tiers-rotated', 'attrs': set_({t: rot[i % len(rot)] for i, t in enumerate(TIERS)})}]
        if leaves and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in leaves):
            return [{'label': 'tiers-number', 'attrs': set_({t: _num(leaves[0]) + (3, 2, 1)[i] for i, t in enumerate(TIERS)})}]
        leafy = LV.object_leaf_values(name, d, held, row.get('plugin'), row.get('literals') or (), schema)
        if isinstance(leafy, list) and not set(LV.object_shape(name, d, row.get('plugin'), schema)) <= set(TIERS):
            return leafy  # an object keyed by something other than devices (separators): its leaves, not per-device choices
        coded = LV.code_choices(row.get('literals'), (held or {}).get('desktop'))
        if re.search(r'Ratio$', name):
            coded = [c for c in coded if re.fullmatch(r'[\d.]+\s*/\s*[\d.]+|[\d.]+', c)] or list(LV.RATIO_VALUES)
        now = (held or {}).get('desktop')
        free = [c for c in coded if c != now]
        if free:
            return [{'label': 'tiers-code-values', 'attrs': set_({t: free[i % len(free)] for i, t in enumerate(TIERS)})}]
        return None, 'a per-device value of unknown kind: the code compares it against no value the generator can use'
    return LV.object_leaf_values(name, d, held, row.get('plugin'), row.get('literals') or (), schema)


def _num(v):
    try:
        return float(v) if not float(v).is_integer() else int(float(v))
    except (TypeError, ValueError):
        return 0


# ---------------------------------------------------------------- completing a render: the setting that prints a missing class
def switching_attrs(scan: dict, tokens, data_attrs=()) -> list:
    """The block settings the source scanner finds deciding whether each class (or data attribute) is printed, in the
    order found. A class decided by a modifier (`sgs-x--has-gap`) or by the family it is assembled from
    (`sgs-x--field-cols-` + a value) is in `switchClasses`; a part printed under a condition is in the part's
    `conditionAttrs` and `textAttrs`; a data attribute is in `dataAttrs`."""
    out = []

    def add(names):
        for n in names:
            if n not in out:
                out.append(n)

    cv = scan.get('conditionValues') or {}

    def own(key):
        rec = cv.get(key) or {}
        return sorted(rec, key=lambda a: (not rec[a], a))  # the settings the printing needs: the ones with a compared value first

    for tok in tokens:
        sw = scan.get('switchClasses') or {}
        add(own(tok))
        add(own(tok.split('--')[0]))
        add(sw.get(tok, ()))
        add(a for fam in sorted(sw, key=len, reverse=True) if fam.endswith('-') and tok.startswith(fam) for a in sw[fam])
        part = (scan.get('parts') or {}).get(tok.split('--')[0]) or {}
        add(part.get('conditionAttrs') or ())
        add(part.get('textAttrs') or ())
    for name in data_attrs:
        add(own('data-' + name))
        add((scan.get('dataAttrs') or {}).get(name, ()))
    return out


def setting_literals(scan: dict | None) -> dict:
    """setting -> the values the code compares it against, read by the scanner: each token's own conditions first
    (`conditionValues`), then every comparison in the sources read (`settingValues`)."""
    out = {}
    scan = scan or {}
    for rec in (scan.get('conditionValues') or {}).values():
        for a, vals in rec.items():
            for v in vals:
                if v not in out.setdefault(a, []):
                    out[a].append(v)
    for a, vals in (scan.get('settingValues') or {}).items():
        for v in vals:
            if v not in out.setdefault(a, []):
                out[a].append(v)
    return out


def _literal_dicts(attr: str, d: dict, shape, literals, current: dict) -> list:
    """The attribute dicts that give `attr` each value the code compares it against (one valid for its type), skipping
    the one it holds."""
    t = types(d)
    enum = d.get('enum') if isinstance(d.get('enum'), list) else None
    out = []
    for v in literals:
        if v == current.get(attr, d.get('default')):
            continue
        if enum is not None and v not in enum:
            continue
        if isinstance(v, str) and 'string' in t:
            out.append({attr: v})
        elif isinstance(v, str) and shape == 'tier_object' and 'object' in t:
            out.append({attr: every_tier(v)})
        elif isinstance(v, (int, float)) and not isinstance(v, bool) and ('number' in t or 'integer' in t):
            out.append({attr: v})
    return out


@lru_cache(maxsize=None)
def _shapes(plugin: str, short: str) -> dict:
    bj = block_json(Path(plugin), short)
    schema = {k: v for k, v in (bj.get('attributes') or {}).items() if isinstance(v, dict)}
    return tier_shapes(schema, Path(plugin) / 'src' / 'blocks' / short, Path(plugin))


def switching_values(plugin: Path, short: str, attr: str, current: dict) -> list:
    """The attribute dicts (the setting with its unit companion) that move `attr` off what `current` holds: the test
    values the plan uses for a setting of that name and type (every enum value, a flipped boolean, a sample string)."""
    bj = block_json(plugin, short)
    schema = {k: v for k, v in (bj.get('attributes') or {}).items() if isinstance(v, dict)}
    d = schema.get(attr)
    if d is None:
        return []
    scan = _scan_of(plugin, short)
    literals = setting_literals(scan)
    row = {'attr': attr, 'props': [], 'vprop': name_prop(attr, plugin), 'shape': _shapes(str(plugin), short).get(attr), 'box_family': box_families(bj).get(attr),
           'plugin': plugin, 'literals': literals.get(attr, [])}
    got = values_for(row, d, schema, current)
    generated = [] if isinstance(got, tuple) else [m['attrs'] for m in got]
    coded = _literal_dicts(attr, d, row['shape'], row['literals'], current)
    # A part or class that needs two settings at once (the roll's `up` copy needs labelRoll and an open label): the
    # scanner records every setting a token's condition reads; each value the code compares `attr` against is also
    # offered together with a value for each of the others.
    combos = []
    for rec in (scan.get('conditionValues') or {}).values():
        if attr not in rec or not 2 <= len(rec) <= MAX_PARTNERS + 1:
            continue
        partners = {}
        for b in rec:
            if b == attr or b not in schema:
                continue
            bd = schema[b]
            opts = _literal_dicts(b, bd, _shapes(str(plugin), short).get(b), rec[b], current)
            if not opts:
                bg = values_for({'attr': b, 'props': [], 'vprop': name_prop(b, plugin), 'shape': _shapes(str(plugin), short).get(b), 'box_family': box_families(bj).get(b),
                                 'plugin': plugin, 'literals': literals.get(b, [])}, bd, schema, current)
                opts = [] if isinstance(bg, tuple) else [m['attrs'] for m in bg]
            if opts:
                partners.update(opts[0])
        if partners:
            combos += [{**c, **partners} for c in coded[:2] + generated[:1]]
    out, seen = [], set()
    for cand in coded + combos + generated:
        k = json.dumps(cand, sort_keys=True, default=str)
        if k not in seen:
            seen.add(k)
            out.append(cand)
    return out


def _scan_of(plugin: Path, short: str) -> dict:
    try:
        return scan_json(Path(plugin) / 'src' / 'blocks', short)
    except Exception:  # noqa: BLE001  (a block the scanner cannot read has no code facts; the generated values stand)
        return {}


# ---------------------------------------------------------------- the plan
def plan_block(bj: dict, fixture: dict | None = None, *, places: dict | None = None, shapes: dict | None = None,
               extensions: dict | None = None, plugin: Path | None = None, literals: dict | None = None) -> dict:
    """Every instance for one block from its block.json and fixture. places: attr -> {props, state, element, source};
    shapes: attr -> tier shape; extensions: the sgs* attributes render_block filters add (listed unvalued)."""
    plugin = Path(plugin or PLUGIN)
    fixture = fixture if fixture is not None else {'attributes': {}, 'variants': [{}]}
    schema = {k: v for k, v in (bj.get('attributes') or {}).items() if isinstance(v, dict)}
    places = places if places is not None else declared_props(bj, schema, plugin)
    shapes = shapes if shapes is not None else tier_shapes(schema, None, None)
    units = unit_companions(schema)
    fams = box_families(bj)
    vattr, vslots = variant_slots(bj)
    ctx = {'variantAttr': vattr, 'variantSlots': vslots, 'settingPreconditions': fixture.get('preconditions') or {},
           'familyPreconditions': fixture.get('familyPreconditions') or {}, 'extensionAttrs': set(extensions or {}), 'plugin': plugin}
    variants = [variant_attributes(fixture.get('attributes'), v) for v in (fixture.get('variants') or [{}])]
    settings = [a for a in schema if a not in units]
    rows = {}
    for a in settings:
        p = places.get(a) or {}
        props = list(p.get('props') or [])
        vprop = re.sub(r':.*$', '', props[0]) if props else name_prop(a, plugin)
        rows[a] = {'attr': a, 'props': props, 'vprop': vprop, 'state': p.get('state'), 'element': p.get('element'),
                   'source': p.get('source') if props else ('name' if vprop else None),
                   'shape': shapes.get(a), 'box_family': fams.get(a), 'plugin': plugin, 'literals': (literals or {}).get(a, [])}
    instances, unvalued, no_marker = [], {}, set()
    for ps in fixture.get('paintStates') or []:
        instances.append({'key': f"paint-{ps['name']}", 'attrs': variant_attributes(fixture.get('attributes'), ps.get('attributes') or {}),
                          **({'inner': ps['inner']} if ps.get('inner') else {}), 'paintState': ps['name']})
    base_keys = {}

    def add_base(vi, vattrs, base):
        bk = f'{vi}:{json.dumps(base, sort_keys=True)}'
        if bk not in base_keys:
            base_keys[bk] = True
            instances.append({'key': f"base-{'-'.join(base)}-v{vi}-{len(instances)}", 'attrs': {**vattrs, **base}, 'variant': vi, 'isBase': True, 'baseKey': bk})
        return bk

    for vi, vattrs in enumerate(variants):
        instances.append({'key': f'default-v{vi}', 'attrs': vattrs, 'variant': vi, 'isDefault': True})
        for a in settings:
            row = rows[a]
            if a in (fixture.get('_unvalued') or {}):
                unvalued.setdefault(a, fixture['_unvalued'][a])
                continue
            res = values_for(row, schema[a], schema, vattrs)
            if isinstance(res, tuple):
                unvalued.setdefault(a, res[1])
                if row['props']:
                    no_marker.add(a)
                continue
            pre = preconditions(row, schema, vattrs, ctx)
            modes = layout_modes(schema, vattrs) if row['vprop'] and LAYOUT_PROPS.search(row['vprop']) else []
            runs = [('', {})] + [(f'-{m}-{v}', {m: v}) for m, vals in modes if m != a for v in vals]
            for m in res:
                for suffix, extra in runs:
                    base = {**pre, **extra, **(m.get('base') or {})}
                    base = {k: v for k, v in base.items() if k != a}
                    bk = add_base(vi, vattrs, base) if base else None
                    instances.append({
                        'key': f"{a}-{m['label']}{suffix}-v{vi}", 'attrs': {**vattrs, **base, **m['attrs']}, 'variant': vi,
                        'baseKey': bk, 'attr': a, 'state': row['state'], 'prop': ','.join(row['props']) or None,
                        'element': row['element'], 'trigger': STATE_TRIGGERS.get(row['state']) if row['state'] else None,
                        'marker': {'label': m['label']}, 'propSource': row['source'],
                    })
    for a in sorted(extensions or {}):
        if a not in schema:
            unvalued.setdefault(a, EXTENSION_WHY)
    full = []
    for i in instances:
        full.append({'key': i['key'], 'attrs': i['attrs'], 'variant': i.get('variant'), 'isDefault': bool(i.get('isDefault')),
                     'isBase': bool(i.get('isBase')), 'baseKey': i.get('baseKey'), 'attr': i.get('attr'), 'state': i.get('state'),
                     'prop': i.get('prop'), 'element': i.get('element'), 'trigger': i.get('trigger'), 'discover': None,
                     'paintState': i.get('paintState'), 'marker': i.get('marker'),
                     **({'propSource': i['propSource']} if 'propSource' in i else {}), **({'inner': i['inner']} if 'inner' in i else {})})
    return {'block': bj.get('name'), 'fixture': fixture, 'instances': full, 'noMarker': sorted(no_marker),
            'rows': [a for a in settings if rows[a]['props']], 'unvalued': [{'setting': a, 'why': w} for a, w in unvalued.items()]}


def plan(short: str, plugin: Path = PLUGIN, fixtures: dict | None = None, *, scan: bool = True, plain: bool = False) -> dict:
    """The plan for block `short` in `plugin` (default: this checkout's sgs-blocks), its fixture from `fixtures`
    (default: fixtures.json beside this file); a block with no entry gets {attributes: {}, variants: [{}]}. The check's
    plan carries the fixture's `checkAttributes` (check_fixture); `plain` leaves them out, for the block as a new node
    renders it (the site look)."""
    plugin = Path(plugin)
    fixtures = load_fixtures() if fixtures is None else fixtures
    bj = block_json(plugin, short)
    schema = {k: v for k, v in (bj.get('attributes') or {}).items() if isinstance(v, dict)}
    blocks_dir = plugin / 'src' / 'blocks'
    places = scanned_props(blocks_dir, short) if scan else {}
    places = {**places, **declared_props(bj, schema, plugin)}
    fixture = fixtures.get(bj['name']) or {'attributes': {}, 'variants': [{}]}
    fixture = {k: v for k, v in fixture.items() if k != 'checkAttributes'} if plain else check_fixture(fixture)
    fixture = with_shared(fixture, fixtures.get('_shared') if '_shared' in fixtures else load_shared())
    roster = extension_roster(str(plugin))
    ext = extension_attrs(bj, roster)
    shapes = tier_shapes(schema, blocks_dir / short, plugin)
    # The extension settings join the block's own: their definition, place and tier shape from the roster.
    # Every extension setting the block receives is tried, whatever its roster role: a setting that paints nothing is
    # shown to by its renders (check.py lists it under testedNoPaint), not assumed from its role.
    paint = {a: d for e in roster for a, d in (e.get('attributes') or {}).items() if a in ext and a not in schema}
    if paint:
        bj = {**bj, 'attributes': {**{a: {k: v for k, v in d.items() if k in ('type', 'default', 'enum')} for a, d in paint.items()},
                                   **(bj.get('attributes') or {})}}
        for a, d in paint.items():
            if d.get('css_property') and a not in places:
                places[a] = {'props': [d['css_property']], 'state': None, 'element': None, 'source': 'extension-roster'}
            shapes.setdefault(a, d.get('tier_shape'))
    literals = setting_literals(scan_json(blocks_dir, short)) if scan else {}
    return plan_block(bj, fixture, places=places, shapes=shapes,
                      extensions={a: x for a, x in ext.items() if a not in paint}, plugin=plugin, literals=literals)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('short', help='block folder name under src/blocks')
    ap.add_argument('--plugin', type=Path, default=PLUGIN, help='the sgs-blocks folder to read (default: this checkout)')
    ap.add_argument('--fixtures', type=Path, default=None, help='fixtures file (default: fixtures.json beside this file)')
    ap.add_argument('--no-scan', action='store_true', help='skip the source scanner (block.json sources only)')
    ap.add_argument('--out', type=Path, help='write the plan here instead of stdout')
    args = ap.parse_args(argv)
    result = plan(args.short, args.plugin, load_fixtures(args.fixtures), scan=not args.no_scan)
    text = json.dumps(result, indent=1)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding='utf-8')
        n = len([i for i in result['instances'] if i['attr']])
        print(f"{args.short}: {len(result['instances'])} instances ({n} setting instances), {len(result['unvalued'])} unvalued -> {args.out}")
    else:
        sys.stdout.write(text)


if __name__ == '__main__':
    main()
