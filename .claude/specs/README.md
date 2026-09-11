# Specs — small-giants-wp

Spec files with status tags. One spec per file.

**Last reviewed:** 2026-09-08

This is THE spec roster — the `.claude/CLAUDE.md` manifest points here and caches nothing. Do not create a second roster anywhere.

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
| 02 | [02-SGS-BLOCKS-REFERENCE.md](02-SGS-BLOCKS-REFERENCE.md) | Auto-generated per-block attribute reference (regen via `/sgs-update`). **Gitignored** (`.gitignore:122` — `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` is excluded from git; the file exists locally but is not tracked). Generated locally by the `/sgs-update` regenerator — never hand-edit; fix the generator instead. | active |
| 03 | [03-SGS-BOOKING.md](03-SGS-BOOKING.md) | Booking plugin | deferred |
| 04 | [04-SGS-FORMS.md](04-SGS-FORMS.md) | Forms (built into sgs-blocks) | shipped |
| 05 | [05-SGS-CLIENT-NOTES.md](05-SGS-CLIENT-NOTES.md) | Visual annotation system | deferred |
| 06 | [06-BUILD-ORDER.md](archive/06-BUILD-ORDER.md) | Dependencies + phasing — ARCHIVED 2026-07-28, historical build phasing; superseded by `.claude/LEDGER.md` for live sequencing. Do not cite. | archived |
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
| 28 | [28-SGS-SMART-BULK-PRICING.md](28-SGS-SMART-BULK-PRICING.md) | Smart bulk pricing / comparative value-ladder — P1–P4 all shipped + live-verified | complete |
| 29 | ~~29-CONTAINER-EQUIVALENT-BLOCKS.md~~ | **FOLDED into Spec 31 §13.6 and archived 2026-07-28** — container-equivalent blocks reference (3-KIND map, mirror roster, shared helper) is now covered by Spec 31's composite-mirror procedure. | archived → 31 §13.6 |
| 30 | [30-SGS-WOOCOMMERCE-PAGE-TYPES.md](30-SGS-WOOCOMMERCE-PAGE-TYPES.md) | WC page types — single-product/archive/cart/checkout templates, SGS search + searchable filter, option-picker WC binding, schema | complete (D220) |
| 31 | [31-UNIVERSAL-CLONING-PIPELINE.md](31-UNIVERSAL-CLONING-PIPELINE.md) | **THE cloning CSS-transfer rebuild blueprint** — DB-driven name-free routing engine; read §0 + §12 first. Foundation (Phase F) COMPLETE; stage-by-stage modular rebuild next. | active |
| 32 | [32-COMPONENT-STYLING-TOKEN-CONTRACT.md](32-COMPONENT-STYLING-TOKEN-CONTRACT.md) | **Framework-wide styling contract** — semantic BEM classes consume per-client design tokens (settings.custom.{component}Presets → WP CSS vars); NO inline property declarations, overrides via CSS custom-property values only. Restores + generalises Spec 11 D24; supersedes the D283 inline-attr styling model. Button = reference impl. **Sibling note (Bean decision 2026-07-28): stays SEPARATE from Spec 35, not merged — 32 owns styling/token EMISSION, 35 owns inspector-UX. Read together.** | active |
| 33 | [33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md](33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md) | **Draft global-styles / token extractor** — the OPENING step of the cloning pipeline (runs before Stage 0): measures the draft's rendered computed styles → `sites/<client>/theme-snapshot.json`, which the converter's token-snap depends on (FR-33-12 fails closed if stale). Part 1 COMPLETE (13/13 FRs); **Part 2 = draft header/footer → `sgs/site-header`/`sgs/site-footer`/`sgs/nav-menu`+`sgs/nav-drawer`, NOT started.** | complete (Part 1) |
| 34 | ~~34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md~~ | **DELETED 2026-07-19 (P2.5 Phase 6 purge)** — nav is fully specified in **Spec 36** (the single canonical nav home). Its drawer a11y contract + `elementFromPoint` sweep methodology (10/10 Mama's / 18/18 Indus) + per-device drawer settings were carried verbatim into Spec 36 FR-36-6/-14/-16 before deletion. | DELETED → 36 |
| 35 | [35-BLOCK-INSPECTOR-UX-STANDARD.md](35-BLOCK-INSPECTOR-UX-STANDARD.md) | SGS block inspector-UX + block standards (no-inline / dynamic / feature-parity / shrink-to-fit; Part L controls + Part G native mechanisms). **Current status is single-sourced to `.claude/LEDGER.md` — do not cache a completion claim here.** **Sibling note (Bean decision 2026-07-28): stays SEPARATE from Spec 32, not merged — 35 owns inspector-UX, 32 owns styling/token emission. Read together.** **2026-08-17: the control-type contract was FOLDED IN as PART O** (Bean-approved). Cite Part O. Section numbering preserved, so "contract §14 BORDER" → "Part O §14 BORDER". **Part L now carries a per-item VERIFIED completion state** (audited 2026-08-17 against code, not prose). | active |
| 36 | [36-SGS-NAVIGATION-SYSTEM.md](36-SGS-NAVIGATION-SYSTEM.md) | **THE canonical SGS Navigation System** (SIGNED-OFF v2.1, 2026-07-19) — nav bar + mega CPT + off-canvas drawer + utility pieces (cart/search/social/logo/business-info); classic-menu primary; WCAG 2.1 AA; crawlable; converter-emittable. Single home — absorbed Spec 34 + Spec 17 §S9 nav FRs (Spec 17 now deleted, see Spec 37 for its header-side successor) + Spec 02 §23. **Phase 1 CLOSED 2026-07-20 (LEDGER, Gate-1 evidence green; `sgs/adaptive-nav` DELETED). Next: Phase 2 — mega CPT + Indus + rich desktop/mobile modes.** | active (Phase 2 next) |
| 37 | [37-HEADER-FOOTER-BUILDER.md](37-HEADER-FOOTER-BUILDER.md) | SGS Header/Footer Builder — CPT editing home, container blocks, behaviours, binding. Replaces Spec 17 as the canonical header/footer home (Spec 17 deleted in the same commit, coverage matrix `reports/2026-07-21-spec17-to-spec37-coverage.md`). **Track 2b (LEDGER): the per-row programme D386–D392 and the 2026-07-27 reopen D393–D395 are ALL CLOSED; 2026-07-28 closed the drawer gap (`6ddb9f48`). Canonical record = Spec 37 FR-37-37/38/39/40/41 + decisions.md D386–D395 + Spec 36 FR-36-9a.** | active |
| 38 | [38-SGS-MOTION-SYSTEM.md](38-SGS-MOTION-SYSTEM.md) | SGS Motion System — the **four-tier motion doctrine** (V/G/H/W) (§1, constitutional: Tier V vanilla default / Tier G GSAP capability, conditionally loaded, zero bytes when unused — D406) + the Tier G roster (pin+scrub, SplitText, Flip pairing, Draggable, ScrollSmoother with the D407 sticky resolution, DrawSVG incl. the D408 Vivus retirement, MorphSVG, image-sequence) + the `data-sgs-fx-*` cloning grammar (first home) + waves A/B/C (`plans/2026-07-29-motion-wave-{A,B,C}-session-prompt.md`), Wave D (CLOSED 2026-09-04, decisions.md D949-D955; plan archived to `plans/archive/2026-07-31-motion-wave-D-client-readiness.md`) + the FR-38-12 redirect to WooCommerce Product Collection (D426 killed the original `filter-search`x`card-grid` pairing), **SHIPPED + live-verified 2026-08-22 (D741)** + **Tier W — the closed list now has TWO entries:** FR-38-29 surface treatments (BUILT 2026-08-21, `4eeedb73`) + FR-38-31 flowing gradient (BUILT 2026-08-25; the single original look was rejected, but that is HISTORY — it became a **SIX-STYLE engine, shipped + live-verified 2026-08-27, D852 built / D871 closed**: `pastel` / `horizon` / `ribbon` / `veil` pure-CSS, `aurora` / `ink` WebGL on one shader. Fixtures: canary pages 2740 + 3037. ⛔ The separate **POC rebuild** is a DIFFERENT track, not started — `plans/archive/2026-08-27-generative-background-engine.md`, Phase 1 = pick a reference before any code; its technique spec remains **NO-GO** per D794 until Phase 2 rewrites it). Owns the amendment of the vanilla-first rule at its five written homes. | active (Bean signed off 2026-07-29 post qc-council — 0 refutations, 9 precision amendments in-spec; waves A/B/C unblocked) |
| 39 | _(never created — **not** a reserved slot. D1008 retired "Spec 39" as a concept, Bean: "it doesn't need to take a number". ⚠ `decisions.md` carries many live references to "Spec 39" meaning that retired cloning-pipeline concept, so the number is best left unused to keep them unambiguous. The cloning pipeline is **Spec 31**.)_ | — | never existed |
| 40 | [40-GENERATIVE-COVER-IMAGES.md](40-GENERATIVE-COVER-IMAGES.md) | Generative cover images — deterministic, brand-coloured artwork generated OFFLINE and cached as real files, for blog headers / section backgrounds / OG share images / product cards. **SCOPE ONLY (v0.1.0, status draft) — a ⛔ build gate at §5 blocks implementation until the owner supplies an approved reference (D781).** ⚠ **NOT motion, and NOT the "generative background engine"** — that is a live Tier W effect owned by Spec 38 / the motion track. §0 carries the disambiguation table; read it before citing either. | draft |
| 41 | [41-NAV-MENU-COLOUR-STATE-SYSTEM.md](41-NAV-MENU-COLOUR-STATE-SYSTEM.md) | **`sgs/nav-menu` colour, state + control system (v0.4.7)** — the concrete mechanism satisfying **Spec 36 FR-36-4**'s "distinct hover+focus states" and the colour half of **FR-36-11**; pointed at from Spec 36 **FR-36-28**. Owns: exactly three colour states (Normal / Hover / **current**, keyed on the existing client-side `aria-current="page"`, with every stateful control targeting the LINK not the `<li>`); **the colour-reuse rule** — one colour picker per element property, with the hover-treatment selector changing HOW that swatch is applied and never adding a second colour; the retirement of `hoverStyle` and the whole underline mechanism, its WCAG 1.4.1 non-colour signal now carried by the item border's own Hover treatment rather than any text-decoration control (FR-41-6 — `itemTextDecoration*Hover/Current` and `TypographyControls`' `showHover` trio are deliberately NOT adopted); ONE 3-state per-side item border (no separate "Item Divider"), **split by FR-41-33 so width/style/radius stay in the element's own panel (`SgsBorderControl` with a new additive `showColour={false}` prop) while border COLOUR joins the global `SgsColourPanel` as an ordinary row — a named, block-scoped exception to that component's documented exemptions, taken on merit**; **one universal hover-treatment selector (FR-41-23/24)** — None/Swap/Sweep-or-Highlight beneath every stateful colour row, replacing three previously separate mechanisms (`borderHoverAnimation`, `indicatorStyle:'pill'`, the plain Hover swap), with Highlight painting in the row's own `itemBgHover`/`itemBgHoverGradient` (`indicatorColour*` DELETED) and Sweep governed by ONE eligibility predicate (FR-41-26: no own background, no own gradient, must have glyphs) plus the mandatory `background-clip:text` `@supports` fallback; the submenu split in BOTH colour and TYPOGRAPHY (a Menu/Submenu `targets` switcher, a restored Typography panel, the panel/link background split, and a "Submenu — Items" panel); submenu open animation and top offset with its mandatory hover-bridge; the **"Menu Button"** panel (renamed from "Menu Trigger" — label only, zero attribute renames) with icon/text/both mode, an `IconPicker`-wired icon (as is the drawer's sublink marker, FR-41-30) and an optional **magnetic pull reusing the shared `fx-magnet` runtime with zero new modules (FR-41-31)**; the submenu panel Normal-only throughout; the parent-stays-hovered fix (four rules, two per DOM fork); `itemSmartContrast` relocated to the General-tab Accessibility panel with a cross-reference back to the rows it governs (FR-41-27); additive optional third-state parameters on `sgs_emit_state_colour_css`/`sgs_fill_decls`/`sgs_text_decls` (NO `_3` family); and an opt-in WCAG auto-adjust toggle carried as its own explicitly NON-BLOCKING FR-41-18. **Builds NO new shared component** — three small additive extensions only (`SgsColourPanel` sub-headings, `SgsBorderControl`'s `showColour`, the third-state parameters), each byte-identical for every existing caller. ⛔ Does NOT implement active-trail (FR-41-20), does NOT offer cursor-field or any `motionSurface` effect (FR-41-32 — structurally eligible, deliberately deferred to the design gate at `plans/2026-09-10-fx-selective-effect-offering-design-gate.md`), declares no `itemBorderColourGradient` (pseudo-element budget), and does not touch the mega menu. Read together with Spec 36 (requirement) and Spec 35 (inspector-UX). | active (build in progress — Waves A+B closed, 17/27 steps; Wave C steps 18-27 incl. deploy/canary/Bean sign-off NOT started, `plans/phase-nav-menu-colour-state.md`) |

## DEAD — never cite

These spec numbers are retired. Each entry verified against this README's own rows and `ls .claude/specs/` — none of these files exist live in `.claude/specs/` (only in `archive/` or `../memory/specs-archive/`, or deleted outright).

- **13** — retired; no live file, no row above (pre-dates this roster's tracked history — not otherwise documented in this pass).
- **15** — retired; superseded by **31** (the converter) and **00-naming-conventions** (BEM). No live file.
- **16** (`16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md`) — retired by **22**, itself absorbed into **31 §13**. File is at `archive/` (verified present). Cite **31**.
- **17** (`17-HEADER-FOOTER-ARCHITECTURE.md`) — DELETED 2026-07-21 → **37** (header/footer) + **36** (Site-Info store + nav FRs). Row above already marked DELETED.
- **21** (`21-PIPELINE-STATE-ARTEFACTS.md`) — archived to `../memory/specs-archive/`, superseded by **20**. Row above already marked archived.
- **22** (`22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`) — absorbed into **31 §13**, D253. File is at `archive/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` (verified present). Row above already marked archived.
- **24** (`24-QUERY-DRIVEN-CONTENT-CARDS.md`) — archived; file is at `archive/` (verified present). No live file.
- **25** (`25-SGS-WOOCOMMERCE-EXPERIENCE-LAYER.md`) — archived; file is at `archive/` (verified present). The live WooCommerce homes are **27** and **30**.
- **29** (`29-CONTAINER-EQUIVALENT-BLOCKS.md`) — FOLDED into **31 §13.6**. File is at `archive/29-CONTAINER-EQUIVALENT-BLOCKS.md` (verified present); no live file. Row above already marked archived.
- **34** (`34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md`) — DELETED 2026-07-19 (P2.5 Phase 6) → **36**. Row above already marked DELETED.

## Architecture programme (2026-05-21+) — archived

The 31-decision architecture programme (`.claude/plans/archive/2026-05-21-architecture-staging.md`) **SHIPPED 2026-05-22** — all phases complete. Active work is now the cloning pipeline programme; see **Spec 31** (Spec 22 was absorbed into it at §13 and archived, D253) + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md` (archived).

## Working specs / research artefacts (not numbered)

| File | Purpose | Status |
|---|---|---|
| [common-wp-styling-errors.md](common-wp-styling-errors.md) | Recurring WP styling mistakes catalogue — actively maintained | active |
| [go-live-checklist.md](go-live-checklist.md) | Pre-launch WooCommerce gate per Spec 30 §FR-30-13 — run once per client before real payments. Moved into `specs/` (confirmed 2026-07-28: `.claude/go-live-checklist.md` no longer exists, `.claude/specs/go-live-checklist.md` is present; link verified resolving). | active |
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
