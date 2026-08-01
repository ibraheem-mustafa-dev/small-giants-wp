# sgs-tabs-realistic — expected behaviour

**Fixture:** `sgs-tabs-realistic.draft.html`
**Replaces:** `tests/fixtures/conformance/sgs-tabs.html` (29 lines) — kept live until this
one proves out, then retired.
**Created:** 2026-08-01, as Task 0 of the wrapper-recognition cascade rework.

---

## Why this fixture exists

The conformance stub it replaces renders bare-bones and broken in a browser, and its shape
(a `border-bottom` on `__nav`, a one-`<p>` panel, no content band) was actively misleading
the wrapper-recognition analysis. It was authored to exercise a code path, not to represent
tabs as a real client draft would carry them.

This one is a product-page tabbed detail panel: a tablist, three triggers with a real
active state, and one content-rich panel laid out as a two-column media/body grid that
stacks on mobile.

## Browser render — verified 2026-08-01 (isolated headless Chromium, not the shared MCP profile)

| Probe | Desktop 1280 | Mobile 375 |
|---|---|---|
| `.sgs-tabs__inner` width | 960px (band cap honoured) | 343px |
| `.sgs-tabs__nav` display | `flex` | `flex` + `overflow-x:auto` |
| `.sgs-tabs__panel` tracks | `340px 572px` | `343px` (stacked) |
| `.sgs-tabs__list` tracks | `264px 264px` | `323px` (single column) |
| active trigger border | `rgb(230,138,149)` | same |
| inactive trigger border | `rgba(0,0,0,0)` | same |
| document horizontal overflow | 0px | 0px |

The `<img>` `src` is a placeholder path (`/media/…`), matching the convention of every other
`phase-f` fixture — it renders as a broken-image box standalone and resolves through the
media map on a real pipeline run.

---

## Authoring contract this fixture honours

| Rule | Where |
|---|---|
| Spec 00 §3.1 SGS-BEM (`sgs-tabs__<element>--<modifier>`, lowercase, hyphens only) | every class |
| Spec 00 §3.3 content band = `max-width: var(--content-width)` + `--content-width` + `margin:0 auto` on the direct-descendant inner | `.sgs-tabs__inner` |
| Spec 00 §3.4 selected state = `--active` BEM modifier + ARIA | `.sgs-tabs__trigger--active` + `aria-selected="true"` |
| Spec 00 §3.4 transient state = `:hover` | `.sgs-tabs__trigger:hover` |
| Device-tier breakpoint 767 (never an arbitrary value) | the one `@media` block |

## ⚠ ONE panel is CORRECT — do not "fix" this

The triggers switch what is shown inside the single panel. A **static** draft can only
author the ACTIVE tab's content, so a conformant tabs draft has N triggers and exactly one
panel. A previous session called this malformed; it is not.

Consequently `sgs/tab` is **synthesised**, never mapped 1:1 from a DOM node: `sgs/tab`
declares `label` (role `content`) and IS the panel (`render.php` emits `role="tabpanel"`,
content is `$content`). One `sgs/tab` = one trigger's LABEL + the panel's CONTENT. Neither
`__nav` nor `__panel` maps to a `sgs/tab` on its own.

---

## Target behaviour (what a correct clone must produce)

1. `.sgs-tabs` → `sgs/tabs` (registered block, Path 1 bare-root match).
2. `.sgs-tabs__inner` → **folds** — it is the L2 content band. `--content-width: 960px`
   lands on `sgs/tabs.contentWidth`; it must NOT emit a block of its own.
3. `.sgs-tabs__nav` → **must not resolve to a block.** It is the tablist wrapper. It
   currently resolves to `sgs/info-box` via the `items` slot's alias list — the recognition
   defect this rework exists to fix.
4. `.sgs-tabs__trigger` ×3 → the three tabs' `label` values.
5. `.sgs-tabs__panel` → the panel's content becomes the ACTIVE tab's inner blocks. It
   currently resolves to `sgs/info-box` because the `panel` element-slot row itself declares
   `standalone_block = sgs/info-box` (a DB-data defect, distinct from the alias hijack above).
6. `.sgs-tabs__panel-media` / `__panel-body` → transparent wrappers; dissolve, children
   recurse (media → `sgs/media`, heading → `sgs/heading`, paragraphs → `sgs/text`, list →
   `sgs/icon-list` or `sgs/text` per the DB).
7. The `@media (max-width:767px)` block maps to the `…Mobile` tier attrs, never a residual.

**Acceptance:** tabs clones correctly with NO vocabulary change — `trigger` is deliberately
NOT aliased to the `tab` slot. If the reworked recognition is right, tabs works without it.
