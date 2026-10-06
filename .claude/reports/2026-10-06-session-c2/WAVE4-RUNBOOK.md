# Wave 4 runbook — verification, the owed host jobs, and closure

Written 2026-10-06 during Waves 2 and 3, so the host window is spent measuring. Every command here was
read off the script's own usage header, not recalled.

**Client slug:** `eye-care-ward-end`. **Surfaces (17):** `footer about lenses help contact home header
mobile-menu mega-sunglasses mega-brands mega-lenses mega-help size-guide lens shop product contact-form`.

---

## 0. Before anything touches the host

- **Check the host is quiet.** `scripts/computed-route/lib/tree.mjs::assertQuiet` refuses a run while a
  deploy or reseed is live, with `R-47-11`. It reads the process list, so a peer's `build-deploy.py` or
  `sgs-update` anywhere on this machine blocks the walk. If it trips, find the owner and wait; **never kill
  another session's deploy** — a half-written plugin directory on the canary is what that rule prevents.
- **Message the peers.** `small-giants-wp-41` (idle, no further host work planned) and `small-giants-wp-e6`
  (holding `npm run build`, one `build-deploy.py --target eye-care-test` and one `sgs-update` reseed, in
  that order, and subscribed to this session's idle signal).
- **Record the live SHA** from the host, do not infer it:
  ```bash
  ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73 'cat ~/.sgs-deploy-marker-eye-care-test.json'
  ```
  It read `578a8830b` at 16:12 on 2026-10-06. **Not** the `6d6906b98` the plan first recorded, and not the
  `94122e326` that F 193 was measured at.

## 1. The no-host gates (run these first; they need no browser)

```bash
node --test "scripts/computed-route/tests/*.test.mjs"
node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json
python scripts/check-no-client-names.py --check
node scripts/computed-route/tests/check-lane-collisions.mjs --self-test
```

Baseline to beat: **523 tests at session start, 558 after Wave 2.** Wave 3 adds more.

## 2. Populate `handScope`, then lint the 17 configs

**P2a's gate is inert until a pairing run writes `handScope`.** None of the 17 existing pairing reports
carries it, so a config that lints clean today is *not yet judged*, which is not the same as passing.

```bash
for s in footer about lenses help contact home header mobile-menu mega-sunglasses mega-brands \
         mega-lenses mega-help size-guide lens shop product contact-form; do
  node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface "$s"
done
```

`mobile-menu` needs its state flags, per `pairs.mjs`'s own usage line:
`--state drawer-open --width 375 --recheck 768`.

Then lint every config (`draft-live-walk.mjs … --lint` exits 1 before any browser opens). **This is the
gate Spec 47 §5 says existed but never ran.** Expect roughly 6 pairs refused; a refusal is a finding, not a
failure.

## 3. The verification re-sweep

```bash
node scripts/computed-route/solve.mjs --client eye-care-ward-end --surface <s>   # per surface
node scripts/computed-route/triage.mjs --client eye-care-ward-end --surface <s>
node scripts/computed-route/sweep.mjs                                            # writes qa/sweep/<date>/sweep.json
```

**Compare on the normalised key R2 added, never the raw `issueKey`.** P1 and P2b3 both change emitted paths
(multi-svg containers lose their `icon-*` keys), so a raw-key comparison reads a cosmetic rename as mass
close-and-reopen. This is the Gate TAIL defect, and this is the sweep it was going to bite.

**The prediction, and its honest status.** The plan committed to **F 193 → roughly 148–168**. That band
assumed the live site had not moved, and **it has**: 18 commits between `6d6906b98` and `578a8830b`, several
touching `product-card`, `hover-effects`, `cart-line-summary`, `addon-price-list` and `toast`, and only the
earlier move was verified harmless on three axes. So treat the band as corroboration and lean on **per-fix
row attribution** from the surviving solve reports under `sites/eye-care-ward-end/build/qa/solve/`
(gitignored, machine-local). Expected per fix: P1 ~11, P2b3 ~8, P2b2 6, P2b1 ~5, P3b ~3, P3c 2, P2a 6
refused at lint. A result outside the band means something else moved — **name the cause before using the
number.**

Peer `small-giants-wp-e6` flagged one in advance: commit `e62f45952` changes the stretched link so a card
title carries a real anchor instead of an empty overlay. It expects zero movement on eye-care-test because
no tree there enables `sgsBlockLinkAuto`, but if a card-link row moves, that is the explanation.

## 4. The 209 canvas-settable claims, by family

Full table in `WAVE4-CANVAS-FAMILIES.md`: **209 claims, 69 families** (the plan said 68 — use 69), **28
spanning more than one surface**, so sample by family and never by surface. Two reads per family is 138
live reads against 209 one-per-claim.

**Do the 3 `bgHoverZoom` families first** — exactly 20 claims, and they are R1's positive control. After R1
they should no longer be classed `W/canvas-settable`, because
`includes/container-bg-hover-zoom.php::sgs_container_bg_hover_zoom_css` emits only to
`.<uid> > .sgs-container__image-bg` and `.<uid>::before`.

## 5. Three host jobs Session C left owed

1. **The C3.5 confirmation walk.** Order 652 on eye-care-test is already `processing` and paid. Set
   `EYECARE_ORDER_URL` to its order-received URL and read the key with `wp eval`. **Never store the key.**
2. **An `sgs/media` recalibration.** `sgs/hero`'s run recorded nothing across 17 qualifying settings and
   nobody knows whether that is legitimate; `sgs/media` has the content reads to exercise it.
3. **`node scripts/parity/benchmark.mjs --noise`**, control and noise back to back on a quiet host. It
   caught 5 of 5 planted faults, but read 13 noise rows on shop and 9 on lens where an earlier run read 0,
   and the control's own hover rows fell 18 to 6 with an unchanged config. Unproven in both directions.

## 6. Closure

- `/qc-council` on the whole change set — two or more fix shapes landed, which is its trigger.
- Spec 47 §5 Residual: remove every defect this plan closed, keep what it did not. **Keep** the
  `chrome-compare.mjs::hoverEffects` note (below) and the ledger path-discriminator gap.
- `LEDGER.md` is at **24,561 of 24,576 bytes — 15 bytes of headroom, not the 656 the brief stated.** Cut a
  finished item before adding anything.
- Mark the cleanup plan complete; `/handoff` pointing at `/phase-planner` for the 63 register items.
- **Signal both peer sessions that the host is clear**, and give `e6` its three steps in order.

### Carried forward, deliberately not fixed

`scripts/parity/lib/chrome-compare.mjs::hoverEffects` does not apply P3c's `loops`, so a property driven by
an infinite animation could in principle destabilise a header-chrome effect label. **Not fixed, because the
cause is unproven**: `hoverEffects` produces descriptive labels from rest-and-hover snapshots rather than
property rows, and Eye Care's marquee is page content, not header chrome. What would prove it: a chrome
surface carrying an infinite animation whose effect set differs between two runs with no code change.
