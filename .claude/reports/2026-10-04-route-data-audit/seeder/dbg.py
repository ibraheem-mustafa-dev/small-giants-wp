import importlib.util,sys
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
short=sys.argv[1]; attrs=sys.argv[2:]
d=es.BLOCKS_DIR/short
php=es._strip_php_comments((d/'render.php').read_text(encoding='utf-8'))
css=(d/'style.css').read_text(encoding='utf-8')
import sqlite3
known=es._load_known_css_props(sqlite3.connect('fw-copy.db'))
consumed, gp, ss, state_of, element_of = es._custom_props_consumed(css, short)
va=es._build_php_var_attr_map(php)
raw,st,el=es._attr_to_raw_props_php(php,known,va,short)
hp,he=es._attrs_from_helper_calls(php,set(attrs),short)
sce,scs=es._attrs_from_state_colour_helper_calls(php,set(attrs),short,va)
for a in attrs:
    toks=raw.get(a,set())
    chain=[es._resolve_var_chain(t,consumed,gp,ss,state_of,element_of) for t in toks if t.startswith('--sgs-')]
    print(a,'raw',toks,'php_el',el.get(a),'helper',hp.get(a),he.get(a),'stcol',sce.get(a),'chain_elems',[c[3] for c in chain])
m=es._build_php_selector_var_map(php,short)
print({k:v for k,v in m[0].items()}); 
for s in es._split_php_statements(php):
    if 'label_selector =' in s: print(repr(s[:300]))
