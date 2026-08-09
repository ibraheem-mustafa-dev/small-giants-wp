---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-09
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-09 left things:**

- **A rule you locked yesterday was being taught wrong in nine places.** The decision was written
  into the decisions log and nowhere else — including a scanner whose own advice message told
  operators the retired version. Fixed, and then **gated**, so a tenth surface can't drift silently.
- **Your question changed the answer for three of four blocks.** Four blocks looked identical —
  each carrying container settings a client could never reach. The plan said: strip the shared
  wrapper from all four. You asked whether those settings might actually be *useful* on some of
  them. They were. For two blocks the fix was the **opposite** — wire the missing controls up. Had
  we run the plan as written, we'd have deleted capability from blocks that needed it exposed.
- **You spotted a naming problem that turned out to be framework-wide.** "Content width" is
  supposed to mean the width of an inner box wrapping the content. On 5 blocks it had quietly
  become a second plain width on the same element, under a name promising something else. Removed
  there, untouched on the 28 where it's real.
- **Two bugs that had been live for a long time.** The nav's "Item gap" control never spaced
  anything, and nav labels containing "&" reached screen readers as literal `&amp;`. Both fixed and
  proven on the real site.
- **I got things wrong three times and each was caught before it mattered.** A reviewer refuted a
  claim I'd made confidently to you; a case-sensitive search made me miss a surface; and I quoted a
  "measured" figure I hadn't measured. All three are now STOP-catalogue entries.

**Full narrative:** `memory/session-2026-08-09*.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D540**.

### ⭐ Track 1b (Spec 35) — inspector placement rule LANDED, PROPAGATED and GATED

**Nine code commits on `main`**, `e3adbf06..282a06ee`, plus this handoff's doc commit on top.

| | Session start | Now |
|---|---|---|
| Controls resolving to a panel | 1,573 (58.7%) | **1,702 (65.6%)** |
| `sgs/hero` unplaced | 61 | **30** |
| **Contested placements** | 9 (all nav-menu) | **0 — library-wide** |
| `render-without-control` findings | 243 | **130** |

#### Shipped

- **`f5a31435` + `d4d6d687`** — D537 (two-tier placement) propagated to all 9 surfaces that STATE
  it. A two-reviewer panel then found 4 real defects in that commit, including a surface the first
  pass missed. Both reviewers' findings fact-checked; one refuted.
- **`055a24ce` `e2be7f73` `ab9cb5c7`** — Task 3 vocabulary: background-media + shape-divider
  families. 5 genuine new rows (`css:text-shadow`, `css:fill`, `css:transform`, `anim:ken-burns`,
  `anim:svg-animation`), none invented. Bean's placement ruling: media sources → the background
  section; divider height + shape → the bottom of layout.
- **Also fixed in passing** — `setting-registry.json`'s `_meta` self-description was stale
  (declared 81 rows / 12 behaviour-family against an actual 87 / 18). It is the golden master's
  own account of itself; now recomputed from the data rather than hand-maintained.
- **`dc332ba1`** — **inspector-scan rule 22** `placement-rule-surfaces` (ADVISORY) + its
  `placement-rule-surfaces.json` manifest. Proven able to fail twice over: a 4-case fixture AND a
  real-tree positive control (retired framing injected into `parallax.js`, flagged, restored).
- **`4d501a16`** — D539. nav-menu EXITS the wrapper; both row blocks KEEP it and got controls
  WIRED; physics-canvas SPLIT (61 deleted, 18 wired). Three remedies, one symptom.
- **`282a06ee`** — D540. `contentWidth` deleted from the 5 blocks with no inner band; nav-menu
  lost `maxWidth` (its parent owns width).

All live-verified on the canary: **9 visual-diff reports**, each `source_sha`-bound to its staged diff.

#### ⛔ Do NOT start these

- **Re-litigating D294 vs D539.** D539 records that D294 is genuinely DEPARTED FROM, not satisfied.
  nav-menu declared `containerKind:'layout'`, which by D294's axis is a KEEP. The exit stands on
  its own measured evidence. Read D539 before touching any wrapper-exit question.
- **Grouping blocks by attribute COUNT.** That is what produced the wrong four-block plan. The
  separating test is MECHANISM: does the wrapper's arrangement CSS land on the element whose
  children the operator is arranging?
- **Adding cluster members without their `css:*`/`anim:*` rows** — `check-cluster-coverage.py` is
  a BLOCKING prebuild gate. Rows and members land together or the build fails.
- **Re-adding `ShapeDivider*Height` to the `css:height` member.** Measured: contested 9 → 19,
  reverted. The member is unscoped and two elements claim `layout`. The reason is stored on the
  member itself.

## ⭐ NEXT SESSION — orchestration plan

**Identity.** SGS framework engineer on Track 1b (Spec 35 inspector). The placement model is
locked, propagated and gated; the vocabulary is built. You are closing the enforcement gap it
exposed, then returning to the element-driven inspector roll-out.

**State recap.** Inspector controls are placed by a two-tier rule (D537): tier 1 the page part,
tier 2 the property family. It is now stated consistently in 9 places and a scanner asserts it
stays that way. A second rule landed at D540 — "content width" may only exist on a block that
renders an inner band — and it is enforced by NOTHING. That is Task 1.

> **⭐ STANDING INSTRUCTION (Bean, 2026-08-09).** At EVERY design-gate and at the CLOSE of EVERY
> implementation, run a multi-rater review — `/qc-council`, `/adversarial-council`, or the fitting
> variant — and use `/delegate` + parallel subagents rather than reviewing inline and alone. Give
> reviewers DIFFERENT angles; identical briefs reproduce one blind spot. **Fact-check every finding
> before applying it** — a reviewer was wrong once today and refuting it mattered as much as
> accepting the rest. Memory: `feedback_delegate_and_council_at_every_gate.md`.

### Task 1 — Gate the D540 `contentWidth` rule (INLINE, Opus) ⭐ START HERE

**What:** a scanner asserting that any block declaring `contentWidth` actually renders an inner
band, and that a block without one uses `maxWidth` (or `width`), never `contentWidth`.
**Why:** D540 is prose today. The drift it corrected took hold silently on 5 blocks; nothing stops
a sixth. This is the same failure mode rule 22 was built for, two decisions running.
**Estimated time:** ~20 min.
**Orchestration:** inline, Opus. Copy the SHAPE of `inspector-scan/rules/22-placement-rule-surfaces.js`
— it is this session's own worked example: a committed manifest resolved from `ctx.repoRoot` so the
fixture can supply its own, plus `mustFlag`/`mustNotFlag` cases.
**Context it won't have:** the legitimate inner-band signal is the wrapper forcing
`$grid_on_inner`/`$do_wrap` (`class-sgs-container-wrapper.php:525-533`, `:1906-1911`) or an explicit
`wrap_inner => true`; 28 blocks are legitimate and must NOT flag.
**Depends on:** none. **Parallel with:** Task 2.
**/qc gate after:** yes — multi-rater per the standing instruction.
**Acceptance:** the rule FAILS on a fixture block declaring `contentWidth` with no inner band, and
passes clean on the real tree (expected 0 findings — verify, do not assume). Registered ADVISORY
first, per E6 point 9.

### Task 2 — `tagName` on physics-canvas (DELEGATED, Sonnet)

**What:** physics-canvas declares `tagName`, the wrapper renders it, no control exists. It is the
single remaining `render-without-control` finding on that block.
**Why:** it was deliberately left outside D539's authorised scope; it is a real reachable gap.
**Estimated time:** ~15 min.
**Orchestration:** delegated, Sonnet via `/delegate`. Wire a control matching how other blocks
expose `tagName`; do NOT touch the physics runtime, `aria-hidden`, or `ALLOWED_BLOCKS`.
**Depends on:** none. **Parallel with:** Task 1.
**/qc gate after:** `/qc-inline` + `check-dead-controls`.
**Acceptance:** rule 21 findings for physics-canvas reach 0; build exit 0.

### Task 3 — Compact `MEMORY.md` (INLINE, small)

Near its **24,576-byte hard cap**. Past it the file truncates silently and rules stop loading with
no error. Move detail to topic files / `MEMORY-archive.md`; one line per entry.

### Task 4 — physics-canvas `containerKind` reclassification (DESIGN GATE, Bean signs off)

It declares `"section"` but behaves as content-KIND (box + width only, no background layers). D294's
axis keys off this. Bean-locked scope; flagged twice today and deliberately untouched.

### Dependency graph

```
Task 1 (gate the rule, Opus)  ║ parallel ║  Task 2 (tagName, Sonnet)
                    ↓ both green, build exit 0
Task 3 (MEMORY compaction)
                    ↓
Task 4 ──► Bean design-gate ──► multi-rater
                    ↓
        commit by exact path, main
```

### Methodology guardrails (every one was earned TODAY — do not skip)

- **A substring match is not a word match.** `columns` read as "wired" because of `listColumns`;
  the same class of error twice in one session, the second time after I had named the weakness.
- **Grep case-insensitively when asserting absence.** A lowercase search missed a retired rule
  printed in CAPITALS by a live script; a reviewer's case-insensitive grep found it.
- **A truncated search manufactures a false absence.** `| head -8` hid a require at line 89.
- **A preview that cannot report its own subject reads green forever.** `--dry-run` structurally
  skipped the supports writer and reported 0 drift while 3 blocks differed.
- **Unwired ≠ dead.** Same symptom, opposite remedies. Separate by mechanism, never by count.
- **A banned-phrase gate can be too broad and too narrow at once** — it fired on the documentation
  recording a rule's retirement while missing the line-wrapped instance.
- **IDE diagnostics can be a stale mid-edit snapshot.** Verify against the file.
- **Never write a measured figure before measuring it.** "Measured: 0" preceded a run returning 1.
- **Deploy needs `--payload <prefix>`, never `--allow-dirty`** — the gate's own sanctioned path for
  a deliberate uncommitted wave.
- **Visual-diff reports need `source_sha`** recomputed from the STAGED bytes, or the gate rejects
  them. Never fabricate `verdict: PASS` / `first_paint_capture_passed`.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101 —
  carry-forward count-checked this session).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter completion) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress. ⚠ This session changed
  `site-header-row` and `site-footer-row` (controls WIRED, D539) and `sgs/nav-menu` (D539+D540).
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`. The session's 9 CODE commits end at `282a06ee`; the handoff doc commit follows
  them, so HEAD when you read this is that doc commit, not `282a06ee`. ⛔ **Do not trust this line
  for tree state — run `git status`.** (An earlier draft asserted "Tree CLEAN" while seven doc files
  including this one were still uncommitted; the handoff QC caught it. A status line that describes
  the moment before its own commit is false by construction.) Still commit by EXACT PATH — a
  pre-commit gate requires a pathspec, and the visual-diff gate requires a `source_sha`-bound report
  per changed block.
- **Build:** `npm run build` exit 0, all prebuild gates passing. `check-cluster-coverage.py` green
  (69 css/anim rows) and now carries a 7-case `--self-test`. `placement-reach.py --self-test` passes.
  `inspector-scan --self-test` passes incl. the harness meta-check.
- **Canary:** deployed twice this session and live-verified (frontend + editor).
- **Pre-existing, NOT ours:** `audit-declared-vs-seeded-roles.py` 3 STALE overrides;
  `check-dead-controls` CHECK 4 advisory lists 3 fully-dead attrs (`before-after::maxWidthUnit`,
  `button::fontFamily`, `hero::subHeadline`).
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` · `git status` ·
  `git branch --show-current` · D-ceiling
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Sites:** canary = sandybrown-nightingale-600381.hostingersite.com (the ONLY site; palestine-lives.org is gone, removed from deploy TARGETS 2026-08-10)
- **Canary credentials:** `.claude/secrets/sandybrown.env` (gitignored, always available).

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| The placement model + hero's families | `plans/2026-08-08-block-level-panel-resolution.md` |
| Control-type contract | `plans/spec-35-control-type-contract.md` |
| The placement-rule surface manifest (add new surfaces here) | `plugins/sgs-blocks/scripts/inspector-scan/placement-rule-surfaces.json` |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
| Live verification evidence for this session | `reports/visual-diff/*-2026-08-09.md` (9 reports) |

## Blockers

**NONE.** Task 4 needs a Bean design-gate, which is a gate, not a blocker.

## Open — carried, not ours to close

- ⚠ **Track 2's canary (post 2164) lost a text node** 2026-08-07 — `sgs/mega-group`'s
  `templateLock:'all'` dropped a stored `sgs/text` child.
- **Residual empty `sgs/media` ChildBlock** in the art-direction walk (D514), emitter untraced.
- **Non-colour hover effects** survive the extension's deletion as a capability; build not scoped.
- **`templateMode` is inert** on both row blocks and physics-canvas — declared, referenced nowhere.
- **`gridTemplateColumns` type mismatch** between the two row blocks (string on header, object on
  footer). Flagged, deliberately not normalised.
- **The FX generator derives `draw` eligibility from `bgSvgContent`, not `allowedBlocks`** — so
  physics-canvas lost `draw` when that attr went, though its icon/decorative-image children can
  render real SVG. A modelling question, surfaced not caused by this session.
