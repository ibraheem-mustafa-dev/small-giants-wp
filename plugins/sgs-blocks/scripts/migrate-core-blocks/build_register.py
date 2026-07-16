#!/usr/bin/env python3
"""Track C register builder — read-only survey of replaceable core blocks.

GROUND-TRUTH sources (R-31-1, DB-first):
  * pairing map  = `blocks.replaces` in sgs-framework.db (never hardcoded)
  * target attrs = each SGS block's block.json `attributes`
  * instances    = parsed block trees of theme/sgs-theme/{parts,patterns,templates}

Emits `.claude/scratch/track-c-register.md` + `.json`:
  per-pairing instance lists (file, line, depth, attrs), safe vs Track-A
  hands-off zone split, preset fontSize flags, and a gap register of every
  observed core attr with no declared same-name/known-mapped equivalent on
  the target SGS block.

Usage: python build_register.py [--db <path>]
"""

import fnmatch
import json
import pathlib
import sqlite3
import sys
from collections import defaultdict

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from block_parser import parse_blocks, walk, BlockParseError  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parents[4]
THEME = REPO / 'theme' / 'sgs-theme'
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
SCRATCH = REPO / '.claude' / 'scratch'
DEFAULT_DB = pathlib.Path.home() / '.claude' / 'skills' / 'sgs-wp-engine' / 'sgs-framework.db'

# Track A hands-off list (Track C prompt, 2026-07-15). Instances in these
# files are register-only — never edited by this track.
HANDS_OFF = [
    'parts/header.html', 'parts/footer.html',
    '*framework-header-default.php', '*framework-footer-default.php',
    '*header-search-*.php', '*footer-*.php', '*mega-menu-*.html',
]

# Attrs WP accepts on any block via supports/global machinery. On CORE
# blocks these are the styling surface the transformer must map — they are
# listed per-pairing in the register, but they are not "undeclared attr"
# gaps in themselves (each pairing's transformer design resolves them).
CORE_SUPPORTS_SURFACE = {
    'align', 'textAlign', 'className', 'style', 'backgroundColor', 'textColor',
    'gradient', 'fontSize', 'fontFamily', 'borderColor', 'lock', 'metadata',
    'anchor', 'layout',
}

# Known cross-naming equivalences (the textColor/textColour class). Used
# ONLY to annotate the register; transformers implement the real mapping.
KNOWN_EQUIV = {
    'textColor': 'textColour',
    'backgroundColor': 'backgroundColour',
    'content': 'text|content',
}


def load_replaces_map(db_path):
    """Same source-of-truth contract as driver.load_replaces_map — see there.

    `scripts/data/block-replacements.json` is canonical (D270); blocks.replaces
    is a derived cache populated from it by /sgs-update. Read the JSON, warn on
    cache drift. (A concurrent /sgs-update emptied the cache mid-session on
    2026-07-15; a register built off it would have silently reported zero work.)
    """
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from driver import load_replaces_map as canonical  # noqa: PLC0415 — one contract, one impl
    return canonical(db_path)


def load_target_schemas():
    out = {}
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        if 'name' in d:
            out[d['name']] = set(d.get('attributes', {}).keys())
    return out


def zone_of(rel):
    fn = rel.split('/')[-1]
    for pat in HANDS_OFF:
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(fn, pat.split('/')[-1]):
            return 'hands-off'
    return 'safe'


def scan(core_to_sgs):
    instances, parse_errors = [], []
    files_scanned = 0
    for sub in ('parts', 'patterns', 'templates'):
        d = THEME / sub
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if path.suffix not in ('.php', '.html') or not path.is_file():
                continue
            rel = f'{sub}/{path.name}'
            text = path.read_text(encoding='utf-8', errors='replace')
            files_scanned += 1
            try:
                roots = parse_blocks(text, rel)
            except BlockParseError as e:
                parse_errors.append(str(e))
                continue
            for node in walk(roots):
                if node.name not in core_to_sgs:
                    continue
                line = text[: node.start].count('\n') + 1
                attrs = node.attrs if node.attrs is not None else {}
                instances.append({
                    'file': rel,
                    'zone': zone_of(rel),
                    'line': line,
                    'depth': node.depth(),
                    'core': node.name,
                    'target': core_to_sgs[node.name],
                    'attrs': sorted(attrs.keys()),
                    'preset_font_size': isinstance(attrs.get('fontSize'), str),
                    'attrs_json_error': node.attrs is None,
                })
    return instances, parse_errors, files_scanned


def gap_analysis(instances, schemas):
    """Per pairing: bucket every observed attr key."""
    by_pairing = defaultdict(lambda: defaultdict(int))
    for inst in instances:
        for k in inst['attrs']:
            by_pairing[(inst['core'], inst['target'])][k] += 1
    out = []
    for (core, target), keys in sorted(by_pairing.items()):
        declared = schemas.get(target, set())
        rows = []
        for k, n in sorted(keys.items(), key=lambda kv: -kv[1]):
            if k in declared:
                bucket = 'declared-same-name'
            elif k in KNOWN_EQUIV and KNOWN_EQUIV[k].split('|')[0] in declared:
                bucket = f'known-mapping -> {KNOWN_EQUIV[k]}'
            elif k in CORE_SUPPORTS_SURFACE:
                bucket = 'core-supports-surface (transformer design maps it)'
            else:
                bucket = 'NO-EQUIVALENT — gap candidate / design call'
            rows.append({'attr': k, 'count': n, 'bucket': bucket})
        out.append({'core': core, 'target': target, 'attrs': rows})
    return out


def main():
    db = DEFAULT_DB
    if '--db' in sys.argv:
        db = pathlib.Path(sys.argv[sys.argv.index('--db') + 1])
    if not db.exists():
        raise SystemExit(f'DB not found: {db}')

    core_to_sgs = load_replaces_map(db)
    schemas = load_target_schemas()
    instances, parse_errors, files_scanned = scan(core_to_sgs)
    gaps = gap_analysis(instances, schemas)

    # ---- aggregates ----
    per_zone = defaultdict(int)
    per_pairing_zone = defaultdict(lambda: defaultdict(int))
    preset_blocked = defaultdict(int)
    files = defaultdict(set)
    for i in instances:
        per_zone[i['zone']] += 1
        per_pairing_zone[(i['core'], i['target'])][i['zone']] += 1
        files[i['zone']].add(i['file'])
        if i['preset_font_size']:
            preset_blocked[i['zone']] += 1

    SCRATCH.mkdir(parents=True, exist_ok=True)
    (SCRATCH / 'track-c-register.json').write_text(
        json.dumps({
            'generated': '2026-07-15',
            'db': str(db),
            'files_scanned': files_scanned,
            'parse_errors': parse_errors,
            'pairing_map': core_to_sgs,
            'instances': instances,
            'gap_analysis': gaps,
        }, indent=1, ensure_ascii=False),
        encoding='utf-8')

    lines = ['# Track C register — replaceable core blocks in theme files',
             f'Generated 2026-07-15 from `blocks.replaces` ({db.name}) + parsed block trees.',
             '',
             f'- Files scanned: {files_scanned}; parse errors: {len(parse_errors)}',
             f'- SAFE zone: **{per_zone["safe"]} instances / {len(files["safe"])} files**'
             f' ({preset_blocked["safe"]} preset-fontSize, blocked on supports.typography)',
             f'- HANDS-OFF (Track A): {per_zone["hands-off"]} instances / {len(files["hands-off"])} files'
             f' ({preset_blocked["hands-off"]} preset-fontSize) — register-only, follow-up after Track A lands.',
             '']
    if parse_errors:
        lines += ['## ⚠ Parse errors (must be resolved before transforming those files)', '']
        lines += [f'- {e}' for e in parse_errors] + ['']

    lines += ['## Pairings', '', '| core | target | safe | hands-off |', '|---|---|---|---|']
    for (core, target), zones in sorted(per_pairing_zone.items(),
                                        key=lambda kv: -(kv[1]['safe'] + kv[1]['hands-off'])):
        lines.append(f'| {core} | {target} | {zones["safe"]} | {zones["hands-off"]} |')

    lines += ['', '## Attr inventory + gap buckets (per pairing)', '']
    for g in gaps:
        lines.append(f'### {g["core"]} → {g["target"]}')
        lines.append('| attr | uses | bucket |')
        lines.append('|---|---|---|')
        for r in g['attrs']:
            lines.append(f'| {r["attr"]} | {r["count"]} | {r["bucket"]} |')
        lines.append('')

    lines += ['## Known design calls (seeded from planning)', '',
              '- **core/details → sgs/collapsible-text MISMATCH**: collapsible-text has no '
              'summary/title attr and no InnerBlocks; the FAQ pattern details are accordion-shaped. '
              'Options: retarget to sgs/accordion-item, or add capability. Design-gate before that pairing.',
              '- **sgs/info-box iconColour/iconBackgroundColour** (mega-menu-services.html ×3, '
              'hands-off zone): verdict B — genuine missing capability (FR-22-6 moved icons to '
              'InnerBlocks); REGISTER entry only for Track C.',
              '']
    (SCRATCH / 'track-c-register.md').write_text('\n'.join(lines), encoding='utf-8')

    print(f'[register] {per_zone["safe"]} safe / {per_zone["hands-off"]} hands-off '
          f'across {files_scanned} files; {len(parse_errors)} parse errors.')
    print(f'[register] wrote {SCRATCH / "track-c-register.md"} (+ .json)')
    for e in parse_errors:
        print(f'  PARSE ERROR: {e}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
