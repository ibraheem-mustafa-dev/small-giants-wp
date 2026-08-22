---
doc_type: report
project: small-giants-wp
created: 2026-08-22
status: Wave A COMPLETE — 10 of 10 surfaces audited; Wave C (live) pending
---

# Phase 3 — per-template audit findings register

Wave A static audit: 10 parallel agents, one per surface. Checks 3 and 4 (gate halves) were run
ONCE repo-wide by the orchestrator and attributed to owners, not run per agent — both scripts are
whole-repo and take no file argument, so a per-agent run would have returned the same global
result ten times and attributed nothing.

## Global results (run once, apply to every surface)

| Check | Command | Result |
|---|---|---|
| 3 — spacing | `migrate-theme-native-spacing.py --check` | **PASS** — 0 authorings to migrate |
| 4 — core blocks (gate half) | `check-no-core-blocks.py` | **clean** — 58 theme files, 0 banned |

Every `core/*` block used across the nine templates is genuinely unmapped in
`block-replacements.json` (`search`, `spacer`, and the `post-*` / `query-*` / `comment-*` /
`term-description` families). All are gap candidates; **none is a violation.**

## Per-surface verdicts — zero FAILs

| # | Surface | Verdict |
|---|---|---|
| P3-1 | `archive-product.html` | **PASS** — reference confirmed |
| P3-2 | `single.html` | PASS-WITH-FINDINGS |
| P3-3 | `single-product.html` | PASS-WITH-FINDINGS |
| P3-4 | `archive.html` | PASS-WITH-FINDINGS |
| P3-5 | `search.html` | PASS-WITH-FINDINGS |
| P3-6 | `page.html` | PASS-WITH-FINDINGS |
| P3-7 | `front-page.html` | PASS-WITH-FINDINGS + **check 5 CANNOT-DEMONSTRATE** |
| P3-8 | `index.html` | PASS-WITH-FINDINGS |
| P3-9 | `404.html` | PASS-WITH-FINDINGS |
| P3-10 | `sgs-pdp-content` / `sgs-pdp-buybox` / `sgs-archive-toolbar` | FINDINGS / PASS / PASS |

---

## UNIVERSAL FINDINGS (one fix, every surface)

### U-1 — `main` is declared but not selectable in the editor ⭐ PROVEN, no live check needed

`container/block.json` `tagName` enum holds **9** values including `"main"`.
`container/edit.js:68-77` `TAG_NAME_OPTIONS` lists **8** — `main` is absent. The comment directly
above that array states the invariant it breaks: *"Must match the block.json `tagName` enum and
the wrapper's allowlist."*

All nine templates author `tagName:"main"`. A client opening any `<main>` container sees a Tag
dropdown that does not contain the current value; touching it makes `main` unrecoverable through
the UI. The LEDGER records `<main>` being restored sitewide **this week**, after all nine
templates authored it and zero pages rendered one. This is a live path straight back to that
defect. Check 7 failure.

⚠ **Deploy consequence:** the fix is in `plugins/sgs-blocks/`, so it needs `npm run build` and a
FULL deploy — not the theme-only deploy Phase 3 was scoped to. Sequencing decision required.

### U-2 — `align:"wide"` is INERT throughout the SGS theme ⛔ PROVEN LIVE 2026-08-22

**The chain, each link measured on the live canary (post page, 2,012 selectors examined,
negative control passing):**

1. Exactly **one** rule grants `.alignwide` a width:
   `.is-layout-constrained > .alignwide { max-width: var(--wp--style--global--wide-size); }`
   — WordPress core's generated inline global styles. (A second `.alignwide` rule exists but is
   `.woocommerce.wc-block-store-notices.alignwide`, irrelevant here.)
2. That rule requires a parent carrying `.is-layout-constrained`.
3. Live count of `.is-layout-constrained` on the page: **0**. Of 8 `sgs/container` instances,
   **0** carry it.

→ The only rule that could size an `.alignwide` element can never match inside an SGS container.
**`align:"wide"` emits a class that nothing styles.**

**Why `.alignfull` works and `.alignwide` does not:** the theme wrote its OWN alignfull rule
(`.wp-block-post-content > .alignfull, .entry-content > .alignfull`, `core-blocks.css:900`) which
does not depend on `.is-layout-constrained`. It never wrote the `.alignwide` equivalent.

**This is an undocumented consequence of D725.** Deleting `layout:{"type":"constrained"}` was
Bean's correct ruling, but it removed the only thing making core emit the alignwide rule usefully.
Nobody noticed because alignfull had a bespoke theme rule and looked fine.

⛔ **SUPERSEDED SAME SESSION — `align:"full"` IS ALSO INERT. See U-2b below.**

⚠ **Instrument note — the first two probes of this were VACUOUS and returned a confident `0`.**
The walker guarded on `if (r.cssRules)`; with CSS Nesting every `CSSStyleRule` carries an empty
(but truthy) `CSSRuleList`, so it recursed into nothing and skipped every selector check. Only the
`.alignfull` negative control — which returned 0 where 8 were known to exist — exposed it. Guard
on `r.cssRules.length`, never truthiness.

### U-2b — the WHOLE `align` mechanism is inert, not just `wide` ⛔ MEASURED

Bean's question — *"what value can either of these settings provide if we have outer width and a
content-width layer?"* — forced the test that settles it.

**Negative-control experiment on the live shop page:** stripped `.alignfull` from every element
carrying it, forced reflow, re-measured, restored. **Zero delta** — left, width, and all four
margins identical with and without the class, on both elements.

**Why:** core's breakout rule is
`margin-left: calc(var(--wp--style--root--padding-left) * -1)`. That custom property is **empty at
`:root`** (it is `1.5rem` on `.wp-site-blocks` only), so the calc is invalid, the declaration is
dropped, and computed `margin-left` is `0px`. The remaining `align` rules
(`.wp-block-post-content > .alignfull`, `.entry-content > .alignfull`, `.has-global-padding >
.alignfull`) are all parent-conditional and those parents do not exist in a block-template context.

**Database surface — CLOSED, and it is empty.** Direct query on the canary:
**0** published posts or pages contain `align:"full"` or `align:"wide"`. Every authoring is in
framework-owned repo files. The "slow-motion silent loss on next editor save" risk the
blast-radius seat raised has no content to act on.

**Enumerated authorings (parser, not regex — an earlier regex undercounted by breaking on nested
JSON):** on `sgs/container`, **14 × `wide`** and **24 × `full`**. Repo-wide across all blocks,
19 × wide and 115 × full.

**The finding underneath:** the converter EMITS `align:"full"` (`outer_box.py:509`) under Spec 31's
L1 rule, marked SHIPPED. The pipeline writes an attribute it believes is load-bearing into every
clone, and that attribute does nothing.

**NOT yet proven:** tested 2 elements on 1 template page. The 24 pattern-based `align:"full"`
authorings are untested in situ because no canary page currently uses those patterns. A probe page
built from one of those patterns closes it.

### U-2 (superseded static reasoning, kept for the record)

- Wrapper emits `alignwide` — `class-sgs-container-wrapper.php:1418`
- `theme.json:324` declares `wideSize: 1400px`
- **Zero `.alignwide` rules** anywhere in the theme's CSS (`.alignfull` has 8)
- `container/style.css:76` asserts core handles it "inside `.entry-content`" — but D725 deleted
  `layout:{"type":"constrained"}` from every template, and that is what makes core emit them

**16 authorings — 13 in framework patterns shipped to every client install:** about-image-left,
about-mission, about-stats, about-story, contact-form, pricing-columns, services-alternating ×2,
services-features, services-grid, stats-counter, team-section, testimonials-cards; plus
`archive-product.html` ×2 and `single.html` ×1.

⛔ **NOT a confirmed defect.** Core can emit layout rules from `theme.json` by other paths.
Top Wave C probe: does an `.alignwide` element actually receive a max-width on the live page?

### U-3 — heading-order skip on listing templates

| Template | `query-title` | `post-title` | Result |
|---|---|---|---|
| `archive.html` | unset → h1 | `level:3` | **h1 → h3 SKIP** |
| `search.html` | unset → h1 | `level:3` | **h1 → h3 SKIP** |
| `index.html` | unset → h1 | unset → core default h2 | correct |

Two of three skip; the third is the model. Fix: `level:3` → `level:2` at `archive.html:21` and
`search.html:16`. `index.html` needs nothing. Theme-only, no rebuild.

### U-4 — redundant nested `contentWidth` (cosmetic, no functional effect)

A child re-declaring the same `contentWidth` as its already-banded ancestor. Values are equal so
nothing compounds — dead authoring, not a stacked-cap defect:
`single.html:8`, `archive.html:7`+`:12`, `search.html:5`+`:10`, `sgs-pdp-content.html:6`+`:8`+`:43`.

---

## HIGH-VALUE PER-SURFACE FINDINGS

### The PDP trust-bar — two failures that look identical in source ⚠ LIVE ONLY

`sgs-pdp-content.html:37` is `<!-- wp:sgs/trust-bar /-->` — **no `align` attribute**, though the
comment above it at `:36` states the intent is "full-width" and the block declares
`supports.align:["wide","full"]`.

Meanwhile `woocommerce.css:1118` paints `.wp-block-sgs-trust-bar` with a background colour and
vertical padding — *"a visually distinct band on the PDP"* — and its own comment says
**"UNVERIFIED: .wp-block-sgs-trust-bar … not present in truncated static curl."**

Two independent failures, indistinguishable statically:
- (a) selector correct → band paints but caps at ~1200px instead of bleeding → visibly wrong
- (b) selector wrong → band never paints at all → visibly wrong, differently

Do NOT apply `align:"full"` until the live DOM says which. Fixing (a) while (b) is true adds a
second owner to an element — the failure this project logged four times last week.

### P3-2 `single.html`
- `wp:post-featured-image {"align":"wide"}` at `:22` — instance of U-2; the image cannot bleed.
- `core/spacer` at `:33` where padding would be more maintainable — gap candidate, not a violation.
- `post-navigation-link` (`:30-31`) and `comments-pagination` (`:54-58`) may lack a `nav` landmark
  or accessible name — live confirmation owed.

### P3-3 `single-product.html`
**Missing `contentWidth` key CONFIRMED as an accident but currently VISUALLY INERT** — every
direct child of `<main>` carries `align:"full"` and breaks out, so nothing depends on the
inherited default today. Worth stating explicitly to match the file's own convention and remove a
silent dependency on a block.json default. *(This refutes the pre-audit assumption that it was a
live defect, while confirming it is an accident.)*

### P3-6 `page.html`
`.sgs-page-title` is a **dead class** — verified: exactly one reference in the entire tree
(`page.html:23`, the template that emits it). No CSS consumes it.

### P3-7 `front-page.html`
- **Check 5 cannot be demonstrated.** The template is `<main>` + `post-content` only, and nothing
  in the repo proves the canary's home page even routes through it. Needs
  `wp option get show_on_front` / `page_on_front` before any measurement means anything.
- **No h1 is possible when content is empty** — the active header pattern has no heading block, so
  a front page with empty `post_content` renders with zero `<h1>`. a11y + SEO; content/pattern
  layer, not this template.

### P3-8 `index.html`
- May be **unreachable on the canary entirely** — it is the ultimate fallback and every shadowing
  template exists. Reachable only if a distinct "Posts page" is set. Needs
  `wp option get page_for_posts`.
- Visually much thinner than its sibling `archive.html` (flat list vs card grid with featured
  images). Not a defect — a design-register item.

### P3-9 `404.html`
- ✅ All token slugs verified live, not dead: `spacing|70` → `theme.json:303`, `spacing|40` →
  `:276`, `fontSize:"hero"`, `textColour:"text-muted"`.
- **375px overflow assertion is the one open item** — a 600px band on a 375px viewport.
- Editorial: h1 is "404", h2 is "Page not found". A screen-reader user landing cold hears a bare
  code first. Bean's call — content, not defect.

### P3-1 `archive-product.html` (the reference)
Filters `<aside>` has no accessible name. `sgs/container` HAS an `ariaLabel` attribute wired at
`render.php:239-241` — the mechanism exists and sits unused. Minor; changing the reference moves
the standard for everything else, so it is flagged rather than fixed.

---

## METHOD NOTES

**An agent's confidence is not evidence.** One agent asserted the site header "almost certainly
renders a `core/search`"; another had actually READ `framework-header-default.php` and found no
`search` string at all. The read won — verified directly by the orchestrator. Three
search-bearing header patterns exist but none is active.

**Every cross-surface claim in this register was re-verified against the file by the
orchestrator**, not carried forward on an agent's say-so.

**Two agents correctly refused to fix what they could not prove** (trust-bar align, and the
`single-product` contentWidth nuance). That is the intended behaviour, not under-delivery.
