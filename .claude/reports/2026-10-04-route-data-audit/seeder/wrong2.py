import json,collections,re
d=json.load(open('census.json'))
def el(slot):
    if not slot: return 'wrapper'
    ms=re.findall(r'sgs-([a-z0-9-]+?)__([a-z0-9-]+)',slot.split(',')[0])
    return ms[-1][1] if ms else 'NOBEM'
pairs=collections.Counter(); cls=collections.Counter(); ex=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or not r['cp'] or r.get('cal')!='settings': continue
    props=[p.strip() for p in r['cp'].split(',')]
    cp=r['cal_prop']
    ok_p = cp in props or any(cp.startswith(p+'-') or p.startswith(cp+'-') for p in props) or (cp.startswith('border') and any(p.startswith('border') for p in props))
    ce=r['ce'] or 'wrapper'
    if ce in ('root','self'): ce='wrapper'
    cel=el(r['cal_slot'])
    if ce==cel: k='el-ok'
    elif r['ce'] is None and cel!='wrapper': k='el-null-but-paints-subelement'
    elif cel=='wrapper': k='el-db-sub-but-paints-wrapper'
    else: k='el-differs'
    k2='prop-ok' if ok_p else 'prop-differs'
    cls[(k,k2)]+=1; ex[(k,k2)].append(f"{r['block'].replace('sgs/','')}::{r['attr']} db=({r['cp']}|{r['ce']}) cal=({cp}|{r['cal_slot'][:50]})")
    if k=='el-differs': pairs[(ce,cel)]+=1
for k,v in sorted(cls.items()): print(k,v); [print('   ',x) for x in ex[k][:5]]
print(pairs.most_common(25))
json.dump({'|'.join(k):v for k,v in ex.items()},open('wrong2.json','w'),indent=1)
