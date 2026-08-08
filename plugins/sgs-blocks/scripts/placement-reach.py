#!/usr/bin/env python3
"""placement-reach.py — how far does THE PLACEMENT RULE actually reach?

Spec 35 §"THE PLACEMENT RULE" says: one panel per element, holding that element's
content, styling and hover together. Everything that scopes to NO element takes a
block-level panel instead.

This script implements that rule against real `block.json` data and reports the
SPLIT: how many declared attributes resolve to an element panel, and how many fall
through to the block-level panel.

WHY IT EXISTS AS A COMMITTED ARTEFACT: the 46%/54% split was first produced by an
ephemeral one-off script, and a handoff QC reviewer correctly flagged the figure as
stated-but-unbacked — a number nobody else can re-derive is not a measurement. Run
this instead of quoting the number.

    python plugins/sgs-blocks/scripts/placement-reach.py
    python plugins/sgs-blocks/scripts/placement-reach.py --block hero
    python plugins/sgs-blocks/scripts/placement-reach.py --self-test

RESOLUTION ORDER — mirrors the contract + check-element-manifest-conformance.js:
  1. explicit `attrMap` entry (a `native:` value is WordPress's, not the element's)
  2. `states.*.attrMap` (hover / selected)
  3. `contentAttrs` (declared by ZERO blocks today — the content half of the model)
  4. default convention `{prefix}{Suffix}`, longest prefix first
  5. responsive/unit/hover suffix family: `{base}Tablet` belongs wherever `{base}` does

⚠ Step 5 is load-bearing and was MISSING from the first draft, which reported 60.7%
block-level. Ignoring the suffix family misattributes 186 tier attributes as
unplaced. A resolver that skips it overstates the gap by ~7 points.
"""
import argparse
import glob
import json
import os
import sys

SUFFIX_FAMILY = ('Tablet', 'Mobile', 'Desktop', 'Unit', 'Hover')


def _base_of(attr):
    """`paddingTablet` -> `padding`; None when the name carries no family suffix."""
    for suffix in SUFFIX_FAMILY:
        if attr.endswith(suffix) and len(attr) > len(suffix):
            return attr[: -len(suffix)]
    return None


def resolve_block(block_json):
    """Return (element_scoped, block_level) attribute-name lists for one block."""
    elements = (block_json.get('supports', {}).get('sgs', {}).get('elements') or {})
    attrs = [a for a in (block_json.get('attributes') or {}) if not a.startswith('_')]
    if not elements or not attrs:
        return [], attrs

    claimed = {}
    for key, element in elements.items():
        for _, attr in (element.get('attrMap') or {}).items():
            if isinstance(attr, str) and not attr.startswith('native:'):
                claimed.setdefault(attr, key)
        for _, state in (element.get('states') or {}).items():
            for _, attr in (state.get('attrMap') or {}).items():
                if isinstance(attr, str) and not attr.startswith('native:'):
                    claimed.setdefault(attr, key)
        for attr in (element.get('contentAttrs') or []):
            claimed.setdefault(attr, key)

    prefixes = {k: (v.get('prefix') or k) for k, v in elements.items()}
    for attr in attrs:
        if attr in claimed:
            continue
        for key, prefix in sorted(prefixes.items(), key=lambda kv: -len(kv[1] or '')):
            if prefix and attr.startswith(prefix) and len(attr) > len(prefix) and attr[len(prefix)].isupper():
                claimed[attr] = key
                break

    for attr in attrs:
        if attr in claimed:
            continue
        base = _base_of(attr)
        while base and base not in claimed and _base_of(base):
            base = _base_of(base)
        if base and base in claimed:
            claimed[attr] = claimed[base]

    return [a for a in attrs if a in claimed], [a for a in attrs if a not in claimed]


def _self_test():
    """The suffix-family step is the one that silently changes the headline figure."""
    block = {
        'supports': {'sgs': {'elements': {'headline': {'attrMap': {'css:font-size': 'headlineFontSize'}}}}},
        'attributes': {'headlineFontSize': {}, 'headlineFontSizeTablet': {}, 'unrelatedThing': {}},
    }
    scoped, block_level = resolve_block(block)
    assert 'headlineFontSize' in scoped, 'attrMap resolution broken'
    assert 'headlineFontSizeTablet' in scoped, 'suffix-family step broken (the 60.7% bug)'
    assert block_level == ['unrelatedThing'], 'block-level fall-through broken: %r' % block_level

    no_manifest = {'attributes': {'foo': {}}}
    assert resolve_block(no_manifest) == ([], ['foo']), 'a block with no manifest must fall through entirely'
    print('self-test: PASS (suffix family, attrMap, fall-through, no-manifest)')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--block', help='report one block instead of the whole library')
    parser.add_argument('--self-test', action='store_true', help='prove the resolver can fail')
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'blocks')
    paths = sorted(glob.glob(os.path.join(root, '*', 'block.json')))
    if not paths:
        print('no block.json files found under %s' % root, file=sys.stderr)
        return 1

    files = len(paths)
    declaring = total_attrs = total_scoped = 0
    rows = []
    for path in paths:
        slug = os.path.basename(os.path.dirname(path))
        if args.block and slug != args.block:
            continue
        with open(path, encoding='utf-8') as handle:
            data = json.load(handle)
        if (data.get('supports', {}).get('sgs', {}).get('elements') or {}):
            declaring += 1
        scoped, block_level = resolve_block(data)
        if not scoped and not block_level:
            continue
        total_attrs += len(scoped) + len(block_level)
        total_scoped += len(scoped)
        rows.append((slug, len(scoped), len(block_level)))

    block_level_total = total_attrs - total_scoped
    print('block.json files            : %d' % files)
    print('declaring supports.sgs.elements: %d' % declaring)
    print('declared attributes (non-_)  : %d' % total_attrs)
    if total_attrs:
        print('  -> element panel           : %d (%.1f%%)' % (total_scoped, 100.0 * total_scoped / total_attrs))
        print('  -> BLOCK-LEVEL panel       : %d (%.1f%%)' % (block_level_total, 100.0 * block_level_total / total_attrs))
    print()
    print('most block-level (the panel the rule does not yet design):')
    for slug, scoped, block_level in sorted(rows, key=lambda r: -r[2])[:8]:
        print('  %-22s element=%-4d block-level=%-4d' % (slug, scoped, block_level))
    return 0


if __name__ == '__main__':
    sys.exit(main())
