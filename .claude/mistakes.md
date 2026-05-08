# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-05-08 (Rosetta Stone discipline + no-licensing rule + design-review-driven 11-fix synthesis)

## 2026-05-07 — uimax is the Rosetta Stone of design (Bean's reframe of the cross-platform translation principle)

**Captured as blub.db row 213, embedded across 4 surfaces** (project CLAUDE.md, sgs-wp-engine SKILL.md Hard Rule 7, ui-ux-pro-max SKILL.md Stage 5 INGEST HARD GATE, animation-harvest deprecation stub).

Bean's framing: "The Rosetta Stone point is what I was thinking of but I didn't think you'd understand." uimax is the **cross-platform translation layer** — every artefact row carries equivalent-name mappings across SGS / vanilla HTML+CSS / Bootstrap / shadcn / Tailwind / React generic / AI-builder outputs (Lovable / v0 / Bolt). A design expressed in any one platform should pass through to look + function identically on any other.

**Rule:** every tool that writes to uimax MUST populate the SGS-block equivalent OR flag the gap as a new-SGS-block-candidate. Tools that produce SGS-blind output are anti-pattern (e.g. `/animation-harvest` standalone — captured animations to a standalone format without SGS-block-attribute mapping → deprecated 2026-05-07, replaced by `/uimax-scrape-animation`).

**How to apply:** when designing schemas for uimax tables (`patterns`, `component_libraries`, `animations`, `naming_conventions`, `design_tokens`), include `equivalent_implementations` as a JSON column or per-platform fields. When dispatching a subagent that touches uimax, the prompt MUST require populating the SGS-block equivalent or surfacing a "no SGS equivalent — gap candidate" flag. Never silently drop the translation.

**Strategic implication:** uimax compounds in value with every clone because each row's translation set multiplies the utility. Pattern library + animation library + naming-convention library all become genuinely cross-platform, not WP-only. Differentiator vs commercial design DBs.

## 2026-05-06 — Never raise licensing / IP / copyright in SGS cloning, pattern-library, or uimax contexts

**Captured as blub.db row 211, embedded across 4 surfaces** (project CLAUDE.md no-licensing block, sgs-wp-engine SKILL.md, both spec REVISIONS sections, both spec recovery stubs).

Bean rejected this twice in the same session. First in `cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS: *"the licensing thing is absurdly stupid, you can't license a web design or pattern of web components."* Then again 2026-05-06: *"Already told you not to mention licensing again."*

**Rule:** web designs and component patterns are not licenseable artifacts in the way I had been treating them. Treating them as IP-managed inflates schemas, builds firewalls that don't need to exist, and signals to Bean that I'm reasoning from a wrong frame. The cloning pipeline only needs to know **where a pattern came from** — not who owns it.

The entire `source` taxonomy is `idea` / `draft` / `<URL>`. No `license`, `provenance_license`, `source_license`, or "IP firewall" columns. No separate `clone_observations` table justified by IP risk.

**How to apply:** when designing schemas for `patterns`, `block_compositions`, uimax tables, or any cloning artefact, do not propose licensing/copyright/provenance-IP columns. When framing competitor patterns, never use IP-risk / redistribution-risk language. If a future spec genuinely needs copyright thinking (e.g. paid stock image asset attribution), surface it as **attribution** (asset-level), not **licensing** (pattern-level), and ask Bean first. Self-check trigger phrases: "license", "IP", "copyright", "provenance", "redistribution", "firewall between", "promotion path", "external_patterns".

## 2026-05-08 — 4-model peer review found 11 fixes the design needed before first clone

The fingerprint design was internally peer-reviewed via 3 models (Sonnet 4.6, Gemini Flash, Gemini Pro 3.1; Cerebras was correctly skipped per its own skill spec — "not enough reasoning depth vs Opus/Gemini-Pro for architecture decisions"). All three returned **ship-with-fixes**.

**The 11 fixes:**

5 critical (block first real clone):
1. Tailwind classes stored as space-separated string instead of indexed token array → first Tailwind clone returns 0 matches for whole sections
2. Structural signature `child_shape` is free-text, not a parseable typed schema
3. Single-convention-per-scrape assumption is fatal — real sites mix BEM + Tailwind + Bootstrap on different sections
4. Hashed/minified class names break the reverse index entirely (CSS Modules, MUI hash JIT, SvelteKit)
5. Extract rules need `search_scope` field — `gap-{n}` often lives on a parent/child of the conceptually-correct element

4 important (catches major edge cases):
6. Eight roles insufficient — missing `layout-alignment`, `accessibility-attribute`, `data-binding`, `visibility-control`, `layout-modifier`
7. Four leftover buckets insufficient — need 5th: "structural mismatch / orphan"
8. Recursion guard required: `max_depth: 12` + `visited_nodes` Set
9. Confidence scoring undefined — class collisions need weighted disambiguation matrix

2 stretch (defer):
10. Spatial / computed-layout signal as corroborating evidence (Locofy/Stackbit pattern)
11. AST-tree-diff alternative architecture — defer indefinitely

**The lesson:** design-the-feature in isolation will under-build for the messy 80% of real-world inputs. A 4-model peer review of the design BEFORE building catches at least 11 fixes. Cost: ~30 min wall-time per reviewer, all parallel. Value: avoids a half-finished clone-skill rebuild after first real-clone failure.

**How to apply:** for any new substantial-skill design, run a peer-review panel (Sonnet practical + Gemini Flash gap-scan + Gemini Pro deep-reasoning + ecosystem) BEFORE the build session. Synthesise findings into a delta list. Ship the delta as part of the build, not after.

## 2026-05-08 — Rule-stage coverage audit: 28 genuine gaps remain even after Option A revised

Walked every cloning-relevant captured rule (97 total) across 9 pipeline stages + cross-cutting. Source-of-truth read across mistakes.md / common-wp-styling-errors.md / 12-DRAFT-TO-SGS-PIPELINE.md / sgs-wp-engine + visual-qa Hard Rules / blub.db high-priority / project CLAUDE.md / fingerprint design synthesis / parking.

| Status | Count |
|---|---|
| ✓ Covered today | 31 (32%) |
| △ Closed by Option A revised | 38 (39%) |
| ✗ Genuine gap after Option A | 28 (29%) |

**The lesson:** even a comprehensive design plus 11 review fixes leaves ~30% of captured rules uncovered. Without the audit, the build session would have under-built (missing the gaps) or over-built (duplicating already-enforced rules). The audit is the higher-value deliverable than parking review alone.

**How to apply:** before any substantial pipeline build, do the dissection pass — assign every captured rule to a stage with covered/partial/gap status. Top-12 ranked gaps become the next-session targets. Without this step, the pipeline ships with silent gaps that surface in the first real run.



## 2026-05-06 — background shorthand audit + ctaGap recogniser blind spot + pseudo-element/parent-chain measurement

**Problem:** Three related gaps closed in one session:
- H-8: Hero block.json had no `ctaGap*` attributes — recogniser couldn't extract `.hero-ctas { gap: X }` because there was no destination attribute. Gap rule was silently dropped.
- H-9: Multiple framework block CSS files used `background: linear-gradient(...)` shorthand without `:not(.has-background)` guard — the shorthand resets `background-color`, painting over user's palette colours invisibly.
- H-10: `mockup-parity-validator.js` wasn't measuring `::before`/`::after` pseudo-elements or walking parent chain for `filter`/`mixBlendMode`/`backdropFilter`/`opacity` — entire class of "computed says X, painted Y" bugs was invisible to the validator.

**Why my QC missed it:** The recogniser only extracts values to named attributes — no destination = silent drop. The CSS audit didn't cross-check shorthand vs longhand. The validator measured elements but not their rendering context.

**Rules captured:**
- Every child container with layout CSS (flex gap, justify-content) needs a named block attribute as destination.
- `background:` shorthand ALWAYS becomes `background-image:` in framework default rules. `:not(.has-background)` ALWAYS on default background rules that apply to the block wrapper.
- Validator WATCHED set must include pseudo-elements (`::before`/`::after`) and parent chain filters.

**How to apply:** Before declaring a recogniser extraction complete, verify every CSS rule with a numeric/positional value maps to a block.json attribute. Before declaring CSS QC done, run `scripts/css-pattern-audit.js`. Before declaring visual parity, check validator output includes `parent_chain_effect` warnings.

## 2026-05-05 — described the recogniser as a section-to-block mapper (it isn't — it's a section-to-pattern mapper)

While explaining the SGS clone pipeline in plain English, I framed the recogniser stage as "match each mockup section to one of our blocks" — implying 1:1 class-to-block mapping. Bean stopped to correct it: a class on the mockup is a section/container (header, footer, mega menu, gift section, hero, etc.) and maps to a PATTERN — a composite that may contain one or many blocks underneath.

This had been the wrong framing in earlier explanations and underpinned the 2026-05-04 `sgs/feature-grid` hallucination (recogniser tried to invent a mega-block instead of recognising a pattern that needed 1+ blocks underneath).

**The rule (captured as blub.db row 209 + embedded as Hard Rule 6 in `~/.claude/skills/sgs-wp-engine/SKILL.md`):**

> Mockup classes/sections map to PATTERNS, not single blocks. A pattern is a composite container — header, footer, mega menu, hero, or any registered group of blocks. The recogniser operates at pattern boundaries; single-block emission is the inner step. Composite blocks like `sgs/hero` and `sgs/cta-section` are pattern-shaped from the mockup's perspective even though registered as single blocks. If no existing pattern fits, the gap is a NEW PATTERN, not a missing block.

**Strategic bonus:** every clone produces pattern artefacts registered under `plugins/sgs-blocks/patterns/<client-slug>-<intent>` — the library compounds across clients as a strategic revenue asset. Confirmed S-grade dimension for sgs-wp-engine.

**How to apply:** at every recogniser stage, treat each top-level class/section as a PATTERN lookup. Match against existing patterns first; if no fit, the gap is a new pattern. Use the word "pattern" as the noun for recogniser output in all docs/prompts. Use "block" only for the inner population step.



## 2026-05-05 — `getComputedStyle().backgroundColor` lied about the rendered hero pink because a framework gradient was painting over it

Bean reported the hero pink looked "wrong" on the frontend. I measured `getComputedStyle(hero).backgroundColor === 'rgb(245, 194, 200)'` (which is `#F5C2C8`, the correct mockup value) and confidently told Bean the colours match.

I was wrong. The actual rendered pixel at the hero centre on the live page was `#C76C7C` — a darker, more saturated rose. An 18.5% colour-distance error that no `getComputedStyle()` query caught.

**Root cause:** `plugins/sgs-blocks/src/blocks/hero/style.css` had a framework default rule:

```css
.sgs-hero:not([style*="background-color"]):not([style*="background-image"]) {
    background: linear-gradient(135deg, var(--primary-dark), var(--primary));
}
```

Bean's hero set its background colour via WP's `.has-surface-pink-background-color` class (palette-driven), NOT via inline style. The `:not([style*="background-color"])` selector only excludes inline-style overrides, not class-based ones. So the gradient rule MATCHED + painted over the user-set colour. `backgroundColor` was queryable as `#F5C2C8` (the underlying value) while `backgroundImage` was the gradient that the user actually saw.

**Why my QC missed it:**
1. `mockup-parity-validator.js`'s WATCHED array didn't include `backgroundImage`. It only watched `backgroundColor`.
2. I dismissed Bean's "wrong colour" report based on `getComputedStyle().backgroundColor` matching mockup. I never checked `backgroundImage`.
3. I asked Bean to compare the colours visually instead of automating the comparison.

**Three rules captured:**

1. **QC pipeline must watch the full background property family**, not just `backgroundColor`. Added to `mockup-parity-validator.js` WATCHED array: `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, plus `filter`, `mixBlendMode`, `backdropFilter`. (See common-wp-styling-errors.md Section R.)
2. **Framework default rules using `background:` shorthand** silently overwrite user-set `background-color` when triggered by class-based exclusion gaps. Use `background-image:` specifically (not the shorthand) for any default-painting framework rule. Update `.sgs-block:not(...)` exclusions to also `:not(.has-background)`.
3. **Don't ask the human to do the comparison work the script can do.** When Bean asks "can't you just extract the colours and diff them?" the answer is yes; build the script. Did so: `scripts/colour-parity-audit.js` — extracts `:root` CSS variables from mockup, palette+custom from variation JSON, diffs them. Verdict: PASS for Mama's (10 colours matched, 0 deltas).

**The bigger meta-lesson:** when the human eye says "wrong" and the measurement says "right", the measurement is incomplete. Find the missing measurement before declaring the human wrong.

## 2026-05-05 — parity validator deltas dismissed as "structural noise" turned out to be 4 visible defects

## 2026-05-05 — parity validator deltas dismissed as "structural noise" turned out to be 4 visible defects

Mid-session 2026-05-04 the parity validator reported 55 deltas after the hero perfect-clone fixes landed. I (the classifier) categorised ~50 of them as "structural false positives — same visual output, different DOM organisation" and declared `verdict: PASS`. Bean looked at the live page and HTML brief side-by-side and saw obvious visible differences. A re-audit (visual-qa run with side-by-side screenshots) confirmed Bean was right: **at least 4 of the dismissed delta categories produced visible Major defects**:

1. **Buttons stacking vertically at desktop** instead of inline (the most visible defect — `.sgs-hero__ctas` flex container + block-level `.wp-block-sgs-button-wrapper` children = column behaviour).
2. **WP page-title block leaks above the hero** (~96px of Fraunces text where mockup has nothing) — the test page template includes a Post Title block.
3. **`section.sgs-hero` 36px padding + 520px min-height** producing dead pink bands above and below the image and content panel — hero rendered 49px taller than mockup with visible empty space.
4. **Negative-margin full-bleed pattern (`margin: 0 -24px`) over-shoots viewport** by 8-16px on each side — content area is 32px narrower than mockup at 375.

The validator's measurements (padding deltas, margin deltas, display deltas) were ALL accurate. My classification "but the visual output is the same" was wrong because I didn't actually look at side-by-side screenshots. I trusted the abstract pattern ("structural difference, same visual") without ground-truth verification.

**The methodology rule:**

A computed-style delta is NEVER "structural noise" without screenshot evidence to back the claim. Specifically:

1. Padding/margin/min-height deltas of >5px ARE visible. Don't dismiss them by category.
2. `display: flex` vs `block` deltas ARE visible when they change child arrangement (column vs row, inline vs stacked). Don't dismiss "same intent" without checking the actual rendered position.
3. Negative-margin full-bleed deltas ARE visible on the right/left edges when viewport math doesn't match. Don't assume "100vw is 100vw" — verify the rendered rect.
4. Background-color deltas ARE NOT noise unless you've confirmed the parent is the same colour AND the child fully covers the parent. Otherwise the underlying colour might bleed at edges.

**The process rule:**

Classifier passes that turn validator FAILs into PASS verdicts MUST include a side-by-side screenshot grid as evidence. No screenshot, no dismissal. Bake into the visual-qa skill: "if classifier reduces severity below the validator's reported severity, the classifier MUST attach a screenshot at the affected viewport showing the visual output is identical."

**The tooling rule:**

The mockup parity validator's filters added in the previous session (visibility-aware selector, fontFamily fallback equivalence, CSS keyword equivalents) are correct AS FILTERS — they catch cases that are genuinely equivalent. But the post-filter delta count is the floor, not the ceiling. **Do not subtract further deltas without screenshot evidence.** The "55 → 4 visible defects" gap in this incident was 100% on the human classifier, 0% on the validator.

**Captured as Section Q in `.claude/specs/common-wp-styling-errors.md`** with the 4 specific defect types + how to detect each.

## 2026-05-04 — wp_global_styles post is the actual cache layer; editing variation files alone never propagates

## 2026-05-04 — wp_global_styles post is the actual cache layer; editing variation files alone never propagates

Editing `theme/sgs-theme/styles/<variation>.json` and deploying it to a server does NOT make the changes visible on the live site. WordPress merges base `theme.json` + the active variation file at first load and stores the merged result in a `wp_global_styles` post (post type `wp_global_styles`, one post per active theme). Future page renders read the cached merge from this post — NOT from the variation file. Cache flushes (`wp cache flush`, `wp transient delete --all`, LiteSpeed purge) do NOT reach this post because it's regular post content, not a transient or object cache entry.

**Symptom**: variation file on disk has `text: "var(--wp--preset--color--text)"` but the live page shows `--wp--custom--button-presets--primary--text: #ffffff` (the BASE theme.json value). 30+ minutes of trying transient flushes / theme switches / OPcache resets / LiteSpeed purges produces zero change. The deployed file is correct; the rendered CSS is wrong.

**The procedure that actually works** (verified 2026-05-04 on sandybrown):

1. SCP the theme + plugin tar to the server, extract to `wp-content/`
2. Reset the `wp_global_styles` post via REST API: `POST /wp-json/wp/v2/global-styles/{id}` with body `{settings:{},styles:{}}` — this clears the cached merge
3. Re-apply the active variation: `GET /wp-json/wp/v2/global-styles/themes/<theme-slug>/variations` → find the active variation by title → POST its full `settings` + `styles` back into the global-styles post
4. `wp cache flush` + `wp transient delete --all` + `rm -rf wp-content/litespeed/css/*.css wp-content/litespeed/cache/*`
5. OPcache reset via HTTP fetch of a temp `op-reset-tmp.php`

Steps 2 + 3 require Playwright (the `wp-content-guard.py` hook blocks `wp post update` and `wp eval` — correctly so, this is the right way). Use the WP admin login + `window.wpApiSettings.nonce` + `fetch` with `X-WP-Nonce`.

**Why this is structural, not edge-case**: this is how WordPress's Global Styles system works by design. User customizations in the Site Editor write to this post. Variation file edits made server-side bypass the Site Editor and so don't refresh the post. Any deployment of variation-level changes (colours, typography, custom properties) hits this exact path.

**How to apply going forward**:
- ALL deploy procedures that touch theme.json or any `styles/<variation>.json` MUST run the reset+reapply procedure as the final step. Add to `/deploy` skill, `deploy-check`, and any deploy automation.
- Never "deploy + test" a variation change — always "deploy + reset+reapply + flush + test".
- Captured as Section O in `.claude/specs/common-wp-styling-errors.md` with full reproducible procedure.

## 2026-05-04 — Fraunces font failed to load silently; computed font-family says correct value, browser uses fallback

The Mama's variation declared Fraunces as the heading font with src pointing at `https://fonts.gstatic.com/s/fraunces/...woff2`. The CDN load **failed silently** (HTTP error or CSP block — `document.fonts` showed `status: "error"`). The browser fell back to DM Serif Display (next in the font stack). `getComputedStyle()` still reported `font-family: "Fraunces, ..."` because that's the declared value — but the actually-rendered font was DIFFERENT.

This is the SAME defect class as M1 (computed style says X, rendered output is Y). No `getComputedStyle` check would catch it because the cascade resolved correctly — the resource load is what failed.

**The detection rule**:
- Use `document.fonts` to enumerate loaded fonts and check `status === 'loaded'` (not `'error'` / `'loading'` / `'unloaded'`) for every font declared in `theme.json` `settings.typography.fontFamilies`.
- Add this check to `tools/multi-frame-qa/capture.js` AND the new `scripts/mockup-parity-validator.js` so it can never ship silently again.

**The architectural rule**:
- Per the SGS framework: NO external CDN for fonts. Self-host all fonts in `theme/sgs-theme/assets/fonts/<family>/`. The Mama's variation pointing at `gstatic.com` violated this; the violation produced a real visual defect.
- Variation `settings.typography.fontFamilies[].fontFace[].src` MUST resolve to a local file path (e.g. `file:./assets/fonts/fraunces/Fraunces[opsz,wght].woff2`).
- Add a static-analysis check (`scripts/font-source-audit.js` or extend `css-pattern-audit.js`) that flags `https://` in any `theme.json` font src.

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
