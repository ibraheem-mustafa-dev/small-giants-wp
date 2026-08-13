---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-13
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

⚠ **TWO CONCURRENT SESSIONS 2026-08-13** — this block + "uniformity thread" below are BOTH newest.

**2026-08-13 (latest session, part 8, same thread). You asked for an honest second look at part
7's work before trusting it — ran 4 independent reviewers, found one real bug, fixed it, and
built the thing part 6's session had already flagged as a good next step.** Commits
`a96a491a`–`7265a066`, decision D614.

- **One real bug found and fixed**: 5 colour pickers (an audio player's accent colour, social
  icons, a pricing table's buy-button colours, a modal's background, a nav-drawer's close-icon
  colour) used the WRONG internal helper to turn a stored colour into real CSS — one that only
  works for a small preset palette name, not a colour the client picks freely. The moment a
  client picked ANY custom colour, it would have silently vanished in the editor (still worked
  correctly once published — this was an editor-preview-only bug, the exact kind this whole
  project was closing). Fixed, live-tested with real custom colours this time, confirmed working.
- **A second smaller bug found in the same review**: a pricing table's "Get started" button now
  always shows in the editor preview, even for a plan where that button is meant to be hidden.
  Fixed to match the real published-page rule.
- **The independent reviewers also double-checked the harder question — is the remaining pile of
  75 flagged items genuinely fine to leave, or hiding real bugs?** Sampled 16 by hand, reading the
  actual code for each. 13 have a solid, provable reason (things like "only visible on hover",
  "only exists during audio playback", "needs a live product/API the editor doesn't have"). None
  of the 16 should be reopened as a bug. One item (a nav-drawer submenu setting) is correctly
  inactive today but will become a real gap once a later feature ships — flagged so it isn't
  forgotten, not treated as a problem now.
- **Then you asked for the detector itself to be taught to recognise that "needs live data"
  shape automatically**, instead of leaving it as something a human has to remember every time.
  Built it — checked two real, provable facts about each block (does the server code fetch live
  data from WooCommerce/an API, and does the editor's own preview code admit it's just a
  placeholder) rather than hardcoding a list of block names. Caught and fixed two real bugs in
  the new check itself while building it, both proven against the actual code before shipping,
  not assumed to work.
- **Net result: the flagged-issues count is now 143 → 54** — the drop from 75 is 21 issues the
  detector now understands and correctly skips on its own, not issues that were ignored.

**2026-08-13 (uniformity thread — a SEPARATE, concurrent session, not this one). One link control
everywhere; colour control rebuilt from core's own source.** Commits `802ceeec` + `e073ca42`,
rebased over the other thread's seven. Full narrative: `memory/session-2026-08-13-swept-parts-4-5.md`.
⚠ Open, unruled per that session's own note: core conveys "2 states" by overlapping swatches; Bean
originally asked for a count badge.

**2026-08-13 (latest session, part 7 — new thread). Fixed and shipped the ENTIRE 70-item "editor
preview doesn't match what the client actually gets" backlog from part 4/5's triage. All 70
closed — 69 fixed, 1 deleted as genuinely dead.** Commits `c67660e9`–`1f7d9bb8`, decision D613.
Ran the whole thing in an isolated copy of the repo (a "worktree") specifically so it couldn't
collide with the other work already in progress on this shared checkout — and it didn't need
to: the other track's changes were never pushed, so merging back was a clean, automatic join
with nothing to reconcile.

- **The top-priority bug (heading "inherit style" toggle) is fixed and confirmed working live** —
  toggling it now correctly hides the background/border in the editor exactly like the published
  page already did, instead of showing the opposite.
- **47 more settings across 16 blocks** now show their effect in the editor the moment the client
  changes them, instead of only appearing after publishing — colours, spacing, borders, shadows,
  a badge grid's layout, and more.
- **9 more settings needed a genuinely new piece of the editor preview built, not just a colour
  fix** — a form's submit button, a pricing table's billing switch and buy button, a table of
  contents that can now collapse in the editor the same way it does live, a testimonial's
  review-date/source line, and a text block's drop-cap letter. All built and confirmed working
  live. The drop-cap needed a small styling-file change your project's own automatic safety check
  wanted photographic proof for — that proof-building tool is built for a different, bigger kind
  of change, so this went through with your sign-off instead of forcing a mismatched tool to fit.
- **2 settings turned out to be more subtle than they looked**, and the fix would have been wrong
  if built from the setting's name alone: a hero section's inner padding only applies to ONE of
  its two layouts (not both, as assumed), and a trust-bar's column count isn't actually what
  controls the columns on the real page — a different, related setting quietly wins. Both traced
  to the real mechanism and fixed to match; both confirmed working live.
- **1 setting turned out to do nothing at all, anywhere** — a button's icon-gap control wrote a
  value nothing ever reads, on the published page or in the editor. Deleted the control rather
  than building a preview for something that never worked, so nothing is left half-fixed.
- **Net result: from 143 flagged issues down to 75** — every one of the remaining 75 is either
  correctly non-visual (hover effects, scroll animations — can't show on a still screen) or a
  different, already-understood shape (2 blocks needing live data the editor can't have). Ran
  `/qc-council` afterwards to stress-test that claim rather than take the detector's word for it
  — see below.

**2026-08-13 (parts 4-6, earlier session, swept to memory).** DB role-classifier remediation
closed (479 blank labels to 0, self-fixing rules not hand-patches), a 6-persona adversarial
council on two follow-on ideas (both correctly parked -- no fidelity impact), and the original
editor-render-parity triage that produced the 70-item REAL-GAP backlog part 7/8 closed above.
Commits `f4153da4`-`56b41a7e`, decisions D603-D612.

**2026-08-13 (parts 1-3, earlier session, swept to memory).** Hero split-image bleed close-out,
hero editor spot-check fixes, hero Ken-Burns/parallax pair + per-device SVG/media cascade fix,
plus the session-wide false-negative postmortem (truncated grep, stale element handle, etc.) and
the render-helpers.php fatal-in-waiting catch. Full narrative (both sets): `memory/session-2026-08-13.md`.

## Shipped this session

| Commit | What |
|---|---|
| `7265a066` | editor-render-parity: Signal 4 — auto-classify live-external-data placeholders (buybox/google-reviews), 21 findings now correctly auto-excluded (D614, `[gates-ok:...]` — F5 hook resolves the wrong worktree, verified clean directly) |
| `a96a491a` | editor-render-parity: colour-resolver bug in 5 blocks + a pricing-table CTA gating bug, both found by `/qc-council` (D614) |
| `1f7d9bb8` | editor-render-parity: `sgs/text` drop-cap `::first-letter` preview, the last Batch 2 block (D613, `--no-verify` authorised) |
| `9947a9db` | editor-render-parity: `sgs/button.iconGap` deleted — confirmed dead on both sides (D613, `--no-verify` authorised) |
| `efde6044` | editor-render-parity Batch 3: `sgs/hero.contentBandPadding` + `sgs/trust-bar.columns`, both re-derived past the triage's name-shaped assumption (D613) |
| `b36b8f42` | editor-render-parity Batch 2 (4/5 blocks): `sgs/form`/`sgs/pricing-table`/`sgs/table-of-contents`/`sgs/testimonial` new preview markup (D613) |
| `3765eab0` | editor-render-parity Batch 1: 16 blocks, 47 mechanical CSS-mirror fixes (D613) |
| `c67660e9` | editor-render-parity Priority 0: `sgs/heading.inheritStyle` inverted-direction bug fixed + live-verified (D613) |
| `e83af367` | chore: regenerated stale `generated-fx-qualifying-blocks` artefact (pre-existing drift, unblocked `npm run build`) |
| `56b41a7e` | 3 JSON-LD role fixes found by adversarial-council follow-up measurement (`schemaItemName`/`showSchema`/`schemaReviewCount`) (D612) |
| `5170859c` | DB role remediation part 2 CLOSED: 479 → 0 `role IS NULL` rows. TIER 3.19/3.41 + 121-row investigated override pass + `dragToScroll` fx-registry fix (D611) |
| `b3107413` | `assign-canonical.py` TIER 3.18: `source='native_wp'` rows seed to `role='core'` (D611) |
| (pending) | `assign-canonical.py` TIER 3.17: `fx:*` namespace styling bug fixed at source, self-correcting (D610) |
| `3267384f` | 4 more `fx:*` attrs found + fixed by `/qc-council` re-checking D604 structurally (D607) |
| `9d827d63` | editor-render-parity: cross-file blind spot resolved (152→143), 13 DB `role` fixes (D603/D604) |
| `9b8511cf` | `sgs/hero`: split media gets its own Ken-Burns/parallax pair, D596's bgParallax/Ken-Burns questions answered, global `@keyframes` collision fixed (D597) |
| `3170943a` | `sgs/hero`: `splitImageBleed` tested (not dead), defaulted to full-bleed (D600) |
| `beab47a4` | `sgs/hero`: bleed extended to reach video/SVG tiers, not just image (D600) |

## Blockers

- **None repo-wide.**

## Open — ready to pick up

- **editor-render-parity Phase 2 — FULLY CLOSED + independently reviewed (D613 + D614).** 9
  commits `c67660e9`→`7265a066` on `main`, live-verified on sandybrown after every batch (not
  detector-only), THEN a 4-rater `/qc-council` re-derived everything from current code rather
  than trusting the commit messages. Full evidence: `.claude/reports/2026-08-13-editor-render-
  parity-fresh-triage.md` + D605/D613/D614.
  - `sgs/text` (5 first-letter/drop-cap attrs) — fixed, detector-verified, live-verified,
    committed (`1f7d9bb8`, `--no-verify` authorised — see D613 for why).
  - `sgs/button.iconGap` — confirmed dead on BOTH sides, deleted rather than fixed (`9947a9db`,
    `--no-verify` authorised — see D613).
  - `/qc-council` found + fixed a real bug: 5 colour pickers used the wrong resolver, silently
    dropping any custom (non-default) colour in the editor preview (`a96a491a`). Also fixed a
    pricing-table CTA gating bug in the same commit. Live-verified with real custom colours.
  - Signal 4 built (`7265a066`): the detector now auto-classifies the 21 buybox/google-reviews
    "needs live data" findings structurally, no hardcoded allowlist.
  - **Still open, flagged not fixed:** `sgs/modal.triggerColour`/`triggerBackground` and
    `sgs/nav-drawer.drawerBg` likely carry the IDENTICAL colourVar()-on-a-raw-value bug as the 5
    just fixed — pre-existing, not part of this session's diff, deliberately not touched while
    fixing something else. Worth a dedicated small pass.
  - **Cosmetic, not functional:** 3 auxiliary manifest/classification JSON files
    (`scripts/behavioural-analyser/css-property-classifications.json`,
    `scripts/consistency/attr-role-map.json`, `scripts/consistency/setting-types.json`) still
    reference the deleted `sgs/button.iconGap` attribute. A `/sgs-update` pass would resync them.
  - `sgs/nav-drawer.submenuModel` — correctly INTERACTION-ONLY today (dormant on both surfaces,
    per render.php's own "Phase-1-inert" comment), but will become a real editor-render-parity
    gap the moment Phase-2 submenus ship. Nothing currently tracks that trigger — needs a parking
    entry or a comment near the Phase-2 submenu work itself once that's scheduled.
  - `sgs/audio.spectrumColour` — surfaced mid-Batch-1 as the same shape as the `accentColour` fix
    (custom-property-only, no `editor.css` consumer) but genuinely un-fixable the simple way — it
    feeds a live `AnalyserNode` canvas draw loop, categorically un-previewable statically.
    Reconfirmed correct by `/qc-council`. Not part of the closed backlog (never was REAL-GAP).

### ⭐ NEXT SESSION — the uniformity thread's orchestration plan (2026-08-13)

**State recap, plain English.** A block's inspector is the sidebar of settings a client uses. Two
programmes are converging on it: the **uniformity report** (make the same property behave identically
on every block) and **Track 1b** (make the enforcement structural, not remembered). Today the LINK
control was standardised across 11 blocks + the whole-card-link extension and gated (rule 27), and the
COLOUR control was rebuilt from WordPress core's own source. Both landed on `main`. Neither programme
is finished, and the plan doc that governs Track 1b does not yet contain the report's work at all.

**T1 — Fold the report's work into the Track 1b plan, and strike the 9 stale entries.**
Bean approved this and it has not been done. `~/.claude/plans/go-track-1b-playful-hamster.md` has no
rows for any report-derived work, and carries 9 identified stale entries (G3 closed; W1-a's A3 done;
W1-e dangerous as written; §3.3's `BorderBoxControl` row superseded; C4 reads open under a CLOSED
banner; §1.2's counts; Wave 0 formatted as a work list; D3 resolved by C5).
· Execution: **inline** (DOCS cluster is main-thread-only, and two sessions share this checkout)
· Depends on: none · Parallel with: none · /qc gate after: no (doc-only)
· **Acceptance:** every report-derived item appears as a plan row, and re-reading §2.7/G3/G4/W1-e
finds nothing that would misdirect a fresh session. Est. 30 min.

**T2 — `sgs/social-icons` repair (5 fixes, one job).** Queued deliberately; Bean called its inspector
"horrendous" and sent a screenshot. It is NOT a control swap: (1) the editor canvas prints the platform
SLUG where `render.php` draws a Lucide SVG (`edit.js:343-352` vs `render.php:438-439`); (2) style
variants (`filled`/`outlined`/`pill`) clip that text away, which is why picking one makes the icon
"disappear"; (3) four attributes never reach the canvas (`iconColour`, `iconColourHover`, `colourMode`,
`gap`); (4) the repeater lays controls out horizontally in a 248px panel so each gets ~110px, and its
help text runs six wrapped lines; (5) it is the last block on the superseded `SgsLinkControl`.
· Execution: **delegated**, Sonnet via `/delegate` · single agent (all five touch one block)
· Brief: fix the canvas to share `render.php`'s icon resolution, make variants + the four attributes
apply in the canvas, stack the repeater item's controls full-width, then migrate the link control.
· Context it needs: rule 27's backlog is 7→1 and this is the 1; `check-editor-render-parity.js`
already flags the four attributes; the other thread closed its own 70-item parity backlog, so do not
re-triage that. · Depends on: none · /qc gate after: **yes** — `/qc-inline`, live editor + frontend
· **Acceptance:** the icon renders as an SVG in the canvas at every style variant, all four attributes
visibly affect the preview, rule 27 reports **0 flagged**, and Bean's eye passes it (R-31-13). Est. 1 h.

**T3 — Rule 27 promotion.** Once T2 lands, flip `27-superseded-link-control` from advisory to `gate`.
Its promotion trigger is already recorded in `rules.json`: 0 FLAGGED on a live run.
· Execution: inline · Depends on: **T2** · /qc gate after: no
· **Acceptance:** `rules.json` reads `"mode": "gate"`, a live run reports 0, and a deliberately
reintroduced `<SgsLinkControl>` fails the build (proven, then reverted). Est. 10 min.

**T4 — Colour control: close the one open ruling, then finish the panel.** Core conveys "2 states" by
overlapping swatches (`ZStack`, `global-styles/color-panel.js:163-176`); Bean originally asked for a
count badge. **Unruled — ask before building.** Then the remaining piece of D609's amended intent: the
grouped Colour panel at the top of Styles that replaces native's.
· Execution: ruling **inline** (Bean picks), build **delegated** Sonnet
· Depends on: the ruling · /qc gate after: yes — `/qc-inline`
· **Acceptance:** rows grouped in one panel at the top of Styles; the visible label renders **exactly
once** (asserted, with a positive control proving the counter can return ≠1). Est. 45 min after ruling.

**T5 — `pricing-table/block.json` schema bug.** Found in passing, unrelated to links, live today:
`plans.items.properties.features` is declared `"string"` but holds an array, and `.highlighted` is
declared `"string"` but holds a boolean. Supplying correct types makes WP silently revert the WHOLE
`plans` array to its default — the D338 silent-discard class.
· Execution: delegated, Haiku · Depends on: none · /qc gate after: yes — stored-content round-trip
· **Acceptance:** types corrected AND a live round-trip proves an existing `plans` array survives a
save/reload unchanged. Est. 20 min.

```
T1 (inline, docs) ──┐
T5 (haiku)  ────────┤  all independent, run in parallel
T2 (sonnet) ────────┘
      ↓ /qc-inline
T3 (inline, gate promotion — needs T2)
T4 (ruling first, then sonnet)
```

**Methodology guardrails — earned today, do not skip**
- ⛔ **Assert label UNIQUENESS on any inspector control change**, with a positive control proving the
  counter can return ≠1. Today's colour control shipped the duplicate-label defect that 9 sites were
  fixed for that morning, through a 7-point check that never counted labels.
- ⛔ **A zero from a check you wrote is not an absence.** A probe called the colour control "missing"
  on a wrong selector; the code was in the deployed bundle. Prove detectability before believing gone.
- ⛔ **Source-text counts ≠ render counts.** `grep -c '<Component'` returns 1 for a component mounted
  once per repeater row inside a child. That error caused a wrong scoping decision.
- ⛔ **Fact-check your own tool output as hard as a subagent's.** Four claims today rested on misread
  output of my own commands, incl. attributing one check's summary line to another's.
- ⛔ **Never run parallel agents against one canary browser session** — two hijacked each other's tab.
- ⛔ **`--allow-dirty` deploys the WHOLE tree.** Used 3× today because nothing was committed; each
  time it pushed another track's in-flight work live. Commit first, then deploy.

- **DB `role`-column remediation part 2 — CLOSED (D611); both flagged follow-ons COUNCILLED,
  PARKED with a revised premise (D612).** 479 `role IS NULL` rows → 0. Both follow-ons killed/
  redirected on evidence, not risk — full 6-persona verdicts + the `56b41a7e` JSON-LD fixes:
  `decisions.md` D611-D612.
- **editor-render-parity Signal 4 — BUILT + SHIPPED (D614, `7265a066`).** The D605 candidate (21 of
  23 OTHER-SHAPE findings sharing a live-data-placeholder shape, `sgs/buybox` + `sgs/google-reviews`)
  is now a real structural detector signal, not a documented-but-undetected pattern. See D614.
- **Check A promotion to gate mode: ready to decide, still not decided (deliberately — this is a
  Bean decision, not an automatic next step).** All 70 REAL-GAP findings are closed on `main`, a
  4-rater `/qc-council` independently re-checked the fix quality AND the remaining findings'
  classifications (D614 — 0 reopened as REAL-GAP), and Signal 4 (the one gap named in D605) is
  now built and shipped. This project's own E6-point-9 doctrine (never promote on the run that
  introduces/changes a rule) is satisfied — Signal 4 shipped this session, so THIS clean run
  doesn't count; the NEXT clean run does. Revisit at the next session that touches this detector.
- **Hero: all three Track 1b carried-forward items now closed** (stray toolbar button gone;
  split-media child-block idea DROPPED by Bean D599; split-image bleed CSS fixed + extended to
  video/SVG D600). Detail: `memory/session-2026-08-13.md`.
- **NEW this session, not caused by it:** `db-consistency` Check #1/#8 flags `sgs/hero`'s
  `mediaOverlayGradientAngle`/`From`/`To` (from `89857e39`) as routing-ambiguous — all 3 resolve to
  `background-image` on the same element/state/tier with no distinguishing mechanism, so the clone
  resolver picks one by rowid order. First surfaced by this session's `/sgs-update` reseed (this is
  the first run since `89857e39` shipped), not something this session's hero-effect-toggle work
  touched. Bypassed via `[gates-ok:...]` on the doc-only commit rather than scope-creeping a fix in.
  Needs its own small session: give each attr a distinguishing `css_element`/`css_state`/`css_tier`,
  or restructure however the SECTION's own `overlayGradient*` trio avoids the same collision.
- **`sgs/container` background pickers — the tier-OBJECT question is NOT open.** ⛔ Do NOT "finish"
  the migration by folding `backgroundImage`/`Tablet`/`Mobile` into a tier object. That flat suffix
  triple is load-bearing for the cloning pipeline: `test_family_modifier_scan.py:111-116` asserts the
  lift lands on `backgroundImageMobile` and explicitly NOT on `backgroundImage`, and the triple is
  registered in the DB across 7 blocks. Only the CONTROL was migrated, deliberately.
- **`inspector-scan` rule 26 — 2 findings are a DETECTOR bug, not debt.** Both are the new container
  controls, flagged `hollow-tier` because their desktop branch returns explanatory text. That IS the
  canonical `media/edit.js:236` pattern; the rule cannot see it because its corpus is
  `*/components/*.js` + `extensions/*.js`, never `*/edit.js`. Fix the detector; do NOT baseline it,
  and do NOT "fix" the controls — that reintroduces a UX defect (see D596).
- **Track 1b's own open register** — re-derive from `go-track-1b-playful-hamster.md` directly; never
  carry forward a total quoted here or there without recounting the rows.

## State Snapshot

- **Branch:** `main`, HEAD `7265a066`. ⛔ **This will drift immediately** — run `git log -1` AND
  `git status` AND `git branch --show-current`; do not trust this line.
- **Part 7 ran entirely in an isolated worktree** (`EnterWorktree`, branch
  `worktree-editor-render-parity-phase2`) specifically to avoid the shared checkout's concurrent
  `sgs/icon`/`DesignTokenPicker` edits (still uncommitted there as of this write — see part 6's
  note below, unchanged). The worktree branch merged back to `main` as a clean fast-forward
  (`origin/main` had not moved since the worktree branched — the other track's work was never
  pushed), so no reconciliation was needed. That worktree still exists on disk with `sgs/text`'s
  uncommitted fix — do not delete it until that commit lands.
- **This checkout is SHARED with concurrent sessions — proven AGAIN this session (part 6).** A
  growing set of button/icon/media/product-card/DesignTokenPicker edits appeared mid-session from
  another track, unrelated to the role-classifier work — never touched. Commit by EXACT PATH
  (`git commit -- <paths>`); a path-scoped-commit gate now enforces this. Before treating another
  session's uncommitted work as abandoned, check for live git activity.
- **Deploy deadlock-breaker:** `build-deploy.py --payload <prefix>` lets you deploy your own
  uncommitted payload while another track's dirty files still (correctly) block. Used repeatedly this
  session — no `--allow-dirty`, no hand-rolled tar.
- **Canary:** sandybrown. Probe pages created part 7, all deleted after use: 2392 (heading
  inheritStyle), 2397 (Batch 1: quote/mega-aside/button), 2400 (Batch 2: text/toc/form), 2403
  (Batch 3: hero band/trust-bar grid). Earlier probe pages **2332**/**2334**/**2337** (part 6 and
  before) — delete when no longer useful. Page 2294 (leftover D594 QC draft) was TRASHED on Bean's
  instruction — it was blocking `oldshape-audit`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (was **614** at this write) · `git merge-base --is-ancestor <claimed-commit> HEAD` before trusting
  any "SHIPPED" claim here or in `decisions.md`.

## Gates that EARNED their keep this session (do not weaken them)

- **`oldshape-audit` ABORTED a deploy** over one stranded attribute on one draft page. It is what
  stands between removing an attribute and silently deleting stored content on next save (D338).
- **The visual-diff gate refused a STALE report** — it recomputes the staged hash, so a same-day
  report describing older bytes is rejected (D520). It reads ONLY `<block>-<date>.md`; a second
  report file does not satisfy it.
- **The path-scoped-commit gate** refused a bare `git commit` while two tracks shared `main`.
- `--no-verify` was used exactly ONCE, with Bean's explicit authorisation, bypassing ONLY the
  visual-diff gate; every other gate in that run passed and is recorded in the commit message.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| This session's plan + council verdict | `~/.claude/plans/hero-effect-toggles-give-eager-karp.md` |
| Prior session's plan + council verdict | `~/.claude/plans/is-the-sgs-media-block-iterative-stonebraker.md` |
| Governing programme plan (Track 1b) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| Visual-diff evidence (media / container / hero) | `reports/visual-diff/{media,container,hero}-2026-08-13.md` (hero + container re-measured this session) |
| THE GOVERNING SPEC for per-device media | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` Part D5 |
| Decisions | `decisions.md` — **D614** is newest as of this write; re-verify |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design decision
  each. `image-sequence` is the standing (non-blocking) `check-image-controls-support` finding.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`cta-section` / `trust-bar`** also host the shared `BackgroundPanel` changed at `efa2f0be`; they
  were not individually opened in the editor. Low risk (UI-only change) but unverified.
