#!/usr/bin/env python3
"""Detector: a part an SGS block draws itself, whose look has no setting.

WHY THIS EXISTS
    The 2026-11-20 fixed-looks audit (.claude/reports/2026-11-18-template-rework/
    fixed-looks-audit.md) found blocks that draw a button whose look is fixed in
    code: the buy box flow opener wore the secondary preset with no setting, so a
    draft that drew it differently could only be matched with hand-written CSS.
    Plan Task 6 (.claude/plans/archive/2026-11-18-template-rework.md, "A setting for every
    reusable look") fixes that with a built-in button kit declared in block.json as
    `supports.sgs.builtinButtons`. This detector is what must exist BEFORE the
    button migrations (migration-method Step 4: the detector is the first
    deliverable), and it stays as the gate that stops a new hard-wired button
    arriving.

PASSES (the audit's three; the default runs every pass)
    buttons   every button element an SGS block, include or theme file prints, every
              literal preset slug chosen in PHP, every block or theme stylesheet that
              reads a starter preset's tokens for its own part.
    parts     a BEM part (.sgs-<block>__<part>) in a block's style.css, its own PHP files,
              or an includes/ PHP file the block renders through, whose look (colour,
              background, border, radius, padding, font, letter-spacing, text-transform,
              shadow) is written as a literal in code while no attribute in
              block_attributes carries that part as its css_element.
    unmapped  (a) an `sgs` attribute with a look-like role (color, visual, layout,
              typography, colour-gradient) the database gives no css_element or no
              css_property, so the cloning route cannot place it; (b) a visitor-visible
              __( '...', 'sgs-blocks' ) word printed in a block's render path that no
              attribute of the block shares a stem with (fixed words with no setting).
    `parts` and `unmapped` read the framework database (read-only); without it they print
    SKIPPED and pass, as every database-first gate here does on a clean clone.

CATEGORIES
    buttons       on-kit | target | exempt | unrecognised   (--check gates target + unrecognised)
    parts         has-setting | exempt | not-a-block | unrecognised   (gates unrecognised)
    unmapped      exempt | unrecognised                                (gates unrecognised)
    on-kit        the owning block declares the part in supports.sgs.builtinButtons
    target        listed in data/builtin-button-targets.json (design note section 7)
    exempt        data/styled-part-exemptions.json, each rule with a reason (parts and unmapped
                  also carry coded exemptions, each with its reason in the report)
    unrecognised  anything else: reported, and counted by --check against the ceiling

CLI
    --survey [--json]      census, no writes (--json is the durable artefact)
    --fix                  the RENAME pass for the built-in button migration: prints a
                           unified diff (data/builtin-button-renames.json is the map)
    --fix --apply          writes it (atomic); refuses while any reference is unrecognised
    --check                ratcheted ceiling per pass: exit 1 when the gated count rises above
                           that pass's section of data/styled-part-baseline.json, when a
                           baseline entry no longer exists, when it is slack, or when a gate
                           input (exemption, target, width) is stale; 0 otherwise
    --write-baseline       re-measure the baseline (per pass); refuses to raise it
    --self-test            the fixtures (Step 6), a planted hard-wired button, a planted part
                           with no setting and a planted fixed word
    --pass buttons|parts|unmapped   one pass; the default runs every pass

    python check-styled-part-has-setting.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse
import difflib
import fnmatch
import io
import json
import os
import re
import subprocess
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

PASSES = ('buttons', 'parts', 'unmapped')
GATED_CATS = {'buttons': ('target', 'unrecognised'), 'parts': ('unrecognised',), 'unmapped': ('unrecognised',)}
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


_IGNORED_DIRS = None


def git_ignored_dirs():
    """Folders git ignores under the repo (a local reference copy of another plugin, scratch output): never source,
    whatever they are called, so the corpus walks below match what a clean checkout holds."""
    global _IGNORED_DIRS
    if _IGNORED_DIRS is None:
        try:
            out = subprocess.run(['git', '-C', REPO, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory'],
                                 capture_output=True, text=True, check=True).stdout
            _IGNORED_DIRS = {line.rstrip('/') for line in out.splitlines() if line.endswith('/')}
        except (OSError, subprocess.CalledProcessError):
            _IGNORED_DIRS = set()
    return _IGNORED_DIRS


def source_dirs(dirpath, dirnames, never):
    """The subfolders of `dirpath` a corpus walk descends into: not named in `never`, not ignored by git."""
    ignored = git_ignored_dirs()
    return [d for d in dirnames if d not in never and rel(os.path.join(dirpath, d)) not in ignored]


_TEXT_CACHE = {}


def read_text(path):
    """A file's text, read once per run (the corpus and the two wide enumerations all read the same files)."""
    if path not in _TEXT_CACHE:
        with io.open(path, encoding='utf-8', newline='', errors='replace') as f:
            _TEXT_CACHE[path] = f.read()
    return _TEXT_CACHE[path]


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
    if '\n' not in s:
        return ' ' * len(s)
    return '\n'.join(' ' * len(x) for x in s.split('\n'))


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
                    if survey_scope(r) or css_scope(r) or parts_scope(r) or block_js_scope(r) or fn == 'block.json':
                        files[r] = read_text(p)
        return cls(files)

    def block_json(self, slug):
        txt = self.files.get('plugins/sgs-blocks/src/blocks/%s/block.json' % slug)
        if txt is None:
            return None
        cache = self.__dict__.setdefault('_bj', {})
        if txt not in cache:
            try:
                cache[txt] = json.loads(txt)
            except ValueError:
                cache[txt] = None
        return cache[txt]

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
            dirnames[:] = source_dirs(dirpath, dirnames, never_source)
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


TOUCH_GUARD_RE = re.compile(r':where\(\s*:root:not\(\s*\.sgs-touch-input\s*\)\s*\)\s*')


def source_selector(sel):
    """The selector list as its source wrote it. The touch-hover build (Spec 38A FR-38A-17, scripts/hover-guard/)
    adds a `.sgs-pressed` twin member and a `:where(:root:not(.sgs-touch-input))` guard to every :hover member; neither
    is a different part, so a site keys on the source selector and the baseline stays valid across the transform."""
    members, depth, cur = [], 0, ''
    for ch in sel:
        depth += ch in '([' and 1 or (ch in ')]' and -1 or 0)
        if ch == ',' and depth == 0:
            members.append(cur)
            cur = ''
        else:
            cur += ch
    members.append(cur)
    kept = [TOUCH_GUARD_RE.sub('', m).strip() for m in members if '.sgs-pressed' not in m]
    return ', '.join(m for m in kept if m) or sel


def css_sites(path, s):
    """Blocks of CSS that read `--wp--custom--button-presets--<starter>--` for their own part."""
    out = []
    rx = re.compile(r'--wp--custom--button-presets--(' + '|'.join(STARTERS) + r')--')
    # selector = the text before the nearest preceding `{` at depth 0 (rules inside @media are
    # attributed to their own selector).
    for m in rx.finditer(s):
        brace = s.rfind('{', 0, m.start())
        sel_start = max(s.rfind('}', 0, brace), s.rfind('{', 0, brace), s.rfind(';', 0, brace)) + 1
        sel = source_selector(re.sub(r'\s+', ' ', s[sel_start:brace]).strip())
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


def modifier_of(stem):
    """`buybox__add-to-cart--flow-opener` -> `flow-opener`: a button that wears a shared element's class plus its own modifier
    (the buy box's flow opener wears `buybox__add-to-cart`), named by that modifier. '' when the stem has none."""
    if '__' not in stem or '--' not in stem.split('__', 1)[1]:
        return ''
    return stem.split('__', 1)[1].split('--', 1)[1]


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
    parts = set()
    # `carouselDots` declares a slider's navigation dots (the carousel dots kit): its part is a declared part too.
    dots = ((bj.get('supports') or {}).get('sgs') or {}).get('carouselDots')
    if isinstance(dots, dict) and dots.get('part'):
        parts.add(dots['part'])
    for i in items:
        if isinstance(i, dict) and i.get('part'):
            parts.add(i['part'])
            # `elements`: further class elements the same part is printed as (a gallery's carousel-prev and carousel-next).
            parts.update(e for e in (i.get('elements') or []) if isinstance(e, str))
    return parts


def declared_prefixes(corpus, slug):
    """The kit prefixes a block declares in supports.sgs.builtinButtons (`flowOpener`)."""
    bj = corpus.block_json(slug) if slug else None
    if not bj:
        return set()
    items = (((bj.get('supports') or {}).get('sgs') or {}).get('builtinButtons')) or []
    return {i.get('prefix') for i in items if isinstance(i, dict) and i.get('prefix')}


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
    if parts and (element_of(site['stem']) in parts or modifier_of(site['stem']) in parts) and site['kind'] in ('button', 'a', 'createElement', 'class-string'):
        return 'on-kit', 'declared in supports.sgs.builtinButtons of sgs/%s' % slug, ''
    for rule in cfg['targets']:
        if rule_matches(rule, site):
            # The rule's block has declared the rule's button: the site is the kit's now, whatever its class names.
            if rule.get('prefix') in declared_prefixes(corpus, str(rule.get('block', '')).split('/')[-1]):
                return 'on-kit', 'declared in supports.sgs.builtinButtons of %s (prefix %s)' % (rule['block'], rule['prefix']), rule['id']
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


def load_baseline(p='buttons'):
    return baseline_section(p)


def ratchet(sites, baseline, p='buttons'):
    """Return failures: a key above its baseline count, a key not in it, a baseline key gone or lower."""
    cats = GATED_CATS[p]
    label = ' + '.join(cats)
    live = keyed(sites, cats)
    base = baseline.get('entries', {})
    fails = []
    total_live = sum(live.values())
    ceiling = baseline.get('ceiling')
    if ceiling is None:
        fails.append('no baseline for the %s pass: run --write-baseline --pass %s once, then commit data/styled-part-baseline.json' % (p, p))
        return fails, live
    if total_live > ceiling:
        fails.append('%s is %d, above the ceiling %d' % (label, total_live, ceiling))
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
    elif kind == 'flat-box-to-desktop-object':
        # One box (sides or corners) becomes a per-device box: the stored value moves under `desktop`.
        obj['type'] = 'object'
        d = obj.get('default')
        if isinstance(d, dict) and d and not any(k in d for k in ('desktop', 'tablet', 'mobile')):
            obj['default'] = {'desktop': d}
    elif kind == 'fit-to-unset':
        # The kit's width choice has no default: unset keeps the block's own width, and a saved `fit` is dropped by the sweep.
        obj.pop('default', None)
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


def load_renames(blocks=''):
    """The rename map's rows; `blocks` (a comma list of block slugs, `buybox,account`) keeps only those blocks' rows."""
    d = load_json(RENAMES_PATH, {'renames': []}) or {'renames': []}
    keep = {b.strip().split('/')[-1] for b in blocks.split(',') if b.strip()}
    return [Rename(x) for x in d.get('renames', []) if not keep or x['block'].split('/', 1)[1] in keep]


# ----------------------------------------------------------------------------
# The framework database (read-only), and the shared name rules of the parts and
# unmapped passes.
# ----------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from framework_db import framework_db_path  # noqa: E402  ($SGS_FRAMEWORK_DB when set, else the shared database)

FRAMEWORK_DB = str(framework_db_path())
ATTR_COLUMNS = ('block_slug', 'attr_name', 'attr_type', 'default_value', 'enum_values', 'role',
                'css_property', 'css_element', 'source')


class Attrs:
    """block_attributes rows (sgs and sgs-ext sources), indexed by block slug (`sgs/x` -> `x`)."""

    def __init__(self, rows):
        self.rows = rows
        self.by_block = {}
        for r in rows:
            self.by_block.setdefault(r['block_slug'].split('/', 1)[-1], []).append(r)

    @classmethod
    def from_db(cls):
        if not os.path.exists(FRAMEWORK_DB):
            return None
        import sqlite3
        con = sqlite3.connect('file:%s?mode=ro' % FRAMEWORK_DB.replace('\\', '/'), uri=True)
        try:
            cur = con.execute('SELECT %s FROM block_attributes WHERE block_slug LIKE \'sgs/%%\' '
                              'AND source IN (\'sgs\', \'sgs-ext\')' % ', '.join(ATTR_COLUMNS))
            return cls([dict(zip(ATTR_COLUMNS, row)) for row in cur.fetchall()])
        finally:
            con.close()

    def block(self, slug):
        return self.by_block.get(slug, [])


def kebab(s):
    return re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s).lower()


def norm_key(s):
    """kebab or camel, any case, no separators, a trailing plural `s` dropped (`add-to-cart` == `addToCart`)."""
    n = re.sub(r'[^a-z0-9]', '', kebab(s))
    return n[:-1] if len(n) > 3 and n.endswith('s') else n


def block_prefix_forms(slug):
    n = norm_key(slug)
    return {n, re.sub(r'[^a-z0-9]', '', slug.lower())}


def element_keys(attrs, slugs):
    """Normalised css_element values of the given blocks, plus each with the block's own prefix removed."""
    key = (id(attrs), tuple(slugs), 'k')
    if key in _ELEMENT_CACHE:
        return set(_ELEMENT_CACHE[key])
    keys = _ELEMENT_CACHE[key] = set()
    for slug in slugs:
        pre = re.sub(r'[^a-z0-9]', '', slug.lower())
        for r in attrs.block(slug):
            e = (r['css_element'] or '').strip()
            if not e or e in ('wrapper', 'inner'):
                continue
            k = norm_key(e)
            keys.add(k)
            for p in (pre, 'sgs' + pre):
                if k.startswith(p) and len(k) > len(p):
                    keys.add(k[len(p):])
    return keys


def resolve_bem_block(name, slugs):
    """`sgs-buybox-pick` / `wp-block-sgs-gallery` / `product-card` -> the block slug it names, or ''."""
    n = re.sub(r'^wp-block-', '', name)
    n = re.sub(r'^sgs-', '', n)
    if n in slugs:
        return n
    best = ''
    for s in slugs:
        if n.startswith(s + '-') and len(s) > len(best):
            best = s
    return best


def include_owner_slug(path, slugs):
    """The block an includes/ PHP file renders for: a directory named like a block, else the longest
    block slug that prefixes the file name once `class-`, `class-sgs-`, `helpers-` and `sgs-` are dropped."""
    parts = path.split('/')
    if len(parts) > 3 and parts[2] == 'includes' and parts[3] in slugs and len(parts) > 4:
        return parts[3]
    stem = re.sub(r'\.php$', '', parts[-1])
    stem = re.sub(r'^(?:class-)?(?:helpers-|sgs-)?', '', stem)
    stem = re.sub(r'^(?:helpers-|sgs-)', '', stem)
    best = ''
    for s in slugs:
        if (stem == s or stem.startswith(s + '-')) and len(s) > len(best):
            best = s
    return best


def file_block(path, slugs):
    """The block a file belongs to: its block directory, or the includes owner; '' for neither."""
    m = re.match(r'plugins/sgs-blocks/src/blocks/([^/]+)/', path)
    if m:
        return m.group(1)
    if path.startswith('plugins/sgs-blocks/includes/'):
        return include_owner_slug(path, slugs)
    return ''


def parts_css_scope(r):
    """A block stylesheet that reaches the front end, in the block's directory or a sub-directory of it, or a
    shared partial the blocks `@import` (editor.css, index.css and components/ are editor-only)."""
    m = re.match(r'plugins/sgs-blocks/src/blocks/[^/]+/(?:[^/]+/)*([^/]+\.css)$', r)
    if m and '/components/' not in r:
        return m.group(1) not in ('editor.css', 'index.css')
    return bool(re.match(r'plugins/sgs-blocks/src/shared/(?:[^/]+/)*[^/]+\.css$', r))


def parts_php_scope(r):
    if not r.endswith('.php') or r.endswith('.asset.php'):
        return False
    if re.search(r'(^|/)(tests?|fixtures?|build|vendor)/', r):
        return False
    return r.startswith(('plugins/sgs-blocks/src/blocks/', 'plugins/sgs-blocks/includes/'))


def block_js_scope(r):
    """A block directory's own JS (edit, save, view): the evidence for where a class is printed."""
    return bool(re.match(r'plugins/sgs-blocks/src/blocks/[^/]+/[^/]+\.js$', r))


def parts_scope(r):
    return parts_css_scope(r) or parts_php_scope(r)


def editor_side_js(r):
    return bool(re.search(r'(^|/)(edit[\w.-]*|index|canvas-[\w.-]*|[\w.-]*Panel[\w.-]*|inspector[\w.-]*|[A-Z][\w.-]*)\.js$', r))


TEMPLATE_CLASS = re.compile(r'className\s*:\s*[\'"`][^\'"`\n]*$')


def printer_index(corpus):
    """{(bem_block, part): (printed_in_a_front_end_file, printed_in_an_editor_only_file)} over the block JS and PHP."""
    tok = re.compile(r'(?<![\w-])([A-Za-z][\w-]*?)__([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)')
    idx = {}
    for path, text in corpus.files.items():
        if path.endswith('.css') or not (parts_php_scope(path) or block_js_scope(path)) or '__' not in text:
            continue
        editor_file = path.endswith('.js') and editor_side_js(path)
        for m in tok.finditer(text):
            # An InnerBlocks template entry (`className: 'sgs-x__part'`) is saved into the post: front end.
            editor = editor_file and not TEMPLATE_CLASS.search(text[max(0, m.start() - 120):m.start()])
            f, e = idx.get((m.group(1), m.group(2)), (False, False))
            idx[(m.group(1), m.group(2))] = (f or not editor, e or editor)
    return idx


# ----------------------------------------------------------------------------
# PASS parts: a BEM part whose look is a literal in code and has no setting
# ----------------------------------------------------------------------------
LOOK_PROP = re.compile(
    r'^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?'
    r'(?:-(?:color|width|style))?|border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius|border-radius'
    r'|padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?'
    r'|font|font-(?:family|size|weight|style)|letter-spacing|text-transform|box-shadow)$')
RESET_VALUE = re.compile(r'^(?:inherit|initial|unset|revert|none|normal|auto|transparent|currentcolor|0|0px|0 0|0 0 0 0|0 none)$', re.I)
SETTABLE_VAR = re.compile(r'^var\(\s*--(?!wp--)[\w-]+\s*(?:,.*)?\)$', re.I | re.S)
PHP_DYNAMIC = re.compile(r'\$|%(?:\d+\$)?[sdf]|<\?|\?>|[\'"]\s*\.|\.\s*[\'"]|\{\s*\$')
BEM_TOK = re.compile(r'\.((?:wp-block-)?[A-Za-z][\w-]*?)__([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)(?:--[\w-]+)?')
FOCUS_PSEUDO = re.compile(r':focus(?:-visible|-within)?\b')
DOTTED_BEM = re.compile(r'\.[A-Za-z][\w-]*__[A-Za-z0-9]')
STYLE_VARIATION = re.compile(r'\.is-style-')
EDITOR_MEMBER = re.compile(r'\.[\w-]*(?:__editor-|--editor)[\w-]*|editor-styles-wrapper|\.block-editor|\.is-selected\b|\.is-editor')
WOO_CLASS = re.compile(r'\.(?:woocommerce|wc-|wp-block-woocommerce|single_add_to_cart|add_to_cart)')
A11Y_PART = re.compile(r'^(?:screen-reader-text|sr-only|visually-hidden|sr)$')
COMMERCE_LOOK_FILE = re.compile(r'^plugins/sgs-blocks/includes/woocommerce/')


def _split_top(s, sep):
    out, depth, cur = [], 0, []
    for ch in s:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth = max(0, depth - 1)
        if ch == sep and depth == 0:
            out.append(''.join(cur))
            cur = []
        else:
            cur.append(ch)
    out.append(''.join(cur))
    return out


def _drop_not(sel):
    """Remove every `:not( ... )` group (balanced): what a rule excludes is not what it styles."""
    while True:
        i = sel.find(':not(')
        if i < 0:
            return sel
        depth, j = 0, i + 4
        while j < len(sel):
            if sel[j] == '(':
                depth += 1
            elif sel[j] == ')':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        sel = sel[:i] + sel[j + 1:]


def _last_compound(member):
    pieces, depth, cur = [], 0, []
    for ch in member:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth = max(0, depth - 1)
        if depth == 0 and ch in ' \t\r\n>+~':
            if cur:
                pieces.append(''.join(cur))
                cur = []
        else:
            cur.append(ch)
    if cur:
        pieces.append(''.join(cur))
    return pieces[-1] if pieces else ''


def selector_subjects(sel):
    """What a selector styles: [(bem_block, part, state)] and woo flag per comma member.

    The subject is the BEM part in the member's last compound (every part of an `:is()` list there);
    a member whose last compound carries no BEM part (`.sgs-x__list li`) styles that nearest part.
    A member ending in a WooCommerce class styles WooCommerce markup and has no subject. A focus
    state is the focus system's, not the part's look. A member under `.is-style-*` is a named block
    style variation (the author picks it in the style picker, which is its setting); a member under an
    editor-only class is not painted on the front end.
    """
    subjects, woo, focus, other = [], False, False, 0
    for member in _split_top(_drop_not(sel), ','):
        if FOCUS_PSEUDO.search(member):
            focus = True
            continue
        if STYLE_VARIATION.search(member) or EDITOR_MEMBER.search(member):
            other += 1
            continue
        last = _last_compound(member)
        toks = BEM_TOK.findall(last)
        if not toks:
            if WOO_CLASS.search(last):
                woo = True
                continue
            toks = BEM_TOK.findall(member)[-1:]
        for blk, part in toks:
            subjects.append((blk, part))
    return subjects, woo, focus, other


def _decls(body, is_php):
    """[(prop, value, kind)] for each look declaration; kind is fixed | reset | var | dynamic."""
    out = []
    for d in body.split(';'):
        m = re.match(r'\s*([a-z-]+)\s*:\s*(.*?)\s*(?:!important)?\s*$', d, re.S)
        if not m or not LOOK_PROP.match(m.group(1)):
            continue
        prop, val = m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip()
        if not val:
            continue
        if is_php and PHP_DYNAMIC.search(val):
            kind = 'dynamic'
        elif RESET_VALUE.match(val):
            kind = 'reset'
        elif SETTABLE_VAR.match(val):
            kind = 'var'
        else:
            kind = 'fixed'
        out.append((prop, val, kind))
    return out


def scan_parts(path, text):
    """Every BEM part styled in one file: {(symbol, bem_block, part): record}. Comments are blanked first."""
    if not DOTTED_BEM.search(text):
        return {}, {'focus': 0, 'woo': 0, 'variation-or-editor': 0}     # no `.block__part` selector: skip the slow strip
    s = strip_for(path, text)
    is_php = path.endswith('.php')
    if '{' not in s:
        return {}, {'focus': 0, 'woo': 0, 'variation-or-editor': 0}
    idx = None
    found, dropped = {}, {'focus': 0, 'woo': 0, 'variation-or-editor': 0}
    for m in re.finditer(r'\{([^{}]*)\}', s):
        body = m.group(1)
        if ':' not in body:
            continue
        a = max(s.rfind('}', 0, m.start()), s.rfind('{', 0, m.start()), s.rfind(';', 0, m.start()))
        sel = s[a + 1:m.start()]
        if '__' not in sel and not WOO_CLASS.search(sel):
            continue
        subjects, woo, focus, other = selector_subjects(sel)
        if other and not subjects:
            dropped['variation-or-editor'] += 1
        if focus and not subjects:
            dropped['focus'] += 1
        if woo and not subjects:
            dropped['woo'] += 1
        if not subjects:
            continue
        decls = _decls(body, is_php)
        if is_php and idx is None:
            idx = symbol_index(s, path)
        sym = symbol_at(idx, m.start()) if is_php else '(file)'
        for blk, part in subjects:
            rec = found.setdefault((sym, blk, part), {'line': line_of(s, m.start()), 'fixed': {}, 'other': set(),
                                                      'selectors': []})
            if len(rec['selectors']) < 3:
                rec['selectors'].append(re.sub(r'\s+', ' ', sel).strip()[-90:])
            for prop, val, kind in decls:
                if kind == 'fixed':
                    rec['fixed'].setdefault(prop, val)
                else:
                    rec['other'].add(kind)
    return found, dropped


# Words too common to name a part on their own: a setting for `card-title` is not a setting for
# `group-title`, so a shared generic word never makes two parts the same part.
GENERIC_WORDS = {'title', 'label', 'text', 'item', 'items', 'icon', 'content', 'button', 'btn', 'link', 'name', 'body',
                 'card', 'row', 'count', 'value', 'badge', 'close', 'wrapper', 'inner', 'list', 'box', 'media', 'image',
                 'img', 'heading', 'desc', 'description', 'meta', 'wrap', 'container', 'glyph', 'dot', 'panel', 'input'}


def word_set(s):
    return {word_stem(w) for w in re.split(r'[^a-z0-9]+', kebab(s)) if w}


def related_element(part_words, element_words):
    """The part and the element share their distinctive words: one holds every word of the other, and the
    shared words are not all generic (`org` ~ `org-name`, `back` ~ `nav-back`; `title` !~ `card-title`)."""
    small, big = (part_words, element_words) if len(part_words) <= len(element_words) else (element_words, part_words)
    return bool(small) and small <= big and not small <= {word_stem(g) for g in GENERIC_WORDS}


_ELEMENT_CACHE = {}


def element_words(attrs, slugs):
    key = (id(attrs), tuple(slugs), 'w')
    if key in _ELEMENT_CACHE:
        return _ELEMENT_CACHE[key]
    out = _ELEMENT_CACHE[key] = set()
    for slug in slugs:
        for r in attrs.block(slug):
            e = (r['css_element'] or '').strip()
            if e and e not in ('wrapper', 'inner'):
                out.add(frozenset(word_set(e)))
    return out


def part_keys(owner, bem_block, part):
    """Normalised names a css_element may use for this part."""
    keys = {norm_key(part)}
    owner_n = re.sub(r'[^a-z0-9]', '', owner.lower())
    bem_n = re.sub(r'[^a-z0-9]', '', re.sub(r'^(?:wp-block-)?(?:sgs-)?', '', bem_block).lower())
    if owner_n and bem_n != owner_n and bem_n.startswith(owner_n):
        keys.add(norm_key(bem_n[len(owner_n):] + part))
    return keys


def declared_button_parts(corpus, slug):
    return {norm_key(p) for p in declared_parts(corpus, slug)} if slug else set()


def cfg_parts(cfg):
    return cfg.get('parts_exemptions', [])


def part_rule_matches(rule, site):
    if 'files' in rule and not any(fnmatch.fnmatchcase(site['file'], g) for g in rule['files']):
        return False
    if 'block' in rule and rule['block'] != site['block']:
        return False
    if 'part' in rule and not re.search(rule['part'], site['stem']):
        return False
    return True


def run_parts(corpus, cfg, attrs):
    """One site per (file, function, part) that carries a fixed look declaration."""
    slugs = set(corpus.block_slugs())
    printers = printer_index(corpus)
    sites, no_look, dropped = [], set(), {'focus': 0, 'woo': 0, 'variation-or-editor': 0}
    for path in sorted(corpus.files):
        if not parts_scope(path):
            continue
        found, drop = scan_parts(path, corpus.files[path])
        for k in dropped:
            dropped[k] += drop[k]
        own = file_block(path, slugs)
        for (sym, blk, part), rec in sorted(found.items()):
            if not rec['fixed']:
                no_look.add((path, blk, part))
                continue
            bem_owner = resolve_bem_block(blk, slugs)
            owners = [b for b in dict.fromkeys([bem_owner, own]) if b]
            site = {'file': path, 'line': rec['line'], 'symbol': sym, 'kind': 'part', 'stem': part,
                    'block': owners[0] if owners else '', 'bem_block': blk,
                    'declarations': dict(sorted(rec['fixed'].items())),
                    'snippet': '; '.join('%s: %s' % kv for kv in sorted(rec['fixed'].items()))[:140],
                    'selectors': rec['selectors'], 'rule': '', 'key': '%s::%s::%s' % (path, sym, part)}
            if not owners:
                site['category'], site['reason'] = 'not-a-block', 'the class names no SGS block and the file belongs to none'
                sites.append(site)
                continue
            if COMMERCE_LOOK_FILE.match(path):
                site['category'], site['reason'], site['rule'] = 'exempt', 'WooCommerce markup the commerce look covers', 'auto:commerce-look'
            elif A11Y_PART.match(part):
                site['category'], site['reason'], site['rule'] = 'exempt', 'accessibility: a visually-hidden utility, not a look', 'auto:a11y-utility'
            else:
                keys = part_keys(bem_owner or own, blk, part)
                have = element_keys(attrs, owners)
                for o in owners:
                    have |= declared_button_parts(corpus, o)
                pw = word_set(part)
                related = any(related_element(pw, set(ew)) for ew in element_words(attrs, owners))
                front, editor = (False, False)
                if not (keys & have or related):
                    front, editor = printers.get((blk, part), (False, False))
                if keys & have or related:
                    site['category'], site['reason'] = 'has-setting', 'an attribute of sgs/%s has css_element %s' % (owners[0], part)
                elif editor and not front:
                    site['category'], site['reason'], site['rule'] = 'exempt', 'editor canvas only: the class is printed by the block\'s edit code and by no front-end file', 'auto:editor-canvas-only'
                else:
                    for rule in cfg_parts(cfg):
                        if part_rule_matches(rule, site):
                            site['category'], site['reason'], site['rule'] = 'exempt', rule.get('reason', ''), rule['id']
                            break
                    else:
                        site['category'], site['reason'] = 'unrecognised', 'no attribute of sgs/%s has this part as its css_element' % owners[0]
            sites.append(site)
    return sites, {'no-fixed-look': len(no_look), 'focus-rules-skipped': dropped['focus'],
                   'woo-subject-rules-skipped': dropped['woo'],
                   'variation-or-editor-rules-skipped': dropped['variation-or-editor']}


def wide_parts(corpus_files_scope=None):
    """A SECOND, dumb enumeration: every file under the plugin whose raw text holds a BEM-selector rule
    with a look declaration. Shares no code with parts_scope() or the rule reader."""
    pat = re.compile(r'\.[A-Za-z][\w-]*__[\w-]+[^{}]*\{[^{}]*\b(?:color|background|border|padding|font|letter-spacing|'
                     r'text-transform|box-shadow)[\w-]*\s*:', re.S)
    found = set()
    never = PRUNE | {'scripts', 'tests', 'test', 'docs', 'specs', 'languages', 'patterns-data', 'assets'}
    root = os.path.join(REPO, 'plugins', 'sgs-blocks')
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = source_dirs(dirpath, dirnames, never)
        for fn in filenames:
            if not fn.endswith(('.css', '.php')) or fn.endswith('.min.css'):
                continue
            p = os.path.join(dirpath, fn)
            try:
                if pat.search(read_text(p)):
                    found.add(rel(p))
            except OSError:
                continue
    return found


# ----------------------------------------------------------------------------
# PASS unmapped: attributes the route cannot place, and fixed words
# ----------------------------------------------------------------------------
LOOK_ROLES = ('color', 'visual', 'layout', 'typography', 'colour-gradient')
STOP = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'your', 'you', 'is', 'are', 'this', 'that', 'with',
        'from', 'by', 'it', 'as', 'at', 'be', 'no', 'not', 'my', 'our', 'all', 'any', 'out', 'up'}
I18N_CALL = re.compile(r'(?<![\w$>:])(esc_html__|esc_html_e|__|_e)\s*\(\s*(\'(?:\\.|[^\'\\])*\'|"(?:\\.|[^"\\])*")\s*,\s*[\'"]sgs-blocks[\'"]')
NOT_VISIBLE = re.compile(r'WP_Error|wc_add_notice|wp_send_json|error|Error|notice|wp_die|add_settings_error|noscript|fallback|honeypot|-hp\b|\bhp"', re.I)
HIDDEN_FROM_VISITORS = re.compile(r'screen-reader-text|sr-only|visually-hidden|aria-live|role=\\?"(?:alert|status)', re.I)
HTML_TAG = r'<(?:a|abbr|b|button|caption|cite|dd|div|dt|em|figcaption|h[1-6]|i|label|legend|li|mark|option|p|small|span|strong|sub|summary|sup|td|th|time)\b[^<>]*>'
TEXT_TAIL = re.compile('(?:' + HTML_TAG + '|</[A-Za-z0-9]+>)' + r'\s*[\'"`]?\s*\.?\s*(?:esc_html\(\s*|wp_kses_post\(\s*)?$', re.I)
ATTR_READ = re.compile(r'\$(?:attributes|attrs|atts|attr|args|opts|options|settings|config|cfg|a|d)\s*\[|->get_attr\(|get_option\(')


TEXT_ROLES = ('text-content', 'content', 'a11y-text', 'link-content', 'glyph')
TEXT_NAME = re.compile(r'(?:Label|Text|Title|Heading|Message|Prefix|Suffix|Caption|Note|Hint|Copy|Wording|Placeholder|Name)$')
ADMIN_SCREEN = re.compile(r'add_menu_page|add_submenu_page|add_options_page|add_settings_section|register_setting\(|settings_fields\(|admin_menu')


def is_text_attr(r):
    """An attribute that holds words a visitor reads: a text role, or a string attribute named like one."""
    if r['role'] in LOOK_ROLES or (r['attr_type'] or '') != 'string':
        return False
    return r['role'] in TEXT_ROLES or bool(TEXT_NAME.search(r['attr_name']))


def attr_tokens(name):
    return {t for t in re.findall(r'[A-Za-z][a-z0-9]*|[0-9]+', re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', name)) if t}


def word_stem(w):
    w = w.lower()
    return w[:-1] if len(w) > 3 and w.endswith('s') else w


def string_tokens(text):
    return {word_stem(w) for w in re.findall(r"[A-Za-z]+", text) if w.lower() not in STOP and len(w) > 1}


def visible_markup(s, pos, end):
    """Is the i18n call at s[pos:end] printed inside the text of an HTML element a visitor sees?"""
    a = max(s.rfind(';', 0, pos), s.rfind('{', 0, pos), s.rfind('}', 0, pos))
    po = max(s.rfind('<?php', 0, pos), s.rfind('<?=', 0, pos))
    b = len(s)
    for t in (';', '?>'):
        j = s.find(t, end)
        if j >= 0:
            b = min(b, j)
    if po > a:
        head = s[po:pos]
        if not re.fullmatch(r'<\?(?:php|=)\s*(?:(?:echo|print)\s+)?(?:\\?esc_html\(\s*)?\\?', head):
            a = po + (5 if s.startswith('<?php', po) else 2)        # the call is part of PHP code in this block
    if po > a:
        # the call opens the block (`<?php echo esc_html__( ... )`): its text sits after the markup before the block
        stmt = s[po:b]
        tag = re.search(HTML_TAG + r'\s*$', re.sub(r'<\?(?:php|=).*?\?>', 'X', s[max(0, po - 600):po], flags=re.S), re.I)
        ok = bool(tag) and not HIDDEN_FROM_VISITORS.search(tag.group(0))
        return ok, s[max(0, po - 160):b]
    before, stmt = s[a + 1:pos], s[a + 1:b]
    if re.search(r'=\s*\\?[\'"]?\s*\.?\s*$|=>\s*$|^\s*\$[\w\[\]\'"]+\s*=\s*$', before):
        return False, stmt
    if re.search(r'=\s*\\?"\s*$|=\s*\\?\'\s*$', before):
        return False, stmt
    # the call sits directly after an element's opening tag: its text, not an attribute or a sprintf argument
    tail = TEXT_TAIL.search(before)
    if not tail or HIDDEN_FROM_VISITORS.search(tail.group(0)):
        return False, stmt
    return True, stmt


def scan_strings(path, text):
    """[(line, symbol, string, statement)] for each visitor-visible sgs-blocks string in one PHP file."""
    if 'sgs-blocks' not in text:
        return []
    s = strip_php(text)
    idx = symbol_index(s, path)
    out = []
    for m in I18N_CALL.finditer(s):
        raw = m.group(2)[1:-1]
        word = re.sub(r'\\(.)', r'\1', raw).strip()
        if len(re.findall(r'[A-Za-z]', word)) < 2 or re.search(r'\beditor\b', word, re.I):
            continue
        ok, stmt = visible_markup(s, m.start(), m.end())
        if not ok:
            ok, stmt = assigned_then_printed(s, m)
        if not ok or NOT_VISIBLE.search(stmt) or ATTR_READ.search(stmt):
            continue
        out.append((line_of(s, m.start()), symbol_at(idx, m.start()), word, stmt))
    return out


ASSIGN_HEAD = re.compile(r'\s*\$(\w+)\s*=(?!=)\s*(?:[^;()]*?(?:\?\?|\?:|\?)\s*)?(?:sprintf\(\s*)?$', re.S)


def assigned_then_printed(s, m):
    """`$label = $cond ? __( 'Sale', ... ) : ...;` followed, in the same function, by the variable printed
    as the text of an element: (True, the printing statement). Anything less direct is not proven visible."""
    a = max(s.rfind(';', 0, m.start()), s.rfind('{', 0, m.start()), s.rfind('}', 0, m.start()))
    head = ASSIGN_HEAD.match(s[a + 1:m.start()])
    if not head:
        return False, ''
    end = s.find(';', m.end())
    if end < 0 or re.search(HTML_TAG, s[a + 1:end]):
        return False, ''            # the variable holds markup, not words: where it ends up says nothing about this word
    nxt = re.search(r'\bfunction\b', s[end:])
    limit = end + nxt.start() if nxt else len(s)
    for use in re.finditer(r'\$' + re.escape(head.group(1)) + r'(?![\w])(?!\s*\.?=(?!=))', s[end:limit]):
        q = end + use.start()
        ok, stmt = visible_markup(s, q, q + len(use.group(0)))
        if ok:
            return True, stmt
    return False, ''


def unit_base_mapped(row, rows_by_name):
    base = rows_by_name.get(row['attr_name'][:-4]) if row['attr_name'].endswith('Unit') else None
    return bool(base and base['css_property'] and base['css_element'])


def attr_line(text, name):
    m = re.search(r'"%s"\s*:\s*\{' % re.escape(name), text or '')
    return line_of(text, m.start()) if m else 0


def run_unmapped(corpus, cfg, attrs):
    slugs = set(corpus.block_slugs())
    sites = []
    exm = cfg.get('unmapped_exemptions', [])

    def rule_for(site):
        for rule in exm:
            if rule.get('kind') and rule['kind'] != site['kind']:
                continue
            if 'block' in rule and rule['block'] != site['block']:
                continue
            if 'attr' in rule and not re.search(rule['attr'], site['stem']):
                continue
            if 'string' in rule and not re.search(rule['string'], site['stem']):
                continue
            if 'files' in rule and not any(fnmatch.fnmatchcase(site['file'], g) for g in rule['files']):
                continue
            return rule
        return None

    # (a) attributes the route cannot place
    for slug in sorted(slugs):
        bj = corpus.block_json(slug)
        if not bj:
            continue
        in_json = set((bj.get('attributes') or {}).keys())
        rows = attrs.block(slug)
        by_name = {r['attr_name']: r for r in rows}
        path = 'plugins/sgs-blocks/src/blocks/%s/block.json' % slug
        for r in rows:
            if r['source'] != 'sgs' or r['role'] not in LOOK_ROLES or r['attr_name'] not in in_json:
                continue
            miss_el, miss_pr = not (r['css_element'] or '').strip(), not (r['css_property'] or '').strip()
            if not (miss_el or miss_pr):
                continue
            kind = 'attr-neither' if miss_el and miss_pr else ('attr-no-element' if miss_el else 'attr-no-property')
            site = {'file': path, 'line': attr_line(corpus.files.get(path), r['attr_name']), 'symbol': r['attr_name'],
                    'kind': kind, 'stem': r['attr_name'], 'block': slug, 'role': r['role'], 'rule': '',
                    'snippet': '%s %s; css_element=%s css_property=%s' % (r['role'], r['attr_type'] or '', r['css_element'] or '-', r['css_property'] or '-'),
                    'key': 'sgs/%s::%s' % (slug, r['attr_name'])}
            if unit_base_mapped(r, by_name):
                site['category'], site['reason'], site['rule'] = 'exempt', 'unit companion: the unit rides with `%s`, which the route places' % r['attr_name'][:-4], 'auto:unit-companion'
            elif r['role'] == 'layout' and r['enum_values'] and not r['css_property'] and re.search(r'^layout$|Layout$', r['attr_name']):
                site['category'], site['reason'], site['rule'] = 'exempt', 'arrangement selector: it picks a named variant from a list and emits a class, there is no CSS value to place', 'auto:layout-variant-enum'
            elif r['role'] == 'layout' and r['enum_values'] and not r['css_property'] and re.search(r'Order$', r['attr_name']):
                site['category'], site['reason'], site['rule'] = 'exempt', 'sort-order selector: it chooses which items come first, it is data selection and not a look', 'auto:sort-order-enum'
            else:
                rule = rule_for(site)
                if rule:
                    site['category'], site['reason'], site['rule'] = 'exempt', rule.get('reason', ''), rule['id']
                else:
                    site['category'], site['reason'] = 'unrecognised', 'the database maps no %s, so the route cannot place it' % ('css_element or css_property' if miss_el and miss_pr else ('css_element' if miss_el else 'css_property'))
            sites.append(site)

    # (b) fixed words
    by_owner, admin_skipped = {}, 0
    for path in sorted(corpus.files):
        if not parts_php_scope(path):
            continue
        owner = file_block(path, slugs)
        if not owner:
            continue
        if ADMIN_SCREEN.search(corpus.files[path]):
            admin_skipped += len(scan_strings(path, corpus.files[path]))
            continue
        for line, sym, word, stmt in scan_strings(path, corpus.files[path]):
            by_owner.setdefault(owner, []).append((path, line, sym, word))
    for owner, items in sorted(by_owner.items()):
        rows = attrs.block(owner)
        toks = set()
        defaults = set()
        for r in rows:
            if not is_text_attr(r):
                continue
            toks |= {word_stem(t) for t in attr_tokens(r['attr_name'])}
            dv = (r['default_value'] or '').strip().strip('"').lower()
            if dv:
                defaults.add(dv)
        seen = set()
        for path, line, sym, word in items:
            if (path, sym, word) in seen:
                continue
            seen.add((path, sym, word))
            if not string_tokens(word):
                continue            # placeholders and joining words only (`%1$d of %2$d`)
            if word.lower() in defaults or (string_tokens(word) & toks):
                continue
            site = {'file': path, 'line': line, 'symbol': sym, 'kind': 'string', 'stem': word, 'block': owner, 'rule': '',
                    'snippet': word, 'key': '%s::%s::%s' % (path, sym, word)}
            rule = rule_for(site)
            if rule:
                site['category'], site['reason'], site['rule'] = 'exempt', rule.get('reason', ''), rule['id']
            else:
                site['category'], site['reason'] = 'unrecognised', 'a visitor-visible word in sgs/%s that no text attribute of the block shares a stem with' % owner
            sites.append(site)
    return sites, {'admin-screen-strings-skipped': admin_skipped}


# ----------------------------------------------------------------------------
# Generic per-pass plumbing: tallies, cross-checks, ratchet, baseline sections
# ----------------------------------------------------------------------------
def tally_for(p, sites):
    cats = set(CATEGORIES) | {'has-setting', 'not-a-block'}
    t = {}
    for s in sites:
        t[s['category']] = t.get(s['category'], 0) + 1
    return {c: t.get(c, 0) for c in sorted(cats) if c in t or c in CAT_ORDER[p]}


CAT_ORDER = {'buttons': CATEGORIES, 'parts': ('has-setting', 'exempt', 'not-a-block', 'unrecognised'),
             'unmapped': ('exempt', 'unrecognised')}


def crosscheck_generic(p, cfg, sites, key, extra_rules=()):
    """Exemption rules each carry a reason and each still match a site."""
    fails = []
    used = {s['rule'] for s in sites if s['rule']}
    for rule in cfg.get(key, []):
        if not str(rule.get('reason', '')).strip():
            fails.append('%s exemption %s carries no reason' % (p, rule.get('id')))
        if rule['id'] not in used:
            fails.append('STALE %s rule %s matches no site; a stale allowlist entry is indistinguishable '
                         'from no entry, remove it' % (p, rule['id']))
    return fails


def crosscheck_parts(corpus, cfg, sites, wide):
    fails = crosscheck_generic('parts', cfg, sites, 'parts_exemptions')
    surveyed = {p for p in corpus.files if parts_scope(p)}
    if wide is not None:
        globs = cfg.get('parts_width_ok', {})
        for g, why in sorted(globs.items()):
            if not str(why).strip():
                fails.append('parts_width_ok entry %s carries no reason' % g)
        gap = sorted(f for f in wide - surveyed if not any(fnmatch.fnmatchcase(f, g) for g in globs))
        if gap:
            fails.append('CORPUS TOO NARROW: %d file(s) hold a BEM-part rule with a look declaration and are not '
                         'surveyed, nor named in parts_width_ok: %s' % (len(gap), ', '.join(gap[:6])))
        for g in sorted(globs):
            if not any(fnmatch.fnmatchcase(f, g) for f in wide):
                fails.append('STALE parts_width_ok entry %s: it matches no file that still holds such a rule' % g)
        # The reverse reconciliation: a file the narrow reader found a fixed look in must be in the wide list.
        for f in sorted({s['file'] for s in sites}):
            if f not in wide:
                fails.append('the rule reader found a fixed look in %s that the wide enumeration did not: one of them is wrong' % f)
    return fails


def crosscheck_unmapped(corpus, cfg, sites, attrs):
    fails = crosscheck_generic('unmapped', cfg, sites, 'unmapped_exemptions')
    # A database behind or ahead of the tree is a warning, never a failure: between an attribute landing and the next
    # reseed every session's build would otherwise fail here. check-wiring-fingerprint owns that drift as a gate.
    slugs = set(corpus.block_slugs())
    db_slugs = {k for k in attrs.by_block}
    for s in sorted(db_slugs - slugs):
        print('WARNING DB STALE: block sgs/%s has attribute rows but no block.json in the corpus; run /sgs-update' % s,
              file=sys.stderr)
    for slug in sorted(slugs):
        bj = corpus.block_json(slug) or {}
        missing = sorted(k for k in set((bj.get('attributes') or {}).keys()) - {r['attr_name'] for r in attrs.block(slug)} if not k.startswith('_'))
        if missing:
            print('WARNING DB BEHIND: sgs/%s block.json declares %d attribute(s) the database does not hold (%s); run /sgs-update'
                  % (slug, len(missing), ', '.join(missing[:3])), file=sys.stderr)
    return fails


def load_cfg_all():
    cfg = load_cfg()
    ex = load_json(EXEMPTIONS_PATH, {}) or {}
    for k in ('parts_exemptions', 'parts_width_ok', 'unmapped_exemptions'):
        cfg[k] = ex.get(k, [] if k != 'parts_width_ok' else {})
    return cfg


def baseline_section(p):
    d = load_json(BASELINE_PATH, {}) or {}
    return (d.get('passes') or {}).get(p) or {'ceiling': None, 'entries': {}}


def write_baseline_section(p, live, comment):
    d = load_json(BASELINE_PATH, {}) or {}
    passes = d.get('passes') or {}
    passes[p] = {'_comment': comment, 'ceiling': sum(live.values()), 'entries': dict(sorted(live.items()))}
    out = {'_comment': 'Ratcheted ceilings for check-styled-part-has-setting.py, one section per pass: every gated site keyed '
                       'file::symbol::stem (attribute keys are sgs/<block>::<attribute>) with its count. A section only shrinks. '
                       'Lower it with --write-baseline --pass <name> after a migration; never raise it to absorb a new finding.',
           'passes': {k: passes[k] for k in PASSES if k in passes}}
    write_atomic(BASELINE_PATH, json.dumps(out, indent=2, ensure_ascii=False) + '\n')


BASELINE_COMMENTS = {
    'buttons': 'Every target and unrecognised button site, keyed file::symbol::stem.',
    'parts': 'Every BEM part with a literal look and no setting, keyed file::symbol::part.',
    'unmapped': 'Every look-role attribute the database cannot place (sgs/<block>::<attribute>) and every visitor-visible word no attribute shares a stem with (file::symbol::word).',
}


# ----------------------------------------------------------------------------
# Reports
# ----------------------------------------------------------------------------
SITE_FIELDS = ('category', 'file', 'line', 'symbol', 'kind', 'stem', 'rule', 'reason', 'snippet')


def survey_dict(p, sites, extra=None):
    """One pass's durable census record: totals, by kind, every site."""
    t = tally(sites) if p == 'buttons' else tally_for(p, sites)
    out = {'pass': p, 'totals': dict(t, total=len(sites)),
           'by_kind': {k: sum(1 for s in sites if s['kind'] == k) for k in sorted({s['kind'] for s in sites})}}
    if extra:
        out.update(extra)
    rows = []
    for s in sorted(sites, key=lambda s: (s['category'], s['file'], s['line'], s['stem'])):
        row = {k: s[k] for k in SITE_FIELDS}
        for k in ('block', 'declarations', 'role'):
            if k in s:
                row[k] = s[k]
        rows.append(row)
    out['sites'] = rows
    return out


def print_survey(sites, corpus, cfg):
    t = tally(sites)
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


def print_survey_generic(p, sites, extra):
    t = tally_for(p, sites)
    print('\n== %s pass ==' % p)
    kinds = {}
    for s in sites:
        kinds.setdefault((s['kind'], s['category']), 0)
        kinds[(s['kind'], s['category'])] += 1
    for (k, c), n in sorted(kinds.items()):
        print('  %-18s %-13s %d' % (k, c, n))
    print('\n  -- unrecognised --')
    for s in sorted((x for x in sites if x['category'] == 'unrecognised'), key=lambda s: (s['file'], s['line'], s['stem'])):
        print('  %-16s %s::%s  [%s]  %s' % (s['kind'], s['file'], s['symbol'], s['stem'], s['snippet'][:80]))
    print('\n  -- exempt (by rule) --')
    by = {}
    for s in sites:
        if s['category'] == 'exempt':
            by[s['rule']] = by.get(s['rule'], 0) + 1
    for rid, n in sorted(by.items()):
        print('  %5d  %s' % (n, rid))
    for k, v in (extra or {}).items():
        print('  %s: %s' % (k, v))
    print('\nsites: %d' % len(sites))
    for c, n in t.items():
        print('%-14s %d' % (c + ':', n))
    print('%-14s %d  (unrecognised, what --check gates)' % ('GATED:', t.get('unrecognised', 0)))


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
\t\t"loginButtonFullWidth": { "type": "boolean", "default": false },
\t\t"ctaPadding": { "type": "object", "default": {} },
\t\t"ctaBorderRadius": { "type": "object", "default": { "topLeft": "10px", "topRight": "10px" } }
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

    # 0 the touch-hover build's twin and guard do not change a CSS site's key (FR-38A-17).
    check('MUST FAIL without source_selector: a pressed twin and the touch guard key as the source selector',
          source_selector('.x, .x.sgs-pressed, :where(:root:not(.sgs-touch-input)) .x:hover') == '.x, .x:hover'
          and source_selector('.y:is(.a, .b):hover') == '.y:is(.a, .b):hover')
    for m in css_sites('t.css', '.x.sgs-pressed, :where(:root:not(.sgs-touch-input)) .x:hover{color:var(--wp--custom--button-presets--primary--text)}'):
        check('MUST FAIL without source_selector: a transformed rule reads as its source rule', m['stem'] == '.x:hover')

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
    mod_files = dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(kit_bj),
                                    'plugins/sgs-blocks/includes/fx-opener.php': "<?php\nreturn ' fx__add-to-cart--flow-opener';\n"})
    msites = [x for x in run_survey(Corpus(mod_files), cfg) if x['file'].endswith('fx-opener.php')]
    check('definition: a class whose modifier names a declared part is on-kit', msites and msites[0]['category'] == 'on-kit')
    mod_plain = dict(mod_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': FX_BLOCKJSON})
    msites2 = [x for x in run_survey(Corpus(mod_plain), cfg) if x['file'].endswith('fx-opener.php')]
    check('definition: the same class with no declaration is not on-kit (negative control)', msites2 and msites2[0]['category'] != 'on-kit')

    # definition: a target rule's block declaring the rule's prefix makes the site on-kit although the class names a different element.
    kit_bj2 = json.loads(FX_BLOCKJSON)
    kit_bj2['supports'] = {'sgs': {'builtinButtons': [{'prefix': 'flowOpener', 'part': 'other-part', 'label': 'x'}]}}
    kit2 = Corpus(dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(kit_bj2)}))
    k2sites = [s for s in run_survey(kit2, cfg) if s['kind'] == 'button']
    check('definition: a target rule whose block declares its prefix is on-kit', k2sites and k2sites[0]['category'] == 'on-kit')

    # definition: `elements` makes a part on-kit under another class element; without it the same site stays a target.
    el_bj = json.loads(FX_BLOCKJSON)
    el_bj['supports'] = {'sgs': {'builtinButtons': [{'prefix': 'arrow', 'part': 'arrow', 'label': 'x', 'elements': ['flow-opener']}]}}
    el = Corpus(dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(el_bj)}))
    esites = [s for s in run_survey(el, cfg) if s['kind'] == 'button']
    check('definition: the `elements` list of a part makes that class element on-kit', esites and esites[0]['category'] == 'on-kit')
    dt_bj = json.loads(FX_BLOCKJSON)
    dt_bj['supports'] = {'sgs': {'carouselDots': {'prefix': 'dot', 'part': 'flow-opener', 'label': 'x'}}}
    dt = Corpus(dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(dt_bj)}))
    dsites = [s for s in run_survey(dt, cfg) if s['kind'] == 'button']
    check('definition: a declared carouselDots part is on-kit', dsites and dsites[0]['category'] == 'on-kit')
    nel_bj = json.loads(FX_BLOCKJSON)
    nel_bj['supports'] = {'sgs': {'builtinButtons': [{'prefix': 'arrow', 'part': 'arrow', 'label': 'x'}]}}
    nel = Corpus(dict(base_files, **{'plugins/sgs-blocks/src/blocks/fx/block.json': json.dumps(nel_bj)}))
    nsites = [s for s in run_survey(nel, cfg) if s['kind'] == 'button']
    check('negative control: another part with no `elements` leaves the site a target', nsites and nsites[0]['category'] == 'target')

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
    pf = plan_for(files, fx_rename('ctaBorderRadius', 'ctaBorderRadius', {'kind': 'flat-box-to-desktop-object'}),
                  fx_rename('ctaPadding', 'ctaPadding', {'kind': 'flat-box-to-desktop-object'}))
    pf_attrs = json.loads(pf['files']['plugins/sgs-blocks/src/blocks/fx/block.json'][1])['attributes']
    check('rename shape: a flat box default moves under desktop, an empty one stays empty',
          pf_attrs['ctaBorderRadius']['default'] == {'desktop': {'topLeft': '10px', 'topRight': '10px'}}
          and pf_attrs['ctaPadding']['default'] == {} and pf_attrs['ctaPadding']['type'] == 'object')
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

    # ---- PASS parts ---------------------------------------------------------------------------
    def row(slug, name, role, prop, el, typ='string', enum=None, default=None):
        return {'block_slug': 'sgs/' + slug, 'attr_name': name, 'attr_type': typ, 'default_value': default,
                'enum_values': enum, 'role': role, 'css_property': prop, 'css_element': el, 'source': 'sgs'}

    FXP_CSS = """
/* .sgs-fx__commented { color: red; } */
.sgs-fx__title { color: #123456; font-size: 18px; }
.sgs-fx__badge { background: #f00; border-radius: 4px; padding: 2px 6px; }
@media (min-width: 600px) { .sgs-fx__badge { padding: 4px; } }
.sgs-fx__row { display: flex; gap: 8px; margin: 4px; }
.sgs-fx__chip:focus-visible { box-shadow: 0 0 0 2px #00f; }
.sgs-fx__tint { color: var(--sgs-fx-colour, #333); }
.sgs-fx__flat { border: 0; background: none; }
.sgs-fx__sr-only { color: red; }
.sgs-fx__aside { color: #444; }
.sgs-fx__item .sgs-fx__item-label { font-weight: 700; }
.is-style-bold .sgs-fx__title { font-weight: 900; }
.sgs-fx__list li { color: #555; }
.sgs-fx__cartlink .woocommerce-Price-amount { color: #060; }
.sgs-fx__draft-only { color: #777; }
"""
    FXP_PHP = """<?php
$css = '.sgs-fx__php-part{color:#abc;padding:3px}';
$dyn = '.sgs-fx__dyn{color:' . $colour . ';background:%s}';
echo '<div class="sgs-fx__php-part"></div>';
"""
    FXP_EDIT = "export default () => <p className=\"sgs-fx__draft-only\">x</p>;\n"
    p_files = {
        'plugins/sgs-blocks/src/blocks/fx/block.json': '{"name":"sgs/fx","attributes":{"titleColour":{"type":"string"},"asideColour":{"type":"string"}}}',
        'plugins/sgs-blocks/src/blocks/fx/style.css': FXP_CSS,
        'plugins/sgs-blocks/src/blocks/fx/render.php': FXP_PHP,
        'plugins/sgs-blocks/src/blocks/fx/edit.js': FXP_EDIT,
    }
    p_attrs = Attrs([row('fx', 'titleColour', 'color', 'color', 'title'),
                     row('fx', 'asideLabelColour', 'color', 'color', 'aside-label'),
                     row('fx', 'itemLabelWeight', 'typography', 'font-weight', 'item-label')])
    p_cfg = {'parts_exemptions': [], 'parts_width_ok': {}, 'exemptions': [], 'targets': [], 'width_ok': {}}
    pc = Corpus(dict(p_files))
    psites, pextra = run_parts(pc, p_cfg, p_attrs)
    by_part = {s['stem']: s for s in psites}
    check('parts positive: a part with a literal look and no setting is unrecognised, with its fixed declarations',
          by_part.get('badge', {}).get('category') == 'unrecognised'
          and set(by_part['badge']['declarations']) == {'background', 'border-radius', 'padding'})
    check('parts: the same part written again inside @media is one site, not two', sum(1 for s in psites if s['stem'] == 'badge') == 1)
    check('parts definition: a part an attribute names as its css_element is has-setting', by_part['title']['category'] == 'has-setting')
    check("parts definition: a part and a css_element that share their distinctive word meet (aside ~ aside-label)", by_part['aside']['category'] == 'has-setting')
    check('parts: a nested descendant (`.item .item-label`) is attributed to its own part', by_part['item-label']['category'] == 'has-setting')
    check('parts negative control: a layout-only rule is not a finding', 'row' not in by_part and pextra['no-fixed-look'] >= 1)
    check('parts negative control: a focus rule is not a finding', 'chip' not in by_part and pextra['focus-rules-skipped'] == 1)
    check('parts negative control: a value read from a settable custom property, and a reset, are not fixed looks',
          'tint' not in by_part and 'flat' not in by_part)
    check('parts negative control: a commented-out rule is ignored', 'commented' not in by_part)
    check('parts negative control: a rule under .is-style-* is a named variation, not a fixed look', pextra['variation-or-editor-rules-skipped'] == 1 and by_part['title']['declarations'].get('font-weight') is None)
    check('parts negative control: a rule whose subject is WooCommerce markup is not a part', 'cartlink' not in by_part and pextra['woo-subject-rules-skipped'] == 1)
    check('parts edge: a visually-hidden utility is exempt with its reason', by_part['sr-only']['category'] == 'exempt' and by_part['sr-only']['reason'])
    check('parts edge: a part printed only by edit code is exempt as editor canvas only', by_part['draft-only']['category'] == 'exempt' and by_part['draft-only']['rule'] == 'auto:editor-canvas-only')
    check('parts edge: a descendant of a part (`.list li`) styles the part', by_part['list']['category'] == 'unrecognised')
    check('parts edge: CSS written in a PHP string is read; a value built from a variable is not fixed',
          by_part['php-part']['category'] == 'unrecognised' and set(by_part['php-part']['declarations']) == {'color', 'padding'} and 'dyn' not in by_part)
    check('parts idempotence: survey twice gives the same keys', [s['key'] for s in run_parts(pc, p_cfg, p_attrs)[0]] == [s['key'] for s in psites])
    check('parts negative control: survey does not modify the corpus', pc.files['plugins/sgs-blocks/src/blocks/fx/style.css'] == FXP_CSS)
    # exemptions
    p_cfg_ex = dict(p_cfg, parts_exemptions=[{'id': 'fx-badge', 'files': ['plugins/sgs-blocks/src/blocks/fx/*.css'], 'part': '^badge$', 'reason': 'fixture'}])
    ex_sites, _ = run_parts(pc, p_cfg_ex, p_attrs)
    check('parts edge: an exemption rule moves the part to exempt, with its reason',
          [s for s in ex_sites if s['stem'] == 'badge'][0]['category'] == 'exempt')
    stale_p = crosscheck_parts(pc, dict(p_cfg, parts_exemptions=[{'id': 'nope', 'part': '^zzz$', 'reason': 'x'}]), psites, None)
    check('parts edge: a stale exemption fails the cross-check', any('STALE parts rule nope' in f for f in stale_p))
    nr_p = crosscheck_parts(pc, dict(p_cfg, parts_exemptions=[{'id': 'bare', 'part': '^badge$'}]),
                            run_parts(pc, dict(p_cfg, parts_exemptions=[{'id': 'bare', 'part': '^badge$'}]), p_attrs)[0], None)
    check('parts edge: an exemption with no reason fails the cross-check', any('carries no reason' in f for f in nr_p))
    # ratchet and the planted part
    pb = {'ceiling': sum(keyed(psites, GATED_CATS['parts']).values()), 'entries': keyed(psites, GATED_CATS['parts'])}
    pf0, _ = check_pass('parts', pc, p_cfg, p_attrs, pb)
    planted_p = Corpus(dict(p_files, **{'plugins/sgs-blocks/src/blocks/fx/extra.css': '.sgs-fx__planted { background: #0f0; border: 1px solid #000; }\n'}))
    pf1, _ = check_pass('parts', planted_p, p_cfg, p_attrs, pb)
    check('parts planted: --check is green at its own baseline', not pf0)
    check('parts planted: a part with no setting makes --check fail', any('NEW (not in the baseline)' in f and 'planted' in f for f in pf1))
    shrunk_p = Corpus({k: v for k, v in p_files.items() if not k.endswith('style.css')})
    pf2, _ = check_pass('parts', shrunk_p, p_cfg, p_attrs, pb)
    check('parts ratchet: a baseline entry that no longer exists fails as stale', any('STALE baseline entry' in f for f in pf2))
    # corpus control
    wide_p = {'plugins/sgs-blocks/src/blocks/fx/style.css', 'plugins/sgs-blocks/src/blocks/fx/render.php',
              'plugins/sgs-blocks/includes/sneaky.css.php'}
    cxp = crosscheck_parts(pc, p_cfg, psites, wide_p)
    check('parts corpus control: a wide-only file with a part rule fails closed', any('CORPUS TOO NARROW' in f and 'sneaky' in f for f in cxp))
    p_cfg_w = dict(p_cfg, parts_width_ok={'plugins/sgs-blocks/includes/sneaky.css.php': 'fixture reason'})
    check('parts corpus control: parts_width_ok with a reason reconciles it', not any('CORPUS' in f for f in crosscheck_parts(pc, p_cfg_w, psites, wide_p)))
    check('parts corpus control: a stale parts_width_ok entry fails',
          any('STALE parts_width_ok' in f for f in crosscheck_parts(pc, dict(p_cfg, parts_width_ok={'plugins/gone/*': 'x'}), psites, wide_p)))
    check('parts corpus control: a finding in a file the wide list lacks fails (one of the two readers is wrong)',
          any('wide enumeration did not' in f for f in crosscheck_parts(pc, p_cfg, psites, {'plugins/sgs-blocks/src/blocks/fx/style.css'})))

    # ---- PASS unmapped -------------------------------------------------------------------------
    UM_BJ = {'name': 'sgs/um', 'attributes': {k: {'type': 'string'} for k in (
        'titleFontSize', 'titleFontSizeUnit', 'bodyFontSize', 'bodyFontSizeUnit', 'ghostColour', 'layout', 'badgeColour', 'hoverNote',
        'continueLabel', 'sortOrder')}}
    um_rows = [row('um', 'titleFontSize', 'typography', 'font-size', None),
               row('um', 'titleFontSizeUnit', 'typography', None, None),
               row('um', 'bodyFontSize', 'typography', 'font-size', 'body'),
               row('um', 'bodyFontSizeUnit', 'typography', None, None),
               row('um', 'ghostColour', 'color', None, None),
               row('um', 'layout', 'layout', None, None, enum='["a", "b"]'),
               row('um', 'badgeColour', 'color', 'color', 'badge'),
               row('um', 'hoverNote', 'behaviour', None, None),
               row('um', 'continueLabel', 'text-content', None, None, default='"Continue"'),
               row('um', 'sortOrder', 'layout', None, None, enum='["a", "b"]'),
               row('um', 'phantomColour', 'color', None, None)]
    UM_PHP = """<?php
echo '<button type="button" class="um__back">' . esc_html__( 'Back', 'sgs-blocks' ) . '</button>';
echo '<span class="um__go">' . esc_html__( 'Continue', 'sgs-blocks' ) . '</span>';
echo '<span class="screen-reader-text">' . esc_html__( 'Skip ahead', 'sgs-blocks' ) . '</span>';
$e = new WP_Error( 'x', __( 'Something failed', 'sgs-blocks' ) );
echo '<span aria-label="' . esc_attr__( 'Close', 'sgs-blocks' ) . '"></span>';
echo '<p>' . esc_html( $attributes['note'] ?? __( 'Fallback', 'sgs-blocks' ) ) . '</p>';
// echo '<b>' . __( 'Commented', 'sgs-blocks' ) . '</b>';
$sale = $on ? __( 'Sale', 'sgs-blocks' ) : '';
echo '<i class="um__badge">' . esc_html( $sale ) . '</i>';
$nav .= helper( 'prev', __( 'Previous', 'sgs-blocks' ) );
"""
    u_files = {'plugins/sgs-blocks/src/blocks/um/block.json': json.dumps(UM_BJ),
               'plugins/sgs-blocks/src/blocks/um/render.php': UM_PHP}
    u_attrs = Attrs(um_rows)
    u_cfg = {'unmapped_exemptions': [], 'parts_exemptions': [], 'parts_width_ok': {}, 'exemptions': [], 'targets': [], 'width_ok': {}}
    uc = Corpus(dict(u_files))
    usites, uextra = run_unmapped(uc, u_cfg, u_attrs)
    ukey = {s['key']: s for s in usites}
    check('unmapped (a) positive: a look attribute with no css_element and no css_property is found',
          ukey.get('sgs/um::ghostColour', {}).get('kind') == 'attr-neither' and ukey['sgs/um::ghostColour']['category'] == 'unrecognised')
    check('unmapped (a): a property with no element and a unit with an unmapped base are both found',
          ukey['sgs/um::titleFontSize']['kind'] == 'attr-no-element' and ukey['sgs/um::titleFontSizeUnit']['category'] == 'unrecognised')
    check('unmapped (a) edge: a unit companion of a mapped attribute is exempt with its reason',
          ukey['sgs/um::bodyFontSizeUnit']['category'] == 'exempt' and ukey['sgs/um::bodyFontSizeUnit']['reason'])
    check('unmapped (a) edge: an arrangement selector and a sort-order selector are exempt',
          ukey['sgs/um::layout']['rule'] == 'auto:layout-variant-enum' and ukey['sgs/um::sortOrder']['rule'] == 'auto:sort-order-enum')
    check('unmapped (a) negative control: a fully mapped attribute, a behaviour attribute, and a database row with no block.json entry are not findings',
          'sgs/um::badgeColour' not in ukey and 'sgs/um::hoverNote' not in ukey and 'sgs/um::phantomColour' not in ukey)
    strs = {s['stem']: s for s in usites if s['kind'] == 'string'}
    check('unmapped (b) positive: a visitor-visible word no text attribute shares a stem with is found', strs.get('Back', {}).get('category') == 'unrecognised')
    check('unmapped (b) negative control: a word an attribute shares a stem with is not (continueLabel ~ Continue)', 'Continue' not in strs)
    check('unmapped (b) negative control: screen-reader text, error messages, attribute values, attribute fallbacks and comments are not findings',
          not ({'Skip ahead', 'Something failed', 'Close', 'Fallback', 'Commented'} & set(strs)))
    check('unmapped (b) edge: a word assigned to a variable that is printed as element text is found; one appended to a markup accumulator is not',
          'Sale' in strs and 'Previous' not in strs)
    check('unmapped idempotence: survey twice gives the same keys', [s['key'] for s in run_unmapped(uc, u_cfg, u_attrs)[0]] == [s['key'] for s in usites])
    check('unmapped negative control: survey does not modify the corpus', uc.files['plugins/sgs-blocks/src/blocks/um/render.php'] == UM_PHP)
    u_cfg_ex = dict(u_cfg, unmapped_exemptions=[{'id': 'um-back', 'kind': 'string', 'string': '^Back$', 'reason': 'fixture'}])
    check('unmapped edge: an exemption rule moves a word to exempt, with its reason',
          [s for s in run_unmapped(uc, u_cfg_ex, u_attrs)[0] if s['stem'] == 'Back'][0]['category'] == 'exempt')
    check('unmapped edge: a stale exemption fails the cross-check',
          any('STALE unmapped rule nope' in f for f in crosscheck_unmapped(uc, dict(u_cfg, unmapped_exemptions=[{'id': 'nope', 'string': '^zzz$', 'reason': 'x'}]), usites, u_attrs)))
    ub = {'ceiling': sum(keyed(usites, GATED_CATS['unmapped']).values()), 'entries': keyed(usites, GATED_CATS['unmapped'])}
    uf0, _ = check_pass('unmapped', uc, u_cfg, u_attrs, ub)
    planted_u = Corpus(dict(u_files, **{'plugins/sgs-blocks/src/blocks/um/extra.php': "<?php\necho '<em class=\"um__tag\">' . esc_html__( 'Limited', 'sgs-blocks' ) . '</em>';\n"}))
    uf1, _ = check_pass('unmapped', planted_u, u_cfg, u_attrs, ub)
    check('unmapped planted: --check is green at its own baseline', not uf0)
    check('unmapped planted: a fixed word with no setting makes --check fail', any('NEW (not in the baseline)' in f and 'Limited' in f for f in uf1))
    bj2 = json.loads(json.dumps(UM_BJ))
    bj2['attributes']['newGhost'] = {'type': 'string'}
    uf2, _ = check_pass('unmapped', Corpus(dict(u_files, **{'plugins/sgs-blocks/src/blocks/um/block.json': json.dumps(bj2)})), u_cfg, u_attrs, ub)
    check('unmapped corpus control: a block.json attribute the database does not hold only warns (DB behind the code)', not any('DB BEHIND' in f for f in uf2))
    uf3, _ = check_pass('unmapped', Corpus({}), u_cfg, u_attrs, ub)
    check('unmapped corpus control: database rows for a block with no block.json only warn (DB ahead of the code)', not any('DB STALE' in f for f in uf3))
    check('baseline sections: each pass reads its own section; a missing section is "no baseline", never a pass',
          any('no baseline for the unmapped pass' in f for f in ratchet(usites, {'ceiling': None, 'entries': {}}, 'unmapped')[0]))
    check('unmapped (b) stripper: a comment naming a word is blanked', 'Commented' not in {w for _, _, w, _ in scan_strings('x.php', UM_PHP)})
    return fails


# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------
def skipped_no_db(p):
    print('SKIPPED (%s pass): the framework database is not at %s. These passes are database-first; '
          'run /sgs-update on this machine to build it. Nothing was checked.' % (p, FRAMEWORK_DB))
    return 0


def pass_sites(p, corpus, cfg, attrs):
    """(sites, extra) for one pass; extra is the pass's informational counts."""
    if p == 'buttons':
        return run_survey(corpus, cfg), {}
    if p == 'parts':
        return run_parts(corpus, cfg, attrs)
    return run_unmapped(corpus, cfg, attrs)


def check_pass(p, corpus, cfg, attrs, baseline, wide=None):
    """(failures, sites) for the parts and unmapped passes: cross-checks plus the ratchet."""
    sites, _ = pass_sites(p, corpus, cfg, attrs)
    fails = (crosscheck_parts(corpus, cfg, sites, wide) if p == 'parts'
             else crosscheck_unmapped(corpus, cfg, sites, attrs))
    rfails, _ = ratchet(sites, baseline, p)
    return fails + rfails, sites


def run_pass(p, a, corpus, cfg, attrs, results):
    """Run one pass for the requested mode; returns its exit code."""
    if p != 'buttons' and attrs is None:
        return skipped_no_db(p) if (a.check or a.write_baseline) else _no_db_error(p)
    gated = GATED_CATS[p]

    if a.check:
        if p == 'buttons':
            rc, _ = run_check(corpus, cfg, load_baseline('buttons'), wide_enumeration())
            return rc
        allf, sites = check_pass(p, corpus, cfg, attrs, load_baseline(p), wide_parts() if p == 'parts' else None)
        t = tally_for(p, sites)
        n = sum(t.get(c, 0) for c in gated)
        if allf:
            print('FAIL (%s): %d finding(s); gated count %d, baseline ceiling %s' % (p, len(allf), n, load_baseline(p).get('ceiling')))
            for f in allf:
                print('  - ' + f)
            return 1
        print('PASS (%s): gated count %d = baseline ceiling %s; %s' % (
            p, n, load_baseline(p).get('ceiling'), ', '.join('%s %d' % kv for kv in t.items() if kv[0] not in gated)))
        return 0

    if a.write_baseline:
        sites, _ = pass_sites(p, corpus, cfg, attrs)
        live = keyed(sites, gated)
        old = load_baseline(p)
        old_entries = old.get('entries', {})
        raised = [k for k, n in live.items() if n > old_entries.get(k, 0)] if old.get('ceiling') is not None else []
        if raised:
            print('REFUSED (%s): the baseline only shrinks; these would rise or appear: %s' % (p, ', '.join(raised[:5])))
            return 1
        write_baseline_section(p, live, BASELINE_COMMENTS[p])
        print('baseline written (%s): ceiling %d over %d entries' % (p, sum(live.values()), len(live)))
        return 0

    sites, extra = pass_sites(p, corpus, cfg, attrs)
    results[p] = survey_dict(p, sites, extra)
    if not a.json:
        if p == 'buttons':
            print_survey(sites, corpus, cfg)
        else:
            print_survey_generic(p, sites, extra)
    return 0


def _no_db_error(p):
    print('ERROR (%s pass): the framework database is not at %s; run /sgs-update.' % (p, FRAMEWORK_DB), file=sys.stderr)
    return 2


def main():
    ap = argparse.ArgumentParser(description='A styled part with no setting (detector).')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true', help='buttons pass only: the rename pass (diff)')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--write-baseline', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--pass', dest='pass_', default='all', choices=('all',) + PASSES)
    ap.add_argument('--block', default='', help='the rename pass and the rename census: only the rows of these blocks in the map (a comma list of slugs)')
    a = ap.parse_args()
    passes = PASSES if a.pass_ == 'all' else (a.pass_,)

    if a.self_test:
        fails = self_test()
        print('\n' + ('SELF-TEST FAILED (%d)' % len(fails) if fails else 'self-test: all assertions passed'))
        return 1 if fails else 0

    if a.fix:
        return run_fix(a)

    cfg = load_cfg_all()
    corpus = Corpus.from_disk()
    attrs = Attrs.from_db() if any(p != 'buttons' for p in passes) else None
    results, rc = {}, 0
    for p in passes:
        rc = max(rc, run_pass(p, a, corpus, cfg, attrs, results))
    if results and a.json:
        print(json.dumps({'generated_by': 'plugins/sgs-blocks/scripts/check-styled-part-has-setting.py --survey --json',
                          'passes': results}, indent=2, ensure_ascii=False))
    elif results and 'buttons' in results and not a.json:
        renames = load_renames(a.block)
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
    return rc


def run_fix(a):
    renames = load_renames(a.block)
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


if __name__ == '__main__':
    sys.exit(main())
