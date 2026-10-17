/**
 * Contract: the layer of a container that holds keyboard focus paints above its sibling layers.
 *
 * Every direct child of `.sgs-container` is a `position: relative; z-index: 1` layer (container/style.css), so
 * each one is a stacking context at the same level and a LATER sibling paints over an EARLIER one. A focus ring and
 * its bloom paint outside the focused control's own box, into the neighbouring sibling's area, so the next accordion
 * item or the next block hid the ring's bottom edge (measured live: the pixel at the ring equalled the pixel outside
 * it, and `elementFromPoint` there returned the sibling).
 *
 * The fix is one zero-specificity rule, declared after the last `> *` layer rule so source order lets it win a tie,
 * that raises whichever layer contains focus. `:where()` keeps it below any layer's own explicit z-index.
 * A planted copy without the rule (negative control) must fail the check.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const CONTAINER_CSS = path.join( __dirname, '..', '..', 'src', 'blocks', 'container', 'style.css' );
const norm = ( s ) => s.replace( /\s+/g, ' ' ).trim();

/** Problems with how the container stylesheet raises the focused layer (empty when it holds). */
function focusStackingProblems( css ) {
	const root = postcss.parse( css );
	const problems = [];
	let lastLayerOrder = -1;
	let raise = null;
	let order = 0;
	root.walkRules( ( rule ) => {
		order++;
		const sels = rule.selectors.map( norm );
		const z = rule.nodes.find( ( n ) => 'decl' === n.type && 'z-index' === n.prop );
		if ( sels.some( ( s ) => /^:where\(\.sgs-container[a-z-]*\) > \*$/.test( s ) ) && z ) {
			lastLayerOrder = order;
		}
		if ( sels.includes( ':where(.sgs-container:not(.sgs-container--svg-foreground)) > :where(:focus-within)' ) ) {
			raise = { order, z };
		}
	} );
	if ( ! raise || ! raise.z ) {
		problems.push( 'no `:where(.sgs-container:not(.sgs-container--svg-foreground)) > :where(:focus-within)` rule declaring z-index' );
		return problems;
	}
	if ( Number( raise.z.value ) <= 1 ) {
		problems.push( `the focused layer is raised to ${ raise.z.value }, which does not clear the base z-index: 1` );
	}
	if ( raise.z.important ) {
		problems.push( 'the focus raise uses !important' );
	}
	if ( raise.order <= lastLayerOrder ) {
		problems.push( 'the focus raise is declared before a `> *` layer rule, so that rule wins the tie' );
	}
	return problems;
}

describe( 'container focus stacking', () => {
	const css = fs.readFileSync( CONTAINER_CSS, 'utf8' );

	it( 'raises the layer that holds focus above its sibling layers', () => {
		expect( focusStackingProblems( css ) ).toEqual( [] );
	} );

	it( 'fails a copy with the rule removed (negative control)', () => {
		const planted = css.replace( /:where\(\.sgs-container:not\(\.sgs-container--svg-foreground\)\) > :where\(:focus-within\)\s*\{[^}]*\}/, '' );
		expect( planted ).not.toBe( css );
		expect( focusStackingProblems( planted ) ).not.toEqual( [] );
	} );

	it( 'fails a copy that declares the raise before the layer rules (negative control)', () => {
		const rule = css.match( /:where\(\.sgs-container:not\(\.sgs-container--svg-foreground\)\) > :where\(:focus-within\)\s*\{[^}]*\}/ );
		expect( rule ).not.toBeNull();
		const planted = rule[ 0 ] + '\n' + css.replace( rule[ 0 ], '' );
		expect( focusStackingProblems( planted ) ).not.toEqual( [] );
	} );
} );
