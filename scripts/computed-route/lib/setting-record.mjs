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
//   conditionalParts    { path: { tag, classes, parent, siblings, firstJob, setting } } the parts that pages setting a setting draw
//                       and the default look lacks (a reader offers them only after the default parts fail:
//                       lib/skeleton-part-pairing.mjs::pairAbsorbed)
//   unplaced            { setting: why } for a setting the record places whose element the default look does not draw
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
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { openDb, attrRow } from './db.mjs';
import { longhands } from './calibrate.mjs';
import { splitProperty, blockElements } from './resolve.mjs';
import { INHERITED } from './calibrate-props.mjs';
import { bandSetting } from './fill-band.mjs';
import { variantOnlyOf } from './setting-variant.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
export const WIDTHS = [ 375, 768, 1440 ];
// Where the site looks are kept: one folder per client, rebuilt by the builder when its inputs change (gitignored).
export const SITE_LOOK_DIR = path.join( HERE, '..', 'site-look' );
const BUILDER = path.join( REPO, 'plugins/sgs-blocks/scripts/site-look/site_look.py' );

// The setting record's fixtures: per block, the plain block a new node renders (`attributes`), its variants, preconditions and
// paint states. The site look draws every block from these entries (site_look.py::build_block), so Fill reads the same ones for
// the defaults it compares against. `checkAttributes`, the extras only the record check merges in
// (setting-record/instances.py::check_fixture), are left out, as the site look leaves them out.
export const RECORD_FIXTURES = path.join( REPO, 'plugins/sgs-blocks/scripts/setting-record/fixtures.json' );
export function recordFixtures( file = RECORD_FIXTURES ) {
	const all = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	return Object.fromEntries( Object.entries( all ).filter( ( [ k ] ) => ! k.startsWith( '_' ) ).map( ( [ k, v ] ) => {
		const { checkAttributes, ...plain } = v || {};
		return [ k, plain ];
	} ) );
}

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

// Whether a stage builds a look it reads and lacks: on unless SGS_NO_SITE is set (the route's tests read fixture looks),
// and on whatever SGS_NO_SITE says when SGS_LOOK_BUILD=1 (the builder is offline: a sweep's workers run with SGS_NO_SITE
// and build each look the first time a stage reads it, tools/route-sweep.mjs).
export const LOOK_BUILD_ENV = 'SGS_LOOK_BUILD';
export const lookBuildOn = ( env = process.env ) => '1' === env[ LOOK_BUILD_ENV ] || ! env.SGS_NO_SITE;

// What starts the look builder (spawnSync's signature). useLookRunner swaps it for a test and returns the one it replaced,
// so a test can see which blocks a stage has built without running the builder.
let lookRunner = spawnSync;
export function useLookRunner( run ) {
	const was = lookRunner;
	lookRunner = run || spawnSync;
	return was;
}

const lookFile = ( dir, client, block ) => path.join( dir, client, `${ slugOf( block ) }.json` );

// The file a block's site look for a client is kept in.
export const siteLookFile = ( client, block, dir = SITE_LOOK_DIR ) => lookFile( dir, String( client ), block );

const checked = new Set();

// Builds (or confirms current) the site looks of many blocks for one client in one parallel run of the builder, before a
// run reads them one by one: a cold look takes minutes to render, and siteLook alone builds one block at a time. Each
// block is then checked for this process, so siteLook does not ask the builder again. Nothing is built with SGS_NO_SITE
// set, for a client with no theme snapshot, or for blocks already checked. Returns the blocks the builder could not build.
// `run` stands in for spawnSync (tests).
// The builder's worker processes per run: LOOK_JOBS (SGS_LOOK_JOBS overrides). Each worker renders whole pages and can hold
// several GB, and other sessions build looks at the same time, so a run never takes one worker per core.
export const LOOK_JOBS = 2;
export const lookJobs = ( env = process.env ) => Math.max( 1, Number( env.SGS_LOOK_JOBS ) || LOOK_JOBS );
// A block the builder could not build keeps its reason for this process: it is never built again, and siteLook reports the reason.
const failures = new Map();
// What a builder that ran out of room prints for a block (a worker killed, memory, a render that did not finish, the bridge's
// Node refused memory: V8's `allocation failure`, 2026-11-26 on a loaded machine), or prints nothing: only these are worth a
// second try; a missing fixture or module fails the same way again.
const RESOURCE_FAILURE = /BrokenProcessPool|MemoryError|TimeoutExpired|terminated abruptly|allocation failure|heap out of memory|printed nothing for it/;
export function prepareLooks( blocks, client, { dir = SITE_LOOK_DIR, repo = REPO, build = lookBuildOn(), run = lookRunner, log = () => {} } = {} ) {
	const snapshot = path.join( repo, 'sites', String( client ), 'theme-snapshot.json' );
	const keyOf = ( b ) => `${ dir }|${ client }|${ b }`;
	const sgs = [ ...new Set( blocks ) ].filter( ( b ) => /^sgs\//.test( b ) && ! checked.has( keyOf( b ) ) );
	if ( ! build || ! client || ! sgs.length || ! fs.existsSync( snapshot ) ) {
		return [];
	}
	const due = sgs.filter( ( b ) => ! failures.has( keyOf( b ) ) );
	const shop = runsShop( client, repo ) ? [ '--woocommerce' ] : [];
	// One builder call for `list`; a block the builder reports built or current is checked. Returns the blocks it did not build,
	// each with the builder's own words about it.
	const attempt = ( list, jobs ) => {
		const r = run( 'python', [ BUILDER, '--snapshot', snapshot, '--site', client, '--out', dir, '--blocks', list.join( ',' ), '--jobs', String( jobs ), ...shop ], { encoding: 'utf8', cwd: REPO } );
		const reported = String( r.stdout || '' ).split( /\r?\n/ );
		const done = ( b ) => reported.some( ( line ) => [ 'built', 'current' ].some( ( how ) => line.startsWith( `${ slugOf( b ) }: ${ how }` ) ) );
		list.filter( done ).forEach( ( b ) => checked.add( keyOf( b ) ) );
		const text = ( [ r.error?.message, String( r.stderr || '' ).trim().split( /\r?\n/ ).slice( -1 )[ 0 ] ].filter( Boolean ).join( '; ' ) ) || 'no error text';
		const why = ( b ) => reported.find( ( line ) => line.startsWith( `${ slugOf( b ) }: ` ) ) || `the builder printed nothing for it (exit ${ r.status ?? r.signal ?? 'unknown' }: ${ text })`;
		return list.filter( ( b ) => ! done( b ) ).map( ( b ) => [ b, why( b ) ] );
	};
	// A block the builder ran out of room for is built once more on its own with one worker, each block in its own call.
	const missed = due.length ? attempt( due, Math.max( 1, Math.min( due.length, lookJobs() ) ) ).map( ( [ b, why ] ) => ( RESOURCE_FAILURE.test( why ) ? attempt( [ b ], 1 )[ 0 ] ?? null : [ b, why ] ) ).filter( Boolean ) : [];
	missed.forEach( ( [ b, why ] ) => {
		failures.set( keyOf( b ), `no default look of ${ b } for ${ client } (${ why })` );
		log( `look builder: ${ failures.get( keyOf( b ) ) }` );
	} );
	return sgs.filter( ( b ) => failures.has( keyOf( b ) ) );
}

// The block's site look for the client (sites/<client>/theme-snapshot.json), built (or confirmed current) by the builder
// once per process, the first time a stage reads it: a proposal gets the look of every block it reads (a chosen block, a
// helper a rule names) and builds no other. With the build off (lookBuildOn) nothing is built: a missing look reads as
// missing, and the paint gate stops a run whose tree uses it (lib/paint-gate.mjs::assertPaints). A build that fails keeps
// its reason. `run` stands in for spawnSync (tests).
export function siteLook( block, client, { dir = SITE_LOOK_DIR, repo = REPO, build = lookBuildOn(), run = lookRunner } = {} ) {
	const file = lookFile( dir, client, block );
	const key = `${ dir }|${ client }|${ block }`;
	if ( build && failures.has( key ) ) {
		return { missing: failures.get( key ) };
	}
	if ( build && ! checked.has( key ) ) {
		checked.add( key );
		const snapshot = path.join( repo, 'sites', client, 'theme-snapshot.json' );
		if ( ! fs.existsSync( snapshot ) ) {
			return { missing: `${ client } has no theme snapshot (sites/${ client }/theme-snapshot.json), so its look cannot be built` };
		}
		const args = [ BUILDER, '--snapshot', snapshot, '--site', client, '--out', dir, '--blocks', block, '--jobs', '1', ...( runsShop( client, repo ) ? [ '--woocommerce' ] : [] ) ];
		const r = run( 'python', args, { encoding: 'utf8', cwd: REPO } );
		if ( r.status || r.error ) {
			failures.set( key, `the site look of ${ block } for ${ client } did not build: ${ ( r.stderr || r.stdout || r.error?.message || '' ).slice( -400 ) }` );
			return { missing: failures.get( key ) };
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

// ---------------------------------------------------------------- a rule's subject below its part

// A selector's compounds at the top level, each with the combinator before it (`''` for the first, `' '` descendant, `>`,
// `+`, `~`); a functional pseudo-class keeps its argument inside its compound, and a :where() or :is() wrapping the whole
// selector is read through. Null for a selector list or unbalanced brackets: the caller keeps the part as the subject.
export function compounds( selector ) {
	const balanced = ( t ) => {
		let d = 0;
		for ( const ch of t ) {
			d += '(' === ch ? 1 : ')' === ch ? -1 : 0;
			if ( d < 0 ) {
				return false;
			}
		}
		return 0 === d;
	};
	let s = String( selector ?? '' ).trim();
	for ( let m = s.match( /^:(?:where|is)\(([\s\S]*)\)$/ ); m && balanced( m[ 1 ] ); m = s.match( /^:(?:where|is)\(([\s\S]*)\)$/ ) ) {
		s = m[ 1 ].trim();
	}
	if ( ! s || ! balanced( s ) ) {
		return null;
	}
	const out = [];
	let depth = 0;
	let cur = '';
	let comb = '';
	for ( const ch of s ) {
		depth += '(' === ch || '[' === ch ? 1 : ')' === ch || ']' === ch ? -1 : 0;
		if ( 0 === depth && ',' === ch ) {
			return null;
		}
		if ( 0 === depth && /[\s>+~]/.test( ch ) && ! ( '(' === ch || ')' === ch ) ) {
			if ( cur ) {
				out.push( { comb, text: cur } );
				cur = '';
				comb = ' ';
			}
			if ( /[>+~]/.test( ch ) ) {
				comb = ch;
			}
			continue;
		}
		cur += ch;
	}
	if ( cur ) {
		out.push( { comb, text: cur } );
	}
	return out;
}

// A compound's own classes (those inside a functional pseudo-class are left out).
const FUNCTIONAL = /:(?:not|is|where|has)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g;
const ownClasses = ( text ) => [ ...String( text ).replace( FUNCTIONAL, '' ).matchAll( /\.([A-Za-z0-9_-]+)/g ) ].map( ( m ) => m[ 1 ] );
const SIMPLE_TAG = /^[a-z][a-z0-9]*$/;
const SIMPLE_CLASS = /^\.([A-Za-z0-9_-]+)$/;
const args = ( inner ) => {
	const out = [];
	let d = 0;
	let cur = '';
	for ( const ch of inner ) {
		d += '(' === ch ? 1 : ')' === ch ? -1 : 0;
		if ( 0 === d && ',' === ch ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += ch;
		}
	}
	return [ ...out, cur.trim() ].filter( Boolean );
};
const functionals = ( text, name ) => [ ...String( text ).matchAll( new RegExp( `:${ name }\\(((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*)\\)`, 'g' ) ) ].map( ( m ) => args( m[ 1 ] ) );

// Whether the element at `path` in the site look can be a compound's subject: its tag, its own classes, the plain tags and
// classes of its :not() (an attribute or a longer argument is taken as not excluding) and of a :where() or :is() it carries
// (an argument that is not a plain tag or class is taken as matching). Positional and state pseudo-classes are not tested.
function compoundHolds( text, path, look ) {
	const el = look?.elements?.[ path ] || {};
	const tag = ( el[ '375' ] || el[ 375 ] || Object.values( el )[ 0 ] || {} )._tag ?? null;
	const has = new Set( look?.pathClasses?.[ path ] || [] );
	const head = String( text ).replace( FUNCTIONAL, '' ).match( /^([a-zA-Z][a-zA-Z0-9]*)/ );
	if ( head && tag && head[ 1 ].toLowerCase() !== tag ) {
		return false;
	}
	if ( ownClasses( text ).some( ( c ) => ! has.has( c ) ) ) {
		return false;
	}
	const one = ( a ) => ( SIMPLE_TAG.test( a ) ? a === tag : SIMPLE_CLASS.test( a ) ? has.has( a.slice( 1 ) ) : null );
	if ( functionals( text, 'not' ).flat().some( ( a ) => true === one( a ) ) ) {
		return false;
	}
	return [ ...functionals( text, 'is' ), ...functionals( text, 'where' ) ].every( ( alts ) => alts.some( ( a ) => false !== one( a ) ) );
}

// The look's paths a record row paints. The record names the nearest part the rule reaches; its selector says whether the
// rule's subject is that part or an element below it (a container's grid item padding: `.sgs-container--grid >
// .sgs-container__inner > :not(…)`, the inner's children; a text indent: `.sgs-x :is(p, .wp-block-sgs-text) + :is(…)`,
// each paragraph that follows another). The compounds after the part are matched right to left against the look's paths
// below it, which are in document order: a descendant, a child (`>`), the next sibling (`+`) or a later one (`~`). A part
// with a tag or a pseudo-element, a selector that does not name the part, and a list of selectors keep the part as the
// subject (partPaths).
export function rowPaths( row, look, block ) {
	const own = partPaths( row.part, look );
	const part = String( row.part ?? '' );
	const comps = /[\s:]/.test( part ) || ! row.selector ? null : compounds( row.selector );
	if ( ! comps?.length ) {
		return own;
	}
	const short = slugOf( block );
	// The root is named by its own class, its wp-block class or one of its modifiers (`.sgs-container--grid`).
	const names = ( c ) => ( 'ROOT' === part ? ownClasses( c.text ).some( ( k ) => k === `sgs-${ short }` || k === `wp-block-sgs-${ short }` || k.startsWith( `sgs-${ short }--` ) ) : ownClasses( c.text ).includes( part ) );
	const at = comps.map( names ).lastIndexOf( true );
	if ( at < 0 || at === comps.length - 1 ) {
		return own;
	}
	const rest = comps.slice( at + 1 );
	const paths = Object.keys( look?.elements || {} ).filter( ( p ) => ! p.includes( '::' ) && ! p.startsWith( '@' ) );
	const order = new Map( paths.map( ( p, i ) => [ p, i ] ) );
	const parentOf = ( p ) => ( p.includes( ' > ' ) ? p.slice( 0, p.lastIndexOf( ' > ' ) ) : '' === p ? null : '' );
	const below = ( q, p ) => p !== q && ( '' === q || p.startsWith( `${ q } > ` ) );
	// How `p` stands to the element `q` the previous compound matched, by the combinator before p's compound.
	const related = ( comb, q, p ) => {
		if ( ' ' === comb ) {
			return below( q, p );
		}
		if ( '>' === comb ) {
			return parentOf( p ) === q;
		}
		const sibs = paths.filter( ( s ) => s !== '' && parentOf( s ) === parentOf( p ) && order.get( s ) < order.get( p ) && ! below( s, p ) );
		const prev = sibs.filter( ( s ) => parentOf( s ) === parentOf( p ) ).sort( ( a, b ) => order.get( a ) - order.get( b ) );
		return '+' === comb ? prev.at( -1 ) === q : prev.includes( q );
	};
	// The paths the compounds up to `i` can match, each related to one the compound before it matched (the part's own
	// paths before the first); every path stays below the part.
	let matched = own;
	for ( const step of rest ) {
		const prev = matched;
		matched = paths.filter( ( p ) => own.some( ( h ) => below( h, p ) ) && compoundHolds( step.text, p, look ) && prev.some( ( q ) => related( step.comb, q, p ) ) );
	}
	const pe = rest.at( -1 ).text.match( /::(before|after)\b/ );
	const pseudo = pe ? `::${ pe[ 1 ] }` : '';
	return [ ...new Set( matched.map( ( p ) => p + pseudo ) ) ].sort( byDepth );
}

// ---------------------------------------------------------------- tiers

// The media features a plain desktop screen read holds (the browser the drafts are read in: a mouse, motion allowed,
// no forced colours, light scheme). Any other feature (reduced motion, forced colours, a coarse pointer) does not hold.
const PLAIN_SCREEN = new Set( [ 'hover:hover', 'any-hover:hover', 'pointer:fine', 'any-pointer:fine', 'prefers-reduced-motion:no-preference', 'forced-colors:none', 'prefers-color-scheme:light', 'prefers-contrast:no-preference' ] );

// The top-level parts of a list, split at commas outside brackets.
const topLevel = ( text ) => {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of text ) {
		depth += '(' === ch ? 1 : ')' === ch ? -1 : 0;
		if ( 0 === depth && ',' === ch ) {
			out.push( cur );
			cur = '';
		} else {
			cur += ch;
		}
	}
	return [ ...out, cur ].map( ( s ) => s.trim() ).filter( Boolean );
};

// Whether one bracketed media condition (its text without the brackets, spaces removed) holds at width `w`: a min or max
// width, a range (`768px<=width<=1023.98px`, `width>=768px`), or a plain-screen feature.
function conditionHolds( c, w ) {
	const edge = c.match( /^(min|max)-width:([\d.]+)px$/ );
	if ( edge ) {
		return 'min' === edge[ 1 ] ? w >= Number( edge[ 2 ] ) : w <= Number( edge[ 2 ] );
	}
	const range = c.match( /^(?:([\d.]+)px(<=?))?width(?:(<=?|>=?)([\d.]+)px)?$/ );
	if ( range && ( range[ 1 ] || range[ 4 ] ) ) {
		const low = range[ 1 ] ? ( '<' === range[ 2 ] ? w > Number( range[ 1 ] ) : w >= Number( range[ 1 ] ) ) : true;
		const op = range[ 3 ];
		const n = Number( range[ 4 ] );
		const high = ! op || ( '<' === op ? w < n : '<=' === op ? w <= n : '>' === op ? w > n : w >= n );
		return low && high;
	}
	return PLAIN_SCREEN.has( c );
}

// Whether one tier (a media, container or supports condition as the record writes it) holds on a plain screen `w` px
// wide. A media query list holds when any query holds; a query holds when its media type is a screen one and every
// bracketed condition holds (`not` inverts it). Spaces inside the brackets do not matter. A container query is taken to
// hold (its width follows the block's container, `containerTier`). An @supports test is taken to hold (the drafts are read
// in a current Chromium, which has the features the block code tests for), and `@supports not …` not to.
export function tierHolds( tier, w ) {
	const t = String( tier ).trim();
	if ( /^@container/.test( t ) ) {
		return true;
	}
	if ( /^@supports/.test( t ) ) {
		return ! /^@supports\s+not\b/.test( t );
	}
	return topLevel( t.replace( /^@media\s*/, '' ) ).some( ( query ) => {
		const not = /^not\s/.test( query );
		const conditions = [ ...query.matchAll( /\(([^()]*)\)/g ) ].map( ( m ) => m[ 1 ].replace( /\s+/g, '' ) );
		const words = query.replace( /\([^()]*\)/g, ' ' ).split( /\s+/ ).filter( ( x ) => x && ! [ 'and', 'only', 'not' ].includes( x ) );
		const typeHolds = words.every( ( x ) => [ 'screen', 'all' ].includes( x ) );
		const holds = typeHolds && conditions.every( ( c ) => conditionHolds( c, w ) );
		return not ? ! holds : holds;
	} );
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

// A setting that paints several properties at once (`height,width`) names every one: `properties` lists their short names,
// `property` stays the first. Empty for a one-property setting, so its entry keeps its old shape (lib/css-families.mjs::paintedProps
// reads either).
function manyProperties( props, first ) {
	const shorts = [ ...new Set( [ first, ...props ].map( ( p ) => splitProperty( physicalSize( p ) ).short ) ) ];
	return shorts.length > 1 ? { properties: shorts } : {};
}

// A size the record spells logically (`inline-size`, `min-block-size`, what the cascade reader reports) is the physical size the
// block_attributes row and the draft state (width, min-height): a setting painting `width` and `height` is found on rows painting
// `inline-size` and `block-size`, not on the unrelated rows of the same block (the tap-target minimum on an icon's link).
const PHYSICAL_SIZE = { 'inline-size': 'width', 'block-size': 'height', 'min-inline-size': 'min-width', 'min-block-size': 'min-height', 'max-inline-size': 'max-width', 'max-block-size': 'max-height' };
const physicalSize = ( p ) => PHYSICAL_SIZE[ p ] ?? p;
const SIZE_PROPS = [ 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height' ];

// One setting's entry from its usable rows: the rows on its own property (the block_attributes row's, else the first
// row's) give its slots and widths; its other rows are its effects.
function settingEntry( block, name, rows, row, look, facts, elementsOf = blockElements, rivals = [] ) {
	const long = ( props ) => [ ...new Set( props.flatMap( ( p ) => [ physicalSize( p ), ...longhands( physicalSize( p ) ) ] ) ) ];
	const own = longhands( row?.css_property || '' );
	const primaryProps = own.length ? long( own ) : long( rows[ 0 ].props );
	const onProp = rows.filter( ( r ) => long( r.props ).some( ( p ) => primaryProps.includes( p ) ) );
	// The state the setting's own row names (rest when it names none); a setting that also paints in another state (the
	// same colour on focus) keeps those rows as effects.
	const wantState = row?.css_state || null;
	const inState = onProp.filter( ( r ) => ( r.state || null ) === wantState );
	const main = inState.length ? inState : onProp.length ? onProp : rows;
	const pathsOf = ( r ) => rowPaths( r, look, block );
	let slots = [ ...new Set( main.flatMap( pathsOf ) ) ].sort( byDepth );
	// A size setting is placed on the element its block_attributes row names (an icon's size on its glyph, its shape size on its
	// shape), not on every element the size also reaches: the glyph size sizes the shape too while the shape has no size of its own.
	// The element's part is the selector the block's manifest names, else every part another element owns for the same property
	// is left out (the shape's own size setting owns the shape; BEM names a part `sgs-<block>__<element>`).
	if ( row?.css_element && primaryProps.length && primaryProps.every( ( p ) => SIZE_PROPS.includes( p ) ) ) {
		const named = elementPaths( block, row.css_element, look, elementsOf );
		const owned = new Set( ( rivals || [] ).filter( ( r ) => r.css_element !== row.css_element && 'root' !== r.css_element && long( longhands( r.css_property || '' ) ).some( ( q ) => primaryProps.includes( q ) ) ).flatMap( ( r ) => partPaths( `sgs-${ slugOf( block ) }__${ r.css_element }`, look ) ) );
		const onElement = named.length ? slots.filter( ( p ) => named.includes( p ) ) : slots.filter( ( p ) => ! owned.has( p ) );
		onElement.length && ( slots = onElement );
	}
	if ( ! slots.length ) {
		return null;
	}
	const reached = new Set( main.flatMap( ( r ) => reachedAtOf( r.tiers ) ) );
	const effects = [ ...new Set( rows.filter( ( r ) => ! main.includes( r ) ).flatMap( ( r ) => pathsOf( r ).flatMap( ( p ) => r.props.map( ( q ) => `${ p }|${ q }` ) ) ) ) ];
	const prop = main[ 0 ].props.find( ( p ) => long( [ p ] ).some( ( q ) => primaryProps.includes( q ) ) ) || main[ 0 ].props[ 0 ];
	const entry = {
		slot: slots[ 0 ],
		slots,
		property: splitProperty( physicalSize( prop ) ).short,
		...manyProperties( main.flatMap( ( r ) => r.props ).filter( ( p ) => long( [ p ] ).some( ( q ) => primaryProps.includes( q ) ) ), prop ),
		state: row?.css_state || main[ 0 ].state || null,
		forms: facts?.forms || [],
		transform: null,
		reachedAt: WIDTHS.filter( ( w ) => reached.has( w ) ),
		effects,
		tiers: main.map( ( r ) => r.tiers ),
		...( main.some( ( r ) => r.symbolic ) ? { symbolic: main.filter( ( r ) => r.symbolic ).map( ( r ) => ( { tiers: r.tiers, ...r.symbolic } ) ) } : {} ),
		...( main.every( ( r ) => r.unproved ) ? { accepted: true } : {} ),
		...( variantOnlyOf( main, row?.css_element, compounds ) ? { variantOnly: row.css_element } : {} ),
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
	return { slot: null, slots: [], property: splitProperty( prop ).short, ...manyProperties( row?.css_property ? longhands( row.css_property ) : rows.flatMap( ( r ) => r.props ), prop ), state: row?.css_state || rows[ 0 ].state || null, forms: [], transform: null, reachedAt: WIDTHS.filter( ( w ) => reached.has( w ) ), effects: [], tiers: rows.map( ( r ) => r.tiers ) };
}

// The path of a block.json element (supports.sgs.elements) in the site look: its selector's last class, else the root.
function elementPaths( block, element, look, elementsOf = blockElements ) {
	const sel = elementsOf( block )[ element ];
	const cls = sel ? ( String( sel ).match( /\.([A-Za-z0-9_-]+)(?![\s\S]*\.[A-Za-z0-9_-])/ ) || [] )[ 1 ] : null;
	return cls ? partPaths( cls, look ) : [];
}

// A test's record for one block (writeRecordFixture): the whole object the loader returns, written for one client
// (`<dir>/<client>/<block>.record.json`, read only for that client) or for any (`<dir>/<block>.record.json`), as JSON or
// gzip-compressed JSON (`.record.json.gz`: the checked-in records tools/record-fixtures.mjs writes). Only a folder a test
// names holds one; the route's own runs read the framework database and the site look. The path of the file that holds
// it, the client's own before any client's (the path of the plain any-client file when none exists).
export function recordFixtureFile( dir, block, client = null ) {
	const name = `${ slugOf( block ) }.record.json`;
	const places = [ ...( client ? [ path.join( dir, String( client ), name ) ] : [] ), path.join( dir, name ) ];
	return places.flatMap( ( f ) => [ f, `${ f }.gz` ] ).find( ( f ) => fs.existsSync( f ) ) ?? path.join( dir, name );
}

export function writeRecordFixture( dir, block, record, client = null, { gzip = false } = {} ) {
	const file = path.join( dir, ...( client ? [ String( client ) ] : [] ), `${ slugOf( block ) }.record.json${ gzip ? '.gz' : '' }` );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, gzip ? zlib.gzipSync( JSON.stringify( record ), { level: 9 } ) : JSON.stringify( record, null, 1 ) );
	return file;
}

// A fixture record as the loader returns it: one with no `elements` has no site look, so it carries `paintMissing`.
export function readRecordFixture( dir, block, client ) {
	const file = recordFixtureFile( dir, block, client );
	const rec = JSON.parse( file.endsWith( '.gz' ) ? zlib.gunzipSync( fs.readFileSync( file ) ).toString( 'utf8' ) : fs.readFileSync( file, 'utf8' ) );
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
	// A setting the record places whose rule picks no element of the default look (a part drawn only beside a partner
	// setting, a sibling the fixture lacks): kept with why, so a reader can say the record holds it.
	const unplaced = {};
	const rivals = handle.prepare( 'SELECT css_property, css_element FROM block_attributes WHERE block_slug = ? AND css_element IS NOT NULL' ).all( block );
	for ( const [ name, rows ] of usable ) {
		const row = attrRow( handle, block, name );
		const e = look ? settingEntry( block, name, rows, row, look, facts[ name ], elementsOf, rivals ) : bareEntry( rows, row );
		if ( e ) {
			settings[ name ] = e;
		} else {
			unplaced[ name ] = `its rule picks no element of the default look (${ [ ...new Set( rows.map( ( r ) => r.part ) ) ].join( ', ' ) })`;
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
			settings[ name ] = { slot: slots[ 0 ], slots, property: splitProperty( props[ 0 ] ).short, ...manyProperties( props, props[ 0 ] ), state: row.css_state || null, forms: facts[ name ]?.forms || [], transform: null, reachedAt: [ ...WIDTHS ], effects: [], tiers: [ [] ], fromAttributes: true };
		} else if ( ! props.length ) {
			dead.push( name );
		} else if ( ! settings[ name ] && look ) {
			unplaced[ name ] = `its element ${ row?.css_element || '(none named)' } is not drawn in the default look`;
		}
	}
	// The block's content band (the slot its content max-width setting paints, lib/fill-band.mjs::bandSetting): the element
	// the draft folds into the block's root, which lib/fill-same-box.mjs::calSameBox reads as one box with the root where the
	// look holds sizes as declared rather than laid out.
	const band = bandSetting( handle, block, { settings } );
	return {
		block,
		client,
		source: 'setting-record',
		settings,
		...( band ? { contentBand: band.slot } : {} ),
		discovered: look?.discovered || {},
		...( look?.text ? { text: look.text } : {} ),
		...( look?.link ? { link: look.link } : {} ),
		...( look?.presence ? { presence: look.presence } : {} ),
		elements: look?.elements || {},
		...( look?.pathAttrs ? { pathAttrs: look.pathAttrs } : {} ),
		...( look?.conditionalParts ? { conditionalParts: look.conditionalParts } : {} ),
		...( look?.paintStates ? { paintStates: look.paintStates } : {} ),
		dead: dead.sort(),
		unplaced,
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
