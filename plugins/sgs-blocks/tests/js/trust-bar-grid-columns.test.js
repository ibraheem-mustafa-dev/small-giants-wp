/**
 * Trust bar canvas twins of includes/helpers-trust-bar-grid.php: the column count a grid draws at a device, the
 * in-badge separator and lone-last-row rules, the column gap, and which icon an item draws.
 *
 * Guards (each broken in turn and seen to fail):
 *   1 a tier ignores the wider template it inherits   -> "inherits the wider template"
 *   2 the end of a row keeps its separator            -> "no separator at the end of a row or after the last badge"
 *   3 an orphan centres when its row is full          -> "a lone last badge centres only when its row has one badge"
 *   4 the custom SVG is dropped for the tick          -> "draws the custom SVG when the item names no library icon"
 */

'use strict';

const { templateCount, tierColumns, gridBadgeRules, columnGapPreview } = require( '../../src/blocks/trust-bar/grid-columns' );
const { badgeIcon } = require( '../../src/blocks/trust-bar/edit-panels' );

jest.mock( '@wordpress/components', () => ( { __esModule: true, PanelBody: () => null, RangeControl: () => null } ) );
jest.mock( '../../src/components', () => ( {
	__esModule: true,
	IconPreview: () => null,
	ResponsiveOverride: () => null,
	SgsBoxControl: () => null,
	SgsLengthControl: () => null,
	BOX_UNITS: [],
	normaliseResponsiveBox: ( v ) => v,
} ) );

describe( 'templateCount', () => {
	it( 'reads a plain repeat(N, ...) and nothing else', () => {
		expect( templateCount( 'repeat(4, minmax(max-content, 1fr))' ) ).toBe( 4 );
		expect( templateCount( 'repeat(3,1fr)' ) ).toBe( 3 );
		expect( templateCount( '1fr 1fr' ) ).toBeNull();
		expect( templateCount( 'repeat(auto-fit, minmax(10rem, 1fr))' ) ).toBeNull();
		expect( templateCount( '' ) ).toBeNull();
	} );
} );

describe( 'tierColumns', () => {
	const columns = { desktop: 4, tablet: 3, mobile: 2 };

	it( 'follows the Columns count when no template is stored', () => {
		expect( [ 'desktop', 'tablet', 'mobile' ].map( ( t ) => tierColumns( { columns, gridTemplateColumns: {} }, t ) ) ).toEqual( [ 4, 3, 2 ] );
	} );

	it( "a device's own template wins, and a narrower device inherits the wider template", () => {
		const attrs = { columns, gridTemplateColumns: { desktop: 'repeat(5, 1fr)' } };
		expect( tierColumns( attrs, 'desktop' ) ).toBe( 5 );
		expect( tierColumns( attrs, 'tablet' ) ).toBe( 5 ); // inherits the wider template
		expect( tierColumns( { columns, gridTemplateColumns: { desktop: 'repeat(5, 1fr)', mobile: 'repeat(1, 1fr)' } }, 'mobile' ) ).toBe( 1 );
	} );

	it( 'a template it cannot count gives no count', () => {
		expect( tierColumns( { columns, gridTemplateColumns: { desktop: '2fr 1fr' } }, 'desktop' ) ).toBeNull();
	} );

	it( 'falls back to the wrapper defaults when a device stores no count', () => {
		expect( tierColumns( { columns: { desktop: 3 } }, 'mobile' ) ).toBe( 1 );
		expect( tierColumns( { columns: { desktop: 3 } }, 'tablet' ) ).toBe( 2 );
	} );
} );

describe( 'gridBadgeRules', () => {
	it( 'no separator at the end of a row or after the last badge', () => {
		const cells = [ 0, 1, 2, 3, 4 ].map( ( i ) => gridBadgeRules( i, 5, 4, false ).cell );
		expect( cells ).toEqual( [ true, true, true, false, false ] );
		expect( gridBadgeRules( 0, 3, null, false ).cell ).toBe( true );
	} );

	it( 'a lone last badge centres only when its row has one badge', () => {
		expect( gridBadgeRules( 4, 5, 4, true ).centre ).toBe( true );
		expect( gridBadgeRules( 4, 5, 3, true ).centre ).toBe( false );
		expect( gridBadgeRules( 4, 5, 4, false ).centre ).toBe( false );
		expect( gridBadgeRules( 0, 1, 4, true ).centre ).toBe( false );
		expect( gridBadgeRules( 4, 5, 1, true ).centre ).toBe( false );
	} );
} );

describe( 'columnGapPreview', () => {
	it( 'is the column part of the gap at the previewed device', () => {
		expect( columnGapPreview( { desktop: '20px 40px', mobile: '8px' }, 'desktop' ) ).toBe( '40px' );
		expect( columnGapPreview( { desktop: '20px 40px', mobile: '8px' }, 'mobile' ) ).toBe( '8px' );
		expect( columnGapPreview( undefined, 'desktop' ) ).toBe( '0px' );
	} );
} );

describe( 'badgeIcon', () => {
	it( 'picks the icon the way render.php does', () => {
		expect( badgeIcon( { icon: 'truck', iconSvg: '<svg/>' } ) ).toEqual( { iconSlug: 'truck', svg: '' } );
		expect( badgeIcon( { iconSvg: '<svg/>' } ) ).toEqual( { iconSlug: '', svg: '<svg/>' } );
		expect( badgeIcon( {} ) ).toEqual( { iconSlug: 'check', svg: '' } );
	} );

	it( 'draws the custom SVG when the item names no library icon', () => {
		const React = require( 'react' );
		const { EditorIconBare } = require( '../../src/blocks/trust-bar/edit-panels' );
		const element = EditorIconBare( { size: 20, ...badgeIcon( { iconSvg: '<svg/>' } ) } );
		const preview = React.Children.only( element.props.children );
		expect( preview.props.source ).toBe( 'custom' );
		expect( preview.props.svg ).toBe( '<svg/>' );
		const tick = EditorIconBare( { size: 20, ...badgeIcon( {} ) } );
		expect( React.Children.only( tick.props.children ).props.source ).toBe( 'lucide' );
	} );
} );
