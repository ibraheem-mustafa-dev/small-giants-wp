---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16. The 12 files that were stuck uncommitted on 2026-08-15 are landed, and the shared-DB
gate that was blocking every commit is green again.** One commit on `main` (`8b944ff5`), pushed.

**What happened, in order.**

1. Checked whether last session's blocker (a concurrent session's shadow-colour work seeding the
   shared DB with attributes `main` didn't know about) had cleared. It had — that work merged as
   PR #28 the same evening. The F6/db-consistency gate passes clean.

2. **Wrapper decomposition step 5 (live calibration) — done.** The design council's assumption that
   all 7 wrapper-owning blocks (container/cta-section/hero/trust-bar/site-header/site-footer/
   physics-canvas) should get all 6 planned extensions turned out to be wrong: real panel mounts
   range from 1 (physics-canvas — width only) to 5 (container/cta-section/trust-bar — everything).
   Also found two smaller things worth knowing: one whole panel (`GridAreaPanel`) has zero live
   mounts anywhere in the framework today, and the other (`GridItemDefaultsPanel`) mounts with no
   safety check at all — both are things step 6 needs to build, not things already working that
   step 6 can just wire up.

3. **The one block D632's shadow-colour migration deliberately skipped — `sgs/quote` — is done.**
   It was skipped last time because another session had live edits on the same file; that session
   is long since merged, so the collision risk was gone. Migrated it onto the same shape as the
   other 10 blocks, live-verified on the test site: the shadow's colour and its hover colour both
   paint correctly and change independently of each other.

4. Along the way, three small mechanical problems surfaced and got fixed: the database didn't know
   about quote's two new attributes until it was told (a normal, expected step); one classification
   rule needed a matching entry so the new colour attribute didn't fight with its own shadow shape
   for the same slot; and a live test I ran to verify the colour swap used an invalid test value
   that hid whether it actually worked — caught, fixed, and re-verified properly before trusting the
   result.

**What's next — two separate, independent pieces of work, not one.** See "Open — ready to pick up"
below for the full menu; short version: (a) the wrapper-decomposition programme's next step needs
your sign-off on which blocks get which capabilities before any more code gets written, and
(b) the colour programme has two small, unrelated leftover tasks (a design question on 2 blocks,
and the gradient-bar build) that don't depend on the wrapper work at all.

5. **Stream 2 item 2a — the `native:color` manifest-base problem — is done, in a separate concurrent
   session.** `testimonial-slider` and `process-steps` no longer show the duplicate native colour
   panel; both now match the flat-attr pattern already proven on `quote`/`heading`/`card-grid`/`text`.
   Deployed and live-verified via REST. Stream 2 now has only item 2b (gradient bar) left.

**Full narrative:** `memory/session-2026-08-15*.md` (2026-08-15 session, auto-snapshotted).

## Shipped this session (2026-08-16)

| Commit | What |
|---|---|
| `8b944ff5` | **D633 + D634.** Wrapper step 5 (live calibration — falsified the "enable all 6" assumption, report + decision recorded) and `sgs/quote`'s shadow-colour migration (the one block D632 deferred), both live-verified |
| `38426a71` | **D635.** `testimonial-slider`/`process-steps` native-colour duplicate panel closed (Stream 2 item 2a) — flat `backgroundColour`/`textColour` attrs, manifest gate unchanged (state-without-base still 2/2), deployed + live-verified |

### Numbers

| Metric | Start of session | End |
|---|---|---|
| Shadow-migrated blocks (D632 family) | 10 of 11 | **11 of 11 — complete** |
| Wrapper decomposition steps done | 4 of 7 | **5 of 7** |
| Element-manifest style defects (accepted debt) | 10 | 12 (2 new, same accepted class, written reason in the baseline file) |
| Blocks with duplicate native colour panel | 2 (`testimonial-slider`, `process-steps`) | **0 — Stream 2 item 2a closed** |
| D-ceiling | D632 | **D635** |

## Blockers

**None.** F6/db-consistency gate passes on its own merit (1 baselined, 0 new). `npm run build` exits
0. Tree is clean of this session's work (a few pre-existing unrelated dirty files from before this
session — `package-lock.json`, `reports/phase4-*.txt` — were left untouched; not this session's to
touch).

## Open — ready to pick up

### ⭐ NEXT SESSION — two independent streams, pick one or both

These do NOT depend on each other. Present both to Bean as a menu rather than assuming which one
comes first.

---

### Stream 1 — Wrapper decomposition (steps 6-7 of 7)

**What:** Step 6 — build the `background` pilot extension. Scope, per D626 + this session's step-5
findings:
1. A **design gate for Bean** first: given the real per-block panel-mount table (D633,
   `.claude/reports/2026-08-16-wrapper-step5-calibration.md`), should `hero`/`site-header`/
   `site-footer`/`physics-canvas` be EXPANDED toward full composite-mirror compliance (every wrapper
   block gets every capability), or kept at their current narrower, deliberate set? This is a real
   choice, not a default.
2. **The PHP wrapper refactor is a hard dependency in the same commit**, not a follow-up — the
   `kind` argument every block's `render.php` currently hardcodes as the literal string `'section'`
   must become a function of `enabledExtensions`, or the editor-side migration will look done while
   the PHP paint side silently disagrees underneath (D626's "hard sequencing dependency").
3. **Two new precondition gates need building, not wiring** — `GridAreaPanel` has zero live mounts
   today (D633), and `GridItemDefaultsPanel` currently mounts with no check that the block even has
   grid layout enabled. Neither existed as a working mechanism to hook into.
4. **Colour Track B merges into this step** — the shared-wrapper colours
   (`backgroundOverlayColour`, `shapeDividerTopColour`/`BottomColour`, `gridItemBackground`,
   `gridItemTextColour`) reach `container`/`cta-section`/`hero`/`trust-bar`/`site-header`/
   `site-footer` via the SAME file this step already owns — do not run it as a separate session
   (that was last session's Task 1; it's retired as its own task, see Stream 2 below for why).

**Why:** Every big migration this initiative promised has shipped except this one. It's also the
last blocker on colour reaching 100% of the framework (Track A is done; Track B only ships as part
of this).

**Orchestration:** design gate FIRST (menu + ranking to Bean per Rule 9), then delegated build.
Re-run `/delegate` after the gate — shape isn't known yet. Read D626 + D633 +
`~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 in full before starting.

**Estimated time:** ~1 session once the design gate is answered.

**Step 7** (remaining capabilities, shape dividers last — needs a new linked/unlinked X/Y scale
control, not a pure relocation) is blocked on step 6 landing; not actionable yet.

---

### Stream 2 — Colour programme leftovers (independent of Stream 1)

Track A is complete (~43 blocks). Track B is **not a standalone task any more** — it's Stream 1's
step 6 (see above); don't schedule it twice. One item remains:

**2a — CLOSED (D635, 2026-08-16).** `testimonial-slider`/`process-steps` moved to the flat-attr
colour pattern; native panel gone on both, deployed + live-verified. See D635.

**2b — Custom gradient bar (per-stop palette linking).** Kadence + Spectra both ship this; catch-up,
not differentiation. The prerequisite already landed — core's own gradient bar imports the exact
`ColorPicker` module already forked into `src/components/colour-picker/` (D627), so the shared
dependency is SGS-owned. Core's own bar offers no palette swatches for stops, so the per-stop
linking itself is genuinely new work.
**Orchestration:** delegated after a design gate. **/qc gate after: yes.**
**Estimated time:** own session.

---

## Methodology guardrails (do not skip)

- **A ruling in `decisions.md` + a "shipped" line in a status doc is NOT evidence the code
  changed.** D621 was ruled, summarised as shipped, and had never been written until 2026-08-15.
  Read the code.
- **This checkout is SHARED and the branch can change under you mid-session.** Re-run
  `git branch --show-current` + `git status` immediately before every commit.
- **A DB reseed picks up ambient, unrelated drift corrections** in shared derived-classifier files
  (`css-property-classifications.json`, `attr-role-map.json`) — expected, not a bug to chase; note
  it in the commit rather than hand-reverting (can't selectively regenerate one block's rows).
- **Verify on the real editor / real canary, not the DOM alone** — a swatch that opens is not a
  swatch that applies; a computed style that "matches" isn't proof until you've checked the value
  actually reached the right attribute (this session's shadow-colour probe used an invalid test
  value on the first pass and silently proved nothing — caught before it was trusted).
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main`. Verify with `git branch --show-current` before anything — shared checkout.
- **D-ceiling:** **D635** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **`main` HEAD:** `38426a71`, pushed to `origin/main`.
- **A second, concurrent session is/was active on this checkout during this session** — dirty
  uncommitted files on `container`/`hero`/`cta-section`/`site-header`/`site-footer`/`trust-bar`/
  `class-sgs-container-wrapper.php`, not this session's to touch or describe further. D635's deploy
  worked around this via `git stash` on those exact paths (push → build+deploy → pop), never staging
  or committing any of it. Re-check `git status` before assuming the checkout is clean.
- **Build:** green. `npm run build` exit 0. F6/db-consistency 1 baselined / 0 new. Element-manifest
  GATE PASS (style-defect 12/12 baselined, state-without-base 2/2, unclassified 0). Cheat-gate 18
  baselined / 0 new.
- **Canary:** sandybrown. All shadow-migrated blocks (11 of 11) were deployed this session; only
  `card-grid` (D632) and `sgs/quote` (this session) have been individually live-verified — the other
  9 D632 blocks still have "full re-verification pending the next canary deploy" open against them
  (D632's own note, unchanged).
- **Playwright MCP:** worked fine this session.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101 — 224 entries) |
| Wrapper decomposition — full 7-step history, step 5 findings | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Colour programme — Track A/B split, wave detail | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| Wrapper step 5 calibration (raw data) | `.claude/reports/2026-08-16-wrapper-step5-calibration.md` |
| D632-D635 (this + last session) + D609/D617-D622/D626 (colour + wrapper architecture) | `decisions.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, link §2) | `.claude/plans/spec-35-control-type-contract.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
