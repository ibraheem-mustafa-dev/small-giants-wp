/**
 * Tabs and gallery hand their focus ring to the one focus system (focus plan Task 9; Spec 32 §14.5).
 *
 * The tab bar and the gallery tile clip their children, so the ring sits inside: the markup carries `sgs-focus--inset`.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '..', '..' );
const read = ( rel ) => fs.readFileSync( path.join( ROOT, rel ), 'utf8' );

describe( 'widgets focus: inset class where the container clips', () => {
	test( 'tab buttons (front end) carry sgs-focus--inset', () => {
		expect( read( 'src/blocks/tabs/render.php' ) ).toMatch( /<button id="%s" class="sgs-tabs__tab sgs-focus--inset%s"/ );
	} );

	test( 'tab buttons (editor) carry sgs-focus--inset', () => {
		expect( read( 'src/blocks/tabs/edit.js' ) ).toMatch( /'sgs-tabs__tab',\s*'sgs-focus--inset'/ );
	} );

	test( 'gallery linked tile anchor carries sgs-focus--inset', () => {
		expect( read( 'src/blocks/gallery/render-tile.php' ) ).toContain( '<a class="sgs-gallery__item-link sgs-focus--inset"' );
	} );

	test( 'gallery lightbox tile button carries sgs-focus--inset', () => {
		expect( read( 'src/blocks/gallery/render.php' ) ).toMatch( /class="sgs-gallery__item-btn sgs-focus--inset"/ );
	} );

	test( 'marquee-edge pause button sits inside the clipping region', () => {
		expect( read( 'includes/helpers-motion-pause.php' ) ).toMatch( /'overlay-end' === \$placement[\s\S]{0,160}'sgs-focus--inset'/ );
	} );

	test( 'controls over video or a canvas carry sgs-focus--duotone', () => {
		expect( read( 'src/blocks/media/view.js' ) ).toContain( "el( 'div', 'sgs-video sgs-focus--duotone' )" );
		expect( read( 'includes/fx-generative-background.php' ) ).toContain( 'sgs-generative-background__toggle sgs-focus--duotone' );
		expect( read( 'includes/fx-wave-gradient.php' ) ).toContain( 'sgs-wave-gradient__toggle sgs-focus--duotone' );
	} );

	test( 'tabs and gallery stylesheets hold no bespoke focus outline', () => {
		for ( const f of [ 'src/blocks/tabs/style.css', 'src/blocks/gallery/style.css' ] ) {
			expect( read( f ) ).not.toMatch( /outline\s*:/ );
		}
	} );
} );
