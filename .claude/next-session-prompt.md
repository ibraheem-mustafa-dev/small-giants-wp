---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-09
primary_goal: "D194 resolved the canonical_slot/wrapper-routing architecture (content-fork metadata only; structural CSS routes name-free via layer-detection + property_suffixes) — DB tagged, full doc sweep done, /qc + /adversarial-council gated, Bean's --content-width draft convention applied. Next: Stage 1 of the clone-fix build — the universal converter core (F1-consolidate + F1-cross-node NET-NEW + carve-out removal), now carrying the council-hardened Commit-2 build contract."
---

# Next session — Stage 1 universal converter core (Method-2), council-hardened

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL before acting. Read the "How cloning fidelity works — DO NOT REDESIGN THIS" box at the top of `cloning-pipeline-flow.md` BEFORE touching the converter. Then read `.claude/reports/wave2/STAGE1-DESIGN.md` (the council-hardened build plan — now carries the **Commit 2 build contract** from the 2026-06-09 adversarial-council) + `.claude/reports/wave2/WRAPPER-CSS-ROUTING-DESIGN-GATE.md` (D194 — why canonical_slot is NOT the structural router).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every action — violation conditions shown)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. The trust-bar bound cheat is PURGED (D182). ONLY the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(Violation: any new `sourceMode='bound'` emit.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification to change the condition itself.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. **parity2 (Stage 11.5) produces this — but its node-matcher has a known reliability gap (Task 1 fixes it); diff the EMIT vs the DRAFT directly when in doubt.**
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output, a test page, or the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English — after the 2026-06-09 D194 session)

D194 resolved a real architectural confusion: `canonical_slot` is **content-routing metadata only** (the "emit child InnerBlock vs scalar" fork, gated by `role` + read with `attr_type`) — it is NOT how structural wrapper box CSS finds its destination attr. Structural box CSS (`contentWidth`/`contentPadding*`/`gridItem*`) routes **name-free**: the converter detects the LAYER (OUTER/CONTENT/GRID) by CSS signature + structural position, then resolves the destination attr via `property_suffixes` (this matches the already-correct Method-2 plans; the Wave-2 docs had drifted into a canonical_slot-keyed router, now de-conflicted). The 41 `content*` attrs are tagged `content`/`layout` for convention-consistency only — `/sgs-update`'s `assign-canonical.py` does this deterministically, so the manual seed script was deleted. Bean also added a **draft convention**: inner-wrapper content caps now use `--content-width` (a deterministic CONTENT-layer signal) distinct from a section's own `max-width`. A 6-persona adversarial-council returned **GO-conditional** and surfaced a Commit-2 build contract (now in STAGE1-DESIGN.md). **No converter code changed this session** — it was DB + docs + draft convention. The next session writes the actual converter.

---

## Task 1 — parity2 containment fallback (so we can MEASURE) [inline, FIRST]

**What:** in `plugins/sgs-blocks/scripts/parity2/transfer_checker.py`, add a containment fallback to `_build_anchors`/`_fallback_match`: when a draft leaf's normalised `ownText` isn't an exact clone `ownText` match (converter restructured the section — testimonials→slider, brand), match it to the smallest clone node whose `text` CONTAINS the draft ownText, scoped to the same section, BEFORE the structural fallback that picks a wrong node (footer).
**Why:** the gauge is the blocker — real converter gains are invisible while the matcher mis-pairs nodes. `css_dropped` lists can't be trusted for fix decisions until this lands.
**Verify:** re-score existing captures (no re-clone): `python plugins/sgs-blocks/scripts/parity2/parity2.py --captures <run>/parity2-captures.json --viewport 1440`. Confirm brand/testimonial-slider stop scoring 0% spuriously.
**Acceptance:** brand + testimonial-slider score non-zero on re-scored captures; no footer mis-pairing in the matched set.

## Task 2 — Stage 0 gate harnesses [after Task 1; parallel-able]

Stage-0 Commit 0a (canonical_slot backfill) is **DONE + RETIRED as a gate** (D194 — the routing never depended on it; the 41 rows are tagged metadata maintained by `/sgs-update`). Remaining Stage-0 gates:

- **Gate A — converter golden-fixture conformance harness** (gates the first Stage-1 commit). One fixture/section + per-VERIFIED-issue regression lock. Mirrors `check-dead-controls.js`; wired into prebuild + pre-commit. **Council ask:** seed an assertion that `contentWidth`/`sgs/hero` resolves to `content`/`layout` AND that no `content`-slot row has a `standalone_block` (protects the 13 stem-collision text-content rows — the guard now also lives in `seed-slot-synonyms.py`).
- **Gate B — `check-hardcoded-render-defaults.js`** (blocks the FIRST F3 fix — build BEFORE any F3). Promoted to Stage 0 (qc-council: shipping F3 before the guard re-creates the D178 rot).

**Acceptance:** both gates wired to something that RUNS (prebuild + pre-commit — grep the wiring, per `dont-claim-a-guard-is-enforced-unless-wired`), and each fails loudly on a seeded violation.

## Task 3 — Converter Method-2 Stage 1 core [design-gated DONE; own branch; AFTER Tasks 1+2]

The design is council-hardened (this session's `/adversarial-council` = GO-conditional; the must-fixes are in STAGE1-DESIGN.md "Commit 2 build contract"). Build the universal DB-driven per-slot CSS dispatch replacing the 4-lift-path + 2-carve-out architecture.

**Honour the Commit-2 build contract (council-surfaced):**
- **Per-block attr resolution, NOT prefix concatenation.** Hero uses `contentMaxWidth*`, the other 28 blocks use `contentWidth` — `{prefix}+{suffix}` string-concat can't generate both. The resolver must be a per-block lookup: `(block_slug, layer, css_property) → the block's actual attr_name`. (Also flag hero's `contentMaxWidth*` divergence — rename to `contentWidth` OR document as a sanctioned exception.)
- **`slot_has_equivalent_block(block_slug, slot_name)`** — query `WHERE block_slug=? AND canonical_slot=? AND role IN (<content-bearing>)`; do NOT use the attr-keyed `equivalent_block_for` (the qc-council fatal catch).
- **CONTENT-WIDTH detection:** `--content-width` custom-property declaration [deterministic, Bean drafts] OR `max-width`+margin-centring signature [fallback, scraped]. Honour the falsification list in STAGE1-DESIGN (width:min/clamp, margin-inline, longhand margin, section-root max-width, flex-grid, padding-centring → gap-candidate, never guess).
- **Co-located layers** (one element = OUTER+CONTENT+GRID, e.g. `.sgs-brand`, `.sgs-trust-bar__inner`): route its CSS to ALL matching layers' attrs on the same container. Layer detection runs on the post-fold tree, non-exclusive.

**Orchestration:** `/subagent-driven-development` on the universal mechanism. `/qc-council` (blub.db 255) + live page-8 verify + parity2 (now trustworthy, per Task 1) pre/post per commit.
**Acceptance:** per-composite live-DOM sign-off (R-22-11/R-22-13); the universal dispatch routes correctly for EVERY composite + array block, not just the canary number.

## Task 4 — DB-usage conformance Tier-1 [parallel with Task 3]

From `.claude/reports/2026-06-07-db-conformance-audit-factcheck.md` §4: **V1** `_sgs_bem_regex()` hardcoded despite "DB-driven" docstring — fix or delete the docstring; **V2** converter's `write_attribute_gap_candidate()` writes to sgs DB — re-ground on FR-22-8.1; **V3** enforce `modal`/`mobile-nav` exclusion in `_is_container_mirror_block()`. Plus the council DB-hygiene SHOULD-FIX: add a `_CANONICAL_EXCLUSIONS` entry in `assign-canonical.py` for non-box `content*` stems (`contentLayout`/`contentType`/`contentPosition`/`contentImpact` are enums mis-stem-collided to `content`; inert via the role gate but semantically wrong).

## Task 5 — Doc-drift refresh [mechanical, as capacity]

Refresh stale counts from the conformance audit: Spec 21 heat-map, dev-setup.md counts, Spec 29 roster, pipeline-stages.md DB labels. Consider auto-generating Spec 21 heat-map + Spec 29 roster from DB (like Spec 02).

---

## Dependency graph
```
Task 1 (parity2 containment fallback — makes the gauge honest)
   ↓
Task 2 (Gate A + Gate B harnesses)
   ↓ both gates green
Task 3 (Stage-1 converter core, own branch, council build-contract)  ║  Task 4 (conformance Tier-1)  ║  Task 5 (doc refresh)
   ↓ /qc-council per commit + parity2 (now honest) + live page-8 verify
commit by explicit path + push to main
```

## Methodology guardrails (do not skip)

- **PRIMARY-SOURCE FIRST.** Diagnose by reading SCRIPTS (`convert.py`/`db_lookup.py`) + DB tables, then diff the EMITTED output (`extract.json`) against the DRAFT directly. Treat parity2 / pixel-diff / council verdicts as HYPOTHESES — verify against the raw emit before building.
- **Fidelity verifier: SOURCE is the 100% denominator.** Match by content/nesting/role (class-agnostic), NEVER by class/DOM-path. parity2's model.
- **De-weighting a metric category can hide the real issue** — surface content/layout/css SEPARATELY; weight the load-bearing one into the verdict.
- **Subagent registers are HYPOTHESES — fact-check load-bearing claims** in the main thread before acting (`feedback_read_ground_truth_before_concluding`).
- **A user invoking a rule ≠ confirmation of your fix (blub.db 329).** "This breaks Rule X" confirms the BREACH — not your interpretation. READ the canonical design doc + state the architectural primitive in plain English BEFORE recording/acting on any fix-shape.
- **Don't claim a guard is enforced unless wired to something that runs** — grep `.github/workflows` / husky / package.json / settings.json hooks + confirm it runs (`dont-claim-a-guard-is-enforced-unless-wired`).
- **DO NOT REDESIGN the cloning converter.** The fix is ALWAYS completing the DB-driven attribute-transfer onto `sgs/container` (and the mirrored composites). `sgs/container` is the RIGHT target — do NOT force bespoke composites.
- **canonical_slot is content-fork metadata, NOT the structural router** (D194). Structural box CSS routes name-free via layer-detection + `property_suffixes`. Do NOT rebuild a canonical_slot-keyed router.
- **Heavy subagents tightly scoped.** They die at ~100+ tools and leave wrong half-baked changes. Scope each to specific files + exact fixes; revert context-tail failures to a clean base (STOP #19).
- **Live verification must SELECT blocks**, not just insert — editor inspector bugs only surface on selection; editor `isValid` ≠ frontend-correct.
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity2 run.
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Outcome vs completion** — don't mark a task done unless the OUTCOME landed (live-verified / verified from the emit), not just code shipped.
- **/qc-council BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **`--converter-v2` required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging; **`--mode draft` auto-skips the autonomy gate.**
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`.
- **No legacy-spec archaeology in truth docs** — point forward to current replacement or remove.

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Stage-1 design scoping — ALWAYS for design decisions |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/strategic-plan` | order the Stage-1 commit sequence before writing code |
| `/research` | auto-routes to the right tier when a decision isn't clear |
| `/adversarial-council` or `/qc-council` | per-converter-commit gate (build-contract is already council-hardened) |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 3/4 dispatch |
| `/sgs-clone` | re-clone page 8 (`--deploy-target page:8 --converter-v2 --mode draft`) |
| `/sgs-update` | after any block schema / DB change |
| `/verify-loop` | 2-attestation (emit + trace) per load-bearing claim |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verification (375/768/1440, cache-bust `?cb=N`; wp-admin login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (if registered; else `general-purpose` sonnet) | heavy converter/block builds (Task 3/4) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Deploy / verify quick ref
- Blocks: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty` (PowerShell) → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Re-clone: `python plugins\sgs-blocks\scripts\sgs-clone-orchestrator.py --mockup sites\mamas-munches\mockups\homepage\index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8`
- Re-score parity2 on existing captures (fast, no re-clone): `python plugins/sgs-blocks/scripts/parity2/parity2.py --captures <run>/parity2-captures.json --viewport 1440`.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Diff the EMIT directly: `<run>/extract.json` vs mockup CSS.
