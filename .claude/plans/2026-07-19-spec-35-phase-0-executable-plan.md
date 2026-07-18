---
doc_type: phase-plan
title: Spec 35 Phase 0 — foundations + sgs/media pilot (executable step plan)
project: small-giants-wp
spec: 35-BLOCK-INSPECTOR-UX-STANDARD.md
parent_plan: .claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md
created: 2026-07-19
status: DRAFT — awaiting Bean sign-off on the pilot-block KJC + Gate C0
---

# Phase 0 — Spec 35 foundations + sgs/media pilot

**USP:** This is the slice that makes "Bean as QC only" real — it builds the *scripts* that enforce
block-inspector quality forever (no more hand-checking 40 sidebars) and proves the three Bean-locked
standards (feature-parity, shrink-to-fit, media-controls) on ONE live pilot block before any rollout.

**Plan label:** [PLAN: opus] — the pilot build + two shared-surface design-gates need multi-hop reasoning;
Sonnet/Haiku fan-out for the script/component builds.
**Docscore:** (in-flight active plan — graded at archive)
**Aggregate cost estimate:** ~1.5 focused days wall-time with subagent fan-out (parent Opus stays free;
Sonnet builds the audits/components/scanner; Haiku handles residue). Critical path C0→C→D ≈ half a day.

**Phase success criteria (done when):**
- [ ] DONE-checklist created (✅ done — `2f7d8d85`) + roster enumerated from the DB (A0).
- [ ] 3 audits BUILT + producing baseline reports keyed to the roster (2 static WARN-only, 1 live-DOM on-demand).
- [ ] 3 Wave-1 shared components landed: `DesignTokenPicker` alpha+clearable, `SgsLinkControl`, `ShadowControl`.
- [ ] Consistency-scanner engine + registry dims 1–2 + codemod built (seeded by the pilot).
- [ ] `min-width:0` wrapper backstop built — AFTER Gate C0 sign-off.
- [ ] `sgs/media` pilot passes all three threaded constraints LIVE (parity 0-unexplained-gaps; shrink-to-fit
  clean with backstop OFF; media-control set decided + built/Wave-mapped) + SVG sanitise-on-upload live.
- [ ] Gate 0 signed off by Bean → unlocks the framework-wide waves.

**Entry context (read before starting):**
- `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — the standard (read in full; Part L = the checklist source).
- `.claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md` — the macro plan / wave map / tier map.
- `.claude/plans/spec-35-inspector-DONE-checklist.md` — the enforceable end-conditions (this session's first action).
- `.claude/plans/block-migration-DONE-checklist.md` — sibling (rendered-output/no-inline); shows overlap items.
- `plugins/sgs-blocks/src/components/{DesignTokenPicker,MediaPicker,StateToggleControl}.js` — components to upgrade/pattern-match.
- `plugins/sgs-blocks/src/blocks/media/*` — the pilot block (block.json, edit.js, render.php, style.css, view.js).
- `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` — the shared wrapper (UNIT C target).
- `plugins/sgs-blocks/scripts/data/block-replacements.json` — the core→SGS replaces map (parity audit input).

**References:**
- Spec 35 Part L (checklist), Part C (parity items), Part I (component action layer), Part J (wave sequencing).
- memory: `sgs-block-feature-parity-with-replaced-core`, `blocks-must-shrink-to-fit-container`,
  `a11y-validation-feedback-informational-not-gate`, `no-version-bumps-or-deprecations-preproduction`,
  `requirement-used-to-justify-is-not-requirement-made-a-design-constraint` (why the 3 standards are pilot-first),
  `recheck-branch-immediately-before-every-commit-on-shared-worktree` + `merge-to-main-via-isolated-worktree-when-shared`.
- D302 (`safecss` strips functional colours → hex8 normalise for alpha), D303 (class-scoped uid not id).

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /sgs-db, /wp-blocks | A0 roster |
| skill | /wp-block-development, /library-docs | B components |
| skill | /qc-council | Gate C0 (shared surface), D1 fork |
| skill | /visual-qa | D pilot |
| agent | wp-sgs-developer | B, C, D builds |
| agent | design-reviewer | D pilot |
| mcp | Playwright | shrink-to-fit audit, C before/after, D pilot |
| cli | node, python, jscodeshift | A audits, A+ scanner/codemod |

---

## Steps

Step 0 — First action (DONE)
  Model:   inline
  Action:  Create `.claude/plans/spec-35-inspector-DONE-checklist.md` from Part L.
  Outcome: ✅ committed `2f7d8d85` (path-scoped, branch-verified).
  Marker:  (done)

Step 0b — QC brand-strip as the reference exemplar   [KJC-1 resolution — Bean]
  Model:       sonnet (design-reviewer agent)
  Action:      brand-strip was already reworked on this branch. QC its inspector against the DONE-checklist +
               the 3 threaded standards; capture its quality signal into a SHORT exemplar note
               (`.claude/plans/spec-35-brand-strip-exemplar-note.md`) that the sgs/media pilot dispatch prompts
               cite as "the kind of result Bean wants". Fix any DONE-checklist misses found (path-scoped commit).
  Files:       plugins/sgs-blocks/src/blocks/brand-strip/*, .claude/plans/spec-35-brand-strip-exemplar-note.md (new)
  Inputs:      the DONE-checklist, Spec 35 Part L + threaded standards, live editor + rendered page
  Outcome:     brand-strip verified (or fixed) to the bar + a reusable exemplar note exists for the pilot.
  Exec:        PARALLEL with steps 1–8 (independent of the roster/audit/component builds)
  Deps:        none
  Marker:      (none)
  Time:        20 min (QC of already-reworked block)
  Tooling:     design-reviewer agent, Playwright, /visual-qa, the DONE-checklist
  On-Fail:     if brand-strip has a real DONE-checklist miss, fix it inline (it's the exemplar — it must actually pass).
  Test:
    Happy:       run the inspector-conformance audit against brand-strip → clean or documented exception.
    Edge:        brand-strip's bulk-logo need is noted as the Wave-2 MediaGalleryPicker driver (not fixed here).
    Fail:        a half-built control on the exemplar IS surfaced + fixed before it seeds the pilot.
    Integration: the exemplar note is cited in the Step 11 pilot dispatch prompt.

Step 1 — UNIT A0: enumerate the block roster from the DB  [SESSION-START]  ✅ DONE
  Model:       inline
  Action:      Query `/sgs-db` + `/wp-blocks` for the authoritative block list + which blocks declare a
               styling/colour/link/media/animation surface. Write the result to
               `plugins/sgs-blocks/scripts/consistency/roster.json` (the audit denominator). Never hardcode a count.
  Files:       plugins/sgs-blocks/scripts/consistency/roster.json (new)
  Inputs:      the live DB (sgs-framework.db)
  Outcome:     ✅ DONE — `scripts/consistency/{build-roster.py,roster.json}`: 79 SGS built blocks (styling=64,
               colour=61, link=18, media=23, animation=17; 22 with a `replaces` map). Regenerate after /sgs-update.
  Exec:        SEQUENTIAL (gates every later audit denominator)
  Deps:        none
  Marker:      SESSION-START
  Time:        10 min
  Tooling:     /sgs-db, /wp-blocks
  On-Fail:     if the DB query returns 0 rows, STOP — `/sgs-update` may be stale; re-run it before proceeding.
  Cold-Entry:  this plan + Spec 35 + the DONE-checklist.
  Test:
    Happy:       run the query → roster.json has N blocks with surface flags.
    Edge:        a block with NO styling surface (pure structural) is present but flagged surface:false — not dropped.
    Fail:        DB unreachable → clear error, no partial file written.
    Integration: roster.json path is read by all 3 audits (Steps 2–4) + the scanner (Step 8).

Step 2 — UNIT A: build `audit-inspector-conformance.js` (STATIC)
  Model:       sonnet
  Action:      Build the JSX-AST + block.json static audit. Flags: component colour picker
               (`DesignTokenPicker`/`ColorPalette`) WITHOUT `enableAlpha` (NOT native `supports.color`);
               raw URL `TextControl` not `SgsLinkControl`; preset-only "shadow" SelectControl; animation with
               no reduced-motion gate; MediaUpload without MediaUploadCheck; missing `group` prop; ToolsPanel
               absent on 6+ control panels. Reads roster.json. Own exception file `inspector-conformance-baseline.json`
               (token-only brand pickers legitimately skip alpha). Emits a per-block report.
  Files:       plugins/sgs-blocks/scripts/audit-inspector-conformance.js (new),
               plugins/sgs-blocks/scripts/inspector-conformance-baseline.json (new, empty {} to start)
  Inputs:      roster.json, Spec 35 Part L + F, the DONE-checklist enforcement anchors
  Outcome:     running the audit produces a baseline report of conformance findings across the roster.
  Exec:        PARALLEL with steps 3,4,6,7,8
  Deps:        step 1 (roster)
  Marker:      (none)
  Time:        40 min build
  Tooling:     node, @babel/parser (JSX-AST), /wp-blocks
  On-Fail:     if an edit.js won't parse (spread/exotic JSX), log it to an `unparseable[]` list — never crash; residue is expected.
  Prompt:      [dispatch via /subagent-prompt when spawned — embed: roster.json path, the 8 flag rules above verbatim,
               the exception-file shape, "WARN-only: exit 0 always in Phase 0; never fail the build", and the
               `audit-inline-styling.js` existing audit as the shape reference].
  Test:
    Happy:       run → report lists each block's conformance status keyed to roster.json.
    Edge:        a baseline-file exception is NOT re-flagged.
    Fail:        regression-inject a colour picker without enableAlpha → it IS flagged.
    Integration: wires into prebuild WARN-only (exit 0); promoted to hard gate only at Spec close (Gate 3).

Step 3 — UNIT A: build `audit-feature-parity.py` (STATIC)   [needs KJC-2 decided]
  Model:       sonnet
  Action:      Build the parity audit. Reads block-replacements.json (core→SGS map) + each SGS block.json +
               the PINNED core-capability source (see KJC-2 — the installed `@wordpress/block-library` block.json
               set). Emits a core-capability→SGS-equivalent table; a row with no SGS equivalent = a gap → closed
               OR written to `feature-parity-exceptions.json` with a Wave mapping.
  Files:       plugins/sgs-blocks/scripts/audit-feature-parity.py (new),
               plugins/sgs-blocks/scripts/feature-parity-exceptions.json (new)
  Inputs:      scripts/data/block-replacements.json, roster.json, the pinned core source (KJC-2)
  Outcome:     running it emits a parity gap table; unexplained-gap count is the Gate-0 parity metric.
  Exec:        PARALLEL with steps 2,4,6,7,8
  Deps:        step 1 + KJC-2 (core-capability source pinned)
  Marker:      (none)
  Time:        40 min build
  Tooling:     python, /wp-blocks, /sgs-db
  On-Fail:     if block-replacements.json has a core block with no installed block.json, log gap as "source-missing" not crash.
  Prompt:      [dispatch via /subagent-prompt — embed the pinned core path from KJC-2, the exceptions-file shape,
               "a gap is closed OR Wave-mapped, never silently baselined", and the deferral-policy distinction].
  Test:
    Happy:       run → table maps each core capability of each replaced block to its SGS equivalent or a gap.
    Edge:        a core attr with a genuine SGS equivalent under a different name is matched (not a false gap).
    Fail:        core/video `preload` (known real gap on sgs/media) appears as an unexplained gap until closed/mapped.
    Integration: consumed at Gate 0 (parity metric) + Wave-mapping of every real gap.

Step 4 — UNIT A: build `audit-shrink-to-fit.js` (LIVE-DOM)
  Model:       sonnet
  Action:      Build the Playwright audit. For each block on a live page, assert the rendered root/section does
               NOT force horizontal overflow of its resolved container at 375/768/1440, run with the UNIT-C
               backstop toggled OFF (to prove intrinsic responsiveness, not backstop-rescued).
  Files:       plugins/sgs-blocks/scripts/audit-shrink-to-fit.js (new)
  Inputs:      roster.json, a live page URL with the blocks present, a backstop-off toggle mechanism
  Outcome:     running it reports per-block/per-tier overflow status; 0 forced overflow = pass.
  Exec:        PARALLEL with steps 2,3,6,7,8
  Deps:        step 1
  Marker:      (none)
  Time:        45 min build
  Tooling:     node, Playwright MCP
  On-Fail:     cannot run at prebuild (predates deploy) — runs CI/on-demand only; if no live page, skip with clear message.
  Prompt:      [dispatch via /subagent-prompt — embed 375/768/1440, scrollWidth>clientWidth overflow check,
               the backstop-off requirement, and that this is the T2 shrink-to-fit metric].
  Test:
    Happy:       run on a live page → per-block overflow report at 3 tiers.
    Edge:        a block that fits exactly at container width (scrollWidth==clientWidth) is PASS not fail.
    Fail:        a known offender (testimonial-slider-style) forcing overflow at 360px IS flagged.
    Integration: gate at Phase 4 close; NOT wired to prebuild.

QA Gate — A audits produce baselines
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 2–4 complete
  Check:   `node scripts/audit-inspector-conformance.js --json` exits 0 with a per-block array; `python
           scripts/audit-feature-parity.py --json` emits a gap table; `node scripts/audit-shrink-to-fit.js`
           runs against a live page. All three keyed to roster.json's block set.
  Pass:    three baseline reports exist, each covering every roster block (no silent denominator shrink).
  Fail:    a report covers fewer blocks than roster.json → the audit dropped blocks; fix enumeration before proceeding.
  Marker:  QA

Step 5 — UNIT B: DesignTokenPicker → add `enableAlpha` + `clearable`
  Model:       sonnet
  Action:      Add `enableAlpha` + `clearable` to `DesignTokenPicker`. CRITICAL: normalise the emitted colour to
               hex8 (alpha) in the shared colour helper — WP `safecss` STRIPS functional rgba (D302). Prove alpha
               survives the no-inline SCOPED-style channel (not just inline) on the first consuming block before fan-out.
  Files:       plugins/sgs-blocks/src/components/DesignTokenPicker.js, includes/helpers-*.php (colour helper)
  Inputs:      D302 memory (functional-colour strip), Spec 35 Part I (the framework-wide transparent fix)
  Outcome:     a colour picked with alpha<1 renders transparent LIVE via the scoped-style channel.
  Exec:        PARALLEL with steps 2,3,4,7,8
  Deps:        none
  Marker:      (none)
  Time:        45 min
  Tooling:     /wp-block-development, /library-docs, wp-sgs-developer
  On-Fail:     if alpha strips on the scoped channel too, STOP — this is a new finding, not a carry-over; investigate before fan-out.
  Prompt:      [dispatch via /subagent-prompt — embed D302, the hex8-normalise requirement, "prove on scoped-style LIVE"].
  Test:
    Happy:       pick 50% alpha → live computed background-color has alpha 0.5.
    Edge:        clearable → alpha-0 is distinguishable from "unset" (clears the attr, not sets transparent).
    Fail:        rgba() functional value would strip → hex8 path prevents it (verify live, D302).
    Integration: consumed by the pilot (Step 11) + Wave-1 rollout.

Step 6 — UNIT B: build `SgsLinkControl` (NEW)
  Model:       sonnet
  Action:      Build a `LinkControl` wrapper: internal-content search + new-tab + rel (nofollow/sponsored via
               `settings`). Attr shape `{url, opensInNewTab, rel}` (NOT a flat url string). Export from index.js.
  Files:       plugins/sgs-blocks/src/components/SgsLinkControl.js (new), src/components/index.js, includes/helpers-*.php (link render)
  Inputs:      Spec 35 Part C links, Part H (LinkControl)
  Outcome:     internal search finds a page; emitted attr is the object shape; render outputs correct rel + target.
  Exec:        PARALLEL with steps 2,3,4,5,8
  Deps:        none
  Marker:      (none)
  Time:        40 min
  Tooling:     /wp-block-development, /library-docs, wp-sgs-developer
  On-Fail:     revert component; blocks keep raw URL fields until fixed (no regression).
  Prompt:      [dispatch via /subagent-prompt — embed the {url,opensInNewTab,rel} shape + auto-rel-noopener on new-tab].
  Test:
    Happy:       type a page title → internal search suggests it; select → url populated.
    Edge:        new-tab on → rel gains noopener automatically.
    Fail:        empty url → clears cleanly, no broken `<a href="">`.
    Integration: consumed by pilot + Wave-1 codemod (url→{url,opensInNewTab,rel} shape-change swap).

Step 7 — UNIT B: build `ShadowControl` (NEW)
  Model:       sonnet
  Action:      Build a real shadow builder: X/Y/blur/spread/colour+alpha/inset + presets on top (multi-layer ideal).
               Replaces None/Small/Medium selects.
  Files:       plugins/sgs-blocks/src/components/ShadowControl.js (new), src/components/index.js, includes/helpers-*.php (shadow render)
  Inputs:      Spec 35 Part B (shadow row), Part I (BUILD shared ShadowControl)
  Outcome:     emits a real multi-value box-shadow string; presets seed the builder, not replace it.
  Exec:        PARALLEL with steps 2,3,4,5,6
  Deps:        none
  Marker:      (none)
  Time:        50 min
  Tooling:     /wp-block-development, /library-docs, wp-sgs-developer
  On-Fail:     revert; blocks keep preset selects until fixed.
  Prompt:      [dispatch via /subagent-prompt — embed the X/Y/blur/spread/colour+alpha/inset field set + preset-on-top].
  Test:
    Happy:       set X=4 Y=4 blur=8 colour=rgba → live box-shadow matches.
    Edge:        inset toggle produces `inset` keyword.
    Fail:        empty → no shadow (not `0 0 0 0`).
    Integration: consumed by pilot + Wave-1 codemod (shadow-select swap).

QA Gate — B components build + smoke
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 5–7 complete
  Check:   `npm run build` passes; each component renders in a scratch block in the editor; alpha colour renders
           transparent LIVE, LinkControl internal search finds a page, ShadowControl emits a real multi-value shadow.
  Pass:    build green + all three headline behaviours verified live (not just compiled).
  Fail:    any behaviour fails live → fix before the pilot consumes the component.
  Marker:  QA

Step 8 — UNIT A+: build the consistency-scanner engine + dims 1–2 + codemod  [multi-session, Sonnet]
  Model:       sonnet
  Action:      Build `scripts/consistency/scan.{py,js}` (engine): (dimension-key, registry) → block×item matrix,
               per-row disposition MATCH/OLD-FORMAT/BESPOKE/MISSING-EXPECTED/EXTRA. Build the JSX-AST extractors
               for dims 1 (control-type) + 2 (group-name). Build the jscodeshift codemod for OLD-FORMAT rows
               (enableAlpha add, SgsLinkControl swap, ShadowControl swap — DRY-RUN first). Registry schema +
               `registries/*.json` (dims 1–2 seeded by the pilot in Step 11) + `divergence-exceptions.json`.
  Files:       plugins/sgs-blocks/scripts/consistency/scan.py, scan.js, registries/{control-type,group-name}.json,
               divergence-exceptions.json, codemod/*.js
  Inputs:      roster.json, UNIT B components (the blessed targets), Spec 35 Part I
  Outcome:     INFRASTRUCTURE ONLY in Phase 0 — the engine + dims-1/2 extractors + codemod exist and pass their
               unit tests against a FIXTURE registry. The real dims-1/2 registry is SEEDED by the pilot (Step 11);
               RUNNING the roster-wide dims-1/2 scan is a post-pilot HANDOFF follow-up (first task of Wave-1 / Phase 1),
               NOT Phase 0. (Resolves the Step 8↔Step 11 seeding order: 8 builds, 11 seeds, Wave-1 runs.)
  Exec:        PARALLEL with steps 2–7 (independent engine build); RUN-scan is sequenced AFTER Step 11.
  Deps:        step 1 (roster) for the engine's block list; a FIXTURE registry for the unit tests (not the pilot seed)
  Marker:      HANDOFF (natural session boundary — this is the ~half-to-full-day extra)
  Time:        ~5 h (JSX-AST across ~40 heterogeneous blocks — the reliability-hard part)
  Tooling:     node/python AST, jscodeshift, /wp-blocks, /sgs-db
  On-Fail:     AST residue the extractor can't classify → route to a Haiku queue, never crash; log the residue count.
  Prompt:      [dispatch via /subagent-prompt — embed the 5 dispositions, the registry-as-golden-master design
               (diff blocks→registry NOT blocks→pilot), dims 1–2 extractor specs, codemod DRY-RUN-first safety gate].
  Test:
    Happy:       scan dim-1 → per-block colour-control disposition keyed to the registry.
    Edge:        a recorded justified divergence is NOT re-flagged.
    Fail:        a block using the OLD colour format IS flagged OLD-FORMAT + the codemod dry-run rewrites it.
    Integration: a MISSING-EXPECTED row (peers have a control this one lacks) is surfaced; drives Wave-1 (Step E).

GATE C0 — SHARED-WRAPPER PRE-BUILD DESIGN-GATE (Bean sign-off)   [BEFORE Step 9]
  Model:   inline (+ /qc-council for the shared-surface review)
  Exec:    SEQUENTIAL
  Deps:    none (can run any time before Step 9)
  Check:   Present to Bean: the `min-width:0` (+`min-height:0`) approach + a before/after Playwright measurement
           plan on 3+ real pages (band/grid/hero + the testimonial-slider offender at 360px). 7-rules #7 shared-surface gate.
  Pass:    Bean approves the shared-wrapper change → Step 9 builds. If NOT approved → shrink-to-fit rests on
           per-block intrinsic fixes only (no framework backstop); the plan still runs, D just proves intrinsic directly.
  Fail:    Bean wants a different approach → capture it, re-gate.
  Marker:  QA (Bean decision — go/no-go)

Step 9 — UNIT C: build the `min-width:0` (+`min-height:0`) wrapper backstop   [after Gate C0]
  Model:       sonnet
  Action:      Add the grid/flex-item blow-out guard to the shared wrapper's grid/flex CSS emit. Measure a known
               offender before/after at 360px; confirm no regression on 3+ real pages.
  Files:       plugins/sgs-blocks/includes/class-sgs-container-wrapper.php + the shared grid/flex CSS emit
  Inputs:      Gate C0 approval, the before/after measurement plan
  Outcome:     the backstop exists + is TOGGLEABLE (so D can test shrink-to-fit with it OFF).
  Exec:        SEQUENTIAL after Gate C0
  Deps:        Gate C0 pass
  Marker:      (none)
  Time:        45 min
  Tooling:     wp-sgs-developer, Playwright (before/after), /qc-council (shared-surface)
  On-Fail:     any regression on the 3 real pages → roll back fast (STOP-19); do not iterate inline under context pressure.
  Prompt:      [dispatch via /subagent-prompt — embed the toggle requirement (D needs backstop OFF), the 3-page
               regression set, "roll back on any regression"].
  Test:
    Happy:       testimonial-slider case at 360px no longer forces overflow with backstop ON.
    Edge:        a block that already fit is unchanged (backstop is a no-op there).
    Fail:        a band/grid/hero page regresses → rollback.
    Integration: D (Step 11) tests shrink-to-fit with THIS backstop OFF → keeps C and intrinsic-proof falsifiable.

Step 10 — UNIT D1: media-controls DECISION (timeboxed, FIRST pilot task)   [KJC-3]
  Model:       inline (Opus — irreversible scope decision)
  Action:      Compare `sgs/media` vs Kadence/Spectra/GenerateBlocks media blocks + core/image+core/video
               capabilities → decide the control SET to add. Any control not built now is Wave-mapped. Resolve the
               architectural fork: sgs/media OPTS OUT of the shared `imageControls` extension (its block.json is the
               cloning converter's source of truth) → prove media controls on the BLOCK-PRIVATE path; the exemplar
               seeds the control SET + parity bar + a11y, NOT the code path. Do NOT re-opt into the extension.
  Files:       .claude/plans/2026-07-19-spec-35-media-controls-decision.md (new — the committed control list)
  Inputs:      core/image + core/video block.json, competitor docs, Spec 35 Part C Media + Part I, the parity audit (Step 3)
  Outcome:     a committed, written media-control SET (built-now vs Wave-mapped) — the concrete meaning of "media-controls evaluated".
  Exec:        SEQUENTIAL (D1 is D's first deliverable + a Gate-0 metric)
  Deps:        step 3 (parity audit gives the gap list)
  Marker:      (none)
  Time:        30 min timeboxed
  Tooling:     competitor media-block comparison, /wp-blocks, design-reviewer
  On-Fail:     if the set balloons past timebox → cut to table-stakes (T) items now, Wave-map all premium (P). Don't let input-3 sprawl the pilot.
  Test:
    Happy:       a written control list exists, each item tagged built-now | Wave-N.
    Edge:        every core/image + core/video capability appears (built or mapped) — none silently dropped.
    Fail:        an undecided control → not allowed; the set must be complete before build.
    Integration: the list drives Step 11 build scope + Gate 0 media-controls metric.

Step 11 — UNIT D: PILOT build `sgs/media` to full Spec 35 DONE
  Model:       sonnet (build) + inline (design calls)
  Action:      Build sgs/media to the inspector DONE-checklist + the 3 threaded constraints. Consumes UNIT B
               components (alpha colour, SgsLinkControl if it has a link, ShadowControl). Every NEW attr is classed
               editor-only (authored) OR carries a converter-population note (else dead control on clones). Add
               SVG sanitise-on-upload (Part C security — NON-DEFERRABLE on the pilot; sgs/media takes raw svgContent).
               SEED the scanner registries dims 1–2 with the pilot's blessed controls.
  Files:       plugins/sgs-blocks/src/blocks/media/{block.json,edit.js,render.php,style.css,view.js},
               plugins/sgs-blocks/scripts/consistency/registries/{control-type,group-name}.json (seed)
  Inputs:      Step 10 decision, UNIT B (Steps 5–7), UNIT C backstop (Step 9), the DONE-checklist, the audits (Steps 2–4)
  Outcome:     sgs/media passes inspector-conformance + parity (0 unexplained) + shrink-to-fit (backstop OFF) LIVE; SVG sanitised.
  Exec:        SEQUENTIAL
  Deps:        steps 5–7 (components), step 9 (backstop), step 10 (control set)
  Marker:      (none)
  Time:        multi-session (~5 h creative) — of which SVG sanitiser is a SEPARATE ~30-min sub-task (D-SEC),
               done FIRST and independently verifiable, NOT folded invisibly into the media build.
  Sub-task D-SEC (SECURITY, do first): add sanitise-on-upload for the SVG mode's raw `svgContent` (strip
               `<script>`/event handlers/`<foreignObject>` etc. server-side on save + on upload). On-Fail(D-SEC):
               if it can't be built + proven in ~30 min, STOP — security-critical + non-deferrable; do not ship the
               pilot with an unsanitised SVG path. Proof: inject a `<script>`-bearing SVG → confirm stripped LIVE.
  Tooling:     wp-sgs-developer, design-reviewer, Playwright, /visual-qa
  On-Fail:     if a threaded constraint can't be proven on the pilot → STOP, fix the STANDARD (not just the block) before rollout.
  Prompt:      [dispatch via /subagent-prompt — embed the control set from Step 10, the block-private-path decision,
               the converter-population rule, the SVG sanitiser requirement, no version bump / no deprecated.js (D270)].
  Test:
    Happy:       static inspector-conformance audit passes on sgs/media.
    Edge:        video AND image modes both complete (video: preload + `<track>`/captions; image: lightbox/duotone/sizeSlug/focal — or exception-mapped).
    Fail:        parity audit shows 0 UNEXPLAINED gaps (each closed OR Wave-mapped).
    Integration: shrink-to-fit clean at device tiers LIVE with UNIT-C backstop DISABLED; Bean's eye (R-31-13).

QA Gate — pilot passes all three threaded constraints
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    step 11 complete
  Check:   Run all 3 audits against sgs/media on a live page: conformance = 0 unexplained; parity = 0 unexplained
           gaps vs core/image+core/video; shrink-to-fit clean at 375/768/1440 with backstop OFF. SVG upload sanitised
           (inject a `<script>`-bearing SVG → confirm stripped). Editor preview matches frontend.
  Pass:    all three green + SVG sanitised + Bean's eye on the live pilot.
  Fail:    any red → fix the standard/block; do not proceed to Gate 0.
  Marker:  QA

GATE 0 — FIRST SLICE (Bean sign-off)   [phase deliverable]
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 1–11 + both QA gates complete
  Check:   Present to Bean: (1) media-controls set decided + committed + built/Wave-mapped; (2) parity 0 unexplained
           gaps; (3) shrink-to-fit clean with backstop OFF; (4) inspector-conformance passes; (5) SVG sanitise live;
           (6) the audits + scanner + components exist as permanent tooling. Bean's eye on the live pilot.
  Pass:    Bean approves the STANDARD + the pilot → unlocks the framework-wide waves (Phase 1 / Wave-1 rollout).
  Fail:    any threaded constraint not provable → fix the standard before rolling out.
  Marker:  HANDOFF (phase boundary — /handoff, then /phase-planner scope="Spec 35 Wave-1 framework rollout")

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **KJC-1 — Pilot block. RESOLVED (Bean, 2026-07-19): BOTH, in sequence.**
  - **Decision:** `brand-strip` is QC'd FIRST — it was already reworked on this branch, so it just needs
    verification against the DONE-checklist. Once it passes, it becomes the **reference exemplar** ("the kind of
    results Bean is looking for") that guides the agents building the formal `sgs/media` pilot. `sgs/media` remains
    the standard-proving pilot (proves all three threaded constraints at once). So brand-strip = quality north-star;
    sgs/media = the formal Gate-0 pilot.
  - **Adds two steps to Phase 0:** Step 0b — QC brand-strip against the inspector DONE-checklist + capture its
    quality signal into a short exemplar note the pilot dispatch prompts cite. brand-strip stays the Wave-2
    MediaGalleryPicker consumer as well.
  - **Why this is better than either-alone:** turns already-done work into the quality bar, so the sgs/media pilot
    (and later every wave) has a concrete "good looks like this" reference, not just a checklist.
  - **Who decided:** Bean.

- **KJC-2 — Core-capability source for the parity audit.**
  - **Options:** (A) the installed `@wordpress/block-library` block.json set (pin the WP version) / (B) hardcode a
    capability list per core block / (C) scrape the WP handbook.
  - **Recommendation:** (A), pinned to the sandbox/dev WP core version (WP 7.0.1, verified 2026-07-16).
  - **Why:** it's the real source of core `supports` + attrs, DB-first, no hardcoded dict (R-31-1). Version-pin so
    the audit is reproducible; re-pin when WP 7.1 lands (19 Aug 2026).
  - **Cost of wrong choice:** a hardcoded list silently drops the next core capability added (same R-31-1 anti-pattern).
  - **Who decides:** architect (recommend A) — confirm at Step 3 start.

- **KJC-3 — Media-controls set size (input-3 scope).**
  - **Options:** (A) table-stakes (T) now + premium (P) Wave-mapped / (B) everything now / (C) minimal now.
  - **Recommendation:** (A) — build the Part-C T items (focal, aspect-ratio, object-fit, lightbox, video
    poster/preload/track, SVG sanitise) now; Wave-map P items (CSS filters, backdrop-filter, parallax).
  - **Why:** timeboxes the pilot, keeps input-3 from sprawling, still proves the standard.
  - **Cost of wrong choice:** (B) balloons the pilot (the media-scope-creep risk); (C) under-proves parity.
  - **Who decides:** joint — decided concretely at Step 10 (D1).

### Pre-emptive decisions (would otherwise pause execution)

- **PED-1 — Audits ship WARN-only in Phase 0.** Every static audit exits 0 always this phase (informational,
  per `a11y-validation-feedback-informational-not-gate`); promotion to a hard prebuild gate is Gate 3 (Spec close),
  AFTER the roster is clean — so the co-active Track 2 build is never blocked.
- **PED-2 — sgs/media stays OFF the shared `imageControls` extension.** Its block.json is the cloning converter's
  source of truth; the pilot proves the control SET + parity + a11y on the BLOCK-PRIVATE path. Extension-using image
  blocks get the same SET via Wave-2 (UNIT F). Do NOT re-opt sgs/media into the extension.
- **PED-3 — Every new media attr is classed editor-only OR gets a converter-population note.** A new attr with
  neither is a dead control on clones (block.json enum coerces / object-attr coerces — D291/D328). Non-negotiable.
- **PED-4 — Shared-worktree commit discipline (Track 2 co-active).** Every commit is path-scoped with an explicit
  `-- <paths>` pathspec, branch re-checked in the SAME command; never `git add -A`, never branch-switch; merge to
  main only via an isolated `git worktree` (`recheck-branch…` + `merge-to-main-via-isolated-worktree…`). Windows:
  commit via PowerShell if Bash has a stale view of Write-tool files.
- **PED-5 — No version bumps / no deprecated.js (D270, pre-production).** Old-shape posts are re-cloned, not migrated.
- **PED-6 — Media-controls table-stakes anchor is PRE-LOCKED (so Step 10 can't stall into a debate).** These T
  controls are non-negotiable and built now on the pilot: focal point, aspect-ratio, object-fit/position, native
  lightbox (image), video poster/preload/loop/mute + `<track>`/captions, SVG sanitise-on-upload. Everything else
  (CSS filters, backdrop-filter, mix-blend, clip-path, parallax) is premium (P) → Wave-mapped. Step 10 DECIDES the
  full set; it may only ADD to this floor, never drop below it.
- **PED-7 — Feature-parity core-capability source is PINNED (KJC-2 resolved).** Source = the installed
  `@wordpress/block-library` block.json set at the sandbox/dev WP core version (WP 7.0.1, verified 2026-07-16).
  Re-pin when WP 7.1 lands (19 Aug 2026). Step 3 confirms this at start; no hardcoded capability dict (R-31-1).
- **PED-8 — Audits are necessary, not sufficient, at Gate 0.** All three audits green is REQUIRED but does not
  alone close Gate 0 — Bean's eye on the live pilot is co-authoritative (R-31-13). Audits catch the mechanical
  gaps; Bean catches what they can't encode. Both must pass. (Also: shrink-to-fit is proven intrinsic at 360px with
  the UNIT-C backstop OFF; Step 9's before/after Playwright measure is the SEPARATE check that the shipped config —
  backstop ON — has no regression. Off-backstop proves intrinsic; on-backstop proves ship-safe.)
