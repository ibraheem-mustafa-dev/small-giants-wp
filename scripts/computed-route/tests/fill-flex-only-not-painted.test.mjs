// flex-direction and flex-wrap on an element laying out no flex items paint nothing (lib/fill-prop.mjs::notPainted,
// ::flexOnlyPaintsNothing): a draft hero that is a block reads `flex-direction: row` (the initial value) and no setting
// was chosen. Written as the hero's flexDirection it turned the clone's column hero into a row, so its content sat at the top of
// the photo instead of bottom left (Eye Care Home, 2026-11-19: live, the hero's flex-direction row against column moved the
// words from y 330 to y 203 of the same section). Beside lib/fill-not-painted-rows.test.mjs, which holds the other cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { notPainted, flexOnlyPaintsNothing } from '../lib/fill-prop.mjs';
import { notPaintedWhy } from '../lib/fill-resolve-element.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'flex', 'flex-direction': 'column', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const CAL = { 'sgs/hero': { block: 'sgs/hero', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...DEFAULT } ] ) ) }, settings: {}, discovered: {} } };

function run( styles, layoutDisplay ) {
	const skeleton = [ { name: 'sgs/hero', draftRef: '.a', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...DEFAULT, ...styles }, layoutDisplay, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const written = ( out, attr ) => out.writes.some( ( w ) => w.attr === attr );

test( 'MUST FAIL: a block-display draft element\'s flex-direction and flex-wrap are settled as not painted and never written', () => {
	const out = run( { display: 'block', 'flex-direction': 'row', 'flex-wrap': 'nowrap' }, 'block' );
	const rows = out.settled.filter( ( s ) => 'not-painted' === s.reason );
	for ( const p of [ 'flex-direction', 'flex-wrap' ] ) {
		assert.equal( rows.filter( ( r ) => r.property === p ).length, THREE.length, `${ p }: one settled row per tier read width` );
	}
	assert.match( rows.find( ( r ) => 'flex-direction' === r.property ).detail, /^at \d+: flex-direction on a block box, which lays out no flex items$/ );
	assert.ok( ! written( out, 'flexDirection' ), 'no flexDirection is written' );
	assert.ok( ! written( out, 'flexWrap' ) );
} );

test( 'negative controls: a flex or grid-less unknown layout element is judged where it is known, and a flex container paints its direction', () => {
	assert.equal( flexOnlyPaintsNothing( 'flex-direction', { layoutDisplay: 'flex' } ), null );
	assert.equal( flexOnlyPaintsNothing( 'flex-direction', { layoutDisplay: 'inline-flex' } ), null );
	assert.equal( flexOnlyPaintsNothing( 'flex-wrap', { layoutDisplay: '-webkit-box' } ) === null, false, 'only the flex displays are containers' );
	assert.equal( flexOnlyPaintsNothing( 'flex-direction', {} ), null, 'an unread layout display is never judged' );
	assert.equal( flexOnlyPaintsNothing( 'flex-direction', { layoutDisplay: '' } ), null );
	assert.equal( flexOnlyPaintsNothing( 'flex-direction', null ), null );
	assert.match( flexOnlyPaintsNothing( 'flex-direction', { layoutDisplay: 'grid' } ), /grid box, which lays out no flex items/ );
	assert.equal( notPainted( 'flex-direction', {}, { layoutDisplay: 'flex' } ), false );
	assert.equal( notPainted( 'flex-direction', {}, { layoutDisplay: 'block' } ), true );
	assert.equal( notPainted( 'justify-content', {}, { layoutDisplay: 'block' } ), false, 'only the two flex-only properties are judged here' );
	assert.match( notPaintedWhy( 'flex-wrap', {}, { layoutDisplay: 'block' } ), /flex-wrap on a block box/ );
	const out = run( { display: 'flex', 'flex-direction': 'row' }, 'flex' );
	assert.deepEqual( out.settled.filter( ( s ) => 'not-painted' === s.reason && /^flex-/.test( s.property ) ), [], 'a flex container\'s direction is no not-painted row' );
} );
