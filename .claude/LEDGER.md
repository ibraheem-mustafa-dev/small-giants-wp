---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-07
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-07 (late session) left things, in a sentence each:**
- **Your clients can now pick a different image for phone, tablet and desktop on every block that
  shows media.** Before, only the automatic website-cloner could set those — a client couldn't.
  That was the whole point of this piece of work.
- **Video can do it too, including YouTube and Vimeo** — your call, knowing the cost: someone who
  resizes the window mid-video will have it restart.
- **Two bugs that only a real check would have caught.** The video swap worked one way and then
  stuck forever — it looked perfect in the direction anyone would test first. And one block's
  styling was written after the page had already been sent, so it did nothing at all.
- **A safety check said 8 of my settings were dead code. It was wrong — but for a fair reason:**
  I'd written them in a way it couldn't read. I rewrote the code to be readable rather than adding
  a permanent note arguing the check is wrong.
- **Your settings weren't in the framework's database**, so the website-cloner couldn't have used
  them. Now seeded. The reseed reported an alarming drop; I checked every removed row and they were
  all leftovers for things deleted months ago.
- **Docs trimmed where they'd gone stale or doubled up.** The biggest was a long passage describing
  a job that finished months ago, sitting in a file I read at the start of every session — halved.
- **You signed off the mouse-following background** (every section, all four looks, client-editable).
  Not built yet; it's queued behind Task F.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND — this line no longer caches the number.** The cache is what went
> stale as "D498" on 2026-08-06 while the same file said 504 four sections later; a QC subagent
> caught the self-contradiction. A caveat is not a mechanism, so the number is gone:
> `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
> **D515-D517** = art-direction tiers on hero+media; dead-control gate's tier blind spot closed. **D514 RETRACTS D511** — a self-repairing
> mechanism had reverted the test conditions at import, so D511's and D513's conclusions are void.
> **D518-D520 (2026-08-07)** = preset arrays are theme-layer only; shadows renamed by effect; the
> visual-diff gate is change-keyed, not date-keyed. **D521 (2026-08-07, late)** = art-direction tiers
> reach every media block; video needed a RUNTIME-SWAP mechanism, not the image sibling-markup one.

### Track 3 — CLOSED (D479). Tier W admitted, physics-canvas shipped.

Narrative + licences: `memory/session-2026-08-03-track3.md`. Binding: ⛔ **GSAP is NOT MIT** (bans
motion-authoring tools competing with Webflow — exposes the Configurator Pro, not client sites) ·
⛔ **LYGIA is Prosperity-licensed** · ⚠ **Snooza = 72 SKUs**.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **Track 1 — routing audit COMPLETE + tier axis SHIPPED (D480); Phases 0-3 COMPLETE (D464, D470-D478),
  Phase 4 PARTIAL, Phase 5 OPEN.** ⚠ **The "`_family_modifier` is a second blocker" line here was
  based on D511/D513 and is SUPERSEDED by D514** — D506 fixed `_family_modifier`, and the tier
  primitive turned out to already exist; what was missing was the DATA SHAPE. `scalar-media` is still
  NOT retirable, but for a different, narrower reason (a residual child block). Spec 35
  prerequisite. Live parity: content 99%, CSS 83/84/89% (worst mobile). Registers:
  `reports/2026-08-02-pipeline-routing-review.md` + `reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
  Narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — POOL 23 → 0, CLOSED 2026-08-06 (D504).** Every `sgs/%` string attribute
  carries a role, all by MECHANISM, zero hand overrides. Four REAL bugs fixed en route
  (image-sequence content drop · inert `link-content` chain · `sgs/separator` icon routing ·
  `form.formName` dead control → the form's accessible name). **A7, A8 and A9 are now all CLOSED
  (D508/D509/D510), and the A7 reseed IS landed.** **The art-direction rollout is COMPLETE too
  (D521, 2026-08-07) — every media-bearing block, verified at first paint.** Next = **Task F**. The
  parallel Task-B session has finished and committed.
- **Track 1b enforcement baseline — ⛔ the "0 of 24 / 1 enforced / 8 partial…" figure is DEAD.** It
  was stale AND miscounted (there are 27 conditions, not 24). RE-MEASURED 2026-08-07: **27 conditions,
  11 UNENFORCED, 7 with a real script, ~6 prose-only, 9 inspector-scan rules (4 GATE / 5 ADVISORY,
  all self-tested).** Commands to reproduce are in the Task F section below — run them, do not quote
  this line. **Bar = `STOP-CATALOGUE.md` §E6; "has a script" is not the bar.**
  Narrative: `memory/session-2026-08-04-spec35-enforcement.md`.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **Independent review beats self-review — three times now.** 2026-08-03 a rater caught two stale
> figures; 2026-08-05 a doc subagent's flag led to inert DB work; 2026-08-06 re-running an agent's
> own claim myself caught three of MY probe bugs. Don't skip the second pair of eyes.

## Standing constraints (carry forward — these are rules, not history)

**MOVED to `STOP-CATALOGUE.md` §E1 (2026-08-05 sweep) — 23 rules, verbatim.** Read before touching
Track 1/DB, sticky/axe/template-lock, or block versioning. Headline: **"IT FUNCTIONS" IS NOT "IT IS
SAFE"** (100% routing accuracy target) · no block version bumps/deprecations pre-production (D293).

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. Commit by EXACT PATH, never `git add -A`; never touch another track's
  uncommitted files.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` + `git status` +
  `git branch --show-current` · D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (**heading-anchored on purpose** — the old unanchored form reported D5557 on 2026-08-01 by matching
  the hex colour `#0D5557`; true ceiling was D453)
  (**do NOT cache the number here — run the command.** This cell held a stale "D498" for the whole
  of 2026-08-06 while the top of this same file already said 504, and an independent QC subagent
  caught the self-contradiction that the file's own "never trust this line" caveat was written to
  prevent. A caveat is not a mechanism; the command is.) · framework counts via `/sgs-db` or
  `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** staging/dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654; **art-direction 2161** (hero+media, superseded);
  **2178** `/art-direction-tier-probe/` (4 image blocks, 3 crops each), **2179** `/video-tier-probe/`
  (embed tiers), **2182** `/real-video-tier-probe/` (REAL video, attachments 2180/2181) — the D521
  evidence base; Spec 32 guard-purge canary 2164 (Track 2's).
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast — ⚠ cited a
  `P-MAMAS-PRIMARY-CONTRAST` parking entry that **has never existed** in `parking.md` or
  `STOP-CATALOGUE.md` (the handoff citation gate caught the dangling token 2026-08-06). The issue is
  real and stays recorded here; the pointer is removed rather than a parking entry invented, because
  parking is a commitment and Bean opens those. Park it properly if it needs tracking ·
  two unnamed `<main>` landmarks · both sites GENERIC proof headers · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog:** `plans/strategy/product-queue.md`. Holds the Indus core→SGS migration (A/B/C),
sequenced header/footer goals, Track B reconciliation. Reconcile before acting.

**Standing programmes:** no-inline SUPPORTS migration complete, but 11 inline FR-32 sites across
9 blocks found 2026-07-30 (`reports/2026-07-30-track1-verification-audit.md`, 1 still live:
`cta-section:333`) · Spec 30 (WooCommerce) COMPLETE (D220) · L1–L4 DONE (D290). Parked, not ours:
`P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**NONE.** `--target palestine-lives` still aborts on the `oldshape-audit` (29 NEW HIGH / 28 posts,
evidence: `reports/2026-08-01-palestine-lives-oldshape-blocker.md`), but **palestine-lives is
disposable Indus staging that gets remade — not production**, so this blocks nothing that matters
and the rebuild clears it for free. Fixer if ever needed: `scripts/wp-migrate-oldshape-blocks.js`.
The canary is unblocked and current.

---

## NEXT SESSION (Track 1b / Spec 35) — TASK F, and only Task F (Bean, 2026-08-07)

### THE GOAL — state it before picking up any task

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: a control for everything the block can do, none for
what it cannot, one consistent shape across every block. **A setting that needs code to mean
anything is not done.** The **27** end conditions are only worth having if ENFORCED — that is Task F,
and it is now the ONLY open front on this track.

### ✅ CLOSED this track — do not re-open

Pool 23→0 (D504) · A7/A8/A9 (D508/D509/D510) · variant matching (D512) · **art-direction tiers
across EVERY media-bearing block (D521, `e5f85753`)** · **Task 0 — real video proved playback, the
runtime tier switch and tier posters (`6777f8d0`)** · **the Spec 39 reply IS SENT** (`22436d19`,
`reports/2026-08-07-spec39-colour-properties-reply-track1b.md`; filed under `reports/` not
`scratch/` because scratch is gitignored). ⏳ No reply back from that track yet.

---

## ⭐ NEXT SESSION — orchestration plan

**Identity.** You are the SGS framework engineer closing Spec 35. One front: **Task F** — build the
enforcement scripts that make the **27** end conditions real. Everything else on this track is done.

**State recap.** Spec 35 lists **27** conditions that define "this block's inspector is finished". A
condition with no script is prose: nothing stops the next block breaking it. The long-quoted "0 of 24" is stale AND
miscounted. **Do not quote it.** Re-measured
2026-08-07 (below): real enforcement now exists. Task F is finishing the remainder, to a bar where
"has a script" is explicitly NOT enough.

### ⛔ The baseline — RE-MEASURED, and my first attempt at it was WRONG (2026-08-07)

This slot used to say "1 enforced / 8 partial / 4 vacuous / 2 unwired / 9 absent, 0-of-24". That was
stale. My first re-measure was ALSO wrong — a naive `grep` missed matches split across a line break,
and the "24 conditions" figure was inherited, never counted. Caught by the handoff QC subagent.
**Every figure below is line-wrap-safe. Reproduce them, do not trust them.**

```bash
F=.claude/plans/spec-35-inspector-DONE-checklist.md
# end conditions (NOT 24 — that number was never true)
grep -cE '^- \[[ x]\] \*\*[0-9]+\.' $F                       # 27
# UNENFORCED — MUST collapse whitespace first; 3 items wrap mid-tag
python -c "import re,io;t=re.sub(r'\s+',' ',io.open('$F',encoding='utf-8').read());print(len(re.findall(r'\[enforced by\]\*\* UNENFORCED',t)))"   # 11
# conditions naming a REAL script file (not a prose 'audit')
python -c "import re,io;t=re.sub(r'\s+',' ',io.open('$F',encoding='utf-8').read());print(len(re.findall(r'\[enforced by\]\*\* \`?[\w/.\-]+\.(?:js|py)',t)))"   # 7
ls plugins/sgs-blocks/scripts/inspector-scan/rules/*.js | wc -l   # 9
node plugins/sgs-blocks/scripts/inspector-scan/run.js --check      # 4 GATE · 5 ADVISORY · 0 off
```

| measurement | result |
|---|---|
| end conditions in the checklist | **27** (the long-quoted "24" was never counted) |
| conditions whose `[enforced by]` says UNENFORCED | **11** (naive grep says 8 — 3 wrap mid-tag) |
| conditions naming a REAL script file | **7** |
| conditions "enforced" by a PROSE process only | **~6** — "feature-parity audit" ×3, "pattern audit", "manual a11y pass", "the audits above collectively". ⚠ These are exactly the unscripted state Task F exists to remove. Do NOT count them as enforcement. |
| inspector-scan rules that exist | **9** (4 GATE · 5 ADVISORY · 0 off) |
| of those, shipping a `--self-test` | **9 of 9** — `run.js` hard-fails a rule without one |

⚠ **Two different 11s — do not conflate.** `run.js` prints "11 rule(s) declared in rules.json" (9 real rules + 2 built-in meta checks with `file: null`). That 11 is UNRELATED to the 11 UNENFORCED conditions above. Quote the SUMMARY block (`gate rules: N · advisory rules: N`), never the header line.

**So the honest scope is ~11 unenforced + ~6 prose-only, across 27 conditions — not "8 of 24".**
`inspector-scan/run.js` REPLACED `audit-inspector-conformance.js`.

### Task F — the enforcement scripts

**What:** give every Spec 35 end condition that still lacks one a validated script, and promote the
advisory rules that genuinely should gate.
**Why:** it is the track's deliverable. **27** conditions with no enforcement are a wish, not a standard.
**Estimated time:** ~55 min for a first tranche (the 11 UNENFORCED), longer if the ~6 prose-only
conditions and any advisory→gate promotions are included.

**⛔ The bar — `STOP-CATALOGUE.md` §E6. "Has a script" is NOT the bar.**

- Every script ships a `--self-test` PROVING it can FAIL on a seeded break. All 9 existing rules
  already do; match that, never regress it.
- ADVISORY mode does not gate the build, and advisory is a legitimate END STATE for a fuzzy
  heuristic — `07-preset-only-shadow` is advisory ON PURPOSE (its label-regex is documented as fuzzy
  and its advisory reason is written into the rule). Do NOT bulk-promote advisory→gate to inflate a
  count; promote only where the detector is precise, and justify per rule.
- A condition that genuinely cannot be scripted is recorded as unenforceable WITH A STATED REASON.
  That is an acceptable outcome; silence is not.

**Orchestration:** the 11 unenforced conditions are disjoint files — the parallel-subagent shape. Pick
per-script models with `/delegate`, dispatch via `/dispatching-parallel-agents`. **Do the re-measure
INLINE first**; never delegate the measurement that scopes the work.
**Depends on:** the re-measure. **Parallel with:** none.
**/qc gate after:** yes — `/qc-council` (multi-rater, blub.db 255). These are gates, and a wrong gate
reads green forever.
**Acceptance:** each of the **27** conditions either (a) has a script whose `--self-test` demonstrably
fails on a seeded break, or (b) is explicitly recorded as unenforceable with a reason. A count of
scripts written is NOT acceptance.

### Dependency graph

```
Re-measure the baseline (INLINE — never delegated; it scopes everything)
  ↓
Task F scripts (parallel subagents, disjoint files, /delegate per script)
  ↓
/qc-council  →  commit + push
```

### Also queued (NOT next session unless Bean redirects)

- **Pointer-reactive container backgrounds — GATE SIGNED 2026-08-07, build NOT started.** Bean chose
  **Route B** (a background mode in `SGS_Container_Wrapper`, inherited by every wrapper-bearing
  composite — this IS the Rule 7 shared-mechanism change) with **all four looks**, client-selectable,
  colours + intensity operator-editable. Bean explicitly overruled the contrast risk with reasoning
  recorded in the gate: **contrast is a CONTROL, not a gate.** Reduced-motion SUPPRESS and
  coarse-pointer degradation stay mandatory. **FR number = `FR-38-28`** — the gate's own "FR-38-25 is
  next" was stale (Spec 38 already reached FR-38-27); re-check before writing spec text.
  Plan: `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md`. ~2h + ~30 min/look.
- **Parking: 61 entries total; the 10 with machine-checkable claims were verified 2026-08-07 and ALL 10 are genuinely OPEN — none closable.** The other 51 were not individually re-tested. The backlog is accurate
  work, not stale bookkeeping. Two had drifted FIGURES, now corrected
  (`P-DECISIONS-MD-OVER-LINE-CAP` 3,604→7,263 lines; `P-PATTERNS-USE-CORE-BLOCKS` "~40+"→4 measured).

### Methodology guardrails (do not skip — every one was earned)

- **A gate reading green is not the claim you are making.** `check-no-core-blocks` passes clean while
  4 pattern files still use core blocks — its ban-list does not cover heading/paragraph/list. Read a
  gate's PREDICATE before citing it as evidence for a different proposition.
- **A gate's false positive can be a legibility signal.** CHECK 4 called 8 live attrs dead because its
  resolver cannot follow a key whose tail is a second variable. Rewriting the code into the shape the
  gate reads beat arguing 8 findings into a baseline forever.
- **Test the RETURN path.** The video tier swap worked desktop→mobile then stuck permanently — the
  rebuilt node dropped its own `data-*`. Assert A→B→A, never just A→B.
- **Measure the LIVE tree, not a worktree copy.** `.claude/worktrees/` holds stale duplicates with
  identical filenames and plausible-looking numbers.
- **Assert on measured `window.innerWidth`, not the requested viewport.** A requested 800px measured
  727px and would have tested mobile while labelled tablet.
- **Verify at FIRST PAINT** — set viewport, then navigate fresh. Never resize-after-load.
- **Include a positive control** — prove the effect CAN fire, or "nothing happened" is
  indistinguishable from a dead feature.
- **`git status` the artefact dir BEFORE writing**, not before committing. `M` where you expect `A`
  means you are about to destroy another session's file. Recovered two reports this way.
- **A shared-DB reseed is a cross-track action.** Back up first, diff the result, and check every
  pruned row against its source before calling a drop "damage" — 33 pruned rows this session were all
  legitimate catch-up on attrs deleted months ago.
- **Shared worktree:** commit by EXACT PATH, then diff your own commit's file list. Never `git stash`.
- **Re-check the D-ceiling immediately before writing any D reference**, heading-anchored:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

### Known non-blocker

`npm run build` is green as of this session — **927 pass, 2 skipped**, every prebuild gate passing,
measured after the `/sgs-update` reseed. (The older "672 pass" figure in this slot was stale.)

### Open — one caused BY this session, one genuinely not ours

- ⚠ **OURS, AND DESTRUCTIVE: THIS SESSION WROTE TO TRACK 2's CANARY (post 2164) AND IT LOST A TEXT
  NODE.** Their Spec 32
  guard-purge canary carried 5 undeclared attrs that WP discards at parse and deletes on the next
  save (`counter.endValue`→`number`, `form-step.stepTitle`→`label`, two `name`→`fieldName`,
  `mega-group.heading`→ a child `sgs/heading`). All 5 migrated via the editor data layer (D516 §2),
  and the page now renders `250` + `Mega group heading` where it rendered neither — so their sweep
  had been measuring blocks with missing text. **BUT** `sgs/mega-group` sets `templateLock: 'all'`,
  so its stored `sgs/text` child ("…renders a measurable node") was dropped by the editor on load
  and could NOT be re-inserted. That text is gone from the page. It was already doomed — ANY editor
  save would have dropped it — but Track 2 should re-count their text-owning nodes. No gate covers
  "children vs templateLock"; the oldshape audit checks attrs only. Track 2's call.
- **NOT ours — residual empty `sgs/media` ChildBlock** in the art-direction walk (D514) — not yet traced to its
  emitter. It blocks the `scalar-media` retirement alongside a durable data shape and a non-hero
  fixture.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT to `memory/session-2026-08-05-swept-narrative.md` (verbatim, neither closed).** Snooza
pitch-demo tasks 1-4 + Track 1 routing R1-R4 (R4/R1 shipped 2026-08-04; R2/R3 open). ⚠ **R3 is
blocked on `scalar-media`** — see "Open, not ours" above; it is NOT retirable yet (D511 → D514).
