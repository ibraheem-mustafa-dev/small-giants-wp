/**
 * The editor-canvas DOM side of the motion preview (Spec 38A §11, FR-38A-28): find a block's element in the editor
 * canvas (the iframe when the editor is iframed, else the editor document), keep one `<style>` element per block in that
 * document's head, and stamp the data attributes the shared stylesheet keys on (`assets/css/motion.css`) onto the
 * block's canvas elements. Nothing here reaches saved markup and nothing writes a `style` attribute.
 *
 * At rest the canvas shows every entrance at its final state (§11, D5): the entrance attributes (`data-sgs-me`,
 * `data-sgs-me-keyframes`) are left off and written only while Replay plays. A plan's elements are found the way the
 * server's markup pass finds them (`includes/motion/class-sgs-motion-markup.php`): the root, else every element inside
 * the block carrying the plan's classes (and tag), a band part only as the root's direct child. An element that belongs
 * to a nested block is never touched. Two plans on one element join their channel lists, as `write()` does there.
 *
 * @package SGS\Blocks
 */

import { emitScopedCss } from './emit-scoped-css';
import { sharedLosers } from './shared-element';
import { loopDelayCss } from './loop-delays';
import { resolveTarget } from './resolve-target';
import { declaredItemPart } from './stagger-apply';

/** Attributes the canvas writes only while Replay plays. */
export const ENTRANCE_ATTRS = Object.freeze( [
	'data-sgs-me',
	'data-sgs-me-keyframes',
] );

/** Token lists two plans on one element join. */
const TOKEN_ATTRS = Object.freeze( [ 'data-sgs-mc' ] );

const STYLE_PREFIX = 'sgs-motion-canvas-';

/**
 * The scoped root selector of a block in the canvas: its block element's id, as an attribute test so the selector has
 * the same class-level specificity as the page's `.sgs-m-<hash>`.
 *
 * @param {string} clientId Block client id.
 * @return {string} Selector.
 */
export function canvasRootSelector( clientId ) {
	return `[id="block-${ clientId }"]`;
}

/**
 * The documents the canvas may live in: the editor document, then every editor-canvas iframe's document.
 *
 * @param {Document} doc The editor document.
 * @return {Document[]} Documents.
 */
function canvasDocuments( doc ) {
	const docs = [ doc ];
	doc.querySelectorAll( 'iframe[name="editor-canvas"]' ).forEach(
		( frame ) => {
			try {
				if ( frame.contentDocument ) {
					docs.push( frame.contentDocument );
				}
			} catch ( error ) {
				// A cross-origin frame is not the canvas.
			}
		}
	);
	return docs;
}

/**
 * The block's canvas element, or null while it is not mounted.
 *
 * @param {string}   clientId Block client id.
 * @param {Document} doc      The editor document.
 * @return {Element|null} Element.
 */
export function findBlockElement( clientId, doc = document ) {
	for ( const candidate of canvasDocuments( doc ) ) {
		const el = candidate.getElementById( `block-${ clientId }` );
		if ( el ) {
			return el;
		}
	}
	return null;
}

/**
 * Whether an element belongs to this block rather than to a block nested inside it.
 *
 * @param {Element} el     Candidate.
 * @param {Element} rootEl Block element.
 * @return {boolean} True when the nearest block element is this block's own (or there is none).
 */
function ownedBy( el, rootEl ) {
	const owner = el.closest( '[data-block]' );
	return owner === null || owner === rootEl;
}

/**
 * Call `onFound` once the block's canvas element exists: at once when it is mounted, else when a mutation in the editor
 * document or in an editor-canvas iframe (including one that loads later) adds it. No timers.
 *
 * @param {string}                 clientId Block client id.
 * @param {(el: Element) => void}  onFound  Called once with the element.
 * @param {Document}               doc      The editor document.
 * @return {() => void} Stops watching.
 */
export function watchForMount( clientId, onFound, doc = document ) {
	const now = findBlockElement( clientId, doc );
	if ( now ) {
		onFound( now );
		return () => {};
	}
	const watched = new Set();
	const frames = new Set();
	let done = false;
	let observer = null;
	const stop = () => {
		done = true;
		observer?.disconnect();
		frames.forEach( ( frame ) => frame.removeEventListener( 'load', check ) );
	};
	function attach() {
		canvasDocuments( doc ).forEach( ( candidate ) => {
			const body = candidate.body || candidate.documentElement;
			if ( body && ! watched.has( body ) ) {
				watched.add( body );
				observer.observe( body, { childList: true, subtree: true } );
			}
		} );
		doc.querySelectorAll( 'iframe[name="editor-canvas"]' ).forEach( ( frame ) => {
			if ( ! frames.has( frame ) ) {
				frames.add( frame );
				frame.addEventListener( 'load', check );
			}
		} );
	}
	function check() {
		if ( done ) {
			return;
		}
		const el = findBlockElement( clientId, doc );
		if ( el ) {
			stop();
			onFound( el );
		} else {
			attach();
		}
	}
	const Observer = ( doc.defaultView || window ).MutationObserver;
	observer = new Observer( check );
	attach();
	return stop;
}

/**
 * The elements one plan targets inside the block element.
 *
 * @param {Element} rootEl Block element.
 * @param {Object}  plan   A plan from `emitScopedCss()` (`root`, `classes`, `tag`, `child`).
 * @return {Element[]} Elements.
 */
export function planElements( rootEl, plan ) {
	if ( plan.root ) {
		return [ rootEl ];
	}
	// Classes come from BEM part names or `lastCompound()`'s `[A-Za-z0-9_-]` match, so they need no escaping.
	const classes = plan.classes || [];
	if ( classes.length === 0 && ! plan.tag ) {
		return [];
	}
	const compound = ( plan.tag ? plan.tag.toLowerCase() : '' ) + classes.map( ( c ) => `.${ c }` ).join( '' );
	let found;
	try {
		found = [ ...rootEl.querySelectorAll( plan.child ? `:scope > ${ compound }` : compound ) ];
	} catch ( error ) {
		return [];
	}
	return found.filter( ( el ) => ownedBy( el, rootEl ) );
}

/**
 * The block's canvas emission: emitted once, then again without the hover state and entrance of any target that shares
 * an element with an earlier-declared one (found in this DOM). An inherited item plan (`inheritedFrom`) takes no part in
 * that comparison, and when this DOM shows no item it is dropped and the container keeps its entrance.
 *
 * @param {Element|null} rootEl  Block element, or null before it mounts.
 * @param {Object}       motion  Stored motion attribute.
 * @param {Object}       options `emitScopedCss()` options, plus `loopColumns` (the block's grid columns per tier).
 * @return {Object} `emitScopedCss()` output plus `losers`, and the stagger's per-item delay rules with `loopItems` when
 *                  the block prints its items itself (`withLoopDelays`).
 */
export function planCanvas( rootEl, motion, options ) {
	return withLoopDelays( rootEl, motion, options, planTargets( rootEl, motion, options ) );
}

/**
 * The stagger's per-item delay rules for a block that prints its items itself (`loop-delays.js`, the twin of
 * `Sgs_Motion_Loop_Delays::item_array`), added to the emission with `loopItems`, the item plan Replay gives each item its
 * index on. A block holding inner blocks (each child stores its own delay) or delegating its items gets none.
 *
 * @param {Element|null} rootEl  Block element.
 * @param {Object}       motion  Stored motion attribute.
 * @param {Object}       options `emitScopedCss()` options plus `loopColumns` (the grid columns per tier).
 * @param {Object}       out     The emission.
 * @return {Object} The emission, with the rules and `loopItems` when the block staggers its items.
 */
function withLoopDelays( rootEl, motion, options, out ) {
	const part = declaredItemPart( options.elements, options.motionItems );
	if ( ! rootEl || ! part || options.hasInnerBlocks || options.delegation ) {
		return out;
	}
	const items = resolveTarget( options.blockName, options.elements, options.root, part, {} );
	if ( ! items ) {
		return out;
	}
	const css = loopDelayCss( motion, {
		itemSelector: items.selector,
		count: planElements( rootEl, items ).length,
		columnsByTier: options.loopColumns || {},
	} );
	return css === '' ? out : { ...out, css: out.css + css, loopItems: items };
}

/**
 * The targets' emission, re-emitted without the shared-element losers' hover state and entrance (`planCanvas`).
 *
 * @param {Element|null} rootEl  Block element.
 * @param {Object}       motion  Stored motion attribute.
 * @param {Object}       options `emitScopedCss()` options.
 * @return {Object} `emitScopedCss()` output plus `losers`.
 */
function planTargets( rootEl, motion, options ) {
	let first = emitScopedCss( motion, options );
	const inherited = first.plans.find( ( plan ) => plan.inheritedFrom );
	if ( rootEl && inherited && planElements( rootEl, inherited ).length === 0 ) {
		// No item shows, so nothing takes the container's entrance: it stays on the container, as on the page.
		options = { ...options, noItems: true };
		first = emitScopedCss( motion, options );
	}
	const stored = first.plans.filter( ( plan ) => ! plan.inheritedFrom );
	if ( ! rootEl || stored.length < 2 ) {
		return { ...first, losers: {} };
	}
	const losers = sharedLosers( stored, options.elements, ( plan ) => planElements( rootEl, plan ) );
	return Object.keys( losers ).length === 0
		? { ...first, losers }
		: { ...emitScopedCss( motion, { ...options, losers } ), losers };
}

/**
 * Write the block's CSS into its document's head: one `<style>` per block id, removed when the CSS is empty.
 *
 * @param {Element} rootEl   Block element.
 * @param {string}  clientId Block client id.
 * @param {string}  css      Scoped CSS.
 */
export function writeStyle( rootEl, clientId, css ) {
	const doc = rootEl.ownerDocument;
	const id = STYLE_PREFIX + clientId;
	let style = doc.getElementById( id );
	if ( css === '' ) {
		style?.remove();
		return;
	}
	if ( ! style ) {
		style = doc.createElement( 'style' );
		style.id = id;
		doc.head.appendChild( style );
	}
	if ( style.textContent !== css ) {
		style.textContent = css;
	}
}

/**
 * Remove a block's `<style>` from every canvas document.
 *
 * @param {string}   clientId Block client id.
 * @param {Document} doc      The editor document.
 */
export function removeStyle( clientId, doc = document ) {
	canvasDocuments( doc ).forEach( ( candidate ) =>
		candidate.getElementById( STYLE_PREFIX + clientId )?.remove()
	);
}

/**
 * Join two token lists, earlier tokens first, each once.
 *
 * @param {string|null} existing Value on the element.
 * @param {string}      added    Value to add.
 * @return {string} Joined list.
 */
export function joinTokens( existing, added ) {
	const tokens = [
		...( existing || '' ).split( ' ' ),
		...added.split( ' ' ),
	].filter( Boolean );
	return [ ...new Set( tokens ) ].join( ' ' );
}

/**
 * Stamp attributes on one element, recording each name written so `unstamp()` removes exactly those.
 *
 * @param {Element}              el      Element.
 * @param {Object<string,string>} attrs  Attributes.
 * @param {WeakMap}              written Element => Set of names written this pass.
 */
export function stampAttrs( el, attrs, written ) {
	const names = written.get( el ) || new Set();
	Object.entries( attrs ).forEach( ( [ name, value ] ) => {
		if ( names.has( name ) ) {
			if ( TOKEN_ATTRS.includes( name ) ) {
				el.setAttribute( name, joinTokens( el.getAttribute( name ), value ) );
			}
			return;
		}
		if ( el.getAttribute( name ) !== value ) {
			el.setAttribute( name, value );
		}
		names.add( name );
	} );
	written.set( el, names );
}

/**
 * Stamp a block's resting markers: the root attributes and every plan's attributes except the entrance ones.
 *
 * @param {Element} rootEl  Block element.
 * @param {Object}  emitted `emitScopedCss()` output plus `rootAttrs` (its `itemMatches` are stamped `data-sgs-mitem`).
 * @return {Map<Element,Set<string>>} Every element stamped and the names written on it.
 */
export function stamp( rootEl, emitted ) {
	const written = new WeakMap();
	const touched = new Map();
	const note = ( el ) => touched.set( el, written.get( el ) );
	stampAttrs( rootEl, emitted.rootAttrs, written );
	note( rootEl );
	emitted.plans.forEach( ( plan ) => {
		const resting = {};
		Object.entries( plan.attrs ).forEach( ( [ name, value ] ) => {
			if ( ! ENTRANCE_ATTRS.includes( name ) ) {
				resting[ name ] = value;
			}
		} );
		planElements( rootEl, plan ).forEach( ( el ) => {
			stampAttrs( el, resting, written );
			note( el );
		} );
	} );
	( emitted.itemMatches || [] ).forEach( ( match ) => {
		planElements( rootEl, match ).forEach( ( el ) => {
			stampAttrs( el, { 'data-sgs-mitem': '' }, written );
			note( el );
		} );
	} );
	return touched;
}

/**
 * Remove what `stamp()` wrote, skipping an element that now belongs to a nested block.
 *
 * @param {Map<Element,Set<string>>} touched Stamped elements and names.
 * @param {Element|null}             rootEl  The block element they were stamped under.
 */
export function unstamp( touched, rootEl = null ) {
	touched.forEach( ( names, el ) => {
		if ( rootEl && ! ownedBy( el, rootEl ) ) {
			return;
		}
		( names || [] ).forEach( ( name ) => el.removeAttribute( name ) );
	} );
}
