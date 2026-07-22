---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1 — converter resolver + variant fronts DONE + pushed (2026-07-22). Next = conformity audit → /plan Spec 31 completion (tier-0 scripts + tier-1 Haiku first, parallelise, then Sonnet)."
generated: 2026-07-22
track: 1-converter
note: "Track 1's prompt lives HERE, not .claude/next-session-prompt.md — that canonical path is contended by Track 2 (Spec 37). See the top warning."
---

# Track 1 — Next Session Prompt (2026-07-22)

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav), and the
> two tracks CONTEND for `.claude/next-session-prompt.md` — Track 2 currently owns that
> canonical path. **THIS is Track 1's prompt** (`next-session-prompt-track1-converter.md`).
> Track 2 also owns `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, the
> D-numbering cadence. Path-scope every commit; re-check `git branch --show-current` in the
> SAME command as the commit; NEVER `git add -A`.
> **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported** — on this
> shared checkout a co-active commit can race in and the reported HEAD may be theirs (this bit
> us: a Front-2 commit "reported" a hash that was Track 2's ledger commit; the real changes sat
> uncommitted until re-committed + verified).

## Plain-English state (where we are)

Track 1 landed the **converter resolver + variant fronts** and pushed both:
- **Front 1 (`7a6a7586`, pushed):** the routing resolver was under-keyed — it returned every
  attr sharing a (block, CSS-property) pair (incl. tier/hover siblings) and took the first by
  row order. Now keyed to the base-resolver domain (root element, base/desktop tier, base
  state), fail-loud on genuine ambiguity. Also fixed a pre-existing `:hover` state-separation
  bug it unmasked: a new shared `tier_state_suffix` helper applies tier+state re-append across
  **all four box resolvers** (outer_box/content_band/grid/grid_area), so a `:hover` border
  routes to `{attr}Hover`, not the base attr. converter/tests **10 failing → 0** (449 pass);
  Gate A byte-identical (18 pre-existing stale goldens). Front 3 (container band-width `800px`
  seed) + 2 cleanups (option-picker role at source; dead `CONTROL_COMPONENT_MAP` removed)
  rode in this commit.
- **Front 2 (`ccfb7967`, pushed):** trust-bar `image-badge` had zero discriminators
  (undetectable) and the F6 gate flagged icon-circle's 5 css markers as "lift-producible".
  Added 4 genuine image controls (`badgeImageBorderRadius/Size/Shadow/ObjectFit`) that double
  as image-badge's recogniser (scoped CSS, Spec 32; conditional inspector panel); rewrote the
  F6 gate from "no lift-producible discriminator" to an **ambiguity rule** (2+ variants sharing
  an identical/empty signature = violation; one zero-signature fallback allowed). **F6 0
  violations** (was 5; negative-control-verified it still bites); converter 449; db-consistency
  52. Built via `/subagent-driven-development` (implementer + reviewer; reviewer's Important
  shadow-allowlist finding fixed).

**Committed-and-pushed; NOT live-clone-verified** (Bean-approved: no clone-verify this session).
The visual-diff gate was bypassed with `--no-verify` per its own guidance for non-visual changes.

## THIS SESSION'S PLAN (Bean-directed)
1. **Conformity audit** — docs/data vs live code + DB (dispatch parallel `Explore`/`general-purpose`
   to spot-check high-traffic specs, esp. Spec 31, against the live converter + `/sgs-db` counts).
   Also reconcile the deferred shared-doc items below — ONLY when Track 2 is idle, committed atomically.
2. **`/plan` Spec 31 completion**, ordered **tier-0 (scripts) + tier-1 (Haiku, mechanical) FIRST**;
   map **file-independent** tasks → parallelise (`/dispatching-parallel-agents`); **overlapping** →
   combine; then layer in **Sonnet** subagents for reasoning-heavy tasks. Maximise fan-out; sequence
   only where files/state collide.

## MANDATORY READING GATE (before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked).
3. `.claude/STOP-CATALOGUE.md` — pre-flight ritual (Track 2's file; read, don't rewrite mid-race).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design gates before any converter/spec change |
| `/gap-analysis` | Grade the conformity-audit output |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | Auto-routes research tier when a decision is unclear |
| `/strategic-plan` + `/phase-planner` | Plan + break down the spec-completion order |
| `/dispatching-parallel-agents` | Fan out file-independent tier-0/tier-1 tasks |
| `/subagent-driven-development` | Implementer + reviewer loop per converter task |
| `/delegate` | Route every dispatch (Haiku mechanical / Sonnet architectural) |
| `/qc-council` | Multi-rater before any converter/pipeline/SGS-block commit (blub.db 255) |
| `/sgs-db` + `/wp-blocks` | DB authoritative — never hardcode a count |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (sgs-db.py) | Block schema/attrs/variants/counts |
| `python ~/.claude/hooks/wp-blocks.py` | Block schema/markup/variations before "missing X" |
| Playwright MCP | Live-page verification if a task needs it (clone-verify deferred by default) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Any converter/block build (constrain: no deploy/commit unless told) |
| `Explore` / `general-purpose` | Parallel conformity-audit spot-checks (docs vs live code/DB) |
| `feature-dev:code-reviewer` | Cross-check reviewer in the subagent-driven loop |

---

## Task 1 — Conformity audit (docs/data vs live code + DB)
**What:** Spot-check high-traffic specs (esp. Spec 31) + doc counts vs live converter + `/sgs-db`; reconcile the deferred shared-doc items below.
**Why:** Catches drift before planning spec-completion on a stale map.
**Orchestration:** delegated — parallel `Explore`/`general-purpose` (Haiku/Sonnet via `/delegate`), file-independent → concurrent. Depends on: none. /qc gate: `/gap-analysis` on findings.
**Acceptance:** a drift findings list (wrong FR status / count drift / spec-vs-code divergence), each mapped to a fix; deferred shared-doc items reconciled + committed atomically.

## Task 2 — `/plan` Spec 31 completion (tier-0/tier-1 first, parallelise)
**What:** Strategic + phase plan for remaining Spec 31 scope, ordered tier-0 scripts → tier-1 Haiku → Sonnet, with a parallel/sequential dependency map.
**Why:** Maximise cheap parallel throughput before expensive reasoning.
**Orchestration:** inline (`/strategic-plan` → `/phase-planner`), then `/dispatching-parallel-agents` (file-independent) + `/subagent-driven-development` (per task). Depends on: Task 1. /qc gate: `/qc-council` before any converter commit.
**Acceptance:** a plan whose tasks name model tier + parallel/sequential + file scope + acceptance per the Spec 31 §12 stage map (STOP-29: every deferral mapped to a named stage, never "out of scope").

## Deferred shared-doc reconciliation (Track 1 owes; do in Task 1 when Track 2 idle)
- **parking → archive (resolved):** `P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED` (Front 1),
  `P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL` (Front 2), `P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES`
  (option-picker role fixed at source). `P-CSSLAYER-DROPPED-ON-AN-UNASKED-QUESTION` = DECIDED: layer
  stays on its own `attr_for_layer_property` resolver, NOT folded into the element key → archive with
  that decision. `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN` = source-fixed (`800px` seed), NOT live-verified
  → keep OPEN as "fix shipped, verify live".
- **New parking (open):** `P-CHECK-VARIANTS-ENUM-SILENT-CONTINUE` — `check_variants.py` silently
  `continue`s on a missing/malformed `enum_values` for a variant_attr block (reviewer Minor): a block
  with a broken enum passes with 0 violations though detect_variant can't discriminate it. Fail-loud or
  report. **Bucket:** tooling · **Status:** OPEN.
- **Product-card follow-up (from Front-1 cleanup subagent):** `pickerPillBorderRadius`/
  `pickerPillSelectedBorderRadius` carry the same wrong `role: typography` (pill* name-collision) in
  attr-classification-overrides.json — same one-line `visual` fix as option-picker; left for Bean's call.

## STOP entries to carry into STOP-CATALOGUE (Track 2 owns the file; add when idle — D101, never subtract)
Carry the 4 earned prior session (STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT,
STOP-VERIFY-THE-DELIVERABLE-EXISTS, STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START,
STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT) PLUS this session's two:
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — on a shared checkout with a co-active session,
  the hash a `git commit` reports can be the OTHER session's racing commit. Verify via `git log -1`
  (your message at HEAD) + `git status` (files clean), NEVER the reported hash. Extends
  STOP-SHARED-CHECKOUT-HAZARD. (Recovered a nearly-lost Front 2.)
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — the SGS pre-commit visual-diff gate blocks any touch
  of a block's render.php/block.json/edit.js without a passing visual-diff report; its own message
  sanctions `--no-verify` for non-visual (logic/attr/meta) changes — use that, never fabricate a PASS.

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `parking.md`, `decisions.md`,
   `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, `site-*`, `adaptive-nav`, `mega-menu`,
   spec 36/37, `header-*` patterns)?
2. Touching the converter? → Spec 31 read in full, design-gated, `/qc-council` before commit.
3. About to accept a subagent "done/irreducible/pre-existing" claim? → re-derive from the tool; check
   the deliverable exists; ask what the number should be.
4. After committing → `git log -1` shows MY message at HEAD + `git status` clean? (shared-checkout race.)

## Guardrails
- Converter changes: `/qc-council` multi-rater before commit (blub.db 255); verify on the REAL draft +
  live code path, not synthetic unit-green.
- DB authoritative — never hardcode a count (`/sgs-db`, `/wp-blocks`).
- Clone-verify DEFERRED by default (Bean); the F6 + converter test suites are the gate.
- Time estimates default LOW; smallest first action < 5 min.
