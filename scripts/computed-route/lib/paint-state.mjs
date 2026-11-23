// A block's paint states (calibration-fixtures.json `paintStates`, measured by calibrate.mjs into the default paint file):
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
// carries `modeAt`, the fixture variants in force at each width.
export function calibrationForNode( raw, node, { fixture = null, schema = null } = {} ) {
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
