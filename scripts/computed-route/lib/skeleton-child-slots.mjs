// What a block that draws the draft's children itself still needs from them (Spec 48 FR-48-6): the draft elements its
// calibrated child slots are measured on, and the width its navigation collapses at. Both are read from the draft's code
// (the handoff record's states and the inventory's sc-if membership), never from a name.
const wordsOf = ( s ) => String( s ?? '' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );
const scIfIds = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-if' === x.kind ).map( ( x ) => String( x.tpl ) );

// The element and every element below it.
const withinTree = ( m, e ) => [ e, ...m.kids( e ).flatMap( ( k ) => withinTree( m, k ) ) ];

// draftSlots for a drawing block's repeated child. `cfg` is the block's `rules.drawsChildren` entry `childSlots`
// ({ resting: <setting>, current: <setting> }: the calibration settings measured on a resting and on the current child).
// The slot path is the setting's own `slot` in the block's calibration; the resting child is the first child no current-state
// `sc-if` renders in, the current child the one a current-state `sc-if` renders in (the handoff state whose name says the
// calibrated state). Returns { slots: { <path>: finder }, notes: [text] }.
export function childSlots( { cfg, items, m, finder, settings = {}, states = [] } ) {
	const out = { slots: {}, notes: [] };
	if ( ! cfg ) {
		return out;
	}
	const slotOf = ( name ) => settings[ name ]?.slot || null;
	const rest = slotOf( cfg.resting );
	const cur = slotOf( cfg.current );
	! rest && out.notes.push( `the calibration has no slot for ${ cfg.resting }, so no resting child slot` );
	! cur && out.notes.push( `the calibration has no slot for ${ cfg.current }, so no current child slot` );
	const stateWord = settings[ cfg.current ]?.state;
	const state = stateWord ? states.find( ( s ) => wordsOf( s.name ).includes( stateWord ) ) : null;
	const marks = new Set( ( state?.sc_if_tpl_ids || [] ).map( String ) );
	const isCurrent = ( it ) => marks.size > 0 && withinTree( m, it ).some( ( x ) => scIfIds( x ).some( ( id ) => marks.has( id ) ) );
	const resting = items.find( ( it ) => ! isCurrent( it ) );
	const current = items.find( isCurrent );
	rest && ( resting ? out.slots[ rest ] = finder( resting ) : out.notes.push( 'every draft child is marked current, so no resting child' ) );
	cur && ( current ? out.slots[ cur ] = finder( current ) : out.notes.push( `no draft child is rendered by a "${ stateWord }" sc-if, so no current child slot` ) );
	return out;
}

// The width a navigation element collapses at: the one `>= N` width threshold, N a threshold the draft's code uses, of the
// handoff states whose sc-if shows the element. Returns { value } or { note }.
export function collapsePoint( { e, states = [], thresholds = [] } ) {
	const ids = new Set( scIfIds( e ) );
	const found = new Set();
	for ( const s of states.filter( ( x ) => ( x.sc_if_tpl_ids || [] ).some( ( id ) => ids.has( String( id ) ) ) ) ) {
		const m = /(?:≥|>=)\s*(\d+)/.exec( s.how_to_reach || '' );
		m && thresholds.includes( Number( m[ 1 ] ) ) && found.add( Number( m[ 1 ] ) );
	}
	return 1 === found.size ? { value: [ ...found ][ 0 ] } : { note: `${ found.size } width thresholds show this navigation, so no collapse point` };
}
