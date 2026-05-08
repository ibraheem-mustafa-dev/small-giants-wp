---
doc_type: handoff
project: small-giants-wp
session_date: 2026-05-07
session_tag: small-giants-wp-2026-05-07-cloning-skill-design
recommended_model: opus
next_session: cloning-skill-build (see `.claude/next-session-prompt-cloning-skill-build.md`)
---

# Session Handoff — 2026-05-07/08 (cloning-skill design + foundation)

## Headline

Marathon design + foundation session. Locked the `/sgs-clone` design via 4-model peer review, built the foundation (schemas migrated, 3 pipeline scripts shipped, 4-doc Rosetta Stone embed, populated catalogues, 1-effect bucket shipped to all applicable blocks), produced a 97-rule coverage audit identifying 28 genuine gaps, and queued the comprehensive build session as one focused milestone-driven follow-up rather than three smaller ones.

**Next session:** `/sgs-clone` build session (parking P-11) per the specialised next-session-prompt. 10 milestones, ~6-7 hr wall-time with parallel-subagent orchestration.

---

## What landed this session

### Foundation — schemas + scripts + populated catalogues

| Deliverable | Where |
|---|---|
| sgs-db migration (8 new patterns columns + UNIQUE INDEX on fingerprint) | `scripts/migrations/sgs-db-cloning-2026-05-07.sql` |
| uimax migration (`patterns`, `naming_conventions`, `animations`, `mood_boards`, 5 stack tables, classification cols on 10 existing tables, is_emoji flag, equivalent_implementations JSON cols) | `scripts/migrations/uimax-cloning-2026-05-07.sql` |
| Migrations applied live to both DBs | sgs-framework.db + ui-ux-pro-max.db |
| `pattern-fingerprint.py` (513 lines) — sha256(normalised_html + sorted_css_var_dump) + unmapped_css_rules warning | `plugins/sgs-blocks/scripts/` |
| `pattern-classify.py` (624 lines) — deterministic content_shape walker + block_composition heuristic + LLM classification with auto-fallback | `plugins/sgs-blocks/scripts/` |
| `pattern-register.py` (867 lines) — 6-step orchestrator with idempotent migration helper + sibling imports + dry-run safety | `plugins/sgs-blocks/scripts/` |
| `/sgs-db` extended with 4 cloning subcommands (fingerprint / patterns-by-category / patterns-by-industry / patterns-by-fingerprint-prefix) | `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` |
| 16 naming conventions populated (BEM/SGS/WP-Gutenberg/Tailwind/Bootstrap/MUI/Spectra/Astra/Kadence/shadcn/Lovable/v0/Bolt/OOCSS/SUIT/ACSS) | uimax `naming_conventions` |
| 63 animations populated with full Rosetta Stone equivalents | uimax `animations` |
| 12 emoji libraries flagged is_emoji=1 with equivalent_implementations backfilled | uimax `icon_libraries` |
| Bucket 1 effects shipped to all applicable blocks (form-focus-ring on sgs/form, ripple-on-click via hover-effects extension, svg-path-draw-on-scroll on sgs/decorative-image) | various block files; `ripple.js` new; `extensions.css` extended; `animation-observer.js` extended |
| Defensive populate-db.py patch for `_comment_*` non-spec attributes | `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` |
| `/sgs-update` re-ran clean: 64 blocks / 28 tokens / 8 variations / 35 patterns / 18 templates / 3 hooks / 8 components / 3 plugins / 9 deploy steps / 12 gotchas | sgs-framework.db |

### Rosetta Stone discipline embedded structurally

Captured as blub.db row 213 (`uimax-is-the-rosetta-stone-of-design`). Embedded across 4 surfaces:
- Project CLAUDE.md — Architecture Rules section with full distinction (uimax = DB activity layer; /ui-ux-pro-max = intelligence skill consuming the DB)
- `~/.claude/skills/sgs-wp-engine/SKILL.md` — Hard Rule 7 (cross-platform translation discipline, 64 blocks roster)
- `~/.claude/skills/ui-ux-pro-max/SKILL.md` — Stage 5 INGEST HARD GATE (every write carries equivalent_implementations or flags the gap)
- `~/.claude/skills/animation-harvest/SKILL.md` — full deprecation stub redirecting to `/uimax-scrape-animation` (skillscore 93%)

### Spec doc cleanup

| File | Was | Now |
|---|---|---|
| `cloning-skill-salvage-matrix-2026-05-05.md` | 429 lines (REVISIONS + bulky v1) | 107 lines (REVISIONS + Rosetta Stone addendum + final command surface) |
| `pattern-dedup-classify-mechanics-2026-05-05.md` | 612 lines (REVISIONS + bulky v1) | 160 lines (REVISIONS + Correction 6 categorisation-by-purpose + Rosetta Stone addendum + simplified flow) |

v1 content preserved in git history. Recovery instructions captured in stubs.

### 4-model peer review of fingerprint design

| Reviewer | Verdict | Top finding |
|---|---|---|
| Sonnet 4.6 | ship-with-fixes | Tailwind classes stored as space-separated string instead of indexed token array → first Tailwind clone returns 0 matches for whole sections |
| Gemini Flash | ship-with-fixes | Structural signature too rigid for utility-wrapper hell; Layer 3/4 missing pairing index for tabs |
| Gemini Pro | ship-with-fixes | Single-convention-per-scrape assumption is fatal — real sites mix BEM + Tailwind + Bootstrap |
| Cerebras | (skipped per its own skill spec — "not enough reasoning depth vs Opus/Gemini-Pro for architecture decisions") |

Synthesis: 11 fixes (5 critical, 4 important, 2 stretch). Documented at `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md`.

### Rule-stage coverage audit (Step 11 dissection)

97 cloning-relevant rules audited across 9 pipeline stages + cross-cutting. Source-of-truth read: mistakes.md / common-wp-styling-errors.md (18 sections, 67 errors) / 12-DRAFT-TO-SGS-PIPELINE.md / sgs-wp-engine + visual-qa Hard Rules / blub.db high-priority / project CLAUDE.md / fingerprint design synthesis / parking.

| Status | Count |
|---|---|
| ✓ Covered today | 31 (32%) |
| △ Closed by Option A revised | 38 (39%) |
| ✗ Genuine gap after Option A | 28 (29%) |

**Top-5 actionable gaps (ranked by clone-blocking severity):**

1. Computed-style passport for hashed-class fallback (CSS Modules / MUI / SvelteKit)
2. Pairing index for tabs/accordion parallel structures
3. Per-section hybrid convention voting (drops single-convention assumption)
4. `recognition_log` table + operator-review UI
5. 5 missing attribute roles (`layout-alignment`, `accessibility-attribute`, `data-binding`, `visibility-control`, `layout-modifier`)

Audit doc: `.claude/reports/rule-stage-coverage-audit-2026-05-07.md`.

### Parking review

Cleaned from 461 lines → 245 lines. Removed ~150 lines of resolved-original duplication. Restructured into Active (cloning) / Active (framework) / Resolved sections. Added 6 new entries:
- **P-11** — Cloning-skill build session (revised Option A + Top-12 gaps as 10 milestones)
- **P-12** — `block_compositions` seed for existing 36 patterns
- **P-13** — Validator on uimax writes (no-licensing + Rosetta Stone discipline)
- **P-14** — `block-name-search-blindspot` grep wrapper
- **P-15** — `/sgs-update` Stage 3+4 (uimax sync extension)
- **P-16** — Embed `diagnose-blub-db-locks-not-park-on-timeout` rule into /autopilot + /handoff

Status updates landed: P-6 (image controls extension) marked UNBLOCKED; old P-9 (Recogniser-v2 generalisation) marked SUPERSEDED by P-11.

### Specialised next-session prompts ready

| Prompt | Path |
|---|---|
| Cloning-skill build (P-11) | `.claude/next-session-prompt-cloning-skill-build.md` |
| Bucket 2 + timeline rework (P-9) | `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md` (from earlier in session) |

### Final wave — P-14 + P-6 + P-8 + P-16 closed via parallel subagent dispatch

Per Bean's late-session instruction (use `/subagent-driven-development` + `/delegate` + `/dispatching-parallel-agents` then `/qc-inline` + `/handoff`):

| Item | Model | Effort | Outcome |
|---|---|---|---|
| **P-14** block-name-search-blindspot grep wrapper | Haiku + 3 inline fixes | ~30 min total | `scripts/sgs-block-grep.py`. Triple-term search (literal + parenthetical-stripped + slug-form `sgs/<name>` derivation). Text + JSON output modes. Three inline fixes after Haiku return: (a) backslashes-in-docstring tripped Python unicode-escape parser → switched to forward slashes; (b) Haiku used `'*.{md,php,...}'` brace-glob — neither rg nor grep brace-expand at arg level → switched to one `--glob`/`--include` per extension; (c) Windows path `c:\Users\...\file.md:123:content` was splitting naively on first colon (drive letter) → switched parser to a regex anchored on file-extension boundary. Final smoke test: "Hero Block" → 80 hits (71 via slug derivation). "Icon Block (single icon)" → 43 hits across all 3 search forms. Working as intended now. |
| **P-6** image-controls block extension | Sonnet | ~120 min | New extension at `plugins/sgs-blocks/src/blocks/extensions/image-controls.js` (~5.7KB) + `plugins/sgs-blocks/includes/image-controls.php` (~4.8KB) + extension.css extension + 7 blocks opted-in via `supports.sgs.imageControls: true` (decorative-image, gallery, card-grid, hero, info-box, team-member, testimonial). brand-strip / certification-bar deliberately excluded (logo-only). Webpack build clean. Project CLAUDE.md updated with Image controls discipline section (under Architecture Rules). |
| **P-8** reduced-motion audit | Sonnet | ~35 min | 4 files audited (3 briefed + 1 bonus reading-progress.css the subagent surfaced). 8 redundant rules removed total. 1 rule kept (`header-modes.css` scroll-driven shrink animation — `animation: none` is the only valid suppression for `animation-timeline: scroll()` since the universal duration trick doesn't apply). Audit-marker comments added to all 4 files. |
| **P-16** diagnose-blub-db-locks-not-park-on-timeout embed | Inline | ~15 min | Embedded in two places: (a) `~/.claude/skills/autopilot/references/correction-capture.md` Failure handling section — full diagnostic sequence as HARD GATE before parking, plus unicode-substitution fallback for /api/knowledge POST hangs (blub.db row 199); (b) `~/.claude/commands/handoff.md` — added a Persistence-failure HARD GATE banner at the top of the Pre-Handoff Gates section, pointing back to the autopilot correction-capture diagnostic sequence so /handoff Gate 4 dashboard sync calls inherit the rule. Both surfaces explicitly note: filesystem operations are exempt; the rule applies only to network POSTs to localhost dashboard endpoints. |

All 4 items closed with /qc-inline pass at 100% confidence (P-14 after a 1-line path-style fix). Parking now stripped of P-14 / P-6 / P-8 / P-16 (collapsed to one-line resolved entries on next parking pass).

---

## Two captured rules to MEMORY

| pattern_key | blub.db row | Embedded |
|---|---|---|
| `no-licensing-talk-in-sgs-cloning-context` | 211 | 4 surfaces (CLAUDE.md / sgs-wp-engine / ui-ux-pro-max / spec REVISIONS sections) |
| `uimax-is-the-rosetta-stone-of-design` | 213 | 4 surfaces (CLAUDE.md / sgs-wp-engine Hard Rule 7 / ui-ux-pro-max Stage 5 / animation-harvest deprecation) |

Both also live in CC auto-memory at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_*.md`.

---

## Outstanding for next session

### Immediate (cloning-skill build per P-11)

The 10-milestone session executes:
1. Schema sync extensions (uimax sync gap close + block_compositions seed)
2. Layer 1+2 fingerprint catalogue + 8 base role templates (parallel Sonnet × 3)
3. Layer 3+4 + slot overrides + 5 missing roles (parallel Sonnet × 2)
4. Critical fixes 1-5 (parallel Sonnet × 4)
5. Important fixes 6-9 + recursion guard + confidence matrix + 5th leftover bucket (parallel Sonnet × 3)
6. Top-5 gap closures including `recognition_log` + operator UI + uimax write validator (parallel Sonnet × 2)
7. Build `/sgs-clone` + 5 sibling commands via `/lifecycle` Mode A (sequential)
8. Mama's hero smoke run
9. Full Mama's homepage smoke
10. Final `/handoff`

### Deferred (separate sessions)

- **P-9** Bucket 2 new blocks + timeline rework (after P-11 ships) — `sgs/empty-state` / `sgs/toggle` / `sgs/testimonial-slider` + `sgs/timeline` redesign. Strategic dogfood opportunity for `/sgs-clone`.
- **P-6** Image controls block extension (UNBLOCKED, ~2-3h)
- **P-2** Phase 2.5 / G2.5 deferred work (4 skills + 3 agents + seo-technical content fixes)
- **P-4** Trustpilot 4-review scrape (15-20 min mid-clone)
- **P-8** Reduced-motion rules audit (~40 min)
- **P-10** svg-morph (deferred indefinitely — paid GSAP plugin)
- **P-16** Embed `diagnose-blub-db-locks-not-park-on-timeout` rule via `/lifecycle`

---

## Session reflection

Three threads converged:

1. **Design lock-in via 4-model peer review** — Sonnet + Gemini Flash + Gemini Pro all returned ship-with-fixes. Cerebras correctly skipped per its own skill spec. The 11 specific fixes are concrete and bounded.

2. **Coverage audit reveals truth** — 29% of cloning-relevant rules stay uncovered even after the revised Option A. Top-5 gaps are clone-blocking. Without the audit, the build session would have under-built (missing the gaps) or over-built (duplicating already-enforced rules). Audit is the higher-value deliverable than parking review alone.

3. **Bean's reframe collapses 3 sessions to 1** — properly orchestrated subagent dispatch lets the comprehensive build run in one focused session. Main agent orchestrates + briefs + qc; subagents execute. The original "Sessions A/B/C" thinking was conservative; ~10 milestones in one session is the right shape given the delegation system.

Strategic implication: after P-11 (cloning-skill build), the framework moves from "manual mockup-to-blocks" to "deterministic mockup-to-blocks with intelligence layer for novelty." Every future client clone benefits from the catalogue compounding. Pattern library grows; uimax intelligence grows; recognition_log identifies new patterns over time. Strategic differentiator that compounds with every project.

The cumulative ROI of this 12+ hour session is the difference between continuing to clone manually (4-6 hrs per client homepage with high failure modes) and shipping a deterministic-first cloning skill (30-60 min per page with operator-review for the 15% novelty). Tens of hours saved per client; competitive moat that strengthens with every clone.

Foundation is locked. Build session is queued. Bean confirms when ready to resume.
