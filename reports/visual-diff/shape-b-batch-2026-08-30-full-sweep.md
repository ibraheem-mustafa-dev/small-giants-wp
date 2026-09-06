# Border-roundtrip full sweep, 2026-08-30 — all 46 boxFamilies.borderRadius blocks

**This is the SUPPLEMENTARY sweep, not the canonical migration record.** The 32-block
"batch 2" Shape-B migration's own detailed record (scope, assertions, defects found +
fixed, gate history) lives at `shape-b-batch-2026-08-30.md` — this file exists only to
record the additional 14 blocks that document's own scope doesn't cover, probed in the
same session pass so one probe run served both purposes.

**Population:** all 46 blocks with `supports.sgs.boxFamilies.borderRadius` in
`block.json` (queried directly — the LEDGER's cached "44" was 2 stale). 32 belong to
`shape-b-batch-2026-08-30.md`'s own migration; the 14 below are from earlier waves
(the D876/D881 `SgsBorderControl` set — button, container, heading, icon-list,
option-picker, process-steps, product-card, quote, text, timeline, plus pricing-table)
or are correctly-excluded radius-only blocks (media, whatsapp-cta).

## Additional 14 blocks

| Block | Status | Note |
|---|---|---|
| sgs/button | PASS | |
| sgs/container | PASS | |
| sgs/heading | PASS | |
| sgs/icon-list | PASS | |
| sgs/media | SKIPPED | Radius-only migration, no borderWidth/borderStyle/borderColour declared — correctly excluded |
| sgs/option-picker | NOT RUN | 0 outermost elements found on probe page |
| sgs/pricing-table | PASS | |
| sgs/process-steps | PASS | |
| sgs/product-card | PASS | |
| sgs/quote | NOT RUN | 0 outermost elements found — needs a fixture that actually renders (flagged in the source LEDGER, confirmed still true) |
| sgs/text | PASS | |
| sgs/timeline | PASS | |
| sgs/trustpilot-reviews | PASS | *(also counted in the 32-block batch's own results — listed here for completeness of the full 46, not double-counted in either total)* |
| sgs/whatsapp-cta | SKIPPED | Radius-only migration — correctly excluded |

*(sgs/trustpilot-reviews belongs to the 32-block batch; included in that document's own
table. Listed here once more only because it was probed in the same combined run.)*

## This file's own 14 blocks

PASS 9 (button, container, heading, icon-list, pricing-table, process-steps,
product-card, text, timeline) · NOT RUN 2 (option-picker, quote) · SKIPPED 2
(media, whatsapp-cta) · trustpilot-reviews PASS, counted once in the 32-block
batch's own table, not here.

## All 46 blocks probed this session, combined

PASS 32 · FAIL 2 · NOT RUN 8 · SKIPPED 2 = 44 tallied here — plus
trustpilot-reviews's single PASS, counted once in the 32-block batch above,
brings the population to the full 46. The 2 FAILs (form-field-tiles,
form-step) are both in the 32-block batch — see `shape-b-batch-2026-08-30.md`
for the canonical record, its assertions, and the follow-up needed on those
two defects.
