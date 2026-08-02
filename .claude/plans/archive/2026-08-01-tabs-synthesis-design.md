---
doc_type: plan
project: small-giants-wp
created: 2026-08-01
track: Track 1 — cloning pipeline
status: REJECTED — tombstone only, do not resurrect without new measurement
spec: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §3.B B3 / §13.3 FR-31-2.6 / FR-31-5.3
---

# Tabs synthesis (P5) — REJECTED, tombstone

**What this was.** A design (P5.1–P5.3) to make a draft tabbed panel — N trigger buttons + 1 visible
panel — clone into N `sgs/tab` blocks, by dissolving G3-rejected wrappers, correcting a mis-seeded
`sgs/tab.label` row, and synthesising a control↔content pairing for blocks whose closed child set
names a block the draft cannot contain one-per-instance.

**Why it was rejected (2026-08-01, `/adversarial-council`, 6 personas).** The P5.3 synthesis
signal — "parent has a closed `accepts_allowed_blocks` of exactly one slug, that child declares a
`primary_content_attr` of role `text-content`, and the draft has more controls than content
regions" — was measured, not assumed, to be a carve-out: it fires **correctly on 1 block** (tabs)
and **falsely on 4**, including `sgs/feature-grid`, which converts perfectly today without it. A
signal that requires exclusion rules to avoid its own false positives is not the universal
mechanism R-31-9 requires.

**What survived, built separately.** Two of the four measured blockers this design diagnosed were
real and are now addressed by other means:
- The G3-dissolve idea (closes B1) was separately measured this session and found to recover ZERO
  content on the real 4 G3 failures — also dropped, see D441.
- The `sgs/tab.label` mis-seed (B3) — `emit_shape='child'` + a phantom `derived_selector` — is
  recorded as ONE bad DB row, not a rule problem (D441); 9 sibling blocks correctly resolve
  `nested`.
- The relational L2 qualifier (D439/D441, `converter/services/l2_qualify.py`) is the surviving
  general mechanism for "is this child a fake wrapper" — parent-triggered, not per-element.

**Do not re-propose the synthesis signal (P5.3) without new measurement** against the false-positive
set this council found. Full superseded content: git history of this file at commit prior to
2026-08-01's tombstone edit.
