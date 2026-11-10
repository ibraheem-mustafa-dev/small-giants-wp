# SGS Configurator Pro — Project Instructions

Not built yet; this file describes the planned plugin.

Unrelated to Spec 27 (`.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`), which is the WooCommerce variable-product/card-authoring layer. This plugin is a separate paid add-on for 3D/AR product viewing.

## What This Is

A premium WordPress plugin that adds 3D product configuration with AR to any SGS website. Sold as a paid add-on (annual licence). First client: Snooza Chair by Ophir Solutions. This is a long-term competitive investment for SGS, not a one-off project.

Config schema and v1 scope: `.claude/plans/2026-08-03-snooza-configurator-build-plan.md`, Appendix A.

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| 3D Viewer | `@google/model-viewer` (npm, self-hosted) | Apache 2.0. AR on iOS+Android free. ~500KB bundled |
| Material variants | KHR_materials_variants in GLB | Colour/fabric switching. Blender-native. Zero network cost |
| Block | Gutenberg block + `viewScriptModule` + WP Interactivity API | Frontend-only JS. No React bundle needed |
| AI Models | Tripo AI 3.0 (default) + Rodin (premium) | Image-to-GLB via REST API. Admin tool |
| Ecommerce | Custom CPT + abstract payment gateway | NO WooCommerce. Stripe/PayPal/Square swappable |
| Config Schema | JSON Schema in CPT post meta | Product-agnostic. Variant/visibility/texture_swap/metadata types |
| Licensing | Freemius | Annual per-site billing |

## Non-Negotiables

- **NO WooCommerce**: custom lean ecommerce. No WooCommerce plugins, hooks, or dependencies (the add-on must sell on sites that do not run it).
- **NO Stripe lock-in**: the payment gateway is abstracted. Stripe is ONE provider, not THE provider. Bean objects to Stripe's support for Israel.
- **NO external CDN**: model-viewer is bundled via npm, not loaded from Google CDN.
- **NO freelancers**: Claude Code builds everything. AI generates 3D models.
- **Self-hosted**: the plugin works without any external service except optional AI model generation.
- **Product-agnostic**: configuration schema is JSON data, not hardcoded product logic.
- **Mobile-first**: 60%+ of furniture browsing is mobile. Test on mid-range Android.
- **Accessible**: WCAG 2.1 AA baseline (2.2 per public-sector/EU client), with a fallback static image gallery alongside the 3D viewer.

## Development Workflow

- **Local dev:** WP Playground on Bean's PC. All media/files local.
- **Build:** `@wordpress/scripts` for block compilation.
- **3D models:** processed locally via WP-CLI or scripts. Draco + KTX2 compression via glTF-Transform.
- Code standards: WordPress coding standards, ES modules, no jQuery.

## Design Decisions

- **model-viewer over raw Three.js**: AR for free, simpler API, maintained by Google. Drop to Three.js only if model-viewer cannot do something.
- **Progressive loading**: show the poster image, load 3D on user interaction. Draco compression targets under 5MB per model.

## Snooza Chair Product Details

- **Product facts** (sizes, colours, headrest axis, accessories, price): `sites/snooza-chair/CLAUDE.md`
- **Reference images:** `sites/snooza-chair/assets/` (Wix hash-named files; open the directory and choose)
- **Client:** Ophir Solutions (ophirsolutions.co.uk)

3D model-generation tool trial log: `.claude/reports/2026-03-20-snooza-chair-3d-tool-trials.md`.
