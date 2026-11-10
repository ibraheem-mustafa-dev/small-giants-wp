/**
 * mediaPreview (Spec 49 C3, §7.3) against the shared fixture `tests/fixtures/media/matrix.json`: the helper rules,
 * the AC-16 slots, "once printed at any device, printed at every device", and the registry-collected CSS.
 */
const matrix = require( '../fixtures/media/matrix.json' );
const mediaPreview = require( '../../src/components/media/mediaPreview' ).default;
const { needsHelper } = require( '../../src/components/media/mediaPreview' );
const { mediaAttrName } = require( '../../src/components/MediaElementControls' );

const SLOT = { prefix: '', kinds: [ 'image' ], context: 'element' };

/** A fixture `settings` object as block attributes plus the media part's motion. */
function fromSettings( settings ) {
	const attrs = {};
	const motion = {};
	Object.entries( settings ).forEach( ( [ key, value ] ) => {
		if ( 'hover' === key ) {
			motion.hoverScale = value.scale;
		} else if ( 'effect' === key ) {
			motion.effects = [ value ];
		} else if ( 'entrance' === key ) {
			motion.entrance = value;
		} else if ( [ 'caption', 'link' ].includes( key ) ) {
			attrs[ key ] = value;
		} else {
			const tiered = value && 'object' === typeof value && ( 'desktop' in value || 'tablet' in value || 'mobile' in value );
			attrs[ mediaAttrName( '', key ) ] = tiered || 'Shape' === key ? ( 'Shape' === key ? { desktop: value } : value ) : { desktop: value };
		}
	} );
	return { attrs, motion };
}

describe( 'mediaPreview against matrix.json', () => {
	it.each( matrix.helperTriggers.prints.map( ( s ) => [ JSON.stringify( s ), s ] ) )( 'prints the helper for %s', ( name, settings ) => {
		const { attrs, motion } = fromSettings( settings );
		expect( needsHelper( SLOT, attrs, motion ) ).toBe( true );
		expect( mediaPreview( SLOT, attrs, 'u1', { motion } ).needsHelper ).toBe( true );
	} );

	it.each( matrix.helperTriggers.absent.map( ( s ) => [ JSON.stringify( s ), s ] ) )( 'does not print the helper for %s', ( name, settings ) => {
		const { attrs, motion } = fromSettings( settings );
		expect( needsHelper( SLOT, attrs, motion ) ).toBe( false );
		expect( mediaPreview( SLOT, attrs, 'u1', { motion } ).className ).toBe( 'u1' );
	} );

	it( 'gives the helper verdict of each AC-16 slot', () => {
		const printed = matrix.slots.filter( ( s ) => {
			const { attrs, motion } = fromSettings( s.settings );
			return needsHelper( SLOT, attrs, motion );
		} ).map( ( s ) => s.id );
		expect( printed ).toEqual( [ 's05', 's06', 's07', 's10' ] );
	} );

	it( 'a helper printed at one device is printed for the slot, and Fill adds its class', () => {
		const attrs = { height: { mobile: 'fill' } };
		const out = mediaPreview( SLOT, attrs, 'u2' );
		expect( out.needsHelper ).toBe( true );
		expect( out.className ).toBe( 'u2 sgs-media-box sgs-media-box--fill' );
	} );

	it( 'honours the slot prefix', () => {
		const slot = { prefix: 'split', kinds: [ 'image' ], context: 'element' };
		expect( needsHelper( slot, { splitHeight: { desktop: 'fill' } } ) ).toBe( true );
		expect( needsHelper( slot, { height: { desktop: 'fill' } } ) ).toBe( false );
	} );
} );

describe( 'mediaPreview CSS collection', () => {
	const atoms = {
		a: { css: ( { uid, helper, prefix } ) => `.${ uid }${ helper ? ' .sgs-media-box' : '' }{height:300px}/*${ prefix }*/` },
		b: { css: ( { attrs } ) => [ attrs.x ? '.u3 .sgs-media-el{object-fit:cover}' : '', 'opacity:1' ] },
		c: {},
	};

	it( 'joins each atom\'s rules in registry order, wraps bare declarations on the uid, and skips atoms without css', () => {
		const out = mediaPreview( SLOT, { x: true }, 'u3', { atoms } );
		expect( out.css ).toBe( '.u3{height:300px}/**/\n.u3 .sgs-media-el{object-fit:cover}\n.u3{opacity:1}' );
	} );

	it( 'tells each atom whether the helper is printed', () => {
		const out = mediaPreview( SLOT, { height: { desktop: 'fill' } }, 'u4', { atoms: { a: atoms.a } } );
		expect( out.css ).toContain( '.u4 .sgs-media-box{height:300px}' );
	} );
} );
