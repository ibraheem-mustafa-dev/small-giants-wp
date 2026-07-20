---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 2 — Spec 36 navigation. PHASE 1 CLOSED 2026-07-20 (Gate-1 passed + Bean-signed; FR-36-1 classic menus shipped, D352; roster/DB close-out done). Next = Phase 2: mega CPT + Indus cutover + footer round-trip."
generated: 2026-07-20
note: "Track 1 (Spec 35 block-inspector-UX) has its own live prompt at .claude/next-session-prompt-spec35-track1.md — preserved verbatim 2026-07-20 when this canonical file was handed back to Track 2. Do not clobber it."
---

# Next session — Spec 36 **PHASE 2** (mega menu + Indus + rich modes)

Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** Track 1 (Spec 35 inspector UX) is live at
> `.claude/next-session-prompt-spec35-track1.md`; Track C is `feat/core-block-migration`. Path-scope every
> commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.

## First action

**Smallest first step, under 5 minutes, zero dependencies:** run the `show_in_nav_menus` spike for Task 1 —
register a throwaway CPT with `show_in_nav_menus: true` on the canary and confirm it appears in the
*Appearance → Menus* "add items" panel. Spec 36 §12 requires this be PROVEN before the mega work is built on
it, and it settles the single riskiest assumption in Phase 2 before any code is written.

## Mandatory READING — read these before anything else

1. **`.claude/LEDGER.md`** — the single living status. Nav section first.
2. **`.claude/STOP-CATALOGUE.md`** — **57** STOP entries + the pre-flight ritual. **Answer the ritual inline
   before your first Write/Edit.** 6 entries are new from 2026-07-20; each records a real failure.
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — the canonical nav spec, IN FULL.
   ⛔ **Spec 34 is DELETED — never cite it.** Spec 31 remains the standing cloning spec; read it in full for
   any converter work.

## Why this matters (motivation — Rule 7)

The header/footer/nav system is the last big gap between "SGS builds pages" and "SGS builds *sites*". Every
client build needs a nav, and until this is done the cloning pipeline has nothing to emit into. **Top USP:**
one nav that is faithful to a draft, accessible by construction, crawlable without JS, and editable by a
non-coder — which is exactly what Kadence/Spectra headers are not. Phase 1 proved the shape works on a real
client page; Phase 2 makes it rich enough for Indus.

## Plain-English state

**Spec 36 Phase 1 is CLOSED.** The navigation is built, live on the sandybrown canary, machine-green, and
signed off by Bean's eye. Classic WordPress menus (*Appearance → Menus*) now drive it — the last unbuilt
requirement, landed 2026-07-20 (D352). The roster/doc close-out is done, and a build gate that had been
silently failing (`/sgs-update` Stage 11) is green again.

## What is DONE — do not redo

- **Phase 1:** shared `store('sgs/nav')`, `sgs/nav-menu` (bar + burger), `sgs/nav-drawer` (`<dialog
  showModal>`, content-KIND block-private per D294), `scripts/nav-qa/` tooling, header re-authored in
  `parts/header.html`. `sgs/adaptive-nav` stays registered but dormant = the rollback path.
- **Gate-1 PASSED:** drawer axe **0** · elementFromPoint sweep **20/20** (10/10 at 375) · crawl-assert PASS
  with JS off · burger/ESC/focus/Tab · CLS 0.0000–0.0144 · **Bean's eye** · **D340 bounce** (Bean, manual).
- **FR-36-1 classic menus (D352):** resolves CLASSIC-FIRST then `wp_navigation`; classic items normalised
  into the same block-shaped array so nothing downstream changed; editor picker lists classic menus.
- **Close-out:** Spec 17 §S9-1 + Spec 00 §2.1 rosters refreshed · `no-header-footer-block.py` needs no change
  (proven by executing it) · Spec 29 roster fixed → Stage 11 exits 0 · **30 DB attrs registered**.

## ⛔ Two things you must NOT "fix"

- **The featured item's hover does not match the draft. THIS IS DELIBERATE.** The draft's
  `box-shadow: inset 0 -2px 0 var(--accent)` has no attribute to carry it. **Bean locked it as the planted
  TEST CASE for header cloning** (`P-NAV-FEATURED-HOVER-DRAFT-PARITY`, status BLOCKED). Adding an attribute
  or routing to `sgsCustomCss` is **forbidden** until header cloning exists and has run against it.
- **Do NOT delete the `sgs/adaptive-nav` registration** until the Indus header is re-authored (FR-36-18) — it
  is the rollback path. Same for `sgs/mega-menu`: Phase-2 scope, not dead code.

## Task 1 — `sgs_mega_menu` CPT + native attach

**What:** Build the mega-menu CPT and prove an operator can attach one to a menu item in *Appearance → Menus*,
rendering at its **real menu position** (the old "mega renders last" bug must be structurally impossible).
**Why:** Gate-2 needs the Indus mega; everything else in Phase 2 depends on this existing.
**Estimated time:** 40–60 min for the CPT + attach spike (layouts separate).

**Orchestration:**
- Execution: **inline** (main thread, Opus) for the architecture; the 5 layout templates can be delegated.
- **Do the `show_in_nav_menus` SPIKE FIRST** — Spec 36 §12 says this must be PROVEN, not asserted, and warns
  that `class-product-templates-cpt.php:70` sets it to **FALSE** (a wrong citation). Register the CPT with
  `show_in_nav_menus: true` and confirm it appears in the "add items" panel before building on it.
- Model: n/a (inline). Depends on: none. Parallel with: Tasks 2 + 3.
- **`/qc` gate after: yes** — `/qc-council` (converter/block logic, blub.db 255) + live canary check.

**Acceptance:** a `sgs_mega_menu` post attached via *Appearance → Menus* renders its panel at its real
position, server-side, crawlable with JS off, `nav-qa` still green. Per **STOP-29** map any unbuilt part to a
named spec STAGE — never "out of scope". Per **STOP-NEGATIVE-CONTROL** the test must use a signal unique to
the mega, not one the existing bar would produce anyway.

## Task 2 — FR-36-18 Indus header cutover

**What:** Re-author the Indus (palestine-lives.org) header onto `sgs/nav-menu` + `sgs/nav-drawer`, as done for
Mama's. Only once live and verified may the `adaptive-nav` registration + DB row be retired.
**Why:** It is the last thing pinning the old nav block, and it proves R-31-9 universality on a 2nd client.
**Estimated time:** 30–45 min.

**Orchestration:**
- Execution: inline, or delegate to `wp-sgs-developer` if it grows into heavy build work.
- Depends on: none. Parallel with: Tasks 1 + 3.
- **`/qc` gate after: yes** — per **STOP-VERIFY-EVERY-CLIENT**, verify on BOTH sites, not one.

**Acceptance:** Indus header renders from the new blocks; 0 overflow at 375/768/1440; drawer axe 0; crawl PASS
with JS off. THEN delete the adaptive-nav registration + retire its DB row via `/sgs-update`.

## Task 3 — Footer round-trip proof

**What:** Prove the Site-Editor → frontend round trip for the **FOOTER**. The header half is proven; the two
are wired differently, so the footer needs its own test.
**Why:** The one real residual from the struck Spec-34 item — do not lose it.
**Estimated time:** 15 min. **Orchestration:** inline. Depends on: none. **`/qc` gate: yes.**
**Acceptance:** an edit made in the Site Editor to the footer part appears on the live frontend after deploy.

## Dependency graph

```
Task 1 (mega CPT — spike show_in_nav_menus FIRST)  ─┐
Task 2 (Indus cutover)                             ─┼─ parallel, independent ─ /qc + nav-qa regression
Task 3 (footer round-trip)                         ─┘
                                                     ↓
                        Task 2 green → delete adaptive-nav registration + DB row
                                                     ↓
                   commit (path-scoped, branch re-checked in the SAME command)
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — build + deploy + cache clear BEFORE any live test, or you measure stale output.
- **Checksum every deploy.** `build-deploy.py` printing `[DONE]` + `[verify] HTTP 200, markers present` does
  NOT mean your change shipped — that verify passes on ANY working SGS page, including one running old code.
  `md5sum` the changed file local↔server BEFORE measuring. A co-active session once silently reverted a
  verified fix and a false `verdict: PASS` reached Bean.
- **On a shared canary a PASS is perishable** — re-assert before quoting an earlier live result.
- **Negative control, or the test is vacuous** (NEW 2026-07-20) — before banking a PASS ask *"would this still
  pass if the feature were absent?"* If yes it proves nothing. This caught a false FR-36-1 pass mid-session.
- **Verify an inherited deferral before executing it** (NEW 2026-07-20) — a queued task is a hypothesis about
  the world when it was written. One such item, executed as written, would have deleted the rollback path.
- **Read the draft before designing a clone fix** — a divergence usually means the block has NO attribute able
  to carry the value (silent drop, the D338 class), not a policy gap. An a11y defect on a clone whose draft is
  accessible is a FIDELITY defect.
- **Never claim a scrollbar-dependent test passed from the harness** — headless reports
  `innerWidth - clientWidth = 0` (overlay scrollbars). Report INCONCLUSIVE and route it to Bean.
- **`dialog.close()` kills exit animations** — `display:none` in the same tick. Animate first, close on
  `animationend`. Native ESC bypasses your close handler entirely.
- **Root cause before instance fix** — ask "what is the CLASS of failure?" before fixing the specific case.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Do not redefine done.
- **Shared-worktree git discipline** — re-check branch in the SAME command as the commit; commit by EXACT path;
  if `push` is rejected do NOT stash another session's files — use an isolated worktree
  (`git worktree add /c/tmp/x origin/main`) or `git merge origin/main`.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Known-open, NOT blockers (do not re-litigate)

- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — Bean reported the inspector's Styles tab blanking the sidebar on
  `sgs/nav-menu`. **NOT REPRODUCED** across all 3 nav blocks with every panel force-opened, zero console errors.
  Bean deprioritised it. Needs his console capture; do not guess at a cause.
- **`P-CANARY-PAGE-WEIGHT-BUDGET`** — CSS 371KB / JS 84KB vs 100/50KB, but nav is only 17.3KB and WooCommerce
  alone exceeds the CSS budget. Cheap win: `mega-menu-panels.css` (13.1KB) loads with no mega menu present —
  **Task 1 may make this moot; recheck before acting.**
- **`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`** + **`P-CANARY-SHARED-DEPLOY-RACE`** — see guardrails.
- **`P-AUDIT-COLOUR-ROLE-KEYED`** · **`P-VISUAL-GATE-ORDERING`** · **`P-NAV-ITEM-SEPARATORS`** ·
  **`P-NAV-INSTANCE-CONFIG-DUPLICATION`** · **`P-WP7-PLATFORM-ALIGNMENT`**.
- **Container-mirror dry-run:** `sync-container-wrapping-blocks.py` reports **259 attr additions + 20 support
  changes across 15 blocks** it could apply. NOT applied — shared-wrapper capability propagation is design-gate
  territory (Rule 7). A decision for Bean, not a silent sweep.

## Tool bindings

The three tables below are the binding dispatch set for this session — skills, MCP servers, and agents.
Route through them rather than hand-rolling equivalents.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building (mega layouts) |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | Plan implementation order before writing code |
| `/sgs-wp-engine` | The SGS framework skill — any block/theme work |
| `/wp-block-development` | Core WP block-API questions (CPT registration, nav-item shapes) |
| `/qc-inline` | Small acceptance gates |
| `/qc-council` | Multi-rater before any converter/pipeline/SGS-block commit |
| `/systematic-debugging` | Root cause before fix |
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
| `wp-sgs-developer` | If Task 1 or 2 grows into heavy WP build work |
| `code-reviewer` | Pre-commit review of the CPT + attach code |
| `test-and-explain` | Plain-English confirmation for Bean that the mega menu works |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Read the governing spec (Spec 36 in full; Spec 31 for converter work) + recent decisions + LEDGER?
2. Did the prior in-session work actually LAND? (Read the LEDGER's live status.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL 8 client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
   (STOP-HIDDEN-PARALLEL-SYSTEM.)
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for any
   scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in the SAME
   command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. **Would my acceptance test still pass if the feature were absent?** (STOP-NEGATIVE-CONTROL.)
12. **Is this inherited task's premise still true?** (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)