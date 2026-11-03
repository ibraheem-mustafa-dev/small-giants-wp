import { applyPick, removePick, undoSwap, stepCount, addCounted, countsComplete } from '../../src/blocks/buybox/configurator-picks.js';
import { distribute, perUnitPence, perUnitText, splitText, buildSummary, summaryFor } from '../../src/blocks/buybox/configurator-summary.js';

describe( 'applyPick', () => {
	test( 'adds below the most and keeps the order', () => {
		expect( applyPick( [ 'a' ], 'b', 3, 'refuse' ) ).toEqual( { order: [ 'a', 'b' ], removed: null, refused: false } );
	} );
	test( 'refuse says no at the most', () => {
		expect( applyPick( [ 'a', 'b', 'c' ], 'd', 3, 'refuse' ) ).toEqual( { order: [ 'a', 'b', 'c' ], removed: null, refused: true } );
	} );
	test( 'replace swaps out the oldest and the order survives', () => {
		const first = applyPick( [ 'a', 'b', 'c' ], 'd', 3, 'replace' );
		expect( first ).toEqual( { order: [ 'b', 'c', 'd' ], removed: 'a', refused: false } );
		expect( applyPick( first.order, 'e', 3, 'replace' ).order ).toEqual( [ 'c', 'd', 'e' ] );
	} );
	test( 'a pick already made changes nothing', () => {
		expect( applyPick( [ 'a' ], 'a', 3, 'replace' ).order ).toEqual( [ 'a' ] );
	} );
} );

describe( 'removePick and undo', () => {
	test( 'the last pick of a least-1 group cannot be cleared', () => {
		expect( removePick( [ 'a' ], 'a', 1 ) ).toEqual( { order: [ 'a' ], kept: true } );
		expect( removePick( [ 'a', 'b' ], 'a', 1 ) ).toEqual( { order: [ 'b' ], kept: false } );
	} );
	test( 'a group with a larger least can clear to swap', () => {
		expect( removePick( [ 'a', 'b', 'c' ], 'a', 3 ).order ).toEqual( [ 'b', 'c' ] );
	} );
	test( 'undo restores the removed pick as the oldest', () => {
		expect( undoSwap( [ 'b', 'c', 'd' ], 'd', 'a' ) ).toEqual( [ 'a', 'b', 'c' ] );
	} );
} );

describe( 'shopper-set counts', () => {
	test( 'a step never passes the pack total or drops below 1', () => {
		expect( stepCount( { a: 5, b: 3 }, 'a', 1, 8 ) ).toEqual( { a: 5, b: 3 } );
		expect( stepCount( { a: 5, b: 2 }, 'b', 1, 8 ) ).toEqual( { a: 5, b: 3 } );
		expect( stepCount( { a: 1 }, 'a', -1, 8 ) ).toEqual( { a: 1 } );
	} );
	test( 'a new pick needs room and the total must equal the pack', () => {
		expect( addCounted( { a: 8 }, 'b', 8 ) ).toEqual( { a: 7, b: 1 } );
		expect( addCounted( { a: 1, b: 1 }, 'c', 2 ) ).toBeNull();
		expect( addCounted( { a: 7 }, 'b', 8 ) ).toEqual( { a: 7, b: 1 } );
		expect( countsComplete( { a: 5, b: 3 }, 8 ) ).toBe( true );
		expect( countsComplete( { a: 5 }, 8 ) ).toBe( false );
	} );
} );

describe( 'summary', () => {
	test( 'the equal split gives the extra to the first picks (7, 7, 6)', () => {
		expect( distribute( 20, 3 ) ).toEqual( [ 7, 7, 6 ] );
		expect( distribute( 20, 0 ) ).toEqual( [] );
	} );
	test( 'the default sentence for three picks', () => {
		expect( summaryFor( { template: 'Your {pack}: {split}', pack: 20, packLabel: '20 pack', variation: '', labels: [ 'Strawberry', 'Mango', 'Vanilla' ], counts: [ 7, 7, 6 ], sharing: true } ) ).toBe(
			'Your 20: 7 Strawberry · 7 Mango · 6 Vanilla'
		);
	} );
	test( 'one pick reads All N', () => {
		expect( splitText( [ 'Mango' ], [ 20 ], 20 ) ).toBe( 'All 20 Mango' );
	} );
	test( 'an unknown token is removed and zero picks give no sentence', () => {
		expect( buildSummary( 'Your {pack} {nope}: {picks}', { pack: 8, picks: 'Mango' } ) ).toBe( 'Your 8: Mango' );
		expect( summaryFor( { template: '{split}', pack: 8, packLabel: '', variation: '', labels: [], counts: [], sharing: true } ) ).toBe( '' );
	} );
	test( 'a plain list (not sharing) joins the labels', () => {
		expect( summaryFor( { template: 'You chose {picks}', pack: 0, packLabel: '', variation: '', labels: [ 'Rose', 'Plum', 'Sand' ], counts: [], sharing: false } ) ).toBe( 'You chose Rose, Plum, Sand' );
	} );
	test( 'more picks than the pack still splits without a negative count', () => {
		expect( distribute( 2, 3 ) ).toEqual( [ 1, 1, 0 ] );
	} );
	test( 'markup in a label stays text (the module returns plain strings)', () => {
		expect( summaryFor( { template: '{picks}', pack: 0, packLabel: '', variation: '', labels: [ '<b>x</b>' ], counts: [], sharing: false } ) ).toBe( '<b>x</b>' );
	} );
} );

describe( 'per unit price', () => {
	test( '£1.19 each, rounded half up', () => {
		expect( perUnitPence( 2380, 20 ) ).toBe( 119 );
		expect( perUnitPence( 3, 2 ) ).toBe( 2 );
		expect( perUnitText( 2380, 20, '£' ) ).toBe( '£1.19 each' );
	} );
	test( 'a zero or missing pack hides it', () => {
		expect( perUnitText( 2380, 0, '£' ) ).toBe( '' );
		expect( perUnitPence( 2380, null ) ).toBeNull();
	} );
} );
