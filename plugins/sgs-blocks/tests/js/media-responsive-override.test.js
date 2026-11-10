/**
 * ResponsiveOverride display (Spec 49 §9.2, AC-14): the inherited value names its true source, dots mark devices
 * with their own value, Reset names its source, global settings say so, the device is in each accessible name, and
 * the stored values and the render-prop contract existing callers use are unchanged.
 */
const { h, mount, click, byRole, button } = require( './media-controls-harness' );
const ResponsiveOverride = require( '../../src/components/ResponsiveOverride' ).default;

function render( device, value, props = {} ) {
	global.__device = device;
	const onChange = jest.fn();
	const seen = [];
	const view = mount(
		h( ResponsiveOverride, { label: 'Gap', value, onChange, ...props }, ( api ) => {
			seen.push( api );
			return h( 'span', { 'data-testid': 'field' }, String( api.ownValue ) );
		} )
	);
	return { ...view, onChange, seen, last: () => seen[ seen.length - 1 ] };
}

describe( 'ResponsiveOverride display', () => {
	it( 'says nothing about inheritance on Desktop', () => {
		const { container, unmount } = render( 'Desktop', { desktop: '10px' } );
		expect( container.querySelector( '.sgs-responsive-override__inherited' ) ).toBeNull();
		unmount();
	} );

	it( 'names the true source: Tablet inherits Desktop; Mobile inherits Tablet when Tablet has its own', () => {
		const tablet = render( 'Tablet', { desktop: '10px' } );
		expect( tablet.container.textContent ).toContain( 'Tablet: using Desktop' );
		tablet.unmount();
		const mobile = render( 'Mobile', { desktop: '10px', tablet: '8px' } );
		expect( mobile.container.textContent ).toContain( 'Mobile: using Tablet' );
		mobile.unmount();
		const skipped = render( 'Mobile', { desktop: '10px' } );
		expect( skipped.container.textContent ).toContain( 'Mobile: using Desktop' );
		skipped.unmount();
	} );

	it( 'says "default" when no device holds a value', () => {
		const { container, last, unmount } = render( 'Mobile', {} );
		expect( container.textContent ).toContain( 'Mobile: default' );
		expect( last().sourceTier ).toBeNull();
		unmount();
	} );

	it( 'passes the inherited value as a placeholder and the holding tier to the field', () => {
		const { last, unmount } = render( 'Mobile', { desktop: '10px', tablet: '8px' } );
		expect( last() ).toMatchObject( { inherited: true, placeholder: '8px', sourceTier: 'tablet', ownValue: '', effectiveValue: '8px' } );
		unmount();
	} );

	it( 'names what is inherited when the caller says so', () => {
		const { container, unmount } = render( 'Mobile', { desktop: { kind: 'video' } }, { inheritedNoun: 'video' } );
		expect( container.textContent ).toContain( "Mobile: using Desktop's video" );
		unmount();
	} );

	it( 'marks Tablet and Mobile with a named shape when they hold their own value', () => {
		const { container, unmount } = render( 'Desktop', { desktop: '10px', tablet: '8px', mobile: '6px' } );
		const dots = byRole( container, 'img' );
		expect( dots.map( ( d ) => d.getAttribute( 'aria-label' ) ) ).toEqual( [ 'Tablet has its own value for Gap', 'Mobile has its own value for Gap' ] );
		expect( dots[ 0 ].className ).toContain( '--tablet' );
		expect( dots[ 1 ].className ).toContain( '--mobile' );
		unmount();
		const none = render( 'Desktop', { desktop: '10px' } );
		expect( byRole( none.container, 'img' ) ).toHaveLength( 0 );
		none.unmount();
	} );

	it( 'Reset names the tier it falls back to and the device, and clears only that device', () => {
		const { container, onChange, unmount } = render( 'Mobile', { desktop: '10px', tablet: '8px', mobile: '6px' } );
		const reset = button( container, 'Reset to Tablet' );
		expect( reset.getAttribute( 'aria-label' ) ).toBe( 'Reset to Tablet (Mobile Gap)' );
		click( reset );
		expect( onChange ).toHaveBeenCalledWith( { desktop: '10px', tablet: '8px' } );
		unmount();
		const toDesktop = render( 'Mobile', { desktop: '10px', mobile: '6px' } );
		expect( button( toDesktop.container, 'Reset to Desktop' ) ).toBeDefined();
		toDesktop.unmount();
	} );

	it( 'offers no Reset on Desktop unless asked, and then says "Reset to default"', () => {
		const plain = render( 'Desktop', { desktop: '10px' } );
		expect( plain.container.querySelector( 'button' ) ).toBeNull();
		plain.unmount();
		const asked = render( 'Desktop', { desktop: '10px' }, { desktopReset: true } );
		click( button( asked.container, 'Reset to default' ) );
		expect( asked.onChange ).toHaveBeenCalledWith( {} );
		asked.unmount();
	} );

	it( 'a global setting says "Applies to all devices" off Desktop only, and stores a plain value', () => {
		const tablet = render( 'Tablet', 'solid', { global: true } );
		expect( tablet.container.textContent ).toContain( 'Applies to all devices' );
		expect( tablet.last() ).toMatchObject( { ownValue: 'solid', inherited: false } );
		tablet.last().setOwnValue( 'dashed' );
		expect( tablet.onChange ).toHaveBeenCalledWith( 'dashed' );
		tablet.unmount();
		const desktop = render( 'Desktop', 'solid', { global: true } );
		expect( desktop.container.textContent ).not.toContain( 'Applies to all devices' );
		desktop.unmount();
	} );

	it( 'keeps the render-prop contract and writes only the active tier, in canonical order', () => {
		const { last, onChange, unmount } = render( 'Tablet', { desktop: '10px', mobile: '4px' } );
		expect( Object.keys( last() ).sort() ).toEqual(
			[ 'effectiveValue', 'inherited', 'ownValue', 'placeholder', 'resetTier', 'setOwnValue', 'sourceTier', 'tier' ].sort()
		);
		last().setOwnValue( '8px' );
		expect( onChange ).toHaveBeenCalledWith( { desktop: '10px', tablet: '8px', mobile: '4px' } );
		expect( Object.keys( onChange.mock.calls[ 0 ][ 0 ] ) ).toEqual( [ 'desktop', 'tablet', 'mobile' ] );
		unmount();
	} );
} );
