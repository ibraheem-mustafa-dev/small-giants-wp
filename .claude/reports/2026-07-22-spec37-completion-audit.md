# Spec 37 (SGS Header/Footer Builder) — Completion Audit vs LIVE CODE

**Date:** 2026-07-22 · **Method:** read-only. Every FR checked against actual
`plugins/sgs-blocks/src` + `includes` + `theme/sgs-theme` + block.json/render.php + git log
(commits opened via `git show`/`git log`). Spec `Status:` lines were NOT trusted as evidence —
each was independently re-derived. Live-DOM/canary items marked UNVERIFIABLE.

**Headline finding:** The spec's own 2026-07-22 status lines are, unusually, largely accurate —
this session's audit corroborates almost every claim it makes, file:line for file:line. The one
correction found is a starter-library false negative: FR-37-8's "NOT-BUILT" verdict is right for
the CPT-targeted starter mechanism, but the repo already contains 6 header + 6 footer
*legacy-format* patterns (`header-centred.php`, `footer-columns.php`, etc.) that predate this
spec and target `core/template-part/header` (the old Spec 17 model), not `sgs/site-header`. These
are dead weight under the new model and were not mentioned anywhere in Spec 37 — a gap in the
spec's own inventory, flagged below.

## Completion table

| FR | Title | Claimed | Verified | Evidence (file:line) | Gap | Cost | Deps |
|----|-------|---------|----------|----------|-----|------|------|
| 37-1 | CPT is the single editing home | ✅ BUILT + CANARY-VERIFIED (D360) | **DONE** | `class-sgs-block-cpts.php:38,41` (CPT consts); admin submenus `:115-145,214-236` ("Advanced Headers"/"Advanced Footers"); binding via FR-37-2/3 | none — confirmed live per D360 canary note (accepted as given ground truth) | — | none |
| 37-2 | "Set as active" action + stored pointer | BUILT (commit 0da5ef6a) | **DONE** | `class-sgs-active-layout.php:41,44` (`OPTION_HEADER`/`OPTION_FOOTER` consts), `:290` `set_active()`, `:335` `clear_active()`; `class-sgs-active-layout-admin.php:55-56` (`admin_post_` actions) | Canary-verified per FR-37-1 D360 evidence (accepted) | — | none |
| 37-3 | Direct-render branch (CPT-aware resolver) | ✅ BUILT + CANARY-VERIFIED (0da5ef6a + 9ff24f74) | **DONE** | `class-sgs-header-rules.php:195` `filter_template_part()`, `:230` calls `Sgs_Active_Layout::render_active()` before `:250` `self::evaluate()` — branch confirmed BEFORE evaluate as required; re-entrancy comments `:219-242` match spec's clause (a)/(c) description | The area-OR-slug match fix (commit `9ff24f74`) is referenced in code comments but the literal `area === / slug ===` condition line wasn't independently isolated by grep (regex escaping issue) — treat the fix as PARTIALLY re-verified (comments confirm the fix landed; did not re-derive the exact conditional) | — | none |
| 37-4 | Immutable fallback | BUILT | **DONE** | `class-sgs-header-rules.php` evidence at spec's own cited lines (39,82) consistent with the `evaluate()`/default-rule structure seen at `:265-269,303` | none | — | none |
| 37-5 | "Active" indicator on list table | ✅ BUILT + CANARY-VERIFIED (D360) | **DONE** | `class-sgs-active-layout-admin.php:49-50` (`manage_{post_type}_posts_columns` + custom column render), `:54` `display_post_states` filter | none | — | none |
| 37-6 | Template parts are thin shells | PARTIAL — file step DONE, per-site CPTs owed | **DONE (file step) / OPEN (per-site CPTs)** — matches claim exactly | `theme/sgs-theme/parts/header.html` = one line `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->`; `parts/footer.html` = one line pointing at `sgs/framework-footer-default`; `theme/sgs-theme/patterns/footer-indus-foods.php` confirmed ABSENT (0 hits via `find`) | Per-site CPT authoring (canary + Indus) still owed — this is live-site work, not code | SONNET (authoring) | 37-3 |
| 37-7 | Shared starter-template picker (header/footer/mega) | NOT-BUILT | **NOT-BUILT** | Grep for `StarterPicker`/`StyleGrid` etc across `src/` = 0 hits | Confirmed absent | SONNET | none |
| 37-8 | Starter library is git-versioned patterns | NOT-BUILT (for header/footer starters) | **PARTIAL — correction to spec** | `theme/sgs-theme/patterns/` DOES contain `header-centred.php`, `header-full.php`, `header-minimal.php`, `footer-centred.php`, `footer-columns.php`, `footer-compact.php`, `footer-informational.php`, `footer-minimal.php`, `footer-simple.php` — but these target `core/template-part/header` (Block Types docblock) and use `sgs/container`, NOT `sgs/site-header`/`sgs/site-footer` (grep confirms none of them reference `sgs/site-header`; only the 3 `header-search-*` patterns do). They are **legacy Spec-17-era artefacts**, not FR-37-8 starters, and Spec 37 never inventories or dispositions them. | **New finding, not in spec:** 9 orphan legacy-format patterns need an explicit decision (retire vs re-target to CPT model) before FR-37-8 ships, or the starter picker will surface stale non-CPT-compatible options | HAIKU (inventory + decision write-up) then SONNET (rebuild as CPT starters) | 37-7 |
| 37-9 | `sgs/site-header`(-row) conform to §3 | AUDIT DONE — 3 gaps carried (37-33/34/35) | **DONE** (audit itself) | `site-header-row/render.php:15-16,30` empty-row-zero-output comment + `return ''` confirmed; `site-header/edit.js:96` `templateLock:'all'`; `site-header-row/edit.js:48` `templateLock:false` — both match spec's §3.3a claims | The 3 carried gaps are real (verified separately as 37-33/34/35 below) | — | 37-33,37-34,37-35 |
| 37-10 | `sgs/site-footer`(-row) conform to §3 | AUDIT DONE | **DONE** (audit itself) | `site-footer/edit.js:117` `templateLock:'all'`; `site-footer-row/edit.js:85` `templateLock:false`; footer columns wiring independently confirmed (see 37-11) | Same 3 carried gaps apply to footer row too | — | 37-33,37-34,37-35 |
| 37-11 | Footer columns — operator-set count, auto-stack | BUILT (code) — canary-unverified | **DONE (code)** | `site-footer-row/block.json:51,55,59` declares `columns`/`columnsTablet`/`columnsMobile` (fixes the D338 silent-discard bug the spec describes); `site-footer/edit.js:35-37` seeds flat `columns:3, columnsTablet:3, columnsMobile:1` (no `gridTemplateColumns` object seeded — confirmed comment `:29-34`); `class-sgs-container-wrapper.php:138` `$object_grid = $object_model && is_array(...)` gate, `:149-154` reads flat columns, `:585-590,800-811` emit `repeat(N,1fr)` + `sgs-cols-*` classes only when `!$object_grid` | Live canary render (does it actually paint N columns + stack to 1 on mobile) is unverified — matches spec's own caveat | UNVERIFIABLE-NEEDS-LIVE-DOM (canary check) | 37-6 (site authoring) |
| 37-12 | Never-overflow contract | PARTIAL | **PARTIAL** (accepted, not independently re-derived beyond spec's own `min-width:0` claim — did not open `style.css` byte-for-byte for every clause) | Spec cites LEDGER/Spec 35 track; not directly falsified by this pass | Live `scrollWidth<=innerWidth` gate at 375/768/1440 never run | UNVERIFIABLE-NEEDS-LIVE-DOM | none |
| 37-13 | Behaviour set (sticky/transparent/shrink/hide-on-scroll) | PARTIAL — hide-on-scroll dormant | **DONE (verified as claimed)** | `class-sgs-header-behaviours.php:81` `add_filter('body_class', ...)`, `:143` `resolve_active_header_behaviour()` — sticky/transparent/shrink live via body_class; `src/header-behaviours/view.js:15` explicit comment "legacy/dormant path", `:57` regex reads `sgs-header-behaviour-hide-on-scroll-down` class that nothing emits, `:140` `if (hideOnScrollDown)` branch is reachable only if that class exists | No attribute/control emits the hide-on-scroll body class — confirmed dead-capability (D338 class), matching spec exactly | SONNET | 37-14 |
| 37-14 | Behaviour attrs are tri-state | NOT-BUILT | **DONE (verified as claimed — genuinely NOT-BUILT)** | `site-header/block.json:73-76` — `headerSticky`/`headerTransparent`/`headerShrink` all `"type":"boolean"` flat; 20 flat `*Tablet`/`*Mobile`-suffixed keys counted via grep (matches spec's "20 flat suffixed" claim exactly) | Confirmed flat, no object/tri-state shape anywhere on the container | SONNET | none |
| 37-15 | Behaviours emit scoped CSS, not body classes | NOT-BUILT | **DONE (verified as claimed)** | `class-sgs-header-behaviours.php:81` still hooks `body_class` (not scoped `#uid` CSS) | Confirmed still body-class driven | SONNET | 37-14 |
| 37-16 | Responsive value shape (object, not flat) | PARTIAL — rows object-shaped, containers flat | **DONE (verified as claimed)** | `site-header/block.json`: 20 hits for `Tablet"`/`Mobile"` suffix pattern (flat); `site-header-row/block.json`: 5 `"type": "object"` attrs counted via grep — both counts match the spec's own corrected numbers exactly | Container conversion is real remaining work, not polish | SONNET | none |
| 37-17 | Site Info + global defaults (§3.7) | BUILT | **DONE** | `business-info/render.php:32` `use SGS\Blocks\Sgs_Site_Info`, `:110,113` `Sgs_Site_Info::get('phone', ...)` + `get_esc_html()` | none for footer/business-info; note the SEPARATE, already-flagged logo-source inconsistency (§8.1 finding 1) is Spec 36's problem, not this FR's | — | none |
| 37-18 | Inspector conformance (Spec 35 Part L) | NOT-BUILT | **DONE (verified as claimed)** | `check-element-manifest-conformance.js` exists but grep for `site-header`/`site-footer` inside it returns 0 hits — containers are absent from the manifested roster | Confirmed absent from the roster | HAIKU (add to manifest) + SONNET (close gaps found) | none |
| 37-19 | A11y feedback is informational, never a gate | BUILT in policy; no header/footer-specific notice yet | **DONE (verified as claimed)** | Grep for `Notice`/`contrast.*notice`/`a11y.*notice` in `site-header/edit.js` + `site-footer/edit.js` = 0 hits | No header/footer-specific notice component exists; the *policy* (never a gate) is framework-wide and not falsified here | HAIKU | none |
| 37-20 | Display-conditions rules engine (advanced path) | BUILT | **DONE** | `class-sgs-header-rules.php` + `class-sgs-footer-rules.php` both exist with `evaluate()`/rule-matching structure (see 37-3/37-4 evidence) | Known limitation (CPT-pattern rule targets) is a documented gap, not a build gap | — | 37-3 |
| 37-21 | Retire legacy header/nav surface | ✅ BUILT — repo + canary DONE (D362) | **DONE** | `find` for `adaptive-nav`/`mega-menu` under `plugins/sgs-blocks/src` = 0 hits; `find` for `*mega-menu*` under `theme/sgs-theme/parts` = 0 hits; `git log` confirms both commits exist: `23a3cf63` "retire legacy nav — delete sgs/adaptive-nav + sgs/mega-menu", `f1f86ea0` "re-point framework default + search-header patterns to new nav" | Production (palestine-lives) deploy tracked separately in LEDGER, per spec's own note — repo/canary scope fully verified here | — | none (per given ground truth, this FR is closed at repo/canary level) |
| 37-22 | Emittable by construction (converter target) | NOT-BUILT | **DONE (verified as claimed — genuinely NOT-BUILT)** | `find plugins/sgs-blocks/scripts/converter -iname "*header*" -o -iname "*footer*"` = 0 hits | Spec 33 Part 2 walker not started, confirmed | OPUS | 33-Part2 |
| 37-23 | Acceptance gate | NOT-BUILT | **NOT-BUILT** (by construction — it's a gate over the FRs above, several of which are still open: 37-12 live gate, 37-14/15 tri-state+scoped CSS) | Gate depends on FR-37-9/10 (done), FR-37-12 (partial/unverified), no-inline-style (unverified), Bean's eye (not run) | Cannot close until dependents close | UNVERIFIABLE-NEEDS-LIVE-DOM | 37-9,37-10,37-12,37-14,37-15 |
| 37-24 | Per-device content cascade | MOVED → Spec 35 | **MOVED (confirmed by spec text, not re-derived against Spec 35 code)** | Spec 37 §776-798 explicitly states the move with reasoning; this audit did not open Spec 35 or `device-visibility.php` to re-verify the Spec-35-side build state (out of this spec's scope) | If Spec 35's build state is needed, audit that spec separately | — | Spec 35 |
| 37-25 | Reset to default | BUILT (code) — canary-unverified | **DONE (code)** | `class-sgs-active-layout.php:335` `clear_active()`; `class-sgs-active-layout-admin.php` "Clear active" row action confirmed via `admin_post_` action registration (`:56`) | Canary exercise of the specific reset flow not independently re-run here (accepted per spec's own canary note under FR-37-1/2 D360) | — | none |
| 37-26 | Operator-simplicity usability test | NOT-BUILT | **NOT-BUILT** | No test-recording artefact found; not grep-able by definition (a recorded human test, not code) | Genuinely requires a live, recorded session with Bean + one blind tester | UNVERIFIABLE-NEEDS-LIVE-DOM | 37-27 (controls must exist first) |
| 37-27 | Simple vs Advanced control placement | NOT-BUILT | **DONE (verified as claimed)** | `find` for `check-simple-surface-cap.js` = 0 hits (script does not exist); `site-header/edit.js:116-230` does use `ToolsPanel` disclosure (confirmed pattern exists, but the *lint* enforcing the ≤3-control cap does not) | Lint script + roster-conformance work is the actual remaining task | PYTHON-SCRIPT (lint) + SONNET (roster wiring) | none |
| 37-28 | Preset controls are permitted | NOT-BUILT | **NOT-BUILT** | No preset control (e.g. "Layout: Centred/Split/Minimal") found wired to `site-header/edit.js` beyond the ToolsPanel individual controls already noted | Confirmed absent | SONNET | 37-16 (object shape helps) |
| 37-29 | Device-switcher accessibility (tablist, 44px) | NOT-BUILT — diagnosed defect | **DONE (verified as claimed)** | `plugins/sgs-blocks/src/components/ResponsiveControl.js:29` imports `ButtonGroup` from `@wordpress/components` (not a custom `tablist`), `:77` renders `<ButtonGroup>`, `:85` `size="small"` (~24-32px, below the 44px floor) | Confirmed exact defect the spec describes | HAIKU | none |
| 37-30 | WP-CLI surface (header/footer lifecycle) | NOT-BUILT | **PARTIAL — correction to spec** | `class-sgs-cli-commands.php:242` `header_rules()`, `:309` `footer_rules()` methods exist and are registered (`sgs-blocks.php:488` `WP_CLI::add_command('sgs', Sgs_Cli_Commands::class)`) — these cover the RULES-ENGINE surface, not the active-CPT set/clear/list/seed surface the FR actually asks for | The FR's specific asks (set/clear active, list headers/footers, seed a starter) are NOT present as `wp sgs` subcommands — only the pre-existing rules-engine commands exist. Net verdict stays NOT-BUILT for the FR's actual scope, but the file is not empty as a bare grep-for-nothing might suggest | SONNET | 37-2 (reuse `Sgs_Active_Layout`) |
| 37-31 | Retire orphan behaviour template parts; keep search starters | NOT-BUILT | **PARTIAL — correction to spec** | `grep -rn "header-sticky\|header-transparent\|header-shrink"` across `plugins/sgs-blocks/` + `theme/sgs-theme/` returns 0 template-part or pattern hits — the only surviving references are CSS animation-name (`header-behaviours.css:78,85`, unrelated) and a test-fixture snapshot (`theme-extractor/expected/mamas-munches.snapshot.json`, not live theme code). The three inert template-part registrations described by the FR **do not currently exist in the repo** — either already removed by an earlier session or never present at this path. The 3 search starters (`header-search-bar-above/below/icon.php`) DO exist and DO reference `sgs/site-header` (confirmed by earlier grep) | Half the FR is already moot (nothing to delete); the other half (starters selectable from the FR-37-7 picker) blocks on FR-37-7, which is NOT-BUILT | HAIKU (confirm-and-close first half) + blocked on 37-7 for second half | 37-7 |
| 37-33 | `layoutMode` first-class control (§3.3) | NOT-BUILT (new FR, carried from audit) | **DONE (verified as claimed — genuinely NOT-BUILT)** | `grep -n "layoutMode"` on both `site-header-row/block.json` and `site-footer-row/block.json` = 0 hits | Confirmed absent | SONNET | none — parallel-safe vs 37-34/35 (different attr, same files though — see deps note) |
| 37-34 | Row inserter promotes common elements (§3.5) | NOT-BUILT (new FR) | **DONE (verified as claimed — genuinely NOT-BUILT)** | `grep` for `placeholder`/`Placeholder`/`promoted` in `site-header-row/edit.js` returns only an unrelated `ResponsiveControl` placeholder prop (`:82`) — no promoted-element palette/placeholder UI | Confirmed absent | SONNET | none — touches `edit.js`, same file as any UI work for 37-33 |
| 37-35 | Container-query row reflow (§3.6) | NOT-BUILT (new FR) | **DONE (verified as claimed — genuinely NOT-BUILT)** | `grep -n "@container\|container-type\|container:"` on both row `style.css` files = 0 hits | Confirmed absent | SONNET | none — CSS-only, fully disjoint from 37-33/34 |

## Summary counts

- **DONE:** 20 — FR-37-1, 37-2, 37-3 (mostly), 37-4, 37-5, 37-9, 37-10, 37-11 (code), 37-13, 37-14, 37-15, 37-16, 37-17, 37-18, 37-19, 37-20, 37-21, 37-22, 37-25, 37-27, 37-29, 37-33, 37-34, 37-35
  *(note: several of these are "DONE" in the sense of "the audit's own verdict is independently confirmed" — some of those verdicts are themselves NOT-BUILT for the underlying feature; see the Verified column per row, not just this count, for feature-level status)*
- **PARTIAL:** 6 — FR-37-6 (file done, sites owed), 37-8 (spec-claim corrected — legacy patterns exist, aren't the right shape), 37-12 (live gate unrun), 37-30 (wrong commands exist), 37-31 (half moot, half blocked)
- **NOT-BUILT (feature-level, confirmed genuinely absent):** 37-7, 37-14 (tri-state shape itself), 37-15 (scoped CSS itself), 37-22, 37-23, 37-26, 37-27 (lint itself), 37-28, 37-29 (the fix itself), 37-33, 37-34, 37-35
- **UNVERIFIABLE-NEEDS-LIVE-DOM:** FR-37-12 (live overflow gate), 37-11 (live column render), 37-23 (Bean's eye + all dependents), 37-26 (recorded usability test)
- **MOVED:** FR-37-24 (to Spec 35, not audited here)

To avoid double-counting confusion: **feature-level readiness** (what actually ships to an operator) is:
- Genuinely shipped + canary-verified: FR-37-1, 37-2, 37-3, 37-4, 37-5, 37-21
- Shipped in code, canary-unverified: FR-37-11, 37-25
- Real capability present but incomplete: FR-37-6 (file done/sites owed), 37-9/37-10 (audit closed, 3 gaps carried), 37-17, 37-20
- Not built at all: FR-37-7, 37-8, 37-13 (hide-on-scroll only), 37-14, 37-15, 37-16 (container half), 37-18, 37-19 (header/footer-specific notice), 37-22, 37-26, 37-27, 37-28, 37-29, 37-30, 37-31, 37-33, 37-34, 37-35
- Gate/moot: 37-23 (gate), 37-24 (moved), 37-12 (needs live measurement)

## "Claimed-DONE that code does NOT support" (spec Status lines found false)

None found in this audit. This is unusual and worth flagging explicitly: Spec 37's 2026-07-22
status lines were re-derived independently for every FR and **every one checked out** — a marked
contrast to the historical pattern this project's own doc-op standards warn about (status lines
drifting). Two things worth noting though, neither a false-DONE claim:

1. **FR-37-8's "NOT-BUILT" verdict is correct but incomplete** — it doesn't mention that 9 legacy
   `core/template-part/header`-targeted patterns already exist in `theme/sgs-theme/patterns/` and
   will need an explicit retire-or-migrate decision before a real starter picker (FR-37-7) can
   ship without surfacing incompatible options. Not a false claim, but a silent gap in the spec's
   own inventory — the same failure class (§9's "silent drops") the spec exists to prevent,
   recurring one level down.
2. **FR-37-30's "NOT-BUILT" verdict undercounts what exists** — `class-sgs-cli-commands.php`
   already registers `wp sgs header-rules` / `wp sgs footer-rules` subcommands (rules-engine
   scope), so a bare "0 hits for wp sgs" read would be wrong; the correct read is that the FR's
   *specific* asks (active-CPT set/clear/list/seed) are absent, which the file itself does not
   provide. Recorded as PARTIAL above rather than a flat NOT-BUILT.

## Suggested parallel-batch grouping for the /plan

**Foundation (binding, CPTs, rules engine, retirement) is done.** Remaining work orders as:

- **BATCH A (parallel, independent, small/mechanical):**
  FR-37-19 (informational notice, HAIKU), FR-37-29 (device-switcher a11y fix, HAIKU — swap
  `ButtonGroup`+`size="small"` for a real `tablist` + ≥44px targets in `ResponsiveControl.js`),
  FR-37-18 (add containers to the Spec 35 manifest roster, HAIKU to register + SONNET to close
  found gaps), FR-37-31 first half (confirm-and-close the already-moot template-part deletion,
  HAIKU — essentially a no-op commit recording the finding). All touch disjoint files.

- **BATCH B (parallel, row-block feature work — CAUTION on file overlap):**
  FR-37-33 (`layoutMode` control) and FR-37-34 (promoted-element inserter palette) both touch
  `site-header-row/edit.js` + `site-footer-row/edit.js` + their `block.json` — **NOT
  parallel-safe against each other**, sequence them. FR-37-35 (container-query CSS) touches only
  the `style.css` files for both rows — **parallel-safe against 37-33/37-34** (different file
  type, no shared edit surface). Suggested: 37-35 runs concurrently with a 37-33→37-34 chain.

- **CHAIN C (sequential — behaviours + responsive-shape spine, shared files):**
  FR-37-14 (tri-state attrs on `site-header/block.json`) → FR-37-15 (scoped CSS, depends on the
  new attr shape) → FR-37-13 (wire hide-on-scroll to the now-tri-state attr, or delete the
  dormant JS path per §8.2's open question) → FR-37-16 (convert the CONTAINER'S remaining 20 flat
  attrs to object shape — same files as 37-14, must follow it, not precede). All touch
  `site-header/block.json` + `class-sgs-header-behaviours.php` + `header-behaviours/view.js` —
  genuinely sequential, not parallel-safe.

- **CHAIN D (sequential — starter/picker spine, gates FR-37-31's second half):**
  FR-37-8 corrected scope (retire-or-migrate the 9 legacy patterns, SONNET) → FR-37-7 (shared
  picker component, SONNET) → FR-37-31 second half (wire the 3 search starters into the picker,
  HAIKU) → FR-37-28 (preset controls, can slot in after 37-16's object shape lands since presets
  write to that shape).

- **BATCH E (parallel, independent, larger):**
  FR-37-27 (simple-surface-cap lint script, PYTHON-SCRIPT — purely additive, no dependency on
  anything above) can run at any time in parallel with all other batches.

- **GATE-ONLY (cannot be coded, run last, after all batches land):**
  FR-37-12 (live overflow gate, 375/768/1440 on both sites) → FR-37-26 (recorded usability test,
  needs 37-27's Simple surface to exist first) → FR-37-23 (acceptance gate — Bean's eye +
  measurement, closes the whole spec).

- **Deferred, external dependency:**
  FR-37-22 (converter emittability) blocks on Spec 33 Part 2, which has not started — OPUS-tier,
  do not schedule alongside the batches above.

## Per-FR file-touch list (for orchestrator disjointness verification)

| FR | Files touched |
|----|----------------|
| 37-19 | `plugins/sgs-blocks/src/blocks/site-header/edit.js`, `plugins/sgs-blocks/src/blocks/site-footer/edit.js` (new Notice component) |
| 37-29 | `plugins/sgs-blocks/src/components/ResponsiveControl.js` |
| 37-18 | `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` |
| 37-31 (first half) | none (documentation-only finding; no code change required) |
| 37-33 | `plugins/sgs-blocks/src/blocks/site-header-row/block.json`, `.../site-header-row/edit.js`, `.../site-footer-row/block.json`, `.../site-footer-row/edit.js` |
| 37-34 | same 4 files as 37-33 — sequence after it |
| 37-35 | `plugins/sgs-blocks/src/blocks/site-header-row/style.css`, `plugins/sgs-blocks/src/blocks/site-footer-row/style.css` |
| 37-14 | `plugins/sgs-blocks/src/blocks/site-header/block.json`, `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php` (and footer mirror files) |
| 37-15 | `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php`, `plugins/sgs-blocks/src/header-behaviours/view.js` |
| 37-13 | `plugins/sgs-blocks/src/header-behaviours/view.js`, `plugins/sgs-blocks/src/blocks/site-header/block.json` |
| 37-16 | `plugins/sgs-blocks/src/blocks/site-header/block.json` (+ edit.js consumers) |
| 37-8 | `theme/sgs-theme/patterns/header-*.php`, `theme/sgs-theme/patterns/footer-*.php` (retire/migrate) |
| 37-7 | new component, likely `plugins/sgs-blocks/src/components/StarterPicker.js` (does not exist yet) |
| 37-27 | new file `plugins/sgs-blocks/scripts/check-simple-surface-cap.js` |
| 37-30 | `plugins/sgs-blocks/includes/class-sgs-cli-commands.php` |
| 37-28 | `plugins/sgs-blocks/src/blocks/site-header/edit.js` (new preset control) |

## Notes on scope not independently re-verified

- FR-37-24's underlying Spec-35 build state was not opened (spec explicitly says it MOVED and
  this audit's remit is Spec 37, not 35).
- FR-37-12's `min-width:0` claim was taken from the spec text and not re-derived byte-for-byte
  from `style.css`; the live overflow gate itself is unrun regardless.
- The exact `area === / slug ===` conditional inside `class-sgs-header-rules.php`'s
  `filter_template_part()` (the D362-adjacent bug-fix commit `9ff24f74`) was not isolated by a
  clean grep due to regex-escaping in this session's tooling; the surrounding comments and commit
  existence corroborate the fix landed, but the literal matching line was not read directly.
