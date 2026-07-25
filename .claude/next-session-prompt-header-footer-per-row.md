# Next Session — Spec 37 Header/Footer Per-Row Identity (BUILD)

*Unique next-session-prompt for the Spec 37 per-row work. Not the shared LEDGER — concurrent
sessions own that. Overwrite this file each time this track hands off.*

You are the SGS framework builder continuing Spec 37: making each header/footer ROW an
independently-styled, independently-behaving strip, built ON TOP of the shared layout engine
(`SGS_Container_Wrapper`) — never by removing it.

## State recap (plain English)
The block-private idea (giving header/footer their own private copy of the layout engine) was
**considered and REJECTED** on 2026-07-25 after a 6-persona `/adversarial-council` returned 6/6
NO-GO: the premise was false (it doesn't fix the attr-shape issue — that's orthogonal to the
engine), the per-row features are already live WITH the engine, and it's weeks of invisible-plumbing
drift risk. **Bean chose Option 1: keep the engine.** The design + an executable, QC'd phase plan are
written and on `main`. Nothing per-row is built yet. The first move is a cheap usability test, not code.

## ⛔ MANDATORY READING GATE (read IN FULL before any edit — carry-forward defence)
1. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the approved design + the **9 council must-fixes** (LOAD-BEARING).
2. `.claude/plans/2026-07-25-header-footer-per-row-identity-PHASE-PLAN.md` — the executable, QC-fixed plan (step-by-step).
3. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §Behaviours — the current header-LEVEL behaviour mechanism you extend to per-row.
4. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + pre-flight ritual (read before acting).

## ⛔ STOP entries (do NOT violate — carried forward + this session's additions)
- **STOP — do NOT re-open block-private.** Keep `SGS_Container_Wrapper`. If a per-row effect needs a
  capability the engine lacks, ADD it to the engine (composite-mirror route), never fork it. Rejected 6/6 on 2026-07-25.
- **STOP — a design that "escapes" a problem is a hypothesis.** Prove it SOLVES the problem before building (memory `verify-the-escape-actually-solves-the-problem`).
- **STOP — behaviour JS/CSS keys on a class no row emits = silent dead selector (D375).** Verify per-row behaviour on the LIVE DOM, not the emit.
- **STOP — `view.js` lives at `src/header-behaviours/`, NOT `src/blocks/header-behaviours/`.** Wrong path silently serves stale `src/` on the live site (webpack entry footgun).
- **STOP — shared tree is busy (concurrent sessions).** `git branch --show-current` in the SAME command as any commit; commit to `main` via an ISOLATED worktree (detach-before-remove to free `main`); never `git checkout main` on the shared tree.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — the sticky mini-design (Task 4) is a design decision |
| `/gap-analysis` | ALWAYS — grade any output before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes the right research tier |
| `/strategic-plan` | ALWAYS — plan order before writing code |
| `/qc-council` | before every deploy on the behaviour surface (blub.db 255) |
| `/sgs-wp-engine` + `/wp-block-development` | block build |
| `/sgs-db` | DB role lookup for the shrink guardrail (Task 3) |

## MCP Servers & Tools
| Tool | For |
|---|---|
| chrome-devtools (or Playwright) | live-page DOM verify of per-row behaviour on the canary |
| github | PR/branch ops if a feature branch is used |

## Agents to Delegate To
| Agent | When |
|---|---|
| `wp-sgs-developer` | the block build (Tasks 2, 3) — SSH/WP-CLI/Playwright |
| `code-reviewer` (feature-dev) | review the per-row JS iteration path before deploy |

## WordPress tooling (this IS a WP/SGS project)
- Build: `cd plugins/sgs-blocks && npm run build`. Deploy: `build-deploy.py --target sandybrown --blocks-only` **from an isolated worktree** (`git merge origin/main` first; verify with a per-feature marker + md5, never the generic HTTP-200 leg).
- SSH: `ssh hd`. Canary creds (gitignored, always available): `.claude/secrets/sandybrown.env`. WP 7.0.2.
- Rules: no inline `style=""` (Spec 32); device tiers 768/1024; DB-first (no hardcoded dicts); no version bumps / no `deprecated.js`; transition `transform`/`opacity` only.
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` for DB.

---

## Task 1 — Operator-simplicity test (do FIRST)
**What:** run the FR-37-26 test — can a non-coder set up a header in a few minutes without opening Advanced? Against TODAY's header (it shows 7 controls vs the ≤3 target).
**Why:** the council's top steer — client-facing simplicity outranks internal plumbing; tells us if the current surface needs trimming BEFORE adding per-row controls. Measurable: pass/fail recorded.
**Estimated time:** 30 min.
**Orchestration:** inline (main thread) + Playwright to drive the editor. Model: opus (inline).
- Depends on: none. Parallel with: none.
- /qc gate after: no — the recorded result IS the output.
**Acceptance:** a written pass/fail with the timing + which controls confused. A fail is a finding (trim the Simple surface), not a reason to re-run.

## Task 2 — Phase 1: per-row transparent + hide-on-scroll
**What:** add `rowTransparent` + `rowHideOnScroll` (device-tier object shape) to `site-header-row`/`site-footer-row`; emit the row uid class hook; extend `header-behaviours.css` + `src/header-behaviours/view.js` with a NEW per-row iteration path (scan N rows, toggle state per row); per-row inspector controls in an Advanced ToolsPanel. Ships to canary first.
**Why:** the visible headline win — each row behaves independently. Live-verified at 375/768/1440.
**Estimated time:** ~90 min (plan steps P1-S1..S3; S2 is a new JS iteration path, not a tweak).
**Orchestration:** delegated. Model: sonnet via `wp-sgs-developer`. Dispatch: single-agent.
- Brief: implement plan Phase 1 exactly; the behaviour layer is body-class today — build a parallel per-row path, do NOT touch the shared wrapper.
- Context the subagent needs: the `view.js` path footgun (STOP above); render.php already computes `$uid`; per-tier boolean semantic = null inherits the tier above, explicit false = off (plan P1-S1).
- Depends on: Task 1 (do the simplicity test first; may trim the Simple surface). Parallel with: none.
- /qc gate after: yes — `/qc-council` on the behaviour surface, then deploy + chrome-devtools live-verify independence + no regression of the D376 header-level behaviours + md5.
**Acceptance:** a header top row and a footer bottom row each carry their OWN transparent + hide-on-scroll, verified INDEPENDENT on the live canary; existing header-level behaviours intact.

## Task 3 — Phase 2: per-row shrink + shrink-hides-element + footer parity
**What:** per-row `rowShrink` (padding/height); shrink-hides-a-chosen-element via a STABLE per-child id (never clientId) with a DB-role guardrail (never logo/nav/cart); footer parity verify.
**Why:** completes the per-row effect set (minus sticky) + footer.
**Estimated time:** ~90 min (plan P2-S1..S3).
**Orchestration:** delegated. Model: sonnet via `wp-sgs-developer`; the guardrail sub-step is architectural (inline judgement).
- Brief: implement plan Phase 2; FIRST verify via `/sgs-db` that a slug→role REVERSE lookup exists before coding the guardrail filter (the roles/slots tables were built for cloning BEM→slug) — if not, use `block_capabilities`, never a hardcoded 3-name list (R-31-1).
- Context: stable-id-not-clientId; orphaned reference = no error; always-visible "reset shrink".
- Depends on: Task 2. Parallel with: none.
- /qc gate after: yes — `/qc-council` + deploy + live-verify.
**Acceptance:** shrink works; the picker never offers logo/nav/cart (verified via the DB role, not a hardcoded list); deleting the chosen element doesn't error; footer behaves identically.

## Task 4 — Sticky mini-design (GATED — needs Bean sign-off before build)
**What:** design the per-row sticky model — resolve the sticky↔hide-on-scroll transform conflict (mutually exclusive per row in v1, OR lift the sticky row out of the transform), the multi-sticky auto-offset chain (via the existing height-publisher), and confirm the ALREADY-LIVE `scroll-padding-top` holds under multiple dynamically-sized sticky rows. Write it into the design doc + a new Spec 37 FR.
**Why:** per-row sticky is the one hazardous effect; a naive toggle silently breaks (transformed ancestor breaks `position:sticky`). Must be designed, not built blind.
**Estimated time:** ~45 min design + Bean sign-off.
**Orchestration:** inline (architectural) via `/brainstorming`. Model: opus (inline).
- Depends on: none (can run anytime). Parallel with: Task 2/3. **Do NOT ship any `rowSticky` attr before this signs off.**
- /qc gate after: n/a (design). Bean sign-off is the gate.
**Acceptance:** a written, Bean-signed-off sticky model in the design doc + Spec 37. THEN it becomes a normal build task.

## Task 5 — Deal-winners (independent, high-ROI)
**What:** B2 = a "Preview scroll behaviour" button (opens the live frontend pre-scrolled + at mobile width, so the client SEES the result before publishing); B3 = a preset LIBRARY (ready-made styled header/footer designs in the existing native picker).
**Why:** council converged these win deals more than plumbing; B2 is the biggest ticket-prevention.
**Estimated time:** B2 ~60 min, B3 ~90 min.
**Orchestration:** delegated, parallel. Model: sonnet via `wp-sgs-developer` (one agent each).
- Depends on: none. Parallel with: each other + Task 2/3.
- /qc gate after: yes — live-verify on the canary.
**Acceptance:** B2 — clicking the button shows the scrolled/mobile state live; B3 — ≥3 full header/footer presets selectable from the picker, applying one writes its tree to `post_content`.

## Dependency graph
```
Task 1 (inline, opus — simplicity test) ──▶ Task 2 (sonnet, per-row transparent+hide) ──▶ Task 3 (sonnet, shrink+footer)
                                             │  /qc-council + deploy gate after each
Task 4 (inline, opus — sticky mini-design + Bean sign-off) ── parallel, GATES any per-row sticky
Task 5 B2 + B3 (sonnet, parallel) ── independent, high-ROI
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any live-URL change needs build + deploy + OPcache reset BEFORE any browser/pixel test; else you're measuring stale output.
- **Verify on the LIVE DOM, not the emit** — per-row behaviour especially (D375 dead-selector class).
- **Outcome vs completion** — code shipped ≠ outcome hit; the acceptance line is the bar.
- **`/qc-council` before every commit** touching the behaviour surface (blub.db 255).
- **Shared-tree git** — branch-check in the commit command; commit to `main` via isolated worktree (detach-before-remove).
- **No block-private** — keep the wrapper; add capabilities to it, never fork (6/6 council).

## Open threads (not blockers)
- `MEMORY.md` is ~22KB (limit 24.4KB) — compact it under 17.1KB in a maintenance pass (one line/entry, detail in topic files).
- Leftover locked temp worktree dirs under `C:/tmp/` — `git worktree prune` when the locks clear.
- FR-37-16 (attr-shape flat→object) — decoupled, optional, low priority. Not part of this work.
