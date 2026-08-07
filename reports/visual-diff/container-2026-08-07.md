---
block: sgs/container
date: 2026-08-07
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp against the live canary at 1440, post-deploy
change: LayoutPanel gained a `showLayout` prop (default TRUE) — editor-only, no render change
---

## Why this block is in this commit at all
The change is one prop added to `container/components/ContainerWrapperControls.js`
so that `sgs/gallery` can keep the shared responsive Gap while suppressing
LayoutPanel's colliding Layout and Columns controls. It is an EDITOR component.

## Why container's own output cannot change
- `showLayout` defaults to **true**, and container never passes it — verified:
  `grep showLayout` across `src/blocks/container/` outside the component file
  returns **0**. Default true reproduces the previous behaviour exactly.
- The only file touched under `src/blocks/container/` is the JS component.
  `container/render.php` is untouched (`git status` on that directory lists one
  file, the component).
- The other six LayoutPanel consumers (card-grid, cta-section, hero, product-faq,
  trust-bar, and container itself) all keep the default. Only gallery opts out.

## Live measurement (post-deploy, 1440)
5 `sgs/container` instances on the canary render normally: 0 carry an inline
`style` attribute; sampled boxes 44x44 flex, 1425x2307 block, 443x156 block —
all laid out as expected.

## Limits
This evidences the RENDERED frontend, which is where the "no change" claim
matters. The editor-side effect (gallery showing one Layout control instead of
two) is asserted from the prop's default and the grep above, not captured in the
editor.
