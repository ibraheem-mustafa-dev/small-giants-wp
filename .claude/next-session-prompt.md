---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Spec 37 — Header/Footer Builder. Spec 17 DELETED 2026-07-21; Spec 37 written + gated (31 FRs, coverage matrix, adversarial council). NOTHING BUILT. Next = the 6-FR minimum core that makes a CPT header become the live header, plus two verified live bugs and the carried-forward Indus cutover."
generated: 2026-07-21
supersedes: the 2026-07-21 morning prompt (Spec 36 Phase 2 — its Task 1 token-lint fix is DONE, its Task 4 footer round-trip was mis-scoped and re-scoped)
---

# Next session — Spec 37 **6-FR MINIMUM CORE** (build the header binding, at last)

Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35 track commits between handoffs (`2e455c5a`,
> `8a5b6ac4`, `bfc59a28` landed mid-session on 2026-07-21). `.claude/mistakes.md` and the
> `next-session-prompt-spec35*.md` files have UNCOMMITTED changes that are **not yours**.
> Path-scope every commit, re-check `git branch --show-current` in the SAME command as the commit,
> never `git add -A`.

## First action

**Smallest first step, under 5 minutes, zero dependencies:**
`grep -rn "sgs_active_header_cpt_id" plugins/sgs-blocks/ | grep -v build/`

It returns **nothing**. That single absent option is the whole reason a client cannot yet edit a
header in the admin and see it on their site — and FR-37-2 is one small change that creates it.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status.
2. **`.claude/STOP-CATALOGUE.md`** — 59 STOP entries + the pre-flight ritual. **Answer the ritual
   inline before your first Write/Edit.**
3. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** — the governing spec, IN FULL. New 2026-07-21.
   ⛔ **Spec 17 is DELETED — never cite it.** Coverage matrix:
   `reports/2026-07-21-spec17-to-spec37-coverage.md`.
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — nav, the extension of Spec 37. It now also owns
   the Site-Info data store (amended 2026-07-21). Spec 31 remains the standing cloning spec.

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header in a findable admin screen and it appears on their site —
exactly what Kadence/Spectra/Elementor headers are *not* for a non-coder. Everything for that outcome
now exists on paper; **six requirements stand between the spec and a working feature.** This is the
shortest path in the whole programme from "documented" to "Bean can see it work".

## Plain-English state

Spec 37 replaced Spec 17 yesterday. The CPTs (*SGS → Advanced Headers / Advanced Footers*) already
exist and you can write a header in them today — **but nothing makes that header the live one**, and
the mechanism Spec 17 assumed (block patterns) is structurally incapable of it: CPT patterns register
on `admin_init`, the rules engine resolves on the frontend, so it silently renders the theme default
instead. Spec 37 replaces that with direct render. Six FRs build it.

---

## Task 1 — The 6-FR minimum core (the whole visible win)

**What:** make a CPT header become the live header.
**Why:** delivers Spec 37's end-goal (a). Nothing else in the spec matters until this works.
**Estimated time:** ~1 focused day header; ~45 min more for the footer (classes are parallel).
**Parking:** `P-SPEC37-CORE-BUILD`.

**Build in THIS ORDER — it is not interchangeable:**

| # | FR | What | Est. |
|---|---|---|---|
| 1 | **FR-37-2** | "Set as active" row + editor action → `wp_options['sgs_active_header_cpt_id']` | 1h |
| 2 | **FR-37-3** | Direct-render branch in `Sgs_Header_Rules::filter_template_part()` **before** `evaluate()` | 2h |
| 3 | **FR-37-4** | Verify the immutable fallback still fires (already `BUILT`) | 15m |
| 4 | **FR-37-25** | Reset / clear active — doubles as the rollback | 30m |
| 5 | **FR-37-5** | "Active" column on both CPT list tables | 30m |
| 6 | **FR-37-6** | Move `parts/header.html`'s 28 lines into a starter pattern | 1h |

**⛔ THREE HARD CONSTRAINTS ON FR-37-3 — all three are load-bearing:**
- **(a) Its own re-entrancy guard.** The existing `$evaluated_this_request` static guards
  `evaluate()`, NOT this new branch. A template rendering the header area twice would double-render.
- **(b) Make the behaviour resolver CPT-aware.** `SGS_Nav_Menu_Source::get_header_content()` must gain
  an active-CPT branch as its FIRST source (CPT → `wp_template_part` → file). **Without this,
  FR-37-6 kills every header behaviour silently** — see below.
- **(c) Validate the post exists AND `post_status === 'publish'`**, falling through to FR-37-4 on
  failure. A trashed active post otherwise renders a blank header with no error (the D338 class).

**⛔ FR-37-6 IS GATED ON (b) LANDING FIRST.** `Sgs_Header_Behaviours` hooks `body_class` — a different
hook from `pre_render_block` — and resolves flags by reading `parts/header.html`. Empty that file
before the resolver is CPT-aware and sticky/transparent/shrink stop working **with no error**. This
was the adversarial council's headline find; the spec's original wording had it wrong and cited a
filter (`sgs_header_rule_resolved`) that has **zero subscribers**.

**Orchestration:** inline (main thread). This is the load-bearing mechanism of a governing spec —
do not delegate the judgement. Delegate only mechanical sub-parts (the list-table column) if useful.
**Depends on:** none. **`/qc` gate after: yes** — `/qc-council`, per blub.db 255.

**Acceptance (all four, measured live — not inferred from the emit):**
1. Create a header in *SGS → Advanced Headers*, press Set as active → it renders on the canary
   frontend on a **cold cache**.
2. The page contains the CPT's content **exactly once** (proves the re-entrancy guard).
3. A header with **sticky enabled in the CPT** emits its body class and is observably sticky.
4. Trash the active post → the framework default renders; no fatal, no blank header.

---

## Task 2 — The two live bugs found while specifying

**What:** two silent-failure bugs, both verified, both small.
**Why:** each is the D338 silent-discard class, live in the codebase now.
**Estimated time:** 30 min combined. **Orchestration:** inline. **`/qc` gate: `/qc-inline`.**
**Parallel with:** Task 1.

- **`P-FOOTER-COLUMNS-DISCARDED-ATTRS`** — `site-footer/edit.js:28-30` sets `columns`,
  `columnsTablet`, `columnsMobile` on a row whose `block.json` **declares none of them**, so WordPress
  discards all three at save. **Fixing this IS FR-37-11** (columns become an operator-set count that
  stacks on mobile automatically — Bean rejected a `gridTemplateColumns` ratio override as a
  developer concept a client should never meet).
- **`P-TEMPLATELOCK-REORDER-GAP`** — both containers set `templateLock: 'insert'` while their comments
  claim reorder is locked. WP's `'insert'` still permits MOVE. Fix is `'all'`; row content stays
  freeform because `templateLock` does not cascade (both row blocks set `false` at their own level —
  verified).

**Acceptance:** the footer row's column count survives a save round-trip (read the saved post content,
not the editor state); rows cannot be dragged out of order in the editor.

---

## Task 3 — FR-36-18 Indus header cutover (carried forward, still open)

**What:** re-author the Indus (palestine-lives.org) header onto `sgs/nav-menu` + `sgs/nav-drawer`.
**Why:** the last thing pinning the old nav, and it unblocks FR-37-21's retirement.
**Estimated time:** 30–45 min. **Orchestration:** inline, or `wp-sgs-developer` if heavy.
**Parallel with:** Tasks 1 + 2. **`/qc` gate: yes** — per **STOP-VERIFY-EVERY-CLIENT**, verify on BOTH
sites, not one.

⛔ **Do NOT delete the `sgs/adaptive-nav` registration until this is green** — it is the rollback path.
A previous handoff instructed deleting it and that instruction was correctly REFUSED.

**Acceptance:** Indus header renders from the new blocks; 0 overflow at 375/768/1440; drawer axe 0;
crawl PASS with JS off. THEN FR-37-21 retires adaptive-nav + `sgs/mega-menu` + the 7 `mega-menu-*`
template parts and patterns, and updates `framework-header-default.php` — which still emits the
retired nav at lines 29-33, so **every fresh SGS install currently gets the old nav**.

---

## Dependency graph

```
Task 1 — the 6-FR core (inline, /qc-council)  ─┬─ parallel ─ Task 2 (two live bugs)
  FR-37-2 → 3(a,b,c) → 4 → 25 → 5 → 6          └─ parallel ─ Task 3 (Indus cutover)
       ⛔ FR-37-6 gated on FR-37-3(b)
              ↓
        Task 3 green → FR-37-21 legacy retirement
              ↓
   commit (path-scoped, branch re-checked in the SAME command)
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — build + deploy + cache clear BEFORE any live test, or you measure stale output.
- **Checksum every deploy.** `build-deploy.py` printing `[DONE]` + `[verify] HTTP 200, markers present`
  does NOT mean your change shipped — that verify passes on ANY working SGS page, including one running
  old code. `md5sum` local↔server BEFORE measuring. A co-active session once silently reverted a
  verified fix and a false `verdict: PASS` reached Bean.
- **On a shared canary a PASS is perishable** — re-assert before quoting an earlier live result.
- **Negative control, or the test is vacuous** — before banking a PASS ask *"would this still pass if
  the feature were absent?"* If yes it proves nothing.
- **Verify an inherited deferral before executing it** — a queued task is a hypothesis about the world
  when it was written. One such item, executed as written, would have deleted the rollback path.
- **A spec describing a superseded model misdirects the build** (NEW 2026-07-21, D358) — if a decision
  changes the model, amend the governing spec in the SAME work, or the next session builds the old one
  with full authority. This cost a whole task on 2026-07-21.
- **Every council needs a code-grounded seat** (NEW 2026-07-21, D358) — five prose reviewers
  rubber-stamped a spec citing a filter with ZERO subscribers. Only the source-verifying seat caught it.
- **Read the draft before designing a clone fix** — a divergence usually means the block has NO
  attribute able to carry the value (silent drop, the D338 class), not a policy gap.
- **Never claim a scrollbar-dependent test passed from the harness** — headless reports
  `innerWidth - clientWidth = 0`. Report INCONCLUSIVE and route it to Bean.
- **`dialog.close()` kills exit animations** — `display:none` in the same tick. Animate first, close on
  `animationend`. Native ESC bypasses your close handler entirely.
- **Root cause before instance fix** — ask "what is the CLASS of failure?" before fixing the case.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Do not redefine done.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every unbuilt part to a named spec STAGE.
  Acceptance = the spec's FULL scope for the surface touched, not the increment that shipped.
- **Shared-worktree git discipline** — re-check branch in the SAME command as the commit; commit by
  EXACT path; if `push` is rejected do NOT stash another session's files — use an isolated worktree.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails (from the mega-panel design programme)

- **Load `/frontend-design` BEFORE authoring any draft.** Bland output is a skipped-skill bug.
  `/ui-ux-pro-max` is the DATA layer and does not set direction.
- **A brand accent is a GROUND, never an indicator** — failed 4× across two palettes.
- **Contrast is a property of a PAIRING, not a component** (NEW 2026-07-21, D357) — a draft accessible
  on its own palette can fail under a client's without being defective. Measure the draft's OWN pairing
  before calling it a defect. Contrast checks are **warn-only, never a gate**.
- **Transition ONLY `transform`/`opacity`** — never `filter` or `box-shadow`; both repaint every frame.
- **Never build hover-only switching** — it makes content unreachable.
- **Degrade to MORE content, never less** — hiding panels on mobile made 12 links unreachable and
  invisible to mobile-first crawling.
- **Only recognised slot tokens** — inventing `__back` / `__scene` silently costs the client their
  editor controls.
- **Image slots MUST be real `<img>`** — a CSS background does not map to `sgs/media`.
- **Any background effect re-computes every contrast above it**; measure each element at the zone it
  ACTUALLY occupies.

## Known-open, NOT blockers (do not re-litigate)

- **`P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS`** — the F5 DB-as-code gate blocks commits on
  `sgs/trust-bar` + `sgs/trustpilot-reviews` attrs contending for one routing slot. **Owned by the
  co-active Spec-35 track** (`2e455c5a "css_property proved under-keyed"` is the same finding). Bypass
  with a documented `[gates-ok:]` **in the command** (the guard scans the command, not the message
  file). Do NOT baseline it.
- **`.claude/mistakes.md` has uncommitted changes that are NOT yours** — and they DELETE its standing
  "Recurring patterns" / "Reference catalogues" / "How to add a lesson" sections. Possible D101
  carry-forward violation by that track. Flag, do not fix.
- **`P-SPEC37-OPEN-RESIDUALS`** — skip-link regression contract (ex-FR-S1-4) has no successor; the 3
  layout starter variants have no stated fate; FR-37-30's "reduced" CLI set doesn't say what happens to
  the rest; **FR-37-12 dropped the 320–374px band** the original overflow emergency lived in (add 320);
  Spec 17's prose-only content (REST capability-gating, the "attribute shape FROZEN" guardrail that
  FR-37-14 knowingly overrides — say so explicitly rather than silently).
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ **Bean-locked DO-NOT-FIX:** the planted TEST CASE for
  header cloning.
- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — NOT REPRODUCED across all 3 nav blocks; Bean
  deprioritised it. Needs his console capture; do not guess at a cause.
- **`P-MEGA-CONTRAST-DEFERRED`** — 496 sweep findings; Bean ruled **change nothing**. `depth-stack`
  measures 7.46:1 on its own palette; failures track a client's ground luminance, not the design.
- **`P-MEGA-PATTERNS-UNMIGRATABLE`** · **`P-PALETTE-TOKEN-VOCABULARY-SPLIT`** (snapshots use `text` vs
  `text-primary` — do NOT "fix" by adding a duplicate slug) · **`P-CANARY-PAGE-WEIGHT-BUDGET`** ·
  **`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`** · **`P-CANARY-SHARED-DEPLOY-RACE`** · **`P-WP7-PLATFORM-ALIGNMENT`**.
- **Docscore debt:** `decisions.md` 75.3%, `parking.md` 75%, Spec 36 80% — all under the A- bar, none
  caused by recent entries. Worth a dedicated sweep, not a blocker.
- **Container-mirror dry-run:** `sync-container-wrapping-blocks.py` reports 259 attr additions + 20
  support changes across 15 blocks it could apply. NOT applied — design-gate territory, a decision for
  Bean, not a silent sweep.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | Plan implementation order before writing code |
| `/adversarial-council` | Pre-build stress-test of a spec/plan — **include a code-grounded seat** |
| `/qc-council` | Multi-rater before any converter / pipeline / SGS-block commit |
| `/qc-inline` | Small acceptance gates |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions (CPT registration, patterns, `templateLock`) |
| `/frontend-design` | **Before authoring ANY draft** — forces an explicit aesthetic direction |
| `/ui-ux-pro-max` | Design DATA (styles / palettes / tokens) — not direction |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## Tool bindings — MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification on the canary (R-31-11) — the canonical proof |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — the DB is authoritative |
| `lints/*.py` | `bem-lint` · `token-lint` (fixed 2026-07-21) · `draft-vocab-lint` |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` (warn-only) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Heavy WP build work in Tasks 1–3; design questions needing code-grounded answers |
| `code-reviewer` | Pre-commit review of the FR-37-3 binding |
| `test-and-explain` | Plain-English confirmation for Bean that a CPT header goes live |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Read the governing spec (Spec 37 in full; Spec 36 for nav; Spec 31 for converter) + LEDGER?
2. Did the prior in-session work actually LAND? (Read the LEDGER's live status.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
   (STOP-HIDDEN-PARALLEL-SYSTEM.)
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for
   any scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in
   the SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. **Would my acceptance test still pass if the feature were absent?** (STOP-NEGATIVE-CONTROL.)
12. **Is this inherited task's premise still true?** (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. **Does the governing spec still describe the model we are actually building?** (NEW 2026-07-21 —
    a spec describing a superseded model misdirects the build with full authority.)
15. **If I am running a review panel, does it have a seat that verifies claims against live source?**
    (NEW 2026-07-21 — five prose reviewers rubber-stamped a citation to a filter nothing hooks.)
