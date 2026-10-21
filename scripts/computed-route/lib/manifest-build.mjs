// The surfaces manifest builder (Spec 48 section 2): one sites/<client>/build/surfaces.json entry per confirmed
// page-map row that has a post id. Pure functions over parsed files; manifest.mjs reads and writes them.
import { vocabStateFor } from './state-map.mjs';

// Post type -> key prefix. `page`, `sgs_header` and `sgs_footer` keep their slug.
export const PREFIXES = { sgs_mega_menu: 'mega-', sgs_drawer: 'drawer-', sgs_modal: 'modal-', sgs_form: 'form-', sgs_choice_flow: 'flow-' };
// Post type -> handoff record kind.
export const KINDS = { sgs_header: 'header', sgs_footer: 'footer', sgs_drawer: 'drawer', sgs_mega_menu: 'menu', sgs_modal: 'modal', sgs_form: 'form', page: 'page' };
// Post type -> the template parts or form a surface provides.
const PROVIDES = { sgs_header: () => [ 'core/template-part:header' ], sgs_footer: () => [ 'core/template-part:footer' ], sgs_form: ( row ) => [ `sgs/form:${ row.slug }` ] };

const words = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );
const norm = ( s ) => String( s ?? '' ).toLowerCase().trim();

export function surfaceKey( row ) {
	const prefix = PREFIXES[ row.postType ] || '';
	return row.slug.startsWith( prefix ) ? row.slug : `${ prefix }${ row.slug }`;
}

// The walker-state key of a handoff state name: a trailing parenthesised qualifier dropped, runs of non-alphanumerics
// one `-`, no leading or trailing `-`.
export function walkerKey( name ) {
	const slug = ( s ) => String( s ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
	return slug( String( name ).replace( /\s*\([^)]*\)\s*$/, '' ) ) || slug( name );
}

// The setting state of a handoff state: the vocabulary state its keys stand for, else the first vocabulary state word
// the name contains, else null.
export function settingState( state, vocab ) {
	const keyed = vocabStateFor( state, vocab );
	if ( keyed ) {
		return keyed;
	}
	const have = new Set( words( state.name ) );
	return ( vocab || [] ).map( ( r ) => r.state ).find( ( w ) => have.has( w ) ) ?? null;
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

// Walker states of a record: { key: settingState }, the first of two states with one key kept.
export function statesOf( record, vocab ) {
	const out = {};
	for ( const s of record.states || [] ) {
		const key = walkerKey( s.name );
		if ( key && ! ( key in out ) ) {
			out[ key ] = settingState( s, vocab );
		}
	}
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
// Returns { entries, unresolved, disagree, skipped, added }; throws when two rows give one key.
export function buildManifest( { client, site, rows, records, intake = null, target, entryFile, vocab = [], existing = {} } ) {
	const entries = {};
	const owner = {};
	const out = { entries, unresolved: [], disagree: [], skipped: [], added: {} };
	for ( const row of rows ) {
		if ( null == row.id ) {
			out.skipped.push( { row: `${ row.postType }:${ row.slug }`, reason: 'no id' } );
			continue;
		}
		const key = surfaceKey( row );
		if ( key in owner ) {
			throw new Error( `page-map rows ${ owner[ key ] } and ${ row.postType }:${ row.slug } both give the key ${ key }` );
		}
		owner[ key ] = `${ row.postType }:${ row.slug }`;
		const match = matchRecord( row, records );
		let states = { resting: null };
		if ( match.record && ( match.record.states || [] ).length ) {
			states = statesOf( match.record, vocab );
			const theirs = intakeRecord( row, intake );
			if ( theirs && nameSet( theirs ).join( '\n' ) !== nameSet( match.record ).join( '\n' ) ) {
				out.disagree.push( { key, handoff: nameSet( match.record ), intake: nameSet( theirs ) } );
			}
		} else {
			out.unresolved.push( { key, reason: 'states-unresolved', why: match.reason || `record ${ match.record.id } has no states` } );
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
		const have = existing[ key ];
		if ( have ) {
			const added = Object.keys( entry ).filter( ( f ) => ! ( f in have ) );
			added.length && ( out.added[ key ] = added );
			entries[ key ] = { ...entry, ...have };
		} else {
			entries[ key ] = entry;
		}
	}
	return out;
}
