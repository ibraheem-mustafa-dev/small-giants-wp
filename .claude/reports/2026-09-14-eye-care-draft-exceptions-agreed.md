---
doc_type: report
date: 2026-09-14
topic: Ward End Eye Care draft — agreed universal-vs-exempt cloning map, CPT inventory, form/modal findings
status: findings + agreed decisions — no code changed
---

# Eye Care draft: what's a cloning target, what's exempt, and what we decided

Grounding document for the fresh-session prompt at
`.claude/prompts/2026-09-14-modal-cpt-form-frame-card-checkout-upgrade.md`. Everything below
came from direct file reads and parallel-agent code audits this session, cross-checked against
`.claude/reports/2026-09-14-claude-design-draft-pipeline-harmonisation.md` (a same-day, more
rigorous adversarial-council investigation into the same draft — read that report too for the
render-based measurement methodology and the open risks it found).

## The draft

`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/` — a Claude Design `.dc.html`
handoff (`Eye Care Birmingham.dc.html`, 2,220 lines). Zero CSS classes, 815 inline styles.
Identity comes from Claude Design's own template DSL (`sc-for`/`sc-if` attribute names), not
class names — Tier 0/1 (class-name recognition) can't reach it at all.

Responsiveness is computed in JS (a `ResizeObserver` measures container width, derives
`mob`/`narrow`/`wide` booleans, picks between two hardcoded style strings) rather than CSS
`@media` queries — confirmed this is the shape of every Claude Design draft, not a one-off.

## Universal-pipeline targets vs. exempt

| Entity | Destination | Destination readiness |
|---|---|---|
| Header, mega-menu, nav-drawer, trust ticker, floating WhatsApp button | `sgs_header`/`sgs_mega_menu`/`sgs_drawer` CPTs (all real, all shipped) | CPT exists. The walker currently just **drops** this content (`chrome_skipped`) — nothing routes it in. Routing is unbuilt. |
| Footer | `sgs_footer` CPT | Same gap. |
| Shop page | `archive-product.html` (Spec 30, shipped) | Destination exists. Detection + mapping into it is unbuilt. |
| Product page shell | `single-product.html` + `sgs-pdp-*` parts (Spec 30, shipped) | Destination exists, but `sgs/product-card` itself is missing fields the draft needs — see Task 4. |
| Cart / checkout / order confirmation | **None today** — no `cart.html`/`checkout.html` template exists; WooCommerce's own default renders unmanaged | Task 5 in the fresh-session prompt builds these. |
| Size guide modal | **Agreed this session:** give `sgs/modal` a CPT (see below) | Not yet built — Task 1. |
| Lens configurator | `sgs/modal` + `sgs/form` (+ `sgs/form-step` + `sgs/form-field-tiles`) — a real, already-shipped combination | Missing only a running-total/price computation. Not a from-scratch build. |
| Google reviews slider | `sgs/google-reviews` block — direct match | Home page only, not actually an exception. |
| Frame Card component | No direct match yet | Task 4 closes this gap on `sgs/product-card`. |

**Genuinely universal-pipeline content** (no existing SGS destination, no cross-page sharing):
Home's hero/shape-tiles/about-strip/four-reasons-panel, About, Help/FAQ, Contact.

## CPT inventory (complete, verified via `grep -rn "register_post_type"`)

| CPT | Purpose | Auto-detected at clone time? |
|---|---|---|
| `sgs_header` | Full-editor header layout | No — walker chrome-skips, doesn't route |
| `sgs_footer` | Same, for footers | No — same gap |
| `sgs_drawer` | Off-canvas mobile-nav panel, own edit screen | No — no detector exists at all |
| `sgs_mega_menu` | Dropdown panel attached to a nav item, resolved by `object_id` | No |
| `sgs_product` | Lightweight product content type (Spec 24), opt-in | No |
| `sgs_product_template` | Internal agency tool, REST-managed only | N/A — not a draft destination |

No `wp_block` (WordPress core synced patterns) usage anywhere in this codebase for shared
content. Confirms there was no existing "one piece of content, many referrers" mechanism
before this session's modal-CPT decision.

## Modal findings

`sgs/modal` today is a plain open/close overlay — no step logic, no CPT, content lives inline
per instance.

**Real cross-page example found** (not hypothetical): the size guide modal opens from six
different places — footer, product page (twice), Help/FAQ, header mega-menu, mobile nav
drawer — with byte-identical content every time. Exactly the shape a shared-content mechanism
exists to solve.

**Decision agreed this session:** give `sgs/modal` the same CPT treatment as
header/footer/drawer/mega-menu (`sgs_modal`, own edit screen). Unlike header/footer's
singleton "Active" pointer, use the nav-drawer's **per-trigger picker** precedent — a site
holds several distinct modals at once, so each trigger needs its own post-ID attribute naming
which modal it opens.

## `sgs/form` findings

`sgs/form` + `sgs/form-step` is a genuine, already-shipped multi-step wizard: per-step
visibility toggling, a validation gate before advancing, a live progress bar,
`nextStep`/`prevStep`/`goToStep` navigation, step state persisted in `sessionStorage`.
`sgs/form-field-tiles` gives icon/image option-picking — a strong fit for lens-type selection.

**Confirmed gap:** no running-total/price computation exists anywhere in the form ecosystem,
nor in `sgs-booking` or `sgs-configurator-pro` — both of those plugins contain zero built code
(planning markdown only), so neither offers a structural precedent either.

**Unverified loose thread:** `form/view.js::updateStepVisibility()` hides inactive steps via
the `sgs-form-step--hidden` CSS class, not the `disabled` attribute. Whether that class sets
`display:none` (correctly excluding hidden fields from submission) was not checked — Task 2 in
the fresh-session prompt closes this.

## Lens configurator, corrected against the README

The README undercounts at 3 steps. The real `lens` state has **4**: lens type/use, thickness,
finish/tint, prescription capture — plus a persistent running-total footer, not a separate
summary screen. Opens from 2 real contexts (product page directly, bag drawer via `fromBag`),
with slightly different commit behaviour depending on origin.

## Frame Card vs `sgs/product-card`

Frame Card renders on Home, Shop, and both product-page recommendation rails — **not** the bag
drawer, which uses separate hand-rolled markup (the README's "every grid and rail" claim
overstates this by one surface). `sgs/product-card` is missing: swatch row, rating/review
count, brand wordmark overlay, saving badge. Task 4 closes this on the existing block, shipping
Frame Card's look and Mama's Munches' current look as two style variations of the same block.

## Not yet designed (explicitly deferred, not forgotten)

- The clone-time detector that recognises a draft section as header/footer/drawer/mega-menu/
  shop/product-shaped and routes it into the right CPT/template, instead of the walker's
  current chrome-skip-and-discard. Real, named, unbuilt work — not covered by this session.
- Whether `computed-parity.js`'s draft-vs-clone methodology needs a companion draft-only
  rendering primitive (render the SAME draft at 3 widths, diff against itself) for extracting
  responsive values before any clone exists — flagged, not built.
