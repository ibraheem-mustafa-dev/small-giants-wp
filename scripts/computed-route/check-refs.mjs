#!/usr/bin/env node
// Checks that every draft link of a skeleton names exactly one draft element (Spec 47 §3.4, R-47-4).
//   node scripts/computed-route/check-refs.mjs --client <slug> --surface <name> [--skeleton <file>] [--draft-url <url>]
// Opens the draft in a real browser at 1440px, resolves every `draftRef` and `draftSlots` finder (a Site Info row's
// generated icons included) through the walker's own `resolveFinder`, and counts the elements the raw selector would match.
// Per target it prints resolved / unique / missing. Exits 1 on any target that is missing, ambiguous (a selector matching
// more than one element, two targets resolving to the same element) or outside its node. Reads only; writes nothing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveFinder } from '../parity/lib/collect.mjs';
import { readTree } from './lib/tree.mjs';
import { skeletonNodes, expandSiteInfoRows, finderKind } from './lib/fill-skeleton.mjs';
import { loadChromium } from './lib/fill-read.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// The verdict of each target from what the page said. entries: [{ id, kind, found, element (a number naming the element,
// or null), rawCount (elements the raw selector matches: the finder's selector, or the bare data-dc-tpl attribute), inside
// (false when a slot's element lies outside its node's) }]. Returns the entries with { status: 'ok' | 'missing' |
// 'ambiguous' | 'outside', reason }. A tpl finder is unique by construction, so its raw count is information; a selector
// string matching two or more elements is ambiguous, and so are two targets resolving to one element.
export function refStatus( entries ) {
	const holders = {};
	entries.forEach( ( e ) => null !== e.element && ( holders[ e.element ] ||= [] ).push( e.id ) );
	return entries.map( ( e ) => {
		let status = 'ok';
		let reason = '';
		if ( ! e.found ) {
			[ status, reason ] = [ 'missing', 'the finder resolves to no element' ];
		} else if ( 'selector' === e.kind && e.rawCount > 1 ) {
			[ status, reason ] = [ 'ambiguous', `the selector matches ${ e.rawCount } elements` ];
		} else if ( holders[ e.element ].length > 1 ) {
			[ status, reason ] = [ 'ambiguous', `also the target of ${ holders[ e.element ].filter( ( x ) => x !== e.id ).join( ', ' ) }` ];
		} else if ( false === e.inside ) {
			[ status, reason ] = [ 'outside', 'the slot element lies outside its node\'s element' ];
		}
		return { ...e, status, reason };
	} );
}

// In-page. in: [ targets ([{ id, finder, kind, parentId }]), resolveSource ]. Returns an entry per target.
function readTargets( [ targets, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const seen = new Map();
	const els = {};
	return targets.map( ( t ) => {
		const el = resolve( t.finder );
		els[ t.id ] = el;
		if ( el && ! seen.has( el ) ) {
			seen.set( el, seen.size );
		}
		const raw = 'selector' === t.kind ? t.finder : `[data-dc-tpl="${ /\/(\d+)#\d+$/.exec( t.finder.tpl || '' )?.[ 1 ] }"]`;
		let rawCount = null;
		try {
			rawCount = 'selector' === t.kind || 'tpl' === t.kind ? document.querySelectorAll( raw ).length : null;
		} catch {
			rawCount = null;
		}
		return { id: t.id, kind: t.kind, found: !! el, element: el ? seen.get( el ) : null, rawCount, inside: t.parentId && el && els[ t.parentId ] ? els[ t.parentId ].contains( el ) : null, tag: el ? el.tagName.toLowerCase() : null, text: el ? ( el.textContent || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 30 ) : null };
	} );
}

// Every target of a skeleton (after the Site Info rows expand into their icons): { id, node, name, slot, finder, kind, parentId }.
export function skeletonTargets( skeleton ) {
	return skeletonNodes( expandSiteInfoRows( skeleton ) ).flatMap( ( n ) => n.targets.map( ( t ) => ( { id: t.id, node: n.index, name: n.name, slot: t.slot, finder: t.finder, kind: finderKind( t.finder ), parentId: t.scoped ? `${ n.index }:` : null } ) ) );
}

// Opens the draft and checks every target of the skeleton. Returns { targets, summary }.
export async function checkRefs( { skeleton, draftUrl } ) {
	const targets = skeletonTargets( skeleton );
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
		await page.goto( draftUrl, { waitUntil: 'networkidle', timeout: 90000 } );
		await page.waitForTimeout( 2500 );
		const read = await page.evaluate( readTargets, [ targets, resolveFinder.toString() ] );
		const rows = refStatus( read ).map( ( r, i ) => ( { ...r, node: targets[ i ].node, name: targets[ i ].name, slot: targets[ i ].slot, finder: targets[ i ].finder } ) );
		const n = ( s ) => rows.filter( ( r ) => r.status === s ).length;
		return { targets: rows, summary: { targets: rows.length, resolved: rows.filter( ( r ) => r.found ).length, unique: n( 'ok' ), missing: n( 'missing' ), ambiguous: n( 'ambiguous' ), outside: n( 'outside' ) } };
	} finally {
		await browser.close();
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	try {
		const client = flag( '--client' );
		const surface = flag( '--surface' );
		if ( ! client || ! surface ) {
			throw new Error( 'usage: check-refs.mjs --client <slug> --surface <name> [--skeleton <file>] [--draft-url <url>]' );
		}
		const build = path.join( REPO, 'sites', client, 'build' );
		const surfaces = JSON.parse( fs.readFileSync( path.join( build, 'surfaces.json' ), 'utf8' ) );
		const draftUrl = flag( '--draft-url' ) || surfaces[ surface ]?.draftUrl;
		if ( ! draftUrl ) {
			throw new Error( `no draftUrl for surface "${ surface }": pass --draft-url` );
		}
		const { targets, summary } = await checkRefs( { skeleton: readTree( flag( '--skeleton' ) || path.join( build, 'skeleton', `${ surface }.skeleton.json` ) ), draftUrl } );
		for ( const r of targets ) {
			const f = 'string' === typeof r.finder ? r.finder : r.finder.tpl || JSON.stringify( r.finder );
			console.log( `${ r.status.toUpperCase().padEnd( 9 ) } node ${ String( r.node ).padStart( 2 ) } ${ r.name }${ r.slot ? ` [${ r.slot }]` : '' }  ${ f }  ${ r.found ? `resolved <${ r.tag }> "${ r.text }"` : 'not resolved' }  raw=${ r.rawCount ?? '-' }${ r.reason ? `  (${ r.reason })` : '' }` );
		}
		console.log( `check-refs ${ surface }: ${ summary.targets } targets, ${ summary.resolved } resolved, ${ summary.unique } unique, ${ summary.missing } missing, ${ summary.ambiguous } ambiguous, ${ summary.outside } outside their node` );
		process.exit( summary.unique === summary.targets ? 0 : 1 );
	} catch ( e ) {
		console.error( e.message );
		process.exit( 2 );
	}
}
