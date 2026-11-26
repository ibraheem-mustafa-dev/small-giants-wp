"""Render a block offline through the plugin's own runner (scripts/qa/lib/render-css-harness.php), with a cache.

Every render is cached under <cache root>/<code hash>/<render key>.json. The code hash is per block: it covers the
block's own folder and those of the blocks its fixture renders with it, which block folders exist and which hold a
render.php (the runner resolves a name to its folder, and its registry stand-in answers is_registered by it),
src/blocks/extensions, src/shared, includes/, assets/, schemas/ (a helper reads schemas/motion.schema.json), templates/,
the runner (scripts/qa/lib/) and sgs-blocks.php, every PHP file under includes/ or src/ that registers a render_block
filter (the runner loads them all), the theme's theme.json (the runner's wp_get_global_styles reads it), plus the fixture
files. Another block's files are not in it: a render
that reads one anyway (a block type its PHP looks up in the registry, a block its content renders) records the file and
the content hash PHP took of it before exiting (`outside`, from included-files.php), and the cached render is used only while every such file is unchanged
(Renderer._outside_current), so one block's block.json edit re-renders only the renders that read it. A render's cache
holds only its PHP output, and the stylesheets are read fresh on every check. The cache root is SGS_SETTING_RECORD_CACHE,
else .cache/ beside this file (gitignored).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_PLUGIN = HERE.parents[1]
# outside the checkout, so a gate run in a temporary worktree (deploy_ship.py::run_isolated) starts warm, as
# deploy_cache.py keeps ~/.cache/sgs-deploy; renders are keyed by a hash of the code they read, so a stale one is never used
CACHE_ROOT = Path(os.environ.get('SGS_SETTING_RECORD_CACHE') or Path.home() / '.cache' / 'sgs-setting-record')
WORKERS = int(os.environ.get('SGS_SETTING_RECORD_WORKERS') or max(2, os.cpu_count() or 8))
TIMEOUT = int(os.environ.get('SGS_SETTING_RECORD_TIMEOUT') or 120)  # seconds one render may take

# Stand-ins for the ids and urls a fixture names (an image, a menu post, its first item, a drawer, a second page for a
# setting that names a post, a mega menu panel post, a WooCommerce product). A stand-in post or product exists in a
# render only where that fixture's `harness` hands the runner the file that holds it (fixtures/*.json).
PLACEHOLDERS = {'{{image}}': 9001, '{{image.url}}': 'https://example.test/wp-content/uploads/calibration.jpg',
                '{{menu}}': 9101, '{{menuItem}}': 9102, '{{drawer}}': 9103,
                '{{post2}}': 9201, '{{mega}}': 9202, '{{product}}': 9301,
                '{{product:text}}': '9301'}  # the product id written as text (the fixtures' {{role:text}} token form)
# What the setting check alone wants of the runner: the plugin's render_block filters, what wp_footer prints, WordPress's
# own wrapper classes and spacing styles, and the Interactivity state each render collected (apply_directives reads it).
# Loaded before the runner: writes the PHP files a render loaded (get_included_files()) where SGS_SETTING_RECORD_INCLUDED
# says, printing nothing, so the runner and its output are unchanged (stamp.py reads the list).
INCLUDED_HOOK = HERE / 'included-files.php'
RUNNER_FIDELITY_FLAGS = ['--render-block-filters', '--print-footer', '--wp-fidelity', '--interactivity-state']
# SGS_RENDER_MUTATE=<mechanism> switches one mechanism off, so its must-fail test can be seen failing (tests/test_render.py)
MUTATE = set(filter(None, (os.environ.get('SGS_RENDER_MUTATE') or '').split(',')))
CODE_ROOTS = ('src', 'includes', 'assets', 'schemas', 'templates', 'scripts/qa/lib', 'sgs-blocks.php')


# A stylesheet or a script never changes what a render prints: the renders read neither (the plugin files that do,
# ASSET_READERS, are never loaded by a render; Renderer.render refuses one that loads it), so a CSS or editor-script edit
# keeps every cached render. The check reads the sheets themselves fresh (diff.py::sheet_files), and each record's stamp
# holds them (stamp.py `shipped:`), so a CSS edit still selects and re-checks the blocks it reaches; a script edit moves
# no entry the offline check can see (a browser verdict holds only while check.py::script_hash is unchanged).
STYLESHEET_SUFFIXES = ('.css', '.scss')
SCRIPT_SUFFIXES = ('.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx')
NOT_RENDER_INPUTS = STYLESHEET_SUFFIXES + SCRIPT_SUFFIXES + ('.md',)
ASSET_READERS = ('includes/class-sgs-css-delivery.php',  # inlines block stylesheets into the head
                 'includes/woocommerce/commerce-look/line-items.php')  # inlines summary-extras.js
STYLESHEET_READERS = ASSET_READERS


def _files(base: Path):
    if base.is_file():
        return [base]
    return sorted(p for p in base.rglob('*') if p.is_file() and '__pycache__' not in p.parts
                  and p.suffix not in NOT_RENDER_INPUTS) if base.is_dir() else []


def code_hash(plugin: Path, fixture_files=(), blocks=None) -> str:
    """A hash of every file a render of these blocks can read, plus the fixture files the renders use. blocks=None
    covers every block folder whole."""
    h = hashlib.md5()
    files = []
    for root in CODE_ROOTS:
        if root != 'src' or blocks is None:
            files += _files(plugin / root)
            continue
        files += _files(plugin / 'src' / 'shared') + _files(plugin / 'src' / 'blocks' / 'extensions')
        folders = sorted(x for x in (plugin / 'src' / 'blocks').iterdir() if x.is_dir() and x.name != 'extensions')
        # which blocks exist and which render through PHP: a name resolves to a folder whatever the render reads
        h.update(('blocks:' + ','.join(d.name + ('+' if (d / 'render.php').is_file() else '') for d in folders)).encode())
        for d in folders:
            if d.name in blocks:
                files += _files(d)
            elif 'every-block-json' in MUTATE:
                files += [f for f in [d / 'block.json'] if f.is_file()]
    for f in files:
        h.update(f.relative_to(plugin).as_posix().encode())
        h.update(f.read_bytes())
    # the theme's theme.json: the runner's wp_get_global_styles reads its styles when a fixture gives no globalSettings
    # (scripts/qa/lib/wp-stubs.php; includes/class-heading-look.php reads them)
    theme = theme_json(plugin)
    if theme.is_file() and 'theme-json' not in MUTATE:
        h.update(b'theme.json')
        h.update(theme.read_bytes())
    # every file the runner loads for its render_block filters, wherever it sits (a block folder the key leaves out included)
    for f in [] if 'filter-scan' in MUTATE else render_block_filter_files(plugin):
        h.update(f.relative_to(plugin).as_posix().encode())
        h.update(f.read_bytes())
    for f in sorted(str(x) for x in fixture_files):
        p = Path(f)
        if p.is_file():
            h.update(p.name.encode())
            h.update(p.read_bytes())
    return h.hexdigest()[:16]


def theme_json(plugin: Path) -> Path:
    """The theme's theme.json beside the plugin in the checkout (scripts/qa/lib/wp-stubs.php::wp_get_global_styles reads it)."""
    return Path(plugin).resolve().parents[1] / 'theme' / 'sgs-theme' / 'theme.json'


# scripts/qa/lib/render-css-harness.php::sgs_qa_render_block_filter_files' test: a PHP file that registers a render_block filter
RENDER_BLOCK_FILTER = re.compile(r"""\badd_filter\(\s*['"]render_block(?:_data|_[A-Za-z0-9_/-]+)?['"]""")


def render_block_filter_files(plugin: Path) -> list:
    """The PHP files under includes/ and src/ that register a render_block filter, which the runner loads for every render
    (render-css-harness.php::sgs_qa_render_block_filter_files, the same scan; the runner's own skip list is not applied,
    so the key may cover a file the runner leaves out, never the reverse)."""
    out = []
    for root in ('includes', 'src'):
        base = Path(plugin) / root
        for f in sorted(base.rglob('*.php')) if base.is_dir() else []:
            rel = f.relative_to(plugin).as_posix()
            if '/tests/' in rel or '/vendor/' in rel:
                continue
            if RENDER_BLOCK_FILTER.search(f.read_text(encoding='utf-8', errors='ignore')):
                out.append(f)
    return out


def outside_block(rel: str, related) -> bool:
    """Whether a plugin file (its path relative to the plugin) is in a block folder the code hash leaves out (`related`:
    the blocks it covers whole; None covers every block)."""
    parts = rel.split('/')
    return related is not None and len(parts) > 3 and parts[:2] == ['src', 'blocks'] and parts[2] != 'extensions' and parts[2] not in related


_MD5 = {}  # path -> ((mtime_ns, size), md5): a file asked for again is hashed again only when it changed


def file_md5(f: Path) -> str:
    """The md5 of a file's bytes ('missing' when it is gone)."""
    try:
        st = f.stat()
    except OSError:
        return 'missing'
    sig = (st.st_mtime_ns, st.st_size)
    got = _MD5.get(str(f))
    if got is None or got[0] != sig:
        got = _MD5[str(f)] = (sig, hashlib.md5(f.read_bytes()).hexdigest())
    return got[1]


def block_json(plugin: Path, short: str) -> dict:
    return json.loads((plugin / 'src' / 'blocks' / short / 'block.json').read_text(encoding='utf-8'))


def with_defaults(plugin: Path, short: str, attrs: dict) -> dict:
    """The block's declared defaults with the given attributes over them (WordPress applies the defaults)."""
    out = {k: v['default'] for k, v in block_json(plugin, short).get('attributes', {}).items() if isinstance(v, dict) and 'default' in v}
    out.update(attrs)
    return out


def provided_context(plugin: Path, short: str, attrs: dict) -> dict:
    """The block context a block hands its children (block.json `providesContext`: context name to attribute), as
    WP_Block::render builds it: each named attribute's value from the block's attributes with their defaults applied; an
    attribute the block does not hold gives nothing."""
    return {name: attrs[a] for name, a in (block_json(plugin, short).get('providesContext') or {}).items() if a in attrs}


def fill(v):
    """Placeholders replaced by their stand-in values, anywhere in a value."""
    if isinstance(v, str):
        if v in PLACEHOLDERS:
            return PLACEHOLDERS[v]
        for k, r in PLACEHOLDERS.items():
            v = v.replace(k, str(r))
        return v
    if isinstance(v, list):
        return [fill(x) for x in v]
    if isinstance(v, dict):
        return {k: fill(x) for k, x in v.items()}
    return v


# Stand-ins a fixture's `harness` may carry inline, in the shape tests/fixtures/motion/render-paths.json uses for the
# same runner (scripts/check-motion-part-render-paths.py::php_render): each is written once to a file named by its
# content and handed to the runner's flag, so a changed stand-in is a changed render key. `options` (site options the
# render reads through get_option()) goes to the runner as SGS_QA_OPTIONS (wp-stubs.php).
INLINE_STANDINS = {'product': '--product-file', 'manifest': '--manifest-file', 'queried': '--queried-file',
                   'post': '--post-file', 'context': '--context-file', 'attachments': '--attachments-file',
                   'globalSettings': '--global-settings-file', 'taxonomies': '--taxonomies-file',
                   'postContent': '--post-content-file'}


def write_whole(f: Path, text: str) -> None:
    """Write `text` to `f` so no reader ever sees part of it: a file beside it, renamed over it."""
    tmp = f.with_name(f'{f.name}.{os.getpid()}-{threading.get_ident()}.tmp')
    tmp.write_text(text, encoding='utf-8')
    os.replace(tmp, f)


# One lock per render key: render_many renders a context-providing block's children for every job, and jobs that hand
# down the same context render the same child, so two threads would otherwise write and read one key's files at once.
_KEY_LOCKS: dict = {}
_KEY_LOCKS_GUARD = threading.Lock()


def key_lock(key: str) -> threading.Lock:
    with _KEY_LOCKS_GUARD:
        return _KEY_LOCKS.setdefault(key, threading.Lock())


def standin_file(value, ext: str) -> Path:
    """The file holding one inline stand-in, named by its content (written once, whole)."""
    text = value if isinstance(value, str) and ext == 'html' else json.dumps(value, sort_keys=True)
    f = CACHE_ROOT / 'standins' / f'{hashlib.md5(text.encode()).hexdigest()}.{ext}'
    if not f.is_file():
        f.parent.mkdir(parents=True, exist_ok=True)
        write_whole(f, text)
    return f


def harness_env(fixture: dict) -> dict | None:
    """The runner's environment for a fixture whose harness names site options, else None (the parent's)."""
    opts = (fixture.get('harness') or {}).get('options')
    return {**os.environ, 'SGS_QA_OPTIONS': json.dumps(opts, sort_keys=True)} if opts else None


def included_paths(files, plugin: Path) -> list:
    """The plugin's own files among those a render loaded, relative to the plugin (the runner and its stubs left out:
    they are the check's, not the block's)."""
    root = str(Path(plugin).resolve()).replace('\\', '/').rstrip('/') + '/'
    out = set()
    for f in files:
        f = str(f).replace('\\', '/')
        if f.lower().startswith(root.lower()):
            rel = f[len(root):]
            if not rel.startswith(('scripts/', 'vendor/', 'tests/')):
                out.add(rel)
    return sorted(out)


def harness_args(fixture: dict, fixtures_dir: Path) -> tuple:
    """The runner's extra arguments a fixture's `harness` object asks for; relative files resolve beside fixtures.json."""
    h = fixture.get('harness') or {}
    path = lambda f: str(Path(f) if Path(f).is_absolute() else (fixtures_dir / f).resolve())  # noqa: E731
    out = []
    if h.get('stubWoocommerce'):
        out.append('--stub-woocommerce')
    if h.get('renderFile'):
        out += ['--render-file', path(h['renderFile'])]
    if h.get('postFile'):
        out += ['--post-file', path(h['postFile'])]
    if h.get('productFile'):
        out += ['--product-file', path(h['productFile'])]
    if h.get('attachmentsFile'):
        out += ['--attachments-file', path(h['attachmentsFile'])]
    for key, flag in INLINE_STANDINS.items():
        if key in h:
            if flag in out:
                raise ValueError(f'harness gives {flag} twice (a file and the inline `{key}`)')
            out += [flag, str(standin_file(h[key], 'html' if key == 'postContent' else 'json'))]
    out.append('--motion-targets')  # the real block types registered, as on a site
    out += RUNNER_FIDELITY_FLAGS
    return tuple(out)


def portable_args(args, fixtures_dir: Path) -> list:
    """The runner arguments with the fixtures folder and the cache folder written as <fixtures> and <cache>."""
    roots = [(str(Path(fixtures_dir).resolve()), '<fixtures>'), (str(Path(CACHE_ROOT).resolve()), '<cache>')]
    out = []
    for a in args:
        a = str(a)
        for root, token in roots:
            if a.lower().startswith(root.lower()):
                a = token + a[len(root):].replace('\\', '/')
                break
        out.append(a)
    return out


def fixture_files(fixture: dict, fixtures_dir: Path) -> list:
    h = fixture.get('harness') or {}
    return [Path(f) if Path(f).is_absolute() else fixtures_dir / f for k, f in h.items() if k.endswith('File') and f]


class Renderer:
    """Renders of one block under one plugin copy, cached by code hash."""

    def __init__(self, plugin: Path, fixture: dict, fixtures_dir: Path, short: str | None = None):
        self.plugin = plugin
        self.harness = plugin / 'scripts' / 'qa' / 'lib' / 'render-css-harness.php'
        self.fixture = fixture
        self.extra = harness_args(fixture, fixtures_dir)
        # the runner arguments as the cache key holds them: a stand-in file by its place beside fixtures.json or in the
        # cache, not by this checkout's path (its content is in self.hash), so another checkout of the same code (a gate's
        # temporary worktree) finds the same renders
        self.key_extra = portable_args(self.extra, fixtures_dir)
        related = None
        if short:
            names = re.findall(r'"name": "sgs/([a-z0-9-]+)"', json.dumps([fixture.get('inner') or [], fixture.get('parents') or [], fixture.get('paintStates') or []]))
            related = {short} if 'own-folder-only' in MUTATE else {short, *names}
        self.related = related
        self.hash = code_hash(plugin, fixture_files(fixture, fixtures_dir), related)
        self.cache = CACHE_ROOT / self.hash
        self.cache.mkdir(parents=True, exist_ok=True)
        self.post = fixture.get('post') or []
        self.env = harness_env(fixture)
        self.options = (fixture.get('harness') or {}).get('options')
        self.included = set()  # every plugin PHP file any render here loaded (the block's, its children's, its parents')

    def render(self, slug: str, attrs: dict, content: str = '', inner=None, context=None, child: bool = False) -> dict:
        """One render, cached. The fixture's block takes the context its `harness` stands in for its place on a page. A
        child (render_inner, `child`) takes only `context`: the keys its usesContext lists, from its ancestors or the page."""
        extra, key_extra = list(self.extra), list(self.key_extra)
        if child:
            if '--context-file' in extra:
                i = extra.index('--context-file')
                del extra[i:i + 2]
                j = key_extra.index('--context-file')
                del key_extra[j:j + 2]
            if context:
                extra += ['--context-file', str(standin_file(context, 'json'))]
                key_extra += ['context', context]
        key_parts = [slug, attrs, content, inner, key_extra, self.post] + ([self.options] if self.options else [])
        key = hashlib.md5(json.dumps(key_parts, sort_keys=True).encode()).hexdigest()
        with key_lock(key):
            return self._render_at(key, slug, attrs, content, inner, extra)

    def _render_at(self, key: str, slug: str, attrs: dict, content: str, inner, extra: list) -> dict:
        """render() for one cache key, under that key's lock."""
        cf = self.cache / f'{key}.json'
        if cf.is_file():
            res = json.loads(cf.read_text(encoding='utf-8'))
            # a render cached before renders reported their files, before the cache held PHP's own html (`raw`), or one a
            # file outside the code hash it read has changed under, is rendered again
            if 'included' in res and (res.get('raw') or 'processed-html' in MUTATE) and self._outside_current(res):
                self.included.update(res['included'])
                return self._processed(res) if res.get('raw') else res
        af = self.cache / f'{key}.attrs.json'
        af.write_text(json.dumps(attrs), encoding='utf-8')
        inc = self.cache / f'{key}.included.json'
        reads = self.cache / f'{key}.reads.json'
        cmd = ['php', '-d', f'auto_prepend_file={INCLUDED_HOOK}', str(self.harness), '--slug', slug, '--attrs-file', str(af),
               '--render-children', *extra]
        if content:
            cfile = self.cache / f'{key}.content.html'
            cfile.write_text(content, encoding='utf-8')
            cmd += ['--content-file', str(cfile)]
        if inner:
            ifile = self.cache / f'{key}.inner.json'
            ifile.write_text(json.dumps(inner), encoding='utf-8')
            cmd += ['--inner-blocks-file', str(ifile)]
        t0 = time.time()
        env = {**(self.env or os.environ), 'SGS_SETTING_RECORD_INCLUDED': str(inc), 'SGS_SETTING_RECORD_READS': str(reads)}
        for attempt in (1, 2):  # a render the busy machine starved is tried once more before it counts as failed
            try:
                p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=str(self.plugin), timeout=TIMEOUT, env=env)
                break
            except subprocess.TimeoutExpired:
                if attempt == 2:
                    return {'ok': False, 'error': f'the render did not finish in {TIMEOUT} s (tried twice)', 'secs': round(time.time() - t0, 3), 'notices': []}
        res = last_json(p.stdout)
        if res is None:
            res = {'ok': False, 'error': 'no JSON result: ' + (p.stderr[-500:] or p.stdout[-500:])}
        res['secs'] = round(time.time() - t0, 3)
        res['notices'] = [ln for ln in (p.stderr or '').splitlines() if 'Warning' in ln or 'Fatal' in ln or 'Deprecated' in ln][:8]
        if res.get('ok'):
            # included-files.php writes the list at every render's end (an empty list only if PHP never reached it)
            res['included'] = included_paths(json.loads(inc.read_text(encoding='utf-8')), self.plugin) if inc.is_file() else []
            readers = sorted(set(res['included']) & set(ASSET_READERS))
            if readers:
                raise RuntimeError(f'a render of {slug} loaded {readers}, which reads stylesheet files or scripts: the render '
                                   'cache key leaves them out (render.py::NOT_RENDER_INPUTS), so it must take them in first')
            self.included.update(res['included'])
            # every file outside the code hash the render loaded or read, with its content hash (_outside_current)
            # the md5 included-files.php took of every block-folder file the render loaded or read, before PHP exited: a file
            # edited after the render keeps the hash of what the render saw, so the next use renders again
            taken = json.loads(reads.read_text(encoding='utf-8')) if reads.is_file() else {}
            taken = {rel: md5 for path, md5 in (taken.items() if isinstance(taken, dict) else []) for rel in included_paths([path], self.plugin)}
            res['outside'] = {rel: (file_md5(self.plugin / rel) if 'php-md5' in MUTATE else taken.get(rel, 'unread'))
                              for rel in sorted({*res['included'], *taken}) if outside_block(rel, self.related)}
        # The cache holds the html PHP printed: render.py is in no key, so the offline steps run on every use and an edit to
        # apply_directives or apply_post reaches every cached render. A failed render is retried next run, never cached;
        # nor is one that names no file it loaded: a render always loads its own render.php, so an empty list means the
        # plugin's path did not match what PHP reported (a substituted drive) and neither `outside` nor the stylesheet-reader
        # guard saw anything.
        if not (res.get('ok') and (res['included'] or 'cache-empty-included' in MUTATE)):
            return self._processed(res)
        if 'processed-html' in MUTATE:
            res = self._processed(res)
            write_whole(cf, json.dumps(res))
            return res
        res['raw'] = True
        write_whole(cf, json.dumps(res))
        return self._processed(res)

    def _processed(self, res: dict) -> dict:
        """A render as the check reads it: the Interactivity directives applied to PHP's html, then the fixture's post-render
        steps (a front-end script's attributes); a copy, so the cached result keeps PHP's own html."""
        if not res.get('ok'):
            return res
        out = dict(res)
        out.pop('raw', None)
        out['html'] = apply_directives(out.get('html', ''), out.get('interactivityState') or {})
        if self.post:
            out['html'] = apply_post(out['html'], self.post)
        return out

    def _outside_current(self, res: dict) -> bool:
        """Whether every file outside the code hash that a cached render loaded or read (`outside`: a block type its PHP looked
        up, a block its content rendered) still has the content it had. A scoped renderer's render with no `outside` list
        was cached before reads were recorded: it is rendered again."""
        if self.related is None or 'outside-check' in MUTATE:
            return True
        outside = res.get('outside')
        return outside is not None and all(file_md5(self.plugin / rel) == md5 for rel, md5 in outside.items())

    def render_inner(self, rows, context=None):
        """Each fixture child rendered through its real render.php with its defaults, its own children first, as WordPress
        renders it inside its parent: `context` is the block context the ancestors hand down (provided_context, merged
        down the tree) over the page-level context the fixture's `harness` stands in, and a child receives only the keys
        its block.json `usesContext` lists. Returns (content html, inner-blocks rows)."""
        context = context or {}
        html, out = [], []
        for row in rows or []:
            name = row['name']
            short = name.split('/', 1)[1]
            attrs = fill(row.get('attributes') or {})
            has_render = (self.plugin / 'src' / 'blocks' / short / 'render.php').is_file()
            meta = block_json(self.plugin, short) if (self.plugin / 'src' / 'blocks' / short / 'block.json').is_file() else {}
            full = with_defaults(self.plugin, short, attrs) if meta else attrs
            down = {**context, **(provided_context(self.plugin, short, full) if meta else {})}
            sub_html, sub_rows = self.render_inner(row.get('innerBlocks'), down)
            if has_render:
                page = (self.fixture.get('harness') or {}).get('context') or {}
                given = {**(page if isinstance(page, dict) else {}), **context}
                uses = {k: v for k, v in given.items() if k in (meta.get('usesContext') or [])}
                r = self.render(name, full, sub_html, sub_rows, uses or None, child=True)
                h = r.get('html', '') if r.get('ok') else f'<!-- child {name} failed: {r.get("error", "")[:200]} -->'
            else:
                h = sub_html  # a static (save.js) child: its saved markup is not available offline
            html.append(h)
            out.append({'name': name, 'attributes': attrs, 'html': h, **({'innerBlocks': row['innerBlocks']} if row.get('innerBlocks') else {})})
        return ''.join(html), out

    def render_many(self, slug: str, jobs: dict, content: str, inner) -> dict:
        """{job key: attrs} rendered in parallel; returns {job key: result}. `content` and `inner` are the fixture's
        children rendered once (render_inner); a block that hands its children block context (`providesContext`) has them
        rendered again for each job with the context that job's attributes give, so a setting that reaches its children
        only through context changes what they print, as on a page."""
        short = slug.split('/', 1)[1]
        rows = [{'name': r['name'], 'attributes': r.get('attributes') or {}, **({'innerBlocks': r['innerBlocks']} if r.get('innerBlocks') else {})}
                for r in inner or []]
        gives = bool(rows) and bool(block_json(self.plugin, short).get('providesContext'))

        def one(a):
            if gives:
                c, i = self.render_inner(rows, provided_context(self.plugin, short, a))
                failed = re.search(r'<!-- child (\S+) failed: (.*?) -->', c, re.S)
                if failed:
                    # a child this job's context broke is the job's failure, never a parent drawn round a gap
                    return {'ok': False, 'error': f'child {failed.group(1)} failed with the context this job gives it: {failed.group(2)[:200]}', 'notices': []}
                return self.render(slug, a, c, i)
            return self.render(slug, a, content, inner)
        with ThreadPoolExecutor(WORKERS) as ex:
            return dict(zip(jobs, ex.map(one, jobs.values())))


def last_json(text: str):
    """The last JSON object printed on stdout (the runner prints one; a PHP notice or a stray brace may come before
    it), or None."""
    dec = json.JSONDecoder()
    tail = text.rstrip()
    line_starts = [m.start() for m in re.finditer(r'(?m)^\{', tail)]
    every = [i for i in range(len(tail)) if tail[i] == '{']
    for i in [*reversed(line_starts), *reversed(every)]:  # an object on its own line first, then any brace
        try:
            obj, end = dec.raw_decode(tail, i)
            if end == len(tail) and isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass
    return None


def apply_post(html: str, steps: list) -> str:
    """A fixture's post-render steps: what a block's front-end script sets on load, applied offline (each step cites the
    script it stands for). A step sets attributes on every element its selector matches."""
    from bs4 import BeautifulSoup
    import soupsieve as sv
    soup = BeautifulSoup(html, 'html.parser')
    for step in steps:
        for el in sv.select(step['select'], soup):
            for k, v in (step.get('set') or {}).items():
                el[k] = v
    return str(soup)


MISSING = object()


def _php_truthy(v) -> bool:
    """PHP's truthiness, which WordPress's directive processing uses: '' and '0', 0, null, false, [] are false."""
    if isinstance(v, str):
        return v not in ('', '0')
    return bool(v)


def _ref_value(ref: str, ns: str, state: dict, ctx: dict):
    """A directive's reference (`state.a.b`, `context.x`, `!state.x`, `ns::state.x`) evaluated, or MISSING when the path
    is not in the data (a derived state function the runner's JSON does not hold)."""
    ref = ref.strip()
    neg = ref.startswith('!')
    ref = ref.lstrip('!').strip()
    if '::' in ref:
        ns, ref = ref.split('::', 1)
    parts = ref.split('.')
    if parts[0] == 'state':
        cur = state.get(ns, MISSING) if isinstance(state, dict) else MISSING
    elif parts[0] == 'context':
        cur = ctx.get(ns, MISSING)
    else:
        return MISSING
    for seg in parts[1:]:
        if isinstance(cur, dict) and seg in cur:
            cur = cur[seg]
        elif isinstance(cur, list) and seg.isdigit() and int(seg) < len(cur):
            cur = cur[int(seg)]
        else:
            return MISSING
    if cur is MISSING:
        return MISSING
    return (not _php_truthy(cur)) if neg else cur


def _deep_merge(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        out = dict(a)
        for k, v in b.items():
            out[k] = _deep_merge(a[k], v) if k in a else v
        return out
    return b


def _split_style(text: str) -> list:
    """A style attribute's declarations as [property, value] pairs (a `;` inside brackets or quotes stays in its value)."""
    out, cur, depth, quote = [], '', 0, ''
    for ch in text or '':
        if quote:
            quote = '' if ch == quote else quote
        elif ch in ('"', "'"):
            quote = ch
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ';' and not depth:
            out.append(cur)
            cur = ''
            continue
        cur += ch
    out.append(cur)
    return [[k.strip(), v.strip()] for k, _, v in (d.partition(':') for d in out if ':' in d)]


def _bind(el, attr: str, val) -> None:
    """`data-wp-bind--<attr>` as WordPress writes it: null or false removes the attribute, true sets it bare, a string
    sets its value; an aria- or data- attribute takes the words "true" and "false" instead."""
    if attr[:5] in ('aria-', 'data-') and isinstance(val, bool):
        el[attr] = 'true' if val else 'false'
    elif val is None or val is False:
        el.attrs.pop(attr, None)
    elif val is True:
        el[attr] = ''
    else:
        el[attr] = val if isinstance(val, str) else json.dumps(val) if isinstance(val, (dict, list)) else str(val)


def apply_directives(html: str, state: dict) -> str:
    """The Interactivity API's server-side directive processing (WP_Interactivity_API::process_directives), offline:
    inside a `data-wp-interactive` namespace, `data-wp-context` (merged down the tree), `data-wp-bind--<attr>`,
    `data-wp-class--<name>`, `data-wp-style--<prop>` and `data-wp-text` are evaluated against `state` ({namespace:
    {key: value}}, what wp_interactivity_state() collected) and written into the markup. A reference whose path the
    state does not hold (a derived state function) leaves that directive's target untouched."""
    if 'data-wp-' not in html:
        return html
    from bs4 import BeautifulSoup, Tag
    soup = BeautifulSoup(html, 'html.parser')

    def run(el, ns, ctx):
        attrs = el.attrs
        if 'data-wp-interactive' in attrs:
            raw = attrs['data-wp-interactive']
            try:
                parsed = json.loads(raw)
                ns = parsed.get('namespace', ns) if isinstance(parsed, dict) else (parsed if isinstance(parsed, str) else ns)
            except ValueError:
                ns = raw.strip()
        if 'data-wp-context' in attrs:
            raw, cns = attrs['data-wp-context'], ns
            if '::' in raw and not raw.lstrip().startswith(('{', '[')):
                cns, raw = raw.split('::', 1)
            try:
                data = json.loads(raw)
            except ValueError:
                data = None
            if isinstance(data, dict):
                ctx = {**ctx, cns: _deep_merge(ctx.get(cns, {}), data)}
        for name in [n for n in list(attrs) if n.startswith('data-wp-')]:
            kind, _, arg = name[len('data-wp-'):].partition('--')
            arg = arg.split('---')[0]  # `---suffix` only makes the attribute name unique
            if kind not in ('bind', 'class', 'style', 'text'):
                continue
            val = _ref_value(attrs[name], ns, state, ctx)
            if val is MISSING:
                continue
            if kind == 'bind' and arg:
                _bind(el, arg, val)
            elif kind == 'class' and arg:
                classes = [c for c in (el.get('class') or []) if c != arg]
                if _php_truthy(val):
                    classes.append(arg)
                if classes:
                    el['class'] = classes
                else:
                    el.attrs.pop('class', None)
            elif kind == 'style' and arg:
                decls = [d for d in _split_style(el.get('style', '')) if d[0].lower() != arg.lower()]
                if _php_truthy(val):
                    decls.append([arg, str(val)])
                if decls:
                    el['style'] = '; '.join(f'{k}: {v}' for k, v in decls) + ';'
                else:
                    el.attrs.pop('style', None)
            elif kind == 'text' and isinstance(val, (str, int, float)) and not isinstance(val, bool):
                el.string = str(val)
        for child in [c for c in el.children if isinstance(c, Tag)]:
            run(child, ns, ctx)

    for top in [c for c in soup.children if isinstance(c, Tag)]:
        run(top, '', {})
    return str(soup)


UID_RE = re.compile(r'\b([a-z][a-z0-9-]*?-[0-9a-f]{8})\b')
