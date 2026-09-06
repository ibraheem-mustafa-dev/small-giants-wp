---
verdict: PASS
intent_capture_passed: true
source_sha: NOT-COMPUTABLE-SEE-BELOW
commit: 0eb38ecf
decision: D724
date: 2026-08-21
---

# D724 — shared wrapper renders a simple section background as a real `<img>`

## ⚠ `source_sha` is deliberately not a hash

`visual-report-sha.py` hashes the *staged* bytes of a block's `src/` directory. This report was
written after `0eb38ecf` was committed, so nothing is staged and no valid value exists. The
commit went in under the scoped, logged bypass. **This is an evidence record, not a gate token —
it cannot and must not wave through a future commit to these blocks.**

⚠ Commit `0eb38ecf` cites "(D719)". That number is wrong — D719 belongs to the other session.
Read it as **D724**. Not corrected by rewriting shared, pushed history.

## Why before/after doesn't apply

The `<img>` layer did not exist before; there is nothing to diff against. The meaningful
questions are whether the routing is correct, whether anything double-paints, and whether the
page ends up with exactly one high-priority image.

## Assertions, stated before measuring

1. A simple background image (`no-repeat`, `cover`/`contain`, no parallax, no tiers) renders as
   a real `<img class="sgs-container__image-bg">`.
2. A **tiling** background still uses the CSS `::before` path — an `<img>` cannot tile.
3. Nothing double-paints: where the `<img>` renders, the owner's `::before` has no background.
4. The client's `backgroundSize`/`backgroundPosition` reach the frontend (the blocker-2 fix).
5. The `<img>` is `position:absolute`, `z-index:0` — behind the content, not on top of it.
6. **Exactly one** image on the page carries `fetchpriority="high"`, even though two different
   blocks (hero and the wrapper) each render one (the blocker-3 fix).
7. No inline `style` property declaration on the tag (Spec 32).

## Live results — canary page 2596, cache-busted, after deploy

| # | Assertion | Measured | |
|---|---|---|---|
| 1 | `<img>` path taken | `img.sgs-container__image-bg` present, with real `srcset` | PASS |
| 2 | Tiling keeps CSS | tiled container has **no** img layer; `::before` background present, `background-repeat: repeat` | PASS |
| 3 | No double-paint | owner's `::before` `background-image: none` where the img renders | PASS |
| 4 | Client settings survive | `object-fit: contain`, `object-position: 0% 0%` (authored `contain` / `top left`) | PASS |
| 5 | Behind content | `position: absolute`, `z-index: 0` | PASS |
| 6 | One high-priority image | hero `fetchpriority=high`/`eager`; container `auto`/`lazy` | PASS |
| 7 | No inline style | `getAttribute('style')` → `null` | PASS |

Row 6 is the load-bearing one. Two *separate* blocks each rendered a background image through
*different* code paths, and only the first got the priority hint — which is the whole point, and
what the two independent counters would have broken.

Row 4 is the blocker-2 regression control: that container was authored with nothing else set, so
before the `$needs_uid` fix it minted no uid and the object-fit rule never emitted.

## Not covered

Only `sgs/container` was exercised directly. The other six wrapper-backed blocks share the same
code path but were not individually captured — an argument from shared mechanism, not a
per-block measurement. Parallax and `background-attachment: fixed` were not exercised; they are
excluded by the gate and keep their existing CSS path unchanged.
