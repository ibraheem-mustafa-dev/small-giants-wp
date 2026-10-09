# Rater B - code-path tracer

## Part 1

| Claim | Verdict | Evidence (PROVES = code unambiguous; PLAUSIBLE = needs a run) |
|---|---|---|
| a. underline row stamped with pair path, not link path | CONFIRMED (PROVES the stamping; PLAUSIBLE that it breaks resolution) | collect.mjs::collectPair (~lines 128-132) reads text-decoration-line/colour/thickness from `paintedDecoration(carrier \|\| el)`; hoverStyles reads the same from `carrier`. ref-trace.mjs::TEXT_CARRIED has no text-decoration-* key, so pathKey() returns 'path' (the pair element) for style, hover and active rows. If the carrier is a nested link, the row is keyed to the block root. |
| b. no mispairOf equivalent on the write path | CONFIRMED (PROVES) | `mispairOf` is called only in triage.mjs::triageIssue. solve.mjs::writeRound and solve-rows.mjs::writableGroups gate on blocked map, node/ref, reference kind, unpaintedBorder, USED_VALUES only. d5f7e4c4a's message ("values Solve would have copied from the wrong draft element") confirms Solve writes through them. Partial mitigation: pair-scope.mjs refuses a surface at pairing time, with a deliberate evidence floor. |
| c. guard drops `tried` and re-tries | CONFIRMED (PROVES) | guard.mjs::guardRound: the settle loop adds the last suspect to `t.tried` and restores it (changed non-empty); in the same call the row loop finds `next` undefined and runs `trials.delete(r.ref)`. Next call: `trials.get` is empty, new `{tried:new Set()}`, first suspect undone again. Nothing else stops it: `blocked` and `w.reverted` are set only in confirm() (proven culprit); innocent restores set `restored` only; `prev` is unchanged so the same regression reappears. solveLoop's `changed.length -> continue` burns rounds to maxRounds*4+1. Period = suspects+1 walks. At the cap, pending()+settle() judges any open trial, so no wrongly blocked setting, but the walks are wasted. |
| d. resolveViaAncestor never writes a parent reaching several children | CONFIRMED as designed (PROVES) | resolve.mjs::resolveViaAncestor writes only when `reachedDescendants(...).length === 1`. solve.mjs::writeRound (and triage.mjs::resolveIssue) build `measured` from the distinct `owners[].path` of open rows of the same prop/state naming that owner. Owner path is path(el, ownerEl) (ref-trace.mjs::traceRef `from`), the descendant's path inside the owner, distinct per tile (nth-of-type). Four .sgs-mega-group tiles give 4 entries, so no write and the gap stays. Inverse risk: if only ONE tile has an open row (others already match), reach is 1 and the parent is written, moving the other three (guard then sees regressions). It counts open rows, not elements reached. |
| e. build failure round 1 -> ENOENT | CONFIRMED, slightly softer (PROVES) | solve.mjs::solveLoop: `!b.ok` logs `[FAIL] build in round N` then `break`, report undefined, settle skipped (prev null). The main block then does readFileSync(round-1/report.json); the walk never ran so ENOENT crashes after the [FAIL] line. No solve-report is written. A build failure in round 2+ does not crash: it reports on the stale round-N walk while the tree on disk holds unbuilt writes. |

## Part 2

### ac78fee32 (triage)
- MED: ledger `placed-after` (triage.mjs::ledgerParent) attributes any y-/x- distance row anchored on a node an entry accepts with property '*', with no comparison of the row's delta to the accepted difference. The commit's own test uses afterMap delta 109 against map h delta 414 and still gets L. A real separate offset after an accepted node is hidden as L (false negative). Fix: require the delta to be consistent with the accepted node's delta.
- LOW-MED: `same-delta` in explainRow uses PX_TOL=1; for small ledger deltas (<=2px) nearly any row on an ancestor/anchor matches. Box rows match a ledger style row by magnitude only.
- LOW: new `peers` exclusion (`!sameFrame(r.owners, c.ref, c.path)`) drops any enclosing-block row on the same element whatever its key, including a different property that could legitimately explain a box row. Plausible, not proven.
- LOW: unmeasured-side fires only when a side is null at every row (mixed rows fall through). It labels W where a genuinely absent draft element is possible; consistent with Solve classify.
- uncalibrated-fit is a rename within W. Tests have positive and negative controls and are non-vacuous (decidedBy changes).

### ba31e5157 (INERT_LAYOUT shared accept)
- HIGH: gap, justify-content, align-items, text-align and display are now accepted on every surface, any value, whenever the pair's own box matches (`ctx.boxMatches`, which is only the pair's own box rows). A same-size box says nothing about where children or text sit inside it. The old gap accept was per pair with `when: live === "0px "+draft`; the shared one has no value shape. A container with fixed or fill width whose gap is 48px against 16px, with children unpaired, is hidden. The 7 copied configs did this on 7 surfaces; this spreads it to all and adds gap. Fix: restore a `when` (gap only for the one-row `0px X` shape) and require paired inner pairs settled, as acceptHeld does.
- LOW: isAccepted consults INERT_ACCEPTS before the divergence ledger (compare-state.mjs::judge verdict order), so rows a ledger entry would have decided now carry a plain reason and vanish from triage's ledgerRowsOf (less L attribution).
- Tests: MUST FAIL is non-vacuous (rule is new); the DETECTOR test passes trivially now but would catch a re-copy.

### 65c464f4b (effectiveState)
- MED: when draft open == draft rest but LIVE paints an extra open-state style the draft lacks, the group now resolves at rest, so neither Solve nor triage looks for the open-state setting that would override it. The row ends as hardcode/F against the rest setting: wrong target, unfixable by the write. Plausible, needs a live example.
- LOW: `undefined === base[w]` treats a width with no rest reading as matching per width, so a mixed case resolves at rest without evidence. "Never read at rest" is absence of evidence.
- Tests are non-vacuous (state would be 'open' without the fix).

### d5f7e4c4a (acceptHeld, mispairOf)
- MED: acceptHeld (compare.mjs) judges only paired elements. Padding/margin/border-width/flex-grow is accepted when the pair's w/h and textX/textY match and paired descendants are settled. Unpaired descendants (icons, images, decoration) can move; with no text on either side only w/h is compared; pairSettled does not compare box x/y. A fixed-size card with changed padding and an unpaired icon is hidden.
- LOW-MED: mispairOf needs >2x size AND different words; a live element genuinely much taller because it carries extra visible words (expanded panel vs collapsed draft) is labelled W mispaired and leaves the F/T backlog. Box rows stay open.
- Tests: MUST FAIL and three negatives are non-vacuous; no integration test through compareState.

### e0660afa0 (flowOffsets nesting)
- LOW-MED: skipping the nested container means a child is measured from outside it, so a container's own shift is replayed as a row on every nested pair (the "one row where it starts" property is lost). Triage's box same-delta ancestor/anchor rule absorbs most, but row counts inflate. Plausible, not run.
- Tests non-vacuous (old code anchors gen-block on link-phone).

### e1f814775 (--site / retargetLive)
- LOW: retargetLive throws if cfg.live.url is absent or a function, only when SGS_LIVE_ORIGIN is set; an inherited SGS_LIVE_ORIGIN in the shell would silently retarget any plain walker run (spawn spreads process.env).
- LOW: pairing (pairs.mjs) and anything not passing through draft-live-walk.mjs or readWinningRules still targets the remote site. Mirror code is synced separately, so results describe the mirror's build.
- refresh-from-remote.sh: I ran the `${R//\//\\\\/}` expansion; it yields one backslash per slash (correct). The script verifies siteurl only, not the JSON replace.
- Tests: two MUST FAIL plus controls are non-vacuous.

## Suite run
`node --test scripts/computed-route/tests/*.test.mjs`: 714 tests, 711 pass, 3 fail, all in triage-manifest.test.mjs (mega-panel/mega-group padding row resolves to 'enclosing' instead of canvas-settable / no-setting). None of the six reviewed commits touch it. The test reads the live framework DB (not hermetic), and the uncommitted mega-group controls work most likely changed the DB. Not proven; recheck after that work lands.
