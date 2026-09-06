# sgs/site-header + sgs/site-header-row — live canary verification (header completeness, Tasks 1–5)

```
verdict: PASS
intent_capture_passed: true
blocks: site-header, site-header-row, site-footer-row
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-08-19
branch: feat/header-completeness @ 86ef63f3 (+ merge fc125dd8)
```

Discharges the scoped visual-gate skips logged in `manual-skips.log` for
`a721a841`, `bf3b5ebb`, `602bbb94` and `eaf07931`. Single capture after all five
tasks landed, rather than four half-built ones — and batched deliberately, because
a second session was live on the same canary and each deploy overwrites the other's
build.

`intent_capture` rather than a before/after diff: there is no meaningful "before"
for a control that did not exist. Each assertion below is a stated intent measured
against the live painted element.

## How it was verified

The header comes from the theme FILE, not a `wp_template_part` post (`wp post list
--post_type=wp_template_part` returns zero rows), so header attributes cannot be
set through the DB. Verification used a probe page (page 2522,
`/header-verification-probe-2026-08-19/`) carrying three `sgs/site-header`
instances configured to exercise every new control, plus the real site header on
the homepage as the regression control.

⚠ **Block CSS is LIFTED to `uploads/sgs-css/`, not inlined.** Grepping the page
HTML for a `<style>` block returns nothing and proves nothing. Every rule below was
read from the lifted stylesheet and then re-confirmed as a COMPUTED value on the
painted element.

## Assertions

| # | Intent | Measured | ✓ |
|---|---|---|---|
| 1 | Header is a `<header>` landmark after `tagName` was deleted | `tagName === 'HEADER'` on homepage + all 3 probes | ✓ |
| 2 | Retired contrast body classes are gone | body carries `sgs-has-header` only; `sgs-header-behaviour-contrast*` absent; `sgs-has-header-behaviour` absent | ✓ |
| 3 | Contrast scrim paints at desktop | `::before` `content:""` + `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))` | ✓ |
| 4 | **Scrim CANCELS at mobile** (the per-device capability that did not exist) | at 375px `::before` `content: none` | ✓ |
| 5 | Content sits above the scrim | `> *` → `position:relative; z-index:1` | ✓ |
| 6 | `shadow` renders now that a control exists | `box-shadow: rgba(0,0,0,0.1) 0px 4px 12px 0px` | ✓ |
| 7 | Contrast `shadow` mode paints text-shadow | `a,button { text-shadow:0 1px 3px rgba(0,0,0,0.6) }` emitted | ✓ |
| 8 | `force-solid` suppresses transparency rather than fighting it | probe 3 `position: relative` (NOT lifted out of flow), no transparent rule, no `!important` war | ✓ |
| 9 | **Client-set scrolled background lands** | `.is-header-scrolled` → `rgb(230,138,149)` = the chosen `primary` | ✓ |
| 10 | **Client-set scrolled TEXT colour lands** | `.is-header-scrolled` → `color rgb(251,243,220)` = the chosen `surface` | ✓ |
| 11 | **Direction inverts** (`solid-first`) | probe 2 at rest `rgb(230,138,149)` solid; scrolled → `rgba(0,0,0,0)` transparent | ✓ |
| 12 | The scrolled rule keeps `!important` (P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING) | `background:… !important; color:… !important` present in the lifted CSS | ✓ |
| 13 | **No regression from the pattern colour migration** | homepage header `background rgb(251,243,220)` = the `surface` token still paints after 7 patterns moved `backgroundColor` → `backgroundColour` | ✓ |
| 14 | Sticky unaffected | homepage `position: sticky`, `top: 0px` | ✓ |
| 15 | Height publisher unaffected (D330 single publisher) | `--sgs-header-height: 144px` | ✓ |
| 16 | Navigation still reachable | nav present inside the header | ✓ |
| 17 | No console errors | 0 errors / 0 warnings on homepage AND probe page | ✓ |

## Screenshots

`reports/visual-diff/site-header-2026-08-19/` — `header-probe-{375,768,1440}.png` (probe page,
full-page) and `home-{375,1440}.png` (the real site header).

⚠ Those PNGs are NOT in git — `.gitignore:77` excludes `*.png` repo-wide, so they exist only in
the working tree that captured them (`C:/tmp/sgs-header`). The measured values in the table above
are the durable evidence; the images are corroboration.

## Honest caveats

1. **One reading is unreliable and is excluded.** `getComputedStyle` returns a LIVE
   declaration, so the "at rest" background captured at mobile was read after the
   test had already added `is-header-scrolled` to the same element and reflects the
   scrolled state, not the resting one. The desktop resting reading (taken before
   any class mutation) is the trustworthy one and showed `rgba(0,0,0,0)`.
2. **The scrolled state was forced by adding the class, not by scrolling.** That
   tests the CSS contract, which is what changed. `view.js`'s scroll listener that
   toggles the class was not itself modified by this work.
3. **Task 3 (row control renames) is editor-only** and is not covered here — the
   pre-commit gate classified it `editor-only (edit.js) — visual gate N/A`.
4. **The Task 1 editor advisory was not exercised in the editor.** Its logic is
   verified by construction (it reads the same `resolveTier` cascade the PHP uses)
   but a client-facing notice deserves an editor capture before it is called done.

## Cleanup

Probe page 2522 was DELETED from the canary (`wp post delete 2522 --force`; confirmed by
`Could not find the post with ID 2522`). The measured values in the table above are the durable
evidence — the page itself was scaffolding.

⚠ This paragraph originally read "left published deliberately". It was already gone by then, and an
independent QC pass on the handoff caught this report contradicting the LEDGER, which said deleted.
Corrected rather than left as two committed docs disagreeing about the same fact.
