# Site check: mamas-munches-redesign on local-mamas

http://localhost:8084 · 2026-10-27T14:35:45.995Z · exit 1

| # | Check | Status | Summary |
|---|---|---|---|
| 1 | Every page-map page loads (200) and renders its main content | PASS | 9 pass, 0 fail, 0 n-a |
| 2 | Header links exist and point at page-map pages; no page links to a draft file | FAIL | 6 pass, 22 fail, 0 n-a |
| 3 | Each mega menu opens its panel and closes | N-A | the header has no mega menu trigger ([data-sgs-mega-trigger]) at 1440 |
| 4 | The drawer opens at 375 and 768 and closes | PASS | 2 pass, 0 fail, 0 n-a |
| 5 | Every modal and choice flow opens from its trigger and closes | FAIL | 0 pass, 2 fail, 0 n-a |
| 6 | Every form submits to its success state (one marked test entry) | PASS | 1 pass, 0 fail, 0 n-a |
| 7 | The client's scripted flows pass | N-A | scripts/parity/flows holds no flows for mamas-munches-redesign (its flows are eye-care-ward-end's) |
| 8 | Cart, checkout and my-account show WooCommerce's working forms | FAIL | 1 pass, 1 fail, 1 n-a |

## Failures

- **2. menu** header link "Sign in or create an account": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=5`; error: points at the draft file http://SignIn.dc.html (an unresolved draft link)
- **2. menu** header link "Sign in or create an account": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=7`; error: points at the draft file http://SignIn.dc.html (an unresolved draft link)
- **2. menu** page-map header item product:product: url: http://localhost:8084/; error: the page map puts product:product ("Product") in the header menu; no header link reaches it
- **2. menu** draft-file link "Sign in or create an account": error: http://SignIn.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Shop": error: http://Shop.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Gifts": error: http://Gifts.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Subscribe & save": error: http://Product.dc.html?id=zookies&sub=1 is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Help": error: http://Help.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Contact": error: http://Contact.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Zookies": error: http://Product.dc.html?id=zookies is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Taster Trio": error: http://Product.dc.html?id=trial is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Create account": error: http://SignIn.dc.html?mode=register is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Build your box": error: http://Home.dc.html#build is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Delivery": error: http://Help.dc.html#delivery is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Allergens": error: http://Help.dc.html#allergens is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Privacy": error: http://Help.dc.html#legal is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- **2. menu** draft-file link "Checkout securely": error: http://Checkout.dc.html is a draft file, not a site address; linked from page:cart, page:checkout
- **2. menu** draft-file link "View full basket": error: http://Basket.dc.html is a draft file, not a site address; linked from page:cart, page:checkout
- **2. menu** draft-file link "New Baby Gift Box": error: http://Product.dc.html?id=giftbox is a draft file, not a site address; linked from page:gifts, page:home, product:product
- **2. menu** draft-file link "40-Day Care Bundle": error: http://Product.dc.html?id=care40 is a draft file, not a site address; linked from page:gifts, page:home, product:product
- **2. menu** draft-file link "£40": error: http://Product.dc.html?id=giftcard is a draft file, not a site address; linked from page:gifts, page:home
- **2. menu** draft-file link "Home": error: http://Home.dc.html is a draft file, not a site address; linked from product:product
- **5. modals** page-map choice flow choice-flow-gifts-she-ll-actually-eat ("Gifts she’ll actually eat"): error: no checked page renders a choice flow labelled "Gifts she’ll actually eat" (9 pages checked)
- **5. modals** page-map choice flow choice-flow-build-your-zookie ("Build your Zookie"): error: no checked page renders a choice flow labelled "Build your Zookie" (9 pages checked)
- **8. woocommerce** account page: url: http://localhost:8084/my-account/; selector: `form:has(input[type="password"]), .woocommerce-MyAccount-navigation, .sgs-account`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/woo-account.png`; error: does not show a sign-in form (or the account area); the page reads: "my account My account Sign in to see your orders Your orders, bake dates, subscriptions and saved addresses live here. Sign in → Create an account"

## Every item

### 1. Every page-map page loads (200) and renders its main content

- PASS page:my-account: url: http://localhost:8084/my-account/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-my-account.png`; detail: 200, 149 characters in main.sgs-container
- PASS page:cart: url: http://localhost:8084/cart/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-cart.png`; detail: 200, 1628 characters in main.sgs-container
- PASS page:checkout: url: http://localhost:8084/cart/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-checkout.png`; detail: 200, 1628 characters in main.sgs-container; redirected from http://localhost:8084/checkout/
- PASS page:contact: url: http://localhost:8084/contact/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-contact.png`; detail: 200, 1094 characters in main.sgs-container
- PASS page:gifts: url: http://localhost:8084/gifts/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-gifts.png`; detail: 200, 1833 characters in main.sgs-container
- PASS page:help: url: http://localhost:8084/help/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-help.png`; detail: 200, 1603 characters in main.sgs-container
- PASS page:home: url: http://localhost:8084/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-home.png`; detail: 200, 4890 characters in main.sgs-container
- PASS shop:shop: url: http://localhost:8084/shop/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-shop.png`; detail: 200, 1028 characters in main.sgs-container
- PASS product:product (example: CR calibration product): url: http://localhost:8084/product/cr-calibration-product/; selector: `main.sgs-container`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/page-product.png`; detail: 200, 3003 characters in main.sgs-container

### 2. Header links exist and point at page-map pages; no page links to a draft file

- PASS menu link "Shop": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=0`; detail: http://localhost:8084/shop/ is shop:shop
- PASS menu link "Gifts for new mums": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=1`; detail: http://localhost:8084/gifts/ is page:gifts
- PASS menu link "Help & FAQs": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=2`; detail: http://localhost:8084/help/ is page:help
- PASS menu link "Contact": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=3`; detail: http://localhost:8084/contact/ is page:contact
- PASS header link "Go to Mama's Munches (test) homepage": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=4`; detail: http://localhost:8084/ is page:home
- FAIL header link "Sign in or create an account": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=5`; error: points at the draft file http://SignIn.dc.html (an unresolved draft link)
- PASS header link "Go to Mama's Munches (test) homepage": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=6`; detail: http://localhost:8084/ is page:home
- FAIL header link "Sign in or create an account": url: http://localhost:8084/; selector: `.sgs-site-header a >> nth=7`; error: points at the draft file http://SignIn.dc.html (an unresolved draft link)
- FAIL page-map header item product:product: url: http://localhost:8084/; error: the page map puts product:product ("Product") in the header menu; no header link reaches it
- FAIL draft-file link "Sign in or create an account": error: http://SignIn.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Shop": error: http://Shop.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Gifts": error: http://Gifts.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Subscribe & save": error: http://Product.dc.html?id=zookies&sub=1 is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Help": error: http://Help.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Contact": error: http://Contact.dc.html is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Zookies": error: http://Product.dc.html?id=zookies is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Taster Trio": error: http://Product.dc.html?id=trial is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Create account": error: http://SignIn.dc.html?mode=register is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Build your box": error: http://Home.dc.html#build is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Delivery": error: http://Help.dc.html#delivery is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Allergens": error: http://Help.dc.html#allergens is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Privacy": error: http://Help.dc.html#legal is a draft file, not a site address; linked from page:my-account, page:cart, page:checkout, page:contact, page:gifts, page:help, page:home, shop:shop, product:product
- FAIL draft-file link "Checkout securely": error: http://Checkout.dc.html is a draft file, not a site address; linked from page:cart, page:checkout
- FAIL draft-file link "View full basket": error: http://Basket.dc.html is a draft file, not a site address; linked from page:cart, page:checkout
- FAIL draft-file link "New Baby Gift Box": error: http://Product.dc.html?id=giftbox is a draft file, not a site address; linked from page:gifts, page:home, product:product
- FAIL draft-file link "40-Day Care Bundle": error: http://Product.dc.html?id=care40 is a draft file, not a site address; linked from page:gifts, page:home, product:product
- FAIL draft-file link "£40": error: http://Product.dc.html?id=giftcard is a draft file, not a site address; linked from page:gifts, page:home
- FAIL draft-file link "Home": error: http://Home.dc.html is a draft file, not a site address; linked from product:product

### 4. The drawer opens at 375 and 768 and closes

- PASS drawer at 375: url: http://localhost:8084/; selector: `header button[aria-controls="sgs-nav-drawer"]`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/drawer-375-open.png`; detail: opened by the burger, closed by the close button (.sgs-nav-drawer__close)
- PASS drawer at 768: url: http://localhost:8084/; selector: `header button[aria-controls="sgs-nav-drawer"]`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/drawer-768-open.png`; detail: opened by the burger, closed by the close button (.sgs-nav-drawer__close)

### 5. Every modal and choice flow opens from its trigger and closes

- FAIL page-map choice flow choice-flow-gifts-she-ll-actually-eat ("Gifts she’ll actually eat"): error: no checked page renders a choice flow labelled "Gifts she’ll actually eat" (9 pages checked)
- FAIL page-map choice flow choice-flow-build-your-zookie ("Build your Zookie"): error: no checked page renders a choice flow labelled "Build your Zookie" (9 pages checked)

### 6. Every form submits to its success state (one marked test entry)

- PASS form "form-send" on page:contact: url: http://localhost:8084/contact/; selector: `.sgs-form form.sgs-form__inner (formId form-send)`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/form-0-success.png`; detail: success message "Thank you! Your submission has been received."; requests: 200 /wp-json/sgs-forms/v1/submit; 1 stored submission(s) since the run began; test entry marked "SGS site-check test"

### 8. Cart, checkout and my-account show WooCommerce's working forms

- PASS cart page: url: http://localhost:8084/cart/; selector: `.wp-block-woocommerce-cart, form.woocommerce-cart-form, .wc-block-cart`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/woo-cart.png`; detail: div.wp-block-woocommerce-cart.alignwide shows (the empty-basket state)
- N-A checkout page: url: http://localhost:8084/checkout/; detail: WooCommerce sends checkout to the basket while it is empty (http://localhost:8084/cart/); --with-cart adds one line so the checkout form can be checked
- FAIL account page: url: http://localhost:8084/my-account/; selector: `form:has(input[type="password"]), .woocommerce-MyAccount-navigation, .sgs-account`; screenshot: `sites/mamas-munches-redesign/build/qa/site-check/2026-10-27T14-35-45/woo-account.png`; error: does not show a sign-in form (or the account area); the page reads: "my account My account Sign in to see your orders Your orders, bake dates, subscriptions and saved addresses live here. Sign in → Create an account"

## Notes

- page map template:order-confirmation not loaded: a template with no page of its own
- page map sgs_form:form-send not loaded: a sgs_form post, not a page a visitor opens
- page map sgs_choice_flow:choice-flow-gifts-she-ll-actually-eat not loaded: a sgs_choice_flow post, not a page a visitor opens
- page map sgs_choice_flow:choice-flow-build-your-zookie not loaded: a sgs_choice_flow post, not a page a visitor opens
- page map sgs_footer:footer not loaded: a sgs_footer post, not a page a visitor opens
- page map sgs_header:header not loaded: a sgs_header post, not a page a visitor opens
- page map sgs_drawer:drawer-menu not loaded: a sgs_drawer post, not a page a visitor opens
