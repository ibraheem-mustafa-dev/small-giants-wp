// The site-option step. Run: node --test tests/apply-options.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { optionsOf, progressTpl } from '../apply-options.mjs';

test( 'the progress element is the one a scroll record scales from scaleX(0) to scaleX(1); other records name none', () => {
	const rec = ( type, from, to ) => ( { trigger: { type }, element: { template_tpl_id: '38' }, properties: [ { property: 'transform', from, to } ] } );
	assert.equal( progressTpl( [ rec( 'scroll-position', 'scaleX(0)', 'scaleX(1)' ) ] ), '38' );
	assert.equal( progressTpl( [ rec( 'hover', 'scaleX(0)', 'scaleX(1)' ), rec( 'scroll-position', 'scale(1)', 'scale(2)' ) ] ), null );
} );

test( 'a gradient bar writes the gradient and height; a flat bar the colour; a height outside 2 to 8 is left', () => {
	const g = optionsOf( { backgroundImage: 'linear-gradient(90deg, rgb(1, 2, 3) 0%, rgb(4, 5, 6) 100%)', backgroundColor: 'rgba(0, 0, 0, 0)', height: '3px' } );
	assert.deepEqual( Object.keys( g ), [ 'sgs_floating_ui_reading_progress_gradient', 'sgs_floating_ui_reading_progress_height' ] );
	assert.deepEqual( optionsOf( { backgroundImage: 'none', backgroundColor: 'rgb(1, 2, 3)', height: '12px' } ), { sgs_floating_ui_reading_progress_colour: 'rgb(1, 2, 3)' } );
	assert.deepEqual( optionsOf( { backgroundImage: 'none', backgroundColor: 'rgba(0, 0, 0, 0)', height: '3px' } ), { sgs_floating_ui_reading_progress_height: 3 } );
} );

// The step the applier runs inside its own pass: the draft's five-stop gradient reaches the option.
import { applyOptions } from '../apply-options.mjs';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath( new URL( '../../../', import.meta.url ) );
const FIVE = 'linear-gradient(90deg, rgb(235, 221, 120) 0%, rgb(231, 215, 104) 24%, rgb(216, 202, 80) 46%, rgb(46, 173, 226) 76%, rgb(10, 126, 168) 100%)';
const bar = { position: 'fixed', height: '3px', backgroundImage: FIVE, backgroundColor: 'rgba(0, 0, 0, 0)' };
const fake = ( have ) => {
	const calls = [];
	return { calls, run: ( site, args ) => ( calls.push( args ), { status: 0, stdout: args.startsWith( 'option get' ) ? have : '', stderr: '' } ) };
};

test( 'apply options: the five-stop reading-progress gradient is written to the option; a dry run writes nothing', async () => {
	const w = fake( 'linear-gradient(90deg,#D8CA50 0%,#2EADE2 100%)' );
	const rows = await applyOptions( { repo: REPO, client: 'indus-foods', write: true, say: () => {}, read: async () => bar, run: w.run } );
	const gradient = rows.find( ( r ) => 'sgs_floating_ui_reading_progress_gradient' === r.name );
	assert.equal( gradient.status, 'written' );
	assert.ok( w.calls.some( ( c ) => c.startsWith( 'option update sgs_floating_ui_reading_progress_gradient' ) && c.includes( '24%' ) ) );
	const dry = fake( 'x' );
	await applyOptions( { repo: REPO, client: 'indus-foods', write: false, say: () => {}, read: async () => bar, run: dry.run } );
	assert.ok( ! dry.calls.some( ( c ) => c.startsWith( 'option update' ) ), 'negative control: a dry run never updates' );
} );

test( 'apply options: a value already on the mirror is equal and not rewritten; a bar that is not fixed writes nothing', async () => {
	const same = fake( FIVE );
	const rows = await applyOptions( { repo: REPO, client: 'indus-foods', write: true, say: () => {}, read: async () => bar, run: same.run } );
	assert.equal( rows.find( ( r ) => 'sgs_floating_ui_reading_progress_gradient' === r.name ).status, 'equal' );
	assert.ok( ! same.calls.some( ( c ) => c.includes( 'update sgs_floating_ui_reading_progress_gradient' ) ) );
	const none = await applyOptions( { repo: REPO, client: 'indus-foods', write: true, say: () => {}, read: async () => ( { ...bar, position: 'static' } ), run: same.run } );
	assert.deepEqual( none, [] );
} );
