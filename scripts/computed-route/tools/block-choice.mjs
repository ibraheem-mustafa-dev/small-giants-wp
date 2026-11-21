#!/usr/bin/env node
// Offline: the block the route chose for each draft section against the block a person chose when building the same
// page by hand, surface by surface, ranked by the draft looks the route's blocks leave unwritten or unread.
//   node scripts/computed-route/tools/block-choice.mjs <config.json> <out dir>
// config.json (kept with the run's outputs, never in the repo, since it names clients):
//   regen       folder of regenerated skeletons: <regen>/<client>/<surface>.{skeleton,inventory,proposal}.json
//   reference   folder of hand-built saved blocks: <reference>/<site>/saved-blocks.txt (sections start `@@@ <what>`)
//   lists       { gaps: gaps.json (its `surfaces` name each client's Fill runs), conserve: list.json (rows by draft key),
//                 motion: rows.json (its `runs` name the Fill runs, its rows a cr-ref node) }
//   fillRoots   { <client>: [ worktree roots ] } where sites/<client>/build/qa/fill/<surface>/<run>/ is looked for
//   pairs       [ { client, site, surface, section (text the `@@@` line contains), inline: [ linked surfaces ] } ]
// A route node whose `flowId` names an inline surface `flow-<flowId>` holds that surface's tree as its children.
// Writes <out>/<client>.<surface>.json per pair and <out>/summary.json; prints the counts and the ranked list.
// Exit 0, or 2 on a usage error. Reads the framework database read-only (lib/db.mjs::openDb). Never contacts a site.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { CLASSES, WRONG_CHOICE, alignSurface, looksUnder, ownerTree, parseSavedSections, refMap, routeTree, tokens } from '../lib/block-choice.mjs';

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const readIf = ( f ) => ( fs.existsSync( f ) ? readJson( f ) : null );

// The three lookups lib/block-choice.mjs takes, from the framework database.
export function dbFacts( db = openDb() ) {
	const category = new Map();
	const variant = new Map();
	for ( const r of db.prepare( 'SELECT slug, category, variant_attr FROM blocks' ).all() ) {
		category.set( r.slug, r.category );
		variant.set( r.slug, r.variant_attr );
	}
	const content = new Map();
	const modes = new Map();
	const rows = db.prepare( 'SELECT a.block_slug, a.attr_name, a.role, a.default_value, r.classification FROM block_attributes a LEFT JOIN roles r ON r.role_name = a.role' ).all();
	for ( const r of rows ) {
		if ( 'content-bearing' === r.classification ) {
			( content.get( r.block_slug ) ?? content.set( r.block_slug, new Set() ).get( r.block_slug ) ).add( r.attr_name );
		}
		if ( 'enum-mode' === r.role || variant.get( r.block_slug ) === r.attr_name ) {
			let def = r.default_value;
			try {
				def = null == def ? null : JSON.parse( def );
			} catch {
				// a bare string default stays as stored
			}
			( modes.get( r.block_slug ) ?? modes.set( r.block_slug, new Map() ).get( r.block_slug ) ).set( r.attr_name, def );
		}
	}
	return { category: ( n ) => category.get( n ) ?? null, contentAttrs: ( n ) => content.get( n ) ?? null, modeAttrs: ( n ) => modes.get( n ) ?? new Map() };
}

// The Fill run folder of a client's surface and stamp under the configured roots, or null.
function runDir( roots, client, surface, stamp ) {
	for ( const r of roots ?? [] ) {
		const d = path.join( r, 'sites', client, 'build', 'qa', 'fill', surface, stamp );
		if ( fs.existsSync( d ) ) {
			return d;
		}
	}
	return null;
}

// `<surface>:<draft key>` → { gaps, conserve, motion } for one client, and the coverage of the ref mapping.
export function looksIndex( cfg, client ) {
	const index = new Map();
	const bump = ( key, kind, n = 1 ) => {
		const c = index.get( key ) ?? index.set( key, { gaps: 0, conserve: 0, motion: 0 } ).get( key );
		c[ kind ] += n;
	};
	const coverage = { runs: 0, exact: 0, sequence: 0, unmappedRuns: [], refsMapped: 0, refsUnmapped: 0 };
	const maps = new Map();
	const mapFor = ( surface, dir ) => {
		if ( ! maps.has( dir ) ) {
			const tree = readIf( path.join( dir, 'filled.tree.json' ) );
			const cands = [ readIf( path.join( cfg.regen, client, `${ surface }.skeleton.json` ) ), ...( cfg.fillRoots[ client ] ?? [] ).map( ( r ) => readIf( path.join( r, 'sites', client, 'build', 'skeleton', `${ surface }.skeleton.json` ) ) ) ].filter( Boolean );
			const m = tree ? refMap( tree, cands ) : null;
			coverage.runs++;
			if ( m ) {
				coverage[ m.how ] = ( coverage[ m.how ] ?? 0 ) + 1;
			} else {
				coverage.unmappedRuns.push( `${ surface } ${ path.basename( dir ) }` );
			}
			maps.set( dir, m?.keys ?? null );
		}
		return maps.get( dir );
	};
	const keyOf = ( surface, dir, ref ) => {
		const i = /-(\d+)$/.exec( String( ref ?? '' ) )?.[ 1 ];
		const m = mapFor( surface, dir );
		const tpl = m && null != i ? m[ +i ] : null;
		if ( ! tpl ) {
			coverage.refsUnmapped++;
			return null;
		}
		coverage.refsMapped++;
		return `${ surface }:${ tpl }`;
	};
	const gaps = readIf( cfg.lists.gaps );
	for ( const [ surface, stamp ] of gaps?.surfaces?.[ client ] ?? [] ) {
		const dir = runDir( cfg.fillRoots[ client ], client, surface, stamp );
		if ( ! dir ) {
			coverage.unmappedRuns.push( `${ surface } ${ stamp } (run folder not found)` );
			continue;
		}
		const rep = readJson( path.join( dir, 'fill-report.json' ) );
		const res = rep.residualCss ?? {};
		const add = ( ref, n = 1 ) => {
			const k = keyOf( surface, dir, ref );
			if ( k ) {
				bump( k, 'gaps', n );
			}
		};
		( res.gaps ?? [] ).forEach( ( g ) => ( g.instances ?? [] ).forEach( ( ref ) => add( ref ) ) );
		( rep.customCssGaps ?? [] ).forEach( ( g ) => add( g.node, ( g.properties ?? [] ).length || 1 ) );
		( res.refused ?? [] ).forEach( ( g ) => add( g.node ) );
		( readIf( path.join( dir, 'unmapped.json' ) ) ?? [] ).filter( ( g ) => /^no-setting/.test( String( g.reason ?? '' ) ) ).forEach( ( g ) => add( g.node ) );
	}
	const conserve = readIf( cfg.lists.conserve );
	for ( const r of conserve?.rows ?? [] ) {
		if ( r.client === client && 'own-surface' !== r.class ) {
			bump( `${ r.surface }:${ r.host ?? r.into ?? r.key }`, 'conserve' );
		}
	}
	const motion = readIf( cfg.lists.motion );
	const motionRuns = new Map( ( motion?.runs ?? [] ).filter( ( r ) => r.run.includes( client ) ).map( ( r ) => [ r.surface, r.run ] ) );
	for ( const r of motion?.rows ?? [] ) {
		if ( r.client === client && motionRuns.has( r.surface ) ) {
			const k = keyOf( r.surface, motionRuns.get( r.surface ), r.node );
			if ( k ) {
				bump( k, 'motion' );
			}
		}
	}
	return { index, coverage };
}

const nested = ( node ) => {
	const c = {};
	const walk = ( n ) => n.kids.forEach( ( k ) => {
		c[ k.name ] = ( c[ k.name ] ?? 0 ) + 1;
		walk( k );
	} );
	walk( node );
	return c;
};

// One pair compared: the alignment's groups made printable, each with its looks.
export function comparePair( cfg, pair, facts, index ) {
	const dir = path.join( cfg.regen, pair.client );
	const load = ( s ) => ( { sk: readIf( path.join( dir, `${ s }.skeleton.json` ) ), inv: readIf( path.join( dir, `${ s }.inventory.json` ) ), prop: readIf( path.join( dir, `${ s }.proposal.json` ) ) } );
	const main = load( pair.surface );
	if ( ! main.sk ) {
		return { pair, missing: 'route skeleton' };
	}
	const draftWords = [];
	const linked = ( attrs ) => {
		const s = attrs.flowId ? `flow-${ attrs.flowId }` : null;
		if ( ! s || ! ( pair.inline ?? [] ).includes( s ) ) {
			return null;
		}
		const l = load( s );
		draftWords.push( ...( l.inv?.elements ?? [] ).map( ( e ) => e.words ?? '' ) );
		return routeTree( l.sk, l.inv, l.prop, facts, s );
	};
	const route = routeTree( main.sk, main.inv, main.prop, facts, pair.surface, linked );
	draftWords.push( ...( main.inv?.elements ?? [] ).map( ( e ) => e.words ?? '' ) );
	const ref = parseSavedSections( fs.readFileSync( path.join( cfg.reference, pair.site, 'saved-blocks.txt' ), 'utf8' ) ).find( ( s ) => s.head.includes( pair.section ) );
	if ( ! ref ) {
		return { pair, missing: 'reference section' };
	}
	const owner = ownerTree( ref.blocks, facts );
	const out = alignSurface( route, owner, facts, tokens( draftWords.join( ' ' ) ) );
	const unit = ( u ) => ( { block: u.node.name, key: u.node.key ?? undefined, rule: u.node.rule ?? undefined, ref: u.node.ref ?? undefined, nested: nested( u.node ), words: [ ...u.tokens ].slice( 0, 10 ).join( ' ' ) } );
	const groups = out.groups.map( ( g ) => ( {
		cls: g.cls,
		modes: g.modes,
		how: g.how,
		extra: g.extra,
		looks: looksUnder( g, index ),
		route: g.route.map( unit ),
		owner: g.owner.map( unit ),
		reasons: [ ...new Set( g.route.map( ( u ) => u.node.reason ).filter( Boolean ) ) ],
	} ) );
	return { pair, sections: out.sections, groups };
}

function main( argv ) {
	const [ configPath, outDir ] = argv;
	if ( ! configPath || ! outDir ) {
		console.error( 'usage: block-choice.mjs <config.json> <out dir>' );
		return 2;
	}
	const cfg = readJson( configPath );
	fs.mkdirSync( outDir, { recursive: true } );
	const db = openDb();
	const facts = dbFacts( db );
	db.close();
	const indexes = new Map();
	const results = [];
	for ( const pair of cfg.pairs ) {
		if ( ! indexes.has( pair.client ) ) {
			indexes.set( pair.client, looksIndex( cfg, pair.client ) );
		}
		const r = comparePair( cfg, pair, facts, indexes.get( pair.client ).index );
		results.push( r );
		fs.writeFileSync( path.join( outDir, `${ pair.client }.${ pair.surface }.json` ), JSON.stringify( r, null, '\t' ) );
	}
	const byClass = {};
	let aligned = 0;
	const ranked = [];
	for ( const r of results.filter( ( x ) => x.groups ) ) {
		for ( const g of r.groups ) {
			byClass[ g.cls ] = ( byClass[ g.cls ] ?? 0 ) + 1;
			if ( g.route.length && g.owner.length ) {
				aligned++;
			}
			if ( WRONG_CHOICE.has( g.cls ) ) {
				ranked.push( { client: r.pair.client, surface: r.pair.surface, ...g } );
			}
		}
	}
	ranked.sort( ( a, b ) => b.looks.total - a.looks.total );
	const summary = {
		classes: CLASSES,
		pairs: results.length,
		missing: results.filter( ( r ) => r.missing ).map( ( r ) => `${ r.pair.client }/${ r.pair.surface }: ${ r.missing }` ),
		aligned,
		byClass,
		coverage: Object.fromEntries( [ ...indexes ].map( ( [ c, v ] ) => [ c, v.coverage ] ) ),
		ranked,
	};
	fs.writeFileSync( path.join( outDir, 'summary.json' ), JSON.stringify( summary, null, '\t' ) );
	console.log( `pairs ${ summary.pairs }, aligned groups ${ aligned }, missing ${ summary.missing.length }` );
	console.log( 'by class', JSON.stringify( byClass ) );
	for ( const g of ranked ) {
		const names = ( us ) => Object.entries( us.reduce( ( c, u ) => ( { ...c, [ u.block ]: ( c[ u.block ] ?? 0 ) + 1 } ), {} ) ).map( ( [ n, k ] ) => ( k > 1 ? `${ n } x${ k }` : n ) ).join( ', ' );
		console.log( `${ g.looks.total }\t${ g.client }/${ g.surface }\t${ g.cls }\troute: ${ names( g.route ) }\towner: ${ names( g.owner ) }\t(${ g.route[ 0 ]?.key ?? '' })` );
	}
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
