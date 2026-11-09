/**
 * Source contracts: form buttons take the site's preset lift; the buybox replays a photo entrance when its image changes;
 * accordion answers accept motion; a zoom-out-once Ken Burns starts at its first frame before JavaScript runs.
 */
import { hoverLiftPreviewRule } from '../../src/utils/hover-lift';
import { submitLiftPreviewRule } from '../../src/blocks/form/submit-motion-preview';

const fs = require( 'fs' );
const path = require( 'path' );

const plugin = path.resolve( __dirname, '..', '..' );
const read = ( relative ) => fs.readFileSync( path.join( plugin, relative ), 'utf8' );
const json = ( relative ) => JSON.parse( read( relative ) );

describe( 'form buttons take the preset lift', () => {
	test( 'the stylesheet reads the preset token, only when motion is allowed', () => {
		const css = read( 'src/blocks/form/style.css' );
		expect( css ).toMatch(
			/@media \(prefers-reduced-motion: no-preference\)\s*\{[^@]*\.sgs-form__button:where\(:not\(:disabled\)\):hover[^{]*\{\s*transform:\s*var\(--wp--custom--button-presets--default--hover-lift,\s*\)/
		);
		expect( css ).toMatch( /\.sgs-form__button \{[^}]*transition:[^;}]*transform var\(/ );
	} );

	test( 'a form with its own lift resets the preset, so the two never stack', () => {
		expect( read( 'includes/helpers-form-submit-motion.php' ) ).toContain( 'sgs_hover_lift_rule( $selector, $lift, true )' );
		expect( hoverLiftPreviewRule( '.x', 6, true ) ).toContain( 'translate:0 -6px;transform:none' );
		expect( submitLiftPreviewRule( '.x', { submitLiftHover: 3 } ) ).toContain( 'transform:none' );
	} );

	test( 'NEGATIVE CONTROL: no own lift prints no preview rule', () => {
		expect( submitLiftPreviewRule( '.x', {} ) ).toBe( '' );
	} );
} );

describe( 'the buybox replays a photo entrance on an image change', () => {
	test( 'the state is declared and the frame can carry the load entrance', () => {
		const sgs = json( 'src/blocks/buybox/block.json' ).supports.sgs;
		expect( sgs.motion.states ).toContain( 'image-changed' );
		expect( sgs.elements[ 'main-photo-frame' ].motion ).not.toBe( false );
	} );

	test( 'a thumbnail click and a colour swap both pulse it', () => {
		const source = read( 'src/blocks/product-card/view.js' );
		expect( source.match( /replayPhoto\(/g ).length ).toBeGreaterThanOrEqual( 3 );
		expect( source ).toContain( "pulseState( card, 'image-changed' )" );
	} );
} );

describe( 'accordion answers accept motion', () => {
	test( 'the answer part names its element and is not switched off', () => {
		const answer = json( 'src/blocks/accordion/block.json' ).supports.sgs.elements.answer;
		expect( answer.motion ).not.toBe( false );
		expect( answer.selector ).toBe( '.sgs-accordion-item__content' );
	} );
} );

describe( 'Ken Burns zoom-out-once first frame', () => {
	test( 'the start zoom prints server-side, only when motion is allowed', () => {
		const source = read( 'includes/motion/class-sgs-motion-effect-properties.php' );
		expect( source ).toContain( '--sgs-kb-s' );
		expect( source ).toContain( '@media (prefers-reduced-motion:no-preference)' );
		expect( source ).toContain( "'zoom-out-once'" );
	} );
} );
