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
| 3.5 | ✅ **CLOSED 2026-09-08.** ~~Products section layout wrong~~ | Root cause: the outer grid ratio (`gridTemplateColumns: 5fr 3fr`) was already faithfully transferred and correct — the bug was in `sgs/product-card`'s own CSS, a "yield to grid track width" rule using a direct-child combinator (`.sgs-container--grid > .product-card`) that stopped matching the moment the grid container also had a band prop set (contentWidth/padding/background), because `SGS_Container_Wrapper` only conditionally renders its `.sgs-container__inner` wrapper — the card became a grandchild, the rule went dark, and both cards fell back to an identical 380px standalone cap. qc-council caught that the obvious fix (a bare descendant selector) would have introduced a NEW regression — it would also strip the cap off a product-card nested several levels inside an unrelated non-grid sub-container. Fixed by chaining both known direct-child depths instead. Same bug class also found and fixed in `container/style.css`'s grid-item-defaults cascade. Live-verified: cards now render 640px/384px (exact 5:3 ratio, was ~380px/380px), flush together with no dead gap; the `/shop/` page's unrelated product-card grid confirmed unaffected. |
| 3.6 | ✅ **CLOSED 2026-09-08.** ~~Product-card typography wrong in several places~~ | The two originally-reported issues (title weight, price font-family) are ALREADY CORRECT live — both exact matches to the draft, evidently fixed alongside an earlier commit this session. A full element-by-element sweep (title/description/price/price-note/badge/CTA/pill) found one genuine remaining mismatch: the pack-size pill had NO `pillFontWeight`/`pillFontStyle` attributes declared at all (only `pillFontSize` existed) — `render.php` already forwarded a weight/style to the shared typography helper, but there was nothing for it to forward since the attributes didn't exist, and the editor's own typography-control row had `showWeight`/`showStyle` explicitly disabled. Added both attributes (mirroring the existing title/desc pattern exactly) + enabled the editor controls, and set this instance to the draft's values (13px/600, was falling back to a generic 14px/500 default). Live-verified: exact match, pills render cleanly. |
| 3.7 | ✅ **Already resolved, verified live 2026-09-08.** ~~Brand image fits to width and is zoomed in~~ | Confirmed already fixed by the earlier "brand image never extracted" work (see Recently Fixed) — the block's `height` tier property correctly constrains the box at both viewports (`object-fit:cover`, no stretch, screenshots clean at 1440px and 375px). Not open. See 3.26 for a separate, currently-invisible bug found while re-checking this. |
| 3.8 | ✅ **CLOSED 2026-09-08.** ~~Ingredients: intro and disclaimer blocks sit left~~ | Root cause: `sgs/text`'s `maxWidth` CSS emission (`render.php:236`) never paired a centring margin with it — `text-align:center` correctly centres the text INSIDE the box, but the box itself has no mechanism moving it within its parent, so it sits flush left. Confirmed as a genuine `sgs/text`-only outlier: a repo-wide check of every block emitting a bare `max-width` found `sgs/quote`/`sgs/testimonial`/`sgs/option-picker`/`sgs/before-after` all already pair it with `margin-inline:auto` (quote is the precedent this fix mirrors exactly); `sgs/decorative-image`'s bare max-width is unrelated (absolutely-positioned, not a flow-centring case). Fixed by adding `margin-inline:auto` alongside `max-width` whenever it's set. Live-verified: both elements now genuinely centred (equal gap both sides — 210px/210px and 170px/170px). Regression-checked against every other `maxWidth`-bearing `sgs/text` instance on the page (the hero's split-column intro) — unaffected, still correctly left-aligned there because its flex parent controls position, not the margin. |
| 3.9 | ✅ **CLOSED 2026-09-08.** ~~`section-heading__intro` has no bottom margin — but only in the ingredients instance~~ | Root cause: both instances are `sgs/text`, both draft rules set a bottom margin, but one uses the longhand `margin-bottom: 32px` (worked) and the other the 3-value shorthand `margin: 0 auto 36px` (dropped). This is the EXACT shorthand shape already fixed earlier the same session in `outer_box.py` (commit `eaca18055`, the auto-centring exclusion fix) — confirmed by direct test: the shared parser now correctly yields `{'bottom':'36px'}` for this input. The converter itself needed no new fix; the live page's stored content simply predated that fix. Applied as a content sync (`"margin":{"desktop":{"bottom":"36px"}}` added to the stored block, matching exactly what the already-fixed converter would emit on a fresh clone). Live-verified: 36px now applied, the working instance (32px) unaffected. |
| 3.10 | ✅ **CLOSED 2026-09-08 — already correct, stale report.** ~~Gift card titles (h3) and prices use the wrong font family~~ | Live-verified both cards: title and price both compute `font-family: Fraunces, serif`, exact match to the draft. Stored attributes confirm `fontFamily` correctly set on both text blocks. No defect present, no code change made. |
| 3.11 | ✅ **CLOSED 2026-09-08.** ~~The container holding both gift cards has no bottom margin~~ | Root cause: the grid container's `margin` attribute was simply unset on this instance — `sgs/container` already supports `margin` correctly (used properly on sibling blocks earlier in the same section), so this was a per-instance content gap, not a schema or render-path bug. Applied as a content sync (`"margin":{"desktop":{"bottom":"20px"}}`, matching the draft's `margin-bottom:20px`). Live-verified: 20px now applied, visible spacing confirmed before the next section. |
| 3.12 | ✅ **CLOSED 2026-09-08 — already working, original report stale/wrong.** ~~"Find out more" link is missing its underline-on-hover~~ | Live-verified: `text-decoration-line` is `none` at rest, `underline` on a real Playwright hover — the scoped CSS rule (`sgs/button`'s `textDecorationHover` attribute, already set to `"underline"` on this instance) is present and correctly targeted in the per-page lifted stylesheet. No code change made. First investigation pass wrongly concluded "no hover rules exist" by checking the block's static `style.css` — the actual rule lives in the PER-INSTANCE stylesheet this block emits at render time (lifted, per this project's known CSS-lifting behaviour), which the first pass didn't check. Corrected before any fix was built. |
| 3.12b | ✅ **CLOSED 2026-09-08 — by design, not a bug. Bean's call.** ~~The announcement-bar / "send to ward" section never converts to `sgs/notice-banner`~~ | Found while investigating 3.12: the section renders as a generic `sgs/container` + `sgs/text` + `sgs/button` composition rather than `sgs/notice-banner`. Investigated as a possible walker/converter gap (root cause fully traced: `sgs/announcement-bar` was retired with no "retired-slug → replacement" mechanism in `recognition.py`'s NAMED step, PLUS the draft's own BEM class is malformed — `class="sgs-announcement-bar--send-to-ward"` is missing its base class). **Bean explicitly prefers the current container+child-blocks routing and does not want this changed** — no walker/DB change made, draft markup left as-is. Not open; do not revisit without a fresh instruction. A latent bug was separately found in `notice-banner/style.css:96-98` (`.sgs-notice-banner__text a:hover{text-decoration:none}`, hardcodes underline off) — irrelevant now since this route stays off notice-banner, noted only for the record. |
| 3.13 | ✅ **CLOSED 2026-09-08 — real defect found + fixed by content sync (supersedes an earlier concurrent-session pass on this same item, see correction note).** ~~Trustpilot bar has too much white space at the bottom~~ | **Correction to a concurrent investigation on this doc:** an earlier pass this session closed 3.13 as "no code defect, values match the draft" by comparing the DECLARED `margin-bottom:28px` number to the draft — but never checked WHICH element it landed on, the exact CLAUDE.md rule-4a trap (value-diff instead of effective-computed-value-on-the-right-element). Root cause, live-measured: the trustpilot-bar `sgs/container` instance stored the draft's `margin-bottom:28px` on `contentBandMargin` (the L2 content-band's INNER wrapper margin) instead of `margin` (the L1 OUTER root margin). Because the OUTER root is the bordered/white-background box and it auto-sizes to its content, a margin on the INNER wrapper never escapes the box (the border establishes a block-formatting boundary that blocks margin-collapse-through) — it just adds ~29px of dead white space INSIDE the box, while the box itself sat flush (0px gap) against the next section. Confirmed via the live per-page stylesheet: `.sgs-container-d2cd8b89 > .sgs-container__inner { ... margin-bottom: 28px; }` (wrong element) vs the section computed as `bar.bottom − inner.bottom ≈ 29px` internal dead space + `0px` real gap to the testimonial-slider below. `sgs/container` already supports root `margin` correctly (used properly elsewhere on the page, e.g. 3.11) — this was a per-instance content gap like 3.9/3.11, not a converter-code bug proven on this page. Applied as a content sync: swapped the stored key from `contentBandMargin` to `margin` (same `{"desktop":{"bottom":"28px"}}` value) via `wp_update_post(wp_slash(...))`. Live-verified: box top/bottom internal gap now symmetric (~0.8px each, border-width only, was 0.8px top / 29px bottom), and a real 28px gap now renders between the box and the testimonial-slider (was 0px). **Possible converter gap-candidate, not built here (hard exception on shared mechanisms):** a single-div draft section where OUTER background/border and a `margin` coincide on the same element may misroute margin to the content-band instead of OUTER on a fresh clone too — worth checking on a future clone run, not verified as systemic from one instance. |
| 3.14 | ✅ **CLOSED 2026-09-08 — already correct, doc's caveat was wrong.** ~~Review cards have lost their outlines~~ | This session's own earlier caveat ("`sgs/testimonial-slider` has NO border rule for its card items") was checked against the live DOM and found incorrect. `sgs/testimonial-slider` does not render its own card markup — it composes real nested `sgs/testimonial` blocks (`classic-card` variant) as children, and those DO carry a border: live-verified computed style on all 3 live cards is `border: 0.8px solid rgb(232, 213, 192)` + `border-radius: 12px` + `background: rgb(255, 249, 240)`. `rgb(232,213,192)` = `#E8D5C0`, an EXACT match to the draft's `--border` token (`sites/mamas-munches/mockups/homepage/index.html:25`). Source rule (`plugins/sgs-blocks/src/blocks/testimonial/style.css:232-234`) declares `border: 1px solid var(--wp--preset--color--border, #E2E8E8)`; the theme's `--border` token correctly overrides the block's own fallback. The computed `0.8px` vs the declared `1px` is sub-pixel rounding, visually indistinguishable, not a real defect. No code change made. |
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
| 3.26 | ✅ **CLOSED 2026-09-08.** ~~Brand image has no `max-height` cap~~ → real bug found + fixed: `max-height`/`max-width` were inert site-wide on `sgs/media`. | Root cause: `includes/media/atoms/box-shape.php` (+ its JS twin + the compiled `media-element.css`) read only the DESKTOP tier of the `maxHeight`/`maxWidth` tier-object attrs and string-concatenated a unit directly onto an already-unit-embedded stored value (e.g. `"440px"` + `"px"` = `"440pxpx"`, an invalid CSS length) — every sibling property (`height`/`width`/`min-height`/`border-radius`) already used the correct helper (`sgs_media_atom_box_shape_format_length()`) and looped all 3 tiers; `max-height`/`max-width` were the two properties that never got that treatment. Fixed to match the sibling pattern exactly, on both the PHP and JS side, plus added the missing `@media` tablet/mobile consumption rules to the CSS (the generated `media-element.css` bundle needed regenerating via `generate-media-stylesheet.mjs` — a first deploy fixed the value-emission side only, a second deploy after regenerating the stylesheet closed the mobile-tier gap). Verified live: desktop `max-height:440px`, mobile `max-height:380px`, both matching the draft's stored values exactly, no visual regression. All media-atom-parity + media-stylesheet self-tests pass. Commit pending. |

### Content defects found by audit, not by the parity tool

| # | Defect | Class | Notes |
|---|---|---|---|
| 3.15 | **Every footer link points nowhere — `href="#"`** | BUILD GAP | Home / Shop / About / Contact / Privacy Policy are all placeholders in the shipped `sgs/framework-footer-default` pattern's list block. Not a clone bug — the footer is framework chrome and is never cloned — but it ships broken navigation on every client site using the default footer. ⚠ **BLOCKED ON BEAN: ask him for the real page URLs at the START of the session, not at the end.** Do not invent them, and do not let this stall silently. |
| 3.16 | ⏸ **INVESTIGATED 2026-09-08, ROOT CAUSE PROVEN, STOPPED PENDING APPROVAL (shared-mechanism exception).** The mobile hero image has the wrong alt text | BOTH | It carries the DESKTOP image's alt ("Close-up of Mama's Munches Zookies — real ingredients, baked fresh") instead of its own draft alt ("Freshly baked Mama's Munches lactation cookies on a warm background"). Was invisible to the OLD tool because alt is a non-visible attribute on an element hidden at that viewport, and it had no concept of a responsive image PAIR at all. **The fixed tool has no art-direction pairing mechanism either — this is still open on the tool side too**, tracked separately below. **Root cause (live-verified 375px, `img.alt` on the actually-rendered mobile `<img>`):** the STORED attribute is already correct (`splitMediaImageAltMobile: "Freshly baked Mama's Munches lactation cookies on a warm background"`, confirmed in `post_content`) — this is a RENDER bug, not a content gap. `plugins/sgs-blocks/src/blocks/hero/render.php:1461-1465` explicitly reads only the DESKTOP `$split_image['alt']` and reuses it for every tier: `// Alt comes from the base image only... alt is deliberately NOT tiered (Spec 35 D5 — a different crop of the same subject describes the same thing, and a per-tier alt is a second place for it to drift).` That reasoning is wrong for THIS pair — the mobile and desktop hero images are two genuinely different photos (a close-up product shot vs. a lifestyle background shot), not a crop of the same subject, so WCAG 1.1.1 requires each to describe what it actually shows. **Not built — this is a SHARED mechanism, not a hero-private bug:** the single alt param is baked into `sgs_tier_media_render()` (`plugins/sgs-blocks/includes/helpers-tier-media.php:99-100,204`), a helper shared across every block using per-tier art-directed media (hero + `sgs/timeline`'s milestone media, per its own docblock), and the "not tiered" rule is itself a NAMED, dated architectural decision (Spec 35 D5) — reversing it is a design-gate item per CLAUDE.md rule 7, not a one-block content/render fix. **Proposed fix-shape for Bean's approval:** widen `sgs_tier_media_render()`'s `$alt` param to accept either a string (current behaviour, unchanged for every existing caller) or a per-tier array (`['desktop'=>..,'tablet'=>..,'mobile'=>..]`), falling back to the wider tier when a narrower one is empty (matches the existing fall-back-UP rule already used for the media source itself) — then wire hero's render.php to pass `splitMediaImageAlt{Tablet,Mobile}` per tier instead of collapsing to `$split_image['alt']` alone. Additive/backward-compatible; needs a design-gate sign-off before building because it reverses a recorded Spec-35 decision used by ≥2 blocks. |
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