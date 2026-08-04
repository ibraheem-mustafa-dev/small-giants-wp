---
doc_type: reference
title: Spec 35 Block Inspector UX — DONE checklist (end conditions only)
status: ACTIVE
created: 2026-07-19
governs: the universal block-inspector UX / control-completeness / capability rollout (Spec 35)
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Part L is the source — this doc is the enforceable transcription)
sibling: .claude/plans/block-migration-DONE-checklist.md (governs RENDERED output / no-inline, Spec 32; this doc governs the EDITOR control surface)
plan: .claude/plans/archive/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md (the HOW / wave sequencing)
---

# Spec 35 inspector — DONE checklist

A block's **inspector is DONE** when every box below is ticked, verified against the
block's `block.json` + `edit.js` (static audits) and, where noted, on a live editor +
rendered page. The *fixes* differ per block (some adopt a shared component, some a native
`support`, some a new attr) — the *end conditions* are identical. Tick these, don't re-derive
them. Transcribed verbatim from Spec 35 Part L; the **[enforced by]** tag names the UNIT-A /
UNIT-A+ tool that will catch each item (WARN-only first, hard gate at Spec close per plan Gate 3).

## End conditions (per block)

- [ ] **1. Tab split via `group`.** Settings/Styles/Advanced controls are routed to the native
  tabs via the `group` prop (behaviour→Settings, appearance→Styles/sub-groups, CSS-class/anchor→
  Advanced). *(Spec 35 A3.)* **[enforced by]** UNENFORCED — no automated gate exists. (Verified
  2026-07-30: `audit-inspector-conformance.js` contains the string `group` zero times; only 4 of
  81 blocks emit any `group=` prop at all — brand-strip, nav-drawer, nav-menu, site-header — and
  `group="advanced"` appears nowhere. The claimed "group-prop presence" check does not exist.)
- [ ] **2. Element-first panels.** Composite blocks group panels by block PART, not property type.
  *(Spec 35 A4.)* **[enforced by]** UNENFORCED — no automated gate exists (`consistency-scanner`
  is cited here but does not exist anywhere in the codebase; verified 2026-07-30, `grep -rl
  "consistency-scanner"` returns only two plan docs, zero code).
- [ ] **3. ToolsPanel on dense panels.** Any inspector panel with ~6+ controls uses `ToolsPanel`/
  `ToolsPanelItem` progressive disclosure (1–3 `isShownByDefault`, `resetAll`). *(Spec 35 A5.)*
  **[enforced by]** `audit-inspector-conformance.js` (control-count vs ToolsPanel).
- [ ] **4. Alpha + clearable colour.** Every colour control has `enableAlpha` + `clearable`
  (alpha-0 ≠ unset). Native `supports.color` alpha is a theme.json concern and is exempt — this
  targets `DesignTokenPicker`/`ColorPalette` COMPONENT pickers. *(Spec 35 B/H, I.)* **[enforced by]**
  `audit-inspector-conformance.js`; exceptions → `inspector-conformance-baseline.json`. The
  `consistency-scanner dim 1` half of this claim is UNENFORCED — that tool does not exist.
- [ ] **5. Real units / token scale.** Every CSS-length uses `UnitControl` (real `units`) or the
  spacing-token scale — never a raw-px RangeControl that breaks the token system. *(Spec 35 B, C spacing.)*
  **[enforced by]** UNENFORCED — no automated gate exists (`consistency-scanner` does not exist).
- [ ] **6. 4-value props are box-families.** Every 4-side/4-corner prop uses `box_family` (BoxControl,
  `{top,right,bottom,left}` / `{topLeft,…}`), INCLUDING Tablet/Mobile tiers. *(Spec 35 B, L.)*
  **Shared with** no-inline checklist item 3 — same object shape. **[enforced by]** `check-box-family-guard.py`.
- [ ] **7. Real builders for compound values.** Shadow and border use real builders (shadow =
  X/Y/blur/spread/colour+alpha/inset; border = style + per-side + alpha + separate radius) — NOT
  None/Small/Medium selects. *(Spec 35 B, F.)* **[enforced by]** `audit-inspector-conformance.js` (preset-only shadow flag).
- [ ] **8. LinkControl for links.** Every link/CTA uses `LinkControl` (internal-content search +
  new-tab + rel nofollow/sponsored) via `SgsLinkControl` — never a raw URL `TextControl`. *(Spec 35 B, C, F.)*
  **[enforced by]** `audit-inspector-conformance.js` (raw URL TextControl flag). The `consistency-scanner
  dim 1` half of this claim is UNENFORCED — that tool does not exist.
- [ ] **9. Full image controls where relevant.** Image-rendering blocks expose size dropdown
  (attachment `sizes`) + aspect-ratio + object-fit + `FocalPointPicker` where relevant. *(Spec 35 B, C, I.)*
  **[enforced by]** feature-parity audit (vs core/image). The `consistency-scanner dim 7` half of
  this claim is UNENFORCED — that tool does not exist.
- [ ] **10. Multi-item data is array-shaped.** Any repeated/multi-item media or content uses an
  array attr with `gallery`/`multiple="add"` (MediaGalleryPicker) or a repeater — never a scalar attr
  added one-at-a-time. *(Spec 35 B, C, I.)* **[enforced by]** feature-parity audit. The
  `consistency-scanner (attr-shape)` half of this claim is UNENFORCED — that tool does not exist.
- [ ] **11. 768/1024 device switcher on responsive props.** Responsive props expose the locked
  768/1024 device-tier switcher (`ResponsiveControl`), no bespoke third breakpoint. *(Spec 35 D1–D3.)*
  **Shared with** no-inline checklist item 4 (device tiers). **[enforced by]** UNENFORCED — no
  automated gate exists (`consistency-scanner` does not exist).
- [ ] **12. StateToggleControl for states.** Normal/Hover (and any stateful) controls use the shared
  `StateToggleControl`, not a bespoke duplicated hover panel. *(Spec 35 F, I.)* **[enforced by]**
  UNENFORCED — no automated gate exists (`consistency-scanner` does not exist).
- [ ] **13. hideExtensions for irrelevant universals.** Irrelevant universal-extension panels are
  hidden via `supports.sgs.hideExtensions: [...]` (declarative). *(Spec 35 A7.)* **[enforced by]**
  `audit-inspector-conformance.js` (manual review flag — informational).
- [ ] **14. MediaUploadCheck on every MediaUpload.** Every `MediaUpload` is wrapped in
  `MediaUploadCheck` (capability gate). *(Spec 35 B, L.)* **[enforced by]** `audit-inspector-conformance.js`.
- [ ] **15. No duplicated native-supports panel.** No bespoke panel re-implements a control a native
  `supports` panel already provides (inspector-UX form of R-31-9). *(Spec 35 A6, F.)* **[enforced by]**
  `audit-inspector-conformance.js`. The `consistency-scanner dim 2` half of this claim is
  UNENFORCED — that tool does not exist.
- [ ] **16. Native over hand-rolled.** Native supports are used over hand-rolled equivalents for
  aspect-ratio / duotone / sticky / lightbox (check native BEFORE building any of these). *(Spec 35 C, G.)*
  **[enforced by]** feature-parity audit + Wave-3 native-migration audit.
- [ ] **17. Reduced-motion gate on all animation.** Every animation/transition is
  `prefers-reduced-motion`-gated (WCAG 2.3.3) — from day one, never bolted on. *(Spec 35 C, E5, F.)*
  **[enforced by]** `audit-inspector-conformance.js` (animation-without-gate flag).
- [ ] **18. Decorative-image + ARIA-label where needed.** Decorative-image toggle (empty alt +
  `aria-hidden`) and general ARIA-label control are present where the markup needs them. *(Spec 35 C, E6.)*
  **[enforced by]** UNENFORCED — no automated gate exists (`consistency-scanner` does not exist).
- [ ] **19. A11y pass.** Keyboard-operable + 4.5:1 contrast on the block's own control UI +
  `help` linked via `aria-describedby`. *(Spec 35 E1–E4.)* **[enforced by]** manual a11y pass (informational,
  never a gate — `a11y-validation-feedback-informational-not-gate`).
- [ ] **20. Client patterns use templateLock.** Client-facing patterns using this block set
  `templateLock:"contentOnly"` for client-safe editing. *(Spec 35 C, G HIGH.)* **[enforced by]**
  pattern audit (Wave-1 item 4).
- [ ] **21. No Part-F anti-patterns.** None of the Part F fail-list is present (essential control
  sidebar-only, incomplete option sets, no reset, colour-only focus, bespoke Custom-CSS field,
  raw-px spacing, etc.). *(Spec 35 F.)* **[enforced by]** the audits above collectively.

## Threaded standards (Bean-locked — proven on the pilot, then roster-wide)

These three are NOT extra tick-boxes on top; they are the *reason* the rollout exists and are
proven LIVE on the pilot (`sgs/media`) at Gate 0 before any wave. Every block inherits them.

- [ ] **T1. Feature-parity.** The block exposes AT LEAST the full capability of the core block(s)
  it replaces (per `block-replacements.json`), unless a named exception in
  `feature-parity-exceptions.json` mapped to a Wave. *(memory `sgs-block-feature-parity-with-replaced-core`.)*
- [ ] **T2. Shrink-to-fit.** The block is intrinsically responsive — root/section min-content ≤ its
  resolved container width at every device tier, 0 forced horizontal overflow, measured with the
  UNIT-C `min-width:0` backstop DISABLED (proves intrinsic, not backstop-rescued). *(memory
  `blocks-must-shrink-to-fit-container`.)*
- [ ] **T3. Media-controls (media blocks).** For media-rendering blocks, the control SET was
  decided against a competitor comparison (Kadence/Spectra/GenerateBlocks + core) and every candidate
  is built or Wave-mapped. *(Spec 35 Part C Media + Part I.)*

## How to use this checklist
- Copy this list into the block's rebuild ticket. Tick each box only when the named audit/gate is
  green OR the item has a recorded, spec-mapped exception (never silently skipped — STOP-29).
- Deferrals map to a named Spec 35 Wave (Part J) or exception file — never "out of scope".
- The two STATIC audits (`audit-inspector-conformance.js`, `audit-feature-parity.py`) ship WARN-only
  first and promote to a hard prebuild gate at Spec close (plan Gate 3). The LIVE-DOM shrink-to-fit
  audit runs in CI / on-demand, gated at Phase 4 close.

## Conditions to add or refine before Task F

Surfaced 2026-08-04 during Task A (structural content-role detection) + the QC-BYPASSED
re-verification of D481-D484. These are enforcement-design lessons for the 24 Task-F scripts, not
inspector-UX end conditions — kept here per the instruction to record them against this checklist
before Task F is built, since they change what "enforced" must mean for every rule Task F writes.

- [ ] **22. Silence is not rejection — an aggregator must distinguish the two.** A detector's
  ABSENCE from a supporting list and its PRESENCE-with-a-negative-verdict are different facts; folding
  both into "no evidence" or "some evidence" loses the distinction that decides correctness.
  Evidence: an aggregator this session assigned `sgs/button.rel` (an HTML `rel` attribute) as
  client-editable content because D1's presence in the supporting list was read as endorsement, when
  D1's actual verdict on that row was a rejection. **[enforced by]** UNENFORCED — no automated gate
  exists; this is a rule-authoring discipline for Task F, not a script to write in isolation.
- [ ] **23. Recall is measured against the eligible POOL, never the rule's own output** (REFINES
  end condition 2's ENFORCED-bar point 2, "population cross-checked by an independent method" —
  turns it from a general instruction into a concrete failure mode to test for). Evidence: a
  three-detector suite reported 85% recall measured against its own union; re-measured against the
  true 262-row eligible pool the honest figure was 52%, and the gap between the two contained real
  misses (`sgs/hero.svgContent`, `sgs/media.svgContent`), not noise. A recall figure computed
  against a self-referential denominator is not evidence of coverage.
- [ ] **24. A report's named artefact must exist on disk — mechanically checkable, not asserted.**
  Evidence: a report this session claimed two "durable regression fixtures" by filename
  (`plant_render2.php`, `plant_edit2.js`); `find . -name 'plant_*'` returned nothing — both were
  transient and lost. **[enforced by]** trivially scriptable: any report claiming a filename runs a
  `find`/`test -f` check before the claim ships; UNENFORCED today, cheap for Task F to add as a
  report-linting step.
- [ ] **25. Name the CONSUMER before measuring a value, then prove it by reading that consumer**
  (REFINES the NEXT SESSION "DEFINITION OF ENFORCED" bar point 8, "the right document" — turns the
  prose instruction into a required action: read the consumer's source, don't infer its contract).
  Evidence: `derived_selector` was measured against what a block RENDERS and reported 593 of 889 as
  phantom — the exact D484 error (a deleted gate reported 666/889 the same way for the same reason:
  `derived_selector` is a DRAFT-side matcher, `scalar_content.py` consumes it against the draft DOM,
  never against render output). Reading D484 at session start did not prevent repeating it — only
  reading the actual consuming code would have.
- [ ] **26. A zero from a search you wrote requires a positive control before it is trusted.** Find
  something you KNOW is present first; only then trust that nothing else is. Evidence: three separate
  zero-or-empty results this session were broken searches, not empty worlds — a comma-delimited LIKE
  defeated by JSON-quoted values, a column split on two spaces instead of the real delimiter, and a
  detector that never actually reached the target file. **[enforced by]** UNENFORCED — a
  `--self-test` with a known-present plant (per the existing DEFINITION OF ENFORCED point 5) is the
  general mechanism; this item names the specific failure mode point 5 exists to catch.
- [ ] **27. A DB statistic quoted as evidence of framework health declares its denominator and is
  scoped to `sgs/%`.** Evidence: two figures this session (colour-NULL-role "21", role-only "1099")
  reproduced to the digit ONLY when computed across all 2,970 `block_attributes` rows, including 506
  `core/*` rows describing WordPress core blocks the framework replaces, not SGS blocks; scoped
  correctly the true figures are 19 and 955. Nothing was fabricated — the arithmetic was right, the
  population was wrong. **[enforced by]** UNENFORCED — cheap to gate as a prose/reviewer rule (any
  bare DB count in a report or doc must carry `WHERE block_slug LIKE 'sgs/%'` or state why not),
  not worth a script.

## Reference
- Spec: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Part L source; Parts A–K rationale).
- Plan / waves: `.claude/plans/archive/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md`.
- Sibling (rendered output): `.claude/plans/block-migration-DONE-checklist.md`.
- 2026-08-04 session evidence: `.claude/reports/2026-08-04-content-attr-miss-denominator.md`,
  `.claude/reports/2026-08-04-step0-qc-bypassed-reverification.md`,
  `.claude/reports/2026-08-04-trackB-ribbon-canonical-slot-root-cause.md`,
  `.claude/reports/2026-08-04-trackC-tier-sibling-rows-root-cause.md`,
  `.claude/reports/2026-08-04-fluid-typography-mobile-parity-hypothesis.md`.
