# Clone-fidelity programme — measure honestly, then fix the pipeline

**Target:** Mama's Munches homepage, WordPress page 2742 on the sandybrown canary.
**Draft (source of truth):** `sites/mamas-munches/mockups/homepage/index.html`
**Latest parity run:** `pipeline-state/mamas-munches-homepage-2026-09-08-105524/`
**Current score:** CSS 79 / 79 / 84 % at 375 / 768 / 1440. Content 99 %.

## Before you start — reading gate and build facts

⛔ **Read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` END TO END first.** Project CLAUDE.md
makes this mandatory for every cloning-pipeline session — not just the sections for the day's
task, not a grep-and-skim. Issues surface mid-work in sections you were not planning to touch.
Also read `.claude/LEDGER.md` for live status, and `specs/20-CLONE-FIDELITY-MEASUREMENT.md`
(the parity tool's own spec) before Phase 1.

⚠ **`npm run build` currently FAILS on `main`** — three pre-existing gates, none of them this
work: `check-element-manifest-conformance`, `check-editor-render-parity`,
`check-hover-state-classification`, across five blocks (heading / quote / timeline / text /
product-faq). Three gates, five blocks. **Build with
`npx wp-scripts build --experimental-modules --webpack-copy-php` instead.** Do not fix them and
do not raise their baselines — they are committed debt owned elsewhere.

⚠ **Two operational rules that will otherwise cost an hour each:**
- The pre-commit visual-diff gate needs a `source_sha` matching the STAGED content. It prints
  the expected hash when it fails — put that in the report and re-commit. Never fabricate a PASS.
- Deploying needs a clean tree, but the gate needs live proof, which needs a deploy. Break that
  deadlock honestly with `build-deploy.py --payload <prefix>`: deploy the declared payload
  uncommitted, measure, THEN commit. Do not reach for `--allow-dirty` or `--no-verify`.

---

## How to classify every item — read before Phase 1

Each item below carries a **CLASS**. Bean's framing, and it is the organising idea of this
whole document:

| Class | Meaning |
|---|---|
| **BOTH** | A real clone defect AND proof of a tool blind spot — the page renders wrong *and* the tool scored it clean. **Every one of Bean's 14 eyeball findings is BOTH, by definition: he found them, the tool did not.** |
| **TOOL** | The tool reports a defect that is not visible on the page. The tool is the bug. Every item Bean looked at and could not see falls here until proven otherwise. |
| **CLONE** | A real render defect the tool DID correctly catch. Rare in this batch. |
| **BUILD GAP** | Framework chrome that was never finished — not cloned, so not a clone defect, but shipped broken to every client (the footer's dead links and missing socials). |
| **NEITHER** | Not a defect and not a tool failure (only the skip-link, 3.24). |

**A BOTH item produces two deliverables, not one:** the render fix, AND the answer to "what
blind spot let the tool miss this?" — fed into Phase 1. Closing only the render half leaves
the tool just as blind for the next clone, which is how fourteen defects accumulated unseen.

**Do not assume a TOOL item is closed just because Bean cannot see it.** Prove it renders
correctly, then fix the tool so it stops reporting it. An unexplained false positive is a
defect in the instrument we are about to trust.

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
2. **Run investigations through a council — `/qc-council` for fix-shape validation,
   `/adversarial-council` for a design before it is built.** At minimum, a second agent
   must try to FALSIFY each finding before it is accepted; a lone agent's claim is not a
   finding. State PROVEN (cited to file:line or a measured value) or UNPROVEN. Three
   claims were disproven this week by exactly this check — a "missing" background that
   renders correctly on `::after`, a draft line-number citation pointing past the end of
   the file, and a font-size "drift" where clone and draft already matched.
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

## 1.1 False positives — it reports defects that are not real

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

**Four elements are reported as having no counterpart — not one.** CLASS: TOOL (suspected).

```
img:freshly baked mamas munches lactation co   lost 2 / 3 / 3 props
" i was sceptical but honestly these have mad" lost 0
" bought these for my best friend who was rea" lost 0
" zainab is so responsive and lovely the cook" lost 0
```

- **The image.** Bean confirms both the desktop and mobile hero images ARE present, so this
  is a matching failure, not a missing image. Art-directed tiers render as sibling elements
  toggled by `@media`, so the hidden-at-this-width sibling never matches. **Does the tool
  handle per-device sibling media at all?** If not it misreports every art-directed image on
  every clone. ⚠ It is ONE of four unmatched elements — do not treat it as "the whole missing
  1 %", which is how this was first written and is wrong.
- **The three review cards.** These are the `<article>` elements of the testimonial slider,
  and they sit directly against **3.14 (review cards lost their outlines)**. They lose 0
  scored props, so they cost nothing in the score — which is exactly why a real defect on
  those elements could go unseen. Triage them together with 3.14, not separately.

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

### 1.4 The complete parity ledger — every cluster must be triaged

**524 diffs total.** Every one belongs in exactly one bucket by the end of Phase 1:
REAL DEFECT, TOOL ARTEFACT, or EQUIVALENT-BY-DIFFERENT-MECHANISM (clone reaches the same
visible result another way — legitimate, and the tool should stop scoring it).

Counts are per-viewport (375 / 768 / 1440).

| Cluster | Diffs | 375 | 768 | 1440 | Status entering Phase 1 |
|---|---|---|---|---|---|
| font-size | 77 | 35 | 35 | 7 | Root cause proven → §2.1 |
| line-height | 74 | 34 | 35 | 5 | Same cause as above |
| background-color | 36 | 12 | 12 | 12 | Proven artefact (`::after`) — confirm all 7 elements |
| margin-bottom | 30 | 10 | 10 | 10 | **Untriaged cluster.** 3.9/3.11 are two instances; what are the rest? |
| font-weight | 21 | 7 | 7 | 7 | **Untriaged.** Includes 3.6 (product name weight). Not only a pill issue |
| justify-content | 16 | 6 | 5 | 5 | **Untriaged.** May be equivalent-by-mechanism; prove it |
| text-align | 15 | 5 | 5 | 5 | **Untriaged.** Related to 3.8 (blocks left vs text centred) |
| padding (4 sides) | 48 | 16 | 16 | 16 | **Untriaged.** Includes 3.3 (hero content padding) |
| border-* family (12 props) | 72 | 24 | 24 | 24 | Bean says borders work — likely artefact, confirm (3.18) |
| background-size / repeat / position | 36 | 12 | 12 | 12 | Treat as ONE image-background cluster (3.22) |
| border-image-slice | 12 | 4 | 4 | 4 | **Unmentioned until now.** Probably rides with the background cluster |
| appearance | 12 | 4 | 4 | 4 | **Unmentioned until now.** Likely form/button UA-style difference |
| max-width | 10 | 4 | 3 | 3 | 3.19 — Bean cannot see it; decide if real |
| row-gap / column-gap | 18 | 6 | 6 | 6 | Bean says product-card gaps look fine (3.23) |
| font-style | 9 | 3 | 3 | 3 | **Unmentioned until now.** Italic vs normal somewhere |
| flex-grow | 9 | 3 | 3 | 3 | 3.20 — Bean sees no effect |
| align-items | 8 | 2 | 3 | 3 | **Unmentioned until now.** Alignment — may relate to 3.8 |
| display | 4 | 2 | 1 | 1 | **Unmentioned until now.** flex vs block on a tag element |
| max-height | 3 | 1 | 1 | 1 | **Unmentioned until now.** May relate to 3.7 (brand image sizing) |
| flex-basis | 3 | 1 | 1 | 1 | **Unmentioned until now.** |
| margin-left / margin-right | 8 | 0 | 4 | 4 | **Unmentioned until now.** Absent at 375 — a tablet/desktop-only centring or gutter difference |
| order / object-position / flex-direction | 3 | 3 | 0 | 0 | **Unmentioned until now.** Mobile-only — art-direction ordering? |

**Rows above sum to exactly 524 — the full MISMATCH population.** ⚠ That is not the whole story:
**unmatched-element losses are a separate bucket** (`meaningful_props_lost_to_unmatched`, 2/3/3
across the four elements in §1.1), and so are `fluid_declined` (35/35/7) and `sub_visible` (54).
A cluster that cannot be placed in one of the three buckets is a finding about the tool, not a
rounding error — and work must not be scoped out on the grounds that "524 is everything".

⚠ Nine of these rows (**62 diffs, ~12 %**) had never been looked at before this document — the
rows marked "Unmentioned until now" above, summed. (The LEDGER quotes 78 for the same idea
because it counts `background-repeat` and `background-position` separately; this table folds
those into the image-background cluster instead. Same properties, different grouping — 62 is the
figure that reconciles with the table you are reading.) Four of the largest — margin-bottom, padding, font-weight, justify-content —
were previously dismissed inside a single anecdote about pill styling that Bean says he
cannot see. **Do not inherit that dismissal.** Triage each cluster on its own evidence.

**Deliverable:** a written finding per item, each fact-checked, naming what the tool
measures, what it fails to measure, and why.

---

# Phase 2 — Fix the ruler and the base type

## 2.1 Base font size — decided, needs building

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

### 2.1a Fluid typography — measured, decided, needs building

Bean asked: *are fluid sizes even helpful, and do the current sizes cause a problem on
small devices? If not, switch it off.* Measured answer: **do not switch it off globally.**

Two facts, both checked:

**Fluid is redundant for CLONED content.** The draft carries its own responsive
typography — 13 media queries, 11 font-size declarations inside them — and the converter
already transfers those as explicit per-device values (84 tiered `fontSize` objects in the
last run, e.g. `{"desktop":52,"mobile":34}`). Fluid is a second, competing mechanism
shrinking text the draft never asked to shrink.

**But fluid IS load-bearing for HAND-AUTHORED content.** Theme patterns use the big presets
with no mobile tier at all — 24 × `xx-large`, 8 × `hero`, authored as
`{"desktop":"xx-large"}`. Switch fluid off wholesale and those render at full desktop size
on a phone:

| Preset | Desktop | With fluid @375 | Without fluid @375 |
|---|---|---|---|
| `hero` | 50px | 32px | **50px** |
| `xx-large` | 36px | 26px | **36px** |

**Recommendation — switch it off selectively:**
- **Remove fluid from the base body** — this is the actual bug (§2.1).
- **Remove it from `small`** (14→13px): it drops below a sensible floor and buys nothing.
- **Keep it on `large` / `x-large` / `xx-large` / `hero`**, where it prevents a 50px
  heading on a 375px screen.

This also matches the research verdict: fluid earns its keep on display text; the base is
where it does damage.

### 2.1b Footer text size — answered, no action unless Bean wants it

Bean asked why footer text is smaller than the rest of the site and said it should match
"unless there's a good reason".

**There is a good reason: the draft designs it that way.**

```
.sgs-footer__tagline      font-size: 14px
.sgs-footer__meta         font-size: 13px
.sgs-footer__col ul li a  font-size: 14px
                          font-size: 13px / 11px
```

The draft's footer runs 11–14px against its 16px body. The framework footer pattern uses
14px for links and body text, which **matches the draft's 14px exactly**. Raising it would
move away from the design, not toward it.

⚠ One caveat worth stating: the footer is framework chrome and is NOT cloned from the
draft, so this match is convention rather than derivation. If Bean wants the footer at body
size anyway, that is a design preference and a one-line pattern change — not a bug fix, and
it affects every client using the default footer.

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

## Bean's findings — none of these were caught by the tool

**All fourteen are CLASS: BOTH** — a real render defect AND proof of a tool blind spot, because
Bean found every one of them by eye and the tool scored them clean. Each therefore owes two
answers: the render fix, and what let the tool miss it (feed that to Phase 1).

| # | Defect | Notes |
|---|---|---|
| 3.1 | **The hero block extends outside the right side of the page, on every device** | Bean's own observation, and he calls it "a huge issue" — treat his eye as the finding, not the number. The tool separately shows a constant overrun at rest (1440→1449, 768→777, 375→384), but that instrument is the one under suspicion, so use it as corroboration only. Likely the same cause as 3.2. |
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

### Content defects found by audit, not by the parity tool

| # | Defect | Class | Notes |
|---|---|---|---|
| 3.15 | **Every footer link points nowhere — `href="#"`** | BUILD GAP | Home / Shop / About / Contact / Privacy Policy are all placeholders in the shipped `sgs/framework-footer-default` pattern's list block. Not a clone bug — the footer is framework chrome and is never cloned — but it ships broken navigation on every client site using the default footer. The draft's own footer carries 12 real links in two columns (Shop / Information); ours has one generic column of 5. ⚠ **BLOCKED ON BEAN: ask him for the real page URLs at the START of the session, not at the end.** Do not invent them, and do not let this stall silently. |
| 3.16 | **The mobile hero image has the wrong alt text** | BOTH | It carries the DESKTOP image's alt ("Close-up of Mama's Munches Zookies — real ingredients, baked fresh") instead of its own draft alt ("Freshly baked Mama's Munches lactation cookies on a warm background"). Invisible to a text-matcher because alt is a non-visible attribute on an element hidden at that viewport — a genuine tool blind spot. Distinct from the art-direction matching question in §1.1: the image IS present (Bean confirmed); its alt is simply copied from the wrong source. |
| 3.17 | **Footer social links missing** | BUILD GAP | The draft's footer declares Instagram and WhatsApp links; neither renders. Same class as 3.15. |

### Items previously reported as open — re-check before spending time

| # | Claim | Class | Status |
|---|---|---|---|
| 3.18 | Borders not transferring | TOOL | **Bean says already working.** Likely a Phase 1 false positive. Confirm, then close. |
| 3.19 | `max-width: 1280px` applied to 3 elements the draft never capped | TOOL | Bean: "Where does this exist? It's not visible anywhere." **First establish whether the defect is real and visible at all** — do not start from a cause. If it IS real, one candidate worth testing (not assumed) is `sgs/container`'s `contentWidth` default `"normal"`, the sibling of the `layout` default already fixed. If it is not visible, close it and fix the tool instead. |
| 3.20 | `flex-grow: 1` on two buttons and the hero content | TOOL | Bean has seen no button expand. `flex-grow: 1` means "take a share of the leftover space on this row" — it changes width, not hover. Confirm whether it has any visible effect; close if not. |
| 3.21 | Pill styling drift (weight 600→500/700, text-align, 1px padding) | TOOL | Bean cannot see it. Some are likely equivalent-by-different-mechanism (draft centres with `text-align`, clone with `justify-content`). Confirm visually before treating as defects. |
| 3.22 | Image-background cluster: `background-size` auto→cover, plus `background-repeat` and `background-position` (12 diffs each, 36 total) and probably `border-image-slice` (12) | BOTH | Treat as ONE cluster — the same handful of image elements almost certainly drives all four properties. Bean asked three things: **which images**, **does it change anything visible** versus the draft's `auto`, and — his instruction — **our defaults should align with the draft's**. Answer all three. |
| 3.23 | Product-card gaps wrong | TOOL | Bean: they look fine. Probably another false positive. |

### Not a defect — answer and close

**3.24 — CLOSED, verified. CLASS: NEITHER.** `<a class="skip-link screen-reader-text" id="wp-skip-link"
href="#main">Skip to content</a>` is a standard WordPress accessibility feature, not clone
bleed. It lets keyboard and screen-reader users jump past the navigation, and it is
required for WCAG 2.4.1 (Bypass Blocks). It is visually hidden until focused, which is why
it only shows up when reading the markup.

Its target was checked live on 2026-09-08: `#main` resolves to a real `<main id="main">`
element on the page. The link works. **No action.**

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

## Adjacent open work — not this programme, but do not lose it

**The colour-census gate does not protect already-migrated rows.** A negative control was run on
2026-09-07 and FAILED: breaking a migrated row's base attribute still reported PASS, because the
census only admits rows that are still non-conformant — a migrated row leaves the population
entirely. The gate guards the frontier, not the territory. Fix, if wanted: `--check` needs a
recorded roster of completed rows written at migration time, and must re-assert those still
resolve. Until then, do not describe that gate as protecting the colour work. Full detail in
`.claude/LEDGER.md`.

## Recently fixed — do not re-investigate

Committed and verified live on 2026-09-07/08:

Trustpilot slider 0px collapse · hero hover-zoom scrolling the page · button forced 10px
radius · gift badge square corners (bare-number-as-preset-slug) · footer columns rendering
sideways · footer credit placement, size and hover · wrong site-wide nav menu · hero
paragraph spacing · brand image never extracted · wrong pack size preselected · "Find out
more" link colour · `sgs/container` layout default (flex → flow).

Two claims corrected on the record: the hero's `max-width: 420px` and the trust-bar font
sizes are **faithful** — the draft specifies both. They were wrongly reported as defects.
