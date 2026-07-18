---
doc_type: strategic-plan
title: Spec 35 — Block Inspector UX, Control-Completeness & Capability standard — strategic plan
project: small-giants-wp
spec: 35-BLOCK-INSPECTOR-UX-STANDARD.md
created: 2026-07-18
status: DRAFT — awaiting Bean sign-off on Phase 0 (first slice)
owner: framework
---

# Spec 35 — strategic plan (macro shape)

## Plain-English summary (read this first)

**What we're building.** Every SGS block has an editor sidebar (the "inspector") that a
non-technical client uses to change colours, spacing, links, images, etc. Right now every
block builds its sidebar differently, and many controls are half-finished (a colour picker
with no transparency, a "shadow" that's only Small/Medium, logos added one at a time). Spec 35
is the single standard that fixes this across the whole block roster (count is DB-authoritative —
`/sgs-db` / `/wp-blocks`; UNIT A enumerates it, never hardcode it) and adds the missing table-stakes
features every WordPress power-user expects.

**Why it matters.** Bean's long-term goal is to be QC-only. That only works if blocks are
*complete and consistent* so clients can self-serve and the framework beats Kadence/Spectra/
GenerateBlocks. Half-built controls are the single biggest "client had to phone me" risk.

**The three things Bean specifically asked to be threaded through (not bolted on last):**
1. **Feature-parity** — every SGS block must expose *at least* what the core block(s) it
   replaces can do (per `block-replacements.json`), unless a named exception.
2. **Shrink-to-fit** — every block must shrink to fit its container on its own (intrinsically
   responsive), never rely on a container clamp that squishes it.
3. **sgs/media controls** — properly evaluate and add the best image *and* video controls the
   framework is missing (a holistic review vs the competitors), not a piecemeal add.

**The plan's core move.** We prove all three of those on ONE pilot block in the FIRST slice
(Phase 0) — `sgs/media` — because it is media-heavy (input 3), replaces `core/image` +
`core/video` (input 1), and media blocks are the worst shrink-to-fit offenders (input 2). One
block, all three constraints proven live, before we roll anything out framework-wide. That is
the lesson from `requirement-used-to-justify-is-not-requirement-made-a-design-constraint`: a
requirement that only ships in the last phase gets under-delivered.

---

## Phase 1 — SCOPE

| Field | Value |
|---|---|
| **Goal (one sentence)** | Make every SGS block's inspector conform to Spec 35 (complete controls, native-first, a11y) AND satisfy the three threaded standards (feature-parity, shrink-to-fit, media-controls), enforced structurally so it stays true. |
| **"Done" looks like** | (a) Spec 35 Part L folded into a per-block DONE checklist + a structural gate; (b) Wave-1 framework components landed (alpha colour, LinkControl wrapper, ShadowControl, min-width:0 backstop); (c) every block passes the parity + shrink-to-fit + inspector-conformance audit, or has a *named, spec-mapped* exception. |
| **Business objective advanced** | "Bean as QC only" (SUCCESS definition) + "framework beats Kadence/Spectra/GenerateBlocks". Directly reduces client support load. |
| **Constraints (non-negotiable)** | No block version bumps / no `deprecated.js` (D270). No-inline styling gate stays green (`check-no-inline.py`). WCAG 2.1 AA. a11y/validation surfaces are INFORMATIONAL only, never a gate (`a11y-validation-feedback-informational-not-gate`). Shared-surface changes (wrapper, shared components) → design-gate first (7-rules #7). Client-experience primary: every capability is an inspector control, not code. |
| **Success criteria (measurable)** | 1. Parity detector reports **0 *unexplained* gaps** across the `replaces` roster — every gap is either closed OR in the named-exception file mapped to a Wave (see UNIT A; "0 gaps outright" is NOT the bar — real gaps exist today, e.g. sgs/media lacks core/video `preload`+`<track>` and core/image lightbox/duotone/sizeSlug). 2. Shrink-to-fit audit: every block intrinsically shrinks — root/section min-content ≤ its resolved container width at the device tiers, 0 forced horizontal overflow, **measured with the UNIT-C backstop DISABLED** (proves intrinsic, not backstop-rescued). 3. Static inspector-conformance audit (enableAlpha on component colour pickers / LinkControl / real shadow builder / reduced-motion gate) = 0 unexplained findings on all blocks. 4. Every deferral maps to a named Spec 35 Part/Wave — none labelled "out of scope" (STOP-29). 5. **Consistency scanner (UNIT A+) = 0 unexplained divergences across all 8 dimensions** — every block's controls/panels/attrs/defaults/ranges/responsive/a11y/state either match the canonical registry or are in `divergence-exceptions.json` with a reason. |
| **Scope boundary — NOT included** | Header/footer/nav rebuild (Track 2 / Spec 17+36, co-active). SEO schema controls (owned by `seo-schema` skill; Spec 35 Part C leaves these out). New blocks from the Phase-2 block backlog (Post Grid, Gallery, etc.) — Spec 35 governs *existing* blocks' inspectors; new-block builds inherit the DONE checklist but are their own tickets. **Cloning-converter caveat (NOT a clean exclusion):** we don't rewrite Spec 31's converter, BUT `sgs/media`'s attrs ARE the converter's source of truth, so any NEW media-control attr added in the pilot must be classed **editor-only (authored, not cloned)** OR carry a one-line converter-population note — a new attr with neither is a dead control on clones. This boundary is a design-gate item in UNIT D, not a silent exclusion. |
| **Spec items explicitly folded in (were at risk of silent drop)** | Conditional/display controls (Part C) → Wave 3. SVG sanitise-on-upload (Part C, SECURITY — the pilot has an SVG mode taking raw `svgContent`) → **Phase 0, UNIT D** (security, can't defer on the pilot). Decorative-image toggle + general ARIA-label control (Part C a11y / E6) → Wave 2. theme.json v3 `styles.blocks.<name>.css` + appearanceTools (Part G) → Wave 3. CSS filters/backdrop-filter/mix-blend/clip-path (Part C premium) → Wave 3. Each owned by a Wave below, none dropped. |
| **Real calendar slot** | Bean to choose. Phase 0 (first slice) ≈ **~1.5 focused days** — critical path (C0 sign-off → C → D pilot) is ~half a day; A + B fan out in parallel; the UNIT A+ scanner-engine build (Sonnet, JSX-AST) is the extra ~half-to-full day. |

### Personas (from project context)
- **Priya — non-technical client** editing her own site. Needs: transparent colours, a real
  link picker with internal search, images that never overflow her phone screen. Fails when a
  control is half-built and she has to phone Bean.
- **Bean — QC-only owner.** Needs: a structural gate that *proves* conformance so he doesn't
  re-check by hand. Fails when "done" is a prose claim not a machine check.
- **Future agent** building a new block. Needs: one DONE checklist to copy, real exemplars.
  Fails when the standard lives in memory not in a gate.

### Past-data calibration
Directly comparable prior work exists — the **no-inline styling rollout** (Spec 32): same shape
(a framework-wide per-block standard + shared components + a structural gate + a DONE checklist +
proven exemplars first, then a wave rollout). That programme's actual velocity is the calibration
anchor (block migrations ran ~5–15 min each once the pattern + gate existed). Estimates below use
it. Confidence: **calibrated** (not first-attempt).

---

## Phase 1.5 — RESEARCH PRE-GATE

**Skipped — research already banked in the spec.** Spec 35 v2.0 is the product of a documented
6-stream research sweep (WP component capabilities, competitor parity vs Kadence/Spectra/
GenerateBlocks/Stackable/GreenShift, inspector UX/a11y, uncovered components, newer WP platform
capabilities, interaction/effects/content) with the full URL list in the six 2026-07-18 research
transcripts. The only genuinely un-researched decisions are absorbed into Phase 0 as design-gates:
- **Media-controls surface** (input 3) — evaluated live in Phase 0 as the pilot's first task
  (competitor media-block comparison → decide the control set). This is a *decision*, not a
  research gap; the spec already lists the candidate controls (Part C Media + Part I).
- **min-width:0 safeguard blast radius** — a shared-wrapper change → its own design-gate inside
  Phase 0 (measure before/after on real pages; it is the canonical CSS-Grid `min-width:auto`
  blow-out guard, already proven low-risk last session).

---

## Phase 2 — MAP (work units + dependency graph)

### Work units

```
UNIT A — DONE-checklist + enforcement scaffold  (2 audit CLASSES — do not conflate)
PURPOSE: turn Spec 35 Part L into an enforceable per-block definition-of-done + the audit tools,
         and ENUMERATE the block roster (the audit denominator) from the DB
STEP A0 — roster enumeration: `/sgs-db` / `/wp-blocks` → the authoritative list of blocks + which
       declare a styling/colour/link/media/animation surface. This list IS "all blocks" for every
       later "0 findings across the roster" claim. Never hardcode a count.
FILES: .claude/plans/spec-35-inspector-DONE-checklist.md (new, sibling to block-migration-DONE-checklist.md;
       Part L is ~22 end-conditions — transcribe, don't re-derive);
   STATIC class (AST/JSON — CAN wire into prebuild as WARN-only, later a hard gate):
       plugins/sgs-blocks/scripts/audit-inspector-conformance.js (new — parses edit.js JSX + block.json:
         flags a `DesignTokenPicker`/`ColorPalette` COMPONENT colour picker without enableAlpha [NOT native
         `supports.color`, where alpha is a theme.json concern], a raw URL `TextControl` not `SgsLinkControl`,
         a preset-only "shadow" SelectControl, an animation with no reduced-motion gate). Has its OWN
         exception file `inspector-conformance-baseline.json` (token-only brand pickers legitimately skip alpha);
       plugins/sgs-blocks/scripts/audit-feature-parity.py (new — reads block-replacements.json [block→block map]
         + each SGS block.json + a CORE-CAPABILITY SOURCE = the installed `@wordpress/block-library` block.json
         set [decide+pin the source in this unit; that's where core `supports`+attrs are read from]; emits a
         core-capability→SGS-equivalent table; a row with no SGS equivalent = a gap → closed OR written to
         `feature-parity-exceptions.json` with a Wave mapping [deferral policy lives HERE, distinct from
         over-report suppression]).
   LIVE-DOM class (Playwright — CANNOT run at prebuild; runs in CI / on-demand / manual, gate at Phase 4 close):
       plugins/sgs-blocks/scripts/audit-shrink-to-fit.js (new — Playwright: for each block on a live page,
         assert the rendered root/section does not force horizontal overflow of its resolved container at the
         device tiers, run with the UNIT-C backstop toggled OFF to prove intrinsic responsiveness).
INPUTS: block-replacements.json, Spec 35 Part L, the DB roster (A0), the pinned core-capability source
OUTPUTS: the DONE checklist + roster + three audit reports (2 static, 1 live-DOM) consumed by later phases
TOOLING: node, python, Playwright MCP, /wp-blocks, /sgs-db
ON-CRITICAL-PATH: yes
TEST: Happy — run each audit, get a baseline report keyed to the A0 roster. Edge — a documented exception is
      not flagged. Fail — a component colour picker without enableAlpha IS flagged (regression-inject).
      Integration — the two STATIC audits wire into prebuild WARN-only; the LIVE-DOM audit does NOT (prebuild
      predates deploy) — it runs in CI/on-demand. Gate promotion (WARN→hard) is Phase 4 / UNIT H.

UNIT A+ — CONSISTENCY SCANNER framework  [the biggest repetitive-work eliminator — Bean-requested 2026-07-18]
PURPOSE: one registry-driven engine that finds every place the ~40 blocks diverge on how a control/panel/attr
         is built, and routes each divergence to standardise-or-justify. Attacks the root cause directly:
         "an agent just decided to do it differently." Consistency becomes a SCRIPT'S OUTPUT, not agent memory.
CORE DESIGN (do NOT diff against "the pilot block" — it drifts): diff the whole roster against a CANONICAL
         REGISTRY (the single source of truth). The pilot POPULATES the registry; every future improvement is
         ONE registry edit; the scanner always diffs blocks → registry. Same shape as the parity/conformance
         exception files (golden master + reasons-list).
ENGINE: `scripts/consistency/scan.py|.js` takes (dimension-key, registry) → a block×item matrix with per-row
         disposition = MATCH / OLD-FORMAT(codemoddable) / BESPOKE / MISSING-EXPECTED / EXTRA. Written ONCE
         (a SONNET build — the engine + the JSX-AST extractors are real engineering, NOT no-LLM); thereafter
         RUNNING a scan is a free deterministic script.
EXTRACTOR COMPLEXITY IS NOT UNIFORM (do not under-resource): dims 3–4 (attr-name/shape, defaults) read
         declarative `block.json` — genuinely small. dims 1/2/6/8 (control-type, group-name, responsive-switcher
         presence, hover panels) require parsing imperative `edit.js` JSX via AST across ~40 heterogeneous blocks
         (spreads, conditional render, mapped repeaters) — the reliability-hard part; budget Sonnet for these
         extractors and expect a residue the AST can't classify (→ Haiku).
8 DIMENSION CONFIGS (Bean chose all 8):
  1. control-type   — colour/link/typography/box/shadow/spacing → blessed component + props (Idea 1)
  2. group-name     — same-named inspector panel → canonical control set + toggles (Idea 2)
  3. attr-name/shape— same semantic attr named/shaped consistently (kills textColour/textColor D338; flat-vs-object box)
  4. default-values — same control defaults the same (kills the heading fontSize:28 scale-flatten)
  5. range/unit/step— a control's min/max/step/units consistent across blocks
  6. responsive     — which props expose the 768/1024 switcher; flag a block missing it where its peers have it
  7. a11y           — image blocks have alt/decorative toggle; icon buttons have aria-label
  8. state/hover    — StateToggleControl vs bespoke hover panels
FILES: scripts/consistency/scan.{py,js} (engine); scripts/consistency/registries/*.json (8 configs, pilot-seeded);
       scripts/consistency/divergence-exceptions.json (justified divergences + reasons)
SEQUENCING GUARD: a dimension's extractor MUST be built + validated before the Wave that consumes it runs
         (dims 1–5 ready before UNIT E; dims 6–8 before UNIT F). Don't interleave extractor authoring with the
         rollout that depends on it.
INPUTS: UNIT A0 roster; UNIT D pilot output seeds registries dims 1–2 first (then all 8 filled incrementally)
OUTPUTS: per-dimension divergence report → drives Wave-1/2 rollout as scan→codemod→judge (not block-by-block)
TOOLING: node/python (AST), /wp-blocks, /sgs-db, jscodeshift (codemod for OLD-FORMAT rows)
ON-CRITICAL-PATH: partially (engine + dims 1–2 in Phase 0; dims 3–8 fill during Waves)
TEST: Happy — scan dim-1 (colour) reports every block's colour-control status keyed to the registry. Edge — a
      recorded justified divergence is not re-flagged. Fail — a block using the OLD colour format IS flagged
      OLD-FORMAT and the codemod dry-run rewrites it. Integration — a MISSING-EXPECTED row (peer blocks have a
      control this one lacks) is surfaced for add. The ONLY LLM step is judging BESPOKE/EXTRA rows (Haiku), per
      cluster not per block.

UNIT B — Wave-1 shared components (framework-wide, low cost)
PURPOSE: build/upgrade the shared components every block will adopt
FILES: src/components/DesignTokenPicker.js (ADD enableAlpha + clearable);
       src/components/SgsLinkControl.js (NEW — LinkControl wrapper: internal search + new-tab + rel);
       src/components/ShadowControl.js (NEW — real X/Y/blur/spread/colour+alpha builder + presets);
       src/components/index.js (export new); includes/helpers-*.php (render helpers for shadow/link)
INPUTS: none (self-contained)
OUTPUTS: components consumed by Phase 0 pilot + Phase 1 rollout
TOOLING: /wp-block-development, /library-docs (WP component API), /sgs-wp-engine
ON-CRITICAL-PATH: yes
TEST: full 4-layer per component in phase-planner. Headline: alpha colour renders transparent live;
      LinkControl internal search finds a page; ShadowControl emits a real multi-value shadow.

UNIT C — min-width:0 (+min-height:0) wrapper safeguard  [DESIGN-GATE]
PURPOSE: land the framework backstop for shrink-to-fit (grid/flex-item blow-out guard)
FILES: includes/class-sgs-container-wrapper.php + the shared grid/flex CSS emit
INPUTS: none
OUTPUTS: backstop for the shrink-to-fit standard
TOOLING: /sgs-wp-engine, Playwright (before/after measure on real pages), /qc-council (shared-surface)
ON-CRITICAL-PATH: yes (blocks the shrink-to-fit standard being "landed")
PRE-BUILD APPROVAL: **GATE C0 (below) fires BEFORE this unit is built** — shared-wrapper change =
      7-rules #7 design-gate + Bean sign-off first. UNIT D consumes C, so C0 is sequenced ahead of both.
TEST: measure a known offender (the testimonial-slider case) before/after at 360px; confirm no regression
      on 3+ real pages (band/grid/hero). Because D tests shrink-to-fit with C toggled OFF, C and the
      intrinsic-responsiveness proof stay falsifiable (no two-overlapping-fixes ambiguity).

UNIT D — PILOT: sgs/media to full Spec 35 DONE  [proves all 3 threaded constraints]
PURPOSE: the first slice — one block that proves feature-parity + shrink-to-fit + media-controls at once
TASK D1 — media-controls DECISION (do this FIRST, timeboxed): compare sgs/media vs Kadence/Spectra/
       GenerateBlocks media blocks + core/image+core/video capabilities → decide the control SET to add;
       any control not built now is Wave-mapped. This decision (a committed control list) is the pilot's
       first deliverable and a Gate-0 metric — it is what "media-controls evaluated" means concretely.
ARCHITECTURAL FORK to resolve at D1 (surfaced by cold review): sgs/media deliberately OPTS OUT of the
       shared `supports.sgs.imageControls` extension (its block.json is the cloning converter's source of
       truth). So the pilot proves media controls on the BLOCK-PRIVATE path. Decision: the exemplar sgs/media
       seeds framework-wide is the **control SET + parity bar + a11y**, NOT the code path — image blocks that
       DO use the `imageControls` extension get the same set via UNIT F's extension work. Do NOT re-opt
       sgs/media into the extension (would break its converter-source-of-truth design). State this in the pilot.
CONVERTER caveat: every NEW attr added here is classed editor-only (authored) OR gets a converter-population
       note (else it's a dead control on clones — see scope table).
SECURITY (non-deferrable on the pilot): sgs/media has an SVG mode taking raw `svgContent` → add
       sanitise-on-upload (Part C security item) in this unit; it cannot wait for a Wave.
FILES: src/blocks/media/* (block.json, edit.js, render.php, style.css, view.js); consumes UNIT B + C
INPUTS: UNIT A (checklist+audits+roster), UNIT B (components), UNIT C (backstop, gated by C0)
OUTPUTS: the control-set/parity/a11y exemplar; the concrete media-controls decision; SVG sanitisation;
       **SEEDS the UNIT A+ consistency registries (dims 1–2 first)** — the pilot's blessed controls become the
       canonical entries the scanner then propagates roster-wide
TOOLING: design-reviewer agent, Playwright, /visual-qa, competitor media-block comparison
ON-CRITICAL-PATH: yes
TEST: Happy — static inspector-conformance audit passes on sgs/media. Edge — video AND image modes both
      complete (video parity includes core/video's preload + `<track>`/captions; image parity includes
      lightbox/duotone/sizeSlug/focal — or each is exception-mapped). Fail — parity audit shows 0 *unexplained*
      gaps vs core/image+core/video (closed or Wave-mapped). Intrinsic — shrink-to-fit clean at the device
      tiers on a live page WITH UNIT-C BACKSTOP DISABLED. Sign-off — Bean's eye (R-31-13).

UNIT E — Wave-1 framework-wide rollout  (now SCAN → CODEMOD → JUDGE, not block-by-block)
PURPOSE: propagate the registry's blessed controls across all blocks via the UNIT A+ scanner
METHOD: run the scanner (dims 1–5) → OLD-FORMAT rows go to the jscodeshift CODEMOD (deterministic bulk
       rewrite: enableAlpha, SgsLinkControl swap, ShadowControl swap) → the codemod's flagged residue +
       BESPOKE/MISSING rows go to Haiku → justified divergences recorded in divergence-exceptions.json.
       Client patterns → templateLock:"contentOnly".
INPUTS: UNIT A+ (scanner+registry), UNIT B (components), UNIT D (proven pattern + seeded registry)
OUTPUTS: framework-wide alpha/link/shadow/client-safe-editing, converged to the registry
TOOLING: UNIT A+ scanner + jscodeshift codemod, Haiku fan-out for residue, wp-sgs-developer
CODEMOD SAFETY GATE (required — a bulk rewrite can still-parse yet be functionally broken): the codemod
       runs DRY-RUN first → the diff is reviewed (Haiku for bulk, Sonnet for the shape-changing SgsLinkControl
       swap where url→{url,opensInNewTab,rel}) → apply → then a post-apply check (build passes + a sampled block
       renders correctly live) before commit. No blind bulk apply.
ON-CRITICAL-PATH: no
TEST: re-run scanner dims 1–5 = 0 unexplained divergences; static inspector-conformance audit = 0 findings;
      codemod dry-run diff reviewed + post-apply render check passed on a sample.

UNIT F — Wave-2 capability builds
PURPOSE: MediaGalleryPicker (bulk logos) + imageControls extension (size/aspect/object-fit/focal, carrying
         the pilot's decided control SET to extension-using image blocks) + whole-card clickable-link +
         ToolsPanel disclosure on dense panels + reduced-motion gate on all animation +
         decorative-image toggle + general ARIA-label control (Part C a11y / E6)
FILES: src/components/MediaGalleryPicker.js (NEW); src/extensions/image-controls* (EXTEND — verify current
       name before "extend"); sgsBlockLink extension (VERIFY it exists, then EXTEND for overlay-<a>);
       brand-strip + card-grid + team + product + testimonial
INPUTS: UNIT B, UNIT D, UNIT A+ (scanner dims 6–8 = responsive/a11y/state drive the coverage sweep)
OUTPUTS: bulk media, full image controls, whole-card links, roster-wide responsive/a11y/state coverage
TOOLING: UNIT A+ scanner (dims 6–8), wp-sgs-developer, design-reviewer, Haiku fan-out for coverage residue
ON-CRITICAL-PATH: no
TEST: brand-strip adds 6 logos in one action; a card is fully clickable; animations respect reduced-motion;
      scanner dims 6–8 = 0 unexplained gaps (every peer-missing responsive/a11y/state control added or justified).

UNIT G — Wave-3 adopt-native / architectural
PURPOSE: migrate bespoke → native where a WP mechanism exists (Block Bindings for dynamic content;
         native duotone/aspect-ratio/sticky over hand-rolled; Section Styles for same-structure variants;
         audit pattern categories/blockTypes; consider Interactivity API for hand-rolled view.js) +
         conditional/display controls (Part C — by device/login-role/date/query) +
         theme.json v3 `styles.blocks.<name>.css` + appearanceTools (Part G HIGH) +
         CSS filters/backdrop-filter/mix-blend/clip-path (Part C premium)
FILES: various — per-audit findings
INPUTS: UNIT A audits, UNIT E/F complete
OUTPUTS: less bespoke code, WP-aligned direction
TOOLING: /brainstorming (per architectural decision), /qc-council, wp-sgs-developer
ON-CRITICAL-PATH: no
TEST: per-item; each replaces a hand-rolled system with a native support with no regression.

UNIT H — Conformance sweep + parity + shrink-to-fit across all blocks; promote gate
PURPOSE: run all three audits across the whole roster; close/□explain every finding; promote audits from WARN→gate
FILES: every remaining block; prebuild gate promotion; /doc-audit citing Spec 35 per block
INPUTS: UNIT E, F, G
OUTPUTS: the closing gate — Spec 35 conformance enforced structurally
TOOLING: /dispatching-parallel-agents, /doc-audit
ON-CRITICAL-PATH: yes (closes the spec)
TEST: all three audits green across the roster; every exception named + spec-mapped.
```

### Dependency graph

```
        ┌───────────────────────────────────────── critical path ─────────────────────────────────────┐
A (checklist+audits+roster) ─┐
A+ (consistency scanner engine) ─┤
B (Wave-1 components) ───────────┼──► D (PILOT sgs/media, seeds registry) ──► E (scan→codemod→judge) ─┐
C (min-width:0 safeguard, C0-gated) ─┘                                        F (Wave-2, scanner dims6-8) ┼──► H (close)
                                                                             G (Wave-3 native) ───────────┘
```

- **Parallel opportunities:** A, A+ (engine), B, C all independent → run concurrently in Phase 0. E, F, G
  become scanner-driven (scan→codemod→judge) rather than block-by-block agent fan-out.
- **Critical path (minimum timeline):** A/A+/B/C → D → E → H. Everything else parallelises off it.
- **A+ note:** engine + registry dims 1–2 land in Phase 0 (seeded by the pilot); dims 3–8 fill during Waves.
- **Tooling availability:** node ✓, python ✓, Playwright MCP ✓, /wp-blocks ✓, /sgs-db ✓,
  wp-sgs-developer ✓, design-reviewer ✓ — all present.

---

## Phase 2.5 — DELEGATION TIERING (work-reduction — push work DOWN the cost ladder)

Principle: do the maximum at the cheapest tier. A thing a deterministic **script** can do must never
be given to an agent; a thing **Haiku** can do must never be given to Sonnet; **Sonnet** handles design;
**Opus/inline** handles only gates + irreversible decisions. Four levers drive most of the saving.

### The four work-reduction levers (this is where the effort actually drops)

1. **The audits ARE the enforcement — write them once, they replace all manual checking forever.**
   Conformance, parity, and shrink-to-fit are DETERMINISTIC scripts (AST/JSON diff + Playwright overflow
   check). Once they exist (Tier-0), *no agent ever hand-grades a block for these again* across the whole
   roster or any future block. The standard is enforced by a script, not by re-reading 40 sidebars.
2. **The CONSISTENCY SCANNER (UNIT A+) turns roster-wide standardisation into scan→codemod→judge.**
   One registry-driven engine finds every divergence across 8 dimensions (control/group/attr/default/range/
   responsive/a11y/state); OLD-FORMAT rows are bulk-rewritten by a `jscodeshift` codemod; only the BESPOKE/
   EXTRA residue needs a cheap Haiku judgment. This is the lever that kills the "every agent did it
   differently" tax — it replaces ~40 per-block agent passes with one scan + one codemod + a short queue.
3. **Wave rollouts are codemods + Haiku residue, not 40 Sonnet runs.** The codemod does the deterministic
   bulk (enableAlpha, LinkControl swap, ShadowControl swap); Haiku handles what the codemod flags.
4. **Only component-design + the pilot + Wave-3 architecture need Sonnet/Opus.** Everything else is
   script-generated or Haiku-mechanical. The reasoning budget is spent on ~4 things, not ~40.

### Per-unit tier map

> **Build vs run — the key distinction (grader-flagged):** *RUNNING* a script/codemod/audit is Tier-0 (free,
> deterministic). *BUILDING* a JSX-AST extractor, a jscodeshift codemod, or an audit script is **Sonnet**
> engineering — it sits in the Tier-2 column, not Tier-0. The saving is that the build is ONCE and the runs
> are unlimited-and-free thereafter.

| Unit | Tier-0 SCRIPT-RUN (no LLM) | Tier-1 HAIKU (mechanical) | Tier-2 SONNET (build + design) | Tier-3 OPUS/inline |
|---|---|---|---|---|
| A — checklist + audits | roster query (A0); RUN the audits; DONE-checklist transcription | Wave-map the parity gap-report rows into the exceptions file | **BUILD the 3 audit scripts** (deliverable); audit *design* (what "meaningful gap" means) | — |
| A+ — consistency scanner | RUN scans + the codemod dry-run; dims 3–4 (block.json) extractors are near-trivial | judge BESPOKE/EXTRA rows per cluster; record justified divergences | **BUILD the engine + JSX-AST extractors (dims 1/2/6/8) + the jscodeshift codemod**; registry schema design | codemod dry-run diff review (shape-changing swaps) |
| B — shared components | export wiring | prop plumbing / stories | **build ShadowControl / SgsLinkControl / MediaGalleryPicker** (real design) | — |
| C — min-width:0 backstop | before/after Playwright measure script | — | the CSS change | **C0 design-gate decision** |
| D — PILOT sgs/media | run the audits against it; SVG sanitiser is a known routine | apply agreed control wiring | **the pilot build + fork/media-controls decision** | **D1 control-set decision; Gate 0** |
| E — Wave-1 rollout | RUN the codemod (enableAlpha + LinkControl swap, bulk) | fix the codemod's flagged residue per block; token-only-picker exceptions | codemod dry-run diff review before apply | — |
| F — Wave-2 builds | — | apply MediaGalleryPicker/imageControls/whole-card-link to disjoint blocks (proven pattern) | MediaGalleryPicker + imageControls extension *design* | — |
| G — Wave-3 native | pattern-category audit script | mechanical native-support swaps | **each native migration (Block Bindings, Section Styles) — /brainstorming each** | per-item go/no-go |
| H — sweep + gate promote | **run all 3 audits across roster; promote WARN→gate** | close mechanical tail findings | — | Gate 3 close |

Net effect vs a naive "one Sonnet agent per block" plan: the ~40-block sweeps (A-checks, A+ consistency
standardisation, E-rollout, H-close) move to **scripts + codemod + Haiku**; Sonnet is reserved for ~4
component/pilot/architecture builds; Opus/inline only for the gates. That is the intended shape of "Bean as
QC only" — the enforcement AND the standardisation are mechanical, not manual, and stay that way for every
future block (registry + scanner + audits are permanent framework tooling, not one-off cleanup).
(Route each dispatch via `/delegate`; `~/.agents/skills/shared-references/model-routing.md` is the source of truth.)

---

## Phase 3 — ASSESS (risk + effort)

### Risk register (per unit + plan-level)

| Risk | Unit | Impact | Likelihood | Mitigation (applied, not just listed) |
|---|---|---|---|---|
| **Shared-wrapper min-width:0 breaks a real page** | C | High | Low | Design-gate + before/after Playwright measure on 3+ real pages BEFORE commit; proven low-risk last session; roll back fast (STOP-19). |
| **Parity audit over-reports** (core attr with no meaningful SGS equivalent) | A | Med | Med | Named-exception file (like `dead-controls-baseline.json`); a gap must be *closed or explained*, never silently baselined. |
| **enableAlpha rollout regresses a block's colour** (functional-notation strip, D302) | B/E | Med | Med | Normalise to hex8 (alpha) in the shared colour helper — BUT prove it survives the no-inline SCOPED-style channel on the FIRST Wave-1 block before fan-out (the `safecss` fix was for inline; alpha-on-scoped-style needs its own live proof, not an assumed carry-over). Audit catches missed ones. |
| **Media-controls scope creep** (input 3 balloons the pilot) | D | Med | Med | Evaluate → decide the control set as the pilot's FIRST task, timebox it, map any deferred control to a Wave. |
| **Gate promoted too early** blocks the co-active build | A/H | Med | Low | Audits ship WARN-only (informational) first; promote to hard gate only at Phase 4 (UNIT H), after the roster is clean. Aligns with `a11y-validation-informational-not-gate`. |
| **Shared branch collision with Track 2** (header/footer rebuild, same branch/worktree) | all | High | Med | Path-scope every commit; never `git add -A`; never branch-switch; merge to main only via isolated `git worktree` (per guardrails + memory). Spec 35 touches `src/blocks/*` + `src/components/*`; Track 2 touches header/footer/nav — low file overlap, but verify per commit. |
| **"Done" claimed on prose not machine-evidence** | H | Med | Low | Definition-of-done = the three audits green + Bean's eye; STOP-29 spec-scope mapping for every deferral. |

Plan-level pre-mortem: the failure mode this plan is built to avoid is exactly the one memory warns
about — the three threaded requirements getting under-delivered because they only "justify" the work
instead of constraining it. Countermeasure: they are the pilot's (Phase 0) acceptance criteria, proven
live before any rollout.

### Effort estimate (3-point PERT, ADHD Tax shown)

Calibrated against the no-inline rollout (same shape). Raw → ×2 mechanical / ×3 creative.

| Unit | Optimistic | Realistic | Pessimistic | PERT raw | With ADHD Tax | Band |
|---|---|---|---|---|---|---|
| A — checklist + 3 audits (BUILD) | 20 min | 40 min | 90 min | ~45 min | ~90 min (×2) | Session |
| A+ — scanner engine + dims 1–2 + codemod (BUILD, Sonnet) | 60 min | 120 min | 300 min | ~140 min | ~5 h (×3, JSX-AST) | multi-session |
| A+ — dims 3–8 extractors (incremental, during Waves) | — | ~30–60 min/dim | — | — | dims 3–4 trivial, 6/8 harder | spread over Waves |
| B — 3 shared components | 30 min | 60 min | 120 min | ~65 min | ~2 h (×2) | Session×2 |
| C — min-width:0 safeguard + design-gate | 10 min | 20 min | 45 min | ~22 min | ~45 min (×2) | Block |
| D — PILOT sgs/media | 45 min | 90 min | 180 min | ~100 min | ~5 h (×3, creative) | multi-session |
| **Phase 0 total (A+A+engine+B+C+D)** | — | — | — | — | **~1.5 focused days** with subagent fan-out (A+ adds the scanner build) | — |
| E — Wave-1 rollout | — | ~5–15 min/block × fan-out | — | — | parallelised | Session |
| F — Wave-2 builds | 60 min | 120 min | 240 min | ~130 min | ~4 h (×2) | multi-session |
| G — Wave-3 native | — | per-item, /brainstorming each | — | — | own sessions | multi-session |
| H — sweep + promote gate | 30 min | 60 min | 120 min | ~65 min | ~2 h (×2) | Session |

Estimates deliberately optimistic per `time-estimates` rule — recovery from "took a bit longer" is
cheap; an inflated figure stalls the start.

---

## Phase 4 — GATES

```
GATE C0 — SHARED-WRAPPER PRE-BUILD DESIGN-GATE (Bean sign-off)   [fires INSIDE Phase 0, BEFORE UNIT C is built]
BEFORE: building UNIT C (min-width:0 wrapper safeguard)
PASS CRITERIA: the min-width:0 (+min-height:0) approach is design-gated (before/after measurement plan
               on 3+ real pages agreed) + Bean approves the shared-wrapper change (7-rules #7).
DECISION POINT: Bean approves the wrapper change → UNIT C builds. If not approved, the shrink-to-fit
               standard rests on per-block intrinsic fixes only (no framework backstop) — plan still runs.
READINESS SCORE: 92 (proven low-risk last session; measurement plan clear; one shared file) — Ready.
TYPE: go/no-go (pre-build, shared-surface)

GATE 0 — FIRST SLICE (Bean sign-off)   [go/no-go — THIS is what Bean approves as the phase deliverable]
AFTER: A, B, C, D complete
PASS CRITERIA (all three threaded constraints get a crisp metric — none softer than the others):
  • MEDIA-CONTROLS (input 3): the D1 competitor comparison is done + the control SET is decided and
    committed to sgs/media; every candidate control is either built or Wave-mapped (no undecided set).
  • FEATURE-PARITY (input 1): parity audit = 0 *unexplained* gaps vs core/image+core/video (each real gap
    — preload/track/lightbox/duotone/sizeSlug — closed OR in `feature-parity-exceptions.json` with a Wave).
  • SHRINK-TO-FIT (input 2): audit clean at the device tiers on a live page WITH the UNIT-C backstop
    DISABLED (proves intrinsic, not backstop-rescued).
  • Plus: static inspector-conformance audit passes on sgs/media; SVG sanitise-on-upload live; Bean's eye (R-31-13).
FAIL CRITERIA: any of the three threaded constraints not provable on the pilot → stop, fix the STANDARD
               (not just the block) before rolling out.
DECISION POINT: Bean approves the standard + the pilot → unlocks the framework-wide waves.
READINESS SCORE: 95 (deps met, risks mitigated, calibrated, first action <5 min) — Ready.
TYPE: go/no-go

GATE 1 — Wave-1 rolled out
AFTER: E
PASS: static inspector-conformance audit = 0 unexplained findings for enableAlpha / LinkControl / shadow
      across the A0 roster.
READINESS SCORE: 88 (depends on Gate 0 proving the pattern + UNIT B shipped; disjoint-file fan-out is
      well-understood from the no-inline rollout) — Ready once Gate 0 passes.
TYPE: auto-gate (static audit is the gate)

GATE 2 — Wave-2/3 capabilities
AFTER: F, G
PASS: MediaGalleryPicker + imageControls extension + whole-card link + decorative-image/ARIA-label live;
      native-over-bespoke migrations done or spec-mapped; every animation reduced-motion-gated.
READINESS SCORE: 72 (Wave-3 architectural items — Block Bindings, Section Styles — each need their own
      /brainstorming; real-rewrite cost; scored lower deliberately) — Ready after Gate 1, per-item design.
TYPE: review-gate (Bean's eye on the new capabilities)

GATE 3 — SPEC CLOSE
AFTER: H
PASS: all three audits green across the A0 roster (0 unexplained); the two STATIC audits promoted
      WARN→hard-gate (live-DOM audit stays CI/on-demand); every exception named + mapped to a Spec 35
      Part/Wave; /doc-audit cites Spec 35 per block.
READINESS SCORE: 80 (mechanical sweep once E/F/G land; risk is tail-end findings — the loop-until-clean
      pattern handles it) — Ready after Gate 2.
TYPE: go/no-go (Spec 35 declared complete)
```

---

## Phase 5 — first action (≤5 min, zero deps)

**Create the sibling DONE checklist file** — copy `block-migration-DONE-checklist.md`'s shape and
paste Spec 35 Part L's ~22 end-conditions as tick-boxes. Pure transcription, no dependencies, <5 min.
That is the on-ramp into UNIT A (which then does A0 — enumerate the roster from the DB).

### Per-phase handoff to /phase-planner

```
[Phase 0 — handoff]  Trigger: /phase-planner scope="Spec 35 Phase 0 — foundations + sgs/media pilot"
  Entry context: Spec 35 (full), this plan, block-migration-DONE-checklist.md, block-replacements.json,
                 src/components/{DesignTokenPicker,MediaPicker,StateToggleControl}.js, src/blocks/media/*,
                 includes/class-sgs-container-wrapper.php
  Plan-Level Label hint: [PLAN: opus for D + C design-gates; sonnet/haiku fan-out for A + B builds]

[Phase 1 — handoff]  Trigger: /phase-planner scope="Spec 35 Wave-1 framework rollout"  (after Gate 0)
[Phase 2 — handoff]  Trigger: /phase-planner scope="Spec 35 Wave-2/3 capability builds"  (after Gate 1)
[Phase 3 — handoff]  Trigger: /phase-planner scope="Spec 35 conformance sweep + gate promotion"  (after Gate 2)
```

---

## KJC / pre-emptive decisions (to confirm at sign-off)
1. **Pilot block = sgs/media** (not brand-strip). Rationale: proves all three constraints at once.
   Brand-strip becomes the MediaGalleryPicker consumer in Wave-2. *Bean can pick a different pilot.*
2. **Audits ship WARN-only first, promote to hard-gate at close** — keeps the co-active Track 2 build
   unblocked (informational-not-gate policy).
3. **Feature-parity uses a named-exception file** (`feature-parity-exceptions.json`) that covers BOTH
   (a) audit over-reports AND (b) legitimately-deferred core capabilities mapped to a Wave — a gap is
   closed or Wave-mapped, never silently baselined. Distinct from the conformance audit's own baseline.
