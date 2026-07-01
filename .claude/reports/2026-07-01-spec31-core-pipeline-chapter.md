# Spec 31 new CORE chapter (v2, clarity-council-corrected) — to be inserted as the authoritative §2

> Placement: new top-level **§2 — THE CORE PIPELINE MECHANISM**, immediately after §1, made the self-explanatory heart of the spec. The current §2 "four orthogonal axes" becomes §2.9 reference detail. §3 (routing algorithm) and §13 (walker/content-fork) become detail beneath this and must not contradict it. Frontmatter `title` → "Universal Cloning Pipeline — Content + CSS Extraction". Filename → `31-UNIVERSAL-CLONING-PIPELINE.md`.
>
> **Mini-glossary (terms used below).** *Container-equivalent block* = any block wired to the shared `SGS_Container_Wrapper` PHP helper (§2.1). *InnerBlocks* = nested child blocks inside a parent block (WordPress Gutenberg). *Scalar attr* = a plain data field on a block (a string/number), as opposed to a nested child block. *Atomic block* = the smallest single-purpose block a bare tag maps to (`p→sgs/text`). *Fold* = absorb a wrapper's CSS onto the container's attributes and drop the wrapper div (it does NOT survive as its own block). *L1/L2* = the OUTER box layer / the CONTENT (inner-band) layer (§2.3). *`container_kind`* = a DB value (`section`/`layout`/`content`) that gates which editor panels + render layers a container-equivalent exposes — NOT a routing input. *Variant* = a named structural preset of a block (e.g. hero `split`) selected from its class modifier.

---

## 2. THE CORE PIPELINE MECHANISM — one recursive stream, content + CSS together

> **This section is the heart of the spec. Read it first; everything else is detail beneath it.** If you understand this section you understand how a draft becomes SGS blocks. It is written to be self-explanatory — you should never need it explained in conversation.

### 2.0 Plain English — what the pipeline does

The pipeline **recursively** walks the draft. It processes every node the same way, migrating **CONTENT and CSS together in ONE pass per element** — there is no separate "CSS route" and "content route" (that was the retired `convert.py` architecture). The unified stream is `build_block_markup` → `process_element` (CSS) + `extract_content` (content) in one traversal, not two document sweeps.

Every node that is a section or a wrapper renders through a **container-equivalent block** — `sgs/container` itself or a composite that has the shared container helper built in. There is no "sometimes a container, sometimes something else."

### 2.1 Container-equivalent blocks — the universal render surface (DB-identified, at ANY level)

A **container-equivalent block** is any block with the shared `SGS_Container_Wrapper` helper built in, identified in the DB (never a hardcoded list):

```sql
SELECT block_slug, container_kind FROM block_composition
WHERE wraps_block = 'sgs/container' AND container_kind IS NOT NULL;
```

`block_composition.container_kind` (∈ `section`/`layout`/`content`) is the converter's roster axis. It gates **panel/render-layer exposure** (which editor controls + PHP layers the block shows) — it is **NOT** a routing input (Spec 29 §2, §8; D194). A couple of blocks have render-side wrapper nuances — e.g. `sgs/modal` and `sgs/mobile-nav` are excluded from the wrapper-mirror (`containerMirror:false`, Spec 29 §3) — but that render-side axis is **separate** and does not remove a block from the converter roster (`container_kind`). Full roster + KIND meanings: **Spec 29** (canonical).

**Container-equivalent blocks appear at BOTH levels, treated identically:**
- **Section-class level** — a top-level page section (`sgs/hero`, or a slug-None `<section>` → `sgs/container`).
- **Div-class level** — a nested `<div>` deeper in the tree (`.sgs-feature-grid` → `sgs/feature-grid`; `__cards` → a grid container; `.sgs-products` → its own grid container).

There is **NO** "class-section vs div-section" distinction (R-31-9 universal — a carve-out for one or the other is a break). The recursion (§2.0) means a container-equivalent block nested three levels deep is decomposed by the exact same rules as a top-level section. When this section talks about "the container," it means whichever container-equivalent block is being processed at that point in the recursion — at any depth.

### 2.2 The per-node pipeline order (recognition → variant → layers → content)

For **every** node, in this order:

1. **Recognise the block by BEM name** (§13.2). The `sgs-<block>` root class resolves to a block slug via the DB (`slots`/`blocks`), name-free per R-31-2; a slug-None node **at any depth** defaults to `sgs/container` (FR-31-4). This decides *which* container-equivalent block the node becomes.
2. **Variant lookup — AT THIS RECOGNITION STAGE (load-bearing).** If the recognised block declares variants (`blocks.variant_attr IS NOT NULL`), read its variant from the node's **class modifier** (`--split`, `--featured`, `--trial`) against the **variants table** (`variant_slots` + `blocks.variant_attr`, FR-31-20) — DB-driven, query never guess (R-31-1/R-31-8). **The variant can change the block's structure — including whether it is a grid, which slots exist, and the layout.** So the variant is resolved *before* the generic layer pass and can pre-empt it: e.g. `sgs/hero --split` **IS** a 2-column grid *by variant definition* (`variant_slots`: `gridTemplateColumns`/`splitImage*`), not by generic `display:grid` detection. The generic layer decomposition (§2.3) only runs for what the variant does not already define. Variant lookup runs at recognition for a node at **any depth** — including a grid item that is itself a variant composite (a `sgs/product-card--featured` inside a grid is recognised as that variant *first*, never reduced to a generic grid cell — §2.5).
3. **Layer decomposition** (§2.3–§2.4) — for the CSS the variant didn't define.
4. **Content extraction** (§2.6) — in the same pass.

### 2.3 The layer decomposition — name-free, by CSS signature + structural position

A container-equivalent block decomposes the draft it wraps into **layers**, detected by **CSS signature + structural position, NEVER class name** (DEC-1/2/3; D85 — matching `__inner`/`__content` names caused wrong collapse and is banned):

| Layer | Physically lives on | Detected by (CSS signature) | Container destination |
|-------|--------------------|-----------------------------|-----------------------|
| **OUTER box (L1)** | the container's own root element | it is the root | `style.spacing.*`, `background*`, `border*`, `align`/`maxWidth` |
| **CONTENT band (L2)** | a **pass-through** inner wrapper (see §2.4 for "pass-through") | `max-width` + `margin:auto` (± padding), NO grid/flex, NO block identity | `contentWidth`, `contentPadding*` |
| **ARRANGEMENT (grid/flex)** | the **direct parent of the arranged items** (see the rule below) | `display:grid` OR `display:flex` (row/column layout) | grid → `layoutType:grid` + `gridTemplateColumns`/`gap`; flex → `layoutType:flex` + `gap` (+ justify/align) — the container's layout attrs |
| **PER-ITEM** | the arranged items (direct children of the ARRANGEMENT element) | box-CSS shared by the items | `gridItem*` defaults (§2.5) |

**The load-bearing ARRANGEMENT rule:** `display:grid` (or `display:flex`) **always sits on the immediate parent of the items**, because grid/flex only lay out an element's *direct* children. So the arrangement property is on whatever element directly parents the items — it is **NOT** a separate nested "grid layer" div, and it is **never** on the items. When you see `display:grid`/`display:flex`, that element **is** the arrangement level, and its direct children are the items. (Below, "grid item" is shorthand for an arranged item under either `display:grid` or `display:flex`.)

### 2.4 The recursive fold — what folds into the container vs what becomes its own container

The layers collapse onto **ONE** container-equivalent block. Apply the **grid-item test first**, then the **fold/recurse test**:

**Grid-item test (first).** A **grid item** = a direct child of an element carrying `display:grid`/`display:flex`. If the container itself carries the arrangement — on its root (brand), or folded up from a sole arrangement inner (trust-bar) — then its **direct children are grid items**: they go straight to §2.5 (become the container's InnerBlocks, each recognised variant-first, uniform box-CSS → `gridItem*`). **Grid items are NOT subject to the fold/recurse test below, even though they are siblings** — that is exactly how brand's two columns (`__content`/`__image`) are grid items of the section grid, not separate own-containers. The fold/recurse test applies **only to children that are not grid items** (i.e. the container is not itself an arrangement, or the child sits *beside* the arrangement, not inside it).

**Fold/recurse test (for non-grid-item children):**
- **A sole pass-through child folds in.** If the container's root has a **single** real child that is a *pass-through wrapper* — a `<div>` with **no block identity** (its BEM class resolves to no registered block) — that child **folds into the container**: its content-band CSS → `contentWidth`, its arrangement CSS → the container's layout attrs, and **its** children become the container's children (re-apply the grid-item test to them). Repeat while there is a sole pass-through child. (Trust-bar's sole `__inner` carries the grid → folds → badges become the container's grid items; gift's sole `__card-inner`, a content-band with no grid → folds to `contentWidth`.)
- **A sibling'd child, or a child with block identity, does NOT fold — it recurses as its own container.** When the container has **more than one** real child (a heading beside an arrangement, etc.), or a child resolves to a registered roster block, that child is its **own** container-equivalent block, processed by this same §2.2 procedure recursively — **not** flattened. (Gift's `__cards`, a grid beside the heading, stays its own grid container; `.sgs-feature-grid`/`.sgs-products` resolve to their own registered grid containers — **slug per DB recognition, never the literal class name**.)

**Consequence — where the arrangement CSS lands:** always on the **direct parent of the items**, which is either **this** container (arrangement on the root, or folded up from a sole arrangement inner — brand, trust-bar) **or** a **nested own-container** (arrangement beside siblings or with its own block identity — gift `__cards`, featured `.sgs-products`, ingredients `.sgs-feature-grid`). Same §2.3 rule at whatever depth; the only difference is nesting.

**Definitions.** *Pass-through* = a `<div>` whose BEM class resolves to no registered block (a bare structural wrapper), carrying only content-band and/or arrangement CSS. *Real child* = a direct child **element** that is content or a container-equivalent block, **plus** any non-whitespace text node (whitespace-only text is ignored). *Sole* = the container's root has exactly **one** real child and it is a pass-through wrapper; any sibling (element or non-whitespace text) makes it non-sole and blocks the fold.

### 2.5 Grid items fold into the container

The grid items become the container's **direct InnerBlocks**. Their box-CSS folds **per property**: any CSS property whose value is **the same on every item** folds into the container's `gridItem*` default attrs; any property that **differs on even one item** stays on that individual child block. *(Non-normative: with only two items, expect most properties to stay.)* A **heading** or any recognised content sibling of the grid is **content, not a grid item** — emitted as its own content block, never swept into the grid.

**A grid item that is itself a variant composite is recognised first (precedence over folding).** If a grid item is a variant composite (a `sgs/product-card--featured`), §2.2 step 2 recognises it as that block+variant **before** any `gridItem*` folding — it keeps its full variant identity and is **never** reduced to generic `gridItem*` box-CSS.

### 2.6 Content extraction runs in the same single pass

In the same traversal, per element, content migrates alongside its CSS — never as a second pass. **The one rule for "attribute vs child block":** a piece of content becomes a **typed scalar attr** when the target block renders that element itself (element-based blocks), or a **child InnerBlock** when the target block composes children (InnerBlocks blocks). That fork is the DB-driven content fork (§13.3 — `equivalent_block_for`, read with `role` + `attr_type`; `canonical_slot` drives *only* this content fork, never layout). Bare content tags resolve to their atomic block via `blocks.replaces` / `atomic_tag_map` (`p→sgs/text`, `h2→sgs/heading`, `a→sgs/button`, `img→sgs/media`, `blockquote→sgs/quote`).

### 2.7 Worked examples — the 7 Mama's homepage sections (the acceptance set)

> Class names below are **illustrative labels for the reader only** — the pipeline detects everything by CSS signature + BEM recognition, never by matching these literal names (§2.3).

| Section | Container (recognised) | Sole pass-through folds? | Where the GRID is | Grid items → InnerBlocks |
|---------|------------------------|--------------------------|-------------------|--------------------------|
| **hero** | `sgs/hero` | — | **variant-defined** (`--split` → 2-col via `variant_slots`; §2.2 step 2, not generic detection) | media / content |
| **trust-bar** | `sgs/trust-bar` | `__inner` (sole, carries the grid) → folds in | on the folded inner → the container | 4 `__badge` items |
| **brand** | `sgs/container` | — (no inner) | on the **outer box** (`.sgs-brand` root has `display:grid`) | `__content`, `__image` (2 cols) |
| **featured-product** | `sgs/container` | `__inner` (content-band, no grid) → folds to `contentWidth` | on a **nested own-container** `.sgs-products` (has siblings: the heading) | product cards (each recognised `featured`/`trial` **variant** first, §2.5) |
| **ingredients** | `sgs/container` | `__inner` → folds | on a **nested own-container** `.sgs-feature-grid` (`→ sgs/feature-grid`) | `sgs/info-box` items |
| **gift** | `sgs/container` | `__card-inner` → folds | on a **nested own-container** `__cards` (sibling of the heading) | cards |
| **social-proof** | `sgs/container` | `__inner` → folds | each inner block its own container; slider grid → its own container | `sgs/testimonial` items |

These seven migrating **content + images + layout faithfully on the live page-8 clone** (computed-style/innerText per section, draft-vs-clone, + Bean's eye — R-31-11/R-31-13) is the acceptance test that the core mechanism is built.

### 2.8 What this supersedes

This §2 is the canonical description of the pipeline. The old §2 "four orthogonal axes" (LAYERS/KIND/CHILD-SHAPE/VARIANT, now §2.9), §3 (routing algorithm), and §13 (walker/content-fork) are detailed reference **beneath** this and must not contradict it. The frozen `convert.py`'s separate CSS/content routes are **not** the architecture — the pipeline is one recursive stream (§2.0). Cross-refs: Spec 29 (roster + KINDs + §8 name-free routing), §13.2 (BEM recognition + FR-31-4 default), §13.5 (FR-31-20 variant detection), §13.3 (FR-31-2 content fork), WRAPPER-CSS-ROUTING-DESIGN-GATE (DEC-1..5).
