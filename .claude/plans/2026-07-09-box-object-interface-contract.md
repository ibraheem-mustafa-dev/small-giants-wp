---
doc_type: reference
title: Box-object interface contract — the fixed spec every Phase-1 subagent builds against
status: ACTIVE
created: 2026-07-09
references:
  - .claude/plans/2026-07-09-no-inline-styling-design-gate.md
---

# Box-object interface contract (Phase-1 pilot: container + button)

This is the FIXED contract. Every subagent (converter, render/helper, editor, DB, gate)
implements against it verbatim so the layers stay compatible (kills the D258 "converter
attr must match what render reads" failure class). Do not deviate; if something here is
ambiguous, STOP and ask the orchestrator — do not guess.

## 1. Attribute SHAPE (block.json)
A merged box family is ONE attribute of `"type": "object"` holding named keys:
- **4-side families** → `{ "top": <len>, "right": <len>, "bottom": <len>, "left": <len> }`
- **4-corner families** (border-radius) → `{ "topLeft": <len>, "topRight": <len>, "bottomLeft": <len>, "bottomRight": <len> }`
- `<len>` = a CSS length string (e.g. `"20px"`, `"1.5rem"`, `"0"`) or absent/empty for an unset side.
- `default`: `{}` (empty object). A missing side key = that side unset (falls to CSS default / inherits).
- The **unit is carried inline in each value** (`"20px"`), so NO separate `{attr}Unit` companion is needed for object attrs (this replaces the old shared `paddingUnit`).

## 2. NAMING (canonical) — replace the flat per-side/tier attrs with these object attrs
| Family | Base attr | Tier attrs | Notes |
|---|---|---|---|
| root padding | **WP-native `style.spacing.padding` object** (already exists — Phase 0) | `paddingTablet`, `paddingMobile` (object) | REMOVE the 8 flat `padding{Side}{Tablet,Mobile}` |
| root margin | **WP-native `style.spacing.margin` object** | `marginTablet`, `marginMobile` (object) | REMOVE the 8 flat `margin{Side}{Tablet,Mobile}` |
| root border-width | `borderWidth` (object) | (none unless the block has tiers) | REMOVE flat `borderWidth{Side}`. colour/style stay single scalar attrs (`colourBorder`, `borderStyle`). |
| root border-radius (CORNERS) | **WP-native `style.border.radius` object** `{topLeft,…}` | `borderRadiusTablet`, `borderRadiusMobile` (object) | REMOVE flat `borderRadius{TL,TR,BL,BR}` + their tier variants |
| per-area/element (contentBandPadding, contentPadding, mediaPadding, imagePadding, imageBorderWidth, imageBorderRadius) | `<family>` (object, SGS attr — NOT `style.*`) | `<family>Tablet`, `<family>Mobile` (object) | these are per-area, not the block root → SGS custom object attrs |

**Pilot inventory:**
- **container:** root padding (WP spacing base + `paddingTablet`/`paddingMobile`), root margin (WP spacing base + `marginTablet`/`marginMobile`), `contentBandPadding` + `contentBandPaddingTablet`/`Mobile`.
- **button:** root padding + margin (as above), `borderWidth` (object), root border-radius (WP `style.border.radius` base + `borderRadiusTablet`/`Mobile`).

## 3. DB categorisation (the collision guard) — `block_attributes.box_family` + `box_side`
Seeded via `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py` (adds the columns on the fly, reseed-durable).
- Every OBJECT box attr gets `box_family` = the family name (`padding`/`margin`/`borderWidth`/`borderRadius`/`contentBandPadding`/…). `box_side` = NULL on the object attr itself (the object holds all sides).
- **Rule for the merge/migration:** an attr is a merge/migration TARGET only if it (or the flat attr it replaces) carries a `box_family`. The 10 keep-scalar families get NO `box_family` → excluded. The migration MUST query `box_family`, never a name regex (enforced by the AST gate — §6).

## 4. CONVERTER contract (the accumulator)
For a box family at a tier, the converter accumulates the 4 side-Decls (or 4 corner-Decls) into ONE object Write:
- Emit `paddingTablet = {"top": "10px", "right": "20px", "bottom": "10px", "left": "20px"}` (omit absent sides).
- Base root padding/margin/border-radius: keep routing to the WP-native `style.spacing.*` / `style.border.radius` object (unchanged — already object-shaped).
- Per-area families: emit the SGS object attr.
- Gate the accumulation on `box_family` (DB), never on the attr NAME. A family with only 1–3 sides present still emits an object with just those keys.

## 5. RENDER + EDITOR contract
- **render.php / shared helper:** read the object attr (`$attrs['paddingTablet']['top'] ?? ''`), emit a scoped `.uid{}` / `@media` rule (base already handled by the Phase-0 wrapper path for WP spacing; SGS object tiers via `helpers-responsive.php` reading the object). NEVER emit inline. WP-native base (spacing/border-radius) serialised scoped via `wp_style_engine_get_styles` + `__experimentalSkipSerialization` (Phase-0 pattern), extended to border-radius for button.
- **editor (edit.js):** bind each box family to WP's `BoxControl` (4-side) or the corner control (`__experimentalBorderRadiusControl` / BoxControl corner mode) via a shared responsive wrapper component; `onChange` writes the `{top,right,bottom,left}` (or corner) object; the device switcher selects base/tablet/mobile. Editor preview must match the frontend scoped output.

## 6. THE AST COLLISION GATE
A static gate (Node or Python, same shape as the existing cheat-gate scanner) that FAILS the build if any per-side/per-corner grouping or migration operation runs without a `box_family` DB check in its call path. Plant-test: it must FIRE on a planted name-regex merge (`.*Top$`) and stay SILENT on the correct `box_family`-gated merge.

## 7. Non-negotiables
- No deprecations (D270) — reshaped blocks re-cloned, no `deprecated.js`.
- Every merged attr keeps a client-facing editor control (BoxControl).
- Live-verify via the Pilot Acceptance Test A1–A9 (design-gate doc) before any rollout.
- Bump block version on every CSS/render change (STOP-57).
