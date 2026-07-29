---
doc_type: session
project: small-giants-wp
date: 2026-07-29
track: Spec 36 nav — drawer desktop variants, Task 5
outcome: REJECTED on Bean's eye (R-31-13); next front is a block-vs-CPT design gate
decisions: D411
---

# Session 2026-07-29 — Task 5 exit gate ran, and was rejected

Swept out of `LEDGER.md` to keep it under cap. The LEDGER keeps the verdict, the two
open defects, the standing warnings and the next front; everything below is the
detail behind them. Canonical record: **D411** + the CORRECTION box at the top of
`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.

## The verdict

Bean reviewed the side-by-side pairs and rejected them: *"the difference between our
version and theirs is night and day"*, *"all of these clone attempts need huge fixes
to reach completion now"*. R-31-13 holds — the eye is co-authoritative and it said no,
overriding a 21/21 mechanical pass. Do not re-present without real rework.

## What he found, all verified afterwards

- **`solid-brand-light` had NO reference screenshot at all** (only `-ours`), so nothing
  was compared for that variant.
- **`two-column-editorial`'s "reference" is the CLOSED homepage**, cookie banner still
  up — the menu was never opened. Verified by opening the PNG.
- **Alignment wrong on several**, most visibly `centred-statement` — the variant whose
  NAME is its alignment — rendering flush left.
- **"Detached arrows with no labels"** in the same variant.
- **Content is not an exact clone** despite the §6 POC rule requiring exactly that; the
  real gap is DESIGN fidelity (text styling, panel background, border lines, symbols,
  button styling) plus three ABSENT behaviours on lamalama: the cycling animated
  background imagery, the animated "THIS IS US" circle, and the right-hand floating UI.

## Root causes proven live

**`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER`.** The "detached arrows" DO have labels — they
are unpainted. `sgs-icon-list__text` computes `rgb(58,46,38)` on a drawer background of
`rgb(58,46,38)`: contrast **1:1**. A re-sweep of every text element in all 7 drawers
found **6 such elements in exactly the 2 variants using the dark `footer-bg`**
(`centred-statement` Contact/Latest/Careers, `split-zone-serif` Team/Careers/Press); the
other five variants are clean.

**`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`.** The drawer emits **no align class at all**
(`drawerAlignAttrPresent: false` on the live element). `drawerAlign` centres the drawer's
direct children as BOXES; the nav-menu then stretches to the full 1376px with
`text-align: start`, so its links stay at x=32 while the narrower secondary blocks do
centre — which is why the panel reads half-centred.

## The process failure (the part worth keeping)

The exit-gate report claimed **21/21 sweep cells PASS** and **7 exact-content fixtures
live**, and the LEDGER repeated it. Those cells measured axe / geometry / focus /
reduced-motion / JS-off — **none of which measures whether a clone looks like its
reference** — and it was presented in a way that read as fidelity. Three holes:

1. **Reference captures were never asserted OPEN.** The capture script clicked and
   photographed. **This is the identical vacuous-check class as the axe openness guard
   fixed EARLIER THE SAME SESSION**, repeated on the reference side within hours. The
   "6/7 references captured" tally was false; the real figure was 5/7 at best.
2. **The contrast check walked only `.sgs-nav-menu__link-text`**, returning 13.14:1 for a
   drawer simultaneously painting text at 1:1.
3. **Content fidelity was asserted, never measured** — checked as "my strings are in the
   DOM", never as "this resembles the reference".

Both are now STOP entries (`STOP-FIXING-ONE-INSTANCE-OF-A-FAILURE-CLASS-DOES-NOT-IMMUNISE-THE-NEXT`,
`STOP-A-CONTRAST-CHECK-MUST-WALK-EVERY-TEXT-ELEMENT-IN-THE-SURFACE`,
`STOP-A-GREEN-MEASUREMENT-IS-NOT-FIDELITY-AND-MUST-NOT-BE-PRESENTED-AS-IT`).

## Two of my own claims corrected before they became the brief

- **"`centred-statement` renders 3 items where the extraction recorded 7"** — FALSE, and it
  had already reached the LEDGER. The 7-item site is studionamma (`two-column-editorial`);
  `centred-statement` clones fantasy.co, which genuinely has 3 primary links
  (`labels-fantasy.json` `counts.primary = 3`, matching the independent extraction count).
  Acting on it would have added four items that should not exist.
  → `STOP-A-REJECTION-RECORD-IS-A-HYPOTHESIS-TOO`.
- **The F1 "reading order" finding was over-claimed.** It recommended changing
  `listColumns` off `grid-auto-flow:row`. Bean's counter stands: with a row-wise grid,
  reading ACROSS rows already gives menu order, and authoring as rows of 2 is correct
  either way. The claim assumed column-wise reading with no verified reference — and the
  capture for that exact variant had failed. Downgraded to UNDECIDED.

## What DID pass (mechanical half, for the record)

21/21 sweep cells across 7 variants × 375/768/1440: openness-guarded axe · resting
contrast · focus containment · ESC-closes-and-returns-focus · reduced-motion end state ·
JS-off crawl. Plus: D374 multi-instance (unique ids, each burger opens its own panel, no
fatals); the `header` anchor deriving from the real header (drawer top 93 = header height)
verified in a genuinely PINNED state after the first attempt proved VACUOUS (`scrollY: 0`);
the `centred` anchor exactly centred (420px at left=510 on 1440); and **`listColumns`
CONFIRMED visible in the editor canvas** (`display:grid`, two 318.9px columns) — the design
gate's one open question, answered by measurement.

Geometry corroborated the references rather than merely rendering: `floating-capped-card`
measured 438px at 768/1440 and **343px at 375** = `min(438px, 100vw−32px)`, the exact
recorded fluid cap.

## Three harness bugs fixed (each had produced a confident false result)

1. **The axe openness guard did not exist.** `axe-run.mjs` only checked the scope selector
   MATCHED; a closed `<dialog>` is in the DOM and axe skips hidden subtrees, so a CLOSED
   drawer returned `0 violations` identically to an open one. **Every scoped drawer/mega axe
   result before 2026-07-29 proves nothing.** Negative control now proven on `/t1-nav/` at
   375px: closed + `--allow-closed` → 0 violations exit 0; closed + guard → VACUOUS exit 3;
   open → PASS (375x1200, 5 focusables).
2. **The automation's own cursor** stayed on a link after the burger click, so axe measured
   its `:hover` colour and reported a *serious* 2.14:1 contrast violation that vanished when
   the pointer moved. Pointer now parked; a DELIBERATE resting-contrast check replaced the
   accidental one. → `STOP-THE-AUTOMATIONS-OWN-CURSOR-CONTAMINATES-THE-MEASUREMENT`.
3. **The JS-off check** compared raw label text against HTML, so `Arts & Culture` (served
   `Arts &amp; Culture`) read as missing while present twice.

A fourth was a FIXTURE defect, not a product one: at 375px every click was intercepted
because the theme header is `position:absolute`, 251px tall, rendering the **desktop** logo
(305×102) over page content. The first fix attempt — scrolling the burger clear — **could
never have worked**, because an absolutely-positioned header scrolls WITH the document so
the overlap is fixed in document space. Only `elementFromPoint` revealed it. Fixtures now
place the nav bar below the header's footprint. The header behaviour itself belongs to the
header track (matches the known-open "logo mobile-tier switch" item).

## Assets left behind (committed, re-runnable)

`plugins/sgs-blocks/scripts/nav-qa/`: `build-poc-fixtures.py` (+ `poc-content-plan.json`;
`--list` / `--delete-all` / `--dry-run`), `sweep-drawer-variants.mjs`,
`shoot-drawer-pairs.mjs`, `axe-run.mjs` (openness guard + `--require-open` / `--allow-closed`).
Live canary fixtures: pages 1892 / 1897 / 1903 / 1907 / 1914 / 1922 / 1926, multi-instance
1930, anchor probes 1932; menus 102–109. Screenshots at
`reports/visual-diff/drawer-variants-2026-07-29/` (PNGs are gitignored; `manifest.json` is
committed). Harvested reference labels:
`.claude/reports/2026-07-28-drawer-code-extraction/labels-*.json` (7 sites, desktop +
400px; all 7 primary-link counts match the independent code-extraction measurement).

Commits: `3097c459` (gate + harness) · `be582bdd` (corrections).
