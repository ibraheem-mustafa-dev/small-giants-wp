/**
 * The device markers sit on the label's row (Stage E1, W1): where a mount passes a label, `ResponsiveOverride` draws it
 * with the markers beside it and hides the same label an inner control draws; a mount without a label is left as it
 * was; a label that is not a duplicate, or that wraps a form control, is never hidden.
 */
const { h, mount } = require( './media-controls-harness' );
const ResponsiveOverride = require( '../../src/components/ResponsiveOverride' ).default;
const {
	DUPLICATE_LABEL_CLASS,
	markDuplicateLabels,
} = require( '../../src/components/hideDuplicateLabels' );

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function field( children ) {
	return () => h( 'div', null, children );
}

describe( 'markDuplicateLabels', () => {
	const dom = ( html ) => {
		const root = document.createElement( 'div' );
		root.innerHTML = html;
		return root;
	};

	it( 'marks a label whose text equals the override label, ignoring case and spacing', () => {
		const root = dom( '<label class="components-input-control__label">  GAP  between </label><label>Other</label>' );
		expect( markDuplicateLabels( root, 'Gap between' ) ).toBe( 1 );
		expect( root.querySelectorAll( '.' + DUPLICATE_LABEL_CLASS ) ).toHaveLength( 1 );
	} );

	it( 'leaves a label with other text, and never hides a label that wraps a form control', () => {
		const root = dom( '<label>Gap<input type="checkbox"></label><span class="components-base-control__label">Gap sizes</span>' );
		expect( markDuplicateLabels( root, 'Gap' ) ).toBe( 0 );
		expect( root.querySelector( '.' + DUPLICATE_LABEL_CLASS ) ).toBeNull();
	} );

	it( 'marks a span whose class names a __label part, as a corner field draws its label', () => {
		const root = dom( '<span class="sgs-media-corners__label">Corners</span>' );
		expect( markDuplicateLabels( root, 'Corners' ) ).toBe( 1 );
	} );

	it( 'does nothing without a label to compare', () => {
		const root = dom( '<label>Gap</label>' );
		expect( markDuplicateLabels( root, '' ) ).toBe( 0 );
		expect( root.querySelector( '.' + DUPLICATE_LABEL_CLASS ) ).toBeNull();
	} );
} );

describe( 'ResponsiveOverride with a label', () => {
	it( 'draws the label and the markers on one header row and hides the inner control\'s repeat of it', () => {
		const { container, unmount } = mount(
			h(
				ResponsiveOverride,
				{ label: 'Gap', value: { desktop: '10px', tablet: '8px' }, onChange: jest.fn() },
				field( h( 'label', { className: 'components-base-control__label' }, 'Gap' ) )
			)
		);
		const header = container.querySelector( '.sgs-responsive-override__header' );
		expect( header.querySelector( '.sgs-responsive-override__label' ).textContent ).toBe( 'Gap' );
		expect( header.querySelectorAll( '.sgs-responsive-override__dot' ) ).toHaveLength( 1 );
		expect( container.querySelector( '.sgs-responsive-override' ).className ).toContain( '--labelled' );
		const inner = container.querySelector( '.sgs-responsive-override__field label' );
		expect( inner.classList.contains( DUPLICATE_LABEL_CLASS ) ).toBe( true );
		unmount();
	} );

	it( 'hides a repeat that mounts later, as a lazy field does', async () => {
		const { container, unmount } = mount(
			h(
				ResponsiveOverride,
				{ label: 'Gap', value: { desktop: '10px' }, onChange: jest.fn() },
				field( h( 'div', { id: 'slot' } ) )
			)
		);
		const late = document.createElement( 'label' );
		late.textContent = 'Gap';
		container.querySelector( '#slot' ).appendChild( late );
		await flush();
		expect( late.classList.contains( DUPLICATE_LABEL_CLASS ) ).toBe( true );
		unmount();
	} );

	it( 'leaves a labelled mount\'s different inner label alone', () => {
		const { container, unmount } = mount(
			h(
				ResponsiveOverride,
				{ label: 'Gap', value: { desktop: '10px' }, onChange: jest.fn() },
				field( h( 'label', null, 'Row gap' ) )
			)
		);
		expect( container.querySelector( '.' + DUPLICATE_LABEL_CLASS ) ).toBeNull();
		unmount();
	} );

	it( 'keeps a label-less mount as it was: no label span, no --labelled class, nothing hidden', () => {
		const { container, unmount } = mount(
			h(
				ResponsiveOverride,
				{ value: { desktop: '10px', mobile: '6px' }, onChange: jest.fn() },
				field( h( 'label', null, 'Gap' ) )
			)
		);
		expect( container.querySelector( '.sgs-responsive-override__label' ) ).toBeNull();
		expect( container.querySelector( '.sgs-responsive-override' ).className ).not.toContain( '--labelled' );
		expect( container.querySelector( '.' + DUPLICATE_LABEL_CLASS ) ).toBeNull();
		expect( container.querySelectorAll( '.sgs-responsive-override__dot' ) ).toHaveLength( 1 );
		unmount();
	} );
} );
