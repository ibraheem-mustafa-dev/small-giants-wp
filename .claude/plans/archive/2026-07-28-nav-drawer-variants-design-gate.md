> ARCHIVED 2026-07-28 — in-file status: BUILT (2026-07-28, D403) — shipped at faa14924, one residual PARKED (parked residuals do not keep a plan live).

---
doc_type: plan
project: small-giants-wp
title: sgs/nav-drawer desktop variants — Bean-approved attribute shape (design gate)
date: 2026-07-28
status: APPROVED (Bean, 2026-07-28, in-session — both sign-off questions; scope = ALL 7 variants)
spec: 36-SGS-NAVIGATION-SYSTEM.md FR-36-6 (drawer desktop variants)
evidence: .claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md (Task-1 append) +
  .claude/reports/2026-07-28-drawer-code-extraction/ (15 per-site JSON + DIFF-ANALYSIS.md)
---

> **BUILT (2026-07-28, same day as approval, D403).** Shipped at `faa14924` — 7 nav-drawer
> `variantPreset` variations + `nav-menu.listColumns`. `variantPreset` enum + F6 baseline
> landed at `64f5080e` to unblock main's prebuild. **One residual left OPEN, tracked at
> `.claude/parking.md` → `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS`:** 6 of 7 variants have
> EMPTY structural discriminator signatures, so `detect_variant` cannot yet tell them apart from
> extracted CSS — owned by Track 2 / Spec 36, not this gate. This annotation is additive; the
> approved shape below is unchanged.

# Approved shape — build from THIS, not from the superseded 4-variant geometry taxonomy

**Bean's binding variant principle:** a variant is a complete-clone preset — it sets DEFAULTS
(geometry, panel treatment, menu look, child-block roster) and hardcodes NOTHING. Every value
stays editable after selection; children deletable; any block insertable. (His lamalama example:
columns defaults to 2, remains a normal setting.)

## 1. Variants = `registerBlockVariation` on `sgs/nav-drawer` — 7, one per reference design

Descriptive names (never studio names; provenance in `_note`): the 7 buildable looks from the
extraction (floating capped card · anchored card-stack · editorial ghost list · centred statement ·
solid-brand light · two-column editorial · split-zone serif). resn's WebGL menu = reference-only,
NOT built. Each variation seeds: drawer geometry defaults + surface + closeStyle + a pre-configured
`sgs/nav-menu` child (type scale / columns / alignment per the extracted values) + that look's
child-block roster (promo cards, newsletter form, socials, tertiary rows…). Declare in
`supports.sgs.variants` + seed `blocks.variant_attr`/`variant_slots` via `/sgs-update` (FR-31-20).

## 2. New/changed attributes on `sgs/nav-drawer` (all per-device where stated, via ResponsiveControl)

| Attr | Shape | Default | Notes |
|---|---|---|---|
| `anchor` | object `{desktop,tablet,mobile}`, values `full-screen` \| `header` \| `trigger` \| `centred` | `{}` → full-screen every tier | Per-device by construction (the lusion case = trigger desktop + full-screen mobile). `header` DERIVES width+edges from the header — never a hardcoded px. `centred` = Bean's pause-menu card (no reference site; reuses `sgs/modal`'s geometry model: width + `max-width:calc(100vw−2rem)`). |
| `panelSize` | responsive object (length) | `{}` | Consulted by `trigger`/`centred` only; `header` derives; `full-screen` ignores. |
| `surface` | object `{opacity (0–1), blur (px)}` or two flat attrs | opaque, no blur | Approved: opaque AND translucent ship. NO separate scrim element (8/8 sites have none) — fill/blur live on the panel itself. WCAG-computed foreground stays. |
| `closeStyle` | string `separate-x` \| `text-swap` \| `burger-morph` | `separate-x` | Data split ~evenly 3 ways. × remains undeletable chrome in all styles. |
| `edge`, `width` | **RETIRED** | — | Superseded by `anchor`+`panelSize`. Zero stored instances carry them (verified); pre-production, no deprecations (D270). `animateFrom` folds into per-anchor defaults, `fade` stays as explicit override. |

## 3. New on `sgs/nav-menu` (child-owned, HC2)

`listColumns` — responsive object, in-drawer vertical mode only (studionamma's 2→1 merge). Type
scale/alignment already exist via shared TypographyControls + attrs; variants preset them.

## 4. Existing machinery reused — no new build

Per-device content drops/swaps (4/7 sites) → the BUILT Responsive-Visibility extension on child
blocks. Contrast → existing WCAG resolver. Gap/padding already responsive objects.

## 5. Constraints (binding on the build)

- Back-compat: 16 stored zero-attribute drawers render BYTE-IDENTICAL with all defaults.
- ⛔ STOP-DIALOG-DISPLAY-GATE (D338): per-device anchor geometry NEVER sets `display` on the base
  `.wp-block-sgs-nav-drawer` rule — tiers change inset/width/height/position only, via `@media`
  in the scoped `<style>`/style.css.
- `<dialog showModal>` stays THE mechanism at every anchor (a11y > all 8 references). Honest
  constraint: click-through/live backgrounds are NOT replicable under showModal; backdrop-click-to-
  close (Task 4, `store('sgs/nav')`) is the substitute for the compact anchors.
- Escaping: every colour via `sgs_colour_value()`; lengths via the length regex; breakout guard
  `sgs_css_value_has_breakout()`; no raw attr into the scoped `<style>` (CF-2 standard).
- No top-level functions in render.php (D374); helpers `function_exists`-guarded in `includes/`.
- No version bumps / deprecations (D270/D293). Variations in the block's own index.js; if any
  theme pattern files are added instead, bump theme `style.css` Version (pattern cache).
- Out of scope, recorded: resn WebGL; buck palette-rotation (single colour default); dogstudio
  01–05 index numbers (optional follow-on nav-menu marker).

## 6. POC content-fidelity rule (Bean, 2026-07-28 — added mid-build, binds Task-5 verification)

**At the POC stage each variant is verified as an EXACT clone of its reference site INCLUDING
content** — the real link labels (via a dedicated classic menu per fixture), the real secondary
text, the same item counts — so that any visual difference between our variant and the reference
is attributable to the BLOCK's capabilities, never to content drift. Concretely: 7 canary fixture
pages, one per variant, each bound to a classic menu carrying the reference's exact labels, with
seeded secondary blocks carrying the reference's actual copy. **Genericising the seeded content
(and stripping any reference copy) is a PRE-PRODUCTION step, recorded here so it is not
forgotten — never a POC step.** Comparison = same-content side-by-side per site × viewport.
