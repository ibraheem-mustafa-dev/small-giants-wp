import importlib.util, json, sys
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
es.DB_PATH=Path('fw-copy.db')
es.CSS_PROPERTY_CLASSIFICATIONS_PATH=Path('regen-classifications.json')
st=es.extract_css_property_and_layer()
json.dump({'unresolved':{f'{k[0]}::{k[1]}':v for k,v in st['unresolved_reasons'].items()} if isinstance(st['unresolved_reasons'],dict) else st['unresolved_reasons']},open('unresolved.json','w'),indent=1,default=str)
print({k:(v if isinstance(v,(int,str)) else len(v)) for k,v in st.items()})
