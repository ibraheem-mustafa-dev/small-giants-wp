# Phase 7 Skills Audit — WP 7.0 Alignment

Generated: 2026-05-22
Source-of-truth: developer.wordpress.org/reference/since/7.0.0/, make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/, make.wordpress.org/core/2026/02/23/changes-to-the-interactivity-api-in-wordpress-7-0/
Audit dispatched: Phase 7 Step 7.2 (audit-only pass — NO edits to skill files in this dispatch)

---

## TL;DR

- **10 of 10 skills audited** — all exist at BOTH `~/.claude/skills/<name>/SKILL.md` AND `~/.agents/skills/<name>/SKILL.md` (identical content, mirror copies)
- **Cost split: LOW=4, MED=4, HIGH=2**
- **HIGH-cost items (recommend Phase 7b):**
  - `wp-rest-api` — three new WP 7.0 controller classes absent from the skill; one patterns section needs rewrite
  - `wp-block-themes` — pseudo-element support in theme.json, preset dimensions, Font Library page UX, Site Identity in Design panel, per-site theme.json model all absent; theme.json v2/v3 feature map needs a v3+ row for WP 7.0 additions

---

## Per-skill findings

### 1. wp-block-development

- **Path:** `~/.claude/skills/wp-block-development/SKILL.md` (280 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Covers block.json structure, `useBlockProps`, `get_block_wrapper_attributes()`, Block Bindings API (WP 6.5+), `wp_block_bindings_register_source`. No inline code examples for apiVersion 3 iframe behaviour, `role:content`, or `listView` support.
- **Deprecated APIs referenced:** None found — the skill does not reference any function from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **`role: "content"` attribute** — not mentioned. Required for nested `contentOnly` pattern blocks in WP 7.0. Stage 3 "Pick the right block model" section needs a note.
  - **`listView: true` block support** — not mentioned. New in WP 7.0 (`supports.listView: true` surfaces a dedicated List View tab for blocks with InnerBlocks).
  - **`@wordpress/grid` package** — not mentioned. New grid block from WP 7.0 core; blocks built with InnerBlocks columns need to document how grid support interacts.
  - **Iframed editor — always on in WP 7.0 for `apiVersion: 3` blocks** — Stage 2 does say "WordPress 7.0 will run the post editor in an iframe regardless of block apiVersion" (written from a pre-7.0 perspective). Now that 7.0 is live, the framing should be updated from future tense ("will") to present fact ("does"). The warning about scripts missing from the iframe is accurate but could be made more actionable.
  - **PHP-only block registration (`supports.autoRegister: true`)** — WP 7.0 added `autoRegister: true` in `supports` for blocks that need no editor JS. Skill does not mention this mechanism at all. Stage 3/5 should note this pattern.
  - **Pseudo-element theme.json support** — theme.json-level concern but block.json's `styles` section can reference pseudo-elements in WP 7.0 via `:hover`/`:focus`. Warrants a note cross-linking `wp-block-themes`.
- **Stale 6.x patterns:** Stage 2 phrase "WordPress 7.0 will run the post editor in an iframe" — written as a future statement (authored pre-7.0). Minor but should read "WordPress 7.0 runs the post editor in an iframe."
- **Cost: LOW**
- **Recommended action:** Update Stage 2 from future to present tense (1 line). Add a bullet to Stage 3 for `role: "content"` (1–2 sentences + example). Add `listView: true` to the block.json field reference. Add PHP-only `autoRegister` note to Stage 5. Cross-link pseudo-element support to `wp-block-themes`. Estimated: 10 min.

---

### 2. wp-block-themes

- **Path:** `~/.claude/skills/wp-block-themes/SKILL.md` (246 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** theme.json v2/v3 feature map table is the only structured reference. Mentions Block Hooks (WP 6.5+). No code examples for pseudo-element styles, preset dimensions, or Font Library.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **Pseudo-element styles in theme.json** — `:hover`, `:focus`, `:focus-visible`, `:active` now supported in `styles.blocks` and `styles.elements`. Not mentioned anywhere in the skill. The v2/v3 feature map table only goes to WP 6.6. WP 7.0 adds a new row.
  - **Preset dimensions** — WP 7.0 adds dimension presets (height/width controls as `settings.dimensions.presets`). Not in skill.
  - **Per-site theme.json model (Phase 5a)** — SGS Phase 5a shipped a per-site `theme-snapshot.json` model replacing the style-variation overlay. The skill's Stage 7 section on style variations is now partially stale for SGS projects (the skill is general WP, but the SGS CLAUDE.md notes the architecture decision). This is SGS-specific and should be noted as an SGS caveat, not a general WP change.
  - **Font Library dedicated management page** — WP 7.0 promotes Font Library to a dedicated admin page (`Appearance > Fonts`). Skill mentions fonts only via `theme.json`'s `fontFamilies` array. A note on the dedicated page UX is missing.
  - **Site Identity in Design panel** — WP 7.0 moves Site Identity controls into the Site Editor's Design panel. Skill doesn't cover this at all.
  - **v2/v3 feature map needs a v4+ row** — WP 7.0's theme.json additions (pseudo-elements, dimension presets) should appear in the feature map table. Currently the table ends at v3 (WP 6.6+).
- **Stale 6.x patterns:** The v2/v3 table is accurate but incomplete for 7.0.
- **Cost: HIGH**
- **Recommended action:** Expand the v2/v3 feature map table to add a "WP 7.0+" column covering pseudo-elements and dimension presets. Add a Stage 4.5 or note under Stage 4 covering pseudo-element theme.json syntax with a code example. Add a note on Font Library page UX in Stage 4. Add Site Identity/Design panel move in Stage 3 or 4. This involves writing 2–3 new code examples, verifying them on the WP 7.0 dev site, and expanding the table. Estimated: 30–45 min.

---

### 3. wp-interactivity-api

- **Path:** `~/.claude/skills/wp-interactivity-api/SKILL.md` (289 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Strong inline examples for `store()`, `getContext()`, `getElement()`, `wp_interactivity_state()`, `wp_interactivity_data_wp_context()`. FAQ block worked example is comprehensive.
- **Deprecated APIs referenced:**
  - Stage 4 mentions: "WP 7.0: `useSignalEffect` replaces some `useEffect` patterns." — `useSignalEffect` is the correct WP 7.0 API name but needs more specificity.
  - Stage 4 correctly flags `data-wp-bind` functions as deprecated in WP 6.8 and `data-wp-ignore` as deprecated in WP 6.9.
  - **`state.navigation.hasStarted` / `state.navigation.hasFinished`** — deprecated in WP 7.0 (`core/router` store). Not mentioned in the skill at all.
- **Missing WP 7.0 items:**
  - **`watch()` function** — new in WP 7.0. "Subscribes to changes in any reactive value accessed inside a callback — reruns anytime those values change." Returns an `unwatch` callback. The skill has no mention of `watch()` or its companion DOM directive `data-wp-watch`. Stage 4 notes "WP 7.0: `useSignalEffect` replaces some `useEffect` patterns" but `watch()` is the canonical new primitive — this is the gap. `useSignalEffect` is correct but less prominent than `watch()`.
  - **`data-wp-watch` directive** — new DOM directive paired with `watch()`. Not in the directives quickref or the Stage 4 version-changes table.
  - **`state.url` server-side population** — `state.url` in `core/router` is now populated server-side during directive processing. Previously required client-side guard. Not mentioned.
  - **`state.navigation` deprecation** — `state.navigation.hasStarted` / `state.navigation.hasFinished` are deprecated in WP 7.0. Not mentioned.
- **Stale 6.x patterns:** Stage 4's WP 7.0 line is incomplete (mentions `useSignalEffect` but misses `watch()`, `data-wp-watch`, `state.navigation` deprecation, `state.url` server population).
- **Cost: MED**
- **Recommended action:** Add `watch()` and `data-wp-watch` as a new sub-section in Stage 4 with a code example (the reactive `state.url` tracking pattern is the canonical example). Add deprecation notice for `state.navigation.hasStarted/hasFinished` in Stage 4's WP 7.0 bullet. Add `state.url` server-population note to Stage 3 (SSR section). Update the Common Mistakes table. Estimated: 15–20 min including a working code example tested on dev site.

---

### 4. wp-plugin-development

- **Path:** `~/.claude/skills/wp-plugin-development/SKILL.md` (252 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Covers Settings API, lifecycle hooks, PHPStan, PHPCS, i18n. No code for AI Connectors registration or Script Module translations.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`. HTML5 script theme support was removed in WP 7.0 (deprecated earlier); the skill doesn't reference `add_theme_support('html5', ...)` patterns, so no stale reference.
- **Missing WP 7.0 items:**
  - **AI Connectors registration pattern** — WP 7.0 ships `wp_connectors_init` hook and `wp_get_connector()` / `wp_get_connectors()` / `wp_is_connector_registered()`. Plugins that provide AI features should register via this hook. Not mentioned anywhere in the skill. The `Sgs_Ai_Connector` class (shipped in Step 7.1) is the canonical SGS example of this pattern.
  - **Script Module translations** — WP 7.0 adds `wp_set_script_module_translations()` (parallel to `wp_set_script_translations()` for ES modules). Plugins using `viewScriptModule` in block.json need this for i18n. Not mentioned in Stage 2 (i18n section) or the tooling stage.
  - **`WP_REST_Icons_Controller`** — new in WP 7.0. Plugins registering custom icons (for the new Icons block or SVG registries) interact with this controller. Scope is narrow — only relevant for icon-heavy plugins.
  - **PHP 7.4 minimum** — WP 7.0 raised minimum PHP to 7.4. The skill's `compatibility` frontmatter says "PHP 7.2.24+" which is now stale.
- **Stale 6.x patterns:** `compatibility: "PHP 7.2.24+"` in frontmatter — WP 7.0 requires PHP 7.4+.
- **Cost: LOW**
- **Recommended action:** Update frontmatter `compatibility` to PHP 7.4+. Add a bullet to Stage 2 i18n section for `wp_set_script_module_translations()` (2 lines + example). Add a new Stage 8.5 or note within Stage 6 for AI Connectors registration pattern (reference `Sgs_Ai_Connector` as the SGS example). The `WP_REST_Icons_Controller` note can be a single sentence in Stage 3 or the escalation section. Estimated: 10–15 min.

---

### 5. wp-rest-api

- **Path:** `~/.claude/skills/wp-rest-api/SKILL.md` (190 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Covers `register_rest_route()`, `WP_REST_Controller`, capability-gated CPT REST (Spec 17 pattern), Block Bindings. Worked example is implicit. No code for any WP 7.0 controllers.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **`WP_REST_Icons_Controller`** — new in WP 7.0. "REST endpoint for the editor to read registered icons." Relevant when a plugin registers icons for the Icons block (new in WP 7.0). Not mentioned.
  - **`WP_Sync_Post_Meta_Storage`** — new in WP 7.0. Collaborative editing infrastructure — "syncing storage" for real-time collaboration via Yjs CRDT. Relevant for plugins building collaborative features. Not mentioned.
  - **`WP_REST_Abilities_V1_List_Controller`** — new REST controller for the Abilities API. The skill cross-references `wp-abilities-api` implicitly but doesn't document this controller or its route (`/wp-json/wp-abilities/v1/`). The Abilities API is now stable in WP 7.0 — documenting its REST surface belongs here.
  - **Capability-gated CPT REST section** — present and correct (Spec 17 Council M1 pattern), BUT the `capabilities` array in the example lists meta-caps (`edit_post`, `delete_post`, `read_post`) which triggers `_doing_it_wrong` in WP 7.0 when `map_meta_cap: true`. This is captured in MEMORY.md (`feedback_cpt_capabilities_array_primitives_only.md`) but the skill's code example has not been corrected.
- **Stale 6.x patterns:**
  - The CPT REST capability-gated example (`show_in_rest: true` + `capabilities` map) lists `'edit_post' => 'edit_theme_options'` etc. — these are meta-caps and cause `_doing_it_wrong` warnings in WP when `map_meta_cap: true` is set. The skill's own MEMORY.md feedback (`feedback_cpt_capabilities_array_primitives_only.md`) documents the fix but the skill hasn't been updated to reflect it.
- **Cost: HIGH**
- **Recommended action:** Fix the CPT REST capabilities array example to use primitives only (removes stale/buggy pattern — HIGH priority because the current example causes warnings on WP 7.0). Add a section on `WP_REST_Icons_Controller` (what it does, when to use it). Add a note on `WP_REST_Abilities_V1_List_Controller` with cross-link to `wp-abilities-api`. Add a brief note on `WP_Sync_Post_Meta_Storage` for plugin authors building collaborative features. The CPT fix alone is MED; combined with 3 new sections, estimated: 30–40 min including live-code verification.

---

### 6. wp-wpcli-and-ops

- **Path:** `~/.claude/skills/wp-wpcli-and-ops/SKILL.md` (202 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Strong `wp sgs` CLI surface documentation (Spec 17 FR-S5-3) — 12 commands, capability gate, seeder safety. Standard WP-CLI operation patterns are procedure-reference rather than inline code. No inline examples for WP 7.0-specific commands.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **`wp sgs` CLI surface** — this IS present and well-documented (Spec 17 FR-S5-3 section). 12 commands with capability table, gotchas, and examples. This was the primary WP 7.0 checklist item for this skill and it is complete.
  - **WP-CLI handbook updates for WP 7.0** — WP 7.0 raised the PHP minimum to 7.4. The skill's frontmatter says "PHP 7.2.24+" — stale, same as `wp-plugin-development`.
  - **`wp connector` surface** — WP 7.0's Connectors API may expose a `wp connector` WP-CLI command (not confirmed via docs, but consistent with WP-CLI convention). Worth a note to verify and document if present.
  - **`wp abilities` surface** — same: Abilities API may have WP-CLI commands. Not documented.
- **Stale 6.x patterns:** `compatibility: "PHP 7.2.24+"` in frontmatter.
- **Cost: LOW**
- **Recommended action:** Update frontmatter `compatibility` to PHP 7.4+. Add a note to check for `wp connector` and `wp abilities` CLI sub-commands (quick `wp help connector` to verify existence on WP 7.0 dev site). The `wp sgs` section is complete and correct — no changes needed there. Estimated: 5 min.

---

### 7. wp-performance

- **Path:** `~/.claude/skills/wp-performance/SKILL.md` (285 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** WP 6.9 performance notes section is present (8 bullet points — on-demand CSS, inline CSS limit, fetchpriority, WP-Cron at shutdown). No WP 7.0 section.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **Iframed editor performance impact** — WP 7.0 enforces the iframed editor for all apiVersion 3 blocks. Any block scripts enqueued via `admin_enqueue_scripts` that targeted editor DOM will now silently fail (they run in the outer frame, not the iframe). The correct hook is `enqueue_block_editor_assets`. This is a performance-correctness concern, not just a perf optimization. The Code Review scan patterns should flag `admin_enqueue_scripts` used for editor-targeting code.
  - **Script Module loading changes** — WP 7.0 adds `wp_set_script_module_translations()`. The performance note here: script modules load natively as ES modules (deferred by default, no parser blocking). Blocks using `viewScriptModule` should NOT use `defer`/`async` attributes on the module script — they're already non-blocking. The warning pattern in Stage 1.4 about "missing `defer`/`async`" should exempt `viewScriptModule` entries.
  - **View Transitions CSS cost** — WP 7.0 ships `wp_enqueue_view_transitions_admin_css()` for admin view transitions. These add a small CSS payload. For frontend themes, view transitions via `@view-transition: auto` have a CPU cost during navigation. Not mentioned.
  - **Client-side image processing** — WP 7.0 moves image resizing/compression client-side before upload (80% server CPU reduction on upload). Performance note for media-heavy sites.
  - **WP 7.0 performance notes section absent** — the skill has a "WordPress 6.9 Performance Notes" section but no WP 7.0 equivalent.
- **Stale 6.x patterns:** `compatibility: "PHP 7.2.24+"` in frontmatter. "WordPress 6.9 Performance Notes" section — accurate but now outdated as the latest version note.
- **Cost: MED**
- **Recommended action:** Update frontmatter `compatibility` to PHP 7.4+. Add a "WordPress 7.0 Performance Notes" section mirroring the 6.9 format (iframed editor enqueue impact, Script Module loading behaviour, View Transitions CSS cost, client-side image processing). Add a note to Stage 1.4 (JS scan) exempting `viewScriptModule` entries from the `defer/async` warning. Estimated: 15–20 min.

---

### 8. wp-abilities-api

- **Path:** `~/.claude/skills/wp-abilities-api/SKILL.md` (134 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** No inline code examples — skill is procedure-only. References `references/php-registration.md` and `references/rest-api.md` for implementation detail. Good structure for Stage 1–6 workflow.
- **Deprecated APIs referenced:** None.
- **Missing WP 7.0 items:**
  - **Canonical version note** — the skill's `compatibility` frontmatter says "Targets WordPress 6.9+" but the Abilities API is now confirmed stable and canonical in WP 7.0. Stage 1 says "If the project targets WP < 6.9, you may need the Abilities API plugin/package" — this should be updated: WP 7.0 is the canonical version; 6.9 had a preview; anything before 6.9 needs the plugin.
  - **`WP_REST_Abilities_V1_List_Controller`** — new class in WP 7.0 providing schema utilities for the Abilities API REST surface. Stage 5 (REST exposure) doesn't name this class.
  - **`@wordpress/core-abilities` package** — WP 7.0 ships `@wordpress/core-abilities` (separate from the generic `@wordpress/abilities` package) for REST API integration on the client side. Stage 6 only mentions `@wordpress/abilities`. The distinction matters for blocks that check abilities at render time.
  - **MCP Adapter** — WP 7.0 ships an MCP Adapter that exposes Abilities to external AI agents via `/wp-json/mcp/v1/`. Directly relevant to this skill's domain but not mentioned.
  - **`using_model_preference()` function** — new helper for Abilities API integration with AI Connectors in WP 7.0. Not mentioned.
- **Stale 6.x patterns:** No stale code examples (no inline code). Stage 1 version framing is slightly stale.
- **Cost: LOW**
- **Recommended action:** Update Stage 1 to state WP 7.0 is the canonical stable version; 6.9 had preview availability; pre-6.9 requires the Abilities API plugin. Add `WP_REST_Abilities_V1_List_Controller` to Stage 5 with a 1-sentence description. Add `@wordpress/core-abilities` to Stage 6 alongside `@wordpress/abilities` with a note on when to use each. Add an MCP Adapter note (1 paragraph). Estimated: 10 min.

---

### 9. wp-site-extraction

- **Path:** `~/.claude/skills/wp-site-extraction/SKILL.md` (343 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** Strong SSH/WP-CLI examples for Astra, theme.json, FSE themes, Playwright computed-CSS extraction. Extraction workflow is comprehensive (10 stages). No mention of apiVersion 3 or `role:content` in block parsing.
- **Deprecated APIs referenced:** None from `deprecated-7.0/`.
- **Missing WP 7.0 items:**
  - **`apiVersion: 3` in extracted block.json shapes** — Stage 5 parses raw block content (`post_content`) and documents block types, inline styles, class names. WP 7.0 sites will have `apiVersion: 3` blocks whose iframed-editor behaviour differs. Extraction output should note the apiVersion when parsing extracted block.json shapes, as this affects how to replicate them in the SGS clone pipeline.
  - **`role: "content"` attribute in pattern block extraction** — when extracting a site built with WP 7.0 `contentOnly` patterns, nested blocks that lack `role: "content"` will be locked (not editable in the editor). Stage 5's block parsing guidance doesn't mention this attribute. Extraction should flag missing `role: "content"` as a potential lock issue when replicating the pattern in SGS.
  - **Icons block** — WP 7.0 ships a native Icons block. Stage 5's block type recognition list doesn't include it (implicitly, since it's a "common blocks to look for" pattern). Minor but worth a note.
  - **Heading variations** — WP 7.0 converts H1-H6 heading levels from a `level` attribute to registered block variations. Extraction parsing of heading blocks should be updated to handle this shape change.
- **Stale 6.x patterns:** Stage 5's block parsing narrative assumes `level` attribute on heading blocks — WP 7.0 shifts this to variations. No explicit stale code but the mental model is 6.x.
- **Cost: MED**
- **Recommended action:** Add a note in Stage 5 about WP 7.0 block shape changes: `apiVersion: 3` flag to capture, `role: "content"` attribute significance for pattern extraction, and heading variation shape change. Add Icons block to the list of block types to recognise. These are additive — no existing code changes. Estimated: 10–15 min.

---

### 10. wp-project-triage

- **Path:** `~/.claude/skills/wp-project-triage/SKILL.md` (81 lines, mirrored to `~/.agents/skills/`)
- **Current code examples:** No inline code — entirely procedure-based. Stage 0 runs `detect_wp_project.mjs`. Stage 1 classifies output. Stage 2 routes to correct skill.
- **Deprecated APIs referenced:** None.
- **Missing WP 7.0 items:**
  - **WP 7.0 as new baseline** — the skill's `compatibility` field says "Targets WordPress 6.9+" — now outdated. Live dev site is WP 7.0. Baseline should update.
  - **iframed editor breakage detection** — `detect_wp_project.mjs` should emit a signal if blocks are using `admin_enqueue_scripts` to target editor DOM (a WP 7.0 breakage pattern). Not currently a triage signal.
  - **missing `role:content` detection** — triage should flag contentOnly patterns that contain nested blocks lacking `role: "content"` — these will be uneditable in WP 7.0's editor. No existing signal.
  - **deprecated APIs in scanned files** — triage currently does not scan for deprecated-7.0 function calls. A grep against the deprecated-7.0 list would add a `signals.hasDeprecated70Apis` flag to the JSON output.
  - **`apiVersion < 3` detection** — the detector script should flag blocks still using apiVersion 1 or 2, which now trigger console warnings in WP 7.0's always-iframed editor.
  - **`compatibility` frontmatter** — "PHP 7.2.24+" is stale; WP 7.0 requires PHP 7.4+.
- **Stale 6.x patterns:** `compatibility: "PHP 7.2.24+"`. No stale code (no inline examples).
- **Cost: MED**
- **Recommended action:** Update frontmatter `compatibility`. Update `detect_wp_project.mjs` to emit: (a) `signals.hasApiVersionBelow3: bool` — flags blocks with apiVersion < 3; (b) `signals.hasAdminEnqueueEditorTargeting: bool` — flags use of `admin_enqueue_scripts` for editor DOM in a WP 7.0 context; (c) `signals.hasDeprecated70Apis: bool` — grep for known deprecated-7.0 function names. Add a note in Stage 1 CLASSIFY about these new signals. Estimated: 15–20 min to update the detector script + SKILL.md.

---

## Recommendations

### Phase 7a — Update inline in this session (LOW + MED cost skills)

| Skill | Cost | Why inline |
|-------|------|------------|
| `wp-block-development` | LOW | 5–6 targeted additions; no code example rewrite |
| `wp-plugin-development` | LOW | 2 targeted additions + frontmatter; no structural change |
| `wp-wpcli-and-ops` | LOW | Frontmatter fix + 2 verify-and-note items |
| `wp-abilities-api` | LOW | 4 targeted additions; no existing code to rewrite |
| `wp-interactivity-api` | MED | `watch()` + `data-wp-watch` code example needed; straightforward and well-scoped |
| `wp-performance` | MED | WP 7.0 notes section addition; mirrors 6.9 format |
| `wp-site-extraction` | MED | Additive notes in Stage 5; no existing code changes |
| `wp-project-triage` | MED | Detector script additions; concrete and well-defined |

### Phase 7b — Defer (HIGH cost skills)

| Skill | Cost | Why defer |
|-------|------|-----------|
| `wp-block-themes` | HIGH | 3 new code examples for pseudo-elements/dimensions/Font Library, expand feature map table, verify each on WP 7.0 dev site — >30 min work |
| `wp-rest-api` | HIGH | Fix buggy CPT capabilities array example (live-tested), add 3 new controller sections, verify `WP_REST_Icons_Controller` on WP 7.0 dev site — >30 min work |

**Priority within Phase 7b:** `wp-rest-api` is higher priority because it contains an actively buggy code example (`capabilities` map with meta-caps + `map_meta_cap: true` causes `_doing_it_wrong` warnings on WP 7.0). This is captured in MEMORY.md but not yet reflected in the skill.

---

## PHP-only block registration candidates

WP 7.0 adds `supports.autoRegister: true` for blocks that need no editor JS surface (no `edit.js`). Criteria: no `edit.js` + server-rendered only.

After scanning all SGS blocks under `plugins/sgs-blocks/src/blocks/`:

**None qualify.** Every SGS block that has a `render.php` also has an `edit.js` editor component. All 44+ audited blocks have an editor JS surface. The `extensions/` directory has neither `edit.js` nor `render.php` (it is a non-block utilities directory).

**Conclusion:** No SGS blocks are candidates for PHP-only registration under WP 7.0's `autoRegister: true` pattern. This finding is listed only — no conversions recommended or required.

---

## Deprecated APIs cross-reference

Functions deprecated in WP 7.0 (`deprecated-7.0/`) — checked against all 10 skills:

| Deprecated item | Referenced in any skill? | Notes |
|----------------|--------------------------|-------|
| `state.navigation.hasStarted` / `state.navigation.hasFinished` | NO | Should be in `wp-interactivity-api` |
| HTML5 script theme support | NO | Was a classic-theme concern; `wp-block-themes` doesn't reference it |
| `add_theme_support('html5', ['script', 'style'])` for script loading | NO | Removed in WP 7.0; none of the skills use this pattern |
| Title attributes on author link functions | NO | Not relevant to any of the 10 skills |
| `DataViews` `groupByField` string (replaced with `groupBy` object) | NO | Admin UI concern; not in scope of these skills |

**Good news:** No skill directly references any WP 7.0 deprecated function. The risks are absence-of-new-APIs rather than presence-of-stale-APIs.

---

## Notes on canonical skill location

All 10 skills exist at BOTH `~/.claude/skills/<name>/SKILL.md` AND `~/.agents/skills/<name>/SKILL.md` with identical line counts (confirmed via `wc -l`). They are mirror copies. Updates must be applied to both locations (or the mirroring process re-run after updating `~/.claude/skills/`). The orchestrator should confirm the sync mechanism before committing revisions.
