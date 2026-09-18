# Visual diff — sgs/nav-bar-menu, sgs/nav-drawer-menu, sgs/responsive-logo, sgs/social-icons — 2026-09-18

verdict: PASS (live-verified via Playwright on sandybrown, post-deploy)
intent_capture_passed: true
source_sha: 83c593b0e

Covers 4 framework default-value/markup changes made during the Mama's Munches
header/footer QA session (post 2742, header post 3648, footer post 3649):

1. `sgs/nav-bar-menu` + `sgs/nav-drawer-menu`: unified `itemColourHover`
   default back to `'primary'` for both surfaces (reverting the same-day
   accent/primary split).
2. `sgs/nav-bar-menu`: `itemSeparatorWidth` default `"1px"` -> `""`.
3. `sgs/responsive-logo`: `width` no longer carries a block.json default (was
   `240`) — an untouched instance now fills 100% of its containing column.
4. `sgs/social-icons`: fixed the `pill` style ignoring `iconBackground`/
   `iconBackgroundHover`; added a `showLabels` toggle rendering the item's
   `label` as visible text beside the icon.

## Live verification (Playwright, sandybrown-nightingale-600381.hostingersite.com, page 2742)

- **Nav hover colour** — confirmed at the CSS SOURCE (deployed
  `uploads/sgs-css/sgs-3787-*.css`): `.sgs-nav-bar-menu-a42fc0ee
  .sgs-nav-bar-menu__link:hover{color:var(--wp--preset--color--primary,
  currentColor)}` — both bar and drawer instances resolve to `primary`.
- **Separator suppression** — `grep -c "sgs-nav-bar-menu__item:not(:first-child)"`
  against the deployed per-instance CSS returned `0` — the separator rule is
  not emitted at all for the untouched instance on post 3648 (previously
  rendered a visible 1px divider).
- **Responsive-logo fill-width** — the footer logo instance
  (`.sgs-rl-fbe6c87e.wp-block-sgs-responsive-logo`) emits NO `--logo-width`
  custom property at all (confirmed absent from the deployed CSS); screenshot
  at 1440/768/375 shows the logo now filling its "Brand" column width instead
  of a fixed 108px box. The unrelated header logo instance
  (`.sgs-rl-...`, explicit `width:183`) and the mobile drawer logo instance
  (`.sgs-rl-165fd49e`, explicit `width:140`) both still emit their explicit
  `--logo-width`, proving the operator-set path is untouched.
- **Social icons pill + labels** — deployed static stylesheet
  (`build/blocks/social-icons/style-index.css`) confirms
  `.sgs-social-icons--pill .sgs-social-icons__item{background:var(--sgs-social-bg,...)}`
  (previously hardcoded to `surface-alt`, ignoring the attribute). Screenshot
  at 1440/768/375 shows two rounded-pill buttons reading "Instagram" /
  "WhatsApp" with visible text beside the icon, matching the mockup's
  `.sgs-footer__social` requirement.
- **Screenshots** — `footer-1440-b.png`, `footer-768.png`, `footer-375.png`
  (repo root, this session) show the fill-width logo, pill-with-label social
  buttons, and the re-coloured Shop/Information headings + copyright strip
  rendering correctly at all three breakpoints.
- **Console** — 0 genuine JS errors (10 pre-existing 404s from a stale
  `localhost:8791` browser tab and `favicon.ico`, unrelated to this change).

## Not a defect (verified against the mockup, not assumed)

The footer's bottom-bar `border-top` does NOT span the full viewport width —
confirmed this is FAITHFUL to `sites/mamas-munches/mockups/homepage/index.html`
(`.sgs-footer__bottom{border-top:1px solid rgba(255,250,245,0.1)}` sits inside
`.sgs-footer__inner{max-width:1000px}`, i.e. the mockup's own divider is
content-band-scoped, not edge-to-edge). Fixed the CLONE's content band from
the `contentWidth:"normal"` token (~1200px) to a literal `1000px` on post 3649
to match the mockup's specific value precisely, rather than making the border
full-bleed (which would have been UNFAITHFUL to the draft).

## Content-layer colour fix (not a block/code change)

The Shop/Information headings and bottom-bar copyright text used
`rgba(255,250,245,0.55)` / `text-inverse` respectively. The mockup's own
equivalent (`rgba(255,250,245,0.4)`) computes to ~3.4:1 contrast against the
footer's `#3a2e26` background — below WCAG AA's 4.5:1 floor for normal text.
Replaced both with a solid `#c9b7a4` (warm muted tan, 6.75:1 contrast against
`#3a2e26`) — reads as an intentional muted label colour (matching the site's
warm palette) rather than a washed-out translucent white, and passes AA where
the mockup's own literal value would not have.
