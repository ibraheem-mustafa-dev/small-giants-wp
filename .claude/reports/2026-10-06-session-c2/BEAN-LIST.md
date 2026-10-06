# Eye Care Session C2 — the yes/no list

**For Bean, 2026-10-06.** One line per item: what it is in plain English, what breaks without it, the
blast radius, and my recommendation. **Nothing is built before you answer.**

Measured at block code `94122e326`, verified by marker checksum. Raw F = 193.

---

## How 193 rows became 7 decisions

| | Rows | |
|---|---|---|
| Raw F measured | 193 | |
| − measuring artefacts | 90 | the route comparing a draft and a live page that paint the same pixels by different means, or the walker pairing the wrong node |
| − already decided by the register | 25 | the register's fix stands |
| − already settable, or an accepted divergence | 22 | a control exists and reaches it. **Correction:** the 14 brand-strip typography rows are an **accepted divergence**, not merely "settable" — the draft types brand NAMES as placeholders for the LOGOS the live site carries, which register **S9** already records ("Brand names typed where logos belong… prints a brand's logo with the brand NAME as its text alternative"). Nobody should ever try to close them |
| − wrong block (tree work, Session D) | 11 | the value belongs on a parent |
| − Google reviews | 14 | **accepted differences, verified by value** — see below. Not "the parallel track's to do": that track is closed (`434dbf15d`) and all 12 of its commits are deployed at `94122e326` |
| **= genuine framework gaps** | **~30 rows** | **which collapse to 7 fixes** |

Half the count was measurement noise. Every `real` verdict was re-checked by me against the cited
symbol, and 25 of the 148 non-real verdicts were spot-checked (17%, against the 10% the plan required).

---

## A. The framework fixes — BEAN'S ANSWERS, 2026-10-06

| # | Item | Bean's answer |
|---|---|---|
| A1 | `sgs/accordion` `headerGap` | **YES.** Correction to my description: we do not control individual product pages, we design the **product page template**. So the 16px is the template's accordion |
| A2 | Delete the header's hardcoded `line-height: 1.4` | **YES** — "hardcoding is a violation of our rules anyway" |
| A3 | `sgs/accordion` `headerMinHeight` | **YES, overriding my caution.** Default 44px, customisable. A sub-44px exception can be legitimate in context. See the standing principle below |
| A4 | `sgs/card-grid` `noImageLabelLineHeight` | **WITHDRAWN.** "Photo to come" is a draft placeholder, not content — it ceases to exist once the client uploads images. Not required to clone |
| A5 | `sgs/buybox` selected-value typography | **YES** |
| A6 | Delete the `sgs/tabs` hover underline | **YES** — and if a tab underline is ever wanted, it is done with border-bottom width and colour, not a text-decoration hardcode |
| A7 | `sgs/whatsapp-cta` | **INVESTIGATE.** Three symptoms, not one: the icon is black instead of white, the text carries more weight than the draft, and there is an underline hover effect the draft does not have |

**Five approved: A1, A2, A3, A5, A6. One withdrawn: A4. One to investigate: A7.**

### The standing principle behind A3, which outranks my objection

> Our main objective is to make these blocks as modular and mouldable as possible so that our draft
> sites, no matter how they're coded, are able to be cloned with little to no effort. The padding setup
> is a workaround that wastes valuable time and tokens.

So where a draft needs a value, the answer is a real control with a sensible default, **not** a workaround
that reaches the same pixels by another route. A 44px default satisfies the touch-target rule by default;
a client choosing otherwise in context is their call, not a reason to withhold the control. **Do not
re-argue this on the next block.**

## A-original. The seven as first presented

| # | In plain English | What breaks without it | Blast radius | My call |
|---|---|---|---|---|
| **A1** | **The FAQ and product accordion header can't have its gap set.** It's welded at 12px; your draft wants 20px on Help and 16px on Product. | The only one of these seven that changes something you can see — 8px of header spacing on every accordion. | Two files (`sgs/accordion` gains the attribute and provides it as context, `sgs/accordion-item` emits it). 9 rows. No saved markup changes. | **Yes.** The only visible one, and it follows the exact pattern `headerPadding` already uses. |
| **A2** | **The accordion header's line height is welded at 1.4**, so the block's own line-height control can't reach the question text. | A control that exists and silently does nothing on the header. | One line deleted from `accordion/style.css`. No new control. 2 rows. | **Yes.** It's a one-line deletion that makes an existing control work. The same repair S5 already did for font-size. |
| **A3** | **The accordion header's minimum height is welded at 44px**; the draft wants 56px. | Nothing visible. The 44px floor never actually binds — header height is driven by padding plus the icon. | New control on `sgs/accordion`. 3 rows. **But 44px is your touch-target floor**, so a settable version lets a client go below it. | **No**, or yes only with an enforced 44px minimum. It changes nothing today and risks accessibility. |
| **A4** | **The "Photo to come" fallback label can't have its line height set.** | A gap in an otherwise complete set — the label already has 8 typography controls. | **One line in `card-grid/block.json`.** `render.php` already calls the helper that reads it. 2 rows. | **Yes.** Cheapest item on the list; the render path is already wired. |
| **A5** | **The product page's chosen-option text can't have its size set**; it inherits 16px where the draft wants 13px. | Option text 3px larger than the draft on every product. | `sgs/buybox` only. 2 rows (the line-height row should close with it). | **Yes.** Small, contained, visible on the main commercial page. |
| **A6** | **Product tabs underline on hover and you can't turn it off.** The draft has no underline. | An underline your draft doesn't want, on every product page. | `sgs/tabs`. 4 rows. Either delete the hardcode or add a control. | **Yes, by deleting the hardcode** rather than adding a control — the framework already has hover-underline utilities for anyone who wants one. |
| **A7** | **The WhatsApp button's icon is dark where it should be near-white.** | A visibly wrong icon colour on the product page. | **Cause not yet proven.** The CSS says it should already be `#FAF8F5`; live reads `rgb(20,20,20)`, which that CSS cannot produce, and the block is unchanged since `94122e326`. | **Hold.** One live reading of the winning rule's origin settles it. Do not build a fix on an unproven cause. |

---

## B. Two register items already decided — build or defer?

These are **not** new decisions. You already decided them; they were never built.

| Ref | What you decided | Rows | My call |
|---|---|---|---|
| **39-43** | Social icons get a glyph-only brand variant: the box stays white with a light border, no hover scale-up, 44px retained. Today brand mode overwrites box, border and glyph colour per item and hardcodes a `scale(1.1)` hover. | 17 | **Build it.** It's the single biggest row cluster on the list and the decision is already made. |
| **34/35** | The phone link becomes one 21px line: no minimum height, no padding. The 44px rule is met by the line spacing around it, and you asked for a check after. | 8 | **Build it**, and do the post-check you asked for. Note it's a *removal* — the hit-area padding and its cancelling negative margin come out. |

---

## C. Three route debts — not framework gaps, but they need owners

| # | What | Why it matters | My call |
|---|---|---|---|
| **C1** | **A failed surface silently serves a stale measurement as current.** When `solve.mjs` fails it leaves a folder with draft caches and a `round-1` but no `solve-report.json`; `lib/sweep.mjs::latestReport` skips it and uses the *previous* run. Nothing goes red. | `header` failed in this very sweep. Had I run the bare loop, its 01:37 numbers would have been reported as current and undetected. | **Fix.** `sweep.mjs` should flag any surface whose newest report predates the sweep's start. |
| **C2** | **A cosmetic path change re-keys rows wholesale.** `sgs/brand-strip` kept exactly 51 rows but 18 changed key because the walker's path gained `:nth-of-type(1)`. No verdict changed. | Gate TAIL plans to judge fixes by "1 new row per 10 closed". This would read as a wave of closes and opens and pass or fail for the wrong reason. | **Fix before anyone relies on Gate TAIL.** Compare on a normalised path, not the raw key. |
| **C3** | **The canvas roster masks real gaps, with a proven mechanism.** `lib/triage.mjs::canvasSettable` matches on CSS property name and treats a control with no recorded element as able to reach any descendant. | **20 rows proven wrong.** Every claim citing `bgHoverZoomDuration` / `Easing` / `Scale` sits on a form input, social icon, tab button, gallery div or filter input — never on the background layer those controls actually paint (`.<uid> > .sgs-container__image-bg` or `.<uid>::before`, with `transition-property: transform`). So 20 rows are held as "settable" when they are genuinely gaps. | **Fix.** `canvasSettable` should respect the emission selector, not just the property name. This is the load-bearing worry you named, realised. |

**C3's practical impact here is small**: 18 of the 20 are transition-family rows, and two are `transform`
on buybox gallery divs. **The mechanism is the problem, not these 20 rows** — it would mask
non-transition gaps on the next client.

### Correction: "excluded" was doing too much work

I described transition rows as "excluded", and Bean rightly challenged it. **Excluded is not a verdict,
it is a deferral.** The rows are real differences: `sgs/google-reviews` reads draft `0.2s` against live
`0.15s` and `0.25s` with different property lists on each side.

The honest statement is that **no transition row can be actioned by the route at all**, because
`lib/calibrate-markers.mjs::markersFor` has no branch for `transition,*` and falls through to
`return []`. Calibration therefore never sees them and the resolver can never write one. Register **S1**
decided the framework's *base* transition behaviour, not these per-instance durations.

So transition rows are not "not gaps" — they are **unmeasurable until `markersFor` gains a transition
marker**, which is now a phase-1 diagnosis target alongside the walker defects.

---

## C4. Correction: the Google Reviews rows, verified by value

The first version of this list excluded these 14 rows as "the parallel track's". **That was wrong on the
premise** — the Google Reviews attribution track is closed (`434dbf15d`) and all 12 of its commits are
ancestors of `94122e326`, so the implementation was live at the measurement. The rows need a real reason,
and they have one. Read from the walk report:

| Rows | Draft | Live | What it actually is |
|---|---|---|---|
| arrow `icon-fill` ×2 | `none` | `rgb(26,115,232)` | **The same Google blue on both sides.** The draft draws the arrow as a *stroked* path, SGS as a *filled* one |
| arrow `icon-stroke` ×2 | `rgb(26,115,232)` | `none` | The mirror of the row above — stroke and fill inverted, identical painted colour |
| arrow `icon-width` / `icon-height` ×4 | `18px` | `20px` | A 2px glyph difference inside Google's 40px pill — your closed 40px ruling (`0b538cecb`) |
| `transition-duration` ×6 | `0.2s` | `0.15s` / `0.25s` | The transition exclusion: no `transition,*` row calibrates anywhere, and register S1 decided transition behaviour |

So **none of the 14 is a gap.** Four are a stroke-versus-fill SVG construction painting the identical
Google blue, four are the 40px ruling, six are excluded transitions. Nothing to build and nothing owed to
another track.

## D. Stated scope — what the 193 does not cover

Not items, just honesty about the number you are deciding against.

- **The count excludes whole row kinds by design.** `lib/issue-classes.mjs::VISUAL` counts only `style`,
  `hover`, `box`, `text` and `presence`. Motion, scroll, structure, inventory and others are "reported,
  never counted". Zero `motion` and zero `scroll` rows reach triage on any surface.
- **50 content rows** (38 presence, 12 text) are content, not framework.
- **29 U rows** are one mechanism, not 29 problems: all box geometry (10 heights, 3 widths, 16 `y-after`
  offsets), all `derived`. They are consequences of padding, gaps and content, and belong to Session D.
- **The lens flow needs nothing.** All 28 rows are artefacts. Its residual has a proven cause: the close
  button is deliberately 44px where the draft is 42px, cascading 2px — an accepted difference in the same
  shape as your Google-reviews ruling.
- **17 local commits are not deployed**, so rows they fix still read open. Register 75/82/158 is in that
  set and must not be judged as a gap.

## D2. THE BIG ONE: 63 register items the walker cannot see at all

**This list covers the walker's visual half only.** It is the most important limitation in it, and the
first version did not state it.

**63 of the register's 208 rows carry Sweep = `not walker-measurable`.** They are invisible to the 193 by
design, not by oversight, and they are not trivia — they are the behavioural, content and motion half of
the build, where most remaining *user-visible* work lives.

| What they are | Count | Examples |
|---|---|---|
| **Motion and load animation** | ~8 | bag count pop (3, 17), hero photo slow zoom-out (51), hero buttons appear instantly (58), main product photo fade (73), drawer links arriving one by one (14), free-delivery bar speed (19) |
| **Interaction and behaviour** | ~10 | card colour dots not focusable or clickable (59, 61), only photo and title are links (N26), **a second different product never reaches the bag (N11)**, choosing then removing a filter breaks the filter panel (N25), lens steps should advance on pick (N37), "Skip the lenses" opens an extra step (N38) |
| **Content and data** | ~15 | `.00` on prices (S8, N9, N34), brand names typed where logos belong (S9, N10, N33A), "No reviews yet" (S7, N27, N31), empty spec rows (95), "In stock" missing (91), address on one line / not a link (36, 37), `/privacy` and `/terms` missing (45) |
| **Structure** | ~6 | "Added to bag" toast missing (18), sizing tab has no diagram (N36S), the shop's Google rating needs a home (D7), top bar should marquee when items do not fit (N4) |
| **Route and calibration (CR items)** | 14 | CR1 to CR18 — per-device settings skipping a width, aspect-ratio never measured, border style reading dead on ~50 blocks, CR6's box zero-fill |
| Other | ~10 | S12, N2A, N6, 9, N8, N13, N16b, N24, 64, 96, 151, 152, 159, 161 |

**Only 7 of the 63 narrate a completion in their Fix cell.**

**Six are built but NOT deployed at `94122e326`**, so they were absent from the site I measured and would
not have shown even if the walker could see them: **18** (`c8c2c4162`), **20+23** (`e4735072d`),
**59/61** (`5a9e28ee5`), **S10** (`80b9deaa4`), **S9** (`2b4122c77`), and the 75/82/158 gallery strip
(`b68db67c9`). Only the Tier 1 batch (`65573118c`) was deployed.

**What this means for the decision.** Saying yes to all five approved A-list fixes closes 17 walker rows.
It does not touch N11 (a second product never reaching the bag), N25 (the filter panel breaking), the
missing toast, the `.00` prices or the absent spec rows — and those are what a visitor would notice
first. **The walker was never going to surface them, so a clean F count is not a measure of how finished
the site is.**

**Bean's correction, and the next session it defines.** Several of these are not walker problems at all —
they are things that simply need building. N11 and N25 are the clearest cases. Calling them
"not walker-measurable" describes the measuring tool, not the work.

**Agreed next session:** go through this list of 63, **deploy and test live**, compare each against the
draft, and categorise the remainder — built, genuinely open, needs content from the client, or an
accepted divergence. That session is worth more than the five fixes above and should not wait behind
them.

---

## E. Two documented claims I had to refute

Both were recorded as proven and would have sent work in the wrong direction.

1. **The footer `margin-top` cause is wrong.** The C2 plan records "an inline WP-native base margin beats
   a class rule" as proven in the source. It isn't: `class-sgs-container-wrapper.php` passes
   `'selector' => '.' . $uid` to `wp_style_engine_get_styles()` and its own comment says the result is
   "just scoped to `.$uid` instead" of inlined. The "lands INLINE" comment the diagnosis rests on is
   **stale** and sits in the tablet block. **The cause is unproven; build nothing on it.**
2. **The stripped-control figure is 345/346, not 338.** Measured twice — 345 on the baseline reports, 346
   on the new ones. Session C records 338 for two different baselines, which doesn't reconcile. The
   roster's load-bearing status is unaffected (a 153-row swing either way), and its "zero movement on any
   non-canvas surface" claim **is** confirmed.

---

## What I recommend, in one line

**Say yes to A1, A2, A4, A5, A6 (five small fixes, four of them one or two files), build the two register
items 39-43 and 34/35 you already decided, say no to A3 unless it enforces a 44px floor, hold A7 until one
live reading proves its cause, and give C1 to C3 to the route owner.**

That is 5 new fixes plus 2 decided items, against 193 raw rows.
