import sqlite3,json,glob,collections,re
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
D='C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/cache/'
dead=[];nom=[];unt=[]
for f in glob.glob(D+'*.json'):
    j=json.load(open(f,encoding='utf8'))
    if not isinstance(j,dict) or 'block' not in j: print('skip',f[-40:]); continue
    b=j['block']
    dead+= [(b,a) for a in j.get('dead',[])]; nom+=[(b,a) for a in j.get('noMarker',[])]; unt+=[(b,a) for a in j.get('untestedStates',[])]
print('dead',len(dead),'noMarker',len(nom),'untested',len(unt))
def row(b,a): return c.execute("select css_property,css_element,css_state,tier_shape,attr_type,role,output_signature,inspector_control_type from block_attributes where block_slug=? and attr_name=?",(b,a)).fetchone()
varblocks=dict(c.execute("select slug,variant_attr from blocks where variant_attr is not null"))
vslots=set(c.execute("select block_slug,unique_slot from variant_slots"))
cat=collections.Counter(); ex=collections.defaultdict(list)
for b,a in dead:
    r=row(b,a)
    if not r: k='no row'
    else:
        cp,ce,cs,ts,at,ro,osig,ict=r
        gates=json.loads(osig).get('conditional_gates',[]) if osig else []
        if re.search(r'Gradient',a): k='gradient (needs flat/companion?)'
        elif b in varblocks: k='block has variant_attr'
        elif re.search(r'(Tablet|Mobile)$',a): k='tier sibling'
        elif cp and re.search(r'border-(top-|)?(color|width)|border-color',cp): k='border colour/width (needs style)'
        elif 'isset' in gates or 'not_empty' in gates: k='render gate isset/not_empty'
        elif ce and ce not in ('','wrapper'): k='sub-element (fixture may lack it)'
        else: k='other'
    cat[k]+=1
    if len(ex[k])<5: ex[k].append(f'{b}::{a}')
for k,v in cat.most_common(): print(v,k,ex[k])
cat=collections.Counter(); ex=collections.defaultdict(list)
for b,a in nom:
    r=row(b,a)
    k=(r[4],r[0]) if r else 'no row'
    cat[k]+=1
    if len(ex[k])<3: ex[k].append(f'{b}::{a}')
print('--noMarker'); 
for k,v in cat.most_common(14): print(v,k,ex[k])
print('--untested',collections.Counter((row(b,a) or [None]*3)[2] for b,a in unt))
import os
prov={}
for f in glob.glob('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/*/block.json'):
    b=json.load(open(f,encoding='utf8')); prov[b['name']]=set((b.get('providesContext') or {}).values())
n=sum(1 for b,a in dead if a in prov.get(b,()))
print('dead settings that the block passes to children via providesContext:',n, [f'{b}::{a}' for b,a in dead if a in prov.get(b,())][:6])
print('dead per block top:',collections.Counter(b for b,a in dead).most_common(10))
