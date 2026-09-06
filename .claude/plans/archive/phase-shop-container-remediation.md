---
plan_id: phase-shop-container-remediation
phase_name: Shop archive + container remediation
project: small-giants-wp
created: 2026-08-20
revised: 2026-08-20 (post Hidden-Decisions pass — 8 defects fixed, see CHANGELOG)
cost_estimate: Phase 1 ~0.9M tokens / 9 steps · Phase 2 ~1.1M tokens / 10 steps
docscore_grade: pending
---

# Shop archive + container remediation

**USP:** Fixes the one bug blocking instant filtering *and* the already-built Flip animation,
then closes the container defect that silently caps every background on every client site.

**Plan label:** `[PLAN: opus]` — two Rule 7 shared-wrapper gates, a 43-file blast radius.

**Spec (single source of truth):** `.claude/plans/2026-08-20-shop-archive-remediation-design.md`
(693 lines, every claim live-verified). Its "BEAN'S DECISIONS" section is BINDING.

**Branch:** `main` for all framework work (`plugins/sgs-blocks/`, `theme/sgs-theme/`).
⚠ Step P2-6 also touches `sites/indus-foods/` — that portion goes on `feat/indus-foods-colour-rename`
per CLAUDE.md's branch routing. Verify with `git branch --show-current` **in the same command
as every commit**.

---

## ▶ EXECUTION PROGRESS (updated 2026-08-22, end of FIFTH execution session — PHASE 2 COMPLETE)

**PHASE 1 AND PHASE 2 ARE BOTH COMPLETE.** P2-2/P2-4/P2-5/P2-7 (the four steps still open at the
end of the fourth session) shipped, deployed to sandybrown, live-verified on the real canary
(editor canvas via `wp.data` + the actual lifted CSS file, not just a computed-style guess), and
reseeded into `sgs-framework.db`. Full detail: `C:\Users\Bean\.claude\plans\go-product-archive-track-zesty-cocoa.md`
(that plan's own "What changed" section records its two review passes — `/qc` and `/qc-council`
— plus the cross-session coordination it executed under). Commits, in order: `75391ad2`+`fa37a400`
(P2-2, on `main` as `fc1148db` after a rebase) · `c99042d1` (P2-5) · `ae722810`+`f3c78e82` (P2-4a)
· `00655d44`+`eb5ed4ee` (P2-4b) · `eda8f23b`+`8cd511b1` (P2-7 reseed).

**PHASE 1 COMPLETE (both gates closed, live-verified). PHASE 2 IS MOSTLY DONE — five of the
nine steps shipped, several by parallel tracks. Status below was RE-VERIFIED against the code on
2026-08-21 rather than carried forward; it had read "NOT STARTED" for four sessions.**
**The R-3 workstream is COMPLETE (all 7 items).** Commits: `3224db10`, `03fd4247`, `b562c6d2`, `631e97a3`,
`21131a98`, `25cc0188` (all on `main`, pushed).

| Step | Status | Notes |
|---|---|---|
| **P1-1** `sgs/text` kills client-side nav | ✅ **DONE, live-verified** | Root cause was NOT the plan's assumption. WooCommerce's `ProductCollection/Controller.php:125-134` `is_block_compatible()` checks the block REGISTRY for `supports.interactivity`; it is not a namespace check. Fixed with 3 lines of `block.json`. **D702** |
| **P1-2** gate allowlist fix | ✅ **DONE** | **42** findings under a new advisory kind, not the predicted ~60 (that was a reasoned estimate; 42 is enumerated after false positives removed). `--check` still exits 0. **D703** |
| **P1-3** brand-strip colour trace | ✅ **DONE** | Confirmed the hover names paint `__item`, not the root. |
| **QC GATE 1** | ✅ **PASS** | Build exit 0; findings surface; cause proven with file:line. |
| **P1-4** deploy + live-verify | ✅ **PASS** | Instant filtering CONFIRMED working: a stamped `window` var survived a filter click (no reload), URL updated client-side, products 5→4, 2 `fetch` requests. |
| **P1-5** template validity fixes | ✅ **DONE** (`fe078c2f`, clear button closed in `7e2d6eba`) | ⚠ Plan figures were wrong twice: **6** leaves, not 7 — `product-filter-clear-button` is NOT a leaf (its `save()` is `InnerBlocks.Content`) and was left untouched rather than guessed at. **10** stray comments, not 4. Classes verified against WooCommerce 11.0.0 `save.tsx`. |
| **P1-6** colour on **3** non-container blocks | ✅ **DONE + EDITOR-VERIFIED** (`fe078c2f`) | hero / trust-bar / brand-strip. testimonial-slider dropped (already correct) and used as the TEMPLATE. Two blocks had their root background mapped to a native colour attr that was switched OFF, so it could never have worked. `sgs/brand-strip` had **no root element in its manifest at all** — one was added and the others renumbered. `sgs/hero` needed a duplicate-control baseline (`709bf066`) — handed to the colour track. |
| **P1-7** theme CSS (panel visibility, fallbacks, search width) | ✅ **DONE** (`fe078c2f`) | Dead teal fallbacks **enumerated at 47** (45× `#0f7e80`, 2× `#0b6668`), now 0. 15 of them sat on focus outlines and took `currentColor` rather than deletion — not in the brief, and correct. |
| **P1-8** mobile filter sheet + a11y | ✅ **DONE + LIVE-VERIFIED** (`fe078c2f` + 6 follow-ups) | Native `<dialog>` bottom sheet. ⚠ Deviation flagged by the agent and accepted: sticky trigger built as `position:fixed` + scroll listener, not `position:sticky` — sticky would pin to its own containing block and sit near the page bottom, not follow the grid. |
| **QC GATE 2** | ✅ **CLOSED 2026-08-21 — PHASE 1 COMPLETE** | Closed by the colour-golden track BEHAVIOURALLY, which is the bar Bean set: a swatch picked in the editor, then the computed style confirmed changed on the frontend at rest AND under a real pointer hover, with a negative control (hero returned to its resting colour when unhovered). Frontend separately verified live at 1440/768/390. The four visual-gate skips in `reports/visual-diff/manual-skips.log` remain an honest record — no PASS was ever fabricated. |
| **Phase 2** (P2-1…P2-9) | ✅ **COMPLETE 2026-08-22** | All nine numbered steps done (P2-8 was reassigned to Phase 1 as P1-1b, per the table below). QC GATE 3 and QC GATE 4 both closed live on sandybrown. See the Phase 2 table below for per-step evidence. |

### ✅ CLEAR-FILTERS BUTTON — closed (`7e2d6eba`), the last P1-5 residual

The block was authored self-closing and rendered nothing, so the shop had no visible way to
clear filters. It now contains an `sgs/button`, NOT core.

Two facts read from `ProductFilterClearButton::render()` rather than assumed, both
load-bearing:

1. WooCommerce finds the first tag carrying **`wp-block-button__link`** and attaches
   `data-wp-on--click="actions.removeAll"` to THAT element. An `sgs/button` without that
   class renders perfectly and does nothing. Adding it was verified safe: the only bare rule
   for that class in the theme sets `background-image:none` inside a contrast context; every
   other rule is scoped under `.wp-block-button` or a named wrapper, neither of which a
   standalone `sgs/button` has.
2. It then str_replaces the anchor tag for a button tag. `sgs/button` with no `url` already
   renders `<button>` (`render.php:65`), so the swap is a no-op rather than a corruption.

**Verified live at the markup level** — the rendered element is
`<button data-wp-on--click="actions.removeAll" class="sgs-button sgs-button--primary …
wp-block-button__link">`. ⚠ **The behavioural click test (does it actually clear?) was NOT
run** — the Playwright browser profile was locked by the parallel session. The binding is
present and it is WooCommerce's own action, so confidence is high, but it is unproven.

### ▶ FOURTH SESSION (2026-08-21) — PHASE 1 COMPLETE, and the real Phase 2 question found

**QC GATE 2 CLOSED by the colour-golden track**, behaviourally: a swatch picked in the editor,
computed style confirmed on the frontend at rest AND under a real pointer hover, with a
negative control (hero returned to its resting colour when unhovered). **Phase 1 is complete.**

**Shipped here:** the filter accordion (panel 1154px → 505px, which is what finally made
`position:sticky` work — measured holding at its 24px offset through a 300px scroll); ten
review defects; the `<main>` landmark restored sitewide; `sgs/site-footer` migrated off the
native colour path atomically with its 7 authorings; `sgs/cta-section` renamed British + 11
client authorings (PR #35).

⛔ **THE THEME-ASSET STALENESS DEFECT.** Every theme CSS/JS URL carried the theme version,
which is never bumped, so assets deployed between releases kept identical URLs and warm caches
served old bytes indefinitely — 10,199 fresh vs 5,079 cached on the same URL. Two shipped
features looked completely broken while the server had the right files. Fixed by `filemtime`
versioning (`d3e98700`). **Anything theme-side judged before that commit needs re-testing.**

### 🔬 P2-1/P2-4 REFRAMED BY RESEARCH — read before touching the container

Three research legs (2 web + 1 reading core's source) independently established:

- WordPress caps a constrained container's **CHILDREN** via
  `.is-layout-constrained > :where(:not(.alignfull)) { max-width: … }` — `.alignfull` excluded
  BY NAME, at zero specificity. Verified from `lib/block-supports/layout.php` and core's own
  PHPUnit stylesheet assertions, not from documentation prose.
- Canonical themes never put `max-width` on `<main>`. TT4 ships
  `{"tagName":"main","align":"full","layout":{"type":"constrained"}}` — full-bleed AND
  constrained at once, because those words describe different things.
- Archive intro copy sits DIRECTLY inside `<main>` with no wrapper, because cap-the-children
  gives it content width automatically.

**Consequence for us:** `sgs/container` injects `.sgs-container__inner` carrying `max-width`
on ITSELF, so a child cannot opt out. "Full-bleed child of a constrained parent" is
inexpressible in our model. Unconstraining `<main>` on this template was a workaround for that
gap, not the structural answer — and the gap is the same work the colour-golden track scoped
as their §4b.

**Ruled out on evidence, so nobody re-investigates:** moving the band outside `<main>` is
accessibility-wrong (W3C excludes only REPEATED chrome from `<main>`; a page-specific title is
page content); and the `calc(50% - 50vw)` full-bleed trick still carries its horizontal
scrollbar bug. ⚠ `sgs/container` emits NO `.is-layout-constrained`, so
`useRootPaddingAwareAlignments` cannot help for free — that option is weaker, not stronger,
than it first appears.

Full findings, options table and honest costs:
`~/.claude/memory/research/2026-08-21-wp-block-theme-main-width-and-full-bleed-bands.md`

### ▶ THIRD SESSION (2026-08-20 evening) — Wave 2 closed on the frontend

**Deployed and checked on the canary.** The deploy itself exposed a framework-wide defect
first: every theme CSS/JS URL was versioned by the THEME version, which is never bumped, so
warm browser caches served old bytes indefinitely (same URL: 10,199 fresh vs 5,079 cached).
Both P1-7 and P1-8 looked broken until that was fixed — the server had the right files all
along. Now versioned by `filemtime` (`d3e98700`). A server-side cache purge does NOT fix it.

**P1-8 needed six follow-up fixes after the first live look.** Recorded because the pattern
matters more than the individual bugs: *the drawer was structurally perfect and functionally
dead.* Every control inside it was inert — the controls sit inside WooCommerce's own
`.wc-block-product-filters__overlay`, which WC holds at `pointer-events: none` until IT sets
`is-overlay-opened`. Our own neutralisation block had reset WC's overlay POSITIONING years
earlier and never its pointer-events.

⚠ **WooCommerce already ships a mobile filter drawer of its own** (its open-overlay button is
in the DOM; we hide it). The site now carries two. **Left as a decision, deliberately not
entrenched.**

**A methodology failure worth not repeating:** the "sheet scrolls the page down" bug got
THREE fixes aimed at an unproven cause, two of which did nothing (669px → 348px → 348px).
Only instrumenting it settled it — calling `showModal()` with none of our code running still
jumped 348px, because its focusing steps land on the scroll container and
`html { scroll-behavior: smooth }` animates the browser scrolling to it. An `autofocus`
target at the top of the sheet measures 0px. **Both failed fixes were removed rather than
left stacked**, per the prove-the-cause rule.

**Filter UI rebuild (Bean review).** Most of the "looks disgusting" complaints shared ONE
cause: CSS written against markup WooCommerce 11 no longer emits, so it matched nothing and
the controls fell back to UA styling — chips measured 2px radius / transparent / 12.8px. The
selected-chip rule keyed on `aria-pressed` while the live element reports `aria-checked`, so
a chosen filter looked identical to an unchosen one. Chips now consume the same six custom
properties as `sgs/button`; panel, separators and slider derive from the client's primary via
`color-mix`, so no client hex sits in framework CSS. Group labels existed only as
`<legend class="screen-reader-text">`; revealing them is impossible without `!important`
(core declares `position: absolute !important`), so each group now carries a real
`sgs/heading`. The Availability filter was removed entirely — WooCommerce offers no attribute
to drop just the out-of-stock option.

### ⚠ CROSS-TRACK: what the OTHER session completed (do not re-do)

Verified from the tree, not assumed:

- **P2-3 (container root colour) — DONE by them** (`1905257e`, `52b96e68`). Their first pass
  shipped a single-state, no-gradient row that failed their own golden shape; they found and
  fixed it after our handover flagged the arithmetic.
- **P2-6 (pattern rename) — PARTIAL.** ENUMERATED, not estimated: **38 done** across 23 theme
  files; **39 remain** — 10 SGS authorings in `theme/` (footer patterns) and 29 in `sites/`
  (php/html only; the raw string also appears in extraction artefacts that are NOT authorings
  and must not be counted).
- **Rule 31 ratchet** reconciled to 420 and then to 418.

### 🔴 HANDED TO THE COLOUR-GOLDEN TRACK (3 items, in the handover doc)

1. QC Gate 2's **editor half** — pick a colour, confirm the computed style changes at rest AND
   on hover, on each of the 3 blocks. Gradients have never been observed working.
2. **P2-1** — `sgs/container` background still capped at content width. Re-confirmed live this
   session: `max-width: 1280px` on the OUTER element, `.sgs-container__inner` absent.
3. **`sgs/container` gives no horizontal gutter** (NEW, not previously in this plan). At 355px
   every ancestor of a product card computes `padding-left: 0`, so cards and the filter toggle
   sit flush at `left: 0`. The template only ever declared top/bottom padding, so the gutter
   came from the container default. Bean reports it used to exist → likely a regression from
   this evening's container work.

### ⚠ CROSS-TRACK COLLISION — read before trusting any gate number in this doc

Wave 2 ran in a worktree **shared with the live colour-golden session**, which was editing
and committing concurrently. Consequences that matter to whoever reads this next:

1. **Three subagents each reported the same failing gate and each blamed the others' blocks.**
   All three were wrong. The cause was the other track rewriting rule 31's own engine
   (`core/golden.js` gaining `reachedComponents()`), with its reconciling `rules.json` edit
   still unstaged — so the build read a stale backlog. **The measuring instrument changed
   underneath the measurement.** Do not accept a subagent's "not my block" on a shared tree.
2. **Commits are path-scoped and split by track.** `fe078c2f` = Wave 2 (this track).
   `20332725` + `1905257e` = the colour-golden track, authored and committed by *them*.
   The repo's own pre-commit gate blocks bare commits for exactly this reason — it fired.
3. **The colour-golden track shipped P2-6-shaped work already**: 38 `backgroundColor` →
   `backgroundColour` renames across 23 theme files, plus `sgs/container`'s own base
   background. That overlaps P2-1..P2-6 below. **Re-scope Phase 2 against the tree before
   starting it — parts of it may already be done, and the plan's ordering constraint
   (P2-6 must follow P2-3) was satisfied by them, not by us.**
4. **Handover written:** `.claude/reports/2026-08-20-HANDOVER-3-shop-wave-2-to-colour-golden-track.md`
   asks that track to QC Wave 2's colour work, rule on `sgs/hero`'s duplicate text-colour
   control and on D6's partial reversal, and reconcile a +10/+11 discrepancy in their own
   rule-31 reason.

### R-3 batch enforcement-script workstream

| Item | Status |
|---|---|
| **R3-a** adopt the shared resolver in 5 gates | ✅ **DONE** — plus a `--dump-json` entry point so the Python gates reuse the SAME resolver. `contentWidth` now visible (dead-controls 1→56, inert-controls 3→59). |
| **R3-b** wire 2 unwired detectors into `prebuild` | ✅ **DONE** — both now exit 0 and are WIRED. `check-undeclared-attrs` unblocked itself (its last finding was `sgs/quote`'s, fixed). `check-inert-controls`' sole finding was a FALSE POSITIVE — fixed the detector: it now understands `show<Prop>={ false }` suppression, derived from source, with a negative control proving it doesn't over-match. `check-device-toggle` deliberately NOT wired (live canary test). |
| **R3-c** promote accidental advisories | ✅ **DONE** — `prestart` aligned with `prebuild`. Parity CHECK B flipped to BLOCKING (0 net-new, starts green); CHECK A stays advisory with its 176 recorded. The report label now DERIVES from the flag (it was hardcoded "advisory" and would have lied after a flip). `check-dead-controls` CHECK 4 + 5 given dated promotion triggers naming their exact blockers. |
| **R3-d** baseline anti-rot convention | ✅ **DONE** — 6 baselines. One took a loader code-comment because its gate iterates every key. |
| **R3-e** the "biggest hole" | ✅ **DONE** — new advisory `inspector-scan` rule `34-declared-attr-unrendered`, 415 findings / 46 of 83 blocks. |
| **R3-f** stale docstrings | ✅ **DONE** |
| **R3-g** run the never-run detectors | ✅ **DONE** — `.claude/reports/2026-08-20-r3g-unwired-detectors-first-run.md`. 2 worth wiring, 2 not. |

### ⚠ THREE PLAN CLAIMS REFUTED BY IMPLEMENTATION — correct these before working from them

1. **P1-1's root cause.** A subagent proposed that WooCommerce rejects any non-`core/` block. **Refuted
   by our own template:** `sgs/product-card` sits inside the same collection and never tripped it,
   because it declares `supports.interactivity: true`. The real gate is a registry check.
2. **P1-6's premise is wrong for 3 of its 4 blocks.** `sgs/testimonial-slider` was ALREADY correct
   (all four attrs declared AND bound to its root with a hover state) — **drop it from the step**.
   `sgs/site-header-row`, named as the "proven recipe" to copy, has **no hover pair at all**. **Use
   `sgs/testimonial-slider` as the template instead.** `sgs/hero` and `sgs/trust-bar` have hover attrs
   bound to no element; `sgs/brand-strip`'s painted the inner tile (now renamed).
3. **"~60 orphaned colour authorings"** — the enumerated figure is **42**.

### Off-plan work completed the same session (Bean-directed, not in this plan)

- **FR-38-12 Flip — CLOSED 2026-08-22, D741.** The ninth cause (this note's own "unfound") turned
  out to be two: `sgs/container` (the shop archive's toolbar wrapper) was itself tripping WC's
  client-nav kill-switch, same shape as the P1-1 `sgs/text` fix above; and `fx-flip.js`'s
  `settle()` called `MatchMedia#add(fn)` with a bare function where the API requires
  `(conditions, func)`, so `Flip.from()` was registered but never invoked. Both fixed
  (`c01ed84a`, `da580d8e`), live-verified two independent ways, `animate_product_filtering` ON.
  Full writeup: `decisions.md` D741.
- **Element-manifest style-defect debt 12 → 0** and the baseline dropped to zero.
- **`STATE_WITHOUT_BASE` 4 → 2** — `sgs/post-grid` gained a resting shadow control; `scaleHover`
  reclassified via a new `noBaseByDesign` mechanism. Remaining 2 handed to the colour-golden track.
- **WP 7.1** — canary upgraded; three stale doc references corrected.
- **Two cross-track handovers** written for the parallel colour-golden session.

---

## ⚠ CHANGELOG — 8 defects found by the Hidden Decisions pass and fixed

Two cold reviewers independently reviewed the first draft. Every finding below was verified
against real files before acting; all were real.

1. **Pattern rename ran BEFORE container declared its attrs** — would have stripped the
   background from ~280 authorings and failed QC by construction. **Moved to Phase 2, after
   the container spine.**
2. **Step 2 would have redded the build for the whole phase.** `check-dead-pattern-attrs.py
   --check` is in the build-FAILING chain unwrapped; `--check` exits 1 on all kinds except
   `native-style-undeclared` (`:303-318`). **Now specifies a new advisory finding-kind.**
3. **Template-fix example would have corrupted a valid block.** `product-filter-price` is
   already open+close (`:57-59`); the self-closing ones are the **leaves**. **Count corrected
   13 → 7, all named.**
4. **Chip `nowrap` "fix" would have deleted a working feature.** `:648-660` is a deliberate
   horizontal-scroll pattern (`overflow-x:auto`, `-webkit-overflow-scrolling`, hidden
   scrollbar, comment). **Change dropped.**
5. **Steps said "verify live" and "do not deploy" simultaneously.** **Deploys now granted
   explicitly at wave boundaries, owned by the orchestrator.**
6. **Wave 1 ran three agents in parallel while one ran `npm run build`** over files the other
   two were editing. **Build moved out of the parallel group.**
7. **G2 was filed against the band-width step; it governs colour.** **Re-attached to P2-3.**
8. **Editor-parity gate measured a tree another step was concurrently changing.**
   **Sequenced after it.**

---

## ⛔ BLOCKERS — answer BEFORE Phase 2 starts

Rule 7 gates. No subagent can take these.

| # | Gate | Blocks | Recommendation |
|---|---|---|---|
| ~~G1~~ | `flexDirection` default | ~~P2-2~~ | ✅ **CLOSED — Bean ruled `row`** (CSS default). Council CONFIRMED it correct on two grounds the recommendation missed: `stack` is already flex-column, and `row` is LESS retroactive than `column`. See "G1 design council" below. |
| ~~G2~~ | `sgs/container` root colour routing | ~~P2-3~~ | ✅ **CLOSED — Bean ruled `SGS_Container_Wrapper`.** Rule 7 gate satisfied. |

**Both gates are CLOSED, and so is the council's third option** (superseded by R-1 below:
blank wrapper + per-block defaults). ~~ONE NEW question was raised by the council and is NOT yet
answered~~ — see "THIRD OPTION" below: whether to change the `layout` default at ALL, versus
having the editor write `layout:"flex"` explicitly on newly-inserted containers (zero
retroactivity). Bean's ruling settled DIRECTION, not whether to change the default.
Phase 1 does not depend on it and can start immediately.

---

## Pre-conditions

Phase 1: none — it needed no design gate and could start cold. **It is now COMPLETE.**

Phase 2 (the live front), all three must hold before any container code is written:

1. **Bean's ruling on the width model** (Rule 7 — shared-mechanism change). The choice is
   whether `sgs/container` adopts core's cap-the-children selector for
   `container_kind='content'`, keeping the injected node only where `@container` queries,
   `data-sgs-fx-track` and grid-on-inner structurally require it.
2. **`inspector-scan/rules/23-content-width-needs-inner-band.js` widened FIRST.** Its regex
   expects a dot-class after `>`, so core's `:where(...)` shape makes it report "no band" for
   every correctly migrated block — it goes silently wrong, not red. Widening it after the
   migration would mean migrating against a gate that cannot see the target shape.
3. **The parallel colour-golden track's container work settled**, since it owns those files.
   Its P2-3 and gutter/contentWidth fixes have landed; confirm nothing is mid-flight before
   editing `class-sgs-container-wrapper.php`.

## Parking lot

No new parking.md entries were opened by this plan — deferred work is tracked as named tasks
in `.claude/LEDGER.md`'s next-session section, which is the live front, rather than duplicated
into parking.md. (Per the standing rule, a parking entry is a commitment and is never opened
without asking Bean first.)

Deliberate debt with a named trigger, recorded so it is not mistaken for drift:

- `templates/archive-product.html` holds `<main>` at `contentWidth:"full"` and wraps
  `sgs/collapsible-text`. Both exist ONLY as workarounds for the container gap above, and both
  should be reverted the day pre-condition 1 lands. Bean ruled on keeping them for now.

## Entry context

- `.claude/plans/2026-08-20-shop-archive-remediation-design.md` — the spec
- `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php:424-425, 836-842, 1628, 2344-2354, 2689` — band bug chain
- `plugins/sgs-blocks/src/blocks/button/edit.js:381-470` — colour-panel reference
- `plugins/sgs-blocks/src/blocks/site-header-row/render.php:78-107` — `sgs_colour_value()` pattern
- `.claude/secrets/sandybrown.env` — canary creds (gitignored, always available)

## References
D683 (native-colour retirement breaks patterns silently) · D684 (raw token → style engine emits
invalid slug) · D336 (hand-rolled deploy = 2.5h outage) · D613 (parity gate advisory + cross-file
blind) · R-31-11 (live DOM is canonical) · R-31-13 (Bean's eye co-authoritative)

## Tooling Index
| Type | Name | Used in |
|---|---|---|
| skill | /delegate | every dispatched step |
| skill | /systematic-debugging | P1-1 |
| cli | build-deploy.py --target sandybrown | all deploy steps |
| mcp | chrome-devtools | P1-1, all QC gates |
| cli | ssh hd + wp-cli | P1-1, QC gates |
| cli | /sgs-update | P2-7 |

---

# PHASE 1 — unblock filtering + independent fixes

**Ships alone. Needs no Rule 7 gate. Delivers the entire USP.**
Orchestrator does: dispatch, deploy, verify, QC, docs. It writes no implementation code.

## WAVE 1 — 3 PARALLEL (verified file-disjoint, none runs a build)

### P1-1 — Root-cause + fix `sgs/text` killing client-side navigation
- **Model:** sonnet — cross-system architectural trace
- **Files:** `plugins/sgs-blocks/src/blocks/text/render.php` (+ helpers it calls)
- **Exec:** PARALLEL with P1-2, P1-3 · **Marker:** SESSION-START · **Time:** 25 min
- **Outcome:** the exact line is named, and fixed
- **On-Fail:** revert; report the mechanism. **No speculative fix.**
- **Cold-Entry:** spec §2; `theme/sgs-theme/templates/archive-product.html:105-107`
- **Prompt:** "In c:\Users\Bean\Projects\small-giants-wp, root-cause and fix why `sgs/text`
  disables WordPress client-side navigation when rendered inside
  `woocommerce/product-collection-no-results`. ALREADY PROVEN — do not re-derive: swapping
  ONLY `sgs/text` for `wp:paragraph` in the real template flips `clientNavigationDisabled`
  from true to absent (three consistent variants). WP core sets that flag when an enhanced
  query is marked dirty. FIND THE EXACT LINE: read `src/blocks/text/render.php` and every
  helper it calls; compare against what `wp:paragraph` does NOT do. Suspects: global
  `$post`/`$wp_query` mutation, `setup_postdata()` without `wp_reset_postdata()`, a secondary
  WP_Query, a `render_block` filter side-effect. PROVE the cause before fixing — this project
  forbids fixing an unproven cause. Then fix minimally. ⛔ Do NOT deploy and do NOT run
  `npm run build` — another agent is editing build-chain files concurrently. Report: the exact
  file:line, the mechanism, the fix, and a falsifiable prediction of what the live check will
  show. The orchestrator deploys and verifies."
- **Test:** Happy: cause named with file:line · Edge: `sgs/text` still renders correctly
  outside a query loop · Fail: cause not found → report and stop · Integration: unblocks FR-38-12

### P1-2 — Fix `check-dead-pattern-attrs.py` allowlist
- **Model:** sonnet — needs correct WP supports-resolution semantics
- **Files:** `plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`
- **Exec:** PARALLEL with P1-1, P1-3 · **Time:** 25 min
- **Prompt:** "Fix `plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`. BUG: lines 55-58
  put `backgroundColor`, `textColor`, `gradient` on an UNCONDITIONAL allowlist (`NATIVE`),
  tested at `:222`, so the gate never asks whether the block enables them — ~60 orphaned
  authorings go unreported. The SAME FILE already solves this correctly for `style.*` in
  `_native_style_family_declared()` (`:170-186`); reuse that resolver. FIX: map each native
  attr to its registering supports path (`backgroundColor`→`color.background`,
  `textColor`→`color.text`, `gradient`→`color.gradients`, `fontSize`→`typography.fontSize`,
  `fontFamily`→`typography.__experimentalFontFamily`, `borderColor`→`__experimentalBorder.color`)
  and resolve truthiness: `supports.color === false` or `{background:false}` = not registered;
  `=== true` = all on; a dict = WP per-sub-key defaults (background/text true, gradients
  false). Keep `className`/`style`/`lock`/`metadata` unconditional. ⛔ CRITICAL — THE BUILD
  WILL BREAK IF YOU GET THIS WRONG: this script runs as `python
  scripts/check-dead-pattern-attrs.py --check` inside package.json's build-FAILING `&&`
  prebuild chain, UNWRAPPED. Per `:290-318`, `--check` exits 1 for the `undeclared` and
  `shape-mismatch` kinds and exits 0 for `native-style-undeclared`. Therefore emit your ~60
  new findings under a NEW, THIRD finding-kind (e.g. `native-preset-undeclared`) that is
  ADVISORY — exits 0 — following the exact precedent at `:303-318` including its explanatory
  print. Do NOT put them in `undeclared`. Add a self-test proving (a) it flags a
  declared-all-false case, (b) it does NOT flag a genuinely enabled one, (c) `--check` still
  exits 0 with only the new kind present. ⛔ Do NOT run `npm run build` — another agent is
  editing files in that chain. Run the script standalone only. Report the finding count and
  the exit code."
- **Test:** Happy: ~60 findings, exit 0 · Edge: `supports.color:true` not flagged · Fail:
  self-test proves it can fail · Integration: prebuild stays green

### P1-3 — Trace `brand-strip` colour ownership (READ-ONLY)
- **Model:** haiku — mechanical read
- **Files:** none written
- **Exec:** PARALLEL with P1-1, P1-2 · **Time:** 10 min
- **Prompt:** "READ-ONLY, edit nothing. In
  `plugins/sgs-blocks/src/blocks/brand-strip/`, determine which DOM element
  `backgroundColourHover` and `textColourHover` currently paint. Read `block.json` (declared
  attrs + `supports.sgs.elements` attrMap), `render.php` (which selector consumes them),
  `edit.js` (which panel row writes them). THE QUESTION: if we add ROOT-level
  `backgroundColour`/`textColour` with hover states, would the hover names COLLIDE with these
  existing tile-scoped attrs and silently drive tile CSS instead of the root? Answer
  definitively with file:line and recommend either (a) reuse — they are already root-scoped,
  or (b) the exact distinct names the root rows must use. If genuinely ambiguous, say so
  rather than guessing."
- **Test:** Happy: unambiguous answer with file:line · Fail: says "cannot determine" rather
  than guessing · Integration: feeds P1-6

---

## QC GATE 1 — build integrity + cause proven
- **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** P1-1..P1-3 · **Marker:** QA
- **Check:** orchestrator runs, in this order (nothing else touching the tree):
  ```bash
  cd plugins/sgs-blocks && npm run build          # exit 0 — proves P1-2 didn't red the chain
  python scripts/check-dead-pattern-attrs.py      # ~60 findings under the new advisory kind
  ```
  Plus: P1-1 reports an exact file:line cause + a falsifiable prediction.
- **Pass:** build green, findings surface, cause named
- **Fail:** build red → revert P1-2 immediately (it gates everything). Cause unproven → STOP
  the phase; P1-1 is the entire USP.
- **📝 DOCS (mandatory):** D-entry for the `sgs/text` root cause with evidence; update spec §2's
  "Not yet done" line; update `.claude/LEDGER.md`.

### P1-4 — Deploy + live-verify the `sgs/text` fix  ← ORCHESTRATOR
- **Model:** inline · **Deps:** QC-1 · **Time:** 10 min
- **Action:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
  Then on `/shop/`: confirm `clientNavigationDisabled` ABSENT, and a filter click issues a
  `fetch` with no document navigation (network log, not the emit — R-31-11).
- **On-Fail:** `.bak` rollback via the script. Never `--allow-dirty`/`--skip-verify`.
- **Test:** Happy: fetch, no doc nav · Edge: filters still return correct products · Fail:
  rollback · Integration: **first chance to confirm FR-38-12 Flip animates** — check it

---

## WAVE 2 — 6 PARALLEL (file-disjoint; none builds or deploys)

### P1-5 — Template validity fixes
- **Model:** haiku · **Files:** `theme/sgs-theme/templates/archive-product.html` · **Time:** 15 min
- **Prompt:** "Fix `theme/sgs-theme/templates/archive-product.html` — blocks failing WordPress
  validation, in two classes. CLASS 1 — 4 × `sgs/container`: hand-authored HTML comments (e.g.
  `<!-- Archive toolbar: breadcrumb + title + sort controls -->`) sit INSIDE container
  inner-content. The container's `save.js` emits `<InnerBlocks.Content/>` which produces no
  comments, so WP reports 'Expected end of content, instead saw [comment]'. FIX: move each
  such comment OUTSIDE its block, immediately ABOVE the opening `<!-- wp:sgs/container -->`.
  Keep the wording. CLASS 2 — exactly these SEVEN self-closing WooCommerce filter LEAF blocks,
  at these lines: `:52` product-filter-removable-chips, `:53` product-filter-clear-button,
  `:58` product-filter-price-slider, `:64` product-filter-chips, `:70` product-filter-chips,
  `:75` product-filter-checkbox-list, `:80` product-filter-checkbox-list. Each is authored
  self-closing (`/-->`) but its `save()` emits a div, so WP reports 'Expected <div…>, instead
  saw end of content'. FIX each to open+close with its div, e.g.
  `<!-- wp:woocommerce/product-filter-removable-chips --><div class=\"wp-block-woocommerce-product-filter-removable-chips wc-block-product-filter-removable-chips\"></div><!-- /wp:woocommerce/product-filter-removable-chips -->`.
  ⛔ Get the class list right per block — check the live rendered page or WooCommerce's own
  block registration; some carry BOTH a `wp-block-…` and a `wc-block-…` class and some carry
  only one. If you cannot determine a block's exact save markup, STOP and report which one
  rather than inventing a class. ⛔ Do NOT touch `product-filter-active`, `-price`,
  `-attribute`, `-status`, `-rating` or `product-filters` — those are ALREADY correctly
  open+close with children; editing them would double-wrap valid blocks. ⛔ Change no block
  attributes and no structure. Verify by re-reading: zero comments inside container
  inner-content, and exactly those 7 leaves converted."
- **Test:** Happy: re-read shows 7 converted, 0 stray comments · Edge: the 6 already-correct
  blocks untouched · Fail: reports rather than inventing a class · Integration: QC-2 confirms
  0 invalid blocks in the Site Editor

### P1-6 — Colour: 4 non-container blocks (4 SUB-AGENTS IN PARALLEL)
- **Model:** sonnet ×4 — one per block, 4 disjoint directories
- **Files:** `src/blocks/{hero,trust-bar,brand-strip,testimonial-slider}/**`
- **Deps:** P1-3 (brand-strip only) · **Time:** 30 min each
- **Prompt:** *(per block)* "Add root-element colour to `sgs/<BLOCK>` following the PROVEN
  recipe from `sgs/site-header-row` (commit `0b62caf9`). ⚠ CORRECTION TO A COMMON ASSUMPTION:
  this block ALREADY mounts `SgsColourPanel` — the gap is that it has no ROOT background/text
  colour attributes. (1) block.json: add `backgroundColour`, `backgroundColourGradient`,
  `backgroundColourHover`, `backgroundColourHoverGradient`, `textColour`, `textColourGradient`,
  `textColourHover`, `textColourHoverGradient` — all `{\"type\":\"string\",\"default\":\"\"}` —
  SKIPPING any that already exist. Normalise `supports.color` to every sub-flag false +
  `__experimentalSkipSerialization:true`; KEEP the key, the uniformity gate reads it. ⚠ The
  prebuild chain contains `python scripts/surveys/survey-background-colour-support.py --check`
  — run it standalone after your change and confirm it still passes; if it objects, report
  rather than working around it. (2) edit.js: add two `SgsColourPanel` rows — background using
  GRADIENT SETUP 1 (in-row per-state: each state carries `gradientValue`/`onGradientChange`,
  sibling attr `{attr}Gradient`), text using GRADIENT SETUP 2 (row `gradientCapable: true`).
  Each row has TWO states, normal + hover (golden contract `states.minimum: 2`). ⛔ Do NOT use
  GRADIENT SETUP 3 (`GradientOverlayControl`) for these — it is single-state by construction
  and cannot do hover; it is already mounted for the background-image overlay and they STACK,
  they do not compete. COPY THE SHAPE VERBATIM from `src/blocks/button/edit.js:381-470`.
  (3) render.php: consume the new attrs onto the block's ROOT element. ⛔ D684 — never pass a
  `DesignTokenPicker` value RAW to `wp_style_engine_get_styles()`: it emits the literal
  `background-color:primary;`, which the browser silently drops. Route EVERY value through
  `sgs_colour_value()` (`includes/helpers-tokens.php:580`). Canonical pattern:
  `site-header-row/render.php:78-107`. ⛔ Do NOT run `npm run build`, do NOT deploy, do NOT run
  `/sgs-update`, do NOT touch any other block, do NOT edit theme patterns — the orchestrator
  sequences those. Report every file changed and any gate that objected."
- **Test:** Happy: attrs declared, panel rows render, render.php routes via `sgs_colour_value()` ·
  Edge: unset attrs emit no rule · Fail: reports gate objection rather than working around ·
  Integration: QC-2 verifies live

### P1-7 — Theme CSS: panel visibility + fallbacks + search width
- **Model:** sonnet · **Files:** `theme/sgs-theme/assets/css/woocommerce.css`,
  `plugins/sgs-blocks/src/blocks/product-search/style.css` · **Time:** 25 min
- **Prompt:** "THREE changes. (1) `theme/sgs-theme/assets/css/woocommerce.css:460-467` —
  `.sgs-shop-filters` is invisible because `background: var(--wp--preset--color--surface)`
  resolves to `#fbf3dc`, IDENTICAL to the live body background, and its border uses
  `surface-alt` (`#fff9f0`) at 1.06:1. This is a FRAMEWORK-DEFAULT bug (theme.json's own
  defaults are 1.08:1), not client-specific. FIX: add two derived tokens —
  `--sgs-elevation-1: color-mix(in oklab, var(--wp--preset--color--surface) 92%,
  var(--wp--preset--color--text) 8%)` and `--sgs-elevation-line: color-mix(in oklab,
  var(--wp--preset--color--surface) 78%, var(--wp--preset--color--text) 22%)` — mixing toward
  `text` NOT black, so a dark palette gets a LIGHTER panel automatically. Use elevation-1 as
  the panel background; add `box-shadow: 0 1px 3px rgb(0 0 0/.08), 0 0 0 1px
  var(--sgs-elevation-line)` so separation survives ANY palette. Switch the border to the real
  `border` token, not `surface-alt`. (2) Same file — delete the teal fallback VALUES inside
  `var()` calls: `#0f7e80` and `#0b6668` (~47 occurrences). They match neither this client's
  palette NOR theme.json's own primary (`#1F7A7A`), so they can never be correct; a fallback
  must equal the theme default or be absent. Where removing leaves a bare `var()` on a focus
  outline, use `currentColor`. ⚠ Leave `#e0e0e0` alone — it is a neutral, not a brand colour,
  and is out of scope. (3) `plugins/sgs-blocks/src/blocks/product-search/style.css` — the
  `inline` display mode has NO width cap while its input is `flex:1`, so it eats the full
  1200px band. Add `max-width: min(680px, 100%)` to the INLINE mode only; its siblings already
  have caps (`min(320px,90vw)`, `min(480px,92vw)`, `min(600px,92vw)`) — match that style. ⛔ Do
  NOT touch the chip row at `:648-660`: `flex-wrap:nowrap` there is a DELIBERATE horizontal
  scroll pattern (`overflow-x:auto`, `-webkit-overflow-scrolling:touch`, hidden scrollbar,
  documented by its own comment). An earlier draft of this plan wrongly called it a bug. ⛔ Do
  NOT build or deploy. Report every rule changed."
- **Test:** Happy: tokens present, fallbacks gone, search capped · Edge: focus outlines still
  visible · Fail: revert · Integration: QC-2 verifies at 3 widths

### P1-8 — Mobile filter sheet + a11y
- **Model:** sonnet · **Files:** `theme/sgs-theme/assets/js/sgs-shop-filters.js`,
  `theme/sgs-theme/assets/css/woocommerce.css`
- **Exec:** ⚠ **SEQUENTIAL after P1-7** — shares `woocommerce.css` · **Time:** 35 min
- **Prompt:** "Rebuild the mobile filter drawer as a native `<dialog>` bottom sheet. WHY:
  `plugins/sgs-blocks/src/blocks/container/style.css:63` has `.sgs-container > *:not(…)×6
  {position:relative;z-index:1}` at specificity (0,7,0), which DEFEATS the drawer's
  `position:fixed;z-index:9999` (0,2,1) — confirmed live, the panel computes
  `position:relative;z-index:1`. `.sgs-shop-layout` also creates a stacking context, so a
  z-index bump CANNOT work. `<dialog>.showModal()` renders in the TOP LAYER, above every
  stacking context — sidestepping the fight and giving focus trap, Escape, focus restoration
  and inert background for free. ⛔ Do NOT edit `container/style.css`; that is a separate gated
  workstream. CURRENT STATE: `assets/js/sgs-shop-filters.js` (172 lines) is correct in intent —
  DELETE its hand-rolled backdrop (use `::backdrop`) and hand-rolled focus trap (native).
  CRITICAL BUG: the closed drawer has 26 keyboard-tabbable controls because it is hidden by
  `transform` alone — no `hidden`, no `inert`, no `display:none`. A `<dialog>` without `open`
  is `display:none` by UA stylesheet, fixing this structurally. A11Y (WAI-ARIA APG Dialog
  Modal): trigger gets `aria-expanded`/`aria-controls`/`aria-haspopup=\"dialog\"`, ≥44px;
  dialog gets `aria-labelledby` → the existing visible `<h2 class=\"sgs-shop-filters__heading\">`
  (NOT aria-label); on open move focus to that heading (`tabindex=\"-1\"`), not the close
  button; keep the body scroll lock and the reduced-motion suppression at `woocommerce.css:704`.
  PRESENTATION: bottom sheet, full viewport width, ~85vh, sticky footer with a full-width
  primary action and a lighter-weight 'Clear all'. Sticky trigger (`position:sticky;bottom:0`)
  with an active-filter count, appearing after ~1 viewport of scroll, its height reserved so
  the last product row is not occluded. Above 782px the SAME element must present as today's
  in-flow sidebar — one DOM, two presentations. ⛔ Do NOT build or deploy — report a
  falsifiable prediction of what the orchestrator's live check at 390px will show."
- **Test:** Happy: sheet opens, Escape closes, focus restored · Edge: ≥782px still an in-flow
  sidebar · Fail: `document.querySelectorAll('#sgs-shop-filters :is(a,button,input,select,textarea,[tabindex]):not([tabindex="-1"])').length === 0`
  while closed · Integration: header/nav dialogs unaffected

---

## QC GATE 2 — Phase 1 close  ← ORCHESTRATOR
- **Model:** inline · **Deps:** P1-5..P1-8 · **Marker:** QA + HANDOFF
- **Check:** `npm run build` → deploy → on the canary at **1440 / 768 / 390**:
  - 0 invalid blocks in the Site Editor
  - filter panel visibly distinct from the page background
  - search bar ≤680px
  - drawer opens as a sheet; Escape closes; focus returns to trigger
  - closed-drawer tabbable count `=== 0`
  - 4 colour blocks: pick a swatch in the editor → computed style resolves on the frontend
  - ⚠ gradients have NEVER been observed working here — if a gradient toggle does nothing,
    record it as a finding, do not call it a pass
- **Fail:** revert the single offending step (one concern per deploy)
- **📝 DOCS:** D-entries for the colour migrations + drawer rebuild; spec status; LEDGER;
  then `/handoff`.

---

# PHASE 2 — container spine + rename + gates

**Do not start until G1 and G2 are answered.** All of P2-1..P2-4 touch `sgs/container` and
run **strictly sequentially**.

| Step | Model | Action | Deps |
|---|---|---|---|
| **P2-1** | sonnet | Band max-width off the outer element: make `$has_band_props` object-aware so `$do_wrap` flips and `.sgs-container__inner` renders; give `contentWidth` its own band selector; add the unhandled `narrow` token | — |
| **P2-2** | haiku | `layout` default per **G1**; align block.json `""` with `LayoutPanel.js`'s `'stack'` so untouched blocks stop emitting `sgs-container--` | P2-1, G1 |
| **P2-3** | sonnet | Container root colour, routed per **G2**; delete dead `textColor`/`backgroundColor` reads at `render.php:88-99`; fix `elements.wrapper.attrMap` off `native:*` | P2-2, G2 |
| **P2-4** | sonnet | Editor preview parity — mirror `render.php`'s scoped-CSS emission in `edit.js`. ⛔ `ServerSideRender` NOT viable (`useInnerBlocksProps` host) | P2-3 |
| **P2-5** | sonnet | Responsive grid: `repeat(auto-fill, minmax(max(var(--min-col,250px), computed), 1fr))` + `minColumnWidth` as an editor-settable attr | none (PARALLEL with P2-1..4) |
| **P2-6** | sonnet | **Pattern rename — MOVED HERE.** ~280 `wp:sgs/*` authorings American→British. ⚠ Must run AFTER P2-3 or container patterns lose their background | **P2-3** |
| **P2-7** | inline | `/sgs-update` reseed. ⚠ Cross-track — breaks other worktrees' DB gate until their classifier lands. Announce first | P2-6 |
| ~~P2-8~~ | — | **MOVED TO PHASE 1 as P1-1b** per D542 ("if an item touches more than ~3 blocks, the first deliverable is the detector, not the edit" — this touches 71). Building it first means it FLAGS the container, then P2-4 fixes it, then the count drops by one — a real before/after instead of an eyeball. | — |
| **P2-9** | haiku | `<main>` landmark — re-admit `main` to the tagName enum or wrap the template, whichever P2-1's outcome makes cleaner. **Orchestrator decides which; do not hand this choice to the agent** | P2-1 |

### ▶ VERIFIED STATUS — 2026-08-22, all nine steps CLOSED

| Step | Verified status | Evidence |
|---|---|---|
| **P2-1** band off the outer + own band selector + `narrow` token | ✅ **DONE** | D706 `2d291992` + `669bc1e5`; `narrow` handled in the resolver |
| **P2-2** `layout` default per G1 | ✅ **DONE 2026-08-22** | `block.json` default `""` → `"flex"` (`fc1148db`). Composite-mirror review closed too: `sgs/form` given its own explicit `"stack"` default (routes through the same generic wrapper mechanism, and fields are unambiguously vertical); `sgs/hero`/`sgs/feature-grid` reviewed and left at `""` on evidence — neither consumes the generic layout class the way `sgs/container` does, so no change was needed. Live-verified on the real shop page: every untouched container resolves `display:flex;flex-direction:row` on the layer it actually applies to (the outer root for band-less containers, `.sgs-container__inner` for banded ones). |
| **P2-3** container root colour + dead `textColor`/`backgroundColor` reads + `attrMap` off `native:*` | ✅ **DONE** | D713; the only remaining grep hit in `render.php` is a COMMENT explaining the removal |
| **P2-4** editor preview parity | ✅ **DONE 2026-08-22** | Content band (`921954fc`, prior session). This session closed the rest: padding/margin, background+text colour/gradient, `bgParallax`, `gridAutoRows` (`f3c78e82`) and the background overlay — colour/gradient/opacity/blend-mode — as a `::after` mirror reusing the shared `sgs_overlay_decls()` PHP primitive's exact condition/precedence rather than a third divergent implementation (`eb5ed4ee`). `check-editor-render-parity.js`'s `sgs/container` netNew count: 23 → 16 (only the deliberately-deferred `bgSvg*` family and grid-item-scoped attrs remain, both named not silently dropped). Live-verified: editor canvas and rendered frontend produce byte-identical overlay paint (opacity 0.5, `mix-blend-mode:multiply`, resolved colour, on both surfaces). |
| **P2-5** responsive grid + `minColumnWidth` | ✅ **DONE 2026-08-22** | `minColumnWidth`/`minColumnWidthUnit` added (`c99042d1`), reusing the existing `sgs_intrinsic_columns_track()` mechanism `sgs/site-footer-row` already used, via a new optional `$basis` parameter (backward-compatible — the only other caller is unaffected). Real bug caught and fixed during the build: the new control lived in `LayoutPanel.js`, shared by ~30 blocks, and rendered unconditionally — `check-undeclared-attrs.py` correctly flagged `sgs/cta-section`/`sgs/gallery`/`sgs/trust-bar` writing an attribute their own schema never declares. Gated behind a new `enableIntrinsicColumns` opt-in prop (same shape as the existing `showLayout` prop); only `sgs/container` passes it. Live-verified in the actual lifted CSS file: `grid-template-columns:repeat(auto-fit,minmax(min(100%,max(300px,...` — the client-set 300px value flowing correctly end-to-end. |
| **P2-6** ~280 American→British authorings | ✅ **DONE** | Last renameable one closed `7636397d`. ⚠ 12 American spellings REMAIN and are CORRECT — they sit on CORE blocks. Only `wp:sgs/*` authorings are renameable; counted by parsing each block comment and keying on its block name, never by grepping the word |
| **P2-7** `/sgs-update` reseed | ✅ **DONE 2026-08-22** | Full 9-stage `sgs-update-v2.py` run (`eda8f23b`/`8cd511b1`), preceded by `extract-signatures.py` per the reseed protocol. `sgs/container: 93 attributes loaded` confirms P2-5's new attrs landed in `sgs-framework.db`. Both closing gates (`check-element-manifest-conformance.js`, `db-consistency/run.py`) clean, 0 net-new. `extract-signatures.py`'s documented `columns`/`css_tier` non-determinism (3 rows) hit again and was reverted before committing, same workaround as before. |
| **P2-9** `<main>` landmark | ✅ **DONE** | D710, singleton guard |

**Also closed outside this table:** the container width model (D725/D726 — core's duplicate
constrained layout deleted, one cap per page) and the editor content band. **Found, not fixed:**
`check-dead-pattern-attrs` flags `style.spacing` on `single.html:7/11/27` — `sgs/container`
dropped `supports.spacing` at D707 when padding/margin became block-owned, so those authorings
use an undeclared native family. Advisory (exit 0), still working via the wrapper's legacy
fallback, but it is a D707 residual across the theme.

**QC GATE 3 — ✅ CLOSED 2026-08-22.** Container behaviour verified live on sandybrown via a
throwaway probe page (created, tested, permanently deleted): background paints edge-to-edge
with no `align:"full"` needed; every newly-wired inspector control moves the canvas
(`getComputedStyle` read on the actual canvas element, per R-31-11); overlay opacity/blend-mode/
colour confirmed byte-identical between editor and frontend. Wrapper-mirroring composites
(hero, cta-section, card-grid) unaffected — no shared-file collision, confirmed via `git status`
before each commit.

**QC GATE 4 — ✅ CLOSED 2026-08-22.** `minColumnWidth` confirmed effective in the real lifted
CSS file (`grid-template-columns:repeat(auto-fit,minmax(min(100%,max(300px,...`); patterns still
paint (spot-checked the live `/shop/` page, 10 products rendering, zero console errors, zero
invalid-block placeholders); `<main>` present once (unaffected by this track); build green with
all gates through the full reseed; Bean's eye — not yet exercised on this specific grid-floor
change (no client has authored a `minColumnWidth` value yet since it's brand new), flagged as a
natural next check whenever a real client build reaches for it.

---

# PHASE 3 — every theme template, one at a time

**Bean, 2026-08-21:** *"lets add a P3 to this track's plan for the individual theme template
pages having a point each for working on them 1 by 1 ... considering this whole plan is based on
the product archive template it is consistent with our work."* Correct on both counts, and it was
never recorded — this plan and the LEDGER had zero mention of a per-template pass.

**Why a phase and not a chore.** Everything Phases 1-2 fixed was found THROUGH one template.
Three stacked width caps, seven invalid WooCommerce blocks, four dead template-part slots, a
colour attribute WordPress was discarding, hero's base padding vanishing on save — none of that
came from auditing blocks in the abstract. It came from opening `archive-product` and measuring
it. The other eight templates have not had that treatment.

## The per-template checklist — the same seven things, every time

Derived from what actually found defects on `archive-product`, `front-page`, `page` and `single`.
Not invented: each line is a check that caught something real on 2026-08-21.

1. **Editor validity.** Open the template in the Site Editor and run
   `wp.blocks.validateBlock()` over the tree. Target 0 invalid. ⚠ Server-side checks CANNOT see
   this — validation runs in JavaScript, which is why every PHP/WP-CLI probe came back clean while
   the editor showed three errors (D719).
2. **Width model.** One cap per page. `<main>` and other STRUCTURE say `contentWidth:"full"` and
   pass width through; sections cap their own content. No `layout:{"type":"constrained"}`
   anywhere (D725).
3. **Spacing declarations.** `migrate-theme-native-spacing.py --check` clean — no authoring on a
   native family its block no longer declares.
4. **Core blocks.** `check-no-core-blocks.py` clean. Then list the core blocks with NO SGS
   equivalent as gap candidates — they are NOT violations. ⚠ Do not confuse the two: `sgs/sidebar`
   was nearly deleted on a false "uses banned blocks" claim; `core/archives` and `core/categories`
   are not on the replacement map at all.
5. **Live measurement at 375 / 768 / 1440.** Background paints edge-to-edge, content caps, no
   text flush at the edge that should not be, no double indent. Computed styles, not screenshots.
6. **Landmarks + a11y.** Exactly one `<main>`; `nav`/`aside` labelled; heading order sane.
7. **Client-editability.** Every visible setting reachable in the editor, and the canvas actually
   moves when it changes. This is the one that keeps failing quietly — the content band was
   styled in `editor.css` but never rendered by `edit.js` for months.

**Done-when, per template:** all seven pass, measured live, with the evidence in the commit
message. Not "the markup looks right".

## ▶ PHASE 3 STATUS — WAVE A CLOSED 2026-08-23, WAVE C NOT STARTED

**Wave A (static audit across all 10 surfaces): COMPLETE.** 10 parallel agents, one per
surface. Zero FAILs; `archive-product.html` confirmed as the reference. Register:
`.claude/reports/2026-08-22-phase3-template-audit-register.md`.

Both global gates were run ONCE and attributed rather than per-agent — both scripts are
whole-repo and take no file argument, so a per-surface run returns the same result ten
times and attributes nothing. `migrate-theme-native-spacing.py --check` PASS;
`check-no-core-blocks.py` clean across 58 files. Every `core/*` block in the templates is
genuinely unmapped in `block-replacements.json` — gap candidates, never violations.

### Shipped during Wave A

| Commit | What |
|---|---|
| `84f76200` | The audit register itself |
| `2d98570e` | `supports.align` removed from `sgs/container` + 38 authorings stripped + Spec 31 L1 amended |
| `d6dd7817` | `/sgs-update` reseed — the stale `block_supports` align row pruned |
| `4b9d3abe` | extract-signatures `css_tier` determinism + Stage 2 SSL unblocked |
| `75ddd7fb` | `single-product.html` `<main>` width stated explicitly (was double-capping) |
| `c6e6d61a` | ~~All nine `<main>` set `layout:"stack"`~~ — **SUPERSEDED same day by `eceafdc2`** |
| `6d4a1637` | ~~`<main>` column fallback~~ **SUPERSEDED by `eceafdc2`** · align tests repaired · 4 product-card overrides |
| `e7f16ceb` | `404.html` made the living canary for the `<main>` flow behaviour |
| `eceafdc2` | ⭐ **`<main>` is not a flex container** — suppress the outer flex, let block flow stack; explicit `layout:"stack"` removed from the eight |
| `a85a87d2` | Don't tag a flow-mode `<main>` with the `--flex` marker class |
| `3247d281` | Cold prompt for the design benchmark (the second axis, never run) |

**The align finding is the headline.** The whole mechanism was measured inert: stripping
`.alignfull` from a real element in a real `.wp-block-post-content` context changed
nothing — left, width and all four margins identical, and an A/B against an unaligned
sibling was byte-identical. Core's breakout rule resolves
`calc(var(--wp--style--root--padding-left) * -1)` against a variable that is EMPTY at
`:root`. No SGS-BEM draft can express alignwide/alignfull — there is no such CSS property
— so emitting it failed the R-1 honest-mapping test. Full-bleed comes from `maxWidth`
defaulting to `{}`. Canary DB held **0** align authorings, so nothing stored depended on it.

### The SECOND axis — design — RAN 2026-08-23. Register: `reports/2026-08-23-template-design-benchmark.md`

Phase 3 has two axes: **is it CORRECT** (the 7-point checklist — Wave A closed it statically,
Wave C owes the live half) and **is it WELL DESIGNED**. The design axis has now RUN, from the
cold prompt at `.claude/prompts/2026-08-23-phase3-design-benchmark.md` (`3247d281`).

**Output: `.claude/reports/2026-08-23-template-design-benchmark.md`. Register only — zero
template edits, as the prompt required.** All ten surfaces graded against named, live-verified
references (END./Gymshark/Uniqlo/IKEA/Rapha, Nike/B&O, Cloudflare Blog/A List Apart/NN/g,
GOV.UK/Slack/Kualo/Vercel) plus Baymard and NN/g research. Every finding carries its owning
layer — `TEMPLATE` / `PATTERN` / `BLOCK CAPABILITY` / `CONTENT` / `SETTINGS`. `page.html` and
`front-page.html` were held as shells and their findings routed to the pattern/settings layer,
per Bean's constraint.

**Grades:** `single-product` B · `search` C+ · `404` C+ · `single` C · `index` C (source-only) ·
`archive` C− · `archive-product` D+ · `page` + `front-page` correct as shells.

**Five cross-surface findings account for most of the distance to top-tier:**

1. **X-1 — every heading on the site fails WCAG AA**, measured 2.25:1 against a 3:1 floor
   (brand pink `#E68A95` on cream `#FBF3DC`), on all four heading levels on every surface.
   Body text and buttons pass. `SETTINGS` (client palette). This caps every grade above.
2. **X-2 — the 404 ships 89.7 KB gz of JS across 22 files, including jQuery (30.2 KB gz)**,
   against the framework's own "no jQuery" rule and a <50 KB budget. Cause proven, not
   inferred: WooCommerce enqueues its jQuery frontend bundle sitewide; no SGS frontend code
   declares jQuery. **The dequeue mechanism already exists** —
   `configurator-asset-optimiser.php` removes exactly this stack, is already defensive and
   filterable, and is merely gated to bound-configurator pages. Widening that one predicate
   drops the non-commerce surfaces from ~90 KB to ~42 KB. Highest impact-per-effort in the
   register. CSS is inside budget everywhere (13.7–15.8 KB gz).
3. **X-3 — the type scale has no step above `hero` (50px)**, so no page can carry display
   typography. One `theme.json` token unlocks the 404 and any future hero pattern.
4. **X-4 — `.has-shadow-sm` is authored in `archive.html` and matches 0 CSS rules anywhere.**
   Dead hook; the card elevation has never rendered.
5. **X-5 — the post card's `surface` background is the identical colour to the page.** With
   X-4 that leaves the card with no fill, border or elevation difference at all.

**Two structural defects found on `archive-product.html`, the surface Wave A confirmed as the
correctness reference:**

- **S1-1 — the desktop filter rail does not exist.** `woocommerce.css` declares
  `.sgs-shop-layout{display:grid;grid-template-columns:260px 1fr}`; the element computes
  `display:flex`, because `sgs/container`'s per-instance Spec-32 rule matches at equal
  specificity and later source order. Both children measure 1247px at the same x — the filters
  are a full-width panel stacked above the grid.
- **S1-2 — the filters render no selectable options.** Four independent lines: groups render
  109px/61px while holding 63/23 chips; `textContent` 1,448/473 chars with `innerText` empty;
  the screenshot shows blank space under Flavour/Size/Rating; the "Rating" heading has no
  filter block in the DOM at all. **Root cause deliberately NOT diagnosed** — needs its own
  `/systematic-debugging` pass.

**Also recorded honestly rather than glossed:** `index.html` graded from source only (genuinely
unreachable); `single.html`'s comment thread unassessed (0 approved comments); one archive-card
finding (S3-9) logged as **suspected-unverified** because the probe that would have settled it
produced a 0×0 box and proved nothing — its reproduction step is written down.

**8 block candidates raised** (elevation control on `sgs/container`, suggested-searches block,
rating on `sgs/product-card`, total-cost in `sgs/buybox`, search-term highlighting, reading
time, result count, and a contrast gate over `theme-snapshot.json`).

### STILL OPEN — the work Wave C owes

1. **Checks 5 and 7 live, per surface** — computed styles at 375/768/1440 and the
   canvas-moves test. This is the bulk of Phase 3 and none of it has run.
2. **U-1 — `main` is not selectable in the editor.** `container/block.json`'s `tagName`
   enum has 9 values including `main`; `edit.js` `TAG_NAME_OPTIONS` lists 8. The comment
   above that array states the invariant it breaks. One line, not yet done.
3. **U-3 — heading skip.** `archive.html:21` and `search.html:16` set `post-title`
   `level:3` under an unset `query-title` (h1). `index.html` omits the level and is
   correct. Two one-line changes, not yet done.
4. **U-4 — redundant nested `contentWidth`** in five files. Cosmetic.
5. ~~The `<main>` column fallback is NOT live-verified.~~ **RESOLVED 2026-08-23, and the
   fix was the wrong shape — Bean caught it.** Measuring it showed `<main>` on `404.html`
   was already `display:block` and stacking fine with zero flex, because that template has
   a content band and `$grid_on_inner` routes the flex onto the `__inner`. `single-product`
   had `contentWidth:"full"` → no band → no inner → the flex landed on `<main>` as a ROW.
   So whether the page's main region became a flex container was decided purely by whether
   it happened to carry a band. Forcing `column` papered over that; the right answer is
   that a `<main>` is not a flex container at all — normal block flow already stacks.
   Now suppressed at the outer box (`eceafdc2`), explicit `layout:"stack"` removed from the
   eight templates so one owner remains, and `404.html` keeps no key at all as the living
   canary. **Verified live:** the product page's three sections went 634/1328/1328px in a
   row → 1732px each, stacked, backgrounds spanning.

### Content constraints found on the canary — read before planning Wave C

- **9 posts, 135 pages, 5 products, 1 category, and ZERO approved comments.** `single.html`
  has 14 comment-related blocks that cannot be demonstrated without seeding one.
- **`index.html` is genuinely unreachable** — `show_on_front=posts` with `page_for_posts=0`,
  so `front-page.html` intercepts. That is the healthy state for a fallback template, not a
  defect, but it means check 5 cannot be run against it.
- **`front-page.html` renders ~104 chars and ZERO `<h1>`.** The template being a thin shell
  is CORRECT for a block theme; the mismatch is that the site is set to show latest posts
  while the template contains `post-content`, which renders one page's content. That is a
  Settings → Reading decision, not a template defect.

## The templates, ordered

| # | Template | Size | Containers | Known state |
|---|---|---|---|---|
| **P3-1** | `archive-product.html` | 10.0 KB | 7 (+17 WC blocks) | ⭐ **THE REFERENCE.** Phases 1-2 lived here. Editor-valid, width model correct, spacing migrated. Re-run the checklist to CONFIRM it as the standard the rest are measured against |
| **P3-2** | `single.html` | 2.9 KB | 7 | Biggest core-block cluster (14 comment blocks + `spacer`), none with an SGS equivalent. `<main>` is a deliberate 800px prose band. **Check 1 PASSES as of 2026-08-22** (`754475a4`) |
| **P3-3** | `single-product.html` | 2.6 KB | 6 (+5 WC) | PDP; buybox owns its own gallery column. **No longer untouched** — `754475a4` removed the `woocommerce/single-product` wrapper and 4 inside-block comments. **Check 1 PASSES as of 2026-08-22** |
| **P3-4** | `archive.html` | 2.5 KB | 5 | `post-excerpt` / `query-no-results` / `term-description`, no SGS equivalents |
| **P3-5** | `search.html` | 2.7 KB | 5 | Same three, plus `core/search` |
| **P3-6** | `page.html` | 1.9 KB | 2 | Width model done 2026-08-21; `post-title` wrapped. Needs checks 1, 5, 6, 7 |
| **P3-7** | `front-page.html` | 1.6 KB | 1 | Width model done. ⚠ Renders ~104 chars — an EMPTY page cannot demonstrate correct capping, so measure it against real content or say so |
| **P3-8** | `index.html` | 1.1 KB | 1 | Blog index |
| **P3-9** | `404.html` | 1.3 KB | 1 | Smallest; `core/search` |
| **P3-10** | Parts: `sgs-pdp-content`, `sgs-pdp-buybox`, `sgs-archive-toolbar` | — | 3 / 0 / 0 | `header`/`footer` are one-line pattern shims and need nothing. **`sgs-pdp-content` + `sgs-pdp-buybox` touched by `754475a4`; check 1 PASSES for all three as of 2026-08-22** |

**Check 1 (editor validity) is now GREEN across every template and part — 2026-08-22, from
the nav-drawer/editor-errors track (D743), not from this one.** Six blocks were invalid and
none of them were a width or container defect: raw developer comments sitting inside
`sgs/container` and `sgs/tab` inner-content regions. Both blocks have `render.php` AND a
non-null `save()` returning `<InnerBlocks.Content />`, so WP still validates them — *dynamic
is not the same as unvalidated*, which is the same class of trap as D719's "PHP probes came
back clean while the editor showed three errors". Measured post-deploy with
`wp.blocks.parse` over `/wp/v2/templates` + `/wp/v2/template-parts`: **0 invalid across all
20 surfaces**, with a negative control confirming the detector still fires.

This does NOT close P3 for any template — checks 2-7 (width model, spacing, core-block gap
list, live measurement at 375/768/1440, landmarks, client-editability) are untouched by that
work and still owed per template.


Ordered by how much is already known, not by size — `archive-product` first because confirming
the reference makes every later comparison cheap.

## Standing constraints

- **One template per commit**, with its measurements in the message. They are independent, so a
  regression is attributable.
- **Deploy is theme-only** — no block rebuild, so these never collide with a parallel block track.
- **Do NOT batch the checklist across templates.** Every defect this plan found was specific to
  the page it was on; a sweep would have found none of them.

## Key Judgement Calls

- **G1 — `flexDirection` default.** Options: `flex`+`column` / `flex`+row / keep `stack`.
  **Recommend `flex`+`column`.** Row inverts every container's layout on every client site.
  **Bean decides.**
- **G2 — container colour routing.** Options: `SGS_Container_Wrapper` / block-private.
  **Recommend the wrapper** — container IS the canonical wrapper; block-private forks the
  mechanism permanently. **Bean decides (Rule 7).**
- **Scope of the `container/style.css:63` rewrite.** This plan ships only the `<dialog>`
  route-around. The rule rewrite needs an offsetParent census across 43 files plus a negative
  control — **its own phase.** Bean already leaned "both, sequenced"; this is the sequencing.

## Pre-emptive Decisions (Hidden Decisions pass — both reviewers)

- **Advisory finding-kind for P1-2** — must be a NEW third kind exiting 0, not `undeclared`.
  Pre-answered in the prompt. *(both reviewers)*
- **Which WC filter blocks are self-closing** — exactly 7, named with line numbers.
  *(reviewer B)*
- **Chip `nowrap` is deliberate** — change dropped. *(reviewer B)*
- **Deploys are orchestrator-owned** — no implementation step deploys or builds. *(both)*
- **P2-9's landmark route is an orchestrator decision**, not a haiku agent's. *(reviewer A)*
- **Branch discipline** — `main` for framework; `sites/indus-foods/` portion of P2-6 on its own
  branch; verify branch in the same command as every commit. *(reviewer B)*

---

# G1 + G2 CLOSED — Bean's rulings, 2026-08-20

## G2 — container root colour routing: **SGS_Container_Wrapper** ✅ DECIDED

Bean chose the shared wrapper. Container IS the canonical wrapper; a block-private path would
fork the colour mechanism permanently, which the composite-mirror rule exists to prevent.
Rule 7 gate is hereby SATISFIED for P2-3.

## G1 — flex direction default: **`row`** ✅ DECIDED (Bean overruled the recommendation)

Bean's ruling, verbatim intent: *leave the default direction as the CSS default, which is
`row`, and allow this setting to be changed based on what a person wants.*

**This overrules the earlier `column` recommendation.** Do not re-litigate in implementation.
A design council was commissioned to stress-test it — findings appended below when they land;
they inform mitigation, they do not reopen the decision.

### Measured blast radius (nesting-aware parse of the real repo, supersedes an earlier crude grep)

| Figure | Value |
|---|---|
| `sgs/container` instances in `theme/sgs-theme/{patterns,templates,parts}` | **138** |
| ...inheriting the layout default (no explicit `layout` key) | **113** |
| ...of those, 0 or 1 direct child → direction visually irrelevant | **37** |
| ...of those, **2+ direct children → would visibly flip to side-by-side** | **76** |
| breakdown of the 76 | 35×2 children · 17×3 · 11×4 · 13×5+ |
| client-site containers in `sites/` | **additional, uncounted** |
| containers stored in the WP database (live/edited pages) | **not measurable from the repo** |

⚠ An earlier figure of "276 authorings / 251 inheriting" was a crude grep that double-counted
closing tags. **138 / 113 is the accurate, nesting-aware count.** Use these numbers.

**Mechanism (the load-bearing fact):** WordPress only writes an attribute into block markup
when it differs from the default. An unset `layout` means no `layout` key exists, so
block.json's default applies at render — every time. A default change is therefore
**retroactive across every instance that never set it**, including content in the database
that no repo grep can see.

### Implementation consequence

`layout` default → `"flex"`; `flexDirection` default stays `""` (→ CSS `row`).
**76 known theme sections will need a visual triage pass**, plus an unknown number on client
sites and in the DB. That triage is a required, scheduled step — not a "watch and see".

## Settled flex decisions (full set)

| Item | Decision |
|---|---|
| `layout` default | **`flex`** |
| `flexDirection` default | **`row`** (CSS default) — Bean, overruling `column` |
| `flex-wrap` | **unchanged** — keep SGS's forced `wrap` override |
| `align-content` in flex mode | **ADD** — currently grid-only (control gated at `LayoutPanel.js:207`, emission in the grid branch only). Per the CSS-Tricks guide it is valid on multi-line flex containers, and since SGS forces `wrap` every flex container IS multi-line. Real missing capability. |
| child `flex` grow/shrink/basis controls | **DROPPED** — Bean correctly identified this as duplicating the existing `columns` (`{desktop:2,tablet:2,mobile:1}`) and `gridTemplateColumns` attributes. Division of labour: **grid** = explicit tracks/controlled widths; **flex** = items size to content and wrap. |
| margin-collapsing | flex does not collapse margins; expect small vertical shifts. Folded into the same triage pass. |

**Parked (not building):** one child absorbing leftover space while siblings stay
content-sized (e.g. fixed logo + filling nav). Genuinely not expressible via `columns`, but
niche — revisit only if a real build needs it.

## G1 design council — 3 seats, findings

Commissioned because Bean overruled the `column` recommendation. **Outcome: Bean's `row`
choice is CORRECT, confirmed on two independent grounds neither the recommendation nor the
column seat had identified.**

### Vindication 1 — `stack` is ALREADY flex-column (verified live)

`plugins/sgs-blocks/src/blocks/container/style.css:75-78`:
```css
.sgs-container--stack { display: flex; flex-direction: column; }
```
Class emitted as `sgs-container--{layout}` (`class-sgs-container-wrapper.php:1104`).

**So `flex` defaulting to `column` would render IDENTICALLY to `stack`** — two names, one
behaviour, unreadable authoring intent. Bean's vocabulary is the coherent one:
`stack` = column · `flex` = row · `grid` = tracks. Orthogonal and self-documenting.

⚠ **CORRECTION TO THIS DOC'S OWN EARLIER CLAIM:** it stated (repeatedly, from an agent report)
that `stack` = "plain block flow, no display emitted". **That is FALSE.** `stack` has always
been flex-column via the class. That error is precisely what made `column` look sensible.

### Vindication 2 — `row` is LESS retroactive than `column`, not more

`class-sgs-container-wrapper.php:1003-1015` emits `display:flex` + `flex-wrap:wrap`
unconditionally, but `flex-direction` **only when `'' !== $flex_direction`**.

- **`row`** → leave `flexDirection` default at `""`. **ONE** retroactive change (`layout`).
- **`column`** → requires a **SECOND** retroactive change (`flexDirection` `""` → `"column"`),
  which additionally flips **every existing explicit `layout:flex` container that never set a
  direction — 7 of 9 in the theme** — plus every converter-emitted one. `row` leaves those
  entirely alone.

Column was the *more* dangerous option. Both the recommendation and the column seat had this
backwards.

### The real risk is NOT the repo — it is the database

| Surface | Count | In repo? |
|---|---|---|
| `theme/sgs-theme/` container instances | 138 (22 with explicit `layout`) | yes |
| `sites/` client instances | **2** — negligible | yes |
| **Canary DB posts containing `wp:sgs/container`** | **32 of 171 posts** | **NO** |
| Canary DB posts containing `sgs/hero` / `sgs/feature-grid` | **37** | **NO** |

One canary alone carries DB-resident authorings comparable to the entire theme count. Every
client site multiplies it. Per-instance counts could not be extracted cleanly (Hostinger's
`wp db query` swallowed the aggregate) — **deliberately not estimated.**

### The composite-mirror rule widens the blast radius

Also declare `"layout": {"default": ""}` and are therefore pulled in by R-31-9:
**`sgs/hero`, `sgs/feature-grid`, `sgs/form`**.
Immune (non-empty defaults): `trust-bar` (`grid`), `site-header-row` (`flex`),
`site-footer-row` (`grid`), `testimonial-slider` (`full`).

### ⚠ This is NOT a one-time migration — the converter makes it permanent

`plugins/sgs-blocks/scripts/orchestrator/converter/services/arrangement.py:82-91` returns `{}`
for any node that is not an arrangement layer. **Every future clone of a plain block-flow draft
section emits no `layout` attribute and silently inherits the new default.** This is a
permanent behaviour change in the core cloning product, not a migration with an end date.

### THIRD OPTION the framing excluded — "bump the attribute, not the default"

Keep `layout` default `""`; have the **editor insert `"layout":"flex"` explicitly on
newly-inserted containers**. New authorings get flex; every stored instance (repo AND
database) keeps its current rendering; the converter path is untouched. **Achieves the stated
goal with zero retroactivity.**
→ **NEEDS BEAN'S RULING — his `row` decision answered direction, not whether to change the
default at all.**

Other options assessed and rejected on evidence: `containerKind`-aware default (container
itself has no kind, so the discriminator never reaches the 138); per-client
`theme-snapshot.json` opt-in (violates R-31-3/R-31-9, two behaviours forever).

### Required before shipping ANY default change

1. **DB census across every live install**, not just the canary — total and
   default-inheriting counts. Ship nothing until that number exists.
2. `arrangement.py` explicitly emits `layout` for non-arrangement nodes, or the default change
   is refused.
3. Before/after `computed-parity.json` at 375 / 768 / 1440.
4. **Rollback trigger:** any container whose children's `getBoundingClientRect().top` values
   become equal where they previously differed. One instance = revert.

---

# FINAL RULINGS — Bean, 2026-08-20 (supersede everything above where they conflict)

## R-1. Flex default: `row`, via a BLANK wrapper — CLOSED, do not reopen

`layout` default → `flex`. `flexDirection` stays **blank in the wrapper**, which resolves to
CSS `row`. Bean's three arguments — the third is the one that actually settles it and none of
the council seats raised it:

1. **Core parity.** `core/group` with a flex layout defaults to row. Matching it means one
   less framework-specific rule to carry.
2. **Per-block defaults are allowed.** Sharing the wrapper does NOT mean sharing defaults. Each
   `block.json` owns its own default even when the render mechanism is shared. So the wrapper
   staying neutral costs nothing.
3. **⭐ The cloning pipeline — the decisive argument.** If SGS defaults match CSS defaults, the
   converter's mapping is honest in both directions: a draft silent on direction → a container
   silent on direction → row, matching. A draft that stacks must *say* `flex-direction: column`,
   because column is not the language default either. Deviating from CSS would put a permanent
   translation error between every draft and its clone.

### The architecture that follows (this resolves the council's "third option" better than it did)

> **The shared wrapper imposes nothing. Individual blocks declare their own defaults in their
> own `block.json` where their semantics require it.**

- `sgs/container` (the generic primitive) → `layout: flex`, `flexDirection` blank → row.
- Composites and container-equivalents whose semantics are vertical (hero, cta-section, and
  any other section-shaped block) → **explicitly declare their own appropriate default in their
  own block.json.**
- ⚠ Implementation note: `sgs/hero`, `sgs/feature-grid` and `sgs/form` currently declare
  `"layout": {"default": ""}`, identical to the container, so they inherit the same behaviour
  today. Under this ruling each is reviewed and given its own explicit default if its semantics
  call for one. That is the per-block customisation Bean is describing — not a wrapper change.
- The council's "editor writes `layout:flex` explicitly on insert" option is **superseded**.

## R-2. Verification scope: CUT the ceremony — Bean's explicit instruction

> *"we're not even live yet and are still developing now, lets not waste time on your strict
> before and after check conditions, rollback triggers etc — we have nothing to preserve but we
> have everything to lose if we waste too much time because I'm not earning anything before we
> get this done"*

**DROPPED from the plan** (all were seat-3 requirements written for a production posture that
does not exist):
- DB census across every live install before shipping a default change
- Formal before/after `computed-parity.json` capture at 3 widths as a gate
- Named rollback triggers (`getBoundingClientRect().top` equality tests, one-instance-revert)
- Treating the 76 multi-child containers as a blocking triage queue

**KEPT — the cheap checks that SAVE time by catching mistakes before they compound:**
- `npm run build` green (it is one command and it gates ~50 real checks)
- "Did the thing actually work?" — a single live look at the canary after a deploy
- The closed-drawer tabbable-count assertion (one line, catches a real WCAG regression)
- Deploy via `build-deploy.py` only, never `--allow-dirty`/`--skip-verify` (this is not
  ceremony — it is the guard that stopped a 2.5h outage, D336)

**The distinction being applied:** ceremony that protects production data → dropped, there is
no production. Cheap checks that catch a mistake in 30 seconds instead of 3 hours → kept,
because those *buy* time rather than cost it.

## R-3. Batch enforcement-script fix — NEW WORKSTREAM

Bean: fix the whole class in one batch rather than one script at a time. Two systemic flaws
plus a coverage question:

- **FLAW A** — scripts that are advisory-by-accident or never wired, especially those in
  `prebuild` / `/sgs-update` / deploy. (Deliberately-advisory-with-a-promotion-path is fine and
  must be distinguished from advisory-by-accident.)
- **FLAW B** — scripts blind to attributes/controls arriving from a shared extension or helper
  file, the way `check-editor-render-parity.js` CHECK A cannot see `sgs/container`'s controls
  because they live in `components/`.
- **Coverage** — make editor and live sides both consistent with the block's declared settings.

Audit dispatched; register lands as its own Phase 1 workstream. Expected to share a root cause
across several scripts (each hand-rolling its own "find this block's controls" logic), in which
case the fix is one shared resolver, not N patches.

---

# R-3 BATCH ENFORCEMENT-SCRIPT FIX — the register

~60 gates audited. Wiring is mostly good; the two flaws are **narrower than feared but real**.

## ⭐ The headline: the fix for FLAW B already exists in-tree

`plugins/sgs-blocks/scripts/inspector-scan/core/components.js` → **`resolveComponentFiles()`**
(`:199`, exported `:259`) is already a shared name→file resolver covering `src/components/`,
`src/blocks/*/components/` and `src/blocks/extensions/` (`:186-196`).

**Only 4 call sites use it** — `check-simple-surface-cap.js:142`, `inspector-scan/rules/21:68`,
`rules/27:52`, `core/golden.js:28`.

**Every FLAW-B-blind script is a missing ADOPTER, not a missing mechanism.** This is one shared
fix, not N patches — exactly the outcome hoped for.

*Probe used throughout:* `contentWidth` — 0 hits in `container/edit.js`; defined in
`container/components/WidthPanel.js` + `ContainerWrapperControls.js`; declared
`container/block.json:481`; consumed `class-sgs-container-wrapper.php:188,228`.

## R3-a — Adopt the existing resolver (root cause; 5 scripts, one fix)
*Mechanical + light judgement. Low risk.*

| Script | What to replace |
|---|---|
| `check-editor-render-parity.js` | the `edit.js`-only corpus at `:74-76` |
| `check-dead-controls.js` | CHECK 4/5 corpus `:59`, `:1365`; hardcoded `ContainerWrapperControls.js` literal at `:108` |
| `check-duplicate-controls.js` | block-own-`components/` only, `:232-234` |
| `check-inert-controls.py` | hardcoded literal `:73` — needs a Python equivalent or a JSON dump from the JS resolver |
| `check-undeclared-attrs.py` | `edit.js`-only `:336-355` |

⚠ **Finding counts WILL jump.** Land each behind its existing baseline, then trim (R3-d).
Two hardcoded `ContainerWrapperControls.js` literals become resolver lookups and stop missing
`WidthPanel.js` entirely.

## R3-b — Wire the genuinely-unwired detectors
*Mechanical. May fail the build on day one → land with a recorded baseline.*

Add to `prebuild`: `check:inert-controls`, `check:undeclared-attrs`, `check:device-toggle:gate`.
⚠ `check-unresolvable-token-refs.py` needs its hardcoded `return 0` at `:355` replaced with a
real exit path **first** — as written it cannot fail even if wired.

## R3-c — Promote or delete the ACCIDENTAL advisories (not the deliberate ones)

**Fix:**
- `check-editor-render-parity.js:3489-3490` — `CHECK_A_BLOCKS_BUILD` / `CHECK_B_BLOCKS_BUILD`
  both `false`; flip **after** R3-a re-baselines. Copy `check-dead-controls.js:1823-1834`'s
  Test F, which already proves a flip works both ways.
- `check-dead-controls.js:1420,1427` — give each a dated trigger or flip.
- `prestart`'s `(python scripts/check-dead-api-calls.py --check || echo [ADVISORY]…)` — drop the
  `|| echo`. `prebuild` already hard-gates the same script, so the two chains disagree.

**⛔ LEAVE ALONE — deliberately advisory with a documented promotion path:**
`check-dead-pattern-attrs.py:303-318` (named trigger) · `check-wrapper-capability-preconditions.js`
severity tiers · `wp-pre-merge-gate --soft` · every skip-classifier
(`check-editor-only.py`, `check-editor-canvas-css.py`, `check-markup-neutral.py`, …) — those
authorise a visual-diff skip and are not detectors at all.

## R3-d — Stale baselines hiding real regressions

| Baseline | Entries | Last touched | Concern |
|---|---|---|---|
| `dead-controls-baseline.json` | 387 | **2026-06-12** | 10 weeks stale, across an entire no-inline programme. **Highest risk.** |
| `editor-render-parity-baseline.json` | 783 | 2026-08-19 | current — **but the gate that reads it cannot fail, so all 783 are inert** |
| `consistency/box-flat-baseline.json` | 627 | 2026-08-03 | largest in the tree |
| `shared-css-state-rules-baseline.json` | 491 | 2026-07-26 | large + stale |
| `oldshape-audit-baseline.json` | 469 | 2026-08-19 | current, never trimmed toward 0 |
| `lints/lint-theme-css-hardcodes-baseline.json` | 132 | 2026-07-17 | stale |

Only `check-element-manifest-conformance.js:796-798` carries a "never raise it silently"
convention. Copying that one comment line to the six above is the whole fix — one line each,
not a process.

## R3-e — The biggest hole: nothing checks block.json → render.php

| Edge | Covered? |
|---|---|
| block.json declares → editor has a control | covered, **but the gating half is `edit.js`-blind**; the shared-aware half (`survey-control-gaps.py`) is unwired |
| editor control → **editor canvas reflects it** | `check-editor-render-parity.js` CHECK A only — advisory + `edit.js`-only ⇒ **effectively uncovered** |
| **block.json declares → `render.php` consumes it** | **LARGELY UNCOVERED — the biggest hole.** No gate asserts a declared attr is read by `render.php` *or* the wrapper. This is the edge that would have caught the `contentWidth` class of defect. |
| render.php emits → value valid / reaches DOM | partially covered |

**Build the missing edge as an `inspector-scan` RULE, not as script #61** — it inherits the
resolver and the baseline machinery for free.

## ⛔ Explicitly NOT doing (ceremony that catches nothing — per R-2)
- Promoting the `survey-*` censuses to gates — they are deliberate censuses; gating them fails
  every build
- Wiring the live/DOM audits (`audit-scoped-selector-live.js`, `audit-post-content-blocks.py`)
  into `prebuild` — they need a reachable canary and warn-and-pass when disconnected, which
  proves nothing
- A 4th roster/registry of gates

## R3-f — Stale docstrings (zero risk)
`check-tier-storage-shape.py:55-58` claims it is unwired pending promotion; it **is** in
`prebuild`. `check-simple-surface-cap.js` runs bare (no `--check`) — harmless, inconsistent.

## R3-g — "BUILT AND USEFUL, BUT WIRED TO NOTHING" (Bean's angle, 2026-08-20)

A category distinct from FLAW A. These are not *mis*-configured — they simply never run, so
whatever they detect has never been looked at. Two earlier audits plus this one found **14
scripts with zero `package.json` reference**. Triage into three buckets:

**Bucket 1 — genuinely unwired detectors, likely worth wiring:**
- `surveys/check-control-parity-live.js`
- `surveys/survey-wrapper-capability.js`
- `check-device-toggle.js` (has both `:gate` and `:selftest` aliases and still runs nowhere)
- `check-unresolvable-token-refs.py` ⚠ needs its hardcoded `return 0` (`:355`) fixed first, or
  wiring it achieves nothing

**Bucket 2 — ⭐ the one that matters most: `surveys/survey-control-gaps.py`.**
It is **shared-component-aware already** (explicit globs at `:178-184`) — i.e. it is the
*non-blind* half of the exact edge that `check-dead-controls.js` covers blindly. It has been
sitting unwired while the blind gate ran on every build. Wiring this may be cheaper than
fixing the blind one, and should be evaluated first in R3-a.

**Bucket 3 — correctly unwired, leave alone:**
- The six skip-classifiers (`check-editor-only.py`, `check-editor-canvas-css.py`,
  `check-markup-neutral.py`, `check-interaction-only-css.py`,
  `check-blockjson-metadata-only.py`, `check-token-rename-neutral.py`) — invoked by
  `.githooks/sgs-gates.sh`, not build gates
- Live/DOM audits needing a reachable canary (`audit-scoped-selector-live.js`,
  `audit-post-content-blocks.py`, `audit-shrink-to-fit.js`, `placement-reach.py`) — they
  warn-and-pass when disconnected, so gating them proves nothing
- Census-by-design surveys

**First action for this bucket:** run each Bucket-1/2 script once and record what it actually
finds. A detector nobody has ever run may be reporting a real defect class today — or may be
stale and broken. **Cheap to determine, and it decides whether wiring is worth anything.**
