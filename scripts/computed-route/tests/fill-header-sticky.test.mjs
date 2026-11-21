// A header the draft pins by its own CSS (lib/fill-header-sticky.mjs): the draft's header element computes `position: sticky`
// with no script behind it (an inline `position:sticky;top:0` on the header), so no motion record speaks for it and the
// scroll-shadow reading never fires; before, Fill never wrote the header's sticky setting and the clone's header scrolled away.
// Now the setting is written per tier from the computed positions read on the header node's own element. Contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stickyHeaderWrites } from '../lib/fill-header-sticky.mjs';

const W = [ 375, 768, 1440 ];
const setup = ( positions, block = 'sgs/site-header' ) => {
	const node = { name: block, attributes: { ref: 'cr-ref-h' } };
	return {
		nodes: [ { index: 0, name: block, targets: [ { id: 'h', slot: '' }, { id: 'h-inner', slot: '.inner' } ] } ],
		flat: [ node ],
		refOf: ( n ) => n.attributes.ref,
		reads: { widths: Object.fromEntries( W.map( ( w ) => [ w, { h: { position: positions[ w ], styles: { position: positions[ w ] } }, 'h-inner': { position: 'sticky' } } ] ) ) },
		node,
	};
};

test( 'MUST FAIL: a header the draft pins at every read width is sticky from the desktop down', () => {
	const s = setup( { 375: 'sticky', 768: 'sticky', 1440: 'sticky' } );
	const out = stickyHeaderWrites( s );
	assert.deepEqual( s.node.attributes.headerSticky, { desktop: 'on' } );
	assert.equal( out.writes.length, 1 );
	assert.equal( out.writes[ 0 ].how, 'header-sticky' );
} );

test( 'MUST FAIL: a header pinned on the desktop only is on at desktop and off on each tier below', () => {
	const s = setup( { 375: 'relative', 768: 'static', 1440: 'fixed' } );
	stickyHeaderWrites( s );
	assert.deepEqual( s.node.attributes.headerSticky, { desktop: 'on', tablet: 'off', mobile: 'off' } );
} );

test( 'negative controls: a header in the flow at every width writes nothing; another block, or a header already given the setting, is left alone', () => {
	const flowing = setup( { 375: 'relative', 768: 'relative', 1440: 'static' } );
	assert.equal( stickyHeaderWrites( flowing ).writes.length, 0 );
	assert.equal( flowing.node.attributes.headerSticky, undefined, 'a part that pins (the inner target) does not make the header sticky' );
	const other = setup( { 375: 'sticky', 768: 'sticky', 1440: 'sticky' }, 'sgs/container' );
	assert.equal( stickyHeaderWrites( other ).writes.length, 0 );
	const given = setup( { 375: 'sticky', 768: 'sticky', 1440: 'sticky' } );
	assert.equal( stickyHeaderWrites( { ...given, writes: [ { index: 0, attr: 'headerSticky' } ] } ).writes.length, 0 );
	const unread = setup( {} );
	assert.equal( stickyHeaderWrites( unread ).writes.length, 0, 'a header never read writes nothing' );
} );
