---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Draft vs clone DIRECT HTML diff — the true issue register (replaces parity2/artefact framing)"
created: 2026-06-08
status: ACTIVE REGISTER — sourced ONLY from the draft index.html vs the clone's saved page-source HTML + script code + DB. Pipeline artefacts/parity2/logs are NOT a source of truth (Bean-locked 2026-06-08; they misled for weeks).
evidence:
  - "DRAFT: sites/mamas-munches/mockups/homepage/index.html (single <style> block, mobile-first min-width)"
  - "CLONE: sites/mamas-munches/mockups/homepage/current-clone-page-source.html (saved live page-source; 68 inline <style> + 150 inline style=)"
  - "7 parallel section-comparison agents (hero/trust-bar/featured-product/brand/ingredients/gift/social-proof), each citing draft line + clone line + value"
  - "Bean eye-confirmed 2026-06-08: brand section renders STACKED (1 col) — validates R1 below"
method: "Direct HTML comparison, content sections only (header/footer excluded). Each finding cites draft value+line AND clone value+line. Cascade claims verified against real specificity (inline style 1,0,0,0 beats any stylesheet selector without !important)."
---

# Draft vs clone — the true issue register (2026-06-08)

Sourced by directly diffing the draft `index.html` against the clone's saved page-source HTML. Organised by ROOT CAUSE (universal patterns, R-22-9) because the same defects recur across every section — fix the mechanism once, not per-section.

## R1 — Inline-CSS-beats-@media: responsive layout is UNIVERSALLY BROKEN (HIGHEST LEVERAGE)

**Every one of the 7 sections has this.** The container / heading / grid render.php writes the BASE (mobile) responsive value as an INLINE `style="..."` on the element, and the larger-breakpoint overrides as `<style>` `@media` blocks. Inline styles (specificity 1,0,0,0) beat any stylesheet `@media` rule (≤0,2,0,0) with no `!important` — so the responsive override can NEVER apply. This is exactly project Rule 6 ("responsive values in block attributes, never inline CSS — inline beats @media and kills responsiveness").

| Section | Inline value that wins | Intended responsive | Visible effect | Sev |
|---|---|---|---|---|
| brand | `grid-template-columns:1fr` | 2-col at ≥768px | **STACKED 1-col at desktop (Bean-confirmed)** | HIGH |
| hero | `grid-template-columns:1fr` (last of duplicate decls) | 2-col split at ≥768px | content stacked over image at desktop | HIGH |
| trust-bar | `grid-template-columns:repeat(4,1fr)` | 2-col at mobile | 4 cramped columns on mobile | HIGH |
| ingredients | `grid-template-columns:1fr 1fr` | 4-across at ≥600px | locked 2-col, never 4-across | HIGH |
| gift-section | `grid-template-columns:1fr 1fr` | 1-col at mobile | 2 squished cards on phone | HIGH |
| featured-product | `grid-template-columns:5fr 3fr` + H2 `font-size:36px` | 1-col / 28px on mobile | cards side-by-side + oversized H2 on small screens | HIGH |
| social-proof | H2 `font-size:28px` | 36px at ≥640px | heading never scales up | HIGH |

**Fix-shape (universal, design-gate per Rule 7 — shared render):** the container/heading/grid render.php must emit responsive layout values as **class-based `<style>` rules (mobile-first min-width)**, NOT write the base value inline. Mirror the draft's own approach (all in one stylesheet, base + min-width overrides). One mechanism fix repairs all 7 sections.

## R2 — Inverted breakpoints (min-width → max-width)

The clone's generated container CSS uses `@media (max-width:…)` (desktop-down) where the draft uses `@media (min-width:…)` (mobile-first). Seen in trust-bar (`max-width:599px`/`1023px`), brand (`max-width:1023px`), featured-product, ingredients, gift. Even after R1 is fixed, the breakpoint direction must match the draft's mobile-first min-width intent, or the wrong layout shows in the 600–767px band. **Fix with R1** (same render path).

## R3 — `max-width` / size constraints dropped on section roots & images

| Element | Draft | Clone | Effect | Sev |
|---|---|---|---|---|
| brand section | `max-width:1000px;margin:0 auto` | absent | stretches edge-to-edge on wide screens | HIGH |
| trust-bar `__inner` | `max-width:1100px` | wrapper gone; no cap | badges spread too wide | MED |
| hero `__sub` | `max-width:420px` (≥768px) | absent | long lines | MED |
| product-card `__image` | `height:220px` | absent | images render full intrinsic height; cards mismatched/too tall | HIGH |
| brand `__image` | `max-height:440px;height:440px;border-radius:16px` | absent | uncropped, square corners | MED |
| hero mobile image | `height:340px` | absent | far too tall on mobile | HIGH |
| disclaimer | `max-width:620px` | absent | full-width | MED |

## R4 — Malformed CSS values emitted (real render bugs)

- **Price `font-family` broken** → emitted as `font-size:28px;font-weight:700;, serif` (the `font-family` name is missing; only `, serif` survives → invalid → ignored). Prices (£10/£5 featured-product; £15/£42 gift) render in body font (Inter), NOT Fraunces serif. **HIGH.**
- **`line-height:1.65unitless` / `1.55unitless`** — invalid CSS (a number-keyword glued together). Browser discards it → falls back to default ~1.2. Affects testimonial text (social-proof), ingredient body copy, featured-product. **HIGH** (tighter, harder-to-read text).

## R5 — Harvested per-element CSS targets classes the WP block doesn't render

The harvested `.page-id-8 .sgs-X__y { … }` rules target draft BEM classes (e.g. `.sgs-featured-product__price`, `.sgs-section-heading__intro`, `.sgs-testimonial__text`) that DON'T exist on the clone's WP block elements (which carry `wp-block-sgs-text` etc.). So those harvested rules never match → margins/colours/fonts they carry are silently lost (featured-product H2 margin-bottom:6px, intro margin-bottom:32px; etc.). **MED–HIGH.** Either the converter must put the draft class on the emitted element, or lift the value onto the block's own attrs.

## R6 — Content / block-substitution defects

- **ingredients disclaimer: TEXT MISSING.** Converted to an `sgs/notice-banner` that renders only the info icon — the medical-claims disclaimer text ("we don't make medical claims…") is absent. Content + **compliance** risk. **HIGH.**
- **ingredients icons: all 4 emoji (🌾🍺🌿🌱) → identical `lucide-star`**, wrapped in broken `<a href="http://🌾">` anchors. **HIGH.**
- **gift-section "Send to Ward" callout replaced** by the global promo bar ("20% off LAUNCH20") placed inside the section. The ward-delivery callout is gone. **HIGH.**
- **social-proof: extra `?` avatar placeholder** rendered in each testimonial card (unresolved initials). **MED.**
- **social-proof testimonials → autoplay slider** (draft was a static always-visible 3-col grid). All content reachable in DOM, but adds autoplay motion + arrows/dots not in the draft. **MED** (verify `prefers-reduced-motion`).

## R7 — Smaller per-section value diffs (MED/LOW)

Trust-bar star icon filled→outlined; icon sizes 24px vs draft (32px ingredients / 15px social-proof stars); `align-items:start` inline vs draft `center` (trust-bar, social-proof, featured-product price-row baseline→start); various missing `margin-bottom` on headings/subs; gift sub-heading colour `text-muted` vs `text` + centred; gift label possible pill background. Full per-finding citations in the 7 agent reports (this session).

---

## Priority order (by leverage)

1. **R1 + R2 (one fix)** — render.php: emit responsive layout as mobile-first class rules, not inline base + max-width overrides. Repairs responsive layout across ALL 7 sections. Design-gate (Rule 7, shared render).
2. **R4** — fix the two malformed emits (font-family shorthand; the `Nunitless` line-height). Likely small, localised render/converter bugs. High visible impact (prices in wrong font; tight line-height everywhere).
3. **R3** — transfer max-width / image-height constraints (the §FR-22-21 lift onto container/media attrs).
4. **R6** — content/substitution (disclaimer text, ingredient icon identity, ward callout). Per-item.
5. **R5** — harvested-class vs WP-element mismatch (converter routing).
6. **R7** — polish.

All fixes verify from the EMIT + the clone page-source HTML (re-save after each clone) + Bean's eye — NOT parity2.
