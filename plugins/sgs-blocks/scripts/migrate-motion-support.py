#!/usr/bin/env python3
"""Declare `supports.sgs.motion: true` in every block.json that can carry the motion model (Spec 38A FR-38A-1).

WHAT THIS DOES
    Adds `"motion": true` under `supports.sgs` of each compatible block's block.json. The support registers the
    `sgsMotion` attribute (src/blocks/extensions/motion/register.js and includes/motion/support-registration.php);
    no block.json ever declares the attribute itself.

THE COMPATIBLE SET (never a hand-written list)
    1. Every block the framework DB records as carrying the entrance attribute:
       SELECT DISTINCT block_slug FROM block_attributes WHERE attr_name = 'sgsAnimation'.
    2. Plus the blocks the spec names for state or nav motion (SPEC_NAMED below; the DB has no column for them).
    3. Only blocks that exist as src/blocks/<slug>/block.json (the DB can be wider than the tree).
    4. Minus blocks whose block.json sets supports.sgs.hideExtensions including "animation", except the SPEC_NAMED
       blocks: that key hides the legacy entrance extension, and a spec-named block carries the motion model for its
       declared states whatever it hides.

    Core blocks (core/group, core/columns, core/cover, core/image) are never in the set: motion is for SGS blocks only.

FORMAT SAFETY
    The key is inserted as one new member, first in `supports.sgs`, in the layout of the object it joins (multi-line
    or inline), so every other byte is unchanged and line endings are preserved. The result must parse to the
    original data plus that one key, or the file is reported as `unrecognised` and left alone (the run exits
    non-zero). A block with no `supports` object is also `unrecognised`. A file with uncommitted changes
    (git status --porcelain) is refused and listed, even when the only difference is line-ending noise.

    python migrate-motion-support.py --survey [--json] | --fix [--apply] | --check | --self-test
"""
import argparse
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
BLOCKS_DIR = os.path.join(PLUGIN, 'src', 'blocks')
DB_PATH = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
DB_QUERY = "SELECT DISTINCT block_slug FROM block_attributes WHERE attr_name = 'sgsAnimation'"
CORE_PREFIX = 'core/'

# Blocks the spec names for state or nav motion. Spec 38A section 5.2 (the open and state triggers), FR-38A-51
# (nav drawer and submenu motion: nav-bar-menu, nav-drawer, nav-drawer-menu, mega-panel) and FR-38A-53 (state-change
# motion: cart, nav-bar-menu, accordion; form and choice-flow, plan unit M5.17). Each is verified against the tree,
# never trusted.
SPEC_NAMED = (
    'sgs/nav-bar-menu',
    'sgs/nav-drawer',
    'sgs/nav-drawer-menu',
    'sgs/mega-panel',
    'sgs/cart',
    'sgs/accordion',
    'sgs/form',
    'sgs/choice-flow',
)


def slug_dir(slug):
    return slug.split('/', 1)[1]


def block_json_path(blocks_dir, slug):
    return os.path.join(blocks_dir, slug_dir(slug), 'block.json')


def db_slugs():
    con = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    try:
        return sorted(r[0] for r in con.execute(DB_QUERY))
    finally:
        con.close()


def read_text(path):
    with open(path, 'r', encoding='utf-8', newline='') as fh:
        return fh.read()


def skip_ws(text, i):
    while i < len(text) and text[i] in ' \t\r\n':
        i += 1
    return i


def skip_string(text, i):
    i += 1
    while text[i] != '"':
        i += 2 if text[i] == '\\' else 1
    return i + 1


def skip_value(text, i):
    """Index just past the JSON value starting at `i`."""
    if text[i] == '"':
        return skip_string(text, i)
    if text[i] in '{[':
        depth = 0
        while True:
            ch = text[i]
            if ch == '"':
                i = skip_string(text, i)
                continue
            if ch in '{[':
                depth += 1
            elif ch in '}]':
                depth -= 1
                if depth == 0:
                    return i + 1
            i += 1
    while i < len(text) and text[i] not in ',}] \t\r\n':
        i += 1
    return i


def member_value_start(text, obj_start, key):
    """Index of the value of member `key` in the object whose `{` is at `obj_start`, or None."""
    i = skip_ws(text, obj_start + 1)
    while i < len(text) and text[i] != '}':
        key_end = skip_string(text, i)
        name = json.loads(text[i:key_end])
        colon = skip_ws(text, key_end)
        value = skip_ws(text, colon + 1)
        if name == key:
            return value
        i = skip_ws(text, skip_value(text, value))
        if text[i] == ',':
            i = skip_ws(text, i + 1)
    return None


def insert_first_member(text, obj_start, member, eol):
    """Insert `member` as the first member of the object at `obj_start`, in the object's own layout."""
    first = skip_ws(text, obj_start + 1)
    if text[first] == '}':
        return text[:obj_start] + '{ ' + member + ' }' + text[first + 1:]
    if '\n' in text[obj_start + 1:first]:
        line_start = text.rfind('\n', 0, first) + 1
        indent = text[line_start:first]
        return text[:obj_start + 1] + eol + indent + member + ',' + text[obj_start + 1:]
    return text[:obj_start + 1] + ' ' + member + ',' + text[obj_start + 1:]


def with_motion(data):
    supports = data.get('supports')
    if not isinstance(supports, dict):
        supports = {}
        data['supports'] = supports
    sgs = supports.get('sgs')
    if not isinstance(sgs, dict):
        sgs = {}
        supports['sgs'] = sgs
    sgs['motion'] = True
    return data


def insert_motion(text):
    """The file text with `"motion": true` added under supports.sgs, or None when it cannot be done safely.

    Only the one member is inserted, in the layout of the object it joins, so every other byte is unchanged. The
    result must parse to exactly the original data plus that key, or None is returned.
    """
    eol = '\r\n' if '\r\n' in text else '\n'
    try:
        original = json.loads(text)
    except ValueError:
        return None
    start = skip_ws(text, 0)
    if text[start] != '{':
        return None
    supports = member_value_start(text, start, 'supports')
    if supports is None or text[supports] != '{':
        return None
    sgs = member_value_start(text, supports, 'sgs')
    if sgs is None:
        out = insert_first_member(text, supports, '"sgs": { "motion": true }', eol)
    elif text[sgs] == '{':
        out = insert_first_member(text, sgs, '"motion": true', eol)
    else:
        return None
    try:
        got = json.loads(out)
    except ValueError:
        return None
    return out if got == with_motion(original) else None


def has_motion(data):
    return bool(((data.get('supports') or {}).get('sgs') or {}).get('motion')) if isinstance(data, dict) else False


def hides_animation(data):
    hidden = (((data.get('supports') or {}).get('sgs') or {}).get('hideExtensions'))
    return isinstance(hidden, list) and 'animation' in hidden


def is_dirty(path):
    out = subprocess.run(['git', 'status', '--porcelain', '--', path], cwd=PLUGIN, capture_output=True, text=True)
    return bool(out.stdout.strip())


def classify(blocks_dir, candidates):
    """Split the candidate slugs and the whole tree into the survey categories."""
    census = {'compatible': [], 'excluded_hidden': [], 'missing_from_tree': [], 'unrecognised': [],
              'stray_support': [], 'tree_blocks': 0}
    compatible = set()
    for slug in sorted(candidates):
        if slug.startswith(CORE_PREFIX):
            continue
        path = block_json_path(blocks_dir, slug)
        if not os.path.isfile(path):
            census['missing_from_tree'].append(slug)
            continue
        try:
            data = json.loads(read_text(path))
        except ValueError:
            census['unrecognised'].append(slug)
            continue
        if hides_animation(data) and slug not in SPEC_NAMED:
            census['excluded_hidden'].append(slug)
            continue
        compatible.add(slug)
    census['compatible'] = sorted(compatible)
    for entry in sorted(os.listdir(blocks_dir)):
        path = os.path.join(blocks_dir, entry, 'block.json')
        if not os.path.isfile(path):
            continue
        census['tree_blocks'] += 1
        slug = 'sgs/' + entry
        try:
            data = json.loads(read_text(path))
        except ValueError:
            continue
        if has_motion(data) and slug not in compatible:
            census['stray_support'].append(slug)
    return census


def pending(blocks_dir, census):
    """Compatible blocks whose block.json lacks the key."""
    return [s for s in census['compatible'] if not has_motion(json.loads(read_text(block_json_path(blocks_dir, s))))]


def candidates_from_db():
    return set(db_slugs()) | set(SPEC_NAMED)


def survey(blocks_dir, candidates, as_json):
    census = classify(blocks_dir, candidates)
    census['todo'] = pending(blocks_dir, census)
    census['db_count'] = len(set(db_slugs()))
    census['spec_named_not_in_db'] = sorted(s for s in SPEC_NAMED if s not in set(db_slugs()))
    if as_json:
        print(json.dumps(census, indent=2))
        return census
    print(f"tree blocks with a block.json: {census['tree_blocks']}")
    print(f"candidates: {len(candidates)} (DB sgsAnimation rows {census['db_count']}, spec-named blocks not in the DB {len(census['spec_named_not_in_db'])})")
    print(f"compatible: {len(census['compatible'])}")
    print(f"  already declare the key: {len(census['compatible']) - len(census['todo'])}")
    print(f"  need the key: {len(census['todo'])}")
    for label in ('excluded_hidden', 'missing_from_tree', 'unrecognised', 'stray_support'):
        print(f"{label}: {len(census[label])}" + (' ' + ', '.join(census[label]) if census[label] else ''))
    return census


def fix(blocks_dir, candidates, apply, git_guard):
    census = classify(blocks_dir, candidates)
    refused, unrecognised, changed = [], list(census['unrecognised']), []
    for slug in pending(blocks_dir, census):
        path = block_json_path(blocks_dir, slug)
        if git_guard and is_dirty(path):
            refused.append(slug)
            continue
        new_text = insert_motion(read_text(path))
        if new_text is None:
            unrecognised.append(slug)
            continue
        changed.append(slug)
        if apply:
            tmp = path + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new_text)
            os.replace(tmp, path)
    print(('wrote' if apply else 'would write') + f' {len(changed)} block.json file(s)')
    if refused:
        print(f'REFUSED (uncommitted changes, commit or discard first): {", ".join(refused)}')
    if unrecognised:
        print(f'UNRECOGNISED (does not parse or has no supports object): {", ".join(sorted(set(unrecognised)))}')
    return 1 if (refused or unrecognised) else 0


def check(blocks_dir, candidates):
    census = classify(blocks_dir, candidates)
    todo = pending(blocks_dir, census)
    problems = []
    if todo:
        problems.append(f'compatible blocks missing supports.sgs.motion: {", ".join(todo)}')
    if census['stray_support']:
        problems.append(f'blocks declaring supports.sgs.motion that are not compatible: {", ".join(census["stray_support"])}')
    if census['unrecognised']:
        problems.append(f'block.json that does not parse: {", ".join(census["unrecognised"])}')
    if not census['compatible']:
        problems.append('the compatible set is empty')
    for line in problems:
        print('FAIL ' + line)
    if not problems:
        print(f"OK {len(census['compatible'])} compatible blocks declare supports.sgs.motion; no other block does.")
    return 1 if problems else 0


def write_raw(blocks_dir, name, text):
    folder = os.path.join(blocks_dir, name)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'block.json'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)


def self_test():
    failures = []

    def expect(label, got, want):
        if got != want:
            failures.append(f'{label}: got {got!r}, wanted {want!r}')

    root = tempfile.mkdtemp(prefix='motion-support-selftest-')
    try:
        blocks = os.path.join(root, 'blocks')
        os.makedirs(blocks)
        write_raw(blocks, 'alpha', '{\n\t"name": "sgs/alpha",\n\t"supports": {\n\t\t"html": false,\n\t\t"sgs": {\n\t\t\t"enabledExtensions": [ "childSizing" ]\n\t\t}\n\t}\n}\n')
        write_raw(blocks, 'beta', '{\r\n\t"name": "sgs/beta",\r\n\t"supports": {\r\n\t\t"sgs": {\r\n\t\t\t"hideExtensions": [ "animation" ]\r\n\t\t}\r\n\t}\r\n}\r\n')
        write_raw(blocks, 'gamma', '{\r\n\t"name": "sgs/gamma",\r\n\t"supports": { "html": false, "sgs": { "x": [ "a", "b" ] } }\r\n}\r\n')
        write_raw(blocks, 'delta', '{\n\t"name": "sgs/delta",\n\t"supports": {\n\t\t"html": false\n\t}\n}\n')
        write_raw(blocks, 'epsilon', '{ "name": "sgs/epsilon", "supports": { "sgs": {} } }')
        write_raw(blocks, 'nosupports', '{\n\t"name": "sgs/nosupports"\n}\n')
        cands = {'sgs/alpha', 'sgs/beta', 'sgs/gamma', 'sgs/delta', 'sgs/epsilon', 'sgs/ghost', 'core/group'}
        census = classify(blocks, cands)
        expect('compatible set', census['compatible'], ['sgs/alpha', 'sgs/delta', 'sgs/epsilon', 'sgs/gamma'])
        expect('hidden excluded', census['excluded_hidden'], ['sgs/beta'])
        expect('missing from tree', census['missing_from_tree'], ['sgs/ghost'])
        expect('planted compatible blocks missing the key fail the check', check(blocks, cands), 1)
        expect('fix dry run changes nothing', (fix(blocks, cands, False, False), check(blocks, cands)), (0, 1))
        expect('fix apply', fix(blocks, cands, True, False), 0)
        expect('clean tree passes the check', check(blocks, cands), 0)
        expect('fix is idempotent', fix(blocks, cands, True, False), 0)
        expect('multi-line sgs layout kept', read_text(block_json_path(blocks, 'sgs/alpha')),
               '{\n\t"name": "sgs/alpha",\n\t"supports": {\n\t\t"html": false,\n\t\t"sgs": {\n\t\t\t"motion": true,\n\t\t\t"enabledExtensions": [ "childSizing" ]\n\t\t}\n\t}\n}\n')
        expect('inline sgs layout and CRLF kept', read_text(block_json_path(blocks, 'sgs/gamma')),
               '{\r\n\t"name": "sgs/gamma",\r\n\t"supports": { "html": false, "sgs": { "motion": true, "x": [ "a", "b" ] } }\r\n}\r\n')
        expect('sgs created in a multi-line supports', read_text(block_json_path(blocks, 'sgs/delta')),
               '{\n\t"name": "sgs/delta",\n\t"supports": {\n\t\t"sgs": { "motion": true },\n\t\t"html": false\n\t}\n}\n')
        expect('empty sgs object', read_text(block_json_path(blocks, 'sgs/epsilon')),
               '{ "name": "sgs/epsilon", "supports": { "sgs": { "motion": true } } }')
        expect('a block with no supports object is unrecognised', fix(blocks, {'sgs/nosupports'}, True, False), 1)
        # Negative control: a key planted on an excluded block fails the check.
        beta_path = block_json_path(blocks, 'sgs/beta')
        write_raw(blocks, 'beta', read_text(beta_path).replace('"hideExtensions"', '"motion": true, "hideExtensions"'))
        expect('planted key on an excluded block fails the check', check(blocks, cands), 1)
    finally:
        shutil.rmtree(root, ignore_errors=True)
    for line in failures:
        print('SELF-TEST FAIL ' + line)
    print('self-test ' + ('FAILED' if failures else 'passed'))
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--survey', action='store_true')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--fix', action='store_true')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    candidates = candidates_from_db()
    if args.survey:
        survey(BLOCKS_DIR, candidates, args.json)
        return 0
    if args.fix:
        return fix(BLOCKS_DIR, candidates, args.apply, True)
    if args.check:
        return check(BLOCKS_DIR, candidates)
    parser.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
