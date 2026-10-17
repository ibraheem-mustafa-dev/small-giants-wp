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
| 00 | [00-OVERVIEW.md](00-OVERVIEW.md) | Framework overview + philosophy | active |
| 00 | [00-naming-conventions.md](00-naming-conventions.md) | Naming rules + the naming linter | active |
| 01 | [01-SGS-THEME.md](01-SGS-THEME.md) | Block theme (theme.json v3, templates, fonts) | shipped |
| 02 | [02-SGS-BLOCKS.md](02-SGS-BLOCKS.md) | Block specifications + customisation standards, including the variation + style registration pattern | active |
| 02 | [02-SGS-BLOCKS-REFERENCE.md](02-SGS-BLOCKS-REFERENCE.md) | Auto-generated per-block attribute reference. Gitignored: generated locally by `/sgs-update` (`generate-block-reference.py`), never hand-edited: fix the generator instead | active |
| 03 | [03-SGS-BOOKING.md](03-SGS-BOOKING.md) | Booking plugin | deferred |
| 04 | [04-SGS-FORMS.md](04-SGS-FORMS.md) | Forms (built into sgs-blocks) | active |
| 05 | [05-SGS-CLIENT-NOTES.md](05-SGS-CLIENT-NOTES.md) | Visual annotation system | active (live on sandybrown) |
| 07 | [07-SGS-POPUPS.md](07-SGS-POPUPS.md) | Conversion pop-ups plugin | deferred |
| 08 | [08-SGS-CHATBOT.md](08-SGS-CHATBOT.md) | Live chat + AI chatbot | deferred |
| 09 | [09-GOLD-STANDARD-AUDIT.md](../../reports/reference/09-GOLD-STANDARD-AUDIT.md) | Per-block competitor gap analysis (dated research report) | active |
| 10 | [10-COMPETITOR-RESEARCH.md](../../reports/10-COMPETITOR-RESEARCH.md) | Spectra / Kadence / GenerateBlocks research (dated research report) | shipped |
| 11 | [11-SGS-BUTTON-ARCHITECTURE.md](11-SGS-BUTTON-ARCHITECTURE.md) | `sgs/button` + `sgs/multi-button` architecture | shipped |
| 18 | [18-SGS-FLOATING-UI.md](18-SGS-FLOATING-UI.md) | Back to Top + Reading Progress | shipped |
| 27 | [27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md](27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md) | MASTER: the SGS product + WooCommerce layer. Part 1 cards, collection, cart, option-picker and configurator; Part 2 smart bulk pricing (FR-28-n); Part 3 WooCommerce page types, search, filter, account area and saved-item alerts (FR-30-n) | active |
| 32 | [32-COMPONENT-STYLING-TOKEN-CONTRACT.md](32-COMPONENT-STYLING-TOKEN-CONTRACT.md) | **Styling, tokens and theming contract.** Part A the component styling contract (semantic BEM classes consume per-client tokens; no inline declarations); Part B global styles and theming; Part C the `theme-snapshot.json` format and its token vocabulary (FR-32-14 to FR-32-19, FR-32-21, FR-32-22); the draft-to-snapshot extractor is Spec 48 §11. Read with Spec 35 | active |
| 35 | [35-BLOCK-INSPECTOR-UX-STANDARD.md](35-BLOCK-INSPECTOR-UX-STANDARD.md) | Block inspector-UX standard: layout and grouping, control completeness, feature parity, responsive UX, accessibility, and the Part O control-type contract. Read with Spec 32 and 35A. Completion state is single-sourced to `.claude/LEDGER.md` | active |
| 35A | [35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md](35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md) | Sub-spec of Spec 35: anti-pattern fail-list, native-mechanism verdicts, component reference, rollout gates, definition-of-done, role data layer and enforcement layers. Read with Spec 35 | active |
| 36 | [36-SGS-NAVIGATION-SYSTEM.md](36-SGS-NAVIGATION-SYSTEM.md) | **THE SGS Navigation System:** nav bar (`sgs/nav-bar-menu`), mega CPT, off-canvas drawer and utility pieces; Part 14 is the nav menu colour, state and control system (FR-41-n) | active |
| 37 | [37-HEADER-FOOTER-BUILDER.md](37-HEADER-FOOTER-BUILDER.md) | SGS Header/Footer Builder: CPT editing home (header, footer, drawer, mega), container blocks, behaviours, binding | active |
| 38 | [38-SGS-MOTION-SYSTEM.md](38-SGS-MOTION-SYSTEM.md) | SGS Motion System: the four-tier motion doctrine (V vanilla default / G GSAP / H helper / W rendering substrate), the Tier G effect roster, the `data-sgs-fx-*` grammar and the surface-treatment effects | active |
| 38A | [38A-SGS-MOTION-MODEL.md](38A-SGS-MOTION-MODEL.md) | Sub-spec of Spec 38: the motion model. Three panels per element (Hover, Entrance and reveal, Effects) on every compatible block, one `supports.sgs.motion` object with per-element, per-device values, presets that stamp token-backed copies, explicit stored delays with a container stagger helper, the CSS-first runtime, composition rules and the migration of every old motion attribute. Read with Spec 38 | approved design (v1.7), build plan `plans/2026-10-12-spec38a-motion-build.md`, M1 and the M2 renderer and stylesheet built |
| 40 | [40-GENERATIVE-COVER-IMAGES.md](40-GENERATIVE-COVER-IMAGES.md) | Generative cover images: deterministic, brand-coloured artwork generated offline and cached as real files. Scope only; a build gate blocks implementation until an approved reference exists | draft |
| 42 | [42-SGS-FORM-CPT-AND-PRICING.md](42-SGS-FORM-CPT-AND-PRICING.md) | `sgs_form` CPT (slug-keyed identity), the `requireLogin` fix, and the reference-lifecycle contract shared with Spec 43 | active |
| 43 | [43-SGS-CHOICE-FLOW.md](43-SGS-CHOICE-FLOW.md) | `sgs/choice-flow`: the step-wizard block family for qualification quizzes, priced configurators and WooCommerce option-picking, and the `sgs_choice_flow` CPT | active |
| 48 | [48-CLONING-SYSTEM.md](48-CLONING-SYSTEM.md) | **THE cloning system.** A Claude Design handoff (Spec 48A) to a working SGS site: client stages, intake (construct census, page map, palette roles), the value matrix (code first, render confirms), the resolver, calibration, Fill, Solve as check-and-repair, the walker, the site-build script, shop surfaces, the gap proof (G0-G7) and the framework hand-offs. Keeps FR-47-n, R-47-n and the FR-33-n extractor requirements. Own folder `scripts/computed-route/`. Open route work is its §5 Residual | active |
| 48A | [48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md](48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md) | The Claude Design handoff folder: required and allowed files, reachability, `MANIFEST.json`, known runtimes, placement in `sites/<client>/handoff/`, safe running, and each file's reader. Checked by `scripts/computed-route/handoff-check.mjs`. Version 1.0; Spec 48 (the cloning system) follows | draft |

## Not a live spec

Old numbers still appear in code comments, reports and history. Read them as follows.

| Number | Cite instead |
|---|---|
| 06, 13, 24, 39 | none |
| 15 | 00-naming-conventions |
| 16, 22, 29 | 48 (cloning); DB slots; Spec 02 |
| 17 | 37, 36 |
| 19 | `.claude/wp-sgs-cli.md` (the `wp sgs` command reference) |
| 20 | `scripts/parity/GAP-CHECKLIST.md` (fidelity measurement is the parity walker; its unbuilt additions are Spec 48 §3.6) |
| 21 | `scripts/parity/GAP-CHECKLIST.md` |
| 25 | 27 |
| 26 | 32 Part B |
| 28 | 27 Part 2 (FR-28-n unchanged) |
| 30 | 27 Part 3 (FR-30-n unchanged) |
| 31 | 48 (cloning); `.claude/rules/framework-principles.md` for R-31-n (R-22-n is the same rule); Spec 02 "Composite wrapper rule"; Spec 32 FR-32-13 and §6.1 |
| 33 | 32 Part C (snapshot format, with FR-33-11 and FR-33-20) and 48 §11 (extractor); FR-33-n unchanged |
| 34 | 36 |
| 41 | 36 Part 14: `Spec 41 §N.M` is `Spec 36 §14.N.M`; FR-41-n unchanged |
| 44, 45 | 48 |
| 47 | 48 (FR-47-n, R-47-n and section numbers §2 to §7 unchanged); the old text is `archive/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` |

## Working specs / research artefacts (not numbered)

| File | Purpose | Status |
|---|---|---|
| [common-wp-styling-errors.md](common-wp-styling-errors.md) | Recurring WP styling mistakes catalogue | active |
| [go-live-checklist.md](go-live-checklist.md) | Pre-launch WooCommerce gate per Spec 27 Part 3 §FR-30-13 — run once per client before real payments | active |
