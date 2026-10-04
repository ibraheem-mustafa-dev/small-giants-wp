import json,collections,re
d=json.load(open('census.json'))
def el(slot):
    if not slot: return 'wrapper'
    m=re.search(r'sgs-[a-z0-9-]+?__([a-z0-9-]+)',slot.split(',')[0])
    return m.group(1) if m else 'OTHER:'+slot
c=collections.Counter(); ex=collections.defaultdict(list)
for src in ('sgs','sgs-ext'):
  for r in d:
    if r['src']!=src or not r['cp']: continue
    cal=r.get('cal')
    if cal is None:
        k=(src,'routed-uncalibrated' if r['block'].replace('sgs/','') else '')
    elif cal=='settings':
        props=[p.strip() for p in r['cp'].split(',')]
        ok_p = r['cal_prop'] in props or any(r['cal_prop'].startswith(p) or p.startswith(r['cal_prop'].split('-')[0]) for p in props)
        ce=r['ce'] or 'wrapper'; ce='wrapper' if ce in ('root','self','') else ce
        cel=el(r['cal_slot'])
        k=(src,'cal-ok' if (ce==cel and ok_p) else ('wrong-element' if ok_p else ('wrong-prop' if ce==cel else 'wrong-both')))
        if k[1]!='cal-ok': ex[k].append(f"{r['block']}::{r['attr']} db=({r['cp']},{r['ce']}) cal=({r['cal_prop']},{r['cal_slot']})")
    else:
        k=(src,'cal-'+cal); ex[k].append(f"{r['block']}::{r['attr']}")
    c[k]+=1
for k,v in sorted(c.items()): print(k,v,ex[k][:4])
json.dump({'|'.join(k):v for k,v in ex.items()},open('wrong.json','w'),indent=1)
