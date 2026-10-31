#!/usr/bin/env node
// Every occurrence of the CSS features the intake listed as seen but unsupported, per client, with the draft element it
// styles and the block that element lands on in the proposed skeleton.
//   node scripts/computed-route/tools/unsupported-css-instances.mjs [--client <slug>]... [--out <file.md>] [--json <file>]
// Read through the route's own readers, never a pattern over the draft files: the census's draft sources
// (lib/intake-census.mjs::staticCensus over every entry draft, rendered in the sandbox from the intake's replay file), the usage read
// intake raises the rows from (lib/intake-usage.mjs::draftUsage, into an instance tally that keeps every sighting with its
// selector and declaration), the fact record (sites/<client>/build/intake/facts.json: each element's tag, words and the
// values its bound styles take), the skeleton inventories (sites/<client>/build/intake/inventories/<surface>.json: the
// rendered elements a stylesheet selector matches) and the proposed skeletons (intake.json `skeletons`: the block of each
// element, or of the block that absorbs it). A value the draft's code writes is traced to the elements whose bound style
// takes it (the fact record's hole values).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { staticCensus } from '../lib/intake-census.mjs';
import { draftUsage, instanceTally, cssUsage } from '../lib/intake-usage.mjs';
import { pathsFor } from '../lib/intake-run.mjs';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { readInventoryFile, allEntries } from '../lib/capabilities.mjs';

const csstree = createRequire( import.meta.url )( 'css-tree' );
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
// Every client whose intake has run (sites/<client>/build/intake/intake.json and its export folder).
export const intakeClients = ( repo = REPO ) => fs.readdirSync( path.join( repo, 'sites' ) ).filter( ( c ) => fs.existsSync( path.join( repo, 'sites', c, 'build', 'intake', 'intake.json' ) ) && fs.existsSync( path.join( repo, 'sites', c, 'handoff', 'MANIFEST.json' ) ) ).sort();
// The features Bean's list names (the intake's seen-but-unsupported rows), in the report's order.
export const FEATURES = [
	[ 'css-function:brightness', 'brightness() filter' ], [ 'css-function:saturate', 'saturate() filter' ], [ 'css-function:sepia', 'sepia() filter' ],
	[ 'css-function:hue-rotate', 'hue-rotate() filter' ], [ 'css-function:polygon', 'polygon() shape' ], [ 'css-unit:ch', 'ch unit' ], [ 'css-unit:mm', 'mm unit' ],
	[ 'css-group:overflow', 'overflow properties' ], [ 'css-group:images', 'image properties (object-position and the rest)' ], [ 'css-group:lists-and-counters', 'list and counter properties' ],
	[ 'css-group:logical-properties-and-values', 'logical properties' ], [ 'css-group:scroll-snap', 'scroll snap' ], [ 'css-group:masking', 'masking and clipping' ],
	[ 'css-group:compositing-and-blending', 'compositing and blending' ], [ 'css-group:transforms', 'transforms' ], [ 'css-group:basic-user-interface', 'user interface properties' ],
	[ 'css-group:writing-modes', 'writing modes' ], [ 'css-pseudo-element:selection', '::selection' ], [ 'css-pseudo-element:placeholder', '::placeholder' ],
];
const WANT = new Set( FEATURES.map( ( [ id ] ) => id ) );
const MAX_ELEMENTS = 6;

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const clip = ( s, n = 60 ) => ( String( s ).length > n ? `${ String( s ).slice( 0, n - 1 ) }…` : String( s ) );

// --- selector matching over an inventory's rendered elements ----------------------------------------------------------

const classes = ( el ) => String( el.attrs?.class || '' ).split( /\s+/ ).filter( Boolean );
function simple( el, n ) {
	switch ( n.type ) {
		case 'TypeSelector':
			return '*' === n.name || String( el.tag ).toLowerCase() === n.name.toLowerCase();
		case 'ClassSelector':
			return classes( el ).includes( n.name );
		case 'IdSelector':
			return el.attrs?.id === n.name;
		case 'AttributeSelector': {
			const name = n.name.name;
			const v = el.attrs?.[ name ];
			if ( undefined === v ) {
				return false;
			}
			const want = n.value ? ( n.value.value ?? n.value.name ) : null;
			const op = n.matcher;
			return ! op || ( '=' === op ? v === want : '~=' === op ? v.split( /\s+/ ).includes( want ) : '^=' === op ? v.startsWith( want ) : '$=' === op ? v.endsWith( want ) : '*=' === op ? v.includes( want ) : '|=' === op ? v === want || v.startsWith( `${ want }-` ) : true );
		}
		case 'PseudoClassSelector':
			// A state or structural pseudo-class is taken to hold (the element is the one the rule can style); :not() and
			// :is() are read for their argument.
			if ( 'not' === n.name && n.children ) {
				return ! [ ...n.children ].some( ( list ) => [ ...( list.children || [] ) ].some( ( sel ) => matches( el, sel ) ) );
			}
			return true;
		default:
			return true;
	}
}
// A selector as compounds, right to left: [ { parts, combinator (to the compound on its left) } ].
function compounds( sel ) {
	const out = [ { parts: [], combinator: null } ];
	for ( const n of sel.children ) {
		if ( 'Combinator' === n.type ) {
			out.at( -1 ).combinator = n.name;
			out.push( { parts: [], combinator: null } );
		} else {
			out.at( -1 ).parts.push( n );
		}
	}
	return out.reverse();
}
let INDEX = null;
function matchesFrom( el, cs, i ) {
	if ( ! cs[ i ].parts.every( ( p ) => simple( el, p ) ) ) {
		return false;
	}
	if ( i === cs.length - 1 ) {
		return true;
	}
	const comb = cs[ i + 1 ].combinator;
	const parent = INDEX.byKey.get( el.parentKey );
	if ( '>' === comb ) {
		return Boolean( parent ) && matchesFrom( parent, cs, i + 1 );
	}
	if ( '+' === comb || '~' === comb ) {
		const sibs = INDEX.children.get( el.parentKey ) || [];
		const before = sibs.slice( 0, sibs.indexOf( el ) );
		return ( '+' === comb ? before.slice( -1 ) : before ).some( ( s ) => matchesFrom( s, cs, i + 1 ) );
	}
	for ( let a = parent; a; a = INDEX.byKey.get( a.parentKey ) ) {
		if ( matchesFrom( a, cs, i + 1 ) ) {
			return true;
		}
	}
	return false;
}
const matches = ( el, sel ) => matchesFrom( el, compounds( sel ), 0 );
function indexOf( elements ) {
	const byKey = new Map( elements.map( ( e ) => [ e.key, e ] ) );
	const children = new Map();
	elements.forEach( ( e ) => children.set( e.parentKey, [ ...( children.get( e.parentKey ) || [] ), e ] ) );
	return { byKey, children };
}

// --- one client --------------------------------------------------------------------------------------------------------


// The block an inventory element lands on: its skeleton row's block, or (absorbed, unwrapped or without a row) the block
// of the nearest ancestor that has one; a removed element says so.
function landing( el, rowsByKey, inv ) {
	for ( let e = el, hop = 0; e; e = inv.byKey.get( e.parentKey ), hop++ ) {
		const r = rowsByKey.get( e.key );
		if ( r?.action === 'remove' ) {
			return 0 === hop ? 'removed by the skeleton' : `inside an element the skeleton removes`;
		}
		if ( r && ! r.action && r.block ) {
			return 0 === hop ? r.block : `${ r.block } (absorbed into it)`;
		}
	}
	return 'no block (outside the skeleton root)';
}

// What a draft element is, in a few words: its tag, its label or words, and its class.
function describe( fact, el ) {
	const t = fact?.template || {};
	const tag = t.realTag || t.tag || el?.tag || 'element';
	const attrs = { ...( t.attrs || {} ), ...( el?.attrs || {} ) };
	const label = attrs[ 'aria-label' ] || attrs.alt || attrs.placeholder || attrs.title;
	const words = t.words || el?.words || '';
	const what = label && ! String( label ).includes( '{{' ) ? `"${ clip( label, 40 ) }"` : words ? `"${ clip( words, 40 ) }"` : '';
	const cls = classes( { attrs } ).filter( ( c ) => ! c.includes( '{{' ) ).slice( 0, 2 ).join( ' ' );
	return [ `<${ tag }>`, what, cls ? `.${ cls.replace( / /g, '.' ) }` : '' ].filter( Boolean ).join( ' ' );
}

export async function clientInstances( client, { repo = REPO, log = () => {} } = {} ) {
	const at = pathsFor( repo, client );
	const manifest = recheckManifest( at.folder );
	const entries = readJson( path.join( at.folder, 'MANIFEST.json' ) ).entry_drafts || [];
	log( `${ client }: reading the draft sources of ${ entries.join( ', ' ) } in the sandbox` );
	const { sources } = await staticCensus( { folder: at.folder, entry: entries[ 0 ], entries, harPath: at.replay( manifest.manifestHash ) } );
	const known = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
	const t = instanceTally();
	draftUsage( { sources, folder: at.folder, known, t } );
	const facts = readJson( at.facts );
	const intake = readJson( at.intake );
	const fileOf = new Map( sources.flatMap( ( s ) => [ [ s.component, s.file ], ...( s.scripts || [] ).filter( ( x ) => x.file ).map( ( x ) => [ x.src, x.file ] ) ] ) );
	// Every surface's rendered elements and skeleton rows.
	const surfaces = Object.entries( intake.skeletons || {} ).map( ( [ name, sk ] ) => {
		const f = path.join( at.inventories, `${ name }.json` );
		const elements = fs.existsSync( f ) ? readJson( f ).elements : [];
		return { name, elements, inv: indexOf( elements ), rowsByKey: new Map( ( sk.rows || [] ).map( ( r ) => [ r.key, r ] ) ) };
	} );
	// The values each element's bound styles take (the fact record's hole values), for tracing a value the code writes.
	const bound = [];
	for ( const [ key, e ] of Object.entries( facts.elements || {} ) ) {
		for ( const [ hole, widths ] of Object.entries( e.logic?.holes || {} ) ) {
			if ( ! hole.startsWith( 'style:' ) ) {
				continue;
			}
			const values = new Set( Object.values( widths ).flatMap( ( w ) => ( w.v || [] ).filter( ( x ) => 'string' === x.t ).map( ( x ) => x.v ) ) );
			values.forEach( ( v ) => bound.push( { key, property: hole.slice( 6 ).replace( /#\d+$/, '' ), value: v } ) );
		}
	}
	const usesFeature = ( value, id ) => {
		const tt = instanceTally();
		cssUsage( value, tt, 'x', known, 'value' );
		return tt.has( id );
	};
	// The elements an instance styles: [ { draftId, key, what, lands: [ 'surface: block' ] } ].
	const elementsOf = ( inst ) => {
		const comp = String( inst.draftId ).split( ':' )[ 0 ];
		const n = String( inst.draftId ).split( ':' )[ 1 ];
		const fact = facts.elements?.[ `${ comp }/${ n }` ];
		let found;
		if ( /:js:/.test( inst.draftId ) && ! inst.selector ) {
			const text = String( inst.value ?? '' ).replace( /\s+/g, ' ' ).trim();
			found = [ ...new Set( bound.filter( ( b ) => b.value.replace( /\s+/g, ' ' ).trim() === text || ( inst.property && b.property === inst.property && usesFeature( b.value, inst.id ) && b.value.includes( text ) ) ).map( ( b ) => b.key ) ) ];
			// A value the render never showed (another product's filter) is traced to the elements whose bound style takes
			// values of this feature: the place the code puts it.
			if ( ! found.length ) {
				found = [ ...new Set( bound.filter( ( b ) => usesFeature( b.value, inst.id ) ).map( ( b ) => b.key ) ) ];
				return found.map( ( k ) => ( { ...target( k ), via: 'bound' } ) );
			}
			return found.map( ( k ) => target( k ) );
		}
		if ( inst.selector ) {
			let sel;
			try {
				sel = csstree.parse( inst.selector, { context: 'selectorList' } );
			} catch {
				return [];
			}
			const keys = new Set();
			for ( const s of surfaces ) {
				INDEX = s.inv;
				for ( const el of s.elements ) {
					[ ...sel.children ].some( ( one ) => matches( el, one ) ) && keys.add( `${ el.template }/${ el.tpl }` );
				}
			}
			return [ ...keys ].map( ( k ) => target( k ) );
		}
		return fact ? [ target( `${ comp }/${ n }` ) ] : [];
	};
	const target = ( key ) => {
		const [ comp, n ] = [ key.slice( 0, key.lastIndexOf( '/' ) ), key.slice( key.lastIndexOf( '/' ) + 1 ) ];
		const lands = new Set();
		let el = null;
		for ( const s of surfaces ) {
			for ( const e of s.elements.filter( ( x ) => x.template === comp && String( x.tpl ) === n ) ) {
				el = el || e;
				lands.add( `${ s.name }: ${ landing( e, s.rowsByKey, s.inv ) }` );
			}
		}
		return { draftId: `${ comp }:${ n }`, what: describe( facts.elements?.[ key ], el ), lands: [ ...lands ] };
	};
	return t.instances.filter( ( i ) => WANT.has( i.id ) ).map( ( i ) => {
		const comp = String( i.draftId ).split( ':' )[ 0 ];
		return { client, id: i.id, draftId: i.draftId, file: fileOf.get( comp ) || comp, state: i.state || null, selector: i.selector || null, property: i.property || null, value: i.value ?? i.declarations ?? null, elements: elementsOf( i ) };
	} );
}

// --- the report --------------------------------------------------------------------------------------------------------

const cell = ( s ) => String( s ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' );
function declared( i ) {
	const decl = i.property ? `${ i.property }: ${ i.value ?? '' }` : i.value ?? '';
	const where = i.selector ? `\`${ clip( i.selector, 70 ) }\` ` : '';
	const state = i.state ? ` (on ${ i.state })` : '';
	return `${ where }${ clip( decl, 110 ) }${ state }`;
}
function elementCell( i ) {
	const self = /:js:/.test( i.draftId ) ? `a value in the draft's code (${ i.draftId })` : i.selector ? `a stylesheet rule (${ i.draftId })` : null;
	const list = i.elements.slice( 0, MAX_ELEMENTS ).map( ( e ) => `${ e.draftId } ${ e.what }${ e.via ? ' (its bound style takes this kind of value; this one is not shown at rest)' : '' }` );
	const more = i.elements.length > MAX_ELEMENTS ? [ `and ${ i.elements.length - MAX_ELEMENTS } more` ] : [];
	const styled = list.length ? [ ...list, ...more ].join( '; ' ) : 'no rendered element found';
	return self ? `${ self }, styling ${ styled }` : i.elements.length ? styled : `${ i.draftId } (no rendered element found)`;
}
function landsCell( i ) {
	const all = [ ...new Set( i.elements.slice( 0, MAX_ELEMENTS ).flatMap( ( e ) => e.lands ) ) ];
	const blocks = [ ...new Set( all.map( ( l ) => l.slice( l.indexOf( ': ' ) + 2 ) ) ) ];
	return blocks.length ? blocks.map( ( b ) => `${ b } (${ all.filter( ( l ) => l.endsWith( `: ${ b }` ) ).map( ( l ) => l.slice( 0, l.indexOf( ': ' ) ) ).slice( 0, 3 ).join( ', ' ) }${ all.filter( ( l ) => l.endsWith( `: ${ b }` ) ).length > 3 ? ', …' : '' })` ).join( '; ' ) : 'not in any proposed skeleton';
}

export function instancesMarkdown( rows, { date, clients = [ ...new Set( rows.map( ( r ) => r.client ) ) ] } ) {
	const CLIENTS = clients;
	const L = [ `# Unsupported CSS features: every occurrence in the client drafts (${ date })`, '' ];
	L.push( 'Each table is one CSS feature the intake listed as "seen but unsupported" (or partly supported), with every place a draft declares it. Read through the route\'s own readers (`scripts/computed-route/tools/unsupported-css-instances.mjs`): the census\'s draft sources and usage read, the fact record, the skeleton inventories and the proposed skeletons. "Lands on" is the block of the element in the proposed skeleton (or the block that absorbs it), with the surfaces it appears on; "not in any proposed skeleton" means no surface inventory rendered that element (a state no skeleton opens, an element of an SVG asset\'s own drawing), and "no rendered element found" means the selector or traced value matched no rendered element. A stylesheet rule lists the elements it matches (the first six). Since 2026-10-31 Fill applies any declaration no block setting holds through that block\'s Custom CSS (`lib/fill-custom-css.mjs`) and keeps it as a gap row for a future setting.', '' );
	L.push( '| Feature | ' + CLIENTS.map( ( c ) => c ).join( ' | ' ) + ' | Total |', `|---|${ CLIENTS.map( () => '---' ).join( '|' ) }|---|` );
	for ( const [ id, name ] of FEATURES ) {
		const n = ( c ) => rows.filter( ( r ) => r.id === id && ( ! c || r.client === c ) ).length;
		L.push( `| ${ name } (\`${ id }\`) | ${ CLIENTS.map( n ).join( ' | ' ) } | ${ n() } |` );
	}
	L.push( '' );
	for ( const [ id, name ] of FEATURES ) {
		const list = rows.filter( ( r ) => r.id === id );
		L.push( `## ${ name } (\`${ id }\`): ${ list.length }`, '' );
		if ( ! list.length ) {
			L.push( 'No occurrence in the three drafts.', '' );
			continue;
		}
		L.push( '| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |', '|---|---|---|---|---|' );
		list.forEach( ( r ) => L.push( `| ${ cell( r.client ) } | ${ cell( r.file ) } | ${ cell( elementCell( r ) ) } | ${ cell( declared( r ) ) } | ${ cell( landsCell( r ) ) } |` ) );
		L.push( '' );
	}
	return L.join( '\n' );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const clients = argv.flatMap( ( a, i ) => ( '--client' === argv[ i - 1 ] ? [ a ] : [] ) );
	const rows = [];
	const run = clients.length ? clients : intakeClients();
	for ( const c of run ) {
		rows.push( ...await clientInstances( c, { log: ( l ) => console.error( l ) } ) );
	}
	flag( '--json' ) && fs.writeFileSync( flag( '--json' ), JSON.stringify( rows, null, 1 ) );
	const md = instancesMarkdown( rows, { date: new Date().toISOString().slice( 0, 10 ), clients: run } );
	flag( '--out' ) ? fs.writeFileSync( flag( '--out' ), `${ md }\n` ) : console.log( md );
	console.error( FEATURES.map( ( [ id ] ) => `${ id } ${ rows.filter( ( r ) => r.id === id ).length }` ).join( '\n' ) );
}
