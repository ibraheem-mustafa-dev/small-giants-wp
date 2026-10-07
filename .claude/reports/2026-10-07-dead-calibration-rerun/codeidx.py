import os,re,json,glob
P='C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/'
def read(f):
    try: return open(f,encoding='utf8',errors='ignore').read()
    except: return ''
inc=''.join(read(f) for f in glob.glob(P+'includes/**/*.php',recursive=True))
ext=''.join(read(f) for f in glob.glob(P+'src/blocks/extensions/**/*.php',recursive=True)+glob.glob(P+'includes/extensions/**/*.php',recursive=True))
cache={}
def blocksrc(short):
    if short in cache: return cache[short]
    d=P+'src/blocks/'+short+'/'
    php=''.join(read(f) for f in glob.glob(d+'**/*.php',recursive=True))
    view=''.join(read(f) for f in glob.glob(d+'**/*.js',recursive=True) if re.search(r'view|flyout|panel-render|front',f) )
    css=''.join(read(f) for f in glob.glob(d+'**/*.css',recursive=True) if 'editor' not in f)
    cache[short]=(php,view,css); return cache[short]
def reads(short,attr):
    php,view,css=blocksrc(short)
    pat=re.compile(r"""['"]%s['"]"""%re.escape(attr))
    return {'blockphp':bool(pat.search(php)),'inc':bool(pat.search(inc)),'view':bool(pat.search(view))}
