# Spec 48 gap-analysis council (2026-10-11, dated record)

Four Opus reviewers, read-only and blind to each other, judged every recorded Spec 47 problem against what code-first
cloning and the Spec 48A handoff files make possible: a code-first architect, a measurement sceptic, a ship-PM and a
framework-gap realist. Inputs: `.claude/reports/2026-10-10-handover-council/R5-eyecare-gaps.md` (P1-P29),
`.claude/reports/2026-10-11-spec-ledgers/SPEC-47-LEDGER.md` §3 (Residual 1-32 plus two) and §4 (R1-R6), and
`SPEC-32-LEDGER.md` §4 (C1-C12). Bean's design decisions taken on these findings are in `DESIGN.md`.

## Convergence (three or four reviewers)

1. The draft code states most design intent (motion parameters, every state with how to reach it, grid forms, shared
   `{{ }}` bindings, content arrays, breakpoint thresholds), but brings new traps: three routing models, two
   breakpoint width bases (Eye Care measures the root element, Indus and Mama's the window), placeholder and stock
   content, prototype-only behaviour, and Claude Design's own unverified inventory (Mama's and Eye Care 100%
   `not-instrumented`).
2. A construct census with negative controls is the guard against the deleted converter's silent drops.
3. A code-render disagreement must not write the code value; it is persisted, and draft runtime bugs get their own
   owner.
4. The accuracy mechanisms (R1-R6, guard, trial, neutralise, identity pairing) carry unchanged; no code-derived write
   bypasses them.
5. No export passes Spec 48A today (each carries `MANIFEST.md`); constructs are recounted at intake (Eye Care's `sc-if`
   is 126 today, not R5's 87).
6. The gaps list needs evidence gates; today only 105 of 217 "missing feature" labels held.

## Verified in the main thread

- No draft loads `tokens/*.css` (0 references in all three; Mama's drafts use no `var()`), so the palette is matched to
  the draft's hex by value. The sceptic's "Mama's `#D9981C` unused" is wrong: `colors.css` lists it as a deliberate
  one-off.
- `container.borderColour` (`border-color`) is calibrated at 375/768/1440 (`cache/container.json`): Residual 26 is a
  route fault, not a framework gap.
- `container.gridTemplateColumns` is in calibration's `dead` list and `container.columns` has no entry: Residual 3 is a
  calibration fault first.
- `container.layout` and `choice-flow.skipAddsToBag` have NULL `css_property`; `skipAddsToBag` exists, so R5 P24's
  "N38's setting does not exist" is stale.

## Consolidated verdicts

Owner: ROUTE (Spec 48), FRAMEWORK (owning spec named), INSTRUMENT (calibration or DB seeder; never a framework gap),
CLIENT, DRAFT (Claude Design or B5), DONE.

| Item | Verdict | Owner | Spec 48 home |
|---|---|---|---|
| P1 mispairing | Reduced: identity pairing primary, stamps re-derived per export, word pairing cross-check | ROUTE | §3.6, §9 |
| P2 paints nothing | Carry the paint check; declared-nothing feeds it | ROUTE | §3.6 |
| P3 parent blame, knock-on | Unchanged walker work | ROUTE | §3.6 |
| P4 partial coverage | Done (pairs every block); census proves coverage | DONE | §9 |
| P5 blank draft side | Classify by `sc-if` branch: unwalked state or absent | ROUTE | §3.6, §9 |
| P6 unwalked states | State map generated from `surfaces.json`, every `sc-if` mapped or a gap row, click path optional | ROUTE | §3.7, §9 |
| P7 script motion, unfired reveal | `animations.json` re-derived with timer-written styles per width; unfired reveal is a draft defect | ROUTE + DRAFT | §10 row 11, §14 |
| P8 loop phase noise | Compare declared loop specs; determinism harness | ROUTE | §9 |
| P9 breakpoints | Thresholds from logic, checked at ±1px; snap or listed custom CSS | ROUTE | §10 row 9 |
| P10 used vs declared | Declared form written once calibration proves the setting accepts it | ROUTE + INSTRUMENT | §10 rows 6, 8 |
| P11 shared values | Bindings grouped to one setting; per-tier section tokens | ROUTE + FRAMEWORK (Spec 32) | §10 row 5 |
| P12 spacing level | Try-before-write carries; margin trial owed | ROUTE | §3.3 |
| P13 block choice | Skeleton hints from loops, motion, surface kinds; agent judgement | ROUTE | §3.4, §12 |
| P14 copy and data in script | Logic-as-data reader, count-checked; a throwing getter is a gap row | ROUTE | §9, §10 row 2 |
| P15 static vs live list | Page-map confirmation field | CLIENT | §9 |
| P16 Site Info | Harvest literals, validate formats, Bean confirms, existing script applies | ROUTE | §3.9, §12 |
| P17 `#` links | Three routing adapters; page-map links | ROUTE | §9 |
| P18 palette roles | Tokens matched by value, roles proposed, Bean confirms | ROUTE (§11) + FRAMEWORK (Spec 32 slugs) | §11 |
| P19 version drift | MANIFEST hashes and schema version at intake | DONE (48A) | §8 stage 0 |
| P20 runtime | Known runtimes; render-without-errors assert | DONE (48A) + ROUTE | §9 |
| P21 assets | Media row; eager load (walker item 15) | ROUTE | §10 row 3 |
| P22 walker blind spots | Fixed | DONE | §3.6 |
| P23 probe traps | Fixed; declared reader includes `attributesStyle` | DONE | §3.6 |
| P24 behaviour | Flows from `surfaces.json`; N38 claim stale | ROUTE | §3.7 |
| P25 decisions vs draft | B5 mirror; path-scoped ledger owed | ROUTE + CLIENT | §3.5 |
| P26 gap typing | Gates G0-G7 and class split | ROUTE | §14 |
| P27 calibration coverage | Instrument debt, never F; Indus block set calibrated in stage 0 | INSTRUMENT | §3.2, §8 |
| P28 Solve loop | Guard memory fix, crash report, true wrong-write rate | ROUTE | §3.3 |
| P29 hosting | Local mirror | DONE | n/a |
| Res 1 marquee rule | Skeleton rule (loop record plus `getAnimations()`); off the framework list | ROUTE | §3.4 |
| Res 2 pill CTA | Skeleton rule | ROUTE | §3.4 |
| Res 3 grid column count | Calibration fault first (markers), then declared form | INSTRUMENT, then ROUTE | §3.2, §10 row 6 |
| Res 4 flex row | Declared `display`; `container.layout` routing | ROUTE + INSTRUMENT | §10 row 6 |
| Res 5 Site Info | First real run in stage 2 | ROUTE | §12 |
| Res 6 advisory snapshot | Declared tokens are not advisory once Bean confirms roles | ROUTE | §11 |
| Res 7 mis-tagged rows | Handed off with a record | INSTRUMENT | §14 |
| Res 8 Eye Care surfaces | Client plan | CLIENT | n/a |
| Res 9 `overriddenBy` | Carry with a rendered-box guard | INSTRUMENT | §3.2, §14 |
| Res 10 `resolveContent` | Move into `lib/resolve.mjs` | ROUTE | §3.1 |
| Res 11 triage content verdict | Fix | ROUTE | §14 |
| Res 12 presence, `link-missing` | Hrefs from adapters stored | ROUTE | §3.6 |
| Res 13 `resolveViaAncestor` | Keep, relax with `sc-for` evidence (D11 b) | ROUTE | §3.8 |
| Res 14 walker lint gate | Route gate | ROUTE | §3.6 |
| Res 15 content reads on real data | Verify on the first clone | INSTRUMENT | §3.2 |
| Res 16 `scroll` rows vanished | Reproduce under the harness | ROUTE | §3.6 |
| Res 17 `canvasSettable` emission | Emission check; DB selector later | ROUTE + INSTRUMENT | §3.8 |
| Res 18 emission by string search | G5 alone never decides | ROUTE + INSTRUMENT | §14 |
| Res 19 `hoverEffects` loops | Fix with a control | ROUTE | §3.6 |
| Res 20 `reveal-unfired` | Persisted as a draft defect | ROUTE + DRAFT | §14 |
| Res 21 ledger path scope | Schema change | ROUTE | §3.5 |
| Res 22 unrouted rows | Handed off with a record (G3) | INSTRUMENT | §14 |
| Res 23 calibration heap | Workaround stands | INSTRUMENT | §3.2 |
| Res 24 `layout` UNMAPPED | Declared `display` plus routing | ROUTE + INSTRUMENT | §10 row 6 |
| Res 25 `variant` | Presence keys | INSTRUMENT | §3.2 |
| Res 26 border colour | Route fault (Fill fixture partner), not framework | ROUTE | §3.4 |
| Res 27 `clamp` forms | Calibration records accepted forms | INSTRUMENT | §3.2, §10 row 8 |
| Res 28 CR17 | Eye Care register | CLIENT | n/a |
| Res 29 `hoursLayout` presence | Agent sets it in the tree; calibration change awaits Bean | INSTRUMENT | §3.2 |
| Res 30 state conflicts | Generated map diffed against `state-map-reasons.json`; guard carries | ROUTE | §3.7 |
| Res 31 walker items 15-18 | 15 eager load and 17 sweep become checks; 16 keep; 18 code plus probe | ROUTE | §3.6 |
| Res 32 second draft | Superseded by the 48A exports | DONE | §8 |
| Extra: margin trial (WW-SH-01) | Box-moves trial for margins | ROUTE | §3.3 |
| Extra: header/footer identity defects | Link list pairs on the `sc-for` parent; no word-based width refusal on identity pairs | ROUTE | §3.6 |
| R1 answer sheet | Re-freeze after B5; add gap-label and code-render rows | ROUTE | §15 |
| R2 skeleton writer | Inventory from code; nav, cart, link-list fixes | ROUTE | §3.4 |
| R3 Fill business-info | Carry; Not read extended to "not read or not confirmed" | ROUTE | §3.4 |
| R4 identity pairing | Primary pairing | ROUTE | §3.6 |
| R5 paint check | Carry; code-derived rows pass through it | ROUTE | §3.6 |
| R6 try before write | Carry; no code-derived bypass | ROUTE | §3.3 |
| C1 shadow names, `crisp` | Role names, migration, O10 check first | FRAMEWORK (Spec 32) | n/a |
| C2 FR-32-11 text | Text matches the code | FRAMEWORK (Spec 32) | n/a |
| C3 extractor iron law | Rewritten: names and roles from tokens, values confirmed by rendered usage | ROUTE | §11 |
| C4 README as input | Removed; no route module opens README | ROUTE | §11 |
| C5 snapshot authorship | Extractor or by hand | FRAMEWORK (Spec 32) | n/a |
| C6 slug completeness | Stays in Spec 32 §14 with a real gate | FRAMEWORK (Spec 32) | n/a |
| C7 FR-33-7 status | Current status | ROUTE | §11 |
| C8 `border-subtle` | Extractor uses `border`; negative control | ROUTE | §11 |
| C9 SGS-BEM drafts | Route halves rewritten against `.dc.html` | ROUTE | §11 |
| C10 hover helper list | Replaced by the grep command | FRAMEWORK (Spec 32) | n/a |
| C11 Spec 47 pointers | Repointed to Spec 48 | both | n/a |
| C12 "never ask Bean" | One batched confirmation at intake | ROUTE | §9 |

## Persona MUST-FIX items carried into the design

Construct census recipe and its four negative controls (sceptic); the confirm record per written value with tolerances
per property type (sceptic); swallowed errors banned in intake, a throw becomes a gap row (sceptic); three routing
adapters failing loudly (architect); prop variants: the default-prop render is the design (sceptic); fonts loaded before
any confirm read (sceptic); frozen clock, seeded random and `localStorage` seeds (sceptic, architect); box-geometry check
per paired element (sceptic); first acceptance evidence from an export untouched by B5 (sceptic); the true-gap proof
standard G0-G7 and `gaps.json` with an instrument-debt list (realist); R-47-11 reworded for target creation, Site Info's
first real run, skeleton block-choice fixes before Fill, a cap on framework-extension work (ship-PM).
