#!/usr/bin/env python3
"""CR6: move padding, margin and corner-radius boxes off the shorthands that zero-fill unset sides.

THE DEFECT. includes/helpers-box.php returns four-value shorthands, and a shorthand sets every side or
corner, so an unset one prints as 0 and wipes the block's own default or a wider @media tier's value.
Two helpers are migrated, each to its longhand sibling that prints only the set sides:
    box     sgs_box_object_shorthand( $box )     → sgs_box_object_longhands( $box, '<family>' )
            families padding and margin; prints padding-top:12px;padding-left:…
    corner  sgs_corner_object_shorthand( $box )  → sgs_corner_object_longhands( $box )
            the single family is border-radius and the helper takes no family argument;
            prints border-top-left-radius:20px;border-bottom-right-radius:4px

THE SHAPE (coupled, two statements). A site is a variable assigned from the helper whose every other
use is one of:
    (a) a guard           null !== $v   /   $v !== null   /   '' !== $v   /   $v !== ''
    (b) an interpolation  "padding:{$v}"     (also inside a whole rule: "{$sel}{margin:{$v};}}")
    (c) a concatenation   'padding:' . $v   (the family ends a quoted segment)
The transform rewrites the assignment to the longhand helper AND every (b)/(c) use to drop the
"<family>:" prefix, in one pass. Changing only the call would print "padding:padding-top:12px", which
the browser drops whole, so a variable with ANY other use is refused and left untouched.

FAMILIES. padding and margin for the box helper, border-radius for the corner helper. A border width
keeps the shorthand on purpose: border-style is written for all four sides, so an unset width SHOULD be
0; a longhand would leave it at the browser's `medium` and paint phantom borders (G5,
tests/php/run-border-default-style-standalone.php). A use whose family is a custom property
(`--sgs-…:`) is a var() holdout, stored for a later `padding: var()` / `border-radius: var()` read where
a longhand cannot go, and is refused.

EDITOR. A block migrated to the box helper must not preview padding/margin through a 0-filling editor
helper; a block migrated to the corner helper must not preview its border radius through one (the
corner arm of editor_mismatches()).

Plan: .claude/plans/2026-10-07-cr6-box-longhand-migration.md (U2). Method: .claude/THE-MIGRATION-METHOD.md.

Usage (from plugins/sgs-blocks):
    python scripts/migrate-box-longhands.py --survey            census to stdout
    python scripts/migrate-box-longhands.py --survey --json     also writes reports/migrations/box-longhands-census.json
    python scripts/migrate-box-longhands.py --fix [--only slug,slug]          unified diff, no writes
    python scripts/migrate-box-longhands.py --fix --apply [--only slug,slug]  writes
    python scripts/migrate-box-longhands.py --write-baseline    pins today's migratable sites
    python scripts/migrate-box-longhands.py --check             gate: exit 1 on a new site, a stale baseline
                                                                 entry, a corpus gap or an editor mismatch
    python scripts/migrate-box-longhands.py --self-test
"""
import argparse
import difflib
import io
import json
import os
import re
import sys
from datetime import datetime, timezone

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _repo_root():
    """The repo root, found by a file that exists only there (never CLAUDE.md, which every package has)."""
    d = PLUGIN
    while True:
        if os.path.isfile(os.path.join(d, '.claude', 'THE-MIGRATION-METHOD.md')):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit('repo root not found: no .claude/THE-MIGRATION-METHOD.md above ' + PLUGIN)
        d = parent


REPO = _repo_root()
CENSUS = os.path.join(REPO, 'reports', 'migrations', 'box-longhands-census.json')
BASELINE = os.path.join(PLUGIN, 'scripts', 'migrate-box-longhands-baseline.json')

# Sites that stay on the shorthand, by (relpath, variable), each with its reason. Added by hand.
BOX_EXCLUDE = {
    ('includes/helpers-button-style.php', '$border_width_shorthand'):
        'border width (zero-fill is correct) and double use: also feeds sgs_border_gradient_css()',
}

# The block attributes behind sites the census cannot trace itself (their box arrives through block context or a
# shared serialiser), each still printed through the zero-filling shorthand. They feed zeroFillPairs. None remain: the
# computed route seeds only a border width's unset sides (scripts/computed-route/lib/resolve.mjs::seedSides).
BOX_HOLDOUT_ATTRS = {}


def zero_fill_pairs(sites):
    """Every (block, attribute) whose box is still printed with 0 for unset sides: refused and excluded sites the
    census traced, plus the hand-pinned holdouts (today the border widths only). Box sites only: corners are never seeded."""
    pairs = {('sgs/' + s['block'], s['attr']) for s in sites
             if s['helper'] == 'box' and s['category'] in ('refused', 'excluded') and s['block'] and s['attr']}
    for (f, v), attrs in BOX_HOLDOUT_ATTRS.items():
        if any(s['helper'] == 'box' and s['file'] == f and s['variable'] == v and s['category'] in ('refused', 'excluded') for s in sites):
            pairs.update(attrs)
    return sorted(f'{b}|{a}' for b, a in pairs)


# Files allowed to name a helper without calling it, with the count pinned and the reason.
BOX_BARE_OK = {
    'includes/helpers-box.php': (1, 'the definition\'s function_exists() polyfill guard: IDENTITY, follow it on any rename'),
    'includes/render-helpers.php': (1, 'docblock listing which helper file provides what'),
    'src/blocks/mega-aside/render.php': (1, 'function_exists() guard on a border-width ternary, which stays on the shorthand'),
    'includes/helpers-container.php': (1, 'function_exists() guard in sgs_serialise_box_sides, which only the border width calls, and a width stays on the shorthand'),
}

# Files outside the corpus that still contain an old name, each with its reason.
BOX_WIDTH_OK = {
    'scripts/tests/test-mega-aside-border-render.php': 'standalone render-test harness; loads the helper chain, not deployed',
    'tests/php/BoxLonghandTest.php': 'phpunit pin: calls the old function on purpose to prove its output never moves',
}

CORNER_BARE_OK = {
    'includes/helpers-box.php': (1, 'the definition\'s function_exists() polyfill guard: IDENTITY, follow it on any rename'),
}

CORNER_WIDTH_OK = {
    'tests/php/BoxLonghandTest.php': 'phpunit pin: calls the old corner function on purpose to prove its output never moves',
}


def _helper(key, old, new, families, family_arg, exclude, bare_ok, width_ok, holdout_attrs):
    return {'key': key, 'old': old, 'new': new, 'families': families, 'family_arg': family_arg,
            'exclude': exclude, 'bare_ok': bare_ok, 'width_ok': width_ok, 'holdout_attrs': holdout_attrs,
            'call': re.compile(r'\b' + old + r'\s*\('),
            'assign': re.compile(r'(?P<var>\$[A-Za-z_]\w*)\s*=\s*(?P<rhs>[^;]*?)\b' + old + r'\s*\(')}


# One row per migrated helper. `family_arg` says whether the new helper takes the family as its second argument.
HELPERS = [
    _helper('box', 'sgs_box_object_shorthand', 'sgs_box_object_longhands', ('padding', 'margin'), True,
            BOX_EXCLUDE, BOX_BARE_OK, BOX_WIDTH_OK, BOX_HOLDOUT_ATTRS),
    _helper('corner', 'sgs_corner_object_shorthand', 'sgs_corner_object_longhands', ('border-radius',), False,
            {}, CORNER_BARE_OK, CORNER_WIDTH_OK, {}),
]
BY_KEY = {h['key']: h for h in HELPERS}


def rel(path):
    return os.path.relpath(path, PLUGIN).replace('\\', '/')


def targets():
    out = []
    for base in ('src/blocks', 'includes'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(PLUGIN, base)):
            dirnames[:] = sorted(d for d in dirnames if 'fixture' not in d.lower())
            out += [os.path.join(dirpath, f) for f in sorted(filenames) if f.endswith('.php')]
    return out


def broad_enumeration(h):
    """A second, dumb, wide list of every PHP file holding the helper's old name. Shares no code with targets()."""
    prune = {'.git', 'node_modules', 'build', 'vendor', 'worktrees', '.claude'}
    found = set()
    for dirpath, dirnames, filenames in os.walk(PLUGIN):
        dirnames[:] = [d for d in dirnames if d not in prune and 'fixture' not in d.lower()]
        for fn in filenames:
            if fn.endswith('.php'):
                p = os.path.join(dirpath, fn)
                try:
                    with io.open(p, encoding='utf-8', newline='') as f:
                        if h['old'] in f.read():
                            found.add(rel(p))
                except (UnicodeDecodeError, OSError):
                    continue
    return found


def read(path):
    with io.open(path, encoding='utf-8', newline='') as f:
        return f.read()


def close_paren(text, open_idx):
    """Index of the parenthesis closing the one at open_idx, skipping quoted strings."""
    depth, i, quote = 0, open_idx, None
    while i < len(text):
        c = text[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def line_of(text, idx):
    return text.count('\n', 0, idx) + 1


def in_comment(text, idx):
    """True when idx sits in a comment: a docblock line, or after //, # or /* outside a string on its line."""
    start = text.rfind('\n', 0, idx) + 1
    head = text[start:idx]
    if head.lstrip().startswith(('*', '/*')):
        return True
    quote = None
    i = 0
    while i < len(head):
        c = head[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
        elif c == '#' or head.startswith(('//', '/*'), i):
            return True
        i += 1
    return False


def tier_of(var):
    v = var.lower()
    if re.search(r'_(tab|tablet)(_|$)', v):
        return 'tablet'
    if re.search(r'_(mob|mobile)(_|$)', v):
        return 'mobile'
    if re.search(r'_(base|desktop)(_|$)', v):
        return 'desktop'
    return 'n/a'


def attr_of(text, expr):
    """The block attribute a box expression is built from, followed through up to five assignments.

    A box usually arrives in steps, e.g. $attributes['padding'] → $tiers (normalised) → $padding_tablet_obj
    (is_array( $tiers['tablet'] ) ? … : array()), so each hop follows the first variable found anywhere in
    the expression, not only at its start. Returns None when the chain leaves the file or loops.
    """
    seen = set()
    for _ in range(6):
        m = re.search(r"\$attributes\[\s*'([^']+)'", expr)
        if m:
            return m.group(1)
        nxt = next((v for v in re.findall(r'\$(?!attributes\b)\w+', expr) if v not in seen), None)
        if not nxt:
            return None
        seen.add(nxt)
        a = re.search(re.escape(nxt) + r'\s*=(?!=)\s*([^;]+);', text)
        if not a:
            return None
        expr = a.group(1)
    return None


def uses_of(text, var, skip):
    """(start, end, kind, family) for every use of var outside the assignment span `skip` and comments."""
    name = re.escape(var)
    found = []
    for m in re.finditer(name + r'(?![\w\[])', text):
        if skip[0] <= m.start() < skip[1] or in_comment(text, m.start()):
            continue
        s, e = m.start(), m.end()
        before, after = text[max(0, s - 40):s], text[e:e + 40]
        if (re.search(r'null\s*!==\s*$', before) or re.match(r'\s*!==\s*null\b', after)
                or re.search(r"(?:''|\"\")\s*!==\s*$", before) or re.match(r"\s*!==\s*(?:''|\"\")", after)):
            found.append((s, e, 'guard', None))
            continue
        b = re.search(r'([a-z-]+):\{$', before)
        if b and after.startswith('}'):
            found.append((s - len(b.group(1)) - 2, e + 1, 'interp', b.group(1)))
            continue
        c = re.search(r"([a-z-]+):(['\"])\s*\.\s*$", before)
        if c:
            found.append((s - len(c.group(0)), e, 'concat', c.group(1)))
            continue
        found.append((s, e, 'other', None))
    return found


def analyse(text, relpath):
    """Every call of every migrated helper in one file, classified. Returns a list of site dicts."""
    sites = []
    for h in HELPERS:
        sites += analyse_helper(text, relpath, h)
    return sites


def analyse_helper(text, relpath, h):
    """Every call of one helper in one file, classified."""
    sites = []
    block = relpath.split('/')[2] if relpath.startswith('src/blocks/') else None
    for call in h['call'].finditer(text):
        idx = call.start()
        if in_comment(text, idx):
            continue
        site = {'file': relpath, 'line': line_of(text, idx), 'helper': h['key'], 'block': block, 'variable': None,
                'family': None, 'tier': 'n/a', 'attr': None, 'category': None, 'reason': None}
        sites.append(site)
        if re.match(r'\s*function\b', text[text.rfind('\n', 0, idx) + 1:idx]) or text[max(0, idx - 9):idx] == 'function ':
            site.update(category='definition', reason='the definition')
            continue
        stmt_start = text.rfind(';', 0, idx)
        stmt_start = max(stmt_start, text.rfind('{', 0, idx), text.rfind('}', 0, idx)) + 1
        a = h['assign'].search(text, stmt_start, idx + len(call.group(0)))
        if not a or a.end() != idx + len(call.group(0)):
            site.update(category='refused', reason='not a plain assignment (passed inline or in an expression)')
            continue
        var = a.group('var')
        site['variable'] = var
        site['tier'] = tier_of(var)
        open_idx = call.end() - 1
        close = close_paren(text, open_idx)
        semi = text.find(';', close)
        expr = text[open_idx + 1:close]
        site['attr'] = attr_of(text, expr)
        if a.group('rhs').strip():
            site.update(category='refused', reason='ternary or expression assignment; migrate by hand')
            continue
        if (relpath, var) in h['exclude']:
            site.update(category='excluded', reason=h['exclude'][(relpath, var)])
            continue
        if len(re.findall(re.escape(var) + r'\s*=(?!=)', text)) > 1:
            site.update(category='refused', reason='variable assigned more than once in the file')
            continue
        uses = uses_of(text, var, (a.start(), semi + 1))
        decls = [u for u in uses if u[2] in ('interp', 'concat')]
        others = [u for u in uses if u[2] == 'other']
        fams = {u[3] for u in decls}
        if others:
            site.update(category='refused', reason=f'{len(others)} use(s) that are not a guard or a declaration (line {line_of(text, others[0][0])})')
        elif not decls:
            site.update(category='refused', reason='no declaration use found')
        elif len(fams) != 1:
            site.update(category='refused', reason='declarations name different families: ' + ', '.join(sorted(fams)))
        elif next(iter(fams)) not in h['families']:
            fam = next(iter(fams))
            if fam.startswith('--'):
                reason = f'family {fam}: var() holdout, a custom property read back through var(), where a longhand cannot go; it stays on the shorthand'
            else:
                reason = f'family {fam}: zero-fill is correct there, it stays on the shorthand'
            site.update(category='refused', family=fam, reason=reason)
        else:
            site.update(category='migratable', family=next(iter(fams)))
            site['_edit'] = (call.start(), open_idx, close, decls)
    return sites


def transform(text, relpath, only=None):
    """Rewrite every migratable site in one file. Pure and idempotent."""
    edits = []
    for site in analyse(text, relpath):
        if site['category'] != 'migratable' or (only and site['block'] not in only):
            continue
        name_start, open_idx, close, decls = site.pop('_edit')
        inner = text[open_idx + 1:close]
        body = inner.rstrip()
        h = BY_KEY[site['helper']]
        fam_arg = ", '" + site['family'] + "'" if h['family_arg'] else ''
        edits.append((name_start, close + 1, h['new'] + '(' + body + fam_arg + inner[len(body):] + ')'))
        for s, e, kind, fam in decls:
            if kind == 'interp':
                edits.append((s, e, '{' + site['variable'] + '}'))
                continue
            q = text[s + len(fam) + 1]
            # The literal is exactly '<family>:' when its opening quote sits right before the family and is not
            # itself the end of another string: then the whole `'<family>:' . $v` becomes `$v`. Otherwise only
            # the family text goes and the literal keeps its other characters: `'.x{padding:' . $v` → `'.x{' . $v`.
            if s >= 1 and text[s - 1] == q and (s < 2 or text[s - 2] not in ('\\', q) and not text[s - 2].isalnum()):
                edits.append((s - 1, e, site['variable']))
            else:
                edits.append((s, e, q + ' . ' + site['variable']))
    for s, e, new in sorted(edits, reverse=True):
        text = text[:s] + new + text[e:]
    return text


def survey(only=None):
    sites = []
    for p in targets():
        sites += analyse(read(p), rel(p))
    for s in sites:
        s.pop('_edit', None)
    if only:
        sites = [s for s in sites if s['block'] in only]
    return sites


def site_key(s):
    return f"{s['file']}::{s['variable']}::{s['line']}"


def baseline_keys(sites):
    """Line numbers move with every edit, so the baseline keys a site by file and variable."""
    return sorted({f"{s['file']}::{s['variable']}" for s in sites if s['category'] == 'migratable'})


PREVIEW = re.compile(r'\b(tierBoxShorthand|spacingPreview|boxShorthand)\s*\(')


def zero_filling_previews(js):
    """(line, helper) for each editor preview call that prints padding/margin with 0 for unset sides.

    Judged by the call's OWN arguments: spacingPreview always previews padding and margin; boxShorthand and
    tierBoxShorthand do when an argument names padding or margin. A radius or border call is left alone
    (its zero-fill is phase 2 or correct), and text after the call is never read.
    """
    out = []
    for m in PREVIEW.finditer(js):
        open_idx = m.end() - 1
        close = close_paren(js, open_idx)
        args = js[open_idx + 1:close] if close > 0 else ''
        # Anywhere in a name, not only as a whole word: attributes.contentPadding and splitMediaPadding are padding too.
        if 'spacingPreview' == m.group(1) or re.search(r'padding|margin', args, re.I):
            if not re.search(r'radius|border', args, re.I):
                out.append((line_of(js, m.start()), m.group(1)))
    return out


BORDER_PREVIEW_JS = 'src/utils/border-preview.js'
RADIUS_PREVIEW = re.compile(r'\bborderRadiusPreview\s*\(')
WHOLE_TIER = re.compile(r'\bwholeTier\s*:\s*true\b')
SGS_BORDER_PREVIEW = re.compile(r'\bsgsBorderPreview\s*\(')


def zero_filling_radius_previews(js, border_preview_zero_fills):
    """(line, call) for each editor preview that prints a border radius with 0 for unset corners.

    borderRadiusPreview() and any `wholeTier: true` always do. sgsBorderPreview() does when its arguments pass
    radiusValues AND border-preview.js still routes the radius through borderRadiusPreview(); once it prints
    longhands itself (border_preview_zero_fills False) a call to it is fine.
    """
    out = [(line_of(js, m.start()), 'borderRadiusPreview()') for m in RADIUS_PREVIEW.finditer(js)]
    out += [(line_of(js, m.start()), 'wholeTier: true') for m in WHOLE_TIER.finditer(js)]
    if border_preview_zero_fills:
        for m in SGS_BORDER_PREVIEW.finditer(js):
            open_idx = m.end() - 1
            close = close_paren(js, open_idx)
            if re.search(r'\bradiusValues\b', js[open_idx + 1:close] if close > 0 else ''):
                out.append((line_of(js, m.start()), 'sgsBorderPreview()'))
    return sorted(out)


def migrated_blocks(h):
    """Slugs of src/blocks/<slug>/ holding a PHP file that calls the helper's new name."""
    out = set()
    for p in targets():
        r = rel(p)
        if r.startswith('src/blocks/') and h['new'] + '(' in read(p):
            out.add(r.split('/')[2])
    return sorted(out)


def editor_mismatches(sites):
    """A migrated block whose editor still previews its box (padding/margin) or its border radius through a 0-filling helper."""
    out = []
    for slug in migrated_blocks(BY_KEY['box']):
        d = os.path.join(PLUGIN, 'src', 'blocks', slug)
        for fn in sorted(os.listdir(d)):
            if fn.endswith('.js'):
                for ln, helper in zero_filling_previews(read(os.path.join(d, fn))):
                    out.append(f'src/blocks/{slug}/{fn}:{ln} {helper}() previews a migrated block\'s padding/margin with 0 for unset sides; use tierBoxLonghands()')
    border_js = os.path.join(PLUGIN, *BORDER_PREVIEW_JS.split('/'))
    zero_fills = os.path.isfile(border_js) and bool(RADIUS_PREVIEW.search(read(border_js)))
    for slug in migrated_blocks(BY_KEY['corner']):
        d = os.path.join(PLUGIN, 'src', 'blocks', slug)
        for fn in sorted(os.listdir(d)):
            if fn.endswith('.js'):
                for ln, call in zero_filling_radius_previews(read(os.path.join(d, fn)), zero_fills):
                    out.append(f'src/blocks/{slug}/{fn}:{ln} {call} previews a migrated block\'s border radius with 0 for unset corners; use borderRadiusLonghands()')
    return out


def crosscheck(bare_by_helper):
    fails = []
    narrow = {rel(p) for p in targets()}
    for h in HELPERS:
        old, bare_ok, width_ok = h['old'], h['bare_ok'], h['width_ok']
        bare_counts = bare_by_helper[h['key']]
        broad = broad_enumeration(h)
        for f in sorted(broad - narrow - set(width_ok)):
            fails.append(f'CORPUS TOO NARROW: {f} contains {old} but is outside targets(); widen targets() or name it in the {h["key"]} WIDTH_OK')
        for f in sorted(set(width_ok) - broad):
            fails.append(f'STALE {h["key"]} WIDTH_OK entry {f}: it no longer contains {old}')
        for (f, v) in sorted(h['exclude']):
            if not os.path.isfile(os.path.join(PLUGIN, f)):
                fails.append(f'STALE {h["key"]} EXCLUDE entry {f} ({v}): the file does not exist')
        for f, n in sorted(bare_counts.items()):
            if f not in bare_ok:
                fails.append(f'UNJUSTIFIED bare mention x{n} of {old} in {f}: a function_exists() guard or a dispatch string is load-bearing; read it and add it to the {h["key"]} BARE_OK')
            elif bare_ok[f][0] != n:
                fails.append(f'bare-mention COUNT CHANGED in {f}: the {h["key"]} BARE_OK pins {bare_ok[f][0]}, found {n}; re-read them and update the pin')
        for f in sorted(set(bare_ok) - set(bare_counts)):
            fails.append(f'STALE {h["key"]} BARE_OK entry {f}: no bare mention left (on a hand migration, the guard moved with the call); remove it')
    return fails


def bare_mentions(h):
    out = {}
    for p in targets():
        t = read(p)
        n = len(re.findall(r'\b' + h['old'] + r'\b(?!\s*\()', t))
        if n:
            out[rel(p)] = n
    return out


def totals_of(sites):
    totals = {}
    for s in sites:
        totals[s['category']] = totals.get(s['category'], 0) + 1
    return totals


def write_census(sites):
    os.makedirs(os.path.dirname(CENSUS), exist_ok=True)
    with io.open(CENSUS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'generated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                   'tool': 'plugins/sgs-blocks/scripts/migrate-box-longhands.py',
                   'totals': {h['key']: totals_of([s for s in sites if s['helper'] == h['key']]) for h in HELPERS},
                   'sites': sites, 'zeroFillPairs': zero_fill_pairs(sites),
                   'bareMentions': {h['key']: bare_mentions(h) for h in HELPERS},
                   'editorMismatches': editor_mismatches(sites)}, f, indent=1)
        f.write('\n')


def check():
    sites = survey()
    fails = crosscheck({h['key']: bare_mentions(h) for h in HELPERS})
    fails += editor_mismatches(sites)
    if not os.path.isfile(BASELINE):
        fails.append('no baseline: run --write-baseline once, then commit it')
    else:
        pinned = set(json.load(io.open(BASELINE, encoding='utf-8'))['migratable'])
        now = set(baseline_keys(sites))
        corner_keys = baseline_keys([s for s in sites if s['helper'] == 'corner'])
        for k in sorted(now - pinned):
            if k in corner_keys:
                fails.append(f'NEW zero-fill border-radius site {k}: use {BY_KEY["corner"]["new"]}( $box ) instead')
            else:
                fails.append(f'NEW zero-fill padding/margin site {k}: use {BY_KEY["box"]["new"]}( $box, \'<family>\' ) instead')
        for k in sorted(pinned - now):
            fails.append(f'STALE baseline entry {k}: it is migrated or gone; run --write-baseline so the ratchet shrinks')
    for f in fails:
        print('FAIL ' + f)
    print(f'box-longhands --check: {len(fails)} failure(s); {len(baseline_keys(sites))} migratable site(s) on the baseline')
    return 1 if fails else 0


SELF_TEST = {
    'interp': ('<?php\n$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );\n'
               'if ( null !== $padding_tab_val ) {\n\t$decls[] = "padding:{$padding_tab_val}";\n}\n',
               '<?php\n$padding_tab_val = sgs_box_object_longhands( $padding_tablet_obj, \'padding\' );\n'
               'if ( null !== $padding_tab_val ) {\n\t$decls[] = "{$padding_tab_val}";\n}\n'),
    'whole rule': ('<?php\n$margin_mob_val = sgs_box_object_shorthand( $m );\nif ( null !== $margin_mob_val ) {\n'
                   '\t$css[] = "@media(max-width:767px){{$sel}{margin:{$margin_mob_val};}}";\n}\n',
                   '<?php\n$margin_mob_val = sgs_box_object_longhands( $m, \'margin\' );\nif ( null !== $margin_mob_val ) {\n'
                   '\t$css[] = "@media(max-width:767px){{$sel}{{$margin_mob_val};}}";\n}\n'),
    'concat': ("<?php\n$pad = sgs_box_object_shorthand( $p );\nif ( null !== $pad ) {\n"
               "\t$css .= '.x{padding:' . $pad . '}';\n\t$decls[] = 'padding:' . $pad;\n}\n",
               "<?php\n$pad = sgs_box_object_longhands( $p, 'padding' );\nif ( null !== $pad ) {\n"
               "\t$css .= '.x{' . $pad . '}';\n\t$decls[] = $pad;\n}\n"),
    'multi-line call': ("<?php\n$pad = sgs_box_object_shorthand(\n\t$attributes['cardPadding'] ?? array()\n);\n"
                        "if ( null !== $pad ) {\n\t$d[] = \"padding:{$pad}\";\n}\n",
                        "<?php\n$pad = sgs_box_object_longhands(\n\t$attributes['cardPadding'] ?? array(), 'padding'\n);\n"
                        "if ( null !== $pad ) {\n\t$d[] = \"{$pad}\";\n}\n"),
    # An unrelated `'' . $v` elsewhere in a migrated file is not the migration's to tidy.
    'untouched neighbours': ("<?php\n$keep = '' . $other;\n$pad = sgs_box_object_shorthand( $p );\n"
                             "if ( null !== $pad ) {\n\t$css .= '.x{padding:' . $pad . '}';\n}\n",
                             "<?php\n$keep = '' . $other;\n$pad = sgs_box_object_longhands( $p, 'padding' );\n"
                             "if ( null !== $pad ) {\n\t$css .= '.x{' . $pad . '}';\n}\n"),
    'corner interp': ('<?php\n$radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );\n'
                      'if ( null !== $radius_tab_val ) {\n\t$tablet_box_decls[] = "border-radius:{$radius_tab_val}";\n}\n',
                      '<?php\n$radius_tab_val = sgs_corner_object_longhands( $border_radius_tablet_obj );\n'
                      'if ( null !== $radius_tab_val ) {\n\t$tablet_box_decls[] = "{$radius_tab_val}";\n}\n'),
    'corner whole rule': ('<?php\n$radius_mob_val = sgs_corner_object_shorthand( $r );\nif ( null !== $radius_mob_val ) {\n'
                          '\t$css[] = "{$root_sel}{border-radius:{$radius_mob_val};}}";\n}\n',
                          '<?php\n$radius_mob_val = sgs_corner_object_longhands( $r );\nif ( null !== $radius_mob_val ) {\n'
                          '\t$css[] = "{$root_sel}{{$radius_mob_val};}}";\n}\n'),
    'corner concat': ("<?php\n$r = sgs_corner_object_shorthand( $b );\nif ( null !== $r ) {\n"
                      "\t$css .= '.x{border-radius:' . $r . '}';\n\t$css .= '{border-radius:' . $r . ';}}';\n"
                      "\t$decls[] = 'border-radius:' . $r;\n}\n",
                      "<?php\n$r = sgs_corner_object_longhands( $b );\nif ( null !== $r ) {\n"
                      "\t$css .= '.x{' . $r . '}';\n\t$css .= '{' . $r . ';}}';\n\t$decls[] = $r;\n}\n"),
    'corner empty-string guard': ("<?php\n$r = sgs_corner_object_shorthand( $b );\nif ( null !== $r && '' !== $r ) {\n"
                                  "\t$d[] = \"border-radius:{$r}\";\n}\nif ( $r !== '' ) {\n\t$d[] = 'x';\n}\n"
                                  "if ( \"\" !== $r ) {\n\t$d[] = 'y';\n}\n",
                                  "<?php\n$r = sgs_corner_object_longhands( $b );\nif ( null !== $r && '' !== $r ) {\n"
                                  "\t$d[] = \"{$r}\";\n}\nif ( $r !== '' ) {\n\t$d[] = 'x';\n}\n"
                                  "if ( \"\" !== $r ) {\n\t$d[] = 'y';\n}\n"),
}
SELF_TEST_REFUSED = {
    'double use': "<?php\n$pad = sgs_box_object_shorthand( $p );\n$present = $pad;\n$d[] = \"padding:{$pad}\";\n",
    'border width': "<?php\n$bw = sgs_box_object_shorthand( $b );\nif ( null !== $bw ) {\n\t$d[] = \"border-width:{$bw}\";\n}\n",
    'ternary': "<?php\n$s = function_exists( 'x' ) ? sgs_box_object_shorthand( $b ) : null;\n$d[] = \"padding:{$s}\";\n",
    'mixed families': "<?php\n$v = sgs_box_object_shorthand( $b );\n$d[] = \"padding:{$v}\";\n$e[] = \"margin:{$v}\";\n",
    'custom property': "<?php\n$v = sgs_box_object_shorthand( $b );\n$d[] = '--sgs-x-pad:' . $v;\n",
    'corner custom property': "<?php\n$v = sgs_corner_object_shorthand( $b );\n$d[] = '{--sgs-x-radius-default:' . $v . ';}';\n",
    'corner ternary': "<?php\n$r = $c ? sgs_corner_object_shorthand( $b ) : '';\n$d[] = \"border-radius:{$r}\";\n",
}
SELF_TEST_INERT = ("<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n// sgs_box_object_shorthand( $y ) in a comment\n"
                   "echo $x; // phpcs:ignore -- sgs_box_object_shorthand( $z ) named in a trailing comment\n"
                   "$s = 'a # sign and // in a string'; $t = 1;\n"
                   "$u = '' . $x;\n$w = \"\" . $t;\n")


def self_test():
    fails = []
    for name, (src, want) in SELF_TEST.items():
        got = transform(src, 'src/blocks/x/render.php')
        if got != want:
            fails.append(f'positive "{name}":\n' + ''.join(difflib.unified_diff(want.splitlines(True), got.splitlines(True), 'want', 'got')))
        if transform(got, 'src/blocks/x/render.php') != got:
            fails.append(f'idempotence "{name}": a second pass changed the output')
    for name, src in SELF_TEST_REFUSED.items():
        cats = [s['category'] for s in analyse(src, 'src/blocks/x/render.php')]
        if cats != ['refused'] or transform(src, 'src/blocks/x/render.php') != src:
            fails.append(f'refusal "{name}": classified {cats} or rewritten; it must be refused and byte-identical')
    if transform(SELF_TEST_INERT, 'src/blocks/x/render.php') != SELF_TEST_INERT:
        fails.append('negative control: a file with no live call was changed (an unrelated edit leaked out of a site)')
    if analyse(SELF_TEST_INERT, 'src/blocks/x/render.php'):
        fails.append('negative control: a commented call was counted as a site')
    only = transform(SELF_TEST['interp'][0], 'src/blocks/x/render.php', only={'other-block'})
    if only != SELF_TEST['interp'][0]:
        fails.append('--only: a block outside the scope was rewritten')
    js = ("const s = { ...spacingPreview( { padding, margin }, previewTier ),\n"
          "\tborderRadius: tierBoxShorthand( borderRadius, previewTier, BOX_CORNER_KEYS ) };\n"
          "const p = boxShorthand( padding?.desktop, [ 'top' ] );\n"
          "const r = boxShorthand( radius?.desktop, BOX_CORNER_KEYS );\n"
          "const l = tierBoxLonghands( padding, previewTier, 'padding' );\n"
          "const c = tierBoxShorthand( attributes.contentPadding, tier, BOX_SIDE_KEYS, true );\n")
    got = [h for _, h in zero_filling_previews(js)]
    if got != ['spacingPreview', 'boxShorthand', 'tierBoxShorthand']:
        fails.append(f'editor arm: flagged {got}; want spacingPreview, the padding boxShorthand and the camelCase contentPadding call, never the radius calls or the longhand sibling')
    reason = analyse(SELF_TEST_REFUSED['corner custom property'], 'src/blocks/x/render.php')[0]['reason'] or ''
    if 'var() holdout' not in reason:
        fails.append(f'refusal "corner custom property": reason is "{reason}"; it must say var() holdout')
    radius_js = ("const a = { ...borderRadiusPreview( borderRadius, tier ) };\n"
                 "const b = tierBoxLonghands( padding, tier, 'padding' );\n"
                 "const c = sgsBorderPreview( { radiusValues: radius }, tier, {}, { wholeTier: true } );\n"
                 "const d = sgsBorderPreview( { widthValues: width }, tier );\n"
                 "const e = sgsBorderPreview( { radiusValues: radius }, tier );\n")
    got = [c for _, c in zero_filling_radius_previews(radius_js, True)]
    if got != ['borderRadiusPreview()', 'sgsBorderPreview()', 'wholeTier: true', 'sgsBorderPreview()']:
        fails.append(f'corner editor arm: flagged {got}; want borderRadiusPreview, both sgsBorderPreview calls that pass radiusValues and wholeTier, never the longhand or width-only calls')
    got = [c for _, c in zero_filling_radius_previews(radius_js, False)]
    if got != ['borderRadiusPreview()', 'wholeTier: true']:
        fails.append(f'corner editor arm (border-preview.js printing longhands): flagged {got}; want only borderRadiusPreview and wholeTier')
    for f in fails:
        print('SELF-TEST FAIL ' + f)
    print(f'self-test: {len(SELF_TEST)} positive, {len(SELF_TEST_REFUSED)} refusal, 1 negative control, 1 scope check, 1 editor arm, 1 corner editor arm, 1 var() reason check; {len(fails)} failure(s)')
    return 1 if fails else 0


def fix(apply_changes, only):
    changed = 0
    for p in targets():
        r = rel(p)
        if only and not (r.startswith('src/blocks/') and r.split('/')[2] in only):
            continue
        old = read(p)
        new = transform(old, r, only=only)
        if new == old:
            continue
        # A change in a file with no migratable site is an edit leaking out of a site: refuse it outright.
        if not any(s['category'] == 'migratable' and (not only or s['block'] in only) for s in analyse(old, r)):
            raise SystemExit(f'REFUSED: {r} would change but holds no migratable site; the transform leaked. Nothing written for it.')
        changed += 1
        if apply_changes:
            tmp = p + '.tmp'
            with io.open(tmp, 'w', encoding='utf-8', newline='') as f:
                f.write(new)
            os.replace(tmp, p)
            print('WROTE ' + r)
        else:
            sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), 'a/' + r, 'b/' + r))
    print(f'{"applied" if apply_changes else "would change"}: {changed} file(s)')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--write-baseline', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    only = {s.strip() for s in a.only.split(',') if s.strip()} or None
    if a.self_test:
        return self_test()
    if a.check:
        return check()
    if a.write_baseline:
        keys = baseline_keys(survey())
        with io.open(BASELINE, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'note': 'CR6 ratchet: padding/margin sites still on the zero-filling shorthand. It only shrinks; regenerate after each --apply.', 'migratable': keys}, f, indent=1)
            f.write('\n')
        print(f'baseline: {len(keys)} migratable site(s) pinned')
        return 0
    if a.fix:
        return fix(a.apply, only)
    sites = survey(only)
    for h in HELPERS:
        print(f"box-longhands census [{h['key']}]:", json.dumps(totals_of([s for s in sites if s['helper'] == h['key']])))
    for s in sites:
        if s['category'] in ('refused', 'excluded'):
            print(f"  {s['helper']:6} {s['category']:9} {s['file']}:{s['line']} {s['variable'] or ''} - {s['reason']}")
    if a.json:
        write_census(sites)
        print('census written: ' + os.path.relpath(CENSUS, REPO).replace('\\', '/'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
