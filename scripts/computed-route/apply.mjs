#!/usr/bin/env node
// The applier: sets existing block settings on an already-built client site from the draft, on the local mirror. It reads each
// paired block's draft and live values, works out which settings differ, and patches them through patch-block-attrs.py. It
// never rebuilds a post, and writes nothing without --write.
//   node scripts/computed-route/apply.mjs <client> [--surfaces a,b] [--families x,y] [--widths 1440,768,375]
//        [--draft http://127.0.0.1:5181] [--jobs 4] [--fresh] [--write]
// Output in sites/<client>/build/qa/apply/: <surface>.plan.json (every target's outcome), summary.md, and with --write
// verify.json (read by delivery-map.mjs). Every instance ends written, unchecked (written, no automatic re-read), equal, ledger,
// no-setting, unpaired or no-effect.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { FAMILIES, familyProps } from './lib/apply-families.mjs';
import { ledgerIndex, ledgerMatch } from './lib/apply-ledger.mjs';
import { foldOps, matches, patchesOf, restoreOf } from './lib/apply-ops.mjs';
import { extrasOf, motionClose, motionNear, motionOf } from './lib/apply-hover.mjs';
import { CLOSED_CLOCK, readSurface } from './lib/apply-read.mjs';
import { recordIndex } from './lib/apply-records.mjs';
import { loadSkeleton, panelIds } from './lib/apply-skeleton.mjs';
import { motionTools } from './lib/apply-drawer-core.mjs';
import { loadSurfaces, withSkeleton } from './lib/apply-targets.mjs';
import { loadClientData } from './lib/apply-chrome-data.mjs';
import { positionTargets } from './lib/apply-position.mjs';
import { attrsFor } from './lib/db.mjs';
import { partHome } from './lib/fill-part-pairing.mjs';
import { loadCalibration } from './lib/cache.mjs';
import { openDb } from './lib/db.mjs';
import { draftLinksFor } from './lib/draft-link.mjs';
import { loadSnapshot } from './lib/normalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..' );
const PY = process.platform === 'win32' ? 'python' : 'python3';

const flag = ( name, fallback = null ) => {
	const i = process.argv.indexOf( name );
	return i > -1 ? process.argv[ i + 1 ] : fallback;
};
const has = ( name ) => process.argv.includes( name );

async function pool( items, jobs, work ) {
	const queue = [ ...items ];
	await Promise.all( Array.from( { length: jobs }, async () => {
		while ( queue.length ) {
			await work( queue.shift() );
		}
	} ) );
}

function readBlocks( site, posts, tmp ) {
	const out = path.join( tmp, `blocks-${ process.pid }-${ Date.now() }.json` );
	const r = spawnSync( PY, [ path.join( REPO, 'scripts/local-wp/read-block-attrs.py' ), '--site', site, '--out', out, ...posts.map( String ) ], { encoding: 'utf8' } );
	if ( 0 !== r.status ) {
		throw new Error( `could not read the blocks of ${ site }: ${ r.stderr }` );
	}
	return JSON.parse( fs.readFileSync( out, 'utf8' ) );
}

function patch( site, postId, ops, tmp, dry ) {
	const file = path.join( tmp, `patch-${ postId }-${ Date.now() }.json` );
	fs.writeFileSync( file, JSON.stringify( ops ) );
	const r = spawnSync( PY, [ path.join( REPO, 'scripts/local-wp/patch-block-attrs.py' ), '--site', site, '--post', String( postId ), '--patch', file, ...( dry ? [ '--dry-run' ] : [] ) ], { encoding: 'utf8' } );
	if ( 0 !== r.status ) {
		throw new Error( `patch of post ${ postId } refused: ${ r.stdout } ${ r.stderr }` );
	}
}

// Draft reads are kept: a draft does not change between runs on the same handoff, and a page read takes seconds.
async function draftReads( { browser, surface, widths, props, extras, cache, fresh } ) {
	const out = {};
	for ( const width of widths ) {
		const key = crypto.createHash( 'sha1' ).update( JSON.stringify( [ surface.cfg.draft.url, surface.pairs, props, width, extras ] ) ).digest( 'hex' ).slice( 0, 12 );
		const file = path.join( cache, `${ surface.name }-${ width }-${ key }.json` );
		if ( ! fresh && fs.existsSync( file ) ) {
			out[ width ] = JSON.parse( fs.readFileSync( file, 'utf8' ) );
			continue;
		}
		out[ width ] = await readSurface( { browser, surface, side: 'draft', width, props, extras } );
		fs.writeFileSync( file, JSON.stringify( out[ width ] ) );
	}
	return out;
}

async function liveReads( { browser, surface, widths, props, extras } ) {
	const out = {};
	for ( const width of widths ) {
		out[ width ] = await readSurface( { browser, surface, side: 'live', width, props, extras } );
	}
	return out;
}

// The surface read once more under the closed clock (lib/apply-read.mjs::CLOSED_CLOCK) at 1440, draft and live, for the families
// that ask for it (`closedClock( { saved } )`): { draft: facts, live: facts, animate: the draft's Element.animate calls }.
async function closedReads( { browser, surface, props, wanted } ) {
	if ( ! wanted ) {
		return null;
	}
	const draft = await readSurface( { browser, surface, side: 'draft', width: 1440, props, clock: CLOSED_CLOCK } );
	const live = await readSurface( { browser, surface, side: 'live', width: 1440, props, clock: CLOSED_CLOCK } );
	return { draft: draft.facts, live: live.facts, animate: draft.animate };
}

// A skeleton slot's live selector: the calibrated part whose css_element is the slot's name, under the owning block; null when
// no part carries that name (the slot is then read on the draft side only).
function slotLive( db, calFor, block, target ) {
	const element = block && attrsFor( db, block ).map( ( r ) => r.css_element ).find( ( e ) => e && e === target.slot );
	const home = element ? partHome( db, block, calFor( block ), element ) : null;
	return home ? `.${ target.ref } ${ home }` : null;
}

// Each target's outcome per family: the ops to write and the rows to report.
export function decideSurface( { surface, drafts, lives, blocks, families, ledger, db, records, recordsIndex, calFor, clientData = {}, closed = null, skeleton = [], snapshot = null, links = null, rawSnapshot = null } ) {
	const rows = [];
	const ops = [];
	const widths = Object.keys( drafts );
	const headers = Object.fromEntries( widths.map( ( w ) => [ w, drafts[ w ].headerHeight ] ) );
	const animate = Object.fromEntries( widths.map( ( w ) => [ w, drafts[ w ].animate ] ) );
	const saved = blocks[ surface.postId ]?.blocks ?? {};
	const dupes = new Set( blocks[ surface.postId ]?.duplicates ?? [] );
	for ( const target of surface.pairs ) {
		const block = saved[ target.ref ];
		const key = target.key ?? target.ref;
		const draft = Object.fromEntries( widths.map( ( w ) => [ w, drafts[ w ].facts[ key ] ] ) );
		const live = Object.fromEntries( widths.map( ( w ) => [ w, lives[ w ].facts[ key ] ] ) );
		const aux = Object.fromEntries( ( target.aux || [] ).map( ( a ) => [ a.tpl, Object.fromEntries( widths.map( ( w ) => [ w, drafts[ w ].facts[ a.key ] ] ) ) ] ) );
		const row = ( o ) => rows.push( { surface: surface.name, ref: target.ref, key, tpl: target.tpl, block: block?.block ?? null, ...o } );
		if ( ! block || dupes.has( target.ref ) ) {
			row( { family: '*', status: 'unpaired', why: block ? 'the ref is on two blocks of the post' : 'no block carries this ref in the post' } );
			continue;
		}
		// A skeleton slot is a part of its owner, read for the families that ask for slots; no other family writes from it.
		for ( const family of families.filter( ( f ) => ! target.slot || f.slots ) ) {
			const items = family.decide( { target, surface, block: block.block, saved: block.attrs, draft, live, aux, clientData, closed, skeleton, headers, animate, records, recordsIndex, calFor, db, snapshot, links, rawSnapshot, all: { blocks: saved, drafts, lives } } ) || [];
			for ( const item of items ) {
				const hit = ledgerMatch( ledger, { ref: target.ref, surface: surface.name, state: item.state, prop: item.prop } );
				if ( hit ) {
					row( { family: family.name, status: 'ledger', prop: item.prop, why: hit } );
				} else if ( 'op' === item.status ) {
					ops.push( { surface: surface.name, postId: surface.postId, ref: target.ref, key, block: block.block, family: family.name, ...item } );
					row( { family: family.name, status: 'written', prop: item.prop, why: item.why, ref: item.ref ?? target.ref } );
				} else {
					row( { family: family.name, status: item.status, prop: item.prop, why: item.why } );
				}
			}
		}
	}
	return { rows, ops };
}

// A child's facts under its card's hover (`hoverHost` on a check): the card read's entry for the child, shaped as facts.
const hostedFacts = ( host, ref ) => {
	const child = host?.group?.children?.find( ( k ) => k.key === ref );
	return child ? { styles: child.rest, hover: child.hover, fx: null } : undefined;
};

// After a write: each op's checks read on the live page. An op that moved nothing goes back and is reported no-effect.
export function judge( ops, reads ) {
	return ops.map( ( op ) => {
		const results = ( op.checks || [] ).map( ( c ) => {
			const facts = c.hoverHost ? hostedFacts( reads[ op.surface ]?.[ c.width ]?.facts?.[ c.hoverHost ], op.ref ) : reads[ op.surface ]?.[ c.width ]?.facts?.[ op.ref ];
			const got = c.probe ? c.probe.reduce( ( o, k ) => o?.[ k ], facts?.probes )?.[ c.prop ] : ( 'hover' === c.state ? facts?.hover : facts?.styles )?.[ c.prop ];
			if ( c.tracks ) {
				const count = String( facts?.styles?.[ 'grid-template-columns' ] ?? '' ).split( /\s+/ ).filter( ( t ) => /^[\d.]+px$/.test( t ) ).length;
				// A container's grid is on its inner element: no tracks here means this read cannot see it.
				return { ...c, got: count || null, ok: count === c.tracks };
			}
			if ( c.items ) {
				const got = facts?.items ? `${ facts.items[ c.items ] }px` : null;
				return { ...c, got, ok: matches( got, c.want ) };
			}
			if ( c.fx ) {
				return { ...c, got: facts?.fx ?? null, ok: String( facts?.fx ?? '' ).split( ' ' ).includes( c.fx ) };
			}
			if ( c.motion ) {
				const pose = motionOf( facts?.hover );
				// A magnet moves the element towards the pointer, so a magnetic element's position proves nothing: its scale does.
				const moved = /magnet/.test( facts?.fx ?? '' ) && pose ? { ...pose, x: c.want.x, y: c.want.y } : pose;
				return { ...c, got: pose, ok: motionNear( moved, c.want ) };
			}
			if ( c.all ) {
				const every = ( facts?.probes?.fields || [] ).filter( ( f ) => ! f.honeypot ).map( ( f ) => f[ c.all ]?.[ c.prop ] ).filter( ( v ) => undefined !== v );
				return { ...c, got: every.join( ' | ' ), ok: every.length > 0 && every.every( ( v ) => matches( v, c.want ) ) };
			}
			return { ...c, got, ok: matches( got, c.want ) };
		} );
		// A value that could not be read (a moving marquee tile) proves nothing: the op stays and reports unchecked.
		const read = results.filter( ( r ) => null !== ( r.got ?? null ) );
		return { op, results: read, ok: read.every( ( r ) => r.ok ), unchecked: ! read.length };
	} );
}

function summary( rows ) {
	const table = {};
	for ( const r of rows ) {
		table[ r.family ] = table[ r.family ] || {};
		table[ r.family ][ r.status ] = ( table[ r.family ][ r.status ] || 0 ) + 1;
	}
	const statuses = [ 'written', 'unchecked', 'equal', 'ledger', 'no-setting', 'unpaired', 'no-effect' ];
	const lines = [ `| Family | ${ statuses.join( ' | ' ) } |`, `|---|${ statuses.map( () => '---' ).join( '|' ) }|` ];
	for ( const [ f, c ] of Object.entries( table ) ) {
		lines.push( `| ${ f } | ${ statuses.map( ( s ) => c[ s ] || 0 ).join( ' | ' ) } |` );
	}
	return lines.join( '\n' );
}

async function main() {
	const client = process.argv[ 2 ];
	if ( ! client || client.startsWith( '--' ) ) {
		console.error( 'usage: node scripts/computed-route/apply.mjs <client> [--surfaces a,b] [--families x,y] [--widths 1440,768,375] [--draft <origin>] [--jobs 4] [--fresh] [--write]' );
		process.exit( 2 );
	}
	const write = has( '--write' );
	const widths = ( flag( '--widths', '1440,768,375' ) ).split( ',' ).map( Number );
	const only = flag( '--surfaces' )?.split( ',' ) ?? null;
	const wanted = flag( '--families' )?.split( ',' ) ?? null;
	const families = FAMILIES.filter( ( f ) => ! wanted || wanted.includes( f.name ) );
	const draftOrigin = flag( '--draft', 'http://127.0.0.1:5181' );
	const outDir = flag( '--out', path.join( REPO, 'sites', client, 'build', 'qa', 'apply' ) );
	const tmp = path.join( os.tmpdir(), 'sgs-apply', client );
	fs.mkdirSync( outDir, { recursive: true } );
	fs.mkdirSync( tmp, { recursive: true } );

	const { surfaces, skipped } = await loadSurfaces( { repo: REPO, client, only, draftOrigin } );
	if ( ! surfaces.length ) {
		throw new Error( 'no surface to work on' );
	}
	const site = surfaces[ 0 ].site;
	if ( ! /^local-/.test( site ) ) {
		throw new Error( `${ site } is not a local mirror` );
	}
	const ledgerFile = path.join( REPO, 'sites', client, 'build', 'qa', 'divergences.json' );
	const ledger = ledgerIndex( fs.existsSync( ledgerFile ) ? JSON.parse( fs.readFileSync( ledgerFile, 'utf8' ) ) : [] );
	const recordsFile = path.join( REPO, 'sites', client, 'handoff', 'animations.json' );
	const records = fs.existsSync( recordsFile ) ? JSON.parse( fs.readFileSync( recordsFile, 'utf8' ) ).records : [];
	const handoff = fs.existsSync( recordsFile ) ? JSON.parse( fs.readFileSync( recordsFile, 'utf8' ) ) : {};
	const recordsIndex = recordIndex( records, handoff.drafts?.[ 0 ]?.dc );
	const calCache = path.join( HERE, 'cache' );
	const calibrations = new Map();
	const calFor = ( block ) => {
		calibrations.has( block ) || calibrations.set( block, loadCalibration( calCache, block, site ) );
		return calibrations.get( block );
	};
	const props = familyProps( FAMILIES );
	const db = openDb();
	const links = draftLinksFor( { repo: REPO, client } );
	const snapshotFile = path.join( REPO, 'sites', client, 'theme-snapshot.json' );
	const snapshot = fs.existsSync( snapshotFile ) ? loadSnapshot( snapshotFile ) : null;
	const rawSnapshot = fs.existsSync( snapshotFile ) ? JSON.parse( fs.readFileSync( snapshotFile, 'utf8' ) ) : null;
	const blocks = readBlocks( site, surfaces.map( ( s ) => s.postId ), tmp );
	const clientData = loadClientData( REPO, client );
	const skeleton = loadSkeleton( REPO, client );
	const tools = motionTools( db, rawSnapshot );
	for ( const surface of surfaces ) {
		const saved = blocks[ surface.postId ]?.blocks ?? {};
		const joined = withSkeleton( surface, saved, skeleton );
		surface.pairs = joined.pairs.map( ( t ) => {
			const part = t.slot ? slotLive( db, calFor, saved[ t.ref ]?.block, t ) : undefined;
			const aux = families.flatMap( ( f ) => f.aux?.( { target: t, block: saved[ t.ref ]?.block, recordsIndex } ) ?? [] );
			const opensPanel = ! t.slot && tools.mdb.opensOf( saved[ t.ref ]?.block ?? '' ).includes( 'panel' );
			const reach = opensPanel ? { reach: [ ...new Set( [ ...( t.reach ?? [] ), ...panelIds( skeleton, surface.name ) ] ) ] } : {};
			return { ...t, ...reach, ...( undefined === part ? {} : { live: part } ), ...( aux.length ? { aux } : {} ) };
		} );
		joined.notes.forEach( ( n ) => console.log( `${ surface.name }: skeleton node ${ n.id } (${ n.block }) unpaired: ${ n.why }` ) );
		surface.pairs.filter( ( t ) => t.via?.startsWith( 'skeleton' ) ).forEach( ( t ) => console.log( `${ surface.name }: skeleton ${ t.key } <- ${ t.tpl } (nearest ${ t.nearest_tpl })` ) );
		Object.entries( joined.aliases ).forEach( ( [ id, ref ] ) => console.log( `${ surface.name }: skeleton wrapper ${ id } resolves to ${ ref }` ) );
	}
	const browser = await chromium.launch();
	const allRows = skipped.map( ( s ) => ( { surface: s.surface, family: '*', status: 'unpaired', why: s.why } ) );
	const allOps = [];
	try {
		await pool( surfaces, Number( flag( '--jobs', 4 ) ), async ( surface ) => {
			const extras = extrasOf( { surface, saved: blocks[ surface.postId ]?.blocks, recordsIndex, db } );
			const drafts = await draftReads( { browser, surface, widths, props, extras, cache: tmp, fresh: has( '--fresh' ) } );
			const lives = await liveReads( { browser, surface, widths, props, extras } );
			const closed = await closedReads( { browser, surface, props, wanted: families.some( ( f ) => f.closedClock?.( { saved: blocks[ surface.postId ]?.blocks ?? {} } ) ) } );
			const { rows, ops } = decideSurface( { surface, drafts, lives, blocks, families, ledger, db, records, recordsIndex, calFor, clientData, closed, skeleton, snapshot, links, rawSnapshot } );
			const saved = blocks[ surface.postId ]?.blocks ?? {};
			// Position matching (lib/apply-position.mjs): draft elements no pair reaches, matched to live blocks by where they sit,
			// then read and decided like any pair. --no-position leaves it out.
			const readFacts = async ( side, items ) => ( await readSurface( { browser, surface: { ...surface, pairs: items }, side, width: 1440, props } ) ).facts;
			const added = has( '--no-position' ) ? [] : await positionTargets( { surface, saved, recordsIndex, readFacts } );
			added.forEach( ( t ) => console.log( `${ surface.name }: position ${ t.tpl } -> ${ t.ref } (overlap ${ t.overlap }, inside ${ t.nearest_tpl })` ) );
			if ( added.length ) {
				const second = { ...surface, pairs: added };
				const d2 = await draftReads( { browser, surface: second, widths, props, extras: extrasOf( { surface: second, saved, recordsIndex, db } ), cache: tmp, fresh: has( '--fresh' ) } );
				const l2 = await liveReads( { browser, surface: second, widths, props, extras: extrasOf( { surface: second, saved, recordsIndex, db } ) } );
				const again = decideSurface( { surface: second, drafts: d2, lives: l2, blocks, families, ledger, db, records, recordsIndex, calFor, clientData, closed, skeleton, snapshot, links, rawSnapshot } );
				rows.push( ...again.rows );
				ops.push( ...again.ops );
			}
			allRows.push( ...rows );
			allOps.push( ...ops );
			fs.writeFileSync( path.join( outDir, `${ surface.name }.plan.json` ), JSON.stringify( { rows, ops }, null, 1 ) );
			console.log( `${ surface.name }: ${ ops.length } ops, ${ rows.length } rows` );
		} );

		const patches = patchesOf( foldOps( allOps, blocks ) );
		for ( const [ postId, list ] of patches ) {
			patch( site, postId, list, tmp, true );
		}
		if ( write ) {
			for ( const [ postId, list ] of patches ) {
				patch( site, postId, list, tmp, false );
			}
			const touched = surfaces.filter( ( s ) => allOps.some( ( o ) => o.surface === s.name ) );
			const reads = {};
			await pool( touched, Number( flag( '--jobs', 4 ) ), async ( surface ) => {
				reads[ surface.name ] = await liveReads( { browser, surface, widths, props, extras: extrasOf( { surface, saved: blocks[ surface.postId ]?.blocks, recordsIndex, db } ) } );
			} );
			const judged = judge( allOps, reads );
			const rowOf = ( op ) => allRows.find( ( r ) => r.ref === op.ref && r.family === op.family && r.prop === op.prop && 'written' === r.status );
			for ( const { op } of judged.filter( ( j ) => j.unchecked ) ) {
				rowOf( op ) && ( rowOf( op ).status = 'unchecked' );
			}
			const kept = judged.filter( ( j ) => j.ok ).map( ( j ) => j.op );
			for ( const { op, results } of judged.filter( ( j ) => ! j.ok ) ) {
				patch( site, op.postId, [ restoreOf( op, blocks, kept ) ], tmp, false );
				rowOf( op ) && ( rowOf( op ).status = 'no-effect' );
				console.log( `no effect: ${ op.ref } ${ op.family } ${ op.prop }: ${ JSON.stringify( results.filter( ( r ) => ! r.ok ).map( ( r ) => [ r.width, r.prop, r.got, r.want ] ) ) }` );
			}
			const verify = { generated: new Date().toISOString(), rows: judged.flatMap( ( { op, results } ) => results.map( ( r ) => ( { record: op.record ?? null, target: op.ref, state: op.state ?? 'rest', ok: r.ok, measured: r.got ?? null, want: r.want } ) ) ).filter( ( r ) => r.record ) };
			fs.writeFileSync( path.join( outDir, 'verify.json' ), JSON.stringify( verify, null, 1 ) );
		}
	} finally {
		await browser.close();
		db.close?.();
	}
	const text = `# Applier ${ write ? 'write' : 'dry run' }: ${ client }\n\n${ summary( allRows ) }\n`;
	fs.writeFileSync( path.join( outDir, 'summary.md' ), text );
	console.log( text );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	await main();
}
