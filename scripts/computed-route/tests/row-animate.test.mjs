// A header row that scrolls away above the pinned header bar hides on scroll (rowHideOnScroll), and its collapse animates
// unless rowAnimate is off. A draft row that times nothing at rest at every width it is read at (`transition: none`, a
// 0s transition-duration) jumps, so rowAnimate is written off; a row that times anything keeps the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStrip } from '../lib/fill-behaviour.mjs';

const W = [ 375, 768, 1440 ];
const byWidth = ( f ) => Object.fromEntries( W.map( ( w ) => [ w, f( w ) ] ) );
// The rendered resting timing of target `t` at each width, and optionally the code's own declaration.
const reads = ( rendered, declared = null ) => ( { widths: byWidth( ( w ) => ( { t: { styles: { 'transition-duration': rendered( w ) } } } ) ), declared: byWidth( ( w ) => ( { t: declared ? { 'transition-duration': declared( w ) } : {} } ) ) } );
const strip = ( r, { name = 'sgs/site-header-row', hasAttr = () => true } = {} ) => {
	const flat = [ { name, attributes: {} } ];
	const out = { writes: [], notes: [], unmapped: [] };
	applyStrip( { n: { index: 0, name }, target: { id: 't', slot: '' }, key: 'Site/5', idx: { stripKeys: new Set( [ 'Site/5' ] ) }, out, where: { node: 'r0', block: name, slot: '' }, flat, hasAttr, reads: r } );
	return { attrs: flat[ 0 ].attributes, out };
};

test( 'MUST FAIL: a scrolling-away row whose draft times nothing at rest is written rowAnimate off', () => {
	const { attrs, out } = strip( reads( () => '0s' ) );
	assert.deepEqual( attrs, { rowHideOnScroll: { desktop: 'on' }, rowAnimate: false } );
	const write = out.writes.find( ( w ) => 'rowAnimate' === w.attr );
	assert.deepEqual( [ write.block, write.before, write.after, write.how ], [ 'sgs/site-header-row', null, false, 'motion' ] );
	assert.ok( out.notes.some( ( n ) => /times nothing at rest .* rowAnimate off/.test( n.text ) ) );
	assert.deepEqual( strip( reads( () => '0s, 0ms' ) ).attrs.rowAnimate, false, 'every entry of the list is 0' );
} );

test( 'a row that times anything at rest, at any width, keeps the default (negative control)', () => {
	assert.deepEqual( strip( reads( ( w ) => ( 768 === w ? '0.3s' : '0s' ) ) ).attrs, { rowHideOnScroll: { desktop: 'on' } } );
	assert.deepEqual( strip( reads( () => '0s, 0.2s' ) ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'one timed entry' );
	assert.deepEqual( strip( reads( () => '0s', () => '0.25s' ) ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'the code\'s declaration beats the rendered value' );
	assert.deepEqual( strip( null ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'no reads, nothing judged' );
	assert.deepEqual( strip( { widths: {}, declared: {} } ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'no width read, nothing judged' );
	assert.deepEqual( strip( reads( () => 'calc(var(--t))' ) ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'a timing that cannot be read is not 0' );
} );

test( 'MUST FAIL: the motion writer judges the strip row by the run\'s reads', async () => {
	const { motionWrites } = await import( '../lib/fill-motion.mjs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const { loadMotionSchema } = await import( '../lib/motion-schema.mjs' );
	const { openDb } = await import( '../lib/db.mjs' );
	const { motionFixtureDb } = await import( './fixtures/motion-fixture-db.mjs' );
	const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/site-header': [], 'sgs/site-header-row': [] } ) ) );
	const style = ( ...pairs ) => ( { style: { static: pairs, holes: [] } } );
	const template = { elements: { 'Site/5': { realParent: 'Site/1', srcLine: 5, ...style(), parentChain: [ 'Site/1' ] }, 'Site/10': { realParent: 'Site/1', srcLine: 10, ...style( [ 'position', 'sticky' ], [ 'top', '0' ] ), parentChain: [ 'Site/1' ] } } };
	const header = { id: 'S-1', name: 'S-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setHeaderEl', description: 'Header bar' }, trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' }, source: { code: "this._headerEl.style.boxShadow = window.scrollY > 8 ? '0 10px 30px -18px rgba(20,40,60,.35)' : 'none'" }, properties: [ { property: 'box-shadow', from: 'none', to: '0 10px 30px -18px rgba(20,40,60,.35)' } ], duration_ms: 300, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal' };
	const nodes = [ [ 'sgs/site-header', '10' ], [ 'sgs/site-header-row', '5' ] ].map( ( [ name, tpl ], index ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } ) );
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const r = { widths: byWidth( () => ( { '1:': { styles: { 'transition-duration': '0s' } } } ) ), declared: byWidth( () => ( {} ) ) };
	motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [ header ], mdb, schema: loadMotionSchema(), rawSnapshot: { settings: { custom: {} } }, hasAttr: () => true, template, reads: r } );
	assert.deepEqual( flat[ 1 ].attributes, { rowHideOnScroll: { desktop: 'on' }, rowAnimate: false } );
} );

test( 'rowAnimate is written only where the block declares it', () => {
	const { attrs } = strip( reads( () => '0s' ), { hasAttr: ( b, a ) => 'rowAnimate' !== a } );
	assert.deepEqual( attrs, { rowHideOnScroll: { desktop: 'on' } } );
} );

// A state look of target `t` at every width: the toggled or state rule's declared and rendered longhands.
const withLook = ( r, look ) => ( { ...r, states: byWidth( () => ( { looks: { t: [ { pseudo: null, ...look } ] } } ) ) } );

test( 'MUST FAIL: a row timed only in a toggled or state rule keeps the default', () => {
	const toggled = withLook( reads( () => '0s' ), { states: [ 'is-hidden' ], declared: { 'transition-duration': '0.3s', 'transition-property': 'transform' }, rendered: { 'transition-duration': '0.3s' } } );
	assert.deepEqual( strip( toggled ).attrs, { rowHideOnScroll: { desktop: 'on' } } );
	const rendered = withLook( reads( () => '0s' ), { states: [ 'hover' ], declared: {}, rendered: { 'transition-duration': '0s, 200ms' } } );
	assert.deepEqual( strip( rendered ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'a state look\'s rendered timing counts' );
	const animated = withLook( reads( () => '0s' ), { states: [ 'open' ], declared: { 'animation-duration': '0.4s' } } );
	assert.deepEqual( strip( animated ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'a state animation times the row' );
	const still = withLook( reads( () => '0s' ), { states: [ 'hover' ], declared: { color: 'red' }, rendered: { 'transition-duration': '0s' } } );
	assert.deepEqual( strip( still ).attrs.rowAnimate, false, 'a state look that times nothing leaves the row still (positive control)' );
} );

test( 'MUST FAIL: a row read at one width only is not judged for every device', () => {
	const one = { widths: { 1440: { t: { styles: { 'transition-duration': '0s' } } } }, declared: { 1440: { t: {} } } };
	assert.deepEqual( strip( one ).attrs, { rowHideOnScroll: { desktop: 'on' } } );
	const failed = { ...reads( () => '0s' ), failures: [ { id: 't', owner: 0, width: 768, read: 'declared', reason: 'threw' } ] };
	assert.deepEqual( strip( failed ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'a failed declared read judges nothing' );
	// The decided rule: a width the row does not render at (the finder found nothing visible) is not a width it times at.
	const hiddenAtPhone = { widths: byWidth( ( w ) => ( { t: 375 === w ? { missing: true } : { styles: { 'transition-duration': '0s' } } } ) ), declared: byWidth( () => ( { t: {} } ) ) };
	assert.deepEqual( strip( hiddenAtPhone ).attrs.rowAnimate, false );
	const nowhere = { widths: byWidth( () => ( { t: { missing: true } } ) ), declared: byWidth( () => ( {} ) ) };
	assert.deepEqual( strip( nowhere ).attrs, { rowHideOnScroll: { desktop: 'on' } }, 'a row that renders nowhere is not judged' );
} );

test( 'a site-header-row that does not scroll away gets no rowAnimate through motionWrites (negative control)', async () => {
	const { motionWrites } = await import( '../lib/fill-motion.mjs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const { loadMotionSchema } = await import( '../lib/motion-schema.mjs' );
	const { openDb } = await import( '../lib/db.mjs' );
	const { motionFixtureDb } = await import( './fixtures/motion-fixture-db.mjs' );
	const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/site-header': [], 'sgs/site-header-row': [] } ) ) );
	const style = ( ...pairs ) => ( { style: { static: pairs, holes: [] } } );
	// Site/12 comes after the pinned bar, so it is not a strip; the second run has no pinned bar at all.
	const template = { elements: { 'Site/10': { realParent: 'Site/1', srcLine: 10, ...style( [ 'position', 'sticky' ], [ 'top', '0' ] ), parentChain: [ 'Site/1' ] }, 'Site/12': { realParent: 'Site/1', srcLine: 12, ...style(), parentChain: [ 'Site/1' ] } } };
	const header = { id: 'S-1', name: 'S-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setHeaderEl', description: 'Header bar' }, trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' }, source: { code: "this._headerEl.style.boxShadow = window.scrollY > 8 ? '0 10px 30px -18px rgba(20,40,60,.35)' : 'none'" }, properties: [ { property: 'box-shadow', from: 'none', to: '0 10px 30px -18px rgba(20,40,60,.35)' } ], duration_ms: 300, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal' };
	const run = ( records ) => {
		const nodes = [ [ 'sgs/site-header', '10' ], [ 'sgs/site-header-row', '12' ] ].map( ( [ name, tpl ], index ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } ) );
		const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
		const r = { widths: byWidth( () => ( { '1:': { styles: { 'transition-duration': '0s' } } } ) ), declared: byWidth( () => ( {} ) ) };
		motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema: loadMotionSchema(), rawSnapshot: { settings: { custom: {} } }, hasAttr: () => true, template, reads: r } );
		return flat[ 1 ].attributes;
	};
	assert.equal( run( [ header ] ).rowAnimate, undefined, 'a row after the pinned bar' );
	assert.equal( run( [] ).rowAnimate, undefined, 'no pinned bar' );
} );
