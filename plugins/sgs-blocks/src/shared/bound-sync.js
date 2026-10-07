/**
 * @sgs/bound-sync — bound values follow the variation the shopper picks.
 *
 * Plain ES module, no @wordpress/interactivity import. sgs/product-card's
 * store (view.js::dispatchVariationChange) announces every resolved
 * combination as a window-level `sgs-variation-change` CustomEvent whose
 * detail carries `{ productId, variationId, attributes: { [taxonomy]: slug } }`.
 * This module swaps the text of every `.sgs-bound` span scoped to that
 * product, using the per-variation values the server published through core's
 * script-module data channel (includes/class-product-field-variations.php).
 *
 * Only the span's text changes, so the block around it (an icon, a link, an
 * input) is never touched. An unavailable combination dispatches nothing, so
 * the last valid size's values stay. A value that is empty for the picked
 * variation hides its span (`data-sgs-bound-empty`); the server-rendered value
 * stands when this script never runs.
 */

const SOURCE = 'sgs-product/field';

/**
 * Read the data core printed for this module.
 *
 * @return {Object} The published sources, or an empty object.
 */
function readData() {
	const node = document.getElementById(
		'wp-script-module-data-@sgs/bound-sync'
	);
	if ( ! node ) {
		return {};
	}
	try {
		return JSON.parse( node.textContent || '{}' );
	} catch ( error ) {
		return {};
	}
}

const DATA = readData();

/**
 * Restart the short value-change fade (CSS runs it only without a
 * reduced-motion preference).
 *
 * @param {HTMLElement} el The bound span.
 */
function markChanged( el ) {
	el.removeAttribute( 'data-sgs-bound-changed' );
	// Reading layout commits the removal, so setting it again restarts the animation.
	void el.offsetWidth;
	el.setAttribute( 'data-sgs-bound-changed', '' );
}

/**
 * The value a bound key takes for the announced variation.
 *
 * @param {Object} entry       The product's published entry.
 * @param {string} key         The bound field key.
 * @param {number} variationId The announced variation.
 * @param {Object} attributes  The announced `{ taxonomy: slug }` map.
 * @return {string|undefined} The value, or undefined to leave the span as it is.
 */
function valueFor( entry, key, variationId, attributes ) {
	if ( key.startsWith( 'attribute.' ) ) {
		const taxonomy = key.slice( 'attribute.'.length );
		const slug = attributes ? attributes[ taxonomy ] : undefined;
		return slug !== undefined && entry.labels?.[ taxonomy ]
			? entry.labels[ taxonomy ][ slug ]
			: undefined;
	}
	const row = entry.values?.[ String( variationId ) ];
	return row && Object.prototype.hasOwnProperty.call( row, key )
		? row[ key ]
		: undefined;
}

/**
 * Handle a `sgs-variation-change` event.
 *
 * @param {CustomEvent} event
 */
function handleVariationChange( event ) {
	const productId = event?.detail?.productId;
	const variationId = event?.detail?.variationId;
	if ( ! productId || ! variationId ) {
		return;
	}
	const entry = DATA?.sources?.[ SOURCE ]?.[ String( productId ) ];
	if ( ! entry ) {
		return;
	}
	const attributes = event.detail.attributes || {};

	document
		.querySelectorAll(
			`.sgs-bound[data-sgs-bound-source="${ SOURCE }"][data-sgs-bound-scope="${ productId }"]`
		)
		.forEach( ( el ) => {
			const next = valueFor(
				entry,
				el.getAttribute( 'data-sgs-bound-key' ) || '',
				variationId,
				attributes
			);
			if ( next === undefined ) {
				return;
			}
			if ( '' === next ) {
				el.setAttribute( 'data-sgs-bound-empty', '' );
				return;
			}
			el.removeAttribute( 'data-sgs-bound-empty' );
			if ( el.textContent !== next ) {
				el.textContent = next;
				markChanged( el );
			}
		} );
}

document.addEventListener( 'animationend', ( event ) => {
	if ( event.target?.hasAttribute?.( 'data-sgs-bound-changed' ) ) {
		event.target.removeAttribute( 'data-sgs-bound-changed' );
	}
} );

window.addEventListener( 'sgs-variation-change', handleVariationChange );
