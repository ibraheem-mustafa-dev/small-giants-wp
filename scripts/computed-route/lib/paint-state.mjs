// A block's paint states (calibration-fixtures.json `paintStates`, measured by calibrate.mjs into the default paint file):
// ways the block renders whose resting paint differs from its default instance's. An empty Floating layer renders as an
// inert shape (pointer-events none) while the default instance holds blocks (pointer-events auto); judged against the
// default paint, the empty layer's draft row read as a missing setting though the page already matched. Fill judges a
// node that matches a state against that state's paint.
//
// A state's `when`: { inner (true: the node holds inner blocks; false: it holds none), has: [ attributes of which at least
// one is set ], lacks: [ attributes of which none is set ] }; a key left out is not tested. The first state that matches
// wins.

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
	return ! ( Array.isArray( when.lacks ) && when.lacks.some( ( a ) => isSet( attrs[ a ] ) ) );
}

const views = new WeakMap();

// The calibration as Fill judges `node` with it: the default paint with the first matching paint state's elements laid
// over it, or the calibration itself when no state matches (or the block has none). The view is built once per state.
export function calibrationForNode( cal, node ) {
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
		byState.set( name, { ...cal, elements: { ...( cal.elements || {} ), ...( states[ name ].elements || {} ) }, paintState: name } );
	}
	return byState.get( name );
}
