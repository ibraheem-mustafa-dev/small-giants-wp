// The surfaces manifest builder (Spec 48 section 2): one sites/<client>/build/surfaces.json entry per confirmed
// page-map row that has a post id, and one per shop row (`shop`, `product`, `product_cat`), whose target is the template
// its tree builds (FR-48-56), not a post. Pure functions over parsed files; manifest.mjs reads and writes them.
import { builtTemplate } from './site-build-map.mjs';
// Post type -> key prefix. `page`, `sgs_header` and `sgs_footer` keep their slug.
export const PREFIXES = { sgs_mega_menu: 'mega-', sgs_drawer: 'drawer-', sgs_modal: 'modal-', sgs_form: 'form-', sgs_choice_flow: 'flow-' };
// Post type -> handoff record kind.
// A shop row's handoff record is its route's page record.
export const KINDS = { sgs_header: 'header', sgs_footer: 'footer', sgs_drawer: 'drawer', sgs_mega_menu: 'menu', sgs_modal: 'modal', page: 'page', shop: 'page', product: 'page', product_cat: 'page' };
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

// The page_key a page-map route names: the base name of a draft file route (`Home.dc.html`, any query string or fragment
// ignored) is the file's `page_key` (`Home`); any other route is its own key.
export function pageKeyOf( route ) {
	const file = /^([^?#]+\.dc\.html)(?:[?#].*)?$/i.exec( String( route ?? '' ) );
	return file ? file[ 1 ].split( '/' ).pop().replace( /\.dc\.html$/i, '' ) : route;
}

// The draft file a surface is read from, out of the export's `entry_drafts`: the one whose base name is the record's `dc`
// (the component that declares the surface), else the first entry draft, which renders the chrome every page shares.
export function draftFor( record, drafts ) {
	return ( record?.dc && drafts.find( ( d ) => pageKeyOf( d ) === record.dc ) ) || drafts[ 0 ];
}

// The handoff record of a row: { record } or { reason }.
export function matchRecord( row, records ) {
	const kind = KINDS[ row.postType ];
	if ( ! kind ) {
		return { reason: `no record kind for post type ${ row.postType }` };
	}
	let mine = records.filter( ( r ) => r.kind === kind );
	if ( 'page' === kind ) {
		mine = mine.filter( ( r ) => null != row.route && r.page_key === pageKeyOf( row.route ) );
	} else if ( mine.length > 1 ) {
		mine = mine.filter( ( r ) => norm( r.name ) === norm( row.title ) );
	}
	if ( 1 === mine.length ) {
		return { record: mine[ 0 ] };
	}
	return { reason: 0 === mine.length ? `no ${ kind } record matches` : `${ mine.length } ${ kind } records match (${ mine.map( ( r ) => r.id ).join( ', ' ) })` };
}

// Whether a `state_keys` value is a set one: not null, false, zero, empty, an empty object or array (or its text), or a
// negative index (-1 names no item).
const isSet = ( v ) => {
	if ( null == v || false === v || '' === v || 0 === v || ( 'number' === typeof v && v < 0 ) ) {
		return false;
	}
	if ( Array.isArray( v ) ) {
		return v.length > 0;
	}
	if ( 'object' === typeof v ) {
		return Object.keys( v ).length > 0;
	}
	return ! /^\s*(\{\s*\}|\[\s*\]|null|false|0)\s*$/.test( String( v ) );
};

// Whether a state of an open-able surface sets one of the draft's real state keys. With the draft's state context
// (`ctx`: the fact record's `state[<dc>]`, { keys, widthKeys }: the keys of the logic's class state, and those it derives
// from the width) a key is derived when it is not a state key (its first segment, for a dotted path: an `R.*` responsive
// object, a loop item's field and a computed value are not keys of the state) or is a width key; a state that sets a
// transient flag (a key starting `_`, such as a drawer's `_closing`) is a transition between two states, not a look of its
// own. A value that is a width comparison (`{"w": ">= 1060"}`) is a width state too: a breakpoint is read per width by
// the walker, never a walker state of its own. With no context the key names `R`, `item`, `bp` and the dotted-path rule
// over the record's own keys stand in for it.
const WIDTH_VALUE = /^\s*(>=|<=|>|<|=)\s*\d/;
const widthValue = ( value ) => 'string' === typeof value && WIDTH_VALUE.test( value );
const transient = ( state ) => Object.entries( state.state_keys || {} ).some( ( [ key, value ] ) => key.startsWith( '_' ) && isSet( value ) );
function setsRealKey( state, stateKeys, ctx ) {
	if ( transient( state ) ) {
		return false;
	}
	const own = ctx ? new Set( ctx.keys ) : stateKeys;
	const widthKeys = new Set( ctx?.widthKeys || [] );
	return Object.entries( state.state_keys || {} ).some( ( [ key, value ] ) => {
		const first = key.split( '.' )[ 0 ];
		const derived = widthValue( value ) || widthKeys.has( first ) || ( ctx
			? ! own.has( first )
			: 'R' === first || 'item' === first || 'bp' === key || ( key.includes( '.' ) && ! own.has( first ) ) );
		return ! derived && isSet( value );
	} );
}

// Walker states of a record: { states: { key: settingState }, pointer, dropped }. Pointer states (hover, focus, active) are
// matched first and are not walker states; an open-able surface keeps a state named open or expanded, or one that sets a
// real state key (setsRealKey), as each panel of a mega menu does (`{"mega":"sun"}`). Source order, the
// first of two states with one key kept; no state left gives { resting: null }. `ctx` is the draft's state context
// (setsRealKey); with none, `noContext` lists the names decided by the fallback key names.
export function statesOf( record, vocab, ctx = null ) {
	const out = { states: {}, pointer: [], dropped: [], noContext: [] };
	const seen = new Map();
	const openable = OPENABLE.includes( record.kind );
	const stateKeys = new Set( ( record.states || [] ).flatMap( ( s ) => Object.keys( s.state_keys || {} ) ).filter( ( k ) => ! k.includes( '.' ) ) );
	for ( const s of record.states || [] ) {
		const have = new Set( words( s.name ) );
		if ( POINTER_WORDS.some( ( w ) => have.has( w ) ) ) {
			out.pointer.push( s.name );
		} else if ( openable && ! have.has( 'open' ) && ! have.has( 'expanded' ) && ! setsRealKey( s, stateKeys, ctx ) ) {
			out.dropped.push( s.name );
			ctx || out.noContext.push( s.name );
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
	const found = ( intake?.inventory?.surfaces?.records || [] ).filter( ( r ) => r.kind === kind && ( 'page' === kind ? null != row.route && r.page_key === pageKeyOf( row.route ) : norm( r.name ) === norm( row.title ) ) );
	return 1 === found.length ? found[ 0 ] : null;
}

// The slug of intake's skeleton entry whose id is the matched handoff record's id (never by position), or null.
function intakeSurfaceOf( record, intake ) {
	const found = Object.entries( intake?.skeletons || {} ).filter( ( [ , x ] ) => null != record?.id && x?.id === record.id );
	return 1 === found.length ? found[ 0 ][ 0 ] : null;
}

const nameSet = ( record ) => [ ...new Set( ( record.states || [] ).map( ( s ) => s.name ) ) ].sort();

// Builds the manifest. `target` is the calibration target ({ envFile, envKey }), `entryFiles` the export's entry drafts
// (`entryFile` for an export with one); each surface takes the draft draftFor names.
// `only` limits the run to those keys. `facts` is the client's fact record (`state[<dc>]` gives statesOf its context). Returns { entries, unresolved, unmatched, pointer, dropped, disagree, skipped, added, stale, noIntake, noFacts }; throws when two rows give one key.
export function buildManifest( { client, site, rows, records, intake = null, facts = null, target, entryFile = null, entryFiles = null, vocab = [], existing = {}, only = null } ) {
	const isPlain = ( v ) => null !== v && 'object' === typeof v && ! Array.isArray( v );
	if ( ! isPlain( existing ) || Object.values( existing ).some( ( v ) => ! isPlain( v ) ) ) {
		throw new Error( 'the existing surfaces.json is not an object of entry objects' );
	}
	const drafts = entryFiles || [ entryFile ];
	const entries = {};
	const owner = new Map();
	const out = { entries, unresolved: [], unmatched: [], pointer: [], dropped: [], disagree: [], skipped: [], added: {}, stale: [], noIntake: [], noFacts: [] };
	const mapKeys = new Set( rows.flatMap( ( r ) => { try { return [ surfaceKey( r ) ]; } catch { return []; } } ) );
	out.stale = Object.keys( existing ).filter( ( k ) => ! mapKeys.has( k ) );
	for ( const row of rows ) {
		if ( null == row.id && ! builtTemplate( row ) ) {
			out.skipped.push( { row: `${ row.postType }:${ row.slug }`, reason: 'no id' } );
			continue;
		}
		const key = surfaceKey( row );
		if ( owner.has( key ) ) {
			throw new Error( `page-map rows ${ owner.get( key ) } and ${ row.postType }:${ row.slug } both give the key ${ key }` );
		}
		owner.set( key, `${ row.postType }:${ row.slug }` );
		if ( only && ! only.includes( key ) ) {
			continue;
		}
		const have = Object.hasOwn( existing, key ) ? existing[ key ] : null;
		// A hand-set `states` is kept as it is, so the generated states' listings stay out of the run.
		const handSet = !! have && Object.hasOwn( have, 'states' );
		const mine = { unresolved: [], pointer: [], dropped: [], disagree: [] };
		const match = matchRecord( row, records );
		let states = { resting: null };
		if ( ! KINDS[ row.postType ] ) {
			out.unmatched.push( { key, reason: 'states-unmatched', why: `no match rule for post type ${ row.postType }` } );
		} else if ( match.record && ( match.record.states || [] ).length ) {
			const ctx = facts?.state?.[ match.record.dc ] ?? null;
			const got = statesOf( match.record, vocab, ctx );
			! handSet && got.noContext.length && out.noFacts.push( { key, why: facts ? `facts.json holds no state keys for ${ match.record.dc }` : 'no facts.json: run intake first', names: got.noContext } );
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
		// The entry's link to its intake skeleton, through the handoff record both carry; none when intake has no skeleton for it.
		const intakeSurface = intakeSurfaceOf( match.record, intake );
		null === intakeSurface && ! ( have && Object.hasOwn( have, 'intakeSurface' ) ) && out.noIntake.push( { key, why: match.record ? `no intake skeleton has the id ${ match.record.id }` : 'no handoff record matched' } );
		const entry = {
			tree: `trees/${ row.postType }/${ row.slug }.json`,
			...( intakeSurface ? { intakeSurface } : {} ),
			envFile: target.envFile,
			envKey: target.envKey,
			site,
			target: builtTemplate( row ) ? { template: builtTemplate( row ) } : { postId: row.id },
			...( 'page' === row.postType ? {} : { canvas: true } ),
			walker: `qa/parity/${ key }.fill-base.mjs`,
			walkerFull: `qa/parity/${ key }.fill.mjs`,
			draftDir: `sites/${ client }/handoff`,
			draftIndex: draftFor( match.record, drafts ),
			states,
			...( PROVIDES[ row.postType ] ? { provides: PROVIDES[ row.postType ]( row ) } : {} ),
		};
		if ( ! handSet ) {
			Object.keys( mine ).forEach( ( list ) => out[ list ].push( ...mine[ list ] ) );
		}
		// A hand-set draftUrl names the draft, so the generated draftDir and draftIndex are not added beside it.
		if ( have && Object.hasOwn( have, 'draftUrl' ) ) {
			delete entry.draftDir;
			delete entry.draftIndex;
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
