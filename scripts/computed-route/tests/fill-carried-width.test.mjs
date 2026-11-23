// A fixed width a draft sets on a button is written to customWidth, and sgs/button paints customWidth only when widthType
// is "custom" (render.php: a tier's width derives from its own widthType enum, default "fit" = fit-content). Calibration
// measured customWidth with the fixture's per-setting precondition widthType custom, so a written customWidth carries
// that switch (lib/fill-fixture.mjs::carriedFor, the fixture's `carries` list). Real case: Eye Care Home 2026-11-19 run,
// the colour swatches (a 17px round button the draft draws with no text) were written with customWidth 17px and no
// widthType, so each swatch painted as wide as its label and the product cards' swatch rows pushed the page to 397px on a
// 375px screen. The calibration is trimmed from the cache's sgs/button slot map and a site's default paint
// (tests/fixtures/fill-carried-width/calibration.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { carriedFor } from '../lib/fill-fixture.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const CAL = JSON.parse( fs.readFileSync( new URL( './fixtures/fill-carried-width/calibration.json', import.meta.url ), 'utf8' ) );
const FIXTURES = recordFixtures();
const db = openDb();
const WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
const snap = ( styles, w, h ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h }, inFlow: true, words: '', href: null } );
const REST = CAL.elements[ '' ][ 1440 ];

function run( { width = 17, fixtures = FIXTURES, attributes = {} } = {} ) {
	const skeleton = [ { name: 'sgs/button', attributes, draftRef: '.sw', draftSlots: {} } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'home' );
	const root = nodes[ 0 ].targets.find( ( t ) => '' === t.slot );
	const styles = { ...REST, width: `${ width }px`, height: `${ width }px`, 'min-height': 'auto', 'padding-right': '0px', 'padding-left': '0px' };
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ root.id ]: snap( styles, width, width ) } ] ) ), declared: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ root.id ]: { width: `${ width }px`, height: `${ width }px` } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => CAL, fixtures, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { attrs: tree[ 0 ].attributes, out };
}

test( 'MUST FAIL: a width written to customWidth carries widthType custom, so the button paints it', () => {
	const { attrs, out } = run();
	assert.match( JSON.stringify( attrs.customWidth ?? null ), /17px/, `customWidth holds the draft's 17px: ${ JSON.stringify( attrs.customWidth ) }` );
	assert.deepEqual( attrs.widthType, { desktop: 'custom', tablet: 'custom', mobile: 'custom' }, 'and the switch the setting needs to paint' );
	assert.ok( out.writes.some( ( w ) => 'widthType' === w.attr && 'fixture-carry' === w.how ), 'the switch is a recorded write' );
} );

test( 'negative control: no width written, no switch; a node already holding widthType keeps it; a fixture without `carries` writes none', () => {
	const none = run( { width: 195.359 } );
	assert.equal( none.attrs.customWidth, undefined, 'the calibrated width is the draft width: nothing to write' );
	assert.equal( none.attrs.widthType, undefined, 'so no switch' );
	const held = run( { attributes: { widthType: { desktop: 'full' } } } );
	assert.deepEqual( held.attrs.widthType, { desktop: 'full' }, 'a width type the node holds is never overwritten' );
	const bare = JSON.parse( JSON.stringify( FIXTURES ) );
	delete bare[ 'sgs/button' ].carries;
	assert.equal( run( { fixtures: bare } ).attrs.widthType, undefined, 'only a setting the fixture lists as carried brings its switch' );
	assert.equal( carriedFor( { fixtures: FIXTURES }, 'sgs/button', 'colourBackground', {} ), null, 'a setting with no precondition carries nothing' );
	assert.equal( carriedFor( { fixtures: null }, 'sgs/button', 'customWidth', {} ), null, 'no fixtures read, nothing carried' );
	assert.equal( carriedFor( { fixtures: FIXTURES }, 'sgs/social-icons', 'childIconLabelPosition', {} ), null, 'a precondition the fixture does not list under carries is calibration scaffolding, not a switch Fill writes' );
} );
