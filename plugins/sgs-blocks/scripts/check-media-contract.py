#!/usr/bin/env python3
"""Spec 49 media contract gate (AC-2 and AC-18), active from cutover.

Silent (exit 0) while no block's `supports.sgs.mediaElements` entry declares `kinds`,
the adoption marker (Spec 49 section 8.3). Once one does, it enforces:

  AC-2   For each adopting block: no flat `...Tablet` / `...Mobile` media attribute
         (FR-49-2), one focal shape, an object `{x,y}` (FR-49-4), and no per-device
         alt attribute (FR-49-3).
  AC-18  Raw `<MediaUpload` appears only in `MediaSlotField.js` and the files in
         `scripts/data/media-picker-exemptions.json`; the core focal picker and the old
         focal field appear nowhere but `FocalField.js` (FR-49-26).

    python scripts/check-media-contract.py --check
    python scripts/check-media-contract.py --self-test

Run from plugins/sgs-blocks. Reads files only.
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
FIXTURE = os.path.join(PLUGIN, 'tests', 'fixtures', 'media', 'adopted-block.json')
EXEMPTIONS = os.path.join(HERE, 'data', 'media-picker-exemptions.json')

MEDIA_STEMS = ('imageId', 'imageUrl', 'mediaId', 'mediaUrl', 'videoId', 'videoUrl', 'posterId', 'posterUrl',
               'source', 'kind', 'objectFit', 'objectPosition', 'focal', 'overlay', 'ratio', 'fit', 'shape', 'alt')
DEVICE_SUFFIX = re.compile(r'(Tablet|Mobile)$')
FOCAL_NAME = re.compile(r'(focal|objectPosition)', re.I)
ALT_NAME = re.compile(r'(^|[a-z])(alt|Alt)([A-Z]|$)')
RAW_PICKER = re.compile(r'<\s*MediaUpload\b')
SECOND_FOCAL = re.compile(r'\bFocalPointPicker\b|\bFocalPositionField\b')
ALLOWED_PICKER_FILES = ('MediaSlotField.js',)
ALLOWED_FOCAL_FILES = ('FocalField.js',)


def adopted_entries(block: dict) -> list[dict]:
    entries = (block.get('supports', {}).get('sgs', {}) or {}).get('mediaElements') or []
    return [e for e in entries if isinstance(e, dict) and e.get('kinds')]


def stem_of(name: str, prefix: str) -> str:
    base = name[len(prefix):] if prefix and name.startswith(prefix) else name
    return base[:1].lower() + base[1:]


def contract_problems(block: dict, label: str) -> list[str]:
    out = []
    attrs = block.get('attributes') or {}
    for entry in adopted_entries(block):
        prefix = entry.get('prefix', '') or ''
        focal = []
        for name, spec in attrs.items():
            if name.startswith('_comment') or (prefix and not name.startswith(prefix)):
                continue
            stem = stem_of(name, prefix)
            has_device = DEVICE_SUFFIX.search(name)
            root = DEVICE_SUFFIX.sub('', stem)
            if has_device and any(root.lower().startswith(m.lower()) for m in MEDIA_STEMS):
                out.append(f'{label}: {name} is a flat device attribute (FR-49-2); use the responsive value object')
            if has_device and ALT_NAME.search(name):
                out.append(f'{label}: {name} is a per-device alt (FR-49-3); alt is per slot or inside a Source')
            if FOCAL_NAME.search(stem) and not has_device:
                focal.append(name)
                if (spec or {}).get('type') != 'object':
                    out.append(f'{label}: {name} is not an object {{x,y}} (FR-49-4)')
        if len(focal) > 1:
            out.append(f'{label}: more than one focal attribute {focal} (FR-49-4)')
    return out


def picker_problems(files: dict[str, str], exempt: set[str]) -> list[str]:
    out = []
    for path, text in sorted(files.items()):
        name = os.path.basename(path)
        if RAW_PICKER.search(text) and name not in ALLOWED_PICKER_FILES and path not in exempt:
            out.append(f'{path}: raw <MediaUpload>; use MediaSlotField or add to media-picker-exemptions.json (FR-49-26)')
        if SECOND_FOCAL.search(text) and name not in ALLOWED_FOCAL_FILES:
            out.append(f'{path}: a second focal shape; FocalField is the only one (FR-49-26)')
    return out


def load_blocks() -> list[tuple[str, dict]]:
    blocks = []
    for p in sorted(glob.glob(os.path.join(PLUGIN, 'src', 'blocks', '*', 'block.json'))):
        with open(p, encoding='utf-8') as fh:
            blocks.append((os.path.relpath(p, PLUGIN).replace('\\', '/'), json.load(fh)))
    return blocks


def load_sources() -> dict[str, str]:
    files = {}
    for p in glob.glob(os.path.join(PLUGIN, 'src', '**', '*.js'), recursive=True):
        with open(p, encoding='utf-8', errors='replace') as fh:
            files[os.path.relpath(p, PLUGIN).replace('\\', '/')] = fh.read()
    return files


def load_exemptions() -> set[str]:
    if not os.path.exists(EXEMPTIONS):
        return set()
    with open(EXEMPTIONS, encoding='utf-8') as fh:
        return {e['path'] for e in json.load(fh)['exempt']}


def check() -> int:
    blocks = load_blocks()
    adopters = [(p, b) for p, b in blocks if adopted_entries(b)]
    if not adopters:
        return 0  # active from cutover: no block declares kinds yet
    problems = []
    for p, b in adopters:
        problems += contract_problems(b, p)
    problems += picker_problems(load_sources(), load_exemptions())
    if problems:
        print(f'media-contract: FAIL ({len(problems)})')
        for m in problems:
            print('  ' + m)
        return 1
    print(f'media-contract: OK ({len(adopters)} adopting blocks)')
    return 0


def self_test() -> int:
    ok = True
    with open(FIXTURE, encoding='utf-8') as fh:
        adopted = json.load(fh)
    flat = contract_problems(adopted, 'fixture')
    if not any('flat device attribute' in m for m in flat):
        print('self-test FAIL: the adopted fixture with flat tiers was not flagged'); ok = False
    unadopted = json.loads(json.dumps(adopted))
    for e in unadopted['supports']['sgs']['mediaElements']:
        e.pop('kinds', None)
    if contract_problems(unadopted, 'fixture'):
        print('self-test FAIL: a block with no kinds was flagged'); ok = False
    two_focal = {'supports': {'sgs': {'mediaElements': [{'prefix': '', 'kinds': ['image']}]}},
                 'attributes': {'focal': {'type': 'object'}, 'objectPosition': {'type': 'string'}}}
    msgs = contract_problems(two_focal, 'two-focal')
    if not (any('more than one focal' in m for m in msgs) and any('not an object' in m for m in msgs)):
        print('self-test FAIL: a second focal shape was not flagged'); ok = False
    per_device_alt = {'supports': {'sgs': {'mediaElements': [{'prefix': 'hero', 'kinds': ['image']}]}},
                      'attributes': {'heroAltMobile': {'type': 'string'}}}
    if not any('per-device alt' in m for m in contract_problems(per_device_alt, 'alt')):
        print('self-test FAIL: a per-device alt was not flagged'); ok = False
    clean = {'supports': {'sgs': {'mediaElements': [{'prefix': '', 'kinds': ['image']}]}},
             'attributes': {'source': {'type': 'object'}, 'focal': {'type': 'object'}, 'fit': {'type': 'object'}}}
    if contract_problems(clean, 'clean'):
        print('self-test FAIL: a clean adopted block was flagged'); ok = False
    pickers = picker_problems({
        'src/blocks/x/edit.js': '<MediaUpload onSelect={f} />',
        'src/components/media/MediaSlotField.js': '<MediaUpload onSelect={f} />',
        'src/blocks/audio/edit.js': '<MediaUpload onSelect={f} />',
        'src/blocks/y/edit.js': "import { FocalPointPicker } from '@wordpress/components';",
        'src/components/media/FocalField.js': 'FocalPointPicker',
    }, {'src/blocks/audio/edit.js'})
    if len(pickers) != 2 or not any('x/edit.js' in m and 'MediaUpload' in m for m in pickers) \
            or not any('y/edit.js' in m and 'focal' in m for m in pickers):
        print(f'self-test FAIL: picker gate gave {pickers}'); ok = False
    print('media-contract self-test: ' + ('OK' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    if '--check' in sys.argv:
        sys.exit(check())
    print(__doc__)
    sys.exit(2)
