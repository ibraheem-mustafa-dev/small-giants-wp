#!/usr/bin/env node
/**
 * Extended open-drawer measurement probe (measurement-vs-eye rule).
 *
 * Closes the two blind spots in scripts/parity/extract-css-diff.js's
 * CAPTURE_PROPS for the Gate 2 re-run:
 *   1. no `backdropFilter`, no `::before` / `::after`, no parent chain
 *   2. no COUNT of how many records were compared, so "0 mismatches" is
 *      indistinguishable from "0 records"
 *
 * Usage:
 *   node extended-probe.mjs <originalUrl> <cloneUrl> [width]
 */
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' ).split( path.sep ).join( '/' );
const require = createRequire( pathToFileURL( PLUGIN + '/package.json' ) );
const { chromium } = require( 'playwright' );
const { openSurface, guardScope } = await import(
	pathToFileURL( PLUGIN + '/scripts/nav-qa/lib/openness-guard.mjs' ).href
);

const [ origUrl, cloneUrl, widthArg ] = process.argv.slice( 2 );
const width = parseInt( widthArg || '375', 10 );
const TRIGGER = '.sgs-nav-bar-menu__burger';
const SCOPE = 'dialog.sgs-nav-drawer';

const PROPS = [
	'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
	'backgroundRepeat', 'backgroundBlendMode',
	'opacity', 'filter', 'backdropFilter', 'mixBlendMode', 'boxShadow',
	'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
	'textAlign', 'textTransform', 'textDecorationLine',
	'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
	'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
	'borderTopWidth', 'borderTopStyle', 'borderTopColor',
	'borderTopLeftRadius', 'borderBottomRightRadius',
	'display', 'position', 'inset', 'zIndex', 'transform', 'transition',
	'flexDirection', 'alignItems', 'justifyContent', 'gap', 'overflowY',
];
const PSEUDO_PROPS = [ 'content', 'backgroundColor', 'backgroundImage', 'backgroundSize',
	'opacity', 'filter', 'backdropFilter', 'mixBlendMode', 'transform', 'inset', 'zIndex' ];
const CHAIN_PROPS = [ 'filter', 'backdropFilter', 'mixBlendMode', 'opacity', 'transform', 'isolation', 'contain' ];

function extract( { scope, props, pseudoProps, chainProps } ) {
	const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase().slice( 0, 60 );
	const root = document.querySelector( scope );
	if ( ! root ) return { error: 'scope matched nothing' };
	const out = { records: [], chain: [], backdrop: null };

	const nodes = [ root, ...root.querySelectorAll( '*' ) ];
	const seen = {};
	for ( const el of nodes ) {
		const r = el.getBoundingClientRect();
		if ( r.width < 2 || r.height < 2 ) continue;
		const cs = getComputedStyle( el );
		const text = norm( el.childElementCount === 0 ? el.textContent : '' );
		let key;
		if ( text ) key = 'txt:' + text;
		else {
			const t = el.tagName.toLowerCase();
			seen[ t ] = ( seen[ t ] || 0 ) + 1;
			key = t + '#' + seen[ t ];
		}
		if ( out.records.find( ( x ) => x.key === key ) ) continue;
		const styles = {};
		for ( const p of props ) styles[ p ] = cs[ p ];
		for ( const pe of [ '::before', '::after' ] ) {
			const pcs = getComputedStyle( el, pe );
			if ( ! pcs || pcs.content === 'none' || pcs.content === '' ) continue;
			for ( const p of pseudoProps ) styles[ pe + ' ' + p ] = pcs[ p ];
		}
		out.records.push( { key, tag: el.tagName.toLowerCase(), styles } );
	}

	// Parent chain from the dialog up to <html>.
	let n = root.parentElement;
	while ( n ) {
		const cs = getComputedStyle( n );
		const rec = { tag: n.tagName.toLowerCase(), cls: ( n.className || '' ).toString().slice( 0, 50 ) };
		for ( const p of chainProps ) rec[ p ] = cs[ p ];
		out.chain.push( rec );
		n = n.parentElement;
	}

	// ::backdrop — the top-layer paint under a showModal()'d dialog.
	const b = getComputedStyle( root, '::backdrop' );
	if ( b ) {
		out.backdrop = {};
		for ( const p of pseudoProps ) out.backdrop[ p ] = b[ p ];
	}
	out.rootBox = { w: Math.round( root.getBoundingClientRect().width ), h: Math.round( root.getBoundingClientRect().height ) };
	return out;
}

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
const page = await ctx.newPage();

async function measure( url, label ) {
	await page.goto( url, { waitUntil: 'networkidle' } );
	await openSurface( page, { open: TRIGGER, openVia: 'keyboard' } );
	const verdict = await guardScope( page, { scope: SCOPE, open: TRIGGER, requireOpen: true } );
	if ( verdict.status === 'VACUOUS' ) {
		console.error( `${ label }: VACUOUS — ${ verdict.reason }` );
		process.exit( 3 );
	}
	console.error( `${ label }: guard ${ verdict.status }` );
	return page.evaluate( extract, { scope: SCOPE, props: PROPS, pseudoProps: PSEUDO_PROPS, chainProps: CHAIN_PROPS } );
}

const a = await measure( origUrl, 'original' );
const b = await measure( cloneUrl, 'clone' );
await browser.close();

const bByKey = Object.fromEntries( b.records.map( ( r ) => [ r.key, r ] ) );
const aByKey = Object.fromEntries( a.records.map( ( r ) => [ r.key, r ] ) );
const shared = a.records.filter( ( r ) => bByKey[ r.key ] );
let comparisons = 0;
const mismatches = [];
for ( const r of shared ) {
	const o = bByKey[ r.key ];
	for ( const p of Object.keys( r.styles ) ) {
		if ( ! ( p in o.styles ) ) continue;
		comparisons++;
		if ( r.styles[ p ] !== o.styles[ p ] ) mismatches.push( { key: r.key, prop: p, original: r.styles[ p ], clone: o.styles[ p ] } );
	}
}
const chainMismatch = [];
const n = Math.min( a.chain.length, b.chain.length );
for ( let i = 0; i < n; i++ ) {
	for ( const p of CHAIN_PROPS ) {
		comparisons++;
		if ( a.chain[ i ][ p ] !== b.chain[ i ][ p ] ) chainMismatch.push( { depth: i, tag: a.chain[ i ].tag, prop: p, original: a.chain[ i ][ p ], clone: b.chain[ i ][ p ] } );
	}
}
const backdropMismatch = [];
if ( a.backdrop && b.backdrop ) {
	for ( const p of Object.keys( a.backdrop ) ) {
		comparisons++;
		if ( a.backdrop[ p ] !== b.backdrop[ p ] ) backdropMismatch.push( { prop: p, original: a.backdrop[ p ], clone: b.backdrop[ p ] } );
	}
}

console.log( JSON.stringify( {
	width,
	originalRecords: a.records.length,
	cloneRecords: b.records.length,
	sharedKeys: shared.length,
	onlyOriginal: a.records.filter( ( r ) => ! bByKey[ r.key ] ).map( ( r ) => r.key ),
	onlyClone: b.records.filter( ( r ) => ! aByKey[ r.key ] ).map( ( r ) => r.key ),
	propertyComparisons: comparisons,
	rootBox: { original: a.rootBox, clone: b.rootBox },
	parentChainDepth: { original: a.chain.length, clone: b.chain.length },
	mismatches,
	chainMismatch,
	backdropMismatch,
}, null, 1 ) );
process.exit( mismatches.length || chainMismatch.length || backdropMismatch.length ? 1 : 0 );
