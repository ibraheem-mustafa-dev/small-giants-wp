# SGS Configurator Pro — Project Instructions

## What This Is

A premium WordPress plugin that adds 3D product configuration with AR to any SGS website. Sold as a paid add-on (annual licence). First client: Snooza Chair by Ophir Solutions.

**S-grade strategic capability** — confirmed 2026-03-20. This is a long-term competitive investment for SGS, not a one-off project.

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

- **NO WooCommerce** — custom lean ecommerce. No WooCommerce plugins, hooks, or dependencies
- **NO Stripe lock-in** — payment gateway is abstracted. Stripe is ONE provider, not THE provider. Bean objects to Stripe's support for Israel
- **NO external CDN** — model-viewer bundled via npm, not loaded from Google CDN
- **NO freelancers** — Claude Code builds everything. AI generates 3D models
- **Self-hosted** — the plugin works without any external service except optional AI model generation
- **Product-agnostic** — configuration schema is JSON data, not hardcoded product logic
- **Mobile-first** — 60%+ of furniture browsing is mobile. Test on mid-range Android
- **WCAG 2.2 AA** — accessible. Fallback static image gallery alongside 3D viewer

## File Structure

```
sgs-configurator-pro/
  sgs-configurator-pro.php     # Plugin bootstrap + Freemius init
  includes/
    class-product.php           # Product CPT + config schema meta
    class-order.php             # Order CPT
    class-cart.php              # Session/localStorage cart via REST
    class-checkout.php          # Abstract checkout + gateway interface
    class-gateway-stripe.php    # Stripe gateway implementation
    class-gateway-paypal.php    # PayPal gateway implementation
  src/
    blocks/configurator/
      block.json                # Gutenberg block definition
      edit.js                   # Editor UI (static preview)
      view.js                   # Frontend: model-viewer + Interactivity API
      render.php                # Server-side HTML scaffold
      style.css                 # Block styles
    api/
      CartController.php        # REST: /sgs-cart/v1/add, /remove, /get
      CheckoutController.php    # REST: /sgs-cart/v1/checkout
      WebhookController.php     # REST: /sgs-cart/v1/webhook
    models/
      Product.php               # Product data model
      Order.php                 # Order data model
    ai/
      TripoProvider.php         # Tripo AI 3.0 API integration
      RodinProvider.php         # Rodin API integration (premium)
      ModelGenerator.php        # Abstract generator interface
    licensing/
      freemius-init.php         # Freemius SDK bootstrap
  assets/
    vendor/
      model-viewer.min.js       # Self-hosted model-viewer bundle
  templates/
    cart.php                    # Cart page template
    checkout.php                # Checkout page template
    order-confirmation.php      # Thank you page
```

## Development Workflow

- **Local dev:** WP Playground on Bean's PC. All media/files local
- **Build:** `@wordpress/scripts` for block compilation
- **3D models:** Processed locally via WP-CLI or scripts. Draco + KTX2 compression via glTF-Transform
- **Testing:** Playwright for visual QA. Test on 375px/768px/1440px breakpoints

## Code Standards

- PHP: 300 lines max per file. WordPress coding standards. Prepared statements for all queries
- JS/TS: 250 lines max per file. ES modules. No jQuery
- Security: nonces for all forms, capability checks, sanitise input, escape output
- UK English in all code comments, user-facing text, and documentation
- Every function has a working implementation — no stubs, no TODOs

## Key Design Decisions

1. **model-viewer over raw Three.js** — AR for free, simpler API, maintained by Google. Drop to Three.js only if model-viewer can't do something
2. **WP Interactivity API over React** — no framework bundle, server-rendered initial state, native block compatibility. Novel combination (nobody's done this with 3D)
3. **JSON config schema over hardcoded options** — new product types need only new data, not new code
4. **Abstract payment gateway** — Stripe, PayPal, Square as swappable implementations
5. **Freemius over EDD** — faster to ship, built-in annual billing and WP admin flows
6. **Progressive loading** — show poster image, load 3D on user interaction. Draco compression targets <5MB per model

## Product Configuration Schema

```json
{
  "schema_version": "1.0",
  "groups": [
    {
      "id": "colour",
      "label": "Colour",
      "type": "variant",
      "options": [
        { "id": "blue", "label": "Royal Blue", "swatch": "#0066CC", "glb_variant": "Blue" }
      ]
    },
    {
      "id": "accessories",
      "label": "Accessories",
      "type": "visibility",
      "multiple": true,
      "options": [
        { "id": "tray", "label": "Padded Tray", "price_modifier": 150, "mesh_show": ["tray"] }
      ]
    },
    {
      "id": "size",
      "label": "Size",
      "type": "metadata",
      "options": [
        { "id": "size-1", "label": "Size 1 (12-24 months)", "price_modifier": 0, "sku_suffix": "S1" }
      ]
    }
  ]
}
```

## v1 Scope (Snooza Chair MVP)

| Feature | Included |
|---------|---------|
| 3D viewer block (model-viewer) | Yes |
| Colour/material variants (6 colours) | Yes |
| Accessory visibility toggles | Yes |
| AR button (conditional on model quality) | Yes |
| Lean ecommerce (cart + abstract checkout) | Yes |
| JSON config schema | Yes |
| Draco GLB compression | Yes |
| Manual texture upload | Yes |
| AI model generation (admin tool) | Yes |
| Progressive GLB loading (Needle LODs) | No — v2 |
| GenPBR swatch-to-texture | No — v2 |
| Configure-and-share links | No — v2 |
| WebGPU cloth simulation | No — v3 |

## Snooza Chair Product Details

- **6 colours:** Mandarin Orange, Royal Blue, Apple (green), Grey, Hot Pink, Black
- **4 sizes:** Size 1-4 (12 months to adult)
- **10 accessories:** Rocker Base, Mobile Base, Pommel, Leg Rest, Profile Headrest, Padded Tray, Side Infill Pads, Base Wedge, Back Rest Adjustment, Snooza Lite
- **Base price:** From £1,164.71 (ex VAT)
- **Reference images:** Product photos in `sites/snooza-chair/assets/product-images/`
- **Client:** Ophir Solutions (ophirsolutions.co.uk)
- **AI model tests (2026-03-20/21):**
  - Tripo AI 3.0 (web UI): 8/10 quality from single photo. Export paywalled ($10/month Pro)
  - Meshy AI (web UI): 7/10 quality. Export also paywalled ($10/month Pro)
  - TripoSR (local, free): 5/10 at 512 marching cubes resolution. Usable for dev/testing, not production
  - Meshroom photogrammetry (local, free): FAILED — reconstructed the man (Randall) instead of the chair. Video frames with a person touching the product are unusable for photogrammetry. Would need dedicated product photos (100+ stills, no person, 3 orbit heights) to work
  - Gate 1 verdict: **PASS** — AI model approach validated. TripoSR 5/10 is usable as dev placeholder. Tripo Pro ($10/month) recommended for production quality
- **Video frame pipeline:** 203 frames extracted from Ophir product video. 3 segments identified. rembg could not separate man from chair (touching). Meshroom cache cleaned up
- **Image sources:** ophirsolutions.co.uk (15 thumbnails + video), fledglings.org.uk, fortunamobility.com
- **Local tools installed:** TripoSR (Python 3.12 venv), Meshroom 2023.3.0, rembg (background removal). All at `C:/Users/Bean/Projects/`
