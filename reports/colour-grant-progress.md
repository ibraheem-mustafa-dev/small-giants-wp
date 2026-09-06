# Golden-colour Phase 3 progress — 2026-09-04

Governs: `.claude/plans/2026-09-03-golden-colour-staged-rollout.md` Phase 3 (text-colour
gradient rollout, D948). This session picked up from the plan's stale Phase 3 target list
(the plan's own "91 rows / 20 blocks" example had already gone stale by the time the plan
was written), re-derived a fresh target list, and closed as much of it as could be closed
safely and live-verified in one session.

## What shipped

- **Re-derived the target list from `survey.js` fresh** (262 colour rows / 65 blocks
  total, not the plan's stale numbers), then filtered against rule 31's own
  `textSharesElementWithBackground()` precondition: 39 candidate rows narrowed to 22
  genuinely safe rows across 14 blocks — the other 17 need the `::after`
  background-layer treatment first, correctly left as separate, larger scope (the
  plugin's own CLAUDE.md already calls that "its own project, not a quick follow-up").
- **19 of 22 rows wired** across 13 blocks (business-info, card-grid *[refused, see
  below]*, filter-search *[refused]*, form, modal, nav-drawer, nav-menu, post-grid,
  process-steps, product-card, quote, separator, trust-bar, whatsapp-cta). Commits
  `976c9d961`, `e17bea203`, `43c2c3d4b`.
- **3 rows correctly refused**, not forced — real technical conflicts, not silent drops:
  `business-info.linkHoverTextColour` (lives only inside a no-gradient-support
  `@supports` fallback branch), `card-grid.textColourHover` (CSS property already
  claimed by a sibling gradient attribute on the same element), `filter-search.textColour`
  (targets a native `<input>`, where `background-clip:text` cannot work at all).
- **Two build-gate baselines raised, both with written reasons** (`a64f01b13`):
  `check-dead-controls`'s false-positive on post-grid's dynamic-key attribute reads, and
  `check-element-manifest-conformance`'s `STATE_WITHOUT_BASE` count for quote's new
  gradient sibling mirroring its already-accepted flat-attribute shape.
- **A new live probe, `scripts/qa/check-colour-gradient-roundtrip.js`** (15/15 self-test
  assertions), modelled on `check-border-roundtrip.js`'s fail-closed/negative-control
  discipline. It found and confirmed a **real defect**: `whatsapp-cta`'s
  `labelColour`/`labelColourGradient` CSS was scoped to the root `<a>` instead of the
  child `.sgs-whatsapp-cta__label` span that actually holds the visible text — `color`
  inherits from parent to child but `background-image`/`background-clip` do not, so any
  gradient made the label genuinely invisible on the live canary. Fixed (`43c2c3d4b`),
  re-probed live, confirmed working.
- **Final live verification: 5/5 pairs PASS on the real canary** (modal, nav-drawer,
  business-info, form, whatsapp-cta) — resolved `linear-gradient(...)`,
  `background-clip:text`, transparent text colour on the positive instance; no gradient
  and a real painted colour on the negative control, every time.
- **Deployed to sandybrown** (`8d5b2807`), bundled with two sibling sessions' own
  verified work landing on the same shared tree at the same time (a text-gradient
  extension to `sgs_button_element_style_css()`, and a tier-object migration on
  `brand-strip`/`hero`) — all three tracks' motion probes + payload-verify passed
  together.

## What's still open (named, not silently dropped)

- **17 rows behind the `::after` background-layer precondition** — accordion,
  google-reviews, mega-panel, modal.closeColourText *(now closed by 05's helper fix —
  re-survey before assuming still open)*, multi-button, nav-menu.navColour/itemColour,
  post-grid.categoryBadgeColour, pricing-table, process-steps.numberColour/textColour,
  product-card.ctaColourText, site-header, tabs, testimonial-slider.
- **6 rows in this session's own safe list, deliberately not live-probed**: post-grid
  (needs real published posts, not probe-controlled), process-steps, product-card,
  trust-bar, separator (all need repeater/content fixtures not yet built),
  nav-menu.burgerColour/submenuColour (needs a real assigned WP nav menu). All are
  build-verified (php -l, block.json validity, survey.js verdict transition) but not
  live-measured — the honest gap the probe script names via `KNOWN_SKIPPED`.
- **`sgs/quote`'s `textColourHover` mechanism is architecturally weak** — it targets the
  block ROOT, which typically has no text of its own (body is InnerBlocks children,
  attribution is a separately-styled child with its own explicit colour rule that always
  wins). This predates this session — the gradient sibling faithfully extends the same
  root-targeted mechanism rather than introducing a new problem — but it means the
  control is close to a no-op for normal content. Needs a design decision (retarget the
  selector, or accept root-only) before it can be usefully probed or trusted.
- **Other sessions extended the same D948 pattern to further rows mid-session**
  (nav-menu.navColour, pricing-table, sgs/modal.closeColourText,
  sgs/product-card.ctaColourText via the shared button helper) — re-run `survey.js`
  fresh before planning the next batch; several counts in this report may already be
  stale by the time it's read.

## Codemod vs. data-pass — the Phase 5 question, answered from real rates

The plan asked whether a codemod is worth building for the remaining ~60 `color`-mechanism
rows (plus background/border/stroke), given `includes/fx-surface-treatment.php:270-308`'s
proven `render_block`-filter-injects-scoped-CSS precedent as a real alternative.

**Measured this session:** 4 parallel subagents wired 19 rows across 13 blocks in roughly
one session-length of wall time, each doing real per-block archaeology (reading the
current selector, picking the right edit.js pattern, writing a visual-diff report) rather
than blind pattern-application — and one of them caught and fixed a real bug
(process-steps' first-attempt wiring silently vanishing from the survey census) inside
that same window. That is closer to **assisted-manual at meaningful speed** than a slow
crawl — the bottleneck was never per-row mechanical effort, it was judgement calls
(which selector, which UI pattern, whether a row is safe to wire at all) that a codemod
would need to encode correctly for every remaining shape, and the failure mode when it
gets one wrong (whatsapp-cta's invisible text) is a live regression, not a build error.

**Recommendation: do not build a codemod for this specific migration.** The remaining
~56 rows are heterogeneous enough (different UI patterns — `SgsColourPanel` rows, raw
`DesignTokenPicker`, `textRow()` helper calls; different selector shapes; the
background-sharing precondition needing per-row judgement) that a codemod would spend
more effort on shape-classification than the manual/assisted path already costs, and would
remove the human judgement step that caught the two real bugs this session found. Continue
assisted-manual in batches of ~4 blocks per agent, always live-probing before calling a
batch done — the whatsapp-cta bug was invisible to every static gate and would have
shipped silently without the live probe. The `fx-surface-treatment.php` precedent stays
relevant for the 17-row background-layer-precondition backlog specifically (a genuinely
mechanical "move this declaration to `::after`" transform, unlike the judgement-heavy
gradient wiring here) — worth a fresh design pass when that backlog is picked up, not
folded into this recommendation.
