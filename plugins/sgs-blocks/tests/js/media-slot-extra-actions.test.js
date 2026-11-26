/**
 * `MediaSlotField` extra actions (W1, for a block's own picker buttons such as "Trim empty edges"): the render prop,
 * from `extraActions` or `slot.extraActions`, draws beside Replace and Remove once the device holds a file, receives
 * the slot's context, and draws nothing on an empty slot.
 */
const { h, mount } = require( './media-controls-harness' );
const MediaSlotField = require( '../../src/components/media/MediaSlotField' ).default;

const PHOTO = { kind: 'image', id: 7, url: 'https://example.test/a.jpg' };

function render( attributes, props = {} ) {
	global.__device = 'Desktop';
	return mount(
		h( MediaSlotField, {
			attributes,
			setAttributes: jest.fn(),
			prefix: '',
			slot: { kinds: [ 'image' ], context: 'element' },
			...props,
		} )
	);
}

const extra = ( ctx ) =>
	h( 'button', { type: 'button', className: 'extra', 'data-kind': ctx.kind, 'data-url': ctx.own.url }, 'Trim' );

describe( 'MediaSlotField extra actions', () => {
	it( "draws the prop's buttons in the actions row, with the slot context", () => {
		const { container, unmount } = render( { source: { desktop: PHOTO } }, { extraActions: extra } );
		const button = container.querySelector( '.sgs-media-slot__actions .extra' );
		expect( button ).not.toBeNull();
		expect( button.getAttribute( 'data-kind' ) ).toBe( 'image' );
		expect( button.getAttribute( 'data-url' ) ).toBe( PHOTO.url );
		unmount();
	} );

	it( 'takes the render prop from slot.extraActions too', () => {
		const { container, unmount } = render(
			{ source: { desktop: PHOTO } },
			{ slot: { kinds: [ 'image' ], context: 'element', extraActions: extra } }
		);
		expect( container.querySelector( '.sgs-media-slot__actions .extra' ) ).not.toBeNull();
		unmount();
	} );

	it( 'draws nothing before a file is chosen, and nothing when no render prop is given', () => {
		const empty = render( {}, { extraActions: extra } );
		expect( empty.container.querySelector( '.extra' ) ).toBeNull();
		empty.unmount();
		const plain = render( { source: { desktop: PHOTO } } );
		expect( plain.container.querySelector( '.extra' ) ).toBeNull();
		plain.unmount();
	} );
} );
