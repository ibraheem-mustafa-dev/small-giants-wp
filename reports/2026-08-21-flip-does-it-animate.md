---
doc_type: report
project: small-giants-wp
spec_ref: 38
created: 2026-08-21
subject: "FR-38-12 Flip × WooCommerce Product Collection — does it animate?"
verdict: "NO — and the cause is not in SGS code"
---

# Does the Flip effect animate? — measured 2026-08-21

**Asked by Bean:** *"I think the flip effect hasn't worked yet tbh when we've wired it in."*

**Answer: it does not animate, and it cannot on this canary today. The SGS side is wired
correctly and verified working; the blocker is that WooCommerce performs a FULL PAGE
NAVIGATION when a filter changes, so there is no client-side re-layout for `Flip.from()` to
animate.**

This is D426's finding recurring at the redirected target. D426 killed the original
`sgs/filter-search` × `sgs/card-grid` pairing because *"no client-side re-layout exists for
Flip to animate"*. The redirect to WooCommerce Product Collection assumed WC's Interactivity
API router would supply one. On this configuration it does not.

---

## What was measured

### 1. The setting had never been switched on

```
wp option get sgs_motion_settings
  → "animate_product_filtering": ""
```

The render-layer injector only stamps `data-sgs-fx="flip"` when this is ON, so before any
other question: the module was never loading. **That alone accounts for "it hasn't worked".**
It was enabled for this test and **restored to `""` afterwards** — see "State left behind".

### 2. With the setting ON, the SGS plumbing works — all of it

| Check | Result |
|---|---|
| Injector stamps the attribute | ✅ `data-sgs-fx="flip"` present on the Product Collection |
| Module enqueued | ✅ `@sgs/fx-flip` + `fx-flip.js` both in the page |
| Observer target exists | ✅ `.wp-block-woocommerce-product-collection` found |
| Product nodes reachable via `:scope li` | ✅ 5 found |

So the injector, the site setting, the conditional-loading registry and the selector contract
are all correct. Nothing on the SGS side is broken.

### 3. But a filter change reloads the page

A `window.__survivor` variable was stamped before clicking a filter and checked after — the
technique the shop-archive track used to prove *instant* filtering elsewhere.

```
BEFORE: { products: 5, url: /shop/ }
AFTER : { survivorAlive: false,
          products: 3,
          url: /shop/?filter_flavour=vanilla&query_type_flavour=or }
main-frame navigations after click: 2
```

**The survivor did not survive.** The document was replaced. Filtering *works* (5 → 3
products), but by navigation, not by client-side update. A `MutationObserver` cannot observe a
re-layout that never happens in the same document, and `Flip.getState()` has no "before" to
capture.

### 4. The filter control is genuinely WooCommerce's own interactive component

Read from the live DOM (not from HTML source — the first source match for the class was the
inline stylesheet, not the element):

```
BUTTON  .wc-block-product-filter-chips__item
  role="checkbox"  aria-checked="false"  value="vanilla"
  data-wp-on--click="actions.toggle"
  data-wp-context="{…}"
  ancestors: BUTTON → DIV → FIELDSET → DIV[interactive] → DIV[interactive]
```

The page also declares the router regions WC uses for client-side updates
(`data-wp-router-region="wc-product-collection-0"`, `wc-product-filters-…`,
`wc-product-results-count-0`) and `forcePageReload` is `null`, not `true`. So WooCommerce
*intends* client-side navigation here — it simply is not delivering it on this configuration.
**Diagnosing why is a WooCommerce question, not an SGS one**, and is the next step.

---

## A false result I nearly reported, recorded because it matters

A second probe was written to re-test using a checkbox filter instead of a chip. It printed
`=> CLIENT-SIDE (no reload)` — the opposite conclusion.

It was **vacuous**. The page has **zero** checkbox inputs (measured: `checkboxInputs: 0`,
`chips: 16`); nothing was clicked, so of course the survivor lived and the product count did
not change. The only reason this was caught is that the probe printed which control it
actually clicked (`{"used":"NONE"}`).

A probe that reports a pass without saying what it did is not a measurement.

---

## What this means for FR-38-12

- **Do NOT "fix" `fx-flip.js`.** It is not the broken part. The module, its
  `MutationObserver`, the injector, the setting and the registry wiring are all verified
  correct.
- **The open question is a WooCommerce one:** why does this Product Collection fall back to
  full navigation when it declares router regions and does not force a reload? Candidates
  worth checking, in order: an unsupported block inside the template disabling WC's
  client-side navigation; the archive being an `inherit: true` query (the template's block is
  `{"queryId":0,"query":{"inherit":true,…}}`) which WC treats differently from a bespoke
  collection; or a WC version behaviour.
- **Until that is answered, FR-38-12 cannot be closed as working**, and Spec 38 should not
  claim it animates. The design gate's own unconfirmed prerequisite — *"the sandybrown canary
  needs a live WooCommerce catalogue with a Product Collection block using an active filter…
  confirm this exists"* — **is now confirmed to exist**; it is the client-side re-layout that
  does not.

---

## State left behind

- `animate_product_filtering` **restored to `""`** (its found state). Leaving it on would ship
  a JS module on every shop page for an effect that provably does nothing here.
- No code was changed. No commits. This was measurement only.

## Reproduce

The three probes used are in the session scratchpad; the decisive one stamps a survivor
variable, clicks `.wc-block-product-filter-chips__item`, and reports whether the variable
survived plus the main-frame navigation count.
