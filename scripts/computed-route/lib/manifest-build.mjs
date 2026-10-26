// The surfaces manifest builder (Spec 48 section 2): one sites/<client>/build/surfaces.json entry per confirmed
// page-map row that has a post id, one per shop row (`shop`, `product`, `product_cat`), whose target is the template
// its tree builds (FR-48-56), not a post, and one `template-<slug>` entry per other template the site serves (its own
// copy, lib/template-copies.mjs). Pure functions over parsed files; manifest.mjs reads and writes them.
import { builtTemplate, rowKey } from './site-build-map.mjs';
import { WHOLE_TREE, copySource, rowsOf, servedTemplates } from './template-copies.mjs';
import { wooContentRole } from './site-build-plan.mjs';
// Post type -> key prefix. `page`, `sgs_header` and `sgs_footer` keep their slug.
export const PREFIXES = { sgs_mega_menu: 'mega-', sgs_drawer: 'drawer-', sgs_modal: 'modal-', sgs_form: 'form-', sgs_choice_flow: 'flow-' };
// Post type -> handoff record kind.
// A shop row's handoff record is its route's page record.
export const KINDS = { sgs_header: 'header', sgs_footer: 'footer', sgs_drawer: 'drawer', sgs_mega_menu: 'menu', sgs_modal: 'modal', sgs_form: 'form', page: 'page', shop: 'page', product: 'page', product_cat: 'page', post: 'page', template: 'page' };
// A draft post's route is its page record's `page_key`, so every post row matches like a page row. The posts share one theme
// template, the site's own copy of this one (FR-48-56), shaped from the first post row; each post row is content-only.
export const POST_TEMPLATE = 'single';
// The manifest key of a template copy's surface.
export const templateKey = ( slug ) => `template-${ slug }`;
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

// The component name a form record stands for: its `dc` in kebab case without a trailing `-form` (`EnquiryForm` is
// `enquiry`, `TradeApplication` is `trade-application`).
const formName = ( dc ) => String( dc ?? '' ).replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ).replace( /-form$/, '' );

// Whether a form row sits on a form record's page. A row that names its route is matched by the record's `page_key`; any
// other form row carries only its slug (without the `form-` prefix), which is the page's own key for a form inline in the
// entry draft (`careers`) and the component's name for a form mounted from its own file (`enquiry` for `EnquiryForm`).
// A form's title is its heading in the draft, never a key, so it is not read.
function formOnPage( row, r ) {
	if ( null != row.route ) {
		return null != r.page_key && r.page_key === pageKeyOf( String( row.route ).replace( /^\//, '' ) );
	}
	const slug = String( row.slug ).replace( /^form-/, '' );
	return r.page_key === slug || ( null != r.dc && formName( r.dc ) === slug );
}

// The handoff record id a page-map row names (`draftId: 'surfaces.json <id>'`), or null.
const rowRecordId = ( row ) => /^surfaces\.json (\S+)$/.exec( String( row?.draftId ?? '' ) )?.[ 1 ] ?? null;

// The handoff record of a row: { record } or { reason }. A row naming its record by id takes that record; any other row
// is matched by kind, then a page by page_key, a form by its page, another kind by name.
export function matchRecord( row, records ) {
	const id = rowRecordId( row );
	const named = null != id ? records.filter( ( r ) => r.id === id ) : [];
	if ( 1 === named.length ) {
		return { record: named[ 0 ] };
	}
	const kind = KINDS[ row.postType ];
	if ( ! kind ) {
		return { reason: `no record kind for post type ${ row.postType }` };
	}
	let mine = records.filter( ( r ) => r.kind === kind );
	if ( 'page' === kind ) {
		mine = mine.filter( ( r ) => null != row.route && r.page_key === pageKeyOf( row.route ) );
	} else if ( 'form' === kind ) {
		mine = mine.filter( ( r ) => formOnPage( row, r ) );
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

// Intake's record with the matched handoff record's id, else the one of the same kind whose name matches the row (a page
// by page_key), or null.
function intakeRecord( row, intake, record ) {
	const kind = KINDS[ row.postType ];
	const all = intake?.inventory?.surfaces?.records || [];
	const byId = all.filter( ( r ) => null != record?.id && r.id === record.id );
	if ( 1 === byId.length ) {
		return byId[ 0 ];
	}
	const found = all.filter( ( r ) => r.kind === kind && ( 'form' === kind ? formOnPage( row, r ) : 'page' === kind ? null != row.route && r.page_key === pageKeyOf( row.route ) : norm( r.name ) === norm( row.title ) ) );
	return 1 === found.length ? found[ 0 ] : null;
}

// The slug of intake's skeleton entry whose id is the matched handoff record's id (never by position), or null.
function intakeSurfaceOf( record, intake ) {
	const found = Object.entries( intake?.skeletons || {} ).filter( ( [ , x ] ) => null != record?.id && x?.id === record.id );
	return 1 === found.length ? found[ 0 ][ 0 ] : null;
}

const nameSet = ( record ) => [ ...new Set( ( record.states || [] ).map( ( s ) => s.name ) ) ].sort();

// The post row the single-post template is shaped from: the first post row of the page map, or null with none.
export const templateSource = ( rows ) => rows.find( ( r ) => 'post' === r.postType ) ?? null;

// A page row whose page surface is Filled and built into its post (not WooCommerce's own page, whose content is kept).
const filledPage = ( r ) => 'page' === r.postType && null != r.id && ! wooContentRole( r );

// The template copy surfaces (FR-48-56), one per template the site serves that is not a shop row's own: { slug, key, copy,
// row } with `copy.from` 'pages' (the shell the Filled pages in `copy.surfaces` share, so it needs no Fill of its own),
// 'fill' (read and Filled at `row`, the surface playing it: the first post for `single`, a WooCommerce page, a `template`
// row) or 'page' (the site's own page copy's shell around the theme's own content; no draft surface plays it).
export function templateSurfaces( rows ) {
	const out = [];
	for ( const slug of servedTemplates( rows ) ) {
		const how = copySource( rows, slug );
		const mine = rowsOf( rows, slug );
		if ( ! how || ( WHOLE_TREE.includes( slug ) && mine.some( builtTemplate ) ) ) {
			continue;
		}
		if ( 'page' === how ) {
			out.push( { slug, key: templateKey( slug ), copy: { from: 'page' }, row: null } );
		} else if ( mine.every( filledPage ) ) {
			out.push( { slug, key: templateKey( slug ), copy: { from: 'pages', surfaces: mine.map( surfaceKey ) }, row: mine[ 0 ] } );
		} else {
			const row = 'single' === slug ? templateSource( rows ) : mine[ 0 ];
			row && out.push( { slug, key: templateKey( slug ), copy: { from: 'fill', row: rowKey( row ) }, row } );
		}
	}
	return out;
}

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
	const out = { entries, unresolved: [], unmatched: [], pointer: [], dropped: [], disagree: [], skipped: [], added: {}, stale: [], noIntake: [], noFacts: [], matched: {} };
	const copies = templateSurfaces( rows );
	const shellOf = new Map( copies.filter( ( c ) => 'pages' === c.copy.from ).flatMap( ( c ) => c.copy.surfaces.map( ( k ) => [ k, c.slug ] ) ) );
	const mapKeys = new Set( [ ...rows.flatMap( ( r ) => { try { return [ surfaceKey( r ) ]; } catch { return []; } } ), ...copies.map( ( c ) => c.key ) ] );
	out.stale = Object.keys( existing ).filter( ( k ) => ! mapKeys.has( k ) );
	// A template copy is a surface of its own beside the rows: a page-map row giving its key is a clash.
	const claim = ( key, what ) => {
		if ( owner.has( key ) ) {
			throw new Error( `page-map rows ${ owner.get( key ) } and ${ what } both give the key ${ key }` );
		}
		owner.set( key, what );
	};
	copies.forEach( ( c ) => claim( c.key, `the ${ c.slug } template${ c.row ? ` (from ${ rowKey( c.row ) })` : '' }` ) );
	// A template copy that needs no Fill of its own (from the Filled pages' shell, or the page copy's) reads no draft.
	for ( const c of copies.filter( ( x ) => 'fill' !== x.copy.from ) ) {
		if ( only && ! only.includes( c.key ) ) {
			continue;
		}
		const entry = { tree: `trees/template/${ c.slug }.json`, envFile: target.envFile, envKey: target.envKey, site, target: { template: c.slug }, canvas: true, copy: c.copy, states: { resting: null } };
		const have = Object.hasOwn( existing, c.key ) ? existing[ c.key ] : null;
		const added = have ? Object.keys( entry ).filter( ( f ) => ! Object.hasOwn( have, f ) ) : [];
		added.length && ( out.added[ c.key ] = added );
		entries[ c.key ] = have ? { ...entry, ...have, copy: c.copy } : entry;
	}
	const filled = copies.filter( ( c ) => 'fill' === c.copy.from );
	for ( const row of [ ...rows, ...filled.map( ( c ) => ( { ...c.row, templateOf: c } ) ) ] ) {
		const isTemplate = !! row.templateOf;
		if ( ! isTemplate && null == row.id && ! builtTemplate( row ) ) {
			out.skipped.push( { row: `${ row.postType }:${ row.slug }`, reason: 'no id' } );
			continue;
		}
		const key = isTemplate ? row.templateOf.key : surfaceKey( row );
		isTemplate || claim( key, `${ row.postType }:${ row.slug }` );
		if ( only && ! only.includes( key ) ) {
			continue;
		}
		const have = Object.hasOwn( existing, key ) ? existing[ key ] : null;
		// A hand-set `states` is kept as it is, so the generated states' listings stay out of the run.
		const handSet = !! have && Object.hasOwn( have, 'states' );
		const mine = { unresolved: [], pointer: [], dropped: [], disagree: [] };
		const match = matchRecord( row, records );
		let states = { resting: null };
		if ( ! match.record && ! KINDS[ row.postType ] ) {
			out.unmatched.push( { key, reason: 'states-unmatched', why: `no match rule for post type ${ row.postType }` } );
		} else if ( match.record && ( match.record.states || [] ).length ) {
			const ctx = facts?.state?.[ match.record.dc ] ?? null;
			const got = statesOf( match.record, vocab, ctx );
			! handSet && got.noContext.length && out.noFacts.push( { key, why: facts ? `facts.json holds no state keys for ${ match.record.dc }` : 'no facts.json: run intake first', names: got.noContext } );
			states = got.states;
			got.pointer.forEach( ( name ) => mine.pointer.push( { key, name } ) );
			got.dropped.forEach( ( name ) => mine.dropped.push( { key, name } ) );
			const theirs = intakeRecord( row, intake, match.record );
			if ( theirs && nameSet( theirs ).join( '\n' ) !== nameSet( match.record ).join( '\n' ) ) {
				mine.disagree.push( { key, handoff: nameSet( match.record ), intake: nameSet( theirs ) } );
			}
		} else {
			mine.unresolved.push( { key, reason: 'states-unresolved', why: match.reason || `record ${ match.record.id } has no states` } );
		}
		match.record && ( out.matched[ key ] = match.record.id );
		// The entry's link to its intake skeleton, through the handoff record both carry; none when intake has no skeleton for it.
		const intakeSurface = intakeSurfaceOf( match.record, intake );
		null === intakeSurface && ! ( have && Object.hasOwn( have, 'intakeSurface' ) ) && out.noIntake.push( { key, why: match.record ? `no intake skeleton has the id ${ match.record.id }` : 'no handoff record matched' } );
		const entry = {
			tree: isTemplate ? `trees/template/${ row.templateOf.slug }.json` : `trees/${ row.postType }/${ row.slug }.json`,
			...( intakeSurface ? { intakeSurface } : {} ),
			envFile: target.envFile,
			envKey: target.envKey,
			site,
			target: isTemplate ? { template: row.templateOf.slug } : builtTemplate( row ) ? { template: builtTemplate( row ) } : { postId: row.id },
			...( 'page' === row.postType && ! isTemplate ? {} : { canvas: true } ),
			...( isTemplate ? { copy: row.templateOf.copy } : builtTemplate( row ) ? { copy: { from: 'whole' } } : shellOf.has( key ) ? { shell: shellOf.get( key ) } : {} ),
			walker: `qa/parity/${ key }.fill-base.mjs`,
			walkerFull: `qa/parity/${ key }.fill.mjs`,
			draftDir: `sites/${ client }/handoff`,
			draftIndex: draftFor( match.record, drafts ),
			// A form or a post is read on its page's route; the record's `route` is that page.
			...( ( 'form' === KINDS[ row.postType ] || 'post' === row.postType ) && match.record?.route ? { draftRoute: match.record.route } : {} ),
			states,
			...( isTemplate && 'post' === row.postType ? { fromPost: surfaceKey( row ) } : ! isTemplate && 'post' === row.postType ? { contentOnly: true } : {} ),
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
