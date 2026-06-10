# Session Handoff — 2026-06-09 (cloning thread, D194 — canonical_slot/wrapper-routing resolution)

> Live handoff. Prior sessions: `.claude/memory/handoff-archive.md` + git history. Next session: `.claude/next-session-prompt.md`. Theme thread co-active — commit by explicit path.

**TL;DR:** D194 settled the canonical_slot/wrapper-routing architecture (content-fork metadata only; structural CSS routes name-free via layer-detection + property_suffixes) — DB tagged, full doc sweep, `/qc` + `/adversarial-council` gated, Bean's `--content-width` draft convention applied, and the hero `contentMaxWidth*` duplicate control deduped + deployed + live-verified. Two commits (`a3e22fbb`, `e49ff126`). No converter code changed — next session writes the Stage-1 universal converter core.

## Completed This Session
1. **D194 decision** — established that `block_attributes.canonical_slot` is **content-fork metadata only** (the emit-child-InnerBlock-vs-scalar decision, gated by `role` + read with `attr_type`), NOT the structural-CSS routing key. Structural wrapper box CSS routes **name-free** via layer detection (OUTER/CONTENT/GRID by CSS signature + position) + the `property_suffixes` table.
2. **DB tagging** — added a bare `content` element-slot (`scope='element'`, `aliases=[]`, `standalone_block=NULL`) via `seed-slot-synonyms.py`; tagged 41 `contentWidth`/`contentPadding*`/`contentMaxWidth*` rows `canonical_slot='content'`/`role='layout'`. Confirmed `/sgs-update`'s `assign-canonical.py` does this deterministically → deleted the redundant `seed-canonical-slots.py` (no parallel infra).
3. **Safety GUARD** — added a structural assertion in `seed-slot-synonyms.py` that fails loudly if the `content` slot ever gains a `standalone_block` (protects 13 stem-collision `text-content` rows from emitting rogue child blocks — the D85 failure mode).
4. **Bean's `--content-width` draft convention** — renamed the 7 inner-wrapper content caps in the Mama's draft from `max-width: Npx` to `max-width: var(--content-width); --content-width: Npx` (deterministic CONTENT-layer signal, disambiguates from a section's own `max-width`). Updated Spec 00 §3.3 + FR-22-21.
5. **Full doc sweep** — propagated D194 across Spec 22/00/29/02, cloning-pipeline-flow/stages, architecture, dev-setup, decisions (D194); de-conflicted the Wave-2 design docs (STAGE1-DESIGN/STAGE0-FRS/SIGN-OFF-LEDGER/CLONE-FIX-BUILD-PLAN) + the 2026-06-03 plan + fixed the Method-2 plan's "curated canonical_slot map" → "layer→property_suffixes map" contradiction.
6. **`/qc`** passed (closed one stale-doc gap in the design-gate doc); **`/adversarial-council`** (6 personas) returned GO-conditional, validated the core split, and surfaced the Commit-2 build contract now recorded in STAGE1-DESIGN.md.
7. **Wave-2 prompt files removed** (STAGE1-HANDOFF-PROMPT.md + CANONICAL-SLOT-BACKFILL-PROMPT.md) — consolidated into the main `.claude/` opener per Bean.
8. **Hero dedup (DONE — committed `e49ff126`)** — removed the dead per-hero `contentMaxWidth*` duplicate control (4 attrs + 2 editor controls + legacy render path); universal wrapper `contentWidth` now owns the cap; deprecation `migrate()` carries `contentMaxWidth`→`contentWidth`. Built + deployed to the sandybrown canary + OPcache reset; live-verified (deployed block.json has 0 `contentMaxWidth`, page-8 hero renders with no cap regression — cap was 0/none before+after); visual-diff PASS (`reports/visual-diff/hero-2026-06-09.md`); 4 orphaned DB rows pruned.

## Current State
- **Branch:** main at `e49ff126` — two commits this session: `a3e22fbb` (D194 decision + DB tag + full doc sweep + `--content-width` draft convention + guard) and `e49ff126` (hero `contentMaxWidth*` dedup, deployed + live-verified).
- **Tests:** no converter code changed; `seed-slot-synonyms.py` py_compiles OK; guard verified passing; hero block builds + deploys clean; visual-diff gate PASS for hero.
- **Build:** sgs-blocks rebuilt + deployed to the sandybrown canary (blocks-only) + OPcache reset.
- **Uncommitted changes:** none of this session's work (both commits pushed). Co-active Spec-28 files (`2026-06-06-spec27-28-...`, `lucide-icons.php`, `theme-snapshot.json`, phase4 reports) were left untouched/uncommitted — they belong to the other thread.

## Known Issues / Blockers
- None block the next session. The parity2 node-matcher reliability gap (Task 1) is the first thing to fix so the fidelity gauge is honest before converter work.

## Next Priorities (in order)
1. **parity2 containment fallback** — make the gauge honest before building (Task 1).
2. **Gate A + Gate B harnesses** — wired to prebuild + pre-commit (Task 2; canonical_slot backfill is DONE/RETIRED as a gate).
3. **Stage 1 universal converter core (Method-2)** — honour the council-hardened Commit-2 build contract in STAGE1-DESIGN.md (per-block attr resolution not prefix-concat; `slot_has_equivalent_block`; `--content-width`/signature detection + falsification list; co-located layers).
4. **DB-usage conformance Tier-1** + the council DB-hygiene fix (exclude non-box `content*` enums in assign-canonical).

## Files Modified
| File | What changed |
|------|-------------|
| `.claude/decisions.md` | Added D194 |
| `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` | FR-22-2.1 (Tier A + role + attr_type), FR-22-21 (layer→prefix table + `--content-width`/signature detection), FR-22-3 (inner-slot abandoned) |
| `.claude/specs/00-naming-conventions.md` | §3.3 — `--content-width` draft convention |
| `.claude/specs/29-CONTAINER-EQUIVALENT-BLOCKS.md` | Name-free routing §; contentWidth mapping |
| `.claude/specs/02-SGS-BLOCKS.md` | `__inner` folds structurally; canonical_slot is content-fork metadata |
| `.claude/cloning-pipeline-flow.md`, `-stages.md` | canonical_slot = content-fork; structural via property_suffixes; per-stage DB annotations |
| `.claude/architecture.md`, `.claude/dev-setup.md` | canonical_slot clarification; assign-canonical = deterministic mechanism, one physical DB |
| `.claude/reports/wave2/WRAPPER-CSS-ROUTING-DESIGN-GATE.md` | NEW — D194 design + full impact map |
| `.claude/reports/wave2/{STAGE1-DESIGN,STAGE0-FRS-AND-GATE,SIGN-OFF-LEDGER,CLONE-FIX-BUILD-PLAN}.md` | de-conflicted canonical_slot-as-routing-key; Commit-2 build contract added to STAGE1-DESIGN |
| `.claude/reports/wave2/{STAGE1-HANDOFF-PROMPT,CANONICAL-SLOT-BACKFILL-PROMPT}.md` | DELETED (consolidated into main opener) |
| `.claude/plans/archive/2026-06-03-...md`, `.claude/plans/archive/2026-06-04-method2-converter-lift-design.md` | name-free language; method2 "curated canonical_slot map" wording fix |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` | added `content` slot row + the standalone_block GUARD |
| `sites/mamas-munches/mockups/homepage/index.html` | 7 inner-wrapper caps → `--content-width` |
| `.claude/{state,handoff,next-session-prompt}.md` | this handoff |

## Outcome assessment (Gate 3.5)
- **OUTCOME ACHIEVED** — the architectural decision (D194) is made, recorded, propagated, and quality-gated; the DB state matches the docs; the draft convention is applied. This session's goal was a decision + clean docs/DB, not converter behaviour. The Ship-PM persona correctly flagged that **no converter code shipped** — that is by design; the converter build is the NEXT session (Stage 1), now unblocked with a council-hardened contract.

## Notes for Next Session
- `canonical_slot` is metadata, NOT the structural router (D194). Do not rebuild a canonical_slot-keyed router — the Method-2 plans + the de-conflicted Wave-2 docs are the reference.
- Hero diverges: it uses `contentMaxWidth*` where 28 blocks use `contentWidth` — the Commit-2 resolver must be a per-block lookup, not prefix-concatenation. Flag for rename-or-sanction.
- The `content`-slot `standalone_block`-NULL invariant is now guarded in code; Gate A should also assert it.
- One physical `sgs-framework.db` (`.claude` + `.agents` paths are the same file via NTFS junction; uimax DB holds neither `block_attributes` nor `slots`).

## Next Session Prompt

The full orchestration plan is in `.claude/next-session-prompt.md` (autopilot reads it at session start). It carries the 7 non-negotiable rules, the methodology guardrails, and the 5 tasks with per-task orchestration blocks. Mandatory tooling tables (also in that file):

~~~
Invoke /autopilot first. Read .claude/next-session-prompt.md + .claude/handoff.md IN FULL, then the DO-NOT-REDESIGN box in cloning-pipeline-flow.md, then STAGE1-DESIGN.md (Commit-2 build contract) + WRAPPER-CSS-ROUTING-DESIGN-GATE.md (D194), before touching the converter.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Stage-1 design scoping (ALWAYS for design) |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/strategic-plan` | order the Stage-1 commit sequence |
| `/research` | when a decision isn't clear |
| `/qc-council` / `/adversarial-council` | per-converter-commit gate |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 3/4 dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verify (375/768/1440; login via .claude/secrets/sandybrown.env) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | heavy converter/block builds |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Tasks
1. parity2 containment fallback (make the gauge honest).
2. Gate A + Gate B harnesses (wired to prebuild + pre-commit).
3. Stage 1 universal converter core (Method-2) — honour the Commit-2 build contract.
4. DB-usage conformance Tier-1 + assign-canonical content* enum exclusion.
5. Doc-drift refresh (as capacity).

## Guardrails
canonical_slot is content-fork metadata NOT the structural router (D194); name-free routing via property_suffixes + layer-detection; per-block attr resolution not prefix-concat; /qc-council before every converter commit; commit by explicit path (theme thread shares main); deploy before measure; verify on the real homepage.
~~~
