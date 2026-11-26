/**
 * The trust bar's real Edit component renders (and draws its badges) in every badge style and layout, with and without a
 * separator glyph.
 *
 * Why this exists: edit.js read `separatorGlyph` and `separatorInCell` in the `useBlockProps` call, above the `const`
 * lines that define them, so the block showed "This block has encountered an error" in the editor
 * (`ReferenceError: Cannot access ... before initialization`). Nothing that ran before opened the block in a browser or
 * rendered it, so every gate and unit test passed. This test renders it; the second test is the cheap static twin.
 *
 * Guards (each broken in turn and seen to fail): moving the separator constants back below `blockProps` fails both tests.
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const fs = require( 'fs' );
const path = require( 'path' );

// The shared media panels load lazily; a chunk landing mid-test is not what this test is about.
jest.mock( '../../src/components/media/panels/MediaPanels.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );

const Edit = require( '../../src/blocks/trust-bar/edit' ).default;

const ITEMS = [ 'Fast delivery', 'Certified quality', 'Trusted service' ].map(
	( label, i ) => ( {
		icon: [ 'truck', 'check', 'star' ][ i ],
		label,
		_key: 'k' + i,
	} )
);

function mount( attributes ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => {
		root.render(
			React.createElement( Edit, {
				clientId: 'c1',
				isSelected: false,
				name: 'sgs/trust-bar',
				attributes: {
					items: ITEMS,
					overflowMode: 'wrap',
					badgeSize: 'medium',
					iconCircleSize: 44,
					iconBareSize: 20,
					iconStrokeWidth: 1.8,
					gap: { desktop: '20px' },
					columns: { desktop: 4, tablet: 3, mobile: 2 },
					...attributes,
				},
				setAttributes: jest.fn(),
			} )
		);
	} );
	return { container, unmount: () => act( () => root.unmount() ) };
}

describe( 'sgs/trust-bar edit.js', () => {
	// Other shared panels load lazily; let them settle inside act() so a late load does not land in the first test.
	beforeAll( async () => {
		const warm = mount( {} );
		await act( async () => {
			await new Promise( ( resolve ) => setTimeout( resolve, 1500 ) );
		} );
		warm.unmount();
	} );

	const cases = [];
	for ( const badgeStyle of [
		'icon-circle',
		'icon-bare',
		'text-only',
		'image-badge',
	] ) {
		for ( const layout of [ '', 'stack', 'flex', 'grid' ] ) {
			for ( const textBadgeSeparator of [ '', '*' ] ) {
				cases.push( [
					badgeStyle,
					layout || 'default',
					textBadgeSeparator || 'none',
					{ badgeStyle, layout, textBadgeSeparator },
				] );
			}
		}
	}

	it.each( cases )(
		'renders its badges: %s, %s layout, separator %s',
		( _style, _layout, _sep, attributes ) => {
			const { container, unmount } = mount( attributes );
			expect(
				container.querySelectorAll( '.sgs-trust-bar__badge' ).length
			).toBe( ITEMS.length );
			unmount();
		}
	);

	it( 'draws a separator after each badge of a row and inside each badge of a grid', () => {
		const row = mount( {
			badgeStyle: 'icon-circle',
			layout: 'flex',
			textBadgeSeparator: '*',
		} );
		expect(
			row.container.querySelectorAll(
				'.sgs-trust-bar__separator:not(.sgs-trust-bar__separator--cell)'
			).length
		).toBe( ITEMS.length );
		row.unmount();

		const grid = mount( {
			badgeStyle: 'icon-circle',
			layout: 'grid',
			textBadgeSeparator: '*',
		} );
		// Rows of four hold all three badges, so only the last badge has no glyph.
		expect(
			grid.container.querySelectorAll(
				'.sgs-trust-bar__badge > .sgs-trust-bar__separator--cell'
			).length
		).toBe( ITEMS.length - 1 );
		grid.unmount();
	} );

	it( 'defines every value before the block props that read it (the cause of the editor crash)', () => {
		const source = fs.readFileSync(
			path.join( __dirname, '../../src/blocks/trust-bar/edit.js' ),
			'utf8'
		);
		const props = source.indexOf( 'const blockProps = useBlockProps(' );
		expect( props ).toBeGreaterThan( 0 );
		const propsBody = source.slice(
			props,
			source.indexOf( 'const svgLayer', props )
		);
		for ( const name of [ 'separatorGlyph', 'separatorInCell' ] ) {
			expect( source.indexOf( `const ${ name } ` ) ).toBeGreaterThan( 0 );
			if ( propsBody.includes( name ) ) {
				expect( source.indexOf( `const ${ name } ` ) ).toBeLessThan(
					props
				);
			}
		}
	} );
} );
