# CSS delivery: no render-blocking stylesheets on any SGS site

Spec: Spec 32 FR-32-32 (shared stylesheets as order-preserving runs), FR-32-11 (page-specific CSS, now `head` by default); Spec 01 §Fonts (size-matched fallback on every font preset). Branch `feature/css-delivery`.

## Why

Google PageSpeed on phones (2026-11-19) scored Mama's Home 98 and Shop 86 to 90, and on both pages the largest item was render-blocking CSS: about 1.5 s. Each page linked 30 to 36 small stylesheets in the head (one per block type, plus theme, plugin and WooCommerce files) and a generated per-page file of per-instance CSS. Spec 32 FR-32-11's collector only ever gathered per-instance CSS; Spec 00 promised "no render-blocking resources" but nothing built it.

## Approach (research 2026-11-19, `~/.claude/memory/research/2026-11-19-css-delivery-architecture.md`)

- **Shared stylesheets print as order-preserving runs** (`plugins/sgs-blocks/includes/class-sgs-css-delivery.php::Css_Delivery`): after core's own inliner and before printing, each run of consecutive own-origin, media-all handles is folded into its first handle, file content then inline additions, so the cascade is unchanged. Modes on SGS → CSS Output (`sgs_css_shared_delivery`): `inline` (default), `bundle` (one cached file per run), `links` (WordPress's own tags).
- **Page-specific CSS goes in the page** (`sgs_css_output_mode` default `head`).
- **Nothing is deferred and no critical-CSS subset is extracted**: head CSS can delay paint, never flash. Ruled out: critical-CSS extraction (Beasties, LiteSpeed UCSS/CCSS, WP Rocket RUCSS break JS-added classes and WooCommerce), block-based fold splitting, media=print and preload swaps, Early Hints, compression dictionaries.
- **Size-matched font fallback on every preset** (`theme/sgs-theme/inc/font-fallback.php::font_fallback_preset_overrides`). The faster paint showed a font-swap shift on the canary Shop (CLS 0 to 0.109 in PageSpeed). Its cause was older than this work: the fallback reached only theme-origin entries with their own face files, never role presets (`body`) or families saved in a site's global styles. Proven before the fix by holding fonts back 1.5 s, with the overrides injected in Playwright: Mama's Home 0.162 to 0.024, canary Shop 0.110 to 0.000.

## Results

PageSpeed API, mobile, median of three (`E:/sgs-tmp/cc-plan/psi.py`):

| Page | Before | After | Render-blocking before → after |
|---|---|---|---|
| Canary Home | 92 | 98 | 1,300 ms → 0 ms |
| Canary Shop | 90 | 95 | 1,600 ms → 400 ms (all JavaScript, no CSS) |
| Mama's Home | 94 | after rollout | 1,550 ms → |
| Mama's Shop | 82 | after rollout | 1,750 ms → |

- **Mode choice, measured on the canary:** `inline` Home 98 / Shop 95 with 0 / 400 ms render-blocking; `bundle` Home 97 / Shop 94 with 250 / 1,000 ms. Within a point on score, but only `inline` meets the 300 ms render-blocking target, so `inline` is the default and `bundle` stays a per-site choice.
- **Page weight:** inline CSS is counted at its gzip size; canary Home CSS fell from 73.8 to 62.1 KB (one block compresses better than 30 files), Shop 84.4 KB; no own-origin blocking stylesheet link on any measured page.
- **No flash:** the first painted frame of Google's filmstrip is fully styled on canary Home and Shop.
- **Saved settings:** only the canary had `sgs_css_output_mode = file` saved (deleted 2026-11-19 so it renders like the client sites); Mama's, Eye Care and Indus use the defaults.

## Proof

- `wp eval-file plugins/sgs-blocks/tests/php/wp-eval-css-delivery.php` on local-mamas: 24 checks pass; 12 of 12 mutations of the class caught.
- `php theme/sgs-theme/tests/run-font-fallback-standalone.php`: 14 pass; 3 of 3 mutations caught; fast gate `font-fallback-standalone`.
- `node scripts/check-page-weight.mjs --selftest` 21/21; `check-first-paint.mjs --selftest` 11/11; `check-state-exhaustiveness.py --self-test` 23/23.
- `build-deploy.py --gate-only`: fast 232/232, full 17/17 at `ac260c889`.
- Render check (`scripts/render-check/render-check.py`) on the Mama's mirror (2026-11-19, first run): every state it reached rendered identically, Home included; the one confirmed difference was anti-aliasing on the product page's tilted label at 481 px; the other states timed out on a loaded machine. Bean stopped the full runs on all three mirrors as too slow for this change (2026-11-19) and chose a quick live check instead: before-and-after screenshots of three pages per site at 375, 768 and 1440 px compared by pixel against a two-load noise baseline (`E:/sgs-tmp/cc-plan/probe/shots.mjs`, `cmp.py`), and Mama's basket, checkout and account (`journey.mjs`: 6 of 6 before the deploy).

## Open

1. Rollout (Bean's go, 2026-11-19, all four sites with the quick live check): merge to `main`, `build-deploy.py --target sandybrown,indus-test,eye-care-clone-test,mamas-test --page-weight` from PowerShell, Mama's basket, checkout and account checked before and after, then PageSpeed on Mama's Home and Shop.
2. Shop image loading (Bean approved, conditional): if Mama's Shop is under 95 after rollout, images in a product or post loop load eagerly only for the first three items (core's `wp_omit_loading_attr_threshold` rule), proven on Shop's PageSpeed.
3. Footer JavaScript still counted as render-blocking on Shop (400 ms over 18 files: WordPress `wp-*` helpers, WooCommerce, SGS shop-filter scripts). A separate change: load SGS's own footer scripts with `strategy => defer` where their dependants allow.
4. Stage C, next plan: shrink per-instance CSS at source. Home's per-page CSS is 415 KB raw: 3,200 rules but 993 distinct bodies (one nav hover colour 217 times, the container content width about 240 times). Stop emitting values a block's stylesheet already applies, and share one rule across instances with identical settings; migration-method detector first.

## Found along the way

- **Render check port race:** `scripts/render-check/rc_site.py::free_ports` picks both copies' ports at the start, but the second copy claims its port only when it is made, so two runs starting within minutes take the same port and the second copy fails Apache's config test (`render-check: exit 3`). Hit twice on 2026-11-19 with another session's run.
- **Deploys from Git Bash fail the media guard:** Git's MSYS `ssh.exe` mangles the guard's 9.7 KB export command (`unexpected EOF while looking for matching ')'`); Windows OpenSSH runs it. Deploy from PowerShell.
- **Hard-coded font in a block stylesheet:** in `plugins/sgs-blocks/src/blocks/product-card/style.css`, `.product-card--live .price--pct-off` and `.product-card--live .product-card__stock` set `font-family: 'Inter', sans-serif` directly (a client value in block CSS, Spec 32), so they bypass the theme's font presets.
