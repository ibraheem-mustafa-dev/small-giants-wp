"""The measured reference the score compares the scan with: a block's calibration slot
map (where each setting painted, which property, in which state, at which widths) and
its default paint files (every element and layer the instance rendered).

A measured path is turned into a part key the scan's parts can be compared with:
  ''                      -> the block root (ROOT)
  '::after'               -> ROOT::after
  '... > .sgs-x__y:nth-of-type(2)::before' -> sgs-x__y::before  (BEM modifier dropped)
  '... > .sgs-x__y > svg' -> 'sgs-x__y svg' (a bare tag keeps its nearest classed ancestor)
  '@companion > ...'      -> the same key, in the zone 'outside' (drawn outside the block's root)
Each part is in one zone: host (the block's own classes), shared (classes no block owns:
shared helpers, the theme), child:<block> (another block's classes) or outside.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from common import owner_of, part_of

ROOT = 'ROOT'
WIDTHS = (375, 768, 1440)
STEP_CLASS_RE = re.compile(r'\.(sgs-[a-z0-9-]+(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?)')
STEP_PSEUDO_RE = re.compile(r'::?(before|after|first-letter|first-line|marker|placeholder)\b')
FAULTS_FILE = Path(__file__).resolve().parent / 'reference-faults.json'


# ---------------------------------------------------------------- shared vocabularies
def canon_props(prop: str) -> set:
    """A CSS property as the reference names it: longhand sides folded to the shorthand the
    slot map uses (padding, margin, border-color, border-radius, gap, inset), a shorthand
    expanded to the longhands it sets. Width and height stay separate properties."""
    p = prop.strip()
    if p.startswith('css:'):
        p = p[4:]
    if not p:
        return set()
    if p in ('background',):
        return {'background-color', 'background-image'}
    if p == 'border':
        return {'border-color', 'border-width', 'border-style'}
    if p in ('transition',):
        return {'transition-duration', 'transition-timing-function', 'transition-property', 'transition-delay'}
    if p in ('animation',):
        return {'animation-duration', 'animation-timing-function', 'animation-name', 'animation-delay'}
    if p == '-webkit-text-stroke':
        return {'-webkit-text-stroke-color', '-webkit-text-stroke-width'}
    if p.endswith('-gradient'):
        return {'background-image'}
    p = re.sub(r'^(padding|margin|scroll-padding|scroll-margin)-(top|right|bottom|left|inline|block)(-start|-end)?$', r'\1', p)
    p = re.sub(r'^border-(top|right|bottom|left|inline|block)(-start|-end)?-(color|width|style)$', r'border-\3', p)
    p = re.sub(r'^border-(top|bottom|start|end)-(left|right|start|end)-radius$', 'border-radius', p)
    m = re.match(r'^border-(top|right|bottom|left|inline|block)(-start|-end)?$', p)
    if m:
        return {'border-color', 'border-width', 'border-style'}
    if re.match(r'^(top|right|bottom|left|inset-(inline|block)(-start|-end)?)$', p):
        return {'inset'}
    return {{'row-gap': 'gap', 'column-gap': 'gap', 'grid-gap': 'gap', 'text-decoration-line': 'text-decoration'}.get(p, p)}


STATE_WORDS = (
    ('hover', ('hover',)),
    ('focus', ('focus',)),
    ('current', ('current',)),
    ('open', ('open', 'expanded')),
    ('disabled', ('disabled',)),
    ('active', ('active',)),
    ('checked', ('checked', 'selected')),
)


def norm_state(state) -> "str | None":
    """A state as the reference names it (hover, focus, current, open, disabled, active, checked)."""
    if not state:
        return None
    s = str(state).lower()
    for name, words in STATE_WORDS:
        if any(w in s for w in words):
            return name
    return s


def tier_widths(tiers) -> "set | None":
    """The measured widths a placement's tier covers, or None when it is not a width tier."""
    if not tiers:
        return set(WIDTHS)
    out = set()
    for t in tiers:
        t = str(t)
        named = {'mobile': {375}, 'tablet': {375, 768}, 'tablet-up': {768, 1440}, 'desktop': {1440}, 'tablet-only': {768}}
        if t in named:
            out |= named[t]
            continue
        if not t.startswith('@media') or 'prefers-' in t or 'print' in t:
            return None
        lo = re.search(r'min-width:\s*([\d.]+)px', t)
        hi = re.search(r'max-width:\s*([\d.]+)px', t)
        if not lo and not hi:
            return None
        out |= {w for w in WIDTHS if (not lo or w >= float(lo.group(1))) and (not hi or w <= float(hi.group(1)))}
    return out


# ---------------------------------------------------------------- paths
def step_key(step: str):
    """(class key or bare tag, pseudo-element or None) of one measured path step."""
    step = re.sub(r':nth-of-type\(\d+\)', '', step).strip()
    pe = STEP_PSEUDO_RE.search(step)
    m = STEP_CLASS_RE.search(step)
    if m:
        return part_of(m.group(1)), (pe.group(1) if pe else None)
    t = re.match(r'([a-zA-Z][a-zA-Z0-9]*)', step)
    return (t.group(1).lower() if t else step), (pe.group(1) if pe else None)


def path_key(path: str, root_tok: str) -> str:
    """The part key of a measured path (see the module docstring)."""
    if path == '':
        return ROOT
    if path.startswith('::') or path.startswith(':'):
        pe = STEP_PSEUDO_RE.search(path)
        return f'{ROOT}::{pe.group(1)}' if pe else ROOT
    steps = [s.strip() for s in path.split(' > ')]
    if steps[0].startswith('@'):
        head = steps[0]
        if len(steps) == 1:
            return head
        steps = steps[1:]
    key, pe = step_key(steps[-1])
    if not key.startswith('sgs-'):
        anc = ROOT
        for st in reversed(steps[:-1]):
            k, _ = step_key(st)
            if k.startswith('sgs-'):
                anc = ROOT if k == root_tok else k
                break
        key = f'{anc} {key}'
    if key == root_tok:
        key = ROOT
    return f'{key}::{pe}' if pe else key


def path_zone(path: str, short: str) -> str:
    """host, shared, child:<block> or outside (see the module docstring)."""
    if path.startswith('@'):
        return 'outside'
    if path == '' or path.startswith(':'):
        return 'host'
    for st in reversed(path.split(' > ')):
        for t in STEP_CLASS_RE.findall(st):
            o = owner_of(part_of(t), short)
            if o == 'host':
                return 'host'
            if o.startswith('block:'):
                return 'child:' + o.split(':', 1)[1]
            return 'shared'
    return 'host'


def container_of(key: str):
    """The classed ancestor of a bare-tag key ('sgs-x__y svg' -> 'sgs-x__y'), else None."""
    base = key.split('::')[0]
    return base.split(' ')[0] if ' ' in base else None


# ---------------------------------------------------------------- faults
def load_faults(path: Path = FAULTS_FILE) -> list:
    return json.loads(path.read_text(encoding='utf-8'))['faults']


def fault_of(path: str, paint: dict, faults: list):
    """The fault entry a measured path matches, or None."""
    pe = STEP_PSEUDO_RE.search(path.split(' > ')[-1])
    if not pe:
        return None
    for f in faults:
        if f.get('pseudo') != pe.group(1):
            continue
        only = f.get('onlyProps')
        if only:
            vals = paint.get(path)
            if not vals:
                continue
            props = {k for per_w in vals.values() if isinstance(per_w, dict) for k in per_w}
            if not props or not props <= set(only):
                continue
        return f
    return None


# ---------------------------------------------------------------- load
def slot_paths(ms: dict) -> list:
    return [x for x in (ms.get('slots') or [ms.get('slot')]) if isinstance(x, str)]


def load(entry: dict, short: str, faults: list | None = None) -> dict:
    """The reference for one block from a manifest entry {'slotmap': path, 'paint': [paths]}."""
    faults = load_faults() if faults is None else faults
    root_tok = f'sgs-{short}'
    slot = json.loads(Path(entry['slotmap']).read_text(encoding='utf-8'))
    paint = {}
    paths = set()
    for p in entry.get('paint', []):
        d = json.loads(Path(p).read_text(encoding='utf-8'))
        for k, v in (d.get('elements') or {}).items():
            paint.setdefault(k, v)
            paths.add(k)
        paths |= set((d.get('parts') or {}).keys())
    for ms in (slot.get('settings') or {}).values():
        paths.update(slot_paths(ms))
    for pv in (slot.get('presence') or {}).values():
        paths.update(x for x in (pv.get('shows') or []) + (pv.get('hides') or []) if isinstance(x, str))
    for v in (slot.get('text') or {}).values():
        if isinstance(v, dict) and isinstance(v.get('path'), str):
            paths.add(v['path'])
    for v in (slot.get('discovered') or {}).values():
        for pv in v.values():
            if isinstance(pv, dict):
                paths.update(x for x in pv.get('slots', []) if isinstance(x, str))
    parts, fault_list = {}, []
    for p in sorted(paths):
        f = fault_of(p, paint, faults)
        if f:
            fault_list.append({'path': p, 'fault': f['id']})
            continue
        key = path_key(p, root_tok)
        rec = parts.setdefault(key, {'zone': path_zone(p, short), 'paths': []})
        if len(rec['paths']) < 4:
            rec['paths'].append(p)
    settings = {}
    for a, ms in (slot.get('settings') or {}).items():
        widths = set(ms.get('reachedAt') or WIDTHS)
        prop = ms.get('property') or ''
        places, dropped = set(), []
        for p in slot_paths(ms):
            if fault_of(p, paint, faults):
                dropped.append(p)
                continue
            for cp in canon_props(prop):
                places.add((path_key(p, root_tok), cp))
        effects = set()
        for e in ms.get('effects') or []:
            sl, _, ep = e.rpartition('|')
            if fault_of(sl, paint, faults):
                continue
            for cp in canon_props(ep):
                effects.add((path_key(sl, root_tok), cp))
        settings[a] = {'placements': sorted(places), 'effects': effects, 'state': norm_state(ms.get('state')),
                       'widths': widths, 'property': prop, 'droppedFaultSlots': dropped,
                       'zones': sorted({path_zone(p, short) for p in slot_paths(ms)})}
    return {
        'parts': parts, 'faults': fault_list, 'settings': settings,
        'presence': slot.get('presence') or {}, 'dead': set(slot.get('dead') or []),
        'noMarker': set(slot.get('noMarker') or []),
        'untested': {u.split(':', 1)[0] for u in slot.get('untestedStates') or []},
        'rejected': {r if isinstance(r, str) else r.get('setting', str(r)) for r in slot.get('rejected') or []},
        'measured': slot.get('measured'),
    }
