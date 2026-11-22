"""Block source scanner: a block's parts and where each of its settings paints, read
from its source with nothing rendered (block.json, render.php and the PHP it reaches,
view.js and its imports, the block's stylesheets).

Usage:
  python scan.py --out <folder> <block-folder> [...]     writes <folder>/<block>.scan.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BLOCKS  # noqa: E402
from parts import PartsReader  # noqa: E402
from settings import SettingsReader  # noqa: E402
from rules import RulesReader  # noqa: E402


class Scan(PartsReader, SettingsReader, RulesReader):
    def __init__(self, folder: str, blocks_dir: Path = BLOCKS):
        self.folder = folder
        self.dir = blocks_dir / folder
        self.bj = json.loads((self.dir / 'block.json').read_text(encoding='utf-8'))
        self.slug = self.bj['name']
        self.short = self.slug.split('/', 1)[1]
        self.attrs = self.bj.get('attributes', {})
        self.attr_names = set(self.attrs)
        self.parts: dict = {}
        self.selector_refs = defaultdict(set)
        self.tags = set()
        self.flags = []
        self.flag_keys = set()
        self.settings = defaultdict(list)
        self.followed = []
        self.php_texts = []
        self.custom_props = defaultdict(set)
        self.switch_classes = defaultdict(set)
        self.data_attrs = defaultdict(set)
        self.cond_values = {}  # token -> {setting: [values the code compares it against]}
        self.block_literals = {}  # setting -> [values compared anywhere in the sources read]
        self.rewalk = []  # (helper, where, argument seed, inherited context, depth) read after the first pass
        self.walked = {}  # helper function -> the argument bindings it has been read with
        self.css_rules = []
        self.css_parts = defaultdict(list)
        self.declared_parts = {}
        self.js_files = []
        self.call_sites = defaultdict(list)  # function -> [(argument texts, caller label, position)]
        self.envs = {}
        self.hints = defaultdict(list)
        self.conflicts = []

    def run(self):
        self.declared()
        self.scan_php()
        self.scan_js()
        self.scan_css()
        self.finish_parts()
        self.finish_condition_values()
        self.settings_declared()
        self.settings_traced()
        self.apply_precedence()
        return self

    def to_json(self) -> dict:
        parts = {tok: {k: (sorted(v) if isinstance(v, set) else v) for k, v in r.items()} for tok, r in sorted(self.parts.items())}
        return {
            'block': self.slug, 'folder': self.folder,
            'parts': parts,
            'tags': sorted(self.tags),
            'settings': {a: v for a, v in sorted(self.settings.items())},
            'hints': {a: v for a, v in sorted(self.hints.items())},
            'conflicts': self.conflicts,
            'selectorRefs': {k: sorted(v) for k, v in sorted(self.selector_refs.items())},
            'unread': self.flags,
            'followed': self.followed,
            'jsFiles': self.js_files,
            'customProps': {k: sorted(v) for k, v in self.custom_props.items()},
            'switchClasses': {k: sorted(v) for k, v in self.switch_classes.items()},
            'dataAttrs': {k: sorted(v) for k, v in self.data_attrs.items()},
            'settingValues': {a: list(v) for a, v in sorted(self.block_literals.items()) if v},
            'conditionValues': {k: {a: list(vals) for a, vals in sorted(v.items())} for k, v in sorted(self.cond_values.items())},
        }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--out', required=True, type=Path, help='folder for <block>.scan.json')
    ap.add_argument('blocks', nargs='+', help='block folder names under src/blocks')
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    for folder in args.blocks:
        j = Scan(folder).run().to_json()
        (args.out / f'{folder}.scan.json').write_text(json.dumps(j, indent=1), encoding='utf-8')
        print(folder, 'parts', len(j['parts']), 'settings', len(j['settings']), 'unread', len(j['unread']), 'followed', len(j['followed']))


if __name__ == '__main__':
    main()
