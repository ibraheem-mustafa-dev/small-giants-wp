# Render-path matrix for motion parts (Spec 38A)

Commit 3925d1c24. Read-only static analysis. Method: PHP tokenizer (phpscan.php) finds file-scope early returns and if/elseif/else ladders in render.php and its plain-required partials; each path's text is expanded through required partials and transitively called functions (block files + includes/); a part prints on a path when its resolved class appears as a whole token (gate prints_class rule). Every flagged cell was then read by hand.

## Proven: a path that renders the part's role does not print its selector class

| Block | Part | Selector | Path that lacks it | Prints instead | Evidence |
|---|---|---|---|---|---|
| product-card (already known) | image | `.sgs-product-card__image` | read-only variable card (render.php L1082-1163), interactive variable card (L1341-1819), live default card (L1822-2177) | sgs-product-card__media-wrap (read-only, live default) / product-card__media (interactive) | includes/product-card-builtin-render.php::sgs_product_card_builtin_render is the only printer ($sgs_pcard_image_class); it is called only from the typed branch (render.php `if ( 'typed' === $source_mode )`) |
| product-card (already known) | body | `.sgs-product-card__body` | read-only variable, interactive variable, live default | product-card-body | includes/product-card-builtin-render.php::sgs_product_card_builtin_render only |
| product-card | price | `.sgs-product-card__price` | read-only variable, interactive variable, live default | price / price price--from / price price--current inside sgs-product-card__price-group | includes/product-card-builtin-render.php::sgs_product_card_builtin_render (the only `sgs-product-card__price` span); render.php live branches print `<div class="price">` |
| product-card | cta | `.sgs-product-card__cta` | every path (typed prints sgs-product-card__cta--primary; live paths print product-card__add-to-cart / product-card__view) | sgs-product-card__cta--primary, sgs-product-card__cta-row, product-card__add-to-cart, product-card__view | no whole token `sgs-product-card__cta` in render.php, its partials or includes/; gate check-motion-part-selectors.py::emitted_elements reads `sgs-product-card__cta--primary` as element `cta` |
| card-grid (already known) | image, body (delegated) | `mapped to product-card image/body` | source wc-product / cpt-collection (render-delegated.php renders each result as a live sgs/product-card) | the product-card live-path classes above | card-grid/block.json::supports.sgs.motionDelegate.parts maps image->image, body->body; includes/motion/class-sgs-motion-delegate.php moves the layers onto the card, whose live paths lack both classes |
| gallery | image | `.sgs-gallery__img` | any item that is a video, or an image without an attachment ID, in all three item branches (linked, lightbox, plain) | sgs-media sgs-media--image|--video sgs-media--gallery (from sgs_render_media) | gallery/render.php item loop: the `else` of `if ( 'image' === $img_type && $img_id )` echoes $item_html from includes/helpers-media.php::sgs_render_media; gallery/render-tile.php::sgs_gallery_media_html returns $fallback_html for the same case; the render.php comment says this path never receives sgs-gallery__img |
| hero | inner | `.sgs-hero__content-band` | split layout ($is_split) | no band element: the section root is the content/media grid | hero/render.php sets $hero_helper_opts['wrap_inner'] = false when $is_split; includes/class-sgs-container-wrapper.php::render skips the band (and the motion band force) when wrap_inner is false; hero/block.json elements.inner._note names it 'The content/media split grid' |
| hero | content-band | `.sgs-hero__content-band` | split layout | no band element | same as hero:inner |
| separator | content | `.sgs-separator__content` | contentMode icon (render.php `if ( 'icon' === $content_mode )`) | sgs-separator__icon only (no content wrapper); only the text branch builds `<span class="sgs-separator__content">` | separator/render.php $content_html assignments; the part's label is 'Content (icon or text)' |
| icon | label | `.sgs-icon__label` | unlinked labelled icon (`elseif ( $has_label )`), and in the linked branch it matches only the visually hidden accessible-name span | sgs-icon__label-text (the visible label, every path) | icon/render.php $label_html and the link sprintf; icon/style.css::.sgs-icon__label is the 1px clipped screen-reader rule |
| responsive-logo | image | `.sgs-responsive-logo__image` | every path | sgs-responsive-logo__image--desktop | responsive-logo/render.php: every <img> sprintf prints only the --desktop modifier class; gate emitted_elements truncates at `--` |
| star-rating | star | `.sgs-star-rating__star` | every path | sgs-star-rating__star--full / --empty on the <path>; the <svg> has no class | star-rating/render.php $star_class and the stars sprintf |

## Suspected (role may legitimately be absent)

| Block | Part | Selector | Path | What is unclear |
|---|---|---|---|---|
| product-card | priceNote / price-note | `.sgs-product-card__price-note` | read-only variable, live default | neither path prints any price-note element; whether those cards are meant to show a price note is a spec question |
| product-card | cta2 | `.sgs-product-card__cta--secondary` | read-only variable | the read-only card prints only one product-card__view button; whether a secondary CTA belongs there is unstated |
| product-card | noImageLabel | `.product-card__no-image-label` | typed, read-only variable | typed and read-only print no no-photo placeholder at all (the typed media-wrap is skipped when the image is empty); role likely absent by design |
| product-card | priceFromLabel | `.sgs-product-card__price-from-label` | typed, interactive variable | interactive card shows the live selected price, not a 'From' label; likely by design |
| product-card | wishlist, rrp | `.sgs-product-card__wishlist / __rrp` | typed | printed only by includes/product-card-live-fill.php helpers called from the live paths; the typed card has no product to wishlist, so likely by design |
| buybox | every part | `buybox__* / sgs-buybox__*` | no-WooCommerce, non-WC_Product, simple product, null manifest, over-24 KB context | these paths hand the page to core WooCommerce blocks (do_blocks($buybox_core_fallback)); the same roles (photo, add to cart, stock) are on screen under WooCommerce classes, so every buybox motion layer is silently lost on a simple product. By design as a fallback, but a motion author is not told |
| theme-toggle | label, icon | `.sgs-theme-toggle__label / __icon` | segmented style (`else` of `if ( 'switch' === $toggle_style )`) | the segmented radiogroup prints plain text buttons; no icon or label element exists, so probably by design, but the text buttons are the visual 'label' role |
| account | cardTitle, chip, track (and cardBox, heading on other endpoints) | `.sgs-account__card-title etc.` | every account endpoint other than the logged-in dashboard | printed only by includes/account/templates/dashboard.php, a WooCommerce template override reached through WooCommerce's shortcode, so no static call graph reaches it; element exists only on that endpoint |

## product-card part x path

| Part | Class | typed | read-only variable | interactive variable | live default |
|---|---|---|---|---|---|
| body | `sgs-product-card__body` | prints | absent | absent | absent |
| image | `sgs-product-card__image` | prints | absent | absent | absent |
| title | `sgs-product-card__title` | prints | prints | prints | prints |
| price | `sgs-product-card__price` | prints | absent | absent | absent |
| wishlist | `sgs-product-card__wishlist` | absent | prints | prints | prints |
| rrp | `sgs-product-card__rrp` | absent | prints | prints | prints |
| desc | `sgs-product-card__description` | prints | prints | prints | prints |
| description | `sgs-product-card__description` | prints | prints | prints | prints |
| priceNote | `sgs-product-card__price-note` | prints | absent | prints | absent |
| price-note | `sgs-product-card__price-note` | prints | absent | prints | absent |
| priceFromLabel | `sgs-product-card__price-from-label` | absent | prints | absent | prints |
| tag | `sgs-product-card__tag` | prints | prints | prints | prints |
| rating | `sgs-product-card__rating` | prints | prints | prints | prints |
| brand | `sgs-product-card__brand` | prints | prints | prints | prints |
| savingBadge | `sgs-product-card__saving-badge` | prints | prints | prints | prints |
| swatch | `sgs-product-card__swatch` | prints | prints | prints | prints |
| attributeTag | `sgs-product-card__attribute-tag` | prints | prints | prints | prints |
| ratingStars | `sgs-product-card__rating-stars` | prints | prints | prints | prints |
| swatchMore | `sgs-product-card__swatch-more` | prints | prints | prints | prints |
| cta2 | `sgs-product-card__cta--secondary` | prints | absent | prints | prints |
| noImageLabel | `product-card__no-image-label` | absent | absent | prints | prints |
| valueLadder | `product-card__value-ladder` | absent | absent | prints | absent |
| valueLadderSaving | `product-card__value-ladder__saving` | absent | absent | absent | absent |
| priceRow | `sgs-product-card__price-row` | prints | prints | prints | prints |
| cta | `sgs-product-card__cta` | absent | absent | absent | absent |

## Every block's render paths

| Block | Paths (kind: note) |
|---|---|
| accordion | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| account | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L44-51 [notice]: WooCommerce absent: prints only sgs-account__editor-notice |
| audio | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L131-133 [notice]: no audio URL: HTML comment only |
| before-after | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L57-58 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| brand-strip | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| breadcrumbs | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L491-492 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| business-info | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L484-485 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| button | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| buybox | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L81-84 [foreign]: no WooCommerce / no product: echo do_blocks($buybox_core_fallback), core WooCommerce blocks; early return L89-92 [foreign]: not a WC_Product: core WooCommerce fallback blocks; early return L97-102 [foreign]: simple (non-variable) product: sgs_buybox_simple_linked_flow_html() or core WooCommerce fallback blocks; early return L109-112 [foreign]: Product_Manifest::build() null: core WooCommerce fallback blocks; early return L436-440 [foreign]: context over 24 KB: core WooCommerce fallback blocks |
| card-grid | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L226-228 [delegated]: source wc-product / cpt-collection: render-delegated.php prints one sgs/product-card per result; supports.sgs.motionDelegate maps item/title/image/body/noImageLabel onto the card, other grid parts are not offered; early return L231-232 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| cart | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L112-113 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| choice-flow | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L84-110 [self]: flowIsLinked: render_block() of the referenced flow's sgs/choice-flow, which re-enters this render.php on the main path; early return L90-97 [notice]: broken linked reference: fallback message only |
| collapsible-text | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L85-86 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| container | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| countdown-timer | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| counter | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| decorative-image | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L122-123 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L307-359 [noparts]: video: sgs_render_media() inside a positioned span (block declares no non-root parts); early return L309-310 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L488-593 [noparts]: treatment/overlay wrapper (block declares no non-root parts) |
| feature-grid | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| filter-search | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L72-73 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L88-89 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| form | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L71-91 [notice]: broken linked reference: fallback message only; early return L94-108 [self]: linked form: render_block() of the definition's sgs/form, which re-enters this render.php on the main path |
| gallery | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| google-rating-badge | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L27-29 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| google-reviews | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L107-108 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| heading | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| hero | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| icon | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L81-82 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L87-88 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| icon-list | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| image-sequence | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L43-44 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| info-box | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| label | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| language-switch | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L73-74 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L222-225 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| local-time | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| measured-diagram | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| media | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L551-553 [notice]: image type with no URL: comment only; early return L718-720 [notice]: video type with no URL: comment only; early return L1077-1079 [notice]: svg type with no content: comment only |
| mega-aside | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| mega-group | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| mega-panel | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| modal | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| multi-button | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| nav-bar-menu | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L512-513 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| nav-drawer | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| nav-drawer-menu | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L518-519 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| notice-banner | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| option-picker | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L171-172 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L199-200 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| physics-canvas | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| post-grid | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| pricing-table | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| process-steps | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| product-card | typed [real]: source typed: sgs_product_card_builtin_render() (includes/product-card-builtin-render.php); empty [notice]: no product data: empty state (product-card-body + message); readonly-variable [real]: wc-product variable product, configurator unsupported: read-only 'From' card; interactive-variable [real]: wc-product variable product, manifest built, context under 24 KB: interactive variable card; live-default [real]: class product-card--live |
| product-faq | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| product-faq-item | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L46-47 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| product-search | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| quote | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L89-90 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| responsive-logo | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L180-181 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L189-190 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| separator | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| site-footer | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| site-footer-row | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L32-33 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| site-header | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| site-header-row | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L32-33 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| social-icons | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L31-32 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| star-rating | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| store-selector | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L63-64 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| table-of-contents | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L106-107 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L111-112 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L193-194 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| tabs | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L83-84 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| team-member | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| testimonial | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L1042-1043 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| testimonial-slider | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| text | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L148-149 [bailout]: bail-out: returns before printing anything (empty state or guard); early return L164-179 [noparts]: inheritStyle: bare element (block declares no non-root parts) |
| theme-toggle | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L45-51 [notice]: no derived dark palette: nothing, or a comment in the editor |
| timeline | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| trust-bar | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| trustpilot-reviews | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L215-226 [notice]: empty reviews: coming-soon message or nothing |
| whatsapp-cta | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php); early return L99-100 [bailout]: bail-out: returns before printing anything (empty state or guard) |
| wishlist-link | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |
| wishlist-panel | main (fall-through to end of render.php) [real]: main path (fall-through to the end of render.php) |

## Branch ladders inside the main path where a part prints in some branches only

| Block | Part | Class | Branches (Y prints / - not) | Reading |
|---|---|---|---|---|
| brand-strip | logo | `sgs-brand-strip__logo` | - L702-703 `if ( $bs_text_mode )`; Y L704-743 `else ` | text mode vs logo mode, captions on vs off: elements exist only in their mode |
| brand-strip | brand-text | `sgs-brand-strip__brand-text` | Y L702-703 `if ( $bs_text_mode )`; - L704-743 `else ` | text mode vs logo mode, captions on vs off: elements exist only in their mode |
| brand-strip | tile | `sgs-brand-strip__tile` | Y L772-776 `if ( $has_caption )`; - L777-780 `else ` | text mode vs logo mode, captions on vs off: elements exist only in their mode |
| brand-strip | caption | `sgs-brand-strip__name` | Y L772-776 `if ( $has_caption )`; - L777-780 `else ` | text mode vs logo mode, captions on vs off: elements exist only in their mode |
| brand-strip | name | `sgs-brand-strip__name` | Y L772-776 `if ( $has_caption )`; - L777-780 `else ` | text mode vs logo mode, captions on vs off: elements exist only in their mode |
| breadcrumbs | current | `sgs-breadcrumbs__item--current` | Y L503-507 `if ( $is_last )`; - L508-514 `else ` | current item vs linked item |
| business-info | text | `sgs-business-info__text` | Y L169-179 `if ( '' !== $phone_raw )`; - L180-181 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | link | `sgs-business-info__link` | Y L169-179 `if ( '' !== $phone_raw )`; - L180-181 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | text | `sgs-business-info__text` | Y L188-197 `if ( '' !== $email_raw && is_email( $email_raw ) )`; - L198-199 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | link | `sgs-business-info__link` | Y L188-197 `if ( '' !== $email_raw && is_email( $email_raw ) )`; - L198-199 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | text | `sgs-business-info__text` | Y L206-219 `if ( '' !== $address_raw )`; - L220-221 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | link | `sgs-business-info__link` | Y L206-219 `if ( '' !== $address_raw )`; - L220-221 `else ` | an empty field prints the editor placeholder or nothing |
| business-info | hours-row | `sgs-business-hours__row` | - L283-284 `if ( $has_rows )`; Y L285-286 `else ` | an empty field prints the editor placeholder or nothing |
| buybox | guidedMeter | `sgs-buybox-guided__meter` | Y L1070-1103 `if ( $buybox_is_guided )`; - L1103-1221 `else ` | guided parts exist only in guided mode |
| buybox | guidedGroupTitle | `sgs-buybox-guided__group-title` | Y L1070-1103 `if ( $buybox_is_guided )`; - L1103-1221 `else ` | guided parts exist only in guided mode |
| card-grid | glyphInitial | `sgs-card-grid__glyph-initial` | - L139-141 `if ( '' !== $item_glyph_html && ! $glyph_in_caption )`; Y L141-143 `elseif ( '' === $item_glyph_html && $item_use_fallback && ! empty( $it` | glyph vs glyph-initial fallback |
| card-grid | glyph | `sgs-card-grid__glyph` | Y L139-141 `if ( '' !== $item_glyph_html && ! $glyph_in_caption )`; - L141-143 `elseif ( '' === $item_glyph_html && $item_use_fallback && ! empty( $it` | glyph vs glyph-initial fallback |
| gallery | image | `sgs-gallery__img` | - L456-464 `if ( empty( $images ) )`; Y L464-668 `else ` | empty gallery state |
| gallery | caption | `sgs-gallery__caption` | - L456-464 `if ( empty( $images ) )`; Y L464-668 `else ` | empty gallery state |
| gallery | item | `sgs-gallery__item` | - L456-464 `if ( empty( $images ) )`; Y L464-668 `else ` | empty gallery state |
| gallery | img-wrap | `sgs-gallery__img-wrap` | - L456-464 `if ( empty( $images ) )`; Y L464-668 `else ` | empty gallery state |
| gallery | image | `sgs-gallery__img` | - L548-559 `if ( array() !== $sgs_gallery_link )`; Y L559-621 `elseif ( $enable_lightbox )`; - L621-665 `else ` | empty gallery state |
| gallery | image | `sgs-gallery__img` | - L578-596 `if ( 'image' === $img_type && $img_id )`; Y L597-603 `else ` | empty gallery state |
| icon | label | `sgs-icon__label` | Y L628-645 `if ( '' !== $link_url )`; - L646-648 `elseif ( $has_label )`; - L649-652 `elseif ( '' !== $aria_label && ! $group['in_group'] )` | see proven icon:label |
| icon-list | item-link | `sgs-icon-list__item-link` | Y L737-754 `if ( $item_url )`; - L755-756 `else ` | item link only with a URL; heading only with a wrapper |
| icon-list | heading | `sgs-icon-list__heading` | Y L789-820 `if ( $needs_wrapper )`; - L821-832 `else ` | item link only with a URL; heading only with a wrapper |
| language-switch | separator | `sgs-language-switch__separator` | - L212-235 `if ( 'single-link' === $display )`; - L236-272 `elseif ( 'disclosure' === $display )`; Y L273-292 `else ` | separator only in list display |
| notice-banner | arrows | `sgs-notice-banner__arrows` | Y L488-511 `if ( $sgs_nb_enhanced )`; - L512-513 `else ` | arrows only in enhanced rotate mode |
| option-picker | label | `sgs-option-picker__label` | Y L706-711 `if ( $show_label )`; - L712-717 `else ` | label hidden (sgs-sr-only legend) when showLabel is off |
| post-grid | card | `sgs-post-grid__card` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | image | `sgs-post-grid__image` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | title | `sgs-post-grid__title` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | excerpt | `sgs-post-grid__excerpt` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | meta | `sgs-post-grid__meta` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | category-badge | `sgs-post-grid__category-badge` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| post-grid | read-more | `sgs-post-grid__readmore` | Y L84-99 `if ( $query->have_posts() )`; - L100-105 `else ` | empty query state |
| product-card | priceFromLabel | `sgs-product-card__price-from-label` | Y L1132-1137 `if ( ! empty( $data['price_from_html'] ) )`; - L1137-1139 `elseif ( ! empty( $data['price_html'] ) )` | no-photo label only without a real image |
| product-card | title | `sgs-product-card__title` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | wishlist | `sgs-product-card__wishlist` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | rrp | `sgs-product-card__rrp` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | desc | `sgs-product-card__description` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | description | `sgs-product-card__description` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | priceNote | `sgs-product-card__price-note` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | price-note | `sgs-product-card__price-note` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | tag | `sgs-product-card__tag` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | rating | `sgs-product-card__rating` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | brand | `sgs-product-card__brand` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | savingBadge | `sgs-product-card__saving-badge` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | swatch | `sgs-product-card__swatch` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | attributeTag | `sgs-product-card__attribute-tag` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | ratingStars | `sgs-product-card__rating-stars` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | swatchMore | `sgs-product-card__swatch-more` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | cta2 | `sgs-product-card__cta--secondary` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | noImageLabel | `product-card__no-image-label` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | valueLadder | `product-card__value-ladder` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | priceRow | `sgs-product-card__price-row` | - L1338-1340 `if ( strlen( wp_json_encode( $context ) ) > 24576 )`; Y L1341-1819 `else ` | no-photo label only without a real image |
| product-card | noImageLabel | `product-card__no-image-label` | - L1504-1524 `if ( $sgs_has_real_image )`; Y L1524-1526 `else ` | no-photo label only without a real image |
| product-card | noImageLabel | `product-card__no-image-label` | - L1928-1947 `if ( $sgs_has_real_image )`; Y L1947-1949 `else ` | no-photo label only without a real image |
| product-card | priceFromLabel | `sgs-product-card__price-from-label` | Y L2067-2073 `if ( ! empty( $data['is_variable'] ) && ! empty( $data['price_from_htm`; - L2073-2077 `else ` | no-photo label only without a real image |
| separator | content | `sgs-separator__content` | - L317-345 `if ( 'icon' === $content_mode )`; Y L346-387 `elseif ( 'text' === $content_mode )` | icon part exists only in icon mode (the content part is the proven defect) |
| separator | icon | `sgs-separator__icon` | Y L317-345 `if ( 'icon' === $content_mode )`; - L346-387 `elseif ( 'text' === $content_mode )` | icon part exists only in icon mode (the content part is the proven defect) |
| star-rating | star-empty | `sgs-star-rating__star--empty` | - L315-322 `if ( $i <= floor( $rating ) )`; - L323-337 `elseif ( $i === ceil( $rating ) && fmod( $rating, 1 ) >= 0.25 )`; Y L338-345 `else ` | empty star only for unfilled positions |
| theme-toggle | label | `sgs-theme-toggle__label` | Y L279-291 `if ( 'switch' === $toggle_style )`; - L292-310 `else ` | see suspected |
| theme-toggle | icon | `sgs-theme-toggle__icon` | Y L279-291 `if ( 'switch' === $toggle_style )`; - L292-310 `else ` | see suspected |
| whatsapp-cta | card-title | `sgs-whatsapp-cta__card-title` | Y L421-423 `if ( 'card' === $variant )`; - L423-432 `else ` | card title and sub-line only in the card variant |
| whatsapp-cta | card-subline | `sgs-whatsapp-cta__card-subline` | Y L421-423 `if ( 'card' === $variant )`; - L423-432 `else ` | card title and sub-line only in the card variant |
