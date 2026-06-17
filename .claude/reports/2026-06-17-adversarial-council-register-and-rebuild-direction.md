---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Adversarial-council must-fix register + locked clean-rebuild direction"
created: 2026-06-17
status: register complete; input to the new modular-rebuild design
verdict: CONDITIONAL GO on a clean MODULAR STAGE-BY-STAGE rebuild, provided Tier-1 (the ledger/oracle/gates foundation) is designed BEFORE building
panel: cynic (opus) · ship-PM (opus) · spec-lawyer (sonnet) · transpiler-correctness expert (opus) · maintenance/enforcement realist (sonnet)
---

# Adversarial-council register + rebuild direction

## 0. Bean's locked decisions (override the council where they conflict)

- **D-REBUILD — clean rebuild, NOT spot-fixes.** Mama's=100% is a *metric* for pipeline effectiveness, not the goal. The holes are systemic (sgs/container, composites with scalar/child elements, blocks with child blocks), not hero-only. The trust-bar precedent proves spot-fixes don't generalise and *regress* scores → the Ship-PM "fix-6-HIGH-first" path is OVERRULED; its evidence (spot-fixes don't translate) reinforces the rebuild.
- **D-MODULAR — per-function file architecture.** Split the converter into per-resolver files dispatched by branch logic; remake the orchestrator against the flowchart. Fresh start, not tied to flawed legacy code. (Right now orchestrator + converter_v2 are two giant scripts where functions/cheats/DB-calls get missed by humans AND subagents.)
- **D-STAGE — stage-by-stage = BUILD ORDER + per-stage universality test.** Build + test each stage is universal; don't start stage N+1 until stage N passes; if stage 4 fails, only stage 4 needs fixing. Never build on flawed lower stages.

## 1. Reconciliation — these decisions ANSWER the council, not ignore it

| Council critique | Bean's decision resolves it by |
|---|---|
| Transpiler-expert MF-A: "stage is the wrong axis — correctness is cross-stage" | Stage-by-stage is the BUILD ORDER; the **draft-derived ledger + render-oracle is the cross-stage TEST** that gates each stage's "universal" claim. Complementary. |
| Cynic: "consolidate 8 lift functions in a 6,379-line file is where the treadmill restarts" | D-MODULAR: per-resolver files behind one dispatch table — no giant-file consolidation; each resolver independently testable. |
| Realist M1–M5: gates unwired / unfindable in giant scripts | D-MODULAR makes gates wirable + cheats visible; gates built+armed as prerequisites (Tier 1 MF-5). |
| Ship-PM: "6-HIGH-first ships faster" | OVERRULED — but its evidence (spot-fixes regress, trust-bar precedent) is the rebuild's justification. Mama's is the metric, not the deliverable. |
| Recurring: "subagents miss functions/cheats/DB-calls" (happened this session) | D-MODULAR: small single-purpose files are auditable; the flowchart is the build's structural map. |

## 2. Convergence-weighted must-fix register (revised for the modular rebuild)

Convergence (≥2 personas independently flagged) marked **[×N]**. Each is now framed as a *design requirement of the new build*, not a patch to the legacy code.

### TIER 1 — FATAL / load-bearing — design these in BEFORE building

- **MF-1 — Ledger input must be DRAFT-derived [×3: transpiler MF-C, spec-lawyer MF-C, cynic].** The CSS Accounting Ledger's `declare_input` set = the draft's parsed `(selector, property, value)` stream captured at Stage 0.7 **before any routing**, NOT what the converter recognised / the `property_suffixes` table. Then `UNACCOUNTED = draft_decls − (transferred ∪ excluded-with-reason ∪ gap)`. This is what makes the ~15 no-suffix-row classes (background-image, filter, opacity, transform, object-fit, pseudo-elements, font shorthand) surface as UNACCOUNTED→hard-fail instead of vanishing. *Without this, "no silent drops" is theatre.* THE killer fix.
- **MF-2 — TRANSFERRED → split WRITTEN vs LANDED [×2: transpiler MF-B, spec-lawyer SF/MF-3].** WRITTEN = an attr was emitted (progress signal only, never a gate). LANDED = live computed-style on a **non-default** fixture equals the draft (the only "done"). A WRITTEN-but-not-LANDED count >0 is a hard fail at the same severity as UNACCOUNTED — this catches wrong-layer transfer (the max-width→contentWidth bug) in the ledger, not in Bean's eye.
- **MF-3 — Differential render-oracle + metamorphic relations [transpiler MF-E, fatal-grade].** Gate: render the **draft HTML+CSS** and render the **cloned blocks**, pixel-diff the two renders (the draft is its own exact, non-circular oracle) at 375/768/1440 per section. Plus metamorphic relations in the conformance suite: (a) permuting source-order of non-conflicting rules → identical output; (b) renaming a BEM class to a `slots.aliases` synonym → identical output (tests name-free routing directly); (c) scaling every px by k → every transferred value scales by k (catches unit/parse drift).
- **MF-4 — EXCLUDED is a closed, audited set [transpiler MF-D, fatal-grade].** `input = transferred + excluded + gap` is gameable by routing everything to EXCLUDED. Make EXCLUDED a DB-backed `excluded_properties(css_property, reason, decided_by, date)` table; an 8th anti-cheat gate fails the build on any in-code exclusion literal + on any growth without a migration+reason. Distinguish "EXCLUDED because WP-native handles it" (legit) from "nowhere to put it" (=GAP wearing a mask). Excluded-from-lift ≠ excluded-from-clone (must still D2-passthrough for fidelity, e.g. object-fit).
- **MF-5 — Gates + matrix + ledger EXIST and are WIRED as PREREQUISITES, before any converter code [×3: realist M1–M5, cynic MUST-FIX 4, spec-lawyer].** Verified-absent today: `check-converter-cheats.py` (doesn't exist), `generate-coverage-matrix.py` (doesn't exist), `pipeline-stage-gate.py` (a ghost referenced everywhere), no CI/pre-commit. `check_no_mirror.py` exists but runs `--report` (exit 0). Required: build all three; wire `check_no_mirror.py --enforce` + `check-converter-cheats.py --check` into `package.json prebuild`; add a `PreToolUse` git-commit hook in `.claude/settings.json` (closes the commit-without-build bypass); a pipeline-close ledger check that fails on UNACCOUNTED>0. Plain-English failure messages for a non-coder QC owner.
- **MF-6 — The ledger/oracle is the BUILD SPINE and the per-stage universality test [reconciles D-STAGE + transpiler MF-A].** A stage is "done" only when, for the declaration classes it owns, the **end-to-end ledger** shows zero UNACCOUNTED AND zero WRITTEN-not-LANDED on a **multi-shape fixture set** (not an in-stage conformance suite, not page 8 alone). Stage N+1 does not start until then.

### TIER 2 — HIGH correctness gaps (each needs a gate + a completion goal; most auto-surface once MF-1 lands)

- **No-suffix-row property class** (background-image/-size/-position, filter, mix-blend-mode, opacity, overflow, position/inset/z-index, transform, object-fit, font shorthand) — surfaces as UNACCOUNTED under MF-1; each must seed a row OR be EXCLUDED-with-reason. The measurement-vs-eye rule exists *because* a background-image gradient silently overrode a colour — seed these explicitly.
- **Pseudo-elements** (`::before`/`::after`) — mis-parsed as a media separator; never reach any lift. New parser must collect pseudo-element CSS.
- **Broad-except fail-silent sites** (M3-S11 HIGH: breakpoint DB fail drops ALL responsive CSS; M3-G1K: gap-register write fail) — new code fails-CLOSED on any ledger/DB path; a swallowed declaration = UNACCOUNTED, not a stderr line.
- **M2-G9 (HIGH) stale `has_inner_blocks`** — derive at convert-time from the block's save.js/save-marker (or assert agreement + fail loud), not a cached column; a pre-flight DB-consistency gate.
- **M2-G2/G13 (HIGH) scalar-media `<video>`/caption swallow** — no `continue` that drops content; route to gap/ledger.
- **M2-G5 exhaustiveness** — the classification fork hard-fails on an unknown slug (assert_never); never a silent empty-content emit.
- **M3-S2 non-device-tier breakpoints** (600px etc.) — preserved as faithful passthrough OR UNACCOUNTED; never silently dropped.

### TIER 3 — Architecture / maintainability (Bean's D-MODULAR, now first-class)

- **Per-resolver files behind one dispatch table** `(block, layer, property, tier) → resolver` — one entry point + one DB-sourced routing table (NOT one function body). Each resolver is its own file with its own frozen golden + metamorphic test. Remake the orchestrator against the flowchart.
- **DB-as-code consistency suite** (name-free routing is only safe if the DATA is tested): no `(block, layer, property)` resolves to ≥2 attrs without a `block_selectors.element` disambiguator (kills MF-4-rowid bug); every `has_inner_blocks` agrees with save.js; no `variant_slots` discriminator name-collides with a CSS-liftable structural attr (kills M2-G4 false-variant).
- **Multi-shape fixture set** exercising every block-shape (incl. blocks absent from page 8 — tabs/accordion/gallery/sgs-media family) = the universality test bed. Mama's page 8 is ONE fixture, not the gate.

### TIER 4 — Negative-test corpus + idempotency (unfalsified gates are theatre)

- A **red-team fixture per HIGH gap**: a section with `::before` content, a `<video>` in a hero `__media` column, a `@media 600px` rule, a `background:url()`, a centred section with `max-width:1200px;margin:0 auto` (the wrong-layer trap).
- **Idempotency / fixed-point**: re-cloning a clone = identity (near-free round-trip oracle).

## 3. Single-voice-but-kept findings (per skill: never drop a fatal single voice)
- Transpiler MF-C (circular ledger input) — promoted to MF-1, the headline.
- Transpiler MF-D (EXCLUDED escape hatch) — MF-4.
- Ship-PM time-box concern — addressed not by 6-HIGH-first but by a per-stage milestone cadence (each stage ships a proven-universal increment).

## 4. Grades (spread shows: great diagnosis, low plan-as-written)
cynic C+ · ship-PM D+ · spec-lawyer D · transpiler C+ · realist D. The clean modular rebuild + Tier-1 foundation is the path from this spread to an A−.

## 5. GO / NO-GO
**CONDITIONAL GO** on a clean **modular, stage-by-stage** rebuild, on condition the **Tier-1 foundation (draft-derived ledger + WRITTEN/LANDED + render-oracle + closed EXCLUDED + armed gates) is DESIGNED FIRST** — it is the spine the stage-by-stage build runs on and the test that proves each stage universal. The diagnosis is the soundest this project has produced; the rebuild is the correct call; the must-fixes are what stop rebuild #6.
