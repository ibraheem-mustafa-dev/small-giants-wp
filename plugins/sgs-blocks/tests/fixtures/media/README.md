# Spec 49 media fixtures (contract C0)

Shared fixtures for the Spec 49 media system. Proofs and package tests read them; nobody writes a second copy. They stay open to correction until the Slice gate passes (Spec 49 §14.3); a correction changes the fixture and names the proof that forced it.

| File | Contract | Read by |
|---|---|---|
| `sizing-cases.json` | §7.2 sizing: settings, the declarations the sizing atom prints, the measured box | PS-2, PS-7, AC-3, the sizing atom's PHP and JS parity test |
| `matrix.json` | C3 selectors, §7.3 helper triggers, §7.4 paint nodes, AC-16's 12 slots | WP-2a, WP-2b, AC-6, AC-16 |
| `breakouts.json` | FR-49-12 value safety: what every emitter refuses and keeps | AC-8, the value-helper gate |
| `per-device-kinds.json` | FR-49-8, FR-49-9, §7.1: what may download at each width | PS-11, AC-4 |

`sizing-cases.json` marks each case `measured` (from the proof reports in `.claude/reports/2026-11-09-media-controls/`) or `to-prove` (PS-2 settles it). One case is open: a helper printed with nothing sizing-related set must keep a small file at its own size, and the rule that does it is not yet proven.
