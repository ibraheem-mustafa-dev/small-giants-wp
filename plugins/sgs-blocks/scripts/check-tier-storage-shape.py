#!/usr/bin/env python3
"""Find per-device attribute families that are HALF-MIGRATED between storage shapes.

WHY THIS EXISTS
---------------
A per-device setting is stored one of two ways:

  FLAT    base scalar + `<base>Tablet` / `<base>Mobile` siblings   (e.g. gap/gapTablet/gapMobile)
  OBJECT  one attr holding every tier inside its value             (e.g. gap: {desktop, tablet, mobile})

The Spec 35 migration (D549/D554) moves 160 families across 41 blocks from the first
to the second, ONE PROPERTY AT A TIME. During that migration both shapes are legitimate
— flat is *conforming* for an un-migrated block, object for a migrated one. What is
never legitimate is a family stopping halfway: a base retyped to `object` while its
scalar tier siblings are left declared behind it.

That half state is invisible and it is not theoretical. Measured 2026-08-10, three
families are in it right now on `main`:

    sgs/site-header-row  gap                  (object base, gapTablet/gapMobile still string)
    sgs/site-footer-row  gap                  (same)
    sgs/site-footer-row  gridTemplateColumns  (same)

The orphaned siblings are declared, editable in principle, and read by nothing — a
control that writes to a value no renderer consumes. They are exactly the residue this
gate exists to make loud.

THE RULE — and why it keys on `block.json` `type` and nothing else
------------------------------------------------------------------
A family is BLENDED when its base attr is declared `"type": "object"` AND at least one
`Tablet`/`Mobile` sibling is declared with a NON-object type.

⛔ Do NOT key on `'responsive_model' => 'object'` (class-sgs-container-wrapper.php).
That flag is block-level and all-or-nothing: `sgs/gallery` opts in at render.php:658
and is nonetheless mixed today (4 of its 8 families are still flat). A gate reading it
would call those 4 violations on day one. `block.json` is what WordPress itself
enforces at runtime, needs no DB reseed, and is the file the migration codemod edits —
so gate and codemod read one truth.

⛔ Do NOT flag "object base WITH siblings" on its own. That over-broad rule was drafted
first and measured: it flags 32 families, 29 of them CORRECT. A per-tier ASSET family
(`backgroundImage`/`backgroundImageTablet`/`backgroundImageMobile`, D521) and a per-tier
BOX family (`padding`/`paddingTablet`/`paddingMobile`, D496) are object at EVERY tier —
consistent, deliberate, and not a migration target. Requiring the sibling's type to
DIFFER from the base separates the 3 real findings from the 29 false ones structurally,
with no allowlist and no per-block carve-out.

The object's own key shape is NOT usable as the discriminator either: 265 of 336
object-typed attrs declare `default: {}` and a further 56 declare none, so the keys are
simply absent from the schema for ~96% of them.

`--check` exits 1 on any finding (for prebuild once the backlog is clear).
`--self-test` proves the gate can fail, with a positive AND negative control.

PROMOTION: wired into `prebuild` (package.json line 7) since pass 1 (`gap`, D563)
landed and cleared two baseline entries. Final entry remains (sgs/site-footer-row
gridTemplateColumns → pass 3 trigger): once ZERO, the baseline will be fully empty.
"""

import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

TIER_SUFFIXES = ('Tablet', 'Mobile')

# The known half-migrated families as of 2026-08-10. Present so the gate reports a
# DELTA rather than a raw count while the migration is in flight. Emptied by pass 1.
# ⛔ Shrinks only. An entry leaves this set the moment the gate reports it CLEAR;
# it is never re-added to make a run pass. Pass 1 (`gap`, D563, 2026-08-11)
# cleared both `gap` entries — the two row blocks' flat siblings are gone, so the
# families are no longer blended.
#
# ONE entry remains, and it is the gate's own promotion trigger: pass 3
# (`gridTemplateColumns` + `gridTemplateRows`) takes this to ZERO, at which point
# wire this script into `prebuild`.
BASELINE = {
    ('sgs/site-footer-row', 'gridTemplateColumns'),
}


def attribute_types(block_json: dict) -> dict:
    """Map attr name -> declared type, skipping non-dict entries.

    Several block.json files embed documentation as plain STRING values inside
    `attributes` (`_comment_ssr_nullable` on before-after, `_comment_items_media` on
    card-grid, `_comment_logos_media` on brand-strip). Calling .get() on those raises
    AttributeError, so the skip is load-bearing, not defensive tidiness.
    """
    out = {}
    for name, spec in block_json.get('attributes', {}).items():
        if isinstance(spec, dict):
            out[name] = spec.get('type')
    return out


def blended_families(types: dict) -> list:
    """Return [(base, {sibling: type}), ...] for families that are half-migrated."""
    found = []
    for base, base_type in types.items():
        if base_type != 'object':
            continue
        offenders = {}
        for suffix in TIER_SUFFIXES:
            sibling = base + suffix
            if sibling in types and types[sibling] != 'object':
                offenders[sibling] = types[sibling]
        if offenders:
            found.append((base, offenders))
    return found


def scan() -> list:
    findings = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        name = data.get('name')
        if not name:
            continue
        for base, offenders in blended_families(attribute_types(data)):
            findings.append((name, base, offenders))
    return findings


def self_test() -> int:
    """Prove the gate can fail, and prove it is not simply always-firing."""
    positive = {
        'gap': 'object', 'gapTablet': 'string', 'gapMobile': 'string',
    }
    if not blended_families(positive):
        print('POSITIVE control FAILED: an object base with string tier siblings '
              'was not reported as blended.', file=sys.stderr)
        return 1

    # Negative 1 — a fully migrated family: object base, no siblings at all.
    if blended_families({'gap': 'object'}):
        print('NEGATIVE control FAILED: a migrated family (object base, no siblings) '
              'was reported as blended.', file=sys.stderr)
        return 1

    # Negative 2 — a fully un-migrated family: scalar base with scalar siblings.
    if blended_families({'gap': 'string', 'gapTablet': 'string', 'gapMobile': 'string'}):
        print('NEGATIVE control FAILED: an un-migrated flat family was reported as '
              'blended. Flat is CONFORMING before that property is migrated.',
              file=sys.stderr)
        return 1

    # Negative 3 — the 29-family false-positive class this gate was redesigned to
    # exclude: a per-tier ASSET/BOX family that is object at every tier.
    if blended_families({
        'backgroundImage': 'object',
        'backgroundImageTablet': 'object',
        'backgroundImageMobile': 'object',
    }):
        print('NEGATIVE control FAILED: a consistent per-tier object family (D521 '
              'asset / D496 box) was reported as blended.', file=sys.stderr)
        return 1

    # Crash guard — documentation strings living inside `attributes`.
    try:
        attribute_types({'attributes': {'_comment_note': 'a plain string', 'gap': {'type': 'object'}}})
    except AttributeError:
        print('CRASH-GUARD control FAILED: a non-dict attributes entry raised.',
              file=sys.stderr)
        return 1

    print('[tier-storage-shape --self-test] OK - positive, 3 negative, and crash-guard '
          'controls all behaved as expected.')
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if '--self-test' in argv:
        return self_test()

    check = '--check' in argv
    findings = scan()

    if not findings:
        print('[tier-storage-shape] OK - no per-device family is half-migrated.')
        return 0

    current = {(block, base) for block, base, _ in findings}
    new = current - BASELINE
    cleared = BASELINE - current

    print(f'[tier-storage-shape] {len(findings)} half-migrated family(ies):\n')
    for block, base, offenders in findings:
        mark = ' [NEW]' if (block, base) in new else ''
        detail = ', '.join(f'{s} (type:{t})' for s, t in sorted(offenders.items()))
        print(f'  {block} -> "{base}" is type:"object" but still declares {detail}{mark}')

    print('\nA blended family means the base was retyped to object while its scalar tier '
          '\nsiblings were left declared. Those siblings are read by nothing. Either finish '
          '\nthe migration for this property or revert the base to a scalar.')

    if cleared:
        print(f'\n{len(cleared)} baselined family(ies) now CLEAR - remove from BASELINE: '
              + ', '.join(f'{b}.{a}' for b, a in sorted(cleared)))

    if check:
        if new:
            print(f'\n--check: FAIL - {len(new)} finding(s) beyond the known backlog.')
            return 1
        print(f'\n--check: {len(findings)} finding(s), all baselined. '
              'Promotion trigger: wire into prebuild once this reaches 0.')
        return 0
    return 0


if __name__ == '__main__':
    sys.exit(main())
