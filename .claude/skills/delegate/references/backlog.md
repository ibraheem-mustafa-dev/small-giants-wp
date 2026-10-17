# `/delegate` — Deferred Gaps (backlog)

Entries here are B/C-grade gaps identified during gap-analysis that weren't worth fixing in-loop. Revisit when a related change lands.

## Open (from 2026-04-17 post-fix regrade)

- **2026-04-17 Gap 9 (B) — PARTIALLY CLOSED 2026-07-15:** test_route.py now covers 14 scenarios on the all-Claude v5 table (secrets→inline, offline→inline, persona_panel, cross-tier qc_review added). Still untested: pii_detected→inline, jailbreak_signal→sonnet, high_complexity→inline, budget_triggered paths. Fix: add 4 scenarios next iteration.

- **2026-04-17 Gap 10 (C):** SKILL.md at 257 lines (7 over hygiene budget of 250). Getting dense. Fix: extract Content Signals + Budget Alert Hook sections to references/ subfiles; keep one-paragraph summary in SKILL.md.

- **2026-04-17 Gap 11 (C):** Content-signal flags are accepted by `route.py` but no companion detectors ship — rules are dormant until consumers detect PII / secrets / jailbreak / complexity themselves. Fix: either (a) ship companion detector scripts at `scripts/detect-signals.py`, or (b) document detection as consumer responsibility explicitly in integration-guide.md. Choice depends on how many consumers need detection.

## Resolved (tracked for audit)

- **2026-04-17 Gaps 1-8 (original eval):** fixed in Stage 5 iter 1. Also: Opp 1 (content signals) + Opp 2 (budget alert hook) shipped; Opp 3 (per-persona chrono-aware) rejected by Bean as too narrow / routing interference risk.

## Future opportunities (not yet graded)

- **Content-signal detector companions** (medium) — activates dormant rules.
- **DispatchDescriptor dataclass library** (low) — shared typed descriptor for all 6 consumers.
