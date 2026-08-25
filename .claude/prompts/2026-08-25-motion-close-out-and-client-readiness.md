# Session prompt — close out the motion track, then turn toward client readiness

**Invoke `/autopilot` before anything else.**

**This session starts in PLAN MODE and stays there until Bean has answered §3.** The point of
that stage is to ask everything at once, so the build afterwards runs without stopping.

⚠ **This session is deliberately NOT about the Stripe hero effect.** That has its own prompt:
`.claude/prompts/2026-08-25-stripe-hero-replication-poc.md`. If you are here for that, you are
in the wrong file. If both are open, the Stripe POC is the standalone scratch build and this
one is everything else.

---

## 1. Mandatory reading, in this order

1. `.claude/LEDGER.md` — establish which of the live tracks you are before touching anything.
   **Four tracks share `main`.**
2. `.claude/plans/2026-08-24-spec38-motion-register.md` — the session-close audit at the top
   states what closed, what opened, and the method failures worth not repeating.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — **in full.** Not a grep. Issues surface in
   sections you did not plan to touch, and the whole spec in context is what lets you diagnose
   them instead of guessing.
4. `.claude/decisions.md` — the motion D-numbers from 2026-08-24/25.

**Pre-conditions, checked in the same command as any commit:**
`git branch --show-current` (expect `main`) and
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
⚠ **The D-ceiling moves constantly — four tracks share this worktree.** It moved TWICE during
one session, and any number written here would be stale before you read it. Run the command;
do not trust a figure from a doc, or one you read earlier in your own session.

⛔ **The worktree is SHARED and other tracks commit into it constantly.** Commit by exact
path, never `git add -A`. Expect `build/` to vanish under you — another track's `clean:build`
deletes it. A red gate is not necessarily yours; prove it before acting on it.

**Canary fixtures — do not delete:**

| Page | What it is |
|---|---|
| 2721 | cursor field — five looks, three controls |
| 2737 | magnetic pull (FR-38-30) |
| 2740 | flowing gradient (FR-38-31) |
| 2103 / 2109 / 2113 / 2603 | the four GATE-WIRED motion-QA fixtures — deleting one breaks every blocks deploy |

---

## 2. Where the motion track actually stands

**Shipped and live-verified:** the four cursor-field looks plus `brick-reveal`; the field now
arrives and leaves with the pointer instead of snapping to each section's centre; FR-38-30
magnetic pull; FR-38-31 flowing gradient (built, live, **its look rejected** — that is the
Stripe POC's problem, not this session's).

**The editor has now been opened** and was healthy — 36 blocks, 0 invalid, 0 console errors,
all five looks in the picker, every control reachable. §9's cursor-field row turned out to be
*wrong* rather than merely unverified and has been corrected.

**Open, and roughly in priority order:**

1. **Bean's eye on the five cursor-field looks.** Mechanism is verified; aesthetics are not.
   R-31-13: numbers do not close a fidelity question. This is cheap and it has repeatedly
   found things no gate caught.
2. **The particle engine** — Sparks / Gravity dots / Ripple, one canvas engine reading the
   coordinates the emitter already publishes. **Needs its design gate first** (particle cap,
   stop-on-idle, flash ceiling) per project rule 7.
   ⭐ **The real fading trail Bean asked for is this engine's Sparks preset.** The control
   renamed "Drag weight" is momentum and is NOT it. Do not report the trail as delivered.
3. **Generative cover images** — Bean approved pursuing this. Bake a client's brand colours
   into cached cover artwork, served as static files: zero runtime cost, no accessibility
   exposure, and it solves a real complaint (SME and charity clients have no photography
   budget). It is the same capability as a palette texture, so the Stripe POC may inform it.
   Needs a proper spec, not a bolt-on.
4. **`floating-objects`** — unchanged; needs its own opt-in design gate deciding which
   children become objects.
5. **Hover-motion rollout** — the register's largest under-reported gap: ~88% of blocks have
   no hover-motion control, 10 blocks animate on hover with no way to switch it off, and
   there are 6 dead attrs. The cheapest fix is one block opting into
   `enabledExtensions:["hover"]` — the panel is built and waiting.

---

## 3. PLAN MODE — put these to Bean in one pass

Do not begin building until these are answered.

⚠ **The Stripe POC sits AHEAD of everything below and has its own prompt** — do not re-rank
it here, and do not touch FR-38-31's look until it has run. These options are what happens
alongside or after it.

**Q1 — What is this session actually for?** Ranked, with a recommendation:
(a) close out the motion track's loose ends (Bean's eye, then the particle engine design gate);
(b) start the generative cover images spec, which is the one item with a commercial argument;
(c) the hover-motion rollout, which is the largest client-facing gap in the register;
(d) something else entirely — the revenue lane below.

**Q2 — The particle engine's three limits**, if (a): particle cap, the stop-on-idle rule, and
the flash ceiling for SC 2.3.1. Bring proposed numbers, not open questions.

**Q3 — The revenue lane.** The colour-golden track's council found **11 of 1,740 commits in
30 days touched `sites/`, and none were client build work**; `build-deploy.py` has ONE target
and it is the canary. That is a standing finding about the business, not about the code, and
it has been open a while. Worth asking whether this session should be framework work at all.

---

## 4. Method — earned this week, not theory

- **Render it before claiming it.** Every visual claim that was reasoned rather than rendered
  was wrong: three "seamless by construction" tiling claims, a mesh whose scale was out by 4x,
  and a full aurora build against a reference that had not existed for years.
- **Verify the reference, not just the implementation.** Check the thing you are copying still
  looks like what you think it does.
- **An estimate is not an enumeration.** "Only 2 authorings, both test fixtures" was quoted
  from a decision, never re-measured, and was really six. The deploy gate caught it; a rename
  would have deleted real client settings, because WP drops an undeclared attr on the next
  editor save (D338).
- **A gate can hide its own invariant.** I8 ran and could fail the build but was missing from
  its label map, so the report said "all eight" when there were nine.
- **An anchor is part of the edit that moves it.** A one-token CSS fix silently invalidated
  a gate's negative control; `--self-test` caught what `--check` could not.
- **Ask the browser; do not reason about specificity.** A CSS bug was diagnosed in one step by
  enumerating which rules actually matched, after two rounds of reasoning blamed the wrong file.
- **A green gate proves nothing until you have seen it fail.** Plant the defect.
- **Verify BOTH surfaces.** Frontend and editor are different. This project once shipped
  0-of-6 blocks rendering in the editor while 5-of-5 rendered live.

---

## 5. Tooling

| Use | For |
|---|---|
| `/delegate` | every dispatch — route before spawning |
| `/qc-council` | validating a fix-shape before building it |
| `/playwright` | all live verification, frontend AND editor |
| `build-deploy.py --target sandybrown --blocks-only --payload <paths>` | every deploy. Never `--allow-dirty` |
| `check-fx-list-drift.py --check` **and** `--self-test` | after ANY fx or field-type change |
| `/sgs-db`, `/wp-blocks` | ground truth — never hardcode a count |

**Deploy gates worth knowing before they surprise you:**
- The dirty-tree guard is now **scoped to the deploy target**, so a `--blocks-only` run no
  longer blocks on dirty theme files.
- The **oldshape audit** blocks a deploy whose schema change would strand stored content. It
  is right; migrate or revert rather than forcing past it.
- The **visual-diff gate** requires a report at `reports/visual-diff/<block>-<today>.md` with
  `verdict: PASS`, a capture field, and a `source_sha:` recomputed from the STAGED bytes.
  `--payload` exists to break the deploy-then-commit deadlock: deploy uncommitted, capture the
  evidence, then commit.
