---
spec_id: 18
title: Structured pipeline log surfacing
status: SHIPPED 2026-05-19
shipped_in: commit 1ea586b2 (sgs-clone-orchestrator.py stage-9c + plugins/sgs-blocks/scripts/orchestrator/surface_pipeline_logs.py)
absorbs: none
absorbed_by: none
related_specs:
  - 16-DETERMINISTIC-CONVERTER-V2.md (§7 stage 9c)
  - 15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (legacy reference)
related_docs:
  - .claude/cloning-pipeline-flow.md (stage 9c)
  - .claude/architecture.md (observability layer)
  - .claude/state.md (live wiring)
  - CLAUDE.md (operator-facing entry point)
---

# Spec 18 — Structured pipeline log surfacing

## Problem

The SGS cloning pipeline emits a single high-volume trace file (`pipeline-state/<run>/trace.jsonl`, often 1000+ events per run). Operators reviewing a run had to:
1. Open the JSONL file
2. Grep / filter manually for errors, warnings, chrome-skip events, stage outcomes
3. Mentally reconcile severity from heterogeneous event shapes

The 2026-05-19 Bug B incident made this acute: cv2 was leaking `<!-- sgs-converter: CHROME SKIPPED -->` HTML comments into `block_markup`, producing WP `core/freeform` clutter on every cloned page. The leak was visible in trace events as `branch=chrome_skip` records, but no operator-facing surface advertised them. Operators only noticed the bug when WP rendered the `<p>` wrappers.

## Goal

Emit per-severity sidecar log files into each pipeline-state run directory at the end of every pipeline run. Each file is plain text, plain English, one event per line. Operators see a one-line counter in the orchestrator stdout naming each file written; the files themselves carry the detail.

## Non-goals

- Real-time streaming (trace.jsonl already serves this).
- Replacing trace.jsonl. The structured logs are a VIEW over it, not a replacement.
- Severity tagging at the `_trace()` call site. The classifier infers severity from event shape — adding a per-call `level=` parameter would force a refactor of every existing trace emitter.

## Design

### Stage 9c — surface_pipeline_logs

A new orchestrator stage runs AFTER Stage 4k (critical-fix-verification) and BEFORE the final `[orchestrator] DONE` banner. It invokes `plugins/sgs-blocks/scripts/orchestrator/surface_pipeline_logs.py:surface(run_dir)`.

The surfacer:
1. Reads `<run_dir>/trace.jsonl` (soft-fails if absent).
2. Classifies each event into one of 4 buckets via `_classify(event)`:
   - **chrome_skip** — `event["branch"] == "chrome_skip"`
   - **error** — `event["passed"] is False` OR any key starting with `error*` is present
   - **warning** — stage name contains `soft_fail`, OR `soft_failed: true`, OR `violations_count > 0`, OR `new_tokens_count > 0`
   - **info** — everything else
3. Emits per-severity files (only if the bucket has ≥ 1 entry):
   - `chrome-skipped.log` — every chrome_skip event with reason
   - `errors.log` — every error event
   - `warnings.log` — every warning event
   - `summary.log` — ALWAYS emitted; one line per stage with event/error/warning counts

   **2026-05-19 Bean review** — `chrome-skipped.log` may be merged into `summary.log` as a labelled subsection in a future iteration. Both files reading the same underlying classifier is fine; the per-file emission stays for now because operators can `tail` a specific file without grep-filtering.
4. Returns `{"status": "ok", "counts": {bucket: count}, "files_written": {filename: abspath}}`.

### Orchestrator output

```
[stage-9c] surfaced logs: chrome_skip=2 errors=0 warnings=3 -> chrome-skipped.log, warnings.log, summary.log
[orchestrator] DONE. Artefacts in <run_dir> + <so_run_dir>
```

Soft-fail wrapped in `try/except`: if the surfacer crashes (malformed trace.jsonl, disk full, permission denied), the orchestrator logs `[stage-9c] surface-logs soft-failed: <reason>` to stderr and continues. Observability MUST NEVER block pipeline completion.

### One-line summary format (per event)

`<ts> [<stage>] <kv-pairs>` — e.g.

```
2026-05-19T05:09:22.682Z [stage_1_convention_vote] boundary_id=b2 reason=<header> sgs-header belongs in WP template parts
2026-05-19T05:09:22.789Z [stage_0_5_token_lint] violations_count=3
```

Keys surfaced inline: `boundary_id`, `node_tag`, `reason`, `branch`, `violations_count`, `new_tokens_count`, `error`, `error_message`, `soft_failed`. Other event-specific fields stay in trace.jsonl.

## Implementation map

| File | Role | Shipped |
|------|------|---------|
| `plugins/sgs-blocks/scripts/orchestrator/surface_pipeline_logs.py` | The classifier + emitter | commit 1ea586b2 |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Wires Stage 9c at end of main() | commit 1ea586b2 |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` line 2967 | Chrome-skip now `return None` (no more `<!-- … -->` leak into block_markup) | commit 1ea586b2 |

## Acceptance criteria

- Every pipeline run produces a `summary.log` in its run_dir (always — even if nothing else fires).
- `errors.log`, `warnings.log`, `chrome-skipped.log` appear ONLY when their bucket has ≥ 1 entry.
- Soft-fails never block `[orchestrator] DONE`.
- `block_markup` from a clean run has ZERO `<!-- sgs-converter: CHROME SKIPPED -->` HTML comments — chrome events live in `chrome-skipped.log` instead.

## Verification

Run on the 2026-05-19 incident run (pre-fix):
- `block_markup` contained 2 chrome-skip HTML comments → 2 core/freeform blocks on page 144

Re-run after commit 1ea586b2:
- `block_markup` has 0 chrome-skip HTML comments
- `pipeline-state/<run>/chrome-skipped.log` has 2 entries (header + footer)
- `pipeline-state/<run>/summary.log` shows stage 1 with chrome_skip count

## Future extensions

- **info.log** — currently every non-classified event is "info" and dropped. Adding info.log emission is a one-line change in `surface()` but produces high-volume output. Park unless operators ask.
- **Severity tagging at call site** — adding `level="info|warn|error|critical"` to `_trace()` calls would eliminate the inference-from-shape heuristic. Larger refactor; park.
- **Telegram/n8n side channel** — pipe `errors.log` into n8n on emit so operators get push notification on critical pipeline failures. Park; not blocking.

## See also

- Spec 16 §7 stage 9c — references this spec
- `cloning-pipeline-flow.md` Stage 9c entry
- `feedback_universal_extraction_no_per_block_legacy.md` — same root philosophy (universal extraction, observable evidence)
