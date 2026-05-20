---
doc_type: spec
spec_version: 17
revision: 2
project: small-giants-wp
title: Header/Footer Architecture (WP 6.9 canonical, per-site)
date: 2026-05-19
status: council-passed-ready-to-implement
input_brief: .claude/plans/strategy/2026-05-19-header-footer-research-brief.md
council_outcome: .claude/reports/council-outcome-spec-17.md
parent_session: small-giants-wp-2026-05-19-phase-9b-foundation
scope: v1-full (foundation + conditional headers + CPT-based advanced headers)
target_wp_version: "6.9"
target_php_version: "8.0+"
companion_docs:
  - .claude/CLAUDE.md
  - .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
  - .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md
update_triggers:
  - architectural_change
  - fr_addition
  - council_revision
---

# Spec 17 v2 — Header/Footer Architecture (per-site, variation-aware, operator-editable)

## 0. One-liner

A single WP 6.9 architecture for header + footer template parts that gives every SGS client site a correct initial layout (driven by its active style variation), with site-specific data (logo, business info, social links) flowing in automatically from a single global store, while leaving every operator free to edit, replace, or revert via the Site Editor.

## 1. Who this is for

| Audience | What they get |
|----------|--------------|
| **Site owners (non-coders)** | One screen for business data; visible result on every page; pattern-swap via Site Editor "Replace" toolbar; inline edit any block; never lose work to a re-clone |
| **SGS framework maintainers** | One canonical mechanism; no client-specific code in framework files; lint guards regressions |
| **AI cloning pipeline (`/sgs-clone`)** | Deterministic landing target via WP-CLI; idempotent re-clone via `_sgs_cloned_from_pattern_slug` post meta |
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

## 3. Architecture in one paragraph

WP 6.9 already provides every primitive needed. The framework `parts/header.html` and `parts/footer.html` files contain a single `wp:pattern` reference each — the real markup lives in registered block patterns. Each pattern declares `blockTypes: ['core/template-part/header']` (or `footer`), surfacing it in the Site Editor's native "Replace" picker. When an operator activates a style variation in the Site Editor's Styles panel, the `save_post_wp_global_styles` action hook fires. SGS reads the active variation by parsing the `wp_global_styles` post directly (NOT via the private-ish `WP_Theme_JSON_Resolver` API), looks up the matching header + footer patterns, and writes their content into `wp_template_part` post records via `wp_insert_post()` with the correct `wp_template_part_area` taxonomy assignment. Each seeded record carries `_sgs_cloned_from_pattern_slug` post meta — re-clones gate on this for idempotence; operator-edited records have no such meta and are preserved. Site-specific data (logo, phone, email, address, opening hours, socials, copyright) is referenced via WordPress block bindings; the binding source `sgs/site-info` reads from a single global SGS Site Info store kept in `wp_options`. The operator manages that store through one admin page at *Appearance → SGS Site Info*. Empty bindings render friendly hints with deep-links to the admin page. Multi-site isolation is automatic via WordPress's per-site `wp_options` and `wp_template_part` storage. Layout swap, content edit, and "revert to default" all remain available via the Site Editor.

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

# 6. Spec sections (8 total)

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
- v1 pattern bodies defer to `sgs/framework-header-default` content with a `// TODO: variant-specific markup, v1.1` comment
- Site Editor "Replace" picker shows all 4 + any client headers

**Model:** Sonnet
**Tests:** `ls parts/header*.html` returns 4; pattern registry returns 4 non-null entries; Playwright opens picker, sees 4 framework + N client patterns.
**Depends on:** FR-S1-1
**Universal-benefit:** Yes

---

## §S2 — Style Variation → Template Part Linkage

**Plain English:** Activating a style variation seeds the matching header/footer pattern into `wp_template_part` DB records. Slug comparison + transient lock guard against races. Per-record post meta marks pipeline-generated content for safe re-clones. Resolves gap #1.

### FR-S2-1 — `save_post_wp_global_styles` triggers seeding (slug comparison + transient lock)

**Behaviour:** Hook into `save_post_wp_global_styles`. Read the active style variation by parsing the `wp_global_styles` post content directly (`get_posts(['post_type' => 'wp_global_styles'])` → `json_decode($post->post_content)`) — NOT via private resolver API. Check variation manifest for matching pattern slugs. Write pattern content into `wp_template_part` records via `wp_insert_post()`. Guard logic uses SLUG COMPARISON, not timestamps (**M3**).

**Acceptance criteria:**
- Hook fires only when `_sgs_last_seeded_variation` post meta on the `wp_template_part` record differs from the new active variation slug (**M3 + Council A3**)
- A 5-second transient `sgs_seeding_in_progress` locks the seeding function entry point against concurrent REST autosave events (**M3**)
- Capability gate: `current_user_can('edit_theme_options')` always checked
- Variation read path documented with two layers: (a) preferred — `WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles()`; (b) fallback if signature changes — direct `get_posts` + `json_decode`
- If variation manifest has no `headerPattern` or `footerPattern`, fall back to framework defaults from §S1; log structured notice
- All writes wrapped try/catch; failures `error_log` and do not break variation save
- Each seeded record carries `_sgs_last_seeded_variation` + `_sgs_last_seeded_at` + `_sgs_cloned_from_pattern_slug` post meta (FR-S7-4)
- All three post-meta keys registered via `register_post_meta` with `auth_callback => fn() => current_user_can('edit_theme_options')` (**M4 + Council C1**)

**Model:** Opus
**Tests:** Mock variation switch asserts slug-comparison passes/fails correctly; concurrent REST POST test asserts exactly one seeding outcome (transient lock works); end-to-end variation activation lands the right pattern; spurious save events do not trigger seeding.
**Depends on:** FR-S2-2, FR-S2-3, §S4, FR-S7-4
**Universal-benefit:** Yes

### FR-S2-2 — Style variation manifest declares header + footer patterns

**Behaviour:** Each variation JSON gets `settings.custom.sgs = { "headerPattern": "<slug>", "footerPattern": "<slug>" }`. Values sanitised against `WP_Block_Patterns_Registry`.

**Acceptance criteria:**
- All current variations (`mamas-munches.json`, `indus-foods.json`, `helping-doctors.json`) extended
- Variations without the field fall back to framework defaults
- Read path: parse JSON file directly OR via `WP_Theme_JSON_Resolver::get_theme_data()` — spec confirms round-trip
- Theme-validity check still passes

**Model:** Sonnet
**Tests:** JSON parse + structural assertion; theme validity unchanged; integration test with each variation.
**Depends on:** §S6
**Universal-benefit:** Yes

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

### FR-S5-2 — Style variation picker UI (retires `active_theme_style` theme_mod; never accepts post_id from user input)

**Behaviour:** Dropdown of registered variations. "Activate" button POSTs nonce; activation writes to `wp_global_styles` via `wp_update_post()` — but post ID is HARD-CODED (looked up via the resolver), never accepted from form POST (**Council N1**). Legacy `active_theme_style` theme_mod migrated to new mechanism on plugin activation.

**Acceptance criteria:**
- Dropdown sourced from `WP_Theme_JSON_Resolver::get_style_variations()`
- POST handler has: nonce check + capability check + DOES NOT read `post_id` from `$_POST` (lookup hard-coded; **Council N1**)
- `save_post_wp_global_styles` fires (verify via test that the FR-S2-1 seeding triggers)
- Legacy `active_theme_style` theme_mod backed up to `sgs_legacy_theme_mods_backup` (1 release cycle) then deleted
- Migration reversible via WP-CLI

**Model:** Opus
**Tests:** Dropdown lists all variations; POST without nonce → 403; POST with injected `post_id` → still writes to correct `wp_global_styles` record (input ignored); seeding fires post-activation; legacy theme_mod migrated cleanly.
**Depends on:** FR-S2-1
**Universal-benefit:** Yes

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

---

*End of Spec 17 v2. Council-approved. Ready for parallel-subagent implementation.*


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
