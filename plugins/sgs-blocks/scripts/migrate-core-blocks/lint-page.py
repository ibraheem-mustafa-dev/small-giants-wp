#!/usr/bin/env python3
"""Lint (and optionally fix) banned core blocks in a PAGE's block markup.

The counterpart to `driver.py`: the driver operates on theme FILES
(patterns/parts/templates); this operates on a page's `post_content` (block
markup text) — the thing agents produce when they build a page in the editor
and forget Bean's "no core blocks with an SGS replacement" rule.

It REUSES the driver's proven engine wholesale:
  * `load_replaces_map`  — the DB-first core->SGS pairing map (single source of
    truth: `scripts/data/block-replacements.json`).
  * `load_target_schema` — the declared+supports-injected attr set per target.
  * `transform_text`     — the leaf-first, re-parse-per-swap loop with the
    ANTI-SILENT-DISCARD gate (WP drops undeclared attrs silently, D338; this
    fails loud instead) and the terminating invariant (no swap silently lost).

It runs EVERY needed pairing over one markup blob (leaves first, structural
wrappers last, so a container wraps already-native children). Pure text in /
report + fixed-text out — it NEVER writes to WordPress. Applying the fix is a
separate, deliberate step through the blessed editor path (`wp.data.dispatch`),
after an agent has judged the diff safe (Bean's workflow, 2026-07-17).

Modes:
  --check          lint only: list banned core blocks, exit 1 if any found.
  (default)        dry-run: report + unified diff of the migration.
  --fix OUT        write the migrated markup to OUT (still no WP write).

Input:
  --input FILE     read markup from FILE ('-' = stdin).

Usage:
  # lint a page you dumped from REST/editor:
  python lint-page.py --input page-13.html --check
  # produce the migration diff:
  python lint-page.py --input page-13.html
  # emit the fixed markup for the editor-apply step:
  python lint-page.py --input page-13.html --fix page-13-migrated.html
"""

import argparse
import difflib
import importlib
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from block_parser import parse_blocks, walk, BlockParseError  # noqa: E402
from contract import GapError  # noqa: E402,F401
import driver  # noqa: E402 — reuse load_replaces_map / load_target_schema / transform_text

# Ordering rules (both matter):
#  * Independent leaves (paragraph/heading/image/…) first — safe any time.
#  * PARENT-CONSUMES-CHILD pairs run PARENT before CHILD: core/columns builds
#    its grid FROM its core/column children, and core/buttons builds from its
#    core/button children — so the child must still be core when the parent
#    runs (converting the child first leaves the parent with "no children to
#    build the grid", the columns-refusal seen on page 13). Standalone child
#    conversion follows, for the rare orphan.
#  * core/group wraps arbitrary children verbatim → runs LAST.
# Any core type present but not listed here is appended (still converted).
PAIRING_ORDER = [
    'core/paragraph', 'core/heading', 'core/image', 'core/audio',
    'core/video', 'core/quote', 'core/pullquote', 'core/icon',
    'core/buttons', 'core/button',
    'core/columns', 'core/column',
    'core/row', 'core/stack',
    'core/group',
]


def banned_in(text, rel, replaces):
    """Every banned core-block instance in the markup: [(name, line, target)]."""
    found = []
    for node in walk(parse_blocks(text, rel)):
        if node.name in replaces:
            line = text[: node.start].count('\n') + 1
            found.append((node.name, line, replaces[node.name]))
    return found


def module_for(core_type):
    name = 'pairings.' + core_type.split('/', 1)[1].replace('-', '_') + '_pairing'
    return importlib.import_module(name)


def migrate_markup(text, rel, replaces):
    """Run every needed pairing over the markup. Returns (new_text, log, skipped).

    `skipped` = banned core types present that have no pairing module built yet
    (surfaced loudly, never silently ignored)."""
    present = sorted({n.name for n in walk(parse_blocks(text, rel)) if n.name in replaces})
    order = [c for c in PAIRING_ORDER if c in present] + [c for c in present if c not in PAIRING_ORDER]
    current, log, skipped = text, [], []
    for core_type in order:
        try:
            module = module_for(core_type)
        except ModuleNotFoundError:
            skipped.append(core_type)
            continue
        declared = driver.load_target_schema(replaces[core_type])
        current, pairing_log = driver.transform_text(current, rel, core_type, module, declared)
        log.extend({**e, 'pairing': core_type} for e in pairing_log)
    return current, log, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--input', required=True, help="markup file, or '-' for stdin")
    ap.add_argument('--check', action='store_true', help='lint only; exit 1 if banned blocks found')
    ap.add_argument('--fix', metavar='OUT', help='write migrated markup to OUT (no WP write)')
    ap.add_argument('--rel', default='page', help='label used in diffs/errors (e.g. page-13)')
    ap.add_argument('--db', default=str(driver.DEFAULT_DB))
    args = ap.parse_args()

    text = sys.stdin.read() if args.input == '-' else pathlib.Path(args.input).read_text(encoding='utf-8')
    replaces = driver.load_replaces_map(pathlib.Path(args.db))

    try:
        banned = banned_in(text, args.rel, replaces)
    except BlockParseError as e:
        raise SystemExit(f'parse error: {e}')

    if not banned:
        print(f'[clean] {args.rel}: no banned core blocks.')
        return 0

    # Report (always).
    from collections import Counter
    counts = Counter(name for name, _, _ in banned)
    print(f'[lint] {args.rel}: {len(banned)} banned core-block instance(s), {len(counts)} type(s):')
    for name, n in counts.most_common():
        print(f'    {name} x{n}  ->  {replaces[name]}')

    if args.check:
        print(f'[check] FAIL — {len(banned)} banned instance(s). Run without --check to migrate.')
        return 1

    # Migrate.
    try:
        new_text, log, skipped = migrate_markup(text, args.rel, replaces)
    except BlockParseError as e:
        raise SystemExit(f'parse error during migration: {e}')

    swapped = [e for e in log if e['action'] == 'swapped']
    refused = [e for e in log if e['action'] == 'REFUSED']
    print(f'\n[migrate] {len(swapped)} swapped, {len(refused)} refused, {len(skipped)} type(s) with no pairing built.')
    for e in refused:
        print(f'    REFUSED {e["pairing"]} line {e["line"]}: {e.get("reason")}')
    if skipped:
        print(f'    NO PAIRING (built): {", ".join(skipped)} — these were NOT converted.')

    # Residual banned check (the loud guarantee).
    residual = banned_in(new_text, args.rel, replaces)
    residual = [b for b in residual if b[0] not in skipped]
    if residual:
        print(f'\n[warn] {len(residual)} banned instance(s) REMAIN after migration '
              f'(refused or un-paired): {Counter(n for n, _, _ in residual)}')

    diff = ''.join(difflib.unified_diff(
        text.splitlines(keepends=True), new_text.splitlines(keepends=True),
        fromfile=f'a/{args.rel}', tofile=f'b/{args.rel}'))
    if args.fix:
        pathlib.Path(args.fix).write_text(new_text, encoding='utf-8')
        print(f'\n[fix] migrated markup -> {args.fix} ({len(new_text)} bytes). '
              f'Apply via the editor (wp.blocks.parse -> replaceBlocks -> savePost) after an agent judges the diff.')
    else:
        print('\n' + (diff or '(no textual change)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
