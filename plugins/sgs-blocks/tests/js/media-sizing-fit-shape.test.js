/**
 * Spec 49 §9.2 sizing, Fit and Shape fields: ratio chips merged with the theme's, Width and Height with Match its
 * space, the limits group, the one-line summary, Fit options per kind, and Shape's one-undo-step Circle write.
 */
const { h, mount, click, keydown, setValue, byRole, button } = require( './media-controls-harness' );
const {
	AspectRatioField,
	WidthField,
	HeightField,
	LimitsGroup,
	SizingSummary,
} = require( '../../src/components/media/SizingFields' );
const FitField = require( '../../src/components/media/FitField' ).default;
const ShapeField = require( '../../src/components/media/ShapeField' ).default;
const { describeSizing, ratioOptions } = require( '../../src/components/media/sizing' );

const SLOT = { kinds: [ 'image' ], context: 'element' };

function render( Field, attributes = {}, extra = {}, device = 'Desktop' ) {
	global.__device = device;
	global.__ratios = extra.ratios;
	const setAttributes = jest.fn();
	const view = mount( h( Field, { attributes, setAttributes, prefix: '', slot: SLOT, ...extra.props } ) );
	return { ...view, setAttributes };
}

const chipLabels = ( container ) => byRole( container, 'radio' ).map( ( r ) => r.textContent.replace( '✓', '' ).trim() );
const chip = ( container, text ) => byRole( container, 'radio' ).find( ( r ) => r.textContent.replace( '✓', '' ).trim() === text );

describe( 'Aspect ratio chips', () => {
	it( 'offers the built-in list and merges the theme ratios', () => {
		const { container, unmount } = render( AspectRatioField, {}, { ratios: [ { ratio: '5/2', name: 'Cinema' }, { ratio: '16/9', name: 'Dup' } ] } );
		expect( chipLabels( container ) ).toEqual( [ "Photo's own", '1:1', '4:3', '3:2', '16:9', '4:5', '3:4', '9:16', '21:9', 'Cinema', 'Custom' ] );
		unmount();
	} );

	it( 'offers an embed 16:9, 4:3, 21:9 and 9:16 only', () => {
		expect( ratioOptions( [ { ratio: '5/2', name: 'Cinema' } ], 'embed' ).map( ( o ) => o.value ) ).toEqual( [ '16 / 9', '4 / 3', '21 / 9', '9 / 16' ] );
	} );

	it( 'writes only the active device', () => {
		const desktop = render( AspectRatioField, {} );
		click( chip( desktop.container, '1:1' ) );
		expect( desktop.setAttributes ).toHaveBeenCalledWith( { ratio: { desktop: '1 / 1' } } );
		desktop.unmount();
		const tablet = render( AspectRatioField, { ratio: { desktop: '16 / 9' } }, {}, 'Tablet' );
		click( chip( tablet.container, '4:3' ) );
		expect( tablet.setAttributes ).toHaveBeenCalledWith( { ratio: { desktop: '16 / 9', tablet: '4 / 3' } } );
		tablet.unmount();
	} );

	it( 'says why when Width and Height are both set, and keeps the value', () => {
		const { container, setAttributes, unmount } = render( AspectRatioField, { ratio: { desktop: '1 / 1' }, width: { desktop: '300px' }, height: { desktop: '200px' } } );
		expect( container.textContent ).toContain( 'Not used while Width and Height are both set.' );
		expect( setAttributes ).not.toHaveBeenCalled();
		unmount();
	} );

	it( 'is omitted while Height is Match its space', () => {
		const { container, unmount } = render( AspectRatioField, { height: { desktop: 'fill' } } );
		expect( container.querySelector( '[role="radiogroup"]' ) ).toBeNull();
		unmount();
	} );

	it( 'Custom opens two boxes that write w / h', () => {
		const { container, setAttributes, unmount } = render( AspectRatioField, {} );
		click( chip( container, 'Custom' ) );
		const [ w, hh ] = [ ...container.querySelectorAll( '.sgs-media-ratio-custom input' ) ];
		setValue( w, '7' );
		setValue( hh, '3' );
		expect( setAttributes ).toHaveBeenLastCalledWith( { ratio: { desktop: '7 / 3' } } );
		unmount();
	} );
} );

describe( 'Width, Height and limits', () => {
	it( 'Width has Auto and a length; Auto writes the keyword at the device', () => {
		const { container, setAttributes, unmount } = render( WidthField, { width: { desktop: '400px' } }, {}, 'Mobile' );
		click( button( container, 'Auto' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { width: { desktop: '400px', mobile: 'auto' } } );
		unmount();
	} );

	it( 'Height offers Match its space with its help line, and hides the length while it is on', () => {
		const { container, setAttributes, unmount } = render( HeightField, { height: { desktop: 'fill' } } );
		expect( container.textContent ).toContain( 'Makes the photo as tall as the space around it, such as a card stretched by the text beside it.' );
		expect( container.querySelector( '[data-testid="length"]' ) ).toBeNull();
		click( button( container, 'Match its space' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { height: {} } );
		unmount();
	} );

	it( 'Height with Width and Ratio empty explains the crop and offers Keep the photo\'s shape', () => {
		const { container, setAttributes, unmount } = render( HeightField, { height: { desktop: '300px' } } );
		expect( container.textContent ).toContain( 'The photo is full width and cropped to this height.' );
		click( button( container, "Keep the photo's shape" ) );
		expect( setAttributes ).toHaveBeenCalledWith( { width: { desktop: 'auto' } } );
		unmount();
	} );

	it( 'shows an inherited length as a placeholder off Desktop', () => {
		const { container, unmount } = render( WidthField, { width: { desktop: '400px' } }, {}, 'Tablet' );
		expect( container.querySelector( '[data-testid="length"]' ).placeholder ).toBe( '400px' );
		unmount();
	} );

	it( 'the limits group is collapsed and holds the four limits with None', () => {
		const { container, unmount } = render( LimitsGroup );
		const details = container.querySelector( 'details' );
		expect( details.open ).toBe( false );
		expect( details.querySelector( 'summary' ).textContent ).toBe( 'Smallest and largest size' );
		expect( [ ...details.querySelectorAll( '.sgs-responsive-override__label' ) ].map( ( n ) => n.textContent ) ).toEqual( [ 'Min width', 'Max width', 'Min height', 'Max height' ] );
		expect( button( container, 'None' ) ).toBeDefined();
		unmount();
	} );
} );

describe( 'Sizing summary', () => {
	it( 'states the result at the active device', () => {
		const { container, unmount } = render( SizingSummary, { ratio: { desktop: '1 / 1' } }, {}, 'Mobile' );
		expect( container.querySelector( '.sgs-media-summary' ).textContent ).toBe( 'Mobile: full width, square (1:1), cropped to fill' );
		unmount();
	} );

	it( 'covers the rows of the sizing table', () => {
		expect( describeSizing( 'desktop', { ratio: '', width: '', height: '', fit: '' } ) ).toBe( "Desktop: the photo's own size" );
		expect( describeSizing( 'desktop', { ratio: '1 / 1', width: '', height: '300px', fit: '' } ) ).toBe( 'Desktop: width follows the height, 300px tall, square (1:1), cropped to fill' );
		expect( describeSizing( 'tablet', { ratio: '', width: '', height: 'fill', fit: '' } ) ).toBe( 'Tablet: full width, as tall as its space, cropped to fill' );
		expect( describeSizing( 'desktop', { ratio: '16 / 9', width: '320px', height: '', fit: 'contain' } ) ).toBe( 'Desktop: 320px wide, ratio 16:9, showing all of the photo' );
	} );
} );

describe( 'FitField', () => {
	it( 'offers each kind its options', () => {
		const image = render( FitField, {} );
		expect( chipLabels( image.container ) ).toEqual( [ 'Crop to fill', 'Show all', 'Stretch', 'Actual size', 'Never enlarge' ] );
		image.unmount();
		const svg = render( FitField, {}, { props: { slot: { kinds: [ 'svg' ], context: 'element' } } } );
		expect( chipLabels( svg.container ) ).toEqual( [ 'Crop to fill', 'Show all' ] );
		svg.unmount();
		const embed = render( FitField, {}, { props: { slot: { kinds: [ 'embed' ], context: 'element' } } } );
		expect( embed.container.querySelector( '[role="radiogroup"]' ) ).toBeNull();
		embed.unmount();
		const background = render( FitField, {}, { props: { slot: { kinds: [ 'image' ], context: 'background' } } } );
		expect( chipLabels( background.container ) ).toContain( 'Tile' );
		background.unmount();
	} );

	it( 'selects Crop to fill by default and writes the chosen device only', () => {
		const { container, setAttributes, unmount } = render( FitField, { fit: { desktop: 'cover' } }, {}, 'Mobile' );
		expect( chip( container, 'Crop to fill' ).getAttribute( 'aria-checked' ) ).toBe( 'true' );
		click( chip( container, 'Show all' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { fit: { desktop: 'cover', mobile: 'contain' } } );
		unmount();
	} );
} );

describe( 'ShapeField', () => {
	it( 'draws a grid of shapes, labelled Shape, with the photo in each', () => {
		const { container, unmount } = render( ShapeField, { source: { desktop: { kind: 'image', url: 'https://example.test/p.jpg' } } } );
		expect( container.querySelector( '.sgs-responsive-override__label' ).textContent ).toBe( 'Shape' );
		expect( chipLabels( container ).slice( 0, 4 ) ).toEqual( [ 'None', 'Circle', 'Ellipse', 'Pill' ] );
		expect( container.querySelector( '.sgs-shape-tile' ).getAttribute( 'style' ) ).toContain( 'p.jpg' );
		unmount();
	} );

	it( 'Circle writes Shape and Ratio 1:1 in one setAttributes call (one undo step) when no Ratio is set', () => {
		const { container, setAttributes, unmount } = render( ShapeField, {} );
		click( chip( container, 'Circle' ) );
		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( { shape: { desktop: { shape: 'circle' } }, ratio: { desktop: '1 / 1' } } );
		unmount();
	} );

	it( 'Circle leaves an existing Ratio alone', () => {
		const { container, setAttributes, unmount } = render( ShapeField, { ratio: { desktop: '16 / 9' } } );
		click( chip( container, 'Circle' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { shape: { desktop: { shape: 'circle' } } } );
		unmount();
	} );

	it( 'says it is an oval when the box is not square, and Make it square writes 1:1 at the device', () => {
		const { container, setAttributes, unmount } = render( ShapeField, { shape: { desktop: { shape: 'circle' } }, ratio: { desktop: '16 / 9' } } );
		expect( container.textContent ).toContain( 'This is an oval because the photo area is not square.' );
		click( button( container, 'Make it square (1:1)' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { ratio: { desktop: '1 / 1' } } );
		unmount();
	} );

	it( 'None clears at Desktop and cancels an inherited shape off Desktop', () => {
		const desktop = render( ShapeField, { shape: { desktop: { shape: 'pill' } } } );
		click( chip( desktop.container, 'None' ) );
		expect( desktop.setAttributes ).toHaveBeenCalledWith( { shape: {} } );
		desktop.unmount();
		const mobile = render( ShapeField, { shape: { desktop: { shape: 'pill' } } }, {}, 'Mobile' );
		click( chip( mobile.container, 'None' ) );
		expect( mobile.setAttributes ).toHaveBeenCalledWith( { shape: { desktop: { shape: 'pill' }, mobile: { shape: 'none' } } } );
		mobile.unmount();
	} );

	it( 'an embed offers Circle, Ellipse and Pill only', () => {
		const { container, unmount } = render( ShapeField, {}, { props: { slot: { kinds: [ 'embed' ], context: 'element' } } } );
		expect( chipLabels( container ) ).toEqual( [ 'None', 'Circle', 'Ellipse', 'Pill' ] );
		unmount();
	} );

	it( 'arrow keys rove focus across the grid', () => {
		const { container, unmount } = render( ShapeField, {} );
		const radios = byRole( container, 'radio' );
		radios[ 0 ].focus();
		keydown( radios[ 0 ], 'ArrowRight' );
		expect( document.activeElement ).toBe( radios[ 1 ] );
		unmount();
	} );
} );
