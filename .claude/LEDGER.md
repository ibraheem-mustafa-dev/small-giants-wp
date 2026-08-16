---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, later same day. Task 3's foundation is built and committed — the gradient bar +
the 13-block prerequisite migration. NOT the full rollout across all 65 colour-capable blocks.
Own branch, not `main`, not deployed.**

1. Storage collapsed for the 9 legacy gradient attrs (`837f7c97`) — 4 scalars per gradient down
   to 1 CSS string, which is what makes palette-linked stops possible at all.
2. You pushed back on scoping to just 4 blocks — right call. Real numbers: 83 blocks total; my
   first DB query undercounted colour capability twice (48 reported vs 52 real SGS-attribute
   blocks, plus 13 more on WordPress's native panel entirely invisible to that query).
3. Ran a 4-seat design council on how far to take gradient (background/text/border are three
   genuinely different CSS mechanisms). Council recommended scoping down; you overrode toward
   full universal coverage — standing decision D636.
4. Built the actual bar (`2723ee2b`) — forked from the same pinned WP commit the colour-picker
   fork uses, one deliberate change: each stop's editor offers the theme palette, so a client can
   link a stop to a brand colour.
5. Migrated 13 blocks off native WP colour supports first — they couldn't reach the gradient
   mechanism otherwise. One real content-reset found (live DB check, not assumed) — isolated to
   disposable QA test-fixture pages, not client content.
6. You then caught a 4th mechanism the council missed: icon colour (SVG `stroke="currentColor"`)
   needs SVG-native gradients, not `background-clip:text` — that would have shipped a toggle that
   visibly does nothing. Corrected in D636's addendum before this session closed.
7. Full build passes clean (`npm run build` exit 0), both pieces committed and pushed.

**What's left:** the client-facing payoff — wiring gradient onto every qualifying colour row
across all 65 blocks, 4 CSS mechanisms. Sized as next session's opening task below.

## Shipped this session

| Commit | What |
|---|---|
| `837f7c97` | 9 legacy gradient families collapsed to 1-string storage |
| `2723ee2b` | **The gradient bar** — `SgsGradientPicker` fork (`src/components/gradient-picker/`), palette-linked stops via a `token` field, `gradient-parser` dependency added (spiked first). `GradientOverlayControl.js` rewired to mount it. **13 blocks migrated** off native WP colour supports (prerequisite, D636). Re-anchored one inspector-scan baseline entry. |
| `f0d0bfd6`, `5b0e075a` | Docs: D636 council record + universal-scope decision + the icon-mechanism correction |

**Numbers:** blocks with a working gradient mechanism 6 (was storage-only/broken editor, now
both work); blocks that can reach SGS's colour system at all 52 → **65** (arithmetic from the
code change — the DB hasn't been reseeded via `/sgs-update` yet, so `role='color'` still queries
60/no rows for the 13 migrated blocks; run the reseed before trusting a live DB count here);
universal rollout 0/65 — next session; `npm run build` exit 0.

## Blockers

**None on what's committed.** Gates green, nothing hand-waved past a real gate — the visual-diff
gate correctly caught the 13-block migration's real content-reset risk; bypassed only after a
live DB query proved the actual blast radius (one block, disposable QA fixtures). **Not usable
by a client yet** — foundation, not the rollout. Do not deploy this branch: only 6 of 65 blocks
have gradient capability.

## Open — ready to pick up

### ⭐ NEXT SESSION — the rollout, 4 parallel builders

**What:** wire gradient/palette onto every qualifying colour row, one builder per CSS mechanism
(confirmed genuinely different, not one code path):

1. **Background** (~78 attrs, all blocks) — `background-image: <gradient>`, replicates this
   session's pattern directly. Fold the Solid/Gradient toggle into `DesignTokenPicker.js` +
   `SgsColourPanel.js` behind a `gradientCapable`/`attrNames` opt-in — reaches every block
   through the opt-in 46 already route through, no rebuild-per-block.
2. **Text — real text only, ~80 attrs** (90 minus the icon miscounts) — `background-clip: text` +
   `color: transparent`. Flag any block using `text-shadow` on gradient text — the shadow vanishes.
3. **Border** (~32 attrs) — masked pseudo-element (`::before` + `mask`), NOT `border-image`
   (confirmed broken with `border-radius`). Needs `position:relative` on the parent.
4. **Icon/SVG (~10+ attrs, NEW)** — SGS icons render `<svg stroke="currentColor">`;
   `background-clip:text` does nothing to an SVG stroke. Fix: an inline `<linearGradient>` def +
   `stroke="url(#id)"` swap — reuses the same picker UI, simplest of the four. Named-match found
   10 attrs (`accordion`/`business-info`/`button`/`cart`/`icon`/`icon-list`/`notice-banner`/
   `trust-bar`); likely more via non-name-matched cases (project's own documented undercounting
   pattern) — re-derive via `css_element`/render-surface inspection before sizing.

**Orchestration:** 4 parallel agents, each in an **isolated git worktree** — builders 1-3 all
touch `DesignTokenPicker.js`/`SgsColourPanel.js`, same-directory dispatch WILL collide. Merge
sequentially, reconciling shared-file diffs by hand (same contract given to each builder should
keep diffs compatible, not independently invented). **/qc gate mandatory before merge.**

**Before dispatching:** run `/sgs-update` to reseed the DB — the 13-block migration this session
added new colour attrs the DB hasn't picked up yet (`role='color'` still queries 60/misses the
migrated blocks). Builders scoping their per-block attribute lists need the reseeded DB, not the
stale one.

**Depends on:** `837f7c97` + `2723ee2b` — pattern and mechanism both proven.
**Estimated time:** several hours across the 4 builders + `/sgs-update` reseed + canary verify.

### Carried, low priority

- **Two real colour gaps** (side audit, not Task 3): `sgs/product-search` + `sgs/filter-search`
  hardcode a themed button/input colour, zero client override. Ecommerce pages only.
- **Stream 1 — wrapper decomposition (steps 6-7).** A CONCURRENT session is actively editing
  `ContainerWrapperControls.js` right now — check `git status` before touching it. Needs a design
  gate first (D633 panel-mount table). Detail: `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4.

## Methodology guardrails (do not skip)

- **A ruling + "shipped" line in a status doc is NOT evidence the code changed.** Read the code.
- **Shared checkout, branch can change under you.** Re-run `git branch --show-current` +
  `git status` before every commit.
- **A confident unverified technical claim is a claim to check, not recite.** "CSS forbids
  gradient text/borders" was correctly challenged this session — true at the literal-property
  level, false as a blanket "impossible" (real shipped features via a different mechanism).
- **A DB classification you haven't re-verified live is a claim, not ground truth.** `role='color'`
  undercounted colour-capable blocks by 17+ this session — verified by reading block.json directly.
- **The visual-diff gate catches real risk — investigate before bypassing**, never assume "fine."
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `feat/gradient-palette-stops` — NOT `main`. Verify before anything.
- **D-ceiling:** **D636** — `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
- **`main` HEAD:** `a6e95e08` (unchanged). All gradient work on the branch, not yet merged.
- **Build:** green as of `2723ee2b`/`5b0e075a`. `npm run build` exit 0, full ~50-gate run.
- **Canary:** NOT deployed. Do not deploy this branch — only 6/65 blocks have gradient capability.
- **Pre-existing dirty files, not this session's:** `package-lock.json` (also carries this
  session's legit `gradient-parser` add — check diff), `reports/phase4-*.txt`,
  `reports/visual-diff/manual-skips.log`, untracked `.claude/reports/*`. `ContainerWrapperControls.js`
  — a DIFFERENT concurrent session's live WIP.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101 — 224 entries) |
| This session's full plan (spike, QC record, file scope) | `~/.claude/plans/task-3-custom-silly-book.md` |
| Gradient scope + architecture (council, storage shape, icon correction) | `decisions.md` D636 + addendum |
| Wrapper decomposition — full history | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Colour programme — Track A/B split | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| D632-D636 + D609/D617-D622/D626 | `decisions.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, gradient field 8) | `.claude/plans/spec-35-control-type-contract.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
