---
doc_type: adversarial-council-report
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild
gate: Gate 2 (builder design sign-off)
date: 2026-07-18
artefact: .claude/plans/2026-07-18-P2-builder-ux-design-gate.md (reviewed at v1; fixes folded to v3)
panel: 6 personas (Cynic, Ship-PM, Competitor, Spec-Lawyer, Support Realist, First-use+A11y), parallel + blind
verdict: GO — CONDITIONAL (direction endorsed unanimously; every convergent must-fix folded into v2/v3 before sign-off)
---

# Gate 2 Adversarial Council — P2 Builder-UX Design-Gate

## Convergent headline
All six personas endorsed the DIRECTION (inspector-as-builder, tri-state cascade, progressive
disclosure, converter co-design) — nobody dissented. But every persona graded the *artefact* C-centre:
**"right design, over-claimed readiness"** — it shipped on things asserted-not-verified, and missed the
one feature (a starter-template library) that wins non-coder deals. Same shape as the P1 Gate-1 council.

Per-persona grades: Cynic **D+** · Competitor **C** · Ship-PM **C+** · Spec-Lawyer **C** · Support **C+** ·
First-use **B‑ / C+** (simplicity / a11y).

## Convergence map (independent hits — priority = number of blind voices)

| # | Finding | Voices | Fix (folded) |
|---|---|---|---|
| 1 | **DP6 first-slice "clone a real header in" proof needs the P6 walker (unbuilt)** — the "cheap early win" secretly drags P6 forward or fakes the proof | **3** (Competitor, Ship-PM, Cynic) | Slice proves DP6 by **attribute-schema conformance**; real clone-in → the walker's phase (§9, §10) |
| 2 | **Designed for the Site Editor; verified the post editor** — device-switcher syncs via `core/editor`, likely null in the Site Editor where header/footer live | **~5** (Cynic sharpest; Ship-PM, Support, Competitor, Operator) | **Editing home moved to the CPT post editor** (v3 §2), where `core/editor` is present — risk removed by construction |
| 3 | **Reshaping 4 live flags → D328 silent coercion → sticky OFF in production** (deprecations banned) | **2** (Cynic, Spec-Lawyer) | **Explicit migration**: new attr NAMES + read-time fallback + re-clone; canary before/after check (§6c) |
| 4 | **No starter/template library** — the non-coder deal-winner; the converter is the ideal pack factory | 1 (Competitor) — biggest single gap | **Starter-pattern picker as the entry point** (§2.5); Bean-added as a named goal |
| 5 | **Cut the tri-state control from the first slice** — the 4 drawer attrs are colour/value, not on/off → build-it-twice | **3** (Ship-PM, Cynic, Spec-Lawyer) | **Cut**; slice = drawer value-controls only; tri-state → P3 (§10). Bean-confirmed |
| 6 | **Drawer-editing entry point undefined** (1 of 3 operator-test tasks) | **3** (Operator, Spec-Lawyer, Support) | "Edit menu drawer" affordance + preview-open editing state (§2.3, §5.3) |
| 7 | **Operator test weak** — author-run, un-blinded, 3 pre-easy tasks, can't run till P3 | **3** (Operator, Competitor, Ship-PM) | ≥3 blind testers + untimed Advanced-discovery probe + P4-gate statement (§8) |
| 8 | Contrast notice not computable (header can't see the hero) + no dismissal rule; tri-state microcopy undefined; the two components "compliant by intention not specification" | 2–3 each | Computable trigger + dismissal rule (§7); microcopy (§4.1); full a11y contract (§4.3) |
| 9 | **Inspector-1:1-attribute-view caps the UX** — forbids composite/preset intent controls | 1 (Competitor) | **Decoupled** — converter targets attributes; inspector may add preset controls (§2.6). Bean-confirmed |
| 10 | **Site-Info is a 2nd store; phone splits 2 homes; absent from converter map** | **3** (Cynic, Ship-PM, Support) | Site-Info added to §9 with an explicit clone target; phone flow reconciled (§2.6) |
| 11 | **on/off render mechanism contradicts Spec 32** (body-class vs scoped `#uid`) | 1 (Cynic, concrete) | Scoped `#uid` `@media` rule; body-class retired for this (§6a) |
| 12 | Hard cap fights client self-service | 1 (Competitor) | Operator pin/unpin; lint = default not ceiling (§5). Bean-confirmed |

## Single-voice but important (all folded)
- **Spec-Lawyer:** §4.2 had no API; §6 resolver named two ways + no `desktop='inherit'` guard + box-null
  shape ambiguity → all specified (§4.2, §6b, §6d).
- **First-use/A11y:** keyboard/focus/44px/live-region/`aria-describedby` contract for both components → §4.3.
- **Cynic:** `__experimental` treadmill (both components) → DP3 smoke-suite (§4.4); SSR editor-preview drift → §4.4.

## Bean's Gate-2 steers (negotiated decisions)
1. Starter-template library — **YES, named goal.**
2. Preset/composite controls — **YES, decouple.**
3. First slice — **drawer settings only; tri-state cut → P3.**
4. Simple-surface cap — **reorderable + lint-as-default.**
5. Editing home (raised by Bean, analysed by wp-sgs-developer) — **CPT admin screen, not Site Editor;
   Hybrid rejected (no native CPT↔template-part sync = parallel-system trap).**

## GO / NO-GO
**GO on the direction, CONDITIONAL on folding C1–C12 — DONE in v2/v3.** The verdict (inspector-as-builder
over the P1 model) is endorsed; the doc's over-claims + the four real landmines (Site-Editor device-sync,
D328 coercion, DP6-needs-P6-walker, Spec-32 mechanism) are resolved, and the deal-winner gap (templates)
is closed. Remaining before P3: two cheap live checks (CPT binding + device-sync confirmation) and the
final `/gap-analysis` + `/qc-inline` + Bean sign-off.
