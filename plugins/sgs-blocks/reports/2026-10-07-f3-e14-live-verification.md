# F3/E14 live verification of the nine shipped typography surfaces (2026-10-07)

**Result: 65 of 65 PASS** (0 FAIL, 0 INCONCLUSIVE, 0 NOT-PRESENT, 0 PROBE-BROKEN) on eye-care-test, code at
`0cc773b19` (the deploy marker; `git diff --name-only 0cc773b19..039a40aa7 -- plugins/ theme/` lists only the triage doc,
so live code equals HEAD code). Rows: `2026-10-07-f3-e14-live-verification.json`.

## Method
- One PRIVATE fixture page created over REST holding 5 `sgs/process-steps` (one `layout: list`), one `sgs/product-faq`
  with two items and one `sgs/countdown-timer` (`targetDate` 2099). It was driven through three states, each read at
  375 / 768 / 1440: D (no attribute set), S (attributes set), C (content rewritten with them cleared). A phase-marker
  paragraph per state proves each read hit the new content, not a cached page. The fixture was deleted at the end;
  `GET /wp/v2/pages?status=private,draft,publish,trash&search=sgs-f3e14` returned `[]` after every run.
- Every typography read is paired with a sham sibling (same tag, wrong class, same DOM position). PASS needs: read(S)
  equals the set value, the set value differs from every default read, read(C) equals read(D), and sham(S) differs from read(S).
- Editor: the block is selected with `wp.data.dispatch('core/block-editor').selectBlock()`, the Styles tab opened, and
  a pre-existing panel (Step Title / Border) is required as the sanity control.
- Stylesheets: 62 of 62 scanned (4 from `uploads/sgs-css`), **none skipped**.
- Harness proven first on `--only PS1a-icon-textalign,SHEETS-sgs-css` (4/4) and `--only ED-process-steps` (1/1).

## What is now proved live (1440 values; 375/768 also PASS)
| Check | Set | Read | Cleared (default) | Sham |
|---|---|---|---|---|
| process-steps icon / number / description `text-align` | right | right | center | center |
| process-steps list layout, no alignment set (and class injected) | — | left | — | start |
| product-faq question `font-weight` | 300 | 300 | 600 | 400 |
| product-faq question `font-size` | 33px | 33px | 16px (14.4px at 375) | 16px |
| product-faq question `line-height` | 47px | 47px | 22.4px | 24px |
| countdown number `font-weight` / `line-height` | 300 / 47px | 300 / 47px | 700 / 39.6px | 400 / 24px |
| countdown label `text-transform` / `letter-spacing` | capitalize / 7px | same | uppercase / 0.7px | none / normal |
| countdown expired `font-weight` | 300 | 300 | 600 | 400 |
| countdown number `font-size` (client size wins at every width) | 33px | 33px | 36px (21px at 375) | 16px |
| countdown number shrinks at 375 with no size set | — | 21px | 36px at 1440 | 16px |
| product-faq chevron, reduced motion | open | 180° rotation | closed 0° | 0° |
| product-faq chevron contrast (SC 1.4.11) | ≥ 3:1 | 6.64 resting / 18.42 open | — | calculator self-test 21:1, 4.48:1 |
| product-faq question contrast (SC 1.4.3) | ≥ 4.5:1 | 17.38 resting / 18.42 hover and open | — | as above |
| product-faq focus indicator (SC 2.4.7) | keyboard focus | 2.4px solid outline (author rule) | none unfocused | — |
| product-faq empty-answer chevron | open | 180° | closed 0° | 0° |
| product-faq chevron, forced colours | active | 400px² painted, SVG stroke | — | — |
| Editor: process-steps (Icon, Number, Description), product-faq (Question), countdown-timer (Number, Label, Expired) | — | all targets present on the Styles tab | control panel found | sham label absent |

The harness is the session-scratchpad script `verify-f3-e14-surfaces.mjs`. It is kept out of git because its `--site`
default names a client test site.

## Round 2: the new surfaces (deployed `a65587e9`)

The fixture grew a two-step `sgs/form` (tiles with icons, a consent field, a review step), an `sgs/option-picker`, an
`sgs/table-of-contents` with headings, an `sgs/cta-section`, and an `sgs/product-card` bound to variable product 136.
The same harness ran **before** the deploy on the old code (`0cc773b19`) and **after** it. Rows:
`2026-10-07-f3-e14-new-surfaces-before.json`, `…-after.json`.

**After: 99 PASS**, 0 INCONCLUSIVE, 0 NOT-PRESENT; 70 of 70 stylesheets scanned, none skipped. Every new
check at 1440 (375 and 768 also PASS):

| Check | Set | Read | Cleared (default) | Sham | Verdict |
|---|---|---|---|---|---|
| `FORM1` tile icon `font-size` | 37px | 37px | 24px | 16px | PASS |
| `FORM2` tile label `font-weight` | 300 | 300 | 500 | 400 | PASS |
| `FORM3` consent text `line-height` | 47px | 47px | 21px | 24px | PASS |
| `FORM4` review term `font-weight` (form driven to its review step) | 300 | 300 | 600 | 400 | PASS |
| `FORM5` submit button `line-height` | 47px | 47px | 21px | normal | PASS |
| `FORM6` step (Next) button `line-height` | 47px | 47px | 21px | normal | PASS |
| `OP1` pill text `line-height` via `pillLineHeight`, by inheritance (sham outside the pill) | 47px | 47px | 17.5px | 24px | PASS |
| `TOC1` / `TOC2` title `font-weight` / `line-height` | 300 / 47px | same | 600 / 32px | 400 / 22.4px | PASS |
| `PC1` / `PC2` "From" label `font-family` / `letter-spacing` | Georgia / 7px | same | Fraunces / 0.48px | Fraunces / normal | PASS |

**Negative control:** on the old code every FORM, OP1 and TOC check FAILED ("set 300 but painted 500"), so each
check turns red when its control is absent. PC1/PC2 passed on the old code too, because PHP never drops an
undeclared attribute; row 18's gap was the missing editor control, which only the editor check tests.

**Defaults, before against after (cleared state, every check, every width):** exactly one change, the "From"
label's `font-family` `Inter, sans-serif` → `Fraunces, serif` (the card's own font), which is the stated deletion
of a client font from plugin CSS. Nothing else moved. A static rater found no theme or reset rule that a
`:where()` default now loses to.

**`cta-section` (experiment rows):** with the root's `lineHeight` 47px and `fontWeight` 900 set, the body now
INHERITS both (47px, 900; before: BLOCKED by `.sgs-cta-section__body`). The headline still reads 28.8px / 700:
held by its own (0,1,0) default over the theme's heading styles, as measured and recorded DEFENSIBLE.

**Editor:**
- `ED-form` PASS in the `sgs_form` editor (post 285, opened read-only): Tile icon, Tile label, Consent text, Review
  term, Submit button and Step buttons all on the Styles tab; control panel present; sham absent. On a page,
  `sgs/form` renders the embed picker (`form/edit.js::Edit` branches on post type), so a page has no inspector to probe.
- `ED-table-of-contents` PASS.
- `ED-product-card` found a real, older defect: every product-card errored in the editor ("This block has
  encountered an error", `TypeError: Re is not a function`, typed and bound alike). Cause proven in source:
  `product-card/edit.js::Edit` destructured the attribute `attributeTagText`, shadowing the imported function of
  the same name (since `6f3601a32`). Fixed in `cd004d31a`.

**Final editor run (deployed `235d54de`, `2026-10-07-f3-e14-editor-final.json`): `ED-form`, `ED-table-of-contents`
and `ED-product-card` all PASS** (each block's new targets on the Styles tab, a pre-existing control panel present,
the sham label absent), and a bound product-card loads in the editor with 0 JavaScript errors.

## Round 3: the element controls from gap 7 (deployed `f1527a858`, editor-mock follow-up `73cdb64ca`)

Same method: one private fixture page (`sgs-e14-live`, 4 product-cards, 8 post-grids, 2 media, 2 buybox bound through `core/query` to product 136), D / S / C at 375 / 768 / 1440, phase marker confirmed in all 9 reads, a sham read on the same element of an unset sibling instance. S set desktop-only tier values (33px, 300, 47px, 7px, capitalize, right). 0 console errors, 0 HTTP 403. Fixture deleted (`DELETE /wp/v2/pages/1317?force=true` 200; the search returned `[]`; the page 404s).

| Block | Check | D | S | Sham |
|---|---|---|---|---|
| product-card | CTA line-height | 21px | 47px | 21px |
| product-card | CTA `justify-content` (ctaTextAlign right) | center | flex-end | center |
| product-card | rating row size / weight / line-height / spacing / transform | 13px / 400 / 19.5px / normal / none | 33 / 300 / 47 / 7px / capitalize | unchanged |
| product-card | rating row `justify-content` | normal | flex-end | normal |
| product-card | rating stars size and spacing | 13px, 1.56px | 29px, 9px | unchanged |
| product-card | saving badge (all five) | 11px / 400 / 16.5px / 1.1px / uppercase | set values | unchanged |
| product-card | zero-review text | 12px | 30.46px at a 33px row (`calc(12em / 13)`, follows the rating size by design) | 12px |
| post-grid | page buttons (all five) | 14px / 600 | set values | 14px / 600 |
| post-grid | load more (all five) | 16px / 600 | set values | 16px / 600 |
| post-grid | meta, excerpt, read more (all five and text-align); badge; category (flat style) | the stylesheet defaults | set values | unchanged |
| media | video time (all five) | 12px, line-height 12px | set values | 12px |
| buybox | stock row (all five) and `justify-content` (center) | 14.4px / 600, normal | set values, center | unchanged |
| buybox | notify heading and submit | 16px / 700 and 16px / 600 | set values | unchanged (computed on hidden elements: no product is out of stock) |

375 and 768 PASS in every row; C equals D in every row. Editor: all 18 blocks valid, the product-card Typography switcher lists Rating and reviews, Rating stars and Saving badge beside the pre-existing Title.

Not coverable on eye-care-test: card-grid (its paginating `cpt-collection` mode has no registered post type there), buybox saving badge (product 136 has no RRP) and the guided layout, product-card bound-mode RRP and swatch count, account (needs a signed-in customer) and nav-drawer-menu (drawer context). The site's media library has no video; an external MP4 drove the player.
