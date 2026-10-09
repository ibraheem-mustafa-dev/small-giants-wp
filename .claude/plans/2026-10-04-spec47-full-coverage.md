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
  exits 1). Two causes: (a) nine exports missing from `scripts/computed-route/README.md` (`lib/guard.mjs` ownSizeRow and
  landed, `lib/normalise.mjs` snapFontFamily, `lib/solve-rows.mjs` heldReason and widthPattern, `lib/winning-rule.mjs`
  describeCascade and rowSelector, `solve.mjs` unpaintedBorder and settingRatio): add a README line for each; (b)
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
  PORTAL_OR_CLOSED_SURFACE 55, READ_CAP_81 53, HOVER_POINTER_MISSES_ELEMENT 38, the rest under 14 each. Still open: the 106,
  to be diagnosed per mechanism, largest groups first (by property: background-image 19, grid-template-columns 10, text-indent
  9; by block: nav-bar-menu 10, nav-drawer-menu 9, hero 7, cta-section 6), plus the `oneWidth` probe list (23 today).
  The nav groups wait for the nav-bar-menu recalibration another session was running on 2026-10-08 (it rewrites their caches).
  **hero and cta-section diagnosed 2026-10-08 (13 rows, code and cache reading, not yet proven by a render):**
  - Block code, 4 rows. `hero/style.css::section.sgs-hero{max-width:none}` out-ranks the wrapper's scoped `max-width`
    (`maxWidth`): the known real gap in the backlog; that rule stays (D725, full-bleed sections), so the fix is the
    emitted rule's specificity, never removing it. `cta-section/style.css::.sgs-cta-section` reads the button-preset
    `hover-transition` token before `--sgs-transition-duration`, and Eye Care's snapshot sets that token to 0.25s, so
    `transitionDuration` never wins. `cta-section/render.php` nulls `backgroundImage` for the wrapper, so its tier images
    (`backgroundImageTablet/Mobile`) have no `::before` layer to paint on.
  - Calibration preconditions and markers, 8 rows (`lib/calibrate-instances.mjs::preconditionsFor`,
    `lib/calibrate-markers.mjs::markersFor`). hero's tier images need a base `backgroundImage`. `textIndent` (hero and cta)
    paints only between two adjacent text blocks, which no fixture has. hero's `bgSvgOpacity` needs `bgSvgContent` and an
    integer marker (`absint` turns 0.37 into 0). `bgZoomStart` needs `bgKenBurnsMode: zoom-out-once` and a marker in
    100-150. `gridTemplateColumns` needs `variant: split` and a track-list marker. cta's `backgroundImage` is the legacy
    twin of `backgroundMedia`, which the fixture always sets.
  - Unresolved, 1 row: cta `textColour`; the next step is rendering one instance with a hex colour and reading its `color`.
- **Font-family values are preset slugs** (Bean, 2026-10-08). `85f07d38a` makes `heading/edit.js` paint a slug too. It is
  committed; `.claude/LEDGER.md` does not name it, so its deploy state is not recorded there. It ships with the next green
  `build-deploy.py`.
- **`mega-group` discovery data is empty** (`cache/mega-group.json::discovered.sgsChildSizing` is `{}`), though Spec 47 L1.3
  resolves child sizing through discovery. **It costs rows:** 9 `flex-grow` rows on the mega surfaces are triaged F
  `no-setting` only because of it. Ruled out 2026-10-07: the render, the editor registration, the comparison
  (`lib/calibrate.mjs::discoverEffects`) and a panel rule overriding the flex. **Cause found 2026-10-07:** two
  calibrations ran on the same mirror at once and both build onto the site's one calibration page with the same
  `cr-ref-cal-<n>` classes. Guard built (`5bebb2b6d`): `lib/calibration-lock.mjs`, a per-site lock that makes a second
  calibration refuse to start. **Next:** once the local-eye-care calibration lock is free (a nav-bar-menu re-measure
  held it on 2026-10-08, about 50 minutes a run), re-run
  `calibrate.mjs --site local-eye-care --blocks sgs/mega-group --recalibrate` alone and confirm `discovered.sgsChildSizing`
  records `flex-grow` on the root; the 2026-10-05 run may itself have been crossed (its discovery is empty), which the
  clean run will show.

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
