// Entrance start (lib/entrance.mjs): between Spec 38A M6.6 and M7 the cloning route writes no motion, so an entrance
// the draft shows at rest while live holds it waiting for a scroll writes nothing, and no old animation attribute.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entranceStart, groupRects } from '../lib/entrance.mjs';

const col = ( attrs = {} ) => ( { name: 'sgs/container', attributes: { className: 'cr-ref-a-11', ...attrs } } );
const group = ( prop, live, extra = {} ) => ( { prop, path: '', state: null, rows: [ { width: 375, draft: 'x', live } ], ...extra } );

const TOP = { 375: { y: 120, h: 300 } };
const FOLD = { 375: { y: 1500, h: 300 } };

test( 'NEGATIVE CONTROL: an entrance hidden live and shown on the draft at rest writes nothing, first viewport or below the fold', () => {
	assert.equal( entranceStart( group( 'opacity', '0', { rects: TOP } ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'translate', '0px 18px' ), col(), { 375: 'none' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0', { rects: FOLD } ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'translate', '0px 26px' ), col(), { 375: 'none' }, FOLD ), null );
	assert.equal( entranceStart( group( 'opacity', '0' ), col(), { 375: '1' } ), null );
} );

test( 'groupRects reads the live box of the group pair at every run width', () => {
	const report = { runs: [ { width: 375, pairs: { p: { live: { box: { y: 40, h: 10 } } } } }, { width: 1440, pairs: { p: { live: { box: { y: 2000, h: 10 } } } } }, { width: 768, pairs: { q: {} } } ] };
	assert.deepEqual( groupRects( report, { pair: 'p' } ), { 375: { y: 40, h: 10 }, 1440: { y: 2000, h: 10 } } );
	assert.deepEqual( groupRects( {}, { pair: 'p' } ), {} );
} );

test( 'entranceStart never returns an attribute write, for any group', () => {
	for ( const node of [ col(), { name: 'sgs/text', attributes: {} }, col( { sgsMotion: { v: 1 } } ) ] ) {
		for ( const g of [ group( 'opacity', '0' ), group( 'opacity', '0', { path: '.sgs-container__inner' } ), group( 'opacity', '0', { state: 'hover' } ), group( 'color', 'red' ) ] ) {
			assert.equal( entranceStart( g, node, { 375: '1' }, TOP ), null );
		}
	}
} );

// The viewport narrowing is only real if the callers supply the rect. `rects` defaults to `g.rects`, which no code
// assigns, so a caller passing three arguments makes entranceStart return null for EVERY group - including the
// first-screen entrance it is meant to write. A unit test cannot catch that, because it passes the rect itself; only
// the call sites can be checked. Both resolvers must hand it groupRects of their own walker report.
test( 'both entranceStart callers pass the live rect, so the write is not silently dead', async () => {
	const fs = await import( 'node:fs' );
	const url = await import( 'node:url' );
	const here = url.fileURLToPath( new URL( '.', import.meta.url ) );
	for ( const [ file, walkerReport ] of [ [ '../solve.mjs', 'report' ], [ '../lib/triage.mjs', 'walk' ] ] ) {
		const src = fs.readFileSync( here + file, 'utf8' );
		const calls = src.split( 'entranceStart(' ).slice( 1 ).map( ( tail ) => tail.slice( 0, 120 ) );
		assert.ok( calls.length, file + ' calls entranceStart' );
		for ( const call of calls ) {
			assert.ok( call.includes( 'groupRects( ' + walkerReport + ', g )' ),
				file + ' must pass groupRects( ' + walkerReport + ', g ) to entranceStart, else the write is dead: ' + call );
		}
		assert.ok( /import \{[^}]*groupRects[^}]*\} from/.test( src ), file + ' imports groupRects' );
	}
} );
