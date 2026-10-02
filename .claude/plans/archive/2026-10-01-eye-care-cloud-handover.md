# Eye Care: cloud-session handover (2026-09-28 to 2026-10-01)

**For:** Bean, and the Claude Code session in VS Code that picks this up.
**Covers:** everything the cloud session `session_0159maT2pzryLXAEgNqT6jFh` opened, closed and changed while
working on the Eye Care Birmingham clone. A second cloud session (`session_015nP9vshSFMxfKXqmQy28YK`, nav and
drawer framework for Indus and lamalama) also committed to `main` in the same days; its commits are listed at
the end so nothing is a surprise.

- **Sites:**
  - Draft: `mintcream-lyrebird-224487.hostingersite.com`.
  - Live clone: `eye-care-test` (`darkcyan-grouse-898606.hostingersite.com`).
- **Governing plans** (still current):
  - `2026-09-24-eye-care-hand-build-design.md`;
  - `2026-09-28-eye-care-product-page-parity.md`;
  - `2026-09-25-eye-care-bag-checkout-prescription.md`.
- **This file replaces `archive/2026-09-28-eye-care-resume-tracker.md`.** Its open items are carried into the
  sections below.

## 1. Landing on the PC (done 2026-10-01)

Pulled, merged, reseeded and deployed to sandybrown and eye-care-test (every gate green, checksums verified). The
trees are applied through the editor with no invalid blocks: header 199, mobile menu 203, megas 165, 176, 183, 186,
home 208. All 40 brand logos are set; the Ferrari tile in `mega-brands.tree.json` uses attachment 625 (its SVG keeps
its `viewBox`). The header tree first failed on six cart paddings the framework DB wrongly marked as single-value;
the seeder now reads them as per-device (`orchestrator/object_attr_shape.py::_closure_dispatched_tier_attrs`).

The walk-and-check step (every surface, at 375, 768, 1440 and 1920, with the eye-check list) is steps 5 and 6 of
`.claude/plans/2026-10-01-eye-care-review-phase-plan.md`.

## 2. The two items finished in this last round

### Header white space under the trust bar, and the logo overlap when the header unshrinks

- **Overlap: found and fixed** (filmed live).
  - Cause: the logo-and-wordmark group could wrap. While the logo grew back from 30px to 40px on scroll-up, the
    wordmark wrapped under the logo for a few frames.
  - Fix: the group is now `flexWrap: nowrap` in `header.tree.json` (77a6558).
- **White space: fixed in the tree, to be confirmed after the deploy.**
  - Cause: the old `site-header` shrink padding (a spacing preset) stacked on top of the row's own padding.
  - Fix: the new tree removes it and pads the middle row itself to the draft's 20px 28px (79px row).
  - The scrolled state is now a real, reusable setting on header and footer rows (6fb3f04): padding when shrunk,
    speed and curve. The heading also gained "Size when the header shrinks".

### Bag drawer matches the draft's bag panel

Mapped from the draft markup (`Eye Care Birmingham.dc.html`, the `bagOpen` block) onto `sgs/cart` settings. All of
it is universal: every value is a block setting with an editor control, and nothing is Eye Care specific in code.

- **A real bug fixed on the way.**
  - The nav store moves the drawer `<dialog>` to `<body>` when it opens. Every panel rule was scoped through the
    block wrapper, so none matched once the drawer was open. Panel background, text colour, free-delivery colours
    and the image fit all stopped applying.
  - That is why ours showed white instead of the draft's cream.
  - The panel now carries the block's scope class itself, and every panel rule is scoped to it.
- **New layout.** Three bands:
  - a head row (heading on the left, close button on the right, divider under it);
  - a scrolling item list;
  - a footer (subtotal, then the free-delivery line and bar, then Checkout, then an optional note).
- **Item rows.** A square image; the brand with the line price on the right; the name; the details; and the
  actions.
  - Remove can be the × or a text link.
  - The quantity box and "Save for later" can each be switched off.
  - The brand comes from a new read-only Store API field: `includes/cart-item-brand.php` adds
    `items[].extensions.sgs.brand`.
- **New settings** (about 120 attributes, all with controls):
  - Settings tab, "Mini-cart contents": heading count "(N)", quantity box, Save for later, Remove style and label,
    View cart button, note under the subtotal, instalments note ("Or 3 payments of %s with Klarna") and its
    count, free-delivery position (above the items or under the subtotal), hide the free-delivery bar while
    empty.
  - Styles tab:
    - "Mini-cart text": typography for 14 parts of the panel.
    - "Mini-cart sizes and spacing": per-device widths and gaps, the padding of each band, corners.
    - "Mini-cart shadow and motion": shadow, slide-in time and curve.
  - Colour panel: 23 new colour rows, with a hover state on Checkout.
- **Eye Care values** set in `header.tree.json`'s cart:
  - Panel: 460px wide, cream panel, white footer.
  - Heading: "Bag (0)" in Playfair 22px, with the count in Outfit 13px.
  - Empty state: "Nothing in here yet." (Playfair 26px), centred above "SHOP SUNGLASSES".
  - Item rows: 96px images, brand 11px in capitals, and a Remove text link.
  - Footer:
    - free delivery at £75 ("Add £X more for free UK delivery"), with a 2px bar under the subtotal;
    - 54px Checkout in capitals;
    - the Klarna note;
    - the draft's shadow and its 400ms slide-in curve;
    - a 45% dark backdrop.
- **Checked here:**
  - PHP lint and webpack build.
  - An offline render of the drawer (compiled CSS plus the PHP output) beside the draft's screenshot. Width,
    colours, heading, empty state, rows and footer match.
- **Known small differences:**
  - The draft's "Add my prescription" link on a bag line is not built. It belongs to the lens flow, which already
    has its own route.
  - The Klarna amount divides the cart total (which includes shipping once it is known); the draft divides
    subtotal plus shipping. These are the same at checkout.

## 3. Everything else this session closed (all on `main`)

### Home page parity (rounds 1-4)

- **Starting point:** 3,003 open rows at the first walk; 586 at the last cloud walk.
- **Commits:**
  - 365ef91, 99a706d, 0e99e05, 5462801: hero spacing, headline measures, tile links, heading gaps.
  - 4bc0060, 067e930: brand strip in the draft's order with dividers, and the clinic placeholder.
  - 6bd7dd8, 97b08d8: the prescription-strip photo as `sgs/media` with hover zoom.
  - 56aca69, f6c698c: equal-height tiles, review arrows.
- **Accepts** with evidence: the moving marquee; the icon-star spacing; the equal-height tile title; the proven
  hero entrance.
- **Brand strip:** now shows logos in a row (2d3ea8b), using the draft's own logos. The 40 files are in
  `sites/eye-care-ward-end/assets/brand-logos/`, applied by `apply_brand_logos.py`. Brands with no products stay
  visible for the client preview (`brandHideEmpty: false`); the auto-hide setting remains for launch.

### Header, mega panels and phone drawer

- **Header** (77a6558): the draft's exact values.
  - Middle row: 20/28px padding, 1440px wide.
  - Nav links: 24px gap, the SOON badge styled.
  - Burger: 2 bars, 22px wide, 1.5px thick.
  - Logo: 48px shrinking to 40px; the wordmark 18px shrinking to 15px.
  - Phone link: its icon size and gap.
  - Bag pill: the round "0" bubble.
- **Mega panels:**
  - Sunglasses, Brands, Lenses and Help mapped against the draft (`qa/parity/mapping-*.md`).
  - Fixed: the "Â£" mojibake (a broken £ sign), the column widths, the Lenses boxes, and the Brands tiles as a
    card grid with logos.
- **Phone drawer:** the Instagram, Google, WhatsApp and phone buttons carry the draft's exact SVG logos
  (new button `iconSvg`).

### Framework features and fixes (universal, all with editor controls)

- **Motion and hover:**
  - Motion (3bddeda): entrance "Start when", block stagger, and the draft's reveal as the default.
  - Hover (ba74c6b): one shared image zoom with a zoom style; background zoom in the Background panel.
- **Media** (a2bfe41, 25d7a07, f3274de):
  - box shape "Fill space";
  - zoom always gets its frame;
  - enum vocabulary gate.
- **Small block settings:**
  - Container (3e048cd): Shape (width/height, aspect ratio); the site header sits flush below a bar.
  - Process steps (f06edec, f37ee92, ec8ba1b, 7391218): space between steps, number typography, number gap.
  - WhatsApp CTA (7391218, ec8ba1b): icon size, minimum height, icon gap.
  - Google reviews (56aca69): "cards per arrow click".
- **Card grid** (054d908, 3b2203c, 9489a03, 2d3ea8b):
  - fallback-tile label; title and subtitle font, spacing and capitals;
  - no empty image area on text-only cards;
  - image height, padding and scale-down; title gap.
- **Brand strip** (fc1835d, 6ca8bda, a0c645d, 4b254a9, 2d3ea8b):
  - text sizing, minimum width, dividers;
  - WooCommerce brand order (also fixed a fatal error);
  - logo row layout, logo maximum width, opacity.
- **Nav and mega:**
  - Mega panel (3b2203c): headings and group widths take their own settings.
  - Nav drawer menu (ce14075): mega body padding default can be overridden.
  - Nav bar and drawer menus (eb3d611, 2d3ea8b): link minimum height, the badge's text and box, burger bar
    thickness, and the gap between burger and label.
- **Cart, business info and button** (eb3d611):
  - Cart: pill count bubble, pill text, minimum height and hover colours.
  - Business info: icon size, icon gap, link minimum height.
  - Button: a custom SVG icon (`iconSvg`, sanitised).
- **Header rows** (6fb3f04): the scrolled header as settings (padding, speed, curve). The logo's shrink follows
  that speed; a heading has "Size when the header shrinks".
- **SVG uploads** (2d3ea8b, `includes/svg-upload.php`):
  - The media library accepts SVG for anyone who can upload, sanitised on the way in: no script, no event
    handlers, no outside links, no entities.
  - The width and height are read from the file.
- **Tooling:**
  - 8be3974: test browsers close on every exit.
  - 744f6e6: cloud sessions can drive the live sites through the proxy.
  - 2a168fd: project hooks use `$CLAUDE_PROJECT_DIR`.
  - 668793b: header pop-up parity config.

## 4. Still open (in order of priority)

1. **Walk and check every surface**: `.claude/plans/2026-10-01-eye-care-review-phase-plan.md` steps 5-6 (the
   deploy itself is done, section 1).
2. **Footer.** Not started in code; the helper agent died on the usage limit before it wrote anything.
   - Gaps found by screenshots (`footer-{draft,live}-{1440,375}.png` in the old scratchpad; re-take them with the
     walker):
     - Height: the draft is 425px against our 304px. The draft has about 104px top padding and 52px at the sides.
     - Column headings: small grey Outfit in letter-spaced capitals (ours use Playfair).
     - Links: about 31px apart.
     - Brand block: a gap between the wordmark and the tagline.
     - "About Eye Care" is not underlined.
     - The address sits on two lines, and the hours on one grey line.
     - Social boxes: 40px with a grey border and brand-coloured icons, ordered Instagram, Google, WhatsApp.
     - Bottom bar: a full-width hairline, with Privacy and Terms on the right.
   - `footer.tree.json` still uses `core/list`, which is banned; replace it with SGS blocks.
   - Draft markup: `dc.html` lines 1138-1170.
   - Find the `sgs_footer` post ID before applying.
3. **Remaining pages:** about, lenses, product, help, contact, checkout, confirmation. Each was built and walked
   once; none passes yet. Read each `out/<page>/report.md` first. The order-confirmation page needs a real test
   order.
4. **Known small accepted differences** to confirm with Bean:
   - The drawer's stagger brings the four "Shop" links in together. Splitting them would lose the nav landmark.
   - The review stars sit 2px apart.
5. **Carried from the 2026-09-28 tracker:**
   - Colourway photos (Gucci 76, Holbrook 81, Wayfarer 90, Round Metal 98) are not gathered. The brand shots on
     the test site must be replaced before launch.
   - The draft has no bag quantity control, checkout validation or order recap; live has them. Recommendation:
     keep live's.
   - Real photos are needed of the clinic (Home) and of Fatima (About).
   - Owed splits: `buybox/render.php` (about 1,480 lines) and `assets/js/animation-observer.js`.
   - Lens height (C2) and frame diagrams wait for the frame-measurements data.

## 5. Bean's decisions recorded during these sessions

- Home brand strip:
  - Use the draft's logos, not names (the names only existed because the logos were missing).
  - Show brands with no products for the client preview, and keep the auto-hide setting.
- Header:
  - 44px tap targets: conform to the draft where that does no harm. 44px is the house rule, not a WCAG 2.1 AA
    requirement, and it is now a setting (link and pill minimum height).
  - The phone number breakpoint stays as ours.
  - The scrolled header is built as a reusable framework setting (the precedent for other clients).
  - The burger has 2 bars, as the draft.
- SVGs are used as images across the theme, so the media library must accept them (done, sanitised).
- From 2026-09-28: size bands; colour swatches; exact entrance timing; mega panels keep all 40 brands and 12
  shapes; the EASIEST tag stays inside its card.

## 6. Checks and environment notes

- **On the PC** all 128 fast and 4 full-tier gates pass (2026-10-01). Landing it fixed what the cloud could not see:
  13 unplaced cart settings, 6 duplicate inspector labels, and gate blind spots for loop-fed typography prefixes and
  colour states that carry no colour.
- **ESLint** cannot start in the cloud (a plugin version clash). JS was checked with the Babel parser and a full
  webpack build instead.
- **Header walker:** runs overwrite one report. Copy `out/header/report.md` after each mode.

## 7. The other cloud session's commits (nav and drawer framework, `session_015nP9…`)

All on `main`, all framework, mainly for Indus and lamalama:

- 65dcf47: social icons circle style and sizes.
- 9dcd9e8, 3dd9a81, d9fe0e8: nav drawer menu ornament frames, item parity, mega body padding.
- bc9a692, 6da6c1a: mega panel drawer-form controls and colours.
- 510a0f9: shadow fallback and hover guards.
- e8c2425: manifest clusters and roles.
- 19bfdbf: nav, button, icon and mega controls the parity pass found missing.
- 114db53: button lift and aside gap.
- fcdd8a8, 75c375b: social-icons alignment, icon sizing.
- 9289450, 23e3aeb, a96cd8b, ecbc94a: nav QA tree settings and probes.

They are covered by the same reseed and deploy.
