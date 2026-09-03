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

## Phase 0 — UNBLOCK. Nothing else runs until this lands.

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

## Phase 1 — Touch-hover guard in the shared helpers (Bean-ruled)

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

---

## Phase 4 — Deploy and probe ⭐ THE CLOSURE POINT

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

## Phase 5 — Record actuals, then the architecture decision

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

**Known gaps, named not hidden:** there is **no contrast guard** anywhere in the colour
components — a client can pick a pale gradient on white and get unreadable text with no
warning, against the framework's stated WCAG 2.1 AA baseline. Out of scope here (this is a
render-layer programme) but it must be stated in the Phase 4 report rather than silently
shipped. Likewise the 35 custom-property rows fail **in `style.css`**, which no phase above
touches — they stay refused with a named reason until a phase owns that file.

**Stale pointers to fix in Phase 0's commit:** the archived design doc moved to
`.claude/plans/archive/` at `51deda006`, but `2026-08-23-colour-capability-grant-PLAN.md`'s
frontmatter and `2026-09-02-findings-31-golden-colour-control.md:20` both still point at the
live path.

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

## Deferred, named, not dropped

U11 extension attribution (its numbers need re-taking: 15 `fx.js` mounts with 9 carrying
`states=`, plus `hover-effects.js`'s lazy-`require` mount that no import-following reach map
can see, and 30 blocks declare `hover` against 16 declaring `fx`) · the 104 no-paint-path rows
beyond the 20 single-shape blocks · the 35 custom-property rows · shadow colour · repeater-item
colours · media-atom colours · a contrast guard · `grant.js` itself, pending Phase 5.
