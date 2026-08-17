---
doc_type: tombstone
title: Spec 35 — the CONTROL-TYPE CONTRACT — FOLDED INTO SPEC 35
status: SUPERSEDED 2026-08-17
superseded_by: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (PART O)
governs: nothing — see the successor
---

# Spec 35 control-type contract — FOLDED INTO SPEC 35, 2026-08-17

**This file no longer governs anything. Do not cite it. Do not edit it.**

Every binding clause moved into
[`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`](../specs/35-BLOCK-INSPECTOR-UX-STANDARD.md)
**PART O — THE CONTROL-TYPE CONTRACT**, with section numbering preserved: a citation of
"contract §1 field 9", "§12 THE RESPONSIVE WRAPPER FAMILY" or "§14 BORDER" resolves unchanged as
"Part O §1 field 9" and so on.

## Why it was folded (Bean-approved, 2026-08-17)

It carried `status: AUTHORITATIVE (2026-08-08)` at 143 KB with `doc_type: reference`, while living in
`.claude/plans/` — and Spec 35 deferred to it at **nine** separate line sites. An authoritative
contract that outranks its own numbered spec, from the working-material folder, is a doc-architecture
defect: `plans/` holds working material, `specs/` holds the standard. Surfaced by the 2026-08-17
completion audit (`.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md`).

## What did NOT move — and where to find it

These were point-in-time records of how the contract was reached, not rules to follow. They live in
this file's **git history** (`git log --follow -p -- .claude/plans/spec-35-control-type-contract.md`):

- the 2026-08-07 `/qc-council` verdict (findings A–I)
- the ABSORPTION MAP for the 27 end conditions + T1–T3
- the point-in-time defect register — ⚠ **it was measurably stale when audited**: it claimed five
  gates had "zero references in `package.json`", and four of the five were in fact wired
- the enforcement plan / Tier 0–4 status table

`spec-35-inspector-DONE-checklist.md` remains a tombstone pointing here; its ultimate successor is
now Spec 35 Part O.
