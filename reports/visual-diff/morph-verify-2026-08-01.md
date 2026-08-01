# Morph FX (D452) — verification report

**Date:** 2026-08-01
**Canary:** https://sandybrown-nightingale-600381.hostingersite.com/morph-fx-qa-canary/ (post 2113, sandybrown)
**Fix under test:** `plugins/sgs-blocks/includes/fx-shape-routes.php` — `data-sgs-fx="morph"` moved from the `<svg>` wrapper onto the inner `<path>` (D452).
**Verdict: PASS.** Morph now animates on this canary. Evidence below; hypothesis confirmed, not assumed.

Every measurement was cache-busted (`?cachebustN` query param on each navigate) and `window.location.href` was re-asserted before trusting any evaluate() result — the session is shared with other agents and was in fact hijacked mid-session (see Note on session collision below), so this check is load-bearing, not decorative.

## 1. Markup shape — attrs moved onto the `<path>`

Live DOM query for `[data-sgs-fx="morph"]` on the canary returns **two** elements:

| Element | Tag | `data-sgs-fx-morph-target` | Role |
|---|---|---|---|
| Valid case | `<path>` (child of `.sgs-fx-shape-visual svg`) | `#sgs-fx-shape-1` | the fix under test |
| Fail-safe case | `<svg>` | `#sgs-morph-qa-missing-target` | deliberate mismatched-target fixture |

Confirmed: the **valid** morph fixture now carries `data-sgs-fx="morph"` on the `<path>` itself (attrs present: `data-sgs-fx`, `data-sgs-fx-morph-target`, `data-sgs-fx-trigger`, `d`, `data-original`). Before D452 these sat on the parent `<svg>`, which MorphSVGPlugin refuses outright. This is the structural half of the fix, confirmed live — not inferred from source.

## 2. Does it morph? — real `d` values, changing

Two independent measurements, both against the real production code path:

### 2a. The live runtime instance (trigger="load")

`data-original` (FROM, authored) vs the live element's current `d` vs the TARGET path's `d`, sampled fresh on a cache-busted reload:

```
data-original (FROM): M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6 Z
live current d:        M 10 10 L 90 10 L 90 90 L 10 90 Z
target #sgs-fx-shape-1: M 10 10 L 90 10 L 90 90 L 10 90 Z
```

The live element's `d` no longer equals `data-original` — it equals the TARGET exactly. Before the fix, per the D452 docblock, the `d` attribute was **unchanged across 148 animation-frame samples over 1.6s** (past the 0.8s default duration) — i.e. it never left the FROM shape. Now it has visibly left the FROM shape and landed exactly on the TO shape. This is measured on every reload attempted (3 separate cache-busted loads, consistent result).

Caveat, stated plainly: because `trigger="load"` plays the tween on page load and the tween's own duration is only 0.8s, by the time a separate Playwright `evaluate()` round-trip lands after `browser_navigate()` returns, real wall-clock time has already exceeded 0.8s — so a live rAF sampling loop attached after navigation only ever caught the POST-tween end-state (constant target `d` from t=6ms through t=1.6s in a 161-sample loop). That is before/after evidence, not a mid-flight trace, and I'm not presenting it as more than that.

### 2b. Mid-flight interpolation, same production code, same real data, self-timed

To get genuine mid-flight samples I don't control the live tween's start time for, I dynamically `import()`-ed the actual deployed `gsap-core.js` and `gsap-morphsvg.js` vendor chunks (the exact files `fx-morph.js` uses) into the live page, registered `MorphSVGPlugin` against a fresh `gsap` instance, and ran a `gsap.to()` morph between the **same two real `d` values** taken from this page (`data-original` → `#sgs-fx-shape-1`'s `d`) on a detached, off-screen test element — nothing on the live canary was touched. Duration set to 1.5s (mine, so I control timing) purely so live sampling could resolve comfortably; the interpolation math is identical.

150 `onUpdate` samples captured. Picked frames across the run:

```
t=7ms:    M49.99 6 C74.3 6 93.99 25.69 93.99 49.99 93.99 74.3 74.3 93.99 50 93.99 25.69 93.99 6 74.3 6 50 6 25.69 25.69 6 49.99 6 z
t=155ms:  M49.8 6.01 C74.11 6.01 93.85 25.62 93.98 49.8 93.98 74.11 74.37 93.85 50.19 93.98 25.88 93.98 6.14 74.37 6.01 50.19 6.01 25.88 25.62 6.14 49.8 6.01 z
t=375ms:  M47.39 6.26 C71.85 6.26 92 24.67 93.73 47.39 93.73 71.85 75.32 92 52.6 93.73 28.14 93.73 7.99 75.32 6.26 52.6 6.26 28.14 24.67 7.99 47.39 6.26 z
t=754ms:  M29.21 8.07 C54.74 8.07 78.06 17.53 91.92 29.21 91.92 54.74 82.46 78.06 70.78 91.92 45.25 91.92 21.93 82.46 8.07 70.78 8.07 45.25 17.53 21.93 29.21 8.07 z
t=1125ms: M12.4 9.75 C38.92 9.75 65.17 10.94 90.24 12.4 90.24 38.92 89.05 65.17 87.59 90.24 61.07 90.24 34.82 89.05 9.75 87.59 9.75 61.07 10.94 34.82 12.4 9.75 z
t=1495ms: M 10 10 L 90 10 L 90 90 L 10 90 Z   (exact target)
```

Every sample differs from its neighbours — the coordinates walk smoothly from the circle's control points down to the square's corners, converging exactly on the target `d` at completion. This is real, continuous geometry interpolation, on the real production plugin, using the real page's real shape data.

Together, 2a + 2b prove: (i) the live instance completes the morph from FROM to TO on the actual page, and (ii) the mechanism that does it genuinely interpolates over time rather than snapping — closing the gap that a before/after-only measurement would leave open.

## 3. Console — target error gone

Console messages on the canary, cache-busted reload:

```
[LOG] JQMIGRATE: Migrate is installed, version 3.4.1 ...
[WARNING] [sgs-fx-morph] data-sgs-fx-morph-target "#sgs-morph-qa-missing-target" matched no element — morph skipped, element stays at its rendered shape.
```

**Zero errors.** No `Cannot morph a <SVG> element` anywhere in console output across 5 separate reloads. That message only fires when MorphSVGPlugin is handed an `<svg>` container — the exact defect the fix removes.

## 4. Fail-safe path — still intact

The deliberately mismatched-target fixture (`<svg data-sgs-fx="morph" data-sgs-fx-morph-target="#sgs-morph-qa-missing-target">`) still triggers:

- **Exactly one** console warning (`data-sgs-fx-morph-target "#sgs-morph-qa-missing-target" matched no element — morph skipped, element stays at its rendered shape`) — confirmed via `browser_console_messages`, total warning count = 1.
- The element itself is left unchanged — it has no `d` attribute at all (it's still the wrapper `<svg>`, never touched), confirmed live.

The fix did not touch or regress this path — it's a different code branch (`resolveMorphTarget()` returns `null` before any tween is created), and this fixture wasn't part of D452's edit.

## Note on session collision (rule 3 compliance)

Mid-verification, one `browser_evaluate` call returned `href: ".../motion-canary-wave-c/?checkattr=1"` — a different agent had navigated the shared browser session away from the canary between my calls. Caught immediately because every evaluate function opens with a `window.location.href` guard; the affected reading was discarded and the page was re-navigated + re-verified from scratch before any further measurement was trusted. No measurement in this report was taken without a same-call href assertion.

## Scope not covered

- `hover` and `scroll` trigger variants of morph are not present on this canary (only `load` was built into it) — not verified here. If those trigger paths matter for D452 sign-off, they need their own fixture; the fix itself is trigger-agnostic (it only moves which element carries the attrs, `resolveTrigger`/`initMorph` logic is unchanged), so I'd expect them to work identically, but that's an expectation, not a measurement — flagging rather than asserting.
- No further source fix is needed from this check. Nothing outside my read-only remit was touched; report only, no deploy performed.
