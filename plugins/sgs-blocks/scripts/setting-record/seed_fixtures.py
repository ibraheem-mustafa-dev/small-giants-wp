"""Give every block a fixture in fixtures.json from the curated source that exists, never by hand per block.

The source, curated against each block's render.php: plugins/sgs-blocks/tests/fixtures/motion/render-paths.json, the
stand-ins the offline runner needs to reach a block's part-bearing branch (a product, a post, site options, saved child
markup...), read for the same runner by scripts/check-motion-part-render-paths.py::php_render. Taken from the block's
rendered paths, as inline `harness` stand-ins (render.py::INLINE_STANDINS), with its `base` attributes. The entries that
exist were first seeded from calibration's fixtures as well (their `notes` say so); calibration is retired, so a new
block's entry starts from its render paths alone (entry_for still takes a second source's entries, `cal`, first).

Rules, in order, for a block that has no entry yet (an existing entry is never changed):
  - calibration's keys the check reads (CONSUMED) are copied; calibration-only keys are named in `notes`;
  - the render paths' stand-ins join `harness`, each from the first rendered path that has it; `innerBlocks` becomes
    `inner` and `content` becomes `content` only when calibration gives no children;
  - a placeholder the entry names gets the stand-in file that holds it (PLACEHOLDER_FILES), unless the entry already
    carries that stand-in inline.

Usage:
  python seed_fixtures.py            write the missing entries into fixtures.json
  python seed_fixtures.py --check    exit 1 unless every block has an entry and every harness file exists
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
FIXTURES = HERE / 'fixtures.json'
RENDER_PATHS = PLUGIN / 'tests' / 'fixtures' / 'motion' / 'render-paths.json'

CONSUMED = ('attributes', 'variants', 'preconditions', 'familyPreconditions', 'paintStates', 'inner', 'parents')
STANDIN_KEYS = ('product', 'manifest', 'queried', 'post', 'context', 'attachments', 'globalSettings', 'taxonomies',
                'postContent', 'options', 'stubWoocommerce')
# placeholder -> (harness file key, the inline stand-in that replaces the file, the file)
PLACEHOLDER_FILES = {
    '{{image}}': ('attachmentsFile', 'attachments', 'fixtures/attachments.json'),
    '{{image.url}}': ('attachmentsFile', 'attachments', 'fixtures/attachments.json'),
    '{{product}}': ('productFile', 'product', 'fixtures/product.json'),
    '{{menu}}': ('postFile', 'post', 'fixtures/menu-post.json'),
    '{{mega}}': ('postFile', 'post', 'fixtures/menu-post.json'),
    '{{post2}}': ('postFile', 'post', 'fixtures/menu-post.json'),
}


def roster(plugin: Path = PLUGIN) -> list[str]:
    """Every block's name, from its block.json (no generated list)."""
    out = []
    for bj in sorted((plugin / 'src' / 'blocks').glob('*/block.json')):
        out.append(json.loads(bj.read_text(encoding='utf-8'))['name'])
    return out


def entry_for(name: str, cal: dict, paths: dict) -> dict:
    """The fixture entry for one block from its calibration fixture and its render paths."""
    c = cal.get(name) or {}
    rp = paths.get(name.split('/', 1)[1]) or {}
    rendered = [p for p in (rp.get('paths') or {}).values() if 'unrendered' not in p]
    out = {k: c[k] for k in CONSUMED if k in c}
    base = {**(rp.get('base') or {}), **((rendered[0].get('attrs') or {}) if rendered and not c else {})}
    out['attributes'] = {**base, **(c.get('attributes') or {})}
    harness = {}
    for key in STANDIN_KEYS:
        for p in rendered:
            if key in p:
                harness[key] = p[key]
                break
    if not out.get('inner'):
        for p in rendered:
            if p.get('innerBlocks'):
                out['inner'] = [{'name': r['name'], 'attributes': r.get('attributes') or {}} for r in p['innerBlocks']]
                break
        else:
            for p in rendered:
                if p.get('content'):
                    out['content'] = p['content']
                    break
    text = json.dumps(out)
    for ph, (file_key, inline_key, file) in PLACEHOLDER_FILES.items():
        if ph in text and inline_key not in harness:
            harness[file_key] = file
    if harness:
        out['harness'] = harness
    notes = [f'Seeded by seed_fixtures.py from {"calibration-fixtures.json" if c else "no calibration fixture"}'
             f'{" and render-paths.json" if rendered else ""}.']
    extra = sorted(k for k in c if k not in CONSUMED)
    if extra:
        notes.append('Calibration-only keys not carried (they set up a live site): ' + ', '.join(extra) + '.')
    out['notes'] = ' '.join(notes)
    return out


def problems(fixtures: dict, names: list[str], fixtures_dir: Path = HERE) -> list[str]:
    """Every block without an entry, and every harness file that does not exist."""
    out = [f'{n}: no fixture entry' for n in names if n not in fixtures]
    for n, e in fixtures.items():
        if n.startswith('_'):
            continue
        for k, f in ((e.get('harness') or {}).items()):
            if k.endswith('File') and f and not (Path(f) if Path(f).is_absolute() else fixtures_dir / f).is_file():
                out.append(f'{n}: harness {k} {f} does not exist')
        unknown = re.findall(r'\{\{[a-zA-Z0-9_.:-]+\}\}', json.dumps(e))
        from render import PLACEHOLDERS  # noqa: PLC0415 - the renderer's own table
        for ph in sorted(set(unknown) - set(PLACEHOLDERS)):
            out.append(f'{n}: placeholder {ph} has no stand-in value (render.py::PLACEHOLDERS)')
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args(argv)
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))
    names = roster()
    if not args.check:
        paths = json.loads(RENDER_PATHS.read_text(encoding='utf-8')).get('blocks') or {}
        added = [n for n in names if n not in fixtures]
        for n in added:
            fixtures[n] = entry_for(n, {}, paths)
        FIXTURES.write_text(json.dumps(fixtures, indent='\t', ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
        print(f'{len(added)} entries added; {len(fixtures) - 1} blocks have a fixture')
    found = problems(fixtures, names)
    for p in found:
        print(p)
    return 1 if args.check and any('no fixture entry' in p or 'does not exist' in p for p in found) else 0


if __name__ == '__main__':
    sys.exit(main())
