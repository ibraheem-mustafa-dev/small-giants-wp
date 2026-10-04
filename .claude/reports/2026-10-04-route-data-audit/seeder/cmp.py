import json,sqlite3,collections
def load(p): return {(e['slug'],e['attr']):e['fields'] for e in json.load(open(p,encoding='utf-8'))['entries']}
regen=load('regen-classifications.json')
comm=load(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json')
ov=json.load(open(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/attr-classification-overrides.json',encoding='utf-8'))
print('overrides keys',list(ov.keys())[:5] if isinstance(ov,dict) else type(ov))
F=('css_property','css_element','css_state','css_tier')
diff=[k for k in set(regen)|set(comm) if any((regen.get(k) or {}).get(f)!=(comm.get(k) or {}).get(f) for f in F)]
print('regen',len(regen),'committed',len(comm),'differ',len(diff)); print(sorted(diff)[:10])
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
db={(b,a):dict(zip(F,r)) for b,a,*r in c.execute("select block_slug,attr_name,css_property,css_element,css_state,css_tier from block_attributes where source='sgs'")}
n=collections.Counter(); ex=collections.defaultdict(list)
for k,v in db.items():
    g=regen.get(k,{})
    for f in F:
        if v[f]!=g.get(f):
            key=(f,'db-set/regen-null' if v[f] and not g.get(f) else ('db-null/regen-set' if g.get(f) and not v[f] else 'both-differ'))
            n[key]+=1; ex[key].append((k,v[f],g.get(f)))
for k,v in sorted(n.items()): print(k,v,ex[k][:4])
