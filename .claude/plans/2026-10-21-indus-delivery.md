---
doc_type: plan
spec: .claude/specs/48-CLONING-SYSTEM.md
status: drafted 2026-10-21 (adversarial council applied), starts 2026-10-22
---

# Indus delivery

**This is the approved plan for its units (Bean, 2026-10-21).** A session working a unit proceeds without a separate plan-mode approval. It stops for Bean only for a decision this plan does not already record, or a shared-mechanism change (the wrapper, the walker, Solve) this plan does not name. Bean's one decision sitting (below) also approves the shared-mechanism changes it lists.

## Goal
The Indus Foods clone signed off: every Indus surface built on indus-test from the draft, checked by the route and by Bean's eye at 375, 768 and 1440 and at the header's own thresholds, with a `gaps.json` naming only differences Bean accepted (Spec 48 Appendix B step 25). Every capability and every live behaviour the Indus draft holds is cloned through a shared mechanism recorded in `scripts/computed-route/data/clone-coverage.json` with a test, never a one-off. The clone is accessible to WCAG 2.1 AA even where the draft is not.

This plan replaces the remaining work of `plans/2026-10-11-spec48-indus-build.md` and `plans/2026-10-12-clone-coverage-foundation.md` (both archived at step 0). Mama's Munches follows in its own plan after Indus sign-off.

## How this plan was built (2026-10-21)
Read in full: Spec 38, 38A, 48, 48A, both handoff folders' guides and tokens; by three Sonnet readers with the specs' facts as their brief, the Indus draft, its two form drafts, `indus-logo.js`, `animations.json` (217 records: 210 live, 7 dead code) and `surfaces.json` (61 surfaces), and every Mama's draft and inventory. Framework facts from `sgs-framework.db` (read-only). Then an adversarial council of four (claim fact-checker, delivery lead, spec lawyer, design fidelity): every finding is applied below. Units are numbered U0 to U18; the gaps in the numbering (U1, U3, U4, U12) are units finished on 2026-10-21 (Built ahead).

## Starting point
- **Indus step 20, the header slice,** is being finished by its own session under `plans/2026-10-21-header-slice-council.md`, whose "Named gaps" hand on four parts of Appendix B step 20: binding grouping (FR-48-41), the breakpoint rule (FR-48-50), gates G0 to G7 (FR-48-64) and the rendered-live half of the confirm record (FR-48-36). This plan owns those four (U16). The header's own G0 to G7 run and Bean's eye on it move to Session R.
- The states wave is closed and archived. The declared-values plan has step 3(b) and step 6 left (U2).

## What already exists (verified 2026-10-21 by the council's fact-checker; do not rebuild)
| Draft construct | SGS home | Proof |
|---|---|---|
| `[data-mag]` magnet (over-element, normalised pull), nav label magnet (`translateX × 0.14`), shine sweep, pointerdown ripple | `magnet` (engage mode, pull model, `movingPart`, per-axis limits), `sheen`, `ripple` | Spec 38A FR-38A-40, -35, -45; `fx-magnet.js::resolveMovingPart` |
| `[data-tilt]` tilt with glare | Follow pointer, `glare` layer | FR-38A-41 |
| `[data-peek]` reveal with lens ring | `cursor-field` `image-reveal` with ring fields | FR-38A-34 |
| Hero parallax, scroll progress bar, floats, marquee (45px/s, 0.15 hover rate, edge fade) | `parallax`, `scroll-progress` (counter output, `pin` source), `ambient-float` (axis both), `marquee` | FR-38A-43, -36, -37, -44 |
| Mega menu open motion and item stagger | Entrance `open` trigger and stagger | FR-38A-51 (A-12, A-14) |
| Accordion and caret turns; form invalid shake, step slide with direction, success card | `state` entrances; `form/view.js` publishes `invalid`, `step-changed` (with direction) and `success`; `motion-triggers.css::sgs-mt-translate-back` reads `data-sgs-dir` | FR-38A-53 |
| Header shadow after 8px | `sgs/site-header.shadowScrolled` with `scrolledOffset` 8 | DB |
| Opening-hours open and closed lines | `sgs/business-info` open status: the server prints neutral text, `business-info/view.js` decides open or closed in the browser and re-checks every 15 minutes, so a cached page stays right | fact-checker |
| Testimonial autoplay, dots, arrows | `sgs/testimonial-slider.autoplay`, `autoplaySpeed`, `showDots`, `showArrows`, `pauseButton` | DB |
| Blog category filter | `sgs/post-grid.showFilters` | DB |
| WhatsApp floating button, back to top | `sgs/whatsapp-cta` floating (`floatingHideLabelBelow`); link source `top` | DB, Spec 48 FR-48-6 |
| Sticky side columns | `sgs/container.pinBelowHeader`, `pinGap` | `includes/container-pin-edge-css.php` |
| Images, links | `lib/fill-media.mjs::mediaDecisions`, `lib/fill-link-attrs.mjs::linkAttrDecisions` | `e191fad0c`, `325c711da` |
| Effect write path, custom motion targets | `lib/motion-effects.mjs::writeEffect`; `custom:<n>` targets in `lib/motion-validate.mjs` and `Sgs_Motion_Custom_Target::resolve` (nothing in the route creates one yet) | FR-38A-5 |

Partly built (the missing part is a unit below): the Heritage pinned track (U13a), the drawer motion (U14), opening-hours pulse and today's row (U14), the testimonial card swap (U14), the map display (U5), the form review step (U10), the route fade (U14), the logo and About hero SVGs (U13c).

Not in the Indus draft (grepped in all three drafts): a canvas, `polygon()`, `vertical-align`, authored pseudo-element content beyond the peek layer's `::after`, section id anchors, any `@media` breakpoint rule (breakpoints are JS thresholds at 768, 1024, 1200 and 1260), the `timeline` and `quotes` block types, `formOld`, and the food scatter (`density = 'Off'`) with its dead records A-03, A-04, A-05, A-11, A-17, J-18, J-19.

## Scope
**In:** every Indus gap in `node scripts/computed-route/capabilities.mjs --drafts` (87 on 2026-10-21), every live record of `sites/indus-foods/handoff/animations.json` and every state of `surfaces.json`, the Spec 48 FRs Indus steps 21 to 25 need, and the accessibility repairs.

**Out:** gaps no client draft uses; Spec 38A FR-38A-57; FR-48-76; Spec 48 FR-48-70's Eye Care re-freeze (waits on B5), FR-48-72 and FR-48-73 (reported metrics, not publish blockers), FR-48-12 and FR-48-15 (route gates no Indus surface needs to close); Mama's shop features (its own plan).

## The closing standard (every unit)
1. **A shared mechanism** in `scripts/computed-route/lib/` (route) or the owning block (framework), for any draft (FP-9). Refs and tests never under `sites/`, never naming a client (`python scripts/check-no-client-names.py --check`).
2. **Its coverage entry** carries `recognise`, `write`, `check` and `test` and a `note` saying how it is solved; `capabilities.mjs --like <id>` finds worked examples. A `check` nothing calls is not a check.
3. **Proof:** a MUST FAIL test, a mutation check that turns it red (`node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test file>`; mutations JSON is an array of `{file, find, replace, why}`, `file` relative to the route dir), `node capabilities.mjs --gate` exit 0, and per session a planted-draft test, `scripts/computed-route/tests/<session>-planted-draft.test.mjs`, that raises its gaps again with one write ref nulled.
4. **Reduced motion:** every effect written carries its record's reduced-motion behaviour and the matching `fx_effects.reduced_motion` value, probed by `probe-motion-model.mjs`'s `reduced-*` checks. Rulings: autoplay is off under reduce; a marquee stops and wraps to show every logo; the pinned track keeps its information-only progress writes; the logo and About hero end on their final frame.
5. **No SGS setting for what the draft does:** build the real control (attribute, inspector control, render) in the owning spec; a whole new block is Bean's decision; what cannot be built is a named `gaps.json` row with the rule it breaks.
6. **Before claiming anything is missing or built,** query the framework DB and read the code; a spec Status line is a dated claim.
7. **More than 3 blocks or files getting the same change:** the migration-method skill, detector first. A migration or walker phase never ships as one commit (FP-5).
8. **Commits** name their unit (`feat(U13a): …`). A bug found on the way goes in its FR's Status line and the commit message.

## The delivery map (the tracking file)
`sites/indus-foods/build/qa/delivery-map.json`: one key per Indus coverage id from `capabilities.mjs --drafts` (the rows marked `indus-foods`), per live `animations.json` record id and per `surfaces.json` state, each naming its unit (`"A-38": "U14"`) or `"done"` with the commit. `node scripts/computed-route/delivery-map.mjs <client> --check` fails on a missing, duplicated or unknown-unit key (built in Session P with a MUST FAIL test; the route code takes the client as an argument and names none).

## The work
| Unit | What it is | Done when | Session |
|---|---|---|---|
| U0 Header | the header session's wave 1 committed and its header re-run on the corrected skeleton | the header session's handoff marks wave 1 committed; `sites/indus-foods/build/header.tree.json` has an `sgs/nav-bar-menu` | A |
| U2 Declared values close | `.claude/prompts/Declared-values-final-session-prompt.md` tasks 2 to 4 (step 3(b), step 6 on the re-run header, the 16 CSS-group entries) | FR-48-8 and FR-48-36 Status read built; the 16 entries covered with tests | A |
| U2b Intake safety | a run never overwrites a confirmed `page-map.json`; `--apply-review` keeps saved decisions' first dates | two MUST FAIL tests in `scripts/computed-route/tests/intake-review.test.mjs`, mutation-red | G |
| U2c Spec truth | correct the stale Status lines: FR-48-1, FR-48-11, FR-48-39, FR-48-44, FR-48-77 (its `image-reveal` note, and its done-when's `sgs/timeline` clause per U13a) | `git grep -n "image-reveal.*not built" .claude/specs` finds nothing | G |
| U4b Safe-area | the drawer foot's `env()` renders 16px with no `viewport-fit=cover`; Fill's rendered read writes it | a MUST FAIL test, `css-function:env` covered | A |
| U5 Images and maps | first commit: split `lib/fill-resolve.mjs` (413 lines); wire `paintedImageCheck` into the live check; cover `html:img`, `img.src`, `img.alt`, `figure`, `figcaption`; nested image slots; the map display has only `mapSource` and a fixed `height="400"`, so build map height per device, zoom and a filter (the footer map 210px, `grayscale(.35)`; contact 320/460px), with `contrast(1.05)` excluded | the five entries covered; both Indus maps paired at 375/768/1440 | B |
| U6 Icons | social icons to `sgs/social-icons` brand icons bound to Site Info; stroke and filled icons to `sgs/icon`; one writer for a whole `<svg>` subtree | the svg entries covered | B |
| U7 Links | a draft hash route (`#/apply` on every Apply CTA) written as the page map's permalink; setting names from the framework DB | `html-attr:a.href` hash case tested | B |
| U8 Styling | the text-selection colour (snapshot pair, a theme rule that paints it, the writer); the drawer's scrollbar look (a `sgs/nav-drawer` control); per-device visibility the draft uses (top-bar Register pill mobile only, email pill and socials hidden on mobile, footer logo 200px on mobile) checked against existing settings | `css-pseudo-element:selection` and the scrollbar entries covered | B |
| U9 Form writer | map each control by framework-DB query to `sgs/form-field-*`: careers and catalogue inline forms, `EnquiryForm` (topic and reply-by chips, floating labels, 800-character counter), `TradeApplication` (5 steps, back-only headers, conditional fields, the review step, `role="checkbox"`, file `accept`); each `sgs_form` post created; recipient, success state and email through `Sgs_Mailer`; prototype fakes (timed "Sending…", random reference, "we've emailed a copy") not built; careers "Apply for this role" preselects the team and role through a query parameter on the form link | FR-48-57's done-when: each Indus form submits on indus-test, the owner email reaches the confirmed recipient (FluentSMTP log), the success state matches | C |
| U10 Form settings | per-field validation copy; floating labels; textarea `maxlength` and counter; `autocomplete`; `inputmode`; default value and checked; the review step as one card per section with an Edit link and its own intro; saved progress per Decisions 4 | each setting in Spec 04 with an FR and a test; the trade application's review and saved progress paired with the draft | C |
| U11 Setting meanings | a meaning (what, trigger, parameters and units) for the settings U13 and U14 map to, chosen by name and block, not by role (`showFilters` and `openStatusShowLine` are `boolean-visibility`, `scrollEffect` `select-from-enum`, `shadowScrolled` and `pinBelowHeader` `styling`); shape per Decisions 3; detector first | a mapped setting with no meaning fails `plugins/sgs-blocks/scripts/check-setting-meanings.py --check` | D2 |
| U13 Effect recogniser | FR-48-77: recognise each script effect by mechanism and write it through `writeEffect`: magnet (and the nav label), sheen, ripple, tilt with glare, peek with lens ring (shown on focus and tap too, Decisions 8; on a block that offers `cursor-field`, info-box or container), parallax, scroll progress, floats, rings (sampled values stored per element); the `effect` review row type added to `lib/intake-review.mjs::MARKS`, `data/intake.schema.json` and the spec-sync test | each listed effect: a planted draft raises an `effect` row, `writeEffect` writes its stored values, its entry has a test; the delivery map shows its records done | D1 |
| U13a Heritage track | per Decisions 9: `sgs/timeline` offers `horizontal-panel` as a real layer with its parameters (pin length, proximity focus, progress output, counter) and pins at 1024 and above only, the draft's swipe strip (84%/56% cards, snap) below 1024, and the year text stroke turning gold on the active card (date text-stroke and active-year colour settings) | paired with the draft at 375, 768, 1023, 1024 and 1440 | D1 |
| U13b Clip radius | per Decisions 1: a corner radius on Spec 38A's clip channel (from and to radius, the `inset(... round var(...))` owner, `lib/motion-clip.mjs::clipChannels`, the Entrance control), for A-08 and A-22 | A-08 and A-22 paired; Spec 38A §10 row updated | D1 |
| U13c SVG timelines | per Decisions 2 | per the option chosen | D1, last |
| U14 Behaviour recogniser | FR-48-80 onto existing settings: testimonial autoplay with pause on hover and focus and the pause button (WCAG 2.2.2), dots with unique labels, and the card swap (A-01: a fade-swap mode with a `slide-changed` state, Decisions 10); accordion single-open (drawer) and multi-open (FAQ); blog filter; header scrolled shadow; opening hours plus the dot pulse (A-02) and today's row highlight (both controls to build); WhatsApp floating; back to top; the drawer's slide in and out (A-36 560ms, A-38 340ms `cubic-bezier(.7,0,.84,0)`), CTA bar rise (A-37), accordion content stagger (A-39) and scroll to the opened section (J-20, a control to build); the route fade (Decisions 5); layout-property hovers (width to a horizontal scale TR-015/TR-016, gap to a translate TR-054/065/067/068/092/101, underline growth to the link-underline control TR-104) and parent-driven hovers through custom properties as `source: root` or `group` | each record listed shows done in the delivery map with its test | D2 |
| U15 Trees | after Session R: FR-48-51 (button presets) and FR-48-14 (one parent write over a loop body) as their own first commits with tests; then every remaining surface (footer, drawer, 4 mega menus, the 23 page routes, the 6 blog posts as `post` rows, the form host pages) through skeleton, Fill and build; the blog needs the posts and a single-post template | every surface in `sites/indus-foods/build/surfaces.json` built and passing `wp-build-page.js --dry-run` and `lint.mjs` | E |
| U16 Gate machinery | built beside B, C and D (code only, no site): FR-48-41 binding grouping, FR-48-50 breakpoint rule, FR-48-36's rendered-live half, FR-48-20's code-to-code check, FR-48-64 gates as a chain, FR-48-65 classes, FR-48-66 `gaps.json` (with an `accepted` list for Bean's differences, each naming the rule it breaks), FR-48-67, FR-48-69, FR-48-22 kill line, FR-48-71's 10-row sample; FR-48-11's walker half | each FR's done-when, each with a MUST FAIL test | G |
| U17 Accessibility | the repairs the clone must not copy: visible focus on every control (the theme focus system), the drawer as a true modal (`aria-modal`, focus trap, Escape, focus return, scroll lock), `aria-expanded` and `aria-controls` on mega triggers, FAQ and accordion rows, unique dot labels, 44px targets (top-bar pills, 34px social circles, 42px pager buttons), 4.5:1 on every text pair (gold `#D8CA50` and `#E3EFF4` on `#0A7EA8`) | axe clean and a keyboard walk (hamburger, drawer, mega menu, FAQ, forms) pass at 375/768/1440 | E |
| U18 Sign-off | the check on every surface; cropped draft-and-live pairs generated for every surface at 375, 768 and 1440 and the header also at 1023, 1024, 1199, 1200, 1259 and 1260; Bean's eye; one fix round; G7 on publish day | `gaps.json` written with every gate's evidence; Bean signs off each surface | S |

## Sessions
Each session's main thread (Opus) keeps judgement and Bean's decisions; sweeps and serial machine runs go to Sonnet subagents (at most three at once). Sessions share the checkout with explicit pathspecs; a subagent writing code works in its own worktree (`npm ci` in `scripts/computed-route` first) and is merged after a diff read. Five lint and solve-held tests fail in any agent worktree, clean `main` included: run the full suite in the main checkout. Code with no framework DB, site or secret dependency (U2b, parts of U16) may run as a cloud session.

| Session | Units | Needs | Runs beside | Bean | Estimate |
|---|---|---|---|---|---|
| P Prep (tonight) | the decision sitting; `tools/mutate.mjs` into the repo; `delivery-map.mjs` and the map; prompts for every session | none | none | 15 min | 30 min |
| A Opener | step 0, U0, U2, U4b | the header session's wave 1 | G, B, C | step 6 review, 20 min | 1 h (+45 min machine) |
| G Gate machinery | U16, U2b, U2c | P | A, B, C, D1, D2 | none | 2 to 3 h over 2 sessions |
| B Content | U5 (split first), U6, U7, U8 | P | A, C, G | none | 1 h 15 |
| C Forms | U9, U10, step 22 | P | A, B, G | none | 1 h 45 |
| D1 Effects | U13, U13a, U13b, then U13c | P, B's split | D2, G | none | 2 h 30 |
| D2 Behaviour | U11, then U14 | P, a reseed slot | D1, G | none | 1 h 45 |
| R Refresh | the last refresh-loop pass, the intake delta re-run, the header through G0 to G7, Bean's eye on the header | A, B, C, D1, D2, G | none | header, 15 min | 30 min (+40 min machine) |
| E Trees and accessibility | U15, U17 | R | none | none | 2 h 30 (+machine) |
| S Sign-off | U18 | E | none | 1 h with pairs | 1 h 30 |

Estimates are agent time per session (machine time separate); the total is about 14 h of agent time against Spec 48 Appendix B's 20 h for the path, because the effects, states and site build are already built.

**Shared resources, one at a time.** The refresh loop (Spec 48 Appendix B: reseed, deploy to indus-test, mirror refresh, recalibrate, about 20 minutes machine) runs in the order B, C, D2, D1: each session batches its framework edits into one pass at its end, pushes first (a reseed runs only from a clean `origin/main` worktree), and takes the loop only after `ListAgents` and a message to each busy peer. Session R takes the last pass for everything after. `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map: each session edits only its own units' keys and commits and rebases after each unit. `lib/fill-resolve.mjs`: B splits it first. Spec Status lines and `LEDGER.md`: once, in each session's closing commit. A gate red on entries another session owns: commit with `[gates-ok:<reason>]` naming the owner (`~/.claude/rules/git-hygiene.md`). Before Session E builds onto indus-test: `mysqldump` backup; trees build only into the ids the page map holds.

## Gates
- **G-P:** the decision sitting recorded below; `delivery-map.mjs indus-foods --check` exit 0; prompts written.
- **G-A, G-B, G-C, G-D1, G-D2, G-G (each session's end):** its units' done-whens; its planted-draft test red with one write ref nulled; the route suite green in the main checkout (`node --test tests/*.test.mjs` in `scripts/computed-route`); `capabilities.mjs --gate` and `delivery-map.mjs indus-foods --check` exit 0; its refresh-loop pass done; for B and D, a cropped draft-and-live pair per effect at 375/768/1440 on the calibration page or a scratch page.
- **G-R:** the header passes G0 to G7 and Bean's eye; the intake delta re-run's review rows marked.
- **G-S:** `capabilities.mjs --drafts` lists no Indus gap except Bean's accepted differences; the delivery map shows every key done or accepted; every surface paired; Bean's sign-off.

## Step 0 (Session A, first 5 minutes)
1. `git pull --ff-only`; ListAgents; read the header session's handoff and commits.
2. Archive `plans/2026-10-11-spec48-indus-build.md` and `plans/2026-10-12-clone-coverage-foundation.md` to `plans/archive/`; repoint links until `git grep -l "2026-10-11-spec48-indus-build\|2026-10-12-clone-coverage-foundation" -- .claude scripts plugins` lists only `plans/archive/` files.
3. LEDGER: Front M and the Indus front become one front pointing here.

## Carried from the archived plans
- **In units:** the control-gaps writers Indus uses (`pinBelowHeader` U15, `{prefix}TextStroke*` U13a, form-field-tiles descriptions U9); FR-48-17's intake bugs (U2b); the intake delta re-run (Session R, about 20 minutes machine; FR-48-34's timer-opened state is checked on it).
- **Content for Bean at sign-off** (intake flags): the footer's "Part of the Unitas Wholesale Group, £8bn" against "Today's Group member"; the Terms page's placeholder line; social links and the "Website by" link at `#/`; stock photos and empty brand-logo slots; the careers roles are example data; the footer square logo's letters are one path in the asset (L-06 and L-09 cannot wave).
- **Backlog:** unused site-and-surfaces capabilities and the `<meta name=description>` writer (FR-48-84); FR-48-28 side-by-side widths stay off; the cart's `panelSlide*` row; the choice-flow Back button hover trigger; the columns-tier floors; `sgs/buybox` calibration needs a product.

## Decisions for Bean (one sitting, before any session; "go" takes every recommendation)
1. **Rounded clip reveal.** Every non-hero image box opens from a frame 10% in with 24px corners (1000ms) and the hero from 8% in with 26px to 22px corners; SGS's clip reveal has no radius, so today they only fade. **Recommended: build it (U13b), 30 to 45 minutes.**
2. **The animated logo and About hero.** What it takes (fact-checked): (a) clone them on the motion model: build a continuous spin loop (none exists; `svg-loop` is pulse or wave), inline the logo SVG without needing a draw layer, an inline SVG for the drawer's logo (a plain image today), a writer that creates the custom targets for each SVG group, an SVG fill-colour channel and a hover that speeds up a running loop, about 2 to 3 hours; (b) a static logo and hero (a named difference), 0 hours; (c) Lottie files (the player exists) made outside the route. **Recommended: (a) for the logo (seen on every page) and (b) for the About hero until the logo work is proven; U13c runs last in D1, so it never holds sign-off.**
3. **Where a setting's meaning lives.** **Recommended: in each setting's `block.json` attribute (an `sgs.meaning` object: what it does, its trigger, its parameters and units), seeded into the DB, so the block owns it.**
4. **Trade application saved progress.** The draft saves the form in the browser as it is filled in. **Recommended: build it, off by default, never storing the credit and director fields, cleared on submit and after 7 days.**
5. **Route fade.** The draft fades only the page body in (380ms) on each route change; SGS's page transition is a fixed 220ms cross-fade of the whole page. **Recommended: add duration and easing settings to the page transition (Spec 38 FR-38-19) and clone 380ms; the header fading too is a named difference.**
6. **Careers "Apply for this role".** **Recommended: the link preselects the team and role (U9); the scroll offset and the card pulse are a named difference.**
7. **Hovers that darken.** Some draft hovers go darker (why-cards to `#2C3E50`, links and buttons to `#075E80`), against your "hover brightens" rule. **Recommended: clone the draft (it is the client's approved design) and list each as an accepted difference naming the rule.**
8. **The peek reveal on touch and keyboard.** The draft shows it only on mouse hover. **Recommended: also show it on keyboard focus and on tap, so it never only appears on hover.**
9. **The Heritage track.** **Recommended: make `sgs/timeline` offer `horizontal-panel` as a real layer with its settings, pinning from 1024 and swiping below, plus the year outline and active-year colour (U13a), rather than building the track from a container, because the timeline block is where a client would look for it.**
10. **The testimonial card swap.** The draft swaps one card with a 520ms slide-in; SGS's slider moves a track. **Recommended: add a fade-swap mode with a `slide-changed` state to `sgs/testimonial-slider` (U14).**

Shared-mechanism changes this sitting approves with the recommendations: the clip radius (Spec 38A §10), the spin loop and SVG fill channel (Spec 38A), the timeline's horizontal-panel layer, the page-transition settings (Spec 38), the walker half of FR-48-11 and the gate chain (Spec 48 §14).

## Built ahead, 2026-10-21 (evening)
The gate upgrade and bookkeeping (`6dc909124`), Bean's exclusions and the link entries (`f733fac90`, `0adc35262`, client-name fix `d443060dc`), the image writer (`e191fad0c`) and the link writer (`325c711da`). Open gaps across both drafts went from 126 to 97 (Indus 87).
