import json,re,collections
from pathlib import Path

from censuslib import strip_php, split_args
exec('def split_args'+open('census.py').read().split('def split_args')[1].split('inc_text=')[0])
H=json.load(open('helpers.json'))
INC=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/includes')
cand=collections.defaultdict(set)
for f in INC.rglob('*.php'):
    t=strip_php(f.read_text(encoding='utf-8',errors='ignore'))
    for fn,hd in H.items():
        for m in re.finditer(re.escape(fn)+r'\s*\(',t):
            for a in split_args(t,m.end()):
                lm=re.fullmatch(r"\s*'([a-z][A-Za-z0-9]*)'\s*",a)
                if lm:
                    for s in hd['sufs']: cand[lm.group(1)+s].add(f.name+'::'+fn)
d=json.load(open('census.json'))
exec(open('tab.py').read().split('src=sys.argv')[0])
CORE={'typography','color','colour-gradient','visual','layout','styling','number-css-px','number-css-percent','motion','spacing-token'}
hit=collections.Counter(); miss=[]
for r in d:
    if r['src']!='sgs' or r['cp'] or r['attr'].endswith('Unit') or r['role'] not in CORE: continue
    if bucket(r) not in ('none','edit-only'): continue
    if r['attr'] in cand: hit[sorted(cand[r['attr']])[0]]+=1
    else: miss.append(r['block'][4:]+'::'+r['attr'])
print(hit.most_common()); print(len(miss),miss[:40])
