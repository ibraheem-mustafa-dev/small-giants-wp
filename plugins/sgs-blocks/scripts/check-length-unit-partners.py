#!/usr/bin/env python3
"""Gate: no single length setting stores a bare number beside a `<name>Unit` attribute.

WHAT THIS CLOSES
    The framework's one length shape (Specs 32 and 35) is a length string per device, e.g.
    {"desktop":"240px","mobile":"80%"}: `SgsLengthControl` saves it through `ResponsiveOverride`, the editor
    preview reads it through `src/utils/css-length.js::cssLengthValue`, render.php prints it through
    `includes/helpers-css-safety.php::sgs_css_length_value`. A setting that stores a number beside a separate
    unit attribute needs its own bridge in edit.js (compose/split the control's string) and its own unit check
    in render.php, holds one unit for every device, and cannot hold a keyword (`none`, `auto`, `max-content`),
    so the cloning route reports the draft's keyword as "cannot be held".

WHAT IT FINDS
    pair     a block.json attribute `<name>Unit` beside `<name>` (or an extension's `<name>Unit` beside
             `<name>Desktop`), outside typography: font size, line height and letter spacing keep their unit
             partner under the TypographyControls standard (plugins/sgs-blocks/CLAUDE.md)
    reader   a mention of a pair's unit name (found now, or removed by a migration listed in MIGRATED) in the
             code, tests, scripts, theme patterns or the cloning route: an edit.js bridge, a render.php read, a
             writer that still sets it, a stored pattern that still carries it
    allowed  a mention ALLOW names with its reason (another block's own attribute of the same name)

    python check-length-unit-partners.py --survey [--json] [--block <slug>]
    python check-length-unit-partners.py --fix [--apply] --block <slug>   block.json only: <name> becomes
        {"type":"object","default":<old default as lengths>} and <name>Unit is deleted; edit.js, render.php
        and every reader are rewritten by hand (each block's bridge differs)
    python check-length-unit-partners.py --check [--block <slug>]          exit 1 while any pair or reader remains
    python check-length-unit-partners.py --self-test
"""
import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = Path(__file__).resolve().parent.parent
REPO = PLUGIN.parent.parent
TYPOGRAPHY = re.compile(r'(FontSize|LineHeight|LetterSpacing)$', re.I)
TIERS = ('desktop', 'tablet', 'mobile')

# Where a reader can live, relative to the repo root.
SCAN = [
    'plugins/sgs-blocks/src',
    'plugins/sgs-blocks/includes',
    'plugins/sgs-blocks/scripts',
    'plugins/sgs-blocks/tests',
    'theme/sgs-theme',
    'scripts/computed-route',
]
SKIP_DIRS = {'node_modules', 'build', 'vendor', 'cache', 'reports', '.git'}
SUFFIXES = {'.js', '.mjs', '.jsx', '.ts', '.tsx', '.php', '.py', '.json', '.md', '.html'}
SELF = {
    'plugins/sgs-blocks/scripts/check-length-unit-partners.py',
}

# Every unit attribute moved off a pair, by block (the census of 2026-10-26, reports/migrations/
# length-unit-partners-census.json, plus sgs/decorative-image's widthUnit moved the same day): a mention of one is a
# reader left behind, so its absence is asserted after its pair is gone.
MIGRATED = {
    'sgs/before-after': ['heightUnit', 'maxWidthUnit'],
    'sgs/button': ['customWidthUnit', 'minHeightUnit'],
    'sgs/container': ['minColumnWidthUnit'],
    'sgs/decorative-image': ['widthUnit'],
    'sgs/feature-grid': ['minItemWidthUnit'],
    'sgs/heading': ['customWidthUnit', 'maxWidthUnit'],
    'sgs/hero': ['splitMediaWidthUnit', 'splitMediaHeightUnit', 'splitMediaMaxWidthUnit', 'splitMediaMaxHeightUnit'],
    'sgs/media': ['maxWidthUnit', 'maxHeightUnit', 'heightUnit'],
    # The box-shape atom builds its prefixed names at runtime from these bases (sgs_media_element_stored_attr(),
    # mediaStoredAttrName()), so the bases themselves are retired too.
    'media-atom': ['HeightUnit', 'WidthUnit', 'MaxWidthUnit', 'MaxHeightUnit'],
    'sgs/modal': ['dialogWidthUnit'],
    'sgs/responsive-logo': ['shrinkWidthUnit', 'maxWidthUnit', 'maxHeightUnit'],
    'sgs/separator': ['widthUnit', 'thicknessUnit'],
    'sgs/text': ['maxWidthUnit', 'customWidthUnit'],
    'extension': ['sgsHeightUnit'],
}

# (repo-relative path, unit name): the reason the mention is not a reader of an SGS pair.
ALLOW = {}


def block_pairs(blocks_dir):
    """[(block, base, unit, base_def, unit_def)] from every block.json under blocks_dir."""
    out = []
    for f in sorted(Path(blocks_dir).glob('*/block.json')):
        data = json.loads(f.read_text(encoding='utf-8'))
        attrs = data.get('attributes', {})
        for name in attrs:
            if not name.endswith('Unit'):
                continue
            base = name[:-4]
            if TYPOGRAPHY.search(base):
                continue
            if base in attrs:
                out.append((data.get('name', f.parent.name), base, name, attrs[base], attrs[name]))
    return out


def extension_pairs(generated_php):
    """[(extension, base, unit, None, None)]: a registered `<name>Unit` beside `<name>Desktop`."""
    path = Path(generated_php)
    if not path.exists():
        return []
    names = set(re.findall(r"'([A-Za-z0-9]+)'\s*=>\s*array\(", path.read_text(encoding='utf-8')))
    return [('extension', n[:-4], n, None, None) for n in sorted(names)
            if n.endswith('Unit') and not TYPOGRAPHY.search(n[:-4]) and n[:-4] + 'Desktop' in names]


def scan_files(repo):
    """Every file under SCAN that git tracks (run output and generated indexes are ignored), or, outside a git
    checkout (the self-test's tree), every file on disk."""
    if (Path(repo) / '.git').exists():
        listed = subprocess.run(['git', '-C', str(repo), 'ls-files', '-z', '--', *SCAN], capture_output=True, check=True).stdout
        for rel in listed.decode('utf-8').split(chr(0)):
            p = Path(repo) / rel
            if rel and p.suffix in SUFFIXES and not SKIP_DIRS & set(Path(rel).parts) and p.exists():
                yield p
        return
    for rel in SCAN:
        top = Path(repo) / rel
        if not top.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                p = Path(dirpath) / fn
                if p.suffix in SUFFIXES:
                    yield p


def readers(repo, units):
    """{unit: [(path, line_no, text)]} for every word-bounded mention of each unit name."""
    if not units:
        return {}
    pattern = re.compile(r'(?<![A-Za-z0-9_])(' + '|'.join(sorted(map(re.escape, units))) + r')(?![A-Za-z0-9_])')
    out = {u: [] for u in units}
    for p in scan_files(repo):
        rel = p.relative_to(repo).as_posix()
        if rel in SELF:
            continue
        try:
            text = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        declares = p.name == 'block.json'
        for i, line in enumerate(text.splitlines(), 1):
            # A block.json key line is the pair's own declaration (counted under pairs), not a reader.
            if declares and re.match(r'\s*"[A-Za-z0-9]+Unit"\s*:', line):
                continue
            for m in pattern.finditer(line):
                if (rel, m.group(1)) not in ALLOW:
                    out[m.group(1)].append((rel, i, line.strip()[:160]))
    return out


def survey(repo, block=None, migrated=None):
    plugin = Path(repo) / 'plugins' / 'sgs-blocks'
    pairs = block_pairs(plugin / 'src' / 'blocks') + extension_pairs(plugin / 'includes' / 'extension-attributes.generated.php')
    if block:
        pairs = [p for p in pairs if p[0] == block]
    units = {p[2] for p in pairs}
    for b, names in (MIGRATED if migrated is None else migrated).items():
        if not block or b == block:
            units.update(names)
    found = readers(repo, units)
    return {
        'pairs': [{'block': b, 'setting': base, 'unit': u} for b, base, u, _, _ in pairs],
        'readers': {u: [{'file': f, 'line': n, 'text': t} for f, n, t in rows] for u, rows in sorted(found.items()) if rows},
    }


def as_length(value, unit):
    """One stored number (or numeric string) as a length string in its unit; '' stays unset."""
    if value is None or value == '':
        return None
    s = str(value).strip()
    if re.fullmatch(r'-?\d+(\.\d+)?', s):
        return s + (unit or 'px')
    return s


def converted(base_def, unit_def):
    """The attribute definition in the shared shape: an object of length strings per device."""
    old = base_def.get('default')
    unit_default = unit_def.get('default', 'px')
    unit_at = (lambda t: unit_default.get(t, 'px')) if isinstance(unit_default, dict) else (lambda t: unit_default)
    if isinstance(old, dict):
        default = {t: as_length(v, unit_at(t)) for t, v in old.items() if as_length(v, unit_at(t)) is not None}
    else:
        v = as_length(old, unit_at('desktop'))
        default = {'desktop': v} if v is not None else {}
    out = {'type': 'object', 'default': default}
    for k, v in base_def.items():
        if k not in ('type', 'default', 'minimum', 'maximum', 'enum'):
            out[k] = v
    return out


def fix_text(raw, pairs_for_file):
    """block.json text with each pair converted; formatting kept (tab indent, trailing newline)."""
    data = json.loads(raw)
    attrs = data['attributes']
    rebuilt = {}
    for name, d in attrs.items():
        hit = next((p for p in pairs_for_file if p[2] == name), None)
        if hit:
            continue
        hit = next((p for p in pairs_for_file if p[1] == name), None)
        rebuilt[name] = converted(d, attrs[hit[2]]) if hit else d
    data['attributes'] = rebuilt
    return json.dumps(data, indent='\t', ensure_ascii=False) + ('\n' if raw.endswith('\n') else '')


def fix(repo, block, apply):
    blocks = Path(repo) / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
    changed = 0
    for f in sorted(blocks.glob('*/block.json')):
        raw = f.read_text(encoding='utf-8')
        name = json.loads(raw).get('name')
        if block and name != block:
            continue
        pairs = [p for p in block_pairs(blocks) if p[0] == name]
        if not pairs:
            continue
        new = fix_text(raw, pairs)
        if new == raw:
            continue
        changed += 1
        rel = f.relative_to(repo).as_posix()
        sys.stdout.writelines(difflib.unified_diff(raw.splitlines(True), new.splitlines(True), rel, rel))
        if apply:
            tmp = f.with_suffix('.json.tmp')
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new)
            os.replace(tmp, f)
    print(f"{'applied' if apply else 'would change'}: {changed} block.json file(s); edit.js, render.php and the readers --survey lists are rewritten by hand")
    return 0


def report(result, as_json):
    if as_json:
        print(json.dumps(result, indent=2))
        return
    print(f"pairs: {len(result['pairs'])}")
    for p in result['pairs']:
        print(f"  {p['block']} {p['setting']} + {p['unit']}")
    total = sum(len(v) for v in result['readers'].values())
    print(f"readers: {total}")
    for u, rows in result['readers'].items():
        for r in rows:
            print(f"  {u}  {r['file']}:{r['line']}  {r['text']}")


def check(result):
    n = len(result['pairs']) + sum(len(v) for v in result['readers'].values())
    if n:
        report(result, False)
        print(f"FAIL: {n} pair(s) and reader(s) remain; move each setting to the shared length shape (see --help)")
        return 1
    print('OK: no single length setting stores a number beside a unit attribute')
    return 0


def self_test():
    tmp = Path(tempfile.mkdtemp(prefix='sgs-lup-'))
    try:
        blocks = tmp / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
        (blocks / 'a').mkdir(parents=True)
        (blocks / 'b').mkdir(parents=True)
        (tmp / 'plugins' / 'sgs-blocks' / 'includes').mkdir(parents=True)
        a = {'name': 'sgs/a', 'attributes': {
            'gap': {'type': 'number', 'default': 240},
            'gapUnit': {'type': 'string', 'default': 'px'},
            'size': {'type': 'object', 'default': {'desktop': 100}},
            'sizeUnit': {'type': 'string', 'enum': ['px', '%'], 'default': '%'},
            'span': {'type': 'object', 'default': {}},
            'spanUnit': {'type': 'object', 'default': {'desktop': 'px', 'mobile': '%'}},
            'cap': {'type': 'string', 'default': '', 'description': 'A cap.'},
            'capUnit': {'type': 'string', 'default': 'px'},
            'fontSize': {'type': 'number'},
            'fontSizeUnit': {'type': 'string', 'default': 'px'},
        }}
        b = {'name': 'sgs/b', 'attributes': {'fontSize': {'type': 'number'}, 'fontSizeUnit': {'type': 'string'}}}
        (blocks / 'a' / 'block.json').write_text(json.dumps(a, indent='\t') + '\n', encoding='utf-8')
        b_raw = json.dumps(b, indent='\t') + '\n'
        (blocks / 'b' / 'block.json').write_text(b_raw, encoding='utf-8')
        (blocks / 'a' / 'render.php').write_text("<?php $u = $attributes['gapUnit'] ?? 'px'; $s = $attributes['fontSizeUnit'];\n", encoding='utf-8')
        (tmp / 'plugins' / 'sgs-blocks' / 'includes' / 'extension-attributes.generated.php').write_text(
            "<?php return array( 'sgsHeightDesktop' => array( 'type' => 'number' ), 'sgsHeightUnit' => array( 'type' => 'string' ), 'sgsGapUnit' => array( 'type' => 'string' ) );\n", encoding='utf-8')

        moved = {'sgs/a': ['gapUnit', 'sizeUnit', 'spanUnit', 'capUnit']}
        r = survey(tmp, migrated=moved)
        got = sorted((p['block'], p['unit']) for p in r['pairs'])
        assert got == [('extension', 'sgsHeightUnit'), ('sgs/a', 'capUnit'), ('sgs/a', 'gapUnit'), ('sgs/a', 'sizeUnit'), ('sgs/a', 'spanUnit')], got
        assert [x['file'] for x in r['readers']['gapUnit']] == ['plugins/sgs-blocks/src/blocks/a/render.php'], r['readers']
        assert 'fontSizeUnit' not in r['readers'], 'typography partners are out of scope'
        assert check(r) == 1, 'positive: pairs and a reader fail the check'

        fix(tmp, 'sgs/a', True)
        new = json.loads((blocks / 'a' / 'block.json').read_text(encoding='utf-8'))['attributes']
        assert new['gap'] == {'type': 'object', 'default': {'desktop': '240px'}}, new['gap']
        assert new['size'] == {'type': 'object', 'default': {'desktop': '100%'}}, new['size']
        assert new['span'] == {'type': 'object', 'default': {}}, new['span']
        assert new['cap'] == {'type': 'object', 'default': {}, 'description': 'A cap.'}, new['cap']
        assert not {'gapUnit', 'sizeUnit', 'spanUnit', 'capUnit'} & set(new), 'unit partners deleted'
        assert new['fontSizeUnit'] == {'type': 'string', 'default': 'px'}, 'typography partner kept'
        assert (blocks / 'b' / 'block.json').read_text(encoding='utf-8') == b_raw, 'negative control: untouched'
        once = (blocks / 'a' / 'block.json').read_text(encoding='utf-8')
        fix(tmp, 'sgs/a', True)
        assert (blocks / 'a' / 'block.json').read_text(encoding='utf-8') == once, 'idempotent'
        assert converted({'type': 'object', 'default': {'desktop': 4, 'mobile': ''}}, {'default': {'desktop': 'rem'}}) == {'type': 'object', 'default': {'desktop': '4rem'}}

        r = survey(tmp, 'sgs/a', moved)
        assert not r['pairs'] and [x['file'] for x in r['readers'].get('gapUnit', [])] == ['plugins/sgs-blocks/src/blocks/a/render.php'], 'a reader outlives its pair'
        (blocks / 'a' / 'render.php').write_text("<?php $s = $attributes['fontSizeUnit'];\n", encoding='utf-8')
        assert check(survey(tmp, 'sgs/a', moved)) == 0, 'clean once the reader goes'
        assert check(survey(tmp, 'sgs/b', moved)) == 0
        print('self-test: OK')
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--survey', action='store_true')
    mode.add_argument('--fix', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--self-test', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--block')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.fix:
        if not args.block:
            ap.error('--fix takes --block <slug> (one block per commit)')
        return fix(REPO, args.block, args.apply)
    result = survey(REPO, args.block)
    if args.check:
        return check(result)
    report(result, args.json)
    return 0


if __name__ == '__main__':
    sys.exit(main())
