/**
 * Spec 49 §10.3: Pinned is not offered beside Parallax on the background or a transform-based entrance or hover on the
 * block's own element, and is offered otherwise.
 */
import { pinnedBlockers } from '../../src/components/media/panels/pinned-blockers.js';
import { buildPanelModel } from '../../src/components/media/panels/panel-model.js';
import { ADOPTED_ATOM_IDS } from '../../src/components/media/emit/adopted-settings.js';
import { disclosure as focalPoint } from '../../src/components/media/atoms/focal-point.js';
import { REASONS } from '../../src/components/media/panels/disclosure-context.js';

const ELEMENTS = { wrapper: { isWrapper: true }, background: {}, 'svg-bg': {} };
const photo = { backgroundSource: { desktop: { kind: 'image', url: 'https://example.test/a.jpg', width: 800, height: 600 } } };

const offered = ( attrs, motion ) => {
	const blockers = pinnedBlockers( motion, ELEMENTS );
	const model = buildPanelModel( {
		atomIds: ADOPTED_ATOM_IDS,
		attrs,
		device: 'desktop',
		prefix: 'background',
		opts: { kinds: [ 'image', 'video', 'svg' ], context: 'background', parallax: blockers.parallax, transformMotion: blockers.transformMotion },
		adopted: true,
	} );
	return model.flatMap( ( p ) => p.rows.map( ( r ) => r.setting.base ) ).includes( 'Pinned' );
};

describe( 'Pinned background', () => {
	it( 'is offered with no motion', () => {
		expect( offered( photo, undefined ) ).toBe( true );
	} );

	it( 'is offered beside an entrance that does not move the element', () => {
		const motion = { elements: { wrapper: { entrance: { base: { values: { from: { opacity: 0 }, to: { opacity: 1 } } } } } } };
		expect( offered( photo, motion ) ).toBe( true );
	} );

	it( 'is refused beside a transform entrance on the block', () => {
		const motion = {
			elements: {
				wrapper: {
					entrance: {
						base: {
							preset: 'entrance-fade-up',
							values: { from: { opacity: 0, translateY: 'token:entrance.distance' }, to: { opacity: 1, translateY: 0 } },
						},
					},
				},
			},
		};
		expect( pinnedBlockers( motion, ELEMENTS ) ).toEqual( { parallax: false, transformMotion: true } );
		expect( offered( photo, motion ) ).toBe( false );
	} );

	it( 'is refused beside a transform hover on the block', () => {
		const motion = { elements: { wrapper: { hover: { state: { preset: 'hover-lift', values: { translateY: -4 } } } } } };
		expect( offered( photo, motion ) ).toBe( false );
	} );

	it( 'is refused beside Parallax on the background', () => {
		const motion = { elements: { background: { effects: [ { effect: 'parallax', intensity: 'subtle' } ] } } };
		expect( pinnedBlockers( motion, ELEMENTS ).parallax ).toBe( true );
		expect( offered( photo, motion ) ).toBe( false );
	} );

	it( 'ignores a transform entrance on another part, which does not move the section', () => {
		const motion = { elements: { background: { entrance: { base: { values: { from: { scale: 0.9 } } } } } } };
		expect( offered( photo, motion ) ).toBe( true );
	} );

	it( 'says why through the disclosure reason', () => {
		const at = ( extra ) => focalPoint( {}, 'desktop', 'background', { kinds: [ 'image' ], context: 'background', ...extra } ).Attachment;
		expect( at( { transformMotion: true } ) ).toEqual( { state: 'omitted', hiddenReason: REASONS.pinnedTransform } );
		expect( at( { parallax: true } ) ).toEqual( { state: 'omitted', hiddenReason: REASONS.pinnedParallax } );
		expect( at( {} ).state ).toBe( 'shown' );
	} );
} );
