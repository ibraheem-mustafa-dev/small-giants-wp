repo: ibraheem-mustafa-dev/small-giants-wp
branch: main
path: sites/mamas-munches

## Last sync
date: 2026-09-23T21:59:08Z

### Updated in this project
- Read the SGS theme, the Mama's Munches client folder and the key block manifests (buybox, trust-bar, testimonial-slider)
- Mapped every designed screen to existing SGS blocks and templates (see Theme Mapping.md)

## Screen map
| Project screen | Repo files |
|---|---|
| Home.dc.html | theme/sgs-theme/templates/front-page.html, plugins/sgs-blocks/src/blocks/{hero,trust-bar,card-grid,testimonial-slider,trustpilot-reviews,accordion}/ |
| SiteHeader.dc.html | plugins/sgs-blocks/src/blocks/{site-header,site-header-row,nav-bar-menu,nav-drawer,nav-drawer-menu,cart}/, theme/sgs-theme/patterns/framework-header-default.php |
| SiteFooter.dc.html | plugins/sgs-blocks/src/blocks/{site-footer,site-footer-row,social-icons}/, theme/sgs-theme/patterns/framework-footer-default.php |
| Shop.dc.html / ProductCard.dc.html | theme/sgs-theme/templates/archive-product.html, parts/sgs-archive-toolbar.html, plugins/sgs-blocks/src/blocks/product-card/ |
| Product.dc.html | theme/sgs-theme/templates/single-product.html, parts/sgs-pdp-buybox.html, parts/sgs-pdp-content.html, plugins/sgs-blocks/src/blocks/{buybox,option-picker,product-faq}/ |
| Gifts.dc.html | plugins/sgs-blocks/src/blocks/{choice-flow,choice-flow-question,choice-flow-result}/ |
| Basket.dc.html | theme/sgs-theme/templates/cart.html, parts/sgs-cart-content.html, plugins/sgs-blocks/src/blocks/cart/ |
| Checkout.dc.html | theme/sgs-theme/templates/checkout.html, parts/sgs-checkout-content.html |
| Confirmation.dc.html | theme/sgs-theme/templates/order-confirmation.html, parts/sgs-order-confirmation-content.html |
| Contact.dc.html | theme/sgs-theme/patterns/contact-form.php, plugins/sgs-blocks/src/blocks/{form,form-field-*,whatsapp-cta}/ |
| Help.dc.html | theme/sgs-theme/patterns/faq-section.php, plugins/sgs-blocks/src/blocks/{accordion,filter-search}/ |
| Design tokens | sites/mamas-munches/theme-snapshot.json, theme/sgs-theme/theme.json |
