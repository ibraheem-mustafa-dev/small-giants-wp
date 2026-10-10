---
doc_type: plan
title: "Spec 47 F2: every block measured, paired by matched words"
spec: .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
created: 2026-10-04
status: in progress
---

# F2: every block measured, paired by matched words

**Purpose.** Solve sees every block of every Eye Care surface, not only the ones a hand-written walker config names.
`scripts/computed-route/pairs.mjs` pairs blocks to draft elements through the walker's own word matcher
(`scripts/parity/lib/auto-compare.mjs::matchWords`) and writes `sites/<client>/build/qa/parity/<surface>.full.mjs`; a
surface's `walkerFull` in `surfaces.json` makes Solve walk it. Every surface is paired. The current open-issue numbers
per surface are in `sites/eye-care-ward-end/build/qa/triage/*.json`; read them there, never from a doc.

## Session D: what it owns

- **Scope and lanes (Bean, 2026-10-08).** Session D works the WHOLE fix register
  (`plans/2026-10-02-eye-care-fix-register.md`), not Solve's score alone. Every register row not yet closed is put in one
  lane, recorded on the row:
  - **Solve lane:** the draft is the answer and the walker can measure it. Solve closes it. When Solve has not, the fix
    is at the root, in the solver or walker (`scripts/computed-route/`, `scripts/parity/`), never a hand-written tree
    value, so the same class closes on every surface and every future client. Test first, then re-run Solve to close it.
  - **Fix lane:** everything else: Bean's decisions against the draft (S1 lift, S2 underline sweep, S3 no fade, S4
    WhatsApp; each also ledgered so Solve never writes the draft back), framework gaps and extensions, and rows the walker
    cannot measure (behaviour, content, functionality). Fixed directly and verified live.
  A surface is at 100% when Spec 47's done line holds and every register row for it is closed with its evidence. Why: Solve
  only closes what matches the draft, overwrites decided differences that are not ledgered, and cannot see the ~70
  "not walker-measurable" rows, so its score alone overstates progress.
- **Ranking rule.** Site-wide fixes S1-S12 first (one change closes items on many surfaces), then surface by surface. Within
  a surface: Fix-lane rows and their ledger entries before Solve runs, then Solve, then mark every row. Walker gaps that
  hold the most open Solve-lane rows across surfaces are fixed as they block the surface in hand.
- **Register items owed as tree values:** the mobile drawer's links (mobile-menu surface): the draft fades and rises each
  link in when the drawer opens, live shows them at once; 14 rows open, but the walker does not sample the rise, so they
  cannot be judged. Taken with the mobile-menu surface's Solve pass: first make the walker sample an entrance inside the
  `drawer-open` state.
- **Coverage still owed:**
  - Register rows 150, 152 and 155 need `surfaces.json` entries for checkout, bag and confirmation: each has a
    walker config but no tree and no target yet.
  - The footer's size-guide modal: the `modal-open` state, its scoped pair and the `surfaces.json` state map, all
    three together.
  - Product's 2 lost pairs.

## Carried and open

- **Route lint is red** (`node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`
  exits 1). One cause:
  divergence entries D-72 to D-86 (Lenses: the draft's scroll reveal never fires below 1440, so its measured positions are
  a draft flaw) and D-88 to D-91 (Contact: a hover border colour on a node with no border paints nothing, D-65 ruling)
  cite no register item. Give those rulings a fix-register row (or cite the existing one) and set each entry's
  `register` array. Done when the lint exits 0.
- **Encode the register's prose-only rulings** (Bean, 2026-10-08, "condense and encode"). `sites/eye-care-ward-end/build/qa/divergences.json`
  holds the rulings the walker honours; some rulings in `.claude/plans/2026-10-02-eye-care-fix-register.md` exist only as
  prose ("deliberate", "accepted", "Bean's decision"), so a sweep can flag them and a session can "fix" them back. For each
  such ruling that names a measurable element and property, add a ledger entry in the FR-47-5 shape (`reason` quotes the
  ruling, `register` cites the row); behaviour-only rulings (keyboard, motion, content) stay prose and are listed. Done
  when one Eye Care sweep reads each newly encoded row `accepted` and no other row changes status.

- **Dead calibration rows** (`.claude/reports/2026-10-07-dead-calibration-rerun/SUMMARY.md`, the 2026-10-04 pipeline re-run
  unchanged, with its `classify3` split): 546 dead; FIXTURE_LACKS_ELEMENT 210, **UNEXPLAINED 106**,
  PORTAL_OR_CLOSED_SURFACE 55, READ_CAP_81 53, HOVER_POINTER_MISSES_ELEMENT 38, the rest under 14 each. Still open: 100 of the 106 (the other 6 were `sgs/cta-section`'s),
  to be diagnosed per mechanism, largest groups first (by property: background-image 19, grid-template-columns 10, text-indent
  9; by block: nav-bar-menu 10, nav-drawer-menu 9, hero 7), plus the `oneWidth` probe list (23 today).
  The nav groups wait for the nav-bar-menu recalibration another session was running on 2026-10-08 (it rewrites their caches).
  **hero diagnosed 2026-10-08 (7 rows, code and cache reading, not yet proven by a render):**
  - Block code, 1 row. `hero/style.css::section.sgs-hero{max-width:none}` out-ranks the wrapper's scoped `max-width`
    (`maxWidth`): the known real gap in the backlog; that rule stays (D725, full-bleed sections), so the fix is the
    emitted rule's specificity, never removing it.
  - Calibration preconditions and markers, 6 rows (`lib/calibrate-instances.mjs::preconditionsFor`,
    `lib/calibrate-markers.mjs::markersFor`). hero's tier images need a base `backgroundImage`. `textIndent`
    paints only between two adjacent text blocks, which no fixture has. hero's `bgSvgOpacity` needs `bgSvgContent` and an
    integer marker (`absint` turns 0.37 into 0). `bgZoomStart` needs `bgKenBurnsMode: zoom-out-once` and a marker in
    100-150. `gridTemplateColumns` needs `variant: split` and a track-list marker.
- **Font-family values are preset slugs** (Bean, 2026-10-08). `85f07d38a` makes `heading/edit.js` paint a slug too. It is
  committed; `.claude/LEDGER.md` does not name it, so its deploy state is not recorded there. It ships with the next green
  `build-deploy.py`.
- **`mega-group` discovery data is empty** (`cache/mega-group.json::discovered.sgsChildSizing` is `{}`), though Spec 47 L1.3
  resolves child sizing through discovery. It costs 9 `flex-grow` rows on the mega surfaces (triaged F `no-setting`). Ruled
  out: the render, the editor registration, `lib/calibrate.mjs::discoverEffects`, a panel rule overriding the flex, and
  two calibrations crossing on one page (a clean solo `--recalibrate` on `local-eye-care`, 2026-10-09, still records
  nothing; the per-site lock `lib/calibration-lock.mjs`, `5bebb2b6d`, stays as a guard). Cause unknown; next, render one
  calibration instance with `sgsChildSizing` `fill` and read the root's computed `flex-grow` against the fixture default.

## Session D, 2026-10-09: labels, framework gaps, the local route

Triage re-run on all 17 surfaces from their newest reports (2026-10-08 `--rounds 0`, footer re-measured 2026-10-09) and
sweep `qa/sweep/2026-10-09/sweep.json` (1,817 open, none stale). An independent Sonnet re-derivation of all 217 F verdicts
agreed with 105; the main thread checked every disagreement against code.

**Labelling fixed** (each MUST FAIL + negative control, triage re-run, every moved label traced): `unmeasured-side` (10
false F; `ac78fee32`), `same-element` (an element read by every enclosing pair's text carrier; 45 own rows had followed an
echo, 108 chains ended on a row no triage reports), `L` / `ledger-consequence` (a row following a divergence-ledger decision;
walker equivalence accepts never attribute), `uncalibrated-fit` (146 rows: a name fit calibration never measured is a
calibration gap, not a setting Solve failed to write), `mispaired` (43 rows: boxes over twice the size AND different words;
`d5f7e4c4a`).

**Tool fixes** (Bean approved the walker and solver changes 2026-10-09): one shared paints-nothing rule for every surface,
`gap` included (`ba31e5157`; the seven per-surface copies and Home's about-step patch deleted, `walker-refs` guard green
again); `effectiveState`: a walker state mapped to a setting state resolves at rest for what it does not change
(`65c464f4b`); box-held rows (padding, margin, border width, flex-grow) accepted when the pair and every pair inside it keep
box and text position, transition timing never (`d5f7e4c4a`); a flow row is measured from the nearest earlier pair not
nested with it (`e0660afa0`); `--site <target>` runs Solve on a local mirror, `scripts/local-wp/refresh-from-remote.sh`
refreshes the mirror from its test site (`e1f814775`).

**Ledger** (Bean, 2026-10-09): Contact's tap-area entries D-17 to D-33 widened to every walker state (they left 216 unchanged
rows open in the form states); D-126 to D-133 Google Reviews arrows and timing (register N17c, the 2026-10-05 ruling) and the
review buttons' lift (N16a). S9 stays a walker accept in `qa/parity/shop.mjs`: the ledger cannot scope an entry to one element
of a block (§5 Residual), so an S9 entry on the product card would accept every card text and style row.

**Framework gaps closed:** `sgs/mega-panel` `groupPadding` and `groupTransitionDuration` (`a5977f7a7`, manifest `8e0e32a01`;
20 rows on the mega surfaces); WooCommerce filter chips `sgsChipGap` extension (`371d8a27a`, wired `a56437129`). Reseed
`76835cca7` from a clean HEAD worktree; a full `sgs-update-v2.py` run left `sgs/hero.splitMediaType` reclassified, which
`dbschema/seed_reference_data.py` re-asserts (do this after every reseed until the reclassifying stage is found). The next reseed also applies `d025d6935`
(new `block_attributes.emit_shape_proof` column; 390 content attributes classified, up from 379, so a seed-history or
value-identity flag on that count is expected) and `a2a524b38` (prunes the 93 retired `sgs/cta-section` effect rows).
Assessed and NOT gaps: the lens configurator's 28 rows (the draft pads the outer panel, live the inner one by the same
amounts, `lensAsidePad`) and 40 of the shop's 43 (invisible, mispaired, or existing settings). Product's related cards are
`sgs/product-card` with hover lift and shadow off: an existing setting Solve never wrote (a tool defect, below).

**Local baseline, 2026-10-09** (3-round Solve on all 17 surfaces against the local mirror, `--site local-eye-care`; report
`.claude/reports/2026-10-09-session-d-local-baseline/REPORT.md` with the council's live, code and random-row checks). Sweep
1,817 -> 1,613 open, none stale. Best: mega-lenses 111 -> 29 (1 wrong setting of 22), mega-help 43 -> 12, mega-sunglasses
43 -> 26. Worse during the run: home 199 -> 208 (proven: Solve wrote 22px mobile side padding on cards -31, -35 and -39
whose `.sgs-container__inner` already had it, so items went 291 -> 247px) and product 317 -> 350 (cause unproven: its
40px narrowing is a nested section repeating the page padding that was already in the tree). Shop is untrusted (its
first try crashed in guard round 6 and the retry started from that tree). The trees were restored to HEAD; the
baseline's writes are kept as `baseline-tree-writes.diff` in the report folder. About 57% of open style and box rows are
false positives (random sample of 30, interval 39% to 73%).

**Open tool defects, in order** (each proven by a live read, a code read or a run; the report cites which):
1. Solve writes through a mispaired pair on a surface with no origin file (`<surface>.origin.json`, R4): only rows the
   walker flagged from an identity disagreement are skipped (`lib/solve-rows.mjs::writableGroups`), and triage's
   size-and-words label (`lib/triage.mjs::mispairOf`) never gates Solve. Mega-brands had 5 of 6 wrong settings this way.
   Fix: give every surface an origin (skeleton writer plus `origin.mjs`, R4), not a second heuristic gate.
2. `lib/guard.mjs::guardRound` deletes an exhausted trial with its `tried` set, so the same suspects are tried again until
   the `maxRounds * 4 + 1` cap (home rounds 5 to 13 repeat exactly). Owned by R6 step 3: the trial in the write round
   removes most guard trials; the memory fix stays for blocks the trial cannot judge.
3. A padding write doubled by a level below already carrying it (home cards): the trial rejects it before writing
   (R6 replay); it stops reaching the tree when R6 step 3 wires the trial into `solve.mjs::writeRound`.
4. Shop: clean re-run from the committed tree; product: prove the cause of the 87 new rows before any fix.
5. `solve.mjs` throws ENOENT reading `round-1/report.json` after a round-1 build failure instead of reporting it.
6. Smaller, from the council: ledger `placed-after` attribution never compares shift sizes (`ac78fee32`);
   `effectiveState` misses an open-state style live adds; `acceptHeld` ignores unpaired children and box x/y; a nested
   container shift can repeat on each child row; `SGS_LIVE_ORIGIN` in the environment retargets every walk.
7. Still open from before: the loose `layout-row` consequence (unproven followers), calibration coverage
   (`uncalibrated-fit`; mega-group `sgsChildSizing` discovery is empty even on a clean solo run, so the crossed-runs
   theory is disproved), `css_property` NULL settings, a hand pair that displaced a generated pair and misses live
   (Contact `-20` `form-card`), business-info `displayType`, repeated inner text pairing, layout never written, missed x
   rows, theme options Solve cannot write.

**Owed to Bean:** Spec 47 §3.8 writes a parent attribute only where its paint reaches exactly one measured descendant
(`lib/resolve.mjs::resolveViaAncestor`). The mega-panel tiles (40 rows on mega-lenses) and accordion headers need it
relaxed to "every reached descendant wants the same value"; risk: with one measured tile the parent moves unmeasured ones.
The draft's template identity (below) turns this into evidence: allow the parent write when every reached descendant is a
copy of one `sc-for` loop body and the property is static there.

**Route-accuracy build (Bean chose the order 2026-10-09; council `.claude/reports/2026-10-09-route-accuracy-council/`,
proofs `.claude/reports/2026-10-09-skeleton-writer-test/`).** Open tool defects 1 to 3 above are
owned by its phases R4 and R6. Each phase is scored on the answer sheet before and after; every new test is MUST FAIL first
with a negative control; `node --test scripts/computed-route/tests/*.test.mjs` stays green.

- **R1. Answer sheet as a permanent test.** `sites/eye-care-ward-end/build/qa/answer-sheet.json` (the frozen 100 rows:
  47 false alarms, 29 wrong writes, 24 real problems), `scripts/computed-route/lib/answer-sheet.mjs` (row keys matched on
  state, width, ref, path, kind and property; pair names renumber, so they are not matched), CLI
  `scripts/computed-route/answer-sheet.mjs`, test `tests/answer-sheet.test.mjs`. A real problem not kept fails (exit 1);
  false alarms dropped and wrong writes avoided are printed per pattern. **Built 2026-10-10.** The gate is a ratchet
  (`qa/answer-sheet-baseline.json`): a row that passed in the baseline and fails now exits 1. A row that never passed is
  a known miss. A false alarm "absent" from a walk counts as dropped, so the printout shows each label's outcomes.
  First baseline (each surface's newest stored run; footer and header later re-baselined, see R4 and the council
  notes under R6):
  - false alarms dropped: 20 of 47 (footer 4/11, home 3/9, header 0/3, mega-lenses 4/9, mega-brands 7/8, shop 0/3,
    product 1/3, mega-sunglasses 1/1);
  - real problems kept: 22 of 24. RP-MB-01 is lost because triage labels it `mispaired`; RP-ML-01 is lost because it
    exists only in round 1;
  - wrong writes avoided: 0 of 29.
  A planted walk with footer RP-FT-01 removed exits 1.
- **R2. Skeleton writer.** CLI `scripts/computed-route/skeleton.mjs` (inventory, propose, review, finalise, decide) with
  `lib/skeleton-{inventory,propose,review}.mjs`, ported from the prototype in `evidence/`. Block knowledge only from the
  DB and saved decisions (`scripts/computed-route/data/skeleton-decisions.json`, client-free;
  `sites/<client>/build/skeleton/decisions.json`, per client). Generator rules: footer/header wrapper blocks from
  `block_composition` section roots and what they accept; a run of sibling links becomes one `sgs/icon-list`; a typed
  brand name becomes `sgs/responsive-logo`; brief-only lines are flagged for removal. New finder kind `tpl`
  (`lib/fill-skeleton.mjs`, `scripts/parity/lib/collect.mjs::resolveFinder`); `scripts/computed-route/check-refs.mjs`
  resolves every finder (the 2026-10-09 "33/33" was a hand check). Fill keeps identity in `<surface>.origin.json`. The
  prototype's inventory, proposal and picks are not on disk, so the inventory is regenerated; the 13 uncertain rows are
  the confidence-below-0.7 rows of `evidence/compare.md`, with Bean's choices updated for N47-N49. Done: footer
  `check-refs` resolves every finder uniquely and the skeleton matches Bean's choices on at least 12 of 13.
  **Built 2026-10-10:**
  - Footer: `check-refs` resolves 24 of 24 finders uniquely. The skeleton matches 13 of 13 uncertain rows; the
    column-label and link-list decisions were written knowing Bean's choices, so this shows the data agrees, not
    unaided discovery.
  - The root rule breaks the hero/site-header tie by what each root accepts. Every core block is rewritten through
    `blocks.replaces` or rejected (`sgsOnly`).
  - Header skeleton: root, rows and columns are right; the nav is proposed as three buttons, not `sgs/nav-bar-menu`,
    and the trust bar, rating badge and cart get no node.
  - Not built: the finaliser has never been run as a subagent; the site name comes from
    `sites/<client>/build/skeleton/decisions.json` (`siteName`), not live Site Info; a link-list node's `draftRef` is
    its first link, so Fill does not read the list's own gap or width.
- **R3. Fill: business-info's five settings** (`addressLink`, `hoursLayout`, `showIcon`, `hoursRowJustify`,
  `labelColour`). Each drops because it is not a plain style read: `addressLink` needs a calibration `link` key,
  `hoursLayout` a `presence` entry, the other three a `draftSlots` entry.
  **Built 2026-10-10:**
  - Fill lists every setting no read reached and no decision judged under Not read (`lib/fill-unread.mjs`).
  - Proven cause for `addressLink`: `calibrate.mjs` gave the content plan no fixture preconditions, so it was read under
    the phone display. Both plans now share `instanceCtx`, and the business-info fixture names
    `addressLink: { displayType: address }`. It takes effect at the next business-info calibration.
  - `showIcon`, `hoursRowJustify` and `labelColour` get their evidence from the skeleton writer's `draftSlots`.
  - `hoursLayout` is a Spec 47 §5 Residual: a shared calibration change, so Bean signs it off first. The two icon fixes (social-icon styling onto the row's
  `childIcon*` settings; icon size from the glyph, not the box) run in a separate session:
  `.claude/prompts/2026-10-10-icon-fill-and-draft-domains.md`. The social-icons calibration predates the `childIcon*`
  rename (`675df46e3`), so that session recalibrates it first.
- **R4. Exact ID pairing.** `pairs.mjs` pairs each block through its `tpl` finder when an origin file exists. Word
  pairing runs as the cross-check, and a disagreement is listed as `mispaired` in `qa/pairs/<surface>.json`. Inside a
  block, the block's named parts (DB element manifest) are matched by structure inside its own draft element.
  `lib/solve-rows.mjs::writableGroups` never writes through a mispaired pair. Origin files come from fresh
  skeleton-writer links, never converted from word pairs. Done: footer and header pattern-2 false alarms dropped, every
  real problem kept.
  **Built 2026-10-10:**
  - The walker flags rows on a `mispaired` block and keeps them. Solve never groups a flagged row, triage labels it
    W / mispaired, and the answer sheet scores it an artefact (GAP-CHECKLIST section 28).
  - `origin.mjs` aligns a committed tree with its skeleton by block names (`lib/identity.mjs`).
  - `pairs.mjs::identityPass` pairs every origin block by its tpl finder and cross-checks the word pairs.
  - The skeleton writer's root rule now breaks the hero/site-header tie by what each root accepts.
  - Footer: 18 blocks with an identity. 13 hand pairs agree; the generated brand-column pair, which had paired the
    column with its tagline paragraph (294x42 against 307x166), now measures the column. All 3 generated pairs are tpl
    finders.
  - Header: 6 blocks with an identity. `gen-header-1` now pairs the live root with the draft's own `<header>`, not the
    inner row the words chose on 2026-10-09.
  - Answer sheet on fresh read-only walks (`qa/solve/<surface>/2026-10-10T-identity-walk/`): header pattern-2 false
    alarms dropped 3/3 (was 0/3); footer pattern 3 3/3 and pattern 5 2/4 (were 0/3 and 0/4).
  - Footer real problems RP-FT-04 to 06 are absent from today's walk with the old word pairing too, so their absence is
    the 2026-10-09 draft and footer changes (the removed Glasses line, the reshaped social row), not the pairing. Footer
    and header were re-baselined on those walks.
  - Identity against words on the same footer walk: one knock-on row (FA-P5-02, the column's y-in-main) is open with
    identity and absent with words; knock-on splitting is R5 and R6 work.
  - Still open: the header's nav-bar-menu, trust-bar, rating badge and cart have no skeleton node, because the generator
    proposes the nav as buttons. Inside-block structural matching of named parts is not built yet.
- **R5. "Does it paint?"** `scripts/parity/lib/neutralise.mjs` sets the draft value on the live element in the open
  browser. When no box (the element, its contents, the siblings after it) moves and the live crop is identical, the row
  is inert. It ships with the value-source field (`collectPair` returns `{value, src}`), which absorbs
  `walker-decoration.test.mjs.pending`. It replaces `compare.mjs::INERT_LAYOUT` (`ba31e5157`). A gap of 48 vs 16 in a
  fixed box stays open.
  **Built 2026-10-10:**
  - Verdicts: `inert` (nothing moved), `breaks-box` (the pair's own box moved) or `moves` (only content moved).
  - `isAccepted` accepts `inert`, and `breaks-box` while the pair's box matches; `moves` stays open.
  - First home walk, binary verdict: the process steps were found to be a grid with an empty second row, so the draft's
    16px row gap would move a box that already matches. Hence the `breaks-box` verdict.
  - Home walk (`qa/solve/home/2026-10-10T-neutralise-walk-2/`): of the tested layout rows, 141 inert and 96 reached
    another way are accepted on measured evidence, 0 rows the old rule accepted are reopened, and 8 stay open as before.
    Mega-lenses: 6 accepted, 0 reopened.
  - The answer sheet has one row on these seven properties (FA-P1-01), so it cannot score this phase. Its other
    "paints nothing" rows (scale, padding, width, line-height, colour) are R6 work.
  - Underline rows are stamped with the decorated element's path (`decoPath`, `paint.mjs::decoratedElement`);
    `walker-decoration.test.mjs` is live.
  - The full `{ value, src }` row field is not built: it is only needed for properties R6 tries.
- **R6. Try before write.** `scripts/computed-route/lib/trial.mjs` (from `evidence/trial.mjs`) renders the block twice
  through `/wp/v2/block-renderer`. The current render must reproduce the live uid and its CSS, otherwise the block is
  `needs-rebuild`; `wp_unique_id`/`microtime` and `usesContext` blocks always rebuild. It injects the CSS difference,
  re-measures every width, and keeps a write only if the page moves toward the draft. It replaces `guard.mjs`'s
  per-walk trials for trialled blocks. R-47-9 is amended: a wrong write is any write a post-write read shows moving away
  from the draft. Done: the home cards' doubled padding (WW-HM-01..03) is rejected before writing.
  **Built 2026-10-10 (steps 1 and 2 of 3):**
  - `lib/trial.mjs` and `lib/trial-page.mjs` hold the judgement and the page side. `trial.mjs` replays one round of a
    Solve run.
  - The self-check needs the attributes saved on the post: the uid hashes exactly those, and the editor normalises the
    tree's attributes on save. Reading the committed tree failed the self-check on 24 of 24 home writes; reading the
    post's raw content over REST (`savedBlock`) passed it on 21.
  - Verdicts: `keep`, `reject`, `no-box-change` (a colour moves no box, so the rebuild judges it), `needs-rebuild`
    (usesContext, per-request classes, a self-check miss or a markup change) and `no-css`.
  - Home round-1 replay of `qa/solve/home/2026-10-09T09-03-14` on the local mirror: 24 writes, keep 2, reject 6, no box
    change 12, needs a rebuild 3, same CSS 1.
  - Wrong writes avoided on the answer sheet: 5/7 (was 0/7). The four card paddings and the brand-strip padding are
    rejected before writing; WW-HM-06 (multi-button gap) and -07 (button transition) are per-request-class blocks,
    which the trial cannot judge.
  - One reject to check: `cr-ref-home-54` borderWidth (+3px, not on the answer sheet).
  - **Step 3, next:** call the trial from `solve.mjs` after `writeRound` and before the rebuild (pre-round saved
    attributes as A, undo and block a rejected write). Prove it with one home Solve run on the mirror; then amend
    R-47-9 and record that the guard's per-walk trials remain only for blocks the trial cannot judge.

**QC council on R1-R6 (2026-10-10, three read-only raters):**
- Fixed in the same session (each with a MUST FAIL test):
  - An absent answer-sheet row counts as dropped only when the walk measured its block there; otherwise it is
    `unmeasured`. The footer's FA-P1-01 had passed only because the address block went unmeasured, so the footer was
    re-baselined. The scorer exits 2 when a file its baseline names is missing.
  - The paint check calls a gap or alignment on a non-flex, non-grid element `moves` (no proof), and restores the value
    while transitions are still off.
  - Every row of a pair whose root block is mispaired is flagged; Solve's `classify` files flagged rows as mispaired.
  - Identity pairing never revives a block the width re-check refused, and two zero-size elements never agree.
  - The trial's block origin uses only pairs present on both sides.
- Open, in order:
  1. Hand pairs not on the block root are never identity-checked (header: 4 `noWordPair`). Resolve each hand pair's live
     element to its owning ref, and report `uncheckedHand`.
  2. `identityPass` never compares the origin fingerprint with the resolved element's tag, and does not report
     unaligned skeleton nodes.
  3. Multi-state surfaces are identity-checked in the first state only.
  4. `breaks-box` with a matching box does not check the children's positions; also watch the parent or document height
     beyond the next 20 siblings.
  5. Trial: viewport height and device profile differ from the walker's (812px and phone below 500px); per-pair
     numbers are not stored; the tolerance does not scale with pair count (`cr-ref-home-25` kept at -1.6 over about 90
     pair-widths); `restored` is not gated; vertical movement is ignored. Replay shop, product and header too.
  6. The answer sheet has no `obsolete` status for rows whose draft element is gone (RP-FT-04..06); baseline walks
     under `qa/solve/` are not in git.
  7. `unreadOf` repeats per node (aggregate by block, kind and slot); `sgsOnly` merging inflates confidence; the root
     `fits` tie returns for a header holding both an image and a wrapper.
  8. `decoPath` changes the path of underline rows on non-link text: check divergence and calibration keys.
Header and footer reshaped on 2026-10-09 (register N47-N49): the wordmark is an image on both sides and Visit or call is
one icon-list (`cr-ref-footer-23`). Done the same day: mirror refreshed from eye-care-test (home cards back to 291px at 375;
`refresh-from-remote.sh` now runs its WSL step with `--exec`, because `wsl --` expanded `$got` in an extra shell and the
siteurl check always read empty), both `.full` configs regenerated, the wordmark, address, hours and social hand pairs
retargeted (live social boxes are `sgs/icon` shapes found by their hidden link name), a `header-logo-group` pair added, and
ledger D-40 to D-47 (the phone's tap-area padding) removed on Bean's decision: the list item keeps its natural tap area.
The header lost its four word-matched generated pairs: two were the proven mispairs (live outer header against the draft's
inner row; the logo group against the words span), the other two are the wordmark now covered by hand.
Later the same day: the walker no longer reads visually hidden text (a screen-reader link name) as painted (`walker-sr-only.test.mjs`;
footer walk 746 open rows to 599, `.claude/reports/2026-10-09-skeleton-writer-test/evidence/footer-walk-{before,after}-hidden-text-fix.md`), the draft footer and drawer follow the live ones (Bean: live is the ideal), and ledger
D-40 to D-47 and D-105 to D-108, D-113 to D-125 are removed on Bean's decision. A ref-traced footer walk at 1440/768/375
after the draft changes decides no row with any remaining footer entry, so D-60 to D-64, D-96, D-97, D-101 to D-104 and
D-109 to D-112 are removed too (Bean); D-65 and D-66 stay as the record of the no-border hover ruling D-88 to D-91 and
`solve.mjs` cite.

## Contact (page 190): state at the end of 2026-10-08

Solve (`qa/solve/contact/2026-10-08T15-43-56/`): whole page 45 -> 44 distinct issues, 0 new; 3 writes, wrong settings 1 of
2 (business-info `displayType` phone -> email, reverted twice by the guard). Hours closed (register 130, `e77963c4e`).

- **Open, root:** Solve may pick a setting that changes what a block is (`displayType`: phone, email, hours) to fix a style
  row. A first rule keyed on calibration's discovered `content` (`230456b91`) was reverted (`a728331f3`): that key is the
  `::before`/`::after` `content` property, not the words. A sound signal is still to find (candidates: the cache's `text`/
  `presence` sections, or the root element's `_tag`); until then the guard catches it, at a cost of one wrong setting per
  run. First action: print `scripts/computed-route/cache/business-info.json`'s `text` and `presence` sections and
  `discovered.displayType._tag`, and find a field that marks a setting changing what the block renders, then a MUST FAIL
  test in `tests/resolve.test.mjs` on the 2026-10-08 Contact shape.
- **The independent check** (`sites/eye-care-ward-end/build/qa/independent-check.mjs --surface contact`) reads **41 open,
  3 accepted** (D-99's `found` row at each of 375/768/1440: the draft's WhatsApp number is two digits short; D-100 holds the
  walker's text row). The 41, by cause:
  1. The D-16 map (about 18 rows): live cr-ref-contact-24 holds the embedded map (no words) where the draft column holds
     a sketch with its own words, so -24's height and text inset (432px) and the cards' and their texts' positions
     (-27 to -32) follow the map. Prove they move with the map alone (one probe with the map hidden on both sides), then
     ledger them as D-16's consequences.
  2. The form column cr-ref-contact-20: 10-11px taller at every width, and at 768/1440 its text fills the column
     (right inset 28px) where the draft's stops short (363px at 768, 195px at 1440). Read the draft's declared max-width
     on the form intro/fields first (`devtools.mjs::declaredValues`).
  3. The page and left column (-0, -1): about 10px taller at every width, and the page's right text edge at 1440 (draft
     69, live 116; the old N39 probe). Find which child adds the 10px before writing anything.
  4. Small right insets on -1 and -3 at 1440 (7 against 4px).
- **Then** Solve (3 rounds) and the done line: fresh rebuild of the committed tree, 0 unexplained and 0 labelled gaps, 0 new
  rows, wrong settings at most 10%, independent check 0 beyond the ledger, planted-fault control.

## Contact form (Session D; surface `contact-form`, post 285)

87 distinct issues open on the 2026-10-07 sweep. Paired 6 of 6 with every field measured at its control (`liveControl`).
The last Solve (`qa/solve/contact-form/2026-10-04T11-24-38/`) closed 27 but regressed 4 rows with 7 wrong writes, so the
tree was restored from git and rebuilt; two of its causes are now fixed (the per-round `conflict` rule, tag matching).
Still open before it can run clean: the draft's select is not the inputs' 52px height, so `fieldMinHeight` (input and
select) moved the textarea 6px; decide the select's own height (a `fieldSelectMinHeight`, or the select measured against
the inputs) at the framework, then re-run Solve.

## Spec 47 build log

Results, run records and counts moved out of Spec 47 section 5. Spec 47 section 5 keeps the Success and Kill thresholds, the Bean rulings and the residual list; read counts fresh from `sites/eye-care-ward-end/build/qa/triage/*.json` and the fix register, never from this log.

### Steps 1 to 5 as recorded

1. **Foundations.** The resolver, normaliser, read-only database and ledger (FR-47-1, FR-47-5), plus walker items 6 and
   7 (FR-47-6), with tests. **Done 2026-10-03:** 38 tests pass, the lint fails on a planted unlisted export, both walker
   items turned red on planted faults (GAP-CHECKLIST §16), and the benchmark scores 5 of 5. **The "0 noise rows"
   figure recorded here was superseded on 2026-10-06:** a full 10-run `--noise` benchmark on a quiet host read
   **5 noise rows**, every one a phase artefact (a draft view-swap fade, the trust-bar marquee's scroll phase, and
   one shadow read at t≈0.999), not host load and not walker flakiness. A run reading 0 was never evidence of
   absence, because all three causes are phase-dependent, so a phase-dependent count cannot be compared across
   runs without pinning the phase. Detail: `.claude/reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`.
2. **Footer proof.** Solve (FR-47-3) on Eye Care's footer, with calibration (FR-47-2) of the blocks it uses. **Passed
   2026-10-03 (run 3 below).**
   - **Baseline:** `sites/eye-care-ward-end/build/footer.tree.json` at commit `b7c09adc1`, built to `sgs_footer` 182 on
     eye-care-test and walked with `footer.mjs --headless --widths 375,768,1440,1920`. That `report.json` is the
     "before".
   - **Scored items** (setting values on blocks that already exist):
     - register items 25, 26, 28 and 38;
     - the spacing, size and tracking parts of 27 and 29: the top margins, the tagline margin, the social-row margin,
       the brand column gap, 11.5px, 0.2em, weight 400, line height 1.5, the 4px bottom margin and the 10px column gap.

     An item is closed when the rows for its elements read no open difference at all four widths. The block swaps in
     27, 29 and 30 are outside the proof and must appear as Unresolved or Missing setting.
   - **Success** (Bean, 2026-10-03: Solve's job is to close what existing settings can close and to name what they
     cannot; a correctly named gap is a success, not a miss). All three hold:
     - At least 90% of scored items are handled: closed, or left open and correctly identified as a framework gap
       (classified Hardcode or Missing setting). Calling a fixable item a gap is a failure. Whether a gap is real is
       judged outside the tool, by the register or by proof (calibration, code), never by Solve's own label.
     - No row closed before is open after, and no open row moves further from the draft.
     - At most 10% of writes are wrong.
     Whether a gap gets the right type (Hardcode for a repair, Missing setting for a new control) is reported as a
     further measure, not a condition.
   - **Kill:** under 60% handled, over 10% of writes are wrong, or the third write round still writes. A round that
     only reverts regressions (R-47-9) is not a write round.
   - **Result, run 3 (2026-10-03): success on the handled line, with one 4px knock-on recorded.**
     - After run 2 (below): the success line became Bean's (a correctly identified gap is a success), a revert-only
       round stopped counting as a write round (R-47-9), calibration discovers what enum settings with no
       `css_property` paint (§3.1), and `flex-direction` and `flex-wrap` are measured under `refPrefix`.
     - 14 of 15 scored items handled (93%): 13 closed, including 29's 10px column gap (written as the container's
       `layout: stack`, found by discovery, plus its `gap`); 38 identified as a framework gap. 25 stays open on the
       footer height alone (all its padding rows closed), which follows from 30 and 34.
     - 47 writes, 2 wrong (4%): the two `maxWidth` collapses (register N46), reverted by the guard in a revert-only
       round. Write round 3 wrote nothing: converged.
     - 0 new rows; style and box rows open 990 before, 642 after. One open row moved further from the draft: the
       copyright line's width at 768, 4px narrower (512px draft; 348px to 344px), a knock-on of the bottom row's
       correct 24px side padding on a line already 164px off. The guard saw it and found no write on that element
       to revert. Strictly, criterion 2 misses by that one element at one width.
     - Gap typing (reported, not a condition): 38 came out Missing setting where the evidence says Hardcode (the
       day label's weight is hardcoded), so typing still needs work: calibration knows the setting paints the root,
       not that a rule on the child overrides it.
   - **Result, run 2 (2026-10-03): short of success, on the "round 3 still writes" kill clause only.**
     - Run: 7 blocks calibrated on eye-care-test, then Solve with the full-CSS walker config (5 layout pairs added to
       `footer.mjs`). The baseline tree (b7c09adc1) plus ref classes was round 1.
     - 12 of 15 scored items closed (80%). Style and box rows open: 970 before, 687 after. 0 new rows.
     - 38 writes, 2 wrong (5%): `maxWidth: 1440px` on both footer rows collapsed them to a 0px content width (auto
       margins cancel the row's stretch; the header rows had the same fault, fixed in acc2a3b6d). The regression
       guard (R-47-9, `solve.mjs::revertRegressions`) reverted exactly those two in round 2, pinned through the
       setting's calibrated side effects (`|margin-left`, `|margin-right`, `|width`). They are classified Hardcode
       (breaks-layout): a framework repair for `sgs/site-footer-row`.
     - Round 3 wrote 2 settings (the tagline's side margins to 0, exposed once the revert landed): the kill clause.
       The revert round used round 2.
     - Survivors against the register: 25's padding rows all closed; its footer height (4px off at desktop, 16px at
       375) follows from 29, 30 and 34. 29's 10px column gap needs the container's flex layout: a setting with no
       `css_property` in the database, so Solve cannot find it yet, and it is wrongly classified Missing setting.
       38's weight is hardcoded on `.sgs-business-hours__day` (600), which the block's weight setting does not
       reach (calibration: it paints the root only). That is a framework repair, not the register's "tree".
     - Calibration also flagged `sgs/site-footer-row` per-device `gap` and `contentWidth` reaching 375 and 1440
       but not 768 (a one-width hardcode candidate), and dead settings per block (some are fixture artefacts, such
       as a border style with no border width). Each is proved before it is fixed.
3. **Solve on every built Eye Care surface.** It shrinks the current fix register. In progress (2026-10-04).
   - **Built and in use:** walker state mapping (each `surfaces.json` entry maps walker states to setting states; rows
     from an unmapped state are reported, never written), 17 surfaces with walker configs and score items
     (`sites/eye-care-ward-end/build/qa/solve-score.mjs`, `qa/score-items/<surface>.json`), reference blocks
     (`lib/references.mjs`; a linked placeholder is never written; `lint.mjs --surfaces` passes), the pinpointing guard
     (`lib/guard.mjs`, R-47-9), box seeding of a border width's unset sides (`resolve.mjs::seedSides`), and the
     divergence ledger (`sites/eye-care-ward-end/build/qa/divergences.json`; every entry cites its register items).
     Contact's subtext keeps its 22px margin (Bean, 2026-10-05), so the 375px name-field drop stays open (register
     CR15/N45b).
   - **Calibration:** every SGS block but `theme-toggle` (CR12) has one library-wide cache file
     (`scripts/computed-route/cache/<block>.json`, gitignored; its `site` names where it was measured: eye-care-test page
     668, or sandybrown page 4750, which runs the `mamas-munches` snapshot). A border-style marker carries its companion
     width (CR11); a minimum size marks above the 44px floor; an inherited setting records every element its value
     reaches (`reaches`) and every element its tag (`_tag`); a per-device enum setting with no CSS property (an extension
     setting such as `sgsChildSizing`) is discovered through its desktop tier. Calibration reads its three widths in
     parallel (`calibrate.mjs::readAll`). Fixtures come from `scripts/computed-route/calibration-fixtures.json`, else each
     block's first use in the trees or its block.json `example`, styling at defaults.
   - **Results under the new guard** (scored items from the register; the whole-page line, distinct style, hover and
     box issues from `solve-report.mjs::wholePage`, appears from the next runs):
     - About: at 100% with full coverage (F2 below).
     - Lenses: 67 distinct issues to 0, independent check 0 (2026-10-08); register N40 closed by measurement (plan, Lenses entry).
     - Contact: 66 to 60 distinct issues on the 2026-10-08 Solve run (plan, Contact entry);
       the contact form 94 to 46, 58 on the sweep.
     - Help (old guard) and the footer: as recorded in the register. Home was stopped at walk 5 on 2026-10-04 and rebuilt
       from its committed tree; it re-runs with full coverage.
     - An independent Playwright check (its own finders, 375/768/1440) confirmed Lenses 9 of 9.
   - **Council, 2026-10-04 (qc-council, three raters).** Solve's coverage was the gap between §0's promise and its
     results: §3.3 walked a hand-written config naming only some elements, the walker never compared where an element
     sits, and success was scored on register items, not the page. Fixes, each with a measured baseline:
     - F1 flow position rows (CR19) and F4 identity transform (CR20): done, 4606ba598.
     - F2 every block paired through matched words (`pairs.mjs`, `lib/pairs.mjs`, `lib/pairs-page.mjs`; plan
       `.claude/plans/2026-10-04-spec47-full-coverage.md`): built, with a padded block paired to its padded draft
       wrapper, repeated words placed by nearness, text-run, form-control and group pairs (walker finders
       `{ textRun }`, `{ group }` in `scripts/parity/lib/paint.mjs`). The guard tries a regressed row's ancestors' writes,
       nearest first (CR21). **About is at 100%** (2026-10-04): 50 distinct issues to 0 on a fresh rebuild, 0 wrong writes,
       12 ledger entries citing register 104 / S1 / S4, confirmed by an independent check
       (`sites/eye-care-ward-end/build/qa/independent-check.mjs`, 0 differences at 375/768/1440) and a planted-fault
       negative control. Lenses (2026-10-08): 67 distinct issues to 0, independent check 0, register N40 closed; its wrong-write ratio is judged per setting (0.15.7) and the fresh run wrote nothing (plan, Lenses entry). Contact pairs 31 of 32 blocks (the map is register items 132 and 141) and its form 6 of 6; its distinct
       issues went from 134 to 19 on 2026-10-04 and read 27 on the 2026-10-05 sweep.
     - F3 calibration paths: measured, mostly not needed (Help's link rows are a block swap, register 120/121; Contact's
       form rows belong to the contact-form surface); one fixture gap (CR17).
     - F5 whole-page score in the solve report: built.
     - Speed: lean walks, the draft cache and four widths at once (step 2 above).
   - **Residual:**
     - **CR6 — setting one side of a padding or margin box zeroed the other three. FIXED and verified live
       2026-10-07** (plan `.claude/plans/archive/2026-10-07-cr6-box-longhand-migration.md`). Padding and margin now print
       only the sides a client set (`includes/helpers-box.php::sgs_box_object_longhands`), across 41 blocks, in the
       editor canvas too (`src/utils/spacing-preview.js::tierBoxLonghands`); a mobile tier that sets one side keeps
       the tablet tier's other sides (Bean). Kept on purpose: `sgs_box_object_shorthand` stays byte-identical for
       border WIDTH (where an unset side SHOULD be 0) and for the `var()` holdouts. The gate is
       `plugins/sgs-blocks/scripts/migrate-box-longhands.py --check` (in `gates.json`, a baseline ratchet, now 0).
       **The route's half:** `lib/resolve.mjs::seedSides` seeds unset sides only for a border width (the one box
       that still prints 0 for an unset side); padding and margin boxes are written one side alone. Live proof, 2026-10-07: a live page check passed 18/18 and
       a per-block live check passed 30/30, both of which read `40 0 0 0` on the old code.
       **Phase 2** (plan table): P2-d done (`google-reviews` padding prints set sides; `sgs_border_box_decls` holds no
       padding) and P2-f done (the behavioural analyser derives `sgs_box_object_longhands`' property from the call's
       literal, so the five CR6 classification overrides are gone). **P2-a and P2-c done and verified live
       2026-10-07:** corner radius prints only the corners a client set (`sgs_corner_object_longhands`), page and
       editor, across every block that wires the shared border panel's radius, and the media atoms emit one property
       per side or corner (a per-block live check, 42/42). The route needs no change for corners:
       `lib/resolve.mjs::radiusWrite` already writes all four corners per tier. No block reads WordPress's native
       `style.border` any more (P2-g step 0). P2-b (the `var()` holdouts) and P2-h are done and live 2026-10-08: the route seeds only a border width's unset sides
       (`lib/resolve.mjs::seedSides`). P2-g is done and live 2026-10-08: every client border builds through
       `includes/helpers-border-style.php::sgs_border_element_decls`, and the route needs no change for it. P2-e (the Eye Care tier
       boxes holding an explicit zero) is done 2026-10-08: 157 of 161 match the draft, the Help container's bottom padding is set to the draft's 90/90/60, one cart row is unmeasured.
     - **Route (2026-10-07):** the four route defects are closed: canvas candidates mode (§3.8), CR4 (a large block
       calibrates: each page load gets `lib/calibrate-chunk.mjs::EDITOR_TIMEOUT_MS`, and the run restarts itself with
       the bigger heap; `sgs/nav-bar-menu` 90 settings, 46 dead after CR27 (mostly states the calibration page cannot show)),
       CR14 (help walks every FAQ answer open) and CR25 (a template build retries the host's transient database
       errors), CR27 (all eight dead nav-bar-menu settings were calibration gaps, fixed in fixtures, the reader and the
       markers; a state instance is untested only when hidden at every width, so the detached chip's hover reads at
       375) and CR28 (`emissionOf` reads a helper that carries its property in a variable).
     - **CR12 — the dark-mode toggle renders nothing for any client. PARKED pending Bean, not open.** Neither a
       rendering bug nor an unbuilt feature: `theme-toggle/render.php` correctly returns early when
       `settings.custom.dark` is empty, and `scripts/derive-dark-palette.py` is already wired into
       `push-theme-snapshot.py::prepare_deploy_snapshot`. It reads a top-level `_sgsDark` key that no client
       snapshot carries, so nothing is ever derived. **Eye Care cannot be enabled as it stands:** the deriver
       hard-refuses with `DarkPaletteContrastError` because `primary` #141414 is near-black, dark mode must lift
       it to #7d7d7d to be visible on a dark surface, and `primary-text`/`text-inverse` #FAF8F5 on that is 3.88:1
       against the 4.5:1 required; no `palette` or `roles` override passes both constraints. Left enabled it
       would fail every Eye Care deploy. The three ways forward are design calls, recorded on the register row.
     - First (plan `plans/archive/2026-10-04-eye-care-sweep-audit-fix.md`): Session 0 (2026-10-05) repaired what the route data
       audit (`.claude/reports/2026-10-04-route-data-audit/README.md`) proved and recalibrated every block. Session A
       (2026-10-05) measured every surface from `1ea514ae8` without writing: 2,373 distinct open issues across 17
       surfaces (`sites/eye-care-ward-end/build/qa/sweep/2026-10-05/sweep.json`, per surface), and every fix-register item carries a sweep status (77 still
       open, 63 not walker-measurable, 19 closed earlier, 15 partly measured, 27 clean on the walker; each still-open
       verdict cites one exact element row and its values). Session B (2026-10-05) sorted every one of the 2,373 into
       one class with proof, **audited**: W 1,710, F 163, T 447, U 28, D 17, deferred 8. The committed
       `qa/triage/*.json` hold the **raw** classification those were audited from: W 1,562, F 338, T 445, U 28.
       **Session C sitting i then passed Gate 1 (2026-10-05): raw F 338 to 177, total 2,373 to 2,414** (a new
       `content` class of 41), so a triage re-run compares to 338 and never to the audited 163.
       **The remaining work runs in two sessions.** The fix register (`plans/2026-10-02-eye-care-fix-register.md`)
       is the source of truth: the 163 F rows are findings to assess, not a list of gaps to build, and many of them ignore how the
       framework works (a CPT canvas composes blocks, and a setting can arrive from a parent by context), which is a route defect.
       So **Session C repaired the route first** — every unbuilt and known-broken item in this spec, including the new FR-47-8 —
       and recorded the new framework-gap count (`plans/archive/2026-10-05-eye-care-session-c-spec47-route-fixes.md`): **the route
       result is raw F 338 to 176 on identical Solve reports, and the current measured state on a fresh sweep of all 17
       surfaces at block code `7f375f765` is raw F 192**, in `qa/triage/*.json`. Session C is complete, with ten route
       defects carried in the bullet below. **Session C2** then matches
       each remaining row to a register item, fact-checks it, tests it live at four widths, and builds only what Bean approves
       (`plans/archive/2026-10-05-eye-care-session-c2-finding-assessment.md`). A mechanism group is a filing label for review and never a unit of
       work, and `SGS_Container_Wrapper` is never a blanket fix.
     - Then (Session D) each surface to 100%, in the order the sweep ranks, Contact and its form first. Every surface has
       its full config (2026-10-05; panel surfaces pair with their walker state open). Done per surface: on a fresh
       rebuild of the committed tree, 0 unexplained and 0 labelled gaps in the whole-page line, 0 new rows, wrong writes
       at most 10%, the independent check agreeing, the register marked. The open causes per surface are in the plan's
       Contact and Contact form sections (Contact: the address width; the form: the select's height). The three measuring gaps found on 2026-10-05 are fixed: the open phone drawer's words
       (`lib/pairs.mjs::rootFor`, `d605bb5ba`), per-width draft finders (`mergeWidthFinders`), and off-screen
       screen-reader text in the independent check (`independent-check.mjs::srOnly`).
     - Built on 2026-10-04: enclosing-block settings, extension settings in
       the framework DB (`source='sgs-ext'`), calibration `reaches` and `_tag`, the per-round `conflict` rule, grid
       tracks as proportions (CR16), aspect ratio (CR10, live proof on the first image-heavy surface).
     - Calibration: every block was re-calibrated on 2026-10-05 (94 cache files, on the local WSL mirrors). CR17's
       business-info `textBefore` element remains.
     - Gap typing (a setting that paints a parent while a rule on a child overrides it comes out Missing setting):
       the hours day weight closed through a dedicated label setting, and **calibration now records the overriding
       child** (`lib/calibrate.mjs::overridingChildren`, built 2026-10-06, Session C lane L7) as
       `settings[<attr>].overriddenBy`. It is derived from an absence rather than a new measurement: `reaches` holds
       every descendant an inherited marker changed, so a descendant read for the property and absent from `reaches`
       carries its own rule. Only the topmost element of each blocked subtree is named, because everything below it
       inherits that element's rule; a descendant already at the marker's value and a pseudo-element layer are
       excluded, since their absence proves nothing. Emitted for inherited properties only. **The 38 rows are not yet
       re-typed:** that needs a calibration run per affected block and then a Solve run, so the mechanical bound is
       that only a setting painting an inherited property can be re-typed at all.
     - **Route defects found by Session C's Gate 3 council (2026-10-06), each with its owner.** None is a Session C2
       finding; all are route work.
       - **No `transition,*` row calibrates anywhere in the library.** `lib/calibrate-markers.mjs::markersFor`
         dispatches on the first comma-segment of `css_property`, which is `transition`, and every branch misses it
         (not colour, not `KEYWORDS`, not enum, not box, not `tier_object` — `LENGTH` fails — not weight, opacity,
         transform, letter-spacing, number or count), so it falls through to `return []`. Confirmed on all five routed
         blocks: `sgs/hero`, `sgs/brand-strip`, `sgs/card-grid`, `sgs/info-box` and `sgs/testimonial` all carry the pair in `noMarker` with no slot. A transition marker needs a new shape (set a
         duration and an easing, read `transition-duration` and `transition-timing-function` off the root).
       - **`settings[<attr>].overriddenBy` names non-rendering elements.** All ten of `sgs/hero`'s entries name
         `.sgs-hero__video-bg > source`, a metadata element inside `<video>` that renders no box and no text and so
         cannot override `font-size`, `color` or `line-height`. `lib/calibrate.mjs::overridingChildren` infers "has its
         own rule" from the path's absence from `reaches` without checking the element renders. **Needs a rendered-box
         guard.**
       - **The content reads returned nothing on their one real-data run.** `cache/hero.json` was measured after the
         reads landed (it carries `overriddenBy`) and `sgs/hero` has 17 content-role rows — 10 `boolean-visibility`,
         6 `content`, 1 `text-content` — yet the file carries no `text`, `presence` or `link` key, and
         `lib/calibrate-content.mjs::collectContent` omits a key only when empty. Whether that is legitimate (no
         marker, nothing shown or hidden) or a silent failure is **undetermined**. Consequence: no cache anywhere
         carries those keys, so `lib/solve-rows.mjs::resolveContent` has never fired on real data either.
       - **`lib/solve-rows.mjs::resolveContent` belongs in `lib/resolve.mjs`** under R-47-3's one-resolver rule. It
         sits in `solve-rows.mjs` only because the lane that wrote it could not edit `resolve.mjs`.
       - **`lib/triage.mjs`'s CONTENT verdict ignores Solve's outcome**, returning `W`/`content` for every content row
         whatever `contentClass` says.
       - **20 presence rows and every `link-missing` row are unwritable.** A presence row for an element missing from
         the live page has no live element, so no trace and no node: it needs a `ref` in the pair config and
         `scripts/parity/lib/ref-trace.mjs::stampRefs` extended to stamp content rows. `link-missing` needs
         `auto-collect.mjs` to store the href rather than `lk: true`.
       - **`lib/resolve.mjs::resolveViaAncestor` should be deleted.** With `measuredSlots` supplied it was called
         1,583 times over 2,414 issues and returned 0 writes; its inner `resolve` receives inputs identical to
         `solve.mjs::writeRound`'s owners-retry; and `where: 'ancestor'` is written into evidence but never read for a
         decision, with `lib/triage.mjs::canvasSettable` stamping that field itself. Deleting it changes no verdict.
         One test assertion on its own citation goes with it.
       - **The `scroll` row kind vanished** between the 2026-10-05 and 2026-10-06 sweeps: 24 to 0 on product, 2 to 0
         on shop. Unexplained.
       - **`benchmark.mjs --noise` — DONE 2026-10-06** (`8210af3a1`). 10 runs back to back on a quiet host:
         **5 of 5 scored cases caught** (case a is unscorable — the draft shares the gap — though the walker
         still emitted a row for it), and the noise figure is settled at 5 noise rows, every one a PHASE artefact (a draft view-swap fade already accepted at `qa/parity/shop.mjs`:286, the `sgs/trust-bar` marquee's scroll phase, and one `box-shadow` read at t≈0.999 — alpha, blur and spread each short by an identical 0.0950%). Not host load and not detector flakiness; a run reading 0 was never evidence of absence because every cause is phase-dependent. `reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`.
         The earlier 13-on-shop and 9-on-lens reading is superseded.
       - **A gate exists that would have caught an unwalkable surface, and it never ran.**
         `scripts/parity/draft-live-walk.mjs` calls `lib/lint.mjs::lintConfig` (on the states the run walks, `--states`, since `ee9d6e31c`) and exits 1 before any browser opens,
         but a whole sitting passed without re-walking, so a surface stayed unwalkable. **A route gate should run
         `draft-live-walk.mjs --lint` over every surface's `walkerFull`** — no browser, no host.
       - **The 338 to 176 decomposition is machine-local.** `.gitignore` ignores `sites/*/build/qa/solve/`, so it
         re-derives only while the 2026-10-05 report folders survive on disk.
     - **Route defects found by Session C2 (2026-10-06): ALL CLOSED 2026-10-06** by
       `plans/archive/2026-10-06-spec47-route-cleanup.md`, which carries the file-ownership map, the wave order and the
       per-fix briefs under `reports/2026-10-06-session-c2/briefs/`. Both write hazards (`entranceStart` writing
       `sgsAnimationStart` from an armed pose, and `sgs_transition_vars` stripping a decimal so `"0.3"` emitted
       3ms), the forced-hover false green, the three reader-scope defects, the missing icon abstraction, the
       twin-containment pairing gate, the transition markers, `canvasSettable`'s emission selector, the
       re-keying of rows by a cosmetic path change, a stale report served as current, and the walker's own
       caveats reaching no reader. Commits `809d30f8d`, `1963180ac`, `d72c88afe`, `54c1a53f3`, `aa4c3b15a`,
       `9970eb804`, `6a61f3678`, `4cc06dd12`. Route suite 523 to 589, all green.
       - **Still open from that work, and each needs its own session:**
         - **`solve.mjs::writeRound` sets `canvasSettable` from its hop citation with no emission check**, so
           Solve's own report still flags gaps `lib/triage.mjs` no longer trusts. Applying
           `triage.mjs::reachesElement` there would be INERT — `solve.mjs` builds no PHP helper index, so every
           emission reads unknown and keeps its credit. **The durable fix is storing the emission selector in the
           DB (`css_element` is NULL for every `bgHoverZoom*` row today)**, which touches `block.json` and the
           seeder. Triage is the classifier of record meanwhile.
         - **Emission is read by string search of PHP literals**, so a control emitting through a class method
           rather than an `sgs_*` function reads as unknown and keeps its credit.
         - **`scripts/parity/lib/chrome-compare.mjs::hoverEffects` does not apply P3c's `loops`.** Not fixed
           because the cause is unproven: it produces descriptive labels from rest-and-hover snapshots rather
           than property rows, and the marquee that motivated `loops` is page content, not header chrome. What
           would prove it: a chrome surface carrying an infinite animation whose effect set differs between two
           runs with no code change.
         - **A live-side walker finding is never persisted.** `lib/sweep.mjs::readWalkerCaveats` reads
           `draft-cache-*.json`, the only place the walker saves `states`, so `reveal-unfired` on the LIVE side
           reaches no reader. Surfacing it needs the walker to save live states.
     - **The divergence ledger cannot scope a decision to one element path** (found 2026-10-05, Session C C0.3).
       `lib/ledger.mjs::match` matches on node, state, pseudo, property and width, with **no path discriminator**, so
       a node holding several rows of the same property and state cannot have one of them accepted on its own. It
       blocked the one `sgs/buybox` transform entry of Session C's W0a: `cr-ref-product-4` carries three F-class
       hover `transform` rows on different paths and a single entry would have closed two genuine findings as well
       as the decided one. Not fixed there: it changes the ledger schema, `lint.mjs` and every existing entry, and
       the row it would close is already decided by register S1, so C2 closes that one by citation.
     - **The seeder leaves 368 rows unrouted** (2026-10-07): 81 are ambiguous, about 30 are gradient siblings that need an
       `attrMap`, and the rest have no evidence; `sgsHover*` and `sgsChildWidth` stay NULL on purpose. Session C's C3.1
       routed 2 of the 32 NULL rows it took; the rest await a routing pass.
     - **Calibration exhausts Node's 4 GB heap over a full run.** One `calibrate.mjs` run across 46 blocks runs out of
       memory; `SGS_CAL_CHUNK` (`calibrate.mjs`) is a workaround. What the run holds between blocks is uninvestigated,
       so the cause is unproven.
     - Presence, text and link (Bean, 2026-10-05): calibration's `presence`, `text` and `link` reads (§3.2), Solve
       writing presence, text and link rows and its `handover` list (§3.3), and Fill setting visibility and variant
       settings: **all built 2026-10-06** (Session C lanes L7, L8 and L9). The framework database already marks the
       settings (`role` `boolean-visibility` 600,
       `presence-boolean` 3, `content` 84, `text-content` 235; counted 2026-10-05). §3.2 scopes the text read to
       `role` `content` alone, which would miss the 235 `text-content` rows that hold most of this register's words
       (`sgs/product-card::noReviewsText`, `::brandName`, `sgs/buybox::stockInStockLabel`, `sgs/whatsapp-cta::cardTitle`):
       §6's question is **answered: read both roles** (Bean, 2026-10-05), and §3.2 carries it — scoped to the
       SGS-owned rows the route calibrates, which is **258 text** and **14 link**, the 319 and 39 being all-source
       totals. §3.3's `handover` owners are now **five**, `woocommerce-text` included, defined once in
       `lib/issue-classes.mjs::HANDOVER_OWNERS` and shared by Solve and Fill. The sweep (`lib/sweep.mjs`) carries
       text and presence rows as of sitting i, so they reach the register check.
     - Residual from the measure-gap tags (Session B, 2026-10-05; the table is Appendix A of
       `plans/archive/2026-10-04-eye-care-sweep-audit-fix.md`, the data `.claude/reports/2026-10-05-session-b/measure-gap-tags.json`).
       Of the 78 register items the walker could not fully see: **8 `content-fixable`** (a setting holds the value and only
       §3.2/§3.3's unbuilt presence, text and link reads block it: S7, 9, N16b, N27, N30, N31, N33B, 159), **17 `pairing`**
       (the element sits on a measured surface but no pair reaches it), **28 `FR-47-6`** (a walker read that was unbuilt: focus and
       active states, script-driven entrance motion and link coverage — **all three built in Session C sitting i**, so these
       28 are now measurable and are re-judged on Wave 3's sweep; 13 of these have no setting at all and carry
       "no setting exists; framework gap" in their reason, so they are Session C2's findings, not content's), **15 `behaviour`**
       (FR-47-7 flows), **6 `handover`** (`site-info` 2, `content-page` 2, `product-data` 1, `woocommerce-text` 1), and one
       each of `PA-1` (N7), `PA-3` (103, measured by the hand pair `choose-a-frame` and refused only by the A4 validator)
       and `PA-5` (157). 37 of the 78 can be held by no block setting. One item (N24) belongs to the parallel
       google-reviews session.
     - **The functional flows (FR-47-7) and the walker's items 2, 4, 5 and the focus and active states of item 3
       (FR-47-6): built 2026-10-05** by Session C lanes L3 and L2, each with its own GAP-CHECKLIST section (§20 to §26)
       and a planted fault shown red then green. The flows live in `scripts/parity/flows/` and report apart from parity
       rows, into `sites/<client>/build/qa/flows/<timestamp>/`; each fails with a named signal against the bug it was
       written for, proven against a local mock shop (44 local tests). Two corrections the build established: register
       **N11(b) is already fixed** at HEAD by `35e8b94d4`, so its flow must *pass* on a HEAD build and can only be shown
       failing against the pre-fix code or the mock; and register **N38's "skip adds to bag" setting does not exist** in
       `choice-flow/block.json`, so that flow fails on a live site until N38 lands, which the script says when it fails.
       The walker's benchmark half (`benchmark.mjs --noise`) drives a live site and RAN 2026-10-06: 5 of 5 scored
       cases caught, and the "no new noise rows" expectation was withdrawn — 5 noise rows, every one a phase
       artefact, not host load (`reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`). Items 1 and 3's hover, plus items 10 to 13, were already built and proven (2026-10-05:
       About measure-only on the local mirror, 1 open issue, real: S1's button timing; register S1).
     - **The walker-state maps are complete** (Session C C0.7): `home`, `shop`, `product`, `lens`, `contact` and
       `contact-form` now map every state their walker defines, so no row is left in an unmapped state. Contact and its
       form had always *defined* `field-focused` and `form-submitted-empty`, but their `walkStates` was `["opening"]`, so
       those states were never walked and they held **none** of the 323 unmapped-state rows (which are shop 163,
       product 109, home 33, lens 18). Mapping them therefore adds rows rather than clearing any. Seven rows carry a
       conflict the map cannot express, where one pair is measured in two walker states that now share one setting state
       with different draft values; they are named in `scripts/parity/flows/state-map-reasons.json`, and the guard that
       must refuse such a group belongs to `lib/solve-rows.mjs`.
4. **Fill on an unbuilt surface,** compared with a hand-checked answer. All 17 Eye Care surfaces are built, so
   **Session C lane L9 proved `fill.mjs`, `lib/draft.mjs` and twelve `lib/fill-*.mjs` modules (2026-10-06) against a
   built surface with its committed tree withheld** as the hand-checked answer. On `about`: **217 of 319 style leaves
   exact (68%), about 87% paint-equivalent**, 106 settings written, 38 UNMAPPED, 28 breakpoint steps logged, and
   content 32 of 32 words and links identical. Entrance timing is exact on all seven animated nodes (500, 600, 700,
   800, 850, 900 and 800ms, 18px distance) and found an eighth the committed tree lacks. The non-gap differences are
   benign and named: 90 box seeds writing `0px` on unmeasured sides, 7 unit or token ties that paint identically, 13
   explicit keys equal to Fill's own baseline, and 51 leaves where the key puts a margin on a child while Fill puts
   one equal gap on the parent, which is §3.4 step 3 behaving as specified. **The 43 real gaps are all in the UNMAPPED
   list**: `layout` (11, `display` is ambiguous across `sgsHideOnDesktop`/`Mobile`/`Tablet` so it is never written),
   `variant` (20, unrecoverable until calibration's presence keys exist on real blocks) and border colour (12, no
   `borderColour` setting is tied). Two findings: **no calibration `forms` list contains `clamp` anywhere in the
   cache**, so every fluid size is written per tier and the clamp path is unreachable on real data; and
   `lib/entrance.mjs` is not a sampler but Solve's `entranceStart`, so Fill has its own probe. The unbuilt-surface
   demonstration carries forward to the first client that has one.
5. **A second draft** from a different designer, to test generality. **Blocked: no second draft exists.** This is
   the only item in this spec Session C does not build, and no route work unblocks it.
