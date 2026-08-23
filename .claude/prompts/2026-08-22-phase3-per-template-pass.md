> # ⛔ SUPERSEDED 2026-08-23 — DO NOT RUN THIS AGAIN
>
> **Wave A carried out the 7-point checklist across all ten surfaces on 2026-08-23:**
> 10 parallel agents, one per surface, **zero FAILs**. Register:
> `.claude/reports/2026-08-22-phase3-template-audit-register.md`.
>
> **This prompt was pasted into a fresh session on 2026-08-23 and nearly re-ran finished
> work.** That is why this banner exists. It also directs the reader to assess templates
> from code, gates and static checks — **a method Bean has since banned.**
>
> **What replaced it:** Bean reviewed the templates in the Site Editor and found
> widespread breakage that no gate, no build and none of my own live measurements had
> caught. That work is
> **`.claude/plans/2026-08-24-template-by-template-remediation.md`**, and its governing
> rule is that agents must log in with `/playwright` and LOOK at a template rather than
> assess it from code, the DB, REST or hooks.
>
> **Residual still owed** (fold into the remediation track per template, do NOT run as a
> separate pass): Wave C — checks 5 and 7 measured live per surface — plus three small
> correctness items (`main` missing from `edit.js` `TAG_NAME_OPTIONS`; the h1→h3 heading
> skip on `archive.html:21` and `search.html:16`; redundant nested `contentWidth` in five
> files).
>
> Kept for provenance only: it records what was asked for and the constraints it was
> asked under.

---

# Next-session prompt — Phase 3, shop-archive container remediation (per-template pass)

Invoke `/autopilot` before doing anything else.

## Read first, in this order

1. `.claude/LEDGER.md` — "If you are the shop-archive track" block. Phases 1 and 2 of this
   plan are CLOSED (2026-08-22, D742) — do not re-open them. Phase 3 is the only work left.
2. `.claude/decisions.md` **D742** (what Phase 2 shipped — context for what "done" looks like
   on this track) and **D725/D726** (the width model checks 2-7 test against).
3. `.claude/plans/phase-shop-container-remediation.md`, the **# PHASE 3** section in full
   (currently starts around line 658) — this prompt summarises it, but the plan is the
   source of truth if anything here has drifted.
4. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — in full, per this project's standing
   rule, before touching any container/walker/converter-adjacent code (templates route
   through `sgs/container`, so this counts).

## The task

Nine theme templates plus three template parts each need the same 7-point checklist applied
**individually** — this is a live QA audit, not a code migration. `archive-product.html` (the
template Phases 1-2 lived on) already passes; the other nine surfaces have not had this
treatment. Check 1 (editor validity) is **already green across all ten surfaces** (D743,
2026-08-22) — that one line item is done everywhere and does not need re-running unless a
template's markup changes during this pass. **Checks 2-7 are owed on every surface, including
`archive-product.html` itself**, which needs re-CONFIRMING as the reference standard, not
re-fixing.

### The 7-point checklist (apply to every surface, do not shortcut)

1. **Editor validity** — `wp.blocks.validateBlock()` over the tree in the Site Editor. Already
   green everywhere (D743) — confirm it's still green if you touch the template, otherwise skip.
2. **Width model** — one cap per page. `<main>` and structure say `contentWidth:"full"` and pass
   width through; sections cap their own content. Zero `layout:{"type":"constrained"}` anywhere.
3. **Spacing declarations** — `migrate-theme-native-spacing.py --check` clean; no authoring on a
   native family the block no longer declares.
4. **Core blocks** — `check-no-core-blocks.py` clean. Then list any core block with NO SGS
   equivalent as a gap candidate, not a violation — do not delete or replace it.
5. **Live measurement at 375/768/1440** — background paints edge-to-edge, content caps, no text
   flush at an edge that shouldn't be, no double indent. Computed styles via Playwright, never
   a screenshot read by eye.
6. **Landmarks + a11y** — exactly one `<main>`; `nav`/`aside` labelled; heading order sane.
7. **Client-editability** — every visible setting reachable in the editor, and the canvas
   genuinely moves when it changes. This is the check that keeps failing quietly on this
   codebase (the content band was styled for months before `edit.js` ever rendered it) — do not
   skip it because the other six passed.

**Done-when, per surface:** all seven pass, measured live, with the evidence in that surface's
own commit message. "The markup looks right" is not evidence.

### The nine remaining surfaces, current state

| # | Surface | Containers | What's owed |
|---|---|---|---|
| P3-1 | `archive-product.html` | 7 (+17 WC) | RE-CONFIRM only — this is the reference; expect a clean pass, not new fixes |
| P3-2 | `single.html` | 7 | Checks 2-7 (check 1 already green) |
| P3-3 | `single-product.html` | 6 (+5 WC) | Checks 2-7 (check 1 already green); PDP, buybox owns its own gallery column |
| P3-4 | `archive.html` | 5 | Full checklist |
| P3-5 | `search.html` | 5 | Full checklist |
| P3-6 | `page.html` | 2 | Checks 1, 5, 6, 7 (width model already done 2026-08-21) |
| P3-7 | `front-page.html` | 1 | Full checklist — ⚠ renders near-empty (~104 chars), so measure check 5 against real content or say plainly that it can't be demonstrated on this template alone |
| P3-8 | `index.html` | 1 | Full checklist |
| P3-9 | `404.html` | 1 | Full checklist |
| P3-10 | Parts: `sgs-pdp-content`, `sgs-pdp-buybox`, `sgs-archive-toolbar` | 3/0/0 | Checks 2-7 (check 1 already green); `header`/`footer` parts are one-line pattern shims and need nothing |

## Orchestration — these are independent, dispatch them in parallel

Every surface above is a **different template file** with **no shared runtime state** between
them — this is exactly the shape `/dispatching-parallel-agents` exists for, not a serial pass.
Do not batch the checklist itself across templates (the plan is explicit: every defect Phases
1-2 found was specific to the page it was on — a generic sweep would have found none of them),
but running nine *independent* per-template agents concurrently is a different thing from
batching the checklist, and is the efficient way to do this.

1. **Dispatch via `/dispatching-parallel-agents`**, one agent per surface (P3-1 through P3-10 —
   ten agents, or fewer if you fold the three P3-10 parts into one agent since they share zero
   containers and are trivial). Each agent's cold prompt should be written with
   `/subagent-prompt` and must embed: the 7-point checklist verbatim, this surface's specific
   "what's owed" column from the table above, the standing constraints below, and the exact
   verification commands (Playwright computed-style checks, the two `--check` scripts).
2. **Pick each agent's model via `/delegate`**, don't hardcode. As a starting steer: P3-1
   (confirm-only, no expected changes), P3-8/P3-9 (1 container, near-trivial) are
   haiku-shaped; P3-2/P3-3/P3-10 (WC integration, PDP-specific gallery/buybox logic) and any
   surface where checks 2-7 turn up a real defect are sonnet-shaped — let `/delegate` decide
   per its own routing table rather than following this guess blindly.
3. **If a surface's audit turns up two or more candidate fix-shapes** before you'd dispatch an
   implementer for it, route those through `/qc-council` first — this project requires
   empirical pre/post validation before treating a council-style proposal as an accepted spec.
   For a single obvious fix on one surface, just make it; council is for when there's a real
   choice between fix shapes.
4. **`/qc-inline` or `/visual-qa`** for the live-verification half of checks 2 and 5
   specifically (width model + breakpoint measurement) — these need a real deployed page and
   Playwright, not a static read of the markup.

## Standing constraints (from the plan — do not relax these)

- **One template per commit**, with that template's own measurements in the commit message.
  They're independent; a regression must be attributable to exactly one commit.
- **Deploy is theme-only** (`build-deploy.py --theme-only --target sandybrown`) — no block
  rebuild needed for this phase, and theme-only deploys never collide with a parallel block
  track running elsewhere.
- **Do NOT batch the checklist across templates.** Running parallel AGENTS is fine (see above);
  each agent must still run the full checklist against its OWN surface, not assume a result
  from another template carries over.
- **Verify branch before every commit, in the same command as the commit** (`main` for this
  framework work — per-client work would go on a `feat/<client>-*` branch, but none of these
  templates are client-specific).
- **`git status` before any destructive git operation** — this is very likely a shared worktree
  with other concurrent tracks (colour-golden, nav-drawer, etc. have all touched `main` this
  week). Check for uncommitted work that isn't yours before touching anything, and never
  `--allow-dirty`/`--skip-verify` on a deploy.
- Per-agent: do not run `npm run build` or deploy from inside a dispatched agent — the
  orchestrator (you, in the main thread) owns builds and deploys, sequenced after the parallel
  agents report back, exactly like the pattern that shipped Phase 2's Workstreams 2 and 3
  concurrently without a build race.

## Skills / tools this session will need

| Tool | When |
|---|---|
| `/autopilot` | First, before anything else |
| `/dispatching-parallel-agents` | Fan out the nine (or ten) per-template audits |
| `/delegate` | Model routing per dispatched agent |
| `/subagent-prompt` | Writing each agent's cold prompt with the checklist embedded |
| `/qc-council` | Only if a surface's audit produces 2+ candidate fix-shapes to choose between |
| `/qc-inline` or `/visual-qa` | Live breakpoint + width-model verification per surface |
| Playwright MCP | `getComputedStyle`/`getBoundingClientRect` reads against the deployed canary — never a screenshot read by eye for checks 2/5 |
| `python plugins/sgs-blocks/scripts/build-deploy.py --theme-only --target sandybrown` | Deploy, orchestrator-owned, after each template's agent reports back |
| `python plugins/sgs-blocks/scripts/check-no-core-blocks.py` | Check 4 |
| `python plugins/sgs-blocks/scripts/migrate-theme-native-spacing.py --check` | Check 3 |
| `.claude/secrets/sandybrown.env` | Canary credentials — always available, gitignored |

## Close-out

When all ten surfaces pass (or a surface's genuine gap is named and parked, not silently
dropped — e.g. `front-page.html`'s empty-content caveat on check 5), update
`.claude/plans/phase-shop-container-remediation.md`'s Phase 3 table, add a decisions.md entry
for the close, update `.claude/LEDGER.md`'s shop-archive section to mark Phase 3 CLOSED, and
delete this prompt file — its job is done once Phase 3 is complete, and leaving it around risks
a future session re-running it by mistake (the same convention the comment-narrative cleanup
track followed when it closed).
