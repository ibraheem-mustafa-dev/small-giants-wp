import sqlite3,re,collections
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
rows=c.execute("select block_slug,attr_name,role,source,attr_type from block_attributes where source in ('sgs','sgs-ext') and css_property is null and role in ('typography','color','colour-gradient','layout','visual','styling','colour-text')").fetchall()
cat=collections.Counter()
ex=collections.defaultdict(list)
for b,a,r,s,t in rows:
    if re.search(r'Unit(Tablet|Mobile)?$',a): k='unit-companion'
    elif re.search(r'(Tablet|Mobile)$',a): k='tier-sibling'
    elif re.search(r'Gradient',a): k='gradient'
    elif re.search(r'Hover',a): k='hover'
    else: k='other'
    cat[(s,k)]+=1
    if len(ex[(s,k)])<6: ex[(s,k)].append(f"{b}::{a}({r})")
print(len(rows)); 
for k,v in cat.most_common(): print(k,v,ex[k])
