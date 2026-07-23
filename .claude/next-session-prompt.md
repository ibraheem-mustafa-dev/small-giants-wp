Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35/31 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/mistakes.md` and
> `next-session-prompt-spec35*.md` may carry UNCOMMITTED changes that are **not yours**. Path-scope
> every commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.
> **The shared prebuild is currently RED** on the co-active track's `sgs/tabs` `tabIndicatorColour`
> DB↔block.json reseed mismatch (STOP-24). Build via `npx wp-scripts build --experimental-modules
> --webpack-copy-php` + `node scripts/copy-built-styles.js` directly, commit with `[gates-ok:<reason>]`.
> Do NOT reseed their DB (wipes their work); do NOT baseline their finding.

---

# Next session — SGS header/footer/nav (Specs 36 + 37)

You are the engineer-orchestrator for the SGS header/footer/nav programme (Specs 36 + 37). Task 1 you
DISPATCH (two sequential SONNET agents, fully scoped) and QC their returns. Task 2 you do hands-on inline
(live verification). Task 3 is the highest-leverage still-open build.

## First action

**Smallest first step, under 5 minutes, zero dependencies — confirm HEAD + what shipped last session:**

```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1
```

Expect HEAD at/after `ec551c94` and D-ceiling ≥ D371. Then read the LEDGER.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status (its `⭐ CURRENT` block covers D369–D371).
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue + pre-flight ritual. **Answer the
   ritual inline before your first Write/Edit or first agent dispatch.**
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — **FR-36-26c** (the fully-scoped icon-list build,
   Dispatch A + Dispatch B) + **FR-36-26a** (the a11y/SEO/schema per-type contract) IN FULL.
4. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** — **FR-37-13** (hide-on-scroll, the §5 build-status
   row) + **FR-37-7** (starter picker) IN FULL. ⛔ Specs 17 and 34 are DELETED — never cite them.

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header and footer in a findable admin screen and it appears on their
site. That works end-to-end on both sites, and as of D369–D371 the header/footer rows are genuinely
client-configurable — every row independently sets Cluster vs Columns, its own count, its own settings (the
Astra footer-builder model Bean asked for), and it stacks correctly on mobile. The nav landmark regression
that shipped last session was caught and reverted. **Next USP up:** a footer needs titled link-lists
(FR-36-26c) — this block goes in essentially every footer, and it's fully scoped and dispatchable now.

## Task 1 — FR-36-26c: the icon-list link-list (TWO sequential SONNET dispatches)

**What:** turn `sgs/icon-list` into the footer link-list block — heading + markers + typography (Dispatch A),
then the `source` toggle (typed | menu) + the FR-36-26a discoverability contract (Dispatch B). **Fully
scoped in Spec 36 FR-36-26c — read it and build it; do NOT re-design it.**
**Why:** used in essentially every footer (Bean). The marker system benefits every existing `sgs/icon-list`.
**Estimated time:** 30–45 min each.

- Execution: **delegated**, SONNET each. **Strictly sequential — same three files, NOT parallel-safe.**
- **Dispatch A (presentation):** `markerType` (icon/emoji/bullet/numbered/none) with a real `<ol>` for
  `numbered`; `heading` + `headingLevel`; both typography families via the SHARED `TypographyControls` +
  `sgs_typography_css_rule` (R-22-13 — never hand-roll a font-size control). Marker renderer in ONE shared
  helper under `includes/` (`--webpack-copy-php` only copies paths named in block.json; a sibling file 500s).
- **Dispatch B (data + semantics):** `source` toggle; menu binding via the existing `SGS_Nav_Menu_Source`
  static class (reuse, never a 2nd resolver — R-31-9); heading defaults from the menu name, operator title
  overrides **stickily**; then the FR-36-26a per-type table — conditional `<nav>` (opt-in, default OFF for
  typed), `aria-labelledby`→the rendered heading, `aria-current` computed **client-side** (LiteSpeed caches
  one page's answer otherwise — FR-36-11).
- **Every implementer dispatch MUST carry:** *"EXECUTE YOURSELF with your OWN tools. Do NOT use the
  Agent/Task tool to delegate — you are the implementer. Report actual command outputs."* (D362.)
- Depends on: none (A). B depends on A. **/qc-council after each** (blub.db 255).
- **Acceptance:** live-render one instance of EACH of the 3 FR-36-26a types on a real canary page — confirm
  `numbered` emits `<ol>`; `<nav>` appears ONLY for the menu-bound case; the landmark's accessible name =
  the visible heading; `aria-current` lands on the right item on >1 page (proves client-side). Then
  `nav-qa/axe-run.mjs` clean on that page.

## Task 2 — FR-37-13 hide-on-scroll: make it RENDER, then verify (inline)

**What:** activate a header CPT with hide-on-scroll ON and observe it. Header CPT **1655** already exists on
the canary (`T1 Header HideOnScroll`, `headerHideOnScroll:true` verified stored). Set it active via the
admin "Set as active" action (D360 — NEVER a raw `wp option update`), then check.
**Why:** the last remaining `DEPLOYED (unexercised)` header behaviour — chain proven by code-read, never run.
**Estimated time:** 20 min.

- Execution: **inline** (judgement about whether it looks/behaves right — not delegable).
- **Check:** header hides on scroll down, returns on scroll up; **then open the drawer while scrolled** —
  hide-on-scroll puts a `transform` on the header, and a transformed ancestor breaks fixed/top-layer
  positioning (D323 class, untested). The drawer's body-reparent very likely covers it, but "likely" is not
  "observed". Clear the active header back afterwards (admin "Clear active" → restores the proof header).
- **/qc gate after:** yes (`/qc-inline`). Anything that fails becomes a named bug with evidence.

## Task 3 — FR-37-7 starter-template picker (the highest-leverage remaining)

**What:** the shared visual starter-picker for `sgs_header` / `sgs_footer` / `sgs_mega_menu` — a card grid of
styles with preview-before-apply + a "Start from scratch" card. **It is the SAME build as Spec 36 FR-36-3 —
schedule it ONCE, never twice.** It gates FR-37-8's library, FR-37-31's second half, and FR-37-28.
**Why:** the single highest-leverage unbuilt item; the 9 legacy patterns are re-targeted and waiting for it.
**Estimated time:** design-gate first (this is a shared new surface) — ~45 min build after sign-off.

- Execution: **design-gate FIRST** (`/brainstorming` → Bean sign-off), then delegated SONNET build.
- Depends on: nothing blocks it. **/qc-council after.**
- **Acceptance:** creating a post of each of the 3 CPT types shows the same picker; choosing a style produces
  that style's block tree (verified by reading saved `post_content`, not editor state).

## Dependency graph

```
Task 1A — icon-list presentation (sonnet)  →  Task 1B — data+semantics (sonnet, same files)
              ↓ /qc-council each
Task 2 — hide-on-scroll live verify (inline, independent — can run anytime)
Task 3 — starter picker (design-gate FIRST, then sonnet)  ← highest-leverage, independent
              ↓ /qc-council
commit (path-scoped, branch re-checked in the SAME command, [gates-ok:] for the co-active sgs/tabs finding)
```

## Methodology guardrails (do not skip)

- **The shared prebuild is RED on the co-active `sgs/tabs` finding — build via `npx wp-scripts build`
  directly**, commit `[gates-ok:<reason>]`. Do NOT reseed their DB, do NOT baseline it.
- **Deploy on a shared worktree via an ISOLATED worktree** — reset it to the committed HEAD (`git checkout
  --detach <sha>`), copy `build/` in, `--skip-build`. Never junction node_modules. Never `--allow-dirty`.
- **Checksum every deploy** — `md5sum` local↔server BEFORE measuring; `[verify] HTTP 200` passes on ANY
  working SGS page including old code (STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **Measure on the element that ACTUALLY holds the value** — the FR-37-11 bug was measuring the wrapper when
  the grid was on `.sgs-container__inner`. For grids, read `getComputedStyle` on the inner.
- **Verify the PROBE before the conclusion** — a no-op viewport helper nearly reported a false kill-criterion
  trip this session (both "widths" measured at one size). Real resizes, re-read the probe.
- **Negative control, or the test is vacuous** — "would this still pass if the feature were absent?"
- **A fix's CODE can be correct and still not fire** (FR-37-11 was gated out) — verify EMISSION/RENDER, not
  just that the emit code exists.
- **Prove a thing is MISSING before adding it** (D369) — a fix for an unproven "X is absent" DUPLICATES, it
  does not no-op. Check absence against rendered output (`curl | grep`, DOM), not one source file.
- **A grep pattern that cannot match proves nothing** — the "zero `<nav>`" false diagnosis came from grepping
  the block file while the `<nav>` was emitted by the shared wrapper. Re-run any grep-based proof yourself.
- **An agent's "done" is a CLAIM** — verify against the real repo / live state before believing it.
- **Root cause before instance fix; outcome vs completion** — code shipped ≠ outcome achieved.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every deferral to a named spec STAGE.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails — TRIMMED (justified: Tasks 1–2 author no full design draft; Task 3 picker cards may)

The full design-programme guardrails (brand-accent-as-ground, contrast-as-pairing, transition-only-
transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-tokens, real-`<img>`
slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation, scrollbar-test-INCONCLUSIVE)
live UNCUT in `STOP-CATALOGUE.md`. They apply when AUTHORING A DESIGN DRAFT — **Task 3's picker preview cards
are draft-authoring; load `/frontend-design` FIRST and re-read that block if you build them.** Two apply to
any nav/drawer work (Task 2): `dialog.close()` kills exit animations, and never bank a scrollbar-dependent
test from the headless harness.

## Known-open, NOT blockers (do not re-litigate)

- **Both sites show GENERIC proof headers** (sandybrown CPTs #1570/#1571; palestine-lives #360). Real branded
  headers come via the Spec 33 Part 2 cloning pipeline. Admin "Clear active" restores normal.
- **`minmax()` guard absent framework-wide** (`feature-grid` `minmax(240px,1fr)`, theme `minmax(200px,1fr)`)
  — no live Reflow violation (measured `scrollWidth 360<375`); the guarded core form is a separate design-gate.
- **Two unnamed `<main>` elements** cause the framework `landmark-unique`/`region` axe hits (NOT the nav) — a
  separate open theme defect.
- **`P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS`** + the `sgs/tabs` db-consistency finding — owned by the co-active
  Spec-35 track. Bypass with `[gates-ok:]`. Do NOT baseline.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX (the planted cloning TEST CASE).
- **Canary test fixtures from D370** — pages 1648-1652, 1654, 1711, 1719; menus 98/99; header CPT 1655.
  Harmless, reusable for re-testing.
- **FR-36-15 converter emit + FR-36-18 branded cutover + FR-36-25** are Phase-3, gated on Spec 33 Part 2.

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or first dispatch)

1. Read the governing specs (36 + 37, the named FRs in full) + the LEDGER + STOP-CATALOGUE?
2. Did the prior session's work actually LAND? (Read the LEDGER's live status; verify HEAD is ≥ ec551c94.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for any
   scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in the
   SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. Am I trusting a block-attr filter gate without proving it FIRES on a real page? (D359.)
17. Am I about to DELETE anything on a live site without opening it first to confirm what it is? (D362 —
    STOP-INSPECT-THE-TARGET-BEFORE-DELETING. A delete instruction authorises the act, never skipping verify.)
18. Does every implementer dispatch say "EXECUTE YOURSELF, do NOT delegate"? (D362.)
19. Am I setting option-driven state in the context that READS it (admin action / live domain), not a raw
    `wp option update` from an arbitrary CLI path? (D360.)
20. Have I verified this agent's "done" against the real repo / live state, rather than believing the report?
21. **Am I proving a thing is MISSING before adding it — against rendered output, not one source file?**
    (NEW D369 — STOP-PROVE-THE-THING-IS-MISSING-BEFORE-ADDING-IT. A fix for an unproven absence DUPLICATES.)
22. **Am I verifying a fix EMITS/RENDERS, not just that the emit code exists?** (NEW — FR-37-11's rule was
    correct and gated out; a green build is not a live render. Measure on the element that holds the value.)

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural/design decision before building — **Task 3 picker design-gate** |
| `/gap-analysis` | Grade the dispatched agents' outputs before acting |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | **Task 3 — the picker is a shared new surface** |
| `/delegate` | Pick the model per dispatched task |
| `/dispatching-parallel-agents` | If any disjoint work parallelises (Task 1 is sequential, not parallel) |
| `/qc-council` | Multi-rater before any SGS-block / converter commit (blub.db 255) |
| `/qc-inline` | Task 2 acceptance gate |
| `/adversarial-council` | Pre-build stress-test — include a code-grounded seat (D358) |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions |
| `/frontend-design` | Before authoring ANY draft (Task 3 picker cards) |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## Tool bindings — MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification (R-31-11) — the canonical proof; drawer/axe/overflow/stack gates |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — the DB is authoritative, never a prose count |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` (warn-only) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 1 Dispatch A/B + Task 3 build (add the EXECUTE-YOURSELF line) |
| `code-reviewer` | Pre-commit review of any binding / block change |
| `general-purpose` | Read-only conformance audits |
| `test-and-explain` | Plain-English confirmation for Bean that a feature works |
