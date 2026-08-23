---
doc_type: phase-plan
project: small-giants-wp
created: 2026-08-23
status: NOT STARTED — next session
supersedes: nothing (new track, opened by Bean's regression report 2026-08-23)
---

# Template-by-template remediation

## Why this exists

Bean reviewed the templates in the Site Editor after the Phase 3 design-benchmark
implementation and found widespread problems: validation errors on eight templates,
product listings rendering as generic core-block stacks instead of the bespoke
`sgs/product-card`, unstyled sorting and pagination, and templates of the same type
that clearly were not designed against each other.

**He found all of it by eye, in the editor. None of it was caught by a gate, by the
build, or by my own live measurements.** That is the single most important fact in
this document and it shapes the whole approach below.

## The rule that governs every task here

> **Agents may NOT assess a template by reading its code, querying the database,
> calling the REST API, or inspecting hooks. They must log in with `/playwright`,
> open the actual template, look at it, and interact with it.**

Bean set this rule directly. The justification is in the evidence: every check I ran
this session passed while the templates were visibly broken. Reading the source tells
you what was authored. It does not tell you what a person sees.

Code and DB reads are still allowed as a *second* step, to explain something already
observed. They may never be the basis for saying a template is fine.

---

# Part 1 — What is actually true

Established before writing this plan, so the next session does not start from my
account of events.

## Mine, and actively breaking the editor

**Raw HTML comments inside block delimiters — 5 of them, 2 files.**

| File | Lines |
|---|---|
| `templates/404.html` | 14, 24, 45 |
| `templates/single.html` | 12, 47 |

WordPress splits a block's saved content into chunks and compares the non-null ones
against `save()`. A raw comment is not a placeholder, so it lands in those chunks.
Inside an `sgs/container` — whose `save()` returns the empty string — it always
reports **"Block contains unexpected or invalid content."**

`archive-product.html` carries a long comment at the top explaining this exact trap.
I quoted the rule verbatim into all five agent briefs. Then I broke it myself, in the
one place I was writing by hand rather than delegating.

**Fix: move all five comments above the outermost block delimiter.** Minutes, not
hours. This should be done FIRST, before any other work, because it is a known cause
with a known fix and it is blocking the editor.

## Not mine — stated so the next session does not go hunting

- **I added no template files.** The theme has the same nine it started with:
  404, archive-product, archive, front-page, index, page, search, single-product,
  single. Verified with `git log --diff-filter=A`.
- **Order Confirmation, Coming soon, Products by Attribute** are registered by
  WooCommerce, not by our theme. They appear in the Site Editor list without existing
  as files in `theme/sgs-theme/templates/`. This is why "Products by Attribute" looks
  redundant next to Product Archive — it is WooCommerce's, not a duplicate we made.
- **The shop archive still uses `sgs/product-card`** (`archive-product.html:135`,
  inside `woocommerce/product-collection` → `woocommerce/product-template`). It was
  not replaced.
- **Pagination on the archives is pre-existing**, not something introduced this
  session. If infinite scroll existed before, it was removed earlier — needs a
  git-history check (see Task 6).

## The product-collection question — corrected after Bean clarified

Bean: *"product collection was a variant or custom setup of one of our collection
blocks like card grid or post collection."*

**He is right, and it is a bigger gap than I first wrote.** `sgs/card-grid` declares:

- `source` — enum `manual | query | wc-product | cpt-collection`
- `productSource` — `collection` (smart preset + filters) or `handpick`
- `productIds`, and responsive `columns` (3 / 2 / 1)

and its `render.php` **renders each result as an `sgs/product-card`**
(`card-grid/render.php:514, 555, 570`; the file's own docblock at line 8 says so).
That is the bespoke product collection. There is no block literally named
`sgs/product-collection` — the capability lives in `sgs/card-grid` in `wc-product`
mode.

**What the templates actually use instead:**

| Template | Current | Renders as |
|---|---|---|
| `archive-product.html:126-136` | `woocommerce/product-collection` → `woocommerce/product-template` → `sgs/product-card` | our card, inside WooCommerce's machinery |
| `single-product.html:34-40` | `woocommerce/product-collection` → `woocommerce/product-template` → generic `product-image` + `post-title` + `product-price` | **generic stack** |

**Checked with `git log -S`: `sgs/card-grid` has NEVER appeared in any of these five
templates, and neither has `sgs/post-grid`.** So this is not something that was
removed — the bespoke path was built and the templates were never wired to it.

That distinction matters only for HOW it gets fixed (build it in, rather than revert
to it). **It does not soften the complaint, which is correct: the framework has a
designed product collection and the templates do not use it.** The PDP related rail is
the worst case — fully generic — and my shop-scoped card styling made the contrast
between the two more obvious.

---

# Part 2 — The issue register

Every item Bean raised, with what is known and what still needs establishing.

## A. Validation and loading errors

| ID | Template | Error reported |
|---|---|---|
| A1 | Page: 404 | Block contains unexpected or invalid content |
| A2 | Single Posts | Block contains unexpected or invalid content |
| A3 | Product Archive | errors reported, exact text TBC |
| A4 | Single Product | errors reported, exact text TBC |
| A5 | Search Results | errors reported, exact text TBC |
| A6 | Order Confirmation | Template part has been deleted or is unavailable |
| A7 | Page: Coming soon | Template part has been deleted or is unavailable |
| A8 | Products by Attribute | errors reported, exact text TBC |

Error strings seen across these: *"Template part has been deleted or is unavailable"*,
*"Error loading block: [object Object]"*, *"Block contains unexpected or invalid
content."*

**A1 and A2 have a proven cause** (comments inside delimiters, above).

**A6/A7 are a different failure** — a missing template part, not invalid content. Those
templates are WooCommerce's and reference parts that may not exist in our theme.

**"Error loading block: [object Object]"** needs its own diagnosis. The LEDGER records
that the canary intermittently returns 500s under the concurrent block-renderer calls a
template load fires, producing phantom banners that vanish on reload. **Do not assume
that explanation — reload and confirm before attributing anything to infrastructure.**

## B. Product listings not using the bespoke card

| ID | Where | Current | Should be |
|---|---|---|---|
| B1 | PDP related rail | generic image + title + price | `sgs/card-grid` `source:wc-product` → `sgs/product-card` |
| B2 | Shop archive | WC product-collection wrapping `sgs/product-card` | same target, IF filter binding survives — check first |
| B3 | Any other product listing | audit needed | same target |

Bean: *"all of the pages that list products in an archive page should have it set up
where they are using the product-collection block which makes each product item be
shown as my sgs/product-card."*

**Task 5 must find every product listing across every template and check which pattern
each uses.** Bean says this has happened "for several other bits across all of these
templates" — treat his count as the reliable one and find them all.

## C. Unstyled blocks that ignore the site's design system

| ID | Block | Problem |
|---|---|---|
| C1 | `woocommerce/catalog-sorting` | completely unstyled — no padding, border, colour or typography from the global styles |
| C2 | `core/query-pagination` | unstyled, out of place, looks dropped in |

Bean's framing is worth keeping: *"probably because we didn't design a custom block or
the agent just threw it down and left it without bothering with harmonising it to the
page."* Both need to inherit the site's tokens, or become properly designed blocks.

## D. Cross-template inconsistency

| ID | Issue |
|---|---|
| D1 | Search bar is at the BOTTOM on Search Results, at the TOP on Product Archive |
| D2 | Search button is yellow with black text on Search Results; pink with a magnifying-glass icon on Product Archive |
| D3 | Search Results uses `core/search`; Product Archive uses `sgs/product-search` — two different blocks, two different looks |
| D4 | Parts are "weirdly sized in proportion to others" — needs visual capture at several widths |

Bean: *"some archive templates look like they were made while not knowing what the
others of the same type looked like."* That is the real diagnosis — these were built in
isolation. The remedy is a shared decision about what an archive header IS, applied to
all of them.

## E. Product Archive layout regression

Bean: *"Product archive's format looks super broken compared to what it was when we
were working on it."*

**This must be established by comparing against a previous version, not by my
description of what I changed.** See Task 6.

## F. Pagination vs infinite scroll

Bean: *"none of the archive pages have the original infinite scroll list anymore that we
had and are paginated."*

Needs a git-history answer: when did infinite scroll exist, on which templates, and what
removed it. Then a decision on which we want.

## G. Template bloat and duplication

| ID | Question |
|---|---|
| G1 | Is `index.html` a near-duplicate of `archive.html`? Bean says yes — same content, near-identical description |
| G2 | Why does "Products by Attribute" exist alongside "Product Archive"? |
| G3 | Which of the templates in the Site Editor list are ours, which are WooCommerce's, and which are genuinely unnecessary? |

On G1: I argued last session that `index.html` is WordPress's mandatory fallback and
must exist. **That is true as far as it goes and I should not have left it there.** The
real question Bean is asking is different: if it must exist, why is it a near-copy of
archive rather than something deliberately distinct? Both things can be true — it is
required AND its current content is duplicated effort.

---

# Part 3 — The plan

One template per work unit. A unit is not finished until it has been opened, looked at,
and interacted with in a browser.

## Task 0 — Unblock the editor (do first, ~15 min)

Move the five raw comments in `404.html` and `single.html` outside their block
delimiters. Deploy. Open both templates in the Site Editor and confirm the validation
error is gone.

**Done when:** both templates open clean in the editor, verified visually.

## Task 1 — Establish the real state of every template

For each template in the Site Editor list:

1. Log in with `/playwright` using `.claude/secrets/sandybrown.env`.
2. Open the template in the Site Editor. Screenshot it.
3. Record every error banner verbatim, and which block shows it.
4. Reload once and re-check — distinguishes a real error from the known intermittent
   500s.
5. Open the matching front-end page. Screenshot at 390, 768 and 1440.
6. Interact: click the sort control, use pagination, submit the search, open the filter
   drawer.

**Output:** one row per template — errors, screenshots, what is visibly wrong.

**Not allowed:** declaring a template healthy from source, REST, WP-CLI or the DB.

## Task 2 — Classify the template roster

Separate the Site Editor list into: ours (files in `theme/sgs-theme/templates/`),
WooCommerce's, and anything else. For each, state what it is for and whether it earns
its place.

**Output:** a roster with a keep / merge / delete recommendation per template, and the
reasoning. **Recommendations only — no deletions without Bean's sign-off.**

## Task 3 — Fix the errors

Per template, from Task 1's evidence. Root-cause each class rather than patching
symptoms:

- comments inside delimiters (proven, Task 0)
- missing template parts (A6/A7)
- "Error loading block: [object Object]" — needs its own diagnosis
- anything else Task 1 surfaces

## Task 4 — Harmonise the archives

Decide once what an archive header is — search position, button style, title treatment,
result count, sort placement — then apply it to Product Archive, Search Results, Blog
Archive and Index.

**This is a design decision for Bean before it is an implementation task.** Bring him
options, do not pick unilaterally.

## Task 5 — Wire the templates to the bespoke product collection

**The target is `sgs/card-grid` with `source: "wc-product"`**, which renders each
result as an `sgs/product-card`. Not `woocommerce/product-collection`.

Work:

1. Find every product listing in every template.
2. For each, decide whether `sgs/card-grid` in `wc-product` mode can replace the
   WooCommerce machinery. **Check what is lost first** — the shop archive's
   `woocommerce/product-collection` is what the WooCommerce filter blocks bind to via
   the Interactivity API router region, so swapping it may break in-place filtering.
   That is a real constraint, not a reason to skip: establish it, then decide.
3. The PDP related rail (`single-product.html:34-40`) has no filter dependency and is
   fully generic today — **it is the obvious first conversion and the clearest win.**
4. Confirm the card renders identically everywhere afterwards. My styling was scoped to
   `.sgs-shop-layout` and `.post-type-archive-product`, so a card outside those
   selectors gets none of it. That scoping is itself probably wrong — the card should
   carry its own look.

**Verify by looking at each listing in a browser, not by confirming the block name in
the markup.**

## Task 6 — Compare against previous versions

Bean: *"the agent needs to look at previous versions of these templates because the
current ones are pretty awful generic core block, non-styled slop."*

Use `git log -p` on each template. Find the version that looked right, identify what
changed and when, and say plainly whether the current version is better or worse.

**This is the check that would have caught the regressions.** It answers E and F
factually instead of from anyone's memory.

## Task 7 — Style the orphan blocks

`catalog-sorting` and `query-pagination` — inherit the site's tokens, or become
designed blocks. Decide which after seeing them (Task 1).

---

# Part 4 — Rules for the next session

1. **Visual verification only.** Playwright login, open the template, look, interact.
   Code and DB reads may explain what was seen; they may never be the evidence that
   something is fine.
2. **One template at a time.** Finish it — errors fixed, looks right, verified — before
   starting the next. This is expected to span more than one session and that is fine.
3. **No raw HTML comments inside block delimiters.** Above the outermost delimiter, or
   not at all.
4. **Check the previous version before rewriting anything.** `git log -p` on the file
   first.
5. **Screenshot before and after.** Bean's eye is the gate; give him something to look
   at.
6. **A gate passing is not evidence the design is right.** Every gate passed while
   these templates were broken.

## The pattern behind this whole track

Three times last session Bean caught by eye something my measurements had passed:

| What I did | The rule I missed |
|---|---|
| Graded the framework on one client's brand colour | The value is per-client; the fault was binding headings to `primary` |
| Copied "2-up on mobile" from reference sites | The rule was a 167–195px readable card; 2-up was its consequence |
| Added padding as part of "give the card a surface" | The body already padded itself; the card must not, or the image stops bleeding |

Each time I measured the thing I had changed rather than the thing the change was meant
to achieve. That is why Part 4 rule 1 exists, and it is why this track is structured
around looking rather than reading.
