#!/usr/bin/env python3
"""Container band layers: contentWidth and padding on the ONE content-band layer.

Governing plan: .claude/plans/2026-10-21-handoff-readers.md, Status, Container band layers (Bean's decisions,
2026-10-22): every container-type block records `contentWidth` as `max-width` on its
content band, and `padding` paints the content band (`contentBandPadding` is folded
into `padding` and removed).

SCOPE
    Every block that declares the `contentWidth` attribute (disk: src/blocks/*/block.json,
    reconciled against the framework DB `block_attributes`; a mismatch is a finding).

RULES ENFORCED
    width    the manifest (`supports.sgs.elements` attrMap) declares
             `"css:max-width": "contentWidth"` on the content-band element; never
             `css:width`, never on the wrapper.
    padding  `padding` is declared on the content-band element, not the wrapper.
    residue  no `contentBandPadding` remains anywhere in source (manifests, wrapper,
             render.php, editors, includes, utils, theme, saved trees, route data).

WHAT --fix DOES
    Only the mechanical, manifest-local part: `"css:width": "contentWidth"` on an
    element that is already the content band becomes `"css:max-width": "contentWidth"`.
    Everything else (shared wrapper, per-block render, editors, utils, theme content,
    saved trees, route data) needs design, not a rewrite, and is reported as a worklist
    grouped by mechanism.

GATE SHAPE
    `--check` is binary (exit 1 while any target remains).
    `--check --ratchet` is the registered gate: a ratcheted ceiling kept in the sibling
    check-container-band-layers-baseline.json (fails on a site outside the baseline and
    on a baseline entry no longer reproduced, so the baseline only ever shrinks).

    python check-container-band-layers.py --survey [--json [--out FILE]]
    python check-container-band-layers.py --fix [--apply]
    python check-container-band-layers.py --check [--ratchet]
    python check-container-band-layers.py --write-baseline
    python check-container-band-layers.py --self-test
"""
import argparse
import difflib
import glob
import json
import os
import re
import sqlite3
import sys
import tempfile

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

# scripts/ -> sgs-blocks/ -> plugins/ -> repo root
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BLOCKS_GLOB = 'plugins/sgs-blocks/src/blocks/*/block.json'
BASELINE = 'plugins/sgs-blocks/scripts/check-container-band-layers-baseline.json'
CENSUS = 'reports/migrations/container-band-layers-census.json'
DB_PATH = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
TOKEN = 'contentBandPadding'

WIDTH_ATTR = 'contentWidth'
PADDING_ATTRS = ('padding', 'native:spacing.padding')
BAND_SELECTOR = re.compile(r'content-band|sgs-container__inner')
SKIP_DIRS = {'.git', 'node_modules', 'vendor', '__pycache__'}
SKIP_PREFIXES = ('.claude/worktrees', '.claude/secrets', 'plugins/sgs-blocks/build')
TEXT_SUFFIXES = {'.php', '.js', '.mjs', '.cjs', '.json', '.py', '.csv', '.html', '.css',
                 '.md', '.txt', '.ts', '.tsx', '.jsx', '.yml', '.yaml'}

# Files that carry the token legitimately and are not work: path test -> reason.
# These are also the WIDTH_OK list for the corpus-width control.
EXEMPT_RULES = (
    (lambda r: r.endswith('.md'), 'documentation'),
    (lambda r: r.startswith('.claude/'), 'plan, spec, catalogue or dated report'),
    (lambda r: r.startswith('reports/'), 'dated report or this migration\'s census'),
    (lambda r: '/fixtures/' in r, 'detector fixture: the token is the input under test'),
    (lambda r: re.match(r'^sites/[^/]+/build/qa/', r) is not None,
     'a Fill, Solve, triage or confirm run report: it names settings it measured and saves none'),
    (lambda r: r.startswith('plugins/sgs-blocks/scripts/check-container-band-layers'),
     'this detector, its baseline and its census'),
    (lambda r: r.startswith('plugins/sgs-blocks/includes/class-sgs-band-padding-'),
     'the saved-content migration: it names the retired attribute it folds into padding'),
)

# Generated from block.json by the reseed / consistency generators: they follow once
# the source changes, so they are counted but are not edit targets.
DERIVED = {
    'plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json',
    'plugins/sgs-blocks/scripts/consistency/attr-role-map.json',
    'plugins/sgs-blocks/scripts/consistency/setting-registry-css.json',
    'plugins/sgs-blocks/scripts/consistency/setting-registry.json',
}

# Where a token mention lives -> the mechanism that has to change. First match wins.
ZONES = (
    (r'^plugins/sgs-blocks/includes/class-sgs-container-wrapper\.php$', 'shared-wrapper'),
    (r'^plugins/sgs-blocks/includes/[^/]+\.php$', 'shared-includes'),
    (r'^plugins/sgs-blocks/src/blocks/[^/]+/block\.json$', 'manifests'),
    (r'^plugins/sgs-blocks/src/blocks/[^/]+/render[^/]*\.php$', 'per-block-render'),
    (r'^plugins/sgs-blocks/src/blocks/.+\.js$', 'editors'),
    (r'^plugins/sgs-blocks/src/utils/[^/]+\.js$', 'utils'),
    (r'^plugins/sgs-blocks/tests/', 'tooling-and-tests'),
    (r'^plugins/sgs-blocks/scripts/', 'tooling-and-tests'),
    (r'^theme/sgs-theme/', 'theme-content'),
    (r'^sites/[^/]+/build/', 'saved-trees'),
    (r'^scripts/computed-route/', 'route-data'),
    (r'^scripts/', 'tooling-and-tests'),
)
ZONES = tuple((re.compile(p), m) for p, m in ZONES)

# Independent enumeration used by the corpus control: globs, not the ZONES table.
NARROW_GLOBS = (
    'plugins/sgs-blocks/src/blocks/**/*', 'plugins/sgs-blocks/src/utils/*.js',
    'plugins/sgs-blocks/includes/*.php', 'plugins/sgs-blocks/tests/**/*',
    'plugins/sgs-blocks/scripts/**/*', 'theme/sgs-theme/**/*', 'sites/*/build/**/*',
    'scripts/**/*',
)

WRAPPER_CODE_PATH = (
    "includes/class-sgs-container-wrapper.php::SGS_Container_Wrapper::render: on a block "
    "that declares contentWidth, `padding` paints the content band "
    "(.sgs-container__inner, via $obj_band_props and the native-padding rule), the outer "
    "element keeps no padding. The band renders ($do_wrap) whenever contentWidth or any "
    "band prop (padding included) is set."
)


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


# --------------------------------------------------------------------------- blocks

def read_text(path):
    with open(path, 'r', encoding='utf-8', newline='') as fh:
        return fh.read()


def atomic_write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)
    os.replace(tmp, path)


def elements_of(bj):
    els = (((bj.get('supports') or {}).get('sgs') or {}).get('elements')) or {}
    return {k: v for k, v in els.items() if isinstance(v, dict)}


def is_band(key, el):
    sel = el.get('selector') or ''
    if key == 'content-band' or BAND_SELECTOR.search(sel):
        return True
    return False


def width_decls(bj):
    """Every manifest declaration of contentWidth: (element key, is_band, css prop)."""
    out = []
    for key, el in elements_of(bj).items():
        for prop, attr in (el.get('attrMap') or {}).items():
            if attr == WIDTH_ATTR:
                out.append((key, is_band(key, el), prop))
    return out


def padding_decls(bj):
    """Every manifest declaration of the block's own padding: (key, role)."""
    out = []
    for key, el in elements_of(bj).items():
        for prop, attr in (el.get('attrMap') or {}).items():
            if prop == 'css:padding' and attr in PADDING_ATTRS:
                role = 'band' if is_band(key, el) else (
                    'wrapper' if el.get('isWrapper') or el.get('layer') == 'OUTER' else 'part')
                out.append((key, role))
    return out


def width_state(decls, has_band=False):
    if not decls:
        return 'undeclared-band-present' if has_band else 'undeclared-no-band'
    if any(b and p == 'css:max-width' for _, b, p in decls):
        return 'ok'
    if any(b and p == 'css:width' for _, b, p in decls):
        return 'css-width-on-band'
    if any(p == 'css:max-width' for _, _, p in decls):
        return 'max-width-on-wrapper'
    return 'css-width-on-wrapper'


def padding_state(decls):
    if any(r == 'band' for _, r in decls):
        return 'on-band'
    if any(r in ('wrapper', 'part') for _, r in decls):
        return 'on-wrapper'
    return 'none'


def db_connect():
    if not os.path.exists(DB_PATH):
        return None
    return sqlite3.connect('file:%s?mode=ro' % DB_PATH.replace('\\', '/'), uri=True)


def db_facts():
    """(set of slugs declaring contentWidth, {slug: container_kind}, set with contentBandPadding)."""
    con = db_connect()
    if con is None:
        return None
    try:
        cw = {r[0] for r in con.execute(
            "SELECT DISTINCT block_slug FROM block_attributes WHERE attr_name=? AND source='sgs'",
            (WIDTH_ATTR,))}
        kinds = dict(con.execute(
            'SELECT block_slug, container_kind FROM block_composition').fetchall())
        cbp = {r[0] for r in con.execute(
            "SELECT DISTINCT block_slug FROM block_attributes WHERE attr_name=? AND source='sgs'",
            (TOKEN,))}
    finally:
        con.close()
    return cw, kinds, cbp


def own_inner_markup(render_text, slug):
    """Own band-like markup in the block's render, beyond the shared wrapper's band."""
    short = slug.split('/', 1)[1]
    hits = sorted(set(re.findall(r'sgs-%s__(?:inner|content-band)' % re.escape(short), render_text)))
    return hits


def band_notes(render_text):
    notes = []
    if re.search(r"""wrap_inner'?\]?\s*(?:=>|=)\s*false""", render_text):
        notes.append('wrapper band suppressed in some layouts (wrap_inner false)')
    if re.search(r"""wrap_inner'?\s*=>\s*true""", render_text):
        notes.append('wrapper band forced on (wrap_inner true)')
    return notes


def block_census(db):
    blocks, disk = [], set()
    for path in sorted(glob.glob(os.path.join(ROOT, *BLOCKS_GLOB.split('/')))):
        bj = json.loads(read_text(path))
        attrs = bj.get('attributes') or {}
        slug = bj.get('name') or ''
        if WIDTH_ATTR not in attrs:
            continue
        disk.add(slug)
        folder = os.path.dirname(path)
        render_path = os.path.join(folder, 'render.php')
        render_text = read_text(render_path) if os.path.exists(render_path) else ''
        wdecls = width_decls(bj)
        pdecls = padding_decls(bj)
        pstate = padding_state(pdecls)
        band_el = next((k for k, e in sorted(elements_of(bj).items(), key=lambda kv: kv[0] != 'content-band')
                       if is_band(k, e)), None)
        wstate = width_state(wdecls, band_el is not None)
        kind = (db[1].get(slug) if db else None)
        blocks.append({
            'block': slug,
            'kind': kind,
            'manifest': rel(path),
            'renders_via_shared_wrapper': 'SGS_Container_Wrapper' in render_text,
            'band': {
                'rendered_by': 'shared-wrapper (.sgs-container__inner), only when contentWidth or a band prop is set',
                'manifest_band_element': band_el,
                'own_markup': own_inner_markup(render_text, slug),
                'notes': band_notes(render_text),
            },
            'padding': {'state': pstate, 'declared_on': pdecls,
                        'exempt': 'declares no padding attribute in its manifest' if pstate == 'none' else None},
            'contentWidth': {'state': wstate, 'declared_on': [
                {'element': k, 'band': b, 'prop': p} for k, b, p in wdecls],
                'mechanical': wstate == 'css-width-on-band'},
            'has_contentBandPadding': TOKEN in attrs,
        })
    return blocks, disk


# --------------------------------------------------------------------------- token files

def exempt_reason(r):
    for test, reason in EXEMPT_RULES:
        if test(r):
            return reason
    return None


def zone_of(r):
    for pat, mech in ZONES:
        if pat.search(r):
            return mech
    return None


def tracked_files():
    """The files git tracks: the corpus is the same in every checkout and worktree, so local run output,
    caches and pipeline state (untracked or ignored) never move the census or the ceiling."""
    import subprocess
    out = subprocess.run(['git', '-C', ROOT, 'ls-files', '-z'], capture_output=True, check=True).stdout
    return {f.decode('utf-8') for f in out.split(b'\0') if f}


def wide_token_files():
    """Dumb wide walk: every text file in the repo that contains the token."""
    out = []
    needle = TOKEN.encode()
    tracked = tracked_files()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        drel = rel(dirpath) if dirpath != ROOT else ''
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not any(
            (drel + '/' + d).lstrip('/').startswith(p) for p in SKIP_PREFIXES)]
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() not in TEXT_SUFFIXES:
                continue
            p = os.path.join(dirpath, fn)
            if rel(p) not in tracked:
                continue
            try:
                with open(p, 'rb') as fh:
                    data = fh.read()
            except OSError:
                continue
            n = data.count(needle)
            if n:
                out.append((rel(p), n))
    return sorted(out)


def narrow_token_files():
    out = set()
    needle = TOKEN.encode()
    tracked = tracked_files()
    for g in NARROW_GLOBS:
        for p in glob.glob(os.path.join(ROOT, *g.split('/')), recursive=True):
            if not os.path.isfile(p) or rel(p) not in tracked:
                continue
            try:
                with open(p, 'rb') as fh:
                    if needle in fh.read():
                        out.add(rel(p))
            except OSError:
                continue
    return out


def file_census(wide):
    files = []
    for r, n in wide:
        ex = exempt_reason(r)
        if ex:
            files.append({'path': r, 'mentions': n, 'status': 'exempt', 'mechanism': None, 'reason': ex})
        elif r in DERIVED:
            files.append({'path': r, 'mentions': n, 'status': 'derived', 'mechanism': 'derived-by-reseed',
                          'reason': 'generated from block.json; regenerates once the source changes'})
        elif zone_of(r):
            files.append({'path': r, 'mentions': n, 'status': 'target', 'mechanism': zone_of(r), 'reason': None})
        else:
            files.append({'path': r, 'mentions': n, 'status': 'unrecognised', 'mechanism': None,
                          'reason': 'no zone rule matches this path'})
    return files


def corpus_control(wide, narrow):
    """Wide-but-not-narrow files must be exempt; narrow-but-not-wide cannot happen."""
    wide_paths = {r for r, _ in wide}
    fails = []
    for r in sorted(wide_paths - narrow):
        if not exempt_reason(r):
            fails.append('corpus width: %s mentions %s but is outside the narrow target globs '
                         'and has no EXEMPT_RULES reason' % (r, TOKEN))
    for r in sorted(narrow - wide_paths):
        fails.append('corpus width: %s is in the narrow list but the wide walk missed it' % r)
    return fails


# --------------------------------------------------------------------------- census

def build_census():
    db = db_facts()
    blocks, disk = block_census(db)
    mismatch = {'db_available': db is not None, 'db_only': [], 'disk_only': [],
                'cbp_db_vs_disk': []}
    if db:
        mismatch['db_only'] = sorted(db[0] - disk)
        mismatch['disk_only'] = sorted(disk - db[0])
        disk_cbp = {b['block'] for b in blocks if b['has_contentBandPadding']}
        mismatch['cbp_db_vs_disk'] = sorted(db[2] ^ disk_cbp)
    wide = wide_token_files()
    files = file_census(wide)
    narrow = narrow_token_files()
    cross = corpus_control(wide, narrow)
    for g in missing_exclusions():
        cross.append(g)

    def tally(items, fn):
        t = {}
        for i in items:
            k = fn(i)
            t[k] = t.get(k, 0) + 1
        return dict(sorted(t.items()))

    worklist = {}
    for f in files:
        if f['status'] in ('target', 'derived'):
            w = worklist.setdefault(f['mechanism'], {'files': 0, 'mentions': 0, 'paths': []})
            w['files'] += 1
            w['mentions'] += f['mentions']
            w['paths'].append(f['path'])
    for w in worklist.values():
        w['paths'].sort()
    return {
        'rule': 'contentWidth is max-width on the content band; padding paints the content band; no contentBandPadding',
        'plan': '.claude/plans/2026-10-21-handoff-readers.md (Status, Container band layers)',
        'wrapper_code_path': WRAPPER_CODE_PATH,
        'totals': {
            'blocks_with_contentWidth': len(blocks),
            'contentWidth_state': tally(blocks, lambda b: b['contentWidth']['state']),
            'padding_state': tally(blocks, lambda b: b['padding']['state']),
            'blocks_with_manifest_band_element': sum(1 for b in blocks if b['band']['manifest_band_element']),
            'blocks_with_contentBandPadding_attr': sum(1 for b in blocks if b['has_contentBandPadding']),
            'blocks_mechanically_fixable': sum(1 for b in blocks if b['contentWidth']['mechanical']),
            'padding_exempt_blocks': sum(1 for b in blocks if b['padding']['exempt']),
            'token_files_by_status': tally(files, lambda f: f['status']),
            'token_files_target_by_mechanism': tally([f for f in files if f['status'] == 'target'],
                                                     lambda f: f['mechanism']),
            'unrecognised': sum(1 for f in files if f['status'] == 'unrecognised'),
            'refused': 0,
        },
        'db_disk': mismatch,
        'blocks': blocks,
        'files': files,
        'worklist_by_mechanism': dict(sorted(worklist.items())),
        'crosscheck_failures': cross,
    }


def missing_exclusions():
    # Every path a rule names must still exist; a stale exemption looks like no exemption.
    out = []
    for p in sorted(DERIVED):
        if not os.path.exists(os.path.join(ROOT, *p.split('/'))):
            out.append('stale DERIVED entry (path gone): %s' % p)
    return out


def findings(census):
    """Content-keyed live targets: {key: count}. Exempt and derived rows are not counted."""
    live = {}
    for b in census['blocks']:
        if b['contentWidth']['state'] != 'ok':
            live['width:%s:%s' % (b['block'], b['contentWidth']['state'])] = 1
        if b['padding']['state'] == 'on-wrapper':
            live['padding:%s:on-wrapper' % b['block']] = 1
    db = census['db_disk']
    for s in db['db_only']:
        live['db-only:%s' % s] = 1
    for s in db['disk_only']:
        live['disk-only:%s' % s] = 1
    for s in db['cbp_db_vs_disk']:
        live['db-cbp-mismatch:%s' % s] = 1
    for f in census['files']:
        if f['status'] == 'target':
            live['file:%s' % f['path']] = f['mentions']
    return live


# --------------------------------------------------------------------------- transform

WIDTH_LINE = re.compile(r'^(\s*)"css:width"(\s*:\s*)"contentWidth"(,?)(\r?\n)?$')


def transform(text, relpath):
    """Shape-to-shape: the band element's `css:width: contentWidth` becomes `css:max-width`.

    Returns (new_text, records) where each record is (kind, detail). Pure and idempotent.
    """
    try:
        bj = json.loads(text)
    except ValueError:
        return text, [('unrecognised', 'not valid JSON')]
    if not isinstance(bj, dict):
        return text, []
    decls = width_decls(bj)
    todo = [d for d in decls if d[1] and d[2] == 'css:width']
    if not todo:
        return text, []
    if len(todo) != 1:
        return text, [('unrecognised', 'more than one band css:width contentWidth declaration')]
    key = todo[0][0]
    if 'css:max-width' in (elements_of(bj)[key].get('attrMap') or {}):
        return text, [('unrecognised', 'band element %s already declares css:max-width' % key)]
    lines = text.splitlines(keepends=True)
    idx = [i for i, ln in enumerate(lines) if WIDTH_LINE.match(ln)]
    if len(idx) != 1:
        return text, [('unrecognised', 'css:width contentWidth line not found exactly once')]
    m = WIDTH_LINE.match(lines[idx[0]])
    lines[idx[0]] = '%s"css:max-width"%s"contentWidth"%s%s' % (m.group(1), m.group(2), m.group(3), m.group(4) or '')
    return ''.join(lines), [('css-width-on-band', 'element %s' % key)]


def preview(old, new, relpath):
    return ''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                                        fromfile='a/' + relpath, tofile='b/' + relpath))


def run_fix(apply_changes):
    changed, unrec = [], []
    for path in sorted(glob.glob(os.path.join(ROOT, *BLOCKS_GLOB.split('/')))):
        old = read_text(path)
        if WIDTH_ATTR not in old:
            continue
        new, recs = transform(old, rel(path))
        for kind, detail in recs:
            if kind == 'unrecognised':
                unrec.append((rel(path), detail))
        if new != old:
            changed.append(rel(path))
            if apply_changes:
                atomic_write(path, new)
            else:
                sys.stdout.write(preview(old, new, rel(path)))
    return changed, unrec


# --------------------------------------------------------------------------- reporting

def print_survey(c):
    t = c['totals']
    print('blocks declaring contentWidth: %d (DB/disk mismatch: db-only=%s disk-only=%s cbp=%s; db_available=%s)'
          % (t['blocks_with_contentWidth'], c['db_disk']['db_only'], c['db_disk']['disk_only'],
             c['db_disk']['cbp_db_vs_disk'], c['db_disk']['db_available']))
    print('contentWidth manifest state:', t['contentWidth_state'])
    print('padding manifest state    :', t['padding_state'], '(exempt: %d)' % t['padding_exempt_blocks'])
    print('manifest band element     : %d of %d; mechanically fixable: %d; contentBandPadding attr: %d'
          % (t['blocks_with_manifest_band_element'], t['blocks_with_contentWidth'],
             t['blocks_mechanically_fixable'], t['blocks_with_contentBandPadding_attr']))
    print('token files by status     :', t['token_files_by_status'])
    print('target files by mechanism :', t['token_files_target_by_mechanism'])
    print('unrecognised: %d   refused: %d' % (t['unrecognised'], t['refused']))
    print('')
    print('%-24s %-8s %-22s %-14s %-5s %s' % ('block', 'kind', 'width', 'padding', 'cbp', 'band element'))
    for b in c['blocks']:
        print('%-24s %-8s %-22s %-14s %-5s %s' % (
            b['block'], b['kind'] or '-', b['contentWidth']['state'], b['padding']['state'],
            'yes' if b['has_contentBandPadding'] else 'no', b['band']['manifest_band_element'] or '-'))
    print('')
    for mech, w in c['worklist_by_mechanism'].items():
        print('worklist %-18s %2d file(s), %3d mention(s)' % (mech, w['files'], w['mentions']))
    for f in c['crosscheck_failures']:
        print('CROSSCHECK:', f)
    for f in c['files']:
        if f['status'] == 'unrecognised':
            print('UNRECOGNISED:', f['path'])


def gate_problems(c, ratchet):
    probs = list(c['crosscheck_failures'])
    probs += ['unrecognised token file: %s' % f['path'] for f in c['files'] if f['status'] == 'unrecognised']
    live = findings(c)
    if not ratchet:
        if live:
            probs.append('%d target(s) remain (%d block-level, %d file-level)' % (
                len(live), sum(1 for k in live if not k.startswith('file:')),
                sum(1 for k in live if k.startswith('file:'))))
        return probs
    path = os.path.join(ROOT, *BASELINE.split('/'))
    if not os.path.exists(path):
        return probs + ['baseline missing: %s (run --write-baseline)' % BASELINE]
    base = json.loads(read_text(path)).get('entries', {})
    for k, n in sorted(live.items()):
        if n > base.get(k, 0):
            probs.append('NEW or grown: %s (live %d > baseline %d)' % (k, n, base.get(k, 0)))
    for k, n in sorted(base.items()):
        if live.get(k, 0) < n:
            probs.append('baseline can shrink: %s (live %d < baseline %d); run --write-baseline' % (k, live.get(k, 0), n))
    return probs


def write_baseline(c):
    live = findings(c)
    path = os.path.join(ROOT, *BASELINE.split('/'))
    if os.path.exists(path):
        old = json.loads(read_text(path)).get('entries', {})
        grown = [k for k, n in live.items() if n > old.get(k, 0)]
        if grown:
            print('REFUSED: the ceiling is monotonic downward; these are new or grown:\n  ' + '\n  '.join(grown))
            return 1
    comp = {}
    for k, n in live.items():
        grp = k.split(':', 1)[0] if not k.startswith('file:') else 'file'
        comp[grp] = comp.get(grp, 0) + 1
    doc = {
        '_note': ('Ratcheted ceiling for check-container-band-layers.py --check --ratchet. Entries are '
                  'content keys with a count (a file key counts its contentBandPadding mentions). The ceiling '
                  'only moves down: lower it with --write-baseline after a drop; raising it is refused. '
                  'Exit condition: empty, then promote the gate to binary --check.'),
        'ceiling': len(live),
        'composition': dict(sorted(comp.items())),
        'entries': dict(sorted(live.items())),
    }
    atomic_write(path, json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    print('baseline written: ceiling %d %s' % (len(live), doc['composition']))
    return 0


# --------------------------------------------------------------------------- self-test

def _bj(extra_attrmap, key='content-band', selector=None, wrapper_width=None):
    wrapper_map = {'css:max-width': 'maxWidth', 'css:padding': 'padding'}
    if wrapper_width:
        wrapper_map[wrapper_width] = 'contentWidth'
    els = {'wrapper': {'isWrapper': True, 'layer': 'OUTER', 'attrMap': wrapper_map}}
    if extra_attrmap is not None:
        els[key] = {'layer': 'CONTENT', 'attrMap': extra_attrmap}
        if selector:
            els[key]['selector'] = selector
    return json.dumps({'name': 'sgs/fixture', 'attributes': {'contentWidth': {'type': 'object'}},
                       'supports': {'sgs': {'elements': els}}}, indent='\t') + '\n'


def self_test():
    fails = []

    def check(name, ok):
        print('  %s %s' % ('ok  ' if ok else 'FAIL', name))
        if not ok:
            fails.append(name)

    positive = _bj({'css:width': 'contentWidth'})
    out, recs = transform(positive, 'fixture/block.json')
    check('positive: band css:width becomes css:max-width',
          '"css:max-width": "contentWidth"' in out and '"css:width"' not in out
          and recs == [('css-width-on-band', 'element content-band')])
    check('positive: only that line differs',
          sum(1 for a, b in zip(positive.splitlines(), out.splitlines()) if a != b) == 1)

    definition = _bj({'css:max-width': 'contentWidth'})
    out_d, recs_d = transform(definition, 'fixture/block.json')
    check('definition: already css:max-width on the band is left alone',
          out_d == definition and not recs_d and width_state(width_decls(json.loads(definition))) == 'ok')

    edge = _bj(None, wrapper_width='css:width')
    out_e, recs_e = transform(edge, 'fixture/block.json')
    check('edge: wrapper-level css:width is NOT mechanical (needs a band element)',
          out_e == edge and not recs_e
          and width_state(width_decls(json.loads(edge))) == 'css-width-on-wrapper')
    check('edge: contentWidth on the wrapper max-width is classed, not fixed',
          width_state(width_decls(json.loads(_bj(None, wrapper_width='css:max-width')))) == 'max-width-on-wrapper')
    check('edge: no declaration, no band element -> undeclared-no-band',
          width_state(width_decls(json.loads(_bj(None)))) == 'undeclared-no-band')
    check('edge: no declaration, band element present -> undeclared-band-present',
          width_state(width_decls(json.loads(_bj({'css:gap': 'gap'}))), True) == 'undeclared-band-present')

    inert = json.dumps({'name': 'sgs/other', 'attributes': {'x': {}}}, indent='\t') + '\n'
    out_i, recs_i = transform(inert, 'fixture/block.json')
    check('negative control: block without contentWidth is byte-identical',
          out_i == inert and not recs_i)

    once, _ = transform(positive, 'fixture/block.json')
    twice, _ = transform(once, 'fixture/block.json')
    check('idempotence: transform(transform(x)) == transform(x)', once == twice)

    crlf = positive.replace('\n', '\r\n')
    out_c, _ = transform(crlf, 'fixture/block.json')
    check('CRLF preserved', out_c.count('\r\n') == crlf.count('\r\n') and '\n' not in out_c.replace('\r\n', ''))

    both = _bj({'css:width': 'contentWidth', 'css:max-width': 'other'})
    out_b, recs_b = transform(both, 'fixture/block.json')
    check('refusal: band already holding css:max-width is unrecognised, untouched',
          out_b == both and [k for k, _ in recs_b] == ['unrecognised'])

    check('padding on wrapper is classed on-wrapper',
          padding_state(padding_decls(json.loads(positive))) == 'on-wrapper')
    withband = _bj({'css:max-width': 'contentWidth', 'css:padding': 'padding'})
    check('padding on the band is classed on-band',
          padding_state(padding_decls(json.loads(withband))) == 'on-band')
    check('padding-less manifest is classed none',
          padding_state(padding_decls(json.loads(inert))) == 'none')

    # Corpus control: the wide list must reconcile with the narrow one.
    check('corpus: agreeing lists produce no failure',
          corpus_control([('plugins/sgs-blocks/src/utils/a.js', 1)], {'plugins/sgs-blocks/src/utils/a.js'}) == [])
    check('corpus: a wide-only non-exempt file FAILS closed',
          len(corpus_control([('somewhere/new.php', 1)], set())) == 1)
    check('corpus: a wide-only exempt file (docs) is accepted',
          corpus_control([('docs/x.md', 1)], set()) == [])
    check('corpus: a narrow-only file FAILS',
          len(corpus_control([], {'scripts/a.py'})) == 1)
    check('every DERIVED path still exists on disk', missing_exclusions() == [])
    check('zone table covers a theme pattern and a saved tree',
          zone_of('theme/sgs-theme/patterns/x.php') == 'theme-content'
          and zone_of('sites/acme/build/trees/home.json') == 'saved-trees'
          and zone_of('somewhere/else.php') is None)

    # Atomic write leaves no .tmp behind and round-trips bytes.
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'block.json')
        atomic_write(p, crlf)
        check('atomic write round-trips CRLF and leaves no .tmp',
              read_text(p) == crlf and not os.path.exists(p + '.tmp'))

    # Ratchet logic on a synthetic census.
    synthetic = {'blocks': [{'block': 'sgs/a', 'contentWidth': {'state': 'undeclared-no-band'},
                             'padding': {'state': 'on-wrapper'}}],
                 'db_disk': {'db_only': [], 'disk_only': [], 'cbp_db_vs_disk': []},
                 'files': [{'status': 'target', 'path': 'x.js', 'mentions': 2},
                           {'status': 'exempt', 'path': 'y.md', 'mentions': 9}],
                 'crosscheck_failures': []}
    live = findings(synthetic)
    check('findings count targets only (exempt excluded)',
          live == {'width:sgs/a:undeclared-no-band': 1, 'padding:sgs/a:on-wrapper': 1, 'file:x.js': 2})
    return fails


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--out')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--ratchet', action='store_true')
    ap.add_argument('--write-baseline', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()

    if a.self_test:
        fails = self_test()
        print('\n' + ('SELF-TEST FAILED (%d)' % len(fails) if fails else 'self-test: all assertions passed'))
        return 1 if fails else 0

    if a.fix:
        changed, unrec = run_fix(a.apply)
        print('\n%d manifest(s) %s' % (len(changed), 'REWRITTEN' if a.apply else 'would change (dry run; add --apply)'))
        for r, d in unrec:
            print('UNRECOGNISED: %s: %s' % (r, d))
        return 1 if unrec else 0

    census = build_census()

    if a.write_baseline:
        return write_baseline(census)

    if a.check:
        probs = gate_problems(census, a.ratchet)
        live = findings(census)
        if probs:
            print('FAIL (%s): %d live target(s)' % ('ratchet' if a.ratchet else 'binary', len(live)))
            for p in probs:
                print('  - %s' % p)
            return 1
        print('PASS (%s): %d live target(s) within the ceiling' % ('ratchet' if a.ratchet else 'binary', len(live)))
        return 0

    # --survey, and the default.
    if a.json:
        text = json.dumps(census, indent=2, ensure_ascii=False) + '\n'
        if a.out:
            atomic_write(os.path.join(ROOT, *a.out.split('/')), text)
            print('census written: %s' % a.out)
        else:
            sys.stdout.write(text)
        return 0
    print_survey(census)
    return 0


if __name__ == '__main__':
    sys.exit(main())
