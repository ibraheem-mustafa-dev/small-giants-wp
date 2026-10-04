import json,collections,re
exec(open('tab.py').read().split('src=sys.argv')[0])
H=json.load(open('helpers.json'))
t=collections.Counter(); ex=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or r['attr'].endswith('Unit') or bucket(r)!='helper-prefix' or r['role'] not in PAINT: continue
    for h in r['HP']:
        f,fn=h.split('::')
        loc='render' if f=='render.php' else 'sibling'
        # find suffix
        suf=[s for s in H[fn]['sufs'] if r['attr'].endswith(s)]
        s=max(suf,key=len) if suf else '?'
        key=(fn,loc,s,'R' if r['cp'] else 'U')
        t[key]+=1; ex[key].append(r['block']+'::'+r['attr'])
        break
for k,v in sorted(t.items()): 
    if k[3]=='U': print(k,v,'routed-same:',t.get(k[:3]+('R',),0),ex[k][:3])
