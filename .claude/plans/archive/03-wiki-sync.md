# Spec 03: Wiki Sync Script
**Target:** Sonnet agent | **Time:** 20-30 min

New wiki-sync subcommand for sgs-db.py. Bidirectional sync wiki .md <-> SQLite.

**File:** C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py

**Commands:**
- python sgs-db.py wiki-sync (both)
- python sgs-db.py wiki-sync --to-db (frontmatter -> DB grade field)
- python sgs-db.py wiki-sync --to-wiki (DB -> stubs)
- python sgs-db.py wiki-sync --dry-run

**Rules:** cmd_wiki_sync() function, backup DB, regex YAML parse (no pyyaml), print summary, do NOT modify existing code.

**Verify:** dry-run shows changes, stats unchanged, block sgs/hero unchanged.