/**
 * SGS Choice Flow — client-side variation resolution (Spec 43 FR-43-10).
 *
 * A product-option step in `variation` mode (FR-43-10a) lets a shopper pick
 * one term per variation-forming attribute inside the flow, instead of on a
 * page buybox. This module accumulates picks per flow instance and, once
 * every variation-mode attribute has a choice, resolves the exact WooCommerce
 * variation from the combo map the root block seeds (`data-flow-combos` —
 * `includes/choice-flow-variation-seed.php`; keyed exactly as
 * `Product_Manifest::build()`'s `\ksort( $key_parts )` step: taxonomy
 * ascending, `tax:slug` joined by `|`, mirrored here as `Object.keys().sort()`).
 *
 * State lives in this module's own `WeakMap`. Once a variation resolves,
 * this calls `pricing.js`'s `setFlowVariationBase()`, which takes precedence
 * over a page buybox's `sgs-variation-change` event.
 *
 * @package SGS\Blocks
 */

import { setFlowVariationBase } from './pricing.js';

const FLOW_COMBOS_ATTR = 'data-flow-combos';
const FLOW_PRODUCT_ID_ATTR = 'data-flow-product-id';

/**
 * @typedef {Object} ComboEntry One entry in a parsed `data-flow-combos` map.
 * @property {number} v Variation ID.
 * @property {number} p Price, minor currency units.
 * @property {0|1}    s In-stock flag.
 *
 * @typedef {Object} VariationChoice
 * @property {string} slug      Chosen term slug.
 * @property {number} stepIndex Step the choice was made on (-1 if unknown).
 *
 * @typedef {Object} FlowVariationState
 * @property {number}                       productId The flow's resolved product.
 * @property {Object<string, ComboEntry>}   combos    Parsed `data-flow-combos`.
 * @property {Set<string>}                  required  Taxonomies the combo map covers.
 * @property {Map<string, VariationChoice>} choices   This path's picks, keyed by taxonomy.
 * @property {{productId: number, variationId: number, attributes: Object<string, string>, priceMinor: number}|null} resolved
 *           Fully-resolved variation, or null until every required taxonomy has a choice.
 */

/** @type {WeakMap<HTMLElement, FlowVariationState>} Per-flow-instance variation state. */
const variationState = new WeakMap();

/**
 * Parse a flow root's `data-flow-combos` JSON. Absent/empty/malformed all
 * resolve to `{}` — a non-variation flow never has this attribute (§2).
 *
 * @param {HTMLElement} flowEl Flow wrapper element.
 * @return {Object<string, ComboEntry>} Parsed combo map.
 */
function parseCombos( flowEl ) {
	const raw = flowEl.getAttribute( FLOW_COMBOS_ATTR );
	if ( ! raw ) {
		return {};
	}
	try {
		const parsed = JSON.parse( raw );
		return parsed && 'object' === typeof parsed ? parsed : {};
	} catch ( _e ) {
		return {};
	}
}

/**
 * The distinct taxonomies across every combo key — attributes needing a
 * choice before a combo can resolve.
 *
 * @param {Object<string, ComboEntry>} combos Parsed combo map.
 * @return {Set<string>} Taxonomy names (e.g. `pa_size`).
 */
function deriveRequiredTaxonomies( combos ) {
	const required = new Set();
	Object.keys( combos ).forEach( ( key ) => {
		key.split( '|' ).forEach( ( part ) => {
			const colonAt = part.indexOf( ':' );
			if ( colonAt > 0 ) {
				required.add( part.slice( 0, colonAt ) );
			}
		} );
	} );
	return required;
}

/**
 * Build the combo-map lookup key for a set of taxonomy → slug choices.
 *
 * @param {Map<string, VariationChoice>} choices This path's picks.
 * @return {string} Combo-map key.
 */
function buildComboKey( choices ) {
	return Array.from( choices.keys() )
		.sort()
		.map( ( taxonomy ) => `${ taxonomy }:${ choices.get( taxonomy ).slug }` )
		.join( '|' );
}

/**
 * Ensure a flow instance has variation state, parsed on first call.
 * @param {HTMLElement} flowEl Flow wrapper element.
 * @return {FlowVariationState} This instance's state.
 */
function ensureState( flowEl ) {
	if ( ! variationState.has( flowEl ) ) {
		const combos = parseCombos( flowEl );
		variationState.set( flowEl, {
			productId: parseInt( flowEl.getAttribute( FLOW_PRODUCT_ID_ATTR ), 10 ) || 0,
			combos,
			required: deriveRequiredTaxonomies( combos ),
			choices: new Map(),
			resolved: null,
		} );
	}
	return variationState.get( flowEl );
}

/**
 * Initialise a flow instance's variation state. Called from `view.js`'s
 * `initFlow()`, alongside `initPricePanel()`.
 *
 * @param {HTMLElement} flowEl Flow wrapper element.
 */
export function initVariation( flowEl ) {
	ensureState( flowEl );
}

/**
 * Attempt to resolve the flow's variation. Sets `state.resolved`, dispatches
 * `sgs-flow-variation-change` on the flow root, and overlays the pricing
 * base via `pricing.js`'s `setFlowVariationBase()`. A no-op when a required
 * taxonomy has no choice yet, or the combo key isn't in the map.
 *
 * @param {HTMLElement} flowEl Flow wrapper element.
 */
function tryResolve( flowEl ) {
	const state = ensureState( flowEl );

	if ( state.required.size === 0 || state.choices.size < state.required.size ) {
		state.resolved = null;
		return;
	}
	for ( const taxonomy of state.required ) {
		if ( ! state.choices.has( taxonomy ) ) {
			state.resolved = null;
			return;
		}
	}

	const combo = state.combos[ buildComboKey( state.choices ) ];
	if ( ! combo ) {
		state.resolved = null;
		return;
	}

	/** @type {Object<string, string>} */
	const attributes = {};
	state.choices.forEach( ( choice, taxonomy ) => {
		attributes[ taxonomy ] = choice.slug;
	} );

	state.resolved = { productId: state.productId, variationId: combo.v, attributes, priceMinor: combo.p };

	flowEl.dispatchEvent(
		new CustomEvent( 'sgs-flow-variation-change', {
			bubbles: true,
			detail: { flowEl, ...state.resolved },
		} )
	);

	setFlowVariationBase( flowEl, state.resolved );
}

/**
 * Record a variation-mode product-option choice (FR-43-10a) and attempt to
 * resolve the flow's variation. Called via `handleProductOptionClick()`.
 *
 * @param {HTMLElement} flowEl      Flow wrapper element.
 * @param {string}      taxonomy    The `pa_*` taxonomy (`data-product-attribute`).
 * @param {string}      slug        The chosen term slug (`data-term`).
 * @param {number}      [stepIndex] Step the choice was made on; -1 (never
 *                                  cleared by Back) when unknown.
 */
export function recordVariationChoice( flowEl, taxonomy, slug, stepIndex = -1 ) {
	if ( ! taxonomy || ! slug ) {
		return;
	}
	const state = ensureState( flowEl );
	state.choices.set( taxonomy, { slug, stepIndex } );
	tryResolve( flowEl );
}

/**
 * The shopper went Back to `stepIndex` (mirrors `flow-fields.js`'s
 * `forgetAnswersFrom()`): drop every variation choice made on that step or
 * later. Call alongside `forgetAnswersFrom()` from `handleBackClick()`.
 *
 * @param {HTMLElement} flowEl    Flow wrapper element.
 * @param {number}      stepIndex The step returned to.
 */
export function clearVariationChoicesAfter( flowEl, stepIndex ) {
	const state = variationState.get( flowEl );
	if ( ! state ) {
		return;
	}
	let changed = false;
	state.choices.forEach( ( choice, taxonomy ) => {
		if ( choice.stepIndex >= stepIndex ) {
			state.choices.delete( taxonomy );
			changed = true;
		}
	} );
	if ( changed ) {
		state.resolved = null;
	}
}

/**
 * The flow's fully-resolved variation. Read by `add-to-bag.js` in
 * preference to a page buybox's base.
 *
 * @param {HTMLElement} flowEl Flow wrapper element.
 * @return {{productId: number, variationId: number, attributes: Object<string, string>, priceMinor: number}|null}
 *         Resolved variation, or null when unresolved / no variation steps.
 */
export function getResolvedVariation( flowEl ) {
	const state = variationState.get( flowEl );
	return state ? state.resolved : null;
}

/**
 * Route a clicked product-option button (FR-43-10/10a) to variation
 * resolution when it's in `variation` mode; a no-op for `answer` mode
 * (`view.js`'s `recordPlainAnswer()` already records that choice, §1).
 *
 * @param {HTMLElement} flowEl    Flow wrapper element.
 * @param {HTMLElement} button    The clicked option button.
 * @param {number}      stepIndex The current step's index.
 */
export function handleProductOptionClick( flowEl, button, stepIndex ) {
	if ( 'variation' !== ( button.getAttribute( 'data-attribute-mode' ) || '' ) ) {
		return;
	}
	const taxonomy = button.getAttribute( 'data-product-attribute' ) || '';
	const slug = button.getAttribute( 'data-term' ) || '';
	recordVariationChoice( flowEl, taxonomy, slug, stepIndex );
}
