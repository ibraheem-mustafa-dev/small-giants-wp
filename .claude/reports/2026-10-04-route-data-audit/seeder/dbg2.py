import importlib.util,sys,sqlite3
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
short=sys.argv[1]; attrs=sys.argv[2:]
d=es.BLOCKS_DIR/short
raw=(d/'render.php').read_text(encoding='utf-8'); php=es._strip_php_comments(raw)
for sig,p in es._SHARED_RENDER_FILES.items():
    if sig in raw: php+='\n'+es._read_shared_render_file(p); print('widened with',p.name)
va=es._build_php_var_attr_map(php)
known=es._load_known_css_props(sqlite3.connect('fw-copy.db'))
r,_,_=es._attr_to_raw_props_php(php,known,va,short)
vc=es._attrs_from_value_composer_calls(php,va)
cm=es._attrs_from_config_map_calls(php,short)
for a in attrs: print(a,'raw',r.get(a),'vc',vc.get(a),'cm',cm[0].get(a),cm[1].get(a),cm[2].get(a))
