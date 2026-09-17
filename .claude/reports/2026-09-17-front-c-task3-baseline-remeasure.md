# Classless recognition — Front C Task 3 baseline re-measurement (Eye Care Birmingham draft)

Spec 44 (`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`), FR-44-1 + §7. Produced by
`plugins/sgs-blocks/scripts/recogniser/measure-classless-baseline.py`, run 2026-09-17 after
Task 1 (real human-approval split) + Task 2 (match-diversity floor) landed and
`block_render_repeaters` held real seeded data (D1089) — replaces D1088's void "35/0"
figure, which was measured against an empty seeder table.

**39 real `<sc-for>` groups found in the draft (not 35 — D1088's own count, worth noting
as a discrepancy rather than silently overwritten; both are honest counts from different
sessions' code, neither hand-typed).**

- Auto-completed: **0**
- Fell to review: **2** — see `operator-review.html`
- No match: **37** (left on the existing conversion path, unchanged)

## Fell to review (FR-44-1)

| Boundary | Candidate | Stage | Quality | Why it did not clear FR-44-1 |
|---|---|---|---|---|
| `eye-care-scfor-09` | `sgs/trustpilot-reviews` | A | partial | (a) leaf match is partial, not exact; (a) Step 0 left 14 candidates, not one; (a) matched window is a merged-shape hypothesis (render.php holds more than one repeater); (b) first occurrence of (sgs/trustpilot-reviews, render-repeater) for client 'eye-care-ward-end' — forced to review once; render.php holds more than one repeater; the matched window is a per-item hypothesis (role_order carries no repeater index); PARTIAL: unmatched markers on both sides are recorded — does not satisfy FR-44-1(a) |
| `eye-care-scfor-18` | `sgs/trustpilot-reviews` | A | partial | (a) leaf match is partial, not exact; (a) Step 0 left 14 candidates, not one; (b) first occurrence of (sgs/trustpilot-reviews, render-repeater) for client 'eye-care-ward-end' — forced to review once; PARTIAL: unmatched markers on both sides are recorded — does not satisfy FR-44-1(a) |
