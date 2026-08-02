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
