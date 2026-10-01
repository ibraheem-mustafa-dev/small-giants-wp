# Live verification: Gate 3C item 4 copies, U-18 G6, G7, G10, G11 (Wave 3C, M-13, M-16, M-17, M-39), 2026-09-27

verdict: PASS
intent_capture_passed: true
scope: the four gaps built today and the copies they finish. Gate 3C item 4 as a whole stays OPEN: lamalama's
corner "GET IN TOUCH" card cannot be expressed (G8 stopped at NO GO, design report §8-§9).
limit: this report measures box positions and widths only (no type, hover, motion or element order), so it is
never a copy verdict. Bean's eye failed both copies on 2026-09-27; see
`.claude/plans/archive/2026-09-27-reference-capture-method-plan.md`. The corner card is accepted as DEC-18.
source_commits: adab2705a (G7 drawer stretch), 9697d30d4 (G6 burger bar-stack box), c598d260f (G10 + G11 mega
panel), 076279a31 (button focus colour), 88312509a (reseed), f9d84ec78, 83e8f4347, bba764035 (copy trees, probe)
source_sha: not computed; the SHA script hashes staged files only (same as the lottie and furniture reports).
design: `.claude/reports/2026-09-27-u18-g6-g8-design.md`
blocks: nav-bar-menu, nav-drawer, mega-panel, button (plus the copies' trees in `plugins/sgs-blocks/scripts/nav-qa/gate3c/`)

## Environment and method
- Site: sandybrown. Copies: page 4446 `/qa-copy-lamalama/` (header 4435, drawer 4428) and page 4465
  `/qa-copy-indus/` (header 4461, drawer 4456, mega posts 4426/4430/4433/4443/4440).
- Every measurement with the copy as the ACTIVE header, inside one trapped command that swaps
  `wp sgs header set-active` and always restores 3777 plus `qa-item-markup-fixture.php two-bar`.
- `u18-copy-probe.mjs`, headed with `--hide-scrollbars`, at 375 (iPhone 13 emulation), 768 and 1440; 2px
  tolerance against `lamalama.json` / `indus-foods.json`. Deploy verified by checksum (all 95 block.json match; live
  CSS grepped for the new rules). References recaptured the same night (lamalama.com live; the draft served locally).

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | lamalama pill, burger, tap area, drawer grows from the pill | PASS | 343/438 x 50 pill, 30x36 burger, 44x44 corners true, card 343/438 x 436 at the pill's top-left, at 375/768/1440 |
| 2 | G6 burger bars | PASS | three bars 16x2, gaps 3 and 3; open: one line (spread 0), travel 5 and 5, at every width |
| 3 | G7 drawer CTAs | PASS | "Schedule a call" and "Start a project" 156.5 at 375, 204 at 768 and 1440; "Our pitchdeck" 317 / 412 / 412, 13px inside the card |
| 4 | Corner card | FAIL (named, not built) | absent at 375 and 768 as the reference; at 1440 "not found": G8 stopped |
| 5 | Indus panels | PASS | About 410/620, Sectors 180/1080, Brands 180/1080, Trade 410/620, More 570/300; every top edge 91 (12px below a 79px header) |
| 6 | G10 aside beside the links | PASS | About and Trade aside x 729, w 300, top level with the panel (not stacked) |
| 7 | G11 nested headings | PASS | the 11 Indus row titles are sgs/heading again and render at their own 15px/600, not the 11px mono eyebrow |
| 8 | Focused link-button colour | PASS | "Read our story" computed rgb(197,106,122) while focused before 076279a31; white after (negative control is the before value) |
| 9 | Accessibility | PASS | axe 0 violations on: lamalama drawer open at 1440 and 375, Indus drawer open at 375, Indus About panel open at 1440 (5 contrast items axe could not decide; checked by hand, lowest pair 6:1) |
| 10 | Negative control for G6/G7 | PASS | the design report's live pre-change reading (bars 24 wide in an 18px stack, CTAs 136.5) misses every new cell by more than 2px |

Probe totals, final run: lamalama 75 of 76 (only row 4), Indus 23 of 23.

## Found and fixed during the live check
- The eye check found what box sizes had passed: lamalama's CTA face, full-bleed rows and a white separator (the
  current item's border colour defaulted to accent), and a pitchdeck button 26px too wide for its card (width 100%
  plus side margins; it now sits in a full-width wrapper that carries the margins); Indus's inset aside, a 50px image slot, a stretched chip and link
  (a flex-column aside stretches every child, so fit width cannot hold there), a header 3px short (border-box), a
  missing 12px panel offset and a 44px column gap. All fixed in the trees.
- `sgs/button` rendered as a link lost its colour to theme.json's `link:focus` whenever focus arrived without
  `:focus-visible` (a click, or a panel focusing its first link on open). Fixed in 076279a31, on every site.
- The canary's bot challenge answers a headless browser with a 403 "Just a moment" page. The copy probe now runs
  headed and fails loudly when a page never loads; `axe-run.mjs` gained a `--headed` opt-in.

## Recorded divergences and residue
- Corner "GET IN TOUCH" card: not expressible (G8, NO GO; design report §9 is the spec a future G8 needs).
  `families-master.json` M-08 moves back to partial for it.
- Indus phone drawer: the draft's fourth social is Google (a white G on #EA4335); neither `sgs/icon` (no Google glyph
  in the Lucide set) nor `sgs/social-icons` (Google only as the official four-colour mark) can draw it, so the slot
  shows Twitter. The draft's socials are letter glyphs; the copy uses the icon library's logos.
- lamalama drawer: the reference marks "What we do" and "Careers" with dot glyphs; the copy has a lucide
  grip-horizontal on the expander and nothing on "Careers" (no trailing icon for a plain item). Item text sits 20px
  nearer the card edge (the drawer menu has no item side-padding setting), and the hairline the reference draws under
  the pill's top row is absent.
- Indus, small and screenshot-only: nav items about 9px left of the draft, heavier chevrons, arrow spacing in
  "Explore ..." links, the Sectors cards inset 4px less, and the image slots without the draft's placeholder icon.
- Framework gap, not built: `widthType: fit` (and a label's `fullWidth: false`) does not hold inside a stretching
  flex column; `sgs/mega-aside` has no alignment control. Worked around by composition.
