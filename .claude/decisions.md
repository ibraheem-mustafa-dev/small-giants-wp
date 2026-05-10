# small-giants-wp — Architectural Decisions Log

Append-only. Most-recent first.

## 2026-05-10 — Mockup-migration pattern-slug convention: short form (Option A)

**Decision:** When a mockup section maps to a PATTERN (not a single block), the SGS-BEM `<block>` placeholder uses the short pattern slug. Example: `.sgs-header__inner`, not `.sgs-header-mamas-munches__inner`. Client-variant context lives in the file path (`sites/<client>/mockups/...`), not repeated in every class name. Composite blocks like `sgs/hero` keep their block slug verbatim (`.sgs-hero__copy`).

**Why:** verbose pattern slugs (`sgs-header-mamas-munches`) bloat class names and force every per-client mockup to use different names for structurally identical elements. The file-path context already disambiguates which client owns the mockup. KJC raised by Bean during Phase 6 inventory; my recommendation (Option A) accepted.

**Applied:** Phase 6 Mama's mockup migration. 138 class-attr rewrites + 145 CSS/JS line changes per file produced 0.000% pixel diff at 375/768/1440. Convention captured in TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`.

## 2026-05-10 — Classes map to PATTERNS not blocks (Spec 13 amendment by Bean ruling)

**Decision:** Spec 13's `<block>` placeholder accepts pattern slugs (in addition to block slugs) when a mockup section operates at pattern level. Only composite single-section blocks (like `sgs/hero`) collapse to one block. Most sections (header, footer, featured-product, ingredients, brand-story, gift-section, social-proof) are patterns composed of multiple blocks. Inner classes follow their corresponding block's slug; inner elements without a dedicated block use the parent pattern's namespace.

**Why:** I conflated mockup-section depth with block depth during Phase 6 inventory. Bean: *"classes are equivalent to patterns, not blocks (aside from only the composite block sgs-hero)... we already do have header and footer patterns saved in the theme."* Captured to CC memory as `feedback_classes_map_to_patterns_not_blocks.md` (recurrence-flagged via lesson-trigger).

**Stacked process rule:** Never defer with placeholder or "future session" when a new block/pattern/attribute is needed during clone-pipeline migration. Make it inline using sgs-db + Rosetta Stone scripts; decisions that need intelligence happen with Bean inline. Surgical means scope-controlled, not "skip the work that needs doing".

## 2026-05-10 — Phase 4 propagation method: hybrid inline + Python helper (Option C)

**Decision:** B2 (5 design-generation skills, substantive) shipped via inline Edit calls in main thread. B3-B9 (40 surfaces, mechanical inserts of the canonical SGS-BEM Convention block) shipped via idempotent Python helper script at `.claude/scratch/phase-4-batch-insert.py`. B5 sub-skill `/sgs-clone` got an additional Stage 0 pre-flight gate spec section in the same insert. Second pass added bespoke per-skill integration notes to 27 surfaces via `.claude/scratch/phase-4-bespoke-integration-notes.py`.

**Why:** Phase 4 KJC #1 anticipated subagent over-reach risk on substantive edits. Option C (Hybrid) wins: substantive edits stay inline where Bean can see the reasoning; mechanical insertions run via deterministic script with idempotency guard (skips files already containing the marker). Max positive delta across 45 surfaces was +2.9% — well under the 5% over-reach trigger.

**Verification:** 45 / 45 files have Spec 13 path + SGS-BEM Convention H2 + blub.db row 236. 0 regressions from passing to failing. Largest drop sgs-clone -3.6% (still passing at 90.4%; got the longer Stage 0 gate template).

## 2026-05-10 — Skill-type rubric mismatch is BASELINE, not debt

**Decision:** When sgs-skillscore v2 grades a file below threshold because the file is a mini-skill, slash command, agent definition, or discipline reference — and the rubric is checking for full-skill criteria (Goal section, Common Mistakes table, HARD GATE markers, numbered stages, references/ directory, system-effect 6-lens check) — **do not restructure to satisfy the rubric**. The rubric is the wrong tool for that file type.

**Why:** Restructuring forces verbose padding that doesn't serve the file's actual purpose. Ruling first applied 2026-05-10 to `/frontend-design` and `/superdesign` during Phase 4 B2 (49% F and 55% D respectively post-Spec-13-insert). Same ruling extended same-day to 22 more sub-90 surfaces during the Phase 4 sub-80 audit fix pass (commands, agents, mini-skills, TDD discipline reference). Real bugs in those files were fixed (humanize wrong content, audit /colorize typo, missing When NOT to Use sections). Rubric noise was accepted.

**Reopen condition:** if a future skillscore tier model distinguishes between file types, re-grade and revisit. Until then, these surfaces stay sub-90 by design.

## 2026-05-10 — Defer cross-platform emit pathway (P-CP-1/2/3) until M9 production-stable

**Decision:** Three parking entries (P-CP-1 `/sgs-emit`, P-CP-2 style translation, P-CP-3 animation translation) registered in `.claude/parking.md`. **No work starts on any of them until M9 is production-stable AND ≥3 successful clones are banked.**

**Why:** The Rosetta Stone infrastructure is structurally ready (uimax stack tables populated 49-60 rows each across 16 platforms; `equivalent_implementations` on every artefact; `design_tokens` in DTCG format; `animations` schema migrated 2026-05-10). Cost is the engineering pass per platform target — non-trivial but well-bounded. M9 ships first because clone fidelity is the upstream gate; cross-platform emit downstream of an unreliable clone is wasted work.

**Strategic alignment:** SGS-prefixed BEM (Spec 13) is the structural enabler. Without the convention, cross-platform translation needs probabilistic recogniser layers per source mockup; with it, literal slug match yields deterministic component mapping. This is why Spec 13 belongs as a hard prerequisite, not a soft preference.

## 2026-05-10 — Phase 2 DB cleanup audit: no DROPs this pass (conservative-keep)

**Decision:** Audit reports written for both DBs (`.claude/reports/db-audit-sgs-framework-2026-05-10.md` + `db-audit-uimax-pro-max-2026-05-10.md`). 8 empty tables identified as potential drop candidates. **No DROPs applied this session.**

**Why:** Bean flagged that empty tables may be recently-created scaffolding awaiting first population, not stale dead schema. The audit could not produce creation-timestamp evidence per table (SQLite has no built-in DDL timestamps). Conservative default per Phase 2 Step 3 ("if cross-reference unclear, default to keep"). Cost of wrong drop > cost of dead-schema noise.

**Drop candidates kept (8):**
- sgs-framework: `block_opportunities`, `extraction_cache`, `sections_detected`, `weaknesses`
- uimax: `stack_bootstrap`, `stack_html_css`, `stack_php`, `stack_wordpress`

**Reopen condition:** if any of these tables remains 0-row + 0-grep-hits-in-scripts after Phase 4 propagation completes (≥2 weeks post-2026-05-10), reopen the drop conversation with creation-timestamp evidence sourced from git history of the migration scripts.

**Related:** `.claude/plans/phase-2-db-cleanup-audit.md`, `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (Phase 1 outcome that informs Phase 4 propagation).

## 2026-05-10 — SGS-prefixed BEM is canonical for all Bean-controlled drafts (Spec 13 locked)

**Decision:** All Bean-controlled drafts (mockups, sketches, hand-coded HTML produced in-house) MUST use `.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 pre-flight gate hard-rejects on production runs; `--draft-mode` = soft warning; `--legacy` bypasses for pre-rule mockups. Live scrapes use lingua-franca-conversion at recognition time.

**Why:** Drafts and rendered SGS share class-name space; literal slug match collapses the 9-stage pipeline from probabilistic-with-fallback to deterministic for Bean-authored drafts. Probabilistic recognition stays only where Bean does NOT control source naming (live scrapes).

**Captured at:** blub.db row 236, pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`. Canonical reference: `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`.

**KJC #1:** `.sgs-` prefix chosen over `.draft-` / `.dft-` because drafts and rendered SGS share class-name space; literal slug match (`.sgs-hero` → `sgs/hero`) is unambiguous.

**KJC #2:** Hybrid validation enforcement chosen (Option C): hard pre-flight gate on production runs + soft lint warning under `--draft-mode`. Hard-only blocks rapid iteration; soft-only lets non-conforming drafts back into the pipeline.
