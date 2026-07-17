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
REPLACEMENTS_JSON = (REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'data' / 'block-replacements.json')

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
# Universal SGS extension attrs injected onto EVERY block server-side
# (includes/extension-attributes.generated.php) — real, just not per-block
# declarations. Same allowlist the check-dead-pattern-attrs.py gate uses.
EXT_EXACT = {'sgsCustomCss'}
EXT_PREFIXES = ('sgsHideOn', 'sgsAnim')

# The three accounting verbs a module may use for a source attr.
ACCOUNTING_VERBS = {'mapped', 'dropped', 'gap'}


def zone_of(rel):
    fn = rel.split('/')[-1]
    for pat in HANDS_OFF:
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(fn, pat.split('/')[-1]):
            return 'hands-off'
    return 'safe'


def load_replaces_map(db_path):
    """Load the core->SGS pairing map from its SINGLE SOURCE OF TRUTH.

    `scripts/data/block-replacements.json` is the canonical, version-controlled
    record (D270) — its own header says so, and `blocks.replaces` in
    sgs-framework.db is a DERIVED COPY populated from it by /sgs-update.

    We read the JSON and CROSS-CHECK the DB copy, warning loudly on drift
    rather than trusting a cache. This is not a hardcoded dict (R-31-1): it is
    the authoritative data file. Proven necessary 2026-07-15 — a concurrent
    /sgs-update left blocks.replaces with 0 of its 22 rows, which would have
    silently halted (or worse, narrowed) a migration sweep.
    """
    data = json.loads(REPLACEMENTS_JSON.read_text(encoding='utf-8'))
    out = {}
    for slug, replaces in data.items():
        if slug.startswith('__'):
            continue  # __comment__ et al
        cores = replaces if isinstance(replaces, list) else str(replaces).split(',')
        for core in [str(c).strip() for c in cores if str(c).strip()]:
            out[core] = slug
    if not out:
        raise SystemExit(f'no pairings in {REPLACEMENTS_JSON} — refusing to run blind.')

    try:
        conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
        rows = conn.execute(
            "SELECT slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces != ''"
        ).fetchall()
        conn.close()
        db_map = {}
        for slug, replaces in rows:
            for core in [c.strip() for c in replaces.split(',') if c.strip()]:
                db_map[core] = slug
        if db_map != out:
            print(f'[warn] blocks.replaces (derived cache) disagrees with '
                  f'{REPLACEMENTS_JSON.name}: {len(db_map)} vs {len(out)} pairings. '
                  f'Using the JSON source of truth. Re-run /sgs-update to reconcile the DB.')
    except sqlite3.Error as e:
        print(f'[warn] could not cross-check blocks.replaces ({e}) — using the JSON source of truth.')
    return out


def load_target_schema(target):
    """Declared attrs + the ones WP INJECTS from the block's `supports`.

    block.json's static `attributes` object is NOT the whole schema: WP core's
    `wp_register_{colour,typography,…}_support()` add attrs to a block type at
    registration when the matching support is declared — which is why e.g.
    sgs/multi-button's render.php legitimately reads `$attributes['backgroundColor']`
    while block.json never lists it. Reading only the static object made the gate
    reject a correct emit and abort the whole run (found by the buttons pairing).
    Derived from supports rather than blanket-allowed, so emitting a colour attr
    at a block WITHOUT colour support is still caught as the silent-discard bug
    it would be.
    """
    bj = BLOCKS_DIR / target.split('/', 1)[1] / 'block.json'
    d = json.loads(bj.read_text(encoding='utf-8'))
    declared = set(d.get('attributes', {}).keys())

    supports = d.get('supports', {}) or {}
    colour = supports.get('color', supports.get('__experimentalColor'))
    typography = supports.get('typography', {}) or {}
    border = supports.get('__experimentalBorder', supports.get('border'))

    if isinstance(colour, dict):
        if colour.get('background'):
            declared.add('backgroundColor')
        if colour.get('text'):
            declared.add('textColor')
        if colour.get('gradients'):
            declared.add('gradient')
        if colour.get('link'):
            declared.add('linkColor')
    if typography.get('fontSize'):
        declared.add('fontSize')
    if typography.get('__experimentalFontFamily') or typography.get('fontFamily'):
        declared.add('fontFamily')
    if supports.get('align'):
        declared.add('align')
    # `style` is the shared bag for every skip-serialised support group.
    if colour or typography or border or supports.get('spacing') or supports.get('shadow'):
        declared.add('style')
    return declared


def gate_result(node, result, declared, rel):
    """The anti-silent-discard gate. Loud failure, never a quiet drop."""
    problems = []
    for key in result.attrs:
        legit = (key in declared or key in NATIVE_OK or key in EXT_EXACT
                 or key.startswith(EXT_PREFIXES))
        if not legit:
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


def _node_signature(node, text):
    """Content-derived identity, stable across re-parses (offsets are not).

    Used only to remember which nodes a module has already REFUSED, so the
    leaf-first loop doesn't retry them forever. Two byte-identical instances
    share a signature — harmless, since an identical node refuses identically.
    """
    span = node.inner_html_span()
    inner = text[span[0]:span[1]] if span else ''
    return (node.name, node.attrs_raw or '', inner)


def transform_text(current, rel, core_type, module, declared):
    """Run the leaf-first transform loop for ONE pairing over block-markup TEXT.

    Pure text-in / (new_text, log)-out — no file I/O. This is the reusable
    engine core, shared by `transform_file` (theme patterns/parts/templates) and
    the page-content front-end (`lint-page.py`, which lints a live page's
    post_content). Raises SystemExit on the anti-silent-discard gate or the
    terminating invariant, exactly as the file path does.
    """
    original = current
    log = []
    refused_sigs = set()

    # LEAF-FIRST + RE-PARSE PER SWAP (qc-council Rater A, 2026-07-16).
    #
    # The old single-parse back-to-front loop could not survive SAME-TYPE
    # NESTING (53 core/group nodes in the safe zone sit inside another
    # core/group), for two INDEPENDENT reasons:
    #   1. offsets: splicing an inner span changes the file length, so the
    #      outer node's `end` — captured in the original parse — then cuts at
    #      the wrong byte.
    #   2. worse, and invisible: `transform()` was handed the ORIGINAL text, so
    #      an outer node built its replacement from the STILL-CORE inner
    #      markup, silently discarding the inner swap. No sort order fixes
    #      this; only re-reading the current text after each swap does.
    # So: re-parse every iteration, convert one LEAF (a node with no
    # still-pending same-type descendant), and hand `transform()` the CURRENT
    # text. Terminates in <= N iterations: each swap turns one core_type node
    # into a different block, so the pending count strictly decreases.
    while True:
        nodes = [n for n in walk(parse_blocks(current, rel)) if n.name == core_type]
        pending = [n for n in nodes if _node_signature(n, current) not in refused_sigs]
        if not pending:
            break
        # A refused descendant must NOT block its ancestor — the ancestor can
        # still convert and carry the refused child through verbatim.
        leaves = [n for n in pending
                  if not any(m is not n and n.start <= m.start and m.end <= n.end
                             for m in pending)]
        if not leaves:
            raise SystemExit(f'{rel}: {len(pending)} pending {core_type} nodes but no leaf — '
                             f'containment cycle? refusing to loop.')
        node = leaves[0]
        line = current[: node.start].count('\n') + 1
        try:
            result = module.transform(node, current)
        except GapError as e:
            refused_sigs.add(_node_signature(node, current))
            log.append({'line': line, 'action': 'REFUSED', 'reason': str(e)})
            continue
        gate_result(node, result, declared, rel)
        current = current[: node.start] + result.replacement + current[node.end:]
        log.append({'line': line, 'action': 'swapped', 'target': result.target,
                    'accounting': {k: f'{v[0]}: {v[1]}' for k, v in result.accounting.items()},
                    'notes': result.notes})

    # TERMINATING INVARIANT (Rater A's Q5): the round-trip parse below proves
    # only that the file still PARSES — not that a conversion wasn't silently
    # reverted or duplicated (a stale-text bug can leave well-formed core
    # markup behind and sail through every existing gate). So assert directly:
    # every remaining core_type node must be one we deliberately refused.
    leftover = [n for n in walk(parse_blocks(current, rel)) if n.name == core_type]
    unaccounted = [n for n in leftover if _node_signature(n, current) not in refused_sigs]
    if unaccounted:
        raise SystemExit(
            f'{rel}: {len(unaccounted)} {core_type} node(s) survived conversion without being '
            f'refused (first at line {current[: unaccounted[0].start].count(chr(10)) + 1}) — '
            f'a swap was silently lost. Refusing to write.')

    return current, log


def transform_file(path, rel, core_type, module, declared, write):
    """File front-end for the shared `transform_text` engine (patterns/parts/templates)."""
    original = path.read_text(encoding='utf-8')
    if not [n for n in walk(parse_blocks(original, rel)) if n.name == core_type]:
        return None
    new_text, log = transform_text(original, rel, core_type, module, declared)
    if new_text == original:
        return {'rel': rel, 'changed': False, 'log': log}
    if write:
        path.write_text(new_text, encoding='utf-8')
        if b'\x00' in path.read_bytes():
            raise SystemExit(f'{rel}: NUL byte after write — investigate before continuing.')
        parse_blocks(path.read_text(encoding='utf-8'), rel)  # round-trip guard
    diff = ''.join(difflib.unified_diff(
        original.splitlines(keepends=True), new_text.splitlines(keepends=True),
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
