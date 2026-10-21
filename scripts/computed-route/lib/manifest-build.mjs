// The surfaces manifest builder (Spec 48 section 2): one sites/<client>/build/surfaces.json entry per confirmed
// page-map row that has a post id. Pure functions over parsed files; manifest.mjs reads and writes them.
// Post type -> key prefix. `page`, `sgs_header` and `sgs_footer` keep their slug.
export const PREFIXES = { sgs_mega_menu: 'mega-', sgs_drawer: 'drawer-', sgs_modal: 'modal-', sgs_form: 'form-', sgs_choice_flow: 'flow-' };
// Post type -> handoff record kind.
export const KINDS = { sgs_header: 'header', sgs_footer: 'footer', sgs_drawer: 'drawer', sgs_mega_menu: 'menu', sgs_modal: 'modal', page: 'page' };
// Post type -> the template parts or form a surface provides.
const PROVIDES = { sgs_header: () => [ 'core/template-part:header' ], sgs_footer: () => [ 'core/template-part:footer' ], sgs_form: ( row ) => [ `sgs/form:${ row.slug }` ] };

const words = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );
const norm = ( s ) => String( s ?? '' ).toLowerCase().trim();

// The manifest key of a row. A slug is lowercase letters, digits and hyphens: it becomes a file name and a path segment.
export function surfaceKey( row ) {
	if ( 'string' !== typeof row.slug || ! /^[a-z0-9][a-z0-9-]*$/.test( row.slug ) ) {
		throw new Error( `page-map row ${ row.postType }:${ row.slug } has no usable slug (lowercase letters, digits and hyphens, starting with a letter or digit)` );
	}
	const prefix = PREFIXES[ row.postType ] || '';
	return row.slug.startsWith( prefix ) ? row.slug : `${ prefix }${ row.slug }`;
}

// The walker-state key of a handoff state name: a trailing parenthesised qualifier dropped, runs of non-alphanumerics
// one `-`, no leading or trailing `-`.
export function walkerKey( name ) {
	const slug = ( s ) => String( s ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
	return slug( String( name ).replace( /\s*\([^)]*\)\s*$/, '' ) ) || slug( name );
}

// The page-condition looks a walker state can hold on the same surface (a header that is scrolled or shrunk, a nav item
// that is current). `open` and `active` are a surface's own reach and the press look, so no walker state maps to them.
const PAGE_LOOKS = [ 'scrolled', 'shrunk', 'current' ];
// Record kinds of open-able surfaces: only their open or expanded states are walker states.
const OPENABLE = [ 'menu', 'drawer', 'modal', 'accordion' ];
const POINTER_WORDS = [ 'hover', 'focus', 'active' ];

// The setting state of a handoff state: a page-condition look that is a vocabulary state and a word of the state's name,
// else null. The state's keys are never read.
export function settingState( state, vocab ) {
	const names = new Set( ( vocab || [] ).map( ( r ) => r.state ) );
	return words( state.name ).find( ( w ) => PAGE_LOOKS.includes( w ) && names.has( w ) ) ?? null;
}

// The handoff record of a row: { record } or { reason }.
export function matchRecord( row, records ) {
	const kind = KINDS[ row.postType ];
	if ( ! kind ) {
		return { reason: `no record kind for post type ${ row.postType }` };
	}
	let mine = records.filter( ( r ) => r.kind === kind );
	if ( 'page' === kind ) {
		mine = mine.filter( ( r ) => null != row.route && r.page_key === row.route );
	} else if ( mine.length > 1 ) {
		mine = mine.filter( ( r ) => norm( r.name ) === norm( row.title ) );
	}
	if ( 1 === mine.length ) {
		return { record: mine[ 0 ] };
	}
	return { reason: 0 === mine.length ? `no ${ kind } record matches` : `${ mine.length } ${ kind } records match (${ mine.map( ( r ) => r.id ).join( ', ' ) })` };
}

// Walker states of a record: { states: { key: settingState }, pointer, dropped }. Pointer states (hover, focus, active) are
// not walker states; an open-able surface keeps only its open or expanded states. Source order, the first of two states
// with one key kept; no state left gives { resting: null }.
export function statesOf( record, vocab ) {
	const out = { states: {}, pointer: [], dropped: [] };
	const seen = new Map();
	const openable = OPENABLE.includes( record.kind );
	for ( const s of record.states || [] ) {
		const have = new Set( words( s.name ) );
		if ( POINTER_WORDS.some( ( w ) => have.has( w ) ) ) {
			out.pointer.push( s.name );
		} else if ( openable && ! have.has( 'open' ) && ! have.has( 'expanded' ) ) {
			out.dropped.push( s.name );
		} else {
			const key = walkerKey( s.name );
			if ( ! key ) {
				out.dropped.push( s.name );
			} else if ( ! seen.has( key ) ) {
				seen.set( key, settingState( s, vocab ) );
			}
		}
	}
	out.states = seen.size ? Object.fromEntries( seen ) : { resting: null };
	return out;
}

// Intake's record of the same kind whose name matches the row (a page by page_key), or null.
function intakeRecord( row, intake ) {
	const kind = KINDS[ row.postType ];
	const found = ( intake?.inventory?.surfaces?.records || [] ).filter( ( r ) => r.kind === kind && ( 'page' === kind ? null != row.route && r.page_key === row.route : norm( r.name ) === norm( row.title ) ) );
	return 1 === found.length ? found[ 0 ] : null;
}

const nameSet = ( record ) => [ ...new Set( ( record.states || [] ).map( ( s ) => s.name ) ) ].sort();

// Builds the manifest. `target` is the calibration target ({ envFile, envKey }), `entryFile` the draft's entry file.
// Returns { entries, unresolved, unmatched, pointer, dropped, disagree, skipped, added }; throws when two rows give one key.
export function buildManifest( { client, site, rows, records, intake = null, target, entryFile, vocab = [], existing = {} } ) {
	const isPlain = ( v ) => null !== v && 'object' === typeof v && ! Array.isArray( v );
	if ( ! isPlain( existing ) || Object.values( existing ).some( ( v ) => ! isPlain( v ) ) ) {
		throw new Error( 'the existing surfaces.json is not an object of entry objects' );
	}
	const entries = {};
	const owner = new Map();
	const out = { entries, unresolved: [], unmatched: [], pointer: [], dropped: [], disagree: [], skipped: [], added: {} };
	for ( const row of rows ) {
		if ( null == row.id ) {
			out.skipped.push( { row: `${ row.postType }:${ row.slug }`, reason: 'no id' } );
			continue;
		}
		const key = surfaceKey( row );
		if ( owner.has( key ) ) {
			throw new Error( `page-map rows ${ owner.get( key ) } and ${ row.postType }:${ row.slug } both give the key ${ key }` );
		}
		owner.set( key, `${ row.postType }:${ row.slug }` );
		const have = Object.hasOwn( existing, key ) ? existing[ key ] : null;
		// A hand-set `states` is kept as it is, so the generated states' listings stay out of the run.
		const handSet = !! have && Object.hasOwn( have, 'states' );
		const mine = { unresolved: [], pointer: [], dropped: [], disagree: [] };
		const match = matchRecord( row, records );
		let states = { resting: null };
		if ( ! KINDS[ row.postType ] ) {
			out.unmatched.push( { key, reason: 'states-unmatched', why: `no match rule for post type ${ row.postType }` } );
		} else if ( match.record && ( match.record.states || [] ).length ) {
			const got = statesOf( match.record, vocab );
			states = got.states;
			got.pointer.forEach( ( name ) => mine.pointer.push( { key, name } ) );
			got.dropped.forEach( ( name ) => mine.dropped.push( { key, name } ) );
			const theirs = intakeRecord( row, intake );
			if ( theirs && nameSet( theirs ).join( '\n' ) !== nameSet( match.record ).join( '\n' ) ) {
				mine.disagree.push( { key, handoff: nameSet( match.record ), intake: nameSet( theirs ) } );
			}
		} else {
			mine.unresolved.push( { key, reason: 'states-unresolved', why: match.reason || `record ${ match.record.id } has no states` } );
		}
		const entry = {
			tree: `${ key }.tree.json`,
			envFile: target.envFile,
			envKey: target.envKey,
			site,
			target: { postId: row.id },
			...( 'page' === row.postType ? {} : { canvas: true } ),
			walker: `qa/parity/${ key }.mjs`,
			walkerFull: `qa/parity/${ key }.full.mjs`,
			draftDir: `sites/${ client }/handoff`,
			draftIndex: entryFile,
			states,
			...( PROVIDES[ row.postType ] ? { provides: PROVIDES[ row.postType ]( row ) } : {} ),
		};
		if ( ! handSet ) {
			Object.keys( mine ).forEach( ( list ) => out[ list ].push( ...mine[ list ] ) );
		}
		if ( have ) {
			const added = Object.keys( entry ).filter( ( f ) => ! Object.hasOwn( have, f ) );
			added.length && ( out.added[ key ] = added );
			entries[ key ] = { ...entry, ...have };
		} else {
			entries[ key ] = entry;
		}
	}
	return out;
}
