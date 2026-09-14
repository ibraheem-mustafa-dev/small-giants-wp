# Claude Design draft field-identity schema — evidence from one real draft

**doc_type:** report
**Date:** 2026-09-14
**Source:** `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html`
(the only real Claude Design export in this repo — everything below is n=1 evidence,
not yet proven universal; see "What's still unverified" at the end)

## Why this doc exists

The classless-repeater-recognition problem (parked, `.claude/decisions.md` D1074) was
investigated three times this session using only the RENDERED HTML a repeated group produces.
All three attempts failed review. Bean asked directly why, given the file contains the FULL
page — JS, HTML, and data all in one place — and pushed to actually look. This doc is the
result: a systematic pass over every repeated `sc-for` group in the real draft, checked at
three separate layers (the JS code that BUILDS each item, the HTML that RENDERS it, and the
raw DATA it's built from), to find out which layer actually carries reliable identity signal.

**Headline finding: the JS construction layer carries strong, consistent signal that the HTML
alone does not. This was never checked by any of the three prior design attempts.**

## Layer 1 — JS construction code (STRONG signal, checked across 9 groups)

Every repeated group's data is built by a `.map()`/array-literal call inside the draft's
`render()`-equivalent method, immediately before being handed to the template. Checked:
`reasons`, `bagItems`, `ticker`, `marquee`, `faqs`, `reviews`, `megaTopBrands`, `shapeTiles`,
`filterGroups`/chips.

### Finding 1a — field names are self-describing English words, every time
No obfuscated/positional field names were found anywhere (no `x1`, `val3`, `_a`). Examples,
verbatim from the file:

```js
reasons: C.REASONS.map(r => ({no:r[0], title:r[1], body:r[2]}))
ticker: (...).map(t => ({text:t[0], icon:t[1]}))
faqs: C.FAQS.map((q,i) => ({q:q[0], a:q[1], open:..., toggle:() => ...}))
reviews: C.REVIEWS.map(r => ({text:r[0], who:r[1], initial:..., colour:r[2], date:r[3], ...}))
megaTopBrands: C.BRANDS.filter(...).map(b => ({name:b[0], count:b[1] + ' frames', go:...}))
```

`title`, `body`, `text`, `who`, `date`, `name`, `count` — the field name IS the semantic role.

### Finding 1b — a shared, named formatter function marks a value's TYPE unambiguously
```js
gbp(n){ return '£' + (Math.round(n*100)/100).toFixed(n % 1 ? 2 : 0); }
```
Used identically 6+ times across unrelated sections: `lineLabel: this.gbp(p.price + lp)`,
`priceLabel: this.gbp(p.price)`, `saveLabel: 'Save ' + this.gbp(save)`, `klarna: this.gbp(p.price / 3)`,
a filter-chip label (`'Up to ' + this.gbp(f.price)`). **Any field whose value passes through
`this.gbp(...)` is a price, with no exceptions found.**

### Finding 1c — a function value, not a string, is always an action
```js
addLens: () => this.setState(...),
remove: () => this.setState(s => ({bag: s.bag.filter((_,j) => j !== i)})),
toggle: () => this.setState({faqOpen: ...}),
go: () => this.go('shop', {...}),
```
`go`, `toggle`, `remove`, `addLens`, `toggleOpen`, `pick` all appear as function values across
different groups. **A field whose value is a function can never be a title, price, or any
other content field — it is categorically an action**, distinguishable by type alone (function
vs string), before even reading the name.

### Finding 1d — boolean has/no pairs mark conditional display, not content
```js
hasImg: !!C.IMG[s[1]], noImg: !C.IMG[s[1]],
isCheck: type === 'check', isChip: type === 'chip', ...
```
A recurring `hasX`/`noX` or `isX` boolean pair is a display-branch flag, not a content field —
confirmed by cross-referencing the matching `<sc-if>` blocks in the HTML (Layer 2 below).

## Layer 2 — HTML rendering (WEAKER on its own; ONE strong independent signal found)

### Finding 2a — tag choice for "the main label" is NOT consistent
- `reasons.title` renders as `<h3>`
- `reviews.who` (the reviewer's name — functionally the same "headline" role) renders as a
  plain `<span>`
- `faqs.q` (the question — also a headline role) renders as a `<span>` inside a `<button>`

**Tag shape alone cannot reliably identify "the title field" across different groups** — this
confirms why the three prior HTML-only design attempts kept finding collisions. The same
semantic role gets three different tags depending on which group it's in.

### Finding 2b — body/long-form content DOES lean toward a content-appropriate tag
- `reasons.body` → `<p>`
- `reviews.text` → `<blockquote>`
- `faqs.a` → `<p>`

Weaker but real: long-form text tends to land in `<p>`/`<blockquote>`, short labels in
`<span>`/`<div>`/bare. Not reliable enough alone (a price is also often a bare `<div>` or
`<span>`, as found this session), but a real, corroborating secondary signal.

### Finding 2c — `onClick="{{ field }}"` is a completely independent, HTML-only action signal
```html
<button onClick="{{ q.toggle }}" aria-expanded="{{ q.open }}">
```
This confirms Layer 1's Finding 1c from the HTML side alone, with no need to cross-reference
the JS: **any field bound inside an `onClick="{{ }}"` (or presumably `onChange`/`onSubmit` etc.)
attribute is an action, full stop.** Two independent layers agreeing on the same rule is a
much stronger basis than either alone.

## Layer 3 — raw data definitions (NO semantic labels, one exception)

Checked the `static X = [...]` constants that feed the `.map()` calls above (`C.REASONS`,
`C.TICKER`, `C.REVIEWS`, `C.FAQS`, `C.SHAPES`, `C.BRANDS`).

**Finding 3a — most raw data is anonymous positional tuples, not named objects:**
```js
static REASONS = [
  ['01','Below RRP, and I show you by how much','The recommended retail price sits...'],
  ...
];
```
The field NAMES (`no`/`title`/`body`) exist only at the `.map()` step (Layer 1), never in the
raw data itself. **Reading the raw data alone gives zero semantic signal** — the naming lives
entirely in the transformation code sitting between the data and the template.

**Finding 3b — one exception: `PRODUCTS` is already a named object literal at the data layer:**
```js
static PRODUCTS = [
  {id:1,brand:'Ray-Ban',name:'Aviator Classic',code:'...',price:139,rrp:171,...},
  ...
];
```
Not universal within this file, let alone across drafts — flagged as a real inconsistency, not
smoothed over.

## Summary — where to actually look, ranked by reliability

1. **Function-vs-string value (Layer 1c) and `onClick`/`onChange`-bound fields (Layer 2c)** —
   the strongest, most reliable signal found, confirmed independently at two separate layers.
2. **A value passed through a named, reused formatter function (Layer 1b, e.g. `this.gbp(...)`)**
   — very strong for the specific type that formatter marks (price, in this draft).
3. **Field names in the `.map()` construction code (Layer 1a)** — strong within this draft,
   assuming the AI tool that wrote it keeps naming fields in plain English (unverified across
   drafts, see below).
4. **HTML tag shape for long-form vs short-form content (Layer 2b)** — real but weak,
   corroborating only.
5. **HTML tag shape for "which field is the title" (Layer 2a)** — NOT reliable, confirmed
   inconsistent even within this one draft.
6. **Raw data-array shape (Layer 3)** — no signal in most cases; occasionally strong (`PRODUCTS`)
   but not something to design around as a general rule.

## What's still unverified

This is one draft. Every finding above held CONSISTENTLY across the 9 groups checked in this
file — that's real, repeated evidence, not a single lucky example — but it is still evidence
from a single AI-generated export. The next step (per the parked D1074 recommendation) is
checking whether a second, independently-generated Claude Design draft follows the same
conventions before treating any of this as a universal rule to build a recognition mechanism
on. If it does, layers 1c/2c/1b above are strong enough to be the primary signal, with 1a as a
secondary corroborating check and 2b as a tertiary tie-breaker — a materially different, and
likely much more reliable, design than any of the three HTML-only attempts already reviewed.
