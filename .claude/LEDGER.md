---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-13
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-13 (latest session). D596's three "found but not built" items on hero, closed.**
One commit, pushed, live-verified, `/sgs-update` re-run. `9b8511cf` on top of `b2ffcd40`.

**What you can now do that you couldn't before.** The split hero's foreground media picture can
have its own Ken-Burns zoom or parallax scroll — a control the section background always had, the
media column never did. Both are mutually exclusive, same as the section's own pair.

**The two things D596 asked to be MEASURED are now answered, not just fixed.** `bgParallax` on
split turned out NOT to be dead — it already works via the wrapper's own `background-attachment:
fixed` once a root background is configured alongside `splitImage`; no code change needed.
Ken Burns on split, though, uncovered a real bug nobody had caught: `hero/style.css` and
`container/style.css` each declared a DIFFERENT animation under the identical name
`@keyframes sgs-ken-burns` — CSS keyframe names are global, so whichever stylesheet loaded last
was silently overwriting the other's animation, for every block that shares the wrapper, not just
hero. Renamed both. Also found and fixed in passing: hero's own Ken-Burns effect was running its
animation on split even when there was no background configured at all — a wasted, invisible
"phantom" animation — now gated on the wrapper's own has-a-background class.

**2026-08-13 (earlier session, retained context below). Per-device media across three blocks,
then three hero fixes.** `f4153da4 → b2ffcd40`.

**What you can now do that you couldn't this morning.** A client can set a different image,
video **or SVG** per device on `sgs/media`; a split hero can be an image on desktop and an SVG on
mobile; a split hero can finally have a section background at all; and the split media column has
its own overlay, separate from the section's.

**The most valuable find was a bug nobody reported.** While adding SVG tiers I traced the existing
IMAGE tiers and found the cascade was wrong: with a tablet crop set and mobile left empty, mobile
fell back to **desktop** instead of inheriting **tablet** — contradicting `sgs_resolve_tier()` and
Spec 35's own stated rule. Proven, not argued: replaying the old rules through a 12-case assertion
set fails exactly one case and passes eleven; the new logic passes 12/12; confirmed live at 375px.
Root cause was a *shape* — the rules were enumerated by hand, so one of four combinations was
missed. Both media families now compute band ownership from one closure. **The same bug existed a
third time** in a shared helper, where its own docblock described the defect as intended behaviour.

**Two things I got wrong, both caught by review rather than by me.**
1. I estimated the hero work as a whole separate session. A `/qc-council` measured it at ~15-18
   edit sites and falsified my reasoning — **and the lines I'd cited as the fix site were the wrong
   ones.** Editing there would have given split a SECOND background painter over the wrapper's,
   plausibly reproducing D594's "background bleeding through", and it would have looked correct on
   any page with no wrapper background set.
2. I called an implementer's code comment "fabricated" after `grep … | head -8` hid the very rule
   that supported it (10th match). A Haiku reviewer caught me. Had I "fixed" it, I'd have replaced
   a correct justification with a wrong one on a value that prevents a real rendering bug.

**The recurring failure mode this session was MY verification, not the implementers' code.** Four
false negatives, each of which read as a real defect: a truncated grep; a collapsed inspector panel
reading as a missing control; `/Ken Burns/i` not matching the real label `"Ken-burns zoom"`; and a
stale element handle re-reading one block while appearing to compare two. **A truncated, unexpanded
or loosely-matched check does not report "unknown" — it reports a confident absence.**

**A duplicate control that was worse than a duplicate.** Hero showed clients TWO "Overlay colour"
knobs: its own local one wired to the LEGACY `overlayColour`, and the shared panel's wired to the
canonical `backgroundOverlayColour`. The more prominent one did nothing. Deleted, with the legacy
attribute, after verifying twice that the shared panel genuinely covers it.

**A fatal-in-waiting, cleared.** `includes/render-helpers.php` carried an uncommitted `require_once`
pointing at an **untracked** file — committing that line alone, or any fresh checkout, would have
fatalled every page. Both halves landed together (`079abbae`).

## Shipped this session

| Commit | What |
|---|---|
| `9b8511cf` | `sgs/hero`: split media gets its own Ken-Burns/parallax pair, D596's bgParallax/Ken-Burns questions answered, global `@keyframes` collision fixed (D597) |

## Shipped earlier session (retained)

| Commit | What |
|---|---|
| `5727825e` | `sgs/media` per-device SVG + **cascade fix for BOTH media families** |
| `b6ccb320` | D595 + Spec 35 D5 amended at source (the cascade rule) |
| `079abbae` | `helpers-tier-media.php` landed WITH its `require_once` (fatal cleared) |
| `f5fdf7e6` | SVG `<style>` finding CLOSED as not-a-vulnerability, on evidence |
| `efa2f0be` | `sgs/container`: 3 stacked background pickers → one `ResponsiveControl` |
| `4fe39e6d` | `sgs/hero`: split media gains per-device TYPE; legacy `splitMedia` deleted |
| `0917bcf3` | `sgs/hero`: background is a ROOT setting — split heroes paint one |
| `89857e39` | `sgs/hero`: second overlay targeting the split MEDIA element |
| `0c270af7` | `sgs/hero`: media panels consolidated, legacy `overlayColour` deleted |
| `b2ffcd40` | D596 |

## Blockers

- **None repo-wide.**

## Open — ready to pick up

- **Hero: 3 items still open from Track 1b, unrelated to effects, not touched this session:**
  (a) stray WP toolbar text-align button on the headline (C3) — confirmed inert, needs a ruling
  (leave as cosmetic debt, or ~45-60 min custom `BlockControls` filter, no precedent in this repo);
  (b) split-media → `sgs/media` child block (D6(b)) — twice reverted (D591, D594), server-side
  mechanism proven, editor-canvas half still needs a new idea before a third attempt; (c) hero
  split-image bleed CSS — latent, 0 live instances, parked.
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
- **Hero split-media → `sgs/media` CHILD BLOCK.** Still twice-reverted (D591, D594), still unsolved
  on the editor-canvas half. ⚠ This session did NOT attempt it — the hero work shipped was
  attribute-based, a different mechanism entirely. Needs its own design session.
- **Track 1b's own open register** — re-derive from `go-track-1b-playful-hamster.md` directly; never
  carry forward a total quoted here or there without recounting the rows.

## State Snapshot

- **Branch:** `main`, HEAD `9b8511cf`. ⛔ **This will drift immediately** — run `git log -1` AND
  `git status` AND `git branch --show-current`; do not trust this line.
- **This checkout is SHARED with concurrent sessions — proven again this session.** A whole
  `helpers-tier-media.php` (11KB) plus hero edits appeared mid-session from another track. Commit by
  EXACT PATH (`git commit -- <paths>`); a path-scoped-commit gate now enforces this. Before treating
  another session's uncommitted work as abandoned, check for live git activity.
- **Deploy deadlock-breaker:** `build-deploy.py --payload <prefix>` lets you deploy your own
  uncommitted payload while another track's dirty files still (correctly) block. Used repeatedly this
  session — no `--allow-dirty`, no hand-rolled tar.
- **Canary:** sandybrown. Probe pages created this session: **2332** (media SVG tiers), **2334**
  (hero split tiers), **2337** (hero background/overlay). Delete when no longer useful. Page 2294
  (leftover D594 QC draft) was TRASHED on Bean's instruction — it was blocking `oldshape-audit`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (was **597** at this write) · `git merge-base --is-ancestor <claimed-commit> HEAD` before trusting
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
| Decisions | `decisions.md` — **D597** is newest as of this write; re-verify |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design decision
  each. `image-sequence` is the standing (non-blocking) `check-image-controls-support` finding.
- **`sgs/hero` split-image bleed** — latent only. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`cta-section` / `trust-bar`** also host the shared `BackgroundPanel` changed at `efa2f0be`; they
  were not individually opened in the editor. Low risk (UI-only change) but unverified.
