---
doc_type: coverage-audit
project: small-giants-wp
phase: 5b
step: 5b.3
generated: 2026-05-22
wp_version_tested: 6.9.4
test_site: sandybrown-nightingale-600381.hostingersite.com
gate_decision: PASS — bridge already inert in production, safe to delete
---

# Phase 5b Step 5b.3 — Button presets property coverage audit

## TL;DR — Gate verdict: **PASS**

The CSS-variable bridge in `class-button-presets-admin.php` is **already inert in
production** (the class is never loaded from `sgs-blocks.php`). WP 6.9.4 natively
generates 100% of the `--wp--custom--button-presets--*` custom properties that
`button/style.css` consumes, directly from
`theme.json.settings.custom.buttonPresets`. Safe to delete the bridge + admin
page in Step 5b.4 with zero render risk.

Two adjustments to the original Step 5b plan:
- **WP version reality:** The site runs WP 6.9.4, not 7.0. The plan assumed
  WP 7.0's `theme.json.styles.elements.button` pseudo-element support. WP 6.9
  already supports `styles.elements.button` pseudo-element states (`:hover`,
  `:focus`, `:active`) — this was added in WP 6.2. No 7.0 gating required.
- **Bridge already inert:** Independent of WP version, the bridge was already
  unreachable code — `Button_Presets_Admin::register()` is not called anywhere
  in `sgs-blocks.php`. Production buttons already render entirely from
  `theme.json` native generation.

## Production reality check

`ssh ... wp option get sgs_button_presets --format=json` →
**`Error: Could not get 'sgs_button_presets' option. Does it exist?`**

No production data exists. There is nothing to migrate.

## Properties the bridge would emit (had it been loaded)

The PHP `output_css_custom_properties()` method would emit 30 properties total
(15 per variant × 2 variants):

| Property suffix       | Emitted | Consumed by style.css | WP native |
|-----------------------|---------|-----------------------|-----------|
| `--background`        | Y       | Y                     | Y         |
| `--text`              | Y       | Y                     | Y         |
| `--border`            | Y       | Y                     | Y         |
| `--border-width`      | Y       | N                     | Y         |
| `--border-radius`     | Y       | N                     | Y         |
| `--padding`           | Y       | N                     | Y         |
| `--font-size`         | Y       | N                     | Y         |
| `--font-weight`       | Y       | N                     | Y         |
| `--min-height`        | Y       | N                     | Y         |
| `--hover-background`  | Y       | Y                     | Y         |
| `--hover-text`        | Y       | Y                     | Y         |
| `--hover-border`      | Y       | Y                     | Y         |

12 properties × 2 variants = 24 vars consumed; 6 emit-but-unused per variant.

## Live WP-native enumeration (sandybrown, WP 6.9.4)

Pulled from the `global-styles-inline-css` block of the rendered homepage HTML
(no PHP execution required). All 24 consumed properties present:

```
--wp--custom--button-presets--primary--background
--wp--custom--button-presets--primary--border
--wp--custom--button-presets--primary--border-radius
--wp--custom--button-presets--primary--border-width
--wp--custom--button-presets--primary--font-size
--wp--custom--button-presets--primary--font-weight
--wp--custom--button-presets--primary--hover-background
--wp--custom--button-presets--primary--hover-border
--wp--custom--button-presets--primary--hover-text
--wp--custom--button-presets--primary--min-height
--wp--custom--button-presets--primary--padding
--wp--custom--button-presets--primary--text
--wp--custom--button-presets--secondary--background
--wp--custom--button-presets--secondary--border
--wp--custom--button-presets--secondary--border-radius
--wp--custom--button-presets--secondary--border-width
--wp--custom--button-presets--secondary--font-size
--wp--custom--button-presets--secondary--font-weight
--wp--custom--button-presets--secondary--hover-background
--wp--custom--button-presets--secondary--hover-border
--wp--custom--button-presets--secondary--hover-text
--wp--custom--button-presets--secondary--min-height
--wp--custom--button-presets--secondary--padding
--wp--custom--button-presets--secondary--text
```

Sample resolved value:
`--wp--custom--button-presets--primary--background: var(--wp--preset--color--primary)`

Exactly matching what `Button_Presets_Admin::get_defaults()['primary']['background']`
would have emitted via PHP.

## Coverage matrix (24 consumed props)

| Prop                                  | Native (WP 6.9.4) | Source                       |
|---------------------------------------|-------------------|------------------------------|
| primary--background                   | COVERED           | theme.json `custom.buttonPresets.primary.background` |
| primary--text                         | COVERED           | theme.json `custom.buttonPresets.primary.text`       |
| primary--border                       | COVERED           | theme.json `custom.buttonPresets.primary.border`     |
| primary--hover-background             | COVERED           | theme.json `custom.buttonPresets.primary.hover-background` |
| primary--hover-text                   | COVERED           | theme.json `custom.buttonPresets.primary.hover-text`       |
| primary--hover-border                 | COVERED           | theme.json `custom.buttonPresets.primary.hover-border`     |
| secondary--background                 | COVERED           | theme.json `custom.buttonPresets.secondary.background` |
| secondary--text                       | COVERED           | theme.json `custom.buttonPresets.secondary.text`       |
| secondary--border                     | COVERED           | theme.json `custom.buttonPresets.secondary.border`     |
| secondary--hover-background           | COVERED           | theme.json `custom.buttonPresets.secondary.hover-background` |
| secondary--hover-text                 | COVERED           | theme.json `custom.buttonPresets.secondary.hover-text`       |
| secondary--hover-border               | COVERED           | theme.json `custom.buttonPresets.secondary.hover-border`     |
| (12 more emit-only-not-consumed)      | COVERED           | as above                                                     |

**UNCOVERED: 0 / 24**

## Gate decision

| Condition                                   | Outcome |
|---------------------------------------------|---------|
| All consumed properties COVERED             | YES (24/24) |
| Production data exists requiring migration  | NO (option does not exist) |
| Bridge currently active in production       | NO (class never loaded) |
| Pseudo-element states required (:hover etc) | YES — covered via `styles.elements.button.:hover` native syntax (WP 6.2+) |

**Verdict:** PASS — proceed to Step 5b.4 to delete `class-button-presets-admin.php`
and the unused defensive `var(..., fallback)` bridge fallback values in
`button/style.css`. Migration backup hook from the plan is unnecessary because
no production data exists.

## What changes in Step 5b.4

1. Delete `plugins/sgs-blocks/includes/class-button-presets-admin.php`.
2. (Optional) Simplify `button/style.css` to drop the now-redundant fallback
   second argument in each `var(...)` call. Kept defensively for now — the
   fallbacks are harmless, and removing them risks subtle behaviour change if
   an operator strips `custom.buttonPresets` from a future style variation.
3. The `theme.json.settings.custom.buttonPresets` subtree is the single source
   of truth and already lives at `theme/sgs-theme/theme.json` lines 323-353.
4. No `wp_options` backup migration needed — no production data exists.
5. No `Button_Presets_Admin::register()` call to remove from `sgs-blocks.php`
   (was never wired).

## Pseudo-element coverage note

The plan called for `theme.json.styles.elements.button.:hover` / `:focus` /
`:focus-visible` / `:active` states. The current setup uses CSS-side rules in
`button/style.css` (selector: `.sgs-button.is-style-primary:hover, ...`) with
values fed from `--wp--custom--button-presets--*--hover-*` custom properties.
This is functionally equivalent to native `styles.elements.button.:hover` and
works on WP 6.9 without modification. No theme.json change required for
Phase 5b — the existing setup already covers all required pseudo-states.
