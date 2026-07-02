---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: Container/wrapper converter — full 4-branch gap analysis (the evidence base for the standardisation programme)
created: 2026-06-02
status: ANALYSIS — the durable evidence base behind Spec 22 §FR-22-21 + the 5-workstream plan (`plans/archive/2026-06-02-container-wrapper-standardisation.md`). Every gap-ID (A1-A6/B1-B4/C2-C8/D1-D3) traces to a finding here.
method: 4 parallel read-only Sonnet agents, one per code surface, each reporting file:line evidence
related:
  - .claude/plans/archive/2026-06-02-container-wrapper-standardisation.md (the build map this evidence justifies)
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §FR-22-21 (the canonical procedure)
  - .claude/decisions.md D152 (the decision) + D136 (the original 4-gap audit)
---

# Container/wrapper converter — full gap analysis

## Scope (read first — the whole point)

This is **not** a class-level or section-level fix. The class-section width bug (top-level sections
clamped to wideSize 1200, `__inner` content wrappers dropped) was the **symptom that surfaced** a
systemic failure. The actual scope is universal:

1. **Every wrapper element** in the draft HTML — any `<div>`/`<section>` that wraps content, at **any
   nesting depth**.
2. **Every `sgs/container` instance** — at any depth, not only top-level sections.
3. **Every composite block** that uses a built-in `sgs/container` as its internal wrapper — across all
   three KINDs (section / layout / content): hero, cta-section, trust-bar, modal, card-grid,
   feature-grid, info-box, product-card, and the rest of the 28-block `block_composition` roster.

Faithful transfer also covers the **absence** of a property: a draft wrapper with no `max-width` must
render full-width — the absence overrides the SGS/theme default. (Memory
`feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`.)

## The 3-layer model (canonical — Spec 22 §FR-22-21)

Every wrapper decomposes into at most three layers, each with a distinct destination:

- **OUTER box** = the wrapper's own element. `max-width`/`widthMode`, background, padding, border,
  min-height. Absent max-width → full-width; present → custom + `customWidth`, centred.
- **CONTENT-WIDTH (inner)** = the direct-descendant `__inner`/`__card-inner` wrapper. Its
  `max-width` + `margin:auto` caps and centres the content as a group; children keep their own CSS.
  (No `contentWidth` attr exists yet — gap A1.)
- **PER-GRID-ITEM** = whichever level carries `display:grid`/columns. Grid template → native grid
  attrs; uniform box CSS → `gridItem*` defaults; unique per-item CSS → the child block's own CSS.

Naming discipline: **"max width" = outer**, **"content width" = inner**. Never swap them.

---

## Branch 1 — `convert.py` (container/wrapper emission + the FR-22-4.1 fold)

**What exists:** three top-level emit paths in `walk()` — slug-None section (`2031-2039` → empty
`container_attrs` → `_process_container_children` → `_emit_section_container`), resolved-slug
(`2210-2211` → `db.emit_sgs_container_wrapping`, which hardcodes `widthMode:full`), and resolved
`sgs/container` (`2213`). The fold (`_process_container_children` `2807-2867` → `_fold_layout_into_attrs`
`2776-2804`) only fires when `fold_eligible = len(element_children) == 1` (`2830`).

| Gap | Evidence (file:line) | Plan gap-ID |
|---|---|---|
| OUTER max-width absent→full not set on slug-None path (block.json default is `default`, not `full`) | `convert.py:2031-2039`, `_emit_section_container:2870-2884` | A2 |
| OUTER max-width→`widthMode:custom`+`customWidth` never emitted (enum value has zero call sites) | `block.json:191-198`; `_match_theme_width` returns only default/wide (`975-989`) | A3 |
| CONTENT-WIDTH: `__inner` max-width dropped — `_root_lift_rules` has no max-width entry; fold calls it and discards | `_root_lift_rules:498-516`, `_fold_layout_into_attrs:2776-2804` | A1 |
| `_lift_core_block_style` HAS the max-width→widthMode logic but is **dead for container paths** (wired only to atomic blocks) | `convert.py:1034-1040` (atomic-only) | **finer gap (b) — ADD** |
| Fold `fold_eligible` sole-child gate: multi-child sections never fold `__inner` (affects ALL fold attrs, not just max-width) | `convert.py:2830` | B2 (broaden) |
| min-height dropped everywhere (not in `_root_lift_rules`, not in fold) | `_root_lift_rules:498-516` | A5 |
| PER-GRID-ITEM `gridItem*` never written by any converter path | no call site; `block.json:293-316` | A6 |
| Gap passes raw px; render wraps in `var(--wp--preset--spacing--{value})` so raw `16px`→invalid token | `render.php:150`; passthrough `convert.py:2449-2451` | A4 |
| Hardcoded `{"widthMode":"full"}` band-aid on the resolved-slug path | `db_lookup.py:2461` | A2/C1 |

Correctly transferred today: background/padding/border via `_lift_root_supports_to_style`;
`gridTemplateColumns`(+responsive) via `_collect_responsive_grid_from_css` (`2338-2416`).

---

## Branch 2 — `db_lookup.py` (container emission + per-element CSS + slot/attr resolution)

`emit_sgs_container_wrapping` (`2389-2461`) emits a fixed `{"widthMode":"full"}` and **discards the
`css` param entirely** (`2446-2461`). The real CSS→attr work lives in `convert.py`, not here.

| Gap / cheat | Evidence (file:line) | Plan gap-ID |
|---|---|---|
| No `contentWidth` mapping; `__inner` max-width never read for a container attr | `db_lookup.py:2461`; `convert.py:2776` | A1 |
| Custom-width fallback missing — non-theme max-width silently dropped (no `widthMode:custom`+`customWidth`) | `_match_theme_width:975-989` | A3 |
| `gridItem*` (6 attrs) have zero CSS-collection logic | — | A6 |
| `_CAPABILITY_PRIORITY` hardcoded Python list (no DB column) — R-22-1 violation | `db_lookup.py:660-701` | C3 |
| `_BREAKPOINT_RULES` hardcoded breakpoint→suffix map; duplicates `_GRID_DESKTOP_BP`/`_GRID_TABLET_BP` in convert.py — two breakpoint systems | `db_lookup.py:1046-1052`; `convert.py:2322-2323` | C4 |
| Permitted: `_KIND_BY_SUFFIX` is a one-time seed (DB-first at runtime) — NOT a violation | `db_lookup.py:802-864` | — |

---

## Branch 3 — orchestrator stages + the D0/D1/D2/D3 CSS router

Flow: Stage 0.7 harvest (`sgs-clone-orchestrator.py:334-544`, `css_router.py`) → D0/D1/D2/D3 classify →
Stage 4.5 D1 seed (a **no-op stub**) → Stage 4 extract (G2 merges D2 CSS into cv2).

| Gap / cheat | Evidence (file:line) | Plan gap-ID |
|---|---|---|
| **D1 sidecar written but never consumed** — `seed_d1_sidecar` returns False unconditionally; ~43 typed-attr assignments stranded per run | `convert.py:167`; `css-d1-assignments.json` (43 rows, run 190232) | B1 |
| `__inner` max-width only reaches `widthMode` in fold-eligible (sole-child) cases; multi-child → variation CSS only | `convert.py:886-928, 2830` | B2 |
| grid-template-columns on a recognised section root → D2/D3, not a native attr | `_root_lift_rules` has no grid entry | B3 |
| D3 gap-candidates **dual-write** to production CSS (debug surface as production path) | `css_router.py:531` | B4 |
| `verbatim-CSS-fallback`: on css_router import failure, ALL CSS dumped unscoped (page-wide), operator-invisible | `sgs-clone-orchestrator.py:433-437` | **finer gap (a) — ADD** |
| `_infer_role()` keyword substring-match instead of `property_suffixes.kind_override` (D99 built this) | `css_router.py:573-588` | C5 |
| `_GLOBAL_BARE_TAGS` / `_CHROME_TOP_ELEMENTS` hardcoded frozensets (vocab not DB-driven) | `css_router.py:54-71` | C6 (reframe as R-22-1, not "Low/undocumented") |
| `MOCKUP_ROOT` + default page-144 hardcoded to Mama's in a "universal" deploy script | `upload_and_patch.py:36, 86` | C7 |

---

## Branch 4 — composite-wrapper standardisation + the propagation mechanism

`sgs/container` exposes 69 attrs across the 3 layers (full surface). Every composite under-mirrors it:

| Composite (KIND) | Has vs `sgs/container` surface | Notable divergence |
|---|---|---|
| hero (section) | ~34/69 | `splitColumnRatio` forks `gridTemplateColumns`; `overlayColour` naming drift; no widthMode/shapeDivider/bgSvg |
| cta-section (section) | ~14/69 | `layout` enum **collides** with container's `layout` (centred/left-split vs grid/flex) — same name, incompatible values |
| trust-bar (section) | ~11/69 | grid HARDCODED in `style.css:43-101` via `data-columns` selectors, not attr-driven → **P-TRUSTBAR-BOUND-GRID root cause** |
| modal (section) | ~7/69 | `maxWidth` is a size enum, not a literal |
| card-grid/feature-grid/gallery (layout) | ~7-9/21 scoped | grid template + width/contentWidth missing |
| info-box/product-card/team-member (content) | 0/4 width attrs | no width-control surface at all |

**Propagation reality (critical):** `sync-container-wrapping-blocks.py` is **report-only**. `--apply`
writes only `wraps_block` + `container_kind` (DB metadata). It never touches composite
`block.json`/`render.php`. **No "update container → mirror into composites" path exists** — that writer
is entirely unbuilt (WS-4). The composite-mirror divergences above (C2/C8 + hero forks) are the cheats
WS-4 must resolve via a shared PHP helper + a propagation writer + `/sgs-update` wiring.

| Gap / cheat | Plan gap-ID |
|---|---|
| trust-bar static-grid CSS (not attr-driven) | C2 |
| cta-section `layout` enum collision | C8 |
| hero `overlayColour` naming drift | C8 (finer gap d) |
| composites don't mirror + no propagation writer | D1-D3 |

---

## Consolidated gap register (all gaps → WS / gap-ID)

- **WS-1 (sgs/container 3-layer):** A1 content-width attr + inner-wrapper render + fold-lift; A2 outer
  max-width transfer + kill `widthMode:full` band-aid; A3 custom-width + centring; A4 raw-px gap; A5
  min-height; A6 `gridItem*`. PLUS finer gap (b) `_lift_core_block_style` dead-for-containers (fold
  must call the same max-width→widthMode logic).
- **WS-2 (converter/router truth):** B1 D1 sidecar consumed-or-replaced (~43 stranded); B2 multi-child
  `__inner`/fold sole-child gate; B3 grid on recognised section → attr; B4 D3 dual-write. PLUS finer
  gap (a) verbatim-CSS-fallback (fail loud, don't dump unscoped).
- **WS-3 (de-cheat, R-22-1):** C2 trust-bar static grid → attr-driven; C3 `_CAPABILITY_PRIORITY`; C4
  the two breakpoint systems; C5 `_infer_role`; C6 `_GLOBAL_BARE_TAGS`/`_CHROME_TOP_ELEMENTS`; C7
  de-Mama's `upload_and_patch.py`; C8 cta-section `layout` enum + hero `overlayColour` drift.
- **WS-4 (composite mirror + auto-propagation):** D1 shared PHP wrapper helper composites call; D2
  propagation writer (container capability → composite block.json/render.php); D3 `/sgs-update` wiring.

## Why this is the depth source

A fresh session reading only the plan + parking gets the *what* (gap-IDs + workstreams) but not the
*why* (the file:line evidence + the universal-scope reasoning). This report is that evidence base. The
plan cites gap-IDs; this report is where each gap-ID's proof lives.
