/**
 * Inputs take the inset focus variant (Spec 32 section 14.5): focus.css puts text-entry inputs, selects and textareas
 * on the `.sgs-focus--inset` rule, and no stylesheet recolours a field's border on focus. The sent message is a motion part.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '../../../..' );
const read = ( rel ) => fs.readFileSync( path.join( ROOT, rel ), 'utf8' );

describe( 'input focus', () => {
	test( 'focus.css lists inputs, selects and textareas on the inset rule, minus the non-text types', () => {
		const css = read( 'theme/sgs-theme/assets/css/focus.css' );
		const start = css.indexOf( '.sgs-focus--inset,' );
		const rule = css.slice( start, css.indexOf( '{', start ) );
		expect( rule ).toMatch( /\binput:not\(/ );
		expect( rule ).toMatch( /\bselect\b/ );
		expect( rule ).toMatch( /\btextarea\b/ );
		for ( const type of [ 'checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'image', 'hidden' ] ) {
			expect( rule ).toContain( `[type="${ type }"]` );
		}
	} );

	test( 'no form, WooCommerce or commerce-look stylesheet recolours the border on focus', () => {
		expect( read( 'plugins/sgs-blocks/src/blocks/form/style.css' ) ).not.toMatch( /\.sgs-form-field__input:focus-visible\s*\{/ );
		expect( read( 'theme/sgs-theme/assets/css/woocommerce.css' ) ).not.toMatch( /text-input input:focus/ );
		expect( read( 'plugins/sgs-blocks/includes/woocommerce/commerce-look/fields.php' ) ).not.toMatch( /':focus'/ );
	} );

	test( 'the form declares the sent message as a part', () => {
		const block = JSON.parse( read( 'plugins/sgs-blocks/src/blocks/form/block.json' ) );
		const part = block.supports.sgs.elements[ 'success-message' ];
		expect( part.selector ).toBe( '.sgs-form__message--success' );
		expect( part.motion ).not.toBe( false );
	} );
} );
