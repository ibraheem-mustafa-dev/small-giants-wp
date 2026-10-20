/**
 * sgs/button motion timing from the site-wide button style (Spec 32 FR-32-19).
 *
 * The base `.sgs-button` transition reads `--sgs-btn-transition-duration` and `--sgs-btn-transition-easing` for every
 * property a hover or press paints. Each preset class sets those two from its own `hover-transition` and `hover-easing`
 * tokens, then the `default` variant's, then 0.18s and the site easing token. BUTTON_CSS_FILE overrides the stylesheet
 * path, for a manual negative control on a planted copy.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const CSS_FILE =
	process.env.BUTTON_CSS_FILE || path.join( __dirname, '..', '..', 'src', 'blocks', 'button', 'style.css' );
const PAINTED = [ 'background-color', 'color', 'border-color', 'transform', 'translate', 'box-shadow', 'opacity' ];
const PRESETS = [ 'primary', 'secondary', 'outline' ];
const DURATION = 'var(--sgs-btn-transition-duration, var(--wp--custom--button-presets--default--hover-transition, 0.18s))';
const EASING =
	'var(--sgs-btn-transition-easing, var(--wp--custom--button-presets--default--hover-easing, var(--wp--custom--easing--ease, ease)))';

/**
 * @param {string} css  Stylesheet source.
 * @param {string} sel  Exact selector.
 * @param {string} prop Property name.
 * @return {string|null} The declared value outside any at-rule, or null.
 */
function declValue( css, sel, prop ) {
	let found = null;
	postcss.parse( css ).walkRules( ( rule ) => {
		if ( rule.parent.type !== 'root' || rule.selector.trim() !== sel ) {
			return;
		}
		rule.walkDecls( prop, ( decl ) => {
			found = decl.value.replace( /\s+/g, ' ' ).trim();
		} );
	} );
	return found;
}

/**
 * @param {string} value A comma-separated CSS value.
 * @return {string[]} The parts split on commas outside any parentheses.
 */
function splitTopLevel( value ) {
	const parts = [ '' ];
	let depth = 0;
	for ( const ch of value ) {
		depth += ch === '(' ? 1 : 0;
		depth -= ch === ')' ? 1 : 0;
		if ( ch === ',' && depth === 0 ) {
			parts.push( '' );
		} else {
			parts[ parts.length - 1 ] += ch;
		}
	}
	return parts.map( ( part ) => part.trim() );
}

/**
 * @param {string} css Stylesheet source.
 * @return {string[]} Every fault in the button's motion timing contract.
 */
function faults( css ) {
	const out = [];
	const transition = declValue( css, '.sgs-button', 'transition' );
	if ( ! transition ) {
		return [ 'no base transition' ];
	}
	const parts = splitTopLevel( transition );
	PAINTED.forEach( ( prop ) => {
		const part = parts.find( ( p ) => p.startsWith( prop + ' ' ) );
		if ( ! part ) {
			out.push( `transition omits ${ prop }` );
		} else if ( part !== `${ prop } ${ DURATION } ${ EASING }` ) {
			out.push( `${ prop } timing is "${ part.slice( prop.length + 1 ) }"` );
		}
	} );
	PRESETS.forEach( ( preset ) => {
		const tok = ( role ) => `var(--wp--custom--button-presets--${ preset }--${ role }`;
		const duration = declValue( css, `.sgs-button--${ preset }`, '--sgs-btn-transition-duration' ) || '';
		const easing = declValue( css, `.sgs-button--${ preset }`, '--sgs-btn-transition-easing' ) || '';
		if ( ! duration.startsWith( tok( 'hover-transition' ) + ', var(--wp--custom--button-presets--default--hover-transition' ) ) {
			out.push( `${ preset } duration "${ duration }"` );
		}
		if ( ! easing.startsWith( tok( 'hover-easing' ) + ', var(--wp--custom--button-presets--default--hover-easing' ) ) {
			out.push( `${ preset } easing "${ easing }"` );
		}
	} );
	return out;
}

describe( 'button motion timing reads the preset duration and easing', () => {
	it( 'button/style.css honours the contract', () => {
		expect( faults( fs.readFileSync( CSS_FILE, 'utf8' ) ) ).toEqual( [] );
	} );

	it( 'negative control: a hard-wired easing and a preset with no timing are reported', () => {
		const good = PAINTED.map( ( p ) => `${ p } ${ DURATION } ${ EASING }` ).join( ', ' );
		const presets = PRESETS.map(
			( p ) =>
				`.sgs-button--${ p } { --sgs-btn-transition-duration: var(--wp--custom--button-presets--${ p }--hover-transition, var(--wp--custom--button-presets--default--hover-transition, 0.18s)); --sgs-btn-transition-easing: var(--wp--custom--button-presets--${ p }--hover-easing, var(--wp--custom--button-presets--default--hover-easing, var(--wp--custom--easing--ease, ease))); }`
		);
		expect( faults( `.sgs-button { transition: ${ good }; } ${ presets.join( ' ' ) }` ) ).toEqual( [] );
		const hardWired = good.replace( `opacity ${ DURATION } ${ EASING }`, `opacity ${ DURATION } ease` );
		expect( faults( `.sgs-button { transition: ${ hardWired }; } ${ presets.join( ' ' ) }` ) ).toEqual( [
			'opacity timing is "' + DURATION + ' ease"',
		] );
		expect( faults( `.sgs-button { transition: ${ good }; } ${ presets.slice( 1 ).join( ' ' ) }` ) ).toEqual( [
			'primary duration ""',
			'primary easing ""',
		] );
	} );
} );
