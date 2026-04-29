---
doc_type: master-plan
project: small-giants-wp
project_id: 14
plan_source: .claude/specs/2026-04-27-optimisation-toolkit-design.md
last_updated: 2026-04-29
generated_by: /strategic-plan (executed by Claude during /project-consolidate Stage 4)
---

# small-giants-wp — Master Plan

> **Source of truth:** [`.claude/specs/2026-04-27-optimisation-toolkit-design.md`](../specs/2026-04-27-optimisation-toolkit-design.md). This master plan is the navigation + execution layer; the spec is the design + reasoning layer. **If they disagree, the spec wins for design questions and this plan wins for sequencing/effort/gates.**

## 1. Goal

Ship the optimisation toolkit + tooling rebuild (Steps 3+4 of the SGS-WP 5-step master plan), then deliver the 5 priority client builds (Step 5) with Bean acting only as QC/internal client.

**"Done" looks like:** all 5 phases complete; design-brain rebuild shipped; 13 pipelines formalised + smoke-tested; Tracks A and B in Phase 5 closed (A1-A9 + 5 clients live).

## 2. Strategic objectives advanced

| Objective | How this plan advances it |
|-----------|---------------------------|
| Revenue (Track B clients) | 5 clients shipped; gate to scaling SGS as a productised offering |
| Tooling reliability (Track A) | 13 pipelines + 22+ optimised skills + new SQLite tables for cross-run intelligence |
| **Pre-deploy verification (Phase 1.5 — adopted 2026-04-29)** | **WP Studio sandbox + HTTPS Preview Sites become the mandatory gate between local edits and tar-deploy. Closes the dominant failure mode where OPcache / LiteSpeed / block-validation gotchas surface only AFTER live deploy. Existing git → Hostinger pull deploy chain is preserved; Studio sits in front of it as a sandbox + verification layer, not a replacement. `/verify-loop` runs against the Preview URL before any tar-deploy fires. Strategic shift, not a tooling tweak — every other optimisation in this plan compounds on top of a gated deploy.** |
| Autonomy (zero-QC delivery) | Council 4-reviewer pre-deploy gate replaces single-LLM design review; Designer Mode B autonomous research; validated-outcome ingestion |
| Competitive moat | Self-improving design-brain DB; archetype × pricing-tier deterministic mapping; **sandbox-preview-gated deploy puts SGS ahead of every WP agency still running edit-on-live workflows** |

## 3. Constraints

- **Budget:** Bean's working time + delegated Sonnet/Gemini Flash/Cerebras subagent compute (~$10-30/phase as estimated in spec)
- **Timeline:** No external deadlines on Phase 1-4. Phase 5 Track B has hot-lead pressure: CMX (proposal needed), Snooza/Ophir (live engagement), Indus Phase 2 (blocked on /quoter rebuild — A4)
- **Tech:** WordPress 6.9+, PHP 8.0+, @wordpress/scripts, Interactivity API, Python 3.13, SQLite, no jQuery, no page builders
- **Non-negotiable:** WCAG 2.2 AA on every shipped surface; UK English; <100KB CSS / <50KB JS budget; no hardcoded client-specific code in framework

## 4. Personas

Three planning lenses — used during gate decisions:

| Persona | Lens |
|---------|------|
| **Bean (operator)** | "Will I lose flow if this gate is review-required vs auto?" — autonomy-maximising |
| **Cold subagent** | "Can I execute this phase from a fresh context with no prior session memory?" — handoff quality |
| **Future Bean (3 months out)** | "If I picked this up cold, would I know which doc is the source of truth?" — drift resistance |

## 5. Past-data calibration

Spec phase estimates were authored 2026-04-27/28 by Bean + Claude (Opus). Three calibration anchors:

| Past datum | Source | Implication for estimates |
|-----------|--------|--------------------------|
| 22 rubrics shipped 2026-04-27/28 in single session | Recent session | Per-rubric authoring is ~10-20 min, not 30 — applied 1.5× ADHD Tax not 2× |
| Today's R-items closure across 5 skills (12 fixes + 3 contract docs) | This session | Cross-skill dispatch contracts plausible at ~2h with parallel subagents |
| build-website external 4-reviewer panel reconciliation | toolset-spec §6 | Multi-reviewer reconciliation flow works; council pattern transferable |

**No "first-attempt" phases — all phase estimates have at least 2 calibration anchors. Standard 2× ADHD Tax applied (not 3×).**

## 6. Scope

**In scope:**
- Phases 1-5 of the optimisation-toolkit spec
- Track A items A1-A9 (Phase 5)
- Track B clients 1-5 (Phase 5)

**Out of scope (deferred / parked):**
- **Indus Foods Phase 4** — anything inside `sites/indus-foods/.claude/` is a tracked subproject with its own master plan + state.md. THIS plan does not duplicate or override that subproject's content. Indus Phase 2 build (Track B item P5.B2) coordinates with the subproject but does not absorb it.
- Pipelines P8 (content), P10 (scroll-animation premium), P11 (email campaign), P13 (app delivery) — see `plans/strategy/2026-04-21-non-essential-pipelines-deferred.md`
- WooCommerce integration (intentionally avoided)
- Non-design skills outside the 22-rubric optimisation set (triaged in Phase 2b)

---

## 7. Unit Map

Each unit follows the strategic-plan single-responsibility rule. ON-CRITICAL-PATH flag drives the testing rigour applied during execution (Phase Planner enforces).

### Phase 1 — Foundations

| ID | Unit | Files / where | Inputs | Outputs | On critical path |
|----|------|--------------|--------|---------|----|
| **P1.1a** | Build 4 toolkit utilities (canary_split, dspy_signature, certainty_calc, few_shot_injector) | `~/.agents/skills/shared-references/optimisation-toolkit/` | Spec §4 utility specs | 4 utility modules + smoke tests | YES |
| **P1.1b** | Update 8 lifecycle/quality/QC skills to be utility-aware (BLOCKING gate) | 8 skill SKILL.md files | P1.1a | Updated skills + cross-tier QC peer-review evidence | YES |
| **P1.1c** | Build `/verify-loop` (merge `/test-driven-development` + `/verification-before-completion`) + end-to-end demo + G1 milestone | `~/.claude/skills/verify-loop/` | P1.1b | /verify-loop shipped (skillscore 90%, gap-analysis A 78.5/78.5); end-to-end demo PASS (Decision F: gate refused premature optimisations); Verification Plan table on phase-1-foundations.md; G1 archived (curl pending — `BLUB_AUTH` unset, payload at `phase-1-end-to-end-2026-04-29-001/g1-payload.json`) | YES |

### Phase 1.5 — Tooling Triage + Sandbox-Preview Gate (NEW — added 2026-04-29)

**Two strategic shifts compressed into one phase. Both are load-bearing for everything downstream.**

#### Shift 1 — Tooling triage before rubric universe

Phase 2 originally went straight to "rubric universe — 22 skills". That assumes the existing roster is the right roster. Phase 4 ("Tooling rebuild") explicitly contemplates killing/merging/replacing tools. So Phase 2 risks rubricking tools Phase 4 will then archive — wasted Phase 2 work. Phase 1.5 prunes the saw before Phase 2 saws the tree.

**Cost-benefit:** ~2–2.5 hours of triage. Likely shrinks Phase 2 from 22 → 12–15 rubrics. Saves 7–10 rubric-authoring sessions worth of time + reduces ledger noise. Cleaner Phase 4 input.

#### Shift 2 — WP Studio sandbox + Preview-URL gate becomes the new pre-deploy floor

This is the larger of the two shifts. Until 2026-04-29, the deploy path was: edit locally → tar + scp → palestine-lives.org / Hostinger client site → discover OPcache, LiteSpeed, block-validation, or default-rendering gotchas after the change is live → re-deploy. Every "claimed done, wasn't actually verified" failure pattern that drove the `/verify-loop` build (Phase 1c) traces back to this missing gate.

WP Studio (Automattic, free, already installed) closes it. The new pipeline:

```
edit (VS Code) → WP Studio sandbox (Hostinger import via .wpress) → Studio Preview URL (free, hosted, HTTPS, 7-day) → /verify-loop runs Playwright assertions against the Preview URL → if PASS → existing git → Hostinger pull → live
```

Studio does NOT replace the deploy. It sits in front of it. The existing tar+scp / git+Hostinger-pull mechanism stays. What changes is that no live deploy fires until `/verify-loop` has run rendered-DOM assertions, screenshot diffs, and console-error checks against an HTTPS URL that is **rendered-DOM identical for the `wp-content` scope** (Studio Preview ships only `wp-content` — core, root files, and custom `wp-config.php` constants are NOT replicated; see manual gotcha #5).

**Why this is large impact, not a tooling tweak:**

1. **Compounds on Phase 5 client builds + Phase 4 tooling rebuild deploys.** Strongest impact on long-running deploys (clients, framework rollouts). Phase 2 rubric authoring is mostly local — gate adds little there. Phase 3 gap analysis benefits where findings touch deployable code. Honest framing: high-leverage on deploy-touching work, modest on local-only work.
2. **It's the structural fix to the failure mode `/verify-loop` was built for** — at the per-deploy level. /verify-loop catches "claimed done not verified" at the per-step level; Studio Preview extends that to the per-deploy level. Integration risk noted: `/verify-loop` was originally designed for inline step verification, not Preview-URL gating — the `--target-url` flag in P1.5e is a retrofit and may surface assumption gaps in Stage 1 classification.
3. **Sandbox-preview-before-promote is an emerging pattern in the WP-AI tooling space.** Studio itself is the canonical implementation. Other tools (Local by Flywheel's Live Links, Playground previews) cover narrower surfaces. SGS adopting Studio Preview is alignment with Studio's own pattern, not a multi-tool consensus claim — keep the framing humble.
4. **Client-shareable HTTPS URL with caveats.** Studio's wp.build Preview Sites give a free, hosted, 7-day URL — but: (a) **10-preview cap per WP.com account** can block mid-deploy if other previews are live; (b) **WP.com OAuth dependency** means auth must be valid (2-week token) for `preview create`/`update` to succeed; (c) Preview ships only `wp-content`, not core. Within those limits: replaces "deploy live → Bean spots issues → redeploy" with "preview → Bean reviews → deploy clean". Indus Foods 2-week cycle becomes 7-day-renew-via-CLI, with a `preview list` check before each renewal.

**Reference docs:**
- AI Operating Manual: `.claude/specs/2026-04-29-wp-studio-ai-manual.md` — every CLI command, every MCP tool (24 Studio tools + 1 wpcom-mcp tool), Blueprint format, 5 standard workflows (Hostinger import, Preview URL, /verify-loop chaining, sandbox refresh, version-drift detection), 13 priority-ordered gotchas, Claude-specific anti-patterns.
- Decision research: `.claude/reports/2026-04-29-wp-studio-vs-local-flywheel.md` — Studio chosen for HTTPS preview surface, Local kept as backup for MySQL / DB-heavy work.

**Critical gotcha (Phase 1.5 must address):** Studio runs PHP-WASM, which **cannot host a native MySQL server** — it ships with the SQLite integration plugin and intercepts `wpdb` at runtime. Hostinger is MySQL. The original "blueprint MUST force `DB_ENGINE=mysql`" framing was unimplementable in Studio's runtime (verified against the Studio AI manual L10 + L332). Replacement: **best-effort SQL parity**. The blueprint must document SQLite-vs-MySQL drift surfaces (collation, GROUP BY semantics, REGEXP, fulltext indexes), and any DB-heavy regression check must run against Local by Flywheel (real MySQL) in addition to Studio. The `/verify-loop --target-url` Studio Preview gate covers rendered-DOM, screenshots, console errors — NOT SQL-flavour drift. SQL-flavour drift remains the user's responsibility, with Local-by-Flywheel as the tier-2 backstop.

#### Phase 1.5 deliverable table

| ID | Unit | Files / where | Inputs | Outputs | Critical |
|----|------|--------------|--------|---------|----|
| **P1.5a** | Run `/skill-auditor` + `/agent-auditor` for overlap / duplicate / abandonment surface | All skill + agent dirs | P1.1c | Audit reports — kill / merge / park / keep candidates | YES |
| **P1.5b** | Cross-reference `plans/strategy/2026-04-21-non-essential-pipelines-deferred.md` and parking lots; produce a single triage table (kill / merge / park / keep, one row per tool) | `.claude/plans/strategy/2026-04-29-tooling-triage.md` (new) | P1.5a | Triage table | YES |
| **P1.5c** | Bean sign-off on the triage table (HARD GATE — scope-shaping decision) | (chat) | P1.5b | Confirmed triage decisions | YES |
| **P1.5d** | Execute kills (delete + redirect) + merges (parallel where safe) | Various skill/agent files | P1.5c | Surviving roster | YES |
| **P1.5e** | Sandbox-preview gate setup — pin Studio version + create `sgs-base.blueprint.json` + Hostinger import flow doc + `/verify-loop --target-url` flag + `studio-preview-up.ps1` helper + `deploy-check` `--studio-pass` flag | `theme/sgs-theme/sgs-base.blueprint.json`, `CLAUDE.md` deploy section, `~/.claude/skills/verify-loop/SKILL.md`, `~/.claude/skills/deploy-check/` | WP Studio AI manual at `.claude/specs/2026-04-29-wp-studio-ai-manual.md` | Pre-deploy verification gate operational | NO (parallel to P1.5d) |
| **P1.5f** | Run `/phase-planner` to draft Phase 2 phase-plan against the surviving roster (sized correctly post-triage) | `.claude/plans/phase-2-rubrics-universe.md` (new) | P1.5d | Phase 2 phase-plan ready | YES |

**Phase exit (G1.5):** triage decisions logged + kills/merges executed + sandbox-preview gate working + Phase 2 phase-plan drafted.

### Phase 2 — Rubrics universe

| ID | Unit | Files / where | Inputs | Outputs | Critical |
|----|------|--------------|--------|---------|----|
| **P2.2a** | Per-skill optimisation pass on 22 confirmed rubrics | 22 skill dirs | P1.1b | Updated skills + bumped rubrics | YES |
| **P2.2b** | Triage + draft rubrics for remaining ~50-60 tools | All skill dirs | Spec §10.1 + triage filter | New rubrics + skip-flag registry | NO |
| **P2.2c** | Draft end-goal rubrics for all 13 pipelines | Pipeline dirs | Pipeline list (spec §2c) | 13 pipeline rubrics | YES |

### Phase 3 — Three-lens gap analysis

| ID | Unit | Files / where | Inputs | Outputs | Critical |
|----|------|--------------|--------|---------|----|
| **P3.3a** | System-level gap analysis (coverage + duplicates + ordering/placement) | Workspace-wide | Phase 2 outputs | System gap report | YES |
| **P3.3b** | Per-pipeline gap analysis (13 pipelines, 3 parallel Sonnet subagents → Gemini Flash QC → Opus synth) | Pipeline rubrics | P2.2c | 13 pipeline gap reports | YES |
| **P3.3c** | Per-critical-skill gap analysis (subset of 22) | Critical skill rubrics | P2.2a | Per-skill gap reports | NO |
| **P3.3d** | Synthesise 3-lens findings into prioritised remediation list **+ risk-mitigation prototypes** (`<model-viewer>` material-swap fidelity test for A8 3D Configurator; SGS Ecom Plugin Phase 1 scope verification — defer anything Mama's-only to Phase 2) | Aggregate | P3.3a, P3.3b, P3.3c | Phase 4 input list + risk-resolution evidence | YES |

### Phase 4 — Tooling rebuild (one batch)

**Design-brain FIRST — gates everything else.** See spec §5 Phase 4 detail (4.1-4.5) for sub-tasks.

| ID | Unit | Files / where | Inputs | Outputs | Critical |
|----|------|--------------|--------|---------|----|
| **P4.4.1** | Design-brain rebuild internals (5 SQLite tables, modify.py + designer.py + council.py, philosophy-autoload.py hook, blueprint-schema.json, **11 modifier skills deleted: colourise, bolder, quieter, normalize, polish, distill, delight, adapt, harden, optimise, critique** + `/audit` merged to `/site-reviewer` + `/tailwind-design-system` repurposed to `/library-docs tailwind v4`, /innovative-design rewritten as thin classifier) | `~/.agents/skills/ui-ux-pro-max/` + `~/.claude/skills/innovative-design/` + `~/.claude/hooks/` | P3.3d + 7 design-brain rubrics | New ui-ux-pro-max + Council operational | YES |
| **P4.4.1b** | DB migration: apply DDL for the 5 design-brain tables (versioned migration in `~/.agents/skills/ui-ux-pro-max/scripts/migrations/`); seed `philosophy_rules` from migrated /superdesign + /delight + /harden content; seed `archetype_token_matrix` (Jung 12 × 4 tiers = 48 rows) | `~/.agents/skills/ui-ux-pro-max/scripts/migrations/` + ui-ux-pro-max.db | P4.4.1 schemas | DB ready for designer.py + council.py reads | YES |
| **P4.4.2** | 8 pipeline orchestrators formalised (P1, P2, P3, P4, P6, P7 remediation, P9, P12) | `~/.claude/skills/<pipeline>/` | P4.4.1 | 8 orchestrator skills | YES |
| **P4.4.3** | New + improved skills: /interactivity-capture (NEW), /reference-voice-extractor (NEW), shared ethics gate module **+ wired into Stage 0.5 of every web-fetch pipeline (sgs-discover, sgs-extraction, animation-harvest, /clone-patterns) — robots.txt + 1-req/sec rate-limit + `User-Agent: SGS-Scanner` enforced at point-of-use, not just declared as a module**, /site-reviewer L5 promotion, /uimax INGEST, /sgs-db schema migrations, **/sgs-discover improvements (URL-only mode + block-gap detection + mood-board memory)**, **/visual-qa compare-to-mood-board mode promoted to first-class** | Various skill dirs + `blub.db` | P4.4.1 | New + improved skills + DB tables | YES |
| **P4.4.4** | Reclassifications + low-risk file moves (style-replicator, design-tokens, **sgs-extraction 4 fixes from blub.db lesson 151**, autopilot domain table verify, capture-lesson path fix, build-website dead refs, **delete /frontend-design (orphan; uniques merged into ui-ux-pro-max aesthetic-reference.md)**, **delete /sales-intelligence-advisor (Bean's copy only — Amir keeps his); 6-lens framework + challenge library extracted into /quoter rebuild**) | Various | One-shot bundle | PR ready | NO |

### Phase 5 — Step 5 client builds (Track A + Track B)

**Track A — Framework completion (no client deps).** Each unblocks Track B clients.

| ID | Unit | Sub-tasks (spec Phase 5 detail) | Effort raw | ADHD Tax 2× |
|----|------|----|------|------|
| **P5.A1** | Steps 3+4 complete (Phases 1-4 above) | — | (composite) | (composite) |
| **P5.A2** | Responsive Extension | spec A2 (11 P1 items consolidated into one extension) | Block | 2 sessions |
| **P5.A3** | Hover Extension | spec A3 (5 hover items lifted to universal) | Block | 1 session |
| **P5.A4** | /quoter rebuild | spec A4 (4 sub-items: rebuild + 6-lens extract + delete sales-advisor + lead-research-assistant adapter) | Session | 1 session |
| **P5.A5** | Dark-mode extension | spec A5 (theme.json variation switching + token layer) | Block | 1 session |
| **P5.A6** | SGS Ecom Plugin Phase 1 | spec A6 (Product CPT + variants + cart + checkout + Order CPT + admin + emails + schema + 7 blocks) | 4-6 weeks | 8-12 weeks |
| **P5.A7** | Variant/Colour Picker block | spec A7 (block + variant component + price/stock/cart integration) | 1-2 weeks | 2-4 weeks |
| **P5.A8** | 3D Configurator block | spec A8 (model-viewer block + 9 attributes + editor UX + frontend UX + perf + a11y) | 2-3 weeks | 4-6 weeks |
| **P5.A9** | Block style variations | spec A9 (per-block presets registered, seeded by philosophy_rules) | Block | 1 session |

**Track B — 5 priority clients.** Each starts when its Track A gate clears.

| ID | Client | Track A gate | Hot-lead pressure |
|----|--------|--------------|-------------------|
| **P5.B1** | Mama's Munches (small ecom rebuild) | P5.A6 | Brand discovery needed |
| **P5.B2** | Indus Foods Phase 2 | (build can start now); P5.A4 for pricing | Indus Phase 2 build can start immediately |
| **P5.B3** | CMX Group (proposal + quote) | (design can start now); P5.A4 for quote | Live engagement; client awaits proposal |
| **P5.B4** | Snooza/Ophir (3D demo) | P5.A7 + P5.A8 | Live engagement |
| **P5.B5** | SGS Studio v2 rebuild (Next.js → SGS WP) | P5.A2 + P5.A5 | None (own site) |

---

## 8. Dependency Graph

```
P1.1a (utilities) ──BLOCKS──> P1.1b (lifecycle skills update)
                              │
                              ▼
                              P2.2a + P2.2b + P2.2c (parallel)
                              │
                              ▼
                              P3.3a + P3.3b + P3.3c (parallel)
                                                │
                                                ▼
                                                P3.3d (synthesise)
                                                │
                                                ▼
                                                P4.4.1 (design-brain) ──BLOCKS──> P4.4.2 + P4.4.3 (parallel)
                                                                                  P4.4.4 (independent low-risk)
                                                                                  │
                                                                                  ▼
P5.A2,A3,A4,A5,A9 (parallel framework polish) ──┤
                                                ▼
                                                P5.A6 ──BLOCKS──> P5.A7 ──BLOCKS──> P5.A8

Track B clients gate on their Track A unblockers per the table in §7.
```

**Critical path (longest chain):** P1.1a → P1.1b → P2.2c → P3.3d → P4.4.1 → P4.4.2 → P5.A6 → P5.A7 → P5.A8 → P5.B4 (Snooza demo gates on configurator).

**Parallel opportunities:**
- P2.2a + P2.2b + P2.2c run in 3 parallel Sonnet streams
- P3.3a + P3.3b + P3.3c (parallel — 3a system-level on main thread, 3b 13 pipelines via 3 parallel Sonnet subagents capped, 3c per-skill on a fourth stream)
- P4.4.2 + P4.4.3 (parallel after P4.4.1)
- P5.A2/A3/A5/A9 (parallel) and Indus Phase 2 + CMX proposal in Track B kick off immediately

## 9. Effort estimates (ADHD Tax 2× applied)

| Phase | Raw spec estimate | With 2× ADHD Tax | Calendar shape |
|-------|-------------------|-----------------|----------------|
| Phase 1 (foundations) | ~4h utilities + ~16h lifecycle skill updates | 8h + 32h = 40h | 1-2 weeks part-time |
| Phase 2 (rubrics) | ~30 min × 22 + triage + 13 pipelines | ~16h | 3-5 days part-time |
| Phase 3 (gap-analysis) | ~3h composite | 6h | 1-2 days |
| Phase 4 (tooling rebuild) | 26-38h design-brain + ~30-40h orchestrators | 70-150h | 4-8 weeks |
| Phase 5 Track A | A2-A9 mix; A6 ecom dominates at 4-6 weeks raw | 12-18 weeks | rolling |
| Phase 5 Track B | Per client; longest is Mama's gate on A6 | per client | rolling, hot leads first |

**Total to Phase 4 close:** ~4-5 months part-time at current pace. Phase 5 begins client work in parallel (Indus Phase 2 + CMX kick off immediately, do not gate on Phase 1-4).

## 10. Risk register (per spec §7)

| ID | Risk | Mitigation (applied) |
|----|------|----------------------|
| R1 | Lifecycle skill updates regress (Phase 1b BLOCKING) | Cross-tier QC peer review (NOT self-apply) — lesson from 2026-04-28 |
| R2 | Council bias collapse (4 reviewers converge despite different prompts) | Model heterogeneity mandatory: Sonnet + Gemini-Pro + Cerebras + Gemini-Vision (per design-brain §6) |
| R3 | Goodhart drift on self-improving DB | 30-day no-revision validation gate + quarterly diversity audit |
| R4 | Aesthetic decay (DB converges on bland average) | Diversity audit script: variance per dimension; halt ingest if dropping |
| R5 | Phase 5 hot-lead pressure forces re-decisioning | Track A + B parallel; clients without Track A gates start immediately (Indus Phase 2, CMX proposal design) |
| R6 | Spec drift between canonical + reference + master plan | One Edit ladder: spec is design source; master plan is sequencing source; cross-link headers everywhere; lifecycle gate on edits |

## 11. Milestone gates

### G1 — Foundations (after P1.1b)
**Pass criteria:** all 4 utilities have passing smoke tests; all 8 lifecycle skills updated + cross-tier QC reviewed; one end-to-end utility-aware skill optimisation pass demonstrated.
**Fail criteria:** any lifecycle skill regresses on existing rubrics in self-test.
**Type:** auto-gate. **Readiness:** scored after execution.

### G2 — Rubrics universe (after P2.2c)
**Pass criteria:** 22 rubrics optimised with new utility methodology; ≥50 remaining tools triaged; 13 pipeline rubrics drafted.
**Fail criteria:** rubric drift — old rubric format mixed with new.
**Type:** review-gate (Bean spot-checks 3 randomly).

### G3 — Three-lens gap analysis (after P3.3d)
**Pass criteria:** prioritised remediation list ready; Phase 4 inputs locked.
**Fail criteria:** synthesis surfaces a contradiction not resolvable inline (escalates Phase 4 scope).
**Type:** review-gate.

### G4 — Design-brain ships (after P4.4.1)
**Pass criteria:** Blueprint schema validates; council.py 4-reviewer end-to-end smoke; philosophy-autoload.py wired and verified; **11 modifier skills deleted with no live consumers**; ui-ux-pro-max restructured under 500 lines per Anthropic skills guidance; **council writes its gap register durably** — both to `.claude/reports/council-runs/<run_id>.json` AND POST to `http://localhost:5050/api/corrections` so cross-run pattern detection catches recurring false positives.
**Fail criteria:** Council false-positive rate >40% **outside the 90-day calibration window** (per design-brain spec §8 the steady-state target is <10% by month 3; >40% during initial calibration is acceptable, >10% after that fails the gate).
**Type:** **go/no-go** — design-brain gates everything below it.

### G5 — All pipelines formalised (after P4.4.2 + P4.4.3 + P4.4.4)
**Pass criteria:** 13 pipelines smoke-tested with new toolkit + Council pre-deploy stage; 6 new skills shipped + DB tables migrated.
**Fail criteria:** any pipeline can't reach its rubric gate.
**Type:** auto-gate.

### G6 — Phase 5 Track A complete
**Pass criteria:** A1-A9 shipped; Track B clients can all start.
**Type:** rolling (each A-item has its own sub-gate enforced by `/phase-planner`).

### G7 — Phase 5 Track B complete (mission ends here)
**Pass criteria (per client):**
- Client live + zero-QC delivery touchpoints documented
- **JSON-LD schema markup validates** — Organization + WebSite always; Product + Offer + AggregateRating for ecom client (Mama's Munches); LocalBusiness for Indus Foods + CMX
- **Each Track B client registered as a tracked project** via `POST http://localhost:5050/api/projects` with its own `project_id` (so the 5-client portfolio surfaces in dashboard alongside small-giants-wp parent)
- **Post-deploy `/uimax ingest --mark-validated`** fires after the 30-day no-revision window per design-brain §3.7, feeding validated palette/typography/pattern data back into the design intelligence DB
**Mission-end criteria:** all 5 client per-client gates closed.
**Type:** rolling — each client has its own G7 instance.

## 11.5 Cross-cutting telemetry — every phase exit

Every phase + critical-path unit exits with a summary POSTed to the Blub knowledge API so cross-run pattern detection works:

```bash
curl -sf -X POST http://localhost:5050/api/knowledge \
  -H "Cookie: blub_auth=blub-second-brain-2026" \
  -H "Content-Type: application/json" \
  -d "{
    \"category\": \"pipeline-run\",
    \"tags\": [\"<phase-id>\", \"<unit-id>\", \"<grade>\"],
    \"title\": \"Phase <N> exit: <unit-name>\",
    \"content\": \"Outcome | Duration | Cost | Top finding | Next-action handoff\",
    \"metadata\": {\"run_id\": \"<id>\", \"phase\": \"<N>\", \"project_id\": 14}
  }"
```

POST failure is non-blocking (logged, not fatal). The phase-planner skill emits these automatically; this clause is the source of truth for "what gets POSTed when."

## 12. First action ≤5 min per phase (cold-start anchor)

| Phase | First action |
|-------|-------------|
| Phase 1 | `cd ~/.agents/skills/shared-references && mkdir -p optimisation-toolkit/tests && touch optimisation-toolkit/canary_split.py` |
| Phase 2 | `python ~/.claude/hooks/local-search.py "skill-optimiser end-goal-rubric"` — preload context |
| Phase 3 | List the 13 pipelines from spec §2c into a tracking file at `~/.claude/pipeline-state/three-lens-gap-analysis/<run_id>/pipelines.txt` |
| Phase 4 | Read `plans/strategy/2026-04-24-design-brain-architecture.md` §3.1 + §3.8 — confirm the 5 SQLite tables before scripting |
| Phase 5 — A2 Responsive Extension | `cd plugins/sgs-blocks/src/extensions && mkdir -p responsive-extension && touch responsive-extension/index.js` |
| Phase 5 — A3 Hover Extension | `grep -lE "hover|on:hover" plugins/sgs-blocks/src/extensions/*.js \| head -5` — locate existing hover code to lift |
| Phase 5 — A4 /quoter rebuild | `ls ~/.claude/skills/quoter/SKILL.md` — confirm current state before rebuild |
| Phase 5 — A5 Dark mode | `grep "data-theme" theme/sgs-theme/theme.json` — check token layer baseline |
| Phase 5 — A6 SGS Ecom Plugin | `mkdir -p plugins/sgs-ecommerce/src && touch plugins/sgs-ecommerce/sgs-ecommerce.php` — scaffold |
| Phase 5 — A7 Variant Picker | depends on A6 schema — `cat .claude/specs/10-SGS-ECOMMERCE.md` once it exists |
| Phase 5 — A8 3D Configurator | `npm view @google/model-viewer version` — confirm latest |
| Phase 5 — A9 Block style variations | `grep -l "register_block_style" plugins/sgs-blocks/includes/*.php \| head -3` — find existing registration site |
| Phase 5 — Track B Indus | `cat sites/indus-foods/.claude/state.md` — pick up subproject status |
| Phase 5 — Track B per-client | `curl -sf -X POST http://localhost:5050/api/projects -d '{"name":"<client-slug>","status":"active","priority":5,"owner":"Bean"}'` — register client project_id before starting build |

## 12.5 Phase 4 sequencing gate (deletion-before-reference)

Some Phase 4 work involves deleting or rebuilding skills the master plan still references. To prevent broken-reference scenarios mid-execution:

| Hard rule | What it means |
|-----------|--------------|
| `/sales-intelligence-advisor` deletion (P4.4.4) MUST follow A4 `/quoter` rebuild | The 6-lens framework + challenge library extracts FROM sales-advisor INTO quoter; deleting first orphans content |
| `/audit` merge into `/site-reviewer` (P4.4.1) MUST precede any new caller of `/audit` | New work calls `/site-reviewer` directly; old `/audit` references in plans/specs need a sweep |
| `/tailwind-design-system` repurpose to `/library-docs tailwind v4` MUST validate output depth first | Spot-check that `/library-docs tailwind v4` returns equivalent depth before deletion (per design-brain §6 "Risks") |
| Each of the 11 modifier skills MUST have content migrated to philosophy_rules / mode docstrings before deletion | Per design-brain §3.5.1 — content moves to DB; skill stub deleted last |
| Sequencing check: before any phase-planner pass references a skill that's marked for deletion in P4.4.1/P4.4.4, verify it's still callable OR the rebuild target is operational | Phase planner reads this rule at Stage 0; halts if the referenced skill is in a deletion window |

## 13. Per-phase handoff to `/phase-planner`

Each phase below hands off to `/phase-planner` as a separate session. Plan-level model hint provided per spec complexity:

```
[Phase 1 — handoff]
  Trigger: invoke /phase-planner with phase scope = "Phase 1 — Foundations"
  Entry context: .claude/specs/2026-04-27-optimisation-toolkit-design.md §5 Phase 1 + Section 4
  Plan-Level Label hint: PLAN: sonnet  (4 utilities + 8 skill updates — well-scoped, mechanical-shaped)

[Phase 2 — handoff]
  Trigger: invoke /phase-planner with phase scope = "Phase 2 — Rubrics universe"
  Entry context: spec §5 Phase 2 + Section 10.1 (22 confirmed rubric paths)
  Plan-Level Label hint: PLAN: sonnet (22 optimisations + drafting at scale; parallelisable)

[Phase 3 — handoff]
  Trigger: invoke /phase-planner with phase scope = "Phase 3 — Three-lens gap analysis"
  Entry context: spec §5 Phase 3 + Section 6 (recording schema)
  Plan-Level Label hint: PLAN: sonnet (3-lens execution model already designed in spec §3)

[Phase 4 — handoff]
  Trigger: invoke /phase-planner with phase scope = "Phase 4 — Tooling rebuild"
  Entry context: spec §5 Phase 4 + Phase 4 detail (4.1-4.5) + plans/strategy/2026-04-24-design-brain-architecture.md
  Plan-Level Label hint: PLAN: opus (architectural; multi-skill cross-cutting; novel SQLite schemas)

[Phase 5 — handoff]
  Trigger: invoke /phase-planner per A-item OR per client — phase-planner does the inner sequencing
  Entry context: spec §5 Phase 5 + Track A item detail + plans/strategy/2026-04-21-step2-strategic-plan.md
  Plan-Level Label hint: PLAN: opus for A6 (ecom plugin, novel) + A8 (3D configurator, novel); PLAN: sonnet for A2-A5/A7/A9 (extensions/blocks following established patterns)
```

## 14. Pre-emptive decisions (Hidden Decisions pass — what would pause execution mid-flight?)

| Decision | Resolution captured here so phase-planner doesn't re-ask |
|----------|--------------------------------------------------------|
| Stripe Checkout (redirect) vs Elements (in-page) for A6 | Recommendation: Checkout redirect for Phase 1 (faster to ship; tax/PCI handled by Stripe). Re-evaluate at Phase 2 when need for in-page UX is proven |
| 3D renderer fallback to three.js (A8) | Decision deferred until Ophir-fidelity calibration on `<model-viewer>` (spec §3.2); plan ships with model-viewer first; three.js is recovery path, not default |
| Council false-positive tuning window | First 90 days post-G4 = calibration period; severity weights tunable; <10% false-positive target by month 3 |
| Spec vs master-plan vs phase-plan source-of-truth conflicts | Spec wins on design questions; master plan wins on sequencing/effort/gates; phase plan wins on step-level ops detail. Cross-link headers in all three. |
| What happens if Phase 4 surfaces a new skill not yet in the master plan | Add to master plan §7 as P4.4.5 with a row; rerun /gap-analysis on master plan to re-check; don't merge phase 4 outputs without master plan update |
| Indus Phase 2 vs Track A coordination | Indus Phase 2 build (Track B) starts immediately on existing blocks; Track A polish (A2 responsive, A3 hover) lands underneath without breaking Indus — stale Indus pages retest after each Track A landing |

## 15. State sync (after this plan ships)

This plan triggers updates to:
- `state.md` — frontmatter `current_phase: phase-1-foundations`, `last_updated: 2026-04-29`
- `goals.md` — already populated with this plan's goals (consolidate Stage 4)
- `decisions.md` — capture the 5 pre-emptive decisions above (TODO: create file if missing)
- Project dashboard via `/api/projects` — POST plan summary (consolidate Stage 5)

## References

| Doc | Role |
|-----|------|
| [`.claude/specs/2026-04-27-optimisation-toolkit-design.md`](../specs/2026-04-27-optimisation-toolkit-design.md) | Source spec — design and reasoning |
| [`.claude/plans/strategy/2026-04-21-step2-strategic-plan.md`](strategy/2026-04-21-step2-strategic-plan.md) | Step 2 of master plan (5-client queue) |
| [`.claude/plans/strategy/2026-04-21-toolset-spec-from-sgs-studio-session.md`](strategy/2026-04-21-toolset-spec-from-sgs-studio-session.md) | Verified tool inventory + 13 pipelines |
| [`.claude/plans/strategy/2026-04-24-design-brain-architecture.md`](strategy/2026-04-24-design-brain-architecture.md) | Phase 4 design-brain spec |
| [`.claude/plans/strategy/2026-04-21-non-essential-pipelines-deferred.md`](strategy/2026-04-21-non-essential-pipelines-deferred.md) | Pipelines deferred from critical path |
| [`.claude/plans/open-r-items-animation-harvest-sgs-discover.md`](open-r-items-animation-harvest-sgs-discover.md) | 12 R-items closed today; tracker for any reopens |