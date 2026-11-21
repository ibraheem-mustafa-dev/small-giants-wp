# Prompt: site speed leftovers, in one session

Paste into a fresh session in `C:\Users\Bean\Projects\small-giants-wp` when you want to pursue these. Deferred by Bean on 2026-11-21: each is a small or framework-wide gain, none urgent. They are independent, so they run side by side and land in one release.

## Where things stand

The site speed track (LEDGER Front S) is closed and live on all four sites (sandybrown, mamas-test, indus-test, eye-care-test). Its record, with measurements and the reasons behind each item below, is `.claude/plans/archive/2026-11-19-css-delivery.md` (Open 1, Open 2's follow-up paragraph, Open 5, "Found along the way"). PageSpeed phones on 2026-11-21, median of 5: Mama's Home 94, Shop 91, product 92, basket 67; Indus Home 91, Wholesale 95, Brands 97, Contact 94; Eye Care Home 91, Shop 94, product 81, Contact 99.

## The work

Run A, C and D in parallel (separate worktrees under `E:\sgs-tmp`, each with its own `npm ci` and `composer install`; never junction `node_modules` or `vendor`). B starts with a design for Bean, because it changes a rule shared with motion.

**A. Fonts: as small as the text each site draws** (about 28 KB on Mama's pages; every client benefits).
- Each client's fonts are declared in `sites/<client>/theme-snapshot.json` under `settings.typography.fontFamilies[].fontFace` (`fontWeight`, `fontStyle`, `src` such as `file:./assets/fonts/caveat/caveat-variable-latin.woff2`); the files live in `theme/sgs-theme/assets/fonts/`. Google Fonts are self-hosted by `plugins/sgs-blocks/includes/class-google-fonts-installer.php` and `class-google-fonts-self-host.php`; snapshots are pushed with `plugins/sgs-blocks/scripts/push-theme-snapshot.py`.
- A1. Split every self-hosted font into an everyday file and a rest-of-the-characters file, declared as two `fontFace` entries with `unicodeRange`, so the browser fetches the second only when a page shows one of those characters (as Google Fonts does). Measured on Mama's (fontTools 4.60 is installed; ASCII plus `£€’‘“”–—…•·×✦`, all OpenType features kept): Caveat 74.9 to 62.3 KB, Karla 24.2 to 15.9 KB, Young Serif 26.9 to 19.3 KB. Nothing may look different and no character may fall back to another font. Fit it where fonts enter the framework, so new clients get it without a manual step.
- A2. A weights-used check per client: render the main pages (`E:/sgs-tmp/stagec/font-weights.mjs` tallies family, weight and style per text run) and compare with the snapshot's font faces. Flag a variable file where one weight is drawn (pin it with `fontTools.varLib.instancer`: Caveat at one weight is 51.0 KB), a weight drawn outside the declared range (synthesised or clamped), and a declared face nothing uses. Known on Mama's: Caveat is drawn at normal and bold (the cookie-box builder's pick summary on Home), so it stays variable; Young Serif is a single-weight font while some headings ask for 600 or 700, so the browser synthesises the bold (check it matches the draft; do not change the look).
- A3. Fold the two font-fallback insertions into one source (`theme/sgs-theme/inc/font-fallback.php`: `font_fallback_filter_stacks` reaches the editor, `font_fallback_preset_overrides` covers the front end); the editor and the front end must keep their fallback names.
- Done when: a Mama's page with no accented letters downloads only the everyday files (PageSpeed network requests show it), an accented letter typed in a basket gift message still draws in Caveat, the check runs for every client and reports, and the editor still shows the fallback fonts.

**B. Shop's gift promo loads too early** (about 12 KB on Mama's Shop; a rule shared with motion).
- On a template page (Shop, an archive) there is no saved page to measure, so `SGS_Media_Priority::above_fold` falls back to `Sgs_Motion_Fold::FOLD_SECTIONS` (the first two sections). Shop's second section holds the whole product grid and the gift promo after it, so the promo image loads eagerly though it sits 2,000 to 2,500 px down at 375, 768 and 1440 (`E:/sgs-tmp/stagec/fold-pos.mjs`).
- The fold rule is shared with motion (Spec 38A §9), so write the design (options, which pages each changes, the motion effects that would start differently) and get Bean's choice before building.

**C. `bundle` delivery grace period** (needed only before any page-cached site selects `bundle`; no site does today).
- Every `save_post` bumps the CSS epoch and `sgs_css_gc` deletes every older bundle file at once, so HTML cached longer than the bump can point at a deleted file. Keep the previous epoch's files for about 24 hours before deleting them; a test proves a file survives the bump and is gone after the grace period.

**D. Hard-coded font in the product card** (a Spec 32 fault).
- `plugins/sgs-blocks/src/blocks/product-card/style.css`: `.product-card--live .price--pct-off` and `.product-card--live .product-card__stock` set `font-family: 'Inter', sans-serif` directly, bypassing the site's font presets. Make them inherit the card's font (or read the site's preset). Check Mama's, Indus and Eye Care product cards before and after: the badge and stock line must take each site's own font.

**Then:** one release to all four sites (`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown,mamas-test,indus-test,eye-care-test --page-weight`, from PowerShell, in a clean worktree), Mama's journey check before and after (`node E:\sgs-tmp\cc-plan\probe\journey.mjs` from `scripts/computed-route`, 6 checks), snapshot pushes for the font files, then PageSpeed on the twelve pages above, one site at a time (`python E:\sgs-tmp\cc-plan\psi.py <label> <url>... --runs 5`).

## Boundaries

- No change to how any site looks.
- One render check on local-mamas for shared code, no time limit on it; run `scripts/render-scope/render-scope.py` first. No database backup before an additive script on a test site; the live shop keeps its backup (`bash scripts/local-wp/backup-remote-db.sh mamas-test <label>`).
- eye-care-test's snapshot belongs to Eye Care's own work stream (LEDGER Front F): ask Bean before pushing one there.
