---
doc_type: adversarial-council-report
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild
gate: Gate 1 (architecture sign-off)
date: 2026-07-18
artefact: .claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md
panel: 6 personas (Cynic, Competitor, Spec-Lawyer, Ship-PM, Support Realist, WP-Platform Realist), parallel + blind
verdict: GO — CONDITIONAL (direction endorsed; do NOT lock/start P2 until the pre-conditions below clear)
---

# Gate 1 Adversarial Council — P1 Architecture Decision

## Convergent headline

All six personas endorsed the **direction** (BUILD lean, cascade-default + Advanced-override,
reject the flat→object retrofit) — the Ship-PM graded the architecture reasoning **A-**. But every
persona graded the artefact **C / C+**, converging on one structural verdict: **the doc got the
decision right and then over-claimed it — it ships on foundations that were never measured, never
live-verified, and (for the flat flags) never actually specified.**

Per-persona grades: Cynic **C** · Competitor **C+** · Spec-Lawyer **C** · Ship-PM **A- arch / C+ ship** · Support Realist **C+** · WP-Platform Realist **C+**.

## Convergence map (independent hits — priority = number of blind voices)

| # | Finding | Voices | Fix | When |
|---|---|---|---|---|
| C1 | **The 4 header modes were never live-verified** — the whole model is built on top of `headerSticky/Transparent/Shrink/contrastSafe` that no Playwright pass ever confirmed render correctly. | **5** (Competitor, Cynic, Support, WP-Platform, Ship-PM) | One live-DOM pass on both sites (~15-20 min). Move it BEFORE P2, not the P3-close G2 gate. | **Pre-Gate-1** |
| C2 | **BUILD verdict rests on an unmeasured fork-cost** (doc admits it, §5.2). Build-cost also never measured — "cheaper of two options, neither has a number." | **4** (Competitor, Cynic, WP-Platform, Ship-PM) | Time-boxed spike: register ONE flag → mobile override end-to-end (BUILD path) + fork ONE Kadence nav attr onto SGS-BEM (FORK path); measure both. | **Pre-lock** |
| C3 | **"Sibling-attr" is named, not specified — and has a real technical flaw.** A flat boolean sibling (`headerStickyMobile:false`) CANNOT distinguish "unset" from "off on mobile", so cascade is *impossible* for the booleans without a tri-state enum (`inherit\|true\|false`). `contrastSafe` (enum) hits D291 coercion too. The cascade *algorithm* (CSS-cascade vs render-time resolution) is also undefined and they're not equivalent for a toggle. | **3** (Spec-Lawyer definitive, Cynic, Support) | Spec each of the 4 flags' sibling type/default/sentinel; cite the live precedent `site-header/block.json:52-72`; state the render-time inheritance algorithm per attr type. | **Pre-P2** |
| C4 | **Cap the "Advanced" override list + close the `contrastSafe` invisible-text footgun by design** (transparent+shrink+contrastSafe-off = white-on-white nav). No decision authority named for "where CRO justifies". | **3** (Support, Spec-Lawyer, Cynic) | Lock the exact override list now (likely ONLY `headerSticky` gets a mobile override); make `contrastSafe` mandatory-on whenever transparent is on; add an allowlist lint. | **Pre-P2** |
| C5 | **No core-drift tracking for a bespoke nav that "replaces core/navigation"; P3 retrofit onto 5 LIVE blocks has no canary/rollback plan.** WP 7.1 due Aug 2026. | **3** (Cynic, WP-Platform, +Ship-PM) | Decision-record line: additive-only-with-inherit-default (live instances render byte-identical, zero re-clone); P3 = canary sandybrown→palestine-lives + before/after live-DOM diff; named per-WP-release regression smoke-suite. | **Pre-P3** |
| C6 | **Stall trap** — the reward (P4 builder UI) is buried ~7 sessions deep behind the riskiest phase (P3, retrofit onto live sites). No MVP cut-line. ADHD abandonment shape. | **2** (Ship-PM strong, Cynic) | Ship a **drawer-only vertical slice FIRST** (FR-34-5, isolated, no 5-block retrofit) — proves the whole pattern end-to-end + de-risks P3 + early visible win. Add cut-line: P4 bespoke builder only if the P3 inspector fails the operator test. | **Plan restructure** |
| C7 | **"Operator simplicity" (the north-star) has no defined pass/fail test.** | **2** (Support, Ship-PM) | Define it: e.g. "a non-coder sets sticky + phone number + drawer content in <3 min without opening Advanced." | **Pre-P2** |

## Single-voice but important

- **Spec-Lawyer (the D328 answer):** the boolean-sentinel flaw is technically fatal to the mechanism *as written* — it's the sharpest finding and belongs in C3. The "extend-17 + sibling-flat" answer to D328 is only safe once the flat flags are re-typed to a tri-state string enum.
- **Competitor:** mega-menu shelved (§2) = the indus-foods B2B catalogue client is where a rival wins the renewal. And: **the moat is the clone pipeline, not the header — the header is commodity.** Stub the mega-menu data-structure decision now even if the UI ships later.
- **WP-Platform:** check WP 7.1 release notes (due within weeks — a live fact bearing on "no wait-for-core"); lean-scope opportunity to fork *only* click-mode and defer to core's (WCAG-correct) hover-mode markup, cutting the reimplementation surface.
- **Ship-PM (premise / prove-the-cause):** the doc never establishes what a non-coder *can't do today* — the blocks are live with inspector controls. The urgency of a 10-session subsystem is unproven until that current-state failure is named.
- **Ship-PM effort read:** ~10 sessions is optimistic; realistic **12-16 with ADHD tax + high stall probability at the P2→P3 wall** unless a win ships first (C6).

## GO / NO-GO

**GO on the direction, CONDITIONAL on clearing C1-C4 + C7 before P2 is scoped, and restructuring the
plan per C6.** The verdict (build-lean) is very likely correct — but the council's unanimous message is
that it must be *proven and specified*, not *believed*, before another session is spent building on it.
The good news: C1 is cheap (~20 min) and C3/C4/C7 are doc/design edits, not builds.
