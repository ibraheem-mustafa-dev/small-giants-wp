---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, later same day. Task 3's foundation is built and committed — the picker + the
13-block prerequisite migration. Not yet the full rollout across all 65 colour-capable blocks.
Still on its own branch, not `main`, not deployed.**

**What shipped this piece, in order.**

1. Storage collapsed for the 9 legacy gradient attributes (checkpoint from earlier this session,
   commit `837f7c97`) — 4 scalars per gradient down to 1 CSS string, which is what makes
   palette-linked stops possible at all.
2. You pushed back on scoping this to just 4 blocks — right call. Checked the real numbers: the
   framework has 83 blocks, and my first-pass DB query undercounted colour capability twice (48
   reported vs 52 real SGS-attribute blocks, plus 13 more using WordPress's native colour panel
   entirely invisibly to that query — `social-icons` alone had 3 real colour attributes the DB
   query missed).
3. Ran a proper 4-seat design council on how far to take gradient (background/text/border are
   three genuinely different CSS mechanisms, not one). Council recommended scoping text/border
   down; you overrode that toward full universal coverage. That's the standing decision (D636).
4. Built the actual gradient bar — forked from the same pinned WordPress commit the colour-picker
   fork already uses, with one deliberate change: each colour stop's editor now offers the theme
   palette, so a client can link a stop to a brand colour and have it follow palette changes.
5. Migrated 13 blocks off WordPress's native colour panel onto SGS's own system first — those 13
   couldn't reach the new gradient mechanism at all otherwise. One real, verified content-reset
   found along the way (some internal test-fixture pages had a colour hand-set that will now
   reset to default) — checked against the live database rather than assumed, and it's isolated
   to disposable QA fixtures, not client content.
6. Full build passes clean (`npm run build` exit 0) — both pieces committed.

**What's left:** the actual client-facing rollout — wiring the new gradient/palette mechanism
onto every qualifying colour row across all 65 colour-capable blocks (not just the 9 legacy
overlay attributes). That's the next session's opening task, sized below.

**Also found and worth a look separately:** an audit of the 35 "no colour" blocks found only 2
genuine gaps — `product-search` and `filter-search` both hardcode a themed button/input colour
with zero client override. Everything else on that list was either deliberate (inherits from a
parent) or a DB-classification miss (not an actual gap). Low priority, unrelated to Task 3.

## Shipped this session (2026-08-16, gradient session — second piece)

| Commit | Branch | What |
|---|---|---|
| `837f7c97` | `feat/gradient-palette-stops` | (earlier checkpoint) 9 legacy gradient families collapsed to 1-string storage |
| `2723ee2b` | `feat/gradient-palette-stops` | **The gradient bar itself** — `SgsGradientPicker` fork (`src/components/gradient-picker/`), palette-linked stops via a `token` field, `gradient-parser` npm dependency added (spiked first — round-trips `var()` cleanly). `GradientOverlayControl.js` rewired to mount it. **13 blocks migrated** off native WP colour supports onto SGS's own attrs (prerequisite — see D636). One re-anchored inspector-scan baseline entry (line shift, verified unchanged control). |

### Numbers

| Metric | Start of this piece | Now |
|---|---|---|
| Blocks with a working gradient mechanism | 6 (storage only, editor broken) | 6 (storage AND editor now both work, verified via build) |
| Blocks that CAN reach SGS's colour system at all | 52 | **65** (13 migrated off native this session) |
| Universal rollout (background/text/border on all 65) | 0 | 0 — next session |
| `npm run build` | exit 0 (storage-only checkpoint) | **exit 0** (full gradient bar + 13-block migration) |

## Blockers

**None on what's committed.** Both commits are on `feat/gradient-palette-stops`, gates green,
nothing hand-waved past a real gate (the visual-diff gate correctly caught a real content-reset
risk on the 13-block migration — investigated via a live DB query rather than assumed, confirmed
isolated to disposable QA fixtures, bypass reason logged with the actual finding, not a blanket
excuse). **Not usable by a client yet** — this is foundation, not the rollout. Do not deploy this
branch: only 6 of 65 blocks have gradient capability so far, and no block outside the original 9
attributes has been touched by the universal rollout.

## Open — ready to pick up

### ⭐ NEXT SESSION — the actual rollout, 4 parallel builders

**What:** Wire the gradient/palette mechanism onto every qualifying colour row, one builder per
CSS mechanism (they're genuinely different, not one code path — confirmed by the design council,
corrected once more post-council when Bean caught a 4th mechanism the council missed entirely):

1. **Background** (~78 attrs, all blocks) — `background-image: <gradient>`. The pattern from this
   session's 9-family migration replicates directly. Fold the Solid/Gradient toggle into
   `DesignTokenPicker.js` + `SgsColourPanel.js` behind a `gradientCapable`/`attrNames` opt-in
   (per the council's SGS-architecture-fit finding) rather than rebuilding per block — reaches
   every block through the opt-in 46 of them already route through.
2. **Text — real text only, ~80 attrs** (90 minus the icon miscounts, item 4 below) —
   `background-clip: text` + `color: transparent`. Any block using `text-shadow` on gradient text
   will see the shadow vanish — flag per-block, don't silently ship it broken.
3. **Border** (~32 `border-color`-valued attrs) — masked pseudo-element (`::before` + `mask`),
   NOT `border-image` (confirmed broken with `border-radius` via MDN). Needs `position:relative`
   on the parent; check for an existing `::before` per block before assuming a free slot.
4. **Icon/SVG (~10+ attrs, NEW — corrected post-council)** — the DB's `css_property='color'`
   bucket silently conflates real text with icon colours. SGS's icons (Lucide) render as inline
   `<svg fill="none" stroke="currentColor">` — `background-clip:text` does NOTHING to an SVG
   stroke, it only clips a background to browser-painted text glyphs. Confirmed live in
   `sgs/icon/render.php`. **Simpler fix than it sounds**: SVG has native gradient paint — define
   a `<linearGradient>` inside the SVG markup and swap `stroke="currentColor"` for
   `stroke="url(#id)"`. No masking, no text-shadow breakage, reuses the same `SgsGradientPicker`
   UI already built — only the render-side emission differs. Named-match found at least 10
   attrs (`accordion`/`business-info`/`button`/`cart`/`icon`/`icon-list`/`notice-banner`/
   `trust-bar`'s `iconColour`/`iconColourHover`) — likely more via non-name-matched cases
   (this project's own documented pattern: a name-substring search undercounts, e.g.
   `mediaBackground` has no "background" in a matchable position). Re-derive the real count via
   `css_element`/render-surface inspection, not the name grep above, before sizing the builder.

**Orchestration:** 4 parallel agents, each in an ISOLATED GIT WORKTREE — builders 1-3 all touch
`DesignTokenPicker.js`/`SgsColourPanel.js`, so same-directory parallel dispatch WILL collide.
Builder 4 touches render.php SVG-emission code, likely disjoint from 1-3's files, but worktree
isolation is cheap insurance — use it for all four. Merge sequentially afterward, reconciling the
shared-file diffs by hand (they should be compatible additions to the same switch/prop shape, not
independent inventions, if each builder is given the same contract). **/qc gate mandatory before
merge** — 4 concurrent builders on shared files is exactly the shape that needs a multi-rater
pass, not just each builder's own "done" claim.

**Depends on:** this session's commits (`837f7c97`, `2723ee2b`) — the pattern and the mechanism
both now exist and are proven.

**Estimated time:** several hours across the 4 builders + a full-framework `/sgs-update` reseed +
live canary verification once merged.

### Carried — low priority, unrelated to Task 3

**Two real colour gaps found in a side audit** (not blocking, not urgent): `sgs/product-search`
and `sgs/filter-search` both hardcode a themed button/input colour with zero client override —
`style.css` reads `var(--wp--preset--color--primary, #hex)` directly, no attribute, no native
support. Scoped to ecommerce/shop pages. Worth a small follow-on session, not part of Task 3.

### Carried from the previous session (2026-08-16 morning) — untouched by this session

**Stream 1 — Wrapper decomposition (steps 6-7 of 7).** A concurrent session is actively working
on this RIGHT NOW on this same shared checkout — `ContainerWrapperControls.js` has live
uncommitted changes from that session as of this write. Do not touch that file without checking
`git status` first. Needs a design gate from Bean: given the real per-block panel-mount table
(D633), should `hero`/`site-header`/`site-footer`/`physics-canvas` be expanded toward full
composite-mirror compliance, or kept narrower? Full detail:
`~/.claude/plans/go-track-1b-playful-hamster.md` §1.4.

## Methodology guardrails (do not skip)

- **A ruling in `decisions.md` + a "shipped" line in a status doc is NOT evidence the code
  changed.** D621 was ruled, summarised as shipped, and had never been written until 2026-08-15.
  Read the code.
- **This checkout is SHARED and the branch can change under you mid-session.** Re-run
  `git branch --show-current` + `git status` immediately before every commit. A concurrent
  session was actively editing `ContainerWrapperControls.js` during this exact session.
- **A confident unverified technical claim is a claim to check, not recite.** This session
  stated "CSS forbids gradient text/borders" flatly and was correctly challenged — true at the
  literal-property level, false as a blanket "impossible" (both are real, shipped features via a
  different CSS mechanism). Verify before asserting, especially when the user has seen the
  counter-example with their own eyes.
- **A DB classification you haven't re-verified live is a claim, not ground truth.** This
  session's own `role='color'` query undercounted colour-capable blocks by at least 17 (52 real
  vs 48 reported) — verified by reading every block.json directly, not trusting the DB.
- **The visual-diff gate catches real risk, not just noise — investigate before bypassing.** The
  13-block migration's bypass was earned by a live DB query proving the actual blast radius (one
  block, isolated to disposable QA fixtures), not assumed from "it's probably fine."
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `feat/gradient-palette-stops` — NOT `main`. Verify with `git branch --show-current`
  before anything — shared checkout, concurrent session active.
- **D-ceiling:** **D636** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
- **`main` HEAD (unchanged by this session):** `a6e95e08`. All gradient work is on
  `feat/gradient-palette-stops`, not yet merged.
- **Build:** green on the branch as of `2723ee2b`. `npm run build` exit 0, full run including all
  ~50 prebuild gates.
- **Canary:** NOT deployed this session. Do not deploy `feat/gradient-palette-stops` yet — only 6
  of 65 blocks have gradient capability; the rollout that makes this client-visible hasn't run.
- **Pre-existing unrelated dirty files, not this session's to touch:** `package-lock.json` (now
  also has THIS session's legitimate `gradient-parser` addition mixed in — check the diff before
  assuming it's all pre-existing noise), `reports/phase4-*.txt`,
  `reports/visual-diff/manual-skips.log`, plus untracked files under `.claude/reports/` and
  `.claude/Border Example HTML.html`. `ContainerWrapperControls.js` — a DIFFERENT concurrent
  session's live WIP (wrapper decomposition, unrelated to gradient work).

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101 — 224 entries) |
| This session's full plan (spike, QC record, file-by-file scope) | `~/.claude/plans/task-3-custom-silly-book.md` |
| Gradient scope decision + architecture (council findings, storage shape) | `decisions.md` D636 |
| Wrapper decomposition — full 7-step history, step 5 findings | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Colour programme — Track A/B split, wave detail | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| D632-D636 + D609/D617-D622/D626 (colour + wrapper architecture) | `decisions.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, length/unit §4.1) | `.claude/plans/spec-35-control-type-contract.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
