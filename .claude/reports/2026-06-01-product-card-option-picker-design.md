# Product-Card System + `sgs/option-picker` Block — Design (2026-06-01)

Research-buddies + brainstorming output (Sonnet agent, web-researched). DESIGN ONLY — no code shipped. Grounds the build for Spec 24 §FR-24-11..17. Bean has 6 open decisions (end).

## Research verdict (imitate / avoid)
- **Imitate:** pills/buttons beat dropdowns for ≤8 options (Baymard: −1.5-2s select time); W3C APG **radio-group** pattern (`role=radiogroup` > `role=radio` + `aria-checked`, single tab stop, arrow-key nav) is the correct exclusive-selection semantic; Block Bindings API (WP 6.8+/7.0 Pattern Overrides) for CPT→card binding; show each variation TYPE as its own labelled group; declare per-TYPE what content it changes.
- **Avoid:** WooCommerce Product Collection (dependency + dev-locked template, GH #44776/#60798); swatch plugins (all wire to Woo `pa_*` taxonomy — wrong layer); **`aria-pressed` on a button group** (wrong for exclusive selection — must be `role=radio`+`aria-checked`; TRUTH-SPEC's current `aria-pressed` pills must change); dropdowns for ≤8 options; per-block hardcoded variation logic.

## The atomic block: `sgs/option-picker` (NOT sgs/button)
Exclusive pick-one picker. Reusable beyond product-card (plan tiers, colours, sizes — FP-9). **ARIA = radio group via visually-hidden `<input type=radio>` + `<label>` + `<span class=__pill>`** (browser handles the keyboard contract natively → vanilla-JS-friendly; CSS `input:checked + .__pill` drives the active style — NO JS for visual state). 44px targets. `category: sgs-interactive`.

Markup shape:
```
<fieldset class="sgs-option-picker"><legend class="sgs-option-picker__label">Number in Pack</legend>
  <div class="sgs-option-picker__options" role="radiogroup" aria-labelledby="…">
    <label class="sgs-option-picker__option"><input type=radio name=uid value="8" checked>
      <span class="sgs-option-picker__pill">8-pack</span></label> …
  </div></fieldset>
```

block.json attrs: `label`, `showLabel`, `optionItems[]` ({key,label}), `defaultSelected`, `contentImpact[]` (which card slots it changes), `typeKey` (matches CPT variation type), `pillStyle` (outlined/filled/ghost), `pillSize`, + colour tokens. `viewScriptModule` Interactivity API store; dynamic render.php (no-JS safe — server renders default-selected state). Selection dispatches a **bubbling `sgs:option-selected` DOM event** (`{typeKey, selectedKey, contentImpact}`) → keeps the picker decoupled from any parent (card listens, or a pricing-page store, or nothing).

## Variation-sets (the NEW requirement beyond current Spec 24)
Current Spec 24 treats variations as a flat `packSizes`. Real products have MULTIPLE types each changing DIFFERENT card areas (Mama's: pack-size→price; flavour→image+price; topping→image; dietary→nothing visible). New CPT meta `_sgs_variation_sets` (JSON, show_in_rest) per type: `{type_key, type_label, display_as, content_impact[], options[]}`. The card reads `content_impact` and acts on whatever it finds — **no hardcoded knowledge of which type changes which slot** (FP-1/FP-9). Bound mode: render.php serialises the meta into `data-wp-context`; the card's Interactivity store swaps slots on `sgs:option-selected`. Typed mode (clone): `sgs/option-picker` InnerBlocks authored directly. Same store, two data sources.

## Proposed Spec 24 FRs (summary — full text → §FR-24-11..17 in spec)
- **FR-24-11** `_sgs_variation_sets` meta on sgs_product CPT (+ `_sgs_sku_matrix` for multi-dimension price, Phase 2).
- **FR-24-12** content-impact map drives card rendering, not block logic (universal).
- **FR-24-13** variation state in a per-instance Interactivity API store (no globals).
- **FR-24-14** Phase-1 slot-conflict priority: first type in the array wins (SKU matrix in Phase 2).
- **FR-24-15** pickers are `sgs/option-picker` blocks (Typed=InnerBlocks, Bound=server-rendered same shape).
- **FR-24-16** no-JS default state (server renders first-selected; fully meaningful without JS).
- **FR-24-17** `aria-live="polite"` on price/price-note slots; image alt updates on swap.

## Phased build
- **A — `sgs/option-picker` standalone** (block.json + edit repeater + render.php ARIA + view.js event + style + deprecated v1 + add to product-card allowedBlocks + sgs-interactive). Gate: works standalone, correct ARIA + keyboard.
- **B — `_sgs_variation_sets` data model** (register_meta + admin editor UI + binding source). Gate: saved + read via REST.
- **C — card Bound mode + wiring** (sourceMode attr, render Bound, extend card view.js store, aria-live). Gate: pack-size→price, flavour→image; no-JS default; WCAG.
- **D — Typed picker authoring** (drag option-picker into Typed card; same event store).
- **E — collection/query block** (existing Spec 24 FR-24-4/5, after card stable).

## RESOLVED — Bean's 6 decisions (2026-06-01, ratified D144 → Spec 24 §FR-24-11..17)
1. **Dietary / non-price options** → **per-type `display_as` mode** + card-level "price only" toggle. Each variation type renders as `pills` (interactive) | `static-list` ("Available in 3 flavours: Banana, Strawberry, Chocolate" — a non-interactive selling point) | `hidden`. A card toggle hides ALL pickers → card shows just "From £x". Bean's "pills that swap image/text not price" already fits `content_impact` (a flavour pill swaps photo+description, leaves price). *(Enhances the original rec — feature, not just show/hide.)*
2. **Two types both impact price** → **defer + warn** (rec accepted). Phase-1 editor warning, first type wins; `_sgs_sku_matrix` is Phase 2.
3. **Pill style** → **filled in card / outlined global** (rec accepted) + **three CSS states**: resting / hover+focus ("considering") / `:checked` ("selected").
4. **Clone of the Mama's pill group** → **emit `sgs/option-picker` DIRECTLY** (Bean corrected 2026-06-01 — OPPOSITE of the original rec). Update TRUTH-SPEC + slot_synonyms/slots so the converter outputs the picker block for a pill group. **Build the option-picker ASAP + battle-ready, then wire into the pipeline** — pulls Phase D forward; the picker must be robust enough to be the converter's emit target.
5. **Source toggle location** → **BOTH toolbar AND inspector** (one attr, two controls).
6. **CPT variation-sets editor UI** → **Gutenberg panel** (rec accepted).

**Status:** design ratified; BUILD is theme-thread Task 2 (deferred). This report + Spec 24 §FR-24-11..17 are the build contract.
