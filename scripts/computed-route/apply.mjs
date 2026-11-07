#!/usr/bin/env node
// The applier: sets existing block settings on an already-built client site from the draft, on the local mirror. It reads each
// paired block's draft and live values, works out which settings differ, and patches them through patch-block-attrs.py. It
// never rebuilds a post, and writes nothing without --write.
// The one block it adds is a bare decorative layer the draft paints and the post lacks (the layers family, lib/apply-family-layers.mjs):
// an `sgs/decorative-image` inserted beside its draft siblings by an insert op of patch-block-attrs.php, rolled back by removing it.
//   node scripts/computed-route/apply.mjs <client> [--surfaces a,b] [--families x,y] [--widths 1440,768,375]
//        [--draft http://127.0.0.1:5181] [--jobs 4] [--fresh] [--retry] [--write]
// Output in sites/<client>/build/qa/apply/: <surface>.plan.json (every target's outcome), summary.md, and with --write
// verify.json (read by delivery-map.mjs) and no-effect.json (writes rolled back after their re-read; --retry tries them again). Every instance ends written, unchecked (written, no automatic re-read), equal, ledger,
// no-setting, unpaired or no-effect. A whole run fails while a no-setting row names something the block has a setting for
// (lib/apply-gate.mjs; no-setting-review.json lists them).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { FAMILIES, familyProps } from './lib/apply-families.mjs';
import { ledgerIndex, ledgerMatch, surfaceNames } from './lib/apply-ledger.mjs';
import { gateRows } from './lib/apply-gate.mjs';
import { changesPost, matches, patchesFor, restoreOf } from './lib/apply-ops.mjs';
import { extrasOf, motionClose, motionNear, motionOf } from './lib/apply-hover.mjs';
import { numeric } from './lib/apply-motion-default.mjs';
import { CLOSED_CLOCK, readSurface } from './lib/apply-read.mjs';
import { recordIndex } from './lib/apply-records.mjs';
import { loadSkeleton, panelIds } from './lib/apply-skeleton.mjs';
import { motionTools } from './lib/apply-drawer-core.mjs';
import { loadSurfaces, withSkeleton } from './lib/apply-targets.mjs';
import { layerTargets } from './lib/apply-layer-targets.mjs';
import { hostedFacts } from './lib/apply-group-read.mjs';
import { partsOf, partStyles } from './lib/apply-part-hover.mjs';
import { DECISIONS_FILE } from './lib/skeleton-facts.mjs';
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

// verify.json rows by record, target and state: a fresh measurement replaces its earlier row, every other row stays.
export function mergeVerify( earlier, fresh ) {
	const idOf = ( r ) => `${ r.record }|${ r.target }|${ r.state }`;
	const replaced = new Set( fresh.map( idOf ) );
	return [ ...earlier.filter( ( r ) => ! replaced.has( idOf( r ) ) ), ...fresh ];
}

// A stamp of what decides whether a write takes effect on the live page: the site's entrance tokens and the motion render sources.
export function renderStamp( { repo, rawSnapshot } ) {
	const hash = crypto.createHash( 'sha1' ).update( JSON.stringify( rawSnapshot?.settings?.custom?.entrance ?? null ) );
	const root = path.join( repo, 'plugins', 'sgs-blocks' );
	for ( const dir of [ 'includes/motion', 'assets/css', 'assets/js' ] ) {
		const at = path.join( root, dir );
		for ( const f of fs.existsSync( at ) ? fs.readdirSync( at ).sort() : [] ) {
			/^(class-sgs-motion.*\.php|motion.*\.(css|js))$/.test( f ) && hash.update( f ).update( fs.readFileSync( path.join( at, f ) ) );
		}
	}
	return hash.digest( 'hex' ).slice( 0, 16 );
}

// Identifies a write, so a rolled-back one is known again on the next run; a changed value is a new write.
const opKey = ( op ) => `${ op.ref }|${ op.family }|${ op.prop }|${ crypto.createHash( 'sha1' ).update( JSON.stringify( op.writes ) ).digest( 'hex' ).slice( 0, 12 ) }`;

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

// The properties a text block sharing its wrapper's element answers for (a CSS property, or a setting name about text).
const TEXT_PROP = /^(color|font|letter-spacing|line-height|text|-webkit-text|word-spacing|white-space)|(Colour|Font|LetterSpacing|LineHeight|TextTransform|TextDecoration)/;

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
		if ( ! target.layer && ( ! block || dupes.has( target.ref ) ) ) {
			row( { family: '*', status: 'unpaired', why: block ? 'the ref is on two blocks of the post' : 'no block carries this ref in the post' } );
			continue;
		}
		// A skeleton slot is a part of its owner, read for the families that ask for slots; no other family writes from it.
		// A layer target (lib/apply-layer-targets.mjs) goes to the layers family alone, and no other target does.
		for ( const family of families.filter( ( f ) => ( target.layer ? f.layers : ! f.layers ) && ( ! target.slot || f.slots ) ) ) {
			const items = family.decide( { target, surface, block: block?.block ?? null, saved: block?.attrs ?? {}, draft, live, aux, clientData, closed, skeleton, headers, animate, records, recordsIndex, calFor, db, snapshot, links, rawSnapshot, all: { blocks: saved, drafts, lives } } ) || [];
			// A text block sharing its wrapper's draft element (part 'text', lib/pair-wrappers.mjs) is held to the element's text
			// properties only: its box belongs to the wrapper's own pair.
			for ( const item of items.filter( ( i ) => 'text' !== target.part || TEXT_PROP.test( String( i.prop ?? '' ).trim().split( /\s+/ ).pop() ) ) ) {
				const hit = ledgerMatch( ledger, { ref: target.ref, surface: surface.name, block: block?.block ?? null, state: item.state, prop: item.prop, part: target.slot ?? null } );
				if ( hit ) {
					row( { family: family.name, status: 'ledger', prop: item.prop, why: hit } );
				} else if ( 'op' === item.status ) {
					ops.push( { surface: surface.name, postId: surface.postId, ref: target.ref, key, block: block?.block ?? item.insert?.block ?? null, family: family.name, ...item } );
					row( { family: family.name, status: 'written', prop: item.prop, why: item.why, ref: item.ref ?? target.ref } );
				} else {
					row( { family: family.name, status: item.status, prop: item.prop, why: item.why, ...( item.state ? { state: item.state } : {} ), ...( item.block ? { block: item.block } : {} ) } );
				}
			}
		}
	}
	// Coverage: every saved block no pair reaches is a row, with the reason a refresh or the pair guard named, so a gap is never silent.
	if ( false !== surface.coverage ) {
		const paired = new Set( surface.pairs.map( ( t ) => t.ref ) );
		const refused = new Map( ( surface.refused || [] ).map( ( r ) => [ r.ref, r ] ) );
		for ( const [ ref, b ] of Object.entries( saved ) ) {
			paired.has( ref ) || dupes.has( ref ) || rows.push( { surface: surface.name, ref, key: ref, tpl: null, block: b.block, family: '*', status: refused.get( ref )?.structural ? 'structural' : 'unpaired', why: refused.get( ref )?.why ?? 'a saved block no pair reaches' } );
		}
	}
	return { rows, ops };
}

// After a write: each op's checks read on the live page. An op that moved nothing goes back and is reported no-effect.
export function judge( ops, reads ) {
	return ops.map( ( op ) => {
		const results = ( op.checks || [] ).map( ( c ) => {
			const facts = c.hoverHost ? hostedFacts( reads[ op.surface ]?.[ c.width ]?.facts?.[ c.hoverHost ], op.ref, reads[ op.surface ]?.[ c.width ]?.facts?.[ op.ref ] ) : reads[ op.surface ]?.[ c.width ]?.facts?.[ op.ref ];
			const got = c.part ? partStyles( facts, c )?.[ c.prop ] : c.probe ? c.probe.reduce( ( o, k ) => o?.[ k ], facts?.probes )?.[ c.prop ] : ( 'hover' === c.state ? facts?.hover : facts?.styles )?.[ c.prop ];
			if ( c.tracks ) {
				const count = String( facts?.styles?.[ 'grid-template-columns' ] ?? '' ).split( /\s+/ ).filter( ( t ) => /^[\d.]+px$/.test( t ) ).length;
				// A container's grid is on its inner element: no tracks here means this read cannot see it.
				return { ...c, got: count || null, ok: count === c.tracks };
			}
			if ( c.items ) {
				const got = facts?.items ? `${ facts.items[ c.items ] }px` : null;
				return { ...c, got, ok: matches( got, c.want ) };
			}
			if ( c.num ) {
				// A time or length custom property, read as a number; an unset delay is zero.
				const raw = facts?.styles?.[ c.prop ];
				const n = numeric( raw ) ?? ( '--sgs-me-delay' === c.prop && null !== ( raw ?? null ) ? 0 : null );
				return { ...c, got: null === n ? 'unread' : n, ok: null !== n && Math.abs( n - c.want ) < 0.01 };
			}
			if ( c.me ) {
				const shown = !! facts?.data?.includes( 'data-sgs-me' );
				return { ...c, got: shown ? 'entrance' : 'none', ok: shown };
			}
			if ( c.fx ) {
				return { ...c, got: facts?.fx ?? null, ok: String( facts?.fx ?? '' ).split( ' ' ).includes( c.fx ) };
			}
			if ( c.box ) {
				// The layout box of an inserted layer, in whole pixels.
				const got = facts?.layout?.[ c.box ] ?? null;
				return { ...c, got, ok: null !== got && Math.abs( got - c.want ) <= 1 };
			}
			if ( c.motion ) {
				const pose = motionOf( facts?.hover );
				// A magnet moves the element towards the pointer, so a magnetic element's position proves nothing: its scale does.
				const magnetic = /\bmagnet\b/.test( facts?.fx ?? '' );
				// An ambient float scales the same element, so the read holds the hover's scale times the float's: at least the hover's.
				const floating = /\bambient-float\b/.test( facts?.fx ?? '' ) && pose?.scale >= c.want.scale;
				const moved = pose && { ...pose, ...( magnetic ? { x: c.want.x, y: c.want.y } : {} ), ...( floating ? { scale: c.want.scale } : {} ) };
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
		// An op that needs its proof (a removed default-equal entrance) with nothing read, or a value unread, is not kept.
		const proven = ! op.needsProof || ( results.length > 0 && results.every( ( r ) => null !== ( r.got ?? null ) && 'unread' !== r.got ) );
		return { op, results: read, ok: read.every( ( r ) => r.ok ) && proven, unchecked: ! read.length && proven };
	} );
}

function summary( rows ) {
	const table = {};
	for ( const r of rows ) {
		table[ r.family ] = table[ r.family ] || {};
		table[ r.family ][ r.status ] = ( table[ r.family ][ r.status ] || 0 ) + 1;
	}
	const statuses = [ 'written', 'unchecked', 'equal', 'ledger', 'no-setting', 'unpaired', 'structural', 'no-effect' ];
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
	const ledger = ledgerIndex( fs.existsSync( ledgerFile ) ? JSON.parse( fs.readFileSync( ledgerFile, 'utf8' ) ) : [], { surfaces: surfaceNames( path.join( REPO, 'sites', client, 'build' ) ) } );
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
	// A posts page renders through the `home` template, so that surface's blocks live there and not on its page.
	const shelled = surfaces.filter( ( s ) => 'home' === s.shell );
	const blocks = readBlocks( site, [ ...surfaces.map( ( s ) => s.postId ), ...( shelled.length ? [ 'template:home' ] : [] ) ], tmp );
	shelled.forEach( ( s ) => ( s.postId = blocks.templates?.home || s.postId ) );
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
		// Bare decorative layers the skeleton found and the post lacks (lib/apply-family-layers.mjs).
		if ( families.some( ( f ) => f.layers ) ) {
			const layered = layerTargets( { repo: REPO, client, surface: surface.name, pairs: surface.pairs, saved, decisions: JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ) } );
			surface.pairs.push( ...layered.targets );
		}
		joined.notes.forEach( ( n ) => console.log( `${ surface.name }: skeleton node ${ n.id } (${ n.block }) unpaired: ${ n.why }` ) );
		surface.pairs.filter( ( t ) => t.via?.startsWith( 'skeleton' ) ).forEach( ( t ) => console.log( `${ surface.name }: skeleton ${ t.key } <- ${ t.tpl } (nearest ${ t.nearest_tpl })` ) );
		Object.entries( joined.aliases ).forEach( ( [ id, ref ] ) => console.log( `${ surface.name }: skeleton wrapper ${ id } resolves to ${ ref }` ) );
	}
	// A rolled-back write is remembered with the stamp of what could have changed its outcome (the site's entrance tokens and the
	// motion render sources); an entry from another stamp is dropped, so a fixed renderer or a changed default retries it.
	const undonePath = path.join( outDir, 'no-effect.json' );
	const stamp = renderStamp( { repo: REPO, rawSnapshot } );
	const undone = new Map( Object.entries( fs.existsSync( undonePath ) ? ( ( v ) => ( Array.isArray( v ) ? {} : v ) )( JSON.parse( fs.readFileSync( undonePath, 'utf8' ) ) ) : {} ).filter( ( [ , at ] ) => at === stamp ) );
	// A write the last run never judged is unproven: it is checked and the file deleted by hand before another run writes.
	const pendingPath = path.join( outDir, 'pending.json' );
	if ( write && fs.existsSync( pendingPath ) ) {
		throw new Error( `${ pendingPath } exists: a previous write was never judged. Read it, check those blocks on the live page, delete it, then run again.` );
	}
	const browser = await chromium.launch();
	const allRows = skipped.map( ( s ) => ( { surface: s.surface, family: '*', status: 'unpaired', why: s.why } ) );
	const allOps = [];
	let gate = { judged: [], unresolved: 0, unjudged: 0, confirmed: 0 };
	try {
		await pool( surfaces, Number( flag( '--jobs', 4 ) ), async ( surface ) => {
			const extras = extrasOf( { surface, saved: blocks[ surface.postId ]?.blocks, recordsIndex, db } );
			const drafts = await draftReads( { browser, surface, widths, props, extras, cache: tmp, fresh: has( '--fresh' ) } );
			const lives = await liveReads( { browser, surface, widths, props, extras } );
			const closed = await closedReads( { browser, surface, props, wanted: families.some( ( f ) => f.closedClock?.( { saved: blocks[ surface.postId ]?.blocks ?? {} } ) ) } );
			const { rows, ops: decided } = decideSurface( { surface, drafts, lives, blocks, families, ledger, db, records, recordsIndex, calFor, clientData, closed, skeleton, snapshot, links, rawSnapshot } );
			const saved = blocks[ surface.postId ]?.blocks ?? {};
			// Position matching (lib/apply-position.mjs): draft elements no pair reaches, matched to live blocks by where they sit,
			// then read and decided like any pair. --no-position leaves it out.
			const readFacts = async ( side, items ) => ( await readSurface( { browser, surface: { ...surface, pairs: items }, side, width: 1440, props } ) ).facts;
			const added = has( '--no-position' ) ? [] : await positionTargets( { surface, saved, recordsIndex, readFacts } );
			added.forEach( ( t ) => console.log( `${ surface.name }: position ${ t.tpl } -> ${ t.ref } (overlap ${ t.overlap }, inside ${ t.nearest_tpl })` ) );
			if ( added.length ) {
				const second = { ...surface, pairs: added, coverage: false };
				const d2 = await draftReads( { browser, surface: second, widths, props, extras: extrasOf( { surface: second, saved, recordsIndex, db } ), cache: tmp, fresh: has( '--fresh' ) } );
				const l2 = await liveReads( { browser, surface: second, widths, props, extras: extrasOf( { surface: second, saved, recordsIndex, db } ) } );
				const again = decideSurface( { surface: second, drafts: d2, lives: l2, blocks, families, ledger, db, records, recordsIndex, calFor, clientData, closed, skeleton, snapshot, links, rawSnapshot } );
				rows.push( ...again.rows );
				decided.push( ...again.ops );
			}
			// A read that cannot see a saved value (a grid on an inner element) proposes what is already saved: that is no change.
			// A write the re-read rolled back stays out until --retry and keeps its no-effect row, so a run settles on zero ops.
			const ops = decided.filter( ( op ) => {
				const changes = changesPost( op, blocks );
				const row = rows.find( ( r ) => r.ref === ( op.ref ?? r.ref ) && r.family === op.family && r.prop === op.prop && 'written' === r.status );
				if ( ! changes && row ) {
					row.status = 'equal';
					row.why = 'already saved';
				}
				const rolledBack = changes && ! has( '--retry' ) && undone.has( opKey( op ) );
				if ( rolledBack && row ) {
					row.status = 'no-effect';
					row.why = `rolled back by an earlier run: ${ row.why }`;
				}
				return changes && ! rolledBack;
			} );
			allRows.push( ...rows );
			allOps.push( ...ops );
			fs.writeFileSync( path.join( outDir, `${ surface.name }.plan.json` ), JSON.stringify( { rows, ops }, null, 1 ) );
			console.log( `${ surface.name }: ${ ops.length } ops, ${ rows.length } rows` );
		} );

		const patches = patchesFor( allOps, blocks );
		for ( const [ postId, list ] of patches ) {
			patch( site, postId, list, tmp, true );
		}
		if ( write ) {
			allOps.length && fs.writeFileSync( pendingPath, JSON.stringify( { written: new Date().toISOString(), ops: allOps.map( ( o ) => ( { surface: o.surface, postId: o.postId, ref: o.ref, family: o.family, prop: o.prop } ) ) }, null, 1 ) );
			for ( const [ postId, list ] of patches ) {
				patch( site, postId, list, tmp, false );
			}
			const touched = surfaces.filter( ( s ) => allOps.some( ( o ) => o.surface === s.name ) );
			const reads = {};
			// A failed re-read leaves writes nobody judged: every op goes back, then the error stands.
			try {
				await pool( touched, Number( flag( '--jobs', 4 ) ), async ( surface ) => {
					reads[ surface.name ] = await liveReads( { browser, surface, widths, props, extras: { ...extrasOf( { surface, saved: blocks[ surface.postId ]?.blocks, recordsIndex, db } ), parts: partsOf( allOps.filter( ( o ) => o.surface === surface.name ) ) } } );
				} );
			} catch ( e ) {
				for ( const op of allOps ) {
					patch( site, op.postId, [ restoreOf( op, blocks, [] ) ], tmp, false );
				}
				fs.rmSync( pendingPath, { force: true } );
				throw new Error( `the re-read failed, so every write of this run was restored: ${ e.message }` );
			}
			const judged = judge( allOps, reads );
			const rowOf = ( op ) => allRows.find( ( r ) => r.ref === op.ref && r.family === op.family && r.prop === op.prop && 'written' === r.status );
			for ( const { op } of judged.filter( ( j ) => j.unchecked ) ) {
				rowOf( op ) && ( rowOf( op ).status = 'unchecked' );
			}
			const kept = judged.filter( ( j ) => j.ok ).map( ( j ) => j.op );
			for ( const { op, results } of judged.filter( ( j ) => ! j.ok ) ) {
				patch( site, op.postId, [ restoreOf( op, blocks, kept ) ], tmp, false );
				rowOf( op ) && ( rowOf( op ).status = 'no-effect' );
				undone.set( opKey( op ), stamp );
				console.log( `no effect: ${ op.ref } ${ op.family } ${ op.prop }: ${ JSON.stringify( results.filter( ( r ) => ! r.ok ).map( ( r ) => [ r.width, r.prop, r.got, r.want ] ) ) }` );
			}
			const fresh = judged.flatMap( ( { op, results } ) => results.map( ( r ) => ( { surface: op.surface, record: op.record ?? null, target: op.ref, state: op.state ?? 'rest', ok: r.ok, measured: r.got ?? null, want: r.want } ) ) ).filter( ( r ) => r.record );
			// Rows merge by record, target and state: a run that wrote nothing, or only some surfaces, keeps what earlier runs measured.
			const verifyFile = path.join( outDir, 'verify.json' );
			const earlier = fs.existsSync( verifyFile ) ? JSON.parse( fs.readFileSync( verifyFile, 'utf8' ) ).rows || [] : [];
			fs.writeFileSync( verifyFile, JSON.stringify( { generated: new Date().toISOString(), rows: mergeVerify( earlier, fresh ) }, null, 1 ) );
			fs.writeFileSync( undonePath, JSON.stringify( Object.fromEntries( [ ...undone ].sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ), null, 1 ) );
			fs.rmSync( pendingPath, { force: true } );
		}
		// Before the DB closes: what the block's own settings say about every no-setting row (lib/apply-gate.mjs).
		const settingsOf = ( block ) => ( block ? db.prepare( 'SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ?' ).all( block ) : [] );
		gate = gateRows( allRows, settingsOf );
	} finally {
		await browser.close();
		db.close?.();
	}
	const text = `# Applier ${ write ? 'write' : 'dry run' }: ${ client }\n\n${ summary( allRows ) }\n`;
	fs.writeFileSync( path.join( outDir, 'summary.md' ), text );
	console.log( text );
	fs.writeFileSync( path.join( outDir, 'no-setting-review.json' ), JSON.stringify( gate.judged, null, 1 ) );
	console.log( `no-setting rows: ${ gate.confirmed } confirmed, ${ gate.unjudged } unjudged, ${ gate.unresolved } unresolved (no-setting-review.json)` );
	// A part-run (--surfaces, --families) is work in progress; a whole run cannot end clean with a setting left unused.
	if ( gate.unresolved && ! only && ! wanted ) {
		console.error( `${ gate.unresolved } no-setting row(s) name something the block has a setting for: see no-setting-review.json` );
		process.exitCode = 1;
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	await main();
}
