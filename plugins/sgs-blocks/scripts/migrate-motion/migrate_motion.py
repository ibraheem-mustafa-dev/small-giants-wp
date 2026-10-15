#!/usr/bin/env python3
"""Detector for the old motion attributes (Spec 38A section 13, FR-38A-31).

WHAT THIS DOES
    Reads stored post content, parses every block comment and lists each old motion attribute of
    section 13.1 with the mapper family that migrates it. `wp sgs motion-migrate` is the fixer; this
    script is the census and the gate.

        --survey [--json]   every old attribute found, per attribute and per post
        --check             exit 1 while any old motion attribute remains
        --self-test         inline fixtures plus a planted fault that must turn --check red

    Input is one of:
        --input <file>      the JSON `wp post list --fields=ID,post_type,post_content --format=json` returns
        --target <name>     the same dump pulled read-only over SSH from a build-deploy.py TARGETS entry
                            (two WP bootstraps in total, post types read live, minus NON_BLOCK_POST_TYPES)

    --write-census writes `.claude/reports/<date>-motion-migrate-census.json` (only when passed).

FAMILIES
    A mapper's family is the file suffix after `class-sgs-motion-map-` in
    `includes/motion/migrate/mappers/`. An attribute whose family has no mapper file yet has the
    destination `unmapped`. The family of each attribute is CATALOGUE below (plan decision 10).

UNRECOGNISED
    An attribute that looks like motion (BROAD) but is not in CATALOGUE, or a catalogued attribute on
    a block outside its scope, is listed as `unrecognised`. It never stops the run and is not counted
    by --check; read the list, then extend CATALOGUE or dismiss it deliberately.

    python migrate_motion.py --survey | --check | --self-test
"""
import argparse
import datetime
import glob
import importlib.util
import json
import os
import re
import shlex
import subprocess
import sys

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(os.path.dirname(HERE))
REPO = os.path.dirname(os.path.dirname(PLUGIN))
MAPPERS_DIR = os.path.join(PLUGIN, 'includes', 'motion', 'migrate', 'mappers')
MAPPER_PREFIX = 'class-sgs-motion-map-'

# (names, family, blocks). `names` holds exact attribute names, or a compiled regex for a prefix family.
# `blocks` None = any block; a tuple = only those blocks (the same name elsewhere is unrecognised).
# Section 13.1 and the 13.2 table are the source of every row.
_CARD = ('sgs/card-grid', 'sgs/gallery', 'sgs/testimonial')
_OWN_HOVER = ('sgs/heading', 'sgs/text', 'sgs/quote', 'sgs/button')
_STAGGER_BLOCKS = ('sgs/container', 'sgs/google-reviews', 'sgs/info-box', 'sgs/media', 'sgs/pricing-table',
                   'sgs/product-card', 'sgs/team-member', 'sgs/whatsapp-cta')
CATALOGUE = [
    (('fxFooterStagger',), 'block-reveals', ('sgs/site-footer-row',)),
    (re.compile(r'^fx[A-Z0-9]'), 'fx', None),
    (('sgsAnimation', 'sgsAnimationDelay', 'sgsAnimationDistance', 'sgsAnimationDuration', 'sgsAnimationEasing',
      'sgsAnimationStart', 'sgsAnimationTrigger', 'sgsAnimationStagger', 'sgsAnimationStaggerChildren',
      'sgsAnimationStaggerMax'), 'entrance', None),
    # The icon family comes before the hover rows: a name both families use (scaleHover, transitionDuration, ...) is the
    # icon family's on sgs/icon and sgs/social-icons, and the hover family's elsewhere (`lookup` skips an out-of-scope row).
    (('scaleHover', 'offsetXHover', 'offsetYHover', 'iconRotateHover', 'opacityHover', 'transitionDuration', 'paintDuration',
      'transitionEasing', 'transitionEasingCustom', 'shadowLiftOnHover'), 'icon', ('sgs/icon',)),
    (('childIconScaleHover', 'childIconOffsetXHover', 'childIconOffsetYHover', 'childIconRotateHover',
      'childIconTransitionDuration', 'childIconPaintDuration', 'childIconTransitionEasing',
      'childIconTransitionEasingCustom', 'childIconShadowLiftOnHover'), 'icon', ('sgs/social-icons',)),
    (('sgsHoverDuration', 'sgsHoverDurationMs', 'sgsHoverEasing', 'sgsHoverEasingCustom', 'sgsHoverImageZoom',
      'shadowLiftOnHover', 'sgsHoverShadow', 'sgsHoverShadowCustom', 'shadowHoverColour',
      'scaleHover', 'effectHover', 'sgsHoverLift', 'sgsHoverIndent', 'sgsHoverOpacity', 'sgsHoverGrayscale',
      'sgsHoverBorderAccent'), 'hover', None),
    (re.compile(r'^(bgHoverZoom|sgsHoverZoom|sgsHoverScale)'), 'hover', None),
    # Where the transition pair times the block's own hover (the hover mapper's OWN_HOVER_BLOCKS); on every other block it
    # times unrelated transitions (sliders, tabs, overlays) and stays.
    (('transitionDuration', 'transitionEasing'), 'hover', _OWN_HOVER),
    (('transitionEasingCustom', 'scaleHoverTarget', 'opacityHover', 'liftHover'), 'hover', ('sgs/button',)),
    (('imageZoomHover',), 'hover', ('sgs/card-grid', 'sgs/gallery', 'sgs/post-grid', 'sgs/team-member')),
    (('sgsHoverTilt3D',), 'tilt', None),
    (('sgsClickEffect', 'sgsClickRippleColour', 'sgsClickRippleDuration'), 'ripple', None),
    (('sgsParallax', 'sgsParallaxStrength', 'bgParallax', 'splitMediaParallax', 'parallaxStrength'), 'parallax', None),
    (('staggerDelay',), 'block-reveals', _CARD),
    (('sgsStaggerDelay',), 'block-reveals', _STAGGER_BLOCKS),
    (('revealOnScroll', 'revealStagger', 'revealTrigger'), 'block-reveals', ('sgs/timeline',)),
    (('photoEntrance',), 'block-reveals', ('sgs/buybox',)),
    (('animationStyle', 'animationSubstrate', 'svgAnimationSource'), 'lottie-logo', ('sgs/responsive-logo',)),
    (('lottieId', 'lottieLoop', 'lottieSpeed', 'lottieTrigger'), 'lottie-logo', ('sgs/responsive-logo', 'sgs/media')),
    (('bgKenBurns', 'bgKenBurnsMode', 'bgZoomStart', 'bgAnimationDuration', 'bgSvgAnimation', 'bgSvgAnimationSpeed',
      'bgLottie', 'bgLottieLoop', 'splitMediaKenBurns', 'splitMediaAnimationDuration'), 'looping-media', None),
    (('svgAnimation', 'svgAnimationSpeed'), 'looping-media', ('sgs/media',)),
    (('scrolling', 'scrollSpeed', 'scrollDuration', 'scrollDirection', 'fadeEdges', 'fadeWidth', 'pauseOnHover'),
     'marquee', ('sgs/brand-strip',)),
    (('autoScroll', 'autoScrollBelow', 'autoScrollDuration', 'autoScrollSpeed', 'autoScrollPauseOnHover',
      'autoScrollPauseButton'), 'marquee', ('sgs/trust-bar',)),
    (('pauseButton',), 'marquee', ('sgs/brand-strip',)),
    (('countPopAnimation',), 'state', ('sgs/cart',)),
    (('burgerMorphDuration', 'burgerMorphEasing', 'burgerMorphEasingCustom'), 'state', ('sgs/nav-bar-menu',)),
    (('entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade',
      'curtainColour', 'itemStagger', 'itemStaggerAxis', 'itemStaggerDistance', 'itemStaggerDuration',
      'itemStaggerMax', 'itemStaggerOnClose', 'itemStaggerReveal', 'staggerInsideGroups'), 'nav-drawer',
     ('sgs/nav-drawer',)),
    (('submenuAnimation', 'submenuAnimationDuration', 'submenuExitDuration', 'submenuAnimationEasing',
      'submenuAnimationEasingCustom', 'submenuItemStagger', 'submenuItemStaggerDistance',
      'submenuItemStaggerDuration', 'submenuItemStaggerMax', 'submenuItemStaggerScope'), 'nav-bar',
     ('sgs/nav-bar-menu',)),
]
# Rename-only rows: the value stays in its control and the attribute is renamed (section 13.2: "the shadow and colour
# values stay in their controls ... `shadowHoverColour` vs `shadowColourHover` naming is tidied in the same sweep").
# `shadowColourHover` is the survivor (7 blocks declare it, 2 declare `shadowHoverColour`: sgs/info-box, sgs/testimonial).
RENAMES = {'shadowHoverColour': 'shadowColourHover'}
# Names that look like motion but are not catalogued: reported as unrecognised, never ignored.
BROAD = re.compile(r'^(sgs(Hover|Animation|Parallax|Click)|fx|bgHover|bgKenBurns|bgParallax|bgLottie|bgSvgAnim)|'
                   r'(Parallax|KenBurns|Lottie|Marquee)')
# `captionReveal` (sgs/gallery) is a display option, not motion (Bean, 2026-10-15): it is not catalogued, never
# swept and never removed.
NEVER_MOTION = {'sgsMotion'}
BLOCK_RE = re.compile(r'<!--\s+wp:([a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)?)\s*(\{.*?\})?\s*(/)?-->', re.S)


def load_db_attrs():
    """Every attribute name in the framework DB (read-only), or None when the DB cannot be opened."""
    import sqlite3
    db = os.environ.get('SGS_FRAMEWORK_DB') or os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
    try:
        con = sqlite3.connect('file:%s?mode=ro' % db.replace('\\', '/'), uri=True)
        try:
            return sorted(r[0] for r in con.execute('SELECT DISTINCT attr_name FROM block_attributes'))
        finally:
            con.close()
    except sqlite3.Error:
        return None


def row_key(rows, attr, family):
    """The dict key of an attribute's row: the name, or `name [family]` when another family already holds the name."""
    if attr in rows and rows[attr]['family'] != family:
        return '%s [%s]' % (attr, family)
    return attr


def catalogue_rows(families, db_attrs):
    """One zero-count row per catalogued attribute; prefix rows expand from the framework DB when it is available."""
    rows = {}
    for names, family, blocks in CATALOGUE:
        if hasattr(names, 'match'):
            expanded = [a for a in (db_attrs or []) if names.match(a)] or ([] if db_attrs is not None else [names.pattern + ' (pattern)'])
        else:
            expanded = list(names)
        for attr in expanded:
            rows.setdefault(row_key(rows, attr, family), {'attr': attr, 'family': family, 'destination': family if family in families else 'unmapped',
                                   'scope': list(blocks) if blocks else 'any block', 'count': 0, 'posts': set(),
                                   'blocks': set(), 'post_types': set()})
            if attr in RENAMES:
                rows[attr]['rename_to'] = RENAMES[attr]
    return rows


def mapper_families(directory=MAPPERS_DIR):
    return sorted(os.path.basename(f)[len(MAPPER_PREFIX):-4]
                  for f in glob.glob(os.path.join(directory, MAPPER_PREFIX + '*.php')))


def lookup(block, attr):
    """(family, status) for one attribute; status is 'found', 'unrecognised' or None."""
    out_of_scope = False
    for names, family, blocks in CATALOGUE:
        hit = names.match(attr) if hasattr(names, 'match') else attr in names
        if not hit:
            continue
        if blocks is not None and block not in blocks:
            out_of_scope = True  # a later row may name this attribute for this block
            continue
        return family, 'found'
    if out_of_scope or (attr not in NEVER_MOTION and BROAD.search(attr)):
        return None, 'unrecognised'
    return None, None


def parse_blocks(content):
    """Yield (block_name, attrs, parse_error) for every block comment; core blocks get `core/`."""
    for m in BLOCK_RE.finditer(content or ''):
        name = m.group(1) if '/' in m.group(1) else 'core/' + m.group(1)
        raw = m.group(2)
        if not raw:
            yield name, {}, False
            continue
        try:
            attrs = json.loads(raw)
        except ValueError:
            yield name, {}, True
            continue
        yield name, attrs if isinstance(attrs, dict) else {}, False


def survey(posts, families, db_attrs=None):
    """The census. `families` is the set of family slugs that have a mapper file."""
    found, unrec, core, bad = catalogue_rows(families, db_attrs), {}, [], []
    migrated = 0
    for post in posts:
        pid, ptype = post.get('ID'), post.get('post_type') or 'unknown'
        for name, attrs, parse_error in parse_blocks(post.get('post_content')):
            if parse_error:
                bad.append({'post': pid, 'post_type': ptype, 'block': name})
                continue
            if 'sgsMotion' in attrs:
                migrated += 1
            for attr in attrs:
                family, status = lookup(name, attr)
                if status is None:
                    continue
                if status == 'unrecognised':
                    row = unrec.setdefault(attr, {'attr': attr, 'count': 0, 'posts': set(), 'blocks': set()})
                else:
                    row = found.setdefault(row_key(found, attr, family), {'attr': attr, 'family': family,
                                                  'destination': family if family in families else 'unmapped',
                                                  'scope': 'any block', 'count': 0, 'posts': set(), 'blocks': set(),
                                                  'post_types': set()})
                    if attr in RENAMES:
                        row['rename_to'] = RENAMES[attr]
                    row['post_types'].add(ptype)
                    if name.startswith('core/'):
                        core.append({'post': pid, 'post_type': ptype, 'block': name, 'attr': attr})
                row['count'] += 1
                row['posts'].add(pid)
                row['blocks'].add(name)

    def freeze(rows):
        out = []
        for row in sorted(rows.values(), key=lambda r: r['attr']):
            out.append({k: (sorted(v, key=str) if isinstance(v, set) else v) for k, v in row.items()})
        return out

    attributes = sorted(freeze(found), key=lambda r: (r['family'], r['attr']))
    used = [r for r in attributes if r['count']]
    by_family = {}
    for row in used:
        fam = by_family.setdefault(row['family'], {'destination': row['destination'], 'attributes': 0, 'occurrences': 0})
        fam['attributes'] += 1
        fam['occurrences'] += row['count']
    return {
        'posts_scanned': len(posts),
        'remaining_occurrences': sum(r['count'] for r in used),
        'attributes_found': len(used),
        'framework_db': 'read' if db_attrs is not None else 'unavailable (prefix rows listed as patterns)',
        'already_migrated_blocks': migrated,
        'attributes': attributes,
        'by_family': by_family,
        'core_block_entrances': core,
        'unrecognised': freeze(unrec),
        'unparsable_blocks': bad,
    }


def print_survey(result, source):
    print('Motion migration survey: %s' % source)
    print('  posts scanned: %d, blocks already on sgsMotion: %d' % (result['posts_scanned'], result['already_migrated_blocks']))
    print('  old attribute occurrences remaining: %d across %d attribute(s); %d catalogued attribute(s) listed; framework DB %s'
          % (result['remaining_occurrences'], result['attributes_found'], len(result['attributes']), result['framework_db']))
    for row in result['attributes']:
        note = ' (rename to %s)' % row['rename_to'] if 'rename_to' in row else ''
        print('  %-34s %-14s -> %-14s x%-4d posts %s%s' % (row['attr'], row['family'], row['destination'], row['count'],
                                                         ','.join(str(p) for p in row['posts'][:8]) or '-', note))
    for fam, row in sorted(result['by_family'].items()):
        print('  family %-14s %-10s %d attribute(s), %d occurrence(s)' % (fam, row['destination'], row['attributes'], row['occurrences']))
    for row in result['core_block_entrances']:
        print('  CORE-BLOCK motion (re-home onto the SGS replacement): post %s %s %s' % (row['post'], row['block'], row['attr']))
    for row in result['unrecognised']:
        print('  UNRECOGNISED %-28s x%-3d blocks %s' % (row['attr'], row['count'], ','.join(row['blocks'])))
    for row in result['unparsable_blocks']:
        print('  UNPARSABLE attributes: post %s %s' % (row['post'], row['block']))
    if result['unrecognised'] or result['unparsable_blocks']:
        print('  -> read the UNRECOGNISED / UNPARSABLE lines; --check does not count them.')


def load_build_deploy():
    """Import build-deploy.py (hyphenated name) for TARGETS, NON_BLOCK_POST_TYPES and ssh_base_cmd."""
    path = os.path.join(PLUGIN, 'scripts', 'build-deploy.py')
    spec = importlib.util.spec_from_file_location('build_deploy', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fetch_target(name):
    """Read-only dump of every block-bearing post over SSH, the way step_oldshape_audit does."""
    bd = load_build_deploy()
    if name not in bd.TARGETS:
        sys.exit('unknown target %r; choose from %s' % (name, ', '.join(sorted(bd.TARGETS))))
    wp_root = bd.TARGETS[name]['wp_content'].rsplit('/wp-content', 1)[0]
    skip = '|'.join(bd.NON_BLOCK_POST_TYPES)
    remote = ('cd %s && types=$(wp post-type list --field=name | grep -Ev \'^(%s)$\' | paste -sd,) && '
              'wp post list --post_type="$types" --post_status=any --fields=ID,post_type,post_content --format=json'
              % (shlex.quote(wp_root), skip))
    out = subprocess.run(bd.ssh_base_cmd(bd.ssh_has_alias(bd.SSH_ALIAS)) + [remote], capture_output=True, text=True,
                         encoding='utf-8', errors='replace', timeout=180)
    if out.returncode != 0:
        sys.exit('SSH fetch failed (exit %d): %s' % (out.returncode, (out.stderr or '').strip()[:300]))
    try:
        return json.loads(out.stdout[out.stdout.index('['):])
    except ValueError as e:
        sys.exit('could not read the post list from the target: %s' % e)


def write_census(result, source):
    path = os.path.join(REPO, '.claude', 'reports', '%s-motion-migrate-census.json' % datetime.date.today().isoformat())
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(dict(result, source=source), fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print('census written: %s' % path)


def check(result):
    """0 when no catalogued old attribute remains, else 1."""
    remaining = result['remaining_occurrences']
    if remaining:
        print('CHECK FAILED: %d old motion attribute occurrence(s) remain (%d attribute(s)).' % (remaining, result['attributes_found']))
        return 1
    print('check ok: no old motion attributes remain%s.' % (
        '; %d unrecognised attribute(s) still to read' % len(result['unrecognised']) if result['unrecognised'] else ''))
    return 0


FIXTURE = [
    {'ID': 1, 'post_type': 'sgs_header', 'post_content':
        '<!-- wp:sgs/site-header {"sgsAnimation":"fade-up","sgsHoverLift":true} -->\n'
        '<!-- wp:sgs/nav-drawer {"entryAnimation":{"desktop":"slide-start"},"itemStagger":80} /-->\n'
        '<!-- /wp:sgs/site-header -->'},
    {'ID': 2, 'post_type': 'product', 'post_content':
        '<!-- wp:sgs/product-card {"shadowLiftOnHover":true,"sgsParallax":true,"fxScramble":true} /-->'},
    {'ID': 3, 'post_type': 'page', 'post_content':
        '<!-- wp:sgs/hero {"sgsMotion":{"v":1},"sgsHoverFlipper":1,"scrolling":true} /-->\n'
        '<!-- wp:group {"sgsAnimation":"fade"} --><div></div><!-- /wp:group -->\n'
        '<!-- wp:sgs/brand-strip {"scrolling":true} /-->\n'
        '<!-- wp:sgs/card-grid {"staggerDelay":80} /-->\n'
        '<!-- wp:sgs/container {"staggerDelay":80} /-->'},
    {'ID': 4, 'post_type': 'page', 'post_content': '<!-- wp:sgs/hero {"sgsMotion":{"v":1},"align":"full"} /-->'},
]


def self_test():
    failures = []

    def expect(cond, label):
        print('%s  %s' % ('PASS' if cond else 'FAIL', label))
        if not cond:
            failures.append(label)

    res = survey(FIXTURE, {'hover'}, ['bgHoverZoomScale', 'fxMorph', 'sgsHoverScaleX'])
    # A name two families use has one row each; the used row (higher count) is the one these checks read.
    attrs = {r['attr']: r for r in sorted(res['attributes'], key=lambda r: r['count'])}
    expect({'sgsAnimation', 'sgsHoverLift', 'entryAnimation', 'itemStagger'} <= set(attrs) and 1 in attrs['sgsHoverLift']['posts'],
           'an old attribute in an sgs_header post is found')
    expect(attrs['shadowLiftOnHover']['post_types'] == ['product'] and 'fxScramble' in attrs and 'sgsParallax' in attrs,
           'old attributes in a product post are found (hover, fx prefix, parallax)')
    expect(attrs['sgsHoverLift']['destination'] == 'hover' and attrs['sgsParallax']['destination'] == 'unmapped',
           'destination is the family while its mapper file exists and unmapped otherwise')
    expect(attrs['entryAnimation']['family'] == 'nav-drawer' and attrs['scrolling']['family'] == 'marquee'
           and attrs['staggerDelay']['blocks'] == ['sgs/card-grid'], 'block-scoped names map only on their own block')
    expect([r['attr'] for r in res['unrecognised']] == ['scrolling', 'sgsHoverFlipper', 'staggerDelay'],
           'a motion-looking name or an out-of-scope block lands in unrecognised without stopping the run')
    expect(len(res['core_block_entrances']) == 1 and res['core_block_entrances'][0]['block'] == 'core/group',
           'a stored core-block entrance is listed for re-homing')
    expect(res['already_migrated_blocks'] == 2, 'blocks already on sgsMotion are counted')
    zero = {r['attr']: r for r in res['attributes'] if r['count'] == 0}
    expect({'burgerMorphDuration', 'burgerMorphEasing', 'burgerMorphEasingCustom', 'countPopAnimation', 'revealOnScroll',
            'lottieId', 'autoScrollPauseButton', 'sgsHoverTilt3D', 'sgsClickEffect'} <= set(zero),
           '--survey lists every catalogued attribute, with count 0 when unused')
    expect({'bgHoverZoomScale', 'fxMorph', 'sgsHoverScaleX'} <= set(zero) and 'sgsHoverZoomX' not in zero,
           'prefix families expand from the framework DB attribute names')
    nodb = survey([], set(), None)
    expect(any(r['attr'].endswith('(pattern)') for r in nodb['attributes']) and nodb['framework_db'].startswith('unavailable'),
           'without the framework DB a prefix family is listed as its pattern')
    burger = survey([{'ID': 8, 'post_type': 'sgs_header', 'post_content': '<!-- wp:sgs/nav-bar-menu {"burgerMorphDuration":300} /-->'
                      '<!-- wp:sgs/hero {"burgerMorphDuration":300} /-->'}], set())
    expect([r['attr'] for r in burger['attributes'] if r['count']] == ['burgerMorphDuration'] and
           [r['attr'] for r in burger['unrecognised']] == ['burgerMorphDuration'] and burger['attributes_found'] == 1,
           'burgerMorphDuration is found on sgs/nav-bar-menu only')
    shadow = survey([{'ID': 9, 'post_type': 'page', 'post_content': '<!-- wp:sgs/info-box {"shadowHoverColour":"x","shadowColourHover":"y"} /-->'}], set())
    srow = [r for r in shadow['attributes'] if r['count']]
    expect(len(srow) == 1 and srow[0]['attr'] == 'shadowHoverColour' and srow[0]['rename_to'] == 'shadowColourHover',
           'only the rename-losing shadow colour name counts, with its target; the surviving name is not an old attribute')
    icon = survey([{'ID': 11, 'post_type': 'page', 'post_content':
                    '<!-- wp:sgs/icon {"offsetYHover":2,"scaleHover":1.2,"transitionDuration":200} /-->'
                    '<!-- wp:sgs/social-icons {"childIconScaleHover":1.3} /-->'
                    '<!-- wp:sgs/heading {"scaleHover":1.1,"transitionDuration":300} /-->'
                    '<!-- wp:sgs/hero {"transitionDuration":"300"} /-->'
                    '<!-- wp:sgs/team-member {"imageZoomHover":true} /-->'}], {'hover', 'icon'})
    used = {(r['attr'], r['family']): r for r in icon['attributes'] if r['count']}
    expect(used[('offsetYHover', 'icon')]['destination'] == 'icon' and used[('childIconScaleHover', 'icon')]['destination'] == 'icon',
           'an icon attribute reads destination icon when the icon mapper exists')
    expect(used[('scaleHover', 'icon')]['blocks'] == ['sgs/icon'] and used[('scaleHover', 'hover')]['blocks'] == ['sgs/heading']
           and used[('transitionDuration', 'icon')]['blocks'] == ['sgs/icon']
           and used[('transitionDuration', 'hover')]['blocks'] == ['sgs/heading'],
           'a name both families use belongs to the icon family on sgs/icon and to the hover family on sgs/heading')
    expect(used[('imageZoomHover', 'hover')]['blocks'] == ['sgs/team-member']
           and [(r['attr'], r['blocks']) for r in icon['unrecognised']] == [('transitionDuration', ['sgs/hero'])],
           'imageZoomHover is hover; transitionDuration on a block where it times unrelated transitions is unrecognised, not hover')
    expect(survey([{'ID': 12, 'post_type': 'page', 'post_content': '<!-- wp:sgs/icon {"offsetYHover":2} /-->'}], {'hover'})
           ['attributes'][[r['attr'] for r in survey([], {'hover'})['attributes']].index('offsetYHover')]['destination'] == 'unmapped',
           'an icon attribute reads unmapped while the icon mapper file is missing')
    expect(check(res) == 1, '--check exits 1 while old attributes remain')
    clean = survey([FIXTURE[3]], set())
    expect(check(clean) == 0, '--check exits 0 on content with only sgsMotion')
    planted = survey([FIXTURE[3], {'ID': 9, 'post_type': 'sgs_footer',
                                   'post_content': '<!-- wp:sgs/trust-bar {"autoScroll":true} /-->'}], set())
    expect(check(planted) == 1 and [r['posts'] for r in planted['attributes'] if r['count']] == [[9]],
           'PLANTED FAULT: one old attribute in an sgs_footer post turns --check red')
    expect(survey([{'ID': 5, 'post_type': 'page', 'post_content': '<!-- wp:sgs/hero {"sgsHoverLift": oops} /-->'}], set())
           ['unparsable_blocks'] != [], 'unparsable attributes are reported, not skipped')
    print('\n%s' % ('self-test FAILED: %d' % len(failures) if failures else 'self-test passed'))
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--input')
    ap.add_argument('--target')
    ap.add_argument('--write-census', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not (args.survey or args.check):
        ap.error('choose --survey, --check or --self-test')
    if bool(args.input) == bool(args.target):
        ap.error('give exactly one of --input <file> or --target <name>')
    if args.input:
        with open(args.input, encoding='utf-8') as fh:
            posts = json.load(fh)
        source = args.input
    else:
        posts, source = fetch_target(args.target), 'target ' + args.target
    result = survey(posts, set(mapper_families()), load_db_attrs())
    if args.write_census:
        write_census(result, source)
    if args.check:
        return check(result)
    if args.json:
        print(json.dumps(dict(result, source=source), indent=2, ensure_ascii=False))
    else:
        print_survey(result, source)
    return 0


if __name__ == '__main__':
    sys.exit(main())
