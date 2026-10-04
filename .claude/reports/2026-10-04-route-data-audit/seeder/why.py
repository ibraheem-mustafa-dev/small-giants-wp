import importlib.util,json,re,collections
from pathlib import Path
P=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py')
spec=importlib.util.spec_from_file_location('es',P); es=importlib.util.module_from_spec(spec); spec.loader.exec_module(es)
exec(open('tab.py').read().split('src=sys.argv')[0])
KNOWN={'sgs_button_element_style_css','sgs_typography_css_rule','sgs_emit_state_colour_css','sgs_resolve_text_colour_or_gradient','sgs_overlay_decls','sgs_fill_decls','sgs_fill_states_css','sgs_text_decls','sgs_text_states_css','sgs_border_states_css'}
ROOT=Path(r'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks')
allcss=''.join(p.read_text(encoding='utf-8',errors='ignore') for p in (ROOT/'src/blocks').rglob('style.css'))+''.join(p.read_text(encoding='utf-8',errors='ignore') for p in (ROOT/'src').rglob('*.css') if 'blocks' not in str(p))
cache={}
def src(short):
    if short not in cache:
        t=es._strip_php_comments((es.BLOCKS_DIR/short/'render.php').read_text(encoding='utf-8',errors='ignore'))
        stm=es._split_php_statements(t)
        va=es._build_php_var_attr_map(t)
        ownc=''.join(p.read_text(encoding='utf-8',errors='ignore') for p in (es.BLOCKS_DIR/short).glob('style.*css'))
        cache[short]=(t,stm,va,ownc)
    return cache[short]
out=collections.Counter(); ex=collections.defaultdict(list); helpers=collections.Counter(); hex_=collections.defaultdict(list)
for r in d:
    if r['src']!='sgs' or r['attr'].endswith('Unit') or bucket(r)!='render-direct' or r['role'] not in PAINT or r['cp'] or r['enum']: continue
    short=r['block'][4:]; a=r['attr']
    t,stm,va,ownc=src(short)
    vars_={v for v,at in va.items() if at==a}
    # one more hop
    for _ in range(2):
        for s in stm:
            m=re.match(r'\s*\$(\w+)\s*=',s)
            if m and any(re.search(r'\$'+re.escape(v)+r'\b',s.split('=',1)[1]) for v in vars_): vars_.add(m.group(1))
    pat=re.compile(r"""\[\s*['"]"""+re.escape(a)+r"""['"]\s*\]"""+('|'+'|'.join(r'\$'+re.escape(v)+r'\b' for v in vars_) if vars_ else ''))
    rel=[s for s in stm if pat.search(s)]
    txt='\n'.join(rel)
    calls={c for c in re.findall(r'(sgs_\w+)\s*\(',txt) if not re.match(r'sgs_(sanitise|sanitize|css_length|colour_value|esc|responsive_sanitise|clamp|normalise|css_keyword|safe|is_|get_|has_|bool|attr$|typography_attr|font_size_value|css_gradient_value|css_number)',c)}
    cprops=set(re.findall(r'(--sgs-[a-z0-9-]+)',txt))
    tags=[]
    if calls-KNOWN: tags.append('unregistered-helper')
    if cprops:
        consumed_own=any(cp in ownc for cp in cprops); consumed_any=any(allcss.count(cp)>0 for cp in cprops)
        tags.append('custom-prop-own-css' if consumed_own else ('custom-prop-other-css' if consumed_any else 'custom-prop-unconsumed-in-css'))
    if re.search(r"class|sgs-[a-z-]+--",txt) and not cprops: tags.append('class-modifier')
    if re.search(r"data-",txt): tags.append('data-attr')
    if re.search(r"=>\s*\$|=>\s*\(?\s*\$attributes",txt) and not tags: tags.append('array-forwarded')
    if not tags: tags.append('gate-or-other')
    k=tags[0]; out[k]+=1; ex[k].append(f"{short}::{a}")
    for c in calls-KNOWN: helpers[c]+=1; hex_[c].append(f"{short}::{a}")
for k,v in out.most_common(): print(k,v,ex[k][:8])
print('unregistered helpers:',[(h,n,hex_[h][:2]) for h,n in helpers.most_common(25)])
json.dump({k:v for k,v in ex.items()},open('why.json','w'),indent=1)
