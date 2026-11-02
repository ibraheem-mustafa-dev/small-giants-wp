#!/usr/bin/env python3
"""Find saved old-shape (scalar) values of attributes that became per-breakpoint objects.

Catches, in every saved tree, pattern, fixture and writer the header framework batch
touches (.claude/plans/2026-11-02-header-framework-batch.md rule 2):

  sgs/nav-bar-menu  justifyContent  string  -> {"desktop": "<string>"}
  sgs/cart          showZero        bool    -> {"desktop": <bool>}
  sgs/cart          iconSize        number  -> {"desktop": <number>}

A hit is a block of that name whose attribute is a scalar (not an object). Three
readers: JSON trees (walked as data), block-comment markup in PHP/HTML patterns
(`<!-- wp:sgs/cart {...} -->`, JSON parsed), and JS/MJS/PY literals (the attribute
key within the block's own literal, up to the next block name).

Usage:
  python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --check   exit 1 on any hit
  python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --write   rewrite every hit to the object shape
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCOPES = [
    'sites',
    'theme/sgs-theme/parts',
    'theme/sgs-theme/patterns',
    'plugins/sgs-blocks/tests',
    'scripts/computed-route',
]
TARGETS = {
    'sgs/nav-bar-menu': ('justifyContent',),
    'sgs/cart': ('showZero', 'iconSize'),
}
EXTS = ('.json', '.php', '.html', '.mjs', '.js', '.py')
MARKUP_RE = re.compile(r'<!--\s*wp:(sgs/nav-bar-menu|sgs/cart)\s*(\{.*?\})\s*/?-->', re.S)
LITERAL_BLOCK_RE = re.compile(r'''(['"])(sgs/[a-z0-9-]+)\1''')
SCALAR_JSON_RE = r'(["\']?)%s\1(\s*[:=]\s*)(true|false|True|False|-?\d+(?:\.\d+)?|"[^"\n]*"|\'[^\'\n]*\')'


def is_scalar(v):
    return not isinstance(v, (dict, list)) and v is not None


def tracked_files():
    out = subprocess.check_output(['git', 'ls-files', '-z', '--'] + SCOPES, cwd=ROOT).decode('utf8')
    return [f for f in out.split('\0') if f.endswith(EXTS) and '/node_modules/' not in f]


def walk_json(node, hits, fix):
    """Yield-by-mutation: collect (block, attr) for every scalar target; rewrite when fix."""
    if isinstance(node, dict):
        name = node.get('name', node.get('blockName'))
        if isinstance(name, str) and name in TARGETS:
            for bag_key in ('attributes', 'attrs', 'props'):
                bag = node.get(bag_key)
                if isinstance(bag, dict):
                    for attr in TARGETS[name]:
                        if attr in bag and is_scalar(bag[attr]):
                            hits.append((name, attr, bag[attr]))
                            if fix:
                                bag[attr] = {'desktop': bag[attr]}
        for v in node.values():
            walk_json(v, hits, fix)
    elif isinstance(node, list):
        for v in node:
            walk_json(v, hits, fix)


def scan_file(rel, fix):
    path = ROOT / rel
    try:
        text = path.read_bytes().decode('utf8')
    except (UnicodeDecodeError, OSError):
        return []
    if 'sgs/nav-bar-menu' not in text and 'sgs/cart' not in text:
        return []
    hits = []
    new_text = text
    if rel.endswith('.json'):
        try:
            data = json.loads(text)
        except ValueError:
            data = None
        if data is not None:
            walk_json(data, hits, False)
            if not hits:
                return []
            if not fix:
                return [(rel, *h) for h in hits]
            hits = []  # rewritten by the text pass below, which keeps formatting and line endings
    # Block-comment markup.
    def markup_sub(m):
        name = m.group(1)
        try:
            attrs = json.loads(m.group(2))
        except ValueError:
            return m.group(0)
        changed = False
        for attr in TARGETS[name]:
            if attr in attrs and is_scalar(attrs[attr]):
                hits.append((name, attr, attrs[attr]))
                attrs[attr] = {'desktop': attrs[attr]}
                changed = True
        if not changed:
            return m.group(0)
        return m.group(0).replace(m.group(2), json.dumps(attrs, separators=(',', ':'), ensure_ascii=False))
    new_text = MARKUP_RE.sub(markup_sub, new_text)
    # Literals in JS/MJS/PY/PHP: attribute key between a block-name literal and the next block-name literal.
    marks = [(m.start(), m.group(2)) for m in LITERAL_BLOCK_RE.finditer(new_text)]
    edits = []
    for i, (pos, name) in enumerate(marks):
        if name not in TARGETS:
            continue
        end = marks[i + 1][0] if i + 1 < len(marks) else len(new_text)
        region = new_text[pos:end]
        for attr in TARGETS[name]:
            for m in re.finditer(SCALAR_JSON_RE % re.escape(attr), region):
                edits.append((pos + m.start(3), pos + m.end(3), name, attr, m.group(3)))
    for start, end, name, attr, raw in sorted(edits, reverse=True):
        hits.append((name, attr, raw))
        new_text = new_text[:start] + '{"desktop":' + raw + '}' + new_text[end:]
    if fix and new_text != text:
        path.write_bytes(new_text.encode('utf8'))
    return [(rel, *h) for h in hits]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    fix = '--write' == mode
    all_hits = []
    for rel in tracked_files():
        all_hits.extend(scan_file(rel, fix))
    for rel, name, attr, val in all_hits:
        print(f"{'rewrote' if fix else 'HIT'}: {rel}: {name}.{attr} = {val!r}")
    print(f"{len(all_hits)} scalar value(s) {'rewritten' if fix else 'found'}")
    return 1 if (all_hits and not fix) else 0


if __name__ == '__main__':
    sys.exit(main())
