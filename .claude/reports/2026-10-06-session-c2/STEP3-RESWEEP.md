# Session C2 step 3 — the re-sweep at `94122e326`, and the prediction scored

**2026-10-06.** All 17 surfaces re-measured with `solve.mjs --rounds 0`, then `sweep.mjs`, then
`triage.mjs`. Scored against `PREDICTION.md`, which was committed at `51255acec` **before** any host job
so a miss is a finding rather than a narration.

## Provenance

| | |
|---|---|
| Block code measured | **`94122e326`**, verified by marker `94122e3266de2c11be1002e3cc95df4c74ecb8e8`, `at 2026-10-06T03:19:56+0100`, target `eye-care-test` |
| Baseline compared against | the committed triage files at `51255acec` (raw F 192) |
| Surfaces | 17 of 17 measured; `header` failed once and was re-run clean |
| Tree files | clean before and after. `solve.mjs` calls `addRefs` then `writeTree` unconditionally, so churn was possible; `git status` on all 17 `*.tree.json` is empty |
| Pre-flight | all 17 walker configs pass `draft-live-walk.mjs --lint` |
| Commit gates | 523 of 523 route tests pass, route lint passes, client-name check passes |

## The result

| Class | Baseline | New | Delta |
|---|---|---|---|
| **F** | **192** | **193** | **+1** |
| W | 1,242 | 1,296 | +54 |
| T | 378 | 378 | 0 |
| U | 29 | 30 | +1 |

**16 of 17 surfaces are unchanged to the row.** The entire movement is on `home`, 49 to 50.

## The prediction, scored honestly

| Claim | Verdict | Why |
|---|---|---|
| Magnitude: F falls by at most 15 | **HELD** | the change is 1 row |
| Direction: F *falls* | **MISSED** | it rose by 1 |
| Location: closes confined to `sgs/button`, `sgs/text`, `sgs/site-footer-row` | **MISSED** | the change landed on `sgs/brand-strip` |

**Why the location miss.** The prediction mapped register items to blocks by reading which blocks each
register row *named* — a proxy flagged at the time as an upper bound. Register **52**'s commit
`65573118c` edits `sgs/brand-strip` without the register row naming it, so the proxy could not see it.
The weakness was the proxy, not the reasoning.

**What the prediction got right, against the brief.** The brief expected a meaningful fall ("Expect it to
FALL — rows fixed since `7f375f765` will clear"). The prediction argued the fall would be minimal because
F lives in blocks nothing in that commit range touched. That held: 16 of 17 surfaces did not move at all,
and the eleven fixed-and-deployed register items closed nothing.

## The +1 is two measuring artefacts, not a new gap

Both new F rows are on `.sgs-brand-strip__track`, and both are artefacts by the same standard the
fact-check lanes applied:

| Row | Draft | Live | Why it is an artefact |
|---|---|---|---|
| `animation-name` | `marquee` | `sgs-brand-scroll` | Different **keyframe names** for the same effect, identical at all four widths |
| `animation-play-state` | `paused` | `running` | The draft is a static capture; the live marquee runs |

So the judgeable count did not rise. **The fact-check's 7 candidate framework fixes stand unchanged.**

## The finding that matters more than the delta: path-format churn re-keys rows

`sgs/brand-strip` kept **exactly 51 rows**, baseline and new. But **18 of them changed key**, because the
walker's emitted CSS path gained a `:nth-of-type(1)`:

```
baseline  .sgs-brand-strip__track > .sgs-brand-strip__set > .sgs-brand-strip__item:nth-of-type(1) > a
new       .sgs-brand-strip__track > .sgs-brand-strip__set:nth-of-type(1) > .sgs-brand-strip__item:nth-of-type(1) > a
```

**No verdict changed on any of the 18.** Row identity is `key = ref|path|kind|property`, so a cosmetic
path change reads as a mass close-and-reopen.

**This is a live trap for the fix stage.** Gate TAIL plans to verify fixes by capping new rows at "1 new
per 10 closed". A walker path-format change can re-key dozens of rows at once, which that gate would read
as a wave of closes and opens and either pass or fail for the wrong reason. Comparing on
`(block, path with positional selectors normalised, kind, property)` rather than the raw `key` would make
it robust. **Owed before anyone relies on Gate TAIL.**

The same trap bit this session's own delta script, which reported "1 closed, 2 opened" where the truth
was "0 closed, 1 opened, 18 re-keyed".

## The canvas-roster negative control

Run on the **new** reports, with all 12 `canvas` flags stripped from `surfaces.json` and restored in the
same command (`surfaces.json` md5 identical before and after; `git status` clean).

| | F |
|---|---|
| unstripped | **193** |
| 12 flags stripped | **346** |
| swing | **153 rows** |

**The control works and is not vacuous**, unlike the sweep-to-triage identity it replaces — that identity
cannot fail, because `lib/sweep.mjs` and `lib/triage.mjs` both import `isIssue`, `isContentRow` and
`issueKey` from `lib/issue-classes.mjs` and so agree by construction.

**C3.8's claim that stripping gives F 338 is refuted.** Measured twice, independently:

| Reports | Unstripped | Stripped | Doc claims |
|---|---|---|---|
| baseline (2026-10-06 01:26–01:59) | 192 | **345** | 338 |
| new (2026-10-06 09:36–10:12) | 193 | **346** | — |

The two measurements agree with each other and disagree with 338 by 7 and 8 rows. Session C's plan
records 338 for *both* the Gate 2 run (baseline 176) and the C3.7 run (baseline 192), noting it lands
"exactly on the raw 338 baseline". Two different baselines producing the same stripped figure does not
reconcile, and the likeliest explanation is that the Gate 2 figure was carried forward rather than
re-measured. **The roster's load-bearing status is unaffected** — the swing is ~153 rows either way.

**C3.8's claim of "zero movement on any non-canvas surface" is CONFIRMED.** Stripped against unstripped
on the five non-canvas surfaces: home 50/50, help 36/36, contact 17/17, about 0/0, lenses 0/0.

Per-surface F with the flags stripped: footer 62, home 50, product 38, help 36, lens 32, shop 30,
mega-lenses 24, contact-form 19, contact 17, mega-brands 14, mobile-menu 12, header 7, mega-help 3,
mega-sunglasses 2, about 0, lenses 0, size-guide 0.

## A quiet failure mode found in the route

`header` failed mid-sweep with a walker `TimeoutError` ("the walker wrote no report in
`…/header/…/round-1/w1440`"). It re-ran clean afterwards with **identical counts** (W 39, F 0, T 7, U 1),
so the failure was transient load, not a config fault — consistent with the documented Hostinger edge
behaviour under burst.

**The failure mode is what matters.** A failed `solve.mjs` leaves a directory that *looks* like a result
— draft caches and a `round-1` folder — but with no `solve-report.json`. Because
`lib/sweep.mjs::latestReport` globs `*/solve-report.json`, the incomplete directory is skipped and the
**previous** run is used instead. So a failed surface raises no error downstream; it silently serves a
**stale measurement as a current one**, and neither sweep nor triage flags it.

Had this sweep run as the bare loop in the brief, `header` would have carried its 01:37 measurement into
a report labelled as current, undetected. The only reason it was caught is that the runner logged
`FAILED header` and the re-run was done before any delta was computed.

**Owed:** `sweep.mjs` should report a surface whose newest report predates the sweep's own start, or
`solve.mjs` should write a failure marker that `latestReport` refuses.

## What this changes for Bean's list

Nothing in the fact-check conclusions. The candidate set is still **7 new framework fixes**, 2 register
items already decided and still to build (39-43, 34/35), 4 tree edits, and 1 unproven row.

Three items are added to the list as route debts rather than framework gaps: the Gate TAIL re-keying
trap, the stale-report failure mode, and the corrected control figure.

---

## Addendum: eye-care-test has moved off this baseline

**2026-10-06, 13:50:50.** A peer session deployed to eye-care-test, which now runs block code
**`6d6906b981be93336dbebd822e1e96b30e47c612`**, verified from the marker. **The F 193 above is recorded
against `94122e326` and must not be quoted against current HEAD.**

Two commits landed: `e62f45952` (the block-link rebuild, the substantive one) and `6d6906b98` (a gate fix
on top).

### Is the F 193 still comparable on a future re-sweep? Yes — verified on three axes

`e62f45952` changes rendered markup on six blocks: the whole-card stretched link no longer injects a
focusable empty anchor, the block's own visible link keeps its tab stop and is given the stretched
surface, and any further link to the same destination is demoted to `tabindex="-1" aria-hidden="true"`.

The peer's assurance was that no Eye Care tree enables the toggle. That is true but **narrower than the
commit**, so all three checks were run:

1. **No tree enables it.** `grep` for `sgsBlockLinkAuto` across all 17 `*.tree.json` returns nothing, and
   so does a grep for any `sgsBlockLink*` key.
2. **No default flipped.** The commit touches `product-card/block.json` and
   `responsive-logo/block.json` by two lines each, and **both are `_comment_blockLink` text only**. No
   attribute default changed. This was the real risk: "no tree enables it" would not protect against a
   default flipping from false to true.
3. **The second change in the same commit does not reach Eye Care.** `buybox/render.php` gained a
   forwarding of `band_axis` and `band_scale` so a guided tile shows the same letter as the standard tile
   and the bag line — the peer's rows 20+23 work, not block-link. Eye Care's product tree **does** set
   `pickerBandAxis: "pa_frame-size"` and `pickerBandScale: "S:52,M:57,L"`, so this had to be checked
   rather than assumed. It is safe because `buyboxLayout` is an enum of `['standard','guided']` with
   default `'standard'`, and **the Eye Care product tree never sets it**. The forwarding only affects the
   guided path, so the standard path Eye Care runs is unchanged — it already printed the letter.

**Conclusion:** Eye Care's 17 surfaces are unaffected by `e62f45952`, so a re-sweep at `6d6906b98` is
comparable to the F 193 recorded here. Record the SHA on any future sweep regardless.

### Two deploy lessons from the peer, worth carrying

- **`build-deploy.py` builds from an isolated worktree at HEAD**, so an uncommitted change **cannot
  ship** — and the deploy still prints `[DONE]` with every gate green. The peer lost a cycle to a fix
  that was never on the server. This is the same shape as this session's own stale-report finding:
  a green signal over a subject that is not the one you think.
- **A straight `md5sum` comparison reports CRLF-versus-LF as a content mismatch.** Git normalises on
  commit and the deploy ships from a worktree at HEAD, so the server holds LF while a Windows working
  copy holds CRLF. Normalise with `tr -d '\r'` before comparing, or two identical files read as different.
