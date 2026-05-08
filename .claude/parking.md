---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-08
---

# Parking — deferred work with named triggers

Items here have a clear next-step but aren't urgent. Each entry: the work, the trigger to resume, the spec, and rough effort. Resolved items are kept as one-line summaries (no ORIGINAL retention to keep the file scannable).

---

## Active items (cloning pipeline focus)

### P-11 — Cloning-skill build session (revised Option A + Top-12 gaps)

**Captured:** 2026-05-08 (rule-stage coverage audit + 4-model peer review of fingerprint design)

**What:** Single comprehensive session executing 10 milestones — schema sync, 4-layer fingerprint catalogue, role templates, critical fixes 1-5, important fixes 6-9, top-5 gaps, computed-style passport, Mama's hero smoke, full Mama's homepage smoke, handoff. Heavy parallel-subagent orchestration; main agent is orchestrator + QC.

**Why this exists:** the 4-model peer review identified 11 fixes needed atop the original design. The rule-stage coverage audit identified 28 genuine gaps remaining after Option A. Top-5 gaps are clone-blocking. Combined into one session via subagent orchestration rather than three separate sessions.

**Source docs:**
- `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — 97 rules audited; 28 genuine gaps + Top-12 ranked
- `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 review findings
- `.claude/reports/fingerprint-design-review-brief-2026-05-07.md` — design brief used by reviewers
- `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS section
- `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` REVISIONS section

**Specialised next-session-prompt:** `.claude/next-session-prompt-cloning-skill-build.md` (created 2026-05-08).

**Effort:** ~6-7 hours wall-time (~3-4 hours main-thread active + ~3 hours parallel subagent work).

**Resume trigger:** when Bean has a focused window for the build session.

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


## Resolved items (kept as one-line audit trail)

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
