/**
 * The editor's embed normaliser matches `sgs_media_normalise_embed_url` (Spec 49 FR-49-17), and the Layer order
 * select has its options (R11).
 */
import { embedSrc } from '../../src/components/media/mediaSlotWrites.js';
import { SELECT_OPTIONS } from '../../src/components/media/panels/select-options.js';

describe( 'embedSrc', () => {
	it( 'keeps the Vimeo privacy hash from either form', () => {
		expect( embedSrc( 'https://vimeo.com/123456789/abcdef1234' ) ).toBe( 'https://player.vimeo.com/video/123456789?h=abcdef1234' );
		expect( embedSrc( 'https://player.vimeo.com/video/123456789?h=abcdef1234' ) ).toBe( 'https://player.vimeo.com/video/123456789?h=abcdef1234' );
		expect( embedSrc( 'https://vimeo.com/123456789' ) ).toBe( 'https://player.vimeo.com/video/123456789' );
	} );

	it( 'keeps a pasted YouTube start time and accepts live links', () => {
		expect( embedSrc( 'https://www.youtube.com/watch?v=abc123&t=90' ) ).toBe( 'https://www.youtube-nocookie.com/embed/abc123?start=90' );
		expect( embedSrc( 'https://youtu.be/abc123?t=1m30s' ) ).toBe( 'https://www.youtube-nocookie.com/embed/abc123?start=90' );
		expect( embedSrc( 'https://www.youtube.com/live/abc123' ) ).toBe( 'https://www.youtube-nocookie.com/embed/abc123' );
	} );

	it( 'refuses other hosts', () => {
		expect( embedSrc( 'https://evil.example/watch?v=abc123' ) ).toBe( '' );
		expect( embedSrc( 'not a url' ) ).toBe( '' );
	} );
} );

describe( 'select options', () => {
	it( 'Layer order offers behind and front, the values the emitter reads', () => {
		expect( SELECT_OPTIONS.SvgLayer.map( ( o ) => o.value ) ).toEqual( [ 'behind', 'front' ] );
		expect( SELECT_OPTIONS.SvgLayer.map( ( o ) => o.label ) ).toEqual( [ 'Behind content', 'In front of content' ] );
	} );
} );
