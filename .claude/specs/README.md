# Specs — small-giants-wp

Spec files with status tags. One spec per file.

**Last reviewed:** 2026-05-26 (Spec 22 ratification + Spec 16 archival).

## Specification Standards

Specs are versioned, status-tracked artifacts that document architectural commitments. Each spec carries `doc_type: spec`, a numeric `spec_id`, and a `status` from the enum below. Specs supersede each other via the `supersedes` / `retired_by` frontmatter fields (see Spec 22 retiring Spec 16 2026-05-26 as the canonical example). Retired specs move to `.claude/specs/archive/` with retirement headers preserved for git-blame continuity.

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
| 15 | (absorbed into Spec 16 2026-05-12, then absorbed-chain retired with Spec 16 2026-05-26) | Deterministic converter Spec 15 | absorbed → retired |
| 16 | [archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md](archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md) | Slot-aware DOM walker (RETIRED — superseded by Spec 22 2026-05-26) | retired |
| 17 | [17-HEADER-FOOTER-ARCHITECTURE.md](17-HEADER-FOOTER-ARCHITECTURE.md) | Header/footer infrastructure | shipped |
| 18 | [18-SGS-FLOATING-UI.md](18-SGS-FLOATING-UI.md) | Back to Top + Reading Progress | shipped |
| 19 | [19-SGS-CLI-COMMANDS.md](19-SGS-CLI-COMMANDS.md) | `wp sgs` command tree (includes Phase 1 DB seed) | shipped |
| 20 | [20-STRUCTURED-PIPELINE-LOG-SURFACING.md](20-STRUCTURED-PIPELINE-LOG-SURFACING.md) | Per-severity sidecar logs | shipped |
| 21 | [21-PIPELINE-STATE-ARTEFACTS.md](21-PIPELINE-STATE-ARTEFACTS.md) | Pipeline-state debug artefacts catalogue | active |
| 22 | [22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md](22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md) | SGS Cloning Pipeline — Universal Block-Equivalent Extraction (CANONICAL; supersedes Spec 16 2026-05-26) | active |
| 24 | [24-QUERY-DRIVEN-CONTENT-CARDS.md](24-QUERY-DRIVEN-CONTENT-CARDS.md) | Query-driven content cards (CPT + Query Loop + Block Bindings; product-card dual-mode) | active |
| 25 | [25-SGS-WOOCOMMERCE-EXPERIENCE-LAYER.md](25-SGS-WOOCOMMERCE-EXPERIENCE-LAYER.md) | Authoritative SGS WooCommerce-wrapper layer (product-card / cart / collection / option-picker / bindings / add-to-cart) | active |
| 26 | [26-SGS-GLOBAL-STYLES-AND-THEMING.md](26-SGS-GLOBAL-STYLES-AND-THEMING.md) | Global styles + per-client theming (variation-delta + wp_global_styles REST sync) + pipeline style derivation (supersedes Spec 01 §D156; build deferred) | draft |

## Architecture programme (2026-05-21+) — not yet a numbered spec

The 31-decision architecture programme lives at [`.claude/plans/2026-05-21-architecture-staging.md`](../plans/2026-05-21-architecture-staging.md). Phases 0/0.5/1/1.5/2/3/5a/5b shipped as of 2026-05-22; Phases 4/6/7 pending. Phase 1.5 was inserted mid-execution and isn't in the original 8-phase list.

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

- [`legacy-2026-03-17-header-system-design.md`](../plans/archive/legacy-2026-03-17-header-system-design.md) — superseded by Spec 17
- [`legacy-2026-03-25-mobile-nav-attributes.md`](../plans/archive/legacy-2026-03-25-mobile-nav-attributes.md) — superseded by Spec 17 mobile-nav work
- [`legacy-2026-03-27-mobile-nav-v2-composition.md`](../plans/archive/legacy-2026-03-27-mobile-nav-v2-composition.md) — same
- [`legacy-2026-03-27-wp7-nav-overlay-compat.md`](../plans/archive/legacy-2026-03-27-wp7-nav-overlay-compat.md) — same

## Sub-directories

- [design-brain/](design-brain/) — design-brain rubrics + optimisation-toolkit references
