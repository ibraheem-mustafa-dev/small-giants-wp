---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-13
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-13. Hero block cleanup — dead variants + dead controls removed, verified live, shipped.**
Removed the `video`/`svg-animated` hero variants (the shared Background panel already covers
video/SVG on every variant, so a dedicated variant was a duplicate) and three confirmed-dead
inspector controls (message-only "Buttons" panel, native text colour that could never reach the
child heading/sub-headline blocks, native Dimensions panel duplicating the custom responsive
Padding & margin panel). Everything verified live on sandybrown, not just read in code: legacy
content still carrying the retired variant renders identically (WordPress coerces the invalid enum
to default), the padding/margin round-trip survives with native spacing support removed, and the
block inserter no longer offers the two dead variant options. One real gap the first cleanup pass
missed was caught by re-testing live: `sgs-hero-variations.php` still advertised "Video Background
Hero"/"Animated SVG Hero" as insertable options — fixed, redeployed, re-verified. Content-griditem
and media-griditem padding controls were checked on request and are genuinely fine (different
elements, not duplicates) — confirmed with real values on the live frontend, including the case
where no media is selected yet (the media wrapper simply doesn't render, by design). Commit
`a941dba9`, merged and pushed to `main`.

**Split-media → `sgs/media` child block — NOT attempted a third time this session, on purpose.**
Bean asked how to replace hero's raw scalar-attr image/video with a real `sgs/media` InnerBlocks
child. This has been tried and reverted TWICE already today (D591, D594) — same root symptom both
times. Server-side partitioning (render.php sorting InnerBlocks children by block name into two
wrapper divs) is proven to work; the unsolved half is the EDITOR CANVAS, which gives a block exactly
one InnerBlocks list with no client-side equivalent of server-side partitioning, and Bean has
explicitly ruled out a second dedicated InnerBlocks slot for media. Full history surfaced to Bean
before any new attempt; he asked to commit the confirmed cleanup work first rather than open a third
attempt this session. **Not resumed. Do not attempt without a concrete new idea for the editor-canvas
half specifically** — see `decisions.md` D594 for the exact diagnosis.

**A "stopped" session turned out not to be stopped — worth remembering.** Bean asked me to clean up
what he believed was orphaned uncommitted work in the `t1-t3-t4-mechanical` worktree (site-header
friction fixes, multi-button spacing fix, gridItemPadding tier-object consistency — all real,
well-documented Track 1b work). While investigating, that worktree committed 5 times in real time
in front of me — it was actively running the whole time, not stopped. No collision, no work lost
(git's index.lock serialised us correctly), but the lesson stands: **a shared-worktree session being
quiet is not evidence it has stopped — check for live git activity (recent commits, a fresh
index.lock, a running git.exe) before treating uncommitted state as abandoned.** That work is now
merged to `main` (`81c33610`) — see "Other tracks" below.

**Git hygiene done alongside the above:** dropped one fully-redundant stash
(`other-track-decisions-wip-2026-08-11` — all 5 decisions it would have added, D579-D585, were
already committed via another path; verified before dropping, not assumed). Recorded D594 (the 2nd
hero split-media revert) to `decisions.md` — it was sitting genuine and uncommitted in the working
tree. Reconciled two `origin/main` divergences this session via ordinary merges (no conflicts, both
from the concurrently-running Track 1b work) and pushed.

## Other tracks — status

- **Track 1b (inspector standardisation) — 5 more items closed this session, by a concurrently
  running session, now on `main`.** Site-header friction fixes (F2: 7→2 default-visible Settings
  controls, Shrink-on-scroll/Contrast-safety controls now hidden until their parent behaviour is on
  at any tier), multi-button `supports.spacing.margin` added (C4 — 9 theme pattern instances were
  silently discarding a stored margin value), `gridItemPadding` default fixed to the tier-object
  shape `{"desktop":{}}` on container/cta-section/trust-bar, a roster.json freshness gate, and image-
  controls `sgsHeight` collapsed to one `ResponsiveControl` (A4). Full detail + the register:
  `~/.claude/plans/go-track-1b-playful-hamster.md` — **re-read it fresh, do not trust a cached open-
  item count from this doc; it has a documented history of stale cached totals.**
- **Hero dead-variant/dead-control cleanup — SHIPPED this session.** See Human Summary above.
  `decisions.md` — record a new D-entry next session if not already done (D-ceiling was 594 as of
  this write; re-verify, don't trust this number).

## Blockers

- **None repo-wide.**

## Open — ready to pick up

- **Hero split-media → `sgs/media` child block.** Twice reverted (D591, D594). Server-side mechanism
  proven; editor-canvas multi-zone InnerBlocks rendering is the specific open problem. Needs a fresh
  design session (`/brainstorming`) before a third attempt, not a repeat of the same approach.
- **Track 1b's own open register** — re-derive from `go-track-1b-playful-hamster.md` directly; do
  not carry forward any total quoted in this LEDGER or that doc without recounting the rows.

## State Snapshot

- **Branch:** `main`, HEAD `81c33610` (merge, this session). ⛔ **This will drift immediately** — run
  `git log -1` AND `git status` AND `git branch --show-current`, don't trust this line. Local and
  `origin/main` are in sync as of this HEAD (verified via `git push`).
- **This checkout is shared with at least one other concurrent session, proven again this session**
  (see Human Summary). Commit by EXACT PATH (`git commit -- <paths>`), never a bare `git commit`, and
  check for live git activity before treating another session's uncommitted work as abandoned.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. Hero cleanup deployed and live-
  verified there this session. ⚠ 11 WP installs share that server — always name the full path, never
  glob. Credentials `.claude/secrets/sandybrown.env` (always available; do not ask).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (was 594 at this write) · `git merge-base --is-ancestor <claimed-shipped-commit> HEAD` before
  trusting any "SHIPPED" claim in this doc or `decisions.md`.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Governing programme plan (Track 1b — phases, register, live status) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| Hero block visual-diff evidence (this session) | `reports/visual-diff/hero-2026-08-13.md` |
| THE GOVERNING SPEC for Track 1b | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| Decisions (D-numbered) | `decisions.md` — D594 (2nd hero split-media revert) is the newest entry as of this write |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls` declarations** — real crop scenario, not
  converted (each needs its own per-item design decision). Not scheduled.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation toggle;
  needs its own design gate. Not started.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
