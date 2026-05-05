---
verdict: FAIL
date: 2026-05-05
test_url: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29
mockup_url: http://localhost:8767/mockups/homepage/index.html
viewports_tested: [375, 1440]
auditor: visual-qa pipeline (re-audit by request — challenge to "structural noise" classification)
---

# Hero visible-differences audit (2026-05-05)

## Headline

**Verdict: FAIL.** Bean's eyes were right. The "55 deltas dismissed as structural noise" report contained at least **5 genuinely visible differences** at 1440 and **2-3 more at 375**. The dismissed validator was correct about most of them; the noise-classification was the wrong call.

The most-impactful delta — **CTA buttons stack vertically on SGS but sit inline on the mockup at 1440** — is unambiguous and prominent. Bean would see it instantly.

## Side-by-side screenshots

### 1440px — Mockup (hero only)

`.playwright-mcp/audit-2026-05-05-mockup-1440-hero.png`
- Pink hero, edge-to-edge, 720px tall, h1 at x=64 / y=283, image fills right half exactly
- **Buttons inline**: `Shop Zookies` (x=64, w=151) + `Try 3 for £5` (x=227, w=136), gap 12px

### 1440px — SGS (hero only)

`.playwright-mcp/audit-2026-05-05-sgs-1440-hero.png`
- Pink hero with **visible top + bottom padding (36px each)**, 769px tall (49px taller)
- **"Hero Clone PoC" page title bleeds in above the hero** (rendered by WP page-title block, ~96px of pink Fraunces text on ivory background)
- **Buttons stacked vertically**: `Shop Zookies` at y=715, `Try 3 for £5` at y=771

### 375px — Mockup hero / SGS hero

`.playwright-mcp/audit-2026-05-05-mockup-375-hero.png` vs `.playwright-mcp/audit-2026-05-05-sgs-375.png`
- Visually very close. Same image source (`aesthetic-pic.jpeg` 576x1024 variant on SGS). Same content order. Buttons full-width on both. Acceptable parity.

## Visible differences found

### Delta 1: Buttons stack vertically on SGS at 1440 — should be inline
- **Severity:** MAJOR (most visible delta in the entire audit)
- **Where:** `.sgs-hero__ctas` at >=768px viewport
- **Mockup:** `.hero-ctas { display: flex; flex-direction: row; gap: 12px; }` — buttons sit side-by-side
- **SGS:** `.sgs-hero__ctas { display: flex; }` (no `flex-direction` declared, default `row`, but the buttons themselves are `display: inline-flex` AND the parent `.sgs-hero__content` is `flex-direction: column` so child `.sgs-hero__ctas` block ends up stacking children top-to-bottom because the buttons are wrapped in `.wp-block-sgs-button-wrapper` divs that are block-level)
- **Visual evidence:** btn0 at (x=72, y=715), btn1 at (x=72, y=771) — same x, different y = stacked. Mockup btn0 at (x=64, y=487), btn1 at (x=227, y=487) — same y, different x = inline.
- **Root cause:** the `.sgs-hero__ctas` rule needs `flex-direction: row` AND each button wrapper must be `display: contents` OR removed so flex flows them inline. Currently each button is wrapped in `.wp-block-sgs-button-wrapper { display: block }`, which blocks the parent flex from arranging them inline.
- **Fix:** in `wp_global_styles` post 7 (and `theme/sgs-theme/styles/mamas-munches.json`), add at desktop:
  ```css
  @media (min-width: 768px) {
    .sgs-hero__ctas { flex-direction: row; gap: 12px; align-items: center; flex-wrap: wrap; }
    .sgs-hero__ctas .sgs-button-wrapper, .sgs-hero__ctas .wp-block-sgs-multi-button { width: auto !important; }
  }
  ```
  Existing mobile rule (`width: 100%`) stays — only desktop needs row flex restored.

### Delta 2: WordPress page-title leak above the hero
- **Severity:** MAJOR
- **Where:** the `page_id=29` template renders an automatic page title `<h1>Hero Clone PoC</h1>` above the hero block
- **Mockup:** no title above hero — hero is the first thing on the page
- **SGS:** large pink Fraunces "Hero Clone PoC" title sits between the global header (ivory) and the hero (pink), visible at top of viewport
- **Visual evidence:** screenshot `.playwright-mcp/audit-2026-05-05-sgs-1440.png` shows "Hero Clone PoC" h1 prominently above the pink section
- **Root cause:** the test page uses a default WP block-theme template that includes a Post Title block. The hero block can't override what's outside it.
- **Fix:** either (a) edit the page template/template-part to remove the post-title block for this page, or (b) hide it via CSS scoped to this page slug (`.page-id-29 .wp-block-post-title { display: none }`), or (c) build the demo as a homepage/front-page using the `front-page.html` template that doesn't include a title.

### Delta 3: Hero has visible 36px padding top + bottom on SGS at 1440 (mockup has 0)
- **Severity:** MAJOR
- **Where:** `section.sgs-hero { padding: 36px 16px; min-height: 520px; }` vs mockup `section.hero { padding: 0; }`
- **Mockup:** image goes edge-to-edge of hero region, content vertically centred without dead pink
- **SGS:** ~36px of empty pink visible above and below the hero image and content panel
- **Visual evidence:** SGS hero is 769px tall vs mockup 720px (49px gap = ~36+36 padding minus min-height interaction). The pink padding strip is clearly visible bordering both the image and the content panel.
- **Root cause:** the hero block's render.php emits inline padding (default 36px 16px desktop) and a 520px min-height. The mockup expects zero padding so the image can edge-bleed.
- **Fix:** for this clone, override on `mamas-munches.json` styles.css:
  ```css
  .wp-block-sgs-hero, section.sgs-hero { padding: 0 !important; min-height: 0 !important; }
  ```
  Or set the block attributes `padding: 0` and `minHeight: 0` on this page instance via the block editor (correct path; the inline styles will override theme.json).

### Delta 4: Negative side margin pattern produces -8 / 1425 viewport overflow on SGS
- **Severity:** MAJOR (cosmetic at 1440, more visible at 375 where it crops)
- **Where:** `section.sgs-hero { margin: 0 -24px; }` — fakes a full-bleed by extending past the wrapper
- **Mockup:** `section.hero` has 0 margin and naturally spans 100vw
- **SGS:** at 1440 the hero rect is x=-8, w=1425 (vs viewport 1440). At 375 it's x=-8 w=375 — overflowing horizontally by ~8px. Visible as image cut on the right edge at 1440 (the photo is cut at 1425 not 1440).
- **Root cause:** the negative margin "full-bleed hack" works only if the parent has matching positive padding (24px). On the test page template the wrapper has 8px content-area padding from theme defaults, so the math is off by 16px on each side.
- **Fix:** restructure the hero to use `width: 100vw` + `margin-left: calc(50% - 50vw)` (a more reliable full-bleed pattern), or set the wrapper's `padding: 0` on this template and use simple `width: 100%` on the hero. The negative-margin approach is a known fragile pattern.

### Delta 5: SGS hero image is cropped portrait at 1440 (mockup uses square crop)
- **Severity:** MINOR (different crop, similar content)
- **Where:** the `<picture>` desktop source on SGS is `IMG_20260419_173547_107.webp` (1536x1536 square — matches mockup) but the displayed `<img>` is the same file. Image is fine on desktop.
- At 375 SGS uses `aesthetic-pic-576x1024.jpeg` (portrait) — matches mockup mobile choice. Image is fine on mobile.
- The SOURCE files match. The earlier impression of "different photos" was a different `aesthetic-pic` portrait variant being shown when the desktop tab loaded at narrower widths. Marking as **resolved** — images correct.

### Delta 6: `.sgs-hero__content` has display:flex while mockup `.hero-copy` has display:block
- **Severity:** MINOR (no visible effect — column flex with default alignment behaves like block stacking for these children)
- **Where:** content panel
- **Visual:** stacking is correct on both, only the centre-axis alignment marginally differs (a few px)
- Root cause: framework default. **Not a real defect** — keep as-is.

### Delta 7: hero-content `backgroundColor: rgb(245,194,200)` on mockup vs `rgba(0,0,0,0)` on SGS
- **Severity:** MINOR (no visible effect — parent section is also pink so transparent looks identical)
- Mockup happens to set the pink twice (on `section.hero` and on `.hero-copy`). SGS sets it once (on `section.sgs-hero`) and the content inherits visually. **Not a real defect.**

### Delta 8 (375 only): SGS content panel is 303px wide vs mockup 335px
- **Severity:** MAJOR-borderline (32px narrower content area)
- **Where:** `.sgs-hero__content { width: 303px }` at 375 (downstream of negative-margin + 16px padding eating 32px from the 375 viewport), mockup is 335px (uses full viewport minus 20px each side = 335)
- **Visual:** text wraps differently. Mockup headline wraps at "Made for the mum / who needs it most" (2 lines, 34px font). SGS headline at 303px also wraps at 2 lines but the right margin is wider — text feels more pinched.
- **Fix:** linked to Delta 3 / Delta 4 — once the padding + negative-margin are fixed, this collapses naturally.

## Re-evaluation of validator's 55 "structural false positives"

| Category from previous report | Count | Re-evaluation | New severity |
|---|---|---|---|
| `section.sgs-hero` carries grid + padding + min-height; mockup `section.hero` is wrapper | 22 | **NOT noise.** Padding 36px and min-height 520px are visibly forcing extra height + dead pink space. | Major |
| Width-cascade downstream of negative-margin full-bleed | 12 | **NOT noise.** The negative margin causes 16-32px content-area shrinkage at every viewport. Content is visibly narrower. | Major |
| `.sgs-hero__content backgroundColor pink vs transparent` | 2 | Confirmed noise (parent inherits pink) | Cosmetic / resolved |
| `.sgs-hero__content display:block vs flex` and child `inline-flex` button | 6 | **NOT noise.** Combined with parent `flex-direction: column` default, this causes the **buttons-stacked-vs-inline** delta — which is the most visible defect of all. | Major |
| `letterSpacing -0.5 vs -0.748` (px vs em resolution) | 2 | Cosmetic, sub-pixel | Cosmetic |
| `subheadline fontSize 16 vs 18 @ 375` | 2 | Resolved per follow-on session | Resolved |
| `subheadline lineHeight 26.4 vs 29.7 @ 375` | 2 | Downstream of resolved fontSize | Resolved |
| `.sgs-button width 150 vs 335 @ 375` | 2 | Resolved per follow-on session | Resolved |
| Buttons `width auto vs 150-180px` @ 1440 | 4 | Cosmetic — inline-flex auto sizing | Cosmetic |

**Recategorised totals:** 4 Major-class delta categories (~42 deltas) that the previous report dismissed as "structural" are actually **producing visible defects**. The validator was right; the human classifier was wrong.

## Recommended next actions

Fix in this order:

1. **Buttons inline at desktop.** Patch `mamas-munches.json` `styles.css` to add `@media (min-width:768px) { .sgs-hero__ctas { flex-direction: row; gap: 12px; } .sgs-hero__ctas .sgs-button-wrapper, .sgs-hero__ctas .wp-block-sgs-multi-button { width: auto !important; } }`. Sync to `wp_global_styles` post 7 via REST. This single fix kills the most visible delta.

2. **Hide WP page title on this template.** Add `.page-id-29 .wp-block-post-title { display: none }` to `mamas-munches.json` OR (cleaner) use the front-page template path and remove the post-title block from that template.

3. **Set hero padding 0 + min-height 0 for this clone.** Either via block attributes on the page instance (preferred — preserves framework defaults for other clients) or via `.page-id-29 section.sgs-hero { padding: 0 !important; min-height: 0 !important; }` override.

4. **Replace the negative-margin full-bleed with `width: 100vw; margin-left: calc(50% - 50vw)`** in the hero block render.php (framework-level fix — affects all clients but produces correct full-bleed).

5. **Re-run parity validator.** Expect deltas to drop from 55 to <10 once items 1-3 are applied.

---

## Self-review checklist

- [x] Side-by-side screenshots taken (mockup + SGS at 1440 + 375; 4 screenshots saved to `.playwright-mcp/`)
- [x] "Structural noise" classification challenged with fresh eyes — found 4 categories that were wrongly dismissed
- [x] Image content match verified — sources are correct on desktop + mobile (initial concern was a path-resolution bug in the http server root, not a real image mismatch)
- [x] Hierarchy / typography rhythm checked — Eyebrow/Headline/Sub/CTAs all match mockup at 1440 (the issue is button arrangement, not typography)
- [x] Multi-frame capture run — 0 first-paint defects (M1 still dead)
- [x] Parity validator re-run with corrected mockup URL — same 55 deltas, but re-classified
- [x] Hover/focus states — not checked this pass (out of scope; the structural deltas dominate)

## Files referenced

- `.playwright-mcp/audit-2026-05-05-mockup-1440-hero.png` — mockup hero at 1440 (element-only)
- `.playwright-mcp/audit-2026-05-05-sgs-1440-hero.png` — SGS hero at 1440 (element-only)
- `.playwright-mcp/audit-2026-05-05-mockup-1440.png` — mockup full page at 1440
- `.playwright-mcp/audit-2026-05-05-sgs-1440.png` — SGS full page at 1440
- `.playwright-mcp/audit-2026-05-05-mockup-375-hero.png` — mockup hero at 375
- `.playwright-mcp/audit-2026-05-05-mockup-375.png` — mockup full page at 375
- `.playwright-mcp/audit-2026-05-05-sgs-375.png` — SGS full page at 375
- `tools/multi-frame-qa/runs/audit-2026-05-05/` — multi-frame capture output (5 frames x 2 viewports)
- `reports/parity/hero-audit-2026-05-05-v2.md` — fresh parity validator output (55 deltas, fonts_loaded:true)
