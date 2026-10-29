# Section purposes draft

Count: 51 purposes. Data: section-purposes.draft.json

| Purpose | Maps to | Client sections covered |
|---|---|---|
| hero | sgs/hero | eye-care: sgs-hero; indus: Home Hero; mamas: S-07 hero + trust bar |
| page-intro | sgs/hero | indus: shared inner-page hero (S-17..S-44); mamas: Shop heading band, Contact/Help/Basket/Sign-in heroes; eye-care: sgs-page-about/lenses/help/contact |
| breadcrumb | sgs/breadcrumbs | eye-care: sgs-breadcrumb; mamas: S-14 breadcrumb; indus: hero breadcrumb label |
| brand-marquee | sgs/brand-strip | eye-care: sgs-brand-marquee; indus: Home Our Brands marquee |
| logo-wall | sgs/brand-strip | indus: blocks "logos" (S-27); indus footer accreditations (not rendered) |
| trust-ticker | sgs/trust-bar | eye-care: sgs-trust-ticker; mamas: S-07 trust bar, S-14 assurance row; indus: Home hero trust chips |
| notice-bar | sgs/notice-banner | announcement bars on any site (no client declares one as a section; indus Top bar is contact pills) |
| reviews-google | sgs/google-reviews | eye-care: sgs-google-reviews |
| reviews-trustpilot | sgs/trustpilot-reviews | mamas: S-07 #reviews slider (6 Trustpilot reviews), hero "4.3 on Trustpilot" |
| testimonials | sgs/testimonial-slider | indus: Home Our Partners Love Us; template "quotes" (unused) |
| stats | sgs/counter | indus: blocks "stats" (S-17, S-18) |
| feature-grid | sgs/feature-grid | indus: Home Why Choose Indus Foods (8 cards); eye-care: sgs-why-buy |
| feature-list | sgs/icon-list | indus: blocks "rows" (S-19..S-26, ambiguous); mamas: recipe card ingredients |
| link-cards | sgs/card-grid | indus: Home sector cards, blocks "cards", About 8 linked cards; mamas: Who are we baking for path cards, Contact channel cards, gifts tiles |
| category-tiles | sgs/card-grid | eye-care: sgs-shape-tiles; mamas: Gifts moment tiles |
| media-split | sgs/container | indus: blocks "split", "gradients"; eye-care: sgs-about-strip, sgs-optician; mamas: #story story polaroid |
| process-steps | sgs/process-steps | indus: Home How to open a trade account; mamas: Gifts how gifting works |
| timeline | sgs/timeline | indus: Home Heritage, blocks "hscroll" (S-17, S-18), template "timeline" |
| faq | sgs/accordion | indus: blocks "faq" (S-34, S-38); mamas: Home FAQ, Help FAQ list |
| info-accordion | sgs/accordion | mamas: S-14 accordion |
| call-to-action | sgs/container | indus: blocks "cta" (most pages), Home final CTA band; mamas: Gifts gift-card band |
| team | sgs/team-member | none in the three clients (framework coverage) |
| pricing | sgs/pricing-table | none in the three clients (framework coverage) |
| gallery | sgs/gallery | none declared (framework coverage) |
| before-after | sgs/before-after | none in the three clients (framework coverage) |
| countdown | sgs/countdown-timer | none in the three clients (framework coverage) |
| contact-details | sgs/business-info | indus: blocks "contact", footer opening hours; mamas: Contact channel cards (or link-cards); eye-care: Contact page details |
| map | core/embed | none declared explicitly; contact pages show an address |
| enquiry-form | sgs/form | indus: blocks "form", "enquiry" (S-22, S-33, S-37); mamas: Contact message form |
| multi-step-form | sgs/form | indus: blocks "wizard" (S-32 TradeApplication) |
| newsletter-signup | sgs/form | none declared (framework coverage) |
| guided-finder | sgs/choice-flow | mamas: Home Who are we baking for, Gifts finder card; eye-care: sgs-lens-configurator (open question) |
| product-builder | sgs/option-picker | mamas: Home #build, Product buy box builder |
| posts-list | sgs/post-grid | indus: blocks "posts" |
| article-body | core/post-content | indus: blocks "article" (S-39..S-44) |
| rich-text | sgs/container | indus: blocks "prose" (S-35); mamas: Help #delivery #allergens #legal |
| shop-archive | woocommerce/product-collection | eye-care: sgs-shop-layout, sgs-page-shop; mamas: S-12 product grid + sort + filter chips |
| product-collection | woocommerce/product-collection | eye-care: sgs-best-sellers, sgs-product-similar, sgs-product-more-from-brand; mamas: S-14 related |
| product-buybox | sgs/buybox | eye-care: sgs-product-main; mamas: S-14 gallery + buy box |
| product-details | sgs/tabs | eye-care: sgs-product-tabs |
| product-reviews | woocommerce/product-reviews | eye-care: sgs-product-reviews, sgs-product-no-reviews; mamas: S-14 reviews |
| product-faq | sgs/product-faq | none declared (framework coverage) |
| cart | woocommerce/cart | mamas: S-23 basket |
| mini-cart | sgs/cart | eye-care: sgs-bag-drawer |
| checkout | woocommerce/checkout | eye-care: sgs-page-checkout, sgs-checkout-contact/delivery/payment/express/prescription; mamas: S-25 steps 1-4 + pay + summary |
| order-confirmation | woocommerce/order-confirmation | eye-care: sgs-page-order-confirmed; mamas: Confirmation page |
| account-area | sgs/account | eye-care: sgs-page-account; mamas: S-49 My account |
| sign-in | sgs/account | eye-care: sgs-page-signin; mamas: S-40 sign in |
| site-header | sgs/site-header | eye-care: sgs-header; indus/mamas: sticky header |
| site-footer | sgs/site-footer | eye-care: sgs-footer; indus: three-row footer; mamas: footer |
| plain-container | sgs/container | wrappers with no other purpose |

## Not purposes (decided by surface kind)
Eye Care sgs-mega-menu (menu/panel -> sgs/mega-panel), sgs-mobile-menu (drawer -> sgs/nav-drawer), sgs-size-guide (modal -> sgs/modal), sgs-whatsapp-fab (global -> floating sgs/whatsapp-cta), sgs-toast (framework behaviour, no block). Eye Care sgs-page-* roots are pages, not sections.

## Open questions for Bean
1. map: no SGS map block exists. Build one, or map to core/embed (current)?
2. Indus "rows" (11 pages) is ambiguous: mapped to feature-list (sgs/icon-list); could be info-box rows. Needs a look at the markup.
3. Indus "cards" splits into link-cards and feature-grid; "gradients" (other sectors) mapped to media-split but probably is link-cards.
4. Eye Care sgs-lens-configurator: mapped to guided-finder (sgs/choice-flow); plugins/sgs-configurator-pro may be the real home. Confirm.
5. product-builder: sgs/option-picker is single-select; Mama's flavours need up to 3 picks. Gap.
6. Indus Top bar is contact pills, not an announcement; notice-bar fits loosely (ruling 4 sends sticky notices to the header top row).
7. Checkout: one purpose for the whole checkout (proposed) vs one per step; steps come from form-step surfaces.
8. Blocks with no purpose: audio, image-sequence (agency only), physics-canvas, measured-diagram, theme-toggle, language-switch, store-selector, wishlist-link/panel, table-of-contents, collapsible-text, decorative-image, local-time (folded into contact-details). Add now or on first client need?
9. Purposes with no client evidence (team, pricing, gallery, before-after, countdown, newsletter-signup, product-faq, notice-bar): keep or trim?
10. Woo maps_to names are WooCommerce block names, absent from the framework DB blocks table, so db_check cannot confirm them.
11. Eye Care's 42 sgs-* names were read from class attributes; the manifest lists pages only, not sections.
