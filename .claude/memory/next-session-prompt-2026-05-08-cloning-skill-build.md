recommended_model: opus

Invoke `/autopilot` before doing anything else.

You are running a **dedicated cloning-skill build session on Opus**. Mission: ship the full `/sgs-clone` recogniser catalogue — revised Option A (4-layer fingerprint with bidirectional extract+generate) + the 9 critical+important fixes from the 4-model peer review + the Top-5 actionable gaps from the rule-stage coverage audit. End-to-end Mama's homepage smoke run on sandybrown post 30. Comprehensive — but achievable in one focused session via heavy parallel-subagent orchestration.

**Strategic premise (Bean's framing 2026-05-08):** the work splits into ~10 milestones. Each milestone has clear specs from the audit + synthesis docs. Mechanical work runs as parallel Sonnet/Cerebras subagents; main agent's role is orchestration + briefing + qc-inline after each return. This collapses what would have been 3 separate sessions into one.


## Read first (mandatory, in this order)

1. `.claude/handoff.md` — last session summary (cloning-skill-design 2026-05-07)
2. `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — **THE PRIMARY DOCUMENT.** 97 rules across 9 stages with covered/partial/gap status. Top-12 actionable gaps ranked by clone-blocking severity.
3. `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 review findings (5 critical + 4 important + 2 stretch). Defines what Option A revised actually does.
4. `.claude/reports/fingerprint-design-review-brief-2026-05-07.md` — original design brief used by reviewers; the converged 4-layer JSON shape lives here.
5. `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS section
6. `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` REVISIONS section
7. `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` — canonical 9-stage pipeline spec
8. `.claude/parking.md` — P-11 (this session) + P-12/P-13/P-14/P-15 (related items that fold in)
9. `.claude/specs/common-wp-styling-errors.md` Sections L, M, N, O, P, Q, R — defect taxonomy directly relevant to recogniser stages

## Where you are at session start

- Schemas migrated: sgs-db `patterns` extended (8 new columns + UNIQUE INDEX on fingerprint), uimax has `patterns` / `naming_conventions` / `animations` / `mood_boards` / 5 stack tables
- 3 pipeline scripts shipped: `pattern-fingerprint.py` (513 lines), `pattern-classify.py` (624 lines), `pattern-register.py` (867 lines, with idempotent migration helper baked in)
- uimax `naming_conventions` populated (16 rows: BEM/SGS/WP-Gutenberg/Tailwind/Bootstrap/MUI/Spectra/Astra/Kadence/shadcn/Lovable/v0/Bolt/OOCSS/SUIT/ACSS)
- uimax `animations` populated (63 rows; 7 gap candidates remain — 3 ready to close after Bucket 1 effects ship + 4 still flagged for new blocks/deferred)
- uimax `icon_libraries` has 12 emoji rows flagged is_emoji=1 with Rosetta Stone equivalents backfilled
- Bucket 1 effects shipped to all applicable blocks: form-focus-ring (sgs/form), ripple-on-click (all sgs/* via hover-effects extension), svg-path-draw-on-scroll (sgs/decorative-image)
- Rosetta Stone discipline embedded across 4 docs: project CLAUDE.md, sgs-wp-engine SKILL.md (Hard Rule 7), ui-ux-pro-max SKILL.md (Stage 5 INGEST HARD GATE), animation-harvest deprecation stub
- /sgs-db extended with 4 cloning subcommands (fingerprint / patterns-by-category / patterns-by-industry / patterns-by-fingerprint-prefix)
- /sgs-update populate-db.py defensively patched for `_comment_*` non-spec attributes

## Mission — 10 milestones, one session

Each milestone: ~10-25 min main-thread orchestration + qc-inline AFTER subagent return + 30-90 min parallel subagent work running in background. Total wall-time ~6-7 hours; main-thread active ~3-4 hours.

### Milestone 1 — Schema sync extensions (~40 min)

**Goal:** Close the uimax sync gap (parking P-15) + seed `block_compositions` for existing 36 patterns (parking P-12).

**Subagent dispatch (Cerebras):** write `scripts/uimax-sync-sgs-blocks.py` that:
1. Reads sgs-db `blocks` (64 rows) + `block_attributes` + `block_capabilities` + `block_supports` + `block_selectors`
2. INSERTs / UPSERTs one row per block into uimax `component_library` with `library='SGS Blocks'`, `framework='WordPress (Gutenberg)'`, `kind='block'`, summary computed from description + capability sketch
3. Scans uimax `animations.is_gap_candidate=1` rows; for each, checks if any SGS block has an attribute matching the gap (e.g. `form-focus-ring` matches `formFocusRing*` on sgs/form); writes "ready to close" report; does NOT auto-close (operator review).

**Subagent dispatch (Cerebras):** write `scripts/seed-block-compositions.py` that walks existing pattern .php files, extracts block_slugs JSON, INSERTs one row per pattern into sgs-db `block_compositions`.

**Hook into /sgs-update:** add Stage 3 + Stage 4 calls to `update-db.py` so future block changes auto-propagate.

**QC after subagent return:** /qc-inline pass on each script + verify uimax row counts (64 SGS blocks added, 36 block_compositions seeded, 3 animations ready-to-close report present).

### Milestone 2 — Layer 1+2 fingerprint catalogue + 8 base role templates (~75 min)

**Goal:** Build the fingerprint catalogue auto-fillable parts for all 64 blocks. 9 of 14 component_libraries columns fill automatically + Layer 1 envelope + Layer 2 attribute roles tagged.

**Subagent dispatches (Sonnet × 3 parallel — different files per the parallel-dispatch rule):**

Agent A — `scripts/fingerprint-builder/layer-1-envelope.py`:
- For each of 64 blocks, derive structural_signature (typed schema per critical fix 2 from review): `{tag, children_count_range, child_shape: [{tag, role, required}]}`
- Extract wrapper_classes_per_convention with **indexed token arrays** (per critical fix 1 from review — Tailwind classes split into individual matchable tokens, not space-separated string)
- Compute signature_hash with explicit canonical-form spec (per Sonnet review item)
- Output: 64 envelope JSON blobs

Agent B — `scripts/fingerprint-builder/layer-2-attribute-roles.py`:
- For each block_attribute (1,234 rows), tag with role from the 8 base roles (`wrapper`, `primary-text`, `media-slot`, `link-cta`, `responsive-spacing`, `visual-token`, `animation-behaviour`, `interactive-state`)
- Auto-routing patterns: `padding*` → responsive-spacing; `colour*` → visual-token; `*Hover*` → animation-behaviour; `formFocusRing*` → interactive-state; etc.
- Output: 1,234 role-tagged attribute entries

Agent C — `scripts/fingerprint-builder/8-role-template-drafts.py`:
- For each of 8 roles, draft per-platform extract+generate templates (per critical fix 5 — bidirectional with `search_scope` field)
- Roles × 7 platforms × 2 (extract/generate) = 112 entries. Cerebras-feasible in one shot.
- Output: role-template JSON for cross-referencing in attribute population

**QC after each return:** /qc-inline pass — verify 64 envelopes match block.json schemas, role tags match attribute name patterns, role templates have `search_scope` field on every extract entry.

### Milestone 3 — Layer 3+4 + slot overrides + 5 missing roles (~85 min)

**Goal:** Complete the 4-layer model. Layer 3 internal elements (selectively populated for composite blocks). Layer 4 inner-blocks slots (recursive references). 5 additional roles per review.

**Subagent dispatches (Sonnet × 2 parallel):**

Agent D — `scripts/fingerprint-builder/layer-3-internal-elements.py`:
- For ~15 composite/container blocks (sgs/hero, sgs/cta-section, sgs/info-box, sgs/card-grid, sgs/feature-grid, sgs/tabs, sgs/accordion, sgs/multi-button, sgs/team-member, sgs/testimonial, sgs/process-steps, sgs/timeline, sgs/gallery, sgs/post-grid, sgs/footer-mega-menu), extract internal elements from `block_selectors` table + each block's style.css scan
- Add `pairing_index` field for tabs/accordion (per Top-2 gap from audit) — Tab Header N pairs with Tab Panel N
- Output: ~50 internal-element entries with classes_per_convention + controllable_properties

Agent E — `scripts/fingerprint-builder/layer-4-inner-blocks.py`:
- Read each block.json's `allowedBlocks` declaration
- For each block with `<InnerBlocks>`, declare slot config (allowed_block_types, min_count, max_count, default_template, slot_overrides)
- Recursive references by slug — each child has its own fingerprint
- Output: ~10 inner-block slot configs

**Plus (inline by main agent):** draft 5 missing role templates per audit Top-5 gap (`layout-alignment`, `accessibility-attribute`, `data-binding`, `visibility-control`, `layout-modifier`). Each role × 7 platforms × 2 = 70 additional entries. Hand to Cerebras for INSERT generation.

**QC after returns:** /qc-inline — verify pairing_index present on tabs/accordion, slot recursion uses slug references not duplicated content, 5 new roles have working extract+generate halves.

### Milestone 4 — Critical fixes 1-5 ship (~110 min)

**Goal:** Critical fixes from the 4-model peer review applied across the catalogue.

The 5 critical fixes:
1. Tailwind classes as indexed token arrays ✓ (folded into Milestone 2 Agent A — confirm)
2. Structural signature typed schema ✓ (folded into Milestone 2 Agent A — confirm)
3. Multi-convention support per scrape — drop single-convention assumption (NEW work this milestone)
4. Hashed/minified class fallback (NEW work this milestone — heuristic_fallbacks array)
5. `search_scope` field on extract rules ✓ (folded into Milestone 2 Agent C — confirm)

**Subagent dispatches (Sonnet × 4 parallel):**

Agent F — `scripts/recogniser/per-section-convention-voter.py`: extends `/uimax-classify-naming` to detect convention per-section, not document-wide.

Agent G — `scripts/recogniser/heuristic-fallback-builder.py`: adds heuristic_fallbacks array to each fingerprint envelope — structural shape + child element tags + content hints — so recogniser degrades to structure-only matching when class names are unreadable.

Agent H — `scripts/recogniser/computed-style-passport.py` (Top-1 gap from audit): bounding-box + flex-behaviour + font-size-as-size-hint reader. Locofy/Stackbit-style spatial signature inspector. Used as corroborating signal when classes are hashed.

Agent I — verification + smoke pass: run all 4 critical-fix outputs against synthetic test inputs (one Tailwind hero, one BEM hero, one MUI-hashed hero) and confirm each fixes its target failure mode.

**QC after each return:** /qc-inline against the synthetic test inputs.

### Milestone 5 — Important fixes 6-9 + recursion guard + confidence matrix + 5th leftover bucket (~85 min)

**Goal:** Important fixes from the 4-model peer review.

The 4 important fixes:
6. 5 missing roles ✓ (folded into Milestone 3 — confirm)
7. 5th leftover bucket: "structural mismatch / orphan" (NEW work)
8. Recursion guard: max_depth=12 + visited_nodes set (NEW work)
9. Confidence scoring matrix for class collisions (NEW work)

**Subagent dispatches (Sonnet × 3 parallel):**

Agent J — `scripts/recogniser/leftover-bucket-router.py`: 5 buckets (was 4) — adds "structural mismatch / orphan" for wrappers that match but inner DOM violates signature OR unmatched content inside matched container.

Agent K — `scripts/recogniser/recursion-guard.py`: max_depth + visited_nodes Set + clean error surface on circular references.

Agent L — `scripts/recogniser/confidence-matrix.py`: weighted scoring formula per class collision. Class match (40%) + structural signature hash match (30%) + attribute extraction success rate (30%). Tie-breakers: internal element presence, child node count, parent context.

**QC after each return:** /qc-inline.

### Milestone 6 — Top-5 gap closures (~75 min)

**Goal:** Audit's Top-5 ranked gaps shipped. Top-1 (computed-style passport) already done in Milestone 4 Agent H — confirms. Top-2/3 done in Milestones 3+4 — confirms. Top-4 (recognition_log + operator UI) and Top-5 (5 missing roles, done in Milestone 3) — confirm.

The remaining genuine new work this milestone: the **`recognition_log` table + operator-review UI** (Top-4).

**Subagent dispatches (Sonnet × 2 parallel):**

Agent M — `scripts/migrations/uimax-recognition-log-2026-05-XX.sql` + Python wrapper: new uimax `recognition_log` table holding leftover-bucket entries with `clone_run_id`, `bucket_type`, `selector`, `surrounding_dom`, `frequency`, `severity`, `proposed_action`. Plus a small `simple_html_review_report.py` that generates a one-page operator-review report after each scrape.

Agent N — validator on uimax writes (parking P-13): pre-write hook on /uimax-* commands that rejects rows missing equivalent_implementations.sgs_block (or null+gap-flag) AND rejects any licensing-related keywords per blub.db row 211.

**QC after returns:** /qc-inline.

### Milestone 7 — `/sgs-clone` skill body + 5 sibling commands via /lifecycle (~75 min)

**Goal:** Build the actual skill files via /lifecycle Mode A (skill-writer auto-invoked). Each skill has Hard Rules + scientific-method 9 stages + Invoked Skills + System Effect 6-lens + Common Mistakes + cross-references to the audit doc.

**Sequential (NOT parallel — /lifecycle Mode A blocks):**
1. `/sgs-clone` (orchestrator) — invokes the 9 pipeline stages
2. `/uimax-scrape` (DB activity)
3. `/uimax-sgs-scrape-pattern` (DB activity)
4. `/uimax-mood-board` (DB activity)
5. `/uimax-scrape-animation` (DB activity, replaces deprecated /animation-harvest)
6. `/uimax-classify-naming` (DB activity)

For each: /lifecycle Mode A → skill-writer Stage 2 → gap-analysis Stage 3 → fix-loop until ≥B grade with all selected gaps closed → record before/after grades.

Embed the no-licensing rule + Rosetta Stone discipline at creation (per Bean 2026-05-06 confirmation).

### Milestone 8 — Mama's hero smoke run (~45 min)

**Goal:** First real validation. Run `/sgs-clone` against `sites/mamas-munches/mockups/homepage/` capturing only the hero section (not full page yet). Compare output to existing manual hero PoC at sandybrown post 29. Identify divergences.

**Tooling:** Playwright MCP for capture + multi-frame-qa for first-paint + mockup-parity-validator for diff + screenshot-diff-helper for pixel evidence.

**Success criteria:** ≥80% pattern fidelity on hero section. Leftover-bucket entries surfaced for review. Recognition_log populated with ≥1 entry.

### Milestone 9 — Full Mama's homepage smoke (~60 min)

**Goal:** Run `/sgs-clone` against the full Mama's homepage. Deploy to sandybrown post 30 (NOT 29 — preserve hero PoC). Run multi-frame capture + parity validator + screenshot diff at 3 breakpoints.

**Verify against audit success criteria:**
- Every section has a corresponding pattern artefact registered
- Every captured rule from `.claude/mistakes.md` has structural enforcement (audit Top-12 gaps still open are documented but not blocking)
- `mockup-parity-validator.js` passes (all flagged Q1-Q4 deltas have screenshot-diff evidence per Hard Rule 10)
- Page renders without first-paint defects (multi-frame capture clean)
- Recognition_log captures every leftover

**If ≥85% pattern fidelity:** session success. Document residual leftovers as parking entries.

**If <85%:** identify which Top-12 gap is the biggest blocker; fold the fix into a follow-up parking entry; surface honestly to Bean.

### Milestone 10 — `/handoff` (~15 min)

**Goal:** Write the session handoff. Update state.md. Record blub.db corrections for any rules that fired during the session. Close.

## Skills + tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout — central authority for SGS WordPress work |
| `/lifecycle` | Milestone 7 — skill creation |
| `/qc-inline` | After each milestone — Bean's standing rule |
| `/dispatching-parallel-agents` | Milestones 1-6 — every parallel subagent burst |
| `/subagent-prompt` | Each subagent dispatch needs a tight cold prompt |
| `/delegate` | Pick model per dispatch (Cerebras for mechanical INSERT generation, Sonnet for script writing, Gemini Pro for design judgement, Opus for orchestration) |
| `/visual-qa` | Milestones 8-9 — full 9-layer QA pipeline |
| `/handoff` | Milestone 10 |

| Tool | Use |
|---|---|
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | Query SGS DB; the new fingerprint subcommands shipped 2026-05-07 |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>"` | Query uimax DB |
| `node tools/multi-frame-qa/capture.js` | First-paint capture |
| `node scripts/mockup-parity-validator.js` | Computed-style diff with Q1-Q4 flag + Section R measurement |
| `node scripts/screenshot-diff-helper.js` | **Mandatory before reducing classifier severity (Hard Rule 10)** |
| `node scripts/global-styles-reset.js` | Variation deploy |
| `node scripts/wp-update-block-attrs.js` | Apply block attributes |
| `python scripts/brand-palette-sampler.py` | Validate every client's brand source |
| `python ~/.claude/hooks/wp-pattern-gen.py` | Pattern writer — extend for cloning |
| `node scripts/css-pattern-audit.js` | Background-shorthand audit |
| Playwright MCP | Browser automation for Milestones 8-9 |
| SSH `u945238940@141.136.39.73:65002` | Server access — palestine-lives.org / sandybrown |

## Constraints

- **Use Opus for orchestration; dispatch Sonnet/Cerebras subagents for mechanical work** — main-thread Opus reasons + briefs + qc; subagents execute
- **Bake every captured rule structurally** — text-only counts as a known gap, not a pass
- **Time-estimate default LOW** — quote the smallest plausible figure; recover from being too low rather than padding upward
- **Pre-commit STOP GATE will catch any block-src commit without a passing visual-diff report**
- **wp_global_styles reset+reapply mandatory after any variation change**
- **Never dismiss a parity-validator delta as "structural noise" without screenshot-diff evidence** (Hard Rule 10)
- **Patterns are per CLASS, not per CLONE** (Hard Rule 6)
- **Rosetta Stone discipline** (Hard Rule 7) — every uimax write carries equivalent_implementations or flags the gap
- **No licensing language** (blub.db row 211) — source taxonomy is `idea` / `draft` / `<URL>` only
- **Honest scope check at each milestone** — if a milestone overruns by >50%, surface to Bean before pressing through

## Success criteria

1. All 4 fingerprint layers populated for all 64 blocks (Layers 1+2 fully, Layer 3 for ~15 composite blocks, Layer 4 for ~10 container blocks)
2. All 9 critical+important review fixes applied
3. All Top-5 audit gaps closed
4. `recognition_log` table live + operator-review report generator working
5. `/sgs-clone` + 5 sibling commands shipped via `/lifecycle` Mode A with ≥B grade
6. Mama's homepage cloned to sandybrown post 30 with ≥85% pattern fidelity
7. All leftovers surfaced in recognition_log + reviewed by operator + parking entries written for any residual genuine gaps
8. uimax sync gap closed (parking P-15 — `/sgs-update` Stage 3+4 active)
9. No-licensing + Rosetta Stone validators on uimax writes (parking P-13)
10. `/handoff` written; session closes with /sgs-clone genuinely usable on next client clone

## Why this matters

This session ships the cloning skill end-to-end. After it runs, Bean has a working `/sgs-clone` that can take any HTML draft and produce a deployable SGS WordPress site at ≥85% pattern fidelity, with the remaining 15% surfaced for review. Every future client clone benefits from the catalogue compounding — pattern library grows; uimax intelligence grows; recognition_log identifies new patterns to add over time. The framework moves from "manual mockup-to-blocks" to "deterministic mockup-to-blocks with intelligence layer for novelty." Strategic differentiator that compounds with every project.

Sessions B and C from the original 3-session plan no longer needed — the comprehensive milestone structure folds them in via subagent orchestration.
