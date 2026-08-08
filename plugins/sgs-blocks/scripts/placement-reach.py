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
  4. CLUSTER MEMBER suffixes — `{prefix}{Suffix}` for every member of every cluster
     the element declares, per scripts/consistency/cluster-member-sets.json
  5. default convention `{prefix}{Suffix}`, longest prefix first
  6. responsive/unit/hover suffix family: `{base}Tablet` belongs wherever `{base}`
     does — including where `{base}` is a member satisfied NATIVELY and therefore
     never appears as a declared attribute of its own (`padding` -> `paddingTablet`)

⚠ Step 6 is load-bearing and was MISSING from the first draft, which reported 60.7%
block-level. Ignoring the suffix family misattributes 186 tier attributes as
unplaced. A resolver that skips it overstates the gap by ~7 points.

⚠ Step 4 is TIER 2 of the placement model (Bean, 2026-08-09: "tier 1 is per element
and then tier 2 is per property-family"). It was missing until 2026-08-09, which is
why declared Fill members such as `backgroundPosition` / `objectFit` were reported as
unplaced even though the element declared the `fill` cluster that owns them. Members
carrying `appliesToLayers` are honoured, matching the conformance checker — an
un-layered element is never asked about arrangement members.
"""
import argparse
import glob
import json
import os
import sys

SUFFIX_FAMILY = ('Tablet', 'Mobile', 'Desktop', 'Unit', 'Hover')

_CLUSTER_SETS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'consistency', 'cluster-member-sets.json')


def _load_clusters(path=None):
    """The tier-2 property-family definitions. Same file the conformance checker reads."""
    with open(path or _CLUSTER_SETS_PATH, encoding='utf-8') as handle:
        return json.load(handle).get('clusters') or {}


def _lcfirst(value):
    return value[:1].lower() + value[1:] if value else value


def cluster_member_names(element, clusters):
    """Every attribute name this element's declared clusters would own.

    Returned whether or not the block declares such an attribute: a member
    satisfied via `nativeSupportsPath` owns no attribute of its own, but its
    responsive siblings (`paddingTablet`) still belong to this element.
    """
    prefix = element.get('prefix') or ''
    layer = element.get('layer')
    names = set()
    for cluster_name in (element.get('clusters') or []):
        for member in (clusters.get(cluster_name, {}).get('members') or []):
            applies = member.get('appliesToLayers')
            if applies and layer not in applies:
                continue
            for suffix in (member.get('suffixes') or []):
                names.add(_lcfirst(prefix + suffix) if prefix else _lcfirst(suffix))
    return names


def _base_of(attr):
    """`paddingTablet` -> `padding`; None when the name carries no family suffix."""
    for suffix in SUFFIX_FAMILY:
        if attr.endswith(suffix) and len(attr) > len(suffix):
            return attr[: -len(suffix)]
    return None


def resolve_block(block_json, clusters=None):
    """Return (element_scoped, block_level) attribute-name lists for one block."""
    elements = (block_json.get('supports', {}).get('sgs', {}).get('elements') or {})
    attrs = [a for a in (block_json.get('attributes') or {}) if not a.startswith('_')]
    if not elements or not attrs:
        return [], attrs

    if clusters is None:
        clusters = _load_clusters()

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

    # TIER 2 — cluster members. Longest prefix first so a prefixed element wins the
    # name over the bare wrapper, whose empty prefix would otherwise claim everything.
    for key, element in sorted(elements.items(), key=lambda kv: -len(kv[1].get('prefix') or '')):
        for name in cluster_member_names(element, clusters):
            claimed.setdefault(name, key)

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

    # A member satisfied NATIVELY owns no attribute of its own, so `claimed` never
    # holds its base name from the block's own attribute list. Its responsive
    # siblings still belong to the element that declares the member.
    return [a for a in attrs if a in claimed], [a for a in attrs if a not in claimed]


def _self_test():
    """The suffix-family and cluster-member steps silently change the headline figure."""
    clusters = _load_clusters()

    block = {
        'supports': {'sgs': {'elements': {'headline': {'attrMap': {'css:font-size': 'headlineFontSize'}}}}},
        'attributes': {'headlineFontSize': {}, 'headlineFontSizeTablet': {}, 'unrelatedThing': {}},
    }
    scoped, block_level = resolve_block(block, clusters)
    assert 'headlineFontSize' in scoped, 'attrMap resolution broken'
    assert 'headlineFontSizeTablet' in scoped, 'suffix-family step broken (the 60.7% bug)'
    assert block_level == ['unrelatedThing'], 'block-level fall-through broken: %r' % block_level

    no_manifest = {'attributes': {'foo': {}}}
    assert resolve_block(no_manifest, clusters) == ([], ['foo']), \
        'a block with no manifest must fall through entirely'

    # TIER 2 — a declared cluster owns its members by suffix, with no attrMap entry.
    tier2 = {
        'supports': {'sgs': {'elements': {
            'wrapper': {'isWrapper': True, 'layer': 'OUTER', 'clusters': ['fill']},
        }}},
        'attributes': {'backgroundPosition': {}, 'backgroundPositionMobile': {}, 'notAMember': {}},
    }
    scoped, block_level = resolve_block(tier2, clusters)
    assert 'backgroundPosition' in scoped, 'cluster-member step broken (tier 2)'
    assert 'backgroundPositionMobile' in scoped, 'tier sibling of a cluster member broken'
    assert block_level == ['notAMember'], 'tier 2 over-claimed: %r' % block_level

    # NEGATIVE CONTROL — the same block with the cluster UNdeclared must fall through,
    # or the step is passing for some other reason and the assertions above are vacuous.
    tier2_undeclared = json.loads(json.dumps(tier2))
    tier2_undeclared['supports']['sgs']['elements']['wrapper']['clusters'] = []
    _, block_level = resolve_block(tier2_undeclared, clusters)
    assert 'backgroundPosition' in block_level, \
        'negative control failed — tier 2 resolves without a declared cluster, so it proves nothing'

    # `appliesToLayers` must gate: an un-layered element is never asked about
    # arrangement members (the 60-false-gaps bug in the conformance checker).
    # The fixture must give the cluster step the ONLY route to the attribute: a bare
    # member name that the `{prefix}{Suffix}` convention cannot also reach. A first
    # draft used prefix `tile` + `tileGridTemplateColumns`, which step 5 claimed via
    # the prefix — so the gate was never exercised and the test proved nothing.
    unlayered = {
        'supports': {'sgs': {'elements': {'wrapper': {'clusters': ['layout']}}}},
        'attributes': {'padding': {}, 'gridTemplateColumns': {}},
    }
    scoped, block_level = resolve_block(unlayered, clusters)
    assert 'padding' in scoped, 'box members must apply to every element regardless of layer'
    assert block_level == ['gridTemplateColumns'], \
        'appliesToLayers gate broken — an un-layered element claimed an arrangement member'

    layered = json.loads(json.dumps(unlayered))
    layered['supports']['sgs']['elements']['wrapper']['layer'] = 'GRID'
    scoped, block_level = resolve_block(layered, clusters)
    assert 'gridTemplateColumns' in scoped, \
        'appliesToLayers positive control failed — a GRID element must claim arrangement members'

    print('self-test: PASS (attrMap, suffix family, fall-through, no-manifest, '
          'tier-2 members + negative control, appliesToLayers gate)')
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
