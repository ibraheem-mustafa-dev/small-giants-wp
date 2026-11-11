# media-ac25: AC-25 before/after proof for the media switch (Spec 49 §12)

AC-25: the computed width, height, object-fit and crop position of every media paint stay within 1px before and after the switch, except listed allowed changes. Node + Playwright (installed in `scripts/computed-route`: run `npm ci` there first, from PowerShell).

## Commands

```bash
# 1. List the published URLs of a local mirror (read only; counts on stderr)
bash scripts/media-ac25/pages.sh local-mediatest-mamas > urls.txt

# 2. Capture (375x812, 768x1024, 1440x900; full-page scroll; reduced motion). One JSON per page per viewport.
node scripts/media-ac25/capture.mjs --base http://localhost:8094 --label before --out DIR/before/mamas --urls urls.txt [--rate SECONDS] [--workers N]

# 3. Compare (exit 1 on any unallowed difference)
node scripts/media-ac25/compare.mjs DIR/before/mamas DIR/after/mamas [--allow allow.json] [--tolerance 1] [--verbose]

# 4. Self-test with a negative control (starts and stops its own local server)
node scripts/media-ac25/self-test.mjs
```

`--rate N` waits at least N seconds between page loads (use 2 on remote sites). `--urls` takes paths or full URLs, one per line.

## What is recorded and compared

Each visible `img`, `video`, `iframe`, and inline `svg` of 64px or more in either direction (not inside `.sgs-icon`, buttons or nav), plus every element, `::before` and `::after` whose computed `background-image` holds a `url(` (the element's box is recorded). Per paint: a file key (file name without `-123x456`, `-scaled`, extension; svg: hash of viewBox plus first path), box, `object-fit` and `object-position` or `background-size/position/repeat/attachment`, the nearest SGS block class, console errors and HTTP status.

Compare matches paints per page and viewport by file key in top-to-bottom order. Background `cover`/`contain` counts as object-fit, background-position as object-position (keywords and percentages become fractions). It reports matched, changed (with numbers), missing after and new after, plus a summary table. Width and height must be within the tolerance; position fractions within 0.01; fit, repeat and attachment equal. Box x/y movement is shown only with `--verbose`.

## Allow file

A JSON array; every entry needs a `reason`. `page`, `key` and `property` are `*` globs (default `*`). `page` matches the capture name (`<page-stem>.<viewport>`, for example `home.1440`), `key` the file key, `property` one of `width`, `height`, `fit`, `size`, `position`, `repeat`, `attachment`, `missing` (paint gone after), `new` (paint added after), `status` (HTTP status).

```json
[{ "page": "home.*", "key": "hero-photo", "property": "position", "reason": "hero Size and Position were inert before" }]
```
