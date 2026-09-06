# SMIL `href` bypass — REASONED claim, now EXECUTED

**Date:** 2026-09-01 · **Block:** `sgs/media` (svg mode) · **Sanitiser:** `sgs_allowed_svg_tags()` / `sgs_svg_kses_allowed_tags()` (`plugins/sgs-blocks/includes/helpers-svg-kses.php`)

---

## The claim, as it stood before today

D905's SVG-sanitiser unification (2026-08-30) reasoned that `<a><animate
attributeName="href" to="javascript:…"></a>` could bypass `wp_kses`'s
protocol filter — `wp_kses` only checks attributes it recognises as URIs
(`href`, `src`, `action`) against a protocol allowlist; `<animate>` can set an
arbitrary attribute at runtime via SMIL, so a payload placed in `to` passes
sanitisation unchanged and only becomes a live `href` after the browser
applies the animation. The mitigation shipped (`<a>` carries no `href`,
`xlink:href`, or `target` in the allowlist at all — only `core_attrs`), but
was never fired against a real browser. The code comment said so explicitly:
`⚠ REASONED, NOT YET EXECUTED`.

## Why "no alert fired" would not have been good enough

A probe that cannot observe execution reports the identical "nothing
happened" result as one that correctly blocked a real attack. Per
`a-check-with-no-positive-control-passes-against-a-dead-feature`, the positive
control had to run first and had to genuinely prove the harness can see a
`javascript:` URI execute — otherwise "blocked" and "blind" are indistinguishable.

## What was built

- `plugins/sgs-blocks/scripts/probes/build-smil-bypass-fixture.py` — publishes
  the exact D905-reasoned payload through the REAL sanitisation path: an
  `sgs/media` block with `mediaType:"svg"`, `svgContent` carrying
  `<svg><a id="smil-anchor"><animate attributeName="href" begin="0s"
  dur="0.1s" fill="freeze" to="javascript:window.SGS_PWNED=true"/><circle
  .../></a></svg>`, sanitised server-side by the exact same
  `wp_kses($raw, sgs_allowed_svg_tags())` call item 1 diffed `sgs/button`
  against. Live at page **3148**, `[GATE - DO NOT DELETE] SMIL bypass probe`.
- `plugins/sgs-blocks/scripts/probes/probe-smil-bypass.mjs` — two-step probe.

## Step 1 — positive control (run first, gates step 2)

A raw, **unsanitised** `<a href="javascript:window.SGS_PWNED=true">` was
injected client-side (`page.setContent`, no WordPress involved at all),
clicked with a real Playwright synthetic click, and `window.SGS_PWNED` was
read back.

```
[PASS] positive control: clicking a raw javascript: href sets window.SGS_PWNED — window.SGS_PWNED === true after click
```

This proves the harness/browser combination genuinely observes a
`javascript:` URI executing. The probe refuses to run or trust step 2 if this
fails.

## Step 2 — the real path

Loaded page 3148 (the sanitised payload above), confirmed server-rendered
markup:

```html
<a id="smil-anchor">
  <animate attributename="href" begin="0s" dur="0.1s" fill="freeze" to="javascript:window.SGS_PWNED=true">
  <circle cx="50" cy="50" r="40" fill="red"></circle>
</a>
```

— note the rendered `<a>` carries no `href` attribute at all (D905's
mitigation, confirmed live, not just in the allowlist source). Waited 500ms
for the SMIL animation (`begin="0s" dur="0.1s" fill="freeze"`) to run and
settle, then read the `<a>`'s live `href` attribute, then clicked it exactly
as step 1 did:

```
[PASS] SMIL did NOT succeed in writing a live href attribute onto the sanitised <a> — getAttribute('href') = null
[PASS] clicking the sanitised <a> did NOT execute the javascript: payload — window.SGS_PWNED never set

VERDICT: PASS — 3/3 assertions held (positive control counted)
```

## Conclusion

**Bypass BLOCKED, control FIRED.** The mitigation holds: an `<a>` element that
was never given a `href` attribute cannot have one summoned into existence by
SMIL animating a nonexistent attribute — this browser (Chromium via
Playwright) does not create the attribute out of nothing, so there is nothing
for a click to navigate through. The reasoning behind D905's fix was correct,
and now it is measured, not just argued.

## Residual, not this session's scope

The same code comment records a lower-severity residual already accepted
and left in place: `<use>`, `<image>`, `<textPath>`, and the gradient elements
still carry `href`/`xlink:href` (needed for their normal function — referencing
shapes/gradients), so the same animate-an-attribute trick could still point
one at an external URL. That is a resource fetch, not script execution, and
browsers have restricted external `<use>` references to same-origin since
~2017. Not tested this session — flagged in the code as "revisit if any of
those gains a navigating behaviour," unchanged by this work.

## Commands run

```bash
python plugins/sgs-blocks/scripts/probes/build-smil-bypass-fixture.py --apply
node plugins/sgs-blocks/scripts/probes/probe-smil-bypass.mjs \
  https://sandybrown-nightingale-600381.hostingersite.com/?page_id=3148
```
