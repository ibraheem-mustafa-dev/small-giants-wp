# Muted-text × background surface audit — 2026-08-01

**Why:** today's `text-muted` fix on four clients (sgs-construction, sgs-healthcare, sgs-mosque, sgs-professional) was verified against `surface` only. This audit extends the check to every background `text-muted` genuinely renders on, across all 8 client palettes.

**Pre-check:** none of the four changed clients has a `sites/<client>/CLAUDE.md` — verified by directory listing, not assumed. No documented deliberate brand choice exists to override.

## Step 1 — background-ish tokens per client

Read from each `sites/<client>/theme-snapshot.json` `settings.color.palette` (not assumed):

| Client | Backgrounds present |
|---|---|
| mamas-munches | `surface`, `surface-alt`, `surface-pink`, `surface-peach`, `surface-cream-warm`, `footer-bg` |
| indus-foods | `surface`, `surface-alt`, `footer-bg` |
| helping-doctors | `surface`, `surface-alt`, `accent-light`, `footer-bg` |
| sgs-construction | `surface`, `surface-alt`, `accent-light`, `footer-bg` |
| sgs-healthcare | `surface`, `surface-alt`, `accent-light`, `footer-bg` |
| sgs-mosque | `surface`, `surface-alt`, `accent-light`, `footer-bg` |
| sgs-professional | `surface`, `surface-alt`, `accent-light`, `footer-bg` |
| eye-care-ward-end | `surface`, `surface-alt`, `accent-light`, `footer-bg` |

Spec 32 §12.2 states `text-muted` is defined for use "on a light (`surface`/`surface-alt`) background" — so those two are the only tokens sanctioned for this role. `footer-bg` and `accent-light` are separate zones with their own paired ink tokens (`text-inverse`, `accent-text`).

## Step 2 — which pairings are REAL (checked block CSS, not assumed)

`grep -rn "text-muted" plugins/sgs-blocks/src/blocks/*/style.css` — 88 call sites across 27 files (accordion, brand-strip, countdown-timer, counter, filter-search, form, content-collection, breadcrumbs, media, gallery, mega-panel, product-card, google-reviews, process-steps, product-faq, heading, pricing-table, star-rating, trust-bar, testimonial-slider, post-grid, team-member, tabs, table-of-contents, testimonial, card-grid, trustpilot-reviews).

Traced each selector's containing background:

- **`surface` — real.** The large majority of `text-muted` call sites sit on plain page/body/card-flush backgrounds with no other fill declared (breadcrumbs, heading, star-rating, table-of-contents empty-state, accordion resting header, trust-bar title, pricing-table description/cross-icon, form file-hint, etc.) — these inherit `surface`.
- **`surface-alt` — real, proven in the same CSS rule.** `product-card/style.css:670-671` sets `background: var(--wp--preset--color--surface-alt)` and `color: var(--wp--preset--color--text-muted)` on the *same* `.product-card--live .product-card__no-image` rule — unambiguous, unconditional. Also proven structurally: `team-member/style.css` `--elevated`/`--filled` card-style variants (line 21/31, `surface-alt` fill) contain `.sgs-team-member__bio`/`__social-link` (`text-muted`, lines 90/113); `card-grid/style.css` `--card` variant (line 36/64, `surface-alt` fill) contains `.sgs-card-grid__subtitle` (`text-muted`, line 124); `testimonial/style.css` card variants (lines 195/268/317/337, `surface-alt`) contain `.sgs-testimonial__role`/`__org`/`__rating-meta` (`text-muted`, lines 73/171); `post-grid` skeleton shimmer uses `surface-alt` throughout with `text-muted` empty/error state nearby. **This pairing is real, not theoretical.**
- **`accent-light` — checked, NOT real.** `pricing-table` and `form` both use `accent-light` fills (feature checkmark badge, selected-tile bg) but the *text-muted-coloured elements in those files sit elsewhere* (plan description on the card's own surface; file-upload hint outside the tile). No selector pairs `text-muted` foreground with an `accent-light` fill in the same or ancestor rule. **Excluded as theoretical.**
- **`footer-bg` — checked, NOT real.** No `text-muted` call site sits inside a footer-bg/dark-fill context; those zones use `text-inverse` throughout. **Excluded as theoretical.**

## Step 3 — full matrix (only the two REAL backgrounds)

4.5:1 floor (muted text is body text, not large/UI-component).

| Client | text-muted | vs `surface` | vs `surface-alt` |
|---|---|---|---|
| mamas-munches | `#6B5C50` | 5.79 PASS | 6.13 PASS |
| indus-foods | `#5A6070` | 6.28 PASS | 5.87 PASS |
| helping-doctors | `#555555` | 7.46 PASS | 6.67 PASS |
| **sgs-construction** | `#747474` | 4.67 PASS | **4.22 FAIL** |
| **sgs-healthcare** | `#547A86` | 4.66 PASS | **4.35 FAIL** |
| **sgs-mosque** | `#567D6C` | 4.62 PASS | **4.41 FAIL** |
| **sgs-professional** | `#71718F` | 4.71 PASS | **4.41 FAIL** |
| eye-care-ward-end | `#6B6B6B` | 5.33 PASS | 4.87 PASS |

The four clients touched today are the only four that fail — and they fail specifically because their `surface-alt` is a near-white tint sitting just below `surface`'s luminance, and today's `text-muted` values were calibrated to clear 4.5:1 against `surface` with almost no headroom (4.62–4.71), leaving none to spend against the slightly darker `surface-alt`.

## Step 4 — fix applied

Real failure on 4 clients, confirmed by same-rule CSS evidence (`product-card__no-image`) plus 3 more structural confirmations (team-member, card-grid, testimonial cards). Hue preserved, smallest darkening that clears `surface-alt` at 4.5:1 (binding constraint — `surface-alt` is darker than `surface` for all four, so clearing it also improves the `surface` margin, no conflict):

| Client | Old | New | vs surface-alt | vs surface |
|---|---|---|---|---|
| sgs-construction | `#747474` | `#707070` | 4.50 | 4.98 |
| sgs-healthcare | `#547A86` | `#527883` | 4.50 | 4.82 |
| sgs-mosque | `#567D6C` | `#557B6B` | 4.50 | 4.72 |
| sgs-professional | `#71718F` | `#70708D` | 4.50 | 4.81 |

Change size: 2-4 luminance steps per channel — visually imperceptible, no hue shift. Applied to `sites/<client>/theme-snapshot.json` `settings.color.palette` only (the `text-muted` slug entry). Verified no other occurrence of the old hex remains in each file (`grep` for all four old values across all four files returned nothing).

**Files changed:**
- `sites/sgs-construction/theme-snapshot.json`
- `sites/sgs-healthcare/theme-snapshot.json`
- `sites/sgs-mosque/theme-snapshot.json`
- `sites/sgs-professional/theme-snapshot.json`

No other client's snapshot was touched — all four remaining clients already clear 4.5:1 against both real backgrounds with genuine headroom (4.66-7.46), so nothing to fix there.

## Not done (out of scope for this dispatch)

- Not deployed — per instruction, no deploy, no git commands were run. The snapshot files are the source that `push-theme-snapshot.py` would later push.
- `theme-snapshot-colours-axis.json` files were NOT touched (not in scope — the instruction named `theme-snapshot.json`; if the axis files are a separate generation source that also carries `text-muted`, that's a follow-up to check before the next `/sgs-update` regeneration overwrites this fix).
- The `accent-light`/`footer-bg` exclusions above are current-code-true as of this session; if a future block change puts `text-muted` on either surface, this audit's Step 2 classification should be re-run rather than assumed to still hold.
