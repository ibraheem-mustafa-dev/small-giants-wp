// Which motion state a draft's state-triggered animation plays on (Spec 38A §5.2, §9; Spec 48 FR-48-78, FR-48-81): an
// animation the draft's code starts when a state changes (inventory trigger type `state`, its `state_keys` and detail)
// is an `open` entrance when the state is a disclosure opening on a block that opens panels, and a `state` entrance
// naming one of the block's published motion states (`supports.sgs.motion.states`, the data-sgs-motion-state tokens
// of src/shared/effects/motion-state.js) when the state's words spell that name. Names come from the framework DB
// (lib/motion-db.mjs::statesOf, ::opensOf) and the open words from its `states` table (FP-1); no state is named here.

const WORDS = ( text ) => String( text ?? '' ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );

// The last word of a vocabulary token: an attribute's name (or its value when that is a word, not true/empty), a
// class's modifier (`is-open`, `--expanded`).
function tokenWord( token ) {
	const m = /^\[\s*([\w-]+)(?:\s*[~|^$*]?=\s*["']?([^"'\]]*)["']?)?\s*\]?$/.exec( token );
	if ( m ) {
		const value = WORDS( m[ 2 ] ).filter( ( w ) => 'true' !== w );
		return ( value.length ? value : WORDS( m[ 1 ] ) ).pop() ?? null;
	}
	return WORDS( token ).pop() ?? null;
}

// The words that mean "a disclosure is open" in a draft's state names: the `open` state word and the last word of each
// attribute or class token the vocabulary lists for it (`expanded` from `[aria-expanded="true"]`), less any word that
// names another state (`active`). rows: the `states` table (lib/state-vocab.mjs::stateRows).
export function openWords( rows ) {
	const others = new Set( rows.filter( ( r ) => 'open' !== r.state ).map( ( r ) => r.state ) );
	const words = rows.filter( ( r ) => 'open' === r.state && 'pseudo-class' !== r.kind ).map( ( r ) => tokenWord( r.token ) );
	return new Set( [ 'open', ...words ].filter( ( w ) => w && ! others.has( w ) ) );
}

// Whether `needle` words appear in `hay` in order and adjacent.
const hasRun = ( hay, needle ) => needle.length > 0 && hay.some( ( _, i ) => needle.every( ( w, k ) => hay[ i + k ] === w ) );

// The trigger a state-triggered record plays on, or null when the record is not one or names no state this block
// publishes: { trigger: 'open' } for a disclosure opening on a part the block opens (`opens` lists them), else
// { trigger: 'state', state: '<name>' } for a named motion state (the longest name its words spell, else the one
// published state whose last word is an open word, `menu-open`). `offers`: { names, opens, openWords } (the
// open words as a Set or a function returning one); `target`: the part the record's element is.
const DISCLOSURE = /\bchanges? to (?:a )?non-null\b|\bbecomes? non-null\b|\bfalse\s*(?:→|->)\s*true\b/i;

export function stateTrigger( record, offers, target = 'root' ) {
	if ( 'state' !== record.trigger?.type ) {
		return null;
	}
	const hay = [ ...( record.trigger.state_keys || [] ).flatMap( WORDS ), ...WORDS( record.trigger.detail ) ];
	// The open words are read from the vocabulary only when a record needs them (`openWords` may be a function).
	const words = () => ( 'function' === typeof offers.openWords ? offers.openWords() : offers.openWords );
	// A part the block opens (a panel, a drawer body) plays on the disclosure opening, whatever the state is called.
	if ( ( offers.opens || [] ).includes( target ) && words() && hay.some( ( w ) => words().has( w ) ) ) {
		return { trigger: 'open' };
	}
	// A state that picks which panel is showing (`active` is null while none is) opens the panel when it becomes non-null.
	if ( ( offers.opens || [] ).includes( target ) && DISCLOSURE.test( String( record.trigger.detail ?? '' ) ) ) {
		return { trigger: 'open' };
	}
	const name = [ ...( offers.names || [] ) ].filter( ( n ) => hasRun( hay, WORDS( n ) ) ).sort( ( a, b ) => WORDS( b ).length - WORDS( a ).length )[ 0 ];
	if ( name ) {
		return { trigger: 'state', state: name };
	}
	const open = words();
	if ( ! open || ! hay.some( ( w ) => open.has( w ) ) ) {
		return null;
	}
	const opening = ( offers.names || [] ).filter( ( n ) => open.has( WORDS( n ).pop() ) );
	return 1 === opening.length ? { trigger: 'state', state: opening[ 0 ] } : null;
}
