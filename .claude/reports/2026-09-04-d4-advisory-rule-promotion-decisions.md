---
doc_type: report
title: D4 — advisory inspector-scan rule promotion decisions
date: 2026-09-04
governs: .claude/plans/2026-08-25-road-to-uniform-then-spec-39.md (D4)
---

# D4 — per-rule promote-to-gating vs stay-advisory-forever decisions

23 `inspector-scan` rules sat `mode: "advisory"` with 0 carrying a `promotionCondition`. D4
asked for an explicit decision on each: promote to gating with a ratchet, or record why it
stays advisory. Made 2026-09-04, evidence-based against `rules.json`'s own recorded history
per rule (introduction date, measured finding counts, documented false-positive
investigation) rather than a blanket call.

**Promotion bar applied** (the project's own stated convention, E6 point 9): a rule may
promote once it has gone clean on a run that is NOT the run that introduced or last-closed
it — i.e. it has survived at least one full cycle of unrelated concurrent commits without
regressing. This session doubles as that cycle-check for anything closed earlier this week.

## Promoted to `gate` (8), all live-verified at 0 flagged/0 baselined after the flip

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` → exit 0, `gate rules: 15 ·
gating findings: 0` after promotion (was 7 gate rules before).

| Rule | Why it clears the bar |
|---|---|
| `01-tab-group` | Backlog cleared 2026-09-03 (D933, 57→0); re-verified clean today across an intervening cycle with no regression. |
| `20-pattern-template-lock` | Stable at 0 since first measured 2026-08-03 — over 4 weeks, many intervening commits. |
| `07-preset-only-shadow` | Ported from an already-informational rule, independently cross-checked via a standalone Babel walk at introduction (2026-08-05). |
| `22-placement-rule-surfaces` | Introduced 2026-08-09, ~3.5 weeks stable at 0 across all 8 declared surfaces. |
| `26-responsive-duplicate` | Introduced 2026-08-10, ~3.5 weeks stable at 0; scope gap closed with matcher-level (not name-inferred) exclusions. |
| `30-raw-box-control` | Introduced 2026-08-18, ~2.5 weeks stable; population corrected 16→4 at introduction by walking the real ancestor chain, not a naive grep. |
| `29-duplicate-visible-label` | Introduced 2026-08-18, ~2.5 weeks stable; both guarded mechanisms verified against real component source. |
| `36-box-control-presets-missing` | C16 (the rollout this rule tracks) confirmed FULLY CLOSED this session — 93/93 `ResponsiveBoxControl` mounts already carry `presets`. Nothing left to measure. |

## Stays advisory — real, non-zero backlog (not a promotion question yet)

| Rule | Findings | Why |
|---|---|---|
| `31-golden-colour-control` | 203 flagged | Active rollout tracked separately as C1/D3 — do not promote or re-scope from here; scope C1 from the scanner, per the plan doc's own D3 note. |
| `34-declared-attr-unrendered` | 1 flagged | Single residual finding needs triage (real gap vs the documented static-analysis blind spot) before this can gate — promoting now would fail the build on an untriaged case. |

## Stays advisory — held pending another in-flight change (do not touch until it lands)

| Rule | Why |
|---|---|
| `35-pinned-panel-position` | A parallel background build this session (C14/C4, the panel/control ORDER AST-walk gate) extends or supersedes this exact rule. Deciding its promotion status now would be deciding against a moving target — defer to that build's outcome. |

## Stays advisory — too new to have cleared a real cycle (< 2 weeks old)

| Rule | Introduced | Note |
|---|---|---|
| `37-media-no-handroll` | 2026-08-31 | Currently 0, but its own history shows a MUCH larger real backlog existed at introduction (105 flagged) that has since been worked down to 0 very recently — needs more cycles to prove the 0 is durable, not a snapshot. |
| `38-media-attr-parity` | 2026-09-01 | < 1 week old. |
| `39-media-control-coverage` | 2026-09-01 | < 1 week old. |
| `40-media-svg-sanitised` | 2026-09-01 | < 1 week old; also security-relevant (SVG sanitisation) — extra caution before a security-adjacent rule gates the build on a single week's evidence. |
| `roster-drift` | 2026-08-03 (mechanism), reason text explicitly still says "prove clean across a few real runs before promoting" | Its own recorded reason has never been updated to claim that bar is met — respecting what it says over what the current 0-count alone would suggest. |
| `parse-error` | First run only | Reason text explicitly says "New mechanism, first run. Prove clean across a few real runs before promoting to gate" — literally not met yet. |

## Stays advisory — deliberately, on the rule's own evidence (not just "too new")

| Rule | Why |
|---|---|
| `23-content-width-needs-inner-band` | Its own recorded history shows a wrong self-prediction at introduction (predicted 1 finding, measured 3) — a rule that has already been wrong once about its own population needs more confidence-building before it can fail a build. |
| `33-ineffective-typography-selector` | Guards a subtle third-layer defect (declared / rendered / *consumed*) that no other gate can see — the subtlety of what it's checking argues for more run history before trusting it to gate, even though it introduced clean. |
| `28-fix-durability` | Exists specifically to catch regressions where an earlier fix gets silently undone by an *unrelated* commit. By its own premise it needs to survive more unrelated churn before it can be trusted as a gate — gating it on day-16 evidence partially defeats the point of what it's built to prove. |
| `18-decorative-image-aria` | Closed to 0 THIS session (C7, commit `47fd0079c`). Per the project's own bar, do not promote on the run that closes it — wait for the next cycle. |
| `03-dense-panel-candidate` | Closed to 0 THIS session (C6, commit `497261de0`). Same reasoning as above. |
| `21-render-without-control` | Closed 2026-09-03 (D933) — one cycle old as of today; borderline, held one more cycle out of caution rather than bundled with the 8 promoted above. |

## Net result

Gate rules: 7 → 15. Advisory rules: 23 → 15 (8 promoted out). Every held rule has a named,
evidenced reason — none is advisory by default or by omission. Revisit the "too new" and
"closed this session" groups in ~1-2 weeks; they're the most likely near-term promotions.
