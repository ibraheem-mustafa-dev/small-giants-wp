/**
 * Showcase height-fit contract: in a two-column showcase with a definite height
 * the option pictures and the stage photo give up height before anything scrolls,
 * using flex-shrink and `minmax( 0, … )` tracks, which do nothing when the height
 * is indefinite (an inline flow keeps its 16:9 cards and square photo).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const read = ( rel ) => fs.readFileSync( path.resolve( __dirname, '..', '..', rel ), 'utf8' );
const flow = read( 'src/blocks/choice-flow/style.css' );
const question = read( 'src/blocks/choice-flow-question/style.css' );

/** The CSS text of every rule whose selector list contains `needle`. */
const rulesWith = ( css, needle ) => {
	const out = [];
	const re = /([^{}]+)\{([^{}]*)\}/g;
	let m;
	while ( ( m = re.exec( css ) ) !== null ) {
		if ( m[ 1 ].includes( needle ) ) {
			out.push( m[ 2 ] );
		}
	}
	return out.join( '\n' );
};

test( 'the showcase body row is a minmax( 0, 1fr ) track so a definite height reaches the step pane', () => {
	expect( rulesWith( flow, '.sgs-choice-flow--fit-screen .sgs-choice-flow__body--with-panel' ) ).toMatch( /grid-template-rows:\s*minmax\(\s*0,\s*1fr\s*\)/ );
} );

test( 'the stage photo shrinks to a 56px floor and never grows past its square', () => {
	const rule = rulesWith( flow, '.sgs-choice-flow--fit-screen .sgs-choice-flow__summary-media' );
	expect( rule ).toMatch( /flex:\s*0 1 auto/ );
	expect( rule ).toMatch( /min-height:\s*56px/ );
} );

test( 'option cards shrink their picture row to a 56px floor, and rows give way before the pane scrolls', () => {
	expect( rulesWith( question, ':has(> .sgs-choice-flow-question__option-media)' ) ).toMatch( /grid-template-rows:\s*minmax\(\s*56px,\s*auto\s*\)/ );
	expect( rulesWith( question, '.sgs-choice-flow-question__options--grid:has(' ) ).toMatch( /grid-auto-rows:\s*minmax\(\s*0,\s*auto\s*\)/ );
} );

test( 'the fit uses no !important and no viewport-unit height', () => {
	for ( const css of [ flow, question ] ) {
		const fit = css.slice( css.indexOf( 'Height fit' ) );
		expect( css ).toContain( 'Height fit' );
		expect( fit ).not.toMatch( /!important/ );
		expect( fit ).not.toMatch( /dvh|vh\b/ );
	}
} );

test( 'every height-sharing rule keys off the fit-screen class, so switching it off keeps 16:9 cards and the square photo', () => {
	for ( const css of [ flow, question ] ) {
		const fit = css.slice( css.indexOf( 'Height fit' ) ).split( '@container' ).slice( 1, 2 ).join( '' );
		const selectors = [ ...fit.matchAll( /([^{}]+)\{/g ) ].map( ( m ) => m[ 1 ].trim() ).filter( ( sel ) => sel.startsWith( '.' ) );
		expect( selectors.length ).toBeGreaterThan( 0 );
		for ( const sel of selectors ) {
			expect( sel ).toContain( '.sgs-choice-flow--fit-screen' );
		}
	}
} );
