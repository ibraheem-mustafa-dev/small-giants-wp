# Draft normalisation council: revised plan (2026-09-20, v2)

Status: APPROVED by Bean 2026-09-20 (D1132). No pipeline code built yet. Written for Bean; plain English first.
v1 of this plan misread the brief (it proposed rewriting drafts to Mama's shape and a new normalise stage) and was rejected. This v2 answers what you actually asked, after a five-part council over the real drafts and code.

## 1. Your questions, answered

**"Haven't we already built functionality that translates the JS into CSS?"**
Yes. It exists and works. It is not switched on. The evaluator turns the draft script's own width rules into mobile, tablet and desktop values (75 of 140 names, 0 mismatches against a real render); nothing calls it. So on the live Eye Care page padding is 0px and grids are one column because finished code is not wired in, not because the ability is missing.

**"What is actually failing, and the true root cause?"** (run `eye-care-ward-end-eye-care-birmingham-2026-09-20-015848`)

| Group | Symptoms | Root cause (evidence) | Smallest fix |
|---|---|---|---|
| 1. Built, not wired | Section padding 0px (10 dropped `padding: {{ secPad }}`), one-column grids (4 dropped `grid-template-columns`), ticker text absent, responsive bridge inert | `script_bindings.py::resolve_tier_bindings` has no caller; `template_binding.py::drop_unresolved_bindings` drops what the evaluator could supply; `--resolve-js-content` defaults to off; `--sc-var-responsive-correlated` is not in the run command | Call the evaluator and substitute instead of drop; flip the JS-content default; add the bridge flag. The draft already carries these facts in its own script. |
| 2. Missing reader | About 13 content bindings (`{{ r.title }}`, `{{ gmbHref }}`) reach attributes; 53 visible `{{ }}` strings | Content and state bindings have no reader; `site-info-placeholder-map.json` is written but nothing reads it while converting | Same substitution point reads the map; the JS-array resolver supplies loop items |
| 3. Design gap | Brand strip, best sellers, shape tiles missing (b3, b4, b6) | FR-44-1(a) demands an exact leaf match and a single candidate; Step 0 left 14 candidates | Predicate relaxation behind its own design gate (already in your review queue) |
| 4. Bug | Halt message cites a nonexistent "Spec 13 s8.1" | Text in stage 4 | One-string fix |
| 5. Not proven | 26 transparent buttons; overall fidelity | No Stage 11.6 result and no live computed-style capture in that run | Measure first; do not fix until a cause is shown |

**"Does the pipeline ignore parts of the draft files?"** Yes, and silently. Ranked by consequence (each has an existing function to extend, no new stage):
1. `<sc-if>` conditions are never evaluated: both branches convert (95 in Eye Care). Fix: gap row per non-trivial condition; tag non-chosen branches.
2. `style-hover` (64) never reaches block settings; only the theme colour census reads it. Fix: feed it to `state_value_lift.py`.
3. `--resolve-js-content` off by default, so JS-array content vanishes without a gap row.
4. Multi-field JS items are dropped: the resolver keeps only `text` and `iconPath`. This is the bulk of the site: PRODUCTS (16 items, 21 fields), REVIEWS (13), FAQS (8), REASONS (4), BRANDS (44), SHAPES (6). None of that copy exists as HTML text.
5. The width evaluator is an orphan (Group 1).
6. The 193KB base64 `LOGOS` blob is never uploaded (`media-sideload.py` skips `data:` URIs).
7. `data-reveal`, `data-rm` motion attributes have no motion reader (`data-rv` count disputed between two counts, 5 vs 0; verify before acting).
8. `draft-manifest` (handlers, state, overlays) is built but nothing calls it.
Also read only in part: `ref=` (79), `onClick` (106; presence only), `<helmet>`, README beyond routes, section bullets and colour tables. And about ten blanket `except Exception: pass` blocks sit in the draft-reading path.

**"Evaluate the README section by section."** About 12 to 15 facts are unique to it and no code reads them (route URL patterns, section order and reuse claims, a few rules such as "zero-reviews state first", "keep trust signals", checkout step count). Code reads only: routes table, bold-named bullets under a screen, colour tables, font bullets, max width and radius. **It is also wrong in places:** Home section order and two missing sections (brand marquee, lens band), nav list, wordmark tracking (.14em not .26em), underline 1px not 2px, FAQ count (8 not 9), navy accent values, Frame Card padding, and it calls the bag a route when it is a drawer. **Consequence: the draft files are the source of truth; the README is a lossy, partly stale summary. Copying it blindly into the files would copy its errors.**

**"Two layers: both Claude Design and a second layer?" Yes, and make the second layer deterministic.** Two AI passes can miss the same thing silently, because both read ambiguous prose. So:
1. Claude Design writes the facts into the files (the closing prompt Bean gives Claude Design).
2. A deterministic checker (plain code, no AI) verifies them: every checkable README claim (names, counts, numbers, routes, colours) against the files, every schema rule, and a coverage check that every draft construct has a reader or produces a gap row. It prints an exact list ("README says 9 FAQs, file has 8"), which you paste back to Claude Design or I fix in a reviewed diff.
3. The pipeline's own gap logging and Stage 11.6 parity against the ORIGINAL draft remain the last net.
The checker only catches what it has a rule for, so every rule ships with a planted violation that must make it fail, and the ignore audit (above) feeds it new rules.

## 1b. Code, README/schema, or ask: the split (decided here, on the evidence; not deferred)

**The test, applied to every gap.** (1) Is the fact in the draft files in machine-readable form (script, markup)? (2) Can code derive it deterministically and check it against a real render at small cost? (3) If not, is it stated somewhere cheaper and more reliable (README table, or a field Claude Design writes into the draft)?
- **CODE**: yes to 1 and 2. Wire or extend a function. The files win over the README wherever both state the fact (the README is wrong in 8 places found).
- **READ**: not reliably derivable, but stated in machine-readable form (README table, manifest field). Read it, and cross-check it against the files.
- **SCHEMA/ASK**: not derivable and not stated in usable form. Do NOT build more inference code. The draft must carry it (schema, closing prompt), or an operator confirms it once (review queue).
- **MEASURE / BUG**: cause not proven, or a plain defect.

| Gap | Class | Why |
|---|---|---|
| Padding, grids, gaps, font sizes per device | **CODE** | Evaluator: 75 of 140 names, 0 mismatches vs render. README states only a handful of these values and agrees with it; README = cross-check only. |
| Loop-item and state-driven values (65 names) | **CODE** (via render) | Values sit in data and defaults; the draft's own runtime resolves them; verifiable. README has none of them. |
| All the copy in JS arrays (products, reviews, FAQs, reasons, brands) | **CODE** | Exists only in the script; deterministic; verifiable by item count. README is not a source (it only quotes a few facts and gets the FAQ count wrong). |
| Ticker, `<sc-for>` multi-field items | **CODE** | Same. Needs a design gate for boundary detection (shared mechanism). |
| `style-hover`, `data-reveal`/`data-rm`, base64 logos | **CODE** | Attribute or blob is in the file; mapping is mechanical. |
| Simple `<sc-if>` branches | **CODE** | Pick the branch the script's own state defaults select (`page:'home'`, etc.); gap-log anything complex. |
| Overlays and entities (modal, drawer, mega, cart, choice flow) | **CODE** | Handler-to-flag analysis is built and found all 6; README prose only corroborates. Wire the manifest. |
| Links between pages | **CODE** | 42 edges already derived from handlers. Turning them into slugs and IDs is the missing registry (Track D), not a reading problem. |
| Colours, fonts | **CODE** (done) | Spec 33: rendered value wins; README table is the cross-check (it caught the wrong navy values). |
| Site settings (phone, address, links) | **CODE** | In the script; the placeholder map already exists; just read it while converting. |
| Route URL patterns | **READ** (done) | README routes table is machine-readable and read today. |
| Home section identity and order (b3, b4, b6; 0 auto-completed, 7 review, 21 no-match) | **SCHEMA/ASK** | Inferring a section's block from classless structure is the measured weak spot; README prose lists 6 of 8 sections and gets order wrong. More inference code has the worst effort-to-reliability ratio here. Draft carries a class per section; existing drafts go through the review queue once. |
| Page kind, slug, parent (shop archive, single product, checkout...) | **SCHEMA** | Kind is currently guessed by regex from label and route; slug and parent are not stated anywhere. |
| Collection intent ("this list is a product query", not a static list) | **SCHEMA/ASK** | The file shows a static array; whether it becomes a WooCommerce query is a decision, not a fact in the file. |
| Behavioural rules only in the README (zero-reviews state first, keep trust signals, checkout 3 to 4 steps, WhatsApp pre-selected, stock colours) | **READ/SCHEMA** | 12 to 15 facts, cheap to state as short rules; inferring intent from script logic is unreliable. Many are runtime WooCommerce behaviour a static clone cannot act on; record those as notes. |
| Where README and files disagree | **CODE check** | Deterministic comparison; files win; report each difference. |
| 26 transparent buttons | **MEASURE** | No live capture yet; four are binding-backed (Group 1), the rest unproven. |
| Fidelity number | **MEASURE** | No Stage 11.6 result in the last run. |
| Halt message citing a nonexistent Spec 13 | **BUG** | One string. |

**Result.** The schema shrinks to what code cannot derive: page kind, slug and parent; a class on each section; collection intent; short behavioural rules. Datasets, scope names, breakpoints, tokens, site info and links are NOT required from Claude Design because code already reads them, so the closing prompt is shorter. The judgement-heavy items are the only ones that need you: the section-identity review queue, and whether a collection is a product query. Later councils are needed only for the two shared-mechanism gates (ticker boundary detection, entity registry).

## 2. The design: four small tracks, existing code first

**Track A: close the real gaps in existing functions (no new stage).** In this order:
- A1. Wire the evaluator. Per the 2026-09-20 note's option (d), with the code-level corrections from this council: apply the tier map as an overlay AFTER the `@media` fold (inline is base-only and top priority in the converter's cascade); honour `include_inline=False`; key by the `{{ name }}` text after dc-import splicing; leave state and loop names unresolved and gap-logged. 10px snap decided per section 7 question 1. Residuals on a classless nested element need the D1129 scoping answer (a section root already works: `_residual_selector_for` returns '' so it targets the block wrapper).
- A2. JS-array content, the bulk of the copy: make it default-on with the existing fail-soft; write a gap row for every skipped `<sc-for>`; carry all item fields, not two (the render already returns whole items). Boundary detection for the ticker is a shared mechanism, so it needs its own rule 7 design gate first.
- A3 to A8, one small commit each: `<sc-if>` gap rows and branch tagging; `style-hover` to `state_value_lift`; `data:` URI sideload (deterministic: base64 is a lossless encoding, so decoding returns the exact embedded bytes; measured on Eye Care's `LOGOS`: 40 data URIs, 35 JPEG, 3 PNG, 2 SVG, all decode, no duplicates, 1.2 to 34KB, about 65 to 180px wide, so they are small thumbnails and only the embedded resolution is recoverable, not a larger original; name each file by the SHA-256 of its bytes so a re-run never uploads a duplicate, and swap in real logo files when supplied); `data-reveal`/`data-rm` recognised; call `draft-manifest` read-only at Stage -2 and attach its rows to the gap report; fix the halt message.
- A9. Add `--sc-var-responsive-correlated` to the documented run command.
- Group 3 (b3, b4, b6) and Group 5 (buttons, fidelity) stay in their own queues; Group 5 starts by running Stage 11.6.

**Track B: a draft standard for ONLY what code cannot derive (section 1b).** Spec 46 (outline; the full document is written only after the Phase 0 test). ONE embedded, machine-readable block in the draft, `<script type="application/json" data-sgs-manifest>`, instead of prose in the README, so the reader is one JSON parse. Contents, deliberately short:
- `pages[]`: id, route, screen label, kind (page, shop archive, single product, cart, checkout, order confirmation, flow), slug, parent. (Overrides the regex guess.)
- `collections[]`: repeated group, the script dataset it comes from, and its intent (`static-list` or `product-query`, and so on).
- `rules[]`: short behavioural rules that cannot be read from code (e.g. "show the no-reviews strip when a product has zero reviews"), each tagged `clone-relevant` or `note`.
- Outside the block: an SGS-BEM class on every section root (`sgs-<block>`; existing recogniser, zero new code) and the sections listed in page order; where convenient, width-dependent layout as ordinary `@media` at 768 and 1024, mobile-first (optional, since the evaluator already reads the script's own rules); no `{{ }}` inside a style value (optional for the same reason); no inline base64 (optional).
- NOT required (code already reads them): datasets and their counts, scope-name kinds, breakpoints, colour and font tokens, site info, links between pages, entity kinds.
- The README shrinks to intent that has no machine form ("do not paraphrase reviews").
Not in the standard: `data-slot` (not in Spec 00; Mama's uses none). Lives at `.claude/specs/46-SGS-DRAFT-STANDARD.md` plus the checker at `plugins/sgs-blocks/scripts/draft-standard/`, reading class rules from `scripts/lint-naming-conventions.py` so it cannot drift from Spec 00.

**Track C: layered verification** (the answer to your two-layer question, section 1). Plus one structural gate against silent ignores: a "draft construct coverage" test that lists every construct category in section 1 and asserts each has a reader or emits a gap row, with a negative control (remove a reader, the test must fail). This is the permanent fix for "functions that ignore parts of files".

**Track D: whole-site cloning (design gate later; schema fields designed now).** Built: manifest (screens, entities, references, build order), screen route, Woo templates (Spec 30), mega menu and drawer (Spec 36), forms (Spec 42). Missing, per FR-31-27: per-client entity registry, entity creation, reference resolution to slugs and IDs, page shell creation, manifest-to-stage wiring, header and footer emit (Spec 33 Part 2 not started), collection rules ("this list is a product query"). Track B's manifest fields carry exactly the inputs these need, so Claude Design drafts arrive ready.

## 3. What the council checked in code (facts the design rests on)

- The converter matches `@media` to an element by class or tag only; inline `style` is its top-priority layer (`styling_helpers.py::collect_css_decls_for_element`). So a per-device value cannot be carried by inline style; the tier map is applied as an overlay.
- Stage 4i resolves images against `args.mockup.parent`: nothing may repoint `args.mockup`. Stage 11.6 already scores against the ORIGINAL draft (served from its folder) for DSL drafts; for a static draft it currently scores the run copy if a resolver fired (a small fix: use `_draft_path`).
- Residual scope: for a classless section root the residual targets the block wrapper (correct); for a nested classless element it would restyle the whole section (open, D1129).
- Mama's has non-device breakpoints (600, 640, 1280): the standard must allow them, so "only 768 and 1024" is not a rule.

## 4. The Claude Design bundle

The Eye Care bundle from Claude Design is `sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2`, beside the original bundle; the checker reads it.

## 5. Phases (each verified on the real Eye Care page; Mama's markup identical)

| Phase | Deliverable | Verification | Size |
|---|---|---|---|
| 0 (parallel, first action) | You run the closing prompt in Claude Design. I run Stage 11.6 on the current clone for a baseline, count the evaluator's thresholds (settles how many names the 10px rule touches), and probe the original at 762 and 766 | Numbers in one short report | small |
| 1: A1 | Evaluator wired at the substitution point, tier overlay, gap rows | Eye Care: padding, grid columns, h1/h2 sizes match the draft at 375/768/1440 keyed by text (rule 4a); `{{` in style values 0; `audit-inline-styling.js --check` exits 0; Mama's markup identical (32,767 chars) with the change on and off; the three P13 values (`clamp()`, `repeat(2,minmax(0,1fr))`, `minmax(0,1.1fr) minmax(0,1fr)`) shown to pass the resolvers | medium |
| 2: A2 | JS content default-on, all fields, gap rows | `'100% genuine'` and a product name found in `block_markup` and in the live page's `innerText`; rule 7 gate for ticker boundary approved first | medium |
| 3: A3 to A9 | One commit each | Each proved by one string or attribute found in emitted markup | small each |
| 4: B + C | Checker, coverage test, Spec 46 v1 (only after Phase 0 shows Claude Design follows it), Spec 00 cross-check | Checker green on Mama's, red on Eye Care, planted violation per rule fails | small to medium |
| 5: D | Design gate for entity registry, creation, references | Bean approves before any build | design only |

Kill condition for Track B: if Claude Design ignores the closing prompt in two tries, Spec 46 stays an outline, and Tracks A and C carry everything (they do not depend on Claude Design).

## 6. Risks against the seven rules (compact)

Rule 1: no classes are generated; standard classes come from Claude Design and are consumed, not mirrored. Rule 2: none introduced. Rule 3: the fallback paths (evaluator, recognisers, guard) keep running on every draft, and both conforming and non-conforming drafts run on both controls each commit. Rule 4: the accounting unit for a classless draft is name x element x property; every unresolved one is logged with a reason; the coverage test makes silent drops fail. Rule 5: every phase closes on the live Eye Care page. Rule 6: values go to tier attributes, never inline. Rule 7: this document is the gate for Track A1; A2's ticker boundary and D each get their own. R-31-11: fidelity stays against the original draft (a small fix for static drafts).
Earlier-council findings that survive: no generated classes (rejected design option (b)); Mama's is the wrong positive control for a strict breakpoint rule; snapping invents 8px of behaviour at 760 to 767 (probe first); a checker is both instruction and oracle, hence the planted-violation controls; the unproven items (P10 to P14) are tested in Phase 0 and Phase 1.

## 7. Open questions for you (only these)

1. **The 10px snap: ANSWERED (Bean, 2026-09-20): keep the rule, and also normalise the draft platform's own stated breakpoints to ours.** The Eye Care draft states four, each with its own name, in its script and README: `mob` (below 760), `narrow` (below 1024), `wide` (1280 and up) and `lensStack` (below 700). Proposed mapping, applied as data read from the draft (the evaluator already reads the flags from the script, never assumes them): `mob` 760 to our 768 edge; `narrow` 1024 already equals our 1024 edge; `lensStack` 700 to our 768 edge (a below-768 stack point is where the mobile layout ends; the 700 to 767 band is 68px wide and no common device sits in it, since tablets start at 768); `wide` 1280 stays a bounded visual breakpoint (there is no device tier above 1024, moving it would change 3-versus-4 columns across 1024 to 1279). The rule: a declared breakpoint below our tablet edge moves up to 768; one at or above 1024 is never moved. Undeclared ad-hoc thresholds (620, 1060, 1100, 1160) stay residuals. Effect on the 75 resolved names: 17 clean, 37 (760) plus 14 (700) snap, 7 keep a residual (1060 x2, 1100 x2, 1160, 1280, 620). Every snap is logged with its band. **CONFIRMED by Bean (2026-09-20): 700 to 768, and 1280 stays.**
2. Will you run the closing prompt on the current Eye Care draft in Claude Design (Phase 0)? Nothing else needs you until Phase 2's ticker design gate. **Attach the logo file to the prompt** (see section 4).
3. Carrier: the plan uses one embedded JSON manifest block plus standard section classes. You did not choose between classes and data attributes; say if you want data attributes instead of the manifest block (that needs a new reader per attribute).
4. The three judgement calls from section 1b that are yours, not code's: (a) section identity for the existing Eye Care draft goes through the review queue once (b3, b4, b6) instead of more inference code; (b) a collection such as best sellers is a WooCommerce product query or a fixed list; (c) which README behavioural rules matter to a static clone and which are notes. I recommend answering (a) now and (b), (c) when Phase 2 reaches them.

## 8. Housekeeping

`git rm .claude/prompts/2026-09-20-draft-normalisation-council.md` in the commit that finishes or supersedes this session. Record a decision (D1131; re-check the ceiling in the same command) and update the LEDGER Human Summary and FR-31-30 status when approved. No parking entries without your ask. Commit to `main`, explicit pathspec, no PR, no stash. Save a feedback memory: your "normalise" idea meant moving README facts into the draft files, not reshaping drafts or building stages.
