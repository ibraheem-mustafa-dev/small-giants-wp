---
doc_type: test-result
spec: FR-37-26 (Spec 37 — Header/Footer Builder, Operator-simplicity test) — re-run against the FR-37-47 starter-look flow, per FR-37-47's own Done-when clause
date: 2026-09-17
tester: automated proxy arm (Claude Code, Playwright MCP on the sandybrown canary)
target: sgs/site-footer, test post 3624 ("FR-37-47 verify test", sgs_footer CPT)
verdict: PASS (for the starter-look surface itself — see scope note)
---

# FR-37-26 Operator-Simplicity Test — Re-run Against the Starter-Look Flow (FR-37-47)

## Scope note (read before the verdict)

FR-37-47's Done-when asks for the FR-37-26 proxy arm to be "re-run at least ... against this
new flow" — i.e. against the Starter Look preset control, not a full re-litigation of the
original 2026-07-26 test's three items (sticky / phone / drawer). That original test's
recorded **FAIL** (drawer content unsettable from the header editor) is a separate, still-open
finding and is NOT superseded here — it belongs to FR-37-49 (drawer post-picker), which is a
different FR, still `NOT-BUILT`. This run scores the **Starter Look control's own
operator-simplicity**, discovered live during this session's fix-verification pass.

## The test, adapted to this surface

Can a non-coder discover the Starter Look control and apply a complete, ready-made footer
layout — without opening "Advanced" or touching any jargon field — well under 3 minutes?

## Verdict: **PASS**

## What was observed (live, this session, same canary run used for the defect-fix verification)

| Step | Result | Time |
|---|---|---|
| Open the footer post in the block editor | Works via the normal "Edit" link from the CPT list | — |
| Select the locked root block | **Friction carried over from the original 2026-07-26 finding, not new to this FR**: a direct canvas click can land on a nested child block instead of the root; List View → the block's own name is the reliable path. Same class of friction already recorded against `sgs/site-header`; not re-scored here as a NEW defect. | ~10-15s |
| Find the Starter Look control | Block Inspector → **Styles** tab → **"Starter look"** panel, plain-English heading, one-line plain-English description ("Applies a starter look's layout and content to this locked block..."), no jargon. | ~5s |
| Apply a complete look | A single click on a plainly-titled button (e.g. "Footer — Multi-Column") — no modal, no confirmation step, no field to fill in. Full row content (logo, three columns, newsletter signup, copyright bar) appeared immediately. | **1 click, <1s** |
| Reconsider / switch to a different look | Clicking a different button (e.g. "Footer — Simple") re-applies cleanly; the previous choice is not "stuck". | **1 click, <1s** |
| Undo a mistake | A single Undo (toolbar button / Ctrl+Z) cleanly reverts the whole change — content AND attributes — in one step, verified in this session as part of the Defect 2 fix. | **1 click** |

**Total time from "root block selected" to "complete footer applied": under 10 seconds** — an
order of magnitude inside the 3-minute floor. Button labels are all plain English pattern
names ("Footer — Centred", "Footer — Multi-Column", "Footer — Minimal", "Footer — Simple",
"Start from Scratch — Blank Footer Shell") with zero developer terminology (no `rowSlot`, no
`sourceMode`, no raw attribute names) anywhere in the visible control.

## What this does NOT prove

- It does not re-test or reverse the original FR-37-26 drawer-content FAIL — that remains open
  under FR-37-49.
- It is the automated proxy arm only, same caveat as the 2026-07-26 run: a real blind-tester
  screen-recorded pass remains the authoritative half and is still outstanding.
- Root-block selection friction (canvas click landing on a child block) is pre-existing and
  common to every locked-root block on this CPT family, not something FR-37-47 introduced or
  is scoped to fix.

## Relation to FR-37-47's Done-when

This satisfies the clause "FR-37-26's operator-simplicity test ... is re-run at least via the
existing Claude-driven proxy arm against this new flow, result recorded pass/fail, not left
unexercised." Recorded here: **PASS** for the Starter Look control's own simplicity.
