import importlib.util,re
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
orig=es._split_php_statements
tot=0; blocks=[]
for d in sorted(es.BLOCKS_DIR.iterdir()):
    r=d/'render.php'
    if not r.exists(): continue
    php=es._strip_php_comments(r.read_text(encoding='utf-8',errors='ignore'))
    a=es._build_php_selector_var_map(php,d.name)[0]
    es._split_php_statements=lambda s: [re.sub(r'^[\s}]*(?:else\s*\{|\{)?\s*','',x) for x in orig(s)]
    b=es._build_php_selector_var_map(php,d.name)[0]
    es._split_php_statements=orig
    miss={k:v for k,v in b.items() if k not in a}
    if miss: tot+=len(miss); blocks.append((d.name,miss))
print('missed selector vars',tot,'blocks',len(blocks))
for x in blocks[:40]: print(x)
