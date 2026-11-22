"""What a block's record was checked against, and which blocks a change touches.

A record carries a stamp (check.py --write): the hash of every input its renders and proof read, and the hash of every
render's output. `select()` compares stamps with the files as they are now and names each block a change can touch,
with the reason, so only those blocks are checked again (never the whole library):

  - an input file changed: a PHP file one of its renders loaded (render.py reports them), a stylesheet the check reads
    for it (diff.py::sheet_files), its block.json, its folder (render, scripts, styles), its fixture entry or a stand-in
    file the fixture names;
  - the theme changed: only when a changed theme rule's selector can match one of the block's rendered elements (the
    classes and tags its renders print, stored in the stamp), never the whole library for a theme edit.

Two kinds of input: `own` (the block's folder, its fixture, its stylesheets, the helpers only some blocks load) and
`core` (the PHP files every block's renders load: the plugin's bootstrap). A core file changes often and rarely changes
what a block renders, so the fast tier skips it, and the full tier re-renders the block and checks it only when the
outputs differ from the stamp's (check.py --changed).
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

STAMP_VERSION = 1


def file_hash(f: Path) -> str:
    """md5 of a file's text with line endings normalised (16 hex), or '' when it does not exist."""
    try:
        return hashlib.md5(f.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:16]
    except OSError:
        return ''


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
        for m in re.finditer(r'class="([^"]*)"', html):
            classes.update(c for c in m.group(1).split() if c)
        tags.update(t.lower() for t in re.findall(r'<([a-zA-Z][a-zA-Z0-9-]*)', html))
    return {'classes': sorted(classes), 'tags': sorted(tags)}


def block_inputs(plugin: Path, short: str, fixture: dict, fixtures_dir: Path, results: dict, sheets: list) -> dict:
    """{plugin-relative path: hash} of every file the block's record depends on."""
    import render as RN
    plugin = Path(plugin)
    files = set()
    for r in results.values():
        files.update(r.get('included') or [])
    bdir = plugin / 'src' / 'blocks' / short
    files.update(p.relative_to(plugin).as_posix() for p in bdir.rglob('*') if p.is_file())
    for f in sheets:
        f = Path(f)
        try:
            files.add(f.resolve().relative_to(plugin.resolve()).as_posix())
        except ValueError:
            pass
    out = {p: file_hash(plugin / p) for p in sorted(files)}
    for f in RN.fixture_files(fixture, fixtures_dir):
        out[f'fixture:{Path(f).name}'] = file_hash(Path(f))
    out['fixture-entry'] = text_hash(json.dumps(fixture, sort_keys=True))
    return out


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


def make_stamp(plugin: Path, short: str, fixture: dict, fixtures_dir: Path, results: dict, sheets: list, theme: str) -> dict:
    tokens = rendered_tokens(results)
    return {'version': STAMP_VERSION, 'inputs': block_inputs(plugin, short, fixture, fixtures_dir, results, sheets),
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


def select(plugin: Path, records: dict, fixtures: dict, fixtures_dir: Path, theme: str) -> dict:
    """{block: {'own': [reasons], 'core': [reasons]}} for every record a change touches (blocks with no record, or a
    record with no stamp, are named with the reason; the caller decides what each tier runs)."""
    plugin = Path(plugin)
    stamps = {b: (doc.get('stamp') or {}) for b, doc in records.items()}
    # the core: files every stamped block's renders loaded
    sets = [set(s.get('inputs') or {}) for s in stamps.values() if s.get('inputs')]
    core = set.intersection(*sets) if sets else set()
    now_theme = theme_rules(theme)
    out = {}
    for block, st in stamps.items():
        short = block.split('/', 1)[-1]
        own, core_r = [], []
        if not st.get('inputs'):
            own.append('the record has no stamp')
        else:
            fixture = fixtures.get(block) or {}
            import render as RN
            for path, h in st['inputs'].items():
                if path == 'fixture-entry':
                    now = text_hash(json.dumps(fixture, sort_keys=True))
                elif path.startswith('fixture:'):
                    hit = [f for f in RN.fixture_files(fixture, fixtures_dir) if Path(f).name == path.split(':', 1)[1]]
                    now = file_hash(Path(hit[0])) if hit else ''
                else:
                    now = file_hash(plugin / path)
                if now != h:
                    (core_r if path in core else own).append(f'{path} changed')
            bdir = plugin / 'src' / 'blocks' / short
            for p in bdir.rglob('*'):
                rel = p.relative_to(plugin).as_posix()
                if p.is_file() and rel not in st['inputs']:
                    own.append(f'{rel} is new')
            if st.get('theme') != theme_reach(now_theme, st.get('classes') or [], st.get('tags') or []):
                own.append('a theme rule that can reach its rendered elements changed')
        if own or core_r:
            out[block] = {'own': own, 'core': core_r}
    return out
