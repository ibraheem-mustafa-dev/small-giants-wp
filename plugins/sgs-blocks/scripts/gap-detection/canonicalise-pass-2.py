"""
Phase 3.5+ — second canonicalisation pass.

Two fixes:

1. **Whole-name-first lookup.** Before peeling suffixes, check whether the
   raw attr_name (or its lowercased / camelCase variants) matches a slot
   alias directly. Catches cases like `sgsAnimation` where Phase 3.8 added
   `Animation` to property_suffixes AND `sgsAnimation` as an alias of
   slot `animation` — the property peel was winning and stranding stem
   `sgs`. Now the alias lookup wins first.

2. **Expanded alias seeding.** Add high-frequency stems as aliases of
   existing slots so they decompose-and-match cleanly.

Updates ONLY block_attributes.canonical_slot. Does NOT touch role or
derived_selector. Idempotent.
"""
from __future__ import annotations
import json, os, sqlite3, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB",
    str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db")))


# Aliases to add to existing slots — high-impact recurring stems
EXTRA_ALIASES = {
    "animation":   ["stagger", "staggerDelay"],
    "icon":        ["iconSize", "iconValue", "iconPosition"],
    "backgroundMedia": ["background", "bgColor", "bgColour"],
    "text":        ["textAlign", "textTransform"],
    "subheading":  ["subHeadline"],  # idempotent — already there but ensure
    "padding":     ["padding"],
    "margin":      ["margin"],
}

# New canonical slots for standalone concepts
NEW_SLOTS = [
    ("border",       ["borderRadius", "borderColor", "borderColour", "borderWidth", "borderStyle"], "Border-properties container slot"),
    ("variant",      ["style"],                                                                       "Variant/style enum slot"),
    ("layout",       ["layoutType"],                                                                  "Layout-mode slot"),
    ("shadow",       [],                                                                              "Shadow-properties slot"),
    ("overlay",      [],                                                                              "Overlay-properties slot"),
    ("number",       [],                                                                              "Numeric-display slot"),
    ("aspectRatio",  ["aspect"],                                                                      "Aspect-ratio slot"),
    ("min",          ["minHeight", "minWidth"],                                                       "Min-dimension slot (peeled stem)"),
    ("max",          ["maxHeight", "maxWidth"],                                                       "Max-dimension slot"),
    ("rotation",     ["rotate"],                                                                      "Rotation transform slot"),
    ("positionX",    [],                                                                              "X-axis position slot"),
    ("positionY",    [],                                                                              "Y-axis position slot"),
    ("ariaLabel",    [],                                                                              "ARIA label slot (a11y)"),
    ("opacity",      [],                                                                              "Opacity slot"),
    ("autoplay",     [],                                                                              "Autoplay boolean slot"),
    ("autoplaySpeed", [],                                                                             "Autoplay-speed slot"),
    ("showDots",     [],                                                                              "Show-dots boolean slot"),
    ("showArrows",   [],                                                                              "Show-arrows boolean slot"),
    ("showDate",     [],                                                                              "Show-date boolean slot"),
    ("split",        [],                                                                              "Split-layout slot"),
    ("panel",        [],                                                                              "Panel-container slot"),
    ("drawer",       [],                                                                              "Drawer-container slot"),
    ("card",         ["cardStyle"],                                                                   "Card-container slot"),
    ("imageAlt",     ["imageAltText"],                                                                "Image alt-text slot (a11y)"),
    ("letterSpacing", [],                                                                             "Letter-spacing slot"),
    ("hideOn",       ["hideOnMobile", "hideOnTablet", "hideOnDesktop"],                               "Responsive-hide control slot"),
    ("linkOpensNewTab", ["openInNewTab", "target"],                                                   "Link-target control slot"),
]


def main() -> int:
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row

    # === Step 1: insert new slots ===
    inserted = 0
    aliases_added = 0
    for slot, aliases, desc in NEW_SLOTS:
        existing = db.execute("SELECT canonical_slot FROM slot_synonyms WHERE canonical_slot=?", (slot,)).fetchone()
        if existing is None:
            db.execute("INSERT INTO slot_synonyms (canonical_slot, aliases, description) VALUES (?, ?, ?)",
                       (slot, json.dumps(aliases), desc))
            inserted += 1
    # Add extra aliases to existing slots
    for canon, extras in EXTRA_ALIASES.items():
        r = db.execute("SELECT aliases FROM slot_synonyms WHERE canonical_slot=?", (canon,)).fetchone()
        if r is None:
            continue
        current = set(json.loads(r["aliases"])) if r["aliases"] else set()
        merged = current | set(extras)
        if merged != current:
            db.execute("UPDATE slot_synonyms SET aliases=? WHERE canonical_slot=?",
                       (json.dumps(sorted(merged)), canon))
            aliases_added += len(merged - current)
    db.commit()
    print(f"New slots inserted: {inserted}")
    print(f"Aliases added to existing slots: {aliases_added}")

    # === Step 2: rebuild slot lookup map (canonical + all aliases, multiple case variants) ===
    slot_map: dict[str, str] = {}
    for r in db.execute("SELECT canonical_slot, aliases FROM slot_synonyms"):
        canon = r["canonical_slot"]
        forms = {canon}
        if r["aliases"]:
            forms |= set(json.loads(r["aliases"]))
        for f in forms:
            if not f:
                continue
            slot_map[f] = canon
            slot_map[f.lower()] = canon
            # camelCase variant
            cc = f[0].lower() + f[1:] if len(f) > 1 else f.lower()
            slot_map[cc] = canon

    print(f"Slot lookup map: {len(slot_map)} keys for {len({v for v in slot_map.values()})} canonical slots")

    # === Step 3: vocab for peeling ===
    mods = {r[0] for r in db.execute("SELECT suffix FROM modifier_suffixes")}
    props = {r[0] for r in db.execute("SELECT suffix FROM property_suffixes")}

    def peel_longest(name: str, vocab: set[str]) -> tuple[str, str | None]:
        matches = [s for s in vocab if name.endswith(s) and len(name) > len(s)]
        if not matches:
            return name, None
        longest = max(matches, key=len)
        return name[: -len(longest)], longest

    def find_slot(attr_name: str) -> str | None:
        """Whole-name-first lookup, then peel-and-retry."""
        # Pass 1: whole name (catches sgsAnimation → animation)
        for key in (attr_name, attr_name.lower(),
                    attr_name[0].lower() + attr_name[1:] if attr_name else attr_name):
            if key in slot_map:
                return slot_map[key]
        # Pass 2: peel modifiers + one property suffix, retry
        remaining = attr_name
        while True:
            remaining, mod = peel_longest(remaining, mods)
            if not mod:
                break
        remaining, _ = peel_longest(remaining, props)
        if remaining and remaining[0].isupper():
            remaining = remaining[0].lower() + remaining[1:]
        if remaining in slot_map:
            return slot_map[remaining]
        if remaining.lower() in slot_map:
            return slot_map[remaining.lower()]
        return None

    # === Step 4: process rows with NULL canonical_slot ===
    rows = list(db.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NULL"
    ))
    print(f"\nRows with canonical_slot NULL: {len(rows)}")

    updates = []
    for r in rows:
        slot = find_slot(r["attr_name"])
        if slot:
            updates.append((slot, r["id"]))

    print(f"Matched to a slot: {len(updates)}")
    db.executemany("UPDATE block_attributes SET canonical_slot=? WHERE id=?", updates)
    db.commit()

    # Prune resolved gap candidates
    deleted = db.execute("""
        DELETE FROM attribute_gap_candidates
        WHERE proposed_action='new-canonical-slot-needed'
          AND (block_slug, attr_name) IN (
            SELECT block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NOT NULL
          )
    """).rowcount
    db.commit()
    print(f"Pruned {deleted} now-resolved gap candidates")

    # Final stats
    canon = db.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]
    gap_open = db.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0]
    print()
    print(f"Final canonicalised: {canon} / 1343 ({canon/1343*100:.1f}%)")
    print(f"Final gap queue:     {gap_open}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
