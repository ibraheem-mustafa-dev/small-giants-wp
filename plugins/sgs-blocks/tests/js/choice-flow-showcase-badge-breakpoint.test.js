/**
 * Showcase layout contracts: the showcase
 * stacks below 768px, and the rating badge's hover border defaults to Google blue at zero specificity.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const read = ( rel ) => fs.readFileSync( path.resolve( __dirname, '..', '..', rel ), 'utf8' );

test( 'the showcase container queries switch at 768px, not 600px', () => {
	const files = [ 'src/blocks/choice-flow/style.css', 'src/blocks/choice-flow-question/style.css' ];
	for ( const f of files ) {
		const css = read( f );
		expect( css ).not.toMatch( /sgs-choice-flow-showcase\s*\(\s*min-width:\s*600px/ );
		expect( css ).not.toMatch( /sgs-choice-flow-showcase\s*\(\s*max-width:\s*599px/ );
	}
	expect( read( 'src/blocks/choice-flow/style.css' ) ).toMatch( /sgs-choice-flow-showcase \(max-width: 767px\)/ );
} );

test( 'the rating badge hover border defaults to Google blue at zero specificity', () => {
	const css = read( 'src/blocks/google-rating-badge/style.css' );
	expect( css ).toMatch( /:where\( ?a\.sgs-google-rating-badge__link:hover ?\) \{\s*border-color:\s*#4285F4;/i );
} );
