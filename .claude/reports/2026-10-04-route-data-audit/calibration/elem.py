import json,re,glob
C='C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/cache/'
caches={}
for f in glob.glob(C+'*.json'):
    if f.endswith('.tree.json'): continue
    j=json.load(open(f)); caches[j['block']]=j
def kebab(s): return re.sub(r'([a-z0-9])([A-Z])',r'\1-\2',s).lower()
def present(block,el):
    j=caches[block]; paths=list(j['elements'])
    if el in (None,'wrapper','root'): return 'root', ['']
    k=kebab(el)
    hits=[p for p in paths if re.search(r'__%s(?![\w-])'%re.escape(k),p) or re.search(r'(^|[ .])\.?(sgs-)?%s(?![\w-])'%re.escape(k),p)]
    if hits: return 'yes',hits
    # loose: token contained
    loose=[p for p in paths if k in p]
    return ('loose' if loose else 'no'),loose
