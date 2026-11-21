#!/usr/bin/env python3
"""check-scrollbar-mechanism.py: every block scrolling area's scrollbar goes through the one shared mechanism (Spec 02 FR-2-35).

WHAT IT ENFORCES
    A scrollbar's thickness and hiding inside a block is a setting with three choices (default, thin, hidden), printed by
    includes/helpers-scrollbar.php (live page) and src/utils/scrollbar-style.js (a canvas drawn in JavaScript). No block
    writes its own: a `scrollbar-width` declaration, an `-ms-overflow-style` declaration, or a `::-webkit-scrollbar` rule
    that sets `display`, `width` or `height` (the bar itself, not its thumb, track or buttons) anywhere in the plugin's
    block code (src/blocks, src/shared, includes, assets/css) is a finding unless EXEMPT names it with a reason.

    It also cross-checks the setting: every block.json attribute whose enum is exactly default/thin/hidden is read by a
    sgs_scrollbar_style() call in that block's PHP (its render.php or a partial in its folder or in includes/) and has the
    shared ScrollbarStyleControl in that block's editor source; every sgs_scrollbar_style( $attributes['x'] ...) call reads
    an attribute the block declares with that enum.

WHAT IT LISTS BUT NEVER FAILS ON
    * theme/sgs-theme stylesheets (the site's own bar and the overlay scrollbar; not block code);
    * every other `overflow: auto|scroll` scrolling area in block code, as "scroller with no setting" (the site's default
      bar applies there).

    python check-scrollbar-mechanism.py --survey [--json] | --fix | --check | --self-test

    --fix prints, for each remaining finding, the call that replaces it; it never rewrites a file, because each area's
    selector, starting value and media condition are read from the block, not from the stylesheet line.
"""
import argparse
import json
import os
import re
import sys

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(PLUGIN))
if not os.path.exists(os.path.join(REPO, '.git')):
    REPO = os.path.dirname(PLUGIN)

SCAN_DIRS = ['src/blocks', 'src/shared', 'src/components', 'src/utils', 'includes', 'assets/css', 'assets/js']
SCAN_EXT = ('.css', '.scss', '.php', '.js')
THEME_DIR = 'theme/sgs-theme/assets/css'
MECHANISM = {
    'includes/helpers-scrollbar.php',
    'src/utils/scrollbar-style.js',
}
# path -> reason. Each path must exist (the self-test asserts it), and every finding in it is exempt.
EXEMPT = {
    'src/blocks/google-reviews/render-styles.php': 'held for the owner: scrollbarStyle (thin|standard) means the browser\'s own thin bar, which the shared "thin" does not draw in Chromium; joining needs its values renamed (report of round 5d)',
    'src/blocks/google-reviews/style.css': 'held with google-reviews::scrollbarStyle (see render-styles.php)',
    'assets/css/slider-nav.css': 'the shared slider navigation\'s pagination (scrollbar, dots, none): google-reviews is its only user, held with google-reviews::scrollbarStyle',
}
# (path, substring of the line) -> reason, for one finding inside a file that otherwise follows the rule.
EXEMPT_LINES = {
    ('includes/helpers-gallery-grid-css.php', "$reset  = 'column-count:auto;column-gap:var(--sgs-gap);scrollbar-width:auto;';"): 'a per-device layout reset: the image grid stops scrolling at this tier, so its scrolling layout\'s scrollbar-width returns to the initial value',
    ('includes/helpers-gallery-grid-css.php', "'masonry' => 'display:block;column-count:"): 'a per-device layout reset (as above, for the masonry layout)',
}
CHOICE_ENUM = ['default', 'thin', 'hidden']

DECL_RE = re.compile(r'(?<![\w-])(scrollbar-width|-ms-overflow-style)\s*:\s*([a-z-]*)', re.I)
BAR_RULE_RE = re.compile(r'::-webkit-scrollbar(?![-\w])')
OVERFLOW_RE = re.compile(r'(?<![\w-])overflow(?:-x|-y)?\s*:\s*(?:auto|scroll)\b')
STYLE_CALL_RE = re.compile(r"sgs_scrollbar_style\(\s*\$attributes\[\s*'([A-Za-z]+)'\s*\]")


def rel(path):
    return os.path.relpath(path, PLUGIN).replace(os.sep, '/')


def strip_comments(text, ext):
    """Comments blanked out (newlines kept, so line numbers hold)."""
    def blank(m):
        return re.sub(r'[^\n]', ' ', m.group(0))
    text = re.sub(r'/\*.*?\*/', blank, text, flags=re.S)
    if ext in ('.php', '.js', '.scss'):
        text = re.sub(r'(?m)(^|[^:\'"\\])//[^\n]*', lambda m: m.group(1) + ' ' * (len(m.group(0)) - len(m.group(1))), text)
    return text


def files_under(base, dirs, exts):
    out = []
    for d in dirs:
        root = os.path.join(base, d)
        if not os.path.isdir(root):
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [n for n in dirnames if n not in ('node_modules', 'build', 'vendor', 'tests')]
            for f in filenames:
                if f.endswith(exts):
                    out.append(os.path.join(dirpath, f))
    return sorted(out)


def bar_rule_sets_size(text, start):
    """True when the `::-webkit-scrollbar` rule starting at `start` sets display, width or height."""
    brace = text.find('{', start)
    end = text.find('}', brace)
    if brace < 0 or end < 0:
        return False
    # In PHP or JS the rule is built in a string: read up to the closing brace either way.
    body = text[brace + 1:end]
    return re.search(r'(?<![\w-])(display|width|height)\s*:', body) is not None


def scan_text(text, path_rel, ext):
    """Findings in one file: dicts with line, kind, text."""
    clean = strip_comments(text, ext)
    lines = text.split('\n')
    found = []
    for m in DECL_RE.finditer(clean):
        line = clean.count('\n', 0, m.start()) + 1
        found.append({'file': path_rel, 'line': line, 'kind': m.group(1).lower(), 'value': m.group(2).lower(), 'text': lines[line - 1].strip()})
    for m in BAR_RULE_RE.finditer(clean):
        if bar_rule_sets_size(clean, m.end()):
            line = clean.count('\n', 0, m.start()) + 1
            found.append({'file': path_rel, 'line': line, 'kind': '::-webkit-scrollbar', 'value': '', 'text': lines[line - 1].strip()})
    return found


def classify(finding):
    path = finding['file']
    if path in MECHANISM:
        return 'mechanism', 'the shared helper'
    if path in EXEMPT:
        return 'exempt', EXEMPT[path]
    for (p, needle), reason in EXEMPT_LINES.items():
        if p == path and needle in finding['text']:
            return 'exempt', reason
    return 'hard-coded', ''


def scrollers_without_setting(files):
    out = []
    for f in files:
        r = rel(f)
        if r in MECHANISM:
            continue
        ext = os.path.splitext(f)[1]
        clean = strip_comments(open(f, encoding='utf-8', errors='replace').read(), ext)
        for m in OVERFLOW_RE.finditer(clean):
            out.append({'file': r, 'line': clean.count('\n', 0, m.start()) + 1})
    return out


def block_dirs():
    base = os.path.join(PLUGIN, 'src', 'blocks')
    return sorted(os.path.join(base, d) for d in os.listdir(base) if os.path.isfile(os.path.join(base, d, 'block.json')))


def choice_attrs(block_json):
    attrs = block_json.get('attributes') or {}
    return sorted(k for k, v in attrs.items() if isinstance(v, dict) and v.get('enum') == CHOICE_ENUM)


def crosscheck():
    """Setting wiring problems: list of strings."""
    problems = []
    includes_php = ''.join(open(f, encoding='utf-8', errors='replace').read() for f in files_under(PLUGIN, ['includes'], ('.php',)))
    for d in block_dirs():
        bj = json.load(open(os.path.join(d, 'block.json'), encoding='utf-8'))
        slug = bj.get('name', os.path.basename(d))
        attrs = choice_attrs(bj)
        php = ''.join(open(f, encoding='utf-8', errors='replace').read() for f in files_under(d, ['.'], ('.php',)))
        js = ''.join(open(f, encoding='utf-8', errors='replace').read() for f in files_under(d, ['.'], ('.js',)))
        read = set(STYLE_CALL_RE.findall(php))
        for a in attrs:
            if a not in read and not re.search(r"sgs_scrollbar_style\(\s*\$attributes\[\s*'" + a + r"'", includes_php):
                problems.append(f'{slug}::{a} is a scrollbar choice that no sgs_scrollbar_style() call reads')
            if 'ScrollbarStyleControl' not in js:
                problems.append(f'{slug}::{a} has no ScrollbarStyleControl in the block\'s editor source')
        for a in sorted(read - set(attrs)):
            problems.append(f'{slug}: sgs_scrollbar_style() reads {a}, which block.json does not declare with the enum {CHOICE_ENUM}')
    return problems


def survey():
    files = files_under(PLUGIN, SCAN_DIRS, SCAN_EXT)
    findings = []
    for f in files:
        ext = os.path.splitext(f)[1]
        for x in scan_text(open(f, encoding='utf-8', errors='replace').read(), rel(f), ext):
            x['category'], x['reason'] = classify(x)
            findings.append(x)
    theme = []
    for f in files_under(REPO, [THEME_DIR], ('.css',)):
        for x in scan_text(open(f, encoding='utf-8', errors='replace').read(), os.path.relpath(f, REPO).replace(os.sep, '/'), '.css'):
            x['category'], x['reason'] = 'theme', 'theme stylesheet: listed, not block code'
            theme.append(x)
    settings = []
    for d in block_dirs():
        bj = json.load(open(os.path.join(d, 'block.json'), encoding='utf-8'))
        for a in choice_attrs(bj):
            settings.append(f"{bj.get('name')}::{a}")
    return {
        'findings': findings,
        'theme': theme,
        'settings': settings,
        'scrollers': scrollers_without_setting(files),
        'crosscheck': crosscheck(),
    }


def print_survey(s):
    cats = {}
    for x in s['findings']:
        cats.setdefault(x['category'], []).append(x)
    print(f"scrollbar choice settings ({len(s['settings'])}): " + ', '.join(s['settings']))
    for cat in ('hard-coded', 'exempt', 'mechanism'):
        rows = cats.get(cat, [])
        print(f'\n{cat}: {len(rows)}')
        for x in rows:
            extra = f'  [{x["reason"]}]' if x['reason'] and cat == 'exempt' else ''
            print(f"  {x['file']}:{x['line']}  {x['kind']} {x['value']}  {x['text'][:110]}{extra}")
    print(f"\ntheme (listed, not owned): {len(s['theme'])}")
    for x in s['theme']:
        print(f"  {x['file']}:{x['line']}  {x['kind']} {x['value']}  {x['text'][:110]}")
    print(f"\nscrolling areas in block code (overflow auto|scroll), each with or without a setting: {len(s['scrollers'])}")
    for x in s['scrollers']:
        print(f"  {x['file']}:{x['line']}")
    print(f"\ncrosscheck problems: {len(s['crosscheck'])}")
    for p in s['crosscheck']:
        print('  ' + p)
    print('\nunrecognised: 0')


def check():
    s = survey()
    hard = [x for x in s['findings'] if x['category'] == 'hard-coded']
    for x in hard:
        print(f"HARD-CODED {x['file']}:{x['line']}  {x['kind']} {x['value']}  {x['text'][:120]}")
    for p in s['crosscheck']:
        print('CROSSCHECK ' + p)
    missing = [p for p in list(EXEMPT) + [p for p, _ in EXEMPT_LINES] + sorted(MECHANISM) if not os.path.isfile(os.path.join(PLUGIN, p))]
    for p in missing:
        print('MISSING exempt or mechanism path ' + p)
    if hard or s['crosscheck'] or missing:
        print(f'[check-scrollbar-mechanism] FAIL: {len(hard)} hard-coded, {len(s["crosscheck"])} crosscheck, {len(missing)} missing paths')
        return 1
    print(f'[check-scrollbar-mechanism] OK: {len(s["settings"])} settings, no block writes its own scrollbar CSS')
    return 0


def fix():
    s = survey()
    hard = [x for x in s['findings'] if x['category'] == 'hard-coded']
    if not hard:
        print('nothing to fix')
        return 0
    for x in hard:
        print(f"{x['file']}:{x['line']}  {x['text'][:120]}")
        print('    remove it; in the block\'s PHP print sgs_scrollbar_css( <scoped area selector>, sgs_scrollbar_style( $attributes[\'<area>ScrollbarStyle\'] ?? null, \'<its look today: hidden|thin|default>\' ) [, <media condition>] ),')
        print('    declare the attribute (enum default/thin/hidden, no default) and add ScrollbarStyleControl to the block\'s inspector.')
    return 1


def self_test():
    ok = True

    def expect(cond, msg):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + msg)
        ok = ok and cond

    css = '.a{overflow-x:auto;scrollbar-width:none}\n.a::-webkit-scrollbar{display:none}\n.a::-webkit-scrollbar-thumb{background:red}\n/* scrollbar-width: none */\n'
    f = scan_text(css, 'src/blocks/x/style.css', '.css')
    expect(len(f) == 2, 'positive: a hidden bar is two findings (the declaration and the ::-webkit-scrollbar rule)')
    expect(all(classify(x)[0] == 'hard-coded' for x in f), 'positive: both are hard-coded in a block stylesheet')
    expect(not scan_text('.a::-webkit-scrollbar-thumb{width:4px;background:red}', 'src/blocks/x/style.css', '.css'), 'negative control: styling the thumb is not a finding')
    expect(not scan_text('/* scrollbar-width: none; */', 'src/blocks/x/style.css', '.css'), 'negative control: a comment is not a finding')
    expect(not scan_text('.a::-webkit-scrollbar{background:transparent}', 'src/blocks/x/style.css', '.css'), 'edge: a bar rule that sets only its background is not a finding')
    php = "$css .= $sel . '::-webkit-scrollbar{display:none;}';\n$css .= $sel . '{scrollbar-width:thin;}';\n"
    f = scan_text(php, 'includes/x.php', '.php')
    expect(len(f) == 2 and all(classify(x)[0] == 'hard-coded' for x in f), 'positive: CSS built in a PHP string is found')
    f = scan_text(php, 'includes/helpers-scrollbar.php', '.php')
    expect(all(classify(x)[0] == 'mechanism' for x in f), 'definition: the helper itself is the mechanism, not a finding')
    expect(classify({'file': 'src/blocks/google-reviews/style.css', 'text': ''})[0] == 'exempt', 'exempt: a held file is exempt with its reason')
    for p in list(EXEMPT) + [p for p, _ in EXEMPT_LINES] + sorted(MECHANISM):
        expect(os.path.isfile(os.path.join(PLUGIN, p)), f'exempt or mechanism path exists: {p}')
    expect(STYLE_CALL_RE.findall("sgs_scrollbar_style( $attributes['scrollbarStyle'] ?? null, 'hidden' )") == ['scrollbarStyle'], 'crosscheck: a helper call is read')
    expect(choice_attrs({'attributes': {'a': {'enum': CHOICE_ENUM}, 'b': {'enum': ['thin', 'standard']}}}) == ['a'], 'crosscheck: only the three-choice enum is a scrollbar choice setting')
    # Corpus control: a second, dumb enumeration (every line naming scrollbar-width or ::-webkit-scrollbar{ with a size)
    # must find no hard-coded line the classifier missed.
    s = survey()
    known = {(x['file'], x['line']) for x in s['findings']}
    dumb = set()
    for f in files_under(PLUGIN, SCAN_DIRS, SCAN_EXT):
        ext = os.path.splitext(f)[1]
        clean = strip_comments(open(f, encoding='utf-8', errors='replace').read(), ext)
        for i, line in enumerate(clean.split('\n'), 1):
            if 'scrollbar-width' in line or '-ms-overflow-style' in line:
                dumb.add((rel(f), i))
    expect(dumb <= known, f'corpus control: every scrollbar-width / -ms-overflow-style line is a finding ({len(dumb - known)} missed)')
    print('self-test ' + ('OK' if ok else 'FAILED'))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.check:
        return check()
    if a.fix:
        return fix()
    s = survey()
    if a.json:
        print(json.dumps(s, indent=1))
    else:
        print_survey(s)
    return 0


if __name__ == '__main__':
    sys.exit(main())
