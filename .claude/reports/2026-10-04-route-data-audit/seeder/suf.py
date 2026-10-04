import sqlite3,re,collections
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
rows=c.execute("select block_slug,attr_name,role,css_property from block_attributes where source='sgs' and role in ('typography','color','layout','colour-gradient','visual','styling','motion','number-css-px')").fetchall()
def suf(a):
    a=re.sub(r'(Tablet|Mobile|Desktop|Hover)$','',a)
    m=re.findall(r'[A-Z][a-z]*',a)
    return m[-1] if m else a
r=collections.Counter(); u=collections.Counter()
for b,a,ro,cp in rows:
    (r if cp else u)[suf(a)]+=1
for k,v in u.most_common(45): print(k,v,'routed',r[k])
