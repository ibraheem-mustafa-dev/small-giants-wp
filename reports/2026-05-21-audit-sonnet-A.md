# Pipeline consistency + requirements audit — Sonnet A
**Generated:** 2026-05-21
**Auditor:** Sonnet (subagent A)

---

## Headline verdict

The pipeline documentation is broadly internally consistent across its primary sources, with a small number of well-documented divergences (stage numbering, converter path, `--converter-v2` default) where the authoritative doc is identifiable. Of the 9 requirements, 7 are at least partially covered; requirements 3 (container grouping logic) and 8 (optional new-block creation) are partial — the architecture is right but the implementation lags the spec. The biggest single risk is that **the pipeline is only meaningfully tested on one client (Mama's Munches)** and even that client has not yet passed the ≤1% pixel-diff gate.

---

## Requirements coverage matrix

| # | Requirement | Verdict | Evidence (file:line or doc section) | Notes |
|---|-------------|---------|-------------------------------------|-------|
| 1 | Scan a full draft HTML page — read mockup HTML end to end | **COVERED** | `orchestrator.py:1079-1096` reads full mockup HTML via BeautifulSoup; Stage 1 boundary detection walks all top-level `<section>`, `<header>`, `<footer>`, significant `<main>` children (SKILL.md Stage 1 section; flow-doc Stage 1 block) | Full-page read is live. Multi-section loop at `orchestrator.py:981` handles all boundaries. |
| 2 | Clone to 99% visual accuracy — ≤1% pixel-diff per section at 3 viewports | **PARTIAL** | Spec 16 §FR7 + closure-gate definition (spec16:14-28); Stage 8 in flow-doc (line 621); `scripts/pixel-diff.py` (tooling-map 2026-05-15 row) | Gate is defined and tooling exists. **Not yet passing** — flow-doc Stage 8: "pass gate currently failing for Mama's" (line 624). Spec 16 phases 3-6 are all marked ⏳. The section-by-section (not full-page) closure rule is correctly captured (Spec 16 §closure_gate_definition_v0_3). |
| 3 | Group class sections into `sgs/container` — unless header/footer/hero | **PARTIAL** | Spec 16 §R1 (lines 82-87); flow-doc Stage 0.8 + Stage 6 (lines 214-248, 466-475); orchestrator.py:1066-1135 cv2 branch | Container-at-top-level rule (R1) is specified and wired in the cv2 path. **The header/footer special-casing is only partially in place** — Stage 6 "Spec 17 pattern target extension" (flow-doc lines 466-475) says the converter should emit `wp:pattern` references for matching framework headers/footers, but this is explicitly noted as "not yet implemented" (Spec 16 §11). |
| 4 | Match div classes to equivalent blocks — except the section root element | **COVERED** | Spec 16 §R2 (atomic-tag precedence), §R3 (slot-claim precedence), §FR1 (block-root slot harvest); `converter_v2/convert.py` (tooling-map 2026-05-15 row, ~1900 lines) | The walker correctly treats the top-level SGS-BEM class as the block-root boundary and maps child elements to slots. R2 ensures `<img class="sgs-X__image">` → `core/image`, not a container wrapper. |
| 5 | Recognise hierarchy for parent and child blocks — nested DOM → nested SGS block tree | **COVERED** | Spec 16 §FR1-§FR3; flow-doc Stage 4 (line 352-391); `convert.py` recursion with `is_top_level` flag and pass-through wrapper rule (Spec 16 §FR3) | The DOM walker recurses through the subtree. Pass-through wrappers (FR3) return concatenated child markup, preserving hierarchy. Recursion guard at `recogniser/recursion-guard.py` (SKILL.md tool-bindings, max_depth 12). |
| 6 | Find and translate attribute slot names — mockup class → SGS block attribute slot | **COVERED** | `sgs-framework.db:slot_synonyms` + `block_attributes.canonical_slot` (Spec 15 §3.3-§3.4, Spec 16 §9.4); `db_lookup.py:attr_name_for_slot_or_alias()` (tooling-map 2026-05-15 row); Stage 3 slot-list (flow-doc lines 328-345) | Slot synonym table + canonical_slot DB column are populated by `/sgs-update`. The `attr_name_for_slot_or_alias` function resolves aliases at runtime. Coverage: 1406 block_attributes rows in DB (SKILL.md Rule 11 / hard-gate). |
| 7 | Extract and move over content of slots — text, image src, link href | **PARTIAL** | Spec 16 §FR1 (slot harvest), §FR2 (atomic-tag emission), §FR5 (media-map resolution); flow-doc Stage 4 (line 374-391); orchestrator.py:1127-1135 | Text and image extraction are wired. Media-map for image src substitution is live (Stage 4, `<client>-media-map.json`). **Coverage is incomplete** — flow-doc Stage 4 notes "42% coverage for hero; partial for atomic blocks." Link href extraction through `dynamic_link` modifier extractor is wired but soft-fails. Array-typed attrs (e.g. `packSizes`) noted as needing "special-case extractors" (Spec 16 §FR1). |
| 8 | (Optional) Recognise missing block → scaffold new one, OR detect attribute extension | **PARTIAL** | Stage 9b in flow-doc (lines 684-706); `bucket-c-classifier.py` + `atomic-block-scaffold.py` (flow-doc lines 688-696); `attribute_gap_candidates` table (Spec 16 §FR6 Destination 3) | Scaffolding fires for unmatched sections. Attribute gap candidate writes are wired (Stage 9, flow-doc lines 639-660). **The link from gap-candidate to a concrete attribute-extension proposal is not automated** — operator must review `attribute_gap_candidates` and manually add to `block.json`. |
| 9 | (Minimum) Report what was not converted, with diagnostic info | **COVERED** | Stage 9 flow-doc (lines 630-678); `leftover-bucket-router.py`, `gap-review-report.py`, `operator-review.html` (flow-doc lines 633-678); SKILL.md Stage 9; `recognition_log` table (recognition-log.md) | Five-bucket leftover classifier is live. `gap-review.md` + `operator-review.html` generated per run. Binding rule (blub.db row 254): read `leftover-buckets.json` before conjecturing — shows operator-accessible diagnostic data exists. |

---

## Inconsistencies found

**1. Stage count and naming — SKILL.md vs flow-doc vs Spec 15**

- SKILL.md (line 27) names **9 stages**: BOUNDARY → MATCH → SLOT-LIST → EXTRACT → HARVEST → CLASSIFY → COMPOSE → SERIALISE → REPORT.
- The flow-doc (line 901) counts **"10 + 4 tails"**: stages 0, 0.1, 0.5, 0.7, 0.8, 1, 2, 3, 4, 4.5, 5, 6, 7, 7b, 8, 9, 9b plus DEPLOY/PARITY/REGISTER/UPDATE tails.
- Spec 15 pre-flight check (SKILL.md "Pre-flight checks" section) and `references/pipeline-stages.md` both enumerate exactly 9 numbered stages (1-9) matching the original spec.
- The orchestrator docstring (orchestrator.py:1-27) says "9-stage Draft-to-SGS pipeline" while implementing stages 0-9b inline.

**Authority:** the flow-doc is the most recently updated and most granular source; SKILL.md references the older Spec 12 numbering. The flow-doc is authoritative on current stage count. SKILL.md's "9-stage" description refers to the core conversion loop (stages 1-9) and omits the pre-flight stages (0, 0.1, 0.5, 0.7, 0.8). Both are correct at different levels of abstraction — but could mislead a new engineer.

**2. Active recogniser path — `tools/recogniser/` vs `plugins/sgs-blocks/scripts/recogniser/`**

- SKILL.md "Tool Bindings" section lists recogniser scripts at `plugins/sgs-blocks/scripts/recogniser/` (e.g. `leftover-bucket-router.py`, `bucket-c-classifier.py`, `per-section-convention-voter.py`).
- The flow-doc (Stage 2, lines 296-310) says `recogniser/confidence-matrix.py` is "imported directly" at `orchestrator.py:514`.
- The orchestrator (line 45-53) defines `RECOGNISER_DIR = Path(__file__).resolve().parent / "recogniser"` — i.e. `plugins/sgs-blocks/scripts/recogniser/`, consistent with SKILL.md.
- Spec 15 and SKILL.md both reference `tools/recogniser-v2/` for Stage 4 legacy extract path only.

**No material inconsistency here** — `plugins/sgs-blocks/scripts/recogniser/` is the live recogniser. `tools/recogniser-v2/` is the legacy extract path (still live for non-cv2 boundaries). The split is intentional and documented.

**3. Active converter path and `--converter-v2` default**

- The flow-doc frontmatter (lines 33-41) and orchestrator comment (line 1858-1861) both confirm: `--converter-v2` is **default OFF** (`default=False`).
- Spec 16 frontmatter says "Spec 16 Phase 7 architectural shipped" and the converter is on `feat/spec-16-converter-v2-rollout` (commits 06eca194 + 19c89f0f) — implying the converter is available but the flag is required.
- The `handoff.md` (line 67) captures a binding rule: "`--converter-v2` flag required on production orchestrator runs."
- SKILL.md Rule 12 / HARD-GATE `full-pipeline-for-lift-fidelity` (line 127) shows the canonical invocation WITH `--converter-v2` as required for lift-fidelity measurement.

**Minor inconsistency:** Spec 16 Phase 3 says the flag is an addition to the orchestrator, implying it is not default-on by design. But the handoff captures it as "required for production." These are consistent in practice (always pass `--converter-v2`) but the SKILL.md canonical invocation should document this as mandatory, not optional.

**4. Stage 0.7 — LIVE but not in Spec 15 §7 stage list**

- Flow-doc (lines 192-211) explicitly flags: "Stage 0.7 isn't in Spec 15 §7 stage list — implementation drift from spec."
- Spec 16 frontmatter `captured_corrections` includes `pass-through-wrappers-lift-css-to-variation` which is the same concern.
- Spec 15 does not mention Stage 0.7 in its stage definitions.

**This is a known inconsistency, already acknowledged.** Stage 0.7 is LIVE in the orchestrator but architecturally incorrect (monolithic CSS dump rather than universal/per-instance/bespoke split). No other doc contradicts this.

**5. `tools/recogniser-v2/data/role-templates.json` — legacy or live?**

- Flow-doc Stage 4 (lines 357-364) says: "Legacy v1 seed file. As of 2026-05-17 the converter cv2 path reads `property_suffixes` directly via `db_lookup.css_property_suffixes()`... `role-templates.json` still consulted by legacy `extract.py` — drift risk persists for that path."
- SKILL.md "Tool Bindings" does not list `role-templates.json` — implies it is no longer a first-class resource.
- Spec 16 §6 (retirement table) lists `tools/recogniser-v2/extract.py`, `extract_strategies.py`, and `overrides/` for deletion but NOT `role-templates.json` — it stays per Spec 16 §6 "What stays."

**Inconsistency:** `role-templates.json` is used by the legacy extract path (which is still live for non-cv2-eligible boundaries), but is explicitly flagged as "drift risk." The cv2 path has migrated away from it. The SKILL.md not listing it suggests it is considered legacy-only but it has not been retired.

**6. Pattern-level matching — Stage 2 vs SKILL.md Hard Rule 3**

- SKILL.md Hard Rule 3 / HARD-GATE `patterns-not-blocks` (line 66-70): "Mockup classes and sections map to PATTERNS... single-block boundary proposals are rejected by the recogniser scripts before Stage 3."
- Flow-doc Stage 2 (lines 315-321) directly contradicts: "GAP: Matches at BLOCK level only — no PATTERN-level matcher consulting patterns table or block_compositions before falling through."
- For Mama's Munches: "6 of 9 sections return core/group (no match) and fall to Stage 9b autonomy fallback."

**Material inconsistency.** SKILL.md promises pattern-level routing as a HARD-GATE enforced at Stage 2; the flow-doc (a later, more accurate source) says it is a known gap. The hard-gate enforcement claim in SKILL.md does not match runtime behaviour.

**7. Router-pattern.md mentions `--resume` flag**

- `references/router-pattern.md` (line 14) says: "re-running `/sgs-clone <mockup-folder> --resume <run_id>` reads the existing artefacts and continues from the first incomplete stage."
- SKILL.md "Halt + restart" section (line 269): "No `--resume` flag (each session is a single unit, per blub.db row 224)."
- The orchestrator argument parser (lines 1850-1861 visible range) contains no `--resume` argument.

**Material inconsistency.** `router-pattern.md` documents a feature that does not exist. SKILL.md correctly captures its non-existence. `router-pattern.md` was likely written before the decision to remove `--resume` was made.

---

## Gaps / missing coverage

**Gap A — Requirement 3: Header/footer/hero not routed to framework patterns (Spec 17 extension)**
Stage 6 in the flow-doc (lines 466-475) notes that when a header/footer matches a Spec 17 framework pattern (`sgs/framework-header-*`), the converter should emit `wp:pattern` reference + Site Info bindings. This is explicitly marked "not yet implemented" (Spec 16 §11). Until this lands, headers and footers get bespoke markup rather than being routed to the reusable framework patterns, breaking the stated architectural goal.

Suggested fit: Phase 7 Spec 16 Phase 2 (block creation) → extend to pattern-level Stage 6 emission as an additional sub-task.

**Gap B — Requirement 7: Array-typed attribute extraction**
Spec 16 §FR1 mentions "Array-typed attrs (e.g. `packSizes` on product-card) use special-case extractors" but these are not listed as LIVE in the flow-doc or tooling-map. The tooling-map has no entry for array-attr handling. This affects any block whose content is a repeating data structure (product cards, team members with multiple items, FAQs).

Suggested fit: a dedicated extractor module or a generic `array_slot_extractor` callable in `converter_v2/convert.py`, populated from `block_attributes.attr_type='array'` rows.

**Gap C — Requirement 8: No automated path from attribute gap candidate to attribute addition**
The pipeline correctly writes `attribute_gap_candidates` rows. But Stage 9b's autonomy chain has only "2 of N rails laid" (flow-doc line 702). There is no automated step that proposes a `block.json` diff for the operator. The operator must inspect the DB table manually and decide what to add.

Suggested fit: a new Stage 9b sub-step that reads `attribute_gap_candidates` and emits a proposed `block.json` patch in `pipeline-state/<run>/proposed-block-attrs/` per block, ready for operator review and one-command application.

**Gap D — sgs/update not run after Phase 2A: 3 new blocks not in recogniser**
The state.md (line 7) and handoff.md (line 37) both flag that `/sgs-update` has not been run since Phase 2A shipped three new blocks (`sgs/responsive-logo`, `sgs/icon`, `sgs/timeline`). The recogniser's `sgs-framework.db` does not yet contain canonical_slot rows for these blocks. Any draft using these blocks will fall through to the autonomy fallback path until this is remediated.

Suggested fit: first task of the next session before any clone pipeline run (already the #1 priority in `handoff.md`).

---

## Items where the pipeline over-covers or has dead code

**1. Five dead DB tables in `sgs-framework.db`**
Flow-doc (lines 860-869) identifies `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, and `animations` as empty with no live writers. These tables are loaded into DB connections on every pipeline run. The `animations` table is superseded by `uimax.animations` (live). The others appear abandoned. They add schema noise without contributing to pipeline outputs.

**2. `tools/recogniser-v2/overrides/hero.py` (908 lines) — retirement gated on FR8**
Spec 16 §FR8 defines three preconditions for deletion. Precondition 1 (tests green on cv2 orchestrator wiring) and Precondition 2 (Mama's passes visual QA end-to-end) are not yet met. The file is still consulted by the legacy `extract.py` path. 908 lines of per-block hand-coded overrides for a single block that the cv2 converter now handles generically — architectural debt with a clear deletion plan.

**3. `composer_fallback.py` — removed from LIVE path but possibly reachable**
Flow-doc Stage 7 (lines 499-508) notes `composer_fallback.py:compose_atomic_pattern()` is "FALLBACK ONLY — fires when matched block is core/group or confidence == 0." But the orchestrator comment (line 1009-1020) says the composer fallback was "retired per the 2026-05-14 decision." If `composer_fallback.py` still exists on disk but the LIVE path no longer calls it, it is dead code. The flow-doc contradicts itself on this point — it calls it "FALLBACK ONLY" while the inline comment says "retired." Needs verification.

**4. `router-pattern.md` — `--resume` flag documented but not implemented**
Described above under Inconsistency 7. The reference doc specifies a feature the SKILL.md and orchestrator both explicitly say does not exist. The doc is dead specification.

---

## Notable findings outside the 9 requirements

**Finding 1 — The canary client (Mama's Munches) has not yet passed the closure gate**
The system is described as pipeline-architecture complete (Phase 6 v2 wiring done 2026-05-14), but the only real test client has never passed the ≤1% section-by-section pixel-diff gate. Spec 16 §10 lists 7 closure criteria and only item 1 (prototype clean markup) is checked. Items 2-7 are all ⏳. This means the pipeline is architecturally credible but not yet empirically validated on even a single client. The "99% accuracy" claim in the end-goal rubric is aspirational, not evidenced.

**Finding 2 — `--converter-v2` is default OFF but all binding rules say it is required**
Production quality work requires `--converter-v2`. Default OFF means any invocation without the flag runs the legacy `extract.py` path, which the flow-doc describes as "unreliable across section shapes." Any subagent that forgets the flag silently runs the worse code path. The risk is low for experienced users but high for delegated subagents who copy the older CLI invocation pattern from docs.

**Finding 3 — Stage 0.7 CSS dump is architecturally wrong but has no removal plan**
The flow-doc marks Stage 0.7 as "LIVE - working but wrong-architecture" and tracks it as architectural debt. Spec 16 captures `pass-through-wrappers-lift-css-to-variation` as a known correction. But no phase plan names Stage 0.7 refactoring as a deliverable. The correct split (universal vs per-instance vs bespoke CSS) is specified in the `feedback_cloning_preserves_intentional_bespoke_detail` lesson but has no implementation ticket.

**Finding 4 — `recognition_log` REST endpoint is a TODO**
`references/recognition-log.md` (line 43) notes: "Every action POSTs to `/sgs-blocks/v1/recognition-log/<id>/decide` (REST endpoint TODO for next session per known-issues list)." The operator-review HTML action buttons therefore cannot post decisions back. This means the four action options (promote, file-gap, park, dismiss) are visually present but functionally inert. The loop that grows the pattern library depends on this endpoint.

**Finding 5 — Phase 2A blocks (responsive-logo, icon, timeline) unregistered in sgs-framework.db**
Three new blocks shipped to main in the most recent session (2026-05-20). The `/sgs-update` sync has not been run (confirmed in state.md and handoff.md). The recogniser's `block_attributes` table does not have canonical_slot rows for these blocks, so drafts referencing them will fail recognition entirely. This is a known blocker rather than a surprise, but the gap between block creation and recogniser coverage is a recurring process weakness.

---

## Recommended actions (ordered by impact)

**1. Run `/sgs-update` immediately — before any pipeline work (5 min)**
Three new blocks (responsive-logo, icon, timeline) are on main but not in `sgs-framework.db`. Every subsequent pipeline run on a draft using those blocks will fail Stage 2 matching until this is done. Zero code changes required.

**2. Flip `--converter-v2` to default ON (or add a deprecation warning on the legacy path) — 30 min**
The binding rule already says production runs must use `--converter-v2`. Default OFF means human error (forgetting the flag) silently runs inferior code. Either flip the default in the argparse definition (`orchestrator.py:1858`) to `default=True`, or print a `DeprecationWarning` when `--converter-v2` is absent. This eliminates the most common subagent mistake identified in the memory file.

**3. Wire the pattern-level matcher at Stage 2 — effort: 2-4 hours**
SKILL.md Hard Rule 3 promises pattern-level routing; the flow-doc confirms it is a gap. 6 of 9 Mama's sections currently fall through to the autonomy chain because Stage 2 only does block-level matching. Adding a `block_compositions` table lookup before falling through to block-level matching would catch sections that map to known patterns (e.g. a `sgs-products` section → the products pattern which contains `sgs/card-grid`). This is the single highest-impact gap for improving recognition coverage.

**4. Wire the `recognition_log` REST endpoint — effort: ~1 hour**
Without it, the operator-review HTML action buttons are inert. The loop that compounds pattern-library value across clones never closes. This is a prerequisite for the pipeline's stated long-term value proposition (self-improving recogniser).

**5. Remove `--resume` from `router-pattern.md` and retire dead DB tables — effort: 30 min**
Two small but high-confusion items: `router-pattern.md` documents a non-existent flag, and 5 dead DB tables add noise to every schema inspection. Both are pure documentation/cleanup tasks with zero code risk.

---

*Audit scope: 18 source files read as listed. Items NOT independently verified in this audit: (a) actual file existence on disk for all scripts listed in tooling-map.md (only the orchestrator entry-point and key converter files were read in full); (b) whether the `composer_fallback.py` dead-code question is resolved in the actual file system; (c) the full Spec 15 stage definitions beyond line 200 (Spec 15 was read only to line 200 due to length).*
