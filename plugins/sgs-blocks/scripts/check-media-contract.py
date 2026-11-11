#!/usr/bin/env python3
"""Spec 49 media contract gate (AC-2 and AC-18), active from cutover.

Silent (exit 0) while no block's `supports.sgs.mediaElements` entry declares `kinds`,
the adoption marker (Spec 49 section 8.3). Once one does, it enforces:

  AC-2   For each adopting block: no flat `...Tablet` / `...Mobile` media attribute
         (FR-49-2), one focal shape, an object `{x,y}` (FR-49-4), and no per-device
         alt attribute (FR-49-3).
  G7     No entry declares `kinds` with `context: background` unless the renderer declares a
         background capability (`includes/media/background-capability.json`: its renderer function,
         element and overlay classes, stylesheet and kinds) that covers every kind the entry names.
  AC-18  Raw `<MediaUpload` appears only in `MediaSlotField.js` and the files in
         `scripts/data/media-picker-exemptions.json`; the core focal picker and the old
         focal field appear nowhere but `FocalField.js` (FR-49-26). While Stage B adopts wave
         by wave (some block `media-adoption.json` lists has not adopted), it reads only the
         adopted blocks' folders; once every listed block has adopted, all of `src/`.

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
ADOPTION_MAP = os.path.join(HERE, 'data', 'media-adoption.json')

EMIT_DIR = os.path.join(PLUGIN, 'src', 'components', 'media', 'emit')
LEGACY_REGISTRY = os.path.join(PLUGIN, 'src', 'components', 'MediaElementControls.js')
RENDERER_DIR = os.path.join(PLUGIN, 'includes', 'media')
BACKGROUND_CAPABILITY = os.path.join(RENDERER_DIR, 'background-capability.json')
WORD = re.compile(r'[A-Z][a-z0-9]*|[a-z0-9]+')
DEVICE_SUFFIX = re.compile(r'(Tablet|Mobile)$')
FOCAL_NAME = re.compile(r'(focal|objectPosition)', re.I)
ALT_NAME = re.compile(r'(^|[a-z])(alt|Alt)([A-Z]|$)')
RAW_PICKER = re.compile(r'<\s*MediaUpload\b')
SECOND_FOCAL = re.compile(r'\bFocalPointPicker\b|\bFocalPositionField\b')
ALLOWED_PICKER_FILES = ('MediaSlotField.js',)
ALLOWED_FOCAL_FILES = ('FocalField.js',)


def _read(path: str) -> str:
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def media_vocabulary() -> tuple[set[str], set[str], set[str]]:
    """(bases, lead words, last words) a flat device attribute of a media slot is recognised by.

    Bases are the adopted settings rows (`adopted-settings.js`, `kinds-settings.js`) and the legacy atom bases
    (`MEDIA_ATTR_TYPES` in `MediaElementControls.js`), lower-cased. Lead words are the first word of each legacy base
    (`image`, `video`, `thumbnail`, `svg`, `media`); last words are the last word of each adopted base (`ratio`,
    `height`, `source`). Nothing here is a hand-kept list: a new adopted row extends it.
    """
    rows = _read(os.path.join(EMIT_DIR, 'adopted-settings.js')) + _read(os.path.join(EMIT_DIR, 'kinds-settings.js'))
    adopted = set(re.findall(r"base:\s*'([A-Za-z]+)'", rows)) | set(re.findall(r"entry\(\s*'([A-Za-z]+)'", rows))
    registry = _read(LEGACY_REGISTRY)
    block = registry[registry.index('export const MEDIA_ATTR_TYPES'):]
    body = block[:block.index('};')]
    legacy = set(re.findall(r'^[ \t]+([A-Z][A-Za-z]*):', body, re.M))
    bases = {b.lower() for b in adopted | legacy}
    lead = {WORD.findall(b)[0].lower() for b in legacy}
    last = {WORD.findall(b)[-1].lower() for b in adopted}
    return bases, lead, last


def is_media_stem(root: str, vocab: tuple[set[str], set[str], set[str]]) -> bool:
    """Whether a stem (slot prefix and device suffix removed) names a media setting."""
    bases, lead, last = vocab
    if not root:
        return True  # the slot's own source: `photoTablet` for prefix `photo`
    words = WORD.findall(root[:1].upper() + root[1:])
    return root.lower() in bases or words[0].lower() in lead or words[-1].lower() in last


def adopted_entries(block: dict) -> list[dict]:
    entries = (block.get('supports', {}).get('sgs', {}) or {}).get('mediaElements') or []
    return [e for e in entries if isinstance(e, dict) and e.get('kinds')]


def stem_of(name: str, prefix: str) -> str:
    base = name[len(prefix):] if prefix and name.startswith(prefix) else name
    return base[:1].lower() + base[1:]


def contract_problems(block: dict, label: str) -> list[str]:
    out = []
    vocab = media_vocabulary()
    attrs = block.get('attributes') or {}
    for entry in adopted_entries(block):
        prefix = entry.get('prefix', '') or ''
        focal = []
        for name, spec in attrs.items():
            if name.startswith('_comment') or (prefix and not name.startswith(prefix)):
                continue
            stem = stem_of(name, prefix)
            has_device = DEVICE_SUFFIX.search(name)
            root = stem_of(DEVICE_SUFFIX.sub('', name), prefix)
            if has_device and is_media_stem(root, vocab):
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


def background_capability() -> dict | None:
    """The renderer's declared background capability, or None when the file is absent or unreadable."""
    try:
        data = json.loads(_read(BACKGROUND_CAPABILITY)).get('background')
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def capability_gaps(cap: dict | None, plugin: str = PLUGIN) -> list[str]:
    """What a declared capability lacks to be real: the renderer function in its file, both classes in the stylesheet."""
    if cap is None:
        return ['no capability declared']
    gaps = []
    renderer, source, sheet = cap.get('renderer'), cap.get('renderer_file'), cap.get('stylesheet')
    try:
        code = _read(os.path.join(plugin, str(source)))
    except (OSError, TypeError):
        code = ''
    if not renderer or not re.search(r'function\s+' + re.escape(str(renderer)) + r'\s*\(', code):
        gaps.append(f'{source} does not define {renderer}()')
    try:
        css = _read(os.path.join(plugin, str(sheet)))
    except (OSError, TypeError):
        css = ''
    for key in ('element_class', 'overlay_class'):
        if not cap.get(key) or '.' + str(cap[key]) not in css:
            gaps.append(f'{sheet} does not style .{cap.get(key)}')
    if not cap.get('kinds'):
        gaps.append('no kinds declared')
    return gaps


def background_problems(block: dict, label: str, capability: dict | None | bool = False, plugin: str = PLUGIN) -> list[str]:
    """An entry with `context: background` and `kinds` needs a declared capability that is real and covers its kinds."""
    cap = background_capability() if capability is False else capability
    gaps = capability_gaps(cap, plugin)
    out = []
    for e in adopted_entries(block):
        if e.get('context') != 'background':
            continue
        missing = [k for k in (e.get('kinds') or []) if k not in ((cap or {}).get('kinds') or [])]
        if gaps:
            out.append(f'{label}: the entry with prefix {e.get("prefix", "")!r} declares kinds on a background context, but the renderer has no usable background capability ({"; ".join(gaps)})')
        elif missing:
            out.append(f"{label}: the entry with prefix {e.get('prefix', '')!r} declares background kinds {missing} that the renderer's capability does not list")
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


def listed_blocks() -> set[str]:
    """Every block name `media-adoption.json` lists in any wave (empty when the file is missing)."""
    if not os.path.exists(ADOPTION_MAP):
        return set()
    with open(ADOPTION_MAP, encoding='utf-8') as fh:
        return {name for wave in json.load(fh).get('waves', []) for name in wave.get('blocks', {})}


def picker_scope(adopters: list[tuple[str, dict]], listed: set[str]) -> list[str] | None:
    """Folder prefixes AC-18 reads while adoption is partial; None (all of `src/`) once every listed block adopted."""
    adopted = {b.get('name') for _, b in adopters}
    if listed and not listed <= adopted:
        return sorted(os.path.dirname(p) + '/' for p, _ in adopters)
    return None


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
        problems += background_problems(b, p)
    sources = load_sources()
    scope = picker_scope(adopters, listed_blocks())
    if scope is not None:
        sources = {p: t for p, t in sources.items() if p.startswith(tuple(scope))}
    problems += picker_problems(sources, load_exemptions())
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
    for prefix, name in (('photo', 'photoTablet'), ('badge', 'badgeImageTablet'), ('', 'heightTablet'), ('', 'aspectRatioTablet'),
                         ('', 'mediaTypeTablet'), ('', 'videoAutoplayTablet'), ('', 'thumbnailTablet'),
                         ('background', 'backgroundImageTablet')):
        flat_block = {'supports': {'sgs': {'mediaElements': [{'prefix': prefix, 'kinds': ['image']}]}}, 'attributes': {name: {'type': 'string'}}}
        if not any('flat device attribute' in m for m in contract_problems(flat_block, name)):
            print(f'self-test FAIL: flat {name} was not flagged'); ok = False
    own = {'supports': {'sgs': {'mediaElements': [{'prefix': 'photo', 'kinds': ['image']}]}},
           'attributes': {'gapTablet': {'type': 'string'}, 'fontSizeMobile': {'type': 'string'}, 'photoSource': {'type': 'object'}}}
    if contract_problems(own, 'own'):
        print('self-test FAIL: a non-media device attribute was flagged'); ok = False
    bg_block = {'supports': {'sgs': {'mediaElements': [{'prefix': 'background', 'context': 'background', 'kinds': ['image', 'video']}]}}}
    real = background_capability()
    if real is None or capability_gaps(real):
        print(f'self-test FAIL: the shipped background capability is not real: {capability_gaps(real)}'); ok = False
    if background_problems(bg_block, 'bg', real):
        print('self-test FAIL: an entry the shipped capability covers was refused'); ok = False
    if not background_problems(bg_block, 'bg', None):
        print('self-test FAIL: kinds on a background entry with no capability declared was not refused'); ok = False
    if not background_problems(bg_block, 'bg', dict(real or {}, kinds=['image'])):
        print('self-test FAIL: a background kind the capability does not list was not refused'); ok = False
    for key in ('renderer', 'element_class', 'overlay_class'):
        if not background_problems(bg_block, 'bg', dict(real or {}, **{key: 'sgs_nothing_here' if key == 'renderer' else 'sgs-nothing-here'})):
            print(f'self-test FAIL: a capability whose {key} is not real was accepted'); ok = False
    if background_problems({'supports': {'sgs': {'mediaElements': [{'prefix': '', 'context': 'background'}]}}}, 'bg', None):
        print('self-test FAIL: a background entry without kinds was refused'); ok = False
    if background_problems({'supports': {'sgs': {'mediaElements': [{'prefix': 'layer', 'context': 'element', 'kinds': ['image']}]}}}, 'el', None):
        print('self-test FAIL: a non-background entry was held to the background capability'); ok = False
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
    partial = [('src/blocks/media/block.json', {'name': 'sgs/media'})]
    if picker_scope(partial, {'sgs/media', 'sgs/hero'}) != ['src/blocks/media/']:
        print('self-test FAIL: partial adoption must read only the adopted block folders'); ok = False
    if picker_scope(partial, {'sgs/media'}) is not None or picker_scope(partial, set()) is not None:
        print('self-test FAIL: full adoption (or no adoption map) must read all of src/'); ok = False
    print('media-contract self-test: ' + ('OK' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    if '--check' in sys.argv:
        sys.exit(check())
    print(__doc__)
    sys.exit(2)
