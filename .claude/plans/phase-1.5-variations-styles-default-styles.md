---
doc_type: phase-plan
project: small-giants-wp
phase: 1.5
phase_name: Variations + Styles + Default-Styles authoring for composite blocks
session_marker: After Step 1.5.3 commit (12 sibling files landed + Playwright cross-check passed)
calibrated_time: ~30-45 min build + 10 min Playwright + 5 min /qc-inline = ~45-60 min total
prerequisites: Phase 1 (DB merge — shipped at ~/.agents/skills commit 8c56ab6). Phase 2 NOT a prerequisite; Phase 2 re-runs AFTER 1.5 lands.
parallel_with: Sessions B Phases 5a + 5b (no conflict — different layers). Session B's Phase 6 is gated on this phase landing.
qc_gate_after: /qc-inline multi-model panel on the commit + Playwright cross-check of editor inserter
generated: 2026-05-22
---

# Phase 1.5 — Variations + Styles + Default-Styles authoring for composite blocks

**USP:** Closes a real client-onboarding UX gap. Today 67 of 69 SGS blocks ship as blank scaffolds in the inserter — tech-illiterate clients have to configure every attribute by hand. After this phase, 12 composite blocks ship 2-4 inserter-discoverable variations each, each with a sensible default style already applied. Operators click "Product Card" → get a polished card immediately, override the finish via sidebar if they want.

**Plan label:** [PLAN: sonnet] — well-spec'd mechanical PHP authoring with shared template; no architectural decisions inside.

**Docscore:** B+ (self-graded; structure complete, time estimates calibrated low, all gates commandable)

**Aggregate cost estimate:** ~3 Sonnet subagent waves × 4 blocks each, ~20-30k input + ~15-20k output tokens per wave. Total ~$1.20-$1.80 in Sonnet billing for the build. Playwright + /qc-inline add ~$0.20.

## Phase success criteria (done when)

- [ ] 12 sibling files exist at `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`
- [ ] Each sibling file registers ≥2 variations via `register_block_variation()` AND ≥2 block styles via `register_block_style()`
- [ ] Each variation includes `className: 'is-style-X'` in its `attributes` defaults pointing to a registered style from the same block
- [ ] All registrations hooked on `init` action (WP standard timing)
- [ ] All CSS classes follow SGS-BEM (`.sgs-<block>__<element>--<modifier>`) where introduced
- [ ] All colour / spacing / border values reference design tokens (`var(--wp--preset--...)`) — zero hex literals
- [ ] Playwright on dev site: open block inserter, confirm 2+ variations show for each of the 12 blocks; insert each variation, confirm wrapper has `is-style-X` class
- [ ] After Phase 2 re-scans, `variations` table contains ≥ 24 SGS rows (12 blocks × 2 minimum)
- [ ] /qc-inline multi-model panel verdict: ship

## Entry context (read before starting)

- `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php` — the loader (already exists; auto-discovers `sgs-*.php` sibling files via glob)
- `plugins/sgs-blocks/includes/class-sgs-blocks.php` lines 200-225 — the one existing `register_block_style()` call (sgs/social-icons "Footer plain, light") as a working PHP-side example
- `theme/sgs-theme/theme.json` — design tokens to reference in style CSS
- `~/.claude/CLAUDE.md` hard rule "No hardcoding" — every default attribute value must reference a token
- `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §8.1 — SGS-BEM convention for any new CSS classes
- 12 target `block.json` files in `plugins/sgs-blocks/src/blocks/{hero,card-grid,cta-section,testimonial,team-member,pricing-table,accordion,tabs,gallery,post-grid,form,info-box}/block.json` — for attribute schema lookup

## References

- WordPress Block Editor Handbook — `register_block_variation()` API: `https://developer.wordpress.org/block-editor/reference-guides/block-api/block-variations/`
- WordPress Block Editor Handbook — `register_block_style()` API: `https://developer.wordpress.org/block-editor/reference-guides/block-api/block-styles/`
- `feedback_palette_defaults_for_blocks.md` — every block colour default must reference a palette token

## Tooling Index

| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | Step 1.5.0 model routing |
| skill | /dispatching-parallel-agents | Step 1.5.2 (3-way fan-out) |
| skill | /subagent-prompt | Step 1.5.2 (cold prompts) |
| skill | /qc-inline | Step 1.5.4 QA gate |
| cli | grep | Step 1.5.1 (pre-flight: confirm no existing sibling files) |
| cli | php -l | Step 1.5.2 + 1.5.3 (syntax validation per file) |
| mcp | Playwright | Step 1.5.3 (editor inserter cross-check) |
| cli | wp eval-file | Step 1.5.3 (registered_variations enumeration via PHP) |

## Risks identified

| Risk | Likelihood | Impact | Mitigation step |
|---|---|---|---|
| `className` attribute default doesn't actually apply on insertion (WP serialiser may strip) | Medium | High | Step 1.5.3 Playwright check: insert each variation and assert `wrapper.classList.contains('is-style-X')` is true. If any fail, write fallback in `pre_render_block` filter to apply the class server-side. |
| Variation `name` collides across blocks (e.g. both card-grid and post-grid registering "grid") | Low | Medium | Step 1.5.2: variation `name` is scoped per block_slug, so collisions are technically allowed — but standardise to `<block-short>-<shape>` (e.g. `cardgrid-product`, `postgrid-feature`) for clarity. Document in template comment. |
| Block style CSS not loaded → variation looks identical to default | Medium | High | Step 1.5.2: each sibling file MUST enqueue (or inline-register) the CSS for its block styles via `register_block_style()`'s `style_handle` argument OR ship CSS in the block's existing `style.scss`. Verify via Playwright that computed background/border differs between styles. |
| Existing block attributes conflict with `className` default (e.g. block has its own className override logic in render.php) | Low | Medium | Step 1.5.2: subagent checks each target block's `render.php` for `className` handling before authoring. If conflict, surface as a per-block gap. |
| Phase 2 re-scan misses new registrations because seed parser reads PHP arrays not runtime state | Medium | High | Step 1.5.4 explicit re-Phase-2 dispatch with a parser that runs `wp eval` to enumerate registered variations at runtime (replaces the static PHP-array parse from killed Phase 2). |

## Steps

---

### Step 1.5.0 — Author the canonical template (inline, ~5 min)

```
Model:       inline (architectural — template shape determines downstream consistency)
Action:      Read class-sgs-blocks.php register_block_style() call + WordPress handbook. Draft a canonical PHP template for sgs-<block>-variations.php at .claude/scratch/sgs-variations-template.php. Template includes: namespace, defined ABSPATH guard, init action hook, register_block_style calls (2 minimum), register_block_variation calls (2 minimum, each with className default), inline doc comment listing what each registration does. Hand to subagents in Step 1.5.2 as the shape they instantiate per block.
Files:       .claude/scratch/sgs-variations-template.php (NEW)
Inputs:      plugins/sgs-blocks/includes/class-sgs-blocks.php (lines 200-225)
Outcome:     Template file exists; PHP syntax valid (`php -l` exit 0); template includes 2 styles + 2 variations with className defaults
Exec:        SEQUENTIAL
Deps:        none
Marker:      SESSION-START
Time:        5 min
Tooling:     Read, Write, Bash (php -l)
On-Fail:     If WP handbook API has changed in 7.0+, /search "register_block_variation WordPress 7.0" before drafting.
Cold-Entry:  This plan doc + plugins/sgs-blocks/includes/class-sgs-blocks.php + WordPress Block Editor Handbook URL above
Test:
  Happy:       php -l .claude/scratch/sgs-variations-template.php → "No syntax errors detected"
  Edge:        Template contains placeholders {{BLOCK_SLUG}}, {{VARIATION_LIST}} that downstream subagents replace
  Fail:        Missing init hook → subagent registrations fire too early and silently no-op
  Integration: Manually require_once the template in a wp eval — should not fatal (just no-op since placeholders aren't valid block slugs)
```

---

### Step 1.5.1 — Per-block research pass (inline, ~10 min)

```
Model:       inline (judgment — each block needs its variation/style shapes named)
Action:      For each of 12 target blocks, read its block.json + render.php (or save.js if static). Note: (a) primary content slots; (b) existing className handling; (c) plausible 2-4 content-shape variations and 2-3 visual-finish styles. Output a table in .claude/scratch/phase-1.5-block-shapes.md.
Files:       .claude/scratch/phase-1.5-block-shapes.md (NEW)
Inputs:      12 × block.json + 12 × render.php (or save.js)
Outcome:     Table lists per block: 2-4 variation names + titles + key attribute defaults; 2-3 style names; recommended default style per variation
Exec:        SEQUENTIAL
Deps:        Step 1.5.0
Marker:      none
Time:        10 min
Tooling:     Read, Grep
On-Fail:     If a block's render.php has complex className logic, mark it "DEFER" in the table — Step 1.5.2 will skip it and surface as a per-block gap.
Test:
  Happy:       Table has 12 rows × 4 columns (block, variations, styles, default mapping). Each variation row names the default style.
  Edge:        Blocks with InnerBlocks (hero, accordion, tabs, gallery, card-grid) — note inner block shape per variation if relevant.
  Fail:        Block has no plausible variations (e.g. it's actually a light-block in disguise) → mark "DEFER" and proceed with 11.
  Integration: Cross-check against `sgs-framework.db blocks` table — confirm slugs match.
```

---

### Step 1.5.2 — Author 12 sibling PHP files (parallel × 3, ~25 min wall-clock)

```
Model:       sonnet (mechanical authoring with clear template; 3 parallel subagents via /dispatching-parallel-agents)
Action:      Dispatch 3 Sonnet subagents in parallel, each authoring 4 sibling files. Wave allocation: Wave A = hero + card-grid + cta-section + testimonial; Wave B = team-member + pricing-table + accordion + tabs; Wave C = gallery + post-grid + form + info-box. Each subagent reads the template + the per-block shapes table + the target block's block.json/render.php, then writes the sibling file. Per file: register 2+ styles (elevated, boxed, borderless, outlined — pick 2-3), register 2-4 variations, each variation declares className default. PHP syntax must validate before subagent reports done.
Files:       plugins/sgs-blocks/includes/variations/sgs-hero-variations.php (NEW); same pattern × 11 more
Inputs:      .claude/scratch/sgs-variations-template.php; .claude/scratch/phase-1.5-block-shapes.md; per-block block.json + render.php
Outcome:     12 new sibling PHP files exist; each passes `php -l`; loader (class-sgs-block-variations.php) auto-discovers them via the existing glob; each file's registrations don't fatal on WP boot (verified via `wp eval`).
Exec:        PARALLEL × 3 subagents (Wave A, B, C run concurrently)
Deps:        Step 1.5.1
Marker:      none
Time:        25 min wall-clock (3 parallel × ~25 min each)
Tooling:     /delegate, /dispatching-parallel-agents, /subagent-prompt, Write, Bash (php -l)
On-Fail:     Any wave that fails: surface specific block + failure reason. Other waves continue. Manual remediation in main thread on the failing block.
Prompt:      [Three cold prompts — pre-written, paste-and-run. Wave A, Wave B, Wave C below.]

  ## Wave A cold prompt (Sonnet, fresh context)

  You are authoring 4 SGS block variation+style sibling files: hero, card-grid, cta-section, testimonial. Plain English: SGS today ships 67 of 69 blocks with zero inserter-discoverable presets. This phase fixes that for composite blocks.

  ### Read first
  - .claude/scratch/sgs-variations-template.php — the canonical shape to instantiate
  - .claude/scratch/phase-1.5-block-shapes.md — per-block recommended variation + style names + default mappings
  - plugins/sgs-blocks/includes/class-sgs-blocks.php (lines 200-225) — the one existing register_block_style call as working PHP example
  - plugins/sgs-blocks/src/blocks/hero/block.json + render.php (and same for card-grid, cta-section, testimonial) — for attribute schema lookup
  - theme/sgs-theme/theme.json — design tokens; every CSS value in your output references a token, never a hex literal

  ### Per file — what to author
  For each of hero, card-grid, cta-section, testimonial:

  1. Create `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`
  2. Open with namespace SGS\Blocks; defined('ABSPATH') || exit; standard guards
  3. Hook all registrations on `add_action('init', '<your_callback>')`
  4. Call `register_block_style('sgs/<block>', [...])` 2-3 times — names from {elevated, boxed, borderless, outlined}; label is human-readable
  5. Call `register_block_variation('sgs/<block>', [...])` 2-4 times — names per the shapes table; each variation's `attributes` includes `className => 'is-style-<X>'` pointing to one of the styles you registered above
  6. Inline-CSS for the styles via wp_add_inline_style() OR ensure the block's existing style.scss handles `.is-style-<X>` selectors — Wave A: prefer wp_add_inline_style hook so this phase ships self-contained
  7. PHP comment at top documenting what variations + styles you registered + which default style maps to each variation

  ### Constraints
  - PHP only — no JS-side registration via wp.blocks.registerBlockVariation
  - All colour/spacing/border values: `var(--wp--preset--color--<slug>)`, `var(--wp--preset--spacing--<slug>)`, etc. Zero hex literals.
  - All new CSS classes follow SGS-BEM: `.sgs-<block>__<element>--<modifier>` where introduced. Style classes are `.is-style-<name>` (WP convention, not BEM — these don't need the SGS prefix).
  - SGS-BEM applies to ELEMENT/MODIFIER classes you ADD in the style's CSS; the `is-style-X` selector is WP-native and lives outside the convention.

  ### Verification before reporting done
  - `php -l plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php` exits 0 for all 4 files
  - grep your files for hex literals (`grep -E "#[0-9a-fA-F]{3,8}" plugins/sgs-blocks/includes/variations/sgs-*-variations.php`) — should return zero hits (tokens only)
  - Read your output files back and confirm each variation has `className` in its attributes defaults

  ### Commit gate
  Do NOT commit individually. Report back; main thread aggregates Wave A+B+C and commits once.

  ### Safety clauses (STRICT)
  - No `git stash`, no `git reset --hard`, no `git restore .`, no `git checkout --`, no `git clean -f`
  - No `--no-verify`, no `Co-Authored-By:`
  - Pre-existing uncommitted changes (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db) are NOT yours — DO NOT touch
  - Only NEW files in `plugins/sgs-blocks/includes/variations/sgs-*-variations.php` should be created. No other file edits.

  ### Reporting
  - File paths created
  - php -l result per file
  - hex-literal grep result
  - Any DEFER blocks (where you couldn't author cleanly) + reason

  ---

  ## Wave B cold prompt (Sonnet, fresh context)

  You are authoring 4 SGS block variation+style sibling files: team-member, pricing-table, accordion, tabs. Plain English: SGS today ships 67 of 69 blocks with zero inserter-discoverable presets. This phase fixes that for composite blocks.

  ### Read first
  - .claude/scratch/sgs-variations-template.php — the canonical shape to instantiate
  - .claude/scratch/phase-1.5-block-shapes.md — per-block recommended variation + style names + default mappings
  - plugins/sgs-blocks/includes/class-sgs-blocks.php (lines 200-225) — the one existing register_block_style call as working PHP example
  - plugins/sgs-blocks/src/blocks/team-member/block.json + render.php (and same for pricing-table, accordion, tabs) — for attribute schema lookup
  - theme/sgs-theme/theme.json — design tokens; every CSS value in your output references a token, never a hex literal

  ### Per file — what to author
  For each of team-member, pricing-table, accordion, tabs:

  1. Create `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`
  2. Open with namespace SGS\Blocks; defined('ABSPATH') || exit; standard guards
  3. Hook all registrations on `add_action('init', '<your_callback>')`
  4. Call `register_block_style('sgs/<block>', [...])` 2-3 times — names from {elevated, boxed, borderless, outlined}; label is human-readable
  5. Call `register_block_variation('sgs/<block>', [...])` 2-4 times — names per the shapes table; each variation's `attributes` includes `className => 'is-style-<X>'` pointing to one of the styles you registered above
  6. Inline-CSS for the styles via wp_add_inline_style() OR ensure the block's existing style.scss handles `.is-style-<X>` selectors — Wave B: prefer wp_add_inline_style hook so this phase ships self-contained
  7. PHP comment at top documenting what variations + styles you registered + which default style maps to each variation

  ### Constraints
  - PHP only — no JS-side registration via wp.blocks.registerBlockVariation
  - All colour/spacing/border values: `var(--wp--preset--color--<slug>)`, `var(--wp--preset--spacing--<slug>)`, etc. Zero hex literals.
  - All new CSS classes follow SGS-BEM: `.sgs-<block>__<element>--<modifier>` where introduced. Style classes are `.is-style-<name>` (WP convention, not BEM — these don't need the SGS prefix).
  - SGS-BEM applies to ELEMENT/MODIFIER classes you ADD in the style's CSS; the `is-style-X` selector is WP-native and lives outside the convention.
  - Special attention for accordion + tabs: these have InnerBlocks (accordion-item, tab). Variations may pre-declare innerBlocks defaults — confirm shape matches existing parent-child block contract before authoring.

  ### Verification before reporting done
  - `php -l plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php` exits 0 for all 4 files
  - grep your files for hex literals (`grep -E "#[0-9a-fA-F]{3,8}" plugins/sgs-blocks/includes/variations/sgs-*-variations.php`) — should return zero hits (tokens only)
  - Read your output files back and confirm each variation has `className` in its attributes defaults

  ### Commit gate
  Do NOT commit individually. Report back; main thread aggregates Wave A+B+C and commits once.

  ### Safety clauses (STRICT)
  - No `git stash`, no `git reset --hard`, no `git restore .`, no `git checkout --`, no `git clean -f`
  - No `--no-verify`, no `Co-Authored-By:`
  - Pre-existing uncommitted changes (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db) are NOT yours — DO NOT touch
  - Only NEW files in `plugins/sgs-blocks/includes/variations/sgs-*-variations.php` should be created. No other file edits.

  ### Reporting
  - File paths created
  - php -l result per file
  - hex-literal grep result
  - Any DEFER blocks (where you couldn't author cleanly) + reason

  ---

  ## Wave C cold prompt (Sonnet, fresh context)

  You are authoring 4 SGS block variation+style sibling files: gallery, post-grid, form, info-box. Plain English: SGS today ships 67 of 69 blocks with zero inserter-discoverable presets. This phase fixes that for composite blocks.

  ### Read first
  - .claude/scratch/sgs-variations-template.php — the canonical shape to instantiate
  - .claude/scratch/phase-1.5-block-shapes.md — per-block recommended variation + style names + default mappings
  - plugins/sgs-blocks/includes/class-sgs-blocks.php (lines 200-225) — the one existing register_block_style call as working PHP example
  - plugins/sgs-blocks/src/blocks/gallery/block.json + render.php (and same for post-grid, form, info-box) — for attribute schema lookup
  - theme/sgs-theme/theme.json — design tokens; every CSS value in your output references a token, never a hex literal

  ### Per file — what to author
  For each of gallery, post-grid, form, info-box:

  1. Create `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`
  2. Open with namespace SGS\Blocks; defined('ABSPATH') || exit; standard guards
  3. Hook all registrations on `add_action('init', '<your_callback>')`
  4. Call `register_block_style('sgs/<block>', [...])` 2-3 times — names from {elevated, boxed, borderless, outlined}; label is human-readable
  5. Call `register_block_variation('sgs/<block>', [...])` 2-4 times — names per the shapes table; each variation's `attributes` includes `className => 'is-style-<X>'` pointing to one of the styles you registered above
  6. Inline-CSS for the styles via wp_add_inline_style() OR ensure the block's existing style.scss handles `.is-style-<X>` selectors — Wave C: prefer wp_add_inline_style hook so this phase ships self-contained
  7. PHP comment at top documenting what variations + styles you registered + which default style maps to each variation

  ### Constraints
  - PHP only — no JS-side registration via wp.blocks.registerBlockVariation
  - All colour/spacing/border values: `var(--wp--preset--color--<slug>)`, `var(--wp--preset--spacing--<slug>)`, etc. Zero hex literals.
  - All new CSS classes follow SGS-BEM: `.sgs-<block>__<element>--<modifier>` where introduced. Style classes are `.is-style-<name>` (WP convention, not BEM — these don't need the SGS prefix).
  - SGS-BEM applies to ELEMENT/MODIFIER classes you ADD in the style's CSS; the `is-style-X` selector is WP-native and lives outside the convention.
  - Special attention for form: variations may pre-set field configurations (contact form vs newsletter signup vs RSVP). Check existing form block attribute schema for innerBlocks contract before adding variation-level innerBlocks defaults.
  - Special attention for post-grid: variations are layout shapes (grid vs list vs masonry vs carousel). The block already has a `layout` attribute — variations should pre-fill `layout` AND `className` together.

  ### Verification before reporting done
  - `php -l plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php` exits 0 for all 4 files
  - grep your files for hex literals (`grep -E "#[0-9a-fA-F]{3,8}" plugins/sgs-blocks/includes/variations/sgs-*-variations.php`) — should return zero hits (tokens only)
  - Read your output files back and confirm each variation has `className` in its attributes defaults

  ### Commit gate
  Do NOT commit individually. Report back; main thread aggregates Wave A+B+C and commits once.

  ### Safety clauses (STRICT)
  - No `git stash`, no `git reset --hard`, no `git restore .`, no `git checkout --`, no `git clean -f`
  - No `--no-verify`, no `Co-Authored-By:`
  - Pre-existing uncommitted changes (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db) are NOT yours — DO NOT touch
  - Only NEW files in `plugins/sgs-blocks/includes/variations/sgs-*-variations.php` should be created. No other file edits.

  ### Reporting
  - File paths created
  - php -l result per file
  - hex-literal grep result
  - Any DEFER blocks (where you couldn't author cleanly) + reason

Test:
  Happy:       All 12 files pass `php -l`; hex-literal grep returns zero; loader includes all 12 on next page load.
  Edge:        A block (e.g. hero) has complex existing className logic → wave subagent flags DEFER; main thread handles in follow-up.
  Fail:        Wave fatals on WP boot → revert the wave's commits and investigate via `wp eval-file`.
  Integration: `wp eval 'WP_Block_Type_Registry::get_instance()->get_registered("sgs/hero"); var_dump(WP_Block_Styles_Registry::get_instance()->get_registered_styles_for_block("sgs/hero"));'` → confirms styles registered at runtime.
```

---

### QA Gate 1 — PHP syntax + load-order check (after Step 1.5.2)

```
Model:   haiku
Exec:    SEQUENTIAL
Deps:    Step 1.5.2 complete
Check:   `for f in plugins/sgs-blocks/includes/variations/sgs-*.php; do php -l "$f" || echo "FAIL: $f"; done; ssh hd 'cd ~/domains/palestine-lives.org/public_html && wp eval "echo \"WP loaded ok\";"'`
Pass:    All files report "No syntax errors detected"; remote wp eval prints "WP loaded ok" (no fatal from new sibling files)
Fail:    Identify failing file → revert it locally → re-dispatch its wave subagent with the failure trace
Marker:  QA
```

---

### Step 1.5.3 — Deploy + Playwright cross-check (~10 min)

```
Model:       sonnet (Playwright orchestration + per-block assertion loop)
Action:      Deploy the new sibling files to palestine-lives.org via the standard tar deploy command. Reset OPcache via HTTP (CRITICAL — variation files are PHP; web pool OPcache won't pick up changes otherwise). LiteSpeed purge NOT needed — LiteSpeed plugin removed from palestine-lives.org + sandybrown on 2026-05-05; the variation styles use `register_block_style()`'s `inline_style` argument which renders at runtime via WP, no separate CSS file to invalidate. Then launch Playwright, navigate to wp-admin/post-new.php?post_type=page, wait for editor load. For each of 12 blocks: (a) confirm `wp.blocks.getBlockVariations('sgs/<block>')` returns ≥ 2 entries; (b) for each variation, programmatically insert via wp.data.dispatch + assert the inserted block's wrapper element has the expected `is-style-<X>` class; (c) capture computed background/border on each style variant and assert visible delta between styles (catches "style registered but no CSS loaded" silent failure). Log results to reports/phase-1.5-playwright-verification.txt.
Files:       reports/phase-1.5-playwright-verification.txt (NEW)
Inputs:      12 new sibling files; live dev site palestine-lives.org
Outcome:     Verification log shows 12/12 blocks with ≥2 variations + className-default applied on insert. Any failure = blocker for commit.
Exec:        SEQUENTIAL
Deps:        QA Gate 1
Marker:      none
Time:        10 min
Tooling:     tar + scp + ssh deploy; OPcache HTTP reset; Playwright MCP (browser_navigate, browser_evaluate)
On-Fail:     If a block's getBlockVariations returns < 2 → check the sibling file's init hook timing + namespace. If className not applied on insert → consider the pre_render_block filter fallback (risk mitigation row 1).
Test:
  Happy:       All 12 blocks: 2+ variations found, each variation insert produces wrapper with is-style-X class.
  Edge:        Variation insert succeeds but inner blocks aren't pre-populated (innerBlocks declared in variation didn't materialise) → mark as "partial" + decide whether to ship.
  Fail:        wp.blocks.getBlockVariations returns empty for any of 12 blocks → init hook didn't fire OR loader didn't include the file → debug.
  Integration: Cross-check `wp.blocks.getBlockStyles('sgs/<block>')` returns the 2-3 registered styles per block.
```

---

### Step 1.5.4 — /qc-inline multi-model panel (~5 min)

```
Model:       inline (panel dispatch via Skill tool)
Action:      Invoke `/qc-inline --with-review` with target = "Phase 1.5 sibling files (12 PHP files in plugins/sgs-blocks/includes/variations/) + Playwright verification log". The `--with-review` flag forces Stage 6 (Code Review) which dispatches the full 4-model panel: Sonnet 4.6 + Haiku + Gemini Flash + Cerebras qwen-3-235b. This satisfies binding rule blub.db 255 (multi-model panel BEFORE every commit on SGS-block code). Each reviewer outputs a structured gap register; findings confirmed by 2+ reviewers get `confirmed: true`. Verdict = ship | fix | hold. Bean reviews verdict before commit.
Files:       (no new files — verdict in main conversation)
Inputs:      12 sibling files + reports/phase-1.5-playwright-verification.txt
Outcome:     /qc-inline verdict is "ship"; OR any "fix" findings are addressed inline before commit; OR verdict is "hold" and we don't commit (escalate to Bean).
Exec:        SEQUENTIAL
Deps:        Step 1.5.3
Marker:      QA
Time:        5 min
Tooling:     /qc-inline
On-Fail:     "Fix" verdict with specific findings → address inline, re-run /qc-inline once. "Hold" verdict → escalate, do not commit.
Test:
  Happy:       /qc-inline returns "ship" with confidence ≥ 90.
  Edge:        Confidence 70-89 with minor findings → address inline.
  Fail:        Confidence < 70 → do not commit; surface findings to Bean.
  Integration: standalone (this gate is the integration check).
```

---

### Step 1.5.5 — Commit (~3 min)

```
Model:       inline
Action:      Stage exactly the 12 new sibling files + reports/phase-1.5-playwright-verification.txt. Commit on main with message: "feat(phase-1.5): 12 composite block variations + styles + default-styles — closes operator inserter-UX gap [qc:phase-1.5-self-verify]". Push to origin.
Files:       12 × sibling PHP + 1 × Playwright log
Inputs:      Clean working tree containing only Phase 1.5 outputs
Outcome:     Commit SHA visible in `git log --oneline -1`; push succeeded.
Exec:        SEQUENTIAL
Deps:        Step 1.5.4
Marker:      HANDOFF
Time:        3 min
Tooling:     git add (by exact path), git commit, git push
On-Fail:     Push fails on main protection → check branch (should be main); if reject, surface upstream conflict.
Cold-Entry:  This plan + git status output
Test:
  Happy:       `git log --oneline -1` shows the phase-1.5 commit; `git status` clean.
  Edge:        Pre-existing uncommitted changes still present and untouched (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db).
  Fail:        Accidentally staged pre-existing changes → unstage with `git reset HEAD <file>` and re-commit with correct scope.
  Integration: standalone (commit IS the integration).
```

---

### Step 1.5.6 — Re-dispatch Phase 2 with runtime-aware parser (~25 min)

**Decision (logged here + in `.claude/decisions.md`):** The original Phase 2 used static PHP source parsing which fabricated rows (4 sgs/button entries with no source in code) and crashed on `getBlockStyles` Playwright API mismatch. Runtime enumeration via `wp eval` against the live WP block type + styles registry is the canonical Phase 2 path going forward — captures everything actually registered, immune to source-parsing fabrication.

```
Model:       sonnet (subagent — Phase 2 work but with parser fix)
Action:      Re-author phase2-seed-variations.py to enumerate registered variations + styles at RUNTIME via `wp eval`, not via PHP source parsing. The runtime enumeration (WP_Block_Type_Registry + WP_Block_Styles_Registry) captures everything Phase 1.5 just registered + any future additions. INSERT OR IGNORE into the variations table. Skip the Playwright cross-reference step (Phase 1.5 Step 1.5.3 already did it).
Files:       C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/phase2-seed-variations.py (REWRITE)
Inputs:      Live dev site WP runtime + 12 sibling files
Outcome:     `variations` table contains ≥ 24 rows for source='sgs' (12 blocks × 2 minimum) + any styles registered. sgs-db-assert.py extension passes (≥ 30 row total expected).
Exec:        SEQUENTIAL
Deps:        Step 1.5.5
Marker:      QA
Time:        25 min
Tooling:     Bash, wp eval, Python sqlite3
On-Fail:     If wp eval can't enumerate (PHP path issue), fall back to parsing the sibling PHP files directly with a real PHP-aware parser (not regex).
Cold-Entry:  This plan + .claude/plans/phase-2-variations-indexing.md (the original phase 2 spec) + the commit SHA from Step 1.5.5
Test:
  Happy:       `SELECT COUNT(*) FROM variations WHERE source='sgs'` returns ≥ 24; all 12 blocks represented.
  Edge:        Some blocks register more than 2 (e.g. hero with 4 variations) → row count higher than 24; that's expected.
  Fail:        Row count < 24 → at least one sibling file's registrations didn't load at runtime → debug.
  Integration: Run extended sgs-db-assert.py — Phase 1 13/13 still pass + new Phase 2 assertions pass.
```

---

## Key Judgement Calls

### Primary decisions

- **Decision 1.5.A — Style vocabulary standardisation**
  - **Options:** [A] Same 4 names across all 12 blocks (elevated/boxed/borderless/outlined) — pick 2-3 per block. [B] Block-specific style names per intent (e.g. hero gets "split"/"centered"/"fullwidth"). [C] Mix — visual finishes are universal; content shapes per-block.
  - **Recommendation:** [C] — visual-finish styles (elevated/boxed/borderless/outlined) standardised across blocks; content shapes live in variations not styles.
  - **Why:** Operator learns one finish vocabulary across all blocks. Content shapes are inherently block-specific so they belong in variations.
  - **Cost of wrong choice:** [A] forces awkward style names on blocks where they don't fit (a hero isn't really "boxed"). [B] explodes the vocabulary — operator can't transfer learning across blocks.
  - **Who decides:** architect (decided here in plan).

- **Decision 1.5.B — Inline CSS vs SCSS extension per block**
  - **Options:** [A] Each sibling file adds its own inline CSS via `wp_add_inline_style()`. [B] Each block's existing `style.scss` gains `.is-style-<X>` selectors. [C] New shared `block-styles.scss` for cross-block visual finishes.
  - **Recommendation:** [A] for this phase — self-contained, no build-step changes, ships in one commit.
  - **Why:** Adding to existing SCSS requires `npm run build` and risks breaking other styles. Inline keeps the phase scope tight. Refactor to SCSS later if maintenance burden grows.
  - **Cost of wrong choice:** [B] adds build complexity + can't ship as PHP-only. [C] requires refactoring all 12 blocks' CSS architecture in one go.
  - **Who decides:** architect (decided here).

### Pre-emptive decisions (Hidden Decisions pass — skipped for speed; surfaced from my own anticipation)

- **Decision:** Some blocks have InnerBlocks. Does a variation pre-declare innerBlocks or leave empty?
  - **Recommendation:** Pre-declare for blocks where the variation IS the content shape (e.g. hero "split" variation declares 1× image + 1× heading + 1× paragraph + 1× button). Leave empty for blocks where the variation is a finish (e.g. card-grid styles).
  - **Why:** Variations with innerBlocks defaults are the strongest UX win — operator gets a fully-populated block ready to edit. The Step 1.5.1 shapes table documents which variations get innerBlocks vs not.

- **Decision:** What if a block's render.php already applies `className` via complex logic that would conflict with `is-style-X`?
  - **Flagged by:** anticipation
  - **Recommendation:** Subagent reads `render.php` first; if `className` is composed via concatenation, the subagent surfaces DEFER for that block + tries WITHOUT className default (variation still ships, just without the auto-style). Main thread decides whether to refactor render.php in a follow-up.

- **Decision:** Should variation `scope` be `['inserter', 'block']` or just `['inserter']`?
  - **Recommendation:** `['inserter']` for content-shape variations (they're entry points, not transforms). `['block']` is for transform variations (this phase has none).

- **Decision:** What if Playwright can't reach the dev site (network / Hostinger downtime)?
  - **Recommendation:** Step 1.5.3 surfaces the skip with reason, logs to verification file, and the /qc-inline gate in Step 1.5.4 reviews the deferral. If verdict ships despite skip, proceed; if hold, defer commit to next session when dev site is reachable.

---

## Effort summary

| Step | Time (realistic) | Time (ceiling) |
|---|---|---|
| 1.5.0 Template | 5 min | 10 min |
| 1.5.1 Per-block research | 10 min | 15 min |
| 1.5.2 Author × 3 parallel waves | 25 min wall-clock | 40 min |
| QA Gate 1 | 2 min | 5 min |
| 1.5.3 Deploy + Playwright | 10 min | 20 min |
| 1.5.4 /qc-inline | 5 min | 10 min |
| 1.5.5 Commit | 3 min | 5 min |
| 1.5.6 Re-dispatch Phase 2 | 25 min | 45 min |
| **Total** | **~85 min** | **~150 min** |

Live-calibration: subagent waves in Phase 0.5 ran ~3 min vs my 25-40 min estimate. If Wave A finishes in <10 min, revise B + C estimates down accordingly.

---

## On-fail rollback (whole phase)

If the phase needs to be aborted post-deploy:
1. Revert the commit: `git revert HEAD --no-edit` then push
2. Re-deploy the reverted state to palestine-lives.org via the standard tar method
3. Reset OPcache via HTTP
4. Phase 2 (originally killed) remains in its un-started state — re-dispatch when Phase 1.5 is ready to retry
