import sqlite3,re,collections,glob,os
R='C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/'
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
rows=c.execute("select block_slug,attr_name,role from block_attributes b where source='sgs' and css_property is null and role in ('typography','color','colour-gradient','layout','visual','styling','colour-text','position','spacing-token','number-css-px','number-css-percent') and attr_name not like '%Unit' and attr_name not like '%UnitTablet' and attr_name not like '%UnitMobile'").fetchall()
inc=''.join(open(f,encoding='utf8',errors='ignore').read() for f in glob.glob(R+'includes/**/*.php',recursive=True))
cache={}
def files(b):
    if b in cache: return cache[b]
    d=R+'src/blocks/'+b.split('/')[1]+'/'
    rd=open(d+'render.php',encoding='utf8',errors='ignore').read() if os.path.exists(d+'render.php') else ''
    sib=''.join(open(f,encoding='utf8',errors='ignore').read() for f in glob.glob(d+'*.php') if not f.endswith('render.php'))
    css=''.join(open(f,encoding='utf8',errors='ignore').read() for f in glob.glob(d+'*.css'))
    js=''.join(open(f,encoding='utf8',errors='ignore').read() for f in glob.glob(d+'view*.js'))
    cache[b]=(rd,sib,css,js); return cache[b]
cat=collections.Counter(); ex=collections.defaultdict(list)
for b,a,r in rows:
    rd,sib,css,js=files(b)
    q=re.compile(r"['\"]"+re.escape(a)+r"['\"]")
    if q.search(rd): k='render.php literal (helper/composer call not traced)'
    elif q.search(sib): k='sibling php only'
    elif q.search(inc): k='includes/ literal'
    elif q.search(js): k='view.js only'
    else: k='no literal anywhere (prefix-built or dead)'
    cat[k]+=1
    if len(ex[k])<5: ex[k].append(f'{b}::{a}')
print(len(rows))
for k,v in cat.most_common(): print(v,k,ex[k])
