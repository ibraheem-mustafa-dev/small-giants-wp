/**
 * Spec 49 §8, §9.4: the captions picker of a video device and the background SVG parts rows. Captions render, write
 * `Source.<device>.captions = {id,label,lang}`, Remove, gate on the device's own video and are keyboard reachable; the
 * SVG parts rows show only for a background whose kind is SVG at the device.
 */
const { h, click, setValue, mount, button } = require( './media-controls-harness' );

jest.mock( '../../src/components/SvgPartsControls.js', () => ( {
	__esModule: true,
	default: ( { names, label, defaultTrigger, hover } ) =>
		require( 'react' ).createElement( 'div', {
			'data-testid': 'svg-parts',
			'data-parts': names.parts,
			'data-trigger': names.trigger,
			'data-label': label,
			'data-default': defaultTrigger,
			'data-hover': String( hover ),
		} ),
} ) );

const MediaSlotCaptions = require( '../../src/components/media/MediaSlotCaptions' ).default;
const SvgPartsField = require( '../../src/components/media/panels/SvgPartsField' ).default;
const { buildPanelModel, unmappedComponents } = require( '../../src/components/media/panels/panel-model' );
const { COMPONENT_MAP } = require( '../../src/components/media/panels/component-map' );
const { ADOPTED_SETTINGS } = require( '../../src/components/media/emit/adopted-settings' );
const { resetPatch } = require( '../../src/components/media/panels/row-io' );

const VIDEO = { kind: 'video', id: 5, url: 'https://example.test/v.mp4', poster: { url: 'https://example.test/p.jpg' } };
const CAPTIONS = { id: 11, label: 'English', lang: 'en' };

function render( attributes, device = 'Desktop' ) {
	global.__device = device;
	const setAttributes = jest.fn();
	const view = mount( h( MediaSlotCaptions, { attributes, setAttributes, prefix: '' } ) );
	return { ...view, setAttributes };
}

describe( 'MediaSlotCaptions', () => {
	it( 'offers Add captions on a video with none, and writes {id,label,lang} on pick', () => {
		global.__picked = { id: 11, url: 'https://example.test/c.vtt' };
		const { container, setAttributes, unmount } = render( { source: { desktop: VIDEO } } );
		expect( container.querySelector( 'input' ) ).toBeNull();
		click( button( container, 'Add captions (.vtt)' ) );
		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( { source: { desktop: { ...VIDEO, captions: { id: 11, label: '', lang: '' } } } } );
		unmount();
	} );

	it( 'edits Label and Language, keeping the other fields', () => {
		const attrs = { source: { desktop: { ...VIDEO, captions: CAPTIONS } } };
		const { container, setAttributes, unmount } = render( attrs );
		const [ label, lang ] = [ ...container.querySelectorAll( 'input' ) ];
		expect( label.value ).toBe( 'English' );
		expect( lang.value ).toBe( 'en' );
		setValue( label, 'Welsh' );
		expect( setAttributes ).toHaveBeenLastCalledWith( { source: { desktop: { ...VIDEO, captions: { ...CAPTIONS, label: 'Welsh' } } } } );
		setValue( lang, 'cy' );
		expect( setAttributes ).toHaveBeenLastCalledWith( { source: { desktop: { ...VIDEO, captions: { ...CAPTIONS, lang: 'cy' } } } } );
		unmount();
	} );

	it( 'Replace keeps Label and Language', () => {
		global.__picked = { id: 12, url: 'https://example.test/d.vtt' };
		const { container, setAttributes, unmount } = render( { source: { desktop: { ...VIDEO, captions: CAPTIONS } } } );
		click( button( container, 'Replace captions (.vtt)' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { source: { desktop: { ...VIDEO, captions: { ...CAPTIONS, id: 12 } } } } );
		unmount();
	} );

	it( 'Remove drops captions and leaves the rest of the source', () => {
		const { container, setAttributes, unmount } = render( { source: { desktop: { ...VIDEO, captions: CAPTIONS } } } );
		click( button( container, 'Remove captions' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { source: { desktop: VIDEO } } );
		unmount();
	} );

	it( 'writes only the active device and says an inheriting device uses the wider video', () => {
		const inherit = render( { source: { desktop: { ...VIDEO, captions: CAPTIONS } } }, 'Mobile' );
		expect( inherit.container.textContent ).toContain( "This device uses Desktop's video." );
		expect( inherit.container.querySelector( 'button' ) ).toBeNull();
		inherit.unmount();
		const own = render( { source: { desktop: VIDEO, mobile: { ...VIDEO, id: 6 } } }, 'Mobile' );
		global.__picked = { id: 21, url: 'https://example.test/m.vtt' };
		click( button( own.container, 'Add captions (.vtt)' ) );
		expect( own.setAttributes ).toHaveBeenCalledWith( {
			source: { desktop: VIDEO, mobile: { ...VIDEO, id: 6, captions: { id: 21, label: '', lang: '' } } },
		} );
		own.unmount();
	} );

	it( 'renders nothing for an image or when no file is chosen', () => {
		const image = render( { source: { desktop: { kind: 'image', id: 1, url: 'https://example.test/a.jpg' } } } );
		expect( image.container.innerHTML ).toBe( '' );
		image.unmount();
		const none = render( {} );
		expect( none.container.innerHTML ).toBe( '' );
		none.unmount();
	} );

	it( 'is keyboard reachable: native buttons and labelled inputs, none removed from the tab order', () => {
		const { container, unmount } = render( { source: { desktop: { ...VIDEO, captions: CAPTIONS } } } );
		const controls = [ ...container.querySelectorAll( 'button, input' ) ];
		expect( controls ).toHaveLength( 4 );
		controls.forEach( ( c ) => expect( c.getAttribute( 'tabindex' ) ).toBeNull() );
		controls.filter( ( c ) => 'INPUT' === c.tagName ).forEach( ( c ) => expect( c.closest( 'label' ) ).not.toBeNull() );
		expect( container.querySelector( '[role="group"]' ).getAttribute( 'aria-label' ) ).toBe( 'Captions' );
		unmount();
	} );
} );

const ATOMS = [ 'source', 'video-behaviour', 'svg-presentation' ];
const model = ( kind, context, device = 'desktop' ) =>
	buildPanelModel( {
		atomIds: ATOMS,
		attrs: { source: { desktop: { kind, url: 'https://example.test/x' } } },
		device,
		prefix: '',
		opts: { kinds: [ 'image', 'video', 'svg' ], context },
		adopted: true,
	} );
const basesOf = ( panels ) => panels.flatMap( ( p ) => p.rows.map( ( r ) => r.setting.base ) );

describe( 'the adopted rows', () => {
	it( 'map to components', () => {
		expect( unmappedComponents( ATOMS, COMPONENT_MAP, true ) ).toEqual( [] );
	} );

	it( 'show Captions in the Video panel for a video only', () => {
		const panels = model( 'video', 'element' );
		expect( panels.find( ( p ) => 'video' === p.panel.id ).rows.map( ( r ) => r.setting.base ) ).toEqual( [ 'Playback', 'Captions' ] );
		[ 'image', 'svg' ].forEach( ( kind ) => expect( basesOf( model( kind, 'element' ) ) ).not.toContain( 'Captions' ) );
		expect( basesOf( model( 'video', 'background' ) ) ).toContain( 'Captions' );
	} );

	it( 'show the SVG parts rows only for an SVG background (one field serves both rows)', () => {
		expect( basesOf( model( 'svg', 'background' ) ) ).toContain( 'SvgParts' );
		expect( ADOPTED_SETTINGS[ 'svg-presentation' ].filter( ( s ) => 'SvgPartsField' === s.control.component ).map( ( s ) => s.base ) ).toEqual( [ 'SvgParts', 'SvgPartsTrigger' ] );
		expect( basesOf( model( 'svg', 'element' ) ) ).not.toContain( 'SvgParts' );
		[ 'image', 'video' ].forEach( ( kind ) => expect( basesOf( model( kind, 'background' ) ) ).not.toContain( 'SvgParts' ) );
	} );

	it( 'mount the SVG parts control once, reading the slot attributes', () => {
		const rows = model( 'svg', 'background' ).flatMap( ( p ) => p.rows ).filter( ( r ) => 'SvgPartsField' === r.setting.control.component );
		expect( rows ).toHaveLength( 1 );
		const { container, unmount } = mount( h( SvgPartsField, { attributes: {}, setAttributes: jest.fn(), prefix: 'bg' } ) );
		const node = container.querySelector( '[data-testid="svg-parts"]' );
		expect( node.dataset.parts ).toBe( 'bgSvgParts' );
		expect( node.dataset.trigger ).toBe( 'bgSvgPartsTrigger' );
		expect( node.dataset.default ).toBe( 'load' );
		expect( node.dataset.hover ).toBe( 'false' );
		unmount();
	} );

	it( 'a panel reset writes no attribute of its own for Captions', () => {
		const rows = model( 'video', 'element' ).find( ( p ) => 'video' === p.panel.id ).rows;
		const patch = resetPatch( rows, { source: { desktop: VIDEO } }, 'desktop', '', '' );
		expect( Object.keys( patch ) ).not.toContain( 'captions' );
	} );
} );
