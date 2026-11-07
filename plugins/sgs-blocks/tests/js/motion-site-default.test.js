/**
 * The Entrance panel's site reveal default (Spec 38A FR-38A-63): which rule a block matches, mirroring
 * `Sgs_Motion_Reveal_Default`, and the values it lists.
 */
const {
	matchingRule,
	ruleSummary,
	wrapsItems,
} = require( '../../src/blocks/extensions/motion/entrance/site-default' );

const reveal = {
	item: { from: { opacity: 0, translateY: '40px' }, duration: 800 },
	heading: { from: { opacity: 0 }, duration: 850 },
};
const grid = { attributes: { layout: 'grid' }, childCount: 3 };

describe( 'site reveal default rule match', () => {
	it( 'matches a child of a grid and a wrapped flex row', () => {
		expect(
			matchingRule( { blockName: 'sgs/hero', parent: grid, reveal } )
		).toBe( 'item' );
		expect(
			matchingRule( {
				blockName: 'sgs/hero',
				parent: {
					attributes: { layout: 'flex' },
					defaults: { flexWrap: { default: 'wrap' } },
					childCount: 2,
				},
				reveal,
			} )
		).toBe( 'item' );
	} );
	it( 'matches an h2 heading and the text right after it', () => {
		expect(
			matchingRule( {
				blockName: 'sgs/heading',
				attributes: { level: 'h2' },
				parent: {},
				reveal,
			} )
		).toBe( 'heading' );
		expect(
			matchingRule( {
				blockName: 'sgs/text',
				afterH2: true,
				parent: {},
				reveal,
			} )
		).toBe( 'heading' );
	} );
	it( 'does not match without rules, a lone child, nowrap, stack, column flex, an h3 or loose text', () => {
		expect(
			matchingRule( {
				blockName: 'sgs/hero',
				parent: grid,
				reveal: undefined,
			} )
		).toBeNull();
		expect(
			matchingRule( {
				blockName: 'sgs/hero',
				parent: { ...grid, childCount: 1 },
				reveal,
			} )
		).toBeNull();
		expect( wrapsItems( { layout: 'flex', flexWrap: 'nowrap' } ) ).toBe(
			false
		);
		expect( wrapsItems( { layout: 'stack' } ) ).toBe( false );
		expect(
			wrapsItems( { layout: 'flex', flexDirection: 'column' } )
		).toBe( false );
		expect(
			matchingRule( {
				blockName: 'sgs/heading',
				attributes: { level: 'h3' },
				parent: {},
				reveal,
			} )
		).toBeNull();
		expect(
			matchingRule( {
				blockName: 'sgs/text',
				afterH2: false,
				parent: {},
				reveal,
			} )
		).toBeNull();
	} );
	it( 'lists the inherited values', () => {
		expect(
			ruleSummary( reveal.item, { duration: '1s', start: 4 } )
		).toEqual( [
			'Starts from: opacity 0, translateY 40px',
			'Duration: 800ms',
			'Start line: 4% above the viewport bottom',
		] );
	} );
} );
