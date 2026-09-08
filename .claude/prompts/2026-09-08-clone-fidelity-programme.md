# Clone-fidelity programme — root-cause and fix every real clone/website defect

**Target:** Mama's Munches homepage, WordPress page 2742 on the sandybrown canary.
**Draft (source of truth):** `sites/mamas-munches/mockups/homepage/index.html`

## Tool-fixing half is DONE — this document now governs Phase 3/4 only

The original brief split into four phases: fix the measuring instrument (parity tool), then
root-cause and fix the real defects it should now catch. **Phase 1 and Phase 2.2 (the parity
tool itself) are closed** — `plugins/sgs-blocks/scripts/parity/computed-parity.js` shipped a
run of fixes this session: `::after`/`::before` paint-fallback comparison, a wider bare-tag
defaults census, BEM same-family collision merge (deterministic) + statistical best-pairing
fallback (both collision paths, box AND text), art-direction-aware... — check
`git log --oneline -- plugins/sgs-blocks/scripts/parity/computed-parity.js` for the exhaustive
commit list rather than trusting a summary here, since it will drift. The tool's own commit
messages carry the full root-cause + fix-shape + verification detail per change.

**What this means for every classification below:** every `TOOL` / `BOTH` label in this
document was assigned against the OLD, now-fixed instrument. **Re-verify, don't inherit.**
An item marked `TOOL` (false positive) may now correctly score as a real defect once the fix
lands, or may still be a false positive for a genuinely different reason — check against a
fresh run, not the old label. **Re-baseline before trusting any percentage in this document** —
the "Current score" the original brief opened with is stale by construction; straightening the
ruler is expected to LOWER the score (false wins removed), not raise it.

## Before you start — reading gate and build facts

⛔ **Read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` END TO END first.** Project CLAUDE.md
makes this mandatory for every cloning-pipeline session — not just the sections for the day's
task, not a grep-and-skim. Issues surface mid-work in sections you were not planning to touch.
Also read `.claude/LEDGER.md` for live status, and `specs/20-CLONE-FIDELITY-MEASUREMENT.md`
(the parity tool's own spec) so you know what the (now-fixed) instrument actually measures.

⚠ **`npm run build` may still fail on pre-existing, unrelated gates** — check current state
rather than trusting a cached list here; it drifts. Build with
`npx wp-scripts build --experimental-modules --webpack-copy-php` directly if the full gate
chain blocks on debt that isn't yours, per the project's git-hygiene disclosed-bypass rule.

⚠ **Two operational rules that will otherwise cost an hour each:**
- The pre-commit visual-diff gate needs a `source_sha` matching the STAGED content. It prints
  the expected hash when it fails — put that in the report and re-commit. Never fabricate a PASS.
  A genuinely no-visual-effect change (structural/markup-only) can use the scoped
  `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."` bypass instead — disclosed, never
  `--no-verify`.
- Deploying needs a clean tree, but the gate needs live proof, which needs a deploy. Break that
  deadlock honestly with `build-deploy.py --payload <prefix>`: deploy the declared payload
  uncommitted, measure, THEN commit. Do not reach for `--allow-dirty` or `--no-verify`.
- The pre-deploy `oldshape-audit` gate scans the ENTIRE live site's stored content against the
  schemas being deployed, not just the page you're touching — a HIGH finding anywhere on the
  canary blocks every deploy until fixed or genuinely baselined. Check it isn't pre-existing,
  unrelated debt before spending time on it; if it is yours (or you're already in that code),
  fix it via `wp_update_post(wp_slash(...))`, never a raw WP-CLI content flag (backslash-strip
  risk).

---

## Working method — binding on every phase

1. **Investigation and fixing are separate jobs, run as separate dispatches.** An agent
   that investigates does not fix. An agent that fixes works from a written,
   already-reviewed root cause.
2. **Run every fix-shape through `/qc-council` before implementing, and again to confirm the
   fix actually closed it before moving to the next item.** Two council passes per fix, not
   one: validate the proposed fix-shape BEFORE building (catches a wrong diagnosis before it
   costs a build cycle), then verify the shipped result actually closed the defect (catches a
   fix that looked right but didn't land) before starting the next item. Do not batch several
   fixes and council them together — one item closed and confirmed before the next begins.
   `/adversarial-council` for a design decision before it is built, where the fix-shape isn't
   obvious. At minimum, a second agent must try to FALSIFY each finding before it is accepted;
   a lone agent's claim is not a finding. State PROVEN (cited to file:line or a measured value)
   or UNPROVEN.
3. **Explain the fix before building it.** Say which mechanism is wrong and what the
   change is, then wait. This exists to catch the failure mode below.
4. ⛔ **Never hardcode a value to make this draft pass.** The deliverable is a pipeline
   that clones *any* draft. A fix that special-cases `sgs-gift-section`, or writes a
   literal from this mockup into framework code, is a defect even when the page then
   looks right. If a fix cannot be made general, say so and stop.
5. **Read the draft before claiming anything about it.** The file is 1,088 lines — read the
   relevant section directly, don't cite a line number from memory.
6. **Block CSS is lifted to `wp-content/uploads/sgs-css/*.css`, never inline.** Grepping
   page HTML for a rule proves nothing. Measure computed styles, or read that stylesheet.
7. **Verify a "no counterpart" claim against the live DOM**, using the now-fixed tool's own
   report plus a direct Playwright check — don't take either alone as final.

---

# Phase 3 — Root-cause every cloning defect

Investigation with fact-checking. No fixes until each is written up and reviewed.

## How to classify every item

Each item below carries a **CLASS**. This is the organising idea of this whole document —
re-verify every label against the FIXED tool before acting on it (see the note at the top):

| Class | Meaning |
|---|---|
| **BOTH** | A real clone defect AND (against the OLD tool) proof of a blind spot — the page rendered wrong *and* the old tool scored it clean. Re-check whether the fixed tool now catches it. |
| **TOOL** | Against the OLD tool, it reported a defect that wasn't real. Re-run against the fixed tool before trusting this label — it may now report correctly, or may still be a false positive for a different, still-open reason. |
| **CLONE** | A real render defect the tool correctly caught, then and now. |
| **BUILD GAP** | Framework chrome that was never finished — not cloned, so not a clone defect, but shipped broken to every client (the footer's dead links and missing socials). |
| **NEITHER** | Not a defect and not a tool failure (only the skip-link, 3.24). |

**A BOTH item produces one deliverable now, not two** — the tool half is closed programme-wide;
only the render fix remains.

## Bean's findings — none of these were caught by the OLD tool

| # | Defect | Notes |
|---|---|---|
| 3.1 | ✅ **CLOSED 2026-09-08.** ~~The hero block extends outside the right side of the page, on every device~~ | Root cause: `hero/style.css`'s alignfull negative-margin rule negated a padding value nothing in the real ancestor chain ever applied (CSS custom properties inherit regardless of whether anything consumes them as real padding). Fixed by removing the negation entirely — matches the draft's own CSS (no margin at all) and the framework's documented width model (D725). Commit `33d4b4161`. Live-verified both viewports, `scrollWidth == clientWidth`, report: `reports/visual-diff/hero-2026-09-08.md`. |
| 3.2 | ✅ **CLOSED 2026-09-08 — same fix as 3.1.** ~~Hero has -24px margins on both sides, and looks too tall~~ | Same root cause as 3.1; one fix closed both. The "too tall" half specifically was never independently proven as a distinct bug — plausibly just the overrun reading as oversized. Not separately re-checked post-fix; flag if Bean still sees it. |
| 3.3 | ✅ **CLOSED 2026-09-08 — same fix as 3.1.** ~~Hero content column has no padding~~ | Was never actually missing — the -24px shift moved the content box far enough left that on mobile it consumed its own padding budget, reading as absent. Confirmed padding correctly present post-fix (28px/20px/40px/20px mobile, 72px/64px desktop) — see `reports/visual-diff/hero-2026-09-08.md`. |
| 3.4 | ✅ **CLOSED 2026-09-08.** ~~Trust bar's 4th icon (star) renders black; the other three match the draft~~ | Root cause: the cloning pipeline's icon-identity resolver couldn't match this badge's 10-point-star shape to a known Lucide slug, so it fell back to passing the draft's raw SVG through verbatim — including an inline `style="fill: var(--primary-dark)"` that referenced a CSS variable undefined on the live page, collapsing to black by CSS's own initial-value fallback, beating the block's real colour mechanism purely on inline-vs-stylesheet precedence. Fixed by stripping the inline `style` attribute from this ONE fallback path only (trust-bar's icon-resolver-miss branch) — scoped so a different, legitimate raw-SVG use elsewhere (uploaded brand logos) keeps its own colouring. Live-verified: star now `fill: rgb(197,106,122)`, exact match to the other 3 badges, shape intact. |
| 3.5 | **Products section layout wrong** | Draft: both products in one grid filling the container — product 1 at 2/3 width, trial pack at 1/3. Clone does not do this. |
| 3.6 | **Product-card typography wrong in several places** | Product name missing its weight; price font-family wrong. Compare every element against the draft, not just these two. |
| 3.7 | ✅ **Already resolved, verified live 2026-09-08.** ~~Brand image fits to width and is zoomed in~~ | Confirmed already fixed by the earlier "brand image never extracted" work (see Recently Fixed) — the block's `height` tier property correctly constrains the box at both viewports (`object-fit:cover`, no stretch, screenshots clean at 1440px and 375px). Not open. See 3.26 for a separate, currently-invisible bug found while re-checking this. |
| 3.8 | **Ingredients: intro and disclaimer blocks sit left** | Their *text* is centred; the blocks themselves are not. A block-alignment defect, distinct from text-align. |
| 3.9 | **`section-heading__intro` has no bottom margin — but only in the ingredients instance** | It works in the featured-product instance. Two instances of the same thing behaving differently is the strongest clue here. |
| 3.10 | **Gift card titles (h3) and prices use the wrong font family** | |
| 3.11 | **The container holding both gift cards has no bottom margin** | |
| 3.12 | **"Find out more" link is missing its underline-on-hover** | Draft: `.sgs-announcement-bar--send-to-ward a:hover { text-decoration: underline }`. |
| 3.13 | **Trustpilot bar has too much white space at the bottom** | Top and bottom spacing should match, as they do in the draft. |
| 3.14 | **Review cards have lost their outlines** | We legitimately diverge by using a slider; that does not excuse dropping the card borders. **Caveat from this session's investigation:** the earlier fix for this landed on `sgs/testimonial`'s `classic-card` variant border — the live page actually uses `sgs/testimonial-slider`, which has NO border rule anywhere for its card items. **Still genuinely open for the block that's actually live.** |
| 3.19 | `max-width: 1280px` applied to 3 elements the draft never capped | Re-verify against the fixed tool first — establish whether the defect is real and visible at all before starting from a cause. One candidate worth testing (not assumed): `sgs/container`'s `contentWidth` default. |
| 3.20 | `flex-grow: 1` on two buttons and the hero content | Re-verify visible effect against the fixed tool. |
| 3.21 | Pill styling drift (weight 600→500/700, text-align, 1px padding) | Some may be equivalent-by-different-mechanism (draft centres with `text-align`, clone with `justify-content`) — re-verify against the fixed tool before treating as defects. |
| 3.22 | Image-background cluster: `background-size`/`background-repeat`/`background-position`/`border-image-slice` | **This session's investigation found the likely real mechanism**: these properties are semantically inert on `<img>` elements (they paint via `src`, not a CSS background layer) — the fixed tool may still report diffs here that are TOOL noise, not real defects, on `<img>` targets specifically. Re-verify per-element before treating any of these as a real defect; `object-fit`/`object-position` (which DO apply to `<img>`) are the ones that matter. |
| 3.23 | Product-card gaps wrong | Re-verify against the fixed tool. |

## Real defects surfaced incidentally by the tool-fixing session (new, not yet actioned)

Found while triaging previously-unattributed CSS-diff clusters (padding, flex-basis/max-height)
during the tool-fix work — genuine clone defects, not tool artefacts, never fixed:

| # | Defect | Notes |
|---|---|---|
| 3.25 | **Product-card pack-size pills carry the wrong padding** | Draft: `.sgs-product-card__pill { padding: 7px 13px }` on all 4 pack-size buttons. Clone renders `padding: 8px 16px` — `sgs/option-picker`'s hardcoded medium-tier default, not the draft's measured value. The block DOES support a custom `pillPadding` override; the converter isn't emitting it, it's just picking the nearest size tier. |
| 3.26 | ⚠ **RECLASSIFIED 2026-09-08 — re-investigated, original diagnosis wrong.** ~~Brand image has no `max-height` cap~~ → **new finding: `max-height`/`max-width` are inert site-wide on `sgs/media`, invisible bug.** | The converter DOES correctly emit `maxHeight:{desktop,mobile}` on the stored block (confirmed live on page 2742: `{"desktop":"440px","mobile":"380px"}`, matches the draft exactly) — the original "converter isn't emitting it" diagnosis was wrong, superseded. The REAL bug: the compiled per-page stylesheet writes `--sgs-media-max-height:440pxpx` — a double-unit typo — an invalid CSS length, so `max-height` computes to `none` everywhere (confirmed live: `none` at both 1440px and 375px). Same corruption on `--sgs-media-max-width:100%px`. **Currently cosmetically invisible** on this instance because `height` (correctly tiered, unaffected) already constrains the box. Root cause of the `pxpx` corruption not yet traced to source (likely a value-serialisation step appending a unit to an already-unitted value) — low priority (invisible today) but cheap and worth fixing since any block relying on `max-height`/`max-width` as its ONLY sizing constraint (no explicit `height` set) would render genuinely broken. Not yet fixed. |

### Content defects found by audit, not by the parity tool

| # | Defect | Class | Notes |
|---|---|---|---|
| 3.15 | **Every footer link points nowhere — `href="#"`** | BUILD GAP | Home / Shop / About / Contact / Privacy Policy are all placeholders in the shipped `sgs/framework-footer-default` pattern's list block. Not a clone bug — the footer is framework chrome and is never cloned — but it ships broken navigation on every client site using the default footer. ⚠ **BLOCKED ON BEAN: ask him for the real page URLs at the START of the session, not at the end.** Do not invent them, and do not let this stall silently. |
| 3.16 | **The mobile hero image has the wrong alt text** | BOTH | It carries the DESKTOP image's alt ("Close-up of Mama's Munches Zookies — real ingredients, baked fresh") instead of its own draft alt ("Freshly baked Mama's Munches lactation cookies on a warm background"). Was invisible to the OLD tool because alt is a non-visible attribute on an element hidden at that viewport, and it had no concept of a responsive image PAIR at all. **The fixed tool has no art-direction pairing mechanism either — this is still open on the tool side too**, tracked separately below. |
| 3.17 | **Footer social links missing** | BUILD GAP | The draft's footer declares Instagram and WhatsApp links; neither renders. Same class as 3.15. |
| 3.18 | Borders not transferring | TOOL | **Bean says already working.** Was likely an OLD-tool false positive from the `::after`/pseudo-element paint blindness, which is now fixed. Confirm, then close. |

### Not a defect — answer and close

**3.24 — CLOSED, verified. CLASS: NEITHER.** `<a class="skip-link screen-reader-text" id="wp-skip-link"
href="#main">Skip to content</a>` is a standard WordPress accessibility feature, not clone
bleed. It lets keyboard and screen-reader users jump past the navigation, and it is
required for WCAG 2.4.1 (Bypass Blocks). It is visually hidden until focused, which is why
it only shows up when reading the markup. Its target resolves to a real `<main id="main">`
element. **No action.**

---

# Phase 4 — Fix the defects

Only after each Phase 3 item finishes its own root-cause + `/qc-council` validation. Each fix
cites its written root cause, changes the general mechanism, and lands with a live measurement
showing the before and after values — then a SECOND `/qc-council` pass confirms it actually
closed, before starting the next item.

**Order:**
1. Anything shared by several defects (typography routing, alignment, sizing) — one fix,
   many symptoms. 3.7/3.26 (brand image sizing) are a likely pair — check first.
2. The hero overrun (3.1/3.2) — most visible, on every device.
3. The rest, worst-looking first.

Re-run the (now-fixed) parity tool and re-measure after each group. Expect the score to
fluctuate as real defects get fixed and any remaining tool artefacts get identified — that is
the instrument doing its job, not noise to ignore.

---

## Still-open tool gaps (found during Phase 1/2.2, not yet fixed — separate from Phase 3/4 defect work)

Two genuine gaps in the parity tool remain, found during this session's investigation but not
yet built. Not blocking Phase 3/4 — track separately, pick up when there's a natural pause:

- **No art-direction handling for responsive sibling images.** Two images shown at different
  breakpoints via CSS (like the hero's desktop/mobile pair, and 3.16 above) are captured
  independently per viewport with no awareness they're meant to be treated as one deliberate
  pair — a correct art-directed swap and a genuinely broken one still look identical to the
  tool. A fix design exists (group sibling `<img>`/`<picture>` elements sharing a
  device-tier-modifier class into one logical slot, reusing the `familyClusterFor` merge
  pattern already built for box collisions) but is not implemented.
- **Inert-property comparison on non-applicable elements.** Confirmed for `background-size`/
  `background-repeat`/`background-position`/`border-image-slice` on `<img>` tags (see 3.22) and
  `flex-basis` under a grid (not flex) parent — the tool compares a CSS property's computed
  value without checking whether the element/layout actually uses that property, producing
  diffs with zero visual effect on either side. Not yet fixed; likely needs a small
  element/layout-aware exclusion rather than a blanket property blocklist entry (a blocklist
  entry would also suppress the property where it DOES apply, e.g. `background-size` on a real
  background-painting `<div>`).

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
more" link colour · `sgs/container` layout default (flex → flow) · base body font-size
(clamp() rewrite of the literal 16px) · `sgs-tab__content` renamed to `sgs-tab__inner`
(collision-safety consistency, not a visible defect) · the parity tool itself (Phase 1/2.2,
this session).

Two claims corrected on the record: the hero's `max-width: 420px` and the trust-bar font
sizes are **faithful** — the draft specifies both. They were wrongly reported as defects.