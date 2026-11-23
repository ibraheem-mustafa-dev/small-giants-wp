// The route's one reader of what a block's settings do and what the block looks like on a site (setting record plan,
// Task 4). It replaces calibration: where each setting paints comes from the setting record in the framework database
// (`setting_placements`, `setting_record_blocks`); the block's default look on the site and the per-setting facts the
// record does not describe come from the site look (plugins/sgs-blocks/scripts/site-look/site_look.py), built offline
// from the block's code and the client's theme snapshot. The object it returns has the keys the route read from
// calibration (lib/cache.mjs::loadCalibration), so every reader keeps working:
//   settings[setting]   { slot, slots, property, state, reachedAt, effects, reaches?, overriddenBy?, forms, look?,
//                         tiers, symbolic?, accepted?, fromAttributes? }: placements the route may act on, which are
//                         proved entries or unproved ones Bean's certainty rule accepted (`accepted`); an unproved entry
//                         that is not accepted never enters `settings` and is listed in `untestedStates` with its cause
//   discovered, text, link, presence, elements, paintStates  from the site look
//   dead                settings the record tested that paint nothing and whose block_attributes row names no
//                       property (a setting whose row names its property and element paints once its partner draws
//                       the element, Bean 2026-11-22, and takes its placement from that row)
//   untestedStates      'setting:state (unproved: cause)' for each placement the route may not act on
//   client              the client whose theme snapshot the look was built from
//   recordKey           the site look's key (what the block's look was built from)
//   paintMissing        why there is no site look, when there is none
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { openDb, attrRow } from './db.mjs';
import { longhands } from './calibrate.mjs';
import { splitProperty, blockElements } from './resolve.mjs';
import { INHERITED } from './calibrate-props.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
export const WIDTHS = [ 375, 768, 1440 ];
// Where the site looks are kept: one folder per client, rebuilt by the builder when its inputs change (gitignored).
export const SITE_LOOK_DIR = path.join( HERE, '..', 'site-look' );
const BUILDER = path.join( REPO, 'plugins/sgs-blocks/scripts/site-look/site_look.py' );

const slugOf = ( block ) => String( block ).replace( /^sgs\//, '' );
const depth = ( p ) => ( '' === p ? 0 : p.split( ' > ' ).length );
const byDepth = ( a, b ) => depth( a ) - depth( b ) || ( a < b ? -1 : a > b ? 1 : 0 );
const json = ( v, fallback ) => {
	try {
		return null == v ? fallback : JSON.parse( v );
	} catch {
		return fallback;
	}
};

// Whether a client runs WooCommerce, so the theme prints its shop stylesheet: its page map (sites/<client>/build/
// page-map.json) holds a shop or product row, the rule the intake adds WooCommerce's pages by
// (lib/intake-pagemap-owners.mjs::wooPages). A client with no page map yet runs no shop.
export function runsShop( client, repo = REPO ) {
	const file = path.join( repo, 'sites', String( client ), 'build', 'page-map.json' );
	const rows = fs.existsSync( file ) ? json( fs.readFileSync( file, 'utf8' ), [] ) : [];
	return Array.isArray( rows ) && rows.some( ( r ) => [ 'shop', 'product' ].includes( r?.postType ) );
}

const lookFile = ( dir, client, block ) => path.join( dir, client, `${ slugOf( block ) }.json` );

// The file a block's site look for a client is kept in.
export const siteLookFile = ( client, block, dir = SITE_LOOK_DIR ) => lookFile( dir, String( client ), block );

const checked = new Set();

// The block's site look for the client (sites/<client>/theme-snapshot.json), built (or confirmed current) by the builder
// once per process. With SGS_NO_SITE set (the route's tests) nothing is built: a missing look reads as missing.
export function siteLook( block, client, { dir = SITE_LOOK_DIR, repo = REPO, build = ! process.env.SGS_NO_SITE } = {} ) {
	const file = lookFile( dir, client, block );
	const key = `${ dir }|${ client }|${ block }`;
	if ( build && ! checked.has( key ) ) {
		checked.add( key );
		const snapshot = path.join( repo, 'sites', client, 'theme-snapshot.json' );
		if ( ! fs.existsSync( snapshot ) ) {
			return { missing: `${ client } has no theme snapshot (sites/${ client }/theme-snapshot.json), so its look cannot be built` };
		}
		const args = [ BUILDER, '--snapshot', snapshot, '--site', client, '--out', dir, '--blocks', block, '--jobs', '1', ...( runsShop( client, repo ) ? [ '--woocommerce' ] : [] ) ];
		const r = spawnSync( 'python', args, { encoding: 'utf8', cwd: REPO } );
		if ( r.status ) {
			return { missing: `the site look of ${ block } for ${ client } did not build: ${ ( r.stderr || r.stdout || '' ).slice( -400 ) }` };
		}
	}
	if ( ! fs.existsSync( file ) ) {
		return { missing: `no site look of ${ block } for ${ client } (plugins/sgs-blocks/scripts/site-look/site_look.py)` };
	}
	try {
		return { look: JSON.parse( fs.readFileSync( file, 'utf8' ) ) };
	} catch ( e ) {
		return { missing: `the site look of ${ block } for ${ client } does not parse: ${ e.message }` };
	}
}

// ---------------------------------------------------------------- record parts as the route's element paths

// The site look's element paths whose element a record part names: `ROOT` the root, a class every element carrying it,
// `<class> <tag>` a tag inside one, a trailing `::before` / `::after` that pseudo-element (site_look.py::part_paths).
export function partPaths( part, look ) {
	const elements = look?.elements || {};
	const classes = look?.pathClasses || {};
	const [ key, pe ] = String( part ).split( '::' );
	const pseudo = pe ? `::${ pe }` : '';
	const [ head, ...rest ] = key.trim().split( ' ' );
	const tag = rest.join( ' ' ).trim();
	const hosts = Object.keys( classes ).filter( ( p ) => ( 'ROOT' === head ? '' === p : ( classes[ p ] || [] ).includes( head ) ) );
	// A pseudo-element part is its host's path with the pseudo-element: the setting that draws it (a gradient border on
	// `::before`) switches it on, so the default look need not hold it.
	const out = new Set();
	for ( const base of Object.keys( elements ) ) {
		if ( base.includes( '::' ) ) {
			continue;
		}
		if ( tag ) {
			const elTag = elements[ base ]?.[ '375' ]?._tag ?? elements[ base ]?.[ 375 ]?._tag;
			if ( elTag === tag && hosts.some( ( h ) => base !== h && ( '' === h || base.startsWith( `${ h } > ` ) ) ) ) {
				out.add( base + pseudo );
			}
		} else if ( hosts.includes( base ) ) {
			out.add( base + pseudo );
		}
	}
	return [ ...out ].sort( byDepth );
}

// ---------------------------------------------------------------- tiers

const CONDITION = /\((min|max)-width\s*:\s*([\d.]+)px\)/g;

// Whether one tier (a media or container condition list as the record writes it) holds on a plain screen `w` px wide.
// Width tests are evaluated; a container query is taken to hold (its width follows the block's container, `containerTier`);
// any other condition (reduced motion, forced colours, a pointer) is not the plain screen calibration read, so it does not.
export function tierHolds( tier, w ) {
	const t = String( tier );
	if ( /^@container/.test( t ) ) {
		return true;
	}
	const body = t.replace( /^@media\s*/, '' );
	const tests = [ ...body.matchAll( CONDITION ) ];
	const rest = body.replace( CONDITION, '' ).replace( /\band\b|\bscreen\b|\ball\b|\bonly\b|[\s()]/g, '' );
	if ( rest ) {
		return false;
	}
	return tests.every( ( [ , edge, n ] ) => ( 'min' === edge ? w >= Number( n ) : w <= Number( n ) ) );
}

// The tiers of an entry with its symbolic edges moved to the value `value` of their setting (the record's `symbolic`
// annotation: a breakpoint a setting names, `max` at value + offset, `min` at value).
export function symbolicTiers( tiers, symbolic, value ) {
	if ( ! symbolic || null == value || '' === value || ! Number.isFinite( Number( value ) ) ) {
		return tiers;
	}
	const edge = symbolic.edge;
	const at = Number( value ) + Number( symbolic.offset || 0 );
	return tiers.map( ( t ) => String( t ).replace( new RegExp( `\\(${ edge }-width\\s*:\\s*[\\d.]+px\\)` ), `(${ edge }-width:${ Math.round( at * 100 ) / 100 }px)` ) );
}

// The read widths at which a placement holds: every condition of its tier list at each width.
export const reachedAtOf = ( tiers ) => WIDTHS.filter( ( w ) => ( tiers || [] ).every( ( t ) => tierHolds( t, w ) ) );

const nodeViews = new WeakMap();

// A block's record as one node holds it: a setting placed under a breakpoint another setting names (a menu's collapse
// point, the record's `symbolic` tiers) reaches the widths that setting's value on this node gives, its block default
// when the node leaves it unset. A record with no symbolic tier is returned as it is.
export function withNodeValues( cal, attributes = {}, schema = null ) {
	const symbolic = Object.entries( cal?.settings || {} ).filter( ( [ , e ] ) => Array.isArray( e.symbolic ) && e.symbolic.length );
	if ( ! symbolic.length ) {
		return cal;
	}
	const valueOf = ( name ) => attributes?.[ name ] ?? schema?.[ name ]?.default;
	const key = JSON.stringify( symbolic.map( ( [ , e ] ) => e.symbolic.map( ( s ) => valueOf( s.setting ) ) ) );
	const byKey = nodeViews.get( cal ) || new Map();
	nodeViews.set( cal, byKey );
	if ( ! byKey.has( key ) ) {
		const settings = { ...cal.settings };
		for ( const [ name, e ] of symbolic ) {
			const moved = e.tiers.map( ( tiers ) => {
				const s = e.symbolic.find( ( x ) => JSON.stringify( x.tiers ) === JSON.stringify( tiers ) );
				return s ? symbolicTiers( tiers, s, valueOf( s.setting ) ) : tiers;
			} );
			const reached = new Set( moved.flatMap( reachedAtOf ) );
			settings[ name ] = { ...e, tiers: moved, reachedAt: WIDTHS.filter( ( w ) => reached.has( w ) ) };
		}
		byKey.set( key, { ...cal, settings } );
	}
	return byKey.get( key );
}

// ---------------------------------------------------------------- the settings map

// The record's rows for one block.
export function recordRows( db, block ) {
	const rows = db.prepare( 'SELECT setting, part, props, state, tiers, kind, unproved, accepted, selector, setting_values, symbolic FROM setting_placements WHERE block_slug = ?' ).all( block );
	const meta = db.prepare( 'SELECT tested_no_paint, replaces_block, unvalued FROM setting_record_blocks WHERE block_slug = ?' ).get( block );
	return {
		rows: rows.map( ( r ) => ( { ...r, props: json( r.props, [] ), tiers: json( r.tiers, [] ), symbolic: json( r.symbolic, null ), state: r.state || null } ) ),
		testedNoPaint: json( meta?.tested_no_paint, [] ),
		replacesBlock: json( meta?.replaces_block, [] ),
		hasRecord: !! meta,
	};
}

// One setting's entry from its usable rows: the rows on its own property (the block_attributes row's, else the first
// row's) give its slots and widths; its other rows are its effects.
function settingEntry( name, rows, row, look, facts ) {
	const long = ( props ) => [ ...new Set( props.flatMap( ( p ) => [ p, ...longhands( p ) ] ) ) ];
	const own = longhands( row?.css_property || '' );
	const primaryProps = own.length ? long( own ) : long( rows[ 0 ].props );
	const onProp = rows.filter( ( r ) => long( r.props ).some( ( p ) => primaryProps.includes( p ) ) );
	// The state the setting's own row names (rest when it names none); a setting that also paints in another state (the
	// same colour on focus) keeps those rows as effects.
	const wantState = row?.css_state || null;
	const inState = onProp.filter( ( r ) => ( r.state || null ) === wantState );
	const main = inState.length ? inState : onProp.length ? onProp : rows;
	const pathsOf = ( r ) => partPaths( r.part, look );
	const slots = [ ...new Set( main.flatMap( pathsOf ) ) ].sort( byDepth );
	if ( ! slots.length ) {
		return null;
	}
	const reached = new Set( main.flatMap( ( r ) => reachedAtOf( r.tiers ) ) );
	const effects = [ ...new Set( rows.filter( ( r ) => ! main.includes( r ) ).flatMap( ( r ) => pathsOf( r ).flatMap( ( p ) => r.props.map( ( q ) => `${ p }|${ q }` ) ) ) ) ];
	const prop = main[ 0 ].props.find( ( p ) => long( [ p ] ).some( ( q ) => primaryProps.includes( q ) ) ) || main[ 0 ].props[ 0 ];
	const entry = {
		slot: slots[ 0 ],
		slots,
		property: splitProperty( prop ).short,
		state: row?.css_state || main[ 0 ].state || null,
		forms: facts?.forms || [],
		transform: null,
		reachedAt: WIDTHS.filter( ( w ) => reached.has( w ) ),
		effects,
		tiers: main.map( ( r ) => r.tiers ),
		...( main.some( ( r ) => r.symbolic ) ? { symbolic: main.filter( ( r ) => r.symbolic ).map( ( r ) => ( { tiers: r.tiers, ...r.symbolic } ) ) } : {} ),
		...( main.every( ( r ) => r.unproved ) ? { accepted: true } : {} ),
		...( facts?.look ? { look: facts.look } : {} ),
		...( main.some( ( r ) => /^@container/.test( r.tiers.join( ' ' ) ) ) ? { containerTier: true } : {} ),
	};
	// An inherited property reaches every descendant that does not paint it itself; the shallowest that does is where
	// the setting stops (calibration's `reaches` and `overriddenBy`, read from the site look's `_own:` marks).
	if ( INHERITED.includes( prop ) ) {
		const below = Object.keys( look?.elements || {} ).filter( ( p ) => ! p.includes( '::' ) && ! p.startsWith( '@' ) && ( '' === entry.slot ? '' !== p : p.startsWith( `${ entry.slot } > ` ) ) );
		const ownsIt = ( p ) => WIDTHS.some( ( w ) => undefined !== ( look.elements[ p ]?.[ String( w ) ] || {} )[ `_own:${ prop }` ] );
		const blocked = below.filter( ownsIt );
		const stops = blocked.filter( ( p ) => ! blocked.some( ( q ) => q !== p && p.startsWith( `${ q } > ` ) ) ).sort( byDepth );
		entry.reaches = [ entry.slot, ...below.filter( ( p ) => ! stops.some( ( s ) => p === s || p.startsWith( `${ s } > ` ) ) ) ].sort( byDepth );
		if ( stops.length ) {
			entry.overriddenBy = stops;
		}
	}
	return entry;
}

// A setting's entry without a site look (a reader that names no site asks only which settings a block has and what they
// set): its property, state and widths, and no element.
function bareEntry( rows, row ) {
	const prop = longhands( row?.css_property || '' )[ 0 ] || rows[ 0 ].props[ 0 ];
	const reached = new Set( rows.flatMap( ( r ) => reachedAtOf( r.tiers ) ) );
	return { slot: null, slots: [], property: splitProperty( prop ).short, state: row?.css_state || rows[ 0 ].state || null, forms: [], transform: null, reachedAt: WIDTHS.filter( ( w ) => reached.has( w ) ), effects: [], tiers: rows.map( ( r ) => r.tiers ) };
}

// The path of a block.json element (supports.sgs.elements) in the site look: its selector's last class, else the root.
function elementPaths( block, element, look, elementsOf = blockElements ) {
	const sel = elementsOf( block )[ element ];
	const cls = sel ? ( String( sel ).match( /\.([A-Za-z0-9_-]+)(?![\s\S]*\.[A-Za-z0-9_-])/ ) || [] )[ 1 ] : null;
	return cls ? partPaths( cls, look ) : [];
}

// A test's record for one block (writeRecordFixture): the whole object the loader returns, written for one client
// (`<dir>/<client>/<block>.record.json`, read only for that client) or for any (`<dir>/<block>.record.json`). Only a
// folder a test names holds one; the route's own runs read the framework database and the site look.
export function recordFixtureFile( dir, block, client = null ) {
	const own = client ? path.join( dir, String( client ), `${ slugOf( block ) }.record.json` ) : null;
	return own && fs.existsSync( own ) ? own : path.join( dir, `${ slugOf( block ) }.record.json` );
}

export function writeRecordFixture( dir, block, record, client = null ) {
	const file = client ? path.join( dir, String( client ), `${ slugOf( block ) }.record.json` ) : path.join( dir, `${ slugOf( block ) }.record.json` );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( record, null, 1 ) );
}

// A fixture record as the loader returns it: one with no `elements` has no site look, so it carries `paintMissing`.
export function readRecordFixture( dir, block, client ) {
	const rec = JSON.parse( fs.readFileSync( recordFixtureFile( dir, block, client ), 'utf8' ) );
	if ( rec.elements ) {
		return rec;
	}
	return { ...rec, elements: {}, paintMissing: client ? `no site look of ${ block } for ${ client }` : 'no client named, so no site look to read' };
}

let dbMemo = null;
const loaded = new Map();

// The calibration-shaped object for one block in one client's look, or null when the block has no record. Read once per
// process for each block, client and folder (a reader asks for a block's record many times while it fills one surface).
export function loadRecord( block, client, opts = {} ) {
	const key = `${ block }|${ client }|${ opts.dir || SITE_LOOK_DIR }`;
	const custom = opts.db || opts.repo || opts.elementsOf;
	if ( custom || ! loaded.has( key ) ) {
		const r = readRecord( block, client, opts );
		if ( custom ) {
			return r;
		}
		loaded.set( key, r );
	}
	return loaded.get( key );
}

function readRecord( block, client, { db = null, dir = SITE_LOOK_DIR, repo = REPO, build, elementsOf = blockElements } = {} ) {
	const handle = db || ( dbMemo ||= openDb() );
	const rec = recordRows( handle, block );
	if ( ! rec.hasRecord ) {
		return null;
	}
	const { look, missing } = client ? siteLook( block, client, { dir, repo, ...( undefined === build ? {} : { build } ) } ) : { missing: 'no client named, so no site look to read' };
	const facts = look?.settingFacts || {};
	const usable = new Map();
	const unprovedAt = {};
	for ( const r of rec.rows ) {
		if ( r.unproved && ! r.accepted ) {
			( unprovedAt[ r.state ? `${ r.setting }:${ r.state }` : r.setting ] ||= new Set() ).add( r.unproved );
			continue;
		}
		( usable.get( r.setting ) || usable.set( r.setting, [] ).get( r.setting ) ).push( r );
	}
	// A setting and state the route may not act on: every placement it has there is unproved and not accepted. Keyed as
	// gate G4 matches them (`setting` at rest, `setting:state`); `unproved` holds each one's causes.
	const usableAt = new Set( [ ...usable.values() ].flat().map( ( r ) => ( r.state ? `${ r.setting }:${ r.state }` : r.setting ) ) );
	const untested = Object.keys( unprovedAt ).filter( ( k ) => ! usableAt.has( k ) );
	const settings = {};
	for ( const [ name, rows ] of usable ) {
		const row = attrRow( handle, block, name );
		const e = look ? settingEntry( name, rows, row, look, facts[ name ] ) : bareEntry( rows, row );
		if ( e ) {
			settings[ name ] = e;
		}
	}
	// A setting the record tested that painted nothing alone: placed from its block_attributes row when the row names its
	// property and element (it paints once its partner draws the element), else it paints nothing.
	const dead = [];
	for ( const name of rec.testedNoPaint ) {
		const row = attrRow( handle, block, name );
		const props = longhands( row?.css_property || '' );
		const slots = look && row?.css_element ? elementPaths( block, row.css_element, look, elementsOf ) : [];
		if ( props.length && slots.length && ! settings[ name ] ) {
			settings[ name ] = { slot: slots[ 0 ], slots, property: splitProperty( props[ 0 ] ).short, state: row.css_state || null, forms: facts[ name ]?.forms || [], transform: null, reachedAt: [ ...WIDTHS ], effects: [], tiers: [ [] ], fromAttributes: true };
		} else if ( ! props.length ) {
			dead.push( name );
		}
	}
	return {
		block,
		client,
		source: 'setting-record',
		settings,
		discovered: look?.discovered || {},
		...( look?.text ? { text: look.text } : {} ),
		...( look?.link ? { link: look.link } : {} ),
		...( look?.presence ? { presence: look.presence } : {} ),
		elements: look?.elements || {},
		...( look?.paintStates ? { paintStates: look.paintStates } : {} ),
		dead: dead.sort(),
		replacesBlock: rec.replacesBlock,
		untestedStates: untested.sort(),
		unproved: Object.fromEntries( untested.map( ( k ) => [ k, [ ...unprovedAt[ k ] ].sort() ] ) ),
		noMarker: look?.noMarker || [],
		oneWidth: [],
		rejected: [],
		recordKey: look?.key ?? null,
		...( missing ? { paintMissing: missing } : {} ),
	};
}
