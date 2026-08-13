---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-14
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-13/14. Closed out the editor-preview-parity backlog for good, then merged a real
feature.** Prior sessions left two colour pickers with the same slug-vs-raw-value bug already
found and fixed elsewhere (modal + nav-drawer). Fixed both, live-verified with real custom
colours. Then re-synced 3 stale manifest files that still mentioned a deleted button attribute
(root cause was one level deeper than that — a ghost database row nothing had pruned; fixed the
DB, the files regenerated clean). Then built a real accordion/drill-down submenu for the mobile
nav drawer (a setting that used to do nothing) — dispatched to a subagent, merged straight to
`main` on your call. Then the main event: you asked for the editor-preview-mismatch detector
itself to be made 100% accurate and every finding investigated. Dispatched 4 parallel
investigations across all 26 flagged blocks. Net result: **the detector's own findings count went
from 50 down to 0** — 9 real client-facing preview bugs fixed (live-verified each one), 8 real
bugs in the detector's own logic fixed (proven against real code, not guessed), 31 remaining
findings confirmed genuinely non-visual and documented with a specific reason each. Tried building
2 new automatic-classification rules to replace 3 of those manual entries; one turned out unsafe
(couldn't tell "can't preview" from "nobody's built the preview yet" — caught by the detector's
own test suite before it shipped) so it was reverted rather than pushed through. Full commit list
below; full narrative: `memory/session-2026-08-14.md` (auto-snapshotted at session close).

**Prior concurrent-session work (2026-08-13, swept to memory, not re-narrated here):** the
"uniformity thread" (link control standardised across 11 blocks, colour control rebuilt from
WordPress core's own source) and an earlier editor-render-parity closure pass (70 items, D613)
plus its `/qc-council` review (D614, 5 more colour-picker fixes + Signal 4 built). Neither thread
is this session's to re-summarise — see `memory/session-2026-08-13*.md` for their own narratives.
The uniformity thread's own next-step plan (T1-T5) was NOT touched this session — re-derive its
live status from `~/.claude/plans/go-track-1b-playful-hamster.md` directly, do not trust any count
quoted about it here or in a prior LEDGER snapshot.

## Shipped this session

| Commit | What |
|---|---|
| `c23412b0` | `sgs/nav-drawer.closeStyle` real editor preview (3-way icon/text/burger-morph, was always showing the × regardless); `animateFrom` baselined (D615) |
| `ed0761b8` | merge: nav-drawer real accordion + drill-down submenu, direct to `main` per Bean's call (D616) |
| `84673bcf` | (on the merged branch) `sgs/nav-drawer`/`sgs/nav-menu`: real nested submenu build, FR-36-6 |
| `7b0fd2b6` | `sgs/accordion.defaultOpen` real editor preview (mirrors `sgs/tab`'s index-context pattern), live-verified |
| `327d97e7` | `sgs/form.submitColour`/`submitBackground`/`progressBarColour` real editor preview — surfaced by the detector fixes below, not there before |
| `586e6524` | 8 real bugs fixed in `check-editor-render-parity.js` itself (comment-mask contamination, multi-attr/2-hop derivation, bare-concat-after-dot CSS sink, 2 type-cast regex gaps, function-wrapped attribute reads); 21 findings baselined with a specific reason each (D615) |
| `df8573ac` | `sgs/testimonial.ratingSize` + `sgs/table-of-contents.activeLinkColour` real editor preview |
| `3e86f696` | `sgs/modal.overlayColour`/`overlayOpacity`, `sgs/mega-panel.viewAllPlacement`, `sgs/product-faq-item.isOpen` real editor preview |
| `6e82ae9c` | `sgs/collapsible-text.collapsedLines` real editor preview (line-clamp) |
| `d5baa113` | D615/D616 recorded; `P-NAV-DRAWER-MEGA-MENU-INLINE` parked; 4 untracked ledger-rotate snapshots swept in |
| `f4ac832d` | `sgs/button.iconGap` ghost DB row pruned (root cause of the 3 stale manifests); manifests regenerated clean |
| `c5501395` | `sgs/modal.triggerColour`/`triggerBackground` + `sgs/nav-drawer.drawerBg` colourVar()→resolveColorToken() fix, live-verified with real custom colours |

## Blockers

- **None repo-wide.**

## Open — ready to pick up

- **Check A (`check-editor-render-parity.js`) is at 0 net-new findings — stays advisory, deliberately
  not promoted to a build-blocking gate.** This session rewrote 8 pieces of the detector's own
  logic; this project's own doctrine is never promote a detector on the run that changed it.
  Promote on the NEXT session that runs it untouched and still gets 0. Bean confirmed 2026-08-14:
  keep it advisory for now.
- **`P-NAV-DRAWER-MEGA-MENU-INLINE`** (parking.md) — a mega-menu item inside the drawer still
  degrades to a plain link instead of rendering its panel inline (FR-36-5). Needs its own
  design-gated session (shared render surface, `sgs/nav-menu`) — do not rush it.
- **2 candidate detector signals considered, not built** — a "no-ServerSideRender + no-CSS-mirror"
  block-wide exemption (built, then REVERTED — unsafe, see decisions.md D615/D616 commit message
  and the captured lesson `an-exemption-heuristic-needs-a-negative-control-proving-it-doesnt-
  overmatch`) and a "body-class-consumption" signal for `sgs/site-header.contrastSafe` (assessed,
  not built — turned out to be a WordPress hook-based side-channel with zero trace in `render.php`
  at all, a harder shape than the existing cross-file-consumption blind spot). Both attributes
  (`headerShrink`/`headerHideOnScroll`/`contrastSafe`) stay correctly hand-verified baseline
  entries in `editor-render-parity-baseline.json`. Revisit only if this shape recurs on another
  block at real volume — per this project's own stated preference for hand-baselining over
  building a detector generalisation for n=1-3.
- **Uniformity thread (Track 1b) — untouched this session, re-derive live status from
  `~/.claude/plans/go-track-1b-playful-hamster.md` directly.** Do not trust a T1-T5 summary carried
  in a prior LEDGER snapshot — it predates this session and its own state may have moved.

## State Snapshot

- **Branch:** `main`, HEAD `c23412b0`. ⛔ **This will drift immediately** — run `git log -1` AND
  `git status` AND `git branch --show-current`; do not trust this line.
- **D-ceiling:** D616 as of this write — `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE
  '[0-9]+' | sort -n | tail -1` to re-verify.
- **This checkout is SHARED with concurrent sessions — confirmed again this session.** Local `main`
  was found behind `origin/main` mid-session (another track's worktree-merge had already landed on
  origin). Fetch + rebase before pushing; never assume local HEAD is current. Commit by EXACT PATH
  (`git commit -- <paths>`) — the path-scoped-commit gate enforces this on a bare `git commit`.
- **Deploy deadlock-breaker used repeatedly:** `build-deploy.py --payload <prefix>` to canary-deploy
  uncommitted work for live verification BEFORE the commit that needs a visual-diff report exists.
  No `--allow-dirty`, no hand-rolled tar.
- **Visual-diff report gotcha (cost real time this session):** `source_sha` in a report's
  frontmatter must be the output of `python plugins/sgs-blocks/scripts/visual-report-sha.py
  <block>` run against the STAGED content — NOT a git commit hash. The gate recomputes and rejects
  a mismatch with the exact expected value in its error text; read it rather than guessing.
- **Canary:** sandybrown. All probe pages created this session were deleted after use (2407, 2411,
  2412 — none left live).
- **`.claude/worktrees/editor-render-parity-phase2` on disk but git-deregistered.** Fully merged
  (`fc54db55` confirmed ancestor of `main`), `git worktree remove` succeeded at the git level, but
  the directory itself is stuck on disk behind a stray locked file (one of several leftover
  `node.exe` watcher processes on this machine, unrelated to this session). Harmless — just
  disk clutter. Clear with a reboot or `taskkill` the stray node processes first.

## Gates that EARNED their keep this session (do not weaken them)

- **The path-scoped-commit gate** caught a bare `git commit -m` twice this session (no `-- <paths>`)
  — both were genuine mistakes, not deliberate bypasses.
- **The visual-diff gate's staged-content-hash check** refused two reports twice in a row for
  carrying the wrong `source_sha` (a git commit hash instead of the block's content hash) — exactly
  what it exists to catch, per its own D520 design note.
- **Check A's own self-test suite (specifically its Signal 1 negative control)** caught a real
  design flaw in a NEW signal before it shipped — an over-broad exemption heuristic that would have
  masked genuine future bugs on any block matching its shape by coincidence, not just the one
  observed case it was built from.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| This session's detector-accuracy work | `decisions.md` D615 |
| This session's nav-drawer submenu merge | `decisions.md` D616 |
| Governing programme plan (Track 1b, untouched this session) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| THE GOVERNING SPEC for per-device media | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` Part D5 |
| Nav navigation system spec (FR-36-6 submenu, FR-36-5 mega-menu-in-drawer parked) | `specs/36-SGS-NAVIGATION-SYSTEM.md` |
| Check A detector + its own docstring (4 signals + this session's fixes) | `plugins/sgs-blocks/scripts/check-editor-render-parity.js` |
| Decisions | `decisions.md` — **D616** is newest as of this write; re-verify |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design decision
  each. `image-sequence` is the standing (non-blocking) `check-image-controls-support` finding.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`cta-section` / `trust-bar`** also host the shared `BackgroundPanel` changed at `efa2f0be`; they
  were not individually opened in the editor. Low risk (UI-only change) but unverified.
