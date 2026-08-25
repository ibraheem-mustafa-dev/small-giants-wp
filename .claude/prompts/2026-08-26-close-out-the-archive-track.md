# Close out the archive track — then the template-by-template pass

> ⛔ **SUPERSEDED 2026-08-25 — do NOT execute this file.**
> Its residue was absorbed into `.claude/prompts/2026-08-28-mamas-clone-mobile-and-converter.md`
> (item 5, plus the template-by-template pass). Read that instead.
>
> ⚠ **One claim in here is WRONG and was measured wrong on 2026-08-25:** it says
> `woocommerce/catalog-sorting` "still ignores the site's tokens". It does not —
> `theme/sgs-theme/assets/css/woocommerce.css:2401` themes `select.orderby` with a 44px
> target, a tokenised border and a custom chevron. Only `core/query-pagination` genuinely
> has zero CSS. Closed items: the 9px homepage overflow (now 0, same cause as the hero
> media cell — D787), and the ledger/decisions entries (D786-D788).

Invoke `/autopilot` before anything else.

> Supersedes `2026-08-25-container-layout-and-archive-design.md`, which is DONE. Every item
> it ranked is closed: the picker contrast (13.14:1), the PDP rail, the accidental-columns
> count, the layout validation, and all five never-opened templates.
>
> **The session AFTER this one goes back to assessing each page template one by one.** Do
> not start that here — this session exists to clear the residue so that pass runs clean.

---

## The one rule that governs this track

> **Do not assess a template by reading its code, querying the DB, calling REST, or
> inspecting hooks. Log in, open the thing, LOOK at it, interact with it.**

It earned itself three separate times on 2026-08-25: a breadcrumb printing literal `<span>`
that several code-reading passes had missed; a layout regression that every gate passed; and
a "200 OK" that turned out to be the homepage ignoring a query var.

## Read first, in this order

1. `.claude/LEDGER.md` — the container-layout / template block at the top.
2. `.claude/decisions.md` — **D772** (one archive header, and the two things that provably
   cannot go in it), **D773** (a one-child flex row is indistinguishable from a stack until a
   sibling appears), **D774** (⚠ its enum ruling was SUPERSEDED the same day — see item 0).
3. `reports/visual-diff/breadcrumbs-2026-08-24.md` + `container-2026-08-25.md` — the shape a
   retired gate-bypass report should take.
4. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL if you touch the converter,
   walker or `sgs/container`. Standing project rule.

## Item 0 — a correction you must not re-break

**D774 said "do NOT add an enum to `layout`". That was wrong and is superseded.** It
conflated a *shared PHP allowlist inside `SGS_Container_Wrapper`* (which does see every
calling block's attributes and WOULD break gallery / post-grid / testimonial-slider) with a
*`block.json` enum on `sgs/container` alone* (which cannot — WordPress validates against each
block type's own schema). The enum shipped `04f487c39`, live-verified, zero rendering change.
Five of the nineteen blocks sharing the attribute name already carry their own differing
enums. **Do not "restore" D774's ruling.**

---

## What to do, in order

### 1. The homepage overflows by 9px — and has never been seen below 1440

`/` is now the restored Mama's clone (page **2742**, 98 native SGS blocks, recovered from
`pipeline-state/mamas-munches-144-2026-08-24-031610/stage-4.json` after page 144 was found
hard-deleted). Measured at 1440: `scrollWidth 1449` vs `innerWidth 1440`, `mainHeight 3447`,
zero empty sections.

- Find the 9px. Walk the DOM for the widest element rather than guessing — an ancestor sized
  by a `max-content` child is the shape that did this on the PDP rail (`width:0` +
  `min-width:100%` was the fix there; do not cargo-cult it, find this one's cause).
- Then open it at **375 and 768**, which nobody has done. Bean's eye on the result (R-31-13).

### 2. C1 / C2 — the two unstyled blocks

`woocommerce/catalog-sorting` and `core/query-pagination` still ignore the site's tokens.
Bean: *"the agent just threw it down and left it without bothering with harmonising it."*
Both now appear on four harmonised archives, so they are the last visibly-foreign elements.

### 3. D1–D4 residual — the two search blocks LOOK different

Deliberately NOT unified as blocks: `sgs/product-search` is product-scoped by design (live
suggestions, product-scoped results page) and there is no general-purpose SGS search block, so
swapping either breaks real function. **Harmonise their appearance** — height, radius, button
treatment, icon-vs-text — not their identity.

### 4. Register Task 6 — compare templates against previous versions

Bean: *"the agent needs to look at previous versions of these templates."* Use `git log` on
`theme/sgs-theme/templates/`. This feeds the template-by-template pass that follows.

### 5. Single-child-shrunk container sweep (D757/D773)

`sgs/container` defaults to `layout:"flex"` = a CSS ROW. A single flex item in a row sizes to
its content, so a one-child container looks like a stack until a sibling appears. Fixed on
`single-product.html` and (2026-08-25) on `search.html` + `archive-product.html`. **Never
swept repo-wide.** Measure before changing — the row default is deliberate (R-1 honesty for
the converter) and only `<main>` suppresses it, so the lever is per-container authoring.

### 6. Two housekeeping items

- **`oldshape-audit` is over-broad on scoped deploys.** `--theme-only` ships ZERO block
  schemas, yet the audit still evaluates "would deploying these schemas strand content?" and
  aborts. Its sibling guard `deploy_roots_for_scope()` was narrowed for exactly this, and its
  docstring warns that a guard firing on files a run cannot touch "trains the operator to
  reach for `--allow-dirty`" — the reflex behind D336's 2.5h outage. Narrow the audit the same
  way: skip when the run's roots contain no plugin root. It was worked around three times on
  2026-08-25 with a justified `--skip-oldshape-audit`.
- **Ledger + a decisions entry** for the 2026-08-25 homepage/blog/enum work.

---

## Explicitly NOT this session

| Item | Why |
|---|---|
| **Item 4 — the 83 accidental-column candidates** | Handed to the migration track. Converting one changes its children from content-sized to full-width — a VISIBLE change needing Bean's eye per candidate, not a mechanical sweep. |
| **flexWrap default flip** | Handed to the migration track. ~98 stored instances, several `[GATE - DO NOT DELETE]` fixtures. |
| **Motion track's page 2737** | Not ours. Its `sgs/text`/`sgs/button` undeclared attrs will be deleted on the next editor save AND it blocks `oldshape-audit` on full deploys. |
| **Template-by-template assessment** | The session AFTER this one. |

## Canary state as of 2026-08-25 (verify, do not trust)

| | |
|---|---|
| `/` | page **2742** — restored Mama's clone, h1 "Made for the mum who needs it most" |
| `/blog/` | page **2741** — `home.html`, h1 "Blogs", 9 posts |
| `/shop/` | h1 "Shop", cards 5×313.3px at 1440, 327px at 375 |
| Reading | `show_on_front=page`, `page_on_front=2742`, `page_for_posts=2741` |
| Picker fixture | page **2736** `[GATE - DO NOT DELETE]` — the ONLY surface rendering the solid preset |

## Method traps this track actually hit

1. **Measure the thing the fix was meant to ACHIEVE.** A probe asserted `STACKED: true` from
   TOP offsets (200 < 216) while LEFT offsets (73 / 227 / 336) proved a row. Compare LEFT when
   you mean "is this a row".
2. **Name the element before measuring it.** A contrast probe read `__option` (the wrapper,
   correctly `border:0`) instead of `__pill`; another truncated its own class list with
   `slice(0,110)` just before `--solid`; a transparent fill parsed as black gave "21:1".
   Print what you compared beside the number.
3. **A subagent's "negative control" may guard nothing.** One shipped a test that assigned a
   fixture string already lacking the prefix, then asserted it lacked the prefix. Proven
   vacuous by reverting the fix and re-running — only the *structural* test failed.
4. **A cached fact in a doc is not ground truth.** Three bit on 2026-08-25: a stale
   `migrate-core-blocks` path, the un-reproducible "52 / 5 / 59" split, and page 144 — which
   404'd the canary for ~90 seconds. Verify an ID exists before pointing anything at it.
5. **A 200 is not a page.** `/?pa_size=small` returned 200 and was the homepage ignoring the
   query var (`body class="home blog"`).

## Done-when

Every item above is either shipped with a live measurement in its commit message, or recorded
in the ledger with the reason it is not. The homepage renders clean at 375 / 768 / 1440 with
Bean's sign-off. A green gate is not evidence; an opened page is.