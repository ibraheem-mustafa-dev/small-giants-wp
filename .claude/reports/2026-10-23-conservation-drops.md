# Fill conservation drops, 2026-10-23

Every property a draft declares on a paired part must end written, held or unwritten in the Fill run (`node scripts/computed-route/census.mjs <run dir> --check`, plan register R7). A row below ended in none of the three. The key is draft element, block, part, property and read width at the rest state; a write answers a read at the widths it states (a confirm record at its own width), a shorthand write answers the longhands it sets, an unwritten or held row carries no width and answers every width of its part and property, and a CSS-wide keyword read (how Chrome lists the longhands a shorthand leaves implied) is excluded and counted.

A run folder saved before the check holds no `reads.json`, so what its draft declared is unknown: it is listed as `no-read-set`, never as clean. The read set of the newest run was saved afterwards by `node scripts/computed-route/census-reads.mjs <run dir> --allow-external`, which reads the draft again with the run's own skeleton, so a font or runtime that differs from the run's offline read can differ in a width-dependent value.

## Run folders

| Run | Client / surface | Status | Declared reads | Dropped |
|---|---|---|---|---|
| 2026-10-21-0435 | indus-foods / header | no-read-set |  |  |
| 2026-10-21-0450 | indus-foods / header | no-read-set |  |  |
| 2026-10-21-0455 | indus-foods / header | no-read-set |  |  |
| 2026-10-21-0530 | indus-foods / header | no-read-set |  |  |
| 2026-10-21-0600 | indus-foods / header | no-read-set |  |  |
| 2026-10-21-0610 | indus-foods / header | no-read-set |  |  |
| 2026-10-21T23-09-36 |  | incomplete |  |  |
| 2026-10-21T23-10-59 | indus-foods / header | no-read-set |  |  |
| 2026-10-21T23-15-59 | indus-foods / header | no-read-set |  |  |
| 2026-10-21T23-22-25 |  | incomplete |  |  |
| 2026-10-22T-t2a | indus-foods / header | no-read-set |  |  |
| 2026-10-22T-t2a-2 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T00-30-17 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T00-31-57 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T04-12-33 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T06-00-07 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T21-14-06 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T21-56-28 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T22-03-35 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T22-06-48 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T23-06-57 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T23-10-43 | indus-foods / header | no-read-set |  |  |
| 2026-10-22T23-12-58 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T01-11-43 |  | incomplete |  |  |
| 2026-10-23T01-13-07 |  | incomplete |  |  |
| 2026-10-23T01-15-12 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T01-35-55 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T01-52-46 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T02-16-51 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T03-22-22 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T03-34-10 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T03-46-53 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T03-56-56 | indus-foods / header | no-read-set |  |  |
| 2026-10-23T04-45-48 | indus-foods / header | checked | 968 | 480 |

## indus-foods/header: 2026-10-23T04-45-48

480 of 968 declared reads dropped (210 conserved, 278 CSS-wide keyword reads excluded), in 129 block and property groups.

### sgs/button (145)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| align-items | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | center |
| align-items | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | center |
| align-items | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | center |
| align-items | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | center |
| align-items | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | center |
| align-items | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | center |
| align-items | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | center |
| align-items | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | center |
| border-bottom-left-radius | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | 999px |
| border-bottom-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 999px |
| border-bottom-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | 999px |
| border-bottom-left-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 999px |
| border-bottom-left-radius | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 999px |
| border-bottom-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | 999px |
| border-bottom-left-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 999px |
| border-bottom-left-radius | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 999px |
| border-bottom-right-radius | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | 999px |
| border-bottom-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 999px |
| border-bottom-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | 999px |
| border-bottom-right-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 999px |
| border-bottom-right-radius | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 999px |
| border-bottom-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | 999px |
| border-bottom-right-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 999px |
| border-bottom-right-radius | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 999px |
| border-top-left-radius | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | 999px |
| border-top-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 999px |
| border-top-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | 999px |
| border-top-left-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 999px |
| border-top-left-radius | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 999px |
| border-top-left-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | 999px |
| border-top-left-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 999px |
| border-top-left-radius | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 999px |
| border-top-right-radius | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | 999px |
| border-top-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 999px |
| border-top-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | 999px |
| border-top-right-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 999px |
| border-top-right-radius | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 999px |
| border-top-right-radius | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | 999px |
| border-top-right-radius | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 999px |
| border-top-right-radius | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 999px |
| box-sizing | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | border-box |
| box-sizing | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | border-box |
| box-sizing | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | border-box |
| row-gap | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | 7px |
| row-gap | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 7px |
| row-gap | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | 7px |
| row-gap | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 7px |
| row-gap | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 8px |
| row-gap | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | 7px |
| row-gap | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 7px |
| row-gap | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 8px |
| text-decoration-line | {"tpl":"Root/13#0"} | cr-ref-header-3 | (root) | 375 | none |
| text-decoration-line | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | none |
| text-decoration-line | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 768 | none |
| text-decoration-line | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | none |
| text-decoration-line | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | none |
| text-decoration-line | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 1440 | none |
| text-decoration-line | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | none |
| text-decoration-line | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | none |
| background-color | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | rgb(255, 255, 255) |
| background-color | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | rgb(255, 255, 255) |
| background-color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(10, 126, 168) |
| background-color | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | rgb(255, 255, 255) |
| background-color | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgb(10, 126, 168) |
| box-shadow | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | rgba(0, 0, 0, 0.15) 0px 2px 6px |
| box-shadow | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | rgba(0, 0, 0, 0.15) 0px 2px 6px |
| box-shadow | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgba(10, 126, 168, 0.65) 0px 8px 18px -8px |
| box-shadow | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | rgba(0, 0, 0, 0.15) 0px 2px 6px |
| box-shadow | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgba(10, 126, 168, 0.65) 0px 8px 18px -8px |
| padding-bottom | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 6px |
| padding-bottom | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 6px |
| padding-bottom | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 10px |
| padding-bottom | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 6px |
| padding-bottom | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 12px |
| padding-left | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 14px |
| padding-left | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 14px |
| padding-left | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 18px |
| padding-left | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 14px |
| padding-left | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 22px |
| padding-right | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 14px |
| padding-right | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 14px |
| padding-right | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 18px |
| padding-right | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 14px |
| padding-right | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 22px |
| padding-top | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 6px |
| padding-top | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 6px |
| padding-top | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 10px |
| padding-top | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 6px |
| padding-top | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 12px |
| color | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | rgb(10, 126, 168) |
| color | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | rgb(10, 126, 168) |
| color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(255, 255, 255) |
| color | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | rgb(10, 126, 168) |
| column-gap | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 7px |
| column-gap | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 7px |
| column-gap | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 7px |
| column-gap | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 8px |
| font-weight | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 700 |
| font-weight | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 700 |
| font-weight | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 600 |
| font-weight | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 700 |
| font-size | {"tpl":"Root/14#0"} | cr-ref-header-4 | (root) | 375 | 15px |
| font-size | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 768 | 15px |
| font-size | {"tpl":"Root/20#0"} | cr-ref-header-5 | (root) | 1440 | 15px |
| border-bottom-color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(10, 126, 168) |
| border-bottom-color | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgb(10, 126, 168) |
| border-bottom-style | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | solid |
| border-bottom-style | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | solid |
| border-bottom-width | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 2px |
| border-bottom-width | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 2px |
| border-left-color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(10, 126, 168) |
| border-left-color | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgb(10, 126, 168) |
| border-left-style | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | solid |
| border-left-style | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | solid |
| border-left-width | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 2px |
| border-left-width | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 2px |
| border-right-color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(10, 126, 168) |
| border-right-color | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgb(10, 126, 168) |
| border-right-style | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | solid |
| border-right-style | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | solid |
| border-right-width | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 2px |
| border-right-width | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 2px |
| border-top-color | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | rgb(10, 126, 168) |
| border-top-color | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | rgb(10, 126, 168) |
| border-top-style | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | solid |
| border-top-style | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | solid |
| border-top-width | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 2px |
| border-top-width | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 2px |
| flex-shrink | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 0 |
| flex-shrink | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | 0 |
| text-wrap-mode | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | nowrap |
| text-wrap-mode | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | nowrap |
| white-space-collapse | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | collapse |
| white-space-collapse | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | collapse |
| display | {"tpl":"Root/54#0"} | cr-ref-header-16 | (root) | 1440 | inline-flex |
| transition-behavior | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | normal, normal, normal, normal |
| transition-delay | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 0s, 0s, 0s, 0s |
| transition-duration | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | 0.25s, 0.25s, 0.2s, 0.2s |
| transition-property | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | transform, box-shadow, background, color |
| transition-timing-function | {"tpl":"Root/58#0"} | cr-ref-header-14 | (root) | 768 | cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease |

### sgs/container (8)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| align-items | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 375 | center |
| align-items | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 768 | center |
| box-sizing | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 768 | border-box |
| column-gap | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 375 | 10px |
| column-gap | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 768 | 10px |
| row-gap | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 375 | 10px |
| row-gap | {"tpl":"Root/56#0"} | cr-ref-header-13 | (root) | 768 | 10px |

### sgs/icon (127)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | border-box |
| box-sizing | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 768 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | border-box |
| box-sizing | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 768 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | border-box |
| box-sizing | svg | cr-ref-header-9 | .sgs-icon__shape > .sgs-icon__svg | 768 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | border-box |
| box-sizing | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 768 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | border-box |
| box-sizing | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 1440 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | border-box |
| box-sizing | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 1440 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | border-box |
| box-sizing | svg | cr-ref-header-9 | .sgs-icon__shape > .sgs-icon__svg | 1440 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | border-box |
| box-sizing | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 1440 | border-box |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | 34px |
| height | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 768 | 17px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 34px |
| height | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 768 | 17px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 34px |
| height | svg | cr-ref-header-9 | .sgs-icon__shape > .sgs-icon__svg | 768 | 15px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 34px |
| height | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 768 | 17px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | 34px |
| height | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 1440 | 17px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 34px |
| height | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 1440 | 17px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 34px |
| height | svg | cr-ref-header-9 | .sgs-icon__shape > .sgs-icon__svg | 1440 | 15px |
| height | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 34px |
| height | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 1440 | 17px |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | center |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | rgb(255, 255, 255) |
| color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | rgb(255, 255, 255) |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 0 |
| flex-shrink | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 0 |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | center |
| justify-content | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | center |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | none |
| text-decoration-line | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | none |
| width | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 768 | 17px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 34px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 34px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 34px |
| width | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 1440 | 17px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 34px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 34px |
| width | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 34px |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 50% |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 50% |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 50% |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 50% |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 50% |
| border-bottom-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 50% |
| border-bottom-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 50% |
| border-top-left-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 768 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="26"] | cr-ref-header-8 | (root) | 1440 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 1440 | 50% |
| border-top-right-radius | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | 50% |
| fill | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 768 | rgb(255, 255, 255) |
| fill | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 768 | rgb(255, 255, 255) |
| fill | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 768 | rgb(255, 255, 255) |
| fill | svg | cr-ref-header-7 | .sgs-icon__shape > .sgs-icon__svg | 1440 | rgb(255, 255, 255) |
| fill | svg | cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | 1440 | rgb(255, 255, 255) |
| fill | svg | cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | 1440 | rgb(255, 255, 255) |
| background-color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | rgb(10, 102, 194) |
| background-color | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | rgb(10, 102, 194) |
| background-image | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 768 | radial-gradient(circle at 30% 107%, rgb(253, 244, 151) 0%, rgb(253, 89, 73) 45%, rgb(214, 36, 159) 60%, rgb(40, 90, 235) 90%) |
| background-image | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="35"] | cr-ref-header-10 | (root) | 1440 | radial-gradient(circle at 30% 107%, rgb(253, 244, 151) 0%, rgb(253, 89, 73) 45%, rgb(214, 36, 159) 60%, rgb(40, 90, 235) 90%) |
| display | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | flex |
| display | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | flex |
| transition-behavior | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | normal, normal |
| transition-behavior | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | normal, normal |
| transition-delay | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | 0s, 0s |
| transition-delay | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | 0s, 0s |
| transition-duration | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | 0.35s, 0.25s |
| transition-duration | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | 0.35s, 0.25s |
| transition-property | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | transform, box-shadow |
| transition-property | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | transform, box-shadow |
| transition-timing-function | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 768 | cubic-bezier(0.34, 1.56, 0.64, 1), ease |
| transition-timing-function | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="23"] | cr-ref-header-7 | (root) | 1440 | cubic-bezier(0.34, 1.56, 0.64, 1), ease |
| box-shadow | div[data-dc-tpl="9"] [data-dc-tpl="22"] [data-dc-tpl="29"] | cr-ref-header-9 | (root) | 768 | rgba(0, 0, 0, 0.18) 0px 2px 6px |

### sgs/multi-button (12)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| box-sizing | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 1440 | border-box |
| display | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 375 | flex |
| display | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 768 | flex |
| display | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 1440 | flex |
| min-width | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 375 | 0px |
| min-width | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 768 | 0px |
| min-width | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 1440 | 0px |
| row-gap | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 375 | 10px |
| row-gap | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 768 | 10px |
| row-gap | {"tpl":"Root/11#0"} | cr-ref-header-2 | (root) | 1440 | 10px |

### sgs/nav-bar-menu (65)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| align-items | {"tpl":"Root/45#0"} | cr-ref-header-15 | (root) | 1440 | center |
| align-items | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | center |
| align-items | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | center |
| box-sizing | {"tpl":"Root/45#0"} | cr-ref-header-15 | (root) | 1440 | border-box |
| box-sizing | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | border-box |
| box-sizing | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | border-box |
| column-gap | {"tpl":"Root/45#0"} | cr-ref-header-15 | (root) | 1440 | 2px |
| column-gap | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 6px |
| column-gap | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 6px |
| height | {"tpl":"Root/45#0"} | cr-ref-header-15 | (root) | 1440 | 100% |
| height | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 42px |
| height | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 42px |
| row-gap | {"tpl":"Root/45#0"} | cr-ref-header-15 | (root) | 1440 | 2px |
| row-gap | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 6px |
| row-gap | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 6px |
| background-color | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | transparent |
| background-color | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | transparent |
| border-bottom-left-radius | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-bottom-left-radius | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-bottom-right-radius | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-bottom-right-radius | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-bottom-width | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-bottom-width | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-left-width | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-left-width | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-right-width | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-right-width | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-top-left-radius | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-top-left-radius | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-top-right-radius | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-top-right-radius | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 11px |
| border-top-width | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| border-top-width | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| color | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | rgb(30, 42, 60) |
| color | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | rgb(10, 126, 168) |
| cursor | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | pointer |
| cursor | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | pointer |
| display | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | flex |
| display | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | flex |
| font-size | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 17px |
| font-size | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 17px |
| font-weight | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 600 |
| font-weight | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 600 |
| letter-spacing | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | -0.01em |
| letter-spacing | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | -0.01em |
| padding-bottom | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| padding-bottom | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| padding-left | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 15px |
| padding-left | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 15px |
| padding-right | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 15px |
| padding-right | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 15px |
| padding-top | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0px |
| padding-top | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0px |
| position | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | relative |
| position | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | relative |
| transition-behavior | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | normal, normal |
| transition-behavior | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | normal, normal |
| transition-delay | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0s, 0s |
| transition-delay | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0s, 0s |
| transition-duration | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | 0.22s, 0.22s |
| transition-duration | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | 0.22s, 0.22s |
| transition-property | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | background, color |
| transition-property | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | background, color |
| transition-timing-function | {"tpl":"Root/47#1"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | 1440 | ease, ease |
| transition-timing-function | {"tpl":"Root/47#0"} | cr-ref-header-15 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | 1440 | ease, ease |

### sgs/responsive-logo (12)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| aspect-ratio | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 375 | 3741 / 848 |
| aspect-ratio | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 768 | 3741 / 848 |
| aspect-ratio | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 1440 | 3741 / 848 |
| box-sizing | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 1440 | border-box |
| display | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 375 | block |
| display | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 768 | block |
| display | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 1440 | block |
| height | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 375 | min(54px, -26.2443px + 22.6244vw) |
| height | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 768 | 56px |
| height | {"tpl":"Root/43#0"} | cr-ref-header-12 | (root) | 1440 | clamp(54px, 4.4vw, 66px) |

### sgs/site-header (6)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| box-sizing | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 1440 | border-box |
| top | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 375 | 0px |
| top | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 768 | 0px |
| top | {"tpl":"Root/39#0"} | cr-ref-header-0 | (root) | 1440 | 0px |

### sgs/site-header-row (99)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| box-sizing | {"tpl":"Root/9#0"} | cr-ref-header-1 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | border-box |
| box-sizing | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 375 | border-box |
| box-sizing | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | border-box |
| box-sizing | {"tpl":"Root/9#0"} | cr-ref-header-1 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | border-box |
| box-sizing | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 768 | border-box |
| box-sizing | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | border-box |
| box-sizing | {"tpl":"Root/9#0"} | cr-ref-header-1 | (root) | 1440 | border-box |
| box-sizing | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | border-box |
| box-sizing | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 1440 | border-box |
| box-sizing | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | border-box |
| align-items | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | center |
| align-items | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | center |
| align-items | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | center |
| align-items | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | center |
| align-items | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | center |
| align-items | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | center |
| display | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | flex |
| display | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | flex |
| display | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | flex |
| display | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | flex |
| display | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | flex |
| display | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | flex |
| height | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | 46px |
| height | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 72px |
| height | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | 46px |
| height | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 72px |
| height | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | 46px |
| height | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 84px |
| margin-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | 0px |
| margin-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 0px |
| margin-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | 0px |
| margin-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 0px |
| margin-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | 0px |
| margin-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 0px |
| margin-left | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | auto |
| margin-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | auto |
| margin-left | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | auto |
| margin-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | auto |
| margin-left | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | auto |
| margin-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | auto |
| margin-right | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | auto |
| margin-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | auto |
| margin-right | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | auto |
| margin-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | auto |
| margin-right | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | auto |
| margin-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | auto |
| margin-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | 0px |
| margin-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 0px |
| margin-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | 0px |
| margin-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 0px |
| margin-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | 0px |
| margin-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 0px |
| padding-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | 0px |
| padding-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 0px |
| padding-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | 0px |
| padding-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 0px |
| padding-bottom | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | 0px |
| padding-bottom | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 0px |
| padding-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 375 | 0px |
| padding-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 0px |
| padding-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 768 | 0px |
| padding-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 0px |
| padding-top | {"tpl":"Root/10#0"} | cr-ref-header-1 | .sgs-container__inner | 1440 | 0px |
| padding-top | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 0px |
| background-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 375 | rgb(255, 255, 255) |
| background-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 768 | rgb(255, 255, 255) |
| background-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 1440 | rgb(255, 255, 255) |
| border-bottom-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 375 | rgb(216, 202, 80) |
| border-bottom-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 768 | rgb(216, 202, 80) |
| border-bottom-color | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 1440 | rgb(216, 202, 80) |
| border-bottom-style | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 375 | solid |
| border-bottom-style | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 768 | solid |
| border-bottom-style | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 1440 | solid |
| border-bottom-width | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 375 | 3px |
| border-bottom-width | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 768 | 3px |
| border-bottom-width | {"tpl":"Root/40#0"} | cr-ref-header-11 | (root) | 1440 | 3px |
| column-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 20px |
| column-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 20px |
| column-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 20px |
| justify-content | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | space-between |
| justify-content | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | space-between |
| justify-content | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | space-between |
| max-width | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 1320px |
| max-width | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 1320px |
| max-width | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 1320px |
| padding-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 20px |
| padding-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 32px |
| padding-left | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 40px |
| padding-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 20px |
| padding-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 32px |
| padding-right | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 40px |
| position | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | relative |
| position | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | relative |
| position | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | relative |
| row-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 375 | 20px |
| row-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 768 | 20px |
| row-gap | {"tpl":"Root/41#0"} | cr-ref-header-11 | .sgs-container__inner | 1440 | 20px |

### sgs/social-icons (6)

| Property | Draft id | Node | Part | Width | Declared |
|---|---|---|---|---|---|
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 768 | center |
| align-items | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 1440 | center |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 768 | border-box |
| box-sizing | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 1440 | border-box |
| row-gap | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 768 | 10px |
| row-gap | div[data-dc-tpl="9"] [data-dc-tpl="22"] | cr-ref-header-6 | (root) | 1440 | 10px |

