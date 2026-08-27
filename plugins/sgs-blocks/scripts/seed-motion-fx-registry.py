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
#   scope                  'block'|'element'|'site'|'paired'|'flavour' — collapsed
#                          from the §2 taxonomy table's "Level" + "Exposure surface"
#                          columns (added 2026-07-29, task: "derived block roster").
#                          Mapping (documented once here, cited per-row below):
#                            'block'   <- §2 Level "container/section" or "block/
#                                         element" or "block (text-bearing)" or
#                                         "block (headings)" or "block (curated
#                                         roster)" or "block (dedicated, NET-NEW)"
#                                         -- an inspector panel on a specific block.
#                            'element' <- §2 Level "element" or "element (SVG-
#                                         bearing)" -- inspector on a block but
#                                         targeting a sub-element (an SVG path, a
#                                         path-follow target), still a per-block
#                                         panel surface.
#                            'site'    <- §2 Level "SITE" or "SITE + per-template"
#                                         -- theme settings / per-template override,
#                                         NEVER a block inspector (ScrollSmoother's
#                                         own row: "Site setting only -> per-
#                                         template opt-out (never per-block)").
#                            'paired'  <- §2 Exposure surface "PAIRED block
#                                         contract" -- a setting surfaced on BOTH
#                                         sides of a named pairing (filter-search x
#                                         card-grid), not a standalone per-block
#                                         toggle in the generic fx panel.
#                            'flavour' <- §2 Level "N/A (flavour ...)" -- never a
#                                         standalone surface; appears only inside
#                                         another G effect's own controls. No
#                                         `data-sgs-fx` grammar row exists for this
#                                         category (Physics2D/CustomBounce/
#                                         CustomWiggle), so it never gets a fx_effects
#                                         row at all -- flagged, not silently
#                                         dropped: there is nothing to seed here.
#   requires                'text'|'svg'|'svg-subtree'|'section'|'item-set'|
#                          'track'|'surface'|'image'|'none' — what the effect
#                          needs OF ITS TARGET, derived from each §2 row's
#                          own qualifiers (Conditions/Exposure-surface text).
#                          Closed vocabulary; per-row citation below.
#                          ('surface' added FR-38-25/D444 for cursor-field —
#                          this list line itself drifted behind that add and
#                          is corrected here, not just for the new row.
#                          'image' added for surface-treatment, Tier W,
#                          D479/D555 — see that row's own comment below.)
#
#                          'svg' vs 'svg-subtree' split 2026-07-31 (Motion
#                          Wave D register Step 4). Before this split both
#                          values were a single 'svg' token, computed by
#                          generate-fx-qualifying-blocks.py as "the block
#                          declares bgSvgContent OR is one of the 4 spec-named
#                          element blocks" — a UNION that conflated two
#                          different facts about a block:
#                            'svg'         — the block's rendered root IS a
#                                            shape with its own path/'d'
#                                            geometry (the 4 spec-named
#                                            element blocks: responsive-logo,
#                                            icon — empirically confirmed
#                                            live, see generator comment;
#                                            separator/decorative-image are
#                                            the spec's own closed citation,
#                                            carried forward unchanged — see
#                                            that generator's own flagged
#                                            gap note, not re-litigated here).
#                                            Correct target for MorphSVG,
#                                            which rewrites the element's OWN
#                                            `d` attribute — there must be a
#                                            `d` to rewrite.
#                            'svg-subtree' — the block CONTAINS inline SVG
#                                            somewhere in its rendered
#                                            subtree, which is a strictly
#                                            WIDER set: every 'svg' block
#                                            trivially also qualifies (a
#                                            shape IS a subtree), PLUS any
#                                            block whose wrapper renders an
#                                            operator-supplied `bgSvgContent`
#                                            decorative layer (sgs/container,
#                                            sgs/hero, sgs/cta-section,
#                                            sgs/trust-bar — verified via
#                                            block.json attribute presence).
#                                            Correct target for DrawSVG,
#                                            which strokes whatever
#                                            path/line/polyline/polygon/rect/
#                                            ellipse/circle it finds inside
#                                            the fx element (see
#                                            responsive-logo's render.php
#                                            comment on `collectDrawTargets()`
#                                            — it searches descendants, not
#                                            just the root).
#                          The bug this fixes: before the split, a block that
#                          only provided bgSvgContent (a `<div>` wrapper with
#                          a background SVG blob, no shape geometry of its
#                          own) satisfied the single 'svg' requirement and so
#                          was wrongly offered `morph` — which then warned
#                          and skipped at runtime because there is no `d` on
#                          the block's own root to rewrite. draw'S own row
#                          below was correct all along; only morph's implicit
#                          scope was too wide.
# ---------------------------------------------------------------------------
FX_EFFECTS: list[dict] = [
    {
        # FR-38-6, §2 row "Pin + scrub section timeline", §9 row 1, §10 row 1.
        "effect": "pin-scrub",
        # in_picker=1 — offered in fx.js's SHIPPED_EFFECTS picker. This key is
        # the DB's single statement of that fact; check-fx-list-drift.py (I1)
        # compares it against SHIPPED_EFFECTS in BOTH directions.
        "in_picker": 1,
        # pins/triggers (D416). VERIFIED: fx-pin-scrub.js sets pin:true. Pin spans a scroll RANGE, so scroll is the only coherent trigger.
        "pins": 1,
        "triggers": "scroll",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "container/section" -> scope='block' (Inspector panel on
        # sgs/container + section-KIND composites). requires='section': the row's
        # own Exposure-surface text names the target directly ("Inspector panel
        # on `sgs/container` + section-KIND composites").
        "scope": "block",
        "requires": "section",
    },
    {
        # FR-38-7, §2 row "Scroll-scrubbed element timeline", §9 row 1, §10 row 2.
        "effect": "scrub",
        "in_picker": 1,
        # pins/triggers (D416). VERIFIED not pinning. An entrance-style reveal: playing it on load or on hover are both coherent alternatives to scrubbing.
        "pins": 0,
        "triggers": "scroll,load,hover",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "block/element" -> scope='block' (Inspector panel, fx
        # ToolsPanel). requires='none': the row names no target qualifier at all
        # ("Any block -> any element with the fx panel exposed") — this is the
        # deliberately generic scrub, offered wherever the fx panel itself is.
        "scope": "block",
        "requires": "none",
    },
    {
        # FR-38-8, §2 row "Horizontal scroll panel", §9 row 1, §10 row 3.
        "effect": "horizontal-panel",
        "in_picker": 1,
        # pins/triggers (D416). VERIFIED: fx-horizontal-panel.js sets pin:true. Scroll maps to horizontal travel, so scroll is intrinsic.
        "pins": 1,
        "triggers": "scroll",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "section" -> scope='block' (Block variation of
        # sgs/container + inspector tuning). requires='section': "Pins
        # (ScrollTrigger)" needs a pinnable section, same target shape as
        # pin-scrub — "Top-level section -> nested container".
        "scope": "block",
        "requires": "section",
    },
    {
        # FR-38-10, §2 row "SplitText reveal" (explicitly "§4.3 exclusivity vs
        # entrance" in its Conditions column), §9 row 3, §10 row 5.
        "effect": "split-reveal",
        "in_picker": 1,
        # pins/triggers (D416). VERIFIED not pinning. Text reveal works equally as an on-load or on-hover play.
        "pins": 0,
        "triggers": "scroll,load,hover",
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
        # §2 row Level = "block (text-bearing)" -> scope='block' (Inspector panel
        # on heading/text/quote (+ hero headline)). requires='text': the row's own
        # Recommended->permitted column ("Headings first -> any text-bearing
        # block") names the target qualifier directly.
        "scope": "block",
        "requires": "text",
    },
    {
        # FR-38-11, §2 row "ScrambleText" (no §4.3 mention; §4.3's own text names
        # ScrambleText as a non-excluding effect), §9 row 3, §10 row 6.
        "effect": "scramble",
        "in_picker": 1,
        # pins/triggers (D416). UNSHIPPED (Wave B/C) - placeholder. Text scramble is a natural hover/load effect.
        "pins": 0,
        "triggers": "scroll,load,hover",
        "tier": "G",
        # ScrollTrigger is NOT decorative here: fx-scramble.js imports it and
        # its `scroll` trigger arm (the DEFAULT — provider.js `resolveTrigger`
        # returns 'scroll' when the attribute is absent) builds a real
        # `scrollTrigger` config. Declared 2026-07-31 after reading the BUILT
        # module's bare imports; the 2026-07-30 deploy report said this row had
        # been corrected, but the correction had never reached the seeder, so
        # the row still read ["ScrambleText"]. Undeclared it does not crash —
        # the import map still resolves the specifier — but WP emits no
        # dependency and no modulepreload, so the plugin arrives late.
        "plugin_set": ["ScrambleText", "ScrollTrigger"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "toggle",
        # §2 row Level = "block (headings)" -> scope='block'. requires='text':
        # REASONED, NOT SPEC-STATED — the closed vocabulary this task specifies
        # has no finer "headings only" value than 'text'; the row's own
        # Recommended->permitted column ("Headings -> labels/countdown digits")
        # is narrower than plain text-bearing but the spec never separates
        # "heading text" from "body text" as a target-qualifier concept anywhere
        # else in §2/§3, so 'text' is used and this narrowing is flagged rather
        # than inventing a new vocabulary value for one row.
        "scope": "block",
        "requires": "text",
    },
    {
        # FR-38-12, §2 row "Flip on filtered grids" (filter-event-triggered, not
        # scroll-driven), §9 row 4 ("Labelled no-preview"), §10 row 7.
        "effect": "flip",
        # pins/triggers (D416). UNSHIPPED - placeholder. FLIP animates a layout change; scroll is the only trigger Wave A can reason about.
        "pins": 0,
        "triggers": "scroll",
        "tier": "G",
        "plugin_set": ["Flip"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "no-preview",
        # §2 row Exposure surface = "PAIRED block contract" (Bean-cited text:
        # "Paired setting surfaced on BOTH `sgs/filter-search` and the filterable
        # block") -> scope='paired', NOT 'block' — this is deliberately
        # structurally excluded from the generic per-block fx ToolsPanel (Hard
        # constraint in the task brief); it needs its own paired-settings UI,
        # never built here. requires='item-set': "a set of siblings to
        # re-lay-out" (the task brief's own vocabulary definition for this
        # effect) — the discriminating capability is the pairing contract itself
        # (`supports.sgs.fx.pairedFilter`, not yet declared by any block —
        # verified via grep, zero hits), so the qualifying-blocks roster for
        # this effect is honestly EMPTY today.
        "scope": "paired",
        "requires": "item-set",
    },
    {
        # FR-38-13, §2 row "Draggable + Inertia", §9 row 5 ("Static; Notice"),
        # §10 row 8.
        "effect": "draggable",
        # pins/triggers (D416). UNSHIPPED - placeholder. Draggable is user-initiated: it is ARMED on load, never scroll-triggered.
        "pins": 0,
        "triggers": "load",
        "tier": "G",
        # Inertia ONLY — `Draggable` was dropped 2026-07-31. The effect name
        # still reads "Draggable + Inertia" in Spec 38 §2 because that names the
        # CAPABILITY, not the import list. fx-draggable.js no longer uses the
        # Draggable class: its `type: 'scroll'` mode re-parents the scroller's
        # children into a wrapper div (GSAP's own `Draggable.js:536`), which
        # destroys a grid/flex carousel track — measured live, an 8-slide track
        # collapsed to one column. The module now drives `scrollLeft` from
        # pointer events and uses InertiaPlugin purely as the release physics.
        # Enqueuing Draggable here would ship ~13KB gzip nothing imports.
        "plugin_set": ["Inertia"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "block (curated roster)" -> scope='block'. requires=
        # 'track': §2's own Conditions column names the mechanism directly —
        # "Roster-gated (`supports.sgs.fx.draggable`)" — an explicit per-block
        # opt-in flag, not a detectable structural signal. Verified via grep:
        # zero blocks currently declare `supports.sgs.fx.draggable`, so this
        # effect's qualifying-blocks roster is honestly EMPTY today (the §2
        # Recommended column names gallery/testimonial-slider/before-after/hero
        # decorations as the intended future roster, once each opts in).
        "scope": "block",
        "requires": "track",
    },
    {
        # FR-38-15, §2 row "DrawSVG" (§4.3 text explicitly names "DrawSVG on load"
        # as non-excluding), §9 row 6, §10 row 10.
        "effect": "draw",
        "in_picker": 1,
        # pins/triggers (D416). UNSHIPPED - placeholder. SVG line-draw is a common hover/load effect as well as scroll.
        "pins": 0,
        "triggers": "scroll,load,hover",
        "tier": "G",
        # ScrollTrigger declared 2026-07-31 for the same reason as `scramble`
        # above: fx-draw.js imports it and its scroll arm is a real scrubbed
        # `scrollTrigger` config, verified live on the Wave C canary (8 distinct
        # stroke-dash states across one scroll sweep).
        "plugin_set": ["DrawSVG", "ScrollTrigger"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "element (SVG-bearing)" -> scope='element'. requires=
        # 'svg-subtree' (CHANGED from 'svg' 2026-07-31, Motion Wave D register
        # Step 4 — see the requires-column note above for the full split
        # rationale): the row's Exposure-surface column NAMES the exact
        # roster — "Inspector on `sgs/responsive-logo`, `sgs/icon`,
        # `sgs/separator`, `sgs/decorative-image`" — a closed, spec-cited
        # list, not a detectable structural pattern (verified: no shared
        # block.json flag or DB role unifies these 4; `<svg` appears in a
        # dozen unrelated blocks' markup for chevrons/star icons, so a
        # "contains <svg>" heuristic would badly over-match). DrawSVG strokes
        # WHATEVER shape markup it finds inside the fx element's subtree
        # (verified: responsive-logo's render.php names
        # `collectDrawTargets()` as searching descendants, not just the
        # root), so 'svg-subtree' — not 'svg' — is the honest requirement:
        # it also correctly covers `sgs/container`/`sgs/hero`/
        # `sgs/cta-section`/`sgs/trust-bar`, whose `bgSvgContent` layer is a
        # real drawable SVG subtree even though none of those 4 blocks IS a
        # shape at its own root. The qualifying-blocks generator keys
        # 'svg-subtree' off the union of this literal spec citation and the
        # `bgSvgContent` attribute, not an inferred rule.
        "scope": "element",
        "requires": "svg-subtree",
    },
    {
        # FR-38-16, §2 row "MorphSVG", §9 row 6, §10 row 11. Not named in §4.3 at
        # all (asset-gated instant/duration morph of the path 'd', not a
        # transform/opacity scroll-scrub) -> owns_scroll_transform=0.
        "effect": "morph",
        "in_picker": 1,
        # pins/triggers (D416). UNSHIPPED - placeholder. Same target family as draw.
        "pins": 0,
        "triggers": "scroll,load,hover",
        "tier": "G",
        "plugin_set": ["MorphSVG"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "end-state",
        # requires CORRECTED 'svg' -> 'none', 2026-08-01 (D427 shape-pair
        # control build). SAME correction shape as motion-path's 'svg' ->
        # 'none' fix below, and it obsoletes this row's own PREVIOUS
        # reasoning (kept below, struck through in spirit, for the record):
        # that reasoning was written when `fx-morph.js`'s `el` (the element
        # carrying `data-sgs-fx="morph"`) had to be the block's OWN rendered
        # shape, because nothing else supplied one. `includes/fx-shape-
        # routes.php` (built this session) changes that: `el` is now ALWAYS
        # a render-layer-EMITTED `<svg class="sgs-fx-shape-visual">` carrying
        # a curated or uploaded shape pair, appended as a sibling after
        # WHATEVER block the client applied the effect to — never the
        # block's own root. The element "genuinely must be a shape" premise
        # below is therefore no longer true of the BLOCK; it is still true
        # of the thing MorphSVG tweens, but the render layer supplies that
        # unconditionally now, the exact same shape as the motion-path
        # correction's reasoning ("the traveller has no SVG requirement to
        # gate on, and 'svg' was restricting the control ... for a
        # constraint that belongs to the route, not to the thing travelling
        # along it" — read literally the same way here: the constraint
        # belongs to the SHAPE PAIR, not to the block wearing the effect).
        # scope stays 'element' — an inspector surface on a block, not a
        # site setting.
        #
        # PREVIOUS reasoning (2026-07-31, now superseded by the above):
        # requires='svg' targeted a block that IS a shape (MorphSVG rewrote
        # the element's OWN `d` attribute directly — there had to be one to
        # rewrite), reusing the SAME roster the generator implements for
        # 'svg' (SPEC_NAMED_SVG_BLOCKS: sgs/icon, sgs/responsive-logo,
        # sgs/separator) as an extrapolation from "same target family as
        # draw", not a literal spec citation.
        #
        # NOT YET LIVE: this is a SOURCE change only. The shared
        # sgs-framework.db still holds the old 'svg' value until the next
        # centrally-run reseed — see this script's own module docstring /
        # the D427 build report for the reseed request. Do not read the live
        # DB as agreeing with this comment until that reseed has run.
        "scope": "element",
        "requires": "none",
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
        "in_picker": 1,
        # pins/triggers (D416). UNSHIPPED - placeholder. Scroll-scrubbed path progress per its owns_scroll_transform=1 reasoning.
        "pins": 0,
        "triggers": "scroll",
        "tier": "G",
        "plugin_set": ["MotionPath", "ScrollTrigger"],
        "owns_scroll_transform": 1,
        "reduced_motion": "suppress",
        "editor_story": "end-state",
        # requires CORRECTED 'svg' -> 'none', 2026-07-31 (owner-directed, D427
        # build). The old value was inherited from the DrawSVG/MorphSVG rows
        # and was simply WRONG for this effect, which the code proves rather
        # than the spec asserting: fx-motion-path.js:191 calls
        # `gsap.to( el, { motionPath: { path, ... } } )` — `el` is the
        # TRAVELLER and can be any element at all; only `path` needs shape
        # geometry, and under D427 that path is a hidden <svg> the RENDER LAYER
        # generates from a curated preset (includes/fx-path-routes.php). So the
        # traveller has no SVG requirement to gate on, and 'svg' was restricting
        # the control to four blocks for a constraint that belongs to the route,
        # not to the thing travelling along it.
        #
        # Contrast `morph` above, which is left at 'svg' deliberately: MorphSVG
        # rewrites the element's OWN `d`, so there the element genuinely must be
        # a shape and the requirement is real.
        #
        # scope stays 'element' — it is still an inspector surface on a block,
        # not a site setting; scope and requires are independent columns.
        "scope": "element",
        "requires": "none",
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
        # pins/triggers (D416). UNSHIPPED - placeholder. pins is UNVERIFIABLE until the module exists; 0 is the safe default and is inert (see note above FX_EFFECTS).
        "pins": 0,
        "triggers": "scroll",
        "tier": "G",
        "plugin_set": ["ScrollTrigger"],
        "owns_scroll_transform": 0,
        "reduced_motion": "simplify",
        "editor_story": "end-state",
        # §2 row Level = "block (dedicated, NET-NEW)" -> scope='block'.
        # requires='none': the row's own target IS the new block itself
        # ("New block `sgs/image-sequence` inspector") — there is nothing
        # further to qualify against; a future block declaring this fx would
        # get it unconditionally, the same way scrub is unconditional. The
        # block SHIPPED after this comment was written (corrected 2026-08-24:
        # `src/blocks/image-sequence/` exists, agency-only with `inserter:
        # false`, and the `image-sequence` row is live in `fx_effects`). The
        # roster stays narrow because the block is the only qualifier, not
        # because nothing qualifies.
        "scope": "block",
        "requires": "none",
    },
    {
        # NOT one of the original §11.2 grammar's 11 rows — ScrollSmoother has
        # no `data-sgs-fx` value at all (it is never emitted as a per-element
        # attribute; §2's own row calls it "Site setting only", a theme-level
        # toggle, so there is no element to attach data-sgs-fx="scroll-smoother"
        # to). Added here (task: "give fx_effects the two missing dimensions")
        # specifically so the scope column can prove-by-construction that a
        # SITE-scoped effect is structurally excluded from every block panel —
        # the task's own acceptance test ("ScrollSmoother must never reach a
        # block inspector"). FR-38-18, §2 row "ScrollSmoother", §9/§10 rows for
        # ScrollSmoother (disabled in editor + wp-admin; disabled under
        # reduced-motion).
        "effect": "scroll-smoother",
        # pins/triggers (D416). UNSHIPPED - placeholder. scope=site, so it never reaches a block panel at all.
        "pins": 0,
        "triggers": "scroll",
        # tier='H', plugin_set=[] since D422 (2026-07-30): site-level smoothing
        # moved from GSAP ScrollSmoother to Lenis, and Lenis was admitted as
        # Tier H (helper/utility) rather than Tier G. This row carried tier='G'
        # and plugin_set=['ScrollSmoother'] until 2026-08-21 — naming a GSAP
        # plugin that decision retired. It was never load-bearing (scope='site'
        # means nothing activates it, and 'ScrollSmoother' is not a key in
        # SGS_Motion_Registry::PLUGIN_MODULES, so it enqueued nothing either
        # way) but a stale mechanism name is a trap for whoever reads it next.
        # plugin_set is EMPTY because Tier H is not GSAP-plugin shaped at all —
        # the same shape three other rows already use.
        "tier": "H",
        "plugin_set": [],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "no-preview",
        # scope='site': §2 Level column literally says "SITE"; Recommended-
        # >permitted column: "Site setting only -> per-template opt-out (never
        # per-block)". requires='none': a site setting has no per-block target
        # to qualify against — the whole point is that it never reaches a
        # block-level qualification check at all.
        "scope": "site",
        "requires": "none",
    },
    {
        # Same rationale as scroll-smoother above — Page transitions has no
        # `data-sgs-fx` grammar value (cross-document View Transitions, a
        # theme-settings toggle, not a per-element attribute). Included for the
        # same scope-gating proof. §2 row "Page transitions".
        #
        # NOTE tier='V', not 'G' — this is the ONE row in the table that is not
        # Tier G (the spec's own row: "V — cross-document View Transitions API
        # is CSS-first, no GSAP, no router"). The seeder's original module
        # docstring said "all 11 are 'G'"; that statement is now stale by
        # construction (13 rows, 1 of them 'V') — flagged here rather than
        # silently left wrong in the docstring above.
        "effect": "page-transitions",
        # pins/triggers (D416). UNSHIPPED - placeholder. scope=site; a page transition fires on navigation, not scroll.
        "pins": 0,
        "triggers": "load",
        "tier": "V",
        "plugin_set": [],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "no-preview",
        "scope": "site",
        "requires": "none",
    },
    {
        # FR-38-25 (Spec 38 §3.3), Bean-signed D444, WIDENED 2026-08-01 from a
        # single radial glow to a pluggable field-type system on Bean's ruling
        # that the effect "isn't limited to a glow/colour, it could be a
        # pattern, move floating objects etc".
        "effect": "cursor-field",
        # in_picker=1 DESPITE creates_panel=0 below — the two are independent,
        # and this row is exactly why `creates_panel` could not stand in for the
        # picker roster: cursor-field is offered wherever a panel already
        # exists, so it IS a picker entry while never creating a panel.
        "in_picker": 1,
        # pins/triggers. VERIFIED not pinning — it paints a background layer and
        # never touches scroll position. Pointer-driven, so 'hover' is the only
        # coherent trigger: there is nothing for 'load' or 'scroll' to mean.
        "pins": 0,
        "triggers": "hover",
        # Tier V — the shipped mega-menu implementation already does this in
        # vanilla with an rAF-throttled custom-property write and a live
        # reduced-motion gate. GSAP adds nothing §1.3's ratchet would accept,
        # and both shipped field types paint in pure CSS.
        "tier": "V",
        "plugin_set": [],
        "owns_scroll_transform": 0,
        # SIMPLIFY, never suppress (§10): the static resting field IS a
        # legitimate finished state, so the field still paints and only the
        # tracking stops. Suppressing would blank a surface the client styled.
        "reduced_motion": "simplify",
        # The canvas has no pointer to follow, so it shows the resting field —
        # which is exactly what a reduced-motion visitor sees. Same code path,
        # no bespoke editor branch.
        "editor_story": "end-state",
        "scope": "block",
        # 'surface' — a paintable background this field can be laid onto.
        # Derived in generate-fx-qualifying-blocks.py from containerKind being
        # set OR a background-image attribute being declared, per FR-38-25's
        # own emitter definition. NOT 'section': the emitter roster is broader
        # than section-KIND (layout and content containers qualify too).
        "requires": "surface",
        # Offered where a panel exists; never creates one. See the long note in
        # _ensure_fx_effects_table() — measured, not assumed: creating panels
        # here would put one on 11 blocks including the site header and nav menu.
        "creates_panel": 0,
    },
    {
        # FR-38-30 (Spec 38 §3.3), Bean-approved 2026-08-24. An element
        # leans toward the pointer while it is still OUTSIDE it — a proximity
        # radius, which is the whole difference between a magnetic button and a
        # hover state.
        #
        # NOT A NEW MECHANISM: `src/shared/effects/magnet.js` has shipped since
        # the mega-menu build, driving `sgs/nav-menu`'s label nudge. This effect
        # generalises that module (two axes + a proximity radius) rather than
        # writing a second one. `initMagnet`'s no-options behaviour is unchanged
        # and byte-identical, so nav-menu is untouched.
        "effect": "wave-gradient",
        # ⛔ TIER W'S SECOND ENTRY, and it WIDENS the tier rather than extending
        # it. Recorded here because the D-number must not read as "one more
        # shader". Tier W's founding premise is that a `null` return IS the
        # fallback — the untouched <img> is already the finished state, so there
        # is no second path to keep in sync. That holds ONLY because there is a
        # source image. This effect is GENERATIVE: there is no untouched
        # anything, so a real CSS fallback ships alongside it and must be kept
        # in sync forever. That is the exact cost Tier W was designed to avoid.
        #
        # Bean's ruling 2026-08-25, after two researchers BOTH recommended not
        # building it: "just model the stripe setup exactly", with client
        # colours. He also chose autonomous over cursor-driven, which is what
        # stripe.com does and which fixes the mobile problem — a cursor effect
        # renders nothing at all on a phone, and phones are most client traffic.
        "in_picker": 1,
        # Autonomous: starts on its own and runs while visible. NOT 'hover' —
        # that would misdescribe it in the one column that records what starts
        # the motion, and this effect's whole SC 2.2.2 exposure comes from
        # starting without being asked.
        "pins": 0,
        "triggers": "load",
        "tier": "W",
        "plugin_set": [],
        "owns_scroll_transform": 0,
        # SIMPLIFY, not suppress: under `reduce` the module draws exactly ONE
        # frame and stops, so the visitor still gets the gradient. Blanking a
        # section the client styled would be the degrade-to-LESS-content
        # failure; a still gradient is a legitimate finished state.
        "reduced_motion": "simplify",
        # The editor canvas never boots frontend script modules, so it shows the
        # CSS fallback — which is the honest preview: it is exactly what a
        # no-WebGL visitor sees, in the client's own colours.
        "editor_story": "end-state",
        "scope": "block",
        # 'surface' — a paintable background, the same token cursor-field uses.
        # Not 'image': this generates its own pixels rather than treating one.
        "requires": "surface",
        # Offered where a panel exists; never creates one. Same containment
        # measurement D459 forced for cursor-field.
        "creates_panel": 0,
    },
    {
        "effect": "magnet",
        # in_picker=1 with creates_panel=0, the same pair cursor-field carries
        # and for the same reason: offered wherever an fx panel already exists,
        # never creating one.
        "in_picker": 1,
        # Pointer-driven, so 'hover' is the only coherent trigger — there is
        # nothing for 'load' or 'scroll' to mean.
        "pins": 0,
        "triggers": "hover",
        # Tier V. The 2026-08-02 motion-ecosystem survey: magnetic buttons and
        # cursor followers "are commonly ~20-30 lines of vanilla JS (mousemove
        # + rAF + CSS transform) — write it, don't dependency it".
        "tier": "V",
        "plugin_set": [],
        # It writes `transform` on ONE element from pointer position, never
        # across a scroll range, so it does not own the scroll transform and
        # does not exclude a Tier V entrance (§4.3).
        "owns_scroll_transform": 0,
        # SUPPRESS, and this differs from cursor-field's SIMPLIFY on purpose.
        # A resting field is a legitimate finished PAINT; a displaced element is
        # not a finished position — its finished position is where the layout
        # put it. Under `reduce` the element simply sits still, which is also
        # exactly the no-JS state, so there is no second code path.
        "reduced_motion": "suppress",
        # The editor shows the element at its authored position, which IS the
        # resting state. Same code path as reduced motion.
        "editor_story": "end-state",
        "scope": "block",
        # PERMISSIVE. Structurally, anything with a box can be nudged toward a
        # pointer — there is no capability to require, which is exactly what
        # `requires='none'` means here (the same value `scrub` and `motion-path`
        # carry). Combined with creates_panel=0 it reaches every block that
        # already hosts an fx panel, INCLUDING sgs/button, with zero widening of
        # the panel roster. Measured before the row was written: sgs/button
        # already offers morph / motion-path / scramble / scrub / split-reveal.
        "requires": "none",
        # Offered where a panel exists; never creates one. A magnet control on
        # a form field or a star rating is precisely the "13 panels where none
        # makes sense" containment failure D459 exists to prevent.
        "creates_panel": 0,
    },
    {
        # FR-38-32, owner-approved. A canvas-painted pointer trail — three
        # presets (sparks / gravity-dots / ripple), one shared engine
        # (`src/shared/effects/particles.js`); the params table inside that
        # file is the only thing that differs per preset.
        "effect": "particles",
        # in_picker=1 with creates_panel=0, the same pair magnet/cursor-field
        # carry and for the same reason: offered wherever an fx panel already
        # exists, never creating one.
        "in_picker": 1,
        # Pointer-driven — there is nothing for 'load' or 'scroll' to mean
        # for an effect that paints only where the cursor has actually been.
        "pins": 0,
        "triggers": "hover",
        # Tier V. A 150-particle pool integrated with plain arithmetic on a
        # <canvas> 2D context is nowhere near what needs a GPU pass — see
        # Tier W's own five-part admission test (D479), which this effect
        # does not come close to needing.
        "tier": "V",
        "plugin_set": [],
        # It paints particles from pointer samples, never drives a scroll
        # transform, so it does not exclude a Tier V entrance (§4.3).
        "owns_scroll_transform": 0,
        # SUPPRESS, same reasoning as magnet's own row above: a painted
        # particle is not a finished resting state the way a still field is
        # for cursor-field — there is nothing to paint until the pointer
        # moves, so under `reduce` there is simply nothing, which is also
        # exactly the no-JS state. No second code path.
        "reduced_motion": "suppress",
        # The editor canvas never boots frontend script modules, so it shows
        # the block exactly as authored, with no trail — the resting state.
        "editor_story": "end-state",
        "scope": "block",
        # PERMISSIVE, same reasoning as magnet's own row above: structurally
        # anything with a box can host a pointer trail — there is no
        # capability to require. Combined with creates_panel=0 it reaches
        # every block that already hosts an fx panel, with zero widening of
        # the panel roster.
        "requires": "none",
        # Offered where a panel exists; never creates one. Same containment
        # discipline D459 established for cursor-field/magnet.
        "creates_panel": 0,
    },
    {
        # FR-38-33 cursor grid-dot field. Owner-specified 2026-08-27, built
        # 2026-08-28 to Preset B after a design gate run against a live
        # prototype (nine published references were measured first and NOT ONE
        # does this — they attract without clamping, repel, or only brighten).
        "effect": "grid-dots",
        "in_picker": 1,
        # Pointer-driven, so 'hover' is the only coherent trigger — there is
        # nothing for 'load' or 'scroll' to mean for an effect whose entire
        # state is a function of where the pointer currently is. Same reasoning
        # cursor-field / magnet / particles each record.
        "pins": 0,
        "triggers": "hover",
        # Tier V. A grid of dots with an ease-back integrator needs no GPU
        # shader, so §1.3's ratchet refuses anything dearer. ⛔ NOT Tier W —
        # that list stays closed (FR-38-33 says so explicitly).
        "tier": "V",
        "plugin_set": [],
        # Never touches scroll position; it paints a background layer.
        "owns_scroll_transform": 0,
        # SUPPRESS, not simplify — matching magnet/particles rather than
        # cursor-field. `fx-grid-dots.js` creates NO instance and attaches NO
        # listener under reduced motion, so there is no canvas at all and the
        # page is byte-identical to the no-JS state. Nothing is hidden from a
        # reduced-motion visitor that a JS-less visitor would have seen.
        "reduced_motion": "suppress",
        "editor_story": "end-state",
        "scope": "block",
        # 'surface' — it paints a background field across an area, so it needs a
        # paintable surface, exactly as cursor-field and wave-gradient do. This
        # is the field that decides the qualifying roster, and 'surface' is what
        # scopes it to the section-shaped blocks (container / cta-section /
        # hero) rather than offering a full-bleed dot lattice on a button.
        "requires": "surface",
        # Offered where a panel exists; never creates one. Same containment
        # discipline as cursor-field/magnet/particles above — a background
        # decoration must not be the reason a brand-new fx panel appears on a
        # nav or a form.
        "creates_panel": 0,
    },
    {
        # Spec 38 §11 loop FR. Bean, verbatim: "looping should not be tied to
        # the drag effect — they should be independent controls", and "we're
        # not setting the default behaviour in all carousels, just making the
        # functionality available to those who want it." Task B (Wave D plan)
        # falsified the original "add to fx-draggable.js" fix-shape — that
        # file's own docblock is a documented prior decision rejecting a
        # block-agnostic module doing wrap-around maths. This is therefore a
        # SEPARATE module (`shared/effects/fx-carousel-loop.js`) on the SAME
        # element `draggable` may also mark, coordinating with it rather than
        # editing it.
        "effect": "carousel-loop",
        # Armed on load, same as draggable — not scroll-triggered, and there
        # is no coherent "hover" reading for a wrap-around correction.
        "pins": 0,
        "triggers": "load",
        # Tier V — pure DOM clone + scrollLeft management, no GSAP import.
        # Nothing here needs a physics solver; it is a positional correction,
        # not a tween. A page using this and no Tier G effect ships zero GSAP
        # bytes, same promise cursor-field/smooth-scroll already keep.
        "tier": "V",
        "plugin_set": [],
        "owns_scroll_transform": 0,
        # Not a genuine SIMPLIFY/SUPPRESS split — see the module's own
        # docblock: the scrollLeft correction is an instantaneous position
        # write, never an animation, so there is nothing to gate either way.
        # Recorded as 'simplify' because that is the closer of the two
        # existing values (the capability itself never switches off; only an
        # arrow's OWN `scrollIntoView({behavior:'smooth'})` — owned by each
        # block's view.js, unchanged by this effect — is what actually
        # animates and is already independently reduced-motion-gated there).
        "reduced_motion": "simplify",
        # SSR renders the plain, un-looped, real-order scroller — exactly the
        # finished state with JS blocked, same as draggable's own choice.
        "editor_story": "end-state",
        # §2 shape mirrors `draggable` exactly: scope='block', requires=
        # 'track' (the SAME native-horizontal-scroller structural signal,
        # reused via motion-utils.js — see the module's own docblock for why
        # it is a deliberate duplicate rather than an import from the frozen
        # fx-draggable.js). Roster-gated per block, not a detectable-anywhere
        # capability: `sgs/gallery`'s carousel layout is the first block
        # wired to it, via its own `loopCarousel` attribute + inspector
        # control, exactly the pattern `dragToScroll` already established.
        "scope": "block",
        "requires": "track",
        # creates_panel=0, DELIBERATE, not merely inherited. This effect uses
        # its OWN `data-sgs-loop` grammar (see class-sgs-motion-registry.php),
        # never the shared `data-sgs-fx` picker value — a marker on the block
        # ROOT via the generic "Scroll & effects" panel would be USELESS here
        # for the same reason it was for `draggable`: the scroller is a
        # DESCENDANT (`.sgs-gallery__grid`), not the block root, and the
        # generic panel only ever stamps the root. So this effect is excluded
        # from `fx.js`'s SHIPPED_EFFECTS/qualifying-blocks roster entirely
        # (never added there) and creates_panel documents that decision
        # rather than being consulted by any code path — same shape as
        # `draggable`'s row above, which also never gained a `creates_panel`
        # key and is also never offered from the generic panel.
        "creates_panel": 0,
    },
    {
        # Tier W (D479, "rendering substrate" tier — WebGL) / D555. A shader
        # pass (grain, halftone, duotone — TREATMENT_PRESETS in
        # src/shared/effects/surface-treatments/presets.js) drawn ONCE over a
        # block's own image, via the four fxTreatment* attrs named in the
        # build brief. This is the first fx_effects row of tier 'W' — every
        # prior row is 'V' or 'G'; D479's own five-part test is what admits a
        # rendering substrate as a tier at all, not re-litigated here.
        "effect": "surface-treatment",
        "in_picker": 1,
        # pins/triggers. VERIFIED against the built runtime shape (a WebGL
        # canvas painted once over the target <img>, no scroll/hover
        # listener, no re-render loop): there is nothing to pin (it never
        # spans a scroll range) and nothing for a trigger enum to arm —
        # 'load' is the only coherent reading, matching every other
        # draw-once-on-mount effect in this table (e.g. `draggable`).
        "pins": 0,
        "triggers": "load",
        "tier": "W",
        # No GSAP plugin — this is the WebGL rendering substrate itself, not
        # a GSAP-driven tween. plugin_set stays the GSAP-plugin-name channel
        # every other row uses it for; a Tier W effect has nothing to put
        # there, same shape as the Tier V rows above (cursor-field,
        # carousel-loop, page-transitions) which are also `[]`.
        "plugin_set": [],
        "owns_scroll_transform": 0,
        # 'simplify', NOT 'unimplemented': this effect draws its shader pass
        # once on load and NEVER animates again — there is no ongoing motion
        # for `prefers-reduced-motion` to gate off. Output is byte-identical
        # whether reduced-motion is set or not, because there was only ever
        # one frame to draw. This is the SAME "nothing to gate" shape
        # `cursor-field` documents on its own row above (a resting/static
        # state IS the finished state); `simplify` is the established value
        # for exactly this case, not a placeholder for a degradation that
        # was never built.
        "reduced_motion": "simplify",
        # 'no-preview': WebGL requires a real GPU-backed <canvas> context: the
        # block editor's iframe can construct one, but doing so for every
        # image on every block in the canvas is exactly the cost D479's own
        # budget doctrine gates against (a NAMED 120KB allowance is for
        # PAGES that opt in, not for the editor always paying it). The
        # editor therefore shows the plain untreated image — a real, honest
        # state (not a broken preview) — and the treatment only ever paints
        # on the published frontend. Matches `scroll-smoother`/
        # `page-transitions`'s own 'no-preview' rows for the same "cannot
        # honestly preview this surface in wp-admin" reason.
        "editor_story": "no-preview",
        "scope": "block",
        # 'image' — this effect's target is the block's own rendered <img>,
        # not a section/text/svg surface. See generate-fx-qualifying-blocks.py
        # `_block_provisions()` for how a block DECLARES this requirement
        # (supports.sgs.imageControls === true, the project-mandated flag on
        # every image-rendering block — never a hardcoded block-name list).
        "requires": "image",
        # creates_panel=0, DELIBERATE. Same containment reasoning as
        # `cursor-field`'s own row (D459/FR-38-25's "13 panels where none
        # makes sense" containment failure): `imageControls` is declared on
        # 15 of 83 blocks (7 with it `true` — see generate-fx-qualifying-
        # blocks.py's own comment for the measured count), and several of
        # those are decorative/logo-shaped blocks where a shader-treatment
        # panel is not a sensible default surface. Offering the effect
        # (in_picker=1) wherever a qualifying block ALREADY has a fx panel
        # for another reason, without unconditionally creating a NEW panel
        # on every imageControls block, is the same measured containment
        # choice cursor-field made — not re-derived from scratch here.
        "creates_panel": 0,
    },
    {
        # Generative background (Spec 38, D874 technique spec — the
        # generative-background-engine build). Tier W's THIRD entry.
        #
        # ⛔ v1 IS STATIC — this row describes the SHIPPED v1 build, not the
        # technique spec's later folded-plane/animation sections (v1.1, a
        # separate, later, design-gated build per the spec's own kill
        # criterion). A single OKLCH-interpolated gradient image, built once
        # on a <canvas> 2D context (`fx-generative-background.js`) and
        # painted as a static background. No shader, no WebGL context, no
        # per-frame draw loop.
        "effect": "generative-background",
        "in_picker": 1,
        # Nothing to pin (it never spans a scroll range) and nothing for a
        # trigger enum to arm beyond the initial paint — 'load' matches
        # `surface-treatment`'s own draw-once-on-mount row above.
        "pins": 0,
        "triggers": "load",
        "tier": "W",
        # No GSAP plugin — v1 is Canvas 2D colour maths, not a GSAP-driven
        # tween and not a shader. Same shape as `surface-treatment`'s `[]`.
        "plugin_set": [],
        "owns_scroll_transform": 0,
        # 'simplify', same reasoning as `surface-treatment`'s own row: v1
        # draws its image once on load and never animates again — there is
        # no ongoing motion for `prefers-reduced-motion` to gate off, and
        # output is byte-identical whether reduced-motion is set or not.
        "reduced_motion": "simplify",
        # 'end-state', NOT 'no-preview' — unlike `surface-treatment`, v1
        # needs no GPU-backed WebGL context (Canvas 2D is cheap and already
        # used throughout wp-admin), so the editor canvas CAN honestly show
        # the real built image. It currently shows the CSS fallback instead
        # (the editor never boots frontend script modules, same as
        # wave-gradient) — which is still an honest "end state" preview in
        # the client's own colours, not a broken one.
        "editor_story": "end-state",
        "scope": "block",
        # 'surface' — a paintable background, the same token
        # wave-gradient/cursor-field use. Not 'image': this generates its
        # own pixels rather than treating one.
        "requires": "surface",
        # Offered where a panel exists; never creates one. Same containment
        # measurement D459 forced for cursor-field/wave-gradient.
        "creates_panel": 0,
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
    # D417 — how long a pinning effect holds its finished state before the pin
    # releases. Spec 38 s11.2 amended in the same change that added this.
    "fxHold": "fx:hold",
    "fxScrub": "fx:scrub",
    "fxStagger": "fx:stagger",
    "fxDuration": "fx:duration",
    "fxEase": "fx:ease",
    # ------------------------------------------------------------------
    # Added 2026-07-31 — closing the gap between what the GRAMMAR claims and
    # what the registry actually holds. Spec 38 s11.3 states a "1:1 attr
    # mapping"; before these rows that sentence was aspirational for three
    # attributes that were already emitted, already read by a runtime module,
    # and already controlled in the editor, while appearing in no fx:* row.
    # ------------------------------------------------------------------
    #
    # `dragMomentum` -> fx:momentum. THE DRIFT HAZARD, and note the attr name:
    # unlike every other row here this is a BLOCK attribute, not an fx
    # extension attribute. sgs/gallery and sgs/testimonial-slider both declare
    # `dragMomentum` in their block.json and both emit `data-sgs-fx-momentum`
    # from render.php; fx-draggable.js / testimonial-slider's view.js read it
    # back off the DOM. So the whole loop existed EXCEPT the registry row, and
    # the mapping is keyed on the real declared attr name rather than an
    # invented `fxMomentum` that no block.json has - a row keyed on a name
    # nothing declares would report [skip] forever and prove nothing.
    "dragMomentum": "fx:momentum",
    #
    # `loopCarousel` -> fx:loop (Spec 38 s11 loop FR, 2026-08-02). Same shape
    # as `dragMomentum` above and for the same reason: a real BLOCK attribute
    # (not an fx extension attribute), declared in sgs/gallery's block.json,
    # emitted as `data-sgs-loop="1"` from its own render.php and read back by
    # `shared/effects/fx-carousel-loop.js`. Deliberately its own `fx:loop`
    # value rather than folded into `fx:momentum`'s neighbourhood — looping
    # is an INDEPENDENT control from drag (Bean's ruling), so the cloning
    # grammar keeps them as two separate mappable attributes.
    "loopCarousel": "fx:loop",
    #
    # `dragToScroll` -> fx:draggable (2026-08-13, DB role-remediation part 2). Same
    # shape as `dragMomentum`/`loopCarousel` above: a real BLOCK attribute (not an fx
    # extension attribute), the master gate `sgs/gallery/render.php:101,113-114` reads
    # to decide whether to emit `data-sgs-fx="draggable"` at all (the SAME grammar
    # `dragMomentum` rides — that attribute only ever matters once `dragToScroll` has
    # already turned the feature on). Found by a parallel investigation agent
    # confirming that TIER 3.17's `css_property LIKE 'fx:%'` rescue could never reach
    # `dragToScroll` because it had no fx:* marker at all -- this registry row is the
    # actual "at source" fix (registry-completeness gap), not a new assign-canonical.py
    # tier: once this row exists, TIER 3.17 self-corrects `dragToScroll` -> 'behaviour'
    # on any future reseed with no further action needed.
    "dragToScroll": "fx:draggable",
    #
    # `fxPath` -> fx:path. The curated motion-path route (s11.2, D427). This is
    # the AUTHORING surface; `data-sgs-fx-motion-path-target` is render-layer
    # OUTPUT and deliberately gets no row - a draft never writes it, and the
    # converter maps the route, never the resolved selector.
    "fxPath": "fx:path",
    "fxPathAsset": "fx:path-asset",
    "fxPathRotate": "fx:path-rotate",
    #
    # `fxPathRest` / `fxPathRestVh` -> fx:path-rest / fx:path-rest-vh (D441,
    # 2026-08-01). The resting-position control: where the traveller settles
    # once its scrub completes (below-header / middle / lower-third / custom
    # preset, plus a 5vh-stepped fine-tune for custom). Both map to plain
    # `data-sgs-fx-motion-path-rest*` attributes that `assets/css/
    # fx-motion-path.css` resolves declaratively via `calc()`/`max()` against
    # `--sgs-header-height` — mirrors `fxPathRotate`'s naming shape (the
    # runtime's own attribute name, not an invented one) rather than the
    # `fx:path-*` shape used for the route-picking pair above, because these
    # two are consumed by the SAME runtime attribute family, not new ones.
    "fxPathRest": "fx:path-rest",
    "fxPathRestVh": "fx:path-rest-vh",
    #
    # `fxShape` -> fx:shape. Seeded AHEAD of the morph control (s11.2 lists it
    # beside fx:path). Reports [skip] until a block declares it, which is the
    # documented no-op this step already has for every unshipped attr - the row
    # exists so the grammar's own claim is true of the registry rather than
    # true only of the effects that happen to have shipped.
    "fxShape": "fx:shape",
    #
    # `fxShapeAssetFrom` / `fxShapeAssetTo` -> fx:shape-asset-from /
    # fx:shape-asset-to. The MorphSVG `custom` mode's two media-library
    # attachment IDs (2026-08-01, D427 build). TWO rows, not one, because a
    # morph pair is never a single asset the way a motion-path route is - it
    # needs a matched FROM and TO shape, and `includes/fx-shape-routes.php`
    # resolves them independently (either missing fails the whole pair, see
    # that file's `sgs_fx_resolve_shape_pair()`). Naming mirrors `fxPathAsset`
    # exactly, split by direction rather than invented from scratch.
    "fxShapeAssetFrom": "fx:shape-asset-from",
    "fxShapeAssetTo": "fx:shape-asset-to",
    #
    # `fxPreset` -> fx:preset. The client-facing intensity layer (s7). It is
    # deliberately NOT part of the data-attribute grammar: a preset writes its
    # values into the params above, so emitting the label as well would put an
    # attribute in the markup that no runtime reads. It IS a stored block
    # attribute, so it gets a registry row.
    "fxPreset": "fx:preset",
    #
    # `fxDisableTablet` / `fxDisableMobile` -> fx:disable-tablet /
    # fx:disable-mobile (Spec 38 s7 build task, D446 Task 15, 2026-08-01).
    # Per-breakpoint disable, named with the EXISTING device-tier suffix
    # vocabulary (Tablet/Mobile) the rest of the framework already uses for
    # responsive attrs, not a new one. Booleans, unlike every other row here
    # - `includes/fx-attributes.php` and `fx.js` both special-case them
    # outside the generic value-or-absent FX_ATTR_MAP loop for exactly that
    # reason (a `false` is not `''`/`null`, so the generic rule would leave
    # an empty-but-present attribute rather than omitting it).
    "fxDisableTablet": "fx:disable-tablet",
    "fxDisableMobile": "fx:disable-mobile",
    #
    # `fxTreatment` / `fxTreatmentIntensity` / `fxTreatmentShadow` /
    # `fxTreatmentHighlight` -> fx:treatment / fx:treatment-intensity /
    # fx:treatment-shadow / fx:treatment-highlight (Tier W surface-treatment,
    # D479/D555). Same shape as the fxPath*/fxShape* rows above: the AUTHORING
    # attrs a block declares in its own block.json, each mapped 1:1 to its
    # `fx:*` pseudo-namespace name rather than invented from scratch. Four
    # separate rows, not one, because the shader pass has four independently
    # settable parameters (preset id, an intensity float, and two colour
    # overrides) — collapsing them would lose which one a cloned draft's
    # value belongs to.
    "fxTreatment": "fx:treatment",
    "fxTreatmentIntensity": "fx:treatment-intensity",
    "fxTreatmentShadow": "fx:treatment-shadow",
    "fxTreatmentHighlight": "fx:treatment-highlight",
    #
    # `fxPin` -> fx:pin (2026-08-28, registry-completeness gap). A real BLOCK
    # attribute on sgs/image-sequence, read by `shared/effects/gsap/
    # fx-image-sequence.js` as `data-sgs-fx-pin` to decide whether the canvas
    # pins for the duration of its scrub. It had NO fx:* marker at all, so it
    # sat at css_property=NULL with nothing marking it — the same
    # registry-completeness gap `dragToScroll` had above, and the same fix.
    # `attr-classification-overrides.json` already recorded the diagnosis in
    # its own `_reason` field ("not yet seeded into the fx:* namespace ...
    # unlike its siblings fxStart/fxEnd/fxScrub") without anyone acting on it.
    "fxPin": "fx:pin",
    #
    # `fxDraggable` -> fx:drag-handle, NOT fx:draggable.
    #
    # ⛔ THE OBVIOUS NAME IS ALREADY TAKEN. `dragToScroll` claims `fx:draggable`
    # ~70 lines above. These are two genuinely different mechanisms that both
    # reasonably answer to the word "draggable", and collapsing them would lose
    # which one a cloned draft's value belongs to (the same argument the
    # fxTreatment* rows make for staying four rows rather than one):
    #   · `dragToScroll` (sgs/gallery, sgs/buybox, sgs/google-reviews) — drag a
    #     carousel horizontally to SCROLL it. Gates `data-sgs-fx="draggable"`.
    #   · `fxDraggable`  (sgs/before-after) — GSAP Draggable free-drag on the
    #     comparison DIVIDER (`before-after/view.js:20`, read as
    #     `data-sgs-fx-draggable`). Nothing scrolls; it moves a handle.
    # Hence `fx:drag-handle` — named for what it actually drags. This is a
    # judgement call on a DB-namespace name, made deliberately and reversible:
    # if a later spec amendment prefers a different value, change it here and
    # reseed; nothing downstream hardcodes it.
    "fxDraggable": "fx:drag-handle",
}

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

    print("== 5. animation_tokens reconciliation (§6 item 5) ==")
    changed += _reconcile_animation_tokens(cur)

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
