# SGS WordPress Framework — Claude Code Instructions

## ⛔ NON-NEGOTIABLE RULES + SUCCESS (gate every session)

**SUCCESS DEFINITION:**
SGS is an AI website-builder. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE WordPress SGS blocks (driven by block attributes), faithful to the draft on the real homepage, with zero cheats. Long-term: ship the framework + client builds with Bean as QC only.

**THE 7 RULES — violation condition shown for each:**

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. *(CHEAT PURGED: `sourceMode='bound'` on cloned trust-bars was purged D182 2026-06-06 — trust-bar now clones to native typed attrs + icon resolver. ONLY the live WC configurator `sourceMode='wc-product'`/`'sgs-cpt'` is legitimate.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier/per-kind exception without universal justification to change the condition itself. *(Violation: "except for X block" or "only for section-kind".)*
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. *(Violation: a draft class silently absent from emitted markup and not listed as skipped.)*
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style vs the draft's real values. *(Violation: closing a task on assertion output, a test page, or the emit alone without opening the real homepage.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline CSS beats `@media` and kills responsiveness. *(Violation: a converter emit that writes a responsive value as `style="..."` rather than to a block attribute.)*
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) + get Bean's approval before building. *(Violation: shipping a shared-mechanism change without a pre-build design-gate.)*

Full rationale: `.claude/reports/2026-06-06-doc-council-findings.md`.

---

## What this is

A custom WordPress block framework built by Claude Code: theme + blocks plugin (with forms) + booking plugin + client-notes plugin. Competes with Kadence / Spectra / GenerateBlocks. Used to deliver 5 priority client builds with Bean as QC only.

## Active focus — container/wrapper standardisation (cloning pipeline)

**The primary architectural goal (stable).** The cloning pipeline must faithfully transfer CSS from any draft section, and every composite block with a built-in wrapper must MIRROR `sgs/container` — no per-block divergence, auto-propagated when the container gains a capability. **Scope is universal:** every wrapper at any nesting depth, every `sgs/container` instance, every composite (KINDs section/layout/content), and a property's *absence* (no `max-width` → full-width, overriding the theme default).

> **Live status is single-sourced — do NOT track shipped-status / D-numbers / counts here (they drift; the F1/F2 doc-staleness on 2026-06-03 was exactly this).** For "what's shipped vs pending, current step, D-ceiling, blockers" read **`.claude/LEDGER.md`** (the one living status; structural defences in `.claude/STOP-CATALOGUE.md`). Decisions → `.claude/decisions.md`. Parked work → `.claude/parking.md`.

- **Canonical spec:** [Spec 31 §13.6 / FR-31-21](.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md) — the universal wrapper-conversion procedure + 3-layer model (OUTER / CONTENT-WIDTH / PER-GRID-ITEM) + composite-mirror rule.
- **Converter-completion plan (ARCHIVED — historical):** [`.claude/plans/archive/2026-07-04-new-engine-to-parity-delete-converter-v2.md`](.claude/plans/archive/2026-07-04-new-engine-to-parity-delete-converter-v2.md) — the converter completion plan — EXECUTED IN FULL (D276, 2026-07-05: Steps 3-16 + Gates A/B/C shipped; frozen engine deleted). Now historical; the live front = the post-programme QC session (LEDGER.md).
- **Previous plans (archived context):** all pre-2026-07 plan/design docs (W3 phase-plan, clone-fix build-plan + 55-issue sign-off ledger, stage designs) moved to [`.claude/plans/archive/`](.claude/plans/archive/) on 2026-07-04; open residuals captured in `parking.md` (`P-W3-ARCHIVE-RESIDUALS`).

## Binding rules (Spec 31 §13.1 R-31-1 through R-31-15; gate every commit)

<!-- NOTE: R-* (binding rules) and FR-* (functional requirements) are SEPARATE numbering series — FR-31-15 (capability-aware BEM tiebreaking, D96) and R-31-15 (the anti-mirror gate) are NOT a collision. R-31-15 = "no mirror emit": the cloning pipeline's anti-cheat rule, enforced via plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py (--report now, flips to --enforce when the converter stops cheating). See Spec 22 §FR-31-11 PASS-test + next-session-prompt.md. The 14 headlines below predate R-31-15; it is the 15th. -->


Full text in Spec 31 §13.1. Headlines:

1. **DB-first, no hardcoded dicts (R-31-1)** — All lookups via DB tables; `SKIP_TOP_LEVEL_TAGS` is the only permitted constant (3 entries: header/footer/nav). Tier C role-to-block derived from existing `slot_synonyms.role + standalone_block` data.
2. **BEM is the only recognition signal (R-31-2 / Spec 00 §3.1)** — HTML tag is rendering-shape only.
3. **Three permitted walker exceptions, no others (R-31-3)** — atomic-tag swap / chrome-skip at top level / top-level container wrap. Adding a 4th requires spec amendment.
4. **Aggregate scores are per-commit diagnostics, never the closing gate (R-31-4)** — Stage 11.6 computed-parity is the per-commit diagnostic (the old Stage-11 pixel-diff was PURGED 2026-07-04, `220cb28a`); fidelity closes only via §7b computed-style-vs-draft + Bean's eye (R-31-13).
5. **Phases never ship as single commits (R-31-5)** — Phase 1 walker rewrite splits into 5 commits.
6. **Output-only inference is a trap (R-31-6)** — verify mockup HTML + extract.json + live DOM at each milestone.
7. **Council fix-shapes are hypotheses, not specs (R-31-7)** — multi-rater proposals require empirical pre/post measurement.
8. **Schema enumeration before "missing X" (R-31-8)** — query `sgs-framework.db` via `/sgs-db` first.
9. **Universal mechanisms, no per-block hyperfocus (R-31-9)** — every fix passes "does this apply to ALL SGS blocks?" (the live block count is DB-authoritative — query `/sgs-db` or `/wp-blocks`; never hardcode it here).
10. **Read full spec before proposing fix-shape (R-31-10)** — state architectural primitive in plain English first.
11. **Verify rendered output, not internal metrics (R-31-11)** — live Playwright DOM is canonical.
12. **QC gates are structural, not prompt (R-31-12)** — `pipeline-stage-gate.py` hook enforces /qc-council.
13. **Bean visual sign-off is co-authoritative (R-31-13)** — script measurement + Bean's eye + visual cropped-pair BOTH consulted; numbers alone don't close, eye alone doesn't close.
14. **FR-31-6 migrations never carry server-side legacy fallback hacks (R-31-14)** — added 2026-05-27 per D92. The hybrid render.php problem is exclusively SGS framework debt (zero core blocks on Phase 0.4 roster). Never add `if (empty($content) && !empty($legacy_attr)) { ...legacy scalar render... }` to a migrated render.php. Canonical backwards-compat: full FR-31-6 hybrid-block roster migration (the roster is DB/report-derived — query `/sgs-db`; do not hardcode a count) + WP-CLI batch existing-post migration via deprecated.js. Bean P1 locked.

Sibling rules: blub.db 254 (read leftover-buckets first), 255 (multi-model /qc per converter commit), 256 (per-section cropped pixel-diff), 260 (db-first-no-hardcoded-dicts), 272 (schema enumeration before "missing X"), 276 (council fix-shapes are HYPOTHESES not specs), 281 (qc gate must be structural), 288 (phases never ship as single commits).

## Root-cause methodology (MANDATORY — no assumptions, evidence-first; gate EVERY diagnosis + fix)

This is the core working method for this project. It is non-negotiable and overrides any urge to move fast by guessing. Demonstrated + locked 2026-05-31 (D117/D118).

**Never assume, never reason from probability, never trust a claim** — yours, a subagent's, a doc's, or a metric's — without verifying it against real ground truth. Before proposing OR acting on any fix:

1. **Find the ROOT CAUSE first.** Read the actual evidence — do NOT pattern-match or theorise. Analyse ALL the logs + debug data (Spec 20/21 artefacts: `trace.jsonl`, `extract.json`, `leftover-buckets.json`, `stage-N.json`, `stage-11-pixel-diff.json`, computed CSS, render.php, `/wp-blocks schema`) BEFORE proposing a solution.
2. **Classify the layer:** is it an IMPLEMENTATION bug, or a GAP/FLAW in the spec/plan? Fix the right layer — patching code around a spec gap is a trap.
3. **Verify every dependency the theory rests on:** DB table data (`/sgs-db`, `/wp-blocks`), the block's ACTUAL functionality (e.g. does `sgs/container` really have a grid engine / the attrs you assume?), the pipeline spec (what it is SUPPOSED to do — Spec 31 + flow + stages), the truth-spec (`sites/<client>/mockups/.../TRUTH-SPEC.md` — does the fix hold for ALL relevant instances across the page, not just one?).
4. **Pixel-diff is misleading — verify the LIVE DOM (R-31-11), not the number.** An EMPTY section scores a false WIN (matches background); a REFLOWED-to-correct section scores a false LOSS. Use Playwright `el.innerText.length` + element-layout checks as the gate, never the pixel-diff alone. (Memory `empty-section-false-pixel-diff-win`.)
4a. **PARITY/FIDELITY = compare EFFECTIVE (computed) values on the actual rendered element, matched by CONTENT — never source-declaration-diff, never wrapper-class-keying (Bean-locked 2026-07-03).** Two failure modes proven this session, both giving unreliable scores Bean can't depend on: (a) **source-declaration-diff is blind to INHERITED values** — comparing the draft's authored CSS rules to the clone's `<style>` blocks MISSES the brand-quote 16px→18px drop because that `<p>` has no explicit font-size (it inherits the base; draft base 16px vs clone theme base 18px, and the theme base lives in a global stylesheet not in the block-scoped snapshot). (b) **wrapper-class-keying misclassifies** — comparing computed styles keyed by BEM class compares the draft's raw `<section>` against the clone's block WRAPPER (which adds its own flex/padding/gap), drowning real diffs in false positives. The dependable method: `getComputedStyle` on each rendered element, keyed by its normalised TEXT CONTENT (text is ~96% present), so you compare the same painted node and catch inherited + explicit. This is a specific extension of the global `measurement-vs-eye` rule. **This is now a BUILT system component (D259, 2026-07-03): `plugins/sgs-blocks/scripts/parity/computed-parity.js` — universal/draft-agnostic (all computed props minus a documented blocklist verified vs `property_suffixes`), 3-tier (content presence / typography / box-layout), meaningful-only scoring. It runs AUTOMATICALLY as pipeline Stage 11.6 (`sgs-clone-orchestrator.py`, post-deploy, comparing `--mockup` vs the live clone; opt-out `--no-computed-parity`) → `computed-parity.json`. USE IT — do not hand-roll a fresh comparison, and do NOT trust the pipeline's input-side drop-logs (`attribute_gap_candidates` cumulative ledger, `leftover-buckets.json`) as a per-clone rendered-fidelity signal.**
5. **Attest with evidence, twice** (`/verify-loop`): every load-bearing claim needs ≥2 independent evidence sources (e.g. emitted markup + live DOM). Never delegate the proof step for unproven work — open the live page yourself.
6. **Roll back fast on regression (STOP #19);** refine across a session boundary with the empirical evidence baked into the plan — don't iterate a failing sensitive fix inline under context pressure.

**Tools for this method (use the right one; don't hand-roll):** `/systematic-debugging` (root-cause gate), `/qc-council` (multi-rater validate fix-shapes from the FULL logs + code — converged-evidence beats single-model), `/verify-loop` (2-attestation), `/diagnostics` + `/lint` (static checks), `/subagent-driven-development` + `/dispatching-parallel-agents` (orchestrate independent work), `/brainstorming` (design before build), `/library-docs` (gold-standard reference), `/wp-blocks` + `/sgs-db` + `/sgs-wp-engine` + `/sgs-clone` (SGS ground truth — for a composite VARIANT's grid/structure, query `variant_slots` + `blocks.variant_attr` via `/sgs-db` BEFORE reasoning, never guess from attrs), `/goals` (re-anchor), the `code-reviewer` + `wp-sgs-developer` agents (when registered + relevant). Captured: `feedback_read_ground_truth_before_concluding`, `feedback_qc_council_cross_family_triangulation_finds_bugs`, `empty-section-false-pixel-diff-win`, `feedback_ground_in_variant_db_for_variant_block_setups`.

## Repository structure

```
small-giants-wp/
├── theme/sgs-theme/          # Block theme (own CLAUDE.md). styles/ is empty — per-client snapshots at sites/<client>/theme-snapshot.json
├── plugins/
│   ├── sgs-blocks/           # Gutenberg blocks + forms (own CLAUDE.md)
│   ├── sgs-booking/          # Appointment + event booking (own CLAUDE.md)
│   └── sgs-client-notes/     # Visual annotation system (own CLAUDE.md)
├── sites/<client>/           # Client mockups + content + theme-snapshot.json
│                             #   (own CLAUDE.md — e.g. sites/indus-foods/CLAUDE.md for that client's design context)
├── .claude/                  # Working area — plans/, specs/, decisions.md, parking.md, reports/
└── CLAUDE.md                 # This file
```

Each sub-project + each client site has its own CLAUDE.md. Read the relevant one when working on that component or client.

## Canonical pointers

| Doc | What |
|---|---|
| [`.claude/reports/2026-05-25-qc-council-issue-register.md`](.claude/reports/2026-05-25-qc-council-issue-register.md) | THE current cloning-pipeline register (~110 items, Sections A-R) |
| [`.claude/plans/archive/2026-07-04-new-engine-to-parity-delete-converter-v2.md`](.claude/plans/archive/2026-07-04-new-engine-to-parity-delete-converter-v2.md) | **Converter completion plan — EXECUTED IN FULL (D276, 2026-07-05); historical. Live front = the post-programme QC (LEDGER.md)** |
| [`.claude/plans/archive/`](.claude/plans/archive/) | All superseded plans/designs (W3 phase-plan, clone-fix build-plan + sign-off ledger, stage designs — archived 2026-07-04; residuals → parking `P-W3-ARCHIVE-RESIDUALS`) |
| [`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`](.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md) §13 | Absorbed Spec 22 (merged D253): single-recursive walker (FR-31-3), content fork (FR-31-2), sgs/container default (FR-31-4), binding rules R-31-1..15. |
| [`.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`](.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md) | Draft global-styles extractor — the OPENING step of the whole cloning pipeline, runs before Stage 0 / any block conversion. Measures the draft's rendered computed styles and generates `sites/<client>/theme-snapshot.json`, which the converter's colour token-snap (Spec 31 §3.A step 6) depends on. FR-33-12 fails the run closed if the snapshot wasn't generated/validated for the current draft. |
| [`.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`](.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md) | **Canonical clone-fidelity measurement spec (computed-parity tool + Stage 11.6 + rule 4a).** Replaced Spec 20 (log surfacing) + Spec 21 (artefact inventory), both archived to `memory/specs-archive/` — the input-side logs are debug-only, NOT the fidelity signal. |
| [`.claude/cloning-pipeline-flow.md`](.claude/cloning-pipeline-flow.md) + [`-stages.md`](.claude/cloning-pipeline-stages.md) | Stage map + per-stage detail |
| [`.claude/dev-setup.md`](.claude/dev-setup.md) | Build / deploy / SSH / local environment / gotchas |
| [`.claude/decisions.md`](.claude/decisions.md) | D-numbered architectural log |
| [`.claude/parking.md`](.claude/parking.md) | OPEN deferred work (6 taxonomy buckets) |
| [`.claude/goals.md`](.claude/goals.md) | Active near-term + long-term goals |

## Naming convention

Full rules: [`.claude/specs/00-naming-conventions.md`](.claude/specs/00-naming-conventions.md). CI linter: `python scripts/lint-naming-conventions.py`.

- Theme `sgs-theme`; plugins `sgs-blocks` / `sgs-booking` / `sgs-client-notes`
- PHP namespace `SGS\Theme` / `SGS\Blocks` / `SGS\Booking` / `SGS\ClientNotes`; text domains match plugin/theme slugs; hook prefix `sgs_`
- CSS `.sgs-` prefix; BEM: `.sgs-<block>__<element>--<modifier>` (hyphens only)
- Block namespace `sgs/block-name`; pattern slugs `sgs/<role>` (framework) or `sgs/<role>-<client-slug>` (client)
- `wp_options` keys `sgs_*`; post-meta `_sgs_*` (private) / `sgs_*` (public)

## Agent + skill delegation (MANDATORY)

| Work | Route to |
|---|---|
| Heavy WP build (pages, templates, blocks, plugins, migrations, fidelity) | `wp-sgs-developer` agent |
| SGS block / theme / client-site build or fix (the framework skill) | `/sgs-wp-engine` (+ `/wp-block-development` for core-WP block-API questions) |
| **Deploy theme/plugin** | **`build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) — ceremony + gates via `/wp-sgs-deploy`. NEVER hand-roll tar/scp (D336: 2 client sites, ~2.5h down).** |
| Per-client tokens / brand colours | `sites/<client>/theme-snapshot.json` (Spec 33) → `push-theme-snapshot.py` |
| Visual / a11y verification of a built page | `/visual-qa` (9-layer SGS pipeline) + `/a11y-audit`; Playwright MCP for bespoke probes |
| Clone fidelity — is it faithful? | Spec 20 computed-parity (Stage 11.6, auto) **+ Bean's eye (R-31-13)**. Never close on a number alone |
| Skill / agent / pipeline / router lifecycle | `/lifecycle` |
| Cloning pipeline work | `/sgs-clone` + register the result via `/sgs-update` |
| Doc edits | `docscore-on-doc-edit` PostToolUse hook auto-runs |
| Model picking per task | `/delegate` (Haiku mechanical / Sonnet architectural / cross-TIER cold-Claude validation — all-Claude fleet since 2026-07-15) |
| Multi-rater code-review before commit on converter/pipeline/SGS-block | `/qc-council` (per blub.db 255) |
| Per-file checks inline | `/qc-inline` |
| Parallel work across disjoint files | `/dispatching-parallel-agents` |
| Implementer + 2 reviewers pattern | `/subagent-driven-development` |
| Cold prompts | `/subagent-prompt` (embed dispatch bindings A/B/C/D verbatim) |
| 2-attestation per load-bearing claim | `/verify-loop` |
| Root-cause investigation | `/systematic-debugging` |
| New architectural rule surfaced | `/capture-lesson` |
| Live-page DOM verification | Playwright MCP |
| Schema check BEFORE "missing X" claim | `python ~/.claude/hooks/wp-blocks.py dump` |
| DB query | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` |
| A page/pattern built with banned CORE blocks (ban-clear) | `plugins/sgs-blocks/scripts/migrate-core-blocks/` — `lint-page.py` for a PAGE's post_content (lint → `--json` judge → editor-apply per `APPLY.md`), `driver.py` for theme FILES. Detector is DB-first (`block-replacements.json`). Prebuild gate `check-no-core-blocks.py` fails the build on core blocks in theme files. See its `README.md`. |
| Session close | `/handoff` |

## Session workflow

**This project defaults to PLAN MODE** (`.claude/settings.json` `permissions.defaultMode: "plan"`, set 2026-06-29). Every session starts read-only — investigate + get an approved plan before editing. This is deliberate (the cause-agnostic grounding floor that kills the cold-start doom-loop), NOT a bug; Shift+Tab exits for trivial turns. If it doesn't fire on startup (Windows bug #34509), set the VS Code extension's permission mode instead. The SessionStart hook `~/.claude/hooks/session-spec-anchor.py` also injects the governing spec pointer + next action each session. Rationale: `~/.claude/rules/prove-the-cause-before-fix.md` + the 2026-06-29 session-grounding work.

**ALWAYS read the governing spec IN FULL at session start (Bean-locked 2026-07-01; extends STOP-26).** Every cloning-pipeline session reads `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` END TO END before starting work — NOT just the sections for the day's task, NOT a grep-and-skim. **Why:** issues surface mid-work in sections you weren't planning to touch; with the whole spec already in context you have the grounding to diagnose them instead of being in the dark. This is not optional and applies every session regardless of how narrow the task looks. (This is why the next-session-prompt reading gate says "read it in full".)

## Git workflow

**Before every commit/push:** run `git branch --show-current` and verify branch matches scope.

| Work | Branch |
|---|---|
| Core SGS (plugins/sgs-blocks/src/, theme/sgs-theme/, plugin PHP) | `main` |
| Client-specific (sites/<client>/, per-client snapshot) | `feat/<client>-*` |
| New framework feature | `feat/<feature>` branched from `main` |

**Never commit core framework changes to a client/feature branch.** If on wrong branch mid-work: stash → switch → pop → commit. See global CLAUDE.md for full git workflow rules.

## Build & deploy (one-liners; full sequence in dev-setup.md)

```bash
cd plugins/sgs-blocks && npm run build
# Build uses @wordpress/scripts with --experimental-modules + --webpack-copy-php (PHP render.php copied to build/)

# Deploy — THE ONE PATH (D336-hardened). Defaults to the sandybrown canary.
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives   # production — explicit opt-in
# Scope: --blocks-only | --theme-only. It runs the build itself unless --skip-build.
# It carries the dirty-tree gate + default-ON fail-closed verify + .bak rollback rotation, and
# resets OPcache via HTTP (the CLI pool is separate). Full sequence in dev-setup.md.
#
# ⛔ NEVER hand-roll tar / scp -r / ssh 'rm -rf … && mv …'. The old recipe deleted the LIVE
#    directory before extracting: on 2026-07-14 (D336) it took two client sites down for ~2.5h.
#    Do not reach for --allow-dirty (an uncommitted edit was D336's trigger) or --skip-verify
#    (that flag removes the check that catches a broken deploy).

# Per-client theme snapshot (per-client tokens live at sites/<client>/theme-snapshot.json, Spec 33)
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>
```

- **Dev site:** palestine-lives.org. **Staging/canary:** sandybrown-nightingale-600381.hostingersite.com. Both on **WP 7.0.1** (verified 2026-07-16 via Hostinger MCP `hosting_showWordPressCoreVersionV1`; WP 7.1 lands 19 Aug 2026 — re-check rather than trusting this line). Canary page for Mama's = 144 (`/rc-fix-verification-mamas-munches/`).
- **SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias `ssh hd`). WP admin user: `Claude`.
- **Canary credentials (gitignored, ALWAYS available — no need to ask):** `.claude/secrets/sandybrown.env` holds the test-site logins — `WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN` (browser/admin login at wp-login.php) + `WP_APP_PWD_SANDYBROWN` (REST/Store-API Basic auth) + `WP_URL_SANDYBROWN`. Use them directly for Playwright editor login + REST verification. (Cloning dev-site app passwords: `A:/.openclaw/.secrets/wp-app-passwords.env`.)
- **No Node.js on server** — build locally, deploy compiled `build/`.

## Architecture rules

### SGS is a standalone framework, not a client project
Theme + blocks must work on ANY WordPress install for ANY client. Every design decision must pass: "Will this make sense for a restaurant, a wedding planner, AND a law firm — not just <current client>?" Never hard-code client colours, copy, imagery, structure into base theme / blocks plugin. Client-specific work lives in `sites/<client>/` only.

### cv2 output goes to WP PAGES, not POSTS
Posts use `single.html` which constrains `.entry-content` to `max-width: 800px` — wrong for landing-page clones. Pages use `page.html` with no such constraint. `/sgs-clone --deploy-target page:144` for current Mama's canary.

### Client experience is primary
No block feature is complete until it has full block-editor UI controls. Clients are tech-illiterate — they use the block editor exclusively. Every customisable property must be exposed as an inspector control. If a setting requires touching code, it is not done. WP-CLI is a developer tool only; never something clients touch.

### Universal block-equivalent extraction (Spec 31 §13.2 / FR-31-3)
Walker is a single recursive function with exactly 3 permitted exceptions (atomic-tag swap / top-level chrome-skip / top-level container wrap). Every BEM-classed DOM node resolves to a block slug via `slot_synonyms.standalone_block` lookup; per-block behaviour comes from DB rows, not code branches. Block-equivalent attrs (FR-31-2) become child InnerBlocks rather than scalar attrs (eliminates double-render). Canonical spec: Spec 31 §13.2.

### DB-first, no hardcoded dicts (blub.db 260)
Before adding any hardcoded lookup dict in pipeline scripts, check sgs-framework.db: `property_suffixes` (124) + `kind_override` column (17 populated, replaces `_KIND_BY_SUFFIX` dict per D99), `block_supports` (1160 active post-D100 prune), `modifier_suffixes` (19), `slots` (103 = 99 element + 4 section post-D111 2026-05-30; was 105 at D99 — section pruned 16→4, element grew 89→99, replaces retired `slot_synonyms` + `legacy_role_lookup`), `roles` (21 — 20 base + `scalar-media` added D128, replaces `slot_synonyms.role_classification` per D99), `block_attributes` (2,935 — live; query `/sgs-db`), `block_capabilities` (88), **`blocks.variant_attr` column** (BUILT, FR-31-20, Commits 1–5/6 SHIPPED 2026-06-01; names the variant-selector attr per block), **`variant_slots` table** (BUILT, FR-31-20; stores each variant's DISCRIMINATING slots via set-difference; populated by `/sgs-update` from `supports.sgs.variants` in block.json), **`block_composition.container_kind` column** (BUILT + populated 2026-06-02, D152; values `section|layout|content`; 31-block container roster has `wraps_block` + `container_kind` populated; NOT walker-read yet — standardisation WS-3). Refactor to `db_lookup.py` reads. Full mechanism: Spec 31 §13.5 + §13.6.

### Composite-mirror rule (R-31-9 extension, D152, locked 2026-06-02)
No composite block evades R-31-9. Every composite block with a built-in wrapper (e.g. sgs/hero, sgs/cta-section, sgs/trust-bar) MUST mirror `sgs/container`'s wrapper capabilities (padding, max-width, contentWidth, gap, background) rather than diverging. Capability propagation route: `block.json` `supports.sgs.containerKind` → `block_composition.container_kind` (populated by `/sgs-update`) → converter wrapper logic reads the column and applies the 3-layer model (OUTER/CONTENT-WIDTH/PER-GRID-ITEM). Missing capabilities = gap candidates to add to the composite, never converter workarounds. Canonical procedure: Spec 31 §13.6. Memory: `feedback_no_composite_evades_universal_rule`, `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`.

**"Mirror capabilities" ≠ "must call the shared PHP helper" (D294 clarification, qc-council-settled 2026-07-09).** The rule forbids per-block CSS *hacks that DIVERGE* from the wrapper's computed behaviour — NOT a clean block-private implementation that reproduces the same capability set. A **content-KIND composite that uses only box+width** (quote, info-box, testimonial, team-member, product-faq-item…) MAY render block-private (own scoped `<style>`, no `SGS_Container_Wrapper` call) — it never used the wrapper's grid/section/background machinery, and the converter routes CSS by `block_attributes` keyed on `block_slug` (block.json-derived), NOT by `wraps_block`/`container_kind` (zero walker impact), so dropping the wrapper is safe and requires no DB change. **section/layout-KIND composites (hero, cta-section, card-grid, feature-grid…) KEEP the wrapper** (genuine grid/section) — which is now fully scoped (spacing/max-width/contentWidth/band/GRID, D292/D294/D296). This is the no-inline-rollout pattern selector; do not re-litigate it per block.

**Scope is universal:** the fix applies to every wrapper at any nesting depth, every `sgs/container` instance, and every composite with a built-in container, not just section-level blocks. Faithful transfer includes a property's absence (no `max-width` → full-width, overriding the theme default).

A composite is **NEVER a separate system** — hero/cta-section/trust-bar all render through the shared `SGS_Container_Wrapper`. Per-block CSS hacks/carve-outs that diverge from the universal wrapper (e.g. the hero's old `wrap_inner=false`, the `.wp-block-group .wp-block-sgs-hero{max-width:100%!important}` containment hack, the `margin-inline:-24px` breakout) are **bugs to remove**, not contracts to preserve. (2026-06-16: removed 2 hero full-bleed CSS hacks so the hero uses universal `alignfull` identically to trust-bar.)

**When a composite VARIANT's grid/structure looks ambiguous, STOP — query the DB before theorising:** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT * FROM variant_slots WHERE block_slug='sgs/hero'"`. The discriminating slots in `variant_slots` + the block's `blocks.variant_attr` ARE the definition of that variant's setup (FR-31-20). E.g. sgs/hero `split` = `gridTemplateColumns`/`splitGap`/`splitImage`/`splitImageMobile` → a 2-col grid (≥768) that stacks to 1-col (<768). Never call a variant grid a "tangle" or guess from attr values — read the variant DB + the per-client mockup CSS. Memory: `feedback_ground_in_variant_db_for_variant_block_setups`.

### Hardcoded wrapper defaults are CHEATS to remove, not blockers (locked 2026-06-16)
When the shared wrapper/helper injects a hardcoded value that overrides the draft's faithfully-transferred CSS, that injection is a **no-hardcoding (R-31-1) violation to REMOVE or gate** — never an immovable "blocker" a fix can't get past. The pipeline transfers the draft's ratio/gap/align/responsive faithfully; it must not inject anticipated defaults. Example purged 2026-06-16: the wrapper always emitted `sgs-cols-tablet-N`/`sgs-cols-mobile-N` classes whose CSS forces `grid-template-columns:repeat(N,1fr) !important`, crushing the faithful explicit `gridTemplateColumns*` ratio. Fix = emit the `sgs-cols-*` shorthand class for a tier ONLY when that tier has no explicit ratio (so the faithful `@media` rule wins). If a wrapper behaviour blocks faithful transfer, ask "is this an injected hardcoded default?" — if yes, remove/gate it. **Status: the `sgs-cols-*` gate (emit the shorthand class for a tier ONLY when that tier has no explicit ratio) was SHIPPED 2026-06-16 (D228). If you find the class still emitting unconditionally in code, that is a regression to fix — not an open design decision.** Memory: `feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.

### Responsive breakpoint discipline — device-tier vs visual (locked 2026-06-16)
Two DISTINCT concepts; NEVER conflate them or run a blanket "fix all 599/600 breakpoints" sweep:
1. **Device-tier responsive** — the structured SGS `Mobile`/`Tablet`/`Desktop` attribute system (`gridTemplateColumnsMobile`, `gapTablet`, etc.), rendered by `SGS_Container_Wrapper` + mapped by the converter (`_GRID_TABLET_BP`). MUST use ONE consistent standard: **768/1024** (`@media (max-width:767px)` mobile, `(max-width:1023px)` tablet, desktop ≥1024 — per `~/.claude/rules/visual-standards.md`). An inconsistent value HERE is a real bug (the wrapper used `599` while `sgs-cols-*` used `767` — unified 2026-06-16).
2. **Arbitrary visual breakpoints** — a single CSS rule changing at a specific width for a design reason (`min-width:600px`, WP's `wp-block-columns` `781px` stack point). LEGITIMATE, design-driven, any value, NOT the device system — must NOT be blanket-changed. Before changing any breakpoint, classify it; if unsure, leave it. A mechanical/Haiku agent CANNOT make this judgment. Memory: `feedback_device_tier_vs_visual_breakpoints_are_distinct`. Variant grids are DEFINED in `variant_slots` + `blocks.variant_attr` (query, don't guess — `feedback_ground_in_variant_db_for_variant_block_setups`).

### Rosetta Stone discipline (uimax cross-platform translation)
Every uimax row describing a design artefact MUST carry equivalent-name mappings across SGS blocks + vanilla HTML/CSS + Bootstrap + shadcn/Radix + Tailwind + React + AI-builder. Missing SGS equivalent = gap candidate, never silently dropped. `uimax` = DB/data layer; `/ui-ux-pro-max` = intelligence skill that USES the DB. Captured 2026-05-06 blub.db 213.

### Bean-controlled drafts use SGS-BEM (Spec 00 §3 / §3.1, blub.db 236)
`.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 hard-rejects non-conforming on production runs; `--draft-mode` = soft warning; `--legacy` bypasses. Live scrapes use lingua-franca conversion at write time.

### Saved-defaults model (canonical — do NOT reintroduce parallel infra)
Four WordPress-native channels: (1) visual styling defaults → Site Editor Styles panel (`wp_global_styles` over `theme.json`); (2) structural starting state → block patterns at `theme/sgs-theme/patterns/*.php` (one PHP file per pattern — verified 2026-07-15; the old `plugins/sgs-blocks/includes/block-patterns.php` path in this doc was stale and that file does not exist); (3) per-operator session memory → `useLastUsedAttributes` sessionStorage hook; (4) per-instance customisation → block inspector. NO `withSaveAsDefault` HOC, NO `<BlockDefaultsPanel>`, NO `wp_options`-backed defaults store.

### Block customisation standard (MANDATORY)
Every block: (1) native `supports` for wrapper-level controls; (2) custom attrs + controls for each inner text element; (3) custom attrs + controls for CTAs; (4) CSS fallback colours use `:not([style*="color"])` so custom values win; (5) Block Selectors API in `block.json` targets native typography to primary text element.

### Block styling contract — no inline styling (Spec 32, design-gate 2026-07-09)
Every SGS block styles itself so NOTHING renders as an inline `style="…"` property declaration. Native WP styling supports (`color`/`spacing`/`__experimentalBorder`/`typography`/`shadow`) stay declared (client-facing editor controls) but MUST NOT auto-inline: flip to scoped serialisation via `__experimentalSkipSerialization` + `wp_style_engine_get_styles($style, ['selector'=>"#uid"])` appended to the block's own scoped `<style>` (Phase-0-proven live, matches how WP core outputs `layout` support). Per-side/per-corner box props (padding/margin/border-width/border-radius) merge into named object attrs (`{top,right,bottom,left}` / `{topLeft,topRight,bottomLeft,bottomRight}`) driven by WP's native `BoxControl`, gated by the DB `block_attributes.box_family` column — never a name-regex — enforced by a structural AST collision gate. Responsive tiers + `:hover` live in stylesheet rules, never inline; the only permitted non-attr output is a non-device-breakpoint rule routed to `sgsCustomCss`. Overrides = CSS custom-property VALUES, never inline declarations. **Also: a single-semantic-element block renders that element AS the root — NO useless wrapper div (button/heading/text/quote/label/media; the `<a>`/`<h2>`/`<p>` IS the block root, button D288 pattern).** **Which pattern each block uses (D294, qc-council-settled): single-element blocks + content-KIND composites that use only box+width go BLOCK-PRIVATE (like quote — they never used the wrapper's grid/section machinery, and converter routing is indifferent to `wraps_block`); section/layout-KIND composites KEEP `SGS_Container_Wrapper` (genuine grid/section — like hero), which is now itself fully scoped (spacing/max-width/contentWidth/band/GRID — D292/D294/D296).** **No block version bumps + no deprecations pre-production (Bean D293 — overrides STOP-57).** **PROVEN LIVE: button + container + heading + text (D293) + quote + media (D294) + hero (D295); shared wrapper max-width/contentWidth/band (D294) + grid/flex (D296) all inline→scoped. Roster: 7/59 styling-support blocks migrated; ~52 remain (phased waves — `.claude/LEDGER.md`).** Canonical: **the per-block DONE checklist `.claude/plans/block-migration-DONE-checklist.md` (11 end conditions = definition of done for every block) + the HOW `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`**, `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`, `.claude/plans/2026-07-09-no-inline-styling-design-gate.md`, `.claude/plans/2026-07-09-box-object-interface-contract.md`. Visual-diff reports go at repo-ROOT `reports/visual-diff/` (STOP-67).

### Image controls discipline
Every new block rendering `<img>` MUST declare `"imageControls": true` in `block.json` `supports.sgs` so the universal image-controls extension applies. Document deliberate opt-out in the block's own CLAUDE.md or block.json description.

### No hard-coded environment paths
PHP: `get_theme_file_uri()` / `get_stylesheet_directory_uri()` / `wp_upload_dir()`. JS/CSS: CSS custom properties via `wp_add_inline_style()` or `wp_localize_script()`. Never `/wp-content/themes/sgs-theme/assets/image.png` (breaks on non-standard installs).

### Per-client theming model
`theme/sgs-theme/styles/` is empty. Per-client colour/typography lives at `sites/<client>/theme-snapshot.json` and deploys via `push-theme-snapshot.py`. Client-specific CSS goes into the snapshot's `styles.css` OR `sites/<client>/theme-overrides.css`. Never into framework's `style.css`.

### sgs/trust-bar — renamed from trust-badges (D123, 2026-05-31); dual-mode FR-24-10 SHIPPED 2026-06-01; bound-purge SHIPPED D182 2026-06-06
D72 (2026-05-25) retired the ORIGINAL composite `sgs/trust-bar` (counter use-cases → `sgs/counter`; badge use-cases → universal-nesting). Then `sgs/trust-badges` was renamed → `sgs/trust-bar` (D123) — this is the CURRENT active block. As of 2026-06-01 (FR-24-10, commit d6358f32) it introduced dual-mode, but the cloning `sourceMode='bound'` emit was a cheat that has since been **PURGED (D182, 2026-06-06, commit `92bcf997`, 6-persona adversarial-council gated)**. The converter now emits `sourceMode='typed'` with native item attrs resolved by the icon-identity resolver (`converter_v2/icon_resolver.py`, 2026-06-07) — badges clone to correct icon slugs (home/check/truck/star). **Current reality (verified live 2026-07-16 — `trust-bar/render.php:6,11` + `block.json`): `sgs/trust-bar` has NO `sourceMode` attribute at all.** It was REMOVED at v0.5.1 ("Rule 3 de-plumb") once bound mode was purged and typed became the only mode — the attribute was redundant plumbing. The block is **typed-only**: a curated `items[]` repeater across all 3 variants.

- **Do NOT emit `sourceMode` on `sgs/trust-bar` in any form** — including `'typed'`. WP silently DISCARDS an attribute the block.json doesn't declare (D338), so it would be a dead attr that looks fine and does nothing.
- `sourceMode='bound'` — RETIRED from cloning (D182) and now gone entirely from this block; `cheat-gate/check_bound_emit.py` enforces it.
- The `wc-product` / `sgs-cpt` live-configurator modes belong to **`sgs/product-card`** (Spec 27), not trust-bar. Check the target block's own `block.json` before assuming it has a `sourceMode`.

## Non-negotiables

- WCAG 2.1 AA baseline (keep 2.2's cheap wins — visible focus; 44px touch targets already beat 2.2's 24px), mobile-first responsive (4.5:1 contrast). Revisit to 2.2 AA per public-sector/EU client.
- No jQuery — vanilla JS only frontend; `viewScriptModule` (ES modules) for interactive blocks
- All REST endpoints: nonces, capability checks, sanitisation, prepared statements (`$wpdb->prepare()`)
- Performance budget: <100KB CSS, <50KB JS per page; green Core Web Vitals
- UK English in all code, comments, user-facing text
- Cross-project sync: any change affecting sgs-booking REST must also update `specs/03-SGS-BOOKING.md` + `plugins/sgs-booking/CLAUDE.md`

## Doc-op standards (Phase 13 close, 2026-05-24)

Architectural record: `.claude/decisions.md` D57-D65. Canonical templates: `~/.agents/skills/shared-references/doc-templates/`.

1. **parking entries** carry `**Status:** OPEN|PARTIAL|BLOCKED|DEFERRED` + one of 6 taxonomy buckets
2. **specs** use `FR-{spec_id}-{N}` for requirement IDs (e.g. `FR-31-3`)
3. **mistakes.md** is a keyword-stub index only — body links to `feedback_*.md` + blub.db row
4. **plans** use strategic-plan + phase-plan templates (timebox / ROAM / 16-field step block)
5. **Handoff docs carry forward structural defences — never SUBTRACT** (D101 rule, captured 2026-05-29 / blub.db 290 / pattern_key `handoff-docs-carry-forward-structural-defences`). When overwriting `.claude/STOP-CATALOGUE.md` (or, on other projects, any handoff doc) with structural-defence sections (anti-pattern STOP catalogue, pre-flight self-attestation ritual, tiered mandatory reading list, "READ THIS BEFORE ANYTHING ELSE" boxes), READ THE PREVIOUS VERSION FIRST end-to-end. Carry every structural-defence section forward verbatim or extended. Only ADD based on this session's new learnings; never SUBTRACT without a recorded justification. After writing, COUNT: STOP entries ≥ previous + new; reading items ≥ previous + new; ritual questions ≥ previous + new. If any count went down without justification, the new doc is a regression — revise before commit. Captured because 2026-05-29 D93-D100 session-close prompt dropped 7-entry STOP catalogue + 5-question ritual + collapsed 16→5 reading list; Bean caught before next session ran. Sparser prompts let captured failure patterns recur (meta-lesson `feedback_lessons_must_be_operationally_surfaced_not_just_archived` — captured lessons sitting in memory files only prevent failures when operationally surfaced at session start; STOP catalogue at top of handoff IS the operational surfacing).

## Framework stats

**Counts (blocks, block_attributes, slots, roles, patterns, etc.) drift in prose — the DB is authoritative; never hard-code a count here.** Query live via `/sgs-db` or `/wp-blocks`, or read `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` (regenerated by `/sgs-update`). DB schema + per-table roles + the recent column/table additions (`blocks.tier`, `block_composition.container_kind`, `blocks.variant_attr`/`variant_slots`, `property_suffixes.kind_override`, `slots`/`roles`) are catalogued in **Spec 22 §4 (data layer)** + `.claude/decisions.md`.

Stable facts: WP 7.0 compatible; per-client theming via `theme-snapshot.json`; the modular `converter/` engine is THE ONLY converter (the frozen convert.py/converter_v2 tree was DELETED at D276, 2026-07-05 — no flag, no fallback); `/sgs-update` is 10-stage v3 (aggressive prune-orphans + attr-orphan detection + retired-blocks delete); single-command deploy `plugins/sgs-blocks/scripts/build-deploy.py`.

## Design context for current client builds

Per-client design context lives in `sites/<client>/CLAUDE.md`. Active clients:

- `sites/mamas-munches/` — current pipeline canary
- `sites/indus-foods/` — Heritage / Partnership / Ambition; teal+gold palette; B2B trade buyers
- `sites/helping-doctors/` — green palette; medical sector

Do NOT inline client-specific design context into framework CLAUDE.md. Always read the client's own CLAUDE.md when working on that client.
