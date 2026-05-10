---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-10
---

# Parking — deferred work with named triggers

Items here have a clear next-step but aren't urgent. Each entry: the work, the trigger to resume, the spec, and rough effort. Resolved items are kept as one-line summaries (no ORIGINAL retention to keep the file scannable).

## Resolved 2026-05-10
- **P-12** block_compositions seed → 36 rows seeded into sgs-framework.db; seed script at `plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py` is idempotent (re-run preserves count). QC PASS.
- **P-13** uimax-write-validator integration → validator script confirmed already enforcing rows 211 + 213; 5/5 `/uimax-*` skills mandate validator calls; new `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` Python helper provides atomic validate-then-write. QC PASS.
- **P-15** `/sgs-update` Stage 3+4 → REWRITTEN late-session per Bean's catch: DB is now canonical, CSVs are regenerated mirrors. New `regenerate-csvs` subcommand on `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py` mirrors all 46 DB tables → CSV. `sgs-update-uimax-sync.py` Stage 3 writes SGS blocks to uimax DB via `uimax_write.py` validate chain (skip-if-exists preserves existing Rosetta Stone), then subprocess-calls `update-db.py regenerate-csvs`. Round-trip safe (regen → compile-sqlite → regen) verified by `/qc` 5/5 PASS. Closes the silent-data-loss vector across all uimax tables.
- **P-4** Trustpilot scrape (Mama's Munches) → 4/4 reviews captured to `sites/mamas-munches/research/trustpilot-reviews.json`. QC PASS.
- **Dashboard `/api/learning` POST UPDATE bug** → Subagent D applied COALESCE-based patch to `~/.openclaw/workspace/tools/blub-dashboard-v2/src/app/api/learning/route.ts`; `/rebuild-dashboard` ran (PID 64452 → 16720); patch active; row 69 modernisation re-POSTed and confirmed; test row 219 archived.

---

## Active items (cloning pipeline focus)

### P-11-M9 — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)

**Status as of 2026-05-09 (this session):** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. The wp-sgs-developer subagent was given a brief that contained a fallback ("hero-only deploy is acceptable") and took it; only the M8 hero markup was redeployed to the homepage post. Operator never opened the live URL before claiming success. Live result: hero+footer only, debug WordPress nav, empty footer fields, hero not a clean clone of post 29. Lesson captured as `dont-delegate-the-test-of-unproven-work` (blub.db row 221). M9 must be redone fresh — see next session prompt.

**Critical reframe for the redo:** The end goal is the PIPELINE, not the homepage. The homepage being a perfect clone is the OUTCOME of a working pipeline. When discrepancies are found in the next session, the fix is to identify the failing pipeline component and fix it, then rerun — NEVER patch the artefact directly. Manual SQL edits to fix the WordPress nav menu, manual content fills for the footer, hand-edited block markup are all forbidden. If the pipeline cannot produce a clean clone, the pipeline is incomplete and that is what gets fixed.

**Captured:** 2026-05-09 (M7-M10 session close), reopened 2026-05-09

**Status update 2026-05-09 session:** M7 + M8 COMPLETE.
- M7: 6 sibling skills shipped via /lifecycle Mode A, all >=B grade. Skill scoreboard at evaluation-history.json. Rubric files all carry `bean_signoff: confirmed_via_m7_brief_2026-05-08`.
- M8: minimal orchestrator at plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py. Hero smoke at 100% PoC parity (50/50 attrs match manual baseline). Visual-diff report at reports/visual-diff/hero-2026-05-09.md.
- M9: deferred to next session (this entry).
- M10: handoff + narrow commit (M7/M8 artefacts only) shipped this session. Foundation commit blocked.

**What's left (M9 only):**
- Multi-section orchestrator extension to walk all 9 sections of Mama's homepage in one run (the current orchestrator is single-section)
- Live deploy OVERWRITING the sandybrown homepage (Bean instruction 2026-05-09 — deploy target is the live homepage post, not a sibling post). Snapshot existing `post_content` first for rollback. Post 29 stays preserved as manual hero PoC reference.
- Multi-frame Playwright capture at 0/200/500/1000/3000 ms across 375/768/1440 viewports
- mockup-parity-validator.js per section
- screenshot-diff-helper.js per Q1-Q4 delta flagged
- 13 remaining block visual-diff reports written to reports/visual-diff/<block>-<date>.md (button, container, data-display, icon, icon-block, icon-list, media, mega-menu, mobile-nav, notice-banner, post-grid, process-steps, trust-bar, whatsapp-cta)
- Pre-commit STOP GATE unblocks once all 14 visual-diff reports present (hero + 13 listed)
- 690-file foundation commit lands (currently uncommitted on main since 2026-05-08)
- Bucket-2 session unblocks for Tasks 10-12 dogfood loop

**Source docs (still relevant for M7-M10):**
- `.claude/handoff.md` — 2026-05-08 mega-session digest (M1-M6 completed work + framework state)
- `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — 97 rules audited; Top-5 closed in Wave 4
- `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 review findings; critical fixes 5/5 PASS
- `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` — canonical 9-stage pipeline spec
- `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS section
- `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` REVISIONS section

**Canonical next-session-prompt:** `.claude/next-session-prompt.md` — full M7-M10 task brief with skills/MCP/agents tables.

**Effort:** ~3 hours wall-time remaining (M7 sequential + M8/M9 main-thread + M10 close).

**Resume trigger:** when Bean has a focused window for the M7-M10 build session.

---

### P-12 — `block_compositions` table seed for existing 36 patterns

**Captured:** 2026-05-08

**What:** sgs-db `block_compositions` table is currently empty (0 rows). The schema exists; the cloning pipeline will populate it for new patterns. But the existing 36 patterns in `theme/sgs-theme/patterns/` and `plugins/sgs-blocks/patterns/` need their composition data seeded too — otherwise existing patterns are invisible to the recogniser's pattern-vs-block-composition queries.

**Method:** Walk each existing pattern .php file, parse the block markup (recursive parser per CLAUDE.md gotcha), extract block_slugs JSON list, INSERT one row per pattern.

**Effort:** ~30 min Cerebras script + my QC.

**Resume trigger:** alongside P-11 (cloning-skill build) — runs as part of Milestone 1.

---

### P-13 — Validator on uimax writes (no-licensing + Rosetta Stone discipline)

**Captured:** 2026-05-08 (audit finding from Stage +Register)

**What:** Two captured rules — `no-licensing-talk-in-sgs-cloning-context` (blub.db row 211) and `uimax-is-the-rosetta-stone-of-design` (blub.db row 213) — are embedded in skill bodies and the project CLAUDE.md, but no automated validator on uimax writes prevents reintroduction. New `/uimax-*` tools could still write rows that violate either rule.

**Spec:** Pre-write hook in each `/uimax-*` command that:
1. Greps the row payload for licensing-related keywords (`license`, `provenance_license`, `IP-firewall`) → reject + surface row 211
2. For artefact-shaped rows (patterns / components / animations / naming_conventions), validates `equivalent_implementations` is populated with at minimum `sgs_block` (or explicit `null` + gap-candidate flag) → reject otherwise + surface row 213

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** During P-11 Milestone 6 (recognition_log + operator UI) — same surface area.

---


### P-15 — `/sgs-update` Stage 3+4 (uimax sync extension)

**Captured:** 2026-05-08

**What:** `/sgs-update` currently mirrors block.json files into sgs-db. The audit identified two missing stages:
- Stage 3 — Mirror sgs-db blocks → uimax `component_libraries` (one row per SGS block, populated as part of P-11 anyway but the auto-sync is the durable mechanism)
- Stage 4 — Scan uimax `animations.is_gap_candidate=1` rows; if an SGS block has an attribute matching the gap, surface a "gap candidate ready to close" report for operator review

**Why separate from P-11:** Bean may want this independently of the full cloning-skill build, e.g. for solving the "uimax stays stale every block change" problem before full Option A ships.

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** Either P-11 Milestone 1 OR a smaller dedicated 30-min session if Bean wants the sync gap fixed before the full build.

---

### P-9 — Bucket 2 new blocks + timeline rework

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Total estimate: 3.5-5.5 hrs.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After P-11 ships.

---

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)

**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

## Active items (framework / SGS surface)


### P-2 — Phase 2.5 / G2.5 deferred work

See `.claude/plans/phase-2-rubrics-universe.md` G2.5 section. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---

### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** Subagent attempt blocked by Trustpilot anti-bot. Inline Playwright not yet tried.

**Trigger to resume:** Mid-design-clone session, when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-17 — Shared universal icon picker component (framework-wide upgrade)

**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration

**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


## Resolved items (kept as one-line audit trail)

- **~~P-17 — Universal IconPicker component~~** — COMPLETED 2026-05-08. Source-agnostic `<IconPicker>` shipped (Lucide + emoji + extensible via `sgs_register_icon_set` PHP hook + `sgs.icon-picker.sources` JS filter). 9 blocks migrated via P-17b/c (icon-list, icon, icon-block, info-box, process-steps, button, whatsapp-cta, notice-banner, trust-bar). `sgs_render_icon($value)` PHP helper added.
- **~~P-18 — Nested sub-points for sgs/icon-list~~** — COMPLETED 2026-05-08. Tree-shaped items[] with recursive render, MAX_DEPTH=4, `subMode='inherit'` auto-derives sub-marker from parent (parent ordered numbers → children ordered letters). Indent/outdent buttons + Add sub-item action. v6 deprecation chain wraps existing flat data.
- **~~P-19 — Saved-defaults system audit + WP-native migration~~** — COMPLETED 2026-05-08. System fully retired (was global filter, not per-block). Deleted `extensions/block-defaults.js`, `class-block-defaults.php`, `block-defaults.php`. CLAUDE.md (project + plugin) embeds the four-channel canonical model: Visual = WP Global Styles / Structural = block patterns / Per-operator memory = sessionStorage / Per-instance = inspector. 25 new structural patterns added across 8 high-leverage blocks.

- **~~P-6 — Image controls block extension~~** — COMPLETED 2026-05-08. New extension at `plugins/sgs-blocks/src/blocks/extensions/image-controls.{js,php}` + extensions.css extension. 7 blocks opted in via `supports.sgs.imageControls: true` (decorative-image / gallery / card-grid / hero / info-box / team-member / testimonial). Webpack clean. Project CLAUDE.md updated with Image controls discipline rule.
- **~~P-8 — Reduced-motion rules audit~~** — COMPLETED 2026-05-08. 8 redundant rules removed across 4 files (1 bonus file surfaced). 1 rule kept (header-modes scroll-driven shrink animation — `animation-timeline: scroll()` ignores duration; `animation: none` is the only valid suppression).
- **~~P-14 — `block-name-search-blindspot` grep wrapper~~** — COMPLETED 2026-05-08. `scripts/sgs-block-grep.py` with TRIPLE-term search: literal heading + parenthetical-stripped form + slug-form `sgs/<derived>` (the actual hit-finder for SGS source). Three Haiku-introduced bugs fixed inline: docstring unicode-escape, brace-glob at arg level, Windows-path drive-letter parser collision. Final test: "Hero Block" → 80 hits (71 via slug); "Icon Block (single icon)" → 43 hits.
- **~~P-16 — Embed `diagnose-blub-db-locks-not-park-on-timeout` rule into `/autopilot` + `/handoff`~~** — COMPLETED 2026-05-08. Embedded in BOTH targets per parking entry intent: (a) `~/.claude/skills/autopilot/references/correction-capture.md` Failure handling — full HARD GATE diagnostic sequence + unicode-substitution fallback (row 199); (b) `~/.claude/commands/handoff.md` — Persistence-failure HARD GATE banner at top of Pre-Handoff Gates pointing back to autopilot's diagnostic sequence so /handoff Gate 4 dashboard sync calls inherit the rule.
- **~~P-1 — `/gap-analysis` SKILL.md edits~~** — COMPLETED 2026-04-30. All 4 A-grade edits landed. Skillscore held at 92%.
- **~~P-3~~** — (slot reserved, never used)
- **~~P-5 — `sgs/feature-grid` block~~** — COMPLETED 2026-05-04. Built with auto-flex / fixed-columns layout modes; ingredients pattern uses fixed-columns (4/2/1).
- **~~P-7 — sgs/icon vs sgs/icon-block duplicate cleanup~~** — COMPLETED 2026-05-04. sgs/icon canonical; icon-block hidden via `supports.inserter: false` + deprecated.js for back-compat.
- **~~Old P-9 — Recogniser-v2 generalisation beyond hero~~** — SUPERSEDED 2026-05-08 by P-11 (rule-stage coverage audit + revised Option A path). The work folds into the comprehensive cloning-skill build session.
- **~~H-1 — Hero block inspector reorganise by element~~** — RESOLVED 2026-05-05. 21 panels → 10 element-grouped panels.
- **~~H-2 — `imagePadding` vs `mediaPadding` redundancy~~** — RESOLVED 2026-05-05. Inspector labels clarified ("inner padding" vs "outer wrapper padding") with HelpText. Folded into H-1's element-grouped layout.
- **~~H-3 — Video-everywhere-image feature~~** — RESOLVED 2026-05-05. Shared `MediaPicker.js` + `sgs_render_media()` PHP helper. 9 of 11 blocks migrated; 2 NO-OP. Recipe at `tools/qc-prevention/media-slot-migration.md`.
- **~~H-4 — Brand-source pink shade vs mockup brief~~** — RESOLVED 2026-05-05. Built `scripts/brand-palette-sampler.py` (PIL k-means + ΔE 2000). Finding: `--surface-pink #F5C2C8` is designer-invented (no brand anchor); brand uses `#E68A95` primary pink + warm peach/tan family. Bean approved adding warm tones.
- **~~H-5 — Classifier human-eye gate~~** — RESOLVED 2026-05-05. `screenshot-diff-helper.js` (560 lines) + `requires_screenshot_review` flag in `mockup-parity-validator.js` + Hard Rule 10 baked into visual-qa SKILL.md.
- **~~H-6 — replaceBlock helper packaged~~** — RESOLVED 2026-05-05. `scripts/wp-update-block-attrs.js` (385 lines).
- **~~H-7 — Full-bleed pattern replacement~~** — RESOLVED 2026-05-05. Viewport-aware `var(--viewport-width, 100vw)` calc-based margins + JS measurement helper. Wave 6 deploy verified PASS.
- **~~H-8 — Hero ctaGap attribute + recogniser blind spot~~** — RESOLVED 2026-05-06. 4 attrs added (ctaGap + responsive variants). v5 deprecation. Recogniser fix folded into Section R prevention scripts.
- **~~H-9 — Background shorthand audit~~** — RESOLVED 2026-05-06. 3 of 15 matches required fixing (cta-section + post-grid). `css-pattern-audit.js` extended.
- **~~H-10 — Cascade Section R defects into prevention scripts~~** — RESOLVED 2026-05-06. Background shorthand audit, pseudo-element measurement, parent-chain filter walker — all shipped.
