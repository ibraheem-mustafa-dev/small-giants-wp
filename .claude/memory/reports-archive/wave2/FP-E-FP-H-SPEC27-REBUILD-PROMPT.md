# Fresh-session cold prompt — FP-E + FP-H: card-grid product capability + product-card built-in-element rebuild (Spec 27)

Paste everything below the line into a fresh Opus session. Self-contained. This is a **Spec-27 block-build milestone**, NOT clone-fix Stage-1/2/3 work — it is a multi-session block rebuild that the clone-fix waves explicitly cannot complete (per `SIGN-OFF-LEDGER.md` milestone gate).

> **⛔ SEQUENCING — DO NOT START THIS YET (Bean-confirmed 2026-06-09).** This rebuild has two hard upstream dependencies:
> 1. **The Spec27-28 council-mustfix wave plan** (`.claude/plans/2026-06-06-spec27-28-council-mustfix-wave-plan.md`) must complete first. It is `AWAITING-BEAN-SIGNOFF` with **Wave 2 mid-build/uncommitted**, and it edits the EXACT files this rebuild touches — `product-card/render.php`, `edit.js`, `block.json`, `class-configurator-meta.php`, `render-helpers.php`. Starting FP-H now = two threads rebuilding `sgs/product-card` at once (collision). FP-H's feature-rich card also BUILDS ON that plan's output (the value-ladder / configurator / pricing / consumer-law layer).
> 2. **The cloning converter Stage 1** (the universal dispatch, `STAGE1-DESIGN.md`) — the plan itself names the converter (D178) as the real first-shop blocker, and FP-E/FP-H must be cloneable, so the dispatch that routes into their slots should exist first.
> **Correct order: Spec27-28 wave plan → cloning converter Stage 1 → THEN this rebuild.** Confirm both are complete before running this prompt.

---

**Invoke `/autopilot` before anything else** (live skill routing + ADHD support).

## What this is (plain English)
Two linked block rebuilds in the SGS WordPress framework's product layer:
- **FP-E — give `sgs/card-grid` a real product capability.** Today it's a visual grid with a "Product Cards" *preset* but no actual product machinery (no WooCommerce product query, no product-aware data, no sort/filter). A client who wants "show my products in a grid" can't get it from this block. Build the product-display capability.
- **FP-H — rebuild `sgs/product-card` so its key elements are BUILT-IN to the block** (rendered by the block from its own typed attributes + inspector controls), rather than loose child InnerBlocks. Bean's complaint from the desktop review: a product card should be a **curated, cohesive, feature-rich unit** (image + name + price + per-pack value + pack-size picker + CTA), not a stack of free-floating child blocks a client can accidentally break.

## The problems we're solving (grounded — read these)
- **FP-E:** `.claude/reports/wave1/04b-featured-product-architecture.md` — the card-grid lacks a product query / WooCommerce awareness / the data + controls to display products; the "Product Cards" variation is a visual skin only.
- **FP-H:** same report — the product-card's current typed mode renders via InnerBlocks (FR-22-6), but the draft's design is a **built-in-element** card; the loose-child-block model is fragile for a product card and doesn't match how a client (or the cloning converter) should treat a cohesive commerce unit.
- The Wave-2 family map (`.claude/reports/wave2/ROOT-CAUSE-FAMILY-MAP.md`) classes both as `NEW — framework/block-capability` (not converter-routing): they are real block builds, the biggest tail items.

## End goals for the rebuilds
1. **FP-E:** a client can drop `sgs/card-grid`, choose a product source (a WooCommerce query: category/tag/featured/manual selection), and get a responsive grid of polished product cards — with the controls a non-coder expects (how many, which products, sort order, columns per breakpoint) all in the block inspector.
2. **FP-H:** `sgs/product-card` renders its core elements (image, name, price + per-unit value ladder, pack-size/option picker, CTA, badges) as a **single feature-rich block driven by typed attributes + inspector controls** — reliable, on-brand, not breakable by editing stray child blocks. Faithful to the Mama's draft's built-in card design.
3. Both are **cloneable**: the pipeline converter can reproduce a drafted product section into these blocks faithfully (see "the converter" below).

## The building philosophy (apply to every decision)
Every block must be **super user-friendly AND feature-rich** for THREE audiences at once:
1. **The website's visitors** — fast, accessible (WCAG 2.2 AA, 44px touch targets, 4.5:1 contrast), mobile-first, genuinely useful commerce UX (clear price/value, easy pack selection, obvious CTA). Performance budget: <100KB CSS / <50KB JS per page, green Core Web Vitals.
2. **The client (website owner — tech-illiterate, block-editor ONLY).** Every customisable property is an **inspector control** — never code, never WP-CLI. A product card must be configurable (which fields show, colours via tokens, layout) entirely from the editor. If a setting needs touching code, it is NOT done (project rule). Built-in elements protect the client from breaking a cohesive unit.
3. **The Claude Code agent + the cloning pipeline converter.** The block's data model must be **DB-describable** so the converter can route a drafted product section into it: every built-in element is a typed attribute with a `canonical_slot` + `role` + `attr_type` in `block_attributes` so the universal dispatch (Spec 22 §FR-22-2 / FR-22-5 / FR-22-5.3) knows where a draft value lands. A block the converter can't introspect is a block the AI website-builder can't clone.

## The FR-22-2 tension — DESIGN-GATE THIS FIRST (the crux of FP-H)
FR-22-2's general rule is "block-equivalent sub-elements become **child InnerBlocks**" (they own their styling; avoids double-render; gives the client the child block's full editor). **FP-H deliberately diverges for product-card:** a commerce card is a *curated* unit, so its elements should be **built-in** (typed attrs the block renders), not composable child blocks. This is a legitimate, intentional exception — but it MUST be reconciled, not ignored:
- Decide, per product-card sub-element, **built-in (typed attr) vs child block** — and record it (block.json + `block_attributes.canonical_slot`/`role`/`attr_type`) so the converter's dispatch routes correctly. A built-in slot → a typed attr destination; a child-block slot → an InnerBlock. The Stage-1 universal dispatch (`slot_has_equivalent_block` predicate) reads exactly this to decide.
- This is a shared-architecture decision (affects FR-22-2's three-representations model + the converter). **Design-gate with Bean + state the architectural primitive before building** (R-22-10). Do NOT silently re-litigate FR-22-2 in code.

## Systems it works in / with (and long-term viability)
- **WordPress block editor** (Gutenberg) — block.json metadata, `render.php` (dynamic) + `save.js`/`InnerBlocks.Content` where genuinely composable, `edit.js` inspector controls, `deprecated.js` for any existing-content migration. `viewScriptModule` (ES modules, Interactivity API) for any frontend interactivity — no jQuery.
- **WooCommerce** — FP-E's product query (`WP_Query` with WC product args / the WC product data store), price/stock via the live WC data the site already serves. **Spec 27 already built the read-only price/value layer (D179 — per-pack value ladder) — reuse it, do NOT rebuild a pricing engine.** FP-E reads WC; it does not write prices.
- **The SGS cloning pipeline / converter** — the block's typed-attr surface must be introspectable by `convert.py` + `db_lookup.py` (the `canonical_slot`/`role`/`attr_type` dispatch). Coordinate with the active **clone-fix Stage-1 universal dispatch** (`.claude/reports/wave2/STAGE1-DESIGN.md`) — FP-H's built-in slots are destinations that dispatch must route to.
- **The SGS theme + design tokens** — colours/spacing/typography via `theme.json` tokens + per-client `theme-snapshot.json`; never hard-code client colours. Block CSS uses `:not([style*="..."])` fallbacks so client overrides win. Block Selectors API targets native typography to the primary text element.
- **Long-term viability:** the block must work on ANY WordPress install for ANY client (restaurant, charity, law firm — not just Mama's). No client-specific data baked in. DB-describable for the converter. Standards-compliant so WP/WC upgrades don't break it. Built-in elements reduce client support-tickets (can't break the card) — the autonomy-trajectory win.

## Spec coordination
- **Spec 27** (`.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`) is the MASTER for the product/WooCommerce layer (CPT / collection / cart / dual-mode card / option-picker / configurator). Phases 1+2 SHIPPED (D165/D171/D173/D176/D177); Spec 28 P1 value-ladder SHIPPED (D179). FP-E/FP-H are the card-grid + product-card chapters — slot them into Spec 27's structure, assign FR IDs, do NOT create a parallel spec.
- **Spec 22 §FR-22-2 / FR-22-5 / FR-22-5.3** — the converter routing the built-in vs child slots.
- **Block Customisation Standard** (`plugins/sgs-blocks/CLAUDE.md`) — every block: native supports + per-element controls + CTA controls + token-overridable colours + Block Selectors API. **NB the D192 scope note:** that standard's "custom controls per inner text element" applies to blocks that render their own text — which FP-H's built-in product-card explicitly IS, so it applies here (unlike the FR-22-6 InnerBlocks composites).

## Mandatory reading (before designing)
1. `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` (the product-layer master + what's already built).
2. `.claude/reports/wave1/04b-featured-product-architecture.md` + `04a`/`04a2-featured-product-styling.md` (the FP-D/E/H facts + the draft's card design).
3. `.claude/reports/wave2/ROOT-CAUSE-FAMILY-MAP.md` + `SIGN-OFF-LEDGER.md` (FP-E/FP-H rows + the milestone gate) + `STAGE1-DESIGN.md` (the dispatch that must route to the built-in slots).
4. Spec 22 §FR-22-2 / FR-22-5 / FR-22-5.3. The current `sgs/product-card` + `sgs/card-grid` block.json / render.php / edit.js.
5. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/product-card` + `sgs/card-grid` (the live attr surface) + `python ~/.claude/hooks/wp-blocks.py dump`.

## Research approach (gold-standard before designing)
1. `python ~/.claude/hooks/local-search.py "card-grid product capability woocommerce"` + `"product card block architecture"` — check existing SGS capability + past research + Spec 27 decisions before building.
2. Web-research current best practice + competitor critique: `python ~/.claude/hooks/search.py "WooCommerce product grid block best practices 2026"` + complaints about Kadence/Spectra/GenerateBlocks product blocks (avoid their mistakes — research poor reviews per the global rule).
3. `/library-docs` for WooCommerce block / data-store APIs + `@wordpress/block-editor` InnerBlocks vs typed-attr patterns.
4. `/ui-ux-pro-max` (primary draft-design skill) for the product-card UX (the visitor-facing feature-rich card) BEFORE proposing the attr surface.

## Tooling
| Skill / invoke when | Purpose |
|---|---|
| `/autopilot` (first) | routing + ADHD support |
| `/brainstorming` | shape the built-in-vs-child decision (FP-H) + the FP-E capability before code |
| `/ui-ux-pro-max` (`/innovative-design` routes to it) | the feature-rich card UX for visitors/clients |
| `/sgs-wp-engine` | SGS framework block-dev, the QA pipeline, the DB |
| `/wp-block-development` + `/wp-block-themes` + `/wp-interactivity-api` | block.json / render / theme tokens / frontend interactivity |
| `/wp-rest-api` (at the WC-query work) | the product query endpoint/data store |
| `/adversarial-council` (pre-build) | stress-test the rebuild design (it's a big, shared-architecture build) |
| `/qc-council` (per fix-shape) | validate before dispatch |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/design-review` + `/visual-qa` + Playwright (375/768/1440) | the visitor-facing card across breakpoints |
| `/sgs-update` (after block.json/attr changes) | re-register the DB so the converter sees the new attr surface |
| `/handoff` (close) | summary + decisions + ledger update |
| `wp-sgs-developer` agent | delegate the heavy build |

## Gates (non-negotiable)
1. **DESIGN-GATE FIRST (Rule 7) + Bean approval** — the built-in-vs-child decision (FP-H) + the FP-E capability shape are shared-architecture; design + state the primitive, get Bean's sign-off BEFORE code.
2. `/adversarial-council` on the rebuild design (pre-build pre-mortem) + `/qc-council` per fix-shape.
3. **Client-experience gate:** every customisable property has an inspector control; verify in the live editor (Playwright login to the canary, `.claude/secrets/sandybrown.env`). A setting that needs code = not done.
4. **Converter gate:** every built-in slot has `canonical_slot`/`role`/`attr_type` in `block_attributes` (via `/sgs-update`) so the cloning dispatch can route to it. Run a clone of a product section + live-DOM verify it reproduces.
5. **Visitor gate:** WCAG 2.2 AA + mobile-first + perf budget, verified at 375/768/1440.
6. **R-22-13:** Bean's visual sign-off co-authoritative; **R-22-11:** live-DOM, not assertions.

## Build / commit discipline
- Build: `cd plugins/sgs-blocks && npm run build` (PowerShell, not Bash). `--webpack-copy-php` copies render.php.
- Existing-content migration → `deprecated.js` (these blocks have shipped instances).
- Path-scoped commits on shared `main` (`git commit -- <paths>`); never `Co-Authored-By`; UK English. Core block changes → `main`.
- Update Spec 27 + the SIGN-OFF-LEDGER (FP-E/FP-H → VERIFIED) + `/sgs-update` on completion.

## Done-when
FP-E: `sgs/card-grid` displays a WC product query with full inspector controls, responsive, accessible, cloneable. FP-H: `sgs/product-card` renders its core elements built-in (typed attrs + controls), faithful to the draft, client-unbreakable, converter-introspectable. Both: design-gated + adversarial-council'd + live-editor + live-DOM + Bean visual sign-off; Spec 27 updated with the FR IDs; ledger rows → VERIFIED. Report: the built-in-vs-child decision table (per element), the FP-E capability surface, the converter routing for each slot, and any element deferred with reason.
