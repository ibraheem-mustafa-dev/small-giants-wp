#!/usr/bin/env python3
"""migrate-box-alignment.py - physical `left|right` to logical `start|end` for five settings.

    sgs/icon       iconAlign      left|center|right          -> start|center|end
    sgs/media      alignment      left|center|right          -> start|center|end
    sgs/separator  alignment      left|center|right          -> start|center|end
    sgs/nav-drawer drawerAlign    left|center|right|stretch  -> start|center|end|stretch
    sgs/tabs       tabAlignment   left|center|right|stretch  -> start|center|end|stretch

`start` and `end` follow the writing direction, so a right-to-left site flips them
without a second setting. `center` and `stretch` are already direction-neutral.

THREE CORPORA
  data    block-comment JSON in theme patterns/templates/parts, and block trees
          (`{"name":"sgs/x","attributes":{...}}`) in sites/*/build, scripts/nav-qa and
          scripts/computed-route/cache. `--fix --apply` rewrites these.
  schema  each block's own block.json: enum, default and example. Checked, never rewritten.
  source  edit.js / render.php / style.css markers of the old shape (SOURCE_MARKERS). Checked.

Both sgs/hero.alignment and every other block's `alignment` are untouched: a value is only
read when its owning block name is one of the five.

Edits are textual (the value token only), so indentation and key order are byte-identical.
Occurrences are paired with the parse by document order and the pairing is asserted, so a
count mismatch is reported as `unrecognised`, never guessed at.

Does not touch stored post_content (Ruling B: pages are rebuilt from their trees).

CLI:  --survey [--json]   --fix [--apply]   --check   --self-test
"""

import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Anchored on a repo-unique marker, never CLAUDE.md (plugins/sgs-blocks has its own).
ROOT = next(p for p in Path(__file__).resolve().parents if (p / '.claude' / 'THE-MIGRATION-METHOD.md').exists())
BLOCKS = ROOT / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

# block name -> (attribute, allowed new values, default new value)
SPEC = {
    'sgs/icon': ('iconAlign', ('start', 'center', 'end'), 'start'),
    'sgs/media': ('alignment', ('start', 'center', 'end'), 'start'),
    'sgs/separator': ('alignment', ('start', 'center', 'end'), 'center'),
    'sgs/nav-drawer': ('drawerAlign', ('start', 'center', 'end', 'stretch'), 'start'),
    'sgs/tabs': ('tabAlignment', ('start', 'center', 'end', 'stretch'), 'start'),
}
OLD_TO_NEW = {'left': 'start', 'right': 'end'}
ATTRS = sorted({a for a, _, _ in SPEC.values()})
KEY_RE = re.compile(r'"(' + '|'.join(ATTRS) + r')"\s*:')
VALUE_RE = re.compile(r'\s*"([^"\\]*)"')
COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')

DATA_SUFFIX_TEXT = ('.php', '.html', '.htm')
PRUNE = {'.git', 'node_modules', 'vendor', 'build', '.claude', 'pipeline-state', 'worktrees',
         '.phpunit.cache', 'dist', 'fixtures', 'cache'}

# Wide-enumeration exceptions: a file that holds a five-block value and is deliberately not migrated.
WIDTH_OK = {}

# Old-shape markers in block source, each with the reason it is the old shape. `--check` needs 0 hits.
_B = 'plugins/sgs-blocks/src/blocks/'
SOURCE_MARKERS = [
    (_B + 'icon/render.php', r"\$allowed_aligns\s*=\s*array\(\s*'left'|'left'\s*!==\s*\$icon_align", 'physical iconAlign allow-list or default'),
    (_B + 'icon/edit.js', r"iconAlign\s*!==\s*'left'|iconAlign:\s*val\s*\|\|\s*'left'", 'physical iconAlign default'),
    (_B + 'icon/style.css', r'sgs-icon--align-right', 'physical modifier class'),
    (_B + 'media/render.php', r"'left'\s*,\s*'center'\s*,\s*'right'|'right'\s*===\s*\$alignment|margin-left:auto", 'physical media alignment'),
    (_B + 'media/edit.js', r"'right'\s*===\s*attributes\.alignment|alignment\s*\|\|\s*'left'|alignment:\s*'left'", 'physical media alignment'),
    (_B + 'separator/render.php', r"'left'\s*,\s*'center'\s*,\s*'right'|case\s+'(left|right)'", 'physical separator alignment'),
    (_B + 'separator/edit.js', r"'(left|right)'\s*===\s*alignment|ALIGNMENT_OPTIONS", 'physical separator alignment'),
    (_B + 'nav-drawer/render.php', r"'left'\s*,\s*'center'\s*,\s*'right'|'(left|right)'\s*=>", 'physical drawerAlign maps'),
    (_B + 'nav-drawer/edit.js', r"drawerAlign:\s*value\s*\|\|\s*'left'|(left|right):\s*'flex-", 'physical drawerAlign map'),
    (_B + 'tabs/render.php', r"tabAlignment'\]\s*\?\?\s*'left'", 'physical tabAlignment default'),
    (_B + 'tabs/edit.js', r"ALIGNMENT_OPTIONS", 'hand-written alignment options'),
    (_B + 'tabs/style.css', r'sgs-tabs--align-right', 'physical modifier class'),
]


def rel(path):
    return Path(path).resolve().relative_to(ROOT).as_posix()


# --------------------------------------------------------------------------- targets

def narrow_targets():
    """The data files the migration owns, enumerated by explicit location."""
    out = set()
    for sub in ('patterns', 'templates', 'parts'):
        d = ROOT / 'theme' / 'sgs-theme' / sub
        if d.is_dir():
            out.update(p for p in d.rglob('*') if p.suffix in DATA_SUFFIX_TEXT)
    out.update((ROOT / 'sites').glob('*/build/**/*.tree.json'))
    nav = ROOT / 'plugins' / 'sgs-blocks' / 'scripts' / 'nav-qa'
    if nav.is_dir():
        out.update(nav.rglob('*.json'))
    cache = ROOT / 'plugins' / 'sgs-blocks' / 'scripts' / 'computed-route' / 'cache'
    if cache.is_dir():
        out.update(cache.glob('*.tree.json'))
    return sorted(p for p in out if p.is_file())


def broad_targets():
    """A second, dumb enumeration: walk everything, prune only never-source directories."""
    out = []
    for dirpath, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in PRUNE]
        for name in files:
            p = Path(dirpath) / name
            if p.suffix in DATA_SUFFIX_TEXT + ('.json',) and p.stat().st_size < 8_000_000:
                out.append(p)
    return out


# --------------------------------------------------------------------------- extraction

def _walk(obj, ctx, found):
    """Pre-order walk in key order, so `found` follows the document order of the text."""
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key in ATTRS:
                found.append((key, val, ctx))
            if key == 'attributes' and isinstance(val, dict) and isinstance(obj.get('name'), str):
                _walk(val, obj['name'], found)
            else:
                _walk(val, None, found)
    elif isinstance(obj, list):
        for item in obj:
            _walk(item, None, found)


def occurrences(json_text, block_name=None):
    """[(key, value, owning_block)] for every watched key in a JSON text, in document order.
    `block_name` is the owner of a top-level attributes object (block-comment form)."""
    obj = json.loads(json_text)
    found = []
    if block_name is not None:
        _walk({'name': block_name, 'attributes': obj}, None, found)
    else:
        _walk(obj, None, found)
    return found


def classify(block, value):
    """migratable | ok | unrecognised for one (owning block, value)."""
    if block not in SPEC or not isinstance(value, str):
        return 'ignore'
    _, allowed, _ = SPEC[block]
    if value in OLD_TO_NEW:
        return 'migratable'
    return 'ok' if value in allowed else 'unrecognised'


def edit_json_text(text, block_name=None):
    """Rewrite the watched values inside one JSON text. Returns (new_text, sites, problems)."""
    sites, problems = [], []
    try:
        found = occurrences(text, block_name)
    except json.JSONDecodeError as exc:
        return text, sites, [f'unparseable JSON ({exc.msg})']
    matches = list(KEY_RE.finditer(text))
    if len(matches) != len(found) or any(m.group(1) != f[0] for m, f in zip(matches, found)):
        return text, sites, [f'{len(matches)} textual keys vs {len(found)} parsed keys']
    edits = []
    for m, (key, val, owner) in zip(matches, found):
        verdict = classify(owner, val)
        if verdict == 'ignore':
            continue
        sites.append({'block': owner, 'attr': key, 'value': val, 'verdict': verdict})
        if verdict == 'migratable':
            vm = VALUE_RE.match(text, m.end())
            if not vm or vm.group(1) != val:
                problems.append(f'{owner}.{key}: value token not found where expected')
                continue
            edits.append((vm.start(1), vm.end(1), OLD_TO_NEW[val]))
    for start, end, new in sorted(edits, reverse=True):
        text = text[:start] + new + text[end:]
    return text, sites, problems


def transform_comments(text):
    """Block-comment form (.php/.html). Pure function of the text; idempotent."""
    sites, problems, edits = [], [], []
    for m in COMMENT_RE.finditer(text):
        idx = m.end()
        if idx >= len(text) or text[idx] != '{':
            continue
        try:
            _, end = json.JSONDecoder().raw_decode(text, idx)
        except json.JSONDecodeError:
            tail = text[idx:text.find('-->', idx) if text.find('-->', idx) != -1 else len(text)]
            if KEY_RE.search(tail):
                problems.append(f'{m.group(1)}: comment JSON does not parse but names a watched key')
            continue
        new, s, p = edit_json_text(text[idx:end], m.group(1))
        sites += s
        problems += p
        if new != text[idx:end]:
            edits.append((idx, end, new))
    for start, end, new in sorted(edits, reverse=True):
        text = text[:start] + new + text[end:]
    return text, sites, problems


def transform(text, path):
    """(new_text, sites, problems) for one data file."""
    if str(path).endswith(DATA_SUFFIX_TEXT):
        return transform_comments(text)
    return edit_json_text(text)


def read(path):
    with open(path, encoding='utf-8', newline='') as fh:
        return fh.read()


def write_atomic(path, text):
    tmp = str(path) + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)
    os.replace(tmp, path)


# --------------------------------------------------------------------------- schema + source

def schema_failures():
    out = []
    for block, (attr, allowed, default) in SPEC.items():
        bj = BLOCKS / block.split('/', 1)[1] / 'block.json'
        data = json.loads(read(bj))
        spec = data.get('attributes', {}).get(attr)
        if not isinstance(spec, dict):
            out.append(f'{rel(bj)}: attribute {attr} is not declared')
            continue
        if tuple(spec.get('enum', ())) != allowed:
            out.append(f'{rel(bj)}: {attr}.enum is {spec.get("enum")}, expected {list(allowed)}')
        if spec.get('default') != default:
            out.append(f'{rel(bj)}: {attr}.default is {spec.get("default")!r}, expected {default!r}')
        example = (data.get('example') or {}).get('attributes', {})
        if attr in example and example[attr] not in allowed:
            out.append(f'{rel(bj)}: example {attr}={example[attr]!r} is not in {list(allowed)}')
    return out


def strip_comments(src):
    src = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), src, flags=re.S)
    return re.sub(r'(?m)^[ \t]*//.*$', '', src)


def source_failures():
    out = []
    for relpath, pattern, reason in SOURCE_MARKERS:
        path = ROOT / relpath
        if not path.exists():
            out.append(f'{relpath}: marker file is missing (stale SOURCE_MARKERS entry)')
            continue
        hits = re.findall(pattern, strip_comments(read(path)))
        if hits:
            out.append(f'{relpath}: {len(hits)} old-shape site(s) - {reason}')
    return out


# --------------------------------------------------------------------------- scan

def scan(paths):
    report = {'files': 0, 'migratable': [], 'ok': 0, 'unrecognised': [], 'diffs': {}, 'new_text': {}}
    for path in paths:
        text = read(path)
        if not KEY_RE.search(text):
            continue
        new, sites, problems = transform(text, path)
        report['files'] += 1
        for s in sites:
            if s['verdict'] == 'migratable':
                report['migratable'].append({'file': rel(path), **s})
            elif s['verdict'] == 'ok':
                report['ok'] += 1
            else:
                report['unrecognised'].append({'file': rel(path), **s})
        for p in problems:
            report['unrecognised'].append({'file': rel(path), 'problem': p})
        if new != text:
            report['new_text'][path] = new
            report['diffs'][rel(path)] = ''.join(difflib.unified_diff(
                text.splitlines(True), new.splitlines(True), rel(path), rel(path) + ' (new)', n=1))
    return report


def crosscheck(narrow):
    """Whole-corpus stage: the wide enumeration must not hold a watched value the narrow list lacks."""
    out = []
    narrow_set = {Path(p).resolve() for p in narrow}
    if len(narrow) < 10:
        out.append(f'narrow target list is suspiciously small ({len(narrow)} files)')
    for path in broad_targets():
        if path.resolve() in narrow_set or rel(path) in WIDTH_OK:
            continue
        text = read(path)
        if not KEY_RE.search(text):
            continue
        _, sites, _ = transform(text, path)
        if any(s['verdict'] != 'ignore' for s in sites):
            out.append(f'{rel(path)}: holds a watched five-block value but is not a migration target (add it or WIDTH_OK)')
    return out


# --------------------------------------------------------------------------- self-test

SELF_TEST_COMMENT = (
    '<!-- wp:sgs/icon {"iconAlign":"right","x":1} /-->\n'
    '<!-- wp:sgs/hero {"alignment":"left"} /-->\n'
    '<!-- wp:sgs/nav-drawer {"drawerAlign":"stretch","drawerBg":"a"} /-->\n'
    '<!-- wp:sgs/tabs {"tabAlignment":"left"} /-->\n'
)
SELF_TEST_COMMENT_WANT = (
    '<!-- wp:sgs/icon {"iconAlign":"end","x":1} /-->\n'
    '<!-- wp:sgs/hero {"alignment":"left"} /-->\n'
    '<!-- wp:sgs/nav-drawer {"drawerAlign":"stretch","drawerBg":"a"} /-->\n'
    '<!-- wp:sgs/tabs {"tabAlignment":"start"} /-->\n'
)
SELF_TEST_TREE = (
    '[\n  {\n    "name": "sgs/media",\n    "attributes": {\n      "alignment": "right",\n'
    '      "other": {"alignment": "left"}\n    },\n    "innerBlocks": [\n'
    '      {"name": "sgs/hero", "attributes": {"alignment": "left"}}\n    ]\n  }\n]\n'
)
SELF_TEST_TREE_WANT = SELF_TEST_TREE.replace('"alignment": "right"', '"alignment": "end"')


def self_test():
    failures = []

    def expect(label, got, want):
        if got != want:
            failures.append(f'{label}: got {got!r}, want {want!r}')

    new, sites, problems = transform(SELF_TEST_COMMENT, 'x.php')
    expect('comment positive', new, SELF_TEST_COMMENT_WANT)
    expect('comment problems', problems, [])
    expect('comment migratable count', sum(s['verdict'] == 'migratable' for s in sites), 2)
    new, _, problems = transform(SELF_TEST_TREE, 'x.tree.json')
    expect('tree positive (other block and nested key untouched)', new, SELF_TEST_TREE_WANT)
    expect('tree problems', problems, [])
    for label, text, path in (('comment', SELF_TEST_COMMENT_WANT, 'x.php'), ('tree', SELF_TEST_TREE_WANT, 'x.json')):
        again, _, _ = transform(text, path)
        expect(f'idempotence {label}', again, text)
    inert = '<!-- wp:sgs/heading {"level":2} /-->\n'
    expect('negative control inert', transform(inert, 'x.php')[0], inert)
    _, sites, _ = transform('<!-- wp:sgs/icon {"iconAlign":"centre"} /-->', 'x.php')
    expect('off-enum value is unrecognised', [s['verdict'] for s in sites], ['unrecognised'])
    _, _, problems = transform('<!-- wp:sgs/icon {"iconAlign":"left" <?php x ?>} /-->', 'x.php')
    expect('unparseable comment is reported', len(problems), 1)
    _, sites, _ = transform('<!-- wp:sgs/media {"alignment":"start"} /-->', 'x.php')
    expect('already migrated is ok', [s['verdict'] for s in sites], ['ok'])
    _, sites, _ = transform('<!-- wp:sgs/separator {"alignment":"stretch"} /-->', 'x.php')
    expect('stretch is not allowed on separator', [s['verdict'] for s in sites], ['unrecognised'])
    if not narrow_targets():
        failures.append('narrow_targets() is empty')
    return failures


# --------------------------------------------------------------------------- CLI

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        failures = self_test()
        for f in failures:
            print('FAIL', f)
        print('self-test:', 'FAILED' if failures else 'ok')
        return 1 if failures else 0

    narrow = narrow_targets()
    report = scan(narrow)

    if args.check:
        problems = []
        problems += [f'{m["file"]}: {m["block"]}.{m["attr"]}={m["value"]!r} still physical' for m in report['migratable']]
        problems += [f'{u["file"]}: unrecognised {u}' for u in report['unrecognised']]
        problems += schema_failures() + source_failures() + crosscheck(narrow)
        for p in problems:
            print('FAIL', p)
        print(f'check: {"FAILED" if problems else "ok"} ({report["files"]} data files read, {len(narrow)} targets)')
        return 1 if problems else 0

    if args.fix:
        if report['unrecognised']:
            print('REFUSING: unrecognised sites, nothing written')
            for u in report['unrecognised']:
                print(' ', u)
            return 1
        for name, diff in report['diffs'].items():
            print(diff, end='')
        if args.apply:
            for path, new in report['new_text'].items():
                write_atomic(path, new)
            print(f'applied: {len(report["new_text"])} file(s)')
        else:
            print(f'dry run: {len(report["new_text"])} file(s) would change (add --apply)')
        return 0

    summary = {
        'targets': len(narrow),
        'files_with_watched_keys': report['files'],
        'migratable': len(report['migratable']),
        'already_ok': report['ok'],
        'unrecognised': len(report['unrecognised']),
        'by_file': {},
    }
    for m in report['migratable']:
        summary['by_file'].setdefault(m['file'], []).append(f'{m["block"]}.{m["attr"]}={m["value"]}')
    summary['schema_failures'] = schema_failures()
    summary['source_failures'] = source_failures()
    summary['corpus_width'] = crosscheck(narrow)
    summary['unrecognised_detail'] = report['unrecognised']
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        for k, v in summary.items():
            if k != 'by_file':
                print(f'{k}: {v}')
        for f, items in sorted(summary['by_file'].items()):
            print(f'  {f}: {", ".join(items)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
