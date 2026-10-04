import json,collections,re
d=json.load(open('census.json'))
by={(r['block'],r['attr']):r for r in d}
c=collections.Counter(); ex=collections.defaultdict(list)
for r in d:
    if r['src'] not in ('sgs','sgs-ext'): continue
    # state vs calibration
    if r.get('cal')=='settings':
        if (r['cs'] or None)!=(r.get('cal_state') or None):
            k='state-mismatch'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} db={r['cs']} cal={r.get('cal_state')}")
    m=re.match(r'(.+?)(Tablet|Mobile)$',r['attr'])
    if m and r['cp']:
        base=by.get((r['block'],m.group(1)))
        if r['ts']!='flat_sibling': k='tiered-name-not-flat_sibling'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} ts={r['ts']} base_ts={base and base['ts']}")
        if (r['ct'] or '')!=m.group(2).lower(): k='sibling-css_tier-wrong'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} ct={r['ct']} ts={r['ts']}")
        if base and not base['cp']: k='sibling-routed-base-unrouted'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']}")
    if m and not r['cp']:
        base=by.get((r['block'],m.group(1)))
        if base and base['cp'] and not r['attr'].endswith('Unit'): k='base-routed-sibling-unrouted'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} ts={r['ts']}")
    if r['cp'] and r['type']=='object' and r['ts'] is None and not r['bf']:
        k='routed-object-no-tier_shape-no-box'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} cp={r['cp']}")
    if r['cp'] and re.search(r'(padding|margin)',r['cp']) and r['type']=='object' and not r['bf'] and r['ts']!='box_only':
        k='box-prop-object-no-box_family'; c[k]+=1; ex[k].append(f"{r['block']}::{r['attr']} cp={r['cp']} ts={r['ts']}")
for k,v in c.items(): print(k,v,ex[k][:6])
