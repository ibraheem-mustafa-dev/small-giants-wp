import json,collections,sys
d=json.load(open('census.json'))
PAINT={'typography','color','layout','colour-gradient','visual','styling','motion','number-css-px','number-css-percent','spacing-token','css-gate','position','select-from-enum','enum-mode','enum-class-probe','behaviour','image-object','css-modifier'}
def bucket(r):
    if r.get('in_bj') is None: return 'no-block-dir'
    if r['HP']: return 'helper-prefix'
    if r['R']: return 'render-direct'
    if r['S']: return 'sibling-php'
    if r['I']: return 'includes-literal'
    if r['V']: return 'view-js'
    if r['E']: return 'edit-only'
    return 'none'
src=sys.argv[1]
t=collections.defaultdict(lambda:[0,0])
for r in d:
    if r['src']!=src: continue
    if r['attr'].endswith('Unit'): continue
    k=(bucket(r), 'paint' if r['role'] in PAINT else 'nonpaint')
    t[k][0 if r['cp'] else 1]+=1
for k in sorted(t): print(k,'routed=%d unrouted=%d'%tuple(t[k]))
