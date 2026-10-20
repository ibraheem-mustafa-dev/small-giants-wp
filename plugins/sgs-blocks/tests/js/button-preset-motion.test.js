/**
 * sgs/button motion timing from the site-wide button style (Spec 32 FR-32-19).
 *
 * The base `.sgs-button` transition reads `--sgs-btn-transition-duration` for every property a hover or press paints,
 * and an easing by property group: the colours (background-color, color, border-color) read
 * `--sgs-btn-transition-easing-colour`, box-shadow reads `--sgs-btn-transition-easing-shadow`, and the move and opacity
 * read `--sgs-btn-transition-easing`. Each preset class sets the duration and the three easings from its own
 * `hover-transition`, `hover-easing-colour`, `hover-easing-shadow` and `hover-easing` tokens, then the `default`
 * variant's; an unset colour or shadow easing falls back to the preset's `hover-easing`. The button-shaped CTAs
 * (buybox, product-card, whatsapp-cta) read the same easings. BUTTON_CSS_FILE overrides the button stylesheet path,
 * for a manual negative control on a planted copy.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const BLOCKS = path.join( __dirname, '..', '..', 'src', 'blocks' );
const CSS_FILE = process.env.BUTTON_CSS_FILE || path.join( BLOCKS, 'button', 'style.css' );
const PAINTED = [ 'background-color', 'color', 'border-color', 'transform', 'translate', 'box-shadow', 'opacity' ];
const PRESETS = [ 'primary', 'secondary', 'outline' ];
const DURATION = 'var(--sgs-btn-transition-duration, var(--wp--custom--button-presets--default--hover-transition, 0.18s))';
const EASING =
	'var(--sgs-btn-transition-easing, var(--wp--custom--button-presets--default--hover-easing, var(--wp--custom--easing--ease, ease)))';
const groupEasing = ( group ) =>
	`var(--sgs-btn-transition-easing-${ group }, var(--wp--custom--button-presets--default--hover-easing-${ group }, ${ EASING }))`;
const EASING_FOR = {
	'background-color': groupEasing( 'colour' ),
	color: groupEasing( 'colour' ),
	'border-color': groupEasing( 'colour' ),
	'box-shadow': groupEasing( 'shadow' ),
	transform: EASING,
	translate: EASING,
	opacity: EASING,
};

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
 * @param {string}   transition A `transition` shorthand value.
 * @param {string[]} props      The properties it must cover.
 * @param {boolean}  exact      True to require the button's own duration as well as the easing.
 * @return {string[]} Every property whose timing breaks the contract.
 */
function transitionFaults( transition, props, exact ) {
	const parts = splitTopLevel( transition );
	const out = [];
	props.forEach( ( prop ) => {
		const part = parts.find( ( p ) => p.startsWith( prop + ' ' ) );
		if ( ! part ) {
			out.push( `transition omits ${ prop }` );
		} else if ( exact ? part !== `${ prop } ${ DURATION } ${ EASING_FOR[ prop ] }` : ! part.endsWith( ` ${ EASING_FOR[ prop ] }` ) ) {
			out.push( `${ prop } timing is "${ part.slice( prop.length + 1 ) }"` );
		}
	} );
	return out;
}

/**
 * @param {string} css       Stylesheet source.
 * @param {string} sel       The preset class selector.
 * @param {string} preset    Variant slug.
 * @param {string} durStart  The duration chain's expected start.
 * @return {string[]} Every fault in the preset class's timing variables.
 */
function presetFaults( css, sel, preset, durStart ) {
	const out = [];
	const tok = ( role ) => `var(--wp--custom--button-presets--${ preset }--${ role }`;
	const def = ( role ) => `var(--wp--custom--button-presets--default--${ role }`;
	const duration = declValue( css, sel, '--sgs-btn-transition-duration' ) || '';
	const easing = declValue( css, sel, '--sgs-btn-transition-easing' ) || '';
	if ( ! duration.startsWith( durStart ) ) {
		out.push( `${ preset } duration "${ duration }"` );
	}
	if ( ! easing.startsWith( tok( 'hover-easing' ) + ', ' + def( 'hover-easing' ) ) ) {
		out.push( `${ preset } easing "${ easing }"` );
	}
	[ 'colour', 'shadow' ].forEach( ( group ) => {
		const value = declValue( css, sel, `--sgs-btn-transition-easing-${ group }` ) || '';
		const want = `${ tok( `hover-easing-${ group }` ) }, ${ def( `hover-easing-${ group }` ) }, var(--sgs-btn-transition-easing)))`;
		if ( value !== want ) {
			out.push( `${ preset } ${ group } easing "${ value }"` );
		}
	} );
	return out;
}

/**
 * @param {string} css Stylesheet source.
 * @return {string[]} Every fault in the button's motion timing contract.
 */
function faults( css ) {
	const transition = declValue( css, '.sgs-button', 'transition' );
	if ( ! transition ) {
		return [ 'no base transition' ];
	}
	const out = transitionFaults( transition, PAINTED, true );
	PRESETS.forEach( ( preset ) => {
		const durStart = `var(--wp--custom--button-presets--${ preset }--hover-transition, var(--wp--custom--button-presets--default--hover-transition`;
		out.push( ...presetFaults( css, `.sgs-button--${ preset }`, preset, durStart ) );
	} );
	return out;
}

const read = ( block ) => fs.readFileSync( path.join( BLOCKS, block, 'style.css' ), 'utf8' );

describe( 'button motion timing reads the preset duration and per-property easing', () => {
	it( 'button/style.css honours the contract', () => {
		expect( faults( fs.readFileSync( CSS_FILE, 'utf8' ) ) ).toEqual( [] );
	} );

	it( 'buybox add-to-cart (and its hover-lift twin) eases each property by its group and sets the easings per style', () => {
		const css = read( 'buybox' );
		const props = [ 'background-color', 'border-color', 'color', 'transform', 'box-shadow' ];
		const out = [];
		[ '.sgs-buybox .buybox__add-to-cart', '.sgs-buybox .buybox__add-to-cart--hover-lift' ].forEach( ( sel ) => {
			out.push( ...transitionFaults( declValue( css, sel, 'transition' ) || '', props, false ) );
		} );
		PRESETS.forEach( ( preset ) => {
			const durStart = `var(--wp--custom--button-presets--${ preset }--hover-transition`;
			out.push( ...presetFaults( css, `.sgs-buybox .buybox__add-to-cart--${ preset }`, preset, durStart ) );
		} );
		expect( out ).toEqual( [] );
	} );

	it( 'product-card CTAs ease each property by its group', () => {
		const css = read( 'product-card' );
		let transition = '';
		postcss.parse( css ).walkDecls( 'transition', ( decl ) => {
			if ( ! transition && decl.value.includes( '--sgs-btn-transition-easing' ) ) {
				transition = decl.value.replace( /\s+/g, ' ' ).trim();
			}
		} );
		expect( transitionFaults( transition, PAINTED, false ) ).toEqual( [] );
	} );

	it( 'whatsapp-cta keeps `all` and overrides the colours and shadow with their own easings', () => {
		const css = read( 'whatsapp-cta' );
		const sel = '.sgs-whatsapp-cta__btn';
		const props = splitTopLevel( declValue( css, sel, 'transition-property' ) || '' );
		const fns = splitTopLevel( declValue( css, sel, 'transition-timing-function' ) || '' );
		const def = 'var(--wp--custom--button-presets--default--hover-easing, var(--wp--custom--easing--ease, ease))';
		const group = ( g ) => `var(--wp--custom--button-presets--default--hover-easing-${ g }, ${ def })`;
		expect( props ).toEqual( [ 'all', 'background-color', 'color', 'border-color', 'box-shadow' ] );
		expect( fns ).toEqual( [ def, group( 'colour' ), group( 'colour' ), group( 'colour' ), group( 'shadow' ) ] );
	} );

	it( 'negative control: a hard-wired easing, a single-easing shadow and a preset with no timing are reported', () => {
		const good = PAINTED.map( ( p ) => `${ p } ${ DURATION } ${ EASING_FOR[ p ] }` ).join( ', ' );
		const presets = PRESETS.map( ( p ) => {
			const tok = ( role, fb ) => `var(--wp--custom--button-presets--${ p }--${ role }, var(--wp--custom--button-presets--default--${ role }, ${ fb }))`;
			return `.sgs-button--${ p } { --sgs-btn-transition-duration: ${ tok( 'hover-transition', '0.18s' ) }; --sgs-btn-transition-easing: ${ tok( 'hover-easing', 'var(--wp--custom--easing--ease, ease)' ) }; --sgs-btn-transition-easing-colour: ${ tok( 'hover-easing-colour', 'var(--sgs-btn-transition-easing)' ) }; --sgs-btn-transition-easing-shadow: ${ tok( 'hover-easing-shadow', 'var(--sgs-btn-transition-easing)' ) }; }`;
		} );
		expect( faults( `.sgs-button { transition: ${ good }; } ${ presets.join( ' ' ) }` ) ).toEqual( [] );
		const hardWired = good.replace( `opacity ${ DURATION } ${ EASING }`, `opacity ${ DURATION } ease` );
		expect( faults( `.sgs-button { transition: ${ hardWired }; } ${ presets.join( ' ' ) }` ) ).toEqual( [
			'opacity timing is "' + DURATION + ' ease"',
		] );
		const oneEasing = good.replace( `box-shadow ${ DURATION } ${ EASING_FOR[ 'box-shadow' ] }`, `box-shadow ${ DURATION } ${ EASING }` );
		expect( faults( `.sgs-button { transition: ${ oneEasing }; } ${ presets.join( ' ' ) }` ) ).toEqual( [
			'box-shadow timing is "' + DURATION + ' ' + EASING + '"',
		] );
		expect( faults( `.sgs-button { transition: ${ good }; } ${ presets.slice( 1 ).join( ' ' ) }` ) ).toEqual( [
			'primary duration ""',
			'primary easing ""',
			'primary colour easing ""',
			'primary shadow easing ""',
		] );
	} );
} );
