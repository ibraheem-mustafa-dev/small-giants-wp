---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track), cloning pipeline
status: READY TO START (brief, not a design)
parent_plan: .claude/plans/2026-09-21-wave-3c-implementation-plan.md (Gate 3C item 4, U-18)
---

# Reference capture: know what we are copying before we build it

## Problem

Gate 3C item 4 asks for two header copies that are 100% visual copies of their references: lamalama's floating
pill (copy on sandybrown page 4446, `/qa-copy-lamalama/`) and Bean's Indus Foods mega-menu draft (copy on page 4465,
`/qa-copy-indus/`). On 2026-09-27 the copies were reported as passing (lamalama 75/76, Indus 23/23). Bean's review
the same day found them far off: wrong text sizes, every hover colour, the motion, mega-panel spacing, and the
drawer's element order.

## Proven cause

`plugins/sgs-blocks/scripts/nav-qa/u18-copy-probe.mjs` measures box positions and widths only. It reads no type
styles, no hover state, no transition or animation, and no element order, and it never parsed the Indus draft's
stylesheet. Its PASS proved the boxes, nothing else; the report `reports/visual-diff/u18-copy-parity-2026-09-27.md`
is geometry-only.

The repo already has a walker that reads what the probe missed: `scripts/parity/draft-live-walk.mjs` (computed
styles, hover end states, running motion right after each action, structure and order, click-driven states,
side-by-side shots that each need a review note; gap classes in `scripts/parity/GAP-CHECKLIST.md`; per-page
configs such as `sites/eye-care-ward-end/build/qa/parity/shop.mjs`). It was built for the Eye Care shop and has
never been pointed at a header.

## Bean's review, 2026-09-27 (the gaps to close or accept)

Local screenshots (gitignored): `reports/visual-diff/u18-bean-review-2026-09-27/` (reference left, copy right).

**lamalama** (same at 1440, 768 and 375 unless noted):
- L1 open: the "What we do" item's right-hand glyph is wrong.
- L2 open: "Careers" is missing its right-hand glyph.
- L3 open: the "This is Us" GIF/video in a circle frame, above the "This is Us" label at the bottom centre, is missing.
- L4 open: hover on items: a stylised block/bullet appears on the left; hover colours differ.
- L5 open: hover on the drawer buttons scrambles the text (like the framework's GSAP scramble).
- L6 open: item text fades in from below when the menu opens.
- L7 open: the drawer slides open quickly from the pill; ours fades with a small slide.
- L8 closed: the pill, burger and text are scaled down (the logo is right, so the top gap is too small), and the
  reference scales with the viewport width while ours is a fixed size.
- L9 closed: the pill's text should also open the menu (it blocks the click now).
- L10 375: the pill's middle text is hidden on the reference.
- Accepted: the "GET IN TOUCH" corner card (DEC-18; parked in `2026-09-27-g8-screen-corner-pin-plan.md`).

**Indus** (draft: `sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html`):
- I-1 desktop: text sizes, every hover colour, the chevron hover, and all motion are wrong.
- I-2 mega panels: padding, alignment, sizing, hover colours and hover motion are wrong. In the About panel the
  reference puts the heritage feature card first (dark ground, photo, "SINCE 1994" tag, "Read our story" link) and
  the numbered links below it on the header blue; ours puts the links on a cream ground and the card below them.
- I-3 drawer (768 and 375): the reference opens with the logo and a boxed close button, then a full-width
  "Become A Trade Customer" CTA with round email and phone buttons, then the menu with large items and yellow
  hairlines, then four round coloured socials centred at the bottom. Ours has no logo, a bare close, smaller items,
  the CTA and icons below the menu, and broken socials.

## Method (Bean, 2026-09-27): prove the walker against a hand-read diff, then extend it

The walker becomes the one tool for headers and footers, on this track and on the Eye Care track (whose page
configs already live in `sites/eye-care-ward-end/build/qa/parity/`). Steps:

1. **Hand-read baseline.** Read each reference directly (the Indus draft's markup and stylesheet rule by rule;
   lamalama's live DOM and computed styles in a headed browser) and write the diff by hand: full structure and
   element order, the contents of each element, its appearance and styling, and its behaviour (hover, open/close,
   motion) at 375, 768 and 1440. Bean's L1-L10 and I-1 to I-3 above are the floor this diff must reach.
2. **Walker run.** Write a config per copy and run `draft-live-walk.mjs` against the same pages.
3. **Compare the two diffs.** For every row: did the walker find it, miss it, or find more? A miss is a walker gap.
4. **Extend the walker** for every miss, most likely as a header/footer mode (drive burger, panel and drawer
   states; hover every item; read entrance and open/close motion; check viewport-scaled sizing across widths;
   read element order inside the drawer and panels). A miss is treated as an exception only when it is genuinely
   anomalous (for example a canvas or video effect no DOM read can see), and each exception is named in
   `scripts/parity/GAP-CHECKLIST.md` with how it is checked instead. Each extension gets a negative control
   (`--inject-live-css`) that turns it red.
5. **Re-run** until the walker reaches the hand-read diff or better on both copies. Its report is then the one
   clear diff per copy: structure, contents, styling and behaviour of every element.
**Steps 1 to 5 done (2026-09-28):** hand-read diff and step 2-5 comparison `reports/visual-diff/u18-hand-read-diff-2026-09-27.md`;
walker header mode (`scripts/parity/GAP-CHECKLIST.md` section 11); walker reports
`reports/visual-diff/u18-walker-{indus,lamalama}-2026-09-28.md`. Decided (Bean, 2026-09-28): the Indus reference is the
draft's source intent: panel entrance 340ms from `translateY(-8px) scale(.99)`, links rising 460ms 26ms apart (max 320ms),
drawer items sliding in 420ms 55ms apart. It is not compared against the draft (which never plays it); the copy's motion
is proved by its own timeline read against those declared values.

6. **Then fix**, from that diff only: sort each row into composition or framework capability, and plan the fixes.
   No fixing happens before step 5 closes.

## Step 6 sort (2026-09-28)

Each row of the hand-read diff is **C** (composition: a setting or tree change in
`plugins/sgs-blocks/scripts/nav-qa/gate3c/*.tree.json`, rebuilt through `scripts/wp-build-page.js`), **G-n** (a missing
framework capability, named below), **D** (a framework defect to diagnose before fixing) or **=** (matches, or accepted).
Capabilities were checked against the framework DB (`block_attributes`, `source='sgs'`) and the block sources first;
several the brief expected to be gaps already exist and are marked C with the attribute that does it.

Many "hover colour" rows are the canary's Mama's Munches snapshot leaking into a setting the copy left unset (pink
`#e68a95`/`#c56a7a`, brown `#41322b`, warm shadows, the 1.6px pink button border). Those are C: set the value explicitly.

### Framework gaps

| Gap | What is missing | Rows | Where it would live |
|---|---|---|---|
| G-1 | Viewport-fluid scale: a header (and its drawer) that grows with the viewport past a width (lamalama: rem on a root of 1.111vw above 1440, so 438x50 becomes 584x67 at 1920) | L-C2 (L8) | `sgs/site-header` (+ drawer inherits) |
| G-2 | Plain text in the trigger row passes the tap to the whole-row trigger (`triggerSurface` keeps every block's own clicks, so the pill's message blocks it) | L-C6 (L9) | `sgs/nav-bar-menu::triggerSurface` |
| G-3 | Drawer grows from its anchor box (height from the pill's height to full, top fixed). `entryAnimation: wipe-down` with `entryFade` off is the closest existing shape (a clip wipe, box constant); qc-council decides between it and a true height grow | L-O1 (L7) | `sgs/nav-drawer::entryAnimation` |
| G-4 | Drawer item entrance: a horizontal axis (from the right, I-M3) and a clip reveal (`inset(0 0 100%)` to `inset(0)`, L-O2). `itemStagger`/`itemStaggerDistance`/`itemStaggerDuration`/`itemStaggerMax` exist but are vertical-only with no clip | I-M3, L-O2 (L6) | `sgs/nav-drawer` stagger |
| G-5 | Panel stagger depth: `submenuItemStagger*` animates direct children of `.sgs-mega-panel__content` (the columns); the draft staggers every link row and card | I-M2 | `sgs/nav-bar-menu` stagger selector |
| G-6 | Hover-only leading marker drawn path by path, with the text indented to the marker's space. `itemOrnament` shows at rest; `itemOrnamentIconHover` only crossfades | L-O10 marker, L-O6 (L4) | `sgs/nav-drawer-menu::itemOrnament` |
| G-7 | Per-item trailing glyph on any drawer row (Careers has one, no submenu), and a custom SVG glyph (lamalama's five-dot cross is not in Lucide) | L-O8, L-O9 (L1, L2) | `sgs/nav-drawer-menu` + icon picker |
| G-8 | Floating media button while the drawer is open: a 40px round autoplay video above "THIS IS US", fixed at the viewport's bottom centre (inside the drawer, `backdrop-filter` makes `position:fixed` resolve to the drawer, so composition cannot place it) | L-O13 (L3) | `sgs/nav-drawer` slot |
| G-9 | A container that is one link (row or card), so it can take hover slide, lift and fade | I-P5, I-P7, I-P13, I-P15 | `sgs/container` link |
| G-10 | Hover fade (opacity) on button, icon, logo and linked container: the draft's global `a:hover{opacity:.75}` | I-B2, I-B13, I-P12, I-P19, I-D13 | shared hover extension |
| G-11 | Drawer: the open row's label colour (yellow while its section is open) | I-D10 | `sgs/nav-drawer-menu` |
| G-12 | Drawer close button border (1.5px at 60% white) | I-D3 | `sgs/nav-drawer::close*` |
| G-13 | Bar hover styling only on items that open a panel (Home and Blog take none) | I-B9 | `sgs/nav-bar-menu` |
| G-14 | Button hover scales the inner face only (0.98), not the border | L-O11 (part) | `sgs/button::scaleHover` |

### Composition (existing attribute named)

| Rows | Fix |
|---|---|
| I-M1 | `submenuAnimation: fade-lift` (exactly `translate 0 -8px` + `scale .99`), `submenuAnimationDuration: 340`, `submenuAnimationEasingCustom: cubic-bezier(.16,.84,.32,1)` |
| I-M2 timings | `submenuItemStagger: 26`, `…Distance: 14`, `…Duration: 460`, `…Max: 320` (needs G-5 to hit rows) |
| I-M3 timings | `itemStagger: 55`, `itemStaggerDuration: 420`, distance 24 (needs G-4 for the axis) |
| I-M4, I-B15 | `scrimFadeDuration` / bar scrim values (#141923 25%, 2px, 300ms ease); re-read after the walker pair |
| I-B1 | logo as the draft's diamond + "Indus Foods" text (an SVG logo file, or `sgs/icon` + text in a row); decided in the plan |
| I-B3, I-B4, I-B5, I-B6, I-B7, I-B8, I-B10, I-B11 | `itemPadding` 12px 15px, `gap` 2px, `itemLineHeight` normal, `itemLetterSpacing` -0.15px, caret size/opacity, `itemMotionDuration` 220, `itemMagnetStrength` 0.14; caret already turns only while open (`nav-menu-submenu-css.php`, `aria-expanded`), so I-B7 is the timing; I-B11 re-read by the walker after the rebuild (D if it stays) |
| I-B12, I-B13 | button `fontFamily` PJS, `shadowLiftOnHover`, `boxShadowHover`, `transitionDuration`; opacity needs G-10 |
| I-P1 to I-P4, I-P6, I-P8 to I-P12, I-P14, I-P16 to I-P19 | mega trees: `shadow`, `panelPadding`, heading/text sizes and gaps, `sgs/mega-aside::asideBg` (#075E80/#0A7EA8; the 60% white is the unset aside), `asideBorderWidth` 0 / 3px, image frame border and radius, eyebrow font (Geist Mono upload), brand tiles 174x64 with image slots |
| I-D1, I-D2, I-D4, I-D5, I-D6, I-D7, I-D8, I-D12, I-D13 colours | drawer tree: reorder (logo row, CTA row, menu, socials), `sgs/responsive-logo` in the drawer, CTA `widthType: full` + arrow `icon`, 46px icon circles (`backgroundPadding`), items PJS 20px/700 -0.2px with 17px 4px rows, hairline #D8CA50, `itemExpanderRotate: 45`, four socials (Google replaces X) at 38px centred, explicit hover colours |
| I-D9 | clear the URL on menu 132's panel items so the drawer row is the toggle (the desktop trigger is a button either way); D if the drawer still renders a link |
| I-D11 | the mega panel's drawer tier (`$sgs_mm_in_drawer` rules) with its own sizes and grounds; a gap only if a setting the draft needs has no drawer tier |
| L-C3, L-C4 | logo at y16 and burger at y20 in a 50px pill whose row centres: **D** until the cause is read |
| L-C5 | `sgs/notice-banner::messageMode: rotate` with the three messages, Sometype 10px/500, -0.2px |
| L-C7 | `sgsHideOnMobile` on the notice banner |
| L-O4 | drawer `scrimOpacity`/`scrimBlur`, `surfaceOpacity` |
| L-O5, L-O6 | `itemFontFamily` (the Suisse face uploaded as Sometype was), `itemLineHeight` 22.4px, `itemTextIndent` 32px (or G-6's marker space) |
| L-O10 ground and rule | `itemBgHover` 10% white, `itemBorderColourHover` transparent, `itemMotionDuration` 120 |
| L-O11 | button `colourBackgroundHover`/`colourTextHover` per button; scramble by `fx: scramble` on hover (FX attributes exist on `sgs/button`); proved in the drawer, G-14 for the inner scale |

### Defects to diagnose

- **D-1** L-C3/L-C4: logo and burger sit 7px and 3px high in the pill.
- **D-2** I-P20: Brands grows 1.41x at 30ms when switching from another panel.

### Matches and accepts

I-B14 (within tolerance), I-D14, L-C1, L-O3, L-O7, L-O12 match; L-O14 accepted (DEC-18).

## Questions the method must settle

1. **What is the reference, as data?** Indus: the draft file and its stylesheet, parsed rule by rule into every
   element's styles, hover and motion. lamalama: the live site, captured as computed styles, hover end states and
   running motion per element.
2. **Can `draft-live-walk.mjs` drive a header** (hover each item, open each panel, open the drawer, read the
   transitions) at 375, 768 and 1440 against a reference on another origin? What does it lack: viewport-scaled
   (`vw`/`clamp`) sizing checked across widths, text scramble, staggered entrances, media in the drawer?
3. **An element inventory before composing:** every element in the reference, in order, with its styles, hover and
   motion. Each row ends as reproduced, accepted with a reason Bean signed, or a named framework gap.
4. **Which gaps are framework capabilities** (a viewport-fluid pill scale, a label that opens the drawer, a
   per-item hover marker, scramble on drawer buttons, a slide-open drawer, a staggered item fade, a media circle in
   the drawer) and which are composition only.
5. **Does the method generalise** to the cloning pipeline (`/sgs-clone`), so every future copy is captured this way?

## Exit

The walker (with its header/footer mode) matches or beats the hand-read diff, then exits 0 on both copies at 375, 768 and 1440 after the fixes, or every open row is an accepted difference Bean signed;
Bean's eye passes both (R-31-13). Then Gate 3C item 4 is re-assessed in the parent plan §7, the track doc and LEDGER.
