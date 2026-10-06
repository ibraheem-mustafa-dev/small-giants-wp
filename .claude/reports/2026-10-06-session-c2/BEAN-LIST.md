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
| − already settable today | 22 | a control exists and reaches it |
| − wrong block (tree work, Session D) | 11 | the value belongs on a parent |
| − Google reviews (parallel track) | 14 | its 40px sizes follow Google's UI, your 2026-10-05 ruling |
| **= genuine framework gaps** | **~30 rows** | **which collapse to 7 fixes** |

Half the count was measurement noise. Every `real` verdict was re-checked by me against the cited
symbol, and 25 of the 148 non-real verdicts were spot-checked (17%, against the 10% the plan required).

---

## A. The 7 framework fixes — yes or no on each

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

**C3's practical impact here is small**: 18 of the 20 are transition-family rows, already excluded because
no `transition,*` row calibrates anywhere (Spec 47 §5) and register S1 decided transition behaviour. Two
are `transform` on buybox gallery divs. **The mechanism is the problem, not these 20 rows** — it would
mask non-transition gaps on the next client.

---

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
