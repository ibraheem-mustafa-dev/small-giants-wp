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
