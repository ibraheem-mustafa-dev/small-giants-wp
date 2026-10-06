# The walker's catch rate and noise figure, both halves measured

Status: **COMPLETE.** Run `2026-10-06T20-42-21`, all 10 runs back to back on a quiet remote host
(`.claude/reports/2026-10-06-session-c2/benchmark-noise/`, `summary.md` + `summary.json`).

```
cd plugins/sgs-blocks
NODE_EXTRA_CA_CERTS=<certifi cacert.pem> node ../../scripts/parity/benchmark.mjs --noise --out <dir>
```

Session C left this "unproven in both directions": it had caught 5 of 5 planted faults, but read 13 noise rows
on shop and 9 on lens where an earlier run read 0. A first attempt tonight was stopped at 4 of 10 runs to free
the host, which yields no catch rate and no noise figure at all. This run completed.

## Host conditions, because they are the variable under test

The question this benchmark exists to answer is **walker flakiness or host load**, so the host state is part of
the result, not context. The host was quiet: peer `small-giants-wp-e6` finished its deploy and reseed and
confirmed it would not deploy or reseed again; peer `small-giants-wp-d8` was asked to hold and did, with its own
reseed 40 minutes out. No deploy, reseed, build or page write from any session ran inside the window.

**The live SHA moved before this run** — `e6`'s deploy landed between the F 193 → 173 sweep and this benchmark.
The control figures here are therefore **re-measured on the new SHA, not inherited** from the earlier run, which
is what keeps the control-versus-noise comparison single-variable: both halves sit on the same SHA.

Run times, for a load baseline: shop-control 972s, case-a 556s, case-b 458s, case-c 332s, case-d 750s,
case-noise-shop 1125s, lens-control 285s, case-e 137s, case-f 55s, case-noise-lens 280s. The three runs
repeated from the stopped attempt came back within about 1% (shop-control 972 against 983, case-a 556 against
565, case-b 458 against 469), which is a mild independent signal that the host was stable across both windows.

## Catch rate: 5 of 5 scored, and what that figure excludes

| Case | Verdict | Rows |
|---|---|---|
| a. Polarised tag sits unevenly on shop cards | **NOT SCORED** | 1 matching row |
| b. A floating Filter button appears after scrolling | CAUGHT | 2 rows |
| c. The drawer price slider's right handle is clipped | CAUGHT | 2 rows |
| d. Card prices show `.00` on whole pounds | CAUGHT | 90 rows |
| e. The lens last question is two screens, not one | CAUGHT | 10 rows |
| f. The lens footer stacks Back above the action at 375 | CAUGHT | 1 row |

⚠️ **"Caught 5 of 5" means 5 of the 5 SCORABLE cases, not 5 of the 6 planted.** Case **a** is excluded by the
scorer because **the draft has the same gap**, so there is no draft-versus-live difference a parity walker
should be credited for, and only design review could catch it (`score.mjs`:74 filters `draftHasIt` out of the
scored set). Quoting "5 of 5" without that sentence overstates coverage by one case.

Worth stating precisely, because it cuts the other way too: `summary.json` records case a as
**`caught: true, draftHasIt: true`** — the walker *did* emit a matching row for it. So the walker detected 6 of
6 and is scored on 5 of 5; it is neither credited with case a nor blind to it.

Case d is worth noting for a different reason: it was caught by 90 rows, and `card-price` carries an
`accepted by config` entry ("Pennies on every price, Bean 2026-09-25"). **An accepted row still counts as
caught**, by design — `score.mjs` measures DETECTION, not reporting, so a difference the config chooses to
tolerate is still proof the walker saw it.

## Noise: 5 rows, NOT 0 — every one named

The no-op injection touches the LIVE side only, so the draft side must read identically between the control and
the injected run. **A row whose draft value moved run-to-run is noise**, and that is what this counts.

**4 rows on shop, 1 on lens.** Down from Session C's 13 and 9, but not 0, so each is accounted for below.

### 1-2. `filters-open@1440 | swatch-black | hover | transform` and `| hover-effects` (2 rows)

Draft `none` against live `matrix(1.12, 0, 0, 1.12, 0, 0)` / `moves`.

**Cause: the draft's view-swap fade-in — and it is already documented.** `qa/parity/shop.mjs`:286 carries an
accepted-difference entry for this exact pair, state, kind and values, with the cause named and the direct
measurement recorded: *"Hover sampled during the draft's view-swap fade-in; measured directly, the draft's
swatch grows to 1.12 as live's."* So the swatch's transform reads `none` in a run where hover was sampled
mid-fade and `matrix(1.12)` in a run where the fade had settled. The draft value moving run-to-run is precisely
what the noise metric is built to count, so it is correctly counted here rather than being a new defect.

Two rows, one event: `transform` and `hover-effects` are two keys of a single hover reading on one element.

### 3-4. `opening@375` and `auto-scrolled@375 | (auto) | auto | text-missing` (2 rows)

`"free uk delivery over"` and `"over £75, or collect in birmingham prescription lenses"` — draft shown, live
missing.

**Cause: the `sgs/trust-bar` marquee's scroll phase.** That copy belongs to `sgs/trust-bar` in
`header.tree.json`, the header is on `/shop/`, and `trust-bar/style.css`:280 animates the track with
`animation: sgs-trust-bar-scroll var(--sgs-trust-bar-scroll-speed, 25s) linear infinite`. At a different phase
the same sentence is split across the visible window differently, so one fragment reads missing. Both rows are
at **375**, the narrowest viewport, where the visible window is smallest and phase sensitivity is highest —
which is itself consistent with the cause rather than incidental.

Note the two fragments overlap on the word "over": they are two different cuts of one continuous string, not
two independent findings.

### 5. `q3-finish@1440 | option-card | focus | box-shadow` (1 row)

```
was  oklab(0.64669 0.0115814 0.032222 / 0.39962) 0px 0px 7.9924px 1.9981px
now  color(srgb 0.611765 0.545098 0.470588 / 0.4)  0px 0px 8px      2px
```

**Cause: the same shadow, sampled at t ≈ 0.999 instead of t = 1.0 — one unsettled transition, not a change.**
Proven arithmetically rather than asserted:

- Converting `color(srgb 0.611765 0.545098 0.470588)` to Oklab gives `oklab(0.64669 0.0115519 0.032210)`
  against the reported `oklab(0.64669 0.0115814 0.032222)`: **L identical to five decimal places**, a and b
  within 3e-5. Same colour.
- Every numeric component is short by an **identical 0.0950%**: alpha 0.39962 against 0.4, blur 7.9924px against
  8px, spread 1.9981px against 2px. All three ratios are 0.999050 to six decimal places. A uniform deficit across three independent components is one interpolation
  progress value, not three coincidences.
- The format change is the tell: Chrome serialises a mid-interpolation colour in the transition's
  **interpolation space** (`oklab`), and the settled value in its authored space (`color(srgb …)`). So the
  serialisation switch is a symptom of the same cause, and would otherwise read as a genuine colour change.

## The answer to the question this benchmark was built to ask

**Neither walker flakiness nor host load. All 5 noise rows are time-varying values sampled at different
moments** — three distinct phase sources: a draft fade-in, a CSS marquee, and an unsettled transition.

That matters because the two candidate answers implied different remedies. Host load would have meant
serialising walks against deploys and accepting a noise floor. Walker flakiness would have meant the detector
is unreliable and its findings need discounting. Phase means **neither**: the detections are sound, and the
noise is removable at the sampling site by waiting for the state to settle before reading — which is the same
remedy already applied to the forced-hover and entrance-pose artefacts in this cleanup.

**Not fixed here.** The done condition for this task was the figure compared against 0 with a named cause where
it is not 0, and that is met. Suppressing the three sources is new work: pause or phase-lock the trust-bar
marquee for a read (the hook exists: `trust-bar/style.css`:285 pauses the track on
`.sgs-trust-bar__track--ready.is-paused`, a class rather than an inline property, per the no-inline contract),
wait out the draft's view-swap fade before sampling hover,
and require a transition to settle before reading a shadow rather than reading at `t≈0.999`. The third is the
most general: a 0.10%-short read is indistinguishable from a real difference to any threshold that is not
exactly 0, and the colour-space switch makes it look like a bigger change than it is.

## What stands from Session C, and what is now superseded

- **Catch rate 5 of 5 stands**, now with the case-a exclusion stated rather than implied.
- **The noise figure is settled: 5 rows, all named.** Session C's 13-on-shop and 9-on-lens reading is
  superseded by this run; its "unproven in both directions" note is discharged.
- The earlier run that read **0** noise rows is consistent with all three causes being phase-dependent: a run
  that happens to sample after the fade, between marquee cuts, and after the transition settles reads 0
  legitimately. **So 0 was never evidence that the noise was absent, and 13 was never evidence of a defect.**
  That is the real lesson: a phase-dependent count cannot be compared across runs without pinning the phase.
