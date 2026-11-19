#!/usr/bin/env node
/**
 * The shared scrim shows while its owner is open, for every way an owner opens (assets/js/scrim-state.js,
 * includes/helpers-scrim.php::sgs_scrim_render).
 *
 * A page holds three owners with the open selectors the adopters pass: a `<dialog>` opened with showModal()
 * (`.{uid}:modal`: modal, gallery lightbox, product search), a `<dialog>` whose `[open]` is the open state (nav drawer,
 * basket panel) and a disclosure whose trigger sets `aria-expanded` (the bar's mega menu). Each scrim must carry
 * `data-sgs-scrim-on` (and its open rule's opacity) while its owner is open and lose it once it closes; a dialog opened
 * with show() is not `:modal`, so that scrim stays hidden. The scrim CSS is the helper's own open-rule shape.
 *
 *   node scripts/tests/test-scrim-state.mjs [--all]     (--all: Chromium, Firefox and WebKit)
 *   node scripts/tests/test-scrim-state.mjs --unplant   the script is left out: the test must fail
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..', '..' );
const pw = createRequire( path.join( PLUGIN, 'package.json' ) )( 'playwright' );
const ENGINES = process.argv.includes( '--all' ) ? [ 'chromium', 'firefox', 'webkit' ] : [ 'chromium' ];
const UNPLANT = process.argv.includes( '--unplant' );
const SCRIPT = fs.readFileSync( path.join( PLUGIN, 'assets', 'js', 'scrim-state.js' ), 'utf8' );

const scrimCss = ( uid ) =>
	`.${ uid }-scrim{position:fixed;inset:0;opacity:0;pointer-events:none;transition:opacity 0ms}` +
	`.${ uid }-scrim[data-sgs-scrim-on]{opacity:1;pointer-events:auto}`;
const esc = ( s ) => s.replace( /&/g, '&amp;' ).replace( /"/g, '&quot;' );
const OWNERS = {
	m1: '.m1:modal',
	d1: '.d1[open]',
	b1: '.b1 [data-sgs-mega-trigger][aria-expanded="true"]',
};
const HTML = `<!doctype html><html><head><style>${ Object.keys( OWNERS ).map( scrimCss ).join( '' ) }</style></head><body>
<dialog class="m1"><p>modal</p></dialog>
<dialog class="d1"><p>drawer</p></dialog>
<nav class="b1"><button data-sgs-mega-trigger aria-expanded="false">Shop</button></nav>
${ Object.entries( OWNERS ).map( ( [ uid, open ] ) => `<div class="sgs-scrim ${ uid }-scrim" aria-hidden="true" data-sgs-scrim-open="${ esc( open ) }"></div>` ).join( '' ) }
${ UNPLANT ? '' : `<script>${ SCRIPT }</script>` }
</body></html>`;

const STEPS = [
	[ 'nothing open', () => {}, { m1: false, d1: false, b1: false } ],
	[ 'modal opened with showModal()', () => document.querySelector( '.m1' ).showModal(), { m1: true, d1: false, b1: false } ],
	[ 'modal closed', () => document.querySelector( '.m1' ).close(), { m1: false, d1: false, b1: false } ],
	[ 'modal opened with show() is not :modal', () => document.querySelector( '.m1' ).show(), { m1: false, d1: false, b1: false } ],
	[ 'drawer opened', () => { document.querySelector( '.m1' ).close(); document.querySelector( '.d1' ).showModal(); }, { m1: false, d1: true, b1: false } ],
	[ 'drawer closed', () => document.querySelector( '.d1' ).close(), { m1: false, d1: false, b1: false } ],
	[ 'mega menu expanded', () => document.querySelector( '.b1 button' ).setAttribute( 'aria-expanded', 'true' ), { m1: false, d1: false, b1: true } ],
	[ 'mega menu collapsed', () => document.querySelector( '.b1 button' ).setAttribute( 'aria-expanded', 'false' ), { m1: false, d1: false, b1: false } ],
];

let fails = 0;
for ( const engine of ENGINES ) {
	const browser = await pw[ engine ].launch();
	const page = await browser.newPage();
	await page.setContent( HTML );
	for ( const [ label, act, want ] of STEPS ) {
		await page.evaluate( act );
		await page.evaluate( () => new Promise( ( r ) => requestAnimationFrame( () => r() ) ) );
		const got = await page.evaluate( ( uids ) => Object.fromEntries( uids.map( ( u ) => {
			const el = document.querySelector( `.${ u }-scrim` );
			return [ u, el.hasAttribute( 'data-sgs-scrim-on' ) && getComputedStyle( el ).opacity === '1' ];
		} ) ), Object.keys( OWNERS ) );
		const bad = Object.keys( want ).filter( ( u ) => want[ u ] !== got[ u ] );
		if ( bad.length ) {
			fails++;
			console.log( `FAIL ${ engine }: ${ label }: ${ bad.map( ( u ) => `${ u } shown=${ got[ u ] }, expected ${ want[ u ] }` ).join( '; ' ) }` );
		}
	}
	await browser.close();
}
console.log( `test-scrim-state: ${ fails ? 'FAIL' : 'PASS' } (${ STEPS.length } steps x ${ ENGINES.join( ', ' ) })` );
process.exit( fails ? 1 : 0 );
