/**
 * The cards a delegating block shows in the editor canvas, and the stagger entrance it hands them (Spec 38A §6.2, §8,
 * FR-38A-8). In a delegating mode (an `sgs/card-grid` with `source` `wc-product` or `cpt-collection`) the canvas draws
 * each result as the grid's template `sgs/product-card` (`card-grid/components/ProductTemplateCanvas.js`): the editable
 * template block for the active product and a block preview for every other, each card its own block element. On the
 * page, with the stagger's `apply` on and no entrance on the template card's root, every card root takes the grid's
 * entrance, delays removed, and its own stagger delay (`Sgs_Motion_Delegate::child_motion`,
 * `Sgs_Motion_Loop_Delays::item_array`). The canvas writes the same: the card entrance rule here and the delay rules in
 * `canvas-dom.js::withLoopDelays`, both on the card target, and Replay plays every shown card at its own index.
 *
 * A shown card is the outermost element carrying the child block's root class (a card's server-rendered markup carries
 * the same class inside it), outside any `[hidden]` element (the active product's own preview) and any
 * `[data-sgs-sample]` element (the template drawn as a sample when no product matches, which the page never prints).
 *
 * @package
 */

import { sanitiseDocument } from './document-sanitise';
import { emitTarget } from './emit-scoped-css';
import { delegatedMove, withoutDelays } from './stagger-apply';

/** Elements inside these are not cards of the page. */
const NOT_SHOWN = '[hidden],[data-sgs-sample]';

/**
 * The class WordPress gives a block's root (`wp_get_block_default_classname`), for example `wp-block-sgs-product-card`.
 *
 * @param {string} blockName Block name.
 * @return {string} The class, or '' for an unusable name.
 */
export function blockRootClass( blockName ) {
	if (
		typeof blockName !== 'string' ||
		! /^[a-z0-9-]+\/[a-z0-9-]+$/.test( blockName )
	) {
		return '';
	}
	return `wp-block-${ blockName
		.replace( /^core\//, '' )
		.replace( '/', '-' ) }`;
}

/**
 * The card target of a delegating block: every shown card root, scoped to the block.
 *
 * @param {Object|null} delegation `activeDelegation()`: `{ block }`, null outside a delegating mode.
 * @param {string}      root       The block's scoped root selector.
 * @return {Object|null} A resolved target (`selector`, `classes`, `delegated: true`), or null.
 */
export function delegatedCardTarget( delegation, root ) {
	const rootClass = blockRootClass( delegation?.block );
	if ( rootClass === '' ) {
		return null;
	}
	return {
		selector: `${ root } .${ rootClass }`,
		root: false,
		classes: [ rootClass ],
		tag: null,
		child: false,
		delegated: true,
	};
}

/**
 * The shown cards among the elements matching a card target, in document order.
 *
 * @param {Element[]} found     Elements carrying the card root class inside the block.
 * @param {Element}   rootEl    The block element.
 * @param {string}    rootClass The card root class.
 * @return {Element[]} The cards.
 */
export function shownCards( found, rootEl, rootClass ) {
	return found.filter( ( el ) => {
		if ( el.closest( NOT_SHOWN ) && rootEl.contains( el.closest( NOT_SHOWN ) ) ) {
			return false;
		}
		for ( let up = el.parentElement; up && up !== rootEl; up = up.parentElement ) {
			if ( up.classList.contains( rootClass ) ) {
				return false;
			}
		}
		return true;
	} );
}

// An entrance on a named state the child block does not declare plays on scroll (`Sgs_Motion_Delegate::playable`).
function playable( base, states ) {
	if ( base.trigger === 'state' && ! states.includes( String( base.state ?? '' ) ) ) {
		const { state, ...rest } = base;
		return { ...rest, trigger: 'scroll' };
	}
	return base;
}

/**
 * The stagger entrance the cards take from the block, as a Replay plan on the card target plus its CSS, or null when
 * nothing is handed over (no delegation, no card shown, `apply` off, no container entrance, or the template card's
 * root keeps its own entrance).
 *
 * @param {Object|undefined} motion  The stored motion attribute.
 * @param {Object}           options `emitScopedCss()` options (`delegation` carries `childStates`, the child block's
 *                                   declared states) plus `cards` (the shown card count).
 * @return {{plan:Object,css:string}|null} The hand-over.
 */
export function delegatedCardPlan( motion, options ) {
	const target = delegatedCardTarget( options.delegation, options.root );
	const targets = sanitiseDocument( motion ).elements;
	if ( ! target || ! ( options.cards > 0 ) || ! targets || typeof targets !== 'object' || Array.isArray( targets ) ) {
		return null;
	}
	const from = delegatedMove( motion, targets, options.elements, options.delegation );
	if ( from === null ) {
		return null;
	}
	const states = Array.isArray( options.delegation.childStates ) ? options.delegation.childStates : [];
	const base = playable( withoutDelays( targets[ from ].entrance.base ), states );
	const emitted = emitTarget( { entrance: { base } }, target.selector, { ...( options.context || {} ), suppressEntrance: false, states } );
	if ( ! emitted.entrance ) {
		return null;
	}
	return {
		plan: { ...target, target: from, attrs: emitted.attrs, entrance: true, inheritedFrom: from },
		css: emitted.css,
	};
}
