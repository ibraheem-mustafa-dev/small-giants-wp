---
doc_type: plan
spec: .claude/specs/48-CLONING-SYSTEM.md
status: drafted 2026-10-21, starts 2026-10-22
---

# Indus delivery

**This is the approved plan for its units (Bean, 2026-10-21).** A session working a unit proceeds without a separate plan-mode approval; only a decision listed under "Decisions for Bean", or a change to a shared mechanism (the wrapper, the walker, Solve), stops for Bean.

## Goal
The Indus Foods clone signed off: every Indus surface built on indus-test from the draft, checked at 375, 768 and 1440 by the route and by Bean's eye, with a `gaps.json` naming only differences Bean accepted (Spec 48 Appendix B step 25). Every capability the Indus and Mama's redesign drafts use is covered in `scripts/computed-route/data/clone-coverage.json`, built as a shared mechanism with a test, never as a one-off.

This plan replaces the remaining work of `plans/2026-10-11-spec48-indus-build.md` and `plans/2026-10-12-clone-coverage-foundation.md` (both archived at step 0).

## Starting point (step 0 checks it)
- **Indus step 20, the header slice** (Spec 48 Appendix B step 20), is being finished by its own session (2026-10-21: `7e08c67a9` built the header tree into post 201 and ran three Solve rounds, 308 open rows, 134 unresolved, 6 wrong writes, not yet paired). This plan starts when that session's handoff marks step 20 done: the header, mega menus, drawer and accordion sub-slices paired at 375/768/1440, FR-48-81's live state pairing, Bean's eye. If it is not done, U0 below finishes it first.
- The states wave is closed and its plan archived (`plans/archive/2026-10-20-states-wave.md`), the account calibration included.
- The declared-values plan (`plans/2026-10-19-fr48-8-declared-values.md`) has only step 3(b) and step 6 left; Session A finishes it.

## Scope
**In:** the coverage gaps the two drafts use, `node scripts/computed-route/capabilities.mjs --drafts` (2026-10-21, after this evening's merges: 112 open; Indus 101, Mama's 67; from 126 that morning); the Spec 48 FRs Indus steps 21 to 25 need; the coverage register's enforcement.

**Out (backlog, built when a draft first uses it):** the other gaps `capabilities.mjs --gaps` lists; motion model additions (Spec 38A FR-38A-57, Bean 2026-10-19: after the three test sites are cloned; Indus's `css-function:skewx` waits with it); FR-48-76 and the other Spec 48 FRs no Indus step needs.

**Indus first.** A unit item only Mama's draft uses is tagged *(Mama's)* and runs in Session F, beside E, so it never sits on Indus's critical path.

## The closing standard (every unit)
No spot fixes. A gap closes only through all of these, and the gate refuses the rest:
1. **A shared mechanism**, in a `scripts/computed-route/lib/` module, that works for any draft (FP-9). Refs and tests never point under `sites/` (the gate refuses them) or at code that names a client.
2. **Its coverage entry** carries `recognise`, `write`, `check` and `test` (a MUST FAIL test file that exists), and a `note` stating how it is solved. The entry is the register: `capabilities.mjs --like <id>` lists solved entries that share its write ref, so the next gap of the same shape starts from a worked example. A `check` that nothing calls yet is not a check: the entry stays a gap until it runs.
3. **Proof:** the MUST FAIL test, a mutation check that turns it red (`C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>`), `node capabilities.mjs --gate` exit 0, and, for each session, a planted-draft test that raises its gaps again with one write ref nulled (precedent `scripts/computed-route/tests/states-planted-draft.test.mjs`).
4. **No SGS setting for what the draft does:** build the real control (block attribute, inspector control, render) in the owning spec, framework first; a whole new block is Bean's decision. A capability that cannot be built in this plan is a named row in `gaps.json`, never dropped.
5. **More than 3 blocks or files getting the same change:** the migration-method skill, detector first.
6. **A bug found on the way** goes in its FR's Status line and its commit message, and in auto memory only when the lesson is new.

## The work, by shared mechanism
Triage of the 126 (three read-only agents, 2026-10-21, refs spot-checked). H: works, entry only. X: proposed exclusion. Session A writes the id-to-unit map (below) so every `--drafts` id has exactly one unit.

| Unit | Closes | What it is | Owner FR | Session |
|---|---|---|---|---|
| U0 Header close-out | Indus step 20 | only if step 0 finds step 20 open: finish it from its session's handoff (the three sub-slices paired, Solve at zero wrong writes, FR-48-81's live state pairing, Bean's eye) | FR-48-81, Appendix B step 20 | A |
| U1 Gate upgrade | the register | done 2026-10-21 (`6dc909124`): a covered entry names its `test`, except the ids in `data/coverage-test-baseline.json` (281, a list that may only shrink; the gate refuses a stale id); refs and tests under `sites/` refused; `capabilities.mjs --like <id>` and `--drafts` (`lib/coverage-register.mjs`) | FR-48-85 | done |
| U2 Declared values close | 16 CSS groups (H) | `.claude/prompts/Declared-values-final-session-prompt.md` tasks 2 to 4: step 3(b) draft-defect write, step 6 on the Indus header, the CSS-group entries (refs `lib/fill-declared.mjs#extraProps`, `lib/fill-prop.mjs#resolveProperty`, `lib/fill-confirm.mjs#confirmRecords`) | FR-48-8, FR-48-36 | A |
| U2b Intake safety | re-run readiness | a run never overwrites a confirmed `sites/<client>/build/page-map.json`, and `--apply-review` keeps saved remove decisions' dates (FR-48-17), each with a MUST FAIL test, so Session E's intake delta re-run is safe | FR-48-17 | A |
| U3 Bookkeeping | 7 H | done 2026-10-21 (`6dc909124`): `calc()`, `clamp()`, `min()`, `max()`, `vh`, `vw` (`lib/resolve.mjs::fluidForm`, test `tests/resolve.test.mjs`) and `img.height` (`tests/presentational-hints.test.mjs`). FR-48-44's Status line ("not built") is stale: corrected in Session A | FR-48-44 | done |
| U4 Exclusions | 3 ruled, 17 proposed | Bean, 2026-10-21, applied in `f733fac90`: `html-attr:button.disabled`, `html-attr:form.novalidate`, `html-attr:label.for`. Kept: `css-pseudo-element:selection` (U8), `input-type:password` (U9). Proposed, Bean to rule before Session A: `iframe.loading`, `aria-role:group`, `global.title`, `svg:metadata`, `css-group:` compositing-and-blending, generated-content, pointer-events, will-change, writing-modes, `contrast()`, `-webkit-user-drag`, `draggable`, `popover`, `aria-role:dialog`, `construct:ref` | | A |
| U5 Image writer | 8 | built in part (2026-10-21, `e191fad0c`): `lib/fill-media.mjs::mediaDecisions` writes a draft `<img>` or `<figure>`'s attachment URL, id, alt and caption from `media-map.json` into the block's DB `image-alt` slot (never the draft's own address; every miss a named `image` gap). Left: wire `lib/fill-media.mjs::paintedImageCheck` into the live check, then set the `html:img`, `img.src`, `img.alt`, `figure`, `figcaption` entries; map iframes to `sgs/business-info` `maps_url` (`iframe`, `iframe.src`, `embed:other`); nested image slots (only a node's root element is read today). **First commit of Session B:** split `lib/fill-resolve.mjs` (413 lines, over the 400 limit) by moving `fillContent`'s content decisions into their own module | FR-48-39, FR-48-82 | B |
| U6 Inline SVG writer | 16 | one writer for a whole `<svg>` subtree (`sgs/icon` custom SVG or an uploaded asset, screened by `lib/svg-screen.mjs::svgProblem`), children and `aria-role:img` covered through the parent; check by rendered paint | FR-48-82 | B |
| U7 Link writer | 4 covered, 2 left | built (2026-10-21, `325c711da`; entries `f733fac90`): `lib/fill-link-attrs.mjs::linkAttrDecisions`, checked by `scripts/parity/lib/links.mjs::compareLinkAttributes`. Left: a draft hash route (`#/apply`, the Indus header CTA) becomes the page map's permalink for that route, not the hash; settings found by name pattern (`…NewTab`, `…Target`, `…Rel`) move to the framework DB | FR-48-11, FR-48-82 | B |
| U8 Layout residue | 7 + *(Mama's)* 1 | the text-selection colour (`::selection`; Indus: `#D8CA50` behind `#1E2A3C`): a snapshot `settings.custom.selection` pair, one theme rule that paints it, the route writer; `position`/`bottom`; `vertical-align`; `::before`/`::after` `content`; `html:canvas` (classify each Indus canvas first: `sgs/physics-canvas`, `sgs/image-sequence` or a gap); `env()` safe-area (d4) and the rounded `inset()` clip (d3) per Bean's rulings; *(Mama's)* `polygon()` to `sgs/label` end shapes | FR-48-85 | B, F |
| U9 Form writer | about 20 + *(Mama's)* 5 | intake already finds forms; map each control by framework-DB query to `sgs/form-field-*` and its attributes, create the `sgs_form` post, the submit-button split, `::placeholder`, fieldset groups, the `sgs/form-field-tiles` description writer; owns Indus step 22 and FR-48-57's done-when (recipient, success state, validation copy rows). *(Mama's)* account forms (sign-in, checkout "Choose a password", account "Change password") map to `sgs/account` and WooCommerce's checkout create-account option, never to `sgs/form`, which emails and stores submissions | FR-48-57, FR-48-83 | C, F |
| U10 Form block settings | 3 + *(Mama's)* 2 | Spec 04 attributes with inspector controls: textarea `maxlength`, `autocomplete`, default value; *(Mama's)* `inputmode`, default checked | FR-48-83 | C, F |
| U11 Setting meanings, scoped | prerequisite | the old coverage Phase 3, cut to the settings U12 to U14 map to: a machine-readable meaning (what it does, its trigger, its parameters) seeded by `sgs-update-v2.py`, in the shape Bean picks (Decisions 4); detector first; done when such a setting with no meaning fails a test | FR-48-79, FR-48-80 | D |
| U12 Scroll sideways | 3 groups | grid-layout (`grid-auto-*`), overflow-x and scroll-snap to `sgs/container` `scrollSideways`/`scrollItemWidth`; hero `splitContentOrder` | FR-48-79 | D |
| U13 Effect recognisers | 6 + step 20b | the FR-48-77 framework and its `effect` review row type (Spec 48 Appendix C, `lib/intake-review.mjs`); pointer and scroll handlers and `data-*` hooks to `fx_effects`: magnet `[data-mag]`, tilt `[data-tilt]`, the logo marquee, the Heritage pinned timeline with its hollow years' outline following the current card (`{prefix}TextStroke*`), rings `[data-ring]`, food scatter | FR-48-77, FR-48-80 | D |
| U13b Cursor reveal | 1 | the brand pages' ingredient-card peek (`[data-peek]`, `css-function:circle`): Spec 38A FR-38A-34's cursor-field `image-reveal` is not built; build it in Spec 38A, or a named divergence (Decisions 5) | FR-38A-34 | D |
| U14 Behaviour rules | 3 + *(Mama's)* 2 | `button[role=checkbox]` to `sgs/form-field-checkbox`; an index timer to slider autoplay; `@media` and scrollbar parts through the breakpoint rule's scoped CSS path (FR-48-50); *(Mama's)* sign-in / create-account tablist and tabs to `sgs/account`'s logged-out panel | FR-48-80, FR-48-50 | D, F |
| U15 Trees | Indus step 21 | the footer, drawer, mega menu and page-record surfaces (Appendix B step 21's forms are U9's); the container `pinBelowHeader`/`pinGap` writer | FR-48-19 | E |
| U16 Check and sign-off | Indus steps 23 to 25 | the code-to-code check with the render confirming, flows and Solve on every surface (FR-48-20); the answer-sheet sample (FR-48-70, FR-48-71, FR-48-73); `gaps.json` (FR-48-66) with the draft-defects list (FR-48-69); Bean's eye at 375/768/1440 (FR-48-21) | FR-48-20, FR-48-21 | E |

## Sessions and orchestration
Each session's main thread (Opus) keeps judgement and Bean's decisions; mechanical sweeps and serial machine runs go to Sonnet subagents with cold prompts, at most three at once. Sessions work in the shared checkout with explicit pathspecs; a subagent writing code works in its own worktree (`isolation: worktree`, `npm ci` in `scripts/computed-route` first) and the session merges it after a diff read. Five lint and solve-held tests fail in any agent worktree, clean `main` included, and pass in the main checkout: judge a worktree run by the tests its change touches, and run the full suite in the main checkout.

| Session | Units | Needs | Runs beside | Bean | Estimate (agent; machine separate) |
|---|---|---|---|---|---|
| A Opener | step 0, U0 if needed, U2, U2b, U4's rest, the id-to-unit map, prompts for B to F | step 20's handoff | nothing (it edits `clone-coverage.json` heavily) | step 6 review (20 min) | 1 h 15 (+45 min machine) |
| B Content | U5 (split first), U6, U7's rest, U8 | A | C, D | none if d3 and d4 are ruled | 1 h |
| C Forms | U9, U10, Indus step 22 | A | B, D | none expected | 1 h 15 |
| D Behaviour | U11, U12, U13, U13b, U14 | A, Decisions 4 | B, C | none if Decisions 4 and 5 are ruled | 1 h 30 |
| E Delivery | intake delta re-run, U15, U16 | A for the re-run and U15's footer, drawer and mega trees; B, C and D for U16 | B, C, D for U15; F | eye on every surface (1 h) | 2 h 30 (+20 min machine re-run) |
| F Mama's items | every *(Mama's)* item in U8, U9, U10, U14 | the unit's Indus part | E | none expected | 45 min |

**The refresh loop is one at a time** (Spec 48 Appendix B, "The framework refresh loop": reseed, deploy to indus-test, mirror refresh, recalibrate; about 20 minutes machine). B's U8 (snapshot key and theme rule), C's U10 (block attributes) and D's U11 (DB seeding) each need it. Each session batches its framework edits into **one** loop pass at its end, pushes first (a reseed runs only from a clean `origin/main` worktree), and takes the loop only after `ListAgents` and a message to every busy peer show no other pass running. Calibration on `local-indus` is part of that turn.

**Other shared files:** `clone-coverage.json` and `data/coverage-test-baseline.json` (each session edits only its own units' entries, commits and rebases straight after each unit); `lib/fill-resolve.mjs` (B splits it first, then C and D rebase); Spec 48 FR Status lines and `LEDGER.md` (written once, in the session's closing commit).

**Critical path:** A, then D, then E's U16. B and C finish inside D's time; E's U15 and F run beside them.

## Gates
- **G-A (auto, after A):** `capabilities.mjs --gate` exit 0; FR-48-8, FR-48-36 and FR-48-44 Status lines current; every `--drafts` id appears once in the id-to-unit map (a missing id fails the gate); U2b's tests red under mutation; prompts for B to F written. Fail: a CSS group the step 6 proof shows unwritten moves to U8.
- **G-BCD (auto, after each of B, C, D):** that session's entries covered with tests, its planted-draft test red with one write ref nulled, the route suite green in the main checkout (`node --test tests/*.test.mjs` in `scripts/computed-route`), its refresh-loop pass done; for C, FR-48-57's done-when.
- **G-E (review, Bean):** `capabilities.mjs --drafts` lists no Indus gap except Bean's named divergences; every surface paired at 375, 768 and 1440; Bean's sign-off.

## Step 0 (Session A, first 5 minutes)
1. `git pull --ff-only`; ListAgents. Read the step 20 session's handoff and the Indus plan's step 20 line. Open: U0 first. Done: carry on.
2. Prune any agent worktree left from 2026-10-21 (`git worktree list`; `fix/coverage-gate-test-refs` is merged).
3. Archive `plans/2026-10-11-spec48-indus-build.md` and `plans/2026-10-12-clone-coverage-foundation.md` to `plans/archive/` and repoint their links (Spec 38A, Spec 48, the coverage map's `_meta.purpose`, LEDGER) to this plan; names such as "Indus step 20" and "Order item 4" stay valid as history in the archive.
4. LEDGER: Front M and the Indus front become one front pointing here.

## Carried from the archived plans (each has its unit or stays backlog)
- **In units:** the control-gaps writers Indus uses (`pinBelowHeader`/`pinGap` U15, `{prefix}TextStroke*` U13, form-field-tiles descriptions U9); d3 and d4 (U8); the declared-values Open items handed to waves (Scroll sideways U12, form-field `grid-column` width U9, hero `splitContentOrder` U12); FR-48-17's two intake bugs (U2b).
- **Session E's intake delta re-run:** every new recogniser and writer reaches the review rows only through it; the full Indus rehearsal measured about 97 minutes of machine time, a delta run about 20. A timer-opened state is not forced as an opener after an unchanged attempt's drain (FR-48-34): checked on that measured run.
- **Backlog:** site and surfaces' unused capabilities and the `<meta name=description>` writer (FR-48-84, when a draft uses it); side-by-side defect-pass widths stay off (FR-48-28); the cart's `panelSlide*` row (after the cart moves onto the motion model's open trigger); `sgs/choice-flow` Back button hover needs a calibration trigger that advances the flow; the columns-tier floor in post-grid and gallery `edit.js` and four blocks' `repeat(0, …)`; `sgs/buybox` calibration needs a site with a product.
- **After Indus:** Mama's clone (its site build needs FR-48-55's shop parts and Spec 27 fixture products; its calibration follows Spec 48 Appendix A step 13; its Mama's-only control-gap writers: highlight, inline photo, link underline colour, label end shapes, buybox phone bar, Floating layer).

## Decisions for Bean (each before the session named)
1. **U4's 17 proposed exclusions** (before A). Recommended: exclude all 17.
2. **d3** (before B): the rounded `inset()` clip reveal, an Indus entrance. Recommended: a named divergence until FR-38A-57's motion additions, so Indus is not held for one entrance.
3. **d4** (before B): safe-area padding (`env(safe-area-inset-bottom)`) as an `sgs/nav-drawer` footer default, so the drawer foot clears a phone's home bar. Recommended: yes, a block default for every client.
4. **The shape of a setting's meaning** (before D, U11). Recommended: each behaviour setting's `block.json` attribute declares it (an `sgs.meaning` object: what it does in one sentence, its trigger from the `states` table or scroll, pointer, timer or load, and the companion settings that parameterise it), so the block owns its meaning and `sgs-update-v2.py` seeds it into `block_attributes`; the alternative, a separate hand-kept table, drifts from the blocks.
5. **The cursor reveal** (before D, U13b). Recommended: build Spec 38A FR-38A-34's `image-reveal` (one cursor-field type, reusable by any client), rather than a divergence.

## Built ahead, 2026-10-21 (evening)
Three Sonnet agents in worktrees, merged by the planning session after a diff read: U1 and U3 (`6dc909124`), Bean's three exclusions and U7's four entries (`f733fac90`), U5's image part (`e191fad0c`) and U7 (`325c711da`, merged once the step 20 session's header Fill runs were done; it also stops `lib/fill-presence.mjs::linkDecisions` writing an address into a block's `linkTarget` setting). The open-gap count went from 126 to 112.
