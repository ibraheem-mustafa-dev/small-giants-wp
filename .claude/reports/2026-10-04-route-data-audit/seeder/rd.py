import json,collections,re,sys
exec(open('tab.py').read().split('src=sys.argv')[0])
B=sys.argv[1]
c=collections.Counter();ex=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or r['attr'].endswith('Unit') or bucket(r)!=B or r['role'] not in PAINT or r['cp']: continue
    k=(r['role'],r['enum'])
    c[k]+=1; ex[k].append(r['block'].replace('sgs/','')+'::'+r['attr']+('' if not r.get('cal') else '['+r['cal']+']'))
for k,v in c.most_common(): print(k,v,ex[k][:8])
