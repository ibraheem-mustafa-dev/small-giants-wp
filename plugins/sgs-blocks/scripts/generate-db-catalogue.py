#!/usr/bin/env python3
"""generate-db-catalogue.py — DERIVE the DB column catalogue in .claude/dev-setup.md.

WHY THIS EXISTS
---------------
Bean, 2026-08-23: "Cataloguing what each column in the tables is recording and what
it means is just as important as cataloguing the scripts, as that is already filtered
data that distinguishes the blocks and their attributes in meaningful ways."

The payoff is measurable: `block_attributes.role` covers 99.8% of 3,166 rows with 34
values, and joining it to `roles.classification` collapses those into a clean
content-vs-styling fork. Nobody can use that if nobody knows the column exists.

THE SPLIT — measurable vs meaningful
------------------------------------
Everything that CHANGES on a reseed is GENERATED and never hand-written: row counts,
column lists, NULL rates, distinct-value vocabularies with counts. Those are exactly
the figures this repo has watched rot in prose repeatedly (the CLAUDE.md stage count
drifted three times; a spec-roster cell was three specs wrong within a fortnight).

What a column MEANS cannot be derived from the data, so it lives in COLUMN_MEANING
below — small, stable, hand-curated. It is deliberately PARTIAL: a column with no
entry renders an empty meaning cell rather than an invented one. An honest blank
beats a plausible sentence nobody verified.

⚠ MULTIPLE sgs-framework.db FILES EXIST and three are 0-BYTE STUBS (repo root,
plugins/sgs-blocks/scripts/, ~/.claude/). Opening a stub yields zero rows, which is
indistinguishable from a clean answer — this repo's signature failure mode. This
script resolves the DB the way sgs-db.py does and FAILS CLOSED on an implausible
table count.

Regenerate:  python plugins/sgs-blocks/scripts/generate-db-catalogue.py
Verify:      ... --check     (exit 1 when dev-setup.md is stale)
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DOC = (REPO / ".claude" / "dev-setup.md").resolve()
DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
START = "<!-- DB-CATALOGUE:START -->"
END = "<!-- DB-CATALOGUE:END -->"

# Tables the current standardisation + cloning work leans on.
PRIORITY = [
    "blocks", "block_attributes", "block_composition", "block_capabilities",
    "block_supports", "property_suffixes", "slots", "roles", "variant_slots",
    "preset_implications", "fx_effects",
    # The five other tables traced on 2026-08-24. Without them their COLUMN_MEANING
    # entries render NOWHERE - the catalogue would hold the findings and show none
    # of them, which is the exact written-never-read defect this catalogue exposes.
    "array_item_schema", "design_tokens", "block_selectors", "animation_tokens",
    "schema_metadata",
]

# Columns worth expanding into a value vocabulary — the ones usable as MARKERS
# for classifying blocks and attributes, which is the point of the exercise.
VOCAB_COLUMNS = {
    "role", "classification", "css_property", "css_element", "css_state",
    "css_layer", "css_tier", "box_family", "kind", "container_kind",
    "composition_role", "tier", "type", "source", "category", "attr_type",
    "inspector_control_type", "emit_shape", "scope", "presence", "kind_override",
}

# RETIRED 2026-08-24 (migrations/2026-08-24-drop-fossil-columns.py): the entries for
# block_attributes.signature_confidence, blocks.grade and blocks.grade_score were
# removed with the columns. equivalent_implementations is NOT retired — it has a
# live writer at uimax-tools/enrich-db.py:306; dormant is not dead.
COLUMN_MEANING = {
    ("block_attributes", "role"): "What KIND of thing the attribute is — the single best attribute classifier here. A gate (db-consistency/check_orphan_roles.py) fails the build if a value has no `roles` row, so it cannot rot quietly.",
    ("block_attributes", "css_property"): "The CSS longhand(s) this attribute writes. WARNING: a NULL means TWO different things — for a painting role it is a real gap; for `text-content`/`content`/`boolean-visibility` it is correct by design (100% NULL, they do not paint). Condition on `role` before reading a NULL as a defect.",
    ("block_attributes", "css_element"): "Which sub-element inside the block it paints. Must be paired with `css_layer` — matching on element alone mis-routes (converter/db/db_lookup.py:1340-1353).",
    ("block_attributes", "css_state"): "Pseudo-state the value applies to. Exact where present; the only state marker.",
    ("block_attributes", "css_layer"): "Which layer of the 3-layer wrapper model (OUTER / CONTENT / GRID / GRID_AREA) the attribute belongs to.",
    ("block_attributes", "css_tier"): "Responsive tier. Deliberately SPARSE — responsive siblings intentionally carry NULL and only anomalies keep a value. Do NOT treat these NULLs as gaps; 'fixing' them breaks db_lookup's base-row query.",
    ("block_attributes", "box_family"): "Merged box-object family. Narrow but authoritative — the DB-first replacement for name-regex box detection. No box_family means provably not a box attribute.",
    ("block_attributes", "inspector_control_type"): "The editor control the client actually sees. Cross-tab against `attr_type` to find controls whose shape cannot hold their setting.",
    ("block_attributes", "emit_shape"): "How the converter emits it. Fails closed at converter/walk.py:581 when unseeded on a content-role attribute, so its NULLs are tracked gaps rather than silent ones.",
        ("block_attributes", "equivalent_implementations"): "FOSSIL — holds stale synthetic Rosetta rows; no writer and no reader in current code.",
    ("block_attributes", "derived_selector"): "A NAMED TRAP. Reads like a CSS emit target; is a synthetic per-attribute identifier. colour-codemod/survey.js:21-27 measured 58% autofixable off it and the figure was wrong — ZERO of its values exist as classes in the tree. Never classify on it.",
    ("roles", "classification"): "Collapses the role vocabulary into a content-vs-styling fork — the cheapest reliable predicate for 'does this carry text the client edits, or does it paint'.",
    ("blocks", "status"): "Constant — every row is `built`. Filtered on as a gate predicate, so it filters nothing today.",
    ("blocks", "is_stale"): "Constant 0 — no row has ever gone stale. Dormant, not load-bearing.",
            ("blocks", "variant_attr"): "Names the attribute that selects the block's variant (FR-31-20). Pairs with the variant_slots table.",
    ("blocks", "tier"): "Recognition tier — how the walker identifies this thing in a draft.",
    ("block_capabilities", "kind"): "THE LOAD-BEARING SPLIT. `functional` = real converter behaviour; `discovery` = search keywords from the block title. Without it the table looks like hundreds of behavioural facts when only a few dozen are.",
    ("block_composition", "container_kind"): "The D294 pattern selector, and a converter recognition input (l2_qualify.py:122 tests PRESENCE; recognise_helpers.py:49-53 uses the VALUE as a priority tie-break). NULL means never-written, NOT not-container-bearing — the writer (sync-container-wrapping-blocks.py:1337) only ever SETS and has no statement clearing back to NULL, so a block that stops qualifying keeps its old value permanently. Refreshed 2026-08-24 (D762): 7 missing values added, 5 unclearable stale ones cleared; 38 rows now match the roster exactly. An earlier version of this cell claimed it disagrees with render.php in 14 of 58 blocks — that used the predicate content-kind-must-not-call-the-wrapper, but D294 says content-kind MAY render block-private. A permission read as an obligation; the figure was wrong.",
    ("block_composition", "composition_role"): "The block's structural shape. See the container_kind warning — the two columns disagree.",
    ("block_composition", "wraps_block"): "NOT A MEASUREMENT. The value sgs/container is a hardcoded string literal inside the writer SQL (sync-container-wrapping-blocks.py:1337), asserted for every roster member regardless of truth — 14 of the 38 make no real SGS_Container_Wrapper call, so the column is false for ~37% of its rows. Its only reader (db_lookup.py:1659) asks which wraps_block value is most common: a self-fulfilling question about a constant. Same trap shape as blocks.status and derived_selector. Verified 2026-08-24 (D762).",
    ("property_suffixes", "kind_override"): "Parse-type escape hatch (D99). `number_unitless` doubles as a cheat-gate sentinel.",
    ("slots", "standalone_block"): "The block a recognised BEM slot resolves to. Its NULLs are a KNOWN GAP, not a fossil — those slots exist as recognition vocabulary with no block to resolve to yet.",
    ("fx_effects", "tier"): "The Spec 38 four-tier motion doctrine: V vanilla / G GSAP / H helper / W WebGL substrate.",
    ("fx_effects", "owns_scroll_transform"): "Marks effects that claim the scroll transform — the mutual-exclusion axis for combining effects on one element.",
    ("variant_slots", "unique_slot"): "The slot ONLY this variant has — the discriminator, computed by set-difference against the block's other variants.",
    ("preset_implications", "is_neutral"): "Marks preset values that genuinely imply nothing (`none`, `flat`), so the converter can tell 'no styling' from 'not set'.",

    # --- Traced 2026-08-24. Every entry below was followed to executing
    # --- code, never to a docstring. FOSSIL = written, read by nothing
    # --- operational. See decisions.md D762.
    ("fx_effects", "requires"): "What an effect needs from a block (text/svg/svg-subtree/section/item-set/track/surface/image/none). LIVE — generate-fx-qualifying-blocks.py:750-780 matches it against each block's provision. The value none is real, meaning any block qualifies — NOT a null-substitute. The svg vs svg-subtree split (2026-07-31) exists because under-specifying here once offered MorphSVG on blocks carrying only a background SVG.",
    ("fx_effects", "scope"): "Gates which effects are considered at all — generate-fx-qualifying-blocks.py:780 filters scope IN (block, element). A live reader, not a label.",
    ("fx_effects", "in_picker"): "Whether the effect appears in the generic FX picker. Two-way gated against fx.js SHIPPED_EFFECTS by check-fx-list-drift.py:486-503, so it cannot rot quietly.",
    ("fx_effects", "triggers"): "Comma-joined string split at read time (generate-fx-effects-php.py:174), not a join table — one stray comma silently changes behaviour.",
    ("fx_effects", "reduced_motion"): "FOSSIL as of 2026-08-24 — no operational reader; generate-fx-effects-php.py:26 states outright that it is not carried. Same for editor_story, tier and created_at: only a reseed self-test touches them.",
    ("array_item_schema", "role"): "A SEPARATE 3-VALUE VOCABULARY — icon-slug / text-content / url-href, plus NULL. NEVER join it to block_attributes.role (34 values); they are unrelated despite the shared column name. DECLARED from block.json items.properties.<field>.role, never name-parsed (FR-31-2.1a). NULL means no role was declared, and the reader (array_content.py:112) deliberately falls back to name-derivation for those.",
    ("array_item_schema", "field_order"): "STRUCTURAL and implicit — it is the block.json key order of items.properties, captured by enumerate() at sgs-update-v2.py:1056, not anything an author declares. Consumed as a tie-break (array_content.py:282-289). Any tool that sorts or reformats block.json keys would silently change converter behaviour with no error.",
    ("design_tokens", "token_type"): "Chosen by the WRITER code branch, never read from the source JSON. Two writers disagreed until 2026-08-24: sgs-update-v2.py wrote shadows as shadow (correct) while uimax-tools/enrich-db.py wrote size on the strength of a comment claiming the CHECK constraint had no shadow member — it always had. Fixed at e101c279 plus a DB correction; all 7 shadow-% rows are now shadow. Note shadow-sm/md/lg are dead slugs absent from theme.json, while shadow-glow is live and was merely mistyped.",
    ("design_tokens", "css_var"): "FOSSIL as of 2026-08-24 — written by formula (NAME-DERIVED from slug via the WP preset convention), read by nothing. Same for description.",
    ("block_selectors", "selector"): "A PASSIVE MIRROR of each block.json own selectors key. WordPress reads block.json directly at register_block_type and never consults this table, so editing a row changes nothing at runtime. Its single reader is generate-block-reference.py:90-93, a docs generator. Two writers exist with undocumented last-one-wins semantics (sgs-update-v2.py:1171 and an out-of-repo populate-db.py), self-flagged in the code at :1165-1170.",
    ("animation_tokens", "name"): "FOSSIL relative to the shipped runtime. The live animation system (src/blocks/extensions/animation.js:21-38) hardcodes its own 17-entry vocabulary and shares only part of this table 8; zero of these token names appear as @keyframes in any CSS under src/ or the theme. Only the sgs-db.py lookup CLI reads it.",
    ("animation_tokens", "used_by"): "Name overstates it — means blocks whose sgsAnimation attribute DEFAULTS to this value (seed-motion-fx-registry.py:1170-1188). An operator who picks the animation by hand is invisible here.",
    ("fx_effects", "effect"): "Primary key and the effect's public identity — the value that appears in `data-sgs-fx`. Closed vocabulary chosen by hand to match Spec 38 §11.2; every consumer keys off it (generate-fx-effects-php.py:88, generate-fx-qualifying-blocks.py:779).",
    ("fx_effects", "plugin_set"): "JSON array of GSAP plugin names the effect needs. LIVE — generate-fx-effects-php.py:165-169 emits it into generated-fx-effects.php, and class-sgs-motion-registry.php uses it to decide which vendor module to enqueue. This is what keeps a page that uses no GSAP effect shipping zero GSAP bytes.",
    ("fx_effects", "pins"): "Whether the effect pins its element during scroll. Drives the editor's fxEnd control wording (generate-fx-effects-php.py:167,232). Hand-set but empirically grounded — each row's seeder comment cites the source file checked, e.g. 'VERIFIED: fx-pin-scrub.js sets pin:true'.",
    ("fx_effects", "creates_panel"): "Whether the effect may create a standalone FX panel (FR-38-25). Read at generate-fx-qualifying-blocks.py:854. Both readers guard on PRAGMA table_info before selecting it and fall back to 1 — so the risk case is the column being ABSENT on a pre-migration DB, not NULL.",
    ("fx_effects", "editor_story"): "FOSSIL as of 2026-08-24 — no operational reader. generate-fx-effects-php.py:26 states outright that editor/JS-facing concerns are not carried here; only the reseed self-test touches it.",
    ("fx_effects", "created_at"): "FOSSIL — SQL DEFAULT (datetime('now')), never written by application code and read by nothing.",
    ("array_item_schema", "block_slug"): "Part of the composite PK. Scoped DELETE-then-INSERT per block (sgs-update-v2.py:1049) means one /sgs-update run fully replaces that block's rows — no cross-run conflict is possible by construction.",
    ("array_item_schema", "array_attr"): "Which array-typed attribute on the block these field rows describe. DECLARED — the attribute name straight from block.json.",
    ("array_item_schema", "field_key"): "One key of the array's item shape, copied verbatim from block.json `items.properties` (sgs-update-v2.py:1055-1057). This is the declarative replacement for the retired hand-authored arrayItemSchema mechanism (D248).",
    ("design_tokens", "slug"): "Primary key. DECLARED from theme.json for framework tokens; for shadows and font sizes it is the source slug PLUS a hand-added type prefix (enrich-db.py:531,555,578). That prefix is load-bearing — outer_box.py:166 matches on `slug LIKE 'shadow-%'`, so the naming convention IS part of the read contract.",
    ("design_tokens", "default_value"): "The token's literal CSS value, copied verbatim from theme.json. One of only two columns any runtime consumer actually reads (outer_box.py:166-171).",
    ("design_tokens", "description"): "FOSSIL — written as `preset.name` with the slug as fallback, read by nothing anywhere in the tree.",
    ("block_selectors", "id"): "Surrogate PK only. Rows are addressed by (block_slug, element) in practice; nothing reads this.",
    ("block_selectors", "block_slug"): "Which block the selector mapping belongs to. Note this table is pruned separately from the generic orphan sweep (sgs-update-v2.py:1238-1249) — the standard prune_orphans stage does NOT cover it.",
    ("block_selectors", "element"): "The WordPress Selectors-API element path this row maps (root / typography / border / color.text and so on). Nested block.json keys are flattened to `element.sub` at write time (sgs-update-v2.py:1172-1189).",
    ("animation_tokens", "id"): "Surrogate PK. Rows are addressed by `name` (UNIQUE); nothing reads this column.",
    ("animation_tokens", "keyframes"): "CSS @keyframes body for the token. FOSSIL — no @keyframes matching any token name exists in any CSS file under src/ or the theme (negative grep, zero hits), so nothing renders this.",
    ("animation_tokens", "duration"): "Intended animation duration. FOSSIL — same as keyframes; the live extension drives timing via its own CSS transitions.",
    ("animation_tokens", "easing"): "Intended easing curve. FOSSIL — no operational reader.",
    ("animation_tokens", "description"): "Human-readable note. FOSSIL — read only by the sgs-db.py `animations` lookup CLI, which is an operator convenience, not build or runtime code.",
    ("animation_tokens", "category"): "Grouping label. FOSSIL — no operational reader.",
    ("animation_tokens", "created_at"): "Seed timestamp. FOSSIL — no reader.",
    ("schema_metadata", "key"): "This table is KEY-VALUE shaped, so the meaning lives per ROW, not per column — see the 'Row keys' table below. Four keys exist. Written by INSERT OR REPLACE (upsert_metadata), so a key is never NULL once its stage has run.",
    ("schema_metadata", "value"): "The value for `key`, always stored as TEXT regardless of the value's real type. Read the per-key notes below before trusting any of these — one of the four is stale by construction.",
}


# Per-ROW meanings for KEY-VALUE shaped tables. These were originally written into
# COLUMN_MEANING keyed on a row key rather than a column name, so the renderer -
# which looks up (table, column) from PRAGMA table_info - never matched them and
# they rendered NOWHERE. Verified 2026-08-24: zero occurrences in the generated
# dev-setup.md, including the wp_version root cause. Written, never read - the same
# defect class this catalogue exists to expose. They now render as their own table.
ROW_KEY_MEANING = {
    ("schema_metadata", "wp_version_indexed"): "STALE BY CONSTRUCTION, not by neglect. Stage 2 writes whatever --wp-version holds, and that flag defaults to WP_VERSION_DEFAULT = 7.0, a hardcoded literal at sgs-update-v2.py:97 never bumped after the canary moved to 7.1 on 2026-08-20. Every full run therefore RE-ASSERTS the wrong value. The one mechanism that would catch it (stage_8_drift_gate) does run, does compare against the live site, and only prints — its own TODO to wire it into a deploy hook is unactioned, and grep confirms nothing outside sgs-update-v2.py calls it. Verified 2026-08-24.",
    ("schema_metadata", "last_full_refresh_ts"): "Write-only audit timestamp — no reader anywhere. Useful to a human asking when this last ran. Written None in dry-run mode (sgs-update-v2.py:3885), so NULL distinguishes dry-run-only from never-ran.",
    ("schema_metadata", "last_variation_sync_ts"): "Write-only audit timestamp for the variation sync (sgs-update-v2.py:4353). No reader anywhere.",
    ("schema_metadata", "indexed_blocks_count"): "Count of blocks scanned at the last Stage 1 run. STRUCTURAL (a live COUNT), no reader found. UNVERIFIED: the exact writer line was located by grep context and not read in full - flagged rather than asserted.",
}


def connect() -> sqlite3.Connection:
    if not DB.exists():
        raise SystemExit("FAIL-CLOSED: DB not found at %s" % DB)
    if DB.stat().st_size == 0:
        raise SystemExit("FAIL-CLOSED: %s is a 0-byte STUB (three exist on disk)" % DB)
    con = sqlite3.connect("file:%s?mode=ro" % DB.as_posix(), uri=True)
    n = con.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
    ).fetchone()[0]
    if n < 10:
        raise SystemExit(
            "FAIL-CLOSED: only %d tables — this looks like a stub, not the live DB" % n
        )
    return con


def vocab(con, table, col, limit=14):
    """Distinct values with counts. Returns "" for a free-text column (>60 distinct)
    rather than dumping hundreds of values — a vocabulary that large is not a
    vocabulary, it is content."""
    try:
        rows = con.execute(
            'SELECT "%s", COUNT(*) c FROM "%s" WHERE "%s" IS NOT NULL '
            'AND TRIM(CAST("%s" AS TEXT)) <> \'\' GROUP BY 1 ORDER BY c DESC'
            % (col, table, col, col)
        ).fetchall()
    except sqlite3.Error:
        return ""
    # 120, not 60: css_property has 93 distinct values and that vocabulary IS the
    # useful part of the column. The guard exists to skip FREE-TEXT columns, and
    # the limit=14 truncation already keeps any cell readable.
    if not rows or len(rows) > 120:
        return ""
    shown = ", ".join("`%s` %d" % (v, c) for v, c in rows[:limit])
    if len(rows) > limit:
        shown += ", +%d more" % (len(rows) - limit)
    return shown


def build(con) -> str:
    out = [START, ""]
    out.append("### Why this section exists")
    out.append("")
    out.append("The DB is already-filtered data that distinguishes blocks and their attributes in")
    out.append("meaningful ways — but only if you know which columns carry a usable vocabulary and")
    out.append("which are fossils. Counts, vocabularies and NULL rates here are GENERATED and move")
    out.append("on every reseed. What a column MEANS is hand-curated; a column with no curated")
    out.append("meaning shows a blank cell rather than an invented sentence.")
    out.append("")
    tables = [
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    out.append("**%d tables.** Priority tables are expanded column-by-column below." % len(tables))
    out.append("")
    out.append("| Table | Rows | Expanded |")
    out.append("|---|---|---|")
    for t in tables:
        try:
            n = con.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0]
        except sqlite3.Error:
            n = "?"
        out.append("| `%s` | %s | %s |" % (t, n, "yes" if t in PRIORITY else "—"))
    out.append("")
    for t in PRIORITY:
        if t not in tables:
            out.append("#### `%s` — ABSENT from the live DB" % t)
            out.append("")
            continue
        total = con.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0]
        out.append("#### `%s` — %d rows" % (t, total))
        out.append("")
        out.append("| Column | Type | NULL | Vocabulary / meaning |")
        out.append("|---|---|---|---|")
        for _cid, name, ctype, _nn, _dflt, _pk in con.execute('PRAGMA table_info("%s")' % t):
            nulls = con.execute(
                'SELECT COUNT(*) FROM "%s" WHERE "%s" IS NULL' % (t, name)
            ).fetchone()[0]
            pct = ("%.0f%%" % (100.0 * nulls / total)) if total else "—"
            cell = vocab(con, t, name) if name in VOCAB_COLUMNS else ""
            meaning = COLUMN_MEANING.get((t, name), "")
            if meaning:
                cell = (cell + " — " if cell else "") + meaning
            cell = cell.replace("|", "\\|")
            out.append("| `%s` | %s | %s | %s |" % (name, ctype or "?", pct, cell))
        out.append("")
        # KEY-VALUE tables carry their meaning per ROW, not per column. Emit those
        # too, or the notes are unreachable — they were, until 2026-08-24.
        row_keys = sorted(k for (tbl, k) in ROW_KEY_MEANING if tbl == t)
        if row_keys:
            out.append("Row keys (this table is key-value shaped):")
            out.append("")
            out.append("| Key | Meaning |")
            out.append("|---|---|")
            for k in row_keys:
                out.append("| `%s` | %s |" % (k, ROW_KEY_MEANING[(t, k)].replace(chr(124), chr(92) + chr(124))))
            out.append("")
    out.append("Regenerate with:")
    out.append("")
    out.append("```bash")
    out.append("python plugins/sgs-blocks/scripts/generate-db-catalogue.py")
    out.append("```")
    out.append("")
    out.append(END)
    return "\n".join(out)


def main() -> int:
    check = "--check" in sys.argv
    con = connect()
    doc = DOC.read_text(encoding="utf-8", newline="")
    nl = "\r\n" if "\r\n" in doc else "\n"
    section = build(con).replace("\n", nl)
    if START not in doc or END not in doc:
        raise SystemExit(
            "FAIL-CLOSED: markers not found in %s. Add %s / %s first." % (DOC, START, END)
        )
    pre, rest = doc.split(START, 1)
    _, post = rest.split(END, 1)
    new = pre + section + post
    if new == doc:
        print("[db-catalogue] up to date")
        return 0
    if check:
        print("[db-catalogue] OUT OF DATE — run without --check to regenerate")
        return 1
    DOC.write_text(new, encoding="utf-8", newline="")
    print("[db-catalogue] regenerated %s" % DOC.relative_to(REPO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
