"""Rules for attributes that moved from one scalar to a {desktop, tablet, mobile} object.

Shared by migrate-scalar-tier.py (block.json side) and find-scalar-tier-attrs.py (saved content). Nothing here lists
blocks or attributes: rules come from each block.json plus the framework DB (FP-1), and the families that are still
being migrated come from scripts/data/scalar-tier-families.json.

  object rule   a block.json attribute of type object that is a tier object (DB tier_shape = tier_object) or matches a
                family pattern: a saved SCALAR value of it is an old-shape defect and is rewritten to {"desktop": value}.
  pending       a block.json attribute that matches a family pattern and is still a scalar: the migration target list.
  box-string    a per-device box attribute (data/box-string-rules.json, derived from the framework DB) saved with a string
                or number where the renderer needs {top, right, bottom, left}; box_string_issues() finds it, expand_box()
                converts only what is certain and refuses the rest.
"""
import json
import os
import re
import sqlite3
from pathlib import Path

from framework_db import framework_db_path  # sibling in lib/, which every importer has on sys.path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BLOCKS_DIR = ROOT / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
FAMILIES_FILE = HERE.parent / 'data' / 'scalar-tier-families.json'
DB_PATH = framework_db_path()
SCALAR_TYPES = ('string', 'boolean', 'number', 'integer')
BOX_RULES_FILE = HERE.parent / 'data' / 'box-string-rules.json'
TIER_KEYS = ('desktop', 'tablet', 'mobile')
SIDE_KEYS = ('top', 'right', 'bottom', 'left')

# The refusal flip: False = the box-string rule only reports. Changed to True in the final commit, after every target's
# sweep reports zero. SGS_BOX_STRING_RULE=report (or build-deploy.py --box-string-report-only) downgrades it back.
BOX_STRING_ENFORCED = False


def load_families(path=FAMILIES_FILE):
    data = json.loads(Path(path).read_text(encoding='utf8'))
    return [(f['id'], re.compile(f['match'])) for f in data['families']], data.get('valueConversions', {}), set(data.get('migrated', []))


def family_of(attr, families):
    for fid, rx in families:
        if rx.search(attr):
            return fid
    return None


def tier_object_attrs_from_db(db_path=DB_PATH):
    """{(block, attr)} the framework DB records as tier objects. Empty when the DB is absent (reported by the caller)."""
    if not Path(db_path).exists():
        return None
    con = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    try:
        return {(b, a) for b, a in con.execute(
            "SELECT block_slug, attr_name FROM block_attributes WHERE tier_shape = 'tier_object'")}
    finally:
        con.close()


def read_blocks(blocks_dir=BLOCKS_DIR):
    """{block name: (block.json path, attributes dict)}."""
    out = {}
    for f in sorted(Path(blocks_dir).glob('*/block.json')):
        d = json.loads(f.read_text(encoding='utf8'))
        if isinstance(d.get('name'), str):
            out[d['name']] = (f, d.get('attributes', {}) or {})
    return out


def derive(blocks_dir=BLOCKS_DIR, families_file=FAMILIES_FILE, db_path=DB_PATH):
    """Return (object_rules, pending, conversions).

    object_rules {block: {attr: default}}  attribute is object-typed and a tier object or a family member
    pending      [(block, attr, family, type, default)]  family member still a scalar
    """
    families, conversions, migrated = load_families(families_file)
    object_rules, pending = {}, []
    for name, (_f, attrs) in read_blocks(blocks_dir).items():
        for attr, spec in attrs.items():
            if not isinstance(spec, dict):
                continue
            fam = family_of(attr, families)
            typ = spec.get('type')
            if typ == 'object':
                if fam or f'{name}.{attr}' in migrated:
                    object_rules.setdefault(name, {})[attr] = spec.get('default')
            elif fam and (typ in SCALAR_TYPES or typ is None):
                pending.append((name, attr, fam, typ, spec.get('default')))
    return object_rules, pending, conversions


def is_scalar(v):
    return not isinstance(v, (dict, list)) and v is not None


def convert(block, attr, value, conversions):
    """The object shape of an old scalar: {"desktop": value}; "" is unset and becomes {}; a per-attribute conversion
    table entry wins (gallery layout: grid is the default {})."""
    table = conversions.get(f'{block}.{attr}')
    if table is not None and isinstance(value, str) and value in table:
        return table[value]
    if value == '':
        return {}
    return {'desktop': value}


def rewrite_members(json_text, wanted, conv):
    """Text-level rewrite of top-level members of one JSON object string.

    `wanted` is a set of attribute names; `conv(attr, value)` returns the replacement value or None to leave it. Only the
    scalar value of a wanted top-level key is replaced; every other byte stays as stored. Returns (new_text, [(attr, old)]).
    """
    n, depth, i, hits, out, last = len(json_text), 0, 0, [], [], 0
    while i < n:
        ch = json_text[i]
        if ch in '{[':
            depth += 1
        elif ch in '}]':
            depth -= 1
        elif ch == '"':
            start = i
            i += 1
            while i < n and json_text[i] != '"':
                i += 2 if json_text[i] == '\\' else 1
            literal = json_text[start:i + 1]
            if depth == 1 and literal.startswith('"') and literal[1:-1] in wanted:
                j = i + 1
                while j < n and json_text[j].isspace():
                    j += 1
                if j < n and json_text[j] == ':':
                    j += 1
                    while j < n and json_text[j].isspace():
                        j += 1
                    k = j
                    if k < n and json_text[k] == '"':
                        k += 1
                        while k < n and json_text[k] != '"':
                            k += 2 if json_text[k] == '\\' else 1
                        k += 1
                    else:
                        while k < n and json_text[k] not in ',}] \t\r\n':
                            k += 1
                    raw = json_text[j:k]
                    try:
                        old = json.loads(raw)
                    except ValueError:
                        old = None
                    if raw and raw[0] not in '{[' and is_scalar(old):
                        new = conv(literal[1:-1], old)
                        if new is not None:
                            out.append(json_text[last:j])
                            out.append(json.dumps(new, separators=(',', ':'), ensure_ascii=False))
                            last = k
                            hits.append((literal[1:-1], old))
                    if raw and raw[0] not in '{[':
                        i = k - 1
        i += 1
    out.append(json_text[last:])
    return ''.join(out), hits


# ---------------------------------------------------------------- box-string rule
def box_string_enforced():
    """True when a box-string defect must refuse (flip constant on, kill switch off)."""
    return BOX_STRING_ENFORCED and os.environ.get('SGS_BOX_STRING_RULE', '') != 'report'


def load_box_rules(path=BOX_RULES_FILE):
    d = json.loads(Path(path).read_text(encoding='utf8'))
    return set(d.get('include', {})), set(d.get('exclude', {}))


def _db_box_rows(db_path):
    con = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    try:
        return list(con.execute(
            "SELECT block_slug, attr_name, tier_shape FROM block_attributes WHERE tier_shape = 'box_only' "
            "OR (tier_shape = 'tier_object' AND box_family IS NOT NULL)"))
    finally:
        con.close()


def unclassified_box_names(db_path=DB_PATH, rules_file=BOX_RULES_FILE):
    """Attribute names of box rows (DB box_only, or tier_object with a box_family) that the rules file neither
    includes nor excludes. None when the DB is absent."""
    if not Path(db_path).exists():
        return None
    inc, exc = load_box_rules(rules_file)
    return sorted({a for _b, a, _t in _db_box_rows(db_path)} - inc - exc)


def box_attrs_from_db(db_path=DB_PATH, blocks_dir=BLOCKS_DIR, rules_file=BOX_RULES_FILE):
    """{block: {attr: 'tiered' | 'box'}} for the included box attributes (read-only, FP-1). 'tiered' = a tier of boxes
    (DB tier_object, or a block.json default with device keys); 'box' = one box. An attribute block.json declares with a
    non-object type is skipped. None when the DB is absent."""
    if not Path(db_path).exists():
        return None
    inc, _exc = load_box_rules(rules_file)
    blocks = read_blocks(blocks_dir)
    out = {}
    for block, attr, shape in _db_box_rows(db_path):
        if attr not in inc:
            continue
        spec = blocks.get(block, (None, {}))[1].get(attr)
        if isinstance(spec, dict) and spec.get('type') not in ('object', None):
            continue
        default = spec.get('default') if isinstance(spec, dict) else None
        tiered = shape == 'tier_object' or (isinstance(default, dict) and any(k in default for k in TIER_KEYS))
        out.setdefault(block, {})[attr] = 'tiered' if tiered else 'box'
    return out


def box_string_issues(value):
    """[(tier, raw)] for each defect in a saved box attribute value; tier is None when the whole value is wrong.
    A tier or box may be empty (unset). Both a tier of boxes and one box are accepted for every included attribute."""
    if value is None or isinstance(value, list):
        return []
    if not isinstance(value, dict):
        return [(None, value)]
    if any(k in value for k in TIER_KEYS):
        out = []
        for t in TIER_KEYS:
            v = value.get(t)
            if v is None or isinstance(v, list):
                continue
            if isinstance(v, dict):
                if v and not any(k in v for k in SIDE_KEYS):
                    out.append((t, v))
            else:
                out.append((t, v))
        return out
    if value and not any(k in value for k in SIDE_KEYS):
        return [(None, value)]
    return []


_UNIT = r'(?:px|rem|em|vw|vh|vmin|vmax|svh|dvh|lvh|svw|dvw|ch|ex|pt|cm|mm|in)'
_LEN_RX = re.compile(r'^-?(?:\d+\.?\d*|\.\d+)' + _UNIT + r'$')
_PCT_RX = re.compile(r'^-?(?:\d+\.?\d*|\.\d+)%$')
_ZERO_RX = re.compile(r'^-?0*\.?0+$')
_PRESET_RX = re.compile(r'^var:preset\|spacing\|[a-z0-9-]+$')


def _split_tokens(text):
    """Whitespace split at parenthesis depth 0; None when the parentheses do not balance."""
    out, cur, depth = [], '', 0
    for ch in text.strip():
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth < 0:
                return None
        if ch.isspace() and depth == 0:
            if cur:
                out.append(cur)
            cur = ''
        else:
            cur += ch
    if depth != 0:
        return None
    if cur:
        out.append(cur)
    return out


def _is_length_token(tok, allow_percent):
    if _ZERO_RX.match(tok) or _LEN_RX.match(tok) or _PRESET_RX.match(tok):
        return True
    if _PCT_RX.match(tok):
        return allow_percent
    return tok.startswith('var(') and tok.endswith(')') and _split_tokens(tok) == [tok]


def expand_box(value):
    """The four-side box for one old value, or None when it is not certain. '' is unset ({}). One token gives four
    equal sides; 2, 3 and 4 tokens follow the CSS shorthand order (a b: top and bottom a, right and left b; a b c:
    right and left b, bottom c)."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return {s: '0' for s in SIDE_KEYS} if value == 0 else None
    if not isinstance(value, str):
        return None
    toks = _split_tokens(value)
    if toks is None:
        return None
    if not toks:
        return {}
    if len(toks) > 4 or not all(_is_length_token(t, len(toks) == 1) for t in toks):
        return None
    top = toks[0]
    right = toks[1] if len(toks) > 1 else top
    bottom = toks[2] if len(toks) > 2 else top
    left = toks[3] if len(toks) > 3 else right
    return {'top': top, 'right': right, 'bottom': bottom, 'left': left}


def convert_box(shape, value):
    """(new_value, refused) for one saved box attribute. `refused` is [(tier, raw)] left as stored: a value that is not
    certain is never guessed. A whole-value scalar becomes one box, or {"desktop": box} for a 'tiered' attribute."""
    issues = box_string_issues(value)
    if not issues:
        return value, []
    if issues[0][0] is None:
        box = expand_box(value)
        if box is None:
            return value, [(None, value)]
        return ({'desktop': box} if shape == 'tiered' else box), []
    new, refused = dict(value), []
    for tier, raw in issues:
        box = expand_box(raw)
        if box is None:
            refused.append((tier, raw))
        else:
            new[tier] = box
    return new, refused


def member_spans(json_text, wanted):
    """[(attr, value_start, value_end)] of the wanted top-level members of one JSON object string, any value type."""
    dec = json.JSONDecoder()
    n, i, spans = len(json_text), 0, []
    while i < n and json_text[i] != '{':
        i += 1
    i += 1
    while i < n:
        while i < n and json_text[i] in ' \t\r\n,':
            i += 1
        if i >= n or json_text[i] == '}':
            break
        try:
            key, i = dec.raw_decode(json_text, i)
            while json_text[i] in ' \t\r\n':
                i += 1
            i += 1
            while json_text[i] in ' \t\r\n':
                i += 1
            _val, end = dec.raw_decode(json_text, i)
        except (ValueError, IndexError):
            break
        if key in wanted:
            spans.append((key, i, end))
        i = end
    return spans
