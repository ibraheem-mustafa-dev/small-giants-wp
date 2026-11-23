"""What a block's record was checked against, and which blocks a change touches.

A record carries a stamp (check.py --write): the hash of every input its renders and proof read, and the hash of every
render's output. `select()` compares stamps with the files as they are now and names each block a change can touch,
with the reason, so only those blocks are checked again (never the whole library):

  - an input file changed: a PHP file one of its renders loaded (render.py reports them), a stylesheet the check reads
    for it (diff.py::sheet_files), its block.json, its folder (render, scripts, styles), its fixture entry or a stand-in
    file the fixture names;
  - the theme changed: only when a changed theme rule's selector can match one of the block's rendered elements (the
    classes and tags its renders print, stored in the stamp), never the whole library for a theme edit.

Two kinds of input: `own` (the block's folder, its fixture, the shared fixture entry, its stylesheets as shipped, the
helpers only some blocks load) and `core` (the PHP files outside any block folder that every stamped block's renders
load: the plugin's bootstrap; with fewer than CORE_MIN stamps there is no core). A core file changes often and rarely
changes what a block renders, so the fast tier skips it, and the full tier re-renders the block and checks it only when
the outputs differ from the stamp's (check.py --changed). A stylesheet is stamped as it ships (`shipped:<source>`: the
build's rewrites applied, diff.py::shipped_css), so a change to the rewriting code or the theme's shadow settings moves
it only where it changes the shipped text.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import tokenize
from pathlib import Path

STAMP_VERSION = 2


def check_hash(plugin: Path) -> str:
    """One hash of the check's own code (scripts/setting-record: its modules, scripts, runner hooks and schema, not the
    fixtures or tests), the scanner modules it imports (scripts/block-source-scan, scripts/lib/block_source_files.py)
    and the offline runner (scripts/qa/lib): a change to any reaches every block alike."""
    plugin = Path(plugin)
    files = [f for pat in ('*.py', '*.js', '*.php', 'record.schema.json') for f in (plugin / 'scripts' / 'setting-record').glob(pat)]
    files += list((plugin / 'scripts' / 'block-source-scan').glob('*.py'))
    files += [plugin / 'scripts' / 'lib' / 'block_source_files.py']
    files += list((plugin / 'scripts' / 'qa' / 'lib').glob('*.php'))
    h = hashlib.md5()
    for f in sorted(set(files), key=lambda f: f.as_posix()):
        h.update(f.name.encode())
        h.update(code_hash(f).encode())
    return h.hexdigest()[:16]
CORE_MIN = 20  # stamps needed before the files they all load count as core


def file_hash(f: Path) -> str:
    """md5 of a file's text with line endings normalised (16 hex), or '' when it does not exist."""
    try:
        return hashlib.md5(f.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:16]
    except OSError:
        return ''


def code_hash(f: Path) -> str:
    """md5 of a Python module's code (16 hex): its tokens without comments, blank lines or bare string statements
    (docstrings), indentation kept as tokens, so an edit to a comment or a docstring moves no stamp and no site look while
    any change to what runs does. Any other file, or a module that does not tokenize, is file_hash."""
    if f.suffix != '.py':
        return file_hash(f)
    try:
        text = f.read_text(encoding='utf-8')
        toks = list(tokenize.generate_tokens(io.StringIO(text).readline))
    except (OSError, SyntaxError, tokenize.TokenError, UnicodeDecodeError):
        return file_hash(f)
    lines, line = [], []
    for t in toks:
        if t.type in (tokenize.COMMENT, tokenize.NL, tokenize.ENCODING, tokenize.ENDMARKER):
            continue
        if t.type in (tokenize.INDENT, tokenize.DEDENT):
            lines.append([tokenize.tok_name[t.type]])
            continue
        if t.type == tokenize.NEWLINE:
            if line and not all(k == tokenize.STRING for k, _ in line):
                lines.append([s for _, s in line])
            line = []
            continue
        line.append((t.type, t.string))
    if line and not all(k == tokenize.STRING for k, _ in line):
        lines.append([s for _, s in line])
    return hashlib.md5('\n'.join('\x1f'.join(x) for x in lines).encode('utf-8')).hexdigest()[:16]


def text_hash(t: str) -> str:
    return hashlib.md5(t.encode('utf-8')).hexdigest()[:16]


def outputs_hash(results: dict) -> str:
    """One hash over every render's output (job key and markup), failed renders included as failed."""
    h = hashlib.md5()
    for k in sorted(results):
        r = results[k]
        h.update(k.encode())
        h.update((r.get('html', '') if r.get('ok') else '!failed').encode('utf-8'))
    return h.hexdigest()[:16]


def rendered_tokens(results: dict) -> dict:
    """The classes and tag names the block's renders print (what a theme rule must match to reach it)."""
    classes, tags = set(), set()
    for r in results.values():
        html = r.get('html') or ''
        for m in re.finditer(r'class=(["\'])(.*?)\1', html, re.S):
            classes.update(c for c in m.group(2).split() if c)
        tags.update(t.lower() for t in re.findall(r'<([a-zA-Z][a-zA-Z0-9-]*)', html))
    return {'classes': sorted(classes), 'tags': sorted(tags)}


def block_inputs(plugin: Path, short: str, fixture: dict, shared: dict, fixtures_dir: Path, included, sheets: list) -> dict:
    """{key: hash} of every input the block's record depends on: plugin-relative paths (the PHP files any of its renders
    loaded, its folder, the stylesheets read as written), `shipped:<source>` (a block stylesheet as the build ships
    it), `fixture-entry` (its fixtures.json entry as written), `fixture-shared` (the `_shared` entry) and
    `fixture:<name>` (a stand-in file the entry names)."""
    import diff as D
    import render as RN
    plugin = Path(plugin)
    files = set(included)
    bdir = plugin / 'src' / 'blocks' / short
    files.update(p.relative_to(plugin).as_posix() for p in bdir.rglob('*') if p.is_file() and stamped_file(p))
    shipped = {}
    for f in sheets:
        f = Path(f)
        src = Path(D.SOURCE_OF.get(f, f))
        rel = _rel(plugin, src)
        if rel is None:
            continue
        if src != f:
            shipped[f'shipped:{rel}'] = file_hash(f)
        else:
            files.add(rel)
    out = {p: file_hash(plugin / p) for p in sorted(files)}
    out.update(shipped)
    for f in RN.fixture_files(fixture, fixtures_dir):
        out[f'fixture:{Path(f).name}'] = file_hash(Path(f))
    out['fixture-entry'] = text_hash(json.dumps(fixture, sort_keys=True))
    out['fixture-shared'] = text_hash(json.dumps(shared or {}, sort_keys=True))
    return out


def stamped_file(p: Path) -> bool:
    """A file of the block's folder the record depends on: not a script or a note (render.py::SCRIPT_SUFFIXES; no
    render reads one, and the offline check sees no script's effect), so an editor-only edit selects nothing."""
    import render as RN
    return p.suffix not in RN.SCRIPT_SUFFIXES + ('.md',)


def _rel(plugin: Path, f: Path):
    try:
        return f.resolve().relative_to(plugin.resolve()).as_posix()
    except ValueError:
        return None


def shipped_now(plugin: Path, rel: str) -> str:
    """The hash of a block stylesheet's shipped text as the files are now ('' when its source is gone)."""
    import diff as D
    src = plugin / rel
    if not src.is_file():
        return ''
    parts = Path(rel).parts  # src/blocks/<block>/...
    bj = plugin / 'src' / 'blocks' / parts[2] / 'block.json' if len(parts) > 3 and parts[:2] == ('src', 'blocks') else Path('')
    css = D.compiled_scss(plugin, src) if src.suffix == '.scss' else src
    return file_hash(D.shipped_css(plugin, css, bj))


def theme_rules(css: str) -> dict:
    """{selector: hash of its declarations and conditions} of the theme's CSS (theme.py::theme_css)."""
    import diff as D
    out = {}
    for sel, body, media in D.read_css(css):
        for s in (x.strip() for x in sel.split(',')):
            if s:
                out[s] = text_hash(f'{out.get(s, "")}|{media}|{body}')
    return out


def theme_reach(rules: dict, classes, tags) -> str:
    """One hash of the theme rules that can reach the block's rendered elements (a rule added, removed or changed
    among them moves it; a rule elsewhere in the theme does not)."""
    classes, tags = set(classes), set(tags)
    return text_hash(json.dumps(sorted((s, h) for s, h in rules.items() if _selector_reaches(s, classes, tags))))


def make_stamp(plugin: Path, short: str, fixture: dict, shared: dict, fixtures_dir: Path, results: dict, included,
               sheets: list, theme: str) -> dict:
    """`fixture` and `shared` are the block's fixtures.json entry and `_shared` as written (what select() reads back);
    `included` every PHP file the renders loaded (render.py::Renderer.included); `sheets` every stylesheet read."""
    tokens = rendered_tokens(results)
    return {'version': STAMP_VERSION, 'check': check_hash(plugin),
            'inputs': block_inputs(plugin, short, fixture, shared, fixtures_dir, included, sheets),
            'outputs': outputs_hash(results), 'theme': theme_reach(theme_rules(theme), tokens['classes'], tokens['tags']), **tokens}


def _selector_reaches(selector: str, classes: set, tags: set) -> bool:
    """Whether a theme rule's selector can match an element of the block: every class its subject compound needs is
    printed by the block, and its tag (if any) is one the block prints. A selector it cannot read is taken to reach."""
    subject = re.split(r'\s*[>+~]\s*|\s+', selector.strip())[-1]
    subject = re.sub(r'::?[a-zA-Z-]+(\([^)]*\))?', '', subject)
    need = re.findall(r'\.([a-zA-Z0-9_-]+)', subject)
    tag = re.match(r'^([a-zA-Z][a-zA-Z0-9-]*)', subject)
    if need and not set(need) <= classes:
        return False
    if tag and tag.group(1).lower() not in tags and tag.group(1) not in ('html', 'body'):
        return False
    return True


def core_files(stamps: dict) -> set:
    """The PHP files outside any block folder that every stamped block's renders loaded (never a fixture or a stylesheet:
    those are always the block's own), and only over a real library of stamps (CORE_MIN)."""
    sets = [{k for k in s['inputs'] if k.endswith('.php') and not k.startswith('src/blocks/')}
            for s in stamps.values() if s.get('inputs')]
    return set.intersection(*sets) if len(sets) >= CORE_MIN else set()


def refresh_core(plugin: Path, records_dir: Path, skip=()) -> list:
    """Brings every record's core inputs and check hash to the files as they are now, once the canaries have shown that
    the core change moves nothing (check.py --changed --restamp). Returns the records rewritten."""
    plugin = Path(plugin)
    files = sorted(Path(records_dir).glob('*.json'))
    docs = {f: json.loads(f.read_text(encoding='utf-8')) for f in files}
    core = core_files({f: d.get('stamp') or {} for f, d in docs.items()})
    now_check = check_hash(plugin)
    out = []
    for f, d in docs.items():
        st = d.get('stamp')
        if not st or not st.get('inputs') or f.name in skip:
            continue
        new = dict(st, check=now_check, inputs={k: (file_hash(plugin / k) if k in core else h) for k, h in st['inputs'].items()})
        if new != st:
            d['stamp'] = new
            f.write_text(json.dumps(d, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
            out.append(f.name)
    return out


BLOCK_NAMED = re.compile(r"""(?:['"]|render_block_)sgs/([a-z0-9-]+)""")


def blocks_named(f: Path) -> set:
    """The blocks a PHP file names (`'sgs/form'`, a `render_block_sgs/form` filter): a file every render loads but whose
    code is aimed at one block (includes/forms/field-name-scope.php changes only the form) is that block's own input."""
    try:
        return {f'sgs/{m}' for m in BLOCK_NAMED.findall(f.read_text(encoding='utf-8', errors='ignore'))}
    except OSError:
        return set()


def select(plugin: Path, records: dict, fixtures: dict, fixtures_dir: Path, theme: str) -> dict:
    """{block: {'own': [reasons], 'core': [reasons]}} for every record a change touches (blocks with no record, or a
    record with no stamp, are named with the reason; the caller decides what each tier runs)."""
    plugin = Path(plugin)
    stamps = {b: (doc.get('stamp') or {}) for b, doc in records.items()}
    core = core_files(stamps)
    now_theme = theme_rules(theme)
    now_check = check_hash(plugin)
    out = {}
    changed_core = set()
    for block, st in stamps.items():
        short = block.split('/', 1)[-1]
        own, core_r = [], []
        if not st.get('inputs'):
            own.append('the record has no stamp')
        else:
            fixture = fixtures.get(block) or {}
            import render as RN
            for path, h in st['inputs'].items():
                if ':' not in path and path != 'fixture-entry' and not stamped_file(Path(path)):
                    continue  # a script an older stamp listed: no longer an input
                if path == 'fixture-entry':
                    now = text_hash(json.dumps(fixture, sort_keys=True))
                elif path == 'fixture-shared':
                    now = text_hash(json.dumps(fixtures.get('_shared') or {}, sort_keys=True))
                elif path.startswith('shipped:'):
                    now = shipped_now(plugin, path.split(':', 1)[1])
                elif path.startswith('fixture:'):
                    hit = [f for f in RN.fixture_files(fixture, fixtures_dir) if Path(f).name == path.split(':', 1)[1]]
                    now = file_hash(Path(hit[0])) if hit else ''
                else:
                    now = file_hash(plugin / path)
                if now != h:
                    (core_r if path in core else own).append(f'{path} changed')
                    if path in core:
                        changed_core.add(path)
            bdir = plugin / 'src' / 'blocks' / short
            for p in bdir.rglob('*'):
                rel = p.relative_to(plugin).as_posix()
                if p.is_file() and stamped_file(p) and rel not in st['inputs']:
                    own.append(f'{rel} is new')
            if st.get('theme') != theme_reach(now_theme, st.get('classes') or [], st.get('tags') or []):
                own.append('a theme rule that can reach its rendered elements changed')
            if st.get('check') != now_check:
                core_r.append("the check's code or the offline runner changed")
        if own or core_r:
            out[block] = {'own': own, 'core': core_r}
    # a core file aimed at named blocks: those blocks are checked in full, never left to the canaries
    for path in sorted(changed_core):
        named = blocks_named(plugin / path)
        # a name ending in a dash is a prefix the code matches (`str_starts_with( $name, 'sgs/form-field-' )`)
        hits = {b for b in stamps if b in named or any(n.endswith('-') and b.startswith(n) for n in named)}
        for block in sorted(hits):
            out.setdefault(block, {'own': [], 'core': []})['own'].append(f'{path} changed and names this block')
    return out
