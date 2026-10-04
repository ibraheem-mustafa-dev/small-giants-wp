import json,collections
exec(open('tab.py').read().split('src=sys.argv')[0])
why=json.load(open('why.json')); whyof={}
for k,v in why.items():
    for x in v: whyof[x]=k
CORE={'typography','color','colour-gradient','visual','layout','styling','number-css-px','number-css-percent','motion','spacing-token'}
c=collections.Counter(); ex=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or r['cp'] or r['attr'].endswith('Unit'): continue
    grp='core' if r['role'] in CORE else ('mode' if r['role'] in PAINT else 'nonpaint')
    if grp=='nonpaint': continue
    b=bucket(r); key=r['block'][4:]+'::'+r['attr']
    if b=='helper-prefix':
        cl='A helper read, suffix not in classifier map' if any(h.startswith('render.php') for h in r['HP']) else 'B sibling-file'
    elif b=='sibling-php': cl='B sibling-file'
    elif b=='includes-literal':
        cl='C1 container-wrapper delegated' if any('container-wrapper' in x for x in r['I']) else 'C2 other includes emitter'
    elif b=='render-direct':
        w=whyof.get(key,'enum-or-mode')
        cl={'unregistered-helper':'D1 unregistered emitter helper','custom-prop-other-css':'D2 var consumed by another block css','array-forwarded':'D3 forwarded to nested renderer','custom-prop-own-css':'D4 own-css var chain unresolved','class-modifier':'E class modifier','data-attr':'E data-attr/JS','gate-or-other':'D5 other/unclassified'}.get(w,'E enum/mode (render)')
    elif b in('view-js',): cl='E view.js runtime'
    else: cl='F not read at render ('+b+')'
    cov='discovered' if r.get('cal')=='discovered' else ('enum-undiscovered' if r['enum'] else 'scalar')
    c[(cl,grp,cov)]+=1; ex[(cl,grp,cov)].append(key)
for k,v in sorted(c.items()): print(k,v,ex[k][:4])
print('TOTAL core scalar invisible:',sum(v for k,v in c.items() if k[1]=='core' and k[2]=='scalar'))
