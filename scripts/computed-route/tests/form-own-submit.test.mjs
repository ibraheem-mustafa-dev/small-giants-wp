// The form block's layout of what the cloning tool writes into it (Spec 04 sgs/form, Spec 48 FR-48-57):
//  - a form holding its own submit button (the draft's button, written as sgs/button isSubmit) renders no built-in
//    submit button beside it: plugins/sgs-blocks/includes/helpers-form-own-submit.php::sgs_form_has_own_submit, read by
//    the form's render.php (tests/php/run-form-own-submit-standalone.php drives the real render.php) and mirrored for
//    the editor by src/blocks/form/form-own-submit.js::hasOwnSubmit;
//  - any block in the form other than a half or third width field (a heading, text, a container of fields or chips, a
//    button) spans the form's whole row (src/blocks/form/style.css), never one of the six tracks.
// Run: node --test scripts/computed-route/tests/form-own-submit.test.mjs   (needs `php` on PATH)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const PLUGIN = path.join( REPO, 'plugins', 'sgs-blocks' );

test( 'a form with its own submit button renders no built-in one; without one, or as a multi-step form\'s Previous and Next, the form\'s buttons stay', () => {
	const run = spawnSync( 'php', [ path.join( PLUGIN, 'tests', 'php', 'run-form-own-submit-standalone.php' ) ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 } );
	const lines = String( run.stdout || '' ).split( /\r?\n/ ).filter( Boolean );
	assert.deepEqual( lines.filter( ( l ) => ! l.startsWith( 'ok' ) ), [], run.stderr );
	assert.equal( lines.length, 11 );
	assert.equal( run.status, 0 );
} );

test( 'the editor mirrors it: hasOwnSubmit finds a submit button at any depth and nothing else', async () => {
	const src = fs.readFileSync( path.join( PLUGIN, 'src', 'blocks', 'form', 'form-own-submit.js' ), 'utf8' );
	const { hasOwnSubmit } = await import( `data:text/javascript;base64,${ Buffer.from( src ).toString( 'base64' ) }` );
	const button = ( isSubmit ) => ( { name: 'sgs/button', attributes: { isSubmit } } );
	const box = ( ...innerBlocks ) => ( { name: 'sgs/container', attributes: {}, innerBlocks } );
	assert.equal( hasOwnSubmit( [ button( true ) ] ), true );
	assert.equal( hasOwnSubmit( [ box( box( button( true ) ) ) ] ), true );
	assert.equal( hasOwnSubmit( [ button( false ), box( button( false ) ), { name: 'sgs/heading', attributes: { isSubmit: true } } ] ), false );
	assert.equal( hasOwnSubmit( [] ), false );
	assert.equal( hasOwnSubmit( undefined ), false );
} );

test( 'every block in a form other than a half or third width field spans the whole row; half and third fields and a span a block sets itself keep theirs', async () => {
	const css = fs.readFileSync( path.join( PLUGIN, 'src', 'blocks', 'form', 'style.css' ), 'utf8' );
	const html = `<!doctype html><html><head><style>.own-span{grid-column:span 2}</style><style>${ css }</style></head><body style="margin:0">
		<div class="sgs-form" style="width:700px"><form class="sgs-form__inner">
			<h2 id="heading">Send a message</h2>
			<div id="chips">chips</div>
			<div class="sgs-form-field sgs-form-field--full" id="full">full</div>
			<div class="sgs-form-field sgs-form-field--half" id="half1">half</div>
			<div class="sgs-form-field sgs-form-field--half" id="half2">half</div>
			<div class="sgs-form-field sgs-form-field--third" id="third">third</div>
			<button id="button" type="submit">Send message</button>
			<div class="own-span" id="own">its own span</div>
		</form></div></body></html>`;
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 900, height: 800 } } );
		await page.setContent( html );
		const w = await page.evaluate( () => Object.fromEntries( [ 'heading', 'chips', 'full', 'half1', 'half2', 'third', 'button', 'own' ].map( ( id ) => [ id, Math.round( document.getElementById( id ).getBoundingClientRect().width ) ] ) ) );
		const row = w.full;
		assert.ok( row > 600, `the full field spans the form (${ row })` );
		assert.deepEqual( [ w.heading, w.chips, w.button ], [ row, row, row ] );
		assert.ok( w.half1 < row * 0.6 && w.half1 > row * 0.4 && w.half2 === w.half1, `half fields share a row (${ w.half1 })` );
		assert.ok( w.third < row * 0.4 && w.third > row * 0.25, `a third field keeps its third (${ w.third })` );
		// A block's own column rule (a class at the least specificity) still wins over the full-row default.
		assert.ok( w.own < row * 0.4, `a block's own span wins (${ w.own })` );
	} finally {
		await browser.close();
	}
} );
