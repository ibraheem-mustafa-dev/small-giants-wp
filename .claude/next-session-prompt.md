---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-16
primary_goal: "Rebuild the grid/container-extraction system so the converter faithfully maps EVERY value sgs/container can hold (and the draft's equivalent wrappers hold) into EVERY composite block, with correct responsive — then fold the hero (Stage 2) + product-card (Stage 3) + remove the wrap_inner carve-out (Stage 4). The de-cheat foundation (faithful ratios + 768/1024 device-tier breakpoints) is SHIPPED. Parity baseline: content 100% all sections; full mobile 61.82% / tablet 59.09% / desktop 55.45% (fidelity drops as viewport widens — desktop layout weakest)."
---

# Next session — grid/container-extraction rebuild → hero fold (Stage 2-4)

> Invoke `/autopilot` first. READ Spec 22 + 29 + WRAPPER-CSS-ROUTING-DESIGN-GATE + the wrapper + the variant DB BEFORE proposing any fix-shape. D-ceiling: D228.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important` default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on canary page 8 vs the draft. Emit-green ≠ rendered.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding pipeline, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-16 close — D228)
This session recovered a missing-hero bug (converter `_trace` dict-positional → whole-section soft-fail), reconciled all loose branches into a single clean `main`, fixed two visible bugs (Issue A hero full-bleed hacks; Issue B multi-button double-nesting), and **de-cheated the container grid**: the wrapper now transfers the explicit `gridTemplateColumns*` ratio FAITHFULLY (the `sgs-cols-* repeat(N,1fr) !important` shorthand only emits when no explicit ratio is set) and device-tier breakpoints are unified to **768/1024** across the wrapper + the converter's `_GRID_TABLET_BP`. That is the FOUNDATION for the rebuild. Bean's framing (now CLAUDE.md rules): composites are never a separate system; hardcoded wrapper defaults are cheats to remove not blockers; device-tier vs arbitrary visual breakpoints are distinct; variant setups are DB-defined.

## First action
Smallest first action (~5 min, zero deps): query the variant DB + read the container schema to ground the rebuild — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug,variant_value,unique_slot FROM variant_slots"` + `... block_attributes WHERE block_slug='sgs/container'`, and skim `SGS_Container_Wrapper` grid/responsive emission (class-sgs-container-wrapper.php ~L400-520, ~L760-1000).

## Mandatory READING (before any fix-shape)
1. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-21 (3-layer model) · `29-CONTAINER-EQUIVALENT-BLOCKS.md` · `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`.
2. `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` — the SHARED wrapper (every composite renders through it). Grid: ~L405 `$grid_on_inner`/`$has_band_props`, ~L639 sgs-cols gating, ~L948-958 responsive ratio emit, ~L1180 `$do_wrap`/`__inner`.
3. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `_GRID_TABLET_BP` (~5232), the composite-interior routing (~L4195-4308), `_fold_layout_into_attrs`, `_route_interior_css_to_parent_slot`.
4. **The variant DB** — `variant_slots` + `blocks.variant_attr` DEFINE each variant's setup (sgs/hero split = gridTemplateColumns/splitGap/splitImage*). Query, never guess (`feedback_ground_in_variant_db_for_variant_block_setups`).
5. The hero render: `src/blocks/hero/render.php` ~L290-387 (manual split grid + wrap_inner=false — the divergence to fold) + the per-client mockup CSS `theme/sgs-theme/styles/mamas-munches.css` (hero 1-col <768, 2-col ≥768).
6. `.claude/decisions.md` D228 + `.claude/parking.md` + the prior defect register `.claude/reports/2026-06-14-clone-vs-draft-defect-register.md` (Fam B/C/D/E/F — fix AFTER the grid foundation).

## Tasks

### Task 1 — Grid/container-extraction rebuild [THE FOUNDATION — design first]
**What:** make the converter recognise + faithfully insert EVERY value `sgs/container` can hold (and the draft's equivalent wrapper holds) into EVERY composite with the shared wrapper, including responsive (Mobile/Tablet/Desktop at 768/1024). Ground in `sgs/container` block.json + the DB (variant_slots, property_suffixes, modifier_suffixes, block_attributes) + `SGS_Container_Wrapper` END-TO-END.
**Why:** the de-cheat fixed the ratio + breakpoints, but the full container-capability → composite mapping is incomplete (parity full-fidelity drops to 55% desktop). This is the root lever.
**Estimated:** design ~30 min; build per-capability.
**Orchestration:** `/brainstorming` design mode (Opus) → `/adversarial-council` on the routing shape (Rule 7, shared mechanism) → Bean design-gate → delegate build to sonnet subagents (`/subagent-driven-development`, NO commit authority) → `/qc-council` + BOTH conformance suites + live page-8 verify.
**Depends on:** none. **/qc gate after:** `/qc-council` + live-DOM.
**Acceptance:** a draft container/composite's full capability set (width, padding, gap, grid ratio, responsive tiers, align, background) round-trips to the live clone at all 3 breakpoints; parity full-fidelity rises measurably.

### Task 2 — Hero fold (Stage 2) → product-card (Stage 3) → remove wrap_inner option (Stage 4)
**What:** drop the hero's manual `$styles` grid + `wrap_inner=false` and route its split grid through the now-faithful helper (the variant DB defines split = gridTemplateColumns/splitGap; keep the order-swap @media which the helper doesn't do). Then drop product-card's `wrap_inner=false` (Stage 3), then remove the `wrap_inner` option entirely from the wrapper (Stage 4).
**Why:** `wrap_inner=false` is the last hero carve-out; the de-cheat removed the blockers (sgs-cols override, breakpoint mismatch) that made an earlier attempt regress.
**Estimated:** Stage 2 high-risk (~45 min, bespoke split responsive); 3+4 low.
**Orchestration:** design plan from Task 1 → `/adversarial-council` (Rule 7) → SDD build → `/qc-council` + live page-8 verify the split hero at 375/768/1440 renders IDENTICALLY (2-col ≥768, 1-col stacked <768, order-swap).
**Depends on:** Task 1 (faithful wrapper). **Parallel with:** none. **/qc gate after:** yes — live-verify the split hero per breakpoint.
**Acceptance:** the split hero renders identically post-fold at all 3 breakpoints; wrap_inner option gone; conformance green.

### Task 3 — Family defect register (Fam B/C/D/E/F) [after the grid foundation]
**What:** the prior register's 5 systemic converter families (B unitless line-height · C mobile heading type · D max-width/Method-2 · E image styling · F grid breakpoints). Several may partially resolve once Task 1 lands.
**Orchestration:** per-family `/brainstorming` + `/adversarial-council` + SDD + `/qc-council` + live per-row. **Depends on:** Task 1. **Acceptance:** each family's rows VERIFIED via live computed-style on page 8.

## Dependency graph
```
First action (variant DB + container schema + wrapper grounding)
  → Task 1 (grid rebuild — /brainstorming → /adversarial-council → Bean gate → SDD → /qc-council + live)
      → Task 2 (hero fold Stage 2 → product-card 3 → remove wrap_inner 4; live-verify split hero 3 breakpoints)
      → Task 3 (Fam B/C/D/E/F register — several resolve post-Task-1)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); visual change needs reports/visual-diff/<block>-<date>.md (verdict PASS) or the pre-commit gate blocks
```

## Methodology guardrails (do not skip — carried forward + extended D228)
- **Device-tier ≠ arbitrary visual breakpoints (NEW D228).** Device-tier (SGS Mobile/Tablet/Desktop attrs, wrapper + `_GRID_TABLET_BP`) = 768/1024, consistent. A single rule's VISUAL breakpoint (min-width:600, WP-columns 781) is legitimate + must NOT be blanket-changed. NEVER a blind "fix all 599/600" sweep; classify each. A mechanical/Haiku agent cannot make this call. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **Hardcoded wrapper defaults are CHEATS to remove, not blockers (NEW D228).** A `!important` injection overriding faithful CSS transfer is an R-22-1 violation — remove/gate it; don't frame it as a wall. (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **Composites are NEVER a separate system (NEW D228).** Hero/cta-section/trust-bar all render through `SGS_Container_Wrapper`; per-block hacks are bugs. Ground variant grids in `variant_slots`/`blocks.variant_attr`, don't guess.
- **An empty cloned section is usually a cv2 soft-fail (NEW D228)** — read extract.json per_section `status` + trace.jsonl `stage_4_converter_v2_softfail` exception BEFORE blaming recognition.
- **Emit-green ≠ live-verified — verify the rendered page (R-22-11).** NO register row closes without a live computed-style read on page 8. clone-parity BEM matcher + parity2 aggregate are triage-only.
- **Read the implementing SCRIPT before proposing/critiquing ANY converter/wrapper/seeding mechanism** — never trust spec `built_status:` labels or attr/column names; grep the real emitter (blub 353).
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + bump version (Hostinger CDN 7-day) BEFORE any pixel/DOM probe.
- **Root-cause FAMILY before instance fix** — group + fix universally (R-22-9). Per-section tuning is the anti-pattern.
- **TWO conformance suites** — Gate A `scripts/tests/test_converter_conformance.py` (pre-commit) AND `converter_v2/tests/`. Run BOTH (`python -m pytest`).
- **DB changes reproducible from the canonical path** (block.json `supports.sgs` auto-seed OR dated `migrations/*.py`), verified by a FULL `/sgs-update` reseed — NEVER a manual DB edit.
- **/qc-council BEFORE every converter/SGS-block/seeding commit** (blub 255). **/adversarial-council before any shared-mechanism change** (Rule 7).
- **Commit path-scoped** (`git commit -m "msg" -- <paths>` — `-m` BEFORE `--`; a `-m` after `--` is silently treated as a pathspec and the commit fails). A visual change needs `reports/visual-diff/<block>-<date>.md` (verdict PASS + first_paint_capture_passed true) or the pre-commit gate blocks; `--no-verify` only with Bean's explicit OK.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit). Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree (a rater once wiped uncommitted work this way).
- **Bean's "are you sure?"/"why?"/"how does X work?" on a hardcode/deletion/claim = a mandate to GROUND in the architecture (block.json + DB + wrapper + render), not reassure.**
- **The SGS evidence gate is ARMED** — emit `GROUND-TRUTH:` before any SGS framework edit; toggle it OFF for a mechanical multi-edit run via `touch ~/.claude/.sgs-gate-off` and re-arm (`rm`) at close.

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline + the SHARED wrapper + state.md/handoff/next-session-prompt.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Anything uncommitted? (`git status` — commit ONLY by explicit path, `-m` before `--`.)
3. Have I QUERIED the variant DB + READ the container block.json + `SGS_Container_Wrapper` + the implementing convert.py line BEFORE proposing any fix-shape? Am I treating a wrapper hardcoded default as a cheat-to-remove, not a blocker?
4. Is this breakpoint a DEVICE-TIER value (fix to 768/1024) or an arbitrary VISUAL breakpoint (leave alone)? Have I classified it before touching it?
5. What is the MEASURABLE acceptance (live computed-style on page 8 = draft at all 3 breakpoints) — not "code shipped"/"conformance green"? Is this Rule-7 high-blast (converter/shared wrapper/seeding)? → `/adversarial-council` + `/qc-council` BEFORE/AROUND the build.

## Tool bindings

### Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Task 1 grid-rebuild routing shape + Task 2 hero-fold design (design mode) |
| `/gap-analysis` | grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/theme.json/block.json/grid pattern you're unsure of |
| `/strategic-plan` + `/phase-planner` | if the grid rebuild needs a formal phased plan |
| `/adversarial-council` | MANDATORY on every shared-mechanism/wrapper/converter change (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding commit (blub 255) |
| `/subagent-driven-development` · `/subagent-prompt` | per-task dispatch (subagents implement, no commit authority) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | live page-8 DOM + computed-style at 375/768/1440 — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); canary = `?page_id=8` on `WP_URL_SANDYBROWN` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + WP-native supports |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | container attrs / variant_slots / blocks.variant_attr / container_kind / derived_selector (DB-authoritative) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | Task 1/2 build — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on `/qc-council` passes (NOT for breakpoint or container-architecture judgment calls) |
| `wp-sgs-developer` | heavier WP/block.json/render.php work (hero render, composite blocks) |
| `design-reviewer` | visible-surface changes (live page-8 at 375/768/1440) |

## Guardrails
Cloning thread owns the converter + homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding. Converter + shared-wrapper + seeding changes are Rule-7 high-blast → design-gate. Build per capability/family, `/qc-council` + Gate A + live page-8 per commit. Run BOTH conformance suites. A visual change needs a passing `reports/visual-diff/<block>-<date>.md`. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D228).
