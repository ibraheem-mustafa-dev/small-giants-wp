---
doc_type: reference
title: Spec 35 Block Inspector UX — DONE checklist (end conditions only)
status: ACTIVE
created: 2026-07-19
governs: the universal block-inspector UX / control-completeness / capability rollout (Spec 35)
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Part L is the source — this doc is the enforceable transcription)
sibling: .claude/plans/block-migration-DONE-checklist.md (governs RENDERED output / no-inline, Spec 32; this doc governs the EDITOR control surface)
plan: .claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md (the HOW / wave sequencing)
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
  Advanced). *(Spec 35 A3.)* **[enforced by]** `audit-inspector-conformance.js` (group-prop presence).
- [ ] **2. Element-first panels.** Composite blocks group panels by block PART, not property type.
  *(Spec 35 A4.)* **[enforced by]** consistency-scanner dim 2 (group-name).
- [ ] **3. ToolsPanel on dense panels.** Any inspector panel with ~6+ controls uses `ToolsPanel`/
  `ToolsPanelItem` progressive disclosure (1–3 `isShownByDefault`, `resetAll`). *(Spec 35 A5.)*
  **[enforced by]** `audit-inspector-conformance.js` (control-count vs ToolsPanel).
- [ ] **4. Alpha + clearable colour.** Every colour control has `enableAlpha` + `clearable`
  (alpha-0 ≠ unset). Native `supports.color` alpha is a theme.json concern and is exempt — this
  targets `DesignTokenPicker`/`ColorPalette` COMPONENT pickers. *(Spec 35 B/H, I.)* **[enforced by]**
  `audit-inspector-conformance.js` + consistency-scanner dim 1; exceptions → `inspector-conformance-baseline.json`.
- [ ] **5. Real units / token scale.** Every CSS-length uses `UnitControl` (real `units`) or the
  spacing-token scale — never a raw-px RangeControl that breaks the token system. *(Spec 35 B, C spacing.)*
  **[enforced by]** consistency-scanner dim 5 (range/unit/step).
- [ ] **6. 4-value props are box-families.** Every 4-side/4-corner prop uses `box_family` (BoxControl,
  `{top,right,bottom,left}` / `{topLeft,…}`), INCLUDING Tablet/Mobile tiers. *(Spec 35 B, L.)*
  **Shared with** no-inline checklist item 3 — same object shape. **[enforced by]** `check-box-family-guard.py`.
- [ ] **7. Real builders for compound values.** Shadow and border use real builders (shadow =
  X/Y/blur/spread/colour+alpha/inset; border = style + per-side + alpha + separate radius) — NOT
  None/Small/Medium selects. *(Spec 35 B, F.)* **[enforced by]** `audit-inspector-conformance.js` (preset-only shadow flag).
- [ ] **8. LinkControl for links.** Every link/CTA uses `LinkControl` (internal-content search +
  new-tab + rel nofollow/sponsored) via `SgsLinkControl` — never a raw URL `TextControl`. *(Spec 35 B, C, F.)*
  **[enforced by]** `audit-inspector-conformance.js` (raw URL TextControl flag) + consistency-scanner dim 1.
- [ ] **9. Full image controls where relevant.** Image-rendering blocks expose size dropdown
  (attachment `sizes`) + aspect-ratio + object-fit + `FocalPointPicker` where relevant. *(Spec 35 B, C, I.)*
  **[enforced by]** feature-parity audit (vs core/image) + consistency-scanner dim 7.
- [ ] **10. Multi-item data is array-shaped.** Any repeated/multi-item media or content uses an
  array attr with `gallery`/`multiple="add"` (MediaGalleryPicker) or a repeater — never a scalar attr
  added one-at-a-time. *(Spec 35 B, C, I.)* **[enforced by]** consistency-scanner (attr-shape) + feature-parity audit.
- [ ] **11. 768/1024 device switcher on responsive props.** Responsive props expose the locked
  768/1024 device-tier switcher (`ResponsiveControl`), no bespoke third breakpoint. *(Spec 35 D1–D3.)*
  **Shared with** no-inline checklist item 4 (device tiers). **[enforced by]** consistency-scanner dim 6 (responsive).
- [ ] **12. StateToggleControl for states.** Normal/Hover (and any stateful) controls use the shared
  `StateToggleControl`, not a bespoke duplicated hover panel. *(Spec 35 F, I.)* **[enforced by]**
  consistency-scanner dim 8 (state/hover).
- [ ] **13. hideExtensions for irrelevant universals.** Irrelevant universal-extension panels are
  hidden via `supports.sgs.hideExtensions: [...]` (declarative). *(Spec 35 A7.)* **[enforced by]**
  `audit-inspector-conformance.js` (manual review flag — informational).
- [ ] **14. MediaUploadCheck on every MediaUpload.** Every `MediaUpload` is wrapped in
  `MediaUploadCheck` (capability gate). *(Spec 35 B, L.)* **[enforced by]** `audit-inspector-conformance.js`.
- [ ] **15. No duplicated native-supports panel.** No bespoke panel re-implements a control a native
  `supports` panel already provides (inspector-UX form of R-31-9). *(Spec 35 A6, F.)* **[enforced by]**
  `audit-inspector-conformance.js` + consistency-scanner dim 2.
- [ ] **16. Native over hand-rolled.** Native supports are used over hand-rolled equivalents for
  aspect-ratio / duotone / sticky / lightbox (check native BEFORE building any of these). *(Spec 35 C, G.)*
  **[enforced by]** feature-parity audit + Wave-3 native-migration audit.
- [ ] **17. Reduced-motion gate on all animation.** Every animation/transition is
  `prefers-reduced-motion`-gated (WCAG 2.3.3) — from day one, never bolted on. *(Spec 35 C, E5, F.)*
  **[enforced by]** `audit-inspector-conformance.js` (animation-without-gate flag).
- [ ] **18. Decorative-image + ARIA-label where needed.** Decorative-image toggle (empty alt +
  `aria-hidden`) and general ARIA-label control are present where the markup needs them. *(Spec 35 C, E6.)*
  **[enforced by]** consistency-scanner dim 7 (a11y).
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

## Reference
- Spec: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Part L source; Parts A–K rationale).
- Plan / waves: `.claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md`.
- Sibling (rendered output): `.claude/plans/block-migration-DONE-checklist.md`.
