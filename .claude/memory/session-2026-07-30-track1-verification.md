---
doc_type: session-record
project: small-giants-wp
date: 2026-07-30
track: Track 1 (Specs 32 / 35 / 31) — verification audit + truth restoration
decision: D423
commits: 5791be12, aa45737d, fefa3c4a, 9bfce330
---

# Session record — Track 1 verification audit (2026-07-30)

**Full findings register:** `.claude/reports/2026-07-30-track1-verification-audit.md` (the
authoritative artefact — this file is narrative + the swept LEDGER content).
**Decision:** D423.

## What happened

Bean believed Track 1a–1c complete. Three parallel read-only investigators audited Specs
32/35/31; every load-bearing claim was fact-checked inline; then, at Bean's instruction, all
three specs were read END TO END and the findings reassessed.

**Almost nothing was unbuilt. What was missing was VERIFICATION.**

Reading the specs in full **retracted three findings** (recorded in the report so they are not
re-raised): the Spec 35 gate measured against the wrong bar (Part K specifies 4 rules, the script
implements 6 — Part K is MET); the Custom-CSS "anti-pattern" is a cross-spec conflict where Spec
31 FR-31-5.2 makes `sgsCustomCss` load-bearing; and two Spec 31 "gaps" were stale spec text
describing code that had since been fixed.

## The four points, as they stand

| Point | State |
|---|---|
| 1 — open the real editor | NOT STARTED (needs deploy) |
| 2 — 9 FR-32 inline breaches | CODE WRITTEN, gate-blocked, banked as `reports/2026-07-30-fr32-inline-fixes.patch` + live in the working tree |
| 3 — Spec 31 C2 proof | DONE-IN-PART: `WRITTEN-not-LANDED 2 → 0`, artefacts committed. Triage of 33 UNVERIFIED / 33 GUARD-FAIL / 393 unattributed remains |
| 4 — 140 parity gaps | NOT STARTED |

## The two things that only emerged by doing the work

1. **A gate stopped the work, correctly.** The visual-diff gate blocked the 9 inline fixes:
   they change markup, `check-markup-neutral.py` returns NOT-neutral for all 7 blocks, and no
   deploy existed to evidence them. A passing report was NOT fabricated. **This disproved the
   session's own plan — points 1 and 2 are COUPLED, not separable.**
2. **A naive gate widening manufactures false positives.** Attributing every styled descendant
   to its nearest SGS ancestor flagged 4 elements that were CORE WordPress blocks carrying WP's
   own inline supports. The correct rule: a nested core root SHADOWS its SGS ancestor. The old
   root-only scope was not purely a blind spot — it was also a false-positive guard.

## Swept from the LEDGER (Track 2 nav/drawer next-session content, still LIVE)

Preserved verbatim below because Track 1 took the front. **The authoritative detail is D419 /
D420 / D421 + `plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md` +
`reports/2026-07-30-w2a-gate2-drawer-cpt.md`** — nothing here is unique.

- **Wave 1 · `W2-i` · `W2-a` all CLOSED.** W2-a = `bd67a641`, deployed to sandybrown, GATE 2
  PASSED **on the MECHANISM, not fidelity**. Gate 2 says nothing about how the drawer LOOKS —
  still the rejected D411 design; **Bean's eye (R-31-13) not yet given** on
  `reports/visual-diff/w2a-cpt-drawer-open-390.png`. Landmark negative control: guard off → 2
  `<dialog id="sgs-nav-drawer">`, guard on → 1.
- **Canary fixtures:** `sgs_drawer` **2056** published + ACTIVE · page **2058**
  `/w2a-gate2-precpt-drawer/` = pre-CPT parity subject, keep for W2-b/W2-d.
- **TASK 1 — HOLD THE DRAWER-ARCHITECTURE DESIGN GATE (Bean-directed, D421).** Nothing decided,
  nothing built. Bean REJECTED the shared-header-row proposal; run the gate FROM his position, do
  not open by proposing a solution. The spec (FR-36-6) backs HIM. Already measured so the gate
  need not re-derive: 7 of his 8 named controls exist (only the top-row logo+close shared
  background is missing) · the ugly scrollbar is the PAGE's inert 14px gutter, not the drawer's ·
  mega panels do NOT overflow the drawer (285px in 340px). Amend FR-36-6 in the same commit.
- **TASK 2 — HEADER-ROW FIT CASCADE (design SIGNED, D420).** `site-header-row/style.css`'s
  `@container (max-width:767px)` sets `flex-basis:100%` on every child, so the row STACKS even
  when the children FIT (at 766px they need 733px of 766px). Hits desktop too — the query reads
  the ROW's width, not the viewport. Stages 1-3 CSS-only; stage 4 (JS More-menu) waits for Bean's
  eye. **Verify with a width SWEEP 1400→320px, never 3 fixed tiers — this defect lived BETWEEN
  the tiers** — plus a negative control that re-injects the rule and proves the sweep fails.
- **Then `W2-b`** (re-type `drawerRef` from DOM-id string to a drawer-POST reference with a
  picker, Spec 36 clause 3; the per-request burger registry in `class-sgs-drawer-render.php` was
  built for exactly this). Then W2-c (7 starter looks), W2-d (8 patterns drop their embedded
  drawer + `variantPreset` retires). **W2-d is the first DESTRUCTIVE step — re-run Gate 2 first.**
- **Design gates SIGNED, builds deferred, all edit `site-header/render.php`:** `W2-j` = A1-lite
  (any-tier auto-scrim + relabel "Text shadow" decorative-only; NO reshape — D402) · `W2-v` = B1
  header-offset primitive (double-correction risk audited ABSENT; preserve D391's
  zero-when-unpinned) · `W2-p` = B2 pill, after `W2-v`, pill persists at mobile.
- **Gate-2 instrument:** `extract-css-diff.js --scope 'dialog.sgs-nav-drawer' --open
  '.sgs-nav-menu__burger'` — `--open` takes the TRIGGER, not the surface; only 375px has an open
  state (burger CSS-hidden at/above `collapsePoint` 768).
- **Bean touchpoints:** roster 10, or 11 if resn's FX prove reachable — assess at W4-a teardown,
  not early · W4-a2 substitution policy before the first clone · W3-d blind-tester at Wave 3.
