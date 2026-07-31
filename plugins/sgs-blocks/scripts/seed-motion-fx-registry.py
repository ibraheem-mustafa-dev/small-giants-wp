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
#                          'track'|'none' — what the effect needs OF ITS
#                          TARGET, derived from each §2 row's own qualifiers
#                          (Conditions/Exposure-surface text). Closed
#                          vocabulary; per-row citation below.
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
        # pins/triggers (D416). UNSHIPPED - placeholder. Same target family as draw.
        "pins": 0,
        "triggers": "scroll,load,hover",
        "tier": "G",
        "plugin_set": ["MorphSVG"],
        "owns_scroll_transform": 0,
        "reduced_motion": "suppress",
        "editor_story": "end-state",
        # §2 row Level = "element" -> scope='element'. requires='svg' (value
        # UNCHANGED 2026-07-31 — only its MEANING narrowed, see the
        # requires-column note above): the row's Recommended->permitted
        # column ("Icons/logos -> decorative SVG anywhere (asset-gated)")
        # targets a block that IS a shape (MorphSVG rewrites the element's
        # OWN `d` attribute — there must be one to rewrite), which is the
        # narrower 'svg' provision, not the wider 'svg-subtree' one. Before
        # this split, morph shared draw's single 'svg' requirement, whose
        # provision computation ALSO included bgSvgContent — so
        # `sgs/container`/`sgs/hero`/`sgs/cta-section`/`sgs/trust-bar` (a
        # `<div>` wrapper with a decorative background SVG blob, no `d` of
        # its own to morph) were wrongly offered `morph`, which warns and
        # skips at runtime for exactly that reason (D430 finding). REASONED,
        # NOT SPEC-STATED: the spec never lists MorphSVG's exact block names
        # the way it does for DrawSVG's row — this reuses the SAME roster
        # the generator implements for 'svg' (SPEC_NAMED_SVG_BLOCKS, 3
        # members as of the 2026-07-31 QC correction below — NOT the spec's
        # own DrawSVG citation of 4, which still names `sgs/decorative-image`
        # that block has zero inline-SVG rendering, verified live via its
        # render.php, so it is not carried into either 'svg' or
        # 'svg-subtree'; the amendment text for Spec 38 §2's DrawSVG row was
        # returned to the spec owner rather than edited here) — as an
        # extrapolation from "same target family, same requires value", not
        # a literal citation.
        "scope": "element",
        "requires": "svg",
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
        # block does not exist yet (verified: no `sgs/image-sequence` under
        # src/blocks), so its qualifying-blocks roster is honestly EMPTY today
        # — the row exists for when the block ships, not to hide the gap.
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
        "tier": "G",
        "plugin_set": ["ScrollSmoother"],
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
    # `fxPath` -> fx:path. The curated motion-path route (s11.2, D427). This is
    # the AUTHORING surface; `data-sgs-fx-motion-path-target` is render-layer
    # OUTPUT and deliberately gets no row - a draft never writes it, and the
    # converter maps the route, never the resolved selector.
    "fxPath": "fx:path",
    "fxPathAsset": "fx:path-asset",
    "fxPathRotate": "fx:path-rotate",
    #
    # `fxShape` -> fx:shape. Seeded AHEAD of the morph control (s11.2 lists it
    # beside fx:path). Reports [skip] until a block declares it, which is the
    # documented no-op this step already has for every unshipped attr - the row
    # exists so the grammar's own claim is true of the registry rather than
    # true only of the effects that happen to have shipped.
    "fxShape": "fx:shape",
    #
    # `fxPreset` -> fx:preset. The client-facing intensity layer (s7). It is
    # deliberately NOT part of the data-attribute grammar: a preset writes its
    # values into the params above, so emitting the label as well would put an
    # attribute in the markup that no runtime reads. It IS a stored block
    # attribute, so it gets a registry row.
    "fxPreset": "fx:preset",
}

FX_EFFECTS_COLUMNS = (
    "effect", "tier", "plugin_set", "owns_scroll_transform",
    "reduced_motion", "editor_story", "scope", "requires",
    "pins", "triggers",
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


def _seed_fx_effects(cur: sqlite3.Cursor) -> int:
    changed = 0
    for row in FX_EFFECTS:
        effect = row["effect"]
        existing = cur.execute(
            "SELECT tier, plugin_set, owns_scroll_transform, reduced_motion, editor_story, "
            "scope, requires, pins, triggers FROM fx_effects WHERE effect = ?",
            (effect,),
        ).fetchone()
        plugin_set_json = json.dumps(row["plugin_set"])
        target = (
            row["tier"], plugin_set_json, row["owns_scroll_transform"],
            row["reduced_motion"], row["editor_story"], row["scope"], row["requires"],
            row["pins"], row["triggers"],
        )
        if existing is None:
            cur.execute(
                "INSERT INTO fx_effects "
                "(effect, tier, plugin_set, owns_scroll_transform, reduced_motion, "
                "editor_story, scope, requires, pins, triggers) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
            "reduced_motion=?, editor_story=?, scope=?, requires=?, pins=?, triggers=? "
            "WHERE effect=?",
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
        # Deliberately unversioned (13.9MB local dev knowledge base — see
        # .claude/dev-setup.md "sgs-framework.db" section). A contributor
        # without it builds off the already-committed generated artefacts
        # (generated-fx-effects.php, generated-fx-qualifying-blocks.php/json,
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
