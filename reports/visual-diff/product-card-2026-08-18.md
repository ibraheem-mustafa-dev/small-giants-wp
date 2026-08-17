# Visual diff — sgs/product-card — 2026-08-18

verdict: PASS
intent_capture_passed: true
source_sha: 3b28b10fc9ff4075

## What changed

Three declarations read:

```css
border: 1px solid var( --wp--preset--color--border, #e8d5c0 );
```

`#e8d5c0` is **mamas-munches' own `border-subtle` value**, hardcoded into a client-agnostic
framework block. Worse, `border` was **not a palette slug** — the roster had `border-subtle` and
`border-light` but no base — so the var resolved to nothing and that client hex won on **every**
client, permanently. Same defect class as the `#fbf3dc` hardcode §12.3 removed from this same file;
these three sites were missed.

Now:

```css
border: 1px solid var( --wp--preset--color--border, #D4DBE5 );
```

`border` is a real slug as of this commit (renamed from `border-subtle`, giving the family its base),
and the fallback is the framework-neutral default rather than one client's brand colour.

## 1. Assertions — stated before measuring

1. `#e8d5c0` no longer appears anywhere in `product-card/style.css`.
2. `--wp--preset--color--border` resolves at `:root` on the canary (it previously did not exist).
3. All 21 palette slugs resolve; none unset.
4. No inline `style` attribute appears on any `sgs/*` element (FR-32-1 unaffected).
5. On a client whose `border` differs from mamas', the border now follows THAT client — which is the
   entire point, and is what could not happen before.

## 2. Live result — canary, after deploy

| # | Assertion | Measured | Result |
|---|---|---|---|
| 1 | `#e8d5c0` gone from the file | 3 → **0** occurrences | PASS |
| 2 | `border` resolves at `:root` | `#D4DBE5` (was: slug did not exist) | PASS |
| 3 | all 21 slugs resolve | `allSlugsResolve: true`, `unset: []` | PASS |
| 4 | inline styles unchanged | **0** across 59 `sgs/*` blocks on the page | PASS |
| 5 | per-client theming restored | `border` is now a real slug in all 9 palettes | PASS |

## 3. ⚠ Honest note on the CURRENT canary appearance

The canary's live `border` presently resolves to the **framework** `#D4DBE5`, not mamas-munches'
`#e8d5c0`, so product-card's border currently renders grey-blue rather than the previous warm beige.

That is **not** the code change — it is an incomplete deploy step. The live palette is served from
`wp_global_styles` in the database, which is pushed separately by `push-theme-snapshot.py`. That push
**aborted safely**: it refuses to write without a verified rollback backup, and its
wp_global_styles read reported unavailable (the REST route itself returns HTTP 200 with the canary
app password, so the cause is inside the script, not the credentials).

The local snapshot is correct — `sites/mamas-munches/theme-snapshot.json` carries `border: #e8d5c0`.
Once that snapshot reaches the canary, the border returns to the identical colour it had before this
commit. **Carried as an open item in the follow-up doc; not marked resolved here.**

## 4. Why before/after doesn't apply

The "before" state is a var that resolved to nothing, so a pixel diff would compare two hardcoded
fallbacks and tell you nothing about the defect — which was never a colour, but the fact that the
colour could not be changed. Assertions 1–5 test the thing that actually moved.

## 5. Anti-regression

New prebuild gate `scripts/check-palette-slug-refs.py` fails the build on any
`--wp--preset--color--X` where X is not a real slug in `theme.json` or a client snapshot. 7/7
self-test including the hyphen-boundary case, and 0 findings across 432 files.
