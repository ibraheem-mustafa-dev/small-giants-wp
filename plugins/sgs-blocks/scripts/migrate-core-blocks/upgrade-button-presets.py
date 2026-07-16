#!/usr/bin/env python3
"""One-shot: upgrade already-emitted sgs/button instances to use PRESETS.

The core/button sweep (commit efaa296e) mapped every coloured button to
`inheritStyle:"custom"` + explicit colours. That renders correctly but BYPASSES
Bean's button-preset system (theme.json settings.custom.buttonPresets), so those
buttons miss the preset's designed padding / min-height / hover. This pass finds
every `sgs/button` whose background matches a solid preset and rewrites it to
`inheritStyle:"<preset>"` (dropping the now-redundant explicit colours). A button
with no matching preset (e.g. an accent background) is left as `custom` — its
exact colour is preserved.

Surgical + in-place (sgs/button is a void block and never self-nests, so simple
back-to-front span replacement is safe here — no re-parse loop needed). Safe zone
only. Dry-run by default; `--write` applies.

Run from the worktree root:
  python plugins/sgs-blocks/scripts/migrate-core-blocks/upgrade-button-presets.py [--write]
"""

import argparse
import fnmatch
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from block_parser import parse_blocks, walk, serialize_comment  # noqa: E402
from pairings.button_pairing import _match_button_preset  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parents[4]
THEME = REPO / 'theme' / 'sgs-theme'
HANDS_OFF = [
    'parts/header.html', 'parts/footer.html',
    '*framework-header-default.php', '*framework-footer-default.php',
    '*header-search-*.php', '*footer-*.php', '*mega-menu-*.html',
]


def safe(rel):
    fn = rel.split('/')[-1]
    return not any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(fn, p.split('/')[-1]) for p in HANDS_OFF)


def upgrade_attrs(attrs):
    """Return upgraded attrs + a note, or (None, None) if nothing to change."""
    if attrs.get('inheritStyle') != 'custom':
        return None, None
    bg = attrs.get('colourBackground')
    preset = _match_button_preset(bg, attrs.get('colourText'))
    if not preset:
        return None, None
    out = {k: v for k, v in attrs.items() if k not in ('colourBackground', 'colourText')}
    out['inheritStyle'] = preset
    return out, f'{bg} -> inheritStyle:"{preset}"'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()

    changed_files = 0
    changed_nodes = 0
    for sub in ('parts', 'patterns', 'templates'):
        d = THEME / sub
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if path.suffix not in ('.php', '.html') or not path.is_file():
                continue
            rel = f'{sub}/{path.name}'
            if not safe(rel):
                continue
            text = path.read_text(encoding='utf-8')
            nodes = [n for n in walk(parse_blocks(text, rel))
                     if n.name == 'sgs/button' and n.attrs]
            edits = []
            for n in nodes:
                new_attrs, note = upgrade_attrs(n.attrs)
                if new_attrs is not None:
                    edits.append((n, new_attrs, note))
            if not edits:
                continue
            new_text = text
            for n, new_attrs, note in sorted(edits, key=lambda e: e[0].start, reverse=True):
                repl = serialize_comment('sgs/button', new_attrs, void=True)
                new_text = new_text[:n.start] + repl + new_text[n.end:]
                line = text[:n.start].count('\n') + 1
                print(f'  {rel}:{line}  {note}')
                changed_nodes += 1
            if args.write:
                path.write_text(new_text, encoding='utf-8')
                parse_blocks(path.read_text(encoding='utf-8'), rel)  # round-trip guard
            changed_files += 1

    mode = 'WROTE' if args.write else 'DRY-RUN'
    print(f'[{mode}] {changed_nodes} sgs/button instance(s) upgraded to presets '
          f'across {changed_files} file(s).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
