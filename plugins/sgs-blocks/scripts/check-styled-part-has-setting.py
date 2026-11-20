#!/usr/bin/env python3
"""Detector: a part an SGS block draws itself, whose look has no setting.

WHY THIS EXISTS
    The 2026-11-20 fixed-looks audit (.claude/reports/2026-11-18-template-rework/
    fixed-looks-audit.md) found blocks that draw a button whose look is fixed in
    code: the buy box flow opener wore the secondary preset with no setting, so a
    draft that drew it differently could only be matched with hand-written CSS.
    Plan Task 6 (.claude/plans/2026-11-18-template-rework.md, "A setting for every
    reusable look") fixes that with a built-in button kit declared in block.json as
    `supports.sgs.builtinButtons`. This detector is what must exist BEFORE the
    button migrations (migration-method Step 4: the detector is the first
    deliverable), and it stays as the gate that stops a new hard-wired button
    arriving.

PASSES (more are added later; the CLI and the baseline are built for that)
    buttons   every button element an SGS block, include or theme file prints, every
              literal preset slug chosen in PHP, every block or theme stylesheet that
              reads a starter preset's tokens for its own part.

CATEGORIES (every site lands in exactly one)
    on-kit        the owning block declares the part in supports.sgs.builtinButtons
    target        listed in data/builtin-button-targets.json (design note section 7)
    exempt        data/styled-part-exemptions.json, each rule with a reason
    unrecognised  anything else: reported, and counted by --check against the ceiling

CLI
    --survey [--json]      census, no writes (--json is the durable artefact)
    --fix                  the RENAME pass for the built-in button migration: prints a
                           unified diff (data/builtin-button-renames.json is the map)
    --fix --apply          writes it (atomic); refuses while any reference is unrecognised
    --check                ratcheted ceiling: exit 1 when target + unrecognised rises above
                           data/styled-part-baseline.json, when a baseline entry no longer
                           exists, when the baseline is slack, or when a gate-input
                           (exemption, target, width) is stale; 0 otherwise
    --write-baseline       re-measure the baseline; refuses to raise it
    --self-test            the fixtures (Step 6) plus a planted hard-wired button
    --pass buttons         the only pass today; the default runs every pass that exists

    python check-styled-part-has-setting.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse
import difflib
import fnmatch
import io
import json
import os
import re
import sys

# Windows consoles default to cp1252; one non-ASCII glyph kills a census partway.
if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)                          # plugins/sgs-blocks
REPO = os.path.dirname(os.path.dirname(PLUGIN))         # repo root
DATA = os.path.join(HERE, 'data')
EXEMPTIONS_PATH = os.path.join(DATA, 'styled-part-exemptions.json')
TARGETS_PATH = os.path.join(DATA, 'builtin-button-targets.json')
BASELINE_PATH = os.path.join(DATA, 'styled-part-baseline.json')
RENAMES_PATH = os.path.join(DATA, 'builtin-button-renames.json')

PASSES = ('buttons',)
CATEGORIES = ('on-kit', 'target', 'exempt', 'unrecognised')

# Directories that are never source. Pruned during the walk, never after.
PRUNE = {'.git', 'node_modules', 'build', 'vendor', 'worktrees', 'backups', 'reports',
         'dist', 'coverage', '.claude', 'fixtures', '__snapshots__', 'archive'}

# The class tokens that make an <a> (or a bare class string) a button.
BUTTON_SUFFIXES = ('button', 'cta', 'submit', 'add-to-cart', 'opener', 'continue',
                   'close', 'skip', 'load-more')
BUTTON_TOKEN = re.compile(
    r'(?<![\w.#-])[A-Za-z][\w-]*__(?:' + '|'.join(re.escape(s) for s in BUTTON_SUFFIXES) +
    r')(?:--[\w-]+)?(?![\w-])|(?<![\w.#-])wp-element-button(?![\w-])')
STARTERS = ('primary', 'secondary', 'outline')


def rel(path, root=REPO):
    return os.path.relpath(path, root).replace('\\', '/')


def read_text(path):
    with io.open(path, encoding='utf-8', newline='', errors='replace') as f:
        return f.read()


def write_atomic(path, text):
    tmp = path + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    os.replace(tmp, path)


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with io.open(path, encoding='utf-8') as f:
        return json.load(f)


# ----------------------------------------------------------------------------
# Comment stripping. Comments are blanked to spaces (newlines kept) so a button
# named in a docblock is never counted and every offset and line number holds.
# ----------------------------------------------------------------------------
def _blank(s):
    return re.sub(r'[^\n]', ' ', s)


_PHP_OPEN = re.compile(r'<\?(?:php\b|=)')
_PHP_TOK = re.compile(
    r"//[^\n]*?(?=\?>|\n|\Z)|#(?!\[)[^\n]*?(?=\?>|\n|\Z)|/\*.*?\*/"
    r"|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|\?>"
    r"|<<<[ \t]*(['\"]?)(\w+)\1\r?\n.*?^[ \t]*\2\b", re.S | re.M)


def strip_php(src):
    """Blank PHP comments (HTML outside <?php ... ?> is left alone); strings are kept."""
    out = []
    pos, n, php = 0, len(src), False
    while pos < n:
        if not php:
            m = _PHP_OPEN.search(src, pos)
            if not m:
                out.append(src[pos:])
                break
            out.append(src[pos:m.end()])
            pos, php = m.end(), True
            continue
        m = _PHP_TOK.search(src, pos)
        if not m:
            out.append(src[pos:])
            break
        out.append(src[pos:m.start()])
        g = m.group(0)
        if g == '?>':
            out.append(g)
            php = False
        elif g.startswith(('//', '#', '/*')):
            out.append(_blank(g))
        else:
            out.append(g)
        pos = m.end()
    return ''.join(out)


_JS_TOK = re.compile(
    r"//[^\n]*|/\*.*?\*/|'(?:\\.|[^'\\\n])*'|\"(?:\\.|[^\"\\\n])*\"|`(?:\\.|[^`\\])*`", re.S)


def strip_js(src):
    """Blank JS comments; string and template literals are kept."""
    return _JS_TOK.sub(lambda m: _blank(m.group(0)) if m.group(0).startswith(('//', '/*')) else m.group(0), src)


def strip_css(src):
    return re.sub(r'/\*.*?\*/', lambda m: _blank(m.group(0)), src, flags=re.S)


def strip_for(path, text):
    if path.endswith('.php'):
        return strip_php(text)
    if path.endswith('.js') or path.endswith('.mjs'):
        return strip_js(text)
    if path.endswith('.css'):
        return strip_css(text)
    return text


# ----------------------------------------------------------------------------
# The corpus. Real tree on disk, or a dict in a fixture: both are `Corpus`.
# ----------------------------------------------------------------------------
JS_EDITOR_ONLY = re.compile(
    r'(^|/)(edit[\w.-]*|inspector[\w.-]*|canvas-mock[\w.-]*|preview[\w.-]*|deprecated|save|'
    r'[\w.-]*\.test|[\w.-]*Panel[\w.-]*|[\w.-]*Controls?[\w.-]*|[A-Z][\w.-]*)\.js$')


def survey_scope(r):
    """Is repo-relative path `r` a file whose buttons the survey reads?"""
    if not r.endswith(('.php', '.js', '.html')):
        return False
    if r.startswith('plugins/sgs-blocks/src/components/'):
        return False
    if r.startswith('plugins/sgs-blocks/src/'):
        if r.endswith('.html'):
            return False
        # Editor-only code: never printed on the front end.
        if (re.search(r'^plugins/sgs-blocks/src/blocks/(extensions/|[^/]+/components/|[^/]+/index\.js$)', r)
                or r == 'plugins/sgs-blocks/src/index.js'
                or re.search(r'(^|/)canvas-[\w.-]*\.js$', r)):
            return False
        if r.endswith('.js') and JS_EDITOR_ONLY.search(r):
            return False
        return True
    if r.startswith('plugins/sgs-blocks/includes/'):
        return not r.endswith(('.html', '.js'))
    if r.startswith('theme/sgs-theme/'):
        parts = r.split('/')
        if 'tests' in parts or 'vendor' in parts:
            return False
        return True
    return False


def css_scope(r):
    return ((r.startswith('plugins/sgs-blocks/src/blocks/') and r.endswith('/style.css'))
            or (r.startswith('theme/sgs-theme/assets/css/') and r.endswith('.css')))


class Corpus:
    def __init__(self, files):
        self.files = files           # rel -> text

    @classmethod
    def from_disk(cls):
        files = {}
        for base in ('plugins/sgs-blocks/src', 'plugins/sgs-blocks/includes', 'theme/sgs-theme'):
            for dirpath, dirnames, filenames in os.walk(os.path.join(REPO, base)):
                dirnames[:] = [d for d in dirnames if d not in PRUNE]
                for fn in filenames:
                    p = os.path.join(dirpath, fn)
                    r = rel(p)
                    if survey_scope(r) or css_scope(r) or fn == 'block.json':
                        files[r] = read_text(p)
        return cls(files)

    def block_json(self, slug):
        txt = self.files.get('plugins/sgs-blocks/src/blocks/%s/block.json' % slug)
        if txt is None:
            return None
        try:
            return json.loads(txt)
        except ValueError:
            return None

    def block_slugs(self):
        return sorted({r.split('/')[4] for r in self.files
                       if r.startswith('plugins/sgs-blocks/src/blocks/') and r.count('/') >= 5})


def wide_enumeration():
    """A SECOND, dumb list of every file that mentions a button element or class.

    Shares no code with survey_scope(): walk the whole repo, prune only never-source
    directories, keep anything containing `<button`, `createElement('button')` or a
    button class token. Corpus control: anything here and not surveyed must be named
    in the exemptions file's `width_ok` with a reason.
    """
    found = set()
    pat = re.compile(r'<button\b|createElement\(\s*[\'"]button|wp-element-button|__(?:' +
                     '|'.join(re.escape(s) for s in BUTTON_SUFFIXES) + r')\b')
    never_source = PRUNE | {'scripts', 'tests', 'test', 'docs', 'specs', 'languages', 'patterns-data'}
    for root in (os.path.join(REPO, 'plugins', 'sgs-blocks'), os.path.join(REPO, 'theme', 'sgs-theme')):
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in never_source]
            for fn in filenames:
                if not fn.endswith(('.php', '.js', '.html')) or fn.endswith('.min.js'):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    if pat.search(read_text(p)):
                        found.add(rel(p))
                except OSError:
                    continue
    return found


# ----------------------------------------------------------------------------
# Site recognition
# ----------------------------------------------------------------------------
PHP_FUNC = re.compile(r'\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(')
JS_FUNC = re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|'
                     r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)')


def symbol_index(text, path):
    rx = PHP_FUNC if path.endswith('.php') else JS_FUNC
    return [(m.start(), next(g for g in m.groups() if g)) for m in rx.finditer(text)]


def symbol_at(index, pos):
    sym = '(file)'
    for start, name in index:
        if start > pos:
            break
        sym = name
    return sym


def line_of(text, pos):
    return text.count('\n', 0, pos) + 1


def tag_text(s, pos, limit=900):
    """From `<` at pos to the closing `>` of the opening tag, ignoring `->`, `=>` and `?>`."""
    depth_php = False
    i = pos
    end = min(len(s), pos + limit)
    while i < end:
        two = s[i:i + 2]
        if s[i:i + 5] == '<?php' or s[i:i + 3] == '<?=':
            depth_php = True
            i += 3
            continue
        if two == '?>':
            depth_php = False
            i += 2
            continue
        if s[i] == '>' and not depth_php and s[i - 1] not in '-=':
            return s[pos:i + 1]
        i += 1
    return s[pos:end]


def class_tokens(tag):
    """The BEM-ish class tokens in a tag, plus a stem and whether the class is computed."""
    m = re.search(r'class\s*=\s*\\?(["\'])?(.*)', tag, flags=re.S)
    raw = m.group(2) if m else ''
    raw = re.sub(r'\s+', ' ', raw)[:200]
    toks = re.findall(r'[A-Za-z][\w-]*__[\w-]+|wp-element-button|\bbutton\b|[A-Za-z][\w-]*(?:button|btn)[\w-]*', raw)
    dyn = bool(re.search(r'%[\d$]*s|<\?|\$|\$\{|"\s*\.|\'\s*\.', raw))
    stem = ''
    for t in toks:
        if '__' in t or t == 'wp-element-button':
            stem = t
            break
    if not stem and toks:
        stem = toks[0]
    if not stem:
        v = re.search(r'\$[A-Za-z_]\w*|\$\{[^}]*\}|%[\d$]*s', raw)
        stem = v.group(0) if v else ('(no-class)' if not raw.strip() else '(dynamic)')
    return toks, stem, dyn


# Anything find_sites() can report contains one of these in the raw text; a file with none is skipped
# before the comment stripper runs (the stripper is the slow part).
QUICK_HINT = re.compile(
    r'<button|createElement|wp-element-button|button-presets--|__(?:' +
    '|'.join(re.escape(x) for x in BUTTON_SUFFIXES) + r')|[\'"](?:' + '|'.join(STARTERS) + r')[\'"]')


def find_sites(path, text):
    """Every button element, preset literal and (CSS) preset read in one file."""
    if not QUICK_HINT.search(text):
        return []                      # nothing in the raw text can become a site: skip the slow strip
    s = strip_for(path, text)
    sites = []
    if path.endswith('.css'):
        return css_sites(path, s)
    idx = symbol_index(s, path)
    taken = []

    def add(kind, pos, toks, stem, snippet, dyn=False):
        sites.append({'file': path, 'line': line_of(s, pos), 'kind': kind, 'classes': toks,
                      'stem': stem, 'symbol': symbol_at(idx, pos), 'dynamic': dyn,
                      'snippet': re.sub(r'\s+', ' ', snippet.strip())[:140]})
        taken.append((pos, pos + len(snippet)))

    for m in re.finditer(r'<button\b', s):
        tag = tag_text(s, m.start())
        toks, stem, dyn = class_tokens(tag)
        add('button', m.start(), toks, stem, tag, dyn)
    for m in re.finditer(r'<a\b(?=[\s>])', s, flags=re.I):
        tag = tag_text(s, m.start())
        cm = re.search(r'class\s*=\s*\\?(["\'])?(.*)', tag, flags=re.S)
        if not cm or not BUTTON_TOKEN.search(cm.group(2)):
            continue
        toks, stem, dyn = class_tokens(tag)
        add('a', m.start(), toks, stem, tag, dyn)
    if path.endswith('.js'):
        for m in re.finditer(r'createElement\(\s*([\'"])button\1\s*\)', s):
            tail = s[m.end():m.end() + 500]
            cm = re.search(r'className\s*=\s*([\'"`])([^\'"`]*)\1|classList\.add\(\s*([\'"`])([^\'"`]*)\3', tail)
            raw = (cm.group(2) or cm.group(4)) if cm else ''
            toks = re.findall(r'[A-Za-z][\w-]*', raw)
            stem = next((t for t in toks if '__' in t), toks[0] if toks else '(no-class)')
            add('createElement', m.start(), toks, stem, m.group(0), False)
    # A class string that names a button part and sits outside a tag already seen.
    for m in re.finditer(r'([\'"`])([^\'"`\n]*)\1', s):
        body = m.group(2)
        if not BUTTON_TOKEN.search(body):
            continue
        if any(a <= m.start() < b for a, b in taken):
            continue
        if body.lstrip().startswith('<'):
            continue
        if re.search(r'(?<![\w-])[.#][\w-]*__', body) and not re.search(r'(?<![\w.#-])[A-Za-z][\w-]*__', body):
            continue
        toks = BUTTON_TOKEN.findall(body) and [t.group(0) for t in BUTTON_TOKEN.finditer(body)]
        add('class-string', m.start(), toks, toks[0], m.group(0), False)
    if path.endswith('.php') and not re.search(r'/(patterns|templates|parts)/', path):
        sites += preset_literal_sites(path, s, idx)
    return sites


PRESET_CONTEXT = re.compile(r'preset|button|btn|\bcta|opener|add_to_cart|inherit_?style|_style\b|Style\b', re.I)
COLOUR_CONTEXT = re.compile(r'colou?r|background|\bbg\b|border|text_|fill|swatch|tone|accent|ring|focus|spacing|font', re.I)
PRESET_LITERAL = re.compile(r'([\'"])(' + '|'.join(STARTERS) + r')\1')


def preset_literal_sites(path, s, idx):
    out = []
    pos = 0
    for line in s.split('\n'):
        start = pos
        pos += len(line) + 1
        for m in PRESET_LITERAL.finditer(line):
            ctx = line
            if not PRESET_CONTEXT.search(ctx):
                continue
            if COLOUR_CONTEXT.search(re.sub(r'preset|button', '', ctx, flags=re.I)):
                continue
            # `$attributes['submitStyle'] ?? 'primary'` reads the author's choice and only falls
            # back to a literal: the choice comes from an attribute, so it is not chosen in PHP.
            if re.search(r'\$(?:attributes|attrs|atts|attr|block_attributes)\s*\[', ctx):
                continue
            # a read from an attribute names the attribute: `$attributes['ctaStyle'] ?? 'primary'`
            # is still a literal fallback, so it is a finding; only a bare comparison to an
            # attribute that holds the author's choice is not chosen in PHP.
            out.append({'file': path, 'line': line_of(s, start), 'kind': 'preset-literal',
                        'classes': [], 'stem': 'preset:' + m.group(2), 'symbol': symbol_at(idx, start),
                        'dynamic': False, 'snippet': re.sub(r'\s+', ' ', line.strip())[:140]})
            break
    return out


def css_sites(path, s):
    """Blocks of CSS that read `--wp--custom--button-presets--<starter>--` for their own part."""
    out = []
    rx = re.compile(r'--wp--custom--button-presets--(' + '|'.join(STARTERS) + r')--')
    # selector = the text before the nearest preceding `{` at depth 0 (rules inside @media are
    # attributed to their own selector).
    for m in rx.finditer(s):
        brace = s.rfind('{', 0, m.start())
        sel_start = max(s.rfind('}', 0, brace), s.rfind('{', 0, brace), s.rfind(';', 0, brace)) + 1
        sel = re.sub(r'\s+', ' ', s[sel_start:brace]).strip()
        if any(o['stem'] == sel and o['symbol'] == 'preset:' + m.group(1) for o in out):
            continue
        out.append({'file': path, 'line': line_of(s, m.start()), 'kind': 'css-preset-read',
                    'classes': [], 'stem': sel, 'symbol': 'preset:' + m.group(1), 'dynamic': False,
                    'snippet': sel[:140]})
    return out


# ----------------------------------------------------------------------------
# Classification
# ----------------------------------------------------------------------------
def element_of(stem):
    """`sgs-choice-flow__skip-button` -> `skip-button`; `buybox__add-to-cart--x` -> `add-to-cart`."""
    if '__' not in stem:
        return ''
    return re.split(r'--', stem.split('__', 1)[1])[0]


def owner_block(corpus, site):
    f = site['file']
    if f.startswith('plugins/sgs-blocks/src/blocks/'):
        return f.split('/')[4]
    stem = site['stem']
    m = re.match(r'(?:sgs-)?([a-z0-9-]+?)__', stem)
    if m and m.group(1) in corpus.block_slugs():
        return m.group(1)
    return ''


def declared_parts(corpus, slug):
    bj = corpus.block_json(slug) if slug else None
    if not bj:
        return set()
    items = (((bj.get('supports') or {}).get('sgs') or {}).get('builtinButtons')) or []
    return {i.get('part') for i in items if isinstance(i, dict) and i.get('part')}


def rule_matches(rule, site):
    files = rule.get('files') or ([rule['file']] if 'file' in rule else [])
    if files and not any(fnmatch.fnmatchcase(site['file'], g) for g in files):
        return False
    if 'kind' in rule and site['kind'] not in (rule['kind'] if isinstance(rule['kind'], list) else [rule['kind']]):
        return False
    if 'class' in rule and not re.search(rule['class'], ' '.join(site['classes']) + ' ' + site['stem']):
        return False
    if 'symbol' in rule and not re.search(rule['symbol'], site['symbol']):
        return False
    if 'snippet' in rule and not re.search(rule['snippet'], site['snippet']):
        return False
    return True


def classify(site, corpus, cfg):
    """Return (category, reason, rule_id). `unrecognised` is the default and is never silent."""
    slug = owner_block(corpus, site)
    parts = declared_parts(corpus, slug)
    if parts and element_of(site['stem']) in parts and site['kind'] in ('button', 'a', 'createElement', 'class-string'):
        return 'on-kit', 'declared in supports.sgs.builtinButtons of sgs/%s' % slug, ''
    for rule in cfg['targets']:
        if rule_matches(rule, site):
            return 'target', 'design note section 7: %s %s (%s)' % (rule['block'], rule['prefix'], rule['phase']), rule['id']
    for rule in cfg['exemptions']:
        if rule_matches(rule, site):
            return 'exempt', rule.get('reason', ''), rule['id']
    return 'unrecognised', 'no target or exemption rule matches', ''


def site_key(site):
    return '%s::%s::%s' % (site['file'], site['symbol'], site['stem'] if site['kind'] != 'preset-literal' else site['stem'])


def load_cfg():
    ex = load_json(EXEMPTIONS_PATH, {}) or {}
    tg = load_json(TARGETS_PATH, {}) or {}
    return {'exemptions': ex.get('exemptions', []), 'width_ok': ex.get('width_ok', {}),
            'targets': tg.get('targets', [])}


def run_survey(corpus, cfg):
    sites = []
    for path in sorted(corpus.files):
        if not (survey_scope(path) or css_scope(path)) or path.endswith('block.json'):
            continue
        for st in find_sites(path, corpus.files[path]):
            cat, reason, rid = classify(st, corpus, cfg)
            st['category'], st['reason'], st['rule'] = cat, reason, rid
            st['key'] = site_key(st)
            sites.append(st)
    return sites


def tally(sites):
    t = {c: 0 for c in CATEGORIES}
    for s in sites:
        t[s['category']] += 1
    return t


def keyed(sites, cats=('target', 'unrecognised')):
    out = {}
    for s in sites:
        if s['category'] in cats:
            out[s['key']] = out.get(s['key'], 0) + 1
    return out


def crosscheck(corpus, cfg, sites, wide=None):
    """Whole-corpus failures a per-site view cannot see. Empty means clean."""
    fails = []
    used = {s['rule'] for s in sites if s['rule']}
    for rule in cfg['exemptions']:
        if not str(rule.get('reason', '')).strip():
            fails.append('exemption %s carries no reason' % rule.get('id'))
    for rule in cfg['exemptions'] + cfg['targets']:
        if rule['id'] not in used:
            fails.append('STALE rule %s matches no site; a stale allowlist entry is indistinguishable '
                         'from no entry, remove it' % rule['id'])
    scanned = {s['file'] for s in sites}
    surveyed_files = {p for p in corpus.files if survey_scope(p)}
    if wide is not None:
        globs = list(cfg['width_ok'])
        gap = sorted(f for f in wide - surveyed_files if not any(fnmatch.fnmatchcase(f, g) for g in globs))
        if gap:
            fails.append('CORPUS TOO NARROW: %d file(s) mention a button element or class and are not '
                         'surveyed, nor named in width_ok: %s' % (len(gap), ', '.join(gap[:6])))
        for g in sorted(globs):
            if not any(fnmatch.fnmatchcase(f, g) for f in wide):
                fails.append('STALE width_ok entry %s: it matches no file that still mentions a button' % g)
        # The narrow list may hold files with no site (a file the wide grep matched only in a
        # comment); that is fine. The reverse is the failure above.
    for f in sorted(scanned):
        if f not in corpus.files:
            fails.append('site in a file the corpus does not hold: %s' % f)
    return fails


def load_baseline():
    return load_json(BASELINE_PATH, {'ceiling': None, 'entries': {}})


def ratchet(sites, baseline):
    """Return failures: a key above its baseline count, a key not in it, a baseline key gone or lower."""
    live = keyed(sites)
    base = baseline.get('entries', {})
    fails = []
    total_live = sum(live.values())
    ceiling = baseline.get('ceiling')
    if ceiling is None:
        fails.append('no baseline: run --write-baseline once, then commit data/styled-part-baseline.json')
        return fails, live
    if total_live > ceiling:
        fails.append('target + unrecognised is %d, above the ceiling %d' % (total_live, ceiling))
    for k, n in sorted(live.items()):
        if k not in base:
            fails.append('NEW (not in the baseline): %s x%d' % (k, n))
        elif n > base[k]:
            fails.append('RISEN: %s is %d, baseline %d' % (k, n, base[k]))
    for k, n in sorted(base.items()):
        if k not in live:
            fails.append('STALE baseline entry (no longer exists): %s' % k)
        elif live[k] < n:
            fails.append('SLACK: %s is %d, baseline still %d; lower it with --write-baseline' % (k, live[k], n))
    if sum(base.values()) != ceiling:
        fails.append('ceiling %d does not equal the sum of the entries %d' % (ceiling, sum(base.values())))
    return fails, live


# ----------------------------------------------------------------------------
# The rename pass (built-in button migration, design note section 7)
# ----------------------------------------------------------------------------
class Rename:
    def __init__(self, d):
        self.block = d['block']
        self.slug = d['block'].split('/', 1)[1]
        self.old = d['old']
        self.new = d['new']
        self.value = d.get('value')
        self.also = [b.split('/', 1)[1] for b in d.get('also_declared_by', [])]
        self.pat = re.compile(r'(?<![\w])' + re.escape(self.old) + r'(?![\w])')

    def in_scope(self, r):
        """Files the rename may rewrite: this block's directory and the shared includes."""
        if r.startswith('plugins/sgs-blocks/src/blocks/%s/' % self.slug):
            return not re.search(r'(^|/)(tests?|build|__snapshots__|fixtures?)/', r)
        if r.startswith('plugins/sgs-blocks/includes/'):
            return True
        return False


# A shared include owned by one block, by path, so a name two blocks declare is never guessed.
INCLUDE_OWNER = (
    (re.compile(r'^plugins/sgs-blocks/includes/account/'), 'account'),
    (re.compile(r'^plugins/sgs-blocks/includes/buybox'), 'buybox'),
    (re.compile(r'^plugins/sgs-blocks/includes/product-card'), 'product-card'),
    (re.compile(r'^plugins/sgs-blocks/includes/choice-flow'), 'choice-flow'),
)


def include_owner(r):
    for rx, slug in INCLUDE_OWNER:
        if rx.search(r):
            return slug
    return ''


def classify_ref(rn, path, line, m, in_comment):
    """Name the shape of one reference to an old attribute name, or 'unrecognised'."""
    before, after = line[:m.start()], line[m.end():]
    q = before[-1:] if before else ''
    qa = after[:1]
    if path.endswith('block.json'):
        if q == '"' and qa == '"':
            return 'json-key' if re.match(r'"\s*:', after[0:] if False else after) or re.match(r'"\s*:', after) else 'json-string'
        return 'unrecognised'
    if in_comment:
        return 'comment'
    if q in '\'"' and qa == q:
        if re.search(r'\$\w+\s*\[\s*$', before[:-1]):
            return 'php-read' if path.endswith('.php') else 'js-bracket-read'
        if re.match(r'\s*=>', after[1:]):
            return 'php-array-key'
        if re.match(r'\s*:', after[1:]):
            return 'js-key'
        if re.search(r'=>\s*$', before[:-1]):
            return 'php-key-ref'
        if re.search(r'[:,(\[]\s*$', before[:-1]) or re.search(r'\b(?:base|hover|attrs?)\s*:\s*$', before[:-1]):
            return 'string-arg'
        return 'string-literal'
    if path.endswith('.js'):
        if re.search(r'(?:attributes|attrs|props)\s*\??\.\s*$', before):
            return 'js-member'
        if re.match(r'\s*:', after) and not re.search(r'\?\s*[^:]*$', before):
            return 'js-key'
        if re.match(r'\s*[,}=)]|\s*$|\s*[|&?]|\s*\|\|', after) or re.search(r'[\{,(\s]\s*$', before):
            return 'js-identifier'
    return 'unrecognised'


def comment_lines(path, text):
    """Set of 1-based line numbers whose non-blank text is entirely comment."""
    if path.endswith('.json'):
        return set()
    stripped = strip_for(path, text)
    out = set()
    for i, (a, b) in enumerate(zip(text.split('\n'), stripped.split('\n')), 1):
        if a.strip() and not b.strip():
            out.add(i)
    return out


def shape_json(old_block_text, spec):
    """Apply a value-shape transform to one attribute object (parsed), return it."""
    kind = spec['kind']
    obj = json.loads(old_block_text, object_pairs_hook=dict)
    if kind == 'string-to-desktop-object':
        obj['type'] = 'object'
        if 'default' in obj:
            d = obj['default']
            obj['default'] = {'desktop': d} if isinstance(d, str) and d != '' else {}
    elif kind == 'number-to-desktop-object':
        obj['type'] = 'object'
        if 'default' in obj:
            d = obj['default']
            obj['default'] = {'desktop': d} if isinstance(d, (int, float)) else {}
    elif kind == 'true-to-full':
        obj['type'] = 'string'
        obj.pop('default', None)
        if 'enum' in obj:
            obj['enum'] = ['fit', 'full']
    else:
        raise ValueError('unknown value transform ' + kind)
    return obj


def rewrite_block_json(text, rn):
    """Rename the attribute key / string refs, then apply the shape transform to its definition."""
    records = []
    out = text
    if rn.old != rn.new:
        def sub(m):
            return '"%s"' % rn.new
        out, n = re.subn(r'"' + re.escape(rn.old) + r'"', sub, out)
        for _ in range(n):
            records.append(('json', 0))
    if rn.value:
        key = '"%s"' % rn.new
        i = out.find(key + ':') if (key + ':') in out else out.find(key)
        # the attribute definition is the first `"name": {` object under `attributes`
        m = re.search(re.escape(key) + r'\s*:\s*\{', out)
        if m:
            start = m.end() - 1
            depth, j, instr = 0, start, False
            while j < len(out):
                c = out[j]
                if instr:
                    if c == '\\':
                        j += 1
                    elif c == '"':
                        instr = False
                elif c == '"':
                    instr = True
                elif c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            body = out[start:j + 1]
            obj = shape_json(body, rn.value)
            line_start = out.rfind('\n', 0, m.start()) + 1
            indent = re.match(r'[ \t]*', out[line_start:]).group(0)
            unit = '\t' if '\t' in indent or not indent else indent
            ser = json.dumps(obj, indent=unit if unit == '\t' else len(unit) or 2, ensure_ascii=False)
            ser = ser.replace('\n', '\n' + indent)
            out = out[:start] + ser + out[j + 1:]
            records.append(('json-shape', 0))
    return out, records


def rewrite_code(rn, path, text):
    """Rename `rn.old` in one PHP/JS file. Returns (new_text, records, refusals, shape_sites)."""
    lines = text.split('\n')
    cl = comment_lines(path, text)
    has_decl = False
    refs = []
    for i, line in enumerate(lines, 1):
        for m in rn.pat.finditer(line):
            shape = classify_ref(rn, path, line, m, i in cl)
            refs.append((i, m, shape))
            if shape in ('js-member', 'js-key', 'js-bracket-read', 'php-read'):
                has_decl = True
    out_lines = list(lines)
    records, refusals, shape_sites = [], [], []
    by_line = {}
    for i, m, shape in refs:
        if shape == 'js-identifier' and not has_decl:
            shape = 'unrecognised'
        if shape == 'unrecognised' and path.endswith('.php') and line_has_var(lines[i - 1], m):
            shape = 'unrecognised'
        records.append((i, shape))
        if shape == 'unrecognised':
            refusals.append((i, lines[i - 1].strip()[:120]))
        elif rn.value:
            shape_sites.append((i, shape, lines[i - 1].strip()[:120]))
        by_line.setdefault(i, []).append((m, shape))
    if rn.old != rn.new:
        for i, items in by_line.items():
            if any(sh == 'unrecognised' for _, sh in items):
                continue
            out_lines[i - 1] = rn.pat.sub(rn.new, lines[i - 1])
    return '\n'.join(out_lines), records, refusals, sorted(set(shape_sites))


def line_has_var(line, m):
    return line[max(0, m.start() - 1):m.start()] == '$'


def rename_plan(corpus_files, renames):
    """Plan every rewrite. corpus_files: rel -> text over the rename trees. Returns a plan dict."""
    plan = {'files': {}, 'records': [], 'refusals': [], 'shape': [], 'skipped': []}
    for rn in renames:
        for r in sorted(corpus_files):
            if not rn.in_scope(r) or not rn.pat.search(corpus_files[r]):
                continue
            if r.startswith('plugins/sgs-blocks/includes/') and rn.also:
                owner = include_owner(r)
                if owner != rn.slug:
                    plan['skipped'].append((rn.old, r, 'shared include, name also declared by %s; owner %s'
                                            % (', '.join(rn.also), owner or 'unknown')))
                    if not owner and rn.old != rn.new:
                        # A rename must know whose attribute it is rewriting; a reshape only lists.
                        plan['refusals'].append((rn.old, r, 0, 'ambiguous include: cannot tell which block it belongs to'))
                    elif rn.old == rn.new:
                        plan['shape'].append((rn.old, r, 0, 'shared-include', 'names the attribute in a shared helper; read it by hand'))
                    continue
            cur = plan['files'].get(r, (corpus_files[r], corpus_files[r]))[1]
            if r.endswith('block.json'):
                new, recs = rewrite_block_json(cur, rn)
                for kind, _ in recs:
                    plan['records'].append((rn.old, r, kind))
            else:
                new, recs, refusals, shape_sites = rewrite_code(rn, r, cur)
                for ln, sh in recs:
                    plan['records'].append((rn.old, r, sh))
                for ln, snip in refusals:
                    plan['refusals'].append((rn.old, r, ln, snip))
                for ln, sh, snip in shape_sites:
                    plan['shape'].append((rn.old, r, ln, sh, snip))
            if new != cur:
                plan['files'][r] = (corpus_files[r], new)
    return plan


def rename_corpus():
    files = {}
    for base in ('plugins/sgs-blocks/src/blocks', 'plugins/sgs-blocks/includes'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(REPO, base)):
            dirnames[:] = [d for d in dirnames if d not in PRUNE and d not in ('tests', 'test')]
            for fn in filenames:
                if fn.endswith(('.php', '.js', '.json')) and not fn.endswith('.min.js') and not fn.endswith('.asset.php'):
                    p = os.path.join(dirpath, fn)
                    r = rel(p)
                    if fn.endswith('.json') and fn != 'block.json':
                        continue
                    files[r] = read_text(p)
    return files


def elsewhere_census(renames):
    """Every other file in the repo naming an old attribute: not rewritten, listed for the main session."""
    names = sorted({rn.old for rn in renames})
    rx = re.compile(r'(?<![\w])(' + '|'.join(map(re.escape, names)) + r')(?![\w])')
    hits = {}
    for dirpath, dirnames, filenames in os.walk(REPO):
        dirnames[:] = [d for d in dirnames if d not in {'.git', 'node_modules', 'build', 'vendor', 'worktrees', 'backups'}]
        for fn in filenames:
            if not fn.endswith(('.php', '.js', '.json', '.md', '.html', '.py', '.mjs', '.css', '.snap', '.log', '.txt')):
                continue
            p = os.path.join(dirpath, fn)
            r = rel(p)
            if r.endswith(('check-styled-part-has-setting.py', 'builtin-button-renames.json')):
                continue
            if r.startswith('plugins/sgs-blocks/src/blocks/') or r.startswith('plugins/sgs-blocks/includes/'):
                if not re.search(r'(^|/)(tests?|build|fixtures?)/', r):
                    continue
            try:
                found = {m.group(1) for m in rx.finditer(read_text(p))}
            except OSError:
                continue
            if found:
                hits[r] = sorted(found)
    return hits


def diff_text(plan):
    out = []
    for r in sorted(plan['files']):
        old, new = plan['files'][r]
        out.extend(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                                        'a/' + r, 'b/' + r, n=1))
    return ''.join(out)


def load_renames():
    d = load_json(RENAMES_PATH, {'renames': []}) or {'renames': []}
    return [Rename(x) for x in d.get('renames', [])]


# ----------------------------------------------------------------------------
# Reports
# ----------------------------------------------------------------------------
def print_survey(sites, as_json, corpus, cfg):
    t = tally(sites)
    if as_json:
        out = {
            'generated_by': 'plugins/sgs-blocks/scripts/check-styled-part-has-setting.py --survey --json',
            'pass': 'buttons',
            'totals': dict(t, total=len(sites)),
            'by_kind': {k: sum(1 for s in sites if s['kind'] == k) for k in sorted({s['kind'] for s in sites})},
            'sites': [{k: s[k] for k in ('category', 'file', 'line', 'symbol', 'kind', 'stem', 'rule', 'reason', 'snippet')}
                      for s in sorted(sites, key=lambda s: (s['category'], s['file'], s['line']))],
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return
    for cat in ('target', 'unrecognised'):
        print('\n== %s ==' % cat)
        for s in sorted((x for x in sites if x['category'] == cat), key=lambda s: (s['file'], s['line'])):
            print('  %-8s %s::%s  [%s]  %s' % (s['kind'], s['file'], s['symbol'], s['stem'], s['snippet'][:70]))
    print('\n== exempt (by rule) ==')
    by = {}
    for s in sites:
        if s['category'] == 'exempt':
            by.setdefault(s['rule'], 0)
            by[s['rule']] += 1
    for rid, n in sorted(by.items()):
        print('  %4d  %s' % (n, rid))
    print('\nsites: %d' % len(sites))
    for c in CATEGORIES:
        print('%-14s %d' % (c + ':', t[c]))
    print('%-14s %d  (target + unrecognised, what --check gates)' % ('GATED:', t['target'] + t['unrecognised']))


def run_check(corpus, cfg, baseline, wide, quiet=False):
    sites = run_survey(corpus, cfg)
    fails = crosscheck(corpus, cfg, sites, wide)
    rfails, live = ratchet(sites, baseline)
    t = tally(sites)
    gated = t['target'] + t['unrecognised']
    allf = fails + rfails
    if not quiet:
        if allf:
            print('FAIL: %d finding(s); gated count %d (target %d + unrecognised %d), baseline ceiling %s'
                  % (len(allf), gated, t['target'], t['unrecognised'], baseline.get('ceiling')))
            for f in allf:
                print('  - ' + f)
        else:
            print('PASS: gated count %d (target %d + unrecognised %d) = baseline ceiling %s; on-kit %d, exempt %d'
                  % (gated, t['target'], t['unrecognised'], baseline.get('ceiling'), t['on-kit'], t['exempt']))
    return (1 if allf else 0), sites


# ----------------------------------------------------------------------------
# Self-test (migration-method Step 6)
# ----------------------------------------------------------------------------
FX_RENDER = """<?php
// <button class="sgs-fx__cta"> in a comment is not a button
$css = sgs_fill_states_css( $sel, $attributes, array( 'base' => 'addToCartBackgroundColour' ) );
$h   = $attributes['addToCartMinHeight'] ?? '';
$b   = '<button type="button" class="sgs-fx__flow-opener sgs-focus" aria-haspopup="dialog">Pick</button>';
"""
FX_BLOCKJSON = """{
\t"name": "sgs/fx",
\t"attributes": {
\t\t"addToCartBackgroundColour": { "type": "string", "default": "" },
\t\t"addToCartMinHeight": {
\t\t\t"type": "string",
\t\t\t"default": "52px"
\t\t},
\t\t"loginButtonFullWidth": { "type": "boolean", "default": false }
\t}
}
"""
FX_JS = """const { addToCartMinHeight, addToCartBackgroundColour } = attributes;
setAttributes( { addToCartBackgroundColour: val } );
const w = attributes.addToCartMinHeight;
"""
FX_INERT = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"
FX_OTHER_BLOCK = "<?php\n$f = $attributes['ctaFontSize'] ?? array();\n"


def fx_rename(old, new, value=None, also=()):
    return Rename({'block': 'sgs/fx', 'old': old, 'new': new, 'value': value, 'also_declared_by': list(also)})


def self_test():
    fails = []

    def check(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    cfg = {'exemptions': [], 'width_ok': {}, 'targets': [
        {'id': 'fx-opener', 'block': 'sgs/fx', 'prefix': 'flowOpener', 'phase': 'first mover',
         'files': ['plugins/sgs-blocks/src/blocks/fx/*.php'], 'class': r'__flow-opener'}]}
    base_files = {
        'plugins/sgs-blocks/src/blocks/fx/render.php': FX_RENDER,
        'plugins/sgs-blocks/src/blocks/fx/block.json': FX_BLOCKJSON,
        'plugins/sgs-blocks/src/blocks/inert/render.php': FX_INERT,
    }
    corpus = Corpus(dict(base_files))

    # 1 positive: a hard-wired button is found, in the right category, with the comment ignored.
    sites = run_survey(corpus, cfg)
    btn = [s for s in sites if s['kind'] == 'button']
    check('positive: the one real <button> is found (the commented one is not)', len(btn) == 1 and btn[0]['stem'] == 'sgs-fx__flow-opener')
    check('positive: it is a target by the targets rule', btn and btn[0]['category'] == 'target' and btn[0]['rule'] == 'fx-opener')
    check('classes parsed: stem is the BEM element, not a utility class', btn and btn[0]['stem'] == 'sgs-fx__flow-opener')

    # definition: the on-kit shape. A block that declares the part is on-kit and not gated.
    kit_bj = json.loads(FX_BLOCKJSON)
    kit_bj['supports'] = {'sgs': {'builtinButtons': [{'prefix': 'flowOpener', 'part': 'flow-opener', 'label': 'x'}]}}
    kit = Corpus(dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(kit_bj)}))
    ksites = [s for s in run_survey(kit, cfg) if s['kind'] == 'button']
    check('definition: a declared builtinButtons part is on-kit', ksites and ksites[0]['category'] == 'on-kit')

    # edge: a legitimate exemption, and an exemption that matches nothing is stale.
    cfg_ex = {'exemptions': [{'id': 'fx-ex', 'files': ['plugins/sgs-blocks/src/blocks/fx/*.php'], 'class': 'flow-opener',
                              'reason': 'fixture'}], 'width_ok': {}, 'targets': []}
    esites = [s for s in run_survey(corpus, cfg_ex) if s['kind'] == 'button']
    check('edge: an exempt rule moves the site to exempt, with its reason', esites[0]['category'] == 'exempt' and esites[0]['reason'] == 'fixture')
    cfg_stale = {'exemptions': [{'id': 'nope', 'files': ['nothing/*'], 'reason': 'x'}], 'width_ok': {}, 'targets': []}
    stale = crosscheck(corpus, cfg_stale, run_survey(corpus, cfg_stale))
    check('edge: a stale exemption fails the crosscheck', any('STALE rule nope' in f for f in stale))
    cfg_noreason = {'exemptions': [{'id': 'bare', 'files': ['plugins/sgs-blocks/src/blocks/fx/*.php'], 'class': 'flow-opener'}],
                    'width_ok': {}, 'targets': []}
    nr = crosscheck(corpus, cfg_noreason, run_survey(corpus, cfg_noreason))
    check('edge: an exemption with no reason fails the crosscheck', any('carries no reason' in f for f in nr))
    unrec = [s for s in run_survey(corpus, {'exemptions': [], 'width_ok': {}, 'targets': []}) if s['kind'] == 'button']
    check('edge: no rule -> unrecognised, never silent', unrec and unrec[0]['category'] == 'unrecognised')

    # negative control: a file with no buttons yields nothing and survey leaves it byte-identical.
    check('negative control: the inert file has no sites', not [s for s in sites if 'inert' in s['file']])
    check('negative control: survey does not modify the corpus', corpus.files['plugins/sgs-blocks/src/blocks/inert/render.php'] == FX_INERT)

    # idempotence of the survey and of the rename.
    check('idempotence: survey twice gives the same keys', [s['key'] for s in run_survey(corpus, cfg)] == [s['key'] for s in sites])

    # CORPUS CONTROL: a wide, dumb enumeration must be reconciled by the narrow one.
    wide = {'plugins/sgs-blocks/src/blocks/fx/render.php', 'plugins/sgs-blocks/includes/sneaky.php'}
    cx = crosscheck(corpus, cfg, run_survey(corpus, cfg), wide)
    check('corpus control: a wide-only file with a button fails closed', any('CORPUS TOO NARROW' in f and 'sneaky.php' in f for f in cx))
    cfg_w = dict(cfg, width_ok={'plugins/sgs-blocks/includes/sneaky.php': 'fixture reason'})
    cx2 = crosscheck(corpus, cfg_w, run_survey(corpus, cfg_w), wide)
    check('corpus control: WIDTH_OK with a reason reconciles it', not any('CORPUS' in f for f in cx2))
    cx3 = crosscheck(corpus, dict(cfg, width_ok={'plugins/sgs-blocks/includes/gone.php': 'x'}), run_survey(corpus, cfg), wide)
    check('corpus control: a stale width_ok entry fails', any('STALE width_ok' in f for f in cx3))

    # PLANTED hard-wired button: --check must go from 0 to 1.
    sites0 = run_survey(corpus, cfg)
    baseline0 = {'ceiling': sum(keyed(sites0).values()), 'entries': keyed(sites0)}
    rc0, _ = run_check(corpus, cfg, baseline0, None, quiet=True)
    planted = Corpus(dict(base_files, **{
        'plugins/sgs-blocks/src/blocks/fx/extra.php':
            "<?php\n$o = '<button type=\"button\" class=\"sgs-fx__planted-cta\">Go</button>';\n"}))
    rc1, _ = run_check(planted, cfg, baseline0, None, quiet=True)
    check('planted: --check is green at its own baseline', rc0 == 0)
    check('planted: a new hard-wired button makes --check exit 1', rc1 == 1)
    shrunk = Corpus({k: v for k, v in base_files.items() if k.endswith('inert/render.php') or k.endswith('block.json')})
    rc2, _ = run_check(shrunk, cfg, baseline0, None, quiet=True)
    check('ratchet: a baseline entry that no longer exists fails as stale', rc2 == 1)

    # Rename pass fixtures.
    def plan_for(files, *rns):
        return rename_plan(dict(files), list(rns))

    rn_bg = fx_rename('addToCartBackgroundColour', 'addToCartColourBackground')
    rn_mh = fx_rename('addToCartMinHeight', 'addToCartMinHeight', {'kind': 'string-to-desktop-object'})
    files = dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/edit.js': FX_JS,
                                'plugins/sgs-blocks/src/blocks/other/render.php': FX_OTHER_BLOCK})
    p = plan_for(files, rn_bg)
    new_render = p['files']['plugins/sgs-blocks/src/blocks/fx/render.php'][1]
    check('rename positive: a PHP array-value reference is renamed', "'base' => 'addToCartColourBackground'" in new_render)
    check('rename definition: the block.json key CHANGES', '"addToCartColourBackground"' in p['files']['plugins/sgs-blocks/src/blocks/fx/block.json'][1]
          and '"addToCartBackgroundColour"' not in p['files']['plugins/sgs-blocks/src/blocks/fx/block.json'][1])
    new_js = p['files']['plugins/sgs-blocks/src/blocks/fx/edit.js'][1]
    check('rename positive: JS destructure and setAttributes key are renamed',
          'addToCartBackgroundColour' not in new_js and 'addToCartColourBackground: val' in new_js and '{ addToCartMinHeight, addToCartColourBackground }' in new_js)
    check('rename edge: a rename with no refusals is accepted', not p['refusals'])
    check('rename negative control: the inert file is not in the plan', 'plugins/sgs-blocks/src/blocks/inert/render.php' not in p['files'])
    p2 = plan_for({k: v[1] for k, v in p['files'].items()} | {k: v for k, v in files.items() if k not in p['files']}, rn_bg)
    check('rename idempotence: re-running after apply plans nothing', not p2['files'])
    # shape transform
    ps = plan_for(files, rn_mh)
    bj = ps['files']['plugins/sgs-blocks/src/blocks/fx/block.json'][1]
    parsed = json.loads(bj)
    check('rename shape: block.json type string -> object, default "52px" -> {"desktop": "52px"}',
          parsed['attributes']['addToCartMinHeight']['type'] == 'object'
          and parsed['attributes']['addToCartMinHeight']['default'] == {'desktop': '52px'})
    check('rename shape: the file stays valid JSON with the other attributes untouched',
          parsed['attributes']['loginButtonFullWidth'] == {'type': 'boolean', 'default': False})
    check('rename shape: every code read of a reshaped attribute is listed for review', len(ps['shape']) >= 3)
    check('rename shape: a name-keeping shape change does not rewrite code', 'plugins/sgs-blocks/src/blocks/fx/render.php' not in ps['files'])
    # another block's same-named attribute is not touched
    rn_cta = fx_rename('ctaFontSize', 'ctaFontSize', {'kind': 'number-to-desktop-object'})
    pc = plan_for(files, rn_cta)
    check('rename edge: another block directory is out of scope', 'plugins/sgs-blocks/src/blocks/other/render.php' not in pc['files'])
    # refusals
    weird = dict(files, **{'plugins/sgs-blocks/src/blocks/fx/odd.php': "<?php\n$addToCartBackgroundColour = 1;\n"})
    pw = plan_for(weird, rn_bg)
    check('rename refusal: a PHP variable named like the attribute is refused as unrecognised, with its line',
          any(r[2] == 2 for r in pw['refusals']))
    # includes with an ambiguous owner
    inc = {'plugins/sgs-blocks/includes/helpers-x.php': "<?php\n$f = $attributes['ctaFontSize'];\n"}
    amb = fx_rename('ctaFontSize', 'ctaSizeNew', None, also=['sgs/pricing-table'])
    pa = plan_for(inc, amb)
    check('rename edge: a shared include naming a two-block attribute is refused, not guessed', pa['refusals'] and not pa['files'])
    amb_shape = fx_rename('ctaFontSize', 'ctaFontSize', {'kind': 'number-to-desktop-object'}, also=['sgs/pricing-table'])
    pa2 = plan_for(inc, amb_shape)
    check('rename edge: a reshape only lists that include for review, and writes nothing',
          not pa2['refusals'] and not pa2['files'] and any(x[3] == 'shared-include' for x in pa2['shape']))
    owned = plan_for({'plugins/sgs-blocks/includes/account/helpers-x.php': "<?php\n$f = $attributes['loginButtonText'];\n"},
                     Rename({'block': 'sgs/account', 'old': 'loginButtonText', 'new': 'loginButtonColourText',
                             'also_declared_by': ['sgs/other']}))
    check('rename edge: an include whose path names the owning block is rewritten', owned['files'] and not owned['refusals'])

    # The real map: every entry's block must still declare the old name (before the migration)
    # or the new one (after it), and every named co-owner must declare it too.
    for rn in load_renames():
        bj = load_json(os.path.join(PLUGIN, 'src', 'blocks', rn.slug, 'block.json'), {}) or {}
        attrs = bj.get('attributes', {})
        check('map: %s declares %s or %s' % (rn.block, rn.old, rn.new), rn.old in attrs or rn.new in attrs)
        for other in rn.also:
            obj = load_json(os.path.join(PLUGIN, 'src', 'blocks', other, 'block.json'), {}) or {}
            check('map: co-owner %s declares %s' % (other, rn.old), rn.old in obj.get('attributes', {}))
    # comment handling
    pcmt = plan_for({'plugins/sgs-blocks/src/blocks/fx/c.php': "<?php\n/** addToCartBackgroundColour is the fill */\n"}, rn_bg)
    check('rename: a comment naming the old attribute follows the rename', 'addToCartColourBackground' in pcmt['files']['plugins/sgs-blocks/src/blocks/fx/c.php'][1])

    # The comment stripper itself.
    st = strip_php("<?php\n// <button>\n$a = 'http://x'; /* <button> */ echo '<button>';\n")
    check('stripper: PHP comments blanked, a // inside a string kept', st.count('<button') == 1 and "'http://x'" in st)
    sj = strip_js("const a = '//x'; // <button\n/* <button */ const b = `<button>`;\n")
    check('stripper: JS comments blanked, strings and templates kept', sj.count('<button') == 1 and "'//x'" in sj)
    return fails


# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='A styled part with no setting (detector).')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--write-baseline', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--pass', dest='pass_', default='all', choices=('all',) + PASSES)
    a = ap.parse_args()
    passes = PASSES if a.pass_ == 'all' else (a.pass_,)

    if a.self_test:
        fails = self_test()
        print('\n' + ('SELF-TEST FAILED (%d)' % len(fails) if fails else 'self-test: all assertions passed'))
        return 1 if fails else 0

    rc = 0
    for p in passes:
        if p == 'buttons':
            rc = max(rc, run_buttons(a))
    return rc


def run_buttons(a):
    cfg = load_cfg()
    corpus = Corpus.from_disk()

    if a.check:
        rc, _ = run_check(corpus, cfg, load_baseline(), wide_enumeration())
        return rc

    if a.write_baseline:
        sites = run_survey(corpus, cfg)
        live = keyed(sites)
        old = load_baseline()
        old_entries = old.get('entries', {})
        raised = [k for k, n in live.items() if n > old_entries.get(k, 0)] if old.get('ceiling') is not None else []
        if raised:
            print('REFUSED: the baseline only shrinks; these would rise or appear: %s' % ', '.join(raised[:5]))
            return 1
        write_atomic(BASELINE_PATH, json.dumps({
            '_comment': 'Ratcheted ceiling for check-styled-part-has-setting.py (buttons pass): every target and '
                        'unrecognised site, keyed file::symbol::stem with its count. It only shrinks. Lower it with '
                        '--write-baseline after a migration; never raise it to absorb a new button.',
            'pass': 'buttons',
            'ceiling': sum(live.values()),
            'entries': dict(sorted(live.items())),
        }, indent=2, ensure_ascii=False) + '\n')
        print('baseline written: ceiling %d over %d entries' % (sum(live.values()), len(live)))
        return 0

    if a.fix:
        renames = load_renames()
        plan = rename_plan(rename_corpus(), renames)
        d = diff_text(plan)
        sys.stdout.write(d)
        by = {}
        for old, r, sh in plan['records']:
            by[sh] = by.get(sh, 0) + 1
        print('\n# rename references by shape: %s' % ', '.join('%s=%d' % kv for kv in sorted(by.items())))
        print('# files that would change: %d; diff lines: %d' % (len(plan['files']), d.count('\n')))
        for old, r, ln, snip in plan['refusals']:
            print('# UNRECOGNISED  %s  %s:%s  %s' % (old, r, ln, snip))
        for old, r, ln, sh, snip in plan['shape']:
            print('# SHAPE-REVIEW  %s  %s:%d  [%s]  %s' % (old, r, ln, sh, snip))
        for old, r, why in plan['skipped']:
            print('# SKIPPED       %s  %s  %s' % (old, r, why))
        if plan['refusals']:
            print('# REFUSING to write while %d reference(s) are unrecognised' % len(plan['refusals']))
            return 1
        if a.apply:
            for r, (old, new) in plan['files'].items():
                write_atomic(os.path.join(REPO, r), new)
            print('# APPLIED: %d file(s) rewritten' % len(plan['files']))
        else:
            print('# dry run; add --apply to write')
        return 0

    # --survey (also the default with no flag)
    sites = run_survey(corpus, cfg)
    print_survey(sites, a.json, corpus, cfg)
    if not a.json:
        renames = load_renames()
        plan = rename_plan(rename_corpus(), renames)
        by = {}
        for old, r, sh in plan['records']:
            by[(old, sh)] = by.get((old, sh), 0) + 1
        print('\n== rename references in block, include and src trees ==')
        for (old, sh), n in sorted(by.items()):
            print('  %-34s %-14s %d' % (old, sh, n))
        print('  unrecognised: %d; shape-review: %d; skipped shared includes: %d'
              % (len(plan['refusals']), len(plan['shape']), len(plan['skipped'])))
        el = elsewhere_census(renames)
        print('\n== old names also named OUTSIDE the rename trees (not rewritten) ==')
        for r, names in sorted(el.items()):
            print('  %s  %s' % (r, ', '.join(names)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
