// Content coverage (clone coverage register, per-setting): every content setting of an SGS block has exactly one way a
// re-clone fills it from the draft, or a named gap row, so a re-clone never silently leaves a block's default content.
// The group register (data/clone-coverage.json, `block-setting:<role>:<kind>`) marks a whole role covered once ONE writer of
// that role exists; this check works per setting.
//
// The rows come from the framework DB alone (FP-1): every `block_attributes` row of an `sgs/` block whose role the `roles`
// table classifies `content-bearing`. Each row gets the first of these routes that claims it, and every claim comes from the
// writer's OWN selection function, so the check and the writer can never disagree:
//   measured     the block's calibration slot map holds a text, link or presence reading for it
//                (lib/fill-presence.mjs::textSettings, linkSettings, presenceSettings: the settings textDecisions, linkDecisions
//                and presenceDecisions write)
//   list         lib/fill-list-content.mjs::listClaims( listTarget ): the block's one content array, or the content settings of
//                the one child block it allows
//   role-writer  a dedicated writer selects it by its own rule: the skeleton writer (lib/skeleton-write-content.mjs::
//                skeletonSettings), the media writer (lib/fill-media.mjs::mediaSettings), the icon writer (lib/fill-icon.mjs::
//                iconSettings) and the form writer (lib/fill-form.mjs::formSettings)
//   no-element   the DB's emit_shape says the page holds nothing to read the setting from (NO_ELEMENT_SHAPES)
//   gap          a `content-setting:<block>.<setting>` row in data/clone-coverage.json naming the mechanism, owner and wave
// A row with none of these fails the check, and so does a gap row that names a setting the DB no longer holds as content, or
// one whose setting now has a route a to d (a stale gap row must be deleted, never left to hide a later regression).
import fs from 'node:fs';
import { loadCalibration, slotMapFile } from './cache.mjs';
import { textSettings, linkSettings, presenceSettings } from './fill-presence.mjs';
import { listTarget, listClaims } from './fill-list-content.mjs';
import { imageSlots, mediaSettings } from './fill-media.mjs';
import { iconSettings } from './fill-icon.mjs';
import { formSettings } from './fill-form.mjs';
import { skeletonSettings } from './skeleton-write-content.mjs';
import { isContentSettingId, parseContentSettingId } from './clone-coverage.mjs';

// What each emit_shape value (plugins/sgs-blocks/scripts/lib/emit_shape.py) means for a re-clone. A shape in this list says
// the page holds no element a draft could be read from for the setting:
//   script-rendered  the block's front-end script prints the value (a wishlist panel's "saved on" line), so the draft's static
//                    markup carries no element for it
//   editor-only      block.json itself says the editor writes it and nothing renders it
//   output-only      a shared include emits it outside the block's own markup (canonical URL, schema, head tags)
//   context          the block hands it to its child blocks as block context; it prints nothing of its own
// Every other shape names an element the draft DOES draw, so a re-clone must fill it: `nested` (the block's own element),
// `repeater` (one item per element), `child` (the content lives in a child block, which is read like any block) and
// `parent-rendered` (another block prints it, but the draft still shows that text, read from the child block's element).
export const NO_ELEMENT_SHAPES = [ 'script-rendered', 'editor-only', 'output-only', 'context' ];

export const ROUTES = [ 'measured', 'list', 'role-writer', 'no-element', 'gap' ];
// When several routes claim one setting it is counted under the first of these: a measured reading or a list writes it
// from the draft; a setting the DB says prints no element is no-element before any generic first-text-setting claim.
const PRECEDENCE = [ 'measured', 'list', 'no-element', 'role-writer' ];

const tag = ( block, attr ) => `${ block }.${ attr }`;

// Every content setting row: [{ block, attr, role, type, shape }] in database order.
export function contentRows( db ) {
	return db.prepare( "SELECT block_slug, attr_name, attr_type, role, emit_shape FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND role IN ( SELECT role_name FROM roles WHERE classification = 'content-bearing' ) ORDER BY block_slug, rowid" )
		.all().map( ( r ) => ( { block: r.block_slug, attr: r.attr_name, role: r.role, type: r.attr_type, shape: r.emit_shape ?? null } ) );
}

// The per-setting gap rows of a coverage map: { '<block>.<setting>': { id, entry } }. A malformed ID is kept under its own
// ID so the caller reports it.
export function gapRowsOf( coverage ) {
	const out = {};
	for ( const [ id, entry ] of Object.entries( coverage?.entries || {} ) ) {
		if ( isContentSettingId( id ) ) {
			const p = parseContentSettingId( id );
			out[ p ? tag( p.block, p.attr ) : id ] = { id, entry, parsed: p };
		}
	}
	return out;
}

// The settings every writer claims, per block, as a Map key `<block>.<setting>` to the list of { route, writer } that claim it.
// db: the framework DB handle; cacheDir: the slot-map folder; schemaOf( block ): block.json attributes; facts: skeleton-facts.mjs::loadFacts.
export function claimsOf( { db, cacheDir, schemaOf, facts, blocks } ) {
	const claims = new Map();
	const claim = ( block, attr, route, writer ) => {
		const k = tag( block, attr );
		claims.set( k, [ ...( claims.get( k ) || [] ), { route, writer } ] );
	};
	for ( const block of blocks ) {
		const cal = loadCalibration( cacheDir, block, null );
		textSettings( cal ).forEach( ( a ) => claim( block, a, 'measured', 'text' ) );
		linkSettings( cal ).forEach( ( a ) => claim( block, a, 'measured', 'link' ) );
		presenceSettings( cal ).forEach( ( a ) => claim( block, a, 'measured', 'presence' ) );
		listClaims( block, listTarget( db, block, schemaOf ) ).forEach( ( c ) => claim( c.block, c.attr, 'list', 'list' ) );
		const schema = schemaOf( block );
		const skeleton = skeletonSettings( facts, block );
		[ skeleton.text, skeleton.link, ...skeleton.others ].filter( Boolean ).forEach( ( a ) => claim( block, a, 'role-writer', 'skeleton' ) );
		mediaSettings( imageSlots( db, block, schema ), schema ).forEach( ( a ) => claim( block, a, 'role-writer', 'media' ) );
		iconSettings( schema ).forEach( ( a ) => claim( block, a, 'role-writer', 'icon' ) );
		formSettings( block ).forEach( ( a ) => claim( block, a, 'role-writer', 'form' ) );
	}
	return claims;
}

// Why no route claims a row, as sentences (one per route), read from the slot map, the list target and the writers' choices.
function whyMissed( row, { cacheDir, db, schemaOf, facts } ) {
	const why = [];
	const cal = loadCalibration( cacheDir, row.block, null );
	if ( ! fs.existsSync( slotMapFile( cacheDir, row.block ) ) ) {
		why.push( `not calibrated: no slot map for ${ row.block } in ${ cacheDir }` );
	} else {
		const lists = [ 'noMarker', 'dead', 'rejected' ].filter( ( k ) => ( cal?.[ k ] || [] ).includes( row.attr ) );
		const kinds = [ 'text', 'link', 'presence' ].filter( ( k ) => cal?.[ k ] );
		why.push( `calibration has no text, link or presence reading for it${ lists.length ? `; the slot map lists it in ${ lists.join( ', ' ) }` : '' }${ cal?.settings?.[ row.attr ] ? '; it is a measured style setting' : '' }${ cal?.discovered?.[ row.attr ] ? '; it is a discovered setting' : '' } (the slot map reads ${ kinds.join( ', ' ) || 'no content' })` );
	}
	const target = listTarget( db, row.block, schemaOf );
	why.push( target ? `the list writer fills ${ target.kind === 'attr' ? target.attr : `the items of ${ target.child }` }, not this setting` : 'the block keeps no list the list writer fills' );
	const skeleton = skeletonSettings( facts, row.block );
	why.push( `no dedicated writer selects it (skeleton: text ${ skeleton.text ?? 'none' }, link ${ skeleton.link ?? 'none' }; media: ${ mediaSettings( imageSlots( db, row.block, schemaOf( row.block ) ), schemaOf( row.block ) ).join( ', ' ) || 'none' })` );
	why.push( `emit_shape is ${ row.shape ?? 'unset' }, which names an element the draft draws` );
	return why;
}

// The check. Returns { rows, counts, writers, failing, staleGaps, badGaps, ok }:
//   rows      every content row with its route ('measured', 'list', 'role-writer', 'no-element', 'gap' or null) and writer
//   counts    rows per route (+ `none` for the failing rows)
//   failing   [{ block, attr, role, type, shape, why: [sentences] }]: a row with no route and no gap row
//   staleGaps [{ id, route, writer }]: a gap row whose setting now has a route
//   badGaps   [{ id, why }]: a gap row naming a setting the DB no longer holds as content, or a malformed ID
export function contentCoverage( { db, cacheDir, schemaOf, facts, coverage } ) {
	const rows = contentRows( db );
	// Every SGS block is asked what it writes: a list host with no content row of its own still claims its child block's rows.
	const blocks = db.prepare( "SELECT block_slug FROM block_attributes WHERE block_slug LIKE 'sgs/%' UNION SELECT block_slug FROM block_composition WHERE block_slug LIKE 'sgs/%' ORDER BY block_slug" ).all().map( ( r ) => r.block_slug );
	const claims = claimsOf( { db, cacheDir, schemaOf, facts, blocks } );
	const gaps = gapRowsOf( coverage );
	const counts = Object.fromEntries( [ ...ROUTES, 'none' ].map( ( r ) => [ r, 0 ] ) );
	const writers = {};
	const failing = [];
	const staleGaps = [];
	const known = new Set();
	const routed = rows.map( ( row ) => {
		const k = tag( row.block, row.attr );
		known.add( k );
		const all = [ ...( claims.get( k ) || [] ), ...( NO_ELEMENT_SHAPES.includes( row.shape ) ? [ { route: 'no-element', writer: row.shape } ] : [] ) ];
		const hit = all.sort( ( a, b ) => PRECEDENCE.indexOf( a.route ) - PRECEDENCE.indexOf( b.route ) )[ 0 ] ?? null;
		const gap = gaps[ k ];
		if ( gap && hit ) {
			staleGaps.push( { id: gap.id, route: hit.route, writer: hit.writer } );
		}
		const route = hit?.route ?? ( gap ? 'gap' : null );
		counts[ route ?? 'none' ]++;
		hit && ( writers[ `${ hit.route }:${ hit.writer }` ] = ( writers[ `${ hit.route }:${ hit.writer }` ] || 0 ) + 1 );
		! route && failing.push( { ...row, why: whyMissed( row, { cacheDir, db, schemaOf, facts } ) } );
		return { ...row, route, writer: hit?.writer ?? null };
	} );
	const badGaps = Object.entries( gaps ).filter( ( [ k, g ] ) => ! g.parsed || ! known.has( k ) ).map( ( [ , g ] ) => ( { id: g.id, why: g.parsed ? 'the framework DB holds no such content-bearing setting' : 'the ID is not content-setting:sgs/<block>.<setting>' } ) );
	return { rows: routed, counts, writers, failing, staleGaps, badGaps, ok: ! failing.length && ! staleGaps.length && ! badGaps.length };
}

// The check's report as text lines (the CLI prints them; tests read them).
export function reportLines( result ) {
	const lines = [];
	result.failing.forEach( ( f ) => lines.push( `NO ROUTE ${ f.block }.${ f.attr } [role ${ f.role }, ${ f.type }, emit_shape ${ f.shape ?? 'unset' }]\n    ${ f.why.join( '\n    ' ) }` ) );
	result.staleGaps.forEach( ( s ) => lines.push( `STALE GAP ${ s.id }: a writer now fills it (${ s.route }: ${ s.writer }); delete the row` ) );
	result.badGaps.forEach( ( b ) => lines.push( `BAD GAP ${ b.id }: ${ b.why }` ) );
	lines.push( `content settings: ${ result.rows.length }; ${ ROUTES.map( ( r ) => `${ r } ${ result.counts[ r ] }` ).join( ', ' ) }, no route ${ result.counts.none }; stale gap rows ${ result.staleGaps.length }, bad gap rows ${ result.badGaps.length }` );
	lines.push( `by writer: ${ Object.entries( result.writers ).sort().map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) }` );
	return lines;
}
