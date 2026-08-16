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

1. Storage collapsed for the 9 legacy gradient attrs (`837f7c97`) — 4 scalars → 1 CSS string,
   which is what makes palette-linked stops possible at all.
2. You pushed back on scoping to 4 blocks — right call. 83 blocks total; my first DB query
   undercounted colour capability twice (48 reported vs 52 real, plus 13 more on WordPress's
   native panel entirely invisible to that query).
3. Built the bar (`2723ee2b`) — forked from the same pinned WP commit the colour-picker fork
   uses, one change: each stop's editor offers the theme palette.
4. Migrated 13 blocks off native WP colour supports first — they couldn't reach the gradient
   mechanism otherwise. One real content-reset found (live DB check, not assumed) — isolated to
   disposable QA fixtures, not client content.
5. You caught a 4th CSS mechanism two councils missed: icon colour (SVG `stroke="currentColor"`)
   needs SVG-native gradients, not `background-clip:text` — would have shipped a toggle that
   visibly does nothing. D636 addendum.
6. **Second council (D638)** on the colour gaps you queried: `buybox` cleared (small residual),
   `mega-group` cleared outright, `multi-button` group-defaults validated by unanimous prior art,
   search-block redesign scoped. **Ruled to land BEFORE the gradient rollout** — see Stage 1.
7. Full build passes clean (`npm run build` exit 0), committed and pushed, PR #29 open.

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

### ⭐ NEXT SESSION — STAGE 1 FIRST: close the colour gaps (D638), THEN the gradient rollout

**Why this order (Bean-ruled, reasoning verified):** any colour attribute added now lands in the
background-family bucket and receives gradient AUTOMATICALLY in the universal pass below. Added
after, each needs its own separate gradient retrofit. Do Stage 1, then Stage 2 — the dependency is
real, not cosmetic. Full council record + all rulings: `decisions.md` **D638**.

**Stage 1 — 4 parallel streams, disjoint files, one worktree each.
⛔ FULL PLAN: `.claude/plans/2026-08-16-colour-gaps-parallel-plan.md` — read it AND D638 before
building. It carries per-stream scope, the settled mechanisms, QC gates, doc checkpoints, and
several "do NOT" traps that cost real time if missed.**

| Stream | What | Size |
|---|---|---|
| **A** | `sgs/multi-button` — **A1: its OWN container-style controls** (background colour, **border**, **padding**, background media — full `sgs/container` parity, currently has only bg+text) **+ A2: child-button group defaults** (~6-8 core props, CSS custom-property fallback chain) | biggest |
| **B** | `sgs/product-search` — ⌘K overlay mode + rich result cards + new REST fields + per-block colour attrs | big |
| **C** | `sgs/filter-search` — no new mode; 1 hardcoded grey + colour attrs + polish | small |
| **D** | `sgs/buybox` — optional card surface. **`mega-group` needs NOTHING (D638 §1)** | smallest |

**Stage 2 — the gradient rollout, 4 parallel builders, one per CSS mechanism** (genuinely
different, not one code path — full detail + the icon correction in **D636 + its addendum**):

| Builder | Mechanism | Scale |
|---|---|---|
| Background | `background-image: <gradient>`; fold the Solid/Gradient toggle into `DesignTokenPicker.js`/`SgsColourPanel.js` behind a `gradientCapable` opt-in | ~78 attrs |
| Text (real text only) | `background-clip: text` + `color: transparent`; `text-shadow` breaks under it — flag per block | ~80 attrs |
| Border | masked `::before` + `mask`; **NOT `border-image`** (breaks `border-radius`) | ~32 attrs |
| Icon/SVG | inline `<linearGradient>` + `stroke="url(#id)"`; simplest of the four | ~10+, re-derive |

**Orchestration:** isolated worktree each — builders 1-3 all touch the same two shared files.
**/qc gate mandatory before merge.** **Run `/sgs-update` first** — Stage 1's new attrs plus this
session's 13-block migration aren't in the DB, and builders scope from it.

**Estimated time:** Stage 1 ~1 session; Stage 2 several hours across 4 builders + reseed + canary.

### Carried, low priority

- **Stream 1 — wrapper decomposition (steps 6-7).** A CONCURRENT session is actively editing
  `ContainerWrapperControls.js` right now — check `git status` before touching it. Needs a design
  gate first (D633 panel-mount table). Detail: `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4.

## Methodology guardrails (do not skip)

- **A ruling + "shipped" line in a status doc is NOT evidence the code changed.** Read the code.
- **Shared checkout, branch can change under you.** Re-run `git branch --show-current` +
  `git status` before every commit.
- **A confident unverified technical claim is a claim to check, not recite.** "CSS forbids
  gradient text/borders" was correctly challenged this session — true at the literal-property
  level, false as a blanket "impossible".
- **A DB classification you haven't re-verified live is a claim, not ground truth.** `role='color'`
  undercounted colour-capable blocks by 17+ this session — verified by reading block.json directly.
- **An AUDIT'S REASONING can be wrong even when its verdict is right** (D638): the buybox
  "no colour" call was correct, its stated reason was not. Re-verify reasoning, not just verdicts.
- **The visual-diff gate catches real risk — investigate before bypassing**, never assume "fine."
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `feat/gradient-palette-stops` — NOT `main`. Verify before anything.
- **D-ceiling:** **D638** (D637 came from a CONCURRENT session mid-write — always re-derive:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`).
- **`main` HEAD:** `a6e95e08` (unchanged). All gradient work on the branch + PR #29, not merged.
- **Build:** green as of `2723ee2b`. `npm run build` exit 0, full ~50-gate run.
- **Canary:** NOT deployed. Do not deploy this branch — only 6/65 blocks have gradient capability.
- **Pre-existing dirty files, not this session's:** `package-lock.json` (also carries this
  session's legit `gradient-parser` add — check diff), `reports/phase4-*.txt`,
  `reports/visual-diff/manual-skips.log`, untracked `.claude/reports/*`.
  `ContainerWrapperControls.js` — a DIFFERENT concurrent session's live WIP.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Stage 1 council — ALL rulings, evidence, traps** | **`decisions.md` D638** |
| Gradient scope + architecture (council, storage, icon correction) | `decisions.md` D636 + addendum |
| This session's gradient plan (spike, QC record, file scope) | `~/.claude/plans/task-3-custom-silly-book.md` |
| Wrapper decomposition · colour Track A/B | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 / §1.2d |
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
