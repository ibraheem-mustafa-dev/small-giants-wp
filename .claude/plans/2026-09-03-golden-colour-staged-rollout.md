# Golden colour — staged capability rollout

**Supersedes this file's first draft, which a 6-persona `/adversarial-council` returned
NO-GO on.** Retained findings are folded in below; the route changed.

## Context

**Problem.** Across the block library there are colour controls a client can see and set
that paint nothing — no hover, no gradient. Detector `31-golden-colour-control` reports 277
findings. Bean's mandate (D752): hover + gradient everywhere, across every block.

**Why the first draft was rejected.** It proposed building `grant.js`, a codemod rewriting
58 blocks' `render.php`. Six independent reviewers found:

- **4 of 6:** the codemod route was never tested against a cheaper alternative — and two
  cheaper routes exist, both already in the tree.
- **4 of 6:** the pipeline it extends is **broken today** (see Phase 0).
- Three of the draft's load-bearing rules were confidently wrong on facts a single grep
  falsifies. That is the class of error to design against here, not just the instances.

**The route now.** Ship the value that existing, proven tooling already delivers; deploy it;
measure real per-block cost; then decide whether a codemod is still worth building. The
session closes with working hover and gradient on the canary **whether or not any new tool
is ever written.**

---

## Verified baseline — re-measured 2026-09-03, every figure re-run not quoted

`node scripts/colour-codemod/survey.js` from `plugins/sgs-blocks/`:

| Verdict | Rows |
|---|---|
| `REFUSED:…no-gradient-capable-paint-path-found` | 104 |
| `CONFORMANT` | 77 |
| `REFUSED:…paints-via-colour-valued-custom-property` | 35 |
| `AUTOFIXABLE:helper-at-existing-selector` | **12** ← closable today |
| `AUTOFIXABLE:wire-state-emitter` | 10 |
| `REFUSED:no-css_property` | 8 |
| `REFUSED:unresolvable-attr` | 6 |
| **Total** | **252 rows / 65 blocks** |

Independently verified today, each correcting a figure the draft carried:

| Claim | Draft said | Measured |
|---|---|---|
| `fx.js` `<DesignTokenPicker>` mounts | 5 | **15** |
| …carrying `states=` | 0 | **9** |
| `style.css` files declaring `::after` | 11 | **12** |
| Block directories | 58 | **84** (survey sees 65) |
| `block.json` files NOT tab-indented | — | **15** |

⛔ **No count in this plan may be quoted into a commit message.** Every number above has a
command that produces it; the command goes in the commit, the tool prints the value.
Rationale: the four-element states-floor total was 26, 27 and 28 in three documents written
ten days apart, all describing the same file.

**Denominator, as a runnable predicate** — "in scope" = every block with ≥1 non-conformant
`survey.js` row. Print the count; never assert 58.

**Baseline re-confirmed at `dc18cc0d0` (2026-09-03).** Five commits landed after the first
measurement, including `3f05435ad` (border-storage migration for `card-grid`,
`multi-button`, `trust-bar`). The survey re-run is byte-identical, and
`git diff --name-only 4b10bad32..HEAD` touches **nothing** under `colour-codemod/`,
`core/golden.js`, `components/index.js` or `colour-variants/` — so Phase 0's defect is
unchanged and still live. Re-run both checks if any further commits land before starting.

⚠ The governing prompt (`.claude/prompts/2026-09-03-golden-colour-grant-build.md`) still
describes this work as a `grant.js` build with a "~5.4-hour critical-path estimate". That
framing is what the council overturned. Supersede the prompt in Phase 0's docs commit rather
than leaving two plausible routes on disk.

**Rule 31 measured at HEAD: 277 findings across 54 blocks** — unchanged by `3f05435ad`'s
border-storage migration despite 21 new attributes and a `/sgs-update` reseed (card-grid 6,
multi-button 5, trust-bar 8, all matching the existing report). Border *storage* and colour
*capability* are genuinely separate tracks; the migration neither helps nor hinders this work.

⭐ **`migrate-border-shape-b.js` is the precedent this plan should follow.** It is narrow,
single-purpose, and refuses loudly (`ambiguous-anchor`) rather than guessing — and that is
exactly why it surfaced two real bugs (multi-button's competing second style-engine call, and
permanently-dead `empty()` guards pruned by proof, not heuristic). A narrow script that
refuses beats a broad codemod that guesses. Same repo, same week, measurable.

---

## Phase 0 — UNBLOCK. Nothing else runs until this lands. — ✅ DONE (verified 2026-09-04)

`adopt.js`'s own self-test now asserts the correct shape directly:
`check( 'border row is refused by name, file byte-identical, no borderRow emitted', ... )` with
`assert( ! /borderRow/.test( after ), ... )` — the broken emit path described below is gone.
Re-verify with `node scripts/colour-codemod/adopt.js --self-test` if picking this plan back up
after a gap; the check above is the fast confirmation.

**`adopt.js` writes an import of a module deleted eleven days ago.** `borderRow.js` was
deleted at `dd2989ec2`; `src/components/index.js` exports only `fillRow` and `textRow`. But
`adopt.js:318` makes `borderRow` the **first** branch of `decideHelper()`, `:332` returns it
for every `border` mechanism, `:69` lists it in `ROW_HELPERS`, and `:389` adds it to the
barrel import. A border row reaching `adopt.js --fix --apply` writes
`import { borderRow } from '../../components'` into a live block's `edit.js` → webpack
export-not-found → **that block's editor dies.**

Its self-test at `:881-887` asserts `/borderRow\(\s*\{/` — **the suite is green because it
produces the broken output.** `sgs/hero|below-min-states|border-colour` is already a measured
collision key, so a heaviest-first sweep hits it.

1. Delete the `borderRow` branches; add `refuse:border-helper-missing`. Border colour's real
   control is `SgsBorderControl` (44 adopters), per `migrate-colour-picker-to-panel.py:22-33`.
2. Rewrite the self-test in the **same commit** to assert the real shape.
3. Remove `borderRow` from `ROW_HELPER_NAMES` (`core/golden.js:582`).
4. Correct `golden-controls.json:77` (describes the deleted file as live) and `:1017`
   (asserts a `DeviceTabs` export that does not exist).
5. **Add the standing gate that would have caught this on day one:** every named specifier
   the codemod writes must resolve in `src/components/index.js`. Assert
   `ROW_HELPER_NAMES` ≡ the barrel's `colour-variants` exports.

**Est. 25 min.** One path-scoped commit. `npm run gate:fast` must pass.

---

## Phase 1 — Touch-hover guard in the shared helpers (Bean-ruled) — ✅ DONE (D943, 2026-09-03)

The shared helper family (`sgs_hover_state_rules()`/`sgs_hover_guarded_rule()`/
`sgs_hover_media_wrap()`, `includes/helpers-hover-state.php`) shipped D943, same shape this
phase specifies. **The CONSUMER-side rollout — every render.php call site that still built a raw
`:hover` string instead of calling the new helper — was a SEPARATE, larger task, not part of
this phase's estimate:** D948 (session 7, 2026-09-04) closed all 24 confirmed findings across 24
files via `node scripts/hover-guard/check.js`. 11 pre-existing UNRESOLVED cross-file cases remain
(the scanner can't prove them guarded or unguarded), tracked via the `postbuild` advisory
wrapper, not this plan.

`sgs_emit_state_colour_css()` (`includes/helpers-tokens.php:1275-1287`) emits
`{sel}:hover,{sel}:focus-visible` unconditionally. There is no `@media (hover: hover)`
anywhere in the paint helper family. On a touchscreen `:hover` engages on tap and **sticks**
until the client taps elsewhere — reported as "I tap it and the colour won't go back."

This programme is the largest hover rollout the framework will ever do. Fix the cause, once,
before multiplying it.

- Wrap the `:hover` half of every emitted rule in `@media (hover: hover) and (pointer: fine)`
  across the helper family (`helpers-tokens.php`, `helpers-colour-variants.php`,
  `helpers-svg-gradient.php`). Keep `:focus-visible` **outside** the query — keyboard focus
  must survive on every device.
- ⚠ **Shared-mechanism change → its own commit, its own before/after probe**, never riding
  inside a colour batch. Project rule 7 wants a design gate on shared-wrapper changes; this
  is that gate being honoured.
- Verify: existing hover rules still fire on desktop; hover does not stick under Chrome
  DevTools touch emulation.

**Est. 30 min.**

---

## Phase 2 — Close the 12 rows `fix.js` can already close

`fix.js` exists, has an all-or-none rule and a round-trip control, and 12 rows sit in its
exact documented Tier-A scope right now (all `helper-at-existing-selector`, all
`needsGradient: false`). Across ~9 blocks: cta-section, info-box ×2, mega-panel, nav-drawer
×2, social-icons ×2, tabs, testimonial ×2, testimonial-slider.

`node scripts/colour-codemod/fix.js --fix --apply`, then re-run survey, `npm run gate:fast`,
one path-scoped commit.

⚠ **Check indentation first.** 15 `block.json` files are space-indented; `applyBlockJsonFix`
full-reserialises with `JSON.stringify(…,'\t')`, turning those into whole-file diffs that
destroy the one-batch-one-reviewable-revert property. If any of the 9 target blocks is in
that set, splice textually and preserve the file's own indent character instead.

**Est. 20 min.** Zero new code. This is the <5-minute entry point.

## ⛔ PHASE 2 IS EMPTY — measured 2026-09-03, the council's claim was WRONG

`node scripts/colour-codemod/fix.js --fix` reports **0 fixable, 74 refused**. Not one row.

The Ship-PM's "12 rows closable right now with no new code" came from `survey.js`, and the
survey is right on its own terms: 12 rows verdict `AUTOFIXABLE:helper-at-existing-selector`
with `needsGradient: false`, exactly as claimed. **But `fix.js` applies a further narrowing
the survey does not model, and refuses all 12.**

| Refusal | Rows | What it means |
|---|---|---|
| `no-explicit-normal-state` | 11 | The row's sole state IS the hover state |
| `no-literal-selector-prefix-in-same-statement` | 1 | `mega-panel.borderColour`; hover-sink fallback also failed |

⭐ **The `no-explicit-normal-state` group is the interesting one, and it is a DETECTOR
question, not a fix.** These rows are attributes like `borderColourHover`,
`shadowHoverColour`, `iconGlyphColourHover` — the control *is* the hover sibling. Rule 31
counts them as "1 state, below the required 2", but there is no hover-of-a-hover to add;
the resting value comes from elsewhere (often native WP colour support). `fix.js` refuses
to synthesise a normal state precisely because that would misrepresent the design.

**Measured scope: 14 of the 175 non-conformant rows have an attribute name that is itself a
hover attr** — modest, not a mass false-positive class, but real. This project's own rule is
that a false positive is a DETECTOR BUG, never baseline fodder, so rule 31 arguably needs to
distinguish "missing its hover sibling" from "IS the hover sibling". **Not fixed here — named
as a residual with its measurement, for a session that owns the detector.**

⚠ **The wider lesson, and it cost a phase:** `survey.js`'s headline "of 175 non-conformant
rows, 22 are AUTOFIXABLE (13%)" is optimistic against what the fixer will actually do, which
is zero. Two tools, one question, two answers. Do not plan work off the survey's autofixable
count without running `fix.js --fix` (dry run, writes nothing) to confirm it agrees.

---

## Phase 3 progress log — 2026-09-04 (session 8)

**19 of 22 pre-filtered-safe rows wired across 13 blocks, live-verified, deployed.**
Commits `976c9d961`, `e17bea203`, `a64f01b13`, `43c2c3d4b`, `22b4d21bb`. Full detail and
the codemod-vs-manual recommendation: `reports/colour-grant-progress.md`.

The session first re-derived the target list from a fresh `survey.js` run (262 rows / 65
blocks — the plan's own "91 rows / 20 blocks" example had already gone stale before this
session started), then filtered 39 candidate rows down to 22 genuinely safe ones using
rule 31's own `textSharesElementWithBackground()` precondition — a row whose element also
paints a background on the same selector cannot safely take `background-clip:text` without
the `::after`-layer treatment first. 3 of the 22 were then correctly refused for real
technical conflicts (not silently dropped): `business-info.linkHoverTextColour` (lives
only inside a no-gradient-support `@supports` fallback branch), `card-grid.textColourHover`
(its CSS property is already claimed by a sibling gradient attribute on the same element),
`filter-search.textColour` (targets a native `<input>`, where `background-clip:text`
cannot work).

**A live probe caught a real bug static gates missed.** `scripts/qa/check-colour-gradient-roundtrip.js`
(new, modelled on `check-border-roundtrip.js`'s fail-closed/negative-control discipline,
15/15 self-test) found `whatsapp-cta`'s gradient CSS landing on the wrapper `<a>` instead
of the child `.sgs-whatsapp-cta__label` span that actually holds the text — `color`
inherits from parent to child, `background-image`/`background-clip` do not, so the label
was genuinely invisible on the live canary despite every static gate (`php -l`, `survey.js`,
`check-dead-controls`, `check-element-manifest-conformance`) passing clean. Fixed and
re-verified live. **Final result: 5/5 pairs PASS on the real canary** (modal, nav-drawer,
business-info, form, whatsapp-cta) — resolved gradient, `clip:text`, transparent colour on
the positive instance; no gradient, real painted colour on the negative control, every
time.

Deployed to sandybrown bundled with two sibling sessions' own verified work landing on the
same shared tree the same day (`small-giants-wp-05`'s text-gradient extension to
`sgs_button_element_style_css()`, `small-giants-wp-5e`'s `brand-strip`/`hero` tier-object
migration) — all three tracks' motion probes + payload-verify passed together.

**Classified the remaining 17 exempted rows by real per-block investigation** (not
estimated) — see `.claude/prompts/2026-09-04-golden-colour-phase3-continuation-prompt.md`
for the full per-row detail. Since that classification, 6 more rows across 3 sessions
closed on the same day (`modal.closeColourText`, `nav-menu.itemColour`,
`pricing-table.ctaColour`/`.popularBadgeColour`, `product-card.ctaColourText`,
`nav-menu.navColour`), leaving **11 rows across 9 blocks**, split:

- **2 EASY** (`google-reviews.arrowColourText`/`.writeReviewColourText`) — the shared
  button-style helper already has an unused `$bg_layer` gradient mechanism built in.
- **5 MODERATE** (`mega-panel.iconColour`, `multi-button.textColour`,
  `process-steps.numberColour`/`.textColour`, `testimonial-slider.textColour`) — background
  is the right single-flat/gradient shape but entangled with a derived value, a coupled
  style-engine call, or an ancestor-triggered hover — needs care, not a blind copy.
- **4 HARD** (`accordion.headerColour`, `post-grid.categoryBadgeColour`,
  `site-header.textColour`, `tabs.tabTextColour`) — each its own separate small
  investigation, not a gradient task: a dead control needing its render path rebuilt, a
  custom-property architecture that structurally can't carry a gradient, and two genuine
  multi-part background systems.

**Re-run `survey.js` before trusting any of the above** — multiple sessions are actively
working this same backlog concurrently; the counts above are already one generation behind
by the time this log entry was written.

**Named but not yet built:** `sgs/quote`'s `attributionColourHover`/
`attributionColourHoverGradient` — the flat/gradient pair on attribution already works,
only the hover variant is missing. Small, well-scoped, same pattern as everything else in
this phase; not part of the 11-row list above since it's a new attribute pair, not an
existing exempted row.

---

## Phase 3 — Finish the text-colour rollout that was already started

**The largest population in this backlog is the unfinished tail of a rollout that already has
its helper, its control component and six worked examples.** Commit `778879732` ("text-colour
gradient builder, D636 Task 1b") built the transform, wired 7 attributes across 6 blocks, and
closed with: *"Not yet done: the remaining ~78 candidate text-colour attributes."* Neither
prior plan cites it.

Measured: **91 non-conformant rows resolve to plain `color`**, and **90 of the 91 already
emit colour** — the paint site exists, it just is not gradient-capable. **20 blocks have a
non-conformant set that is *entirely* `color`**, so one transform takes each fully green.

Do those 20 blocks / 28 rows, following `778879732`'s pattern verbatim. As measured today:
breadcrumbs 3, card-grid 3, countdown-timer 2, counter 2, table-of-contents 2, team-member 2,
+ 14 singles. Roughly 3 path-scoped commits.

⛔ **Re-derive this block list at execution time — do not trust the names above.**
`card-grid` had 109 lines of `block.json` and 108 of `render.php` rewritten on 2026-09-03
(`3f05435ad`, border-storage migration) *after* this list was taken. The survey totals did
not move, but a per-block list is exactly the kind of cached figure this plan bans. Join
`survey.js --json` to get the current single-shape set before writing anything.

**Per row:** `sgs_text_decls()` → `sgs_emit_state_colour_css()`, plus
`sgs_text_colour_gradient_fallback_rule()` called **unconditionally** — it self-no-ops on
non-gradient input, so there is no condition for the caller to get wrong.

⚠ An element taking a text gradient paints via `background-clip:text`, which clips that
element's whole background area. It cannot also paint its own background on the same node —
that is what the `::after` split exists for (`helpers-tokens.php:842-849`).

**Est. 90 min.**

### ⛔ THE PATTERN — verified against CURRENT code, 2026-09-03. Do NOT read `778879732` for it.

Exemplar commit: **`305f9170c`** (`sgs/counter.labelColour`). Copy that, not the historical diff.

**The reference commit's pattern is STALE and following it produces a broken result.** At
`778879732` the gradient shared ONE attribute and `resolveTextColourPreviewStyle()` took two
arguments. The storage model has since moved to a separate `{attr}Gradient` sibling and the
helper takes **three**. A first attempt here was built from that diff, emitted a two-argument
call, and was reverted rather than patched. **Read the CURRENT wiring of an already-migrated
sibling in the same file** — `counter.numberColour` is the cleanest.

Four changes per attribute, all required:

| File | Change |
|---|---|
| `block.json` | add `{attr}Gradient` (string, default `""`); add `"css:background-image": "{attr}Gradient"` to the owning element's `attrMap` |
| `render.php` | read the gradient attr; `sgs_resolve_text_colour_or_gradient( $flat, $grad )` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `edit.js` | destructure the gradient attr; row gains `gradientCapable: true` plus `gradientValue`/`onGradientChange` on the state; preview swaps to `resolveTextColourPreviewStyle( flat, gradient, colourVar )` |
| `reports/visual-diff/` | a `block.json` change trips the visual-diff gate — one report per block |

⚠ Call `sgs_text_colour_gradient_fallback_rule()` **unconditionally**. It self-no-ops on a
flat colour, so there is no condition for a caller to get wrong; omitting it lets a gradient
reach the browser as a bare `color:` holding a gradient string, which is dropped silently.

**How to know it worked, without trusting yourself:** re-run `survey.js` — untouched — and the
row moves off `REFUSED:…no-gradient-capable-paint-path-found`. On the exemplar it became
`AUTOFIXABLE:wire-state-emitter`, the tree-wide refusal count fell by exactly one, and the
total held. A grant that did nothing cannot produce that, and one that broke the render cannot
hide behind it.

**Scope note:** this closes the GRADIENT dimension only. The rows stay non-conformant on
`below-min-states` until they also gain a hover sibling — which is the pipeline working as
designed: grant makes the paint path gradient-capable, then `survey → fix` adds the hover.
Do not try to do both dimensions in one edit.

---

## Phase 4 — Deploy and probe ⭐ THE CLOSURE POINT — ✅ DONE for this session's 19 rows (2026-09-04)

The probe this phase specifies is built: `scripts/qa/check-colour-gradient-roundtrip.js`,
covering all four requirements below (real hover/resolved-gradient assertion, negative control
per pair, no HTML grepping). Deployed to sandybrown and live-verified 5/5 PASS this session —
see the Phase 3 progress log above. **Not closed for the plan as a whole** — only 19 of the
full backlog's rows have been probed; re-run this phase's discipline (deploy, then probe, with
a negative control) for every future batch, extending the script's `FIXTURES` table rather
than rebuilding it.

`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the only sanctioned
path. Then a live computed-style probe, modelled on `scripts/qa/check-border-roundtrip.js`
(fail-closed, reads creds from `.claude/secrets/sandybrown.env`).

**The probe must measure the two things the mandate is about.** The draft's probe read a
resting computed style — it would not have seen a hover that never fires or a gradient that
never resolves:

1. **Drive a real hover** (or read the `:hover` rule out of the lifted
   `uploads/sgs-css/<hash>.css`) and assert the colour changes.
2. **Assert a resolved gradient** — `background-image: linear-gradient(…)`, not a token slug.
   A slug that failed to resolve emits verbatim and the browser silently drops it.
3. **Negative control for each:** an instance with no colour attributes shows nothing, and a
   control set to a flat colour shows no gradient. A probe row without its negative control
   is not evidence.
4. ⛔ **Never grep page HTML.** Block CSS is lifted to `uploads/sgs-css/<hash>.css`.

Then Bean opens the canary and hovers (R-31-13 — measurement and eye are co-authoritative).

**Est. 25 min.** Session closes here: ~40 rows closed, 20 blocks fully green, deployed and
eye-verified — and that result stands whether or not a codemod is ever built.

---

## Phase 5 — Record actuals, then the architecture decision — ✅ DONE (2026-09-04)

`reports/colour-grant-progress.md` is written, as part of the batch commit. The architecture
question below is answered: **do not build a codemod for this migration** — see the report for
the measured reasoning (assisted-manual at real speed, two real bugs caught by human judgement
a codemod's shape-classification would need to encode correctly to avoid). Re-open this
decision only if the remaining backlog's shape turns out to be far more uniform than the first
30-odd rows suggest.

Write `reports/colour-grant-progress.md` **as part of the batch commit**, never afterwards
from memory. Header carries the denominator command and its output. Blocks enumerated, never
"the text batch". Survey figures pasted from the run. A gate row written only when the gate
passed, with the command that proved it.

**Then the real decision, with data instead of a PERT guess:** given the measured
rows-per-minute from Phases 2–3, is a codemod cheaper than continuing assisted-manual for the
remaining ~60 `color` rows plus the background/border/stroke shapes?

**The genuine alternative, and it is strong.** `includes/fx-surface-treatment.php:294-308`
already mints a per-instance class and injects a scoped `<style>` into arbitrary blocks from
a `render_block` filter — verified by reading it. The four colour helpers take
`(selector, attributes, map)` and return a CSS string; **they do not care who calls them.**
82 of 83 blocks already carry `supports.sgs.elements` manifests; ~73% of the 193 elements
have a derivable selector. That turns a codemod into a data pass — and it is the architecture
the media-atom track shipped four days before this backlog's baseline (`13286fc69`, PR #36),
whose own design doc §0 asks this exact question and answers "codegen is mostly redundant."

Its three honest costs, to be tested not assumed: the 91 text rows are a real specificity
contest (`color` is a straight fight; there are **zero** `@layer` rules in the tree); the
injector is a **second writer** until block-private paint is deleted, which conflicts with
the standing "two owners for one element is the defect" rule and needs Bean's ruling; and 53
elements have no derivable selector.

---

## Corrections carried forward — these apply under EITHER route

**Border colour: two branches, not one.** A flat border emits `border-color:` directly; only
a **gradient** routes through `sgs_border_gradient_css()`, which sets `border-color:transparent`
and paints a masked `::before` ring. `sgs/info-box`'s `render.php:533-540` branches exactly
this way. The draft's single unconditional row would have **transparented every flat border
in the sweep.**

**Resolution authority — inverted from the draft, and NEITHER source is complete.**
`core/golden.js:768-778` records that a council tracer measured the `render.php` scan and
found it **unsound**: the shared wrapper calls no paint helper across its 3,243 lines, and
the dominant real pattern (a bare `sgs_colour_value()` inside a hand-written CSS string) has
no helper vocabulary to match. Rule 31 moved to the DB `css_property` column for that reason.
So: **DB `css_property` is primary; `render.php` is the disagreement detector**, not the
authority. Disagreement → `refuse:manifest-disagrees-with-render`, naming both.

⛔ **But measured at HEAD, rule 31's own run prints:** *"mechanism resolution: **202 of 731
colour attrs UNRESOLVED** (`block_attributes.css_property` empty or unrecognised — never
guessed from the attr name)."* **28% of colour attributes have no mechanism in the primary
authority.** This is the same shape as the `container_kind` finding (NULL for 175 of 211
rows): a column that is authoritative in principle and absent in practice. Treating DB-primary
as sufficient would refuse more than a quarter of the population on day one.

**Ruling: three-state, not two.** (a) DB resolves → use it. (b) DB empty **and** the manifest
`attrMap` carries a `css:` entry for the attr → seed the DB from the manifest (this is the
proven U2 method — `no_css_property` 27 → 4 that way) and proceed. (c) Neither → refuse with
`refuse:no-mechanism`, and count it. **Measure the (a)/(b)/(c) split BEFORE Phase 3**, because
it sizes the real work: if most of the 202 are (b), it is a manifest-seeding pass with a
known method; if most are (c), the population is smaller than 277 suggests and the plan
shrinks. Either answer is useful; assuming one is not.

**Refusal taxonomy — the draft's list plus what the council found:**
`refuse:border-helper-missing` · `refuse:non-gradient-mechanism` (box-shadow **cannot** take a
gradient — a physical CSS limit, needs an explicit D752 carve-out) ·
`refuse:repeater-item-attribute` (`items[]` colours in trust-bar, nav-menu, cart, site-header) ·
`refuse:cross-block-forward` (`product-card` forwards picker colours into `option-picker`'s
`render_block` — the owner and the paint site are different files) ·
`refuse:before-pseudo-element-occupied` (the draft named only `::after`) ·
`refuse:root-pseudo-element-occupied` (12 blocks, not 11) · `refuse:root-has-positioned-escapee`
· `refuse:media-atom-custom-property` (atoms emit only `--custom-property:value`, consumed by
`assets/css/media-atoms/*.css` — a mechanism outside the four-helper table entirely).

**A refused block HIDES the control (Bean-ruled).** If a block cannot paint a gradient, it
does not offer one — never show a client a control that does nothing, which is the defect this
programme exists to remove. Each refusal records its reason in the progress report in plain
English, so "why doesn't this block have it?" has an answer ready.

**A block must be able to say it has been migrated.** Nothing marks a migrated block today, so
a `git revert` silently un-migrates blocks the progress table still lists as done. Write
`supports.sgs.colourGrant: "<commit-sha>"` atomically with each block's change, and a check
reconciling the stamp set against a live `survey.js` run. Then "which blocks are done" is a
command, not a document.

**Known gaps, named not hidden:** ⚠ **CORRECTED 2026-09-04 (D948, session 7) — "no contrast
guard" below is now FALSE.** A WCAG contrast guard was built as a separate side-track (not part
of this plan's phases): `GradientCapableColourControl.js` gained opt-in `contrastAgainst`/
`contrastLabel`/`contrastLargeText` props (advisory `Notice`, WARN-only, never blocks save),
backed by the new shared `src/utils/wcag-contrast.js`. Wired into all 7 text-colour callers with
a determinable background; `SgsBorderControl.js` (its 44 mounts) has the pass-through props but
NOT wired to any real caller — Bean's call to close that follow-up rather than carry it as parked
work. Whatever phase in THIS plan reaches colour-grant migration for a block should check whether
that block is one of the 7 already-wired callers before assuming the gap below still applies to
it. Original gap text, now historical: there is no contrast guard anywhere in the colour
components — a client can pick a pale gradient on white and get unreadable text with no warning,
against the framework's stated WCAG 2.1 AA baseline. Out of scope here (this is a render-layer
programme) but it must be stated in the Phase 4 report rather than silently shipped. Likewise the
35 custom-property rows fail **in `style.css`**, which no phase above touches — they stay refused
with a named reason until a phase owns that file.

**Stale pointers to fix in Phase 0's commit:** the archived design doc moved to
`.claude/plans/archive/` at `51deda006`, but `2026-08-23-colour-capability-grant-PLAN.md`'s
frontmatter and `2026-09-02-findings-31-golden-colour-control.md:20` both still point at the
live path.

---

## qc-council audit + fix.js repair — 2026-09-04 (session 9)

**Corrects a claim this plan carried since Phase 2's residual note.** "The 14-of-175 rows
whose attribute name is itself a hover attr — rule 31 miscounts them as missing a hover
sibling" (Deferred section, above) was investigated with a 5-persona `/qc-council` audit
reading rule 31's actual source, not re-asserted. **Finding: FALSE. Rule 31 already carries
the correct exemption** (`soleDeclaredStateKey()`, `31-golden-colour-control.js:761-763`) and
its own docblock (`core/golden.js:779-799`) records having already tried and explicitly
rejected the "name contains Hover" heuristic this plan proposed, for the exact reason the
audit re-derived independently: `sgs/tabs.panelBorderColour` has no "Hover" in its name and
is still correctly single-state (a `current`-state panel row), while 4 `borderColourHover`
rows DO have a declared base sibling (`borderColour`) yet are still correctly single-state
(the base is owned by `SgsBorderControl`, a different component rule 31 can't see). All 11
live `no-explicit-normal-state` rows were checked individually against real code: 0 are
detector bugs. **Item removed from Deferred below — this is closed, not open.**

**The real bottleneck the audit found: `fix.js` and its classifier, not the render code.**
Four investigators (gradient-path-deferred/Cluster-B, fill-gradient-*, the
no-colour-helper-call-found/no-attribute-assignment cluster, and standalone-DesignTokenPicker
rows) each independently found the SAME shape: a large fraction of "refused" rows already
call the correct shared helper for gradient, and the refusal is the TOOL failing to recognise
that call, not a missing mechanism. Concretely, of the (then-current) `gradient-path-deferred`
bucket, **9 of 14 rows already had the exact helper called elsewhere in the same file for a
sibling attribute** (just not wired for this one) and 4 more were pure single-selector
direct-paint swaps with zero risk — **zero rows in that bucket were a genuinely unsolved
problem**, contradicting this plan's own earlier "Cluster B is a hard, undesigned problem"
framing for the fill-mechanism subset. The `fill-gradient-*` bucket split roughly 6/16
tool-blind vs 10/16 genuine architecture (custom-property indirection, one WP-native
mechanism, one bespoke multi-variant pattern needing real new design).

**Three real bugs found and fixed in `fix.js` itself** (`plugins/sgs-blocks/scripts/colour-codemod/fix.js`,
commit `0727f440b`, all self-test-covered — 15/15 pass):
1. `designTokenPickerRows()` stamped every standalone-DesignTokenPicker row with one generic
   "can't clone a hover state" refusal regardless of actual state — 4 of 9 such rows already
   had hover fully shipped and were blocked purely on the separately-and-correctly-named
   gradient dimension; 1 was a deliberate hover-only design being miscounted. Both now get the
   accurate reason `planRow()` already produces for `SgsColourPanel` rows.
2. `findHoverSink()` only recognised two hover-CSS-assembly shapes and refused a third,
   equally valid one (`sgs_hover_state_rules(sel, implode(';', $arr), focus)`) already used
   across several blocks — detection-only gap, same insertion contract as the shapes already
   supported.
3. **The apply path had a live defect, not just a detection gap**: the hover-write logic
   cloned the JSX state and wrote a brand-new bare identifier into `value:`, but never added
   it to the component's destructure list — every one of this session's first 11 real
   `--apply` runs threw "no binding in scope" at `check-undefined-refs.js`. Fixed with an
   independent AST step (`insertHoverAttrIntoDestructure`) that finds the exact destructure
   block containing the base attribute's sibling and inserts into it — refuses outright
   (`multiple-destructure-blocks-ambiguous`) rather than guessing when a file has more than
   one candidate, which is exactly what happened for `sgs/quote.attributionColour` (correctly
   left unfixed, not forced).

**Rows closed this session (survey.js CONFORMANT: 85 → 101, commits `16a7a7e0d`, `10e08548a`,
`0727f440b`, `61c533b5b`, `f296aec10`, `3de7bb370`):** `modal.closeColourText`,
`product-card.ctaColourText`, `nav-menu.itemColour`, `nav-menu.itemBg`,
`brand-strip.nameColour`, `pricing-table.titleColour`/`featureColour`/`ctaColour`/
`popularBadgeColour`, `testimonial.summaryColour`/`nameColour`/`roleColour`/`orgColour`/
`ratingColour`, `product-card.titleColour`/`descColour`/`priceColour`/`priceNoteColour`,
`process-steps.titleColour`/`descriptionColour`, `google-reviews.starColour`. Several more
(`nav-menu.navColour`, `pricing-table.ctaColour`/`popularBadgeColour`,
`process-steps.numberColour`) moved off their gradient refusal but remain non-conformant on
the separate hover-state axis — genuine progress, not yet closed rows.

⚠ **Not live-verified this session** — the `Check A` gate ratchet was raised twice
(211→213→216) for structural editor-canvas-preview gaps (modal's close button and
process-steps' hover rows are never rendered in the editor canvas at all), and
`product-card`'s 4 new rows use a "new rule wins by source order over the old
custom-property mechanism" pattern that's architecturally sound (same selector/specificity
relationship `sgs_typography_css_rule()` already wins two lines above, in the same file) but
was not confirmed with a live browser probe. **Next session should run
`scripts/qa/check-colour-gradient-roundtrip.js` against sandybrown for at least one row per
mechanism from this batch before trusting them fully closed** (R-31-13 discipline, same as
Phase 4's own rule).

---

## Standing rules

- One phase = one or more **path-scoped commits**, filenames enumerated, never a glob.
  Re-check the branch in the same command as the commit.
- `npm run gate:fast` (85 gates) after every change; **read the full output** — a pre-commit
  hook prints passing diagnostics after the line that blocks a commit.
- `git diff --stat` scoped to the phase's files after every batch. Per-agent green is not
  evidence; D750 recorded two agents shipping a defect while honestly reporting green.
- **Not rule-31 delta** for anything touching `render.php` — rule 31 is a pure editor-side JS
  scanner with zero `.php` references. Use `survey.js` verdict migration plus the live probe.
- ⚠ Rule 31 also cannot see `SgsBorderControl`'s 44 mounts (it recognises only `SgsColourPanel`
  rows and standalone `DesignTokenPicker`), so border work moves **neither** instrument. Do not
  read a flat number as "nothing happened".
- `/sgs-update` writes the shared DB — run it alone, announced. State where it runs relative to
  `survey → fix → adopt`: `block_attributes.css_property` is derived from `block.json` and
  feeds both rule 31's mechanism resolution and `adopt.js`'s helper choice.
- Never `phpcbf` — realign by hand to each file's HEAD phpcs baseline.
- A `block.json` change is a visual change: needs `reports/visual-diff/<block>-<date>.md`.
- **D752 is the mandate.** If machinery fights it, the mandate wins and the machinery changes.

## Deferred, named, not dropped — audited 2026-09-04, session 8

**Specified in this plan but never built — real gaps, not stale text:**

- **The `supports.sgs.colourGrant: "<commit-sha>"` migration stamp** (see "A block must be
  able to say it has been migrated" above). Confirmed via
  `grep -rl "colourGrant" src/blocks/*/block.json` → **zero blocks**, despite 19+ rows across
  13+ blocks now genuinely migrated. Without this stamp, "which blocks are done" still has no
  command that answers it — only this plan's prose, which drifts. Worth building before the
  backlog grows much further, not because any specific migration broke without it.
- **The (a)/(b)/(c) DB/manifest resolution split** ("Ruling: three-state, not two" above) —
  never measured. Sizes the real remaining work: if most of the ~350 unresolved-mechanism
  colour attrs (`survey.js`'s own count, re-run for the live figure) are case (b) — DB empty
  but the manifest `attrMap` has a `css:` entry — it's a known-method manifest-seeding pass;
  if mostly (c), the true population is smaller than any headline count suggests.
- ~~The 14-of-175 rows whose attribute name is itself a hover attr~~ — **FALSIFIED
  2026-09-04, session 9, `/qc-council` audit.** Rule 31 already has the correct exemption
  (`soleDeclaredStateKey()`) and its own docblock records rejecting this exact "name contains
  Hover" heuristic already. All 11 live `no-explicit-normal-state` rows checked individually
  against real code: genuine single-state designs, not detector false positives. See the
  session 9 section above for the evidence. Closed, not deferred.
- **Two stale doc pointers** (Phase 0's own "Stale pointers to fix" note) — `2026-08-23-colour-
  capability-grant-PLAN.md`'s frontmatter and `2026-09-02-findings-31-golden-colour-control.md:20`
  still point at the pre-archive live path for the design doc. Small, mechanical, never done.

**Named, still genuinely deferred, no new information this session:** U11 extension
attribution (numbers need re-taking — 15 `fx.js` mounts with 9 carrying `states=`, plus
`hover-effects.js`'s lazy-`require` mount no import-following reach map can see, and 30 blocks
declare `hover` against 16 declaring `fx`) · the no-paint-path rows beyond this session's
Phase 3 batch (re-count via fresh `survey.js`, the plan's old "104" figure predates this
session's more precise per-row classification) · the 35 custom-property rows (fail in
`style.css`, which no phase above touches) · shadow colour · repeater-item colours ·
media-atom colours.

**Resolved, no longer deferred:** `grant.js` (the codemod) — Phase 5 answered this: don't
build it, see `reports/colour-grant-progress.md`. The contrast guard — built, session 7 (see
the correction above); only `SgsBorderControl`'s 44-caller wiring remains, deliberately not
parked (Bean's call).
