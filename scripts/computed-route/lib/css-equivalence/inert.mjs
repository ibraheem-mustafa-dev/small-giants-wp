// Layer 3 of the equivalence engine (Spec 48 FR-48-86): values that paint nothing. A draft value is inert at a width when
// the property does not apply to the element there (mdn-data `appliesto`, judged from the element's own display and
// position and its parent's display), when the element is not rendered at that width (display none), or when it is the
// property's initial value and the block's paint of the property is unmeasured. A case the context cannot decide (the
// parent's display unknown) is undecided, never inert: the walker's neutralisation probe judges it. A row is inert only
// when every width it states is.
import { createRequire } from 'module';
import { canonicalName, initialOf, isInherited } from '../css-families.mjs';
import { sameCanonical } from './values.mjs';

const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );
const FLEX = /(?:^|-)flex$/;
const GRID = /(?:^|-)grid$/;
const OUT_OF_FLOW = /^(?:absolute|fixed)$/;

// Whether a value is known (a read width can lack a property).
const known = ( v ) => undefined !== v && null !== v && '' !== v;
// A test that is undecided (null) when its input is unknown.
const when = ( v, test ) => ( known( v ) ? test( v ) : null );
const flexOrGridItem = ( c ) => when( c.parentDisplay, ( d ) => FLEX.test( d ) || GRID.test( d ) );
const itemOrOutOfFlow = ( c ) => ( known( c.position ) && OUT_OF_FLOW.test( c.position ) ? true : flexOrGridItem( c ) );

// The mdn-data `appliesto` codes whose box kind the element's context decides, each as a test of the context
// { display, position, parentDisplay, columnCount } returning true (applies), false (paints nothing) or null (undecided).
// Every other code is treated as applying.
const APPLIES = {
	flexContainers: ( c ) => when( c.display, ( d ) => FLEX.test( d ) ),
	multilineFlexContainers: ( c ) => when( c.display, ( d ) => FLEX.test( d ) ),
	gridContainers: ( c ) => when( c.display, ( d ) => GRID.test( d ) ),
	multiColumnElementsFlexContainersGridContainers: ( c ) => ( known( c.display ) && ( FLEX.test( c.display ) || GRID.test( c.display ) ) ) || ( known( c.columnCount ) && 'auto' !== c.columnCount ) ? true : ( known( c.display ) && known( c.columnCount ) ? false : null ),
	positionedElements: ( c ) => when( c.position, ( p ) => 'static' !== p ),
	flexItemsAndInFlowPseudos: ( c ) => ( known( c.position ) && OUT_OF_FLOW.test( c.position ) ? false : when( c.parentDisplay, ( d ) => FLEX.test( d ) ) ),
	flexItemsGridItemsAndAbsolutelyPositionedBoxes: itemOrOutOfFlow,
	flexItemsGridItemsAbsolutelyPositionedContainerChildren: itemOrOutOfFlow,
	gridItemsAndBoxesWithinGridContainer: ( c ) => when( c.parentDisplay, ( d ) => GRID.test( d ) ),
};

// CSS Flexbox 1 §4.3 and CSS Grid 1 §9.5: a flex or grid item honours z-index while it is static.
const ALSO = { 'z-index': flexOrGridItem };

// Whether `prop` applies to an element in context `c` at one width: { applies: true | false | null, code }.
export function appliesIn( prop, c ) {
	const p = canonicalName( prop );
	const code = MDN[ p ]?.appliesto ?? null;
	const test = APPLIES[ code ];
	let applies = test ? test( c ) : true;
	if ( true !== applies && ALSO[ p ] ) {
		const also = ALSO[ p ]( c );
		applies = true === also ? true : ( false === applies && false === also ? false : null );
	}
	return { applies, code };
}

// The context of the element at a width from its own read styles (`own`: { prop: { width: value } }, the element's other
// draft properties) and its parent's (`parent`: { width: { prop: value } }, or null when the caller has none).
export function contextAt( own, parent, w ) {
	return { display: own?.display?.[ w ], position: own?.position?.[ w ], columnCount: own?.[ 'column-count' ]?.[ w ], parentDisplay: parent?.[ w ]?.display };
}

// The verdict for one draft row. input: { prop, perWidth, own, parent, paint ({ width: the block's default paint, read
// through the spelling layer }), state }. Returns { inert: true, detail } when every width paints nothing, else
// { inert: false, detail } naming why (applies, undecided, or not the initial value).
export function inertVerdict( { prop, perWidth, own = {}, parent = null, paint = {}, state = null } ) {
	const widths = Object.keys( perWidth || {} );
	if ( ! widths.length ) {
		return { inert: false, detail: 'no width to judge' };
	}
	const initial = initialOf( prop );
	const why = [];
	for ( const w of widths ) {
		const c = contextAt( own, parent, w );
		if ( 'display' !== prop && 'none' === c.display ) {
			why.push( { w, inert: true, text: `the element is display none at ${ w }` } );
			continue;
		}
		const { applies, code } = appliesIn( prop, c );
		if ( false === applies ) {
			why.push( { w, inert: true, text: `${ prop } applies to ${ code } and the element is ${ describe( c ) } at ${ w }` } );
			continue;
		}
		// The initial value paints as no declaration, unless the block itself paints another value there (a measured paint
		// decides that; an unmeasured one leaves it to the walker). An inherited property's initial value is not its
		// undeclared value, so it is never inert by this rule; nor is a state's value.
		if ( ! state && null !== initial && ! isInherited( prop ) && ! known( paint[ w ] ) && sameCanonical( prop, perWidth[ w ], initial ) ) {
			why.push( { w, inert: true, text: `${ perWidth[ w ] } is the initial value of ${ prop } and the block's paint of it is unmeasured at ${ w }` } );
			continue;
		}
		why.push( { w, inert: false, text: null === applies ? `whether ${ prop } (${ code }) applies is undecided at ${ w }: ${ describe( c ) }` : `${ prop } applies at ${ w } (${ code ?? 'no appliesto code' }${ code && APPLIES[ code ] ? `: ${ describe( c ) }` : '' })` } );
	}
	const inert = why.every( ( x ) => x.inert );
	return { inert, detail: [ ...new Set( ( inert ? why : why.filter( ( x ) => ! x.inert ) ).map( ( x ) => x.text ) ) ].join( '; ' ) };
}

function describe( c ) {
	return [ `display ${ c.display ?? 'unknown' }`, ...( known( c.position ) ? [ `position ${ c.position }` ] : [] ), `parent display ${ c.parentDisplay ?? 'unknown' }` ].join( ', ' );
}
