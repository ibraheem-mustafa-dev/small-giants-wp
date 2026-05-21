# Specs — small-giants-wp

Spec files with status tags. One spec per file.

**Last reviewed:** 2026-05-22 (Phase 1.5 session housekeeping)

## Status tags

- `draft` — being written
- `active` — approved, being implemented
- `shipped` — complete
- `deferred` — paused, not cancelled
- `cancelled` — abandoned

## Numbered canonical specs

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
| 09 | [09-GOLD-STANDARD-AUDIT.md](09-GOLD-STANDARD-AUDIT.md) | Per-block competitor gap analysis | active |
| 10 | [10-COMPETITOR-RESEARCH.md](10-COMPETITOR-RESEARCH.md) | Spectra / Kadence / GenerateBlocks research | shipped |
| 11 | [11-SGS-BUTTON-ARCHITECTURE.md](11-SGS-BUTTON-ARCHITECTURE.md) | sgs/button + sgs/multi-button canonical (includes 2026-05-22 double-default fix) | shipped |
| 15 | (absorbed into Spec 16 — deleted 2026-05-12) | Deterministic converter Spec 15 | absorbed |
| 16 | [16-DETERMINISTIC-CONVERTER-V2.md](16-DETERMINISTIC-CONVERTER-V2.md) | Slot-aware DOM walker | active |
| 17 | [17-HEADER-FOOTER-ARCHITECTURE.md](17-HEADER-FOOTER-ARCHITECTURE.md) | Header/footer infrastructure | shipped |
| 18 | [18-SGS-FLOATING-UI.md](18-SGS-FLOATING-UI.md) | Back to Top + Reading Progress | shipped |
| 19 | [19-SGS-CLI-COMMANDS.md](19-SGS-CLI-COMMANDS.md) | `wp sgs` command tree (includes Phase 1 DB seed) | shipped |
| 20 | [20-STRUCTURED-PIPELINE-LOG-SURFACING.md](20-STRUCTURED-PIPELINE-LOG-SURFACING.md) | Per-severity sidecar logs | shipped |

## Architecture programme (2026-05-21+) — not yet a numbered spec

The 31-decision architecture programme lives at [`.claude/plans/2026-05-21-architecture-staging.md`](../plans/2026-05-21-architecture-staging.md). Phases 0/0.5/1/1.5/2/3/5a/5b shipped as of 2026-05-22; Phases 4/6/7 pending. Phase 1.5 was inserted mid-execution and isn't in the original 8-phase list.

## Working specs / research artefacts (not numbered)

| File | Purpose | Status |
|---|---|---|
| [common-wp-styling-errors.md](common-wp-styling-errors.md) | Recurring WP styling mistakes catalogue — actively maintained | active |
| [chrome-devtools-stage-8-integration.md](chrome-devtools-stage-8-integration.md) | Stage 8 / Chrome DevTools spec | research |
| [cloning-skill-salvage-matrix-2026-05-05.md](cloning-skill-salvage-matrix-2026-05-05.md) | Clone-skill audit matrix (referenced by architecture.md) | research |
| [pattern-dedup-classify-mechanics-2026-05-05.md](pattern-dedup-classify-mechanics-2026-05-05.md) | Pattern dedup mechanics (referenced by architecture.md) | research |
| [hostinger-mcp-catalogue.md](hostinger-mcp-catalogue.md) | Hostinger MCP integration catalogue | research |
| [2026-04-16-local-code-review-architecture.md](2026-04-16-local-code-review-architecture.md) | Local code-review brainstorm (absorbed into qc skills) | shipped |
| [2026-04-27-optimisation-toolkit-design.md](2026-04-27-optimisation-toolkit-design.md) | Optimisation toolkit design | shipped |
| [2026-04-29-wp-studio-ai-manual.md](2026-04-29-wp-studio-ai-manual.md) | WP Studio AI integration manual | research |
| [RESEARCH-PROMPT.md](RESEARCH-PROMPT.md) | Reusable research prompt template | active |

## Legacy specs

Files prefixed `legacy-` are historical reference for systems substantively replaced. Kept for context; not active specs.

- `legacy-2026-03-17-header-system-design.md` — superseded by Spec 17
- `legacy-2026-03-25-mobile-nav-attributes.md` — superseded by Spec 17 mobile-nav work
- `legacy-2026-03-27-mobile-nav-v2-composition.md` — same
- `legacy-2026-03-27-wp7-nav-overlay-compat.md` — same

## Sub-directories

- [design-brain/](design-brain/) — design-brain rubrics + optimisation-toolkit references
