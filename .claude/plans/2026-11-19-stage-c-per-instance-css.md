---
status: active
doc_type: plan
created: 2026-11-19
---

# Stage C: shrink per-instance CSS at source

Spec: Spec 32 FR-32-11 (page-specific CSS) and FR-32-32 (delivery). Parent plan: `plans/2026-11-19-css-delivery.md` (Open 4).

## Goal and why

Mama's Home carries 415 KB of raw page-specific CSS (about 3,200 rules, only 993 distinct rule bodies: one nav hover colour 217 times, the container content width about 240 times). Every page prints its CSS inline (Mama's moved to `inline` on 2026-11-19), so that weight is paid on every visit. Done looks like: Mama's Home and Shop render exactly as before with far less CSS in the page, and PageSpeed (phones, median of 5) is at or above the baseline below, with Shop's 95 as the target.

**Baseline (Mama's on `inline` with the page cache, release `cd9718b2a`, 2026-11-19, PageSpeed API phones, median of 5):** Home 94 (range 86 to 98), total blocking time 168 ms; Shop 87 (79 to 90), LCP 3.30 s, total blocking time 209 ms. Shop's LCP image (the first product card, 14 KB AVIF) finishes downloading about 0.2 s in and then waits about 2.1 s to paint; the largest main-thread cost is Style & Layout, about 0.7 s, the browser matching this per-instance CSS (Shop's HTML is about 1 MB raw with its CSS inline). That Style & Layout cost is the lever Stage C measures; the other long tasks (Google's `gtag/js` 176 ms, `header-behaviours/view.js` 116 ms, `gtm.js` 83 ms) are outside it. Source: `plans/2026-11-19-css-delivery.md` Results.

## Approach

Fix the emitters, not the output. Two levers, both at the source:

1. **Drop values the block's stylesheet already applies.** A per-instance rule that sets a property to the same value the block's own `style.css` (or the theme token it reads) already gives that element adds bytes and nothing else. The emitter skips the declaration when the saved value equals the stylesheet's value for that element.
2. **Share one rule across instances with identical settings.** Today each instance prints its rules under its own uid class (`sgs-<block>-<md5 of attributes>`), so two nav items that differ in any attribute each print the same hover rule. The emitter gives a group of identical declarations one shared scope class and every matching instance carries that class. The precedent is already in the code: `plugins/sgs-blocks/includes/helpers-scoped-instance-vars.php::sgs_scope_class_for_root` mints a class from a hash of the rules, shared by every block whose rules match.

Rejected: post-processing the collected CSS in `class-sgs-css-registry.php::sgs_collect_css` (merge selectors with identical bodies after the fact). It keeps the waste in the render path, cannot reorder rules safely (source order is the cascade; the collector's comment forbids regrouping), and hides which emitter is wasteful. The collector stays a whole-string deduper.

## Out of scope

Delivery modes (`inline`/`bundle`), block stylesheets' own size, Custom CSS boxes (`sgsCustomCss`), and the editor (it keeps each block's `<style>` inline).

## Rules that bind

- Same change in more than 3 files: the migration-method detector first (`.claude/skills/migration-method/SKILL.md`: survey, fix, check, self-test).
- FP-5: each lever ships as three or more commits. FP-9: one mechanism in the shared emit helpers, not per-block patches.
- A change for one client never alters what another site renders: both levers must render identically on every site (same computed styles), so they need no per-site opt-in; the proof is the render-scope tool first (`scripts/render-scope/render-scope.py`), then the render check only on the pages it names, because this is shared code.
- No inline `style="…"` (`node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0).
- Source order: a shared rule must sit where the first instance's rule sat; a later instance's own rule that overrides it must still come after.

## Order

Task 1 first (it names the emitters). Tasks 2 and 3 are independent of each other (different helpers) and can run in parallel; each is its own three-commit series. Task 4 (deploy and measure) runs last, alone.

## Risks

- **Hidden override chains:** a "redundant" declaration may exist to beat a theme or core rule with higher specificity. Signal: the render check shows a difference on that element. Mitigation: the detector compares against the computed value with the declaration removed, not against the stylesheet text.
- **Cascade order with shared classes:** a shared rule printed once may land before an instance rule it used to follow. Mitigation: the self-test plants an override pair and fails if the order flips.

## First action

Run the survey on local-mamas Home: count rules and distinct bodies in `<style id="sgs-blocks-collected">`, and print the top 20 repeated bodies with the block that emitted each (under 5 minutes with a one-off script reading the rendered page).

## Wave 1: Measure

### Task 1: Detector, survey step
Why: names which emitters cause the repetition, so the fixes target the real 80%. Read first: `.claude/skills/migration-method/SKILL.md`; `plugins/sgs-blocks/includes/class-sgs-css-registry.php::sgs_lift_block_css`; `helpers-scoped-instance-vars.php`; `class-sgs-container-wrapper.php` (contentWidth); `helpers-hover-state.php::sgs_hover_state_rules` and the nav-bar-menu emitters. Changes: new `plugins/sgs-blocks/scripts/stage-c/` detector: `survey` (per page: rules, distinct bodies, bytes; each repeated body traced to its block and emit helper by tagging each lifted `<style>` with its block name in a debug pass), `check` (exit 1 when a page exceeds its recorded baseline), `--self-test` (planted repeat and planted override pair). Touches: local-mamas, local-indus, local-eye-care mirrors (read-only renders). Done when: survey output for Mama's Home, Shop, a product page and basket, and one page on each other mirror, lists the top emitters by bytes; self-test passes and fails with its plants removed. Depends on: none

Status: not started

## Wave 2: Fix (Tasks 2 and 3 in parallel)

### Task 2: Drop declarations the stylesheet already applies
Why: lever 1. Read first: Task 1's survey; Spec 32 §3 (the default-vs-hardcode test). Changes: the shared emit helpers Task 1 names (expected: container width/padding helpers, typography and colour rule builders) skip a declaration whose value equals the element's stylesheet value; the `fix` step lists each helper changed. Touches: plugin `includes/` helpers only. Done when: detector `check` shows the byte drop per page; `render-scope.py` names the affected pages and the render check on those pages reports no difference; PHP tests for each helper cover "equal value skipped, different value kept, override of a theme rule kept". Depends on: 1

Status: not started

### Task 3: One shared rule per identical declaration group
Why: lever 2. Read first: `helpers-scoped-instance-vars.php::sgs_scope_class_for_root` (the minted shared-class precedent); the collector's ordering note in `class-sgs-css-registry.php`. Changes: the emitters Task 1 ranks highest (expected: nav item hover colour, container content width) mint a shared scope class from the hash of their declarations and add it to each instance's root; the rule prints once, at the first instance. Touches: plugin `includes/` emit helpers and the affected `render.php` files (through the shared helper, not per block). Done when: Mama's Home distinct-body count approaches its rule count (target under 1,200 rules); self-test override pair keeps its order; render check on the pages render-scope names reports no difference; `audit-inline-styling.js --check` exits 0. Depends on: 1

Status: not started

## Wave 3: Ship and prove

### Task 4: Release and measure
Why: proves the Goal on the live shop. Read first: `CLAUDE.md` Build and deploy; the Mama's rules under Sites. Changes: none (deploy and record). Touches: all four sites (one release), Mama's live shop. Done when: journey check 6 of 6 before and after (`node E:\sgs-tmp\cc-plan\probe\journey.mjs`); `build-deploy.py --target sandybrown,mamas-test,indus-test,eye-care-test --page-weight` passes the page-weight gate (`scripts/check-page-weight.mjs`, baseline only shrinks); Mama's Home and Shop PageSpeed medians of 5 in `inline` mode at or above the baseline in Goal and why (Home 94, Shop 87; Shop's target is 95), with Style & Layout time on Shop and page CSS bytes recorded in `plans/2026-11-19-css-delivery.md` Results. Depends on: 2, 3

Status: not started
