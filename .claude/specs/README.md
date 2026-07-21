# Specs — small-giants-wp

Spec files with status tags. One spec per file.

**Last reviewed:** 2026-06-07

## Specification Standards

Specs are versioned, status-tracked artifacts that document architectural commitments. Each spec carries `doc_type: spec`, a numeric `spec_id`, and a `status` from the enum below. Retired specs move to `.claude/specs/archive/`.

### Status tags

- `draft` — being written
- `active` — approved, being implemented
- `shipped` — complete
- `deferred` — paused, not cancelled
- `cancelled` — abandoned
- `retired` — superseded by a newer spec; moved to archive/

## Specification Index

| # | File | Subject | Status |
|---|---|---|---|
| 00 | [00-OVERVIEW.md](00-OVERVIEW.md) | Framework overview + philosophy | shipped |
| 00 | [00-naming-conventions.md](00-naming-conventions.md) | Naming rules + CI linter | shipped |
| 01 | [01-SGS-THEME.md](01-SGS-THEME.md) | Block theme (theme.json v3, templates, fonts) | shipped |
| 02 | [02-SGS-BLOCKS.md](02-SGS-BLOCKS.md) | Block specifications + customisation standards (includes Phase 1.5 variation+style registration pattern) | active |
| 02 | [02-SGS-BLOCKS-REFERENCE.md](02-SGS-BLOCKS-REFERENCE.md) | Auto-generated per-block attribute reference (regen via `/sgs-update`) | active |
| 03 | [03-SGS-BOOKING.md](03-SGS-BOOKING.md) | Booking plugin | deferred |
| 04 | [04-SGS-FORMS.md](04-SGS-FORMS.md) | Forms (built into sgs-blocks) | shipped |
| 05 | [05-SGS-CLIENT-NOTES.md](05-SGS-CLIENT-NOTES.md) | Visual annotation system | deferred |
| 06 | [06-BUILD-ORDER.md](06-BUILD-ORDER.md) | Dependencies + phasing | shipped |
| 07 | [07-SGS-POPUPS.md](07-SGS-POPUPS.md) | Conversion pop-ups plugin | deferred |
| 08 | [08-SGS-CHATBOT.md](08-SGS-CHATBOT.md) | Live chat + AI chatbot | deferred |
| 09 | [09-GOLD-STANDARD-AUDIT.md](../../reports/reference/09-GOLD-STANDARD-AUDIT.md) | Per-block competitor gap analysis | active |
| 10 | [10-COMPETITOR-RESEARCH.md](../../reports/10-COMPETITOR-RESEARCH.md) | Spectra / Kadence / GenerateBlocks research | shipped |
| 11 | [11-SGS-BUTTON-ARCHITECTURE.md](11-SGS-BUTTON-ARCHITECTURE.md) | sgs/button + sgs/multi-button canonical (includes 2026-05-22 double-default fix) | shipped |
| 17 | ~~17-HEADER-FOOTER-ARCHITECTURE.md~~ | **DELETED 2026-07-21** — superseded by **Spec 37** (Header/Footer Builder); Site-Info store + nav FRs folded into **Spec 36**. | DELETED → 37 |
| 18 | [18-SGS-FLOATING-UI.md](18-SGS-FLOATING-UI.md) | Back to Top + Reading Progress | shipped |
| 19 | [19-SGS-CLI-COMMANDS.md](19-SGS-CLI-COMMANDS.md) | `wp sgs` command tree (includes Phase 1 DB seed) | shipped |
| 20 | [20-CLONE-FIDELITY-MEASUREMENT.md](20-CLONE-FIDELITY-MEASUREMENT.md) | Clone fidelity measurement (computed-parity tool + Stage 11.6 + rule 4a) — the canonical rendered-fidelity signal (D259). Replaced the old Spec 20 (log surfacing) + Spec 21 (artefact inventory), archived to `../memory/specs-archive/`. | shipped |
| 21 | _(retired — archived to `../memory/specs-archive/21-PIPELINE-STATE-ARTEFACTS.md`; superseded by Spec 20 — input-side artefacts are debug-only, not the fidelity signal)_ | — | archived |
| 22 | _(absorbed into Spec 31 §13 + archived, D253 — see row 31)_ | — | archived |
| 26 | [26-SGS-GLOBAL-STYLES-AND-THEMING.md](26-SGS-GLOBAL-STYLES-AND-THEMING.md) | Global styles + per-client theming (variation-delta + wp_global_styles REST sync) + pipeline style derivation (build deferred) | draft |
| 27 | [27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md](27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md) | MASTER — SGS product + WooCommerce layer (CPT, collection, cart, dual-mode card, option-picker, configurator) | active |
| 28 | [28-SGS-SMART-BULK-PRICING.md](28-SGS-SMART-BULK-PRICING.md) | Smart bulk pricing / comparative value-ladder | active |
| 29 | [29-CONTAINER-EQUIVALENT-BLOCKS.md](29-CONTAINER-EQUIVALENT-BLOCKS.md) | Container-equivalent blocks reference — 3-KIND map, mirror roster, shared helper | active |
| 30 | [30-SGS-WOOCOMMERCE-PAGE-TYPES.md](30-SGS-WOOCOMMERCE-PAGE-TYPES.md) | WC page types — single-product/archive/cart/checkout templates, SGS search + searchable filter, option-picker WC binding, schema | complete (D220) |
| 31 | [31-UNIVERSAL-CLONING-PIPELINE.md](31-UNIVERSAL-CLONING-PIPELINE.md) | **THE cloning CSS-transfer rebuild blueprint** — DB-driven name-free routing engine; read §0 + §12 first. Foundation (Phase F) COMPLETE; stage-by-stage modular rebuild next. | active |
| 32 | [32-COMPONENT-STYLING-TOKEN-CONTRACT.md](32-COMPONENT-STYLING-TOKEN-CONTRACT.md) | **Framework-wide styling contract** — semantic BEM classes consume per-client design tokens (settings.custom.{component}Presets → WP CSS vars); NO inline property declarations, overrides via CSS custom-property values only. Restores + generalises Spec 11 D24; supersedes the D283 inline-attr styling model. Button = reference impl. | active |

| 33 | [33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md](33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md) | **Draft global-styles / token extractor** — the OPENING step of the cloning pipeline (runs before Stage 0): measures the draft's rendered computed styles → `sites/<client>/theme-snapshot.json`, which the converter's token-snap depends on (FR-33-12 fails closed if stale). Part 1 COMPLETE (13/13 FRs); **Part 2 = draft header/footer → `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav`, NOT started.** | complete (Part 1) |

| 34 | ~~34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md~~ | **DELETED 2026-07-19 (P2.5 Phase 6 purge)** — nav is fully specified in **Spec 36** (the single canonical nav home). Its drawer a11y contract + `elementFromPoint` sweep methodology (10/10 Mama's / 18/18 Indus) + per-device drawer settings were carried verbatim into Spec 36 FR-36-6/-14/-16 before deletion. | DELETED → 36 |
| 35 | [35-BLOCK-INSPECTOR-UX-STANDARD.md](35-BLOCK-INSPECTOR-UX-STANDARD.md) | SGS block inspector-UX + block standards (no-inline / dynamic / feature-parity / shrink-to-fit; Part L controls + Part G native mechanisms). | active |
| 36 | [36-SGS-NAVIGATION-SYSTEM.md](36-SGS-NAVIGATION-SYSTEM.md) | **THE canonical SGS Navigation System** (SIGNED-OFF v2.1, 2026-07-19) — nav bar + mega CPT + off-canvas drawer + utility pieces (cart/search/social/logo/business-info); classic-menu primary; WCAG 2.1 AA; crawlable; converter-emittable. Single home — absorbed Spec 34 + Spec 17 §S9 nav FRs (Spec 17 now deleted, see Spec 37 for its header-side successor) + Spec 02 §23. | active (build next) |

## Architecture programme (2026-05-21+) — archived

The 31-decision architecture programme (`.claude/plans/archive/2026-05-21-architecture-staging.md`) **SHIPPED 2026-05-22** — all phases complete. Active work is now the cloning pipeline programme; see **Spec 31** (Spec 22 was absorbed into it at §13 and archived, D253) + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md` (archived).

## Working specs / research artefacts (not numbered)

| File | Purpose | Status |
|---|---|---|
| [common-wp-styling-errors.md](common-wp-styling-errors.md) | Recurring WP styling mistakes catalogue — actively maintained | active |
| [chrome-devtools-stage-8-integration.md](../plans/strategy/chrome-devtools-stage-8-integration.md) | Stage 8 / Chrome DevTools spec | research |
| [cloning-skill-salvage-matrix-2026-05-05.md](../plans/archive/cloning-skill-salvage-matrix-2026-05-05.md) | Clone-skill audit matrix (referenced by architecture.md) | archived |
| [pattern-dedup-classify-mechanics-2026-05-05.md](../plans/archive/pattern-dedup-classify-mechanics-2026-05-05.md) | Pattern dedup mechanics (referenced by architecture.md) | archived |
| hostinger-mcp-catalogue.md | Hostinger MCP integration catalogue — moved to `~/.claude/specs/hostinger-mcp-catalogue.md` | relocated |
| 2026-04-16-local-code-review-architecture.md | Local code-review brainstorm — moved to `~/.claude/specs/2026-04-16-local-code-review-architecture.md` | relocated |
| 2026-04-27-optimisation-toolkit-design.md | Optimisation toolkit design — moved to `~/.claude/specs/2026-04-27-optimisation-toolkit-design.md` | relocated |
| 2026-04-29-wp-studio-ai-manual.md | WP Studio AI integration manual — moved to `~/.claude/skills/wp-studio/wp-studio-ai-manual.md` | relocated |
| RESEARCH-PROMPT.md | Reusable research prompt template — deleted (generic utility, no project-specific content) | deleted |

## Legacy specs

Files prefixed `legacy-` are historical reference for systems substantively replaced. All four have been moved to `.claude/plans/archive/`:

- [`legacy-2026-03-17-header-system-design.md`](../plans/archive/legacy-2026-03-17-header-system-design.md) — superseded by Spec 17 (now Spec 37)
- [`legacy-2026-03-25-mobile-nav-attributes.md`](../plans/archive/legacy-2026-03-25-mobile-nav-attributes.md) — superseded by Spec 17 mobile-nav work (now Spec 36)
- [`legacy-2026-03-27-mobile-nav-v2-composition.md`](../plans/archive/legacy-2026-03-27-mobile-nav-v2-composition.md) — same
- [`legacy-2026-03-27-wp7-nav-overlay-compat.md`](../plans/archive/legacy-2026-03-27-wp7-nav-overlay-compat.md) — same

## Sub-directories

- [design-brain/](design-brain/) — design-brain rubrics + optimisation-toolkit references
