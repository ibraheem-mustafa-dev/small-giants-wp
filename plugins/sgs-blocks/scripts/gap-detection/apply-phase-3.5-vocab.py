"""
Spec 31 Phase 3.5 — Apply Tier 1 + Tier 2 vocabulary additions.

Tier 1 (property_suffixes, no §11 impact):
    BlockGap, ContentSize, WideSize, FontStyle, Gradient, LinkColor,
    Spacing, Image, Video, Effect, Scale, ImageZoom, Grayscale

Tier 2 (slots [scope='element'], extends §11 to layout/state/motion per amended spec):
    hover, transition, animation, subHeadline (alias of subheading),
    secondaryCta, column (alias columns), padding, margin, gap, width

After inserting, re-runs assign-canonical (incremental on NULL rows) then
gap-detection to roll forward.

Idempotent via INSERT OR IGNORE.
"""
from __future__ import annotations
import json, os, sqlite3, subprocess, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB",
    str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db")))
REPO = Path(__file__).resolve().parents[4]

NEW_PROPERTY_SUFFIXES = [
    # (suffix, role, css_property, notes)
    ("BlockGap",      "spacing-token",    "gap",                       "theme.json settings.spacing.blockGap"),
    ("ContentSize",   "number-css-px",    "max-width",                 "theme.json settings.layout.contentSize"),
    ("WideSize",      "number-css-px",    "max-width",                 "theme.json settings.layout.wideSize"),
    ("FontStyle",     "select-from-enum", "font-style",                "theme.json settings.typography.fontStyle"),
    ("Gradient",      "colour-gradient",  "background-image",          "theme.json settings.color.gradients"),
    ("LinkColor",     "colour-text",      "color (on a)",              "block.json supports.color.link"),
    ("Spacing",       "spacing-token",    "padding/margin (preset)",   "theme.json settings.spacing.spacingSizes"),
    ("Image",         "image-object",     None,                        "B5 Bucket 3 — backgroundImage / backgroundImageOpacity"),
    ("Video",         "image-object",     None,                        "B5 Bucket 3 — backgroundVideo / bgVideo"),
    ("Effect",        "select-from-enum", None,                        "hoverEffect / transitionEffect"),
    ("Scale",         "select-from-enum", None,                        "hoverScale"),
    ("ImageZoom",     "select-from-enum", None,                        "hoverImageZoom"),
    ("Grayscale",     "select-from-enum", None,                        "hoverGrayscale"),
]

NEW_SLOT_SYNONYMS = [
    # (canonical_slot, aliases_list, description, html_tag)
    ("hover",       ["hoverState"],                       "Hover-state slot (state modifier acting as slot)",            None),
    ("transition",  ["motion", "css-transition"],         "CSS transition motion concept",                                None),
    ("animation",   ["motion", "sgsAnimation"],           "Animation motion concept (incl. sgsAnimation)",                None),
    ("subheading",  ["subHeadline", "subTitle", "sub"],   "Secondary heading slot (extends existing subheading aliases)", "h2"),
    ("secondaryCta",["secondaryCTA"],                     "Secondary call-to-action slot (mobile-nav, etc.)",             "a"),
    ("column",      ["columns"],                          "Grid/flex column slot",                                        None),
    ("padding",     [],                                   "Padding layout primitive slot",                                None),
    ("margin",      [],                                   "Margin layout primitive slot",                                 None),
    ("gap",         ["blockGap"],                         "Gap layout primitive slot",                                    None),
    ("width",       [],                                   "Width layout primitive slot",                                  None),
]


def main() -> int:
    conn = sqlite3.connect(str(DB_PATH))

    inserted_prop = 0
    for suffix, role, css_prop, notes in NEW_PROPERTY_SUFFIXES:
        cur = conn.execute(
            "INSERT OR IGNORE INTO property_suffixes "
            "(suffix, role, css_property, is_token_matched, token_source, notes) "
            "VALUES (?, ?, ?, 0, NULL, ?)",
            (suffix, role, css_prop, notes),
        )
        if cur.rowcount > 0:
            inserted_prop += 1

    # Post-D99: slot_synonyms dropped; writes to slots table (scope='element').
    # canonical_slot -> slot_name; description -> notes; role + html_semantic_tag
    # not stored on slots (role lives in roles table; html_tag omitted).
    inserted_slot = 0
    updated_aliases = 0
    for canon, new_aliases, desc, html_tag in NEW_SLOT_SYNONYMS:
        existing = conn.execute(
            "SELECT aliases FROM slots WHERE slot_name=? AND scope='element'", (canon,)
        ).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO slots (slot_name, scope, aliases, notes) VALUES (?, 'element', ?, ?)",
                (canon, json.dumps(new_aliases), desc),
            )
            inserted_slot += 1
        elif new_aliases:
            current = json.loads(existing[0]) if existing[0] else []
            merged = sorted(set(current) | set(new_aliases))
            if merged != sorted(current):
                conn.execute(
                    "UPDATE slots SET aliases=? WHERE slot_name=? AND scope='element'",
                    (json.dumps(merged), canon),
                )
                updated_aliases += 1

    conn.commit()

    print(f"property_suffixes inserted: {inserted_prop}")
    print(f"slot_synonyms inserted:     {inserted_slot}")
    print(f"slot_synonyms aliases extended: {updated_aliases}")

    # Stats before re-run
    before_canon = conn.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]
    before_gap = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0]
    conn.close()

    py = sys.executable
    print()
    print("Re-running assign-canonical (incremental — canonical_slot IS NULL only)...")
    subprocess.run(
        [py, str(REPO / "plugins" / "sgs-blocks" / "scripts" / "behavioural-analyser" / "assign-canonical.py")],
        check=False, cwd=str(REPO),
    )

    # Stats after
    conn = sqlite3.connect(str(DB_PATH))
    after_canon = conn.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL").fetchone()[0]

    # Refresh gap-candidate stems via detect.py to pick up newly-canonicalised rows
    # (those rows had their canonical_slot populated, so they should leave the queue).
    # First, prune candidates that are now canonicalised.
    conn.execute("""
        DELETE FROM attribute_gap_candidates
        WHERE proposed_action='new-canonical-slot-needed'
          AND (block_slug, attr_name) IN (
            SELECT block_slug, attr_name FROM block_attributes WHERE canonical_slot IS NOT NULL
          )
    """)
    conn.commit()
    after_gap = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0]
    conn.close()

    print()
    print("=== Delta ===")
    print(f"  canonicalised:    {before_canon:5} -> {after_canon:5}  ({after_canon - before_canon:+d})")
    print(f"  gap canonicalisable: {before_gap:5} -> {after_gap:5}  ({after_gap - before_gap:+d})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
