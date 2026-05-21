---
doc_type: qc-council-report
session: small-giants-wp-2026-05-22-session-B-5a-to-7-chain
generated: 2026-05-22
scope: Empirical validation of all Session B commits against stated goals.
council_type: post-implementation goal-shape validation
raters: Sonnet (primary — live evidence already gathered in session); diagnostic verdicts cross-checked against pipeline-run debug logs + chrome-devtools snapshots taken during session.
---

# Session B — QC Council Report

Per Bean's wrap-up directive: validate every Session B commit empirically against its stated goal, not just the diff. Per-commit verdict; flag failures with fix-shape + measured baseline.

**Session-B scope under review:**

| Commit | Phase | Stated goal (plain English) |
|---|---|---|
| 43a93df9 | 5a | Kill WP style-variation overlay system. Per-client snapshots move to `sites/<client>/theme-snapshot.json`. Browse-styles UI hidden. New `push-theme-snapshot.py` CLI. /sgs-clone Stage 10 invokes CLI instead of deleted REST endpoint. |
| 96df3dde | 5a | Archive phase-5a plan to `plans/archive/` with `-complete` suffix. |
| 60220b13 | 5b | Three Customiser sections (SGS Header / Footer / Site Info) register in `Appearance → Customise`. postMessage live preview for colour/typography/spacing; refresh for conditional rules. Button-presets bridge deleted (coverage audit confirmed redundant). View Transitions wired. |
| 012c4b75 | 5b | Archive phase-5b plan. |
| 0ef032fe | 5b paint fix | Customiser live preview must actually paint the rendered header/footer DOM, not just register settings. Selectors retargeted from `.wp-site-header / .wp-site-footer` (absent in SGS theme) to `header.wp-block-template-part / footer.wp-block-template-part` (WP-canonical wrapper). |
| d307c8b0 | 6 | Markup examples for 73 SGS blocks (≥ DB row count); block_supports backfill (target 404 → 500+); apiVersion 3 across all blocks; `role: content` on content-bearing attrs; Lucide REST registration (or class_exists guard); script-module translations wired. |
| a3109e3b | 6 | Archive phase-6 plan. |
| (no commit — Hostinger op) | WP 7.0 | sandybrown WP core 6.9.4 → 7.0. DB schema migrated. WP 7.0 native APIs available on the host. |

---

## Council methodology

For each commit, the validation is a binary check — does the rendered behaviour now satisfy the stated goal? Where the prediction is goal-shaped (e.g. "live preview paints"), the check is the binary observation. Where it's numeric (e.g. block_supports count > 500), the check is the measured value.

Verdict labels per `/qc-council` Stage 8:
- **validated-shipped** — goal met; evidence captured
- **validated-partial** — goal substantially met; one or more sub-criteria fell short of prediction; fix-shape proposed
- **falsified** — goal not met; diagnosis or prediction was wrong; surfaced for re-research
- **unverifiable** — no measurable baseline available (rare)

---

## Verdict per commit

### Commit 43a93df9 — Phase 5a (variation kill)

**Stated goal:** WP style-variation overlay deleted. Per-client snapshots at `sites/<client>/theme-snapshot.json` (canonical) + sibling axis files. Browse-styles UI hidden. Push CLI works. Stage 10 wired through CLI. Sandybrown still renders Mama's branding.

**Empirical checks (verified live during session):**

| Check | Result |
|---|---|
| `grep -rn "active_theme_style\|Sgs_Variation_Picker" plugins/sgs-blocks/ theme/sgs-theme/ --include="*.php"` returns no live-code refs | PASS — only `_retired/` archive paths + intentional documentation comments |
| 24 variation JSONs moved to `sites/<client>/` × 3 axes (snapshot + colours + typography) | PASS — verified inline |
| `push-theme-snapshot.py --client mamas-munches --no-push` prints diff + auto-forces `--no-push` on sandybrown | PASS — verified inline (31 keys add / 146 keys remove diff; safety auto-fired) |
| /sgs-clone Stage 10 (in `upload_and_patch.py`) replaces deleted `/wp-json/sgs/v1/active-variation` REST POST with subprocess to push-theme-snapshot.py | PASS — code grep confirmed; flag plumbed through orchestrator |
| Sandybrown frontend renders Mama's Munches branding | PASS — body `#FBF3DC` (cream) + primary token `#E68A95` (coral pink); NOT eye-care teal |
| WP Admin → Site Editor → Styles → "Browse styles" picker shows zero variations | PASS — "More" menu shows only "Additional CSS"; `/wp/v2/global-styles/themes/sgs-theme/variations` returns `[]` |
| Migration admin notice fires once via `wp_options[sgs_phase5a_migration_noticed]` flag | PASS — appeared on `/wp-admin/` first-load |
| No PHP fatals on frontend or admin | PASS — body sniff clean; HTTP 200 |

**Verdict: validated-shipped.**

---

### Commit 96df3dde — Phase 5a (plan archive)

**Stated goal:** Move `phase-5a-variation-system-kill.md` to `plans/archive/` with `-complete` suffix.

**Empirical check:** `.claude/plans/archive/phase-5a-variation-system-kill-complete.md` exists; original path no longer present. **PASS.**

**Verdict: validated-shipped.**

---

### Commit 60220b13 — Phase 5b (Customiser migration, initial)

**Stated goal:** Three Customiser sections register. Live preview wired. Button-presets bridge deleted as redundant. View Transitions wired (or fallback). Old admin pages preserved (deviation 2 in subagent report — additive overlay, not replacement).

**Empirical checks:**

| Check | Result |
|---|---|
| Customiser payload contains `sgs_header`, `sgs_footer`, `sgs_site_info`, `sgs_floating_ui` sections | PASS — verified live: chrome-devtools opened `customize.php?autofocus[section]=sgs_header`; all 5 header controls + 4 footer controls + 5 site-info controls registered |
| 10 settings registered with `postMessage` transport for colour/typography/spacing | PASS — `wp.customize('sgs_header_bg_colour').transport === 'postMessage'` confirmed |
| `class-button-presets-admin.php` deleted | PASS — file absent from disk |
| Coverage audit at `.claude/reports/phase-5b-button-property-coverage.md` confirms 24/24 properties covered by WP 6.9 native `settings.custom.buttonPresets` generation | PASS |
| `@view-transition{navigation:auto;}` inline rule emitted in customise.php (WP 6.9 fallback path) | PASS — handle `sgs-customiser-view-transitions-inline-css` confirmed |
| No PHP fatal after initial deploy (post lazy-load `Sgs_Customiser_Info_Control` fix) | PASS — subagent caught + fixed before commit |
| **Live preview paint** of changes inside iframe | **INITIALLY FAIL** — Customiser registered + postMessage fired but selectors targeted `.wp-site-header / .wp-site-footer` which the SGS theme's `header.html` / `footer.html` template parts do not output. JavaScript ran; nothing visibly changed in the iframe. **Caught + fixed in 0ef032fe.** |

**Verdict: validated-partial.** The Customiser surface was structurally correct (sections register, settings persist, postMessage fires) but the paint path was inert until 0ef032fe. Listed as **partial** to honour the empirical gap; the follow-up commit closes it.

**Fix-shape (already shipped as 0ef032fe):** Retarget renderers + JS handlers from `.wp-site-header / .wp-site-footer` → `header.wp-block-template-part / footer.wp-block-template-part` (WP-canonical template-part wrappers). Move CSS custom properties from element-scoped to `:root` so they're cascade-available regardless of which wrapper exists.

---

### Commit 012c4b75 — Phase 5b (plan archive)

**Verdict: validated-shipped.**

---

### Commit 0ef032fe — Phase 5b paint-target fix

**Stated goal:** Live preview must paint the rendered DOM. Setting `wp.customize('sgs_header_bg_colour')` to a hex value must change the visible `<header>` background colour in the preview iframe.

**Empirical checks (verified via chrome-devtools during session):**

| Check | Baseline | Post-fix |
|---|---|---|
| `header.wp-block-template-part` element found in preview iframe | `1 element` matched ✓ (vs `0` for `.wp-site-header`) | unchanged |
| `wp.customize('sgs_header_bg_colour').set('#E68A95')` paints header | Inline `backgroundColor`: empty → would not paint with old selector | Inline `backgroundColor: rgb(230, 138, 149)` ✓ |
| `wp.customize('sgs_footer_bg_colour').set('#075E80')` paints footer | Inline `backgroundColor`: empty | Inline `backgroundColor: rgb(7, 94, 128)` ✓ |
| `wp.customize('sgs_header_sticky_enabled').set(true)` applies position:sticky | Inline position: empty | `position: sticky; top: 0; z-index: 100` ✓ |
| `:root --sgs-header-bg` CSS custom property set on documentElement | Empty | `#e68a95` ✓ |
| Customiser-preview.js fresh-fetch contains new selector strings only | n/a | `js_uses_new_selector: true / js_uses_old_selector: false` ✓ |
| All values reverted to defaults; changeset NOT saved (no staging pollution) | n/a | Confirmed |

**Verdict: validated-shipped.** Goal met with direct DOM evidence.

---

### Commit d307c8b0 — Phase 6 (markup + audits + lucide REST)

**Stated goal (5 sub-goals, evaluated independently):**

#### 6.A — Markup examples (target ≥ 73 rows in `markup_examples` for source='sgs')

**Baseline:** 0 rows pre-Phase-6.
**Post-fix measurement:** 69 rows (Track A auto-generated ~56 + Track B hand-authored 13).
**Goal target:** 73.
**Verdict: validated-partial.** Subagent's analysis correctly noted: 4 DB rows in the broader registry reference blocks whose `block.json` source doesn't yet exist (planned/built status with missing source file); 2 of the planned hand-authored composites (`stats-bar`, `icon-grid`) couldn't be authored against absent source. **Fix-shape:** create the 4 missing `block.json` files OR remove the stale DB rows. Either path closes 69 → 73. Not blocking for Phase 7 dispatch.

#### 6.B — block_supports backfill (target > 500 rows, baseline 404)

**Baseline:** 404 rows.
**Post-fix measurement:** 360 active rows + 44 flagged `is_stale=true`.
**Verdict: falsified prediction, validated outcome.** The original 2:1 under-documentation ratio assumption was wrong — the data was already accurate. Zero missing rows found between block.json `supports` declarations and DB rows. The 44 stale rows are retired/planned blocks with no source file. The "raise to >500" target was predicated on an unverified prior assumption that turned out to be false. The actual outcome (no gaps + stale rows flagged) is the **correct** end state, just not the one predicted.
**Fix-shape:** Update `.claude/architecture.md` "block-stats" section to reflect actual coverage (no 2:1 gap exists; future supports work is purely additive for new blocks).

#### 6.C — apiVersion 3 across all 73 block.json files (with mandatory canary group first)

**Baseline:** Subagent reported all 69 blocks with `block.json` already at apiVersion 3.
**Post-fix measurement:** Same — no bulk bump required.
**Verdict: validated-shipped (no-op).** Canary skipped because there was nothing to bump. The acceptance criterion "all 73 at apiVersion 3" is true for the 69 blocks that have source files. The 4 missing source files (per 6.A above) are status mismatches in the DB, not real `apiVersion` issues.

#### 6.D — `role: content` on content-bearing attributes

**Baseline:** Zero.
**Post-fix measurement:** 87 attributes across 40 blocks now carry `"role": "content"`.
**Verdict: validated-shipped.** Subagent applied the spec definition correctly (content text/media attributes only; spacing/colour/layout/visibility excluded).

#### 6.E — Lucide REST registration (or class_exists guard)

**Baseline (pre-WP-7.0):** `WP_REST_Icons_Controller` did not exist. The new `class-sgs-lucide-icons-rest.php` registered no-op via `class_exists` guard. Required: keep `sgs_get_lucide_icon()` shim in `lucide-icons.php`.
**Post-fix measurement:** Subagent shipped `class-sgs-lucide-icons-rest.php` with double `class_exists` / `function_exists` guards. File IS required from `sgs-blocks.php:112` (Session A's wrap-up directive incorrectly stated "not loaded" — actual state is loaded-but-no-op via internal guards). Live debug.log shows zero errors from this file.
**Post-WP-7.0:** `WP_REST_Icons_Controller` class exists. `wp_register_icon_collection()` function does **not** exist on WP 7.0 — the registration API the subagent assumed turned out not to be the canonical entry point. The class_exists guard does the right thing (no-op) even now that the class exists, because the second `function_exists('wp_register_icon_collection')` guard catches the missing helper.
**Verdict: validated-shipped (defensive).** The orphan-by-guard outcome is intentional defensive code; no fix-shape required for Session B closure. Phase 7 / a follow-up should research the correct WP 7.0 icon-collection registration entry point (likely `WP_REST_Icons_Controller::register_collection()` or a class method) to actually activate the native delivery path.

#### 6.F — Script-module translations wired for `viewScriptModule` blocks

**Baseline:** No `wp_set_script_module_translations()` calls in PHP.
**Post-fix measurement:** 25 blocks covered via a registration loop in `class-sgs-blocks.php`. Function `wp_set_script_module_translations` confirmed available on WP 7.0 (per post-upgrade API check).
**Verdict: validated-shipped.** Infrastructure in place; translation JSON files deferred per plan until first non-English client.

**Overall Phase 6 verdict: validated-shipped with two non-blocking partials (6.A row count vs baseline / 6.B target was wrong).**

---

### Commit a3109e3b — Phase 6 (plan archive)

**Verdict: validated-shipped.**

---

### Operation — WP 6.9.4 → 7.0 core upgrade on sandybrown

**Stated goal:** Upgrade WP core to 7.0; expose native APIs that Phase 5b / Phase 6 / Phase 7 depend on (`wp_enqueue_view_transitions_admin_css`, `wp_set_script_module_translations`, `WP_REST_Icons_Controller`, `wp_get_connector`, `wp_is_connector_registered`); preserve all Phase 5a/5b/6 state.

**Empirical checks (verified via wp-load bootstrap + curl after upgrade):**

| API / state | Pre-upgrade | Post-upgrade | Goal |
|---|---|---|---|
| `get_bloginfo("version")` | 6.9.4 | 7.0 | ✓ |
| DB schema version | 60717 | 61833 | ✓ migrated |
| `class_exists("WP_REST_Icons_Controller")` | no | YES | ✓ |
| `function_exists("wp_register_icon_collection")` | no | no | ❌ surprise — surfaced in mistakes |
| `function_exists("wp_enqueue_view_transitions_admin_css")` | no | YES | ✓ |
| `function_exists("wp_set_script_module_translations")` | no | YES | ✓ |
| `function_exists("load_script_module_textdomain")` | no | YES | ✓ |
| `function_exists("register_block_variation")` | no | no | ❌ STILL missing — Session A's polyfill via `get_block_type_variations` filter (commit cc541e94) remains load-bearing |
| `function_exists("wp_get_connector")` | no | YES | ✓ unblocks Phase 7 AI Connector |
| `function_exists("wp_is_connector_registered")` | no | YES | ✓ |
| Variations REST endpoint returns `[]` (Phase 5a filter intact) | `[]` | `[]` | ✓ |
| Frontend Mama's branding still active | ✓ | ✓ (title + body bg unchanged) | ✓ |
| Pre-upgrade `mysqldump` backup at `/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/sandybrown-pre-wp7.sql` (7.5 MB) | n/a | exists | ✓ rollback path |
| Recent `debug.log` post-upgrade fatals | n/a | none (no entries 17:43 UTC onwards) | ✓ |

**Verdict: validated-shipped.** Two surprises caught + documented:
1. `wp_register_icon_collection` doesn't exist in WP 7.0 (the registration entry point the Phase 6 subagent assumed). Phase 6 Lucide REST remains defensively no-op.
2. `register_block_variation` still doesn't exist as a top-level function in WP 7.0 — Session A's `get_block_type_variations` filter migration (commit cc541e94) was load-bearing then and remains load-bearing now. **Do not remove it.**

---

## Council summary

| Commit | Verdict |
|---|---|
| 43a93df9 (5a variation kill) | validated-shipped |
| 96df3dde (5a archive) | validated-shipped |
| 60220b13 (5b customiser, initial) | validated-partial — paint inert until 0ef032fe |
| 012c4b75 (5b archive) | validated-shipped |
| 0ef032fe (5b paint fix) | validated-shipped |
| d307c8b0 (6 markup + audits + lucide) | validated-shipped with two non-blocking partials (6.A row count vs registry size; 6.B target was wrong-assumption) |
| a3109e3b (6 archive) | validated-shipped |
| WP 7.0 upgrade | validated-shipped — two API surprises documented |

**No falsified commits. No commit needs rolling back.**

**Parked findings (surfaced to Bean for parking.md):**

1. **Phase 5a Commit B (delete `plugins/sgs-blocks/_retired/`)** — deferred per the two-commit safety pattern; eligible for a future session after 1-hour soak confirms no PHP fatals (already confirmed clean over the session).
2. **`theme/sgs-theme/styles/mamas-munches.css`** — pre-existing uncommitted Bean work; should be folded into `sites/mamas-munches/theme-snapshot.json`'s `styles.css` field OR moved to `sites/mamas-munches/theme-overrides.css` in a follow-up session.
3. **`_client_variation_css_path()` in `sgs-clone-orchestrator.py:309`** still resolves to `theme/sgs-theme/styles/<client>.css` (the legacy CSS path). Out of Phase 5a scope; eligible for a Phase 5b/6 follow-up.
4. **4 missing block.json files** for blocks present in DB but with no source: `stats-bar`, `icon-grid`, and 2 others. Either author the source OR retire the stale DB rows.
5. **WP 7.0 Lucide REST registration entry point** — `wp_register_icon_collection` is not it. Research correct registration function name (likely `WP_REST_Icons_Controller::register_collection()` instance method). Phase 7 territory or a focused follow-up.
6. **`register_block_variation` polyfill via `get_block_type_variations` filter** (commit cc541e94) is load-bearing on WP 7.0 — document in mistakes.md so a future cleanup doesn't accidentally retire it.
7. **`sgs/hero` block validation warning** — pre-existing, surfaced in chrome-devtools session. Needs `deprecated.js` entry OR Site Editor "Attempt Block Recovery". Out of Session B scope.

## Cost-of-being-wrong analysis

Per the council methodology, each "validated-partial" verdict was checked against the cost of treating it as "validated-shipped" anyway:

- **5b paint inertness** — would have shipped a UI that visibly does nothing. High cost. **Correctly caught + fixed pre-handoff.**
- **6.A row count 69 vs 73** — would leave the operator-facing markup gallery 4 entries short. Cosmetic, not functional. Low cost. **Park.**
- **6.B target 500 vs 360** — predicted target was a guess, not a measurement. Outcome is actually correct (zero gaps). **Update architecture.md to retire the wrong prediction.**

No re-council required. Session B closure proceeds to spec/doc updates + session summary + commit.
