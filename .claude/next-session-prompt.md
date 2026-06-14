---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-14
primary_goal: "Close the FULL clone-vs-draft fidelity gap on the Mama's homepage — much larger than the 55-ledger tracked. START by (1) comprehensively READING + ALIGNING the 12 canonical docs (grounded by the D226 audit register), then (2) a direct HTML diff of the live clone (`current-clone-page-source.html`) vs the draft (`index.html`) to enumerate the COMPLETE defect set, then (3) fix by root-cause family with the 2 class-section blocks' spacing (content-width / max-width / grid sizing / grid padding / alignment) as the biggest lever. Product-page redesign (oversized Trustpilot + tight content width) is a SEPARATE after-fidelity task."
---

# Next session — full clone-fidelity alignment (doc-read+align → HTML-diff defect map → root-cause-family fixes)

> Invoke `/autopilot` first. Then READ COMPREHENSIVELY before acting (Bean-mandated full reads, not greps) — the 12 docs in the reading list below + the D226 audit register + the live ground truth (clone HTML, draft HTML, ledger, state/decisions/parking).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/seeding action — carry forward verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on canary page 8 vs the draft. Emit-green ≠ rendered. (Proven AGAIN D226: H-C1 was conformance-green but did nothing on the live page.)
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, the /sgs-update seeding pipeline, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-14 close — D226)
The skipped gate finally ran. We deployed D225's 4 committed converter fixes (`a8bf5616`) to the live canary page 8 and **checked the rendered page**, not the tests. Result: **IN-B (ingredients content band → 960px) and GF-B.2 (gift sub-text → left) genuinely work on the live page; H-C1 (hero sub-headline width) does NOT** — its value never got extracted (leftover bin) and it targeted a hero-level setting that can't reach the sub-headline (now a child text block). Two probed rows — **IN-E** (ingredient cards should inherit centre, clone emits left) and **FP-P** (CTA should be full-width 598px, clone is 183px) — were **confirmed real defects, not misdiagnoses**. Two new small bugs surfaced (hero sub `line-height:1.65unitless`, duplicated margin). Separately, a 3-agent doc-alignment audit of the 12 canonical docs found **critical drift** — most importantly **the theme ships 780px content width while Spec 01 documents 1200px** (that IS the "content feels tight" complaint), and **the button-presets admin source file is gone while the CSS still references its variables** (likely the brand/announcement button breakage). **Bean's verdict: the 55-issue ledger undercounts — the real fix is a direct clone-vs-draft HTML comparison + a comprehensive doc-read+align FIRST.** **D-CEILING: D226.**

## 📚 MANDATORY READING (comprehensive — full reads, Bean-mandated; do this BEFORE any fix-shape)
Reading order:
1. `.claude/reports/2026-06-14-doc-alignment-audit.md` — the audit register; it tells you what in the 12 docs is stale BEFORE you trust them.
2. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` · `29-CONTAINER-EQUIVALENT-BLOCKS.md` · `WRAPPER-CSS-ROUTING-DESIGN-GATE.md` · `11-SGS-BUTTON-ARCHITECTURE.md` · `20-STRUCTURED-PIPELINE-LOG-SURFACING.md` · `21-PIPELINE-STATE-ARTEFACTS.md` · `00-naming-conventions.md` · `00-OVERVIEW.md` · `01-SGS-THEME.md` · `02-SGS-BLOCKS.md`
3. `.claude/cloning-pipeline-flow.md` + `cloning-pipeline-stages.md`
4. Ground truth for the diff: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` (live clone, Bean-saved) + `index.html` (truth source).
5. `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (live status) + `.claude/decisions.md` D226/D225 + `.claude/parking.md` P-CLONE-FIDELITY-FULL-ALIGNMENT / P-DOC-ALIGNMENT-12-DOCS / P-PRODUCT-PAGE-REDESIGN.

## Tasks

### Task 1 — Comprehensive doc-read + ALIGN the 12 docs (grounded by the audit register) [FIRST]
**What:** Read all 12 docs in full; as you read, apply the corrections in `reports/2026-06-14-doc-alignment-audit.md`. Surface the 2 CRITICAL Bean-decisions before changing them: (a) Spec 01 contentSize 780-live vs 1200-documented — is 780 intentional or revert? (b) Spec 11 button-presets admin PHP absent + orphaned CSS vars — built+deleted or never built?
**Why:** every prior session reasoned from stale doc labels and re-fixed built code (blub 353). Aligned docs = the foundation for the diff.
**Estimated:** read ~30 min; mechanical count-sweep ~10 min; critical investigations ~15 min.
**Orchestration:** Execution = **inline (Opus) reads** the docs (Bean wants the main agent to actually understand them) → **delegate the mechanical count-drift sweep** to a sonnet subagent (`/delegate`; the register's count table is a clean find-replace across named files) → Opus does the 2 critical investigations (grep theme.json + the button-preset var source) + presents the Bean-decisions. Verify-before-edit the Spec 21 artefact claims (grep the writer exists; don't trust the agent's "likely").
**Depends on:** none. **/qc gate after:** `/docscore` on each edited doc + `/handoff` Gate 4.5 doc-walk.
**Acceptance:** every audit-register high/critical finding either fixed or has a recorded Bean-decision; count-drift sweep done; `/docscore` ≥ A- on edited docs.

### Task 2 — Clone-vs-draft HTML diff → COMPLETE defect register [the enumeration]
**What:** Directly compare `current-clone-page-source.html` vs `index.html` section-by-section. Content passes 100%, so pair by content + position (NOT by draft BEM class — the converter emits native blocks; clone-parity's class matcher has a blind spot). Produce a defect register (one row per real mismatch: section / element / draft value / clone value / root-cause family / fix layer). Must capture Bean's named set + anything else found: **2 class-section blocks (hero, cta-section) spacing — content-width, max-width, grid sizing, grid padding, alignment** (biggest); product-card CSS; brand button + image styling; ingredients text-align (IN-E); grid items-per-row; disclaimer block styling; gift-card label; button padding; announcement-bar button; testimonial-slider double-nested container; + carry-over H-C1/FP-P/BR-B + the 2 hero-sub inline bugs.
**Why:** the 55-ledger undercounts; a measured register is the single honest to-do list.
**Estimated:** ~30 min.
**Orchestration:** Execution = **`/dispatching-parallel-agents`** — fan out ~3-4 sonnet agents, each owning 2-3 sections, each returning a structured per-section defect table (draft CSS+markup line refs vs clone). Opus merges into one register + maps each to the 8 root-cause families. **PROBE-FIRST live** (chrome-devtools/Playwright on page 8) for any computed-style claim — emit-green≠live (Rule 5).
**Depends on:** Task 1 (aligned docs). **Parallel with:** none. **/qc gate after:** `/qc-council` cross-family sanity on the merged register before any build.
**Acceptance:** a committed defect register covering every Bean-named item + extras, each with draft-vs-clone evidence + family + fix layer.

### Task 3 — Fix by root-cause FAMILY, biggest lever first (2 class-section blocks' spacing) [the build]
**What:** Group the register by family and fix universally. The 2 class-section composites (hero, cta-section) not resolving content-width / max-width / grid sizing / grid padding / alignment is the biggest — this is the Spec 29 "Method-2" gap (the converter still emits `sgs/container` for sections, not the composite blocks). H-C1's re-fix lands here (right layer: the sub-headline is a child block → cap on that block, not the hero attr).
**Why:** root-cause families compound across sections; per-instance tuning is the anti-pattern.
**Estimated:** per-family ~30-45 min; the class-section/Method-2 one is bigger (own design session).
**Orchestration:** Execution = **design inline (Opus)** per family → **`/brainstorming`** for the class-section/Method-2 routing shape → **`/adversarial-council`** on each shared-mechanism/converter change (Rule 7) → **delegate the build** to sonnet subagents (`/subagent-driven-development`; subagents implement, NO commit authority) → Opus `/qc-council` + BOTH conformance suites + **live page-8 verify per row** + commit path-scoped. Fix the 2 hero-sub inline bugs (`line-height:1.65unitless`, dup margin) in the sgs/text styling-lift emit while in convert.py.
**Depends on:** Task 2 register. **/qc gate after:** `/qc-council` per converter commit + live-DOM per row.
**Acceptance:** each family's rows flip to VERIFIED via live computed-style on page 8 (R-22-11), both suites green, no regression on already-VERIFIED rows.

### Task 4 — block.json selector auto-seed (carried from D225, still OPEN) [design-gate]
**What:** P-BLOCKJSON-SELECTOR-AUTOSEED — make per-attr lift selectors block-owned + auto-seeded, retiring the override-dict/fingerprints/migration channels (see decisions D225/D226 + the seeding-vs-runtime split: the converter reads `block_attributes.derived_selector`; the question is which /sgs-update SEEDING source writes it). NOTE the D226 correction: there are already 4 selector channels — consolidate, don't add a 5th.
**Orchestration:** `/brainstorming` design + `/adversarial-council` on the seeding-pipeline approach (Rule 7) BEFORE build; full `/sgs-update` reseed verify; both suites.
**Depends on:** none (independent). **Acceptance:** one selector channel; full reseed reproduces all derived_selectors with zero hardcoded Python selector dict.

### Task 5 — Product-page redesign (oversized Trustpilot + tight content) [DEFERRED — after fidelity]
**What:** the product page design doesn't line up with the draft; Trustpilot review block "stupidly large"; content width "really tight" (ties to Spec 01 contentSize 780). Redesign post-fidelity.
**Orchestration:** `/brainstorming` design + `/innovative-design`; Bean sign-off (R-22-13). **Depends on:** Task 3 (fidelity closed). **Acceptance:** product page matches the draft layout; Bean visual sign-off.

## Dependency graph
```
Task 1 (doc-read+align: inline Opus reads + delegated count-sweep + Bean-decisions)   [FIRST]
  ↓
Task 2 (clone-vs-draft HTML diff → defect register: /dispatching-parallel-agents, /qc-council gate)
  ↓
Task 3 (root-cause-family fixes, class-section/Method-2 biggest: /brainstorming → /adversarial-council → SDD build → /qc-council + live-verify per row)
Task 4 (block.json selector auto-seed: design-gate; independent — can interleave)
  ↓
Task 5 (product-page redesign — DEFERRED until Task 3 fidelity closes)
each commit: path-scoped (`git commit -- <paths>`); merge to co-actively-held main via temp-worktree if needed
```

## Methodology guardrails (do not skip — carried forward + extended D226)
- **Emit-green ≠ live-verified — verify the rendered page (R-22-11).** D226 PROVED it again: H-C1 passed both conformance suites + was committed, and rendered NOTHING on page 8. NO ledger row closes without a live computed-style read on canary page 8 (or a draft-vs-clone measurement). The parity2 aggregate + clone-parity BEM matcher are triage-only (blind spot for native-block output).
- **Read the implementing SCRIPT before proposing/critiquing ANY converter/seeding mechanism** — never trust spec `built_status:` labels, attr/column names, or "probably true" (blub 353). The D226 audit found the docs themselves carry stale labels — distrust them, verify against code/DB.
- **Verify-first on any "gap"** — labels undersell scope. Confirm a gap is a contained wire before dispatching a build.
- **Draft is the truth source; pair by content+position, not draft BEM class** — the converter emits native blocks that don't carry draft classes (clone-parity reports false "ELEMENT MISSING").
- **Deploy before measure** — `/sgs-clone … --deploy-target page:8` (re-clone + deploy) BEFORE any computed-style/pixel probe. Converter changes (convert.py) need no build; block.json/render.php/style.css changes need `npm run build` (PowerShell) + deploy + bump version (Hostinger CDN 7-day cache).
- **Root-cause FAMILY before instance fix** — group by the 8-family map; fix universally (R-22-9). Per-section tuning is the anti-pattern.
- **TWO conformance suites** — Gate A `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` (pre-commit) AND `converter_v2/tests/`. Run BOTH.
- **DB changes reproducible from the canonical path** (block.json `supports.sgs` auto-seed OR dated `migrations/*.py`), verified by a FULL `/sgs-update` reseed — NEVER a manual DB edit or hardcoded Python selector dict.
- **/qc-council BEFORE every converter/SGS-block/seeding commit** (blub 255). **/adversarial-council before any shared-mechanism change** (Rule 7).
- **Commit path-scoped** (`git commit -m "msg" -- <paths>` — `-m` BEFORE `--`). Merge to co-actively-held main via temp-worktree cherry-pick; verify is-ancestor after each push.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit). Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree (a rater once wiped uncommitted work this way).
- **Bean's "are you sure?"/"why?" on a hardcode/deletion = a mandate to investigate the architecture, not reassure.**

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline + state.md/handoff/next-session-prompt.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Anything co-actively staged? (`git status` — commit ONLY by explicit path.)
3. Have I READ (not grepped) the 12 docs + the audit register + clone/draft HTML before proposing any fix-shape? Have I distrusted the docs' stale labels per the register?
4. What is the MEASURABLE acceptance (live computed-style on page 8 = draft) — not "code shipped" / "conformance green"?
5. Is this Rule-7 high-blast (converter / shared wrapper / seeding pipeline / most-used block)? Then `/adversarial-council` (approach) + `/qc-council` (per commit) BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Task 3 family fix-shapes + Task 4 schema + Task 5 redesign (design mode) |
| `/gap-analysis` | grade any unit/register vs its acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/theme.json/block.json pattern you're unsure of (e.g. flex-column stretch for FP-P) |
| `/strategic-plan` + `/phase-planner` | if Task 3's class-section/Method-2 fix needs a formal phased plan |
| `/dispatching-parallel-agents` | Task 2 section-by-section HTML diff (fan-out) |
| `/adversarial-council` | MANDATORY on every shared-mechanism/converter change + the seeding approach (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding commit (blub 255) |
| `/subagent-driven-development` · `/subagent-prompt` | Task 3 per-family dispatch (subagents implement) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | live page-8 DOM + computed-style probes; serve the draft via `python -m http.server` in the mockup dir to measure draft truth (file:// is blocked) — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + WP-native supports attr names |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / derived_selector / container_kind / blocks.tier (DB-authoritative; the docs' counts are stale) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | Task 1 count-sweep + Task 2 per-section diff + Task 3 per-family build — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on `/qc-council` passes |
| `wp-sgs-developer` | heavier WP/block.json/render.php work (button presets, product-card, composite blocks) |
| `design-reviewer` | visible-surface changes (live page-8 at 375/768/1440) + Task 5 product-page redesign |

## Guardrails
Cloning thread owns the converter + homepage pipeline + /sgs-update seeding path. Converter + shared-wrapper + seeding changes are Rule-7 high-blast → design-gate. Build per family, `/qc-council` + Gate A + (live page-8) per commit. The FR-22-3 guard blocks new `if slug==` literals. Run BOTH conformance suites. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D226).
