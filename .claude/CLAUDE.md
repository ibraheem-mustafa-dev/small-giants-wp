# small-giants-wp — `.claude/` working area

**Authoritative project rules:** see [`../CLAUDE.md`](../CLAUDE.md). This file is the manifest for the working area.

## Canonical structure

| Slot | Path | What |
|------|------|------|
| Project rules | `../CLAUDE.md` | Hard rules, deploy commands, gotchas |
| Architecture | `architecture.md` | System design + key decisions (Part A only) |
| Dev setup | `dev-setup.md` | Build / deploy / SSH / local environment |
| Goals | `goals.md` | Active goals + exit criteria |
| Living status | `LEDGER.md` | THE one status doc (plain-English top + live status + product queue + pointers). Collapsed state.md + handoff.md + next-session-prompt.md (P4, 2026-07-17). Replace-not-append; `ledger-rotate.py` Stop hook snapshots to `memory/session-YYYY-MM-DD.md` past 24576 bytes |
| Structural defences | `STOP-CATALOGUE.md` | UNCAPPED STOP catalogue + pre-flight ritual (D101 — never drop a defence; carry-forward count-check every `/handoff`) |
| Mistakes | `mistakes.md` | Keyword-stub index — full body in blub.db + memory/feedback_*.md |
| Decisions | `decisions.md` | D-numbered architectural log, compressed; entries tagged `[INCIDENT]`/`[ROUTINE]` (P4) |
| Parking | `parking.md` | OPEN deferred work, 6 taxonomy buckets, `**Status:**` field |
| Prior sessions | `memory/session-*.md` + `memory/state-archive.md` | Full narrative + swept history (LEDGER points here) |
| Specs | `specs/` | **Canonical index = [`specs/README.md`](specs/README.md) — read that, not a cached list here (this table drifted for weeks; it omitted 31/32/33 incl. the canonical cloning spec).** Live roster verified 2026-07-15: 00 (OVERVIEW + naming-conventions — **owns SGS-BEM §3/§3.1**), 01, 02 (+ 02-REFERENCE, AUTO-GENERATED — fix the generator, never the file), 03-08, 11, 17 (header/footer/nav, **§S9**), 18, 19 (CLI commands — owns `/sgs-update`), **20** (Clone Fidelity Measurement / computed-parity, D259 — REPLACED old Spec-20 + Spec-21, both archived), 26 (global styles + per-client theming, build deferred), **27** (product/WooCommerce master; MVP-first, deferred until cloning closes), 28 (smart bulk pricing, COMPLETE), 29 (container-equivalent blocks, 3-KIND roster), 30 (WooCommerce page types, COMPLETE D220), **31 (CANONICAL cloning pipeline — absorbed Spec 22 at §13, D253; also Spec 15's successor)**, **32** (component styling/token contract), **33** (draft global-styles extractor; Part 1 complete, Part 2 = header/footer clone, NOT started) + common-wp-styling-errors (WRAPPER-CSS-ROUTING-DESIGN-GATE + WOOCOMMERCE-PAGE-TYPE-SOLUTION design-gate docs ARCHIVED 2026-07-17 to `specs/archive/`; content lives in Spec 31 §13 + Spec 30). **DEAD — never cite:** 13, 15 (→ 31 for the converter, 00 for BEM), 21, 22 (→ 31 §13). |
| Active plans | `plans/` | `/strategic-plan` + `/phase-planner` outputs |
| Strategy docs | `plans/strategy/` | Cross-cutting strategy docs |
| Archived plans | `plans/archive/` | Completed / superseded / legacy plans |
| Verify | `verify/` | Per-phase verification criteria |
| Reports | `reports/` | Generated audit / QC / lifecycle reports |
| Scratch | `scratch/` | Ephemeral working notes |
| Memory | `memory/` | Archived handoffs + consolidation receipts + per-doc archive overflow |

## Authoritative pointers

- **Canonical cloning-pipeline spec:** `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (Spec 31)
- **Converter-completion plan (ARCHIVED — historical):** `plans/archive/2026-07-04-new-engine-to-parity-delete-converter-v2.md` — EXECUTED IN FULL (D276, 2026-07-05); archived 2026-07-13. Live front = the post-programme QC session (LEDGER.md). All prior plans/designs archived to `plans/archive/` (residuals → parking `P-W3-ARCHIVE-RESIDUALS`).
- **Pipeline overview:** `cloning-pipeline-flow.md` (stage-index + cross-cutting principles); per-stage detail → `cloning-pipeline-stages.md`
- **Binding methodology rules:** `decisions.md` (search for "binding" + recent D-numbers) — DO NOT restate inline here. Spec 31 §13.1 binding rules: R-31-1 through R-31-15 (R-31-14 added 2026-05-27 per D92 — no legacy fallback hacks in FR-31-6 migrations).
- **Clone-fidelity measurement:** `specs/20-CLONE-FIDELITY-MEASUREMENT.md` (computed-parity tool + Stage 11.6 + rule 4a — the canonical rendered-fidelity signal). Old Spec 20 (log surfacing) + Spec 21 (pipeline-state artefact inventory) SUPERSEDED + archived to `memory/specs-archive/`; the input-side artefacts are debug-only, not the fidelity signal.
- **Doc-op canonical templates:** `~/.agents/skills/shared-references/doc-templates/`
- **Registry:** `docs-registry.yaml` — a plain INVENTORY of project-tracked docs. The per-entry "did it change this session" doc-walk was RETIRED 2026-06-29 (it checked modification status, not correctness). `/handoff` now updates the living docs only; doc-correctness is the on-demand `/doc-audit` (docs vs live code + DB), not a registry walk.

## Conventions

- Doc shapes per template in `~/.agents/skills/shared-references/doc-templates/`
- `/handoff` runs slug-uniqueness gate on parking.md + reconciles the living docs (registry is an inventory, not a per-entry walk — see Registry note above; doc-correctness = on-demand `/doc-audit`)
- **parking.md = parked work ONLY (Bean-locked 2026-06-02, D150):** entries are `OPEN | PARTIAL | BLOCKED | DEFERRED` only. The moment a task is `CLOSED | RESOLVED | DROPPED | SUPERSEDED`, MOVE it to `memory/parking-archive.md` (verbatim + completion date). Enforce every `/handoff`. Same archive-on-resolve discipline for `decisions.md` → `memory/decisions-archive.md` (retired/superseded/non-load-bearing) and `MEMORY.md` ≤ 24,576 bytes → `MEMORY-archive.md`. Prevents the doc-balloon (parking hit 1,400+ lines; MEMORY 34KB, silently dropping autoload rules).
- Recent decisions: read `decisions.md` head (most-recent-first; D-ceiling verified via `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`). **Live status (D-ceiling, current front, what's shipped vs open) is single-sourced to `.claude/LEDGER.md` — do NOT cache a D-summary here; it drifts (the D225 cache was 16 stale by 2026-06-23; a D254 cache was 4 stale by 2026-07-02).** STABLE (non-drifting) milestones only: cloning CSS-transfer foundation (Phase F) COMPLETE; the modular `converter/` engine is THE ONLY converter (frozen tree DELETED at D276, 2026-07-05 — SGS_NEW_ENGINE flag + fallback gone; STOP-28 satisfied by construction); Spec 30 (WooCommerce) COMPLETE (D220).
