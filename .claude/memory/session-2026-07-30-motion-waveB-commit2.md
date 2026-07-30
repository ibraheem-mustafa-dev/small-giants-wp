---
doc_type: session-record
date: 2026-07-30
track: Spec 38 motion — Wave B, commit 2 (WAVE CLOSED)
commits: 984f2944
decision: D424
status: Wave B CLOSED — FR-38-18 and FR-38-19 both built + live-verified
---

# Motion Wave B, commit 2 — page transitions (D424)

## Outcome assessment (honest)

**OUTCOME ACHIEVED for Wave B as a whole.** FR-38-19 is built, deployed, and live-verified against
all five acceptance criteria; the three items owed from commit 1 are closed; both qc-council
sub-cases are run. What remains is **Bean's eye** (R-31-13) — the canary is left with transitions
ON so he can look — plus named, un-run browser cases (Firefox, Safari) that are fallback-by-design
rather than gaps in the build.

## What shipped

Cross-document View Transitions as a site setting + per-template style (fade / slide / none) on the
existing **SGS → Motion** page, sharing the existing `sgs_motion_settings` option. Tier V:
**CSS-only, zero frontend JS** — the browser owns the transition, so there is no router and nothing
to tear down. A browser without support navigates normally, which IS the specified fallback.

Four files: a new `assets/css/view-transitions.css`, the registry (read-side defaulting + the
conditional enqueue that resolves the active template), the settings page, and the dependent-control
admin script.

## Three decisions worth not re-litigating

1. **Reduced motion gates the OPT-IN, not the animation.** `@media (prefers-reduced-motion:
   no-preference){ @view-transition{navigation:auto} }`. The browser then never does the snapshot
   work for those visitors, and a UA that cannot evaluate the feature fails toward *less* motion.
   Found incidentally during verification: **WordPress 7.0.2 core ships the identical construction**
   in its own admin CSS. The pattern is core's, not ours.
2. **`root` snapshot pair, not per-element `view-transition-name`.** The spec's old wording named a
   different capability (element continuity across a navigation — a thumbnail growing into a hero).
   The spec text was corrected rather than the code.
3. **`mix-blend-mode: normal` made explicit.** The `animation` shorthand incidentally drops the UA's
   `plus-lighter` blend animation. `plus-lighter` sums colours additively and only looks right while
   the snapshots fully overlap — which the slide style deliberately breaks, producing banding. The
   safety was *accidental*; now stated, so a future "restore the platform default" cannot silently
   reintroduce it.

## What the council caught before it shipped

Three raters (WP-mechanics / security+spec-lawyer / CSS-browser). No blockers; no architectural
refutation. The one that mattered:

- **The style enum was DUPLICATED across the two classes while a comment claimed it was shared.**
  Divergence would have been silent and in the worst direction — the admin accepting and storing a
  style the frontend coerces back to default on every read: a setting that looks saved and does
  nothing. The registry is now the single source; the admin builds menu *and* sanitiser from it.
- `sanitise_template_styles()` would have **fatalled** on an object value rather than skipping the
  row; the autoloaded override map was unbounded. Both fixed.
- The WP-mechanics rater independently re-derived the timing claim from real WP 7.0.2 source rather
  than accepting mine — `get_query_template` → `locate_block_template` sets
  `$_wp_current_template_id` before the template is included, and `wp_enqueue_scripts` fires from
  `wp_head` priority 1 inside it.

## A "known risk" that was wrong about the DOM

`header-behaviours.css` carried an untested warning that the nav-drawer `<dialog>` opens *inside* a
transformed `header.sgs-site-header`. Measured: the drawer's parent chain is `BODY → HTML` — **not a
header descendant**. A header transform could therefore never reach it, and the obvious test
(transform the header, check the dialog) passes **vacuously**, proving nothing.

Re-run against a genuine ancestor (`body`) with a negative control: an ordinary `position: fixed`
probe moved **−80px** — proving the measurement could detect the effect at all — while the open
`<dialog>` moved **0**. D323/D337's top-layer claim is now empirical. The comment is corrected.

## My own errors this session — all self-caught before reporting

1. **A suppression test that proved nothing.** Reduced motion showed "no transition" — but so did
   no-preference. Both legs false = no negative control. Cause: `page.goto()` is a
   browser-initiated navigation and is **ineligible** for a cross-document transition. Redone by
   clicking a real in-page link; then no-preference genuinely ran one, making the `reduce` result
   meaningful.
2. **A "vacuous by construction" ancestry test** (above) — nearly reported as a pass.
3. **An anchor test with no journey** — target was a heading inside the hidden mega panel
   (`offsetTop 0`); then a second attempt whose target was the footer, so the scroll **clamped** at
   the document end and the landing position proved nothing about the header offset. Third attempt
   targeted ~60% down: 2,211px, unclamped, 0.21px clear.
4. **An admin "leak"** that was WordPress core's own `wp-view-transitions-admin-inline-css`.
5. **Two regex miscounts** — a settings-blob pattern that failed on the real tag, and a
   `[a-z0-9-]` class that missed `taxonomy-product_attribute`'s **underscore** (14 vs the true 15).

Same root cause every time, and the same one as commit 1: **a count, or a green result, is not a
measurement until you know what produced it.** The discipline that caught them was cheap — always
ask "would this have looked identical if the feature were absent?"

## Deploy note (shared worktree)

The shared tree carries a co-active track's uncommitted work, and `build/` **already contained**
their 8 modified `render.php` files. Deployed from an isolated worktree pinned to `984f2944` with
those 8 reverted to the committed versions in the copied `build/`, and the reversion **proven by
md5** (each matched HEAD and differed from the dirty tree) before shipping.

## Owed

- **Bean's eye (R-31-13).** Canary is ON: site default `fade`, `page → slide`, smoothing also ON.
- Firefox (no cross-document support — plain navigation is the designed fallback) and Safari 18.2+
  are un-run.
- Hide-on-scroll × nav-drawer via the **setting** (the transform was applied directly).
- The 2rem slide trailing edge on a page whose background contrasts sharply with the next.
