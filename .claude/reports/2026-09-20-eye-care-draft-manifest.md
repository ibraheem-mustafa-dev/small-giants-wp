# Draft manifest: Eye Care Birmingham.dc.html

Screens: 9 (4 normal pages, 5 templates or flows). Entities: 6. Chrome: header, footer.

## Screens

| Screen | View | Route | Kind | Built as |
|---|---|---|---|---|
| Home | home | / | page | WordPress page, normal clone |
| Shop | shop | /sunglasses (+ filter query params) | wc-archive | WooCommerce shop archive template (Spec 30 FR-30-3) |
| Product | product | /frames/[slug] | single-template | single-post-type template (Spec 30 FR-30-2 when the type is product) |
| Lenses | lenses | /frames/[slug]/lenses | choice-flow | sgs_choice_flow post (Spec 43) |
| About | about | /about | page | WordPress page, normal clone |
| Help | help | /help | page | WordPress page, normal clone |
| Contact | contact | /contact | page | WordPress page, normal clone |
| Checkout | checkout | /checkout | wc-checkout | WooCommerce checkout template (Spec 30) |
| Order confirmed | done | /order/[id] | wc-order-received | WooCommerce order-received template (Spec 30) |

## Entities other things point at

| Id | Kind | Name | Opened by | Read from |
|---|---|---|---|---|
| overlay:megaAny | mega | megaAny | openMegaBrands, openMegaHelp, openMegaLenses, openMegaSun, toggleMegaBrands | state |
| overlay:menuOpen | drawer | Close menu | toggleMenu | state |
| overlay:bagOpen | cart-drawer | Your bag | openBag | state |
| overlay:sizeModalOpen | modal | Size guide | openSizeGuide | state |
| choice-flow:lenses | choice-flow | Add prescription lenses | openLens | name |
| form:Contact | form | Contact form |  | markup |

## References and links

| From | How | To | Times |
|---|---|---|---|
| content:About | links to | shell:Shop | 1 |
| content:Checkout | references | overlay:bagOpen | 2 |
| content:Checkout | links to | shell:Order confirmed | 1 |
| content:Contact | references | form:Contact | 1 |
| content:Help | references | overlay:sizeModalOpen | 1 |
| content:Help | links to | shell:Contact | 2 |
| content:Home | links to | shell:About | 1 |
| content:Home | links to | shell:Lenses | 2 |
| content:Home | links to | shell:Shop | 3 |
| content:Lenses | links to | shell:Shop | 1 |
| content:Order confirmed | links to | shell:Shop | 1 |
| content:Product | references | choice-flow:lenses | 1 |
| content:Product | references | overlay:sizeModalOpen | 2 |
| content:Product | links to | shell:Home | 1 |
| content:Product | links to | shell:Shop | 1 |
| footer | references | overlay:megaAny | 1 |
| footer | references | overlay:sizeModalOpen | 1 |
| footer | links to | shell:About | 1 |
| footer | links to | shell:Contact | 1 |
| footer | links to | shell:Help | 2 |
| footer | links to | shell:Lenses | 1 |
| footer | links to | shell:Shop | 1 |
| header | references | overlay:bagOpen | 1 |
| header | references | overlay:megaAny | 5 |
| header | references | overlay:menuOpen | 1 |
| header | links to | shell:About | 1 |
| header | links to | shell:Help | 1 |
| header | links to | shell:Home | 1 |
| header | links to | shell:Lenses | 1 |
| header | links to | shell:Shop | 1 |
| overlay:bagOpen | links to | shell:Checkout | 1 |
| overlay:bagOpen | links to | shell:Shop | 1 |
| overlay:megaAny | references | overlay:sizeModalOpen | 1 |
| overlay:megaAny | links to | shell:Contact | 1 |
| overlay:megaAny | links to | shell:Help | 4 |
| overlay:megaAny | links to | shell:Lenses | 2 |
| overlay:menuOpen | references | overlay:sizeModalOpen | 1 |
| overlay:menuOpen | links to | shell:About | 1 |
| overlay:menuOpen | links to | shell:Contact | 1 |
| overlay:menuOpen | links to | shell:Help | 1 |
| overlay:menuOpen | links to | shell:Lenses | 1 |
| overlay:menuOpen | links to | shell:Shop | 2 |

## Build order

1. global-styles
2. site-info
3. shell:About
4. shell:Checkout
5. shell:Contact
6. shell:Help
7. shell:Home
8. shell:Lenses
9. shell:Order confirmed
10. shell:Product
11. shell:Shop
12. choice-flow:lenses
13. form:Contact
14. overlay:bagOpen
15. overlay:sizeModalOpen
16. overlay:megaAny
17. overlay:menuOpen
18. footer
19. header
20. content:About
21. content:Checkout
22. content:Contact
23. content:Help
24. content:Home
25. content:Lenses
26. content:Order confirmed
27. content:Product
28. content:Shop

## Not resolved

- README route 'bag' /bag has no screen; it is presented as overlay:bagOpen
