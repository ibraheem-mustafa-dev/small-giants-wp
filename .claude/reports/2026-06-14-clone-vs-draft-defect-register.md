---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Clone-vs-draft defect register — Mama's homepage (2026-06-14)"
created: 2026-06-14
status: ENUMERATION COMPLETE (Task 2). Source = direct static diff of current-clone-page-source.html vs index.html, 4 parallel agents, paired by content+position (NOT draft BEM class). LIVE-PROBE rows pending page-8 computed-style confirmation. Replaces the under-counting 55-issue ledger as the honest to-do list. Input to Task 3 (root-cause-family fixes).
---

# Clone-vs-draft defect register — Mama's Munches homepage

**Method:** 4 read-only agents diffed the live clone (`current-clone-page-source.html`) against the draft truth source (`index.html`, CSS embedded L10-715). Paired by content+position. The draft is canonical. ~46 real defects. **The win is the family view** — 6 systemic converter families account for the majority; fixing each once fixes every instance (R-22-9 universal).

## ⛔ SYSTEMIC FAMILIES (the high-leverage Task-3 levers — fix once, fix many)

| Fam | Pattern | Instances (section · row) | Fix layer | Confidence |
|-----|---------|---------------------------|-----------|------------|
| ~~A. Label-as-pill~~ | **FALSE POSITIVE — live-probe @1440 + @502: 3 section eyebrows compute `background: transparent` (the inline `--sgs-label-bg` var resolves transparent; 6px radius harmless with no fill). Labels render per draft. Static agents misled by the inline CSS var declaration (measurement-vs-rendered trap). DROPPED.** ("NEW? START HERE" trial tag has a gold bg but that is the featured trial badge, a different element — see F13.) | ~~hero·HE1 · ingredients·I12 · gift·G1~~ | — | DROPPED |
| **B. `X unitless` malformed line-height** | converter appends the literal string `unitless` to a unitless line-height → `line-height:1.65unitless` (invalid, ignored by browser; falls back to a valid block-CSS lh so VISIBLE impact is fallback-masked, but the emit is a real bug) | hero·HE6 (1.65) · ingredients·I10 (1.55) · [D226 hero-sub] | converter (convert.py line-height emit) | HIGH (emit) / med (visible) |
| **C. Missing mobile font-size tier** | heading responsive emit keeps desktop + @≤1024 tiers but DROPS the smallest (<768) tier → headings too big on mobile | hero h1·HE4 (34px lost) · brand·B6 (28px lost) · featured h2·F9 (28px lost) | converter (responsive heading emit) | HIGH |
| **D. max-width dropped** | section/element max-width not transferred → content runs full-bleed | trust-bar·T1 (1100px) · brand·B2 (1000px) · hero-sub·HE5 (420px = old H-C1) · ingredients-disclaimer·I13 (620px) | converter (class-section Method-2 gap + per-element max-width) | HIGH static / LIVE-PROBE width |
| **E. Image styling dropped** | media `border-radius` / `max-height` / `order` / sizing not transferred | brand·B3 (radius16) · B4 (max-height380/440) · B5 (order:-1) · hero·HE8 (img height) | converter (media-CSS lift) | HIGH static |
| **F. Grid breakpoint mismatch/inversion** | clone uses different breakpoints than draft (min-width↔max-width inversion; 599 vs 640; wrong tablet col count; conflicting auto-fill) | brand·B1 (INVERTED) · featured·F8 (600-767 2-col vs 1-col) · ingredients·I9 (auto-fill conflict) · gift·G4 (599 vs 640) · hero-CTA·HE10 (gap) | converter (grid/breakpoint emit) | HIGH |

## 🔀 BLOCK-MATCH DECISIONS (Bean's eye — over-emit: SGS block adds chrome the draft never had)

These are Stage-2 block-matching choices, not pure bugs. Each needs a keep/strip decision (R-22-13):

| # | Draft element | Clone emitted | Over-added | Decision |
|---|---------------|---------------|------------|----------|
| DEC-1 | disclaimer plain styled `<p>` (italic, white bg, border, max-width 620, centred) | `sgs/notice-banner` + info SVG icon + role=note | icon + role; loses italic/max-width/centring | strip to plain text block? |
| DEC-2 | gift cards plain `div` (white, radius, border, no motion) | `sgs/info-box` + `sgs-has-hover sgs-has-hover-scale sgs-has-img-zoom sgs-has-focus-ring` | hover scale 1.02 + img-zoom + focus-ring | strip motion? |
| DEC-3 | "Find out more →" plain text link (primary-dark, underline-hover) | `sgs/button is-style-primary` (coral filled button) | full button chrome | link not button |
| DEC-4 | static 3-col CSS grid of testimonials (no JS) | `sgs/testimonial-slider` interactive carousel (arrows/dots/autoplay) | full carousel behaviour + stage/track/slide DOM | keep carousel or static grid? |
| DEC-5 | single CTA `<a>` direct child | wrapped in `sgs/multi-button` flex container | redundant single-item wrapper | unwrap singles? |

## 🏗️ HEADER + FOOTER — template-part / data gap (NOT converter; chrome-skipped by R-22-1)

The `<header>` and `<footer>` are chrome-skipped by design and rebuilt as theme template parts — but the live page shows generic placeholders, so the CONTENT fidelity gap is real (fix layer = theme template-part wiring + SGS Site Info seeding, or a decision to populate from the draft):

| # | Element | Draft | Clone (live) | Fix layer |
|---|---------|-------|--------------|-----------|
| HF-1 | Desktop nav | curated 5 links (Shop / Our Story / Send to Ward ★ / Gift Ideas / FAQs) | auto `wp_page_list` (Cart, Checkout, test pages…) | theme (assign real nav menu) |
| HF-2 | "Send to Ward ★" featured nav link | present, coral-pill | absent | theme |
| HF-3 | Footer (whole) | bespoke 3-col: brand + meta + social + Shop(7) + Information(5) + copyright | generic theme footer (Quick Links Home/About/Services/Blog, empty business-info) | theme template-part + Site Info data |
| HF-4 | Business meta | "Birmingham, UK" / Zainab@mamasmunches.com | empty "Set in Appearance > SGS Site Info" placeholder | block (Site Info seed) |
| HF-5 | Copyright disclaimer | "© 2026 Mama's Munches. Registered Food Business…" + tagline | absent | theme/converter |
| HF-6 | Logo height | 44px | custom-logo 240×80 (LIVE-PROBE rendered height) | theme (site logo size) |
| HF-7 | Dead header CSS | — | draft `.sgs-header__*` lifted to page `<style>` scoped `.page-id-8` but no matching DOM → dead noise | converter (don't lift chrome CSS) |

## 📋 PER-SECTION DETAIL (non-systemic / section-specific defects)

### Trust-bar
- **T1** inner missing `max-width:1100px` → full-width (Fam D) · converter
- **T5** 4th badge star: draft filled polygon `fill:primary-dark`; clone Lucide **stroked** outline (icon resolver) · converter
- T3 icon circle shadow token differs (draft `0 1px 2px rgba`; clone `--wp--preset--shadow--sm`) · LIVE-PROBE · theme/block
- T4 icon svg size (draft 20px; clone markup 24px attrs) · LIVE-PROBE · block
- T6 badge text font-size (draft 13/14px) · LIVE-PROBE · block

### Featured-product
- **F7** product-card `h3` title forced `font-family:Fraunces`; draft inherits Inter body (no font-family) · converter
- **F8** products grid tablet 600-767: clone 2-col, draft 1-col (Fam F) · converter
- **F9** h2 mobile: clone fixed 36px, draft 28px<768 (Fam C) · converter
- **F12** trial card: draft diagonal `linear-gradient` bg dropped in clone · converter
- **F13** trial tag pill: clone bg `primary`; draft `accent` · converter
- F10 pack-size selector: draft custom pills vs clone `sgs/option-picker` radios · LIVE-PROBE styling · block
- (matches: intro paragraph, content-width 1040px ✓)

### Brand
- **B1** grid breakpoint INVERTED (clone 2-col mob/tablet 1-col desktop; draft opposite) (Fam F) · converter
- **B2** section `max-width:1000px` dropped (Fam D) · converter · LIVE-PROBE width
- **B3** image `border-radius:16px` dropped (Fam E) · converter
- **B4** image `max-height:380/440px` dropped (Fam E) · converter
- **B5** image mobile `order:-1` dropped (Fam E) · converter
- **B6** headline mobile 28px tier lost (Fam C) · converter
- **B7** ghost CTA duplicated margin emit (`margin-top:8px;margin:8px 0 0 0`) (Fam K) · converter

### Ingredients
- **I8** info-box text-align: clone emits `left`; draft inherits `center` from `__inner` (= IN-E confirmed) (Fam·F3) · converter
- **I9** feature-grid: inline `1fr 1fr` + injected auto-fill `minmax(240px,1fr)` conflict; no guaranteed 4-up (Fam F) · converter
- **I10** info-box `p` line-height `1.55unitless` malformed (Fam B) · converter
- **I11** disclaimer → notice-banner-with-icon (DEC-1) · converter
- **I12** section label rendered as pill (Fam A) · block/converter
- **I13** disclaimer max-width:620 + centring dropped (Fam D) · converter

### Gift
- **G1** label rendered as pill (Fam A) · block
- **G2** gift cards → info-box w/ hover/zoom/focus-ring (DEC-2) · converter
- **G3** "Find out more →" link → coral button (DEC-3) · converter
- **G4** cards grid breakpoint 599 vs draft 640 (Fam F) · converter
- **G5** single CTA wrapped in multi-button (DEC-5) · converter
- ✅ **GF-B.2 NOT present** — gift sub correctly emits `text-align:left` (matches draft). Closed.

### Social-proof
- **S6** static grid → carousel (DEC-4) · converter
- **S7** card nesting depth 5 vs 2 (consequence of S6) · block
- S8 stars: text glyphs → inline SVG; colour/size · LIVE-PROBE · block
- S9 author `<p>`→`<cite>`, font-size 13px · LIVE-PROBE · block
- (matches: section bg, padding, h2 centred, sub, Trustpilot bar, quote text)

### Hero
- **HE1** eyebrow label → coral pill (Fam A) · converter
- **HE4** h1 mobile 34px tier lost (Fam C) · converter
- **HE5** sub-paragraph `max-width:420px` dropped (Fam D = old H-C1) · converter/block · LIVE-PROBE
- **HE6** sub-paragraph `line-height:1.65unitless` malformed (Fam B) · converter
- **HE7** spurious mobile `min-height:360px` floor draft never set (Fam·F7) · converter
- **HE10** CTA gap extra 8px mobile tier (Fam F) · converter
- **HE11** doubled `display:grid` + competing grid-template from two class sources (Fam K + F) · converter
- HE8 mobile image height 340px · LIVE-PROBE · converter/block
- HE2 label colour knock-on of HE1 · converter
- HE3 h1 mobile line-height · LIVE-PROBE · block

## 🔬 LIVE-PROBE RESULTS (page 8 computed-style @1440 + @502, R-22-11, 2026-06-14)
**CONFIRMED real on live page:**
- Fam C: hero `h1` = 58px at vw=502 (draft wants 34px <768) — desktop 58px correct, mobile tier dropped ✓
- Fam D: hero-sub `max-width: none` (draft 420px) ✓ · trust-bar inner `max-width: none`, `display:flex` (draft 1100px) ✓
- Fam E: brand img `border-radius: 0`, `max-height: none` (draft 16px / 380-440px) ✓
- I8/IN-E: info-box `h4` + `p` = `text-align: left` (draft inherits centre) ✓
- I9: ingredients grid renders `grid-template-columns: 473px 473px` (2-col) at 1440 — draft wants 4-up ✓ (worse than static thought)
- I11/I13: disclaimer = `sgs/notice-banner` with `<svg>`, `max-width: none`, `text-align: start` (draft: no icon, 620px, centred) ✓

**CORRECTED to NON-DEFECT by live-probe:**
- Fam A label eyebrows — transparent bg, render per draft (DROPPED above)
- S9 testimonial author — `font-size: 13.16px`, `font-weight: 600` MATCHES draft 13px/600 → NOT a defect (removed)

**Still queued (not yet probed):** T3/T4/T6 (trust-bar icon shadow/svg/text size) · F10 (option-picker pill styling) · S8 (testimonial star colour/size) · HE3/HE8 (hero h1 mobile lh + img height) · HF-6 (logo height).

## 📊 Counts
~46 real defects. By fix layer: converter ~32 · block ~7 · theme ~6 · decision ~5. By family: F (grid) 5 · D (max-width) 4 · E (media) 4 · C (mobile-type) 3 · A (label-pill) 3 · B (unitless) 3 · K (dup-emit) 2 · DEC 5 · HF 7 · section-specific remainder.
