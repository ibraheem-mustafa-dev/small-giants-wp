# Session Handoff — 2026-06-02 (CLONING thread) — Workstream A shipped + container/wrapper standardisation programme

> Cloning thread. A parallel THEME thread is/was active on the shared tree this session (it took D151 product-card Phase C + pushed commits; mine is D152). Shared docs (decisions/parking/parking-archive) carry both threads' entries — committed by explicit path, acknowledged. Full programme spec: `.claude/plans/2026-06-02-container-wrapper-standardisation.md`.

## Completed This Session
1. **Task 1 — 4-block save-null fix editor-/qc'd LIVE (PASS).** feature-grid/multi-button/tab/accordion-item: 0 invalid blocks, InnerBlocks children survive save→reload (Playwright on canary 144). The D150 fix is confirmed working. (Branch already squash-merged to main pre-session — drift from the prompt, caught + verified.)
2. **Task 2 — Workstream A SHIPPED + pushed (`0d746073`).** Rewrote `sync-container-wrapping-blocks.py` (DB/source-detected roster, R-22-1 clean) + `block_composition.container_kind` migration + seed-composition-roles renames trust-badges→trust-bar + inserts option-picker + 3 role flips + trust-bar/modal `containerKind:"section"`. 4-rater qc-council (Gemini 403 + Cerebras 404 down) caught the UPDATE-only silent 26/28 undercount → fixed (fail-loud + rollback). `--apply` wrote all 28, verified 0 missing/malformed.
3. **Container/wrapper system deep-analysed.** Bean reframed: no composite evades R-22-9 (my "recognised block exempt" was the cheat); composites must MIRROR sgs/container via the block_composition propagation substrate. 4-branch code analysis + 6-step target/current compare + artefact-empirical proof.
4. **The empirical smoking gun:** the fold (`absorb_skipped_child`→`fold_into_container`) deletes the `__inner` + discards max-width → it STRANDS in variation-d0-d2.css targeting a now-deleted selector; leftover-buckets names it; composites get confidence 1.0 (tier=class-section) vs containers 0.0 (deferred-no-match). featured-product 91.9%@1440.
5. **5-workstream standardisation plan written + qc-council'd (`1d846667`).** Plan + Spec 22 §FR-22-21 (canonical wrapper-conversion procedure) + flow/stages + D152 + parking. 2-rater doc-council → DOCS-COMPLETE + 2 wrong claims fixed (D1 count, FR-22-21 roster).
6. **Mockup:** removed the has-halal trust-bar 5th-column rule (Bean — added manually, later dropped).
7. **`/sgs-update` ran clean** (9 stages) — DB current with Workstream A: 190 blocks (68 sgs + 122 core), +2 attrs, 02-SGS-BLOCKS-REFERENCE regenerated, 0 orphans.
8. **Full doc-walk — ALL stale docs in `.claude/` + specs/ + plans/ reconciled** (Bean caught that the first pass only touched a handful). ~16 docs updated: root+`.claude` CLAUDE.md (active focus + framework stats + composite-mirror rule), architecture/goals/plan/dev-setup/mistakes (+13 stubs archived), specs 02/00-naming/19/21/22, + SUPERSEDED banners on the 3 stale container plans (2026-05-31-container-* + converter-content-routing-fix → status superseded).
9. **2nd qc-council on the doc set + fixes applied.** Caught the doc-walk's incomplete Spec 22 sweep — fixed ~7 stale `188`→`189` (real count) + `4 blocks (…quote)`→`28-block roster` claims + added the `container_kind` row to the §FR-22-17 schema table; corrected the converter-content-routing-fix banner (it's a CONTENT-routing plan, not width — G4 shipped as Workstream A, residual G1/G3 → WS-2).
10. **Lesson-capture endpoint FIXED.** `/api/corrections` is dead (308→`/api/learning`, urllib doesn't follow → silent fail). Fixed the handoff command (`commands/handoff.md`) + the canonical `autopilot/references/correction-capture.md` (endpoint + payload: content field is `learning`, not `summary`/`lesson`). capture-lesson skill was already correct. Real lesson `no-composite-evades-universal-rule` re-posted (blub.db id 301).

## Current State
- **Branch:** `main` at `1d846667`+ (pushed; this turn's doc-reconciliation commit pending). Commits this session: `0d746073` (Workstream A code) + `1d846667` (standardisation docs) + `28b056a0` (handoff trio) + the doc-reconciliation commit.
- **Tests:** no suite; converter imports clean; `--apply` verified all 28 rows written.
- **Build:** n/a (no block code changed this phase — build deferred per the plan).
- **Uncommitted changes:** `lucide-icons.php` (auto-regen, never committed).

## Known Issues / Blockers
- The container/wrapper standardisation BUILD is NOT started — programme-sized, deferred to fresh sessions. WS-1 (sgs/container 3-layer) gates WS-4 (composite mirror).
- Concurrent theme thread shares the tree — coordinate commits (explicit path; check `git log -1 --stat`).
- B1 (D1 written-not-consumed) needs a Bean decision (revive vs DB-replace) before WS-2 build.

## Next Priorities (in order)
1. **WS-1 — sgs/container 3-layer completion** (the build opener): content-width attr + inner-wrapper render (A1), outer max-width transfer + kill hardcoded widthMode:full (A2), custom-width centring (A3), raw-px gap (A4), min-height (A5), gridItem* (A6). Sensitive core-block change → design-gate + /qc-council.
2. **WS-3 — de-cheat** (parallel with WS-1): hardcoded lists → DB; trust-bar static grid → attr-driven.
3. **WS-2 — converter/router truth** (after B1 decision).
4. **WS-4 — composite standardisation + auto-propagation** (after WS-1): shared PHP helper + propagation writer + /sgs-update wiring.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` | rewrite + fail-loud --apply (Workstream A) |
| `plugins/sgs-blocks/scripts/seed-composition-roles.py` | rename/insert/flip rows (Workstream A) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | container_kind migration |
| `plugins/sgs-blocks/src/blocks/{trust-bar,modal}/block.json` | containerKind:"section" |
| `.claude/plans/2026-06-02-container-wrapper-standardisation.md` | NEW — 5-workstream plan |
| `.claude/specs/22-...md` | §FR-22-21 wrapper-conversion procedure |
| `.claude/cloning-pipeline-flow.md`, `-stages.md` | procedure + gap callouts |
| `.claude/decisions.md`, `parking.md`, `memory/parking-archive.md` | D152 + parking restructure |
| `sites/mamas-munches/mockups/homepage/index.html` | removed has-halal rule |

## Notes for Next Session
- **No composite evades R-22-9** — the standardisation makes composites mirror sgs/container; never exempt a "recognised block" (new STOP #43; memory `feedback_no_composite_evades_universal_rule`).
- **Verify subagent gap-claims against code** — I relayed an extraction subagent's hero "gaps" as fact; Bean made me verify (they were a mis-modelling). Treat subagent findings as hypotheses.
- **D-number collisions on the shared decisions.md** — theme thread took D151; I used D152. Re-read before editing shared living-docs.
- The contentWidth design CORRECTED this session: inner-WRAPPER model (not cap-each-child) — children keep their own CSS incl. label left-align (the earlier label-centring worry evaporates).

---

# Session Handoff — 2026-06-02 (CLONING PIPELINE thread) — container roster + DB-table + save-null

> Cloning thread. Theme thread is DONE + merged to main (`a8cb3ff9`); no parallel session active. Full specs in `.claude/scratch/2026-06-02-container-roster-db-table-handoff.md` + `.claude/scratch/2026-06-04-css-transfer-gaps-1-2-fix-shape.md`.

## Completed This Session
1. **Full warm-start reading** of the cloning-pipeline docs (next-session-prompt, handoff, Spec 22/21/24, decisions, flow+stages, draft index.html, theme.json, container render.php/style.css, converter walk/fold/db_lookup, memory).
2. **CSS-transfer contentWidth (gaps 1+2) designed + qc-council-validated + @1440 baseline-measured** (draft localhost :8137 vs page 144). Option B locked by Bean (sgs/container gains a contentWidth capability; fold lifts `__inner`'s max-width). NOT built. Fix-shape doc written.
3. **Container-bearing roster validated via 5 qc-council rounds** → final 28-block roster + 3-KIND role-based model (section/layout/content). Corrected my own wrong criterion (Bean caught it: container-ness is structural/InnerBlocks, not attr-presence).
4. **Workstream B SHIPPED** — 4-block save-null gotcha-B4 fix (feature-grid/multi-button/tab/accordion-item) via 5 parallel Sonnet subagents (verify-then-fix); mobile-nav EXCLUDED (Bean: server-rendered). Built clean. Commits 0c1078cf + d5ebe439. NOT editor-/qc'd or merged.
5. **Workstream A (DB-table fix) spec'd + validated, NOT built** — deferred to fresh session (STOP #19).
6. Decisions D150, parking (P-CONTAINER-KIND-ROSTER, P-TRUSTBAR-BOUND-GRID, P-CSS-TRANSFER-CONTENTWIDTH), state + next-session-prompt updated.

## Current State
- **Branch:** `feat/block-composition-container-kind` @ `d5ebe439`, off main @ `3c388195`. Workstream B only. NOT pushed/merged (awaits editor /qc).
- **Tests/Build:** sgs-blocks `npm run build` PASSES (5 blocks compiled clean).
- **Uncommitted:** `lucide-icons.php` (documented auto-regen, never committed); scratch handoff docs (gitignored, on disk).

## Known Issues / Blockers
- Workstream B not yet editor-validated (deprecations) or merged — Task 1 next session.
- Workstream A + contentWidth + gaps 3/4 are designed/validated but NOT built.

## Next Priorities (in order)
1. Task 1 — editor /qc the 4 save-null deprecations → merge B to main.
2. Task 2 — Workstream A (block_composition roster/DB-table) — single Sonnet subagent → /qc-council → Bean sanity-check → --apply.
3. Task 3 — contentWidth (gaps 1+2) — Sonnet build → deploy → re-measure → /qc-council.
4. Tasks 4-7 — gap 3 (hero gradient), P-TRUSTBAR-BOUND-GRID (gap 4), variant-routing rollout, image sideload.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/src/blocks/{feature-grid,multi-button,tab,accordion-item}/` | save.js → InnerBlocks.Content + deprecated.js (save-null fix) |
| `.claude/decisions.md` | D150 (roster + 3-KIND + save-null) |
| `.claude/parking.md` | P-CONTAINER-KIND-ROSTER, P-TRUSTBAR-BOUND-GRID, P-CSS-TRANSFER-CONTENTWIDTH |
| `.claude/{state,next-session-prompt,handoff}.md` | this session |
| `.claude/scratch/2026-06-02-container-roster-db-table-handoff.md`, `2026-06-04-css-transfer-gaps-1-2-fix-shape.md` | full specs (gitignored) |

## Notes for Next Session
- **Orchestration philosophy (Bean-locked):** prefer single Sonnet subagent over Opus-inline (token/context efficiency); parallel where disjoint; /qc after every considerable change. STOP #42 + ritual Q11.
- **Council framing lesson (STOP #39):** a council validates the criterion it's given — frame around the real signal, not a proxy.
- The next-session-prompt has the full per-task orchestration plan + dependency graph.

---

# Session Handoff — 2026-06-03 (CLONING PIPELINE thread)

> Cloning thread. The theme/blocks thread runs in a parallel session (shared branch) → `.claude/handoff-theme.md` + `.claude/next-session-prompt-theme.md`. Prior handoffs in git history + `decisions.md`.

## Completed This Session
1. **Editor "invalid content" / "cannot be previewed" — root-caused from the runtime + FULLY FIXED + live-DOM verified (D141).** Playwright editor investigation found 2 issues in 2 layers: (a) 10 text-only leaf elements wrapped as `sgs/container`; (b) `sgs/media` `ReferenceError: imageId` in edit.js. Fixes: media `imageId` destructure; §FR-22-4.1 content-leaf step (tag-authoritative routing); compound prefix-strip (`card-tag`→label); `disclaimer`→`sgs/notice-banner` slot; badge repoint; chrome-skip header/footer. Editor store post-fix: 0 invalid blocks, 0 console errors.
2. **is-style carry + tag-authoritative content-leaf routing (D145, `b93a3b51`).** Drafts can request a block style (`is-style-*`) on a recognised block; the node's own tag is authoritative for content-type (img→media, etc.).
3. **`sgs/button` REPLACES `core/button` everywhere + WP-mirror `sgs/multi-button` grouping — P-9 COMPLETE (D146, `270cd995`).** 2-rater qc-council "P-9 COMPLETE: YES".
4. **Theme-wide button PRESETS (D147, `603cbaaf`).** `.sgs-button--primary/--secondary/--outline/--ghost` (+ element slots) → `sgs/button` with `inheritStyle` set → follows the theme preset. New `slots.standalone_block_default_attrs` column (also closes the parked subheading→heading need). qc-council caught + fixed a boolean-attr corruption bug (Finding 5).
5. **`<video>`/`<iframe>` → `sgs/media` (D147, `603cbaaf`)** + **`sgs/star-rating` Trustpilot style variations (D147, `6f7abca6`)** (flat-green + official-badge; REST-verified) — the social-proof trustpilot-bar can now clone via real components.
6. **Cart-block research (`/research-check`)** → architecture (Store API + Interactivity API, not cart-fragments) + a full theme-thread build prompt at `.claude/scratch/2026-06-03-prompt-sgs-cart-and-icon-enhancements.md`.

## Current State
- **Branch:** `main` at `66444790` — **all 2026-06-03 work (cloning D141/D145/D146/D147 + theme D142–D144) MERGED to main + pushed; `feat/fr22-4-1-universal-wrapper` deleted (local + remote); GitHub clean** (one `main`, no dangling branches). Bean directed the merge (overriding the prior merge-prep gate) at session end after the parallel theme session closed. No-ff merge, zero conflicts.
- **Tests:** no pytest in env; `db_lookup.py` equivalent_block_for smoke PASS; converter imports clean; all targeted unit + regression tests pass.
- **Build:** n/a for converter (Python). Block changes (media, star-rating) built + deployed to canary.
- **Uncommitted changes:** none (code committed; DB changes live in `sgs-framework.db`, not git-tracked).
- **Canary page 144** reflects the editor-fix re-clone (run `mamas-munches-homepage-2026-06-01-170153`).

## Known Issues / Blockers
- **CSS-transfer fidelity (the 4-gap D136 audit) is still unfixed** — it is the next priority (the pipeline's core job). Gap-4 brand premise was wrong (corrected: draft brand grid is `1fr 1fr`, no bug; only trust-bar grid is real).
- **Two unmerged branches were force-deleted at Bean's confirmation** — `feat/phase-2a-massive` (local, superseded) + remote `worktree-agent-adf7827adc88aea77` (the rejected Fix-4 hero / H2 thin-shell; FR-22-19/20 replacement shipped). Two LOCAL-only dispatch worktrees remain under `.claude/worktrees/` (one locked by a pid) — cosmetic, off GitHub.
- **Outcome check (Gate 3.5):** items 1–6 are OUTCOME ACHIEVED (editor errors gone — verified; button/preset/video/star-rating shipped + verified). The session's *editor-error + button* outcomes landed; the *CSS-transfer fidelity* outcome was NOT this session's scope and remains pending.

## Next Priorities (in order)
1. **Faithful CSS transfer (the 4-gap audit, D136)** — gap 1 (theme-CSS by position) + gap 2 (fold must stop dropping `__inner`), paired; then gap 3 (hero gradient) + gap 4 (trust-bar grid only). Design via /brainstorming + /qc-council first (sensitive).
2. **Real image sideload (media-map)** — hero/product images dry-run 404; biggest pixel lever once structure is faithful.
3. **Variant-routing rollout** (modifier-class mechanism, D135); video/iframe→media is done so a future media-video clone can use it.
4. **Bean visual sign-off (R-22-13)** on canary 144 once the CSS-transfer fidelity work lands — the merge already happened, so future fidelity work commits to `main` (or a fresh short-lived branch), no big long-lived branch.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | content-leaf routing, button grouping, is-style carry, slot-default-attrs apply, modifier→inheritStyle (string-gated), video/iframe `_atomic_attrs_for` |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | prefix-strip Path 2b; `_slot_alias_to_default_attrs`/`slot_default_attrs_for`/`inherit_style_presets` helpers |
| `plugins/sgs-blocks/src/blocks/button/block.json` | `replaces: core/button` |
| `plugins/sgs-blocks/src/blocks/media/edit.js` | destructure `imageId` (editor crash fix) |
| `plugins/sgs-blocks/src/blocks/star-rating/{block.json,render.php}` | Trustpilot style variations |
| `.claude/decisions.md`, `state.md`, `next-session-prompt.md` | D147 + state + prompt update (STOP catalogue 36→38) |
| `sgs-framework.db` (live, not git) | `slots.standalone_block_default_attrs` column; button-preset slots + hyphenated aliases; `disclaimer` slot; badge repoint; video/iframe `html_tag_to_core_block` rows |

## Notes for Next Session
- **DB changes survive `/sgs-update`** (slots not rebuilt; Stage 1 reconciles `blocks.replaces` from block.json). Bean ran `/sgs-update` in the parallel session — verified it kept all this session's slot work intact.
- **Faithful transfer ≠ converter detect-mode hacks** (STOP #33) — the CSS-transfer fix belongs in the D0/D1/D2 transfer layer or a theme-CSS-by-position rule, never a per-section walker conditional.
- **Both threads now landed on `main`** — the shared `feat/fr22-4-1-universal-wrapper` branch is gone. Future cloning work starts fresh from `main`. D-numbers through D147 (D141/D145/D146/D147 cloning, D142/D143/D144 theme). A 2026-06-01 concurrent-commit race (theme thread's commit swept the cloning thread's staged docs into `603cbaaf` under the wrong message) is captured in memory `feedback_concurrent_commit_race_shared_tree` — no longer a risk now the branch is single-owner `main`.
- A temp admin password was set then **restored** to the documented `.claude/secrets/sandybrown.env` value — that credential is valid.

## Next Session Prompt

The full orchestration plan lives in `.claude/next-session-prompt.md` (cloning thread) — read it end-to-end (warm start mandatory: STOP catalogue #1–38 + pre-flight ritual + mandatory reading list). Opener = faithful CSS transfer (the 4-gap D136 audit). Summary of mandatory tooling:

### Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST (auto-injected) — live routing + ADHD support |
| `/brainstorming` | Design the transfer-layer fix (sensitive: fold + theme-CSS) before coding |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | If a transfer approach needs the gold standard |
| `/strategic-plan` | Order the 4-gap fixes |
| `/systematic-debugging` | Root-cause each gap from artefacts + draft-diff |
| `/qc-council` | MANDATORY before every converter/block commit (blub.db 255) |

### MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | Serve the mockup on localhost + draft-vs-clone computed-style diff (`file://` blocked); live-DOM verification |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema enumeration before any "missing X" |
| `/sgs-db` (read) + `sqlite3` (writes) | DB ground truth |

### Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy converter / theme-CSS / fold build |
| `design-reviewer` | Visual parity draft-vs-clone after the transfer fix |

### Guardrails
- Deploy before measure (`build-deploy.py --blocks-only` + OPcache reset). Draft-diff, not pixel-diff, for layout. `--converter-v2` on orchestrator runs; `WP_DEBUG_DISPLAY` false on staging. `/qc-council` before every converter/block commit. Work on `main` (branch merged + deleted 2026-06-03); fidelity work commits to main or a fresh short-lived branch.
