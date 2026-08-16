---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, evening. TWO parallel tracks both closed out today and merged to `main`.**

**Track 1 — Stage 1 (D640) colour-gap closure: DONE.** All 4 streams (multi-button container
parity + group defaults, product-search colour + ⌘K overlay + richer results, filter-search
colour, buybox card surface) built in parallel, merged, deployed to sandybrown, live-verified.
Live testing found 2 real production bugs the ~50-gate build never would have — one I found
myself via click-through (product-search colour vars not reaching a reparented `<dialog>`), one
Bean caught personally (search suggestions dead because a subagent invented a WooCommerce function,
`wc_get_price_html()`, that doesn't exist). Both fixed and re-verified live. Full incident record:
`decisions.md` D641.

**Track 2 — Wrapper decomposition step 6 (D638) CLOSED, step 7 fully designed and unblocked.**
3 build agents wired the `background` extension onto all 7 direct-panel blocks (container,
cta-section, trust-bar, hero, site-header, site-footer, physics-canvas — the last of these gaining
a background capability it never had before). A real bug (a shared `resolve_kind()` helper that
would have silently broken site-header/site-footer/physics-canvas) was found and fixed before it
shipped. Live-tested on the canary, reviewed by 2 independent lenses. Step 7's three remaining
designs (`gridItems`/`layout` precondition, `gridAreas` flag completion, `ScaleAxisControl` for
shape dividers) are now FULLY LOCKED — no design blocker left, ready to build next.

**Merging these two tracks together (this session) surfaced a real cross-track collision worth
knowing about:** both branches independently used "D638" for two different decisions (same root
D637 ceiling, diverged independently) — resolved by renumbering Track 1's entries to D640/D641,
since Track 2's D638 was already live on `main`. A stale duplicate `## D636` heading and a missing
`D636 addendum` section (both pre-existing branch drift, not this session's doing) were also fixed
during reconciliation. Full merge record: this LEDGER's own git history + the merge commit message.

## Shipped this session

### Track 1 — Stage 1 colour-gap closure (D640/D641)

**Stream A — `sgs/multi-button`:** container-style parity with `sgs/container` (padding, background
image/video/SVG/overlay, border) + child-button LIVE group defaults for background/text/border
colour, border radius, font size, font weight — a CSS custom-property fallback chain, not the
Block Context API and not editor-time copy. Live-verified on the canary: an unset child inherits
the group default; a child with its own explicit value keeps it.

**Stream B — `sgs/product-search`:** 5 client-controllable colour rows, new `command-palette`
⌘K/Ctrl+K overlay mode (extends the existing `full-screen-overlay` containment, not a second
mechanism), rich result cards (image+price+bolded-match+skeleton-loading), 3 new REST fields.
**Two bugs found + fixed via live QC, not the build:** colour vars weren't reaching the reparented
`<dialog>` (fixed: the dialog now carries the scoped uid class directly); `wc_get_price_html()`
doesn't exist in WooCommerce (fixed: `$product->get_price_html()`).

**Stream C — `sgs/filter-search`:** 3 colour attrs, one hardcoded grey fixed, visual polish.

**Stream D — `sgs/buybox`:** native background/text/border/gradient supports enabled on the root
via `wp_style_engine_get_styles()`. `sgs/mega-group` correctly left untouched (no gap).

**Post-merge fixes (found via live QC, not the build):** dead `stripComments()` call in
`check-hardcoded-render-defaults.js` fixed (Bean-requested), unmasking 6 pre-existing debt items;
the 2 product-search bugs above. New static checker for hallucinated PHP function calls
(`check-dead-api-calls.py`, self-tested, 305-entry baseline) wired into `prebuild` advisory-only.

**Numbers:** 4/4 D640 streams shipped full scope. 3 live production bugs found + fixed this
session (1 pre-existing content-shape drift, 2 introduced by this session's own streams).

### Track 2 — Wrapper decomposition step 6 (D638)

3 build agents (parallel isolated worktrees) wired the `background` extension onto all 7
direct-panel blocks via a shared `resolve_kind()` mechanism. Physics-canvas gains a background
capability net-new. **A real bug found and fixed before it shipped:** an early version of
`resolve_kind()` would have silently broken site-header/site-footer's min-height/padding and (worse)
physics-canvas's entire physics-arena boundary. Live-tested on the canary (real background images
set through the actual editor, confirmed on the published page, confirmed no pointer-event
interference on physics-canvas's interactive children). 2 independent reviewers checked the full
diff before merge; one found a stale code comment (fixed), the other found nothing. Step 7's three
designs (gridItems/layout precondition, gridAreas flag completion, ScaleAxisControl) went through
2 review lenses + an independent fact-check, with 2 real corrections folded in, and are now FULLY
LOCKED per Bean's direct rulings on the two open judgement calls (shape-divider render behaviour +
control shape).

**Numbers:** wrapper decomposition steps done: 5→**6 of 7**. Blocks with a real, gated `background`
extension: 0→**7 of 7**. Blocks calling `resolve_kind()` instead of a hardcoded literal: 0→**7 of 7**.

## Blockers

**None.** Both tracks' work is committed, merged, deployed, and live-verified.

## Open — ready to pick up

### ⭐ Two independent next items — pick either, they don't collide

**Stage 2 — the gradient rollout (D636).** Now unblocked — Track 1's colour attrs are live, so any
NEW colour attribute lands in the background-family bucket and gets gradient support automatically.
**Run `/sgs-update` FIRST** — new attrs from both tracks aren't in the DB yet.

| Builder | Mechanism | Scale |
|---|---|---|
| Background | `background-image: <gradient>`; fold Solid/Gradient into `DesignTokenPicker.js`/`SgsColourPanel.js` behind `gradientCapable` | ~78 attrs |
| Text (real text only) | `background-clip: text` + `color: transparent`; `text-shadow` breaks under it — flag per block | ~80 attrs |
| Border | masked `::before` + `mask`; **NOT `border-image`** (breaks `border-radius`) | ~32 attrs |
| Icon/SVG | inline `<linearGradient>` + `stroke="url(#id)"`; simplest of the four | ~10+, re-derive |

Isolated worktree each — builders 1-3 touch the same two shared files. `/qc` mandatory before merge.
Full detail: `decisions.md` D636 + addendum.

**Step 7 — remaining wrapper capabilities (shape dividers last).** No design blocker — all three
designs locked by Bean. Read `decisions.md` D637 + both addenda and
`specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §F.2 before building. Same orchestration lesson as step 6:
shared-file work (gate script, DB column, new component) stays single-owner; per-block wiring
parallelises across isolated worktrees.

**Separate small design gate, still outstanding:** `sgs/container`'s Background panel renders in
Settings; `sgs/hero`'s renders in Styles — a real placement inconsistency found during step 6's
live verification (D626's own table says Background belongs in Styles for all blocks).

### Carried, low priority

- **`feat/dead-api-checker`** (merged) — run `npm run check:dead-api-calls` standalone for a couple
  of weeks, trim its 305-entry baseline as real WP/WC functions get promoted into the curated
  allowlist, then decide with Bean whether/where it joins the hard `prebuild` gate.

## Methodology guardrails (do not skip)

- **A green ~50-gate build is not proof the code works.** Track 1 shipped 2 bugs clean through
  every static gate; both only surfaced when the actual PHP/JS ran against real data on a real
  page. Live canary verification is not optional theatre.
- **A subagent's claimed API/function name is a claim to verify, not a fact to relay.**
  `wc_get_price_html()` was invented, sounded plausible, and was accepted without checking real
  WooCommerce source.
- **Empty results can hide a crash.** Test with inputs that actually MATCH something, not just any
  input — an empty-result query can never reach a broken code path.
- **A shared checkout with concurrent sessions needs the ownership gate, not assumptions.** The
  D576 ownership gate correctly refused two separate deploy attempts this session where the canary
  carried state the deploying branch didn't know about.
- **Live QC test content written to a SHARED canary page is cross-branch blast radius — revert
  EVERY edit immediately, not just some.** A missed revert (a `sgs/product-search` test instance
  on a shared QA page) blocked a parallel session's deploy until caught and fixed.
- **Two branches can independently claim the same next decision number.** Both tracks used "D638"
  from the same D637 ceiling. Renumber the branch merging SECOND; never assume your own D-number is
  safe until you've actually merged.
- **A duplicate heading or missing section can hide in your OWN branch's history without you
  causing it.** Found mid-merge: a byte-identical duplicate `## D636` entry and an entirely missing
  `D636 addendum` section, neither introduced this session — always diff your branch against a
  clean common ancestor before trusting "my file is correct."
- **Live verification beats static/agent-reported verification.** Track 2's build agents flagged
  physics-canvas's pointer-events question as unverified; live Playwright with real computed-style
  evidence closed it.
- **Two-lens review found one real finding out of two dispatched lenses; disclose lens outcomes
  honestly rather than rounding up to "fully reviewed, nothing found."**
- **A ruling + "shipped" line in a status doc is NOT evidence the code changed.** Read the code.
- **Shared checkout, branch can change under you.** Re-run `git branch --show-current` +
  `git status` before every commit.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main`. This session merged `feat/gradient-palette-stops` (Track 1, PR #29) and
  `integrate/wrapper-step6`/`feat/wrapper-step7` (Track 2) together. Verify with
  `git branch --show-current` before anything.
- **D-ceiling:** **D641** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **Build:** green. `npm run build` exit 0 after the merge — regenerated `generated-fx-qualifying-*`
  files and `package-lock.json` rather than hand-merging them; verified `sgs/multi-button`'s new
  fx-qualifying entry survived regeneration.
- **Canary:** sandybrown carries Track 1's live-verified deploy (commit `c4136e9f` + follow-up
  fixes). Track 2 used a scratch test page (id 2453), force-deleted at session end — nothing left
  behind. Track 1's own test content on posts 1486/1651 was reverted after verification.
- **Pre-existing dirty files, not this session's:** `reports/phase4-*.txt`,
  untracked `.claude/reports/*`. Left untouched throughout.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Track 1 incident record — 4 bugs found + fixed, live evidence** | **`decisions.md` D641** |
| Track 1 colour-gap council — all rulings, evidence, traps | `decisions.md` D640 |
| Track 1 execution plan (archived, executed) | `.claude/plans/archive/2026-08-16-colour-gaps-parallel-plan.md` |
| Gradient scope + architecture (council, storage, icon correction) | `decisions.md` D636 + addendum |
| Track 2 close-out — full detail, bug found, live verification, review findings | `decisions.md` D638 |
| Step 7 design — ALL THREE fully locked, no blocker | `decisions.md` D637 + its two later addenda + `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §F.2 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, gradient field 8) | `.claude/plans/spec-35-control-type-contract.md` |
| Wrapper decomposition — full 7-step history | `~/.claude/plans/go-read-the-track-encapsulated-hare.md` + `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Colour panel rollout (T4, D618 — separate from D640) | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| New dead-API checker (not yet wired to hard gate) | `plugins/sgs-blocks/scripts/check-dead-api-calls.py` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
