---
report: site-footer visual-diff + live verification
date: 2026-07-13
session: D325 (Track B — footer + cart + schema/binding)
target: https://sandybrown-nightingale-600381.hostingersite.com/ (mamas-munches canary, WP 7.0.1)
blocks_changed: [sgs/site-footer, sgs/site-footer-row, sgs/cart]
verdict: PASS
first_paint_capture_passed: true
---

# sgs/site-footer — live verification (D325)

Draft ground truth: `sites/mamas-munches/mockups/.../mamas-munches-mockup.html` `.mm-footer`
(dark band `var(--text)`, 3 columns `2fr 1fr 1fr`, collapse to 1 below 768, centred bottom bar).

## Computed-value checks (live DOM, deployed + LiteSpeed/OPcache/CDN cleared)

| Check | Desktop 1440 | Tablet 768 | Mobile 375 | Verdict |
|---|---|---|---|---|
| columns row `display` | grid | grid | grid | PASS |
| `grid-template-columns` | `592px 296px 296px` (=2fr 1fr 1fr) | `304.5 152.25 152.25` (=2fr 1fr 1fr) | `312px` (1 col) | **PASS — collapses 3→1 at mobile tier** |
| footer reflow (`right ≤ innerWidth`) | OK | OK | OK | PASS |

## Acceptance criteria (FR-S9-3 + guardrails)

- **Empty-row zero-output** — the empty `top` row emits NO DOM node (`.sgs-site-footer-row--top` absent from live DOM). PASS.
- **No inline `style=""`** on the footer wrapper (`getAttribute('style')` = none; colour/spacing serialised scoped via `wp_style_engine_get_styles`, Spec 32). PASS.
- **Copyright binding (FR-S9-10)** — bottom bar renders "Mama's Munches" from the `sgs/site-info` `copyright` binding (not the literal "placeholder"; the whole page's literal-placeholder count went 17 → 0 after the binding-source fix). Tagline binding also resolves. PASS.
- **`<footer>` contentinfo landmark** — the block renders as a `<div>` inside the FSE `<footer>` template-part landmark. PASS.
- **Heading structure (SEO/AI/a11y)** — real `<h2>` Quick Links, `<h2>` Contact, `<h3>` Opening Hours; 20 crawlable `<a>` links. PASS.
- **Empty-field hints** — socials/phone/opening-hours show the framework's designed "Set … in SGS Site Info →" admin-hint fallback (Wave 1C) because this canary's store has those fields empty. This is the binding WORKING, not a failure.

## Schema / SEO / AI discoverability (Part 1.5)

- Front-page `Organization` JSON-LD now emits `sameAs` (from Site Info `socials.*`) + `contactPoint` (phone/email) — previously scoped out ("no UI writer"). One data source (Site Info) feeds both the visible footer and the structured data. Live-confirmed `"sameAs"` + `"contactPoint"` + `"@type":"Organization"` present on the homepage. PASS.

## Root-cause fixes made during verification (both PRE-EXISTING latent bugs the footer surfaced)

1. **`sgs/site-info` binding source was never registered.** `Sgs_Site_Info_Binding::register()` was only referenced in a docblock, never called — so every `sgs/site-info` binding rendered its raw `placeholder` text. Wired the boot call into `sgs-blocks.php`.
2. **`register_block_bindings_source()` was silently rejected** because the class passed `can_user_edit_value` — NOT a valid arg in WP 6.5–7.0 core (returns `false`, whole registration dropped). Removed the key.
3. **`get_value()` signature fatal** — param 2 was typed `array $block` but WP core passes a `WP_Block` object → `TypeError` → HTTP 500 (caught live, fixed immediately, site recovered). Relaxed the type hint.

## Cart hide-when-empty (Task 3)

- `sgs/cart` `data-hide-when-empty` attribute is live on the rendered element (default `"0"`). Mechanism deployed: block.json attr + render.php `sgs-cart--hidden-empty` class on SSR-0 + view.js reveal-on-count>0 in `updateCartWidgets()` + edit.js toggle. Dead-control gate green (consumption verified). Full toggle-on live test requires an editor-set instance (mechanism verified end-to-end in code + built assets).

## Known (NOT this footer)

- Page-level horizontal overflow at 1440 (`scrollWidth 2763`) traces entirely to Track A's in-progress `sgs/adaptive-nav__list` (2739px) — `anyInFooter: false`. Pushed live as a side effect of the shared plugin build; Track A's commit will resolve it. My footer contributes zero overflow at every tier.
