#!/usr/bin/env python3
"""Classify every <SgsLengthControl> mount by the scale its ROLE needs ("spacing" or "font-size").

CONTEXT -- SgsLengthControl is being rebuilt in place with two scales chosen by a `scale` prop:
`spacing` (core's spacing-sizes look: preset select, value box, slider) and `font-size` (core's real
FontSizePicker). The scale is decided per ROLE, never per block, and the role is read from the
framework DB (FP-1), not from the label. This script is the DETECTOR half of the mount migration
(migration-method: detector before the 4th edit). It does not edit a mount.

ROLE RULE (every figure is derived from the DB row of the mounted attribute):
    font-size  the attribute's css_property includes `font-size`, OR its css_element is a glyph-like
               element (GLYPH_ELEMENTS: icon, glyph, dot, marker, arrow, badge glyph...) and its
               property is a width/height/font-size (a glyph is sized as text: icons, dots, numbers).
    plain      css_property is `line-height` (a ratio, not a length on either scale): stays a plain control.
    spacing    everything else length-shaped: gap, padding, offsets, width, height, radius, thickness...
    ROLE_EXCEPTIONS records a Bean ruling that overrides the DB reading, with the reason.

STORAGE (what the mount hands the control):
    string      one stored string (e.g. "20px", "50", "var(--wp--preset--spacing--50)")
    per-device  an object read per tier (value={ x?.[ tier ] })
    split-unit  a number plus a separate unit attribute, composed with composeUnit()/a template; such a
                mount cannot hold a preset var, so it is never moved to the font-size scale.

    python scripts/survey-length-control-scale.py --survey
    python scripts/survey-length-control-scale.py --survey --json > reports/migrations/length-control-scale-census.json
    python scripts/survey-length-control-scale.py --check        # ratcheted gate
    python scripts/survey-length-control-scale.py --self-test
"""
import argparse
import glob
import json
import os
import re
import sqlite3
import sys

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass


def _find_repo_root(start):
    cur = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(cur, '.git')):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            raise RuntimeError('repo root not found (.git missing)')
        cur = parent


ROOT = _find_repo_root(os.path.dirname(__file__))
SRC = os.path.join(ROOT, 'plugins', 'sgs-blocks', 'src')
BLOCKS_DIR = os.path.join(SRC, 'blocks')
DB_PATH = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')

MOUNT = '<SgsLengthControl'
# ResponsiveLengthControl and google-reviews' TierLength wrap SgsLengthControl for a per-device value; their callers choose the scale too.
MOUNT_RE = re.compile(r'<(?:SgsLengthControl|ResponsiveLengthControl|TierLength)(?=[\s/>])')
GLYPH_ELEMENTS = {'icon', 'glyph', 'dot', 'marker', 'arrow', 'caret', 'expander', 'bullet', 'badge-glyph'}
GLYPH_PROPERTY_RE = re.compile(r'(^|,)(width|height|font-size)(,|$)')

# Bean rulings that override the DB reading: 'slug/attr' -> (scale, reason). Never a per-file case.
ROLE_EXCEPTIONS = {
    'sgs/icon-list/iconBoxSize': ('spacing', 'the circle behind the icon is a box (its height), not a glyph'),
    'sgs/nav-bar-menu/submenuCaretSize': ('font-size', 'the caret is a glyph sized like text'),
    'sgs/nav-drawer-menu/submenuCaretSize': ('font-size', 'the caret is a glyph sized like text'),
    'sgs/google-reviews/arrowSize': ('spacing', 'the arrow button is a tap target (a box), not a glyph'),
    # Attributes a filter registers (not in block.json, so not in the DB), named by the extension that owns them.
    'extension/sgsChildWidth': ('spacing', 'extension attribute: a child width'),
    'extension/sgsChipGap': ('spacing', 'extension attribute: a gap between chips'),
}
# Generic components whose attribute is supplied by their caller (not resolvable from the file itself).
GENERIC_FILES = {
    'components/ResponsiveLengthControl.js': ('spacing', 'generic wrapper: must forward `scale` from its callers'),
    'components/MediaSizingPanel.js': ('spacing', 'media height and inset boxes'),
    'components/motion/DistanceAtom.js': ('spacing', 'motion distance length'),
    'components/motion/AngleAtom.js': ('plain', 'an angle in degrees, not a length: needs its own control, not either scale'),
}
EXTENSION_ATTRS =sorted(k.split('/', 1)[1] for k in ROLE_EXCEPTIONS if k.startswith('extension/'))

# The ratcheted ceilings: mounts still to move (font-size role not yet declared) and mounts whose
# attribute could not be resolved. Lower with a stated reason as mounts migrate; never raise.
CEILING = {'PENDING_FONT_SIZE': 19, 'WRONG_SCALE': 0, 'UNRESOLVED': 1}

RAW_UNIT_SIZE_RE = re.compile(r'size|width|height|gap|radius|thickness|offset', re.I)


def _read(path):
    if not os.path.isfile(path):
        return ''
    with open(path, encoding='utf-8', newline='') as fh:
        return fh.read()


def strip_comments(src):
    """Blank block and line comments (keeping offsets) so a docblock naming the control is not a mount."""
    def blank(m):
        return re.sub(r'[^\n]', ' ', m.group(0))
    src = re.sub(r'/\*.*?\*/', blank, src, flags=re.S)
    return re.sub(r'(?<![:\'"\\])//[^\n]*', blank, src)


def tag_end(src, start):
    """Offset just past the JSX opening tag that begins at `start` (brace-, quote- and template-aware)."""
    depth = 0
    quote = None
    i = start
    while i < len(src):
        ch = src[i]
        if quote:
            if ch == '\\':
                i += 1
            elif ch == quote:
                quote = None
        elif ch in '"\'`':
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        elif depth == 0 and ch == '>':
            return i + 1
        i += 1
    return len(src)


def prop_source(tag, name):
    """Source text of a JSX prop (`name={ ... }` or `name="..."`), or None when absent."""
    m = re.search(r'\b' + re.escape(name) + r'\s*=\s*', tag)
    if not m:
        return None
    i = m.end()
    if tag[i] in '"\'':
        j = tag.find(tag[i], i + 1)
        return tag[i + 1:j]
    if tag[i] != '{':
        return None
    depth = 0
    quote = None
    for j in range(i, len(tag)):
        ch = tag[j]
        if quote:
            if ch == quote:
                quote = None
        elif ch in '"\'`':
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if 0 == depth:
                return tag[i + 1:j].strip()
    return None


ATTR_REFS = (
    re.compile(r"\battr\s*=\s*\{?\s*['\"](\w+)['\"]"),
    re.compile(r'\battributes\.(\w+)'),
    re.compile(r"\battributes\[\s*['\"](\w+)['\"]\s*\]"),
    re.compile(r'\bsetAttributes\(\s*\{\s*(\w+)\s*:'),
)


def tuple_attrs(tag, src_before):
    """Attributes of a mount driven by a loop variable: `LIST.map( ( [ attr, ...` over `const LIST = [ [ 'a', ...`."""
    last = None
    for last in re.finditer(r'(\w+)\.map\(\s*\(\s*\[\s*attr\b', src_before):
        pass
    if not last or len(src_before) - last.start() > 900:
        return []
    arr = re.search(r'\b' + re.escape(last.group(1)) + r'\s*=\s*\[(.*?)\n\];', src_before, re.S)
    return re.findall(r"\[\s*['\"](\w+)['\"]", arr.group(1)) if arr else []


def attr_candidates(tag, before, known, whole=''):
    """Attribute names the mount reads or writes: those in its own tag first, else the nearest one before it."""
    in_tag = []
    for rx in ATTR_REFS:
        in_tag += [m.group(1) for m in rx.finditer(tag)]
    # Bare identifiers count only inside value/onChange: `label=` is a prop name, not the attribute `label`.
    body = ' '.join(prop_source(tag, p) or '' for p in ('value', 'onChange'))
    in_tag += [n for n in re.findall(r'\b[a-z]\w+', body) if n in known and n not in in_tag]
    in_tag = [n for n in dict.fromkeys(in_tag) if n in known]
    if not in_tag:
        looped = [n for n in tuple_attrs(tag, whole) if n in known]
        if looped:
            return looped, 'loop'
    if in_tag:
        return in_tag, 'tag'
    nearest = []
    for rx in ATTR_REFS:
        for m in rx.finditer(before):
            if m.group(1) in known:
                nearest.append((m.start(), m.group(1)))
    nearest.sort()
    return ([nearest[-1][1]] if nearest else []), 'window'


def storage_of(value_src):
    v = value_src or ''
    if re.search(r'composeUnit\(|\}\s*\$\{|\$\{[^}]*(Unit|unit)', v):
        return 'split-unit'
    if re.search(r'\?\.\[|\[\s*(tier|bp|breakpoint|device)\s*\]', v):
        return 'per-device'
    return 'string'


def parse_mounts(src, rel, known_by_block):
    """Every mount in one file's source -> list of dicts (no DB reading yet)."""
    clean = strip_comments(src)
    block = rel.split('blocks/')[1].split('/')[0] if 'blocks/' in rel else None
    owners = ['sgs/' + block] if block else None
    known = set(EXTENSION_ATTRS)
    for slug in (owners or known_by_block):
        known |= known_by_block.get(slug, set())
    out = []
    for m in MOUNT_RE.finditer(clean):
        tag = clean[m.start():tag_end(clean, m.start())]
        before = clean[max(0, m.start() - 1800):m.start()]
        attrs, basis = attr_candidates(tag, before, known, clean[:m.start()])
        if any(a.endswith('Unit') for a in attrs) and storage_of(prop_source(tag, 'value')) == 'split-unit':
            attrs = [a for a in attrs if not a.endswith('Unit')]
        label = prop_source(tag, 'label') or ''
        lm = re.search(r"['\"]([^'\"]{2,80})['\"]", label)
        value_src = prop_source(tag, 'value')
        out.append({
            'file': rel,
            'line': clean.count('\n', 0, m.start()) + 1,
            'label': lm.group(1) if lm else '(dynamic)',
            'owners': owners or ['(shared)'],
            'attrs': attrs,
            'attr_basis': basis if attrs else 'none',
            'storage': storage_of(value_src),
            'declared_scale': (prop_source(tag, 'scale') or '').strip('\'" ') or None,
            'generic': bool(not attrs and re.search(r'\[\s*attr\s*\]', tag)),
            'presets': 'presets' in re.findall(r'\b(presets)\b', tag),
        })
    return out


def load_attribute_names():
    names = {}
    for bj in glob.glob(os.path.join(BLOCKS_DIR, '*', 'block.json')):
        slug = 'sgs/' + os.path.basename(os.path.dirname(bj))
        with open(bj, encoding='utf-8') as fh:
            names[slug] = set((json.load(fh).get('attributes') or {}).keys())
    return names


def load_db_rows():
    """(slug, attr) -> (css_property, css_element), plus attr -> [rows] for shared files. Read-only."""
    con = sqlite3.connect('file:%s?mode=ro' % DB_PATH, uri=True)
    rows = {}
    by_attr = {}
    for slug, attr, prop, el in con.execute(
        "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE source='sgs'"
    ):
        rows[(slug, attr)] = (prop or '', el or '')
        by_attr.setdefault(attr, []).append((slug, prop or '', el or ''))
    con.close()
    return rows, by_attr


def role_of(prop, element):
    if 'line-height' == prop:
        return 'plain'
    if 'font-size' in prop.split(','):
        return 'font-size'
    if element in GLYPH_ELEMENTS and GLYPH_PROPERTY_RE.search(prop):
        return 'font-size'
    return 'spacing'


def classify(mount, db_rows, db_by_attr):
    """Fill role/proposed/reason on one parsed mount."""
    roles = set()
    reasons = []
    for attr in mount['attrs']:
        if 'extension/' + attr in ROLE_EXCEPTIONS:
            roles.add(ROLE_EXCEPTIONS['extension/' + attr][0])
            reasons.append(ROLE_EXCEPTIONS['extension/' + attr][1])
            continue
        for slug in mount['owners']:
            if slug == '(shared)':
                for s, prop, el in db_by_attr.get(attr, []):
                    roles.add(role_of(prop, el))
                continue
            key = '%s/%s' % (slug, attr)
            if key in ROLE_EXCEPTIONS:
                roles.add(ROLE_EXCEPTIONS[key][0])
                reasons.append(ROLE_EXCEPTIONS[key][1])
            elif (slug, attr) in db_rows:
                roles.add(role_of(*db_rows[(slug, attr)]))
    if mount.get('generic'):
        mount['proposed'] = 'spacing'
        mount['reason'] = 'generic wrapper: its callers are surveyed as their own mounts'
    elif mount.get('file') in GENERIC_FILES:
        mount['proposed'], mount['reason'] = GENERIC_FILES[mount['file']]
    elif not roles and mount['storage'] == 'split-unit':
        mount['proposed'] = 'spacing'
        mount['reason'] = 'split-unit storage cannot hold a preset var (attribute not resolved)'
    elif not roles:
        mount['proposed'] = 'unresolved'
        mount['reason'] = 'attribute not found in the DB for this block'
    elif len(roles) > 1 and 'loop' == mount.get('attr_basis'):
        mount['proposed'] = 'mixed-loop'
        mount['reason'] = 'one mount drives several attributes of different roles %s: scale must be chosen per attribute' % sorted(roles)
    elif len(roles) > 1:
        mount['proposed'] = 'unresolved'
        mount['reason'] = 'shared mount: blocks disagree %s' % sorted(roles)
    else:
        proposed = roles.pop()
        if proposed == 'font-size' and mount['storage'] == 'split-unit':
            proposed, reasons = 'spacing', ['split-unit storage cannot hold a preset var']
        mount['proposed'] = proposed
        mount['reason'] = '; '.join(reasons) or 'DB css_property/css_element'
    return mount


def scan():
    known = load_attribute_names()
    rows, by_attr = load_db_rows()
    mounts = []
    for path in sorted(glob.glob(os.path.join(SRC, '**', '*.js'), recursive=True)):
        src = _read(path)
        if not MOUNT_RE.search(src):
            continue
        rel = os.path.relpath(path, SRC).replace(os.sep, '/')
        mounts += parse_mounts(src, rel, known)
    return [classify(m, rows, by_attr) for m in mounts]


def raw_unit_controls():
    """Raw <UnitControl> mounts outside the shared length/box/spacing components, flagged when size-like."""
    skip = ('components/SgsLengthControl.js', 'components/SgsBoxControl.js', 'components/SpacingControl.js')
    out = []
    for path in sorted(glob.glob(os.path.join(SRC, '**', '*.js'), recursive=True)):
        rel = os.path.relpath(path, SRC).replace(os.sep, '/')
        if rel in skip:
            continue
        clean = strip_comments(_read(path))
        for m in re.finditer(r'<UnitControl(?=[\s/>])', clean):
            tag = clean[m.start():tag_end(clean, m.start())]
            label = prop_source(tag, 'label') or ''
            lm = re.search(r"['\"]([^'\"]{2,80})['\"]", label)
            text = lm.group(1) if lm else '(dynamic)'
            out.append({'file': rel, 'line': clean.count('\n', 0, m.start()) + 1, 'label': text,
                        'size_like': bool(RAW_UNIT_SIZE_RE.search(text))})
    return out


def raw_mention_count():
    """Corpus control: a dumb comment-stripped count of the mount string, independent of parse_mounts()."""
    total = 0
    for path in glob.glob(os.path.join(SRC, '**', '*.js'), recursive=True):
        total += len(MOUNT_RE.findall(strip_comments(_read(path))))
    return total


def crosscheck(mounts):
    failures = []
    raw = raw_mention_count()
    if raw != len(mounts):
        failures.append('CORPUS: raw count %d != parsed mounts %d' % (raw, len(mounts)))
    if len(mounts) < 100:
        failures.append('SANITY: only %d mounts found, expected well over 100. Scope collapsed.' % len(mounts))
    bad = [m for m in mounts if m['declared_scale'] not in (None, 'spacing', 'font-size')]
    for m in bad:
        failures.append('%s:%d declares an unknown scale %r' % (m['file'], m['line'], m['declared_scale']))
    return failures


def tally(mounts):
    pending = [m for m in mounts if m['proposed'] in ('font-size', 'mixed-loop') and m['declared_scale'] != 'font-size']
    wrong = [m for m in mounts if m['declared_scale'] == 'font-size' and m['proposed'] not in ('font-size', 'mixed-loop')]
    unresolved = [m for m in mounts if m['proposed'] == 'unresolved']
    return {'PENDING_FONT_SIZE': pending, 'WRONG_SCALE': wrong, 'UNRESOLVED': unresolved}


def cmd_survey(as_json):
    mounts = scan()
    cross = crosscheck(mounts)
    units = raw_unit_controls()
    if as_json:
        print(json.dumps({'mounts': mounts, 'raw_unit_controls': units, 'crosscheck_failures': cross},
                         indent=2, sort_keys=True))
        return 1 if cross else 0
    counts = {}
    for m in mounts:
        counts[m['proposed']] = counts.get(m['proposed'], 0) + 1
    print('=== SgsLengthControl + ResponsiveLengthControl scale census: %d mounts in %d files ===' % (
        len(mounts), len({m['file'] for m in mounts})))
    print('By proposed scale: %s\n' % counts)
    print('| proposed | storage | attribute(s) | label | file:line | basis | declared | reason |')
    print('|---|---|---|---|---|---|---|---|')
    order = {'font-size': 0, 'mixed-loop': 1, 'plain': 2, 'unresolved': 3, 'spacing': 4}
    for m in sorted(mounts, key=lambda x: (order[x['proposed']], x['label'].lower(), x['file'])):
        print('| %s | %s | %s | %s | %s:%d | %s | %s | %s |' % (
            m['proposed'], m['storage'], ', '.join(m['attrs']) or '-', m['label'], m['file'], m['line'],
            m['attr_basis'], m['declared_scale'] or '-', m['reason']))
    print('\n=== Raw <UnitControl> mounts outside the shared controls: %d (%d size-like) ===' % (
        len(units), sum(u['size_like'] for u in units)))
    for u in units:
        print('  %s %s:%d  %s' % ('SIZE' if u['size_like'] else '    ', u['file'], u['line'], u['label']))
    for f in cross:
        print('  ! %s' % f)
    return 1 if cross else 0


def cmd_check():
    mounts = scan()
    cross = crosscheck(mounts)
    if cross:
        print('CHECK FAILED -- crosscheck errors:')
        for f in cross:
            print('  ! %s' % f)
        return 1
    bad = []
    for key, items in tally(mounts).items():
        if len(items) > CEILING[key]:
            bad.append('%s: %d exceeds ceiling %d' % (key, len(items), CEILING[key]))
            bad += ['    %s:%d %s' % (m['file'], m['line'], m['label']) for m in items]
    if bad:
        print('CHECK FAILED:')
        print('\n'.join(bad))
        return 1
    print('CHECK OK -- %d mounts; open: %s' % (len(mounts), {k: len(v) for k, v in tally(mounts).items()}))
    return 0


def self_test():
    failures = []
    known = {'sgs/icon': {'iconSize', 'gap'}, 'sgs/x': {'gap', 'maxWidth'}}
    base = 'import S from "./S";\nfunction E(){ return (<>\n'
    src = base + (
        '<SgsLengthControl label={ __( "Gap", "d" ) } value={ attributes.gap || "" } onChange={ ( v ) => setAttributes( { gap: v } ) } />\n'
        '<SgsLengthControl label="Width" scale="font-size" value={ composeUnit( attributes.maxWidth, attributes.maxWidthUnit ) } onChange={ f } />\n'
        '{ /* <SgsLengthControl label="Commented" /> */ }\n'
        '// <SgsLengthControl label="Line comment" />\n'
        '<SgsLengthControl hideLabelFromVision value={ gap?.[ tier ] ?? "" } onChange={ f } />\n</>); }\n'
    )
    mounts = parse_mounts(src, 'blocks/x/edit.js', known)
    if len(mounts) != 3:
        failures.append('commented mounts must not count: expected 3, got %d' % len(mounts))
    if mounts and (mounts[0]['label'], mounts[0]['attrs'], mounts[0]['storage']) != ('Gap', ['gap'], 'string'):
        failures.append('positive mount mis-parsed: %r' % (mounts[0],))
    if len(mounts) > 1 and (mounts[1]['storage'], mounts[1]['declared_scale']) != ('split-unit', 'font-size'):
        failures.append('split-unit / declared scale mis-parsed: %r' % (mounts[1],))
    if len(mounts) > 2 and mounts[2]['storage'] != 'per-device':
        failures.append('per-device storage mis-parsed: %r' % (mounts[2],))
    if parse_mounts(src, 'blocks/x/edit.js', known) != mounts:
        failures.append('parse_mounts is not idempotent')
    if not (role_of('font-size,height,width', '') == 'font-size' and role_of('width', 'glyph') == 'font-size'
            and role_of('width', 'wrapper') == 'spacing' and role_of('line-height', 'title') == 'plain'
            and role_of('border-radius', 'item') == 'spacing'):
        failures.append('role_of() reading wrong')
    split = classify({'owners': ['sgs/x'], 'attrs': ['gap'], 'storage': 'split-unit'}, {('sgs/x', 'gap'): ('font-size', '')}, {})
    if split['proposed'] != 'spacing':
        failures.append('a split-unit mount must never propose font-size: %r' % (split,))
    neg = classify({'owners': ['sgs/x'], 'attrs': ['nope'], 'storage': 'string'}, {}, {})
    if neg['proposed'] != 'unresolved':
        failures.append('an unknown attribute must be unresolved, not defaulted: %r' % (neg,))
    # The gate can FAIL: a mount declaring font-size over a spacing role is WRONG_SCALE.
    fake = [{'proposed': 'spacing', 'declared_scale': 'font-size'}, {'proposed': 'font-size', 'declared_scale': None}]
    t = tally(fake)
    if len(t['WRONG_SCALE']) != 1 or len(t['PENDING_FONT_SIZE']) != 1:
        failures.append('tally() missed a wrong-scale or pending mount')
    for key in ROLE_EXCEPTIONS:
        slug, _, attr = key.rpartition('/')
        if 'extension' == slug:
            continue
        if attr not in load_attribute_names().get(slug, set()):
            failures.append('ROLE_EXCEPTIONS names an attribute that no longer exists: %s' % key)
    live = scan()
    if len(live) != raw_mention_count():
        failures.append('corpus control: parsed %d mounts, dumb count %d' % (len(live), raw_mention_count()))
    if failures:
        print('SELF-TEST FAILED (%d):' % len(failures))
        for f in failures:
            print('  ! %s' % f)
        return 1
    print('SELF-TEST OK -- 10 assertions passed.')
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
    sys.exit(cmd_survey(as_json=args.json))


if __name__ == '__main__':
    main()
