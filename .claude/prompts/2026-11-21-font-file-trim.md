# Prompt: make every site's font files as small as the text it draws

Paste into a fresh session in `C:\Users\Bean\Projects\small-giants-wp` when you want to pursue this. Deferred by Bean on 2026-11-21 as a small, framework-wide gain (about one PageSpeed point on Mama's Shop), not urgent.

## Goal and why

Fonts are among the files Google PageSpeed counts before a page's first image appears (Mama's Shop, 2026-11-21: three fonts, 126 KB, of about 700 KB counted). Make the framework serve each site the smallest font files that still draw every character and weight the site uses, automatically for every client, so no one has to think about it per site.

## Where things stand

- Each client's fonts are declared in `sites/<client>/theme-snapshot.json` under `settings.typography.fontFamilies[].fontFace` (`fontWeight`, `fontStyle`, `src` such as `file:./assets/fonts/caveat/caveat-variable-latin.woff2`); the files live in `theme/sgs-theme/assets/fonts/`. Google Fonts are downloaded and self-hosted by `plugins/sgs-blocks/includes/class-google-fonts-installer.php` and `class-google-fonts-self-host.php`; size-matched fallback faces come from `theme/sgs-theme/inc/font-fallback.php`. Snapshots are pushed with `plugins/sgs-blocks/scripts/push-theme-snapshot.py`.
- Measured on Mama's fonts (fontTools 4.60 is installed; `fontTools.subset`, `fontTools.varLib.instancer`):
  - Everyday-character split (ASCII plus `£€’‘“”–—…•·×✦`, all OpenType features kept): Caveat 74.9 to 62.3 KB, Karla 24.2 to 15.9 KB, Young Serif 26.9 to 19.3 KB, about 28 KB less in total on a page with no accented letters.
  - Weights: a variable font cannot have weights cut out (it stores the extreme shapes and blends between them); Caveat limited to 500 to 700 stays 75.1 KB. Only a site that draws a font at exactly one weight gains, by pinning the file to that weight (Caveat at 500: 51.0 KB). Mama's draws Caveat at normal and bold (the cookie-box builder's pick summary on Home is bold), so Caveat stays variable there. Separate weight or italic files cost nothing when unused: a browser downloads only the faces the page's text needs.
  - Mama's Young Serif is a single-weight font declared `fontWeight: 400`, while some headings ask for 600 or 700, so the browser synthesises the bold; check whether that matches the draft before changing anything.
- Record of the investigation: `.claude/plans/2026-11-19-css-delivery.md`, Open 2 (the Caveat paragraph and the framework follow-up).

## The work

1. **Everyday-character split for every font.** Split each self-hosted font into an everyday file and a rest-of-the-characters file, declared as two `fontFace` entries with `unicodeRange` (theme.json supports it), so the browser fetches the second only when a page shows one of those characters (the way Google Fonts serves fonts). Nothing must look different and no character may fall back to another font. Fit it where fonts enter the framework (the self-host step and the snapshot), so new clients get it without a manual step.
2. **Weights-used check per client.** A check that renders a client's main pages (Playwright; `E:/sgs-tmp/stagec/font-weights.mjs` is a working probe that tallies family, weight and style per text run) and compares the weights drawn with the snapshot's font faces: it flags a variable file where one weight is drawn (pin it), a weight drawn outside the declared range (synthesised or clamped), and a declared face nothing uses.

Done when: on Mama's, the everyday files are what a page without accented letters downloads (PageSpeed network requests show them), an accented letter typed in a gift message still draws in Caveat, the six `stage_c.py` survey pages render the same, and the check runs for every client and reports its findings. Then release to all four sites with Mama's journey check before and after (`node E:\sgs-tmp\cc-plan\probe\journey.mjs` from `scripts/computed-route`), and measure Mama's Shop with `python E:\sgs-tmp\cc-plan\psi.py <label> https://mamasmunches.com/shop/ --runs 5` (Shop was 92 on 2026-11-21).

## Boundaries

- No change to how any site looks: same glyphs, same OpenType features (Caveat's handwriting alternates included), same weights.
- One render check on local-mamas is enough for shared code (Bean, 2026-11-21); no database backups needed for test sites.
- Font-file changes reach a site through its snapshot push and the theme deploy; eye-care-test's snapshot is Front F's, so ask Bean before pushing one there.
