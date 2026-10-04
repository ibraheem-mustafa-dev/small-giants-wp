import sqlite3
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
ts=[r[0] for r in c.execute("select name from sqlite_master where type='table' order by name")]
for t in ts:
    n=c.execute(f'select count(*) from "{t}"').fetchone()[0]
    cols=[r[1] for r in c.execute(f'pragma table_info("{t}")')]
    fills=[]
    for col in cols:
        f=c.execute(f'select count(*) from "{t}" where "{col}" is not null and cast("{col}" as text)!=\'\' and cast("{col}" as text) not in (\'[]\',\'{{}}\',\'null\')').fetchone()[0]
        fills.append(f"{col}:{f}")
    print(f"## {t} ({n})  "+", ".join(fills))
