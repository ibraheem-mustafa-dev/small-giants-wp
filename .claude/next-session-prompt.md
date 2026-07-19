---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track 1 — Spec 35 block-inspector-UX. Phase 0 DONE + attribute-registry mapped through Phase 1c (2026-07-19, 11 commits). Next = Phase 2 (optimal-spec catalog).
generated: 2026-07-19
---

Invoke /autopilot before anything else. This is **Track 1 — Spec 35 block-inspector-UX, Phase 2**
(the attribute-registry: define the OPTIMAL control per setting). Read in full: the strategic plan
`.claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md`, the executable plan
`.claude/plans/2026-07-19-spec-35-phase-0-executable-plan.md`, `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`
(Parts B/H are the optimal-control reference), the DONE-checklist `.claude/plans/spec-35-inspector-DONE-checklist.md`,
and the registry artefacts under `plugins/sgs-blocks/scripts/consistency/`.

## State recap (plain English)

Spec 35 makes every SGS block's editor sidebar complete + consistent so a non-coder client can self-serve
(the "Bean as QC only" goal). Phase 0 (foundations) is DONE: a block roster (79 blocks, DB-derived), 3
WARN-only audit scripts (inspector-conformance, feature-parity, shrink-to-fit), 3 shared components
(transparent-colour `DesignTokenPicker`, `SgsLinkControl`, `ShadowControl` — built, not yet consumed by any
block), and a `min-width:0` shared-wrapper backstop (deployed to canary, no regression; live-emission proven
only when a wrapper-grid container exists — UNIT D will exercise it).

The big Phase-1 result: **944 attribute names deduplicate to ~80 TRUE semantic settings** (≈60 CSS-property
settings + 12 input-types + 11 behaviour-families). The earlier "282 unique one-offs" was wrong — the dedup
had keyed non-CSS attrs by NAME. It is now fully adjudicated (0 genuinely-unique). Everything is in
`scripts/consistency/`: `setting-types.json` (CSS-property dedup), `setting-reclassification.json` (input-type/
behaviour-family collapse + `answers_to_bean`), `phase1b-adjudication.json`, and the generators.

**Phase 2 is the fresh work:** for each of the ~80 settings, define its OPTIMAL inspector setup (canonical
control + units + multi-value + responsive toggle + dropdown completeness + custom-box-plus-preset, per Spec 35
Part B/H + Bean's dimensions) → Phase 3 builds the permanent lint that categorises every attr against the
registry + flags new/uncategorised → UNIT D pilots sgs/media.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — the optimal-control decisions per setting are design calls |
| `/gap-analysis` | ALWAYS — grade the registry before locking it |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes; "best WP control for setting X" |
| `/strategic-plan` | ALWAYS — order the Phase 2/3 build |
| `/phase-planner` | break Phase 2 into executable steps before building |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode counts |
| `/sgs-wp-engine` | any SGS block/component work |
| `/qc-council` | multi-rater validate the optimal-control choices before locking |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright | live-verify a control renders; shrink-to-fit + visual QC on the pilot |
| `/sgs-db` (sgs-db.py) | query `block_attributes` (2286 rows) — the registry source |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | build the optimal-spec catalog + Phase 3 lint + UNIT D pilot (Sonnet) |
| `design-reviewer` | visual QC of the pilot block's inspector + rendered output |

---

## Task 1 — Refactor reclassify.py to be DB-direct (blocker for Phase 3)

**What:** `scripts/consistency/reclassify.py` reads an intermediate DB dump from the scratchpad — not re-runnable.
**Why:** Phase 3's lint must re-run cleanly after `/sgs-update`. Make it query the DB directly like `build-roster.py`.
**Orchestration:** delegated, Sonnet, single-agent. Depends on: none. /qc gate after: yes (re-run reproduces the committed classification).
**Acceptance:** `python scripts/consistency/reclassify.py` runs standalone + reproduces `setting-reclassification.json`.

## Task 2 — Build the optimal-spec catalog (Phase 2 core)

**What:** for each of the ~80 settings, define its OPTIMAL inspector setup (the "font-size box + preset dropdown" vision, per setting).
**Why:** the canonical golden master every wave standardises against.
**Orchestration:** inline design (Bean's input) + Sonnet drafting per-category via /dispatching-parallel-agents (CSS / input-types / behaviour-families). Context: Spec 35 Part B (control-completeness table) + Part H (component-per-job) + Bean's dimensions (units, multi-value, how to toggle units/device-tiers, dropdown completeness, custom+preset). Depends on: Task 1. /qc gate after: yes — /qc-council on the choices.
**Acceptance:** `scripts/consistency/setting-registry.json` — every setting has its optimal control + props + current-vs-optimal divergence, Bean-signed-off.

## Task 3 — Build the registry lint (Phase 3, the permanent enforcement)

**What:** a script that categorises EVERY attr into its setting, checks current-vs-optimal, flags NEW/uncategorised attrs; wire WARN-only into prebuild.
**Why:** the auto-pickup Bean asked for — new attrs/blocks caught + classified forever.
**Orchestration:** delegated, Sonnet. Depends on: Task 1 + 2. /qc gate after: yes.
**Acceptance:** the lint reports per-attr conformance vs the registry + flags any uncategorised attr; WARN-only in prebuild.

## Task 4 — UNIT D pilot: sgs/media to full Spec 35 DONE (Gate 0)

**What:** build sgs/media to the DONE-checklist + the 3 threaded standards; seeds the registry; exercises the backstop live; SVG sanitise-on-upload (security, do FIRST).
**Why:** proves the standard live before any framework-wide rollout.
**Orchestration:** delegated Sonnet build + inline design; design-reviewer visual QC. Context: sgs/media stays OFF the shared imageControls extension (block.json is the converter's source of truth — block-private path); the 21 parity gaps (lightbox/focalPoint/sizeSlug/scale + video preload/tracks/poster) from the parity audit; every new attr editor-only OR carries a converter-population note. Depends on: Task 2. /qc gate after: Gate 0 (Bean's eye + all 3 audits green).
**Acceptance:** sgs/media passes conformance + parity (0 unexplained) + shrink-to-fit (backstop OFF) LIVE + SVG sanitised + Bean sign-off.

## Dependency graph
```
Task 1 (Sonnet) ─► Task 2 (inline+parallel, Bean sign-off) ─► Task 3 (Sonnet lint)
                                     └───────────────────────► Task 4 (UNIT D pilot, Gate 0)
```

## Methodology guardrails (do not skip)

- **SHARED BRANCH `feat/brand-strip-inspector-rebuild` + Track 2 co-active (LOAD-BEARING).** Path-scope EVERY
  commit with an explicit `-- <paths>` pathspec; re-check `git branch --show-current` IN THE SAME command as the
  commit; NEVER `git add -A`, NEVER `git checkout`/branch-switch in this worktree. Merge to main ONLY via an
  isolated `git worktree add /c/tmp/<x> main` (a real merge, not fast-forward — main carries Track 2 docs). Do
  NOT delete the shared branch. Do NOT wholesale-rewrite `LEDGER.md`/`decisions.md` (Track 2 edits them too).
- **Windows commits:** commit via PowerShell if Bash has a stale view of Write-tool files; do NOT pipe `git commit`
  through `Select-String -First` (it silently aborts the commit — use `Select-Object -Last`).
- **Verify live + verify the wiring, not the emit** — a control isn't done until the LIVE computed value is
  correct (D302 strips functional colours; object/enum attrs coerce silently — D291/D328). READ THE SOURCE to
  confirm a gate is actually wired (the min-width:0 backstop taught this — a `$layout` mismatch = silent no-op).
- **Deploy before measure** — visible-on-URL changes need build + `build-deploy.py --target sandybrown` +
  OPcache reset BEFORE any browser/pixel test. Stash uncommitted deployed-runtime files first. Clear CDN before every live measure.
- **THE GATE IS BEAN'S EYE (R-31-13)** — never close a visual task on a number alone; screenshot 375/768/1440.
- **No block version bumps / no `deprecated.js`** (D270). No inline styling (Spec 32 — scoped `<style>`). Complete code only.
- **DB is authoritative** — query `/sgs-db`/`/wp-blocks`; never hardcode counts. Re-run `/sgs-update` if the DB may be stale (it found +6 attrs this session).
- **Audits stay WARN-only** until Spec close — never block the co-active Track 2 build (`a11y-validation-informational-not-gate`).
- **Dedup safety** — any new setting grouping: default to MATCHING an existing setting; justify any "unique" claim; setting identity = the property/input-type, NOT the name.
- **STOP-29 / definition-of-done** — Spec 35 is a spec'd subsystem: done = the spec's FULL scope; map every deferral to a named spec stage, never "out of scope".
- **Fact-check subagent output** (invented paths/dates/counts) against ground truth before acting.

## Uncommitted carry-over
- `plugins/sgs-blocks/src/blocks/brand-strip/style.css` — a reduced-motion CSS fix, HELD behind the visual-diff
  gate (needs deploy + `reports/visual-diff/brand-strip-<date>.md` with `verdict: PASS`). Land it with the UNIT D deploy.
