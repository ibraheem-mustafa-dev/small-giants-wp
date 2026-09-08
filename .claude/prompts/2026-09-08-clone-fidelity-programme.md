# Clone-fidelity programme — measure honestly, then fix the pipeline

**Target:** Mama's Munches homepage, WordPress page 2742 on the sandybrown canary.
**Draft (source of truth):** `sites/mamas-munches/mockups/homepage/index.html`
**Latest parity run:** `pipeline-state/mamas-munches-homepage-2026-09-08-105524/`
**Current score:** CSS 79 / 79 / 84 % at 375 / 768 / 1440. Content 99 %.

---

## Why this exists

Bean inspected the live clone by eye and found **fourteen defects the parity tool never
reported**. Separately, several defects the tool *did* report turned out to be false —
it flagged elements that render correctly.

So the measurement is wrong in both directions. Fixing the clone while the ruler is
bent wastes the work: we cannot tell a real regression from a scoring artefact, and a
green number means nothing. **Fix the ruler first.**

---

## Working method — binding on every phase

1. **Investigation and fixing are separate jobs, run as separate dispatches.** An agent
   that investigates does not fix. An agent that fixes works from a written,
   already-reviewed root cause.
2. **Every investigation is fact-checked by a second agent** before its finding is
   accepted. The checker's job is to falsify the claim, not to agree with it. State
   PROVEN (evidence cited to file:line or a measured value) or UNPROVEN.
3. **Explain the fix before building it.** Say which mechanism is wrong and what the
   change is, then wait. This exists to catch the failure mode below.
4. ⛔ **Never hardcode a value to make this draft pass.** The deliverable is a pipeline
   that clones *any* draft. A fix that special-cases `sgs-gift-section`, or writes a
   literal from this mockup into framework code, is a defect even when the page then
   looks right. If a fix cannot be made general, say so and stop.
5. **Read the draft before claiming anything about it.** Several findings this week were
   wrong because an agent cited draft line numbers that do not exist. The file is 1,088
   lines.
6. **Block CSS is lifted to `wp-content/uploads/sgs-css/*.css`, never inline.** Grepping
   page HTML for a rule proves nothing. Measure computed styles, or read that stylesheet.
7. **Verify a "no counterpart" claim against the live DOM.** The tool's own matching is
   suspect — see Phase 1.

---

# Phase 1 — Why is the parity tool wrong?

Investigation only. No fixes. The tool is
`plugins/sgs-blocks/scripts/parity/computed-parity.js` (Spec 20, Stage 11.6).

### 1.1 False positives — it reports defects that are not real

**Background colour: 36 diffs, all three viewports. Proven false.**
The tool reads an element's own `background-color`. SGS deliberately paints backgrounds
on an `::after` layer (`sgs_block_background_layer_css()`), so the element itself is
transparent by design. Measured live: `sgs/info-box` own background `rgba(0,0,0,0)`,
its `::after` `rgb(255,255,255)` — exactly the white the draft asks for.
Affected elements reported: ingredients disclaimer, gift card, gift card tag, info-box,
hero content, announcement bar, Trustpilot bar.
**Question:** which of those seven are genuinely wrong, and which are this artefact?

**Borders: 6 diffs. Bean says these already work — the clone carries borders over.**
The tool reports `border-top-width` 1px → 0px on the announcement bar and the Trustpilot
bar. Confirm against the live DOM, including any `::before`/`::after` ring
(`sgs_border_gradient_css()` paints borders on a pseudo-element for gradient borders).

**Hero mobile image: reported dropped, all three viewports — the whole "missing 1 %".**
Bean says both the desktop and mobile hero images are present. The tool reports the
element `img:freshly baked mamas munches lactation cookies…` as having no counterpart.
Art-directed tiers render as sibling elements toggled by `@media`, so the hidden-at-this-
width sibling may simply not match. **Does the tool handle per-device sibling media at
all?** If not, it will misreport every art-directed image on every clone.

### 1.2 False negatives — fourteen real defects it never flagged

This is the more serious half. Bean found all of these by eye; the tool scored them clean.
Full list in Phase 3. For each, answer one question: **why was this invisible to the tool?**

Look for structural blind spots rather than explaining each miss separately. Candidates
worth testing:
- Does it compare **layout geometry** (width, position, alignment) at all, or only
  computed CSS properties? Several misses are position/width defects.
- Does it match a draft element to the **wrong** clone element, scoring a real diff as a
  match? Its matching is by normalised text content.
- Does the **meaningful-props blocklist** exclude properties that carry real defects?
- Does an element with **no text** (spacers, image wrappers, containers) get compared?
- The run reports `fluid_declined: 35 / 35 / 7` and `sub_visible: 54`. What is being
  declined and bucketed, and is a real defect being dropped into those buckets?

### 1.3 The one cluster that is real but misattributed

**font-size 77 + line-height 74 = 151 diffs, 29 % of the total, concentrated at 375/768.**
Root cause PROVEN and researched — see Phase 2.1. Do not re-investigate; verify only that
no *other* cause hides inside this cluster.

**Deliverable:** a written finding per item, each fact-checked, naming what the tool
measures, what it fails to measure, and why.

---

# Phase 2 — Fix the ruler and the base type

### 2.1 Base font size — decided, needs building

**Researched 2026-09-08, high confidence.** Full findings:
`~/.claude/memory/research/2026-09-08-mobile-base-font-size-16px-vs-14px.md`

**Verdict: 16px, expressed as `1rem`. Never fluid-shrink the base below 16px.**
- No major design system shrinks base body below 16px on mobile (Bootstrap, Tailwind,
  GOV.UK all 16px; Apple HIG 17pt).
- iOS Safari zooms the viewport when a form input's font-size is under 16px. SGS ships
  form blocks, so a 14px base is a live bug, not a theoretical one.
- WCAG mandates no absolute px minimum — do not cite 16px as a WCAG requirement.
- `1rem` rather than a literal `16px`, so a user who raised their browser default keeps it.
- Fluid scaling stays useful for headings; the base is where it does damage.

**Mechanism, proven:** `theme-extractor/typography.py:71` emits the base as a bare px
literal (`f"{int(fs_px)}px"`). WordPress fluidises any literal when
`settings.typography.fluid` is on, producing
`clamp(14px, -0.9075px + 0.875rem + 0.242vw, 16px)` — 14px at 375, 16px at 1440. The
framework's own `theme.json` escapes this by referencing a preset with `"fluid": false`;
the client snapshot does not, because the extractor writes a literal.

⛔ **Do not hand-edit `sites/mamas-munches/theme-snapshot.json`.** It is generated
(Spec 33, FR-33-3). An edit there is overwritten by the next extraction and is exactly
the hardcode-to-match-this-draft failure this document forbids.

**Design choice for Bean before building — do not pick one unilaterally:**
- **(a)** Extractor emits the base as a preset reference with `"fluid": false` (adding a
  base preset). Keeps fluid available for headings. More moving parts.
- **(b)** Extractor sets `settings.typography.fluid: false` when the draft itself uses no
  fluid type. More faithful to "transfer what the draft has"; loses heading fluidity.

### 2.2 Fix the parity tool

Driven by Phase 1. At minimum it must stop reporting `::after`-painted backgrounds and
borders as missing, and must handle art-directed sibling media. Whatever else Phase 1
finds, the tool needs to measure **layout geometry**, not only computed properties —
that is where most of the fourteen misses live.

**Every tool fix needs a negative control**: prove the check still FAILS on a genuine
defect. A tool that reports 100 % because it stopped looking is worse than the bent ruler
we have.

**Re-baseline after fixing.** The current 81 % is measured with a broken instrument. We
need a true starting number before judging any later work.

---

# Phase 3 — Root-cause every cloning defect

Investigation with fact-checking. No fixes until each is written up and reviewed.

### Bean's findings — none of these were caught by the tool

| # | Defect | Notes |
|---|---|---|
| 3.1 | **Hero escapes the right edge of the page on every device** | Bean: "a huge issue". The tool sees a constant ~9px overrun at rest (1440→1449, 768→777, 375→384). Likely the same cause as 3.2. |
| 3.2 | **Hero has -24px margins on both sides, and looks too tall** | A negative margin would explain 3.1. Find what emits it — a breakout hack, or a faithfully-transferred draft value? |
| 3.3 | **Hero content column has no padding** | Check whether the draft's padding is extracted at all, and whether it reaches the right element. |
| 3.4 | **Trust bar's 4th icon (star) renders black**; the other three match the draft | One icon differing points at the icon-identity resolver or a per-item colour attribute. |
| 3.5 | **Products section layout wrong** | Draft: both products in one grid filling the container — product 1 at 2/3 width, trial pack at 1/3. Clone does not do this. |
| 3.6 | **Product-card typography wrong in several places** | Product name missing its weight; price font-family wrong. Compare every element against the draft, not just these two. |
| 3.7 | **Brand image fits to width and is zoomed in** | Should match the draft's height instead. Relates to `objectFit`/sizing-mode. |
| 3.8 | **Ingredients: intro and disclaimer blocks sit left** | Their *text* is centred; the blocks themselves are not. A block-alignment defect, distinct from text-align. |
| 3.9 | **`section-heading__intro` has no bottom margin — but only in the ingredients instance** | It works in the featured-product instance. ⚠ An earlier note called this an "internal element of a composite". Bean corrected that: it is not. Two instances of the same thing behaving differently is the strongest clue here. |
| 3.10 | **Gift card titles (h3) and prices use the wrong font family** | |
| 3.11 | **The container holding both gift cards has no bottom margin** | |
| 3.12 | **"Find out more" link is missing its underline-on-hover** | Draft: `.sgs-announcement-bar--send-to-ward a:hover { text-decoration: underline }`. |
| 3.13 | **Trustpilot bar has too much white space at the bottom** | Top and bottom spacing should match, as they do in the draft. |
| 3.14 | **Review cards have lost their outlines** | We legitimately diverge by using a slider; that does not excuse dropping the card borders. |

### Items previously reported as open — re-check before spending time

| # | Claim | Status |
|---|---|---|
| 3.15 | Borders not transferring | **Bean says already working.** Likely a Phase 1 false positive. Confirm, then close. |
| 3.16 | `max-width: 1280px` applied to 3 elements the draft never capped | Bean: "Where does this exist? It's not visible anywhere." Either show the visible effect or close it. Caused by `sgs/container`'s `contentWidth` default `"normal"` — the sibling of the `layout` default already fixed. |
| 3.17 | `flex-grow: 1` on two buttons and the hero content | Bean has seen no button expand. `flex-grow: 1` means "take a share of the leftover space on this row" — it changes width, not hover. Confirm whether it has any visible effect; close if not. |
| 3.18 | Pill styling drift (weight 600→500/700, text-align, 1px padding) | Bean cannot see it. Some are likely equivalent-by-different-mechanism (draft centres with `text-align`, clone with `justify-content`). Confirm visually before treating as defects. |
| 3.19 | `background-size: auto` → `cover` on three images | Name which images, and whether it changes anything visible. Bean's instruction: **our defaults should align with the draft's.** |
| 3.20 | Product-card gaps wrong | Bean: they look fine. Probably another false positive. |

### Not a defect — answer and close

**3.21** `<a class="skip-link screen-reader-text" id="wp-skip-link" href="#main">Skip to
content</a>` is a standard WordPress accessibility feature, not clone bleed. It lets
keyboard and screen-reader users jump past the navigation, and it is required for WCAG
2.4.1 (Bypass Blocks). It is visually hidden until focused, which is why it only appears
in the markup. **One thing to verify:** that its `#main` target exists on the page — a
skip link pointing at nothing is a real accessibility bug.

---

# Phase 4 — Fix the defects

Only after Phase 3 finishes. Each fix cites its written root cause, changes the general
mechanism, and lands with a live measurement showing the before and after values.

**Order:**
1. Anything shared by several defects (typography routing, alignment, sizing) — one fix,
   many symptoms.
2. The hero overrun (3.1/3.2) — most visible, on every device.
3. The rest, worst-looking first.

Re-run the clone and re-measure after each group. Expect the score to *drop* when the
tool is fixed: that is the bent ruler being straightened, not a regression.

---

## Recently fixed — do not re-investigate

Committed and verified live on 2026-09-07/08:

Trustpilot slider 0px collapse · hero hover-zoom scrolling the page · button forced 10px
radius · gift badge square corners (bare-number-as-preset-slug) · footer columns rendering
sideways · footer credit placement, size and hover · wrong site-wide nav menu · hero
paragraph spacing · brand image never extracted · wrong pack size preselected · "Find out
more" link colour · `sgs/container` layout default (flex → flow).

Two claims corrected on the record: the hero's `max-width: 420px` and the trust-bar font
sizes are **faithful** — the draft specifies both. They were wrongly reported as defects.
