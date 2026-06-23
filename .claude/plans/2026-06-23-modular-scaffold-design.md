---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.4 / §12.6 step 2
created: 2026-06-23
updated: 2026-06-23
version: v3 — + 3-AUDITOR CONFORMANCE PASS (§10 binding corrections folded in)
status: APPROVED for build (vertical slice). Council + 3 conformance audits folded in (§10); Bean ratified 3 decisions (D-A/D-B/D-C). All audits = GO conditional on §10; folded.
authors: Opus rebuild-orchestrator
council: 6-persona adversarial-council 2026-06-23 (cynic / spec-lawyer / ship-PM / transpiler-correctness / cheat-red-teamer / non-coder-QC), all graded D/D+ on v1; CONDITIONAL GO → corrected here
binding_rules: R-22-1 (DB-first), R-22-9 (universal), R-22-11 (verify rendered output), R-22-13 (Bean eye co-authoritative), MF-3 (structural-position guard), MF-4 (≥2-attr ambiguity guard), MF-6 (ledger spine)
---

# Modular scaffold design v2 — vertical slice (Spec 31 §12.6 step 2)

## 0. Plain English — what we are building and why

**Problem.** The frozen converter (`orchestrator/converter_v2/convert.py`, 6,379 lines) decides "this draft CSS value → that block setting" inside ~8 overlapping lift functions plus ~13 per-block `if slug==` carve-outs. They disagree, and a cheat or a silent drop is invisible in that much code (the D229 failure mode).

**Solution shape.** Replace it with **one tiny DB-driven routing table + tiny per-resolver files**. The table is pure data: hand it `(block, layer, property, tier)`, it names exactly one resolver. Each resolver is a single-purpose file (≤~120 lines) with real tests. A cheat in a 60-line file is visible; a gate can be wired to it.

**How we build it (CHANGED from v1 after the council + Bean's gate).** NOT a horizontal stack of 16 empty stub files (the council unanimously called that the stall trap — weeks of work, zero visible change). Instead a **VERTICAL SLICE**: the orchestrator + dispatch table + **ONE** real resolver (`outer_box`), wired end-to-end through the services it needs, proving **one real CSS property (`maxWidth`) transfers AND lands** on the real rendered page — measured **draft-vs-clone**, not against the old engine. The other resolvers are built one-per-stage in step 3.

## 0.1 Bean's ratified decisions (the design-gate, 2026-06-23) — these supersede the council where they differ

- **D-A — Vertical slice, not horizontal scaffold.** Build ONE resolver end-to-end first; prove the architecture on one landed property before stamping out the rest. (Council convergent headline; Bean YES.)
- **D-B — NO shadow-mode / NO new-vs-old comparison. The old engine is not an oracle.** The ONLY correctness comparison is **draft-vs-clone** (the F3 render-oracle: render the draft section, render the clone, diff). `convert.py` is frozen and stays the LIVE engine for not-yet-rebuilt stages, but it is NEVER run alongside as a baseline and NEVER the golden source — "old and broken vs new and unproven" is a meaningless comparison. The draft is the exact non-circular oracle (Spec 31 §12.2.3). This OVERRIDES the council's shadow-mode recommendation. Goldens are captured from the draft-oracle + conservation ledger, never hand-authored, never from convert.py.
- **D-C — MF-4 fail-loud is report-only first.** Run F6 first to baseline today's ≥2-candidate ambiguities; during the slice the engine LOGS ambiguity without halting; only NEW ambiguities fail later (the proven D236 pattern). No risk of halting a live clone now.

## 1. Ground-truth corrections folded in (council fact-checked against the code, 2026-06-23)

v1 had mechanical errors the spec-lawyer + cynic caught and I verified against `db_lookup.py` / `convert.py`:

| v1 claim | Ground truth | Correction in this design |
|----------|-------------|---------------------------|
| Layers are L1/L2/L3/L4 | `_LAYER_PREFIXES` (db_lookup.py:2385) = **OUTER / CONTENT / GRID** (3); `attr_for_layer_property` takes those literals | Use **OUTER / CONTENT / GRID**. The 4th layer (grid-area) has **no DB backing** (`attr_for_area_property` does NOT exist) → it is a GAP-stub-only resolver, out of the vertical slice. |
| `property_suffixes where writer_path='typography'` | `writer_path` is **not a column** — it's `db_lookup._writer_path(css_property)`, "typography" iff `css_property ∈ _TYPOGRAPHY_CSS_SCOPE` (frozenset, db_lookup.py:1268) | Route via `db_lookup._writer_path(property) == "typography"`. |
| "services mostly wrap tested logic in db_lookup.py" | **FALSE for the value-transfer.** The lift logic (`_lift_root_supports_to_style:774`, `_lift_typography:1598`, `_lift_uniform_grid_item_css:2808`, `walk:4337`) is all in **convert.py**, which we are NOT touching. db_lookup.py only resolves attr *names*. | Services wrap db_lookup for *name* resolution only. The *value transfer* logic is **rebuilt fresh** in the resolver, validated draft-vs-clone (D-B) — NOT copied from convert.py, NOT claimed as pre-tested. |
| "F5 gates --check green" leans on a gate that "doesn't exist" (council) | **Council MOSTLY WRONG:** `f5-commit-gate.py` exists (`.claude/hooks/`) + wired in `settings.json` (CC-side, gates this session). Narrow true bit: `.githooks/pre-commit` doesn't run F5 + `core.hooksPath` isn't pointed at it → a real *terminal* commit skips F5. | Keep "F5 --check green" (the CC-side hook is real). Log the terminal-git-hook gap as a P-F5 follow-up, NOT a scaffold blocker. |

## 2. The dispatch table — the four-part key

For each draft declaration resolved for an element at a tier, the orchestrator builds the key; the table returns one resolver id.

| Key part | What | Source of truth |
|----------|------|-----------------|
| **block** | the recognised block (`sgs/hero`) | Stage 2 recognition (input for the scaffold) |
| **layer** | OUTER / CONTENT / GRID (+ grid-area, stub-only) | `services/layer_detect.py` — CSS signature + **structural position** (MF-3), never class name |
| **property** | draft CSS property | the parsed declaration |
| **tier** | base / mobile / tablet / desktop | the `@media` bucket |

**Routing function — DB-sourced, names no block (R-22-1/R-22-9).** Returns exactly one resolver id (or an explicit sink):

```
resolver_id(block, layer, property) =        # tier does NOT affect resolver choice — see §2.1
    if db_lookup._writer_path(property) == "typography"        → "typography"
    elif property in F4 excluded_properties                    → "excluded"        # not a drop; see §4
    elif layer == "OUTER"                                      → "outer_box"
    elif layer == "CONTENT"                                    → "content_band"
    elif layer == "GRID"                                       → "grid"
    elif layer == "GRID_AREA"                                  → "grid_area"      # stub-only this phase
    elif block_composition.has_inner_blocks(block) == 0
         and media_signal(property)                            → "scalar_media"
    elif block_composition.has_inner_blocks(block) == 0        → "scalar_content"
    else                                                       → "unrouted"        # FAIL LOUD, not silent gap
```

- `media_signal(property)` is a **DB lookup**, not a hand dict: `property ∈ {background-image, object-fit, aspect-ratio}` OR the node tag ∈ {img, video} — sourced from `property_suffixes.role`/the block's media slots, resolved in `services/`. (Transpiler SHOULD-FIX + cheat Q1.)
- `"unrouted"` ≠ `"gap"`: a property that *has* a known writer_path/suffix but found no attr is a **suspected routing bug** → fails, never laundered into the gap sink (cheat MF-E, transpiler Q6).
- `container_kind` GATES which resolvers are legal for a block (KIND=content has no grid) — enforced in `services/validate.py`, the named enforcement point (spec-lawyer SHOULD-FIX).

### 2.1 Tier-invariance invariant (transpiler MF-A — tested, not assumed)
The key is 4-part but routing is 3-part because **`resolver_id` is a function of the node's BASE-tier layer, computed ONCE per node and cached on `ctx`**; every tier's declarations route through that cached layer. `layer_detect` runs on the base (non-`@media`) declaration set + structural position. **Test (metamorphic):** `prop` at base and `prop` in every `@media` bucket yield the same `resolver_id`. (Closes the responsive-`display`-switch mis-route.)

### 2.2 Layer-detect precedence (transpiler MF-C — tie-break specified)
A node with `max-width:1200px; margin:0 auto; display:grid` signals both CONTENT and GRID. **Rule: a node carrying `display:grid`/`grid-template-columns` IS GRID** (the more specific, attr-bearing concern); its `max-width` routes to the grid's width attr. MF-3 already kills OUTER-vs-CONTENT on the root. `layer_detect` returns exactly one layer; the detector priority order is pinned in its file + tested.

## 3. The vertical slice — what gets BUILT this phase (D-A)

Build ONLY the path one real property needs, end-to-end:

**The slice property:** `max-width` on a section-root → OUTER layer → `maxWidth` literal (D230/D231 rule), proven to LAND on the `rt-centred-maxwidth` + a real section fixture, draft-vs-clone.

| Built this phase | File | Role |
|------------------|------|------|
| Orchestrator | `converter/orchestrator.py` | walks draft, builds keys, dispatches; matches the `walk`/`convert_page` seam signatures (drop-in target, NOT swapped live yet) |
| Dispatch table | `converter/dispatch_table.py` | DB-sourced routing function (§2); returns resolver id; every unknown key → explicit sink |
| Context | `converter/context.py` | typed `Ctx` + `Decl` dataclasses (§3.1) |
| **ONE resolver** | `converter/resolvers/outer_box.py` | OUTER box: `max-width`→`maxWidth`/`align` (D230/D231). REAL logic + real golden + real metamorphic tests |
| Services it calls | `converter/services/{layer_detect,attr_resolve,tier_suffix,value_serialise,token_snap,validate,gap_writer}.py` | only the steps `outer_box` exercises; typed signatures (§3.1) |
| GAP-stub others | `converter/resolvers/{content_band,grid,grid_area,typography,scalar_content,scalar_media}.py` | `return GAP(origin="UNIMPLEMENTED_STUB")` only — registered so the table resolves, but explicitly not-built (§3.2) |
| Coverage report | `converter/coverage_report.py` | the Bean-visible artefact (§5) |

**Deferred to step 3 stages (explicitly OUT of this phase):** `variant_detect` pre-pass (Q5), the other 6 resolvers' real logic, the grid-area DB backing.

### 3.1 Typed seams (spec-lawyer MF-D/MF-E — no prose-only interfaces)
```python
@dataclass(frozen=True)
class Decl:            # one draft declaration
    property: str; value: str; tier: str          # tier ∈ {"base","mobile","tablet","desktop"}

@dataclass
class Ctx:             # per-element context, built once
    block_slug: str; container_kind: str; has_inner_blocks: int
    variant_value: str | None; variant_attr: str | None
    node: Any; is_root: bool; base_layer: str | None     # cached by layer_detect (§2.1)
    conn: sqlite3.Connection

# service signatures (the slice's set)
def layer_detect(ctx: Ctx, base_decls: dict[str,str]) -> str          # → "OUTER"|"CONTENT"|"GRID"|"GRID_AREA"
def attr_resolve(ctx: Ctx, layer: str, property: str) -> str | None   # base attr; MF-4 ≥2 → report (D-C) then None
def tier_suffix(base_attr: str, tier: str, conn) -> str               # re-append breakpoint suffix; ALWAYS after attr_resolve
def value_serialise(attr_type: str, kind_override: str, raw: str) -> str
def token_snap(property: str, value: str, conn) -> str                # ΔE≤1/≤1px or literal; tie-break pinned
def validate(ctx: Ctx, attr: str, value: str) -> bool                 # enum_values + block_supports + KIND-legality
def gap_writer(ctx: Ctx, decl: Decl, origin: str, detail: str) -> None  # → attribute_gap_candidates
resolver(decl: Decl, ctx: Ctx) -> Write | GAP                         # every resolver's contract
```
`attr_resolve` reuses `db-consistency/resolver_bridge.enumerate_candidates(block, conn)` for the MF-4 ≥2 check — keyed on the **full (block, layer, property)** identity, NOT `(css_property, writer_path)` alone (cheat SHOULD-FIX, avoids the STOP-17 tier-blind join). Service-call order is fixed: `attr_resolve` (with MF-4) **always before** `tier_suffix` (transpiler SHOULD-FIX).

### 3.2 GAP origin enum (cheat MF-C + transpiler MF-E + spec-lawyer MF-G — the stub/real/drop distinction)
Every GAP carries `origin`: `UNIMPLEMENTED_STUB` (resolver not built yet) · `NO_DESTINATION` (real gap — add attr) · `EXCLUDED` (F4 table, +`f4_ref`) · `UNROUTED` (suspected routing bug → FAILS). The step-3 stage gate **fails** if a resolver the stage claims to have built still emits `UNIMPLEMENTED_STUB`. This makes "quietly return GAP forever" a hard failure, and an honest empty stub distinguishable from a finished engine.

## 4. The correctness gate — draft-vs-clone, not new-vs-old (D-B)

The slice is "done" only when, for `maxWidth` on the slice fixtures:
1. **Conservation (F2 ledger, the step-2 oracle):** `Σ input declarations = Σ writes + Σ gaps(by origin)`, total and disjoint, per element — nothing leaks. This is the one invariant a transfers-little scaffold CAN fully prove (transpiler MISSING — the master invariant).
2. **LANDED (F3 render-oracle, R-22-11/R-22-13):** render the DRAFT section + render the CLONE section, confirm the OUTER `max-width` computed-style matches the draft at the relevant breakpoint. WRITTEN (attr emitted) ≠ LANDED. The draft is the oracle — NOT convert.py.
3. **Metamorphic (real, on the one built resolver):** source-order permutation → identical output; BEM-rename → identical output; px-scale by k → `maxWidth` scales by k. **The 6 stub resolvers' metamorphic tests are `@pytest.mark.xfail(reason="stub")`** — never vacuously green (transpiler MF-E, cheat MF-G).

## 4.1 Anti-cheat gates the scaffold itself ships (cheat red-teamer — structural, not prompt)
- **No-slug-literal gate:** an AST/grep test FAILS if any file under `converter/resolvers/` or `converter/services/` compares a block-slug literal (`== "sgs/`, `in ("sgs/`, `.block_slug ==`). Enforces "names no block" in the bodies, not just the router (answers Q1).
- **Import-ban gate:** a test FAILS if any `converter/` file imports `convert`, `convert_page`, or any `orchestrator.converter_v2` symbol **except `db_lookup`** — closes the freeze-callback backdoor (`convert_page.py:114` calls `v3.walk`).
- **Golden-source gate (D-B):** every `tests/goldens/*` carries a `# captured: <draft-oracle> <fixture-id> <sha>` header and must reproduce when re-captured from the DRAFT oracle; hand-authored goldens are rejected.
- **Reuse-not-reinvent:** the slice wires INTO existing modules by path — `ledger/` (F2 conservation), `oracle/` (F3 capture), `cheat-gate/`, `db-consistency/resolver_bridge.py` — it does NOT rebuild parallel infra (cheat SHOULD-FIX).

## 5. Bean-visible artefacts (non-coder-QC — R-22-13 sign-off surface)
- **Coverage report** (`converter/coverage_report.py` → HTML/MD): every fixture `(block, layer, property)` row → the resolver it routed to → colour `RESOLVED / GAP-add-attr (amber) / EXCLUDED (grey) / STUB / UNROUTED (red)`. Bean signs off by reading the grid: "every row lands somewhere, no red, no silent drop."
- **Symptom→file cheatsheet** (in `README.md`): "Section spacing/width/background wrong → `outer_box.py` · Inner band width → `content_band.py` · Columns & gaps → `grid.py` · Fonts/text → `typography.py` · Quote/name/stars → `scalar_content.py` · Images/video → `scalar_media.py`."
- **What Bean SEES at slice close:** the F3 oracle screenshot pair (draft vs clone) for the slice fixture showing the OUTER `max-width` matching — one real property landed by the NEW engine, on a rendered page. (Not "16 files exist".)

## 6. File layout
```
plugins/sgs-blocks/scripts/converter/        # NEW clean modular home (converter_v2/ frozen, untouched)
├── README.md                                # architecture + routing cheatsheet + symptom→file map
├── orchestrator.py  dispatch_table.py  context.py  coverage_report.py
├── resolvers/  __init__.py (registry)  outer_box.py(REAL)  +6 stubs
├── services/   layer_detect attr_resolve tier_suffix value_serialise token_snap validate gap_writer
└── tests/  goldens/(draft-captured)  metamorphic/(real for outer_box, xfail for stubs)  test_dispatch_totality.py  test_conservation.py  test_no_slug_literal.py  test_import_ban.py
```

## 7. Acceptance (step 2 / the slice)
- F6 db-consistency run + ≥2-candidate baseline captured (D-C); fail-loud armed report-only.
- `dispatch_table` resolves every fixture-set `(block,layer,property)` to exactly one resolver/sink (totality test).
- `outer_box` transfers `maxWidth` and the F3 oracle confirms it LANDS draft-vs-clone on the slice fixtures.
- Conservation test green (no leaks); no-slug-literal + import-ban + golden-source gates green; 6 stubs `xfail`, not vacuous.
- Coverage report renders; symptom→file cheatsheet in README. convert.py byte-identical (D-MODULAR).
- Bean reviews the draft-vs-clone oracle pair + the coverage grid and signs off (R-22-13).

## 8. End-state + decommission trigger (cynic MF-C — no two-engines-forever)
`convert.py` is DELETED in the same commit the final stage swaps, defined as: 100% of the multi-shape fixture set's declarations TRANSFER-and-LAND (draft-vs-clone) with zero UNACCOUNTED / zero UNROUTED / zero CHEAT. A consistency check FAILS if both `converter/orchestrator.py` and `converter_v2/convert.py` are importable by the live pipeline after the swap commit. No trigger = no decommission = permanent tax.

## 9. Build orchestration
`/subagent-driven-development` (sonnet implementers + spec & quality reviewers per file); Opus orchestrates all shared-file writes (STOP-2); F6 baseline + the gates wired before the resolver logic; `/qc-council` before commit; deploy + F3 live-verify on the canary (page 8) draft-vs-clone; Bean sign-off. Per-stage, do NOT batch.

**STOP-16 self-verification (mandatory):** Opus (not the implementer) re-runs every gate's `--check` AND the full test suite from the project-root canonical cwd (`--import-mode=importlib`), plants a violation to prove each gate exits 1 (the FAILURE path), and inspects committed goldens for stale captures — never accepts a subagent's "green" as fact.

## 10. Pre-build conformance corrections — 3-auditor pass (2026-06-23), BINDING

Three read-only conformance audits (Spec-31 / anti-cheat-rules / end-goal), each fact-checked against the code (STOP-15/16), returned **GO on the slice conditional on these folds**. Every item below is binding on the build and amends the cited section.

**Headline-signal corrections (end-goal M1/M2/M3 — converge: LANDED, not conservation, measures the goal):**
- **A1 (amends §4/§5/§7).** **LANDED is the headline pass criterion, NOT conservation.** Conservation (§4 #1) is a FLOOR (no leaks) — it goes 100% green while transferring almost nothing (every other property → `UNIMPLEMENTED_STUB`), so it must never be read as "faithful". The coverage report (§5) legend states STUB/GAP rows are **not-yet-faithful**; only `LANDED` cell count measures progress.
- **A2 (amends §4 #2/§5).** The slice's machine-LANDED = the BUILT `oracle/verdict.py` engine run on `oracle/capture.py probe_rendered_observation` computed-style of a **deployed** page section (verified built + tested). The full pixel-diff **screenshot pair is F3-runtime = deferred** — do NOT promise it as the sign-off surface. Bean sign-off = the computed-style match verdict + one manual screenshot.
- **A3 (amends §7, Rule 5).** `outer_box` must LAND `maxWidth` on **at least one real section of canary page 8**, not only the synthetic `rt-centred-maxwidth` fixture — the proof must touch real-homepage markup (Rule 5), even at one property. Deploy + live-verify is Bean's step.

**Tier / breakpoint conformance (spec O-2 — the F-fork, most material spec gap):**
- **A4 (amends §2.1/§3.1).** `Decl.tier ∈ {base,mobile,tablet,desktop}` has NO bucket for a non-device-tier breakpoint (e.g. a `max-width` rule at `@media 600px`). The slice MUST route a non-device-tier breakpoint's value to **UNACCOUNTED/gap (`origin=NO_DESTINATION`), NEVER coerce it into a device tier** (the Family-F forbidden conflation, Spec 31 §3 F-fork + §12.7). State this at the tier-resolution seam; the `rt-media-600` fixture exercises it.

**Gate-hardening (anti-cheat GAP-1..5 + MISS-2/3 — STOP-6/14/16/19):**
- **A5 (amends §4.1, STOP-6).** EVERY gate (no-slug-literal, import-ban, golden-source, conservation) names its RUN-TRIGGER: collected by `tests/` in the prebuild suite (project-root cwd) AND added to `f5-commit-gate.py`'s gate list. A gate with no run-trigger is deleted-or-wired, never "ships".
- **A6 (amends §7, STOP-14).** Run ALL FOUR gates in report-mode against current output + baseline today's violations BEFORE arming (not just MF-4) — fail only on NEW.
- **A7 (amends §4.1 no-slug-literal, GAP-1).** The gate is **AST, not grep**: fail any `Compare`/`In` node whose operand chain touches `block_slug`/`variant_value`/`variant_attr` against a string literal or string-set (catches `.split("/")[1]=="hero"`, `_SPECIAL={"hero"}` membership). Ship a planted-carve-out positive test it must catch (STOP-16).
- **A8 (amends §4.1 golden-source, GAP-5/STOP-19).** The gate **mechanically re-captures from the F3 draft-oracle and byte-diffs** the committed golden — the `# captured:` header alone is not the test (a header is hand-typable). Reject on divergence OR missing/invalid header.
- **A9 (amends §6/§7, MISS-2, Rule 4/STOP-3).** Add `test_unrouted_fails.py`: feed a `(block,layer,property)` with a known writer_path but no attr → assert a HARD failure, not a GAP write. "UNROUTED fails" must be a tested failure-path, not a prose promise.
- **A10 (amends §4 #1, MISS-3).** The conservation test asserts **DISJOINTNESS** — each declaration in exactly one bucket, no UNROUTED→UNIMPLEMENTED_STUB re-binning — not just sum-balance (a sum balances even if a declaration is mis-binned).

**R-22-1 hardening (anti-cheat MISS-1):**
- **A11 (amends §2 `media_signal`).** The inline `{background-image, object-fit, aspect-ratio}` / `{img, video}` brace-sets are an R-22-1 smuggled-dict smell. `media_signal` is NOT exercised by the OUTER-`max-width` slice → its DB-source (a named `property_suffixes.role` / media-slot query + a "set is read from DB" test) is **pinned at the scalar stage (step 3), not faked inline now**. The slice's routing function does not depend on it.

**Spec-reconciliation + expectation framing (spec C-1/C-3/O-1/O-3/O-4 + end-goal G1–G4):**
- **A12 (reconciles §0.1 D-B with Spec 31 §12.6-step-1/§12.7).** D-B retires shadow-mode **value comparison**; it does NOT drop the spec's non-regression requirement. The non-regression baseline is the **legacy output's LEDGER/ORACLE METRICS** (its UNACCOUNTED set / CHEAT cells / render-diff deltas, already measured in Phase F) — NOT a live new-vs-old value diff. Compatible; stated explicitly.
- **A13 (amends §2, spec C-1).** `typography` and `excluded` branch BEFORE layer detection **by intent** — they are pre-layer SINKS that legitimately bypass `layer_detect` (typography is layer-agnostic; excluded never lifts). Not a §3-step-1 violation.
- **A14 (expectation lock, end-goal G1–G4).** The slice proves the **SPINE/plumbing** (dispatch + conservation + gates + one OUTER property), NOT the hard branches. Generalisation to scalar/child composites, variant grids, and ambiguous-disambiguation (`align-items`, `box-shadow`) is **explicitly deferred to per-resolver LANDED proof at each step-3 stage** — never banked from the slice (the project's history: spot-fixes don't generalise, §12.0). The `resolver(decl,ctx)->Write|GAP` contract may need extension for child-block-emitting scalar resolvers (Axis 3) — flagged as a step-3 contract-review point.
- **A15 (minor folds).** F6 slice-run includes the variant-discriminator-collision check (§12.4, spec O-1); note D1/MF-2 is deferred to its owning stage (spec O-3); §7 adds one KIND-illegality assertion (a content-KIND block rejects a grid resolver, spec O-4); mark §2.1 tier-invariance **slice-scoped/provisional**, re-validated at the grid stage against a `display`-switch fixture (end-goal M4).
