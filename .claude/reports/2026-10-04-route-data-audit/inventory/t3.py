import sqlite3,json,collections
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
cnt=collections.Counter(); gates=collections.Counter(); types=collections.Counter()
for (s,) in c.execute("select output_signature from block_attributes where output_signature is not null"):
    try: d=json.loads(s)
    except: cnt['bad']+=1; continue
    types[d.get('type')]+=1
    for k in ('output_function','output_element','output_class','output_role','is_content_or_design'):
        if d.get(k): cnt[k]+=1
    for g in d.get('conditional_gates') or []: gates[g]+=1
print(types, cnt, gates.most_common(12))
# css_element vs output_class agreement
agree=dis=0
for a,e,s in c.execute("select attr_name,css_element,output_signature from block_attributes where css_element is not null and output_signature like '%output_class\":\"sgs%'"):
    oc=json.loads(s)['output_class']; 
    if oc.endswith('__'+e) or (e=='' ): agree+=1
    else: dis+=1
print('css_element vs output_class agree',agree,'disagree',dis)
print(c.execute("select role,count(*) from block_attributes where source in ('sgs','sgs-ext') and css_property is null group by role order by 2 desc limit 15").fetchall())
print('sgs painting-role rows with null css_property:', c.execute("select count(*) from block_attributes b join roles r on r.role_name=b.role where b.source in ('sgs','sgs-ext') and b.css_property is null and r.classification='styling-behaviour'").fetchone())
print(c.execute("select classification, group_concat(role_name) from roles group by 1").fetchall())
print('css_property but no css_element', c.execute("select source,count(*) from block_attributes where css_property is not null and css_element is null group by 1").fetchall())
print('canonical_slot vs css_element same', c.execute("select sum(canonical_slot=css_element), sum(canonical_slot!=css_element) from block_attributes where canonical_slot is not null and css_element is not null").fetchone())
