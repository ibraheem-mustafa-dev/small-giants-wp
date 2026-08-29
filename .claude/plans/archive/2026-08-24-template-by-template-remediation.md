---
doc_type: phase-plan
project: small-giants-wp
created: 2026-08-23
status: NOT STARTED — next session
supersedes: nothing (new track, opened by Bean's regression report 2026-08-23)
---

# Template-by-template remediation

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

## Why this exists

Bean reviewed the templates in the Site Editor after the Phase 3 design-benchmark
implementation and found widespread problems: validation errors on eight templates,
product listings rendering as generic core-block stacks instead of the bespoke
`sgs/product-card`, unstyled sorting and pagination, and templates of the same type
that clearly were not designed against each other.

**He found all of it by eye, in the editor. None of it was caught by a gate, by the
build, or by my own live measurements.** That is the single most important fact in
this document and it shapes the whole approach below.

---

# ⛔ STATUS 2026-08-25 — MOST OF THIS REGISTER IS CLOSED. READ THIS BEFORE ACTING ON ANY SECTION.

Live front is now `.claude/prompts/2026-08-26-close-out-the-archive-track.md`.
Detail is single-sourced to **D772 / D773 / D774** — do not restate it here.

| Section | State |
|---|---|
| A — validation/loading errors | ✅ CLOSED. All five never-opened templates opened in the Site Editor: Search Results, Single Product, Products by Attribute, Order Confirmation, Coming soon. **0 validation warnings, 0 error notices each.** All eight Bean reported are now confirmed clean. |
| B — listings not using the bespoke card | ✅ CLOSED (D757). |
| C1 / C2 — unstyled `catalog-sorting` + `query-pagination` | ⛔ **STILL OPEN.** The last visibly-foreign elements on four harmonised archives. |
| D1–D4 — cross-template inconsistency | ✅ MOSTLY CLOSED (D772). All four archives share one header part; breadcrumb standardised on `sgs/breadcrumbs`; duplicate no-results search box deleted; h1→h3 heading skips fixed. ⛔ RESIDUAL: the two search blocks still LOOK different — deliberately NOT unified as blocks (`sgs/product-search` is product-scoped by design and no general-purpose SGS search block exists), so harmonise appearance only. |
| E — Product Archive layout regression | ✅ CLOSED. Header stacks correctly (73/232→270→338 at 1440); cards 5×313.3px. |
| F — pagination vs infinite scroll | ✅ ANSWERED. Infinite scroll exists in `sgs/post-grid` (still functional) but was **never wired into any archive template** — they used numbered `query-pagination` from the day each was created. Nothing was removed; restoring it is a choice, not a repair. |
| G1 — `index.html` duplicates `archive.html` | ⛔ OPEN. |
| G2 — why "Products by Attribute" exists | ✅ ANSWERED by ATTEMPTING the URL, not by reading `attribute_public`: four candidate paths tried, the only 200 was the homepage ignoring the query var (`body class="home blog"`). No reachable front end; editor-only by construction. |
| G3 — which templates are ours | ✅ ANSWERED. 11 are ours (`src:"theme"`), 4 are WooCommerce's (`src:"plugin"` — cart, checkout, order-confirmation, coming-soon). |
| Task 4 — harmonise the archives | ✅ DONE (D772), live-verified. |
| Task 6 — compare against previous versions | ⛔ STILL OPEN. |
| Task 7 — style the orphan blocks | ⛔ = C1/C2 above, still open. |

**Carried out of the 2026-08-24 wave:** items 1 (shop last-row stretch), 2 (solid picker
contrast — VERIFIED at 13.14:1) and 3 (mobile card width — the rail peek-scrolls at 140px,
no decision owed) are all CLOSED. Item 4 (single-child-shrunk container swept repo-wide)
remains OPEN and is in the next prompt.

**Moved to the migration track, NOT this register:** the flexWrap default flip (~98 stored
instances) and the 83 accidental-column candidates (the old "52 / 5 / 59" figure is retired —
it cannot be reproduced from any artefact on disk).

---

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

**He is right, and "product collection" is a literal name in the product — I got this
wrong once already in this document and it is corrected here.**

`sgs/card-grid` has a **Content Source** panel with four modes. These are the labels an
operator sees in the inspector (`card-grid/edit.js:504-507`):

| Inspector label | Stored value | What it does |
|---|---|---|
| Manual (custom items) | `manual` | hand-authored cards |
| Query (from posts) | `query` | WP_Query over posts/pages |
| WooCommerce products | `wc-product` | WC products via `Card_Grid_Products`, each rendered as `sgs/product-card` in `wc-product` mode |
| **Product collection (no WooCommerce needed)** | `cpt-collection` | queries the `sgs_product` CPT with seven meta-driven selection rules, each rendered through `sgs/product-card` in `sgs-cpt` mode |

Plus `productSource` (`collection` = smart preset, or `handpick`) and `productCollection`
(`best-selling | price-high | price-low | top-rated | latest`).

**Both product modes render `sgs/product-card`.** On a WooCommerce site like this canary,
`wc-product` is the matching mode; `cpt-collection` is the WooCommerce-independent path.

⛔ **My earlier line here — "there is no block literally named `sgs/product-collection`"
— was worse than useless.** It was true only about the block *slug*, and it read as
dismissing Bean's term when **"Product collection" is the literal label of a source mode
in the UI he works in every day.** I had read the enum values (`wc-product`,
`cpt-collection`) and never opened `edit.js` to see what those values are CALLED. The
operator-facing name is the real name.

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

## ⚠ BEAN FIXED THE PRODUCT CARD HIMSELF — do not undo it

Bean, in the same message: *"I have also just fixed the product card issue that we were
just dealing with."*

**This is the first thing the next session must establish, before touching anything.**

At the time of writing, `git status` shows **no uncommitted changes** to
`product-card/` or `woocommerce.css` in this working tree — so his fix is not here. It
was made somewhere this repo cannot see: the live site, the Site Editor, another
worktree, or a different machine.

## ✅ RESOLVED 2026-08-23 — THE RISK ABOVE WAS DISPROVEN, AND WAS NEVER PROVEN

**Bean challenged the premise directly:** *"If it's clean, why are you assuming the block
has been fixed anyway?"* He was right to.

**Measured, live canary vs this repo — the two files `422daba1` touched:**

| File | Live | Repo | |
|---|---|---|---|
| `theme/sgs-theme/assets/css/woocommerce.css` | `f21c35adbd902732b54e8038b93166b3` | same | identical |
| `theme/sgs-theme/style.css` | `fd73e91c5f76a6ec5737cfe98c5cd047` | same | identical |
| Theme version | 1.5.63 | 1.5.63 | identical |

**There is no un-captured fix, and no deploy-overwrite risk** — doubly so: the files match
byte-for-byte, AND a theme deploy replaces *files*, never the database, so a Site Editor
change could not have been wiped by one in the first place.

⭐ **Kept rather than deleted, because the failure is instructive.** The section above was
written from a single sentence of Bean's, inferred into a specific mechanism ("it is NOT
in this working tree", "a theme deploy will overwrite it"), and then labelled **"a real
risk, not a formality"** — language that reads as measurement. Nothing was measured. It
took two `md5sum` calls to settle. This is the same shape as D753 (rogue-agent `git stash`
behaviour inferred from seeing a command, with a structural fix specced for an unproven
cause) and it is exactly what `~/.claude/rules/prove-the-cause-before-fix.md` exists to
stop. **A blocker asserted without a measurement is not a blocker.**

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

### ⭐ A-FINDING (2026-08-23, measured in the Site Editor after Task 0)

Logged in with Playwright and opened each template. Results:

| Template | Editor state |
|---|---|
| Page: 404 | **CLEAN** — 0 errors, 0 console errors (Task 0 fixed it) |
| Single Posts | **CLEAN** — 0 errors, 0 console errors (Task 0 fixed it) |
| Product Archive | **13 × "Error loading block: [object Object]"**, 8 console errors |

**Product Archive's errors SURVIVE A RELOAD**, so they are not the known intermittent
500s. The failing blocks, read from `data-type` on each erroring node:

- `woocommerce/product-template` — 1
- **`sgs/product-card` — 12**

**`sgs/product-card` fails to load in the EDITOR** inside `woocommerce/product-template`.
It renders fine on the front end. This is very likely the root of Bean's *"Product
archive's format looks super broken"* and *"none of them look anything like that nice
professional looking custom design"* — **in the editor the cards do not render at all.**

### Root cause — Bean's hypothesis, confirmed from the console 2026-08-23

Bean: *"Its probably dynamically loading the products on the live page which doesn't
happen in the editor... the block has a mode which pulls woocommerce product data and
other where you can hand type the content... And I think how it is seen in the editor is
also dependent on how the parent block — card grid loads it."*

**All three correct.** Every failing request is the same shape:

```
/wp-json/wp/v2/block-renderer/sgs/product-card?context=edit
   &attributes[sourceMode]=wc-product
   &attributes[productId]=0            ← no product to bind to
```

| Bean's point | Confirmed by |
|---|---|
| loads dynamically live, not in the editor | `productId=0` on every request — no product loop exists in the editor |
| the block has a bound mode and a hand-typed mode | `sourceMode` enum = `typed \| wc-product \| sgs-cpt`; it is stuck in `wc-product` with nothing to fetch |
| **it depends on how the parent loads it** | `product-card` declares `usesContext: ["postId"]`. Inside `woocommerce/product-template` the editor supplies no real post. Inside `sgs/card-grid` this cannot happen — card-grid's `render.php` builds the card server-side with attributes already resolved (lines 514/555/570) |

**That third point is the whole argument for Task 5.** The card is being asked to
self-resolve inside WooCommerce's machinery, which only works when a real query is
running. Under `sgs/card-grid` the parent does the resolving, so there is no editor
failure mode to fix.

**TWO distinct failures, do not conflate them:**

- **3 × HTTP 400** — REST rejecting the request itself. This is the known class where a
  non-string attribute serialises to `""` for `ServerSideRender` and REST refuses it.
- **3 × HTTP 500** — PHP erroring server-side, almost certainly loading product `0`.
- (Also 2 × 500 on `sgs/business-info` from the header/footer — **unrelated and
  pre-existing**, not part of this.)

**Decide the intent before fixing:** should a bound card with no product render an editor
placeholder (the usual answer), or should the template not be putting it there at all
(Task 5)? Fixing the 400/500 without answering that just makes a wrong arrangement
render quietly.

**Start Task 3 here.** It is a specific block failing in a specific parent, with a
reproducible URL:
`/wp-admin/site-editor.php?postType=wp_template&postId=sgs-theme//archive-product&canvas=edit`

Read the 8 console errors first — "[object Object]" means the real error was stringified
badly by the editor's error boundary, so the console holds the actual message.

Not yet checked in the editor: Search Results, Single Product, and the three WooCommerce
templates (Order Confirmation, Coming soon, Products by Attribute).

## B. Product listings not using the bespoke card

| ID | Where | Current | Should be |
|---|---|---|---|
| B1 | PDP related rail | generic image + title + price | `sgs/card-grid` `source:wc-product` → `sgs/product-card` |
| B2 | Shop archive | WC product-collection wrapping `sgs/product-card` | same target, IF filter binding survives — check first |
| B3 | Any other product listing | audit needed | same target |

Bean: *"all of the pages that list products in an archive page should have it set up
where they are using the product-collection block which makes each product item be
shown as my sgs/product-card and none of them look anything like that nice professional
looking custom design — they look like a generic photo, product name, price and button
stack."*

**"A generic photo, product name, price and button stack" is the symptom to look for**
when auditing — it is exactly what `single-product.html:37-39` renders today.

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

## Task 0 — Unblock the editor ✅ DONE 2026-08-23

Moved the five raw comments in `404.html` and `single.html` outside their block
delimiters (`d35ee932`), deployed, and **verified by opening both templates in the Site
Editor while logged in: 0 error banners, 0 console errors on each.** Block-sequence md5
identical to before the change, so only comments moved — no block was altered.

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

## ✅ Task 3 (Product Archive) — DONE 2026-08-24 (D755)

Editor: **0 of 6 cards rendering → 6 of 6**, 0 error banners, 0 console errors, survives a
reload. Front end byte-identical (5 cards, CTA 15px/600, same heights).

**The cause was not what this plan predicted.** The hypothesis above — `productId=0` inside
`woocommerce/product-template` — is WRONG and is left in place above only as a record.
`productId=0` returns **200** with a proper "No product selected" placeholder; `render.php`
always handled it. The real cause, read off the server:

```
{"code":"rest_invalid_param","params":{"attributes":"[ctaFontSize] is not of type number."}}
```

`ctaFontSize` was `{"type":"number","default":null}`. A null default puts the attribute IN
the attribute object, so `ServerSideRender` sends `attributes[ctaFontSize]=` and REST rejects
`""` for a number. Whole class fixed (18 attrs, 5 blocks, + 3 editor writes that cleared back
to `null`). Full detail: **D755**.

⭐ **The cards now read "No product selected" and that is CORRECT.** `product-template` gives
the card no post in the editor, and `ServerSideRender` cannot forward block context in any
case. The arrangement question is Task 5, below.

## ✅ Task 5 — DONE 2026-08-24 (D757). The capability it waited on is DROPPED (D756).

**All four product listings now render `sgs/product-card`.** The census was wider than this
plan recorded — 3 of 4 were generic, and two of those are WooCommerce's OWN plugin templates
(`taxonomy-product_attribute`, `product-search-results`), which is why a grep of our repo
found only the PDP rail. Fixed by putting the card inside the existing
`woocommerce/product-template` on each; WooCommerce keeps query, filters, sorting, pagination
and relatedness. The two plugin templates got theme overrides.

**The `sgs/card-grid` query-inherit capability is DROPPED, not parked** — Bean's call, D756.
Nobody in the ecosystem replaces the WooCommerce loop, the WooCommerce-free path already
exists (`cpt-collection`), and inherit mode would not have fixed the editor preview either.
Do not re-propose it without meeting D756's measurement first.

⚠ Still open, named not dropped: at 375px the shop archive is 1-up @327px but the related
rail is 2-up @155px, under the readable-card floor — a design call for Bean.
`taxonomy-product_attribute` is NOT live-verified (attribute archives disabled site-wide).
The single-child-shrunk container shape was not swept repo-wide.

### Original blocking analysis, kept because the measurement is still the reason



**Measured with a control, same URL params:**

| Page | no filter | `?min_price=0&max_price=1` |
|---|---|---|
| live `sgs/card-grid` `wc-product` page | 6 cards | **6 — filter ignored** |
| shop archive (`product-collection`) | 5 cards | **0 — filter respected** |

Filtering here is URL-driven and server-resolved. `product-collection` is `"inherit": true`
so it inherits the main query; `card-grid` builds its own `WP_Query` (`render.php:349`) and
declares no `supports.interactivity`, no `usesContext`, no `providesContext`.

**Converting the shop archive today would leave the filter UI rendering, clickable and
inert** — the worst failure mode, because it looks fine.

**Bean's decision: design the "inherit the page query" capability FIRST**, ahead of both the
shop conversion and the risk-free PDP-rail win, because it would let card-grid own ANY
archive rather than just the shop. **Design gate open per project rule 7 — nothing built
until Bean approves a design.**

Still unblocked whenever wanted: the PDP related rail (`single-product.html:34-40`) has no
filter dependency.

## ⚠ Step 1 is NOT finished for Product Archive

The audit was cut short once the cause was proven. Still owed on this template: front end at
390 / 768 / 1440, and interacting with sort, pagination, search and the filter drawer. The
filter controls sit inside a collapsed drawer — a probe that queried them found 19 controls
with `offsetParent === null` and clicked nothing, so **do not read any earlier "filters do
nothing" note as a finding**; it was a broken probe.

## Task 4 — Harmonise the archives

Decide once what an archive header is — search position, button style, title treatment,
result count, sort placement — then apply it to Product Archive, Search Results, Blog
Archive and Index.

**This is a design decision for Bean before it is an implementation task.** Bring him
options, do not pick unilaterally.

## ~~Task 5 — Wire the templates to the bespoke product collection~~ ⛔ SUPERSEDED

> **STALE — do NOT act on the section below.** It predates D756 and still instructs
> converting EVERY listing, including the shop archive, to `sgs/card-grid`. That was
> measured and would silently break WooCommerce filtering. The live version of this task is
> **"⛔ Task 5 — BLOCKED on a card-grid capability"** further up this file. Kept only so the
> original reasoning is legible; a QC rater flagged on 2026-08-24 that a session reading
> top-to-bottom could act on it by mistake.

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

## Task 7 — Style the orphan blocks: PARTIALLY DONE 2026-08-24 (D758)

`catalog-sorting` and `query-pagination` (C1/C2) are still untouched. What DID land on the
filter panel: the dead **rating filter is removed** (no product has a rating, so it was a
control that could never filter anything), and the **filter group headings now use the body
font** — they were Fraunces serif 16px beside Inter 14px controls, which is what read as
"doesn't match the site fonts". A full sweep of the panel found no foreign font; both
typefaces were always site fonts.

## ⛔ Open items carried out of the 2026-08-24 wave — read D758 before touching any

1. **Shop last-row stretch — ✅ RESOLVED 2026-08-24 (D760), supersedes D758's warning below.**
   Not a contradiction: an inline `width:100%` (specificity 1,0,0,0) always won; under GRID a
   WooCommerce inline `<style>` rule inside a `@media` block — invisible to a cascade audit
   that does not descend into conditional rules — took over and resolved its percentage
   against the grid track, giving 91px. Fixed by winning on specificity (0,5,1; a tie is not
   enough, source order decides ties and WooCommerce's sheet loads after ours). Shipped
   `1e7e2755`, theme 1.5.67. Measured live: 5×313.3px at 1440px, 5×340.5px at 768px, no
   stretch, no overflow at 375px. D758's original text is left below for the record of what
   was ruled out, but its "do not re-attempt" instruction no longer applies.
2. **`solid` option-picker contrast fix — deployed, NOT verified.** No live surface renders a
   solid-preset picker (`showPickers:false` on shop + rail; buybox uses `outlined`). Needs a
   product-card instance with pickers on before it can be called done.
3. **Mobile card width — a design call for Bean.** 375px: shop 1-up @327px, PDP rail 2-up
   @155px, under the 167–195px readable-card floor. Screenshots sent 2026-08-24.
4. **The single-child-shrunk container shape was never swept repo-wide** (D757). Other
   templates may share it.

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
7. **When Bean names something, resolve it against the INSPECTOR LABELS before saying
   it does not exist.** He works in the block editor, so the label in the UI is the
   real name of the thing. Reading `block.json` enum values gives you `cpt-collection`;
   reading `edit.js` gives you "Product collection (no WooCommerce needed)", which is
   what he actually said. **Never write "X does not exist" from a slug-level read.**

## The pattern behind this whole track

Three times last session Bean caught by eye something my measurements had passed:

| What I did | The rule I missed |
|---|---|
| Graded the framework on one client's brand colour | The value is per-client; the fault was binding headings to `primary` |
| Copied "2-up on mobile" from reference sites | The rule was a 167–195px readable card; 2-up was its consequence |
| Added padding as part of "give the card a surface" | The body already padded itself; the card must not, or the image stops bleeding |
| Said "product collection" does not exist, from the enum slugs | It is the literal inspector label of `cpt-collection`; I never opened `edit.js` |

The first three share one shape: I measured the thing I had changed rather than the thing
the change was meant to achieve. The fourth is the same failure one layer up — **I read
the machine-facing layer (enum values, computed styles, block slugs) and skipped the
human-facing layer (inspector labels, rendered appearance, what the operator sees).**

That is exactly why Bean's Playwright rule is right, and why rule 7 extends it from
templates to block capabilities: **open the thing a person uses, not the file that
defines it.**
