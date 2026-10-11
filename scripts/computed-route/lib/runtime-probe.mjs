// The runtime probe (FR-48A-5): renders the checked-in fixture draft with a given support.js in headless Chromium and
// reads the data-dc-tpl numbering twice, from the rendered page and from the runtime's own annotated template, so a
// new build is accepted only when it numbers the fixture exactly as the recorded known build did. Also splits two
// builds into their bundled modules to show what changed between them.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from './draft.mjs';
import { REPO, sha256 } from './handoff.mjs';

const DATA = path.join( REPO, 'scripts', 'computed-route', 'data' );
export const PROBE_FIXTURE = path.join( DATA, 'runtime-probe.dc.html' );
export const PROBE_EXPECTED = path.join( DATA, 'runtime-probe.expected.json' );
export const RUNTIMES_DIR = path.join( DATA, 'runtimes' );
const PAGE = 'runtime-probe.dc.html';

// The local copy of a build: data/runtimes/<first 12 hex of its sha256>.support.js.
export const runtimeCopyName = ( sha ) => `${ sha.slice( 0, 12 ) }.support.js`;

// Renders the fixture with `supportFile` and returns { live, annotated, rootName }: each a list of [tag, data-dc-tpl]
// in document order (live: every stamped element of the rendered page; annotated: every stamped element of
// __dcAnnotatedTemplate(__dcRootName()) parsed in a <template>). Needs the network for the runtime's pinned unpkg files.
export async function probeRuntime( supportFile, { fixture = PROBE_FIXTURE, timeout = 60000 } = {} ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'runtime-probe-' ) );
	fs.copyFileSync( fixture, path.join( dir, PAGE ) );
	fs.copyFileSync( supportFile, path.join( dir, 'support.js' ) );
	const srv = await serveDraft( dir, { index: PAGE } );
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
		await page.goto( srv.url + PAGE, { waitUntil: 'networkidle', timeout } );
		await page.waitForSelector( '#dc-root', { state: 'attached', timeout } );
		await page.waitForFunction( () => document.querySelector( '#dc-root [data-dc-tpl]' ) && 'function' === typeof window.__dcAnnotatedTemplate && window.__dcAnnotatedTemplate( window.__dcRootName() ), null, { timeout } );
		await page.waitForTimeout( 500 );
		return await page.evaluate( () => {
			const list = ( rootNode ) => [ ...rootNode.querySelectorAll( '[data-dc-tpl]' ) ].map( ( el ) => [ el.tagName.toLowerCase(), el.getAttribute( 'data-dc-tpl' ) ] );
			const rootName = window.__dcRootName();
			const t = document.createElement( 'template' );
			t.innerHTML = window.__dcAnnotatedTemplate( rootName );
			return { rootName, live: list( document ), annotated: list( t.content ) };
		} );
	} finally {
		await browser.close();
		await srv.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
}

// Differences between a probe result and the recorded one: one line per list that differs, naming the first index
// where they part and both lengths. Empty when both lists are equal.
export function compareProbe( result, expected ) {
	const out = [];
	for ( const key of [ 'live', 'annotated' ] ) {
		const a = result[ key ] || [];
		const b = expected[ key ] || [];
		const n = Math.max( a.length, b.length );
		for ( let i = 0; i < n; i++ ) {
			if ( JSON.stringify( a[ i ] ) !== JSON.stringify( b[ i ] ) ) {
				out.push( `${ key }: differs at element ${ i } (got ${ JSON.stringify( a[ i ] ?? null ) }, recorded ${ JSON.stringify( b[ i ] ?? null ) }); ${ a.length } elements, ${ b.length } recorded` );
				break;
			}
		}
	}
	return out;
}

// A support.js split into its bundled modules on the `// src/<name>.ts` markers: Map(name → text); the text before
// the first marker is "(preamble)".
export function splitModules( src ) {
	const mods = new Map();
	const marks = [ ...src.matchAll( /^[ \t]*\/\/ src\/([\w./-]+?)\.ts[ \t]*$/gm ) ];
	mods.set( '(preamble)', src.slice( 0, marks.length ? marks[ 0 ].index : src.length ) );
	marks.forEach( ( m, i ) => mods.set( m[ 1 ], src.slice( m.index, i + 1 < marks.length ? marks[ i + 1 ].index : src.length ) ) );
	return mods;
}

// Module-by-module difference of build `b` from build `a`: [{ module, status: same|changed|added|removed, from, to }]
// with byte sizes, in `b`'s order then `a`'s removed modules.
export function moduleDiff( a, b ) {
	const ma = splitModules( a );
	const mb = splitModules( b );
	const out = [];
	for ( const [ name, text ] of mb ) {
		if ( ! ma.has( name ) ) {
			out.push( { module: name, status: 'added', from: 0, to: text.length } );
		} else {
			out.push( { module: name, status: ma.get( name ) === text ? 'same' : 'changed', from: ma.get( name ).length, to: text.length } );
		}
	}
	for ( const [ name, text ] of ma ) {
		if ( ! mb.has( name ) ) {
			out.push( { module: name, status: 'removed', from: text.length, to: 0 } );
		}
	}
	return out;
}

// The known build with a local copy whose modules differ least from `src` (most identical modules, then fewest changed
// bytes): { runtime, diff } or null when no known build has a local copy. `path` in a known entry is repo-relative.
// `exclude` names a sha256 to skip, so a build already listed is compared with the other builds.
export function nearestKnown( src, known, { exclude = null } = {} ) {
	let best = null;
	for ( const r of known.runtimes.filter( ( x ) => x.sha256 !== exclude ) ) {
		const file = r.path ? path.resolve( REPO, r.path ) : path.join( RUNTIMES_DIR, runtimeCopyName( r.sha256 ) );
		if ( ! fs.existsSync( file ) ) {
			continue;
		}
		const diff = moduleDiff( fs.readFileSync( file, 'utf8' ), src );
		const same = diff.filter( ( d ) => 'same' === d.status ).length;
		const bytes = diff.filter( ( d ) => 'same' !== d.status ).reduce( ( s, d ) => s + Math.abs( d.to - d.from ) + 1, 0 );
		if ( ! best || same > best.same || ( same === best.same && bytes < best.bytes ) ) {
			best = { runtime: r, diff, same, bytes };
		}
	}
	return best && { runtime: best.runtime, diff: best.diff };
}

// Copies a build into data/runtimes/ and appends its entry to the known list file; returns the entry. A build already
// listed is returned unchanged.
export function addRuntime( supportFile, knownFile, { source, added = new Date().toISOString().slice( 0, 10 ) } ) {
	const buf = fs.readFileSync( supportFile );
	const sha = sha256( buf );
	const data = fs.existsSync( knownFile ) ? JSON.parse( fs.readFileSync( knownFile, 'utf8' ) ) : { runtimes: [] };
	data.runtimes ||= [];
	const existing = data.runtimes.find( ( r ) => r.sha256 === sha );
	if ( existing ) {
		return existing;
	}
	fs.mkdirSync( RUNTIMES_DIR, { recursive: true } );
	const copy = path.join( RUNTIMES_DIR, runtimeCopyName( sha ) );
	fs.writeFileSync( copy, buf );
	const entry = { sha256: sha, added, source, probe: 'pass', path: path.relative( REPO, copy ).split( path.sep ).join( '/' ) };
	data.runtimes.push( entry );
	fs.writeFileSync( knownFile, `${ JSON.stringify( data, null, '\t' ) }\n` );
	return entry;
}
