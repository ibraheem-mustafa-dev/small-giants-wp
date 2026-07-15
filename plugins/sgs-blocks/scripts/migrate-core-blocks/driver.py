#!/usr/bin/env python3
"""Track C migration driver — swaps core blocks for their SGS replacements.

One PAIRING per run (Bean's method: a reusable transformer per unique
pairing, never per instance). The driver owns everything a pairing module
must not be trusted to remember:

  * DB-first pairing map (`blocks.replaces`) — never a hardcoded list (R-31-1).
  * SAFE-zone scoping — Track A hands-off files are never touched.
  * The ANTI-SILENT-DISCARD GATE: WordPress drops any attr a block.json does
    not declare, silently (D338). Every attr the module emits is validated
    against the target block.json; every SOURCE attr must be accounted for
    (mapped / dropped-with-reason / gap) — an unaccounted attr is a loud
    failure, never a quiet loss.
  * Dry-run unified diffs by default; `--write` applies, then re-parses the
    file (round-trip guard) and NUL-checks it (a NUL byte poisons ripgrep).

Usage (from repo root):
  python plugins/sgs-blocks/scripts/migrate-core-blocks/driver.py \
      --pairing core/image [--write] [--file patterns/team-section.php ...]
"""

import argparse
import difflib
import fnmatch
import importlib
import json
import pathlib
import sqlite3
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from block_parser import parse_blocks, walk, BlockParseError  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402,F401 — re-exported for gate use

REPO = pathlib.Path(__file__).resolve().parents[4]
THEME = REPO / 'theme' / 'sgs-theme'
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
SCRATCH = REPO / '.claude' / 'scratch'
DEFAULT_DB = pathlib.Path.home() / '.claude' / 'skills' / 'sgs-wp-engine' / 'sgs-framework.db'

# Track A hands-off list (Track C prompt, 2026-07-15) — must match build_register.py.
HANDS_OFF = [
    'parts/header.html', 'parts/footer.html',
    '*framework-header-default.php', '*framework-footer-default.php',
    '*header-search-*.php', '*footer-*.php', '*mega-menu-*.html',
]

# Attr keys WP accepts on any block without a block.json declaration. `style`
# is included because SGS blocks consume style.* groups via skip-serialised
# native supports (border/spacing/color) — the module is responsible for only
# emitting style groups the target's `supports` actually declares.
NATIVE_OK = {'className', 'anchor', 'lock', 'metadata', 'style'}

# The three accounting verbs a module may use for a source attr.
ACCOUNTING_VERBS = {'mapped', 'dropped', 'gap'}


def zone_of(rel):
    fn = rel.split('/')[-1]
    for pat in HANDS_OFF:
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(fn, pat.split('/')[-1]):
            return 'hands-off'
    return 'safe'


def load_replaces_map(db_path):
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces != ''"
    ).fetchall()
    conn.close()
    out = {}
    for slug, replaces in rows:
        for core in [c.strip() for c in replaces.split(',') if c.strip()]:
            out[core] = slug
    if not out:
        raise SystemExit(f'blocks.replaces empty in {db_path} — wrong DB?')
    return out


def load_target_schema(target):
    bj = BLOCKS_DIR / target.split('/', 1)[1] / 'block.json'
    d = json.loads(bj.read_text(encoding='utf-8'))
    return set(d.get('attributes', {}).keys())


def gate_result(node, result, declared, rel):
    """The anti-silent-discard gate. Loud failure, never a quiet drop."""
    problems = []
    for key in result.attrs:
        if key not in declared and key not in NATIVE_OK:
            problems.append(
                f'emitted attr "{key}" is NOT declared by {result.target} — WP would '
                f'silently discard it (D338 class)')
    source_keys = set((node.attrs or {}).keys())
    accounted = set(result.accounting.keys())
    for missing in sorted(source_keys - accounted):
        problems.append(f'source attr "{missing}" has NO accounting entry (mapped/dropped/gap)')
    for extra in sorted(accounted - source_keys):
        problems.append(f'accounting names "{extra}" which is not a source attr')
    for key, (verb, detail) in result.accounting.items():
        if verb not in ACCOUNTING_VERBS:
            problems.append(f'accounting verb "{verb}" for "{key}" invalid')
        if verb in ('dropped', 'gap') and not detail:
            problems.append(f'"{key}" {verb} without a reason — reasons are mandatory')
    if problems:
        raise SystemExit(
            f'[gate] {rel} line-offset {node.start}: transform REJECTED:\n  - '
            + '\n  - '.join(problems))


def transform_file(path, rel, core_type, module, declared, write):
    text = path.read_text(encoding='utf-8')
    roots = parse_blocks(text, rel)
    nodes = [n for n in walk(roots) if n.name == core_type]
    if not nodes:
        return None
    log = []
    new_text = text
    # Replace back-to-front so earlier spans keep their offsets. Same-type
    # nesting would need innermost-first + re-parse; assert it away for now —
    # the pairings shipped so far (image/button/details) cannot self-nest.
    for a in nodes:
        for b in nodes:
            if a is not b and a.start <= b.start and b.end <= a.end:
                raise SystemExit(
                    f'{rel}: nested same-type {core_type} instances — this driver '
                    f'version must not run this pairing; extend with re-parse-per-swap first.')
    for node in sorted(nodes, key=lambda n: n.start, reverse=True):
        try:
            result = module.transform(node, text)
        except GapError as e:
            log.append({'line': text[: node.start].count('\n') + 1,
                        'action': 'REFUSED', 'reason': str(e)})
            continue
        gate_result(node, result, declared, rel)
        new_text = new_text[: node.start] + result.replacement + new_text[node.end:]
        log.append({'line': text[: node.start].count('\n') + 1,
                    'action': 'swapped', 'target': result.target,
                    'accounting': {k: f'{v[0]}: {v[1]}' for k, v in result.accounting.items()},
                    'notes': result.notes})
    if new_text == text:
        return {'rel': rel, 'changed': False, 'log': log}

    if write:
        path.write_text(new_text, encoding='utf-8')
        if b'\x00' in path.read_bytes():
            raise SystemExit(f'{rel}: NUL byte after write — investigate before continuing.')
        parse_blocks(path.read_text(encoding='utf-8'), rel)  # round-trip guard
    diff = ''.join(difflib.unified_diff(
        text.splitlines(keepends=True), new_text.splitlines(keepends=True),
        fromfile=f'a/{rel}', tofile=f'b/{rel}'))
    return {'rel': rel, 'changed': True, 'log': log, 'diff': diff}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pairing', required=True, help='core block type, e.g. core/image')
    ap.add_argument('--write', action='store_true', help='apply (default: dry-run diff)')
    ap.add_argument('--file', action='append', help='limit to specific rel paths')
    ap.add_argument('--db', default=str(DEFAULT_DB))
    args = ap.parse_args()

    replaces = load_replaces_map(pathlib.Path(args.db))
    if args.pairing not in replaces:
        raise SystemExit(f'{args.pairing} has no blocks.replaces target. Known: {sorted(replaces)}')
    target = replaces[args.pairing]
    declared = load_target_schema(target)

    module_name = 'pairings.' + args.pairing.split('/', 1)[1].replace('-', '_') + '_pairing'
    module = importlib.import_module(module_name)

    results = []
    for sub in ('parts', 'patterns', 'templates'):
        d = THEME / sub
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if path.suffix not in ('.php', '.html') or not path.is_file():
                continue
            rel = f'{sub}/{path.name}'
            if zone_of(rel) != 'safe':
                continue
            if args.file and rel not in args.file:
                continue
            try:
                r = transform_file(path, rel, args.pairing, module, declared, args.write)
            except BlockParseError as e:
                raise SystemExit(f'parse error, aborting: {e}')
            if r:
                results.append(r)

    changed = [r for r in results if r['changed']]
    mode = 'WROTE' if args.write else 'DRY-RUN'
    print(f'[{mode}] {args.pairing} -> {target}: {len(changed)} file(s) changed, '
          f'{sum(len(r["log"]) for r in results)} instance(s) processed.')
    for r in results:
        for entry in r['log']:
            print(f'  {r["rel"]}:{entry["line"]}  {entry["action"]}'
                  + (f' -> {entry.get("target", "")}' if entry['action'] == 'swapped' else f' ({entry.get("reason")})'))
    if not args.write:
        for r in changed:
            print('\n' + r['diff'])
    SCRATCH.mkdir(parents=True, exist_ok=True)
    log_path = SCRATCH / f'track-c-swap-log-{args.pairing.replace("/", "-")}.json'
    log_path.write_text(json.dumps(results, indent=1, default=str), encoding='utf-8')
    print(f'\n[log] {log_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
