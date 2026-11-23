// A block's paint states (the setting record's fixtures.json `paintStates`, drawn by the site look into its `paintStates`):
// ways the block renders whose resting paint differs from its default instance's. An empty Floating layer renders as an
// inert shape (pointer-events none) while the default instance holds blocks (pointer-events auto); judged against the
// default paint, the empty layer's draft row read as a missing setting though the page already matched. Fill judges a
// node that matches a state against that state's paint.
//
// A state's `when`: { inner (true: the node holds inner blocks; false: it holds none), has: [ attributes of which at least
// one is set ], lacks: [ attributes of which none is set ], equals: { attribute: value each must hold } }; a key left out
// is not tested. `equals` names a way a block's variant setting draws it (a split hero, `{ variant: 'split' }`), whose
// resting paint differs from the default variant's on the elements both draw. The first state that matches wins.
import { withNodeValues } from './setting-record.mjs';
import { deviceModes, modeKeys, attributesAt, MODE_WIDTHS } from './fill-device-mode.mjs';

const isSet = ( v ) => ! ( null === v || undefined === v || '' === v || ( Array.isArray( v ) && ! v.length ) || ( 'object' === typeof v && ! Array.isArray( v ) && ! Object.keys( v ).length ) );

// Whether a tree node (`{ attributes, innerBlocks }`) matches a paint state's `when`.
export function matchesPaintState( when = {}, node = {} ) {
	const attrs = node.attributes || {};
	const holds = ( node.innerBlocks || [] ).length > 0;
	if ( 'boolean' === typeof when.inner && when.inner !== holds ) {
		return false;
	}
	if ( Array.isArray( when.has ) && ! when.has.some( ( a ) => isSet( attrs[ a ] ) ) ) {
		return false;
	}
	if ( when.equals && Object.entries( when.equals ).some( ( [ a, v ] ) => JSON.stringify( attrs[ a ] ) !== JSON.stringify( v ) ) ) {
		return false;
	}
	return ! ( Array.isArray( when.lacks ) && when.lacks.some( ( a ) => isSet( attrs[ a ] ) ) );
}

// The parts of the look a node never draws. The look reads every way the block draws (its default variants merged, and each
// paint state alone), so it holds parts only some nodes print: a layer's own picture is printed when the layer has a source,
// not when it holds blocks instead (`.sgs-media-el` beside `.sgs-decorative-image__content`). A part one state draws when an
// attribute is set (`has`) and another state leaves out when that attribute is unset (`lacks`) depends on the attribute; a
// node that sets none of the attributes that draw it and none of those the leaving state lacks never prints it.
export function undrawnParts( states, attrs = {} ) {
	const list = Object.values( states || {} );
	const out = new Set();
	for ( const off of list ) {
		const lacks = Array.isArray( off?.when?.lacks ) ? off.when.lacks : [];
		if ( ! lacks.length || lacks.some( ( a ) => isSet( attrs[ a ] ) ) ) {
			continue;
		}
		for ( const on of list ) {
			const has = Array.isArray( on?.when?.has ) ? on.when.has : [];
			if ( has.some( ( a ) => lacks.includes( a ) ) && ! has.some( ( a ) => isSet( attrs[ a ] ) ) ) {
				Object.keys( on.elements || {} ).filter( ( p ) => ! Object.hasOwn( off.elements || {}, p ) ).forEach( ( p ) => out.add( p ) );
			}
		}
	}
	return [ ...out ].sort();
}

// The view with `undrawn` (undrawnParts) added when the node leaves any part undrawn, built once per view and part list.
// A view with no node names no undrawn parts: with no attributes to read, an attribute-gated state would look undrawn.
function withUndrawn( view, raw, node ) {
	if ( ! node ) {
		return view;
	}
	const undrawn = undrawnParts( raw?.paintStates, node.attributes || {} );
	if ( ! view || ! undrawn.length ) {
		return view;
	}
	const byView = views.get( view ) || new Map();
	views.set( view, byView );
	const key = `undrawn:${ undrawn.join( '|' ) }`;
	if ( ! byView.has( key ) ) {
		byView.set( key, { ...view, undrawn } );
	}
	return byView.get( key );
}

// The state's paint laid over the default property by property, per element and width: a property the state does not
// carry (a state that keeps only what its render shape changes) keeps the default's value.
function overlay( base, top ) {
	const out = { ...base };
	for ( const [ p, widths ] of Object.entries( top ) ) {
		out[ p ] = { ...( base[ p ] || {} ) };
		for ( const [ w, styles ] of Object.entries( widths || {} ) ) {
			out[ p ][ w ] = { ...( base[ p ]?.[ w ] || {} ), ...( styles || {} ) };
		}
	}
	return out;
}

const views = new WeakMap();

// The state's paint laid over the default at one read width only.
function overlayAt( base, top, width ) {
	const one = Object.fromEntries( Object.entries( top || {} ).map( ( [ p, widths ] ) => [ p, widths?.[ width ] ? { [ width ]: widths[ width ] } : {} ] ) );
	return overlay( base, one );
}

// The calibration as Fill judges `node` with it: the default paint with the first matching paint state's elements laid
// over it, or the calibration itself when no state matches (or the block has none). The view is built once per state.
// A node whose way of drawing differs by device (lib/fill-device-mode.mjs::deviceModes, given the block's `fixture` and
// `schema`) is judged per read width: each width's paint is the state matching the node as it draws there, and the view
// carries `modeAt`, the fixture variants in force at each width. A view of a node that never draws some of the look's
// parts carries them as `undrawn` (undrawnParts), which lib/fill-same-box.mjs::calSameBox never counts as the root's box.
export function calibrationForNode( raw, node, { fixture = null, schema = null } = {} ) {
	return withUndrawn( stateView( raw, node, { fixture, schema } ), raw, node );
}

// The view `calibrationForNode` gives before the parts the node never draws are named.
function stateView( raw, node, { fixture, schema } ) {
	const cal = raw && node ? withNodeValues( raw, node.attributes || {}, schema ) : raw;
	const modeAt = cal && node && fixture ? deviceModes( fixture, schema, node.attributes || {} ) : null;
	if ( modeAt ) {
		return perWidthView( cal, node, modeAt, modeKeys( fixture, schema ), schema );
	}
	const states = cal?.paintStates;
	if ( ! states || ! node ) {
		return cal;
	}
	const name = Object.keys( states ).find( ( k ) => matchesPaintState( states[ k ].when, node ) );
	if ( undefined === name ) {
		return cal;
	}
	const byState = views.get( cal ) || new Map();
	views.set( cal, byState );
	if ( ! byState.has( name ) ) {
		byState.set( name, { ...cal, elements: overlay( cal.elements || {}, states[ name ].elements || {} ), paintState: name } );
	}
	return byState.get( name );
}

// The per-width view of a node whose mode differs by device: built once per set of states and modes.
function perWidthView( cal, node, modeAt, keys, schema ) {
	const states = cal.paintStates || {};
	const at = Object.fromEntries( MODE_WIDTHS.map( ( w ) => [ w, Object.keys( states ).find( ( k ) => matchesPaintState( states[ k ].when, { ...node, attributes: attributesAt( node.attributes, keys, w, schema ) } ) ) ?? null ] ) );
	const key = JSON.stringify( [ at, modeAt ] );
	const byState = views.get( cal ) || new Map();
	views.set( cal, byState );
	if ( ! byState.has( key ) ) {
		const elements = MODE_WIDTHS.reduce( ( els, w ) => ( at[ w ] ? overlayAt( els, states[ at[ w ] ].elements, w ) : els ), cal.elements || {} );
		// `paintState` names the state of the widest read width, where Fill judges a value that holds at every width.
		byState.set( key, { ...cal, elements, modeAt, paintStateAt: at, ...( at[ 1440 ] ? { paintState: at[ 1440 ] } : {} ) } );
	}
	return byState.get( key );
}
