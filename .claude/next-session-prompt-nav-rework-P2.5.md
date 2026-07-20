# Next session — Spec 36 Nav, PHASE 1 CLOSE-OUT (FR-36-1 classic-menu resolver)

Invoke `/autopilot` before doing anything else.

## READ THIS BEFORE ANYTHING ELSE

1. **`.claude/LEDGER.md`** — the single living status. Nav section first.
2. **`.claude/STOP-CATALOGUE.md`** — 55 STOP entries + the 10-question pre-flight ritual.
   **Answer the ritual inline before your first Write/Edit.** 4 entries are NEW from 2026-07-20
   and every one records a failure that actually occurred that session.
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — the canonical nav spec, IN FULL.
   (Spec 31 stays the standing cloning spec; read it in full for any converter work.)

## Plain-English state (read first)

The new navigation is **built, deployed, live on the sandybrown canary, and Gate-1 has PASSED** —
machine-green plus Bean's own sign-off. Waves 0–4 are done and on `main`. Bean personally
confirmed the D340 scrollbar bounce is gone ("100% fixed. Totally not there anymore.").

**Phase 1 is NOT closed**, because one spec requirement is genuinely unbuilt: Spec 36 **FR-36-1**
says **classic WordPress menus are the PRIMARY menu source**, and the resolver only handles
block-based menus. That is this session's job.

## What is DONE (verified — do not redo)

- **Waves 0–3:** shared `store('sgs/nav')`, `sgs/nav-menu` (flat bar + burger), `sgs/nav-drawer`
  (`<dialog showModal>`, content-KIND block-private per D294), `scripts/nav-qa/` tooling, header
  re-authored in `parts/header.html`. adaptive-nav stays registered but dormant = the rollback path.
- **Wave 4 / Gate-1 — ALL PASSED:** axe **0** on the open drawer · elementFromPoint sweep **20/20**
  (10/10 at 375 = the Spec 36 §8 Mama's baseline, via `scripts/nav-qa/probes.mamas.json`) ·
  crawl-assert PASS with JS off · burger/ESC/focus-return/Tab-containment · CLS 0.0000–0.0144 ·
  **Bean's eye PASSED** · **D340 bounce PASSED** (Bean, manual, real desktop browser).
- **D351** — featured nav item renders the draft's pill. The block had **no background attribute**,
  so the converter silently dropped the draft's fill; `featuredBg` added. Rest matches at 5.28:1.
- **Drawer animation** — `animateFrom` (auto/fade/right/left/top/bottom) + the exit animation fixed
  (it had **never once run**: `dialog.close()` hid the element in the same tick). ESC now routes
  through the same close path as ×/scrim.

## Task 1 — FR-36-1 classic-menu resolution (the one thing blocking Phase 1)

**What:** `includes/class-sgs-nav-menu-source.php::blocks_from_ref()` resolves only `wp_navigation`
posts + a page-list fallback. A classic `nav_menu` term reference renders **nothing**. Implement
classic-menu resolution via `wp_get_nav_menu_items()`, normalised into the same block-shaped array
the rest of the pipeline already consumes (so `SGS_Nav_Menu_Bar_Renderer::flatten()` and the drawer
need no changes).

**Why:** Spec 36 FR-36-1 names classic menus PRIMARY (Bean, 2026-07-18 — block-based `wp_navigation`
is a Phase-3 extra). Until this lands, FR-36-1 cannot honestly be called done.

**Estimated time:** 20–30 min including live verification.

**Orchestration:**
- Execution: **inline** (main thread, Opus) — small surface, spec-bound, needs judgement on the
  normalised shape and on the identifier rule (`id:` vs `label:`) staying consistent with edit.js.
- Model: n/a (inline). Dispatch pattern: n/a. Depends on: none. Parallel with: none.
- **`/qc` gate after: yes** — `/qc-inline` + a live render check on the canary.

**Acceptance (measurable, not "code shipped"):** a classic `nav_menu` term set as the block's `ref`
renders its items as real `<a href>` links **in the pre-JS HTML**, proven by
`node scripts/nav-qa/crawl-assert.mjs <url> --want-text "<item labels>"`. AND the existing
`wp_navigation` path still renders (regression), AND `scripts/nav-qa/` still returns axe 0 + sweep
20/20. Per **STOP-29**: if any part of FR-36-1 stays unbuilt, name the spec STAGE that owns it —
never "out of scope".

## Task 2 — small spec debt (do alongside Task 1)

Add the **FR-36-13 `<dialog>`-exception note** to Spec 36 (carried forward from the previous
prompt — still outstanding): a `<dialog>` cannot be hosted by `SGS_Container_Wrapper`, which is why
`sgs/nav-drawer` is content-KIND block-private rather than a wrapper composite (D294, Bean-approved).

## Task 3 — Phase 1 close-out (only if Tasks 1–2 land early)

Close Phase 1 in the LEDGER, then work the post-build deferrals that were waiting on the new
block-name roster (listed in the LEDGER's Track-2 history block): Spec 17 S9-1/-2/-8/-10, the
`00 §2.1` + `no-header-footer-block.py` roster, Spec 29 rows, and retiring the
`adaptive-nav`/`mega-menu`/`mobile-nav` DB rows via `/sgs-update`. **Do NOT delete the adaptive-nav
registration** until the Indus header is also re-authored (FR-36-18) — it is the rollback path.

## Dependency graph

```
Task 1 (inline, Opus)  ──┬── /qc-inline + live crawl-assert ── acceptance
Task 2 (inline, doc)   ──┘
                          ↓
Task 3 (only if time)  ── LEDGER Phase-1 close
                          ↓
                     commit (path-scoped, branch re-checked in the SAME command)
```

## Content refinements for the editor (carried forward)

- Menu 1467 links "Gift Ideas" → `/gifts/`, but the mockup and the created page are `/gift-ideas/`.
- "Our Story" has a submenu, flattened in Phase 1 by design.
- 5 mockup pages exist as menu targets: Shop=13, Our Story=1525, Send to Ward=1526,
  Gift Ideas=1527, FAQs=1528.

## Known-open, NOT Gate-1 blockers (do not re-litigate)

- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — Bean deferred. Track 1's hover work (`hoverStyle`,
  `featuredBgHover`) has probably absorbed it — **RECHECK against the live draft before re-opening.**
- **`P-CANARY-PAGE-WEIGHT-BUDGET`** — CSS 371KB / JS 84KB vs 100/50KB, but the nav is only 17.3KB;
  WooCommerce alone exceeds the CSS budget. Cheap win: `mega-menu-panels.css` (13.1KB) loads on a
  page with no mega menu.
- **`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`** + **`P-CANARY-SHARED-DEPLOY-RACE`** — see guardrails.
- **`P-AUDIT-COLOUR-ROLE-KEYED`** · **`P-VISUAL-GATE-ORDERING`** · **`P-DOC-SIZE-AND-DOCSCORE-RESIDUALS`**.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | Plan implementation order before writing code |
| `/sgs-wp-engine` | The SGS framework skill — any block/theme work |
| `/wp-block-development` | Core WP block-API questions (nav-item block shapes) |
| `/qc-inline` | The Task 1 acceptance gate |
| `/systematic-debugging` | If the resolver misbehaves — root cause before fix |
| `/wp-sgs-deploy` | Deploy ceremony + gates |

## MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification on the canary (R-31-11) — the canonical proof |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | If Task 1 grows beyond the resolver into heavy WP build work |
| `code-reviewer` | Pre-commit review of the resolver change |
| `test-and-explain` | Plain-English confirmation for Bean that classic menus now render |

## Guardrails

**Carried forward from the previous prompt (verbatim intent):**
- Cache-clear (LiteSpeed + Hostinger CDN) before ANY measurement. **Verify LIVE, not the emit.**
- Desktop browser for anything scrollbar-dependent.
- Bean rulings: converter/clone DEPRIORITISED until the whole header+footer+nav is done;
  featured-item = a block attribute.
- Track C `feat/core-block-migration` is a separate branch — leave it.
- **CORRECTED:** the old "no shared worktree / co-active tracks now" line is **WRONG and DEAD**.
  Co-active sessions ARE live in this worktree (Track 1 hover work ran concurrently on 2026-07-20
  and overwrote the canary once).

**NEW from 2026-07-20 — each records a real failure that session:**
- **Checksum every deploy.** `build-deploy.py` printing `[DONE]` + `[verify] HTTP 200, markers
  present` does NOT mean your change shipped — that verify passes on ANY working SGS page,
  including one running old code. `md5sum` the changed file local↔server BEFORE measuring anything.
  A co-active session silently reverted a verified fix and a false `verdict: PASS` reached Bean.
- **On a shared canary a PASS is perishable** — another session can overwrite you at any moment.
  Re-assert before quoting an earlier live result.
- **Read the draft before designing a clone fix.** A divergence usually means the block has NO
  attribute able to carry the value (silent drop, the D338 class) — not a policy gap needing a new
  rule. An a11y defect on a clone whose draft is accessible is a FIDELITY defect.
- **Never claim a scrollbar-dependent test passed from the harness** — headless reports
  `innerWidth - clientWidth = 0` (overlay scrollbars). Report INCONCLUSIVE and route it to Bean.
- **`dialog.close()` kills exit animations** — it makes the element `display:none` in the same tick.
  Animate first, close on `animationend`. Native ESC bypasses your close handler entirely.
- **Shared-worktree git discipline:** re-check the branch in the SAME command as the commit; commit
  by EXACT path (never `git add -A`); if `push` is rejected, do NOT stash another session's files —
  use an isolated worktree (`git worktree add /c/tmp/x origin/main`) or `git merge origin/main` when
  the incoming commits don't touch their dirty files.
