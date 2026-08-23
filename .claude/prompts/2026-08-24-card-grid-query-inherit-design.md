# Design gate — teach `sgs/card-grid` to inherit the page query

Invoke `/autopilot` before doing anything else.

> ⛔ **THIS SESSION BUILDS NOTHING.** The output is a DESIGN DOCUMENT that Bean approves or
> rejects. Project rule 7 design-gates shared-mechanism changes, and `sgs/card-grid` is used
> by templates, patterns and the cloning pipeline. Writing code before Bean has signed off
> the design is the violation, not a head start.

## The task in one sentence

Design the capability that lets `sgs/card-grid` render **the query the page already decided
on** — the way `woocommerce/product-collection` does with `"inherit": true` — so it can own
an archive instead of only rendering a list it queried for itself.

## Read first, in this order

1. `.claude/decisions.md` **D756** (this capability and the measurement behind it) and
   **D755** (what closed on the template immediately before it).
2. `.claude/plans/2026-08-24-template-by-template-remediation.md` — the governing plan.
   Task 5 is what this capability unblocks. Note its **governing rule**: a template is never
   assessed from code, the DB, REST or hooks — you log in with `/playwright` and LOOK.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL**, per this project's
   standing rule. `sgs/card-grid` is a converter target, so a capability change here can move
   the pipeline. Do not grep-and-skim it.
4. `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1 only if the design touches how
   the block emits CSS — it probably should not. This is a data-source capability, not styling.

## The problem, already measured — do not re-derive it

Converting the shop archive from `woocommerce/product-collection` to `sgs/card-grid`
(`source: "wc-product"`) would leave the WooCommerce filter UI **rendering, clickable and
completely inert**. Measured 2026-08-24 with a control, same URL params, live canary:

| Page | no filter | `?min_price=0&max_price=1` |
|---|---|---|
| a live `sgs/card-grid` `wc-product` page | 6 cards | **6 — filter ignored** |
| the shop archive (`product-collection`) | 5 cards | **0 — filter respected** |

**Why:** filtering on this site is URL-driven and resolved server-side.
`product-collection` is `"inherit": true`, so it picks up WooCommerce's modifications to the
**main page query**. `sgs/card-grid` builds its **own** `WP_Query` from block attributes
(`render.php:349`) and declares no `supports.interactivity`, no `usesContext`, no
`providesContext` — so it can neither inherit the query nor re-render in place.

**The conceptual split worth keeping in the design:** a CONTENT block asks *"what should I
show?"* and answers from its own settings. An ARCHIVE block asks *"what did the page already
decide to show?"* and renders that. Those are different relationships to the page.
`card-grid` is the first kind today, and this capability should let it be the second
**without it stopping being the first**.

## Reuse check — already done, do not repeat it

- **No SGS block has a query-inherit capability.** Verified by enumerating every `block.json`
  attribute name across all blocks: the only `inherit`-named attrs are `inheritStyle` on
  button/heading/quote/text, which is styling and unrelated. The `"inherit"` hits inside
  `card-grid/block.json` are prose in `description` fields — a loose grep makes them look
  like a finding.
- Only `sgs/breadcrumbs` and `sgs/buybox` reference the main query or queried object at all
  (`is_archive` / `$wp_query` / `get_queried_object` in `render.php`).
- **`woocommerce/product-collection` is the reference implementation to STUDY** — how it
  resolves `inherit`, and how its Interactivity API router region makes filtering update
  without a page reload. Do not copy it wholesale; work out which half you actually need.

## What the design must answer

1. **The shape.** A new value on the existing `source` enum (`manual | query | wc-product |
   cpt-collection`), a separate boolean, or something else? State the plain-English meaning
   of whichever you pick, and why the alternatives lose.
2. **Scope of "the page query".** Shop archive, category/tag archives, search results,
   author, date, blog index — which does it serve? A capability that only works on `/shop/`
   is a carve-out and fails **R-31-9** (universal mechanisms, no per-case hyperfocus).
3. **In-place filtering — in scope, or phase 2?** Inheriting the query gets filtering
   WORKING (with a full page reload). Making it update without a reload needs Interactivity
   API support and a router region. **Recommend a split and justify it** — but be explicit
   that full-reload filtering is a real UX regression against what the shop does today, so
   "phase 2" must not quietly mean "never".
4. **What happens to the other three source modes.** They must not change behaviour at all.
   Say how the design guarantees that, not just that it intends to.
5. **Editor behaviour.** In the Site Editor there is no main query. What does an
   inherit-mode card-grid show — a placeholder, sample posts, something else? Note the trap
   that just cost a day: `ServerSideRender` serialises **attributes only** and cannot forward
   block context, so anything relying on context resolves to nothing in the editor (D755).
   Whatever you design must be previewable, or explicitly stated as not previewable.
6. **Client-editability.** Every setting must be reachable in the block inspector and the
   canvas must genuinely move when it changes. **Read the INSPECTOR LABELS in
   `card-grid/edit.js` (~line 504), not the enum slugs** — "Product collection (no
   WooCommerce needed)" is the label of `cpt-collection`, and reading slugs instead of labels
   produced a wrong statement to Bean on 2026-08-23.
7. **Blast radius.** What else consumes `card-grid`? Check the theme templates,
   `theme/sgs-theme/patterns/*.php`, and the cloning pipeline's DB rows
   (`block_composition`, `block_capabilities`, `variant_slots`) before claiming the change is
   contained.
8. **How it will be PROVEN.** Name the exact before/after measurement, with a control. The
   bar is the table above: same URL params, card count changes when the filter says it
   should. ⚠ Do NOT propose rendered-HTML md5 — `build-deploy.py` stamps a per-deploy
   `ver=<epoch>` cache-buster, so every deploy moves the hash regardless of the change. That
   method failed on 2026-08-24; see
   `reports/visual-diff/audio-hero-media-quote-2026-08-23.md`.

## Skills — invoke at the point of use, not all at the start

| Skill | When |
|---|---|
| `/autopilot` | First, before anything else. Establishes live skill routing for the session |
| `/brainstorming` (design mode) | The main event — turning this into a spec. Do NOT jump to a fix-shape |
| `/sgs-wp-engine` | Any SGS block / theme mechanics question |
| `/wp-block-development` | Core WP block-API questions: `usesContext`, `providesContext`, query loops |
| `/wp-interactivity-api` | **Essential for question 3** — what in-place filtering actually requires |
| `/library-docs` | Gold-standard reference for WP core and WooCommerce block APIs |
| `/sgs-db` | Before ANY "there is no X" claim about the data layer (R-31-8) |
| `/wp-blocks` | Block schema / attribute ground truth — `python ~/.claude/hooks/wp-blocks.py dump` |
| `/qc-council` | If the design produces 2+ genuinely competing shapes — multi-rater before Bean sees it |
| `/adversarial-council` | Optional pre-mortem on the finished design before Bean reads it. High ROI here: this is a shared mechanism |
| `/spec-writer` or `/strategic-plan` | Only once the shape is settled AND Bean has approved it |

## Tools

| Tool | For |
|---|---|
| Playwright MCP / Chrome DevTools MCP | Live inspection of the shop archive and its filters. ⚠ The Playwright MCP profile is often **locked by another session** — if it errors with "Browser is already in use", use the chrome-devtools MCP instead; it is a separate browser |
| `.claude/secrets/sandybrown.env` | Canary credentials — gitignored, always available, no need to ask |
| `ssh hd` + `wp db query` | Finding live pages that use a given block. ⚠ Quote carefully — a nested-quoting mistake on 2026-08-24 returned identical results for four different blocks and looked like a finding until it was re-run |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB ground truth |
| `curl` + URL params | The cheapest decisive filter test — see the measured table above |

## Research approach

1. Read D756 and this prompt's measured table. **The problem is established — do not
   re-measure it to warm up.**
2. Read `woocommerce/product-collection`'s implementation: how `inherit` resolves, where the
   router region is declared, what `queryContextIncludes` does.
3. Read `card-grid/render.php` end to end — it is long, so navigate to the four source-mode
   branches rather than reading blind (never read >1000 lines in full).
4. Invoke `/wp-interactivity-api` and establish what in-place filtering genuinely requires.
   This decides question 3 and it is the one most likely to get hand-waved.
5. Open the shop archive in a browser and use the filters yourself, so the design is judged
   against what a person experiences. **The filter controls sit inside a collapsed drawer** —
   a probe on 2026-08-24 found 19 controls with `offsetParent === null` and clicked nothing.
   Expand the drawer first; a probe that clicks nothing proves nothing.
6. Write the design. Then run `/adversarial-council` or `/qc-council` on it before Bean reads it.

## Done-when

A design document under `.claude/plans/` — or a Spec 31 amendment if that is the right home;
say which and why — that answers all eight questions above, names its proof method, and ends
with a clear GO/NO-GO recommendation. **Then stop and wait for Bean's approval.**

## Also true, so it is not lost

- **The PDP related rail (`single-product.html:34-40`) is NOT blocked by any of this.** It
  renders a fully generic photo/name/price stack today, has no filter dependency, and is the
  risk-free conversion whenever Bean wants it. He chose the capability first on 2026-08-24;
  this stays available as a warm-up or a parallel win.
- **Product Archive cannot be CLOSED until this capability exists.** Bean's point, and he is
  right: the 7-point checklist's done-when includes the listing using the bespoke card, so
  finishing the remaining audit items would produce a partial, not a close.
- **Still owed on Product Archive whenever it is reopened:** front end at 390 / 768 / 1440,
  and interacting with sort, pagination, search and the filter drawer.
- `woocommerce/catalog-sorting` and `core/query-pagination` are still unstyled against the
  site's global styles (register items C1/C2) and are untouched.
