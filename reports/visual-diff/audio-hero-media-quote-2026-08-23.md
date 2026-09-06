# Visual diff — sgs/audio, sgs/hero, sgs/media, sgs/quote — 2026-08-23

verdict: PASS
intent_capture_passed: true
source_sha: 99c82194

> Retires the four MANUAL SKIPs logged for these blocks on 2026-08-23.
> **Read the "instrument failure" section before trusting the method** — the check I
> committed to in the skip reason did not work, and this report says so rather than
> quietly substituting a different one.

## What changed

17 number-typed attributes declared `"default": null` had that default removed, plus three
editor writes (`audio.audioId`, `media.imageId`, `media.thumbnailId`) that cleared the
attribute back to `null` and would have re-introduced the defect. Same defect as
`816e9daf`; see `product-card-2026-08-23.md` for the mechanism.

## ⚠ Instrument failure — the md5 check I promised does not work here

The skip reason committed to comparing rendered-HTML md5s before and after deploy, with
baselines proven stable across two pre-change fetches. Post-deploy, **all three pages
changed** — and the check could not tell me why, for two reasons:

1. **`build-deploy.py` bumps an asset cache-buster on every deploy.** The page carries
   `ver=1787524927` six times — a Unix timestamp matching this deploy (the previous
   deploy's verify used `sgs_deploy_check=1787524236`, ~11 minutes earlier). Any deploy
   moves the md5, whether or not a single line of block code changed.
2. **I kept the before *hashes* but not the before *bodies*,** so I could not diff them to
   confirm `ver=` was the only difference. A hash tells you *that* something differs, never
   *what* — which is the whole reason it was the wrong instrument for a change shipped
   through a version-bumping pipeline.

Normalised baselines (with `ver=\d{9,}` stripped), stable across repeated fetches, recorded
here so the next comparison on these pages has something usable:

| Page | Block | Normalised md5 |
|---|---|---|
| `/tier-fixture-maxwidth/` | quote | `4a62c567f376d565c193dd0c711e373d` |
| `/t1-svg-tier-probe/` | media | `94900b0d3ec875302c12d7d9a8163336` |
| `/hero-overlay-gradient-qc-2026-08-21/` | hero | `09d09f356ddfd49809fde950e1d733cc` |
| `/shop/` (control — none of the four blocks) | — | `bd9c883c60126d48fcaa80f1182c9bf9` |

## What actually establishes the verdict

**1. The front-end no-op is a language guarantee, checked against every reader.**
PHP's `isset()` returns **false** for a null value, so a null-valued key and an absent key
are indistinguishable to every guard that reads these attributes. Each of the seven live
reader lines was opened and checked, not assumed:

| Reader | File:line | Before (`null`) | After (absent) |
|---|---|---|---|
| `$attributes['imageWidth'] ?? null` ×3 | `hero/render.php:207-209` | null | null |
| `isset(...) && null !== ... ? absint(...) : 0` | `media/render.php:117` | 0 | 0 |
| `! empty( $attributes['imageId'] )` | `media/render.php:132` | true→skip | true→skip |
| `isset(...) ? absint(...) : null` ×2 | `media/render.php:601,1324` | null | null |
| `isset( $attributes['imageId'.$tier] ) ? absint(...) : 0` | `media/render.php:675` | 0 | 0 |
| `isset(...) && null !== ... ? (float) ... : null` | `quote/render.php:133` | null | null |

This covers every page on every site, which the three-page md5 sample never could.

**2. Positive controls — the attributes still function.** The real risk of removing a
default is silently disabling the setting. Tested live against the canary block-renderer:

| Block | Attribute | Absent | Set | Result |
|---|---|---|---|---|
| `sgs/quote` | `scaleHover=1.08` | 200, no `scale()` | 200, emits `scale(1.08)` | **works** |
| `sgs/media` | `imageWidth=321` | 200, no `321` | 200, `321` present | **works** |

⚠ The first attempt at the quote control returned 400 on **both** arms and looked like a
broken block. It was a broken *probe* — `quoteText` is not an attribute of `sgs/quote`
(with no attributes at all the endpoint returns 200). Separating "my probe is wrong" from
"the code is wrong" caught it. Third occurrence of that pattern on this project.

## Known-and-not-covered

- **`sgs/audio` has ZERO published pages on the canary**, so it has no live verification of
  any kind. It rests solely on the PHP-semantics argument above. Stated, not implied.
- No editor-preview verification exists for any of these four blocks, because none of them
  uses `ServerSideRender` — which is precisely why none could exhibit the 400 and why this
  was a latent fix rather than an observed one.
