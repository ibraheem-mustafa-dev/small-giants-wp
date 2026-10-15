#!/usr/bin/env python3
"""seed-motion-fx-registry.py — idempotent editorial seeder for the Spec 38 motion system.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §6 (DB seeding plan) — item A6 of the
Motion Wave A build. Modelled directly on seed-composition-roles.py: [ok]/[skip]/[set]
reporting per row, a docstring changelog explaining WHY each row exists, safe to re-run
(idempotent), run after any DB rebuild that could have dropped/recreated its tables.

WHAT THIS SEEDS (§6 numbered list — each item below maps 1:1)
---------------------------------------------------------------------------------------
1. Effect registry — NEW table `fx_effects` (§6.1). One row per value in the §11.2
   `data-sgs-fx` grammar enum (the WHOLE v1 grammar — 11 effects, not just Wave A's
   four — the grammar is stable from day one so later waves consume the same rows):
   pin-scrub, scrub, horizontal-panel, split-reveal, scramble, flip, draggable, draw,
   morph, motion-path, image-sequence. Every row's tier/plugin_set/owns_scroll_transform/
   reduced_motion/editor_story is derived from the spec's own tables — never invented.
   See FX_EFFECTS below for the per-effect citation of exactly which spec line each
   field comes from, and the REASONED-NOT-STATED flags where the spec does not name
   the value explicitly (honesty over guessing, per the project's root-cause rule).

2. `block_attributes` fx:* pseudo-namespace (§6.2) — sibling of the existing `anim:*`
   namespace (inspected live before writing this: anim:preset/duration/easing/stagger/
   parallax/trigger already exist on card-grid/gallery/hero/container/etc, always with
   css_layer='OUTER'|NULL and css_element='wrapper'|'behaviour'|'animation'). The fx:*
   attrs (fx, fxTrigger, fxStart, fxEnd, fxScrub, fxStagger, fxDuration, fxEase — the
   §11.3 block-attr mirror of the §11.2 grammar) are mapped to fx:effect/trigger/start/
   end/scrub/stagger/duration/ease respectively — via FX_ATTR_CSS_PROPERTY below.

   OWNERSHIP MOVED 2026-08-01 (D432 integration): this seeder no longer WRITES
   block_attributes.css_property for fx:* attrs. It used to (a bare SQLite UPDATE run
   only at `npm run build` time), and that write was NOT reseed-durable (STOP-24 /
   check_css_property_reseed.py Check B) — the next `/sgs-update` had no idea the
   fx:* markers existed, so any /sgs-update run that happened to touch the same rows
   (e.g. creating them fresh because a block newly declared an fx:* attr) wiped them,
   which is exactly what happened in D432 (2026-07-31): seeding an unrelated
   nav-menu box_family fix required a full /sgs-update, which correctly INSERTed new
   block_attributes rows for sgs/image-sequence's fxStart/fxEnd/fxScrub + 4 blocks'
   dragMomentum (all real block.json-declared attrs) — then the NEXT build's seeder
   run set css_property on those new rows via a channel the reseed gate couldn't see,
   breaking the build for two co-active tracks at once.
   FX_ATTR_CSS_PROPERTY (the map itself) stays HERE — this is its one canonical
   source (R-22-1: sgs-update-v2.py imports it via importlib, never a hand-copied
   duplicate) — but the actual DB write now happens inside sgs-update-v2.py's
   `_apply_attr_classification_overrides` (layer 2.5), one step earlier in the SAME
   `/sgs-update` run that creates the fx:* block_attributes rows in the first place,
   so the marker can never trail behind by even one run. `_seed_fx_attr_namespace`
   below is now VERIFY-ONLY: it reports [ok]/[MISMATCH]/[skip] against the DB but
   never issues an UPDATE — a genuine single-writer guarantee, not just a documented
   intention.

3. `block_capabilities` fx-scrub/fx-draggable/fx-flip/fx-svg — EXPLICITLY NOT this
   seeder's job. §6 item 3 states these are "seeded from supports.sgs.fx.* declarations
   by /sgs-update (source-derived, so this part lives in the update populator, not the
   editorial seeder)". Not touched here, by design.

4. `modifier_suffixes` — EXPLICITLY no new rows in v1 (§6 item 4: "fx params are
   base-tier; a per-tier fx value is a v2 candidate"). Not touched here, by design.

5. `fx_effects.owned_properties` and `fx_effects.panels` (Spec 38A section 6.4) -- the channels and paint
   slots each effect writes and the panels that may offer it, read from schemas/motion.schema.json by
   dbschema/motion_registry_columns.py (never hand-typed here). `motion_presets` is seeded by
   dbschema/seed_reference_data.py from scripts/data/motion-presets.json, and the retired
   `animation_tokens` table is gone (its keyframe rows are `motion_presets` rows of kind 'keyframe').

6. `design_tokens.token_type` CHECK migration (motion duration/easing tokens) —
   EXPLICITLY deferred (§6 item 6: "Wave A ships without it — theme.json
   `--wp--custom--duration/easing--*` already serve"). Not touched here, by design.

CHANGELOG (post-Wave-A additions, newest first)
---------------------------------------------------------------------------------------
- 2026-08-21 (Tier W / D479 / D555): seeded `fx_effects.surface-treatment` (tier='W',
  the FIRST Tier W row in this table) + its four `fx:*` attr rows (fxTreatment,
  fxTreatmentIntensity, fxTreatmentShadow, fxTreatmentHighlight). Also corrected the
  `requires` closed-vocabulary comment above, which had drifted behind the earlier
  'surface' (cursor-field) addition — see that comment for detail. Per-row citation
  lives on the `surface-treatment` row itself in FX_EFFECTS below.

Run after any DB rebuild. Safe to re-run — a clean run reports zero changes both times
(see the two-consecutive-run proof in the A6 session report).
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Canonical SGS DB (hard-linked between ~/.agents and ~/.claude — same physical file,
# same derivation as seed-composition-roles.py). $SGS_FRAMEWORK_DB points a run at a copy.
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
sys.path.insert(0, str(Path(__file__).resolve().parent / "dbschema"))
from motion_registry_columns import EMPTY_OWNED, EMPTY_PANELS, effect_columns  # noqa: E402

# The rows themselves live in seed_motion_fx_data.py (a data module); they are re-exported here for every reader
# that loads this seeder by path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_motion_fx_data import FX_ATTR_CSS_PROPERTY, FX_EFFECTS  # noqa: E402,F401

FX_EFFECTS_COLUMNS = (
    "effect", "tier", "plugin_set", "owns_scroll_transform",
    "reduced_motion", "editor_story", "scope", "requires",
    "pins", "triggers", "creates_panel", "in_picker",
)


def _ensure_fx_effects_table(cur: sqlite3.Cursor) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS fx_effects (
            effect                  TEXT PRIMARY KEY,
            tier                    TEXT NOT NULL,
            plugin_set              TEXT NOT NULL,
            owns_scroll_transform   INTEGER NOT NULL DEFAULT 0,
            reduced_motion          TEXT NOT NULL,
            editor_story            TEXT NOT NULL,
            scope                   TEXT NOT NULL DEFAULT 'block',
            requires                TEXT NOT NULL DEFAULT 'none',
            pins                    INTEGER NOT NULL DEFAULT 0,
            triggers                TEXT NOT NULL DEFAULT 'scroll',
            creates_panel           INTEGER NOT NULL DEFAULT 1,
            in_picker               INTEGER NOT NULL DEFAULT 0,
            created_at              TEXT DEFAULT (datetime('now'))
        )
        """
    )
    # Reseed-safe migration for a table created before scope/requires existed
    # (an install that ran the OLD seeder already has fx_effects with 6
    # columns). ALTER TABLE ADD COLUMN is idempotent-safe here because it is
    # gated on the column's actual absence, never run unconditionally.
    existing_cols = {row[1] for row in cur.execute("PRAGMA table_info(fx_effects)").fetchall()}
    if "scope" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN scope TEXT NOT NULL DEFAULT 'block'")
        print("  [set]  fx_effects: added column 'scope' (migration)")
    if "requires" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN requires TEXT NOT NULL DEFAULT 'none'")
        print("  [set]  fx_effects: added column 'requires' (migration)")
    # D416: pins + triggers. Same gated-on-absence migration shape as above.
    #  - pins     drives the fxEnd control's WORDING ("how long it stays stuck"
    #             for a pinning effect vs "where it finishes" for a scrubbed one).
    #             owns_scroll_transform is NOT a usable proxy: 5 effects set it,
    #             only 2 pin.
    #  - triggers is the per-effect enum Spec 38 s11.2 already specifies
    #             ("load | scroll | hover (per-effect enum)") and drives which
    #             options the "When it starts" control offers, so a client is
    #             never shown a value that effect cannot honour.
    # Both live here rather than as hand-maintained arrays in fx.js, which
    # already carries two such lists that no gate cross-checks.
    if "pins" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN pins INTEGER NOT NULL DEFAULT 0")
        print("  [set]  fx_effects: added column 'pins' (migration)")
    if "triggers" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN triggers TEXT NOT NULL DEFAULT 'scroll'")
        print("  [set]  fx_effects: added column 'triggers' (migration)")
    # FR-38-25 (2026-08-01): creates_panel. Same gated-on-absence shape again.
    #
    # WHY THIS COLUMN EXISTS — it closes a real gap in the two-class model the
    # qualifying-blocks generator had until now. That model was:
    #   requires='none'      -> permissive; offered wherever a panel already
    #                           exists, and deliberately never CREATES one
    #                           (this is what stops all ~80 sgs/* blocks
    #                           acquiring a panel from `scrub` alone).
    #   requires=<specific>  -> creates the panel on any block that provides it.
    #
    # `cursor-field` fits NEITHER. It has a genuinely specific requirement (a
    # paintable background surface — it is inert on a block without one, which
    # QA Gate A forbids), so it cannot be 'none'. But MEASURED before building:
    # letting it create panels would put a brand-new fx panel on 11 blocks
    # including sgs/nav-menu, sgs/site-header, sgs/site-footer and sgs/form —
    # and because `offered = specific + permissive`, each of those 11 would ALSO
    # silently gain motion-path and scrub, which they have never had. That is
    # precisely the "13 panels where none makes sense" containment failure this
    # project treats as a defect in its own right.
    #
    # So the third class: a specific requirement that is OFFERED on match but
    # never creates the panel. Default 1 preserves every existing effect's
    # behaviour exactly; only a row that opts out carries 0.
    if "creates_panel" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN creates_panel INTEGER NOT NULL DEFAULT 1")
        print("  [set]  fx_effects: added column 'creates_panel' (migration)")
    # 2026-08-02: in_picker. Same gated-on-absence shape as every column above.
    #
    # WHY THIS COLUMN EXISTS — it is the DB half of the three-list drift gate
    # (scripts/check-fx-list-drift.py, invariant I1). `fx.js`'s SHIPPED_EFFECTS
    # array is the editor's on-switch: an effect built correctly in every other
    # layer is still dead code until its name appears there. `cursor-field` was
    # omitted from it on first build (FR-38-25) and NOTHING caught it — the
    # feature was unreachable from the editor while the runtime module, the
    # registry enqueue, the render layer and the panel were all correctly wired.
    #
    # To gate that, the check needs an independent statement of "which effects
    # SHOULD be in the picker". No existing column supplies one:
    #   · `creates_panel` does NOT discriminate — `cursor-field` is 0 and IS in
    #     the picker (it is offered where a panel already exists).
    #   · `scope`/`requires` describe the TARGET, not the control surface.
    #   · `carousel-loop` and `draggable` are deliberately absent from the picker
    #     (both use their own per-block grammar on a DESCENDANT scroller, never
    #     the generic root-stamping `data-sgs-fx` value) yet are otherwise
    #     ordinary block-scoped rows.
    # So: `in_picker` states that fact once, in the DB, per R-31-1 — rather than
    # adding a fourth hand-maintained list for the gate to compare against.
    #
    # DEFAULT 0, not 1 (the opposite of `creates_panel`): an effect must be
    # deliberately declared shippable-from-the-picker. A new row that forgets
    # this key is treated as block-private, which fails CLOSED — the gate then
    # objects the moment someone adds it to SHIPPED_EFFECTS without seeding it,
    # instead of silently asserting a picker entry that does not exist.
    if "in_picker" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN in_picker INTEGER NOT NULL DEFAULT 0")
        print("  [set]  fx_effects: added column 'in_picker' (migration)")
    # Spec 38A section 6.4: the channels/slots an effect writes and the panels that may offer it.
    if "owned_properties" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN owned_properties TEXT NOT NULL DEFAULT '{}'")
        print("  [set]  fx_effects: added column 'owned_properties' (migration)")
    if "panels" not in existing_cols:
        cur.execute("ALTER TABLE fx_effects ADD COLUMN panels TEXT NOT NULL DEFAULT '[]'")
        print("  [set]  fx_effects: added column 'panels' (migration)")


def _seed_fx_effects(cur: sqlite3.Cursor) -> int:
    changed = 0
    for row in FX_EFFECTS:
        effect = row["effect"]
        existing = cur.execute(
            "SELECT tier, plugin_set, owns_scroll_transform, reduced_motion, editor_story, "
            "scope, requires, pins, triggers, creates_panel, in_picker FROM fx_effects WHERE effect = ?",
            (effect,),
        ).fetchone()
        plugin_set_json = json.dumps(row["plugin_set"])
        target = (
            row["tier"], plugin_set_json, row["owns_scroll_transform"],
            row["reduced_motion"], row["editor_story"], row["scope"], row["requires"],
            row["pins"], row["triggers"],
            # Defaults to 1 so every pre-FR-38-25 row keeps its exact behaviour
            # without needing the key — only an opt-out row states it.
            row.get("creates_panel", 1),
            # Defaults to 0 — an effect is block-private until a row explicitly
            # declares it offerable from the generic "Scroll & effects" picker.
            # See the column's migration note for why this direction fails safe.
            row.get("in_picker", 0),
        )
        if existing is None:
            cur.execute(
                "INSERT INTO fx_effects "
                "(effect, tier, plugin_set, owns_scroll_transform, reduced_motion, "
                "editor_story, scope, requires, pins, triggers, creates_panel, in_picker) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (effect, *target),
            )
            changed += 1
            print(f"  [set]  fx_effects.{effect}: inserted ({row['tier']}, {plugin_set_json}, scope={row['scope']}, requires={row['requires']})")
            continue
        if tuple(existing) == target:
            print(f"  [ok]   fx_effects.{effect}: already correct")
            continue
        cur.execute(
            "UPDATE fx_effects SET tier=?, plugin_set=?, owns_scroll_transform=?, "
            "reduced_motion=?, editor_story=?, scope=?, requires=?, pins=?, triggers=?, "
            "creates_panel=?, in_picker=? WHERE effect=?",
            (*target, effect),
        )
        changed += 1
        print(f"  [set]  fx_effects.{effect}: corrected {existing} -> {target}")
    # This seeder is the table's only writer, so a row FX_EFFECTS no longer declares (a renamed or removed effect)
    # is deleted rather than left beside its successor.
    declared = {row["effect"] for row in FX_EFFECTS}
    for (stale,) in cur.execute("SELECT effect FROM fx_effects").fetchall():
        if stale not in declared:
            cur.execute("DELETE FROM fx_effects WHERE effect = ?", (stale,))
            changed += 1
            print(f"  [del]  fx_effects.{stale}: not declared in FX_EFFECTS")
    return changed


def _seed_fx_motion_columns(cur: sqlite3.Cursor) -> int:
    """Write owned_properties and panels per seeded effect from the motion schema (effects the schema lacks get empties)."""
    schema_columns = effect_columns()
    changed = 0
    for row in FX_EFFECTS:
        effect = row["effect"]
        target = schema_columns.get(effect, (EMPTY_OWNED, EMPTY_PANELS))
        existing = cur.execute("SELECT owned_properties, panels FROM fx_effects WHERE effect = ?", (effect,)).fetchone()
        if existing is not None and tuple(existing) == target:
            print(f"  [ok]   fx_effects.{effect}: owned_properties and panels already correct")
            continue
        cur.execute("UPDATE fx_effects SET owned_properties = ?, panels = ? WHERE effect = ?", (*target, effect))
        changed += 1
        print(f"  [set]  fx_effects.{effect}: owned_properties and panels from the motion schema")
    return changed


def _seed_fx_attr_namespace(cur: sqlite3.Cursor) -> int:
    """§6.2 / §11.3 — VERIFY (never write) that every block_attributes row
    declaring an fx:* attr name carries the correct css_property marker.

    OWNERSHIP MOVED 2026-08-01 (D432): the actual write now happens inside
    sgs-update-v2.py's `_apply_attr_classification_overrides` (layer 2.5),
    which runs earlier in the SAME `/sgs-update` pipeline invocation that
    also seeds this table — see this module's own docstring item 2 for the
    full incident history. This function is a read-only cross-check: if
    `/sgs-update` has run since the attr was declared, every row already
    matches and this reports [ok]; a [MISMATCH] means `/sgs-update` has not
    been run since the block.json change (a real, actionable staleness
    signal — this is now the ONLY legitimate way for these rows to disagree,
    since there is exactly one writer). Reports [skip] for any fx:* name with
    zero matching block_attributes rows — no block declares it yet.
    """
    mismatches = 0
    for attr_name, css_property in FX_ATTR_CSS_PROPERTY.items():
        rows = cur.execute(
            "SELECT block_slug, css_property FROM block_attributes WHERE attr_name = ?",
            (attr_name,),
        ).fetchall()
        if not rows:
            print(f"  [skip] fx:* {attr_name}: no block_attributes row declares this attr yet")
            continue
        for block_slug, current_css_property in rows:
            if current_css_property == css_property:
                print(f"  [ok]   fx:* {block_slug}.{attr_name}: already {css_property}")
                continue
            mismatches += 1
            print(
                f"  [MISMATCH] fx:* {block_slug}.{attr_name}: DB has {current_css_property!r}, "
                f"expected {css_property!r} — run sgs-update-v2.py (Stage 1) to correct it "
                "(this function no longer writes; see module docstring item 2)."
            )
    return mismatches


def main() -> int:
    if not DB_PATH.exists():
        # Deliberately unversioned (13.9MB local dev knowledge base — see
        # .claude/dev-setup.md "sgs-framework.db" section). A contributor
        # without it builds off the already-committed generated artefacts
        # (generated-fx-effects.php, generated-fx-qualifying-blocks.json — the
        # .php mirror was deleted as dead code at `1ac16ec9`,
        # generated-fx-effect-meta.json) instead — this seeder has nothing to
        # do in that case, so it skips cleanly rather than failing the build.
        print(
            f"[seed-motion-fx-registry] DB not found: {DB_PATH} — skipping "
            "(building off committed generated artefacts; see .claude/dev-setup.md)."
        )
        return 0

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()
    changed = 0

    print("== 1. fx_effects (§6.1 / §11.2 grammar) ==")
    _ensure_fx_effects_table(cur)
    changed += _seed_fx_effects(cur)

    print("== 2. block_attributes fx:* namespace (§6.2 / §11.3) — VERIFY ONLY, see D432 ==")
    # Never writes (ownership moved to sgs-update-v2.py layer 2.5, D432). A
    # non-zero mismatch count here means /sgs-update needs a run, NOT that
    # this seeder needs to fix it — deliberately excluded from `changed` so
    # this script's own "done: N row(s) changed" line stays true to what IT
    # wrote, not what it merely observed.
    fx_mismatches = _seed_fx_attr_namespace(cur)

    print("== 5. fx_effects owned_properties and panels (Spec 38A §6.4) ==")
    changed += _seed_fx_motion_columns(cur)

    con.commit()
    con.close()
    print(f"[seed-motion-fx-registry] done: {changed} row(s) changed.")
    if fx_mismatches:
        print(
            f"[seed-motion-fx-registry] NOTE: {fx_mismatches} fx:* block_attributes "
            "row(s) do not yet match FX_ATTR_CSS_PROPERTY — run "
            "sgs-update-v2.py (Stage 1) to correct them; this script no longer "
            "writes that column itself."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
