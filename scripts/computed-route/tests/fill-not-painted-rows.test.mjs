// A value that paints nothing is a settled row with its reason, never a width dropped silently
// (lib/fill-resolve-element.mjs::fillElement, ::notPaintedWhy): every case lib/fill-prop.mjs::notPainted judges inert (an
// outline with no width, a border side of width 0, a decoration with no line, a transition of 0s), beside the gap's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { notPaintedWhy } from '../lib/fill-resolve-element.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const CAL = { 'sgs/text': { block: 'sgs/text', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...DEFAULT } ] ) ) }, settings: {}, discovered: {} } };

// A text node whose element declares an unseen outline, top border, decoration and transition.
const INERT = {
	'outline-style': 'none', 'outline-width': '0px', 'outline-color': 'rgb(255, 0, 0)', 'outline-offset': '4px',
	'border-top-width': '0px', 'border-top-color': 'rgb(0, 0, 255)',
	'text-decoration-line': 'none', 'text-decoration-color': 'rgb(0, 128, 0)', 'text-decoration-thickness': '3px', 'text-underline-offset': '2px',
	'transition-duration': '0s', 'transition-delay': '0.2s', 'transition-timing-function': 'ease-in',
};

function run( styles ) {
	const skeleton = [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}

test( 'MUST FAIL: every inert property at every read width is a not-painted settled row naming why', () => {
	const out = run( INERT );
	const rows = out.settled.filter( ( s ) => 'not-painted' === s.reason );
	const props = [ 'outline-color', 'outline-offset', 'border-top-color', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset', 'transition-delay', 'transition-timing-function' ];
	for ( const p of props ) {
		assert.equal( rows.filter( ( r ) => r.property === p ).length, THREE.length, `${ p }: one row per tier read width` );
	}
	const detail = ( p ) => rows.find( ( r ) => r.property === p ).detail;
	assert.match( detail( 'outline-color' ), /outline-style none and outline-width 0px: no outline is drawn/ );
	assert.match( detail( 'border-top-color' ), /top border of width 0px: no border is drawn/ );
	assert.match( detail( 'text-underline-offset' ), /text-decoration-line none: no line is drawn/ );
	assert.match( detail( 'transition-delay' ), /transition-duration 0s: the change is instant/ );
	assert.ok( rows.every( ( r ) => /^at \d+: \S/.test( r.detail ) && ! /undefined|null/.test( r.detail ) ), 'every row names its width and a reason' );
} );

test( 'a painted value is no not-painted row (negative control)', () => {
	const out = run( { ...INERT, 'outline-style': 'solid', 'outline-width': '2px', 'border-top-width': '1px', 'text-decoration-line': 'underline', 'transition-duration': '0.3s' } );
	assert.deepEqual( out.settled.filter( ( s ) => 'not-painted' === s.reason ).map( ( s ) => s.property ), [] );
} );

test( 'a gap keeps the reason gapPaintsNothing gives', () => {
	assert.match( notPaintedWhy( 'row-gap', {}, { layoutDisplay: 'block' } ), /row-gap on a block box, which lays out no flex or grid items/ );
	assert.match( notPaintedWhy( 'outline-offset', { 'outline-style': 'solid', 'outline-width': '0px' } ), /outline-width 0px/ );
} );
