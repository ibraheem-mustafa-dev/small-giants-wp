# R5: Eye Care cloning, the real problems and gaps (from the records)

Read-only research, 2026-10-10. Every claim cites its source. Anything not read directly in a source is marked **INFERRED**.

**Sources read.** `.claude/LEDGER.md`; Spec 47 (`.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`) §0, §1, §2, §5 (Success, Kill, Bean rulings, Residual), §3.6 items 15 to 18, §6, §7; `.claude/plans/2026-10-04-spec47-full-coverage.md` (all, including the build log); `.claude/plans/2026-10-02-eye-care-fix-register.md` (all rows, grouped below by cause); `scripts/parity/GAP-CHECKLIST.md` §1 to §28 (gap statements); archive plans `2026-09-20-draft-standardisation-plan.md`, `2026-09-24-eye-care-hand-build-design.md`, `2026-10-05-eye-care-session-c2-finding-assessment.md` (summary); reports `.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md`, `2026-10-09-session-d-local-baseline/REPORT.md`, `2026-10-09-skeleton-writer-test/REPORT.md`; `sites/eye-care-ward-end/build/qa/divergences.json`; decision D1149 (`.claude/archive/decisions.md`); memory lessons `draft-input-traps.md`, `cloning-pipeline-and-schema-default-traps.md`, `solve-guard-reverts-need-a-second-reading.md`, `solve-reports-are-dated-snapshots.md`, `a-crashed-solve-run-leaves-unjudged-writes.md`, `live-probe-measurement-traps.md`, `hit-test-probes-need-viewport-grid-and-the-real-class.md`, `a-gates-scope-is-not-the-defects-scope.md`, `the-draft-bundle-decodes-to-its-real-source.md`, `cloning-scope-preferences.md`, `draft-wordmarks-are-logos-and-brief-artefacts-are-not-design.md`, `client-drafts-and-test-sites.md`, `a-dead-calibration-is-a-marker-or-declaration-gap.md`, `routing-columns-the-resolver-never-reads.md`. I also grep-counted constructs in the Eye Care handoff source (`sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html`) and read its reveal code.

---

## 0. Context the answers depend on

1. **Why the route reads only the rendered draft.** Spec 47 §0: "The draft is a script-rendered prototype: over 95% of its styling is inline, and some values are computed per screen width at run time, so only the rendered page holds the true values." Rule R-47-4 (§1): "Draft source text is never parsed for values. Draft code may supply identity and structure only: the Claude Design runtime's `data-dc-tpl` stamps, its import hosts and `sc-for` loop membership, read through the page bridge `window.__dcAnnotatedTemplate`." So **identity and loop membership are already allowed from source**; values, conditions and motion are not.
2. **The old converter did read the source, and failed in ways worth remembering.** `plans/archive/2026-09-20-draft-standardisation-plan.md` §1: `<sc-if>` conditions were never evaluated ("both branches convert (95 in Eye Care)"); `style-hover` (64) never reached block settings; JS-array content was off by default and multi-field items were dropped ("PRODUCTS (16 items, 21 fields), REVIEWS (13), FAQS (8) ... None of that copy exists as HTML text"); the width evaluator was "an orphan" with no caller; the 193KB base64 `LOGOS` blob was never uploaded; `data-reveal` had no motion reader; "about ten blanket `except Exception: pass` blocks sit in the draft-reading path". The README "is also wrong in places" (8 places listed). The converter was deleted (commit `8054eb954`, "the old cloning converter is deleted (converter/ 198 files)"). Lesson: the failures were **unwired or partial readers and silent drops**, not that the facts were absent from the source.
3. **What the route-accuracy council already concluded about source** (`.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md`, "Draft-source analyst"):
   - "Most of what it 'declares' is already readable from the rendered draft. Three things are new": which element came from which template line, which elements are copies of one repeated design, and which spacing values are one shared setting.
   - **Hover is already visible on the rendered page:** "The runtime turns each `style-hover` into a real `.scpN:hover{…!important}` stylesheet rule (`support.js::createPseudoSheet`, PROVEN). The existing forced-hover read sees them, so the source adds nothing for hover values."
   - **States:** "`sc-if`, 87 conditionals ... Together they list every state the draft can be in. Diffing that list against each config's `states` shows which states nobody walks."
   - **Breakpoints:** "The logic class gives step values (`secPad: mobile ? '56px 20px' : '104px 52px'`). The manifest adds non-standard breakpoints (1060, 1160, 1280, 1100, 620)."
   - **Format stability:** "The runtime is identical across all three handoffs. PROVEN: `diff` of v1, v2 and Gap `support.js` shows 0 lines different." The manifest and `sgs-` classes are an SGS authoring request, not the format, and "The manifest is not reliable as section boundaries."
4. **Counts in the local Eye Care handoff file** (my `grep -o -F … | wc -l`, 2026-10-10): `style-hover` 67, `<sc-if` 87, `<sc-for` 39, `data-reveal` 25, `href="#"` 45, `@media` 1, `matchMedia` 0. The hosted bundle differs slightly (council: 64 `style-hover`, 78 `sc-for` tags counting closers).
5. **Motion lives in script, not CSS.** The draft's logic class (`<script data-dc-script>`, methods `show`, `reveals`, `parallax`) animates reveals by `setTimeout` steps writing inline `opacity` and `transform`: `dur = 460`, `delay = Math.min(i, 7) * 70`, ease-out cubic `1 - Math.pow(1 - p, 3)`, rise `26px`, `IntersectionObserver` with `rootMargin:'0px 0px -6% 0px', threshold:0.01`, a 2600ms `showAll` failsafe, and hero parallax `y * 0.18`. Width-dependent values come from `measure()` (a `ResizeObserver` setting `state.w`). **INFERRED:** because these reveals are `setTimeout` steps, not CSS transitions or Web Animations, they are not on the document timeline that `devtools.mjs::settleAnimations` waits on (GAP-CHECKLIST §19), which is consistent with the mid-entrance reads and phase artefacts recorded below.

Category keys used below: skeleton/identity, Fill values, walker accuracy (FP = false positive, FN = false negative), off-screen/hidden/state, time-based/dynamic, motion, responsive, content/copy, media/assets, Site Info, forms, menus/nav, framework gap identification, environment/hosting, tooling reliability.

---

## 1. The problems (29, duplicates merged)

Each entry: **what went wrong** (citation) | **root cause** | **category** | **Source?** would reading the draft source (template, style attributes, `style-hover`, `sc-if`, logic-class data, animation code) solve or reduce it | **Export?** would a change in what Claude Design exports solve it | **Status**.

### P1. Two different draft and live elements compared (mispairing)
- **What went wrong.** Session D's six false-positive patterns, pattern 2: "Shop compared the word 'SHAPE' with 'SHOP'; the header compared the draft's inner row with the live outer header" (`2026-10-09-session-d-local-baseline/REPORT.md` §2). Wrong writes followed: header "3 of 3" wrong, mega-brands "5 of the 6 wrong settings came from comparing two different elements", shop "8 of 11" and untrusted (same REPORT §4). Council table B: W2, W4, W5, W6 all "from mispair". Plan "Open tool defects" item 1: "Mega-brands had 5 of 6 wrong settings this way."
- **Root cause.** Pairing by matched words (`scripts/parity/lib/auto-compare.mjs::matchWords`, plan header) because "the draft has no class names" (`home.mjs`, council §1). Repeated or similar words and nested boxes defeat it.
- **Category.** Walker accuracy (FP) and Fill values (wrong writes).
- **Source? Yes.** This is the one source fact already allowed by R-47-4. The `data-dc-tpl` stamp gave "33 of 33 blocks linked to exactly the right draft element" (`skeleton-writer-test/REPORT.md` §1); R4 identity pairing dropped the header pattern-2 false alarms "3/3 (was 0/3)" (plan R4).
- **Export? Partly.** IDs are not stable across exports: the hosted bundle's "`data-dc-tpl` numbers differ from the local copy's" (memory `client-drafts-and-test-sites.md`), and the 2026-10-09 footer skeleton's "raw `data-dc-tpl` selectors are stale" (plan R3). A stable, edit-surviving ID per element (and on list containers and imported templates; the council found the `dc-import` Frame Card largely untagged, "ASSUMED") would remove the residue.
- **Status.** Partly fixed. R4 built 2026-10-10; footer and header re-pair "not adopted" because link-list identities point at the first link and the header loses its root pair to a word-based width refusal (LEDGER Front F; plan "Found by re-pairing footer and header"). Only surfaces with an origin file get identity (plan defect 1).

### P2. Rows that differ in value but paint nothing
- **What went wrong.** Pattern 1, "Your footer address: a 7px flex gap on a link with one child ... The report's words 'between the text and the icon' were made up from a raw gap value" (Session D REPORT §2). Council table A lists 9 of 19 false alarms as pattern 1 (scale none vs 1, `content` none vs "", flex-grow on an identical box, line-height in a fixed-height button). About 57% of open rows were false positives, interval 39% to 73% (LEDGER Front F; REPORT §1).
- **Root cause.** Computed values compared without proving they change pixels; the first shared "paints nothing" rule (`ba31e5157`) was "too generous" and could hide real gaps (REPORT §1).
- **Category.** Walker accuracy (FP).
- **Source? Partly.** The council: "The draft link declares no gap at all ... The rendered draft shows the same via `inlineStyle`." Declared-ness helps, but DevTools on the rendered page already exposes it, so the template is not required.
- **Export? No.**
- **Status.** Mostly fixed: R5 "does it paint?" (`scripts/parity/lib/neutralise.mjs`) accepted "141 inert and 96 reached another way ... 0 rows the old rule accepted are reopened" on home (plan R5). Open: "Finding 4, the page half" (plan QC council open list item 1).

### P3. A child's value blamed on its parent; knock-on shifts; one element reported many times
- **What went wrong.** Patterns 3, 4, 5: underline on the inner `<a>` named on the paragraph; "A mega-menu heading appeared 5 times under 5 enclosing blocks"; "The footer wordmark's '39px shift' is 34px inherited, only 4px its own" (Session D REPORT §2). Plan "Session D, 2026-10-09": `same-element` "45 own rows had followed an echo, 108 chains ended on a row no triage reports".
- **Root cause.** Rows keyed to the pair, not to the element that paints; flow offsets not attributed to the ancestor that moved.
- **Category.** Walker accuracy (FP).
- **Source? No.** Council table: pattern 3 "No ... A live-side labelling bug"; pattern 5 "No ... the template does not help."
- **Export? No.**
- **Status.** Pattern 4 fixed; pattern 3 has `decoPath` stamping (plan R5); pattern 5 "partly handled" (REPORT §2); "knock-on splitting is R5 and R6 work" (plan R4).

### P4. Hand-written walker configs measured only part of each page
- **What went wrong.** "Spec 47's Solve reported About and Lenses at '5 of 5' and '6 of 6' items closed while every page sat 57px lower than the draft. The hand-written walker configs named only 16 of About's 24 blocks (7 of Lenses' 29)" (memory `a-gates-scope-is-not-the-defects-scope.md`; register CR18, CR19). GAP-CHECKLIST §12: named pairs "caught none of six gaps Bean then found by eye".
- **Root cause.** The comparison only covers what a human config names; it compared size and anchor distance, never page position.
- **Category.** Walker accuracy (FN).
- **Source? Partly.** The template is a complete element inventory (the skeleton inventory lists every stamped element: footer "51 elements, each with its ID", `skeleton-writer-test/REPORT.md` §2), so coverage can be derived, not hand-written.
- **Export? No** (the rendered page already holds the elements).
- **Status.** Fixed: F2 `pairs.mjs` pairs every block, flow-position rows built (plan F2, GAP-CHECKLIST §17; register CR18, CR19 closed).

### P5. Draft side never read (blank draft values)
- **What went wrong.** Pattern 6: "45 rows where the draft value was blank" (Session D REPORT §2; council table A #17).
- **Root cause.** The draft element was absent in the state walked (council: likely an `sc-if` branch not shown, or genuinely absent; "ASSUMED: none of the 45 rows was checked").
- **Category.** Off-screen/hidden/state; walker accuracy (FP).
- **Source? Probably yes.** Council: "If a blank draft element sits in an `sc-if` branch, it exists only in a state that was not walked (the state is named in the source). If it has no template node, it is genuinely absent."
- **Export? Partly.** A list of states with how to reach each (see P6).
- **Status.** Labelled and excluded (fixed as a label, REPORT §2); the cause per row is unverified.

### P6. States nobody walks (dialogs, drawers, menus, form states, scrolled states)
- **What went wrong.** Contact and its form "had always defined `field-focused` and `form-submitted-empty`, but their `walkStates` was `["opening"]`, so those states were never walked"; 323 unmapped-state rows (plan build log, "The walker-state maps are complete"). The size-guide modal still owes "the `modal-open` state, its scoped pair and the `surfaces.json` state map" (plan "Coverage still owed"). GAP-CHECKLIST §1 (filter states loaded by URL skipped the real click path), §5a (a floating button appears only after scrolling), §6 (drawers). Calibration "dead" sets are "mostly states the calibration page cannot show (collapsed menus, closed drawers, empty carts)" (register CR4). Seven rows carry a state conflict "the map cannot express" (`scripts/parity/flows/state-map-reasons.json`, plan).
- **Root cause.** States are scripted by hand in each walker config; nothing enumerates the draft's states.
- **Category.** Off-screen/hidden/state.
- **Source? Yes, for enumeration.** 87 `sc-if` conditionals (`megaBrands`, `navCompact`) "list every state the draft can be in" (council §2). Reaching each state still needs a click path, which the logic-class handlers describe.
- **Export? Yes.** A state manifest (state name, trigger, a URL flag to force it) would remove the hand scripting.
- **Status.** Open (size-guide modal, product's 2 lost pairs; plan "Coverage still owed").

### P7. Script-driven scroll reveals and entrances read wrongly, or a draft reveal that never fires
- **What went wrong.** Ledger D-72 to D-85: "The draft's scroll reveal never fires below 1440: the section stays at opacity 0 and 26px down, so the draft paints it blank ... every row below it reads 26px off" (`divergences.json`). D-86: one walk read the draft at 255, the walk before at 281, "the draft steps column then still at its reveal offset". GAP-CHECKLIST §19: "a fixed wait read rows mid-entrance". Mobile drawer: "the draft fades and rises each link in when the drawer opens ... 14 rows open, but the walker does not sample the rise, so they cannot be judged" (plan "Register items owed"). A write hazard: "`entranceStart` writing `sgsAnimationStart` from an armed pose" (plan build log, route defects closed 2026-10-06). Memory `draft-input-traps.md`: a lens-flow parity claim "hid 15 differences, motion included".
- **Root cause.** Motion is JS (`setTimeout` steps, inline styles) in the draft's logic class (§0 item 5); the walker must sample paint over time; the draft's own observer logic misbehaves below 1440 (**INFERRED** from D-72's wording plus the `reveals()` code: an `IntersectionObserver` with a `-6%` root margin and a failsafe reset on every `componentDidUpdate`).
- **Category.** Motion; time-based/dynamic.
- **Source? Yes.** The exact parameters (460ms, 70ms stagger capped at 7, ease-out cubic, 26px, threshold, parallax 0.18) are literal in `show`, `reveals` and `parallax`. Reading them gives the motion spec and the settled end state without sampling, and shows that the "never fires" case is a draft defect, not a design. The register reached the same numbers only by measurement (register 53 "draft 0.18"; 72 "fade-up 26px"; 14 "rise 18px, 0.5s ease").
- **Export? Yes.** Motion declared as data or CSS (transitions, keyframes, or a motion block in the README), and reveals that fire at every width.
- **Status.** Ledgered as draft flaws (D-72 to D-86); entrance and region samplers built (GAP-CHECKLIST §15, §26); the drawer rise is still owed; "Walker items 15 to 18 (§3.6) are not built" (Spec 47 §5 Residual), including motion-library detection (item 18).

### P8. Loops and timing make counts phase-dependent (marquee, view-swap fade, half-finished shadows)
- **What went wrong.** The noise benchmark read "5 noise rows, every one a phase artefact (a draft view-swap fade, the trust-bar marquee's scroll phase, and one shadow read at t≈0.999)"; "a run reading 0 was never evidence of absence" (plan build log step 1; memory `live-probe-measurement-traps.md`). "The `scroll` row kind vanished between sweeps: 24 to 0 on product, 2 to 0 on shop. Unexplained" (plan; Spec 47 §5 Residual). `chrome-compare.mjs::hoverEffects` "does not apply P3c's `loops`" (cause unproven).
- **Root cause.** Infinite or timed motion sampled at an arbitrary phase.
- **Category.** Time-based/dynamic; walker accuracy (FP).
- **Source? Partly.** The declared loop (duration, direction, linear) is in source and would let the walker compare the loop's spec instead of a frame; entrance sampling already leaves loops to "their declared motion" (GAP-CHECKLIST §15).
- **Export? Yes.** A deterministic measurement mode (reveals shown, loops paused at phase 0, timers frozen), for example a URL flag honoured by the runtime.
- **Status.** Open (loops cause unproven; `scroll` vanishing unexplained).

### P9. The draft's own breakpoints are not the three tiers the route measures
- **What went wrong.** The draft states `mob` below 760, `narrow` below 1024, `wide` 1280 and up, `lensStack` below 700 (draft-standardisation plan §7 Q1); the manifest adds 1060, 1160, 1280, 1100, 620 (council §2). The walker reads 375/768/1440/1920; "Width sweep and loaded fonts (not built) ... a wrap that appears only between the three standard widths" (Spec 47 §3.6 item 17). Calibration flagged per-device settings reaching "375 and 1440 but not 768" (register CR1, CR9). "No calibration `forms` list contains `clamp` anywhere in the cache, so every fluid size is written per tier" (plan build log step 4).
- **Root cause.** Width logic lives in script (`measure()` sets `state.w`; one `@media` in the whole file, §0 item 4), so breakpoints are invisible to CSS-based reads and are only sampled at fixed widths.
- **Category.** Responsive/breakpoints.
- **Source? Yes.** The logic class holds the thresholds and step values (council §2: "Those tell the walker exactly which widths to test"). The old converter's evaluator matched "75 of 140 names, 0 mismatches against a real render" (draft-standardisation plan §1).
- **Export? Yes.** Standard breakpoints, or breakpoints declared once as data; responsive values as named tokens.
- **Status.** Open (Spec 47 §3.6 item 17 not built; clamp path unreachable).

### P10. Used pixels written where the draft meant a rule (grid tracks, ch, max-width centring)
- **What went wrong.** "A computed `grid-template-columns` is pixel tracks (a used value), so a draft's 1 column against live's 2 cannot be written back as `1fr`" (register CR16). Thumbnails: "measuring rendered widths gave 'about 82px' ... the source showed a fluid four-column grid ... `repeat(4,1fr)`" (memory `the-draft-bundle-decodes-to-its-real-source.md`). The tagline's 32ch was "written as the 32ch value in px, 293.9px" (register 28). The first Solve run "wrote 335px/314px/307px column widths and the row max-widths; the footer grew from 425px to 1973px tall" (memory `live-probe-measurement-traps.md`). Council: "draft max-width 1440 vs live none/100%" written at the root on header, shop and product, "reverted every time" (table B, cross-surface repeat). Mama's: "the Instagram grid's six columns (`grid-template-columns` UNMAPPED no-setting) became two ~290px columns" (plan stage 5).
- **Root cause.** `getComputedStyle` returns used values; the design rule is only in the declaration.
- **Category.** Fill values; responsive.
- **Source? Yes.** The memory lesson's own rule: "A drawn size is an output, the rule is the design ... decode the template and read the rule." R-47-4 forbids this today. Partial mitigation exists: `devtools.mjs::declaredValues` reads declared values for 8 sizing properties (council §1).
- **Export? Partly.** Declaring layout as CSS (classes or a stylesheet) rather than JS-computed inline values would expose the rule to DevTools; it does not remove the need to read declarations.
- **Status.** Partly fixed (grid tracks as proportions CR16; declared values for 8 properties); grid column count and flex row still not carried by Fill (Spec 47 §5 Residual, stage 5).

### P11. One shared design value seen as many separate values (S6 page spacing)
- **What went wrong.** S6: "Page content starts too low on Lenses, About, Help, Contact. Each page's outer container uses the section spacing (104px) instead of the draft's page spacing" (register S6; N43 Help still open). The council: "`padding: {{ secPad }}` is on 7 sections. The rendered page shows seven equal paddings; only the source shows they are one setting."
- **Root cause.** The render flattens a shared variable into per-element values; Solve writes per block.
- **Category.** Fill values; framework gap identification (site-level default versus per-block write).
- **Source? Yes.** The `{{ }}` binding names the shared value (145 style attributes use one, council §2).
- **Export? Yes.** Shared values as CSS custom properties or a token table.
- **Status.** Rows fixed in trees on most pages; the shared-value mechanism is not built; register N43 open.

### P12. Spacing on a different level: double padding, gap versus child margins
- **What went wrong.** Home got worse, 199 to 208: "Solve wrote 22px left and right padding on three cards whose inner box already had the same 22px; 2 × 22 = 44px, exactly how much their contents narrowed (291px to 247px)" (Session D REPORT §5). "A block-flow draft spaces its children with their own margins. A live flex stack adds its gap on top" (memory `solve-guard-reverts-need-a-second-reading.md`; register 101). Lens configurator's 28 rows: "the draft pads the outer panel, live the inner one by the same amounts" (plan Session D). Contact form W8: "draft padding on the input, not the field wrapper" (council table B, ASSUMED).
- **Root cause.** Draft and block markup nest differently; Solve writes to the paired level without checking a descendant already carries the value.
- **Category.** Fill values.
- **Source? Partly.** The template shows which element declares the spacing, but the council judged the doubled card padding "No ... The draft's layer is already visible in the rendered page. The fault is live-side."
- **Export? No.**
- **Status.** Largely fixed by R6 try-before-write: "round 1 tried 24 settings and rejected 6 before writing: the four card paddings, the strip padding" (plan R6). Open: margin writes the trial sees as "no-box-change" (WW-SH-01, plan R6 "Open").

### P13. Block choice: the skeleton picks the wrong block or misses one
- **What went wrong.** Header skeleton: "the nav is proposed as three buttons, not `sgs/nav-bar-menu`, and the trust bar, rating badge and cart get no node" (plan R2). Mama's: "the skeleton writer has no marquee rule (a repeated-item scrolling strip comes out `sgs/text`) ... and proposed a pill CTA link as a container holding only its arrow" (Spec 47 §5 Residual). Link lists: "a link-list node's `draftRef` is its first link, so Fill does not read the list's own gap or width" (plan R2). Typed wordmarks must become the logo and brief-only lines must be dropped (memory `draft-wordmarks-are-logos-and-brief-artefacts-are-not-design.md`; register N47, N48). Block swaps sit outside Solve (register 27, 29, 30, 120/121).
- **Root cause.** The draft has no semantic roles; block choice is inferred from structure and words, plus Bean's preferences.
- **Category.** Skeleton/identity.
- **Source? Partly.** `sc-for` marks repeated items (list, marquee, card set); animation code marks a marquee; handlers mark navigation. Bean's preferences remain judgement ("Block choice is the remaining judgement", `skeleton-writer-test/REPORT.md` §1).
- **Export? Yes.** A role per element or section (nav, logo, marquee, link list, card collection, CTA). Evidence: Mama's `Theme Mapping.md` was "right on rows, link columns, social row, copyright, legal links, credit" where the generator was wrong (plan stage 5).
- **Status.** Open (header nav, marquee rule, link-list container; plan R2/R4 and Spec 47 §5 Residual).

### P14. Copy and catalogue data live only in the script
- **What went wrong.** "Multi-field JS items are dropped ... PRODUCTS (16 items, 21 fields), REVIEWS (13), FAQS (8), REASONS (4), BRANDS (44), SHAPES (6). None of that copy exists as HTML text" (draft-standardisation plan §1). The hand build used the script data as the source of truth: "`<script data-dc-script>` class holds the data: `PRODUCTS` (16), `BRANDS`, `REVIEWS` (13), `FAQS` (8) ..." (`2026-09-24-eye-care-hand-build-design.md`). Real-data versus draft-data rows must be accepted by hand: "review counts, stock counts, pennies" (GAP-CHECKLIST §10); "the draft's WhatsApp number is two digits short" (plan Contact, D-99). Compare the same item: a check used "a live product with no photo against the draft's photographed one" (memory `draft-input-traps.md`).
- **Root cause.** The draft is a prototype whose content is JS data; Spec 47 scopes out "content beyond what the draft shows (products, pages, Site Info)" (§2).
- **Category.** Content/copy.
- **Source? Yes.** The arrays are deterministic and countable (draft-standardisation plan §1b: "CODE ... verifiable by item count").
- **Export? Partly.** A separate data file (JSON) per collection would make it trivially importable; its correctness (a short WhatsApp number) still needs checking.
- **Status.** Seeded by hand for Eye Care (hand-build plan Phase 2); no route reader.

### P15. Whether a repeated list is fixed content or a live query
- **What went wrong.** N16b: "Best sellers is 8 hand-picked cards, not a live list" (register); D6 chose "the live best-sellers list". The draft-standardisation plan: "Collection intent ... whether it becomes a WooCommerce query is a decision, not a fact in the file." Mama's: "The Instagram strip is six static `sgs/media` tiles: the mapping's feed source does not exist in the framework" (plan stage 5).
- **Root cause.** A prototype hard-codes what will be live data.
- **Category.** Content/copy; framework gap identification.
- **Source? No.** The file shows a static array (draft-standardisation plan §1b).
- **Export? Yes.** Tag each collection `static` or `live:<source>` (products by sales, reviews feed, Instagram feed).
- **Status.** Decided by hand per item (register D6, N16b closed by D6); no mechanism.

### P16. Site Info (business data) is empty on a fresh site
- **What went wrong.** Mama's: "no logo, email, copyright or WhatsApp in Site Info, so those render empty (the 5 handover rows; nothing fills Site Info from a draft yet)" (plan stage 5). "First real Site Info fill ... has run only against test data" (Spec 47 §7). Address line breaks needed a sanitiser change (register 36). Social-row address recognition for `wa.me`, `youtu.be`, `g.page` is deferred (Spec 47 §7).
- **Root cause.** Business facts sit in the draft's script or prose; the route hands them over but nothing writes them.
- **Category.** Site Info/business data.
- **Source? Yes.** "Site settings (phone, address, links) ... In the script; the placeholder map already exists" (draft-standardisation plan §1b).
- **Export? Yes.** One structured business object (name, logo file, phone, email, address lines, hours, socials, WhatsApp, Google profile URL).
- **Status.** Open (Spec 47 §5 Residual, §7 deferred).

### P17. Every draft link is `#`; pages change by script
- **What went wrong.** Fill on the generated footer: "0 of 10 page links, because every draft link is `#`" (`skeleton-writer-test/REPORT.md` §2). GAP-CHECKLIST §14: "A design draft is often a one-page prototype whose links are `#` and whose pages change by script"; link tables are "written once per site from the draft's click handlers". "every `link-missing` row [is] unwritable until ... `auto-collect.mjs` stores the href" (Spec 47 §5 Residual). Mega items could not be clicked through to their pages (register N5.5).
- **Root cause.** Navigation is handled in JS state (`page:'home'`), not hrefs. Source count: 45 `href="#"` in the Eye Care file (§0 item 4).
- **Category.** Menus/nav; content.
- **Source? Yes.** "42 edges already derived from handlers" by the old code (draft-standardisation plan §1b, "Links between pages").
- **Export? Yes.** Real hrefs and a route table (page id, URL, kind such as shop archive, single product, checkout).
- **Status.** Open.

### P18. Palette and tokens: extracted palette is advisory or wrong
- **What went wrong.** Mama's: "`theme-snapshot.json` (extract.py from the draft) marks the draft's primary, surface and text colours advisory ... so the live site paints the framework palette"; with `Theme Mapping.md` as README "primary becomes cream `#FFFAF0` (the measured most-used pill button, 15 uses, wins) and the doc's `primary #EE8088` row is skipped"; "a design doc not named `README.md` is never read, and a slug-named colour row is not a recognised role" (plan stage 5). The draft "declares no `:root` tokens" (same). A redesign palette written into the canary's snapshot "fails three snapshot gates and blocks every local `npm run build`" (LEDGER).
- **Root cause.** No declared token roles in the export; usage frequency is a poor proxy for role.
- **Category.** Fill values (tokens); Site Info (brand).
- **Source? Partly.** The JS colour constants (Eye Care `ACC` palettes, hand-build plan) are readable, but roles (primary, accent) are not stated.
- **Export? Yes.** `:root` custom properties with role names and a README token table; the handoff README is now mandatory (Spec 47 §2 "How a draft arrives").
- **Status.** Open (two Spec 33 extractor defects; Spec 47 §5 Residual "a draft-extracted snapshot is advisory").

### P19. Which draft is the reference: versions drift
- **What went wrong.** "The hosted draft now serves a newer single-file bundle (footer links 44px) than the local handoff folder" (LEDGER Front F); tpl numbers differ (memory `client-drafts-and-test-sites.md`). "Do not confuse this bundle with the older `design_handoff_ward_end_eye_care_v2/` folder ... The two drafts differ" (hand-build plan). "A freshness gate can accept an older draft folder, and cloning it goes live with the wrong design" (memory `draft-input-traps.md`). "The hosted draft is not the Gap Handoff version. It has no manifest and no `sgs-` classes" (council §1). Answer-sheet rows RP-FT-04..06 vanished because the draft changed (plan R4), and the scorer has no `obsolete` status (plan QC council open item 2). The draft was edited to follow live (Bean: "live is the ideal", LEDGER).
- **Root cause.** No version identity on exports; several copies of one design in different places.
- **Category.** Tooling reliability.
- **Source? No** (reading source does not tell you which source is current).
- **Export? Yes.** A version and content hash per export, one canonical handoff folder, IDs stable across versions.
- **Status.** Open; stage 5 is "replanned against a standardised handover folder" (Spec 47 §2; plan stage 5, Bean 2026-10-10).

### P20. The draft's runtime: external scripts and runtime errors
- **What went wrong.** "A Claude Design draft loads React and Babel from unpkg.com, so Fill without `--allow-external` read 0 of 51 targets" (plan stage 5). Indus "v2 home page throws a React error at runtime and needs fixing in Claude Design first" (plan stage 5). The hosted draft is "one 3 MB HTML file" of base64 and gzip (memory `the-draft-bundle-decodes-to-its-real-source.md`).
- **Root cause.** The prototype depends on a CDN and a client-side compile; errors stop rendering.
- **Category.** Environment/hosting.
- **Source? Partly.** A static read survives a runtime error, but values computed at run time still need the runtime.
- **Export? Yes.** Vendored runtime with no CDN, and an export check that the page renders without console errors.
- **Status.** Docs fixed (`--allow-external` required); Indus waits on Claude Design.

### P21. Media and assets: hidden, embedded or lazy
- **What went wrong.** "the Eye Care source says `<img src=ec-logo.png>` in the lens header, but the hosted page draws a thin-line inline SVG mark" (memory `draft-input-traps.md`). "The 193KB base64 `LOGOS` blob is never uploaded" (draft-standardisation plan; 40 data URIs, "only the embedded resolution is recoverable"). "A `loading="lazy"` image past the right edge of an `overflow: hidden` container is never fetched" (memory `live-probe-measurement-traps.md`; register 52, brand strip). Spec 47 §3.6 item 15 "Eager load before the resting read (not built)". "Asset upload" is out of route scope (Spec 47 §2).
- **Root cause.** Assets are embedded or lazily loaded; source and render disagree.
- **Category.** Media/assets.
- **Source? Partly.** Base64 blobs decode losslessly from source; the inline-SVG case shows the render, not the source, is truth.
- **Export? Yes.** Assets as named files (SVG logos, full-resolution images) with alt text, referenced by path.
- **Status.** Open (item 15 not built; no asset reader on the route).

### P22. Overlays, pseudo-elements and wide-screen layout missed until Bean looked
- **What went wrong.** "The comparison tool missed several things you found": overlays and tints as pseudo-elements (N18, N21), 1920 layout (N5, N20), hover on every element (N1, N23), text inside a link (N2A), line count while the header shrinks (N2B), clicked and focused states (N6) (register "Walker improvements"). GAP-CHECKLIST §12: six gaps found by eye.
- **Root cause.** The walker read only what it was told to read.
- **Category.** Walker accuracy (FN).
- **Source? Partly.** Overlays and gradients are visible in source; but each was fixed by reading more of the render.
- **Export? No.**
- **Status.** Fixed (GAP-CHECKLIST §19, §22 to §25); "brightness sampling over images is not built" (register).

### P23. Measurement traps inside the probes
- **What went wrong.** Visually hidden text read as painted: "footer walk 746 open rows to 599" after the fix (LEDGER Front F). `elementFromPoint` returned `null` off-screen and "read as 'the card has no link anywhere'" (memory `hit-test-probes-…`). A honeypot input gave "a false 98px gap on Contact" (memory `live-probe-measurement-traps.md`). An svg `width="18"` presentation attribute is "never in `matchedCSSRules`", so the size dropped silently (same memory). Scripted clicks paint focus rings (GAP-CHECKLIST §7). Used border widths snap to device pixels (memory).
- **Root cause.** Browser APIs return clean, self-consistent values for the wrong thing.
- **Category.** Walker accuracy (FP and FN).
- **Source? Partly** (the svg attribute is in source, but DevTools now reads it).
- **Export? No.**
- **Status.** Each listed trap fixed (`walker-sr-only.test.mjs`, `devtools.mjs::cascadeWinner`).

### P24. Behaviour and functionality the walker cannot see
- **What went wrong.** Session A: "63 not walker-measurable" register items; measure-gap tags "15 `behaviour`" and "6 `handover`" (plan build log step 3). Examples: the add-to-bag faults N11, the filter shell N25, the toast 18, advance-on-pick N37, skip-adds-to-bag N38 (register). "N38's 'skip adds to bag' setting does not exist" (plan). Bean's lane rule exists because "Solve ... cannot see the ~70 'not walker-measurable' rows, so its score alone overstates progress" (plan "Scope and lanes").
- **Root cause.** A visual comparison cannot assert behaviour; the draft's behaviour is in handlers and prose.
- **Category.** Forms, menus/nav, framework gap identification.
- **Source? Partly.** Handlers show what a click does in the prototype, but must be mapped to framework features by judgement.
- **Export? Yes.** Machine-readable behaviour rules (the manifest's `behaviouralRules` "is prose", council §4).
- **Status.** Four flows built and run (FR-47-7); the rest are Fix-lane work.

### P25. Bean's decisions against the draft get overwritten or cannot be scoped
- **What went wrong.** "Solve only closes what matches the draft, overwrites decided differences that are not ledgered" (plan "Scope and lanes"). Prose-only rulings let "a sweep ... flag them and a session ... 'fix' them back" (plan "Encode the register's prose-only rulings"). "The divergence ledger cannot scope a decision to one element path ... a single entry would have closed two genuine findings as well as the decided one" (Spec 47 §5 Residual; plan build log). Route lint is red because D-72 to D-91 cite no register item (plan "Carried and open"). Examples: S1 lift, S2 sweep, Google reviews follows Google's UI (register N17c), 216 contact tap-area rows (Session D REPORT §3).
- **Root cause.** The draft is not the final design; decisions live outside it.
- **Category.** Framework gap identification; tooling reliability.
- **Source? No.**
- **Export? Yes, partly.** If the draft is updated to carry the decisions (as Bean did for the footer, "the draft footer follows live", register 163), there is nothing to ledger. A round-trip from a decision list back into Claude Design would keep it so.
- **Status.** Open (path scoping, encoding prose rulings, lint red).

### P26. Gap typing: "framework gap" labels are often wrong
- **What went wrong.** "An independent agent re-check[ed] every 'missing feature' label against the code. Of 217, only 105 held up" (Session D REPORT §3). C2: "178 judged ... 30 `real` + 22 already settable ... 11 wrong block ... 90 measuring artefacts + 25 register-decided" (C2 plan summary). `W/canvas-settable` "193 ... 209" rows, each a "claim to test live, never a closure" (same). Footer item 38 "came out Missing setting where the evidence says Hardcode" (plan build log). Register CR23: "72 differences no setting can reach ... Bean's decision owed".
- **Root cause.** The route judges a gap from the DB and calibration, which have their own gaps (unrouted rows, overriding children, emission read by string search).
- **Category.** Framework gap identification.
- **Source? No.**
- **Export? No.**
- **Status.** Open (Spec 47 §5 Residual "Gap typing"; `canvasSettable` emission check; seeder unrouted rows).

### P27. Calibration coverage: settings read as dead or never read
- **What went wrong.** "546 dead; FIXTURE_LACKS_ELEMENT 210, UNEXPLAINED 106, PORTAL_OR_CLOSED_SURFACE 55" (plan "Dead calibration rows"). "No `transition,*` row calibrates anywhere in the library" (closed 2026-10-06). "Calibration exhausts Node's 4 GB heap over a full run" (Spec 47 §5 Residual). `mega-group` discovery empty, "Cause unknown" (plan). Enums with no CSS property ("45 and 55 settings") read no presence, so `hoursLayout` is never chosen (Spec 47 §5 Residual). Fixture preconditions were mistaken for defaults (fixed `676d1f15a`).
- **Root cause.** One-setting-at-a-time markers miss settings that need preconditions, open states or companion values (memory `a-dead-calibration-is-a-marker-or-declaration-gap.md`).
- **Category.** Tooling reliability; framework gap identification.
- **Source? No.**
- **Export? No.**
- **Status.** Partly fixed; 100 of 106 unexplained still open.

### P28. Solve's own loop: guard repeats, crashes and an under-reported wrong-write rate
- **What went wrong.** "`lib/guard.mjs::guardRound` deletes an exhausted trial with its `tried` set, so the same suspects are tried again ... (home rounds 5 to 13 repeated exactly)" (plan defect 2). "the 'wrong' metric counts only what the guard reverted. Home reports 3/24 ... The real home wrong-write rate is therefore at least 15 of 41" (council table B audit finding). A crashed run "exits with no final report ... but the tree keeps every write" (memory `a-crashed-solve-run-leaves-unjudged-writes.md`). Unconfirmed and single-round reverts "left register 100/101/102 open for days" (memory `solve-guard-reverts-…`). Cross-date sums "described a mixture of dates" (memory `solve-reports-are-dated-snapshots.md`). Business-info `displayType` "reverted twice by the guard" each run (plan Contact).
- **Root cause.** A write-then-judge loop on a slow remote rebuild; judgement only after a full walk.
- **Category.** Tooling reliability.
- **Source? No.**
- **Export? No.**
- **Status.** Mostly mitigated by R6 trial ("took 3 walks, not 13"); guard memory fix still owed for untrialled writes; `displayType` signal still to find (plan).

### P29. Host and environment failures
- **What went wrong.** "the host edge 403s bursts" (LEDGER operating rules). "A long run that cycles suspects for many rounds also trips the host's editor challenge (round 10 failed on Lenses)" (memory `solve-guard-reverts-…`). "the host refuses a DB connection under a burst (`wp_die` 500)" (register CR25). "the home page served a cached page from the site's previous install ... until `hosting_cache_clear-website`" (plan stage 5). Help "ran alone (failed in parallel)" (Session D REPORT §4). Local mirrors "carry no `cr-ref` for header, mega, shop, product, lens or size-guide" (LEDGER).
- **Root cause.** Shared hosting under automated load.
- **Category.** Environment/hosting.
- **Source? No.**
- **Export? Partly.** Serving the draft locally removes the draft host from the loop (memory `client-drafts-and-test-sites.md`: "Nothing static is uploaded to Hostinger").
- **Status.** Mitigated (local mirror route, retries, headed one-at-a-time runs).

### Also seen, folded in above (no separate entry)
- **Forms.** Contact form: "the draft's select is not the inputs' 52px height, so `fieldMinHeight` (input and select) moved the textarea 6px"; the last Solve "regressed 4 rows with 7 wrong writes" (plan "Contact form"); floating-label space on label-less fields (register N45). Mostly P12 (level) and framework gaps; **Source? Partly** (declared field styles); **Export? Partly** (consistent control sizes, explicit label visibility).
- **Handover prose unreliable.** README "wrong in places" (8 listed), manifest section classes on the wrong wrapper, the Gap Map "Unverified ... Stale ... This client only" (draft-standardisation plan §1; council §4, §5). This is the main argument for machine-checked export data over prose (P13, P18, P24).

---

## 2. Source reading versus export change: the summary verdict

| Problem | Read source | Change export |
|---|---|---|
| P1 mispairing | **Yes** (already allowed, built R4) | Partly (stable IDs) |
| P2 paints nothing | Partly | No |
| P3 blame and knock-on | No | No |
| P4 partial coverage | Partly | No |
| P5 blank draft side | Probably | Partly |
| P6 unwalked states | **Yes** (enumeration) | **Yes** |
| P7 script motion, broken reveal | **Yes** | **Yes** |
| P8 loop phase noise | Partly | **Yes** (measurement mode) |
| P9 breakpoints | **Yes** | **Yes** |
| P10 used vs declared values | **Yes** (blocked by R-47-4) | Partly |
| P11 shared values | **Yes** | **Yes** |
| P12 spacing level | Partly | No |
| P13 block choice | Partly | **Yes** (roles) |
| P14 script copy and data | **Yes** | Partly |
| P15 static vs live list | No | **Yes** |
| P16 Site Info | **Yes** | **Yes** |
| P17 `#` links | **Yes** | **Yes** |
| P18 palette roles | Partly | **Yes** |
| P19 version drift | No | **Yes** |
| P20 runtime | Partly | **Yes** |
| P21 assets | Partly | **Yes** |
| P22 walker blind spots | Partly | No |
| P23 probe traps | Partly | No |
| P24 behaviour | Partly | **Yes** |
| P25 decisions vs draft | No | Partly |
| P26 gap typing | No | No |
| P27 calibration | No | No |
| P28 Solve loop | No | No |
| P29 hosting | No | Partly |

Reading: source reading would solve or reduce 9 problems outright (P1, P6, P7, P9, P10, P11, P14, P16, P17) and help on 11 more. It does nothing for the framework-side problems (P3, P26 to P28), which hold much of the recorded time cost. **Caution from history (§0 item 2):** the old converter read all of this and failed through unwired readers and silent drops, so any source reader needs the "draft construct coverage" test that plan proposed (every construct has a reader or emits a gap row, with a negative control). **Hover (`style-hover`) is not a reason to read source:** the rendered page already exposes it as real `:hover` rules (council §1).

---

## 3. Top 10 by cost (time lost or blocking)

Ranking is my judgement from the cited evidence (**INFERRED** ordering); each line names the evidence of cost.

1. **P1 Mispairing.** Produced most wrong writes in the 2026-10-09 baseline (header 3/3, mega-brands 5/6, shop untrusted at 8/11); needed R2 and R4 to be built; footer and header re-pair still blocked (LEDGER Front F).
2. **P2 + P3 + P23 Walker false positives.** About 57% of open rows false (REPORT §1); C2 found 90 of 178 judged rows were measuring artefacts; Session B audited 338 raw F rows to 163 (plan build log). Several whole sessions (B, C2, D) went on triage.
3. **P26 + P27 Gap typing and calibration.** Only 105 of 217 "missing feature" labels held; 546 dead calibration rows, 106 unexplained; Session C existed to repair the route before C2 could judge (plan build log).
4. **P28 Solve loop reliability.** Guard repeats (home rounds 5 to 13), crashes keeping unjudged writes, wrong-write rate under-reported (≥15/41 against 3/24); register 100 to 102 open for days (memories).
5. **P12 Spacing on the wrong level.** Home got worse during Solve (199 to 208); lens configurator 28 rows were this; the R6 trial was built mainly for it.
6. **P7 + P8 Script motion and phase noise.** 14 ledger entries for one broken draft reveal; 14 drawer rows unjudgeable; an `entranceStart` write hazard; noise counts not comparable across runs for two sessions (memory `live-probe-measurement-traps.md`).
7. **P4 + P6 Coverage and states.** Solve reported pages "closed" while 57px low; contact states never walked; 323 unmapped-state rows; size-guide modal still owed.
8. **P13 Block choice.** Block swaps sit outside Solve (register 27, 29, 30, 120/121); header nav, marquee and CTA wrong on the second draft (stage 5); Bean's review time on picks (N47 to N49).
9. **P19 + P20 + P18 Handover format and drift.** Stage 5 replanned and its zip run abandoned (Spec 47 §2, plan stage 5); a redesign palette blocked every local build (LEDGER); Indus blocked on a runtime error.
10. **P16 + P17 + P15 Whole-site facts (Site Info, links, collections).** Not yet a time sink on Eye Care because it was hand-built (D1149), but they block "a whole-site clone start[ing] from the draft alone" (Spec 47 §7) on every new client.

---

## 4. Questions worth asking Claude Design

Grouped by the top-10 problem each targets.

**Identity and structure (P1, P4, P13, P19)**
1. Is `data-dc-tpl` (or another element ID) stable across edits and re-exports of the same design? If not, can the export carry a stable ID per element that survives edits, including inside imported templates (`dc-import`, for example a shared card) and on the container of a repeated list, not only its items?
2. Can the export state a semantic role per section and element (header, nav, logo or wordmark, marquee or ticker, link list, card collection, CTA button, form, dialog, drawer), and keep it accurate (today's manifest classes sit on a heading wrapper, not the `<section>`)?
3. Can each export carry a version number, generated date and content hash, and can the hosted standalone and the "Handoff to Claude Code" folder be guaranteed byte-identical in markup?

**States and behaviour (P5, P6, P24)**
4. Can the export list every state the design has (each `sc-if` condition in plain terms: menu open, drawer open, modal open, filter applied, form error, empty cart), with the action that reaches it and a URL flag or API to force it for testing?
5. Can behaviour rules be exported as structured data (trigger, effect, target), for example "after add to bag show a toast for 5s", "advance to the next step on pick", "skip adds the frame to the bag", instead of prose?

**Motion and time (P7, P8)**
6. Can motion be exported as data or CSS rather than script steps: for each reveal, entrance, hover transition, parallax and marquee, its property, duration, delay, stagger, easing, distance and trigger?
7. Can the runtime offer a deterministic measurement mode (all reveals shown at their end state, loops paused at phase 0, timers frozen, no view-swap fades), switched on by a URL flag?
8. Will reveals fire at every width? (Eye Care's scroll reveal never fired below 1440 in the hosted draft; ledger D-72 to D-85.)

**Responsive and values (P9, P10, P11)**
9. Can width-dependent values use standard CSS (`@media` at stated breakpoints, `clamp()`, `grid-template-columns: repeat(4, 1fr)`, `ch` widths) instead of values computed in script per width? If script is required, can the breakpoints and each responsive value be exported as named data (for example `secPad: { mobile: '56px 20px', desktop: '104px 52px' }`)?
10. Can shared values (section padding, page padding, card padding, radii, gaps) be exported as named CSS custom properties so the design's "one setting" is visible, rather than repeated inline values?

**Tokens and brand (P18)**
11. Can colour, type and spacing tokens be declared in `:root` with role names (primary, accent, surface, text, muted, border), plus a README token table in a fixed format, so the palette is never guessed from usage?

**Content, data and links (P14 to P17, P21)**
12. Can collection data (products, reviews, FAQs, brands) be exported as separate JSON files, each marked `static` or `live` with its intended source (product query by sales, Google reviews, Instagram feed)?
13. Can business details (name, logo file, phone, email, address lines, opening hours, social profiles, WhatsApp number, Google Business URL) be one structured object in the export?
14. Can links carry real hrefs and the export include a route table (page id, URL slug, page kind such as home, shop archive, single product, basket, checkout, confirmation, content page)?
15. Can images and logos be exported as named files (SVG where drawn as SVG, full-resolution rasters) with alt text, rather than base64 blobs or a different element from the one rendered?
16. Can brief-only or placeholder content (a "coming soon" line, a sketch map standing in for a real map, typed text standing in for a logo) be flagged as such?

**Runtime (P20)**
17. Can the export vendor React and Babel (or precompile) so it renders with no CDN access, and can Claude Design check that each exported page renders without console errors before handoff?

**Decisions round-trip (P25)**
18. Can Claude Design take a list of accepted changes from the built site ("the live footer is the ideal") and update the design to match, so the draft stays the single answer key?
