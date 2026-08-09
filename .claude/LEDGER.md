---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-09
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-09 left things:**

- **The thing that was blocking everything turned out not to exist.** The plan said 54% of a block's
  controls fall into a "block-level panel" nobody had designed, and designing it was the next job. On
  the hero block that was 76 controls. The real number that genuinely belongs there is **four**. The
  rest were gaps in the data, not a missing design.
- **Your two-tier rule needed no invention.** You said tier 1 is per element, tier 2 is per
  property-family. Those six property families were *already* defined in the codebase, and every one
  of the 283 elements already declares which it has. The measuring script just never read the file.
  Teaching it to read it moved control placement from 46% to 59% without editing a single block.
- **I gave you a number that was wrong by seven times.** I reported 175 "contested" controls. It was
  25. My detector was counting controls that had already been explicitly assigned. I only caught it
  by checking the tool against a block whose answer I already knew — which should have happened
  before I quoted it, not after.
- **The reviews earned their keep.** Two independent reviewers ran in parallel. One found I'd
  overclaimed that my script matched an existing one. The other mutation-tested my self-test to prove
  it could actually fail. One of its findings was itself wrong, and refuting it mattered as much.
- **Twice I told you a change was small and safe. Twice the build gate proved otherwise.** Nothing
  shipped either time — the gate caught it, not me.
- **You made a call on nav-menu** — a specialised block shouldn't inherit the universal wrapper's
  whole control set. That's recorded as D538 and explains a real defect: nav-menu carries 17
  container controls a client can never reach.

**Full narrative:** `memory/session-2026-08-09*.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D538**.

### ⭐ Track 1b (Spec 35) — Phase 0/1 shipped; the Phase 2 blocker is DISSOLVED

**The "design the block-level panel" task is closed — there was almost nothing to design (D537).**
Of `sgs/hero`'s 76 unplaced controls, **4** are genuinely block-scope (`variant`, `templateMode`,
`tagName`, `layout`) and take the pinned Settings panel. The rest are data gaps with named owners.

**The model, in one line (D537):** tier 1 is the element; tier 2 is the property-family (the element's
declared `clusters`, ordered and labelled by `cluster-member-sets.json`); controls that style nothing
take one **Settings** panel pinned first. Prior art checked before deriving — Gutenberg PR #77279
moves core the same way.

**Measured, re-derivable via `python plugins/sgs-blocks/scripts/placement-reach.py`:**

| | Session start | Now |
|---|---|---|
| Controls resolving to a panel | 1,236 (46.1%) | **1,573 (58.7%)** |
| `sgs/hero` unplaced | 76 | **61** |
| Contested (panel undetermined) | — | **9**, all in `nav-menu` |

#### Shipped this session

- **`02786254`** — tier-2 cluster-member resolution in `placement-reach.py`, honouring
  `appliesToLayers` exactly as the conformance checker does. 46.1% → 58.6%, no block edited.
  Design doc: `plans/2026-08-08-block-level-panel-resolution.md` (homes all 61 of hero's residual in
  eight named families).
- **`2b93330c`** — contested placements REPORTED, never silently tie-broken. The winner had been
  decided by block.json key order, so reordering that file — a content-free change — moved controls
  between panels. Ordering is now (prefix length, declared `order`, element key), asserted by a
  self-test that reverses the key order and demands the same result.
- **`1da8fedb`** — the detector bug (175 → 25), the suffix-family ownership rule (25 → 12), and three
  blocks' manifest gaps closed (12 → 9): `sgs/button` font-family → button, `google-reviews` +
  `trustpilot-reviews` max-width → wrapper.
- **Two independent reviews**, dispatched in parallel on different angles. Findings applied; one
  refuted (a "91 dead attrs" claim from a file-scoped grep — the repo's own gate reports 3).
- **A silent-degradation path closed** — `_load_clusters()` returned `{}` with no error if the cluster
  file lost its key, making the script report the exact pre-change figure while measuring nothing.

#### ⛔ Do NOT start these

- **Adding members to `cluster-member-sets.json`** without new `css:*` rows in `setting-registry.json`
  first. `check-cluster-coverage.py` indexes ONLY `css:*`/`anim:*` rows and is **BLOCKING GATE 1/3**
  in prebuild. Two attempts to shortcut this were refuted by the gate.
- **Hero POC / rolling the model across blocks** — Task 3 (`contentAttrs`) comes first; it is declared
  by ZERO blocks, so the content half of the model resolves for nothing.
- **Deleting the universal hover extension** — 48 blocks rely on it solely; capability first.
- **Re-sorting blocks' panels by hand** — re-derived by the model or not at all.

## ⭐ NEXT SESSION — orchestration plan

**Identity.** SGS framework engineer on Track 1b (Spec 35 inspector). The Phase 2 blocker is gone;
you are propagating a Bean-locked model into the places that enforce it, then extending it.

**State recap.** The inspector is hand-written per block. The plan renders it FROM each block's own
`supports.sgs.elements` map (82 of 83 declare it; 283 elements). Bean locked a two-tier placement
model (D537): element, then property-family. The resolver implements it and measures 58.7%. What
remains is (a) propagating the rule into the four places it lives, (b) making the enforcement and
seeding scripts agree with it, (c) the background-media vocabulary, (d) nav-menu's wrapper exit.

> **⭐ STANDING INSTRUCTION (Bean, 2026-08-09).** At EVERY design-gate and at the CLOSE of EVERY
> implementation, run a multi-rater review — `/qc-council`, `/adversarial-council`, or the fitting
> variant — and use `/delegate` + parallel subagents rather than reviewing inline and alone. Give
> reviewers DIFFERENT angles; identical briefs reproduce one blind spot. Fact-check every finding
> before applying it. Memory: `feedback_delegate_and_council_at_every_gate.md`.

### Task 1 — Propagate the tier-1/tier-2 rule to all four places (DELEGATED, Sonnet)

**What:** fold D537 into every place the placement rule is stated or enforced.
**Why:** amending a rule's statement is not amending its distribution — the last session shipped a
corrected rule while 9 restatements and a wired scanner still taught the retired one (E9).
**The four places (mapped read-only this session, do not re-derive):**
`specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` · `plans/spec-35-control-type-contract.md` (12
per-control-type `Tab` fields + §6) · `scripts/inspector-scan/rules/01-tab-group.js` (prints the rule
as its fix message) · `scripts/consistency/check-cluster-coverage.py`.
**Estimated time:** ~30 min.
**Orchestration:** delegated, Sonnet via `/delegate`. Context it won't have: the rule is D537 in
`decisions.md`; the scanner's fix MESSAGE is a restatement and counts as a fifth surface.
**Depends on:** none. **Parallel with:** Task 2.
**/qc gate after:** yes — grep every restatement AND every enforcer; a count of surfaces agreeing must
equal N+1.
**Acceptance:** no surface states the single-tier rule; `npm run build` exit 0.

### Task 2 — Make enforcement + seeding agree with the new classifications (INLINE, Opus)

**What:** Bean's explicit ask — check that the enforcement scripts and the seeding scripts reflect any
new classification, and run whatever check/update is needed for new data.
**Why:** three `block.json` `attrMap` entries changed this session. `/sgs-update` seeds
`block_attributes` from block.json, so the DB may now disagree with the files.
**Estimated time:** ~30 min.
**Orchestration:** inline, Opus. ⚠ **`/sgs-update` is a shared-DB reseed and is a CROSS-TRACK action**
— it has broken both tracks' builds before (memory `a-shared-db-reseed-is-a-cross-track-action`). Run
`--check`-style verification FIRST and read what it would change before any write.
**Depends on:** none. **Parallel with:** Task 1.
**/qc gate after:** yes — `/qc-inline`, plus `npm run build` exit 0 before and after.
**Acceptance:** DB and block.json agree; no gate newly fails; any reseed is reported to Bean with what
it changed.

### Task 3 — Background-media vocabulary (INLINE, Opus — DESIGN GATE, Bean signs off first)

**What:** new `css:*` rows in `setting-registry.json` (87-row golden master) for background video,
SVG, Ken Burns, gradient angle/from/to and shape dividers, plus their cluster members.
**Why:** it is hero's largest family — 21 of its 61 — and the biggest single remaining move.
**Estimated time:** ~1h including the gate.
**Orchestration:** inline, Opus. ⛔ **Design-gate BEFORE building (Rule 7).** Two prior attempts to
call this small were refuted. Scope members `appliesToLayers: ["OUTER"]` — five of hero's elements
declare `fill`, and unscoped members arrive contested five ways (measured: with scoping, contested
stayed flat at its then-current figure while placement rose). Rows and members must land TOGETHER —
the gate requires every `css:*` row to be clustered exactly once.
**Depends on:** Bean sign-off. **/qc gate after:** yes — multi-rater per the standing instruction.
**Acceptance:** `check-cluster-coverage.py` green, `npm run build` exit 0, hero's block-level drops,
contested does NOT rise.

### Task 4 — nav-menu exits the universal wrapper (DESIGN GATE, Bean signs off first)

**What:** implement D538 — a specialised block stops inheriting `SGS_Container_Wrapper`'s whole
vocabulary.
**Why:** nav-menu declares **17 container attributes with no controls anywhere**, frozen at defaults;
its 9 contested placements are a symptom. Same family: physics-canvas 79, site-header-row 12,
site-footer-row 12.
**Orchestration:** ⛔ shared-mechanism change — design-gate first (Rule 7), then multi-rater.
Open within it: scope, the other three blocks, and whether `bar` should stay `layer=GRID` given the
wrapper emits arrangement CSS at `$grid_sel` (the block root), never at the `<ul>`.
**Depends on:** Bean sign-off. **Acceptance:** Bean's eye + no capability lost.

### Task 5 — Compact `MEMORY.md` (INLINE, small)

At **23.7KB against a 24,576-byte hard cap**. Past it the file is silently truncated and rules stop
loading with NO error. Move detail to topic files / `MEMORY-archive.md`; keep one line per entry.

### Dependency graph

```
Task 1 (propagate rule, Sonnet)  ║ parallel ║  Task 2 (enforcement + seeding, Opus)
                    ↓ both green, build exit 0
Task 3 (background vocabulary) ──► Bean design-gate ──► multi-rater ──► build
                    ↓
Task 4 (nav-menu wrapper exit) ──► Bean design-gate ──► Bean's eye
                    ↓
        commit by exact path, main
```

### Methodology guardrails (every one was earned — do not skip)

- **Validate a detector against a KNOWN answer before quoting its number.** A 7x-inflated figure
  reached Bean and a commit message this session. One block whose answer was already visible caught it.
- **A row existing in the data is not the gate accepting it.** Read the gate's index, not the source.
- **Enumerate every consumer before calling a shared-file change small** — and check each is blocking
  or advisory. A reassurance is a claim needing the same evidence as a finding.
- **Verify your own worktree before acting on a peer's account of it.** `git diff --stat`. A peer
  reported clobbering work that was intact and offered a patch that would have double-applied.
- **`git add` is not atomic with the commit after it.** A failed pathspec staged nothing and the
  commit still succeeded, describing 140 lines it did not contain. Verify `git show --stat HEAD`.
- **A prose note asserting absence tells you where its author searched.** Two false "it doesn't exist"
  claims this session, both from file-scoped searches missing shared `includes/`.
- **An explicit declaration outranks a reachable name** — that is why the contested figure was wrong.
- **Never invent a tie-break; report the ambiguity.** Silent tie-breaks hid a key-order dependency.
- **A surface your change TOUCHES is not "out of scope".**
- **Verify BOTH surfaces — frontend and editor.** The editor is where non-technical clients live.
- **Use the canary credentials** — `.claude/secrets/sandybrown.env`, always available, no need to ask.
- **State the predicate with any derived count.**
- **Before `rm -rf`, list the path and check `git ls-files`.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped; §E10 is this
  session's — 176 entries, carried forward from 170).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
  `reports/2026-08-02-pipeline-routing-review.md`.
- **Track 1c** (Spec 31 converter completion) — build shipped; open item is PROOF not build,
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
  `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main` at `1da8fedb`. **Tree CLEAN** — 0 dirty, 0 untracked, 0 stashes.
  Still commit by EXACT PATH — a pre-commit gate requires a pathspec.
- **Build:** `npm run build` exit 0, all prebuild gates passing. `check-cluster-coverage.py` green
  (64 css/anim rows covered). `placement-reach.py --self-test` passes with negative + positive
  controls.
- **Pre-existing, NOT ours:** `audit-declared-vs-seeded-roles.py` reports 3 STALE override entries
  (`responsive-logo.alt`, `cart.ariaLabel`, `tabs.blockLabel`). Advisory by construction in prebuild
  (`|| echo`). Untouched by this session.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` · `git status` ·
  `git branch --show-current` · D-ceiling
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (heading-anchored — the unanchored form once matched hex colour `#0D5557` and reported D5557).
- **Sites:** dev = palestine-lives.org · canary = sandybrown-nightingale-600381.hostingersite.com
  (WP 7.0.3, read from `wp-includes/version.php` 2026-08-08).
- **Canary credentials:** `.claude/secrets/sandybrown.env` (gitignored, always available).

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| The block-level panel resolution + hero's 61 homed | `plans/2026-08-08-block-level-panel-resolution.md` |
| The live design | `plans/2026-08-08-element-driven-inspector-design.md` |
| Control-type contract (⛔ still states the SINGLE-tier rule — Task 1) | `plans/spec-35-control-type-contract.md` |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
| Prior sessions | `memory/session-YYYY-MM-DD*.md` |

## Blockers

**NONE for Track 1b.** Tasks 3 and 4 need a Bean design-gate before building, which is a gate, not a
blocker. `--target palestine-lives` still aborts on `oldshape-audit`; that site is disposable Indus
staging and blocks nothing.

## Open — carried, not ours to close

- ⚠ **Track 2's canary (post 2164) lost a text node** 2026-08-07 — `sgs/mega-group`'s
  `templateLock:'all'` dropped a stored `sgs/text` child. Track 2 should re-count text-owning nodes.
- **Residual empty `sgs/media` ChildBlock** in the art-direction walk (D514), emitter untraced.
  Blocks the `scalar-media` retirement.
- **Non-colour hover effects** (`sgsHoverScale`/`Shadow`/`ImageZoom`/`Grayscale`) survive the
  extension's deletion as a capability — placement decided (design §10.1), build not scoped.
- **`_meta` drift in `setting-registry.json`** — declares `total_rows: 81` and `behaviour-family: 12`;
  actual is 87 and 18. Cosmetic, but it is the golden master.
