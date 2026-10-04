import sqlite3,re,collections
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
suf=sorted(c.execute("select suffix,css_property from property_suffixes where css_property is not null").fetchall(),key=lambda x:-len(x[0]))
rows=c.execute("select b.block_slug,b.attr_name,b.role,b.canonical_slot,b.css_element from block_attributes b left join roles r on r.role_name=b.role where b.source in ('sgs','sgs-ext') and b.css_property is null and coalesce(r.classification,'')!='content-bearing'").fetchall()
hit=collections.Counter(); ex=[]
for b,a,r,cs,ce in rows:
    base=re.sub(r'(Hover)?(Tablet|Mobile|Desktop)?$','',a)
    m=next((p for s,p in suf if base.endswith(s) and base!=s.lower()),None)
    if m:
        hit['suffix-derivable']+=1
        if ce or cs: hit['…and has element/slot']+=1
        if len(ex)<8: ex.append(f'{b}::{a}->{m} @ {ce or cs}')
print(len(rows),hit,ex)
