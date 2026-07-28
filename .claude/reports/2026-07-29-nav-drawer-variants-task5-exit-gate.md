---
doc_type: report
project: small-giants-wp
title: sgs/nav-drawer desktop variants — Task 5 exit-gate verification
date: 2026-07-29
spec: 36-SGS-NAVIGATION-SYSTEM.md FR-36-6
status: MEASUREMENT COMPLETE — awaiting Bean's eye (R-31-13); gate does NOT close on this report alone
---

# Task 5 — the pre-registered exit gate for the drawer variants

## Plain English first

Last session built seven "looks" for the burger menu, each modelled on a real
agency website, and deployed them. **This session checked whether they actually
work and actually resemble those sites.** Checking meant three things: building
seven test pages that carry the *real* content of the sites they copy, running
every accessibility and keyboard check on each one at three screen sizes, and
taking side-by-side photographs so Bean can judge the look himself.

**Result: every automated check passes — 21 of 21 cells.** Two genuine issues
came out of it, neither an automated failure: one is a visual reading-order
mismatch in the two-column look, and one belongs to another track entirely.
**The gate is NOT closed** — by the project's own rule (R-31-13) numbers and
Bean's eye are co-authoritative, and only the numbers are in.

---

## 1. What was verified, and how

Seven fixture pages, one per variant, each bound to its **own** classic WordPress
menu carrying the reference site's real link labels, plus the reference's real
secondary copy in the seeded child blocks. This is the design gate's §6 rule:
hold content constant so any visual difference is attributable to the BLOCK,
never to content drift.

Content came from a live harvest of all 7 reference drawers (desktop + 400px),
written to `.claude/reports/2026-07-28-drawer-code-extraction/labels-*.json`.
**Independent corroboration:** all seven primary-link counts (5/4/5/3/6/7/3)
match last session's separate code-extraction measurement exactly.

| Variant | Reference | Fixture page | Menu |
|---|---|---|---|
| floating-capped-card | lamalama.com | 1892 | 102 |
| anchored-card-stack | lusion.co | 1897 | 103 |
| editorial-ghost-list | dogstudio.co | 1903 | 104 |
| centred-statement | fantasy.co | 1907 | 105 |
| solid-brand-light | buck.co | 1914 | 106 |
| two-column-editorial | studionamma.com | 1922 | 107 |
| split-zone-serif | wearecollins.com | 1926 | 108 |
| (multi-instance, D374) | — | 1930 | 109 |
| (anchor probes: header + centred) | — | 1932 | 102 |

Rebuild any time with
`python plugins/sgs-blocks/scripts/nav-qa/build-poc-fixtures.py --plan plugins/sgs-blocks/scripts/nav-qa/poc-content-plan.json`
(`--list` to inventory, `--delete-all` to remove).

## 2. Sweep result — 21/21 cells PASS

7 variants × 375 / 768 / 1440. Per cell: openness-guarded axe · resting-state
contrast · focus containment · ESC-closes-and-returns-focus · reduced-motion end
state · (at the narrowest width) JS-off crawlability.

| Variant | 375 | 768 | 1440 | Panel at 1440 | Lowest resting contrast |
|---|---|---|---|---|---|
| floating-capped-card | PASS | PASS | PASS | 438×526 | 19.29:1 |
| anchored-card-stack | PASS | PASS | PASS | 310×388 | 8.43:1 |
| editorial-ghost-list | PASS | PASS | PASS | 1440×1000 | 13.00:1 |
| centred-statement | PASS | PASS | PASS | 1440×1000 | 13.14:1 |
| solid-brand-light | PASS | PASS | PASS | 1440×1000 | 8.43:1 |
| two-column-editorial | PASS | PASS | PASS | 1440×1000 | 18.96:1 |
| split-zone-serif | PASS | PASS | PASS | 1440×1000 | 13.14:1 |

Geometry corroborates the reference measurements rather than merely "rendering
something": `floating-capped-card` is 438px at 768/1440 and **343px at 375**,
i.e. `min(438px, 100vw − 32px)` = 375 − 32 — the exact fluid cap recorded for
lamalama. `anchored-card-stack` is 310px at 1440 (its measured reference width)
and takes over the viewport below desktop, which is the per-device `anchor` the
design gate specified.

One cell initially failed on `net::ERR_CONNECTION_RESET` — a transient network
error, not a product result. It was re-run and passes; recorded here rather than
quietly dropped.

## 3. Checks outside the sweep

**Multi-instance, D374 — PASS.** Two drawers on page 1930: unique ids
(`sgs-nav-drawer-1/-2`), each burger opens exactly its own panel, both preset
classes render, no PHP fatal in the HTML, zero console errors.

**Duplicate-`drawerRef` behaviour — measured, low severity.** Both blocks default
to `drawerRef: "sgs-nav-drawer"`, so two drawers left on defaults produce
duplicate DOM ids and two burgers whose `aria-controls` point at the same id. In
practice **each burger still opened the correct panel** (proven by their differing
link sets), and a whole-page axe run at 1440 reported **0 violations**. So: an
HTML-validity wrinkle that axe 4.11 does not flag and that does not break
behaviour. Parked, not fixed.

**`header` anchor — PASS, unpinned and pinned.** Drawer top = 93px = the header's
exact height, width matching the header — it DERIVES from the header rather than
hardcoding, which was the design-gate requirement. Verified in a genuinely pinned
state (scrollY 1500, header carrying `is-header-scrolled is-header-shrunk
is-header-scrolling-down`).
⚠ **The first pinned attempt was VACUOUS** — it reported `scrollY: 0`, i.e. it
never tested the pinned state at all. It was re-measured with a scroll assertion
rather than banked. Anyone repeating this must assert the scroll took effect
BEFORE opening the dialog.

**`centred` anchor — PASS.** 420px panel at left=510 on a 1440 viewport, exactly
`(1440 − 420) / 2`. Neither `header` nor `centred` is reachable from any shipped
preset, so both were hand-set.

**`listColumns` in the editor canvas — VISIBLE (the design gate's one open
question, now answered by measurement).** In the real block editor on page 1922
the drawer's bar computes `display: grid`,
`grid-template-columns: 318.906px 318.906px`, 7 items. The SSR + lifted-CSS
interplay does NOT break the canvas.

**Scroll position across open/close — PASS with a 2px drift.** 1000 → 998. The
page is scroll-locked at 0 *while* open (expected under `showModal`) and restored
on close. An earlier "reader dumped to the top" reading of this was my error, from
a strict equality check; corrected here.

## 4. Findings for Bean

### F1 — Two-column list: visual reading order does not match menu order (decision needed)

In `two-column-editorial` the list uses `grid-auto-flow: row`, so a 7-item menu
lays out across the columns rather than down them:

- Menu order: Home · Work · Services · Approach · Studio · Plans · News
- Column 1 reads: Home · Services · Studio · News
- Column 2 reads: Work · Approach · Plans

Keyboard and screen-reader order are **correct** (they follow the DOM). It is the
*visual* reading order that diverges. The reference (studionamma) splits
sequentially 4+3 — first four in column 1, last three in column 2.

Fixing it means `grid-auto-flow: column` plus an explicit row count derived from
the item count in `nav-menu/render.php`. That changes rendering semantics of a
shared block, so per project rule 7 it is brought here as a decision rather than
changed unilaterally. **Recommendation: change it** — a menu whose visual order
differs from its real order is a genuine usability defect, and it also closes a
fidelity gap against the reference.

### F2 — Theme header renders the DESKTOP logo at mobile width (different track)

At 375px the site header is `position: absolute` and **251px tall**, because it
renders `sgs-responsive-logo__image--desktop` at 305×102. It overlays the top of
page content, making anything there unclickable — proven with `elementFromPoint`,
which returned that logo image over the fixture's burger.

This is the **theme header**, not the drawer, and it matches the already-known
open item *"logo mobile-tier switch (confirm the D341 `custom` mode covers it)"*
in the product queue. Left for that track; recorded here because it is now
measured rather than suspected.

### F3 — Framework gap: no Vimeo or Dribbble social icon

`sgs/social-icons` has no `vimeo` or `dribbble` platform slug
(`render.php $platform_icons`). buck.co uses Vimeo and dogstudio.co uses
Dribbble, so both fixtures map them to `website` with a label override. A real
fidelity limitation against the references, recorded rather than hidden.

## 5. Harness defects found and fixed (these matter as much as the results)

Three harness bugs were caught, each of which would have produced a
confident-looking but false result:

1. **The axe openness guard did not exist.** `axe-run.mjs` clicked the trigger and
   only checked the scope selector *matched*. A `<dialog>` is in the DOM whether
   open or closed and axe skips hidden subtrees, so a **closed** drawer returned
   `0 violations` identically to an open one. **Every scoped drawer/mega axe
   result recorded before 2026-07-29 proves nothing and should be re-run.**
   Now: the guard measures `dialog[open]`, a non-zero box, not
   `display:none`/`visibility:hidden`/`opacity:0`/`[hidden]`/`aria-hidden`, and
   **≥1 visible focusable element**, then reports `VACUOUS` + exit 3 instead of a
   pass. Negative control, measured live on `/t1-nav/` at 375px:
   - closed + `--allow-closed` (reproduces the old behaviour) → `0 violations`, exit 0
   - closed + guard → `VACUOUS`, exit 3
   - opened → `guard PASS — 375x1200, 5 focusable element(s)`, `0 violations`, exit 0

2. **The automation's own cursor manufactured an accessibility violation.** After
   clicking the burger the pointer STAYS there, and a full-screen panel renders a
   link underneath it — so axe measured that link's `:hover` colour and reported a
   *serious* contrast failure of 2.14:1 on `editorial-ghost-list` at 768 and 1440.
   Proven a hover artefact: move the pointer away → the colour reverts to black;
   deliberately hover the same link → it returns. The runner now parks the pointer
   at (2,2) after opening, and the sweep gained a **deliberate** resting-state
   contrast check so hover states are still measured on purpose rather than by
   accident.

3. **A crawlability false positive.** The JS-off check compared raw label text
   against HTML, so `Arts & Culture` (served as `Arts &amp; Culture`) was reported
   missing. It was present twice. The check now compares the encoded form too.

A fourth issue was a **fixture** defect, not a product one: at 375px every click
was intercepted by the theme header (see F2). My first fix — scrolling the burger
clear — **could never have worked**, because an absolutely-positioned header
scrolls *with* the document, so the overlap is fixed in document space. Only
measuring `elementFromPoint` revealed that. The fixtures now place the nav bar
below the header's footprint, and 375px passes everywhere.

## 6. What does NOT close on this report

**Bean's eye (R-31-13).** Side-by-side same-content pairs at 1440 are at
`reports/visual-diff/drawer-variants-2026-07-29/` with a `manifest.json`.

**Tally: 7/7 ours captured, 6/7 references captured.** `buck.co` is UNCAPTURED —
no clickable trigger found among the candidate selectors — and is recorded as a
gap rather than omitted. The other six opened and were photographed with their
panels genuinely open.

The lamalama pair is worth looking at first, because it shows what these pairs
are *for*: the reference panel carries exactly the labels and buttons our fixture
carries (Work · What we do · About us · Careers · Contact, then OUR PITCHDECK and
the two-up SCHEDULE A CALL / START A PROJECT row), which confirms the harvest was
faithful. What differs is (a) the panel's position — the reference floats it
top-centre, our `trigger` anchor pins it top-right — and (b) the palette, because
our fixtures render in the canary's Mama's tokens (cream/pink) rather than the
reference's dark surface. (b) is expected and correct: variants set defaults, the
site's own tokens supply the colour. **(a) is a real judgement call and is exactly
what your eye is needed for.**

Capturing these third-party sites needed a programmatic-click fallback — several
are heavy custom-JS builds whose overlays intercept a real pointer click. That
fallback is used ONLY for reference sites; our own fixtures are always driven by
a genuine pointer click, because on our side the click is part of what is under
test.

Also still open, by design: burger-morph is a static icon
(`P-DRAWER-BURGER-MORPH-SYNC`), the trigger anchor is a CSS approximation
(`P-DRAWER-TRIGGER-ANCHOR-JS`), and genericising the fixtures' reference copy is
the named pre-production step (`P-DRAWER-VARIANT-CONTENT-GENERICISE`).

## 7. Reproducing all of it

```bash
# fixtures
python plugins/sgs-blocks/scripts/nav-qa/build-poc-fixtures.py \
  --plan plugins/sgs-blocks/scripts/nav-qa/poc-content-plan.json

# the sweep (21 cells)
node plugins/sgs-blocks/scripts/nav-qa/sweep-drawer-variants.mjs \
  --plan plugins/sgs-blocks/scripts/nav-qa/poc-content-plan.json \
  --base https://sandybrown-nightingale-600381.hostingersite.com --out sweep.json

# visual pairs
node plugins/sgs-blocks/scripts/nav-qa/shoot-drawer-pairs.mjs \
  --plan plugins/sgs-blocks/scripts/nav-qa/poc-content-plan.json \
  --base https://sandybrown-nightingale-600381.hostingersite.com \
  --out reports/visual-diff/drawer-variants-2026-07-29 --widths 1440
```
