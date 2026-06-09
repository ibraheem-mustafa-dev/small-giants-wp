---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Wave-2 ROOT-CAUSE FAMILY MAP — every clone issue → script/db root → fix family"
created: 2026-06-09
status: Synthesised from 3 parallel reads of the Wave-1 fact docs (all 7 sections). Validates whether the 'universal per-slot CSS routing' idea covers the issues. ANSWER: it's the biggest single family (~1/3) but NOT sufficient — 8 families exist.
caveat: Family classification is robust. Exact file:line citations inherit the Wave-1 docs and need the same source-verification we did for Hero/Trust-Bar before any build (several Hero/TB lines were already found stale).
---

# Root-cause family map

## The answer to "does universal per-slot routing cover everything?"

**No.** It's the **single biggest family (F1, ~16 of ~50 issues ≈ 1/3)** — necessary, the largest lever — but it covers only a third. The other ~2/3 split across **7 more families**, and the second-biggest (**F3, render-side block defaults/hardcodes, ~15 issues**) is a **completely different fix layer** (block `render.php`, not the converter). A plan that only built the converter routing would leave ~2/3 of your issues unfixed. Hero/Trust-Bar happened to be F1/F7-heavy, which is why my idea looked complete there.

## Family distribution (≈50 issue-entries across 7 sections)

| Family | What it is | Fix layer | ~count | Example issues |
|---|---|---|---|---|
| **F1 — per-slot CSS routing** | element/wrapper/array CSS (padding, margin, max-width, gap, colour, font-size) dropped because not routed to its slot's destination (child attrs / parent container attrs / per-item) | **converter** (the D178 build) | **~16** | H-B, TB-A, BR-B, FP-B/C/J/P, IN-B, GF-B.1/C/G, SP-B/D.2 |
| **F3 — render-side block default/hardcode** | a block's `render.php`/`style.css` hardcodes a value or has a wrong default that beats the draft (flex-wrap:wrap, verticalAlign:start, feature-grid auto-flex, pillStyle, starSize=24, backgroundColour default, multi-button auto-wrap, `?` avatar, slide-card token) | **block render code** (NOT converter) | **~15** | FP-G/L1/N/O, IN-C, GF-D.1/D.2/H, SP-C/D.1/E/F, BR-C, H-C(part) |
| **F6 — absence/inheritance handling** | a value that's a browser default OR inherited from an ancestor in the draft isn't made explicit, so a block/global default wins (mostly text-align) | converter (resolve inherited/absent → explicit) + draft convention | **~8** | FP-A/K, IN-A/E, GF-A/E, H-C(part), IN-F(part) |
| **F4 — breakpoint detection** | fixed thresholds miss the draft's actual breakpoints (`min-width:640` not in `_BREAKPOINT_RULES`; `768` misbuckets vs `_GRID_DESKTOP_BP=1024`) | converter (draft-driven breakpoints) | **~4** | BR-A, GF-B.3, SP-A, (H-A2) |
| **F8 — content extraction gap** | content (text/name/emoji) not transferred for a specific block | converter (universal content routing replaces per-block handlers) | **~4** | IN-D, IN-F, GF-I(part), SP-E(part) |
| **F5 — block resolution / capability** | section maps to the WRONG block, or the right block lacks a capability | slot routing (slots table) + block feature build | **~4** | FP-D, SP-G, GF-I(part), BR-C(part) |
| **F2 — property-coverage exclusion** | `font-family` explicitly excluded from the lift map (`db_lookup.py:1101`) | converter (1-line + decide why excluded) | **~3** | FP-M, GF-B.4, GF-F |
| **F7 — double-emission / inline-beats-@media** | two paths write the same property, or base value emitted inline so @media can't override | converter + block render (single grid engine) | **~2** | H-A, TB-B |
| **NEW — framework/draft completeness** | not pipeline routing: icon-version-drift (TB-C), block-capability-gap (FP-E card-grid), block-architecture-mismatch (FP-H), rest-validation (FP-F — already fixed D191), draft-naming (FP-DRAFT-FIX) | mixed — block builds + draft edits | **~5** | TB-C, FP-E/F/H, FP-DRAFT-FIX |

## What this changes about the plan

1. **F1 (converter per-slot routing) stays the centrepiece** — it's the biggest, and it's the D178 work. But it is **one workstream, not the whole fix.**
2. **F3 (block render defaults) is nearly as big and is a SEPARATE layer.** ~15 issues are blocks' own `render.php`/`style.css` hardcoding values or wrong defaults — the converter can't fix these. Several are container-wrapper hardcodes (flex-wrap, verticalAlign) that overlap the **container-standardisation programme (WS-1)** and the **dead-control/D192** thread. This workstream is "make block render defaults attr-driven + correct."
3. **F6 (absence/inheritance)** needs the converter to resolve **inherited/ancestor CSS** (text-align on `__inner` → leaf) and make implicit values explicit — plus the draft-authoring convention. Partly rides on F1's routing but the core is the inheritance resolution.
4. **F4 (breakpoints)** — make breakpoint detection **draft-driven** (read the draft's actual breakpoints) instead of fixed `640/768/1024` constants. Small but shared across BR-A/SP-A/GF-B.3/H-A2.
5. **F2 (font-family)** — likely a deliberate exclusion (avoid overriding theme fonts); decide + scope it, not just un-exclude.
6. **F5 (block resolution/capability)** — slot-routing table additions (`trustpilot-reviews`, `announcement-bar` callout) + a real card-grid product capability (framework build, the Spec 27 thread).
7. **F7 (single grid engine)** — H-A's double emission; render-side.

## Revised plan — multi-workstream, with the council gates you asked for

**Stage 0 — design pre-mortem (NOW): `/adversarial-council`** on THIS family map + the workstream decomposition. Question for the panel: is the 8-family decomposition correct and complete; is anything mis-classified; is F1 genuinely the right centrepiece; what's the safest build order given the shared converter + shared container wrapper blast radius?

**Stage 1 — per-workstream fix-shape validation: `/qc-council`** (per blub.db 255). Before building each workstream's fix, validate the fix-shape against a measured baseline (predicted vs actual delta) — especially F1 (converter routing) and F4 (breakpoints), which touch the converter core.

**Stage 2 — build, sequenced by the council's order**, each in a fresh session (Wave-3 model), each design-gated (Rule 7) because F1/F3/F7 touch shared mechanisms. Add the **spec↔code conformance gate** D178 says is missing so this can't silently rot.

**Stage 3 — verify on the real homepage** (Playwright live DOM, R-22-11/R-22-13) per section, Bean sign-off.

### Build-order hypothesis (for the council to confirm/reorder)
1. **F1 converter per-slot routing** (D178 finish + extend to wrapper-box-CSS + array per-item) — biggest lever, unblocks the most.
2. **F3 block render defaults** (attr-drive the container/feature-grid/option-picker/etc. hardcodes) — second biggest, partly overlaps WS-1.
3. **F6 inheritance/absence** + **F4 breakpoints** + **F2 font-family** — converter-side, ride alongside F1.
4. **F5 block resolution/capability** + **F7 grid engine** + **NEW framework/draft** — targeted.
