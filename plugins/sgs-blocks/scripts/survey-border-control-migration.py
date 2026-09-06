#!/usr/bin/env python3
"""Classify every block's border UI against the SgsBorderControl target shape.

CONTEXT -- Task 0 (2026-08-27) built `src/components/SgsBorderControl.js`, a composite
editor control matching WordPress core's native one-row border UI (Width / Style /
Colour), proven working on `sgs/product-card`. This script is the CENSUS half of the
migration that puts it on every block that currently either (a) declares WP-native
`supports.__experimentalBorder` with the full sub-key set, or (b) already hand-rolls
block-private border attrs with some OTHER control shape.

This is a "single-function body swap, large in blast radius" case per
THE-MIGRATION-METHOD.md Step 4's third bullet: `classify()`/`EXCLUDE`/`PAT`/`targets()`/
`rel()`/`unrecognised` are N/A because there is no line-level pattern to match across --
each block's render.php CSS-emission and edit.js control wiring differs. There is
DELIBERATELY no --fix here: the render.php side is real per-block risk (which shared
helper it calls, what selector, what states), not a mechanical rewrite. Fixtures (Step 6)
apply in full to the CLASSIFIER itself.

CATEGORIES (per block.json, not per attr; note NATIVE_PARTIAL is NOT a terminal
category -- radius-only-native is folded into PRIVATE_DONE/PRIVATE_NEEDS_SWAP/ANOMALY
below, since a radius-only native block with full private colour/width/style attrs is
architecturally identical to a fully-private one for this migration's purposes -- the
radius stays native either way, out of scope for SgsBorderControl):
    NATIVE_FULL       -- declares supports.__experimentalBorder with
                         {color,radius,style,width} all true. Full Shape-B target:
                         needs new block-private attrs + SgsBorderControl in edit.js +
                         render.php CSS emission + supports.border removed.
    PRIVATE_DONE       -- already has full private colour+width+style border attrs
                         (whether or not native radius-only support also exists) AND
                         already uses <SgsBorderControl> in edit.js.
    PRIVATE_NEEDS_SWAP -- already has full private colour+width+style border attrs
                         but edit.js does NOT yet mount <SgsBorderControl> (uses some
                         other border UI). Shape-A target -- the bulk of the 63-block
                         scope's "already block-private" half.
    ANOMALY            -- has SOME border-related attrs but not a full colour+width+
                         style set (e.g. whatsapp-cta: radius-only native, no private
                         colour/width/style attrs at all -- no border colour capability
                         exists on that block today) -- flagged for human triage, never
                         auto-classified into Shape A or B.
    NO_BORDER_SUPPORT  -- no border capability at all (native or private). Out of scope.

    python survey-border-control-migration.py --survey
    python survey-border-control-migration.py --survey --json > reports/migrations/border-control-census.json
    python survey-border-control-migration.py --check          # ratcheted-ceiling gate
    python survey-border-control-migration.py --self-test
"""
import argparse
import glob
import json
import os
import re
import sys

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

# Anchor on a repo-unique marker, not CLAUDE.md (plugins/sgs-blocks/ has its own).
def _find_repo_root(start):
    cur = os.path.abspath(start)
    while True:
        if os.path.isfile(os.path.join(cur, '.claude', 'THE-MIGRATION-METHOD.md')):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            raise RuntimeError('repo root not found (.claude/THE-MIGRATION-METHOD.md missing)')
        cur = parent


ROOT = _find_repo_root(os.path.dirname(__file__))
BLOCKS_DIR = os.path.join(ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks')
COMPONENTS_DIR = os.path.join(ROOT, 'plugins', 'sgs-blocks', 'src', 'components')

BORDER_ATTR_RE = re.compile(r'border', re.IGNORECASE)

# A block need not mount <SgsBorderControl> directly in its own edit.js -- it can
# delegate border rendering to an ATOM's own control file (box-shape.control.js ->
# MediaPanelLayout -> MediaBoxShapeControls.js -> SgsBorderControl), three
# composition layers deep. A literal `'SgsBorderControl' in edit_js` text search
# can't see through that chain (confirmed live on sgs/media, 2026-09-02).
#
# This is a small, explicit lookup -- not a general "walk every import" resolver --
# because there is currently exactly ONE atom that delegates border this way. Add a
# new entry here (never a per-block special case) the day a second one appears.
BORDER_DELEGATING_ATOMS = {
    'box-shape': os.path.join(
        COMPONENTS_DIR, 'media', 'controls', 'MediaBoxShapeControls.js'
    ),
}


def _delegated_atom_mounts_sgs_border_control(bj):
    """For each border-delegating atom declared on the block (in any atom-bearing
    list nested under `supports.sgs`, e.g. block.json's `mediaElements[].atoms`),
    check whether that atom's OWN control file mounts <SgsBorderControl>. Returns
    True only when a delegating atom is declared AND its control file confirms
    the mount. Ground truth: sgs/media's `supports.sgs.mediaElements[0].atoms`
    declares "box-shape" -- confirmed 2026-09-02 by reading block.json directly."""
    sgs_supports = ((bj or {}).get('supports') or {}).get('sgs') or {}
    for key, value in sgs_supports.items():
        if not isinstance(value, list):
            continue
        for entry in value:
            if not isinstance(entry, dict):
                continue
            atoms = entry.get('atoms')
            if not isinstance(atoms, list):
                continue
            for atom in atoms:
                control_path = BORDER_DELEGATING_ATOMS.get(atom)
                if control_path and 'SgsBorderControl' in _read(control_path):
                    return True
    return False

# The ratcheted ceiling: current known-open population for each open category, so a
# regression (a new NATIVE_FULL block appearing, or an existing PRIVATE block losing
# its SgsBorderControl mount) fails --check even though this migration cannot finish
# in one pass. Lower this only with a stated reason when a block is genuinely migrated.
CEILING = {
    # 38 -> 37 on 2026-08-30: sgs/accordion migrated to Shape B (block-private
    # borderWidth/borderStyle/borderColour + render.php emission) and moved to
    # PRIVATE_DONE. Lowered because a block was genuinely migrated, which is the
    # one reason this file permits.
    'NATIVE_FULL': 37,
    # 8 -> 0 on 2026-09-02: sgs/media was misclassified as PRIVATE_NEEDS_SWAP -- its
    # border control is mounted via the box-shape atom's own composition chain
    # (box-shape.control.js -> MediaPanelLayout -> MediaBoxShapeControls.js ->
    # SgsBorderControl), which the classifier's flat `edit.js` text search could
    # not see through. It already uses SgsBorderControl; fixing the detector to
    # follow the delegation reclassifies it PRIVATE_DONE. Lowered because the
    # population was already 0, not because a block was migrated -- see D881
    # section "Border controls" in CLAUDE.md for the corrected classification.
    'PRIVATE_NEEDS_SWAP': 0,
    # Measured 2026-08-28, first real run of this classifier: filter-search, label,
    # mega-aside, mega-panel, product-search, social-icons, whatsapp-cta -- each has
    # SOME border-shaped attr (usually radius-only, sometimes radius+colour with no
    # width/style) but not the full colour+width+style set this migration targets.
    # Not the brief's assumed 11th block (mega-panel) alone -- 6 more surfaced by
    # exhaustive enumeration instead of the brief's hand-picked list. Triage, don't
    # guess: each is a genuine "does this block need a FULL border capability added,
    # or is partial-by-design correct?" design question, not an auto-fixable case.
    'ANOMALY': 7,
}


def _load_json(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def _read(path):
    if not os.path.isfile(path):
        return ''
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def classify_block(block_dir):
    """Returns (category, detail_dict) for one block directory."""
    slug = os.path.basename(block_dir)
    bj_path = os.path.join(block_dir, 'block.json')
    if not os.path.isfile(bj_path):
        return None, {}

    try:
        bj = _load_json(bj_path)
    except Exception as exc:  # noqa: BLE001 -- report, never crash a whole census
        return 'UNRECOGNISED', {'error': str(exc)}

    supports = bj.get('supports', {}) or {}
    native_border = supports.get('__experimentalBorder') or {}
    native_keys = sorted(k for k in native_border.keys() if not k.startswith('__'))
    native_full = set(native_keys) == {'color', 'radius', 'style', 'width'}
    native_partial = bool(native_keys) and not native_full

    attrs = bj.get('attributes', {}) or {}
    private_border_attr_names = sorted(
        n for n in attrs.keys() if BORDER_ATTR_RE.search(n)
    )
    has_private_colour = any(
        'olour' in n.lower() and 'order' in n.lower() for n in private_border_attr_names
    )
    has_private_width = 'borderWidth' in attrs
    has_private_style = 'borderStyle' in attrs

    edit_js = _read(os.path.join(block_dir, 'edit.js'))
    uses_sgs_border_control = (
        'SgsBorderControl' in edit_js
        or _delegated_atom_mounts_sgs_border_control(bj)
    )

    detail = {
        'block': slug,
        'native_border_keys': native_keys,
        'private_border_attrs': private_border_attr_names,
        'uses_sgs_border_control': uses_sgs_border_control,
    }

    if native_full:
        return 'NATIVE_FULL', detail

    if native_partial:
        # radius-only native + full private colour/width/style = the settled Shape-A
        # shape (button/container/heading/icon-list/option-picker/process-steps/
        # product-card/quote/text/timeline). Anything with native-partial but missing
        # a private colour/width/style leg is an anomaly (whatsapp-cta: radius-only
        # native, NO private colour/width/style at all -- no border colour capability
        # exists on that block today).
        if has_private_colour and has_private_width and has_private_style:
            if uses_sgs_border_control:
                return 'PRIVATE_DONE', detail
            return 'PRIVATE_NEEDS_SWAP', detail
        return 'ANOMALY', detail

    # No native border support at all.
    if has_private_colour and has_private_width and has_private_style:
        if uses_sgs_border_control:
            return 'PRIVATE_DONE', detail
        return 'PRIVATE_NEEDS_SWAP', detail

    if private_border_attr_names:
        # Some border-shaped attrs exist (e.g. mega-panel: borderColour + borderRadius,
        # no borderWidth/borderStyle at all) but not the full colour+width+style set.
        return 'ANOMALY', detail

    return 'NO_BORDER_SUPPORT', detail


def scan():
    """Wide, dumb enumeration -- every immediate subdirectory of src/blocks with a
    block.json. Corpus-width check per Step 6 #6: derive a second, independent
    enumeration and assert it matches what a hand-picked glob would have found."""
    results = {}
    for entry in sorted(os.listdir(BLOCKS_DIR)):
        block_dir = os.path.join(BLOCKS_DIR, entry)
        if not os.path.isdir(block_dir):
            continue
        cat, detail = classify_block(block_dir)
        if cat is None:
            continue
        results[entry] = {'category': cat, **detail}
    return results


def broad_enumeration():
    """Independent corpus-width control: glob ALL block.json under src/blocks,
    excluding never-source dirs, and confirm the count matches scan()'s directory
    walk. Two lists derived two ways -- the check narrowing a glob cannot satisfy."""
    pattern = os.path.join(BLOCKS_DIR, '*', 'block.json')
    found = glob.glob(pattern)
    return sorted(os.path.basename(os.path.dirname(f)) for f in found)


def crosscheck(results):
    """Whole-corpus preconditions. Returns a list of failure strings (empty = clean)."""
    failures = []

    wide = set(broad_enumeration())
    narrow = set(results.keys())
    if wide != narrow:
        missing_from_narrow = wide - narrow
        extra_in_narrow = narrow - wide
        if missing_from_narrow:
            failures.append(
                'CORPUS WIDTH: glob found blocks the directory walk missed: %s'
                % sorted(missing_from_narrow)
            )
        if extra_in_narrow:
            failures.append(
                'CORPUS WIDTH: directory walk found blocks the glob missed: %s'
                % sorted(extra_in_narrow)
            )

    if len(results) < 70:
        failures.append(
            'SANITY: only %d blocks found -- expected >=70. Scope collapsed.' % len(results)
        )

    unrecognised = [b for b, d in results.items() if d['category'] == 'UNRECOGNISED']
    if unrecognised:
        failures.append('UNRECOGNISED (block.json failed to parse): %s' % unrecognised)

    return failures


def tally(results):
    counts = {}
    for d in results.values():
        counts[d['category']] = counts.get(d['category'], 0) + 1
    return counts


def cmd_survey(as_json):
    results = scan()
    counts = tally(results)
    cross = crosscheck(results)

    if as_json:
        print(json.dumps({
            'counts': counts,
            'crosscheck_failures': cross,
            'blocks': results,
        }, indent=2, sort_keys=True))
        return 0 if not cross else 1

    print('=== SgsBorderControl migration census ===')
    print('Total blocks classified: %d' % len(results))
    print()
    for cat in ('NATIVE_FULL', 'PRIVATE_NEEDS_SWAP', 'PRIVATE_DONE',
                'ANOMALY', 'NO_BORDER_SUPPORT', 'UNRECOGNISED'):
        blocks = sorted(b for b, d in results.items() if d['category'] == cat)
        if not blocks:
            continue
        print('%s (%d):' % (cat, len(blocks)))
        for b in blocks:
            d = results[b]
            extra = ''
            if cat in ('PRIVATE_NEEDS_SWAP', 'ANOMALY') and d['native_border_keys']:
                extra = ' native=%s private=%s' % (
                    d['native_border_keys'], d['private_border_attrs']
                )
            print('  - %s%s' % (b, extra))
        print()

    if cross:
        print('CROSSCHECK FAILURES:')
        for f in cross:
            print('  ! %s' % f)
        return 1
    return 0


def cmd_check():
    results = scan()
    counts = tally(results)
    cross = crosscheck(results)
    if cross:
        print('CHECK FAILED -- crosscheck errors:')
        for f in cross:
            print('  ! %s' % f)
        return 1

    exceeded = []
    for cat, ceiling in CEILING.items():
        actual = counts.get(cat, 0)
        if actual > ceiling:
            exceeded.append('%s: %d exceeds ceiling %d (new instance introduced)' % (
                cat, actual, ceiling
            ))
    # PRIVATE_DONE has no ceiling -- it is the DONE bucket and only grows as blocks
    # migrate off PRIVATE_NEEDS_SWAP / NATIVE_FULL. NO_BORDER_SUPPORT is out of scope.

    if exceeded:
        print('CHECK FAILED -- ratchet exceeded:')
        for e in exceeded:
            print('  ! %s' % e)
        return 1

    print('CHECK OK -- no category exceeds its recorded ceiling.')
    print('Counts: %s' % counts)
    print('(Ceiling is NOT zero -- this migration is a large backlog, not a')
    print(' one-pass codemod. Lower CEILING entries as blocks genuinely migrate.)')
    return 0


def self_test():
    failures = []

    # Fixture 1 (positive): a NATIVE_FULL block classifies correctly.
    # Was `accordion` until 2026-08-30, when accordion became the Shape-B
    # reference and moved to PRIVATE_DONE. Swapped to its own child block, which
    # is still genuinely NATIVE_FULL -- and the pairing documents the deliberate
    # asymmetry: sgs/accordion declared a `style` ATTRIBUTE that shadowed WP's
    # reserved style object (so its native border path was dead code, which is
    # why it was safe to migrate first); sgs/accordion-item never did, so its
    # native path is live and it is a genuine NATIVE_FULL specimen.
    results = scan()
    if 'accordion-item' not in results or results['accordion-item']['category'] != 'NATIVE_FULL':
        failures.append('accordion-item should classify NATIVE_FULL, got %s' % (
            results.get('accordion-item', {}).get('category')
        ))

    # Fixture 1b (the migration's own proof): accordion must now be PRIVATE_DONE.
    # Asserted explicitly so the fixture-1 swap above cannot silently hide a
    # regression -- if the Shape-B migration were reverted, fixture 1 would go
    # green again on accordion-item while THIS one caught it.
    if 'accordion' not in results or results['accordion']['category'] != 'PRIVATE_DONE':
        failures.append('accordion should classify PRIVATE_DONE after the 2026-08-30 '
                        'Shape-B migration, got %s' % (
                            results.get('accordion', {}).get('category')
                        ))

    # Fixture 2 (definition / done): product-card must be PRIVATE_DONE (Task 0 shipped it).
    if 'product-card' not in results or results['product-card']['category'] != 'PRIVATE_DONE':
        failures.append('product-card should classify PRIVATE_DONE, got %s' % (
            results.get('product-card', {}).get('category')
        ))

    # Fixture 3 (edge / radius-only native leg): container has radius-only native
    # support with full private colour/width/style.
    #
    # ⚠ This fixture asserted PRIVATE_NEEDS_SWAP until 2026-08-30 and had been RED
    # since commit e8e7a3bc7 -- container gained its SgsBorderControl mount in the
    # Shape-A rollout, so it became PRIVATE_DONE and the fixture failed BECAUSE THE
    # MIGRATION SUCCEEDED. Same defect class as the FIXABLE_FLOOR=6 guard recorded
    # in D881, in the same script family, caught here rather than by anything the
    # rollout ran. A fixture that encodes a transient in-progress state expires the
    # moment the work lands; the durable assertion is the STRUCTURE (radius-only
    # native + private legs), which is what is checked below and is what actually
    # distinguishes this shape.
    if 'container' not in results or results['container']['category'] != 'PRIVATE_DONE':
        failures.append('container should classify PRIVATE_DONE (radius-only native '
                         '+ private colour/width/style + SgsBorderControl mounted), '
                         'got %s' % (
                             results.get('container', {}).get('category')
                         ))
    else:
        d = results['container']
        if d['native_border_keys'] != ['radius']:
            failures.append('container native_border_keys should be [radius], got %s' % (
                d['native_border_keys']
            ))

    # Fixture 4 (anomaly / negative control on the happy path): whatsapp-cta has
    # radius-only native and NO private colour/width/style -- must be ANOMALY, never
    # silently promoted to NATIVE_PARTIAL's Shape-A bucket.
    if 'whatsapp-cta' not in results or results['whatsapp-cta']['category'] != 'ANOMALY':
        failures.append('whatsapp-cta should classify ANOMALY (no border colour '
                         'capability at all), got %s' % (
                             results.get('whatsapp-cta', {}).get('category')
                         ))

    # Fixture 5 (negative control): a block with genuinely no border support at all.
    if 'icon' not in results or results['icon']['category'] != 'NO_BORDER_SUPPORT':
        failures.append('icon should classify NO_BORDER_SUPPORT, got %s' % (
            results.get('icon', {}).get('category')
        ))

    # Fixture 6 (idempotence): running scan() twice gives identical results.
    results2 = scan()
    if results != results2:
        failures.append('scan() is not idempotent across two runs')

    # Fixture 7 (corpus width control): broad_enumeration() must match scan()'s keys.
    if set(broad_enumeration()) != set(results.keys()):
        failures.append('broad_enumeration() does not match scan() directory walk')

    if failures:
        print('SELF-TEST FAILED (%d):' % len(failures))
        for f in failures:
            print('  ! %s' % f)
        return 1

    print('SELF-TEST OK -- 7 assertions passed.')
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--survey', action='store_true')
    p.add_argument('--json', action='store_true')
    p.add_argument('--check', action='store_true')
    p.add_argument('--self-test', action='store_true')
    args = p.parse_args()

    if args.self_test:
        sys.exit(self_test())
    if args.check:
        sys.exit(cmd_check())
    # default: survey (branched explicitly, per THE-MIGRATION-METHOD.md's own warning
    # that the model it copies from leaves this an implicit fallthrough)
    sys.exit(cmd_survey(as_json=args.json))


if __name__ == '__main__':
    main()
