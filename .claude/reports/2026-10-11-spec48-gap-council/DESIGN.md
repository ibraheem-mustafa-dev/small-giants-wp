# Spec 48 design, as decided with Bean (2026-10-11)

Dated design record for plan `.claude/plans/2026-10-10-claude-design-handover-standard.md` Task B4. Inputs: the
gap-analysis council (`REPORT.md`, this folder), both section ledgers (`.claude/reports/2026-10-11-spec-ledgers/`),
Spec 48A, and a /brainstorming session with Bean. Where Bean changed a recommendation his words are quoted. This is the
brief the Spec 48 and slim Spec 32 writers work from; the specs, not this file, are the requirement once written.

## 1. Decisions

1. **Accuracy by construction, in stage 1.** The council recommended "working site first, accuracy later". Bean
   rejected it: "our whole system was flawed being dependent on rendering via playwright and the tool didn't know how
   to compare the draft and live site's code to produce loads of false positives too. We need to design a system with
   mechanisms that directly handles every single stage and type of value that needs to be recognised and converted
   over." So Spec 48 defines, for every kind of value, how it is read from the draft, written to SGS, checked, and when
   it is a gap (the value matrix, §2 below). A construct census, taken from the runtime and never from file text,
   proves every construct in a draft has a reader or a gap row, with negative controls.
2. **Check method: code-to-code, render confirms.** The draft's declared value at each width and state is compared
   with the value the written SGS setting will emit (calibration knows which setting paints which property on which
   element); the render at 375/768/1440 (plus 1920 on the walker) is the acceptance test (ledger D2(b)), and it is the
   primary source only for values the draft never states (browser defaults, inheritance). Elements pair by draft ID,
   never by matching words.
3. **Draft defects: code intent wins**, listed for Bean. "Draft defect" is a closed list: a code-declared state, motion
   or behaviour that never fires in the render (Eye Care's reveal below 1440), or a state rule whose value never paints
   (Indus mega-menu `style-hover` holding `{{ }}`). Every other code-render disagreement: the render wins and is
   reported.
4. **Breakpoints.** Bean: "Snap to a reasonable extent but outside of that, we have additional css input in every
   block for this functionality." Rule (provisional, calibrate on Indus): snap when |draft - tier| <= 5% of the tier,
   nearest tier wins (1060 snaps to 1024); otherwise a block's own breakpoint setting when one exists; otherwise the
   block's custom CSS input (`sgsCustomCss`) with a scoped media query, listed. Before the route writes any media query,
   either a structured client-visible breakpoint override exists or `custom-css.php` is hardened (today it strips tags
   only and emits a rule written without `&selector` unscoped). Indus's header branches at 1200 and 1260, so this
   blocks Indus.
5. **Trees: both lanes.** An agent writes skeletons from the draft code (structure, identity, content refs; no style
   values, lint-enforced); every value goes through Fill and the resolver. A narrow code reader (layout forms, shared
   `{{ }}` bindings, copy arrays, page-map links, `animations.json`) is built alongside and takes over a construct once
   its tree matches the agent's on every Indus surface. Optional for Indus; expected from client 2.
6. **Proof order: Indus first, then Mama's.** Indus proves pages, forms and form steps, the drawer and mega menus;
   Mama's is the first shop proof.
7. **Missing features: one-line list.** Bean marks each "map to an existing block", "record as a deliberate
   difference" or "build"; stage 1 builds only what stops a main flow (buy, contact, apply).
8. **Framework vocabulary (Spec 32).**
   - Palette slugs added: heading text; link and link hover; section ground with its text colour. No gradients now.
   - Shadows become role names (card, card-hover, button, panel, header, drawer, modal…) filled per client from the
     draft; removes the `crisp` clash with core. A migration, not an edit (survey saved slugs including dead references
     already in block code: `raised`, `subtle`, `raisedish`, `hard-sm`; old slugs kept as aliases; dry run per client);
     FR-26-D3 is pending the O10 canary shadow-picker check.
   - Per-tier section padding and gutter tokens: build. Bean: "most of the pages didn't have that issue, it was just a
     few of them but I'm happy for you to test it out." Proven on Indus pages; Eye Care re-tested after B5.
   - Fluid headings: the large font presets become fluid through core (`fluid: {min, max}` per client from the draft's
     `clamp()` or tiers); when a preset's resolved size misses the draft by more than R-47-7's length tolerance at
     375/768/1440, that heading gets per-device values instead. "Built" only after calibration records accepted value
     forms. One font-size vocabulary across snapshots (two exist today: small/regular/large/x-large/xx-large/hero and
     small/medium/large/x-large/xx-large/xxx-large); `sites/mamas-munches` is excluded by name and its slugs stay as
     aliases.
   - Button lift in the button style presets (Bean: "Would this work if we just build it into the button style
     presets?" Yes). Found while writing Spec 32: the presets already carry `hover-transform` per variant with a
     site-wide `default` fallback (`button/style.css`), so no new key; the extractor writes the draft's lift there
     (Spec 32 FR-32-19). Card lift stays in the hover-effects extension.
   - No narrow width: Bean, "Narrow content width already exists, it is the regular content width".
   - Intake proposes token-to-slug roles from token names and where each hex is used; Bean confirms once. Every colour
     outside the tokens stays a one-off hex.
9. **Bespoke shop UI (Spec 27).** Bean: "they are heavily bespoke and its super awkward to code a block to enable all
   of that." Order: parts first (split `sgs/buybox` into parts sharing one product state, laid out with containers in
   the `sgs-pdp-buybox` template part; `sgs/buybox` stays as a composite that renders the parts, no deprecation path;
   before/after render comparison on an existing product page); custom CSS for visual leftovers (listed; a pattern on
   two clients becomes a setting); then a framework build or a gap-list decision for unique behaviour (client code only
   if Bean decides it: one artefact type, enqueued JS or CSS, never PHP, with its own deploy and the same gates). The
   shop filter already composes WooCommerce filter parts inside SGS containers. Basket drawer: keep its settings (Eye
   Care's live drawer sets 135 of them, no inner blocks) and add an extras slot (gift note, upsell). Toast: no
   controls; it is one shared page region, not part of the cart, and already reads site tokens (Bean: "I feel like
   there's no real need to have it editable").
10. **Pages, CPT posts, menus, pointers: one site-build script** from the confirmed page map. It creates pages and CPT
    posts through `scripts/wp-build-page.js --create`, builds WordPress menus and attaches mega menus by WP-CLI, sets
    the front page, permalinks, WooCommerce page options and the active header/footer/drawer pointers on a fresh client
    site only, writes every ID back into the page map, and on a rerun updates by stored ID, never creates twice.
11. **Fresh-site setup: an agent-run checklist** (WP-CLI plus `provision-site-mail.py` and the Site Info script) as a
    Spec 48 appendix; a script after the third client uses it.
12. **Gap proof: gates G0-G7** before a row reaches the framework gaps list (§3 below).

## 2. The value matrix

| # | Kind | Read (draft) | Write (SGS) | Check | Gap when |
|---|---|---|---|---|---|
| 1 | Structure | template elements, `sc-for`, `dc-import`, `surfaces.json` kinds | block choice, template parts, CPT posts | each draft ID pairs to one block | no block can hold it |
| 2 | Content | template text, logic data, route adapters, `tel:`/`mailto:` | block text, page-map links, Site Info | one-to-one; placeholders flagged | nowhere to live |
| 3 | Media and assets | `assets/`, image slots, stock previews | media library IDs | identity of the painted image | no slot |
| 4 | Colour | literals per width and state | token slug on exact match, else hex | declared vs emitted | no setting reaches it |
| 5 | Type, spacing, size, border, shadow | literals, `renderVals()`, `{{ }}` bindings | presets/tokens, else literal per tier; one shared setting per binding | declared vs emitted | as 4 |
| 6 | Layout | declared form (`repeat()`, `display`) | container layout settings | form plus rendered box | the setting can't take the form |
| 7 | Unstated values | one render per width | only where different from the calibrated default | render vs default | as 4 |
| 8 | Fluid values | declared `clamp()`/`vw` | fluid form where calibration proves it, else per tier | resolved per width | no setting accepts it |
| 9 | Breakpoints | logic thresholds | tier snap, block breakpoint, or listed custom CSS | flip at threshold ±1px | off-tier with no setting |
| 10 | States | `style-hover`/`-focus`, `sc-if`, `surfaces.json` | state settings, CPT surfaces | every state reached | no state setting |
| 11 | Motion | `animations.json` re-derived at intake, timer-written styles | animation settings, motion presets | parameters plus sampled pose | no preset |
| 12 | Behaviour | handlers, `surfaces.json` | SGS features | scripted flow | the one-line list |
| 13 | Site level | `tokens/*.css`, `<helmet>` fonts, routes | snapshot, Site Info, menus, pages, templates | confirmed page map; reachability | n/a |

An uncalibrated setting, or one whose calibration records no accepted value forms (0 of 190 cache files mention
`clamp`), is still written; its check falls to the render and the row is instrument debt (`I-*`), never a gap. Gate G5
(emission found by string search of PHP) alone never opens or closes a gap.

## 3. Gap proof

G0 freshness (DB refresh after the block's last change; calibration deploy hash; MANIFEST hashes and
`schema_version`); G1 pair and paint (identity pair, not inert, painting element, draft side in a listed state); G2
intent (declared agrees with render; not ledgered); G3 DB query stored (a NULL-but-fitting row is `I-unrouted`, a wrong
role `I-mistag`); G4 calibration status (dead/noMarker/untested/absent is `I-calibration`; `overriddenBy` with a
rendered-box guard); G5 emission and reach (measured, not fail-open); G6 live probe (trial shows no change for Missing
setting; a named winning rule for Hardcode; a roster grep for Missing block; a failing flow plus attribute grep for
Behaviour); G7 re-check on the publish date. Classes: F-setting, F-hardcode, F-block, F-vocabulary, F-behaviour (the
gaps list); W-walker, W-route (route debt); I-stale, I-unrouted, I-mistag, I-calibration (instrument debt to the seeder
and calibration owners); draft-defect (Claude Design or B5); CLIENT. `gaps.json` feeds one cross-client framework
backlog, re-checked by a named command after each framework change. The answer sheet (R1) gains hand-labelled gap rows;
F precision target 90% (today 105/217).

## 4. Frozen section anchors

**Spec 48** (`.claude/specs/48-CLONING-SYSTEM.md`) keeps Spec 47's section meanings, because live files cite them
(§5 22 times, §3.4 17, §3.2 12, §3.3 10, "section 3" 6, §3.6 4, §2 3, "section 7" 3, §3.5 and §3.8 once):
§0 Plain English · §1 Binding rules · §2 Inputs and outputs · §3 Requirements: §3.1 Resolver, §3.2 Calibration,
§3.3 Solve, §3.4 Fill, §3.5 Divergence ledger, §3.6 Walker, §3.7 Functional flows, §3.8 Canvas awareness, §3.9 Social
and contact rows · §4 Files · §5 Build order, proofs and residual · §6 Open questions · §7 Deferred · new material from
§8: §8 Client stages · §9 Intake · §10 Value matrix · §11 Tokens and the extractor (from Spec 32 Part D, FR-33-n kept) ·
§12 Site build (pages, CPT posts, menus, templates, forms) · §13 Shop surfaces · §14 Gap proof and reports · §15 Route
accuracy · §16 Staged items and framework hand-offs · Appendix A Fresh-site checklist · Appendix B Indus critical path.

**Spec 32** keeps its section numbers and part letters (ledger O6), gaps allowed; Part D (§15) leaves for Spec 48 §11;
the vocabulary additions go in §14.2/§14.3 as FR-32-n continuing the series.

**Numbering.** An ID's prefix is its origin and never changes. Kept: FR-47-1..9, R-47-1..12 (in 48); FR-33-n move to 48
except FR-33-11 and FR-33-20 (stay in 32, ledger O1); FR-32-7 moves whole to 48 (O5); FR-32-8 and FR-32-10 keep their
framework half in 32 (O4) and their route halves become new FR-48-n citing them. New Spec 48 requirements are FR-48-n,
new rules R-48-n. New Spec 32 vocabulary requirements continue FR-32-n.

## 5. Rules reworded

- **R-47-4 (code first, render confirms).** Values and intent come from the draft's code, read through the runtime
  (never by regex over `.dc.html`); every written value must agree with the rendered draft at 375/768/1440 before it is
  kept; on disagreement the render wins and is reported, except a draft defect (decision 3), where the code intent is
  built and listed for Bean.
- **R-47-7 (tokens before literals).** The palette comes from the declared `tokens/*.css` matched to the draft's hex by
  value (no draft loads its token files); snap order unchanged; one-off colours stay hex.
- **R-47-11 (live-site safety).** Targets are those in the confirmed page map, so the route may create them; the
  pointer ban is lifted only inside the site-build script on a fresh client site with no live pointer (its own rule,
  R-48-n); canary home and posts page, motion-QA fixtures and the calibration lock carry.

## 6. Stages for a client

0. Re-export just before intake; `handoff-check.mjs` passes (Bean's job); calibrate the client's block set (Indus:
   fix `gridTemplateColumns` dead and `container.layout` unrouted; recalibrate stale caches for card-grid, form,
   nav-drawer-menu, container, hero, trust-bar, nav-bar-menu, mega-panel); record the calibration-debt baseline (today
   578 dead, 110 noMarker, 24 oneWidth, 47 untestedStates across 94 caches).
1. Intake: census, re-derived inventory, three routing adapters, page map, palette roles, Site Info proposal,
   placeholder/stock/prototype flags, draft defects, missing-features list; one batched Bean review.
2. Site build: fresh-site checklist, snapshot, Site Info, media, site-build script.
3. Trees: skeletons (agent lane, later the reader), Fill, build through `wp-build-page.js`.
4. Check: code-to-code plus render confirmation per surface; generated state map; scripted flows; Solve repairs.
5. Gap list (G0-G7) and Bean's eye at 375/768/1440.

Kill line: when a surface's constructs read without manual fixes fall below a stated share on Indus (set in the spec,
provisional), that surface is hand-built and the shortfall recorded.

## 7. Blocks column (what stops which client)

Indus: breakpoint override or custom-CSS hardening; per-tier padding tokens; palette slugs, fluid presets and
`hover-lift` written into the Indus snapshot only; calibration of Indus's block set; site-build script; form
submission path (recipient, validation copy, success state; Spec 42). Mama's: the above plus the buy-box parts split,
cart extras slot, shop surfaces. Neither: the shadow and font-size migrations across the other snapshots.
