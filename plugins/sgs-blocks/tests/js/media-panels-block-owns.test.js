/**
 * A slot entry's `blockOwns` (supports.sgs.mediaElements[].blockOwns) leaves out the media panel rows of the bases the
 * block edits with its own control, so one setting has one control (sgs/decorative-image: the media-padding atom's
 * Background colour row edits `layerBackground`, which the block's own Fill row already edits).
 */
import { buildPanelModel } from '../../src/components/media/panels/panel-model.js';

const metadata = require( '../../src/blocks/decorative-image/block.json' );

const ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => 'layer' === e.prefix );
const ATTRS = { layerSource: { desktop: { kind: 'image', id: 1, url: 'https://example.test/a.jpg' } } };

const bases = ( opts ) =>
	buildPanelModel( {
		atomIds: ENTRY.atoms,
		attrs: ATTRS,
		device: 'desktop',
		prefix: 'layer',
		opts: { blockSlug: 'sgs/decorative-image', kinds: ENTRY.kinds, context: ENTRY.context, adopted: true, ...opts },
		adopted: true,
	} ).flatMap( ( p ) => p.rows.map( ( r ) => r.setting.base ) );

describe( 'media panel blockOwns', () => {
	it( 'shows the media-padding atom\'s Background row when the slot names no owned base', () => {
		const all = bases( {} );
		expect( all ).toContain( 'Padding' );
		expect( all ).toContain( 'Background' );
	} );

	it( 'leaves out an owned base and keeps every other row', () => {
		const all = bases( {} );
		const owned = bases( { blockOwns: [ 'Background' ] } );
		expect( owned ).not.toContain( 'Background' );
		expect( owned ).toEqual( all.filter( ( b ) => 'Background' !== b ) );
	} );

	it( 'sgs/decorative-image\'s layer slot declares Background as the block\'s own', () => {
		expect( ENTRY.blockOwns ).toEqual( [ 'Background' ] );
		expect( metadata.attributes.layerBackground ).toBeDefined();
		expect( metadata.attributes.layerBackground._generated ).toBeUndefined();
	} );
} );
