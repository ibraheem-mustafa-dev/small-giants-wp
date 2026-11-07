// Browser side of the C1 and C2 detectors: the page list and pairs of a client, one opened page per side, the pair
// marking, and the readers (scroll sweep, pointer hover sweep, forced-hover trigger scan). Readers return plain JSON.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveFinder } from '../lib/collect.mjs';
import { markPairs, samplePairs, pointsFor, scopeOf, markAncestor, readOwn, hoverRulesFor, quietSpot } from './c12-inpage.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
const RESOLVE = resolveFinder.toString();

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );

// The client's pages that have a pairs file, with the refs and draft templates to compare. The header and footer pairs
// ride on the home page (the chrome is read once). Returns [ { route, slug, id, pairs: { ref: tpl } } ].
export function clientPages( client, only = null ) {
	const build = path.join( REPO, 'sites', client, 'build' );
	const map = readJson( path.join( build, 'page-map.json' ) ).filter( ( p ) => p.route );
	const pairsOf = ( slug ) => {
		const f = path.join( build, `${ slug }.pairs.json` );
		return fs.existsSync( f ) ? Object.fromEntries( Object.entries( readJson( f ).pairs || {} ).map( ( [ k, v ] ) => [ k, v.tpl || null ] ) ) : null;
	};
	return map.filter( ( p ) => ! only || only.includes( p.route ) || only.includes( p.slug ) ).map( ( p ) => {
		let pairs = pairsOf( p.slug );
		if ( pairs && 'home' === p.route ) {
			pairs = { ...pairs, ...pairsOf( 'header' ), ...pairsOf( 'footer' ) };
		}
		return { route: p.route, slug: p.slug, id: p.id, pairs };
	} );
}

export const loadRulings = ( client ) => {
	const f = path.join( REPO, 'sites', client, 'build/qa/divergences.json' );
	return fs.existsSync( f ) ? readJson( f ) : [];
};

// Opens one side of one page at a width: loads it, waits for the page to settle, scrolls it end to end once so
// scroll-in entrances finish, returns to the top and marks the paired elements. Returns { ctx, page, found }.
export async function openSide( browser, { side, url, width, pairs } ) {
	const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'no-preference' } );
	if ( 'draft' === side ) {
		await ctx.addInitScript( () => {
			let s = 12345;
			Math.random = () => ( s = ( s * 1664525 + 1013904223 ) % 4294967296 ) / 4294967296;
		} );
	}
	const page = await ctx.newPage();
	await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
	if ( 'draft' === side ) {
		await page.waitForSelector( '.sc-host', { timeout: 15000 } ).catch( () => {} );
	}
	await page.waitForLoadState( 'networkidle' ).catch( () => {} );
	await page.waitForTimeout( 3000 );
	const total = await page.evaluate( () => document.documentElement.scrollHeight );
	for ( let y = 0; y < total; y += 450 ) {
		await page.evaluate( ( v ) => scrollTo( { top: v, behavior: 'instant' } ), y );
		await page.waitForTimeout( 90 );
	}
	await page.evaluate( () => scrollTo( { top: 0, behavior: 'instant' } ) );
	await page.waitForTimeout( 1500 );
	const found = await page.evaluate( markPairs, [ side, pairs, RESOLVE ] );
	return { ctx, page, found };
}

// C1 scroll reading: every marked element sampled at each scroll step (twice, 160ms apart, for idle motion).
export async function scrollSweep( page, step = 200 ) {
	const total = await page.evaluate( () => document.documentElement.scrollHeight - innerHeight );
	const steps = {};
	for ( let y = 0; y <= total + step; y += step ) {
		await page.evaluate( ( v ) => scrollTo( { top: v, behavior: 'instant' } ), Math.min( y, total ) );
		await page.waitForTimeout( 260 );
		const a = await page.evaluate( samplePairs );
		await page.waitForTimeout( 160 );
		const b = await page.evaluate( samplePairs );
		for ( const id of Object.keys( a ) ) {
			const idle = a[ id ].inView && b[ id ].tf.some( ( v, i ) => Math.abs( v - a[ id ].tf[ i ] ) > 0.4 );
			( steps[ id ] ||= [] ).push( { ...a[ id ], idle, y: Math.min( y, total ) } );
		}
		if ( y >= total ) {
			break;
		}
	}
	await page.evaluate( () => scrollTo( { top: 0, behavior: 'instant' } ) );
	await page.waitForTimeout( 400 );
	return steps;
}

// Which marked elements are hovered by the pointer: the ids to hover (visible, not a plain text leaf unless `all`),
// one per distinct stack of marked elements under the pointer's text point.
export async function hoverTargets( page, ids, { all = false, extra = [] } = {} ) {
	const cand = await page.evaluate( ( [ list, every, more ] ) => list.filter( ( id ) => {
		const el = document.querySelector( `[data-det-id="${ id }"]` );
		if ( ! el ) {
			return false;
		}
		const r = el.getBoundingClientRect();
		const leaf = 0 === el.children.length && /^(P|H[1-6]|SPAN|LI|SMALL|STRONG|EM|LABEL|B|I)$/.test( el.tagName );
		return r.width > 0 && r.height > 0 && ( every || more.includes( id ) || ! leaf );
	} ), [ ids, all, extra ] );
	return cand;
}

// Rests the real pointer where it hovers no marked element, at the top of the page.
export async function parkPointer( page ) {
	await page.evaluate( () => scrollTo( { top: 0, behavior: 'instant' } ) );
	const at = await page.evaluate( quietSpot );
	await page.mouse.move( at.x, at.y );
	await page.waitForTimeout( 250 );
}

// C1 and C2 pointer reading: for each target id, a rest reading with the pointer in a quiet spot and a reading with the
// pointer on each of its points (text, pad, gap), all marked elements read each time, plus the scope ids.
export async function hoverSweep( page, targets, { wait = 450, maxStacks = 200, points = null } = {} ) {
	const out = {};
	const stacks = new Set();
	for ( const id of targets.slice( 0, maxStacks ) ) {
		const where = await page.evaluate( pointsFor, id );
		if ( ! where ) {
			continue;
		}
		const key = where.chain.join( '|' );
		if ( stacks.has( key ) && where.chain.length > 1 ) {
			out[ id ] = { skipped: 'same stack as an earlier target' };
			continue;
		}
		stacks.add( key );
		const reads = {};
		for ( const [ name, pt ] of Object.entries( where.pts ).filter( ( [ n ] ) => ! points || points.includes( n ) ) ) {
			await page.mouse.move( where.rest.x, where.rest.y, { steps: 2 } );
			await page.waitForTimeout( 300 );
			const rest = await page.evaluate( samplePairs );
			await page.mouse.move( pt.x - 6, pt.y, { steps: 2 } );
			await page.mouse.move( pt.x, pt.y, { steps: 6 } );
			await page.waitForTimeout( wait );
			reads[ name ] = { rest, hov: await page.evaluate( samplePairs ), at: pt };
		}
		out[ id ] = { reads, scope: await page.evaluate( scopeOf, id ), box: where.box };
	}
	await parkPointer( page );
	return out;
}

// C2 trigger scan: for each id, force :hover on the element and on each ancestor alone (transitions off) and record
// which of them change the element's own paint. Returns { id: { rest, triggers: [ { depth, tag, cls, ref, exact, rel,
// changed: [prop] } ], rules } } (rules: the live :hover rules that style the element).
export async function triggerScan( page, ids, { maxDepth = 7, withRules = false } = {} ) {
	await parkPointer( page );
	await page.addStyleTag( { content: '*,*::before,*::after{transition:none!important;animation:none!important}' } );
	const cdp = await page.context().newCDPSession( page );
	await cdp.send( 'DOM.enable' );
	await cdp.send( 'CSS.enable' );
	await cdp.send( 'DOM.getDocument', { depth: 0 } );
	const out = {};
	for ( const id of ids ) {
		const rest = await page.evaluate( readOwn, id );
		if ( ! rest ) {
			continue;
		}
		const triggers = [];
		for ( let depth = 0; depth <= maxDepth; depth++ ) {
			const meta = await page.evaluate( markAncestor, [ id, depth ] );
			if ( ! meta ) {
				break;
			}
			const { result } = await cdp.send( 'Runtime.evaluate', { expression: 'document.querySelector("[data-det-x]")' } );
			if ( ! result?.objectId ) {
				continue;
			}
			const { nodeId } = await cdp.send( 'DOM.requestNode', { objectId: result.objectId } );
			await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [ 'hover' ] } );
			const hov = await page.evaluate( readOwn, id );
			await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
			const changed = Object.keys( rest ).filter( ( k ) => rest[ k ] !== hov[ k ] );
			if ( changed.length ) {
				triggers.push( { ...meta, changed, to: Object.fromEntries( changed.map( ( k ) => [ k, hov[ k ] ] ) ) } );
			}
		}
		out[ id ] = { rest, triggers, rules: withRules && triggers.length ? await page.evaluate( hoverRulesFor, id ) : [] };
	}
	await page.evaluate( () => document.querySelectorAll( '[data-det-x]' ).forEach( ( e ) => e.removeAttribute( 'data-det-x' ) ) );
	await cdp.detach().catch( () => {} );
	return out;
}

// One page at one width on both sides: every reading the C1 and C2 detectors judge. `need` picks the readings
// ({ scroll, hover, triggers }); `urls` is { live, draft }. Returns { live, draft } readings.
export async function readPage( browser, { urls, width, pairs, need, hoverAll = false } ) {
	const read = {};
	for ( const side of [ 'live', 'draft' ] ) {
		const { ctx, page, found } = await openSide( browser, { side, url: urls[ side ], width, pairs } );
		read[ side ] = { found, page, ctx };
	}
	const both = Object.keys( pairs ).filter( ( id ) => read.live.found[ id ] && read.draft.found[ id ] );
	let targets = [];
	if ( need.hover || need.triggers ) {
		targets = await hoverTargets( read.live.page, both, { all: hoverAll } );
		const drawn = new Set( await hoverTargets( read.draft.page, both, { all: true } ) );
		targets = targets.filter( ( id ) => drawn.has( id ) );
	}
	for ( const side of [ 'live', 'draft' ] ) {
		const r = read[ side ];
		const out = { found: r.found };
		if ( need.scroll ) {
			out.scroll = await scrollSweep( r.page );
		}
		if ( need.hover ) {
			out.hover = await hoverSweep( r.page, targets, { points: need.triggers ? null : [ 'text' ] } );
		}
		if ( need.triggers ) {
			out.triggers = await triggerScan( r.page, targets, { withRules: 'live' === side } );
		}
		out.targets = targets;
		await r.ctx.close();
		read[ side ] = out;
	}
	return read;
}

// C1 and C2 judge the same readings: when one CLI run names both (or neither, meaning all), the page is read once with
// the union of what they need and each detector takes its copy; the cache entry is dropped after the last of them.
const SHARED = new Map();
export function sharingDetectors() {
	const i = process.argv.indexOf( '--only' );
	const only = i < 0 ? null : String( process.argv[ i + 1 ] ).toUpperCase().split( ',' );
	return [ 'C1', 'C2' ].filter( ( d ) => ! only || only.includes( d ) ).length;
}
export async function readShared( browser, opts, wanted ) {
	const users = sharingDetectors();
	const key = `${ opts.urls.live }|${ opts.urls.draft }|${ opts.width }`;
	if ( users < 2 ) {
		return readPage( browser, { ...opts, need: wanted } );
	}
	if ( ! SHARED.has( key ) ) {
		SHARED.set( key, { uses: 0, read: readPage( browser, { ...opts, need: { scroll: true, hover: true, triggers: true } } ) } );
	}
	const hit = SHARED.get( key );
	const read = await hit.read;
	if ( ++hit.uses >= users ) {
		SHARED.delete( key );
	}
	return read;
}

// Runs fn over items with at most n at a time (order of results kept).
export async function pool( items, n, fn ) {
	const out = new Array( items.length );
	let next = 0;
	await Promise.all( Array.from( { length: Math.min( n, items.length ) }, async () => {
		while ( next < items.length ) {
			const i = next++;
			out[ i ] = await fn( items[ i ], i );
		}
	} ) );
	return out;
}
