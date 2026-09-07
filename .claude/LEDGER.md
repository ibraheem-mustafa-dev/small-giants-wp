---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-07
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Typography controls (fonts, spacing, alignment) now work fully on every text element in the
framework — and a serious silent bug in that rollout was caught and fixed the same session,
before it ever reached a client.**

You settled the big design question yourself, live: instead of me curating which font controls
each type of text gets (a title gets these five, a price gets those three, etc.), you pushed
back that most of those exclusions did not hold up — so now every text element on every block
just gets the full set. Simpler for you, and less work for me to maintain.

While rolling that out, I found that turning those controls on had exposed a real problem:
WordPress only remembers a setting if it is on an approved list, and 513 of the new settings
across 84 blocks were missing from that list — so a client could type into a control and have
it silently do nothing. I built a checker, found every instance, and fixed all of them, along
with two smaller knock-on issues it surfaced. Separately, fixed a genuine bug on the card-grid
block where the built-in WordPress font control was silently overriding your own custom one.

One thing to flag: a task I dispatched to a helper committed a change directly to the shared
codebase without being told to. The change itself was fine, but it should not have done that
on its own — noted for how I brief that kind of task going forward.

**Update, later the same day:** the whole typography track is now deployed to the sandybrown
canary and live-verified (font-size, decoration, transform, letter-spacing, and the two-state
link colour all confirmed working on the real rendered page, not just the editor). One real
mishap along the way: the deploy script's `--dry-run` flag isn't actually dry — it still ships
for real, it just skips the safety checks — so it deployed another session's unrelated
in-progress work bundled in with mine, without going through the gate that would normally have
caught that. Told you immediately; the other session had already finished and redeployed
cleanly by the time we talked, so nothing needed rolling back. Full detail: D991 in
`decisions.md`.

**Earlier the same day (separate session, unrelated track):** media/hero border hover, a
cheat-gate false alarm cleared, the pre-merge gate fixed after it had been failing on every
commit for months, and all 8 draft PRs + 30 stale branches closed out (verified superseded,
zero salvage). Full detail in "Shipped today" below and D983/D985-D988.

**Colour conformance on text is now DONE — controls, rendering, and the live editor preview.**
Every text colour in the framework can now take a gradient as well as a flat colour, on both its
normal and hover state, and the client sees the effect immediately in the editor rather than
having to save and check the real page. That closes the whole text side of the colour work.

Three things worth knowing, because the automated checks did **not** catch them — I found them by
reading the actual diffs:
1. On the timeline block, the date colour was wired to the wrong helper *twice* — once to the
   background/fill helper, then later to the link helper. Both were near-misses caused by copying
   a neighbouring attribute that looked similar. Either would have silently painted nothing.
2. The accordion was passing three new settings to its child block, but the child had never been
   told to accept them — so the feature would have been dead on arrival with no error anywhere.
3. A new colour type was missing from two registry files, which meant the entries referencing it
   were being silently ignored.

I also cleared a backlog that had been sitting as accepted debt: 31 previously "we'll live with
it" items on the editor-preview checker are now genuinely fixed or correctly classified, and that
list is empty for the first time. Two of those turned out to be real bugs worth fixing (the audio
block's spectrum colour and the button's icon gradient never previewed at all).

One correction to something I told you earlier in the session: I said motion effects "can't" show
in the editor. That was wrong as stated — it's a deliberate design decision with its own on-screen
notice to clients ("this animates on the live site only"), not a technical impossibility, and the
real reasons are architectural (the motion code only loads on published pages) plus a genuine
safety one (smooth-scroll would fight the editor's own scrolling). You were right to push back.

## Shipped today (2026-09-07)

| What | Detail lives at |
|---|---|
| **Typography: two-state link colour on 7 blocks** (base + hover, gated on a RichText field permitting `core/link`) | D990 · `0e2f58cc2` |
| **Typography: full control set turned on across 29 blocks** (mechanical codemod, new detector `migrate-typography-full-controls.js`) | D990 · `8b67f5651` |
| **Typography: 8 harder blocks** — target-switcher conversions, 2 render-side rewiring bugs fixed (`media`/`before-after` had a dead editor control), new-coverage extension | D990 · `96bc9e734` |
| **Critical fix: 513 missing attribute declarations** across 84 blocks, found + fixed with a new detector (`audit-typography-attr-declarations.js`); plus card-grid/collapsible-text/icon-list native-typography holdouts closed | D990 · `f7cb3ba36` |
| **Typography track deployed to canary + live-verified** (Tasks 6-7 close the track); `build-deploy.py --dry-run` incident found + disclosed (not a dry run — ships for real, skips gates only) | D991 · `780be1a91`/`2568ce0f1` (doc fixes; the deploy itself is not a git commit) |
| **Colour conformance TEXT surface CLOSED — 29 rows migrated** (gradient trio + hover, bg-layer splits, 3 documented exemptions); `sgs_link_colour_css()` gained gradient support on both states | Track A · `6d8073d2f` |
| **Editor controls wired for all of the above** (SgsColourPanel `gradientCapable` + gradient value/onChange across 12 blocks) — previously backend-only, client could not set any of it | Track A · `6d8073d2f` |
| **Editor-canvas gradient preview across 12 blocks** — CHECK A 13 net-new → 0; `linkColourPreviewCss()` extended for gradient (JS mirror of the PHP redesign) | Track A · `b33eaee1f` |
| **`check-editor-render-parity.js` baseline emptied** — all 31 accepted-debt entries genuinely closed: 23 moved to a structural `EDITOR_INVISIBLE_BY_DESIGN` rule (DB-verified, not assumed), 2 fixed for real (`audio.spectrumColour` static swatch, `button.iconColourGradient` SVG stroke gradient) | Track A · `b33eaee1f` |
| **3 real bugs the gates missed, caught by diff review** — timeline `dateColour` wrong-helper (×2), `accordion-item` missing `usesContext` keys (silently dead capability), `css:color-link-gradient` unregistered in both vocabulary files | Track A · `6d8073d2f`/`b33eaee1f` |
| **Detector fixes** — `classify-end-shape.js` Pattern 1d (shared-helper call-through) + `check-dead-controls.js` taught the `LinkColourGradient`/`HoverGradient` suffixes | Track A · `6d8073d2f` |
| **Parallel session's Task 1 hover batch merged** (tab/table-of-contents/trust-bar/trustpilot-reviews/whatsapp-cta) — found unmerged in a worktree branch, verified, integrated | Track A · merge `dc364e953` |
| **`sgs/media`/`sgs/hero` border hover/gradient state** (matches button/container's pattern) | D985 · `11f1e2386` (merged direct to `main`, no PR — D983) |
| **Cheat-gate Check #9 allowlist** for `section_passes.py`'s legitimate anchor-class write | D985 · `3e20518c7` |
| **Two pre-existing converter test failures root-caused + fixed** (tier-of-boxes COLLISION false-positive; missing `xfail` marker) | D985 · `efeb0b8e7` |
| **Git hygiene locked: no PRs, no stashes, integrate after every task** (project + GLOBAL `~/.claude`) | D983 · `75dfd3058` |
| **8 draft PRs closed + all 30 remote branches deleted** — every one verified superseded, zero salvage | D983 · `045af1ba8` |
| **Dead border-radius tier code purged** — 5 duplicate stanzas + 49 always-null arg pairs + the 3 GENERATORS that re-emit them | `e002bd8b1` |
| **wp-pre-merge-gate stopped failing on every commit** (3 bugs: wrong list, vendored scope, WP dynamic hooks) | D987 · `b166bd164` |
| **gallery `!important` → specificity**; cheat-gate 1 violation → 0, baseline emptied | `b166bd164` |
| **Canary oldshape debt cleared**: dead domain removed, 8 spent probe pages trashed, baseline 197 → 0 | `1e9721cb3` |
| **Enum control-shape band 2-5 → 2-4, five is NEUTRAL** (Bean ruling); 46 → 29 violations | D986 · `1b1ad4712` |
| **`logical-props` RTL gate WIRED IN** + 3 nav conversions (2 kept physical, one JS-coupled) | D987 · `559d05e16` |
| **`multi-button.childBtnBorderRadius` → standard responsive tier object** (+ its check's stale advice fixed) | `0e338b28e` |
| **db-consistency baseline DELETED** — gate now fails on ANY violation (strictest setting) | D988 · `a4e83e46c` |
| **Priority 4: `sgs/hero`'s `splitMediaObjectPosition`+`splitMediaWidth` folded to tier-object** — closes the whole tier-object arc across Priorities 1-4 for hero's media family; the shared 7-block `focal-point` atom made shape-aware (byte-identical for 6 unmigrated callers); 2 published posts (incl. the live homepage, 2742) content-migrated before deploy so nothing stranded | D992 · `ae0c2bff1` |
| **Task B: worktree-isolated build+deploy is now the default** in `build-deploy.py`, closing the concurrent-build-race incident from earlier this session; a second live design gap (dirty-tree gate false-aborting an isolation-eligible deploy) found + fixed same session | D993 [INCIDENT] · `84755960d` + `1e371f95b` |

## Blockers

**None.**

## THE FRONT — five live tracks, pick one

**Three live tracks remain (A, B, E) — Track D is CLOSED, Track C is closed-out salvage.**
A, B, E were rewritten from measurement on 2026-09-07. Every superseded prompt cited stale
counts, orphaned commit SHAs, or work another session had already finished — so read the
prompt, never a remembered summary. The recurring finding across all of them: detectors and
censuses flag correct framework usage, so a headline count is an upper bound, not a workload.

### Track D — typography surface-taxonomy — CLOSED 2026-09-07, all 7 tasks done
**No open work. No prompt file — deleted once consumed; do not resurrect it from git history.**
Full record: D990 (build) + D991 (deploy/live-verify) in `decisions.md`. Settled: every text
surface gets the FULL `TypographyControls` set, no per-element curation; two-state link colour on
7 blocks; a 513-attribute undeclared-in-block.json regression found + fixed
(`audit-typography-attr-declarations.js`). Canary-deployed and live-verified.
⚠ **Still unfixed, for whoever next touches `build-deploy.py`:** `--dry-run` is NOT dry — it
ships for real and only skips the gates. It shipped a peer session's work bundled in (disclosed,
no rollback needed). `counter`/`quote` stay native-typography holdouts by design (D972).

### Track A — colour conformance, TEXT surface — CLOSED 2026-09-07
**All 29 real rows migrated, all editor controls wired, all editor-canvas previews wired, all
gates green.** Commits `6d8073d2f` (render/attrs/controls) + `b33eaee1f` (canvas preview) +
merge `dc364e953` (the parallel session's Task 1 hover batch).
`classify-end-shape.js`: TEXT-surface **29 → 0**. Whole census 53 → 10 (remainder is FILL).
`check-editor-render-parity.js` CHECK A: **13 net-new → 0**, and its baseline is now **empty** —
all 31 previously-accepted debt entries genuinely closed, not deferred.
**Bean-ruled 2026-09-07:** every text row gets a base + hover pair (uniform contract). Bean also
ruled `sgs_link_colour_css()` gains gradient support rather than exempting the 6 link rows.
**Three real bugs caught in review that the gates alone missed** — all fixed, all worth knowing:
`timeline.dateColour` used the FILL/background gradient helper (and later the link-scoped canvas
helper) instead of the TEXT trio, twice, by surface proximity to an adjacent attribute;
`accordion-item`'s `usesContext` was missing the 3 new context keys its own render.php reads, so
the capability would have been silently dead; `css:color-link-gradient` was absent from
`cluster-member-sets.json`/`setting-registry.json` entirely, so explicit attrMap entries naming
it were being silently ignored.
**Exemptions (documented, `rule: "gradient"`, keyed by rowKey not attr name):**
`business-info.attributionHoverColourFallback` (hardcoded sweep animation),
`multi-button.childBtnTextColour` (child-block `var()` chain architectural limit),
`filter-search.textColour` (form-input UX — hover added, gradient exempt).
⚠ FILL is NOT closed — 10 rows remain in the census (was 15). Separate track.
⚠ Pre-existing, NOT from this track, disclosed not fixed: `sgs/breadcrumbs` (3 element-manifest
orphans) and `sgs/product-faq.backgroundColourHover` (DB routing anomaly, `css_property=position`
on a colour attr). Both fail their gate today; neither was touched by this work.

### Track B — tier-object migration, Phase 3 remainder
**Read first:** `.claude/prompts/2026-09-07-tier-object-phase-3-next.md` (full read).
Supersedes the deleted `2026-09-06-tier-object-phase-3-remaining-work.md`, which cited two
orphaned commit SHAs, a stale pytest baseline, and work another session had already started.
**Groups 0+1 done, merged, and now live-verified** — canary page 3355 proves a padding-only
container emits padding (the exact Group 0 bug shape). **Priorities 1-4 are ALL now closed**
(2026-09-07, later the same day): accordion/button/table-of-contents padding tiers (Priority 1),
the shared mediaPadding atom + hero's `splitMediaPadding`/`mediaPadding` (Priority 2, D-adjacent
commits `72a441659`/`bd58c88ed`/`97dbc5d66`), `whatsapp-cta` border-radius required NO fix on
investigation (Priority 3), and hero's `splitMediaObjectPosition`/`splitMediaWidth` media-atom
pilot (Priority 4, D992, `ae0c2bff1`). **NOT claimed:** every remaining flat-trio attribute
framework-wide — a full `migrate-tier-object.py --survey` across the whole attribute list has
not been run; this closes hero's media family specifically.
⚠ **Box-shape radius work is deliberately OUT** — another session owns those files and
committed `e76586a9e` to them 2026-09-07. Ask before scheduling.
⚠ `migrate-border-radius-render.py --survey` returns UNCLEAR for 46 of 51 blocks including
already-fixed ones — it does not discriminate. Read `block.json`, not the survey.
Independent of Tracks A/C/D.

### Track E — inspector gates, rule 41 grouping/order debt
**Read first:** `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` (full read).
Supersedes the deleted `2026-09-04-spec32-35-gates-next-session.md`. **This track had no LEDGER
entry until 2026-09-07** — that prompt file was the only record it existed.
Open: rule 41's 11 `co2-scattered-element` + 17 `dom-order-vs-declared-order`, and rule 43's 5
real `colour-only-state-indicator` findings.
**Closed 2026-09-07 (`eebb06187`):** rule 43's 8 `ambiguous-state-property` findings, all false
positives — the detector was flagging `SgsBorderControl`'s own sanctioned 2-state border colour
mechanism (base `border-left: 3px solid transparent` → coloured), plus `box-shadow:none`
suppression rules and `::backdrop`. Fixed with 4 fixtures that each fail without their branch.
⚠ The old prompt's "23 of 45 files / ~555 entries" baseline-debt figure does not reproduce under
any reading — dropped, not carried forward.

### Track C — 8 draft PRs (#53-#60) — CLOSED 2026-09-07 (D983)
All closed + 30 stale branches deleted; all verified superseded, zero salvage (several would
have REGRESSED `main`). No further action.

## Open — carried from before (not touched this session, still real)

- **`push-theme-snapshot.py`** — last known (2026-08-18): aborts safely for mamas-munches, refuses
  to write `wp_global_styles` without a verified backup. NOT re-verified since.
- **`text-secondary` client-only slug read by framework code** (`sgs-text-variations.php:83`) —
  needs per-client resolution or a decision to seed it for all clients.
- **5 blocks missing `:focus-visible`** on `:hover`: `hero`, `icon-list`, `mega-panel`,
  `process-steps`, `testimonial` (35 comply).
- **45 attributes a client can never reach** — needs per-attribute judgement, not a blind fix.
- **Two dead components** (`StateToggleControl`, `SgsLinkControl`) — clutter, not gaps.
- **`box-shape`/`overlay`'s `:hover` rules are unguarded against touch-hover-stuck** — flagged,
  not fixed, this session (D985 detail): `scripts/hover-guard/` only scans `build/blocks/*/style.css`
  and PHP render surfaces, never `assets/css/media-atoms/*.css`. A real, named gap in the
  hover-guard tooling's coverage, shared by the whole media-atom family — not unique to this
  session's change.

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees can inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A verdict function needs the same can-this-fail proof as a gate.**
- ⛔ **A subagent must never mutate a repo file as a test fixture** — require temp fixtures.
- ⛔ **Metadata is not evidence.** Filename, line count, file existence, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines of output — never `--no-verify`; use
  the scoped `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` + `generate-attr-role-map.py`
  immediately, not at session end.**
- **A "dead control" can mean the CHILD block is missing context**, not that the control is dead.
- **An exemption heuristic must check what CONTAINS a rule** (`@media`, `@container`), not just
  the rule's own selector text.
- **NEW (2026-09-07, D983): commit straight to `main`, never open a PR, never `git stash`;
  integrate with `origin/main` after every completed task, not per session.**
- **NEW (2026-09-07): a shared custom-property-only atom (values only, never bare CSS rules)
  needing a hover/gradient pair should NOT reach for `sgs_border_gradient_css()` (masked
  `::before`-ring, emits full rules) — use the atom's own paired-custom-property pattern
  instead (`overlay.js`'s `hoverPaint`). Check the atom's OWN contract before borrowing a
  helper by analogy to a different block's border mechanism.**
- **NEW (2026-09-07): `build-deploy.py --payload` breaks the deploy↔commit deadlock** when the
  pre-commit visual-diff gate demands a live capture — scoped canary-deploy the uncommitted
  payload, capture the report, then commit.
- **NEW (2026-09-07): a dirty file in a SHARED worktree overlapping an incoming merge blocks
  the fast-forward** — don't stash/checkout over it (another track's work); rely on
  `origin/main` as the source of truth, or merge via an isolated `git worktree add`.
- **NEW (2026-09-07, D991): `build-deploy.py --dry-run` is NOT a safe preview** — it still
  builds, packages, SCPs and installs for real; it only skips the pre-deploy gate, ownership
  marker, cache purge and final verify. On a shared tree, that means it can ship another
  session's uncommitted dirty files with no `--payload` declared and no gate to catch it. Never
  reach for `--dry-run` expecting a no-op; if genuinely just previewing, read the script's plan
  output style instead of running it.
- **NEW (2026-09-07, D991): a Playwright MCP browser profile is SHARED across concurrent
  sessions** — a dispatched verification agent can find it locked (`Browser is already in use`)
  with no clean way to force it without risking another session's in-progress work. Correct
  response is to report COULDN'T-TEST and retry later, or use a distinct browser tool
  (`chrome-devtools-mcp`) that holds its own profile — never kill the lock-holding process.
- **NEW (2026-09-07, D993): `build-deploy.py` now builds+deploys from an isolated `git worktree
  add <dir> HEAD` by DEFAULT** — a shared `build/` dir is un-clobberable by a concurrent
  session's `npm run build`, and other sessions' unrelated uncommitted files in the checkout no
  longer block a fully-committed deploy (a worktree at HEAD is dirty-immune by construction). Use
  `--no-isolate` only if genuinely deploying uncommitted `--payload`/`--allow-dirty` content.

## State Snapshot

- **Branch:** `main`. `origin/main` at `32815ab12` (confirmed pushed, this session). Re-check
  `git status`/`git log` yourself before trusting this — 150+ concurrent sessions share this
  tree and it moves fast.
- **D-ceiling:** **D993** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npm run build` (sgs-blocks) — full 93-gate chain passes clean as of this session's
  last commit (`f7cb3ba36`), including the two new detectors this session added
  (`migrate-typography-full-controls.js --check`, `audit-typography-attr-declarations.js
  --check`).
- **Canary:** ✅ **Typography track deployed and live-verified 2026-09-07** (D991). ✅ **Priority 4
  (hero splitMediaObjectPosition/splitMediaWidth) also deployed and live-verified same day**
  (D992) via `build-deploy.py`'s new default worktree isolation (D993) — the deploy succeeded
  cleanly despite six unrelated dirty blocks sitting in the shared checkout at deploy time. The
  pre-commit visual-diff gate's earlier disclosed-bypasses (`reports/visual-diff/manual-skips.log`)
  are now closed out by this live check.
- **Open PRs:** **NONE** (D983 bans them; unchanged from earlier today).
- **This session's doc work (Track D close-out) is committed and pushed:** `decisions.md` (D991
  added), `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Part I typography row updated), and this
  file. Commits `780be1a91`/`2568ce0f1`, `origin/main` confirmed up to date at push time — check
  `git status`/`git log` fresh regardless, this tree moves fast.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-07-colour-conformance-text-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-07-tier-object-phase-3-next.md` |
| **Inspector gates, rule 41/43 (Track E)** | `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` |
| **Typography track (Track D) — CLOSED, all 7 tasks done** | D990 + D991 in `decisions.md`; commits `0e2f58cc2`/`8b67f5651`/`96bc9e734`/`f7cb3ba36` (build), `780be1a91`/`2568ce0f1` (doc close-out). No prompt file — deleted once consumed. |
| **Earlier session's box-shape hover work** | D985 in `decisions.md`; `reports/visual-diff/{media,hero}-2026-09-07.md` |
| **Known gap: media-atom `:hover` rules unguarded against touch-hover-stuck** | This file's "Open" section above; `scripts/hover-guard/check.js` (scope) |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Border controls standard (`SgsBorderControl`, colour helper registry) | `plugins/sgs-blocks/CLAUDE.md` "Border controls" + "Colour EMISSION helpers" |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
