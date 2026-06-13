---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-13
primary_goal: "Converter DE-LITERALISATION programme. D222 SHIPPED to main (the name-free align/grid layer-router is DONE — zero align-attr literals; IN-F notice-banner content-lift; team-member scalar-lift regression fixed). NEXT = rip out the ~13 per-block `if slug == \"sgs/X\"` literal carve-outs in convert.py (convert.py:2744-3350), each reduced to the universal DB-driven scalar-lift (`_lift_scalar_attrs_by_selector` via block_attributes.derived_selector) OR kept as a documented exception. Canonical plan + full literal register (line numbers + per-literal reducible/exception assessment): .claude/plans/2026-06-13-converter-de-literalisation-audit.md. Rule 7: convert.py is the highest-blast shared mechanism — DESIGN + /adversarial-council on the de-lit approach BEFORE building. The align router (D222, commit c5ecb4eb) is the proven template."
---

# Next session — converter de-literalisation programme (rip out the per-block `if slug==` carve-outs)

> Invoke `/autopilot` first. Then read, end-to-end, BEFORE acting: **`.claude/plans/2026-06-13-converter-de-literalisation-audit.md`** (THE programme + the 13-literal register with line numbers + reducible-vs-exception first-pass) + `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-2/FR-22-3/FR-22-21 (per-block behaviour = DB rows, not code branches; the layer model) + `.claude/decisions.md` D222 (the align-router template + the lessons) + the LIVE clone-fix ledger `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (~14 rows still OPEN — the broader clone-fix work, separate from this programme).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block action — carried forward verbatim)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break. *(This whole programme exists to remove the per-block `if slug==` carve-outs — replace with DB-driven resolution, do not just relocate the literal.)*
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. *(Emit-green ≠ rendered — verify the full render chain.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. *(convert.py de-lit is THE highest-blast mechanism — its own `/adversarial-council` on the de-lit approach before any code.)*

## State recap (plain English, 2026-06-13 close)

**D222 SHIPPED to `main`** (commits `1b03b8c7` + `c5ecb4eb`): the name-free align/grid layer-router is DONE — the live align route has **zero attr-name literals** (align resolves via `db.attr_for_layer_property(slug,"OUTER","align-items")` backed by a dated property_suffixes migration). **IN-F** notice-banner now lifts direct text into an `sgs/text` child (live-verified page 8). **team-member** is a typed leaf again (scalar name/role/photo via `scalar-content-lift` + reproducible `ATTR_CLASSIFICATION_OVERRIDES`; D221 regression fixed). Gate A green on main. Doc set swept accurate through D222; 2 completed plans + the completed theme thread's session docs archived.

**The remaining converter debt = ~13 per-block `if slug == "sgs/X"` literal carve-outs** in `convert.py` (`_atomic_attrs_for` 2936-3035 leaf handlers + the css-rules handlers 3111/3158/3191 + the trust-bar hand-read 3191-3350 incl. iconCircleBackground + multi-button 2744). These predate + duplicate the universal DB-driven scalar-lift. They conflict with FR-22-3 ("per-block behaviour = DB rows, not code branches"). This programme rips them out.

## The task — execute via the plan (its own design-gate first)

### Task 1 — DESIGN the de-literalisation approach + `/adversarial-council` (NO code first)
**What:** read the 13-literal register in the plan; for each literal decide reducible-to-DB (via `derived_selector`/`scalar-content-lift` like testimonial D212 + team-member D222) vs genuine exception (tag-shape transforms like `core/heading` level=int(tag[1]); complex array extraction like option-picker). Produce the phased rip-out design (one wave per handler/cluster). Then `/adversarial-council` on the approach (Rule 7).
**Why:** convert.py is the highest-blast file; a wrong de-lit shape regresses every clone. Outcome = a council-GO'd, phased, conformance-gated plan.
**Estimated:** 30 min (design) + the council.
**Orchestration:** INLINE Opus design → `/adversarial-council` (6 personas) on the de-lit mechanism. Context the design needs: the align-router (D222) is the template — find the universal DB primitive that already exists, route the literal through it, prove byte-identical via roster parity + conformance, keep a small documented exception set. `_lift_scalar_attrs_by_selector` (convert.py G3-attrs path ~4171) is the universal mechanism; `block_attributes.derived_selector` is the per-block routing data.
**Depends on:** none. **Parallel with:** none. **/qc gate after:** the adversarial-council IS the gate.
**Acceptance:** a phased, council-GO'd build plan where each of the 13 literals has a verdict (reduce → which DB rows/migration; or keep → documented reason).

### Task 2 — Build wave-by-wave (one handler/cluster per wave)
**What:** per the council-GO'd plan, convert each reducible literal to the DB lift (DB rows via `/sgs-update`/dated migration, NOT manual edits) and remove the `if slug==` branch; keep + document the genuine exceptions.
**Why:** removes the FR-22-3 carve-outs; the converter becomes truly per-block-DB-driven. Outcome = fewer literals, same emit.
**Estimated:** ~20-40 min per wave.
**Orchestration:** DELEGATE each wave to a sonnet subagent (via `/delegate`); main agent `/qc-council` + live-verify + commit. Dispatch pattern: sequential per handler (`/subagent-driven-development`) — shared convert.py, do NOT parallelise edits to it. Brief per wave: "convert handler X to the DB scalar-lift, remove the literal, prove byte-identical emit + Gate A + converter_v2 green + roster parity 0-mismatch." Context: DB changes MUST be reproducible (dated migration / overrides), verified by a full `/sgs-update` reseed — never a manual DB edit or module-load side-effect ([[db-changes-reproducible-via-migration-not-manual-or-moduleload]]).
**Depends on:** Task 1. **Parallel with:** none (shared file). **/qc gate after:** yes — `/qc-council` before each commit (blub.db 255) + Gate A.
**Acceptance:** per wave — the literal is gone, emit byte-identical (roster parity 0 mismatches), BOTH conformance suites green, live page-8 unchanged for affected blocks.

## Dependency graph
```
Task 1 (inline Opus design -> /adversarial-council)   <- Rule 7 gate, NO code until GO
  |
Task 2 wave 1 (sonnet build -> /qc-council -> live-verify -> commit)
  |  (sequential — shared convert.py)
Task 2 wave 2 ... wave N
  |
each commit: path-scoped; merge to main via temp-worktree if main is co-actively held
```

## Methodology guardrails (do not skip — carried forward + extended)
- **Emit-green ≠ rendered** — verify the full render chain on the LIVE DOM (attr TYPE → WP supports → render.php → safecss). Grep render.php + the wrapper for the attr BEFORE lifting onto it ([[converter-attr-must-match-the-attr-render-reads]]).
- **TWO conformance suites** — `converter_v2/tests/` (26) AND the Gate A golden harness `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` (43, the pre-commit one). Run BOTH; a subagent "conformance passed" can miss Gate A (D222 lesson).
- **DB changes must be reproducible** — dated `migrations/*.py` for property_suffixes/schema; `ATTR_CLASSIFICATION_OVERRIDES`/`HAS_INNER_BLOCKS_OVERRIDES` for per-attr/composition; `block.json supports.sgs` reproduced by `/sgs-update`. NEVER a manual DB edit or module-load write-side-effect. Verify with a FULL `/sgs-update` reseed ([[db-changes-reproducible-via-migration-not-manual-or-moduleload]]).
- **Roster parity is the byte-identical proof** — for any converter routing change, compare old-branch logic vs the new DB resolver across the whole relevant roster; expect 0 mismatches (D222 used a 31-block parity check). Watch "declares neither" cases (flag-not-drop, FR-22-21 step 6 — never invent an attr name).
- **Deploy before measure** — re-clone via `sgs-clone-orchestrator.py … --converter-v2 --mode draft`; upload via `upload_and_patch.py <run-dir> --target-id 8 --target page --client mamas-munches`. `npm run build` via PowerShell (broken node wrapper in Bash).
- **/qc-council BEFORE every converter/SGS-block commit** (blub.db 255). **/adversarial-council before the de-lit approach** (Rule 7). Fact-check EVERY rater/subagent claim against live ground truth — findings are HYPOTHESES.
- **Commit by explicit path** (`git commit -- <paths>`; the path-scoped hook enforces it). **Merge to main via temp-worktree cherry-pick** if main is co-actively held; verify is-ancestor + staged-count after each push.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit) — Bean directive. Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree.
- **Bean's "are you sure?" on a deletion = a mandate to research, not reassure.** Default KEEP+document over DELETE when a literal's reducibility is uncertain.
- **Pixel-diff is misleading — verify the LIVE DOM (R-22-11), not the number** (empty section = false WIN). Per-row live probes are the acceptance, never the aggregate differ (BEM-blind-spot).

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Is anything co-actively staged? (`git status` — if so, commit ONLY by explicit path.)
3. Have I read the de-literalisation plan (13-literal register) + Spec 22 §FR-22-2/3/21 + decisions D222 end-to-end before proposing a de-lit shape?
4. What is the MEASURABLE acceptance for the wave I'm about to start (byte-identical emit + roster parity 0 + both conformance suites + live page-8), not "code shipped"?
5. Is this change Rule-7 high-blast (it is — convert.py)? Then it goes through `/adversarial-council` (approach) + `/qc-council` (per commit) BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | the de-lit design (Task 1) — per-literal reduce-vs-keep judgement |
| `/gap-analysis` | grade any unit vs its FR acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/converter pattern you're unsure of |
| `/strategic-plan` + `/phase-planner` | if Task 1 needs the phased plan formalised |
| `/adversarial-council` | MANDATORY on the de-lit approach BEFORE building (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block commit (blub.db 255) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone / DB sync / schema + attr TYPES ground truth |
| `/systematic-debugging` | root-cause any "fix didn't render" (emit≠render) |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | per-wave dispatch (sequential on shared convert.py) |
| `/verify-loop` · `/capture-lesson` · `/handoff` | 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools (Playwright fallback on "Browser already in use") | live page-8 DOM + computed-style probes (creds `.claude/secrets/sandybrown.env` — grep/cut, never `source`) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / classification (DB-authoritative; never hardcode counts) |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | only if a literal touches a WC-bound block |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-wave de-lit build — NO commit/deploy authority, returns uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd-council-family rater on the /qc-council pass |
| `wp-sgs-developer` | if a wave needs heavier WP/block work |
| `design-reviewer` | if a wave changes a visible surface (live page-8 3-breakpoint) |

## Guardrails
Cloning thread owns the converter + homepage pipeline. The de-lit programme is council-gated (Rule 7) — design + `/adversarial-council` before any code. Build wave-by-wave, sequential on the shared convert.py, `/qc-council` + Gate A + live page-8 per commit. The align router (D222) is the proven template. The broader clone-fix ledger has ~14 rows still OPEN — those are separate from this programme; the de-lit is the FR-22-3 cleanup, not a ledger-row fix.
