/**
 * sgs/buybox "Pick a set" behaviour: limits, Start with, Undo, the live preview, the one summary and the add gate.
 *
 * Plain DOM (like guided.js): the pick groups are real checkbox inputs, so everything here is an enhancement and the
 * no-JS form still posts the picks. The variation pickers stay the product-card store's; this module only reads their
 * `sgs:option-selected` events. Picks reach the server as `data-extra-picks` on the root, which product-card/view.js
 * sends as the cart proxy's `picks` argument (the server builds the cart row and checks every slug again).
 *
 * @package SGS\Blocks
 */

import { applyPick, removePick, undoSwap, stepCount, addCounted, countsComplete, meetsLeast } from './configurator-picks.js';
import { summaryFor, distribute, perUnitText } from './configurator-summary.js';

const ROOT_SELECTOR = '.sgs-buybox--configurator';
/** Preview scatter tables (percent x, y): squares for the layer option, circles cycled over the picks. */
const SQUARE_POINTS = [ [ 28, 30 ], [ 55, 20 ], [ 72, 38 ], [ 38, 55 ], [ 62, 66 ], [ 24, 70 ], [ 50, 40 ], [ 80, 60 ], [ 42, 80 ], [ 60, 84 ], [ 18, 48 ], [ 84, 44 ] ];
const ROUND_POINTS = [ [ 38, 36 ], [ 66, 28 ], [ 52, 62 ], [ 30, 84 ], [ 74, 76 ], [ 82, 52 ], [ 44, 22 ] ];

const parse = ( text ) => {
	try {
		const value = JSON.parse( text || '{}' );
		return value && 'object' === typeof value ? value : {};
	} catch ( e ) {
		return {};
	}
};

function initRoot( root ) {
	if ( '1' === root.dataset.sgsPickInit ) {
		return;
	}
	const shell = root.querySelector( '[data-sgs-pick]' );
	if ( ! shell ) {
		return;
	}
	root.dataset.sgsPickInit = '1';

	const seed = parse( root.getAttribute( 'data-wp-context' ) );
	const template = shell.dataset.summary || 'Your {pack}: {split}';
	const packAxis = shell.dataset.packAxis || '';
	const packUnits = parse( shell.dataset.packUnits );
	const packLabels = parse( shell.dataset.packLabels );
	const layerAxis = shell.dataset.layerAxis || '';
	const layerColours = parse( shell.dataset.layerColours );
	const live = shell.querySelector( '[data-sgs-live]' );
	const undoRow = shell.querySelector( '[data-sgs-undo-row]' );
	const undoBtn = shell.querySelector( '[data-sgs-undo]' );
	const dots = shell.querySelector( '[data-sgs-dots]' );
	const caption = shell.querySelector( '[data-sgs-caption]' );
	const preview = shell.querySelector( '[data-sgs-preview]' );
	const perUnitEl = shell.querySelector( '[data-sgs-per-unit]' );
	let selections = { ...( seed.selectedAxes || {} ) };
	let undo = null;

	const groups = Array.from( shell.querySelectorAll( '[data-sgs-pick-group]' ) ).map( ( el ) => {
		const inputs = Array.from( el.querySelectorAll( 'input.sgs-buybox-pick__input' ) );
		return {
			el,
			key: el.dataset.sgsPickGroup,
			label: el.dataset.label || '',
			least: parseInt( el.dataset.least, 10 ) || 1,
			most: parseInt( el.dataset.most, 10 ) || 1,
			overflow: el.dataset.overflow || 'refuse',
			share: el.dataset.share || 'none',
			inputs,
			order: inputs.filter( ( i ) => i.checked ).map( ( i ) => i.value ),
			counts: {},
		};
	} );

	const inputFor = ( group, slug ) => group.inputs.find( ( i ) => i.value === slug );
	const labelFor = ( group, slug ) => ( inputFor( group, slug ) || {} ).dataset?.label || slug;
	const say = ( text ) => {
		if ( live ) {
			live.textContent = '';
			window.requestAnimationFrame( () => {
				live.textContent = text;
			} );
		}
	};
	const pack = () => parseInt( packUnits[ selections[ packAxis ] ], 10 ) || 0;

	function syncInputs( group ) {
		group.inputs.forEach( ( input ) => {
			input.checked = group.order.includes( input.value );
			const stepper = input.closest( 'label' )?.querySelector( '[data-sgs-stepper]' );
			if ( stepper ) {
				stepper.hidden = ! input.checked;
				const n = group.counts[ input.value ] || 0;
				stepper.querySelector( '.sgs-buybox-pick__count' ).textContent = String( n );
				const hidden = stepper.querySelector( '[data-sgs-count]' );
				hidden.value = String( n );
				hidden.disabled = ! input.checked;
			}
		} );
	}

	/** Under shopper-set counts a new pack size restarts the counts as an equal split of the picks already made. */
	function spreadCounts( group ) {
		const split = distribute( pack(), group.order.length );
		group.counts = Object.fromEntries( group.order.map( ( slug, i ) => [ slug, split[ i ] || 0 ] ) );
	}

	/** The counts a group sends: shopper-set ones, the equal split, or none. */
	function countsFor( group ) {
		const total = pack();
		if ( 'counts' === group.share && total > 0 ) {
			return group.order.map( ( s ) => group.counts[ s ] || 0 );
		}
		if ( 'equal' === group.share && total > 0 ) {
			return distribute( total, group.order.length );
		}
		return [];
	}

	function groupReady( group ) {
		if ( ! meetsLeast( group.order.length, group.least ) ) {
			return false;
		}
		return 'counts' !== group.share || 0 === pack() || countsComplete( group.counts, pack() );
	}

	function variationText() {
		return Array.from( root.querySelectorAll( '.sgs-option-picker input[type="radio"]:checked' ) )
			.filter( ( input ) => input.name !== packAxis && ! input.closest( '.sgs-option-picker' )?.querySelector( `[name="${ packAxis }"]` ) )
			.map( ( input ) => input.closest( 'label' )?.querySelector( '.sgs-option-picker__pill-label' )?.textContent.trim().toLowerCase() )
			.filter( Boolean )
			.join( ', ' );
	}

	function renderDots() {
		if ( ! dots ) {
			return;
		}
		dots.replaceChildren();
		const layer = layerColours[ selections[ layerAxis ] ];
		if ( layer ) {
			SQUARE_POINTS.forEach( ( [ x, y ], i ) => addDot( x, y, i % 3 ? 16 : 20, '4px', layer, i * 37 ) );
		}
		const picked = groups.flatMap( ( g ) => g.order.map( ( slug ) => inputFor( g, slug ) ) ).filter( Boolean );
		if ( picked.length ) {
			ROUND_POINTS.forEach( ( [ x, y ], i ) => {
				const input = picked[ i % picked.length ];
				const swatch = input.closest( 'label' )?.querySelector( '.sgs-buybox-pick__swatch' );
				addDot( x, y, 17, '50%', input.dataset.colour || '', 0, swatch && input.dataset.hasImage ? window.getComputedStyle( swatch ).backgroundImage : '' );
			} );
		}
	}

	function addDot( x, y, size, radius, colour, rotate, image = '' ) {
		const dot = document.createElement( 'span' );
		dot.className = 'sgs-buybox-pick__dot';
		const s = dot.style;
		s.left = `${ x }%`;
		s.top = `${ y }%`;
		s.width = `${ size }px`;
		s.height = `${ size }px`;
		s.borderRadius = radius;
		s.background = colour || 'currentColor';
		if ( image && 'none' !== image ) {
			s.backgroundImage = image;
			s.backgroundSize = 'cover';
		}
		s.rotate = `${ rotate }deg`;
		dots.appendChild( dot );
	}

	function render() {
		const lead = groups.find( ( g ) => 'none' !== g.share ) || groups[ 0 ];
		const labels = lead ? lead.order.map( ( s ) => labelFor( lead, s ) ) : [];
		const text = lead
			? summaryFor( {
				template,
				pack: pack(),
				packLabel: packLabels[ selections[ packAxis ] ] || '',
				variation: variationText(),
				labels,
				counts: countsFor( lead ),
				sharing: 'none' !== lead.share,
			} )
			: '';
		if ( caption ) {
			caption.textContent = text;
		}
		if ( preview ) {
			preview.setAttribute( 'aria-label', text );
		}
		const variant = root.querySelector( '.sgs-buybox__bar-variant' );
		if ( variant && text ) {
			variant.textContent = text;
		}
		const combo = seed.combos && seed.combos[ Object.keys( selections ).sort().map( ( t ) => `${ t }:${ selections[ t ] }` ).join( '|' ) ];
		const each = combo && pack() > 0 ? perUnitText( parseInt( combo.priceMinor, 10 ), pack(), seed.currencySymbol || '£' ) : '';
		if ( perUnitEl ) {
			perUnitEl.hidden = '' === each;
			perUnitEl.textContent = each;
		}
		renderDots();
		const ready = groups.every( groupReady );
		root.querySelectorAll( '.buybox__add-to-cart' ).forEach( ( btn ) => btn.setAttribute( 'aria-disabled', ready ? 'false' : 'true' ) );
	}

	function onChange( group, input ) {
		const slug = input.value;
		if ( input.checked ) {
			if ( 'counts' === group.share && pack() > 0 ) {
				const next = addCounted( group.counts, slug, pack() );
				if ( ! next ) {
					group.el.dataset.refused = '1';
					say( group.el.dataset.limitMessage );
				} else {
					group.counts = next;
					group.order = [ ...group.order, slug ];
				}
			} else {
				const result = applyPick( group.order, slug, group.most, group.overflow );
				if ( result.refused ) {
					say( group.el.dataset.limitMessage );
				}
				group.order = result.order;
				if ( result.removed ) {
					undo = { group, added: slug, removed: result.removed };
					say( `${ labelFor( group, slug ) } added, ${ labelFor( group, result.removed ) } removed` );
					if ( undoRow ) {
						undoRow.hidden = false;
					}
				}
			}
		} else {
			const result = removePick( group.order, slug, group.least );
			group.order = result.order;
			if ( result.kept ) {
				say( `Keep at least ${ group.least }` );
			} else {
				delete group.counts[ slug ];
			}
		}
		syncInputs( group );
		clearError( group );
		render();
	}

	function clearError( group ) {
		const err = group.el.querySelector( '.sgs-buybox-pick__group-error' );
		if ( err ) {
			err.hidden = true;
			err.textContent = '';
		}
		root.querySelectorAll( '.buybox__add-to-cart' ).forEach( ( btn ) => btn.removeAttribute( 'aria-describedby' ) );
	}

	shell.addEventListener( 'change', ( event ) => {
		const input = event.target;
		const group = groups.find( ( g ) => g.inputs.includes( input ) );
		if ( group ) {
			onChange( group, input );
		}
	} );

	shell.addEventListener( 'click', ( event ) => {
		const step = event.target.closest && event.target.closest( '[data-step]' );
		if ( ! step ) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const input = step.closest( 'label' ).querySelector( 'input.sgs-buybox-pick__input' );
		const group = groups.find( ( g ) => g.inputs.includes( input ) );
		group.counts = stepCount( group.counts, input.value, parseInt( step.dataset.step, 10 ), pack() );
		syncInputs( group );
		render();
	} );

	if ( undoBtn ) {
		undoBtn.addEventListener( 'click', () => {
			if ( ! undo ) {
				return;
			}
			const { group, added, removed } = undo;
			group.order = undoSwap( group.order, added, removed );
			undo = null;
			syncInputs( group );
			undoRow.hidden = true;
			say( `${ labelFor( group, removed ) } restored, ${ labelFor( group, added ) } removed` );
			render();
			const back = inputFor( group, removed );
			if ( back ) {
				back.focus();
			}
		} );
	}

	window.addEventListener( 'pageshow', ( event ) => {
		if ( event.persisted ) {
			undo = null;
			if ( undoRow ) {
				undoRow.hidden = true;
			}
		}
	} );

	root.addEventListener( 'sgs:option-selected', ( event ) => {
		const typeKey = event.detail && event.detail.typeKey;
		const key = event.detail && event.detail.selectedKey;
		if ( 'string' === typeof typeKey && 'string' === typeof key && typeKey && key ) {
			selections = { ...selections, [ typeKey ]: key };
			// The pickers swap their own labels a moment later; counts depend on the pack, so settle after them.
			window.setTimeout( () => {
				groups.forEach( ( g ) => {
					if ( 'counts' === g.share ) {
						spreadCounts( g );
						syncInputs( g );
					}
				} );
				render();
			}, 0 );
		}
	} );

	// The add gate: ROOT is an ancestor of the cart form, so this capture listener runs before product-card's own submit.
	root.addEventListener(
		'submit',
		( event ) => {
			if ( ! event.target.matches || ! event.target.matches( '.buybox__cart-form' ) ) {
				return;
			}
			const bad = groups.find( ( g ) => ! groupReady( g ) );
			if ( bad ) {
				event.preventDefault();
				event.stopImmediatePropagation();
				const err = bad.el.querySelector( '.sgs-buybox-pick__group-error' );
				const counting = 'counts' === bad.share && meetsLeast( bad.order.length, bad.least );
				err.textContent = counting ? `The ${ bad.label } must add up to ${ pack() }.` : bad.el.dataset.leastMessage;
				err.hidden = false;
				root.querySelectorAll( '.buybox__add-to-cart' ).forEach( ( btn ) => btn.setAttribute( 'aria-describedby', err.id ) );
				return;
			}
			const picks = {};
			groups.forEach( ( g ) => {
				const counts = countsFor( g );
				picks[ g.key ] = g.order.map( ( slug, i ) => ( { slug, count: 'counts' === g.share ? counts[ i ] || 0 : 0 } ) );
			} );
			root.dataset.extraPicks = JSON.stringify( picks );
		},
		true
	);

	groups.forEach( ( g ) => {
		if ( 'counts' === g.share ) {
			spreadCounts( g );
		}
		syncInputs( g );
	} );
	render();
}

function initAll() {
	document.querySelectorAll( ROOT_SELECTOR ).forEach( initRoot );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', initAll );
} else {
	initAll();
}
