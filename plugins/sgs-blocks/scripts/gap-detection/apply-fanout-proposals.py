"""
Spec 15 Phase 3.5 — Apply fanout proposals with tight-vocab rule.

Parses the 5 fanout reports (phase-3.5-fanout-a1..a5.md), applies per-attr
canonical_slot + role from the proposals, but routes through a collapse
map so the framework gets 18 cross-cutting slots, not 52.

Tight-vocab rule per Bean (2026-05-12):
- Accept Tier 1 cross-cutting slots verbatim (used by 3+ blocks)
- Collapse Tier 2 single-feature toggles to `options` slot
- Redirect Tier 3 proposals to existing slots

Idempotent. Updates ONLY canonical_slot + role. Does NOT touch
derived_selector (preserves backfilled JSON values).
"""
from __future__ import annotations
import json, os, re, sqlite3, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB",
    str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db")))
REPO = Path(__file__).resolve().parents[4]
REPORTS_DIR = REPO / ".claude" / "reports"

# Tier 1 — cross-cutting slots to accept verbatim
NEW_CROSS_CUTTING_SLOTS = [
    ("focusRing",     [], "Focus-ring outline (a11y) — width / colour / offset / opacity"),
    ("backdrop",      [], "Backdrop / scrim — modal / popup / drawer overlay"),
    ("zIndex",        [], "z-index stacking order"),
    ("accent",        [], "Accent colour for interactive states (link underline, focus, hover)"),
    ("parallax",      [], "Scroll-parallax intensity / behaviour"),
    ("breakpoint",    [], "Responsive breakpoint threshold (px)"),
    ("overflow",      [], "CSS overflow control"),
    ("flip",          [], "Mirror / scaleX(-1) transform toggle"),
    ("lazyLoad",      [], "Defer asset load until viewport intersection"),
    ("loop",          [], "Media loop boolean"),
    ("muted",         [], "Video / audio mute boolean"),
    ("mediaType",     [], "Discriminator: image / video / svg / lottie"),
    ("mediaSource",   [], "Source discriminator: upload / youtube / vimeo / url"),
    ("htmlTag",       [], "HTML tag selector (section / div / article)"),
    ("verticalAlign", [], "Vertical alignment within container"),
    ("query",         ["queryArgs", "wpQuery"], "WP_Query / Query Loop descriptor"),
    ("logo",          ["logoMaxWidth", "logoImage"], "Logo container slot"),
    ("size",          [], "Square dimension (button size, icon size, close size)"),
]

# Tier 2/3 — collapse map: proposed_slot → actual_slot_to_use
COLLAPSE_MAP = {
    # All show* / dismissible / payment / security boolean toggles → options
    "dismissible":      "options",
    "showDays":         "options",
    "showHours":        "options",
    "showMinutes":      "options",
    "showSeconds":      "options",
    "showAuthor":       "options",
    "showSchema":       "options",
    "showSourceHeader": "options",
    "showSubtitle":     "options",
    "showLogo":         "options",
    "showVerifiedBadge": "options",
    "showAggregate":    "options",
    "showAvatar":       "options",
    "showBreakdown":    "options",
    "showCaption":      "options",
    "showText":         "options",
    "showIcon":         "options",
    "showLabel":        "options",
    "showExcerpt":      "options",
    "securityFeature":  "options",
    "paymentConfig":    "options",
    "successFeedback":  "text",
    "progress":         "options",
    "playback":         "options",
    "playerControls":   "options",
    "displayMode":      "options",
    "gesture":          "options",
    "identifier":       "text",
    "scrollThreshold":  "options",
    "floatingPosition": "position",
    "seoSchema":        "text",
    "subIcon":          "icon",
    # Tier 3 — already-covered
    "shapeDividerTop":    "separator",
    "shapeDividerBottom": "separator",
    "placeId":           "query",
    "excludeKeywords":   "query",
    "businessUnitUrl":   "query",
    "apiKey":            "query",
}


def insert_cross_cutting_slots(conn: sqlite3.Connection) -> int:
    # Post-D99: slot_synonyms dropped; writes to slots table (scope='element').
    # canonical_slot -> slot_name; description -> notes; scope required.
    inserted = 0
    for canon, aliases, desc in NEW_CROSS_CUTTING_SLOTS:
        existing = conn.execute("SELECT 1 FROM slots WHERE slot_name=? AND scope='element'", (canon,)).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO slots (slot_name, scope, aliases, notes) VALUES (?, 'element', ?, ?)",
                (canon, json.dumps(aliases), desc),
            )
            inserted += 1
    conn.commit()
    return inserted


def resolve_slot(proposed: str, valid_slots: set[str]) -> str | None:
    """Resolve a proposed slot through the collapse map + validation."""
    if not proposed:
        return None
    # Strip "NEW:" prefix that some reports use
    cleaned = proposed.replace("NEW:", "").replace("`", "").strip()
    if cleaned in COLLAPSE_MAP:
        return COLLAPSE_MAP[cleaned]
    if cleaned in valid_slots:
        return cleaned
    return None


# Markdown table row: | attr_name | proposed_canonical_slot | proposed_role | rationale |
ROW_RE = re.compile(
    r"^\|\s*`?(?P<attr>[a-zA-Z][\w]+)`?\s*\|"
    r"\s*(?P<slot>[^|]+?)\s*\|"
    r"\s*`?(?P<role>[a-z][a-z0-9-]*)`?\s*\|"
    r"\s*(?P<rationale>[^|]+?)\s*\|?\s*$"
)
BLOCK_RE = re.compile(r"^#{2,4}\s+(?:Block:\s*)?`?(?P<slug>sgs/[\w-]+)`?")
# A5-style bullet rows: - `attr` → `slot` / `role` — rationale
BULLET_RE = re.compile(
    r"^[-*]\s+`?(?P<attr>[a-zA-Z][\w]+)`?\s*[→\-]+>?\s*"
    r"`?(?P<slot>[\w/-]+)`?\s*/\s*`?(?P<role>[a-z][a-z0-9-]*)`?"
)


def parse_report(path: Path) -> list[tuple[str, str, str, str]]:
    """Return list of (block_slug, attr_name, proposed_slot, proposed_role)."""
    rows = []
    current_block = None
    for line in path.read_text(encoding="utf-8").splitlines():
        bm = BLOCK_RE.match(line)
        if bm:
            current_block = bm.group("slug")
            continue
        if current_block:
            rm = ROW_RE.match(line)
            if rm and rm.group("attr").lower() not in {"attr_name", "attr"}:
                rows.append((current_block, rm.group("attr"), rm.group("slot"), rm.group("role")))
                continue
            bm2 = BULLET_RE.match(line)
            if bm2:
                rows.append((current_block, bm2.group("attr"), bm2.group("slot"), bm2.group("role")))
    return rows


def main() -> int:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    inserted = insert_cross_cutting_slots(conn)
    print(f"Cross-cutting slots inserted: {inserted}")

    # Post-D99: slot_synonyms dropped; reads slots table (scope='element').
    valid_slots = {r[0] for r in conn.execute("SELECT slot_name FROM slots WHERE scope = 'element'")}
    valid_roles = set()
    rt_path = REPO / "tools" / "recogniser-v2" / "data" / "role-templates.json"
    if rt_path.exists():
        rt = json.loads(rt_path.read_text(encoding="utf-8"))
        roles = rt.get("roles")
        if isinstance(roles, dict):
            valid_roles = set(roles.keys())

    # Build (block, attr) -> (slot, role) from all 5 reports
    all_proposals: dict[tuple[str, str], tuple[str, str]] = {}
    parse_stats = {}
    for branch in ("a1", "a2", "a3", "a4", "a5"):
        path = REPORTS_DIR / f"phase-3.5-fanout-{branch}.md"
        if not path.exists():
            print(f"  WARN: {path.name} missing")
            continue
        rows = parse_report(path)
        parse_stats[branch] = len(rows)
        for slug, attr, proposed_slot, proposed_role in rows:
            slot = resolve_slot(proposed_slot, valid_slots)
            role = proposed_role if proposed_role in valid_roles else None
            if slot and role:
                all_proposals[(slug, attr)] = (slot, role)
    print(f"Parsed rows per branch: {parse_stats}")
    print(f"Resolved proposals: {len(all_proposals)}")

    # Apply only to rows where canonical_slot IS NULL (don't overwrite)
    before = conn.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]
    updates = []
    for (slug, attr), (slot, role) in all_proposals.items():
        r = conn.execute(
            "SELECT id FROM block_attributes WHERE block_slug=? AND attr_name=? AND canonical_slot IS NULL",
            (slug, attr)
        ).fetchone()
        if r:
            updates.append((slot, role, r[0]))
    print(f"Rows to UPDATE: {len(updates)}")

    conn.executemany("UPDATE block_attributes SET canonical_slot=?, role=? WHERE id=?", updates)
    conn.commit()

    # Prune resolved gap candidates
    pruned = conn.execute("""
        DELETE FROM attribute_gap_candidates
        WHERE proposed_action='new-canonical-slot-needed'
          AND (block_slug, attr_name) IN (
            SELECT block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NOT NULL
          )
    """).rowcount
    conn.commit()
    print(f"Pruned {pruned} resolved gap candidates")

    after = conn.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]
    gap_open = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0]
    print()
    print(f"Canonicalised: {before} -> {after}  ({after - before:+d})")
    print(f"Gap queue:     {gap_open}")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
