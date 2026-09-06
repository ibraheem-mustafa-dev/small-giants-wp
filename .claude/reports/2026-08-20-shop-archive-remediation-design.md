# Shop archive — full remediation design

**Status:** ⚠ **PARTIALLY IMPLEMENTED — this line was "Nothing implemented yet" and is now stale.**
Phase 1 Wave 1 is SHIPPED, DEPLOYED and LIVE-VERIFIED (2026-08-20); Wave 2 has not started; Phase 2
has not started. **Per-step status lives in the executable plan, not here** —
`.claude/plans/phase-shop-container-remediation.md` § "EXECUTION PROGRESS". Do not track status in
two places; this doc is the evidence + decisions record.

⚠ **Three claims in the body below were REFUTED by implementation and are corrected in the
executable plan's progress section — read it before trusting a §-numbered claim here:** the
`sgs/text` root cause (it is a block-registry `supports.interactivity` check, NOT the namespace
theory), the P1-6 premise (`sgs/testimonial-slider` was already correct; `sgs/site-header-row` is
the wrong template to copy), and the "~60 orphaned colour authorings" figure (the enumerated count
is 42).

Bean ruled on all open questions 2026-08-20 — see the "BEAN'S DECISIONS" section at the end, which
is BINDING and supersedes the council where they conflict.
**Date:** 2026-08-20
**Method:** 4 parallel evidence agents → live measurement/fact-check → 4-seat design council → live fact-check of council claims.

---

## 1. Context

Bean reported ~20 defects on the WooCommerce Shop archive (`/shop/`). Separately, an
unresolved WordPress-core issue was disabling client-side navigation, forcing a full page
reload on every filter interaction and blocking the FR-38-12 Flip feature.

**Both are now root-caused.** Every claim below was verified against the live canary
(`sandybrown-nightingale-600381.hostingersite.com`), not inferred from source.

---

## 2. THE HEADLINE FINDING — `sgs/text` disables client-side navigation

**Bean's hypothesis ("it's our product filter setup / mixed-up architecture") was correct.**

Single-variable test on the REAL template: swapped `sgs/text` → core `wp:paragraph` inside
`woocommerce/product-collection-no-results`. Everything else byte-identical.

| Variant | no-results contents | `clientNavigationDisabled` |
|---|---|---|
| Q | present, with `sgs/text` | `true` |
| R | block removed entirely | ABSENT |
| **U** | **present, `sgs/text` → `wp:paragraph`** | **ABSENT** |

Three consistent data points, one variable. Mechanism: `sgs/text` rendered inside
WooCommerce's no-results slot pollutes query/postdata state → WP marks the enhanced query
"dirty" (`ProductCollection/Controller.php:184` / `wp-includes/blocks/query.php:123`) →
`wp_interactivity_config('core/router', ['clientNavigationDisabled' => true])` → the router
bails to a hard navigation before any fetch.

**Consequences:** fixing this restores instant filtering AND unblocks FR-38-12 Flip (which
needs a DOM mutation to animate — no sorting element required, contrary to the earlier
assumption). It also removes Seat 4's main objection to the drawer pattern (§4.2).

⚠ **Not yet done:** the precise line in `sgs/text`'s render path that dirties the query is
NOT identified. Needed before a fix: diff `sgs/text` render.php against `wp:paragraph` for
global `$post`/`$wp_query` interaction, `setup_postdata`, or a secondary query.
**This is the single highest-value next investigation.**

---

## 3. Root causes — all verified live

| # | Bean's report | Root cause (verified) |
|---|---|---|
| C3 | Search bar too wide | `product-search/style.css` — the `inline` mode has NO max-width; `input{flex:1}`. Sibling modes DO have caps (`min(320px,90vw)`, `min(480px,92vw)`, `min(600px,92vw)`). Pure omission. |
| C4 | No side padding | Template authors only `padding.top/bottom`. Theme's root padding reaches elements via `.has-global-padding`, which `sgs/container` **never emits** (repo-wide: 0 hits). |
| C5 | BG stops short of edges | LIVE: `max-width:1280px` on the element **carrying** the background. Object-shaped `contentWidth:{desktop:"normal"}` bypasses the inner-band emit (`class-sgs-container-wrapper.php:424-425, 836-842, 2689` — `$do_wrap` false, no `.sgs-container__inner`), so the cap lands on the outer element. |
| D1 | Cards cover filters | LIVE: panel renders **413px inside a 260px grid track**. ⚠ Diagnosis contaminated — see §5 note. |
| D2 | Tablet keeps 3 columns | **Zero theme CSS governs product columns.** Comes entirely from WC's legacy `is-flex-container columns-3`. Theme owns ONE breakpoint (781px) which only stacks the sidebar. LIVE: 3×239px at 768px. |
| E1/E2 | Panel looks unstyled | **CSS exists and applies correctly (~330 lines).** LIVE: `--wp--preset--color--surface` = `#fbf3dc` = **identical to body background**. Border uses `surface-alt` (`#fff9f0`) → **1.06:1**. Painted, but invisible. |
| F1 | Black button text | Toggle uses `color: var(--sgs-product-card-btn-text, #3A2E26)` — a product-card token **never defined framework-side** (only `sites/mamas-munches/theme-snapshot.json:641`). |
| G1/G3/G6 | Drawer broken 3 ways | **ONE cause** — see §4.1. |
| G4 | Slider h-scroll | **NOT REPRODUCED** at 390px (`scrollWidth === clientWidth`). Unconfirmed. Do not fix blind. |
| G5 | Apply colours hardcoded | **CORRECTED — see §5.C.** The rule is dead CSS; the real button passes at 8.77:1. |
| — | *(not reported — found by us)* | **26 focusable controls reachable inside the CLOSED drawer.** LIVE: `focusSucceededWhileClosed: true`, `display:block`, no `hidden`/`inert`/`aria-hidden`. WCAG 2.4.3 + 2.4.7 failure. |
| — | *(not reported)* | **No `<main>` landmark.** `archive-product.html:3` requests `tagName:"main"`; enum rejects it (D647) → renders `<section>`. |

---

## 4. The design

### 4.1 The container rule — one fix, three bugs

`plugins/sgs-blocks/src/blocks/container/style.css:63-66`:
```css
.sgs-container > *:not(…)×6 { position: relative; z-index: 1; }
```
Specificity (0,7,0). Beats `.sgs-shop-filters{position:sticky}` (0,1,0) AND
`body.is-enhanced .sgs-shop-filters{position:fixed;z-index:9999}` (0,2,1).
LIVE CONFIRMED: panel computes `position:relative; z-index:1`. `.sgs-shop-layout` gets the
same → **creates a stacking context**, so no descendant z-index can escape it.

This single rule causes **G1** (stays in flow → pushes content down, 768px tall while
"closed"; auto-margin offsets the translate leaving part on screen), **G3** (`inset:0`
ignored on a relative element → never full-width) and **G6** (z-1 panel vs z-9998
body-level backdrop → backdrop paints over the panel; confirmed by hit-test).

**Council split — genuinely unresolved, needs Bean's call (§6 Q1):**

- **Seats 1 + 4 (aligned):** the rule's *shape* is wrong. Its purpose is to lift children
  above `.sgs-container__overlay` — a *conditional* problem solved *unconditionally*. The
  `:not()` list has grown 1→6 in ~10 days (its own comments record it breaking the hero
  overlay and FX decorations); a 7th entry is the per-block carve-out Rule 3 forbids.
  Proposal: delete the blanket rule; use `isolation:isolate` on containers that own an
  overlay + `z-index:-1` on the overlay, scoped via `:has(> .sgs-container__overlay)`.
  Feature-scoped equivalents already exist at `style.css:128, 144-145, 238, 244`.
- **Seat 4's blocking caveat:** the blanket rule currently gives every container child a
  free `position:relative`. **43 CSS files under `blocks/` contain `position:absolute|fixed|sticky`**
  — ✅ **independently re-verified**: 43 when counting all `.css` recursively (including
  component subfolders), 33 for top-level `blocks/*/style.css` only. Seat 4's scope is the
  correct one. Removing the rule re-anchors those elements to the next positioned ancestor.
  This is a WILL-break class; pixel-diff under-reports it (small badge drift inside a large
  section scores under threshold).
- **Seat 2's alternative — sidesteps the fight entirely:** use native
  `<dialog>.showModal()`. Top-layer rendering sits above *every* stacking context, so the
  drawer needs no z-index war and no change to `container/style.css` at all. Also delivers
  focus trap, Escape, focus restoration and `inert` background for free, and fixes the
  26-tabbable bug structurally (a `<dialog>` without `open` is `display:none` by UA
  stylesheet). Requires adding `dialog` to the container `tagName` enum.

**Seat 4's ship condition if the rule IS rewritten** (strongly endorsed): an
**offsetParent census** — Playwright probe enumerating every `position:absolute|fixed`
element across block demo pages, recording `el.offsetParent`'s selector path, before/after.
Any changed offsetParent is a hit regardless of visible pixels. Plus a negative control
proving the census can fail. Its own commit, its own deploy, Bean's visual sign-off.
Existing gates (`audit-inline-styling.js`, `no-inline/check-no-inline.py`) are **structurally
blind** to this class — do not cite a green run as evidence.

### 4.2 Mobile filter pattern

**Recommendation: bottom sheet, one DOM / two presentations** — WooCommerce's own
architecture. One `<aside id="sgs-shop-filters">`; below ~600-782px it presents as a sheet,
above it is neutralised into an ordinary sidebar. No duplicate markup, no JS branch.

This directly answers Bean's stated objection (*"it shouldn't need to be in the page at all
if it's a pop-up"*) — nothing is added to make it a pop-up; it is one in-page element
presented two ways. Bean's real fear (a duplicated filter UI) is architecturally excluded.

Evidence: Baymard (25 rounds testing, 344 sites benchmarked) — *"Trying to squeeze a sidebar
into a mobile viewport doesn't work"*; filters should occupy *"either a full-screen overlay
or a bottom sheet"*; sticky trigger; deliberate Apply.

**Seat 4's objection, and why it no longer holds:** Seat 4 argued Baymard assumes instant
filtering, and with a full page reload per click a drawer's state is destroyed each time —
making Bean's inline accordion evidence-correct. **§2 removes that premise.** Once `sgs/text`
is fixed, filtering is instant and Baymard's assumption holds.

**If Bean still prefers the inline accordion** it is defensible (IKEA ships one) but must be
a proper APG Disclosure with the same `hidden`/`inert` discipline, and deliberate-Apply
regardless.

**A11y contract (APG Dialog Modal):** trigger `aria-expanded` + `aria-controls` +
`aria-haspopup="dialog"`, ≥44px; dialog `aria-labelledby` → the existing visible `<h2>`
(not `aria-label`); focus moves to the heading (`tabindex="-1"`), not the close button;
Escape + backdrop-click + close button all restore focus to trigger; background inert;
scroll lock retained; reduced-motion suppression retained (`woocommerce.css:704`).

**Regression gate (mandatory):** Playwright assertion —
`document.querySelectorAll('#sgs-shop-filters :is(a,button,input,select,textarea,[tabindex]):not([tabindex="-1"])').length === 0` while closed. This bug shipped once; without a gate it returns.

### 4.3 Responsive product grid

Adopt WooCommerce's own construction from `product-template/style.scss`:
```scss
grid-template-columns: repeat(auto-fill, minmax(max($floor, (100% - $gaps)/$N), 1fr));
```
Preserves the author's chosen desktop column count, then auto-drops 5→4→3→2→1 with **zero
media queries**. `auto-fill` **not** `auto-fit` (auto-fit stretches a lone last card to full
width — bad for ragged product rows; MDN + Defensive CSS).

Floor: WC ships 150px; Shopify's house reference is 250px. **Seat 1 recommends 260px** for a
card carrying image + title + price + CTA.

**Placement:** Seat 1 argues this belongs in the `sgs/container` grid primitive (the block
already declares a grid engine, `container/block.json:521`), making it universal rather than
shop-specific. Interim scoping under `.sgs-shop-layout` acceptable only with a named
deletion criterion.

**Container queries: NOT needed.** `minmax()` already resolves against the grid's own content
box, not the viewport — the sidebar problem is solved by the intrinsic grid alone. Reserve
container queries for card-*internal* layout only. (94% support, Baseline Feb 2023; WC
already uses them for carousels in the same file.)

### 4.4 Tokens + colour

**Panel invisibility — derive, don't declare (Seat 3):**
```css
--sgs-elevation-1:    color-mix(in oklab, var(--…--surface) 92%, var(--…--text) 8%);
--sgs-elevation-line: color-mix(in oklab, var(--…--surface) 78%, var(--…--text) 22%);
```
Mixing toward `text` (not black) works automatically for dark palettes and stays in the
brand's temperature. Pair with a non-colour channel —
`box-shadow: 0 1px 3px rgb(0 0 0/.08), 0 0 0 1px var(--sgs-elevation-line)` — because colour
alone can never be guaranteed. **Do NOT add a `surface-elevated` palette slug** (a per-client
field someone will forget, silently reproducing today's bug).

Also: the panel border uses `surface-alt` (a *fill* token) as a *line*. theme.json defines
`border` (`#e8d5c0` live) and `border-light`. Free fix, do it first.

**This is a framework-default bug, not a client bug:** theme.json's own defaults are
`surface #FAF9F6` / `surface-alt #F1F0EC` = **1.08:1**. Ship a monochrome client on the stock
palette and the panel vanishes too.

**Text on primary — BEAN'S DECISION, 2026-08-20 (overrides the council's recommendation):**
Bean wants **white on primary / primary-dark** and has explicitly accepted the contrast
tradeoff: *"I don't care about the WCAG score as it looks great and is not difficult to
read."* This is a legitimate brand call on his own site and is **not to be re-litigated.**

Design implications of that decision:
- **Per-client, never a framework default.** White-on-pink is set in
  `sites/mamas-munches/theme-snapshot.json`. The FRAMEWORK default must remain a compliant
  derived pairing, because SGS ships to other clients — UK charities and public-sector
  bodies frequently carry accessibility as a *contractual* obligation (PSBAR 2018 mandates
  AA). A client must never silently inherit a non-compliant default they did not choose.
- **Advisory, not a gate.** `push-theme-snapshot.py` WARNS on a sub-4.5:1 pairing and
  proceeds. This matches the project's existing captured rule
  `a11y-validation-feedback-informational-not-gate` ("operator a11y fails are notices").
  Do NOT fail the run closed — that was the council's proposal and Bean has overruled it.
- **Free win worth surfacing to Bean before he settles:** the two pinks differ sharply.
  `#c56a7a` (primary-dark) + white = **3.67:1**, which PASSES AA at large text
  (≥18.66px bold / 24px) — so a slightly larger/bolder button label gives white AND
  compliance with no aesthetic cost. `#e68a95` (primary) + white = **2.49:1**, which fails
  at every size and cannot be rescued by sizing.
- Still delete `--sgs-product-card-btn-text` (a client-scoped token doing framework work)
  and replace with the proper framework pair; the *values* a client puts in it are their
  choice, the plumbing is the framework's.

⚠ Also fix, regardless: `blocks/product-card/style.css:27` carries a stale comment asserting
*"#8B3A47 + white = 7.52:1 ✓ PASS"*. `#8B3A47` is not this client's colour (live
`primary-dark` = `#c56a7a`) and the CSS fallback on the next line is a third value
(`#0F4C4C`, teal). Three disagreeing values in four lines. This comment already misled a
council seat into computing contrast against a colour the site never uses; it will mislead
the next reader identically.

**Teal fallbacks — remove all 47.** Seat 3's sharpened finding: they are not another brand's
palette, they are a *third* stale teal matching neither the current client nor theme.json's
own primary (`#1F7A7A`). A fallback that differs from the default is a silent brand-override
waiting for one missing token. A fallback must be either identical to the theme.json default
(a genuine no-op) or absent. `currentColor` where a bare `var()` feels risky.

**Dead `btn btn-primary` — delete** (Seat 3, against the in-file comment). Zero rules matched
since written; the comment already had to be corrected once because a reader was misled; the
stated end-state uses a *different* class name (`.sgs-button--{preset}`).

---

## 5. Corrections I made to council claims

The council was fact-checked against live measurement. Four claims were wrong:

**A. `primary-dark` is `#c56a7a`, not `#8B3A47`.** Seat 3 computed the hover flip from a
value that is not live. ⚠ **Refined after a source audit — Seat 3 did NOT invent it.**
`#8B3A47` is genuinely in `src/`, in a comment at `blocks/product-card/style.css:27`
asserting *"#8B3A47 + white = 7.52:1 ✓ PASS"*. The seat trusted stale in-repo documentation.
The defect is the comment, not the seat's rigour. Recomputed against the REAL token — and
the finding gets *worse*, not better:

| Foreground | on `#e68a95` (rest) | on `#c56a7a` (hover) |
|---|---|---|
| `#3A2E26` dark brown | **5.28:1 PASS** | **3.58:1 FAIL** |
| `#ffffff` white | **2.49:1 FAIL** | **3.67:1 FAIL** |

**At the real hover colour NEITHER foreground passes 4.5:1.** The toggle's hover state is a
genuine, currently-shipping failure. Seat 3's conclusion ("no static token survives both
states") stands and is strengthened.

**B. The framework's own `primary-text` token is `#fffaf5`** (near-white) → ~2.42:1 on
`primary`. Seat 3 recommended consuming it; doing so would **ship a failure**. The token
itself must be fixed/derived, not merely consumed.

**C. The Apply button is NOT a live WCAG failure.** Both Seat 2 and Seat 3 asserted
`woocommerce.css:1280`'s hardcoded `color:#ffffff` is a shipping 2.49:1 breach. LIVE:
`.wc-block-product-filters__apply-button` **does not exist in the DOM**. The real rendered
Apply button is `color: rgb(58,46,38)` on `bg: rgb(245,208,80)` — dark brown on gold, **8.77:1,
comfortably passing**. The rule is **dead CSS targeting selectors that never mount.** The
finding is "dead CSS to delete", not "accessibility breach to fix".

**D. Empty filters degrade cleanly.** Answering Bean's data-variance question: the Rating
filter (0 reviews → `items:[]`) renders `display:none`, height 0 — **no bare heading, no
visual defect**. WooCommerce suppresses filters with no discriminating power by design. The
stock filter behaved identically before Bean added variance. Not a bug.

Earlier, two agents also claimed the toolbar's `backgroundColor` is "silently discarded and
never paints" — **disproven live** (element carries `has-background has-surface-alt-background-color`,
computes `rgb(255,249,240)`). The real cause is the `max-width` cap (C5).

---

## 6. Open questions — need Bean's decision

**Q1. The container rule.** Three options: (a) rewrite it universally (Seats 1+4 — best
architecture, highest risk, requires the offsetParent census across 43 files); (b) native
`<dialog>` top-layer, leaving the rule untouched (Seat 2 — sidesteps the risk entirely,
fixes the a11y bug structurally, but leaves the rule to break block 84); (c) 7th `:not()`
entry (fastest, violates Rule 3, doesn't fix the parent stacking context).
**My recommendation: (b) now, (a) as a separate governed programme later.**

**Q2. Filter pattern** — bottom sheet (recommended, evidence-backed, and now viable since §2
removes the reload objection) vs your inline accordion. Your call; both are defensible.

**Q3. Full-bleed band (C5).** Seat 4 argues CUT: `class-sgs-container-wrapper.php:603-620`
records a band-scoped background capability **deliberately retired 2026-08-12** with "Do NOT
reintroduce". Seat 1 argues the correct pattern is the inverse and needs no retired
capability — make the object-shaped `contentWidth` emit the inner band like the scalar shape
does, then the template adds `align:"full"`. **Seat 1's route respects the retirement; I
lean to it**, but it is a wrapper code-path change and needs your gate.

**Q4. Grid column floor** — 150px (WC), 250px (Shopify), 260px (Seat 1). Affects when cards
drop from 3→2 per row.

---

## 7. Sequencing

1. **`sgs/text` root cause + fix** (§2) — highest value, unblocks instant filtering AND Flip.
   Gate: `clientNavigationDisabled` absent + a filter click issues a fetch, no document nav.
2. **A11y quick wins, zero blast radius** — `inert`/`hidden` on closed drawer; `<main>`
   landmark. Gate: axe + the tab-order assertion (§4.2).
3. **Token fixes** — border token; `--sgs-elevation-*`; derived `primary-text`; delete teal
   fallbacks + dead classes + dead Apply CSS. Gate: contrast assertions in
   `push-theme-snapshot.py`, fail-closed.
4. **Search max-width** (block-local, zero risk).
5. **Responsive grid** (§4.3). Gate: 375/768/1024/1440 screenshots + lone-last-card check.
6. **Drawer mechanism** per Q1/Q2 outcome.
7. **Re-measure D1** — ⚠ its 413px diagnosis was taken *while* the container rule was
   flattening layout. Seat 1 is right that it must be re-measured after the drawer/container
   work, not designed against now.
8. **Full-bleed band** (Q3), last — judged by eye.

Every step: its own commit, its own `build-deploy.py --target sandybrown`, never
`--allow-dirty`/`--skip-verify` (D336 = 2.5h outage from a hand-rolled path).

---

## 8. Cut / deferred

- **G4 slider overflow** — not reproduced; do not fix blind. Would confirm: 320px + 360px
  viewport, drag max thumb to a 4-digit value, re-check `scrollWidth`.
- **Container queries for columns** — redundant; `minmax()` is already container-relative.
- **Dark-mode token layer** — not in scope, no evidence needed.
- **Wholesale hardcode-lint baseline regen** — remove only the entries that become real token
  consumers.
- **Per-tier `columns-mobile`/`columns-tablet`** — becomes dead weight once §4.3 lands;
  delete as follow-up.
- **Chip horizontal-scroll row ≤481px** (`woocommerce.css:648`) — `nowrap` hides active
  filters off-screen with no affordance. Real defect, low priority.

---

# ADDENDUM — container width/background forensics (2026-08-20, later)

Triggered by Bean's own investigation + his test page `/2562-2/`. Three agents + live
verification. **Two of Bean's hypotheses disproven, one bigger problem found.**

## A. The wrapper split did NOT break this — DISPROVEN

Commit `e61b2f52` (2026-08-17) split `ContainerWrapperControls.js` 1,888 → 269 lines + 6
sibling panels. Verified **mechanically**, not from the commit message: pre-split file
reconstructed, all 7 post-split files concatenated, imports/exports/comments/whitespace
stripped, sorted, diffed. **Zero behavioural lines changed** — only import plumbing plus
deletion of a dead constant. `class-sgs-container-wrapper.php` was never split and was not
touched by it. **Rule it out.**

## B. Background is NOT wired to the wrong layer — Bean's diagnosis is INVERTED

Background colour paints on `<span class="sgs-container__overlay">` — a direct child of the
**outer** tag, sibling of `__inner`, `position:absolute; inset:0` (`style.css:40-45`;
assembled `class-sgs-container-wrapper.php:1327, 2776-2778`). Background media → the outer's
`::before`. **No background is emitted against `__inner` anywhere.** The retirement rule IS
honoured by the emission code.

**What IS mis-wired: the band max-width lands on the OUTER element.** Chain
(`class-sgs-container-wrapper.php`): `:424-425` object-shaped `contentWidth` blanks the flat
var → `:836-842` `$has_band_props` false → `:2689` `$do_wrap` false, **no `__inner` renders**
→ `:1628` `$grid_sel` falls back to `.{uid}` → `:2344-2354` contentWidth max-width emitted on
the outer. The band cap shrinks the box the background fills.

⚠ `contentWidth` default is `{"desktop":"full"}` — an OBJECT — so **every** container takes
this path.

**LIVE CONFIRMED** on `/shop/`:
`.sgs-container-db2a20e3{max-width:var(--wp--style--global--content-size,1200px)}`
(uid-scoped, resolving 1280px) with `hasInnerBandChild: false`.

## C. `contentWidth: full` — NOT a regression (agents disagreed; resolved)

Agent 2 called it a bug; agent 3 disproved that and is right on the narrow point: `full` →
`''` → the `'' !== $content_width` guard suppresses the emit → **no band cap, by design**,
continuously since D231 (2026-06-18). It cannot remove an *ancestor* cap.

Bean's symptom is real but the cause is authoring: `archive-product.html:4`'s outer container
has `contentWidth:{"desktop":"normal"}` → a 1280px band (live value from
`sites/mamas-munches/theme-snapshot.json:371`, overriding the repo's 1200px). The inner
container at `:6` has **no `align`**, so it cannot break out. Compare `single-product.html:9`
and `:33`, which DO carry `"align":"full"` and work.
**Fix = `align:"full"` on the instance, not a wrapper change.** B and C are both real and
independent.

Also found: `narrow` is unhandled by the resolver → emits `max-width:narrow` (invalid,
silently dropped). Legacy stored values hit this.

## D. The real regression — 60 orphaned colour authorings, framework AND client

`ce6a5d72` (2026-08-12) set `supports.color:false` on `sgs/container` (+ background false on
hero/cta-section/trust-bar). **Its impact census measured canary POSTS only** — quote:
*"container has 3 published QA-probe pages, none with a stored `style.color` value"*.
Templates, parts and patterns were never in scope. **Orphaning by omission, not decision.**

| Block | Attr | Count | Status |
|---|---|---|---|
| `sgs/container` | `backgroundColor` | 38 | orphaned |
| `sgs/container` | `textColor` | 1 | orphaned |
| `sgs/hero` | `backgroundColor` | 9 | orphaned |
| `sgs/trust-bar` | `backgroundColor` | 7 | orphaned |
| `sgs/site-header-row` | `backgroundColor` | 3 | orphaned (D683, still live) |
| `sgs/brand-strip` | `backgroundColor` | 1 | orphaned |
| `sgs/testimonial-slider` | `backgroundColor` | 1 | orphaned |
| `sgs/cta-section` | `backgroundColor`/`textColor` | 15 | **SURVIVES** — declared explicitly |

Framework: 7 templates/parts + ~30 pattern occurrences. **Client: 18 occurrences in
`sites/indus-foods/`** — not confined to the shop, or to Mama's.

**The gate is wired but wrong.** `check-dead-pattern-attrs.py:55-58` puts `backgroundColor`,
`textColor`, `gradient` on an **unconditional allowlist with no supports cross-check**. Its
sibling `native-style-undeclared` path (added `09604777`) DOES cross-reference `style.*`
against supports; the three top-level preset shorthands bypass it. One targeted fix surfaces
all 60.

## E. Editor "invalid content" — my hypothesis was WRONG; real cause found

I asserted the undeclared `backgroundColor` caused it. **Disproven live**: WP strips it before
the editor sees it (`bgVal: null`, `containersWithBg: []`), so it cannot be the cause.

**Real causes — 17 invalid blocks in `archive-product.html`, two independent authoring bugs:**
1. **4 × `sgs/container`** — hand-written HTML comments sit inside container inner-content.
   `save.js` emits `<InnerBlocks.Content/>` (no comments); the post body has them →
   *"Expected end of content, instead saw [comment]"*.
2. **13 × WooCommerce filter blocks** — authored self-closing (`/-->`) but their `save()`
   emits a `<div>` → *"Expected `<div…>`, instead saw end of content"*.

This also explains Bean's point 1 (settings do nothing on canvas) — compounded by E below.

## F. Frontend/editor asymmetry — VERIFIED, mechanism NOT fully explained

Deployed `build/blocks/container/block.json` confirmed **current** (`supports.color:false`, no
`backgroundColor` attr, `contentWidth` default `{"desktop":"full"}`) — not stale. Yet the
**frontend paints** (`has-background has-surface-alt-background-color`, computed
`rgb(255,249,240)`) while the **editor strips** the same attribute.

⚠ This contradicts D338's stated rule that undeclared attrs are stripped before `render.php`.
**Behaviour verified; WP-core mechanism NOT established.** Do not build on an assumed
explanation.

**Practical consequence regardless of mechanism:** the setting is invisible and uneditable to
the client but still paints — an uncontrollable ghost setting. That alone justifies fixing it.

## G. Where Bean's reading was corrected

- **Layout default `stacked` → `flex`:** keep `stacked`. `flex` would add
  `display:flex;flex-wrap:wrap` and collapse block-level children to content width. The
  declaration is `{"type":"string","default":""}` and has **never been edited** (verified at
  every revision since 2026-06-11) — not a regression. **Real bug next door:** block.json `""`
  vs panel `'stack'` → untouched blocks emit a broken class `sgs-container--`.
- **Two panels:** keep both — **zero attribute overlap** (`edit.js:299` writes outer
  padding/margin; `:351` writes only `contentBandPadding`). Introduced together in `764ab2e6`
  (2026-07-09), predating the split by 6 weeks. The Content-band panel is a **vestigial shell**
  since `6c4b5087` hollowed it to padding-only. **Its help text is FALSE** — it claims "Only
  active when Content width is set"; band padding alone already creates the band.
- **Editor preview does nothing (point 1):** `edit.js:224` uses a hand-built
  `useBlockProps` approximation, **not** `ServerSideRender`. It applies max-width, gap,
  min-height, shadow, bg-image custom props and grid/flex — and **none** of overlay colour,
  contentWidth, band padding, or padding/margin. Most of the inspector genuinely cannot move
  the canvas.
- **Inner band layer:** survives every proposal. All fixes ADD band emission or RESTORE
  `__inner`. L1–L4 cloning cascade intact — hard constraint respected.

## H. Fix shapes — NOT approved; B needs a Rule 7 design gate

1. **B (shared wrapper, HIGH blast radius — needs Bean's explicit go-ahead):**
   (a) make `$has_band_props` object-aware so `$do_wrap` flips and `__inner` renders;
   (b) give `contentWidth` its own band selector so it can never fall back to `.{uid}`.
2. **C:** add `align:"full"` to `archive-product.html:6`. Instance-level, zero blast radius.
3. **D:** fix the gate allowlist FIRST (so the tool enumerates, not a one-off script), then
   remediate. For container/hero/trust-bar, removing the attr **loses the background** — they
   need a declared British `backgroundColour` attribute (mirroring `sgs/site-header-row`)
   before the markup can be cleaned. `site-header-row`'s 3 are a pure spelling fix.
4. **E:** strip the comments out of container inner-content; give the WC filter blocks their
   save markup (or re-insert via the editor).
5. **G:** align block.json `layout` default to `"stack"`; correct the Content-band help text;
   consider `ServerSideRender` for the canvas.

---

# BEAN'S DECISIONS — 2026-08-20 (BINDING; supersede the council where they conflict)

## D-1. `align:"full"` workaround — REJECTED

Bean: *"This is literally a patchwork awful suggestion and doesn't fix the actual issue that
bg colour shouldn't be constrained to content width."*

**He is right and the earlier §C recommendation is withdrawn.** Adding `align:"full"` per
instance is authoring around a broken default, not fixing it. The binding principle:

> **A container's background fills the container's own box. Content width constrains the
> CONTENT only. A background must NEVER be capped by content width — on any block, on any
> client, by default, with no per-instance attribute required.**

This is the same rule the 2026-08-12 retirement note already states. The code does not honour
it. **The fix is §B (the wrapper), not an instance attribute.** Do not reintroduce
`align:"full"` as the remedy; it may still be used where a section genuinely wants full-bleed
CONTENT, which is a different intent.

## D-2. `flex` becomes the container's default layout

Bean: *"Flex should be default, obviously specialised blocks like hero may need stacked but
that is a block-specific setting. Flex is the default, stacked and row are specific patterns
and grid is a rigid structure."*

**Two corrections to what was previously recorded here, both mine:**

1. **The council's reasoning was wrong and I relayed it.** It claimed flex "would collapse
   block-level children to content width". That conflates two independent axes. `contentWidth`
   constrains WIDTH; `layout` controls FLOW. Bean's point stands: if children shouldn't be
   constrained, that is what `contentWidth` is for.
2. **The real constraint, verified in source:** SGS `flex` emits
   `display:flex; flex-wrap:wrap` (`class-sgs-container-wrapper.php:1003-1005`) and
   `flexDirection` defaults to `''` (`:774`) — CSS's own default, i.e. **row**. The panel
   confirms `'— default (row) —'` (`LayoutPanel.js:165`).

⚠ **OPEN SUB-DECISION (needs Bean, cheap):** flipping the default to `flex` alone makes every
container lay children out in a **row**. If the intent is "flex as the modern default with
children still stacking", the `flexDirection` default must move to `column` in the same
change. Recommend: `layout: "flex"` + `flexDirection: "column"` as the paired default.
Otherwise every existing container's children go side-by-side on next render.

**Also fix in the same change (pre-existing bug, unrelated to the default choice):**
`block.json` declares `layout` default `""` while `LayoutPanel.js:50` destructures
`layout = 'stack'`. Untouched blocks therefore emit a malformed class `sgs-container--`.
Align the two.

**Premise note, for accuracy:** WordPress core's `core/group` defaults to `constrained`
(flow), not flex — the flex variants are separate block variations. Page builders
(Elementor, Bricks) do default to flex. So "flex is the standard default" holds for builders,
not for WP core. This does not change the decision; it is recorded so the rationale is honest.

## D-3. Gate fix + template comments — APPROVED, proceed

- Fix `check-dead-pattern-attrs.py:55-58` so `backgroundColor`/`textColor`/`gradient` are
  cross-checked against each block's `supports` sub-flags instead of being unconditionally
  allowlisted.
- Move the hand-authored HTML comments out of container inner-content in
  `archive-product.html` (4 blocks), and give the 13 WooCommerce filter blocks their save
  markup. Fixes the 17 "unexpected or invalid content" errors.

## D-4. The 60 orphans — full colour-panel standardisation, NOT a minimal attribute add

Bean: *"All of those blocks actually just need an sgs colour panel added and to have a
background colour and text colour in there by default with options to set normal and hover
state. (Use the standardised golden colour control with the gradient setup for the correct
element, there are 3 gradient setups for different elements that need painting in different
ways.)"*

**Supersedes the earlier "add a `backgroundColour` attribute" plan.** Per target block
(`sgs/container`, `sgs/hero`, `sgs/trust-bar`, `sgs/brand-strip`, `sgs/testimonial-slider`):
- Add the standardised `SgsColourPanel`
- Background colour AND text colour present by default
- Normal AND hover states for each
- Use the golden colour control contract
- Use **the correct one of the 3 gradient setups** for the element that block paints

`sgs/site-header-row` (3) stays a pure American→British spelling fix. `sgs/cta-section` (15)
needs nothing — it declares its colour attrs explicitly.

Precedent to follow: the `sgs/site-header` / `sgs/site-header-row` migration off WP-native
colour onto `SgsColourPanel` (D683/D684). ⚠ Carry forward D684's gotcha: a `DesignTokenPicker`
value fed RAW to `wp_style_engine_get_styles()` emits a bare slug as literal invalid CSS —
route through `sgs_colour_value()`.

## D-5. Editor/frontend parity — fix it, and audit the enforcement gap

Bean confirmed the diagnosis (editor renders from `edit.js`, frontend from `render.php`;
the container hand-builds an incomplete approximation) and asked for it to be fixed alongside
the rest. Project memory already carries the rule: **`ssr-fixes-hand-built-preview-drift`**.

He also asked: *"I thought we had an enforcement script that kept the 3 areas consistent so if
a setting exists it checked to make sure it's wired up in the editor and on the live page
too?"* — under investigation. The three axes are (1) declared in `block.json`,
(2) controlled in the editor **and reflected on the canvas**, (3) consumed by `render.php`.
Existing gates cover control↔render; **canvas parity is the suspected gap.**

## Status of the four earlier open questions

| Q | Outcome |
|---|---|
| Q1 container rule | **BOTH** — `<dialog>` route-around ships first; the rule rewrite follows behind its offsetParent census. Parallelised, neither blocks the other. |
| Q2 filter pattern | **Slide-up sheet.** Locked. |
| Q3 full-bleed band | **Superseded by D-1** — not an authoring fix; the wrapper must stop capping backgrounds. |
| Q4 grid column floor | **250px, and exposed as an editor setting** (`minColumnWidth`), not hardcoded — per the project's own "no feature is complete without editor controls" rule. |

---

# IMPLEMENTATION INPUTS (2026-08-20) — planner-facing

Two final investigations. **Both corrected a premise**; read the corrections before planning.

## I. Editor/frontend parity gate — Bean was RIGHT, a gate exists

`plugins/sgs-blocks/scripts/check-editor-render-parity.js` **CHECK A** (built 2026-08-13,
D613) IS the editor-canvas-parity gate. It failed to catch `sgs/container` for two reasons:

1. **Advisory-only.** `:3489-3490` — `CHECK_A_BLOCKS_BUILD = false`. It runs in `prebuild`
   and can never fail it. Current: 10 net-new, 27 accepted, 0 for container.
2. **Cross-file blind.** It requires the attr to be **destructured in `edit.js`** (`:74-76`).
   The container's colour/width controls live in `components/ContainerWrapperControls.js` and
   `components/WidthPanel.js`, so `backgroundOverlayColour`, `overlayGradient` and
   `contentWidth` appear **zero times** in `edit.js`. Its own blind-spot #3 (`:113-117`)
   documents this as out-of-scope by design.

**The missing check was already named and never built:** the baseline's `sgs/site-header`
`headerShrink` entry identifies a **5th structural signal — "no-ServerSideRender + no
scoped-CSS mirror"** — which is exactly this defect class.

**SCALE — the real headline: 71 of 83 blocks (86%) hand-build their editor preview.** Only 12
use `ServerSideRender` (`before-after, brand-strip, business-info, buybox, card-grid,
mega-panel, nav-drawer, nav-menu, post-grid, product-card, responsive-logo,
trustpilot-reviews`). ~61 blocks have never been proven either way.

**Recommended order:** build the 5th signal (structural, static, ~1 day, catches container) →
widen CHECK A's corpus to the block's own `components/*.js` (~half day) → flip
`CHECK_A_BLOCKS_BUILD = true` once the 10 findings are triaged.
⛔ `ServerSideRender` is NOT viable for `sgs/container` — it is a `useInnerBlocksProps` host.

**Recurring wiring failure, AGAIN (D338/D643 pattern):** two real detectors have npm aliases
but are absent from `prebuild` — **`check:inert-controls`** (written 2026-08-19) and
**`check:undeclared-attrs`**. Wire them.

## II. Colour standardisation — the premise was WRONG; scope is narrower and different

⚠ **All five target blocks ALREADY mount `SgsColourPanel`.** The gap is not "add a panel" —
it is that they lack **root-element background/text colour attributes**.

| Block | `supports.color` today | Root `backgroundColour`/`textColour` | Actual defect |
|---|---|---|---|
| `container` | `false` (scalar) | NEITHER | `render.php:88-99` reads `textColor`/`backgroundColor` — attrs WP never registers. 38 pattern authorings write into a void. |
| `hero` | **ABSENT** | NEITHER (only `*Hover`) | `elements.wrapper.attrMap` maps to `native:color.background` which is never declared. Manifest orphan. |
| `trust-bar` | `{text:true,…}` | `textColour` ✔, no `backgroundColour` | `text:true` = live D683 double-paint (core Styles panel renders alongside `SgsColourPanel`). |
| `brand-strip` | all-false ✔ | NEITHER | Root surface unpaintable; only `tile*`/`name*` rows exist. |
| `testimonial-slider` | `{gradients:true,…}` | BOTH ✔ | Closest to done — needs `gradients:false` + hover + gradient siblings. |

### THE THREE GRADIENT SETUPS (`golden-controls.json:66-87`) — selection is unambiguous

| # | Setup | Paints | Hover? | Use for |
|---|---|---|---|---|
| **1** | **In-row per-state gradient** — `DesignTokenPicker` state carrying `gradientValue`/`onGradientChange`; sibling attr `{attr}Gradient`; PHP `sgs_css_gradient_value()` | background / border / icon-stroke | **YES** | **Every new `backgroundColour` row** |
| **2** | **`textGradientRow`** — `GradientCapableColourControl` via row `gradientCapable: true`; PHP `sgs_resolve_text_colour_or_gradient()` | **TEXT only** (`background-clip:text`) | YES | **Every `textColour` row** |
| **3** | **`wholeBlockOverlay`** — `GradientOverlayControl`, stores a complete CSS gradient string (D636) | whole-block overlay above bg image/video | **NO — single-state by construction** | Already mounted on all 5. **Do NOT use for the new root rows.** |

On `hero`, setup 1 sits **under** the existing setup-3 overlay — they stack, they don't compete.

### Golden contract (`inspector-scan/rules/31-golden-colour-control.js`)
- Conformant `nativeUi` = `supports.color` declared with **every sub-flag false** +
  `__experimentalSkipSerialization: true` (key retained for the uniformity gate).
- `states.minimum: 2` — normal + hover by default (Bean, 2026-08-19). Never parse state from
  the attribute name.
- `gradient.required: true`, exemptions declared at
  `supports.sgs.colourExemptions.<rowKey> = {rule, reason}`; a boilerplate reason is itself a
  finding.
- ⚠ `survey:colour`'s `scope.eligible` is **self-fulfilling** (`build-roster.py:106` computes
  it as "has colour already"), so a block with none can never be reported MISSING. Use
  `qualifiesWhen.paintsOwnSurface` as the real predicate.

### Target attribute set (per block, root element)
`backgroundColour`, `backgroundColourGradient`, `backgroundColourHover`,
`backgroundColourHoverGradient`, `textColour`, `textColourGradient`, `textColourHover`,
`textColourHoverGradient` — all `{"type":"string","default":""}`, omitting any that exist.
Plus two `SgsColourPanel` rows (setup 1 background, setup 2 text), each 2-state.

**Reference implementation to copy verbatim: `sgs/button` `edit.js:381-470`** (5 rows, all
2-state, 3 gradient-capable). Migration precedent: `sgs/site-header-row`, commit `0b62caf9`.

### ⛔ Three gotchas that WILL bite
1. **D684** — never pass a `DesignTokenPicker` value RAW to `wp_style_engine_get_styles()`.
   Proven on canary: it emits the literal `background-color:primary;`, which the browser
   drops — the client's colour silently does nothing. Route through **`sgs_colour_value()`**
   (`includes/helpers-tokens.php:580`). Pattern: `site-header-row/render.php:78-107`.
2. **D683** — retiring native colour breaks patterns **silently**. **283 `wp:sgs/{target}`
   authorings exist** across `theme/sgs-theme/{patterns,templates,parts}`. Every
   `"backgroundColor"`/`"textColor"` on a target block must be rewritten to the British
   spelling **in the same commit**. ⚠ Scope the rename **inside `wp:sgs/*` comments only** —
   American spelling is correct on core blocks.
3. **`/sgs-update` reseed is cross-track** — it fails every *other* worktree's DB gate until
   the classifier lands there too. Sequence it deliberately.

### Undetermined — need Bean or a measurement
- **`sgs/container`'s root colour: `SGS_Container_Wrapper` or block-private CSS?** D294's
  selector says section/layout-KIND keeps the wrapper — but container *is* the wrapper.
  **Rule 7 design gate.**
- **`brand-strip`** — `backgroundColourHover`/`textColourHover` already exist but belong to
  the **tile**, not the root. Reusing the names may silently drive tile CSS. Trace
  `render.php` before naming the root attrs.
- **Gradients have never been observed working in the live editor** (`golden-controls.json`
  `⚠ unverifiedSurface`). Treat "it has a gradient toggle" as unproven until seen.
