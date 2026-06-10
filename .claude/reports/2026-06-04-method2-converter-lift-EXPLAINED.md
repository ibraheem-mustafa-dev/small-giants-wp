---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Method 2 converter-lift — explained in plain English (what's failing, the decisions, the universal solution)"
created: 2026-06-04
audience: Bean (non-coder owner) + the build session
companion: plans/archive/2026-06-04-method2-converter-lift-PHASE-PLAN.md (the executable plan) + plans/archive/2026-06-04-method2-converter-lift-design.md (D169, the fix-shapes)
---

# Method 2 converter-lift — explained

## The one-paragraph version

WS-4 finished giving every building block its full set of controls (widths, spacing, grids, backgrounds). But the **converter** — the tool that reads a mockup and builds the WordPress page — isn't *filling in* those controls from the draft's CSS. It recognises ~812 settings per page but fills only 177. The rest fall on the floor. That's why the cloned Mama's page looks wrong: the image vanishes, the hero is the wrong colour, the badges stretch, the grids lose their spacing. The fix ("the lift") teaches the converter to read each element's real CSS and copy it onto the right control — **for any draft, any block, any nesting, any CSS** — not just Mama's. This doc explains exactly where it's failing, what each failure causes, the decisions we made, and why the solution is universal rather than a one-page patch.

---

## Part 1 — Where the pipeline is failing, and what each failure causes

The clone runs as a chain of stages. Most of the chain is healthy. The failures are concentrated in ONE stage (the converter "lift") plus two block-level bugs. Here is each failing job, plain-English cause, and the visible effect.

| # | Pipeline job | What's failing (plain English) | What it causes (what you see) | Fix |
|---|---|---|---|---|
| F1 | **Routing** (Stage 1/2 — "which block is each section?") | *Mostly healthy.* Hero correctly becomes `sgs/hero`. The 5 plain layout sections correctly become generic containers (they aren't special blocks). ONE break: trust-bar had lost its "I'm a section" flag. | Trust-bar routed by a lucky accident at low confidence — one schema change from breaking. | **FIXED + shipped this session** (`c3443e03`). |
| F2 | **The lift — plain sections** (the converter reads a section's own CSS) | It only copies the section's *max-width*. It drops background, min-height, grid layout, gap, and anything set differently on mobile/tablet. The list of "CSS property → which control" it uses is a tiny hand-written list of ~15 items — only what Mama's happens to use. | Sections lose backgrounds, spacing, and grid gaps; mobile/tablet styling is dropped. | **MF-A** (DB-driven map) + Step 1 |
| F3 | **The lift — composite blocks** (hero, trust-bar) | The wrap function **hard-codes** every section to "full width" and **imposes a pink gradient the mockup never asked for**, and never copies the hero's min-height. | Hero shows a dark-pink gradient instead of flat pink, and collapses too short. Trust-bar badges stretch the full screen width instead of their 1100px cap. | **MF-C** (pass real values in) + Step 3 |
| F4 | **The stranded translator** (an early stage works out 81 correct CSS→control mappings, writes them to a file) | A later piece of code that's *supposed* to read that file is a dead stub — so all 81 mappings (e.g. the feature-grid's 14px gap) are computed and then ignored. | Feature-grid boxes sit flush with no gap; other block-level grid/spacing lost. | **B1 = consume inline** + Step 2 |
| F5 | **Variant + name handling** | When a block has style variants, the converter writes the *programming object* as a class name (literally `--Array`) instead of the variant's name; and it drops custom modifier classes like `--send-to-ward`. | Testimonials carry a junk `--Array` class (so their styling can't apply); the announcement bar loses its special styling. | **Step 4** (D6/D7) |
| F6 | **Image upload** (Stage 4i) | Images are only "dry-run" staged, never actually uploaded to WordPress. | Brand/hero/product images are missing or broken (404/placeholder). | **FS-5** (Step 6) |
| F7 | **Block bug — sgs/media in a grid** | An image placed as a direct grid child collapses to zero size (a CSS bug in the block itself, not the converter). | The brand image is loaded but renders at 0×0 — half the section is blank. | **FS-4** (Step 5) |
| F8 | **Block bug — min-height forces centring** | The shared wrapper adds a "centre everything" class whenever a min-height is set, regardless of whether the design wanted centring. | A min-height section that should be top-aligned snaps its content to the middle. | **MF-B** (block-layer) |

**The pattern:** F2–F6 are all the *same root problem* in different clothes — the converter doesn't faithfully copy the draft's CSS onto the controls. F7–F8 are block-quality bugs that surface once the structure is right.

---

## Part 2 — The decisions we made (and why)

| Decision | What we chose | Why | Rule tag |
|---|---|---|---|
| **D-1: How to consume CSS values (B1)** | The converter reads each element's CSS **inline, at the moment it builds that element** — and we delete the go-between file. | One brain, one moment. The go-between file went stale once already (it broke because the two stages identified elements differently). Inline removes that whole class of bug and matches what the spec already says. | **A** (Spec 22 supersedes the file) |
| **D-2: Which code path to fix (the council catch)** | Fix the lift **on the path each section actually travels** — plain sections one way, composite blocks (hero/trust-bar) another. | A council check proved hero/trust-bar travel a *different* path than the plain sections. Fixing only the plain path would have done **nothing** to the hero — the exact trap that wasted the last attempt. | **A** (matches the spec's emit paths) |
| **D-3: Where the property→control map comes from** | Build it **from the database** (the `property_suffixes` table, which already lists every CSS property → control), pass through modern CSS functions (`clamp/calc/var`), and **flag anything it can't map instead of silently dropping it**. | A hand-written list is, by definition, "the properties Mama's uses." The database knows *every* block's controls — so a DB-driven map handles any block and any CSS. This is the single change that makes it universal. (It's also the rule: no hard-coded lists when a table exists.) | **A** (R-22-1 + FR-22-5) |
| **D-4: Where to fix min-height** | In the **block** (gate the centring on the design's alignment), not the converter. | The centring is forced by the block's own PHP, on min-height presence alone — a converter gate can't undo it. Fix it where it lives. | **B** (block-quality upgrade) |
| **D-5: How to set the composite wrapper** | **Compute the values once in the converter and pass them into** the shared wrap function — don't make the wrap function read CSS itself. | The wrap function is shared by all 9 sections. Making it read CSS from a second place would re-create the very divergence WS-4 was built to kill. One source of truth. | **A** (§FR-22-21, one mechanism) |
| **D-6: Build sequencing** | Treat it as **two sessions**, do the highest-value visible win (hero) first, defer the test fixture and image upload to last. | Honest scope — six converter + block fixes with a test-and-sign-off loop each is more than one session. Front-loading the hero gives momentum and de-risks early. | (sequencing) |

---

## Part 3 — The solution, and why it is robust + universal (not a Mama's patch)

**What it is:** the converter, as it walks the draft element by element, reads each element's actual CSS and copies every property onto the matching block control, using a map **derived from the database**. It does this at **every wrapper, at any depth**, on **both** emit paths (plain container and composite). Anything it can't map is **flagged for review, never silently dropped**. The block-level bugs (image-in-grid, min-height centring) are fixed in the blocks so they're robust in any layout.

**Why it's universal — three concrete guarantees, each tested by a synthetic fixture that uses CSS Mama's does NOT:**

1. **Any block, any control.** The map comes from the `property_suffixes` table, which lists the controls for *every* block — so a new block or a rarely-used control is covered automatically. A staleness test fails the build if a control ever lacks a mapping. (Not "the 15 things Mama's uses.")
2. **Any CSS setup.** The value reader passes through modern CSS functions (`clamp/calc/var`), shorthands, and per-breakpoint (mobile/tablet) overrides — and *flags* anything genuinely unsupported rather than dropping it. A draft full of `clamp()` typography clones correctly.
3. **Any nesting.** The lift runs the full 6-step transfer at every container the walker creates, at any depth — so a grid-inside-a-grid-inside-a-flex transfers correctly, not just Mama's two-level shape.

**The honest boundary (so "universal" isn't oversold):** the *mechanism* is universal; the *validation* on Mama's only exercises the subset Mama's uses. That's why Step 0 builds a synthetic fixture that deliberately exercises the cases Mama's doesn't (functions, units, shorthands, deep nesting, pseudo-elements, unsupported props). "1% pixel-diff on Mama's" is necessary but not sufficient — passing the fixture is what proves universal.

**What this unlocks:** once this lands, the pipeline can take *any* HTML/CSS draft that fits our blocks and produce a faithful WordPress clone — the difference between "a demo that works on one page" and "a cloning product."

---

## Part 4 — Rule-compliance summary (your A/B bar)

Every fix is either **A** (what the spec already says the pipeline should do) or **B** (a clean upgrade that integrates without new issues). None is a Mama's-specific band-aid (R-22-9 intact).

| Fix | A or B | Justification |
|---|---|---|
| F1 trust-bar routing (shipped) | **A** | FR-22-16/D107 — section-roots route by the `is_section_root` flag; trust-bar was simply missing it. |
| F2 / MF-A DB-driven lift map | **A** | R-22-1 (no hard-coded dicts; use the `property_suffixes` table) + FR-22-5 (CSS routes to the direct owner) + §FR-22-21 steps 2-4. |
| F3 / MF-C composite wrapper via parameter | **A** | §FR-22-21 step 2 (faithful absence) + one-source-of-truth (no divergence, R-22-9). |
| F4 / B1 consume inline (delete sidecar) | **A** | Spec 22 explicitly supersedes the Spec-16 sidecar. |
| F5 variant/modifier fix | **A** | FR-22-20 (variant detection) + FR-22-1 row 3 (modifier → emitted block's class). |
| F6 / FS-5 image sideload | **A** | Completes the spec'd Stage 4i (the stage exists; dry-run→real finishes it). |
| F7 / FS-4 sgs/media grid-child CSS | **B** | Block-quality CSS upgrade — sgs/media should render in any grid/flex parent. |
| F8 / MF-B min-height block-layer | **B** (+A) | Block-quality fix (gate the centring) + faithful align transfer (A). |

---

## Where to go next
- **Executable plan:** `plans/archive/2026-06-04-method2-converter-lift-PHASE-PLAN.md` — read the "⚡ FINAL PLAN" section (it supersedes the step bodies). Build = next session, Session A first (converter core, hero-first).
- **Fix-shape detail + council verdict:** `plans/archive/2026-06-04-method2-converter-lift-design.md` (D169).
- **The trap to remember:** validate each fix on the path the section actually emits through (the council Stage-5 check), and prove universality on the synthetic fixture, not just Mama's.
