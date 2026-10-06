# The 63 `not walker-measurable` rows — Phase 1 partition

**2026-10-06.** Source: `.claude/plans/2026-10-02-eye-care-fix-register.md` (read only).
Count verified: `grep -c "not walker-measurable"` → **63**.
Live block code: **`578a8830b`**, read from `~/.sgs-deploy-marker-eye-care-test.json`.

## The register's four schemas

Field counts from `awk -F'|'` prove the split, and they decide where a proof can be written:

| Schema | NF | Columns | Rows here | Fix cell exists? |
|---|---|---|---|---|
| Site-wide + per-surface | 8 | `Ref/What/Fix/Type/Status/Sweep` | 47 | **yes** |
| Computed route (CR) | 7 | `Ref/Finding/Evidence/Status/Sweep` | 14 | **no** |
| Content not tied to a screen | 6 | `Ref/What/Type/Sweep` | 2 | **no** |

So 47 rows can carry Fix-cell proof; **16 are report-only**.

## Partition

| Group | Count | Treatment |
|---|---|---|
| CR route/calibration | 14 | Out of scope — route owner |
| Narrate a completion, all live | 8 | Verify live, do not rebuild |
| To assess | 41 | Test, compare, categorise |

**The 8 built:** S9, S10, S12, 18, N11, 59, N25, 91. All eight cite commits that are
**ancestors of the live SHA** — verified with `git merge-base --is-ancestor` over all 21 cited hashes.

## The 41 collapse to ~25 independent units

A third of the 41 are **aliases** whose Fix cell is just a pointer to a parent row. They are not separate
work, and six of them point at a parent that is **already built and live** — those should verify closed.

| Alias | Points at | Parent state |
|---|---|---|
| N2A, N26 | S10 | **BUILT + live** |
| N10, N33A | S9 | **BUILT + live** |
| N6 | S12 | **BUILT + live** |
| 61 | 59 | **BUILT + live** |
| 3 | 17 | open |
| N9, N34 | S8 | open |
| N27, N31 | S7 | open |
| N8 | N2B | open (`to prove`) |

## The independent units, with fix shape and files touched

Ranked roughly by size. "Files" is the overlap column for selection.

| Ref | Unit | Type | Fix shape (as the register states it) | Files / surface |
|---|---|---|---|---|
| 45 | `/privacy`, `/terms` missing | content | Create both pages | WP content; no page ID exists in repo |
| 36 | Address on one line | content | Store Site Info address with a line break | Site Info |
| 95 | Empty spec rows | content | Fill the product data | **client data**, not code |
| 151 | Delivery wording | content | Shipping method titles + descriptions | WooCommerce settings |
| 152 | Coupon / note / terms | none | Confirm each switches off without code | verify only |
| 9 | Ferrari tile reads name twice | tree | Clear its title or image alt | tree/content |
| 159, 161 | Photos; brand pages | content | — (no Fix column) | client content |
| N33B | Save shown twice | tree | Turn off the photo tag | tree |
| N30 | Bridge size box | content+tree | Plain `56 · 17 · 145` everywhere | tree + content |
| N16b | Best sellers hand-picked | tree | Woo best-sellers collection (8, by sales) | tree; no sales yet on test |
| 58 | Hero buttons instant | tree | fade-up 18px, 0.9s, ease, 0.56s delay | tree only |
| D7 | Google rating needs a home | tree | Reviews block as header top-bar item | header tree |
| 64 | Filter bar scrolls away | fw repair | Pin the top bar like the bottom | `theme/.../sgs-shop-filters*` |
| 96 | Focus ring black not taupe | fw repair | Focus rules use client focus-ring token | theme focus rules |
| N24 | Google logo should link | fw repair | Link to the review or listing | reviews block |
| S7 | "No reviews yet" | tree | Remove card text + delete product panel | product-card + product tree |
| S8 | `.00` on prices | fw repair | One switch hides `.00`; emails/admin keep pennies | **greenfield** — no `wc_price`/`wc_get_price_decimals` filter exists |
| 37 | Address not a link | fw new+tree | New business-info address-link setting | `business-info` block |
| 73 | Product photo no fade | fw new+tree | New entrance setting on the gallery photo | product gallery block |
| 19 | Free-delivery bar too fast | fw new+tree | Bar fill duration to the draft's | `cart/free-delivery.js` |
| 17 (+3) | Bag count pop | fw repair+tree | on/off → off / on change / on load+change; 60%→115%, 0.5s | `cart/count-pop.js` + block.json |
| 14 | Drawer links all at once | fw new+tree | New "stagger items inside groups", CSS only | nav-drawer |
| N13 | WhatsApp covers footer links | fw repair+tree | Extend the existing watcher with a footer opt-in | `whatsapp-cta` + footer row |
| 51 | Hero no zoom-out | fw repair+fw new | **ken-burns paints nothing**; add one-off zoom 108%→100%, 3s | hero block |
| N37 | Steps should advance on pick | fw new+tree | New "advance on pick, keep Continue" mode + announce | `choice-flow/flow-steps.js` |
| N38 | Skip opens an extra step | fw new+tree | New "skip adds to bag" setting | `choice-flow/flow-skip.js` |
| N4 | Top bar should marquee | tree+fw repair | Repair so drop+scroll coexist; pause button (WCAG 2.2.2) | nav-bar / top bar |

**Overlap clusters** (fix one, touch the other):
- `cart/` — 17+3, 19, and 18's toast verification
- `choice-flow/` — N37, N38
- S10 family — N2A, N26 (all built)
- S9 family — N10, N33A (framework built, **tree half still open**)
- S7 family — S7, N27, N31, and D7 moves into the panel S7 deletes
