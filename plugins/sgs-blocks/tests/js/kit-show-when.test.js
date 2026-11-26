/**
 * components/kitShown.js: the kit gate, `showWhen`, read once for every block.
 *
 * Each case mirrors a PHP gate the kits' blocks print under (includes/class-sgs-container-wrapper.php `$sgs_scroll_row_on`,
 * src/blocks/gallery/render.php `sgs_gallery_layout_tiers`, the sliders' `showArrows` / `showDots` defaults).
 *
 * Negative controls (each proven able to fail by breaking the matching branch in kitShown.js):
 *   1 an empty or missing list shows nothing                 -> "no showWhen, or an empty list, always shows"
 *   2 `on` reads the raw value, not `default`                -> "on and off read the default when the attribute is unset"
 *   3 tierAny reads the desktop tier only                    -> "tierAny: any resolved tier equals the value"
 *   4 tierAll stops inheriting the tier above                -> "tierAll: an unset tier inherits the tier above"
 *   5 `any` is read as `all`                                 -> "any and all group conditions"
 *   6 lacksItem ignores the item key                         -> "lacksItem: no item holds the key and value"
 */

'use strict';

const { kitShown } = require( '../../src/components/kitShown' );
const ops = require( '../../src/components/kit-show-when.json' );

const entry = ( ...showWhen ) => ( { prefix: 'arrow', showWhen } );

describe( 'kitShown', () => {
	test( 'no showWhen, or an empty list, always shows', () => {
		expect( kitShown( { prefix: 'a' }, {} ) ).toBe( true );
		expect( kitShown( entry(), {} ) ).toBe( true );
		expect( kitShown( null, {} ) ).toBe( true );
	} );

	test( 'on and off read the default when the attribute is unset', () => {
		expect( kitShown( entry( { attr: 'showArrows', op: 'on', default: true } ), {} ) ).toBe( true );
		expect( kitShown( entry( { attr: 'showArrows', op: 'on', default: true } ), { showArrows: false } ) ).toBe( false );
		expect( kitShown( entry( { attr: 'showDots', op: 'on', default: false } ), {} ) ).toBe( false );
		expect( kitShown( entry( { attr: 'showDots', op: 'off', default: false } ), {} ) ).toBe( true );
	} );

	test( 'on treats an empty array or object as off, as PHP empty()', () => {
		expect( kitShown( entry( { attr: 'x', op: 'on' } ), { x: [] } ) ).toBe( false );
		expect( kitShown( entry( { attr: 'x', op: 'on' } ), { x: {} } ) ).toBe( false );
		expect( kitShown( entry( { attr: 'x', op: 'on' } ), { x: { a: 1 } } ) ).toBe( true );
	} );

	test( 'equals and notEquals compare the value, with the default for an unset attribute', () => {
		expect( kitShown( entry( { attr: 'variant', op: 'equals', value: 'slider', default: 'slider' } ), {} ) ).toBe( true );
		expect( kitShown( entry( { attr: 'variant', op: 'equals', value: 'slider', default: 'slider' } ), { variant: 'grid' } ) ).toBe( false );
		expect( kitShown( entry( { attr: 'variant', op: 'notEquals', value: 'grid' } ), { variant: 'slider' } ) ).toBe( true );
	} );

	test( 'notEmpty needs a non-empty string', () => {
		expect( kitShown( entry( { attr: 'skipLabel', op: 'notEmpty' } ), {} ) ).toBe( false );
		expect( kitShown( entry( { attr: 'skipLabel', op: 'notEmpty' } ), { skipLabel: '' } ) ).toBe( false );
		expect( kitShown( entry( { attr: 'skipLabel', op: 'notEmpty' } ), { skipLabel: 'Skip' } ) ).toBe( true );
	} );

	test( 'tierAny: any resolved tier equals the value (Scroll sideways on at some device)', () => {
		const gate = entry( { attr: 'scrollSideways', op: 'tierAny', value: 'on', default: 'off' } );
		expect( kitShown( gate, {} ) ).toBe( false );
		expect( kitShown( gate, { scrollSideways: {} } ) ).toBe( false );
		expect( kitShown( gate, { scrollSideways: { mobile: 'on' } } ) ).toBe( true );
		expect( kitShown( gate, { scrollSideways: { desktop: 'on', tablet: 'off', mobile: 'off' } } ) ).toBe( true );
		expect( kitShown( gate, { scrollSideways: { desktop: 'off' } } ) ).toBe( false );
	} );

	test( 'tierAll: an unset tier inherits the tier above (a gallery carousel needs all three)', () => {
		const gate = entry( { attr: 'layout', op: 'tierAll', value: 'carousel', default: 'grid' } );
		expect( kitShown( gate, { layout: {} } ) ).toBe( false );
		expect( kitShown( gate, { layout: { desktop: 'carousel' } } ) ).toBe( true );
		expect( kitShown( gate, { layout: { desktop: 'carousel', mobile: 'scroll' } } ) ).toBe( false );
		expect( kitShown( gate, { layout: { desktop: 'carousel', tablet: 'carousel', mobile: 'carousel' } } ) ).toBe( true );
	} );

	test( 'a plain value counts as the desktop tier', () => {
		const gate = entry( { attr: 'scrollSideways', op: 'tierAny', value: 'on', default: 'off' } );
		expect( kitShown( gate, { scrollSideways: 'on' } ) ).toBe( true );
	} );

	test( 'lacksItem: no item holds the key and value (no horizontal-panel effect on the root)', () => {
		const gate = entry( { attr: 'sgsMotion.elements.root.effects', op: 'lacksItem', key: 'effect', value: 'horizontal-panel' } );
		expect( kitShown( gate, {} ) ).toBe( true );
		expect( kitShown( gate, { sgsMotion: { elements: { root: { effects: [ { effect: 'fade' } ] } } } } ) ).toBe( true );
		expect( kitShown( gate, { sgsMotion: { elements: { root: { effects: [ { effect: 'fade' }, { effect: 'horizontal-panel' } ] } } } } ) ).toBe( false );
	} );

	test( 'every item in the list must hold', () => {
		const gate = entry( { attr: 'a', op: 'on' }, { attr: 'b', op: 'on' } );
		expect( kitShown( gate, { a: true } ) ).toBe( false );
		expect( kitShown( gate, { a: true, b: true } ) ).toBe( true );
	} );

	test( 'any and all group conditions', () => {
		const any = entry( { any: [ { attr: 'arrows', op: 'on' }, { all: [ { attr: 'autoplay', op: 'on' }, { attr: 'pause', op: 'on' } ] } ] } );
		expect( kitShown( any, {} ) ).toBe( false );
		expect( kitShown( any, { arrows: true } ) ).toBe( true );
		expect( kitShown( any, { autoplay: true } ) ).toBe( false );
		expect( kitShown( any, { autoplay: true, pause: true } ) ).toBe( true );
	} );

	test( 'an unknown op shows the part rather than hide a setting', () => {
		expect( kitShown( entry( { attr: 'a', op: 'mystery' } ), {} ) ).toBe( true );
	} );

	test( 'the ops the editor reads are the ops kit-show-when.json lists', () => {
		const used = [ 'on', 'off', 'equals', 'notEquals', 'notEmpty', 'tierAny', 'tierAll', 'lacksItem' ];
		expect( Object.keys( ops.leafOps ).sort() ).toEqual( used.sort() );
		expect( ops.groupOps.sort() ).toEqual( [ 'all', 'any' ] );
	} );
} );
