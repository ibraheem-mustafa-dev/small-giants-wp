---
doc_type: spec
spec_version: 17
revision: 4
project: small-giants-wp
title: Header/Footer Architecture (WP 7.0 canonical, per-site)
date: 2026-05-19
last_verified: 2026-07-13
status: active
status_history:
  - 2026-05-19: council-passed (ready to implement)
  - 2026-05-24: normalised to canonical enum (council-passed → active)
  - 2026-06-12: search block + 3 header search patterns (D214)
  - 2026-07-13: §S9 Header/Footer/Nav block SYSTEM folded in (design-gate approved) — sgs/site-header, sgs/site-footer, sgs/adaptive-nav + sgs/mobile-nav drawer rework; P0 drawer fix SHIPPED
input_brief: .claude/plans/strategy/2026-05-19-header-footer-research-brief.md
council_outcome: .claude/reports/council-outcome-spec-17.md
parent_session: small-giants-wp-2026-05-19-phase-9b-foundation
scope: v1-full (foundation + conditional headers + CPT-based advanced headers)
target_wp_version: "7.0"
target_php_version: "8.0+"
companion_docs:
  - .claude/CLAUDE.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md (canonical cloning-pipeline spec)
  - .claude/plans/2026-07-13-header-footer-nav-system-design-gate.md (source design-gate for §S9)
update_triggers:
  - architectural_change
  - fr_addition
  - council_revision
---

# Spec 17 v2 — Header/Footer Architecture (per-site, variation-aware, operator-editable)

> **Session B 2026-05-22 updates:**
>
> 1. **Customiser sibling surfaces shipped (Phase 5b, commit `60220b13` + paint-fix `0ef032fe`, Decisions 22+23).** Three new Customiser sections register at `Appearance → Customise → SGS Header / SGS Footer / SGS Site Info`. Implementing classes: `Sgs_Header_Customiser` + `Sgs_Footer_Customiser` + `Sgs_Site_Info_Customiser` (pattern replicated from `Sgs_Floating_UI_Customiser` per Spec 18 §8b). Companion renderers `Sgs_Header_Renderer` + `Sgs_Footer_Renderer` emit inline CSS on `wp_head`. **Additive overlay, NOT replacement.** Existing `Sgs_Header_Rules_Admin` + `Sgs_Footer_Rules_Admin` + `Sgs_Site_Info_Admin` pages remain canonical for conditional-rules management (rules-table UI; ~30 fields for site-info); Customiser sections expose the colour/typography/sticky/max-width subset (~10 settings) with live `postMessage` preview. Info-link controls inside each Customiser section deep-link operators to the admin rules pages for the full rules-management UI. Paint targets: `header.wp-block-template-part` / `footer.wp-block-template-part` (WP-canonical wrappers — verified empirically; `.wp-site-header` / `.wp-site-footer` are NOT emitted by SGS theme template parts).
>
> 2. **Variation-aware behaviour shift (Phase 5a, commit `43a93df9`, Decision 21).** The WP style-variation overlay system that the spec assumed (Section X §X — variation JSONs in `theme/sgs-theme/styles/`) has been retired. Per-client snapshots now live at `sites/<client>/theme-snapshot.json` and are pushed via `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. Header/footer template parts + CPTs + rules engines are entirely preserved (none of these are variation-system files). Site Info store (`wp_options[sgs_site_info]`) unchanged. Anywhere the spec references "active style variation" as a behaviour trigger, the new model is "active site's theme.json snapshot" — same operator experience, different storage path.
>
> 3. **WP 7.0 upgrade on sandybrown (mid-session).** All Spec 17 behaviour verified post-upgrade. `register_block_variation()` does NOT exist as a global function in WP 7.0 — Session A's `get_block_type_variations` filter polyfill (commit `cc541e94`) remains load-bearing for the SGS variation files.

## 0. One-liner

A single WP 7.0 architecture for header + footer template parts that gives every SGS client site a correct initial layout, with site-specific data (logo, business info, social links) flowing in automatically from a single global store, while leaving every operator free to edit, replace, or revert via the Site Editor. Active style variations are retired (Phase 5a); client identity now comes from the site's `theme.json` snapshot.

## 1. Who this is for

| Audience | What they get |
|----------|--------------|
| **Site owners (non-coders)** | One screen for business data; visible result on every page; pattern-swap via Site Editor "Replace" toolbar; inline edit any block; never lose work to a re-clone |
| **SGS framework maintainers** | One canonical mechanism; no client-specific code in framework files; lint guards regressions |
| **AI cloning pipeline (`/sgs-clone`)** | Deterministic landing target via WP-CLI; idempotent re-clone via `_sgs_cloned_from_pattern_slug` post meta. **Note:** the pipeline currently lacks a dedicated header/footer handler — h/f markup is treated as page-body content, which malforms into a page-body block tree or duplicates per page. See parking entry P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER (opened 2026-05-22) for the required stage that extracts h/f once per site and emits to `wp_template_part` shape. |
| **Future-client onboarding** | New client = new style variation + new pattern pair + Site Info config. No theme fork, no framework edit. |

## 2. The problem we are solving — 8 gaps from the research brief

1. Activating a style variation does nothing to the header or footer
2. Framework default `parts/footer.html` is Indus-Foods-shaped
3. `theme.json` registers `header-sticky` / `header-transparent` / `header-shrink` with no matching files
4. Client patterns hardcode personal data
5. Legacy `active_theme_style` `theme_mod` has no UI
6. Slug namespacing inconsistent (`sgs/` vs `sgs-theme/`)
7. "Invalid block" warnings from stored-block schema mismatches
8. No framework versioning strategy for evolving `theme.json` / block attributes

## 3. Architecture in one paragraph (REVISED 2026-05-21)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.4 — Decisions 18, 21.

WP 6.9 already provides every primitive needed. The framework `parts/header.html` and `parts/footer.html` files contain a single `wp:pattern` reference each — the real markup lives in registered block patterns. Each pattern declares `blockTypes: ['core/template-part/header']` (or `footer`), surfacing it in the Site Editor's native "Replace" picker. Template parts are seeded in one of two ways: (1) on **first install**, the SGS plugin activation hook seeds the framework-default header and footer patterns automatically; (2) **at any time after install**, an operator explicitly runs `wp sgs seed-template-parts [--variation=<slug>]` from the CLI, or clicks the "Reset Header/Footer" button in the SGS admin. **The variation-activation auto-trigger (`save_post_wp_global_styles` hook) is REMOVED** — the WP style-variation system itself is deleted (Decision 18); the auto-seed trigger no longer has a firing event. Template parts are brand-agnostic containers whose content is swapped by the operator or pipeline; they are NOT coupled to any variation. Each seeded record carries `_sgs_cloned_from_pattern_slug` post meta — re-clones gate on this for idempotence; operator-edited records have no such meta and are preserved. Site-specific data (logo, phone, email, address, opening hours, socials, copyright) is referenced via WordPress block bindings; the binding source `sgs/site-info` reads from a single global SGS Site Info store kept in `wp_options`. The operator manages that store through one admin page at *Appearance → SGS Site Info*. Empty bindings render friendly hints with deep-links to the admin page. Multi-site isolation is automatic via WordPress's per-site `wp_options` and `wp_template_part` storage. Layout swap, content edit, and "revert to default" all remain available via the Site Editor. Header/footer admin pages are being migrated to the WP Customiser (Decision 21, Phase 5b) — see §Customiser migration below.

**Three-concept distinction (Bean's correction — preserved):**

| Concept | What it is | Fate |
|---|---|---|
| WP style variations (e.g. `mamas-munches.json`) | Per-client colour/typography overlay | **DELETED** — Decision 18 |
| Header/footer template parts (centred, split, minimal) | Brand-agnostic starting templates | **100% PRESERVED** |
| Block-level variations (`register_block_variation`) | Variants within one block (button primary/secondary/outline) | **PRESERVED** |

**Fourth concept, added 2026-07-13 (§S9, design-gate approved):**

| Concept | What it is | Fate |
|---|---|---|
| Specialised header/footer/nav CONTAINER blocks (`sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav`) | A container composite (equivalent to `sgs/card-grid`/`sgs/feature-grid`) used *inside* the existing template part | **PERMITTED** — new, §S9 |
| A monolithic header/footer/nav block that subsumes the template-part/CPT/rules/Site-Info system | The thing this spec has always forbidden | **STILL FORBIDDEN** |

The template-part + pattern + CPT + rules-engine + Site Info architecture described in this paragraph is unchanged and remains the outer container for header/footer content. §S9 below adds a new inner layer: instead of (or alongside) hand-authored core blocks inside `patterns/framework-header-default.php`, a pattern may now place a single `sgs/site-header` (or `sgs/site-footer`) block, which itself delegates rendering to `SGS_Container_Wrapper` exactly like every other SGS container composite. This is a conscious, Bean-directed rule evolution (not a relaxation of the anti-pattern this spec was written to prevent) — see §S9 FR-S9-1 for the exact boundary and the enforcement-hook update.

## 4. Hard constraints

| Constraint | Source | Non-negotiable |
|-----------|--------|----------------|
| WP 6.9 features only — no Gutenberg-experimental APIs | Production stability | Yes |
| PHP 8.0+ syntax permitted | Server baseline | Yes |
| Every admin POST handler: nonce + capability check + sanitisation | code-quality rules | Yes |
| Every REST endpoint: same + explicit `permission_callback` | code-quality rules | Yes |
| Server-side validation MUST mirror client-side validation; never trust JS | Council M5 | Yes |
| `sgs_site_info_get()` returns raw values — callers must escape | Council M7 | Yes |
| No hardcoded client strings in framework files | CLAUDE.md | Yes |
| Universal-benefit only — no client-specific routing in framework code | CLAUDE.md | Yes |
| WCAG 2.2 AA, mobile-first responsive (44 px touch targets) | CLAUDE.md | Yes |
| UK English in code, comments, admin UI | global rule | Yes |
| No co-authored-by footer in git commits | global rule | Yes |
| Per-block file length limits: PHP 300 lines, JS/TS 250 lines | code-quality rules | Yes |
| Block bindings preserve editability (`canUserEditValue` where appropriate) | WP 6.7+ | Yes |
| Migration must NOT wipe existing operator edits on production sites | risk (12 live sites) | Yes |
| Logo workflow stays in native Site Editor — no new media uploader | Council M8 | Yes |
| Pattern registration is PHP-file only — no REST endpoint for v1 | Council A4 | Yes |
| Pipeline integration via WP-CLI only — no REST surface for write paths beyond what WP Core already provides | Council A4 | Yes |
| ReDoS guard at both store time AND render-time evaluation | Council M2 | Yes |

## 5. Out of scope (v1)

- Public browseable pattern library marketing page
- Child-theme-per-client model
- Style Engine custom optimisations
- Per-page template overrides
- Automatic logo file upload from converter
- Header / footer for non-block themes
- Customiser-API surface for new settings
- REST endpoint for atomic pattern registration (security risk; Council A4)
- New media uploader on the SGS admin page (SVG XSS risk; Council M8)
- ~~Independent colour + typography preset split (P-S17-A)~~ — PROMOTED TO IN-SCOPE → see §S8
- Pattern versioning (P-S17-B)
- Complex nested-component patterns beyond 1:1 (P-S17-C)
- Live preview on variation picker (P-S17-D)

---

# 6. Spec sections (9 total)

Each FR carries: behaviour, acceptance criteria, model recommendation, 4-layer test strategy (unit/integration/E2E/regression), dependencies, universal-benefit tag.

---

## §S1 — Framework Defaults

**Plain English:** Default `parts/header.html` and `parts/footer.html` reduce to single `wp:pattern` references. Real markup lives in two new framework-generic patterns. Three orphan template-part registrations get real files. Resolves gaps #2, #3.

### FR-S1-1 — Pattern-delegation for `header.html`

**Behaviour:** `theme/sgs-theme/parts/header.html` reduced to a single `wp:pattern` reference pointing at `sgs/framework-header-default`. Real markup in `theme/sgs-theme/patterns/framework-header-default.php`, registered with `Block Types: core/template-part/header`. Pattern declares `description` (operator-visible label) and `viewportWidth` (for preview thumbnails — **M9**).

**Acceptance criteria:**
- `parts/header.html` ≤ 3 lines (skip-to-main link + pattern reference)
- New pattern at `patterns/framework-header-default.php` contains current minimal SGS header (logo + nav + mobile-nav) with renamed BEM classes and Site-Info block bindings already wired in
- Pattern declares `Description:`, `Keywords:`, `Viewport Width:` headers
- On fresh install with no DB customisations, rendered header is structurally identical to today's pre-spec state
- Pattern appears in Site Editor's "Replace" picker with label + preview

**Model:** Sonnet
**Tests:** Snapshot diff (≤3 lines); pattern registry returns non-null with `blockTypes` + `description`; Playwright pixel-diff < 1% at 1440/768/375; existing DB-stored header records render unchanged.
**Depends on:** §S6
**Universal-benefit:** Yes

### FR-S1-2 — Pattern-delegation for `footer.html`

**Behaviour:** Identical pattern to FR-S1-1 for footer. New pattern `framework-footer-default.php` uses renamed BEM classes from commit `0c1edbd3` and Site-Info bindings for all data fields.

**Acceptance criteria:**
- `parts/footer.html` ≤ 3 lines
- No hardcoded client strings (grep for `Zainab`, `Birmingham`, `mamasmunches` returns zero)
- All business-data slots use `sgs/site-info` bindings with empty-binding hints (**M10**)
- Pattern declares `Description:`, `Keywords:`, `Viewport Width:`
- Appears in Site Editor "Replace" picker

**Model:** Sonnet
**Tests:** Line count ≤3; static-string grep zero hits; pixel-diff < 1% on populated Site Info store; renders friendly hints on empty store.
**Depends on:** FR-S1-1, §S6, §S4
**Universal-benefit:** Yes

### FR-S1-3 — Resolve missing `header-sticky` / `-transparent` / `-shrink` registrations

**Behaviour:** Create `parts/header-{sticky,transparent,shrink}.html` as pattern references; create matching pattern files; each carries `Description:` + `Viewport Width:`.

**Acceptance criteria:**
- 4 header files exist in `parts/`
- 4 patterns registered with `blockTypes: ['core/template-part/header']`
- v1 pattern bodies defer to `sgs/framework-header-default` content with an inline future-work note ("variant-specific markup, v1.1")
- Site Editor "Replace" picker shows all 4 + any client headers

**Model:** Sonnet
**Tests:** `ls parts/header*.html` returns 4; pattern registry returns 4 non-null entries; Playwright opens picker, sees 4 framework + N client patterns.
**Depends on:** FR-S1-1
**Universal-benefit:** Yes

---

### FR-S1-4 — Skip-link (accessibility) — use WP core's, theme styles it (2026-06-03, D157)

**Plain English:** The "Skip to main content" link is a mandatory WCAG 2.4.1 element. It is provided by **WordPress core** (`#wp-skip-link`, class `skip-link screen-reader-text`, injected automatically) — the theme MUST NOT add its own. It is NOT a Floating-UI element (Spec 18 = back-to-top + reading-progress only) and has **no Customiser control** — a skip-link must always exist, so it is never operator-disableable.

**What changed (D157):** the framework header previously carried a SECOND, redundant `<a class="skip-link" href="#main">` in `parts/header.html`. Its only hide mechanism was `top:-100%` (relative to `<body>`, ≈-246px) so the full-size button drifted on-screen (pink, mid-left) and toggled position on click. Fix: the redundant theme link was **removed from `parts/header.html`** (WP core handles it); the theme now styles only WP core's link.

**Styling contract:** hide-until-focus via the clip-rect pattern in `theme/sgs-theme/assets/css/utilities.css`, scoped `.skip-link:not(.screen-reader-text)` so it does not fight WP core's own `#wp-skip-link` rules; on `:focus` it appears top-left (`position:fixed; top:5px; left:5px`) with a high-contrast background + visible focus ring. The duplicate `.skip-link:focus` rule in `header-modes.css` was removed. Any theme-CSS change here bumps `theme/sgs-theme/style.css` `Version:`. `parts/header-shrink.html` / `-sticky.html` / `-transparent.html` must NOT reintroduce a theme skip link.

**Model:** Haiku/Sonnet
**Tests:** one skip-link in the DOM (`#wp-skip-link`); computed `width:1px`/`clip:rect(...)` unfocused, visible top-left on focus; contrast ≥ 4.5:1 focused.
**Depends on:** FR-S1-1
**Universal-benefit:** Yes

---

### FR-S1-5 — `sgs/product-search` as a header-eligible block (2026-06-12, D214)

**Plain English:** The `sgs/product-search` block (shipped FR-30-5, D214) is available for use inside any header pattern. It exposes two `displayMode` values:

| `displayMode` | Behaviour | Typical header placement |
|---|---|---|
| `inline` | Always-visible search bar; renders as an `<input>` combobox with live AJAX suggestions and a no-JS `<form>` fallback | Dedicated row above or below the nav row |
| `icon` | Compact search icon using a native `<details>` disclosure element; expands the search field on click; no-JS-safe | Inside the nav row alongside logo + navigation |

The block is **not included in the framework-default header** (`parts/header.html` remains search-free — see design principle below). It ships exclusively as part of the three opt-in search header patterns (FR-S3-1 roster).

**Design principle — search is opt-in, not default.** Most SGS sites are service businesses that do not require product search. Including search in the framework default would impose WooCommerce coupling on every site. Instead, search ships as a separate layer: operators who want it select one of the three search header patterns via the Site Editor "Replace" picker. This follows the same pattern-delegation model as the rest of Spec 17 — markup lives in patterns, the operator selects via Replace.

**Operational note — theme version bump required for pattern file registration.** WordPress caches the list of theme pattern files against the theme `Version:` header in `style.css`. When new `.php` pattern files are added to `theme/sgs-theme/patterns/`, the theme version **must** be bumped (e.g. `1.5.1 → 1.5.2`) or WordPress will not pick up the new files. The three search patterns below were registered when theme version was bumped to `1.5.2` (D213/D214).

**Universal-benefit:** Yes — any SGS client with WooCommerce can enable product search by swapping to a search header pattern; no framework code change required.

---

## §S2 — Style Variation → Template Part Linkage

**Plain English:** Activating a style variation seeds the matching header/footer pattern into `wp_template_part` DB records. Slug comparison + transient lock guard against races. Per-record post meta marks pipeline-generated content for safe re-clones. Resolves gap #1.

### FR-S2-1 — Variation-triggered seeding (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.4)

The `save_post_wp_global_styles` auto-trigger is removed. The WP style-variation system (Decision 18) is deleted, so there is no variation-activation event to hook into. Seeding now occurs via two explicit paths only:
1. Plugin activation hook (first-install auto-seed with framework defaults)
2. Operator-explicit `wp sgs seed-template-parts [--variation=<slug>]` CLI or admin "Reset Header/Footer" button

The seeder PHP class (`Sgs_Template_Part_Seeder`), the post meta (`_sgs_cloned_from_pattern_slug`, `_sgs_last_seeded_at`), and the idempotence guard are all **preserved** — only the hook trigger is removed.

### FR-S2-2 — Style variation manifest header/footer fields (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.4)

The `settings.custom.sgs.headerPattern` / `footerPattern` fields in variation JSONs are no longer needed because (a) the variation JSONs themselves are deleted (Decision 18/19) and (b) seeding is now operator-explicit rather than variation-triggered. The framework-default patterns serve as the seeding source unless the operator specifies `--variation=<slug>` referencing a pattern registered by that name.

### FR-S2-3 — Programmatic re-seed admin action

**Behaviour:** Button at *Appearance → SGS Site Info → Reset Header/Footer*. POST with nonce + capability. Confirmation dialog. Same seeding logic as the hook.

**Acceptance criteria:**
- `current_user_can('edit_theme_options')` + `wp_verify_nonce` on POST
- Confirmation dialog: *"This will replace your current header and footer with the {variation-name} pattern. Site Info data is safe. Continue?"*
- Success → flash notice; failure → admin notice + `error_log`
- Mirrors via WP-CLI: `wp sgs reset-template-parts [--header] [--footer]` (FR-S5-3)

**Model:** Sonnet
**Tests:** Nonce-fail 403; non-admin 403; admin POST triggers seeding; cancel button does not.
**Depends on:** FR-S2-1, §S5
**Universal-benefit:** Yes

---

## §S3 — Template Parts Architecture

**Plain English:** Multiple patterns per area unlock the "Replace" picker. Conditional rules engine (Header + Footer). CPT-based advanced headers gated against public REST reads. Resolves gap #3 partially + v1's two big features.

### FR-S3-1 — Multiple header + footer patterns per area unlock "Replace" picker (with labels + thumbnails)

**Behaviour:** Register ≥3 patterns per area: `sgs/framework-header-default|minimal|centred` + footer counterparts. Each pattern declares `Description:`, `Keywords:`, `Viewport Width:`, `Block Types:` headers (**M9**).

**Acceptance criteria:**
- `WP_Block_Patterns_Registry` returns ≥3 patterns with `blockTypes` containing `core/template-part/header`; same for footer
- Each pattern's `description` is operator-friendly ("Three-column footer with map, opening hours, address")
- `viewportWidth` declared (≥ 1024 for desktop preview)
- All patterns use renamed BEM (`sgs-link-list__heading` etc.)
- Self-contained — render correctly on empty Site Info store

**Model:** Sonnet
**Tests:** Registry query returns ≥3 patterns per area with description + viewportWidth; snapshot rendered output of each pattern on empty + populated stores; Playwright picker shows label + preview thumbnail.
**Depends on:** §S1, §S4
**Universal-benefit:** Yes

#### Framework header pattern roster (shipped)

The table below lists all registered framework header patterns. Each is in `theme/sgs-theme/patterns/`, declared with `Block Types: core/template-part/header`, `Categories: sgs-headers`, and `Viewport Width: 1440`. Operators select via the Site Editor "Replace" picker.

| Slug | File | Description | Search block |
|------|------|-------------|-------------|
| `sgs/framework-header-default` | `framework-header-default.php` | Minimal colour-neutral header — logo + primary nav + mobile-nav drawer | No |
| `sgs/framework-header-sticky` | `framework-header-sticky.php` | Sticky variant (behaviour layer via body class) | No |
| `sgs/framework-header-transparent` | `framework-header-transparent.php` | Transparent-on-load variant (behaviour layer via body class) | No |
| `sgs/framework-header-shrink` | `framework-header-shrink.php` | Shrink-on-scroll variant (behaviour layer via body class) | No |
| `sgs/header-centred` | `header-centred.php` | Centred logo + nav layout | No |
| `sgs/header-minimal` | `header-minimal.php` | Stripped-back single-row header | No |
| `sgs/header-full` | `header-full.php` | Full-width header with expanded nav area | No |
| `sgs/header-search-bar-above` | `header-search-bar-above.php` | Search bar in a dedicated row **above** the logo/menu row; `sgs/product-search displayMode=inline`; includes mini-cart. Best for shops where search is a primary action. | `inline` |
| `sgs/header-search-bar-below` | `header-search-bar-below.php` | Search bar in a dedicated row **below** the logo/menu row; `sgs/product-search displayMode=inline`; includes mini-cart. Keeps the top row clean while keeping search always visible. | `inline` |
| `sgs/header-search-icon` | `header-search-icon.php` | Compact search icon in the nav row; `sgs/product-search displayMode=icon` (native `<details>` disclosure, no-JS-safe); includes mini-cart. Best when the nav row is tight. | `icon` |

**Footer patterns** (`Block Types: core/template-part/footer`) follow the same registration convention and are separate from the header roster above.

### FR-S3-2 — Conditional Header rules (with correct hook + ReDoS guard)

**Behaviour:** Operators declare rules at *Appearance → SGS Header Rules*. Rules stored in `wp_options` (`sgs_header_rules`). Evaluated via `pre_render_block` filter on `core/template-part` blocks (**M2 + Council A5**). Rules array: pattern slug + condition (post type / template / URL pattern / user role / device class). First match wins; default fallback always exists.

**Acceptance criteria:**
- Hook used: `pre_render_block` with `$block['blockName'] === 'core/template-part'` (correctly cited; **M2**)
- ReDoS guard at STORAGE time: reject patterns matching nested-quantifier shapes (`(a+)+`, `(.*){42}`) via static analysis at save; reject patterns failing `preg_match` test against empty string (**M2 + Council A5**)
- ReDoS guard at RENDER time: wrap `preg_match` in `PREG_BACKTRACK_LIMIT`-aware execution; cap evaluation depth (bail after first `core/template-part` match per request)
- Conditions evaluated AND within a rule; rules evaluated top-to-bottom; first match wins
- Default fallback rule always exists, cannot be deleted
- Rules serialised array in `wp_options` under `sgs_header_rules`
- WP-CLI mirror: `wp sgs header-rules list|add|remove`
- Admin UI shows current rules + "Add Rule" button (FR-S5-1 menu)

**Model:** Opus
**Tests:** Rule-evaluator mock returns correct slug for each condition combo; pattern containing `(a+)+` rejected at save with 400; rule rendering test on matching post; no rules → default behaviour unchanged.
**Depends on:** FR-S3-1
**Universal-benefit:** Yes

### FR-S3-3 — Conditional Footer rules

**Behaviour:** Mirror of FR-S3-2 for footer area. Separate `wp_options` key (`sgs_footer_rules`), separate WP-CLI subcommand, same hook + guards.

**Acceptance criteria:** Mirrors FR-S3-2.
**Model:** Sonnet
**Tests:** Mirrors FR-S3-2.
**Depends on:** FR-S3-2
**Universal-benefit:** Yes

### FR-S3-4 — `sgs_header` / `sgs_footer` custom post types (REST read gated to `edit_theme_options`)

**Behaviour:** Register `sgs_header` + `sgs_footer` CPTs with `show_in_rest: true` but capability-gated REST reads (**M1**). Each published post registers a `block_pattern` per the standard pattern API. CPT pattern registration runs on `admin_init`, NOT frontend `init`, to avoid frontend perf hit (Council Round 1 Seat 1 finding).

**Acceptance criteria:**
- `register_post_type('sgs_header', [...])` with:
  - `show_in_rest: true`
  - `capability_type: 'sgs_header'` + `map_meta_cap: true`
  - `capabilities: ['read_post' => 'edit_theme_options', 'read_private_posts' => 'edit_theme_options', 'edit_post' => 'edit_theme_options', ...]`
  - `supports: ['title', 'editor', 'revisions']` (NOT `custom-fields` — Seat 3 Round 2 critique; meta exposure risk)
  - `template: [['core/group']]`
- Pattern registration via `register_block_pattern` triggered on `admin_init` only (not frontend `init`)
- Soft limit at 50 published `sgs_header` posts; warn admin if exceeded
- Multi-site: per-site isolation via native CPT storage
- Unauthenticated GET `/wp-json/wp/v2/sgs_header` returns 401, NOT 200

**Model:** Opus
**Tests:** Post type registered with correct capabilities; published post triggers admin-side pattern registration; unauthenticated REST read returns 401; frontend page load on a site with 50 published `sgs_header` posts shows no pattern-registration overhead.
**Depends on:** FR-S3-1
**Universal-benefit:** Yes

**Addendum 2026-07-13 (§S9, FR-S9-11) — CPT template swap to the new blocks + a verified code-reality gap.** The `sgs_header` / `sgs_footer` editor template (the array a fresh CPT post opens with) swaps from `[['core/group']]` to `[['sgs/site-header']]` / `[['sgs/site-footer']]` respectively, so an operator creating an Advanced Header/Footer starts from the new specialised container rather than a bare group. **Verified against live code 2026-07-13:** `plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types()` currently does **not** pass a `'template'` key at all in either `register_post_type()` call (the `$shared` array has no `template` entry) — so the `template: [['core/group']]` acceptance criterion above was never actually implemented; new `sgs_header`/`sgs_header` posts currently open with WordPress's default empty canvas, not a pre-seeded `core/group`. FR-S9-11 build must add the `'template' => [['sgs/site-header']]` / `[['sgs/site-footer']]` key as a NEW addition to `$shared`-derived args (not a swap of pre-existing code) — flagged here for the fact-check pass this design-gate rollout requested.

---

## §S4 — Multi-Client Isolation

**Plain English:** One global Site Info store. One admin page. One block-binding source. Refactor existing `sgs/business-info` to read from the store. Sweep all patterns for hardcoded personal data + lint to prevent regression. Resolves gap #4.

### FR-S4-1 — Global SGS Site Info store

**Behaviour:** One `wp_options` record under key `sgs_site_info` stores all site-wide business data as an associative array. Open-ended schema with documented "well-known keys".

**Acceptance criteria:**
- `get_option('sgs_site_info')` returns array
- Schema version recorded under `sgs_site_info_schema_version`
- Helper API: `sgs_site_info_get($key)` → RAW value, caller escapes (**M7**)
- Convenience wrappers: `sgs_site_info_get_esc_html($key)`, `sgs_site_info_get_esc_url($key)` (**M7**)
- `sgs_site_info_set($key, $value)` enforces capability + sanitisation
- `sgs_site_info_all()` returns RAW associative array (escape contract documented)
- Helper API docblock includes the contract: *"Returns raw value. Callers MUST escape with esc_html / esc_url / esc_attr for the output context. Use sgs_site_info_get_esc_html / sgs_site_info_get_esc_url convenience wrappers where appropriate."*
- Site Info excluded from generic WP XML export (`wp_privacy_personal_data_exporters` filter integration; **Council A2**)

**Model:** Sonnet
**Tests:** Round-trip save/load; helper API contract assertion (raw returns + esc wrappers); WP XML export confirmed empty of `sgs_site_info`.
**Depends on:** None
**Universal-benefit:** Yes

### FR-S4-2 — `sgs/site-info` block binding source (with empty-binding hints)

**Behaviour:** `register_block_bindings_source('sgs/site-info', ...)`. Reads from the Site Info store. Empty value path returns friendly hint with deep-link to admin page (**M10**); populated value path returns escaped value (**M7 + Council C2**).

**Acceptance criteria:**
- Source registered with `get_value_callback`, `label`, `uses_context`
- `args.key` accepts dot-notation (`socials.facebook`, `opening_hours.monday`)
- Both empty-hint path AND populated-value path call `esc_html` / `esc_url` as appropriate to the context (**Council C2**)
- Per well-known key, a documented hint string: `phone` → *"📞 Set your phone number in SGS Site Info →"*; `email` → *"✉️ Set your email in SGS Site Info →"*; etc.
- URL fields auto-prefix: `email` → `mailto:`; `phone` → `tel:`; socials → `https://`
- `canUserEditValue` returns `true` for `edit_theme_options` users (inline edit possible for advanced operators)
- Bindings are NOT exposed via REST without authentication (inherits source registration auth)

**Model:** Sonnet
**Tests:** Callback returns correct value for well-known + sub-keys; empty key returns documented hint string; render-time output is escaped on BOTH branches; inline edit gated to capability.
**Depends on:** FR-S4-1
**Universal-benefit:** Yes

### FR-S4-3 — SGS Site Info admin page (with server-side validation + logo deep-link)

**Behaviour:** WP admin page at *Appearance → SGS Site Info* via Settings API. Sections: Identity (logo deep-link to Site Editor — **M8**), Contact, Socials, Opening Hours, Copyright, Custom Fields. Server-side validation mirrors any client-side validation (**M5**).

**Acceptance criteria:**
- Page at `admin.php?page=sgs-site-info`
- Settings API (`add_settings_section`, `add_settings_field`, `register_setting`)
- Capability `edit_theme_options`; nonce protection on every save
- **Logo section:** displays current logo (read from `custom_logo` theme_mod), with prominent "Set logo in Site Editor →" link that anchors at the Site Logo block (**M8**). NO new media uploader added.
- Field-level sanitisation: phone → `sanitize_text_field`; email → `sanitize_email`; URL → `esc_url_raw`; address → multi-line textarea with `wp_kses` allowing only `<br>`
- **Server-side key allowlist** for Custom Fields: PHP-side `preg_match('/^[a-z0-9_]+$/', $key)` AND denylist against reserved option keys (`sgs_framework_version`, `sgs_migrations_completed`, `sgs_seeding_armed_at`, `sgs_legacy_theme_mods_backup`, `sgs_site_info_schema_version`) (**M5**)
- "Save Changes" + "Reset to Empty" with confirmation
- Custom-fields: key/value pairs, add/remove buttons; both client AND server enforce `[a-z0-9_]+`
- All labels + help text UK English

**Model:** Opus
**Tests:** Sanitiser tests per field type; direct POST with `<script>` key returns 400; direct POST with reserved key (`sgs_framework_version`) returns 400; form round-trip persists values; logo deep-link anchor opens correct Site Editor location; existing `sgs/business-info` block continues to function (FR-S4-4).
**Depends on:** FR-S4-1
**Universal-benefit:** Yes

### FR-S4-4 — Refactor `sgs/business-info` block to read from Site Info store

**Behaviour:** Existing `sgs/business-info` block at `plugins/sgs-blocks/src/blocks/business-info/`: refactor `render.php` to read from `sgs_site_info_get_esc_html($attrs['type'])` (or `_esc_url` for URL types). Attribute schema retains `type` + presentation options; loses data fields. Block deprecation registered for existing site content. One-shot migration lifts attribute data into the store.

**Acceptance criteria:**
- `render.php` ≤ 300 lines
- Reads from `sgs_site_info_get_esc_html` / `_esc_url` per type (NOT raw `_get`; **M7**)
- Block deprecation entry covers the previous attribute-stored shape
- Migration script idempotent; runs once per site, recorded in `sgs_migrations_completed`
- Migration uses SAME sanitiser as the admin form (Council Round 2 Seat 3 critique: avoid sanitiser mismatch between paths)
- Block editor preview reads live store

**Model:** Opus
**Tests:** Migration helper transforms fixture old-format blocks correctly; round-trip test confirms blocks render with store-driven values; deprecation prevents "Invalid block" warning on old content.
**Depends on:** FR-S4-1, FR-S4-2, FR-S7-1
**Universal-benefit:** Yes

### FR-S4-5 — Pattern personal-data sweep + CI linter

**Behaviour:** Grep all `theme/sgs-theme/patterns/*.php` for hardcoded personal data; replace with bindings. New linter `scripts/lint-patterns-for-personal-data.py` runs in CI.

**Acceptance criteria:**
- Grep targets: `@` (emails), phone-number patterns, specific URL patterns (`facebook.com/`, `instagram.com/`), specific named strings
- Each hit replaced with `sgs/site-info` binding
- Linter fails CI on regression
- Documentation lists the personal-data patterns the linter watches

**Model:** Sonnet
**Tests:** Linter fixture pattern with hardcoded data fails; clean pattern passes; refactored patterns render identical visual when store populated.
**Depends on:** FR-S4-2
**Universal-benefit:** Yes

---

## §S5 — Operator UI

**Plain English:** SGS admin menu. Variation picker that replaces legacy `theme_mod`. Plus a full WP-CLI surface that lets the cloning pipeline operate. Resolves gap #5.

### FR-S5-1 — SGS admin menu structure

**Behaviour:** Single top-level "SGS" menu (or under Appearance). Submenus: Site Info (FR-S4-3), Header Rules (FR-S3-2), Footer Rules (FR-S3-3), Advanced Headers (`sgs_header` CPT admin link), Advanced Footers (`sgs_footer` CPT admin link), Reset Header/Footer (FR-S2-3), Style Variation Picker (FR-S5-2).

**Acceptance criteria:**
- Menu visible only to `edit_theme_options`
- SVG SGS logo icon
- Stable submenu order
- Each submenu page loads < 200ms
- A11y: keyboard nav, SR labels, focus indicators
- "Reset header/footer" button surfaced PROMINENTLY (Seat 2 Round 2 critique — burying it kills trust)

**Model:** Sonnet
**Tests:** Capability check 403 for unauth; admin sees all; editor sees none; no conflict with other plugin menus.
**Depends on:** §S4, §S3
**Universal-benefit:** Yes

### §S5-2 — Style Variation Picker (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.4)

`Sgs_Variation_Picker`, `class-variation-rest.php`, and `class-sgs-legacy-theme-mod-migrator.php` are DELETED (Decision 18). The WP style-variation system is removed entirely. The SGS admin menu no longer includes a "Style Variation Picker" submenu item. Operators manage per-site branding through the WP Site Editor → Styles panel (where they edit the site's single `theme.json` directly) and through the `push-theme-snapshot.py` CLI for framework-level client deployments.

### FR-S5-3 — WP-CLI surface (`wp sgs ...`) — new FR per Council M6

**Behaviour:** Full WP-CLI command set covering Site Info, seeding, migrations, rules. Each command calls the SAME PHP API helper that admin handlers call (single source of truth, single sanitiser, single capability check).

**Acceptance criteria:**

| Command | Purpose | Capability check |
|---------|---------|------------------|
| `wp sgs site-info get <key>` | Read value | None (read-only) |
| `wp sgs site-info set <key> <value>` | Write value | `edit_theme_options` (enforced if `--user=N` set; document `--allow-root` caveat) |
| `wp sgs site-info update <json-file>` | Bulk write from JSON | Same |
| `wp sgs site-info reset` | Empty store | Same |
| `wp sgs seed-template-parts [--variation=<slug>] [--force]` | Trigger FR-S2-1 seeding logic | Same |
| `wp sgs reset-template-parts [--header] [--footer]` | Mirror admin reset action | Same |
| `wp sgs header-rules list|add|remove` | Manage FR-S3-2 rules | Same |
| `wp sgs footer-rules list|add|remove` | Manage FR-S3-3 rules | Same |
| `wp sgs migrations status` | List pending + completed | None (read-only) |
| `wp sgs migrations run [--target=<version>]` | Run pending | `edit_theme_options` |
| `wp sgs seeding-arm` | Flip FR-S7-3 safety guard | Same |

- Each command file ≤ 250 lines (per file-length rule)
- Lives in `plugins/sgs-blocks/includes/cli/class-{group}-cli.php`
- Registered via `WP_CLI::add_command()` gated on `defined('WP_CLI') && WP_CLI`
- Each command's `--help` is plain English
- All commands log structured output (`WP_CLI::log` for info, `WP_CLI::warning` for warn, `WP_CLI::error` for fatal)
- No command writes to disk outside `wp-content/uploads` (pipeline-safety constraint)

**Model:** Opus (CLI design + capability gating)
**Tests:** Unit: each command's handler with mocked WP-CLI; integration: command runs end-to-end on a test WP install; capability tests: `--user=2` (editor) → 403-equivalent error.
**Depends on:** FR-S4-1, FR-S2-1, FR-S7-2, FR-S3-2, FR-S3-3
**Universal-benefit:** Yes — pipeline integration unblocks every client onboarding flow

---

## §S6 — Slug & Namespace Conventions

**Plain English:** All framework patterns use `sgs/`. Client patterns use `sgs/{client-slug}-{role}`. `sgs-theme/` deprecated with a 1-cycle compatibility shim. Lint guards regression. Resolves gap #6.

### FR-S6-1 — Standardise pattern slugs

**Behaviour:** Rename all existing patterns to `sgs/` namespace. Register backward-compat aliases for old `sgs-theme/` slugs for 1 release cycle.

**Acceptance criteria:**
- Rename map applied:
  - `sgs-theme/header-mamas-munches` → `sgs/mamas-munches-header`
  - `sgs-theme/footer-mamas-munches` → `sgs/mamas-munches-footer`
  - (same for `indus-foods`, `helping-doctors`)
- `Slug:` headers updated in pattern PHP files
- Backward-compat shim registers old slugs as aliases redirecting to new slugs
- All references updated in `theme.json`, style variations, scripts, docs
- Linter prevents deprecated slug usage
- Shim removal scheduled for next major version

**Model:** Sonnet
**Tests:** Rename map applied to fixture pattern; old slug resolves via shim; both return same content; activate a variation with old-slug reference → seeding succeeds.
**Depends on:** None
**Universal-benefit:** Yes

### FR-S6-2 — Naming conventions document

**Behaviour:** Add `.claude/specs/00-naming-conventions.md` covering pattern slugs, block slugs, BEM classes, function prefixes, hook prefixes, option keys, post-meta keys. Linker `scripts/lint-naming-conventions.py` runs in CI.

**Acceptance criteria:**
- Document covers all 7 convention categories above
- Examples for each
- Anti-pattern callouts
- Linked from `CLAUDE.md`
- Linter runs in CI and fails on violation

**Model:** Sonnet
**Tests:** Linter fails on violating file; passes on clean file; CI integration confirmed.
**Depends on:** FR-S6-1
**Universal-benefit:** Yes

---

## §S7 — Migration & Backward-Compatibility

**Plain English:** Block deprecations silence "Invalid block" warnings. Versioned migration framework supports framework evolution. Existing-site safety guard + new per-record post meta (`_sgs_cloned_from_pattern_slug`) protect operator edits. Resolves gaps #7 and #8.

### FR-S7-1 — Block deprecations + validation recovery

**Behaviour:** Audit every dynamic SGS block whose attribute schema has changed since 30 days ago. Add `deprecated.js` entries with previous `save()` output + optional `migrate()` callback.

**Acceptance criteria:**
- Audit log of affected blocks (git log scan)
- Each affected block has `deprecated.js` with the previous shape + optional `migrate()` for attribute backfill
- New CLAUDE.md procedure documented for adding a deprecation on save-shape change
- Existing site content does NOT trigger deprecation notices after this FR ships

**Model:** Opus
**Tests:** Each deprecation entry's `save()` matches previous git-recorded shape; rendering old-shape content does not trigger warnings; new-shape content validates cleanly.
**Depends on:** None
**Universal-benefit:** Yes

### FR-S7-2 — Framework versioning + migration log

**Behaviour:** `sgs_framework_version` option tracks installed version. Migrations live in `plugins/sgs-blocks/includes/migrations/{version}.php`. `sgs_migrations_completed` records completed migrations. CLI commands at FR-S5-3.

**Acceptance criteria:**
- Version recorded; defaults `0.0.0`
- Each migration is a callable; idempotent (safe to re-run)
- `wp sgs migrations status|run` work as specified in FR-S5-3
- Admin notice shows on activation when pending migrations exist
- Migration log `migrations.md` catalogues theme.json + block-attribute changes

**Model:** Opus
**Tests:** Runner skips completed; runs pending in order; double-run is no-op; admin notice appears.
**Depends on:** FR-S5-3
**Universal-benefit:** Yes

### FR-S7-3 — Existing-site safety guard (first-deploy only)

**Behaviour:** `sgs_seeding_armed_at` written on first activation of this spec version. Seeding hook checks the flag before firing. WP-CLI `wp sgs seeding-arm` flips it manually. Admin notice on existing sites explains preservation.

**Acceptance criteria:**
- Flag written on plugin/theme upgrade
- Seeding fires only when `current_time('timestamp') > sgs_seeding_armed_at`
- Existing-site admin notice: *"SGS header/footer architecture upgraded. Your current header and footer are preserved. To re-seed from the current style variation pattern, use SGS → Site Info → Reset Header/Footer or `wp sgs reset-template-parts`."*
- `wp sgs seeding-arm` flips flag

**Model:** Opus
**Tests:** Flag check returns false before arm, true after; seeding skipped on un-armed site; armed site triggers seeding on variation change; fresh-install behaves normally.
**Depends on:** FR-S2-1, FR-S7-2
**Universal-benefit:** Yes

### FR-S7-4 — `_sgs_cloned_from_pattern_slug` post meta (re-clone idempotence) — new per Council M4

**Behaviour:** Every `wp_template_part` record seeded by FR-S2-1 OR by `wp sgs seed-template-parts` carries `_sgs_cloned_from_pattern_slug` post meta. Re-clone / re-seed logic gates: meta present → safe to overwrite; meta absent → skip + warn (preserves operator-edited content). Meta is `register_post_meta` registered with `auth_callback` requiring `edit_theme_options` (**Council C1**).

**Acceptance criteria:**
- Post meta written on every FR-S2-1 seeding event
- Meta registered via `register_post_meta('wp_template_part', '_sgs_cloned_from_pattern_slug', ['auth_callback' => fn() => current_user_can('edit_theme_options'), 'single' => true, 'show_in_rest' => false, 'sanitize_callback' => 'sanitize_key'])`
- Re-clone logic: read meta; if absent, `WP_CLI::warning('Template part X has operator edits; skipping overwrite')` and skip
- `--force` flag on `wp sgs seed-template-parts` bypasses the meta check (operator-acknowledged destructive operation)
- Documentation in CLAUDE.md (operator-facing): *"Your edits to header/footer template parts are preserved across re-clones automatically. If you intentionally want to re-seed from the variation pattern, run `wp sgs reset-template-parts` or use the admin Reset button."*

**Model:** Opus
**Tests:** Meta written on seeding; re-clone without meta → skip + warn; re-clone with meta → overwrite; `auth_callback` blocks low-privilege POST to set the meta; `--force` bypasses check.
**Depends on:** FR-S2-1, FR-S5-3
**Universal-benefit:** Yes

---

## §S8 — Two-Axis Style Variations

**Plain English:** Each style variation is split into two independent axes — a colour preset and a typography preset — stored in `styles/colours/` and `styles/typography/` subdirectories. WordPress 6.5+ auto-discovers these subdirectories without any PHP registration. Operators in the Site Editor Styles panel can mix any colour preset with any typography preset, giving combinatorial design freedom (8 colour presets × 8 typography presets = 64 combinations from 24 files instead of 64 separate variation JSONs). The original top-level variation files remain as bundled "complete" presets — zero change for existing operators.

### FR-S8-1 — Directory split and per-variation refactor

**Behaviour:** Each existing variation `<variant>.json` in `theme/sgs-theme/styles/` is split into:
- `styles/colours/<variant>.json` — ONLY the colour layer: `settings.color.palette`, colour-derived `styles.elements.*` colour overrides. Title format: `"<Variant> Colours"`.
- `styles/typography/<variant>.json` — ONLY the typography layer: `settings.typography.fontFamilies`, `settings.typography.fontSizes`, typographic `styles.elements.*` overrides, font-related `styles.blocks.*` entries. Title format: `"<Variant> Typography"`.
- The original top-level `<variant>.json` becomes a "bundled" variation: retains both layers unchanged, gains `description: "Bundled preset — colour + typography combined. For independent axes use colours/<variant> and typography/<variant>."`.
- Spacing, layout, custom `settings.spacing.spacingSizes`, and block-level overrides that are not typography-only stay in the bundled top-level file; they are NOT duplicated into the axis files.
- Font face declarations (`fontFace[]` on each `fontFamily` entry) go into the typography file.

**Acceptance criteria:**
- `styles/colours/` directory exists with one `.json` per variation
- `styles/typography/` directory exists with one `.json` per variation
- Each colour file: `settings.color.palette` present with ≥ 1 entry; `settings.typography.fontFamilies` absent
- Each typography file: `settings.typography.fontFamilies` present with ≥ 1 entry; `settings.color.palette` absent
- All colour files: palette slugs are a superset of the bundled file's palette slugs (no slug lost)
- All typography files: fontFamily slugs match the bundled file's fontFamily slugs
- Top-level bundled files: `settings.color.palette` + `settings.typography.fontFamilies` both present; `description` contains `"Bundled preset"`
- All files parse as valid `theme.json` v3 (schema + version: 3)
- All files ≤ 500 lines
- Test suite `plugins/sgs-blocks/scripts/tests/test_two_axis_style_variations.py` passes 44/44

**Model:** Sonnet
**Tests:**
- Unit: `test_two_axis_style_variations.py` (44 tests) — JSON-key presence, palette slug completeness, fontFamily slug completeness, file size guard, bundled-preset integrity. 44/44 PASSED.
- Integration: Activate a colour-only variation in WP Site Editor, confirm palette tokens available in block inspector. Activate a typography-only variation, confirm font families switch. Activate bundled preset, confirm both axes active simultaneously.
- E2E: Playwright — open Site Editor Styles panel on sandybrown canary; confirm colour and typography presets appear as separate selectable groups; confirm mixing colour from one variation with typography from another renders correctly at 375/768/1440.
- Regression: grep `styles/colours/` and `styles/typography/` for any palette or fontFamily keys that are absent from the corresponding bundled file.
**Depends on:** None (pure file addition; no PHP changes needed)
**Universal-benefit:** Yes — every future SGS client immediately benefits from combinatorial variation freedom

### FR-S8-2 — WP discovery wiring and operator UX

**Behaviour:** WordPress 6.5+ auto-discovers `.json` files in `styles/` subdirectories without registration. Confirmed via fullsiteediting.com documentation: *"subfolders work"* — no `theme.json` entry and no PHP hook required. Operators see colour and typography presets as separate groups in the Site Editor Styles panel. Labels come from the `title` field in each JSON file.

**Acceptance criteria:**
- No `theme.json` modification required for subdirectory discovery on WP 6.5+
- No PHP class `class-sgs-style-variation-discovery.php` required (discovery is native)
- Operator opens Appearance → Editor → Styles → Browse styles: colour presets labelled e.g. "Mama's Munches Colours" appear alongside typography presets labelled e.g. "Mama's Munches Typography"
- Bundled presets continue to appear with their existing labels (no title change)
- Activating a colour preset does not reset the active typography preset (WP native behaviour — each axis is stored separately in `wp_global_styles`)
- If the site is on WP < 6.5: bundled top-level files continue to work exactly as before; axis files are simply ignored by WP (safe graceful degradation)

**Model:** Sonnet
**Tests:**
- Unit: Confirm `styles/colours/` and `styles/typography/` contain exactly 8 files each matching `EXPECTED_VARIATIONS`.
- Integration: On WP 6.9 test install, confirm `WP_Theme_JSON_Resolver::get_style_variations()` returns colour + typography + bundled presets (total ≥ 24 variations).
- E2E: Playwright — open Styles panel; assert variation labels include "Colours" and "Typography" suffix variants; confirm mix-and-match persist across page reload.
- Regression: Existing sites running bundled presets render identically post-deploy (pixel-diff < 1% at all three breakpoints).
**Depends on:** FR-S8-1
**Universal-benefit:** Yes

---

## §S9 — Header/Footer/Nav Block SYSTEM (added 2026-07-13, design-gate approved)

**Plain English:** A best-in-class header/footer/nav system built on top of the template-part architecture above, not replacing it. Three new specialised container blocks (`sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav`) live *inside* the existing `parts/header.html` / `parts/footer.html` pattern content, plus a hardened rework of the existing `sgs/mobile-nav` off-canvas drawer. Grounded in a study of five real systems (Bricks, Elementor, Blocksy, Material 3, GOV.UK) + the Indus Foods live reference + a research-council on the responsive model. Source design-gate: `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (APPROVED, Bean sign-off 2026-07-13, all recommended defaults). Fixes two live bugs: the sub-384px WCAG 1.4.10 header reflow overflow, and the unclickable off-canvas drawer (root cause proven, fix SHIPPED + live-verified 2026-07-13 — see FR-S9-5).

**Phasing (post sign-off):** P0 drawer fix (SHIPPED) → P1 `sgs/site-header` → P2 `sgs/adaptive-nav` → P3 `sgs/site-footer` → P4 per-device content adaptation polish + transparent-on-scroll toggle → P5 cloning-pipeline Part 2. Each phase closes only via the §12 QC gate in the design-gate doc (reflow / drawer / WCAG / no-inline / per-device / universality / behaviour-layer non-regression / editor-operator UX), run live on the real page per this spec's methodology (never on assertion output alone).

### FR-S9-1 — Rule evolution: specialised header/footer/nav container blocks permitted inside template parts

**Behaviour:** `.claude/hooks/no-header-footer-block.py` and the `header-footer-are-template-parts-not-blocks` memory currently forbid ANY block at `plugins/sgs-blocks/src/blocks/{header,footer,nav}/`. Bean's clarification (2026-07-13): a **specialised CONTAINER block** used *inside* the template part — equivalent to `sgs/card-grid`/`sgs/feature-grid` — is a different thing to the monolithic header/footer block this hook exists to prevent, and is now PERMITTED. The rule evolves to: *"Header/footer remain WordPress template parts (parts + patterns + `sgs_header`/`sgs_footer` CPT + rules engine + Site Info bindings, all preserved verbatim per §3 above). A specialised header/footer/nav container block used inside the template part is PERMITTED. A block that subsumes the template-part/CPT/rules/Site-Info system is still FORBIDDEN."*

**Verified against live code 2026-07-13:** `no-header-footer-block.py`'s regex is `plugins[\\/]sgs-blocks[\\/]src[\\/]blocks[\\/](header|footer|nav)([\\/]|$)` — it matches only the EXACT path segments `header`, `footer`, `nav` immediately after `blocks/`. Directory names `site-header`, `site-footer`, and `adaptive-nav` do **not** match this pattern (the regex requires the literal string `header`/`footer`/`nav` to begin right after `blocks/`, not merely be a substring of the segment) — so the hook already permits `src/blocks/{site-header,site-footer,adaptive-nav}/` without modification, and continues to correctly block a literal `src/blocks/header/`, `src/blocks/footer/`, or `src/blocks/nav/`. This is a **no-op-by-construction** finding, not a change to make — flagged here so a future session doesn't spend effort "updating" a hook that already does the right thing. The existing `src/blocks/mobile-nav/` directory (used by FR-S9-5) is unaffected for the same reason.

**Acceptance criteria:**
- `no-header-footer-block.py` continues to block `Write`/`Edit` on `src/blocks/header/`, `src/blocks/footer/`, `src/blocks/nav/` (regression check — do not weaken)
- `no-header-footer-block.py` allows `Write`/`Edit` on `src/blocks/site-header/`, `src/blocks/site-footer/`, `src/blocks/adaptive-nav/`, `src/blocks/mobile-nav/` (already true; add a fixture test asserting it stays true)
- The `header-footer-are-template-parts-not-blocks` memory entry updated with the fourth-concept boundary (mirrors the §3 addendum above)
- CLAUDE.md's non-negotiable rules / gotchas updated to state the evolved boundary in one sentence, cross-referencing this FR

**Model:** Sonnet
**Tests:** Hook fixture: `Write` to `src/blocks/header/block.json` → blocked (exit 2); `Write` to `src/blocks/site-header/block.json` → allowed (exit 0); `Write` to `src/blocks/adaptive-nav/edit.js` → allowed; `Write` to `src/blocks/nav/index.js` → blocked.
**Depends on:** None
**Universal-benefit:** Yes

### FR-S9-2 — `sgs/site-header` block (3 optional named rows, typed element palette)

**Behaviour:** A specialised section-KIND composite delegating outer rendering to `SGS_Container_Wrapper::render($attrs, $block, $inner, 'section', $opts)` (verbatim `$attrs` — the uid hash depends on it, per the composite-mirror rule, CLAUDE.md). Standard 5-file block pattern (`block.json`+`render.php`+`edit.js`+`save.js`+`index.js`), auto-registered by the existing `build/blocks` scandir loop — no new registration wiring. Three fixed, independently-configurable, optionally-empty named rows (Blocksy/Kadence-validated pattern):
- **Top row** — thin utility strip: contact (phone/email), search, social, ecom icons
- **Middle row** (primary) — logo + nav + primary CTA/cart
- **Bottom row** — message / selling point / overflow / business info

An empty row emits **zero output** — no wrapper, no padding (fixes the empty-slot padding-bleed found in council research). Elements come from a **typed palette**, not freeform blocks (better for non-coder clients per Blocksy): logo, adaptive-nav, search, cart, account, button/CTA, contact, social, HTML, widget-area.

**Acceptance criteria:**
- Registered slug `sgs/site-header`; `supports.sgs.containerKind` declares section KIND per the composite-mirror mechanism (Spec 31 §13.6)
- 3 rows each independently show/hide; an empty row produces no DOM node and no computed padding/margin (verified via live Playwright `getBoundingClientRect` — zero height, zero contribution to sibling spacing)
- Each row accepts only elements from the typed palette (logo/adaptive-nav/search/cart/account/button/contact/social/HTML/widget-area) — no arbitrary core-block insertion inside a row slot
- Renders correctly via `SGS_Container_Wrapper` with the same wrapper capability set as `sgs/card-grid`/`sgs/feature-grid` (padding, max-width, contentWidth, gap, background) — no divergent per-block CSS hack (R-31-9)
- Placed inside `patterns/framework-header-default.php` (replacing/alongside the current hand-authored core-block markup) without breaking the pattern's `Block Types: core/template-part/header` registration or its appearance in the Site Editor "Replace" picker (FR-S3-1)

**Model:** Sonnet
**Tests:** Live Playwright at 320/375/768/1024/1440: empty-row zero-output check; typed-palette element rendering per row; wrapper capability parity vs `sgs/card-grid` (same attr set, same computed padding/max-width behaviour). No-inline check (Spec 32): wrapper carries no inline `style=""`.
**Depends on:** FR-S9-1, §S1 (pattern-delegation), §S4 (Site Info store), FR-S9-10 (global defaults)
**Universal-benefit:** Yes

### FR-S9-3 — `sgs/site-footer` block (rows + up to 6 columns + bottom bar)

**Behaviour:** Same architecture as FR-S9-2 (section-KIND composite, `SGS_Container_Wrapper`, typed palette, empty-row-zero-output). Named rows:
- **Top row** — CTA / newsletter
- **Middle row** — up to **6 columns** (Blocksy's max), collapsing to 1 column below the mobile breakpoint tier (FR-S9-6); columns hold logo, about, links, business info, map link, social
- **Bottom bar** — trademark, company name, terms/policy, attribution link

**Acceptance criteria:**
- Registered slug `sgs/site-footer`; section KIND; same wrapper-capability-parity requirement as FR-S9-2
- Column count 1–6, operator-configurable; live-verified column→1 collapse at the mobile breakpoint tier on both mamas-munches and indus-foods (R-31-9 universality)
- Bottom bar renders trademark/company-name/terms/attribution from Site Info bindings (FR-S9-10) where applicable — no hardcoded client copyright string
- Placed inside `patterns/framework-footer-default.php` without breaking FR-S1-2 (`parts/footer.html` ≤3 lines, no hardcoded personal data — FR-S4-5 linter stays green)

**Model:** Sonnet
**Tests:** Live Playwright: 6-column desktop layout → 1-column mobile collapse at both breakpoint tiers (768/1024 + custom); Site Info binding round-trip (set once, renders in both header AND footer per FR-S9-10); FR-S4-5 linter run clean against the new pattern file.
**Depends on:** FR-S9-1, FR-S9-6, FR-S9-10, §S1, §S4
**Universal-benefit:** Yes

### FR-S9-4 — `sgs/adaptive-nav` block (one menu, 4-tier collapse, mega-menu drill-down, overflow auto-collapse)

**Behaviour:** Layout-KIND composite, one menu source rendering a desktop nav bar that collapses to a burger triggering the `sgs/mobile-nav` drawer (FR-S9-5). Breakpoint set across **4 tiers: Desktop / Tablet / Mobile / custom-px** (Elementor + Bricks pattern — the tier is a per-nav setting, not hardcoded). **Default = one-tree-restyled** (desktop tree re-styled for mobile); **escape hatch = independent mobile tree** via the drawer (Bricks' explicit named choice) — document the dropdown `position:absolute`→`static` gotcha inside the drawer. **Mega-menu:** per-item nestable content (columns, a Content-Block for rich content), full-width or element-targeted; on mobile it becomes **drill-down multilevel navigation + auto back-link** (scales to depth better than a flat accordion), with AJAX lazy-load for heavy mega-menu content. **Desktop overflow safety:** items that don't fit the available width auto-collapse into a "more" menu — the intrinsic never-overflow guarantee extended to navigation specifically.

**Acceptance criteria:**
- Registered slug `sgs/adaptive-nav`; `supports.sgs.containerKind` declares layout KIND; delegates outer rendering to `SGS_Container_Wrapper` per composite-mirror
- ONE menu data source (WP nav menu / page-list) renders both the desktop bar and the collapsed state — no duplicated/divergent mobile menu content by default
- 4 configurable collapse tiers, the custom-px tier reading from the SAME shared breakpoint source as FR-S9-6 (R-31-1 — no per-block hardcode)
- Mega-menu items drill down + show a working back-link at the mobile/drawer tier; desktop mega-menu supports full-width and element-targeted placement
- Desktop nav items that overflow the available width auto-collapse into a "more" menu with no manual configuration required
- Opens `sgs/mobile-nav` (FR-S9-5) at the collapsed tier; passes through the a11y contract (focus trap, ESC, `aria-expanded`) end to end

**Model:** Opus (mega-menu drill-down + overflow-collapse state machine complexity)
**Tests:** Live Playwright per tier (desktop bar visible above the tier breakpoint, burger visible below); mega-menu open → drill-down → back-link → close full keyboard traversal; desktop overflow test (inject enough nav items to force auto-collapse, verify "more" menu appears and contains the overflowed items); custom-px tier configured to a non-default value and verified live.
**Depends on:** FR-S9-1, FR-S9-5, FR-S9-6, FR-S9-7
**Universal-benefit:** Yes

### FR-S9-5 — `sgs/mobile-nav` off-canvas drawer rework: P0 unclickable-drawer bug fix (SHIPPED) + GOV.UK-grade a11y contract

**Behaviour — the bug (root-caused, live-verified, FIXED 2026-07-13):** `view.js` set `inert` on `.wp-site-blocks` when the drawer opened, but the drawer (`#sgs-mobile-nav`) was itself a **descendant** of `.wp-site-blocks` — so it froze itself. The Popover top-layer painted it open-looking while `inert` (which follows the DOM tree, not paint order) made every link inside unreachable. A/B proven: removing `inert` restored clickability. **Fix shipped:** the drawer is now re-parented to be a **direct child of `<body>`** (a sibling of `.wp-site-blocks`) before `showPopover()` is called, so `inert` on `.wp-site-blocks` no longer reaches it. **Status: SHIPPED + live-verified 2026-07-13** — every link/button inside the open drawer is reachable via `document.elementFromPoint()` returning the link itself, not `BODY`.

**Behaviour — the a11y contract (from GOV.UK, the only rigorous public spec of the 5 systems studied; commercial builders under-document this — SGS's differentiator):**
- Progressive enhancement: the nav is plain HTML by default; the toggle button's `aria-controls`/`aria-expanded` wiring activates only once JS confirms it has loaded
- Real focus trap while open; ESC-to-close; backdrop click-to-dismiss; body-scroll-lock while open
- Background made `inert`/`aria-hidden` on every OTHER sibling of `<body>` — WITHOUT trapping the drawer itself (the exact mechanism that fixes the P0 bug)
- Redundant state signalling: class change + `aria-current="true"` + a no-CSS fallback (state is never colour-only, WCAG 1.4.1)
- Configurable screen-reader labels (`menuButtonLabel` / `navigationLabel` attrs) — never hardcoded English, so client sites can localise
- Published keyboard contract: Tab / Space-Enter to open / ESC to close; focus lands on the first interactive element inside the drawer on open (Material's rule); 44px minimum touch targets throughout

**Acceptance criteria:**
- Drawer is a direct child of `<body>` at open time (verified: `drawerEl.parentElement === document.body`) — regression-guarded so this can't silently regress back under `.wp-site-blocks`
- Every link/button inside the open drawer returns itself (not `BODY` or an ancestor) from `document.elementFromPoint(x, y)` at its own centre point — this is the exact test that caught the original bug
- Focus trap: Tab from the last focusable element cycles to the first (and Shift+Tab from the first cycles to the last); focus never escapes to background content while open
- ESC closes the drawer and returns focus to the triggering toggle button
- Backdrop click closes the drawer
- Body scroll is locked while the drawer is open (no background scroll bleed) and restored on close
- Background content (everything outside the drawer, under `.wp-site-blocks`) is `inert`/`aria-hidden` while the drawer is open; the drawer itself is never inert
- `aria-controls` + `aria-expanded` on the toggle button correctly reflect open/closed state; state is also signalled by a CSS class AND `aria-current`, not colour alone
- `menuButtonLabel` / `navigationLabel` are block attrs with sane English defaults, translatable, never hardcoded in markup
- Full keyboard traversal (open → navigate → mega-menu drill-down if present → back-link → close) works with no mouse
- 44px minimum touch target on the toggle button and every drawer link

**Model:** Opus (a11y-critical, security/trust-sensitive surface)
**Tests:** Live Playwright at 375px: open drawer, `elementFromPoint` on every link returns the link (regression test for the exact P0 bug); Tab-cycle focus-trap assertion; ESC-close + focus-return assertion; axe-core pass with zero violations on the open-drawer state; keyboard-only full traversal including mega-menu drill-down (depends on FR-S9-4); body-scroll-lock assertion (`document.body.style.overflow` or equivalent, scroll position unchanged after close).
**Depends on:** None (drawer fix is independent of the other §S9 blocks — this is why it shipped as P0 first)
**Universal-benefit:** Yes

### FR-S9-6 — Per-breakpoint responsive override model (new blocks only, no migration)

**Behaviour:** Each responsive property on the three new blocks (`sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav`) is stored as `{desktop: <val>, tablet: <val|null>, mobile: <val|null>}`, where `null` means "inherit from the tier above" and `desktop` is always concrete. **New-blocks-only** — no migration of existing SGS blocks' attribute shapes (avoids Gutenberg invalid-content errors on existing content and honours the no-migrations/no-deprecations policy, D270/D293). **Wider surface (Bean's choice):** every property on every row is overridable per breakpoint, with the intrinsic layout (Cluster + `clamp()`, FR-S9-7) as the default so most clients never need to touch it. **Cascade:** mobile-first-up, fixed direction — not operator-reassignable (Bricks shipped bugs from making cascade direction configurable). A tier's CSS rule is emitted ONLY where that tier's value diverges from the tier below (no redundant rule emission). **Per-side inheritance** for box properties: `mobile.top ?? tablet.top ?? desktop.top`, independently per side. **Attribute key order is canonicalised before the `uid` md5 hash** (else re-saving the same content churns the uid and busts caches) — covered by a golden "re-save produces the same uid" regression test. **Breakpoints:** 768/1024 as the default device-tier standard (matches `~/.claude/rules/visual-standards.md` + the existing SGS device-tier convention, per CLAUDE.md's "Responsive breakpoint discipline" section), plus a **custom-px 4th tier**, all reading from **one shared breakpoint source** (R-31-1 — never a per-block hardcode, like GOV.UK's shared breakpoint map). **Container queries + media queries together (Bean's choice):** `container-type: inline-size` is declared on the block's own legitimate container wrapper (not a bare element — no D293 violation), so the block also adapts to its own width when reused in a narrower context (e.g. a sidebar); a `@media` fallback runs alongside for browsers/contexts where the container query doesn't apply.

**Editor UX:** a device switcher with proper tab semantics, 44px targets, keyboard operability; an inherited (not overridden) value is shown visually greyed **plus an icon and `aria-label`** (never colour alone — WCAG 1.4.1); a keyboard-reachable "reset to inherited" button (not right-click-only, which is undiscoverable and inaccessible). SGS-owned components — do not depend on WordPress's `__experimental` device-switcher component, which is not a stable public API.

**Acceptance criteria:**
- Data model `{desktop, tablet, mobile}` with `null`-means-inherit implemented on all overridable properties of the three new blocks; verified NOT retrofitted onto any existing block's attribute schema
- CSS emission: a tier's rule appears in the scoped `<style>` only when that tier's resolved value differs from the tier below (verified by inspecting the emitted `<style>` block for a fixture with two tiers set identically)
- Per-side box inheritance verified independently (set `mobile.top` only, confirm `right`/`bottom`/`left` still resolve from `desktop`)
- Golden test: save a block, capture its `uid`; re-save with no content change; `uid` unchanged
- Breakpoint values (768/1024 + configurable custom-px) read from one shared source (grep-clean of any second hardcoded 768/1024 pair specific to these three blocks)
- `container-type: inline-size` present on the block's container wrapper; verified the block renders correctly both at full page width and nested inside a narrower container (e.g. a sidebar widget area)
- Device switcher: keyboard-operable tab semantics (arrow-key navigation, `role="tablist"`), 44px targets; inherited-value indicator carries both a non-colour visual cue AND an `aria-label`; reset-to-inherited reachable via Tab + Enter/Space (not right-click-only)

**Model:** Opus (data-model + hashing/canonicalisation design, cross-block shared infrastructure)
**Tests:** Unit: uid-canonicalisation function tested against key-order permutations of the same attribute set (all permutations produce the same hash); CSS-emission tier-diff logic tested against fixtures. Integration: golden re-save uid-stability test. E2E: Playwright device-switcher keyboard traversal + inherited-indicator `aria-label` assertion + reset-to-inherited click-and-verify. Regression: existing (non-§S9) blocks' attribute schemas byte-unchanged (grep/diff against pre-§S9 block.json files).
**Depends on:** None (foundational; FR-S9-2/3/4 consume this model)
**Universal-benefit:** Yes — the shared breakpoint source + canonicalisation pattern is reusable by any future responsive-override block

### FR-S9-7 — Never-overflow layout (Cluster + `clamp()`)

**Behaviour:** Base layout for all three new blocks is the **Cluster** pattern (`display:flex; flex-wrap:wrap; gap`) with `min-width:0` on every child (prevents flex items forcing overflow) and `flex-shrink:0` on the logo element specifically (prevents the logo being crushed to unreadable size), combined with fluid `clamp()`-based spacing and the container-query tiers from FR-S9-6. This makes header/footer **never overflow at any width down to 320px** with zero per-element hacks — solving the original emergency (sub-384px WCAG 1.4.10 header horizontal-overflow bug) intrinsically rather than via a targeted patch. Free enhancements riding on this: `interpolate-size: allow-keywords` for a JS-free drawer-height animation, and `@property` for a smooth `--sgs-header-height` custom-property transition.

**Acceptance criteria:**
- Live Playwright reflow check at 320/360/375/414/768/1024/1280/1440: `document.documentElement.scrollWidth <= window.innerWidth` at every width, on both `sgs/site-header` and `sgs/site-footer`
- No element (including cart icon, burger toggle, logo) renders past the viewport edge at any tested width
- Logo never shrinks below a legible minimum size (verified via `flex-shrink:0` + a `clamp()` floor)
- Cart/burger toggle maintains ≥44px touch target at every tested width
- Solves the specific EMERGENCY bug this design-gate names: sub-384px header horizontal-overflow (WCAG 1.4.10 Reflow) — verified fixed at 320/360/375 specifically

**Model:** Sonnet
**Tests:** Live Playwright reflow sweep (the 8 widths above) on real deployed pages, per the emergency task this spec's own changelog names; `scrollWidth`/`innerWidth` assertion; visual screenshot diff at each width saved to `reports/visual-diff/` (per STOP-67).
**Depends on:** FR-S9-2, FR-S9-3, FR-S9-6 (container-query tiers)
**Universal-benefit:** Yes

### FR-S9-8 — Per-device content adaptation

**Behaviour:** No system studied (Bricks/Elementor/Blocksy/Material/GOV.UK) has a magic "swap content per device" primitive — all use place-element-then-toggle-per-device. SGS follows the same proven pattern: **every element** gets a per-tier **visibility** toggle (show desktop / hide mobile, etc.); **nav/CTA/contact elements** get a `showLabel`/`iconOnly` boolean (Blocksy's Trigger pattern — e.g. email text collapses to an email icon with a working `mailto:` link); a **move-to-drawer** mechanism where the drawer (FR-S9-5) is a separate drop-zone and items placed there render ONLY in the drawer, not in the header row. **Reference pattern (Indus Foods, live):** at ≤1024 both header rows merge to a slim bar showing logo + a single "Call" **button** (text-to-button, not just an icon); email/social **drop from the header into the drawer**; footer columns go 3→1 at 768. This is the template pattern new client builds should follow: one clean device-tier flip for header+footer, secondary items relocate to the drawer, and the primary contact channel becomes a prominent button rather than shrinking to an icon.

**Acceptance criteria:**
- Every typed-palette element (FR-S9-2/3) has a per-tier visibility toggle independent of its content
- Nav/CTA/contact elements expose `showLabel`/`iconOnly`; `iconOnly` email renders a working `mailto:` link, `iconOnly` phone renders a working `tel:` link
- Move-to-drawer: an element flagged for the drawer drop-zone renders exclusively inside `sgs/mobile-nav` (FR-S9-5) at the collapsed tier, not duplicated in the collapsed header row
- The Indus Foods reference pattern reproduced and live-verified: ≤1024 slim header (logo + Call button), email/social moved to drawer, footer 3→1 columns at 768

**Model:** Sonnet
**Tests:** Live Playwright per tier: visibility-toggle correctness; `iconOnly` email/phone links resolve to correct `mailto:`/`tel:` hrefs; move-to-drawer element absent from the collapsed header row and present inside the open drawer; Indus Foods reference-pattern reproduction verified on the Indus Foods site specifically (R-31-9 universality — also verified it generalises to mamas-munches, not just Indus).
**Depends on:** FR-S9-2, FR-S9-3, FR-S9-5, FR-S9-6
**Universal-benefit:** Yes

### FR-S9-9 — Sticky / transparent-at-rest-to-solid-on-scroll (no-code toggle)

**Behaviour:** Per-**row-combination** sticky behaviour (Blocksy's model: All rows / Main row only / Top+Main / etc.), delivered through the EXISTING SGS body-class behaviour layer (`plugins/sgs-blocks/includes/class-sgs-header-behaviours.php`, `assets/css/header-behaviours.css`, `src/header-behaviours/view.js`) plus the existing `--sgs-header-height` ResizeObserver and `scroll-padding-top` anchor-offset fix (WCAG 2.4.11) — **all preserved verbatim**, this FR extends the existing mechanism to the new blocks rather than replacing it. New: **transparent-at-rest → solid-on-scroll as a no-code toggle** in the block inspector (beating Elementor, which requires hand-written CSS for this) — options modelled on Material's 3 scroll behaviours (pinned / enter-always / exit-until-collapsed). State changes route through a CSS custom-property token, never a hardcoded inline declaration (Material's discipline + Spec 32 no-inline contract).

**Acceptance criteria:**
- `sgs/site-header` inspector exposes sticky row-combination options + the transparent→solid toggle with the 3 Material scroll-behaviour choices, no CSS authoring required by the operator
- The existing `class-sgs-header-behaviours.php` body-class strategy, `--sgs-header-height` ResizeObserver, and `scroll-padding-top` anchor fix (WCAG 2.4.11) are unchanged in behaviour and continue passing their existing tests (regression, not rebuild)
- Transparent-at-rest → solid-on-scroll state is expressed via a CSS custom property (token), never an inline `style=""` declaration (Spec 32 no-inline contract)
- Dark-mode variants of the sticky/transparent states render correctly (contrast maintained through the transition)

**Model:** Sonnet
**Tests:** Regression suite for `class-sgs-header-behaviours.php` / `header-behaviours.css` / `view.js` re-run green post-integration; live Playwright scroll simulation verifying transparent→solid transition + each of the 3 Material scroll-behaviour options; no-inline grep on the rendered wrapper markup; dark-mode contrast check during the transition.
**Depends on:** FR-S9-2, existing Phase 2A behaviour layer (§ "Phase 2A Additions" below)
**Universal-benefit:** Yes

### FR-S9-10 — Global style defaults + shared Site Info access (both blocks, one source of truth)

**Behaviour:** Every element/setting in `sgs/site-header`, `sgs/site-footer`, AND `sgs/adaptive-nav` has access to, and defaults from, two shared sources — so the same data is consistent across header AND footer with zero duplication (Bean requirement, 2026-07-13):
1. **Global style defaults** — the site's `theme.json`/`wp_global_styles` tokens (colours, typography, spacing), and for cloned sites the Spec 33 draft-extracted `theme-snapshot.json`. Header/footer elements inherit these as defaults; per-instance overrides remain available via FR-S9-6. No hardcoded values (R-31-1).
2. **SGS Site Info store** — the SAME `sgs_site_info` `wp_options` record + `sgs/site-info` block-bindings source already canonical for this spec (§S4, FR-S4-1/2): logo, phone, email, address, opening hours, socials, copyright, attribution link. Both header and footer blocks bind to this one store, so an operator updating Site Info once updates every header/footer instance everywhere. Empty bindings render the existing friendly hints with deep-links (FR-S4-2's `M10` contract) — no new hint mechanism invented.

**Acceptance criteria:**
- A contact/logo/social value set once in Site Info (via the existing FR-S4-3 admin page or Customiser) renders identically in `sgs/site-header` and `sgs/site-footer` without re-entry
- Brand colours/fonts in the new blocks come from `theme.json`/`wp_global_styles`/`theme-snapshot.json` tokens, never a per-block literal (grep-clean, matching the FR-S4-5 sweep discipline)
- Verified on ≥2 clients (mamas-munches AND indus-foods, per R-31-9 universality)
- No new Site Info schema, no new binding source, no new admin page — this FR wires the EXISTING FR-S4-1/2/3 infrastructure into the three new blocks, it does not duplicate it

**Model:** Sonnet
**Tests:** Set a Site Info value once via the admin page; verify it renders in both a `sgs/site-header` instance and a `sgs/site-footer` instance on the same page with no per-block re-entry; grep sweep for hardcoded colour/font literals in the three new blocks' render.php/style.css; repeat the whole check on both mamas-munches and indus-foods.
**Depends on:** FR-S4-1, FR-S4-2, FR-S4-3, FR-S9-2, FR-S9-3, FR-S9-4
**Universal-benefit:** Yes

### FR-S9-11 — CPT template swap + DB reseed + cloning-pipeline Part 2 plumbing

**Behaviour:** Three integration steps close out the §S9 rollout:
1. **CPT template swap** — `sgs_header`/`sgs_footer` (FR-S3-4) editor template swaps to open on the new blocks. As verified above (FR-S3-4 addendum), the live code currently sets no `template` key at all, so this is a NEW addition of `'template' => [['sgs/site-header']]` / `[['sgs/site-footer']]`, not a swap of pre-existing `[['core/group']]`. `parts/header.html` + `patterns/framework-header-default.php` (and the footer equivalents) update together as byte-identical duplicates per the existing pattern-delegation model (§S1).
2. **DB reseed via `/sgs-update`** — `blocks` + `block_supports` + `block_attributes` pick up the three new blocks automatically; `block_composition.wraps_block='sgs/container'` + `container_kind` populated via `sync-container-wrapping-blocks.py`; `composition_role` via `seed-composition-roles.py`; `variant_slots` + `blocks.variant_attr` populated if any of the three blocks declare layout/nav variants (`supports.sgs.variants` in block.json, per FR-22-20). Every new/changed row spot-verified after the run — do not assume the seeder ran clean.
3. **Cloning-pipeline Part 2** (parking entry `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`, referenced in §1's audience table above) — the walker maps a draft's header/footer rows onto the three new blocks' named slots by BEM role (Spec 31 R-31-2/R-31-8): fewer draft rows than slots → the extra slots are logged as empty per R-31-4 (no silent skip); more draft rows/content than slots → logged as a gap candidate, never silently truncated.

**Acceptance criteria:**
- `class-sgs-block-cpts.php::register_post_types()` gains a `'template'` entry for both CPTs pointing at the corresponding new block
- New `sgs_header`/`sgs_footer` posts open pre-populated with `sgs/site-header`/`sgs/site-footer` in the block editor (verified live — not just reading the PHP array)
- `/sgs-update` run post-deploy; `blocks` table contains all 3 new slugs with correct `container_kind`; spot-check ≥1 row per new table/column touched
- Cloning pipeline Part 2 is scoped as its own follow-on build (P5 in the design-gate phasing) — this FR only requires the INTEGRATION POINTS (slot names, BEM-role mapping table) to be documented, not the full walker change implemented within §S9's own build
- No FR-S9 block ships without its DB rows being live-queryable via `/sgs-db` (R-31-8 — schema enumeration before "missing X")

**Model:** Opus (CPT/security-adjacent registration change + DB-schema integration)
**Tests:** Live: create a new `sgs_header` post, confirm the block editor opens with `sgs/site-header` pre-inserted; `/sgs-db` query confirms all 3 new blocks + their `container_kind`/`variant_slots` rows; FR-S1-1/FR-S1-2 pattern-delegation regression (existing patterns still register + appear in the Replace picker); parking.md entry `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` updated to reference the new slot-mapping documentation as its build input.
**Depends on:** FR-S9-2, FR-S9-3, FR-S3-4, §S1
**Universal-benefit:** Yes

### §S9 Guardrails (mirrors the design-gate's own §14, restated here for spec-local enforcement)

Composite-mirror — no divergent per-block CSS path (Spec 31 §13.6). No hardcoded client values anywhere in the three new blocks — Site Info + tokens only (FR-S9-10, R-31-1). No block version bumps or deprecations pre-production (D293/D270 — re-clone, not deprecate). Universal, no carve-outs (R-31-9) — every fix/capability applies to all qualifying rows/elements, not a per-client exception. STOP-21/CSS-VER/CDN/LiteSpeed cache-bust sequence run before every live measurement (this spec's own §12-equivalent QC gate lives in the design-gate doc, §12). Path-scoped commits on `main` per this spec's existing git-workflow convention; verify D-ceiling before starting; no co-author lines in commits.

---

# 7. Cross-cutting concerns

## 7.1 Security

- Every admin/REST handler: `current_user_can()` + `wp_verify_nonce()` + type-specific sanitisation
- Server-side validation MIRRORS client-side validation (never trust JS — **M5**)
- Prepared statements for direct `$wpdb` queries
- Output escaping at the rendering layer; helper APIs return RAW values per documented contract (**M7**)
- `wp_global_styles` post-ID never accepted from user input (**Council N1**)
- ReDoS guards at both store and render time on operator-supplied regex (**M2 + Council A5**)
- CPT REST reads capability-gated (no `show_in_rest: false` blanket — **M1**)
- Post meta on `wp_template_part` records registered with `auth_callback` (**M4 + Council C1**)
- Site Info excluded from generic WP XML export; surfaced via GDPR personal-data exporter (**Council A2**)
- No new media uploader; logo workflow stays in Site Editor (**M8**)
- No REST endpoint for pattern registration (**Council A4**)

## 7.2 Performance

- Site Info store autoloaded; one query per request, cached for request lifetime
- Seeding hook fires on infrequent admin event only
- Conditional rules evaluated once per `core/template-part` block with early-bail on first match; ReDoS-bounded
- CPT pattern registration runs on `admin_init` only — zero frontend cost (**Council Round 1 Seat 1**)
- Soft cap at 50 published `sgs_header` posts; warn if exceeded
- Block bindings resolved at render time; reads from autoloaded `wp_options` — no extra query
- Frontend perf budget: < 100 KB CSS, < 50 KB JS per page

## 7.3 Accessibility

- All admin pages keyboard-navigable, SR-labelled, contrast ≥ 4.5:1
- Client-facing patterns WCAG 2.2 AA; 44 px min touch targets
- Block-binding output `esc_html`'d — no XSS from operator-entered data

## 7.4 Internationalisation

- All strings via `__()` / `_e()` with text domain `sgs-blocks` or `sgs-theme`
- UK English source locale
- Block bindings preserve UTF-8

## 7.5 Versioning

- This is Spec 17 v2 (council-passed). Future amendments amend this spec
- FR `Status:` field tracks implementation progress
- Spec changelog records every revision

---

# 8. Success metrics

Spec ships successfully if all observable on sandybrown canary site:

1. Operator switches style variation → header + footer rewrite; business data preserved
2. Operator edits header in Site Editor → changes persist
3. Operator swaps header pattern via "Replace" toolbar → swap completes
4. Operator sets Site Info via admin page → values render on frontend
5. Conditional rule "show Header A on /shop, B elsewhere" works in browser
6. `sgs_header` CPT post creatable, editable; surfaces in "Replace" picker; unauth REST read returns 401
7. No "Invalid block" warnings in Site Editor
8. Zero hardcoded client strings in any framework file (grep verified + linter green)
9. All 12 production sites continue to render their existing header/footer correctly post-deploy (no migration data loss)
10. Cloning pipeline lands a generated header/footer via WP-CLI without breaking editability; re-clone preserves operator edits via `_sgs_cloned_from_pattern_slug` post meta
11. **New (Council):** Unauth REST GET on `sgs_header` posts returns 401; ReDoS-attempt URL pattern rejected at save; concurrent autosave events produce exactly one seeding outcome

## 9. Risks and unknowns (Council-revised)

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `save_post_wp_global_styles` fires more often than expected | Slug comparison guard (M3) ensures only true variation-change triggers seeding |
| R2 | Migration wipes operator data on legacy site | FR-S7-3 first-deploy guard + FR-S7-4 per-record meta + extensive rehearsal on cloned canary |
| R3 | CPT pattern registration perf | `admin_init`-only registration; soft cap 50 posts |
| R4 | Slug rename shim conflicts with third-party plugins | 1-release-cycle deprecation; removed at next major |
| R5 | Block bindings + `canUserEditValue` confuses operators | Empty-binding hints (M10) reduce confusion; A/B fallback to read-only if needed |
| R6 | Multi-site network installs differ | Test on multisite fixture; document explicitly |
| R7 | **New (Council N1)** | `wp_global_styles` post-ID never from user input — hard-coded lookup |
| R8 | **New (Council N2)** | Site Info PII in WP XML export — GDPR exporter integration |
| R9 | **New (Council C1)** | Post meta spoofing via low-privilege CPT edit — `register_post_meta` with `auth_callback` |
| R10 | **New (Council C3)** | ReDoS at render time as well as store time — `PREG_BACKTRACK_LIMIT` |

## 10. Glossary

(Unchanged from v1; see prior revision)

---

# 11. Spec changelog

| Date | Revision | Reason |
|------|---------|-------|
| 2026-05-19 | v1 draft | Initial draft after research brief + Bean Q&A |
| 2026-05-19 | v2 | Council-revised. Applied 10 must-fixes (M1-M10) + 5 recommended additions (A1-A5). Added FR-S5-3 (WP-CLI surface), FR-S7-4 (re-clone idempotence meta). Hardened §7.1 with 5 new requirements. Added 4 new risks (R7-R10). Logo workflow stays in Site Editor (M8). REST pattern endpoint rejected (Council A4). Spec marked council-passed, ready to implement. |
| 2026-05-19 | v2.1 | Promoted P-S17-A to in-scope. Added §S8 Two-Axis Style Variations (FR-S8-1 + FR-S8-2). Updated §6 header to 8 spec sections. All 8 existing variations split into `styles/colours/` + `styles/typography/` axes; 16 new files created; 8 bundled top-level files annotated. 44/44 tests passing. |
| 2026-05-21 | v3 | Architecture staging doc decisions applied: §3 architecture paragraph rewritten (variation-triggered seeding removed; explicit CLI / activation hook replaces it). FR-S2-1 and FR-S2-2 retired (variation trigger no longer exists). §S5-2 variation picker retired (Decision 18 deletes the variation system). §S8 two-axis style variations retired (variations deleted entirely). New §Customiser migration section added (Decision 21). Cross-reference to Spec 18 added as canonical Customiser pattern. |
| 2026-06-12 | r3 | D214 additions: FR-S1-5 (sgs/product-search as a header-eligible block; `inline` + `icon` displayMode; opt-in design principle; theme version bump gotcha). FR-S3-1 extended with a full shipped header pattern roster table (10 patterns); three new search patterns added — `sgs/header-search-bar-above`, `sgs/header-search-bar-below`, `sgs/header-search-icon` (all `Block Types: core/template-part/header`, `Categories: sgs-headers`). Framework-default header confirmed search-free. |
| 2026-07-13 | r4 | **§S9 Header/Footer/Nav block SYSTEM folded in** (design-gate `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`, APPROVED, Bean sign-off, all recommended defaults). New §9th spec section (§6 header "8 total" → "9 total"), 11 FRs (FR-S9-1 through FR-S9-11) covering: rule evolution permitting specialised header/footer/nav container blocks inside template parts (FR-S9-1 — verified the enforcement hook already permits the new slugs by construction); `sgs/site-header` (FR-S9-2) and `sgs/site-footer` (FR-S9-3) — 3 named rows, typed element palette, empty-row-zero-output; `sgs/adaptive-nav` (FR-S9-4) — one menu, 4-tier collapse, mega-menu drill-down, desktop overflow auto-collapse; `sgs/mobile-nav` off-canvas drawer rework (FR-S9-5) — the P0 unclickable-drawer bug (drawer re-parented to `<body>`, no longer trapped by its own parent's `inert`) SHIPPED + live-verified 2026-07-13, plus a GOV.UK-grade a11y contract (focus trap, ESC, body-scroll-lock, redundant state, configurable SR labels); per-breakpoint responsive override model, new-blocks-only (FR-S9-6); never-overflow Cluster+`clamp()` layout solving the sub-384px WCAG 1.4.10 reflow emergency intrinsically (FR-S9-7); per-device content adaptation incl. the Indus Foods reference pattern (FR-S9-8); sticky/transparent-on-scroll no-code toggle extending the existing behaviour layer (FR-S9-9); global style defaults + shared Site Info access across header AND footer with zero duplication (FR-S9-10); CPT template swap + DB reseed + cloning-pipeline Part 2 plumbing (FR-S9-11 — also documents a verified live-code gap: FR-S3-4's `template: [['core/group']]` acceptance criterion was never actually implemented, current code sets no `template` key at all). §3 architecture paragraph gained a "fourth concept" addendum table. FR-S3-4 gained a verified-code-reality addendum. Research basis: Bricks, Elementor, Blocksy, Material 3, GOV.UK + Indus Foods live reference + research-council. |

---

## §Customiser Migration — Header/Footer/Site Info (Decision 21, Phase 5b)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.4 — Decision 21.

The SGS admin pages for Header Rules, Footer Rules, and Site Info are being migrated to the **WP Customiser** (Phase 5b), following the `Sgs_Floating_UI_Customiser` pattern established in Spec 18 (the canonical "how to register an SGS Customiser section" reference).

**Why:** The current save→refresh→navigate cycle for Header/Footer Rules is poor UX. Customiser live preview gives operators immediate visual feedback.

**Three new Customiser sections:**
- `Sgs_Header_Customiser` → Customiser section "SGS Header" with `postMessage` live preview for colours/typography/spacing
- `Sgs_Footer_Customiser` → Customiser section "SGS Footer" with `postMessage` live preview
- `Sgs_Site_Info_Customiser` → Customiser section "SGS Site Info" — for simple fields, `postMessage`; for rules engines (regex-backed conditions), `refresh` transport (live preview impractical)

**WP 7.0 View Transitions (Decision 27):** When these sections land, call `wp_enqueue_view_transitions_admin_css()` so navigation between Customiser panels gets native smooth transitions. Phase 5b implementer MUST verify this function fires in Customiser context (not just standard admin); if it doesn't, fall back to manual `customize_controls_enqueue_scripts` hook emitting the transitions CSS directly.

**Preserved infrastructure (NOT Customiser-migrated):**
- WP-CLI command surface (all 12 `wp sgs` commands stay as-is)
- `Sgs_Header_Rules` + `Sgs_Footer_Rules` PHP classes (data layer unchanged)
- `Sgs_Site_Info` PHP class + `sgs/site-info` block bindings source (unchanged)
- The existing admin pages stay until Phase 5b ships (no "retire before replacement" pattern)

**Cross-reference:** Spec 18 (`specs/18-SGS-FLOATING-UI.md`) is the canonical reference for how to register an SGS Customiser section — `Sgs_Floating_UI_Customiser` is the pattern to follow for `postMessage` transport + `wp_options` backing + capability gating.

---

## §S8 Two-Axis Style Variations (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.4)

The `styles/colours/` and `styles/typography/` axis split is retired along with the entire WP style-variation system (Decision 18). The 16 axis files and 8 updated bundled files described in FR-S8-1 and FR-S8-2 are deleted. Per-site branding now lives in `sites/<client>/theme-snapshot.json` (Decision 19).

---

*End of Spec 17 v3. Architecture staging doc decisions applied 2026-05-21.*


---

## Phase 2A Additions (2026-05-20 — commits a7f85a4a / 9a6808d5 / 0201c0d9)

### Behaviour layer (resolves Spec 17 §S3 visual variants gap)

The header rule engine routes a pattern slug. Phase 2A adds an orthogonal behaviour axis: transparent / sticky / hide-on-scroll-down. Stored on the rule as behaviour key alongside pattern_slug + conditions.

Injection strategy: body_class (FINAL). Two earlier attempts using pre_render_block short-circuit + render_block_core/template-part failed because:
1. Sgs_Header_Rules::filter_template_part short-circuits pre_render_block with content that has no header tag — regex injection found nothing to inject into.
2. When pre_render_block returns non-null, WP core skips both the render_callback wrapper AND the render_block filter chain.

The body_class strategy bypasses the entire short-circuit chain:
- add_filter body_class walks Sgs_Header_Rules::list_rules + rule_matches to find the active rule
- Appends 3 classes: sgs-has-header (always, stable cloning-recogniser hook) + sgs-has-header-behaviour (when ANY behaviour matches) + sgs-header-behaviour-{slug} (specific behaviour)
- CSS targets body.sgs-header-behaviour-* header.wp-block-template-part
- JS reads behaviour from body class regex, toggles body.is-header-scrolled + body.is-header-scrolling-down for state

Specificity fix: Some WP core rule wins specificity for position and top on .wp-block-template-part. Resolved with !important on those two properties only (z-index won naturally).

Verified live on sandybrown (2026-05-20): header_position sticky, header_top 0px, scroll_padding_top 80px (WCAG 2.4.11 fix), --sgs-header-height 80px (ResizeObserver publisher).

### WCAG 2.4.11 mitigation (no competitor solves this fully)

view.js runs a ResizeObserver on header.wp-block-template-part publishing --sgs-header-height to root + body. header-behaviours.css consumes it via root scroll-padding-top. Anchor link clicks now land BELOW the sticky header (the F110 failure none of Kadence/Spectra/GenerateBlocks/Astra/Blocksy solve cleanly).

### Files

- plugins/sgs-blocks/includes/class-sgs-header-behaviours.php — body_class filter + asset enqueuer
- plugins/sgs-blocks/assets/css/header-behaviours.css — behaviour CSS + scroll-padding-top
- plugins/sgs-blocks/src/header-behaviours/view.js — ResizeObserver + scroll listener
- plugins/sgs-blocks/tests/php/HeaderBehavioursTest.php — body_class strategy tests

### Pattern fate (decision pending)

The 3 framework-header stub patterns (framework-header-transparent, -sticky, -shrink) all delegate 100% to default. Now that behaviour layer attaches via body_class, the stubs are byte-identical to default + a behaviour rule. Branch J audit recommendation: delete the 3 stubs. Operator workflow becomes pure: SGS to Header Rules + behaviour dropdown. Decision needs Bean confirmation — see reports/2026-05-20-framework-header-stub-audit.md for trade-offs.

---

## 2026-05-20 — Structural enforcement (defence-in-depth): P2.0 + P2.i

After 5 occurrences of header/footer/nav being scaffolded as Gutenberg blocks (blub.db row 274), single-layer enforcement insufficient. Two-layer defence shipped this session:

**Tool layer (P2.0, commit `8838b6fb`):** `.claude/hooks/no-header-footer-block.py` PostToolUse hook hard-rejects `Write|Edit` on `plugins/sgs-blocks/src/blocks/(header|footer|nav)/`. Path-anchored regex with `(/|$)` boundary; does NOT block legitimate template-part edits at `theme/sgs-theme/parts/header.html`, plugin-side files like `includes/class-sgs-header-rules.php`, or CSS files with "header" in their name.

**Source layer (P2.i, commit `3a70587c`):** `_is_chrome_section()` in Stage 9b autonomy chain detects chrome at 4 boundary signal levels (slug / selector tag / class BEM root / section_id). Chrome sections surface as `unmatched-chrome-skipped` in stage-9b.json output instead of triggering the scaffolder.

This is the canonical pattern: tool-layer hook is the safety net; source-layer chrome-skip prevents the autonomy chain from CAUSING the anti-pattern. Both fail-independent.
