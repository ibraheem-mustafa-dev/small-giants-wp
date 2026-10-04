import re, json, sqlite3, collections, sys
from pathlib import Path
ROOT=Path(r'C:/Users/Bean/Projects/small-giants-wp')
BL=ROOT/'plugins/sgs-blocks/src/blocks'
INC=ROOT/'plugins/sgs-blocks/includes'
CACHE=ROOT/'scripts/computed-route/cache'
H=json.load(open('helpers.json'))
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
rows=c.execute("select block_slug,attr_name,role,css_property,css_element,css_state,css_tier,box_family,tier_shape,source,enum_values,attr_type from block_attributes where source in ('sgs','sgs-ext','sgs-fx')").fetchall()
def strip_php(t): return re.sub(r'/\*.*?\*/','',re.sub(r'(?m)^\s*(//|#).*$','',t),flags=re.S)
def strip_js(t): return re.sub(r'/\*.*?\*/','',re.sub(r'(?m)^\s*//.*$','',t),flags=re.S)
def split_args(s,i):
    d=1;cur=[];out=[];q=None
    while i<len(s) and d>0:
        ch=s[i]
        if q:
            cur.append(ch)
            if ch==chr(92): cur.append(s[i+1:i+2]); i+=2; continue
            if ch==q: q=None
        elif ch in "'\"": q=ch;cur.append(ch)
        elif ch=='(': d+=1;cur.append(ch)
        elif ch==')':
            d-=1
            if d==0: out.append(''.join(cur)); return out
            cur.append(ch)
        elif ch==',' and d==1: out.append(''.join(cur));cur=[]
        else: cur.append(ch)
        i+=1
    return out
inc_text={f:strip_php(f.read_text(encoding='utf-8',errors='ignore')) for f in INC.rglob('*.php')}
blk={}
for d in BL.iterdir():
    bj=d/'block.json'
    if not bj.exists(): continue
    j=json.load(open(bj,encoding='utf-8'))
    slug=j['name']
    r=d/'render.php'
    info={'dir':d,'bj_attrs':set(j.get('attributes',{}).keys()),
      'render':strip_php(r.read_text(encoding='utf-8',errors='ignore')) if r.exists() else '',
      'sib':{p.name:strip_php(p.read_text(encoding='utf-8',errors='ignore')) for p in d.rglob('*.php') if p.name!='render.php'},
      'css':''.join(p.read_text(encoding='utf-8',errors='ignore') for p in list(d.glob('style.css'))+list(d.glob('style.scss'))),
      'view':''.join(strip_js(p.read_text(encoding='utf-8',errors='ignore')) for p in d.rglob('view*.js')),
      'edit':''.join(strip_js(p.read_text(encoding='utf-8',errors='ignore')) for p in d.rglob('*.js') if not p.name.startswith('view')),
    }
    # helper-prefix reads per file
    hp={}
    for fname,txt in [('render.php',info['render'])]+list(info['sib'].items()):
        for fn,hd in H.items():
            for m in re.finditer(re.escape(fn)+r'\s*\(',txt):
                for a in split_args(txt,m.end()):
                    lm=re.fullmatch(r"\s*'([a-z][A-Za-z0-9]*|)'\s*",a)
                    if lm is None: continue
                    p=lm.group(1)
                    for s in hd['sufs']:
                        an=p+s if p else s[0].lower()+s[1:]
                        hp.setdefault(an,set()).add((fname,fn))
    info['hp']=hp
    blk[slug]=info
def lit(attr,txt): return re.search(r"""['"]"""+re.escape(attr)+r"""['"]""",txt) is not None
cal={}
for f in CACHE.glob('*.json'):
    if f.name.endswith('.tree.json'): continue
    j=json.load(open(f,encoding='utf-8'));cal[j.get('block')]=j
out=[]
for b,a,role,cp,ce,cs,ct,bf,ts,src,ev,at in rows:
    i=blk.get(b)
    rec=dict(block=b,attr=a,role=role,cp=cp,ce=ce,cs=cs,ct=ct,bf=bf,ts=ts,src=src,enum=bool(ev),type=at)
    if i:
        rec['in_bj']=a in i['bj_attrs']
        rec['R']=lit(a,i['render'])
        rec['S']=[n for n,t in i['sib'].items() if lit(a,t)]
        rec['HP']=sorted({f'{x}::{y}' for x,y in i['hp'].get(a,())})
        rec['V']=lit(a,i['view']) or bool(re.search(r'\b'+re.escape(a)+r'\b',i['view']))
        rec['E']=bool(re.search(r'\b'+re.escape(a)+r'\b',i['edit']))
        rec['CSSname']=('--'+re.sub(r'([A-Z])',lambda m:'-'+m.group(1).lower(),a)) in i['css']
    rec['I']=sorted(str(f.relative_to(INC)) for f,t in inc_text.items() if lit(a,t))[:5] if src=='sgs' else []
    cj=cal.get(b)
    if cj:
        s=cj['settings'].get(a)
        rec['cal']= 'settings' if s else ('dead' if a in cj['dead'] else ('noMarker' if a in cj['noMarker'] else ('discovered' if a in cj.get('discovered',{}) else ('rejected' if any((x.get('name') if isinstance(x,dict) else x)==a for x in cj.get('rejected',[])) else None))))
        if s: rec['cal_slot']=s['slot']; rec['cal_prop']=s['property']; rec['cal_state']=s.get('state')
        if a in cj.get('discovered',{}): rec['disc']={k:v.get('slots') for k,v in cj['discovered'][a].items()}
    out.append(rec)
json.dump(out,open('census.json','w'),indent=0,default=list)
print(len(out))
