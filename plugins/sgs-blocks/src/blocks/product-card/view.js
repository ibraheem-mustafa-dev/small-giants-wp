/**
 * SGS Product Card — Bound-mode frontend interactivity (viewScriptModule).
 *
 * Powers the Interactivity API store for the Bound product card:
 *   - Reactive price / image / stock swapping when the visitor picks an option
 *     pill — reading ONLY the seeded per-instance data-wp-context manifest
 *     (U3). Zero network requests on pill change; all variation data is already
 *     in the page.
 *   - Add-to-cart via the WooCommerce Store API (no jQuery, no wc-blocks
 *     bundle). Cart XHR is confined to addToCart only.
 *
 * Pill-event bridge (U4): the pill block (sgs/option-picker) dispatches a
 * bubbling DOM event on change:
 *   type   : 'sgs:option-selected'
 *   detail : { typeKey (taxonomy, e.g. "pa_size"), selectedKey (term slug) }
 *
 * That event name contains a colon, which the WP Interactivity `data-wp-on--`
 * directive parser does NOT bind (verified live — the listener is silently
 * skipped). So instead of a `data-wp-on--sgs:option-selected` directive, the
 * card uses `data-wp-init="callbacks.initPillBridge"` to capture its reactive
 * context once and attach a plain `addEventListener` for the colon event. The
 * captured context is the live Interactivity proxy, so mutating its keys in the
 * listener still drives the reactive bindings — and the shared option-picker
 * block keeps its documented `sgs:option-selected` contract unchanged.
 *
 * Context shape (per card instance, seeded server-side by render.php via
 * wp_interactivity_data_wp_context — U3 manifest):
 *
 *   productId          {string}   WC product ID
 *   addToCartId        {number}   variation ID used by addToCart (U7 rewires)
 *   decimals           {number}   currency decimal places (default 2)
 *   currencySymbol     {string}   e.g. "£"
 *   combos             {Object}   keyed by comboKey → variation data
 *                                   { variationId, priceMinor, regularMinor,
 *                                     saleMinor|null, pctOff, inStock, imageUrl }
 *   axes               {Array}    [{ taxonomy, label, terms:[{slug,label}] }]
 *   selectedAxes       {Object}   { [taxonomy]: slug } — current selections
 *   selectedKey        {string}   current comboKey (sorted "tax:slug|…")
 *   selectedVariationId{number}
 *   priceDisplay       {string}   e.g. "£9.99"
 *   regularDisplay     {string}   struck-through regular price (on-sale only)
 *   pctDisplay         {string}   e.g. "20% off" (empty when not on sale)
 *   showSale           {boolean}  true when variation is on sale
 *   hideSale           {boolean}  !showSale
 *   inStock            {boolean}
 *   stockText          {string}   e.g. "Out of stock" (empty when in stock)
 *   imageSrc           {string}
 *   imageAlt           {string}
 *   cartStatus         {string}   user-facing cart feedback string
 *   pending            {boolean}  true while addToCart XHR is in flight
 *
 * comboKey format (MUST match server exactly):
 *   {taxonomy}:{slug} pairs sorted ASCENDING by taxonomy, joined with "|"
 *   e.g. "pa_flavour:vanilla|pa_size:12-pack"
 *
 * No state mutation occurs for typed-mode cards — they carry no
 * data-wp-interactive attribute so this store never binds to them.
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Module-level WeakMap: ctx → card ref.
 *
 * Keyed by the live Interactivity context proxy so that addToCart (which has
 * ctx but not ref) can retrieve the card element for a post-409 re-grey call.
 *
 * @type {WeakMap<Object, Element>}
 */
const cardRefByCtx = new WeakMap();

/**
 * Determine whether a term on a given axis has at least one in-stock combo
 * given the current selections on all OTHER axes (general case, ≥2 axes).
 *
 * A term V on axis A is available iff there exists an in-stock combo where
 * A = V AND every OTHER currently-selected axis matches its selection.
 *
 * @param {Object} combos       Combo map keyed by comboKey → { inStock, … }.
 * @param {string} axisTax      The taxonomy slug of the axis being tested.
 * @param {string} termSlug     The term slug being tested.
 * @param {Object} selectedAxes Current selections: { [taxonomy]: slug }.
 * @return {boolean}            True if at least one in-stock combo exists.
 */
function isTermAvailable( combos, axisTax, termSlug, selectedAxes ) {
	for ( const key in combos ) {
		if ( ! combos[ key ].inStock ) {
			continue;
		}
		// Parse the comboKey into a map { taxonomy: slug, … }.
		const map = {};
		for ( const part of key.split( '|' ) ) {
			const idx = part.indexOf( ':' );
			map[ part.slice( 0, idx ) ] = part.slice( idx + 1 );
		}
		// This combo must match the axis being tested.
		if ( map[ axisTax ] !== termSlug ) {
			continue;
		}
		// All OTHER selected axes must match too.
		let ok = true;
		for ( const tax in selectedAxes ) {
			if ( tax === axisTax ) {
				continue;
			}
			if ( map[ tax ] !== selectedAxes[ tax ] ) {
				ok = false;
				break;
			}
		}
		if ( ok ) {
			return true;
		}
	}
	return false;
}

/**
 * Apply cross-attribute availability greying to the option-picker DOM inside
 * a card. Marks unavailable options with aria-disabled + a CSS class; removes
 * the marks from available options. Announces changes via ctx.availabilityNote.
 *
 * The function reaches INTO the rendered sgs/option-picker DOM from the card
 * scope — it never edits the shared option-picker block file (scope guardrail,
 * blub.db 304). Native `disabled` is never set (FR-27-B1: options must remain
 * focusable + announced by screen-readers).
 *
 * @param {Element} ref    The card root element (.product-card--bound).
 * @param {Object}  ctx    The card's live Interactivity context proxy.
 * @param {boolean} isInit True on the first paint; suppresses the live-region
 *                         announcement so the page-load is not chatty.
 */
function applyAvailability( ref, ctx, isInit ) {
	if ( ! ctx.combos || ! Array.isArray( ctx.axes ) ) {
		return;
	}

	let totalUnavailable = 0;

	// Each sgs/option-picker renders a wrapper with data-type-key (the taxonomy).
	const pickerWrappers = ref.querySelectorAll(
		'.sgs-option-picker__options[data-type-key]'
	);

	pickerWrappers.forEach( ( optionsDiv ) => {
		const tax = optionsDiv.dataset.typeKey;
		// Find the axis definition matching this picker.
		const axis = ctx.axes.find( ( a ) => a.taxonomy === tax );
		if ( ! axis ) {
			return;
		}

		for ( const term of axis.terms ) {
			const avail = isTermAvailable(
				ctx.combos,
				tax,
				term.slug,
				ctx.selectedAxes
			);

			// Locate the radio input by its value; use CSS.escape so slugs with
			// special characters (hyphens, numbers) are handled safely.
			const input = optionsDiv.querySelector(
				'input[value="' + CSS.escape( term.slug ) + '"]'
			);
			if ( ! input ) {
				continue;
			}

			const label = input.closest( '.sgs-option-picker__option' );
			if ( ! label ) {
				continue;
			}

			if ( avail ) {
				label.classList.remove( 'sgs-option-picker__option--unavailable' );
				label.removeAttribute( 'aria-disabled' );
				// Remove the aria-label override if it was previously set.
				if ( input.dataset.sgsOriginalLabel !== undefined ) {
					input.setAttribute( 'aria-label', input.dataset.sgsOriginalLabel );
					delete input.dataset.sgsOriginalLabel;
				} else {
					input.removeAttribute( 'aria-label' );
				}
			} else {
				label.classList.add( 'sgs-option-picker__option--unavailable' );
				label.setAttribute( 'aria-disabled', 'true' );
				// Preserve original aria-label once so we can restore it.
				if ( input.dataset.sgsOriginalLabel === undefined ) {
					const original = input.getAttribute( 'aria-label' );
					if ( original ) {
						input.dataset.sgsOriginalLabel = original;
					}
				}
				input.setAttribute(
					'aria-label',
					term.label + ' (unavailable)'
				);
				totalUnavailable++;
			}
		}
	} );

	// Update the polite live region (suppressed on init to avoid page-load noise).
	if ( isInit ) {
		ctx.availabilityNote = '';
	} else {
		ctx.availabilityNote =
			totalUnavailable > 0
				? 'Some options are unavailable for this selection.'
				: '';
	}
}

/**
 * Resolve the WooCommerce Store API base URL.
 *
 * @return {string} Base REST URL with no trailing slash.
 */
function getStoreApiBase() {
	const wpRoot =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		'/wp-json';
	return wpRoot.replace( /\/$/, '' );
}

/**
 * Format a minor-unit integer (e.g. 999 → "£9.99") using the card's
 * currency settings from context.
 *
 * Thousands-grouping follows the browser locale — for prices >= the thousands
 * boundary this may differ slightly from WC's server format. Acceptable for
 * Phase 1: all Mama's prices are < £100. The cart price is always
 * server-authoritative.
 *
 * @param {number} minor Amount in minor currency units (pence).
 * @param {Object} ctx   The card's Interactivity API context object.
 * @return {string}      Formatted price string, e.g. "£9.99".
 */
function formatPrice( minor, ctx ) {
	const decimals = typeof ctx.decimals === 'number' ? ctx.decimals : 2;
	const amount = ( minor / Math.pow( 10, decimals ) ).toLocaleString(
		undefined,
		{
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}
	);
	return ( ctx.currencySymbol || '' ) + amount;
}

/**
 * The current-price display string for a combo under the card's tax-display mode
 * (TAX-UI). Mirrors the PHP sgs_configurator_mode_price() so the swap value ==
 * the SSR literal.
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} ctx   The card's live context (taxDisplayMode / priceSuffix / vatLabel).
 * @return {string}
 */
function modePrice( combo, ctx ) {
	let mode = ctx.taxDisplayMode || 'auto';
	// Defensive: a pre-v2 cached manifest (e.g. full-page-cached HTML seeded
	// before the deploy) lacks the ex/tax fields — degrade to the display price
	// rather than render "£NaN".
	if ( mode === 'ex-plus-vat' && ( combo.exMinor == null || combo.taxMinor == null ) ) {
		mode = 'auto';
	}
	if ( mode === 'ex-plus-vat' ) {
		let out = formatPrice( combo.exMinor, ctx );
		if ( combo.taxMinor && combo.taxMinor > 0 ) {
			out += ' + ' + formatPrice( combo.taxMinor, ctx ) + ' ' + ( ctx.vatLabel || 'VAT' );
		}
		return out;
	}
	if ( mode === 'inc-suffix' && ctx.priceSuffix ) {
		return formatPrice( combo.priceMinor, ctx ) + ' ' + ctx.priceSuffix;
	}
	return formatPrice( combo.priceMinor, ctx );
}

/**
 * The struck-through regular-price display string for a combo under the tax mode.
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} ctx   The card's live context.
 * @return {string}
 */
function modeRegular( combo, ctx ) {
	// Use the ex-VAT regular only in ex-plus-vat mode AND when the field exists
	// (pre-v2 cached manifests lack it — fall back to the display regular).
	const exMode =
		( ctx.taxDisplayMode || 'auto' ) === 'ex-plus-vat' &&
		combo.regularExMinor != null;
	return formatPrice( exMode ? combo.regularExMinor : combo.regularMinor, ctx );
}

/**
 * Per-unit price string for a combo, e.g. "£1.04 per bar". Mirrors PHP
 * sgs_configurator_per_unit_display() so the swap value == the SSR literal.
 * Returns '' when the combo has no divisor (>0) or no unit label.
 *
 * Locale note: the amount is formatted via formatPrice() (toLocaleString) — the
 * same accepted Phase-1 trade-off as the headline price (see line 232); a non-UK
 * browser locale could differ from PHP's wc_price() separator. Per-unit amounts
 * are well below the thousands boundary so only the decimal separator is at risk.
 * The template uses split('%s').join() — NOT replace — to match PHP sprintf()'s
 * replace-all behaviour (the template must use non-positional %s).
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} ctx   The card's live context.
 * @return {string}
 */
function perUnitDisplay( combo, ctx ) {
	const divisor = typeof combo.unitDivisor === 'number' ? combo.unitDivisor : parseFloat( combo.unitDivisor ) || 0;
	const label = combo.unitLabel || '';
	if ( divisor <= 0 || label === '' ) {
		return '';
	}
	const mode = ctx.taxDisplayMode || 'auto';
	const base = ( mode === 'ex-plus-vat' && combo.exMinor != null ) ? combo.exMinor : combo.priceMinor;
	const perUnitMinor = Math.round( base / divisor );
	const template = ctx.perUnitTemplate || 'per %s';
	return formatPrice( perUnitMinor, ctx ) + ' ' + template.split( '%s' ).join( label );
}

/**
 * Apply a pill selection to the card's seeded context (multi-axis, SSR-safe).
 *
 * Mutates the seeded display keys on the live Interactivity proxy so the
 * data-wp-text / data-wp-bind directives re-render. Every key written here is a
 * plain seeded data key (never a JS getter) — a getter would resolve empty
 * server-side and wipe the SSR value.
 *
 * @param {Object} ctx    The card's live Interactivity context proxy.
 * @param {Object} detail The sgs:option-selected event detail { typeKey, selectedKey }.
 */
function applyPillSelection( ctx, detail ) {
	const typeKey = detail?.typeKey;
	const key = detail?.selectedKey;

	if (
		typeof typeKey !== 'string' || typeKey === '' ||
		typeof key !== 'string' || key === ''
	) {
		return;
	}

	// Simple / CPT card carries no manifest — nothing to swap.
	if ( ! ctx.combos ) {
		return;
	}

	// Update the selected axis immutably so the proxy detects the reference
	// change, then build the comboKey: taxonomy:slug pairs sorted ascending by
	// taxonomy, joined with "|". Must match the server format exactly.
	ctx.selectedAxes = { ...ctx.selectedAxes, [ typeKey ]: key };
	const comboKey = Object.keys( ctx.selectedAxes )
		.sort()
		.map( ( t ) => t + ':' + ctx.selectedAxes[ t ] )
		.join( '|' );

	const combo = ctx.combos[ comboKey ];

	if ( combo ) {
		// Valid combination — update all display keys.
		ctx.selectedKey = comboKey;
		ctx.selectedVariationId = combo.variationId;

		ctx.priceDisplay = modePrice( combo, ctx );

		const onSale =
			combo.saleMinor !== null && combo.saleMinor !== undefined;
		ctx.showSale = onSale;
		ctx.hideSale = ! onSale;
		ctx.regularDisplay = onSale ? modeRegular( combo, ctx ) : '';
		// Prefer the server-translated per-combo label (SSR==swap i18n parity);
		// fall back to the English recompute only if absent.
		ctx.pctDisplay =
			combo.pctDisplay != null
				? combo.pctDisplay
				: combo.pctOff > 0
				? combo.pctOff + '% off'
				: '';

		ctx.inStock = !! combo.inStock;
		ctx.stockText = combo.inStock ? '' : 'Out of stock';

		// M-C7: leave the current image if the variation has none.
		if ( combo.imageUrl ) {
			ctx.imageSrc = combo.imageUrl;
		}

		// B3: per-unit note + discount badge (FR-27-B3).
		// perUnitDisplay() mirrors PHP sgs_configurator_per_unit_display() exactly
		// so the swap value is byte-identical to the SSR literal (SSR==swap parity).
		const puDisplay = perUnitDisplay( combo, ctx );
		ctx.perUnitDisplay = puDisplay;
		ctx.perUnitHidden = puDisplay === '';
		ctx.discountLabel = combo.discountLabel || '';
		ctx.discountHidden = ! ctx.discountLabel;
	} else {
		// Invalid/unavailable combination (U5 will pre-grey these pills).
		// Set a safe non-purchasable state; do not touch price or image.
		ctx.selectedVariationId = 0;
		ctx.inStock = false;
		ctx.stockText = 'Unavailable';
		// B3: hide per-unit and discount badge when no valid combo is selected.
		ctx.perUnitDisplay = '';
		ctx.perUnitHidden = true;
		ctx.discountLabel = '';
		ctx.discountHidden = true;
	}
}

store( 'sgs/product-card', {
	callbacks: {
		/**
		 * Bridge the option-picker's `sgs:option-selected` custom event to the
		 * store. Runs once per card via data-wp-init. Captures the live context
		 * proxy and the card element, then listens for the bubbling pill event
		 * (the colon in the event name prevents a data-wp-on directive binding).
		 *
		 * Also stores the card ref in the module WeakMap (keyed by ctx) so
		 * addToCart can retrieve it for the post-409 availability re-sync, and
		 * runs an initial availability pass (isInit=true, no announcement).
		 */
		initPillBridge() {
			const { ref } = getElement();
			if ( ! ref || ref.dataset.sgsPillBridge === '1' ) {
				return;
			}
			ref.dataset.sgsPillBridge = '1';

			const ctx = getContext();

			// Store the ref so the 409 re-sync path in addToCart can retrieve it.
			cardRefByCtx.set( ctx, ref );

			// Initial availability pass — no announcement on first paint.
			applyAvailability( ref, ctx, true );

			ref.addEventListener( 'sgs:option-selected', ( event ) => {
				applyPillSelection( ctx, event.detail );
				// Re-compute and announce availability after each selection.
				applyAvailability( ref, ctx, false );
			} );
		},
	},
	actions: {
		/**
		 * Add the selected product variation (or simple product) to the cart via
		 * the SGS secure proxy POST /sgs/v1/cart/add-item. Never posts to the WC
		 * Store API directly — all price/stock/IDOR validation is server-side.
		 *
		 * Wire format (M-C2, verified live on WC 10.8.1):
		 *   POST /sgs/v1/cart/add-item
		 *   Header: X-WP-Nonce: <wp_rest nonce seeded into ctx.restNonce>
		 *   Body:   { id: <variationId|productId>, quantity: 1,
		 *             variation: [{ attribute: "Size", value: "12-pack" }, …] }
		 *   `attribute` = WC display name (axis.label); `value` = term slug.
		 *   `id`        = selected variation ID for variable products; parent
		 *                 product ID for simple / CPT products.
		 *   No price is ever sent — the proxy is the sole authority.
		 *
		 * A3 + U9: the control is a real <button type="submit"> inside a
		 * <form action=permalink> (native button = Space+Enter; WCAG 2.1.1).
		 * With no JS the form submits to the product page (graceful fallback).
		 * This action is bound to the form's submit event; it calls
		 * event.preventDefault() to stop that navigation and handles the cart
		 * add via the secure proxy instead.
		 *
		 * A4: Guarded by context.pending to prevent spam clicks. Sets pending=true
		 * before any async work and clears it in the finally clause regardless of
		 * outcome. The <a> is disabled + aria-busy while pending via data-wp-bind.
		 *
		 * Generator action: the Interactivity API awaits yielded promises.
		 *
		 * @param {Event} event The submit event from the <form> element.
		 */
		*addToCart( event ) {
			// A3/U9: prevent the no-JS form submission (page navigation) when JS
			// is active so the add is handled by the secure proxy instead.
			if ( event && typeof event.preventDefault === 'function' ) {
				event.preventDefault();
			}

			const ctx = getContext();

			// Resolve the correct ID to send:
			//   variable product → selected variation ID
			//   simple / CPT    → parent product ID (addToCartId)
			const variationId = parseInt( ctx.selectedVariationId, 10 ) || 0;
			const parentId    = parseInt( ctx.addToCartId, 10 ) || 0;
			const id          = variationId > 0 ? variationId : parentId;

			if ( ! id ) {
				return;
			}

			// A4: spam guard — bail immediately if a request is already in flight.
			if ( ctx.pending ) {
				return;
			}

			ctx.cartStatus = '';
			ctx.pending    = true;

			try {
				// Build the variation array using WC display names + term slugs
				// (M-C2 wire format). Only populated for variable products.
				const variation = [];
				if ( variationId > 0 && Array.isArray( ctx.axes ) && ctx.selectedAxes ) {
					for ( const axis of ctx.axes ) {
						const slug = ctx.selectedAxes[ axis.taxonomy ];
						if ( slug ) {
							variation.push( { attribute: axis.label, value: slug } );
						}
					}
				}

				const body = { id, quantity: 1 };
				if ( variation.length ) {
					body.variation = variation;
				}

				const response = yield fetch(
					getStoreApiBase() + '/sgs/v1/cart/add-item',
					{
						method: 'POST',
						credentials: 'same-origin',
						headers: {
							'Content-Type': 'application/json',
							'X-WP-Nonce': ctx.restNonce || '',
						},
						body: JSON.stringify( body ),
					}
				);

				if ( ! response.ok ) {
					let msg = 'Sorry, this item could not be added to your basket.';
					try {
						const j = yield response.json();
						if ( j && j.message ) {
							msg = j.message;
						}
					} catch {
						// Ignore parse errors — use the default message above.
					}
					ctx.cartStatus = msg;

					// 409 = out of stock (post-load race). Re-fetch the availability
					// manifest and re-grey the options. The WeakMap keyed by ctx gives
					// us the card element without a DOM query dependency.
					if ( response.status === 409 && ctx.productId ) {
						try {
							const avRes = yield fetch(
								getStoreApiBase() +
									'/sgs/v1/cart/availability/' +
									encodeURIComponent( ctx.productId ),
								{
									method: 'GET',
									credentials: 'same-origin',
									headers: {
										'X-WP-Nonce': ctx.restNonce || '',
									},
								}
							);
							if ( avRes.ok ) {
								const avData = yield avRes.json();
								if ( avData && avData.combos ) {
									// Merge the fresh inStock flags into the existing
									// full combos — the availability endpoint returns
									// inStock ONLY (no prices), so a wholesale replace
									// would strip priceMinor/etc and break later swaps.
									// Iterate ctx.combos (not the response): a combo
									// ABSENT from the fresh response no longer exists/
									// sells → mark it OOS so it greys + cannot be
									// re-selected (avoids an infinite-409 loop on a
									// hard-removed variation).
									for ( const key in ctx.combos ) {
										ctx.combos[ key ].inStock =
											key in avData.combos
												? !! avData.combos[ key ].inStock
												: false;
									}
									const cardRef = cardRefByCtx.get( ctx );
									if ( cardRef ) {
										applyAvailability( cardRef, ctx, false );
									}
									// Refresh the SELECTED combo's stock slot (top-level
									// writes the proxy observes) so it stays consistent
									// with the freshly-greyed pills.
									const currentCombo =
										ctx.combos[ ctx.selectedKey ];
									if ( currentCombo && ! currentCombo.inStock ) {
										ctx.inStock = false;
										ctx.stockText = 'Out of stock';
									}
									ctx.availabilityNote =
										'That combination just sold out.';
								}
							}
						} catch {
							// Availability refresh is best-effort; do not surface
							// the refresh failure on top of the cart error.
						}
					}

					return;
				}

				ctx.cartStatus = 'Added to your basket.';

				// Notify the sgs/cart badge to re-fetch the authoritative count.
				// WC fires this itself when its own blocks are present; we dispatch
				// it unconditionally so the badge updates even on a WC-block-free page.
				document.dispatchEvent(
					new CustomEvent( 'wc-blocks_added_to_cart' )
				);
			} catch {
				ctx.cartStatus =
					'Sorry, something went wrong adding this item.';
			} finally {
				// A4: always clear pending so the button re-enables after the request.
				ctx.pending = false;
			}
		},
	},
} );
