---
doc_type: report
subject: focus-indicator cascade — QC council Stage 5 baseline
date: 2026-08-02
site: sandybrown-nightingale-600381.hostingersite.com (Mama's Munches — pink/cream)
theme_version_at_measurement: 1.5.53
---

# Focus cascade — the measured baseline

**This is the Stage 5 baseline for the `/qc-council` on the focus-indicator cascade.** It exists so
any proposed fix has a number to beat, and so a later session cannot re-argue the starting state
from memory.

## Why this measurement was taken at all

Step Z of the Wave D register was logged as *"a fourth focus system, one generation behind — 30
minutes, haiku"*. Two framings were tested and **both were wrong**:

1. **"A fourth system."** There are **58 `:focus-visible` rules across 7 files** in **four** token
   families — not four systems, and not one generation apart.
2. **"`utilities.css` overrides D463's catch-all by load order, so the catch-all never paints."**
   My own hypothesis. **Refuted by measurement**: a focused `.sgs-responsive-logo__link` computes
   `outline-color: rgb(197,106,122)` = `#c56a7a` = `--sgs-focus-color`, so D463's rule *is* winning
   there. Recorded because it was within one step of being written up as a finding.

**The actual cause of the missing glow was file-level, not cascade-level:** the deployed
`core-blocks-critical.css` carried no `--sgs-focus-glow` and no `box-shadow` line at all, while
local source had both. **The theme half of D463 had never been deployed** — every deploy had been
`--blocks-only`, and the local theme was already version-bumped to 1.5.53 against a deployed 1.5.52.
D463's own live check was taken on a form input, which has a more specific rule, so it could not
have exposed this.

Deployed 2026-08-02. The glow now paints. **The divergence below is what remains after that.**

## THE BASELINE METRIC

**25 focusable elements on the live homepage produce 8 DISTINCT focus treatments.**
**Only 2 of 25 render D463's intended treatment.**

⚠ Outline widths below are as reported by `getComputedStyle` at `devicePixelRatio: 1.1`, so
`1.818px` = authored `2px` and `2.727px` = authored `3px`. Do not read the raw numbers as authored
values.

| n | Sample element | Outline | Offset | Glow |
|---|---|---|---|---|
| 7 | `button.sgs-nav-menu__burger` | 2px solid `#3a2e26` (`--wp--preset--color--text`) | 2px | yes |
| 7 | `a.sgs-button--primary` | 3px solid `#3a2e26` | 0 | **no** |
| 4 | `button.sgs-testimonial-slider__dot` | 3px solid `rgba(31,122,122,.4)` **TEAL** | 2px | yes |
| 2 | `a.sgs-responsive-logo__link` | 2px solid `#c56a7a` (`--sgs-focus-color`) | 3px | yes |
| 2 | `button.sgs-testimonial-slider__arrow` | 3px solid **TEAL** | 2px | **no** |
| 1 | `a.skip-link` | 2px solid `#3a2e26` | 2px | own shadow |
| 1 | `a.sgs-cart__trigger` | 2px solid `#e68a95` | 4px | yes |
| 1 | `a.sgs-button.sgs-btn-*` | 3px solid `#c56a7a` | 0 | **no** |

**The teal is the headline.** `rgba(31, 122, 122, 0.4)` is the hardcoded `theme.json`
`settings.custom.focus-ring.color-primary` default. It is a teal at 40% alpha rendering on a
**pink and cream** client palette, on 6 of 25 elements — off-brand, and a 40%-alpha colour
composites against its backdrop, so its real contrast is lower than the raw hex suggests.

## The four token families

| Family | Defined at | Read by |
|---|---|---|
| `--sgs-focus-color` / `--sgs-focus-glow` | `core-blocks-critical.css:108-109` (`:root`) | `core-blocks-critical.css:132-135, 139-143, 146-151, 210, 335`; `core-blocks.css:183, 193`; `dark-mode.css:97` |
| `--wp--custom--focus-ring--*` | `theme.json:395-400` (**hardcoded rgba, not palette-derived**) | `core-blocks.css:505, 528, 549`; `plugins/sgs-blocks/assets/css/extensions.css:442-445` |
| `--sgs-focus-ring-*` (per-instance) | emitted by `src/blocks/form/render.php` | `src/blocks/form/style.css:206-218` |
| `--wp--preset--color--text` | theme.json palette | `utilities.css:249-253` (`*:focus-visible`) |

Plus **27 `:focus-visible` rules in `woocommerce.css`** which no session has yet examined.

## Load order (why equal-specificity rules resolve as they do)

`functions.php:235` `sgs-core-blocks-critical` → `:243` `sgs-core-blocks` (deps: critical) →
`:250` `sgs-utilities` (**deps: none**). `:focus-visible` and `*:focus-visible` are both
specificity **(0,1,0)**, so `utilities.css` wins wherever no more specific rule applies.

## How to re-measure

Load the homepage, focus every visible focusable in turn, and key a Map on
`outline-width + outline-style + outline-color + outline-offset + box-shadow`. The metric is
`Map.size`. **Baseline = 8.** A fix is only validated if that number falls and the surviving
treatments are the intended ones — a drop to 1 that lands on the WRONG treatment is not a pass.

---

# QC COUNCIL OUTCOME (2026-08-02)

Three raters, cross-model, each required to cite `file:line` or a measured value. Fix-shape
proposals are HYPOTHESES; the verdicts below are the Stage 5 gate result.

## THREE LIVE WCAG 2.4.11 FAILURES — measured, alpha-composited over the REAL local background

| Element | Rendered outline | Local background | Contrast | Verdict |
|---|---|---|---|---|
| `.sgs-testimonial-slider__arrow` | `rgba(31,122,122,.4)` teal | pink `#e68a95` | **1.42:1** | **FAIL — worst; effectively invisible** |
| `.sgs-testimonial-slider__dot` | `rgba(31,122,122,.4)` teal | near-white `#FFF9F0` | **1.75:1** | **FAIL** |
| `.sgs-cart__trigger` | `#e68a95` | cream `#FBF3DC` | **2.25:1** | **FAIL** |
| `.sgs-responsive-logo__link` | `#c56a7a` | cream `#FBF3DC` | 3.32:1 | passes — but ON the 3.0 floor, fragile |

A keyboard user tabbing the testimonial slider cannot see where focus is. That is the headline.

## Verdicts

**P1 (repoint `theme.json:395-400` off the hardcoded teal) — VALIDATED, and BIGGER than proposed.**
All 7 consuming files read the custom property rather than a hardcoded literal, so fixing the token
at source fixes testimonial-slider **and** modal, accordion, gallery, tabs, product-faq and
`extensions.css` in one change. No `!important` sits between token and property at any call site.

⚠ **Rater C objected that P1 violates D322/D463. That objection is FALSIFIED and must not be
inherited.** It claimed the teal "was specifically chosen because D463 measured it at 3.32:1 across
8 palettes". Two independent disproofs: (a) the teal was hardcoded in commit `618db290` on
**2026-04-29**, and D463 is **2026-08-02** — an April constant cannot be justified by an August
measurement; (b) D463's `3.32:1` measured **`#c56a7a` (`primary-dark`)**, a different token
entirely. The teal has never been measured against a client palette, and Rater A has now measured it
live at **1.42:1 / 1.75:1 — failing**. On D322 ("focus is framework-level, not per-client"): P1
keeps the rule in the theme and repoints it at a palette token, which is exactly what
`--sgs-focus-color` already does at `core-blocks-critical.css:108`. It aligns the two families
rather than reversing D322.

**P2 (delete `*:focus-visible` at `utilities.css:249-253`) — REJECTED. All three raters converge.**
It is a NO-OP on all 25 measured elements (every one wins from a more specific rule), AND it is
protective: D322 put it there deliberately as the framework a11y default for every client, keyed to
`--wp--preset--color--text` precisely so it reads against any palette. Deleting it does NOT hand
those elements to `core-blocks-critical.css:132` — the two rules are EQUAL specificity (0,1,0), so
the fallback would be the UA default, not the critical rule. **Do not delete.**

**P3 (repoint `.sgs-has-focus-ring`) — VALIDATED but COSMETIC, not the fix.**
Not one of the 25 measured elements carries that class. Worth doing for consistency; it fixes
nothing visible. (Its original blocker — a co-active track holding `extensions.css` — is gone: the
whole diff is now a one-line comment rename.)

**P4 (NEW, surfaced by convergence) — `.sgs-cart__trigger` at 2.25:1 belongs to NO named token
family** (`cart/style.css:37`, reading `--wp--preset--color--primary`). None of P1/P2/P3 touches it.
It needs its own fix.

## Open thread — not proven, do not build on it

7 of 25 elements compute `box-shadow: oklab(0 0 0 / 0) 0px 0px 0px 0px` — a fully transparent,
zero-size shadow that **suppresses D463's glow**. That it renders is measured; **which rule sets it
is NOT.** It is not in any theme CSS file, so it lives in block-scoped CSS lifted to
`uploads/sgs-css/` — the surface a page-HTML grep cannot see. Find the writer before fixing it.

## Verification for any fix

Re-run the baseline method. **Passing is not "fewer treatments" — it is fewer treatments AND all
three failures above clearing 3:1, measured alpha-composited over their real local background.**
A drop to one treatment that lands on the wrong colour is not a pass.

---

# IMPLEMENTED 2026-08-02 (D467) — and the cause was in a THIRD place nobody had named

**Bean's ruling, which sets the acceptance criterion:** *"don't condition it on the contrast — as I
said it just needs to be accurate to the site's global colours — it's a default, not a magical
setting… this isn't text, it just needs to be discernable clearly which is more like a 2:1."*
So the gate is **palette accuracy**, not a contrast threshold. Recorded because it is the second
time this ruling has been made (see D463) and it should not be re-litigated a third time.

## RESULT — measured, same method as the baseline

**Off-brand focus colours: 4 → 0.** Every focus outline on the homepage now resolves to Mama's own
palette — `#c56a7a` (`primary-dark`) or `#3a2e26` (`text`). **The teal is gone from every element.**

⚠ **The treatment COUNT is still 8, and that is not a failure to hide.** The baseline key includes
width, offset and shadow, which legitimately differ per component (a dot, a button and the skip
link are not meant to be identical). The dimension Bean asked about — colour accuracy to the site's
palette — went from 4 of 8 treatments off-brand to **zero**.

## THE CAUSE WAS THREE-LAYERED — the token repoint ALONE was a no-op

`theme.json` was edited and deployed, and the live page still emitted the teal. Chasing that
properly is the whole lesson:

1. **Not a bad edit** — the deployed `theme.json` on the server carried the new value; a server-wide
   grep found the teal only as a *fallback literal* in `core-blocks.css`.
2. **Not a cache** — 42 transients deleted, object cache flushed, LiteSpeed purged. Teal persisted.
3. **`wp_global_styles` post 7 carried its own `settings.custom.focus-ring`** with the teal, and the
   database beats `theme.json` — as this project's own CLAUDE.md states. Written there by
   `push-theme-snapshot.py`, which pushes the client snapshot's `settings` into that post.
4. **The client snapshots themselves** still carried it —
   `sites/mamas-munches/theme-snapshot.json` and `sites/indus-foods/theme-snapshot.json`.

**⚠ A FALSE NEGATIVE ALMOST CLOSED THIS INVESTIGATION.** The first check for a global-styles
override ran `wp post list --post_type=wp_global_styles` and returned **nothing** — which reads
exactly like "no override exists". `wp post list` defaults to `post_status=publish`-ish filtering
and missed it; re-querying with `--post_status=any` found post 7 immediately. **An absence result
from `wp post list` is not evidence of absence unless the status filter was explicit.**

**D322 was left half-done.** It ruled the focus ring "is not client-specific, so it belongs in the
theme" and migrated it there — but never REMOVED it from the client snapshots, and the snapshot is
the layer that wins. For four months the framework default was dead code. Completing the migration
is the fix: `focus-ring` deleted from both client snapshots and from the live `wp_global_styles`
post, so the palette-derived framework default now governs and adapts per client automatically.

## What is now true

| Layer | State |
|---|---|
| `theme.json:395-400` | palette-derived: `var(--wp--preset--color--primary-dark, …)` + a `color-mix` accent glow, mirroring `--sgs-focus-*` |
| `sites/*/theme-snapshot.json` | `focus-ring` REMOVED from both clients (framework concern, per D322) |
| `wp_global_styles` post 7 (canary) | `focus-ring` REMOVED |
| `cart/style.css` | joined the shared `--sgs-focus-*` family (was the one element in no family at all) |
| `extensions.css` `.sgs-has-focus-ring` | **fixed for free** — it reads the same token, so P1 subsumed P3; that file was never touched |

## STILL OPEN

- **P2 stands REJECTED** — do not delete `*:focus-visible`.
- **The transparent-shadow thread is still unproven.** 7 elements compute
  `box-shadow: oklab(0 0 0 / 0)`, suppressing the glow. Measured, but the writing rule is still
  unidentified; it is in block-scoped CSS lifted to `uploads/sgs-css/`. Find the writer first.
- **`woocommerce.css`'s 27 rules** use a fifth pattern (`--wp--preset--color--primary` direct) and
  were not touched.
- **`indus-foods` snapshot is edited but NOT pushed** — its live site still carries the teal in its
  own `wp_global_styles` until someone runs `push-theme-snapshot.py` against it.

---

# BEAN'S SECOND RULING (2026-08-02) — the outline is ACCENT

*"the focus outline should be accent since it's supposed to be a glow effect and not a dark high
contrast object."*

That supersedes D463's "accent glow over a NEUTRAL underlay" for the outline colour: there is no
dark underlay any more. Applied to BOTH token families at once — repointing only one would have
recreated the exact split just closed.

| Layer | Now |
|---|---|
| `theme.json` `focus-ring.color-primary` | `var(--wp--preset--color--accent, #d8ca50)` |
| `core-blocks-critical.css:108-109` `--sgs-focus-color` / `--sgs-focus-glow` | both `accent` |
| `utilities.css:249` `*:focus-visible` | **token RAISED, rule KEPT** — the council rejected deleting it |
| `core-blocks.css:862` nav close button | joined the shared family |
| `cart/style.css` | joined the shared family |

**Measured: 0 → 15 of 25 focusables on accent. The teal is gone from every element on the page.**

## The remaining 10 — cause PARTLY proven, do not guess the rest

| Cohort | n | Cause |
|---|---|---|
| `a.sgs-responsive-logo__link` + 2 | 3 | **PROVEN**: `.sgs-responsive-logo__link:focus-visible { outline: currentcolor solid 2px }`, in block-scoped CSS lifted to `uploads/sgs-css/` |
| `a.sgs-button` + 6 | 7 | **NOT PROVEN.** Both rules that match it now resolve to accent, yet it computes `#3a2e26`. Something my rule-scan did not catch is winning. **Find the writer before touching it.** |

`sgs/nav-menu` (8 more elements, `style.css:123` `outline: 2px solid currentColor`) was changed,
deployed, measured working — and then **REVERTED**, deliberately. The visual-diff gate requires
`first_paint_capture_passed`, and that capture cannot run cleanly on this block (it renders a second
hidden copy inside the drawer, and the links are in burger mode at the probe's viewport, so the raw
result is `2/4 visible` — a probe-scope artefact, not a defect). Asserting the field on a
construction argument would have been fabricating a gate pass, which this project has a captured
lesson against. The revert was redeployed so live matches source.

**The remaining work is ONE well-defined sweep, not three ad-hoc fixes:** every block-scoped
`:focus-visible` rule using `currentColor` or a hardcoded `primary-dark` should join the shared
`--sgs-focus-*` family. Known sites: `nav-menu/style.css:123`, `responsive-logo` (lifted CSS),
`brand-strip/style.css:459`, `card-grid/style.css:264`, `cta-section/style.css:287`, plus the
unproven `sgs/button` writer. Doing it as one sweep gives one evidence pass instead of six.
