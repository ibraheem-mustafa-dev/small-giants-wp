---
doc_type: plan
plan_id: choice-flow-ux-guided-buybox
spec: 43-SGS-CHOICE-FLOW.md (v1.7.0 → v1.8.0)
status: active
date: 2026-09-26
---

# Choice flow: Continue model, visual summary, option images, guided buybox

**Why:** Bean's review of the live Mama's journeys (2026-09-26). The flow works but reads as a quiz, not a shop:
- the final step shows one button where the options were
- there's no picture of what's being built
- options have no images
- Close is ugly
- step titles are weak

Bean also proposed building the flow into the buybox itself. The Eye Care draft's side panel (frame photo plus a
running list of choices) is the same "show the finished product" feature and closes the lens-flow visual gap.

**Scope rule:** this track builds choice-flow capability. Client follow-ups are out of scope (memory:
choice-flow-track-scope-is-functionality-only). Phase 5 of the form/choice-flow plan runs in a fresh session after
this plan is clear.

## Decisions (made; say if any is wrong)

| # | Decision | Why |
|---|---|---|
| D1 | **Continue model is the default.** Picking an option selects it and does not advance; a footer "Continue" moves on. A flow setting `advanceMode` keeps "advance on tap" for quick quizzes. | Bean's structural fix; quizzes still benefit from tap-to-advance. |
| D2 | **The "Continue" button is muted, not hidden, until an option is chosen.** It uses `aria-disabled` (still focusable) with muted colours. Pressing it early shows "Choose an option to continue". A default option makes it active at once. | The layout doesn't jump and keyboard and screen-reader users still find it ([Kitty Giraudel](https://kittygiraudel.com/2024/03/29/on-disabled-and-aria-disabled-attributes/), [a11y-101](https://a11y-101.com/development/aria-disabled)). |
| D3 | **Final step: footer right holds "Add to basket" and "Buy now".** Each can be switched on or off and its label edited. "Buy now" adds the item, then goes to checkout. The final step's body becomes a summary, not a button. | Back on the left, actions on the right, as Bean described. |
| D4 | **Summary panel ("your box").** It shows the product image (the chosen variation's image once resolved, else the product's), one row per choice made, and the running total. It sits in a left column on desktop (as in the Eye Care draft) and is collapsible above the steps on mobile. It extends the existing price panel rather than adding a second one. | "Show the finished product" and the lens draft's side panel; [Baymard: keep the summary visible, collapsed on mobile](https://baymard.com/blog/payment-ux). |
| D5 | **Option images.** Each option keeps its own `image`. For product-option steps, an option with no own image uses the term's swatch image (`_sgs_swatch_image_id`, the same meta the buybox pills read), so an image set once on a term shows everywhere. | One source of truth per term. |
| D6 | **Close is a round 44px icon button.** It shows × in an SVG, is labelled "Close" for screen readers, and brightens on hover. | Replaces the text-plus-× pill. |
| D7 | **Step titles default to bold (700), with a font-weight control.** | Bean: titles need more weight. |
| D8 | **Progress counts finished steps.** It is empty on step 1 and full on the final step. | Bean's Journey B question; the bar should show work done. |
| D9 | **Price-changing choices sit either all in the flow or all on the page.** The editor warns when a flow asks some but not all of its product's variation-forming attributes. Add-ons and non-priced options are free either way. | Bean, point 5. |
| D10 | **Guided buybox.** `sgs/buybox` gets a "Guided" layout that shows one option group at a time: variation attributes plus the product's non-priced attributes, which travel as answer rows. It has a progress meter and Back / Next beneath. Adding to the basket with groups unfinished (and no default to fill them) shows "Finish choosing: Flavour, Topping" and jumps to the first unfinished group. Design gate first (below). | Bean's idea: the flow inside the buybox. |

## Orchestration
The main thread owns contracts, wiring, review, build, deploy and design judgement. Sonnet agents write code in
parallel on file sets that don't overlap. There is one build and deploy per wave, and one batched QA pass per wave.

## Wave 1: flow UX (four agents in parallel, about 20 min)
| Agent | Owns | Delivers |
|---|---|---|
| A: Continue model + footer actions | `choice-flow/view.js`, new `choice-flow/navigation.js` (logic moved out of view.js), `choice-flow/add-to-bag.js`, `choice-flow-result/{block.json,render.php,edit.js,style.css}`, `choice-flow/style.css` (footer rules only) | D1, D2, D3, D8. The final step's actions render in the footer. "Buy now" sends `/sgs/v1/cart/add-item`, then goes to `wc_get_checkout_url()` (emitted as a data attribute). The email ending's submit stays with its form. |
| B: Summary panel | new `includes/choice-flow-summary.php`, `choice-flow/pricing.js` (panel render moved to new `choice-flow/summary.js`), `choice-flow/block.json` (summary settings), new `choice-flow/SummaryPanel.js` | D4: product and variation image, choice rows (plain answers, product options, add-ons), total; desktop left column, collapsible on mobile. |
| C: Options, titles, Close | `choice-flow-question/{render.php,style.css,block.json}`, `includes/choice-flow-product-attribute-step.php`, `includes/choice-flow-chrome.php`, `choice-flow/chrome.js` | D5, D6, D7, and D9's editor notice (in a new `choice-flow-question/VariationCoverageNotice.js`). |
| D: Mama's option images (data only) | sandybrown media library + term meta | Find suitable existing photos for each Flavour, Topping, Dietary and Pack term and set `_sgs_swatch_image_id`; report any term with no suitable photo. |

In parallel, the main thread runs the **D10 design gate**: load `/frontend-design`, name a direction, decide how the
guided buybox reuses the flow's progress meter, footer and answer rows (a buybox layout, not an embedded flow), and
write the design into Spec 43 as FR-43-23 before Wave 2.

## Wave 2: guided buybox (two agents, about 25 min)
- **E: server and editor** (`buybox/block.json`, a new `includes/buybox-guided.php`, a new `buybox/GuidedPanel.js`): the
  `layout: guided` setting, groups from the manifest axes plus the product's non-variation attributes, and defaults.
- **F: client** (a new `buybox/guided.js` and `buybox` style): one group at a time, Next / Back, the progress meter, the
  finish-choosing guard, and answer rows sent as `fields` on the existing add-to-cart call.

## Wave 3: apply and prove (about 20 min)
- **Mama's:**
  - Journey A (full flow with the summary and images)
  - Journey B (pack on the page, flow for the rest)
  - Journey C: product 3990's page with the guided buybox
- **Eye Care:** the lens configurator with the summary panel as the draft's left aside, compared with the draft at
  1440, 768 and 375 (this closes the lens-flow visual clone).
- **One batched QA pass:**
  - every journey at 1440 and 375
  - the Continue button muted then active, and its early-press hint
  - Add to basket and Buy now reaching the cart and checkout
  - the summary rows and image swap
  - the progress bar empty at the start
  - keyboard and focus
  - an editor round trip for each new setting
  - the Eye Care £268 path, as a regression check

## Verification commands
- `npm run build` (all fast gates); the deploy's full gates.
- `php tests/php/run-choice-flow-submit-standalone.php` and the add-on runners.
- The Playwright journeys script from `c:\tmp\qa-choiceflow\final\`, extended to the new behaviour.

## Docs
- Spec 43 v1.8.0: FR-43-23 (guided buybox), plus D1 to D9 folded into FR-43-1 / 2 / 3 / 15 / 19.
- This plan's status.
- The LEDGER row.
- The Eye Care plan's lens-configurator gap closed.
