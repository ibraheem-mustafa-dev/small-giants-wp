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
   end/scrub/stagger/duration/ease respectively.

   HONEST GAP (flagged, not guessed around): at the time of this build NO block.json
   declares any of these 8 attr names — Wave A's block-level fx panel has not landed
   yet (it is a separate, not-yet-built work item; this seeder only owns the DB). A
   `block_attributes` row only exists once /sgs-update has extracted it from a real
   block.json, so there is currently nothing to attach css_property to. This step is
   therefore a documented NO-OP today (reports [skip] for all 8 attr names, proven
   idempotent below) that self-activates the moment a block declares them — EXCEPT for
   one caveat also flagged in the final report: a bare UPDATE on block_attributes.
   css_property is NOT reseed-durable (STOP-24 / check_css_property_reseed.py Check A) —
   the durable channel is ATTR_CLASSIFICATION_OVERRIDES inside sgs-update-v2.py, which
   this task does not own (out of scope — sgs-update-v2.py is core shared infrastructure,
   not one of this task's four owned files). Recorded as residual follow-up work.

3. `block_capabilities` fx-scrub/fx-draggable/fx-flip/fx-svg — EXPLICITLY NOT this
   seeder's job. §6 item 3 states these are "seeded from supports.sgs.fx.* declarations
   by /sgs-update (source-derived, so this part lives in the update populator, not the
   editorial seeder)". Not touched here, by design.

4. `modifier_suffixes` — EXPLICITLY no new rows in v1 (§6 item 4: "fx params are
   base-tier; a per-tier fx value is a v2 candidate"). Not touched here, by design.

5. `animation_tokens` reconciliation (§6 item 5) — add the missing `fade-up` row
   (verified absent from the live 7-row table before writing this: fade-in, fade-out,
   slide-up, zoom-in, bounce, pulse, spin — no fade-up) and wire `used_by` for every
   token from the real `sgsAnimation` default-value usage recorded in block_attributes
   (DB-first, not invented — see USED_BY reconciliation below). NOTE: the spec text
   says fade-up is "used as a default by 10 blocks" — the live DB query below found 8
   (sgs/card-grid, sgs/google-reviews, sgs/info-box, sgs/post-grid, sgs/process-steps,
   sgs/team-member, sgs/testimonial, sgs/trustpilot-reviews). This is a spec-vs-DB
   discrepancy (the "10" figure does not match ground truth) — flagged in the final
   report per the project's fact-check-your-own-diagnostic-output rule; the seeder
   uses the DB-verified 8, not the spec's estimate.

6. `design_tokens.token_type` CHECK migration (motion duration/easing tokens) —
   EXPLICITLY deferred (§6 item 6: "Wave A ships without it — theme.json
   `--wp--custom--duration/easing--*` already serve"). Not touched here, by design.

Run after any DB rebuild. Safe to re-run — a clean run reports zero changes both times
(see the two-consecutive-run proof in the A6 session report).
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Canonical SGS DB (hard-linked between ~/.agents and ~/.claude — same physical file,
# same derivation as seed-composition-roles.py).
DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# 1. fx_effects — the §11.2 grammar, in full (Spec 38 §6.1 + §2 + §9 + §10 + §4.3).
#
# Column meanings (Spec 38 §6.1):
#   effect                 PK — the data-sgs-fx enum value (§11.2)
#   tier                   'V'|'G' — all 11 are 'G' here: §11.1 states the whole
#                          data-sgs-fx-* namespace belongs to this spec's Tier-G
#                          grammar; a Tier-V single-property scrub/path-follow uses
#                          DIFFERENT existing markup (--sgs-scroll-progress,
#                          offset-path) and never sets data-sgs-fx at all.
#   plugin_set             JSON array — GSAP plugin(s) this effect's OWN chunk needs,
#                          named exactly as the §4.4 budget table names them. gsap
#                          core itself is excluded (loads for ANY Tier G effect,
#                          per §4.4, not per-effect).
#   owns_scroll_transform  1 when the effect owns an element's transform/opacity
#                          across a scroll range (drives the §4.3 entrance-exclusion
#                          render-time suppression) — 0 otherwise. §4.3's own text
#                          explicitly names DrawSVG-on-load and ScrambleText as
#                          NON-excluding ("do NOT exclude entrances"), and explicitly
#                          names SplitText as under "§4.3 exclusivity vs entrance"
#                          in the §2 taxonomy row. pin-scrub/scrub/horizontal-panel
#                          are the FR-38-6/7/8 scroll-scrub family the whole §4.3
#                          section is written about.
#   reduced_motion         'suppress'|'simplify' — per-effect row, §10 table.
#   editor_story           'end-state'|'toggle'|'no-preview' — per-effect row, §9
#                          table (mapped to the nearest of the 3 enum values where
#                          §9's prose is more specific, e.g. Draggable's "Static" ->
#                          'end-state', SplitText's "optional preview toggle" ->
#                          'toggle').
# ---------------------------------------------------------------------------
FX_EFFECTS: list[dict] = [
    {
        # FR-38-6, §2 row "Pin + scrub section timeline", §9 row 1, §10 row 1.
        "effect": "pin-scrub",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
    {
        # FR-38-7, §2 row "Scroll-scrubbed element timeline", §9 row 1, §10 row 2.
        "effect": "scrub",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
    {
        # FR-38-8, §2 row "Horizontal scroll panel", §9 row 1, §10 row 3.
        "effect": "horizontal-panel",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
    {
        # FR-38-10, §2 row "SplitText reveal" (explicitly "§4.3 exclusivity vs
        # entrance" in its Conditions column), §9 row 3, §10 row 5.
        "effect": "split-reveal",
        "tier": "G",
        # ScrollTrigger added 2026-07-29 during the Wave A build. The spec's §4.4
        # budget table lists SplitText against "text reveals present" and does not
        # spell out a second plugin, but the built effect reveals ON SCROLL (a
        # `scrollTrigger` config), and §4.4 loads ScrollTrigger for "any
        # scroll-driven G effect" — which this is. Corroborated by the row's own
        # owns_scroll_transform=1, which asserts it owns transform/opacity across
        # a SCROLL RANGE; that is only true with ScrollTrigger present.
        # Declaring only SplitText would under-enqueue: the module imports
        # ScrollTrigger regardless, so the browser would fetch it via the import
        # map with no WP dependency declared and no modulepreload.
        "plugin_set": ["SplitText", "ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "toggle",
    },
    {
        # FR-38-11, §2 row "ScrambleText" (no §4.3 mention; §4.3's own text names
        # ScrambleText as a non-excluding effect), §9 row 3, §10 row 6.
        "effect": "scramble",
        "tier": "G",
        "plugin_set": ["ScrambleText"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "toggle",
    },
    {
        # FR-38-12, §2 row "Flip on filtered grids" (filter-event-triggered, not
        # scroll-driven), §9 row 4 ("Labelled no-preview"), §10 row 7.
        "effect": "flip",
        "tier": "G",
        "plugin_set": ["Flip"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "no-preview",
    },
    {
        # FR-38-13, §2 row "Draggable + Inertia", §9 row 5 ("Static; Notice"),
        # §10 row 8.
        "effect": "draggable",
        "tier": "G",
        "plugin_set": ["Draggable", "Inertia"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
    {
        # FR-38-15, §2 row "DrawSVG" (§4.3 text explicitly names "DrawSVG on load"
        # as non-excluding), §9 row 6, §10 row 10.
        "effect": "draw",
        "tier": "G",
        "plugin_set": ["DrawSVG"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
    {
        # FR-38-16, §2 row "MorphSVG", §9 row 6, §10 row 11. Not named in §4.3 at
        # all (asset-gated instant/duration morph of the path 'd', not a
        # transform/opacity scroll-scrub) -> owns_scroll_transform=0.
        "effect": "morph",
        "tier": "G",
        "plugin_set": ["MorphSVG"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "end-state",
    },
    {
        # FR-38-17, §2 row "MotionPath" ("G variant needs ScrollTrigger +
        # MotionPathPlugin"), §9 row 6, §10 row 12.
        # REASONED, NOT SPEC-STATED: owns_scroll_transform=1 here is an inference
        # (scroll-scrubbed path progress moves the element's transform across the
        # scroll range, the same shape as pin-scrub/scrub) — the spec's §4.3
        # section never names MotionPath explicitly in its exclusion-list
        # discussion the way it names pin-scrub/scrub/SplitText/DrawSVG/
        # ScrambleText. Flagged in the final report; not guessed silently.
        "effect": "motion-path",
        "tier": "G",
        "plugin_set": ["MotionPath", "ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "suppress",
        "editor_story": "end-state",
    },
    {
        # FR-38-9, §2 row "Scroll-scrubbed image sequence", §9 row 2
        # ("Poster frame + Notice"), §10 row 4.
        # REASONED, NOT SPEC-STATED (both flagged in the final report):
        #  - plugin_set=["ScrollTrigger"]: the §4.4 budget table has NO row named
        #    "image-sequence" or an equivalent dedicated GSAP plugin — canvas frame
        #    scrubbing needs only a scroll-progress callback (ScrollTrigger), no
        #    named plugin exists for it in GSAP, so ScrollTrigger-only is the
        #    reasoned minimum, not a spec-stated figure.
        #  - owns_scroll_transform=0: canvas frame-drawing is not literally a CSS
        #    transform/opacity property on a DOM element (the §4.3 definition), so
        #    it is set 0 by the letter of that definition even though it visually
        #    "owns" the block's motion across the scroll range the same way
        #    pin-scrub does. Flagged as a judgement call, not a guess presented as
        #    fact.
        "effect": "image-sequence",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
    },
]

# ---------------------------------------------------------------------------
# 2. block_attributes fx:* pseudo-namespace map (§6.2 / §11.3) — attr_name ->
#    css_property. Mirrors the anim:* namespace's suffix shape exactly (anim:preset,
#    anim:duration, anim:easing, anim:stagger, anim:parallax, anim:trigger — verified
#    live against block_attributes before writing this).
# ---------------------------------------------------------------------------
FX_ATTR_CSS_PROPERTY: dict[str, str] = {
    "fx": "fx:effect",
    "fxTrigger": "fx:trigger",
    "fxStart": "fx:start",
    "fxEnd": "fx:end",
    "fxScrub": "fx:scrub",
    "fxStagger": "fx:stagger",
    "fxDuration": "fx:duration",
    "fxEase": "fx:ease",
}

FX_EFFECTS_COLUMNS = (
    "effect", "tier", "plugin_set", "owns_scroll_transform",
    "reduced_motion", "editor_story",
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
            created_at              TEXT DEFAULT (datetime('now'))
        )
        """
    )


def _seed_fx_effects(cur: sqlite3.Cursor) -> int:
    changed = 0
    for row in FX_EFFECTS:
        effect = row["effect"]
        existing = cur.execute(
            "SELECT tier, plugin_set, owns_scroll_transform, reduced_motion, editor_story "
            "FROM fx_effects WHERE effect = ?",
            (effect,),
        ).fetchone()
        plugin_set_json = json.dumps(row["plugin_set"])
        target = (
            row["tier"], plugin_set_json, row["owns_scroll_transform"],
            row["reduced_motion"], row["editor_story"],
        )
        if existing is None:
            cur.execute(
                "INSERT INTO fx_effects "
                "(effect, tier, plugin_set, owns_scroll_transform, reduced_motion, editor_story) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (effect, *target),
            )
            changed += 1
            print(f"  [set]  fx_effects.{effect}: inserted ({row['tier']}, {plugin_set_json})")
            continue
        if tuple(existing) == target:
            print(f"  [ok]   fx_effects.{effect}: already correct")
            continue
        cur.execute(
            "UPDATE fx_effects SET tier=?, plugin_set=?, owns_scroll_transform=?, "
            "reduced_motion=?, editor_story=? WHERE effect=?",
            (*target, effect),
        )
        changed += 1
        print(f"  [set]  fx_effects.{effect}: corrected {existing} -> {target}")
    return changed


def _seed_fx_attr_namespace(cur: sqlite3.Cursor) -> int:
    """§6.2 / §11.3 — mirror the anim:* namespace onto any block_attributes row
    already declaring an fx:* attr name. Reports [skip] (not a failure) for every
    attr name with zero matching rows — see the module docstring's "HONEST GAP"
    section: no block.json declares these attrs yet, so this is a documented,
    proven-idempotent no-op until Wave A's block-level fx panel lands them."""
    changed = 0
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
            cur.execute(
                "UPDATE block_attributes SET css_property = ? WHERE block_slug = ? AND attr_name = ?",
                (css_property, block_slug, attr_name),
            )
            changed += 1
            print(
                f"  [set]  fx:* {block_slug}.{attr_name}: {current_css_property!r} -> {css_property!r} "
                "(NOTE: this write is NOT reseed-durable — see module docstring item 2 gap)"
            )
    return changed


def _reconcile_animation_tokens(cur: sqlite3.Cursor) -> int:
    """§6 item 5 — add the missing fade-up row + wire used_by from real
    block_attributes.sgsAnimation default-value usage (DB-first, not invented)."""
    changed = 0

    existing = cur.execute("SELECT name FROM animation_tokens WHERE name = ?", ("fade-up",)).fetchone()
    if existing is None:
        cur.execute(
            "INSERT INTO animation_tokens (name, keyframes, duration, easing, description, category) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                "fade-up",
                "@keyframes fade-up { from { transform: translateY(16px); opacity: 0; } "
                "to { transform: translateY(0); opacity: 1; } }",
                "400ms",
                "ease-out",
                "Fade up entrance (translateY + opacity) — the most common Tier V entrance default",
                "entrance",
            ),
        )
        changed += 1
        print("  [set]  animation_tokens.fade-up: inserted")
    else:
        print("  [ok]   animation_tokens.fade-up: already present")

    # Wire used_by for every token from real sgsAnimation default-value usage.
    token_names = [
        r[0] for r in cur.execute("SELECT name FROM animation_tokens ORDER BY name").fetchall()
    ]
    for name in token_names:
        blocks = [
            r[0] for r in cur.execute(
                "SELECT block_slug FROM block_attributes "
                "WHERE attr_name = 'sgsAnimation' AND default_value = ? ORDER BY block_slug",
                (json.dumps(name),),
            ).fetchall()
        ]
        if not blocks:
            print(f"  [skip] animation_tokens.{name}: no block currently defaults sgsAnimation to it")
            continue
        used_by = ",".join(blocks)
        current = cur.execute(
            "SELECT used_by FROM animation_tokens WHERE name = ?", (name,)
        ).fetchone()[0]
        if current == used_by:
            print(f"  [ok]   animation_tokens.{name}.used_by: already {used_by}")
            continue
        cur.execute("UPDATE animation_tokens SET used_by = ? WHERE name = ?", (used_by, name))
        changed += 1
        print(f"  [set]  animation_tokens.{name}.used_by: {current!r} -> {used_by!r}")

    return changed


def main() -> int:
    if not DB_PATH.exists():
        print(f"[seed-motion-fx-registry] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()
    changed = 0

    print("== 1. fx_effects (§6.1 / §11.2 grammar) ==")
    _ensure_fx_effects_table(cur)
    changed += _seed_fx_effects(cur)

    print("== 2. block_attributes fx:* namespace (§6.2 / §11.3) ==")
    changed += _seed_fx_attr_namespace(cur)

    print("== 5. animation_tokens reconciliation (§6 item 5) ==")
    changed += _reconcile_animation_tokens(cur)

    con.commit()
    con.close()
    print(f"[seed-motion-fx-registry] done: {changed} row(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
