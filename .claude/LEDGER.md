---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-17
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16/17, long session. The gradient rollout (D636) is DONE — all five colour-control
mechanisms (background, text, border, shape-divider, icon) built, merged, deployed, and checked live
on the real site.**

**What happened, honestly:** five builders ran in parallel to add gradient options across the
framework. Three came back clean in 22–43 minutes each. One (border) ran for **hours with no
check-in** and was cancelled — its real progress (2 blocks) was saved first, then a restart finished
what was needed. Merging the five branches back together wasn't mechanical: two of them had
**genuinely built the same thing twice** without knowing about each other (a colour-gradient toggle,
duplicated inside a shared component), and two others **silently overwrote each other's wiring**
because they both needed the same technical slot for different visual effects. Both were only caught
by actually running the build after each merge, not by trusting that a clean merge meant a working
one.

**End state:** every gradient mechanism works, confirmed by directly checking the real rendered output
on the live site (not just a green build) — a real gradient painted correctly through a background, a
heading's text, a shape divider, a border, and an icon's outline, one instance of each.

**What's left, not urgent:** roughly 17 more blocks could get border-colour gradients (only 4 got done
this session — the framework-wide sweep wasn't finished). Typography is the next big initiative after
this one, not yet scoped.

## Shipped today

| What | Detail lives at |
|---|---|
| Gradient rollout (D636) — all 5 mechanisms built, merged, deployed, live-verified | `decisions.md` D645 |
| Task 1a — 3 earlier colour splits (social-icons/business-info/mega-panel) live-verified | `decisions.md` D643 (updated) |
| D644 — `css:stroke` manifest member added (icon gradient prerequisite) | `decisions.md` D644 |
| 2 real cross-builder merge collisions found + fixed (not silent) | `decisions.md` D645 |

## Blockers

**None.**

## Open — ready to pick up

### Task A — Border-colour gradient, remaining framework sweep

**What:** ~17 blocks still need the border-gradient mechanism (masked `::before` + `mask`, never
`border-image`) — only `social-icons` and `mega-panel` were done this session. The known candidate
list from the restart builder's own survey: brand-strip, button, card-grid, cta-section, filter-search,
form, heading, hero, icon-list, info-box, mega-aside, option-picker, process-steps, product-card,
quote, tabs, testimonial, testimonial-slider, text, timeline (~28 attrs; re-survey rather than trust
this list — it was compiled under time pressure).
**Why:** framework-wide consistency — every other gradient mechanism (background/text/shape-divider/
icon) is now applied wherever it's genuinely used; border is the one still partial.
**Mechanism, already built and proven:** `sgs_border_gradient_css()` in `helpers-tokens.php` + the
`gradientValue`/`onGradientChange` opt-in on `DesignTokenPicker.js`'s `SgsColourStateControl`. Reuse,
don't rebuild.
**Orchestration:** delegate in batches of ~4-5 blocks per agent, isolated worktrees, with an explicit
"stop and report after 20 min on any single blocker" instruction — the previous border attempt's
multi-hour silent run is the failure mode to avoid. `/qc-inline` + full gate chain per batch.
**Watch for:** the same `css:border-color-gradient` manifest-slot pattern this session had to add
twice (social-icons, mega-panel) — check whether the default-convention suffix resolves automatically
before assuming an explicit `attrMap` entry is needed.

### Task B — Typography framework-wide initiative

**What:** not yet scoped — the next framework-wide control-migration initiative after colour, per
D626's sequencing.
**Orchestration:** `/brainstorming` or a design council first (same shape as D626's colour council),
not a build dispatch. Read D626 in full for the colour precedent before scoping.
**Depends on:** nothing (colour work is now closed). **Parallel with:** Task A — independent.

## Methodology guardrails (do not skip)

- **A clean `git merge` exit code is not proof the merge is correct.** Two real collisions this
  session (a silently-dropped JSON key, a duplicate-declaration build break) both showed as
  successful, conflict-free merges. Only running the actual build + gate chain after every merge
  caught them.
- **Two builders working in isolated worktrees can still build the exact same thing twice.**
  Parallel dispatch removes shared-file collisions during the work, not architectural duplication —
  that only surfaces at merge time, and needs a human (or an agent with both sides' context) to
  reconcile, not an auto-merge.
- **A background task running far outside its siblings' time range is a signal, not patience being
  tested.** The border builder ran ~6x longer than its 4 peers with no visible reason; cancelling and
  restarting with a tighter check-in instruction was the right call, not overcaution.
- **When cancelling a background agent with real uncommitted progress, save it first.** Committed the
  border builder's WIP as an explicit `[UNVERIFIED]` checkpoint on its own branch before stopping it —
  recoverable, not lost.
- **A JSON re-serialisation script must preserve the file's own existing indent style**, or a 2-line
  content change becomes a 600+-line spurious diff. Check `cat -A` on a few lines before writing.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.
- **A verification plan's own tooling choice is a claim to check, not just the plan's logic** —
  carried forward from the previous session's `capture-tier-fixture.py` mismatch; same discipline
  applied again this session when checking gradient rendering (verified the right DOM element, not
  the plausible-looking wrong one, on the icon stroke check).

## State Snapshot

- **Branch:** `main`, in sync with origin, HEAD `6aaafbdf`.
- **D-ceiling:** **D645** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep once reported a hex colour as the ceiling).
- **Build:** green through all ~50 gates. `check-element-manifest-conformance.js`: GATE PASS
  (unclassified 0, role-map-stale 0).
- **Canary:** DEPLOYED this session — `main` (`6aaafbdf`) to sandybrown, payload checksums 83/83.
  Carries all 5 gradient mechanisms, live-verified. Scratch pages 2477 (5-mechanism check) force-
  deleted after use.
- **Worktrees:** 5 agent worktrees from this session's dispatch still exist under
  `.claude/worktrees/agent-*` (branches merged, worktree dirs not yet cleaned up — low priority,
  `git worktree remove` each when convenient; one earlier attempt hit a Windows long-path error
  unrelated to these).
- **Pre-existing dirty files, not this session's:** `reports/phase4-*.txt`,
  `.claude/hooks/doc-size-baseline.json`, `.claude/memory/decisions-archive.md`,
  untracked `.claude/reports/*`, `.claude/Border Example HTML.html`.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Gradient rollout close-out — full merge/collision record** | **`decisions.md` D645** |
| Gradient rollout Phase 0 + scope + storage decisions | `decisions.md` D636, D643, D644 |
| Wrapper decomposition — full 7-step history, now all closed | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **`sgs/cta-section` overlay colour/gradient controls paint nothing** (`no_overlay=>true` passed to
  the shared wrapper) — needs a design call: drop the controls, or stop passing `no_overlay` (D643).
