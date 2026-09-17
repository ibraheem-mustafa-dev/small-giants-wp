# Classless recognition — Front C Task 3+4 re-measurement (Eye Care Birmingham draft)

Spec 44 (`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`), FR-44-1 + §7.

- Auto-completed: **0**
- Fell to review: **2** — see `operator-review.html`
- No match: **37** (left on the existing conversion path, unchanged)

## Fell to review (FR-44-1)

| Boundary | Candidate | Stage | Quality | Why it did not clear FR-44-1 |
|---|---|---|---|---|
| `eye-care-scfor-09` | `sgs/trustpilot-reviews` | A | partial | (a) leaf match is partial, not exact; (a) Step 0 left 14 candidates, not one; (a) matched window is a merged-shape hypothesis (render.php holds more than one repeater); (b) first occurrence of (sgs/trustpilot-reviews, render-repeater) for client 'eye-care-ward-end' — forced to review once; render.php holds more than one repeater; the matched window is a per-item hypothesis (role_order carries no repeater index); PARTIAL: unmatched markers on both sides are recorded — does not satisfy FR-44-1(a) |
| `eye-care-scfor-18` | `sgs/trustpilot-reviews` | A | partial | (a) leaf match is partial, not exact; (a) Step 0 left 14 candidates, not one; (b) first occurrence of (sgs/trustpilot-reviews, render-repeater) for client 'eye-care-ward-end' — forced to review once; PARTIAL: unmatched markers on both sides are recorded — does not satisfy FR-44-1(a) |

## Front C Task 4 — static-shape corroboration (informational only)

0 of the real groups on this draft carried a static-shape corroboration signal this run — every matched group's boundary either has no static content of its own (the thumbs group, confirmed by `test_derive_static_draft_roles_on_the_real_thumbs_boundary_is_empty`) or matched no candidate at all.
