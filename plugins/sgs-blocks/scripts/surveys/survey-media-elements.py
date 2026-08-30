#!/usr/bin/env python3
"""Wave 1 census for the unified media element.

Plan: `.claude/plans/media-element-misty-squid.md`
Architecture: `.claude/plans/2026-08-30-media-element-architecture-v2.md`

WHY THIS EXISTS
---------------
Nine surfaces render media and none agree - control set, panel structure,
disclosure rules, naming, enum shape, and whether a media type is stored at
all. Before any shared layer is written the build needs ONE manifest saying,
per surface: prefix / context / insertion / mechanism / the storedAs map /
escape-hatch flags. THE-MIGRATION-METHOD requires the detector as the first
deliverable past 3 files.

Cloned from the proven triad shape of `check-image-controls-support.py`
(itself cloned from `survey-background-colour-support.py`): --survey census /
--check gate / --self-test positive+negative control.

THE JUDGEMENT HALF vs THE MACHINE HALF
--------------------------------------
`prefix` / `context` / `insertion` / `mechanism` are JUDGEMENT calls. The
architecture (S14) says decide all of them in the census, before any edit, and
they are not machine-derivable - so they live in the SURFACES roster below,
each citing the survey report that establishes it. Everything else - which
attributes exist, what shape each stores, whether a control reaches it - is
derived from disk at run time so the census cannot rot into a hand-typed JSON
that disagrees with the tree.

TWO DETECTORS, AND THE DELTA BETWEEN THEM IS ITSELF A FINDING
-------------------------------------------------------------
(a) DB-FIRST (R-31-1). `block_attributes.role` in {image-object, svg,
    image-alt, scalar-media} - 104 rows framework-wide. This is the
    converter's routing vocabulary and is authoritative for what the cloning
    pipeline recognises.
(b) FAMILY EXPANSION. A named base attr plus its Id/Url/Tablet/Mobile
    siblings as actually declared in block.json.

DO NOT use (a) alone - it UNDER-COVERS. `sgs/media.imageUrl` carries
`image-object` while its sibling `imageId` carries no media role, and NO tier
sibling of any id/url pair carries one. A census built on roles alone would
miss every attachment ID and every art-direction tier - the exact shape of
STOP-A-CENSUS-IS-ONLY-AS-WIDE-AS-ITS-CORPUS. This script reports
`role_coverage_gap` per surface so the gap stays visible rather than inherited.

USAGE
-----
  python scripts/surveys/survey-media-elements.py --survey
  python scripts/surveys/survey-media-elements.py --survey --json
  python scripts/surveys/survey-media-elements.py --check
  python scripts/surveys/survey-media-elements.py --self-test
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
DB_PATH = Path(os.path.expanduser(
    '~/.claude/skills/sgs-wp-engine/sgs-framework.db'))

# DB-first media role vocabulary (R-31-1 - queried, never guessed).
MEDIA_ROLES = ('image-object', 'svg', 'image-alt', 'scalar-media')

# Device-tier suffixes (the 768/1024 system), not arbitrary visual
# breakpoints. Canonical source: includes/class-sgs-breakpoints.php.
TIER_SUFFIXES = ('Tablet', 'Mobile')

# Import-graph depth for control resolution. 3 reaches
# edit.js -> components/index.js (barrel) -> ContainerWrapperControls
# -> BackgroundPanel, which is the deepest real chain measured.
MAX_IMPORT_DEPTH = 4


# ---------------------------------------------------------------------------
# The judgement half. Each entry cites the report that establishes it.
# ---------------------------------------------------------------------------
SURFACES = {
    'sgs/media': {
        'prefixes': [''],
        'context': 'element',
        'insertion': 'root',
        'mechanism': 'sibling-markup',
        'wave': 5,
        'wire_order': 1,
        'report': 'M1',
        'stems': ['image', 'video', 'svg', 'thumbnail', 'mediaType'],
        'escape_hatches': [],
        'does_better': [],
        'notes': ('First surface wired. Hand-rolls its own tier cascade past '
                  'sgs_tier_media_render() via a closure taking '
                  '(modifier_base, tiers_present) with the uid CLOSED OVER, '
                  'against the shared helper (present, base_class, uid). The '
                  'bodies are near-identical; only the argument order and one '
                  'whitespace difference in the @media text diverge.'),
    },
    'sgs/before-after': {
        'prefixes': ['before', 'after'],
        'context': 'element',
        'insertion': 'element',
        'mechanism': 'sibling-markup',
        'wave': 5,
        'wire_order': 2,
        'report': 'M4',
        'stems': ['beforeImage', 'afterImage', 'beforeVideo', 'afterVideo',
                  'beforeSvg', 'afterSvg', 'beforeMediaType',
                  'afterMediaType', 'videoAutoplay'],
        'escape_hatches': ['two-independent-instances', 'video-sync-layer'],
        'does_better': [
            'ONE parameterised MediaSlotPicker + '
            'sgs_before_after_resolve_media() drives both slots - zero drift '
            'between before/after (M4 S1).',
            'Narrowest per-type gating of any surface: every type-specific '
            'control is wrapped in an exact equality check (M4 S2).',
            'Emits custom-property VALUES so a scoped <style> never has two '
            'writers - a real extension of Spec 32 beyond inline style="" '
            '(M4 S5).',
        ],
        'notes': ('THE FALSIFYING SECOND SURFACE. Video and SVG sides are '
                  'confirmed FLAT - no tier attrs, no tier controls, no tier '
                  'resolver branches. Only the image side has tiers.'),
    },
    'sgs/hero': {
        'prefixes': ['split', 'media', 'bg', 'background'],
        'context': 'element',
        'insertion': 'element',
        'mechanism': 'shared-helper',
        'wave': 7,
        'wire_order': None,
        'report': 'M2',
        'stems': ['splitImage', 'splitVideo', 'splitSvg', 'splitMediaType',
                  'backgroundImage', 'bgVideo', 'bgSvg'],
        'escape_hatches': ['two-families-one-block'],
        'does_better': [],
        'notes': ('TWO media families on one block (split-media + '
                  'background). One of only two adopters of '
                  'sgs_tier_media_render(), alongside timeline.'),
    },
    'sgs/container': {
        'prefixes': ['bg', 'background'],
        'context': 'backdrop',
        'insertion': 'element',
        'mechanism': 'css-background',
        'wave': 7,
        'wire_order': None,
        'report': 'M3',
        'stems': ['backgroundImage', 'bgVideo', 'bgSvg'],
        'escape_hatches': ['no-media-type-enum', 'existence-based-precedence',
                           'shared-by-8-host-blocks'],
        'does_better': [],
        'notes': ('BackgroundPanel is shared by 8 host blocks, so a change '
                  'here reaches all 8. No media-type enum exists: image, '
                  'video and svg are three parallel families switched by an '
                  'editor-only TabPanel, and at render VIDEO SILENTLY BEATS '
                  'IMAGE with no editor warning (M3 S1).'),
    },
    'sgs/decorative-image': {
        'prefixes': [''],
        'context': 'backdrop',
        'insertion': 'root',
        'mechanism': 'sibling-markup',
        'wave': 7,
        'wire_order': None,
        'report': 'M5',
        'stems': ['image', 'decorMedia'],
        'escape_hatches': ['naked-mode'],
        'does_better': [],
        'notes': ('NAKED MODE: the <img> IS the block root, so tier toggles '
                  'are COMPOUND selectors, never descendant - there is no '
                  'ancestor to descend from. This already forced a second '
                  'conditional rendering shape to accommodate ONE shared JS '
                  'module that assumed a wrapper existed (M5 S3).'),
    },
    'sgs/product-card': {
        'prefixes': [''],
        'context': 'element',
        'insertion': 'element',
        'mechanism': 'bare-url',
        'wave': 8,
        'wire_order': None,
        'report': 'M5',
        'stems': ['image'],
        'escape_hatches': ['bare-url-no-attachment-id',
                           'override-over-live-data'],
        'does_better': [],
        'notes': ('Content migration ships SEPARATELY, after the abstraction '
                  'is proven. Stores a bare URL with no attachment ID at all, '
                  'and in bound mode the attr OVERRIDES live WooCommerce data '
                  'only when explicitly set (M5 S5).'),
    },
}

EXCLUDED = {
    'sgs/responsive-logo':
        "Bean's call. Already good - native <picture><source media>, zero JS, "
        'genuinely per-tier with inherit-up. Forcing it onto the shared shape '
        'is a DOWNGRADE, and excluding it removes a whole mechanism variant '
        'from v1.',
    'sgs/info-box':
        'Not a media surface. Its mediaType/image/icon are DEAD legacy attrs '
        'from before the FR-22-6 InnerBlocks migration; the real media lives '
        'in sgs/icon and sgs/media children (M5 S1).',
    'sgs/image-sequence':
        'Agency-only (inserter:false, needs a Python/ffmpeg CLI no client can '
        'run). Its "media" is a canvas frame rig with a fail-open thumbnail, '
        'not a displayed image (M5 S4).',
}


def _norm_type(spec):
    t = spec.get('type')
    if isinstance(t, list):
        return '|'.join(t)
    return str(t)


def classify_shape(name, spec):
    """Return the STORAGE SHAPE, not merely the JSON type.

    The architecture's `storedAs` maps NAMES. Names alone cannot express that
    the same concept is stored several different ways across the population,
    so a wave-2 helper built from a name map would be unable to read most of
    them.
    """
    t = _norm_type(spec)
    # Strip the device tier BEFORE any name-based test. `imageIdMobile` ends
    # in 'Mobile', not 'Id', so testing the raw name mis-shaped every tier
    # sibling of an attachment ID as a bare number.
    base = re.sub(r'(Tablet|Mobile)$', '', name)
    if t == 'object':
        return 'media-object'
    if t in ('integer|string', 'string|integer'):
        return 'attachment-id-union'
    if t in ('boolean|null', 'null|boolean'):
        return 'tri-state-inherit'
    if t == 'boolean':
        return 'boolean'
    if t in ('integer', 'number'):
        return 'attachment-id' if base.endswith('Id') else 'number'
    if base.endswith('Alt'):
        return 'alt-string'
    if 'Svg' in base or base.startswith('svg'):
        return 'svg-markup'
    if base.endswith('Url') or base == 'image':
        return 'url-string'
    return 'string'


def editor_sources(slug):
    """edit.js PLUS every local module it imports.

    Scanning edit.js alone reports a LIVE control as absent whenever the
    control lives in a shared component - `bgSvgContent`/`bgVideo` are owned by
    `container/components/BackgroundPanel.js`, which 8 host blocks mount. This
    is the same shape as the `gridTemplateColumns` incident, where "absent from
    render.php/edit.js" was read as "dead on 10 blocks" while the SHARED
    WRAPPER was the reader, and nearly deleted a live client-reachable feature.
    Returns (concatenated_source, [files_read]).
    """
    block_dir = BLOCKS_DIR / slug.split('/', 1)[1]
    edit_path = block_dir / 'edit.js'
    if not edit_path.exists():
        return '', []

    # TRANSITIVE, not one level. `BackgroundPanel` - which owns every bgSvg*
    # and bgVideo* control - is imported by ContainerWrapperControls, not by
    # the block's own edit.js, and `src/components/index.js` is a barrel that
    # only re-exports. A one-level scan stops at the barrel and reports every
    # background control as absent.
    parts, seen, queue = [], [], [(edit_path, 0)]
    visited = set()
    while queue:
        path, depth = queue.pop(0)
        try:
            resolved = path.resolve()
        except OSError:
            continue
        if resolved in visited or depth > MAX_IMPORT_DEPTH:
            continue
        visited.add(resolved)
        try:
            src = resolved.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        parts.append(src)
        try:
            seen.append(str(resolved.relative_to(REPO)))
        except ValueError:
            seen.append(str(resolved))
        for spec in re.findall(r"from\s+['\"](\.[^'\"]+)['\"]", src):
            target = resolved.parent / spec
            for cand in (target.with_suffix('.js'), target,
                         target / 'index.js'):
                if cand.is_file() and cand.suffix == '.js':
                    queue.append((cand, depth + 1))
                    break
    return '\n'.join(parts), seen


def load_block_json(slug):
    path = BLOCKS_DIR / slug.split('/', 1)[1] / 'block.json'
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def db_media_roles():
    """DB-first (R-31-1). Returns {(slug, attr): role}.

    Read-only connection. NEVER import converter/db/db_lookup.py - it runs six
    schema-migration functions against the shared live DB as an import side
    effect, and this is a read-only reporter.
    """
    if not DB_PATH.exists():
        return None
    con = sqlite3.connect('file:%s?mode=ro' % DB_PATH, uri=True)
    try:
        placeholders = ','.join('?' * len(MEDIA_ROLES))
        q = ('SELECT block_slug, attr_name, role FROM block_attributes '
             'WHERE role IN (%s)' % placeholders)
        return {(r[0], r[1]): r[2] for r in con.execute(q, MEDIA_ROLES)}
    except sqlite3.Error:
        return None
    finally:
        con.close()


def control_status(edit_src, attr):
    """Resolve whether an editor control reaches `attr`.

    A literal grep returning 0 is a HYPOTHESIS, not a finding. Every surveyed
    surface builds at least some attribute keys dynamically - `${side}ImageUrl`
    on before-after, `videoUrl${tier}` on media - so a literal miss is reported
    as 'dynamic-or-absent', NEVER as 'absent'. M1's first pass over-reported 15
    dead attrs this exact way; reading the surrounding code corrected it to 7.

    MEASURED LIMITATION - short generic attribute names false-positive. The
    corpus is the transitive import graph (62 files / ~494KB for sgs/media),
    so a word-boundary match on a common English word hits unrelated code:
    `order` resolves 'literal' against sgs/media even though M1 proved it has
    ZERO editor control anywhere. Verified alongside three positive controls
    that correctly report no-control-found (captionFontSize,
    captionFontSizeUnit, maxWidthUnit) and three fabricated names that also
    correctly report no-control-found - so the check is not vacuous, it is
    specifically weak on names under ~8 characters that are ordinary words.
    No attribute in any surveyed media family is affected. If a future stem
    admits one, resolve it by hand rather than trusting this column.
    """
    if re.search(r'\b' + re.escape(attr) + r'\b', edit_src):
        return 'literal'
    # A key is commonly assembled from BOTH ends at once, e.g.
    # `${ side }ImageId${ tier }` (before-after/edit.js:247-248). Strip a known
    # prefix and the tier, then look for the residual INTERIOR fragment
    # adjacent to a template-literal placeholder.
    stem = re.sub(r'(Tablet|Mobile)$', '', attr)
    if stem and stem != attr and re.search(
            r'\b' + re.escape(stem) + r'\b', edit_src):
        return 'dynamic-or-absent'
    interior = re.sub(r'^(before|after|split|bg|background)', '', stem)
    if interior and interior != stem:
        interior = interior[:1].upper() + interior[1:]
        if re.search(r'\$\{[^}]*\}\s*' + re.escape(interior), edit_src):
            return 'dynamic-or-absent'
        if re.search(re.escape(interior) + r'\s*\$\{', edit_src):
            return 'dynamic-or-absent'
    for tail in ('Id', 'Url', 'Content', 'Alt'):
        if attr.endswith(tail):
            frag = attr[:-len(tail)]
            if frag and re.search(r'\b' + re.escape(frag) + r'\b', edit_src):
                return 'dynamic-or-absent'
    return 'no-control-found'


def survey():
    db_roles = db_media_roles()
    out = {
        'doc': 'Wave 1 census - the unified media element build manifest.',
        'plan': '.claude/plans/media-element-misty-squid.md',
        'architecture':
            '.claude/plans/2026-08-30-media-element-architecture-v2.md',
        'evidence': ['.claude/reports/2026-08-30-media-M%d-*.md' % i
                     for i in range(1, 6)],
        'db_available': db_roles is not None,
        'db_media_roles': list(MEDIA_ROLES),
        'surfaces': {},
        'excluded': EXCLUDED,
    }

    for slug, meta in SURFACES.items():
        bj = load_block_json(slug)
        if bj is None:
            out['surfaces'][slug] = {'error': 'block.json unreadable'}
            continue
        attrs = {k: v for k, v in bj.get('attributes', {}).items()
                 if not k.startswith('_')}
        edit_src, sources_read = editor_sources(slug)

        # (b) family expansion. `stems` are FULL attribute stems, already
        # carrying any prefix. An earlier version combined `prefixes` with
        # unprefixed bases and produced 'splitSplitImage', which matched
        # nothing - so hero's expansion was silently EMPTY and only the DB
        # roles survived, under-reporting the surface by more than half.
        # `prefixes` is a JUDGEMENT output for wave 2, never a key constructor.
        family = {a for a in attrs
                  if any(a.startswith(stem) for stem in meta['stems'])}

        # (a) DB-first roles for this surface.
        roled = ({a for (s, a) in (db_roles or {}) if s == slug}
                 if db_roles else set())

        stored_as = {}
        for a in sorted(family | (roled & set(attrs))):
            stored_as[a] = {
                'shape': classify_shape(a, attrs[a]),
                'type': _norm_type(attrs[a]),
                'db_role': (db_roles or {}).get((slug, a)),
                'control': control_status(edit_src, a),
                'tier': next((t for t in TIER_SUFFIXES if a.endswith(t)),
                             'desktop'),
            }

        shapes = sorted({v['shape'] for v in stored_as.values()})
        surface = {k: meta[k] for k in (
            'prefixes', 'context', 'insertion', 'mechanism', 'wave',
            'wire_order', 'report', 'escape_hatches', 'does_better', 'notes')}
        surface.update({
            'attr_count_total': len(attrs),
            'media_attr_count': len(stored_as),
            'storage_shapes': shapes,
            'storedAs': stored_as,
            # The delta that must stay visible rather than be inherited.
            'editor_sources_scanned': sources_read,
            'role_coverage_gap': sorted(set(stored_as) - roled),
            'role_covered': sorted(roled & set(stored_as)),
        })
        out['surfaces'][slug] = surface
    return out


def print_survey(data):
    print('MEDIA ELEMENT CENSUS - Wave 1')
    print('=' * 74)
    if not data['db_available']:
        print('  !! DB unavailable - role coverage NOT measured this run.')
    allshapes = set()
    total_media = 0
    for slug, s in data['surfaces'].items():
        if 'error' in s:
            print('\n%s: ERROR %s' % (slug, s['error']))
            continue
        allshapes |= set(s['storage_shapes'])
        total_media += s['media_attr_count']
        order = (', wire #%d' % s['wire_order']) if s['wire_order'] else ''
        print('\n%s   [%s]  wave %d%s' % (slug, s['report'], s['wave'], order))
        print('  prefix=%r context=%s insertion=%s mechanism=%s'
              % (s['prefixes'], s['context'], s['insertion'], s['mechanism']))
        print('  %d media attrs of %d total'
              % (s['media_attr_count'], s['attr_count_total']))
        print('  shapes: %s' % ', '.join(s['storage_shapes']))
        print('  DB role covers %d/%d - %d not routed by any media role'
              % (len(s['role_covered']), s['media_attr_count'],
                 len(s['role_coverage_gap'])))
        unresolved = [a for a, v in s['storedAs'].items()
                      if v['control'] == 'no-control-found']
        if unresolved:
            print('  !! no control resolved (VERIFY BY HAND - this is a '
                  'hypothesis, not a finding):')
            print('     %s' % ', '.join(unresolved))
        if s['escape_hatches']:
            print('  escape hatches: %s' % ', '.join(s['escape_hatches']))
    print('\n' + '-' * 74)
    print('  %d surfaces in scope, %d excluded, %d media attrs total.'
          % (len(data['surfaces']), len(data['excluded']), total_media))
    print('  %d DISTINCT STORAGE SHAPES across the population:'
          % len(allshapes))
    for sh in sorted(allshapes):
        print('    - %s' % sh)
    print('  A storedAs map of NAMES alone cannot express these. Wave 2 must')
    print('  carry the SHAPE, or the helper can only read one of them.')


def self_test():
    """Positive AND negative controls.

    A check that has never been shown to fail is a decoration; and a negative
    control that passes while every positive control also fails is the same
    bug twice, not a control.
    """
    fails = []

    def ck(name, got, want):
        if got != want:
            fails.append('%s: got %r, want %r' % (name, got, want))

    # POSITIVE - each storage shape is recognised.
    ck('shape/object', classify_shape('splitImage', {'type': 'object'}),
       'media-object')
    ck('shape/id', classify_shape('imageId', {'type': 'integer'}),
       'attachment-id')
    ck('shape/union', classify_shape(
        'beforeImageId', {'type': ['integer', 'string']}),
       'attachment-id-union')
    ck('shape/tristate', classify_shape(
        'videoAutoplayTablet', {'type': ['boolean', 'null']}),
       'tri-state-inherit')
    ck('shape/url', classify_shape('imageUrl', {'type': 'string'}),
       'url-string')
    ck('shape/bareurl', classify_shape('image', {'type': 'string'}),
       'url-string')
    ck('shape/alt', classify_shape('imageAlt', {'type': 'string'}),
       'alt-string')
    ck('shape/svg', classify_shape('svgContent', {'type': 'string'}),
       'svg-markup')

    # NEGATIVE - a non-media string must NOT be claimed as a media shape.
    ck('neg/plain-string', classify_shape('captionTag', {'type': 'string'}),
       'string')
    # NEGATIVE - a plain boolean must not be read as the inherit tri-state.
    ck('neg/plain-bool', classify_shape('videoLoop', {'type': 'boolean'}),
       'boolean')

    # POSITIVE - a literal control reference resolves.
    ck('ctrl/literal',
       control_status('setAttributes({ imageUrl: x })', 'imageUrl'), 'literal')
    # POSITIVE - a dynamically-built key is NOT reported absent.
    ck('ctrl/dynamic',
       control_status('const k = `${side}ImageUrl`; const b = beforeImage;',
                      'beforeImageUrl'),
       'dynamic-or-absent')
    # POSITIVE - a tier key whose stem appears resolves as dynamic.
    ck('ctrl/tier',
       control_status('const k = `imageUrl${tier}`;', 'imageUrlTablet'),
       'dynamic-or-absent')
    # NEGATIVE - a file mentioning nothing reports not-found. Without this the
    # dynamic branch could swallow every case and the check would be vacuous.
    ck('neg/absent', control_status('const a = 1;', 'imageUrl'),
       'no-control-found')

    # NEGATIVE CONTROL ON THE ROSTER ITSELF - an excluded surface must never
    # appear in scope. Silently surveying responsive-logo would contradict
    # Bean's exclusion ruling without anyone noticing.
    for slug in EXCLUDED:
        if slug in SURFACES:
            fails.append('roster: %s is excluded but present in SURFACES'
                         % slug)

    # The roster must not name a block.json that does not exist.
    for slug in SURFACES:
        if load_block_json(slug) is None:
            fails.append('roster: %s block.json unreadable' % slug)

    # The roster's declared bases must actually match something, or the
    # family expansion is silently empty and the census under-reports.
    data = survey()
    for slug, s in data['surfaces'].items():
        if 'error' not in s and s['media_attr_count'] == 0:
            fails.append('roster: %s expanded to ZERO media attrs' % slug)

    for f in fails:
        print('  FAIL %s' % f)
    total = 14 + len(EXCLUDED) + (len(SURFACES) * 2)
    print('\n%s - %d/%d assertions (%d failed)'
          % ('FAIL' if fails else 'PASS', total - len(fails), total,
             len(fails)))
    return 1 if fails else 0


def main():
    p = argparse.ArgumentParser(
        description='Wave 1 media-element census (survey/check/self-test).')
    p.add_argument('--survey', action='store_true', help='print the census')
    p.add_argument('--json', action='store_true', help='emit JSON')
    p.add_argument('--check', action='store_true', help='gate mode')
    p.add_argument('--self-test', action='store_true',
                   help='positive + negative controls')
    a = p.parse_args()

    if a.self_test:
        return self_test()
    if a.check:
        data = survey()
        bad = [s for s, v in data['surfaces'].items() if 'error' in v]
        if bad:
            print('FAIL - unreadable surfaces: %s' % bad)
            return 1
        empty = [s for s, v in data['surfaces'].items()
                 if 'error' not in v and v['media_attr_count'] == 0]
        if empty:
            print('FAIL - surfaces expanded to zero media attrs: %s' % empty)
            return 1
        print('OK - %d surfaces readable, all non-empty.'
              % len(data['surfaces']))
        return 0
    data = survey()
    if a.json:
        print(json.dumps(data, indent=2, sort_keys=False))
    else:
        print_survey(data)
    return 0


if __name__ == '__main__':
    sys.exit(main())
