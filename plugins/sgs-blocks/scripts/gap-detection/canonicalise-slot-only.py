"""One-shot — canonicalise rows where canonical_slot IS NULL using extended vocab.

Updates ONLY block_attributes.canonical_slot. Does NOT touch role or
derived_selector (preserves backfilled JSON data).

Idempotent: re-running produces zero updates once all rows are filled.
"""
from __future__ import annotations
import json, os, sqlite3, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB",
    str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db")))

db = sqlite3.connect(str(DB_PATH))
db.row_factory = sqlite3.Row

# Load vocab
# Post-D99: slot_synonyms dropped; reads slots table (scope='element').
# slot_name replaces canonical_slot.
mods = {r["suffix"] for r in db.execute("SELECT suffix FROM modifier_suffixes")}
props = {r["suffix"] for r in db.execute("SELECT suffix FROM property_suffixes")}
slot_map = {}
for r in db.execute("SELECT slot_name, aliases FROM slots WHERE scope = 'element'"):
    slot_map[r["slot_name"]] = r["slot_name"]
    aliases = json.loads(r["aliases"]) if r["aliases"] else []
    for a in aliases:
        slot_map[a] = r["slot_name"]
        slot_map[a.lower()] = r["slot_name"]
        # also handle camelCase aliases case-insensitively
        slot_map[a[0].lower() + a[1:] if a else a] = r["slot_name"]

print(f"Loaded {len(slot_map)} slot lookup keys, {len(props)} property suffixes, {len(mods)} modifier suffixes")


def peel_longest(name: str, vocab: set[str]) -> tuple[str, str | None]:
    matches = [s for s in vocab if name.endswith(s) and len(name) > len(s)]
    if not matches:
        return name, None
    longest = max(matches, key=len)
    return name[: -len(longest)], longest


def decompose(attr_name: str) -> str:
    remaining = attr_name
    # repeated modifier peel
    while True:
        remaining, mod = peel_longest(remaining, mods)
        if not mod:
            break
    # one property suffix peel
    remaining, _ = peel_longest(remaining, props)
    # lowercase first char
    if remaining and remaining[0].isupper():
        remaining = remaining[0].lower() + remaining[1:]
    return remaining


# Find rows needing canonicalisation
rows = list(db.execute(
    "SELECT id, block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NULL"
))
print(f"Rows with canonical_slot NULL: {len(rows)}")

updates = []
matched = 0
for r in rows:
    stem = decompose(r["attr_name"])
    if stem in slot_map:
        updates.append((slot_map[stem], r["id"]))
        matched += 1

print(f"Stems matching slot vocab: {matched}")

# Apply updates
db.executemany("UPDATE block_attributes SET canonical_slot=? WHERE id=?", updates)
db.commit()

# Stats
after = db.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]
print(f"After: {after} rows canonicalised")

# Prune gap candidates that are now canonicalised
deleted = db.execute("""
    DELETE FROM attribute_gap_candidates
    WHERE proposed_action='new-canonical-slot-needed'
      AND (block_slug, attr_name) IN (
        SELECT block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NOT NULL
      )
""").rowcount
db.commit()
print(f"Pruned {deleted} now-resolved gap candidates")

gap_after = db.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0]
print(f"Gap canonicalisable now: {gap_after}")
db.close()
