import re,glob,os,json
P='C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/'
def rd(f):
    try: return open(f,encoding='utf8',errors='ignore').read()
    except: return ''
INC=''.join(rd(f) for f in glob.glob(P+'includes/**/*.php',recursive=True))
SUFFIX=r'(FontSize|FontFamily|FontWeight|FontStyle|LineHeight|LetterSpacing|TextTransform|TextDecoration|TextAlign|TextWrap|Colour\w*|Bg\w*|Background\w*|Border\w*|Radius|Padding|Shadow\w*|Opacity\w*)$'
TYPO=r'(FontSize|FontFamily|FontWeight|FontStyle|LineHeight|LetterSpacing|TextTransform|TextDecoration|TextAlign|TextWrap)'
_cache={}
def files(short):
    if short in _cache: return _cache[short]
    d=P+'src/blocks/'+short+'/'
    txt=''.join(rd(f) for f in glob.glob(d+'**/*.php',recursive=True))
    inc=set(re.findall(r"includes/([\w./-]+\.php)",txt))
    full=txt+''.join(rd(P+'includes/'+i) for i in inc)
    _cache[short]=(txt,full); return _cache[short]
def readpath(block,attr):
    short=block[4:]; txt,full=files(short)
    if re.search(r"""['"]%s['"]"""%re.escape(attr),full): return 'literal'
    if re.search(r"""['"]%s['"]"""%re.escape(attr),INC): return 'literal-inc'
    m=re.match(r'^(.*?)'+TYPO+'(Hover|Open|Current)?$',attr)
    if m:
        pre=m.group(1)
        if re.search(r"sgs_typography_css_rule\(\s*\$\w+,\s*'%s'"%re.escape(pre),full) or re.search(r"typography\w*\([^;]*'%s'"%re.escape(pre),full): return 'typo-prefix'
    m=re.match(r'^([a-z][a-zA-Z]*?)(Colour|Border|Padding|Radius|Font|Background|Text|Bg)',attr)
    if m:
        pre=m.group(1)
        if re.search(r"\(\s*[^;]{0,80}'%s'\s*,"%re.escape(pre),full): return 'prefix-call'
    return 'none'
