---
doc_type: tombstone
title: Spec 35 inspector DONE checklist — SUPERSEDED
status: SUPERSEDED 2026-08-08
superseded_by: .claude/plans/spec-35-control-type-contract.md
governs: nothing — see the successor
---

# ⚰ SUPERSEDED — do not use this document

The 27 end conditions + T1/T2/T3 that lived here are now governed by the
**control-type contract**: [`spec-35-control-type-contract.md`](spec-35-control-type-contract.md).

**Why the shape changed (Bean's ruling, 2026-08-07, D522).** Each of the 27 conditions described one
desired property of one control, so every enforcing rule got written against **the one component its
author had in mind** — and every defect arriving under a different component name walked straight
past it. Rule 08 matched `<TextControl type="url">`, went 40 → 0, and Spec 35 Part M recorded *"Wave 1
DONE — migrated across all raw-URL fields"*, while `sgs/button`'s `<URLInput>` and a raw URL field
injected into 67 blocks from `extensions/hover-effects.js` had never been in the gate's field of view
at all. The zero was true of what the gate could see; the doc turned it into a claim about the world.

The successor replaces that with **one fixed shape per CONTROL TYPE** — each naming its canonical
component, required props, **banned lookalikes**, correct tab and scoping axis.

**Nothing was dropped in the move.** Superseding was deliberately gated on proving that: the
successor's **ABSORPTION MAP** accounts for all 30 items as ABSORBED into a control-type contract or
CARRIED verbatim into its §CARRIED OBLIGATIONS, with zero dropped. A 4-rater `/qc-council`
(2026-08-07) caught the first draft trying to supersede while having silently lost ten of them —
including condition 17, a live WCAG 2.3.3 gate, and condition 11, the only written record of the
locked 768/1024 device tiers. Those were restored before this tombstone was written (D523 session).

Where the originals now live:

| Was | Now |
|---|---|
| Conditions 1, 4, 5, 6, 7, 8, 12, 14, 15, 18, 23, 27 | ABSORBED into contracts §1–§14 |
| Conditions 2, 3, 9, 10, 11, 13, 16, 17, 19, 20, 21, 22, 24, 25, 26 | CARRIED into §CARRIED OBLIGATIONS (CO-*) |
| T1 / T2 / T3 | CARRIED — T1 governs the live `audit-feature-parity.py` gate |

Full text of the originals: git history for this path, and `decisions.md` D522/D523.
