# W2-E: P2a twin-containment pairing gate

Status: done (code and tests). Not run against a live surface: that needs a browser and the host, which this lane may not touch.

## What was built
- `scripts/computed-route/lib/pair-scope.mjs::judgePairScope` (new). Pure. Inputs: `draftIn` / `liveIn` (word indices inside each pair element), `matches` (matchWords index pairs), `dTexts` / `lTexts`. A matched word with at least one side inside its pair element is "checked"; it is "split" when exactly one side is inside (twin outside the other element). Words whose text repeats on either side are skipped (the matcher may have picked another occurrence, mirroring the sure/repeated split in `lib/pairs.mjs::twinPlan`). Returns `{ ok, checked, split: [{word, inside}], why }`. Box size is never consulted.
- `scripts/computed-route/lib/pairs-page.mjs::handScopes( page, finders, wordEls )`: new capture. For each hand-pair finder, the tagged-word indices inside the resolved element (null when absent or a function finder).
- `scripts/computed-route/pairs.mjs::runPairing`: computes `handScope` per hand pair resolvable on both sides and returns it. The CLI merges states (a pair is a mispair if any state says so) and writes `handScope` into `qa/pairs/<surface>.json`.
- `scripts/parity/lib/lint.mjs`: `loadHandScope( cfgPath, cfg )` reads that report via `ref-trace.mjs::pairingPath`; `lintConfig( cfg, handScope )` adds one problem per mispaired pair naming the stranded words.
- `scripts/parity/draft-live-walk.mjs`: calls `lintConfig( cfg, loadHandScope( cfgPath, cfg ) )`, so exit 1 happens at the existing lint step, before any browser launches.

## How "before a browser opens" is met
The words need a browser once, at pairing time (`pairs.mjs`, already a browser command). The verdict is stored in the pairing report; every later walk lints from that file with no browser and no host. Consequence: a config is only judged once `pairs.mjs` has been run for its surface since the pairs last changed. A surface with no pairing report, or a report with no `handScope`, is not judged.

## Tests (negative control, both halves)
Command: `node --test scripts/computed-route/tests/pairs.test.mjs scripts/computed-route/tests/lint.test.mjs`
Result: 57 of 57 pass (pairs 7 new, lint 3 new).
- Red on removal: draft step vs live title (old about-step shape) refused, both directions (pairs.test.mjs); `lintConfig` names the pair; the walker spawned on a temp config exits 1 with "config lint failed" (lint.test.mjs). Proven red: with the gate line disabled in `lint.mjs`, 2 of 13 lint tests failed; restored, 13 of 13.
- Not over-refusing: phone link (91 vs 109), submit button (166 vs 335), no-word pair, word with no twin, repeated words, unlisted-pair verdict, and a clean report all pass; walker `--lint` exits 0.
- Positive control: the corrected `sites/eye-care-ward-end/build/qa/parity/home.mjs` (read only) passes `lintConfig`, and its three about-step finders target `.sgs-process-steps__step:nth-of-type(n)`.

## Could not do
- The "6 pairs refused" expectation and the count over the 17 Eye Care surfaces: unknowable without a browser. None of the 17 existing pairing reports carries `handScope` yet, so today no surface is refused; each needs one `pairs.mjs` run to be judged.
- The 12 known-legitimate pairs are only named as phone link and submit button in the brief; I covered those two plus the structural cases, not the other ten.
- Repeated-word skipping can hide a mispair confined to repeated words; chosen to avoid refusing legitimate pairs.
