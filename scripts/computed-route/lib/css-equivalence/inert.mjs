// Layer 3 of the equivalence engine (Spec 48 FR-48-86): values that paint nothing. A draft value is inert at a width when
// the property does not apply to the element there (judged from the element's own display and position and its parent's
// display), when the element is not rendered at that width (display none), or when it is the property's initial value and
// calibration measured the block painting that initial value there too. A case the context cannot decide (the parent's
// display unknown, or a display:contents parent, whose own parent decides) is undecided, never inert: the walker's
// neutralisation probe judges it. A row is inert only when every width it states is.
// The box kinds a property applies to come from mdn-data's `appliesto` code, corrected by the specification's own
// "Applies to" line (@webref/css) where that line lists only container kinds: CSS Box Alignment 3 applies
// justify-content and place-content to grid and block containers too, which mdn-data lists as flex only. A property
// mdn-data does not gate (an inherited text-align paints through a flex container's items) stays applying everywhere.
import { createRequire } from 'module';
import { canonicalName, initialOf, isInherited, longhandsOf } from '../css-families.mjs';
import { sameCanonical } from './values.mjs';

const need = createRequire( import.meta.url );
const MDN = need( 'mdn-data/css/properties.json' );
const WEBREF = new Map( need( '@webref/css/css.json' ).properties.map( ( p ) => [ p.name, p ] ) );
// CSS Display 3 §2: -webkit-box and -webkit-inline-box are the legacy names of flex and inline-flex.
const FLEX = /(?:^|[-\s])flex$|^-webkit-(?:inline-)?box$/;
const GRID = /(?:^|[-\s])grid(?:-lanes)?$/;
// CSS Display 3 §2: the displays whose box is a block container, and the ones whose box is known not to be one.
const BLOCK_CONTAINER = /^(?:block|flow-root|inline-block|list-item|table-cell|table-caption)$|(?:^|\s)flow(?:-root)?(?:\s|$)/;
const NOT_BLOCK_CONTAINER = /^(?:inline|table|inline-table|table-row|table-row-group|table-header-group|table-footer-group|table-column|table-column-group)$/;
const OUT_OF_FLOW = /^(?:absolute|fixed)$/;

// Whether a value is known (a read width can lack a property).
const known = ( v ) => undefined !== v && null !== v && '' !== v;
// A test that is undecided (null) when its input is unknown.
const when = ( v, test ) => ( known( v ) ? test( v ) : null );
// The parent's display, unknown where it is display:contents (that parent has no box; its own parent's decides).
const parentOf = ( c ) => ( 'contents' === c.parentDisplay ? undefined : c.parentDisplay );
const flexOrGridItem = ( c ) => when( parentOf( c ), ( d ) => FLEX.test( d ) || GRID.test( d ) );
const itemOrOutOfFlow = ( c ) => ( known( c.position ) && OUT_OF_FLOW.test( c.position ) ? true : flexOrGridItem( c ) );
// Any of several tests: true when one is, false when every one is, else undecided.
const anyOf = ( tests ) => ( c ) => {
	const r = tests.map( ( t ) => t( c ) );
	return r.includes( true ) ? true : ( r.every( ( x ) => false === x ) ? false : null );
};
const flexContainer = ( c ) => when( c.display, ( d ) => FLEX.test( d ) );
const gridContainer = ( c ) => when( c.display, ( d ) => GRID.test( d ) );
const blockContainer = ( c ) => ( known( c.display ) && ( BLOCK_CONTAINER.test( c.display ) || NOT_BLOCK_CONTAINER.test( c.display ) || FLEX.test( c.display ) || GRID.test( c.display ) ) ? BLOCK_CONTAINER.test( c.display ) : null );
const columns = ( v ) => when( v, ( x ) => 'auto' !== x );
// A multicol container is a block container whose column count or column width is not auto.
const multicol = ( c ) => ( false === blockContainer( c ) ? false : anyOf( [ ( x ) => columns( x.columnCount ), ( x ) => columns( x.columnWidth ) ] )( c ) );

// The container kinds a specification's "Applies to" line can name, each with its test of the context.
const KINDS = [
	[ /\bmulti-?col(?:umn)? containers\b/, multicol ],
	[ /\bmulti-line flex containers\b/, flexContainer ],
	[ /\bflex containers\b/, flexContainer ],
	[ /\bgrid(?: lanes)? containers\b/, gridContainer ],
	[ /\bblock containers\b/, blockContainer ],
];

// The container-kind tests the specification's "Applies to" line for `prop` names (a shorthand's "see individual
// properties" is the union of its longhands'), or null when the line names anything else.
function specKinds( prop ) {
	const text = String( WEBREF.get( prop )?.appliesTo ?? '' ).toLowerCase();
	if ( 'see individual properties' === text ) {
		const parts = longhandsOf( prop ).filter( ( l ) => l !== prop ).map( specKinds );
		return parts.length && parts.every( Boolean ) ? [ ...new Set( parts.flat() ) ] : null;
	}
	let rest = text;
	const tests = [];
	for ( const [ re, test ] of KINDS ) {
		if ( re.test( rest ) ) {
			tests.push( test );
			rest = rest.replace( new RegExp( re.source, 'g' ), ' ' );
		}
	}
	return tests.length && ! rest.replace( /,|\band\b|\s/g, '' ) ? tests : null;
}

// The mdn-data `appliesto` codes whose box kind the element's context decides, each as a test of the context
// { display, position, parentDisplay, columnCount, columnWidth } returning true (applies), false (paints nothing) or null
// (undecided). Every other code is treated as applying.
const APPLIES = {
	flexContainers: flexContainer,
	multilineFlexContainers: flexContainer,
	gridContainers: gridContainer,
	multiColumnElementsFlexContainersGridContainers: anyOf( [ flexContainer, gridContainer, multicol ] ),
	positionedElements: ( c ) => when( c.position, ( p ) => 'static' !== p ),
	flexItemsAndInFlowPseudos: ( c ) => ( known( c.position ) && OUT_OF_FLOW.test( c.position ) ? false : when( parentOf( c ), ( d ) => FLEX.test( d ) ) ),
	flexItemsGridItemsAndAbsolutelyPositionedBoxes: itemOrOutOfFlow,
	flexItemsGridItemsAbsolutelyPositionedContainerChildren: itemOrOutOfFlow,
	gridItemsAndBoxesWithinGridContainer: ( c ) => when( parentOf( c ), ( d ) => GRID.test( d ) ),
};

// CSS Flexbox 1 §4.3 and CSS Grid 1 §9.5: a flex or grid item honours z-index while it is static.
const ALSO = { 'z-index': flexOrGridItem };

// Whether `prop` applies to an element in context `c` at one width: { applies: true | false | null, code }. A property
// whose mdn-data code is gated above is judged by its specification's container kinds where that line lists only those
// (code `spec: <the line>`), else by the code.
export function appliesIn( prop, c ) {
	const p = canonicalName( prop );
	const mdn = MDN[ p ]?.appliesto ?? null;
	const kinds = APPLIES[ mdn ] ? specKinds( p ) : null;
	const code = kinds ? `spec: ${ WEBREF.get( p ).appliesTo }` : mdn;
	let applies = kinds ? anyOf( kinds )( c ) : ( APPLIES[ mdn ] ? APPLIES[ mdn ]( c ) : true );
	if ( true !== applies && ALSO[ p ] ) {
		const also = ALSO[ p ]( c );
		applies = true === also ? true : ( false === applies && false === also ? false : null );
	}
	return { applies, code };
}

// The context of the element at a width from its own read styles (`own`: { prop: { width: value } }, the element's other
// draft properties) and its parent's (`parent`: { width: { prop: value } }, or null when the caller has none).
export function contextAt( own, parent, w ) {
	return { display: own?.display?.[ w ], position: own?.position?.[ w ], columnCount: own?.[ 'column-count' ]?.[ w ], columnWidth: own?.[ 'column-width' ]?.[ w ], parentDisplay: parent?.[ w ]?.display };
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
		// The initial value paints as no declaration only where calibration measured the block painting that initial value
		// there too; an unmeasured paint (the block may paint another value) is undecided, left to the walker. An inherited
		// property's initial value is not its undeclared value, so it is never inert by this rule; nor is a state's value.
		if ( ! state && null !== initial && ! isInherited( prop ) && known( paint[ w ] ) && sameCanonical( prop, paint[ w ], initial ) && sameCanonical( prop, perWidth[ w ], initial ) ) {
			why.push( { w, inert: true, text: `${ perWidth[ w ] } is the initial value of ${ prop } and the block's measured paint of it at ${ w }` } );
			continue;
		}
		why.push( { w, inert: false, text: null === applies ? `whether ${ prop } (${ code }) applies is undecided at ${ w }: ${ describe( c ) }` : `${ prop } applies at ${ w } (${ code ?? 'no appliesto code' }${ code && ( APPLIES[ code ] || code.startsWith( 'spec:' ) ) ? `: ${ describe( c ) }` : '' })` } );
	}
	const inert = why.every( ( x ) => x.inert );
	return { inert, detail: [ ...new Set( ( inert ? why : why.filter( ( x ) => ! x.inert ) ).map( ( x ) => x.text ) ) ].join( '; ' ) };
}

function describe( c ) {
	return [ `display ${ c.display ?? 'unknown' }`, ...( known( c.position ) ? [ `position ${ c.position }` ] : [] ), `parent display ${ c.parentDisplay ?? 'unknown' }` ].join( ', ' );
}
