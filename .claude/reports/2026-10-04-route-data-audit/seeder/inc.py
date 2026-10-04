import json,collections
exec(open('tab.py').read().split('src=sys.argv')[0])
c=collections.defaultdict(lambda:[0,0]); ex=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or r['attr'].endswith('Unit') or bucket(r)!='includes-literal' or r['role'] not in PAINT: continue
    f=r['I'][0] if len(r['I'])==1 else ('MULTI:'+r['I'][0])
    c[f][0 if r['cp'] else 1]+=1
    if not r['cp']: ex[f].append(r['block'][4:]+'::'+r['attr']+('['+r['cal']+']' if r.get('cal') else ''))
for f,v in sorted(c.items(),key=lambda x:-x[1][1]):
    if v[1]: print(f,'routed=%d unrouted=%d'%tuple(v),ex[f][:5])
