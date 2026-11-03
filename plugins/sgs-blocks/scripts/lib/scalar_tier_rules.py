"""Rules for attributes that moved from one scalar to a {desktop, tablet, mobile} object.

Shared by migrate-scalar-tier.py (block.json side) and find-scalar-tier-attrs.py (saved content). Nothing here lists
blocks or attributes: rules come from each block.json plus the framework DB (FP-1), and the families that are still
being migrated come from scripts/data/scalar-tier-families.json.

  object rule   a block.json attribute of type object that is a tier object (DB tier_shape = tier_object) or matches a
                family pattern: a saved SCALAR value of it is an old-shape defect and is rewritten to {"desktop": value}.
  pending       a block.json attribute that matches a family pattern and is still a scalar: the migration target list.
"""
import json
import os
import re
import sqlite3
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BLOCKS_DIR = ROOT / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
FAMILIES_FILE = HERE.parent / 'data' / 'scalar-tier-families.json'
DB_PATH = Path(os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db'))
SCALAR_TYPES = ('string', 'boolean', 'number', 'integer')


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
