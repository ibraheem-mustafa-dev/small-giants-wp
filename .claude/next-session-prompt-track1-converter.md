---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1c — Declarative CSS routing SHIPPED (2026-07-23, D372-D373, 6 commits). css_layer L1-L4 fully seeded + css_element normalised to 'wrapper' + P3a base-resolver OUTER union + P4 declarative area resolver (qc-council-validated, +213 routes) + product-card cta box-object (last block off the axis pair). ONE outcome pending: the live BoxControl editor check (deploy blocked on the shared dirty tree). Then the Spec-31-to-100 items (phase-f fixtures, check_landed) + Spec 35."
generated: 2026-07-23 (eve, post-declarative-routing)
track: 1-converter
note: "Track 1's prompt lives HERE, not .claude/next-session-prompt.md — that canonical path is contended by Track 2 (Spec 36/37). See the top warning."
---

# Track 1c — Next Session Prompt (2026-07-23 eve)

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> and the D-numbering cadence. **THIS is Track 1c's prompt** (`next-session-prompt-track1-converter.md`).
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the commit;
> NEVER `git add -A`.
> **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported** — Track 2 commits
> live (this session `bf312016` landed between two Track 1c commits); the git-log-1 discipline held
> across 6 commits with zero collisions.

## Plain-English state (where we are)

**The per-area CSS routing rework — the "last task before Spec 31 = 100%" from the PRIOR prompt — is
DONE and pushed.** It became a broader declarative-routing session (Bean-driven), and the two OPEN
QUESTIONS the prior prompt raised are both settled:
- **OPEN QUESTION 1 (`css_element='box'`):** SETTLED — `box` is a CLUSTERING term (the block's own
  `isWrapper:true` manifest element), NOT a DOM element. Verified: no `__box` node in any renderer.
- **OPEN QUESTION 2 (DB survey):** DONE — `css_element` is the real disambiguator; `css_layer` is now
  FULLY seeded (was 6 rows — Bean was right it was worth populating); the base-resolver domain +
  css_state/css_tier do nearly all the disambiguation.

Shipped this session (6 commits, all pushed, all gates green — 997 tests + coverage + no_slug_literal
+ F6 db-consistency):

| Commit | What landed |
|---|---|
| `50622ed8` | css_layer L1-L4 FULLY seeded declaratively (block.json `layer` field + name-convention fallback + leaf guard, authoritative reseed) + Wave-0 mis-seed fixes (6 hover `css_state`, splitImage tier) |
| `77bacdda` | **P3a** base-resolver OUTER union (`css_element IN root-set OR css_layer='OUTER'` — 26 wrapper attrs recovered) + **P4** declarative area resolver (replaced the name-build; **+213 routes, −6 wrong, all 3 conflicts fixed**). qc-council-validated. |
| `77703100` | product-card CTA padding → box-object (last block off the ad-hoc axis pair; every SGS block now box-object) |
| `a5518437` | css_element normalised to `wrapper` for every isWrapper root (120 attrs / 26 blocks — Bean-directed "make it clear they are wrappers") |
| `9074d1ae` | spec docs 31 §4 + 32 |
| `fb93bcae` | handoff docs (D372-D373, LEDGER, was 4 parking entries — now folded into this prompt) |

**Current state:** F6 green after a full `/sgs-update` (pruned the retired `ctaPaddingX/Y`, seeded
`box_family='ctaPadding'`, applied the normalisation). 997 tests pass.

## What this session proved (do not re-derive)

- **P4 declarative area resolver is strictly better** — measured differential on the LIVE DB (not the
  doc's stale 206/13/3): declarative **+213** correct routes the name-build silently missed, **−6**
  WRONG name-build routes (resting decls landing on `css_state='hover'`/`'selected'` attrs; social-icons
  `iconColour` matched by NAME onto element='item'), **3 conflicts** all favour declarative (overlay
  opacity → `backgroundOverlayOpacity`; cart badge → `badgeTextColour`; trust-bar label → `textColour`).
- **The qc-council caught 2 DATA mis-seeds that would CRASH the resolvers AND were silent bugs today**:
  6 quote/testimonial hover attrs carried `css_property` with `css_state=NULL` (a resting decl was
  masquerading onto them) → `css_state='hover'`; `hero.splitImageMobileHeight` is a functional
  duplicate of `imageHeightMobile` → de-routed. Fix-the-data-before-the-resolver.
- **css_element normalisation is safe because resolution keys on css_layer, not the element name** —
  the base resolver's OUTER union finds wrapper attrs by MEANING; 'wrapper' need not be a base-domain
  element. Oracle golden fixtures intact.
- **A box-object migration can silently drop the default** — `ctaPaddingX=24`/`ctaPaddingY=14` → a `{}`
  object default emits NOTHING; it's non-visual ONLY because `sgs_box_object_shorthand({})` returns
  null and the CTA falls through to `.sgs-button` base `14px 24px` (button/style.css:27). Verify the
  fall-through before calling any box-object migration non-visual (memory
  `box-object-migration-verify-default-fallthrough`).

## First action (≤5 min, zero dependencies)

Confirm the inherited state is genuinely green before touching anything:
`cd plugins/sgs-blocks/scripts && python -m pytest converter/ ledger/ oracle/ -q && python ledger/coverage_check.py --check && python db-consistency/run.py`
(expect 997 pass + `0 UNACCOUNTED` + F6 0 violations). If any differs, STOP and reconcile — inherited
state is a claim, not a fact. Then read the Task 1 deploy recipe below.

## Mandatory READING (gate — before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked, ~674 lines). §4 now
   documents the css_layer seeding + wrapper normalisation + P3a/P4 resolvers (D372-D373).
3. `.claude/STOP-CATALOGUE.md` — the pre-flight ritual + STOP entries (Track 2's file; read, don't rewrite mid-race).
4. `.claude/plans/2026-07-22-spec31-completion-to-100.md` — the parent plan + its AUDIT CORRECTION section.
5. For Spec 35 work only: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — **IN FULL** first.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design gates before any converter/spec change |
| `/gap-analysis` | Grade audit output before acting on it |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | Auto-routes research tier when a decision is unclear |
| `/strategic-plan` + `/phase-planner` | Plan + break down the Spec 35 completion order |
| `/systematic-debugging` | Root-cause gate — proven cause, never inferred |
| `/qc-council` | Multi-rater before ANY converter/pipeline/SGS-block commit (blub.db 255) |
| `/dispatching-parallel-agents` | Fan out file-independent audit tasks |
| `/sgs-db` + `/wp-blocks` | DB authoritative — never hardcode a count |

## Tool bindings — MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (sgs-db.py) | Block schema/attrs/columns — the authoritative source |
| `python ~/.claude/hooks/wp-blocks.py` | Block schema/markup before any "missing X" claim |
| Playwright MCP | Live-page verification, the oracle's live leg + the Task-1 BoxControl check |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Any converter/block build (constrain: no deploy/commit unless told) |
| `Explore` / `general-purpose` | Parallel DB survey + spot-checks (docs vs live code/DB) |
| `feature-dev:code-reviewer` | Cross-check reviewer before every converter commit |

---

## Task 1 — Deploy the box-object migration + the live BoxControl check (the ONE pending outcome)
**What:** The product-card CTA box-object migration (`77703100`) is committed + locally verified but
its LIVE editor check was NOT done — the deploy was blocked by the shared dirty tree.
**Why:** The `wp-sgs-developer` agent could not verify the `BoxControl` renders + updates the live
preview (no running build). This is the last unverified outcome of the migration.
**Estimated time:** ~15 min once the tree is clean.

**Sub-steps:**
1. **Unblock the deploy.** The shared worktree had Track 2's UNCOMMITTED work (`icon-list/*`,
   `render-helpers.php`, `lucide-icons.php`) → `build-deploy.py`'s dirty-tree gate refused, and
   `--allow-dirty` is BANNED (D336's trigger). Do NOT force it. Either: (a) Track 2 has since committed
   → tree clean → `build-deploy.py --target sandybrown --blocks-only`; OR (b) deploy from an ISOLATED
   worktree at `origin/main` HEAD — build in the MAIN checkout (avoid the node_modules-junction hazard,
   memory `never-junction-node-modules-into-a-worktree`), copy `build/` into the worktree,
   `build-deploy.py --skip-build`.
2. **md5sum local↔server** the changed files BEFORE measuring (memory `verify-deploy-by-checksum-not-liveness`).
3. **Playwright the canary editor:** insert an `sgs/product-card`, open the CTA "Padding" control,
   confirm the `BoxControl` renders + updates the live preview (login `.claude/secrets/sandybrown.env`).
**Acceptance:** the BoxControl renders + drives the CTA padding on the live editor; md5 confirms the
new code shipped.

## Task 2 — Fold-in residuals from the declarative-routing session (were parking; now here per Bean)
Four items surfaced this session, moved here from parking so the next session picks them up directly:

1. **P4 cluster-arm — DEFERRED, measure first.** P4 shipped the validated core but DEFERRED the
   fallback-to-cluster arm (fake wrapper `__body` → block-side `box` cluster). qc-council flagged: the
   runtime trigger is untraceable from the DB alone (walker/Ctx `area_name` behaviour) + a narrow
   over-match risk (two nested unresolvable wrappers both writing one cluster attr). The product-card
   body-padding case it targeted is ALREADY handled by the CONTENT-layer path (css_layer → `innerPadding`
   = CONTENT). **Only build it if a real draft proves the area resolver is called with an unresolvable
   area token the CONTENT path doesn't cover — with an "outermost unresolved wrapper only" guard.**
2. **`attr_for_layer_property` NULL-leak — OPEN.** It uses `css_layer = ? OR css_layer IS NULL`, so a
   NULL-layer attr matches EVERY layer query. Pre-existing, NOT test-exercised (997 green). Same
   NULL-permissive class as P3a's base resolver but the LAYER resolver wasn't in the qc-council scope.
   **Fix:** apply P3a's "prefer exact layer, fall back to NULL only if no exact match" discipline, OR
   exclude leaf attrs. Verify with a live clone exercising a CONTENT-band composite.
3. **3 NULL-`css_element` misroutes — OPEN.** Besides the now-fixed product-card cta, a sweep found
   `sgs/brand-strip.fadeWidth` (width), `sgs/icon.backgroundPadding` (padding), `sgs/separator.contentIconColour`
   (color — confirmed it targets `.sgs-separator__content`, a silent misroute). Each needs the block's
   REAL element read from render.php before assigning css_element (NO guessing; ≥2 signals). Pairs with
   `P-NAVMENU-UNDERLINEOFFSET-CSSPROP-MISSEED` — a DB-seed hygiene pass.
4. **DEPLOY blocker** = Task 1 above.

## Task 3 — Spec 31 to 100% (the pre-declarative-routing queue, still open)
From `plans/2026-07-22-spec31-completion-to-100.md`: (a) `P-ORACLE-CHECKLANDED-NEEDS-CANARY-FIXTURES` —
deploy the phase-f fixture corpus as canary pages + populate `oracle/fixture-canary-urls.json` + apply
the `check_landed()` patch (the gating dep for declaring Spec 31 100%); (b) the 2 remaining
WRITTEN-not-LANDED oracle findings; (c) live verify + Bean's eye (R-31-11/R-31-13).

## Task 4 — Spec 35 conformance audit, then to 100%
Same two-phase treatment that worked on Spec 31: conformance-audit vs live code + DB (**audit by the
DECLARED SEMANTIC — `css_property`/`role`/the manifest — never by identifier NAME; ≥2 signals before an
"absent" verdict**) → `/gap-analysis` → `/strategic-plan` → execute. Known open: FR-35-5 (`states`) +
FR-35-6 (`animation`), both APPROVED NOT BUILT; rollout waves 2-3; card-grid resting-state defect;
`P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` (finish the 76 unaudited before overwriting 94 rows on an
18-row sample). Derive figures: `node check-element-manifest-conformance.js`. **Depends on:** Task 3.

---

## Dependency graph
```
Task 1 (deploy + live BoxControl check — needs a clean tree)
Task 2 residuals (independent; measure-first / seed-hygiene — any converter session)
   ↓
Task 3 (Spec 31 100%: phase-f fixtures → check_landed → live verify + Bean's eye)
   ↓
Task 4 (Spec 35: read → parallel audit → plan → execute)
```

## Structural defences — STOP catalogue (carry forward, never subtract — D101)
The 6 tokens Track 1 owed were LANDED into `.claude/STOP-CATALOGUE.md`
(`STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`, `STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`,
`STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`, `STOP-VERIFY-THE-DELIVERABLE-EXISTS`,
`STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`, `STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`).
The most load-bearing for this track, restated because they bit again:

- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be the other
  session's racing commit. Verify via `git log -1` + `git status`, never the reported hash.
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — the pre-commit visual-diff gate blocks any touch of
  a block's render.php/block.json/edit.js; its own message sanctions `--no-verify` for non-visual
  changes. Use that; never fabricate a PASS report. (Used correctly this session for the cta box-object.)
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — before banking a PASS ask "would this still pass
  if the feature were absent?"
- **STOP-AUDIT-BY-DECLARED-SEMANTIC-NOT-IDENTIFIER-NAME** — asking "does anything consume X?" by
  searching NAMES misses semantically-named consumers (`scaleHover` consumes `transform`). Require
  ≥2 signals before recording an "absent" verdict. (This session: the name-build's 6 wrong routes were
  exactly this — matched by NAME onto the wrong element/state.)
- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** (Track 2, D362) — put "EXECUTE YOURSELF with
  your OWN tools; do NOT use the Agent/Task tool to delegate" in every implementer dispatch.
- **STOP-A-HALF-FINISHED-FIX-IS-WORSE-THAN-NONE** — a repair on ONE side of a two-sided mechanism
  looks done and keeps failing. Treat any "FIX N"/"fixed" comment as a CLAIM to verify end-to-end.
- **STOP-READ-AN-INSTRUMENT'S-SEMANTICS-BEFORE-CALLING-ITS-OUTPUT-A-BUG** — read what a measurement
  CLAIMS to measure before calling its output wrong; check a suppression mechanism's KEY before using it.
- **STOP-A-CHANNEL-THAT-EXISTS-IS-NOT-A-CHANNEL-THAT-IS-WIRED** — grep for the CALL SITES of an
  injectable callback, not just its definition (2026-07-23).
- **STOP-READ-THE-RENDERER-THAT-ACTUALLY-RUNS** — `sgs/product-card` has TWO renderers; confirm WHICH
  file produces the live markup before reasoning about it (2026-07-23, Bean-caught).
- **STOP-A-COINCIDENTAL-DEFAULT-LOOKS-LIKE-FIDELITY** — a value that matches the block's own default
  proves nothing about routing (2026-07-23).
- **STOP-YOUR-FRAMING-BECOMES-THE-COUNCIL'S-BLIND-SPOT** — ask the council what you might be MISSING,
  not only to choose among your pre-formed options (2026-07-23, Bean-caught — the box-object mechanism).
- **STOP-VERIFY-A-BOX-OBJECT-MIGRATION-DEFAULT-FALLS-THROUGH** — NEW 2026-07-23. Migrating axis-pair
  scalars (paddingX/Y with defaults) to a `{}` object default silently DROPS the old defaults (empty
  object emits nothing). Before calling a box-object migration non-visual (and using `--no-verify`),
  PROVE the empty-object falls through to an EQUAL base rule. `sgs_box_object_shorthand({})` returns
  null → the block falls through to its base CSS; verify that base equals the old scalar defaults.
- **STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT** · **STOP-VERIFY-THE-DELIVERABLE-EXISTS** ·
  **STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START** · **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** —
  carried forward verbatim; full text in `STOP-CATALOGUE.md`.

**ADD to STOP-CATALOGUE.md when Track 2 is idle** (the 4 from the prior prompt + the new box-object one
above; re-derive the `previous` count with the canonical command in that file's §D receipt — never
carry a figure forward from a prior read).

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `parking.md`, `decisions.md`,
   `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, `site-*`, spec 36/37, `header-*`, `icon-list/*`)?
2. Touching the converter? → Spec 31 read IN FULL, design-gated, `/qc-council` before commit.
3. About to accept a subagent claim? → re-derive it from the tool. (This session: the wp-sgs-developer
   agent's "non-visual" claim needed the default-fall-through verified against the base CSS.)
4. After committing → does `git log -1` show MY message at HEAD + `git status` clean?
5. Banking a PASS? → would it still pass if the feature were absent?
6. Recording something as "absent / missing / excluded"? → ≥2 signals, including the declared
   semantic, not just the identifier name?
7. Diagnosing from a file? → is it the file that ACTUALLY runs (build vs src vs a second renderer)?

## Guardrails
- **Deploy: `build-deploy.py --target sandybrown` ONLY.** Never hand-roll tar/scp/`rm -rf` (D336).
  `md5sum` local↔server BEFORE measuring. NEVER `--allow-dirty` on a shared tree (D336's trigger).
  On a dirty shared tree, deploy from an ISOLATED worktree (copy `build/`, `--skip-build`).
- Converter changes: `/qc-council` before commit; verify on the REAL draft + the live code path.
- DB authoritative — never hardcode a count (`/sgs-db`, `/wp-blocks`).
- Manual DB edits BANNED — dated migration OR the `attr-classification-overrides.json` channel + a
  `/sgs-update` reseed. (This session: hover `css_state` + splitImage tier fixes went via the override
  channel; the full `/sgs-update` pruned the retired attrs + seeded box_family.)
- Every deferral maps to a named spec STAGE, never "out of scope" (STOP-29).
- Time estimates default LOW; smallest first action < 5 min.
- Suites before AND after, from `plugins/sgs-blocks/scripts`:
  `python -m pytest converter/ ledger/ oracle/ -q` · `python ledger/coverage_check.py --check` ·
  `python ledger/coverage_check.py --report --with-landed` (the LANDED leg) ·
  `python converter/gates/no_slug_literal.py` · `python db-consistency/run.py`

## Open residuals (parked elsewhere, not blockers)
- `P-CLONE-TEAM-MEMBER-ITEM-HEIGHT-DIVERGENCE` — the height guard is `measured=False` for fixture-canary
  runs (non-comparable environments); needs a same-environment render to judge.
- `P-NAVMENU-UNDERLINEOFFSET-CSSPROP-MISSEED` — `underlineOffset` seeded `css_property='position'`.
  Pairs with the 3 NULL-element misroutes in Task 2.3 (same seed-hygiene pass).
- `P-POSTGRID-SCALEHOVER-OUT-OF-B3-SCOPE` — per-item + multi-property; hover scale still drops.
- `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN` — an EDITOR control-state bug; needs a live Playwright repro.
- `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — Task 4.
- **Per-side border transfer** — real gap, NOT built. Rides the existing box-object mechanism
  (`borderWidth` is a 4-side family on 8 blocks), so ~2 converter functions, not 40 render.php files.
  Needs Bean's design gate.
- **Doc drift found, not fixed:** `sgs-draft-vocabulary.md:142` maps the `separator` slot to the
  RETIRED `sgs/divider` (now `sgs/separator`); `Spec 32:153` says 4 blocks carry `borderWidth`, DB says 8.
