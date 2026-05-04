# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-05-04 (later)

## 2026-05-04 — single-frame post-load screenshots miss first-paint defects (the invisible hero image bug)

The hero PoC shipped with a CSS entrance animation (`animation: sgs-hero-enter ... both; animation-delay: 360ms`) that made the hero image **invisible during the first 0-960ms of every page load**. Two QC passes (measured + Gemini Pro Vision) both gave clean reports because both sampled screenshots after the animation completed. Bean caught the bug live in his own browser.

**Why both QCs missed it:** they treated `getComputedStyle().opacity = 1` and a single post-load screenshot as redundant confirmation. They're not redundant — they answer different questions, and they can disagree. The disagreement IS the bug signature for paint-state defects.

**The methodology rule:**

1. Take screenshots at MULTIPLE times after navigation (0ms, 200ms, 500ms, 1000ms, 3000ms), not one. Diff frames against each other to find any element whose visibility shifts.
2. Run DOM measurement at the SAME EARLY moment (≤300ms after nav). If `getComputedStyle()` says visible AND screenshot says invisible → paint-state defect → flag.
3. NEVER trust "all measurements pass + screenshot passes" if both were sampled late. Late samples both confirm the end-state, neither tests first-paint.

**The architectural rule:**

CSS entrance animations are a per-instance choice. Hardcoding `animation: ... both; animation-delay: 360ms` on a structural element (like `.sgs-hero__split-image`) makes invisibility the default first-paint state for every visitor on every page load. This violates the no-hardcoding rule. Animations belong as opt-in block attributes (`enableEntranceAnimation: boolean default false`), not as global CSS rules in `style.css`.

**The process rule:**

The `sgs-wp-engine` Phase 3 STOP GATE (design-reviewer + zero criticals before deploy) is non-negotiable. Bypassing it because "the structure looks complete" produces this exact class of bug. Make it a git hook that refuses commits without a passing visual-diff report.

**Fix:**
1. Remove the broken animation OR rebuild as opt-in attribute (planned next session)
2. Add multi-frame capture script (`tools/multi-frame-qa/capture.js`)
3. Add static-analysis grep to L8 visual-qa for `animation-fill-mode: both` + `animation-delay > 0ms`
4. Add commit hook enforcing the STOP GATE

Captured as M1, M2, M3, M4 in `.claude/specs/common-wp-styling-errors.md` and N1-N5 (visual-qa blind spots).

## 2026-05-04 — dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`, never null

Three SGS blocks (`sgs/product-card`, `sgs/cta-section`, `sgs/info-box`) had `save: () => null` while declaring `<InnerBlocks>` slots in their edit components. The editor showed the migrated InnerBlocks structure correctly in memory after a deprecated.js migrate() ran, but **a save round-trip emitted only the parent block** with no inner blocks in `post_content`. Hero already had the correct pattern (returns `<InnerBlocks.Content />`), which is why hero's CTAs persisted to DB but product-card / cta-section / info-box did not — until the next editor reload silently re-ran migrate() in memory only, masking the bug across sessions.

**Why null-save drops InnerBlocks:** `save: () => null` tells WordPress "this block produces no markup". The serializer reads that literally and drops the InnerBlocks tree entirely. Render.php drives the frontend output, but the serializer to `post_content` still needs the marker that says "include the InnerBlocks here." Without it, only the parent block comment + attributes survive a save.

**The fix:** for any dynamic block with an InnerBlocks slot, `save()` MUST return `<InnerBlocks.Content />`. Render.php still owns 100% of frontend output; save's only job here is to emit the InnerBlocks marker that round-trips through `post_content`.

```js
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
    return <InnerBlocks.Content />;
}
```

**How to apply:** any new SGS dynamic block declaring an InnerBlocks slot in `edit.js` must have a matching `<InnerBlocks.Content />` save. Add a sniff to the SGS uniformity audit that flags `save: () => null` whenever the matching edit.js has `<InnerBlocks>` or `useInnerBlocksProps`. Documented as B4 in `.claude/specs/common-wp-styling-errors.md` and as a Gotcha in `plugins/sgs-blocks/CLAUDE.md`.

## 2026-05-03 — extension-via-binding is the wrong shape for shared block features (composition wins)

I proposed a "Match Style" dropdown extension that would attach to every CTA-rendering block (sgs/hero, sgs/cta-section, sgs/product-card, etc.) and bind their internal CTAs to global Primary/Secondary presets. Bean called this "dumb" and was right.

**Why it was wrong:** the extension shape forced every parent block to render CTAs internally, then needed JS+PHP to inject the binding control into each, then needed the parent block's render to consume the bound preset. Maintenance: every time preset behaviour changes, every parent block needs touching.

**The right shape:** composition. The CTA on a hero is literally an `sgs/button` block placed inside (via InnerBlocks). The preset binding lives once — on `sgs/button` itself. Every instance everywhere inherits it free. Mirrors how core/buttons + core/button compose. Bean named the second piece `sgs/multi-button` (the container).

**Why this matters generally:** when "feature X needs to be available on N different blocks", the temptation is to write a block extension that injects controls into all of them. But if X is itself a block-shaped concept (button, image, link, icon), the right move is to make X its own block and have other blocks accept it via InnerBlocks. Extensions are right for cross-cutting concerns (animation, visibility) where the feature has no natural block representation.

**How to apply:** before reaching for a block extension, ask "is this feature a block?" If yes, build the block, use InnerBlocks composition. Extensions only when the feature is NOT a block.

## 2026-05-03 — fingerprints must be auto-derived from block.json, never hand-written

The recogniser shipped with hand-written fingerprints. sgs/hero declares 48 attributes in block.json but the fingerprint only extracted 6 (12% coverage). The missing 42 included `splitImage` (the right-side hero image) and every responsive variant — the silent bug Bean spotted earlier where the live hero rendered with no image.

**Why hand-written is wrong:** the schema is already the source of truth. Hand-writing a subset is duplicate work that drifts immediately. New attributes added to block.json don't flow through unless someone remembers.

**The fix:** every fingerprint must be auto-generated from the block's block.json. For each declared attribute, an extractor entry exists by default — even if the extractor body is `TODO`, the slot is present so the extractor cannot silently skip it. Coverage is enforced by code, not by remembering.

**How to apply:** any new SGS block automatically gets a recogniser fingerprint scaffold from its block.json. Heuristics fill in the deterministic extractors (text, link, image, colour-from-CSS-rule, etc.). Anything not deterministic flags as TODO and surfaces in the extractor's coverage report.

## 2026-05-03 — pull all CSS every time during extraction, classify after

I started selective in the v2 extractor — only pulling CSS rules whose attributes I knew how to map. Bean's directive: pull all CSS every time, then categorise into block-attribute / universal / custom. Selective pulling means quietly losing design intent.

**Why this matters:** the universe of CSS in a mockup is bounded; the universe of "design intent we'll think to look for" is open. Pulling everything and classifying after is the only way to guarantee no silent gaps.

**How to apply:** v2 extractor harvests every CSS rule whose selector matches an element in the section (BS4 native selector engine). For each rule's declarations, classify: maps-to-block-attribute (go to block) / universal-already-handled (ignore) / one-time-custom-CSS (emit as scoped style). 0% silent loss.

## 2026-05-01 — auto-clone is structurally sound but visually insufficient

The recogniser pipeline produced valid block markup for the Mama's Munches homepage and the page rendered without errors. Activating the `mamas-munches` style variation lifted fidelity from ~12/100 to ~65/100. Bean's verdict: still not close enough to be an "exact likeness" of the draft.

**Lesson:** programmatic translation captures structure + tokens but misses the design choices that live in the gap between block defaults and mockup-specific styling — section banding, card containers, decorative frames, exact spacing rhythm, custom hover states. For client-facing visual clones the auto-pipeline gets to ~65/100; the last 35 points need a deliberate top-to-bottom rebuild section by section.

**How to apply:** for site clones, run the recogniser to get the structural skeleton + token mapping, then walk the design top-to-bottom matching the mockup section by section. Do not declare done from a one-shot auto-output.

Lessons that have fired repeatedly enough to be worth surfacing here. Living source: CC auto-memory at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_*.md` — this file is a curated index. Click through for full detail per lesson.

## Recurring patterns

| Lesson | One-line summary | Detail |
|--------|-----------------|--------|
| `always-screenshot-verify` | MUST take a frontend screenshot and visually inspect it before saying any fix is complete — no excep | [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md) |
| `block-name-search-blindspot` | When a block name contains a parenthetical qualifier (e.g. "Icon Block (single icon)"), Claude's grep instinct breaks. Even when the name is the literal heading, Claude can fail to locate the file. Fix: search the heading verbatim including parens, then search core noun without qualifier as fallback. Capture as a TODO for the eventual ledger-tag system | _captured 2026-04-29 mid-Phase-1c session_ |
| `verify-rendered-output-not-internal-metrics` | Internal metrics (function return value, DB row count, JSON shape, "tests passed", file-content read-back) never prove user-visible visual outcomes. Visual claims require live-DOM assertion: `getComputedStyle`, `getBoundingClientRect`, `element.style.cssText`, or screenshot AT a specific selector. /qc scoring 95/100 while user-visible bugs are everywhere is the failure signature | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) (blub.db row 194) |
| `block-validation-recovery` | When block attribute changes don't render on the frontend, check for block validation errors in the  | [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md) |
| `defaults-need-deliberate-judgement` | When setting defaults across a class of components (blocks, templates, fields, palette assignments), | [feedback_defaults_need_deliberate_judgement.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_defaults_need_deliberate_judgement.md) |
| `design-session-2026-03-28` | Extensive design review and fixes session — user's specific dislikes, what was fixed, and what still | [feedback_design_session_2026_03_28.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_design_session_2026_03_28.md) |
| `ingest-dont-generate-reference-data` | For any reference-DB skill, populate via deterministic ingest-*.py from authoritative open-source re | [feedback_ingest_dont_generate_reference_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ingest_dont_generate_reference_data.md) |
| `litespeed-gotchas` | LiteSpeed UCSS strips CSS rules it considers unused, and its JS combiner serves stale cached files e | [feedback_litespeed_gotchas.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_litespeed_gotchas.md) |
| `no-hardcoding-mobile-nav` | Never build hardcoded HTML components in template parts. Always flag existing hardcoding when encoun | [feedback_no_hardcoding_mobile_nav.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_hardcoding_mobile_nav.md) |
| `palette-defaults-for-blocks` | When setting any default colour value on an SGS block, use a palette token (var(--wp--preset--color- | [feedback_palette_defaults_for_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_palette_defaults_for_blocks.md) |
| `parallel-dispatch-shared-files` | When dispatching parallel agents that may touch the same file (extension files, theme.json, shared C | [feedback_parallel_dispatch_shared_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_parallel_dispatch_shared_files.md) |
| `playground-not-useful` | WordPress Playground is unsuitable for SGS dev/design work because it cannot serve production media  | [feedback_playground_not_useful.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_playground_not_useful.md) |
| `prefer-diagnostics-over-cli-linters` | After any code edit, read the VS Code Problems panel via mcp__ide__getDiagnostics instead of running | [feedback_prefer_diagnostics_over_cli_linters.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_prefer_diagnostics_over_cli_linters.md) |
| `sgs-monorepo-separation` | Framework code lives in plugins/ + theme/sgs-theme/; client code lives in sites/<client-slug>/. Run  | [feedback_sgs_monorepo_separation.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_monorepo_separation.md) |
| `sgs-workflow` | Always invoke /sgs-wp-expert before SGS WordPress work and /sgs-update after all changes | [feedback_sgs_workflow.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_workflow.md) |
| `ship-skill-and-slash-command` | When a skill wraps a single canonical CLI invocation, ship BOTH the skill AND a slash command in ~/. | [feedback_ship_skill_and_slash_command.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ship_skill_and_slash_command.md) |
| `stage-files-via-tmp-not-bash-heredoc` | When writing Python scripts, markdown, regex content to a file via Bash, use the file-staged pattern | [feedback_stage_files_via_tmp_not_bash_heredoc.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_stage_files_via_tmp_not_bash_heredoc.md) |
| `use-devtools-first` | When a CSS property isn't applying correctly, use Chrome DevTools or Playwright to check the Compute | [feedback_use_devtools_first.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_use_devtools_first.md) |
| `verify-rendered-output-not-internal-metrics` | Before claiming any visual / CSS / layout / default-rendering work is done, capture a Playwright assertion on the live rendered DOM showing the user-visible value. Internal metrics (commits, builds, validations, contrast values, OPcache reset) prove inputs, never user-visible outcomes. blub.db row 194. | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) |

## Reference catalogues

- **Common WordPress styling errors** — 21 specific failure patterns from the 2026-04-29 polish session, each with cause + proven fix: [`specs/common-wp-styling-errors.md`](specs/common-wp-styling-errors.md)

## How to add a lesson

When a lesson fires that you want to remember:
1. Add a `feedback_<slug>.md` file to the auto-memory dir
2. Add a row to this table
3. The CC auto-memory system reloads it automatically next session
