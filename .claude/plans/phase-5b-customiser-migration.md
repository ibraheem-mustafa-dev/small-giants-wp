---
doc_type: phase-plan
project: small-giants-wp
phase: 5b
phase_name: Customiser Migration — Header/Footer/Site Info + Button Presets + View Transitions
session_marker: Step 5b.3 (property-coverage audit passes + CSS bridge confirmed redundant) — safe session boundary before CSS bridge deletion
calibrated_time: ~205-385 min build + 25 min /qc-council + eyes-on = ~230-410 min total
prerequisites:
  - Phase 1 (merged sgs-framework.db)
  - Phase 5a (variation system killed — active_theme_style theme_mod removed + PHP classes deleted)
parallel_with: Phases 4, 6, 7 can run in parallel AFTER Phase 1 + Phase 5a land. Phase 5b must NOT run in parallel with Phase 6 (button preset changes in 5b affect block markup examples authored in Phase 6 — serialise before Phase 6)
qc_gate_after: /qc-council Stage 5 + eyes-on Playwright assertion of Customiser live-preview + button render check
generated: 2026-05-21
---

# Phase 5b — Customiser Migration — Header/Footer/Site Info + Button Presets + View Transitions

## Plain-English goal

Today, the SGS header/footer conditional-rules engines and site-info settings live as flat admin pages under the SGS top-level menu. Operators make a change, save, navigate to the front end, refresh — a clumsy loop that erodes trust in the settings. After this phase: header settings, footer settings, and site-info values are all inside the WP Customiser with live-preview. The pattern is the one already proven by `Sgs_Floating_UI_Customiser` (Post-Spec-17 decision 13) — follow it exactly for all three new sections. Where live-preview is possible (colours, typography, spacing), use `transport: postMessage`. Where it isn't (conditional rules engines that depend on server logic), use `transport: refresh`. Separately, WP 7.0 adds native pseudo-element support in `theme.json.styles.elements.button` — the entire `wp_options.sgs_button_presets` bridge and `class-button-presets-admin.php` settings page become redundant. Button preset values move to native theme.json, operator edits move to Site Editor → Styles → Buttons. View Transitions are wired into the Customiser panels navigation as a cheap enhancement on top of the existing work.

**Bottleneck warning:** This is the highest-variance phase in the programme. If the WP 7.0 property-coverage audit (Step 5b.3) reveals more than 2 uncovered properties and the slim PHP shim grows beyond 100 lines, descope Phase 5b to a multi-week standalone project — do NOT burn time building an extended shim for a gap WP 7.1 may close.

## Decisions in scope

- **Decision 21** (§3 Phase 5b, §11 Decision 21) — Migrate SGS Header Rules admin page to Customiser section "SGS Header"; same for SGS Footer Rules and SGS Site Info. `transport: postMessage` for colours/typography/spacing; `transport: refresh` for conditional rules engines. Follow `Sgs_Floating_UI_Customiser` pattern exactly (per Spec 18 §8b).
- **Decision 22** (§3 Phase 5b, §6.3 Spec 11) — Move button preset values to `theme.json.styles.elements.button` including WP 7.0 pseudo-element states (`:hover`, `:focus`, `:focus-visible`, `:active`). DELETE `wp_options.sgs_button_presets`. DELETE `class-button-presets-admin.php`. Simplify/delete CSS variable bridge ONLY after property-coverage audit confirms 100% coverage.
- **Decision 27** (§11 Decision 27) — Wire `wp_enqueue_view_transitions_admin_css()` into Customiser navigation. Playwright-verify it fires; if not, fall back to `customize_controls_enqueue_scripts` hook emitting view-transitions CSS directly.

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| Decision 22 CSS bridge deletion — any uncovered property breaks button rendering | Step 5b.3: property-coverage audit script is a HARD GATE. List every `--wp--custom--button-presets--*` property bridge emits → render test button via Playwright → confirm which come from WP-native theme.json CSS. Delete bridge ONLY after 100% coverage confirmed. |
| `postMessage` live-preview can't simulate conditional rules engines | Step 5b.2: transport lookup table baked into implementation — conditional rules controls always use `transport: 'refresh'`, never postMessage |
| View Transitions silently no-ops in Customiser iframe (wrong sub-context) | Step 5b.5: Playwright screenshot comparison navigating between 2 panels at 100ms intervals. If identical, apply manual `customize_controls_enqueue_scripts` fallback |
| Shim grows >100 lines if property coverage gaps found | If property-coverage audit finds >2 uncovered properties → STOP, surface findings to Bean, park Phase 5b's button-preset deletion as a standalone multi-week project |
| Phase 5b runs parallel with Phase 6 introducing button-preset conflicts | Phase 5b MUST ship and be merged BEFORE Phase 6 dispatches. Annotated in prerequisites. |

## Pre-resolved decisions (from hidden-decisions.md)

- **Customiser sections — new or extend existing?** RESOLVED: New SGS-prefixed sections (`sgs_header`, `sgs_footer`, `sgs_site_info`). Don't add to native WP sections. Pattern from `Sgs_Floating_UI_Customiser` (Spec 18 §8b) is canonical.
- **postMessage vs refresh per control?** RESOLVED: Control attribute name maps to transport via lookup table — colours/typography/spacing → `postMessage`; conditional rules, structural toggles → `refresh`. Baked into implementation, not left to implementer judgement.
- **Button preset migration safety?** RESOLVED: Property-coverage audit script is the gate. Run it BEFORE deleting the bridge. If any property uncovered, keep the slim shim for that property only.
- **Phase 5b parallel with Phase 6?** RESOLVED: Phase 5b serialised BEFORE Phase 6 (button preset changes in 5b affect block markup examples authored in Phase 6). This is an override to the §13 phase plan.

---

## Steps

### Step 5b.1 — Pre-dispatch grep: confirm Phase 5a landed cleanly

- **Action:** Verify Phase 5a shipped correctly before any Phase 5b work begins. Run: `grep -rn "active_theme_style\|Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator" plugins/sgs-blocks/ theme/sgs-theme/`. Expect: ZERO results (Phase 5a deleted/modified all of these). If any matches return, STOP — Phase 5a is incomplete and Phase 5b cannot proceed safely (stale `active_theme_style` theme_mod interacting with new Customiser = silent state corruption).
- **Files:** Read-only grep pass; no writes
- **Inputs:** Phase 5a merged to main
- **Outputs:** Confirmation that Phase 5a is clean, or a list of stale references blocking dispatch
- **Time:** 3-5 min
- **Tooling:** Bash grep
- **On-Fail:** If Phase 5a references remain, list them and report to Bean — do NOT proceed

### Step 5b.2 — Implement Sgs_Header_Customiser, Sgs_Footer_Customiser, Sgs_Site_Info_Customiser

- **Action:** Create three new PHP classes following the canonical `Sgs_Floating_UI_Customiser` pattern (Post-Spec-17 decision 13, Spec 18 §8b). For each class:
  1. Register a new Customiser section via `$wp_customize->add_section()` with an SGS-prefixed ID
  2. For every setting previously in the admin page: add `$wp_customize->add_setting()` with appropriate transport. Control attribute-to-transport lookup rule: **colours / typography / spacing / border controls** → `transport: 'postMessage'`; **conditional rules, template-part structural toggles, regex-pattern fields** → `transport: 'refresh'`
  3. Add corresponding `$wp_customize->add_control()` for each setting
  4. For `postMessage` controls: add corresponding `customize_preview_init` JS handler (`wp.customize.bind('active', ...)`) to push live CSS changes into the preview iframe without full refresh
  5. Companion renderer classes follow `Sgs_Floating_UI_Renderer` pattern — `render_header_customiser_css()` + `render_footer_customiser_css()` + `render_site_info_customiser_css()` hooked to `wp_head`
  - **SGS Header section:** Controls for header background colour, header text colour, header link colour, header sticky behaviour toggle, header max-width (postMessage); conditional rules show/hide (refresh); template-part selector (refresh)
  - **SGS Footer section:** Footer background colour, footer text colour, footer link colour, footer max-width (postMessage); conditional rules (refresh)
  - **SGS Site Info section:** Business name, address, phone, email, WhatsApp number (refresh — server-side rendered); logo (refresh)
- **Files:** CREATE `plugins/sgs-blocks/includes/class-sgs-header-customiser.php`, `class-sgs-footer-customiser.php`, `class-sgs-site-info-customiser.php`. CREATE `plugins/sgs-blocks/assets/js/customiser-preview.js` for postMessage handlers. MODIFY `plugins/sgs-blocks/sgs-blocks.php` to require new classes.
- **Inputs:** `plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php` (canonical pattern); Spec 18 §8b; existing SGS Header Rules admin page fields for complete control inventory
- **Outputs:** Three new Customiser sections; existing admin pages still exist alongside (NOT deleted yet — dual existence during this step)
- **Time:** 90-160 min
- **Tooling:** Edit/Write tools for PHP classes; Read `class-sgs-floating-ui-customiser.php` first
- **On-Fail:** If the Customiser sections don't appear in `Appearance → Customise`, check hook priority on `customize_register` — SGS must fire after WP core (use priority 20+)

### Step 5b.3 — Button presets property-coverage audit (HARD GATE)

- **Action:** Run the property-coverage audit before touching the CSS bridge. Steps:
  1. Enumerate every CSS custom property the current bridge emits: `grep -n "var(--wp--custom--button-presets" plugins/sgs-blocks/ theme/sgs-theme/ -r`. Build exhaustive list.
  2. Map each property to whether WP 7.0's native `styles.elements.button` + pseudo-element support generates an equivalent `--wp--preset--*` or `--wp--custom--*` property automatically from theme.json. Use `wp_get_global_stylesheet()` output on dev site to confirm which properties WP 7.0 generates natively.
  3. For each property: COVERED (WP 7.0 generates it) or UNCOVERED (needs shim). List clearly.
  4. **Decision gate:** If all properties COVERED → proceed to Step 5b.4 (delete bridge). If 1-2 properties UNCOVERED → build slim PHP shim for those properties only; proceed. If >2 properties UNCOVERED or shim estimate >100 lines → STOP, surface findings to Bean, park button-preset bridge deletion as standalone multi-week project.
  5. Also verify pseudo-element coverage: `:hover`, `:focus`, `:focus-visible`, `:active` states all expressible in `theme.json.styles.elements.button`. Playwright render test on dev site confirming each pseudo-element fires visually.
- **Files:** Read-only audit pass (+ optional slim shim if ≤2 gaps); no bridge changes yet
- **Inputs:** Current `plugins/sgs-blocks/includes/class-button-presets-admin.php` + button block `style.css`; dev site (palestine-lives.org or sandybrown); `theme/sgs-theme/theme.json` Spec 11 §6.3 verification gate guidance
- **Outputs:** Written coverage matrix (COVERED / UNCOVERED per property); explicit pass/fail gate decision
- **Time:** 25-45 min
- **Tooling:** Bash grep; Playwright (render button, inspect computed styles); Read theme.json; `wp_get_global_stylesheet()` via WP-CLI eval or HTTP call to dev site
- **On-Fail:** >2 uncovered properties → STOP and surface to Bean before continuing. Do NOT improvise a large shim.
- **QC gate:** Coverage matrix documented before Step 5b.4 runs.

### Step 5b.4 — Move button presets to theme.json native + delete admin page

- **Action:** (Only runs if Step 5b.3 gates PASS.) Three parts:
  1. **theme.json update:** Add `styles.elements.button` subtree to `theme/sgs-theme/theme.json` with current preset values translated into WP 7.0 native format. Add pseudo-element states (`:hover`, `:focus`, `:focus-visible`, `:active`) under `styles.elements.button.:hover` etc. Values come from `wp_options.sgs_button_presets` (read current production values first via `wp option get sgs_button_presets --format=json` on dev site).
  2. **Delete bridge + admin page:** DELETE `plugins/sgs-blocks/includes/class-button-presets-admin.php`. Remove the CSS custom property bridge in button block `style.css` (the `--wp--custom--button-presets--*` properties). Remove `require_once` for the deleted class from `sgs-blocks.php`. Remove the `wp_options.sgs_button_presets` read/write calls from any remaining PHP.
  3. **One-time data migration:** Add an activation hook that on first run checks for existing `sgs_button_presets` in wp_options — if found, logs a notice "Button presets migrated to theme.json. Old wp_options row preserved as backup under sgs_button_presets_migrated_backup." Do NOT delete the backup row automatically.
- **Files:** `theme/sgs-theme/theme.json`, `plugins/sgs-blocks/includes/class-button-presets-admin.php` (DELETE), button block `style.css` (MODIFY), `plugins/sgs-blocks/sgs-blocks.php` (MODIFY)
- **Inputs:** Step 5b.3 coverage matrix; current production button preset values from dev site wp_options; Spec 11 §6.3 verification gate
- **Outputs:** theme.json with native button styles; admin page deleted; CSS bridge removed/simplified; wp_options backup preserved
- **Time:** 30-60 min
- **Tooling:** Edit/Write tools; WP-CLI eval on dev site to read current wp_options values; Playwright button render confirmation after change
- **On-Fail:** If Playwright confirms buttons render incorrectly after bridge removal → the slim shim from Step 5b.3 is the fix path. Apply shim, re-test. If shim doesn't resolve → DO NOT commit; park and surface to Bean.

### Step 5b.5 — Wire View Transitions + delete old admin pages

- **Action:** Two parts:
  1. **View Transitions:** In the Customiser registration class (or a shared `Sgs_Customiser_Boot.php`), hook `customize_controls_enqueue_scripts` and call `wp_enqueue_view_transitions_admin_css()`. Test: Playwright script that navigates between 2 Customiser panels (SGS Header → SGS Footer) capturing screenshots at 100ms intervals. If screenshots show smooth transition frames, DONE. If all frames identical (function no-ops in Customiser iframe context), fall back: output `<style>` with `@view-transition { navigation: auto; }` directly in the `customize_controls_enqueue_scripts` callback instead.
  2. **Delete old admin pages:** ONLY after confirming the three Customiser sections (Step 5b.2) are functional and the button presets have moved to theme.json (Step 5b.4). Delete the original SGS Header Rules admin page render callback, SGS Footer Rules admin page render callback, SGS Site Info admin page render callback from their respective PHP classes. The conditional-rules LOGIC in `Sgs_Header_Rules` / `Sgs_Footer_Rules` is PRESERVED — only the admin page rendering is replaced by the Customiser section.
- **Files:** CREATE or MODIFY `plugins/sgs-blocks/includes/class-sgs-customiser-boot.php` (or inline in main boot class); MODIFY `plugins/sgs-blocks/includes/class-sgs-header-rules.php`, `class-sgs-footer-rules.php` (remove admin page callbacks only, preserve rules logic); MODIFY `plugins/sgs-blocks/includes/class-sgs-admin-menu.php` (remove or redirect old admin menu items)
- **Inputs:** Step 5b.2 Customiser sections confirmed working; Step 5b.4 button presets confirmed working
- **Outputs:** View transitions wired; old admin pages removed; SGS top-level admin menu for these three items either removed or redirected to Customiser
- **Time:** 20-40 min
- **Tooling:** Playwright (view transitions test); Edit tool (admin page removal); Browser eyes-on at `Appearance → Customise` confirming sections are present
- **On-Fail:** If admin page deletion causes a fatal PHP error (missing menu callback), the redirect is cleaner than deletion — `add_action('admin_menu')` pointing to `admin.php?page=customize&autofocus[section]=sgs_header`

---

## Acceptance criteria

- `Appearance → Customise` shows three new SGS sections: SGS Header, SGS Footer, SGS Site Info
- Colour, typography, and spacing controls in those sections update the live-preview frame without page refresh (postMessage confirmed via Playwright)
- Conditional rules controls (header show/hide rules, footer conditional config) trigger a preview refresh correctly
- `theme.json.styles.elements.button` contains current preset values + four pseudo-element states
- `wp option get sgs_button_presets` returns either: (a) the old value as `sgs_button_presets_migrated_backup`, or (b) empty/missing — never active
- `class-button-presets-admin.php` deleted; no references in `sgs-blocks.php`
- Old SGS Header Rules / Footer Rules / Site Info admin pages no longer render (removed or redirected)
- Playwright button render on dev site confirms primary/secondary/outline variants render correctly post-migration
- `grep -rn "active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/` returns 0 results (Phase 5a cleanup confirmed present)
- View Transitions wired (or fallback CSS applied); no console errors on Customiser navigation

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 21, 22, 27 from the SGS architecture programme — Customiser migration + button presets to theme.json native + View Transitions.

# CRITICAL: Check Phase 5a shipped first

Run this grep BEFORE writing any code:
grep -rn "active_theme_style\|Sgs_Variation_Picker\|class-sgs-variation-picker" plugins/sgs-blocks/ theme/sgs-theme/

If ANY matches return → STOP. Phase 5a is incomplete. Phase 5b cannot proceed safely (stale theme_mod will corrupt Customiser state). Report to Bean.

# CRITICAL: Phase 5b BEFORE Phase 6

Phase 5b must complete and merge to main BEFORE Phase 6 dispatches. If Phase 6 is already running in a parallel session, coordinate — Phase 6 should not author button-block markup_examples until Phase 5b has moved button presets to theme.json.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 5b row + §11 Decisions 21, 22, 27
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 5b section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 5b section
- plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php — READ THIS FIRST. It is the canonical Customiser pattern you must replicate. Follow its structure exactly.
- plugins/sgs-blocks/includes/class-sgs-header-rules.php + class-sgs-footer-rules.php — read to understand which fields need Customiser controls
- theme/sgs-theme/theme.json — current button styles section

# What to build — 5 steps

## Step 1: Pre-dispatch grep (Phase 5a clean check)

grep -rn "active_theme_style\|Sgs_Variation_Picker" plugins/sgs-blocks/ theme/sgs-theme/
Expect 0 results. If any found, STOP and report.

## Step 2: Three Customiser section classes

CREATE plugins/sgs-blocks/includes/class-sgs-header-customiser.php
CREATE plugins/sgs-blocks/includes/class-sgs-footer-customiser.php
CREATE plugins/sgs-blocks/includes/class-sgs-site-info-customiser.php

Pattern: exactly mirror class-sgs-floating-ui-customiser.php structure.

Transport rule (hardcode this lookup, do NOT leave to judgement):
  - colour / typography / spacing / border → transport: 'postMessage'
  - conditional rules / template-part selectors / structural toggles → transport: 'refresh'

For postMessage controls: add customize_preview_init JS to push CSS into the preview iframe without full refresh.
For each renderer: hook CSS output to wp_head.

Register all three in sgs-blocks.php.

Do NOT delete old admin pages yet — that's Step 5.

## Step 3: Button presets property-coverage audit (HARD GATE — do not skip)

(1) grep -rn "var(--wp--custom--button-presets" plugins/sgs-blocks/ theme/sgs-theme/ -r
    → Build exhaustive list of every property the bridge emits.

(2) On dev site (palestine-lives.org), run:
    wp eval 'echo wp_get_global_stylesheet();' | grep button
    → Confirm which button properties WP 7.0 generates natively.

(3) Build coverage matrix: COVERED vs UNCOVERED per property.

(4) DECISION GATE:
    All covered → proceed to Step 4.
    1-2 uncovered → build slim shim for those properties only → proceed.
    >2 uncovered OR shim >100 lines → STOP. Surface findings to Bean. Do NOT delete bridge.

## Step 4: Move button presets to theme.json

(Only if Step 3 gates PASS.)

(1) Read current production values: wp option get sgs_button_presets --format=json
(2) Add styles.elements.button subtree to theme/sgs-theme/theme.json including:
    :hover / :focus / :focus-visible / :active pseudo-element states
(3) DELETE plugins/sgs-blocks/includes/class-button-presets-admin.php
(4) Remove CSS variable bridge in button block style.css
(5) Remove require_once + wp_options read/write from sgs-blocks.php
(6) Add one-time backup: on activation, copy existing sgs_button_presets to sgs_button_presets_migrated_backup in wp_options (do NOT auto-delete)

## Step 5: Wire View Transitions + delete old admin pages

(Only run after Steps 2 and 4 confirmed working.)

(a) View Transitions:
  hook customize_controls_enqueue_scripts
  call wp_enqueue_view_transitions_admin_css()
  Playwright test: navigate SGS Header → SGS Footer panels, capture screenshots at 100ms intervals
  If no transition frames visible: fallback — output @view-transition { navigation: auto; } via inline <style> in the hook callback

(b) Remove old admin page render callbacks from Sgs_Header_Rules + Sgs_Footer_Rules + Sgs_Site_Info admin classes.
  PRESERVE all rules logic, just remove the WP admin_menu render callback.
  Update Sgs_Admin_Menu to redirect those menu items to customize.php?autofocus[section]=sgs_{section}

# Commit gates

Do NOT commit if:
- Phase 5a grep found any matches
- Customiser sections don't appear in Appearance → Customise
- Playwright button render shows visual breakage after bridge removal
- >2 uncovered button properties found in Step 3 (stop, don't commit)
- Old admin pages still render as standalone pages (not replaced/redirected)

Commit message: "feat(phase-5b): Customiser migration + button presets → theme.json + view transitions — Decisions 21/22/27 [qc:phase-5b-self-verify]"

# Bottleneck warning

Phase 5b is the highest-variance phase in the programme. Calibrated time: 205-385 min. If Step 3's property-coverage audit reveals >2 uncovered properties: stop, surface to Bean, park the button-preset deletion as a standalone project. Do NOT spend more than 45 min trying to plug property gaps — WP 7.1 may close them natively.

# Time budget

205-385 min realistic. At 4 hrs (240 min), commit all completed steps with WIP tag and surface status. At ceiling (385 min), force-stop + commit partial work.

# Safety clauses

- header/footer template-part seeder, resetter, and conditional rules LOGIC are 100% preserved. Only the admin page rendering is replaced by Customiser sections.
- sgs_header / sgs_footer CPTs are NOT touched by this phase.
- CSS bridge: delete ONLY after 100% property coverage confirmed. Partial coverage → slim shim, not full deletion.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (Decision 31 hook from Phase 0.5)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>]
- blub.db 282 — Fix what QC surfaces regardless of provenance
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never git add . or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras):

1. **Sonnet primary:** Review new Customiser classes against `Sgs_Floating_UI_Customiser` pattern. Verify transport lookup table (postMessage vs refresh) is correctly applied per control type. Confirm button pseudo-element states in theme.json match current wp_options values.
2. **Haiku cross-check:** Run `grep -rn "sgs_button_presets\|active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/` — confirm only the backup row reference exists, all other references cleaned up. Confirm `class-button-presets-admin.php` absent.
3. **Gemini Flash:** Playwright live-preview test — navigate to `Appearance → Customise → SGS Header`, change a colour, confirm preview iframe updates without full reload. Screenshot evidence.
4. **Cerebras:** Playwright button render test on dev site — confirm primary, secondary, outline button variants all render visually correct after bridge deletion. Report pixel-diff against pre-5b baseline.

All 4 raters must agree before Phase 6 dispatches.
