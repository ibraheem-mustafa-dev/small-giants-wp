import importlib.util, json, re
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
es.DB_PATH=Path('fw-copy.db'); es.CSS_PROPERTY_CLASSIFICATIONS_PATH=Path('patched-classifications.json')
orig=es._split_php_statements
es._split_php_statements=lambda s: [re.sub(r'^[\s}]*(?:else\s*\{|\{)?\s*','',x) for x in orig(s)]
es.extract_css_property_and_layer()
def load(p): return {(e['slug'],e['attr']):e['fields'] for e in json.load(open(p,encoding='utf-8'))['entries']}
a=load('regen-classifications.json'); b=load('patched-classifications.json')
import collections
n=collections.Counter(); ex=collections.defaultdict(list)
for k in set(a)|set(b):
    for f in ('css_property','css_element','css_state'):
        x=(a.get(k) or {}).get(f); y=(b.get(k) or {}).get(f)
        if x!=y: n[f]+=1; ex[f].append((k[0][4:]+'::'+k[1],x,y))
print(n)
for f in ex: print(f,ex[f][:12])
