/**
 * Spec 49 §9.1, §9.4: panel grouping on an adopted fixture slot, the one
 * component map, and Reset as one write.
 */
import fixture from '../fixtures/media/adopted-block.json';
import { mediaStoredAttrName } from '../../src/components/MediaElementControls.js';
import { MEDIA_ATOMS } from '../../src/components/media/atoms/registry.js';
import { COMPONENT_MAP } from '../../src/components/media/panels/component-map.js';
import { COMPOSITES, PANELS, buildPanelModel, unmappedComponents } from '../../src/components/media/panels/panel-model.js';
import { resetPatch, rowIO } from '../../src/components/media/panels/row-io.js';

const slot = fixture.supports.sgs.mediaElements[ 0 ];
const slug = fixture.name;
const key = ( base ) => mediaStoredAttrName( slug, slot.prefix, base );
const ALL_ATOMS = Object.keys( MEDIA_ATOMS );

const model = ( attrs, device = 'desktop', extra = {} ) =>
	buildPanelModel( {
		atomIds: slot.atoms,
		attrs,
		device,
		prefix: slot.prefix,
		opts: { blockSlug: slug, kinds: slot.kinds, context: slot.context, ...extra },
	} );
const bases = ( entry ) => entry.rows.map( ( r ) => r.setting.base );

describe( 'the adopted fixture slot', () => {
	it( 'declares kinds, so it takes the panel path', () => {
		expect( slot.kinds ).toEqual( [ 'image' ] );
		expect( slot.atoms ).toEqual( [ 'object-fit', 'focal-point', 'overlay' ] );
	} );

	it( 'groups rows by control.panel: Size and crop and Overlay and filters, Size and crop first', () => {
		const panels = model( {} );
		expect( panels.map( ( p ) => p.panel.id ) ).toEqual( [ 'size-and-crop', 'overlay-and-filters' ] );
		expect( bases( panels[ 0 ] ) ).toEqual( [ 'ObjectFit', 'ObjectPosition' ] );
		expect( bases( panels[ 1 ] ) ).toEqual( [ 'OverlayColour', 'OverlayOpacity', 'OverlayBlendMode' ] );
	} );

	it( 'absorbs the overlay gradient and hover forms into the one colour row', () => {
		const rows = bases( model( {} )[ 1 ] );
		COMPOSITES.OverlayColour.forEach( ( member ) => expect( rows ).not.toContain( member ) );
	} );

	it( 'orders rows by control.order', () => {
		const orders = model( {} )[ 0 ].rows.map( ( r ) => r.setting.control.order );
		expect( orders ).toEqual( [ ...orders ].sort( ( a, b ) => a - b ) );
	} );

	it( 'keeps Fit and Focal as disabled hints until the box crops, then enables them', () => {
		const before = model( {} )[ 0 ].rows.map( ( r ) => r.state.state );
		expect( before ).toEqual( [ 'disabled', 'disabled' ] );
		const after = model( { [ key( 'AspectRatio' ) ]: '1 / 1' } )[ 0 ].rows.map( ( r ) => r.state.state );
		expect( after ).toEqual( [ 'shown', 'shown' ] );
	} );

	it( 'follows the active device', () => {
		const attrs = { [ key( 'AspectRatio' ) + 'Mobile' ]: '1 / 1' };
		const mobile = model( attrs, 'mobile' )[ 0 ].rows.map( ( r ) => r.state.state );
		expect( mobile ).toEqual( [ 'shown', 'shown' ] );
	} );
} );

describe( 'panel definitions', () => {
	it( 'matches §9.4: three Settings panels, ten Styles panels, Media and Size and crop open', () => {
		expect( PANELS.filter( ( p ) => 'settings' === p.group ).map( ( p ) => p.id ) ).toEqual( [ 'media', 'caption-and-link', 'video' ] );
		expect( PANELS.filter( ( p ) => 'styles' === p.group ).map( ( p ) => p.id ) ).toEqual( [
			'size-and-crop', 'position-in-layout', 'border-and-shape', 'shadow', 'overlay-and-filters',
			'typography', 'svg', 'hover', 'entrance-and-reveal', 'effects',
		] );
		expect( PANELS.filter( ( p ) => p.open ).map( ( p ) => p.id ) ).toEqual( [ 'media', 'size-and-crop' ] );
	} );

	it( 'shows a caller-filled panel with no atom rows', () => {
		const panels = buildPanelModel( { atomIds: [], attrs: {}, device: 'desktop', opts: {}, extraPanelIds: [ 'effects' ] } );
		expect( panels.map( ( p ) => p.panel.id ) ).toEqual( [ 'effects' ] );
	} );

	it( 'mounts one Background panel in a background context, holding no Size, Border, Shadow, Padding, Caption or Link', () => {
		const panels = buildPanelModel( {
			atomIds: ALL_ATOMS,
			attrs: {},
			device: 'desktop',
			prefix: '',
			opts: { kinds: [ 'image', 'video' ], context: 'background' },
		} );
		expect( panels ).toHaveLength( 1 );
		expect( panels[ 0 ].panel.id ).toBe( 'background' );
		const rows = bases( panels[ 0 ] );
		[ 'Width', 'Height', 'AspectRatio', 'BorderWidth', 'BorderRadius', 'BoxShadow', 'Padding', 'Shape', 'Caption', 'LinkUrl' ].forEach( ( b ) => expect( rows ).not.toContain( b ) );
		[ 'ImageUrl', 'Size', 'Position', 'Attachment', 'OverlayColour', 'Opacity' ].forEach( ( b ) => expect( rows ).toContain( b ) );
	} );

	it( 'omits a mask shape\'s Corners and Border from the Border and shape panel', () => {
		const panels = buildPanelModel( {
			atomIds: ALL_ATOMS,
			attrs: { shape: 'hexagon', borderWidth: { top: '2px' } },
			device: 'desktop',
			opts: { kinds: [ 'image' ] },
		} );
		const rows = bases( panels.find( ( p ) => 'border-and-shape' === p.panel.id ) );
		expect( rows ).toContain( 'Shape' );
		[ 'BorderRadius', 'BorderWidth', 'BorderStyle', 'BorderColour' ].forEach( ( b ) => expect( rows ).not.toContain( b ) );
	} );

	it( 'every panel id a setting names is a defined panel', () => {
		const ids = new Set( PANELS.map( ( p ) => p.id ) );
		ALL_ATOMS.forEach( ( id ) => MEDIA_ATOMS[ id ].settings.filter( ( s ) => s.control ).forEach( ( s ) => expect( ids ).toContain( s.control.panel ) ) );
	} );
} );

describe( 'the component map', () => {
	it( 'maps every control.component name that exists today and lists the rest', () => {
		expect( unmappedComponents( ALL_ATOMS, COMPONENT_MAP ) ).toEqual( [ 'MediaKindField', 'SizingField' ] );
	} );

	it( 'maps to real components', () => {
		Object.values( COMPONENT_MAP ).forEach( ( c ) => expect( 'function' ).toBe( typeof c ) );
	} );
} );

describe( 'writing and Reset', () => {
	const row = ( base ) => ( { setting: MEDIA_ATOMS[ 'object-fit' ].settings.find( ( s ) => s.base === base ) } );

	it( 'writes one device\'s own value without touching the others', () => {
		const writes = [];
		const io = rowIO( row( 'ObjectFit' ), { objectFit: 'cover' }, ( p ) => writes.push( p ), 'mobile', '', '' );
		io.write( 'contain' );
		expect( writes ).toEqual( [ { objectFitMobile: 'contain' } ] );
	} );

	it( 'names where an inherited value comes from', () => {
		const io = rowIO( row( 'ObjectFit' ), { objectFit: 'cover', objectFitTablet: 'contain' }, () => {}, 'mobile', '', '' );
		expect( io.inheritedFrom ).toBe( 'tablet' );
		expect( io.resolved ).toBe( 'contain' );
	} );

	it( 'Reset on Desktop is one patch clearing every device; off Desktop only that device', () => {
		const rows = model( {} )[ 1 ].rows;
		const attrs = { overlayColour: 'black', overlayColourHover: 'white', overlayOpacity: 40, overlayOpacityMobile: 80 };
		const desktop = resetPatch( rows, attrs, 'desktop', '', slug );
		expect( Object.keys( desktop ) ).toEqual( expect.arrayContaining( [ 'overlayColour', 'overlayColourHover', 'overlayGradient', 'overlayOpacity', 'overlayOpacityTablet', 'overlayOpacityMobile' ] ) );
		Object.values( desktop ).forEach( ( v ) => expect( v ).toBeUndefined() );
		const mobile = resetPatch( rows, attrs, 'mobile', '', slug );
		expect( Object.keys( mobile ) ).toEqual( [ 'overlayOpacityMobile' ] );
	} );
} );
