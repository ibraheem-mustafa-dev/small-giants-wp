// A parent block's `child*` setting paints its nested block's element, so it is read from that element and never from the
// parent's own (lib/fill-resolve-state.mjs::alternateSlots). Real case: the Indus header's pill row (`sgs/multi-button`, the
// pills 15px) was written `childBtnFontSize: 19px`, the font size its own root inherits from the page wrapper.
import test from 'node:test';
import assert from 'node:assert/strict';
import { alternateSlots, reachesChildBlock } from '../lib/fill-resolve-state.mjs';

const cal = {
	settings: {
		fontSize: { property: 'font-size', slot: '' },
		childBtnFontSize: { property: 'font-size', slot: '.sgs-button:nth-of-type(1)' },
		linkFontSize: { property: 'font-size', slot: '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link' },
		cardTitleSize: { property: 'font-size', slot: '.sgs-container__inner > .sgs-heading', reaches: [ '.sgs-card__title' ] },
		bandGap: { property: 'gap', slot: '.sgs-container__inner' },
	},
};

test( 'MUST FAIL: a carried property is never offered to a setting that paints a nested block\'s element', () => {
	const slots = alternateSlots( cal, 'font-size' );
	assert.ok( ! slots.includes( '.sgs-button:nth-of-type(1)' ), JSON.stringify( slots ) );
	assert.ok( ! slots.includes( '.sgs-container__inner > .sgs-heading' ), 'a nested block below a part' );
} );

test( 'the block\'s own settings and parts stay offered', () => {
	const slots = alternateSlots( cal, 'font-size' );
	assert.ok( slots.includes( '' ) );
	assert.ok( slots.some( ( s ) => s.endsWith( '__link' ) ) );
	assert.ok( slots.includes( '.sgs-card__title' ) );
	assert.deepEqual( alternateSlots( cal, 'gap' ), [ '.sgs-container__inner' ] );
} );

test( 'a nested block root is a step with no BEM element', () => {
	assert.equal( reachesChildBlock( '.sgs-button' ), true );
	assert.equal( reachesChildBlock( '.sgs-multi-button .sgs-button:nth-of-type(2)' ), true );
	assert.equal( reachesChildBlock( '.sgs-container__inner' ), false );
	assert.equal( reachesChildBlock( '' ), false );
	assert.equal( reachesChildBlock( undefined ), false );
} );
