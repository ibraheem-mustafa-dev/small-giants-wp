import re,glob,os,json
P='C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/'
def rd(f):
    try: return open(f,encoding='utf8',errors='ignore').read()
    except: return ''
out={}
for d in glob.glob(P+'src/blocks/*/'):
    short=os.path.basename(os.path.normpath(d))
    txt=''.join(rd(f) for f in glob.glob(d+'*.php'))
    inc=set(re.findall(r"includes/([\w./-]+\.php)",txt))
    full=txt+''.join(rd(P+'includes/'+i) for i in inc)
    out[short]=bool(re.search(r'sgs_block_background_layer_css|sgs_button_element_style_css\([^;]*,\s*true',full))
json.dump(out,open('layer.json','w'))
print(sorted(k for k,v in out.items() if v))
