"""Classify every dead / oneWidth / untestedStates calibration outcome by cause.

Rerun:  python .claude/reports/2026-10-05-session-b/classify-outcomes.py
Read-only on the repo. Scratch files (layer.json, entries.json) go to a temp dir.
Dead entries use classify() from classify_dead.py unchanged. oneWidth and
untestedStates labels are defined here (causeSource "mine").
"""
import json, os, re, subprocess, sys, tempfile, collections, glob
REPO = 'C:/Users/Bean/Projects/small-giants-wp'
CAL = REPO + '/.claude/reports/2026-10-04-route-data-audit/calibration'
OUT = REPO + '/.claude/reports/2026-10-05-session-b/'
CACHE = REPO + '/scripts/computed-route/cache/'
tmp = tempfile.mkdtemp(prefix='calib-')
# layer.json is read from the cwd by classify_dead.py; entries.json is written to the cwd by dump.mjs
subprocess.run([sys.executable, CAL + '/layer.py'], cwd=tmp, check=True, capture_output=True)
subprocess.run(['node', CAL + '/dump.mjs'], cwd=tmp, check=True, capture_output=True)
entries = json.load(open(tmp + '/entries.json', encoding='utf8'))
os.chdir(tmp)
sys.path.insert(0, CAL)
import classify_dead  # noqa: E402  (defines classify; reuses elem/FX/layer.json)
classify = classify_dead.classify

# summing rule: cache files <block>.json (not .tree.json); dead/oneWidth/untestedStates list lengths
raw = collections.Counter(); measured = {}
for f in glob.glob(CACHE + '*.json'):
    if f.endswith('.tree.json'): continue
    j = json.load(open(f, encoding='utf8'))
    measured[j['block']] = j['measured']
    raw['dead'] += len(j['dead']); raw['oneWidth'] += len(j['oneWidth']); raw['untestedStates'] += len(j['untestedStates'])

def first_row(e):
    rs = [r for r in e['rows'] if r['css_property']]
    return rs[0] if rs else (e['rows'][0] if e['rows'] else {})

base_props = {}
for e in entries:
    if e['cat'] == 'oneWidth' and e['rows']:
        base_props.setdefault((e['block'], e['attr']), first_row(e))

ALLW = {375, 768, 1440}
def one_width_cause(e):
    w = set(e['raw']['reachedAt'])
    if not w: return 'ONEWIDTH_NONE_REACHED'
    miss = sorted(ALLW - w)
    return 'ONEWIDTH_MISSING_' + '_'.join(map(str, miss))
def untested_cause(e):
    r = e['raw']
    if 'stays hidden with its panel opened' in r: return 'UNTESTED_HOVER_ELEMENT_HIDDEN_BY_OPEN_PANEL'
    if 'is-header-scrolled' in r: return 'UNTESTED_SCROLLED_CLASS_NEVER_APPLIED'
    return 'UNTESTED_OTHER'

rec = []; stale = []
for e in entries:
    if e['cat'] not in ('dead', 'oneWidth', 'untested'): continue
    if e['cat'] == 'dead':
        r = first_row(e); cause = classify(e); src = 'classify_dead.py'; outc = 'dead'; attr = e['attr']
        if cause.startswith('STALE_'): stale.append((e['block'], e['attr'], e['measured']))
    elif e['cat'] == 'oneWidth':
        attr = e['attr']; r = first_row(e) or base_props.get((e['block'], attr.split('-')[0]), {})
        cause = one_width_cause(e); src = 'mine'; outc = 'oneWidth'
    else:
        r = first_row(e); cause = untested_cause(e); src = 'mine'; outc = 'untestedStates'; attr = e['attr']
    rec.append({'block': e['block'], 'attr': attr, 'cssProperty': r.get('css_property'), 'cssElement': r.get('css_element'),
                'cssState': r.get('css_state'), 'outcome': outc, 'cause': cause, 'causeSource': src,
                'measured': e['measured'],
                **({'reachedAt': e['raw']['reachedAt'], 'marker': e['raw']['key']} if outc == 'oneWidth' else {})})

def cnt(rs, k): return dict(sorted(collections.Counter(x[k] for x in rs).items(), key=lambda kv: -kv[1]))
S = {}
S['summingRule'] = 'sum of len(dead), len(oneWidth), len(untestedStates) over scripts/computed-route/cache/<block>.json (excluding .tree.json)'
S['cacheTotals'] = dict(raw)
S['classifiedTotals'] = dict(collections.Counter(x['outcome'] for x in rec))
S['byCause'] = {o: cnt([x for x in rec if x['outcome'] == o], 'cause') for o in ('dead', 'oneWidth', 'untestedStates')}
S['byBlock'] = {o: cnt([x for x in rec if x['outcome'] == o], 'block') for o in ('dead', 'oneWidth', 'untestedStates')}
top6 = ['sgs/cart', 'sgs/nav-bar-menu', 'sgs/product-card', 'sgs/nav-drawer-menu', 'sgs/hero', 'sgs/mega-panel']
S['causeByBlockTop6Dead'] = {b: cnt([x for x in rec if x['outcome'] == 'dead' and x['block'] == b], 'cause') for b in top6}
S['staleEntries'] = stale
S['measuredRange'] = {'min': min(measured.values()), 'max': max(measured.values()), 'blocksWithCache': len(measured),
                      'blocksMeasuredBefore2026-10-05': sorted(b for b, m in measured.items() if m < '2026-10-05')}
json.dump({'summary': S, 'entries': rec}, open(OUT + 'calibration-outcomes.json', 'w', encoding='utf8'), indent=1)
print(json.dumps(S, indent=1))
