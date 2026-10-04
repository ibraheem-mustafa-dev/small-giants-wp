import sqlite3
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
cols=[r[1] for r in c.execute('pragma table_info(block_attributes)')]
srcs=[r[0] for r in c.execute('select distinct source from block_attributes')]
print('source counts',c.execute('select source,count(*) from block_attributes group by source').fetchall())
for col in cols:
    out=[]
    for s in srcs:
        n=c.execute(f"select count(*) from block_attributes where source=? and {col} is not null and cast({col} as text) not in ('','[]','{{}}','null')",(s,)).fetchone()[0]
        out.append(f"{s}={n}")
    print(col, ' '.join(out))
for col in ['canonical_slot','output_signature','derived_selector','equivalent_implementations','inspector_control_type','emit_shape','alt_companion_attr','css_layer','tier_shape','canonical_slot_aliases','description']:
    print('---',col)
    for r in c.execute(f"select block_slug,attr_name,{col} from block_attributes where {col} is not null and {col}!='' and source='sgs' order by random() limit 3"): print('  ',r)
print(c.execute("select tier_shape,count(*) from block_attributes group by 1").fetchall())
print(c.execute("select inspector_control_type,count(*) from block_attributes where source in ('sgs','sgs-ext') group by 1 order by 2 desc limit 30").fetchall())
