# Visual diff — `sgs/site-header` — 2026-09-20 (W2-n: shadow once scrolled)

```
verdict: PASS
first_paint_capture_passed: true
blocks: site-header
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-09-20
branch: main @ 737d205ba ("feat(site-header): shadow once scrolled")
```

Before/after/restore capture against the ACTIVE header (`sgs_header` post **3648**,
`Mamas Munches Header`, `wp sgs header list` → Active=yes) rendering site-wide on the
canary homepage. Every fetch carried a `?qacb=<unique>` cache-buster; every state change
was followed by `wp litespeed-purge all`; `x-hcdn-cache-status: MISS` on every capture.

⚠ Per-instance header CSS is **lifted** to `uploads/sgs-css/sgs-<n>-<hash>.css`, not
inlined — the `<style id="sgs-site-header-style-inline-css">` block is the shared
stylesheet, not the instance rules. Every rule below was read from the lifted file and
then re-confirmed as a COMPUTED value on the painted element.

## State touched, and its restore proof

| Thing | Value | Proof |
|---|---|---|
| Post 3648 `post_content` BEFORE | md5 `b6b19d932b8a3c7a7b52621e1d00b246` (PHP, raw) / `79f62b4b6e269a8b7864c711ab4eb6af` (`wp post get \| md5sum`) | recorded before the first write |
| `post_modified` BEFORE | `2026-09-18 21:29:45` | `wp post get 3648 --field=post_modified` |
| AFTER restore | md5 `b6b19d932b8a3c7a7b52621e1d00b246` / `79f62b4b6e269a8b7864c711ab4eb6af`; `post_modified` `2026-09-18 21:29:45` | **identical** — content and modified stamp both restored |
| Lifted CSS file | content hash `32e53d6b3484f55c7c1e2f3f7b8262a3` before **and** after | byte-identical instance CSS |
| Header element UID | `sgs-sh-686e3e7c` before **and** after (`88839fb7` while modified) | the uid is attribute-hash derived, so its return proves the attribute set round-tripped exactly |
| `[QA]` page 3710 (plain-header probe) | deleted `--force` | absent from `wp post list --s="[QA]"` |

Writes used `wp eval-file` with `wp_update_post()` + `wp_slash()` on a `str_replace` of the
opening block comment; no other post, option or theme mod was touched.

## Emitted-CSS diff (check 5)

BEFORE — 5 rules on `.sgs-sh-686e3e7c.sgs-site-header`: background-color; position/top/z-index;
`@media (prefers-reduced-motion: reduce){transition:none !important;animation:none !important}`;
border-style/width; border-color.

AFTER (`"shadowScrolled":"floating"`) — the same 5, **plus exactly two**, nothing removed,
nothing altered:

```css
.sgs-sh-UID.sgs-site-header{transition:box-shadow 200ms ease;}
.sgs-sh-UID.sgs-site-header.is-header-scrolled{box-shadow:var(--wp--preset--shadow--floating);}
```

`floating` is a real `theme.json` `settings.shadow.presets` slug (`0 8px 30px rgba(0,0,0,0.12)`).

## Checks

| # | Check | Measured evidence | ✓ |
|---|---|---|---|
| 1 | BEFORE capture of the instance style block | 5 rules, listed above; no `transition`, no `.is-header-scrolled` | ✓ |
| 2 | Attribute survives `wp post update` and reaches render.php | header markup gains `data-sgs-header-scroll-behaviours="1"` (absent before) — the `\|\| $sh_shadow_scrolled_on` branch | ✓ |
| 3a | @1440, scrollY 0: computed `boxShadow` equals the BEFORE resting value | `none` before and after the change | ✓ |
| 3b | @1440, scrollY 400: class + shadow | `is-header-scrolled` present; `box-shadow: rgba(0, 0, 0, 0.12) 0px 8px 30px 0px` = the `floating` preset exactly | ✓ |
| 3c | Transition property + duration | `transition-property: box-shadow`, `transition-duration: 0.2s` | ✓ |
| 3d | Scroll back to top eases back | class removed, `boxShadow` back to `none`, transition still `box-shadow 0.2s` on the resting rule (so the return animates) | ✓ |
| 3e | @375 identical behaviour (not tier-gated) | rest `none` → scrolled `rgba(0, 0, 0, 0.12) 0px 8px 30px 0px` → back `none` | ✓ |
| 4a | NEGATIVE: unmodified header can fail the assertion | original header probed at 1440 **and** 375, scrollY 400: `is-header-scrolled` **false**, `boxShadow` `none`, `data-sgs-header-scroll-behaviours` **null** — the class is never added, so check 3b genuinely can fail | ✓ |
| 4b | `prefers-reduced-motion: reduce` kills the transition but KEEPS the end-state shadow | @1440 and @375: `transition-property: none`, `transition-duration: 0s`, yet scrolled `boxShadow` still `rgba(0, 0, 0, 0.12) 0px 8px 30px 0px` | ✓ |
| 5 | Style-block diff: only the two new rules added | see diff above — 5 → 7 rules, 0 removed, 0 changed | ✓ |
| 6 | A plain (non-sticky) header still gets the scrolled shadow | `headerSticky` temporarily removed from post 3648: header computed `position: relative`, and at scrollY 500 it still carried `is-header-scrolled` + `rgba(0, 0, 0, 0.12) 0px 8px 30px 0px`. Sticky then re-added; md5 returned to the intermediate state exactly (`2208334b…`) | ✓ |
| 7 | Console clean | 0 errors across all 4 probe contexts (1440/375 × normal/reduced-motion) | ✓ |
| 8 | Front end byte-identical after restore | normalised BEFORE vs FINAL homepage HTML differ in exactly 2 places, both state-independent: WP's `antispambot()` email obfuscation (randomised per render) and the LiteSpeed `Page cached by …` timestamp. `<header …>` tag byte-identical; lifted CSS hash identical | ✓ |

## Defect found (pre-existing, out of this commit's scope)

**A SECOND `sgs/site-header` instance on the same page never receives
`is-header-scrolled`, so its `shadowScrolled` never paints.**
`src/header-behaviours/view.js::getHeaderEl` is
`document.querySelector('header.sgs-site-header')` — first match only. Reproduced: a page
carrying an in-content `sgs/site-header` with `"shadowScrolled":"raised"` rendered the
per-instance CSS **and** `data-sgs-header-scroll-behaviours="1"`, but at scrollY 500 only
the real site header (first in document order) toggled the class; the in-content one stayed
`is-header-scrolled: false`, `box-shadow: none`.

This is a single-site-header assumption that predates 737d205ba, not a regression. It
matters now only because `shadowScrolled` is emitted per instance, which makes the control
look per-instance in the editor. Not fixed here (read-only verification dispatch).

⚠ Method note: the first run of that probe was a **false negative for a different reason** —
the probe page's `scrollHeight` equalled `innerHeight`, so `window.scrollTo(0,500)` moved
nothing and every header read "not scrolled". Any scroll-state probe must assert
`window.scrollY` actually changed before trusting a negative.

## Screenshots

`reports/visual-diff/site-header-2026-09-20/`

- `shadowScrolled-floating-rest-{1440,375}.png` — header at scrollY 0 (no shadow)
- `shadowScrolled-floating-scrolled-{1440,375}.png` — header at scrollY 600 (floating shadow painted)
