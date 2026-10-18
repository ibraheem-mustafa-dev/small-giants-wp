// The capability inventory (clone coverage plan Phase 1, steps 1.1 and 1.2): everything the SGS framework offers and
// everything a draft can hold, as stable IDs grouped into sections. Every section is derived from a source (the
// framework DB read-only, the code, the construct registry or the web platform's own data packages), never from a
// hand-written list (R-31-1). A DB section reads `status: 'absent'` when the DB is not on this machine, so the code and
// web sections still build anywhere; `capabilities.mjs --write` on a machine with the DB fills every section.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { htmlTagNames } from 'html-tag-names';
import { htmlElementAttributes } from 'html-element-attributes';
import { DB_PATH, openDb, isPseudoProperty } from './db.mjs';
import { loadRegistry } from './intake-registry.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const REPO = path.resolve( ROUTE, '..', '..' );
export const CAPABILITIES_FILE = path.join( ROUTE, 'data', 'capabilities.json' );
const require = createRequire( import.meta.url );
const EXAMPLES = 5;

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const dirs = ( d ) => ( fs.existsSync( d ) ? fs.readdirSync( d, { withFileTypes: true } ).filter( ( e ) => e.isDirectory() ).map( ( e ) => e.name ).sort() : [] );
const files = ( d, rx ) => ( fs.existsSync( d ) ? fs.readdirSync( d ).filter( ( f ) => rx.test( f ) ).sort() : [] );
const byId = ( a, b ) => ( a.id < b.id ? -1 : a.id > b.id ? 1 : 0 );

// Members grouped under one ID: { id, label, count, examples (the first few, sorted), motion }. An entry a data package
// marks deprecated, obsolete or non-standard also carries `deprecated: true`.
function grouped( rows, keyOf, labelOf, memberOf, motionOf = () => false ) {
	const groups = new Map();
	for ( const r of rows ) {
		const id = keyOf( r );
		const g = groups.get( id ) || { id, label: labelOf( r ), members: [], motion: false };
		g.members.push( memberOf( r ) );
		g.motion = g.motion || !! motionOf( r );
		groups.set( id, g );
	}
	return [ ...groups.values() ].map( ( g ) => {
		const m = [ ...new Set( g.members ) ].sort();
		return { id: g.id, label: g.label, count: m.length, examples: m.slice( 0, EXAMPLES ), motion: g.motion };
	} ).sort( byId );
}

const one = ( id, label, motion = false ) => ( { id, label, count: 1, examples: [], motion } );

// The kind of a block setting: motion (the motion model, a motion role or an anim:/fx: pseudo-property), styling (a
// CSS property), mode (an enum with no CSS property) or its attribute type.
export function settingKind( r ) {
	if ( 'sgsMotion' === r.attr_name || 'motion' === r.role || isPseudoProperty( r.css_property ) ) {
		return 'motion';
	}
	if ( String( r.css_property ?? '' ).trim() ) {
		return 'styling';
	}
	const e = String( r.enum_values ?? '' ).trim();
	return e && '[]' !== e && 'null' !== e ? 'mode' : r.attr_type || 'unknown';
}

// ---- Framework sections from the DB (read-only) ----

export function dbSections( db ) {
	const attrs = db.prepare( "SELECT block_slug, attr_name, attr_type, enum_values, css_property, role FROM block_attributes WHERE source IN ('sgs','sgs-ext')" ).all();
	const fx = db.prepare( 'SELECT effect, tier, triggers FROM fx_effects' ).all();
	const presets = db.prepare( 'SELECT slug, panel, family FROM motion_presets' ).all();
	return {
		'block-setting': grouped( attrs, ( r ) => `block-setting:${ r.role || 'unclassified' }:${ settingKind( r ) }`, ( r ) => `block settings, role ${ r.role || 'unclassified' }, ${ settingKind( r ) }`, ( r ) => `${ r.block_slug }.${ r.attr_name }`, ( r ) => 'motion' === settingKind( r ) ),
		fx: fx.map( ( r ) => one( `fx:${ r.effect }`, `fx effect ${ r.effect } (${ r.tier }, ${ r.triggers })`, true ) ).sort( byId ),
		'motion-preset': grouped( presets, ( r ) => `motion-preset:${ r.panel }:${ r.family }`, ( r ) => `${ r.panel } presets, family ${ r.family }`, ( r ) => r.slug, () => true ),
	};
}

// ---- Framework sections from the code ----

// supports.sgs keys across every block.json under plugins/*/src/blocks (a `_`-prefixed key is an annotation).
function supportKeys( root ) {
	const rows = [];
	for ( const plugin of dirs( path.join( root, 'plugins' ) ) ) {
		const blocks = path.join( root, 'plugins', plugin, 'src', 'blocks' );
		for ( const b of dirs( blocks ) ) {
			const f = path.join( blocks, b, 'block.json' );
			if ( fs.existsSync( f ) ) {
				const j = readJson( f );
				Object.keys( j.supports?.sgs || {} ).filter( ( k ) => ! k.startsWith( '_' ) ).forEach( ( key ) => rows.push( { key, block: j.name || b } ) );
			}
		}
	}
	return grouped( rows, ( r ) => `sgs-support:${ r.key }`, ( r ) => `supports.sgs.${ r.key }`, ( r ) => r.block, ( r ) => 'motion' === r.key );
}

function extensions( root ) {
	const f = path.join( root, 'plugins', 'sgs-blocks', 'src', 'blocks', 'extensions', 'extension-roster.json' );
	if ( ! fs.existsSync( f ) ) {
		return [];
	}
	return readJson( f ).extensions.map( ( e ) => {
		const attrs = Object.entries( e.attributes || {} );
		return { id: `extension:${ e.id }`, label: `extension ${ e.id } (${ e.file })`, count: attrs.length, examples: attrs.map( ( [ k ] ) => k ).sort().slice( 0, EXAMPLES ), motion: attrs.some( ( [ , a ] ) => 'motion' === a.role ) };
	} ).sort( byId );
}

const themeFiles = ( root, sub, prefix, rx ) => files( path.join( root, 'theme', 'sgs-theme', sub ), rx ).map( ( f ) => one( `${ prefix }:${ f.replace( rx, '' ) }`, `${ sub }/${ f }` ) );

// Post types: each register_post_type( self::CONST or 'literal' ) resolved through the class constants in its file.
function postTypes( root ) {
	const out = [];
	for ( const plugin of dirs( path.join( root, 'plugins' ) ) ) {
		const stack = [ path.join( root, 'plugins', plugin, 'includes' ) ];
		while ( stack.length ) {
			const d = stack.pop();
			if ( ! fs.existsSync( d ) ) {
				continue;
			}
			for ( const e of fs.readdirSync( d, { withFileTypes: true } ) ) {
				const p = path.join( d, e.name );
				if ( e.isDirectory() ) {
					stack.push( p );
				} else if ( e.name.endsWith( '.php' ) ) {
					const src = fs.readFileSync( p, 'utf8' );
					const consts = Object.fromEntries( [ ...src.matchAll( /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*'([^']+)'/g ) ].map( ( m ) => [ m[ 1 ], m[ 2 ] ] ) );
					for ( const m of src.matchAll( /\\?register_post_type\s*\(\s*(?:self::([A-Z_][A-Z0-9_]*)|'([^']+)')/g ) ) {
						const slug = m[ 2 ] || consts[ m[ 1 ] ];
						if ( slug ) {
							out.push( one( `post-type:${ slug }`, `post type ${ slug } (${ path.relative( root, p ).split( path.sep ).join( '/' ) })` ) );
						}
					}
				}
			}
		}
	}
	return [ ...new Map( out.map( ( e ) => [ e.id, e ] ) ).values() ].sort( byId );
}

// Plugins: each plugins/<slug>/ folder whose top-level PHP file carries a WordPress `Plugin Name:` header.
const pluginsOf = ( root ) => dirs( path.join( root, 'plugins' ) ).filter( ( p ) => files( path.join( root, 'plugins', p ), /\.php$/ ).some( ( f ) => /^\s*\*?\s*Plugin Name:/m.test( fs.readFileSync( path.join( root, 'plugins', p, f ), 'utf8' ).slice( 0, 4096 ) ) ) ).map( ( p ) => one( `plugin:${ p }`, `plugin ${ p }` ) );

// Theme-snapshot key paths: the union across sites/*/theme-snapshot.json, three levels under `settings` (where the
// SGS token families live) and two elsewhere. Keys only: no value or client name reaches the inventory.
export function snapshotKeyPaths( snapshots ) {
	const rows = [];
	const walk = ( obj, trail, depth ) => {
		for ( const [ k, v ] of Object.entries( obj || {} ) ) {
			const p = [ ...trail, k ];
			if ( p.length > 1 ) {
				rows.push( p.join( '.' ) );
			}
			if ( p.length < depth && v && 'object' === typeof v && ! Array.isArray( v ) ) {
				walk( v, p, depth );
			}
		}
	};
	snapshots.forEach( ( s ) => [ 'settings', 'styles' ].forEach( ( top ) => s[ top ] && walk( s[ top ], [ top ], 'settings' === top ? 3 : 2 ) ) );
	return [ ...new Set( rows ) ].sort().map( ( p ) => one( `snapshot-key:${ p }`, `theme-snapshot ${ p }` ) );
}

const snapshots = ( root ) => dirs( path.join( root, 'sites' ) ).map( ( s ) => path.join( root, 'sites', s, 'theme-snapshot.json' ) ).filter( ( f ) => fs.existsSync( f ) ).map( readJson );

export function codeSections( root = REPO ) {
	return {
		'sgs-support': supportKeys( root ),
		extension: extensions( root ),
		template: themeFiles( root, 'templates', 'template', /\.html$/ ),
		part: themeFiles( root, 'parts', 'part', /\.html$/ ),
		pattern: themeFiles( root, 'patterns', 'pattern', /\.php$/ ),
		'post-type': postTypes( root ),
		plugin: pluginsOf( root ),
		'snapshot-key': snapshotKeyPaths( snapshots( root ) ),
	};
}

// ---- What a draft can hold ----

const kidsOf = ( o ) => Object.keys( o || {} ).filter( ( k ) => '__compat' !== k );
const deprecatedIn = ( node ) => !! node?.__compat?.status?.deprecated;
// The ID slug of an mdn-data property group (`CSS Grid Layout` → `grid-layout`); intake maps a used property through it.
export const groupSlug = ( g ) => g.toLowerCase().replace( /^css\s+/, '' ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );
// A browser-compat-data child that is a real attribute, not a feature note: an attribute name has no underscore, and a
// described entry names itself in <code>.
const isAttribute = ( name, node ) => ! name.includes( '_' ) && ( ! node.__compat?.description || node.__compat.description.includes( `<code>${ name }</code>` ) );
const withFlag = ( e, deprecated ) => ( deprecated ? { ...e, deprecated: true } : e );
// One entry per ID (`:host` and `:host()` are one capability); deprecated only when every form is.
function unique( list ) {
	const m = new Map();
	for ( const e of list ) {
		const prev = m.get( e.id );
		m.set( e.id, prev ? { ...prev, deprecated: prev.deprecated && e.deprecated } : e );
	}
	return [ ...m.values() ].map( ( { deprecated, ...e } ) => ( deprecated ? { ...e, deprecated } : e ) ).sort( byId );
}

// CSS units: mdn-data's unit list, browser-compat-data's length units (each group of new viewport and container units
// is named in its description), and the percentage sign.
function cssUnits( css, bcd ) {
	const units = new Set( Object.keys( css.units ).map( ( u ) => u.toLowerCase() ) );
	const length = bcd.css.types.length;
	for ( const k of kidsOf( length ) ) {
		if ( ! k.includes( '_' ) ) {
			units.add( k.toLowerCase() );
		}
		for ( const m of String( length[ k ].__compat?.description || '' ).matchAll( /<code>([a-z]+)<\/code>/gi ) ) {
			units.add( m[ 1 ].toLowerCase() );
		}
	}
	units.add( 'percent' );
	return [ ...units ].sort().map( ( u ) => one( `css-unit:${ u }`, 'percent' === u ? '%' : u ) );
}

// HTML attributes: every global attribute (`html-attr:global.<name>`) and every element's own attribute
// (`html-attr:<element>.<name>`), the union of browser-compat-data (with its deprecated flags), the WHATWG lists in
// html-element-attributes (`*` holds the global ones) and the WHATWG Rendering section's attribute rules
// (data/presentational-hints.json: `<table background>` renders though neither list holds it). `data_attributes`
// stands for every data-*.
function htmlAttributes( bcd, lists, hints = [] ) {
	const out = new Map();
	const add = ( id, label, deprecated ) => out.set( id, withFlag( one( id, label ), deprecated || out.get( id )?.deprecated ) );
	const g = bcd.html.global_attributes;
	kidsOf( g ).forEach( ( a ) => add( `html-attr:global.${ 'data_attributes' === a ? 'data' : a }`, 'data_attributes' === a ? 'data-* attributes' : `${ a } (any element)`, deprecatedIn( g[ a ] ) ) );
	( lists[ '*' ] || [] ).forEach( ( a ) => out.has( `html-attr:global.${ a }` ) || add( `html-attr:global.${ a }`, `${ a } (any element)`, false ) );
	for ( const el of kidsOf( bcd.html.elements ) ) {
		const node = bcd.html.elements[ el ];
		kidsOf( node ).filter( ( a ) => isAttribute( a, node[ a ] ) ).forEach( ( a ) => add( `html-attr:${ el }.${ a }`, `<${ el } ${ a }>`, deprecatedIn( node[ a ] ) || deprecatedIn( node ) ) );
	}
	for ( const [ el, attrs ] of Object.entries( lists ).filter( ( [ el ] ) => '*' !== el ) ) {
		attrs.filter( ( a ) => ! out.has( `html-attr:${ el }.${ a }` ) && ! out.has( `html-attr:global.${ a }` ) ).forEach( ( a ) => add( `html-attr:${ el }.${ a }`, `<${ el } ${ a }>`, deprecatedIn( bcd.html.elements[ el ] ) ) );
	}
	hints.filter( ( h ) => '*' !== h.element && ! out.has( `html-attr:${ h.element }.${ h.attribute }` ) && ! out.has( `html-attr:global.${ h.attribute }` ) ).forEach( ( h ) => add( `html-attr:${ h.element }.${ h.attribute }`, `<${ h.element } ${ h.attribute }>`, deprecatedIn( bcd.html.elements[ h.element ] ) ) );
	return [ ...out.values() ].sort( byId );
}

export const HINTS_FILE = path.join( ROUTE, 'data', 'presentational-hints.json' );
const readHints = () => ( fs.existsSync( HINTS_FILE ) ? readJson( HINTS_FILE ).entries : [] );

// Every function mdn-data's CSS grammar names (`repeat()`, `fit-content()` and the like that its function list omits):
// each `name(` in a syntax, a property syntax or an at-rule descriptor syntax.
export function grammarFunctions( css ) {
	const texts = [ ...Object.values( css.syntaxes || {} ).map( ( x ) => x.syntax ), ...Object.values( css.properties ).map( ( x ) => x.syntax ) ];
	return [ ...new Set( texts.flatMap( ( t ) => [ ...String( t || '' ).matchAll( /(?<![\w-])([a-z][a-z0-9-]*)\(/gi ) ].map( ( m ) => m[ 1 ].toLowerCase() ) ) ) ].sort();
}

// What a draft can hold, from the web platform's data packages and the construct registry.
export function draftSections( { registry = loadRegistry(), css = require( 'mdn-data/css' ), tags = htmlTagNames, bcd = require( '@mdn/browser-compat-data' ), oembed = require( 'oembed-providers' ), aria = require( 'aria-query' ), attributes = htmlElementAttributes, hints = readHints() } = {} ) {
	const groups = [];
	for ( const [ prop, p ] of Object.entries( css.properties ) ) {
		( p.groups || [ 'ungrouped' ] ).forEach( ( g ) => groups.push( { prop, g } ) );
	}
	const media = bcd.css[ 'at-rules' ].media;
	// Pseudo-classes and pseudo-elements: mdn-data's, and browser-compat-data's (which also holds the vendor ones a
	// draft uses for scrollbars, sliders and meters, `::-webkit-scrollbar`), each written with its colons in the
	// description. Obsolete (mdn-data) or deprecated (browser-compat-data) is flagged; vendor-prefixed is not, since
	// `::-webkit-slider-thumb` is non-standard but is how every current browser styles a range slider.
	const bcdSel = bcd.css.selectors || {};
	const selectors = [
		...Object.entries( css.selectors ).filter( ( [ k ] ) => k.startsWith( ':' ) ).map( ( [ k, v ] ) => [ k, 'obsolete' === v.status ] ),
		...kidsOf( bcdSel ).map( ( k ) => [ /^<code>(::?[a-z-]+)/i.exec( bcdSel[ k ].__compat?.description || '' )?.[ 1 ], deprecatedIn( bcdSel[ k ] ) ] ).filter( ( [ k ] ) => k ),
	];
	const name = ( k ) => k.replace( /^:+/, '' ).replace( /\(\)$/, '' ).toLowerCase();
	const bcdProps = bcd.css.properties || {};
	const input = bcd.html.elements.input;
	const hosts = new Map();
	for ( const p of oembed ) {
		try {
			hosts.set( new URL( p.provider_url ).hostname.replace( /^www\./, '' ), p.provider_name );
		} catch {
			// A provider with no usable URL names no host.
		}
	}
	return {
		html: [ ...new Set( tags ) ].sort().map( ( t ) => withFlag( one( `html:${ t }`, `<${ t }>` ), deprecatedIn( bcd.html.elements[ t ] ) ) ),
		'html-attr': htmlAttributes( bcd, attributes, hints ),
		'input-type': kidsOf( input ).filter( ( k ) => k.startsWith( 'type_' ) ).map( ( k ) => withFlag( one( `input-type:${ k.slice( 5 ) }`, `<input type="${ k.slice( 5 ) }">` ), deprecatedIn( input[ k ] ) ) ).sort( byId ),
		svg: kidsOf( bcd.svg.elements ).map( ( e ) => withFlag( one( `svg:${ e }`, `SVG <${ e }>`, [ 'animate', 'animateMotion', 'animateTransform', 'set', 'mpath' ].includes( e ) ), deprecatedIn( bcd.svg.elements[ e ] ) ) ).sort( byId ),
		embed: [ ...hosts ].sort().map( ( [ h, n ] ) => one( `embed:${ h }`, `${ n } embed (${ h })` ) ),
		'css-at': Object.keys( css.atRules ).sort().map( ( a ) => one( `css-at:${ a.replace( /^@/, '' ) }`, a ) ),
		'css-media-feature': kidsOf( media ).filter( ( k ) => ! k.includes( '_' ) ).map( ( k ) => withFlag( one( `css-media-feature:${ k }`, `@media (${ k })`, 'prefers-reduced-motion' === k ), deprecatedIn( media[ k ] ) ) ).sort( byId ),
		'css-group': grouped( groups, ( r ) => `css-group:${ groupSlug( r.g ) }`, ( r ) => `CSS properties: ${ r.g }`, ( r ) => r.prop, ( r ) => /animation|transition|motion|scroll-driven/i.test( r.g ) ),
		'css-pseudo-class': unique( selectors.filter( ( [ k ] ) => ! k.startsWith( '::' ) ).map( ( [ k, dep ] ) => withFlag( one( `css-pseudo-class:${ name( k ) }`, k ), dep ) ) ),
		'css-pseudo-element': unique( selectors.filter( ( [ k ] ) => k.startsWith( '::' ) ).map( ( [ k, dep ] ) => withFlag( one( `css-pseudo-element:${ name( k ) }`, k ), dep ) ) ),
		// CSS properties mdn-data's groups do not hold (vendor and legacy ones, `-webkit-user-drag`), by browser-compat-data.
		'css-property': kidsOf( bcdProps ).filter( ( p ) => ! css.properties[ p ] ).map( ( p ) => withFlag( one( `css-property:${ p }`, p ), deprecatedIn( bcdProps[ p ] ) ) ).sort( byId ),
		'css-function': unique( [ ...Object.entries( css.functions ), ...grammarFunctions( css ).map( ( f ) => [ `${ f }()`, { status: 'standard' } ] ) ].map( ( [ k, v ] ) => withFlag( one( `css-function:${ k.replace( /\(\)$/, '' ).toLowerCase() }`, k, /^(?:matrix|rotate|scale|skew|translate|perspective|steps|cubic-bezier|linear|scroll|view)/i.test( k ) ), 'obsolete' === v.status ) ) ),
		'css-unit': cssUnits( css, bcd ),
		'aria-role': [ ...aria.roles.keys() ].filter( ( r ) => ! aria.roles.get( r ).abstract ).sort().map( ( r ) => one( `aria-role:${ r }`, `role="${ r }"` ) ),
		'aria-attr': [ ...aria.aria.keys() ].sort().map( ( a ) => one( `aria-attr:${ a }`, a ) ),
		construct: Object.keys( registry ).sort().map( ( k ) => one( `construct:${ k }`, `runtime construct ${ k }`, [ 'waapi', 'transition', 'keyframes' ].includes( k ) ) ),
	};
}

// ---- The whole inventory ----

const DB_SECTIONS = [ 'block-setting', 'fx', 'motion-preset' ];
const CODE_SECTIONS = [ 'sgs-support', 'extension', 'template', 'part', 'pattern', 'post-type', 'plugin', 'snapshot-key' ];
const DRAFT_SECTIONS = [ 'html', 'html-attr', 'input-type', 'svg', 'embed', 'css-at', 'css-media-feature', 'css-group', 'css-property', 'css-pseudo-class', 'css-pseudo-element', 'css-function', 'css-unit', 'aria-role', 'aria-attr', 'construct' ];

// { sections: { <name>: { side, source, status, entries } } }. `dbFile` null or missing marks the DB sections absent.
export function buildInventory( { root = REPO, dbFile = DB_PATH, ...sources } = {} ) {
	let db = null;
	if ( dbFile && fs.existsSync( dbFile ) ) {
		db = openDb( dbFile );
	}
	try {
		const fromDb = db ? dbSections( db ) : {};
		const fromCode = codeSections( root );
		const fromDraft = draftSections( Object.fromEntries( Object.entries( sources ).filter( ( [ , v ] ) => undefined !== v ) ) );
		const sections = {};
		DB_SECTIONS.forEach( ( s ) => ( sections[ s ] = { side: 'framework', source: 'db', status: db ? 'ok' : 'absent', entries: fromDb[ s ] || [] } ) );
		CODE_SECTIONS.forEach( ( s ) => ( sections[ s ] = { side: 'framework', source: 'code', status: 'ok', entries: fromCode[ s ] } ) );
		DRAFT_SECTIONS.forEach( ( s ) => ( sections[ s ] = { side: 'draft', source: 'construct' === s ? 'registry' : 'web', status: 'ok', entries: fromDraft[ s ] } ) );
		return { sections };
	} finally {
		db?.close();
	}
}

// The section an ID belongs to: the text before its first colon.
export const sectionOf = ( id ) => String( id ).split( ':' )[ 0 ];

// Every entry of an inventory, flattened: [ { ...entry, section } ].
export const allEntries = ( inv ) => Object.entries( inv.sections ).flatMap( ( [ section, s ] ) => s.entries.map( ( e ) => ( { ...e, section } ) ) );

// Merge a fresh inventory over a committed one: a section that is absent in the fresh run (no DB here) keeps the
// committed entries, so writing on a machine without the DB never erases what a machine with it recorded.
export function mergeInventory( fresh, committed ) {
	const sections = { ...fresh.sections };
	for ( const [ name, s ] of Object.entries( sections ) ) {
		const old = committed?.sections?.[ name ];
		if ( 'absent' === s.status && old && 'ok' === old.status ) {
			sections[ name ] = old;
		}
	}
	return { sections };
}

export const readInventoryFile = ( f = CAPABILITIES_FILE ) => ( fs.existsSync( f ) ? readJson( f ) : null );
