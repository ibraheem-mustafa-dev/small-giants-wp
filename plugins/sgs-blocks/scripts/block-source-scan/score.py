"""Score a block source scan against the measured reference (reference.py), counting
every placement, not the best one.

Settings. Each scan placement is expanded to one item per (part, property) and judged
against the setting's measured placements (slot x property) and its measured effects:
  right        part, property and state agree and the tier does not contradict the widths measured;
  container    the measured part is a bare tag and the scan names its classed ancestor;
  wrong-state / wrong-tier / wrong-part / wrong-prop / wrong   (wrong-part: the property
               is measured on another part; wrong-prop: the part is measured with another property);
  unknown      the scan states no part;
  untestable   the placement holds only under a condition calibration does not set (reduced motion, print);
  other-state  a second state (focus beside hover) of a paint that is right in the state calibration measured.
Items are split by evidence: code (read from code), declared (block.json element with a
selector) and hint (block.json element with no selector, whose part is a guessed class).
A measured placement is covered when a right item names it. Per setting, code alone:
  clean (every measured placement covered, no wrong item), partial (some covered, none
  wrong), right+wrong, wrong-only, unknown-only, container-only, none.
A fooUnit beside foo is folded into foo. Settings neither side places are listed with
whether front-end source names them.

Parts. Every measured part in four zones (host, shared, child:<block>, outside), matched
against the host scan (child parts also against the child block's own scan); scan parts
never measured are split into declared-only, stylesheet-only, conditional and unconditional.

Usage:
  python score.py --manifest <manifest.json> --scans <folder> --out <folder> [block ...]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import reference as R  # noqa: E402
from common import BLOCKS, INCLUDES, part_of  # noqa: E402

WRONG = ('wrong-state', 'wrong-tier', 'wrong-part', 'wrong-prop', 'wrong')
CODE_VERDICTS = ('clean', 'partial', 'right+wrong', 'wrong-only', 'container-only', 'unknown-only', 'none')


# ---------------------------------------------------------------- scan side
def evidence_of(p: dict) -> str:
    if p['mechanism'] == 'declared-attrMap':
        return 'declared' if p.get('declaredSelector') else 'hint'
    return 'code'


def scan_key(part, root_tok: str, aliases=()):
    """A scan part in the reference's key form (the root as ROOT, BEM modifier dropped)."""
    if part is None:
        return None
    base, _, pe = part.partition('::')
    head, sep, tag = base.partition(' ')
    head = part_of(head)
    if head == root_tok or head in aliases:
        head = R.ROOT
    key = head + (sep + tag if sep else '')
    return f'{key}::{pe}' if pe else key


def scan_items(placements: list, root_tok: str, aliases=()) -> list:
    """One item per (part, declared property) of every placement that paints; a shorthand's
    longhands stay one item (`props`), right when any of them is measured."""
    items, seen = [], set()
    for p in placements:
        if not p.get('props'):
            continue
        key = scan_key(p.get('part'), root_tok, aliases)
        ev = evidence_of(p)
        for prop in p['props']:
            cps = tuple(sorted(R.canon_props(prop)))
            if not cps:
                continue
            sig = (key, cps, R.norm_state(p.get('state')), tuple(p.get('tiers') or ()), ev)
            if sig in seen:
                continue
            seen.add(sig)
            items.append({'part': key, 'prop': '|'.join(cps), 'props': list(cps), 'state': sig[2], 'tiers': list(sig[3]), 'evidence': ev,
                          'mechanism': p['mechanism'], **({'selector': p['selector']} if p.get('selector') else {})})
    return items


def fold_units(attrs: dict, table: dict) -> dict:
    """Merge every fooUnit entry into foo (a unit companion is not a setting of its own)."""
    out = defaultdict(list)
    for a, v in table.items():
        base = a[:-4] if a.endswith('Unit') and a[:-4] in attrs else a
        out[base].extend(v)
    return out


def unit_companions(attrs: dict) -> list:
    return sorted(a for a in attrs if a.endswith('Unit') and a[:-4] in attrs)


# ---------------------------------------------------------------- judging
def judge(item: dict, ref: dict) -> str:
    """The verdict of one scan item against one measured setting (see the module docstring)."""
    widths = R.tier_widths(item['tiers'])
    if widths is None and any('prefers-' in t or 'print' in t for t in item['tiers']):
        return 'untestable'
    if item['part'] is None:
        return 'unknown'
    places = set(ref['placements'])
    both = places | ref['effects']
    state_ok = item['state'] == ref['state']
    tier_ok = widths is None or bool(widths & ref['widths'])
    if any((item['part'], cp) in both for cp in item['props']):
        if not state_ok:
            return 'wrong-state'
        if not tier_ok:
            return 'wrong-tier'
        return 'right'
    if state_ok and any(R.container_of(k) == item['part'] and cp in item['props'] for k, cp in places):
        return 'container'
    if any(cp in item['props'] for _, cp in both):
        return 'wrong-part'
    if any(k == item['part'] for k, _ in both):
        return 'wrong-prop'
    return 'wrong'


def other_states(items: list) -> None:
    """Calibration measures one state per setting: a placement in another state whose paint
    (part and property) is right in the measured state is unconfirmed ('other-state'), not wrong."""
    right = [i for i in items if i['verdict'] == 'right']
    for i in items:
        if i['verdict'] == 'wrong-state' and any(j['part'] == i['part'] and set(j['props']) & set(i['props']) and j['evidence'] == i['evidence'] for j in right):
            i['verdict'] = 'other-state'


def setting_verdict(items: list, ref: dict) -> dict:
    places = ref['placements']
    by_ev = {ev: [i for i in items if i['evidence'] == ev] for ev in ('code', 'declared', 'hint')}
    covered = {}
    for ev, its in by_ev.items():
        covered[ev] = {(i['part'], cp) for i in its if i['verdict'] == 'right' for cp in i['props']} & set(places)
    code = by_ev['code']
    n_wrong = sum(1 for i in code if i['verdict'] in WRONG)
    n_cov = len(covered['code'])
    n_right = sum(1 for i in code if i['verdict'] == 'right')  # a right item may name a measured effect only
    right = {ev: any(i['verdict'] == 'right' for i in its) for ev, its in by_ev.items()}
    if n_cov and n_cov == len(places) and not n_wrong:
        v = 'clean'
    elif n_right and not n_wrong:
        v = 'partial'
    elif n_right:
        v = 'right+wrong'
    elif n_wrong:
        v = 'wrong-only'
    elif any(i['verdict'] == 'container' for i in code):
        v = 'container-only'
    elif any(i['verdict'] == 'unknown' for i in code):
        v = 'unknown-only'
    else:
        v = 'none'
    backed = None
    if not n_right:
        if right['declared']:
            backed = 'declared'
        elif right['hint']:
            backed = 'hint'
    return {'code': v, 'declarationBacked': backed,
            'covered': {ev: len(c) for ev, c in covered.items()}, 'measuredPlacements': len(places),
            'missed': len(set(places) - covered['code'] - covered['declared'] - covered['hint'])}


# ---------------------------------------------------------------- parts
def match_part(key: str, zone: str, scan: dict, child_scans: dict, root_tok: str):
    """How a measured part is found by the scan: 'part', 'tag', 'child-scan', or None."""
    def keys(sc, rt):
        return {scan_key(t, rt) for t in sc['parts']}
    host_keys = keys(scan, root_tok)
    if zone == 'outside' and key.startswith('@'):
        name = key.lstrip('@').split('::')[0]
        return 'part' if any(t.endswith('__' + name) or t.endswith('-' + name) for t in scan['parts']) else None
    if key in host_keys:
        return 'part'
    if zone.startswith('child:'):
        child = zone.split(':', 1)[1]
        cs = child_scans.get(child)
        if cs and (key in keys(cs, f'sgs-{child}') or key.replace(R.ROOT, f'sgs-{child}') in cs['parts']):
            return 'child-scan'
    base = key.split('::')[0]
    if ' ' in base and '::' not in key:
        tag = base.split(' ', 1)[1]
        if tag in scan['tags'] or any(tag in cs['tags'] for cs in child_scans.values()):
            return 'tag'
    return None


def score_parts(ref: dict, scan: dict, child_scans: dict, root_tok: str) -> dict:
    rows = defaultdict(lambda: {'rendered': 0, 'matched': 0, 'tagOnly': 0, 'matchedBy': Counter(), 'missed': []})
    for key, rec in sorted(ref['parts'].items()):
        zone = rec['zone'] if not rec['zone'].startswith('child:') else 'child'
        row = rows[zone]
        row['rendered'] += 1
        how = match_part(key, rec['zone'], scan, child_scans, root_tok)
        if how == 'tag':  # the tag is printed somewhere, not shown under this part: its own column
            row['tagOnly'] += 1
        elif how:
            row['matched'] += 1
            row['matchedBy'][how] += 1
        if how in (None, 'tag'):
            row['missed'].append({'part': key, 'zone': rec['zone'], 'path': rec['paths'][0], **({'tagPrinted': True} if how else {})})
    measured = set(ref['parts'])
    scan_only = defaultdict(list)
    for tok, r in sorted(scan['parts'].items()):
        if r['owner'] not in ('host', 'shared') or scan_key(tok, root_tok) in measured:
            continue
        origins = set(r['origins'])
        if origins <= {'declared-only'}:
            kind = 'declared-only'
        elif origins <= {'css-only', 'css-pseudo'}:
            kind = 'stylesheet-only'
        elif r['conditions'] or r['conditionAttrs'] or r['repeats'] or origins & {'js', 'save'}:
            kind = 'conditional'
        else:
            kind = 'unconditional'
        scan_only[kind].append(tok)
    rendered = sum(r['rendered'] for r in rows.values())
    matched = sum(r['matched'] for r in rows.values())
    tag_only = sum(r['tagOnly'] for r in rows.values())
    wrong = len(scan_only['declared-only']) + len(scan_only['unconditional'])
    return {'rows': {k: {**v, 'matchedBy': dict(v['matchedBy'])} for k, v in sorted(rows.items())},
            'rendered': rendered, 'matched': matched, 'tagOnly': tag_only, 'recall': ratio(matched, rendered),
            'scanOnly': {k: v for k, v in sorted(scan_only.items())},
            'precision': ratio(matched, matched + wrong), 'referenceFaults': ref['faults']}


# ---------------------------------------------------------------- neither side
_FRONT_SOURCES: dict = {}


def front_end_names(block_dir: Path, attr: str) -> bool:
    """Whether front-end source (the block's PHP and scripts other than the editor's, or includes/) names the setting."""
    if block_dir not in _FRONT_SOURCES:
        texts = []
        for p in block_dir.rglob('*'):
            if p.suffix in ('.php', '.js', '.mjs') and not re.search(r'edit|editor|inspector|save|deprecated|transforms|index', p.name):
                texts.append(p.read_text(encoding='utf-8', errors='ignore'))
        _FRONT_SOURCES[block_dir] = '\n'.join(texts)
        if 'includes' not in _FRONT_SOURCES:
            _FRONT_SOURCES['includes'] = '\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p in INCLUDES.rglob('*.php'))
    pat = re.compile(r"""['"]""" + re.escape(attr) + r"""['"]|\.""" + re.escape(attr) + r'\b|\b' + re.escape(attr) + r'\s*[,}=:]')
    return bool(pat.search(_FRONT_SOURCES[block_dir]) or pat.search(_FRONT_SOURCES['includes']))


# ---------------------------------------------------------------- block
def ratio(a, b):
    return round(a / b, 4) if b else None


def score_block(block: str, scan: dict, ref: dict, child_scans: dict, blocks_dir: Path = BLOCKS) -> dict:
    bj = json.loads((blocks_dir / block / 'block.json').read_text(encoding='utf-8'))
    attrs = bj.get('attributes', {})
    short = bj['name'].split('/', 1)[1]
    root_tok = f'sgs-{short}'
    aliases = tuple(scan.get('rootAliases') or ())
    scan_set = fold_units(attrs, scan['settings'])
    ref_set = fold_units(attrs, {a: [v] for a, v in ref['settings'].items()})
    companions = unit_companions(attrs)
    universe = sorted(a for a in attrs if a not in companions)
    detail, verdicts, backed = {}, Counter(), Counter()
    item_counts = {ev: Counter() for ev in ('code', 'declared', 'hint')}
    place_total = place_code = place_any = 0
    unmeasured, neither = defaultdict(list), []
    for a in universe:
        items = scan_items(scan_set.get(a, []), root_tok, aliases)
        refs = ref_set.get(a) or []
        rs = refs[0] if refs else None
        if rs is not None and len(refs) > 1:  # a unit companion measured on its own: merge its placements
            rs = {**rs, 'placements': sorted({p for r in refs for p in r['placements']}), 'effects': set().union(*(r['effects'] for r in refs))}
        if rs is not None and rs['placements']:
            for i in items:
                i['verdict'] = judge(i, rs)
            other_states(items)
            for i in items:
                item_counts[i['evidence']][i['verdict']] += 1
            sv = setting_verdict(items, rs)
            verdicts[sv['code']] += 1
            if sv['declarationBacked']:
                backed[sv['declarationBacked']] += 1
            place_total += sv['measuredPlacements']
            place_code += sv['covered']['code']
            place_any += sv['measuredPlacements'] - sv['missed']
            detail[a] = {'verdict': sv, 'measured': {'placements': rs['placements'], 'state': rs['state'],
                                                     'widths': sorted(rs['widths']), 'zones': rs['zones']},
                         'items': items}
            continue
        if items:
            why = ('dead' if a in ref['dead'] else 'no-marker' if a in ref['noMarker'] else 'state-untriggerable' if a in ref['untested']
                   else 'presence-only' if a in ref['presence'] else 'rejected' if a in ref['rejected'] else 'not-measured')
            unmeasured[why].append(a)
            detail[a] = {'unmeasured': why, 'items': items}
            continue
        if a in ref['presence'] or any(k.split('=')[0] == a for k in ref['presence']):
            detail[a] = {'presenceOnly': True}
            continue
        neither.append({'setting': a, 'frontEndNames': front_end_names(blocks_dir / block, a),
                        'type': attrs[a].get('type') if isinstance(attrs[a], dict) else None, 'refStatus': 'dead' if a in ref['dead'] else 'no-marker' if a in ref['noMarker'] else None})
    measured = sum(verdicts.values())
    code_any = verdicts['clean'] + verdicts['partial'] + verdicts['right+wrong']
    code_items = item_counts['code']
    code_right, code_wrong = code_items['right'], sum(code_items[w] for w in WRONG)
    return {
        'block': bj['name'], 'measuredAt': ref['measured'],
        'parts': score_parts(ref, scan, child_scans, root_tok),
        'settings': {
            'universe': len(universe), 'unitCompanionsFolded': companions, 'measured': measured,
            'code': {k: verdicts[k] for k in CODE_VERDICTS},
            'codeAnyRight': code_any, 'codeAnyRightRate': ratio(code_any, measured),
            'codeClean': verdicts['clean'], 'codeCleanRate': ratio(verdicts['clean'], measured),
            'declarationBackedOnly': dict(backed),
            'items': {ev: dict(c) for ev, c in item_counts.items()},
            'codePrecision': ratio(code_right, code_right + code_wrong),
            'placements': {'measured': place_total, 'coveredByCode': place_code, 'coveredByAny': place_any,
                           'codeRecall': ratio(place_code, place_total)},
            'unmeasured': {k: sorted(v) for k, v in sorted(unmeasured.items())},
            'neither': neither,
        },
        'detail': detail,
    }


def summary_row(name: str, s: dict) -> dict:
    st, pa = s['settings'], s['parts']
    ci = st['items']['code']
    return {'block': name, 'measured': st['measured'], 'clean': st['codeClean'], 'anyRight': st['codeAnyRight'],
            'declOnly': st['declarationBackedOnly'].get('declared', 0), 'hintOnly': st['declarationBackedOnly'].get('hint', 0),
            'codeRight': ci.get('right', 0), 'codeWrong': sum(ci.get(w, 0) for w in WRONG), 'codeUnknown': ci.get('unknown', 0),
            'codeContainer': ci.get('container', 0), 'placements': st['placements']['measured'], 'placementsCode': st['placements']['coveredByCode'],
            'partsRendered': pa['rendered'], 'partsMatched': pa['matched'], 'partsTagOnly': pa['tagOnly'],
            'partsWrong': len(pa['scanOnly'].get('declared-only', [])) + len(pa['scanOnly'].get('unconditional', [])),
            'neither': len(st['neither']), 'unmeasured': sum(len(v) for v in st['unmeasured'].values())}


def total_row(rows: list) -> dict:
    t = {'block': 'TOTAL'}
    for k in rows[0]:
        if k != 'block':
            t[k] = sum(r[k] for r in rows)
    return t


def format_rows(rows: list) -> str:
    head = 'block | settings measured | code clean | code any right | decl-only | hint-only | code items right/wrong/unknown/container | placements covered by code | parts matched/rendered | parts wrong | neither | unmeasured'
    out = [head]
    for r in rows:
        out.append(f"{r['block']} | {r['measured']} | {r['clean']} ({pct(r['clean'], r['measured'])}) | {r['anyRight']} ({pct(r['anyRight'], r['measured'])}) | {r['declOnly']} | {r['hintOnly']} | "
                   f"{r['codeRight']}/{r['codeWrong']}/{r['codeUnknown']}/{r['codeContainer']} (precision {pct(r['codeRight'], r['codeRight'] + r['codeWrong'])}) | "
                   f"{r['placementsCode']}/{r['placements']} ({pct(r['placementsCode'], r['placements'])}) | {r['partsMatched']}/{r['partsRendered']} ({pct(r['partsMatched'], r['partsRendered'])}; +{r['partsTagOnly']} tag only) | {r['partsWrong']} | {r['neither']} | {r['unmeasured']}")
    return '\n'.join(out)


def pct(a, b):
    return f'{100 * a / b:.1f}%' if b else '-'


def load_scan(folder: Path, block: str) -> dict:
    p = folder / f'{block}.scan.json'
    if not p.is_file():
        from scan import Scan
        folder.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(Scan(block).run().to_json(), indent=1), encoding='utf-8')
    return json.loads(p.read_text(encoding='utf-8'))


def main(argv=None):
    ap = argparse.ArgumentParser(description='Score block source scans against the measured reference.')
    ap.add_argument('--manifest', required=True, type=Path, help='JSON {block: {slotmap, paint: [...]}}')
    ap.add_argument('--scans', required=True, type=Path, help='folder of <block>.scan.json (missing scans are made)')
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('blocks', nargs='*')
    args = ap.parse_args(argv)
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    args.out.mkdir(parents=True, exist_ok=True)
    rows = []
    for block in args.blocks or sorted(manifest):
        bj = json.loads((BLOCKS / block / 'block.json').read_text(encoding='utf-8'))
        short = bj['name'].split('/', 1)[1]
        ref = R.load(manifest[block], short)
        scan = load_scan(args.scans, block)
        children = {rec['zone'].split(':', 1)[1] for rec in ref['parts'].values() if rec['zone'].startswith('child:')}
        child_scans = {c: load_scan(args.scans, c) for c in sorted(children) if (BLOCKS / c / 'block.json').is_file()}
        s = score_block(block, scan, ref, child_scans)
        (args.out / f'{block}.score.json').write_text(json.dumps(s, indent=1, default=sorted), encoding='utf-8')
        rows.append(summary_row(block, s))
    rows.append(total_row(rows))
    (args.out / 'summary.json').write_text(json.dumps(rows, indent=1), encoding='utf-8')
    print(format_rows(rows))


if __name__ == '__main__':
    main()
