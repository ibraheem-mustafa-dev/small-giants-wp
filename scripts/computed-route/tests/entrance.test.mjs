// Entrance start (lib/entrance.mjs): a block the draft shows at rest while live holds its entrance waiting for a scroll
// gets sgsAnimationStart 'load'; nothing else does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entranceStart, groupRects } from '../lib/entrance.mjs';

const col = ( attrs = {} ) => ( { name: 'sgs/container', attributes: { className: 'cr-ref-a-11', sgsAnimation: 'fade-up', ...attrs } } );
const group = ( prop, live, extra = {} ) => ( { prop, path: '', state: null, rows: [ { width: 375, draft: 'x', live } ], ...extra } );

const TOP = { 375: { y: 120, h: 300 } };
const FOLD = { 375: { y: 1500, h: 300 } };

test( 'MUST FAIL TO MISS: a first-viewport entrance hidden live and shown on the draft at rest starts on page load', () => {
	assert.deepEqual( entranceStart( group( 'opacity', '0', { rects: TOP } ), col(), { 375: '1' } ), { writes: [ { attr: 'sgsAnimationStart', value: 'load', merge: 'replace' } ] } );
	assert.ok( entranceStart( group( 'translate', '0px 18px' ), col(), { 375: 'none' }, TOP ) );
} );

test( 'NEGATIVE CONTROL (red on revert): a below-the-fold armed entrance writes nothing', () => {
	assert.equal( entranceStart( group( 'opacity', '0', { rects: FOLD } ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'translate', '0px 26px' ), col(), { 375: 'none' }, FOLD ), null );
	// Inside the viewport at one width but below the fold at another: still no write.
	assert.equal( entranceStart( group( 'opacity', '0' ), col(), { 375: '1' }, { 375: { y: 100, h: 50 }, 1440: { y: 1500, h: 50 } } ), null );
	// No geometry at all is unknown, never assumed first-screen.
	assert.equal( entranceStart( group( 'opacity', '0' ), col(), { 375: '1' } ), null );
} );

test( 'groupRects reads the live box of the group pair at every run width', () => {
	const report = { runs: [ { width: 375, pairs: { p: { live: { box: { y: 40, h: 10 } } } } }, { width: 1440, pairs: { p: { live: { box: { y: 2000, h: 10 } } } } }, { width: 768, pairs: { q: {} } } ] };
	assert.deepEqual( groupRects( report, { pair: 'p' } ), { 375: { y: 40, h: 10 }, 1440: { y: 2000, h: 10 } } );
	assert.deepEqual( groupRects( {}, { pair: 'p' } ), {} );
} );

test( 'positive control: no entrance, already on load, a part, a hover, a half opacity or a draft still hidden writes nothing', () => {
	assert.equal( entranceStart( group( 'opacity', '0' ), { name: 'sgs/text', attributes: {} }, { 375: '1' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0' ), col( { sgsAnimationStart: 'load' } ), { 375: '1' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0', { path: '.sgs-container__inner' } ), col(), { 375: '1' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0', { state: 'hover' } ), col(), { 375: '1' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0.5' ), col(), { 375: '1' }, TOP ), null );
	assert.equal( entranceStart( group( 'opacity', '0' ), col(), { 375: '0' }, TOP ), null );
	assert.equal( entranceStart( group( 'color', 'red' ), col(), { 375: 'blue' } ), null );
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
