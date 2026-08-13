---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-13
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-13 (latest session, part 5). You asked a sharp question about the database fix from
part 4 — was patching individual wrong entries really the right move, when the data looked clean
enough to derive automatically? Checked it, you were right, and fixed it properly.** Commits
`3267384f`–`12007c67` (the check), plus the real fix below.

- Ran a multi-angle validation check on my own earlier fix. It found the answer immediately: the
  framework already tags every motion/interaction setting with a hidden marker (so it can tell
  "this is a JS behaviour flag" apart from "this is real CSS") — but the automatic classifier
  wasn't reading that marker, so it defaulted those settings to the wrong category every time.
  Proof it was systemic, not a one-off: the check found **3 more settings with the identical bug**
  on a block I hadn't touched.
- Fixed those 3 immediately the same safe way as before.
- Then built the actual permanent fix — taught the classifier itself to recognise that marker, so
  this whole category of setting labels itself correctly from now on, automatically, on every
  future block, with no more hand-patching needed. Verified with a dedicated automated test before
  trusting it, not against the live data (nothing there needs fixing anymore — the test proves the
  logic on a scratch copy instead).
- This is now closed. `faqSchema`/`allowMultiple`/`defaultOpen` (the other 2 database labels fixed
  in part 4) are a genuinely different situation — no equivalent hidden marker exists for those yet
  — and stay as intentional hand-corrections for now.

**2026-08-13 (latest session, part 4 — new thread). Continued the "does the editor preview match
what the client actually gets" checker (the tool the hero work surfaced). Cleaned up a known blind
spot, fixed 13 wrong entries in the framework's internal database, then had 3 reviewers read every
one of the 143 remaining findings by hand.** Commit `9d827d63`, decisions D603–D606.

- **The checker missed cases where a setting only affects something through a shared helper file**
  (e.g. a form field's machine name, or a hover-transition timing value) rather than directly. Only
  9 of 152 findings were this shape — not worth building a bigger cross-file tracer for, so I
  verified them by hand and documented the limitation directly in the tool instead.
- **Found and fixed 13 wrong labels in the framework's internal settings database** — a toggle that
  emits invisible SEO markup was wrongly tagged as "controls visibility," and a carousel drag-speed
  flag was wrongly tagged as "styling" in 5 blocks (not just the 1 originally flagged).
- **Had 3 people (well, agents) independently read the actual code behind all 143 remaining
  findings** rather than trusting the checker's guess. Result: **70 are real bugs** (settings the
  client can change but never sees change in the editor), 50 are correctly not previewable (things
  like hover effects or scroll animations that genuinely can't show on a still screen), and 23 are
  a different, understood shape (2 blocks that need live data — reviews from Google, live product
  stock — the editor simply doesn't have). Full breakdown:
  `.claude/reports/2026-08-13-editor-render-parity-fresh-triage.md`.
- **Checked whether to build a tool that auto-fixes those 70 bugs** rather than fixing them by
  hand — concluded no: about 20 of the 70 need a missing piece of the editor preview built from
  scratch (a button that doesn't exist yet, a different HTML structure), which a generator can't
  safely do. Fixing the other ~50 by hand is faster than building and testing a generator for a
  one-off batch this size.
- **Found one genuine bug while triaging, not just a missing preview**: on `sgs/hero`, a "match the
  theme's default style" toggle does the OPPOSITE of what it's supposed to in the editor versus
  what actually saves — the editor keeps showing a background/border that the live page correctly
  hides. Flagged as the top-priority item in the 70-bug list.
- **Not done yet, and not started without asking:** actually fixing those 70 bugs is real build
  work across ~25 blocks. See the menu at the end of this session's reply rather than me just
  running ahead with it.

**2026-08-13 (latest session, part 3). Closed the last carried-forward hero item — split-image
bleed — by testing it first, then acting on what the test showed.** Commits `3170943a`, `beab47a4`.

- Bleed wasn't dead: the toggle already existed and does something real (edge-to-edge image, no
  three-controls workaround). Only 2 dev/QA pages used split heroes, so the default was safely
  flipped to full-bleed.
- You then asked directly whether it worked on the OTHER media types hero can insert. It didn't —
  tested with a real uploaded video: before the fix, the video kept its native aspect ratio and
  overflowed its column (`1280×720` box inside a `652×727` wrapper); after, it filled the column
  exactly, same as image. Fixed without touching `render.php` at all — just CSS, targeting the
  type-modifier class the shared media-render helper already emits for every tier.
- Flagged, not fixed: video/SVG have no width/height/border/padding controls of their own at all,
  bled or not — a bigger, separate gap, predating this session.

**2026-08-13 (latest session, part 2). Spot-checked the hero editor after D597 shipped, found and
fixed three more real things, plus a `npm run build`-breaking gate.** Commit `6cd683d9`.

- **Split-order control** now actually shows the swap in the editor canvas, not just on the
  published page — was correct on the frontend the whole time, the editor preview just never
  applied it.
- **"Split media only allows an image"** — already fixed by an earlier commit today; verified live,
  image/video/SVG per device all work.
- **`npm run build` was broken for everyone**, not something this session caused — proven by
  stashing and testing the already-pushed tree. Root cause: two loose ends from D597's own work
  (a stale derived-classifier snapshot, and a feature-parity exception that named a deleted
  attribute). Both fixed; build is green again.
- One genuine collision between two concurrent subagents working the same files this session —
  caught before it shipped, by checking the actual component source rather than trusting either
  agent's reasoning.

**2026-08-13 (latest session, part 1). D596's three "found but not built" items on hero, closed.**
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
| (pending) | DB role remediation part 2 CLOSED: 479 → 0 `role IS NULL` rows. TIER 3.18/3.19/3.41 (358 rows, structural) + 121-row investigated override pass + `dragToScroll` fx-registry fix (D611) |
| `b3107413` | `assign-canonical.py` TIER 3.18: `source='native_wp'` rows seed to `role='core'` (D611) |
| (pending) | `assign-canonical.py` TIER 3.17: `fx:*` namespace styling bug fixed at source, self-correcting (D610) |
| `3267384f` | 4 more `fx:*` attrs found + fixed by `/qc-council` re-checking D604 structurally (D607) |
| `9d827d63` | editor-render-parity: cross-file blind spot resolved (152→143), 13 DB `role` fixes (D603/D604) |
| `9b8511cf` | `sgs/hero`: split media gets its own Ken-Burns/parallax pair, D596's bgParallax/Ken-Burns questions answered, global `@keyframes` collision fixed (D597) |
| `3170943a` | `sgs/hero`: `splitImageBleed` tested (not dead), defaulted to full-bleed (D600) |
| `beab47a4` | `sgs/hero`: bleed extended to reach video/SVG tiers, not just image (D600) |

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

- **editor-render-parity Phase 2: 70 confirmed REAL-GAP findings, not yet fixed.** Full list +
  fix-shape groupings (mechanical/needs-new-markup/genuine-bug) in
  `.claude/reports/2026-08-13-editor-render-parity-fresh-triage.md` + D605. Top priority:
  `sgs/heading.inheritStyle` is an inverted-direction bug (editor shows the opposite of what
  saves), not just a missing preview. Auto-generator investigated and rejected (D606) — this is
  hand/agent-fix work, batched by block, dispatched in parallel where blocks are independent.
- **DB `role`-column remediation part 2 — CLOSED (D611).** 479 `role IS NULL` rows (re-verified
  live, not the stale "469") → 0. 358 rows (75%) via three self-correcting structural TIERs
  (3.18 native_wp→core, 3.19 generic boolean backstop, 3.41 breakpoint inheritance); 121 rows via
  an investigated override pass (5 parallel agents, real render.php/edit.js reads). Two concrete
  future structural opportunities named, not built: (1) `fingerprint_content_roles.eligible_pool()`
  hard-filters `attr_type='string'`, excluding every boolean from the whole D1-D7/TIER 2.4
  wrapper-paint pipeline — widening it to include boolean would close `shapeDivider*`/
  `overlayGradientAngle` (29 rows) structurally instead of by name-list override, but is a
  cross-cutting change needing a design-gate first (CLAUDE.md Rule 7). (2) `wp_json_encode()`
  Signal-1 port for `faqSchema`-shaped JSON-LD toggles needs a NEW extraction pass in
  `extract-signatures.py` (assign-canonical.py never parses render.php at all) — bigger, separate
  work, still not attempted. Full detail: `decisions.md` D611.
- **editor-render-parity Signal 4 candidate (D605), not built.** 21 of 23 OTHER-SHAPE findings are
  one of two "editor can't have the live data, deliberate static placeholder" shapes
  (`sgs/buybox`, `sgs/google-reviews`). Structurally same as Signal 3 — worth its own exemption
  signal if this detector gets revisited, not urgent (no false-positive volume currently hiding
  behind it).
- **Check A promotion to gate mode: NOT ready.** 70 unfixed REAL-GAP findings + the Signal 4 gap
  mean this hasn't had "a full cycle run clean on real code" yet (this project's own E6-point-9
  doctrine — never promote on the run that introduces/changes a rule). Revisit after Phase 2 closes.
- **Hero: all three Track 1b carried-forward items now closed.** (a) Stray WP toolbar text-align
  button on the headline (C3) — Bean confirmed 2026-08-13: "Stray button toolbar is gone." (b)
  Split-media → `sgs/media` child block (D6(b)) — Bean DROPPED this entirely 2026-08-13, not
  deferred (D599); the per-device image/video/SVG type-picker already delivers most of the
  practical benefit. (c) Split-image bleed CSS — tested (not dead, not redundant), default flipped
  to full-bleed, and extended to video/SVG after Bean caught it only working on image (D600,
  `3170943a` + `beab47a4`).
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

- **Branch:** `main`, HEAD `9d827d63`. ⛔ **This will drift immediately** — run `git log -1` AND
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
  (was **606** at this write) · `git merge-base --is-ancestor <claimed-commit> HEAD` before trusting
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
| Decisions | `decisions.md` — **D600** is newest as of this write; re-verify |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design decision
  each. `image-sequence` is the standing (non-blocking) `check-image-controls-support` finding.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`cta-section` / `trust-bar`** also host the shared `BackgroundPanel` changed at `efa2f0be`; they
  were not individually opened in the editor. Low risk (UI-only change) but unverified.
