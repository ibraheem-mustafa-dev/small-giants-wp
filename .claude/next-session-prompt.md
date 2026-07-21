---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 2 — Spec 36 navigation. Phase 2 IN PROGRESS: mega CPT LIVE (D353); eight panel designs drafted + Bean-approved but NOT wired in. Next = fix the inert token-lint gate, then wire drafts as CPT starter templates, plus the carried-forward Indus cutover + footer round-trip."
generated: 2026-07-21
note: "Track 1 (Spec 35 block-inspector-UX) has its own live prompt at .claude/next-session-prompt-spec35-track1.md — do not clobber it. Track C is feat/core-block-migration. As of 2026-07-21 another track also had uncommitted work in plugins/sgs-blocks/src/blocks/card-grid/* and includes/lucide-icons.php — leave those alone."
---

# Next session — Spec 36 **PHASE 2** (gate first, then wire the panels in)

Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** Track 1 is live at
> `.claude/next-session-prompt-spec35-track1.md`; Track C is `feat/core-block-migration`;
> `plugins/sgs-blocks/src/blocks/card-grid/*` + `includes/lucide-icons.php` had uncommitted changes
> from another track at last handoff. Path-scope every commit, re-check `git branch --show-current`
> in the SAME command as the commit, never `git add -A`.

## First action

**Smallest first step, under 5 minutes, zero dependencies:** run
`python plugins/sgs-blocks/scripts/lints/token-lint.py .claude/drafts/mega-menu/link-columns-v3.html`
and read the output. It reports *"All 0 declaration(s)"* on a file full of `:root` custom properties.
That one command shows you the whole of Task 1 and where to start.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status.
2. **`.claude/STOP-CATALOGUE.md`** — STOP catalogue + pre-flight ritual. **Answer the ritual inline
   before your first Write/Edit.**
3. **`.claude/drafts/mega-menu/DESIGN.md`** — the locked design direction, IN FULL. Every rule in it
   was learned by getting it wrong; do not re-derive them.
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — the canonical nav spec, IN FULL.
   ⛔ **Spec 34 is DELETED — never cite it.** Spec 31 remains the standing cloning spec.

## Why this matters (motivation — Rule 7)

The header/nav system is the last gap between "SGS builds pages" and "SGS builds *sites*". **Top USP:**
one nav that is faithful to a draft, accessible by construction, crawlable without JS, and editable by
a non-coder — exactly what Kadence/Spectra headers are not. The CPT is live and eight panel designs
are approved; wiring them in is what turns a pile of HTML into a feature a client can actually use.

## Plain-English state

`sgs_mega_menu` is **live and proven** (D353) — a mega panel attaches to a menu in *Appearance →
Menus* like a page. Eight panel designs are **drafted and approved by Bean's eye** but are still only
HTML files; nothing is wired into WordPress. Spec 36 FR-36-5 asks for *"DB-registry-defined starter
templates"* and neither the registry nor the wiring exists.

**The gate that should protect all of it checks nothing.** Every contrast and token check across all
eight panels was manual. That is Task 1, and it comes first because Tasks 2–4 would inherit the same
unguarded state.

## Task 1 — Fix `token-lint.py` (the inert gate)

**What:** make `plugins/sgs-blocks/scripts/lints/token-lint.py` actually check something.
**Why:** it is the gate protecting Bean's brand-colour requirement and it currently passes a draft
made entirely of hardcoded hex. Parking: `P-TOKEN-LINT-INERT`.
**Estimated time:** 20–30 min.

**Orchestration:**
- Execution: **inline** (main thread). It is a correctness fix to a gate — do not delegate the
  judgement about what the gate should assert.
- Depends on: none. Parallel with: Tasks 3 + 4.
- **`/qc` gate after: yes** — and the acceptance below IS the negative control; use it.

**Four things it must do:**
1. Parse the inline `<style>` block, not just linked stylesheets — the likely root cause (UNVERIFIED;
   prove it before fixing it — STOP-PROVE-CAUSE-BEFORE-FIX).
2. Flag declared-but-unused tokens, weighting BRAND tokens (`--primary`/`--accent`/`--surface`) louder
   than spacing — an unused brand token usually means the design defaulted.
3. Verify every `var()` reference resolves to a token that EXISTS in a real
   `sites/*/theme-snapshot.json`. (`--focus-ring` and `--on-primary` do not exist and shipped once.)
4. **Cross-palette contrast** — every foreground/background pairing ≥4.5:1 (3:1 UI) against EVERY
   client snapshot. This is the leg that makes the gate worth having.

**Acceptance — NEGATIVE CONTROL REQUIRED (STOP-NEGATIVE-CONTROL).** Run it on all eight drafts: it
must report a non-zero declaration count and pass. Then deliberately break one draft (replace a
`var(--text)` with `#F87A1F` on a light ground) and confirm it **FAILS**. A pass without the
deliberate-break leg proves nothing — that is precisely the defect being fixed.

## Task 2 — Register decision, then wire the drafts in as CPT starter templates

**What:** get Bean's register decision, then convert the approved drafts into `sgs_mega_menu` starter
templates an operator can pick when creating a panel.
**Why:** the drafts deliver nothing until an operator can use them. This is the FR-36-5 outcome still unhit.
**Estimated time:** 15 min for the decision + 45–60 min for the wiring.

**Orchestration:**
- **BLOCKING FIRST — ask Bean** which register the client STARTER set ships in: **A (Editorial
  Broadsheet, dark)** or **B (SGS Modern, orange ground)**. Five panels can only ship one language.
  Parking: `P-MEGA-CLIENT-REGISTER-UNLOCKED`. **Do NOT pick for him** — building logo-grid for Indus
  sidestepped this rather than settling it.
- Execution: inline for the CPT/registry wiring; delegate to `wp-sgs-developer` if it grows.
- Depends on: **Task 1** (do not author more drafts against an unguarded gate).
- **`/qc` gate after: yes** — `/qc-council`, per blub.db 255 (SGS block + pipeline surface).

**Known already — do not re-derive:**
- A pattern becomes a CPT starter template via a `Post Types: sgs_mega_menu` header. None of the old
  patterns declares one; all 7 declare a now-wrong `Block Types: core/template-part/mega-menu`.
- The FR-36-5 **DB registry does not exist** — all 39 `sgs-framework.db` tables checked; `patterns`
  holds slugs only, with no starter/CPT fields.
- The old 7 patterns are unmigratable — `P-MEGA-PATTERNS-UNMIGRATABLE` holds the per-pattern verdicts
  (3× reuse-with-fixes, 4× rebuild, **0× reuse-as-is**).

**Acceptance:** creating a new `sgs_mega_menu` post offers the starter layouts in the editor's
template picker, and choosing one produces the panel's block tree. Verified live on the canary with a
screenshot — not from the code, and not from the emit alone.

## Task 3 — FR-36-18 Indus header cutover (carried forward, still open)

**What:** re-author the Indus (palestine-lives.org) header onto `sgs/nav-menu` + `sgs/nav-drawer`.
**Why:** the last thing pinning the old nav block, and it proves R-31-9 universality on a 2nd client.
**Estimated time:** 30–45 min. **Orchestration:** inline, or `wp-sgs-developer` if heavy. Depends on:
none. Parallel with: Tasks 1 + 4. **`/qc` gate: yes** — per **STOP-VERIFY-EVERY-CLIENT**, verify on
BOTH sites, not one.

⛔ **Do NOT delete the `sgs/adaptive-nav` registration until this is green** — it is the rollback path.
A previous handoff instructed deleting it and that instruction was correctly REFUSED.

**Acceptance:** Indus header renders from the new blocks; 0 overflow at 375/768/1440; drawer axe 0;
crawl PASS with JS off. THEN retire adaptive-nav via `/sgs-update`.

## Task 4 — Footer round-trip proof (carried forward)

**What:** prove the Site-Editor → frontend round trip for the **FOOTER**. The header half is proven;
the two are wired differently, so the footer needs its own test.
**Why:** the one real residual from the struck Spec-34 item — do not lose it.
**Estimated time:** 15 min. **Orchestration:** inline. Depends on: none. **`/qc` gate: yes.**
**Acceptance:** an edit made in the Site Editor to the footer part appears on the live frontend after deploy.

## Dependency graph

```
Task 1 (token-lint — inline, NEGATIVE CONTROL required) ─┬─ parallel ─ Task 3 (Indus cutover)
                                                          └─ parallel ─ Task 4 (footer round-trip)
        ↓ (Task 1 MUST be green first)
Task 2 — ASK BEAN the register, then wire the starter templates
        ↓ /qc-council
Task 3 green → retire adaptive-nav registration + DB row
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
  the feature were absent?"* If yes it proves nothing. **Doubly load-bearing now: it is Task 1's subject.**
- **Verify an inherited deferral before executing it** — a queued task is a hypothesis about the world
  when it was written. One such item, executed as written, would have deleted the rollback path.
- **Read the draft before designing a clone fix** — a divergence usually means the block has NO
  attribute able to carry the value (silent drop, the D338 class), not a policy gap. An a11y defect on
  a clone whose draft is accessible is a FIDELITY defect.
- **Never claim a scrollbar-dependent test passed from the harness** — headless reports
  `innerWidth - clientWidth = 0` (overlay scrollbars). Report INCONCLUSIVE and route it to Bean.
- **`dialog.close()` kills exit animations** — `display:none` in the same tick. Animate first, close on
  `animationend`. Native ESC bypasses your close handler entirely.
- **Root cause before instance fix** — ask "what is the CLASS of failure?" before fixing the specific case.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Do not redefine done.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every unbuilt part to a named spec
  STAGE. A spec'd subsystem has no ad-hoc gaps: if a deferral cannot be mapped to a stage, that is
  the signal the spec's full scope was not read. Acceptance for a spec'd task = the spec's FULL
  scope for the surface touched, not the increment that shipped.
- **Shared-worktree git discipline** — re-check branch in the SAME command as the commit; commit by
  EXACT path; if `push` is rejected do NOT stash another session's files — use an isolated worktree
  (`git worktree add /c/tmp/x origin/main`) or `git merge origin/main`.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails (NEW 2026-07-21 — from the mega-panel design programme)

- **Load `/frontend-design` BEFORE authoring any draft.** Bland output is a skipped-skill bug, not a
  talent gap — Anthropic published this diagnosis and shipped the skill to counter it.
  `/ui-ux-pro-max` is the DATA layer and does not set direction.
- **A brand accent is a GROUND, never an indicator** — failed 4× across two palettes (orange rail
  1.79:1, gold border 1.68:1). To show an active state in accent, flip the element's whole ground and
  invert its type to near-black.
- **Transition ONLY `transform`/`opacity`** — never `filter` or `box-shadow`; both repaint every frame
  and were the measured cause of the lag Bean reported. Pre-render lift shadows and fade opacity.
- **Never build hover-only switching** — it makes content unreachable (a correctness bug, not polish).
- **Degrade to MORE content, never less** — hiding panels on mobile made 12 links unreachable AND
  invisible to mobile-first crawling.
- **Only recognised slot tokens** — inventing `__back` / `__scene` / `__aside-title` silently costs the
  client their editor controls; the leaf renders as styled text instead of promoting to its block.
- **Image slots MUST be real `<img>`** — a CSS background does not map to `sgs/media`.
- **Any background effect re-computes every contrast above it**, and measure each element at the zone
  it ACTUALLY occupies (bottom-anchored text sits in the 90%+ scrim, not the mid-zone).

## Known-open, NOT blockers (do not re-litigate)

- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — the featured item's hover differs from the draft.
  ⛔ **Bean-locked DO-NOT-FIX:** it is the planted TEST CASE for header cloning.
- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — Bean reported the inspector's Styles tab blanking the
  sidebar on `sgs/nav-menu`. **NOT REPRODUCED** across all 3 nav blocks with every panel force-opened,
  zero console errors. Bean deprioritised it. Needs his console capture; do not guess at a cause.
- **`P-CANARY-PAGE-WEIGHT-BUDGET`** — CSS 371KB / JS 84KB vs 100/50KB, but nav is only 17.3KB and
  WooCommerce alone exceeds the CSS budget. Cheap win: `mega-menu-panels.css` (13.1KB) loads with no
  mega menu present — **recheck once the starter templates land; Task 2 may make it moot.**
- **Docscore debt:** `parking.md` B (81%), `decisions.md` B- (75.3%) — both under the A- bar, neither
  caused by recent entries. Worth a dedicated sweep, not a blocker.
- **blub dashboard is DOWN** (`WinError 10061`, port 5050). Four lessons are marked `⏳blub` in
  `MEMORY.md` awaiting upload — retry when it is back.
- **`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`** · **`P-CANARY-SHARED-DEPLOY-RACE`** ·
  **`P-AUDIT-COLOUR-ROLE-KEYED`** · **`P-VISUAL-GATE-ORDERING`** · **`P-NAV-ITEM-SEPARATORS`** ·
  **`P-NAV-INSTANCE-CONFIG-DUPLICATION`** · **`P-WP7-PLATFORM-ALIGNMENT`**.
- **Container-mirror dry-run:** `sync-container-wrapping-blocks.py` reports **259 attr additions + 20
  support changes across 15 blocks** it could apply. NOT applied — shared-wrapper capability
  propagation is design-gate territory. A decision for Bean, not a silent sweep.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | Plan implementation order before writing code |
| `/frontend-design` | **Before authoring ANY draft** — forces an explicit aesthetic direction |
| `/ui-ux-pro-max` | Design DATA (styles / palettes / tokens) — not direction |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions (CPT registration, patterns, starter templates) |
| `/qc-inline` | Small acceptance gates |
| `/qc-council` | Multi-rater before any converter / pipeline / SGS-block commit |
| `/systematic-debugging` | Root cause before fix |
| `/wp-sgs-deploy` | Deploy ceremony + gates |

## MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification on the canary (R-31-11) — the canonical proof |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Slot vocabulary, block attributes, table checks — the DB is authoritative |
| `lints/*.py` | `bem-lint` · `token-lint` (Task 1's subject) · `draft-vocab-lint` |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | If Task 2 or 3 grows into heavy WP build work |
| `code-reviewer` | Pre-commit review of the token-lint rewrite |
| `test-and-explain` | Plain-English confirmation for Bean that the starter templates work |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Read the governing spec (Spec 36 in full; Spec 31 for converter work) + LEDGER + `DESIGN.md`?
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
13. **Am I authoring a design draft without having loaded `/frontend-design` first?** (NEW 2026-07-21.)
