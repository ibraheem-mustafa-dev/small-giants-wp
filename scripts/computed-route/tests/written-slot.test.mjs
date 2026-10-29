// Register D1 (Bean, 2026-10-29): the walker reads each value Fill wrote at the element its setting paints, taken from the
// block's calibration. The entries and writes are the shapes of the Indus brands run (sgs/container padding calibrated on
// `.sgs-container__inner`, gap on the wrapper and the inner band, margin on the wrapper).
import test from 'node:test';
import assert from 'node:assert/strict';
import { paintSlot, liveReadSlots, withLiveReads } from '../lib/written-slot.mjs';
import { configText } from '../lib/pairs.mjs';
import { walkerConfigs } from '../lib/fill-config.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const SETTINGS = {
	padding: { slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ], property: 'padding' },
	gap: { slot: '', slots: [ '', '.sgs-container__inner' ], property: 'gap' },
	margin: { slot: '', slots: [ '' ], property: 'margin' },
};
const calFor = ( block ) => ( 'sgs/container' === block ? { settings: SETTINGS } : null );
const W = ( prop, attr, extra = {} ) => ( { node: 'cr-ref-brands-17', block: 'sgs/container', slot: '', prop, attr, how: 'single', ...extra } );

test( 'MUST FAIL: paintSlot gives the descendant slot a setting paints on, and a wrapper-only setting nothing', () => {
	assert.equal( paintSlot( SETTINGS.padding ), '.sgs-container__inner' );
	assert.equal( paintSlot( SETTINGS.gap ), '.sgs-container__inner' );
	assert.equal( paintSlot( SETTINGS.margin ), '' );
	assert.equal( paintSlot( undefined ), '' );
	assert.equal( paintSlot( { slot: '.a', slots: [ '', '.b' ] } ), '.a' );
} );

test( 'MUST FAIL: every written longhand of a calibrated inner setting is read at its slot; wrapper settings and unwritten ones are not', () => {
	const writes = [ W( 'padding-top', 'padding' ), W( 'padding-left', 'padding' ), W( 'column-gap', 'gap' ), W( 'margin-top', 'margin' ), W( 'letter-spacing', 'noSuchSetting' ) ];
	const reads = liveReadSlots( { writes, calFor } );
	assert.deepEqual( reads.get( 'cr-ref-brands-17' ), { 'padding-top': '.sgs-container__inner', 'padding-left': '.sgs-container__inner', 'column-gap': '.sgs-container__inner' } );
	assert.equal( reads.size, 1 );
} );

test( 'negative control: content, state, part and uncalibrated-block writes add no live read', () => {
	const writes = [ W( '(content)', 'text', { how: 'content' } ), W( 'padding-top', 'padding', { state: 'hover' } ), W( 'padding-top', 'padding', { slot: '.sgs-container__inner' } ), W( 'padding-top', 'padding', { block: 'sgs/unknown' } ), W( 'padding-top', 'padding', { how: 'motion' } ) ];
	assert.equal( liveReadSlots( { writes, calFor } ).size, 0 );
} );

test( 'withLiveReads puts liveAt on the block-root pair of a written ref and leaves other pairs and part pairs alone', () => {
	const reads = new Map( [ [ 'cr-ref-a', { gap: '.i' } ] ] );
	const out = withLiveReads( [ { ref: 'cr-ref-a', draft: '.d' }, { ref: 'cr-ref-b', draft: '.e' }, { ref: 'cr-ref-a', slot: '.s', draft: '.f' } ], reads );
	assert.deepEqual( out.map( ( p ) => p.liveAt ?? null ), [ { gap: '.i' }, null, null ] );
} );

test( 'MUST FAIL: the generated config carries liveAt on the pair, and a pair without one is unchanged', async () => {
	const text = configText( 'base.mjs', 's', [ { ref: 'cr-ref-a', draft: '.d', liveAt: { 'padding-top': '.sgs-container__inner' } }, { ref: 'cr-ref-b', draft: '.e' } ] );
	assert.match( text, /name: "gen-a"[^\n]*liveAt: \{"padding-top":"\.sgs-container__inner"\} \},/ );
	assert.doesNotMatch( text.split( '\n' ).find( ( l ) => l.includes( 'gen-b' ) ), /liveAt/ );
	assert.doesNotMatch( configText( 'base.mjs', 's', [ { ref: 'cr-ref-c', draft: '.d', liveAt: {} } ] ), /liveAt/ );
} );

test( 'MUST FAIL: walkerConfigs puts the run\'s live reads on the pairs of the full config', () => {
	const skeleton = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const cfg = ( liveReads ) => walkerConfigs( { surface: 's', nodes: skeletonNodes( skeleton ), tree, draftUrl: 'http://d/', liveUrl: 'http://l/', divergences: null, state: 'opening', liveReads } ).fullText;
	assert.match( cfg( new Map( [ [ 'cr-ref-fx-0', { gap: '.sgs-container__inner' } ] ] ) ), /liveAt: \{"gap":"\.sgs-container__inner"\}/ );
	assert.doesNotMatch( cfg( new Map() ), /liveAt/ );
} );
