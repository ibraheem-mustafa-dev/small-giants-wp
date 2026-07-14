---
doc_type: phase-plan
title: Two-thread styling programme — pipeline attr-routing (Spec 31 D1) + universal block token architecture (Spec 32)
status: ACTIVE
created: 2026-07-09
references:
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/plans/2026-07-07-button-external-css-rearchitecture.md
---

# Two-thread styling programme

## ▶ SESSION OPENING SEQUENCE (Bean-directed — do this FIRST, in order)

1. **Read the current setup end-to-end** (no greps-and-skim): `converter/services/root_supports.py` (esp. `lift_root_supports_to_style`, base-tier lines ~310-392 vs tier lines ~397-500), `converter/services/css_pass.py`, `converter/resolvers/styling_content.py` (`lift_styling_content`), `converter/db/db_lookup.py` (ALL accessors), and `includes/helpers-responsive.php` + `class-sgs-container-wrapper.php`.
2. **Enumerate the DB column surface** — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` schema dump of `block_attributes`, `block_supports`, `block_capabilities`, `block_composition`, `blocks`, `property_suffixes`, `slots`, `roles`. Confirm which signals exist for "this block uses the typed-attr/external-CSS channel".
3. **Map the delta to FS-A** (canonical base-attr routing) — use the "Gaps to FS-A" list below as the starting hypothesis; verify each against the code/DB, add any missed.
4. **Doc-gap pass** — Spec 31 + Spec 32 (below), then assess whether the **truth docs (CLAUDE.md, architecture.md) + the `sgs-wp-engine` skill + the DB** should carry the canonical-base-attr + no-inline + token model as a FOUNDATIONAL block-authoring contract every future block inherits.

## Gaps to FS-A — already proven this session (verify, then extend)

1. **No canonical BASE (desktop) attrs on container + section composites.** DB-confirmed: `sgs/container` has `paddingTopTablet/Mobile`, `marginTopTablet/Mobile` … but **no `paddingTop`/`marginTop` base**. The tiers presuppose a base that doesn't exist as an SGS attr → base falls to WP-native `style.spacing.*` (inline). FS-A needs the canonical base attr to route into. (Bean's reframe: the fix is "add the base attr the tiers already imply + a naming standard", NOT "invent a new family".)
2. **`root_supports.py` base tier routes to `style.*`, tiers route to SGS attrs.** FS-A = in the base-tier block (~352-388) add "try canonical base typed attr (drop bp-suffix, gate on `db_lookup.block_attrs(slug)` membership, apply `_serialise_for_schema`) ELSE fall back to `style.*`" — fallback-safe, never route-and-drop.
3. **No canonical naming / alias layer.** Blocks name base spacing inconsistently (`paddingTop` vs `contentPaddingTop` vs `spacingTop`). Need a canonical map (`paddingTop` = base, `paddingTop{Tablet,Mobile}` = tiers) + aliases for deviants — this is ALSO the detection signal (a tier-without-base = flagged violation).
4. **No first-class DB "external-CSS/root-typed-styling" flag.** Load-bearing gate today = per-attr `block_attrs()` membership (works, fallback-safe). A capability tag (mirroring `block_capabilities.scalar-styling-lift`, seeded from a `supports.sgs` flag) would be cleaner + R-31-1 compliant. `scalar-styling-lift` roster (10 blocks) does NOT include container + doesn't cover padding/margin/border.
5. **Two base routers.** `lift_styling_content` already routes base colour/typography for the 10 `scalar-styling-lift` blocks; FS-A routing base colour from `root_supports` would double-write — needs an explicit precedence rule.
6. **Container wrapper reads tiers + uses `!important`.** `class-sgs-container-wrapper.php` emits tier padding with `!important` ONLY to beat the WP-native inline base. Once base is a scoped rule (FS-A), read the base attr + delete the `!important`.
7. **block.json still declares `supports.spacing/color`** on Spec-32 blocks = the inline source. Drop per-block ONLY after the SGS base attr + routing + editor control replace it (coverage-verify first, or silent data-loss).
8. **`_serialise_for_schema` + `{attr}Unit` companion** required for base numeric attrs or the value is WP-discarded at render (CG-4 trap).
9. **The responsive helper is already FS-A-ready** — `helpers-responsive.php` emits base+tablet+mobile on one scoped selector with correct max-width cascade (unset tier inherits up). It just needs the base attr to exist + be wired into the render's helper call spec.

## Spec doc gaps (fix so the docs match the architecture)

**Spec 31:** (a) §2 layer model line ~116 still says OUTER box → `style.spacing.*` (WP-native) — CONTRADICTS Spec 32 (no inline); reconcile to "OUTER box → canonical base attrs → scoped CSS". (b) The D1 "typed-attr lift → block attrs" router (§58) is documented as disconnected/absent — ratify FS-A (canonical base-attr routing, fallback-safe) as the canonical root-CSS path + a binding rule. (c) "tier-without-base" isn't named as a defect.

**Spec 32:** (a) covers COLOUR tokens but not the GEOMETRY canonical-base-attr + tier-cascade contract — add it (base attr = desktop = always-on rule; tiers cascade up on unset; all in scoped external CSS). (b) add the HARD CONSTRAINT: Spec-32 blocks MUST NOT declare `supports.{spacing,color,border}` (that IS the inline source). (c) add the canonical attr-naming standard + alias policy. (d) Open Question #2 (product-card `cta*` → `cardPresets`) still open. (e) clarify the Spec 31 ↔ 32 boundary: Thread 1 (Spec 32) = block architecture; Thread 2 (Spec 31) = pipeline routing INTO that architecture.

## Truth-docs + skill foundational-piece opportunities

- **CLAUDE.md (project) + architecture.md:** add a core rule — "block styling = canonical base attr + tier cascade + tokens, in external CSS; NEVER WP-native `supports.{spacing,color,border}` (they inline); overrides = CSS custom-property values only." Make it a gate-every-block rule.
- **`sgs-wp-engine` skill (Block Customisation Standard):** encode the canonical-base-attr + no-inline + token model as THE foundational block-authoring contract, so every new/edited block inherits it. Wire the detection script (extends `check-hardcoded-render-defaults.js`) as the enforcement gate.
- **DB (`sgs-framework.db`):** carry the canonical-attr-naming map + the external-CSS-block capability flag, populated by `/sgs-update`, so the converter routing + detection are DB-driven (R-31-1).

## Where we are (2026-07-09)

The button was rebuilt to Spec 32 (semantic BEM class + `--wp--custom--button-presets--*` tokens + hover in `:hover`). **Hover / preset colours / structure are fixed and Bean-confirmed working live** on hero/brand/gift buttons. But QC surfaced that the fix was partial, and root-cause + a qc-council exposed **two distinct threads** (Bean's framing):

- **Thread 2 — pipeline direct-attribute routing (Spec 31 D1).** The converter's ONLY root-CSS path is `converter/services/root_supports.py::lift_root_supports_to_style` (called by `services/css_pass.py:130`), which routes **base** padding/margin/colour/border into WP-native `style.spacing.*`/`style.color.*`. WP's `get_block_wrapper_attributes()` serialises those **INLINE** on the element. Spec 31 §46/§58 says the engine must route each CSS property to the correct **block attribute** (the designed `css_router.py` "D1 typed-attr lift" — disconnected 2026-05-27, absent in the modular engine). Evidence: `root_supports.py:310-392` (base → `style.*`) vs `root_supports.py:397-500` (tablet/mobile tiers → SGS attrs `paddingTopTablet`, gated on `block_attrs()` membership). The base tier is the ONLY tier that inlines.
- **Thread 1 — universal block token architecture (Spec 32).** Only the button's COLOURS consume the token/class model; padding/margin/geometry don't, and no other block does at all. 50/74 blocks are dual-channel; ~42 inline-property emission sites across ≥16 render.php; 1/74 blocks (button) consume `--wp--custom--*-presets--*`.

## Fixes already landed (source; DEPLOY at start of next session)

- **RC2 (proven):** `button/block.json` `inheritStyle` enum gained `"custom"`. WP was rejecting the converter's `inheritStyle:"custom"` (UX-Q2, correct) against the 3-value enum and coercing it to `default:"primary"` → naked links ("Find out more") rendered as primary buttons. Fix = allow `custom`; then render gate (`custom`∉[primary,secondary,outline]) emits no preset class. **Not yet deployed** (batch with Thread-2 build).

## qc-council verdict (2026-07-09, high certainty)

- **FS-A** (route base CSS → SGS typed attrs → block's own external CSS; the D1 re-implementation) is the **correct shape** — it's the only one that routes to attributes (Bean's real goal). **FS-C** (render_block post-filter) and **FS-B** (WP Style Engine) both REJECTED (cosmetic / double-emission; don't populate attributes).
- **FS-A must be:** (1) **fallback-safe** — gate on `db_lookup.block_attrs(slug)` membership per property; fall back to `style.*` if the block lacks the base attr; **never route-and-drop** (silent data-loss); (2) pinned to the **class+token** model, NOT a render.php scoped `#uid <style>` for base props (editor-parity); (3) precedence-ordered vs `lift_styling_content` (already routes base colour for 10 `scalar-styling-lift` blocks); (4) reuse `_serialise_for_schema` (base attrs are often number-typed → raw strings get discarded, CG-4 trap).
- **CRITICAL sequencing:** `sgs/container` + section composites have NO base padding/margin/border typed attrs (only tier-suffixed). FS-A is a no-op there until those blocks **grow the base attr family** (composite-mirror FR-31-21). So the inline bug at the container/composite level needs the attr-family build FIRST.
- **Detection script: GO.** **Deterministic auto-fix: NO-GO** (apply needs per-block judgement). Detection → human/agent apply, button-first.

## Build order (next session)

1. **Deploy + verify RC2** (batch with step 2). Verify find-out-more renders as a neutral/custom link (no primary preset), fresh live (purge Hostinger LiteSpeed cache first — see gotcha).
2. **Close the button reference residuals** so "match the button" means clean: inline `margin:` (render.php ~544) + icon-span `color:`/`width:` (~569-575) → external; then drop `supports.spacing/color` from button block.json ONLY once the converter routes base→SGS attrs for it (step 3).
3. **Build the DETECTION script** (extends `scripts/check-hardcoded-render-defaults.js`): flag (a) dual-channel block.json (native supports + SGS style attrs), (b) missing `--wp--custom--*-presets--*` token consumption in style.css, (c) inline property-declaration emission in render.php (var-flow: `$inline_styles`/`$*_style_parts`/`style="` = violation; `$scoped_css_parts`/`$*_css`/`#uid`/`<style>` = OK). Report per-block classification + whether a base SGS attr family exists.
4. **Thread 2 — FS-A in `root_supports.py` base-tier block (lines 352-388):** add a "try base typed attr (drop the bp-suffix, gate on `block_attrs()` membership, `_serialise_for_schema`) else fall back to `style.*`" branch. Fallback-safe. Universal but no-op where the attr family is absent.
5. **Thread 1 — grow the base attr family** on container + section composites (composite-mirror), so FS-A actually lands there; migrate blocks to the token/class model per block, button-first, live-verified each.
6. **Wire the detection script into prebuild** once the roster is green (zero-tolerance gate).

## Gotchas learnt this session
- **Hostinger serves a LiteSpeed server-side page cache** (no WP cache plugin; `wp litespeed-purge` absent). The deploy/re-clone flow does NOT purge it → stale live verification. Purge via Hostinger MCP `hosting_clearWebsiteCacheV1` (or the panel) before trusting live DOM. (A `?query` bust did NOT work.)
- **block.json `enum` coerces invalid values to `default` at render** — any converter-emitted attr value MUST be in the block's enum or WP silently swaps it. (RC2.)
- **WP-native `supports.{spacing,color,border}` ALWAYS serialise inline** via `get_block_wrapper_attributes()` — declaring the support is the inline source, independent of render.php. Spec 32 blocks must not declare them (once the SGS attr family + converter routing replace them).
