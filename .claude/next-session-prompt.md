recommended_model: opus
session_tag: small-giants-wp-2026-05-06-cloning-skill-design

Invoke `/autopilot` before doing anything else.

You are running a **dedicated cloning-pipeline design session on Opus**. Mission: design and build a new independent SGS cloning skill **scoped to HTML drafts → WP only** (Use Case 3). Other use cases — Use Case 1 (LLM design generation) and Use Case 2 (competitor harvest) — are explicitly out of scope until UC3 hits 100% on first try. "100%" excludes irrelevant BS gaps that don't change real outcomes.

QA work is OUT of scope. The session AFTER this one is the QA session.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-06-cloning-skill-design"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (Waves 1-5 closed; everything still on `main`)
2. `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` — **READ THE TOP "REVISIONS" SECTION FIRST** (the v1 below is superseded)
3. `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` — **READ THE TOP "REVISIONS" SECTION FIRST** (the v1 below is superseded)
4. `.claude/mistakes.md` top sections — captured rules the pipeline must enforce structurally
5. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — pattern-not-block rule (row 209) + every behavioural rule
6. `.claude/specs/common-wp-styling-errors.md` — Sections M, N, O, P, Q, R defect taxonomy

## Where you are

- Branch: `main`, Wave 1-5 work pushed
- Hero PoC live on sandybrown post 29
- Hero block + 7 other blocks (info-box, card-grid, testimonial, decorative-image, brand-strip, certification-bar, gallery, team-member, cta-section) migrated to unified `*Media` slot pattern via shared `MediaPicker` + `sgs_render_media()` — webpack build clean
- 2 blocks NO-OP (feature-grid is a pure container; process-steps is text-only)
- `sgs-wp-engine` skill A 95% / B 3.73 (rubric confirmed)
- `visual-qa` skill A- 95% / B 4.30 (Lens 6 cap until QA session)
- LiteSpeed plugin gone from both test sites
- Hostinger MCP loaded; plugin/theme deploy RED (no excludes filter, keep tar+scp)
- Pre-commit STOP GATE verified parsing `verdict: PASS` + `first_paint_capture_passed: true`
- Pattern-not-block rule embedded in sgs-wp-engine Hard Rule 6 (blub.db row 209)

## Bean's 5 corrections that drove this session's scope

1. **uimax extends existing tables** (`block-pattern`, `component`, `colour-palette`, `wcag-friendly`, `icons`) — NOT a new instance table. Add categories: industry / mood / style. Add platforms: PHP / HTML / CSS / WP / Tailwind / Bootstrap / Astro / Next.js / etc. (uimax doesn't currently cover the SGS stack but covers plenty of others.)
2. **sgs-db single table, fingerprint is the headline column.** No licensing column ("absurdly stupid — you can't license a web design"). `source` column = `idea` / `draft` / competitor URL string only.
3. **HTML drafts only, first.** Don't dilute on UC1 (LLM design gen) or UC2 (competitor harvest).
4. **`block_compositions` (0 rows) and `wp-pattern-gen.py` are good starts** — extend, don't replace.
5. **Don't use `/sgs-update` for dedup queries** — its sole role is updating. Use `/sgs-db` (extended subcommand) or a new script.

## Open questions Bean must answer at session start (3 total — down from 8)

**Q1 — Skill name?** Options: `/clone`, `/site-clone`, `/sgs-clone`, `/draft-to-wp` (since UC3 is the only mode), or keep `/build-website` slug and overwrite the body.

**Q2 — Pattern registration scope?** Every clone auto-registers, OR draft → human-confirm → register batch-promote?

**Q3 — uimax existing schema confirmation.** At session start, run `.schema` on the actual uimax DB and confirm exactly which tables get the new industry / mood / style / platform columns. Bean's recall covered block-pattern / component / colour-palette / wcag-friendly / icons — verify others.

(Q4-Q8 from the prior version of this prompt are deferred — LLM design gen, Hostinger MCP scope, IP wall, Layer 2 risk, commit policy. None apply until UC3 lands.)

## Tasks (after Q1-Q3 are answered)

### Task 1 — `/lifecycle` Mode A on the new skill

- Set lifecycle session state with target = `~/.claude/skills/<skill-name>/SKILL.md`
- Stage 1: Read every source mentioned above (specs, mistakes, MEMORY.md, common-wp-styling-errors)
- Stage 2: Invoke `skill-writer` to draft the new SKILL.md based on the salvage matrix REVISIONS section + Bean's Q1-Q3 answers
- Stage 3: Run `gap-analysis` — Lens 6 will fire because no rubric exists → draft inline (matches sgs-wp-engine precedent) OR invoke `/rubric-writer`
- Stage 4-5: Fix-loop until score ≥ B with all selected gaps closed
- Stage 6: Done — record before/after grades

### Task 2 — Schema additions (simplified)

#### `sgs-db` patterns table (single table, fingerprint-keyed)

Create `scripts/migrations/sgs-db-cloning-2026-05-06.sql`. Add columns to existing `patterns` table:

| Column | Type | Notes |
|---|---|---|
| `category` | TEXT | hero / footer / trust-bar / FAQ / contact / pricing-table / etc. |
| `industry` | TEXT | food / healthcare / retail / etc. |
| `mood` | TEXT | warm-friendly / premium-minimal / etc. |
| `style` | TEXT | classic / modern / brutalist / etc. |
| `content_shape` | TEXT | single-column / split / grid / carousel / accordion / tabs |
| `fingerprint` | TEXT NOT NULL UNIQUE | **the dedup key** |
| `source` | TEXT | `idea` / `draft` / `<competitor URL>` (later) |
| `block_composition` | JSON | which SGS blocks the pattern is built from |
| `file_path` | TEXT | `plugins/sgs-blocks/patterns/<slug>/` |
| `parent_pattern_id` | INTEGER FK NULL | for variants |
| `perceptual_hash` | TEXT NULL | populated for later, not yet a decision input |

Resurrect `block_compositions` (currently 0 rows) — confirm its existing schema is suitable; the cloning pipeline becomes its first writer.

#### uimax extensions

Create `scripts/migrations/uimax-cloning-2026-05-06.sql`. After confirming the actual uimax schema (Q3), add to every classifiable existing table:
- `industry`, `mood`, `style` (open enum text columns)
- `platform` / `language` (or join to a new `platforms` table covering PHP / HTML / CSS / JS / WordPress / Tailwind / Bootstrap / Astro / Next.js / Eleventy / Hugo / etc.)

Backfill existing 5,598 rows with sensible defaults — LLM-classified with operator confirmation.

### Task 3 — Three new scripts

Build in parallel via `/subagent-driven-development` or `/dispatching-parallel-agents`:

1. **`scripts/pattern-fingerprint.py`** — given pattern HTML + CSS, produces `fingerprint = sha256(normalised_html + sorted_css_var_dump)`. `normalised_html` strips whitespace, sorts attribute order, lowercases tags, drops comments + content text. Optional: emit perceptual hash too (column exists for later use).
2. **`scripts/pattern-classify.py`** — given a pattern artefact + extracted styles, runs the simplified classification: auto-derive `content_shape` from DOM structure (deterministic); LLM-suggest `category` + `industry` + `mood` + `style` with operator confirmation gate.
3. **`scripts/pattern-register.py`** — given a passed-dedup classified pattern, runs the 6-step registration:
   1. Compute fingerprint
   2. SQL `SELECT id FROM patterns WHERE fingerprint = ?` — if hit, log "duplicate of pattern N" and exit
   3. Auto-derive `content_shape` + `block_composition`
   4. LLM-suggest classification; operator confirms
   5. Write pattern files via extended `wp-pattern-gen.py` to `plugins/sgs-blocks/patterns/<slug>/` + `pattern.meta.json` sidecar
   6. INSERT into `patterns` + linked rows into `block_compositions`. Then call `/sgs-update` to refresh DB scan.

### Task 4 — `/sgs-db` extension subcommands

Extend `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` with:
- `fingerprint <hash>` — returns matching pattern row or "no match"
- `patterns-by-category <name>` — list patterns
- `patterns-by-industry <name>` — list patterns
- `patterns-by-fingerprint-prefix <prefix>` — fuzzy lookup for variant detection

### Task 5 — UC3 smoke run

Take Mama's Munches HTML mockup folder → full clone pipeline → live URL on **sandybrown post 30** (NOT 29 — keep hero PoC intact).

Verify:
- Every section in the mockup has a corresponding pattern artefact registered
- Every captured rule from `.claude/mistakes.md` has a structural enforcement point (text-only enforcement = known gap)
- `mockup-parity-validator.js` passes (all flagged Q1-Q4 deltas have `screenshot-diff-helper.js` evidence per Hard Rule 10)
- Page renders without first-paint defects (multi-frame capture clean)

### Task 6 — Handoff for QA-focused session

Once cloning skill is built and UC3 smoke-tested, write `/handoff` for the QA-focused session that picks up:
- visual-qa rubric drafting (lifts the C-cap)
- Full-page autonomy worked example for sgs-wp-engine
- Recurrence-rate tracker
- Automated screenshot-helper integration test
- Chrome DevTools MCP wiring (3 new scripts already speced)
- Body progressive disclosure for sgs-wp-engine (430 → <300 lines)

## Success criteria

1. New cloning skill exists with confirmed `bean_signoff: confirmed` rubric
2. Skillscore ≥ 90% A
3. Gap-analysis B grade or above
4. UC3 smoke run produces a deployed Mama's homepage at pattern fidelity on sandybrown post 30
5. sgs-db schema migration applied; fingerprint column populated for at least 5 patterns
6. uimax classification columns added to existing tables; 10+ rows reclassified as proof
7. Three new scripts (fingerprint, classify, register) shipped + smoke-tested
8. `/sgs-db` extended with fingerprint subcommand; verified working
9. The 13+ captured rules from `.claude/mistakes.md` all have structural enforcement points in the new skill
10. `/handoff` for QA-focused session-after-this saved to `.claude/next-session-prompt.md`

## Skills + tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout |
| `/lifecycle` | Task 1 |
| `skill-writer` | Auto-invoked by /lifecycle Stage 2 |
| `gap-analysis` | Auto-invoked by /lifecycle Stage 3 |
| `rubric-writer` | Lens 6 trigger |
| `/subagent-driven-development` | Tasks 2-4 — parallel mechanical work |
| `/dispatching-parallel-agents` | Task 3 — three independent script builds |
| `/wp-block-development` | Sub-skill if any block-level work needed |
| `/visual-qa` | DO NOT invoke this session — declare as future Invoked Skill in the new SKILL.md |

| Tool | Use |
|---|---|
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | Query SGS DB |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "query"` | Query uimax DB |
| `node tools/multi-frame-qa/capture.js` | First-paint capture |
| `node scripts/mockup-parity-validator.js` | Computed-style diff with Q1-Q4 flag |
| `node scripts/screenshot-diff-helper.js` | **Mandatory before reducing classifier severity (Hard Rule 10)** |
| `node scripts/global-styles-reset.js` | Variation deploy |
| `node scripts/wp-update-block-attrs.js` | Apply block attributes |
| `python scripts/brand-palette-sampler.py` | Validate every client's brand source |
| `python ~/.claude/hooks/wp-pattern-gen.py` | Existing pattern writer — extend for cloning |
| Playwright MCP | Browser automation |
| SSH `u945238940@141.136.39.73:65002` | Server access |
| Hostinger MCP `hosting_listWebsitesV1` | Read-only verify deploy targets |

## Constraints

- **Use Opus for orchestration; dispatch Sonnet subagents for mechanical work**
- **Bake every captured rule structurally** — text-only counts as a known gap, not a pass
- **Time-estimate default LOW**
- **Only HTML drafts** — UC1 + UC2 are deferred. Don't build for them.
- **Pre-commit STOP GATE will catch any block-src commit without a passing visual-diff report**
- **wp_global_styles reset+reapply mandatory after any variation change**
- **Never dismiss a parity-validator delta as "structural noise" without screenshot-diff evidence** (Hard Rule 10 binding from previous session)
- **Patterns are per CLASS, not per CLONE** — Hard Rule 6. The recogniser operates at pattern boundaries; single-block emission is the inner step.

## Why this matters

Bean is launching a business. The hero PoC took 3 days because the SGS team didn't yet have a coherent cloning pipeline. The previous session built every component AND migrated 9 blocks to the unified media-slot pattern. This session puts everything together for HTML drafts. With UC3 at 100% on first try, every future client mockup → live URL hits 30 min (single page) or under 1 hour (full website). The pattern library compounds — every clone makes the next clone faster. UC1 (LLM design gen) and UC2 (competitor harvest) come later; they extend a working UC3 rather than diluting its first-try-quality target.
