/**
 * Snapshot the motion markup a live page's server prints, and compare two snapshots (Spec 38A M6.6, decision B).
 *
 * A GATE fixture page is migrated with `wp sgs motion-migrate --apply --post=<id>` before a removal group deletes the
 * old code it reads. The old fx path and the migrated layer path print the same `data-sgs-fx*` markup (Gate 4b: page
 * 2103 against its migrated copy 5252), so a page whose probe does not exist is checked by snapshotting every element's
 * `data-sgs-fx*` attributes from the raw server HTML before the migration and after it, then diffing them.
 *
 *   node scripts/motion-qa/snapshot-motion-attrs.mjs --page 2721 --out before.json
 *   node scripts/motion-qa/snapshot-motion-attrs.mjs --page 2721 --out after.json
 *   node scripts/motion-qa/snapshot-motion-attrs.mjs --compare before.json after.json
 *
 * `--prefix data-sgs-` widens the snapshot to every SGS data attribute (the model adds `data-sgs-mc`, `data-sgs-me` and
 * the like, which the old path never printed, so the default compares only the effect markup both paths share).
 * Exit codes: 0 equal (or snapshot written), 1 different, 2 usage or load error.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'https://sandybrown-nightingale-600381.hostingersite.com';

function arg( name, fallback = null ) {
	const at = process.argv.indexOf( name );
	return at > -1 ? process.argv[ at + 1 ] : fallback;
}

/** Elements carrying at least one attribute with the prefix, in document order, each as `{ tag, cls, attrs }`. */
async function snapshot( page, prefix ) {
	const browser = await chromium.launch();
	try {
		const tab = await browser.newPage();
		const res = await tab.goto( `${ BASE }/?p=${ page }&cb=${ Date.now() }`, { waitUntil: 'domcontentloaded' } );
		if ( ! res || 200 !== res.status() ) {
			throw new Error( `page ${ page } answered ${ res ? res.status() : 'nothing' }` );
		}
		const html = await res.text();
		await tab.setContent( html, { waitUntil: 'domcontentloaded' } );
		return await tab.evaluate( ( p ) => [ ...document.body.querySelectorAll( '*' ) ]
			.map( ( el ) => ( { tag: el.tagName.toLowerCase(), cls: String( el.getAttribute( 'class' ) || '' ).split( /\s+/ ).filter( ( c ) => c.startsWith( 'sgs-' ) && ! /-[0-9a-f]{6,}$/.test( c ) ).sort().join( ' ' ), attrs: Object.fromEntries( [ ...el.attributes ].filter( ( a ) => a.name.startsWith( p ) ).map( ( a ) => [ a.name, a.value ] ).sort() ) } ) )
			.filter( ( r ) => Object.keys( r.attrs ).length ), prefix );
	} finally {
		await browser.close();
	}
}

function compare( a, b ) {
	const diffs = [];
	const n = Math.max( a.length, b.length );
	for ( let i = 0; i < n; i++ ) {
		const x = JSON.stringify( a[ i ] ?? null );
		const y = JSON.stringify( b[ i ] ?? null );
		if ( x !== y ) {
			diffs.push( { index: i, before: a[ i ] ?? null, after: b[ i ] ?? null } );
		}
	}
	return diffs;
}

const pair = process.argv.indexOf( '--compare' );
if ( pair > -1 ) {
	const [ a, b ] = process.argv.slice( pair + 1, pair + 3 ).map( ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) ) );
	const diffs = compare( a.elements, b.elements );
	console.log( JSON.stringify( { page: a.page, before: a.elements.length, after: b.elements.length, equal: 0 === diffs.length, diffs }, null, 1 ) );
	process.exit( diffs.length ? 1 : 0 );
}
const page = arg( '--page' );
const out = arg( '--out' );
if ( ! page || ! out ) {
	console.error( 'usage: --page <id> --out <file> | --compare <before> <after>' );
	process.exit( 2 );
}
try {
	const elements = await snapshot( page, arg( '--prefix', 'data-sgs-fx' ) );
	fs.writeFileSync( out, JSON.stringify( { page, elements }, null, 1 ) );
	console.log( `page ${ page }: ${ elements.length } element(s) written to ${ out }` );
} catch ( e ) {
	console.error( String( e ) );
	process.exit( 2 );
}
