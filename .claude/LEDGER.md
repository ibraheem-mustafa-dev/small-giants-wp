---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-10
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-10 (session 3) left things** *(session 2 summary kept below; prior narrative:
`memory/session-2026-08-09*.md`)*:

- **A real styling bug was painting on a live page, and it's fixed.** A block that should sit in a
  centred 1200-pixel column was shoved to the left with a 47-pixel gap on one side only. Cause: telling
  a browser "at most 1200 wide" doesn't centre anything — you also have to say "split the leftover
  space evenly", and the newer of our two ways of storing per-device settings was only saying the first
  half. Found by measuring the live page, fixed, re-measured: **23.73 pixels each side**.
- **The same bug would have hit all 160 settings we're about to migrate.** Fixing it now cost minutes.
  Finding it halfway through the migration would have meant redoing that work.
- **Yesterday's "everything now works per device" was an overclaim, and I corrected the record.** The
  shared container *can* now do it. But **no block is wired to use it yet** — only 3 of 83 blocks opt
  in, and none of them declares the 8 newest settings in the shape the new code reads. The capability
  shipped; the wiring is the migration. That's not a blocker, it's the second half.
- **A comment in the code was promising protection that doesn't exist.** It claimed certain safety
  checks were "further down the file". There are none — the sentence was the only mention. Anyone
  reading it would have assumed cover they didn't have. Now accurate.
- **I broke the build and then found the real reason, which is worth more than the fix.** A
  *comment-only* change turned a build check from "all clear" to "73 problems", blocking the build. The
  cause: our checker strips comments in the wrong order, so a file path with a `*` in it written inside
  a comment silently deleted a chunk of real code from what the checker examines. It then blamed the
  code instead of itself. Fixed with your approval, plus a test proving it can catch this — and that
  test caught **its own** blind spot first (it passed while the bug was deliberately switched back on).
- **Two other places in the codebase had the same trap**, harmless only by luck. Now neutralised.
- **A database staleness bug fixed**: the gallery block's settings had changed shape months ago but the
  database still described the old shape, so every tool reading it was working from a dead model.

**Where 2026-08-10 (session 2) left things:**

- **The shared container is now FULLY responsive by design, not block by block.** You asked for the
  wrapper to be fixed once so no block needs "individual fixes that require forking". **Every one
  of the 14 settings that was desktop-only now works per device** — row-vs-column (the commonest
  mobile need), spacing, colours, shadows and the content band. (Precisely: 16 of its settings
  carried a CSS property with no per-device option; 14 were styling and all 14 are done, and the
  other 2 are motion, which a different spec governs. Settings that already worked per device are
  untouched.) It took
  **rows in a list, not a rewrite**: the generic machinery already existed and nobody had fed it
  these properties. Adding the next one is a single line.
- **A styling bug was found painting on a real page — and it pre-dated today.** A container was
  emitting the literal text `max-width:Array` instead of a width. It was never caused by today's
  work: any block whose setting was left untouched hit it, so the header and footer rows have been
  doing it since that system was built. Found by checking the live page, fixed, and re-verified.
- **The thing that made this possible was this morning's toggle.** Adding per-device options used
  to mean more controls on screen. With one global Desktop/Tablet/Mobile switch, it adds **zero** —
  so "make everything responsive" and "reduce clutter" turned out to be the same job, not opposites.
- **Two controls that were quietly lying to clients are gone.** A gallery panel with 16 spacing
  controls threw away everything typed into it (WordPress discards settings a block doesn't
  declare — no error, nothing). And a min-height panel no block could actually reach.
- **Two bits of styling had been dead on real pages.** Desktop image height and object-fit never
  worked — the CSS was waiting for something the code stopped producing months ago. Found and fixed.
  The identical fault in hover effects was found too.
- **A review panel checked the whole session and found three things**, all fixed: a hidden trap
  waiting to bite the next piece of work, a missing record of your approval, and three wrong numbers
  (now re-measured properly).

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D553**.

### Shipped 2026-08-10 session 3

| What | Commit |
|---|---|
| **Object-shaped width bands never centred** — flat path's missing `margin-inline:auto` twin | `1979c419` |
| Wrapper `:128` comment promised `! $object_model` gates that do not exist | `a6e0f390` |
| Centring guard requires a REAL tier value (`[]` is UNSET, not a value) + my build regression | `9b4722a9` |
| **`check-dead-controls` stripper: line comments BEFORE block comments** (+ Test G, proven able to fail) | `f11b122a` |
| D552 + D553; 2026-08-08 plan §4/Phase 4 marked SUPERSEDED | *(this commit)* |

### ⭐ Track 1b (Spec 35) — inspector control standardisation

**Phase 1 is CLOSED.** 1.1/1.2/1.3 shipped in session 1; 1.4a/1.4b/1.4c/1.4d in session 2.

#### Shipped 2026-08-10 session 2

| What | Commit |
|---|---|
| `inspector-scan` **rule 26** — the detector, built BEFORE any edit | `629971c7` |
| 1.4d — folded the two "… by viewport" duplicates; live-verified BOTH editors | `a05194e3`, `ed41a748` |
| 1.4b — deleted the unreachable min-height panel | `2e48c3ff` |
| Un-gated image-control CSS that could never match | `8b07cdb9` |
| `sgs/gallery` → FR-37-16 object model; `ResponsiveSpacingPanel` retired | `0e6209e6` |
| 1.4c — hero's 3 mobile-only orphans → responsive triples | `0d7b32ec` |
| **Six wrapper layout properties tier-capable, generically** | `2056af6a` |
| `survey:responsive-shape` census + `gridAutoRows` guard + D548/D549 | `05f3ecad` |
| D550 — council falsifications, three numbers corrected | `f305cba8` |
| Docs sweep: LEDGER + contract §12 + baseline re-derived | `5f13e46b` |
| D551 — problematic universal extensions → disconnect + opt-in | `cc91128d` |
| Hover effects were DEAD on the frontend — un-gated per PROPERTY | `7908a22f` |
| **Wrapper STAGE 2 — all 8 remaining properties tier-capable** | `dc1f0023` |
| **`max-width:Array` painting live — empty `{}` is UNSET, not a value** | `57a0d019` |
| Doc sweep: blocks CLAUDE.md + Spec 35 Part M | `92c8bbae` |
| **`survey:dead-css` — static dead-CSS detector, proven on the pre-fix snapshot** | `6afe843c` |
| STOP catalogue E12 (189 → 197) | `5eccf090` |

#### ⛔ Do NOT start these

- **Re-deriving the canonical control set** — `plans/spec-35-control-type-contract.md` is
  AUTHORITATIVE. Read it before designing anything.
- **Stripping native `color`/`__experimentalBorder` supports** (D542). ⚠ `spacing` was knowingly
  removed from `sgs/gallery` ONLY (D548) — that is a per-block, documented reversal with a stated
  cost, NOT a general licence.
- **Re-adding any per-control device switcher** — rule 25 flags it.
- **Restoring `localStorage` on the toggle** — its absence is deliberate (D546).
- **Rebuilding the rejected inspector census** (D543).

### ⭐ NEXT SESSION — BUILD P1 + P2, then start migration pass 1 (`gap`)

**All 7 steps of `go-track-1b-mossy-babbage.md` are DONE.** The design gate is CLOSED — Bean ruled all
three questions at D554: **property-by-property**, **trash-not-migrate** the old canary pages, and
**gate the clone output** while the converter stays flat.

**Read first:** `.claude/plans/spec-35-flat-to-object-migration-design.md` (the sequencing + P1/P2
design, awaiting nothing — it is signed off) and `.claude/plans/spec-39-seed-requirements.md`.

**The next build, in order — no block edit until both are green:**
1. **P1** — the phase-aware storage-shape gate, with a positive AND negative control per assertion and
   **proven able to fail on the real tree**. Same-commit change to `lint-responsive-controls.py:106` +
   contract §12 field 1 (they currently call flat canonical while §12's amendment says object).
2. **P2** — `/sgs-update` seeding for object attrs. **Settle the `css_property = NULL` question first**
   by reading the extraction — the shape is NOT the cause (gallery's object `maxWidth` keeps
   `css_property`), so it is probably a fossil. Prove the reseed on one migrated block.
3. **Then migration pass 1: `gap`** (object already on both row blocks, so the mechanism is proven live).

⛔ Still not delegable: P1 and P2. The 160 families are only "repetitive" *behind* a proven detector and
correct seeding.

*(Historical: the older `go-track-1b-playful-hamster.md` remains the programme-level plan, Phases 0-4,
still valid for scope.)*

**Superseded detail from earlier in this session, kept for context:**

- **Step 6 — sequence the AUTHORISED flat→object migration.** Bean authorised the migration itself and
  set the ordering rule: **the block standard leads, the cloning pipeline is reworked afterwards** to
  the universalised norm, so the converter's missing object emitter is scheduled work and NEVER a
  precondition. Deliverable is a design document for Bean's approval, then `/qc-council`. ⛔ Two hard
  prerequisites are DESIGNED in Step 6 and BUILT next, before any block edit: **P1** the `--check` gate
  proven able to fail (and expressing the PHASE — flat is conforming for an un-migrated block, object
  for a migrated one), **P2** `/sgs-update` seeding reworked so object-shaped attrs and their unique
  identifiers seed correctly. P2's deciding question is the `css_property = NULL` item under *Open*.
- **Step 7 — capture Spec 39 seed requirements** (`.claude/plans/spec-39-seed-requirements.md`). Spec
  39 does not exist yet; 38 is the highest live spec. Capture inputs, do not write the spec.

⚠ The older `go-track-1b-playful-hamster.md` remains the programme-level plan (Phases 0-4) and is
still valid for scope; `mossy-babbage` is the live execution plan.

Bean-directed: continue the ORIGINAL planned work. Phase 1 is done; the plan's later phases are not.

**The delegation brief is measured and ready.** `npm run survey:responsive-shape` — 83 blocks, 311
tier families: **185 flat**, 32 declaring BOTH shapes, 94 orphans. **160 are real migration
candidates across 41 blocks** — the script's own `MIGRATION CANDIDATES` list.
⚠ Do NOT quote the `cascading_value` hint total (173) as the work-list: it also counts 13
`both_shapes` families that are ALREADY tier-capable, which the candidate list deliberately
excludes (`shape=="flat_tiers" and hint=="cascading_value"`). Quoting 173 overstates the work by 13. The survey separates them from families that are
CORRECT as-is and must NOT be migrated blindly: **36 `asset_like`** (a per-tier ASSET is a different
resource per device — `sgs/media`'s tiers are a deliberate runtime swap, D521) and **7 `flag_like`**
(conjunctive per-device flags the operator must see all of at once). The 94 orphans are explained:
79 `padding*`/`margin*` per-side + 11 `borderRadius`, whose base lives in native supports.

This is repetitive deterministic work → route via `/delegate` per Bean.

**Also queued:** Phase 3.2a's `--fix` on the length survey (survey finished, no open design
decision) · Phase 2.1 opt-in inversion (biggest payoff — 59% of live inspector controls come from
universal extensions — gated on deriving the opt-in list from actual `post_content`, not
`hideExtensions`, per D545).

### ⭐ Phase 2.1 SCOPE EXPANDED — Bean-directed 2026-08-10 (D551)

**`hover-effects`, `block-link` and the other problematic extensions get DISCONNECTED from blocks
and made OPT-IN.** This is part of Phase 2.1, not a separate errand.

Why they are wrong at the root, not merely untidy: they create **single-state colour pickers**
(contract §6's banned lookalike — canonical is `StateToggleControl`, one toggle per attr GROUP
covering BOTH states), and they **do not apply the effect to the element** — they paint the block
root, the same defect the element-driven inspector work exists to remove.

⛔ **STOP REPAIRING THEM.** Effort spent making a legacy extension correct entrenches a mechanism
being removed. Today's `7908a22f` hover fix is KEPT only because it is already done and measured
harmless (ZERO stored hover attrs on the canary, positive control 1706) — do not extend it.

⚑ **Transferable lesson:** that dead CSS sat inert for months because **nobody uses the feature**.
A defect nobody can trigger is weak evidence the feature is worth having. **Check whether a thing
is USED before investing in making it correct** — the census that answered it took one command.

### Methodology guardrails (earned; do not skip)

- ⭐ **A text count of an identifier discussed in comments is wrong BY CONSTRUCTION.**
  `<ContainerWrapperControls` appears in prose in six files that record having STOPPED using it.
  This contaminated the count **three times in one session** (24 mounts → 16; then a 10/6 split that
  is really 11/5). Naming the trap twice did not stop it. **Use an AST/JSX-element count.**
- ⭐ **Historical baselines: rebuild the tree, don't trust a remembered number.**
  `git archive <sha> -- plugins/sgs-blocks theme | tar -x -C $SNAP`, symlink `node_modules`, run the
  real scanner. ⚠ **Include `theme/`** — omit it and rules 17/20 silently mis-measure. This settled a
  three-way dispute (243/254/245) on the third independent run.
- ⭐ **`inspector-scan --json` has NO top-level `findings` key** — it is `rules[].findings`, filtered
  to `status:"FLAGGED"`. The wrong key returns `[]` and looks exactly like a clean pass.
- **A green build proves almost nothing about editor JS.** `lint:js` is NOT in `prebuild`.
- **`lint:js` raw is useless** — 12,969 pre-existing problems, 12,111 prettier CRLF noise, 66
  pre-existing `no-undef`. Lint the CHANGED FILES and diff the rule-count PROFILE.
- **Match a file's own formatting** — writing tabs into a 2-space `package.json` churned 66 lines
  for a 3-line change.
- **A gate firing is evidence about your data.** Deleting dead code moved rule 21 129→135; the +6
  were REAL findings the dead code had been MASKING (a metric counting name-presence rather than
  reachability rewards keeping dead code).
- **Fact-check every rater finding.** This session: one was overstated 6× (1 of 6 properties truly
  exposed), one framing challenge was refuted in code, and one rater was right where I was wrong.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (a pre-commit gate requires a pathspec; the visual-diff gate requires a `source_sha`
  in the report, and REJECTS a report still carrying a previous change's sha — that is the
  stale-report defence working, not a bug).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's reference markup).
  `plugins/sgs-blocks/err_tmp.txt` is a 0-byte pre-existing stray, safe to delete.
- **Baselines, re-derived 2026-08-10 and safe to cite:** `inspector-scan` rule 21 = **129** at
  `cb209dc1`, **133** now (+6 unmasked by the dead-panel deletion, −2 unattributed — no
  pre-dispatch snapshot was taken; **snapshot `rules[].findings` before any concurrent dispatch**).
  Tree-wide at `cb209dc1` = **245 FLAGGED / 259 raw** (the earlier 243/257 and 254 are BOTH wrong).
  Rule 26 = **3**. Denominator **83**.
- **Build:** `npm run build` exit 0, all gates green. `survey:selftest` 47 assertions across six
  detectors. `inspector-scan --self-test` green incl. the harness meta-check.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com — **the only site**.
  Credentials `.claude/secrets/sandybrown.env` (gitignored, always available).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| The standardisation programme (RESUME HERE) | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| This session's plan + wrapper design | `C:\Users\Bean\.claude\plans\invoke-autopilot-before-doing-memoized-locket.md` |
| Decisions (D-numbered) | `decisions.md` — D546-D550 are today |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

**NONE.**

## Open — carried, not ours to close

- ✅ **CLOSED 2026-08-10 s3 — `sgs/gallery` page 1591 migration.** It had **already been run** in a
  prior session; this item was stale. The script is idempotent and correctly reported 0 posts. Stored
  content verified `contentWidth:{"desktop":"1200px"}` + `padding:{"desktop":{48/24/48/24}}`, no
  `style.spacing` remaining, and the live page now renders a **centred** 1200px band (23.73px each
  side, measured at a viewport where 1200px actually constrains).
- ✅ **CLOSED 2026-08-10 s3 — wrapper Stage 2 live-editor verification, with the honest scope.**
  Verified in BOTH surfaces, 0 console errors: post editor renders the object-model panel *"Spacing &
  width (per device)"*; `core/editor.getDeviceType()` resolves in the **site** editor too. ⚠ The
  honest result is that **Stage 2's 14 properties are CAPABILITY-ONLY — zero reachable instances**
  (only 3 of 83 blocks opt in, none declares them object-typed). Reachable: `gap` ×2,
  `gridTemplateColumns` ×1, `contentWidth`/`maxWidth`/`padding`/`margin` ×3. See D552 §2.
- ✅ **RESOLVED 2026-08-10 s3 — the `inspector-scan` count. THIS DOC WAS RIGHT.** Live at HEAD: rule 21
  = **133** FLAGGED (145 findings, 12 BASELINED), tree-wide **250**. My 98/215 reading was a real
  measurement of a tree corrupted by the stray-sequence bug (see D552 §4) — **proven by re-injection**:
  putting the sequence back reproduces 98/215, removing it restores 133/250. ⭐ The same bug moved TWO
  gates in OPPOSITE directions: +73 false in `check-dead-controls`, −35 hidden in rule 21. Safe to cite
  133/250 at HEAD and 129/245 at `cb209dc1`. **Still re-measure rather than trusting this line.**
- ✅ **RESOLVED 2026-08-10 s3 — `/sgs-update` stage count.** **14 numbered slots, 13 implemented**
  (Stage 3 `[RETIRED — merged into Stage 2]`, no `def stage_3_`). Source of truth is the script's own
  docstring `sgs-update-v2.py:1-63` + `choices=range(1, 15)` at `:6398`. Root `CLAUDE.md` corrected to a
  pointer after drifting three times. Do not cache the number here either.
- ⛔ **OPEN, and it decides P2's design — `css_property = NULL` on object attrs is NOT caused by the
  shape.** Refuted 2026-08-10 s3: gallery's *object* `maxWidth` retains `css_property = max-width`
  while the row blocks' object `maxWidth` is NULL. Most likely a fossil (Stage 1 updates `attr_type`
  without clearing `css_property`). **Read the seeder before designing P2.**
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had a
  value. Needs its own design; ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **blub :5050 is DOWN** (HTTP 000, diagnosed). Re-POST pending lessons to `/api/learning`.
- **`MEMORY.md` at ~24,420 of 24,576 bytes** — a real compaction (archiving, not trimming) is owed
  and blocks new entries.