---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
created: 2026-06-13
plan_label: "[PLAN: opus]"
scope: "Close the OPEN clone-fix ledger rows via 5 verified, code-grounded converter fixes (NOT a routing redesign — the routing is already built)."
supersedes: ".claude/plans/2026-06-13-tag-role-css-routing-DESIGN.md (RETIRED — duplicated built code)"
ground_truth: "read-only code analysis 2026-06-13, file:line verified (4 parallel investigators + 2 self-verified). Spec built_status labels were stale."
---

# Phase — Clone-fix converter gaps (5 fixes, code-grounded)

**USP:** Closes the customer-visible fidelity bugs (testimonial styling, IN-E, H-C1, IN-B) that block the Mama's canary from matching its draft — by completing 5 small, already-located converter gaps, not by rebuilding routing. This is the last mile before SGS can clone a page faithfully end-to-end.

**Plan label:** [PLAN: opus] — converter is high-blast-radius shared mechanism; main agent orchestrates + QCs, subagents implement.
**Docscore:** (pending)
**Aggregate cost estimate:** ~5 subagent dispatches (sonnet) + 2 council passes + per-step live-verify. Low — each fix is small and located.

## ⛔ Ground-truth verification (why this plan is NOT the retired redesign)

A read-only code analysis (2026-06-13) found the routing mechanisms the retired DESIGN doc proposed to "rebuild" are **already built** — the spec's `built_status:` labels were stale. Verified in code:
- FR-22-5.1 inherited-value resolution = **BUILT** (`convert.py:1737 _resolve_inherited_typography` — ancestor walk + text-align absence-override `:1842`).
- FR-22-5.3 cross-node box-CSS router + name-free `attr_for_layer_property` = **BUILT/PARTIAL** (`db_lookup.py:2400`, live `convert.py:2534`).
- scalar content+styling lifts = **BUILT** (`convert.py:3363`, `:3485`; multi-selector loop `:3595-3602`).
- GF-B.2 selector matcher = **REAL BUG** (`convert.py:619-622` class-branch ignores ancestor scope).

So the OPEN rows are 5 small targeted gaps, sequenced with the foundational matcher fix first.

**Phase success criteria (done when):**
- [ ] GF-B.2: ancestor-scoped compound selectors no longer bleed cross-section (Gate A + clone-parity green; live page-8 no regression).
- [ ] Testimonial: live computed-style on page-8 quote (`__text`) + name (`__author`) = draft values; survives full `/sgs-update` reseed.
- [ ] IN-E: live info-box renders `text-align:center` (computed) on page-8.
- [ ] H-C1: hero sub-headline `max-width` = draft value (live), not the shared content band.
- [ ] IN-B: content band width = resolved literal (e.g. 960px), not the raw `var(--content-width)` string.
- [ ] Each closed row: built from the verified cause, council-GO'd if shared-mechanism, live-verified, ledger row flipped with commit hash. Zero new `if slug==` literals.

**Entry context (read before starting):**
- `.claude/reports/2026-06-13-open-row-rootcause-verification.md` — the 4-agent root-cause report.
- This plan's Ground-truth block above — the verified file:line state.
- `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` — the rows to flip.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` + `db_lookup.py` — the converter.
- `.claude/specs/22-…EXTRACTION.md` §FR-22-5.1 / §FR-22-5.3 / §FR-22-21; Spec 29; D194 (canonical_slot = content-fork; layer routing name-free).

**References:**
- RETIRED design trail: `.claude/plans/2026-06-13-tag-role-css-routing-DESIGN.md` (reasoning only — do NOT build from it).
- Canonical-path DB rule: `[[db-changes-reproducible-via-migration-not-manual-or-moduleload]]` — dated `migrations/*.py` + survive full reseed.
- Golden-regen guard: a regenerated golden MUST be diffed vs the FIXTURE DRAFT (a subagent can pass conformance by rewriting the golden to its own wrong output).
- `[[converter-attr-must-match-the-attr-render-reads]]` — grep render.php + wrapper before lifting onto any attr.

**Orchestration model (Bean directive — bake into every step):** Opus main agent does ONLY plan / delegate / QC / live-test / commit. **Subagents (sonnet) do ALL implementation** — no inline hand-writing of converter/PHP/JS; never retype a subagent's file (SendMessage the fix). Subagents have NO commit/deploy authority and NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean deploys + live-verifies on the canary himself.**

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /adversarial-council | Step 1, Step 3 (approach gate) |
| skill | /qc-council | every converter/DB commit |
| skill | /sgs-update | Step 2 (reseed) |
| skill | /sgs-db · /wp-blocks | Steps 2,3,4 (schema/attr ground truth) |
| agent | general-purpose (sonnet) | all implementation steps |
| mcp | chrome-devtools (Playwright fallback) | every live-verify |
| cli | python (sqlite3) · pytest | conformance suites + DB |
| external | PowerShell `npm run build` | deploy prep |

---

## ⚠ ADVERSARIAL-COUNCIL REVISIONS (2026-06-13, 6-persona, all read the code directly)

The council caught TWO build-breakers + re-ordered for ship. These OVERRIDE the original step bodies below where they conflict — read this block first.

- **R1 (convergent, 5/6 personas) — KILL Step 2's "self-healing populator".** The "styling inherits content sibling's `derived_selector` by shared `canonical_slot`" rule is built on a broken join (live DB: `nameFontWeight.canonical_slot='quote'` WRONG; `reviewerName.canonical_slot=NULL`) and would CORRUPT other blocks site-wide (`cta-section.headlineColour` → inherits `.sgs-cta-section__headline, h1, h2`; same for icon/toc/team-member). **REPLACE with: add the 5 testimonial styling selectors to the FINGERPRINT-OVERRIDES channel** (assign-canonical.py ~:553 — where all 16 existing multi-alias selectors already come from; deterministic `derive_selector()` at :398-406 CANNOT produce multi-alias, so the migration-only path drifts). Confirm the fingerprint-override survives a full `/sgs-update` reseed. No `canonical_slot` pairing.
- **R2 (Regression M3 + 3 others) — Step 3 over-emits.** Widening the gate makes the always-emit `text-align:left` absence-default (`:1842-1847`) fire for ~16 `supports.typography` composites → forced `textAlign:left` site-wide, overriding theme/variation centre. FIX: the widened gate emits ONLY when ancestor resolution returned an EXPLICIT value; faithful-absence (`continue`) otherwise for supports-typography blocks. The always-emit `left` stays scoped to heading/text/label.
- **R3 (Ship-PM, convergent on order) — RE-ORDER + PROBE-FIRST.** New Step 0 = probe the live page-8/draft computed `text-align` (IN-E) + sub-headline `max-width` (H-C1) BEFORE building — the ledger flags IN-E "SUSPECT-MISDIAGNOSIS"; if it computes faithfully already, DROP Step 3 (saves a council pass). Then ship **Step 2 (testimonial data) FIRST and independently** — it's the one certain page-8 win, pure data, does not depend on Step 1 (its selectors are simple, not the cross-section compound case GF-B.2 fixes). Then Step 1, then surviving Step 3, then 4/5.
- **R4 (Regression M1) — GF-B.2 edge:** a compound single-element selector (`.sgs-x__text.sgs-x--featured`, no space) splits to ONE token with empty `parts[:-1]` → the new ancestor-walk must treat empty-ancestor-list as "match (no ancestor required)", NOT drop. Add a test.
- **R5 (Cynic MUST-FIX 2 + Rules-Lawyer) — Step 4: route AROUND the exclusion, don't widen it.** `_area_excluded` (:2307) guards the OUTER/section widthMode path (content+Width name-collision). Route `subHeadlineMaxWidth` via the existing per-area attr path BEFORE the exclusion is consulted, gated on `db.block_attrs(owning_block)` declaring it. Add a Rule-7 pre-build design-gate (currently only /qc-council).
- **R6 (Spec-Lawyer MF-2 + Ground-Truth) — Step 3 attr-name is Orchestrator-resolved, not subagent-guessed.** Before dispatch, Opus reads info-box block.json + render.php + `/wp-blocks` to hard-specify whether the emit key is top-level `textAlign` or `style.typography.textAlign` (and that render.php actually reads it — `[[converter-attr-must-match-the-attr-render-reads]]`).
- **R7 (Cynic MUST-FIX 3) — fix the disease:** correct the stale `built_status:` labels in Spec 22 §FR-22-5.1/5.3 to cite the verified file:line, and record in D224 "verify code not labels". Cheap; stops the next session re-rediscovering built code.
- **R8 (Regression S1) — Step 5: confirm `--content-width` reaches `_fw_base`** (the matcher may skip `--` custom props at :2321) before treating the var() resolver as sufficient.
- **R9 (Regression MISSING) — page-8-only harness is blind to the R1/R2 cross-client regressions.** After Steps 2/3, re-clone a SECOND client (indus-foods or helping-doctors) and diff for unintended textAlign/colour changes.

**Revised ship order:** Step 0 (probe) → Step 2 (testimonial via fingerprint-overrides, ship first) → Step 1 (matcher + R4 edge) → Step 3 (only if probe confirms IN-E real; with R2+R6) → Step 4 (R5 route-around + Rule-7) ∥ Step 5 (R8) → cross-client regression check (R9) → flip ledger.

---

## ⚠ KNOWN GAP from the bridge close-out (2026-06-13)

The testimonial styling bridge is **4/5 reseed-durable**. `quoteFontSize/Colour/LineHeight` + `nameColour` survive a full `/sgs-update` reseed; the golden is rebaselined (`nameColour:#5c4f46`, draft-faithful) and **both conformance suites are 69/69 green**. BUT **`nameFontWeight` reverts to single-class `.sgs-testimonial__name` after a reseed** — its fingerprint/migration multi-alias (`.sgs-testimonial__name, .sgs-testimonial__author`) is not picked up by `sgs-update-v2.py` Stage 1 for this attr. ROOT CAUSE NOT CONFIRMED (a subagent hypothesised the single-match derive wins over the fingerprint, UNVERIFIED — READ the `assign-canonical.py` existing-selector-preserve vs fingerprint-override vs derive interaction at ~:543-560 for this specific attr before fixing; do NOT patch on the guess). Current DB state has `nameFontWeight` reverted (re-running the migration restores it but is NOT reseed-durable). Fold this into Step 2 (testimonial) of the build — it is the one piece of the testimonial fix that is not yet durable.

## Steps

### Step 1 — GF-B.2: harden the selector-scope matcher (FOUNDATIONAL, FIRST)
  Model:       sonnet (subagent implements) · inline+council (gate)
  Orchestrator: Opus runs /adversarial-council on the fix shape BEFORE dispatch (Rule 7 — 28 call sites); dispatches sonnet; QCs; commits.
  Action:      In `_collect_css_decls_for_element` (convert.py:619-622), generalise the TAG-branch ancestor walk (`:631-650`) to the CLASS branch: before accepting a final-class match, verify EVERY ancestor token in `parts[:-1]` resolves to a real ancestor of `node`, honouring `>`/`+`/`~` combinators (same walk the tag branch already does).
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py
  Inputs:      Verified bug at :619-622; the working tag-branch pattern at :623-650 as the template.
  Outcome:     `.A .B {}` matches `.B` ONLY when a real `.A` ancestor is present; single-class selectors (`.B {}`) unaffected.
  Exec:        SEQUENTIAL — must land before Steps 2-3 (they read CSS through this matcher).
  Deps:        none
  Marker:      SESSION-START
  Time:        ~10 min build + council.
  Tooling:     /adversarial-council, /qc-council, pytest (both conformance suites), chrome-devtools.
  On-Fail:     Revert by inverse Edit. If clone-parity drops broadly (decls removed that were matching via the loose rule), that is EXPECTED for true cross-section leaks — inspect each delta on live page-8 before judging regression vs correction.
  Cold-Entry:  This plan + the Ground-truth block + convert.py:600-660.
  Prompt:      "READ-ONLY of the surrounding function FIRST. In plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py, `_collect_css_decls_for_element`, the CLASS-match branch at lines 619-622 accepts a CSS selector match on the final class token alone, ignoring any descendant-combinator ancestor scope. The TAG-match branch at 623-650 already walks `node.parent` to require the ancestor token is present. TASK: make the class branch do the same — before `matched_sel = individual_sel`, verify each token in `parts[:-1]` (skipping `>`/`+`/`~` combinator tokens, resolving the token before them) resolves to a real ancestor class of `node`. Reuse the existing ancestor-walk shape from 631-650; do not introduce a CSS engine. Return ONLY the unified diff + a 3-line explanation. Do NOT commit, do NOT run git, do NOT touch other files."
  Test:
    Happy:       A draft with `.sgs-social-proof .sgs-section-heading__sub{text-align:center}` + a `.sgs-section-heading__sub` in a DIFFERENT section → the center no longer lifts onto the other section's heading.
    Edge:        A single-class rule `.sgs-section-heading__sub{...}` (no ancestor) still matches (no regression to the common case).
    Fail:        A `>`/`+`/`~` combinator selector is parsed without crashing; unknown ancestor → no match (not an exception).
    Integration: Both conformance suites green; clone-parity on page-8 shows no NEW missing decls on correctly-scoped elements.

QA Gate — Step 1 lands clean
  Model:   inline (architectural) + sonnet (suite run)
  Exec:    SEQUENTIAL
  Deps:    Step 1 complete
  Check:   `cd plugins/sgs-blocks/scripts && python -m pytest tests/test_converter_conformance.py converter_v2/tests/ -q` AND a re-clone of Mama's + live page-8 probe of the gift-section heading (`.sgs-section-heading__sub`) computed `text-align`.
  Pass:    Both suites green; gift-section heading text-align ≠ inherited center bleed (matches its own draft value).
  Fail:    Inspect each removed decl on live page-8; if a correct decl was lost, tighten the ancestor walk (combinator handling) — do NOT loosen back to class-only.
  Marker:  QA

### Step 2 — Testimonial styling-lift: data fix + sustainable population
  Model:       sonnet (subagent) · inline (QC + reseed verify)
  Orchestrator: Opus dispatches; verifies the migration survives a FULL /sgs-update reseed; QCs; Bean deploys + live-verifies.
  Action:      (a) Write a dated migration `migrations/2026-06-13-testimonial-styling-derived-selectors.py` setting: `quoteFontSize`/`quoteColour`/`quoteLineHeight` → `.sgs-testimonial__quote, .sgs-testimonial__text`; `nameFontWeight` → `.sgs-testimonial__name, .sgs-testimonial__author`; `nameColour` → `.sgs-testimonial__heading, .sgs-testimonial__author`. (b) Make `/sgs-update` derived_selector population have a STYLING attr inherit its CONTENT sibling's derived_selector by shared `canonical_slot` (so this self-heals + never drifts), so a reseed reproduces the same multi-aliases without the migration being the only source.
  Files:       plugins/sgs-blocks/scripts/migrations/2026-06-13-testimonial-styling-derived-selectors.py ; the /sgs-update derived_selector populator (assign-canonical.py or the styling-selector populator — subagent locates it).
  Inputs:      Verified single-class selectors (DB query); the content `quote` attr's working multi-alias as the pattern.
  Outcome:     The 5 styling attrs carry multi-aliases matching the Mama's draft; a full `/sgs-update` reseed reproduces them (not migration-only).
  Exec:        SEQUENTIAL after Step 1 (the styling-lift reads CSS through the fixed matcher).
  Deps:        Step 1
  Marker:      (none)
  Time:        ~10 min.
  Tooling:     /sgs-db, /sgs-update, python sqlite3, /qc-council.
  On-Fail:     Revert the migration + populator edit; the DB reseeds from prior state.
  Prompt:      "Two-part DB-data task in c:\\Users\\Bean\\Projects\\small-giants-wp. DB: C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db. (1) Write a dated migration `plugins/sgs-blocks/scripts/migrations/2026-06-13-testimonial-styling-derived-selectors.py` (follow the shape of an existing migrations/*.py) that UPDATEs block_attributes.derived_selector for block_slug='sgs/testimonial': quoteFontSize, quoteColour, quoteLineHeight → '.sgs-testimonial__quote, .sgs-testimonial__text'; nameFontWeight → '.sgs-testimonial__name, .sgs-testimonial__author'; nameColour → '.sgs-testimonial__heading, .sgs-testimonial__author'. Idempotent (UPDATE … WHERE block_slug=… AND attr_name=…). (2) Locate the /sgs-update step that POPULATES derived_selector (likely assign-canonical.py or a sibling) and add logic: a STYLING attr (role in typography/color) with a populated canonical_slot inherits the derived_selector of the CONTENT attr sharing that canonical_slot, when its own is single-class or absent. Quote the exact insertion point. Return the migration file content + the populator diff + a note on which file/function populates derived_selector. Do NOT run /sgs-update, do NOT commit, do NOT manually edit the .db file."
  Test:
    Happy:       After running the migration + a full `/sgs-update` reseed, `SELECT derived_selector FROM block_attributes WHERE block_slug='sgs/testimonial' AND attr_name='quoteFontSize'` = the multi-alias.
    Edge:        A testimonial draft using the canonical `__quote`/`__name` still resolves (first-match-wins order keeps canonical first).
    Fail:        Reseed does NOT revert the values (populator reproduces them) — if it reverts, the populator inheritance is wrong.
    Integration: Re-clone Mama's → testimonial emit now carries quoteFontSize/Colour/LineHeight/nameFontWeight/nameColour.

QA Gate — Step 2 survives reseed + renders live
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 2
  Check:   Run migration → full `/sgs-update` → re-query the 5 selectors (must be multi-alias) → both conformance suites → Bean deploys → chrome-devtools probe `.sgs-testimonial__quote` computed fontSize/color/lineHeight + `.sgs-testimonial__author`-equivalent weight on page-8.
  Pass:    Selectors multi-alias post-reseed; live computed styles = draft (`__text` 14px italic `--text-muted`; `__author` 13px weight 600) — NB use the Mama's draft values, not the fixture's 17px.
  Fail:    If reseed reverts → fix populator. If emit-green but not rendered → check served block.json `?ver` (Hostinger 7-day cache; bump version).
  Marker:  QA

### Step 3 — IN-E: widen the inherited-typography emit gate to WP-native supports
  Model:       sonnet (subagent) · inline+council (gate)
  Orchestrator: Opus runs /adversarial-council on the gate-widening APPROACH (Rule 7 — touches the universal inherited-value path) BEFORE dispatch; QCs; Bean live-verifies.
  Action:      At `convert.py:1836` (`if attr_name not in block_attr_map: continue`), widen so the resolver ALSO emits onto WP-native `supports.typography`-derived attrs: when a block declares `supports.typography.textAlign` (etc.) but has no `block_attributes` row for the mapped attr, emit the value onto the WP-native attr name (`style.typography.textAlign` / top-level `textAlign` — confirm which the block accepts). Universal (R-22-9), guard against double-emit when a real attr also exists.
  Files:       convert.py (the `_resolve_inherited_typography` emit gate); a supports-attr resolver in db_lookup.py if one must be added (subagent confirms the WP-native attr name + emit shape).
  Inputs:      Verified gate at :1836; info-box block.json `supports.typography.textAlign`; the `_INHERITABLE_TYPOGRAPHY_PROPS` map.
  Outcome:     A block whose text-align comes only from `supports` (e.g. info-box) receives the resolved inherited value; blocks with a real attr unaffected.
  Exec:        SEQUENTIAL after Step 1.
  Deps:        Step 1
  Marker:      (none)
  Time:        ~15 min build + council.
  Tooling:     /adversarial-council, /qc-council, /wp-blocks (confirm supports→attr-name), chrome-devtools.
  On-Fail:     Revert by inverse Edit. If it double-emits, gate on "real attr absent AND supports declares it".
  Prompt:      "READ FIRST: convert.py `_resolve_inherited_typography` (1737-1866) + its emit gate at 1836 (`if attr_name not in block_attr_map: continue`), and how block_attr_map is built (db_lookup.py:487-491, reads block_attributes table only). PROBLEM: sgs/info-box declares text-align via WP-native `supports.typography.textAlign` in block.json, NOT a block_attributes row — so the resolver correctly RESOLVES the inherited `text-align:center` then drops it at 1836. TASK: design + implement a gate-widening so that when a block has NO block_attributes row for the inheritable attr BUT declares it via supports.typography (e.g. textAlign), the resolver emits the value onto the correct WP-native attr (confirm via /wp-blocks whether it is top-level `textAlign` or `style.typography.textAlign` for these blocks). Universal across all supports.typography blocks (no info-box literal). Guard: never double-emit if a real attr ALSO exists. Return the diff + which WP-native attr name you emit onto + how you read supports from block.json/DB. Do NOT commit."
  Test:
    Happy:       Re-clone Mama's; info-box emit carries the inherited text-align (center); live page-8 info-box computed `text-align: center`.
    Edge:        A block WITH a real textAlign attr still uses that path (no double-emit).
    Fail:        A block declaring neither attr nor supports → no emit (faithful absence), no crash.
    Integration: Both conformance suites green; no regression on blocks that already emitted text-align.

QA Gate — Steps 1-3 verified live
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 1,2,3
  Check:   Both conformance suites green; Bean deploys; chrome-devtools page-8 probes: (a) gift-section heading no bleed, (b) testimonial quote/name styles = draft, (c) info-box `text-align: center`.
  Pass:    All three live computed values = draft; no regression elsewhere on page-8.
  Fail:    Per row, inspect emit vs render chain (attr TYPE → supports → render.php → safecss); check served `?ver`.
  Marker:  QA

### Step 4 — H-C1: per-slot max-width routing
  Model:       sonnet (subagent) · inline (QC)
  Orchestrator: Opus dispatches; /qc-council on the commit; Bean live-verifies.
  Action:      Allow a leaf/area element's own `max-width` to route to a per-slot attr (e.g. hero `subHeadlineMaxWidth`) when the owning block declares one — mirroring the existing `subHeadlineMarginBottom` per-area path — instead of only the shared `contentWidth` band. Keep `contentWidth` as the fallback. Revisit the `_area_excluded` max-width exclusion (convert.py:2307-2309) so per-slot max-width is no longer hard-blocked (but the OUTER/section max-width semantics, which drive widthMode, stay intact).
  Files:       convert.py (`_route_area_css_to_block_attrs` :2307 + the per-area routing path); db_lookup.py if a per-slot max-width resolver is needed.
  Inputs:      Verified exclusion at :2307-2309; the `subHeadlineMarginBottom` per-area path as the template; hero declares `subHeadlineMaxWidth` (render-ready).
  Outcome:     `.sgs-hero__sub{max-width:420px}` lands on `subHeadlineMaxWidth`, not the shared content band.
  Exec:        PARALLEL with Step 5 (different code paths; no shared file region — coordinate the single convert.py file via sequential commits).
  Deps:        Step 1 (matcher) — light; this path also reads CSS.
  Marker:      (none)
  Time:        ~15 min.
  Tooling:     /qc-council, /sgs-db (confirm hero per-area attrs), chrome-devtools.
  On-Fail:     Revert by inverse Edit. If the OUTER widthMode regresses, the exclusion change leaked into the section path — scope to the per-area/leaf path only.
  Prompt:      "READ FIRST: convert.py `_route_area_css_to_block_attrs` (around 2300-2330) incl `_area_excluded` at 2307-2309 (which hard-excludes max-width), AND how `subHeadlineMarginBottom` (a per-area attr) is currently routed (grep it). PROBLEM: a leaf element's own max-width (e.g. `.sgs-hero__sub{max-width:420px}`) is excluded from per-area routing, so it can only hit the shared `contentWidth` band — hero's `subHeadlineMaxWidth` attr is never a destination. TASK: route a per-area/leaf element's own max-width to its owning block's per-slot max-width attr (mirror the subHeadlineMarginBottom path) when such an attr exists; fall back to contentWidth otherwise. CRITICAL: do NOT change the OUTER/section max-width semantics that drive widthMode (that path must stay). Confirm hero's per-area attr name via the DB. Return the diff + proof the section widthMode path is untouched. Do NOT commit."
  Test:
    Happy:       Re-clone Mama's; hero emit carries `subHeadlineMaxWidth:420px`; live page-8 sub-headline computed `max-width: 420px`.
    Edge:        A section with its own max-width still sets widthMode/customWidth (no regression).
    Fail:        A block without a per-slot max-width attr → falls back to contentWidth (no crash, no drop).
    Integration: Both conformance suites green; hero widthMode unchanged.

### Step 5 — IN-B: general co-declared var() resolution
  Model:       sonnet (subagent) · inline (QC)
  Orchestrator: Opus dispatches; /qc-council on the commit; Bean live-verifies.
  Action:      Add a general helper `_resolve_co_declared_var(value, decls)` that, when a lifted value is `var(--x[, fallback])`, resolves `--x` to its co-declared literal on the same element/rule-set (fallback to the var()'s own fallback, else leave raw + FLAG). Use it where lifted values may be vars — at minimum the `contentWidth` set at convert.py:5370.
  Files:       convert.py (new helper + the contentWidth set at :5370; audit other lift sites that may carry a var()).
  Inputs:      Verified raw emit at :5370; `_collect_css_decls_for_element` stores decls verbatim (the co-declared `--content-width:960px` is available on the same element).
  Outcome:     `max-width:var(--content-width)` with co-declared `--content-width:960px` → `contentWidth:960px`.
  Exec:        PARALLEL with Step 4 (different code region; sequence commits on the shared file).
  Deps:        Step 1 (light)
  Marker:      HANDOFF (last step — commit, flip ledger, /handoff)
  Time:        ~12 min.
  Tooling:     /qc-council, chrome-devtools.
  On-Fail:     Revert by inverse Edit. If a var() with no co-declared literal mis-resolves, ensure it leaves raw + FLAGs (never silent-drop, FR-22-21 step 6).
  Prompt:      "READ FIRST: convert.py:5370 where `contentWidth` is set raw (`container_attrs.setdefault('contentWidth', _strip_important(_inner_mw).strip())`, _inner_mw from `_fw_base.get('max-width')`), and confirm no var() resolution exists anywhere (grep `var(`). The draft co-declares `--content-width:960px` on the SAME element as `max-width:var(--content-width)`. TASK: write a general helper `_resolve_co_declared_var(value, decls)` — if value matches `var(--name[, fallback])`, return decls.get('--name') if present, else the fallback, else the original value + a FLAG (never silent-drop). Apply it at :5370 and audit/lift other sites where a lifted value may be a var() (grep the lift sites). Return the helper + diffs + the list of sites you applied it to. Do NOT commit."
  Test:
    Happy:       Re-clone Mama's; content band emits `contentWidth:960px`; live page-8 content band computed `max-width: 960px` (not the literal string).
    Edge:        `var(--x, 800px)` with no `--x` declared → resolves to `800px` (fallback).
    Fail:        `var(--undefined)` with no fallback → leaves raw + FLAGs (gap-candidate), no crash.
    Integration: Both conformance suites green; the footer `--content-width:1000px` co-declared case (sites/.../index.html:664) also resolves.

QA Gate — Steps 4-5 verified live + ledger flipped
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 4,5
  Check:   Both conformance suites green; Bean deploys; chrome-devtools page-8: hero sub-headline `max-width:420px`, content band `max-width:960px`. Then flip the closed ledger rows (testimonial/IN-E/H-C1/IN-B + GF-B.2) with commit hashes.
  Pass:    All live computed values = draft; ledger rows VERIFIED with hashes; decisions.md updated.
  Fail:    Per row, trace emit→render; re-check served `?ver`.
  Marker:  QA

---

## Step 6 — Truth-doc sync (MANDATORY, runs after EACH fix lands; not deferred to the end)

The doc-staleness disease (stale `built_status:` labels) is what sent this whole thread down a wrong path. So every fix MUST update the truth docs with HIGH-DETAIL, code-anchored references — Bean directive 2026-06-13.

For each shipped fix, update the relevant docs with:
- **`built_status:` on the touched FR** (Spec 22 §FR-22-5.1 / §FR-22-5.3 / etc.) → BUILT/PARTIAL with the EXACT `file:line` of the implementing function + a one-line of what it does. No bare "PLANNED/PARTIAL" labels left when the code is built.
- **The DB tables + COLUMNS the fix consults/writes** (e.g. `block_attributes.derived_selector`, `property_suffixes.suffix/css_property`, `slots.aliases`) — named explicitly.
- **`cloning-pipeline-stages.md`** — the stage's script/function + line range if the fix changes behaviour there.
- **`decisions.md`** — the D-entry citing file:line + the DB columns.
- **`block_capabilities` / block.json capability** if the fix adds/uses one (with the gate `file:line`).
Docs to touch per fix are listed in each step's `Truth-docs:` note (added below). The acceptance for Step 6 is: `grep` the updated FR's `built_status:` shows the real file:line, and no doc still calls a built mechanism "PLANNED".

**Per-step Truth-docs targets:**
- Step 1 (GF-B.2): `cloning-pipeline-stages.md` (the `_collect_css_decls_for_element` matcher) + `decisions.md` + a note on Spec 22 §FR-22-5 that the selector matcher now respects ancestor-scoped compound selectors (`convert.py:619-653`).
- Step 2 (testimonial): Spec 22 §FR-22-2 (scalar-content/styling-lift, `convert.py:3363/3485`, `block_attributes.derived_selector`, the fingerprint channel `tools/recogniser/data/fingerprints.json` + the reseed-durability rule) + the `nameFontWeight` durability resolution.
- Step 3 (IN-E): Spec 22 §FR-22-5.1 `built_status` → BUILT (`convert.py:1737`) + the emit-gate widening (`:1836`, WP-native `supports.typography` path).
- Step 4 (H-C1): Spec 22 §FR-22-5.3 / §FR-22-21 — per-slot max-width routing + the `_route_area_css_to_block_attrs` exclusion (`convert.py:2307`).
- Step 5 (IN-B): Spec 22 §FR-22-5.3 CONTENT-layer var() resolution (`convert.py:5370` + the new resolver).

## Key Judgement Calls

### Primary decisions

- **Decision:** Step 3 — widen the universal emit gate vs add a per-block `textAlign` attribute to info-box.
  - **Options:** [A] Widen gate to WP-native supports (universal) / [B] Give info-box a real `textAlign` attr / [C] Both.
  - **Recommendation:** [A], council-gated.
  - **Why:** R-22-9 universality — fixes every supports-typography block at once, no per-block carve-out. [B] is a band-aid that recurs on the next block.
  - **Cost of wrong choice:** [A] mishandled could double-emit or emit onto a wrong WP-native attr name → broad regression. Mitigated by /adversarial-council on the approach + the double-emit guard + live-verify.
  - **Who decides:** joint (Bean approves the council-GO).

- **Decision:** Step 2 — migration-only vs migration + self-healing populator.
  - **Options:** [A] Migration only / [B] Migration + populator inheritance / [C] Populator only.
  - **Recommendation:** [B].
  - **Why:** [A] drifts again (the exact bug we're fixing); [C] leaves the canary unfixed until the next reseed. [B] gives the immediate fix AND prevents recurrence.
  - **Cost of wrong choice:** [A] = silent re-drift on the next block; caught only by a future live-verify.
  - **Who decides:** architect (Bean's stated robustness preference already chose [B]).

- **Decision:** Step 1 sequencing — foundational-first vs parallel.
  - **Options:** [A] GF-B.2 first, everything re-verifies against it / [B] all 5 in parallel.
  - **Recommendation:** [A].
  - **Why:** the matcher underpins 28 call sites incl every lift; building Steps 2-3 against the OLD matcher would force a re-verify anyway.
  - **Cost of wrong choice:** [B] = re-doing 2-3's verification + possible masked interactions.
  - **Who decides:** architect.

### Pre-emptive decisions (executor-pause catches)

- **Decision:** Which WP-native attr name does Step 3 emit onto — top-level `textAlign` or `style.typography.textAlign`?
  - **Recommendation:** Subagent confirms via `/wp-blocks` for the actual blocks (info-box etc.) BEFORE writing the emit; do not assume. Both exist in WP; the block's `supports.typography.textAlign:true` implies the `style.typography.textAlign` path but verify the render reads it.
  - **Why:** emitting onto the wrong attr name = emit-green-but-not-rendered.

- **Decision:** Step 1 — does tightening the matcher remove decls that were (incorrectly) relied upon elsewhere?
  - **Recommendation:** Treat any decl REMOVED by the fix as a candidate cross-section leak; inspect each on live page-8 before calling it a regression. Expected: some "matches" disappear — that IS the fix.
  - **Why:** prevents a false-regression rollback of a correct tightening.

- **Decision:** Steps 4 & 5 share `convert.py` — parallel-safe?
  - **Recommendation:** Different code regions (2307 area-router vs 5370 fold-path + a new helper); dispatch both but COMMIT sequentially (path-scoped) and rebuild once. No file-region overlap.
  - **Why:** avoids a merge clash on the shared file.

## Dependency graph
```
Step 1 (GF-B.2 matcher) ── council → build → Gate A+parity+live ── SESSION-START
  ├─ Step 2 (testimonial data + populator) → reseed-verify → live
  ├─ Step 3 (IN-E gate-widen) ── council → build → live      } QA Gate (1-3 live)
  ├─ Step 4 (H-C1 per-slot max-width)  ┐ parallel build,
  └─ Step 5 (IN-B var() resolve)        ┘ sequential commits → QA Gate (4-5 live) → flip ledger → /handoff
```

## Living-docs updates on completion
- `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` — flip testimonial/IN-E/H-C1/IN-B + GF-B.2 to VERIFIED with hashes; DROP SP-C (not-a-defect).
- `.claude/decisions.md` — D224: the 5 code-grounded fixes + the "spec built_status was stale; verify code not labels" lesson.
- `.claude/parking.md` — park the OUT-of-scope extraction maps (SP-D.1 star-size, BR-B imageId, FP-P full-width) if not done.
