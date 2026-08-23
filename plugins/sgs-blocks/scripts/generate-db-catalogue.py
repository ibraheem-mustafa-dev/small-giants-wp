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
]

# Columns worth expanding into a value vocabulary — the ones usable as MARKERS
# for classifying blocks and attributes, which is the point of the exercise.
VOCAB_COLUMNS = {
    "role", "classification", "css_property", "css_element", "css_state",
    "css_layer", "css_tier", "box_family", "kind", "container_kind",
    "composition_role", "tier", "type", "source", "category", "attr_type",
    "inspector_control_type", "emit_shape", "scope", "presence", "kind_override",
}

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
    ("block_attributes", "signature_confidence"): "FOSSIL — 100% NULL, no writer, no reader. Its only repo occurrence is the DDL line in dbschema/schema.sql.",
    ("block_attributes", "equivalent_implementations"): "FOSSIL — holds stale synthetic Rosetta rows; no writer and no reader in current code.",
    ("block_attributes", "derived_selector"): "A NAMED TRAP. Reads like a CSS emit target; is a synthetic per-attribute identifier. colour-codemod/survey.js:21-27 measured 58% autofixable off it and the figure was wrong — ZERO of its values exist as classes in the tree. Never classify on it.",
    ("roles", "classification"): "Collapses the role vocabulary into a content-vs-styling fork — the cheapest reliable predicate for 'does this carry text the client edits, or does it paint'.",
    ("blocks", "status"): "Constant — every row is `built`. Filtered on as a gate predicate, so it filters nothing today.",
    ("blocks", "is_stale"): "Constant 0 — no row has ever gone stale. Dormant, not load-bearing.",
    ("blocks", "grade"): "FOSSIL — 100% NULL but READ by generate-block-reference.py, which therefore prints nothing forever.",
    ("blocks", "grade_score"): "FOSSIL — 100% NULL, same reader as `grade`.",
    ("blocks", "variant_attr"): "Names the attribute that selects the block's variant (FR-31-20). Pairs with the variant_slots table.",
    ("blocks", "tier"): "Recognition tier — how the walker identifies this thing in a draft.",
    ("block_capabilities", "kind"): "THE LOAD-BEARING SPLIT. `functional` = real converter behaviour; `discovery` = search keywords from the block title. Without it the table looks like hundreds of behavioural facts when only a few dozen are.",
    ("block_composition", "container_kind"): "The D294 pattern selector (block-private vs SGS_Container_Wrapper). UNRELIABLE ALONE — disagrees with composition_role inside the DB, disagrees with render.php in 14 of 58 measured blocks, and sgs/container itself is NULL. Confirm against the code.",
    ("block_composition", "composition_role"): "The block's structural shape. See the container_kind warning — the two columns disagree.",
    ("block_composition", "wraps_block"): "Which block this one wraps — only ever sgs/container.",
    ("property_suffixes", "kind_override"): "Parse-type escape hatch (D99). `number_unitless` doubles as a cheat-gate sentinel.",
    ("slots", "standalone_block"): "The block a recognised BEM slot resolves to. Its NULLs are a KNOWN GAP, not a fossil — those slots exist as recognition vocabulary with no block to resolve to yet.",
    ("fx_effects", "tier"): "The Spec 38 four-tier motion doctrine: V vanilla / G GSAP / H helper / W WebGL substrate.",
    ("fx_effects", "owns_scroll_transform"): "Marks effects that claim the scroll transform — the mutual-exclusion axis for combining effects on one element.",
    ("variant_slots", "unique_slot"): "The slot ONLY this variant has — the discriminator, computed by set-difference against the block's other variants.",
    ("preset_implications", "is_neutral"): "Marks preset values that genuinely imply nothing (`none`, `flat`), so the converter can tell 'no styling' from 'not set'.",
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
