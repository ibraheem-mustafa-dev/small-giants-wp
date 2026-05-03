---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-03
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

## P-7 — sgs/icon vs sgs/icon-block duplicate cleanup

**Status:** Found 2026-05-03 during competitor button research. Two blocks doing the same job.

| `sgs/icon` (10 attrs) | `sgs/icon-block` (11 attrs) |
|------------------------|------------------------------|
| icon, size, iconColour, backgroundColour, backgroundShape, link, linkOpensNewTab, linkLabel, hoverColour, hoverScale | icon, iconColour, iconSize, backgroundColour, link, linkLabel, linkOpensNewTab, shape, sgsAnimation, sgsAnimationDuration |

Both are `sgs-content`, both render Lucide icons with optional link. `icon-block` has animation; `icon` has hover scale + colour.

**Trigger to resume:** During next QC pass or when one is needed in a new pattern.

**What:** Pick canonical (likely `sgs/icon-block` since it has animation), migrate `sgs/icon` instances via deprecation, retire `sgs/icon`. Audit codebase for similar dupes (run a check across every block.json — group by description + supports + attribute overlap).

**Effort:** ~1h investigation + 30min deprecation/migration code.

## P-8 — Reduced-motion rules in dark-mode.css / header-modes.css / reading-progress.css

**Status:** 3 files outside the scope of the 2026-05-03 cleanup still carry their own scoped reduced-motion rules. With the new universal rule in core-blocks-critical.css, they may now be redundant.

**Trigger to resume:** Next CSS audit / refactor session.

**What:** Verify whether the new universal `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important }` covers the cases each scoped block was handling. If yes, remove. If they're handling additional non-animation properties (e.g. transform, scroll-behavior), keep but verify they don't conflict.

**Effort:** ~30min audit + 10min cleanup.

## P-9 — Recogniser-v2 generalisation beyond hero

**Status:** Hero extractor working at `tools/recogniser-v2/extract.py` (2026-05-03). Tested only on hero.

**Trigger to resume:** Once button architecture lands and we move to the next mockup section (trust-bar / featured-product / etc.).

**What:** Extend the per-block extractor pattern to other SGS blocks. Auto-generate the per-block scaffold from block.json so adding a new extractor is one PR. Wire up the LLM fallback path for unknown patterns. Build the "block coverage gate" reporter.

**Effort:** ~4–6h once we have ≥3 blocks done as templates.

# Parking — deferred work with named triggers

Items parked here have a clear next-step but aren't urgent. Each entry has: the work, the trigger to resume, the spec, and rough effort.

## P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** Subagent attempt blocked by Trustpilot anti-bot. Inline Playwright not yet tried.

**Trigger to resume:** Mid-design-clone session, when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for the live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

## P-5 — `sgs/feature-grid` block does not exist (recogniser hallucination)

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
