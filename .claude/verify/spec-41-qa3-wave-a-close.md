---
doc_type: verify-artefact
plan: .claude/plans/phase-nav-menu-colour-state.md
step: 12 (QA-3 — Wave A close)
date: 2026-09-11
---

# Step 12 — QA-3 / Wave A close: G1 byte-identity proofs + split parity

## Context note — a parallel session touched this file between Step 11 and Step 12

A peer session (`small-giants-wp-0a`) independently found and fixed a real deploy-blocking
regression left by Step 9's manifest rewrite: `edit.js` + 3 panel sub-modules still referenced
10 of the 12 deleted attributes (dead/no-op controls), `render.php`'s sliding-pill indicator was
permanently dead (gated on a deleted attribute), `submenuBg` had no gradient sibling, and ~38
new manifest attributes were unclassified in the DB (F6 rogue-seed). Commits `5b638a231` and
`8d3978d0f`, already merged to `main` and already in this session's history (`git log` confirms
no divergence — `git rev-parse HEAD == git rev-parse origin/main`).

Every specific claim in the peer's report was independently re-verified against the real code
(not trusted): `EffectsPanel.js`/`UnderlinePanel.js` genuinely deleted; `itemColourHoverTreatment`/
`itemBgHoverTreatment`/`itemBorderHoverTreatment` genuinely have real controls in `ItemsPanel.js`
now; `render.php`'s indicator genuinely repointed to `itemBgHoverTreatment === 'highlight'`;
`submenuBgGradient` genuinely declared and wired in `nav-menu-submenu-css.php`. All checks out.

One nuance for the record, not a defect: `includes/nav-menu-css.php` (Step 8's own split
product) still reads the OLD deleted attributes (`itemRadius`, `hoverStyle`, `underline*`) —
this is dead-but-harmless code (the keys are absent from `$attributes`, so PHP falls to
hardcoded defaults; nothing crashes) squarely inside **Step 15's** scope to rewrite, not a gap
in the peer's deploy-unblocking fix.

**This does not invalidate Step 12's gate — it re-confirms it.** G1(a)-(e) concern the FIVE
SHARED-COMPONENT changes (Steps 3-6a, 11's sibling detector), none of which the peer touched.
Split parity concerns the STRUCTURAL split (Steps 7-8), which is unchanged; the peer's commits
are legitimate content changes layered on top of an already-verified split, not a violation of it.

## G1(a) — SgsColourPanel callers, pre/post `heading` prop

**PASS.** `grep -rln "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l` → **61**
live adopters (re-derived, not cached). `heading` is optional and additive; no caller passes it
except future nav-menu Step 13 work. `SgsColourPanel.js` last touched at `d00039862` (the
corrected Step 5 commit, itself already adversarially reviewed — see prior review report). No
commit has touched it since.

## G1(b) — `sgs_emit_state_colour_css()` 4th-param default

**PASS.** Adversarially reviewed already (see `review-phpemitters` report): traced 4 real call
sites across `sgs/container`, `sgs/product-card`, `sgs/info-box`, `sgs/google-reviews` — none
pass a 4th arg, `$extra_states = []` default produces byte-identical output. `helpers-tokens.php`
last touched at `b61b4d19e`, unchanged since.

## G1(c) — `sgs_border_states_css()` byte-identity with no `suppress_edges`/`current` key

**PASS.** Same adversarial review: `isset($map['current'])` / `!empty($map['suppress_edges'])`
both false on every existing caller (15 real invocations, re-derived), producing the unchanged
flat `border-color` shorthand. `helpers-colour-variants.php` unchanged since `b61b4d19e`.

## G1(d) — SgsBorderControl mounts + BorderStyleControl's own adopters

**PASS.** `grep -rln "<SgsBorderControl" plugins/sgs-blocks/src/` → **56** live mounts (re-derived).
`DesignTokenPicker.js` / `GradientCapableColourControl.js` (BorderStyleControl's own adopters)
last touched at `7bca675ad` — an a11y fix predating this phase's work entirely; genuinely
unaffected by `SgsBorderControl.js`'s `showColour` addition (`3f87e559e`, unchanged since,
already adversarially reviewed clean).

## G1(e) — fx-magnet.css computed transition, pre/post

**PASS.** `fx-magnet.css` untouched since the verified commit (log shows only the magnet change
itself and the earlier feature commit — no peer touch). Already adversarially confirmed: zero
consumers read `--sgs-magnet-transition` outside the definition itself today, so no descendant
can misinterpret the custom property; reduced-motion override unaffected.

## SPLIT PARITY — Step 7 (edit.js)

**PASS**, re-verified against the CURRENT tree (post-peer-edits):
- File count: 12 files (11 split sub-modules + `edit.js`) — the peer's deletion of
  `EffectsPanel.js`/`UnderlinePanel.js` (their content was 100% dead-attribute controls with no
  successor) drops the count from 13 to 12, still well above the 7-file floor.
- Every sub-file ≤ 250 lines individually (`wc -l`): max is `DropdownSettingsPanel.js` at 168.
- `edit.js` itself: **455 lines** (down from 510 pre-peer-edit, the peer's dead-code removal
  shrank it, but still above the 250-line target). **This is the SAME known, disclosed overage
  from Step 7's report — not a new or growing violation** — and Step 13 (already amended in this
  plan, 2026-09-11) is scoped to close it via `fillRow`/`textRow` adoption on rebuild.
- `node scripts/inspector-scan/run.js --check` — nav-menu's colour rows carry **zero** rule-31
  findings (the 25 live findings tree-wide are all `SurfaceTreatmentPanel.js` shared-row findings
  from an unrelated R8 motion track — confirmed by reading the rule's own advisory-reason text).
  This proves owner ruling 3's atomicity constraint still holds after the peer's edits to
  `ItemsPanel.js`/`edit.js`: `colourRows` is still resolvable, still non-zero-state.

## SPLIT PARITY — Step 8 (render.php)

**PASS**, re-verified against the CURRENT tree with the peer's fixes layered on:
- Exactly 4 PHP files, unchanged count: `render.php`, `includes/nav-menu-markup.php`,
  `includes/nav-menu-css.php`, `includes/nav-menu-submenu-css.php`.
- CODE-line counts (computed directly, comments/blanks excluded, per Bean's D722-consistent
  ruling): `render.php` **221**, `nav-menu-markup.php` **250**, `nav-menu-css.php` **190**,
  `nav-menu-submenu-css.php` **239** — all four comfortably under the 300-code-line limit. (Raw
  `wc -l` is much higher on all four due to heavy comment density — 592/469/433/758 raw — exactly
  the D722 shape Bean's ruling exists to handle; irrelevant to the enforced measure.)
- The reuse ledger (`.claude/verify/spec-41-reuse-ledger.md`) exists with rows for both splits.

## Build verification

**PASS**, independently re-run rather than trusting the peer's own claim. `npm run build`
completed: webpack compile of all 83 blocks succeeded. The full prebuild gate chain (96 gates)
ran with exactly **one** unrelated failure — `migrate-orchestrator-rename` on
`plugins/sgs-blocks/scripts/converter/services/assembly.py` (a BARE_OK-count drift in the
cloning-pipeline converter, nothing to do with nav-menu or this phase). This matches the peer
session's own disclosure of a separate concurrent session's in-progress converter/pipeline work
being the actual deploy blocker, not nav-menu. Confirmed, not fixed here — out of scope.

## Verdict

**Wave A CLOSES.** All five G1 proofs hold with zero delta on the shared components. Both split
parity checks hold on the CURRENT tree, including the peer session's legitimate deploy-unblocking
fixes layered on top — those fixes are real bug fixes to real regressions Step 9 introduced, not
violations of the Step 7/8 refactors' own byte-identity guarantees (which were about the SPLIT
itself, already proven, and remain proven).

**State entering Wave B:** the manifest is settled (with the peer's additive `submenuBgGradient`
addition folded in — Wave B's steps should be aware `submenu-panel` now has a gradient sibling not
in the original Step 9 table). `edit.js`/panel modules are now FULLY consistent with the current
manifest (no dead controls, no reads of deleted attributes) for the 10 attributes the peer fixed —
Wave B's remaining job is building real controls + CSS for the 59-67 attributes the manifest
declares that still have zero implementation (border-family current/hover states, submenu
typography family, burger/trigger hover-treatment + magnet attrs) — this is exactly what Steps
13-19 already exist to do, no new scope, no plan change needed.
