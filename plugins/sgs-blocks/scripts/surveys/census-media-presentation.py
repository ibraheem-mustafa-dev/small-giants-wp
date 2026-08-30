#!/usr/bin/env python3
"""Census extension — the PRESENTATION half of the media-element manifest.

WHY THIS EXISTS
---------------
`reports/migrations/media-element-census.json` (Wave 1, commit 9b67c3885) is
SOURCE-SIDE ONLY. Architecture v2 Sec.17 commissioned it as "per surface: prefix,
context, insertion, mechanism, storedAs map, and escape-hatch flags" and it
delivered exactly that -- the source / type / meaning / behaviour families.

It therefore records NO presentation attributes at all. Verified individually:
`objectFit`, `objectPosition`, `mediaSizing`, `height`, `backgroundOverlayColour`
and `splitMediaObjectFit` are all absent from its `storedAs` blocks.

Media atoms 7-10 (object-fit / focal-point / box-shape / overlay) therefore had
NO manifest. This script produces one, and merges it into the same artefact
under a `presentation` key so there is still exactly one census file.

⛔ THIS IS A GAP ANALYSIS, NOT A WIRING MANIFEST
------------------------------------------------
The nine media surfaces were built one at a time and never standardised against
each other. A name MISSING from a surface is evidence of an accidental gap, not
of a deliberate exclusion, and must never be read as one. So the inventory below
is only half the output: `gaps` is the operative half -- per atom, which surfaces
CAN carry it and which are missing it. The work is the gaps.

An exclusion is legitimate only when the concept genuinely differs. There is
exactly one today: sgs/decorative-image's positionX/positionY place the
decoration absolutely on the page, which is not the position of an object inside
its container. "This surface does not have it today" is never a reason.

WHAT IS MEASURED vs WHAT IS DECLARED
------------------------------------
Mechanical, read from each block.json at run time -- never cached in prose:
    name, type, enum, default, tier suffix.
Declared here, from the 2026-08-30 survey pass (agent anchors in ANCHORS below):
    scope, control, renderer, note.
The split is deliberate. A figure that can rot is re-derived on every run; a
judgement that needed reading a call graph is written down once, with its anchor.

⛔ THREE TRAPS THIS SCRIPT EXISTS TO RECORD. Each one would send a cold branch to
build the wrong thing, and each was found by checking a pattern match back
against its owner rather than trusting the match:

  1. `maxWidth` is NOT a media attribute on hero / container / product-card.
     There it is the WRAPPER's max-width, paired with `contentWidth` and owned by
     SGS_Container_Wrapper's 3-layer model. It IS a media attribute on sgs/media
     and sgs/before-after, which have no `contentWidth` because the block IS the
     media. Same name, two owners.
  2. `imageHeight` means OPPOSITE things on two surfaces. On sgs/media it is
     `integer`, paired with `imageWidth` -- INTRINSIC dimensions written from the
     chosen media (atom 5), not client-edited. On sgs/product-card it is a
     `string` ("180px") driving --sgs-product-card-image-height -- a real
     client-facing box-shape control. A helper keyed on the name alone breaks one.
  3. `positionX` / `positionY` on sgs/decorative-image are ABSOLUTE PLACEMENT
     (where the decoration sits on the section), NOT focal point. They must never
     be folded into atom 8.

Run:
    python scripts/surveys/census-media-presentation.py --survey
    python scripts/surveys/census-media-presentation.py --write
    python scripts/surveys/census-media-presentation.py --self-test
"""

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(os.path.dirname(HERE))  # scripts/surveys/ -> sgs-blocks/
REPO_ROOT = os.path.abspath(os.path.join(PLUGIN_ROOT, '..', '..'))
BLOCKS_DIR = os.path.join(PLUGIN_ROOT, 'src', 'blocks')
CENSUS = os.path.join(REPO_ROOT, 'reports', 'migrations', 'media-element-census.json')

SURFACES = [
    'media',
    'before-after',
    'hero',
    'container',
    'decorative-image',
    'product-card',
]

# Per-surface, per-atom attribute rosters. EXPLICIT, not pattern-matched.
# A regex sweep was tried first and was wrong in both directions -- it caught
# boxShadow/opacity/alignment (v2 atoms, not 7-10), missed splitMediaHeight,
# splitMediaWidth, imageHeight and decorative-image's width entirely, and
# swept up the wrapper's maxWidth on three surfaces. Enumerating is the only
# form that can be checked.
ROSTER = {
    'media': {
        'object-fit': ['objectFit'],
        'focal-point': ['objectPosition'],
        'box-shape': ['mediaSizing', 'height', 'heightUnit', 'maxHeight',
                      'maxHeightUnit', 'maxWidth', 'maxWidthUnit'],
        'overlay': [],
    },
    'before-after': {
        'object-fit': [],
        'focal-point': [],
        'box-shape': ['height', 'heightUnit', 'maxWidth', 'maxWidthUnit'],
        'overlay': [],
    },
    'hero': {
        'object-fit': ['splitMediaObjectFit', 'backgroundSize'],
        'focal-point': ['splitMediaObjectPosition', 'splitMediaObjectPositionTablet',
                        'splitMediaObjectPositionMobile', 'backgroundPosition',
                        'backgroundRepeat', 'backgroundAttachment'],
        'box-shape': ['splitMediaHeight', 'splitMediaHeightUnit', 'splitMediaWidth',
                      'splitMediaWidthTablet', 'splitMediaWidthMobile',
                      'splitMediaWidthUnit', 'minHeight'],
        'overlay': ['backgroundOverlayColour', 'backgroundOverlayColourHover',
                    'backgroundOverlayOpacity', 'backgroundOverlayOpacityTablet',
                    'backgroundOverlayOpacityMobile', 'backgroundOverlayBlendMode',
                    'overlayGradient', 'overlayGradientHover',
                    'mediaOverlayColour', 'mediaOverlayGradient'],
    },
    'container': {
        'object-fit': ['backgroundSize'],
        'focal-point': ['backgroundPosition', 'backgroundRepeat', 'backgroundAttachment'],
        'box-shape': ['minHeight'],
        'overlay': ['backgroundOverlayColour', 'backgroundOverlayColourHover',
                    'backgroundOverlayOpacity', 'backgroundOverlayOpacityTablet',
                    'backgroundOverlayOpacityMobile', 'backgroundOverlayBlendMode',
                    'overlayGradient', 'overlayGradientHover'],
    },
    'decorative-image': {
        'object-fit': [],
        'focal-point': [],
        'box-shape': ['width', 'maxWidthPercent'],
        'overlay': [],
    },
    'product-card': {
        'object-fit': [],
        'focal-point': [],
        'box-shape': ['imageHeight'],
        'overlay': [],
    },
}

# Whether the attribute styles the MEDIA ELEMENT itself or the block's
# BACKGROUND BOX. The two are not interchangeable: object-fit applies to a
# replaced element, background-size to a painted box, and the container's
# wrapper translates between them at class-sgs-container-wrapper.php:1106-1108
# and :1165-1166 for its <img> LCP fast path.
BACKDROP = {
    'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'backgroundAttachment', 'bgSvgMinHeight',
    'backgroundOverlayColour', 'backgroundOverlayColourHover',
    'backgroundOverlayOpacity', 'backgroundOverlayOpacityTablet',
    'backgroundOverlayOpacityMobile', 'backgroundOverlayBlendMode',
    'overlayGradient', 'overlayGradientHover',
}

# Where the editor control and the renderer physically live. Declared, with the
# anchor that established it -- these needed a call graph, not a grep, and this
# track's recurring failure is concluding from a block's own file when a SHARED
# component or helper is the real owner.
ANCHORS = {
    'media': {
        'control': 'src/components/MediaSizingPanel.js (shared) + media/edit.js',
        'renderer': 'src/blocks/media/render.php:288-299',
    },
    'before-after': {
        'control': 'universal image-controls extension (sgsObjectFit/sgsObjectPosition)',
        'renderer': 'src/blocks/before-after/render.php:262-278 (emits custom-property VALUES)',
    },
    'hero': {
        'control': 'hero/edit.js (own rows) + FocalPositionField + BackgroundPanel (shared)',
        'renderer': 'src/blocks/hero/render.php:618-628 + :1098/:1112 (overlay)',
    },
    'container': {
        'control': 'src/blocks/container/components/BackgroundPanel.js (shared by 8 host blocks)',
        'renderer': 'includes/class-sgs-container-wrapper.php:1746 / :2269 (overlay)',
    },
    'decorative-image': {
        'control': 'decorative-image/edit.js',
        'renderer': 'sgs_responsive_image() naked mode',
    },
    'product-card': {
        'control': 'universal image-controls extension + product-card/edit.js',
        'renderer': 'src/blocks/product-card/render.php:246 via sgs_media_position_css()',
    },
}

NOTES = {
    ('media', 'imageHeight'): 'NOT here -- integer intrinsic (atom 5). See trap 2.',
    ('product-card', 'imageHeight'):
        'string "180px", client-facing, drives --sgs-product-card-image-height. '
        'NOT the same concept as sgs/media imageHeight. Non-responsive. Trap 2.',
    ('media', 'maxWidth'): 'Bounds the media box -- sgs/media has no contentWidth.',
    ('before-after', 'maxWidth'): 'Bounds the media box -- no contentWidth on this block.',
    ('hero', 'splitMediaObjectFit'):
        'Declares NO enum, and carries a 4th value "custom" that is a SIZING MODE '
        '(explicit width/height), not a CSS fit value -- render.php:625 gates '
        'object-fit OFF for it. Reassigned to box-shape (D909).',
    ('hero', 'splitMediaObjectPosition'):
        'The only per-tier focal point in the population. Mobile defaults to '
        '"center 20%", Tablet to "".',
    ('hero', 'mediaOverlayColour'):
        'Split-column overlay, SEPARATE from the section overlay. Bypasses '
        'sgs_overlay_decls() -- no opacity, no blend mode, no hover, no tiers.',
    ('container', 'backgroundSize'):
        'The backdrop equivalent of object-fit, and NOT equivalent in vocabulary: '
        'cover/contain/auto only. class-sgs-container-wrapper.php:1106-1108 '
        'records the impedance mismatch in its own comment.',
    ('decorative-image', 'width'):
        'Naked mode -- sgs_responsive_image() emits the <img> AS the block root, '
        'so there is no ancestor to descend from. positionX/positionY on this '
        'block are ABSOLUTE PLACEMENT, not focal point. Trap 3.',
}

TRAPS = [
    {
        'id': 'maxwidth-two-owners',
        'claim': '`maxWidth` is a media attribute',
        'truth': 'Only on sgs/media and sgs/before-after. On hero, container and '
                 'product-card it is the WRAPPER max-width, paired with '
                 '`contentWidth` and owned by SGS_Container_Wrapper.',
        'how_found': 'The two surfaces that own it as media have no `contentWidth` '
                     'attribute at all; the three that do not, do.',
    },
    {
        'id': 'imageheight-opposite-meanings',
        'claim': '`imageHeight` is one concept',
        'truth': 'sgs/media declares `integer` (intrinsic, paired with imageWidth, '
                 'written from the chosen media -- atom 5). sgs/product-card '
                 'declares `string` ("180px", client-facing box-shape control). '
                 'A helper keyed on the name alone breaks one of them.',
        'how_found': 'Reading the declared type per surface rather than matching '
                     'the name.',
    },
    {
        'id': 'positionxy-is-not-focal-point',
        'claim': 'decorative-image positionX/positionY are focal point',
        'truth': 'They are absolute placement of the decoration on its section. '
                 'Folding them into atom 8 would move the wrong thing.',
        'how_found': 'Both are tier OBJECTS defaulting to {desktop:50} -- a '
                     'percentage placement pair, not an object-position value.',
    },
]

DISAGREEMENTS = [
    {
        'atom': 'object-fit',
        'what': 'THREE rival enums for one property',
        'detail': {
            'canonical-5': 'cover, contain, fill, none, scale-down '
                           '(MediaSizingPanel, sgs/media, helpers-media-position.php)',
            'extension-6': 'the same 5 plus "" = Inherit (extensions/image-controls.js)',
            'hero-4': 'cover, contain, fill, custom -- no none, no scale-down, and '
                      '`custom` is a sizing mode. hero declares NO enum so it round-trips.',
            'backdrop-3': 'cover, contain, auto (backgroundSize on hero + container)',
        },
        'resolution': 'D909 -- atom 7 is the canonical five and READS the others. '
                      '`custom` is reassigned to atom 9 (box-shape).',
    },
    {
        'atom': 'focal-point',
        'what': 'TWO storage shapes for one value',
        'detail': {
            'xy-object': 'sgsObjectPosition {x,y} floats 0-1 (FocalPointPicker native)',
            'css-string': 'objectPosition / splitMediaObjectPosition "center center"',
        },
        'resolution': 'Already bridged -- FocalPositionField takes a `format` prop '
                      '("xy" | "css-string") and src/utils/objectPosition.js converts. '
                      'No new mechanism needed; coverage is the gap.',
    },
    {
        'atom': 'box-shape',
        'what': 'Ratio format diverges, and height is modelled four ways',
        'detail': {
            'ratio-spaced': '"16 / 9" (MediaSizingPanel RATIO_OPTIONS, image-sequence)',
            'ratio-unspaced': '"16/10" (card-grid, gallery, post-grid -- free text)',
            'height-tier-object': 'sgs/media, before-after `height` + heightUnit',
            'height-flat-string': 'product-card `imageHeight` = "180px", non-responsive',
        },
        'resolution': 'OPEN -- atom 9 must pick one ratio format and read both.',
    },
    {
        'atom': 'overlay',
        'what': 'THREE implementations, one bypassing the shared emitter',
        'detail': {
            'shared-value-emitter': 'sgs_overlay_decls() (helpers-tokens.php:1003) -- 2 callers',
            'shared-attr-wrapper': 'sgs_overlay_decls_for() (helpers-colour-variants.php:316)',
            'hero-bypass': 'mediaOverlayColour / mediaOverlayGradient -- calls neither, '
                           'and has no opacity, blend mode, hover or tiers',
        },
        'resolution': 'OPEN -- routing hero`s split overlay through the shared emitter '
                      'is the cheap win.',
    },
    {
        'atom': 'overlay',
        'what': 'Inconsistent naming INSIDE one attribute family',
        'detail': {
            'prefixed': 'backgroundOverlayColour, backgroundOverlayOpacity, '
                        'backgroundOverlayBlendMode',
            'unprefixed': 'overlayGradient, overlayGradientHover',
        },
        'resolution': 'Recorded, not fixed -- a rename is a stored-post_content '
                      'migration (D338). Atom 10 reads both.',
    },
]


# Which surfaces CAN carry each atom, and why one cannot.
#
# `element` surfaces render a media element the client positions inside a box.
# `backdrop` surfaces paint media behind content. Both can carry all four
# presentation atoms -- the vocabulary differs (object-fit vs background-size)
# but the CAPABILITY does not, which is exactly what the atom layer exists to
# normalise.
#
# ⛔ An entry in NOT_APPLICABLE must name a CONCEPT-level reason. "It does not
# have it today" is a gap, not an exclusion (see the docstring).
APPLICABLE = {
    'object-fit': list(ROSTER),
    'focal-point': list(ROSTER),
    'box-shape': list(ROSTER),
    'overlay': list(ROSTER),
}

NOT_APPLICABLE = {}

# Controls that stay block-specific because they are a DIFFERENT CONCEPT, not a
# missing instance of a shared one. Recorded so a later pass does not fold them
# into an atom.
# Names deliberately NOT in this roster because the SOURCE-side census already
# owns them. `bgSvgMinHeight` is a MEDIA_BASES.svg base, so it belongs to atom 6
# (svg-presentation), not to box-shape -- two atoms claiming one name would make
# selective injection ambiguous.
OWNED_ELSEWHERE = {
    'bgSvgMinHeight': 'atom 6 svg-presentation — already a MEDIA_BASES.svg base',
}

SPECIALISED = {
    'decorative-image': {
        'positionX': 'Absolute placement of the decoration on the page — not the '
                     'position of an object within its container. Never atom 8.',
        'positionY': 'Absolute placement of the decoration on the page — not the '
                     'position of an object within its container. Never atom 8.',
    },
}


# Atoms the universal image-controls extension already provides to any block
# declaring `supports.sgs.imageControls`. sgsObjectFit / sgsObjectPosition are
# real, live controls, so a surface opting in is NOT missing those atoms even
# though its own block.json declares neither.
#
# ⛔ Resolving coverage to its PROVIDER, not to the block's own file, is the
# whole point. This track's recurring failure is reading a block's own
# block.json and concluding a control is absent when a shared mechanism supplies
# it. A gap matrix that over-reports sends a branch to build what already exists.
EXTENSION_PROVIDES = {
    'object-fit': 'sgsObjectFit',
    'focal-point': 'sgsObjectPosition',
}


def opts_into_image_controls(surface):
    """True when the block declares supports.sgs.imageControls."""
    supports = load_block_json(surface).get('supports', {})
    return bool(supports.get('sgs', {}).get('imageControls'))


def compute_gaps(data):
    """Per atom: which surfaces carry it, how, and which are genuinely missing it.

    A surface "carries" an atom when it declares at least one of that atom's
    attributes OR a shared mechanism supplies it. Missing means the client has
    no such control on that block at all -- a gap to close, not a decision.
    """
    gaps = {}
    for atom, eligible in APPLICABLE.items():
        own, via_extension, missing = [], [], []
        for surface in eligible:
            attrs = data[f'sgs/{surface}']['attrs']
            if any(r['atom'] == atom for r in attrs.values()):
                own.append(surface)
            elif atom in EXTENSION_PROVIDES and opts_into_image_controls(surface):
                via_extension.append(surface)
            else:
                missing.append(surface)
        covered = len(own) + len(via_extension)
        gaps[atom] = {
            'eligible': len(eligible),
            'carries_own': sorted(own),
            'carries_via_extension': sorted(via_extension),
            'extension_attr': EXTENSION_PROVIDES.get(atom),
            'MISSING': sorted(missing),
            'coverage': f'{covered}/{len(eligible)}',
            'not_applicable': {k: v for k, v in NOT_APPLICABLE.items()
                               if k.startswith(atom)},
        }
    return gaps


def load_block_json(surface):
    path = os.path.join(BLOCKS_DIR, surface, 'block.json')
    with open(path, encoding='utf-8', errors='replace') as fh:
        return json.load(fh)


def tier_of(name):
    if name.endswith('Tablet'):
        return 'Tablet'
    if name.endswith('Mobile'):
        return 'Mobile'
    return 'desktop'


def build():
    """Read every block.json and assemble the presentation manifest."""
    out = {}
    missing = []
    for surface, atoms in ROSTER.items():
        declared = load_block_json(surface).get('attributes', {})
        records = {}
        for atom, names in atoms.items():
            for name in names:
                if name not in declared:
                    missing.append(f'sgs/{surface}.{name}')
                    continue
                spec = declared[name]
                rec = {
                    'atom': atom,
                    'type': spec.get('type'),
                    'default': spec.get('default'),
                    'tier': tier_of(name),
                    'scope': 'backdrop' if name in BACKDROP else 'element',
                }
                if 'enum' in spec:
                    rec['enum'] = spec['enum']
                note = NOTES.get((surface, name))
                if note:
                    rec['note'] = note
                records[name] = rec
        out[f'sgs/{surface}'] = {
            'control': ANCHORS[surface]['control'],
            'renderer': ANCHORS[surface]['renderer'],
            'attr_count': len(records),
            'attrs': records,
        }
    return out, missing


def survey():
    data, missing = build()
    pairs = sum(v['attr_count'] for v in data.values())
    names = sorted({n for v in data.values() for n in v['attrs']})

    print('PRESENTATION CENSUS — media atoms 7-10\n')
    for slug, rec in data.items():
        print(f'{slug}  ({rec["attr_count"]})')
        by_atom = {}
        for n, r in rec['attrs'].items():
            by_atom.setdefault(r['atom'], []).append(n)
        for atom in ('object-fit', 'focal-point', 'box-shape', 'overlay'):
            if by_atom.get(atom):
                print(f'   {atom:12} {", ".join(sorted(by_atom[atom]))}')
        print()

    print(f'PAIRS = {pairs}   DISTINCT NAMES = {len(names)}')
    print(f'TRAPS recorded = {len(TRAPS)}   DISAGREEMENTS = {len(DISAGREEMENTS)}')

    print('\n' + '=' * 62)
    print('GAPS — the operative output. Missing means a control the client')
    print('does NOT have on that block, and should. Not a decision to respect.')
    print('=' * 62)
    gaps = compute_gaps(data)
    total_missing = 0
    for atom in ('object-fit', 'focal-point', 'box-shape', 'overlay'):
        g = gaps[atom]
        total_missing += len(g['MISSING'])
        print(f"\n{atom}  coverage {g['coverage']}")
        print(f"   own       : {', '.join(g['carries_own']) or '(none)'}")
        if g['carries_via_extension']:
            print(f"   extension : {', '.join(g['carries_via_extension'])} "
                  f"(via {g['extension_attr']})")
        print(f"   MISSING   : {', '.join(g['MISSING']) or '(none)'}")
    print(f'\nTOTAL atom-surface gaps to close: {total_missing}')
    for surface, entries in SPECIALISED.items():
        for name, why in entries.items():
            print(f'   specialised, never folded in: sgs/{surface}.{name}')
    if missing:
        print('\n⛔ ROSTER NAMES NOT DECLARED IN block.json — the roster is stale:')
        for m in missing:
            print('   ', m)
        return 1
    return 0


def write():
    data, missing = build()
    if missing:
        print('REFUSING to write — roster is stale:', ', '.join(missing), file=sys.stderr)
        return 1
    with open(CENSUS, encoding='utf-8') as fh:
        census = json.load(fh)
    census['presentation'] = {
        'doc': 'The PRESENTATION half of the manifest — media atoms 7-10 '
               '(object-fit / focal-point / box-shape / overlay). The Wave 1 '
               'census above is SOURCE-SIDE ONLY; see this script`s docstring.',
        'generated_by': 'plugins/sgs-blocks/scripts/surveys/census-media-presentation.py',
        'decision': 'D909',
        'reading_instruction':
            'GAP ANALYSIS, not a wiring manifest. A name missing from a surface '
            'is an accidental gap, not a deliberate exclusion. `gaps` is the '
            'operative output; `surfaces` is only what exists today.',
        'traps': TRAPS,
        'disagreements': DISAGREEMENTS,
        'gaps': compute_gaps(data),
        'specialised': SPECIALISED,
        'surfaces': data,
    }
    with open(CENSUS, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(census, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    pairs = sum(v['attr_count'] for v in data.values())
    names = len({n for v in data.values() for n in v['attrs']})
    print(f'WROTE {CENSUS}')
    print(f'  presentation: {pairs} pairs, {names} distinct names, '
          f'{len(TRAPS)} traps, {len(DISAGREEMENTS)} disagreements')
    return 0


def self_test():
    """Prove the script can FAIL, and that its three traps are real."""
    checks = []

    data, missing = build()
    checks.append(('every roster name is declared in its block.json', not missing))

    # Trap 1 — maxWidth has two owners, and the discriminator is contentWidth.
    media_has_cw = 'contentWidth' in load_block_json('media').get('attributes', {})
    hero_has_cw = 'contentWidth' in load_block_json('hero').get('attributes', {})
    checks.append(('trap 1: sgs/media has NO contentWidth', not media_has_cw))
    checks.append(('trap 1: sgs/hero HAS contentWidth', hero_has_cw))
    checks.append(('trap 1: hero maxWidth excluded from the roster',
                   'maxWidth' not in data['sgs/hero']['attrs']))
    checks.append(('trap 1: media maxWidth INCLUDED',
                   'maxWidth' in data['sgs/media']['attrs']))

    # Trap 2 — imageHeight declares different types on the two surfaces.
    m_ih = load_block_json('media')['attributes'].get('imageHeight', {}).get('type')
    p_ih = load_block_json('product-card')['attributes'].get('imageHeight', {}).get('type')
    checks.append(('trap 2: sgs/media imageHeight is integer', m_ih == 'integer'))
    checks.append(('trap 2: sgs/product-card imageHeight is string', p_ih == 'string'))
    checks.append(('trap 2: the two differ', m_ih != p_ih))
    checks.append(('trap 2: media imageHeight NOT in box-shape',
                   'imageHeight' not in data['sgs/media']['attrs']))

    # Trap 3 — positionX/Y are tier objects, not object-position strings.
    di = load_block_json('decorative-image')['attributes']
    checks.append(('trap 3: positionX is an object, not a CSS string',
                   di.get('positionX', {}).get('type') == 'object'))
    checks.append(('trap 3: positionX excluded from focal-point',
                   'positionX' not in data['sgs/decorative-image']['attrs']))

    # Gap matrix — coverage must resolve to the PROVIDER, not the block's own file.
    g = compute_gaps(data)
    checks.append(('gaps: before-after DOES opt into imageControls',
                   opts_into_image_controls('before-after')))
    checks.append(('gaps: decorative-image does NOT opt in (its gap is real)',
                   not opts_into_image_controls('decorative-image')))
    checks.append(('gaps: before-after credited to the EXTENSION for object-fit',
                   'before-after' in g['object-fit']['carries_via_extension']))
    checks.append(('gaps: before-after NOT reported missing object-fit',
                   'before-after' not in g['object-fit']['MISSING']))
    checks.append(('gaps: object-fit missing on decorative-image only',
                   g['object-fit']['MISSING'] == ['decorative-image']))
    checks.append(('gaps: box-shape is fully covered',
                   g['box-shape']['MISSING'] == []))
    checks.append(('gaps: overlay is the biggest gap (4 surfaces)',
                   len(g['overlay']['MISSING']) == 4))
    # A gap matrix reporting ZERO gaps everywhere would be vacuous.
    total = sum(len(v['MISSING']) for v in g.values())
    checks.append(('gaps: the matrix reports a NON-ZERO total (not vacuous)', total > 0))

    # NEGATIVE CONTROL — a roster naming an attribute that does not exist must
    # be detected. Without this, `missing` could be permanently empty and the
    # first check above would pass forever against a rotted roster.
    ROSTER['media']['object-fit'].append('__thisAttributeDoesNotExist')
    try:
        _, missing_after = build()
        detected = any('__thisAttributeDoesNotExist' in m for m in missing_after)
    finally:
        ROSTER['media']['object-fit'].remove('__thisAttributeDoesNotExist')
    checks.append(('NEGATIVE CONTROL: a bogus roster name IS detected', detected))

    # The census the manifest merges into must actually exist and be source-side.
    with open(CENSUS, encoding='utf-8') as fh:
        census = json.load(fh)
    src = census['surfaces']['sgs/media']['storedAs']
    checks.append(('census IS source-side only (no objectFit in storedAs)',
                   'objectFit' not in src))
    checks.append(('census IS source-side only (no mediaSizing in storedAs)',
                   'mediaSizing' not in src))

    failed = 0
    for name, ok in checks:
        print(f'  {"PASS" if ok else "FAIL"}  {name}')
        if not ok:
            failed += 1
    print(f'\n{len(checks) - failed}/{len(checks)} passed')
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true', help='print the manifest')
    ap.add_argument('--write', action='store_true', help='merge into the census JSON')
    ap.add_argument('--self-test', action='store_true', help='prove it can fail')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.write:
        return write()
    return survey()


if __name__ == '__main__':
    sys.exit(main())
