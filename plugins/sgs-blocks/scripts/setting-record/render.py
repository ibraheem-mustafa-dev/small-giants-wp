"""Render a block offline through the plugin's own runner (scripts/qa/lib/render-css-harness.php), with a cache.

Every render is cached under <cache root>/<code hash>/<render key>.json. The code hash is per block: it covers the
block's own folder and those of the blocks its fixture renders with it, every block's block.json (the runner registers
the real block types), src/blocks/extensions, src/shared, includes/, assets/, schemas/ (a helper reads
schemas/motion.schema.json), templates/, the runner (scripts/qa/lib/) and sgs-blocks.php, plus the fixture files. Another
block's stylesheet, script or PHP is not in it: a render's cache holds only its PHP output, and the stylesheets are read
fresh on every check. The cache root is SGS_SETTING_RECORD_CACHE, else .cache/ beside this file (gitignored).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_PLUGIN = HERE.parents[1]
CACHE_ROOT = Path(os.environ.get('SGS_SETTING_RECORD_CACHE') or HERE / '.cache')
WORKERS = int(os.environ.get('SGS_SETTING_RECORD_WORKERS') or max(2, os.cpu_count() or 8))

# Stand-ins for the ids and urls a fixture names (an image, a menu post, its first item, a drawer).
PLACEHOLDERS = {'{{image}}': 9001, '{{image.url}}': 'https://example.test/wp-content/uploads/calibration.jpg',
                '{{menu}}': 9101, '{{menuItem}}': 9102, '{{drawer}}': 9103}
CODE_ROOTS = ('src', 'includes', 'assets', 'schemas', 'templates', 'scripts/qa/lib', 'sgs-blocks.php')


def _files(base: Path):
    if base.is_file():
        return [base]
    return sorted(p for p in base.rglob('*') if p.is_file() and '__pycache__' not in p.parts) if base.is_dir() else []


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
        for d in sorted(x for x in (plugin / 'src' / 'blocks').iterdir() if x.is_dir() and x.name != 'extensions'):
            files += _files(d) if d.name in blocks else [f for f in [d / 'block.json'] if f.is_file()]
    for f in files:
        h.update(f.relative_to(plugin).as_posix().encode())
        h.update(f.read_bytes())
    for f in sorted(str(x) for x in fixture_files):
        p = Path(f)
        if p.is_file():
            h.update(p.name.encode())
            h.update(p.read_bytes())
    return h.hexdigest()[:16]


def block_json(plugin: Path, short: str) -> dict:
    return json.loads((plugin / 'src' / 'blocks' / short / 'block.json').read_text(encoding='utf-8'))


def with_defaults(plugin: Path, short: str, attrs: dict) -> dict:
    """The block's declared defaults with the given attributes over them (WordPress applies the defaults)."""
    out = {k: v['default'] for k, v in block_json(plugin, short).get('attributes', {}).items() if isinstance(v, dict) and 'default' in v}
    out.update(attrs)
    return out


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
    if h.get('attachmentsFile'):
        out += ['--attachments-file', path(h['attachmentsFile'])]
    out.append('--motion-targets')  # the real block types registered, as on a site
    return tuple(out)


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
        related = None
        if short:
            names = re.findall(r'"name": "sgs/([a-z0-9-]+)"', json.dumps([fixture.get('inner') or [], fixture.get('parents') or [], fixture.get('paintStates') or []]))
            related = {short, *names}
        self.hash = code_hash(plugin, fixture_files(fixture, fixtures_dir), related)
        self.cache = CACHE_ROOT / self.hash
        self.cache.mkdir(parents=True, exist_ok=True)
        self.post = fixture.get('post') or []

    def render(self, slug: str, attrs: dict, content: str = '', inner=None) -> dict:
        key = hashlib.md5(json.dumps([slug, attrs, content, inner, list(self.extra), self.post], sort_keys=True).encode()).hexdigest()
        cf = self.cache / f'{key}.json'
        if cf.is_file():
            return json.loads(cf.read_text(encoding='utf-8'))
        af = self.cache / f'{key}.attrs.json'
        af.write_text(json.dumps(attrs), encoding='utf-8')
        cmd = ['php', str(self.harness), '--slug', slug, '--attrs-file', str(af), '--render-children', *self.extra]
        if content:
            cfile = self.cache / f'{key}.content.html'
            cfile.write_text(content, encoding='utf-8')
            cmd += ['--content-file', str(cfile)]
        if inner:
            ifile = self.cache / f'{key}.inner.json'
            ifile.write_text(json.dumps(inner), encoding='utf-8')
            cmd += ['--inner-blocks-file', str(ifile)]
        t0 = time.time()
        p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=str(self.plugin))
        try:
            res = json.loads(p.stdout[p.stdout.find('{'):]) if '{' in p.stdout else {'ok': False, 'error': p.stderr[-800:] or p.stdout[-800:]}
        except json.JSONDecodeError:
            res = {'ok': False, 'error': 'bad json: ' + p.stdout[:300] + p.stderr[-500:]}
        res['secs'] = round(time.time() - t0, 3)
        res['notices'] = [ln for ln in (p.stderr or '').splitlines() if 'Warning' in ln or 'Fatal' in ln or 'Deprecated' in ln][:8]
        if res.get('ok') and self.post:
            res['html'] = apply_post(res.get('html', ''), self.post)
        cf.write_text(json.dumps(res), encoding='utf-8')
        return res

    def render_inner(self, rows):
        """Each fixture child rendered through its real render.php with its defaults, its own children first.
        Returns (content html, inner-blocks rows)."""
        html, out = [], []
        for row in rows or []:
            name = row['name']
            short = name.split('/', 1)[1]
            attrs = fill(row.get('attributes') or {})
            sub_html, sub_rows = self.render_inner(row.get('innerBlocks'))
            if (self.plugin / 'src' / 'blocks' / short / 'render.php').is_file():
                r = self.render(name, with_defaults(self.plugin, short, attrs), sub_html, sub_rows)
                h = r.get('html', '') if r.get('ok') else f'<!-- child {name} failed: {r.get("error", "")[:200]} -->'
            else:
                h = sub_html  # a static (save.js) child: its saved markup is not available offline
            html.append(h)
            out.append({'name': name, 'attributes': attrs, 'html': h, **({'innerBlocks': row['innerBlocks']} if row.get('innerBlocks') else {})})
        return ''.join(html), out

    def render_many(self, slug: str, jobs: dict, content: str, inner) -> dict:
        """{job key: attrs} rendered in parallel; returns {job key: result}."""
        with ThreadPoolExecutor(WORKERS) as ex:
            return dict(zip(jobs, ex.map(lambda a: self.render(slug, a, content, inner), jobs.values())))


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


UID_RE = re.compile(r'\b([a-z][a-z0-9-]*?-[0-9a-f]{8})\b')
