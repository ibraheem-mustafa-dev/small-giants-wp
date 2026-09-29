# Eye Care: where the 2026-09-28 autopilot session stopped

**Written for:** Bean and the next session that picks this up. Source: the full session log of the 2026-09-28
`/autopilot` run (three tasks: shop and lens tail, page waves, Phase 6), checked against `main` at 8ab1f0a5e.
The governing plans are still `2026-09-24-eye-care-hand-build-design.md` (Status block) and
`2026-09-28-eye-care-product-page-parity.md`; this file only says what state the session left them in.

## Why it stopped

The weekly usage limit ran out at the very end ("resets Sep 30, 11pm Europe/London"). The last thing to finish was
the re-walk of every page after the deploy. Its results were never read. The motion-batch builder died on its first
call, so nothing of it was built.

## At a glance

| Task | Progress | State |
|---|---|---|
| 1. Shop and lens tail | **100%** | Done, pushed, both walks exit 0 |
| 2. Page waves (9 pages) | **about 50%** | Everything built and deployed once; no page passes yet |
| Motion batch (framework) | **100%** | Built 2026-09-29, reseeded (0c92c79), deployed and applied by Bean; the shop walk passes with it (0 open) |
| 3. Phase 6 launch readiness | **0%** | Waits until every page passes |

## Task 1: shop and lens tail (DONE)

- Shop: 0 open of 1,376 rows, exit 0. Lens: 0 open of 678 rows, exit 0. Benchmark still 5 of 5 with 0 noise rows.
- £268 lens purchase lands one bag line on all three routes ("Options: Distance · Thin · 1.6 · Polarised"); 0 draft
  products.
- Commits (pushed): ca0079b8f (shop and lens fixes), cf827970e (walker repeat-word repair in
  `scripts/parity/lib/auto-compare.mjs::repairRepeats`, accepts, site icon), e1b3f25fe (EASIEST accept, docs).
- Bean's decision used: the EASIEST tag stays inside its card (same as the Polarised tag, 2026-09-27).

## Task 2: page waves

### Deployed to eye-care-test (all pushed to `main`)

| Commit | What |
|---|---|
| 665364658 | Product-page settings F1-F12, exact entrance timing, "fit" buttons fit |
| 6677df777 | Framework DB reseed for the above |
| 545c88e4c | Build-gate fixes (tabs padding box, Add to bag manifest element, AnimationControl import, buybox weight) |
| (form commit) | Contact's form "side by side from" setting (`fieldColumnsFrom`, default 560) + reseed |
| 620e534bf | Last two gates (`--sgs-tab-padding` default, form editor class) — **this is what eye-care-test runs** |
| (final commit) | Applied trees, walker configs and the product-page plan |

After the deploy: all 11 trees applied through the editor (no invalid blocks), facet seed run ("Lenses as
supplied"), 0 draft products, £268 purchase passes on all three routes.

### Per page

| Page | Config | First walk (open rows) | Fixes made | Re-walk after deploy | Progress |
|---|---|---|---|---|---|
| Product (76) | `product.mjs` | 4,152 | F1-F12 built, deployed and set in the tree; Details 18 rows, breadcrumb gap, plain-list description; empty related sections hide | Ran, **not reviewed** | 70% |
| About | `about.mjs` | 512 | h1 48/34px, hairline grid, WhatsApp colours, "Shop the range" → /shop/, exact entrances | Ran, not reviewed | 60% |
| Lenses | `lenses.mjs` | 596 | Process-step fonts, heading line height, 62ch intro, "Choose a frame" → /shop/, exact entrances; config reaches the draft via footer link below 1440 | Ran, not reviewed | 60% |
| Help | `help.mjs` | 1,526 | Crash at 768 fixed; answers text-soft, "Questions" line height, phone line colour | Ran, not reviewed | 55% |
| Contact | `contact.mjs` | 1,763 | Form side-by-side setting; focus ring accepted (deliberate a11y design, D459) | Ran, not reviewed | 55% |
| Home | `home.mjs` | 3,003 → 1,774 → 1,112 (2026-09-29, after round 1) | Round 1 (365ef91, applied) and round 2 (99a706d, not yet applied): eyebrow colours, hero type sizes, why-buy line height, see-all links, brand strip, tile hover and gaps, step-number font, buttons on the presets at 52px, trust-bar exclusion, grid and photo finders, marquee / underline / line-box accepts | Round 2 to apply and walk | 75% |
| Bag drawer | `bag.mjs` | never walked | none yet | First walk ran, not reviewed | 20% |
| Checkout | `checkout.mjs` | never walked | none yet | First walk ran, not reviewed | 20% |
| Order confirmation | `confirmation.mjs` | never walked | needs a real test order first | not run | 10% |

The re-walk results live only on Bean's PC in `sites/eye-care-ward-end/build/qa/parity/out/<page>/` (gitignored).
The queue's "exit code 0" was the queue runner's, not the walks'.

### Site-wide fixes made on the way (live)

- One size-guide pop-up in the footer (anchor `size-guide`); every "Size guide" link opens it. Before, the footer
  went to /help/ and the others pointed at an anchor that existed nowhere.
- Every `/sunglasses...` shop link (both mega panels, footer, About) returned 404; all now use `/shop/` with
  WooCommerce's filter parameters and the real brand slugs.
- `sgs/button` "fit" width now really fits (`width: fit-content`).
- `sgs/modal` trigger hover colours now reach the page; size-guide pop-up has width, border, shadow and "×" settings.
- `sgs/breadcrumbs` "Space around the separator"; `sgs/tabs` typography, padding, min height, indicator thickness.

### Bean's decisions made this session (2026-09-28)

1. Size row: show only the frame's own universal band(s) (S up to 52mm, M up to 57mm, L above); one-size frames show
   their one tile; "Which size am I?" beside the Size label.
2. Colour swatches: each variation's own photo, colour tile as fallback.
3. Colourway example photos: the brand's own shots, **test site only** — must be replaced before launch (Phase 6 gate).
4. Entrance animations: exact, as real controls.
5. Mega panels keep all 40 brands and 12 shapes (26 brands and 3 shapes open an empty shop).
6. EASIEST tag stays inside its card.

## Motion batch (BUILT 2026-09-29, not yet deployed)

Built in a cloud session as universal Animation-panel settings with editor controls; details and browser proof in
`2026-09-28-eye-care-product-page-parity.md` §Motion batch. The draft's reveal trigger (1% past 6% up the screen)
is now the framework default, with a "Start when" control; a block's own delay is kept; "Stagger the blocks
inside" (any block with inner blocks) and a block's own stagger (repeated lists) replace hand-typed delays;
card-grid tiles use the same settings. Eye Care's shop card and Home trees updated (not yet applied).

Checks run here: PHP syntax, webpack compile, 116 of 127 fast gates pass; of the 11 failures, 8 need the framework
DB or Python packages (bs4, tinycss2) only on Bean's PC, `check-hardcoded-render-defaults` fails on untouched
`main` too, and `shadow-lift-check` is an artefact of compiling without the prebuild generators. ESLint could not
start here (a TypeScript plugin version clash), so it runs in the PC build.

## Loose ends

- **Colourway photos (C5):** not gathered yet (Gucci 76, Holbrook 81, Wayfarer 90 or Round Metal 98).
- **Questions for Bean from the purchase-flow agent:** the draft has no bag quantity control, no checkout field
  validation and no order recap on the confirmation page. Live has them. Recommendation: accept live (the draft is
  a mock-up).
- **Home:** "Photo of the clinic" placeholder text on both sides — needs a real photo from the client.
- **About:** no photo of Fatima on either side — same imagery point.
- **Docs out of date:** the product-page plan still says "not yet deployed" (it is live at 620e534bf); the parent
  plan's Status progress line doesn't list the page waves; `LEDGER.md` still says eye-care-test runs fdb844df8.
  `/handoff` never ran.
- **Another session** was making the walker's header-mode checks the default; that may reopen shop and lens.

## Framework gaps found on Home (2026-09-29, proposed, not built)

- `sgs/whatsapp-cta` has no control for the icon-to-label gap (draft 11px, live 4px) or a hover lift (draft lifts 3px;
  live grows 2% and fades to 0.9).
- `sgs/process-steps` has no number font size or weight control (draft 15.5px / 500; live 21-24px / 700 from the block's own style).
- `sgs/card-grid` tiles: the resting 1px border (`cardBorderWidth`) does not paint on the tile the walker measures, and the hover shadow is the theme's floating shadow, not the draft's 0 18px 44px at 10%.
- Versace (103) and Polaroid (107) show a broken image on Home's cards where the draft shows "Photo to come": their product image points at a missing file (data, check with WP-CLI).
- The hero entrance rows: confirm by eye that the hero text rises on load before accepting them as a walker blind spot.
- `sgs/google-reviews` arrows have no padding control (draft 1px 6px).
- To verify on the next walk: the hero entrance rows (the walker may not see script animations once they finish),
  best-sellers grid 34px lower under its heading (the live pair may match a wrapper, not the grid), shape-tile border.

## Parked (recorded, not for now)

- `buybox/render.php` is about 1,480 lines (limit 300): split owed.
- `assets/js/animation-observer.js` was already over twice its 250-line limit: split owed.
- Sizing tab lens height (C2) and frame diagrams: no data yet (frame-measurements build).

## Next, in order

Times include a 50% pad.

1. **Read the eight re-walk reports** (`out/<page>/report.md` and contact sheets) and note each page's open count.
   45-70 min. Done when every page has a number and a short list of causes.
2. **Motion batch deploy** (code built 2026-09-29): reseed, full build, deploy, apply the shop and Home trees,
   rerun the shop and Home walks. 45-70 min. Done when the shop walk exits 0 again and Home's reveals match.
3. **Fix-and-walk loop per page** (one browser run at a time): product, about, lenses, help, contact, home, bag,
   checkout. About 30 min a page, so 4-6 h in total. Done when each walker exits 0 with every shot reviewed.
4. **Test order and confirmation walk**: place a test order on eye-care-test once checkout is clean, then walk
   confirmation. 45 min.
5. **Colourway photos (C5)** for one photographed frame. 45 min.
6. **Docs and `/handoff`**: product-page plan, parent plan Status, LEDGER. 30 min.
7. **Phase 6** (Stripe with Klarna and wallets, PayPal, `/a11y-audit`, performance audit), only when every page
   passes. Replace the test-only colourway photos before launch.
