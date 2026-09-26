# Specs — small-giants-wp

Spec files with status tags. One spec per file.

This is THE spec roster — the `.claude/CLAUDE.md` manifest points here and caches nothing. Do not create a second roster anywhere.

## Specification Standards

Specs are versioned, status-tracked artifacts that document architectural commitments. Each spec carries `doc_type: spec`, a numeric `spec_id`, and a `status` from the enum below.

### Status tags

- `draft` — being written
- `active` — approved, being implemented
- `shipped` — complete
- `complete` — built and verified
- `deferred` — paused, not cancelled
- `cancelled` — abandoned

## Specification Index

| # | File | Subject | Status |
|---|---|---|---|
| 00 | [00-OVERVIEW.md](00-OVERVIEW.md) | Framework overview + philosophy | shipped |
| 00 | [00-naming-conventions.md](00-naming-conventions.md) | Naming rules + CI linter | shipped |
| 01 | [01-SGS-THEME.md](01-SGS-THEME.md) | Block theme (theme.json v3, templates, fonts) | shipped |
| 02 | [02-SGS-BLOCKS.md](02-SGS-BLOCKS.md) | Block specifications + customisation standards, including the variation + style registration pattern | active |
| 02 | [02-SGS-BLOCKS-REFERENCE.md](02-SGS-BLOCKS-REFERENCE.md) | Auto-generated per-block attribute reference. Gitignored: generated locally by `/sgs-update`, never hand-edited — fix the generator instead | active |
| 03 | [03-SGS-BOOKING.md](03-SGS-BOOKING.md) | Booking plugin | deferred |
| 04 | [04-SGS-FORMS.md](04-SGS-FORMS.md) | Forms (built into sgs-blocks) | shipped |
| 05 | [05-SGS-CLIENT-NOTES.md](05-SGS-CLIENT-NOTES.md) | Visual annotation system | deferred |
| 07 | [07-SGS-POPUPS.md](07-SGS-POPUPS.md) | Conversion pop-ups plugin | deferred |
| 08 | [08-SGS-CHATBOT.md](08-SGS-CHATBOT.md) | Live chat + AI chatbot | deferred |
| 09 | [09-GOLD-STANDARD-AUDIT.md](../../reports/reference/09-GOLD-STANDARD-AUDIT.md) | Per-block competitor gap analysis | active |
| 10 | [10-COMPETITOR-RESEARCH.md](../../reports/10-COMPETITOR-RESEARCH.md) | Spectra / Kadence / GenerateBlocks research | shipped |
| 11 | [11-SGS-BUTTON-ARCHITECTURE.md](11-SGS-BUTTON-ARCHITECTURE.md) | `sgs/button` + `sgs/multi-button` canonical architecture | shipped |
| 18 | [18-SGS-FLOATING-UI.md](18-SGS-FLOATING-UI.md) | Back to Top + Reading Progress | shipped |
| 19 | [19-SGS-CLI-COMMANDS.md](19-SGS-CLI-COMMANDS.md) | `wp sgs` command tree | shipped |
| 20 | [20-CLONE-FIDELITY-MEASUREMENT.md](20-CLONE-FIDELITY-MEASUREMENT.md) | Clone fidelity measurement: the computed-parity tool, pipeline Stage 11.6 and rule 4a. The canonical rendered-fidelity signal | shipped |
| 26 | [26-SGS-GLOBAL-STYLES-AND-THEMING.md](26-SGS-GLOBAL-STYLES-AND-THEMING.md) | Global styles + per-client theming (variation-delta + `wp_global_styles` REST sync) + pipeline style derivation | draft |
| 27 | [27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md](27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md) | MASTER — SGS product + WooCommerce layer (CPT, collection, cart, dual-mode card, option-picker, configurator) | active |
| 28 | [28-SGS-SMART-BULK-PRICING.md](28-SGS-SMART-BULK-PRICING.md) | Smart bulk pricing / comparative value-ladder | complete |
| 30 | [30-SGS-WOOCOMMERCE-PAGE-TYPES.md](30-SGS-WOOCOMMERCE-PAGE-TYPES.md) | WC page types — single-product/archive/cart/checkout templates, SGS search + searchable filter, option-picker WC binding, schema; customer account area and saved-item alerts (FR-30-14/15) open | active |
| 31 | [31-UNIVERSAL-CLONING-PIPELINE.md](31-UNIVERSAL-CLONING-PIPELINE.md) | **THE cloning pipeline blueprint** — DB-driven name-free routing engine, the modular `converter/` engine, binding rules R-31-1..15. Read §0 + §12 first | active |
| 32 | [32-COMPONENT-STYLING-TOKEN-CONTRACT.md](32-COMPONENT-STYLING-TOKEN-CONTRACT.md) | **Framework-wide styling contract** — semantic BEM classes consume per-client design tokens (`settings.custom.{component}Presets` → WP CSS vars); no inline property declarations; overrides via CSS custom-property values only. Owns styling/token EMISSION; read with Spec 35 | active |
| 33 | [33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md](33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md) | **Draft global-styles / token extractor** — the opening step of the cloning pipeline: measures the draft's rendered computed styles → `sites/<client>/theme-snapshot.json`, which the converter's token-snap depends on. Part 1 (13/13 FRs) built. Part 2 = draft header/footer → `sgs/site-header`/`sgs/site-footer`/`sgs/nav-bar-menu` + `sgs/nav-drawer-menu` + `sgs/nav-drawer`, NOT started | complete (Part 1) |
| 35 | [35-BLOCK-INSPECTOR-UX-STANDARD.md](35-BLOCK-INSPECTOR-UX-STANDARD.md) | SGS block inspector-UX standard — layout and grouping, control completeness, feature parity, responsive UX (D1-D5), accessibility, and the Part O control-type contract (THE PLACEMENT RULE, THE ELEMENT MANIFEST, control types §1-§14). Owns inspector-UX; read with Spec 32 and its sub-spec 35A. Current completion state is single-sourced to `.claude/LEDGER.md` | active |
| 35A | [35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md](35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md) | Sub-spec of Spec 35 — anti-pattern fail-list (Part F), native-mechanism verdicts (Part G), component reference and action layer (Parts H-I), roadmap, rollout gates and per-block definition-of-done (Parts J-L), implementation status (Part M), role data layer (Part N), and the Part O enforcement layers (O.15, O.16), carried obligations (CO-n) and cross-cutting rules. Read with Spec 35 | active |
| 36 | [36-SGS-NAVIGATION-SYSTEM.md](36-SGS-NAVIGATION-SYSTEM.md) (v2.8) | **THE canonical SGS Navigation System** — nav bar (`sgs/nav-bar-menu`), mega CPT, off-canvas drawer (`sgs/nav-drawer-menu` + `sgs/nav-drawer`, `sgs_drawer` CPT) and utility pieces (cart/search/social/logo/business-info); classic-menu primary; WCAG 2.1 AA; crawlable; converter-emittable | active |
| 37 | [37-HEADER-FOOTER-BUILDER.md](37-HEADER-FOOTER-BUILDER.md) (v1.5.0) | SGS Header/Footer Builder — CPT editing home (header, footer, drawer, mega), container blocks, behaviours, binding | active |
| 38 | [38-SGS-MOTION-SYSTEM.md](38-SGS-MOTION-SYSTEM.md) | SGS Motion System — the four-tier motion doctrine (Tier V vanilla default / Tier G GSAP / Tier H helper / Tier W rendering substrate), the Tier G effect roster, the `data-sgs-fx-*` cloning grammar, and the flowing-gradient and surface-treatment effects | active |
| 40 | [40-GENERATIVE-COVER-IMAGES.md](40-GENERATIVE-COVER-IMAGES.md) | Generative cover images — deterministic, brand-coloured artwork generated OFFLINE and cached as real files, for blog headers / section backgrounds / OG share images / product cards. Scope only (v0.1.0); a build gate at §5 blocks implementation until an approved reference exists. Not motion and not the generative-background effect (Spec 38); §0 carries the disambiguation table | draft |
| 41 | [41-NAV-MENU-COLOUR-STATE-SYSTEM.md](41-NAV-MENU-COLOUR-STATE-SYSTEM.md) (v0.5.0) | `sgs/nav-bar-menu` + `sgs/nav-drawer-menu` colour, state + control system: three colour states (Normal / Hover / current), one colour picker per element property, one universal hover-treatment selector, the item border, the submenu colour + typography split, the "Menu Button" panel. Satisfies Spec 36 FR-36-4 and the colour half of FR-36-11. Read with Spec 36 and Spec 35 | active |
| 42 | [42-SGS-FORM-CPT-AND-PRICING.md](42-SGS-FORM-CPT-AND-PRICING.md) (v2.1.0) | `sgs_form` CPT (slug-keyed identity), the `requireLogin` fix (FR-42-0), the reference-lifecycle contract shared with Spec 43, and the cloning-pipeline CPT-creation gap (FR-42-10). Pricing content lives in Spec 43 | active |
| 43 | [43-SGS-CHOICE-FLOW.md](43-SGS-CHOICE-FLOW.md) (v1.8.0) | `sgs/choice-flow` — the step-wizard block family for qualification quizzes, priced configurators and WooCommerce option-picking; branching via `nextStepMap`; purchase endings reuse Spec 27's add-to-cart proxy; the `sgs_choice_flow` CPT owns a flow's content and look and is shown by a linked block or a product's buybox (FR-43-6, FR-43-25); add-on price list (FR-43-17 to 20); answers and fields on the bag line (FR-43-21); product-option steps over any attribute (FR-43-10); email ending (FR-43-4); compact and showcase layouts (FR-43-24); guided buybox (FR-43-23). Phases 0-4 and the v1.8.0 follow-up built; its closing QA and Phase 5 open | active |
| 44 | [44-CLASSLESS-REPEATER-RECOGNITION.md](44-CLASSLESS-REPEATER-RECOGNITION.md) (v2.4.0) | Classless repeater recognition — Stage A + Stage B (within-page repeated content) recognise repeated structures in class-less drafts and route them to blocks, behind `--classless-match` / `--classless-auto-complete` (both off by default). The AI-fallback tier (§11) is parked | active (built) |
| 45 | [45-CLASSLESS-FIELD-RESOLUTION.md](45-CLASSLESS-FIELD-RESOLUTION.md) (v1.6.0) | Classless field-mapping resolver — maps each JS-object field of a parent block already resolved by Spec 44 (or by Tier 4's own classifier for one-off content) to the correct block attribute / array-item field / nested child block, in four tiers. All four tiers built | active (built) |

## Not a live spec

| Number | Cite instead |
|---|---|
| 06 | — |
| 13 | — |
| 15 | 31, 00-naming-conventions |
| 16 | 31 |
| 17 | 37, 36 |
| 21 | 20 |
| 22 | 31 §13 |
| 24 | — |
| 25 | 27, 30 |
| 29 | 31 §13.6 |
| 34 | 36 |
| 39 | — |

## Working specs / research artefacts (not numbered)

| File | Purpose | Status |
|---|---|---|
| [common-wp-styling-errors.md](common-wp-styling-errors.md) | Recurring WP styling mistakes catalogue | active |
| [go-live-checklist.md](go-live-checklist.md) | Pre-launch WooCommerce gate per Spec 30 §FR-30-13 — run once per client before real payments | active |

## Sub-directories

- [design-brain/](design-brain/) — design-brain rubrics + optimisation-toolkit references
