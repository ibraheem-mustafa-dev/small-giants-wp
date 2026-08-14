---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-14
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-14.** Executed the T1-T5 uniformity-thread orchestration plan that a prior session's
LEDGER rewrite had silently dropped (recovered from a rotated snapshot — flagged so this doesn't
recur). All five closed: docs folded in + 8 stale entries fixed (T1); `sgs/social-icons` 5-fix
repair, live-verified (T2); rule 27 promoted to a real gate (T3); a colour panel built for
`sgs/icon` (T4) — first build was wrong (mounted into WordPress's own native colour panel instead
of building our own, you caught it, rebuilt as a standalone panel, D618); `pricing-table` schema
data-loss bug fixed and genuinely round-trip proven in the real editor, not just the DB (T5).

**Then the colour-panel rollout started for real.** Surveyed all 49 blocks with colour attributes
(214 attrs total) via 2 parallel Sonnet agents (wave 1 — 8 blocks: accordion, audio, before-after,
brand-strip, breadcrumbs, business-info, button, countdown-timer). Hit and corrected a real
measurement bug of my own along the way (a name-substring survey undercounted several blocks —
caught, fixed, DB confirmed reliable). Verified wave 1 for real: not just "the code looks right" —
opened the live editor, clicked an actual colour swatch, confirmed the block attribute AND the
on-screen canvas both updated to the same value; opened the custom hex/RGB/HSL picker and typed a
real value; confirmed Normal/Hover track independently. 9 of 49 blocks now on the new pattern.

**Then you raised two real open questions that become next session's opening work, not
afterthoughts:** (1) have we checked which STANDARD elements each block should have colours on,
and whether any need a 3rd state beyond Normal/Hover (tabs already clearly does — active/selected
is a genuinely different thing from hover); (2) the picker should support flat-OR-gradient, and
transparency should always be available. Checked before promising anything: transparency is
already on by default (`enableAlpha: true`), the states mechanism is already N-capable (no rebuild
needed for a 3rd state), but flat/gradient choice does not exist at all today. Full detail + a
first pass of real candidates (tabs, breadcrumbs) in Track 1b plan §1.2d.

**Full narrative:** `memory/session-2026-08-14-2.md` (auto-snapshotted at session close).

## Shipped this session

| Commit | What |
|---|---|
| `f6b26866` | `sgs/social-icons` 5-fix repair (real SVG canvas preview, 4 dead attrs wired, cramped repeater restacked, migrated to `LinkPopoverField`) — T2, live-verified |
| `f2d3e519` | Rule 27 (`27-superseded-link-control`) promoted advisory→gate, 0 flagged repo-wide — T3 |
| `f9f39bb6` | First `sgs/icon` colour panel build (D609/D617) — superseded same session, see `0724853d` |
| `8546a225` | `pricing-table` `block.json` schema fix (features/highlighted mistyped, D338-class silent-discard) — T5, live round-trip proven |
| `dfc82933` | `resolveColorToken`/`iconColorValue`/`textColorValue` renamed to British spelling (11 files) |
| `0724853d` | **D618** — `sgs/icon` colour panel corrected: own `PanelBody`, not native `group="color"` slot. Bean caught the original build directly |
| `2051fbbd` | `/sgs-update` full reseed housekeeping — triggered by a false-alarm DB-staleness investigation, DB was fine all along (my own survey script had a name-substring blind spot) |
| `5ddb4879` | Colour-panel wave 1 batch 1: `accordion`, `audio`, `before-after`, `brand-strip` |
| `bd2378f4` | Colour-panel wave 1 batch 2: `breadcrumbs`, `business-info`, `button`, `countdown-timer` |

Full T1-T5 + D609/D617/D618 narrative: `decisions.md` D609/D617/D618, `.claude/plans/spec-35-control-type-contract.md` §1, `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2c-§1.2d.

## Blockers

- **None repo-wide.** Playwright MCP's browser profile got locked by contention (unclear if a
  stale leftover or a genuinely live concurrent session) — worked around by switching to Chrome
  DevTools MCP for the rest of this session's live-editor verification. Not investigated further;
  not currently blocking anything, just noting the workaround exists if it recurs.

## Open — ready to pick up

### ⭐ NEXT SESSION — colour-panel standards + rollout continuation

**Read `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d in full before starting** — it has
the corrected 49-block scope, the Track A/B split, the false-alarm DB detour (don't re-derive it),
and the wave-1 verification method (state-dispatch via `wp.data`, not UI click-navigation — faster
and more reliable for multi-block checks).

**Task 1 — Standards decisions (Bean picks, ~20 min of his time).** Three genuinely open questions,
each needs a ruling before wave 2 builds against it, or wave 2 risks rework:
1. **3rd state ("current"/"selected").** `tabs` clearly needs it (`tabActiveTextColour`/
   `tabActiveBgColour`/`tabActiveIndicatorColour` already exist as distinct attrs from hover).
   `breadcrumbs` (already migrated in wave 1) has `currentColour` as a separate single-state row —
   should that instead be a 3rd state of the `linkColour` row (Normal/Hover/Current)? The
   `DesignTokenPicker`/`SgsColourPanel` `states` array is already N-capable by design — this is a
   wiring decision per block, not a component rebuild.
2. **Flat vs gradient choice on the picker.** Genuinely not built — `DesignTokenPicker` only
   handles flat colours today. Needs a design decision on the UI shape (a mode toggle in the
   popover? auto-detect from the stored value's shape?) before building.
3. **Full per-block element/state audit — has anyone checked which STANDARD elements should have a
   colour control at all, not just which ones happen to already have one?** Not done this session
   for the 40 blocks still untouched, and only partially checked for the 9 done (icon, accordion,
   audio, before-after, brand-strip, breadcrumbs, business-info, button, countdown-timer — these
   were migrated using whatever colour attrs already existed, not audited against "what SHOULD this
   block let a client colour"). This is real, unscoped work — start by picking 2-3 representative
   blocks and manually checking their rendered output against their declared colour attrs before
   assuming the existing attr list is complete.
- Execution: ruling inline (Bean), scoping inline (Opus main thread) · Depends on: none
- Acceptance: three written rulings, each with enough detail that a dispatched agent could build
  from it without re-asking

**Task 2 — Wave 2 of the colour-panel rollout, ONCE Task 1 rules.** ~34 ordinary Track-A blocks
remain (full list in plan §1.2d) plus Track B (the shared `ContainerWrapperControls.js` wrapper,
~29-block blast radius — Bean-ruled 2026-08-14: separate session, do not fold into a batch). Same
recipe as wave 1 (D618), but incorporating whichever of Task 1's rulings apply per block (3rd
state where the block has one, flat/gradient if built by then).
- Execution: delegated, `/dispatching-parallel-agents`, Sonnet per branch (matches wave 1's
  `/delegate` routing — re-run `/delegate` rather than assuming the same model, task shape may
  differ once Task 1's rulings add scope per block) · Dispatch pattern: 2 blocks per agent minimum
  (wave 1 used 4, worked cleanly) · Depends on: Task 1 rulings · Parallel with: none (this checkout
  is shared — confirm no other session is mid-edit on the same blocks before dispatching, per
  tonight's two real collisions)
- /qc gate after: yes — the wave-1 verification method (programmatic `wp.data` state-dispatch +
  DOM assertion) plus at least ONE real click-a-swatch-see-canvas-update cycle per NEW mechanism
  introduced (3rd state, gradient toggle) — not just the first block, every genuinely new mechanism
- Acceptance: same bar as wave 1 — panel first, no `+` menu, label-unique, hover/3rd-state pairing
  correct per block, real swatch pick verified live, not just DOM structure

## State Snapshot

- **Branch:** `main`. ⛔ **This will drift immediately** — run `git log -1` AND `git status` AND
  `git branch --show-current`; do not trust this line.
- **D-ceiling:** D618 as of this write — `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE
  '[0-9]+' | sort -n | tail -1` to re-verify.
- **This checkout is SHARED with concurrent sessions — confirmed AGAIN this session, three times.**
  (1) During wave 1, a concurrent session's git operation wiped a wave-1 agent's uncommitted work
  mid-task; recovered by redoing the edits — confirmed intact in `5ddb4879`. (2) That same session's
  own pending `button/edit.js` WIP was, per Bean, fixing the old unwired colour control and is
  correctly superseded by this session's `SgsColourPanel` work, no reconciliation needed. (3) At
  handoff time: a DIFFERENT concurrent session has staged (uncommitted) work on `button`,
  `decorative-image`, `label`, `option-picker`, `quote`, `tabs`, `testimonial` — traced and confirmed
  via the plan doc: this is the "D4 nested panels" Council ruling (§1.2, Group D — a pre-existing
  item from an earlier session, unrelated to this session's T1-T5/colour-panel work) being closed
  out: 7 files/8 `ToolsPanel`-inside-`PanelBody` instances de-duplicated via a scoped CSS clip
  technique, described in the plan doc as live-verified + deployed but not yet git-committed by that
  session. **Not this session's work, not touched, not committed here** — but confirmed real,
  deliberate, and non-conflicting (that session's own note explicitly defers to this session's T4
  colour-panel commit on `button`). Don't assume `git status` clean means nothing is happening; check
  what's actually staged, and check the shared plan doc for context, before any bulk git operation.
- **Canary:** sandybrown. Every throwaway test page created this session was deleted after use
  (2414, 2418, 2420, 2421, 2422, 2423, 2429, 2431 — none left live).
- **Playwright MCP browser lock:** hit a "Browser is already in use" error late in the session,
  unresolved cause (stale profile lock vs genuine contention). Chrome DevTools MCP
  (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) worked as a substitute — same live-editor
  verification capability, different tool surface (`take_snapshot`/`click`/`fill`/`evaluate_script`
  instead of Playwright's equivalents). Worth trying Playwright first next session; fall back to
  Chrome DevTools MCP if the lock recurs rather than force-killing chrome.exe processes on a shared
  machine.

## Gates that EARNED their keep this session (do not weaken them)

- **The live-editor verification bar itself** — Bean directly caught two places where a
  DOM-structure check was being treated as sufficient when it wasn't: (1) the first `sgs/icon`
  colour panel passed structural checks while being mounted inside WordPress's own native panel,
  not a real defect the DOM alone would have caught without knowing WHICH slot was used; (2) wave
  1's first Playwright pass confirmed panel structure but not that a real colour pick actually
  applies — Bean explicitly named "the full native control... popover and colour picker" as the
  bar, and it took a second pass (swatch click → attribute → canvas, custom hex picker, hover-state
  independence) to actually clear it.
- **The shared-checkout discipline (commit-by-exact-path, never `git add -A`, verify branch in the
  same command)** — caught zero incidents FOR this session's own commits, but the reason two other
  sessions' concurrent work stayed recoverable/undamaged is that this session never used a broad
  git operation that could have swept up their staged files.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour-panel rollout — full scope, Track A/B split, wave 1 detail, next-session standards work | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2c-§1.2d |
| D609/D617/D618 — the colour-control architecture decisions | `decisions.md` |
| Uniformity-thread T1-T5 orchestration (this session's opening work) | `~/.claude/memory/session-2026-08-14.md` (rotated snapshot — the plan was recovered from here) |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, link §2) | `.claude/plans/spec-35-control-type-contract.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design
  decision each. `image-sequence` is the standing (non-blocking) `check-image-controls-support`
  finding.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5) — not tracked in
  parking.md (Bean: not approved for parking, will be built properly when that track is reached).
- **Colour-panel Track B** (shared `ContainerWrapperControls.js` wrapper — container, cta-section,
  hero, trust-bar, site-header, site-footer) — Bean-ruled: separate session, after Track A settles.
