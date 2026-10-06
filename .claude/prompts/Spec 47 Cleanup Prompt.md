Invoke /autopilot before doing anything else.

Context: Spec 47's "computed route" is the measuring tool that renders a Claude Design draft, walks the
live SGS site, and writes block settings to close the difference. Session C2 judged its findings for client
Eye Care and found the tool itself needs cleaning before it is reusable — including two WRITE HAZARDS where
the route writes a wrong value into a client's tree from a measurement artefact. Bean's decision: clean the
tool fully, closing every open point including the pairing gate that was first deferred. Nothing is built
yet; the plan is written and gated.

Read first, in this order:
- `.claude/plans/2026-10-06-spec47-route-cleanup.md` — YOUR plan, in full. It is runnable and was written
  to survive a compact: every task carries its owned files, its negative control and its wave.
- `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §5 Residual, the two bullets headed "Route defects
  found by Session C2" — the diagnosis behind each task.
- `.claude/reports/2026-10-06-session-c2/QC-ROUTE-FIXES.md` — the QC verdict that approved each proposal
  and the three modifications it imposed.

FIVE THINGS THAT WILL MISLEAD YOU IF YOU DO NOT ABSORB THEM FIRST:
1. **H2 is a LIVE bug, not a latent one — do it first.** An earlier note called it latent on the grounds
   that `transitionDuration` is `type: number`. **That was wrong.** `sgs/button`, `sgs/heading` and
   `sgs/text` are `type: number` but **do not call the helper**. All eight blocks that DO call
   `sgs_transition_vars` — `sgs/hero`, `sgs/brand-strip`, `sgs/cta-section`, `sgs/gallery`, `sgs/info-box`,
   `sgs/post-grid`, `sgs/team-member`, `sgs/testimonial-slider` — declare it `type: "string"`, default
   `"300"`. Since the helper does `preg_replace('/[^0-9]/','',$duration)`, **`"0.3"` emits 3ms and `"0.25s"`
   emits 25ms today.** Only a pure-digit string survives. Eye Care's trees use `"250"` so this client is
   safe, but any client typing a decimal gets a tenth of what they asked for. **`sgs_transition_vars` must
   refuse a non-integer rather than strip it, and it still gates P4.**
2. **Worktrees are NOT available for these lanes.** Five route test files need a built `node_modules` for
   their browser cases, and two of them (`walker-devtools.test.mjs`, `walker-l2.test.mjs`) are exactly the
   tests the hover and icon fixes need. Work on `main` with explicit disjoint pathspecs.
3. **`scripts/parity/lib/collect.mjs` is the hub and FOUR fixes want it.** They cannot be split across
   agents. One lane owns that file and does all four.
4. **You OWN THE HOST until your Wave 4 sweep completes, and two other sessions are waiting on you.**
   `.claude/prompts/Eye Care Block Fixes Prompt.md` may write code in parallel but is holding its deploy
   **and** its reseed for you; `.claude/prompts/63 Item Categorisation Work Prompt.md` starts after you.
   **Signal both when your sweep is done.** Your prediction of F 193 → 148–168 is only single-variable if
   the live site does not change, and the block-fix track closes ~19 rows of its own.
5. **The verification sweep will hit the re-keying trap.** Row identity is `ref|path|kind|property` and two
   of the fixes change emitted paths. Compare on a NORMALISED path or the delta is meaningless.

Tasks, in order.

1. **Write the collision gate first (~10 min, inline).** `scripts/computed-route/tests/check-lane-collisions.mjs`,
   holding the wave→lane→owned-file map from the plan. It must exit 1 on a double-owned path, an unowned
   dirty file, or a lane editing outside its set, and 0 on a safe partition. **Done when:** it exits 0 on a
   clean tree and exits 1 on a deliberately planted double-ownership (test the failure, or the gate is
   vacuous). The Session B checker at `.claude/reports/2026-10-05-session-b/check-queue-collisions.mjs` is
   the precedent but is block-scoped, so it cannot be reused.

2. **Write the 12 task briefs (~15 min, inline).** One file per task under
   `.claude/reports/2026-10-06-session-c2/briefs/<task>.md`, each holding the diagnosis extract, the exact
   fix, the owned files and the negative control. **Point agents at the path; never paste a diagnosis into
   a prompt** — the four diagnoses are long and pasting them into five lanes multiplies the cost fivefold.

3. **Wave 1 — the write hazards (~20 min, 3 parallel subagents).** Lanes W1-A (**H2 first, then H1**),
   W1-B (P2b1, P2b2), W1-C (P3b). Zero file overlap. Sonnet each, routed via `/delegate` at dispatch.
   Agents never commit, deploy, reseed or touch a host; they run `node --check` plus their own non-browser
   tests only. H2's PHP half needs a case asserting a decimal is **refused**, not stripped.
   **Verification:** run the gate before and after, read each diff in the main thread, commit per lane with
   an explicit pathspec, then run the full suite (523 + new, all green).

4. **Wave 2 — the hub and the gate (~30 min, 2 parallel).** W2-D owns `collect.mjs`, `compare.mjs`,
   `chrome-walk.mjs`, `state-passes.mjs`, `ref-trace.mjs` and does P3a + P3c + P2b3 + P1 plus the
   `timingSet` export. W2-E does P2a, taking `draft-live-walk.mjs` only after W1-C released it. Same gates.

5. **Wave 3 — the dependents (~15 min, 2 parallel).** W3-F does P4 (only after H2). W3-G does P3d.

6. **Wave 4 — verification and closure (~40 min, inline).** Full suite; route lint; client-name check;
   `draft-live-walk.mjs --lint` across all 17 configs now exercising P2a's `handScope`; then **`/qc-council`**
   on the whole change set (two or more fix shapes landed, which is its trigger). Then the verification
   re-sweep if the host is free — **message peer session `small-giants-wp-41` first**, and note
   eye-care-test now runs `6d6906b98`, not the `94122e326` the F 193 was measured at.
   **The plan carries a committed prediction: F should fall from 193 to roughly 148–168.** A result outside
   that band means something other than these fixes moved, and the cause must be named before the number is
   used.

   **Wave 4 also owns two pieces of work that were otherwise unassigned.** Both are measurement work needing
   this same host window:
   - **The 180 unconfirmed canvas-settable claims.** Session C2 refuted 29 from source and proved a named
     masking class, but 180 were never live-confirmed — its Playwright step was substituted with source
     analysis. Test them **by family, not by row**: they collapse to **68 families** of (cited block,
     setting, row property), and 2 reads per family covers all 68 in ~101 readings instead of 209. Families
     **span surfaces**, so surface is the wrong axis to sample on.
   - **Three host jobs Session C left owed.** The **C3.5 confirmation walk** (order 652 on eye-care-test is
     already `processing` and paid — set `EYECARE_ORDER_URL` to its order-received URL and read the key with
     `wp eval`, **never store it**); an **`sgs/media` recalibration**, because `sgs/hero`'s run recorded
     nothing across 17 qualifying settings and nobody knows whether that is legitimate; and a
     **`node scripts/parity/benchmark.mjs --noise`** re-run with control and noise back to back, since it
     caught 5 of 5 planted faults but its noise figure is unproven in both directions. Commands in
     `plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md` §"Wave 3's remaining items".

   **Then signal the two waiting sessions that the host is clear.**

7. **Docs and handoff (~20 min).** Remove from Spec 47 §5 Residual every defect this plan closes, keeping
   what it does not. Update `LEDGER.md` (656 bytes headroom — cut a finished item before adding). Mark the
   cleanup plan complete. Then `/handoff`.

Guardrails:
- **The 5 approved block fixes (A1, A2, A3, A5, A6) are NOT in this plan.** They live in
  `.claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md` §"THE OWED WORK" and are still owed.
  Do not start them here.
- **Every change ships with its negative control**: a test that goes red on revert AND a test proving it
  does not over-suppress. A fix that hides a real difference is worse than the artefact it removes.
- **Commit gates:** `node --test "scripts/computed-route/tests/*.test.mjs"` (523 plus new),
  `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`,
  `python scripts/check-no-client-names.py --check`.
- **Never stage:** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, or any path containing `Bean Points`.
- `MEMORY.md` is at 16,383 of 16,384 bytes. Cut before writing any lesson.
