# Preset-Sync (buttons) — design gate (2026-07-05, Bean-requested at CG-5-B)

**Status: DESIGN — awaiting Bean approval + qc-council before build.**

## Problem (plain English)
When a draft styles a preset-mapped element (`.sgs-button--primary`), the site's preset definition may not match the draft's CSS. Today the block renders the SITE preset and the draft's intent is lost. Bean's requirement: the pipeline detects the mismatch and corrects the SITE's preset for that client — so every button using the preset inherits the draft's look, once, client-wide.

## Design (universal, DB-driven, per-client channel)

1. **Preset fact table.** `/sgs-update` gains a seeding stage reading each block's preset definitions (`button/style.css` `--wp--custom--button-presets--<preset>--<prop>` var consumption + block.json style variations) into a new `block_style_presets` table: `(block_slug, preset_name, css_prop, var_name, default_value)`. DB-first (R-31-1); the table IS the map from draft modifier → preset → the CSS vars that define it.
2. **Detection (new converter service, Stage 0.7-adjacent).** When recognition maps a draft modifier to a preset (`--primary` → `is-style-primary` via `inherit_style_for_modifier`), collect the draft's computed declarations for that class and diff against the preset's CURRENT resolved values (theme snapshot custom vars, else the table's defaults). Output: per-preset diff set (prop, draft value, site value).
3. **Correction (per-client theme snapshot writer).** Diffs write into `sites/<client>/theme-snapshot.json` under `settings.custom.buttonPresets.<preset>.<prop>` (the existing `--wp--custom--button-presets--*` channel) — NEVER into block CSS, never global. One draft, one client, corrected once; deployed by the existing `push-theme-snapshot.py`.
4. **Conservation.** Every preset-diffed declaration is accounted in the run ledger as `transferred-via-preset` (a new accounting class) so A2/F5 conservation sees it — not silent, not a gap.
5. **Conflict rule.** If TWO draft elements map to the same preset with DIFFERENT values, go LOUD (operator queue) — never last-wins.

## Preset build-out (Bean-approved companion task)
The button presets are colour-only today. Build them out to full definitions (padding, radius, font-size, min-height, borders per preset — primary/secondary/outline/custom) sourced from the draft-agnostic design tokens, so `is-style-*` classes are complete looks, not colour swaps. This also fixes CG-5-b's "outline can't shrink".

## Risks / open questions for the gate
- Snapshot writes happen at CLONE time — should a re-clone overwrite operator-tuned presets? Proposal: only write when the var is absent OR carries the previous auto-written value (a `_sgs_preset_sync` provenance marker in the snapshot).
- Which prop families are preset-syncable? Start with the button table's vars only; extend per block family later.

**Effort: ~1 session (table seed + detector + writer + tests + LANDED).**
