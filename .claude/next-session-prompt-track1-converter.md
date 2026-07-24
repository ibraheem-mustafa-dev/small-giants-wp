---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1c — Seed root-cause fix + 2 converter builds SHIPPED (2026-07-23/24). Manifest is authoritative + first-class source for css_property (fc0b62c1, recovered ~270 dropped attrs + Check D guard); per-side border box-object (38f7c30a); per-element hover routing (81393004). Build #3 = DESIGN DECISION (info-box preset absence transfer — Bean chose Option B). Remaining: Task A (Option B build), Task B (Spec 31 C2 LANDED = 100%), Task C (deploy + live BoxControl check)."
generated: 2026-07-24 (post 3-build sequence)
---

Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> and the D-numbering cadence. **THIS is Track 1c's prompt** (`next-session-prompt-track1-converter.md`).
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the commit;
> NEVER `git add -A`. **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported**
> — Track 2 commits between your commits (this session `614fa890`/`98e32cd0` landed among Track 1c's).
> The path-scoped-commit hook FIRES on a bare `git commit` — always pass `-- <your paths>`.

## Plain-English state (where we are)

Last session (2026-07-23/24) turned a 6-override "misroute patch" into a **root-cause seed fix**
(Bean-driven), then shipped **2 of 3** approved converter builds. All Track 1c work is committed + pushed
(`fc0b62c1`→`cd9c0364`, `cd9c0364` IS `origin/main`; the suite stayed green throughout).

**Shipped + pushed:**
- **`fc0b62c1` — the seed root-cause fix.** The seeder now (a) honours a block's `block.json`
  manifest `attrMap` `css:<property>` as authoritative for `css_property` (was pure code-scrape,
  grabbed neighbours — nav-menu `underlineOffset` `position`→`bottom`), and (b) SEEDS manifest-only
  attrs the emission parser can't trace (recovered ~270 dropped attrs). Fixed 5 residuals at source
  (trust-bar badge-img, media object-fit, icon-list heading element, separator `contentColour` unify,
  hero legacy `mediaBackgroundColour` removed). NEW guard: `check_css_property_reseed.py` **Check D**
  (F6 fails on a colour/border/radius/shadow/object-fit attr with NULL element+derived_selector).
  Memory: `[[manifest-is-authoritative-and-first-class-source]]`.
- **`38f7c30a` — Build #1: per-side border-width longhands → `borderWidth` box-object** (shared
  `services/border_side.py`, box_family-gated, base-only). Spec 31 §13.4 updated.
- **`81393004` — Build #2: per-element (non-root) hover routing** — `scaleHover`/`imageZoomHover` on
  named children (post-grid + 3 blocks) now transfer (`styling_content.lift_per_element_state`). Seed
  smell fixed at declarative source. Spec 31 §3.A step 4a updated.
- **`bbc3bc51`/`9752ada1`/`cd9c0364` — docs**: Spec 32 borderWidth count, parking (P-POSTGRID resolved).

**Build #3 became a DESIGN DECISION (correctly — did not force a carve-out).** Team-member "faithful
absence transfer" (make info-box `cardStyle:flat` when a draft has no shadow) can't be built cleanly:
`cardStyle`/`effectHover` are deliberately un-routed preset selectors, "absence" is not representable in
the Decl stream, and the pattern spans ~8 blocks. Parked `P-INFOBOX-PRESET-ABSENCE-TRANSFER`. **Bean
chose Option B** (Task A).

## What this session proved (do not re-derive)
- A mis-routed/dropped CSS value is usually the SEED SOURCE dropping a whole CLASS, not a per-attr bug.
  Fix declaratively at the block manifest + add a structural guard; overrides are code-vs-meaning ONLY.
- Making the manifest a first-class source recovered ~270 attrs but EXPOSED ~14 pre-existing collisions
  (icon-list heading/item shared NULL element; hero `mediaBackground`/`mediaBackgroundColour` duplicate) —
  the gate working. All fixed at source; F6 green.
- Per-side border rides the existing box-object accumulator (no render.php/DB change). Per-element hover
  needed a NEW per-child pass (the base state resolver is `_BASE_ELEMENTS`-only by construction).

## First action (≤5 min, zero dependencies)
Confirm inherited state is genuinely green (from `plugins/sgs-blocks/scripts`):
`python -m pytest converter/ ledger/ oracle/ -q && python ledger/coverage_check.py --check && python db-consistency/run.py && python converter/gates/no_slug_literal.py`
(expect ~1010 pass + `0 UNACCOUNTED` + F6 0 violations + no_slug clear). Different → STOP + reconcile;
inherited state is a claim, not a fact (Track 2 may have committed since).

## Mandatory READING (gate — before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked). §3.A step 4a + §13.4
   FR-31-22 now document the 2 shipped builds.
3. `.claude/STOP-CATALOGUE.md` — the pre-flight ritual + STOP entries (Track 2's file; read, don't rewrite mid-race).
4. **`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — IN FULL** (Task A touches the block-editor
   surface + preset semantics; Bean-directed "make builds follow Spec 35").
5. `.claude/plans/2026-07-22-spec31-completion-to-100.md` — for Task B (only C2 remains).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design gate for Task A (Option B schema) before building |
| `/gap-analysis` | Grade audit/design output before acting |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | Auto-routes when a decision is unclear |
| `/strategic-plan` + `/phase-planner` | Plan + break down Option B |
| `/systematic-debugging` | Root-cause gate — proven cause, never inferred |
| `/qc-council` | Multi-rater before ANY converter/pipeline/SGS-block commit (blub.db 255) |
| `/delegate` | Model routing per build (converter builds route to Sonnet) |
| `/sgs-db` + `/wp-blocks` | DB authoritative — never hardcode a count |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (sgs-db.py) | Block schema/attrs/columns — authoritative |
| `python ~/.claude/hooks/wp-blocks.py` | Block schema/markup before any "missing X" claim |
| Playwright MCP | Task B live verify (Bean's eye) + Task C live BoxControl check + canary editor |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Any converter/block build (constrain: EXECUTE yourself, no deploy/commit unless told) |
| `Explore` / `general-purpose` | Parallel DB survey + spot-checks (docs vs live code/DB) |
| `feature-dev:code-reviewer` | Cross-check reviewer before every converter commit |

---

## Task A — Build #3 via Option B: preset-absence transfer (Bean chose B)
**What:** make a cloned preset block (info-box + ~7 others) faithfully reflect the draft's ABSENCE of a
box-shadow / hover, instead of always inheriting the block.json default (`cardStyle:elevated` +
`effectHover:lift`) that paints a phantom shadow/hover the draft never had (and double-injects when a
shadow IS present — the real shadow already routes to `native:shadow`).
**Why:** real clone-fidelity defect across ~8 blocks (info-box/team-member/google-reviews/
testimonial-slider/trustpilot-reviews/countdown-timer/post-grid + `effectHover` on
card-grid/gallery/process-steps/testimonial). Universal, R-31-9.
**Option B (Bean's choice):** block.json ENUMERATES each preset value's implied CSS (`elevated`→box-shadow
present, `flat/subtle/bordered/filled`→absent); seed to a new column via `/sgs-update`; a new converter
pass inspects the cloned element's collected decls and PICKS the preset value by presence/absence — richer
than A, works even for presets with no backing native support, but MUST reconcile with `native:shadow` to
avoid double-transfer. Full ground truth in `P-INFOBOX-PRESET-ABSENCE-TRANSFER` (parking) + the Build #3
report (this session).
**Estimated time:** ~30–45 min (new declarative schema + DB column + resolver pass + tests).
**Orchestration:** design-gate FIRST (`/brainstorming` → Bean sign-off on the block.json schema shape) →
delegate build to `wp-sgs-developer` (Sonnet via `/delegate`; EXECUTE itself, no commit) → `/qc-council`
→ commit. **Spec 35:** any hover it touches must stay `prefers-reduced-motion`-gated (E5); don't
add/duplicate controls (`cardStyle`/`effectHover` enums already have controls).
**Acceptance:** a shadowless draft item → `cardStyle=<neutral>` on the clone (converter test) AND no
double-inject when a shadow IS present; universal across the ~8 blocks (no slug literal); full suite +
F6 green; then computed-parity Stage 11.6 on a real clone (R-31-11/13). Clears
`P-INFOBOX-PRESET-ABSENCE-TRANSFER` + the `P-CLONE-TEAM-MEMBER` residual.
**Depends on:** none. **/qc gate after:** yes — `/qc-council` (shared-mechanism converter change).

## Task B — Spec 31 → 100% (the C2 LANDED leg — the ONLY remaining gate)
**What:** deploy the phase-f fixture corpus as canary PAGES, wire `oracle/check_landed()` +
`oracle/fixture-canary-urls.json`, run the multi-shape LANDED batch, then live-verify + Bean's eye.
**Why:** A1–A6/B1/B3/C1a/C1b are DONE (UNACCOUNTED 14→0). C2 is the sole open item — a live-verification,
not more building. This is what lets you DECLARE Spec 31 = 100%.
**Estimated time:** ~30 min once the tree is clean + deploy works.
**Orchestration:** inline (Opus) for wiring + the verdict; Playwright for the live leg. **Needs a clean
tree** (Task C blocker). **Acceptance:** ledger reports zero UNACCOUNTED + zero WRITTEN-not-LANDED across
the fixture set, live-verified + Bean's eye → Spec 31 formally 100%.
**Depends on:** a working deploy (Task C).

## Task C — Deploy the accumulated block changes + live BoxControl check (was Task 1)
**What:** deploy this session's block changes (separator unify, hero legacy-attr removal,
trust-bar/media/icon-list manifests, post-grid seed) + the product-card CTA box-object migration to the
sandybrown canary; then Playwright the canary editor to confirm the CTA `BoxControl` renders + drives the
live preview (login `.claude/secrets/sandybrown.env`).
**Why:** the block changes + the ORIGINAL Task-1 BoxControl check are the last unverified LIVE outcomes.
**BLOCKER (carried):** the shared tree is dirty with Track 2's uncommitted work (`lucide-icons.php` +
their unpushed `614fa890`). `build-deploy.py`'s dirty-tree gate refuses; `--allow-dirty` is BANNED (D336).
**Either** wait for Track 2's tree to clear **or** deploy from an ISOLATED worktree at `origin/main` HEAD
(build in the MAIN checkout — memory `never-junction-node-modules-into-a-worktree` — copy `build/` into
the worktree, `build-deploy.py --skip-build`). `md5sum` local↔server BEFORE measuring (memory
`verify-deploy-by-checksum-not-liveness`). **Acceptance:** md5 confirms new code shipped; the CTA
BoxControl renders + updates the live editor preview. **First action if the tree is clean.**
**Depends on:** a clean tree.

## Task D — Per-side border shorthand+longhand collision (follow-up from Build #1)
**What:** a draft that sets BOTH `border-width` shorthand AND a `border-{side}-width` longhand on one
element collides on a shared key → a LOUD conservation error (not silent). Resolve by expanding
`border-width` shorthand to longhands at extraction (like padding), so per-side wins by cascade. Small;
only if a real draft hits it. **/qc gate after:** yes.

## Task E — Standardise gallery + team-member reduced-motion (Spec 35 E5 follow-up)
**What:** Build #2 found gallery + team-member use a "near-zero transition" hover (WCAG-compliant but
leaves the resting scale) vs card-grid/post-grid's strict `transform:none`. Standardise the 2 on
`transform:none` inside `@media (prefers-reduced-motion: reduce)`. Shared-visual → design-gate + live
verify (R-31-13). Small.

---

## Dependency graph
```
Task C (deploy — unblock the tree; FIRST if clean)
   ↓
Task B (Spec 31 100%: C2 LANDED — needs a working deploy)     Task A (Build #3 Option B — independent)
Task D + Task E (small follow-ups — any converter/visual session)
```

## Structural defences — STOP catalogue (carry forward, never subtract — D101)
Full text in `.claude/STOP-CATALOGUE.md` (Track 2's file). Load-bearing for THIS track, restated:
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be Track 2's
  racing commit. Verify via `git log -1` + `git status`, never the reported hash.
- **STOP-PATH-SCOPE-EVERY-COMMIT** — the path-scoped-commit hook fires on a bare `git commit`; always
  pass `-- <your paths>`. NEVER `git add -A`. `lucide-icons.php` + spec 36/37 + LEDGER/parking/decisions/
  STOP-CATALOGUE are Track 2's.
- **STOP-FIX-THE-SEED-SOURCE-NOT-A-PER-ATTR-OVERRIDE** (NEW 2026-07-23) — a mis-routed/dropped CSS value
  is usually the SOURCE dropping a class; make the manifest authoritative + a first-class source + add a
  structural guard. Overrides are code-vs-meaning ONLY. Memory `[[manifest-is-authoritative-and-first-class-source]]`.
- **STOP-DONT-FORCE-A-CARVE-OUT-TO-LOOK-PRODUCTIVE** (NEW 2026-07-24) — Build #3 correctly returned a
  DESIGN DECISION, not a build. If the only path is a per-block hardcode (R-31-9) or a bigger new
  mechanism, STOP + report options for Bean's gate.
- **STOP-VERIFY-A-BOX-OBJECT-MIGRATION-DEFAULT-FALLS-THROUGH** — migrating axis-pair scalars to a `{}`
  object default silently drops the old defaults; prove the empty object falls through to an EQUAL base.
- **STOP-AUDIT-BY-DECLARED-SEMANTIC-NOT-IDENTIFIER-NAME** — ≥2 signals before an "absent/wrong" verdict
  (this session: fadeWidth/backgroundPadding were FALSE positives; a manifest _note wrongly called
  contentIconColour an "orphan").
- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** — put "EXECUTE YOURSELF; do NOT delegate" in every
  implementer dispatch.
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — before banking a PASS ask "would this still pass if
  the feature were absent?".

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `parking.md`, `decisions.md`,
   `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, `site-*`, spec 36/37, `header-*`, `lucide-icons.php`)?
2. Touching the converter? → Spec 31 read IN FULL, design-gated, `/qc-council` before commit.
3. Touching the block-editor surface / preset semantics (Task A)? → Spec 35 read IN FULL.
4. About to accept a subagent claim? → re-derive it from the tool (this session an agent's "already
   handled" seam claim was wrong; re-verified against live code caught it).
5. After committing → does `git log -1` show MY message at HEAD + `git status` clean of MY work?
6. Banking a PASS? → would it still pass if the feature were absent?
7. Recording something "absent/missing"? → ≥2 signals, including the declared semantic, not just the name?
8. Diagnosing from a file? → is it the file that ACTUALLY runs (build vs src; the classifier json is
   GENERATED by extract-signatures.py — never hand-edit it, regenerate with `--task-a-only`)?

## Guardrails
- **Deploy: `build-deploy.py --target sandybrown` ONLY.** Never hand-roll tar/scp/`rm -rf` (D336). NEVER
  `--allow-dirty` on a shared tree. On a dirty shared tree, deploy from an ISOLATED worktree (copy `build/`,
  `--skip-build`); build in the MAIN checkout (node_modules-junction hazard).
- Converter/seed changes: `/qc-council` before commit; verify on the REAL draft + the live code path.
- Manual DB edits BANNED — dated migration OR the block's own `block.json` manifest / `boxFamilies` /
  `attrMap` declarative channel + a `/sgs-update` reseed. The classifier json is REGENERATED, never hand-edited.
- DB authoritative — never hardcode a count (`/sgs-db`, `/wp-blocks`).
- Time estimates default LOW; smallest first action < 5 min.
- Suites before AND after, from `plugins/sgs-blocks/scripts`:
  `python -m pytest converter/ ledger/ oracle/ -q` · `python ledger/coverage_check.py --check` ·
  `python converter/gates/no_slug_literal.py` · `python db-consistency/run.py`

## Open residuals (parked, not blockers)
- `P-INFOBOX-PRESET-ABSENCE-TRANSFER` — Task A (Bean chose Option B).
- `P-CLONE-TEAM-MEMBER-ITEM-HEIGHT` — the residual clears when Task A lands (verify via computed-parity).
- `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — Spec 35 audit front (unchanged; finish the 76 unaudited).
- Per-side border shorthand+longhand edge → Task D. Gallery/team-member reduced-motion → Task E.
