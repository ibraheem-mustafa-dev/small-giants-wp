"""Test values for the settings `instances.py` cannot value from a type and a name alone, read from the block's own code.

Three jobs, each general (no block is named; every fact is read from block.json, the plugin's PHP and the source
scanner's reading of it):

  * `object_leaf_values`: an object setting with no tier or box shape (`separators`, an icon `{source, name}`).
    Its shape is the default's keys, else the description's `{ key: { a, b, width: {desktop,tablet,mobile} }, mode:
    x | y }` grammar, else the same-named setting's default on another block. Each leaf is valued by its kind (a colour
    slug or hex becomes the test colour, a length px, an enum another of its choices); the result is one instance with
    every leaf moved, plus one per extra choice of an enum leaf.
  * `code_choices`: the values the render code compares a setting against (the scanner's `settingValues`), for a
    per-device setting whose choices live in the editor.
  * `standin_value`: a stand-in for a setting that names a post, a product or a menu item, by what the name says.
"""
from __future__ import annotations

import copy
import json
import re
from functools import lru_cache
from pathlib import Path

TIERS = ('desktop', 'tablet', 'mobile')
TIER_PX = {'desktop': 37, 'tablet': 23, 'mobile': 7}
MARKER_HEX = '#13579b'
MARKER_ALT_HEX = '#9b1357'
COLOUR_LEAF = re.compile(r'colou?r', re.I)
LENGTH_LEAF = re.compile(r'width|height|size|thickness|gap|radius|offset|indent|spacing|length', re.I)
ANGLE_LEAF = re.compile(r'angle|deg|rotat', re.I)
ICON_LEAF = re.compile(r'^(name|icon|glyph)$', re.I)
BORDER_STYLES = ('dashed', 'solid', 'dotted')
SAMPLE_ICON = 'heart'
RATIO_VALUES = ('7 / 3', '1 / 1', '16 / 9')
# Stand-ins: PLACEHOLDERS of render.py (a page, a mega menu panel, a product), and the second item of the fixture menu.
STANDIN_PRODUCT = '{{product}}'
STANDIN_POST = '{{post2}}'
STANDIN_ITEM_ID = 9110
SAMPLE_KEY = 'sample1234'
ENUM_LEAF = re.compile(r'^(source|type|kind|mode|variant|treatment)$', re.I)
MAX_LEAF_CHOICES = 3
SAMPLE_NUMBER = 7
LEAF = 'leaf'


# ---------------------------------------------------------------- the shape
def _split_top(text: str) -> list:
    out, cur, depth = [], [], 0
    for ch in text:
        if ch in '{[(':
            depth += 1
        elif ch in '}])':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(''.join(cur))
            cur = []
        else:
            cur.append(ch)
    if ''.join(cur).strip():
        out.append(''.join(cur))
    return out


def _parse_body(body: str):
    """`a, b: { c, d }, e: x | y` -> {a: leaf, b: {c: leaf, d: leaf}, e: leaf with choices}."""
    out = {}
    for item in _split_top(body):
        item = item.strip().rstrip('.').strip()
        if not item:
            continue
        m = re.match(r'([A-Za-z_]\w*)\s*:\s*(.*)$', item, re.S)
        if not m:
            if re.fullmatch(r'[A-Za-z_]\w*', item):
                out[item] = {LEAF: True, 'default': None, 'choices': []}
            continue
        key, rest = m.group(1), m.group(2).strip()
        if rest.startswith('{') and rest.endswith('}'):
            out[key] = _parse_body(rest[1:-1])
        else:
            choices = [c.strip() for c in re.split(r'\s*\|\s*', rest) if re.fullmatch(r'[a-z][a-z0-9-]*', c.strip())]
            out[key] = {LEAF: True, 'default': None, 'choices': choices if len(choices) >= 2 else []}
    return out


def description_shape(desc: str) -> dict:
    """The braces a block.json description writes its object in: `{ row: { style, width: {desktop,tablet,mobile}, colour } }`."""
    start = desc.find('{')
    while start >= 0:
        depth, end = 0, -1
        for i in range(start, len(desc)):
            if desc[i] == '{':
                depth += 1
            elif desc[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end > 0 and ':' in desc[start:end]:
            return _parse_body(desc[start + 1:end])
        start = desc.find('{', start + 1)
    return {}


def default_shape(value) -> dict:
    """A default object as a shape: each scalar a leaf holding that default."""
    if not isinstance(value, dict):
        return {}
    out = {}
    for k, v in value.items():
        out[k] = default_shape(v) if isinstance(v, dict) and v else {LEAF: True, 'default': v, 'choices': []}
    return out


def _merge(a: dict, b: dict) -> dict:
    out = dict(a)
    for k, v in b.items():
        if k not in out:
            out[k] = v
        elif isinstance(out[k], dict) and LEAF not in out[k] and isinstance(v, dict) and LEAF not in v:
            out[k] = _merge(out[k], v)
        elif isinstance(out[k], dict) and out[k].get(LEAF) and isinstance(v, dict) and v.get(LEAF):
            out[k] = {LEAF: True, 'default': out[k]['default'] if out[k]['default'] is not None else v['default'],
                      'choices': out[k]['choices'] or v['choices']}
    return out


@lru_cache(maxsize=None)
def _other_defaults(plugin: str) -> dict:
    """setting name -> the first non-empty object default any block gives it."""
    out = {}
    for f in sorted((Path(plugin) / 'src' / 'blocks').glob('*/block.json')):
        try:
            bj = json.loads(f.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for name, d in (bj.get('attributes') or {}).items():
            if isinstance(d, dict) and isinstance(d.get('default'), dict) and d['default'] and name not in out:
                out[name] = d['default']
    return out


def _sibling_choices(schema: dict) -> dict:
    """leaf name -> the choices another setting of the block lists for a leaf of that name in its description
    (`hoverTreatment: swap | sweep | none`)."""
    out = {}
    for d in (schema or {}).values():
        if not isinstance(d, dict):
            continue
        for path, node in _walk(description_shape(d.get('description') or '')):
            if node['choices'] and path[-1] not in out:
                out[path[-1]] = node['choices']
    return out


def object_shape(name: str, d: dict, plugin, schema: dict | None = None) -> dict:
    """The setting's shape: its default's keys, its description's braces, the same name's default on another block;
    a leaf with no listed choices takes those a sibling setting's description lists for a leaf of that name."""
    shape = _merge(default_shape(d.get('default')), description_shape(d.get('description') or ''))
    if not shape and plugin is not None:
        shape = default_shape(_other_defaults(str(plugin)).get(name))
    sib = _sibling_choices(schema or {})
    for path, node in _walk(shape):
        if not node['choices'] and path[-1] in sib:
            node['choices'] = sib[path[-1]]
    return shape


# ---------------------------------------------------------------- values
def _is_tier_node(node) -> bool:
    return isinstance(node, dict) and LEAF not in node and bool(node) and set(node) <= set(TIERS)


def _leaf_value(name: str, path: tuple, leaf: dict, used_colours: list, choice=None):
    """The test value of one leaf, or None to leave the leaf as its default. `choice` forces an enum leaf's value."""
    key = path[-1]
    dflt = leaf.get('default')
    if choice is not None:
        return choice
    if leaf['choices']:
        return next((c for c in leaf['choices'] if c != dflt), None)
    if isinstance(dflt, bool):
        return not dflt
    if COLOUR_LEAF.search(key):
        v = MARKER_HEX if MARKER_HEX not in used_colours else MARKER_ALT_HEX
        used_colours.append(v)
        return v
    if key == 'style':
        return next((c for c in BORDER_STYLES if c != dflt), None)
    if ANGLE_LEAF.search(key):
        return 37 if dflt != 37 else 41
    if isinstance(dflt, (int, float)):
        return dflt + 1 if dflt < 10 else dflt - 1
    if ICON_LEAF.search(key) and re.search(r'icon', name, re.I):
        return SAMPLE_ICON if dflt != SAMPLE_ICON else 'star'
    if LENGTH_LEAF.search(key) or (isinstance(dflt, str) and re.fullmatch(r'-?[\d.]+(px|rem|em|%)', dflt)):
        return '37px'
    return None


def _walk(shape: dict, path=()):
    for k, node in shape.items():
        if isinstance(node, dict) and LEAF not in node:
            yield from _walk(node, path + (k,))
        else:
            yield path + (k,), node


def _set(obj: dict, path: tuple, value) -> None:
    for k in path[:-1]:
        obj = obj.setdefault(k, {})
    obj[path[-1]] = value


def object_leaf_values(name: str, d: dict, held, plugin, literals=(), schema: dict | None = None):
    """[{label, attrs}] moving every leaf of the object's shape, one more per extra choice of an enum leaf; or
    (None, why) when no leaf can be valued. `literals` are the values the code compares the setting against."""
    shape = object_shape(name, d, plugin, schema)
    others = {n.get('default') for _p, n in _walk(shape)}
    for path, node in _walk(shape):
        # An enum-like leaf (`source`, `mode`) the description does not list: the values the code compares the setting
        # against, but not another leaf's own value (an icon's `name` is compared too).
        if not node['choices'] and ENUM_LEAF.search(path[-1]):
            alts = [v for v in code_choices(literals) if v not in others]
            node['choices'] = ([node['default']] if node.get('default') else []) + alts[:MAX_LEAF_CHOICES] if alts else []
    if not shape:
        return None, 'an object whose shape neither its default, its description nor any other block gives'
    base = copy.deepcopy(held) if isinstance(held, dict) else {}
    leaves = list(_walk(shape))

    def build(force: dict | None = None):
        obj = copy.deepcopy(base)
        moved = 0
        used: list = []
        for path, node in leaves:
            tier_parent = len(path) > 1 and path[-1] in TIERS and _is_tier_node(_node_at(shape, path[:-1]))
            if tier_parent:
                v = f'{TIER_PX[path[-1]]}px' if not isinstance(node.get('default'), (int, float)) else TIER_PX[path[-1]]
            else:
                v = _leaf_value(name, path, node, used, (force or {}).get(path))
            if v is not None:
                _set(obj, path, v)
                moved += 1
        return obj, moved

    obj, moved = build()
    if not moved:
        return None, 'no leaf of its shape has a kind the generator can value'
    out = [{'label': 'leaves', 'attrs': {name: obj}}]
    for path, node in leaves:
        first = _leaf_value(name, path, node, [], None) if node['choices'] else None
        for c in node['choices']:
            if c != node.get('default') and c != first:
                alt, _ = build({path: c})
                out.append({'label': f'leaf-{"-".join(path)}-{c}', 'attrs': {name: alt}})
    return out


def _node_at(shape: dict, path: tuple):
    node = shape
    for k in path:
        node = node[k]
    return node


# ---------------------------------------------------------------- values from the code
def code_choices(literals, held=None, limit: int = 6) -> list:
    """The string values the code compares a setting against, most useful first, without the held one."""
    out = []
    for v in literals or ():
        if isinstance(v, str) and 0 < len(v) < 40 and v != held and v not in out:
            out.append(v)
    return out[:limit]


# ---------------------------------------------------------------- stand-ins and lists
def standin_value(name: str, d: dict, held, literals=()):
    """A stand-in for a setting that names a record, by what its name says, or (None, why)."""
    t = d.get('type')
    types = t if isinstance(t, list) else [t]
    if re.search(r'Product', name):
        return STANDIN_PRODUCT
    if re.search(r'(^ref$|Ref$)', name):
        return STANDIN_POST
    if re.search(r'ItemId$', name):
        prefix = re.match(r'^([a-z]+:)', held) if isinstance(held, str) else None
        return f'{prefix.group(1) if prefix else ""}{STANDIN_ITEM_ID}'
    if name == 'linkId' or re.search(r'^link.*Id$', name):
        return STANDIN_POST
    if re.search(r'(^id$|Id$)', name):
        if 'number' in types or 'integer' in types:
            return SAMPLE_NUMBER
        return SAMPLE_KEY if held != SAMPLE_KEY else SAMPLE_KEY + 'b'
    return None, 'names a record no stand-in kind covers'


@lru_cache(maxsize=None)
def _corpus(plugin: str) -> str:
    root = Path(plugin)
    parts = []
    for base in (root / 'includes', root / 'src' / 'blocks'):
        for p in sorted(base.rglob('*.php')) if base.is_dir() else []:
            try:
                parts.append(p.read_text(encoding='utf-8', errors='ignore'))
            except OSError:
                pass
    return '\n'.join(parts)


INT_FUNCS = {'intval', 'absint', 'floatval'}


def list_item_sample(plugin, name: str):
    """One item for a list setting, from how the code reads it: `array_map( 'intval', (array) $a['name'] )` holds
    integers, any other mapper (`sanitize_key`) strings. None when no code reads the items."""
    if plugin is None:
        return None
    m = re.search(r"array_map\(\s*['\"](\w+)['\"]\s*,\s*\(array\)\s*\$\w+\[\s*['\"]" + re.escape(name) + r"['\"]\s*\]", _corpus(str(plugin)))
    if not m:
        return None
    return [2] if m.group(1) in INT_FUNCS else [SAMPLE_KEY]
