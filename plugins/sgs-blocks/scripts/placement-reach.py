#!/usr/bin/env python3
"""placement-reach.py — how far does THE PLACEMENT RULE actually reach?

Spec 35 §"THE PLACEMENT RULE" is TWO TIERS (D537, 2026-08-09, Bean-locked). TIER 1: one
panel per element, holding that element's content, styling and hover together. TIER 2:
everything that scopes to NO element resolves to a PROPERTY-FAMILY panel instead
(text/fill/layout/position/motion/animation, per cluster-member-sets.json) — NOT a
single catch-all "block-level panel". A control with no CSS property behind it at all
(variant, templateMode, tagName, layout, autoplay, showDots, required) takes one
Settings panel, pinned first.

This script implements that rule against real `block.json` data and reports the
SPLIT: how many declared attributes resolve to an element panel (tier 1), and how many
fall through to tier-2 property-family resolution.

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

⚠ Step 4 is TIER 2 of the placement model (Bean, 2026-08-08: "tier 1 is per element
and then tier 2 is per property-family"). It was missing until 2026-08-08, which is
why declared Fill members such as `backgroundPosition` / `objectFit` were reported as
unplaced even though the element declared the `fill` cluster that owns them.

⚠ This step READS the same file as check-element-manifest-conformance.js and applies
the same `appliesToLayers` predicate, but it does NOT reproduce that checker exactly.
Two deliberate divergences, neither reached by current block data (both resolvers
return the same 58.6% / hero 61) — do not restate this as "mirrors":
  - the checker treats an explicit `attrMap` entry as authoritative and returns early
    even when it fails to resolve; here the cluster loop can still claim a
    suffix-derived name for the same member;
  - the checker tries a member's `suffixes` IN ORDER and stops at the first match,
    leaving an attribute matching an alternate suffix unclaimed (an ORPHAN candidate);
    here every suffix candidate is claimed.
Flagged by an independent conformance review 2026-08-08. If this script is ever
promoted from diagnostic to gate, close both divergences first.
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
    """The tier-2 property-family definitions. Same file the conformance checker reads.

    FAILS LOUD on an empty set. A file that parses but carries no `clusters` key
    silently disables tier 2, and the script then reports the exact pre-tier-2
    figure (hero: 76) with no error — a measurement that has stopped measuring but
    still looks plausible. Proven 2026-08-08: `resolve_block(hero, {})` returns 76
    against the real 61.
    """
    path = path or _CLUSTER_SETS_PATH
    with open(path, encoding='utf-8') as handle:
        clusters = json.load(handle).get('clusters') or {}
    if not clusters:
        raise ValueError(
            'no cluster definitions in %s — tier-2 resolution would silently no-op '
            'and this script would report the pre-tier-2 figure as if it were current' % path)
    return clusters


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
    scoped, block_level, _, _ = resolve_block_detailed(block_json, clusters)
    return scoped, block_level


def resolve_block_detailed(block_json, clusters=None):
    """As resolve_block, plus {attr: {element, ...}} for attrs two elements can claim,
    plus (4th return value) {attr: owning_element_key} for every CLAIMED attribute —
    the ownership map consumed by inspector-scan's CO-2 grouping rule via `--json`
    below. Exposed as a genuine extra return value (not re-derived) so both callers
    read the SAME resolution the placement split itself is built from — never a
    second, drifting computation of "who owns this attribute"."""
    elements = (block_json.get('supports', {}).get('sgs', {}).get('elements') or {})
    attrs = [a for a in (block_json.get('attributes') or {}) if not a.startswith('_')]
    if not elements or not attrs:
        return [], attrs, {}, {}

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

    # TIER 2 — cluster members.
    # Longest prefix first, so a prefixed element wins a name over the bare wrapper
    # whose empty prefix would otherwise claim everything. Ties break on the declared
    # `order` then the element key — NEVER on dict insertion order.
    #
    # ⚠ The insertion-order fallback was a real defect (found by adversarial review
    # 2026-08-08): two bare-prefix elements declaring the same cluster were separated
    # only by their position in block.json, so REORDERING THE JSON — a content-free
    # change — silently moved controls between panels. 13 blocks were affected;
    # `sgs/nav-menu` had 9 attributes hanging on it. A model that claims to be derived
    # rather than hand-sorted cannot carry a hidden hand-sort.
    #
    # These ties are NOT resolved by a manufactured rule. They are reported: an
    # attribute two elements can both claim means the manifest is underspecified, and
    # the fix is an explicit `attrMap` entry on the element that owns it.
    # An explicit attrMap / states / contentAttrs entry is AUTHORITATIVE — the element
    # has declared it owns that attribute, so another element's cluster merely being
    # able to reach the same name is not ambiguity. Without this, `sgs/container`
    # reported 13 contested when `grid` explicitly maps all but one of them; the true
    # figure there is 1 (`columns`). Library-wide the omission over-reported 25 as 175
    # — a 7x inflation that was quoted as a finding before it was validated against a
    # block whose answer was already known.
    authoritative = set(claimed)

    # An element that EXPLICITLY claims a member key owns that member's whole suffix
    # family. `sgs/container`'s `grid` maps `css:grid-template-columns` to
    # `gridTemplateColumns`; the same member also lists the `Columns` suffix, so the
    # block's separate `columns` attribute is the same member reached by its other
    # name — it belongs to `grid` too, not to whichever element sorts first.
    # This is derived from the explicit declaration, NOT a manufactured tie-break.
    member_owner = {}
    for key, element in elements.items():
        for member_key in (element.get('attrMap') or {}):
            member_owner.setdefault(member_key, key)
    for cluster_name, cluster in clusters.items():
        for member in (cluster.get('members') or []):
            owner = member_owner.get(member.get('key'))
            if not owner:
                continue
            prefix = elements[owner].get('prefix') or ''
            for suffix in (member.get('suffixes') or []):
                name = _lcfirst(prefix + suffix) if prefix else _lcfirst(suffix)
                claimed.setdefault(name, owner)
                authoritative.add(name)

    ordered = sorted(
        elements.items(),
        key=lambda kv: (-len(kv[1].get('prefix') or ''), kv[1].get('order') or 0, kv[0]))
    ambiguous = {}
    for key, element in ordered:
        for name in cluster_member_names(element, clusters):
            if name in claimed and claimed[name] != key and name not in authoritative:
                ambiguous.setdefault(name, {claimed[name]}).add(key)
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
    #
    # Ambiguity is reported only for names the block actually DECLARES — a contested
    # virtual member nothing implements is not a data gap worth anyone's time.
    declared = set(attrs)
    contested = {name: owners for name, owners in ambiguous.items() if name in declared}
    ownership = {a: claimed[a] for a in attrs if a in claimed}
    return ([a for a in attrs if a in claimed],
            [a for a in attrs if a not in claimed],
            contested,
            ownership)


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

    # CONTESTED detection — two bare-prefix elements declaring the same cluster both
    # reach `padding`. Which one wins must never be decided by block.json key order.
    contested_fixture = {
        'supports': {'sgs': {'elements': {
            'wrapper': {'clusters': ['layout'], 'order': 1},
            'band': {'clusters': ['layout'], 'order': 2},
        }}},
        'attributes': {'padding': {}},
    }
    _, _, contested, _ = resolve_block_detailed(contested_fixture, clusters)
    assert 'padding' in contested and contested['padding'] == {'wrapper', 'band'}, \
        'contested detection broken — an ambiguous attribute was resolved in silence: %r' % contested

    # An explicit attrMap claim is authoritative — never reported as contested, even
    # though the other element's cluster can reach the same name.
    declared_owner = json.loads(json.dumps(contested_fixture))
    declared_owner['supports']['sgs']['elements']['band']['attrMap'] = {'css:padding': 'padding'}
    _, _, contested, _ = resolve_block_detailed(declared_owner, clusters)
    assert not contested, \
        'an explicitly mapped attribute was reported contested: %r' % contested

    # NEGATIVE CONTROL — give the second element its own prefix and the tie vanishes.
    uncontested = json.loads(json.dumps(contested_fixture))
    uncontested['supports']['sgs']['elements']['band']['prefix'] = 'band'
    _, _, contested, _ = resolve_block_detailed(uncontested, clusters)
    assert not contested, \
        'negative control failed — contested fires without an actual tie: %r' % contested

    # Order must decide ties, not dict insertion order: reversing the JSON key order
    # must not change which element wins.
    reordered = {
        'supports': {'sgs': {'elements': {
            'band': {'clusters': ['layout'], 'order': 2},
            'wrapper': {'clusters': ['layout'], 'order': 1},
        }}},
        'attributes': {'padding': {}},
    }
    assert resolve_block_detailed(reordered, clusters)[2] == \
        resolve_block_detailed(contested_fixture, clusters)[2], \
        'tie-break depends on block.json key order — the hidden hand-sort is back'

    # The loader must FAIL rather than silently disable tier 2. Without this, a
    # cluster file that parses but carries no `clusters` key makes the script report
    # the pre-tier-2 figure with no error — measuring nothing, plausibly.
    import tempfile
    broken = os.path.join(tempfile.mkdtemp(), 'no-clusters.json')
    with open(broken, 'w', encoding='utf-8') as handle:
        handle.write('{"_meta": {"purpose": "clusters key absent"}}')
    try:
        _load_clusters(broken)
    except ValueError:
        pass
    else:
        raise AssertionError('loader accepted an empty cluster set — tier 2 can no-op in silence')

    print('self-test: PASS (attrMap, suffix family, fall-through, no-manifest, '
          'tier-2 members + negative control, appliesToLayers gate, contested detection '
          '+ negative control + key-order independence, empty-cluster guard)')
    return 0


def _json_main(block_filter=None):
    """--json mode: the ownership map + element metadata + contested list per
    block, consumed by inspector-scan's CO-2 grouping rule
    (rules/41-co2-element-grouping-order.js) via a `spawnSync('python', ...)`
    call — the SAME pattern core/components.js's `getStructuralAttrMap()`
    already uses to reach this DB/manifest data from a Node AST rule, not a
    new mechanism. Additive: does not touch the default text-report path
    above, and does not change resolve_block_detailed()'s existing 3
    positional return values other than appending a 4th.
    """
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'blocks')
    paths = sorted(glob.glob(os.path.join(root, '*', 'block.json')))
    clusters = _load_clusters()
    out = {}
    for path in paths:
        tail = os.path.basename(os.path.dirname(path))
        slug = 'sgs/' + tail
        if block_filter and block_filter not in (slug, tail):
            continue
        with open(path, encoding='utf-8') as handle:
            data = json.load(handle)
        elements_raw = (data.get('supports', {}).get('sgs', {}).get('elements') or {})
        _scoped, block_level, contested, ownership = resolve_block_detailed(data, clusters)
        out[slug] = {
            'elements': {
                key: {
                    'label': el.get('label') or key,
                    'order': el.get('order'),
                    'prefix': el.get('prefix') or '',
                    # isWrapper marks a TIER-2 (property-family) element, not a
                    # TIER-1 single-panel one — Colour/Border/Padding&margin are
                    # DELIBERATELY separate panels for a wrapper (Spec 35 THE
                    # PLACEMENT RULE TIER 2). Consumers must not apply the
                    # TIER-1 "one panel per element" grouping check to it (the
                    # exact false-positive class that got scattered-element-
                    # controls.js deleted 2026-09-02).
                    'isWrapper': bool( el.get( 'isWrapper' ) ),
                }
                for key, el in elements_raw.items()
            },
            'ownership': ownership,
            'blockLevel': block_level,
            'contested': {name: sorted(owners) for name, owners in contested.items()},
        }
    print(json.dumps(out))
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--block', help='report one block instead of the whole library')
    parser.add_argument('--self-test', action='store_true', help='prove the resolver can fail')
    parser.add_argument('--json', action='store_true',
                         help='machine-readable ownership map + element metadata + contested list, '
                              'for inspector-scan/rules/41-co2-element-grouping-order.js')
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    if args.json:
        return _json_main(args.block)

    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'blocks')
    paths = sorted(glob.glob(os.path.join(root, '*', 'block.json')))
    if not paths:
        print('no block.json files found under %s' % root, file=sys.stderr)
        return 1

    files = len(paths)
    declaring = total_attrs = total_scoped = 0
    rows = []
    contested_rows = []
    clusters = _load_clusters()  # once for the run, not once per block
    for path in paths:
        slug = os.path.basename(os.path.dirname(path))
        if args.block and slug != args.block:
            continue
        with open(path, encoding='utf-8') as handle:
            data = json.load(handle)
        if (data.get('supports', {}).get('sgs', {}).get('elements') or {}):
            declaring += 1
        scoped, block_level, contested, _ownership = resolve_block_detailed(data, clusters)
        if not scoped and not block_level:
            continue
        total_attrs += len(scoped) + len(block_level)
        total_scoped += len(scoped)
        rows.append((slug, len(scoped), len(block_level)))
        if contested:
            contested_rows.append((slug, contested))

    block_level_total = total_attrs - total_scoped
    print('block.json files            : %d' % files)
    print('declaring supports.sgs.elements: %d' % declaring)
    print('declared attributes (non-_)  : %d' % total_attrs)
    if total_attrs:
        print('  -> element panel           : %d (%.1f%%)' % (total_scoped, 100.0 * total_scoped / total_attrs))
        print('  -> tier-2 (property-family): %d (%.1f%%)' % (block_level_total, 100.0 * block_level_total / total_attrs))
    print()
    print('most tier-2 (resolved BY PROPERTY-FAMILY, not a catch-all panel):')
    for slug, scoped, block_level in sorted(rows, key=lambda r: -r[2])[:8]:
        print('  %-22s element=%-4d tier-2=%-4d' % (slug, scoped, block_level))

    # CONTESTED — two elements can both claim the attribute, so which panel it lands
    # in is not determined by the manifest. Reported, never silently tie-broken: the
    # fix is an explicit `attrMap` entry on the element that owns it.
    if contested_rows:
        total = sum(len(c) for _, c in contested_rows)
        print()
        print('CONTESTED — %d attribute(s) across %d block(s) claimable by 2+ elements.'
              % (total, len(contested_rows)))
        print('These are manifest gaps, not placements. Add an explicit attrMap entry:')
        for slug, contested in sorted(contested_rows, key=lambda r: -len(r[1]))[:8]:
            names = ', '.join(sorted(contested)[:4])
            more = '' if len(contested) <= 4 else ' (+%d more)' % (len(contested) - 4)
            owners = sorted({o for owners in contested.values() for o in owners})
            print('  %-22s %d: %s%s  [%s]' % (slug, len(contested), names, more, '/'.join(owners)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
