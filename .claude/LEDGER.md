---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, later same day. Task 3 (the gradient bar) is mid-build, in progress, on its own
branch — not on `main`, not deployed.** Scope grew significantly from the original ask after a
real technical question surfaced mid-session; here's the honest state.

**What happened, in order.**

1. **Planned the gradient bar** — client picks a theme palette colour for one gradient stop,
   changing the palette re-colours it. QC'd the plan before building: found and fixed 2 false
   claims carried forward from an older report (a theme-pattern file that turned out not to need
   touching; a build-blocking gate that was missing from the plan entirely).
2. **Spiked the risky unknown first, not assumed.** The npm package the gradient bar needs
   (`gradient-parser`) was untested against a palette-linked stop (`var(--wp--preset--color--x)`).
   It round-trips cleanly — confirmed with real test output, not guessed.
3. **Started the storage-layer build** — the old shape (4 scalars: on/off + angle + start colour
   + end colour) can only ever express a straight 2-stop gradient; collapsed to 1 string
   attribute per gradient, across the 9 places it already existed (6 blocks).
4. **You asked why this was scoped to only 4 blocks, and pushed back hard when I answered with
   an unverified technical claim.** You were right to refuse it — I'd said "CSS forbids gradient
   text/borders" without evidence, when you'd seen real products do exactly that. Researched it
   properly: the raw claim (`color`/`border-color` can't take a gradient value directly) IS true
   per spec, but gradient text/borders are real, shipped features that get there through a
   DIFFERENT CSS mechanism (`background-clip:text` for text; a masked pseudo-element for
   border — `border-image` can't do it, it breaks `border-radius` entirely).
5. **Ran a proper 4-seat design council** (competitor prior-art / CSS-unification / SGS
   architecture fit / cost-benefit) on how far to take this. Council recommended scoping text to
   2 attributes and deferring border. **You overrode that: build all three, universally, across
   every qualifying colour attribute in the framework — "less effort because we can blanket add
   the functionality globally."** That's the standing decision now (D636).
6. **Committed the checkpoint** (`837f7c97` on `feat/gradient-palette-stops`) and wrote it up
   (D636) before continuing, per your explicit instruction.

**What's next:** 3 parallel builders (background / text / border), one per CSS mechanism, then
QC. Not started yet as of this write — see "Open" below.

**Full narrative of the PREVIOUS session's work (D632-D635, wrapper step 5, colour Stream 2 item
2a):** `memory/session-2026-08-16-morning.md` (auto-snapshotted when this file next rotates).

## Shipped this session (2026-08-16, gradient session)

| Commit | Branch | What |
|---|---|---|
| `837f7c97` | `feat/gradient-palette-stops` | **D636 storage-layer checkpoint.** 9 gradient families (container/cta-section/site-header/site-footer/trust-bar/hero) collapsed from 4 scalars to 1 CSS-string attribute each. Render side routes through `sgs_css_gradient_value()`. Editor picker intentionally non-functional until the DesignTokenPicker rewrite lands (next). Visual-diff gate scoped-bypassed with a logged reason (see D636) — every default is empty, no existing content has a non-default value, rendered output unchanged for every current page. |

### Numbers

| Metric | Start of this piece of work | Now |
|---|---|---|
| Gradient attribute families | 9 (2-stop-only shape) | 9 collapsed to 1-string shape; ~185 more attrs (text+border+rest of background) still pending |
| Blocks with gradient capability | 6 | 6 (storage only); universal rollout not started |
| `sgs_css_gradient_value()` call sites | 0 | 9 (wrapper + hero) |

## Blockers

**None on the checkpoint itself** — `837f7c97` is committed, gates green (gitleaks, cheat-gate,
F5, F6 all passed; only the visual-diff gate needed the scoped, logged bypass). **But the
feature is NOT usable yet**: the editor's gradient picker UI still writes the OLD attribute
names on the 6 blocks touched so far, so it will silently fail to save until the next commit
(DesignTokenPicker/SgsColourPanel rewrite) lands. Do not deploy this branch to the canary in its
current state.

## Open — ready to pick up

### ⭐ NEXT — dispatch 3 parallel builders, per D636

**What:** One builder per CSS mechanism, each covering every qualifying colour attribute for
their property family, framework-wide:

1. **Background** (~78 attrs, all blocks) — `background-image: <gradient>`, reusing the pattern
   already proven in `837f7c97`. Fold the Solid/Gradient toggle into `DesignTokenPicker.js` +
   `SgsColourPanel.js` behind a `gradientCapable`/`attrNames` opt-in (per D636's architecture
   finding) rather than rebuilding per block.
2. **Text** (~90 `color`-valued attrs) — `background-clip: text` + `color: transparent`
   mechanism. Needs a solid-colour `@supports` fallback for unsupported browsers, and note that
   any block using `text-shadow` on a gradient-text element will see the shadow vanish
   (`color:transparent` breaks it) — flag, don't silently ship broken.
3. **Border** (~32 `border-color`-valued attrs) — masked pseudo-element (`::before` + `mask`/
   `-webkit-mask-composite`), NOT `border-image` (confirmed broken with `border-radius`). Needs
   `position:relative` on the parent; check for existing `::before` usage per block before
   assuming a free pseudo-element slot.

**Why:** Bean's explicit ruling (D636) — universal coverage, no carve-outs, less operator
confusion than a partially-gradient-capable framework.

**Orchestration:** 3 parallel agents (one per mechanism above), each self-contained — full
architecture brief is D636 + this LEDGER section + council seat findings (not yet filed as a
report; ask the dispatching session if starting fresh). Same shared-checkout risk as always — if
running from a fresh session, confirm no other track is live on `DesignTokenPicker.js`/
`SgsColourPanel.js` before dispatching, since all 3 builders touch those 2 files.

**Depends on:** `837f7c97` (storage-layer pattern to replicate). **/qc gate after: yes, mandatory
— 3 concurrent builders on shared files is exactly the shape that needs a multi-rater pass
before merge, not just each builder's own claim of done.**

**Estimated time:** several hours across the 3 builders + a full-framework `/sgs-update` reseed
+ live canary verification once merged.

---

### Carried from the previous session (2026-08-16 morning) — untouched by this piece of work

**Stream 1 — Wrapper decomposition (steps 6-7 of 7).** Needs a design gate from Bean first: given
the real per-block panel-mount table (D633), should `hero`/`site-header`/`site-footer`/
`physics-canvas` be expanded toward full composite-mirror compliance, or kept at their current
narrower set? PHP wrapper refactor (`kind` argument) is a hard same-commit dependency, not a
follow-up. Two precondition gates need building (`GridAreaPanel` zero live mounts;
`GridItemDefaultsPanel` no safety check). Full detail: `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4.

## Methodology guardrails (do not skip)

- **A ruling in `decisions.md` + a "shipped" line in a status doc is NOT evidence the code
  changed.** D621 was ruled, summarised as shipped, and had never been written until 2026-08-15.
  Read the code.
- **This checkout is SHARED and the branch can change under you mid-session.** Re-run
  `git branch --show-current` + `git status` immediately before every commit.
- **Fact-check an old report's claims before carrying them forward, even when its judgement was
  sound.** This session's own plan QC caught 2 false claims carried from a 2-day-old council
  report (a file that didn't need touching; a gate missing from the plan). The report was right
  about the big call (storage shape) and wrong about two mechanical details.
- **When you assert a technical claim as a fact ("CSS forbids X"), that's a claim to verify, not
  recite from memory** — caught this session when a confident-but-unverified claim was
  challenged and turned out to be half-right (true at the literal-property level, false as a
  blanket "impossible").
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `feat/gradient-palette-stops` — NOT `main`. Verify with `git branch --show-current`
  before anything — shared checkout.
- **D-ceiling:** **D636** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **`main` HEAD (unchanged by this session):** `38426a71`. This session's work is entirely on
  `feat/gradient-palette-stops`, not yet merged.
- **Build:** green on the branch as of `837f7c97`. `npm run build` not re-run since (only PHP/JSON
  touched, syntax-checked directly). Re-run full build before the next commit.
- **Canary:** NOT deployed this session. Do not deploy `feat/gradient-palette-stops` — the editor
  gradient picker is non-functional on it until the DesignTokenPicker rewrite lands.
- **Pre-existing unrelated dirty files, not this session's to touch:** `package-lock.json`,
  `reports/phase4-*.txt`, `reports/visual-diff/manual-skips.log`, plus untracked files under
  `.claude/reports/` and `.claude/Border Example HTML.html`.

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
