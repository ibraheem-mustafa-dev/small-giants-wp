---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Doc-alignment audit — 12 canonical docs vs live code/DB (2026-06-14)"
created: 2026-06-14
status: AUDIT COMPLETE. Findings register for next-session doc-alignment pass (do the corrections DURING the comprehensive doc-read, grounded by this register). 3 parallel sonnet audit agents, each spot-checking load-bearing claims against live code/DB.
---

# Doc-alignment audit — findings register

3 parallel agents audited the 12 docs Bean listed. **Correct these DURING next session's mandatory comprehensive doc-read** (read + fix in one pass). Severity: high = misleads diagnosis or wrong fact; med = stale but caveated; low = cosmetic.

## ⛔ CRITICAL — Bean-decision findings (surface before fixing)

1. **Spec 01 §L277-278: `contentSize: 1200px` / `wideSize: 1400px` — but live `theme/sgs-theme/theme.json` ships `contentSize: 780px` / `wideSize: 1200px`.** THIS is the "content feels really tight unnecessarily" root cause (Bean's report). DECISION NEEDED: is 780px intentional or a forgotten change? Fix the spec to match live OR widen the theme — Bean's call. Do NOT silently change theme.json.
2. **Spec 11 button presets (Decision 22 Phase 5b "PENDING"): `class-button-presets-admin.php` does NOT exist on disk, yet `style.css` still references `var(--wp--custom--button-presets--primary--background)` etc.** If the option source was deleted without migrating to native theme.json, those vars are undefined → buttons fall back to bare CSS. LIKELY the brand-section + announcement-bar button styling breakage Bean reported. Investigate: built+deleted, or never built? Confirm the var source. Button padding: block.json defaults all padding `null`; `style.css` baseline `14px 24px` — converter emitting `0` would override the baseline (the "button padding" mismatch).

## Pervasive count drift (recurs across MANY docs — fix all occurrences)

| Claim in docs | Live DB (2026-06-14) | Docs to fix |
|---|---|---|
| `block_composition` 188/189 rows | **197 rows** | Spec 22 (FR-22-17 PASS test L563), flow.md L117, stages.md L179/L785, Spec 21 L92, Spec 29 §4 |
| container roster 28/29 (`wraps_block='sgs/container'`) | **31** (4 section / 14 layout / **13** content) | Spec 22 L540/563, flow.md L117, Spec 29 title+§4 |
| modal + mobile-nav "excluded via containerMirror:false" | both ARE in `wraps_block='sgs/container'`; `_is_container_mirror_block()` does NOT filter the flag | Spec 22 L541, flow.md L123-136 — clarify "31 carry container_kind; 29 actively mirror; the 2 excluded are still in wraps_block but skipped by a separate check" (or fix the converter to honour the flag) |
| `slots` scope='element' 92 rows | **99 rows** | Spec 22 L42/783, flow.md L140, stages.md L183/777/786 |
| `block_attributes` 2,739 | **2,935** | Spec 22 L721/783 (make it "query /sgs-db", not a PASS invariant) |
| `property_suffixes` 117 | **124** (post-D222) | CLAUDE.md DB-first section |
| class-section roster {hero, cta-section} | **{hero, cta-section, trust-bar}** (trust-bar added D123/D182) | Spec 00-naming L71/99, Spec 02 §3.1/3.2, Spec 21 L91 (which also wrongly says "2 rows") |

## Spec 22 (pipeline-core) — agent A

- FR-22-13 (uimax oracle): labelled `DESCRIBED` but note says walker never queries uimax at runtime (D224 ABSENT) → should be RETIREMENT-CANDIDATE. [med]
- FR-22-19: "RETIREMENT RATIFIED 2026-06-09 (D193)" but the `_is_container_mirror_block`/`_process_container_children` branches still exist + built_status=PARTIAL → rename "RATIFIED — CODE REMOVAL PENDING". [med]
- FR-22-5.1 cites `convert.py:4240` for widthMode:full — actual set points 4372/4477/4489. [med]
- D225 SDD run (4 converter fixes) NOT yet reflected in flow.md / stages.md ACTIVE BUILD TARGET (both `last_annotated: 2026-06-13` = D222). [med]
- `widthMode:full` band-aid at `db_lookup.py:2461` — verify if removed by D225 H-C1 commit. [med]

## Spec 29 / WRAPPER-CSS-ROUTING / Spec 21 — agent B

- **Spec 29 §1 "Method-2 pending" caveat is easy to miss vs §4's detailed hero/cta-section entries** → add an explicit `> NOTE: converter does NOT yet route to these composite blocks on a live clone; emits sgs/container + draft CSS` callout next to hero+cta-section. (Directly relevant: Bean's "2 class-section blocks not resolving spacing".) [med]
- **WRAPPER-CSS-ROUTING-DESIGN-GATE registry path wrong**: registers itself as `reports/wave2/...` but lives at `specs/WRAPPER-CSS-ROUTING-DESIGN-GATE.md` → fix docs-registry.yaml entry. [med]
- WRAPPER-CSS "Verification (once edits land)" checklist (L163-168) never ticked — confirm the impact-map edits actually landed (esp. the Spec 21 Stage-3/4 canonical_slot-is-content-fork-only note, NOT applied → finding 21-8). [med]
- **Spec 21 artefact claims likely STALE/WRONG (could mislead next-session diagnosis):**
  - `stage-7.json` — `css_router.py` has no `write_artefact(stage_n=7)`; artefact may not exist. [high]
  - `css-d1-assignments.json` — only referenced in `_retired/convert_pre_spec22.py`; current cv2 doesn't read it → mark retired. [high]
  - `stage-4i.json` / `stage-4j.json` — media-sideload + wp-blocks-validate wiring unconfirmed in `orchestrator_main.py`; 4j "silently marked skipped every run" per `wp_integration.py:70`. [high/med]
  - Spec 21 L91 `blocks.tier` says "2 class-section rows" → live 3 (incl trust-bar). [high]
- Terminology drift: OUTER/CONTENT-WIDTH/{GRID-PER-ITEM | PER-GRID-ITEM | GRID/PER-ITEM} — standardise to `OUTER / CONTENT-WIDTH / PER-GRID-ITEM` (CLAUDE.md phrasing). [low]

## Spec 02 / 01 / 11 / 00 / 20 — agent C

- **Spec 02 info-box: spec lists `link`/`iconColour`/`iconBackgroundColour`/`iconSize` — NONE exist in block.json** (real: `blockLink`/`blockLinkTarget`/`cardStyle`/`hoverEffect`). [high] (Relevant: ingredients info-box.)
- **Spec 02 testimonial-slider: spec frames `testimonials` array attr as primary ("alternatively InnerBlocks") — render.php is InnerBlocks-ONLY**; +8 live attrs (layout/sideImage/cardStyle/columns*/gridTemplateColumns…) missing from spec. [high] (Relevant: testimonial-slider double-nested container.)
- **Spec 02 cta-section + process-steps: spec says "Static save()" — both are dynamic `render.php`.** process-steps attr is `numberStyle` not `numberedStyle`. [high]
- Spec 02 §17 announcement-bar (RETIRED) still shows live markup docs + appears in the hover opt-out roster L1332 → collapse to tombstone. [low]
- Spec 20: §Design L42 says Stage 9c runs AFTER Stage 4k — live runs 9c BEFORE 4k (9c early, before the --skip-autonomy-gate return). [med]
- Spec 00-OVERVIEW: components table lists pop-ups/chatbot with no status; spec table stops at Spec 6 (missing 11/17/20-30); deploy described as SFTP not build-deploy.py. [low]

## How to use this register next session
Read each doc comprehensively (Bean's mandate); as you read, apply its findings here. High-severity + the 2 critical Bean-decisions first. The count-drift table is a single find-replace sweep. The Spec 21 artefact claims need a code-grep confirm before editing (don't trust the agent's "likely" — verify the writer exists). After the pass, re-run `/handoff` Gate 4.5 doc-walk + docscore on each edited doc.
