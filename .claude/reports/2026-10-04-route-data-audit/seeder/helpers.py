"""Index every includes/ PHP function that takes a $prefix-like param, and the suffixes it reads."""
import re, json
from pathlib import Path
INC=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/includes')
FN=re.compile(r'function\s+(sgs_\w+)\s*\(([^)]*)\)')
funcs={}
for f in INC.rglob('*.php'):
    t=f.read_text(encoding='utf-8',errors='ignore')
    ms=list(FN.finditer(t))
    for i,m in enumerate(ms):
        body=t[m.end(): ms[i+1].start() if i+1<len(ms) else len(t)]
        params=m.group(2)
        pm=re.search(r'\$(prefix|attr_prefix|p|key_prefix|pfx)\b',params)
        if not pm: continue
        pname=pm.group(1)
        sufs=set(re.findall(r"'([A-Z][A-Za-z0-9]+)'",body))
        calls=set(re.findall(r'(sgs_\w+)\s*\(',body))
        funcs[m.group(1)]={'file':str(f.relative_to(INC)),'param':pname,'sufs':sufs,'calls':calls}
# transitive closure
changed=True
while changed:
    changed=False
    for n,d in funcs.items():
        for c in list(d['calls']):
            if c in funcs and c!=n:
                new=funcs[c]['sufs']-d['sufs']
                if new: d['sufs']|=new; changed=True
json.dump({k:{'file':v['file'],'sufs':sorted(v['sufs'])} for k,v in funcs.items()},open('helpers.json','w'),indent=1)
print(len(funcs))
for k,v in sorted(funcs.items()): print(k,v['file'],len(v['sufs']))
