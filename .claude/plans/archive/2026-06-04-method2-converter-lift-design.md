---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Method 2 — converter-lift design (the page-clone fidelity work after WS-4)"
created: 2026-06-04
status: DESIGN — council complete (adversarial-council 2026-06-04 ✅). Build is the NEXT session. Routing fix #1 (trust-bar) SHIPPED (c3443e03). Task-3 scope clarified 2026-06-07 (Bean, commit 36e3bc3c): sgs/container IS the valid DB-driven target for slug-None sections; FS-1a/FS-2a already correct. See phase-plan for full note. Also pre-shipped: icon-identity resolver (127f2290), Stage 9 schema fix (f93db924), WS-1c A4 gap consolidation (668e26ad).
grounded_by:
  - "/sgs-clone run mamas-munches-homepage-2026-06-04-134425 (full pipeline + debug-trace + deploy page 144)"
  - "3 read-only investigation agents (routing / extraction-lift / draft-vs-clone DOM diff) — findings cross-verified at file:line"
  - ".claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md (the file:line evidence base)"
b1_decision: "Option A — consume inline (Bean, 2026-06-04). The walker maps each element's CSS → attrs at walk-time via a CURATED layer→property_suffixes DB map (name-free; property-keyed, NOT canonical_slot-keyed — per D194, canonical_slot is content-fork metadata only, NOT the structural-CSS routing key); the css-d1-assignments.json sidecar (seed_d1_sidecar stub, convert.py:167) is DELETED, not revived. No two-stage element-identity re-alignment; matches Spec 22 (sidecar superseded). STOP #48: explicit property→attr entries, never a blind suffix guess."
related:
  - .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md §FR-22-21 (canonical target) + §FR-22-4.1 (wrapper resolution) + §FR-22-20 (variant detection)
  - .claude/plans/archive/2026-06-02-container-wrapper-standardisation.md (WS-2/WS-3 gap register)
---

> **⚠ ARCHIVED 2026-06-10 — SUPERSEDED (plans-folder consolidation).** A successive re-cut of the cloning-fidelity effort; its open work was folded into the build-plan + sign-off ledger and parking.md. Live canonical cloning plan: `../2026-06-09-clone-fix-build-plan.md` + `../2026-06-09-clone-fix-sign-off-ledger.md`. Remaining open work tracked in `../../parking.md`. Kept for historical detail (shipped-state, locked decisions, methodology).

# Method 2 — converter-lift design

## What this is (plain English)

WS-4 gave every block the full set of width/spacing/grid/background controls. This design is the **converter** work that makes a *cloned page actually use them* — reading the mockup's CSS and writing it onto the right block attributes. The block-side mirror is done; this is the page-fidelity half.

## Premise correction (verified this session)

The prompt/memory said "converter routes everything to sgs/container @0.10; routing fix = `.sgs-hero`→`sgs/hero`." **Verified false against the live DB + match.json:**
- **hero already routes to `sgs/hero` @1.0** (the D107 tier path works).
- **trust-bar** was the only broken route (tier drift) — **FIXED + shipped this session (`c3443e03`)**: was `tier='block'` (missing `is_section_root` in block.json), now `class-section`; `is_class_section_block('sgs/trust-bar')` returns True → voter returns `('sgs/trust-bar', 1.0, 'class-section-block-equivalent')`.
- The other 5 sections (featured-product / brand / ingredients-section / gift-section / social-proof) are **NOT registered blocks** — routing to `sgs/container` is **correct by design**. They are layout containers; the lift transfers their CSS.

**So routing is essentially solved.** The real lever is the lift (the 560 `extraction_failed`).

## Honest scoping of the 560 `extraction_failed` (STOP #50)

`leftover-buckets.json` counts a slot as "failed" whenever the BLOCK declares the slot but the run extracted no value. Decomposition (Agent B, verified):
- **140** = header/footer chrome (70 each) — unextractable by design (noise; not real failures).
- **~387** = 43 wrapper-capability attrs × 9 sections. **Most are correct absences** — the Mama's mockup genuinely sets no `shapeDivider*`, `bgSvg*`, `bgVideo`, `overlayGradient*`, etc., so "no value" is the faithful answer (R-22-21 step 6: absence is a valid transfer). **Do NOT chase these to zero.**
- **The REAL, visible failures** are the specific ones the draft-vs-clone DOM diff found (Agent C) — these are what the lift must fix. Everything below is scoped to those, not to the 560 count.

## The verified visible defects (Agent C draft-vs-clone @1440) → fix-shapes

| # | Defect (live page) | Draft truth | Cause | Fix-shape |
|---|---|---|---|---|
| D1 | **Brand image renders 0×0** (half the section blank) | `.sgs-brand__image` div, 450×440 grid col | `sgs/media` as a direct grid child collapses (CSS) + image is dry-run (not uploaded) | FS-4 (block CSS) + FS-5 (sideload) |
| D2 | **Hero: dark-pink gradient not in the mockup** + min-height 520 dropped | flat `#F5C2C8`, `min-height:520px` | imposed gradient on the OUTER container; `min-height` never lifted (A5) | FS-1 |
| D3 | **Trust-bar badges span full 1425px** (cap + gap lost) | inner cap `max-width:1100px`, `gap:16px` | content-width + gap not lifted onto the (now-mirrored) trust-bar | FS-1 + FS-2 |
| D4 | **Feature-grid boxes flush** (`gap:normal`) | `.sgs-feature-grid gap:14px` | the 14px gap is a STRANDED D1 assignment (B1) | FS-2 (B1=A consume) |
| D5 | **Product cards both 380px** (640/384 split lost) — ✅ **BLOCK-SIDE RESOLVED 2026-06-10 (D204):** the layer-check (STOP #31) confirmed block-side; the card now yields its 380px cap inside a grid track via `.sgs-card-grid > .product-card{max-width:none;margin-inline:0}` + the WP-constrained-tie B2 rule (`.product-card.sgs-product-card{max-width:380px}` for standalone). Converter D5 is now satisfied as long as the cloned cards land inside a grid wrapper (`.sgs-products`→grid). | `.sgs-products` grid `640px 384px` | grid lifts onto the container, but product-card had a fixed width overriding its track (now scoped to standalone-only) | FS-3 |
| D6 | **Testimonials get class `--Array`** | static variant | FR-22-20 emits a JS Array `.toString()` as the variant class | FS-3 |
| D7 | **Announcement-bar loses `--send-to-ward`** | only-class modifier | BEM modifier not carried to the emitted block's className | FS-3 |

---

## Fix-shapes (each carries the council fields: file:line · mechanism · predicted outcome · validation · STOP guards)

### FS-1 — Curated wrapper-capability lift on the section container (B1=A)
- **Where:** `convert.py` slug-None top-level path (~2104-2129), after the `widthMode` setdefault, before `_process_container_children`; + extend `_root_lift_rules` (~498) for the fold path.
- **Mechanism:** at each section container the walker reads the section root's own CSS (already in `_sec_base`, collected at ~2114) and applies a **CURATED layer→property_suffixes map (name-free; property-keyed, NOT canonical_slot-keyed — D194: canonical_slot is content-fork metadata only, not the structural router)** (R-22-1, DB-driven; STOP #48 — explicit property→attr entries, NEVER an endswith-suffix guess against sgs/container's overloaded namespace). Curated entries (this run's real needs): `min-height`→`minHeight` **GATED on the draft also carrying `align-items:center`/`justify-content:center`** (STOP #49 — else route to gap-candidate, do not centre non-centred content); `background-image`→`backgroundImage` ONLY when the draft sets one (hero does NOT → so the imposed-gradient defect D2 is fixed by NOT emitting one — see FS-1b); `box-shadow`→`shadow`.
- **FS-1b (the hero gradient, D2):** the gradient is an OVER-emission, not a drop. Trace where the outer `sgs/container` acquires `background-image: linear-gradient(...)` when the draft hero is flat `#F5C2C8`. Likely a default/mirror artefact. Fix = stop emitting a background-image the draft never set (faithful absence). Pair with `min-height:520px` lift (hero DOES set it).
- **Predicted outcome (falsifiable):** hero outer container has NO `background-image` (flat pink shows) + `min-height:520px`; brand/ingredients/etc. unchanged where the draft sets nothing. ~3-6 real slots, NOT 387.
- **Validation:** re-clone → live-DOM @1440 `getComputedStyle(hero-outer).backgroundImage === 'none'` + `.minHeight === '520px'`; draft-vs-clone diff on hero closes D2.
- **STOP:** #33 (transfer, not a detect-then-set hack), #48 (curated map), #49 (align-gate min-height), #50 (only the props the draft sets).

### FS-2 — Grid/gap lift incl. the stranded D1 values (B1=A) — closes D3/D4
- **Where:** `convert.py` — delete `seed_d1_sidecar` stub (~167) + its orchestrator call (`sgs-clone-orchestrator.py:1298-1308`); the walker, at each grid-bearing wrapper (`.sgs-feature-grid`, trust-bar inner), reads its CSS and maps `display:grid`+`grid-template-columns`→`layout`+`gridTemplateColumns`, `gap` (raw px allowed, A4)→`gap`, inner `max-width`→`contentWidth`.
- **Mechanism:** the 67-81 values currently stranded in `css-d1-assignments.json` (feature-grid `gap:14px`, trust-bar grid) are recovered by reading the element's CSS inline via the curated layer→property_suffixes map (name-free; property-keyed, NOT canonical_slot-keyed — D194) — same DB rules, no sidecar.
- **Predicted outcome:** feature-grid `gap` = `14px` (D4 closed); trust-bar inner `contentWidth`/`max-width` = `1100px` + `gap:16px` (D3 closed — badges no longer full-width); `css-d1-assignments.json` no longer written (or written + ignored — confirm deletion path).
- **Validation:** re-clone → `getComputedStyle('.sgs-feature-grid').gap === '14px'`; trust-bar inner width ≤1100; STOP #50 confirm these CSS rules are present in the draft + reach the walker on this canary.
- **STOP:** #48, #50, R-22-1.

### FS-3 — Variant + BEM-modifier + className preservation — closes D5/D6/D7
- **Where:** the FR-22-20 variant-class emit path (`convert.py` variant detection) + the className-carry (D145 carries `is-style-*`; extend to arbitrary BEM modifiers).
- **Three sub-fixes:** (a) **D6** — variant value is a JS Array serialised as `--Array`; fix the emit to use the variant *value string*, never `Array.toString()`. (b) **D7** — carry the source node's BEM modifier (`--send-to-ward`) onto the emitted block's `className`. (c) **D5** — product-card renders 380px not its 640 grid track: trace whether it's a fixed block default width overriding the grid item (likely a block-side `cardMaxWidth`/width default — may be a product-card fix, not converter). **Verify the LAYER before fixing** (STOP #31).
- **Predicted outcome:** no `--Array` class anywhere; `.sgs-announcement-bar--send-to-ward` present on the emitted block; product-card fills its 640/384 track.
- **Validation:** re-clone → grep emitted markup for `--Array` = 0; `--send-to-ward` present; product-card computed width ≈640/384.
- **STOP:** #34 (verify the LAYER — D5 may be block-side), #37 (gate on attr TYPE).

### FS-4 — sgs/media-as-grid-child 0×0 bug (BLOCK fix) — closes D1(a)
- **Where:** `sgs/media` block CSS (`src/blocks/media/style.css`) — an `<img class="sgs-media">` as a direct grid child collapses to 0×0 (loaded but zero box).
- **Mechanism:** likely `max-width:100%` + no intrinsic width as a grid item → needs `width:100%`/`min-width:0`/`align-self`/`justify-self` for grid-child context. **Diagnose against the live computed style first** (R-22-11) — this is a BLOCK CSS fix, NOT converter.
- **Predicted outcome:** brand image renders at its grid-track width (450px), not 0×0.
- **Validation:** test-page with sgs/media inside a 2-col grid → image box ≥1px; brand section on re-clone shows the image.
- **STOP:** #31 (block vs converter layer), R-22-11.

### FS-5 — image sideload dry-run → real upload — closes D1(b) + hero/product images
- **Where:** Stage 4i media-sideload (`stage_4i_media_sideload`) currently dry-run (12 images staged, `id:null`); wire to a real WP media upload + patch.
- **Predicted outcome:** the 12 mockup images upload to the WP media library + the cloned page references real attachment IDs (no 404/placeholder).
- **Validation:** `media-sideload-manifest.json` shows real IDs (not null); live page images load (200, not 404).
- **STOP:** independent of FS-1..4 — schedule any time; biggest raw-pixel lever once structure is faithful.

---

## Sequence + dependencies
```
[DONE] Routing #1 trust-bar (c3443e03)
FS-1 (wrapper lift + hero gradient/min-height)  ─┐
FS-2 (grid/gap + B1 consume-inline)              ─┼─ converter (convert.py — SERIALISE these edits, shared file)
FS-3 (variant/modifier/className)                ─┘
FS-4 (sgs/media grid-child CSS) ── block, parallel
FS-5 (image sideload) ── orchestrator, parallel/independent
```
- **FS-1/FS-2/FS-3 all edit `convert.py` → SERIALISE** (one agent or sequential; no parallel shared-file edits).
- **FS-4 (block CSS) + FS-5 (orchestrator) are disjoint → parallel.**
- Each fix-shape: `/qc-council` pre-build validate (STOP #50 — confirm the target CSS reaches the targeted path on THIS canary) → build → deploy → re-clone → live-DOM (R-22-11) → per-defect close → Bean R-22-13 visual sign-off.

## Council verdict (Stage 5 — empirical path validation, 2026-06-04)

Ran the qc-council Stage-5 gate against the run `mamas-munches-homepage-2026-06-04-134425` trace (`convert-trace-b*.jsonl`). The deterministic emit-branch per boundary:

| Boundary | Emit branch (trace) | Path |
|---|---|---|
| b2 hero | `content_column_folded {slug: sgs/hero}` + `scalar_media_lifted` | **COMPOSITE-interior (FR-22-19)** |
| b3 trust-bar | `wrapper_container` (pre-tier-fix run); post-`c3443e03` routes as `sgs/trust-bar` | **COMPOSITE (post-fix)** |
| b4 featured-product | `fold_into_container` + `wrapper_container` | slug-None container |
| b6 ingredients | `fold_into_container` + atomic swaps | slug-None container |

**CAUGHT (STOP #50):** FS-1 + FS-2 as written target the **slug-None section path** (`convert.py:2104-2129`, `_root_lift_rules`). But the hero defects (D2 gradient + min-height) and the trust-bar defects (D3 content-width + gap) are emitted on the **composite path**, NOT slug-None. Building FS-1/FS-2 as written = **0-delta no-op on hero + trust-bar** — the identical trap that "falsified" the 2026-06-03 generic lift (memory `universal-lift-was-premature-not-falsified`; the real bug was always "hero composite-interior").

**REFINEMENT (required before build) — split the lift by emit-path:**
- **FS-1a / FS-2a (slug-None container path)** — VALIDATED for the 5 layout sections (featured-product, brand, ingredients-section, gift-section, social-proof). Build as designed on `convert.py:2104-2129` + `_root_lift_rules`.
- **FS-1b / FS-2b (COMPOSITE path)** — hero + trust-bar. The min-height / content-width / gap / no-imposed-gradient must land on the **composite emit path**: the `db_lookup.py:2461` `{"widthMode":"full"}` hardcode (C1) is the band-aid that overrides the composite wrapper, and the FR-22-19 `_route_composite_interior` is where hero's interior is built. The lift for these blocks transfers draft CSS onto the now-mirrored (WS-4) composite wrapper attrs **via the composite emit path**, not the slug-None path. This is precisely where `universal-lift-was-premature-not-falsified` said the lift lands *after* WS-4 — and WS-4 is now done, so the destinations exist.
- **FS-2 feature-grid gap (D4):** feature-grid resolves to the `sgs/feature-grid` block (resolved-block path) — gap lands on the block attr; verify the resolved-block lift path carries it (B1=A consume-inline).

**Verdicts:** FS-1 → **validated-with-refinement (split a/b)**. FS-2 → **validated-with-refinement (split a/b)**. FS-3 → validated (className/variant carry; D5 LAYER-check pending — likely product-card block-side). FS-4 → validated (block CSS, right layer). FS-5 → validated (independent). No fix-shape is `falsified`; two require the path-split before dispatch.

**Saved:** catching the FS-1/FS-2 mis-target pre-build saved a wasted wave of converter subagent work + a re-baselining session (the 2026-06-03 failure mode, repeated would-be).

## A2 BUILD-TIME GROUNDING (2026-06-04 — corrections from reading the actual hero emission)

Read the hero's emitted markup (`extract.json`, run 134425) + traced the gradient source. Two corrections to FS-1b:
1. **The hero gradient is OUT of converter scope.** The converter correctly emits `style.color.background: surface-pink` on the inner `sgs/hero` (flat pink). The dark-pink gradient is the hero block's OWN default (`hero/style.css:40-48`, "overridden by inline background-color") — a render-layer / double-wrapper / `wp_global_styles` artefact, NOT a converter emission. **A2 does NOT touch it.** (If it still shows visibly, that's a separate block-CSS / global-styles task — memory `canary-live-styles-come-from-wp-global-styles-post`.)
2. **The real A2 gap = `min-height:520px` dropped** (mockup `.sgs-hero` @desktop sets it; absent from emitted markup). A2 lifts it onto the outer `sgs/container` via MF-C (compute attrs → pass into `emit_sgs_container_wrapping`).
3. **COUPLING — RESOLVED by the landing decision (Option A):** the centre-trap (`--has-min-height` → flex-centre, `style.css:33`) is **overridden by inline `display:grid` + `align-items:$verticalAlign`** (helper lines 330-337). So it only bites a min-height section with NO grid/flex layout. The hero IS a grid → if min-height lands on the inner `sgs/hero` (which carries the grid), the trap is overridden → **MF-B is DECOUPLED from the hero**. (MF-B remains a real universal fix for non-grid min-height sections — keep it in Phase B.)

### A2 BUILD-SPEC (precise — for the focused build; decided + grounded, ready to execute)
- **Landing decision = Option A (spec-grounded, §FR-22-21 composite-mirror, R-22-9):** the composite's own wrapper CSS lands on the COMPOSITE block's mirrored attrs (where its background already lands), NOT the outer `sgs/container` wrap. Site: **`convert.py:2351`** — immediately after `_lift_root_supports_to_style(node, slug, css_rules, attrs)` on the resolved-slug path, ALSO call the A1 helper:
  ```
  if slug is not None and <slug is in the container-mirror roster>:   # DB-gated: block_composition.wraps_block=='sgs/container'
      base, bp = _collect_css_decls_for_element(node, css_rules)
      lifted, flagged = _lift_wrapper_css_to_container_attrs(base, bp, db.block_attr_names(slug))
      for k, v in lifted.items(): attrs.setdefault(k, v)   # never clobber background/etc. already set
  ```
  This is UNIVERSAL: every container-mirror composite (29 roster) gets its wrapper CSS lifted onto its mirrored attrs at this ONE site — not hero-specific (R-22-9). Gate via the DB roster (R-22-1), so non-mirroring blocks (sgs/text etc.) are skipped (no FLAG-spam).
- **OPEN FORK (decide at build): responsive min-height.** The hero's `min-height:520px` is in `@media(min-width:768px)` → reaches the A1 helper as `bp_decls['Desktop']` → maps to `minHeightDesktop`, which the container does NOT have (only base `minHeight`). Two options: **(A-collapse)** the helper falls back to the BASE attr when a responsive variant doesn't exist (desktop min-height → base `minHeight`, applies all viewports — harmless on mobile since the stacked hero exceeds 520; minor infidelity); **(A-responsive)** add `minHeightTablet/Mobile` (+ `Desktop` semantics) to the container block + 28 mirrors (bigger, more faithful). **Recommend A-collapse** for this build (the helper gains a graceful responsive→base fallback for attrs lacking responsive variants — itself universal); A-responsive is a future polish. CONFIRM with Bean or decide from the rule "clone inherits the CSS" (a floor min-height that mobile exceeds is faithful-enough).
- **Verify (R-22-11):** build → `build-deploy.py --blocks-only` (it's a converter change → re-clone, not just deploy) → re-clone page 144 → Playwright: hero emitted markup carries `minHeight:'520px'` on the inner `sgs/hero`; live hero section height ≥520 @1440; mobile NOT broken; NO new centre-regression (hero content not force-centred). Roll back fast on regression (STOP #19).
- **Gradient: explicitly NOT in A2** (out of converter scope per finding 1).

## Build is next session (per next-session-prompt dependency graph)
This session's deliverable = this council-validated-and-refined design. The build (FS-1a/b..FS-5) is the next focused session — open with FS-1b/FS-2b path-split confirmed.
