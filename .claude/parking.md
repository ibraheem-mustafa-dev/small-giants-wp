---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-04
---

## P-6 — Image controls block extension

**Status:** Designed in 2026-05-03 session, deferred until after the button architecture build.

**Trigger to resume:** After the button architecture session ships, before the gift-section / featured-product visual clone.

**What:** New extension at `plugins/sgs-blocks/src/extensions/image-controls/` adding to any block declaring `supports.sgs.imageControls: true`:
- `objectPosition` (e.g. `center 20%` like mockup hero-mobile-img)
- `maxWidth` per-instance override
- `height` per-breakpoint (mobile / tablet / desktop)

Apply to `core/image` (via filter), `sgs/hero` (splitImage), `sgs/gallery`, `sgs/decorative-image`, `sgs/card-grid`, `sgs/product-card`, etc. Add a CLAUDE.md rule: "every new SGS block that renders an `<img>` MUST declare `supports.sgs.imageControls: true`".

**Effort:** ~2–3h.

## ~~P-7 — sgs/icon vs sgs/icon-block duplicate cleanup~~ — COMPLETED 2026-05-04

**Resolution:** `sgs/icon` chosen as canonical (had hover scale, hover colour, alignment support). `sgs/icon-block` hidden from inserter via `supports.inserter: false`, `deprecated.js` added so existing posts continue to render. `hover-effects.js` extension's `SCALE_SHADOW_DEFAULT_BLOCKS` opt-in set updated to reference `sgs/icon` instead of `sgs/icon-block`. Animation behaviour previously unique to icon-block was redundant — already provided by the universal hover-effects extension. Decision was **opposite to original recommendation** because the per-block animation attrs on icon-block were duplicating cross-cutting extension behaviour.

## P-8 — Reduced-motion rules in dark-mode.css / header-modes.css / reading-progress.css

**Status:** 3 files outside the scope of the 2026-05-03 cleanup still carry their own scoped reduced-motion rules. With the new universal rule in core-blocks-critical.css, they may now be redundant.

**Trigger to resume:** Next CSS audit / refactor session.

**What:** Verify whether the new universal `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important }` covers the cases each scoped block was handling. If yes, remove. If they're handling additional non-animation properties (e.g. transform, scroll-behavior), keep but verify they don't conflict.

**Effort:** ~30min audit + 10min cleanup.

## P-9 — Recogniser-v2 generalisation beyond hero

**Status:** UNBLOCKED 2026-05-04. Button architecture (spec 11) shipped; composition emitter now has `sgs/multi-button` + `sgs/button` to target. Ingredients pattern (spec 12 §7 mockup target #5) shipped as the first new pattern. Block coverage gap audit completed — 53 blocks classified by extractability tier, top 10 ready for auto-extraction, 23 medium-confidence, 2 hard blocks (form-field-file 31%, post-grid 56% borderline).

**Trigger to resume:** After the manual hero perfect-clone PoC validates the approach end-to-end (one mockup section through extraction → emission → visual diff). Then generalise.

**What:** Extend the per-block extractor pattern to other SGS blocks. Auto-generate the per-block scaffold from block.json so adding a new extractor is one PR. Wire up the LLM fallback path for unknown patterns. Build the "block coverage gate" reporter. Phase V2.1-V2.5 from spec 12.

**Effort:** ~12-15h spread across 2-3 sessions.

# Parking — deferred work with named triggers

Items parked here have a clear next-step but aren't urgent. Each entry has: the work, the trigger to resume, the spec, and rough effort.

## P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** Subagent attempt blocked by Trustpilot anti-bot. Inline Playwright not yet tried.

**Trigger to resume:** Mid-design-clone session, when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for the live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

## ~~P-5 — `sgs/feature-grid` block~~ — COMPLETED 2026-05-04

**Resolution:** Built as a new SGS block in this session (Option A from the original parking entry). Container restricted to `sgs/info-box` children. Two layout modes: `auto-flex` (CSS Grid auto-fill — Bean's preferred default) and `fixed-columns` (explicit per-breakpoint count). Ingredients pattern uses fixed-columns mode (4 desktop / 2 tablet / 1 mobile). Original spec content kept below for reference.

---

## P-5 (original) — `sgs/feature-grid` block does not exist (recogniser hallucination)

**Status:** Recogniser prompt routes the gift section to `sgs/feature-grid` (see `tools/recogniser/prompts/recogniser-prompt.md`), and the LLM duly generated `<!-- wp:sgs/feature-grid ... /-->` markup. The block does NOT exist in `plugins/sgs-blocks/src/blocks/` — it was never built. On the live page the gift section renders as `core/missing`.

**Two options:**

A. **Build the block.** 2-3 column card grid with image/icon + heading + price + CTA per card, plus an `eyebrow` + `headline` + `subHeadline` for the section header, plus an inner `notice-banner` slot (the "Heading to hospital? Send to Ward" callout). ~45 min.

B. **Re-route the recogniser to `sgs/card-grid`** (which DOES exist per CLAUDE.md). Edit the prompt + re-run on Mama's mockup gift section. ~20 min.

**Trigger to resume:** When the gift section is reached in the top-down clone.

**Recommended:** Option A — `sgs/feature-grid` is a useful block in its own right, the recogniser already names it correctly across multiple prompts, and the structural intent (cards + price + CTA) is more product-like than the existing `sgs/card-grid`. Build it once, reuse for all clients.

## ~~P-1 — `/gap-analysis` SKILL.md edits~~ — COMPLETED 2026-04-30

**Status:** All 4 A-grade edits landed in the same 2026-04-30 session as the rubric confirm. Skillscore held at 92% across all 4 writes. Re-grade against the confirmed rubric pending — expected to lift from C (3.03) → A range once verified next session.

**Edits applied:**
1. ✅ Hard Rule 1 replaced with subagent batch protocol
2. ✅ Step 7.75 mandatory QC peer-review stage added (between Step 7 JSON output and Step 8 human summary)
3. ✅ C-grade calibration rule added to Step 4 (HARD GATE: C+ only when fix has real impact, not for cosmetic / structural-only gaps)
4. ✅ Plain-English mandate added to Step 5 Opportunity Detection

**Original spec retained below for audit / re-grade reference:**

**Trigger to resume:** Start of next session. These block several Phase 2 protocol behaviours and were graded as A-grade gaps in the 2026-04-30 recursive run (gap-analysis grading itself: C 3.03/5).

**Source rubric:** `~/.claude/skills/gap-analysis/references/end-goal-rubric.md` (bean_signoff: confirmed 2026-04-30)
**Source report:** `~/.claude/gap-analysis/reports/2026-04-30-gap-analysis-skill.md`

### Edit 1 — Replace Hard Rule 1 with subagent batch protocol (~10 min)

**Current text** (under `## Hard Rules`):
> 1. **NEVER run inside a subagent.** Gap-analysis must run in the main conversation where Bean can see every score and finding. If you suspect you are inside a subagent... output the FULL report... as your return message. Never summarise or abbreviate.

**Replacement text:**
> 1. **Subagent dispatch is allowed under the batch protocol.** Subagents may run gap-analysis IF: (a) every subagent's output passes through a QC peer-review stage before Bean sees it; (b) full findings reach Bean as a batch BEFORE any fix work begins; (c) Bean's batch decisions return for batch execution. Inline runs ALSO require the QC stage (see Step 7.75). Single-target inline runs without QC, or subagent runs without batch QC + batch findings flow, are forbidden — they degrade the lifecycle quality gate to ceremony.

### Edit 2 — Add Step 7.75 mandatory QC stage (~15 min)

**Insert between Step 7 (output JSON) and Step 8 (human summary):**

> ### Step 7.75 — QC peer-review (HARD GATE)
>
> Before the human summary reaches Bean, the canonical outputs (JSON object + report files) pass through a Stage QC peer-review panel via `/dispatching-parallel-agents`:
>
> - 1 × Gemini Flash — fast triangulation, breadth on framing-rule violations and rubric integrity
> - 2 × Sonnet personas — practitioner perspective + skill-evaluation-framework perspective
>
> Reviewers receive: the canonical JSON, the rubric used, the target SKILL.md or artefact source. Their job: critique scoring, flag missing or weak gaps, identify opportunities the run missed, surface anchor framing-rule violations.
>
> Findings deduplicate inline and surface to Bean BEFORE the human summary appears. Bean's accept / amend / reject decision is captured in the JSON `qc_review` field.
>
> This stage runs for both inline single-target runs AND subagent batch runs. For subagent batches, a single QC pass per batch is acceptable provided every subagent output is in scope.

### Edit 3 — Add C-grade calibration discipline to Step 4 (~5 min)

**Insert under "Anti-inflation anchors" in Step 4:**

> **C-grade calibration rule.** A grade of C or above is earned only when fixing the gap has real impact on the end-result or real benefit to the target's stated purpose. NOT for missing-section / missing-tag / formatting compliance unless that compliance gap actually changes outcomes. Reason: Bean's default behaviour is to implement all C+ gaps unless (a) the fix is a huge time commitment OR (b) it risks harming a more important component. Every C+ grade therefore commits Bean's time. Disciplined calibration (impact-driven, not score-driven) keeps that default-implement behaviour valuable.

### Edit 4 — Add plain-English anchor to Step 5 (~5 min)

**Insert at the start of Step 5 (Opportunity Detection):**

> **Plain-English mandate.** Opportunities and their upgrade paths are described in plain human language; assume no technical knowledge of the audience. Frame each opportunity in business value, user experience, or time saved — not in technical mechanism. Example: "this could become a one-click client-onboarding flow" not "DSPy MIPROv2 signature optimisation". Bean is a non-coder; jargon is a tax on his attention.

### Edit 5 — B-grade additions (parked separately if Edit 1-4 ship first)

The 5 B-grade gaps from the report:
- Bulk-fix-default offer requirement (Step 4 + Step 8)
- Per-criterion reasoning preservation (Step 7 JSON schema)
- Floor-application "did floors fire?" check (Step 4)
- Folder-mode aggregate verdict promoted to main flow
- Common Mistakes table additions (3 missing anti-patterns)

Roughly 30 min combined. Can land in the same edit pass as Edits 1-4 if session has bandwidth.

**Total estimated effort:** ~60 min focused session (Edits 1-4 = 35 min; Edits 5 add 30 min if combined).

**Resume action for next session:**
```
1. Read .claude/parking.md (this file)
2. Open ~/.claude/skills/gap-analysis/SKILL.md
3. Apply Edits 1-4 sequentially
4. Run skillscore after each edit (≥90% threshold)
5. Re-run /gap-analysis on /gap-analysis skill against the existing rubric
6. Expect grade jump from C (3.03) → A (4.0+) once edits land
7. Optional: Edits 5 if session has time
8. Retry pending blub.db POST at ~/.claude/pending-uploads/2026-04-30-gap-analysis-eval.json
```

## P-2 — Phase 2.5 / G2.5 deferred work

See `.claude/plans/phase-2-rubrics-universe.md` G2.5 section. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

## Embed `diagnose-blub-db-locks-not-park-on-timeout` rule into /autopilot + /handoff

**Captured:** 2026-04-30 (blub.db row id 198, lesson file `2026-04-30-diagnose-blub-db-locks-not-park-on-timeout.md`)

**Work:** Run `/lifecycle` against `/autopilot` and `/handoff` to embed the rule structurally so future sessions diagnose SQLite lock contention before parking localhost-API uploads.

**Specifics:**
- `/autopilot` — embed in `references/correction-capture.md` "dashboard-unreachable → mark pending_upload" branch. Add a one-line "diagnose DB layer first (port LISTENING + .db-wal sidecars + competing processes), retry once with ≥15s urllib timeout" before the park fallback.
- `/handoff` — Stage 1 write reference rule. Light touch — just ensure handoff persistence steps don't silently fail on first transient timeout.

**Trigger to resume:** next time `/lifecycle` is open for unrelated work, OR if the rule reviolates and a recurrence row appears on blub.db pattern_key `diagnose-blub-db-locks-not-park-on-timeout`.

**Effort:** ~15 min combined (two surgical Stage edits + skillscore re-check at 90% threshold).

**Spec:** workspace lesson at `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-04-30-diagnose-blub-db-locks-not-park-on-timeout.md` is the source of truth.

## ~~H-1 — Hero block inspector: reorganise by element~~ — RESOLVED 2026-05-05

Wave 3A: 21 panels → 10 element-grouped (Container / Eyebrow / Headline / Subheadline / Image / Background Video / SVG Background / Buttons / Badges / variant). All attributes preserved. Build clean. Pattern documented for cascade across remaining 23 blocks (deferred — UX polish, not the cloning-skill priority).

## H-1 — Hero block inspector: reorganise by element, not by CSS-rule (ORIGINAL)

**Captured:** 2026-05-05 (Bean: "I absolutely hate the way you've sorted the block settings for the hero block")

**Problem:** The hero block's `edit.js` inspector currently has panels organised by CSS-rule type (e.g. "Margin Bottom", "Font Size") with sibling controls for headline+subheadline lumped together inside each panel. This forces the operator to scroll across multiple panels to configure a single element.

**Bean's preferred organisation:**

| Panel | Controls |
|---|---|
| Container / Entire Block | min-height, padding (all sides + breakpoints), background colour, max-width, full-bleed toggle, layout variant, alignment |
| Eyebrow Label | text, colour, font-size (all 3 viewports), font-weight, letter-spacing, line-height, margin-bottom, transform |
| Headline (h1) | text, colour, font-size (3vp), font-weight, line-height, letter-spacing, margin-bottom (desktop + mobile) |
| Subheadline | text, colour, font-size (3vp), font-weight, line-height, max-width, margin-bottom (desktop + mobile) |
| Image (split + bg) | source, alt, mobile-source override, object-fit, object-position, padding, border, border-radius, height (3vp), full-bleed bleed, ken-burns, parallax |
| Badges (if used) | repeater of badge content + style |
| Buttons (group) | layout direction, gap, alignment — but individual button styling (colour, hover, shape) stays inside each `sgs/button` InnerBlock |

**Scope:** affects `plugins/sgs-blocks/src/blocks/hero/edit.js` (only). block.json attributes stay where they are — only the inspector ordering changes. No deprecation needed (no save.js change).

**Bigger pattern:** this reorganisation should propagate across ALL SGS blocks. Default panel structure: Container → Element 1 → Element 2 → ... → Behaviour. Bean wants this to be a framework-wide convention, not a hero-only fix.

**Effort:** ~45 min for hero alone; ~3-4 hr to cascade across all 24 content/layout blocks + 14 form blocks. Stage as: hero first (proof-of-pattern), then audit all blocks, then bulk-rewrite.

**Resume trigger:** next session (Opus, dedicated to closing all visual-qa + framework gaps).

## ~~H-2 — imagePadding vs mediaPadding redundancy~~ — RESOLVED 2026-05-05

Wave 3A: Inspector labels clarified to "Inner padding (around the image element itself)" + "Outer padding (around the whole media wrapper)" plus HelpText explaining the structural difference. Attribute names unchanged for back-compat. Folded into the Image panel of the new element-grouped layout.

## H-2 — `imagePadding` vs `mediaPadding` redundancy on hero block (ORIGINAL)

**Captured:** 2026-05-05 (Bean noticed both options exist)

**Problem:** Hero block has BOTH `imagePadding*` (inner padding on the `<img>` element itself) AND `mediaPadding*` (outer padding on the `.sgs-hero__media` wrapper). They're not the same thing structurally but the two control names + sibling positioning in the inspector make them confusing — operator can't tell which one to use without reading the rendered DOM.

**Possible resolutions** (decide next session):
1. Rename for clarity: `imageInnerPadding` + `mediaWrapperPadding` (or similar) — descriptive labels in inspector, attribute names follow
2. Merge into one: most clients only need one of them; deprecate `imagePadding*` and rely on `mediaPadding*` + image's natural sizing
3. Document both clearly in the inspector with help text explaining the difference (cheapest fix; least value)

**Effort:** ~15 min for option 3 (help text); ~30 min for option 1 (rename + deprecation); ~1 hr for option 2 (merge + migration).

**Audit needed first:** are there other blocks with this same dual-padding pattern (image-element vs wrapper)? If yes, the framework-level fix is to standardise the pattern.

**Resume trigger:** Opus session — fold into H-1 inspector reorganisation.

## ~~H-3 — Video-everywhere-image feature~~ — RESOLVED 2026-05-05

Wave 3B + 3C + Wave 5: Shared `MediaPicker.js` (198 lines) + `sgs_render_media()` PHP helper + migration recipe at `tools/qc-prevention/media-slot-migration.md` (188 lines). Hero migrated as proof (Wave 3C). 8 of remaining 11 blocks migrated in Wave 5 parallel sweep (info-box, card-grid, testimonial, decorative-image, brand-strip, certification-bar, gallery, team-member, cta-section). 2 NO-OP (feature-grid container, process-steps text-only). Centralised npm run build clean. Wave 6 deploy verify PASS. Logo-only blocks use `allowedTypes={['image']}`. Gallery deviation flagged in recipe (multi-MediaUpload + resolveGalleryMedia normalisation).

## H-3 — Video-everywhere-image feature (ORIGINAL)

**Captured:** 2026-05-05 (Bean: "we should be able to use a video wherever we can insert an image")

**Problem:** SGS blocks currently support image as media but not video as a generic substitute. Hero has `bgVideo` and `splitImage` separately; no unified "media slot" abstraction. Means: every block that takes an image needs a parallel video attribute or has to be retro-fitted.

**Proposed design:**

1. New shared "media slot" concept: any attribute that accepts an image accepts a video too (mp4 / webm). The block detects mime-type and renders appropriately (`<img>` for images, `<video autoplay loop muted playsinline>` for videos by default — controls + sound configurable per instance).
2. New shared component (`MediaPicker` extending `MediaUpload`) that handles both image + video selection from the WP media library
3. Schema change: image attributes migrate to `mediaUrl` + `mediaType` (image | video) + `mediaSource` (uploaded id | external url) — backward-compatible deprecation
4. Render.php helper `sgs_render_media($attrs)` that emits the correct tag with the right attributes

**Affected blocks:** hero, info-box, card-grid, testimonial, decorative-image, brand-strip, certification-bar, gallery, all media-bearing blocks (~12)

**Effort:** ~2-3 hr for the shared component + schema + helper + 1 block (hero) as proof. ~1 hr per additional block to migrate.

**Resume trigger:** Opus session OR a dedicated framework feature session. Has cross-cutting impact — needs design review before implementation.

## ~~H-4 — Brand-source pink shade vs mockup brief~~ — RESOLVED 2026-05-05

Wave 2D: Built `scripts/brand-palette-sampler.py` (~200 lines, PIL k-means + CIE Delta-E 2000). Ran on Mama's brand assets. **Finding: `--surface-pink #F5C2C8` (the disputed shade) has zero anchor in the brand source — it's a designer-invented light tint.** Brand DOES use `#E68A95` primary pink (verified ΔE 2.7 against logo). Brand has a warm peach/tan family the mockup ignored: `#FAC47E`, `#E3B78B`, `#DAAA92`, `#BE7B52`. Bean approved adding the warm tones to Mama's variation palette as additive `surface-peach` / `surface-cream-warm` / `border-warm` / `cookie-brown-warm`. Surface-pink left as-is (Bean didn't request replacement). Script is reusable for every future client onboard.

## H-4 — Brand-source pink shade may not match mockup HTML brief (ORIGINAL)

**Captured:** 2026-05-05 (Bean reported pink shade looks wrong; investigation showed live SGS exactly matches mockup HTML brief CSS variables but Bean's eye still says wrong)

**Problem:** Live SGS hero background renders `rgb(245, 194, 200)` = `#F5C2C8` (matches mockup `--surface-pink`). Live primary button renders `rgb(230, 138, 149)` = `#E68A95` (matches mockup `--primary`). Both exact matches to the HTML brief.

If Bean's eye still says "wrong shade," the most likely cause is the **mockup HTML brief itself doesn't use the same pinks as the brand source assets** at `sites/mamas-munches/research/brand/`:
- `Mama's Munches Logo Transparent With Words.png`
- `Mamas-Munches-Horizontal-Logo-2-305x102.webp`

**Action needed next session:**
1. Sample dominant colours from the brand PNG/WebP files (use Python PIL or Node sharp to extract palette)
2. Compare to mockup `--surface-pink` and `--primary`
3. If brand differs from brief, decide: (a) update Mama's variation to match brand (deviates from HTML brief), or (b) keep variation matching brief (Bean's eye wrong / brief is canonical), or (c) update the brief to match brand
4. Once decided, sync mamas-munches.json palette accordingly

**Effort:** ~15 min for sampling + comparison + decision; ~5 min for variation update if needed.

**Resume trigger:** Opus session. May change other Mama's brand colours (cookie-brown, accent-yellow, charcoal) if brand source uses different shades.

## ~~H-5 — Classifier human-eye gate~~ — RESOLVED 2026-05-05

Wave 2A + 2B + 3D: Built `scripts/screenshot-diff-helper.js` (560 lines, pixelmatch + composite + heatmap + dominant-colour histogram + 6 exit codes). Added `requires_screenshot_review` flag to `mockup-parity-validator.js` (+109 lines, Q1-Q4 helpers, Section Q banner, conditional column). Baked Hard Rule 10 into `~/.claude/skills/visual-qa/SKILL.md` via /lifecycle Mode A (skillscore 95% A) — no severity reduction without screenshot evidence; deltas tagged `requires_screenshot_review: true` cannot be dismissed at all without pixel evidence.

## H-5 — Mockup parity validator structural false-positive classifier needs human-eye gate (ORIGINAL)

**Captured:** 2026-05-05 (the "55 deltas dismissed as structural noise" incident — see mistakes.md top entry)

**Problem:** The validator reports computed-style deltas. The CLASSIFIER (manual or automated) decides which are real defects vs structural noise. In 2026-05-04 we wrongly dismissed ~42 of 55 deltas as "structural" without screenshot evidence. Bean's eye caught 4 visible Major defects in the dismissed pile.

**Captured rule (binding):** `.claude/specs/common-wp-styling-errors.md` Section Q — classifier MUST attach side-by-side screenshot evidence before reducing severity below validator's reported severity. No screenshot = severity stays.

**Open work:**
1. Bake this rule into `~/.claude/skills/visual-qa/SKILL.md` programmatically (currently it's docs-only)
2. Build an automated screenshot-comparison helper: takes mockup + SGS at viewport + selector → outputs side-by-side image + pixel-diff heatmap. Operator confirms or escalates
3. The parity validator could output the candidate-noise deltas with a `requires_screenshot_review: true` flag so the classifier never auto-skips them

**Effort:** ~30 min for the screenshot-helper script + ~15 min to bake the rule into visual-qa skill + ~10 min to add the validator flag

**Resume trigger:** Opus session — this is the single biggest QC reliability gap.

## ~~H-6 — replaceBlock helper packaged~~ — RESOLVED 2026-05-05

Wave 2E: Built `scripts/wp-update-block-attrs.js` (385 lines). Wraps the createBlock+replaceBlock workaround as canonical attr-update path. Auth via `WP_USER` + `WP_APP_PASSWORD` env vars matching `global-styles-reset.js` pattern. Handles auth failure / post-not-found / no-match / save-failed / REST-mismatch with distinct exit codes. `--dry-run` and `--all-instances` flags. REST verification confirms attrs persisted. Operator-friendly "When to use" comment header.

## H-6 — Block validation errors silently reject `updateBlockAttributes` (ORIGINAL)

**Captured:** 2026-05-04 (caught during post 29 attribute updates)

**Problem:** When a block instance's stored `post_content` HTML doesn't match what the current `save.js` would produce, WordPress flags it as "invalid block content" and silently rejects subsequent `wp.data.dispatch.updateBlockAttributes` calls. The editor state appears to update but the save round-trip drops the changes. Took ~30 min to diagnose mid-session.

**Workaround discovered:** use `wp.blocks.createBlock(name, attrs, innerBlocks)` + `replaceBlock(clientId, fresh)` instead of `updateBlockAttributes`. The fresh block bypasses validation.

**Open work:**
1. Bake the workaround into a helper script: `scripts/wp-update-block-attrs.js` that takes (post-id, block-name, attrs) and uses replaceBlock by default
2. Add a check in the visual-qa skill's deploy step: after any source-block-attrs change, verify the live `post_content` reflects the change before declaring done
3. Document the behaviour as a Section R in common-wp-styling-errors.md (block validation patterns)

**Effort:** ~30 min for the helper script + ~10 min for the skill check + ~10 min for the docs

**Resume trigger:** Opus session.

## ~~H-8 — Hero block missing `ctaGap*` attribute + recogniser blind spot for child-flex-gap~~ — RESOLVED 2026-05-06

4 attrs added to `block.json` (`ctaGap` default 12, `ctaGapMobile` default 10, `ctaGapTablet`, `ctaGapUnit`). Wired through `render.php` as scoped CSS on `.sgs-hero__ctas` with `!important` on tablet/mobile (F4 pattern). `ResponsiveControl` + `SelectControl` added to Buttons panel in `edit.js`. v5 deprecation added to `deprecated.js` (no migrate function needed — defaults match mockup values). Cascade audit findings reported in close-out report.

## H-8 (ORIGINAL) — Hero block missing `ctaGap*` attribute + recogniser blind spot for child-flex-gap

**Captured:** 2026-05-05 (Q1 from Bean's session-end questions: "was the button padding I added found in the draft and why wasn't it added initially?")

**Problem:** Mockup HTML brief has explicit gap values for the CTA button container:
- Mobile (default): `.hero-ctas { display: flex; flex-direction: column; gap: 10px; }` (line 273)
- Desktop (`.hero-copy .hero-ctas`): `flex-direction: row; gap: 12px` (line 306)

Hero block.json has `splitGap`/`splitGapTablet`/`splitGapMobile` for the OUTER grid columns (image+content), but NO attribute for the CTA gap. So:
1. Recogniser couldn't extract the value to a block attribute (no destination)
2. The "universal-handled CSS classifier" should have kept the rule as scoped variation CSS but didn't (recogniser blind spot)
3. Net: the gap rule was silently dropped from the extraction

**Fix needed (Opus session):**

1. Add 4 attributes to hero block.json: `ctaGap`, `ctaGapMobile`, `ctaGapTablet`, `ctaGapUnit` (default: 12px desktop, 10px mobile)
2. Wire through render.php as scoped CSS rule with `!important` on mobile (F4 pattern)
3. Add ResponsiveControl to edit.js inspector under "Buttons" panel (per H-1 reorganisation)
4. Update recogniser-v2 mapping to extract `.hero-ctas { gap: X }` to the new `ctaGap` attribute
5. Audit other SGS blocks for similar "child container layout" attribute gaps (process-steps, info-box, etc.)

**Effort:** ~25 min for hero block (block.json + render.php + edit.js + recogniser mapping). ~1 hr to audit + extend other blocks.

**Resume trigger:** Opus session — fold into H-1 inspector reorganisation.

## ~~H-9 — Framework `background: linear-gradient(...)` shorthand patterns need audit (Section R bug)~~ — RESOLVED 2026-05-06

Grep found 15 `background:` shorthand matches across 8 blocks. Analysis: 12 were inner child/pseudo-element rules (no `.has-background` guard needed). 3 were block-level or wrapper-proximate rules requiring fix: `cta-section/style.css` — button gradient + 4 variant preset rules converted to `background-image:` + `:not(.has-background)` guard; `post-grid/style.css` — skeleton shimmer converted to `background-image:`. `css-pattern-audit.js` extended with `checkBackgroundShorthand()` function to prevent re-introduction (H-10a).

## H-9 (ORIGINAL) — Framework `background: linear-gradient(...)` shorthand patterns need audit (Section R bug)

**Captured:** 2026-05-05 (Section R — gradient masking the user's backgroundColor on hero)

**Problem:** Multiple framework block CSS files use `background: linear-gradient(...)` shorthand as a default. The shorthand sets `background-image` AND resets `background-color`. When combined with a `:not([style*="background-color"])` exclusion that doesn't catch WP's `.has-*-background-color` class-based colour application, the gradient paints over user-set colours invisibly.

Hero fixed in 2026-05-05 commit (replaced `background:` with `background-image:` + added `:not(.has-background)` to exclusion).

**Audit needed (Opus session):**

1. Grep all `plugins/sgs-blocks/src/blocks/*/style.css` for `background:\s*linear-gradient` and `background:\s*url(`
2. For each match, check if the rule has `:not([style*="background-color"])` exclusion AND `:not(.has-background)` clause
3. If missing `:not(.has-background)`, fix it
4. Convert `background:` shorthand to `background-image:` to avoid resetting other background properties
5. Test each affected block against a `.has-background` instance to confirm fix

**Affected blocks (suspected):** any block with a "default visual" that uses gradient/image — testimonial, info-box, cta-section, hero (fixed), product-card, possibly more.

**Effort:** ~10 min audit + ~5 min per block fix; total ~30-60 min depending on count.

**Resume trigger:** Opus session.

## ~~H-10 — Cascade Section R defects into prevention scripts~~ — RESOLVED 2026-05-06

10a: `scripts/css-pattern-audit.js` extended with `checkBackgroundShorthand()` — greps all block CSS for `background:` shorthand with gradient/url, classifies by block-wrapper vs inner-element, exits code 1 on R4 (block-wrapper without `:not(.has-background)` guard). 10b: `mockup-parity-validator.js` gains pseudo-element measurement — `::before`/`::after` computed styles captured when `content !== 'none'`, surfaced as `sgs_pseudo_before`/`sgs_pseudo_after` on deltas. 10c: parent-chain filter walker added — walks to `<body>` checking `filter`, `mixBlendMode`, `backdropFilter`, `opacity`; flags `parent_chain_effect` on delta + auto-sets `requires_screenshot_review: true`.

## H-10 (ORIGINAL) — Cascade Section R defects into prevention scripts

**Captured:** 2026-05-05 (Section R)

**Problem:** The classifier's structural-noise dismissal pattern + `getComputedStyle().backgroundColor`-only check caused real visible defects to ship. `mockup-parity-validator.js` WATCHED set has been extended (commit pending) but related defect classes need their own prevention scripts:

1. **CSS pattern audit:** flag any framework block CSS using `background: linear-gradient(...)` or `background: url(...)` that doesn't include `:not(.has-background)` in its selector.
2. **Pseudo-element measurement:** when running `mockup-parity-validator.js`, also measure `getComputedStyle(el, '::before')` and `(el, '::after')` for any element with `content !== 'none'`.
3. **Filter / mix-blend-mode walker:** when measuring an element, also walk its parent chain for non-default `filter`, `mixBlendMode`, `backdropFilter`, `opacity` — flag as "rendered-colour-may-differ-from-computed".

**Effort:** ~15 min for CSS pattern audit extension; ~30 min for pseudo-element measurement; ~10 min for parent-filter walker. Total ~55 min.

**Resume trigger:** Opus session — fold into H-5 (classifier human-eye gate) work.

## ~~H-7 — Full-bleed pattern replacement~~ — RESOLVED 2026-05-05

Wave 2C: Replaced negative-margin full-bleed (`margin: 0 -24px`) with viewport-aware `var(--viewport-width, 100vw)` calc-based margins. Added `theme/sgs-theme/assets/js/viewport-width.js` (50 lines, IIFE, debounced resize listener) — sets `--viewport-width` on `:root` to `document.documentElement.clientWidth` (excludes scrollbar on Windows). Fallback to `100vw` when JS unavailable. Removed Mama's `.page-id-29` instance-level overrides — framework now handles full-bleed for every hero instance. Wave 6 deploy verify confirmed: hero `width: 1440px` at desktop, no horizontal overflow, no Section R gradient overpaint. Pattern doc at `tools/qc-prevention/full-bleed-pattern-replacement.md`.

## H-7 — Negative-margin full-bleed framework pattern needs replacement (ORIGINAL)

**Captured:** 2026-05-05 (Fix 4 from hero-audit-2026-05-05; instance-level workaround applied for Mama's, framework still uses fragile pattern)

**Problem:** Hero block's `style.css` uses `section.sgs-hero { margin: 0 -24px }` to fake full-bleed beyond the wrapper. Math only works if the parent's content-area padding is exactly 24px. On the test page template (and likely any non-default template) the parent has 16px or 0 padding — leaving 8-16px gap on each side.

**Fixed for Mama's via variation CSS** (commit 22df0a6): `.page-id-29 .entry-content.wp-block-post-content { padding-left: 0; padding-right: 0 } .page-id-29 section.sgs-hero { width: 100%; margin: 0 }`. This is per-instance — every page-id needs its own override.

**Framework-level fix needed:** replace the negative-margin pattern in `plugins/sgs-blocks/src/blocks/hero/style.css` with a robust full-bleed:
```css
section.sgs-hero { width: 100vw; margin-left: calc(50% - 50vw); margin-right: 0; max-width: none; }
```
Note: `100vw` includes scrollbar width so this can cause 15px overflow on Windows. Alternative: a JS-based viewport-width measurement that excludes scrollbar, applied via CSS custom property.

**Affected:** all SGS hero instances, all clients. Currently each client's variation needs to manually neutralise the negative margins.

**Effort:** ~30 min framework fix + verification across multiple test environments (Mac no-scrollbar, Windows with scrollbar, mobile)

**Spec:** `tools/qc-prevention/full-bleed-pattern-replacement.md` (still open)

**Resume trigger:** Opus session — framework hero rebuild.
