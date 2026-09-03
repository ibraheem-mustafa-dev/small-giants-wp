# Generative background — fix the muted colours

Invoke `/autopilot` before anything else.

**Your job:** the effect's colours look faint and washed out. The reference looks vibrant and
rich. Find out why, prove the cause, then fix it.

Bean's own words, live-testing on a real page: *"the colours on our version are like super
faint/muted whereas the original is very vibrant and rich."*

---

## 1. Read first

1. `.claude/decisions.md` D925, D926, D927, D930, D932, in that order — the fidelity gap and the
   speed bug, both closed this session. Read them so you don't re-open either.
2. `.claude/plans/2026-08-27-generative-background-engine.md`, Phase 3 — current status.
3. `plugins/sgs-blocks/scripts/generative-background/README.md` — the fidelity instrument.

## 2. Settled. Do not re-litigate.

- **The fidelity gap is closed.** All three sampled phases pass the 5% ceiling. Geometry matches
  the reference within 0.4 points average coverage. Do not reopen the shape-vs-colour question —
  it's answered (D926).
- **Playback speed is fixed.** The engine now runs at the reference's real pace, not 25x too
  fast (D930/D932).
- **Every fragment-shader constant was corrected against the reference's actual measured values**
  this session (D927) — glow amount, grading, fine-noise strength/frequency. Don't assume these
  are untuned; they were the fix for a *different* bug (a hard fidelity-score failure), and
  they're now reference-matched. The vibrancy problem is something else.

## 3. First action — under 5 minutes

Open the live demo page and look:
https://sandybrown-nightingale-600381.hostingersite.com/gate-generative-background-fidelity-check/

Compare it against https://stripe.com/gb. Confirm you see what Bean saw — faint colours on ours,
richer on theirs — before doing anything else.

## 4. Two live hypotheses, neither tested yet

**A. The colour picker was too pale.** This session's demo used four colours hand-sampled from
the reference's own palette texture — but sampled from one fairly light, low-saturation row.
The same texture also has much more saturated colours elsewhere (a sample at a different row
found `#FAB631` orange, `#F586C3` hot pink, `#FD8172` coral — all far more vivid than what
shipped). Cheap test: re-sample better stops and see if the picture improves. Script:
`python -c "from PIL import Image; ..."` reading
`.claude/scratch/stripe-hero-poc/assets/palette-a.png` — see this session's D932 for the exact
approach used, then pick from a richer row.

**B. The engine's own maths washes colours toward white, structurally.** Two fragment-shader
terms only ever ADD brightness and never subtract
(`plugins/sgs-blocks/src/shared/effects/webgl/generative-background.js`, `main()`): the
fine-noise contribution and the camera-facing lift (`colour += (1.0 - glowGate) * 0.25`).
Every pixel gets pushed toward white, never toward saturation. Against an already-light,
pastel four-stop gradient (see hypothesis A), that could be enough to read as "washed out" —
but this is UNTESTED, not proven. Reference shaders/39798.glsl has the identical lift formula
(`color += (1.0 - pdy) * 0.25`), so if this is the cause, the reference must be compensating for
it somewhere else — a richer base texture, a different starting saturation, or something not yet
found. Don't assume — check what the reference actually starts with before it applies that lift.

**Test them in order, cheapest first.** If A alone fixes it, stop — don't build machinery to
solve a problem that was actually just a bad colour choice. If A doesn't fully explain it, B needs
a real, isolated test (a debug uniform, matching the pattern `u_silhouetteDebug` already
established this session, or a side-by-side render of the base OKLCH texture alone vs the final
shaded output) — not a guess.

## 5. A structural limit, separate from both hypotheses above

Our engine builds its texture from exactly 4 client-picked colours, OKLCH-interpolated into a
flat horizontal gradient, repeated identically down every row
(`buildGradientImageData()` in `fx-generative-background.js`). The reference's real palette
texture varies in both directions — confirmed by sampling three rows of `palette-a.png`, all
different. **This is a real architectural gap, not something to fix as part of a colour-tuning
session.** If hypotheses A and B together don't close the gap, name this as the residual cause
and stop — don't start building a 2D texture system without a design conversation first (CLAUDE.md
rule 7: design-gate sensitive/high-blast-radius changes).

## 6. Hazards — carried forward, still live

- ⛔ **Verify visually, not just structurally.** This exact session shipped a demo page that
  rendered nothing at all (a missing colour attribute silently failed the whole effect) and it
  passed a markup/script-tag check. Screenshot the live page before reporting anything fixed.
- ⛔ **Commit path-scoped.** Several sessions share this tree. A bare `git commit` sweeps other
  tracks' staged files.
- ⚠ **Two bypass layers exist and are separate.** `[gates-ok:<reason>]` clears the session hook;
  git's native `.githooks/pre-commit` needs `--no-verify` as well, which also skips gitleaks —
  hand-scan the diff for secrets if you use it.
- ⚠ **This shared tree runs other sessions concurrently.** A blocked gate may be someone else's
  in-flight work, not yours. Investigate before bypassing anything — this session hit three real
  examples (a false DB-consistency collision, a live content-safety risk, an unrelated build-quality
  ceiling) and handled each differently based on what it actually was.

## 7. Done when

- The cause is **proven, not inferred** — a before/after screenshot comparison, not a plausible
  story.
- The live demo page visibly matches the reference's vibrancy, confirmed by screenshot.
- `npm run fidelity:compare` still passes 3/3 (colour changes could move these numbers — re-run,
  don't assume unaffected).
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit.
- `.claude/plans/2026-08-27-generative-background-engine.md` and `LEDGER.md` reflect the outcome —
  fold in, don't append.
- **Bean's named visual sign-off**, still the plan's other acceptance criterion — colour fidelity
  numbers passing doesn't replace it.
