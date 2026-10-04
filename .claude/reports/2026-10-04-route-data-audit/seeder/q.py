import sqlite3,sys
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
for q in sys.argv[1:]:
    for r in c.execute(q).fetchall(): print(r)
    print('---')
